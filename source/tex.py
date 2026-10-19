"""Texture procédurale du pin cembro (arolle) pour le lit 3D du hero -> assets/tex-cembro.webp (couleur) + tex-cembro-n.webp
(normales), + tex-bois-gris.webp (même fil, blanchi, comme sur les rendus du client). Bois clair huilé, fil serré et ondulé, petits nœuds roux (signature de l'arolle), raccordable dans les deux sens.
Couleurs recalées sur la rondelle de pin cembro du site (média 20726). Usage : python tex.py"""
import pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).parent
DST = ROOT / "assets"
N = 1024
rng = np.random.default_rng(7)


def field(shape, power, rng):
    """Bruit périodique (donc raccordable) : spectre aléatoire en 1/f^power, normalisé 0..1."""
    ky = np.fft.fftfreq(shape[0])[:, None]
    kx = np.fft.fftfreq(shape[1])[None, :]
    k = np.sqrt(kx ** 2 + ky ** 2); k[0, 0] = 1
    spec = (rng.normal(size=shape) + 1j * rng.normal(size=shape)) / k ** power
    spec[0, 0] = 0
    f = np.real(np.fft.ifft2(spec))
    return (f - f.min()) / (f.max() - f.min())


def fibers(n, rng):
    """Profil 1D du fil (le long de x) : cernes irréguliers + fibres fines, périodique."""
    k = np.fft.fftfreq(n); k[0] = 1
    spec = (rng.normal(size=n) + 1j * rng.normal(size=n)) / np.abs(k) ** .7
    spec[0] = 0; spec[np.abs(np.fft.fftfreq(n)) < 6 / n] *= .2       # pas de grosse dérive de teinte
    f = np.real(np.fft.ifft(spec)); f = (f - f.min()) / (f.max() - f.min())
    rings = .5 + .5 * np.sin(np.linspace(0, 2 * np.pi * 46, n, endpoint=False) + 4 * f)
    return .7 * f + .3 * rings ** 2


y, x = np.mgrid[0:N, 0:N].astype(np.float32)
warp = (field((N, N), 2.6, rng) - .5) * 28                           # ondulation lente du fil
warp += (field((N, N), 1.6, rng) - .5) * 3
# nœuds : le fil contourne chaque nœud (déplacement en x qui s'écarte du centre)
knots = [(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(5, 12)) for _ in range(9)]
knot_mask = np.zeros((N, N), np.float32)
for kx, ky, r in knots:
    dx = (x - kx + N / 2) % N - N / 2; dy = (y - ky + N / 2) % N - N / 2
    g = np.exp(-(dx ** 2) / (2 * (r * 3) ** 2) - (dy ** 2) / (2 * (r * 7) ** 2))
    warp += 16 * np.sign(dx) * g
    knot_mask = np.maximum(knot_mask, np.exp(-(dx ** 2 + (dy * .75) ** 2) / (2 * r ** 2)))
prof = fibers(N, rng)
grain = prof[((x + warp) % N).astype(np.int32)]
grain = .8 * grain + .2 * field((N, N), 2.0, rng)                    # légère variation de teinte

stops = [(0, (176, 126, 80)), (.4, (210, 168, 116)), (.75, (230, 201, 158)), (1, (242, 223, 189))]
ts = np.array([t for t, _ in stops]); cols = np.array([c for _, c in stops], np.float32)
rgb = np.stack([np.interp(grain, ts, cols[:, i]) for i in range(3)], -1)
knot_col = np.array([108, 58, 30], np.float32)
halo = np.clip(knot_mask * 1.6, 0, 1)[..., None]
rgb = rgb * (1 - .35 * np.clip(knot_mask * 3, 0, 1)[..., None]) * (1 - halo * .0) + 0
rgb = rgb * (1 - np.clip(knot_mask * 1.3, 0, 1)[..., None]) + knot_col * np.clip(knot_mask * 1.3, 0, 1)[..., None]
Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(DST / "tex-cembro.webp", "WEBP", quality=86, method=6)

# variante gris délavé (rendus 3D du client) : même fil, bois blanchi, veines gris foncé bien marquées, nœuds éteints
stops = [(0, (84, 83, 82)), (.2, (146, 144, 141)), (.36, (206, 204, 200)), (.7, (226, 224, 220)), (1, (238, 236, 232))]
ts = np.array([t for t, _ in stops]); cols = np.array([c for _, c in stops], np.float32)
g2 = grain                                                          # fond clair, seules les veines les plus creuses restent sombres
rgb2 = np.stack([np.interp(g2, ts, cols[:, i]) for i in range(3)], -1)
km = np.clip(knot_mask * 1.1, 0, 1)[..., None] * .75
rgb2 = rgb2 * (1 - km) + np.array([92, 90, 88], np.float32) * km
Image.fromarray(np.clip(rgb2, 0, 255).astype(np.uint8)).save(DST / "tex-bois-gris.webp", "WEBP", quality=86, method=6)

# normales : relief faible (bois huilé, poncé), fibres un peu creusées, nœuds légèrement bombés
h = grain * .6 + knot_mask * .5
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 2.2
gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 2.2
nz = np.ones_like(h)
n = np.stack([-gx, gy, nz], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
Image.fromarray(((n * .5 + .5) * 255).astype(np.uint8)).save(DST / "tex-cembro-n.webp", "WEBP", quality=88, method=6)
for k in ("tex-cembro", "tex-bois-gris", "tex-cembro-n"):
    print(k, round((DST / f"{k}.webp").stat().st_size / 1024), "KB")
