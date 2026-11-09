# WaterGrass

An untimed first-person lawn watering game for [Lang Systems Arcade](https://arcade.langsystems.com.au/). The human-testing build is served from the root of `main` using GitHub Pages.

## Play

Pick up the hose to start the balanced shower. Move the mouse or drag a finger on the garden to aim. The hose keeps running when you lift your finger. Use the hose button to turn flow off or on. With the garden focused, the arrow keys aim and Space toggles flow. Sound is optional.

Wet grass darkens. Keep the spray on one patch to create a puddle and move away to watch it soak in. Aim at the birdbath's bowl to fill it and see it overflow. A neighbourhood cat occasionally crosses the grass.

## Run locally

Serve the repository root with a static HTTP server such as `python3 -m http.server 8000` and open `http://localhost:8000`. The game uses Canvas 2D, pointer events, and optional Web Audio. It has no dependencies, accounts, telemetry, or server-side state. The lawn resets on reload.

The interaction and public asset handling follow the [Lang Systems Core Development](https://github.com/langzonedev/LangSystems-Core-Development) UX and branding baselines. The backdrop is original generated garden artwork prepared for this game. The company outline mark is sourced from the live Lang Systems Arcade. The hose, hand, birdbath, cat and effects are drawn in code.
