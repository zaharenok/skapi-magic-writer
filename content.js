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
function clearComposer() {
  // Empty the composer so Skool doesn't show "You haven't finished your
  // post yet" when it closes. Clearing the title via the native setter and
  // the editor via selectAll+delete goes through React/ProseMirror events.
  const titleInput = findTitleInput();
  if (titleInput) setInput(titleInput, '');
  const editor = findEditor();
  if (editor) {
    try {
      editor.focus();
      document.execCommand('selectAll');
      document.execCommand('delete');
    } catch (e) { /* ignore */ }
    if (editor.textContent) editor.textContent = '';
  }
}

async function closeComposer() {
  // Skool shows a confirmation modal when closing a composer. We clear the
  // composer first, intercept window.confirm, and auto-click the modal's
  // accept button if Skool shows a custom confirmation dialog.
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    clearComposer();
    // Give React/ProseMirror a moment to process the cleared content
    await new Promise((r) => setTimeout(r, 200));

    const visibleButtons = [...document.querySelectorAll('button')].filter(
      (b) => b.offsetParent !== null
    );
    const cancelBtn = visibleButtons.find((b) => b.textContent.trim().toLowerCase() === 'cancel')
      || visibleButtons.find((b) => b.textContent.trim().toLowerCase().includes('cancel'));
    if (cancelBtn) {
      cancelBtn.click();

      // Find Skool's confirmation modal. Look for role="dialog"/"alertdialog",
      // classes like modal/dialog/confirm (case-insensitive), or fixed-position
      // overlays containing cancel/discard/leave/publish/finish text.
      const findModal = () => {
        const candidates = [
          ...document.querySelectorAll('[role="dialog"]'),
          ...document.querySelectorAll('[role="alertdialog"]'),
          ...document.querySelectorAll('[class*="modal" i]'),
          ...document.querySelectorAll('[class*="dialog" i]'),
          ...document.querySelectorAll('[class*="confirm" i]'),
        ];
        // Also check for fixed-position overlays that look like modals.
        // Require an inner button — a plain dropdown menu ("Cancel" item)
        // has no buttons inside, so it won't be mistaken for a dialog.
        const allDivs = [...document.querySelectorAll('div')];
        for (const div of allDivs) {
          const style = window.getComputedStyle(div);
          if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 100) {
            if (!div.querySelector('button, [role="button"]')) continue;
            const text = (div.textContent || '').toLowerCase();
            if (/cancel|discard|leave|unsaved|publish|finish/.test(text)) {
              candidates.push(div);
            }
          }
        }
        // Sort deepest/most specific first; return the full list so the
        // accept-button search can fall through candidates (the deepest
        // container might hold only text, not the buttons).
        if (candidates.length === 0) return [];
        candidates.sort((a, b) => (b.querySelectorAll('*').length - a.querySelectorAll('*').length));
        return candidates;
      };

      // Classify buttons INSIDE the modal only. Two modal styles exist:
      //  (1) "Leave without finishing?"  -> buttons [Cancel, Leave] where
      //      Leave is the accept (Cancel = stay).
      //  (2) "Cancel this post?" / "Discard post?" -> buttons [Keep editing,
      //      Cancel] where Cancel IS the accept.
      // Strategy: prefer explicit accept words (leave, discard, delete, exit)
      // first; only fall back to 'cancel' as accept when no explicit accept
      // button exists. 'keep editing', 'stay', 'go back' are always deny.
      const MODAL_EXPLICIT_ACCEPT = /leave|discard|yes|confirm|delete|exit|quit|abandon|continue without saving/i;
      const MODAL_FALLBACK_ACCEPT = /cancel|discard/i;
      const MODAL_DENY_PATTERNS = /stay|keep editing|keep|go back|never mind|resume|back to|continue editing|dont leave|don't leave|dont cancel|don't cancel/i;

      const isDeny = (text) => MODAL_DENY_PATTERNS.test(text);

      const findAcceptButton = (modals) => {
        for (const modal of modals) {
          const buttons = [...modal.querySelectorAll('button, [role="button"]')];
          // Pass 1: explicit accept words only
          const explicit = buttons.find((b) => {
            const text = (b.textContent || '').trim().toLowerCase();
            if (!text || text.length > 40 || isDeny(text)) return false;
            return MODAL_EXPLICIT_ACCEPT.test(text);
          });
          if (explicit) return explicit;
          // Pass 2: 'cancel'/'discard' as accept (modal style 2)
          const fallback = buttons.find((b) => {
            const text = (b.textContent || '').trim().toLowerCase();
            if (!text || text.length > 40 || isDeny(text)) return false;
            return MODAL_FALLBACK_ACCEPT.test(text);
          });
          if (fallback) return fallback;
        }
        return null;
      };

      // Poll for modal for up to ~4s (16 iterations × 250ms). Skool mounts
      // the modal async, so we retry before falling back.
      let accepted = null;
      let foundModal = null;
      for (let i = 0; i < 16; i++) {
        foundModal = findModal();
        if (foundModal.length) {
          const btn = findAcceptButton(foundModal);
          if (btn) {
            btn.click();
            accepted = btn.textContent.trim();
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      if (accepted) {
        console.log('[skmw] Auto-accepted Skool confirmation modal:', accepted);
      } else if (foundModal && foundModal.length) {
        // Modal found but no accept button — log diagnostics
        const texts = [...foundModal[0].querySelectorAll('button, [role="button"]')]
          .map((b) => JSON.stringify((b.textContent || '').trim().slice(0, 30)))
          .filter(Boolean);
        console.warn('[skmw] Confirmation modal found but no accept button. Buttons:', texts);
      } else {
        console.log('[skmw] No confirmation modal detected — composer closed cleanly');
      }
      return true;
    }
  } finally {
    window.confirm = originalConfirm;
  }
  // Fallback: send Escape key
  document.activeElement?.blur();
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true });
  document.dispatchEvent(escEvent);
  console.log('[skmw] Sent Escape key to close composer (fallback)');
  return true;
}
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Set once when the extension context dies (reload/update while tabs are
// open). Every chrome.* call then throws "Extension context invalidated"
// synchronously — we must stop retrying and warn the user exactly once.
let _contextLost = false;
function handleContextLost() {
  if (_contextLost) return true;
  _contextLost = true;
  console.error('[skmw] Extension context invalidated — reload Skool tabs');
  toast('⚠️ Extension reloaded — please close all Skool tabs and reopen them');
  return true;
}

function getJwt() {
  // JWT is auto-extracted from the Skool auth_token HttpOnly cookie by the
  // service worker — the user never enters a token.
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'GET_JWT' }, (res) => {
        if (chrome.runtime.lastError) {
          handleContextLost();
          resolve('');
          return;
        }
        resolve(res?.token || '');
      });
    } catch (e) {
      // Chrome throws synchronously here when the extension was reloaded or
      // updated — the callback never fires and lastError is never set.
      handleContextLost();
      resolve('');
    }
  });
}
function getSlug() {
  return new Promise((resolve) => {
    const fromUrl = (location.pathname.split('/').filter(Boolean)[0]) || '';
    try {
      chrome.storage.local.get(['communitySlug'], (r) => {
        resolve((r && r.communitySlug) || fromUrl);
      });
    } catch (e) {
      console.warn('[skmw] storage unavailable:', e && e.message);
      resolve(fromUrl);
    }
  });
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
    if (data.subscribe_url) window.__skmwSubUrl = data.subscribe_url;
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

function toast(msg) {
  const t = el(`<div class="skmw-toast">${escapeHtml(msg)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

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
    .skmw-loading{margin-top:16px;text-align:center;}
    .skmw-progress{width:100%;height:8px;background:#e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:10px;}
    .skmw-progress-bar{height:100%;background:linear-gradient(90deg, ${BRAND}, ${INK});background-size:200% 100%;animation:skmw-progress-anim 1.5s ease-in-out infinite;}
    @keyframes skmw-progress-anim{0%{background-position:100% 0;}100%{background-position:0 0;}}
    .skmw-loading-text{font-size:13px;color:#6b7280;margin:0;font-weight:500;}
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
    .skmw-gif{display:flex;align-items:center;gap:8px;min-height:22px;line-height:1;margin-top:10px;font-size:13px;color:#374151;cursor:pointer;font-weight:500;text-transform:none;letter-spacing:0;}
    .skmw-gif input{width:16px;height:16px;margin:0;flex-shrink:0;accent-color:${BRAND};cursor:pointer;}
    .skmw-ctx-count{margin-left:auto;padding:4px 6px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:12px;font-family:inherit;background:#fff;color:#374151;cursor:pointer;}
    .skmw-ctx-count:disabled{opacity:.5;cursor:not-allowed;}
    /* Wide schedule modal: two columns so it grows horizontally, not vertically */
    .skmw-modal-wide{max-width:780px;}
    .skmw-sched-cols{display:flex;gap:22px;align-items:flex-start;}
    .skmw-sched-left{flex:1.15;min-width:0;display:flex;flex-direction:column;gap:6px;}
    .skmw-sched-left>label{display:flex;align-items:center;min-height:24px;margin:0;font-weight:600;font-size:13px;color:#374151;text-transform:none;}
    .skmw-sched-left>label>span{margin-left:4px;font-weight:400;color:#9ca3af;text-transform:none;}
    .skmw-sched-left>textarea,.skmw-sched-left>.skmw-preview{width:100%;min-height:80px;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;line-height:1.5;color:#0A0A0A;background:#fff;margin-top:4px;resize:vertical;overflow:auto;}
    .skmw-preview-empty{color:#9ca3af;font-style:italic;display:flex;align-items:center;justify-content:center;height:100%;min-height:60px;}
    .skmw-sched-right{flex:1;min-width:0;border-left:1.5px solid #f3f4f6;padding-left:20px;}
    .skmw-sched-right h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;}
    .skmw-sched-right h4:not(:first-child){margin-top:16px;}
    .skmw-dt{width:100%;padding:9px 10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;color:#0A0A0A;background:#fff;margin-top:2px;}
    .skmw-dt:focus{outline:none;border-color:${BRAND};}
    .skmw-timeslot{width:100%;padding:9px 10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;margin-top:6px;}
    .skmw-past-note{font-size:11px;color:#dc2626;margin-top:6px;display:none;}
    .skmw-edit-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
    .skmw-btn-back{background:none;border:none;color:#6b7280;font-size:13px;font-weight:600;cursor:pointer;padding:4px 8px;border-radius:6px;}
    .skmw-btn-back:hover{background:#f3f4f6;color:${INK};}
    .skmw-edit-header h3{margin:0;font-size:15px;color:#0A0A0A;flex:1;}
    .skmw-edit-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1.5px solid #f3f4f6;}
    @media (max-width:680px){.skmw-sched-cols{flex-direction:column;}.skmw-sched-right{border-left:none;border-top:1.5px solid #f3f4f6;padding-left:0;padding-top:16px;}}
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
    
    const scheduled = el(`<button class="skmw-btn skmw-scheduled" style="margin-left:8px;">📅 Scheduled</button>`);
    scheduled.addEventListener('click', (e) => { e.stopPropagation(); toggleCalendar(); });
    anchor.parentNode.insertBefore(scheduled, magic.nextSibling);
  }
}
// Schedule lives inside the OPEN composer, next to Cancel/Post.
// The user writes the post, then decides: Post now or Schedule.
function injectScheduleInComposer() {
  // Post and Cancel buttons
  const postBtn = [...document.querySelectorAll('button')].find(
    (b) => b.textContent.trim().toLowerCase() === 'post' && b.offsetParent !== null
  );
  const cancelBtn = [...document.querySelectorAll('button')].find(
    (b) => b.textContent.trim().toLowerCase() === 'cancel' && b.offsetParent !== null
  );
  if (!postBtn || !cancelBtn) return;

  // The action row is the shared container holding Cancel and the Post
  // wrapper (fqifkx). We must NOT drop inside the Post wrapper — Schedule
  // becomes a sibling of Cancel, at the same level as the Post wrapper.
  const actionRow = cancelBtn.parentNode;
  if (!actionRow || actionRow.querySelector('.skmw-schedule-compose')) return;

  const btn = el(`<button class="skmw-s-inline skmw-schedule-compose" type="button">📅 Schedule</button>`);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Save composer text to localStorage in case user cancels
    const editor = findEditor();
    const titleInput = findTitleInput();
    const body = editor ? editor.textContent.trim() : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const fullText = (title ? title + '\n\n' : '') + body;
    
    // Save to localStorage for restoration on cancel
    const communityKey = location.href;
    localStorage.setItem('skmw_saved_title_' + communityKey, title);
    localStorage.setItem('skmw_saved_body_' + communityKey, body);
    
    openScheduleDialog(null, fullText);
  });
  // Insert right after Cancel: [Cancel] [📅 Schedule] [Post wrapper]
  actionRow.insertBefore(btn, cancelBtn.nextSibling);
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
    <label class="skmw-gif"><input type="checkbox" id="skmw-title" checked>Generate a catchy title (first line)</label>
    <label class="skmw-gif"><input type="checkbox" id="skmw-magic-gif">🎬 Attach a relevant GIF when inserting</label>
    <label class="skmw-gif skmw-ctx" id="skmw-ctx-wrap" title="🔒 Pro feature — requires an active subscription">
      <input type="checkbox" id="skmw-ctx">📚 Use recent community posts as context
      <select id="skmw-ctx-count" class="skmw-ctx-count">
        <option value="10">10 posts</option>
        <option value="20">20 posts</option>
        <option value="30" selected>30 posts</option>
      </select>
    </label>
    <div class="skmw-actions">
      <button class="skmw-btn skmw-btn-ghost" id="skmw-cancel">Cancel</button>
      <button class="skmw-btn skmw-btn-pink" id="skmw-go">✨ Generate & Insert</button>
    </div>
    <div class="skmw-err" id="skmw-err"></div>
    <div class="skmw-loading" id="skmw-loading" style="display:none;">
      <div class="skmw-progress">
        <div class="skmw-progress-bar"></div>
      </div>
      <p class="skmw-loading-text">✨ Generating your post...</p>
    </div>
  </div>`);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('skmw-in').focus(), 60);

  // Pro gate: community-context checkbox only for active subscribers.
  // Server re-checks anyway (/ai/generate returns pro_feature_required).
  checkProAccess().then((pro) => {
    const wrap = document.getElementById('skmw-ctx-wrap');
    const cb = document.getElementById('skmw-ctx');
    const sel = document.getElementById('skmw-ctx-count');
    if (wrap && !pro) {
      cb.disabled = true;
      sel.disabled = true;
      wrap.style.opacity = '.5';
      wrap.title = '🔒 Pro feature — requires an active subscription';
    }
  });

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
    const loading = document.getElementById('skmw-loading');
    const loadingText = loading.querySelector('.skmw-loading-text');
    goBtn.disabled = true;
    loading.style.display = 'block';
    hideErr();
    try {
      // Pro feature: scrape recent feed posts as style context (client-side —
      // the posts are already in the DOM, no server scraping needed).
      let communityContext = '';
      const wantContext = document.getElementById('skmw-ctx').checked;
      if (wantContext) {
        const maxPosts = parseInt(document.getElementById('skmw-ctx-count').value || '30', 10);
        if (loadingText) loadingText.textContent = '📚 Collecting recent community posts...';
        communityContext = await collectCommunityContext(maxPosts);
        if (loadingText) loadingText.textContent = '✨ Generating your post...';
      }
      const body = { prompt };
      if (communityContext) body.community_context = communityContext;
      const data = await apiRequest('/ai/generate', { method: 'POST', body });
      if (!data.success || !data.text) throw new Error(data.error || 'No text returned');
      const attachGif = document.getElementById('skmw-magic-gif').checked;
   close();
      await insertIntoComposer(data.text, attachGif);
      toast(attachGif ? '✅ Post generated and inserted (+ GIF)' : '✅ Post generated and inserted');
    } catch (e) {
      showErr(e.message);
      goBtn.disabled = false;
      loading.style.display = 'none';
    }
  };
  document.getElementById('skmw-go').addEventListener('click', run);

  function showErr(m) {
    const e = document.getElementById('skmw-err');
    if (String(m).includes('subscription_required')) {
      const url = window.__skmwSubUrl || 'https://www.skool.com';
      e.innerHTML = '🔒 Нужна подписка. <a href="' + url + '" target="_blank" rel="noopener" style="color:#FF90E8;text-decoration:underline;font-weight:600">Вступить в сообщество →</a>';
    } else if (String(m).includes('pro_feature_required')) {
      const url = window.__skmwSubUrl || 'https://www.skool.com';
      e.innerHTML = '🔒 Это Pro-фича: контекст из постов сообщества доступен только участникам. <a href="' + url + '" target="_blank" rel="noopener" style="color:#FF90E8;text-decoration:underline;font-weight:600">Вступить в сообщество →</a>';
    } else {
      e.textContent = m;
    }
    e.style.display = 'block';
  }
  function hideErr() { document.getElementById('skmw-err').style.display = 'none'; }
}

