"""Diagnostic repro: does scripted typing create paragraph blocks in Skool's TipTap composer?

Runs INSIDE the skool-api container with the container's own playwright.
NEVER submits a post: types markers, dumps innerHTML, clears, cancels.

Run: docker exec skool-api python /tmp/repro_composer.py
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
    assert jwt, "JWT decrypt failed"
    print("JWT: ok (len", len(jwt), ")")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        await ctx.add_cookies([{"name": "auth_token", "value": jwt, "domain": ".skool.com",
                                "path": "/", "secure": True}])
        page = await ctx.new_page()
        await page.goto(f"https://www.skool.com/{GROUP}", wait_until="domcontentloaded")
        await page.wait_for_timeout(15000)  # Skool SPA needs the long settle
        # open composer
        wc = page.locator('text="Write something"').first
        try:
            await wc.wait_for(state="visible", timeout=8000)
            await wc.click()
        except Exception:
            await page.get_by_text("Write something").click()
        await page.wait_for_timeout(3000)
        ed = page.locator("div.tiptap.ProseMirror").first
        await ed.click(force=True)
        await page.wait_for_timeout(1000)
        # --- TEST A: current server path (CDP keyboard Enter) ---
        await page.keyboard.type("AAA-TEST-PARA")
        await page.keyboard.press("Enter")
        await page.keyboard.press("Enter")
        await page.keyboard.type("BBB-TEST-PARA")
        await page.wait_for_timeout(800)
        html_a = await ed.evaluate("e => e.innerHTML")
        blocks_a = await ed.evaluate("e => e.children.length")
        # --- TEST B: execCommand insertParagraph ---
        await page.keyboard.press("End")
        await page.keyboard.type("CCC")
        await page.evaluate("() => document.execCommand('insertParagraph')")
        await page.evaluate("() => document.execCommand('insertParagraph')")
        await page.keyboard.type("DDD")
        await page.wait_for_timeout(500)
        html_b = await ed.evaluate("e => e.innerHTML")
        # --- TEST C: GIF picker DOM dump (Task 2 ground truth) ---
        gif_btn = await page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(
                x => (x.getAttribute('aria-label')||'').toLowerCase().includes('gif'));
            if (b) { b.click(); return true; } return false; }""")
        if gif_btn:
            await page.wait_for_timeout(1500)
            picker_dump = await page.evaluate("""() => {
                const inp = document.querySelector('input[data-testid="gif-picker-input"]');
                const items = document.querySelectorAll('[class*="gif" i], [class*="Gif" i]');
                return { input_found: !!inp,
                         sample: [...items].slice(0, 8).map(n => n.outerHTML.slice(0, 300)) };
            }""")
        else:
            picker_dump = {"error": "no gif button found"}
        print("TEST_A_BLOCKS:", blocks_a)
        print("TEST_A_HTML:", html_a[:800])
        print("TEST_B_HTML:", html_b[:800])
        print("GIF_PICKER:", json.dumps(picker_dump, ensure_ascii=False)[:2000])
        # cleanup: clear composer, cancel — NEVER submit
        await ed.click(force=True)
        await page.keyboard.press("Control+a")
        await page.keyboard.press("Backspace")
        await page.wait_for_timeout(300)
        cancel = page.locator('button:has-text("Cancel")').first
        try:
            await cancel.wait_for(state="visible", timeout=2000)
            await cancel.click()
            print("CLEANUP: composer cleared + canceled")
        except Exception:
            print("CLEANUP: no Cancel button (composer may be empty)")
        await browser.close()


asyncio.run(main())
