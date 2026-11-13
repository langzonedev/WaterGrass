# WaterGrass

An untimed first-person lawn watering game for [Lang Systems Arcade](https://arcade.langsystems.com.au/). The human-testing build is served from the root of `main` using GitHub Pages.

## Play

Pick up the hose to start the balanced shower. Drag anywhere in the garden to pivot the hose. Sweep left and right, drag up for the far grass, and drag down for the grass near you. The hose keeps its angle when you lift your finger. Use the hose button to toggle flow. With the garden focused, the arrow keys pivot the hose and Space toggles flow. Sound is optional.

Wet grass darkens. Keep the spray on one patch to create a puddle and move away to watch it soak in. Aim at the birdbath's bowl to fill it and see it overflow. A neighbourhood cat occasionally crosses the grass.

## Run locally

Serve the repository root with a static HTTP server such as `python3 -m http.server 8000` and open `http://localhost:8000`. The game uses Canvas 2D, pointer events, and optional Web Audio. It has no dependencies, accounts, telemetry, or server-side state. The lawn resets on reload.

The interaction and public asset handling follow the [Lang Systems Core Development](https://github.com/langzonedev/LangSystems-Core-Development) UX and branding baselines. The backdrop is original generated garden artwork prepared for this game. The company outline mark is sourced from the live Lang Systems Arcade. The hose, hand, birdbath, cat and effects are drawn in code.

## Human testing

[Play WaterGrass on GitHub Pages](https://langzonedev.github.io/WaterGrass/). On a phone, drag the spray across the lawn, then keep it on one patch until a puddle forms. Move to the bowl and see whether the old puddle recedes while the birdbath fills.

All sound effects, including the cat call, are synthesised by the game with Web Audio.
