"use strict";
(() => {
  // extension/src/background.ts
  var CRM_BASE_URL = "http://localhost:3000";
  chrome.runtime.onInstalled.addListener(() => {
    console.info("[SLI CRM] Background Service Worker Initialized.");
    checkSessionAndRefreshConfig();
  });
  async function checkSessionAndRefreshConfig() {
    try {
      const { passKey, executiveUser } = await chrome.storage.local.get([
        "passKey",
        "executiveUser"
      ]);
      if (passKey) {
        const authRes = await fetch(`${CRM_BASE_URL}/api/extension/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passKey })
        });
        if (authRes.ok) {
          const json = await authRes.json();
          if (json.ok && json.data) {
            await chrome.storage.local.set({
              executiveUser: json.data.executive,
              staffPhones: json.data.staffPhones,
              customerPhoneMap: json.data.customerPhoneMap,
              officialBusinessNumber: json.data.officialBusinessNumber
            });
            console.info("[SLI CRM] Executive session verified & remote config updated:", json.data.executive.name);
            return;
          }
        }
      }
      if (executiveUser?.userId) {
        const res = await fetch(
          `${CRM_BASE_URL}/api/extension/config?userId=${executiveUser.userId}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.data) {
            await chrome.storage.local.set({
              staffPhones: data.data.staffPhones,
              customerPhoneMap: data.data.customerPhoneMap
            });
          }
        }
      }
    } catch (err) {
      console.info("[SLI CRM] Background session check:", err);
    }
  }
  chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      if (request.action === "AUTH_WITH_PASSKEY") {
        authenticateWithPassKey(request.payload?.passKey).then((res) => sendResponse(res)).catch((err) => sendResponse({ ok: false, error: err.message }));
        return true;
      }
      if (request.action === "SYNC_CUSTOMER_CHAT") {
        handleSyncRequest(request.payload).then((res) => sendResponse(res)).catch((err) => sendResponse({ ok: false, error: err.message }));
        return true;
      }
      if (request.action === "REFRESH_CONFIG") {
        checkSessionAndRefreshConfig().then(() => sendResponse({ ok: true }));
        return true;
      }
      if (request.action === "LOGOUT") {
        chrome.storage.local.remove(["passKey", "executiveUser"]).then(() => {
          sendResponse({ ok: true });
        });
        return true;
      }
    }
  );
  async function authenticateWithPassKey(passKey) {
    try {
      const res = await fetch(`${CRM_BASE_URL}/api/extension/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passKey })
      });
      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        await chrome.storage.local.set({
          passKey,
          executiveUser: json.data.executive,
          staffPhones: json.data.staffPhones,
          customerPhoneMap: json.data.customerPhoneMap,
          officialBusinessNumber: json.data.officialBusinessNumber,
          autoSyncEnabled: true
          // Default auto-sync ON
        });
        return { ok: true, data: json.data };
      }
      return { ok: false, error: json.error || "Authentication failed" };
    } catch (err) {
      return { ok: false, error: err.message || "Network request failed" };
    }
  }
  async function handleSyncRequest(payload) {
    try {
      const { executiveUser } = await chrome.storage.local.get(["executiveUser"]);
      const syncPayload = {
        ...payload,
        executiveUserId: executiveUser?.userId || "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1",
        executiveWhatsAppPhone: executiveUser?.phone || "919786390479"
      };
      const response = await fetch(`${CRM_BASE_URL}/api/extension/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncPayload)
      });
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { ok: false, error: text || `HTTP ${response.status}` };
      }
    } catch (err) {
      return { ok: false, error: err.message || "Network request failed" };
    }
  }
})();
