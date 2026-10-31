# Animated Egg — 10 boredom/idle animations

These are **real original animations**, not standalone mockup storyboards. Each is an initial programmatically illustrated prototype in monochrome charcoal/ink style for your hand-drawn egg game.

## Included
- `preview_all_10.mp4` — a single video presenting all animations in order.
- `gifs/*.gif` — ten individual preview GIFs, shown on white background.
- `atlases/*_atlas.png` — **transparent RGBA** sprite atlases, each 8 columns × 4 rows with 32 frames, each frame 384×384 px. Index left-to-right, top-to-bottom.
- `frames/<name>/<name>_00.png` to `_31.png` — transparent RGBA frames.
- `overview.jpg` — static contact sheet and `manifest.json` — animation metadata.

## Integrate into game
- Play at **12 FPS**. Each sequence lasts 2.67 sec. Play ONCE per idle event, not repeatedly. First and last poses are near-neutral to allow smooth transitions back to base idle.
- After **8 s** inactivity: choose 01 whistle, 02 foot tap, 03 stare. After **20 s**: choose 04 yawn, 05 imaginary watch, 06 drum, 07 fly. After **40 s**: choose 08 ballet, 09 snore, 10 tantrum.
- Do not play the same animation twice consecutively. A touch immediately interrupts and restarts interaction state.
- Keep nest behind egg. The sprites themselves are transparent, all in a consistent fixed canvas; center horizontally above the nest.
- Do not let boredom animations override game-state cracks or the hatching scene. Play these on intact egg until ready to hatch.
- Match the artistic style to the existing black-and-white egg; feel free to replace specific drawings with the user's detailed illustrated egg while preserving timings and metadata.

Sound suggestions: 01 airy whistle, 02 dry wood taps, 03 tiny unimpressed pluck, 04 exaggerated yawn, 05 clock ticks, 06 percussive knocks, 07 buzz/swish/slap, 08 airy whoosh/boing, 09 snoring and bubble pop, 10 comic protest / soft thud.
