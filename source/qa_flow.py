"""Parcours dans la page complète : menu (ouvrir, lien), réservation depuis le hero et depuis « Réserver ce soin »."""
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_constantin-besomi.html").resolve().as_uri() + "?pre=99"  # préchargement sauté

async def run(p, vp, name):
    b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport=vp, is_mobile=vp["width"] < 500, has_touch=vp["width"] < 500)
    pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    await ctx.route("https://wa.me/**", lambda r: r.abort())
    await pg.goto(URL); await pg.wait_for_timeout(5000)
    shot = lambda n: pg.screenshot(path=str(ROOT / "qa" / f"flow_{name}_{n}.png"), timeout=180000)
    # 1. réservation depuis le hero
    await pg.click("[data-hero-cta]"); await pg.wait_for_timeout(1800); await shot("1_book")
    vis = await pg.evaluate("getComputedStyle(document.querySelector('#s-booking')).visibility + ' ' + document.querySelector('#s-booking').getAttribute('aria-hidden')")
    print(name, "réservation ouverte :", vis)
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(1600)
    # 2. menu
    await pg.click("#s-nav [aria-expanded]"); await pg.wait_for_timeout(1800); await shot("2_menu")
    await pg.click("#s-nav a[href='#soins']"); await pg.wait_for_timeout(4500); await shot("3_after_link")
    y = await pg.evaluate("[scrollY, document.querySelector('#s-soins').getBoundingClientRect().top|0]")
    print(name, "après lien Les soins : scrollY, top de #s-soins =", y)
    # 3. « Réserver ce soin » présélectionne
    btn = pg.locator("#s-soins [data-book='Oligothérapie']").first
    await btn.scroll_into_view_if_needed(); await pg.wait_for_timeout(600); await btn.click(); await pg.wait_for_timeout(1800); await shot("4_preselect")
    sel = await pg.evaluate("[...document.querySelectorAll('#s-booking input:checked')].map(i => i.value).join(',')")
    print(name, "soin présélectionné :", sel)
    print(name, "erreurs :", errs or "aucune")
    await b.close()

async def main():
    async with async_playwright() as p:
        await run(p, {"width": 1440, "height": 900}, "desk")
        await run(p, {"width": 390, "height": 844}, "mob")
asyncio.run(main())
