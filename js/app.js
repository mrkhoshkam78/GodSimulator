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
    version: "1.0",
    time: {day:1, year:1, speed:1, paused:false},
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
    events: [{id:uid("ev"), type:"پیدایش", text:"جهان به فرمان خالق چشم گشود.", day:1, year:1, ids:[]}],
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
    this.state.checkpoint = JSON.parse(JSON.stringify(this.state));
    UI.bind(this.state);
    this.loop();
    this.stars();
  },

  loop() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      Simulation.tick(this.state);
      UI.renderAll();
    }, 1400);
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

document.getElementById("btn-begin").onclick = () => {
  document.getElementById("intro").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  const saved = SaveSystem.load();
  Game.start(saved);
  toast(saved ? "جهان ذخیره‌شده از سر گرفته شد." : "جهان نو زاده شد.");
};

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
    document.getElementById("view-"+btn.dataset.view).classList.remove("hidden");
    UI.renderAll();
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
  if (e.target.classList.contains("toggle")) {
    UI.openId = UI.openId===id ? null : id;
    UI.grid();
  }
  if (e.target.classList.contains("pick")) {
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
  toast("حکم الهی ثبت شد.");
});

document.getElementById("powers-menu").addEventListener("click", e => {
  const card = e.target.closest(".power-card");
  if (!card) return;
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
  UI.bind(Game.state);
  toast("جهانی دیگر آفریده شد.");
};
document.getElementById("chk-audio").onchange = e => {
  Game.audioOn = e.target.checked;
  toast(Game.audioOn ? "صدا روشن است (زمینه کیهانی)." : "صدا خاموش شد.");
  if (Game.audioOn && !Game.ctx) {
    const ac = new (window.AudioContext||window.webkitAudioContext)();
    Game.ctx = ac;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type="sine"; o.frequency.value=110;
    g.gain.value=0.02; o.connect(g); g.connect(ac.destination); o.start();
  }
};
