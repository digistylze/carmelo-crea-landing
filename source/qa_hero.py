"""QA du préchargement 3D : figé à des instants du tour (?pre=<s>) puis état final.
Usage : python qa_hero.py FICHIER.html [desk|mob|both] [instants séparés par des virgules] [préfixe]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
VPS = {"desk": {"width": 1440, "height": 900}, "mob": {"width": 390, "height": 844}}

async def shot(b, f, vp, pre, name):
    ctx = await b.new_context(viewport=VPS[vp], device_scale_factor=1, is_mobile=vp == "mob", has_touch=vp == "mob")
    pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{m.type}: {m.text}"))
    await pg.goto(pathlib.Path(f).resolve().as_uri() + f"?pre={pre}")
    await pg.wait_for_timeout(6000 if pre < 99 else 9000)
    out = ROOT / "qa" / f"{name}_{vp}_{pre:g}.png"
    await pg.screenshot(path=str(out), timeout=180000)
    over = await pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    print(out.name, "débordement" if over[0] > over[1] + 1 else "ok", errs[:5] or "")
    await ctx.close()

async def main():
    f = sys.argv[1]; vps = sys.argv[2] if len(sys.argv) > 2 else "desk"
    pres = [float(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "0.5,2.2,3.3,4.6,99").split(",")]
    name = sys.argv[4] if len(sys.argv) > 4 else "hero"
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        for vp in (["desk", "mob"] if vps == "both" else [vps]):
            for pre in pres: await shot(b, f, vp, pre, name)
        await b.close()
asyncio.run(main())
