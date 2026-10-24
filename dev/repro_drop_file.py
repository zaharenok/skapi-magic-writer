"""Probe 4: drop a REAL File (bytes from python, no CORS) onto the composer.

Targets: the "Drop files here to upload" zone, the editor, composer root.
Watches ALL skool API requests. NEVER submits a post.
"""
import asyncio, os, sys, json, base64
sys.path.insert(0, "/app")
from playwright.async_api import async_playwright
from app.scheduled_posts import decrypt_jwt
import asyncpg

GROUP = "ai-pays-my-bills-7018"

CHECK = """() => {
    const ed = document.querySelector('div.tiptap.ProseMirror');
    let html = '';
    try { html = ed && ed.editor ? ed.editor.getHTML() : ''; } catch (e) {}
    const assets = [...new Set([...document.querySelectorAll('img, video')]
        .map(n => n.currentSrc || n.src || '')
        .filter(s => s.includes('assets.skool.com/f/')))];
    const trays = [...document.querySelectorAll('[data-attachment-id], [class*="attachment" i]')].length;
    const dropzone = [...document.querySelectorAll('[aria-label*="Drop files" i]')].map(n => ({
        tag: n.tagName, cls: (n.className || '').toString().slice(0, 60),
        visible: n.getBoundingClientRect().width > 0}));
    return {stateImg: (html.match(/<(img|video)/g) || []).length, assets, trays,
            dropzone, html: html.slice(0, 100)};
}"""


async def main():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    row = await conn.fetchrow(
        "SELECT jwt_token FROM scheduled_posts WHERE jwt_token IS NOT NULL ORDER BY id DESC LIMIT 1")
    await conn.close()
    jwt = decrypt_jwt(row["jwt_token"])

    with open("/tmp/skmw_gif.bin", "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    print("PAYLOAD_B64_MB:", round(len(b64) / 1e6, 1))

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        await ctx.add_cookies([{"name": "auth_token", "value": jwt, "domain": ".skool.com",
                                "path": "/", "secure": True}])
        page = await ctx.new_page()
        reqs = []
        page.on("request", lambda r: reqs.append(r.method + " " + r.url[:130]) if (
            "skool.com" in r.url and r.resource_type in ("xhr", "fetch")) else None)
        await page.goto(f"https://www.skool.com/{GROUP}", wait_until="domcontentloaded")
        await page.wait_for_timeout(15000)
        wc = page.locator('text="Write something"').first
        try:
            await wc.wait_for(state="visible", timeout=8000)
            await wc.click()
        except Exception:
            await page.get_by_text("Write something").click()
        await page.wait_for_timeout(3000)

        reqs.clear()
        dropped = await page.evaluate("""async (b64) => {
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const file = new File([bytes], 'gif.gif', {type: 'image/gif'});
            const ed = document.querySelector('div.tiptap.ProseMirror');
            const targets = [];
            const dz = document.querySelector('[aria-label*="Drop files" i]');
            if (dz) targets.push(['dropzone', dz]);
            targets.push(['editor', ed]);
            const root = ed && (ed.closest('[data-skool-composer]') || ed.closest('form') || ed.parentElement);
            if (root) targets.push(['root', root]);
            const out = [];
            for (const [name, t] of targets) {
                const dt = new DataTransfer();
                dt.items.add(file);
                for (const type of ['dragenter', 'dragover', 'drop']) {
                    t.dispatchEvent(new DragEvent(type, {dataTransfer: dt,
                        bubbles: true, cancelable: true}));
                }
                out.push(name);
                await new Promise(r => setTimeout(r, 1500));
            }
            return out;
        }""", b64)
        print("DROP_TARGETS:", json.dumps(dropped))
        await page.wait_for_timeout(12000)
        print("REQS:", json.dumps(reqs[:15]))
        print("STATE:", json.dumps(await page.evaluate(CHECK))[:500])
        try:
            await page.screenshot(path="/tmp/skmw_drop_probe.png")
            print("SCREENSHOT: /tmp/skmw_drop_probe.png")
        except Exception as e:
            print("SHOT_FAIL:", e)

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
