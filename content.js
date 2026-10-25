/**
 * Skool Magic Writer — content script (experimental, v0.1)
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
  // Empty the composer so Skool's "You haven't finished your post yet"
  // dialog never triggers on close. Ground truth (2026-10-24): Skool
  // serializes the ProseMirror STATE — the TipTap commands API is the
  // reliable empty path; keep the execCommand passes as fallback.
  const editorPre = findEditor();
  try { if (editorPre && editorPre.editor) editorPre.editor.commands.clearContent(true); } catch (_) {}
  const titleInput = findTitleInput();
  if (titleInput && titleInput.value) setInput(titleInput, '');
  const editor = findEditor();
  if (!editor) { console.warn('[skmw] clearComposer: editor not found'); return; }
  editor.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);
  for (let attempt = 0; attempt < 3 && editor.textContent.trim(); attempt++) {
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('delete');
    } catch (e) { /* ignore */ }
  }
  // Last resort: wipe the DOM, then fire an input event so ProseMirror's
  // observer re-parses the emptied editor into a transaction.
  if (editor.textContent.trim()) {
    editor.textContent = '';
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
  // Attachments (GIFs, images, files) live OUTSIDE the editor document —
  // the composer schema has no image node — and they keep the "unfinished"
  // guard armed after the text is gone. Remove them via their controls
  // inside the container that holds both the editor and the Post button.
  let root = editor.parentElement;
  for (let i = 0; i < 10 && root; i++) {
    if ([...root.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Post')) break;
    root = root.parentElement;
  }
  if (root) {
    root.querySelectorAll('button, [role="button"]').forEach((btn) => {
      const lbl = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.getAttribute('title') || '')).toLowerCase();
      if (/remove|delete|detach/.test(lbl)) { try { btn.click(); } catch (_) {} }
    });
  }
  console.log(`[skmw] clearComposer: title=${!titleInput ? 'not found' : titleInput.value ? 'NOT cleared' : 'cleared'} editor=${editor.textContent.trim() ? 'NOT cleared' : 'cleared'}`);
}

