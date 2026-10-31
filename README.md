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

## Where things are

| What | File |
|---|---|
| The whole game (scene, egg, tilt, physics) | `app/src/main/assets/index.html` |
| Android shell: full screen + tilt sensor | `app/src/main/java/com/shiran/egg/MainActivity.java` |
| App name, orientation | `app/src/main/AndroidManifest.xml` |
| Automatic APK build | `.github/workflows/build-apk.yml` |

Opening `index.html` in a desktop browser shows the scene too: press and hold to tilt.
