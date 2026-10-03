/**
 * Dart Arena — Main entry & UI orchestration
 */

import { preloadEssential, preloadRest, BOARDS, DARTS, getBoard, getDart } from './assets.js';
import { loadProfile, saveProfile, xpForLevel, getTitleName } from './player.js';
import { GameEngine } from './gameEngine.js';
import { BoardRenderer } from './render.js';
import { detectHit } from './hitDetection.js';
import { aiTurn } from './ai.js';
import { getCheckoutSuggestion, formatSuggestion } from './checkout.js';

let profile = loadProfile();
let renderer = null;
let game = null;
let selectedMode = '501';
let throwing = false;
let power = 0;
let charging = false;
let chargeStart = 0;
let animFrame = null;

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function updateMenuChip() {
  $('#menu-level').textContent = profile.level;
  $('#menu-name').textContent = profile.nickname;
  $('#menu-title').textContent = profile.title;
}

// ---------- Init ----------
async function init() {
  const status = $('#load-status');
  try {
    status.textContent = 'Loading essentials...';
    await preloadEssential(p => {
      status.textContent = `Loading... ${Math.round(p * 100)}%`;
    });
  } catch (e) {
    console.warn('Asset load issue:', e);
  }
  status.textContent = 'Ready';
  updateMenuChip();
  bindUI();
  showScreen('main-menu');
  // Remaining boards/darts load in background — does not block menu
  preloadRest();
}

function bindUI() {
  // Menu buttons
  $$('.menu-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'play' || a === 'modes') showScreen('mode-select');
      else if (a === 'collection') { renderCollection(); showScreen('collection'); }
      else if (a === 'profile') { renderProfile(); showScreen('profile'); }
      else if (a === 'stats') { renderStats(); showScreen('stats'); }
      else if (a === 'settings') { renderSettings(); showScreen('settings'); }
    });
  });

  $$('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.back));
  });

  // Mode cards
  $$('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      $$('.mode-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMode = card.dataset.mode;
    });
  });
  $$('.mode-card[data-mode="501"]')[0]?.classList.add('selected');

  $('#start-match-btn').addEventListener('click', startMatch);

  // Collection tabs
  $$('.tab').forEach(t => {
    t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      $$('.tab-content').forEach(c => c.classList.remove('active'));
      $(`#${t.dataset.tab}-tab`).classList.add('active');
    });
  });

  $('#nickname-input')?.addEventListener('change', e => {
    profile.nickname = e.target.value.slice(0, 16) || 'Player';
    saveProfile(profile);
    updateMenuChip();
  });

  $('#quit-btn')?.addEventListener('click', () => {
    if (confirm('Quit match?')) {
      game = null;
      showScreen('main-menu');
    }
  });

  // Settings
  ['vol-master', 'vol-sfx', 'vol-music'].forEach(id => {
    $(`#${id}`)?.addEventListener('input', e => {
      const key = id.replace('vol-', '');
      profile.settings[key] = +e.target.value;
      saveProfile(profile);
    });
  });
  $('#mute-all')?.addEventListener('change', e => {
    profile.settings.mute = e.target.checked;
    saveProfile(profile);
  });
}

// ---------- Collection ----------
function renderCollection() {
  const dGrid = $('#darts-grid');
  dGrid.innerHTML = '';
  for (const d of DARTS) {
    const unlocked = profile.unlockedDarts.includes(d.id) || d.levelRequired <= profile.level;
    if (unlocked && !profile.unlockedDarts.includes(d.id)) profile.unlockedDarts.push(d.id);
    const card = document.createElement('div');
    card.className = 'collect-card' + (profile.equippedDart === d.id ? ' equipped' : '') + (!unlocked ? ' locked' : '');
    card.innerHTML = `
      <img src="${d.image}" alt="${d.name}" />
      <div class="c-name">${d.name}</div>
      <div class="c-tier">Tier ${d.tier} · Lvl ${d.levelRequired}</div>
      ${!unlocked ? '<span class="lock-badge">LOCKED</span>' : ''}
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        profile.equippedDart = d.id;
        saveProfile(profile);
        renderCollection();
      });
    }
    dGrid.appendChild(card);
  }

  const bGrid = $('#boards-grid');
  bGrid.innerHTML = '';
  for (const b of BOARDS) {
    const unlocked = profile.unlockedBoards.includes(b.id);
    const card = document.createElement('div');
    card.className = 'collect-card' + (profile.equippedBoard === b.id ? ' equipped' : '') + (!unlocked ? ' locked' : '');
    card.innerHTML = `
      <img src="${b.image}" alt="${b.name}" style="max-height:100px" />
      <div class="c-name">${b.name}</div>
      <div class="c-tier">${b.description}</div>
      ${!unlocked ? '<span class="lock-badge">LOCKED</span>' : ''}
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        profile.equippedBoard = b.id;
        saveProfile(profile);
        renderCollection();
      });
    }
    bGrid.appendChild(card);
  }
  saveProfile(profile);
}

