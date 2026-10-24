"""Probe: what does the composer ACTUALLY submit? (state vs DOM)

Runs INSIDE skool-api container. Opens composer, then:
  1. checks TipTap editor instance access (ed.editor)
  2. execCommand insertHTML img  -> DOM innerHTML vs editor.getHTML()
  3. ClipboardEvent paste img    -> DOM innerHTML vs editor.getHTML()
  4. set_input_files each input[type=file] with request logging
NEVER submits a post.
"""
import asyncio, os, sys, json
sys.path.insert(0, "/app")
from playwright.async_api import async_playwright
from app.scheduled_posts import decrypt_jwt
import asyncpg

GROUP = "ai-pays-my-bills-7018"
IMG = "https://media0.giphy.com/media/Tz30IjVH9wFich4MLO/giphy.gif"

CHECK = """() => {
    const ed = document.querySelector('div.tiptap.ProseMirror');
    if (!ed) return {error: 'no editor'};
    const hasEd = !!ed.editor;
    const domImg = ed.querySelectorAll('img, video').length;
    let stateHtml = null, stateImg = null;
    try {
        if (hasEd) {
            stateHtml = ed.editor.getHTML();
            stateImg = (stateHtml.match(/<(img|video)/g) || []).length;
        }
    } catch (e) { stateHtml = 'ERR:' + e.message; }
    return {hasEd, domImg, stateImg, stateHtml: (stateHtml || '').slice(0, 300)};
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
        reqs = []
        page.on("request", lambda r: reqs.append(r.url[:130]) if any(
            k in r.url for k in ("upload", "media", "assets.skool", "image")) else None)
        await page.goto(f"https://www.skool.com/{GROUP}", wait_until="domcontentloaded")
        await page.wait_for_timeout(15000)
        wc = page.locator('text="Write something"').first
        try:
            await wc.wait_for(state="visible", timeout=8000)
            await wc.click()
        except Exception:
            await page.get_by_text("Write something").click()
        await page.wait_for_timeout(3000)

        print("BASELINE:", json.dumps(await page.evaluate(CHECK)))

        # 1) execCommand path (what the engine does today)
        await page.evaluate("""(src) => {
            const ed = document.querySelector('div.tiptap.ProseMirror');
            ed.focus();
            document.execCommand('insertHTML', false,
                '<img src="' + src + '" style="max-width:100%">');
        }""", IMG)
        await page.wait_for_timeout(1000)
        print("EXECCOMMAND:", json.dumps(await page.evaluate(CHECK)))

        # clean for paste test
        await page.evaluate("""() => {
            const ed = document.querySelector('div.tiptap.ProseMirror');
            if (ed.editor) ed.editor.commands.clearContent(true);
        }""")
        await page.wait_for_timeout(300)

        # 2) paste-event path (goes through ProseMirror parser)
        pasted = await page.evaluate("""(src) => {
            const ed = document.querySelector('div.tiptap.ProseMirror');
            ed.focus();
            const dt = new DataTransfer();
            dt.setData('text/html', '<img src="' + src + '">');
            const ev = new ClipboardEvent('paste', {clipboardData: dt, bubbles: true});
            ed.dispatchEvent(ev);
            return true;
        }""", IMG)
        await page.wait_for_timeout(1500)
        print("PASTE_OK:", pasted, json.dumps(await page.evaluate(CHECK)))

        # clean before upload test
        await page.evaluate("""() => {
            const ed = document.querySelector('div.tiptap.ProseMirror');
            if (ed.editor) ed.editor.commands.clearContent(true);
        }""")

        # 3) file inputs with request logging
        inputs = await page.evaluate("""() => {
            return [...document.querySelectorAll('input[type=file]')].map((n, i) => {
                const r = n.getBoundingClientRect();
                let el = n, chain = [];
                for (let k = 0; k < 4 && el; k++) { chain.push(el.tagName); el = el.parentElement; }
                return {i, accept: n.accept || '', visible: r.width > 0, chain};
            });
        }""")
        print("FILE_INPUTS:", json.dumps(inputs))
        for meta in inputs:
            reqs.clear()
            idx = meta["i"]
            await page.evaluate("""(idx) => {
                const n = document.querySelectorAll('input[type=file]')[idx];
                const dt = new DataTransfer();
            }""", idx)
            loc = page.locator('input[type=file]').nth(idx)
            try:
                await loc.set_input_files("/tmp/skmw_gif.bin")
            except Exception as e:
                print(f"INPUT[{idx}] set failed:", str(e)[:120])
                continue
            await page.wait_for_timeout(8000)
            print(f"INPUT[{idx}] requests:", json.dumps(reqs[:6]))
            print(f"INPUT[{idx}] after:", json.dumps(await page.evaluate(CHECK)))

        # cleanup
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(300)
        cancel = page.locator('button:has-text("Cancel")').first
        try:
            await cancel.wait_for(state="visible", timeout=2000)
            await cancel.click()
        except Exception:
            pass
        print("CLEANUP: done")
        await browser.close()


asyncio.run(main())
