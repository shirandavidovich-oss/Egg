import numpy as np, json, io
from PIL import Image
from scipy import ndimage as nd
A='/mnt/user-data/attachments/4203fb82-25c1-57ed-8aef-d82fcf0fc845/'
out = {}

def webp(im, name, q=80):
    im.save(name + '.webp', 'WEBP', quality=q, method=6)

# ---------- bursts (transparent sheets, 2 x 5 grid) ----------
bursts = []
for sheet, tag in [('e53d2944-image.png', 'b'), ('a8e4557b-image.png', 's')]:
    a = np.asarray(Image.open(A + sheet))
    for col in range(2):
        for row in range(5):
            x0, x1 = col * 627, (col + 1) * 627
            y0, y1 = int(row * 250.8), int((row + 1) * 250.8)
            cell = a[y0:y1, x0:x1]
            m = cell[..., 3] > 30
            ys, xs = np.where(m)
            if len(xs) < 500: continue
            c = cell[max(0, ys.min()-4):ys.max()+5, max(0, xs.min()-4):xs.max()+5]
            im = Image.fromarray(c, 'RGBA')
            s = 300 / max(im.size)
            im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
            name = f'fx_{tag}{col}{row}'
            webp(im, name, 82)
            bursts.append({'name': name, 'kind': 'burst' if tag == 'b' else 'stars', 'w': im.width, 'h': im.height})
out['fx'] = bursts

# ---------- pencil sheets on white: cut by outline ----------
def cutout(L, dark_thr=150, close=3, keep='largest', min_size=40):
    dark = L < dark_thr
    sealed = nd.binary_closing(dark, structure=nd.generate_binary_structure(2, 1), iterations=close)
    lab, n = nd.label(~sealed)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    inside = ~np.isin(lab, list(border))
    l2, n2 = nd.label(inside)
    sz = nd.sum(inside, l2, range(1, n2 + 1))
    if keep == 'largest':
        inside = l2 == (np.argmax(sz) + 1)
    else:
        inside = np.isin(l2, [i + 1 for i in range(n2) if sz[i] >= min_size])
    return inside

def body_metrics(mask):
    op = nd.binary_opening(mask, structure=np.ones((3, 3)), iterations=9)
    lab, n = nd.label(op); sz = nd.sum(op, lab, range(1, n + 1))
    body = lab == (np.argmax(sz) + 1)
    ys, xs = np.where(body)
    return float(xs.mean()), float(xs.max() - xs.min()), float(ys.min()), float(ys.max())

def sprite(sheet, box, name, ground_cut=True, close=3):
    im = np.asarray(Image.open(A + sheet).convert('L')).astype(np.float32)
    x0, y0, x1, y1 = box
    L = im[y0:y1, x0:x1]
    m = cutout(L, close=close)
    H = m.shape[0]
    ys, xs = np.where(m)
    if ground_cut:
        # drop the light pencil ground shading under the shoes
        bottom = ys.max()
        m &= ~((np.arange(H)[:, None] > bottom - 30) & (L > 165))
        m = nd.binary_opening(m, iterations=1)
        lab, n = nd.label(m); sz = nd.sum(m, lab, range(1, n + 1)); m = lab == (np.argmax(sz) + 1)
    # white gaps enclosed between the legs
    bright = (L > 215) & m
    lab, n = nd.label(bright)
    hh = np.where(m.any(1))[0]
    for i in range(1, n + 1):
        r = lab == i
        ys_, xs_ = np.where(r)
        if ys_.mean() > hh.min() + (hh.max() - hh.min()) * 0.72 and r.sum() > 150:
            m &= ~nd.binary_dilation(r, iterations=1)
    ys, xs = np.where(m)
    cx, bw, btop, bbot = body_metrics(m)
    feet = ys.max()
    bx0, by0, bx1, by1 = xs.min() - 3, ys.min() - 3, xs.max() + 4, ys.max() + 4
    al = nd.gaussian_filter(m.astype(np.float32), 0.8) * 255
    rgba = np.dstack([L, L, L, al]).clip(0, 255).astype(np.uint8)[by0:by1, bx0:bx1]
    img = Image.fromarray(rgba, 'RGBA')
    s = 520 / bw * 0.9          # body about the same drawing scale as the rig (rig body ~520 incl. arms)
    s = min(s, 1.0)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    webp(img, name, 80)
    return {'name': name, 'w': img.width, 'h': img.height,
            'ax': (cx - bx0) * s, 'ay': (feet - by0) * s, 'bodyW': bw * s,
            'bodyTop': (btop - by0) * s, 'bodyBot': (bbot - by0) * s}

poses = {}
Q = [(0, 0, 627, 627), (627, 0, 1254, 627), (0, 627, 627, 1254), (627, 627, 1254, 1254)]
names = {('098da83c-image.png', 0): 'worry1', ('098da83c-image.png', 1): 'worry2',
         ('098da83c-image.png', 2): 'scaredL', ('098da83c-image.png', 3): 'scaredR',
         ('2e4230dc-image.png', 0): 'oh', ('2e4230dc-image.png', 1): 'nervous',
         ('2e4230dc-image.png', 2): 'scream', ('2e4230dc-image.png', 3): 'wince',
         ('622f6f78-image.png', 0): 'flail1', ('622f6f78-image.png', 1): 'flail2',
         ('622f6f78-image.png', 2): 'flail3', ('622f6f78-image.png', 3): 'flail4'}
for (sheet, i), nm in names.items():
    if nm == 'nervous':
        Q2 = (640, 0, 1254, 627)
        poses[nm] = sprite(sheet, Q2, 'pose_' + nm, close=7); continue
    poses[nm] = sprite(sheet, Q[i], 'pose_' + nm, close=6 if nm == 'nervous' else 3)
# crack stages: 2 on top, 3 on the bottom
CB = [(150, 30, 627, 600), (627, 30, 1110, 600), (0, 610, 420, 1254), (420, 610, 836, 1254), (836, 610, 1254, 1254)]
for i, b in enumerate(CB):
    poses['crack%d' % (i + 1)] = sprite('cdd4b71e-image.png' if False else '90f3c756-image.png', b, 'pose_crack%d' % (i + 1))
out['poses'] = poses
json.dump(out, open('sprites.json', 'w'), indent=1)
for k, v in poses.items(): print(k, v['w'], v['h'], round(v['bodyW']))
