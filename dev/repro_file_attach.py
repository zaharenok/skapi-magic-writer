"""Probe 3: how to attach a media FILE to the composer (no image node in schema).

Tries, in order:
  1. dump all composer control aria-labels/roles (find attach controls)
  2. in-page fetch -> File -> DataTransfer -> 'drop' on editor + composer
  3. same via 'paste' event with file
  4. expect_file_chooser around 'Add video' / media-ish controls
Watches upload network requests. NEVER submits a post.
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
    let html = '';
    try { html = ed && ed.editor ? ed.editor.getHTML() : ''; } catch (e) {}
    const assets = [...document.querySelectorAll('img, video')]
        .map(n => n.currentSrc || n.src || '')
        .filter(s => s.includes('assets.skool.com/f/'));
    const trays = [...document.querySelectorAll('[data-attachment-id], [class*="attachment" i], [class*="tray" i]')].length;
    return {stateImg: (html.match(/<(img|video)/g) || []).length, assets, trays,
            html: html.slice(0, 120)};
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
        page.on("request", lambda r: reqs.append(r.method + " " + r.url[:120]) if any(
            k in r.url for k in ("upload", "media", "attach", "image", "file", "assets.skool")) else None)
        await page.goto(f"https://www.skool.com/{GROUP}", wait_until="domcontentloaded")
        await page.wait_for_timeout(15000)
        wc = page.locator('text="Write something"').first
        try:
            await wc.wait_for(state="visible", timeout=8000)
            await wc.click()
        except Exception:
            await page.get_by_text("Write something").click()
        await page.wait_for_timeout(3000)

        # 1) composer controls
        controls = await page.evaluate("""() => {
            const ed = document.querySelector('div.tiptap.ProseMirror');
            const root = ed ? ed.closest('[data-skool-composer], form, [class*="composer" i]')?.parentElement || document : document;
            const els = [...root.querySelectorAll('[aria-label], [role=button], button')];
            return [...new Set(els.map(e => (e.getAttribute('aria-label') || e.textContent || '')
                .trim().slice(0, 30)).filter(t => t))].slice(0, 30);
        }""")
        print("CONTROLS:", json.dumps(controls))

        # 2) drop with real File (constructed in-page from fetched blob)
        reqs.clear()
        dropped = await page.evaluate("""async (src) => {
            const ed = document.querySelector('div.tiptap.ProseMirror');
            try {
                const blob = await fetch(src).then(r => r.blob());
                const file = new File([blob], 'gif.gif', {type: blob.type || 'image/gif'});
                const targets = [ed, ed.parentElement, ed.closest('[data-skool-composer]') || ed.closest('form')];
                for (const t of targets) {
                    if (!t) continue;
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    for (const type of ['dragenter', 'dragover', 'drop']) {
                        t.dispatchEvent(new DragEvent(type, {dataTransfer: dt, bubbles: true, cancelable: true}));
                    }
                }
                return {ok: true, size: file.size};
            } catch (e) { return {ok: false, err: e.message}; }
        }""", IMG)
        print("DROP:", json.dumps(dropped))
        await page.wait_for_timeout(12000)
        print("AFTER_DROP reqs:", json.dumps(reqs[:8]))
        print("AFTER_DROP state:", json.dumps(await page.evaluate(CHECK))[:400])

        # 3) paste with file
        reqs.clear()
        pasted = await page.evaluate("""async (src) => {
            const ed = document.querySelector('div.tiptap.ProseMirror');
            try {
                const blob = await fetch(src).then(r => r.blob());
                const file = new File([blob], 'gif.gif', {type: blob.type || 'image/gif'});
                const dt = new DataTransfer();
                dt.items.add(file);
                ed.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
                return {ok: true};
            } catch (e) { return {ok: false, err: e.message}; }
        }""", IMG)
        print("PASTE_FILE:", json.dumps(pasted))
        await page.wait_for_timeout(12000)
        print("AFTER_PASTE reqs:", json.dumps(reqs[:8]))
        print("AFTER_PASTE state:", json.dumps(await page.evaluate(CHECK))[:400])

        # 4) file chooser on toolbar controls
        for label in ("Add video", "Add gif", "Add link", "Add poll"):
            try:
                async with page.expect_file_chooser(timeout=2500) as fc_info:
                    await page.locator(f'[aria-label="{label}"]').first.click(timeout=2000)
                fc = await fc_info.value
                print(f"FILE_CHOOSER via {label}: yes, accept={fc.element_containers if False else ''}")
                await fc.set_files("/tmp/skmw_gif.bin")
                await page.wait_for_timeout(10000)
                print(f"AFTER_{label} reqs:", json.dumps(reqs[-6:]))
                print(f"AFTER_{label} state:", json.dumps(await page.evaluate(CHECK))[:400])
                break
            except Exception as e:
                print(f"FILE_CHOOSER via {label}: no ({str(e)[:60]})")

        # cleanup
        cancel = page.locator('button:has-text("Cancel")').first
        try:
            await cancel.wait_for(state="visible", timeout=2000)
            await cancel.click()
        except Exception:
            pass
        print("CLEANUP: done")
        await browser.close()


asyncio.run(main())
