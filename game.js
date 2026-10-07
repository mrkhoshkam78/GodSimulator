(() => {
  const data = window.ALCHEMY_DATA;
  if (!data) {
    document.body.innerHTML = "<p style='padding:24px'>Missing alchemy data.</p>";
    return;
  }

  const items = Object.fromEntries(data.items.map((it) => [it.id, it]));
  const recipeMap = new Map();
  const byResult = new Map();
  data.recipes.forEach((r) => {
    recipeMap.set(r.a + "|" + r.b, r);
    byResult.set(r.result, r);
  });

  const XP = { common: 12, rare: 28, epic: 70, legendary: 150, secret: 280 };
  const SAVE_KEY = "infinite-alchemy-v1";
  const FILTERS = ["all", "favorites", "common", "rare", "epic", "legendary", "secret"];

  const ACHIEVEMENTS = [
    { id: "spark", name: "First Spark", test: (s) => s.discovered.length >= 1 },
    { id: "ten", name: "Ten Bindings", test: (s) => s.discovered.length >= 10 },
    { id: "fifty", name: "Adept", test: (s) => s.discovered.length >= 50 },
    { id: "hundred", name: "Archivist", test: (s) => s.discovered.length >= 100 },
    { id: "quarter", name: "Quarter Forge", test: (s) => s.discovered.length >= 250 },
    { id: "all", name: "Infinite", test: (s) => s.discovered.length >= 500 },
    { id: "rare", name: "Rare Vein", test: (s) => s.discovered.some((id) => items[id].rarity === "rare") },
    { id: "epic", name: "Epic Work", test: (s) => s.discovered.some((id) => items[id].rarity === "epic") },
    { id: "legend", name: "Legend Touched", test: (s) => s.discovered.some((id) => items[id].rarity === "legendary") },
    { id: "secret", name: "Secret Fire", test: (s) => s.discovered.some((id) => items[id].rarity === "secret") },
    { id: "deep", name: "Deep Chain", test: (s) => s.discovered.some((id) => items[id].tier >= 6) },
    { id: "fav", name: "Cabinet", test: (s) => s.favorites.length >= 8 },
    { id: "crit", name: "Critical Hand", test: (s) => s.crits >= 5 },
    { id: "cats", name: "All Aspects", test: (s) => new Set(s.discovered.map((id) => items[id].category)).size >= 8 },
  ];

  const CHALLENGES = [
    { id: "c1", name: "Bind any two reagents", test: (s) => s.discovered.length >= 1 },
    { id: "c2", name: "Discover a crystal", test: (s) => s.discovered.some((id) => items[id].category === "crystal") },
    { id: "c3", name: "Discover a myth", test: (s) => s.discovered.some((id) => items[id].category === "mythic") },
    { id: "c4", name: "Uncover a secret", test: (s) => s.discovered.some((id) => items[id].rarity === "secret") },
    { id: "c5", name: "Reach level 5", test: (s) => levelInfo(s.xp).level >= 5 },
    { id: "c6", name: "Reach level 12", test: (s) => levelInfo(s.xp).level >= 12 },
    { id: "c7", name: "Favorite 5 works", test: (s) => s.favorites.length >= 5 },
    { id: "c8", name: "250 discoveries", test: (s) => s.discovered.length >= 250 },
  ];

  const $ = (id) => document.getElementById(id);
  let state = load();
  let slotA = null;
  let slotB = null;
  let filter = "all";
  let query = "";
  let selected = null;
  let soundOn = state.sound !== false;
  let audioCtx = null;

  function fresh() {
    return {
      discovered: [],
      favorites: [],
      xp: 0,
      crits: 0,
      hints: 3,
      achievements: [],
      sound: true,
      seen: {},
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return fresh();
      const parsed = JSON.parse(raw);
      return { ...fresh(), ...parsed };
    } catch {
      return fresh();
    }
  }

  function save() {
    state.sound = soundOn;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function levelInfo(xp) {
    let level = 1;
    let need = 40;
    let spent = 0;
    while (spent + need <= xp) {
      spent += need;
      level += 1;
      need = Math.floor(need * 1.16 + 18);
    }
    return { level, into: xp - spent, need };
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function iconSVG(item) {
    const h = hash(item.id);
    const hue = item.hue;
    const c1 = `hsl(${hue} 62% 58%)`;
    const c2 = `hsl(${(hue + 28) % 360} 50% 32%)`;
    const shape = h % 6;
    const glyphs = ["◆", "✶", "☾", "✦", "⚘", "⚙", "◉", "⚔", "☘", "✧"];
    const glyph = glyphs[h % glyphs.length];
    let body = "";
    if (shape === 0) body = `<circle cx="32" cy="32" r="18" fill="url(#g)" stroke="${c1}" />`;
    else if (shape === 1) body = `<polygon points="32,10 52,32 32,54 12,32" fill="url(#g)" stroke="${c1}" />`;
    else if (shape === 2) body = `<path d="M32 8 C44 20 50 28 32 56 C14 28 20 20 32 8Z" fill="url(#g)" stroke="${c1}" />`;
    else if (shape === 3) body = `<rect x="14" y="14" width="36" height="36" rx="8" fill="url(#g)" stroke="${c1}" transform="rotate(${h % 20 - 10} 32 32)" />`;
    else if (shape === 4) body = `<polygon points="32,8 38,24 56,24 42,34 48,52 32,42 16,52 22,34 8,24 26,24" fill="url(#g)" stroke="${c1}" />`;
    else body = `<path d="M18 40c8-18 20-18 28 0 6 10-2 16-14 16S12 50 18 40z" fill="url(#g)" stroke="${c1}" />`;
    const ring = (h >> 3) % 2 ? `<circle cx="32" cy="32" r="22" fill="none" stroke="${c1}" stroke-opacity="0.45" stroke-dasharray="3 4" />` : "";
    return `<svg viewBox="0 0 64 64" aria-hidden="true">
      <defs><radialGradient id="g${item.id}" cx="40%" cy="35%">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </radialGradient></defs>
      ${ring.replace('url(#g)', `url(#g${item.id})`) ? "" : ""}
      ${body.replace("url(#g)", `url(#g${item.id})`)}
      ${ring}
      <text x="32" y="37" text-anchor="middle" font-size="14" fill="#fff8ee" font-family="Palatino, serif">${glyph}</text>
    </svg>`;
  }

  function iconHTML(item) {
    return `<div class="icon anim-${item.anim}">${iconSVG(item)}<span class="fx"></span></div>`;
  }

  function ownedIds() {
    return ["water", "fire", "earth", "air", ...state.discovered];
  }

  function visibleItems() {
    const q = query.trim().toLowerCase();
    return ownedIds()
      .map((id) => items[id])
      .filter((it) => {
        if (q && !it.name.toLowerCase().includes(q) && !it.category.includes(q)) return false;
        if (filter === "favorites") return state.favorites.includes(it.id);
        if (filter === "all") return true;
        return it.rarity === filter;
      });
  }

  function renderFilters() {
    $("filters").innerHTML = FILTERS.map((f) =>
      `<button type="button" class="chip ${f === filter ? "active" : ""}" data-filter="${f}">${f}</button>`
    ).join("");
  }

  function renderInventory() {
    const list = visibleItems();
    $("inventory").innerHTML = list.map((it) => `
      <div class="card ${selected === it.id ? "selected" : ""}" data-id="${it.id}" role="button" tabindex="0">
        <span class="star ${state.favorites.includes(it.id) ? "on" : ""}" data-fav="${it.id}" title="Favorite">★</span>
        ${iconHTML(it)}
        <div class="name">${it.name}</div>
        <div class="rarity ${it.rarity}">${it.rarity}</div>
      </div>`).join("") || `<p class="empty-detail">No reagents match.</p>`;
  }

  function renderSlots() {
    paintSlot($("slot-a"), slotA);
    paintSlot($("slot-b"), slotB);
    $("combine").disabled = !(slotA && slotB);
  }

  function paintSlot(node, id) {
    if (!id) {
      node.classList.remove("filled");
      node.innerHTML = "<span>Empty</span>";
      return;
    }
    const it = items[id];
    node.classList.add("filled");
    node.innerHTML = `${iconHTML(it)}<span class="name">${it.name}</span>`;
  }

  function renderMeters() {
    const info = levelInfo(state.xp);
    $("level").textContent = info.level;
    $("xp-bar").style.width = `${Math.min(100, (info.into / info.need) * 100)}%`;
    $("xp-text").textContent = `${info.into} / ${info.need} XP`;
    const n = state.discovered.length;
    $("prog-bar").style.width = `${(n / 500) * 100}%`;
    $("prog-text").textContent = `${n} / 500`;
    $("book-count").textContent = `${n} unlocked`;
    $("hint-count").textContent = state.hints;
    $("btn-sound").textContent = soundOn ? "Sound on" : "Sound off";
  }

  function renderChallenges() {
    $("challenge-list").innerHTML = CHALLENGES.map((c) => {
      const done = c.test(state);
      return `<li class="${done ? "done" : ""}"><span>${c.name}</span><span>${done ? "done" : "open"}</span></li>`;
    }).join("");
  }

  function renderAchievements() {
    $("achieve-list").innerHTML = ACHIEVEMENTS.map((a) => {
      const done = state.achievements.includes(a.id);
      return `<li class="${done ? "done" : ""}"><span>${a.name}</span><span>${done ? "earned" : "locked"}</span></li>`;
    }).join("");
  }

  function renderCodex() {
    const rows = [...state.discovered].reverse().map((id) => {
      const it = items[id];
      const r = byResult.get(id);
      const pair = r ? `${items[r.a].name} + ${items[r.b].name}` : "";
      return `<button type="button" data-codex="${id}"><b>${it.name}</b><br><span>${pair}</span></button>`;
    });
    $("codex-list").innerHTML = rows.join("") || `<p class="empty-detail">No bindings yet.</p>`;
  }
    const node = $("detail");
    if (!id || !items[id]) {
      node.innerHTML = `<p class="empty-detail">Select a discovery to read its binding.</p>`;
      return;
    }
    const it = items[id];
    const recipe = byResult.get(id);
    let ings = "";
    if (it.starter) ings = `<p>Primordial. It was already in the lab.</p>`;
    else if (recipe) {
      ings = `<div class="ings">
        <span class="pill">${items[recipe.a].name}</span>
        <span class="pill">${items[recipe.b].name}</span>
      </div>`;
    }
    node.innerHTML = `
      <div class="detail-head">${iconHTML(it)}
        <div><h3>${it.name}</h3><div class="rarity ${it.rarity}">${it.rarity} · ${it.category} · tier ${it.tier}</div></div>
      </div>
      <p>${it.desc}</p>
      <h3>Binding</h3>
      ${ings}`;
  }

  function toast(title, body) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<b>${title}</b><div>${body}</div>`;
    $("toasts").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach((a) => {
      if (!state.achievements.includes(a.id) && a.test(state)) {
        state.achievements.push(a.id);
        toast("Achievement", a.name);
      }
    });
  }

  function tone(freq, dur, type = "sine", gain = 0.04) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.stop(audioCtx.currentTime + dur);
    } catch { /* ignore */ }
  }

  function place(id) {
    if (!slotA) slotA = id;
    else if (!slotB) slotB = id;
    else slotB = id;
    selected = id;
    renderSlots();
    renderDetail(id);
    renderInventory();
  }

  function combine() {
    if (!slotA || !slotB) return;
    const key = [slotA, slotB].sort().join("|");
    const recipe = recipeMap.get(key);
    const crucible = $("crucible");
    crucible.classList.add("merging");
    $("combine").disabled = true;
    tone(220, 0.18, "triangle");
    setTimeout(() => {
      crucible.classList.remove("merging");
      if (!recipe) {
        tone(110, 0.25, "sawtooth", 0.03);
        $("lab-note").textContent = "The crucible refuses. These two do not bind.";
        $("result").hidden = true;
        const near = hintFor(slotA) || hintFor(slotB);
        if (near && Math.random() < 0.35) {
          toast("Near miss", `${items[near].name} still wants a partner you already hold.`);
        }
        renderSlots();
        return;
      }
      const item = items[recipe.result];
      const known = state.discovered.includes(item.id);
      const crit = Math.random() < (recipe.crit ? 0.22 : 0.1);
      if (crit) state.crits += 1;
      let gained = 0;
      if (!known) {
        state.discovered.push(item.id);
        gained = XP[item.rarity] || 12;
        if (crit) gained = Math.round(gained * 1.5);
        state.xp += gained;
        tone(520, 0.12, "sine", 0.05);
        setTimeout(() => tone(780, 0.18, "triangle", 0.04), 90);
      } else {
        gained = crit ? 6 : 2;
        state.xp += gained;
        tone(360, 0.12, "sine", 0.03);
      }
      const event = crit ? "Critical binding" : known ? "Known work" : "Discovery";
      $("lab-note").textContent = crit
        ? "The crucible flares. A critical binding spills extra essence."
        : known
          ? "You already recorded this binding. A little practice remains."
          : `${item.name} condenses in the crucible.`;
      const result = $("result");
      result.hidden = false;
      result.innerHTML = `${iconHTML(item)}<div><b>${item.name}</b><div class="rarity ${item.rarity}">${event} · +${gained} XP</div><div>${item.desc}</div></div>`;
      selected = item.id;
      checkAchievements();
      save();
      renderAll();
    }, 680);
  }

  function hintFor(id) {
    for (const r of data.recipes) {
      if (state.discovered.includes(r.result)) continue;
      const other = r.a === id ? r.b : r.b === id ? r.a : null;
      if (!other) continue;
      if (ownedIds().includes(other)) return id;
    }
    return null;
  }

  function giveHint() {
    if (state.hints <= 0) {
      toast("No hints", "Hints return when you export a fresh lab... or reset.");
      return;
    }
    const owned = ownedIds();
    const options = data.recipes.filter((r) => !state.discovered.includes(r.result) && owned.includes(r.a) && owned.includes(r.b) && !r.hidden);
    const secretOpts = data.recipes.filter((r) => !state.discovered.includes(r.result) && owned.includes(r.a) && owned.includes(r.b) && r.hidden);
    const pickFrom = options.length ? options : secretOpts;
    if (!pickFrom.length) {
      toast("Quiet crucible", "No unused binding among what you hold. Discover more reagents.");
      return;
    }
    const r = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    state.hints -= 1;
    save();
    toast("Hint", `${items[r.a].name} + ${items[r.b].name}`);
    renderMeters();
  }

  function renderAll() {
    renderFilters();
    renderInventory();
    renderSlots();
    renderMeters();
    renderChallenges();
    renderAchievements();
    renderDetail(selected);
    renderCodex();
  }

  $("codex-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-codex]");
    if (!btn) return;
    selected = btn.dataset.codex;
    renderDetail(selected);
    renderInventory();
  });

  document.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      e.preventDefault();
      const id = fav.dataset.fav;
      if (state.favorites.includes(id)) state.favorites = state.favorites.filter((x) => x !== id);
      else state.favorites.push(id);
      checkAchievements();
      save();
      renderAll();
      return;
    }
    const card = e.target.closest("[data-id]");
    if (card) place(card.dataset.id);
  });

  $("filters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    filter = btn.dataset.filter;
    renderAll();
  });

  $("search").addEventListener("input", (e) => {
    query = e.target.value;
    renderInventory();
  });

  $("slot-a").addEventListener("click", () => { slotA = null; renderSlots(); });
  $("slot-b").addEventListener("click", () => { slotB = null; renderSlots(); });
  $("combine").addEventListener("click", combine);
  $("hint").addEventListener("click", giveHint);

  $("btn-sound").addEventListener("click", () => {
    soundOn = !soundOn;
    save();
    renderMeters();
  });

  $("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "infinite-alchemy-save.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.discovered)) throw new Error("bad save");
      state = { ...fresh(), ...parsed };
      soundOn = state.sound !== false;
      slotA = slotB = selected = null;
      save();
      renderAll();
      toast("Loaded", `${state.discovered.length} discoveries restored.`);
    } catch {
      toast("Import failed", "That file is not an Infinite Alchemy save.");
    }
    e.target.value = "";
  });

  $("btn-reset").addEventListener("click", () => {
    if (!confirm("Reset the lab? Discoveries on this device will be cleared.")) return;
    state = fresh();
    slotA = slotB = selected = null;
    save();
    renderAll();
  });

  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("show", p.dataset.panel === btn.dataset.tab));
    });
  });
  document.querySelector('.panel[data-panel="lab"]').classList.add("show");

  renderAll();
})();
