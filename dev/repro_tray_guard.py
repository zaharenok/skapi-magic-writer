"""Probe 5: composer attachment tray DOM + what 'unfinished' state remains.

Drops a gif (works headless), dumps the attachment tray structure (remove
buttons!), then tests text clear vs full clear. NEVER submits.
"""
import asyncio, os, sys, json, base64
sys.path.insert(0, "/app")
from playwright.async_api import async_playwright
from app.scheduled_posts import decrypt_jwt
TRAY_DUMP = """() => {
    const ed = document.querySelector('div.tiptap.ProseMirror');
    // document scope: attachments may render in a portal far from the editor
    const att = [...document.querySelectorAll('[data-attachment-id], [class*="attachment" i], [class*="Attachment" i]')].map(n => ({
        tag: n.tagName, cls: (n.className || '').toString().slice(0, 70),
        attId: n.getAttribute('data-attachment-id'),
        html: n.outerHTML.slice(0, 260),
    }));
    const post = [...document.querySelectorAll('button')].find(
        b => b.textContent.trim() === 'Post' && b.getBoundingClientRect().width > 0);
    let chain = [], el = post;
    for (let i = 0; i < 8 && el; i++) {
        chain.push(el.tagName + '.' + (el.className || '').toString().slice(0, 40));
        el = el.parentElement;
    }
    const att = [...root.querySelectorAll('[data-attachment-id], [class*="attachment" i]')].map(n => ({
        tag: n.tagName, cls: (n.className || '').toString().slice(0, 70),
        attId: n.getAttribute('data-attachment-id'),
        html: n.outerHTML.slice(0, 200),
    }));
    const btns = [...root.querySelectorAll('button, [role=button]')].map(b =>
        ((b.getAttribute('aria-label') || '') + '|' + (b.textContent || '').trim()).slice(0, 50)
    ).filter(t => t.length > 1);
    const title = document.querySelector('input[placeholder*="Title" i], input[aria-label*="Title" i]');
    return {attachments: att.slice(0, 6), attCount: att.length,
            buttons: [...new Set(btns)].slice(0, 25),
    return {attachments: att.slice(0, 8), attCount: att.length,
            composerChain: chain,
            titleVal: title ? title.value : null,
            editorText: ed ? ed.textContent.slice(0, 60) : null};
}"""

async def main():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    row = await conn.fetchrow(
        "SELECT jwt_token FROM scheduled_posts WHERE jwt_token IS NOT NULL ORDER BY id DESC LIMIT 1")
    await conn.close()
    jwt = decrypt_jwt(row["jwt_token"])
    with open("/tmp/skmw_gif.bin", "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

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

        # type some text so the post is "unfinished"
        ed = page.locator("div.tiptap.ProseMirror").first
        await ed.click()
        await page.keyboard.type("TRAY PROBE TEXT")
        await page.wait_for_timeout(300)

        # drop the gif attachment
        try:
            async with page.expect_response(
                    lambda r: "api2.skool.com/files?ids=" in r.url, timeout=20000):
                await page.evaluate("""(b64) => {
                    const bin = atob(b64);
                    const bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                    const file = new File([bytes], 'gif.gif', {type: 'image/gif'});
                    const ed = document.querySelector('div.tiptap.ProseMirror');
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    for (const type of ['dragenter', 'dragover', 'drop']) {
                        ed.dispatchEvent(new DragEvent(type, {dataTransfer: dt,
                            bubbles: true, cancelable: true}));
                    }
                }""", b64)
            print("DROP: ok")
        except Exception as e:
            print("DROP failed:", str(e)[:100])
        await page.wait_for_timeout(4000)

        print("TRAY:", json.dumps(await page.evaluate(TRAY_DUMP), ensure_ascii=False)[:2200])

        # test 1: TipTap clearContent
        await page.evaluate("""() => {
            const ed = document.querySelector('div.tiptap.ProseMirror');
            if (ed.editor) ed.editor.commands.clearContent(true);
        }""")
        await page.wait_for_timeout(500)
        print("AFTER_CLEARCONTENT:", json.dumps(await page.evaluate(TRAY_DUMP))[:400])

        # cleanup composer
        cancel = page.locator('button:has-text("Cancel")').first
        try:
            await cancel.wait_for(state="visible", timeout=2000)
            await cancel.click()
        except Exception:
            pass
        await page.wait_for_timeout(1000)
        # did the "unfinished" guard fire? dump any dialog
        dlg = await page.evaluate("""() => {
            const d = document.querySelector('[role="dialog"], [role="alertdialog"]');
            return d ? d.textContent.slice(0, 200) : null;
        }""")
        print("GUARD_DIALOG:", json.dumps(dlg))
        if dlg:
            leave = await page.evaluate("""() => {
                const d = document.querySelector('[role="dialog"], [role="alertdialog"]');
                const btns = d ? [...d.querySelectorAll('button')].map(b => b.textContent.trim()) : [];
                return btns;
            }""")
            print("GUARD_BUTTONS:", json.dumps(leave))
            await page.evaluate("""() => {
                const d = document.querySelector('[role="dialog"], [role="alertdialog"]');
                const b = d && [...d.querySelectorAll('button')].find(b =>
                    /leave|discard|without finishing/i.test(b.textContent));
                if (b) b.click();
            }""")
            print("GUARD_ACCEPTED: clicked leave")
        print("CLEANUP: done")
        await browser.close()


asyncio.run(main())