// ---------------------------------------------------------------------------
// COMMUNITY CONTEXT (Pro): scrape recent feed posts from the DOM
// ---------------------------------------------------------------------------
let __skmwProCache = null; // { at: epoch_ms, pro: bool }

async function checkProAccess() {
  // /ai/access is cheap, but no need to call it on every dialog open.
  const now = Date.now();
  if (__skmwProCache && now - __skmwProCache.at < 5 * 60 * 1000) return __skmwProCache.pro;
  let pro = false;
  try {
    const data = await apiRequest('/ai/access');
    pro = !!(data && data.pro);
  } catch (e) {
    console.warn('[skmw] /ai/access failed:', e && e.message);
  }
  __skmwProCache = { at: now, pro };
  return pro;
}

const CTX_MAX_CHARS = 24000; // общий бюджет контекста (~6-8K токенов для free-моделей)
const CTX_POST_CHARS = 900;  // обрезка одного поста

function collectCtxPosts(posts, seen, maxPosts) {
  // Тот же проверенный селектор, что и в серверном check_group_posts.py
  const wrappers = document.querySelectorAll('[class*="PostItemContentWrapper"]');
  for (const wrapper of wrappers) {
    if (posts.length >= maxPosts) return;
    const children = wrapper.children;
    if (children.length < 4) continue;
    const headerEl = children[0];
    const titleLink = children[1];
    const contentEl = children[2];
    const slug = (titleLink && titleLink.href) ? titleLink.href.split('/').pop().split('?')[0] : '';
    if (slug && seen.has(slug)) continue;
    if (slug) seen.add(slug);
    let author = '';
    if (headerEl) {
      const authorLinks = headerEl.querySelectorAll('a[href*="/@"]');
      for (const al of authorLinks) {
        const t = (al.innerText || al.textContent || '').trim();
        if (t.length > 1 && !/^\d+$/.test(t)) { author = t; break; }
      }
    }
    let category = '';
    const catLink = headerEl ? headerEl.querySelector('a[href*="?c="]') : null;
    if (catLink) category = (catLink.innerText || catLink.textContent || '').trim();
    let content = contentEl ? (contentEl.innerText || contentEl.textContent || '').trim() : '';
    if (!content) {
      const title = titleLink ? (titleLink.innerText || titleLink.textContent || '').trim() : '';
      content = title;
    }
    if (!content) continue;
    if (content.length > CTX_POST_CHARS) content = content.slice(0, CTX_POST_CHARS) + '…';
    posts.push({ author, category, content });
  }
}

