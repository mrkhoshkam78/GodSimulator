function seedWorld() {
  const people = [];
  const used = new Set();
  while (people.length < 20) {
    const p = makePerson();
    if (used.has(p.name)) p.name += " " + pick(["مهر","نور","راد","گل"]);
    used.add(p.name);
    people.push(p);
  }
  for (let i=0;i<8;i++) {
    const a = pick(people), b = pick(people);
    if (a.id===b.id) continue;
    a.relations.push({id:b.id,name:b.name,type:pick(["دوست","همکار","خانواده"]),trust:rnd(20,80),love:rnd(10,70)});
  }
  return {
    version: "1.0.3",
    time: {day:1, year:1, speed:1, paused:false, accMs:0},
    world: {
      weather: "آسمان صاف",
      weatherCycle: 0,
      foodBonus: 0,
      waterBonus: 0,
      law: "قانون کهن احترام به جان",
      society: "جوامع پراکنده",
      tech: 2,
      civilizations: []
    },
    people,
    prayers: [],
    events: [{id:uid("ev"), type:"پیدایش", text:"از سکوت، نخستین سپیده برخاست و جهان چشم گشود.", day:1, year:1, ids:[]}],
    checkpoint: null
  };
}

const Game = {
  state: null,
  timer: null,
  audioOn: false,
  ctx: null,

  start(fromSave) {
    this.state = fromSave || seedWorld();
    if (!this.state.time) this.state.time = {day:1, year:1, speed:1, paused:false, accMs:0};
    this.state.time.accMs = this.state.time.accMs || 0;
    this.state.version = "1.0.3";
    this.state.time.year = 1 + Math.floor((Math.max(1, this.state.time.day) - 1) / DAYS_PER_YEAR);
    (this.state.people||[]).forEach(p => Simulation.migratePerson(this.state, p));
    if (!this.state.prayers || this.state.prayers.length === 0) Simulation.seedPrayers(this.state, 7);
    this.state.checkpoint = JSON.parse(JSON.stringify({...this.state, checkpoint:null}));
    UI.bind(this.state);
    this.loop();
    this.stars();
  },

  loop() {
    clearInterval(this.timer);
    const step = 250;
    this.timer = setInterval(() => {
      const t = this.state.time;
      if (!t.paused && t.speed > 0) {
        t.accMs = (t.accMs || 0) + step * t.speed;
        while (t.accMs >= REAL_MS_PER_DAY) {
          t.accMs -= REAL_MS_PER_DAY;
          Simulation.tick(this.state);
          UI.prayers();
          UI.stats();
        }
      }
      UI.time();
      UI.stats();
    }, step);
    this.uiTimer && clearInterval(this.uiTimer);
    this.uiTimer = setInterval(() => UI.renderAll(), 2000);
  },

  stars() {
    const c = document.getElementById("particles");
    const ctx = c.getContext("2d");
    const fit = () => { c.width = innerWidth; c.height = innerHeight; };
    fit(); addEventListener("resize", fit);
    const dots = Array.from({length:80}, () => ({x:Math.random(), y:Math.random(), r:Math.random()*1.6+.2, s:Math.random()*0.0008+0.0002}));
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = "rgba(232,195,106,.7)";
      dots.forEach(d => {
        d.y -= d.s; if (d.y<0) d.y=1;
        ctx.beginPath(); ctx.arc(d.x*c.width, d.y*c.height, d.r, 0, 7); ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    draw();
  }
};

(function mountIcons(){
  document.getElementById("btn-menu").innerHTML = icon("menu");
  document.getElementById("btn-menu-close").innerHTML = icon("close");
  document.getElementById("brand-ico").innerHTML = icon("brand");
  const timeMap = {0:"pause",1:"play",3:"fast",8:"fastest"};
  document.querySelectorAll(".time-controls button[data-speed]").forEach(b => {
    b.innerHTML = icon(timeMap[b.dataset.speed]);
  });
  document.querySelectorAll("[data-ico]").forEach(el => { el.innerHTML = icon(el.dataset.ico); });
  const sel = document.getElementById("btn-select-mode");
  if (sel) sel.innerHTML = icon("group") + " انتخاب گروهی";
})();

const appEl = document.getElementById("app");
function closeNav(){ appEl.classList.remove("nav-open"); }
function toggleNav(){
  if (window.innerWidth <= 960) appEl.classList.toggle("nav-open");
  else appEl.classList.toggle("nav-collapsed");
}
document.getElementById("btn-menu").onclick = () => { SFX.menu(); toggleNav(); };
document.getElementById("btn-menu-close").onclick = closeNav;
document.getElementById("nav-backdrop").onclick = closeNav;

document.getElementById("btn-begin").onclick = () => {
  document.getElementById("intro").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  const saved = SaveSystem.load();
  SFX.enabled = true;
  SFX.begin();
  Game.start(saved);
  toast(saved ? "بازگشت به جهانی که نیمه‌کاره رها کرده بودی." : "جهان نو از دل تاریکی زاده شد.");
};

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
    const view = document.getElementById("view-"+btn.dataset.view);
    if (view) view.classList.remove("hidden");
    UI.renderAll();
    if (window.innerWidth <= 960) closeNav();
  };
});

