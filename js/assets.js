/**
 * Asset registry & loader for boards and darts
 * Optimized WebP assets (high quality, small size)
 */

export const BOARDS = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional tournament dartboard',
    image: 'assets/boards/dartboard_classic_v1_cutout.webp',
    theme: 'tournament',
    calibration: { outer: 0.95, doubleOuter: 0.95, doubleInner: 0.90, tripleOuter: 0.62, tripleInner: 0.57, outerBull: 0.12, bull: 0.05 }
  },
  {
    id: 'woodpro',
    name: 'Wood Pro',
    description: 'Dark wood with professional metal ring',
    image: 'assets/boards/dartboard_woodpro_v1_cutout.webp',
    theme: 'pub',
    calibration: { outer: 0.95, doubleOuter: 0.95, doubleInner: 0.90, tripleOuter: 0.62, tripleInner: 0.57, outerBull: 0.12, bull: 0.05 }
  },
  {
    id: 'neon',
    name: 'Neon Arcade',
    description: 'Blue/pink neon arcade style',
    image: 'assets/boards/dartboard_neon_v1_cutout.webp',
    theme: 'arcade',
    calibration: { outer: 0.92, doubleOuter: 0.92, doubleInner: 0.87, tripleOuter: 0.60, tripleInner: 0.55, outerBull: 0.12, bull: 0.05 }
  },
  {
    id: 'steel',
    name: 'Steel Tournament',
    description: 'Titanium / steel professional board',
    image: 'assets/boards/dartboard_steel_v1_cutout.webp',
    theme: 'tournament',
    calibration: { outer: 0.95, doubleOuter: 0.95, doubleInner: 0.90, tripleOuter: 0.62, tripleInner: 0.57, outerBull: 0.12, bull: 0.05 }
  },
  {
    id: 'fantasy',
    name: 'Fantasy Crystal',
    description: 'Golden crystal legendary board',
    image: 'assets/boards/dartboard_fantasy_v1_cutout.webp',
    theme: 'legendary',
    calibration: { outer: 0.95, doubleOuter: 0.95, doubleInner: 0.90, tripleOuter: 0.62, tripleInner: 0.57, outerBull: 0.12, bull: 0.05 }
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    description: 'Fun cartoon style board',
    image: 'assets/boards/dartboard_cartoon_v1_cutout.webp',
    theme: 'fun',
    calibration: { outer: 0.95, doubleOuter: 0.95, doubleInner: 0.90, tripleOuter: 0.62, tripleInner: 0.57, outerBull: 0.12, bull: 0.05 }
  }
];

