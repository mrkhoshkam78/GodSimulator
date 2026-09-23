const SFX = {
  ctx: null,
  enabled: true,
  bgmOn: true,
  master: 0.72,
  bgmNodes: null,
  bgmTimer: null,
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  env(freq, dur, type = "sine", vol = 0.04, slide = 0) {
    if (!this.enabled) return;
    try {
      const ac = this.ensure();
      const o = ac.createOscillator();
      const g = ac.createGain();
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = Math.max(800, freq * 5);
      o.type = type;
      o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + dur);
      const v = vol * this.master;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(v, ac.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(f); f.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur + 0.03);
    } catch (_) {}
  },
  noiseClick(dur = 0.04, vol = 0.03) {
    if (!this.enabled) return;
    try {
      const ac = this.ensure();
      const n = ac.createBufferSource();
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      n.buffer = buf;
      const g = ac.createGain();
      const f = ac.createBiquadFilter();
      f.type = "highpass"; f.frequency.value = 1200;
      g.gain.setValueAtTime(vol * this.master, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      n.connect(f); f.connect(g); g.connect(ac.destination);
      n.start();
    } catch (_) {}
  },
  chord(freqs, dur = 0.3) {
    freqs.forEach((f, i) => setTimeout(() => this.env(f, dur, "sine", 0.024), i * 45));
  },
  click() {
    this.noiseClick(0.035, 0.028);
    this.env(880, 0.05, "triangle", 0.018);
  },
  begin() {
    this.chord([130.8, 196, 261.6, 329.6], 0.55);
    setTimeout(() => this.env(523.25, 0.35, "sine", 0.02), 180);
    this.startBgm();
  },
  prayer() { this.chord([261.6, 329.6, 392, 440], 0.4); },
  grant() { this.chord([329.6, 415.3, 523.25, 659.25], 0.42); },
  power() { this.env(164.8, 0.18, "triangle", 0.045); this.env(329.6, 0.28, "sine", 0.028, 60); },
  menu() { this.click(); },
  death() { this.env(82.4, 0.7, "sine", 0.032, -30); this.env(55, 0.85, "triangle", 0.018, -15); },
  forPower(id) {
    const map = {
      heal: () => this.chord([523.25, 659.25, 783.99], 0.4),
      revive: () => this.chord([130.8, 196, 261.6, 329.6], 0.55),
      disaster: () => this.env(55, 0.5, "sawtooth", 0.028, -20),
      punish: () => this.env(73.4, 0.35, "square", 0.022, -12),
      bless: () => this.chord([440, 554.4, 659.25], 0.4),
      weather: () => this.env(174.6, 0.4, "triangle", 0.028, 100),
      time: () => this.env(110, 0.35, "sine", 0.03, 180),
      create: () => this.chord([261.6, 329.6, 392, 523.25], 0.45),
      message: () => this.chord([329.6, 415.3], 0.28),
      dream: () => this.env(523.25, 0.55, "sine", 0.018, -90)
    };
    (map[id] || (() => this.power()))();
  },

  /* Interstellar-inspired organ pad (original synthesis — not copyrighted OST) */
  startBgm() {
    if (!this.bgmOn || this.bgmNodes) return;
    try {
      const ac = this.ensure();
      const master = ac.createGain();
      master.gain.value = 0.0001;
      master.connect(ac.destination);
      master.gain.linearRampToValueAtTime(0.055 * this.master, ac.currentTime + 3);

      const mk = (freq, type, vol, lp = 900) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        const f = ac.createBiquadFilter();
        o.type = type;
        o.frequency.value = freq;
        f.type = "lowpass";
        f.frequency.value = lp;
        f.Q.value = 0.7;
        g.gain.value = vol;
        o.connect(f); f.connect(g); g.connect(master);
        o.start();
        return { o, g, f };
      };

      // Deep organ foundation (Interstellar-style)
      const root = mk(55, "sine", 0.5, 400);          // A1
      const root2 = mk(110, "sine", 0.22, 500);        // A2
      const fifth = mk(82.41, "sine", 0.32, 450);      // E2
      const organ = mk(220, "triangle", 0.12, 1200);   // A3 soft
      const organ5 = mk(329.63, "triangle", 0.07, 1400); // E4

      // Slow LFO on upper voices (breathing space)
      const lfo = ac.createOscillator();
      const lfoG = ac.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.04;
      lfoG.gain.value = 8;
      lfo.connect(lfoG);
      lfoG.connect(organ.o.frequency);
      lfo.start();

      // Soft pulse swell every ~8s
      const pulse = ac.createOscillator();
      const pulseG = ac.createGain();
      pulse.frequency.value = 0.12;
      pulseG.gain.value = 0.04;
      pulse.connect(pulseG);
      pulseG.connect(organ5.g.gain);
      pulse.start();

      // Melodic motif loop (simple rising fourths — original pattern)
      const motif = [220, 293.66, 329.63, 392, 329.63, 293.66];
      let mi = 0;
      const playMotif = () => {
        if (!this.bgmNodes) return;
        try {
          const freq = motif[mi % motif.length];
          mi++;
          const o = ac.createOscillator();
          const g = ac.createGain();
          const f = ac.createBiquadFilter();
          o.type = "sine";
          o.frequency.value = freq;
          f.type = "lowpass";
          f.frequency.value = 1800;
          g.gain.setValueAtTime(0.0001, ac.currentTime);
          g.gain.linearRampToValueAtTime(0.035 * this.master, ac.currentTime + 0.8);
          g.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 4.5);
          o.connect(f); f.connect(g); g.connect(master);
          o.start();
          o.stop(ac.currentTime + 5);
        } catch (_) {}
      };
      playMotif();
      this.bgmTimer = setInterval(playMotif, 5200);

      this.bgmNodes = { master, root, root2, fifth, organ, organ5, lfo, pulse };
    } catch (_) {}
  },
  stopBgm() {
    if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
    if (!this.bgmNodes) return;
    try {
      const n = this.bgmNodes;
      const ac = this.ctx;
      n.master.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 1);
      setTimeout(() => {
        try {
          [n.root, n.root2, n.fifth, n.organ, n.organ5].forEach(x => x && x.o.stop());
          if (n.lfo) n.lfo.stop();
          if (n.pulse) n.pulse.stop();
        } catch (_) {}
      }, 1100);
    } catch (_) {}
    this.bgmNodes = null;
  },
  setBgm(on) {
    this.bgmOn = on;
    if (on) this.startBgm();
    else this.stopBgm();
  }
};
