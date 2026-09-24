import {
  evaluateChatEligibility,
  type FirewallContext,
  type FirewallDecision,
} from "./firewall";

declare const chrome: any;

/**
 * 🏢 Sri Lakshmi Industries - WhatsApp Web Assistant Content Script
 * TeleCRM Smart Sync Architecture: Auto Sync, Pass Key Auth, Date-Range Sync & Personal Blocklist.
 */

let firewallContext: FirewallContext = {
  staffPhones: new Set(),
  customerPhoneMap: {},
  personalBlacklist: new Set(),
  officialBusinessNumber: "919944775513",
};

let currentExecutive: {
  id: string;
  name: string;
  phone: string;
  userId: string;
  syncMode?: "leads_only" | "all";
} | null = null;

let autoSyncEnabled: boolean = true;
let currentDecision: FirewallDecision | null = null;
let currentChatPhone: string = "";
let currentChatName: string = "";
let currentChatId: string = "";

let activeTab: "sync" | "blocklist" = "sync";
let autoSyncDebounceTimer: any = null;

// Initialize Content Script
async function init() {
  console.info("[SLI CRM] Content script running on web.whatsapp.com");

  // Load stored context
  const localData = await chrome.storage.local.get([
    "passKey",
    "executiveUser",
    "staffPhones",
    "customerPhoneMap",
    "personalBlacklist",
    "autoSyncEnabled",
  ]);

  if (localData.executiveUser) {
    currentExecutive = localData.executiveUser;
  }
  if (localData.staffPhones) {
    firewallContext.staffPhones = new Set(localData.staffPhones);
  }
  if (localData.personalBlacklist) {
    firewallContext.personalBlacklist = new Set(localData.personalBlacklist);
  }
  if (localData.customerPhoneMap) {
    firewallContext.customerPhoneMap = localData.customerPhoneMap;
  }
  if (typeof localData.autoSyncEnabled === "boolean") {
    autoSyncEnabled = localData.autoSyncEnabled;
  }

  createSidebarWidget();
  startChatHeaderObserver();
  setupMessageMutationObserver();
}

/**
 * Extract Real Phone Number (10 to 12 Indian digits strictly from active chat)
 */
