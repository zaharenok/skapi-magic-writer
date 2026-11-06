// Settings page: localized title, button to reopen the post-install setup guide.
const name = chrome.i18n.getMessage('extName');
if (name) {
  document.title = name;
  document.getElementById('appName').textContent = name;
}

document.getElementById('openWelcome').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
});

document.getElementById('joinCommunity').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.skool.com/skoolmagicwriter/about' });
});

// Usage-analytics opt-out (skmw_analytics_off in chrome.storage.local).
const analyticsOff = document.getElementById('analyticsOff');
if (analyticsOff) {
  chrome.storage.local.get(['skmw_analytics_off'], (r) => {
    analyticsOff.checked = !!(r && r.skmw_analytics_off);
  });
  analyticsOff.addEventListener('change', () => {
    chrome.storage.local.set({ skmw_analytics_off: analyticsOff.checked });
  });
}
