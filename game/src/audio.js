// audio.js — all sound is synthesised with WebAudio: engine, sirens, shots,
// impacts, pickups and a small generative radio loop. No audio files at all.

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = 0;
    this.note = 0;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Engine: a sawtooth whose pitch follows the car's speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = "lowpass"; engineFilter.frequency.value = 500;
    this.engineOsc.connect(engineFilter); engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Siren: a slow LFO sweeping a triangle wave, audible only when wanted.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = "triangle"; this.sirenOsc.frequency.value = 800;
    this.sirenGain = this.ctx.createGain(); this.sirenGain.gain.value = 0;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.6;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 180;
    lfo.connect(lfoGain); lfoGain.connect(this.sirenOsc.frequency); lfo.start();
    this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  setEngine(on, speedRatio, rpm) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on && !this.muted ? 0.05 + speedRatio * 0.05 : 0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + rpm * 130, t, 0.05);
  }

  setSiren(level) {
    if (!this.ctx) return;
    this.sirenGain.gain.setTargetAtTime(this.muted ? 0 : level * 0.018, this.ctx.currentTime, 0.3);
  }

  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }

  shoot(weaponId) {
    if (weaponId === "shotgun") { this.noise(0.22, 0.5, 500); this.blip(120, 0.15, "sawtooth", 0.2, 40); }
    else if (weaponId === "smg") { this.noise(0.06, 0.25, 1800); }
    else if (weaponId === "pistol") { this.noise(0.09, 0.35, 1400); }
    else { this.noise(0.05, 0.15, 700); }
  }

  hit() { this.noise(0.08, 0.2, 300); }
  crash(strength) { this.noise(0.25, Math.min(0.5, 0.15 + strength * 0.3), 260); this.blip(70, 0.2, "sine", 0.25, 35); }
  pickup() { this.blip(660, 0.09, "square", 0.1); setTimeout(() => this.blip(990, 0.12, "square", 0.1), 70); }
  cash() { this.blip(880, 0.08, "triangle", 0.14); setTimeout(() => this.blip(1320, 0.14, "triangle", 0.14), 80); }
  stageDone() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.12, "triangle", 0.12), i * 90)); }
  wasted() { this.blip(220, 0.7, "sawtooth", 0.16, 55); }

  // A tiny generative island-pop loop: pentatonic plucks over a soft bass.
  music(dt, playing) {
    if (!this.ctx || this.muted || !playing) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.24;
    const scale = [262, 294, 330, 392, 440, 523, 587, 659];
    const pattern = [0, 2, 4, 3, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 3, 2];
    const f = scale[pattern[this.note % pattern.length] % scale.length];
    this.blip(f, 0.2, "triangle", 0.045);
    if (this.note % 8 === 0) this.blip(131, 0.5, "sine", 0.07);
    this.note++;
  }
}
