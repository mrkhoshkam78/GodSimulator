/**
 * Player profile, XP, titles, stats, persistence
 */

import { DARTS, BOARDS } from './assets.js';

const STORAGE_KEY = 'dartArena_v1';

const TITLES = [
  { id: 'rookie', name: 'Rookie', req: () => true },
  { id: 'sharp', name: 'Sharp Shooter', req: s => s.doubles >= 10 },
  { id: 'bullhunter', name: 'Bull Hunter', req: s => s.bulls >= 5 },
  { id: 'checkout', name: 'Checkout Specialist', req: s => s.checkouts >= 5 },
  { id: 'triple', name: 'Triple Master', req: s => s.triples >= 20 },
  { id: '180', name: '180 Machine', req: s => s.count180 >= 3 },
  { id: 'destroyer', name: 'Board Destroyer', req: s => s.wins >= 10 },
  { id: 'master', name: 'Dart Master', req: s => s.level >= 10 },
  { id: 'king', name: 'Tournament King', req: s => s.wins >= 25 && s.level >= 12 },
  { id: 'legendary', name: 'Legendary Thrower', req: s => s.level >= 15 }
];

function defaultProfile() {
  return {
    nickname: 'Player',
    level: 1,
    xp: 0,
    equippedDart: 'beginner_red',
    equippedBoard: 'classic',
    title: 'Rookie',
    unlockedTitles: ['rookie'],
    unlockedDarts: ['beginner_red', 'beginner_blue'],
    unlockedBoards: ['classic'],
    stats: {
      wins: 0, losses: 0, gamesPlayed: 0,
      highestScore: 0, bestCheckout: 0,
      count180: 0, count140: 0, count100: 0,
      bulls: 0, doubles: 0, triples: 0,
      checkouts: 0, busts: 0,
      totalScore: 0, totalDarts: 0
    },
    settings: { master: 80, sfx: 90, music: 40, mute: false }
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      // Merge defaults for new fields
      const def = defaultProfile();
      return { ...def, ...p, stats: { ...def.stats, ...p.stats }, settings: { ...def.settings, ...p.settings } };
    }
  } catch (e) {}
  return defaultProfile();
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.35, level - 1));
}

export function addXP(profile, amount) {
  profile.xp += amount;
  let leveled = false;
  while (profile.xp >= xpForLevel(profile.level) && profile.level < 15) {
    profile.xp -= xpForLevel(profile.level);
    profile.level++;
    leveled = true;
    // Unlock darts/boards
    for (const d of DARTS) {
      if (d.levelRequired <= profile.level && !profile.unlockedDarts.includes(d.id)) {
        profile.unlockedDarts.push(d.id);
      }
    }
    if (profile.level >= 3 && !profile.unlockedBoards.includes('woodpro')) profile.unlockedBoards.push('woodpro');
    if (profile.level >= 5 && !profile.unlockedBoards.includes('neon')) profile.unlockedBoards.push('neon');
    if (profile.level >= 7 && !profile.unlockedBoards.includes('steel')) profile.unlockedBoards.push('steel');
    if (profile.level >= 10 && !profile.unlockedBoards.includes('fantasy')) profile.unlockedBoards.push('fantasy');
    if (profile.level >= 4 && !profile.unlockedBoards.includes('cartoon')) profile.unlockedBoards.push('cartoon');
  }
  checkTitles(profile);
  return leveled;
}

function checkTitles(profile) {
  const s = { ...profile.stats, level: profile.level };
  for (const t of TITLES) {
    if (!profile.unlockedTitles.includes(t.id) && t.req(s)) {
      profile.unlockedTitles.push(t.id);
      profile.title = t.name;
    }
  }
}

export function getTitleName(id) {
  const t = TITLES.find(x => x.id === id);
  return t ? t.name : 'Rookie';
}

export function updateStatsFromTurn(profile, turnScore, hits, busted, checkedOut) {
  const st = profile.stats;
  if (busted) st.busts++;
  if (checkedOut) {
    st.checkouts++;
    if (turnScore > st.bestCheckout) st.bestCheckout = turnScore;
  }
  if (turnScore >= 180) st.count180++;
  else if (turnScore >= 140) st.count140++;
  else if (turnScore >= 100) st.count100++;
  if (turnScore > st.highestScore) st.highestScore = turnScore;

  for (const h of hits) {
    st.totalDarts++;
    st.totalScore += h.score;
    if (h.type === 'bull' || h.type === 'outerBull') st.bulls++;
    if (h.type === 'double' || h.type === 'bull') st.doubles++;
    if (h.type === 'triple') st.triples++;
  }
}

export function recordMatchResult(profile, won) {
  profile.stats.gamesPlayed++;
  if (won) profile.stats.wins++;
  else profile.stats.losses++;
  checkTitles(profile);
}
