// Settings page: localized title, button to reopen the post-install setup guide.
const name = chrome.i18n.getMessage('extName');
if (name) {
  document.title = name;
  document.getElementById('appName').textContent = name;
}

document.getElementById('openWelcome').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
});
