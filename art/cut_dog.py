import numpy as np, cv2, json
from PIL import Image
from scipy import ndimage as nd
A = '/mnt/user-data/attachments/4203fb82-25c1-57ed-8aef-d82fcf0fc845/'
OUT = '/home/claude/egg/app/src/main/assets/art/'
def cut(src, crop, open_side, name):
    rgb = np.asarray(Image.open(A + src).convert('RGB')).astype(np.float32)
    x0, y0, x1, y1 = crop
    rgb = rgb[y0:y1, x0:x1]
    L = rgb.mean(-1)
    H, W = L.shape
    paper = L > 236
    # seal the fur edge so the paper flood cannot creep into light fur
    solid = nd.binary_closing(~paper, structure=np.ones((3, 3)), iterations=4)
    lab, n = nd.label(~solid)
    edges = {'top': lab[0], 'bottom': lab[-1], 'left': lab[:, 0], 'right': lab[:, -1]}
    border = set()
    for k, v in edges.items():
        if k != open_side: border |= set(np.unique(v))
    border -= {0}
    bg = np.isin(lab, list(border))
    fg = ~bg
    lab2, n2 = nd.label(fg); sz = nd.sum(fg, lab2, range(1, n2 + 1))
    fg = lab2 == np.argmax(sz) + 1
    fg = nd.binary_fill_holes(fg) if open_side == 'none' else fg
    a = nd.gaussian_filter(fg.astype(np.float32), 1.0)
    # soften fur tips: light pixels at the very edge fade
    edge = fg & ~nd.binary_erosion(fg, iterations=3)
    a = np.where(edge, a * np.clip((250 - L) / 40, 0.3, 1), a)
    out = np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8)
    ys, xs = np.where(a > 0.05)
    if open_side == 'bottom': ys_max = H - 1
    out = out[ys.min():(H if open_side == 'bottom' else ys.max() + 1), (0 if open_side == 'left' else xs.min()):xs.max() + 1]
    im = Image.fromarray(out, 'RGBA')
    s = 720 / max(im.size)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im.save(OUT + name + '.webp', 'WEBP', quality=82, method=6)
    return {'w': im.width, 'h': im.height}
meta = {}
meta['dogBottom'] = cut('2c947a16-image.png', (0, 200, 1254, 1188), 'bottom', 'dog_peek_bottom')
meta['dogSide'] = cut('5d5d5e57-image.png', (0, 0, 1254, 1254), 'left', 'dog_peek_side')
spr = json.load(open('/home/claude/egg/art/sprites.json'))
spr['dog'] = meta
json.dump(spr, open('/home/claude/egg/art/sprites.json', 'w'), indent=1)
print(meta)
c = Image.new('RGBA', (1500, 760), (195, 195, 200, 255))
c.alpha_composite(Image.open(OUT + 'dog_peek_bottom.webp'), (0, 0))
c.alpha_composite(Image.open(OUT + 'dog_peek_side.webp'), (760, 0))
c.convert('RGB').resize((750, 380)).save('prev.png')
