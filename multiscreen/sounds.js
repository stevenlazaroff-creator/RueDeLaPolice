// ─── CASERNE 10 SOUND EFFECTS ───
// Procedural audio using Web Audio API

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.activeNodes = [];
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  fadeOutAndStop(duration = 2) {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + duration);
    setTimeout(() => this.stopAll(), duration * 1000 + 100);
  }

  stopAll() {
    this.activeNodes.forEach(node => {
      try { node.stop(); } catch(e) {}
      try { node.disconnect(); } catch(e) {}
    });
    this.activeNodes = [];
    this.masterGain = null;
  }

  _createNoise(length, type) {
    const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') { last = (last + 0.05 * w) / 1.05; d[i] = last * 2.5; }
      else d[i] = w;
    }
    return buf;
  }

  // ─── BUSY STREET: BUSES, CARS, PEDESTRIANS ───
  playTraffic(duration = 30, fadeIn = 3, fadeOut = 3) {
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const sr = ctx.sampleRate;
    const len = duration * sr;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.4, now + fadeIn);
    master.gain.setValueAtTime(0.4, now + duration - fadeOut);
    master.gain.linearRampToValueAtTime(0, now + duration);
    master.connect(ctx.destination);
    this.masterGain = master;

    // Layer 1: Deep rumble (buses, heavy traffic)
    const rumble = ctx.createBufferSource();
    rumble.buffer = this._createNoise(len, 'brown');
    const rumbleLPF = ctx.createBiquadFilter();
    rumbleLPF.type = 'lowpass'; rumbleLPF.frequency.value = 150;
    const rumbleG = ctx.createGain(); rumbleG.gain.value = 0.9;
    rumble.connect(rumbleLPF).connect(rumbleG).connect(master);
    rumble.start(now); rumble.stop(now + duration);
    this.activeNodes.push(rumble);

    // Layer 2: Mid traffic wash with passing swells
    const washBuf = ctx.createBuffer(1, len, sr);
    const wd = washBuf.getChannelData(0);
    let wl = 0;
    for (let i = 0; i < len; i++) {
      wl = (wl + 0.04 * (Math.random() * 2 - 1)) / 1.04;
      const swell = 0.3 + 0.7 * Math.pow(Math.sin(i / (sr * (2 + Math.random() * 2))), 2);
      wd[i] = wl * 2 * swell;
    }
    const wash = ctx.createBufferSource(); wash.buffer = washBuf;
    const washBPF = ctx.createBiquadFilter();
    washBPF.type = 'bandpass'; washBPF.frequency.value = 500; washBPF.Q.value = 0.4;
    const washG = ctx.createGain(); washG.gain.value = 0.35;
    wash.connect(washBPF).connect(washG).connect(master);
    wash.start(now); wash.stop(now + duration);
    this.activeNodes.push(wash);

    // Layer 3: Tire hiss on pavement
    const hiss = ctx.createBufferSource();
    hiss.buffer = this._createNoise(len, 'white');
    const hissHPF = ctx.createBiquadFilter();
    hissHPF.type = 'highpass'; hissHPF.frequency.value = 4000;
    const hissG = ctx.createGain(); hissG.gain.value = 0.035;
    hiss.connect(hissHPF).connect(hissG).connect(master);
    hiss.start(now); hiss.stop(now + duration);
    this.activeNodes.push(hiss);

    // Layer 4: Bus engine idling (low oscillation)
    for (let b = 0; b < 2; b++) {
      const busStart = now + 2 + Math.random() * (duration * 0.4);
      const busDur = 4 + Math.random() * 5;
      const bus = ctx.createOscillator();
      bus.type = 'sawtooth'; bus.frequency.value = 45 + Math.random() * 15;
      const busG = ctx.createGain();
      busG.gain.setValueAtTime(0, busStart);
      busG.gain.linearRampToValueAtTime(0.025, busStart + 1);
      busG.gain.setValueAtTime(0.025, busStart + busDur - 1.5);
      busG.gain.linearRampToValueAtTime(0, busStart + busDur);
      const busLPF = ctx.createBiquadFilter();
      busLPF.type = 'lowpass'; busLPF.frequency.value = 200;
      bus.connect(busG).connect(busLPF).connect(master);
      bus.start(busStart); bus.stop(busStart + busDur);
      this.activeNodes.push(bus);
    }

    // Layer 5: Car horns (occasional)
    for (let h = 0; h < 4; h++) {
      const ht = now + 2 + Math.random() * (duration - 5);
      const hd = 0.2 + Math.random() * 0.5;
      const horn = ctx.createOscillator();
      horn.type = 'sawtooth'; horn.frequency.value = 260 + Math.random() * 140;
      const hg = ctx.createGain();
      hg.gain.setValueAtTime(0, ht);
      hg.gain.linearRampToValueAtTime(0.025, ht + 0.03);
      hg.gain.setValueAtTime(0.025, ht + hd - 0.05);
      hg.gain.linearRampToValueAtTime(0, ht + hd);
      horn.connect(hg).connect(master);
      horn.start(ht); horn.stop(ht + hd);
      this.activeNodes.push(horn);
    }

    // Layer 6: Pedestrian murmur (filtered noise bursts)
    for (let p = 0; p < 8; p++) {
      const pt = now + 1 + Math.random() * (duration - 3);
      const pd = 0.5 + Math.random() * 1.5;
      const pLen = pd * sr;
      const pBuf = ctx.createBuffer(1, pLen, sr);
      const pD = pBuf.getChannelData(0);
      for (let i = 0; i < pLen; i++) {
        pD[i] = (Math.random() * 2 - 1) * (0.3 + 0.7 * Math.sin(Math.PI * i / pLen));
      }
      const ped = ctx.createBufferSource(); ped.buffer = pBuf;
      const pedBPF = ctx.createBiquadFilter();
      pedBPF.type = 'bandpass'; pedBPF.frequency.value = 800 + Math.random() * 600; pedBPF.Q.value = 2;
      const pedG = ctx.createGain(); pedG.gain.value = 0.015;
      ped.connect(pedBPF).connect(pedG).connect(master);
      ped.start(pt);
      this.activeNodes.push(ped);
    }
  }

  // ─── FIRE WITH DISTANT VOICES ───
  playFire(duration = 30, fadeIn = 2, fadeOut = 4) {
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const sr = ctx.sampleRate;
    const len = duration * sr;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.4, now + fadeIn);
    master.gain.setValueAtTime(0.4, now + duration - fadeOut);
    master.gain.linearRampToValueAtTime(0, now + duration);
    master.connect(ctx.destination);
    this.masterGain = master;

    // Layer 1: Fire crackle
    const crackleBuf = ctx.createBuffer(1, len, sr);
    const cd = crackleBuf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const n = Math.random() * 2 - 1;
      const pop = Math.random() > 0.997 ? Math.random() * 4 - 2 : 0;
      const mod = Math.random() > 0.98 ? Math.random() * 3 : 0.3 + Math.random() * 0.3;
      cd[i] = (n * mod + pop) * 0.3;
    }
    const crackle = ctx.createBufferSource(); crackle.buffer = crackleBuf;
    const cBPF = ctx.createBiquadFilter();
    cBPF.type = 'bandpass'; cBPF.frequency.value = 2000; cBPF.Q.value = 0.3;
    const cG = ctx.createGain(); cG.gain.value = 0.6;
    crackle.connect(cBPF).connect(cG).connect(master);
    crackle.start(now); crackle.stop(now + duration);
    this.activeNodes.push(crackle);

    // Layer 2: Low roar
    const roar = ctx.createBufferSource();
    const roarBuf = ctx.createBuffer(1, len, sr);
    const rd = roarBuf.getChannelData(0);
    let rl = 0;
    for (let i = 0; i < len; i++) {
      rl = (rl + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      rd[i] = rl * 4 * (Math.sin(i / (sr * 2.5)) * 0.3 + 0.7);
    }
    roar.buffer = roarBuf;
    const rLPF = ctx.createBiquadFilter(); rLPF.type = 'lowpass'; rLPF.frequency.value = 350;
    const rG = ctx.createGain(); rG.gain.value = 0.7;
    roar.connect(rLPF).connect(rG).connect(master);
    roar.start(now); roar.stop(now + duration);
    this.activeNodes.push(roar);

    // Layer 3: Distant voices
    const vFreqs = [280, 340, 420, 500, 380, 560, 300, 460];
    for (let v = 0; v < 8; v++) {
      const vs = now + 1.5 + Math.random() * (duration - 5);
      const vd = 0.6 + Math.random() * 1.5;
      const voice = ctx.createOscillator();
      voice.type = 'sine'; voice.frequency.value = vFreqs[v] + Math.random() * 40;
      const vib = ctx.createOscillator(); vib.frequency.value = 4 + Math.random() * 4;
      const vibG = ctx.createGain(); vibG.gain.value = 12;
      vib.connect(vibG).connect(voice.frequency);
      vib.start(vs); vib.stop(vs + vd);
      const vG = ctx.createGain();
      vG.gain.setValueAtTime(0, vs);
      vG.gain.linearRampToValueAtTime(0.01, vs + 0.1);
      vG.gain.linearRampToValueAtTime(0.013, vs + vd * 0.5);
      vG.gain.linearRampToValueAtTime(0, vs + vd);
      const dF = ctx.createBiquadFilter(); dF.type = 'lowpass'; dF.frequency.value = 1100;
      voice.connect(vG).connect(dF).connect(master);
      voice.start(vs); voice.stop(vs + vd);
      this.activeNodes.push(voice, vib);
    }

    // Layer 4: Wood cracks
    for (let c = 0; c < 5; c++) {
      const ct = now + 1 + Math.random() * (duration - 3);
      const cDur = 0.04 + Math.random() * 0.08;
      const cn = ctx.createBufferSource();
      const cb = ctx.createBuffer(1, cDur * sr, sr);
      const cbd = cb.getChannelData(0);
      for (let i = 0; i < cbd.length; i++) cbd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (cbd.length * 0.15));
      cn.buffer = cb;
      const cnG = ctx.createGain(); cnG.gain.value = 0.2 + Math.random() * 0.15;
      cn.connect(cnG).connect(master);
      cn.start(ct);
      this.activeNodes.push(cn);
    }
  }

  // ─── GREGORIAN CHANT (MONKS PRAYING) ───
  playGregorian(duration = 30, fadeIn = 4, fadeOut = 5) {
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.3, now + fadeIn);
    master.gain.setValueAtTime(0.3, now + duration - fadeOut);
    master.gain.linearRampToValueAtTime(0, now + duration);
    master.connect(ctx.destination);
    this.masterGain = master;

    // Reverb simulation via delay network
    const reverb = ctx.createConvolver();
    const reverbLen = 3 * ctx.sampleRate;
    const reverbBuf = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const rd = reverbBuf.getChannelData(ch);
      for (let i = 0; i < reverbLen; i++) {
        rd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 1.2));
      }
    }
    reverb.buffer = reverbBuf;
    const reverbG = ctx.createGain(); reverbG.gain.value = 0.4;
    reverb.connect(reverbG).connect(master);

    const dry = ctx.createGain(); dry.gain.value = 0.6;
    dry.connect(master);

    // Gregorian chant: layered sustained tones on a modal scale
    // Dorian mode in D: D E F G A Bb C D
    const baseFreq = 146.83; // D3
    const scale = [1, 9/8, 6/5, 4/3, 3/2, 8/5, 16/9, 2]; // Dorian ratios
    const numVoices = 5;

    for (let v = 0; v < numVoices; v++) {
      // Each voice sings a slow melody — long sustained notes
      let noteTime = now + v * 0.8;
      const voiceEnd = now + duration - fadeOut;
      const octaveShift = v < 2 ? 0.5 : (v < 4 ? 1 : 2); // bass, tenor, high

      while (noteTime < voiceEnd) {
        const noteDur = 2.5 + Math.random() * 4;
        const degree = scale[Math.floor(Math.random() * scale.length)];
        const freq = baseFreq * degree * octaveShift;

        // Fundamental
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Slow vibrato (natural singing)
        const vib = ctx.createOscillator();
        vib.frequency.value = 4.5 + Math.random() * 1.5;
        const vibG = ctx.createGain();
        vibG.gain.value = freq * 0.008;
        vib.connect(vibG).connect(osc.frequency);
        vib.start(noteTime); vib.stop(noteTime + noteDur);

        // Second harmonic for richness
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        const osc2G = ctx.createGain(); osc2G.gain.value = 0.15;

        // Third harmonic (faint)
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = freq * 3;
        const osc3G = ctx.createGain(); osc3G.gain.value = 0.05;

        // Note envelope
        const noteG = ctx.createGain();
        noteG.gain.setValueAtTime(0, noteTime);
        noteG.gain.linearRampToValueAtTime(0.06, noteTime + 0.8);
        noteG.gain.setValueAtTime(0.06, noteTime + noteDur - 1);
        noteG.gain.linearRampToValueAtTime(0, noteTime + noteDur);

        // Formant filter (vocal quality)
        const formant = ctx.createBiquadFilter();
        formant.type = 'bandpass';
        formant.frequency.value = 400 + Math.random() * 400;
        formant.Q.value = 1.5;

        osc.connect(noteG);
        osc2.connect(osc2G).connect(noteG);
        osc3.connect(osc3G).connect(noteG);
        noteG.connect(formant);
        formant.connect(reverb);
        formant.connect(dry);

        osc.start(noteTime); osc.stop(noteTime + noteDur);
        osc2.start(noteTime); osc2.stop(noteTime + noteDur);
        osc3.start(noteTime); osc3.stop(noteTime + noteDur);

        this.activeNodes.push(osc, osc2, osc3, vib);

        noteTime += noteDur - 0.5; // slight overlap
      }
    }

    // Subtle breath/air noise for cathedral atmosphere
    const air = ctx.createBufferSource();
    air.buffer = this._createNoise(duration * ctx.sampleRate, 'white');
    const airHPF = ctx.createBiquadFilter();
    airHPF.type = 'highpass'; airHPF.frequency.value = 6000;
    const airG = ctx.createGain(); airG.gain.value = 0.008;
    air.connect(airHPF).connect(airG).connect(master);
    air.start(now); air.stop(now + duration);
    this.activeNodes.push(air);
  }
}

window.sfx = new SoundEffects();
