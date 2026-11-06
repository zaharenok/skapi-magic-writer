// Skool Magic Writer — PostHog analytics (minimal, pseudonymous, optional).
//
// Design:
// - OFF until a project token is pasted below. While POSTHOG_PROJECT_TOKEN is
//   empty every call is a no-op, so shipping this file changes nothing by
//   itself.
// - Pseudonymous, not anonymous: events go with $process_person_profile =
//   false (PostHog creates no person profile), but distinct_id is a random
//   UUID per install persisted in chrome.storage.local, so events from one
//   install are linkable to each other. No identify calls, no emails or
//   usernames.
// - $geoip_disable: true on every event, so PostHog's GeoIP enrichment does
//   not add country/city. The ingest endpoint still receives the client IP
//   with each request; recommend setting "IP data capture: discard" in the
//   PostHog project settings (EU orgs default to discard).
// - No post text, titles, prompts, community names/slugs, URLs, emails or
//   usernames are ever sent. Properties are booleans/enums and the extension
//   version only.
// - Opt-out: setting `skmw_analytics_off` in chrome.storage.local (Options
//   page checkbox) stops all sending.
// - The service worker enforces a fixed whitelist of events and properties
//   (EVENT_SPECS); unknown events/properties/types are dropped, never sent.
// - Transport: the service worker does the fetch (content scripts hit
//   skool.com's CSP connect-src; the SW is exempt). Content scripts call
//   skmwTrack(), which forwards via runtime messages.
//
// Endpoint: https://posthog.com/docs/api/capture — POST {host}/i/v0/e/ with
// {api_key, event, distinct_id, properties, timestamp}.

const POSTHOG_PROJECT_TOKEN = ''; // TODO: paste the PostHog project token (phc_...)
const POSTHOG_HOST = 'https://eu.i.posthog.com'; // EU Cloud; use https://us.i.posthog.com for US Cloud

(function (global) {
  const DISTINCT_KEY = 'skmw_ph_distinct_id';
  const OPTOUT_KEY = 'skmw_analytics_off';

  // Receiver-side whitelist: the only events and properties the service
  // worker will ever send, enforced here — not just by auditing call sites.
  // Anything unknown (unknown event, undeclared property key, wrong type) is
  // dropped, so a buggy or hostile sender cannot push arbitrary data.
  // Types: 'bool' coerced with !!, 'enum:a,b,c' must match, 'str40' a short
  // sanitized string (version/reason style values only).
  const EVENT_SPECS = {
    extension_installed: { reason: 'enum:install,update,chrome_update,shared_module_update', prev_version: 'str40' },
    extension_updated: { reason: 'enum:install,update,chrome_update,shared_module_update', prev_version: 'str40' },
    skool_opened: {},
    magic_dialog_opened: {},
    generate_started: { want_title: 'bool', length: 'enum:short,medium,long', used_context: 'bool' },
    generate_succeeded: { want_title: 'bool', length: 'enum:short,medium,long', used_context: 'bool' },
    generate_failed: { reason: 'enum:subscription_required,pro_feature_required,api_error,other' },
    post_inserted: { attach_gif: 'bool' },
    post_scheduled: { has_gif: 'bool', email_members: 'bool' },
    scheduled_post_updated: { has_gif: 'bool', email_members: 'bool' },
    scheduled_post_published: {},
  };

  function sanitize(event, properties) {
    const spec = EVENT_SPECS[event];
    if (!spec) return null;
    const clean = {};
    const src = properties && typeof properties === 'object' ? properties : {};
    for (const key of Object.keys(spec)) {
      if (!(key in src)) continue;
      const rule = spec[key];
      const v = src[key];
      if (rule === 'bool') clean[key] = !!v;
      else if (rule === 'str40') {
        if (typeof v !== 'string') continue;
        clean[key] = v.replace(/[^\w.\-]/g, '').slice(0, 40);
      } else if (rule.startsWith('enum:')) {
        if (rule.slice(5).split(',').includes(v)) clean[key] = v;
        // wrong enum value: property dropped, event still sent
      }
    }
    return clean;
  }

  function enabled() {
    return !!POSTHOG_PROJECT_TOKEN;
  }

  function newId() {
    try {
      return crypto.randomUUID();
    } catch (_) {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    }
  }

  let idPromise = null;

  function getDistinctId() {
    // Memoized in the SW global so concurrent first-ever calls (e.g. an
    // onInstalled event racing a forwarded message) cannot mint two UUIDs;
    // after a SW restart the stored ID is read back from chrome.storage.
    if (!idPromise) {
      idPromise = new Promise((resolve) => {
        const fail = () => { idPromise = null; resolve(''); }; // don't cache failures — retry next event
        try {
          chrome.storage.local.get([DISTINCT_KEY], (r) => {
            if (chrome.runtime.lastError) return fail();
            if (r && r[DISTINCT_KEY]) return resolve(r[DISTINCT_KEY]);
            const id = newId();
            chrome.storage.local.set({ [DISTINCT_KEY]: id }, () => resolve(id));
          });
        } catch (_) {
          fail();
        }
      });
    }
    return idPromise;
  }

  function isOptedOut() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([OPTOUT_KEY], (r) => {
          resolve(!chrome.runtime.lastError && !!(r && r[OPTOUT_KEY]));
        });
      } catch (_) {
        resolve(false);
      }
    });
  }

  // Sends one event. Runs in the service worker. Fire-and-forget: analytics
  // must never break the product, so every failure is swallowed.
  async function send(event, properties) {
    if (!enabled() || !event) return;
    try {
      const clean = sanitize(event, properties);
      if (!clean) return; // unknown event — dropped before any network
      if (await isOptedOut()) return;
      const distinctId = await getDistinctId();
      if (!distinctId) return;
      await fetch(POSTHOG_HOST.replace(/\/+$/, '') + '/i/v0/e/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: POSTHOG_PROJECT_TOKEN,
          event: event,
          distinct_id: distinctId,
          properties: Object.assign(
            {
              $process_person_profile: false,
              $geoip_disable: true,
              ext_version: chrome.runtime.getManifest().version,
            },
            clean
          ),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (_) {
      /* offline / blocked by an ad-blocker — drop the event */
    }
  }

  // Public entry, usable from content scripts AND the service worker.
  // In a window context it forwards to the SW; in the SW it sends directly.
  function skmwTrack(event, properties) {
    if (!enabled()) return;
    try {
      if (typeof window === 'undefined') {
        void send(event, properties);
        return;
      }
      chrome.runtime.sendMessage(
        { type: 'SKMW_ANALYTICS', event: event, properties: properties },
        () => void chrome.runtime.lastError
      );
    } catch (_) {
      /* extension context invalidated — drop */
    }
  }

  global.skmwTrack = skmwTrack;
  global.skmwAnalyticsSend = send; // used by the SW message handler
})(typeof self !== 'undefined' ? self : this);
