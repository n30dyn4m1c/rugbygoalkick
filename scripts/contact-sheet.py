# Dev helper: tile screenshots/<size>-*.png into one image per size.
import sys, os
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else 'screenshots'
out = sys.argv[2] if len(sys.argv) > 2 else src
order = ['title', 'tutorial', 'establish', 'tee', 'aiming', 'drag', 'flight', 'result', 'doink', 'pause', 'settings', 'summary']
for size, scale in [('phone-portrait', 0.5), ('phone-landscape', 0.5), ('desktop', 0.5)]:
    ims = []
    for n in order:
        p = f'{src}/{size}-{n}.png'
        if os.path.exists(p):
            im = Image.open(p).convert('RGB')
            ims.append(im.resize((int(im.width * scale), int(im.height * scale))))
    if not ims:
        continue
    w, h = ims[0].size
    cols = 6 if size == 'phone-portrait' else 4
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w + (cols - 1) * 8, rows * h + (rows - 1) * 8), 'white')
    for i, im in enumerate(ims):
        sheet.paste(im, ((i % cols) * (w + 8), (i // cols) * (h + 8)))
    sheet.save(f'{out}/sheet-{size}.png')
