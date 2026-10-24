"""Repro: native GIF picker → what element/src lands in the TipTap editor?
searches "happy", clicks the WRAPPER of the LARGEST visible result regardless of
src domain (Skool re-hosts grid thumbs on assets.skool.com — post #7 evidence),
then dumps ALL ProseMirror editors, body-wide visible media, dialog buttons.
NEVER submits a post.
"""
import asyncio, os, sys, json
sys.path.insert(0, "/app")
from playwright.async_api import async_playwright
from app.scheduled_posts import decrypt_jwt
import asyncpg

GROUP = "ai-pays-my-bills-7018"

GRID = """() => {
    const ed = document.querySelector('div.tiptap.ProseMirror');
    const desc = (n) => {
        const p = n.parentElement, gp = p && p.parentElement;
        const info = (e) => e ? `${e.tagName}.${(e.className||'').toString().slice(0,60)}` +
            (e.getAttribute('role') ? `[role=${e.getAttribute('role')}]` : '') +
            (e.getAttribute('aria-label') ? `[aria=${e.getAttribute('aria-label')}]` : '') : '-';
        return {tag: n.tagName, src: (n.currentSrc || n.src || '').slice(0, 120),
                w: Math.round(n.getBoundingClientRect().width),
                parent: info(p), grandparent: info(gp)};
    };
    const inPicker = [...document.querySelectorAll('img, video')].filter(n => {
        if (ed && ed.contains(n)) return false;
        const r = n.getBoundingClientRect();
        return r.width > 40 && r.height > 40;
    }).sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);
    return {count: inPicker.length, items: inPicker.slice(0, 8).map(desc)};
}"""

# Largest visible picker item (ANY domain). Returns its rect + info WITHOUT
# clicking: the actual click is a TRUSTED Playwright mouse click at the
# element center (Skool ignores untrusted JS .click() — repro runs 1-3 proved
# the picker closes with nothing inserted).
CLICK_TARGET = """() => {
    const ed = document.querySelector('div.tiptap.ProseMirror');
    const cands = [...document.querySelectorAll('img, video')].filter(n => {
        if (ed && ed.contains(n)) return false;
        const r = n.getBoundingClientRect();
        if (r.width <= 50 || r.height <= 50) return false;
        return true;
    });
    cands.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);
    const n = cands[0];
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return {x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width),
            src: (n.currentSrc || n.src || '').slice(0, 140)};
}"""

DUMP = """() => {
    const ed = document.querySelector('div.tiptap.ProseMirror');
    if (!ed) return {error: 'no editor'};
    const media = [...ed.querySelectorAll('img, video')].map(n => {
        const r = n.getBoundingClientRect();
        return {tag: n.tagName,
                src: (n.currentSrc || n.src || '').slice(0, 300),
                poster: n.poster || '', width: Math.round(r.width),
                html: n.outerHTML.slice(0, 400)};
    });
    return {media_count: media.length, media,
            picker_still_open: !!document.querySelector('input[data-testid="gif-picker-input"]'),
            editor_html_len: ed.innerHTML.length};
}"""

# Last-resort surface dump: every editor on the page, all body-wide media,
# visible button labels (catches confirm steps like Insert/Select/Done).
FULL_DUMP = """() => {
    const vis = (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const eds = [...document.querySelectorAll('div.tiptap.ProseMirror')].map((e, i) => ({
        idx: i, len: e.innerHTML.length, visible: vis(e),
        media: [...e.querySelectorAll('img, video')].map(n => ({
            tag: n.tagName, src: (n.currentSrc || n.src || '').slice(0, 200)})),
    }));
    const bodyMedia = [...document.querySelectorAll('img, video')].filter(n => {
        const r = n.getBoundingClientRect();
        return r.width > 50 && r.height > 50;
    }).map(n => ({tag: n.tagName, src: (n.currentSrc || n.src || '').slice(0, 140),
                  w: Math.round(n.getBoundingClientRect().width)}));
    const btns = [...document.querySelectorAll('button')].filter(vis).map(b =>
        (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40)
    ).filter(t => t);
    return {editors: eds, body_media_count: bodyMedia.length,
            body_media: bodyMedia.slice(0, 10), buttons: btns.slice(0, 25)};
}"""


async def main():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    row = await conn.fetchrow(
        "SELECT jwt_token FROM scheduled_posts WHERE jwt_token IS NOT NULL ORDER BY id DESC LIMIT 1")
    await conn.close()
    jwt = decrypt_jwt(row["jwt_token"])
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        await ctx.add_cookies([{"name": "auth_token", "value": jwt, "domain": ".skool.com",
                                "path": "/", "secure": True}])
        page = await ctx.new_page()
        await page.goto(f"https://www.skool.com/{GROUP}", wait_until="domcontentloaded")
        await page.wait_for_timeout(15000)
        wc = page.locator('text="Write something"').first
        try:
            await wc.wait_for(state="visible", timeout=8000)
            await wc.click()
        except Exception:
            await page.get_by_text("Write something").click()
        await page.wait_for_timeout(3000)
        gif_btn = await page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(
                x => (x.getAttribute('aria-label')||'').toLowerCase().includes('gif'));
            if (b) { b.click(); return true; } return false; }""")
        print("GIF_BTN:", gif_btn)
        await page.wait_for_timeout(1500)
        inp = page.locator('input[data-testid="gif-picker-input"]').first
        try:
            await inp.wait_for(state="visible", timeout=5000)
            await inp.fill("happy")
            await inp.press("Enter")
        except Exception as e:
            print("INPUT_FAIL:", e)
        await page.wait_for_timeout(3500)
        grid = await page.evaluate(GRID)
        print("GRID:", json.dumps(grid, ensure_ascii=False)[:2000])
        target = await page.evaluate(CLICK_TARGET)
        print("TARGET:", json.dumps(target, ensure_ascii=False))
        if target:
            # trusted CDP click — isTrusted=true, like a real user
            await page.mouse.click(target["x"], target["y"])
            print("CLICKED: trusted mouse click")
        else:
            print("CLICKED: no target")
        await page.wait_for_timeout(2500)
        dump = await page.evaluate(DUMP)
        if not dump.get("media_count"):
            await page.wait_for_timeout(3000)
            dump = await page.evaluate(DUMP)
            print("RETRY_DUMP_AFTER_3S")
        if not dump.get("media_count"):
            await page.wait_for_timeout(5000)
            print("FULL_DUMP_AFTER_5S:", json.dumps(
                await page.evaluate(FULL_DUMP), ensure_ascii=False)[:2500])
        else:
            print("EDITOR_DUMP:", json.dumps(dump, ensure_ascii=False))
        try:
            await page.screenshot(path="/tmp/skmw_gif_afterclick.png")
            print("SCREENSHOT: /tmp/skmw_gif_afterclick.png")
        except Exception as e:
            print("SHOT_FAIL:", e)
        # cleanup: never leave the composer dirty
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(300)
        ed = page.locator("div.tiptap.ProseMirror").first
        try:
            await ed.click(force=True, timeout=2000)
            await page.keyboard.press("Control+a")
            await page.keyboard.press("Backspace")
        except Exception:
            pass
        cancel = page.locator('button:has-text("Cancel")').first
        try:
            await cancel.wait_for(state="visible", timeout=2000)
            await cancel.click()
        except Exception:
            pass
        print("CLEANUP: done")
        await browser.close()


asyncio.run(main())
