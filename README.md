# Infinite Alchemy

Combination discovery game. Four primordial reagents, 500 bindings.

Open `index.html` in a browser (assets are local; a static server is optional). Progress autosaves in `localStorage`. Export / Import writes a JSON save.

Data lives in `data/alchemy.json` and `data/alchemy.js`. Add items and recipes there; the client looks up pairs by sorted ids, so new combinations do not require UI changes.