function extractRealPhoneNumber(titleText: string): string {
  // 1. Extract from #main message data-id
  const msgElements = document.querySelectorAll("#main [data-id]");
  for (const el of Array.from(msgElements)) {
    const id = el.getAttribute("data-id") || "";
    const match = id.match(/^(?:true|false)_([6-9]\d{9}|91[6-9]\d{9})@c\.us/);
    if (match && match[1]) {
      const d = match[1];
      return d.startsWith("91") ? d : `91${d}`;
    }
  }

  // 2. Extract from "About and phone number"
  const headings = Array.from(document.querySelectorAll("span, div, h2, h3, p"));
  for (const h of headings) {
    const headingText = (h.textContent || "").trim();
    if (headingText === "About and phone number" || headingText === "About") {
      const container = h.parentElement?.parentElement || h.parentElement;
      const text = container?.textContent || "";
      const match = text.match(/\+91[\s\-]?([6-9]\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4})/);
      if (match) {
        const clean = match[1].replace(/\D/g, "");
        if (clean.length === 10) return "91" + clean;
      }
    }
  }

  // 3. Extract from active chat header (#main header)
  const header = document.querySelector("#main header");
  if (header) {
    const headerText = header.textContent || "";
    const headerMatch = headerText.match(/\+91[\s\-]?([6-9]\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4})/);
    if (headerMatch) {
      const clean = headerMatch[1].replace(/\D/g, "");
      if (clean.length === 10) return "91" + clean;
    }
  }

  // 4. If titleText itself is a 10-digit mobile
  const titleDigits = titleText.replace(/\D/g, "");
  if (titleDigits.length === 10 && /^[6-9]/.test(titleDigits)) return "91" + titleDigits;
  if (titleDigits.length === 12 && titleDigits.startsWith("91") && /^[6-9]/.test(titleDigits.substring(2))) return titleDigits;

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
      <div class="sli-sidebar-title">
        <span>🏭</span> SLI WhatsApp Sync
      </div>
      <div class="sli-header-actions">
        <button id="sli-btn-minimize" class="sli-icon-btn" title="Minimize / Expand">✕</button>
      </div>
    </div>
    <div class="sli-sidebar-body" id="sli-sidebar-content">
      <p style="color:#64748b;text-align:center;">Loading SLI Assistant...</p>
    </div>
  `;

  document.body.appendChild(sidebar);

  document.getElementById("sli-btn-minimize")?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("minimized");
  });

  sidebar.addEventListener("click", () => {
    if (sidebar.classList.contains("minimized")) {
      sidebar.classList.remove("minimized");
    }
  });

  renderApp();
}

/**
 * Main Render Controller
 */
function renderApp() {
  const container = document.getElementById("sli-sidebar-content");
  if (!container) return;

  // 1. If NOT logged in, show Pass Key Login View
  if (!currentExecutive) {
    renderLoginView(container);
    return;
  }

  // 2. Main Dashboard View
  renderDashboardView(container);
}

/**
 * 🔑 Render Pass Key Login View
 */
function renderLoginView(container: HTMLElement) {
  container.innerHTML = `
    <div class="sli-login-card">
      <div style="font-size:32px;margin-bottom:8px;">🔐</div>
      <h3 style="font-size:14px;font-weight:700;margin:0 0 4px;color:#0f172a;">Connect to SLI CRM</h3>
      <p style="font-size:11px;color:#64748b;margin:0 0 14px;">
        Enter your <strong>Extension Pass Key</strong> provided in CRM Settings &gt; WhatsApp Chat Sync.
      </p>

      <div style="text-align:left;margin-bottom:12px;">
        <label style="font-size:10px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">
          EXTENSION PASS KEY:
        </label>
        <input id="sli-input-passkey" class="sli-input" type="password" placeholder="slicrm#satheesh@9786390479&amp;..." />
        <div id="sli-login-error" style="color:#ef4444;font-size:11px;margin-top:4px;display:none;"></div>
      </div>

      <button id="sli-btn-connect" class="sli-btn-primary">
        🚀 Connect WhatsApp
      </button>
    </div>
  `;

  document.getElementById("sli-btn-connect")?.addEventListener("click", handlePassKeyLogin);
  document.getElementById("sli-input-passkey")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handlePassKeyLogin();
  });
}

async function handlePassKeyLogin() {
  const inputEl = document.getElementById("sli-input-passkey") as HTMLInputElement;
  const errorEl = document.getElementById("sli-login-error");
  const btnEl = document.getElementById("sli-btn-connect") as HTMLButtonElement;

  const passKey = (inputEl?.value || "").trim();
  if (!passKey) {
    if (errorEl) {
      errorEl.textContent = "Please enter your Extension Pass Key.";
      errorEl.style.display = "block";
    }
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = "Verifying...";
  }

  chrome.runtime.sendMessage(
    { action: "AUTH_WITH_PASSKEY", payload: { passKey } },
    (res: any) => {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = "🚀 Connect WhatsApp";
      }

      if (res?.ok && res.data?.executive) {
        currentExecutive = res.data.executive;
        if (res.data.staffPhones) firewallContext.staffPhones = new Set(res.data.staffPhones);
        if (res.data.customerPhoneMap) firewallContext.customerPhoneMap = res.data.customerPhoneMap;
        autoSyncEnabled = true;
        renderApp();
      } else {
        if (errorEl) {
          errorEl.textContent = res?.error || "Invalid Pass Key. Please check CRM settings.";
          errorEl.style.display = "block";
        }
      }
    }
  );
}

/**
 * 📊 Render Connected Dashboard View
 */
function renderDashboardView(container: HTMLElement) {
  const displayPhone = currentExecutive?.phone ? `+${currentExecutive.phone}` : "";

  container.innerHTML = `
    <!-- Executive Profile Bar -->
    <div class="sli-executive-bar">
      <div class="sli-exec-info">
        <div class="sli-exec-avatar">
          ${(currentExecutive?.name || "EX").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div class="sli-exec-name">${currentExecutive?.name}</div>
          <div class="sli-exec-phone">${displayPhone}</div>
        </div>
      </div>
      <button id="sli-btn-logout" class="sli-icon-btn" title="Disconnect Account" style="font-size:11px;color:#ef4444;">
        Logout
      </button>
    </div>

    <!-- Auto Sync Switch Card -->
    <div class="sli-autosync-card">
      <div>
        <div class="sli-autosync-label">
          <span>⚡</span> Auto Chat Sync
        </div>
        <div class="sli-autosync-desc">
          ${autoSyncEnabled ? "Syncing messages automatically in real time" : "Auto sync is paused"}
        </div>
      </div>
      <label class="sli-switch">
        <input type="checkbox" id="sli-toggle-autosync" ${autoSyncEnabled ? "checked" : ""}>
        <span class="sli-slider"></span>
      </label>
    </div>

    <!-- Tabs Navigation -->
    <div style="display:flex;gap:4px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
      <button id="sli-tab-sync" style="background:none;border:none;font-size:11px;font-weight:600;padding:4px 8px;cursor:pointer;color:${activeTab === "sync" ? "#059669;border-bottom:2px solid #059669;" : "#64748b;"}">
        💬 Active Chat &amp; Sync
      </button>
      <button id="sli-tab-blocklist" style="background:none;border:none;font-size:11px;font-weight:600;padding:4px 8px;cursor:pointer;color:${activeTab === "blocklist" ? "#059669;border-bottom:2px solid #059669;" : "#64748b;"}">
        🛡️ Blocklist (${firewallContext.personalBlacklist.size})
      </button>
    </div>

    <!-- Tab Content Container -->
    <div id="sli-tab-content"></div>
  `;

  // Wire Tab Switches
  document.getElementById("sli-tab-sync")?.addEventListener("click", () => {
    activeTab = "sync";
    renderApp();
  });

  document.getElementById("sli-tab-blocklist")?.addEventListener("click", () => {
    activeTab = "blocklist";
    renderApp();
  });

  // Wire Auto Sync Toggle
  const toggleEl = document.getElementById("sli-toggle-autosync") as HTMLInputElement;
  toggleEl?.addEventListener("change", async (e) => {
    autoSyncEnabled = (e.target as HTMLInputElement).checked;
    await chrome.storage.local.set({ autoSyncEnabled });
    renderApp();
  });

  // Wire Logout
  document.getElementById("sli-btn-logout")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to disconnect this executive account?")) {
      chrome.runtime.sendMessage({ action: "LOGOUT" }, () => {
        currentExecutive = null;
        renderApp();
      });
    }
  });

  // Render specific tab
  const tabContent = document.getElementById("sli-tab-content");
  if (tabContent) {
    if (activeTab === "sync") {
      renderActiveChatCard(tabContent);
    } else {
      renderBlocklistTab(tabContent);
    }
  }
}

/**
 * 💬 Render Active Chat Card & Manual Date Sync
 */
function renderActiveChatCard(container: HTMLElement) {
  if (!currentChatName) {
    container.innerHTML = `
      <div style="padding:16px 8px;text-align:center;color:#64748b;">
        <div style="font-size:24px;margin-bottom:6px;">👈</div>
        <p style="margin:0;font-size:12px;">Select any chat on WhatsApp to inspect CRM eligibility &amp; sync options.</p>
      </div>
    `;
    return;
  }

  const phone = currentChatPhone;
  const displayPhone = phone && phone.length >= 10 ? `+${phone}` : "";
  const decision = currentDecision || evaluateChatEligibility(currentChatId, phone, firewallContext);

  let statusBadgeHtml = "";
  let actionButtonsHtml = "";

  if (decision.eligibility === "BLOCKED_GROUP") {
    statusBadgeHtml = `<span class="sli-badge sli-badge-blocked">🚫 GROUP CHAT</span>`;
    actionButtonsHtml = `<button class="sli-btn-primary" disabled>Sync Blocked (Group Chat)</button>`;
  } else if (decision.eligibility === "BLOCKED_STAFF") {
    statusBadgeHtml = `<span class="sli-badge sli-badge-blocked">👤 STAFF / COLLEAGUE</span>`;
    actionButtonsHtml = `<button class="sli-btn-primary" disabled>Sync Blocked (Company Staff)</button>`;
  } else if (decision.eligibility === "BLOCKED_PERSONAL") {
    statusBadgeHtml = `<span class="sli-badge sli-badge-blocked">🔒 PERSONAL CONTACT</span>`;
    actionButtonsHtml = `
      <button id="sli-btn-unblock" class="sli-btn-secondary">Remove from Personal Blocklist</button>
    `;
  } else if (decision.eligibility === "QUARANTINED_UNKNOWN") {
    statusBadgeHtml = `<span class="sli-badge sli-badge-quarantine">🟡 UNKNOWN / NEW LEAD</span>`;
    actionButtonsHtml = `
      <div style="margin:6px 0;">
        <label style="font-size:9.5px;color:#64748b;font-weight:600;">CONFIRM 10-DIGIT MOBILE NUMBER:</label>
        <input id="sli-input-phone" class="sli-input" type="text" value="${displayPhone || (phone.length >= 10 ? `+${phone}` : '')}" placeholder="+919876543210" style="margin-top:2px;" />
      </div>
      <button id="sli-btn-promote" class="sli-btn-primary" style="background:#d97706;">➕ Add as CRM Lead &amp; Sync</button>
      <button id="sli-btn-block-personal" class="sli-btn-secondary">Mark as Personal (Never Sync)</button>
    `;
  } else {
    statusBadgeHtml = `<span class="sli-badge sli-badge-eligible">🟢 ELIGIBLE CRM CUSTOMER</span>`;
    actionButtonsHtml = `
      <div style="margin:4px 0 8px;">
        <label style="font-size:9.5px;color:#15803d;font-weight:600;">CUSTOMER MOBILE NUMBER:</label>
        <input id="sli-input-phone-edit" class="sli-input" type="text" value="${displayPhone || (phone.length >= 10 ? `+${phone}` : '')}" placeholder="+919876543210" style="margin-top:2px;font-weight:600;color:#15803d;border-color:#86efac;" />
      </div>
      <button id="sli-btn-manual-sync" class="sli-btn-primary">📥 Sync this Chat to CRM</button>
      <button id="sli-btn-block-personal" class="sli-btn-secondary">Mark as Personal (Never Sync)</button>
    `;
  }

  // Today & 7 days ago defaults for Date Range Sync
  const todayStr = new Date().toISOString().split("T")[0];
  const lastWeekStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  container.innerHTML = `
    <!-- Active Chat Info Card -->
    <div class="sli-section-card" style="margin-top:6px;">
      <div class="sli-section-title">Active Conversation</div>
      ${statusBadgeHtml}
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px;">
        ${currentChatName}
      </div>
      <p style="font-size:11px;color:#64748b;margin:0 0 8px;">${decision.reason}</p>
      ${actionButtonsHtml}
    </div>

    <!-- Date-Range Manual Sync Card -->
    <div class="sli-section-card" style="margin-top:8px;">
      <div class="sli-section-title">📅 Date-Range Sync</div>
      <div class="sli-date-grid">
        <div class="sli-date-group">
          <label>FROM DATE:</label>
          <input type="date" id="sli-date-from" class="sli-input" value="${lastWeekStr}">
        </div>
        <div class="sli-date-group">
          <label>TO DATE:</label>
          <input type="date" id="sli-date-to" class="sli-input" value="${todayStr}">
        </div>
      </div>
      <button id="sli-btn-range-sync" class="sli-btn-primary" style="background:#0284c7;" ${decision.eligibility.startsWith("BLOCKED") ? "disabled" : ""}>
        📅 Sync Date Range
      </button>
    </div>
  `;

  // Event Listeners
  document.getElementById("sli-btn-promote")?.addEventListener("click", async () => {
    const inputPhoneEl = document.getElementById("sli-input-phone") as HTMLInputElement;
    const targetPhone = (inputPhoneEl?.value || phone).replace(/\D/g, "");

    if (!targetPhone || targetPhone.length < 10) {
      alert("Please enter a valid 10-digit customer mobile number.");
      return;
    }

    firewallContext.customerPhoneMap[targetPhone] = {
      contactId: `temp-${Date.now()}`,
      name: currentChatName || `Customer +${targetPhone}`,
    };
    await chrome.storage.local.set({ customerPhoneMap: firewallContext.customerPhoneMap });
    currentChatPhone = targetPhone;
    handleActiveChatChanged(currentChatId, targetPhone, currentChatName);
  });

  document.getElementById("sli-btn-unblock")?.addEventListener("click", async () => {
    if (phone) firewallContext.personalBlacklist.delete(phone);
    await chrome.storage.local.set({
      personalBlacklist: Array.from(firewallContext.personalBlacklist),
    });
    handleActiveChatChanged(currentChatId, phone, currentChatName);
  });

  document.getElementById("sli-btn-block-personal")?.addEventListener("click", async () => {
    if (phone) {
      firewallContext.personalBlacklist.add(phone);
      await chrome.storage.local.set({
        personalBlacklist: Array.from(firewallContext.personalBlacklist),
      });
    }
    handleActiveChatChanged(currentChatId, phone, currentChatName);
  });

  document.getElementById("sli-btn-manual-sync")?.addEventListener("click", () => {
    const editPhoneEl = document.getElementById("sli-input-phone-edit") as HTMLInputElement;
    const targetPhone = (editPhoneEl?.value || phone).replace(/\D/g, "");
    triggerManualChatSync(targetPhone, decision.customerName || currentChatName);
  });

  document.getElementById("sli-btn-range-sync")?.addEventListener("click", () => {
    const fromEl = document.getElementById("sli-date-from") as HTMLInputElement;
    const toEl = document.getElementById("sli-date-to") as HTMLInputElement;
    const fromDate = fromEl?.value ? new Date(fromEl.value).getTime() : 0;
    const toDate = toEl?.value ? new Date(toEl.value).getTime() + 24 * 60 * 60 * 1000 : Date.now();

    const editPhoneEl = document.getElementById("sli-input-phone-edit") as HTMLInputElement;
    const targetPhone = (editPhoneEl?.value || phone).replace(/\D/g, "");
    triggerManualChatSync(targetPhone, decision.customerName || currentChatName, fromDate, toDate);
  });
}

/**
 * 🛡️ Render Personal Blocklist Tab
 */
function renderBlocklistTab(container: HTMLElement) {
  const items = Array.from(firewallContext.personalBlacklist);

  container.innerHTML = `
    <div class="sli-section-card" style="margin-top:6px;">
      <div class="sli-section-title">Personal Blocked Numbers</div>
      <p style="font-size:11px;color:#64748b;margin:0 0 8px;">
        These numbers will NEVER be synced to CRM under any circumstance.
      </p>

      <div style="display:flex;gap:4px;margin-bottom:8px;">
        <input id="sli-input-add-block" class="sli-input" type="text" placeholder="+919876543210" />
        <button id="sli-btn-add-block" class="sli-btn-primary" style="width:auto;padding:6px 10px;">Add</button>
      </div>

      <div class="sli-blocklist">
        ${
          items.length === 0
            ? '<p style="color:#94a3b8;font-size:11px;text-align:center;padding:8px 0;margin:0;">No personal numbers blocked</p>'
            : items
                .map(
                  (num) => `
          <div class="sli-block-item">
            <span>+${num}</span>
            <button class="sli-btn-del" data-del-num="${num}" title="Remove">✕</button>
          </div>
        `
                )
                .join("")
        }
      </div>
    </div>
  `;

  document.getElementById("sli-btn-add-block")?.addEventListener("click", async () => {
    const inputEl = document.getElementById("sli-input-add-block") as HTMLInputElement;
    const val = (inputEl?.value || "").replace(/\D/g, "");
    if (val.length >= 10) {
      firewallContext.personalBlacklist.add(val);
      await chrome.storage.local.set({
        personalBlacklist: Array.from(firewallContext.personalBlacklist),
      });
      renderApp();
    }
  });

  container.querySelectorAll("[data-del-num]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const num = (e.currentTarget as HTMLElement).getAttribute("data-del-num");
      if (num) {
        firewallContext.personalBlacklist.delete(num);
        await chrome.storage.local.set({
          personalBlacklist: Array.from(firewallContext.personalBlacklist),
        });
        renderApp();
      }
    });
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
    const isGroup =
      document.querySelector("#main header")?.textContent?.toLowerCase().includes("group") ||
      false;

    const realPhone = extractRealPhoneNumber(titleText);
    const chatId = isGroup ? "group@g.us" : `${realPhone || titleText}@c.us`;

    if (
      chatId !== currentChatId ||
      (realPhone && realPhone !== currentChatPhone) ||
      titleText !== currentChatName
    ) {
      currentChatId = chatId;
      if (realPhone) currentChatPhone = realPhone;
      currentChatName = titleText;
      handleActiveChatChanged(chatId, currentChatPhone, titleText);
    }
  }, 1000);
}

/**
 * Triggered whenever active chat changes
 */
function handleActiveChatChanged(chatId: string, phone: string, titleText: string) {
  currentDecision = evaluateChatEligibility(chatId, phone, firewallContext);
  renderApp();

  // If auto-sync is ON and chat is eligible, trigger a sync
  if (autoSyncEnabled && currentDecision.eligibility === "ELIGIBLE_CUSTOMER" && phone) {
    scheduleAutoSync(phone, currentDecision.customerName || titleText);
  }
}

/**
 * ⚡ Real-Time Mutation Observer for Auto Sync
 */
function setupMessageMutationObserver() {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };

  const observer = new MutationObserver(() => {
    if (!autoSyncEnabled || !currentExecutive) return;
    if (!currentChatPhone || currentDecision?.eligibility !== "ELIGIBLE_CUSTOMER") return;

    scheduleAutoSync(currentChatPhone, currentDecision.customerName || currentChatName);
  });

  observer.observe(targetNode, config);
}

function scheduleAutoSync(phone: string, name: string) {
  if (autoSyncDebounceTimer) clearTimeout(autoSyncDebounceTimer);
  autoSyncDebounceTimer = setTimeout(() => {
    const messages = extractMessagesFromDOM();
    if (messages.length > 0) {
      chrome.runtime.sendMessage({
        action: "SYNC_CUSTOMER_CHAT",
        payload: {
          customerPhone: phone,
          customerName: name,
          isGroup: false,
          messages: messages.slice(-25), // Last 25 messages in auto-sync
        },
      });
    }
  }, 2500); // 2.5s debounce
}

/**
 * 📥 Robust Message Scraper from WhatsApp Web DOM
 */
function extractMessagesFromDOM(fromDate?: number, toDate?: number): any[] {
  const messages: any[] = [];
  const seenKeys = new Set<string>();

  // 1. Target distinct message containers ONLY:
  // Primary: rows with data-id or .message-in/.message-out
  let candidateNodes = Array.from(
    document.querySelectorAll(
      "#main .message-in, #main .message-out, #main [data-id^='true_'], #main [data-id^='false_']"
    )
  );

  // Fallback to div[role='row'] if specific classes aren't matched
  if (candidateNodes.length === 0) {
    candidateNodes = Array.from(document.querySelectorAll("#main div[role='row']"));
  }

  // Filter out any nested children if their parent is already in the list
  const distinctNodes = candidateNodes.filter((node, idx, arr) => {
    return !arr.some((other, oIdx) => oIdx !== idx && other.contains(node));
  });

  for (const node of distinctNodes) {
    const dataId = (node.getAttribute("data-id") || "").trim();

    // 2. Comprehensive Outbound (Sent by Executive/You) Detection:
    const isOut =
      (dataId && dataId.startsWith("true_")) ||
      node.classList.contains("message-out") ||
      Boolean(node.closest(".message-out, [class*='message-out']")) ||
      Boolean(node.querySelector(".message-out, [class*='message-out']")) ||
      Boolean(
        node.querySelector(
          "[data-icon='msg-check'], [data-icon='msg-dblcheck'], [data-icon='msg-dblcheck-ack'], [data-icon='msg-time'], [data-testid*='check'], [data-icon*='check'], span[data-icon*='check'], span[aria-label*='Sent'], span[aria-label*='Delivered'], span[aria-label*='Read'], span[aria-label*='Pending']"
        )
      ) ||
      node.querySelector("span[data-testid='tail-out'], [data-icon='tail-out']") !== null;

    // 3. Clone node to safely remove Quoted messages, timestamps & status icons before reading text
    const clone = node.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll(
        "[data-testid='quoted-message'], [aria-label*='Quoted message'], [class*='quoted-mention'], div[role='button']:has(span._ao3e), span[data-icon*='check'], span._ao3e[data-icon]"
      )
      .forEach((el) => el.remove());

    // 4. Text extraction from cleaned clone
    let text = "";
    const textSelectors = [
      ".selectable-text",
      ".copyable-text",
      "span._ao3e",
      "span[dir='ltr']",
      "span[dir='auto']",
      "p",
    ];

    for (const sel of textSelectors) {
      const el = clone.querySelector(sel);
      if (el && el.textContent && el.textContent.trim()) {
        const val = el.textContent.trim();
        if (!val.match(/^\d{1,2}:\d{2}\s*(am|pm)?$/i) && val !== "Forwarded" && val !== "Today") {
          text = val;
          break;
        }
      }
    }

    if (!text) {
      const raw = ((clone as HTMLElement).innerText || clone.textContent || "").trim();
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(
          (l) =>
            l &&
            !l.match(/^\d{1,2}:\d{2}\s*(am|pm)?$/i) &&
            l !== "Forwarded" &&
            l !== "Today" &&
            !l.includes("Messages and calls are end-to-end encrypted")
        );
      if (lines.length > 0) {
        text = lines.join(" ");
      }
    }

    // Skip encrypted system notification
    if (text.includes("Messages and calls are end-to-end encrypted") || text === "Forwarded") {
      continue;
    }

    // 5. Photos / Images
    let mediaType: string | undefined;
    let mediaUrl: string | undefined;
    const imgEl = node.querySelector("img[src]") as HTMLImageElement;
    if (
      imgEl &&
      imgEl.src &&
      !imgEl.src.includes("avatar") &&
      !imgEl.src.includes("emoji") &&
      !imgEl.src.startsWith("data:image/svg")
    ) {
      mediaType = "image";
      mediaUrl = imgEl.src;
      if (!text || text.includes("Bank Account")) {
        text = text || "📷 [Photo / Image attachment]";
      }
    }

    // 6. Audio / Voice Notes
    const isAudio = node.querySelector(
      "[data-testid='audio-play'], [data-testid='audio-player'], [data-icon='audio-play'], [data-icon='ptt-play'], audio, button[aria-label*='Play'], button[aria-label*='play']"
    );
    if (isAudio) {
      mediaType = "audio";
      if (!text) text = "🎤 [Voice Message / Audio Note]";
    }

    // 7. Documents / PDFs
    const docSpan = node.querySelector(
      "span[title*='.pdf'], span[title*='.doc'], span[title*='.xls'], span[title*='.jpg'], span[title*='.png'], [data-testid='document-thumb']"
    );
    const docTitle = docSpan?.getAttribute("title") || docSpan?.textContent?.trim();
    if (docSpan || (text && text.toLowerCase().includes(".pdf"))) {
      mediaType = "document";
      const name = docTitle || "Document / Quotation PDF";
      if (!text || text === name) {
        text = `📄 [Document: ${name}]`;
      }
    }

    const msgTimestamp = Date.now();
    if (fromDate && msgTimestamp < fromDate) continue;
    if (toDate && msgTimestamp > toDate) continue;

    // 8. Deterministic Deduplication Key
    const cleanKeyText = text.trim().slice(0, 60);
    const key = `${isOut ? "OUT" : "IN"}_${cleanKeyText}_${mediaType || "text"}`;

    if ((text || mediaType) && !seenKeys.has(key)) {
      seenKeys.add(key);

      // Deterministic WhatsApp message ID to ensure ZERO duplicate inserts
      let messageId = dataId;
      if (!messageId || messageId.length < 5) {
        messageId = `wa_${isOut ? "out" : "in"}_${cleanKeyText.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}`;
      }

      messages.push({
        whatsappMessageId: messageId,
        direction: isOut ? "outbound" : "inbound",
        contentText: text,
        mediaType,
        mediaUrl,
        timestamp: msgTimestamp,
      });
    }
  }

  return messages;
}

/**
 * 📥 Manual 1-Click Sync Handler
 */
function triggerManualChatSync(
  customerPhone: string,
  customerName: string,
  fromDate?: number,
  toDate?: number
) {
  const cleanPhone = (customerPhone || "").replace(/\D/g, "");

  if (!cleanPhone || cleanPhone.length < 10) {
    alert("Cannot sync: Please enter a valid 10-digit customer mobile number.");
    return;
  }

  const messages = extractMessagesFromDOM(fromDate, toDate);

  const syncBtn = (document.getElementById("sli-btn-manual-sync") ||
    document.getElementById("sli-btn-range-sync")) as HTMLButtonElement;
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.textContent = `Syncing (${messages.length} msgs)...`;
  }

  chrome.runtime.sendMessage(
    {
      action: "SYNC_CUSTOMER_CHAT",
      payload: {
        customerPhone: cleanPhone,
        customerName,
        isGroup: false,
        messages: messages.slice(-50),
      },
    },
    (res: any) => {
      if (syncBtn) {
        syncBtn.disabled = false;
        if (res?.ok) {
          syncBtn.textContent = `✅ Synced (${res.syncedCount || messages.length} msgs)`;
        } else {
          syncBtn.textContent = `❌ Failed: ${res?.error || "Error"}`;
        }
      }
    }
  );
}

// Launch
init();
