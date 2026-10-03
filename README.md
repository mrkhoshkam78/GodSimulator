# Dart Arena — Professional Browser Darts

## How to Run (IMPORTANT)

**Do not open index.html directly (file://).** ES modules and assets require a local server:

```bash
cd darts_game
npx serve .
# or: python3 -m http.server 8080
```

Then open the URL shown (e.g. http://localhost:3000).

If stuck on "Loading assets", you are almost certainly opening the file without a server.

## Asset optimization

All boards and darts are high-quality WebP:
- Boards: max 1024px side, quality ~88
- Darts: max height 280px, quality ~90
- Total assets ≈ 164 KB (was ~17 MB)

## Features

501 / 301 / 701 / Around the Clock / Practice, AI, progression, checkout hints, local save.
