# Workforce Showdown — 3D Step 1

## What this milestone adds
- A separate, standalone Three.js 3D combat lab (`Workforce_Showdown_3D_Prototype.html`).
- Procedurally assembled 3D fighter placeholders with selectable employee/boss roster names.
- A first boardroom arena, camera framing, health bars, timer, movement, jump, block, punch, kick, and special move inputs.
- A simple AI training opponent to test the basic combat loop.

## Try it
Open `Workforce_Showdown_3D_Prototype.html` in a modern browser while connected to the internet. The Three.js module is loaded from jsDelivr, so the first prototype needs internet access. If your browser blocks modules on `file://`, serve the folder locally, for example with `npx serve .`, and open the URL it prints.

## Controls
- A/D or Left/Right: move
- W or Up: jump
- J: punch
- K: kick
- Hold L: block
- I: special move
- On-screen buttons also work for touch.

## Scope / next milestones
This is a first playable 3D vertical slice, not a finished realistic game. The fighters are built from simple 3D geometry rather than realistic rigged models. Next: replace placeholders with licensed rigged character models and animations, then improve hit reactions, camera effects, sound, and stage details. The existing 2D game and online server files are retained unchanged; online multiplayer has not yet been connected to this 3D prototype.
