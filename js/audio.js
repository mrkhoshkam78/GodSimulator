const SFX = {
  ctx: null,
  enabled: true,
  bgmOn: true,
  master: 0.7,
  bgmNodes: null,
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
      const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
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
  startBgm() {
    if (!this.bgmOn || this.bgmNodes) return;
    try {
      const ac = this.ensure();
      const master = ac.createGain();
      master.gain.value = 0.0001;
      master.connect(ac.destination);
      master.gain.exponentialRampToValueAtTime(0.045 * this.master, ac.currentTime + 2.5);

      const mk = (freq, type, vol) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        const f = ac.createBiquadFilter();
        o.type = type;
        o.frequency.value = freq;
        f.type = "lowpass";
        f.frequency.value = 600;
        g.gain.value = vol;
        o.connect(f); f.connect(g); g.connect(master);
        o.start();
        return { o, g, f };
      };

      const drone = mk(55, "sine", 0.55);
      const fifth = mk(82.5, "sine", 0.28);
      const high = mk(220, "triangle", 0.08);
      const lfo = ac.createOscillator();
      const lfoG = ac.createGain();
      lfo.frequency.value = 0.05;
      lfoG.gain.value = 12;
      lfo.connect(lfoG);
      lfoG.connect(high.o.frequency);
      lfo.start();

      this.bgmNodes = { master, drone, fifth, high, lfo };
    } catch (_) {}
  },
  stopBgm() {
    if (!this.bgmNodes) return;
    try {
      const { master, drone, fifth, high, lfo } = this.bgmNodes;
      const ac = this.ctx;
      master.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.8);
      setTimeout(() => {
        try { drone.o.stop(); fifth.o.stop(); high.o.stop(); lfo.stop(); } catch (_) {}
      }, 900);
    } catch (_) {}
    this.bgmNodes = null;
  },
  setBgm(on) {
    this.bgmOn = on;
    if (on) this.startBgm();
    else this.stopBgm();
  }
};
