// SKapi Magic Writer — service worker
// On install, open the options page so the user can paste their JWT + slug.

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

// Keep the service worker alive briefly while content script talks to the API
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'PING') {
    sendResponse({ ok: true, ts: Date.now() });
  }
  return true;
});
