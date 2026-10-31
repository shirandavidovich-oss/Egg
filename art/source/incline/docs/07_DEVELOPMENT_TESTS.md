# Implementation plan and acceptance criteria — Claude

## אינטגרציה מבוקרת
- אבחן engine בפרויקט בפועל: Android native/Unity/Godot/webview/React Native? אל תניח מסגרת. כתוב רכיב בהתאם ל-stack שקיים.
- צור feature flag `inclinePlaneMinigame` עד אישור משתמש. אל תחליף את הקוד של spring/egg. צעד לשילוב מהמכונה הפיסיקלית (`physics_topic: forces_incline`).
- UI ישתמש בדמות הפעילה מתוך storage; אין להחליף סתם לדוגמת sparkit. אם חסרה דמות, הסבר בחירת/בקיעת דמות, אל תאבד התקדמות.
- שמירת מצב: schema version + migration; זווית/last stage/history; player-owned coins, topic and global meters; migration test עותקים קיימים.

## בדיקות אוטומטיות מחייבות
1. θ=0,m2,g10 => W20,N20,parallel0, f_s0, acceleration0.
2. θ=30,m2,g10,µs=.6,µk=.4 => static holds, f_s10,N17.3205,a0.
3. θ=40,m2,g10,µs=.6,µk=.4 => sliding, f_k≈6.128, a≈3.3637 m/s².
4. θ=atan(µs), static allowed at threshold (small tolerance); just beyond: slide.
5. µs=µk=0 => sliding whenever angle>0, a=g sinθ.
6. m1 vs m4, same µ/g/θ => same a if sliding, same critical angle; force magnitudes 4×.
7. with different µs on same ramp: one creature stuck, another slides (mass alone not culprit).
8. vectors mathematical decomposition recombine to original weight within epsilon; FBD always 3 real forces max (mg,N,f) and components never double counted.
9. gravity arrow remains vertical regardless of angle/camera; normal perpendicular to ramp.
10. contact zero penetration and smooth fixed-step movement; bottom reset doesn't award repeated money.
11. swapping active character leaves player coins/progress/mastery unchanged; trade failure rollback keeps ownership.
12. static friction shows actual required value not µsN unless at slip threshold.
13. duplicate stage finish/event cannot award coins twice; refresh does not reset stages.
14. 360dp narrow Android portrait: all text readable/scrollable, all controls reachable and safe areas.
15. accessibility: reduced motion, mute and captions, keyboard/angle +- controls.
16. each of 7 stages reachable without network/referral; online trade clearly disabled if missing service.

## Handheld exploratory test plan
- Run intro, zoom camera out, drag ramp smoothly from 0° to 55°; check character foot grounded.
- Toggle 'כוחות' vs 'רכיבים', watch directions/labels and results.
- Change angle slowly across θcrit and then back; verify transition, stop and reset behavior.
- Check friction material controls if implemented; no mass sliders.
- Watch one coin burst; confirm balance + single value after reload.
- Compare with swapped character in test fixture; check old player retains progress.
- Quiz answer right/wrong; replay without losing previous topic progress.

## Definition of done
- Android build passes and produces test APK if supported; compiler/lint/tests pass.
- Playable incline mini-game from existing game's physics selection + slot machine; 7 stages finished, sound/captions, background, character animation, responsive UI.
- Numeric physics verified against fixtures; no scientific deception in dialogues.
- Coin and progress ledger survive restarts, swap doesn't transfer progress.
- Real player-to-player trade either implemented securely with backend and tested, or honestly marked not available / remaining task.
- Screenshots from actual running app at θ=0,20,40 with both force views, coin burst, character drawer.
- Final change report: what completed, not completed, changed file paths, build commands/tests, APK path (if available), platform assumptions and known issues.