async function collectCommunityContext(maxPosts = 30) {
  // Скроллим ленту (infinite scroll), пока не наберём maxPosts постов.
  // Возвращаем скролл на место, чтобы не дёргать страницу пользователя.
  const posts = [];
  const seen = new Set();
  const scroller = document.scrollingElement || document.documentElement;
  const startY = window.scrollY || scroller.scrollTop || 0;
  const maxScrolls = Math.min(12, Math.ceil(maxPosts / 3) + 2);
  try {
    for (let i = 0; i < maxScrolls && posts.length < maxPosts; i++) {
      collectCtxPosts(posts, seen, maxPosts);
      if (posts.length >= maxPosts) break;
      const prevHeight = scroller.scrollHeight;
      window.scrollTo(0, scroller.scrollHeight);
      await sleep(1000);
      if (scroller.scrollHeight === prevHeight && i > 0) break; // лента кончилась
    }
    collectCtxPosts(posts, seen, maxPosts);
  } finally {
    window.scrollTo(0, startY);
  }
  if (!posts.length) return '';

  const parts = [];
  let total = 0;
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const meta = [p.author, p.category].filter(Boolean).join(' · ');
    const block = `[Post ${i + 1}${meta ? ' by ' + meta : ''}]\n${p.content}`;
    if (total + block.length > CTX_MAX_CHARS) break;
    parts.push(block);
    total += block.length;
  }
  return parts.join('\n\n---\n\n');
}

