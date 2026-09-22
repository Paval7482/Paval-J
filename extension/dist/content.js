"use strict";
(() => {
  // extension/src/firewall.ts
  function evaluateChatEligibility(chatId, rawPhone, context) {
    const cleanPhone = (rawPhone || "").replace(/\D/g, "");
    if (chatId.includes("@g.us") || chatId.includes("-") || !cleanPhone) {
      return {
        eligibility: "BLOCKED_GROUP",
        isAllowedToSync: false,
        reason: "\u{1F6AB} WhatsApp Group chats are strictly blocked from CRM sync."
      };
    }
    if (cleanPhone === context.officialBusinessNumber.replace(/\D/g, "")) {
      return {
        eligibility: "BLOCKED_OFFICIAL_NUMBER",
        isAllowedToSync: false,
        reason: "\u{1F6E1}\uFE0F Official Meta Cloud API number is protected and managed via Central Webhooks."
      };
    }
    if (context.staffPhones.has(cleanPhone)) {
      return {
        eligibility: "BLOCKED_STAFF",
        isAllowedToSync: false,
        reason: "\u{1F464} Internal company staff/colleague chat - automatically excluded from CRM sync."
      };
    }
    if (context.personalBlacklist.has(cleanPhone)) {
      return {
        eligibility: "BLOCKED_PERSONAL",
        isAllowedToSync: false,
        reason: "\u{1F512} Contact marked as Personal/Private by executive - excluded from CRM."
      };
    }
    const matchedCustomer = context.customerPhoneMap[cleanPhone];
    if (matchedCustomer) {
      return {
        eligibility: "ELIGIBLE_CUSTOMER",
        isAllowedToSync: true,
        reason: `\u{1F7E2} Existing CRM Customer: ${matchedCustomer.name}`,
        customerName: matchedCustomer.name,
        contactId: matchedCustomer.contactId
      };
    }
    return {
      eligibility: "QUARANTINED_UNKNOWN",
      isAllowedToSync: false,
      reason: "\u{1F7E1} Unknown number. Quarantined - click [+ Add as Lead] to promote to CRM before syncing."
    };
  }

  // extension/src/content.ts
  var firewallContext = {
    staffPhones: /* @__PURE__ */ new Set(),
    customerPhoneMap: {},
    personalBlacklist: /* @__PURE__ */ new Set(),
    officialBusinessNumber: "919944775513"
  };
  var currentDecision = null;
  var currentChatPhone = "";
  var currentChatId = "";
  async function init() {
    console.info("[SLI CRM] Content script initialized on web.whatsapp.com");
    const localData = await chrome.storage.local.get([
      "staffPhones",
      "customerPhoneMap",
      "personalBlacklist",
      "executiveUser"
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
  function createSidebarWidget() {
    if (document.getElementById("sli-crm-assistant-sidebar")) return;
    const sidebar = document.createElement("div");
    sidebar.id = "sli-crm-assistant-sidebar";
    sidebar.innerHTML = `
    <div class="sli-sidebar-header">
      <div class="sli-sidebar-title">\u{1F3E2} SLI CRM Assistant</div>
      <button id="sli-btn-toggle" style="background:none;border:none;color:white;cursor:pointer;">\u2715</button>
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
  function startChatHeaderObserver() {
    setInterval(() => {
      const headerTitleEl = document.querySelector("#main header span[dir='auto']");
      if (!headerTitleEl) return;
      const titleText = headerTitleEl.textContent || "";
      const phoneMatch = titleText.replace(/\D/g, "");
      const mainEl = document.querySelector("#main");
      const isGroup = document.querySelector("#main header")?.textContent?.includes("group") || false;
      const chatId = isGroup ? "group@g.us" : `${phoneMatch}@c.us`;
      if (chatId !== currentChatId || phoneMatch !== currentChatPhone) {
        currentChatId = chatId;
        currentChatPhone = phoneMatch;
        handleActiveChatChanged(chatId, phoneMatch, titleText);
      }
    }, 1e3);
  }
  function handleActiveChatChanged(chatId, phone, titleText) {
    currentDecision = evaluateChatEligibility(chatId, phone, firewallContext);
    renderSidebarContent(currentDecision, titleText, phone);
  }
  function renderSidebarContent(decision, titleText, phone) {
    const container = document.getElementById("sli-sidebar-content");
    if (!container) return;
    if (decision.eligibility === "BLOCKED_GROUP") {
      container.innerHTML = `
      <span class="sli-badge sli-badge-blocked">\u{1F6AB} GROUP CHAT</span>
      <p><strong>${titleText}</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button class="sli-btn-sync" disabled>Sync Blocked (Group)</button>
    `;
      return;
    }
    if (decision.eligibility === "BLOCKED_STAFF") {
      container.innerHTML = `
      <span class="sli-badge sli-badge-blocked">\u{1F464} STAFF / COLLEAGUE</span>
      <p><strong>${titleText} (+${phone})</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button class="sli-btn-sync" disabled>Sync Blocked (Company Staff)</button>
    `;
      return;
    }
    if (decision.eligibility === "BLOCKED_PERSONAL") {
      container.innerHTML = `
      <span class="sli-badge sli-badge-blocked">\u{1F512} PERSONAL CONTACT</span>
      <p><strong>${titleText} (+${phone})</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button id="sli-btn-unblock" class="sli-btn-blacklist">Remove from Personal Blacklist</button>
    `;
      document.getElementById("sli-btn-unblock")?.addEventListener("click", async () => {
        firewallContext.personalBlacklist.delete(phone);
        await chrome.storage.local.set({
          personalBlacklist: Array.from(firewallContext.personalBlacklist)
        });
        handleActiveChatChanged(currentChatId, phone, titleText);
      });
      return;
    }
    if (decision.eligibility === "QUARANTINED_UNKNOWN") {
      container.innerHTML = `
      <span class="sli-badge sli-badge-quarantine">\u{1F7E1} QUARANTINED (UNKNOWN)</span>
      <p><strong>${titleText} (+${phone})</strong></p>
      <p style="color:#64748b;margin-top:6px;">${decision.reason}</p>
      <button id="sli-btn-promote" class="sli-btn-quarantine">\u2795 Add as CRM Lead & Enable Sync</button>
      <button id="sli-btn-block-personal" class="sli-btn-blacklist">Mark as Personal (Never Sync)</button>
    `;
      document.getElementById("sli-btn-promote")?.addEventListener("click", () => {
        firewallContext.customerPhoneMap[phone] = {
          contactId: `temp-${Date.now()}`,
          name: titleText || `Customer +${phone}`
        };
        handleActiveChatChanged(currentChatId, phone, titleText);
      });
      document.getElementById("sli-btn-block-personal")?.addEventListener("click", async () => {
        firewallContext.personalBlacklist.add(phone);
        await chrome.storage.local.set({
          personalBlacklist: Array.from(firewallContext.personalBlacklist)
        });
        handleActiveChatChanged(currentChatId, phone, titleText);
      });
      return;
    }
    if (decision.eligibility === "ELIGIBLE_CUSTOMER") {
      container.innerHTML = `
      <span class="sli-badge sli-badge-eligible">\u{1F7E2} ELIGIBLE CUSTOMER</span>
      <p><strong>${decision.customerName}</strong> (+${phone})</p>
      <p style="color:#15803d;margin-top:4px;">Ready to sync to CRM timeline.</p>
      <button id="sli-btn-manual-sync" class="sli-btn-sync">\u{1F4E5} Sync this Chat to CRM</button>
      <button id="sli-btn-block-personal" class="sli-btn-blacklist">Mark as Personal (Never Sync)</button>
    `;
      document.getElementById("sli-btn-manual-sync")?.addEventListener("click", () => {
        triggerManualChatSync(phone, decision.customerName || titleText);
      });
      document.getElementById("sli-btn-block-personal")?.addEventListener("click", async () => {
        firewallContext.personalBlacklist.add(phone);
        await chrome.storage.local.set({
          personalBlacklist: Array.from(firewallContext.personalBlacklist)
        });
        handleActiveChatChanged(currentChatId, phone, titleText);
      });
    }
  }
  function triggerManualChatSync(customerPhone, customerName) {
    const messageNodes = document.querySelectorAll("#main .message-in, #main .message-out");
    const messages = [];
    messageNodes.forEach((node) => {
      const isOut = node.classList.contains("message-out");
      const textEl = node.querySelector(".selectable-text");
      const text = textEl?.textContent || "";
      if (text) {
        messages.push({
          whatsappMessageId: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          direction: isOut ? "outbound" : "inbound",
          contentText: text,
          timestamp: Date.now()
        });
      }
    });
    const syncBtn = document.getElementById("sli-btn-manual-sync");
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
          messages: messages.slice(-20)
          // Last 20 messages for POC
        }
      },
      (res) => {
        if (syncBtn) {
          syncBtn.disabled = false;
          if (res?.ok) {
            syncBtn.textContent = `\u2705 Synced (${res.syncedCount || 0} msgs)`;
          } else {
            syncBtn.textContent = `\u274C Failed: ${res?.error || "Error"}`;
          }
        }
      }
    );
  }
  init();
})();