export const DARTS = [
  { id: 'beginner_red', name: 'Crimson Starter', tier: 1, levelRequired: 1, image: 'assets/darts/beginner_red.webp', accuracyMod: 0, deviationMod: 1.0, unlocked: true },
  { id: 'beginner_blue', name: 'Azure Starter', tier: 1, levelRequired: 1, image: 'assets/darts/beginner_blue.webp', accuracyMod: 0, deviationMod: 1.0, unlocked: true },
  { id: 'beginner_yellow', name: 'Solar Starter', tier: 1, levelRequired: 2, image: 'assets/darts/beginner_yellow.webp', accuracyMod: 0.02, deviationMod: 0.98, unlocked: false },
  { id: 'inter_green', name: 'Emerald Alloy', tier: 2, levelRequired: 4, image: 'assets/darts/inter_green.webp', accuracyMod: 0.05, deviationMod: 0.90, unlocked: false },
  { id: 'inter_purple', name: 'Amethyst Alloy', tier: 2, levelRequired: 5, image: 'assets/darts/inter_purple.webp', accuracyMod: 0.06, deviationMod: 0.88, unlocked: false },
  { id: 'inter_orange', name: 'Copper Alloy', tier: 2, levelRequired: 6, image: 'assets/darts/inter_orange.webp', accuracyMod: 0.07, deviationMod: 0.86, unlocked: false },
  { id: 'adv_hologold1', name: 'Holo Tungsten I', tier: 3, levelRequired: 7, image: 'assets/darts/adv_hologold1.webp', accuracyMod: 0.10, deviationMod: 0.78, unlocked: false },
  { id: 'adv_hologold2', name: 'Holo Tungsten II', tier: 3, levelRequired: 8, image: 'assets/darts/adv_hologold2.webp', accuracyMod: 0.11, deviationMod: 0.76, unlocked: false },
  { id: 'adv_hologold3', name: 'Holo Tungsten III', tier: 3, levelRequired: 9, image: 'assets/darts/adv_hologold3.webp', accuracyMod: 0.12, deviationMod: 0.74, unlocked: false },
  { id: 'adv_hologold4', name: 'Holo Tungsten IV', tier: 3, levelRequired: 10, image: 'assets/darts/adv_hologold4.webp', accuracyMod: 0.13, deviationMod: 0.72, unlocked: false },
  { id: 'leg_dragon', name: 'Dragon Scale', tier: 4, levelRequired: 11, image: 'assets/darts/leg_dragon.webp', accuracyMod: 0.16, deviationMod: 0.65, unlocked: false },
  { id: 'leg_fire', name: 'Inferno', tier: 4, levelRequired: 12, image: 'assets/darts/leg_fire.webp', accuracyMod: 0.17, deviationMod: 0.63, unlocked: false },
  { id: 'leg_ice', name: 'Frostbite', tier: 4, levelRequired: 13, image: 'assets/darts/leg_ice.webp', accuracyMod: 0.18, deviationMod: 0.61, unlocked: false },
  { id: 'leg_galaxy', name: 'Galaxy Edge', tier: 4, levelRequired: 14, image: 'assets/darts/leg_galaxy.webp', accuracyMod: 0.19, deviationMod: 0.59, unlocked: false },
  { id: 'leg_cyber', name: 'Cyber Neon', tier: 4, levelRequired: 15, image: 'assets/darts/leg_cyber.webp', accuracyMod: 0.20, deviationMod: 0.57, unlocked: false }
];

const imageCache = new Map();

export function loadImage(src, timeoutMs = 8000) {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));
  return new Promise((resolve, reject) => {
    const img = new Image();
    let done = false;
    const finish = (ok, err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (ok) {
        imageCache.set(src, img);
        resolve(img);
      } else {
        reject(err || new Error('Failed to load ' + src));
      }
    };
    const timer = setTimeout(() => finish(false, new Error('Timeout loading ' + src)), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false, new Error('Error loading ' + src));
    img.src = src;
  });
}

/** Load essential assets first (default board + starter darts), then the rest in background */
export async function preloadEssential(onProgress) {
  const essential = [
    BOARDS[0].image, // classic
    DARTS[0].image,
    DARTS[1].image
  ];
  let loaded = 0;
  for (const src of essential) {
    try {
      await loadImage(src);
    } catch (e) {
      console.warn(e.message);
    }
    loaded++;
    if (onProgress) onProgress(loaded / essential.length);
  }
}

/** Background preload of remaining assets (non-blocking) */
export function preloadRest() {
  const all = [...BOARDS.map(b => b.image), ...DARTS.map(d => d.image)];
  for (const src of all) {
    if (!imageCache.has(src)) {
      loadImage(src).catch(() => {});
    }
  }
}

/** Full preload (optional) */
export async function preloadAll(onProgress) {
  const all = [...BOARDS.map(b => b.image), ...DARTS.map(d => d.image)];
  let loaded = 0;
  for (const src of all) {
    try {
      await loadImage(src);
    } catch (e) {
      console.warn(e.message);
    }
    loaded++;
    if (onProgress) onProgress(loaded / all.length);
  }
}

export function getBoard(id) {
  return BOARDS.find(b => b.id === id) || BOARDS[0];
}

export function getDart(id) {
  return DARTS.find(d => d.id === id) || DARTS[0];
}
