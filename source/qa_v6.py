"""v6 mobile : hero à plusieurs tailles, accordéon des canaux, slider des formules, comparateur avant/après (souris et doigt),
bouton du I et bouton du pied de page au toucher. Usage : python qa_v6.py"""
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri() + "?pre=99"
OPEN = "getComputedStyle(document.querySelector('.devis__panel')).visibility"

async def page(b, w, h):
    ctx = await b.new_context(viewport={"width": w, "height": h}, is_mobile=True, has_touch=True)
    pg = await ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(1800)
    return ctx, pg

async def to(pg, sel, frac=.25):
    await pg.evaluate(f"window.scrollTo(0, document.querySelector('{sel}').getBoundingClientRect().top + scrollY - innerHeight * {frac})")
    await pg.wait_for_timeout(1300)

async def center(pg, sel):
    return await pg.evaluate(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }})()")

async def swipe(pg, x0, y0, x1, y1, steps=12):
    cdp = await pg.context.new_cdp_session(pg)
    pt = lambda x, y: [{"x": x, "y": y, "id": 1}]
    await cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": pt(x0, y0)})
    for k in range(1, steps + 1):
        await cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": pt(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps)})
        await pg.wait_for_timeout(30)
    await cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    await pg.wait_for_timeout(500)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        # hero : plusieurs téléphones
        for w, h in [(360, 640), (375, 667), (412, 915), (430, 932)]:
            ctx, pg = await page(b, w, h)
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path=str(ROOT / "qa" / f"v6_hero_{w}.png"))
            print(f"hero {w}x{h}", pg.errs or "ok"); await ctx.close()

        ctx, pg = await page(b, 390, 844)
        # canaux : on ouvre le 2e canal
        await to(pg, ".cx__item:nth-of-type(2)", .4)
        x, y = await center(pg, ".cx__item:nth-of-type(2) .cx__toggle")
        await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(2400)
        st = await pg.evaluate("[...document.querySelectorAll('.cx__toggle')].map(b => b.getAttribute('aria-expanded')).join(',')")
        await pg.screenshot(path=str(ROOT / "qa" / "v6_acc.png")); print("accordéon après toucher du 2e :", st)
        # formules : balayage horizontal du slider, puis toucher du 3e tiret
        await to(pg, ".fm-cards", .2)
        x, y = await center(pg, ".fm-cards")
        print("   cartes à", round(y), "scrollY", await pg.evaluate("scrollY"))
        await swipe(pg, x + 130, y, x - 130, y + 4); await pg.wait_for_timeout(800)
        print("   après balayage scrollLeft", await pg.evaluate("document.querySelector('.fm-cards').scrollLeft"), "scrollY", await pg.evaluate("scrollY"))
        a = await pg.evaluate("[...document.querySelectorAll('.fm-dots button')].findIndex(d => d.hasAttribute('aria-current'))")
        x, y = await center(pg, ".fm-dots button:nth-child(3)")
        await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(900)
        c = await pg.evaluate("[document.querySelector('.fm-cards').scrollLeft, [...document.querySelectorAll('.fm-dots button')].findIndex(d => d.hasAttribute('aria-current'))]")
        await pg.screenshot(path=str(ROOT / "qa" / "v6_fm.png")); print("formules : après balayage tiret", a, "| après 3e tiret", c)
        # comparateur : glissé au doigt vers la gauche, balayage vertical (doit faire défiler la page, pas le curseur)
        await to(pg, ".ap-cmp", .2); await pg.wait_for_timeout(2500)
        x, y = await center(pg, ".ap-cmp")
        await swipe(pg, x, y, x - 120, y + 4)
        v1 = await pg.evaluate("getComputedStyle(document.querySelector('.ap-cmp')).getPropertyValue('--x')")
        s0 = await pg.evaluate("scrollY"); await swipe(pg, x + 60, y + 80, x + 66, y - 120); s1 = await pg.evaluate("scrollY")
        v2 = await pg.evaluate("getComputedStyle(document.querySelector('.ap-cmp')).getPropertyValue('--x')")
        await pg.screenshot(path=str(ROOT / "qa" / "v6_cmp.png"))
        await to(pg, ".ap-tabs", .3)
        print("comparateur : après glissé", v1, "| balayage vertical : curseur", v2, "défilement", s0, "->", s1)
        x, y = await center(pg, ".ap-tabs button:nth-child(2)")
        await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(2800)
        print("chantier 2 :", await pg.evaluate("document.querySelector('.ap-proj__name').textContent"))
        # pied de page : bouton touché dès qu'il est visible
        for frac in (.85, .6, .3):
            await to(pg, ".ft__cta", frac)
            x, y = await center(pg, ".ft__cta")
            hit = await pg.evaluate(f"document.elementFromPoint({x}, {y}).className")
            print(f"pied de page à {int(frac * 100)} % de l'écran : touché =", hit)
        print("erreurs", pg.errs or "aucune"); await ctx.close()

        # bouton du I : toucher réel à plusieurs largeurs
        for w, h in [(360, 740), (375, 667), (390, 844), (412, 915), (430, 932)]:
            ctx, pg = await page(b, w, h)
            await to(pg, ".cta__stage", .05); await pg.wait_for_timeout(600)
            x, y = await center(pg, ".cta__btn")
            on = await pg.evaluate("document.querySelector('.cta__btn').classList.contains('is-on')")
            await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(1300)
            print(f"I {w}x{h} : bouton actif {on}, formulaire", await pg.evaluate(OPEN), pg.errs or "")
            await ctx.close()
        await b.close()
asyncio.run(main())
