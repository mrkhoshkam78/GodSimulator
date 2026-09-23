const Simulation = {
  migratePerson(state, p) {
    if (p.birthDay == null) p.birthDay = state.time.day || 1;
    if (p.birthAge == null) p.birthAge = p.age || 20;
    if (!p.lifespan || p.lifespan < 70) p.lifespan = Math.max(72, p.lifespan || 80);
  },

  calendarAge(state, p) {
    const lived = Math.max(0, (state.time.day || 1) - (p.birthDay || 1));
    return (p.birthAge || 0) + Math.floor(lived / DAYS_PER_YEAR);
  },

  tick(state) {
    if (state.time.paused) return state;
    this.day(state);
    return state;
  },

  day(state) {
    state.time.day += 1;
    state.time.year = 1 + Math.floor((state.time.day - 1) / DAYS_PER_YEAR);
    state.world.weatherCycle = (state.world.weatherCycle + 1) % 40;

    state.people.forEach(p => {
      if (!p.alive) return;
      this.live(state, p);
    });

    if (chance(0.12)) this.randomEvent(state);
    if (chance(0.42) || !state.prayers.some(pr => pr.status === "در انتظار")) this.maybePray(state);
    if (chance(0.04)) this.maybeBirth(state);

    if (state.time.day % 3 === 0) SaveSystem.persist(state);
  },

  live(state, p) {
    this.migratePerson(state, p);
    p.age = this.calendarAge(state, p);
    p.hunger = clamp(p.hunger + rnd(1,3) - (state.world.foodBonus||0));
    p.thirst = clamp(p.thirst + rnd(1,2) - (state.world.waterBonus||0));
    p.energy = clamp(p.energy - rnd(0,2) + (p.health>70?2:1));
    if (p.hunger > 85 || p.thirst > 85) p.health = clamp(p.health - 1);
    if (state.world.weather === "خشکسالی" && chance(.35)) p.health = clamp(p.health - 1);
    if (state.world.weather === "باران مطلوب") p.hopeBoost = true;

    p.wealth = Math.max(0, p.wealth + Math.round(p.income * 0.2) - rnd(0,3));
    if (p.wealth < 8) { p.emotions.anxiety = clamp(p.emotions.anxiety+4); p.emotions.hope = clamp(p.emotions.hope-2); }
    if (p.wealth > 120) p.emotions.happiness = clamp(p.emotions.happiness+2);

    EMOTIONS.forEach(k => {
      p.emotions[k] = clamp(p.emotions[k] + rnd(-2,2));
    });
    if (p.luck > 70 && chance(.2)) p.emotions.hope = clamp(p.emotions.hope+5);

    if (chance(.08)) {
      p.activity = pick(["کار می‌کند","با دوستان است","دعا می‌کند","می‌آموزد","بازار می‌رود","خواب می‌بیند"]);
    }
    if (!p.married && p.age > 18 && chance(.015)) this.marry(state, p);
    if (p.married && chance(.01)) this.conflict(state, p);

    const oldAge = p.age >= 65 && p.age >= p.lifespan;
    const critical = p.health <= 2 && p.age >= 50;
    if (oldAge || critical) this.die(state, p);

    if (chance(.04)) {
      p.memories.push({day: state.time.day, text: pick([
        `در ${p.home} روزی معمولی اما پر فکر گذراند.`,
        `شغل ${p.job} امروز آزمونی تازه آورد.`,
        `به ${p.goals} نزدیک‌تر یا دورتر احساس کرد.`
      ])});
      if (p.memories.length > 24) p.memories.shift();
    }
  },

  marry(state, p) {
    const other = state.people.find(x => x.alive && x.id!==p.id && !x.married && x.gender!==p.gender && Math.abs(x.age-p.age)<14);
    if (!other) return;
    p.married = other.married = true;
    p.relations.push({id:other.id, name:other.name, type:"شریک", love:70, trust:60});
    other.relations.push({id:p.id, name:p.name, type:"شریک", love:70, trust:60});
    p.emotions.love = clamp(p.emotions.love+20);
    other.emotions.love = clamp(other.emotions.love+20);
    this.log(state, "ازدواج", `${p.name} و ${other.name} پیمان بستند.`, [p.id, other.id]);
  },

  conflict(state, p) {
    p.emotions.anger = clamp(p.emotions.anger+8);
    p.emotions.trust = clamp(p.emotions.trust-5);
    this.log(state, "اختلاف", `${p.name} با نزدیکان دچار تنش شد.`, [p.id]);
  },

  die(state, p) {
    p.alive = false;
    p.activity = "آرام گرفته است";
    this.log(state, "مرگ", `${p.name} چشم از جهان فرو بست.`, [p.id]);
    if (typeof SFX !== "undefined") SFX.death();
  },

  maybeBirth(state) {
    const couples = state.people.filter(p => p.alive && p.married);
    if (couples.length < 2) return;
    const parent = pick(couples);
    const child = makePerson({age:0, birthAge:0, birthDay:state.time.day, job:"کودک", home:parent.home});
    child.family = [parent.id];
    parent.family.push(child.id);
    state.people.push(child);
    this.log(state, "تولد", `${child.name} در ${child.home} زاده شد.`, [child.id, parent.id]);
  },

  createPrayer(state, person) {
    const p = person || pick(state.people.filter(x=>x.alive));
    if (!p) return null;
    const t = pick(PRAYER_TOPICS);
    const prayer = {
      id: uid("pr"),
      personId: p.id,
      name: p.name,
      topic: t.topic,
      text: `${p.name}: ${t.text}`,
      day: state.time.day || 1,
      intensity: rnd(40,98),
      emotion: dominantEmotion(p.emotions),
      status: "در انتظار"
    };
    state.prayers.unshift(prayer);
    p.memories.push({day:state.time.day||1, text:`به عرش پناه برد و برای ${t.topic} دعا کرد.`});
    this.log(state, "دعا", `${p.name} برای ${t.topic} دست به دعا برداشت.`, [p.id]);
    return prayer;
  },

  seedPrayers(state, n=6) {
    if (!state.prayers) state.prayers = [];
    const living = state.people.filter(p=>p.alive);
    living.slice(0, n).forEach(p => this.createPrayer(state, p));
  },

  maybePray(state) {
    this.createPrayer(state);
  },

  randomEvent(state) {
    const roll = Math.random();
    if (roll < .2) {
      state.world.weather = pick(["باران مطلوب","طوفان","خشکسالی","برف","آسمان صاف"]);
      this.log(state, "آب‌وهوا", `آسمان جهان به ${state.world.weather} بدل شد.`, []);
    } else if (roll < .4) {
      const p = pick(state.people.filter(x=>x.alive));
      if (!p) return;
      p.job = pick(JOBS);
      p.income = rnd(3,20);
      this.log(state, "شغل", `${p.name} شغل تازه‌ای یافت: ${p.job}`, [p.id]);
    } else if (roll < .55) {
      const p = pick(state.people.filter(x=>x.alive));
      if (!p) return;
      p.health = clamp(p.health - rnd(8,20));
      this.log(state, "بیماری", `${p.name} بیمار شد.`, [p.id]);
    } else if (roll < .7) {
      const p = pick(state.people.filter(x=>x.alive));
      if (!p) return;
      p.wealth += rnd(10,40);
      p.emotions.happiness = clamp(p.emotions.happiness+10);
      this.log(state, "موفقیت", `${p.name} به موفقیتی کوچک رسید.`, [p.id]);
    } else {
      const p = pick(state.people.filter(x=>x.alive));
      if (!p) return;
      p.emotions.sadness = clamp(p.emotions.sadness+12);
      this.log(state, "شکست", `${p.name} شکستی تلخ چشید.`, [p.id]);
    }
  },

  log(state, type, text, ids) {
    state.events.unshift({id:uid("ev"), type, text, day:state.time.day, year:state.time.year, ids});
    if (state.events.length > 200) state.events.pop();
  }
};
