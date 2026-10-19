"""Manipulation du lit 3D : glisser à la souris (avant / pendant / après l'élan) puis clic sur le lit (canal suivant).
Usage : python qa_drag.py [fichier.html]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
F = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "landing_carmelo-crea.html").resolve()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        pg = await (await b.new_context(viewport={"width": 1440, "height": 900})).new_page()
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(F.as_uri() + "?pre=99"); await pg.wait_for_timeout(3500)
        await pg.screenshot(path=str(ROOT / "qa" / "drag_0.png"))
        x, y = 1020, 600                                      # sur le lit (cadré à droite)
        await pg.mouse.move(x, y); await pg.wait_for_timeout(200)
        cur = await pg.evaluate("getComputedStyle(document.querySelector('.hero__canvas')).cursor")
        await pg.mouse.down()
        for k in range(1, 15):
            await pg.mouse.move(x + k * 22, y + k * 3); await pg.wait_for_timeout(16)
        grabbing = await pg.evaluate("document.getElementById('s-hero').classList.contains('is-grabbing')")
        await pg.mouse.up()
        await pg.wait_for_timeout(120); await pg.screenshot(path=str(ROOT / "qa" / "drag_1.png"))
        await pg.wait_for_timeout(1500); await pg.screenshot(path=str(ROOT / "qa" / "drag_2.png"))
        before = await pg.evaluate("document.querySelector('.hero__note-canal').textContent")
        await pg.mouse.click(1080, 560); await pg.wait_for_timeout(2600)
        after = await pg.evaluate("document.querySelector('.hero__note-canal').textContent")
        hint = await pg.evaluate("getComputedStyle(document.querySelector('.hero__hint')).visibility")
        await pg.screenshot(path=str(ROOT / "qa" / "drag_3.png"))
        print("curseur au survol :", cur, "| prise :", grabbing, "| canal :", before, "->", after, "| indication :", hint, "| erreurs :", errs or "aucune")
        await b.close()
asyncio.run(main())
