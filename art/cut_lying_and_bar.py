import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
A='/mnt/user-data/attachments/4203fb82-25c1-57ed-8aef-d82fcf0fc845/'
d = json.load(open('sprites.json'))

# ---------- lying, dizzy egg (cut away from the nest) ----------
im = np.asarray(Image.open(A + 'edc99b55-image.png').convert('L')).astype(np.float32)
x0, y0, x1, y1 = 80, 350, 700, 960
L = im[y0:y1, x0:x1].copy()
H, W = L.shape
rows = np.arange(H)[:, None]; cols = np.arange(W)[None, :]
# shell ellipse: centre, half axes and angle read off the drawing
X = cols + x0; Y = rows + y0
cxE, cyE, aE, bE, th = 455, 705, 232, 192, np.radians(-31)
u = (X - cxE) * np.cos(th) + (Y - cyE) * np.sin(th)
v = -(X - cxE) * np.sin(th) + (Y - cyE) * np.cos(th)
q = (u / aE) ** 2 + (v / bE) ** 2
shell = q <= 1.02
allowed = shell | (X < 600) | ((Y < 540) & (X < 650)) | ((Y > 870) & (X < 672))
dark = (L < 150) & allowed
sealed = nd.binary_closing(dark, structure=nd.generate_binary_structure(2, 1), iterations=3)
lab, n = nd.label(~sealed)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
inside = ~np.isin(lab, list(border))
inside |= (q <= 0.97) & (X > 560)
inside |= (q <= 0.9)
inside &= allowed
inside &= ~((rows > H - 70) & (L > 160))
lab, n = nd.label(inside); sz = nd.sum(inside, lab, range(1, n + 1))
keep = np.isin(lab, [i + 1 for i in range(n) if sz[i] > 25])
body = q <= 1.0
ys, xs = np.where(keep)
bx0, by0, bx1, by1 = xs.min() - 3, ys.min() - 3, min(W, xs.max() + 4), ys.max() + 4
al = nd.gaussian_filter(keep.astype(np.float32), 0.8) * 255
rgba = np.dstack([L, L, L, al]).clip(0, 255).astype(np.uint8)[by0:by1, bx0:bx1]
Image.fromarray(rgba, 'RGBA').save('pose_lying.webp', 'WEBP', quality=80, method=6)
# shell: find the big body blob for the anchor (centre of the shell's bottom)
bys, bxs = np.where(body)
d['poses']['lying'] = {'name': 'pose_lying', 'w': int(bx1 - bx0), 'h': int(by1 - by0),
                       'ax': float(bxs.mean() - bx0), 'ay': float(bys.max() - by0),
                       'shellLen': float(np.hypot(bxs.max() - bxs.min(), bys.max() - bys.min()) * 0.78)}
print('lying', d['poses']['lying'])

# ---------- power bar ----------
src = np.asarray(Image.open(A + 'cdd4b71e-image.png').convert('RGB')).astype(np.float32)
def white_to_alpha(rgb, solid=None):
    mn = rgb.min(-1)
    a = np.clip((255 - mn) / 255 * 1.6, 0, 1)
    if solid is not None: a = np.maximum(a, solid)
    a3 = np.maximum(a, 1e-3)[..., None]
    col = (rgb - (1 - a3) * 255) / a3
    return np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)

def solid_inside(rgb):
    Lg = rgb.mean(-1)
    dark = Lg < 120
    sealed = nd.binary_closing(dark, iterations=2)
    lab, n = nd.label(~sealed)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return (~np.isin(lab, list(border))).astype(np.float32)

rows = [(100, 278), (300, 492), (515, 708), (730, 925), (940, 1172)]
bar = {}
for i, (ya, yb) in enumerate(rows):
    icon = src[ya:yb, 130:355]
    ic = white_to_alpha(icon, solid_inside(icon))
    m = ic[..., 3] > 20; ys, xs = np.where(m)
    ic = ic[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(ic, 'RGBA').save(f'bar_icon{i + 1}.webp', 'WEBP', quality=82, method=6)
    bar[f'icon{i + 1}'] = {'w': ic.shape[1], 'h': ic.shape[0]}
# empty frame (row 1) and full bar (row 5), same box
for nm, (ya, yb), xa, xb in [('empty', (130, 290), 340, 1075), ('full', (1000, 1185), 330, 1092)]:
    part = src[ya:yb, xa:xb]
    rgba = white_to_alpha(part, solid_inside(part))
    m = rgba[..., 3] > 20; ys, xs = np.where(m)
    rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(rgba, 'RGBA').save(f'bar_{nm}.webp', 'WEBP', quality=85, method=6)
    # inner tube: columns where the dark frame top/bottom lines are present
    g = rgba[..., :3].mean(-1); a = rgba[..., 3]
    darkcols = ((g < 90) & (a > 200)).sum(0)
    bar[nm] = {'w': rgba.shape[1], 'h': rgba.shape[0]}
    print(nm, rgba.shape)
d['bar'] = bar
json.dump(d, open('sprites.json', 'w'), indent=1)
prev = Image.new('RGBA', (900, 700), (205, 205, 207, 255))
prev.alpha_composite(Image.open('pose_lying.webp'), (10, 10))
prev.alpha_composite(Image.open('bar_empty.webp').resize((560, 80)), (300, 470))
prev.alpha_composite(Image.open('bar_full.webp').resize((560, 80)), (300, 580))
for i in range(5): prev.alpha_composite(Image.open(f'bar_icon{i+1}.webp').resize((60, 50)), (620 + i * 55, 20))
prev.convert('RGB').save('prev-lie-bar.png')
