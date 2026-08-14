# Promo video pipeline

Renders a 68-second promo video where **every frame is the real application UI**. Nothing is AI-generated or mocked up in a design tool — the app is run locally, captured with Playwright, and assembled with ffmpeg.

## Why the fixtures exist

The app's data layer is base44, which needs `base44/.app.jsonc` (gitignored) and network access. Without it, pages render empty shells. Rather than modify application source, `fixtures.mjs` provides demo records that are served by **Playwright request interception** — the browser answers the app's own API calls with demo JSON.

The app source is never touched. What you see rendered is the real component tree, the real styling, and the real interaction states.

`fixtures.mjs` contains synthetic demo content only — no real users, tenants, or customers.

## Requirements

```bash
npm install
BASE44_LEGACY_SDK_IMPORTS=true npm run dev   # must be running on :5173
```

`BASE44_LEGACY_SDK_IMPORTS=true` is required — the codebase imports `@/entities/*`, which the base44 Vite plugin only resolves in legacy mode.

The scripts need `playwright` and `ffmpeg-static` resolvable from the working directory.

## Running

```bash
node shots.mjs      # capture 10 frames -> frames/
node captions.mjs   # render caption overlays -> caps_png/
node build.mjs      # assemble -> hack-the-soc-promo.mp4
```

## Files

| File | Role |
|------|------|
| `fixtures.mjs` | Demo entity data, incl. the phishing → PowerShell → C2 → persistence chain for scenario `scn-001` |
| `shots.mjs` | Drives the app and captures the 10 source frames at set scroll positions and tab states |
| `caps.mjs` | Shot list: frame, duration, and narration line — the single source of truth for timing |
| `captions.mjs` | Renders caption overlays as transparent PNGs (HTML/CSS, so typography is controllable) |
| `build.mjs` | Ken Burns drift, caption compositing, fades, concat, encode |

## Editing the video

Change a line or a duration in `caps.mjs`, then re-run `captions.mjs` and `build.mjs`. Frames only need recapturing if the UI itself changed.

## Known limitation: no voiceover

The video ships with **burned-in captions and a silent audio track**. The caption text is the English VO script verbatim (see `../SCRIPT.md`), so narration can be recorded or synthesised and laid straight over the existing cut without retiming.

`drawtext` is not compiled into the `ffmpeg-static` build, which is why captions are composited as PNG overlays rather than drawn by ffmpeg. That turned out to be the better approach anyway — it allows real CSS typography and the product's teal accent.