// Insert a GIF via Skool's built-in picker (search -> random result)
async function insertGif(searchQuery) {
  try {
    const gifBtn = [...document.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Add gif' && b.offsetParent !== null
    );
    if (!gifBtn) { console.warn('[skmw] GIF button not found'); return false; }
    gifBtn.click();
    await sleep(800);
    const searchInput = document.querySelector('input[data-testid="gif-picker-input"]');
    if (!searchInput) return false;
    setInput(searchInput, searchQuery);
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    await sleep(2500);
    const items = document.querySelectorAll('div[aria-label^="gif-item-"]');
    if (!items.length) { console.warn('[skmw] No GIF results for', searchQuery); return false; }
    items[Math.floor(Math.random() * items.length)].click();
    await sleep(1200);
    const backdrop = document.querySelector('[class*="DropdownBackground"]');
    if (backdrop) backdrop.click();
    return true;
  } catch (e) {
    console.warn('[skmw] GIF insert failed:', e);
    return false;
  }
}

// Insert a generated post (title = first line, body = rest) into Skool's composer
async function insertIntoComposer(text, attachGif = false) {
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

  if (attachGif) {
    const term = gifTermFrom(text);
    const ok = await insertGif(term);
    if (!ok) toast('⚠️ Could not attach a GIF — post is still inserted');
  }
}

