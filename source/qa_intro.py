"""Déroulé réel du préchargement 3D (GPU d3d11, sans ?pre) : captures à intervalles + durée jusqu'au hero (classe is-intro-done).
Usage : python qa_intro.py [desk|mob]"""
import asyncio, pathlib, sys, time
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
VP = {"desk": {"width": 1440, "height": 900}, "mob": {"width": 390, "height": 844}}[sys.argv[1] if len(sys.argv) > 1 else "desk"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        pg = await (await b.new_context(viewport=VP, is_mobile=VP["width"] < 500, has_touch=VP["width"] < 500)).new_page()
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        t = time.time()
        await pg.goto((ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri())
        for k, at in enumerate([1.5, 3, 4.5, 6, 8, 10]):
            await pg.wait_for_timeout(max(0, int((t + at - time.time()) * 1000)))
            await pg.screenshot(path=str(ROOT / "qa" / f"intro_{VP['width']}_{k}.png"))
            done = await pg.evaluate("document.documentElement.classList.contains('is-intro-done')")
            fps = await pg.evaluate("new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 500 ? requestAnimationFrame(f) : r(Math.round(n * 2)); }; requestAnimationFrame(f); })")
            print(f"t={at}s intro terminée={done} images/s~{fps}")
        print("erreurs :", errs or "aucune")
        await b.close()
asyncio.run(main())
