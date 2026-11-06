# Skool Magic Writer

Experimental sub-project: a minimal Chrome extension that lives **entirely inside Skool** (no popup). It adds two buttons next to the composer and a calendar icon in the top bar.

> Spun out of the main SKapi extension to test the "all UI inside Skool, no side panel" approach used by tools like SkoolKit.

## What it does

- **✨ Magic Post** — AI turns your raw notes into a ready-to-post community message (title + body), then drops it into the open Skool composer. You review and press Post yourself.
- **📚 Community context (Pro)** — checkbox in the Magic Post dialog: scrapes the last 10/20/30 posts from the feed (client-side, the posts are already in the DOM) and sends them as style context, so the generated post sounds native to that community. Only unlocked for subscribed users (`GET /ai/access`); the server enforces it too (`pro_feature_required`).
- **📅 Schedule** — save a post to the scheduler; the server publishes it automatically at the chosen time.
- **📅 calendar icon** (top bar) — a popover listing upcoming / sent / failed scheduled posts. Click a pending one to edit.

The buttons appear next to **"Write something"** / **"Go Live"** in the composer, and the calendar icon sits in the header next to messages/notifications.

## Architecture

Front-end only. All AI generation and scheduling go through the shared backend:

- `POST https://api.skapi.pro/ai/generate` — text generation (optional `community_context` for Pro users)
- `GET https://api.skapi.pro/ai/access` — current user's Pro/access state (enables the context checkbox)
- `GET / POST / PUT / DELETE https://api.skapi.pro/scheduled-posts` — scheduler CRUD

The user's Skool session token is read **automatically** from the `auth_token`
HttpOnly cookie on `.skool.com` (via the `cookies` permission) — **no token is
pasted anywhere**. A default community slug is the only optional Options entry
(auto-detected from the current URL otherwise).

## Install (Load unpacked)

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder
4. (Optional) Open the extension's **Options** to set a default community slug
5. Make sure you're logged in to **skool.com**, then open a community — the ✨ / 📅 buttons appear next to the composer

## Analytics (PostHog, optional, off by default)

`analytics.js` is a tiny PostHog capture client. It is **off** until a
project token is pasted into `POSTHOG_PROJECT_TOKEN` (with `POSTHOG_HOST`
pointing at the cloud region of that project — do not guess the region).
While empty, every call is a no-op.

Privacy properties, precisely:

- **Pseudonymous, not anonymous.** `distinct_id` is a random UUID generated
  once per install and persisted in `chrome.storage.local`, so events from
  one install are linkable to each other. Events are sent with
  `$process_person_profile: false`, so PostHog stores them without a person
  profile. No identify calls, no emails, no usernames.
- **No content.** Events carry only booleans/enums (feature flags, error
  class) and the extension version. No post text, prompts, titles, community
  names/slugs or URLs.
- **Whitelist enforced at the sender.** The service worker sends only the
  events and properties declared in `EVENT_SPECS`; unknown events, undeclared
  property keys and wrong types are dropped before any network — a buggy or
  hostile content-script message cannot push arbitrary data.
- **IP and GeoIP.** PostHog's ingest endpoint receives the client IP with
  every request. Each event sets `$geoip_disable: true` so no country/city
  enrichment is stored; additionally set **IP data capture: discard** in the
  PostHog project settings (PostHog EU organizations default to discard).
- **Opt-out.** Options page → "Disable usage analytics"
  (`skmw_analytics_off` in `chrome.storage.local`) stops all sending.

Events: `extension_installed` / `extension_updated`, `skool_opened`,
`magic_dialog_opened`, `generate_started` / `generate_succeeded` /
`generate_failed`, `post_inserted`, `post_scheduled`,
`scheduled_post_updated`, `scheduled_post_published`.

Transport: the service worker POSTs to `{host}/i/v0/e/` (content scripts
forward via runtime messages because skool.com's CSP blocks direct calls).

Relation to the existing telemetry: `reportEvent()` (`POST /ext/event` on
api.skapi.pro) already fires one-time-per-user pings for `magic_open` and
`skool_open` — it answers "has any user ever opened the dialog". The PostHog
events add the per-occurrence funnel around generation (start/success/
failure with error class), insertion, scheduling and publishing, which the
existing pings do not cover.

No new permissions: PostHog's ingest endpoints answer CORS preflights from
any origin (verified for `eu.i.posthog.com` and `us.i.posthog.com` against a
`chrome-extension://` Origin), so the service worker can POST without
`host_permissions` entries and this PR adds none — no re-approval prompt on
update. Ad/tracker blockers may drop these requests on some machines; the
code treats every failure as "drop the event".

## Status## Status

- v0.1 — Magic Post + Schedule + calendar popover (list with upcoming/sent/failed tabs)
- Next: drag-and-drop week grid for the calendar
