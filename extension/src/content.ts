import {
  evaluateChatEligibility,
  type FirewallContext,
  type FirewallDecision,
} from "./firewall";

declare const chrome: any;

/**
 * 🛡️ SLI CRM WhatsApp Web Content Script
 * Robust Multi-Selector Extraction for Phone, Text, Images, Audios & Documents.
 */

let firewallContext: FirewallContext = {
  staffPhones: new Set(),
  customerPhoneMap: {},
  personalBlacklist: new Set(),
  officialBusinessNumber: "919944775513",
};

let currentDecision: FirewallDecision | null = null;
let currentChatPhone: string = "";
let currentChatName: string = "";
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
 * Extract Real Phone Number (10 to 15 digits) even when contact has a custom name
 */
function extractRealPhoneNumber(titleText: string): string {
  // 1. Try to find 10-15 digit phone from message data-id attributes inside #main
  const msgElements = document.querySelectorAll("#main div[data-id]");
  for (const el of Array.from(msgElements)) {
    const id = el.getAttribute("data-id") || "";
    // Format: false_917603830507@c.us_3EB0...
    const match = id.match(/_(\d{10,15})@c\.us/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 2. Try to find phone from header subtitle or contact title attribute
  const headerSubtitle = document.querySelector("#main header span[title]")?.getAttribute("title") || "";
  const subDigits = headerSubtitle.replace(/\D/g, "");
  if (subDigits.length >= 10) return subDigits;

  // 3. Try to find phone from full header text
  const headerText = document.querySelector("#main header")?.textContent || "";
  const digitsMatch = headerText.match(/(\+?\d[\d\s\-]{8,15}\d)/);
  if (digitsMatch) {
    const d = digitsMatch[1].replace(/\D/g, "");
    if (d.length >= 10) return d;
  }

  // 4. If titleText itself has 10+ digits
  const titleDigits = titleText.replace(/\D/g, "");
  if (titleDigits.length >= 10) return titleDigits;

  return "";
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

    const titleText = (headerTitleEl.textContent || "").trim();
    const isGroup = document.querySelector("#main header")?.textContent?.toLowerCase().includes("group") || false;

    const realPhone = extractRealPhoneNumber(titleText);
    const chatId = isGroup ? "group@g.us" : `${realPhone || titleText}@c.us`;

    if (chatId !== currentChatId || realPhone !== currentChatPhone || titleText !== currentChatName) {
      currentChatId = chatId;
      currentChatPhone = realPhone;
      currentChatName = titleText;
      handleActiveChatChanged(chatId, realPhone, titleText);
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

  const displayPhone = phone ? `+${phone}` : "(Phone not in title)";

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
      <p><strong>${titleText} (${displayPhone})</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button class="sli-btn-sync" disabled>Sync Blocked (Company Staff)</button>
    `;
    return;
  }

  if (decision.eligibility === "BLOCKED_PERSONAL") {
    container.innerHTML = `
      <span class="sli-badge sli-badge-blocked">🔒 PERSONAL CONTACT</span>
      <p><strong>${titleText} (${displayPhone})</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button id="sli-btn-unblock" class="sli-btn-blacklist">Remove from Personal Blacklist</button>
    `;

    document.getElementById("sli-btn-unblock")?.addEventListener("click", async () => {
      if (phone) firewallContext.personalBlacklist.delete(phone);
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
      <p><strong>${titleText}</strong></p>
      <div style="margin: 8px 0;">
        <label style="font-size:10px;color:#64748b;font-weight:600;">CUSTOMER PHONE NUMBER:</label>
        <input id="sli-input-phone" type="text" value="${phone ? `+${phone}` : ""}" placeholder="+919876543210" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;margin-top:2px;box-sizing:border-box;" />
      </div>
      <p style="color:#64748b;font-size:11px;">${decision.reason}</p>
      <button id="sli-btn-promote" class="sli-btn-quarantine">➕ Add as CRM Lead & Enable Sync</button>
      <button id="sli-btn-block-personal" class="sli-btn-blacklist">Mark as Personal (Never Sync)</button>
    `;

    document.getElementById("sli-btn-promote")?.addEventListener("click", () => {
      const inputPhoneEl = document.getElementById("sli-input-phone") as HTMLInputElement;
      const targetPhone = (inputPhoneEl?.value || phone).replace(/\D/g, "");

      if (!targetPhone || targetPhone.length < 10) {
        alert("Please enter a valid 10-digit customer phone number.");
        return;
      }

      firewallContext.customerPhoneMap[targetPhone] = {
        contactId: `temp-${Date.now()}`,
        name: titleText || `Customer +${targetPhone}`,
      };
      currentChatPhone = targetPhone;
      handleActiveChatChanged(currentChatId, targetPhone, titleText);
    });

    document.getElementById("sli-btn-block-personal")?.addEventListener("click", async () => {
      if (phone) {
        firewallContext.personalBlacklist.add(phone);
        await chrome.storage.local.set({
          personalBlacklist: Array.from(firewallContext.personalBlacklist),
        });
      }
      handleActiveChatChanged(currentChatId, phone, titleText);
    });
    return;
  }

  if (decision.eligibility === "ELIGIBLE_CUSTOMER") {
    container.innerHTML = `
      <span class="sli-badge sli-badge-eligible">🟢 ELIGIBLE CUSTOMER</span>
      <p><strong>${decision.customerName}</strong></p>
      <p style="color:#15803d;font-weight:600;margin:2px 0;">📱 ${displayPhone}</p>
      <p style="color:#64748b;font-size:11px;margin-top:4px;">Syncs text messages, photos, audio voice notes & documents to CRM timeline.</p>
      <button id="sli-btn-manual-sync" class="sli-btn-sync">📥 Sync this Chat to CRM</button>
      <button id="sli-btn-block-personal" class="sli-btn-blacklist">Mark as Personal (Never Sync)</button>
    `;

    document.getElementById("sli-btn-manual-sync")?.addEventListener("click", () => {
      triggerManualChatSync(phone, decision.customerName || titleText);
    });

    document.getElementById("sli-btn-block-personal")?.addEventListener("click", async () => {
      if (phone) {
        firewallContext.personalBlacklist.add(phone);
        await chrome.storage.local.set({
          personalBlacklist: Array.from(firewallContext.personalBlacklist),
        });
      }
      handleActiveChatChanged(currentChatId, phone, titleText);
    });
  }
}

/**
 * 📥 Robust Manual 1-Click Sync Handler
 * Extracts Text, Photo Previews, Voice Notes & Documents currently visible in chat.
 */
function triggerManualChatSync(customerPhone: string, customerName: string) {
  if (!customerPhone || customerPhone.length < 10) {
    alert("Cannot sync: Invalid phone number. Please verify customer phone number.");
    return;
  }

  // Extract all visible message bubble rows
  const messageNodes = document.querySelectorAll(
    "#main div[data-id], #main div[role='row'], #main .message-in, #main .message-out"
  );
  const messages: any[] = [];
  const seenIds = new Set<string>();

  messageNodes.forEach((node) => {
    const dataId = node.getAttribute("data-id") || "";
    if (dataId && seenIds.has(dataId)) return;
    if (dataId) seenIds.add(dataId);

    const isOut = dataId.startsWith("true_") || node.classList.contains("message-out");

    // 1. Extract Text
    const textEl = node.querySelector(".selectable-text, .copyable-text, span[dir='ltr'], span[dir='auto']");
    let text = (textEl?.textContent || "").trim();

    // 2. Extract Photo / Image
    let mediaType: string | undefined;
    let mediaUrl: string | undefined;
    const imgEl = node.querySelector("img[src]") as HTMLImageElement;
    if (imgEl && imgEl.src && !imgEl.src.includes("avatar") && !imgEl.src.includes("emoji")) {
      mediaType = "image";
      mediaUrl = imgEl.src;
      if (!text) text = "📷 [Photo / Image attachment]";
    }

    // 3. Extract Audio / Voice Note
    const isAudio = node.querySelector(
      "[data-testid='audio-play'], [data-testid='audio-player'], [data-icon='audio-play'], [data-icon='ptt-play'], audio"
    );
    if (isAudio) {
      mediaType = "audio";
      if (!text) text = "🎤 [Voice Message / Audio Note]";
    }

    // 4. Extract Document (PDF, Word, Catalog)
    const docSpan = node.querySelector(
      "span[title*='.pdf'], span[title*='.doc'], span[title*='.xls'], span[title*='.jpg'], span[title*='.png'], [data-testid='document-thumb']"
    );
    const docTitle = docSpan?.getAttribute("title") || docSpan?.textContent?.trim();
    if (docTitle) {
      mediaType = "document";
      if (!text) text = `📄 [Document: ${docTitle}]`;
    }

    if (text || mediaType) {
      messages.push({
        whatsappMessageId: dataId || `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        direction: isOut ? "outbound" : "inbound",
        contentText: text,
        mediaType,
        mediaUrl,
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
        messages: messages.slice(-50), // Last 50 messages for rich sync
      },
    },
    (res: any) => {
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
