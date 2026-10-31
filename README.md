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
