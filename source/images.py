"""Images de la landing -> assets/*.webp aux tailles d'usage, + assets/stars.json (étoiles du plafond du lit, pour le scintillement).
Source unique : la médiathèque WordPress de carmelocrea.ch (../_site/media/<id>.<ext>, index ../_site/media_all.json).
Aucune photo de stock : tout vient de son site."""
import json, pathlib
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).parent
MEDIA = ROOT.parent / "_site" / "media"
DST = ROOT / "assets"
DST.mkdir(exist_ok=True)
src = lambda i: next(MEDIA.glob(f"{i}.*"))


def crop(box):  # box en fractions (gauche, haut, droite, bas)
    return lambda im: im.crop(tuple(round(v * (im.width if k % 2 == 0 else im.height)) for k, v in enumerate(box)))


def tint(color, k=1):
    """« Le même lit sous une autre lumière » : duotone nuit -> couleur -> blanc teinté (contraste renforcé), mêlé à k."""
    c = tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))
    lo = tuple(round(v * .06) for v in c)
    hi = tuple(round(v + (255 - v) * .3) for v in c)
    def f(im):
        g = im.convert("L")
        lut = [tuple(round(lo[j] + (hi[j] - lo[j]) * min(1, (x / 235)) ** 1.35) for j in range(3)) for x in range(256)]
        duo = Image.merge("RGB", [g.point([lut[x][j] for x in range(256)]) for j in range(3)])
        return Image.blend(im.convert("RGB"), duo, k)
    return f