// ---------- Profile & Stats ----------
function renderProfile() {
  $('#nickname-input').value = profile.nickname;
  $('#prof-level').textContent = profile.level;
  const need = xpForLevel(profile.level);
  const pct = Math.min(100, (profile.xp / need) * 100);
  $('#prof-xp-fill').style.width = pct + '%';
  $('#prof-xp-text').textContent = `${profile.xp} / ${need}`;
  $('#prof-title').textContent = profile.title;
  $('#prof-dart').textContent = getDart(profile.equippedDart).name;
  $('#prof-board').textContent = getBoard(profile.equippedBoard).name;

  const st = profile.stats;
  const wr = st.gamesPlayed ? ((st.wins / st.gamesPlayed) * 100).toFixed(0) + '%' : '—';
  $('#prof-stats').innerHTML = `
    <div>Wins <span>${st.wins}</span></div>
    <div>Losses <span>${st.losses}</span></div>
    <div>Win Rate <span>${wr}</span></div>
    <div>Games <span>${st.gamesPlayed}</span></div>
    <div>Highest <span>${st.highestScore}</span></div>
    <div>Best CO <span>${st.bestCheckout}</span></div>
    <div>180s <span>${st.count180}</span></div>
    <div>140+ <span>${st.count140}</span></div>
    <div>Bulls <span>${st.bulls}</span></div>
    <div>Doubles <span>${st.doubles}</span></div>
    <div>Triples <span>${st.triples}</span></div>
    <div>Checkouts <span>${st.checkouts}</span></div>
  `;
}

function renderStats() {
  const st = profile.stats;
  const rows = [
    ['Games Played', st.gamesPlayed],
    ['Wins', st.wins],
    ['Losses', st.losses],
    ['Win Rate', st.gamesPlayed ? ((st.wins / st.gamesPlayed) * 100).toFixed(1) + '%' : '—'],
    ['Highest Turn', st.highestScore],
    ['Best Checkout', st.bestCheckout],
    ['180s', st.count180],
    ['140+', st.count140],
    ['100+', st.count100],
    ['Bullseyes', st.bulls],
    ['Doubles', st.doubles],
    ['Triples', st.triples],
    ['Checkouts', st.checkouts],
    ['Busts', st.busts],
    ['Total Darts', st.totalDarts]
  ];
  $('#stats-list').innerHTML = rows.map(([k, v]) =>
    `<div class="stat-row"><span>${k}</span><strong>${v}</strong></div>`
  ).join('');
}

function renderSettings() {
  $('#vol-master').value = profile.settings.master;
  $('#vol-sfx').value = profile.settings.sfx;
  $('#vol-music').value = profile.settings.music;
  $('#mute-all').checked = profile.settings.mute;
}

// ---------- Match start ----------
async function startMatch() {
  const bestOf = +$('#best-of').value;
  const inRule = $('#in-rule').value;
  const outRule = $('#out-rule').value;
  const aiDiff = $('#ai-diff').value;

  showScreen('gameplay');
  const canvas = $('#game-canvas');
  renderer = new BoardRenderer(canvas);
  await renderer.setBoard(profile.equippedBoard);
  await renderer.setDart(profile.equippedDart);
  renderer.resize();
  window.addEventListener('resize', () => renderer?.resize());

  const board = getBoard(profile.equippedBoard);
  game = new GameEngine({
    mode: selectedMode,
    bestOf,
    inRule,
    outRule,
    aiDiff,
    boardCal: board.calibration,
    profile,
    onUpdate: updateHUD,
    onEvent: handleEvent
  });

  renderer.clearDarts();
  renderer.draw();
  updateHUD();
  bindThrowInput();
  loop();
}

function loop() {
  if (!renderer) return;
  renderer.draw();
  animFrame = requestAnimationFrame(loop);
}

function updateHUD() {
  if (!game) return;
  $('#p1-name').textContent = game.p1.name;
  $('#p1-score').textContent = game.mode === 'practice' ? '—' : game.p1.score;
  $('#p1-legs').textContent = `Legs ${game.p1.legs}`;
  $('#p2-name').textContent = game.p2.name;
  $('#p2-score').textContent = game.mode === 'practice' ? '—' : game.p2.score;
  $('#p2-legs').textContent = `Legs ${game.p2.legs}`;
  $('#match-info').textContent = `Leg ${game.leg} · Best of ${game.rules.bestOf}`;
  const turnName = game.current === 0 ? 'Your Turn' : 'AI Turn';
  $('#turn-info').textContent = `${turnName} · Dart ${game.dartInTurn + 1}/3`;
  $('#checkout-hint').textContent = game.current === 0 ? game.getCheckoutHint() : '';
  $('#avg-score').textContent = game.avg(game.p1);

  // Slots
  $$('.slot').forEach((s, i) => {
    s.classList.toggle('hit', i < game.turnHits.length);
    s.textContent = game.turnHits[i] ? game.turnHits[i].label : '';
  });
  $('#last-score').textContent = game.turnScore || '—';
}