async function closeComposer() {
  // Skool shows a confirmation modal when closing a composer. We clear the
  // composer first, intercept window.confirm, and auto-click the modal's
  // accept button if Skool shows a custom confirmation dialog.
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    // While this flag is set, the discard watcher (MutationObserver, runs
    // pre-paint) hides Skool's "discard your post?" modal the moment it
    // mounts and clicks its accept button — the user never sees it flash.
    skmwHideGuardsUntil = Date.now() + 9000;
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
    } else {
      // No visible Cancel — try Escape. The modal poll below auto-accepts
      // Skool's confirmation dialog in both cases.
      document.activeElement?.blur();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
      console.log('[skmw] No Cancel button — sent Escape, polling for confirm dialog');
    }
    {

      // Find Skool's confirmation modal. Ground truth (2026-10-24): Skool
      // uses styled-components v6 hashed sc-* classes, so class-based
      // matching is dead, and position/z-index heuristics false-positive on
      // the fixed community sidebar. Anchor on the guard TEXT instead, then
      // take the innermost container that also holds buttons.
      // Shared guard matcher (skmwNorm handles typographic apostrophes);
      // replaces the divergent closeComposer-only GUARD_RE (2026-10-25).
      const GUARD_RE = SKMW_DISCARD_TEXT;
      const findModal = () => {
        if (!GUARD_RE.test(skmwNorm(document.body.textContent))) return [];
        const hits = [];
        for (const el of document.querySelectorAll('div, section')) {
          if (!GUARD_RE.test(skmwNorm(el.textContent))) continue;
          if (!el.querySelector('button, [role="button"]')) continue;
          hits.push(el);
        }
        // Innermost first: the card holding the guard text and its buttons.
        hits.sort((a, b) => (a.querySelectorAll('*').length - b.querySelectorAll('*').length));
        return hits;
      };

      // Classification strategy lives in skmwFindAccept (shared with the
      // global discard watcher): explicit accept words first, 'cancel' only
      // beside an explicit deny, deepest matching label clicked.
      const findAcceptButton = (modals) => {
        for (const modal of modals) {
          const btn = skmwFindAccept(modal);
          if (btn) return btn;
        }
        return null;
      };

      // Poll for modal for up to ~7.5s (25 iterations × 300ms). Skool mounts
      // the modal async, so we retry before falling back.
      let accepted = null;
      let foundModal = null;
      for (let i = 0; i < 25; i++) {
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
        // Modal found but no accept button — dump DOM so the extension
        // Errors page carries enough to fix the matcher later.
        console.warn('[skmw] Confirmation modal found but no accept button. HTML:', foundModal[0].outerHTML.slice(0, 1200));
      } else {
        console.log('[skmw] No confirmation modal detected — composer closed cleanly');
      }
      return true;
    }
  } finally {
    window.confirm = originalConfirm;
  }
  return true;
}
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Set once when the extension context dies (reload/update while tabs are
// open). Every chrome.* call then throws "Extension context invalidated"
// synchronously — we must stop retrying, reload the tab once, then warn.
let _contextLost = false;
let lastGifTerm = null; // search term of the GIF the extension itself inserted this session
function handleContextLost() {
  if (_contextLost) return true;
  _contextLost = true;
  console.error('[skmw] Extension context invalidated — reloading tab');
  toast('⚠️ Extension was updated — reopening this tab…');
  // Self-heal: reload exactly once per tab lifetime. sessionStorage survives
  // the reload but dies with the tab, so a reload loop is impossible; a
  // second context loss in the same tab only shows the toast.
  try {
    if (!sessionStorage.getItem('skmw_ctx_reloaded')) {
      sessionStorage.setItem('skmw_ctx_reloaded', '1');
      setTimeout(() => location.reload(), 1500);
    }
  } catch (_) { /* sessionStorage unavailable — the toast stays as guidance */ }
  return true;
}

function getJwt(retried) {
  // JWT is auto-extracted from the Skool auth_token HttpOnly cookie by the
  // service worker — the user never enters a token.
  return new Promise((resolve) => {
    const finish = (token) => resolve(token || '');
    let answered = false;
    const transient = () => {
      // MV3 service worker can be mid-restart ("Receiving end does not
      // exist") — that is NOT a dead context. Reload only on a real
      // "Extension context invalidated"; otherwise retry once quietly.
      if (retried) { finish(''); return; }
      setTimeout(() => { getJwt(true).then(finish); }, 400);
    };
    try {
      chrome.runtime.sendMessage({ type: 'GET_JWT' }, (res) => {
        if (answered) return;
        answered = true;
        const err = chrome.runtime.lastError;
        if (!err) { finish(res?.token || ''); return; }
        if (/context invalidated/i.test(err.message || '')) { handleContextLost(); finish(''); return; }
        transient();
      });
    } catch (e) {
      // Chrome throws synchronously here when the extension was reloaded or
      // updated — the callback never fires and lastError is never set.
      if (/context invalidated/i.test(e?.message || '')) { handleContextLost(); finish(''); return; }
      transient();
    }
  });
}
function getSlug() {
  // The post publishes to the community it was written in — auto-detected
  // from the current URL. Access is gated by Skool itself: if the user can
  // write there, they can schedule there (2026-10-25).
  return (location.pathname.split('/').filter(Boolean)[0]) || '';
}

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  // Routed via the background service worker: content scripts share the page
  // context, so a direct fetch to api.skapi.pro is subject to skool.com's
  // CSP connect-src (regression 2026-10-25). The worker is CSP-exempt and
  // reads the JWT itself from the auth_token cookie when auth=true.
  const res = await new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type: 'SKMW_FETCH', path, method, body, auth }, (r) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!r) return reject(new Error('No response from extension background'));
        resolve(r);
      });
    } catch (e) {
      reject(e);
    }
  });
  const data = res.data || {};
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
function findEditor() {
  const sels = ['div[contenteditable="true"].tiptap', 'div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"]', 'textarea[name="content"]'];
  for (const s of sels) {
    const e = document.querySelector(s);
    if (e && e.offsetParent) return e;
  }
  return null;
}
// Block-preserving text extraction. textContent on a ProseMirror editor
// concatenates <p> blocks with NO separator — that glued every scheduled
// post into a wall of text. innerText (Chrome-only, and this extension is
// Chrome-only) inserts \n at block boundaries and keeps the blank lines
// produced by the empty <p> between paragraphs.
function editorText(editor) {
  if (!editor) return '';
  const raw = (editor.innerText || editor.textContent || '').replace(/\u00a0/g, ' ');
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}
function findTitleInput() {
  return (
    document.querySelector('input[placeholder="Title"]') ||
    document.querySelector('input[placeholder*="title" i]')
  );
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

// ---- Skool discard-confirmation dialogs ("You haven't finished your post
// yet...") — shared patterns for closeComposer and the global watcher ----
// Skool copy uses typographic apostrophes (haven’t) — normalize before any
// pattern test so both spellings match (regression 2026-10-25: watcher and
// closeComposer carried divergent regexes; the watcher missed haven’t).
const skmwNorm = (s) => (s || '').replace(/[\u2018\u2019\u02BC]/g, "'");
const SKMW_MODAL_ACCEPT = /leave|discard|yes|confirm|delete|exit|quit|abandon|continue without saving|without finishing|close anyway/i;
const SKMW_MODAL_FALLBACK = /cancel|discard/i;
const SKMW_MODAL_DENY = /stay|keep editing|keep|go back|never mind|resume|back to|continue editing|dont leave|don't leave|dont cancel|don't cancel/i;
// One guard matcher for BOTH the watcher and closeComposer (was GUARD_RE).
const SKMW_DISCARD_TEXT = new RegExp(
  "haven'?t (?:finished|been published)"
  + "|(?:post|draft) (?:hasn'?t|is not|not) (?:been )?(?:finished|published)"
  + "|want to leave|without finishing|unsaved changes"
  + "|discard (?:your )?(?:post|draft)", "i"
);
// Fixed-position elements have offsetParent null — use rects for visibility.
function skmwVisible(n) {
  const r = n.getBoundingClientRect ? n.getBoundingClientRect() : null;
  return !!r && r.width > 0 && r.height > 0;
}
// Find the dialog's accept (leave/discard) element. Scanned DEEPEST-first:
// an ancestor holds BOTH buttons' texts ("Discard postKeep editing"), so an
// outer-first scan would match the whole dialog container and click it.
// New Skool DOM may keep action labels on non-button elements, so any
// element qualifies — clicking the label bubbles to the real control.
// 'cancel'-family is accepted only when an explicit deny ("Keep editing")
// sits next to it: in a [Cancel][Leave] modal Cancel means STAY.
function skmwFindAccept(scope) {
  const nodes = [...scope.querySelectorAll('*')].filter(skmwVisible).reverse();
  const label = (n) => skmwNorm(n.textContent).trim();
  const hasDeny = nodes.some((n) => { const t = label(n); return t && t.length <= 40 && SKMW_MODAL_DENY.test(t); });
  for (const pattern of [SKMW_MODAL_ACCEPT, SKMW_MODAL_FALLBACK]) {
    const hit = nodes.find((n) => {
      const t = label(n);
      if (!t || t.length > 40 || SKMW_MODAL_DENY.test(t)) return false;
      if (pattern === SKMW_MODAL_FALLBACK && !hasDeny) return false;
      return pattern.test(t);
    });
    if (hit) return hit.closest('button, [role="button"], a') || hit;
  }
  return null;
}

// Global watcher: whenever Skool shows a "you haven't finished your post"
// confirmation (any code path — scheduled close, manual close, navigation),
// auto-click the accept (leave/discard) button so the dialog never blocks.
let skmwHideGuardsUntil = 0; // pre-paint hide window for Skool's discard modal
let _discardWatcherOn = false;
function skmwAcceptHidden(modal) {
  // Hidden-tolerant accept pick (closeComposer's poll may run after the
  // watcher already set display:none): Leave/Discard-style label, never a
  // Stay/Keep-editing one.
  const btns = [...modal.querySelectorAll('button, [role="button"]')];
  return btns.find((b) => {
    const t = skmwNorm(b.textContent).trim();
    return t && t.length <= 40 && !SKMW_MODAL_DENY.test(t) && SKMW_MODAL_ACCEPT.test(t);
  }) || null;
}

function startDiscardWatcher() {
  if (_discardWatcherOn) return;
  _discardWatcherOn = true;
  let scheduled = false;
  let lastScan = 0;
  const check = () => {
    const wait = 250 - (Date.now() - lastScan);
    if (wait > 0) {
      // A mutation arrived inside the throttle window. Re-arm the check
      // instead of dropping it — a mounted dialog is static (no further
      // mutations), so a dropped check left the modal on screen forever.
      scheduled = true;
      setTimeout(() => { scheduled = false; check(); }, wait);
      return;
    }
    lastScan = Date.now();
    // Cheap selectors first. Skool styles modals with styled-components
    // (hashed class names), so also deep-scan fixed-position overlays that
    // contain a button and the discard text.
    let modals = [
      ...document.querySelectorAll(
        '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [class*="modal" i], [class*="dialog" i], [class*="confirm" i]'
      ),
    ].filter((m) => SKMW_DISCARD_TEXT.test(skmwNorm(m.textContent)));
    if (!modals.length) {
      for (const div of document.querySelectorAll('div')) {
        if (!div.querySelector('button, [role="button"]')) continue;
        const st = window.getComputedStyle(div);
        const r = div.getBoundingClientRect();
        const coversVp = r.width >= window.innerWidth * 0.5 && r.height >= window.innerHeight * 0.5;
        // Skool overlays: fixed with modest z-index, or absolute roots that
        // cover most of the viewport (z-index gate >50 missed z=100..1100
        // absolute containers — regression 2026-10-25).
        if (!((st.position === 'fixed' && (parseInt(st.zIndex, 10) > 10 || coversVp))
              || (st.position === 'absolute' && coversVp))) continue;
        if (SKMW_DISCARD_TEXT.test(skmwNorm(div.textContent))) modals.push(div);
      }
    }
    if (!modals.length) return;
    for (const modal of modals) {
      const btn = skmwFindAccept(modal);
      if (btn) {
        const label = (btn.textContent || '').trim();
        btn.click();
        console.log('[skmw] Discard watcher auto-accepted:', label);
        toast('🗑 Draft discarded');
      } else {
        console.warn('[skmw] Discard modal, no accept button. HTML:', modal.outerHTML.slice(0, 1200));
      }
    }
  };
  const obs = new MutationObserver(() => {
    // Pre-paint kill switch: during a scheduled composer close, hide the
    // guard modal and accept it the moment it mounts — no visible flash.
    if (Date.now() < skmwHideGuardsUntil) {
      const hits = [
        ...document.querySelectorAll('[role="dialog"], [role="alertdialog"], [aria-modal="true"], [class*="modal" i], [class*="dialog" i], [class*="confirm" i]'),
      ].filter((m) => SKMW_DISCARD_TEXT.test(skmwNorm(m.textContent)));
      for (const m of hits) {
        m.style.display = 'none';
        const btn = skmwFindAccept(m) || skmwAcceptHidden(m);
        if (btn) {
          btn.click();
          console.log('[skmw] Guard modal hidden + auto-accepted pre-paint');
        }
      }
    }
    if (scheduled) return;
    scheduled = true;
    // setTimeout, not requestAnimationFrame — rAF never fires in background
    // tabs, which is exactly where scheduled closes happen.
    setTimeout(() => { scheduled = false; check(); }, 120);
  });
  // attributes: Skool can pre-mount the guard dialog and reveal it by
  // toggling style/class — childList alone never fires for that (regression
  // 2026-10-25: the modal showed again despite the watcher being armed).
  obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
}

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
    .skmw-scheduled{position:relative;background:#FFC900;}
    .skmw-scheduled .b{position:absolute;top:-6px;right:-6px;background:${INK};color:#fff;font-size:10px;font-weight:800;min-width:16px;height:16px;padding:0 3px;border-radius:8px;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;}
    .skmw-scheduled .b.zero{display:none;}
    .skmw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483000;display:flex;justify-content:center;padding:24px 16px;overflow:auto;}
    .skmw-modal{background:#fff;color:#0A0A0A;border:2px solid ${INK};border-radius:16px;box-shadow:6px 6px 0 rgba(0,0,0,.15);width:100%;max-width:560px;padding:22px;margin:auto;font-family:ui-sans-serif,system-ui,sans-serif;}
    .skmw-modal h2{margin:0 0 4px;font-size:20px;color:#0A0A0A;cursor:move;user-select:none;}
    .skmw-modal .sub{color:#374151;font-size:13px;margin:0 0 16px;}
    .skmw-modal label{display:block;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px;color:#374151;}
    .skmw-modal textarea,.skmw-modal input[type=text],.skmw-modal input[type=password]{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;color:${INK};}
    .skmw-modal textarea{min-height:120px;resize:vertical;}
    .skmw-modal input:focus,.skmw-modal textarea:focus{outline:none;border-color:${BRAND};}
    .skmw-row{display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;}
    .skmw-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap;}
    .skmw-btn-ghost{background:#fff;color:${INK};}
    .skmw-btn-pink{background:${BRAND};color:${INK};}
    .skmw-btn-pink:disabled{opacity:.5;cursor:wait;}
    .skmw-err{background:#FEF2F2;border:2px solid #FCA5A5;color:#991B1B;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:12px;display:none;}
    .skmw-trial{font-size:13px;font-weight:600;color:#374151;background:#F9FAFB;border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px;margin:0 0 12px;}
    .skmw-loading{margin-top:16px;text-align:center;}
    .skmw-progress{width:100%;height:8px;background:#e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:10px;}
    .skmw-progress-bar{height:100%;background:linear-gradient(90deg, ${BRAND}, ${INK});background-size:200% 100%;animation:skmw-progress-anim 1.5s ease-in-out infinite;}
    @keyframes skmw-progress-anim{0%{background-position:100% 0;}100%{background-position:0 0;}}
    .skmw-loading-text{font-size:13px;color:#6b7280;margin:0;font-weight:500;}
    .skmw-res{display:none;margin-top:14px;}
    .skmw-pop{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:520px;max-width:92vw;max-height:80vh;overflow:auto;background:#fff;color:#0A0A0A;border:2px solid ${INK};border-radius:14px;box-shadow:6px 6px 0 rgba(0,0,0,.12);z-index:2147482999;font-family:ui-sans-serif,system-ui,sans-serif;}
    .skmw-pop-h{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1.5px solid #f3f4f6;position:sticky;top:0;background:#fff;cursor:move;user-select:none;}
    .skmw-pop-h h3{margin:0;font-size:15px;pointer-events:none;}
    .skmw-pop-x{background:none;border:none;font-size:18px;cursor:pointer;color:#6b7280;}
    /* Edit form inside the popup: proper form styling (the generic form CSS
       is scoped to .skmw-modal, which the popup is not). */
    .skmw-pop label{display:block;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px;color:#374151;}
    .skmw-pop textarea{width:100%;box-sizing:border-box;min-height:150px;padding:10px 12px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;line-height:1.5;color:#0A0A0A;background:#fff;resize:vertical;}
    .skmw-pop textarea:focus,.skmw-pop input[type=text]:focus,.skmw-pop .skmw-dt:focus{outline:none;border-color:${BRAND};}
    .skmw-pop input[type=text]{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;color:#0A0A0A;background:#fff;}
    .skmw-pop .skmw-dt{width:100%;box-sizing:border-box;margin-top:2px;}
    .skmw-pop .skmw-edit-header{margin-bottom:4px;}
    .skmw-pop .skmw-edit-header h3{margin:0;font-size:15px;color:#0A0A0A;flex:1;}
    .skmw-pop .skmw-edit-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1.5px solid #f3f4f6;}
    .skmw-pop.editing{width:520px;}
    .skmw-pop .skmw-ac{display:inline-flex;margin:0;}
    .skmw-pop.editing #skmw-list{padding:8px 14px 14px;}
    /* Cap the popup height: ~7 items, then internal scroll — the panel must
       not grow into a wall of Sent posts (2026-10-25). */
    .skmw-pop:not(.editing) #skmw-list{max-height:455px;overflow-y:auto;}
    .skmw-scroll-hint{position:sticky;bottom:2px;display:none;justify-content:center;pointer-events:none;margin-top:-10px;}
    .skmw-scroll-hint span{background:rgba(243,244,246,.8);backdrop-filter:blur(2px);border:1px solid #e5e7eb;border-radius:999px;padding:2px 12px;font-size:12px;font-weight:800;color:#6b7280;box-shadow:0 -6px 10px -6px rgba(0,0,0,.18);}
    #skmw-in{min-height:200px;}
    .skmw-s-toprow{display:flex;gap:10px;}
    .skmw-s-toprow .col1{flex:1;min-width:0;}
    .skmw-s-toprow .col2{width:190px;flex-shrink:0;}
    .skmw-s-toprow input{width:100%;box-sizing:border-box;}
    .skmw-linkrow{display:flex;align-items:center;gap:8px;margin-top:6px;}
    .skmw-linkrow input[type=checkbox]{margin:0;accent-color:${BRAND};cursor:pointer;flex-shrink:0;}
    .skmw-linkrow input[type=text]{flex:1;min-width:0;box-sizing:border-box;padding:8px 10px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;color:${INK};background:#fff;}
    .skmw-linkrow input[type=text]:focus{outline:none;border-color:${BRAND};}
    .skmw-addlink{margin-top:8px;padding:6px 12px;border:1.5px dashed #d1d5db;background:#fff;border-radius:8px;font-size:12px;font-weight:700;color:#6b7280;cursor:pointer;font-family:inherit;}
    .skmw-addlink:hover{border-color:${BRAND};color:${BRAND};}
    .skmw-presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
    .skmw-modal label.skmw-row{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;text-transform:none;letter-spacing:0;line-height:1.2;margin:0;}
    .skmw-pop label.skmw-row{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;text-transform:none;letter-spacing:0;line-height:1.2;}
    .skmw-when-row{display:flex;gap:14px;align-items:center;margin-top:14px;}
    .skmw-when-left{width:225px;flex-shrink:0;}
    .skmw-when-left label{margin:0 0 4px;}
    .skmw-when-left .skmw-cal-toggle{width:100%;box-sizing:border-box;padding:8px 10px;font-size:13px;font-weight:600;line-height:1.2;}
    .skmw-when-right{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;align-self:center;}
    .skmw-when-right .skmw-row{min-height:20px;}
    .skmw-cal-time{display:flex;gap:6px;padding:8px 10px;border-top:1px solid #e5e7eb;}
    .skmw-cal-timeinp{width:100%;box-sizing:border-box;padding:6px 8px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;background:#fff;color:${INK};text-align:center;}
    .skmw-cal-timeinp:focus{outline:none;border-color:${BRAND};}
    .skmw-pop.editing textarea{min-height:160px;}
    .skmw-tabs{display:flex;gap:4px;padding:8px 10px 10px;}
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
    .skmw-grp{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;max-width:45%;}
    .skmw-grp-ic{width:18px;height:18px;border-radius:50%;background:${BRAND};color:#fff;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;text-transform:uppercase;flex-shrink:0;}
    .skmw-grp a{color:#7c3aed;text-decoration:none;font-weight:600;}
    .skmw-grp a:hover{text-decoration:underline;}
    .skmw-cd{font-weight:700;color:#7c3aed;white-space:nowrap;}
    .skmw-x{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:14px;line-height:1;padding:0 2px;float:right;}
    .skmw-x:hover{color:#dc2626;}
    .skmw-ac{display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;color:#6b7280;margin-right:14px;white-space:nowrap;font-weight:600;}
    .skmw-ac input{margin:0;cursor:pointer;}
    .skmw-empty{padding:30px 14px;text-align:center;color:#9ca3af;font-size:13px;}
    .skmw-empty .skmw-btn{margin-top:14px;}
    .skmw-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${INK};color:#fff;padding:12px 22px;border-radius:12px;border:2px solid ${INK};font-weight:700;font-size:14px;z-index:2147483010;box-shadow:0 4px 0 rgba(0,0,0,.15);font-family:ui-sans-serif,system-ui,sans-serif;}
    /* Compact Schedule button that fits inside Skool's composer button row */
    .skmw-s-inline{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;background:#fff;color:#374151;border:1.5px solid #d1d5db;border-radius:8px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;font-weight:700;cursor:pointer;margin:0 6px;line-height:1;transition:background .12s,border-color .12s;}
    .skmw-s-inline:hover{background:#f9fafb;border-color:#9ca3af;}
    /* Schedule dialog: presets, publish time, notify */
    .skmw-presets{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
    .skmw-preset{padding:6px 10px;background:#fff;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#374151;}
    .skmw-preset:hover{border-color:${BRAND};color:${INK};}
    .skmw-preset.active{background:${BRAND};border-color:${INK};color:${INK};}
    .skmw-modal label.skmw-gif,.skmw-gif{display:inline-flex;align-items:center;gap:10px;min-height:20px;line-height:1;margin:16px 0 0;font-size:12px;font-weight:700;color:#374151;cursor:pointer;text-transform:none;letter-spacing:0;}
    .skmw-gif input{width:16px;height:16px;margin:0;flex-shrink:0;accent-color:${BRAND};cursor:pointer;}
    .skmw-ctx-count{margin-left:auto;padding:4px 6px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:12px;font-family:inherit;background:#fff;color:#374151;cursor:pointer;}
    .skmw-ctx-count:disabled{opacity:.5;cursor:not-allowed;}
    /* Schedule modal: single column at every width (matches the approved mock) */
    .skmw-modal-wide{max-width:520px;}
    .skmw-sched-cols{display:flex;flex-direction:column;gap:16px;}
    .skmw-sched-left{min-width:0;display:flex;flex-direction:column;gap:6px;}
    .skmw-sched-left>label{display:flex;align-items:center;min-height:24px;margin:0;font-weight:600;font-size:13px;color:#374151;text-transform:none;}
    .skmw-sched-left>label>span{margin-left:4px;font-weight:400;color:#9ca3af;text-transform:none;}
    .skmw-sched-left>textarea{width:100%;box-sizing:border-box;min-height:200px;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;line-height:1.5;color:#0A0A0A;background:#fff;margin-top:4px;resize:vertical;overflow:auto;}
    .skmw-sched-right{min-width:0;}
    .skmw-sched-right h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;}
    .skmw-sched-right h4:not(:first-child){margin-top:16px;}
    .skmw-dt{width:100%;box-sizing:border-box;padding:9px 10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;color:#0A0A0A;background:#fff;margin-top:2px;}
    .skmw-dt:focus{outline:none;border-color:${BRAND};}
    .skmw-timeslot{width:100%;padding:9px 10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;margin-top:6px;}
    .skmw-past-note{font-size:11px;color:#dc2626;margin-top:6px;display:none;}
    .skmw-cal{margin-top:10px;border:2px solid #e5e7eb;border-radius:10px;padding:8px;background:#fff;}
    .skmw-cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
    .skmw-cal-m{font-size:13px;font-weight:800;color:${INK};}
    .skmw-cal-nav{border:none;background:#F3F4F6;border-radius:8px;width:24px;height:24px;font-size:14px;cursor:pointer;line-height:1;color:${INK};padding:0;}
    .skmw-cal-nav:hover{background:#e5e7eb;}
    .skmw-cal-w{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:2px;}
    .skmw-cal-wd{font-size:10px;font-weight:700;color:#9ca3af;text-align:center;padding:2px 0;}
    .skmw-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
    .skmw-cal-d{border:none;background:transparent;border-radius:7px;font-size:12px;font-weight:600;color:${INK};padding:5px 0;cursor:pointer;font-family:inherit;}
    .skmw-cal-d:hover{background:${BRAND}22;}
    .skmw-cal-pad{visibility:hidden;}
    .skmw-cal-off{color:#d1d5db;cursor:default;}
    .skmw-cal-off:hover{background:transparent;}
    .skmw-cal-sel,.skmw-cal-sel:hover{background:${BRAND};color:${INK};}
    .skmw-cal-today:not(.skmw-cal-sel){box-shadow:inset 0 0 0 1.5px #e5e7eb;}
    .skmw-cal-wrap{position:relative;margin-top:8px;}
    .skmw-cal-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:2px solid #e5e7eb;border-radius:999px;background:#fff;font-size:12px;font-weight:700;color:${INK};cursor:pointer;font-family:inherit;}
    .skmw-cal-toggle:hover{border-color:${BRAND};}
    .skmw-cal-pop{position:absolute;top:calc(100% + 6px);left:0;z-index:10002;width:250px;margin-top:0;box-shadow:0 12px 28px rgba(0,0,0,.18);}
    .skmw-links{width:100%;box-sizing:border-box;min-height:56px;padding:8px 10px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;line-height:1.4;color:${INK};background:#fff;resize:vertical;margin-top:2px;}
    .skmw-links:focus{outline:none;border-color:${BRAND};}
    /* Generic textarea rules (.skmw-modal 120px / .skmw-pop 150px) outrank
       .skmw-links by specificity and inflated the links field — pin it. */
    .skmw-modal textarea.skmw-links,.skmw-pop textarea.skmw-links{min-height:56px;max-height:140px;}
    .skmw-chip{display:inline-flex;align-items:center;gap:6px;width:fit-content;max-width:100%;box-sizing:border-box;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;line-height:1.4;margin:0 0 10px;}
    .skmw-chip-ok{background:#DCFCE7;border:1px solid #16A34A;color:#166534;}
    .skmw-chip-warn{background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;}
    .skmw-edit-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
    .skmw-btn-back{background:none;border:none;color:#6b7280;font-size:13px;font-weight:600;cursor:pointer;padding:4px 8px;border-radius:6px;}
    .skmw-btn-back:hover{background:#f3f4f6;color:${INK};}
    .skmw-edit-header h3{margin:0;font-size:15px;color:#0A0A0A;flex:1;}
    .skmw-edit-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1.5px solid #f3f4f6;}
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
    
    const scheduled = el(`<button class="skmw-btn skmw-scheduled" style="margin-left:8px;">📅 Scheduled<span class="b zero">0</span></button>`);
    scheduled.addEventListener('click', (e) => { e.stopPropagation(); toggleCalendar(); });
    anchor.parentNode.insertBefore(scheduled, magic.nextSibling);
    // SPA community switches re-render the topbar and this observer re-injects
    // the button with a fresh hidden '0' badge; sync it from the already-loaded
    // state instead of waiting for the next 120s poll.
    updateBadge();
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
    const body = editorText(editor);
    const title = titleInput ? titleInput.value.trim() : '';

    // Save to localStorage for restoration on cancel
    const communityKey = location.href;
    localStorage.setItem('skmw_saved_title_' + communityKey, title);
    localStorage.setItem('skmw_saved_body_' + communityKey, body);

    // Body only — the dialog reads the title from the composer's Title input
    // on its own; concatenating it here duplicated it as the content's first
    // line (published posts showed "Title\n\nTitle\n\n...", 2026-10-25).
    openScheduleDialog(null, body);
  });
  // Insert right after Cancel: [Cancel] [📅 Schedule] [Post wrapper]
  actionRow.insertBefore(btn, cancelBtn.nextSibling);
}
// ---------------------------------------------------------------------------
// MAGIC POST DIALOG
// ---------------------------------------------------------------------------
let dialogOpen = false;
async function openMagicDialog() {
  if (dialogOpen) return;
  dialogOpen = true;

  const overlay = el(`<div class="skmw-overlay"></div>`);
  const modal = el(`<div class="skmw-modal">
    <h2>✨ Magic Post Writer</h2>
    <div id="skmw-trial" class="skmw-trial" style="display:none"></div>
    <p class="sub">Paste raw thoughts — AI turns them into a post ready to drop into Skool.</p>
    <label>Your thoughts</label>
    <textarea id="skmw-in" placeholder="Bullet points, links, rough ideas..."></textarea>
    <label class="skmw-gif"><input type="checkbox" id="skmw-title" checked>Generate a catchy title (first line)</label>
    <label class="skmw-gif"><input type="checkbox" id="skmw-magic-gif">🎬 Attach a relevant GIF when inserting</label>
    <label class="skmw-gif skmw-ctx" id="skmw-ctx-wrap" title="🔒 Pro feature — requires an active subscription">
      <input type="checkbox" id="skmw-ctx">📚 Use recent community posts as context
      <select id="skmw-ctx-count" class="skmw-ctx-count">
        <option value="10" selected>10 posts</option>
        <option value="20">20 posts</option>
        <option value="30">30 posts</option>
      </select>
    </label>
    <label class="skmw-gif">📏 Post length
      <select id="skmw-len" class="skmw-ctx-count">
        <option value="short">Short (~150 chars)</option>
        <option value="medium" selected>Medium</option>
        <option value="long">Long (~1200-1800 chars)</option>
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
  makeDraggable(modal, 'skmw_pos_magic', '.skmw-modal h2');
  setTimeout(() => document.getElementById('skmw-in').focus(), 60);

  // Pro gate: community-context checkbox only for active subscribers.
  // Server re-checks anyway (/ai/generate returns pro_feature_required).
  checkProAccess().then((acc) => {
    const wrap = document.getElementById('skmw-ctx-wrap');
    const cb = document.getElementById('skmw-ctx');
    const sel = document.getElementById('skmw-ctx-count');
    const pro = !!(acc && acc.pro);
    if (wrap && !pro) {
      cb.disabled = true;
      sel.disabled = true;
      wrap.style.opacity = '.5';
      wrap.title = '🔒 Pro feature — requires an active subscription';
    }
    // Trial badge under the dialog title
    const badge = document.getElementById('skmw-trial');
    if (!badge || !acc) return;
    if (acc.state === 'trial') {
      badge.innerHTML = `🆓 Trial: ${acc.posts_used ?? 0}/${acc.posts_limit ?? 5} posts`;
      badge.style.display = 'block';
    } else if (acc.state === 'trial_expired') {
      const url = acc.subscribe_url || window.__skmwSubUrl || 'https://www.skool.com';
      badge.innerHTML = `🔒 Trial over — subscribe to keep creating · <a href="${url}" target="_blank" rel="noopener" style="color:#DB2777;text-decoration:underline;font-weight:600">Join the community</a>`;
      badge.style.display = 'block';
    } else if (acc.state === 'subscribed') {
      badge.innerHTML = '⭐ Full access';
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none'; // gate_disabled / unknown
    }
  });

  const close = () => { overlay.remove(); dialogOpen = false; };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('skmw-cancel').addEventListener('click', close);

  const run = async () => {
    const input = document.getElementById('skmw-in').value.trim();
    const wantTitle = document.getElementById('skmw-title').checked;
    if (!input) { showErr('Write something first.'); return; }
    const lenSel = document.getElementById('skmw-len')?.value || 'medium';
    const lenHint = lenSel === 'short'
      ? ' The final post must be SHORT — about 150 characters, 1-2 sentences, no fluff.'
      : lenSel === 'long'
        ? ' The final post must be LONG and detailed — about 1200-1800 characters, several paragraphs.'
        : '';
    const prompt = (wantTitle
      ? `Write a community post with a catchy short title (2-6 words) at the top, then the post content. Plain text only, no markdown. Output ONLY the finished post: the title on the first line, a blank line, then the content. Do not include any notes, planning, or commentary. Here are the thoughts:\n\n${input}`
      : `Write a community post. Plain text only, no markdown. Output ONLY the finished post, no notes, planning, or commentary. Here are the thoughts:\n\n${input}`) + lenHint;
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
        const maxPosts = parseInt(document.getElementById('skmw-ctx-count').value || '10', 10);
        if (loadingText) loadingText.textContent = '📚 Collecting recent community posts...';
        communityContext = await collectCommunityContext(maxPosts);
        if (loadingText) loadingText.textContent = '✨ Generating your post...';
      }
      const body = { prompt, language: (navigator.language || 'en').split('-')[0].toLowerCase() };
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
let __skmwProCache = null; // { at: epoch_ms, access: {pro, state, posts_used, posts_limit, subscribe_url} }

async function checkProAccess() {
  // /ai/access is cheap, but no need to call it on every dialog open.
  // Returns the full response (not just the boolean) for the trial badge.
  const now = Date.now();
  if (__skmwProCache && now - __skmwProCache.at < 5 * 60 * 1000) return __skmwProCache.access;
  let access = { pro: false, state: 'unknown' };
  try {
    const data = await apiRequest('/ai/access');
    if (data && typeof data === 'object') access = data;
  } catch (e) {
    console.warn('[skmw] /ai/access failed:', e && e.message);
  }
  __skmwProCache = { at: now, access };
  return access;
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
    lastGifTerm = searchQuery;
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
  // Paragraphs keep a blank line between them, but consecutive list items
  // (bullets / numbers) join with a single line break — otherwise every item
  // renders with a paragraph gap and the list looks broken up.
  const isListItem = (l) => /^(?:[•·▪‣]|[-*+]\s|\d+[.)]\s)/.test(l);
  const joinBody = (arr) => arr.reduce((acc, l, i) =>
    i === 0 ? l : acc + (isListItem(l) && isListItem(arr[i - 1]) ? '\n' : '\n\n') + l, '');
  const body = hasTitle ? joinBody(lines.slice(1)) : text;

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
// Shared media description used by both edit surfaces (module scope —
// renderEditForm cannot see function-local consts).
const gifDesc = (u, term) => u
  ? escapeHtml(u.slice(0, 60)) + (u.length > 60 ? '…' : '')
  : `search fallback “${escapeHtml(term || '')}”`;
async function openScheduleDialog(post = null, prefillText = null) {
  if (dialogOpen) return;
  dialogOpen = true;
  const slug = getSlug();
  const isEdit = !!post;

  let content = '';
  if (isEdit) content = post.content || '';
  else if (prefillText) content = prefillText;
  else { const ed = findEditor(); content = editorText(ed); }

  // Title: first-class column now; legacy rows kept it as content's first
  // line (≤120 chars) — extract it so it edits separately and publishes
  // via the title column. Create mode captures the composer's title input.
  let schedTitle = '';
  if (isEdit) {
    schedTitle = (post.title || '').trim();
    if (!schedTitle && content.includes('\n')) {
      const firstLine = content.split('\n', 1)[0].trim();
      if (firstLine && firstLine.length <= 120) {
        schedTitle = firstLine;
        content = content.split('\n').slice(1).join('\n').trim();
      }
    }
  } else {
    schedTitle = (findTitleInput()?.value || '').trim();
  }
  // Default: now + 15 minutes for new posts (user request 2026-10-25).
  let chosen = post ? new Date(post.scheduled_for) : defaultScheduleTime();
  if (isNaN(chosen.getTime())) chosen = defaultScheduleTime();


  // Capture the composer GIF once, before the dialog can close the composer —
  // the save handler reuses this snapshot instead of re-querying the DOM.
  const composerGif = isEdit ? null : findComposerGif();
  const composerTopic = findComposerTopic();
  const composerEmailOn = isEdit ? false : await findComposerEmailOn();
  // Video links captured from the composer seed the checkbox link rows.
  const openVideoLinks = isEdit ? [] : (captureComposerMediaUrls(composerGif).videoLinks || []);

  const hasComposerMedia = !!(findEditor() && findEditor().querySelector('img, video'));
  const gifSavedNote = composerGif || lastGifTerm;
  // Media note for edit mode: exact GIF URL or its search fallback.
  const editGifNote = (isEdit && (post?.media_url || post?.gif_search))
    ? `<div class="skmw-chip skmw-chip-ok">🎬 GIF: ${gifDesc(post?.media_url, post?.gif_search)}</div>`
    : '';
  const overlay = el(`<div class="skmw-overlay"></div>`);
  const modal = el(`<div class="skmw-modal skmw-modal-wide">
    <h2>${isEdit ? '✏️ Edit scheduled post' : '📅 Schedule post'}</h2>
    <p class="sub">${isEdit ? 'Update the post or its publish time.' : 'Publishes automatically at the chosen time — as you, in this community.'}</p>
    ${!isEdit ? (gifSavedNote ? '<div class="skmw-chip skmw-chip-ok">🎬 GIF will be saved with this post</div>' : (hasComposerMedia ? '<div class="skmw-chip skmw-chip-warn">⚠️ Only 🎬-picked GIFs carry over — uploaded files won\'t</div>' : '')) : editGifNote}
    <div class="skmw-sched-cols">
      <div class="skmw-sched-left">
        <div class="skmw-s-toprow">
          <div class="col1"><label>Title</label><input type="text" id="skmw-s-title" value="${escapeHtml(schedTitle)}" placeholder="Post title"></div>
          <div class="col2"><label>Topic</label><input type="text" id="skmw-s-topic" list="skmw-topic-options" value="${escapeHtml(composerTopic)}" placeholder="(group default)"><datalist id="skmw-topic-options">${composerTopic ? `<option value="${escapeHtml(composerTopic)}">` : ''}</datalist></div>
        </div>
        <label style="margin-top:14px;">Post content</label><textarea id="skmw-s-content" placeholder="Write your post...">${escapeHtml(content)}</textarea>
      </div>
      <div class="skmw-sched-right">
        <h4>Quick schedule</h4>
        <div class="skmw-presets" id="skmw-s-presets"></div>
        <div class="skmw-when-row">
          <div class="skmw-when-left">
            <label style="display:block;">Publish at</label>
            <div id="skmw-s-cal"></div>
          </div>
          <div class="skmw-when-right">
            ${(composerGif || lastGifTerm) ? `<label class="skmw-row" style="cursor:pointer;text-transform:none;font-weight:600;"><input type="checkbox" id="skmw-s-gif" style="margin:0;" checked> 🎬 GIF</label>` : ''}
            <label class="skmw-row" style="cursor:pointer;text-transform:none;font-weight:600;"><input type="checkbox" id="skmw-s-email" style="margin:0;"${composerEmailOn ? ' checked' : ''}> 📧 Send email to all members</label>
            <label class="skmw-row" style="cursor:pointer;text-transform:none;font-weight:600;"><input type="checkbox" id="skmw-s-ntf" style="margin:0;"> 🔔 Notify when it goes out</label>
          </div>
        </div>
        <div class="skmw-past-note" id="skmw-s-past">⚠️ Can't schedule in the past — pick a future time.</div>
        <label style="margin-top:14px;">Links <span style="text-transform:none;font-weight:400;color:#9ca3af;">(uncheck to exclude)</span></label>
        <div id="skmw-s-linklist"></div>
        <button type="button" class="skmw-addlink" id="skmw-s-addlink">＋ Add link</button>
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
  makeDraggable(modal, 'skmw_pos_sched', '.skmw-modal');
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


  const $past = document.getElementById('skmw-s-past');

  function syncFromChosen() {
    $past.style.display = chosen.getTime() < Date.now() ? 'block' : 'none';
  }

  // Month calendar wired both ways: day click → chosen (+input), manual
  // input edit → chosen (+calendar).
  const sCal = mountPopupCalendar(document.getElementById('skmw-s-cal'), () => chosen, (d) => { chosen = d; syncFromChosen(); });

  // Checkbox link rows: each captured/manual URL participates in the
  // publication only while its checkbox is checked; edit the text to swap
  // a URL, ＋ adds an empty row.
  const linkList = document.getElementById('skmw-s-linklist');
  // Anti-spam UI cap: at most 3 link rows per post.
  const addLinkRow = (url) => {
    if (linkList.children.length >= 3) return;
    const row = el(`<div class="skmw-linkrow"><input type="checkbox" checked><input type="text" placeholder="https://youtu.be/..." value="${escapeHtml(url || '')}"></div>`);
    linkList.appendChild(row);
  };
  openVideoLinks.slice(0, 3).forEach(addLinkRow);
  document.getElementById('skmw-s-addlink').addEventListener('click', () => {
    if (linkList.children.length >= 3) { toast('⚠️ Max 3 links per post'); return; }
    addLinkRow('');
  });

  const $ntf = document.getElementById('skmw-s-ntf');
  if ($ntf) {
    notifyEnabled((on) => { $ntf.checked = on; });
    $ntf.addEventListener('change', () => { try { chrome.storage.local.set({ skmw_notify: $ntf.checked }); } catch (_) {} });
  }

  const presets = [
    { label: '⚡ In 1 hour', at: () => new Date(Date.now() + 3600 * 1000) },
    { label: '🌅 Today 18:00', at: () => atToday(18, 0) },
    { label: '☀️ Tomorrow 9:00', at: () => atDayOffset(1, 9, 0) },
    { label: '📆 Tomorrow 12:00', at: () => atDayOffset(1, 12, 0) },
    { label: '🌙 Tomorrow 18:00', at: () => atDayOffset(1, 18, 0) },
    { label: '➕ In 1 week', at: () => new Date(Date.now() + 7 * 24 * 3600 * 1000) },
    { label: '🌆 Today 21:00', at: () => atToday(21, 0) },
    { label: '📅 Monday 9:00', at: () => { const d = new Date(); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); d.setHours(9, 0, 0, 0); return d; } },
  ];
  const $presets = document.getElementById('skmw-s-presets');
  presets.forEach((p) => {
    const b = el(`<button class="skmw-preset" type="button">${p.label}</button>`);
    b.addEventListener('click', () => { chosen = p.at(); syncFromChosen(); sCal.refresh(); });
    $presets.appendChild(b);
  });

  syncFromChosen();


  document.getElementById('skmw-s-save').addEventListener('click', async () => {
    console.log('[skmw] schedule save clicked', { isEdit, id: post?.id, chosen: chosen.toISOString() });
    const finalContent = document.getElementById('skmw-s-content').value.trim();
    if (!finalContent) return showErr('Post content is empty.');
    const titleVal = document.getElementById('skmw-s-title').value.trim();
    if (!titleVal) return showErr('Post title is empty.');
    if (chosen.getTime() < Date.now()) return showErr('Pick a time in the future.');
    const btn = document.getElementById('skmw-s-save');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
    hideErr();
    try {
      // GIF: the 🎬 checkbox is the user's explicit yes/no — unchecked means
      // no GIF and no search fallback even if the composer has one.
      // Re-query at Save: the composer may have gained media after the
      // dialog opened (native picker lands in the attachments root).
      const gifChecked = !!document.getElementById('skmw-s-gif')?.checked;
      const gifUrl = gifChecked ? (isEdit ? (post?.media_url || null) : (composerGif || findComposerGif())) : null;
      const ed = findEditor();
      // Loose presence check is safe: lastGifTerm is only set by OUR successful
      // insertGif, so any img/video in the composer right after attaching a GIF
      // means the user's GIF is there. Skool rehosts GIFs (webp/mp4/CDN URLs),
      // so sniffing .gif srcs misses most of them. Worst case: the publisher's
      // search fallback attaches a search-GIF — strictly better than no GIF.
      const gifNodePresent = !!(ed && ed.querySelector('img, video'));
      const gifPresent = !!gifUrl || (gifChecked && !isEdit && !!lastGifTerm && gifNodePresent);
      const gifSearch = gifUrl
        ? gifTermFrom(finalContent)
        : (gifPresent ? (lastGifTerm || gifTermFrom(finalContent)) : null);
      // Attachments + links: images dropped in the composer are captured from
      // the attachments root; GIF already rides media_url (excluded); video
      // links added via the composer's native "Add video" are auto-captured
      // (intercepted input, trimmed to the live video cards); Links textarea
      // lines (embed or file URLs) ride along as before.
      const captured = captureComposerMediaUrls(gifUrl);
      // Links: only rows with a checked box ride along; the URL text is
      // editable, so pasting a new URL into a row replaces the old one.
      const rowUrls = [...document.querySelectorAll('#skmw-s-linklist .skmw-linkrow')]
        .filter((r) => r.querySelector('input[type="checkbox"]').checked)
        .map((r) => (r.querySelector('input[type="text"]').value || '').trim())
        .filter((v) => /^https?:\/\//i.test(v));
      const mediaUrls = [...new Set([...captured.urls, ...rowUrls])];
      if (!isEdit && captured.hasVideo && !rowUrls.length && !mediaUrls.some((u) => /\.(mp4|webm|mov|avi|mkv)([?#]|$)/i.test(u))) {
        toast('⚠️ video: paste its URL in Links');
      }
      let emailMembers = !!document.getElementById('skmw-s-email')?.checked;
      if (emailMembers && !confirm('Also email this post to ALL members?')) {
        emailMembers = false;
        const $em = document.getElementById('skmw-s-email');
        if ($em) $em.checked = false;
      }
      // Publishes into the community the post was written in; the server
      // re-checks access via the stored JWT at publish time.
      const body = { content: finalContent, title: titleVal, scheduled_for: chosen.toISOString(), community_slug: slug, community_url: location.href, category: (document.getElementById('skmw-s-topic')?.value || '').trim(), gif_search: gifSearch, media_url: gifUrl, media_urls: mediaUrls.length ? mediaUrls : null, email_members: emailMembers, language: (navigator.language || 'en').split('-')[0].toLowerCase() };
      if (isEdit && post?.id) {
        // PUT must NOT send language: absent field → exclude_unset → stored lang preserved
        const { language: _langOmitted, ...putBody } = body;
        await apiRequest('/scheduled-posts', { method: 'PUT', body: { ...putBody, id: post.id } });
      }
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
  function showErr(m) {
    const e = document.getElementById('skmw-s-err');
    if (String(m).includes('subscription_required')) {
      const url = window.__skmwSubUrl || 'https://www.skool.com';
      e.innerHTML = '🔒 Нужна подписка. <a href="' + url + '" target="_blank" rel="noopener" style="color:#FF90E8;text-decoration:underline;font-weight:600">Вступить в сообщество →</a>';
    } else if (String(m).includes('scheduled_limit')) {
      e.textContent = '🗓 Лимит: максимум 7 отложенных постов одновременно. Дождись публикации или удали лишние в списке 📅.';
    } else {
      e.textContent = m;
    }
    e.style.display = 'block';
  }
  function hideErr() { document.getElementById('skmw-s-err').style.display = 'none'; }
}

// ---- schedule dialog helpers ----
function defaultScheduleTime() { const d = new Date(Date.now() + 15 * 60 * 1000); d.setSeconds(0, 0); return d; }
function toDtLocal(d) { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function atToday(h, m) { const d = new Date(); d.setHours(h, m, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d; }
function atDayOffset(days, h, m) { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d; }
function nearestMin(m) { return [0, 15, 30, 45].reduce((b, x) => Math.abs(x - m) < Math.abs(b - m) ? x : b, 0); }
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtCd(ms) { const m = Math.floor(ms / 60000); const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; }
// Notification setting: default ON (undefined → enabled)
function notifyEnabled(cb) {
  try { chrome.storage.local.get(['skmw_notify'], (r) => cb(r ? r.skmw_notify !== false : true)); }
  catch (_) { cb(true); }
}
// One chime per published post — across polls AND across tabs (each tab has
// its own JS world, so the sent-mark lives in chrome.storage).
const _notifiedPublish = new Set();
function shouldNotifyPublish(id, cb) {
  if (_notifiedPublish.has(id)) return cb(false);
  const key = 'skmw_ntf_' + id;
  try {
    chrome.storage.local.get([key], (r) => {
      if (r && r[key]) { _notifiedPublish.add(id); return cb(false); }
      _notifiedPublish.add(id);
      try { chrome.storage.local.set({ [key]: 1 }); } catch (_) {}
      cb(true);
    });
  } catch (_) { cb(true); }
}
function ding() {
  // Bundled pencil-sound chime (user-provided WAV). Audio elements load
  // chrome-extension:// resources, so the file must stay listed in
  // manifest web_accessible_resources. Silent-fails under autoplay policy.
  try {
    const a = new Audio(chrome.runtime.getURL('pencil_sound.wav'));
    a.volume = 0.9;
    a.play().catch(() => {});
  } catch (_) {}
}
function notifyPublished(post) {
  const what = (post.title || (post.content || '').split('\n')[0] || 'Your post').slice(0, 90);
  try { toast(`✅ Published: ${what}`); } catch (_) {}
  try { chrome.runtime.sendMessage({ type: 'SKMW_NOTIFY', title: chrome.i18n.getMessage('extName') || 'Skool Magic Writer', message: `Post published: ${what}` }, () => void chrome.runtime.lastError); } catch (_) {}
  ding();
}
function gifTermFrom(text) {
  const stop = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'what', 'when', 'post', 'about', 'more', 'some', 'into', 'just', 'also', 'like', 'than', 'then', 'them', 'they', 'will', 'your', 'very', 'the', 'and', 'for', 'are', 'you', 'how', 'why']);
  const words = (text || '').toLowerCase().match(/[a-z]{4,}/g) || [];
  return words.find((w) => !stop.has(w)) || 'success';
}
// Видео-ссылки, введённые через нативный Add video (карточка
// .skool-video-attachment не содержит URL в DOM — перехватываем ввод).
const composerVideoLinks = [];

// Find the media currently inserted in the Skool composer, if any. Returns
// the asset URL so the scheduled publisher can re-attach the exact same GIF.
// Native picker picks land as re-hosted imgs (assets.skool.com, no .gif
// extension) or as <video> mp4 — so scan ANY visible media, preference-
// ordered: explicit .gif imgs, giphy/tenor imgs, any img, then videos.
function findComposerGif() {
  const editor = findEditor();
  if (!editor) return null;
  const visible = (n) => { const r = n.getBoundingClientRect(); return r.width >= 50 && r.height >= 50; };
  const srcOf = (n) => n.currentSrc || n.src || '';
  const pools = [
    editor.querySelectorAll('img[src*=".gif" i]'),
    editor.querySelectorAll('img[src*="giphy"], img[src*="tenor"]'),
    editor.querySelectorAll('img'),
    editor.querySelectorAll('video'),
  ];
  for (const pool of pools) {
    for (const n of pool) {
      if (!visible(n)) continue;
      const s = n.tagName === 'VIDEO' ? (srcOf(n) || n.poster || '') : srcOf(n);
      if (s && !s.startsWith('data:')) return s;
    }
  }
  // Native "Add gif" / dropped attachments live OUTSIDE the editor as cards
  // in the attachments root (2026-10-25: a picker GIF is a bg-image DIV with
  // NO <img> child). Scan the root after the editor or the GIF silently
  // vanishes from the scheduled post.
  const root = document.querySelector('.skool-attachments-root');
  if (root) {
    const bgOf = (n) => {
      const m = (getComputedStyle(n).backgroundImage || '').match(/url\(["']?([^"')]+)["']?\)/);
      return m ? m[1] : '';
    };
    for (const n of [...root.querySelectorAll('img, video'), ...root.querySelectorAll('[style*="background-image" i], .skool-attachment')]) {
      if (!visible(n)) continue;
      const s = n.tagName === 'VIDEO' ? (n.currentSrc || n.poster || '') : (n.tagName === 'IMG' ? srcOf(n) : bgOf(n));
      if (s && !s.startsWith('data:')) return s;
    }
  }
  return null;
}

// Current topic of the open composer: the unlabeled button right before
// Cancel in the composer footer (order: … [topic] [Cancel] [Post];
// user-supplied DOM ground truth 2026-10-25). Empty string when not found.
function findComposerTopic() {
  const vis = (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const btns = [...document.querySelectorAll('button')].filter(vis);
  const ci = btns.findIndex((b) => (b.textContent || '').trim() === 'Cancel');
  if (ci < 0) return '';
  for (let i = ci - 1; i >= 0; i--) {
    const b = btns[i];
    const t = (b.textContent || '').trim();
    if (t && !b.getAttribute('aria-label') && t !== 'Post' && t.length < 40) return t;
  }
  return '';
}

// Composer's "send email to all members" lives in the caret menu of the
// textless button right after Post (button class gyEjcq — user-supplied DOM
// ground truth 2026-10-25). Its state is only readable by opening that menu:
// click, read the item, close. Best-effort — any failure returns false and
// the dialog checkbox remains the sole source of truth.
async function findComposerEmailOn() {
  const vis = (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const post = [...document.querySelectorAll('button')].find((b) => vis(b) && (b.textContent || '').trim() === 'Post');
  if (!post) return false;
  let n = post.nextElementSibling;
  let menuBtn = null;
  for (let i = 0; i < 4 && n; i++) {
    if (n.tagName === 'BUTTON' && !(n.textContent || '').trim()) { menuBtn = n; break; }
    n = n.nextElementSibling;
  }
  if (!menuBtn) return false;
  try {
    menuBtn.click();
    await new Promise((r) => setTimeout(r, 350));
    const item = [...document.querySelectorAll('[role="button"],[role="menuitem"],li,div')]
      .filter(vis)
      .find((e) => /send email to all members/i.test(e.textContent || '') && e.textContent.length < 60);
    let on = false;
    if (item) {
      const checked = item.getAttribute('aria-checked');
      if (checked != null) on = checked === 'true';
      else on = /(^|[^a-z])check|selected|active([^a-z]|$)/i.test((item.className || '').toString())
        || /[✓✔]|check/i.test(item.outerHTML.slice(0, 600));
    }
    menuBtn.click(); // close the menu without toggling anything
    document.activeElement?.blur();
    return on;
  } catch (e) {
    console.warn('[skmw] email toggle read failed:', e && e.message);
    return false;
  }
}

// One document-level capture-phase listener for the SPA lifetime. The video
// dialog only exists while open — #destination is the scope condition — and
// capture runs before the React handlers that close the dialog.
function startVideoLinkCapture() {
  document.addEventListener('click', (e) => {
    const input = document.querySelector('#destination, [data-testid="post-video-input"]');
    if (!input) return;
    const btn = e.target.closest('button');
    if (!btn || (btn.textContent || '').trim() !== 'Add') return;
    const v = (input.value || '').trim();
    if (/^https?:\/\//i.test(v) && composerVideoLinks[composerVideoLinks.length - 1] !== v) {
      composerVideoLinks.push(v);
    }
  }, true);
}

// Month-grid calendar widget shared by the schedule dialog and the edit form
// (click a day → setChosen keeps the dialog's time; the datetime input's
// change handler calls .refresh() so manual typing stays in sync).
function mountCalendar(container, getChosen, setChosen) {
  const view = new Date(getChosen());
  view.setDate(1);
  const render = () => {
    const chosen = getChosen();
    const y = view.getFullYear();
    const m = view.getMonth();
    const startDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sel = new Date(chosen);
    sel.setHours(0, 0, 0, 0);
    let cells = '';
    for (let i = 0; i < startDow; i++) cells += '<span class="skmw-cal-d skmw-cal-pad"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const past = date < today;
      const isSel = date.getTime() === sel.getTime();
      const isToday = date.getTime() === today.getTime();
      cells += `<button type="button" class="skmw-cal-d${past ? ' skmw-cal-off' : ''}${isSel ? ' skmw-cal-sel' : ''}${isToday && !isSel ? ' skmw-cal-today' : ''}" data-d="${date.getTime()}"${past ? ' disabled' : ''}>${d}</button>`;
    }
    container.innerHTML = `
      <div class="skmw-cal-h">
        <button type="button" class="skmw-cal-nav" data-nav="-1">‹</button>
        <span class="skmw-cal-m">${view.toLocaleString('en', { month: 'long', year: 'numeric' })}</span>
        <button type="button" class="skmw-cal-nav" data-nav="1">›</button>
      </div>
      <div class="skmw-cal-w">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="skmw-cal-wd">${d}</span>`).join('')}</div>
      <div class="skmw-cal-grid">${cells}</div>`;
    container.querySelectorAll('.skmw-cal-nav').forEach((b) => b.addEventListener('click', () => {
      view.setMonth(view.getMonth() + parseInt(b.dataset.nav, 10));
      render();
    }));
    container.querySelectorAll('.skmw-cal-d:not(.skmw-cal-off)').forEach((b) => b.addEventListener('click', () => {
      const d = new Date(parseInt(b.dataset.d, 10));
      const cur = getChosen();
      d.setHours(cur.getHours(), cur.getMinutes(), 0, 0);
      setChosen(d);
      render();
    }));
  };
  render();
  return { refresh: render };
}

// Compact variant of the month picker: a small toggle button, the grid pops
// up below it only while picking. The always-visible grid made both dialogs
// huge (user request 2026-10-25). Same { refresh } contract — external
// chosen changes (presets, datetime input) update label and grid.
function mountPopupCalendar(container, getChosen, setChosen) {
  const fmt = (d) => d.toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  container.classList.add('skmw-cal-wrap');
  container.innerHTML = `<button type="button" class="skmw-cal-toggle">📅 ${escapeHtml(fmt(getChosen()))}</button><div class="skmw-cal skmw-cal-pop" style="display:none"><div class="skmw-cal-time"><input type="time" class="skmw-cal-timeinp" aria-label="Time"></div><div class="skmw-cal-main"></div></div>`;
  const btn = container.querySelector('.skmw-cal-toggle');
  const pop = container.querySelector('.skmw-cal-pop');
  btn.addEventListener('click', (e) => { e.stopPropagation(); pop.style.display = pop.style.display === 'none' ? 'block' : 'none'; });
  document.addEventListener('click', (e) => { if (!container.contains(e.target)) pop.style.display = 'none'; });
  // Native time picker — same scrollers the datetime input used to give.
  const timeInp = pop.querySelector('.skmw-cal-timeinp');
  const pad2 = (n) => String(n).padStart(2, '0');
  const syncTime = () => { const c = getChosen(); timeInp.value = `${pad2(c.getHours())}:${pad2(c.getMinutes())}`; };
  const onTime = () => {
    const [h, m] = (timeInp.value || '').split(':').map((v) => parseInt(v, 10));
    if (isNaN(h) || isNaN(m)) return;
    const c = new Date(getChosen());
    c.setHours(h, m, 0, 0);
    setChosen(c);
    syncTime();
  };
  timeInp.addEventListener('change', onTime);
  const sync = () => { btn.textContent = `📅 ${fmt(getChosen())}`; syncTime(); };
  const cal = mountCalendar(pop.querySelector('.skmw-cal-main'), getChosen, (d) => { setChosen(d); sync(); });
  syncTime();
  return { refresh: () => { cal.refresh(); sync(); } };
}

// Files the user attached in the Skool composer (images land in the
// attachments root OUTSIDE the TipTap doc with assets.skool.com srcs; GIFs
// picked via 🎬 already ride media_url — pass them as excludeUrl to avoid
// double-attaching). Video-by-link carries no URL in the DOM either —
// startVideoLinkCapture intercepts the input; videoLinks are trimmed to the
// number of video cards so links typed for an earlier post in the same SPA
// session can't leak into this one.
function captureComposerMediaUrls(excludeUrl) {
  const urls = new Set();
  document.querySelectorAll('.skool-attachments-root img').forEach((img) => {
    const s = img.currentSrc || img.src || '';
    if (s.startsWith('https://assets.skool.com/')) urls.add(s);
  });
  if (excludeUrl) urls.delete(excludeUrl);
  const hasVideo = !!document.querySelector('.skool-mux-attachment, .skool-video-attachment');
  const videoCards = document.querySelectorAll('.skool-attachments-root .skool-video-attachment').length;
  const videoLinks = videoCards ? composerVideoLinks.slice(-videoCards) : [];
  return { urls: [...urls], hasVideo, videoLinks };
}

// ---------------------------------------------------------------------------
// CALENDAR POPOVER (MVP: list with tabs)
// ---------------------------------------------------------------------------
let calState = { posts: [], tab: 'upcoming', statusById: {} };
async function loadScheduled() {
  if (_contextLost) return; // extension was reloaded — stop polling silently
  try {
    const data = await apiRequest('/scheduled-posts');
    calState.posts = (data.result || data.posts || []).filter(Boolean);
    // Detect pending → published transitions (notify once per post; first
    // load after page open stays silent — no baseline to compare against)
    const prev = calState.statusById || {};
    const newly = calState.posts.filter((p) => (p.status || '') === 'published' && prev[p.id] === 'pending');
    calState.statusById = {};
    calState.posts.forEach((p) => { calState.statusById[p.id] = p.status || 'pending'; });
    if (newly.length) notifyEnabled((on) => { if (!on) return; newly.forEach((p) => shouldNotifyPublish(p.id, (ok) => { if (ok) notifyPublished(p); })); });
  } catch (e) {
    calState.posts = [];
    // Extension reloaded → the old script's chrome.runtime is dead. Same
    // handling as context loss: self-heal by reloading the tab (once).
    if (/context invalidated/i.test(e.message || '')) handleContextLost();
    else if (!_contextLost) console.warn('[skmw] load scheduled failed:', e.message);
  }
  updateBadge();
  // Auto-clean Sent rows older than 7 days when the user enabled 🧹
  try { chrome.storage.local.get(['skmw_autoclean'], (r) => { if (r && r.skmw_autoclean) autoCleanSent(false); }); } catch (_) {}
}
function updateBadge() {
  const badge = document.querySelector('.skmw-scheduled .b');
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
function makeDraggable(pop, storageKey, headerSel = '.skmw-pop-h') {
  const h = pop.querySelector(headerSel);
  if (!h) return;
  const clamp = (x, y, r) => ({
    x: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - 48)),
  });
  h.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, input, textarea, select, a, label, .skmw-presets')) return;
    e.preventDefault();
    const r = pop.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    pop.style.transform = 'none';
    pop.style.position = 'fixed';
    pop.style.margin = '0';
    const move = (ev) => {
      const c = clamp(ev.clientX - dx, ev.clientY - dy, r);
      pop.style.left = c.x + 'px';
      pop.style.top = c.y + 'px';
    };
    const up = () => {
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('mouseup', up, true);
      const c = clamp(parseFloat(pop.style.left) || r.left, parseFloat(pop.style.top) || r.top, r);
      chrome.storage.local.set({ [storageKey]: { x: c.x, y: c.y } });
    };
    document.addEventListener('mousemove', move, true);
    document.addEventListener('mouseup', up, true);
  });
  // Restore the remembered position after the popup is laid out
  chrome.storage.local.get([storageKey], (s) => {
    const p = s && s[storageKey];
    if (!p || !pop.isConnected) return;
    const r = pop.getBoundingClientRect();
    if (p.x > window.innerWidth - 80 || p.y > window.innerHeight - 60) return; // off-screen (resize) → keep centered
    const c = clamp(p.x, p.y, r);
    pop.style.position = 'fixed';
    pop.style.margin = '0';
    pop.style.transform = 'none';
    pop.style.left = c.x + 'px';
    pop.style.top = c.y + 'px';
  });
}
let _autocleanRunning = false;
async function autoCleanSent(notify) {
  if (_autocleanRunning) return;
  // Keep the 5 newest Sent posts (and anything younger than a week);
  // everything beyond that gets deleted.
  const pubs = calState.posts
    .filter((p) => (p.status || '') === 'published')
    .sort((a, b) => new Date(b.published_at || b.scheduled_for) - new Date(a.published_at || a.scheduled_for));
  const stale = pubs.filter((p, i) => i >= 5 ||
    new Date(p.published_at || p.scheduled_for).getTime() < Date.now() - 7 * 24 * 3600 * 1000);
  if (!stale.length) { if (notify) toast('🧹 Nothing to clean (keeping 5 newest sent)'); return; }
  _autocleanRunning = true;
  let n = 0;
  for (const p of stale) {
    try { await apiRequest('/scheduled-posts', { method: 'DELETE', body: { id: p.id } }); n++; }
    catch (e) { console.warn('[skmw] autoclean delete failed:', e.message); break; }
  }
  _autocleanRunning = false;
  if (n) {
    toast(`🧹 Cleaned ${n} old sent post${n > 1 ? 's' : ''}`);
    await loadScheduled();
    if (document.querySelector('.skmw-pop')) renderCalendar();
  }
}
function mountPop(pop) {
  document.body.appendChild(pop);
  // Popup is viewport-centered via CSS (top/left/transform on .skmw-pop),
  // draggable by the header — drag overrides centering and is remembered.
  makeDraggable(pop, 'skmw_pos_pop');
  const onDocClick = (e) => {
    if (!pop.isConnected) return;
    if (pop.contains(e.target) || e.target.closest?.('.skmw-scheduled')) return;
    close();
  };
  const close = () => {
    pop.remove();
    document.removeEventListener('mousedown', onDocClick, true);
  };
  pop.querySelector('.skmw-pop-x')?.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  // Click-outside closes; capture phase so Skool's handlers can't swallow it.
  document.addEventListener('mousedown', onDocClick, true);
}
function renderCalendar() {
  document.querySelector('.skmw-pop')?.remove();
  const pop = el(`<div class="skmw-pop">
    <div class="skmw-pop-h"><h3>📅 Scheduled posts</h3><span style="display:inline-flex;align-items:center;"><label class="skmw-ac" title="Keep only the 5 newest Sent posts (and none older than 7 days)">🧹<input type="checkbox" id="skmw-ac">auto-clean</label><button class="skmw-pop-x">✕</button></span></div>
    <div class="skmw-tabs">
      <div class="skmw-tab" data-tab="upcoming">Upcoming</div>
      <div class="skmw-tab" data-tab="published">Sent</div>
      <div class="skmw-tab" data-tab="failed">Failed</div>
    </div>
    <div id="skmw-list"></div>
  </div>`);
  mountPop(pop);
  const ac = pop.querySelector('#skmw-ac');
  if (ac) {
    chrome.storage.local.get(['skmw_autoclean'], (r) => { ac.checked = !!(r && r.skmw_autoclean); });
    ac.addEventListener('change', () => {
      chrome.storage.local.set({ skmw_autoclean: ac.checked });
      if (ac.checked) autoCleanSent(true);
    });
  }
  pop.querySelectorAll('.skmw-tab').forEach((t) => t.addEventListener('click', () => {
    calState.tab = t.dataset.tab; renderCalendar();
  }));
  pop.querySelector(`.skmw-tab[data-tab="${calState.tab}"]`)?.classList.add('active');
  renderList();
}
function renderList() {
  const list = document.getElementById('skmw-list');
  if (!list) return;
  document.querySelector('.skmw-pop')?.classList.remove('editing');
  const now = Date.now();
  const byTab = (p) => {
    const st = p.status || 'pending';
    if (calState.tab === 'published') return st === 'published';
    if (calState.tab === 'failed') return st === 'failed';
    return st === 'pending';
  };
  const items = calState.posts.filter(byTab).sort((a, b) => {
    // Upcoming: soonest to fire first; equal times → the newer post on top.
    // Sent/Failed: newest at the top.
    if (calState.tab !== 'upcoming') {
      return new Date(b.published_at || b.scheduled_for) - new Date(a.published_at || a.scheduled_for);
    }
    return (new Date(a.scheduled_for) - new Date(b.scheduled_for)) || (Number(b.id) - Number(a.id));
  });
  if (!items.length) {
    list.innerHTML = `<div class="skmw-empty">Nothing here yet.<br>Click 📅 Schedule next to the composer.<br><button class="skmw-btn skmw-btn-pink skmw-empty-magic" type="button">🪄 Click here to see the magic</button></div>`;
    list.querySelector('.skmw-empty-magic')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelector('.skmw-pop')?.remove();
      openMagicDialog();
    });
    return;
  }
  list.innerHTML = items.map((p) => {
    const d = new Date(p.scheduled_for);
    const st = p.status || 'pending';
    const cls = st === 'published' ? 'skmw-published' : st === 'failed' ? 'skmw-failed' : (d.getTime() < now ? 'skmw-failed' : 'skmw-pending');
    const label = st === 'published' ? 'Sent' : st === 'failed' ? 'Failed' : (d.getTime() < now ? 'Overdue' : 'Pending');
    const grp = p.community_slug
      ? `<div class="skmw-grp"><span class="skmw-grp-ic">${escapeHtml(p.community_slug.slice(0, 1))}</span><a href="${escapeHtml(p.community_url || ('https://www.skool.com/' + p.community_slug))}" target="_blank" rel="noopener" title="Open community">${escapeHtml(p.community_slug)}</a></div>`
      : '';
    const cd = st === 'pending' ? `<span class="skmw-cd" data-ts="${d.getTime()}"></span>` : '';
    const x = `<button class="skmw-x" data-id="${p.id}" title="Delete from list">✕</button>`;
    const openUrl = st === 'published' ? ` data-url="${escapeHtml(p.published_url || p.community_url || '')}"` : '';
    return `<div class="skmw-item" data-id="${p.id}"${openUrl}>
      <div class="t">${d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} <span class="skmw-pill ${cls}">${label}</span> ${cd} ${grp} ${x}</div>
      <div class="c">${(p.content || '').slice(0, 160) || '(empty)'}</div>
    </div>`;
  }).join('');

  // Semi-transparent "more below" hint: shown while the capped list
  // (~7 items) actually overflows and the user hasn't reached the bottom.
  const hint = document.createElement('div');
  hint.className = 'skmw-scroll-hint';
  hint.innerHTML = '<span>↓</span>';
  list.appendChild(hint);
  const syncHint = () => {
    const more = list.scrollHeight > list.clientHeight + 4
      && list.scrollTop + list.clientHeight < list.scrollHeight - 6;
    hint.style.display = more ? 'flex' : 'none';
  };
  list.onscroll = syncHint;
  requestAnimationFrame(syncHint);

  // Live countdown on every pending row
  const tickCd = () => {
    if (!list.isConnected) { clearInterval(list._cdTimer); return; }
    list.querySelectorAll('.skmw-cd').forEach((n) => {
      const ms = parseInt(n.dataset.ts, 10) - Date.now();
      n.textContent = ms <= 0 ? '· due' : `· ${fmtCd(ms)}`;
    });
  };
  clearInterval(list._cdTimer);
  tickCd();
  list._cdTimer = setInterval(tickCd, 20000);

  list.querySelectorAll('.skmw-item').forEach((node) => {
    node.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('.skmw-x')) return;
      const post = calState.posts.find((p) => String(p.id) === node.dataset.id);
      if (!post) return;
      const st = post.status || 'pending';
      if (st === 'pending') { renderEditForm(post, list); return; }
      if (st === 'published') {
        const url = post.published_url || post.community_url;
        if (url) window.open(url, '_blank', 'noopener');
      }
    });
  });
  // ✕ deletes a row straight from the list (any status). Re-render the
  // whole list afterwards so an emptied tab falls back to the empty state
  // instead of collapsing to bare tabs.
  list.querySelectorAll('.skmw-x').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await apiRequest('/scheduled-posts', { method: 'DELETE', body: { id: parseInt(btn.dataset.id, 10) } });
        await loadScheduled();
        renderList();
        updateBadge();
      } catch (err) { toast('⚠️ ' + (err.message || 'delete failed')); }
    });
  });
}

// ---------------------------------------------------------------------------
function renderEditForm(post, container) {
  const content = post.content || '';
  // Title: stored column first; legacy rows kept it as content's first line.
  let title = (post.title || '').trim();
  let bodyContent = content;
  if (!title && content.includes('\n')) {
    const firstLine = content.split('\n', 1)[0].trim();
    if (firstLine && firstLine.length <= 120) {
      title = firstLine;
      bodyContent = content.split('\n').slice(1).join('\n').trim();
    }
  }
  let chosen = new Date(post.scheduled_for);
  if (isNaN(chosen.getTime())) chosen = defaultScheduleTime();
  const gifOn = !!post.gif_search;

  container.closest('.skmw-pop')?.classList.add('editing');
  container.innerHTML = `
    <div class="skmw-edit-header">
      <button class="skmw-btn-back" id="skmw-edit-back">← Back to list</button>
      <h3>✏️ Edit scheduled post</h3>
    </div>
    <div class="skmw-s-toprow">
      <div class="col1"><label>Title</label><input type="text" id="skmw-e-title" value="${escapeHtml(title)}" placeholder="Post title"></div>
      <div class="col2"><label>Topic</label><input type="text" id="skmw-e-topic" list="skmw-e-topic-options" value="${escapeHtml(post.category || '')}" placeholder="(group default)"><datalist id="skmw-e-topic-options">${post.category ? `<option value="${escapeHtml(post.category)}">` : ''}</datalist></div>
    </div>
    <label style="margin-top:14px;">Post content</label>
    <textarea id="skmw-e-content" placeholder="Write your post...">${escapeHtml(bodyContent)}</textarea>
    ${(() => { const hasGif = !!(post.media_url || gifOn); return hasGif ? `<label class="skmw-row" style="cursor:pointer;text-transform:none;font-weight:600;"><input type="checkbox" id="skmw-e-gif" style="margin:0;" checked> 🎬 GIF ✓</label>` : ''; })()}
    <label style="margin-top:14px;">Publish at</label>
    <div id="skmw-e-cal"></div>
    <div class="skmw-past-note" id="skmw-e-past">⚠️ Can't schedule in the past — pick a future time.</div>
    <label style="margin-top:14px;">Links <span style="text-transform:none;font-weight:400;color:#9ca3af;">(uncheck to exclude)</span></label>
    <div id="skmw-e-linklist"></div>
    <button type="button" class="skmw-addlink" id="skmw-e-addlink">＋ Add link</button>
    <div class="skmw-edit-actions">
      <button class="skmw-btn skmw-btn-ghost" id="skmw-e-cancel">Cancel</button>
      <button class="skmw-btn skmw-btn-ghost" id="skmw-e-delete" style="border-color:#dc2626;color:#dc2626;">🗑 Delete</button>
      <button class="skmw-btn skmw-btn-pink" id="skmw-e-save">Update</button>
    </div>
    <div class="skmw-err" id="skmw-e-err"></div>
  `;

  const $past = document.getElementById('skmw-e-past');

  function syncFromChosen() {
    $past.style.display = chosen.getTime() < Date.now() ? 'block' : 'none';
  }

  // Calendar popup (time row above the grid), shared with the schedule dialog.
  const eCal = mountPopupCalendar(document.getElementById('skmw-e-cal'), () => chosen, (d) => { chosen = d; syncFromChosen(); });

  // Checkbox link rows (max 3), same pattern as the schedule dialog.
  const linkList = document.getElementById('skmw-e-linklist');
  const addLinkRow = (url) => {
    if (linkList.children.length >= 3) return;
    const row = el(`<div class="skmw-linkrow"><input type="checkbox" checked><input type="text" placeholder="https://youtu.be/..." value="${escapeHtml(url || '')}"></div>`);
    linkList.appendChild(row);
  };
  (post.media_urls || []).slice(0, 3).forEach(addLinkRow);
  document.getElementById('skmw-e-addlink').addEventListener('click', () => {
    if (linkList.children.length >= 3) { toast('⚠️ Max 3 links per post'); return; }
    addLinkRow('');
  });

  document.getElementById('skmw-e-cancel').addEventListener('click', () => renderList());
  document.getElementById('skmw-edit-back').addEventListener('click', () => {
    renderList();
  });

  const showErr = (msg) => { const e = document.getElementById('skmw-e-err'); e.textContent = msg; e.style.display = 'block'; };
  const hideErr = () => { document.getElementById('skmw-e-err').style.display = 'none'; };

  document.getElementById('skmw-e-save').addEventListener('click', async () => {
    console.log('[skmw] popup update clicked', { id: post.id, chosen: chosen.toISOString() });
    const finalContent = document.getElementById('skmw-e-content').value.trim();
    if (!finalContent) return showErr('Post content is empty.');
    const titleVal = document.getElementById('skmw-e-title').value.trim();
    if (!titleVal) return showErr('Post title is empty.');
    if (chosen.getTime() < Date.now()) return showErr('Pick a time in the future.');
    const btn = document.getElementById('skmw-e-save');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
    hideErr();
    try {
      // GIF checkbox: checked → keep the stored media_url + term; unchecked →
      // send "" (update skips null, so "" is the way to CLEAR the GIF).
      const gifChecked = !!document.getElementById('skmw-e-gif')?.checked;
      // Links: only rows with a checked box ride along ([] clears the list —
      // the server updates any non-None value); email flag rides the checkbox.
      const linkRows = [...document.querySelectorAll('#skmw-e-linklist .skmw-linkrow')]
        .filter((r) => r.querySelector('input[type="checkbox"]').checked)
        .map((r) => (r.querySelector('input[type="text"]').value || '').trim())
        .filter((v) => /^https?:\/\//i.test(v));
      let emailMembers = !!document.getElementById('skmw-e-email')?.checked;
      if (emailMembers && !confirm('Also email this post to ALL members?')) {
        emailMembers = false;
        const $em = document.getElementById('skmw-e-email');
        if ($em) $em.checked = false;
      }
      const body = { content: finalContent, title: titleVal, scheduled_for: chosen.toISOString(), category: (document.getElementById('skmw-e-topic')?.value || '').trim(), media_url: gifChecked ? (post.media_url || '') : '', gif_search: gifChecked && gifOn ? (post.gif_search || null) : '', media_urls: linkRows, email_members: emailMembers };
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
  const obs = new MutationObserver(() => { injectButtons(); injectScheduleInComposer(); });
  obs.observe(document.body, { childList: true, subtree: true });
}
async function init() {
  injectStyles();
  observe();
  startDiscardWatcher();
  startVideoLinkCapture();
  setTimeout(() => { injectButtons(); injectScheduleInComposer(); }, 1500);
  await loadScheduled();
  setInterval(loadScheduled, 120000);
  console.log('✨ [Skool Magic Writer] loaded — v1.1.30');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
