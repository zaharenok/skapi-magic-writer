// SKapi Magic Writer — options page

const $jwt = document.getElementById('jwt');
const $slug = document.getElementById('slug');
const $status = document.getElementById('status');
const $save = document.getElementById('save');

chrome.storage.local.get(['jwtToken', 'communitySlug'], (res) => {
  if (res.jwtToken) $jwt.value = res.jwtToken;
  if (res.communitySlug) $slug.value = res.communitySlug;
});

$save.addEventListener('click', () => {
  const jwtToken = $jwt.value.trim();
  const communitySlug = $slug.value.trim();
  if (!jwtToken) {
    setStatus('JWT token is required', 'err');
    return;
  }
  chrome.storage.local.set({ jwtToken, communitySlug }, () => {
    setStatus('✅ Saved — open a Skool community and use the ✨ / 📅 buttons', 'ok');
  });
});

function setStatus(text, cls) {
  $status.textContent = text;
  $status.className = cls || '';
}
