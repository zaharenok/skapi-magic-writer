"""Repro v2: GIF picker DOM ground truth — search results markup.

Runs INSIDE skool-api container. Opens composer, opens GIF picker,
searches, dumps result-grid classes/srcs. NEVER submits a post.
"""
import asyncio, os, sys, json
sys.path.insert(0, "/app")
from playwright.async_api import async_playwright
from app.scheduled_posts import decrypt_jwt
import asyncpg

GROUP = "ai-pays-my-bills-7018"


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
        # Picker structure BEFORE search: input + ancestor chain classes
        pre = await page.evaluate("""() => {
            const inp = document.querySelector('input[data-testid="gif-picker-input"]')
                || document.querySelector('[class*="GifPickerWrapper"] input')
                || document.querySelector('[class*="DropdownBackground"] input');
            if (!inp) return {error: 'no picker input'};
            let el = inp, chain = [];
            for (let i = 0; i < 6 && el; i++) { chain.push(el.className); el = el.parentElement; }
            const media = [...document.querySelectorAll('img, video')].filter(n => {
                const r = n.getBoundingClientRect();
                return r.width > 50 && r.height > 50;
            }).slice(0, 5).map(n => ({tag: n.tagName, src: (n.currentSrc || n.src || '').slice(0, 110), cls: n.className}));
            return {chain, wrapper_exists: !!document.querySelector('[class*="GifPickerWrapper"]'),
                    dropdown_exists: !!document.querySelector('[class*="DropdownBackground"]'), media};
        }""")
        print("PRE_SEARCH:", json.dumps(pre, ensure_ascii=False)[:1500])
        # Search
        term = "happy"
        await page.evaluate("""(t) => {
            const inp = document.querySelector('input[data-testid="gif-picker-input"]');
            if (inp) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(inp, t);
                inp.dispatchEvent(new Event('input', {bubbles: true}));
            }
        }""", term)
        inp = page.locator('input[data-testid="gif-picker-input"]').first
        try:
            await inp.wait_for(state="visible", timeout=3000)
            await inp.fill(term)
            await inp.press("Enter")
        except Exception as e:
            print("INPUT_FAIL:", e)
        await page.wait_for_timeout(3500)
        post = await page.evaluate("""() => {
            const media = [...document.querySelectorAll('img, video')].filter(n => {
                const r = n.getBoundingClientRect();
                return r.width > 50 && r.height > 50;
            });
            const pickerish = media.filter(n => {
                let el = n;
                for (let i = 0; i < 10 && el; i++) {
                    if (/dropdown/i.test(el.className || '')) return true;
                    el = el.parentElement;
                }
                return false;
            });
            return {total_visible_media: media.length, in_dropdown: pickerish.length,
                    sample: pickerish.slice(0, 6).map(n => ({
                        tag: n.tagName, w: Math.round(n.getBoundingClientRect().width),
                        src: (n.currentSrc || n.src || '').slice(0, 130), cls: String(n.className).slice(0, 80)}))};
        }""")
        print("POST_SEARCH:", json.dumps(post, ensure_ascii=False)[:1800])
        # cleanup
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
