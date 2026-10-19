"""Assemble des captures qa/<motif> en une planche (lecture rapide). Usage : python qa_strip.py sortie.jpg largeur fichier1 fichier2 ..."""
import sys
from PIL import Image
out, w, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert("RGB") for f in files]
ims = [i.resize((w, round(i.height * w / i.width))) for i in ims]
cols = min(len(ims), max(1, 2400 // (w + 8)))
rows = (len(ims) + cols - 1) // cols
H = max(i.height for i in ims)
s = Image.new("RGB", (cols * (w + 8), rows * (H + 8)), (255, 0, 255))
for k, i in enumerate(ims):
    s.paste(i, ((k % cols) * (w + 8), (k // cols) * (H + 8)))
s.save(out, quality=82)