document.querySelectorAll(".time-controls button[data-speed]").forEach(btn => {
  btn.onclick = () => {
    const s = Number(btn.dataset.speed);
    Game.state.time.paused = s===0;
    if (s>0) Game.state.time.speed = s;
    UI.time();
  };
});

["search","filter-life","filter-emotion","filter-job","sort-by","event-filter"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => UI.renderAll());
  document.getElementById(id).addEventListener("change", () => UI.renderAll());
});

document.getElementById("btn-select-mode").onclick = () => {
  UI.selectMode = !UI.selectMode;
  toast(UI.selectMode ? "حالت انتخاب گروهی روشن است." : "انتخاب گروهی خاموش شد.");
  UI.grid();
};

document.getElementById("people-grid").addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (!card) return;
  const id = card.dataset.id;
  if (e.target.closest(".toggle")) {
    UI.openId = UI.openId===id ? null : id;
    UI.grid();
  }
  if (e.target.closest(".pick")) {
    if (UI.selected.has(id)) UI.selected.delete(id); else UI.selected.add(id);
    UI.grid();
  }
});

document.getElementById("prayer-chamber").addEventListener("click", e => {
  const act = e.target.dataset.act, pid = e.target.dataset.pr;
  if (!act) return;
  const pr = Game.state.prayers.find(x=>x.id===pid);
  if (!pr) return;
  const person = Game.state.people.find(p=>p.id===pr.personId);
  const map = {full:"اجابت‌شده", partial:"اجابت جزئی", sign:"اجابت جزئی", deny:"ردشده", delay:"به‌تعویق‌افتاده"};
  pr.status = map[act];
  if (person) {
    if (act==="full") { person.emotions.hope=clamp(person.emotions.hope+25); person.emotions.happiness=clamp(person.emotions.happiness+15); person.faith=clamp(person.faith+12); person.wealth+=15; }
    if (act==="partial") { person.emotions.hope=clamp(person.emotions.hope+10); person.faith=clamp(person.faith+5); }
    if (act==="sign") { person.thoughts = "نشانه‌ای در باد دیدم."; person.emotions.trust=clamp(person.emotions.trust+8); }
    if (act==="deny") { person.emotions.sadness=clamp(person.emotions.sadness+12); person.faith=clamp(person.faith-8); }
    person.memories.push({day:Game.state.time.day, text:`پاسخ الهی به دعا: ${pr.status}`});
  }
  Simulation.log(Game.state, "اجابت دعا", `دعای ${pr.name} ${pr.status} شد.`, [pr.personId]);
  SaveSystem.persist(Game.state);
  UI.renderAll();
  SFX.grant();
  toast("حکم تو در جان دعاکننده نشست.");
});

document.getElementById("powers-menu").addEventListener("click", e => {
  const card = e.target.closest(".power-card");
  if (!card) return;
  SFX.power();
  UI.powerModal(card.dataset.power);
});

document.getElementById("modal").addEventListener("click", e => {
  if (e.target.id==="modal" || e.target.id==="modal-close") UI.closeModal();
});

document.getElementById("btn-save").onclick = () => { SaveSystem.persist(Game.state); Game.state.checkpoint = JSON.parse(JSON.stringify(Game.state)); toast("جهان ذخیره شد."); };
document.getElementById("btn-load").onclick = () => {
  const s = SaveSystem.load();
  if (!s) return toast("ذخیره‌ای نیست.");
  Game.state = s; UI.bind(s); toast("بارگذاری شد.");
};
document.getElementById("btn-new").onclick = () => {
  SaveSystem.clear();
  Game.state = seedWorld();
  Simulation.seedPrayers(Game.state, 7);
  UI.bind(Game.state);
  toast("جهانی دیگر از تاریکی سر برآورد.");
};
const audioEl = document.getElementById("chk-audio");
if (audioEl) audioEl.onchange = e => {
  SFX.enabled = e.target.checked;
  Game.audioOn = e.target.checked;
  toast(SFX.enabled ? "افکت صوتی روشن شد." : "افکت صوتی خاموش شد.");
  if (SFX.enabled) SFX.begin();
};
