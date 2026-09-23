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
    state.world.silenceDays = (state.world.silenceDays || 0) + 1;
    if (state.world.silenceDays > 8) {
      state.world.faith = clamp((state.world.faith || 50) - 1);
      state.world.dread = clamp((state.world.dread || 20) + 0.5);
    }

    state.people.forEach(p => {
      if (!p.alive) return;
      this.live(state, p);
    });

    this.recalcWorldMood(state);
    if (chance(0.22)) this.randomEvent(state);
    if (chance(0.55) || !state.prayers.some(pr => pr.status === "در انتظار")) this.maybePray(state);
    if (chance(0.06)) this.maybeBirth(state);
    if (chance(0.08)) this.storyBeat(state);

    if (state.time.day % 2 === 0) SaveSystem.persist(state);
  },

  recalcWorldMood(state) {
    const living = state.people.filter(p => p.alive);
    if (!living.length) return;
    const avgFaith = living.reduce((s,p)=>s+(p.faith||0),0) / living.length;
    state.world.faith = Math.round(avgFaith * 0.7 + (state.world.faith || 50) * 0.3);
    state.world.awe = clamp(state.world.awe || 40);
    state.world.dread = clamp(state.world.dread || 20);
    state.world.divinePower = clamp((state.world.divinePower ?? 100), 0, 100);
    if ((state.time.day % 5) === 0) state.world.divinePower = clamp((state.world.divinePower || 100) + 8);
  },

  storyBeat(state) {
    const living = state.people.filter(p => p.alive);
    if (!living.length) return;
    const p = pick(living);
    const ambition = (p.traits?.ambition || 40) / 100;
    const kindness = (p.traits?.kindness || 40) / 100;
    if (weightedChance(0.3, p.traits?.courage) && p.storyArc === "بلندپرواز") {
      p.activity = "برای هدف بلندمدت خود می‌کوشد";
      p.emotions.hope = clamp(p.emotions.hope + 6);
      p.memories.push({day: state.time.day, text: `گامی به سوی «${p.longGoal}» برداشت.`});
      this.log(state, "عزم", `${p.name} عزم خود را برای ${p.longGoal} جزم کرد.`, [p.id]);
    } else if (weightedChance(0.25, p.traits?.kindness * kindness) && p.relations.length) {
      const r = pick(p.relations);
      r.trust = clamp((r.trust || 40) + rnd(2, 8));
      p.emotions.trust = clamp(p.emotions.trust + 4);
      p.memories.push({day: state.time.day, text: `پیوندش با ${r.name} استوارتر شد.`});
    } else if (p.grudge && weightedChance(0.2, p.traits?.pride)) {
      p.emotions.anger = clamp(p.emotions.anger + 10);
      p.emotions.hate = clamp(p.emotions.hate + 6);
      p.activity = "کینه را در دل زنده نگه می‌دارد";
      this.log(state, "کینه", `${p.name} هنوز از ${p.grudge} رنج می‌برد.`, [p.id]);
    } else if ((state.time.day - (p.lastDivineDay || 0)) > 20 && p.faith > 40) {
      p.emotions.loneliness = clamp(p.emotions.loneliness + 5);
      p.faith = clamp(p.faith - 2);
      p.thoughts = "آیا عرش ما را فراموش کرده؟";
    }
  },

  live(state, p) {
    this.migratePerson(state, p);
    if (!p.longGoal) p.longGoal = p.goals;
    if (!p.storyArc) p.storyArc = "تازه‌وارد";
    p.age = this.calendarAge(state, p);
    p.hunger = clamp(p.hunger + rnd(1,3) - (state.world.foodBonus||0));
    p.thirst = clamp(p.thirst + rnd(1,2) - (state.world.waterBonus||0));
    p.energy = clamp(p.energy - rnd(0,2) + (p.health>70?2:1));
    if (p.hunger > 85 || p.thirst > 85) p.health = clamp(p.health - 1);
    if (state.world.weather === "خشکسالی" && chance(.35)) p.health = clamp(p.health - 1);
    if (state.world.weather === "باران مطلوب") p.emotions.hope = clamp(p.emotions.hope + 2);

    p.wealth = Math.max(0, p.wealth + Math.round(p.income * 0.2) - rnd(0,3));
    if (p.wealth < 8) { p.emotions.anxiety = clamp(p.emotions.anxiety+4); p.emotions.hope = clamp(p.emotions.hope-2); }
    if (p.wealth > 120) p.emotions.happiness = clamp(p.emotions.happiness+2);

    const patience = (p.traits?.patience || 50) / 100;
    EMOTIONS.forEach(k => {
      p.emotions[k] = clamp(p.emotions[k] + rnd(-2,2) * (1 - patience * 0.3));
    });
    if (p.luck > 70 && chance(.2)) p.emotions.hope = clamp(p.emotions.hope+5);
    if (p.storyArc === "رنج‌دیده") p.emotions.sadness = clamp(p.emotions.sadness + 1);

    if (chance(.1)) {
      const acts = p.traits?.curiosity > 60
        ? ["می‌آموزد","کاوش می‌کند","از دیگران می‌پرسد","کار می‌کند"]
        : ["کار می‌کند","با دوستان است","دعا می‌کند","بازار می‌رود","خواب می‌بیند"];
      p.activity = pick(acts);
    }
    if (!p.married && p.age > 18 && weightedChance(0.02, p.traits?.kindness)) this.marry(state, p);
    if (p.married && weightedChance(0.012, p.traits?.pride)) this.conflict(state, p);

    const oldAge = p.age >= 65 && p.age >= p.lifespan;
    const critical = p.health <= 2 && p.age >= 50;
    if (oldAge || critical) this.die(state, p);

    if (chance(.06)) {
      p.memories.push({day: state.time.day, text: pick([
        `در ${p.home} به «${p.longGoal}» اندیشید.`,
        `شغل ${p.job} امروز آزمونی برای ${p.storyArc} بودنش آورد.`,
        p.grudge ? `یاد ${p.grudge} آرام و قرارش را گرفت.` : `روزی معمولی اما پر از فکر در ${p.home}.`
      ])});
      if (p.memories.length > 28) p.memories.shift();
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
    if (p.relations.length) {
      const r = pick(p.relations);
      r.trust = clamp((r.trust || 40) - rnd(5, 15));
      p.grudge = r.name;
      p.storyArc = "دل‌شکسته";
    }
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
    let t = pick(PRAYER_TOPICS);
    if (p.health < 40) t = PRAYER_TOPICS.find(x => x.topic === "سلامتی") || t;
    else if (p.wealth < 15) t = PRAYER_TOPICS.find(x => x.topic === "ثروت") || t;
    else if ((p.emotions.loneliness || 0) > 60) t = PRAYER_TOPICS.find(x => x.topic === "عشق") || t;
    else if (p.grudge) t = PRAYER_TOPICS.find(x => x.topic === "بخشش") || t;
    const line = pick(t.texts || [t.text || "اگر می‌شنوی، به فریادم برس."]);
    const prayer = {
      id: uid("pr"),
      personId: p.id,
      name: p.name,
      topic: t.topic,
      text: `${p.name}: ${line}`,
      day: state.time.day || 1,
      intensity: rnd(45, 99),
      emotion: dominantEmotion(p.emotions),
      status: "در انتظار"
    };
    state.prayers.unshift(prayer);
    if (state.prayers.length > 60) state.prayers.length = 60;
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
