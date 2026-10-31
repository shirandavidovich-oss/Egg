# Egg Game — Hatching Party Assets for Claude

Created as a working art/audio prototype for the mobile game.

## Folders
- `characters/black_white/`: 20 isolated **transparent PNGs** (512x512). Initially show these.
- `characters/color/`: same 20 creatures in colored form, same size/placement. To make color appear over time, crossfade between same-id black-and-white and color PNG.
- `balloons/png/`: 8 isolated balloons with alpha channel plus confetti graphic; spawn many copies with random speed, scale, horizontal drift.
- `hatching/frames/`: 11 sequential cracking stages, all same 512x512 registration.
- `audio/wav/`, `audio/mp3/`: short original synthesized game sounds plus voice-like locally synthesized 'Ooooh nooo'.
- `preview/hatching_balloon_reveal_demo.mp4`: a **9 second portrait demo** including audio, timing and balloon celebration. It is a visual prototype, not final engine animation.
- `manifest.json`: relative paths/asset IDs.

## Recommended sequence
1. 0–0.8s: egg wobbles; magical anticipation; optional cartoon 'Oh no'.
2. 0.8–2.5s: cracks `crack_00.png` through `crack_10.png`, synced to cracking sound effects.
3. 2.5–3.2s: shell explosion/white sparkle; whoosh.
4. 3–6.5s: spawn 35–50 colorful balloons from below screen, continuing upward. Increase confetti at the peak.
5. 6.5–9s: fade in one of the 20 characters in **black-and-white**; initially keep it monochrome, then reveal its color after a delay or a gameplay milestone. The demo reveals color immediately just to demonstrate the colorful outcome.
6. Continue the cheerful 12-second music loop if desired.

## Implementation
- Preserve aspect ratio on portrait devices; anchor the nest at lower center.
- Loop or randomly reuse balloon sprites; the background is off-white/graphite with bright balloon colors.
- Use image crossfade (opacity 0..1) between matching character PNGs for the colorization.
- Use distinct non-repeating character selection.
- Stop/reset the animation cleanly on scene change.
- File names are engine-safe ASCII; all relative paths in manifest.

## Honest asset limitations
- The character art is **isolated from one previously generated concept sheet**; the 18 first sprites are small-source illustrations enlarged to 512px. Thus they are good game prototypes, but not detailed production master art. The last 2 sprites were adapted from previously drawn standalone graphite creature illustrations with subtle color accents.
- These are art assets for implementation, **not a compiled Android APK**.
- The 'Oh no' uses a locally synthesized voice and may sound robotic; replace with a voice actor if desired.
- The cracking frames use a procedurally drawn egg. Match its style with the master egg art before final release.
