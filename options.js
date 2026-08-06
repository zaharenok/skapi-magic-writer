// SKapi Magic Writer — options page (slug only; JWT is auto from cookie)

const $slug = document.getElementById('slug');
const $status = document.getElementById('status');
const $save = document.getElementById('save');

chrome.storage.local.get(['communitySlug'], (res) => {
  if (res.communitySlug) $slug.value = res.communitySlug;
});

$save.addEventListener('click', () => {
  const communitySlug = $slug.value.trim();
  chrome.storage.local.set({ communitySlug }, () => {
    $status.textContent = '✅ Saved — open a Skool community and use the ✨ / 📅 buttons';
    $status.className = 'ok';
  });
});
