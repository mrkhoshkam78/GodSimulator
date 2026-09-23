const DAYS_PER_YEAR = 360;
const REAL_MS_PER_DAY = 12000;

const uid = (p="id") => p + "_" + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
const pick = a => a[Math.floor(Math.random()*a.length)];
const clamp = (n,a=0,b=100) => Math.max(a, Math.min(b, n));
const rnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const chance = p => Math.random() < p;

function dominantEmotion(e) {
  let k = "peace", v = -1;
  for (const key of EMOTIONS) if ((e[key]||0) > v) { v = e[key]; k = key; }
  return k;
}

function emotionColor(k) {
  const map = {
    happiness:"#e8c36a", sadness:"#6b8cae", anger:"#ff4d6d", fear:"#9b7bff",
    anxiety:"#c9a227", hope:"#4cc9f0", love:"#ff7aa2", jealousy:"#7ad36a",
    loneliness:"#8892a8", trust:"#2ee6a6", hate:"#c0392b", peace:"#a8d8ea"
  };
  return map[k] || "#e8c36a";
}

function makePerson(overrides={}) {
  const gender = overrides.gender || pick(["مرد","زن"]);
  const name = overrides.name || pick(gender==="مرد"?NAMES_M:NAMES_F);
  const age = overrides.age ?? rnd(16,58);
  const emotions = {};
  EMOTIONS.forEach(k => emotions[k] = rnd(10,70));
  const traits = {};
  TRAITS.forEach(k => traits[k] = rnd(20,85));
  return {
    id: overrides.id || uid("h"),
    name, gender, age,
    birthAge: overrides.birthAge ?? age,
    birthDay: overrides.birthDay ?? 1,
    job: overrides.job || pick(JOBS),
    education: pick(["هیچ","مقدماتی","میانه","عالی"]),
    married: chance(.35),
    family: [],
    home: pick(PLACES),
    wealth: rnd(10,180),
    income: rnd(2,18),
    health: rnd(55,100),
    energy: rnd(40,100),
    hunger: rnd(10,50),
    thirst: rnd(10,40),
    faith: rnd(20,90),
    alive: true,
    lifespan: overrides.lifespan ?? rnd(72,96),
    traits, emotions,
    fears: [pick(FEARS), pick(FEARS)],
    values: [pick(VALUES), pick(VALUES)],
    beliefs: chance(.5) ? "جهان معنا دارد" : "سرنوشت در دست خودم است",
    goals: pick(["خانه‌ای امن","نامی ماندگار","آرامش دل","دانش پنهان","فرزندی شایسته"]),
    longGoal: pick(["بنیان‌نهادن خاندانی پایدار","یافتن حقیقت پنهان جهان","رهانیدن زادگاه از رنج","نامی که پس از مرگ بماند","صلح با کسی که از او رنجیده"]),
    storyArc: pick(["جست‌وجوگر","رنج‌دیده","بلندپرواز","نگهبان","دل‌شکسته","تازه‌وارد"]),
    grudge: null,
    lastDivineDay: 0,
    divineDebt: 0,
    weakness: pick(["شتابزدگی","اعتماد بیش از حد","کینه","تردید"]),
    activity: pick(["کار می‌کند","استراحت","گفتگو","عبادت","سفر کوتاه"]),
    worry: pick(["فردا","نان","تنهایی","بیماری"]),
    nextPlan: pick(["به بازار می‌رود","به خانه بازمی‌گردد","دعا می‌کند"]),
    thoughts: "آیا کسی صدایم را می‌شنود؟",
    relations: [],
    memories: [{day:0, text:"چشم به جهان گشود و نام خود را شنید."}],
    speeches: [],
    emotionLog: [],
    tech: rnd(1,4),
    luck: rnd(20,60),
    ...overrides
  };
}

function weightedChance(base, traitBoost) {
  return chance(clamp(base + (traitBoost || 0) / 200, 0, 0.95));
}

function personSummary(p) {
  if (!p) return "";
  const em = dominantEmotion(p.emotions);
  return `${p.name} · ${p.age}س · ${p.job} · ${EMOTION_FA[em]} · ایمان ${p.faith} · هدف: ${p.longGoal || p.goals}`;
}

function threeLineSpeech(p, world) {
  const em = dominantEmotion(p.emotions);
  const lines = [];
  if (!p.alive) {
    return "جسمم آرام گرفته و دیگر صدایی ندارد.\nتنها نام و خاطره در جهان مانده است.\nاگر هنوز می‌شنوی، یادم را نگاه دار.";
  }
  const openers = {
    sadness: `خدایا، امروز دلم از ${p.worry} سنگین است.`,
    hope: `هنوز به ${p.goals} امید دارم.`,
    fear: `از ${p.fears[0]} می‌ترسم و شب آرام ندارم.`,
    love: `عشق در دلم هست، اما راهش روشن نیست.`,
    anger: `بی‌عدالتی دوروبرم شعله‌ام را تیز کرده.`,
    happiness: `نور کوچکی در ${p.home} دیدم و لبخند زدم.`,
    anxiety: `نمی‌دانم فردا شغل ${p.job} برایم می‌ماند یا نه.`,
    loneliness: `در ${p.home} صدای کسی را نمی‌شنوم.`,
    peace: `دلم برای لحظه‌ای آرام گرفت.`,
    trust: `هنوز به کسی در این جهان تکیه می‌کنم.`,
    hate: `کینه مثل زخم کهنه باز شده.`,
    jealousy: `نگاه کردن به دارایی دیگران آرامم نمی‌گذارد.`
  };
  lines.push(openers[em] || `من ${p.name} هستم و امروز حالم دگرگون است.`);
  const mid = [
    `خاطره اخیرم: ${p.memories[p.memories.length-1]?.text || "سکوت"}`,
    `باورم این است که ${p.beliefs}.`,
    `ارزش ${p.values[0]} را از دست نمی‌دهم.`,
    `گرسنگی‌ام ${p.hunger>60?"آزارم می‌دهد":"قابل تحمل است"}.`
  ];
  lines.push(pick(mid));
  const ends = [
    "اگر صدایم را می‌شنوی، راهی پیش پایم بگذار.",
    "نشانه‌ای بفرست تا بدانم تنها نیستم.",
    "سرنوشتم را به دست خودت می‌سپارم.",
    `برای ${p.goals} دعا می‌کنم.`
  ];
  lines.push(pick(ends));
  return lines.join("\n");
}

function toast(msg) {
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function flashFX() {
  const fx = document.getElementById("fx-overlay");
  if (!fx) return;
  fx.classList.add("on");
  setTimeout(() => fx.classList.remove("on"), 600);
}

function showDivineBanner(powerId, msg) {
  let el = document.getElementById("divine-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "divine-banner";
    el.className = "divine-banner";
    document.body.appendChild(el);
  }
  const meta = (typeof POWER_CATS !== "undefined")
    ? POWER_CATS.flatMap(c => c.powers).find(p => p.id === powerId)
    : null;
  el.innerHTML = `<strong>${meta ? meta.name : "قدرت الهی"}</strong><span>${(msg || "").split("\n")[0]}</span>`;
  el.classList.add("show");
  clearTimeout(showDivineBanner._t);
  showDivineBanner._t = setTimeout(() => el.classList.remove("show"), 2800);
}
