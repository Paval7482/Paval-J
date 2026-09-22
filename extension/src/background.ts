/**
 * 🛡️ SLI CRM Extension Background Service Worker
 */

declare const chrome: any;

const CRM_BASE_URL = "http://localhost:3000"; // Or production origin

chrome.runtime.onInstalled.addListener(() => {
  console.info("[SLI CRM] Background Service Worker Installed.");
  fetchRemoteConfig();
});

// Sync Remote Config every 10 minutes
async function fetchRemoteConfig() {
  try {
    const { executiveUser } = await chrome.storage.local.get(["executiveUser"]);
    const userId = executiveUser?.userId || "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1"; // Default Satheesh for POC

    const res = await fetch(`${CRM_BASE_URL}/api/extension/config?userId=${userId}`);
    const data = await res.json();

    if (data.ok && data.data) {
      await chrome.storage.local.set({
        staffPhones: data.data.staffPhones,
        customerPhoneMap: data.data.customerPhoneMap,
        boundExecutive: data.data.boundExecutive,
      });
      console.info("[SLI CRM] Remote config cached successfully.");
    }
  } catch (err) {
    console.warn("[SLI CRM] Failed to fetch remote config:", err);
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SYNC_CUSTOMER_CHAT") {
    handleSyncRequest(request.payload)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === "REFRESH_CONFIG") {
    fetchRemoteConfig().then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function handleSyncRequest(payload: any) {
  const { boundExecutive } = await chrome.storage.local.get(["boundExecutive"]);

  const syncPayload = {
    ...payload,
    executiveUserId: boundExecutive?.userId || "a09eac1f-b95b-4a8c-8c4f-cc5822b32ea1",
    executiveWhatsAppPhone: boundExecutive?.phone || "919786390479",
  };

  const response = await fetch(`${CRM_BASE_URL}/api/extension/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(syncPayload),
  });

  return await response.json();
}
