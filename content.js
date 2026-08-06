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
// CONFIG / STORAGE
// ---------------------------------------------------------------------------
function getJwt() {
  return new Promise((resolve) => chrome.storage.local.get(['jwtToken'], (r) => resolve(r.jwtToken || '')));
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
    if (!jwt) throw new Error('No JWT token — open extension Options and paste your Skool JWT.');
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
    .skmw-modal{background:#fff;border:2px solid ${INK};border-radius:16px;box-shadow:6px 6px 0 rgba(0,0,0,.15);width:100%;max-width:560px;padding:22px;font-family:ui-sans-serif,system-ui,sans-serif;}
    .skmw-modal h2{margin:0 0 4px;font-size:20px;}
    .skmw-modal .sub{color:#6b7280;font-size:13px;margin:0 0 16px;}
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
  `;
  const style = el(`<style id="skmw-styles">${css}</style>`);
  document.head.appendChild(style);
}
function toast(msg) {
  const t = el(`<div class="skmw-toast">${msg}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ---------------------------------------------------------------------------
// INJECT BUTTONS
// ---------------------------------------------------------------------------
function injectButtons() {
  const anchor = findComposerAnchor();
  if (!anchor) return;
  if (!document.querySelector('.skmw-magic') && !anchor.parentNode.querySelector('.skmw-magic')) {
    const magic = el(`<button class="skmw-btn skmw-magic">✨ Magic Post</button>`);
    magic.addEventListener('click', (e) => { e.stopPropagation(); openMagicDialog(); });
    anchor.parentNode.insertBefore(magic, anchor.nextSibling);
  }
  if (!document.querySelector('.skmw-schedule') && !anchor.parentNode.querySelector('.skmw-schedule')) {
    const sched = el(`<button class="skmw-btn skmw-schedule">📅 Schedule</button>`);
    sched.addEventListener('click', (e) => { e.stopPropagation(); openScheduleDialog(); });
    anchor.parentNode.insertBefore(sched, (anchor.parentNode.querySelector('.skmw-magic') || anchor).nextSibling);
  }
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
async function openScheduleDialog(post = null) {
  if (dialogOpen) return;
  dialogOpen = true;
  const slug = await getSlug();
  const isEdit = !!post;
  const def = post ? new Date(post.scheduled_for) : (() => { const d = new Date(Date.now() + 2 * 3600 * 1000); d.setMinutes(0, 0, 0); return d; })();
  const defVal = `${def.getFullYear()}-${String(def.getMonth() + 1).padStart(2, '0')}-${String(def.getDate()).padStart(2, '0')}T${String(def.getHours()).padStart(2, '0')}:${String(def.getMinutes()).padStart(2, '0')}`;

  // Pre-fill from the open composer if scheduling a brand-new post
  let prefill = '';
  if (!isEdit) {
    const editor = findEditor();
    if (editor) prefill = (editor.textContent || '').trim();
  }

  const overlay = el(`<div class="skmw-overlay"></div>`);
  const modal = el(`<div class="skmw-modal">
    <h2>${isEdit ? '✏️ Edit scheduled post' : '📅 Schedule post'}</h2>
    <p class="sub">Published automatically at the chosen time by the SKapi server.</p>
    <label>Post content</label>
    <textarea id="skmw-s-content" placeholder="Write your post...">${post?.content || prefill}</textarea>
    <label>Schedule date &amp; time</label>
    <input type="text" id="skmw-s-time" value="${defVal}" placeholder="YYYY-MM-DDTHH:MM">
    <div class="skmw-actions">
      <button class="skmw-btn skmw-btn-ghost" id="skmw-s-cancel">Cancel</button>
      ${isEdit ? '<button class="skmw-btn skmw-btn-ghost" id="skmw-s-delete" style="margin-right:auto;border-color:#dc2626;color:#dc2626;">🗑 Delete</button>' : ''}
      <button class="skmw-btn skmw-btn-pink" id="skmw-s-save">${isEdit ? 'Update' : 'Schedule'}</button>
    </div>
    <div class="skmw-err" id="skmw-s-err"></div>
  </div>`);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('skmw-s-content').focus(), 60);

  const close = () => { overlay.remove(); dialogOpen = false; };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('skmw-s-cancel').addEventListener('click', close);

  const save = async () => {
    const content = document.getElementById('skmw-s-content').value.trim();
    const when = document.getElementById('skmw-s-time').value;
    if (!content) return showErr('Post content is empty.');
    if (!when) return showErr('Pick a date and time.');
    const iso = new Date(when).toISOString();
    if (isNaN(new Date(iso).getTime())) return showErr('Invalid date/time format.');

    const btn = document.getElementById('skmw-s-save');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
    hideErr();
    try {
      const body = { content, scheduled_for: iso, community_slug: slug };
      if (isEdit && post?.id) {
        await apiRequest('/scheduled-posts', { method: 'PUT', body: { ...body, id: post.id } });
      } else {
        await apiRequest('/scheduled-posts', { method: 'POST', body });
      }
      close();
      toast(isEdit ? '✅ Post updated' : '✅ Post scheduled');
      refreshCalendar();
    } catch (e) {
      showErr(e.message);
      btn.disabled = false; btn.textContent = isEdit ? 'Update' : 'Schedule';
    }
  };
  document.getElementById('skmw-s-save').addEventListener('click', save);
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
  const obs = new MutationObserver(() => { injectButtons(); injectCalendarIcon(); });
  obs.observe(document.body, { childList: true, subtree: true });
}
async function init() {
  injectStyles();
  observe();
  setTimeout(() => { injectButtons(); injectCalendarIcon(); }, 1500);
  await loadScheduled();
  setInterval(loadScheduled, 120000);
  console.log('✨ [SKapi Magic Writer] loaded');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
