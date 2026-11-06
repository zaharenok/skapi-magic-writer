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

  function getDistinctId() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([DISTINCT_KEY], (r) => {
          if (chrome.runtime.lastError) return resolve('');
          if (r && r[DISTINCT_KEY]) return resolve(r[DISTINCT_KEY]);
          const id = newId();
          chrome.storage.local.set({ [DISTINCT_KEY]: id }, () => resolve(id));
        });
      } catch (_) {
        resolve('');
      }
    });
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
            properties || {}
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
