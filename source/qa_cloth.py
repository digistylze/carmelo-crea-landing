"""Voilages physiques : captures pendant le tour de chargement et après un lancer du lit au glisser, cadence d'images.
Usage : python qa_cloth.py [desk|mob]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri()
VP = sys.argv[1] if len(sys.argv) > 1 else "desk"
SIZE = {"desk": (1440, 900), "mob": (390, 844)}[VP]
FPS = """() => new Promise(r => { let n = 0, t0 = performance.now(), worst = 0, last = t0;
  const f = t => { worst = Math.max(worst, t - last); last = t; if (++n < 120) requestAnimationFrame(f); else r([Math.round(120000 / (t - t0)), Math.round(worst)]); };
  requestAnimationFrame(f); })"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        mob = VP == "mob"
        ctx = await b.new_context(viewport={"width": SIZE[0], "height": SIZE[1]}, is_mobile=mob, has_touch=mob)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL)
        for k, t in enumerate((1600, 1500, 1500)):          # pendant le tour de chargement (vrai temps)
            await pg.wait_for_timeout(t); await pg.screenshot(path=str(ROOT / "qa" / f"cloth_{VP}_intro{k}.png"))
        await pg.wait_for_timeout(4500)
        print("cadence au repos (i/s, pire image ms) :", await pg.evaluate(FPS))
        # lancer : glisser rapide de droite à gauche sur le lit, puis lâcher
        cx, cy = (SIZE[0] * .71, SIZE[1] * .55) if not mob else (SIZE[0] * .5, SIZE[1] * .68)
        await pg.mouse.move(cx + 120, cy); await pg.mouse.down()
        for i in range(8):
            await pg.mouse.move(cx + 120 - i * 40, cy, steps=2); await pg.wait_for_timeout(16)
        await pg.mouse.up()
        for k, t in enumerate((120, 300, 600, 1200)):
            await pg.wait_for_timeout(t); await pg.screenshot(path=str(ROOT / "qa" / f"cloth_{VP}_spin{k}.png"))
        print("cadence pendant le balancement :", await pg.evaluate(FPS))
        print("erreurs :", errs or "aucune")
        await b.close()
asyncio.run(main())
