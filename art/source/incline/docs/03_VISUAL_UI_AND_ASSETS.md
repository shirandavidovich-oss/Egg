# Style bible: דף לבן ועיפרון, צבע פונקציונלי בלבד

## כלל עיצוב
החזון החדש מחליף את ה-neon/steampunk: white #FCFCFB, pencil dark #2E3033, fine gray #B9BBC0, shadows very light. Accent only: gravity blue #2785C7, N violet #8969C6, friction magenta #CC5794, parallel gravity orange #E39B28, perpendicular green #42A47A, progress cyan/green #3FAACB/#47B56B, gold coins #EFB12F. UI high contrast, avoid 7 icons competing with the experiment.

## Asset priorities
1. Re-use actual character (ownedCharacterInstance ID) from game data, not hardcode fox or sample creature. New 2048×2048 transparent PNGs are fallback/reference, and need sprite state overlays for facial expression.
2. Pencil room background `assets/backgrounds/pencil_physics_lab_1024x1536.png`. Keep experiment center visually uncluttered; fade background to <=15% opacity when scientific force diagram active. Do not use as fixed text background behind formula.
3. Incline = **programmatic SVG/Canvas mesh** with pencil outline (not baked image), so angle reflects calculation. Triangle hatch subtle, friction texture small at foot contact.
4. Force arrows = live programmatic vectors with labels placed avoiding character/other vectors; do not bake arrow graphics inside screenshots.
5. `assets/reference/inclined_plane_storyboard_concept.png`: conceptual board only; some handwritten labels are noisy and may be wrong; **do not ship as app screen or derive physics from it**.

## HUD (portrait)
Top left [חזרה] [השתק] (small outlined graphite); top right [gold coin x balance] (white card with gold icon). Under header: `התקדמות בפיזיקה xx%` horizontal cool blue/green 4–6px, `כוחות במישור משופע xx%` warmer violet/pink bar; bars should feel quiet not dominate.
Center: main drawing (60% vertical real estate), animated character, triangle, color-coded vectors, small angle chip.
Bottom: 1 stage sentence; big area to drag ramp grip; one primary button relevant to step (e.g. 'פצל כוח', 'בדוק בניסוי', 'אפס') plus hidden 'ℹ️' detailed formulas.
Optional drawer: persistent 'תכונות הדמות' mass, height, µs, µk; all **read-only**. Show 'החלף עם חבר' accessible, but online exchange only if backend available.

## Controls and exact mechanics
- Angle: drag visible handle at ramp upper end, live 0–55°; optional [−]/[+] angle controls for accessibility. Not restricted to only slider if mobile drag clear.
- Surface chooser optionally unlocked only after wood stage: עץ יבש / קרח / גומי. It changes contact material, NOT the creature's physical body. Dynamic coefficients resolved pair-wise (see data/character_surface_physics.json).
- Modes FBD / פירוק mg: segmented control, indicate that components are mathematical representation of mg.
- Pause/reset: clear velocity and return to starting position at same θ and same body.
- Quiz: two or three text-light answers, hint button, retry, optional show full solution.
- Character read-only badge; social swap dialog and 'השווה תוצאות' when real swap done.

## Gold coins & progress
Reward moment: completed meaningful discovery -> 8–12 golden coins leap out from beside character following bezier path to coin pill, scale 0.7–1.2, glints, +10 badge. Coin counter increases once, not once per particle, not multiplied by attempts or by referral. Topic bar advances only for unique unlocked concepts; global bar advances by syllabus coverage weight, not raw coins. Keep particles away from formula for readability. Muted mode uses caption +N.

## Example copy
Intro "מה? אני רק יושב פה!"; camera reveal "מי הפך לי את הרצפה למשולש?!"; static near threshold "הרגליים שלי עוד מחזיקות..."; kinetic "אאאאא! איפה הבלמים?!"; success "גילית שכוח הכובד לא הסתובב עם המדרון! +10 מטבעות"; compare "היצור החדש לא כבד רק בגרפיקה — יש לו נתונים פיזיקליים אחרים."

## Display precision
Hebrew RTL for headings; math LTR for formulas, numbers in fixed LTR order: F = mg, N = mg cosθ. Vector magnitude to 1 decimal N, θ whole degrees, a to 2 decimals m/s²; avoid false equivalences based on rounded numbers. Font Noto Sans Hebrew/system font; do not include proprietary font binaries. For accessibility, color + shape/label (not color alone).
