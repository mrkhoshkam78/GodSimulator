const SFX = {
  ctx: null,
  enabled: true,
  master: 0.72,
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext||window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  env(freq, dur, type="sine", vol=0.045, slide=0) {
    if (!this.enabled) return;
    try {
      const ac = this.ensure();
      const o = ac.createOscillator();
      const g = ac.createGain();
      const f = ac.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = Math.max(600, freq * 4);
      o.type = type;
      o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq+slide), ac.currentTime + dur);
      const v = vol * this.master;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(v, ac.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(f); f.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur + 0.02);
    } catch (_) {}
  },
  chord(freqs, dur=0.32) {
    freqs.forEach((f,i)=> setTimeout(()=>this.env(f, dur, "sine", 0.028), i*55));
  },
  begin() { this.chord([196,247,311,392,523], 0.55); setTimeout(()=>this.env(784,.25,"sine",0.02),200); },
  prayer() { this.chord([262,330,392,440], 0.42); },
  grant() { this.chord([392,494,587,784], 0.45); setTimeout(()=>this.env(880,.2,"sine",0.018),120); },
  power() { this.env(196, 0.2, "triangle", 0.055); this.env(392, 0.32, "sine", 0.032, 90); },
  menu() { this.env(240, 0.08, "sine", 0.022); this.env(320, 0.06, "sine", 0.012); },
  death() { this.env(98, 0.75, "sine", 0.038, -45); this.env(73, 0.9, "triangle", 0.02, -20); },
  forPower(id) {
    const map = {
      heal:()=>this.chord([523,659,784],.4),
      revive:()=>this.chord([196,247,330,392],.55),
      disaster:()=>this.env(70,.45,"sawtooth",.03,-20),
      punish:()=>this.env(90,.35,"square",.025,-15),
      bless:()=>this.chord([440,554,659],.4),
      weather:()=>this.env(180,.4,"triangle",.03,120),
      time:()=>this.env(140,.3,"sine",.03,200),
      create:()=>this.chord([261,329,392,523],.45),
      message:()=>this.chord([330,415],.3),
      dream:()=>this.env(520,.5,"sine",.02,-80)
    };
    (map[id] || (()=>this.power()))();
  }
};
