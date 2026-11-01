# Egg

An egg waits in a nest, deep behind the phone's screen. Tilt the phone and it rolls.
The screen behaves like a window: tilting shifts your view so the burrow feels 3D.

## Install on the phone

Every push to `main` builds a new APK automatically (GitHub Actions, about 3–5 minutes).
Download the newest one, signed in to GitHub on the phone:

**https://github.com/shirandavidovich-oss/Egg/releases/latest/download/Egg.apk**

New builds install over the old one.

## Updates

Install the APK once. After that, every launch fetches the newest game file
(`app/src/main/assets/index.html`) from this repo, so changes to the game show up the next
time the app opens, with no reinstall. Offline, the app uses the last version it saved.
A new APK is only needed when the Android part changes.

Drawings (`app/src/main/assets/art/`) and sounds (`.../sound/`) ship inside the app. A file the
installed app does not have yet is downloaded from this repo once and kept, so **new art gets a
new file name** (changing an existing file only reaches phones with a fresh install).

## Where things are

| What | File |
|---|---|
| The game code (edit this one) | `art/game-template.html` |
| Built page the phone loads (made by `python3 art/build.py`) | `app/src/main/assets/index.html` |
| Cut-out drawings, music | `app/src/main/assets/art/`, `.../sound/` |
| The original drawings as made | `art/source/` |
| Where each drawing's feet and size are | `art/sprites.json` |
| Android shell: full screen + tilt sensor | `app/src/main/java/com/shiran/egg/MainActivity.java` |
| App name, orientation | `app/src/main/AndroidManifest.xml` |
| Automatic APK build | `.github/workflows/build-apk.yml` |

Opening `index.html` in a desktop browser shows the scene too: press and hold to tilt.

## Physics (learning with your creature)

After hatching, a **פיזיקה** button sits at the bottom of the nest screen and the coins at the top.
Inside: choose **תפתיע אותי** (topic machine with a lever) or **לפי הסדר**, then the first mini game,
**קפיץ־קפוץ**: the creature hangs on a vertical spring; drag it down, let go, change k, m and damping.
Its mass comes from the creature, so switching or trading creatures changes the physics, never the
player's coins or progress.

| What | File |
|---|---|
| Spring physics: hanging, and from a wall on a floor with friction | `art/physics/spring.js` |
| Inclined plane physics (forces, static/kinetic friction, sliding) | `art/physics/incline.js` |
| Player profile: coins ledger, progress, owned creatures | `art/physics/profile.js` |
| Screens, lever, lab, coins, map | `art/physics/ui.js`, `ui.css`, `ui.html` |
| Tests (run in the APK build) | `tests/spring.test.js`, `tests/incline.test.js`, `tests/profile.test.js` |
| The specs and art they are built from | `art/source/physics/`, `art/source/incline/` |

Mini games so far: **קפיץ־קפוץ** (springs; switch between a hanging spring and a spring from the wall
on wood, ice or rubber) and **מי מושך אותי?!** (inclined plane in 7 stages; only the angle and the
surface can change, the creature's body is fixed).

**Calculator, explanations, history** (`art/physics/explain.js`, data in `art/physics/laws-data.js`):
- A calculator button sits in the top bar of every physics screen, next to the sound button (degrees, g, π, ans).
- Tap a formula (or its ▶) to play a short explanation: each letter appears with its meaning and current value,
  the operations are said in words, the numbers are put in, and an arrow carries the answer to the result.
- Names of laws (📜, e.g. חוק הוק) and of scientists are tappable: when, who, why it was needed, how it was found.
  From there: a timeline chart (year across, scientists down in א-ב order); tap a name to learn who they were.
- Tests: `tests/explain.test.js`.

These files are pulled into `index.html` by `art/build.py`, so they update phones without a reinstall.

## Live wallpaper

Long-press the egg or creature (about a second): it asks to go on the home screen. ✓ opens Android's
wallpaper preview with "Set wallpaper". The wallpaper (`EggWallpaper.java`) draws the room, nest and
the current egg or creature; it breathes, hops now and then or when tapped, and follows the tilt.
The game tells it which drawing to show whenever that changes.

## Trading creatures between phones

After hatching, swipe up: the creature asks whether to trade (✓ / ✗). On ✓ the phone looks for
another phone nearby doing the same (Bluetooth / Wi-Fi, no internet, no server:
`app/src/main/java/com/shiran/egg/PhoneLink.java`, reusable for the spaceship game). Each player
sees the other creature and answers ✓ / ✗; when both say yes, each creature leaves through the top
of its screen and lands on the other phone.

While the server is off (demo) a trade is trusted between the two phones. When the server is on,
trades must go through it so a creature cannot be copied.

## Server (Supabase)

**Off for now (demo):** `SERVER.enabled` in `art/game-template.html` is `false`, so the egg is
rolled in the game.

Each player gets one egg, rolled on the server, so it cannot be changed from the phone and survives
a reinstall once the account is linked.

- `server/setup.sql`: tables, read-only rules, and `claim_egg()` / `mark_hatched()`. Paste it into
  Supabase > SQL Editor and run it (safe to run again).
- Supabase > Authentication > Sign In / Providers: **Allow anonymous sign-ins** must be on. The game
  makes a quiet account on first launch; linking it to Google comes next.
- Odds: table `rarity_weights`; which creature is which rarity: table `creatures`.
