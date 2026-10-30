// Welcome (post-install) page: localized title, live Skool-session status, open-skool button.
const SKOOL_URL = 'https://www.skool.com/';

const name = chrome.i18n.getMessage('extName');
if (name) {
  document.title = name;
  document.getElementById('appName').textContent = name;
}

const statusEl = document.getElementById('sessionStatus');
const openBtn = document.getElementById('openSkool');

function checkSession() {
  chrome.cookies.get({ url: SKOOL_URL, name: 'auth_token' }, (cookie) => {
    if (cookie) {
      statusEl.textContent = '✅ Skool session found — you are ready! Open your community and look for the ✨ and 📅 buttons next to the composer.';
      statusEl.classList.add('ok');
    } else {
      statusEl.textContent = '⏳ Skool session not detected yet — open skool.com and log in (steps 1–2). This page updates itself.';
      statusEl.classList.remove('ok');
    }
  });
}
const joinBtn = document.getElementById('joinCommunity');
if (joinBtn) {
  joinBtn.addEventListener('click', () => chrome.tabs.create({ url: 'https://www.skool.com/skoolmagicwriter/about' }));
}

openBtn.addEventListener('click', () => chrome.tabs.create({ url: SKOOL_URL }));

checkSession();
setInterval(checkSession, 2500);
