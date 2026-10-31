"""Run: python tests/validate_bundle.py. Tests DATA/reference math, NOT the eventual Android application."""
from pathlib import Path
import json, math, zipfile
root=Path(__file__).resolve().parents[1]
cat=json.loads((root/'data/topics_20_families.json').read_text(encoding='utf-8'))
profiles=json.loads((root/'data/character_physics_profiles.json').read_text(encoding='utf-8'))['characters']
assert len(cat['topics'])==20, f"Expected 20 families, got {len(cat['topics'])}"
assert len(set(t['id'] for t in cat['topics']))==20
assert sum(t['ready_for_random'] for t in cat['topics'])==1
assert [t['id'] for t in cat['topics'] if t['ready_for_random']]==['springs']
assert len(profiles)==10
assert len(set(c['character_id'] for c in profiles))==10
for c in profiles:
 assert c['mass_kg']>0 and c['height_m']>0
 assert 0 <= c['collision_restitution']<=1
 p=c['ground_contact'];assert 0<=p['mu_kinetic']<=p['mu_static']
 for ext in (c['art_png'],c['art_svg']):
  assert (root/ext).is_file(),f"Missing art: {ext}"
for m,k,t in [(1,100,.6283185307),(4,100,1.2566370614)]:
 assert math.isclose(2*math.pi*math.sqrt(m/k),t,abs_tol=1e-8)
assert math.isclose(.5*100*.1**2,.5)
assert math.isclose(2*9.81/100,.1962)
print('PASS: 20 curriculum families, 10 referenced character assets, valid sample physics fields, spring math sanity')
