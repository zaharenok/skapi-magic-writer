// Skool Magic Writer — service worker
// The JWT is read automatically from the Skool `auth_token` cookie — the
// user never pastes anything. Also opens the Options page on install so they
// can set a default community slug (optional; auto-detected from URL otherwise).

const SKOOL_DOMAIN = '.skool.com';

const API_BASE = 'https://api.skapi.pro';

// Read the Skool JWT from the auth_token HttpOnly cookie (chrome.cookies can
// see HttpOnly cookies; page scripts and document.cookie cannot).
function readJwt() {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ domain: SKOOL_DOMAIN }, (cookies) => {
      const auth = (cookies || []).find((c) => c.name === 'auth_token');
      resolve(auth ? auth.value : '');
    });
  });
}

// Respond to content-script requests for the JWT
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'GET_JWT') {
    readJwt().then((token) => sendResponse({ token }));
    return true; // async response
  }
  if (msg?.type === 'SKMW_NOTIFY') {
    // Post published — system-level notification so the user sees it even
    // when skool.com is in a background tab. No click handler: MV3 service
    // workers die before onclicked fires reliably; the toast in the tab
    // remains the interactive path.
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: msg.title || 'Skool Magic Writer',
        message: msg.message || '',
        priority: 1,
      });
    } catch (e) { /* notifications unavailable — tab toast still shows */ }
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === 'SKMW_FETCH') {
    // Proxy api.skapi.pro calls: content scripts run in the page context and
    // hit skool.com's CSP (connect-src). The service worker is exempt.
    (async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (msg.auth) {
          const jwt = await readJwt();
          if (!jwt) throw new Error('No Skool session found');
          headers['Authorization'] = `Bearer ${jwt}`;
        }
        const res = await fetch(API_BASE + msg.path, {
          method: msg.method || 'GET',
          headers,
          body: msg.body ? JSON.stringify(msg.body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data });
      } catch (e) {
        sendResponse({ ok: false, status: 0, data: { detail: String(e && e.message || e) } });
      }
    })();
    return true; // async sendResponse
  }
  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
