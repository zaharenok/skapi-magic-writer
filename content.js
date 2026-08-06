/**
 * SKapi Magic Writer — content script (experimental, v0.1)
 *
 * Lives entirely inside Skool (no popup). Injects two buttons next to the
 * composer (✨ Magic Post, 📅 Schedule) and a calendar icon in the top bar.
 * Talks to api.skapi.pro for /ai/generate and /scheduled-posts.
 */

const API_BASE = 'https://api.skapi.pro';
const BRAND = '#FF90E8';
const INK = '#0A0A0A';

// ---------------------------------------------------------------------------
function getJwt() {
  // JWT is auto-extracted from the Skool auth_token HttpOnly cookie by the
  // service worker — the user never enters a token.
  return new Promise((resolve) =>
    chrome.runtime.sendMessage({ type: 'GET_JWT' }, (res) => resolve(res?.token || ''))
  );
}
function getSlug() {
  return new Promise((resolve) =>
    chrome.storage.local.get(['communitySlug'], (r) => {
      const stored = r.communitySlug;
      const fromUrl = (location.pathname.split('/').filter(Boolean)[0]) || '';
      resolve(stored || fromUrl);
    })
  );
}

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const jwt = await getJwt();
    if (!jwt) throw new Error('No Skool session found — log in to skool.com and reopen this page.');
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.detail || data.error || `API ${res.status}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// DOM HELPERS
// ---------------------------------------------------------------------------
function el(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild;
}
function findText(text) {
  const lower = text.toLowerCase();
  for (const tag of ['button', 'div', 'span', 'a']) {
    for (const node of document.querySelectorAll(tag)) {
      if (node.children.length === 0 && node.textContent.trim().toLowerCase() === lower) return node;
    }
  }
  return null;
}
function findComposerAnchor() {
  // Stable Skool anchors — "Go Live" appears/disappears, "Write something" is constant
  return findText('Go Live') || findText('Write something');
}
function findHeader() {
  const search = document.querySelector('input[placeholder="Search"]');
  if (search) {
    let node = search;
    for (let i = 0; i < 10 && node; i++) {
      node = node.parentElement;
      if (node && node.querySelectorAll('button').length >= 2 && node.children.length <= 6) return node;
    }
  }
  return document.querySelector('header, [class*="Header"], [class*="TopBar"]');
}
function findEditor() {
  const sels = ['div[contenteditable="true"].tiptap', 'div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"]', 'textarea[name="content"]'];
  for (const s of sels) {
    const e = document.querySelector(s);
    if (e && e.offsetParent) return e;
  }
  return null;
}
function findTitleInput() {
  return document.querySelector('input[placeholder="Title"]');
}
function setInput(input, value) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
async function typeInto(editor, text) {
  const isCE = editor.isContentEditable || editor.getAttribute('contenteditable') === 'true';
  editor.focus();
  await sleep(150);
  if (isCE) {
    for (const ch of text) {
      document.execCommand('insertText', false, ch);
      await sleep(10 + Math.random() * 30);
    }
  } else {
    setInput(editor, text);
  }
  await sleep(200);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------
function injectStyles() {
  if (document.getElementById('skmw-styles')) return;
  const css = `
    .skmw-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:${BRAND};color:${INK};border:2px solid ${INK};border-radius:10px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;font-weight:800;cursor:pointer;margin-left:8px;line-height:1;transition:transform .12s,box-shadow .12s;}
    .skmw-btn:hover{transform:translateY(-1px);box-shadow:0 3px 0 rgba(0,0,0,.12);}
    .skmw-btn:active{transform:translateY(1px);}
    .skmw-cal{display:inline-flex;align-items:center;justify-content:center;position:relative;width:34px;height:34px;margin-left:6px;border-radius:10px;cursor:pointer;font-size:18px;border:2px solid transparent;}
    .skmw-cal:hover{background:rgba(0,0,0,.05);}
    .skmw-cal .b{position:absolute;top:-4px;right:-4px;background:${BRAND};color:${INK};font-size:10px;font-weight:800;min-width:16px;height:16px;padding:0 3px;border-radius:8px;border:1.5px solid ${INK};display:flex;align-items:center;justify-content:center;}
    .skmw-cal .b.zero{display:none;}
    .skmw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;}
    .skmw-modal{background:#fff;color:#0A0A0A;border:2px solid ${INK};border-radius:16px;box-shadow:6px 6px 0 rgba(0,0,0,.15);width:100%;max-width:560px;padding:22px;font-family:ui-sans-serif,system-ui,sans-serif;}
    .skmw-modal h2{margin:0 0 4px;font-size:20px;color:#0A0A0A;}
    .skmw-modal .sub{color:#374151;font-size:13px;margin:0 0 16px;}
    .skmw-modal label{display:block;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px;color:#374151;}
    .skmw-modal textarea,.skmw-modal input[type=text],.skmw-modal input[type=password]{width:100%;padding:10px 12px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;}
    .skmw-modal textarea{min-height:120px;resize:vertical;}
    .skmw-modal input:focus,.skmw-modal textarea:focus{outline:none;border-color:${BRAND};}
    .skmw-row{display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;}
    .skmw-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap;}
    .skmw-btn-ghost{background:#fff;color:${INK};}
    .skmw-btn-pink{background:${BRAND};color:${INK};}
    .skmw-btn-pink:disabled{opacity:.5;cursor:wait;}
    .skmw-err{background:#FEF2F2;border:2px solid #FCA5A5;color:#991B1B;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:12px;display:none;}
    .skmw-res{display:none;margin-top:14px;}
    .skmw-pop{position:fixed;top:62px;right:16px;width:340px;max-height:70vh;overflow:auto;background:#fff;border:2px solid ${INK};border-radius:14px;box-shadow:6px 6px 0 rgba(0,0,0,.12);z-index:2147482999;font-family:ui-sans-serif,system-ui,sans-serif;}
    .skmw-pop-h{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1.5px solid #f3f4f6;position:sticky;top:0;background:#fff;}
    .skmw-pop-h h3{margin:0;font-size:15px;}
    .skmw-pop-x{background:none;border:none;font-size:18px;cursor:pointer;color:#6b7280;}
    .skmw-tabs{display:flex;gap:4px;padding:8px 10px 0;}
    .skmw-tab{flex:1;padding:7px;border:1.5px solid #e5e7eb;background:#fff;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;text-align:center;}
    .skmw-tab.active{background:${BRAND};border-color:${INK};}
    .skmw-item{padding:10px 14px;border-bottom:1px solid #f3f4f6;cursor:pointer;}
    .skmw-item:hover{background:#fafafa;}
    .skmw-item .t{font-size:11px;color:#6b7280;font-weight:600;}
    .skmw-item .c{font-size:13px;margin-top:3px;color:#111827;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .skmw-pill{display:inline-block;font-size:10px;font-weight:800;padding:1px 6px;border-radius:6px;text-transform:uppercase;}
    .skmw-pending{background:#FEF3C7;color:#92400E;}
    .skmw-published{background:#DCFCE7;color:#166534;}
    .skmw-failed{background:#FEE2E2;color:#991B1B;}
    .skmw-empty{padding:30px 14px;text-align:center;color:#9ca3af;font-size:13px;}
    .skmw-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${INK};color:#fff;padding:12px 22px;border-radius:12px;border:2px solid ${INK};font-weight:700;font-size:14px;z-index:2147483010;box-shadow:0 4px 0 rgba(0,0,0,.15);font-family:ui-sans-serif,system-ui,sans-serif;}
    /* Compact Schedule button that fits inside Skool's composer button row */
    .skmw-s-inline{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;background:#fff;color:#374151;border:1.5px solid #d1d5db;border-radius:8px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;font-weight:700;cursor:pointer;margin:0 6px;line-height:1;transition:background .12s,border-color .12s;}
    .skmw-s-inline:hover{background:#f9fafb;border-color:#9ca3af;}
    /* Schedule dialog: preview, presets, calendar, time, upcoming list */
    .skmw-preview{background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-size:13px;color:#374151;max-height:90px;overflow:auto;white-space:pre-wrap;line-height:1.4;}
    .skmw-preview .skmw-preview-empty{color:#9ca3af;font-style:italic;}
    .skmw-presets{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
    .skmw-preset{padding:6px 10px;background:#fff;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#374151;}
    .skmw-preset:hover{border-color:${BRAND};color:${INK};}
    .skmw-preset.active{background:${BRAND};border-color:${INK};color:${INK};}
    .skmw-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-top:8px;}
    .skmw-cal-dow{text-align:center;font-size:10px;font-weight:700;color:#9ca3af;padding:2px 0;}
    .skmw-cal-day{text-align:center;font-size:12px;padding:6px 0;border-radius:7px;cursor:pointer;color:#374151;border:1.5px solid transparent;}
    .skmw-cal-day:hover{background:#f3f4f6;}
    .skmw-cal-day.muted{color:#d1d5db;cursor:default;}
    .skmw-cal-day.muted:hover{background:transparent;}
    .skmw-cal-day.today{font-weight:800;}
    .skmw-cal-day.past{color:#e5e7eb;cursor:not-allowed;}
    .skmw-cal-day.past:hover{background:transparent;}
    .skmw-cal-day.selected{background:${BRAND};color:${INK};font-weight:800;border-color:${INK};}
    .skmw-time-row{display:flex;align-items:center;gap:8px;margin-top:10px;}
    .skmw-time-row select{padding:7px 8px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;background:#fff;}
    .skmw-when{font-size:13px;font-weight:700;color:#374151;margin-top:14px;padding:8px 10px;background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:8px;}
    .skmw-up{margin-top:16px;border-top:1.5px solid #f3f4f6;padding-top:10px;}
    .skmw-up h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;}
    .skmw-up-item{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;cursor:pointer;font-size:12px;}
    .skmw-up-item:hover{background:#f9fafb;}
    .skmw-up-item .t{font-weight:700;color:#374151;min-width:96px;}
    .skmw-up-item .c{color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
    .skmw-gif{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:#374151;cursor:pointer;}
    .skmw-gif input{width:16px;height:16px;}
  `;
  const style = el(`<style id="skmw-styles">${css}</style>`);
  document.head.appendChild(style);
}
function injectButtons() {
  const anchor = findComposerAnchor();
  if (!anchor) return;
  if (!document.querySelector('.skmw-magic') && !anchor.parentNode.querySelector('.skmw-magic')) {
    const magic = el(`<button class="skmw-btn skmw-magic">✨ Magic Post</button>`);
    magic.addEventListener('click', (e) => { e.stopPropagation(); openMagicDialog(); });
    anchor.parentNode.insertBefore(magic, anchor.nextSibling);
  }
}
// Schedule lives inside the OPEN composer, next to Cancel/Post.
// The user writes the post, then decides: Post now or Schedule.
function injectScheduleInComposer() {
  // Find the Post button of an open composer (Cancel is always next to it)
  const postBtn = [...document.querySelectorAll('button')].find(
    (b) => b.textContent.trim().toLowerCase() === 'post' && b.offsetParent !== null
  );
  if (!postBtn) return;
  const row = postBtn.parentNode;
  if (row.querySelector('.skmw-schedule-compose')) return; // already injected

  const btn = el(`<button class="skmw-s-inline skmw-schedule-compose" type="button">📅 Schedule</button>`);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Prefill the schedule dialog from whatever the user just wrote
    const editor = findEditor();
    const titleInput = findTitleInput();
    const body = editor ? editor.textContent.trim() : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const fullText = (title ? title + '\n\n' : '') + body;
    openScheduleDialog(null, fullText);
  });
  // Insert right before Post: Cancel | 📅 Schedule | Post
  row.insertBefore(btn, postBtn);
}
function injectCalendarIcon() {
  const header = findHeader();
  if (!header || header.querySelector('.skmw-cal')) return;
  const icon = el(`<div class="skmw-cal" title="Scheduled posts">📅<span class="b zero">0</span></div>`);
  icon.addEventListener('click', (e) => { e.stopPropagation(); toggleCalendar(); });
  header.appendChild(icon);
}

// ---------------------------------------------------------------------------
// MAGIC POST DIALOG
// ---------------------------------------------------------------------------
let dialogOpen = false;
async function openMagicDialog() {
  if (dialogOpen) return;
  dialogOpen = true;
  const slug = await getSlug();

  const overlay = el(`<div class="skmw-overlay"></div>`);
  const modal = el(`<div class="skmw-modal">
    <h2>✨ Magic Post Writer</h2>
    <p class="sub">Paste raw thoughts — AI turns them into a post ready to drop into Skool.</p>
    <label>Your thoughts</label>
    <textarea id="skmw-in" placeholder="Bullet points, links, rough ideas..."></textarea>
    <div class="skmw-row" style="margin-top:10px;">
      <input type="checkbox" id="skmw-title" checked style="width:16px;height:16px;">
      <label for="skmw-title" style="margin:0;text-transform:none;letter-spacing:0;font-weight:600;">Generate a catchy title (first line)</label>
    </div>
    <div class="skmw-actions">
      <button class="skmw-btn skmw-btn-ghost" id="skmw-cancel">Cancel</button>
      <button class="skmw-btn skmw-btn-pink" id="skmw-go">✨ Generate</button>
    </div>
    <div class="skmw-err" id="skmw-err"></div>
    <div class="skmw-res" id="skmw-res">
      <label>Generated post</label>
      <textarea id="skmw-out" style="min-height:160px;"></textarea>
      <div class="skmw-actions">
        <button class="skmw-btn skmw-btn-ghost" id="skmw-regen">🔄 Regenerate</button>
        <button class="skmw-btn skmw-btn-pink" id="skmw-insert">📋 Insert into composer</button>
      </div>
    </div>
  </div>`);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('skmw-in').focus(), 60);

  const close = () => { overlay.remove(); dialogOpen = false; };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('skmw-cancel').addEventListener('click', close);

  const run = async () => {
    const input = document.getElementById('skmw-in').value.trim();
    const wantTitle = document.getElementById('skmw-title').checked;
    if (!input) { showErr('Write something first.'); return; }
    const prompt = wantTitle
      ? `Write a community post with a catchy short title (2-6 words) at the top, then the post content. Plain text only, no markdown. Here are the thoughts:\n\n${input}`
      : `Write a community post. Plain text only, no markdown. Here are the thoughts:\n\n${input}`;
    const goBtn = document.getElementById('skmw-go');
    goBtn.disabled = true; goBtn.textContent = '⏳ Generating...';
    hideErr();
    try {
      const data = await apiRequest('/ai/generate', { method: 'POST', body: { prompt }, auth: false });
      if (!data.success || !data.text) throw new Error(data.error || 'No text returned');
      document.getElementById('skmw-out').value = data.text;
      document.getElementById('skmw-res').style.display = 'block';
    } catch (e) {
      showErr(e.message);
    } finally {
      goBtn.disabled = false; goBtn.textContent = '✨ Generate';
    }
  };
  document.getElementById('skmw-go').addEventListener('click', run);
  document.getElementById('skmw-regen').addEventListener('click', run);
  document.getElementById('skmw-insert').addEventListener('click', async () => {
    const text = document.getElementById('skmw-out').value.trim();
    if (!text) return;
    close();
    await insertIntoComposer(text);
    toast('✅ Inserted into the Skool composer');
  });

  function showErr(m) { const e = document.getElementById('skmw-err'); e.textContent = m; e.style.display = 'block'; }
  function hideErr() { document.getElementById('skmw-err').style.display = 'none'; }
}

// Insert a generated post (title = first line, body = rest) into Skool's composer
async function insertIntoComposer(text) {
  // Make sure the composer is open
  if (!findEditor()) {
    const trigger = findText('Write something');
    if (trigger) { trigger.click(); await sleep(1500); }
  }
  const editor = findEditor();
  if (!editor) { toast('❌ Could not open the composer'); return; }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const hasTitle = lines.length > 1;
  const title = hasTitle ? lines[0] : '';
  const body = hasTitle ? lines.slice(1).join('\n\n') : text;

  if (title) {
    const titleInput = findTitleInput();
    if (titleInput) { setInput(titleInput, title); await sleep(200); }
  }
  await typeInto(editor, body);
}

// ---------------------------------------------------------------------------
// SCHEDULE DIALOG
// ---------------------------------------------------------------------------
async function openScheduleDialog(post = null, prefillText = null) {
  if (dialogOpen) return;
  dialogOpen = true;
  const slug = await getSlug();
  const isEdit = !!post;

  // Content: edit = editable textarea; new = read-only preview from the composer
  let content = '';
  if (isEdit) content = post.content || '';
  else if (prefillText) content = prefillText;
  else { const ed = findEditor(); content = ed ? ed.textContent.trim() : ''; }

  let chosen = post ? new Date(post.scheduled_for) : defaultScheduleTime();
  if (isNaN(chosen.getTime())) chosen = defaultScheduleTime();
  let gifOn = !!(isEdit ? post.gif_search : false);

  const previewHtml = content
    ? escapeHtml(content.slice(0, 280)) + (content.length > 280 ? '…' : '')
    : '<span class="skmw-preview-empty">Nothing in the composer yet — write your post first.</span>';

  const overlay = el(`<div class="skmw-overlay"></div>`);
  const modal = el(`<div class="skmw-modal">
    <h2>${isEdit ? '✏️ Edit scheduled post' : '📅 Schedule post'}</h2>
    <p class="sub">${isEdit ? 'Update the post or its publish time.' : 'Publishes automatically at the chosen time — as you, in this community.'}</p>
    ${isEdit
      ? `<label>Post content</label><textarea id="skmw-s-content" placeholder="Write your post...">${escapeHtml(content)}</textarea>`
      : `<label>Posting</label><div class="skmw-preview" id="skmw-s-preview">${previewHtml}</div>`}
    <label class="skmw-gif"><input type="checkbox" id="skmw-s-gif" ${gifOn ? 'checked' : ''}>🎬 Attach a relevant GIF</label>
    <label style="margin-top:14px;">Publish at</label>
    <div class="skmw-presets" id="skmw-s-presets"></div>
    <div class="skmw-cal-grid" id="skmw-s-cal"></div>
    <div class="skmw-time-row">
      <span style="font-size:12px;color:#6b7280;">Time</span>
      <select id="skmw-s-hour"></select><span>:</span><select id="skmw-s-min"></select>
    </div>
    <div class="skmw-when" id="skmw-s-when"></div>
    ${!isEdit ? '<div class="skmw-up" id="skmw-s-up"></div>' : ''}
    <div class="skmw-actions">
      <button class="skmw-btn skmw-btn-ghost" id="skmw-s-cancel">Cancel</button>
      ${isEdit ? '<button class="skmw-btn skmw-btn-ghost" id="skmw-s-delete" style="margin-right:auto;border-color:#dc2626;color:#dc2626;">🗑 Delete</button>' : ''}
      <button class="skmw-btn skmw-btn-pink" id="skmw-s-save">${isEdit ? 'Update' : '📅 Schedule'}</button>
    </div>
    <div class="skmw-err" id="skmw-s-err"></div>
  </div>`);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  if (isEdit) setTimeout(() => document.getElementById('skmw-s-content')?.focus(), 60);

  const close = () => { overlay.remove(); dialogOpen = false; };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('skmw-s-cancel').addEventListener('click', close);

  // ---- time controls ----
  const $hour = document.getElementById('skmw-s-hour');
  const $min = document.getElementById('skmw-s-min');
  for (let h = 0; h < 24; h++) $hour.appendChild(new Option(String(h).padStart(2, '0'), h));
  for (const m of [0, 15, 30, 45]) $min.appendChild(new Option(String(m).padStart(2, '0'), m));
  $hour.value = chosen.getHours();
  $min.value = [0, 15, 30, 45].reduce((best, m) => Math.abs(m - chosen.getMinutes()) < Math.abs(best - chosen.getMinutes()) ? m : best, 0);
  const applyTime = () => { chosen.setHours(parseInt($hour.value), parseInt($min.value), 0, 0); renderWhen(); };
  $hour.addEventListener('change', applyTime);
  $min.addEventListener('change', applyTime);

  // ---- presets ----
  const presets = [
    { label: '⚡ In 1 hour', at: () => new Date(Date.now() + 3600 * 1000) },
    { label: '🌅 Today 18:00', at: () => atToday(18, 0) },
    { label: '☀️ Tomorrow 9:00', at: () => atDayOffset(1, 9, 0) },
    { label: '📆 Tomorrow 12:00', at: () => atDayOffset(1, 12, 0) },
    { label: '🌙 Tomorrow 18:00', at: () => atDayOffset(1, 18, 0) },
    { label: '➕ In 1 week', at: () => new Date(Date.now() + 7 * 24 * 3600 * 1000) },
  ];
  const $presets = document.getElementById('skmw-s-presets');
  presets.forEach((p) => {
    const b = el(`<button class="skmw-preset" type="button">${p.label}</button>`);
    b.addEventListener('click', () => { chosen = p.at(); $hour.value = chosen.getHours(); $min.value = nearestMin(chosen.getMinutes()); renderCalendar(); renderWhen(); });
    $presets.appendChild(b);
  });

  // ---- calendar ----
  function renderCalendar() { renderMiniCalendar(document.getElementById('skmw-s-cal'), chosen, (d) => { chosen = d; chosen.setHours(parseInt($hour.value), parseInt($min.value), 0, 0); renderCalendar(); renderWhen(); }); }
  function renderWhen() {
    document.getElementById('skmw-s-when').textContent =
      '⏰ ' + chosen.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  renderCalendar();
  renderWhen();

  // ---- upcoming list (only for new posts) ----
  if (!isEdit) renderUpcoming(document.getElementById('skmw-s-up'), close);

  // ---- save ----
  document.getElementById('skmw-s-save').addEventListener('click', async () => {
    const finalContent = isEdit ? document.getElementById('skmw-s-content').value.trim() : content.trim();
    if (!finalContent) return showErr('Post content is empty.');
    if (chosen.getTime() < Date.now()) return showErr('Pick a time in the future.');
    gifOn = document.getElementById('skmw-s-gif').checked;
    const btn = document.getElementById('skmw-s-save');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
    hideErr();
    try {
      const body = {
        content: finalContent,
        scheduled_for: chosen.toISOString(),
        community_slug: slug,
        community_url: location.href,
        gif_search: gifOn ? gifTermFrom(finalContent) : null,
      };
      if (isEdit && post?.id) await apiRequest('/scheduled-posts', { method: 'PUT', body: { ...body, id: post.id } });
      else await apiRequest('/scheduled-posts', { method: 'POST', body });
      close();
      toast(isEdit ? '✅ Post updated' : '✅ Post scheduled');
      refreshCalendar();
    } catch (e) {
      showErr(e.message);
      btn.disabled = false; btn.textContent = isEdit ? 'Update' : '📅 Schedule';
    }
  });
  if (isEdit) {
    document.getElementById('skmw-s-delete').addEventListener('click', async () => {
      if (!confirm('Delete this scheduled post?')) return;
      try { await apiRequest('/scheduled-posts', { method: 'DELETE', body: { id: post.id } }); close(); toast('🗑 Deleted'); refreshCalendar(); }
      catch (e) { showErr(e.message); }
    });
  }
  function showErr(m) { const e = document.getElementById('skmw-s-err'); e.textContent = m; e.style.display = 'block'; }
  function hideErr() { document.getElementById('skmw-s-err').style.display = 'none'; }
}

// ---- schedule dialog helpers ----
function defaultScheduleTime() { const d = new Date(Date.now() + 2 * 3600 * 1000); d.setMinutes(0, 0, 0); return d; }
function atToday(h, m) { const d = new Date(); d.setHours(h, m, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d; }
function atDayOffset(days, h, m) { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; }
function nearestMin(m) { return [0, 15, 30, 45].reduce((b, x) => Math.abs(x - m) < Math.abs(b - m) ? x : b, 0); }
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function gifTermFrom(text) {
  const stop = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'what', 'when', 'post', 'about', 'more', 'some', 'into', 'just', 'also', 'like', 'than', 'then', 'them', 'they', 'will', 'your', 'very', 'the', 'and', 'for', 'are', 'you', 'how', 'why']);
  const words = (text || '').toLowerCase().match(/[a-z]{4,}/g) || [];
  return words.find((w) => !stop.has(w)) || 'success';
}
function renderMiniCalendar(container, selected, onSelect) {
  if (!container) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const view = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const firstDow = (view.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  let html = '<div class="skmw-cal-dow">Mo</div><div class="skmw-cal-dow">Tu</div><div class="skmw-cal-dow">We</div><div class="skmw-cal-dow">Th</div><div class="skmw-cal-dow">Fr</div><div class="skmw-cal-dow">Sa</div><div class="skmw-cal-dow">Su</div>';
  for (let i = 0; i < firstDow; i++) html += '<div class="skmw-cal-day muted"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(view.getFullYear(), view.getMonth(), d);
    const past = date < today;
    const isToday = date.getTime() === today.getTime();
    const isSel = date.getFullYear() === selected.getFullYear() && date.getMonth() === selected.getMonth() && date.getDate() === selected.getDate();
    const cls = 'skmw-cal-day' + (past ? ' past' : '') + (isToday ? ' today' : '') + (isSel ? ' selected' : '');
    html += `<div class="${cls}" data-d="${d}">${d}</div>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('.skmw-cal-day:not(.muted):not(.past)').forEach((node) => {
    node.addEventListener('click', () => {
      const d = parseInt(node.dataset.d);
      const picked = new Date(view.getFullYear(), view.getMonth(), d, selected.getHours(), selected.getMinutes());
      onSelect(picked);
    });
  });
}
function renderUpcoming(container, closeDialog) {
  if (!container) return;
  container.innerHTML = '<h4>Your scheduled posts</h4>';
  const pending = calState.posts.filter((p) => (p.status || 'pending') === 'pending').sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for));
  if (!pending.length) { container.innerHTML += '<div style="font-size:12px;color:#9ca3af;padding:4px 8px;">None yet.</div>'; return; }
  pending.slice(0, 6).forEach((p) => {
    const d = new Date(p.scheduled_for);
    const item = el(`<div class="skmw-up-item"><span class="t">${d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span class="c">${escapeHtml((p.content || '').slice(0, 60))}</span></div>`);
    item.addEventListener('click', () => { closeDialog(); setTimeout(() => openScheduleDialog(p), 50); });
    container.appendChild(item);
  });
}

// ---------------------------------------------------------------------------
// CALENDAR POPOVER (MVP: list with tabs)
// ---------------------------------------------------------------------------
let calState = { posts: [], tab: 'upcoming' };
async function loadScheduled() {
  try {
    const data = await apiRequest('/scheduled-posts');
    calState.posts = (data.result || data.posts || []).filter(Boolean);
  } catch (e) {
    calState.posts = [];
    console.warn('[skmw] load scheduled failed:', e.message);
  }
  updateBadge();
}
function updateBadge() {
  const badge = document.querySelector('.skmw-cal .b');
  if (!badge) return;
  const n = calState.posts.filter((p) => (p.status || 'pending') === 'pending').length;
  badge.textContent = n > 99 ? '99+' : n;
  badge.classList.toggle('zero', n === 0);
}
function toggleCalendar() {
  const existing = document.querySelector('.skmw-pop');
  if (existing) { existing.remove(); return; }
  renderCalendar();
}
function refreshCalendar() {
  loadScheduled().then(() => {
    if (document.querySelector('.skmw-pop')) renderCalendar();
  });
}
function renderCalendar() {
  document.querySelector('.skmw-pop')?.remove();
  const pop = el(`<div class="skmw-pop">
    <div class="skmw-pop-h"><h3>📅 Scheduled posts</h3><button class="skmw-pop-x">✕</button></div>
    <div class="skmw-tabs">
      <div class="skmw-tab" data-tab="upcoming">Upcoming</div>
      <div class="skmw-tab" data-tab="published">Sent</div>
      <div class="skmw-tab" data-tab="failed">Failed</div>
    </div>
    <div id="skmw-list"></div>
  </div>`);
  document.body.appendChild(pop);
  pop.querySelector('.skmw-pop-x').addEventListener('click', () => pop.remove());
  pop.querySelectorAll('.skmw-tab').forEach((t) => t.addEventListener('click', () => {
    calState.tab = t.dataset.tab; renderCalendar();
  }));
  pop.querySelector(`.skmw-tab[data-tab="${calState.tab}"]`)?.classList.add('active');
  renderList();
}
function renderList() {
  const list = document.getElementById('skmw-list');
  if (!list) return;
  const now = Date.now();
  const byTab = (p) => {
    const st = p.status || 'pending';
    if (calState.tab === 'published') return st === 'published';
    if (calState.tab === 'failed') return st === 'failed';
    return st === 'pending';
  };
  const items = calState.posts.filter(byTab).sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for));
  if (!items.length) {
    list.innerHTML = `<div class="skmw-empty">Nothing here yet.<br>Click 📅 Schedule next to the composer.</div>`;
    return;
  }
  list.innerHTML = items.map((p) => {
    const d = new Date(p.scheduled_for);
    const st = p.status || 'pending';
    const cls = st === 'published' ? 'skmw-published' : st === 'failed' ? 'skmw-failed' : (d.getTime() < now ? 'skmw-failed' : 'skmw-pending');
    const label = st === 'published' ? 'Sent' : st === 'failed' ? 'Failed' : (d.getTime() < now ? 'Overdue' : 'Pending');
    return `<div class="skmw-item" data-id="${p.id}">
      <div class="t">${d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} <span class="skmw-pill ${cls}">${label}</span></div>
      <div class="c">${(p.content || '').slice(0, 160) || '(empty)'}</div>
    </div>`;
  }).join('');

  list.querySelectorAll('.skmw-item').forEach((node) => {
    node.addEventListener('click', () => {
      const post = calState.posts.find((p) => String(p.id) === node.dataset.id);
      if (post && (post.status || 'pending') === 'pending') {
        document.querySelector('.skmw-pop')?.remove();
        openScheduleDialog(post);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// INIT + OBSERVER
// ---------------------------------------------------------------------------
function observe() {
  const obs = new MutationObserver(() => { injectButtons(); injectScheduleInComposer(); injectCalendarIcon(); });
  obs.observe(document.body, { childList: true, subtree: true });
}
async function init() {
  injectStyles();
  observe();
  setTimeout(() => { injectButtons(); injectScheduleInComposer(); injectCalendarIcon(); }, 1500);
  await loadScheduled();
  setInterval(loadScheduled, 120000);
  console.log('✨ [SKapi Magic Writer] loaded');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
