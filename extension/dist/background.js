"use strict";
(() => {
  // extension/src/background.ts
  var CRM_BASE_URL = "http://localhost:3000";
  chrome.runtime.onInstalled.addListener(() => {
    console.info("[SLI CRM] Background Service Worker Installed.");
    fetchRemoteConfig();
  });
  async function fetchRemoteConfig() {
    try {
      const { executiveUser } = await chrome.storage.local.get(["executiveUser"]);
      const userId = executiveUser?.userId || "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1";
      const res = await fetch(`${CRM_BASE_URL}/api/extension/config?userId=${userId}`);
      const data = await res.json();
      if (data.ok && data.data) {
        await chrome.storage.local.set({
          staffPhones: data.data.staffPhones,
          customerPhoneMap: data.data.customerPhoneMap,
          boundExecutive: data.data.boundExecutive
        });
        console.info("[SLI CRM] Remote config cached successfully.");
      }
    } catch (err) {
      console.warn("[SLI CRM] Failed to fetch remote config:", err);
    }
  }
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SYNC_CUSTOMER_CHAT") {
      handleSyncRequest(request.payload).then((res) => sendResponse(res)).catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }
    if (request.action === "REFRESH_CONFIG") {
      fetchRemoteConfig().then(() => sendResponse({ ok: true }));
      return true;
    }
  });
  async function handleSyncRequest(payload) {
    const { boundExecutive } = await chrome.storage.local.get(["boundExecutive"]);
    const syncPayload = {
      ...payload,
      executiveUserId: boundExecutive?.userId || "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1",
      executiveWhatsAppPhone: boundExecutive?.phone || "919786390479"
    };
    const response = await fetch(`${CRM_BASE_URL}/api/extension/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(syncPayload)
    });
    return await response.json();
  }
})();
