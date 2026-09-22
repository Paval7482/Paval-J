import {
  evaluateChatEligibility,
  type FirewallContext,
  type FirewallDecision,
} from "./firewall";

declare const chrome: any;

/**
 * 🛡️ SLI CRM WhatsApp Web Content Script
 * Runs strictly as a passive, read-only assistant widget.
 * ZERO background scraping. ZERO automated sending.
 */

let firewallContext: FirewallContext = {
  staffPhones: new Set(),
  customerPhoneMap: {},
  personalBlacklist: new Set(),
  officialBusinessNumber: "919944775513",
};

let currentDecision: FirewallDecision | null = null;
let currentChatPhone: string = "";
let currentChatId: string = "";

// Initialize Extension State
async function init() {
  console.info("[SLI CRM] Content script initialized on web.whatsapp.com");

  // Load saved local context & blacklist
  const localData = await chrome.storage.local.get([
    "staffPhones",
    "customerPhoneMap",
    "personalBlacklist",
    "executiveUser",
  ]);

  if (localData.staffPhones) {
    firewallContext.staffPhones = new Set(localData.staffPhones);
  }
  if (localData.customerPhoneMap) {
    firewallContext.customerPhoneMap = localData.customerPhoneMap;
  }
  if (localData.personalBlacklist) {
    firewallContext.personalBlacklist = new Set(localData.personalBlacklist);
  }

  createSidebarWidget();
  startChatHeaderObserver();
}

/**
 * Create or inject floating SLI CRM Sidebar
 */
function createSidebarWidget() {
  if (document.getElementById("sli-crm-assistant-sidebar")) return;

  const sidebar = document.createElement("div");
  sidebar.id = "sli-crm-assistant-sidebar";
  sidebar.innerHTML = `
    <div class="sli-sidebar-header">
      <div class="sli-sidebar-title">🏢 SLI CRM Assistant</div>
      <button id="sli-btn-toggle" style="background:none;border:none;color:white;cursor:pointer;">✕</button>
    </div>
    <div class="sli-sidebar-body" id="sli-sidebar-content">
      <p style="color:#64748b;">Select a conversation to evaluate CRM eligibility...</p>
    </div>
  `;

  document.body.appendChild(sidebar);

  document.getElementById("sli-btn-toggle")?.addEventListener("click", () => {
    sidebar.classList.toggle("minimized");
  });
}

/**
 * Observer to detect when active chat changes in WhatsApp Web
 */
function startChatHeaderObserver() {
  setInterval(() => {
    const headerTitleEl = document.querySelector("#main header span[dir='auto']");
    if (!headerTitleEl) return;

    const titleText = headerTitleEl.textContent || "";
    // Check if phone or contact
    const phoneMatch = titleText.replace(/\D/g, "");

    // Extract chat ID from container or DOM
    const mainEl = document.querySelector("#main");
    const isGroup = document.querySelector("#main header")?.textContent?.includes("group") || false;

    const chatId = isGroup ? "group@g.us" : `${phoneMatch}@c.us`;

    if (chatId !== currentChatId || phoneMatch !== currentChatPhone) {
      currentChatId = chatId;
      currentChatPhone = phoneMatch;
      handleActiveChatChanged(chatId, phoneMatch, titleText);
    }
  }, 1000);
}

/**
 * Triggered whenever active chat changes
 */
function handleActiveChatChanged(chatId: string, phone: string, titleText: string) {
  currentDecision = evaluateChatEligibility(chatId, phone, firewallContext);
  renderSidebarContent(currentDecision, titleText, phone);
}

/**
 * Render Sidebar State
 */
