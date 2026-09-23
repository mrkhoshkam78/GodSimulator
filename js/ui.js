const UI = {
  state: null,
  selectMode: false,
  selected: new Set(),
  openId: null,
  powersBuilt: false,
  activeView: "world",
  _mainScroll: 0,

  bind(state) {
    this.state = state;
    this.powersBuilt = false;
    const grid = document.getElementById("people-grid");
    if (grid) grid.classList.add("animate-in");
    this.renderAll(true);
    if (grid) setTimeout(() => grid.classList.remove("animate-in"), 500);
  },

  onSimTick() {
    this.stats();
    this.time();
    if (this.activeView === "world") this.softPatchCards();
    else if (this.activeView === "prayers") this.prayers();
    else if (this.activeView === "events") this.events();
    else if (this.activeView === "missions" || this.activeView === "stats") this.missions();
  },

  softPatchCards() {
    const el = document.getElementById("people-grid");
    if (!el || !el.children.length) {
      this.grid(true);
      return;
    }
    el.querySelectorAll(".card").forEach(card => {
      const p = this.state.people.find(x => x.id === card.dataset.id);
      if (!p) return;
      const em = dominantEmotion(p.emotions);
      const meta = card.querySelector(".meta");
      if (meta) meta.textContent = `${p.id.slice(-6)} · ${p.age} سال · ${p.job}`;
      const chip = card.querySelector(".emotion-chip");
      if (chip) {
        chip.style.color = emotionColor(em);
        chip.innerHTML = `${icon(p.alive ? "alive" : "dead")} ${EMOTION_FA[em]} · ${p.alive ? "زنده" : "فوت‌شده"}`;
      }
      const body = card.querySelector(".card-body");
      if (body) body.textContent = `${p.activity} — ${p.home}. ایمان ${p.faith}، ثروت ${p.wealth}.`;
      card.classList.toggle("dead", !p.alive);
    });
  },

  renderAll(forcePowers) {
    this.stats();
    this.time();
    this.grid(true);
    this.prayers();
    if (forcePowers || !this.powersBuilt) {
      this.powers();
      this.powersBuilt = true;
    }
    this.events();
    this.missions();
  },

  time() {
    const t = this.state.time;
    document.getElementById("time-display").textContent = `روز ${t.day} — سال ${t.year} — ${this.state.world.weather}`;
    document.querySelectorAll(".time-controls button[data-speed]").forEach(b => {
      b.classList.toggle("active", Number(b.dataset.speed) === (t.paused?0:t.speed));
    });
  },

  stats() {
    const alive = this.state.people.filter(p=>p.alive).length;
    const pending = this.state.prayers.filter(p=>p.status==="در انتظار").length;
    const w = this.state.world;
    document.getElementById("world-stats").innerHTML = `
      <span class="stat-pill">جان <b>${alive}</b></span>
      <span class="stat-pill faith">ایمان <b>${Math.round(w.faith||50)}</b></span>
      <span class="stat-pill awe">هیبت <b>${Math.round(w.awe||40)}</b></span>
      <span class="stat-pill power">قدرت <b>∞</b></span>
      <span class="stat-pill">دعا <b>${pending}</b></span>`;
    const badge = document.getElementById("prayer-badge");
    if (badge) badge.textContent = pending;
  },

  filters() {
    const q = document.getElementById("search").value.trim();
    const life = document.getElementById("filter-life").value;
    const em = document.getElementById("filter-emotion").value;
    const job = document.getElementById("filter-job").value;
    const sort = document.getElementById("sort-by").value;
    let list = [...this.state.people];
    if (q) list = list.filter(p => p.name.includes(q) || p.id.includes(q));
    if (life==="alive") list = list.filter(p=>p.alive);
    if (life==="dead") list = list.filter(p=>!p.alive);
    if (em!=="all") list = list.filter(p => dominantEmotion(p.emotions)===em);
    if (job!=="all") list = list.filter(p => p.job===job);
    list.sort((a,b) => {
      if (sort==="age") return a.age-b.age;
      if (sort==="faith") return b.faith-a.faith;
      if (sort==="wealth") return b.wealth-a.wealth;
      return a.name.localeCompare(b.name,"fa");
    });
    return list;
  },

  grid(preserveScroll) {
    const el = document.getElementById("people-grid");
    if (!el) return;
    const main = document.querySelector(".main");
    const scrollY = preserveScroll && main ? main.scrollTop : 0;
    const jobs = [...new Set(this.state.people.map(p=>p.job))];
    const fj = document.getElementById("filter-job");
    if (fj && fj.options.length<=1) jobs.forEach(j => { const o=document.createElement("option"); o.value=j; o.textContent=j; fj.appendChild(o); });
    const fe = document.getElementById("filter-emotion");
    if (fe && fe.options.length<=1) EMOTIONS.forEach(k => { const o=document.createElement("option"); o.value=k; o.textContent=EMOTION_FA[k]; fe.appendChild(o); });

    el.innerHTML = this.filters().map(p => {
      const em = dominantEmotion(p.emotions);
      const open = this.openId === p.id;
      const sel = this.selected.has(p.id);
      return `<article class="card ${p.alive?"":"dead"} ${sel?"selected":""}" data-id="${p.id}">
        <div class="card-head">
          <div class="avatar" style="--av:${emotionColor(em)}">${avatarSVG(p)}</div>
          <div>
            <h3>${p.name}</h3>
            <div class="meta">${p.id.slice(-6)} · ${p.age} سال · ${p.job}</div>
            <span class="emotion-chip" style="color:${emotionColor(em)}">${icon(p.alive?"alive":"dead")} ${EMOTION_FA[em]} · ${p.alive?"زنده":"فوت‌شده"}</span>
          </div>
        </div>
        <div class="card-body">${p.activity} — ${p.home}. ایمان ${p.faith}، ثروت ${p.wealth}.</div>
        <div class="card-actions">
          <button class="toggle">${open?"بستن پرونده":"گشودن پرونده"}</button>
          ${this.selectMode?`<button class="pick">${sel?"حذف از انتخاب":"انتخاب"}</button>`:""}
        </div>
        ${open?this.dossier(p):""}
      </article>`;
    }).join("");
    if (preserveScroll && main) {
      requestAnimationFrame(() => { main.scrollTop = scrollY; });
    }
  },

  dossier(p) {
    let speech = p._lastSpeech;
    if (!speech || p._lastSpeechDay !== this.state.time.day) {
      speech = threeLineSpeech(p, this.state);
      p._lastSpeech = speech;
      p._lastSpeechDay = this.state.time.day;
      p.speeches.push({day:this.state.time.day, text:speech});
      if (p.speeches.length>12) p.speeches.shift();
    }
    const bars = (obj, dict) => Object.keys(dict).map(k => {
      const v = obj[k]||0;
      return `<div class="bar"><span>${dict[k]}</span><i><span style="width:${v}%"></span></i><span>${v}</span></div>`;
    }).join("");
    return `<div class="dossier">
      <h4>مشخصات</h4>
      <p>${p.gender} · تحصیلات ${p.education} · ${p.married?"متأهل":"مجرد"} · ${p.home}<br/>دارایی ${p.wealth} · درآمد ${p.income} · سلامت ${p.health}</p>
      <h4>شخصیت و ذهن</h4>
      <div class="bars">${bars(p.traits, TRAIT_FA)}</div>
      <p>قوس: ${p.storyArc||"—"} · هدف بلند: ${p.longGoal||p.goals}<br/>ترس‌ها: ${p.fears.join("، ")} · ارزش‌ها: ${p.values.join("، ")}<br/>باور: ${p.beliefs} · هدف کوتاه: ${p.goals} · ضعف: ${p.weakness}${p.grudge?`<br/>کینه: ${p.grudge}`:""}</p>
      <h4>احساسات</h4>
      <div class="bars">${bars(p.emotions, EMOTION_FA)}</div>
      <h4>روابط</h4>
      <p>${p.relations.length? p.relations.map(r=>`${r.type} ${r.name} (اعتماد ${r.trust||0})`).join("، "):"هنوز پیوندی ثبت نشده."}</p>
      <h4>خاطرات</h4>
      <p>${p.memories.slice(-5).map(m=>`روز ${m.day}: ${m.text}`).join("<br/>")}</p>
      <h4>وضعیت فعلی</h4>
      <p>انرژی ${p.energy} · گرسنگی ${p.hunger} · تشنگی ${p.thirst}<br/>نگرانی: ${p.worry} · برنامه: ${p.nextPlan}<br/>افکار: ${p.thoughts}</p>
      <div class="speech">${speech.replace(/\n/g,"<br/>")}</div>
      <h4>تاریخچه مکالمه</h4>
      <p>${p.speeches.slice(-4).map(s=>`روز ${s.day}: ${s.text.split("\n")[0]}`).join("<br/>")}</p>
    </div>`;
  },

  prayers() {
    const box = document.getElementById("prayer-chamber");
    box.innerHTML = this.state.prayers.slice(0,40).map(pr => `
      <article class="prayer">
        <h4>${icon("prayer")} ${pr.name} — ${pr.topic}</h4>
        <p>${pr.text}</p>
        <div class="meta">روز ${pr.day} · شدت ${pr.intensity} · احساس ${EMOTION_FA[pr.emotion]||pr.emotion} · ${pr.status}</div>
        ${pr.status==="در انتظار"?`<div class="prayer-acts">
          <button data-pr="${pr.id}" data-act="full">اجابت کامل</button>
          <button data-pr="${pr.id}" data-act="partial">اجابت جزئی</button>
          <button data-pr="${pr.id}" data-act="sign">نشانه / الهام</button>
          <button data-pr="${pr.id}" data-act="deny">عدم اجابت</button>
          <button data-pr="${pr.id}" data-act="delay">به‌تعویق</button>
        </div>`:""}
      </article>`).join("") || "<p class=\"mission\">هیچ دعایی در عرش نیست. زمان را از توقف خارج کن تا زمینیان سخن بگویند.</p>";
  },

  powers() {
    document.getElementById("powers-menu").innerHTML = POWER_CATS.map(cat => `
      <div class="power-cat"><h3>${cat.title}</h3>
        <div class="power-grid">${cat.powers.map(p => `
          <div class="power-card" data-power="${p.id}">${icon("power")}<strong>${p.name}</strong><small>${p.desc}</small></div>`).join("")}
        </div>
      </div>`).join("");
  },

  events() {
    const f = document.getElementById("event-filter");
    const types = [...new Set(this.state.events.map(e=>e.type))];
    if (f.options.length<=1) types.forEach(t=>{const o=document.createElement("option");o.value=t;o.textContent=t;f.appendChild(o);});
    const cur = f.value;
    const list = this.state.events.filter(e => cur==="all"||e.type===cur);
    document.getElementById("event-log").innerHTML = list.slice(0,80).map(e => `
      <div class="event"><strong>${e.type}</strong> · روز ${e.day}<div>${e.text}</div></div>`).join("") || "<p>تاریخی هنوز نوشته نشده.</p>";
  },

  missions() {
    const alive = this.state.people.filter(p=>p.alive).length;
    const answered = this.state.prayers.filter(p=>p.status!=="در انتظار").length;
    const faith = Math.round(this.state.world.faith||50);
    const dread = Math.round(this.state.world.dread||20);
    document.getElementById("missions").innerHTML = `
      <div class="mission"><h3>نگهبان جان‌ها</h3><p>جمعیت زنده را بالای ۱۵ نگاه دار. اکنون: ${alive}</p></div>
      <div class="mission"><h3>شنونده عرش</h3><p>به ۱۰ دعا پاسخ بده. انجام‌شده: ${answered}</p></div>
      <div class="mission"><h3>ایمان جمعی</h3><p>ایمان جهان را بالای ۶۰ نگه دار. اکنون: ${faith}</p></div>
      <div class="mission"><h3>مهار هراس</h3><p>هراس جمعی را زیر ۴۰ نگه دار. اکنون: ${dread}</p></div>
      <div class="mission"><h3>معمار تمدن</h3><p>یک تمدن بیافرین. تعداد: ${this.state.world.civilizations.length}</p></div>
      <div class="mission"><h3>زمان‌دان</h3><p>جهان را تا سال ۳ پیش ببر. سال فعلی: ${this.state.time.year}</p></div>`;
    const ages = this.state.people.filter(p=>p.alive).map(p=>p.age);
    const avg = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0)/ages.length) : 0;
    const panel = document.getElementById("stats-panel");
    if (panel) panel.innerHTML = `
      <div class="mission"><h3>تقویم</h3><p>روز ${this.state.time.day} از سال ${this.state.time.year} · هر سال ${DAYS_PER_YEAR} روز · هر روز ~۱۲ ثانیه واقعی</p></div>
      <div class="mission"><h3>حال جهان</h3><p>ایمان ${faith} · هیبت ${Math.round(this.state.world.awe||40)} · هراس ${dread} · نیروی الهی ${Math.round(this.state.world.divinePower??100)}</p></div>
      <div class="mission"><h3>جمعیت</h3><p>زنده ${alive} از ${this.state.people.length} · میانگین سن ${avg} · دعاهای باز ${this.state.prayers.filter(p=>p.status==="در انتظار").length}</p></div>
      <div class="mission"><h3>اقلیم و قانون</h3><p>${this.state.world.weather} · ${this.state.world.law}</p></div>`;
  },

  modal(html) {
    document.getElementById("modal-panel").innerHTML = html + `<p style="margin-top:1rem"><button class="mini" id="modal-close">بستن</button></p>`;
    document.getElementById("modal").classList.remove("hidden");
  },
  closeModal() { document.getElementById("modal").classList.add("hidden"); },

  fieldHtml(f) {
    if (f.type === "select") {
      return `<div class="form-row"><label>${f.label}</label><select id="pw-${f.id}">${
        f.options.map(o=>`<option value="${o.value}">${o.label}</option>`).join("")
      }</select></div>`;
    }
    if (f.type === "range") {
      return `<div class="form-row"><label>${f.label}: <b id="pw-${f.id}-out">${f.value}</b></label>
        <input id="pw-${f.id}" type="range" min="${f.min}" max="${f.max}" value="${f.value}"></div>`;
    }
    if (f.type === "number") {
      return `<div class="form-row"><label>${f.label}</label><input id="pw-${f.id}" type="number" value="${f.value??0}"></div>`;
    }
    if (f.type === "text") {
      return `<div class="form-row"><label>${f.label}</label><textarea id="pw-${f.id}" rows="3" placeholder="${f.placeholder||""}"></textarea></div>`;
    }
    return `<div class="form-row"><label>${f.label}</label><input id="pw-${f.id}" type="text" placeholder="${f.placeholder||""}"></div>`;
  },

  personContextHtml(p) {
    if (!p) return "";
    const em = dominantEmotion(p.emotions);
    return `<div class="person-context">
      <div class="pc-av">${typeof avatarSVG==="function"?avatarSVG(p):""}</div>
      <div>
        <strong>${p.name}</strong>
        <div class="meta">${p.age} سال · ${p.job} · ${p.storyArc||"—"} · ${EMOTION_FA[em]}</div>
        <div class="meta">ایمان ${p.faith} · سلامت ${p.health} · هدف: ${p.longGoal||p.goals}</div>
        <div class="meta">نگرانی: ${p.worry}${p.grudge?` · کینه از ${p.grudge}`:""}</div>
      </div>
    </div>`;
  },

  currentOf(p, powerId, key) {
    if (!p) return 50;
    if (powerId === "emotion") return p.emotions?.[key || "hope"] ?? 50;
    if (powerId === "personality") return p.traits?.[key || "courage"] ?? 50;
    if (powerId === "wealth") return Math.min(200, p.wealth ?? 40);
    if (powerId === "lifespan") return Math.max(1, (p.lifespan || 80) - (p.age || 30));
    if (powerId === "relations") return 20;
    if (powerId === "tech") return p.tech ?? 1;
    return 50;
  },

  syncPowerIntensity(powerId) {
    const id = document.getElementById("pw-id")?.value;
    const p = this.state.people.find(x => x.id === id);
    const key = document.getElementById("pw-key")?.value;
    const valEl = document.getElementById("pw-value");
    if (!valEl || !p) return;
    const cur = this.currentOf(p, powerId, key);
    valEl.value = cur;
    const out = document.getElementById("pw-value-out");
    if (out) out.textContent = cur;
    const hint = document.getElementById("pw-intensity-hint");
    if (hint) {
      const label = powerId === "emotion" ? (EMOTION_FA[key] || key)
        : powerId === "personality" ? (TRAIT_FA[key] || key) : "مقدار";
      hint.textContent = `اکنون ${p.name}: ${label} = ${cur} — شدت را نسبت به وضعیت فعلی‌اش تنظیم کن.`;
    }
  },

  powerModal(powerId) {
    const meta = POWER_CATS.flatMap(c=>c.powers).find(p=>p.id===powerId);
    const cfg = POWER_UI[powerId] || {scope:["one"], target:true, fields:[]};
    const pool = this.state.people.filter(p => cfg.target==="dead" ? !p.alive : true);
    const people = pool.map(p=>`<option value="${p.id}">${p.name} · ${p.gender} · ${p.alive?"زنده":"آرام‌گرفته"} · ایمان ${p.faith}</option>`).join("");
    const scopeLabels = {one:"یک انسان", selected:"برگزیدگان", world:"تمام جهان"};
    const scopes = (cfg.scope||["one"]).map(s=>`<option value="${s}">${scopeLabels[s]}</option>`).join("");
    const showTarget = cfg.target && (cfg.scope||[]).some(s=>s!=="world");
    const first = pool[0];
    const needsIntensity = (cfg.fields||[]).some(f => f.id === "value");
    this.modal(`
      <h2>${icon("power")} ${meta.name}</h2>
      <p class="meta">${meta.desc}</p>
      <div class="cost-chip">قدرت خدا نامحدود است · بدون محدودیت نیرو</div>
      <div id="pw-context">${showTarget && first ? this.personContextHtml(first) : ""}</div>
      ${needsIntensity ? `<p class="meta" id="pw-intensity-hint">شدت بر اساس وضعیت فعلی فرد تنظیم می‌شود.</p>` : ""}
      ${cfg.scope && cfg.scope.length>1 ? `<div class="form-row"><label>دامنه اثر</label><select id="pw-scope">${scopes}</select></div>` : `<input type="hidden" id="pw-scope" value="${cfg.scope[0]}">`}
      ${showTarget ? `<div class="form-row"><label>هدف</label><select id="pw-id">${people || "<option value=''>کسی در دسترس نیست</option>"}</select></div>` : `<input type="hidden" id="pw-id" value="">`}
      ${(cfg.fields||[]).map(f=>this.fieldHtml(f)).join("")}
      <button class="btn-divine" id="pw-run">اجرای ${meta.name}</button>`);
    const sync = () => this.syncPowerIntensity(powerId);
    const idSel = document.getElementById("pw-id");
    if (idSel) idSel.onchange = () => {
      const p = this.state.people.find(x => x.id === idSel.value);
      const box = document.getElementById("pw-context");
      if (box) box.innerHTML = this.personContextHtml(p);
      sync();
    };
    const keySel = document.getElementById("pw-key");
    if (keySel) keySel.onchange = sync;
    (cfg.fields||[]).forEach(f => {
      if (f.type==="range") {
        const el = document.getElementById("pw-"+f.id);
        if (el) el.oninput = () => {
          const o = document.getElementById("pw-"+f.id+"-out");
          if (o) o.textContent = el.value;
        };
      }
    });
    sync();
    document.getElementById("pw-run").onclick = () => {
      const val = id => document.getElementById(id)?.value;
      const scopeSel = val("pw-scope") || cfg.scope[0];
      const payload = {
        scope: scopeSel === "world" ? "world" : "one",
        id: val("pw-id"),
        ids: scopeSel === "selected" ? [...this.selected] : undefined,
        key: val("pw-key"),
        value: val("pw-value") ?? val("pw-val"),
        text: val("pw-text"),
        mode: val("pw-mode") || val("pw-key"),
        kind: val("pw-kind") || val("pw-text"),
        name: val("pw-name"),
        gender: val("pw-gender"),
        age: val("pw-age"),
        job: val("pw-job")
      };
      const res = Powers.apply(this.state, powerId, payload);
      if (typeof SFX !== "undefined") SFX.forPower(powerId);
      toast(res.msg.split("\n")[0]);
      if (res.msg.includes("\n")) this.modal(`<h2>نتیجهٔ ${meta.name}</h2><p style="white-space:pre-wrap">${res.msg}</p>`);
      else this.closeModal();
      this.stats();
      this.softPatchCards();
    };
  }
};
