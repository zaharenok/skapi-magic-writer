"""Repro: does PUT /scheduled-posts update scheduled_for (time edit)?

Mimics the extension's edit dialog body. Throwaway row, cleaned up.
"""
import asyncio, os, sys
sys.path.insert(0, "/app")
import asyncpg, aiohttp
from app.scheduled_posts import decrypt_jwt


async def main():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    row = await conn.fetchrow("SELECT jwt_token FROM scheduled_posts WHERE id=13")
    jwt = decrypt_jwt(row["jwt_token"])
    await conn.execute("""
        INSERT INTO scheduled_posts (user_id, content, community_slug, scheduled_for, created_at, status)
        SELECT user_id, 'PUT REPRO', 'ai-pays-my-bills-7018', now() + interval '30 minutes', now(), 'pending'
        FROM scheduled_posts WHERE id = 13""")
    rid = await conn.fetchval(
        "SELECT id FROM scheduled_posts WHERE content='PUT REPRO' ORDER BY id DESC LIMIT 1")
    print("created row", rid)
    await conn.close()

    async with aiohttp.ClientSession() as s:
        new_iso = "2026-10-24T21:55:00.000Z"
        async with s.put(
                "http://localhost:8000/scheduled-posts",
                json={"id": rid, "content": "PUT REPRO", "scheduled_for": new_iso,
                      "gif_search": None},
                headers={"Authorization": f"Bearer {jwt}"}) as r:
            print("PUT status:", r.status, (await r.text())[:300])
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    row = await conn.fetchrow("SELECT scheduled_for, status FROM scheduled_posts WHERE id=$1", rid)
    print("AFTER PUT:", row["scheduled_for"], row["status"])
    await conn.execute("DELETE FROM scheduled_posts WHERE id=$1", rid)
    print("cleaned up")
    await conn.close()


asyncio.run(main())
