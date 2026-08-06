# SKapi Magic Writer

Experimental sub-project: a minimal Chrome extension that lives **entirely inside Skool** (no popup). It adds two buttons next to the composer and a calendar icon in the top bar.

> Spun out of the main SKapi extension to test the "all UI inside Skool, no side panel" approach used by tools like SkoolKit.

## What it does

- **✨ Magic Post** — AI turns your raw notes into a ready-to-post community message (title + body), then drops it into the open Skool composer. You review and press Post yourself.
- **📅 Schedule** — save a post to the SKapi scheduler; the server publishes it automatically at the chosen time.
- **📅 calendar icon** (top bar) — a popover listing upcoming / sent / failed scheduled posts. Click a pending one to edit.

The buttons appear next to **"Write something"** / **"Go Live"** in the composer, and the calendar icon sits in the header next to messages/notifications.

## Architecture

Front-end only. All AI generation and scheduling go through the shared backend:

- `POST https://api.skapi.pro/ai/generate` — text generation
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

## Status

- v0.1 — Magic Post + Schedule + calendar popover (list with upcoming/sent/failed tabs)
- Next: drag-and-drop week grid for the calendar