def on_black(ratio):
    """Rondelle de pin cembro (fond noir) posée dans un cadre portrait noir, sans la recadrer."""
    def f(im):
        w = im.width; h = round(w / ratio)
        out = Image.new("RGB", (w, h), (8, 8, 8)); out.paste(im.convert("RGB"), (0, (h - im.height) // 2))
        return out
    return f


HERO_W, HERO_X = 1920, 894   # composition 16/9 : le lit étoilé (1026x1080) calé à droite, la gauche en nuit pour le titre


def hero(im):
    """Lit étoilé posé à droite d'une toile 1920x1080 couleur --night, bord gauche fondu sur 420 px (aucun agrandissement)."""
    im = im.convert("RGB")
    out = Image.new("RGB", (HERO_W, im.height), (14, 16, 20))
    F = 420                                      # fondu : 0 à gauche -> 255 à droite, courbe douce
    mask = Image.new("L", (F, 1)); mask.putdata([round(255 * (i / F) ** 1.8) for i in range(F)])
    mask = mask.resize((F, im.height))
    full = Image.new("L", im.size, 255); full.paste(mask, (0, 0))
    out.paste(im, (HERO_X, 0), full)
    return out


PORTRAIT = crop((.33, 0, .84, 1))   # 20560 : le lit à baldaquin en 4/5 (tête de lit, rideaux, plafond étoilé)

# clé : (id média, largeur max, qualité, transformation)
MAP = {
    # espace nuit « L'Éveil des sens » (page /espace-nuit/)
    "hero": (20721, 1920, 86, hero),                  # le lit étoilé dans la composition 16/9 du hero
    "lit-etoiles": (20721, 1026, 86, None),          # lit capitonné, plafond étoilé (fibre optique), murs de marbre noir, bougies
    "lit-baldaquin": (20560, 1694, 84, None),        # lit à baldaquin en bois clair, rideaux, tableau abstrait, rendu gris
    "canal-chromo": (20560, 1000, 82, lambda im: tint("#8E7BFF")(PORTRAIT(im))),   # le même lit en lumière violette
    "canal-aroma": (20560, 1000, 82, lambda im: tint("#E2A35E")(PORTRAIT(im))),    # ambrée
    "canal-sono": (20560, 1000, 82, lambda im: tint("#6E92EC")(PORTRAIT(im))),     # bleu nuit
    "canal-hydro": (20560, 1000, 82, lambda im: tint("#58C2BE")(PORTRAIT(im))),    # turquoise
    "canal-cembro": (20726, 800, 86, on_black(4 / 5)),  # rondelle de pin cembro sur noir, cadre 4/5
    "cembro": (20726, 800, 86, None),                # rondelle de pin cembro (paysage, fond noir)
    "oreiller": (20708, 900, 82, None),              # chevelure sur un oreiller gris, couette (gros plan)
    "draps": (20696, 672, 84, None),                 # oreillers blancs, tête de lit capitonnée (portrait)
    "esquisse": (20770, 638, 86, None),              # esquisse au crayon du concept (structure du lit, plafond)
    # rénovations réelles (pages Réalisations, Hôpital de la Tour, Appartement, Loft, Terrasse)
    "sdb-avant": (20948, 900, 82, crop((0, 0, .42, 1))),        # salle de bains sous les combles AVANT : baignoire verte, carrelage
    "sdb-apres": (20948, 1100, 82, crop((.53, 0, 1, 1))),       # la même APRÈS : baignoire balnéo, enduit, éclairage
    "sdb-chromo": (20944, 1916, 82, None),                      # la même avec plafond tendu imprimé (galaxie bleue | nébuleuse rouge)
    "hammam": (20422, 1600, 80, None),                          # hammam de l'Hôpital de la Tour : banquettes, filet de lumière
    "appartement": (20456, 1600, 80, None),                     # appartement rénové : séjour, cuisine ouverte, verdure
    "loft": (20447, 1400, 80, None),                            # loft : cuisine blanche, comptoir noir, estrade en chêne
    "terrasse": (20396, 640, 86, None),                         # terrasse suspendue, vue sur Genève et le jet d'eau (640 px)
    # avant / après (Sliders #2) : mêmes chantiers, même angle, recadrés en 4/5
    "av-sdb-avant": (20948, 900, 84, crop((.085, 0, .462, 1))),     # salle de bains sous les combles AVANT (baignoire verte, lambris)
    "av-sdb-apres": (20948, 900, 84, crop((.55, 0, .925, 1))),      # la même APRÈS (baignoire balnéo, enduit, éclairage)
    "av-hublot-avant": (20453, 1000, 82, crop((0, .08, 1, .783))),  # pièce au hublot (appartement) mise à nu
    "av-hublot-pendant": (20452, 1000, 82, crop((0, .10, 1, .803))),  # la même, parquet livré en piles
    "av-hublot-apres": (20454, 1000, 82, crop((0, .12, 1, .823))),  # la même APRÈS : parquet posé, chaise longue, tableaux
    # visuels liés aux avis (produits Thalassor posés par CREA)
    "balneo": (20513, 900, 82, None),                # baignoire balnéo encastrée, vue mer
    "balneo-bain": (16649, 720, 84, None),           # femme dans un bain moussant, pétales
    "douche-hammam": (20554, 800, 84, None),         # cabine douche hammam noire, ciel de pluie
}


def stars():
    """Étoiles du plafond de lit-etoiles : petits points très clairs dans le haut de l'image, en fractions (x, y)."""
    im = Image.open(src(20721)).convert("L")
    w, h = im.size
    top = im.crop((0, 0, w, round(h * .2)))
    blur = top.filter(ImageFilter.GaussianBlur(3))
    px, bl = top.load(), blur.load()
    pts = []
    for y in range(2, top.height - 2):
        for x in range(2, w - 2):
            v = px[x, y]
            if v > 215 and v - bl[x, y] > 55 and v == max(px[x + dx, y + dy] for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)):
                if all((x - a) ** 2 + (y - b) ** 2 > 64 for a, b in pts):
                    pts.append((x, y))
    # coordonnées dans la composition du hero (fractions de 1920x1080)
    return [(round((HERO_X + x) / HERO_W, 4), round(y / h, 4)) for x, y in pts]


if __name__ == "__main__":
    for key, (i, w, q, fn) in MAP.items():
        im = Image.open(src(i))
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        if fn: im = fn(im)
        if im.width > w:
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(DST / f"{key}.webp", "WEBP", quality=q, method=6)
        print(f"{key:15s} {im.size} {round((DST / f'{key}.webp').stat().st_size / 1024)} KB")
    s = stars()
    (DST / "stars.json").write_text(json.dumps(s))
    print("étoiles", len(s))
