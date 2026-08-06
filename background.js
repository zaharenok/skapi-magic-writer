// SKapi Magic Writer — service worker
// The JWT is read automatically from the Skool `auth_token` cookie — the
// user never pastes anything. Also opens the Options page on install so they
// can set a default community slug (optional; auto-detected from URL otherwise).

const SKOOL_DOMAIN = '.skool.com';

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
  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
