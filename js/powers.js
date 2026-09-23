const Powers = {
  apply(state, powerId, payload) {
    const fn = this[powerId];
    if (!fn) return { ok:false, msg:"قدرت ناشناخته" };
    const cost = (typeof DIVINE_COST !== "undefined" ? DIVINE_COST[powerId] : 10) || 10;
    state.world.divinePower = state.world.divinePower ?? 100;
    if (state.world.divinePower < cost && !["seeThoughts","seeMemories","hearPrayers"].includes(powerId)) {
      return { ok:false, msg:`نیروی الهی کافی نیست (نیاز: ${cost}، موجود: ${Math.round(state.world.divinePower)}). چند روز صبر کن تا نیرو بازگردد.` };
    }
    const res = fn.call(this, state, payload);
    if (res.ok !== false) {
      state.world.divinePower = clamp(state.world.divinePower - cost);
      state.world.silenceDays = 0;
      state.world.awe = clamp((state.world.awe || 40) + Math.ceil(cost / 6));
      if (["disaster","punish"].includes(powerId)) state.world.dread = clamp((state.world.dread || 20) + 8);
      if (["heal","bless","wealth","message","dream"].includes(powerId)) {
        state.world.faith = clamp((state.world.faith || 50) + 3);
        state.world.dread = clamp((state.world.dread || 20) - 2);
      }
      this.targets(state, payload).forEach(p => {
        p.lastDivineDay = state.time.day;
        p.faith = clamp((p.faith || 40) + (["punish","disaster"].includes(powerId) ? -4 : 5));
      });
      if (typeof showDivineBanner === "function") showDivineBanner(powerId, res.msg);
    }
    flashFX();
    SaveSystem.persist(state);
    return res;
  },

  targets(state, payload) {
    if (payload.scope === "world") return state.people;
    if (payload.ids && payload.ids.length) return state.people.filter(p => payload.ids.includes(p.id));
    if (payload.id) {
      const p = state.people.find(x => x.id === payload.id);
      return p ? [p] : [];
    }
    return [];
  },

  emotion(state, payload) {
    const list = this.targets(state, payload);
    const key = payload.key || "hope";
    const val = Number(payload.value ?? 80);
    list.forEach(p => { p.emotions[key] = clamp(val); p.emotionLog.push({day:state.time.day, key, val}); });
    Simulation.log(state, "قدرت الهی", `احساس ${EMOTION_FA[key]||key} دگرگون شد.`, list.map(p=>p.id));
    return {ok:true, msg:`احساس ${list.length} نفر تغییر کرد.`};
  },
  personality(state, payload) {
    const list = this.targets(state, payload);
    const key = payload.key || "courage";
    const val = Number(payload.value ?? 80);
    list.forEach(p => { p.traits[key] = clamp(val); p.memories.push({day:state.time.day, text:`ذات ${TRAIT_FA[key]} در او دگرگون شد.`}); });
    Simulation.log(state, "قدرت الهی", `شخصیت هدف تغییر کرد.`, list.map(p=>p.id));
    return {ok:true, msg:"شخصیت بازنویسی شد."};
  },
  thoughts(state, payload) {
    const list = this.targets(state, payload);
    const idea = payload.text || "اندیشه‌ای روشن از آسمان آمد.";
    list.forEach(p => { p.thoughts = idea; p.memories.push({day:state.time.day, text:`فکری نو: ${idea}`}); });
    Simulation.log(state, "قدرت الهی", "افکار تازه‌ای کاشته شد.", list.map(p=>p.id));
    return {ok:true, msg:"الهام فرستاده شد."};
  },
  memories(state, payload) {
    const list = this.targets(state, payload);
    const mode = payload.mode || "add";
    list.forEach(p => {
      if (mode === "clear") p.memories = [{day:state.time.day, text:"بخشی از گذشته در مه فرو رفت."}];
      else p.memories.push({day:state.time.day, text: payload.text || "خاطره‌ای الهی در جانش نشست."});
    });
    Simulation.log(state, "قدرت الهی", "خاطرات بازنویسی شد.", list.map(p=>p.id));
    return {ok:true, msg:"خاطرات تغییر کرد."};
  },
  behavior(state, payload) {
    const list = this.targets(state, payload);
    const act = payload.text || "در جای خود ایستاد و به آسمان نگریست.";
    list.forEach(p => { p.activity = act; p.nextPlan = act; });
    Simulation.log(state, "قدرت الهی", `رفتار به «${act}» تغییر یافت.`, list.map(p=>p.id));
    return {ok:true, msg:"فرمان رفتار اجرا شد."};
  },
  heal(state, payload) {
    const list = this.targets(state, payload);
    list.forEach(p => { p.health = 100; p.hunger = 10; p.thirst = 10; p.energy = 100; });
    Simulation.log(state, "قدرت الهی", "شفای کامل نازل شد.", list.map(p=>p.id));
    return {ok:true, msg:"بدن‌ها ترمیم شد."};
  },
  lifespan(state, payload) {
    const list = this.targets(state, payload);
    const extra = Number(payload.value ?? 12);
    list.forEach(p => { p.lifespan += extra; });
    Simulation.log(state, "قدرت الهی", `عمر ${extra} سال افزوده شد.`, list.map(p=>p.id));
    return {ok:true, msg:"ریسمان عمر درازتر شد."};
  },
  revive(state, payload) {
    const list = this.targets(state, payload).filter(p => !p.alive);
    list.forEach(p => { p.alive = true; p.health = 70; p.memories.push({day:state.time.day, text:"از آستانه مرگ بازگشت."}); });
    Simulation.log(state, "احیا", "مردگان به جهان بازگشتند.", list.map(p=>p.id));
    return {ok:true, msg: list.length ? "احیا انجام شد." : "فرد زنده‌ای برای احیا نبود / هدف فوت‌شده انتخاب کن."};
  },
  destiny(state, payload) {
    const list = this.targets(state, payload);
    list.forEach(p => { p.goals = payload.text || "مسیری تازه که خدا گشود"; p.luck = clamp(p.luck+20); p.emotions.hope = clamp(p.emotions.hope+25); });
    Simulation.log(state, "قدرت الهی", "سرنوشت پیچ تازه‌ای خورد.", list.map(p=>p.id));
    return {ok:true, msg:"سرنوشت تغییر کرد."};
  },
  create(state, payload) {
    const age = Number(payload.age || rnd(1,30));
    const p = makePerson({
      name: payload.name || pick([...NAMES_M, ...NAMES_F]),
      age,
      birthAge: age,
      birthDay: state.time.day,
      gender: payload.gender || pick(["مرد","زن"]),
      job: payload.job || pick(JOBS)
    });
    state.people.push(p);
    Simulation.log(state, "آفرینش", `${p.name} به فرمان تو زاده شد.`, [p.id]);
    return {ok:true, msg:`${p.name} آفریده شد.`};
  },
  time(state, payload) {
    const mode = payload.mode || "pause";
    if (mode === "pause") state.time.paused = true;
    if (mode === "normal") { state.time.paused = false; state.time.speed = 1; }
    if (mode === "fast") { state.time.paused = false; state.time.speed = 3; }
    if (mode === "rewind" && state.checkpoint) {
      const keepUi = state;
      Object.assign(state, state.checkpoint);
      toast("زمان به نقطه ذخیره الهی بازگشت.");
    }
    Simulation.log(state, "زمان", `زمان جهان: ${mode}`, []);
    return {ok:true, msg:"فرمان زمان اجرا شد."};
  },
  weather(state, payload) {
    state.world.weather = payload.text || "باران مطلوب";
    Simulation.log(state, "آب‌وهوا", `تو آب‌وهوا را به ${state.world.weather} بدل کردی.`, []);
    return {ok:true, msg:"آسمان فرمان برد."};
  },
  resources(state, payload) {
    const kind = payload.kind || "طلا";
    state.world.foodBonus = kind==="غذا" ? 3 : state.world.foodBonus;
    state.world.waterBonus = kind==="آب" ? 3 : state.world.waterBonus;
    this.targets(state, payload).forEach(p => { if (kind==="طلا") p.wealth += 50; });
    if (payload.scope==="world" && kind==="طلا") state.people.forEach(p => { if(p.alive) p.wealth += 20; });
    Simulation.log(state, "منابع", `منبع ${kind} پدید آمد.`, []);
    return {ok:true, msg:`${kind} آفریده شد.`};
  },
  laws(state, payload) {
    state.world.law = payload.text || "قانون تازه‌ای بر جهان نشست.";
    Simulation.log(state, "قوانین", state.world.law, []);
    return {ok:true, msg:"قوانین جهان عوض شد."};
  },
  disaster(state, payload) {
    const kind = payload.text || "زلزله";
    state.people.filter(p=>p.alive).forEach(p => {
      if (chance(.4)) p.health = clamp(p.health - rnd(10,35));
      p.emotions.fear = clamp(p.emotions.fear+15);
    });
    Simulation.log(state, "فاجعه", `${kind} جهان را لرزاند.`, []);
    return {ok:true, msg:`${kind} رخ داد.`};
  },
  seeThoughts(state, payload) {
    const list = this.targets(state, payload);
    const text = list.map(p => `${p.name}: ${p.thoughts} / نگرانی: ${p.worry}`).join("\n");
    return {ok:true, msg:text || "هدفی نیست."};
  },
  seeMemories(state, payload) {
    const list = this.targets(state, payload);
    const text = list.map(p => `${p.name}:\n` + p.memories.slice(-6).map(m=>`روز ${m.day}: ${m.text}`).join("\n")).join("\n\n");
    return {ok:true, msg:text || "خاطره‌ای نیست."};
  },
  hearPrayers(state, payload) {
    const ids = payload.ids || (payload.id?[payload.id]:[]);
    const list = state.prayers.filter(pr => !ids.length || ids.includes(pr.personId)).slice(0,8);
    return {ok:true, msg: list.map(pr => `${pr.name}: ${pr.text} [${pr.status}]`).join("\n") || "دعایی نیست."};
  },
  message(state, payload) {
    const list = this.targets(state, payload);
    const msg = payload.text || "من هستم. بشنو.";
    list.forEach(p => { p.thoughts = "پیام خدا: " + msg; p.faith = clamp(p.faith+10); p.speeches.push({day:state.time.day, text:msg, from:"خدا"}); });
    Simulation.log(state, "پیام الهی", msg, list.map(p=>p.id));
    return {ok:true, msg:"پیام در جان‌ها نشست."};
  },
  dream(state, payload) {
    const list = this.targets(state, payload);
    const d = payload.text || "در خواب نوری دید که راه را نشان داد.";
    list.forEach(p => { p.memories.push({day:state.time.day, text:"رؤیا: "+d}); p.emotions.hope = clamp(p.emotions.hope+10); });
    Simulation.log(state, "رؤیا", "نشانه‌ای در خواب فرستاده شد.", list.map(p=>p.id));
    return {ok:true, msg:"رؤیا فرستاده شد."};
  },
  wealth(state, payload) {
    const list = this.targets(state, payload);
    const n = Number(payload.value ?? 80);
    list.forEach(p => { p.wealth += n; p.income += 3; });
    Simulation.log(state, "ثروت", "برکت مالی نازل شد.", list.map(p=>p.id));
    return {ok:true, msg:"ثروت افزوده شد."};
  },
  knowledge(state, payload) {
    const list = this.targets(state, payload);
    list.forEach(p => { p.traits.intelligence = clamp(p.traits.intelligence+15); p.tech += 1; p.education = "عالی"; });
    Simulation.log(state, "دانش", "دانش الهی بخشیده شد.", list.map(p=>p.id));
    return {ok:true, msg:"دانش افزوده شد."};
  },
  bless(state, payload) {
    const list = payload.scope==="world" ? state.people : this.targets(state, payload);
    list.forEach(p => { p.luck = clamp(p.luck+25); p.emotions.hope = clamp(p.emotions.hope+12); });
    Simulation.log(state, "برکت", "خوش‌شانسی بر جهان نشست.", list.map(p=>p.id));
    return {ok:true, msg:"برکت جاری شد."};
  },
  punish(state, payload) {
    const list = this.targets(state, payload);
    list.forEach(p => { p.wealth = Math.max(0,p.wealth-40); p.emotions.fear = clamp(p.emotions.fear+20); p.health = clamp(p.health-10); });
    Simulation.log(state, "مجازات", "کیفر الهی فرود آمد.", list.map(p=>p.id));
    return {ok:true, msg:"مجازات اعمال شد."};
  },
  relations(state, payload) {
    const list = this.targets(state, payload);
    const delta = Number(payload.value ?? 20);
    list.forEach(p => p.relations.forEach(r => { r.trust = clamp((r.trust||40)+delta); r.love = clamp((r.love||40)+delta); }));
    Simulation.log(state, "روابط", "پیوندها دگرگون شد.", list.map(p=>p.id));
    return {ok:true, msg:"روابط تغییر کرد."};
  },
  civilization(state, payload) {
    const name = payload.text || "تمدن سپیده";
    const n = 4;
    for (let i=0;i<n;i++) {
      const p = makePerson({home:name, job:pick(JOBS)});
      state.people.push(p);
    }
    state.world.civilizations.push({name, day:state.time.day});
    Simulation.log(state, "تمدن", `تمدن ${name} با ${n} انسان پدید آمد.`, []);
    return {ok:true, msg:`تمدن ${name} زاده شد.`};
  },
  tech(state, payload) {
    const d = Number(payload.value ?? 1);
    const list = payload.scope==="world" ? state.people : this.targets(state, payload);
    list.forEach(p => p.tech = Math.max(0, p.tech + d));
    state.world.tech = Math.max(0, (state.world.tech||1)+ (payload.scope==="world"?d:0));
    Simulation.log(state, "فناوری", "سطح فناوری تغییر کرد.", []);
    return {ok:true, msg:"فناوری دگرگون شد."};
  },
  society(state, payload) {
    state.world.society = payload.text || "نظام تازه‌ای برپا شد.";
    Simulation.log(state, "جامعه", state.world.society, []);
    return {ok:true, msg:"قوانین اجتماعی عوض شد."};
  },
  rewrite(state, payload) {
    if (payload.eventId) state.events = state.events.filter(e => e.id !== payload.eventId);
    else if (state.events[0]) state.events[0].text += " — بازنویسی الهی.";
    Simulation.log(state, "بازنویسی", payload.text || "صفحه‌ای از تاریخ پاک یا بازنویسی شد.", []);
    return {ok:true, msg:"تاریخ لمس شد."};
  },
  command(state, payload) {
    const cmd = payload.text || "جهان لحظه‌ای سکوت کرد.";
    if (payload.scope === "world") {
      state.people.forEach(p => { if (p.alive) { p.activity = cmd; p.thoughts = cmd; }});
    } else {
      this.targets(state, payload).forEach(p => { p.activity = cmd; p.thoughts = cmd; });
    }
    Simulation.log(state, "فرمان مطلق", cmd, []);
    return {ok:true, msg:"فرمان اجرا شد."};
  }
};
