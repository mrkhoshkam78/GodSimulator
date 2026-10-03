/**
 * AI opponent with difficulty-based targeting and checkout awareness
 */

import { getCheckoutSuggestion } from './checkout.js';
import { detectHit } from './hitDetection.js';

const DIFF = {
  rookie:  { accuracy: 0.35, spread: 0.28, checkoutSkill: 0.2 },
  amateur: { accuracy: 0.55, spread: 0.18, checkoutSkill: 0.45 },
  pro:     { accuracy: 0.72, spread: 0.11, checkoutSkill: 0.7 },
  master:  { accuracy: 0.85, spread: 0.07, checkoutSkill: 0.88 },
  legend:  { accuracy: 0.93, spread: 0.04, checkoutSkill: 0.96 }
};

// Preferred scoring targets (normalized polar aim points)
const TARGETS = {
  T20: { r: 0.595, a: 0 },
  T19: { r: 0.595, a: Math.PI * 11 / 10 },
  T18: { r: 0.595, a: Math.PI * 2 / 10 },
  S20: { r: 0.40, a: 0 },
  D20: { r: 0.925, a: 0 },
  D16: { r: 0.925, a: Math.PI * 7 / 10 },
  D10: { r: 0.925, a: Math.PI * 5 / 10 },
  D8:  { r: 0.925, a: Math.PI * 8 / 10 },
  Bull: { r: 0, a: 0 },
  '25': { r: 0.08, a: 0 }
};

function parseTarget(label) {
  if (TARGETS[label]) return TARGETS[label];
  // Fallback generic
  if (label.startsWith('T')) return { r: 0.595, a: 0 };
  if (label.startsWith('D')) return { r: 0.925, a: 0 };
  return { r: 0.40, a: 0 };
}

function chooseTarget(remaining, dartsLeft, outRule, skill) {
  // Checkout mode
  if (remaining <= 170 && Math.random() < skill.checkoutSkill) {
    const path = getCheckoutSuggestion(remaining, outRule);
    if (path && path.length) {
      const next = path[0];
      return parseTarget(next);
    }
  }
  // Avoid bust: if remaining low, aim safe
  if (remaining <= 60 && outRule === 'double') {
    if (remaining === 50) return TARGETS.Bull;
    if (remaining % 2 === 0 && remaining <= 40) {
      return parseTarget('D' + (remaining / 2));
    }
    // leave a double
    const leave = remaining - 20;
    if (leave > 0 && leave % 2 === 0) return TARGETS.S20;
  }
  // High score default
  return Math.random() < 0.7 ? TARGETS.T20 : TARGETS.T19;
}

export function aiThrow(remaining, dartsLeft, outRule, difficulty, boardCal) {
  const skill = DIFF[difficulty] || DIFF.amateur;
  const target = chooseTarget(remaining, dartsLeft, outRule, skill);

  // Gaussian-ish deviation
  const spread = skill.spread * (1.2 - skill.accuracy);
  const dr = (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.2;
  const da = (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.5;

  const r = Math.max(0, target.r + dr);
  const a = target.a + da;
  const nx = r * Math.sin(a);
  const ny = -r * Math.cos(a);

  const hit = detectHit(nx, ny, boardCal);
  return { nx, ny, hit, target };
}

export async function aiTurn(game, difficulty) {
  const results = [];
  for (let i = 0; i < 3; i++) {
    if (game.finished) break;
    await delay(600 + Math.random() * 400);
    const rem = game.currentPlayer().score;
    const { nx, ny, hit } = aiThrow(rem, 3 - i, game.rules.outRule, difficulty, game.boardCal);
    results.push(await game.applyDart(nx, ny, hit, true));
    if (results[results.length - 1].endTurn) break;
  }
  return results;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
