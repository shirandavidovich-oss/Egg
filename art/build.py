"""Builds app/src/main/assets/index.html from game-template.html plus the art in this folder.
The art is embedded in the page, so the one file is everything the phone needs.
Run:  python3 art/build.py"""
import base64, json, os
here = os.path.dirname(os.path.abspath(__file__))
def uri(name):
    with open(os.path.join(here, name), 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode()
art = {'body': uri('egg-body.webp'), 'armL': uri('egg-arm-left.webp'),
       'armR': uri('egg-arm-right.webp'), 'nest': uri('nest.webp')}
meta = json.load(open(os.path.join(here, 'parts.json')))
meta = {k: meta[k] for k in ('armL', 'armR', 'body')}
js = 'const ART = ' + json.dumps(art) + ';\nconst META = ' + json.dumps(meta) + ';'
page = open(os.path.join(here, 'game-template.html')).read().replace('/*ART*/', js)
out = os.path.join(here, '..', 'app', 'src', 'main', 'assets', 'index.html')
open(out, 'w').write(page)
print('wrote', os.path.normpath(out), len(page) // 1024, 'KB')
