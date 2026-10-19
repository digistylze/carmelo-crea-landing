"""v9 : section « nuit » (épinglée, 3 phases, réglage du réveil) et configurateur 3D (niveaux, applications, nuit en accéléré,
envoi de la configuration). Usage : python qa_v9.py [desk|mob]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri() + "?pre=99"
VP = sys.argv[1] if len(sys.argv) > 1 else "desk"
W, H = {"desk": (1440, 900), "mob": (390, 844)}[VP]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        mob = VP == "mob"
        ctx = await b.new_context(viewport={"width": W, "height": H}, is_mobile=mob, has_touch=mob)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        await pg.goto(URL); await pg.wait_for_timeout(2500)
        shot = lambda n: pg.screenshot(path=str(ROOT / "qa" / f"v9_{VP}_{n}.png"))
        top = lambda sel: pg.evaluate(f"document.querySelector('{sel}').getBoundingClientRect().top + scrollY")
        # nuit : réveil réglé à 06:30, puis trois instants de la nuit
        y = await top("#s-nuit")
        await pg.evaluate(f"window.scrollTo(0, {y})"); await pg.wait_for_timeout(900)
        for _ in range(2):
            await pg.click(".nuit__adj[data-step='-15']"); await pg.wait_for_timeout(150)
        print("réveil :", await pg.inner_text(".nuit__wake"), "| plages :", await pg.evaluate("[...document.querySelectorAll('.nuit__range')].map(r => r.textContent)"))
        steps = (0, .5, 1.25) if not mob else (0, 1.2, 2.4)
        for k, f in enumerate(steps):
            await pg.evaluate(f"window.scrollTo(0, {y} + innerHeight * {f})"); await pg.wait_for_timeout(1300)
            await shot(f"nuit{k}")
            print(f"nuit {k} :", await pg.inner_text(".nuit__now"), await pg.inner_text(".nuit__time"))
        # configurateur : trois niveaux, applications coupées, nuit en accéléré, envoi
        y = await top("#s-config")
        await pg.evaluate(f"window.scrollTo(0, {y})"); await pg.wait_for_timeout(1800)
        for lvl in ("0", "1", "2"):
            await pg.click(f"#s-config input[name='cfg-lit'][value='{lvl}'] + span"); await pg.wait_for_timeout(1100)
            if mob: await pg.evaluate(f"window.scrollTo(0, {y})"); await pg.wait_for_timeout(400)
            await shot(f"cfg_lit{lvl}")
        if mob: await pg.evaluate(f"window.scrollTo(0, {y} + 500)"); await pg.wait_for_timeout(500)
        for k in ("parquet", "mur"):
            await pg.click(f"#s-config input[value='{k}'] + .cfg__box"); await pg.wait_for_timeout(300)
        await pg.evaluate(f"window.scrollTo(0, {y})"); await pg.wait_for_timeout(900)
        await shot("cfg_off")
        print("compte :", await pg.inner_text(".cfg__count"))
        for k in ("parquet", "mur"):
            await pg.evaluate(f"document.querySelector(\"#s-config input[value='{k}']\").click()")
        await pg.evaluate("document.querySelector('.cfg__play').click()")
        for k, t in enumerate((1500, 4500, 6500, 3500)):
            await pg.wait_for_timeout(t); await shot(f"cfg_night{k}")
            print(f"nuit en accéléré {k} :", await pg.inner_text(".cfg__clock"), await pg.inner_text(".cfg__phase-name"))
        await pg.wait_for_timeout(3000)
        await pg.evaluate("document.querySelector('[data-cfg-send]').click()"); await pg.wait_for_timeout(1500)
        print("formulaire :", await pg.evaluate("[getComputedStyle(document.querySelector('.devis__panel')).visibility, document.querySelector('input[name=projet]:checked')?.value]"))
        await shot("cfg_devis")
        print("erreurs :", errs or "aucune")
        await b.close()
asyncio.run(main())
