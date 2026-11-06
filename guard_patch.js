/**
 * Skool Magic Writer — main-world confirm guard (v1.1.42)
 *
 * Content scripts run in an isolated world: overriding window.confirm there
 * NEVER intercepts Skool's own calls. Repro 2026-11-06: scheduling a post
 * closes the composer and Skool fires the NATIVE confirm
 * "You haven't finished your post yet. Do you want to leave without
 * finishing?" — the isolated-world patch in closeComposer and the DOM-modal
 * discard watcher both miss it, so the dialog blocks the user mid-schedule.
 *
 * This file ships as a web_accessible_resource and is injected as
 * <script src="chrome-extension://.../guard_patch.js"> by content.js, which
 * executes it in the MAIN world.
 *
 * Scope is deliberately narrow: only the composer discard prompt is
 * auto-accepted (same product semantics as the DOM discard watcher — the
 * dialog is an obstacle; in the scheduling flow the draft is already saved).
 * Every other confirm() passes through to Skool untouched. The page gets a
 * skmw:confirm-guard event so content.js can toast like the DOM watcher.
 */
(() => {
  if (window.__skmwConfirmGuard) return;
  window.__skmwConfirmGuard = true;
  // Skool copy uses typographic apostrophes in some locales — normalize.
  const norm = (s) => String(s).replace(/[\u2018\u2019\u02BC]/g, "'");
  const GUARD = /haven't finished your post|leave without finishing/i;
  const orig = window.confirm;
  window.confirm = function (msg) {
    try {
      if (typeof msg === 'string' && GUARD.test(norm(msg))) {
        try { window.dispatchEvent(new CustomEvent('skmw:confirm-guard', { detail: String(msg) })); } catch (_) {}
        return true;
      }
    } catch (_) {}
    return orig.call(window, msg);
  };
})();