// ---------------------------------------------------------------------------
// SCHEDULE DIALOG
// ---------------------------------------------------------------------------
async function openScheduleDialog(post = null, prefillText = null) {
  if (dialogOpen) return;
  dialogOpen = true;
  const slug = await getSlug();
  const isEdit = !!post;

  let content = '';
  if (isEdit) content = post.content || '';
  else if (prefillText) content = prefillText;
  else { const ed = findEditor(); content = ed ? ed.textContent.trim() : ''; }

  // Default: tomorrow 09:00 for new posts (a sensible posting slot)
  let chosen = post ? new Date(post.scheduled_for) : atDayOffset(1, 9, 0);
  if (isNaN(chosen.getTime())) chosen = atDayOffset(1, 9, 0);


  const previewHtml = content
    ? escapeHtml(content.slice(0, 280)) + (content.length > 280 ? '…' : '')
    : '<span class="skmw-preview-empty">Nothing in the composer yet — write your post first.</span>';
  const minDt = toDtLocal(new Date());

  const overlay = el(`<div class="skmw-overlay"></div>`);
  const modal = el(`<div class="skmw-modal skmw-modal-wide">
    <h2>${isEdit ? '✏️ Edit scheduled post' : '📅 Schedule post'}</h2>
    <p class="sub">${isEdit ? 'Update the post or its publish time.' : 'Publishes automatically at the chosen time — as you, in this community.'}</p>
    ${!isEdit ? '<div class="skmw-notice" style="background:#FEF3C7;border:1.5px solid #F59E0B;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#92400E;"><strong>⚠️ Important:</strong> Only text content is saved. If you added images/media in the composer, they won\'t be included in the scheduled post — you\'ll need to re-add them when it publishes.</div>' : ''}
    <div class="skmw-sched-cols">
      <div class="skmw-sched-left">
        ${isEdit
          ? `<label>Post content</label><textarea id="skmw-s-content" placeholder="Write your post...">${escapeHtml(content)}</textarea>`
          : `<label>Posting</label><div class="skmw-preview" id="skmw-s-preview">${previewHtml}</div>`}
        <label style="margin-top:14px;">Publish at <span style="text-transform:none;font-weight:400;color:#9ca3af;">(editable)</span></label>
        <input type="datetime-local" class="skmw-dt" id="skmw-s-dt" min="${minDt}" value="${toDtLocal(chosen)}">
        <div class="skmw-past-note" id="skmw-s-past">⚠️ Can't schedule in the past — pick a future time.</div>
        <div class="skmw-cal-grid" id="skmw-s-cal"></div>
      </div>
      <div class="skmw-sched-right">
        <h4>Quick schedule</h4>
        <div class="skmw-presets" id="skmw-s-presets"></div>
        ${!isEdit ? '<h4>Your scheduled posts</h4><div id="skmw-s-up"></div>' : ''}
      </div>
    </div>
    <div class="skmw-actions">
      <button class="skmw-btn skmw-btn-ghost" id="skmw-s-cancel">Cancel</button>
      ${isEdit ? '<button class="skmw-btn skmw-btn-ghost" id="skmw-s-delete" style="margin-right:auto;border-color:#dc2626;color:#dc2626;">🗑 Delete</button>' : ''}
      <button class="skmw-btn skmw-btn-pink" id="skmw-s-save">${isEdit ? 'Update' : '📅 Schedule'}</button>
    </div>
    <div class="skmw-err" id="skmw-s-err"></div>
  `);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  let postCreated = false;
  const close = (success = false) => {
    overlay.remove();
    dialogOpen = false;
    
    // If dialog was cancelled (not saved), restore the composer text
    if (!success && !isEdit) {
      const communityKey = location.href;
      const savedTitle = localStorage.getItem('skmw_saved_title_' + communityKey) || '';
      const savedBody = localStorage.getItem('skmw_saved_body_' + communityKey) || '';
      
      if (savedTitle || savedBody) {
        setTimeout(() => {
          const titleInput = findTitleInput();
          const editor = findEditor();
          if (titleInput && savedTitle) {
            setInput(titleInput, savedTitle);
          }
          if (editor && savedBody) {
            typeInto(editor, savedBody);
          }
        }, 100);
      }
    }
    
    // If post was created, clear saved text
    if (success) {
      const communityKey = location.href;
      localStorage.removeItem('skmw_saved_title_' + communityKey);
      localStorage.removeItem('skmw_saved_body_' + communityKey);
    }
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  document.getElementById('skmw-s-cancel').addEventListener('click', () => close(false));
  if (isEdit) setTimeout(() => document.getElementById('skmw-s-content')?.focus(), 60);


  const $dt = document.getElementById('skmw-s-dt');
  const $past = document.getElementById('skmw-s-past');

  function syncFromChosen() {
    $dt.value = toDtLocal(chosen);
    $past.style.display = chosen.getTime() < Date.now() ? 'block' : 'none';
  }

  // Editable datetime-local — typing here updates everything
  $dt.addEventListener('change', () => {
    const v = new Date($dt.value);
    if (!isNaN(v.getTime())) { chosen = v; syncFromChosen(); renderCalendar(); }
  });

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
    b.addEventListener('click', () => { chosen = p.at(); syncFromChosen(); renderCalendar(); });
    $presets.appendChild(b);
  });

  function renderCalendar() {
    renderMiniCalendar(document.getElementById('skmw-s-cal'), chosen, (d) => {
      d.setHours(chosen.getHours(), chosen.getMinutes(), 0, 0); // keep the time when changing the day
      chosen = d; syncFromChosen(); renderCalendar();
    });
  }
  renderCalendar();
  syncFromChosen();

  if (!isEdit) renderUpcoming(document.getElementById('skmw-s-up'), close);

  document.getElementById('skmw-s-save').addEventListener('click', async () => {
    // Read the field directly — a change event may not have fired yet if the
    // user edits the time and clicks Save immediately.
    const v = new Date($dt.value);
    if (!isNaN(v.getTime())) chosen = v;
    const finalContent = isEdit ? document.getElementById('skmw-s-content').value.trim() : content.trim();
    if (!finalContent) return showErr('Post content is empty.');
    if (chosen.getTime() < Date.now()) return showErr('Pick a time in the future.');
    const btn = document.getElementById('skmw-s-save');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
    hideErr();
    try {
      const body = { content: finalContent, scheduled_for: chosen.toISOString(), community_slug: slug, community_url: location.href, gif_search: null };
      if (isEdit && post?.id) await apiRequest('/scheduled-posts', { method: 'PUT', body: { ...body, id: post.id } });
      else await apiRequest('/scheduled-posts', { method: 'POST', body });
      close(true);
      toast(isEdit ? '✅ Post updated' : '✅ Post scheduled');
      refreshCalendar();
      // Close Skool composer after scheduling (not for edits)
      if (!isEdit) { setTimeout(() => closeComposer(), 300); }
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
function toDtLocal(d) { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
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
  const pending = calState.posts.filter((p) => (p.status || 'pending') === 'pending').sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for));
  if (!pending.length) { container.innerHTML += '<div style="font-size:12px;color:#9ca3af;padding:4px 8px;">None yet.</div>'; return; }
  pending.slice(0, 6).forEach((p) => {
    const d = new Date(p.scheduled_for);
    const item = el(`<div class="skmw-up-item"><span class="t">${d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><span class="c">${escapeHtml((p.content || '').slice(0, 60))}</span></div>`);
    item.addEventListener('click', () => { closeDialog(true); setTimeout(() => openScheduleDialog(p), 50); });
    container.appendChild(item);
  });
}

// ---------------------------------------------------------------------------
// CALENDAR POPOVER (MVP: list with tabs)
// ---------------------------------------------------------------------------
let calState = { posts: [], tab: 'upcoming' };
async function loadScheduled() {
  if (_contextLost) return; // extension was reloaded — stop polling silently
  try {
    const data = await apiRequest('/scheduled-posts');
    calState.posts = (data.result || data.posts || []).filter(Boolean);
  } catch (e) {
    calState.posts = [];
    // Extension context invalidated → getJwt already warned the user once;
    // don't spam this every 120s poll.
    if (!_contextLost) console.warn('[skmw] load scheduled failed:', e.message);
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
        renderEditForm(post, list);
      }
    });
  });
}

