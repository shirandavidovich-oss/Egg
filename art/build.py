"""Builds app/src/main/assets/index.html from game-template.html, sprites.json and the
physics files. Everything ends up in the one page, so a code change reaches phones without
a reinstall (the app fetches the newest index.html). Drawings and sounds stay separate files.
Run:  python3 art/build.py"""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
spr = json.load(open(os.path.join(here, 'sprites.json')))
page = open(os.path.join(here, 'game-template.html')).read()
page = page.replace('/*SPRITES*/', 'const SPR = ' + json.dumps(spr, ensure_ascii=False, separators=(',', ':')) + ';')
def include(m):
    path = os.path.join(here, m.group(2))
    text = open(path).read()
    # the module.exports line is only for the tests (node)
    return re.sub(r'\nif \(typeof module !== "undefined"\) module\.exports = \w+;\n?', '\n', text)
page = re.sub(r'/\*(INCLUDE|INCLUDE_CSS|INCLUDE_HTML):([^*]+)\*/', lambda m: include(type('M', (), {'group': lambda self, i: m.group(i)})()), page)
out = os.path.join(here, '..', 'app', 'src', 'main', 'assets', 'index.html')
open(out, 'w').write(page)
print('wrote', os.path.normpath(out), len(page) // 1024, 'KB')
