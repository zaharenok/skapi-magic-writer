"""Probe 2: TipTap commands API — what enters editor.state (and survives submit)?

Checks the extension list, then tries insertContent('<img>'), setImage,
insertContent video. Dumps editor.getHTML() (what Skool submits).
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
    if (!ed || !ed.editor) return {error: 'no editor instance'};
    let names = [];
    try {
        names = ed.editor.extensionManager.extensions.map(e => e.name).filter(Boolean);
    } catch (e) {}
    let html = '';
    try { html = ed.editor.getHTML(); } catch (e) { html = 'ERR:' + e.message; }
    return {stateImg: (html.match(/<(img|video)/g) || []).length,
            domImg: ed.querySelectorAll('img, video').length,
            html: html.slice(0, 250), exts: names};
}"""

CLEAN = """() => {
    const ed = document.querySelector('div.tiptap.ProseMirror');
    if (ed.editor) ed.editor.commands.clearContent(true);
    return true;
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

        print("EXTS:", json.dumps(await page.evaluate(CHECK)))

        # sanity: text via commands API
        await page.evaluate("""() => {
            document.querySelector('div.tiptap.ProseMirror')
                .editor.commands.insertContent('HELLO-COMMANDS');
        }""")
        print("TEXT_SANITY:", json.dumps(await page.evaluate(CHECK)))
        await page.evaluate(CLEAN)

        # candidate 1: insertContent raw img HTML
        r1 = await page.evaluate("""(src) => {
            const ed = document.querySelector('div.tiptap.ProseMirror').editor;
            try { return ed.commands.insertContent('<img src="' + src + '">'); }
            catch (e) { return 'ERR:' + e.message; }
        }""", IMG)
        print("INSERTCONTENT_IMG:", r1, json.dumps(await page.evaluate(CHECK)))
        await page.evaluate(CLEAN)

        # candidate 2: setImage command (Image extension)
        r2 = await page.evaluate("""(src) => {
            const ed = document.querySelector('div.tiptap.ProseMirror').editor;
            try { return ed.commands.setImage({src: src}); }
            catch (e) { return 'ERR:' + e.message; }
        }""", IMG)
        print("SETIMAGE:", r2, json.dumps(await page.evaluate(CHECK)))
        await page.evaluate(CLEAN)

        # candidate 3: insertContent video HTML (mp4 branch)
        r3 = await page.evaluate("""() => {
            const ed = document.querySelector('div.tiptap.ProseMirror').editor;
            try {
                return ed.commands.insertContent(
                    '<video src="https://media0.giphy.com/media/Tz30IjVH9wFich4MLO/giphy.mp4" muted loop autoplay playsinline></video>');
            } catch (e) { return 'ERR:' + e.message; }
        }""")
        print("INSERTCONTENT_VIDEO:", r3, json.dumps(await page.evaluate(CHECK)))
        await page.evaluate(CLEAN)

        # cleanup composer
        cancel = page.locator('button:has-text("Cancel")').first
        try:
            await cancel.wait_for(state="visible", timeout=2000)
            await cancel.click()
        except Exception:
            pass
        print("CLEANUP: done")
        await browser.close()


asyncio.run(main())
