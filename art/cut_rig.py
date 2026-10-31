"""Cut each calm egg drawing (crack1..5) into: shell with no face and no arms,
left leg, right leg, plus two gloves. Records where eyes, brows, mouth and
shoulders sit, so the game can draw a moving face and arms on top."""
import numpy as np, json, cv2
from PIL import Image
from scipy import ndimage as nd
ART = '/home/claude/egg/app/src/main/assets/art/'
spr = json.load(open('/home/claude/egg/art/sprites.json'))
rig = {}

def save(arr, name):
    Image.fromarray(arr, 'RGBA').save(ART + name + '.webp', 'WEBP', quality=82, method=6)

for n in range(1, 6):
    key = f'crack{n}'
    im = np.asarray(Image.open(ART + f'pose_{key}.webp').convert('RGBA')).astype(np.float32)
    L, al = im[..., 0].copy(), im[..., 3].copy()
    A = al > 128
    H, W = A.shape
    op = nd.binary_opening(A, structure=np.ones((3, 3)), iterations=9)
    lab, k = nd.label(op); sz = nd.sum(op, lab, range(1, k + 1))
    blob = (lab == np.argmax(sz) + 1).astype(np.uint8)
    cnts, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(max(cnts, key=cv2.contourArea))
    shell = np.zeros((H, W), np.uint8); cv2.fillPoly(shell, [hull], 1)
    shell = nd.binary_dilation(shell.astype(bool), iterations=2)
    ys, xs = np.where(shell)
    sx0, sx1, sy0, sy1 = xs.min(), xs.max(), ys.min(), ys.max()
    sw, sh = sx1 - sx0, sy1 - sy0
    cx = (sx0 + sx1) / 2
    rows = np.arange(H)[:, None]; cols = np.arange(W)[None, :]
    outside = A & ~shell
    legs = outside & (((rows > sy1 - 6) & (np.abs(cols - cx) < 0.3 * sw)) | (rows > sy1 + 22))
    arms_out = outside & ~legs
    # upper arms drawn over the shell edge: dark strokes in the rim band touching the outside arm
    rim = shell & ~nd.binary_erosion(shell, iterations=26)
    dark = (L < 125) & rim & (rows > sy0 + sh * 0.55)
    grow = nd.binary_dilation(arms_out, iterations=2)
    arm_in = np.zeros_like(A)
    lab2, k2 = nd.label(dark)
    for i in range(1, k2 + 1):
        r = lab2 == i
        if (r & grow).any(): arm_in |= r
    arm_in = nd.binary_dilation(arm_in, iterations=2) & shell

    # face boxes, measured on crack1 and placed relative to each shell
    rel = lambda x0, y0, x1, y1: (int(sx0 + x0 * sw), int(sy0 + y0 * sh), int(sx0 + x1 * sw), int(sy0 + y1 * sh))
    boxes = {
        'browL': rel(0.355, 0.365, 0.445, 0.41), 'browR': rel(0.765, 0.375, 0.85, 0.44),
        'eyeL': rel(0.29, 0.415, 0.50, 0.635), 'eyeR': rel(0.645, 0.465, 0.86, 0.65),
        'mouth': rel(0.50, 0.605, 0.60, 0.655),
    }
    face = np.zeros_like(A)
    for b in boxes.values():
        x0, y0, x1, y1 = b
        face[y0:y1, x0:x1] = True
    # only erase the drawn marks inside the boxes (dark-ish), with a margin
    marks = face & (L < 218) & shell
    marks = nd.binary_dilation(marks, iterations=3) & face
    erase = (marks | arm_in) & shell
    img8 = np.clip(L, 0, 255).astype(np.uint8)
    filled = cv2.inpaint(img8, erase.astype(np.uint8) * 255, 6, cv2.INPAINT_TELEA).astype(np.float32)
    noise = np.random.default_rng(n).normal(0, 7, L.shape)
    Lb = np.where(erase, np.clip(filled + noise, 0, 255), L)
    # keep the shell's outline crisp where an arm was lifted off its edge
    edge = shell & ~nd.binary_erosion(shell, iterations=3) & nd.binary_dilation(arm_in, iterations=4)
    Lb[edge] = np.minimum(Lb[edge], 70)

    body_a = np.where(shell, al, 0)
    save(np.dstack([Lb, Lb, Lb, body_a]).clip(0, 255).astype(np.uint8), f'rig_body{n}')
    info = {'body': f'rig_body{n}', 'face': {k: list(map(int, v)) for k, v in boxes.items()},
            'shell': [int(sx0), int(sy0), int(sx1), int(sy1)]}
    for side, m in (('L', legs & (cols < cx)), ('R', legs & (cols >= cx))):
        yy, xx = np.where(m)
        x0, y0, x1, y1 = xx.min() - 2, yy.min() - 2, xx.max() + 3, yy.max() + 3
        a = nd.gaussian_filter(m.astype(np.float32), 0.6) * 255
        piece = np.dstack([L, L, L, np.minimum(a, al)]).clip(0, 255).astype(np.uint8)[y0:y1, x0:x1]
        save(piece, f'rig_leg{side}{n}')
        top = yy.min()
        hip = float(xx[yy < top + 5].mean())
        info['leg' + side] = {'img': f'rig_leg{side}{n}', 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0),
                              'hipX': hip, 'hipY': float(top)}
    # shoulders: where each outside arm meets the shell, and gloves (stage 1 only)
    for side, m in (('L', arms_out & (cols < cx)), ('R', arms_out & (cols >= cx))):
        lab3, k3 = nd.label(m); s3 = nd.sum(m, lab3, range(1, k3 + 1)); m = lab3 == np.argmax(s3) + 1
        yy, xx = np.where(m)
        top = yy.min()
        ry = int(sy0 + 0.70 * sh)
        rowx = np.where(shell[ry])[0]
        info['shoulder' + side] = [float(rowx.min() + 7 if side == 'L' else rowx.max() - 7), float(ry)]
        if n == 1:
            # glove = the lowest, widest part of the arm
            gy0 = yy.max() - 52
            g = m & (rows > gy0)
            gy, gx = np.where(g)
            x0, y0, x1, y1 = gx.min() - 2, gy.min() - 2, gx.max() + 3, gy.max() + 3
            a = nd.gaussian_filter(g.astype(np.float32), 0.6) * 255
            piece = np.dstack([L, L, L, np.minimum(a, al)]).clip(0, 255).astype(np.uint8)[y0:y1, x0:x1]
            save(piece, f'rig_glove{side}')
            # wrist = top middle of the glove crop
            wx = float(gx[gy < gy.min() + 6].mean()) - x0
            rig['glove' + side] = {'img': f'rig_glove{side}', 'w': int(x1 - x0), 'h': int(y1 - y0), 'wx': wx, 'wy': 2.0}
            info['armLen'] = float(yy.max() - top)
    rig[key] = info
    print(key, info['shell'], info['shoulderL'], info['shoulderR'])
spr['rig'] = rig
json.dump(spr, open('/home/claude/egg/art/sprites.json', 'w'), indent=1)
