"""Builds app/src/main/assets/index.html from game-template.html and sprites.json.
The drawings themselves live in app/src/main/assets/art/ and the music in .../sound/.
Run:  python3 art/build.py"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
spr = json.load(open(os.path.join(here, 'sprites.json')))
page = open(os.path.join(here, 'game-template.html')).read().replace('/*SPRITES*/', 'const SPR = ' + json.dumps(spr, separators=(',', ':')) + ';')
out = os.path.join(here, '..', 'app', 'src', 'main', 'assets', 'index.html')
open(out, 'w').write(page)
print('wrote', os.path.normpath(out), len(page) // 1024, 'KB')
