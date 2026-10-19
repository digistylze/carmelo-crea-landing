"""CTA #69 : le I couché doit être cliquable. Compare le bouton HTML et le I dessiné, puis clique au centre du I (desktop + mobile)."""
import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).parent
URL = (ROOT.parent / "landing_carmelo-crea.html").resolve().as_uri() + "?pre=99"
JS = """() => { const i = document.querySelector('#s-cta .cta__i').getBoundingClientRect(), b = document.querySelector('#s-cta .cta__btn');
  const r = b.getBoundingClientRect(); const cx = i.left + i.width / 2, cy = i.top + i.height / 2; const el = document.elementFromPoint(cx, cy);
  return { I: [i.left, i.top, i.width, i.height].map(Math.round), btn: [r.left, r.top, r.width, r.height].map(Math.round), on: b.classList.contains('is-on'),
           pe: getComputedStyle(b).pointerEvents, under: el && (el.className.baseVal !== undefined ? el.tagName + '.' + el.className.baseVal : el.tagName + '.' + el.className) }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp in ({"width": 1440, "height": 900}, {"width": 390, "height": 844}):
            pg = await (await b.new_context(viewport=vp, is_mobile=vp["width"] < 500, has_touch=vp["width"] < 500)).new_page()
            await pg.goto(URL); await pg.wait_for_timeout(2500)
            y = await pg.evaluate("document.querySelector('#s-cta .cta__stage').getBoundingClientRect().bottom + scrollY - innerHeight * .6")
            cur = 0
            for k in range(1, 40):
                await pg.evaluate(f"window.scrollTo(0, {y * k / 39})"); await pg.wait_for_timeout(40)
            await pg.wait_for_timeout(1500)
            info = await pg.evaluate(JS); print(vp["width"], json.dumps(info, ensure_ascii=False))
            i = info["I"]; await pg.mouse.click(i[0] + i[2] / 2, i[1] + i[3] / 2); await pg.wait_for_timeout(1200)
            print("  formulaire ouvert :", await pg.evaluate("document.getElementById('s-devis').classList.contains('is-open')"))
            await pg.screenshot(path=str(ROOT / "qa" / f"cta_click_{vp['width']}.png"))
        await b.close()
asyncio.run(main())
