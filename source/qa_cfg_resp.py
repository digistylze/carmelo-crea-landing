"""Configurateur sur plusieurs écrans : on fait défiler le panneau et on coche comme un visiteur, et à chaque étape on vérifie
que la chambre 3D reste visible, que les commandes sont touchables (≥ 44 px, non couvertes) et que rien ne déborde.
Usage : python qa_cfg_resp.py 360x740,390x844,768x1024,844x390,1024x768,1366x625"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri() + "?pre=99"
SIZES = [tuple(map(int, s.split("x"))) for s in (sys.argv[1] if len(sys.argv) > 1 else "360x740,390x844,768x1024,844x390,1024x768,1366x625").split(",")]
STATE = """sel => {
  const v = document.querySelector('.cfg__view').getBoundingClientRect(), nav = document.querySelector('#s-nav').getBoundingClientRect();
  const el = document.querySelector(sel), r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  const visTop = Math.max(v.top, nav.bottom), visBot = Math.min(v.bottom, innerHeight);
  return { vue: Math.round(Math.max(0, visBot - visTop)), cible: Math.round(r.height) + 'x' + Math.round(r.width),
           touchable: !!hit && (hit === el || el.contains(hit) || hit.closest('label') === el.closest('label')), y: Math.round(y) };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        for w, h in SIZES:
            mob = w < 1000
            ctx = await b.new_context(viewport={"width": w, "height": h}, is_mobile=mob, has_touch=mob)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(2200)
            top = await pg.evaluate("document.querySelector('#s-config').getBoundingClientRect().top + scrollY")
            print(f"== {w}x{h}")
            for k, sel in enumerate(["#s-config input[name=cfg-lit][value='1'] + span", "#s-config input[value='mur'] + .cfg__box", "#s-config input[value='son'] + .cfg__box", ".cfg__play", "[data-cfg-send]"]):
                await pg.evaluate(f"(() => {{ const r = document.querySelector(\"{sel}\").getBoundingClientRect(); window.scrollTo(0, r.top + scrollY - innerHeight * .6); }})()")
                await pg.wait_for_timeout(900)
                st = await pg.evaluate(STATE, sel)
                await pg.screenshot(path=str(ROOT / "qa" / f"cr_{w}x{h}_{k}.png"))
                print(f"   {sel.split(' ')[-1][:34]:34} chambre visible {st['vue']:4} px | cible {st['cible']:8} | touchable {st['touchable']}")
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            print("   largeur défilable", sw, "/", w, "| erreurs", errs or "aucune")
            await ctx.close()
        await b.close()
asyncio.run(main())