// ---------------------------------------------------------------------------
function renderEditForm(post, container) {
  const content = post.content || '';
  const chosen = new Date(post.scheduled_for);
  if (isNaN(chosen.getTime())) chosen = atDayOffset(1, 9, 0);
  const gifOn = !!post.gif_search;
  const minDt = toDtLocal(new Date());

  container.innerHTML = `
    <div class="skmw-edit-header">
      <button class="skmw-btn-back" id="skmw-edit-back">← Back to list</button>
      <h3>✏️ Edit scheduled post</h3>
    </div>
    <label>Post content</label>
    <textarea id="skmw-e-content" placeholder="Write your post...">${escapeHtml(content)}</textarea>
    <label style="margin-top:14px;">Publish at</label>
    <input type="datetime-local" class="skmw-dt" id="skmw-e-dt" min="${minDt}" value="${toDtLocal(chosen)}">
    <div class="skmw-past-note" id="skmw-e-past">⚠️ Can't schedule in the past — pick a future time.</div>
    <div class="skmw-cal-grid" id="skmw-e-cal"></div>
    </div>
    </div>
    <div class="skmw-edit-actions">
      <button class="skmw-btn skmw-btn-ghost" id="skmw-e-delete" style="border-color:#dc2626;color:#dc2626;">🗑 Delete</button>
      <button class="skmw-btn skmw-btn-pink" id="skmw-e-save">Update</button>
    </div>
    <div class="skmw-err" id="skmw-e-err"></div>
  `;

  const $dt = document.getElementById('skmw-e-dt');
  const $past = document.getElementById('skmw-e-past');

  function syncFromChosen() {
    $dt.value = toDtLocal(chosen);
    $past.style.display = chosen.getTime() < Date.now() ? 'block' : 'none';
  }

  $dt.addEventListener('change', () => {
    const v = new Date($dt.value);
    if (!isNaN(v.getTime())) { chosen = v; syncFromChosen(); }
  });

  function renderCalendar() {
    renderMiniCalendar(document.getElementById('skmw-e-cal'), chosen, (d) => {
      d.setHours(chosen.getHours(), chosen.getMinutes(), 0, 0);
      chosen = d; syncFromChosen(); renderCalendar();
    });
  }
  renderCalendar();
  syncFromChosen();

  document.getElementById('skmw-edit-back').addEventListener('click', () => {
    renderList();
  });

  const showErr = (msg) => { const e = document.getElementById('skmw-e-err'); e.textContent = msg; e.style.display = 'block'; };
  const hideErr = () => { document.getElementById('skmw-e-err').style.display = 'none'; };

  document.getElementById('skmw-e-save').addEventListener('click', async () => {
    // Read the field directly — a change event may not have fired yet if the
    // user edits the time and clicks Update immediately.
    const v = new Date($dt.value);
    if (!isNaN(v.getTime())) chosen = v;
    const finalContent = document.getElementById('skmw-e-content').value.trim();
    if (!finalContent) return showErr('Post content is empty.');
    if (chosen.getTime() < Date.now()) return showErr('Pick a time in the future.');
    const btn = document.getElementById('skmw-e-save');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
    hideErr();
    try {
      const body = { content: finalContent, scheduled_for: chosen.toISOString(), gif_search: null };
      await apiRequest('/scheduled-posts', { method: 'PUT', body: { ...body, id: post.id } });
      toast('✅ Post updated');
      await loadScheduled();
      renderList();
    } catch (e) {
      showErr(e.message || 'Failed to update post');
      btn.disabled = false; btn.textContent = 'Update';
    }
  });

  document.getElementById('skmw-e-delete').addEventListener('click', async () => {
    if (!confirm('Delete this scheduled post?')) return;
    try {
      await apiRequest('/scheduled-posts', { method: 'DELETE', body: { id: post.id } });
      toast('🗑 Post deleted');
      await loadScheduled();
      renderList();
    } catch (e) {
      showErr(e.message || 'Failed to delete post');
    }
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