function handleEvent(ev) {
  if (ev.type === 'hit') {
    floatScore(ev.hit);
  }
  if (ev.type === 'bust') {
    showOverlay('BUST!', 1200);
    floatScore({ type: 'bust', label: 'BUST', score: 0 });
  }
  if (ev.type === 'checkout') {
    showOverlay(`CHECKOUT ${ev.score}!`, 1500);
  }
  if (ev.type === 'legWin') {
    showOverlay(ev.winner === 0 ? 'LEG WON!' : 'AI WINS LEG', 1600);
    renderer.clearDarts();
  }
  if (ev.type === 'matchWin') {
    const msg = ev.winner === 0 ? 'MATCH WON!' : 'MATCH LOST';
    showOverlay(msg, 2500);
    setTimeout(() => {
      updateMenuChip();
      showScreen('main-menu');
    }, 2600);
  }
  if (ev.type === 'turnEnd' && ev.next === 1 && !game.finished) {
    // AI turn
    setTimeout(() => runAITurn(), 400);
  }
}

function floatScore(hit) {
  const el = document.createElement('div');
  el.className = 'float-score ' + (hit.type || 'single');
  el.textContent = hit.label || hit.score;
  const container = $('#floating-scores');
  const rect = $('#board-container').getBoundingClientRect();
  el.style.left = (rect.width / 2 - 20) + 'px';
  el.style.top = (rect.height / 2 - 40) + 'px';
  container.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function showOverlay(text, ms) {
  const o = $('#overlay-msg');
  o.textContent = text;
  o.classList.add('show');
  setTimeout(() => o.classList.remove('show'), ms);
}

async function runAITurn() {
  if (!game || game.finished || game.current !== 1) return;
  throwing = true;
  $('#aim-hint').textContent = 'AI is throwing...';
  await aiTurn(game, game.aiDiff);
  throwing = false;
  if (game && !game.finished && game.current === 0) {
    $('#aim-hint').textContent = 'Aim · Hold to charge · Release to throw';
  }
}

// ---------- Throw input ----------
function bindThrowInput() {
  const canvas = $('#game-canvas');
  const meter = $('#power-meter');
  const fill = $('#power-fill');

  const getPos = e => {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const onStart = e => {
    if (throwing || !game || game.finished || game.current !== 0) return;
    e.preventDefault();
    charging = true;
    chargeStart = performance.now();
    power = 0;
    meter.classList.add('visible');
    const pos = getPos(e);
    const n = renderer.toNorm(pos.x, pos.y);
    renderer.aim = { nx: n.nx, ny: n.ny, active: true };
  };

  const onMove = e => {
    if (!charging && !renderer.aim.active) return;
    e.preventDefault();
    const pos = getPos(e);
    const n = renderer.toNorm(pos.x, pos.y);
    // Clamp to reasonable aim area
    const r = Math.sqrt(n.nx * n.nx + n.ny * n.ny);
    if (r > 1.15) {
      n.nx /= r / 1.15;
      n.ny /= r / 1.15;
    }
    renderer.aim.nx = n.nx;
    renderer.aim.ny = n.ny;
    renderer.aim.active = true;
  };

  const onEnd = async e => {
    if (!charging || !game || game.current !== 0) return;
    e.preventDefault();
    charging = false;
    meter.classList.remove('visible');
    renderer.aim.active = false;

    // Power 0-1 from hold time (cap ~1.2s)
    const held = Math.min(1.2, (performance.now() - chargeStart) / 1000);
    power = Math.min(1, held / 0.85);

    await doPlayerThrow(renderer.aim.nx, renderer.aim.ny, power);
  };

  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);

  // Power charge visual
  function chargeLoop() {
    if (charging) {
      const held = Math.min(1.2, (performance.now() - chargeStart) / 1000);
      power = Math.min(1, held / 0.85);
      fill.style.width = (power * 100) + '%';
    }
    requestAnimationFrame(chargeLoop);
  }
  chargeLoop();
}

async function doPlayerThrow(aimNx, aimNy, power) {
  if (throwing || !game) return;
  throwing = true;

  const dart = getDart(profile.equippedDart);
  // Deviation based on power (best around 0.7-0.9), skill, dart tier
  const ideal = 0.8;
  const powerErr = Math.abs(power - ideal) * 0.35;
  const baseSpread = 0.14 * dart.deviationMod * (1 - dart.accuracyMod);
  const skill = Math.min(0.9, 0.3 + profile.level * 0.04);
  const spread = baseSpread * (1.1 - skill) + powerErr;

  const dr = (Math.random() + Math.random() - 1) * spread;
  const da = (Math.random() + Math.random() - 1) * spread * 1.2;
  const r0 = Math.sqrt(aimNx * aimNx + aimNy * aimNy);
  const a0 = Math.atan2(aimNx, -aimNy);
  const r = Math.max(0, r0 + dr);
  const a = a0 + da;
  const nx = r * Math.sin(a);
  const ny = -r * Math.cos(a);

  const hit = detectHit(nx, ny, game.boardCal);

  // Flight from bottom of board area
  await renderer.animateFlight(0, 1.3, nx, ny, 320 + Math.random() * 80);

  const result = game.applyDart(nx, ny, hit, false);
  throwing = false;

  if (result.endTurn && game.current === 1 && !game.finished) {
    // will be handled by turnEnd event
  }
}

// Boot
init();
