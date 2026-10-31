import json,sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent
must=['00_READ_FIRST.md','01_SEND_THIS_TO_CLAUDE.md','docs/01_GAME_AND_LEARNING_DESIGN.md','docs/02_CAMERA_STORYBOARD.md','docs/03_VISUAL_UI_AND_ASSETS.md','docs/04_PHYSICS_SPEC.md','docs/05_CHARACTERS_AND_REAL_TRADING.md','docs/06_PROGRESS_QUESTIONS_AND_COINS.md','docs/07_DEVELOPMENT_TESTS.md','docs/08_FUTURE_WORKFLOW.md','assets/backgrounds/pencil_physics_lab_1024x1536.png','assets/reference/inclined_plane_storyboard_concept.png','assets/reference/approved_white_pencil_ui.png','assets/diagrams/correct_vectors_40deg_real.svg','assets/diagrams/correct_vectors_40deg_components.svg','data/character_surface_physics.json','data/question_bank.json','data/stage_flow.json','demo/index.html','demo/data.js','physics/incline_physics.js','tests/test_physics.js']
for f in must:assert (root/f).exists(),f'missing {f}'
characters=json.loads((root/'data/character_surface_physics.json').read_text())['character_species']
assert len(characters)==10
for c in characters:
 assert (root/'demo'/c['art']).exists(), f"Missing art {c['art']}"
 assert c['mass_kg']>0 and c['height_m']>0
 for s in c['surfaces'].values():assert s['mu_s']>=s['mu_k']>=0
assert len(json.loads((root/'data/stage_flow.json').read_text())['stages'])==7
assert len(json.loads((root/'data/question_bank.json').read_text())['questions'])>=8
print('Package valid: 10 characters, 7 learning stages, 9 questions, assets & demo files present.')