function renderSidebarContent(
  decision: FirewallDecision,
  titleText: string,
  phone: string
) {
  const container = document.getElementById("sli-sidebar-content");
  if (!container) return;

  if (decision.eligibility === "BLOCKED_GROUP") {
    container.innerHTML = `
      <span class="sli-badge sli-badge-blocked">🚫 GROUP CHAT</span>
      <p><strong>${titleText}</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button class="sli-btn-sync" disabled>Sync Blocked (Group)</button>
    `;
    return;
  }

  if (decision.eligibility === "BLOCKED_STAFF") {
    container.innerHTML = `
      <span class="sli-badge sli-badge-blocked">👤 STAFF / COLLEAGUE</span>
      <p><strong>${titleText} (+${phone})</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button class="sli-btn-sync" disabled>Sync Blocked (Company Staff)</button>
    `;
    return;
  }

  if (decision.eligibility === "BLOCKED_PERSONAL") {
    container.innerHTML = `
      <span class="sli-badge sli-badge-blocked">🔒 PERSONAL CONTACT</span>
      <p><strong>${titleText} (+${phone})</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button id="sli-btn-unblock" class="sli-btn-blacklist">Remove from Personal Blacklist</button>
    `;

    document.getElementById("sli-btn-unblock")?.addEventListener("click", async () => {
      firewallContext.personalBlacklist.delete(phone);
      await chrome.storage.local.set({
        personalBlacklist: Array.from(firewallContext.personalBlacklist),
      });
      handleActiveChatChanged(currentChatId, phone, titleText);
    });
    return;
  }

  if (decision.eligibility === "QUARANTINED_UNKNOWN") {
    container.innerHTML = `
      <span class="sli-badge sli-badge-quarantine">🟡 QUARANTINED (UNKNOWN)</span>
      <p><strong>${titleText} (+${phone})</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button id="sli-btn-promote" class="sli-btn-quarantine">➕ Add as CRM Lead & Enable Sync</button>
      <button id="sli-btn-block-personal" class="sli-btn-blacklist">Mark as Personal (Never Sync)</button>
    `;

    document.getElementById("sli-btn-promote")?.addEventListener("click", () => {
      firewallContext.customerPhoneMap[phone] = {
        contactId: `temp-${Date.now()}`,
        name: titleText || `Customer +${phone}`,
      };
      handleActiveChatChanged(currentChatId, phone, titleText);
    });

    document.getElementById("sli-btn-block-personal")?.addEventListener("click", async () => {
      firewallContext.personalBlacklist.add(phone);
      await chrome.storage.local.set({
        personalBlacklist: Array.from(firewallContext.personalBlacklist),
      });
      handleActiveChatChanged(currentChatId, phone, titleText);
    });
    return;
  }

  if (decision.eligibility === "ELIGIBLE_CUSTOMER") {
    container.innerHTML = `
      <span class="sli-badge sli-badge-eligible">🟢 ELIGIBLE CUSTOMER</span>
      <p><strong>${decision.customerName}</strong> (+${phone})</p>
      <p style="color:#15803d;margin-top:4px;">Ready to sync to CRM timeline.</p>
      <button id="sli-btn-manual-sync" class="sli-btn-sync">📥 Sync this Chat to CRM</button>
      <button id="sli-btn-block-personal" class="sli-btn-blacklist">Mark as Personal (Never Sync)</button>
    `;

    document.getElementById("sli-btn-manual-sync")?.addEventListener("click", () => {
      triggerManualChatSync(phone, decision.customerName || titleText);
    });

    document.getElementById("sli-btn-block-personal")?.addEventListener("click", async () => {
      firewallContext.personalBlacklist.add(phone);
      await chrome.storage.local.set({
        personalBlacklist: Array.from(firewallContext.personalBlacklist),
      });
      handleActiveChatChanged(currentChatId, phone, titleText);
    });
  }
}

/**
 * 📥 Manual 1-Click Sync Handler
 * Only extracts visible messages for this single customer and dispatches via background service worker.
 */
function triggerManualChatSync(customerPhone: string, customerName: string) {
  // Extract visible messages in chat window
  const messageNodes = document.querySelectorAll("#main .message-in, #main .message-out");
  const messages: any[] = [];

  messageNodes.forEach((node) => {
    const isOut = node.classList.contains("message-out");
    const textEl = node.querySelector(".selectable-text");
    const text = textEl?.textContent || "";
    if (text) {
      messages.push({
        whatsappMessageId: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        direction: isOut ? "outbound" : "inbound",
        contentText: text,
        timestamp: Date.now(),
      });
    }
  });

  const syncBtn = document.getElementById("sli-btn-manual-sync") as HTMLButtonElement;
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.textContent = "Syncing...";
  }

  chrome.runtime.sendMessage(
    {
      action: "SYNC_CUSTOMER_CHAT",
      payload: {
        customerPhone,
        customerName,
        isGroup: false,
        messages: messages.slice(-20), // Last 20 messages for POC
      },
    },
    (res) => {
      if (syncBtn) {
        syncBtn.disabled = false;
        if (res?.ok) {
          syncBtn.textContent = `✅ Synced (${res.syncedCount || 0} msgs)`;
        } else {
          syncBtn.textContent = `❌ Failed: ${res?.error || "Error"}`;
        }
      }
    }
  );
}

// Start
init();
