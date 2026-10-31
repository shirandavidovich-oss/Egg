# מצלמה, שינוי זווית צילום ואנימציות — מפרט מדויק

## מערך מסכים ותמיכה ב-2D
Portrait 9:16; רינדור לוגי מוצע 1080×1920, התאמת safe areas באנדרואיד. אין הכרח למנוע 3D: ב-2D אפשר ליצור camera rig עם scale+translate, רקע שכבות/parallax, שינוי נקודת תצפית אמנותי מדורג באמצעות 3 רנדרים (front 3/4 -> mid shot -> side orthographic). התרשים המדעי הסופי הוא **מבט צד אורטוגרפי** ללא perspective distortion. תנועת מצלמה היא שינוי הצגה, **לא סיבוב העולם או כיוון הכבידה**.

## תסריט פתיחה שניתן לביצוע
00:00–00:01.0 — CLOSE-UP: creature occupying 55–65% of screen width at (50%,57%); static flat line under feet; no triangle or physics arrows yet. White/light graphite background; small breathing/blinking loop.
00:01.0–00:02.0 — cue "תרים את הקצה של המשטח" + hand icon pointing to right-edge grip. Sound tiny pencil 'tap'. Avoid automatic movement until first drag (accessibility: tap 'המשך').
At first drag, 0–0.45s — CAMERA PULLBACK: scale 1.7 -> 1.15, translate focus from creature to center at easing cubic-out; reveal table edges and triangle legs; 3/4 angle -> side by crossfade / camera orbit if 3D engine. Character stays on contact plane, no float.
0.45–1.1s — camera 1.15 -> 1.00, pan to include pivot, right edge, angle marker θ; scene gets brighter/cleaner, triangle outline drawn progressively like pencil (~350 ms). Keep hand drag mapping stable after camera transform.
1.1–1.6s — finish SIDE 2D view, lock horizon horizontal and gravity world axis downward; reveal force overlay toggle gently; show current angle in degrees.
After reveal — camera stays side-on for experiments. When the ramp exceeds static threshold, gently FOLLOW sprite along incline without zooming away from the force diagram; mini-map/angle stays stable. At bottom show comic squash once but no impossible continuation.

## Stage camera keys
Stage 1: scale 1.75, crop foot area, neutral front-ish sketch; reveal mg/N; theta 0.
Stage 2: animated pullback to 1.00, change camera presentation to side view, expose ramp, pivot, θ.
Stage 3: no zoom; temporary pause sim on first vector demonstration; allow overlay swap real forces/components.
Stage 4: side view plus close-up inset/zoom on feet only when threshold approached; do not obscure the main graph.
Stage 5: side view with small predictable follow camera and fixed HUD; avoid motion sickness.
Stage 6: side by side result cards with ghosts/past-run traces; reset run to same θ, surface, velocity=0, position before compare.
Stage 7: side small inset, question foreground; press 'בדוק בניסוי' returns to simulation preserving question state.

## Scene graph suggestions
BackgroundLayer (pencil room at 10%–25% contrast, cropped to viewport)
CameraRig -> {WorldLine, TriangularRamp, ContactSurface, CharacterRig, ShadowContact, ForceDiagramWorld, PositionTrack}
HudLayer (Coins, GlobalProgress, TopicProgress, Stage, Sound, Help)
OverlayLayer (speech bubble, math card, optional question, trade modal)
RewardLayer (coins emitted near creature -> count pill in upper header)

Character art anchor at physics foot contact (not image center). collision geometry scaled from `height_m` for visual comparison but can clamp rendering within legibility. Never distort dimensions merely to match screenshot. For sprite tilt while ramp tilts, rotate small body to follow surface normal but keep facial expression readable; physically rotate sprite with ramp ~theta unless animation rig supports balancing.

## Force graphics
Compute anchor world at center of mass projected above contact; display force arrows from same anchor for clarity (pedagogical 'all arrows from one point' diagram). Gravity arrow WORLD DOWN. N perpendicular to surface and outward; static/kinetic friction uphill when creature tends to/does slide downhill. When using components, gravity mg shown in thinner/dashed form and its TWO components along slope and into plane; label 'רכיבי הכבידה — לא כוחות נוספים'. Real Forces/Components are different views; do not sum mg and its components together in dynamics.

## Motion accessibility & polish
30–60 fps visual target; update simulation with fixed step independent of frame rate (e.g. 1/120s). Easing camera 500–1200ms. 2D vector arrows rerender as angle changes. Reward coins 10–16 sprites flying along Bezier curves in 0.55–1.0s, light bounce, update number exactly once on server/local ledger success. Reduce-motion replaces fly animation with +N badge; mute/audio captions support.

## Visual QA
- At θ=0: ramp flat, mg arrow downward, N upward, no accidental friction arrow when no tendency to move.
- At θ>0: mg unchanged direction; N rotates normal to ramp; components rotate with ramp and sum to mg.
- At θ=55: triangle within screen, hero entirely visible, no clipping of arrows/degree label.
- Small screens: bottom CTA not covering slope; headers inside safe area; RTL layout.
