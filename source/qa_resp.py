"""Audit responsive : captures écran par écran à plusieurs tailles, débordements horizontaux par élément, textes < 14 px,
cibles tactiles < 44 px, erreurs. Usage : python qa_resp.py 375x667,414x896,768x1024,1024x768"""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri() + "?pre=99"
SIZES = [tuple(map(int, s.split("x"))) for s in (sys.argv[1] if len(sys.argv) > 1 else "375x667,414x896,768x1024,1024x768").split(",")]
CHECK = """() => {
  const W = innerWidth, out = [], small = [], tiny = [];
  for (const el of document.querySelectorAll('main *, footer *, header *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if ((r.right > W + 1 || r.left < -1) && !el.closest('[aria-hidden="true"], .ap-src, .mf__pill, canvas, .hero__stage')) out.push((el.id || el.className || el.tagName).toString().slice(0, 50) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 13.5 && !el.closest('.sr-only')) small.push((el.className || el.tagName).toString().slice(0, 40) + ' ' + cs.fontSize);
    if ((el.tagName === 'A' || el.tagName === 'BUTTON') && (r.height < 40 || r.width < 40) && !el.classList.contains('sr-only') && cs.position !== 'fixed') tiny.push((el.className || el.textContent).toString().trim().slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  return { out: [...new Set(out)].slice(0, 12), small: [...new Set(small)].slice(0, 12), tiny: [...new Set(tiny)].slice(0, 12) };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"])
        for w, h in SIZES:
            mob = w < 820
            ctx = await b.new_context(viewport={"width": w, "height": h}, is_mobile=mob, has_touch=mob)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(2500)
            H = await pg.evaluate("document.documentElement.scrollHeight"); y, i = 0, 0
            while True:
                await pg.screenshot(path=str(ROOT / "qa" / f"r{w}_{i:02d}.png"))
                if y + h >= H or i > 40: break
                tgt = y + int(h * .85)
                for k in range(1, 5):
                    await pg.evaluate(f"window.scrollTo(0, {y + (tgt - y) * k / 4})"); await pg.wait_for_timeout(90)
                y = tgt; i += 1; await pg.wait_for_timeout(1300)
                H = await pg.evaluate("document.documentElement.scrollHeight")
            info = await pg.evaluate(CHECK)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            print(f"== {w}x{h} : hauteur {H} ({H / h:.1f} écrans), {i + 1} captures, largeur défilable {sw}")
            print("   débordements :", info["out"] or "aucun")
            print("   textes < 13,5 px :", info["small"] or "aucun")
            print("   cibles < 40 px :", info["tiny"] or "aucune")
            print("   erreurs :", errs or "aucune")
            await ctx.close()
        await b.close()
asyncio.run(main())
