const SFX = {
  ctx: null,
  enabled: true,
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext||window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type="sine", vol=0.05) {
    if (!this.enabled) return;
    try {
      const ac = this.ensure();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur);
    } catch (_) {}
  },
  chord(freqs, dur=0.35) { freqs.forEach((f,i)=> setTimeout(()=>this.tone(f, dur, "sine", 0.03), i*40)); },
  begin() { this.chord([196,247,311,392], 0.55); },
  prayer() { this.chord([330,415,523], 0.4); },
  grant() { this.chord([392,494,587], 0.45); },
  power() { this.tone(180, 0.12, "triangle", 0.06); this.tone(360, 0.22, "sine", 0.04); },
  menu() { this.tone(240, 0.08, "sine", 0.03); },
  death() { this.tone(110, 0.5, "sine", 0.04); }
};
