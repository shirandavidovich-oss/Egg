# Egg

An egg waits in a nest, deep behind the phone's screen. Tilt the phone and it rolls.
The screen behaves like a window: tilting shifts your view so the burrow feels 3D.

## Install on the phone

Every push to `main` builds a new APK automatically (GitHub Actions, about 3–5 minutes).
Download the newest one, signed in to GitHub on the phone:

**https://github.com/shirandavidovich-oss/Egg/releases/latest/download/Egg.apk**

New builds install over the old one.

## Where things are

| What | File |
|---|---|
| The whole game (scene, egg, tilt, physics) | `app/src/main/assets/index.html` |
| Android shell: full screen + tilt sensor | `app/src/main/java/com/shiran/egg/MainActivity.java` |
| App name, orientation | `app/src/main/AndroidManifest.xml` |
| Automatic APK build | `.github/workflows/build-apk.yml` |

Opening `index.html` in a desktop browser shows the scene too: press and hold to tilt.
