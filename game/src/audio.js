// audio.js — a pocket WebAudio synth: gunshot cracks, casing ticks,
// pickup chimes, a two-tone siren that follows the wanted level and a
// soft Ombak FM chord bed while driving. Nothing is sampled; every
// sound is an oscillator or a filtered noise burst, made on the spot.
// The context stays asleep until the player's first gesture, and the
// M key (handled in main.js) parks the whole rig at gain zero.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.sirenNodes = null;
    this.radioNodes = null;
    this.lastShotAt = 0;
  }

  wake() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch (err) { this.ctx = null; }
  }

  setMuted(on) {
    this.muted = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0 : 0.5, this.ctx.currentTime, 0.03);
  }

  // One filtered noise burst + a low thump: the crack every gun in
  // the bay shares, pitched per weapon class.
  shot(kind) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastShotAt < 0.03) return;
    this.lastShotAt = now;
    const dur = kind === "shotgun" ? 0.22 : kind === "smg" ? 0.09 : 0.13;
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.7);
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = kind === "shotgun" ? 900 : 2100;
    const gain = this.ctx.createGain(); gain.gain.value = kind === "shotgun" ? 0.5 : 0.3;
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start(now);
    const thump = this.ctx.createOscillator(); thump.type = "triangle";
    thump.frequency.setValueAtTime(kind === "shotgun" ? 120 : 160, now);
    thump.frequency.exponentialRampToValueAtTime(48, now + dur);
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.22, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + dur);
    thump.connect(tg); tg.connect(this.master);
    thump.start(now); thump.stop(now + dur + 0.02);
  }

  casingTick() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "square";
    osc.frequency.value = 2900 + Math.random() * 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);
    osc.connect(gain); gain.connect(this.master);
    osc.start(now); osc.stop(now + 0.06);
  }

  chime(base) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [0, 4, 7].forEach((step, i) => {
      const osc = this.ctx.createOscillator(); osc.type = "sine";
      osc.frequency.value = base * Math.pow(2, step / 12);
      const gain = this.ctx.createGain();
      const t = now + i * 0.07;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.34);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  pickup() { this.chime(660); }
  jobDone() { this.chime(523); }
  denied() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 140;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain); gain.connect(this.master);
    osc.start(now); osc.stop(now + 0.18);
  }

  // Two-tone siren: an oscillator whose frequency an LFO walks
  // between the SBPD's two notes. Level follows the chase, quietly.
  setSiren(on, level) {
    if (!this.ctx) return;
    if (on && !this.sirenNodes && !this.muted) {
      const osc = this.ctx.createOscillator(); osc.type = "triangle"; osc.frequency.value = 780;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.55;
      const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 130;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      const gain = this.ctx.createGain(); gain.gain.value = 0.0;
      gain.gain.setTargetAtTime(Math.min(0.05, 0.02 + level * 0.008), this.ctx.currentTime, 0.4);
      osc.connect(gain); gain.connect(this.master);
      osc.start(); lfo.start();
      this.sirenNodes = { osc, lfo, gain };
    } else if (!on && this.sirenNodes) {
      const nodes = this.sirenNodes; this.sirenNodes = null;
      nodes.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      setTimeout(() => { try { nodes.osc.stop(); nodes.lfo.stop(); } catch (e) { /* already gone */ } }, 600);
    }
  }

  // Ombak FM: a slow major-7th pad, detuned triangles through a
  // lowpass — radio warmth under the engine, never a melody.
  setRadio(on) {
    if (!this.ctx) return;
    if (on && !this.radioNodes && !this.muted) {
      const freqs = [196, 246.9, 293.7, 369.9];
      const gain = this.ctx.createGain(); gain.gain.value = 0.0;
      gain.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.8);
      const filter = this.ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 900;
      filter.connect(gain); gain.connect(this.master);
      const oscs = freqs.map((f, i) => {
        const o = this.ctx.createOscillator(); o.type = "triangle";
        o.frequency.value = f * (i % 2 ? 1.003 : 0.998);
        o.connect(filter); o.start();
        return o;
      });
      this.radioNodes = { oscs, gain };
    } else if (!on && this.radioNodes) {
      const nodes = this.radioNodes; this.radioNodes = null;
      nodes.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      setTimeout(() => nodes.oscs.forEach((o) => { try { o.stop(); } catch (e) { /* already gone */ } }), 900);
    }
  }
}
