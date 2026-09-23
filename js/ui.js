const UI = {
  state: null,
  selectMode: false,
  selected: new Set(),
  openId: null,

  bind(state) { this.state = state; this.renderAll(); },

  renderAll() {
    this.stats();
    this.grid();
    this.prayers();
    this.powers();
    this.events();
    this.missions();
    this.time();
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
    document.getElementById("world-stats").innerHTML = `
      <span>جمعیت زنده: <b>${alive}</b></span>
      <span>کل انسان‌ها: <b>${this.state.people.length}</b></span>
      <span>دعاها: <b>${pending}</b></span>
      <span>تمدن: <b>${this.state.world.civilizations.length}</b></span>`;
    document.getElementById("prayer-badge").textContent = pending;
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

  grid() {
    const el = document.getElementById("people-grid");
    const jobs = [...new Set(this.state.people.map(p=>p.job))];
    const fj = document.getElementById("filter-job");
    if (fj.options.length<=1) jobs.forEach(j => { const o=document.createElement("option"); o.value=j; o.textContent=j; fj.appendChild(o); });
    const fe = document.getElementById("filter-emotion");
    if (fe.options.length<=1) EMOTIONS.forEach(k => { const o=document.createElement("option"); o.value=k; o.textContent=EMOTION_FA[k]; fe.appendChild(o); });

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
  },

  dossier(p) {
    const speech = threeLineSpeech(p, this.state);
    p.speeches.push({day:this.state.time.day, text:speech});
    if (p.speeches.length>12) p.speeches.shift();
    const bars = (obj, dict) => Object.keys(dict).map(k => {
      const v = obj[k]||0;
      return `<div class="bar"><span>${dict[k]}</span><i><span style="width:${v}%"></span></i><span>${v}</span></div>`;
    }).join("");
    return `<div class="dossier">
      <h4>مشخصات</h4>
      <p>${p.gender} · تحصیلات ${p.education} · ${p.married?"متأهل":"مجرد"} · ${p.home}<br/>دارایی ${p.wealth} · درآمد ${p.income} · سلامت ${p.health}</p>
      <h4>شخصیت و ذهن</h4>
      <div class="bars">${bars(p.traits, TRAIT_FA)}</div>
      <p>ترس‌ها: ${p.fears.join("، ")} · ارزش‌ها: ${p.values.join("، ")}<br/>باور: ${p.beliefs} · هدف: ${p.goals} · ضعف: ${p.weakness}</p>
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
    document.getElementById("missions").innerHTML = `
      <div class="mission"><h3>نگهبان جان‌ها</h3><p>جمعیت زنده را بالای ۱۵ نگاه دار. اکنون: ${alive}</p></div>
      <div class="mission"><h3>شنونده عرش</h3><p>به ۱۰ دعا پاسخ بده. انجام‌شده: ${answered}</p></div>
      <div class="mission"><h3>معمار تمدن</h3><p>یک تمدن بیافرین. تعداد: ${this.state.world.civilizations.length}</p></div>
      <div class="mission"><h3>زمان‌دان</h3><p>جهان را تا سال ۳ پیش ببر. سال فعلی: ${this.state.time.year}</p></div>`;
    const ages = this.state.people.filter(p=>p.alive).map(p=>p.age);
    const avg = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0)/ages.length) : 0;
    const panel = document.getElementById("stats-panel");
    if (panel) panel.innerHTML = `
      <div class="mission"><h3>تقویم</h3><p>روز ${this.state.time.day} از سال ${this.state.time.year} · هر سال ${DAYS_PER_YEAR} روز · هر روز ۳۰ ثانیه واقعی</p></div>
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

  powerModal(powerId) {
    const meta = POWER_CATS.flatMap(c=>c.powers).find(p=>p.id===powerId);
    const cfg = POWER_UI[powerId] || {scope:["one"], target:true, fields:[]};
    const pool = this.state.people.filter(p => cfg.target==="dead" ? !p.alive : true);
    const people = pool.map(p=>`<option value="${p.id}">${p.name} · ${p.gender} · ${p.alive?"زنده":"آرام‌گرفته"}</option>`).join("");
    const scopeLabels = {one:"یک انسان", selected:"برگزیدگان", world:"تمام جهان"};
    const scopes = (cfg.scope||["one"]).map(s=>`<option value="${s}">${scopeLabels[s]}</option>`).join("");
    const showTarget = cfg.target && (cfg.scope||[]).some(s=>s!=="world");
    this.modal(`
      <h2>${icon("power")} ${meta.name}</h2>
      <p class="meta">${meta.desc}</p>
      ${cfg.scope && cfg.scope.length>1 ? `<div class="form-row"><label>دامنه اثر</label><select id="pw-scope">${scopes}</select></div>` : `<input type="hidden" id="pw-scope" value="${cfg.scope[0]}">`}
      ${showTarget ? `<div class="form-row"><label>هدف</label><select id="pw-id">${people || "<option value=''>کسی در دسترس نیست</option>"}</select></div>` : `<input type="hidden" id="pw-id" value="">`}
      ${(cfg.fields||[]).map(f=>this.fieldHtml(f)).join("")}
      <button class="btn-divine" id="pw-run">اجرای ${meta.name}</button>`);
    (cfg.fields||[]).forEach(f => {
      if (f.type==="range") {
        const el = document.getElementById("pw-"+f.id);
        el.oninput = () => document.getElementById("pw-"+f.id+"-out").textContent = el.value;
      }
    });
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
      this.renderAll();
    };
  }
};
