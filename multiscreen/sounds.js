// ─── CASERNE 10 SOUND EFFECTS ───
// Procedural audio using Web Audio API — no files needed

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.activeNodes = [];
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  stopAll() {
    this.activeNodes.forEach(node => {
      try { node.stop(); } catch(e) {}
      try { node.disconnect(); } catch(e) {}
    });
    this.activeNodes = [];
  }

  // ─── BUSY STREET WITH TRAFFIC ───
  playTraffic(duration = 8, fadeIn = 2, fadeOut = 3) {
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.35, now + fadeIn);
    master.gain.setValueAtTime(0.35, now + duration - fadeOut);
    master.gain.linearRampToValueAtTime(0, now + duration);
    master.connect(ctx.destination);

    // Layer 1: Deep traffic rumble (brown noise, low-pass)
    const rumbleLen = duration * ctx.sampleRate;
    const rumbleBuf = ctx.createBuffer(1, rumbleLen, ctx.sampleRate);
    const rumbleData = rumbleBuf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < rumbleLen; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      rumbleData[i] = lastOut * 3.5;
    }
    const rumble = ctx.createBufferSource();
    rumble.buffer = rumbleBuf;
    const rumbleLPF = ctx.createBiquadFilter();
    rumbleLPF.type = 'lowpass';
    rumbleLPF.frequency.value = 200;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.8;
    rumble.connect(rumbleLPF).connect(rumbleGain).connect(master);
    rumble.start(now);
    rumble.stop(now + duration);
    this.activeNodes.push(rumble);

    // Layer 2: Mid-frequency wash (traffic passing)
    const washLen = duration * ctx.sampleRate;
    const washBuf = ctx.createBuffer(1, washLen, ctx.sampleRate);
    const washData = washBuf.getChannelData(0);
    let washLast = 0;
    for (let i = 0; i < washLen; i++) {
      const w = Math.random() * 2 - 1;
      washLast = (washLast + (0.05 * w)) / 1.05;
      // Occasional volume swells = cars passing
      const swell = Math.sin(i / (ctx.sampleRate * (1.5 + Math.random()))) * 0.5 + 0.5;
      washData[i] = washLast * 2.5 * swell;
    }
    const wash = ctx.createBufferSource();
    wash.buffer = washBuf;
    const washBPF = ctx.createBiquadFilter();
    washBPF.type = 'bandpass';
    washBPF.frequency.value = 600;
    washBPF.Q.value = 0.5;
    const washGain = ctx.createGain();
    washGain.gain.value = 0.3;
    wash.connect(washBPF).connect(washGain).connect(master);
    wash.start(now);
    wash.stop(now + duration);
    this.activeNodes.push(wash);

    // Layer 3: High-frequency hiss (tire noise on pavement)
    const hissLen = duration * ctx.sampleRate;
    const hissBuf = ctx.createBuffer(1, hissLen, ctx.sampleRate);
    const hissData = hissBuf.getChannelData(0);
    for (let i = 0; i < hissLen; i++) {
      hissData[i] = (Math.random() * 2 - 1);
    }
    const hiss = ctx.createBufferSource();
    hiss.buffer = hissBuf;
    const hissHPF = ctx.createBiquadFilter();
    hissHPF.type = 'highpass';
    hissHPF.frequency.value = 3000;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.04;
    hiss.connect(hissHPF).connect(hissGain).connect(master);
    hiss.start(now);
    hiss.stop(now + duration);
    this.activeNodes.push(hiss);

    // Layer 4: Occasional horn-like tones
    for (let h = 0; h < 3; h++) {
      const hornTime = now + 1.5 + Math.random() * (duration - 4);
      const hornDur = 0.3 + Math.random() * 0.4;
      const horn = ctx.createOscillator();
      horn.type = 'sawtooth';
      horn.frequency.value = 280 + Math.random() * 120;
      const hornGain = ctx.createGain();
      hornGain.gain.setValueAtTime(0, hornTime);
      hornGain.gain.linearRampToValueAtTime(0.03, hornTime + 0.05);
      hornGain.gain.setValueAtTime(0.03, hornTime + hornDur - 0.1);
      hornGain.gain.linearRampToValueAtTime(0, hornTime + hornDur);
      horn.connect(hornGain).connect(master);
      horn.start(hornTime);
      horn.stop(hornTime + hornDur);
      this.activeNodes.push(horn);
    }
  }

  // ─── FIRE CRACKLING WITH DISTANT VOICES ───
  playFire(duration = 10, fadeIn = 1.5, fadeOut = 4) {
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.4, now + fadeIn);
    master.gain.setValueAtTime(0.4, now + duration - fadeOut);
    master.gain.linearRampToValueAtTime(0, now + duration);
    master.connect(ctx.destination);

    // Layer 1: Fire crackle (amplitude-modulated noise)
    const crackleLen = duration * ctx.sampleRate;
    const crackleBuf = ctx.createBuffer(1, crackleLen, ctx.sampleRate);
    const crackleData = crackleBuf.getChannelData(0);
    for (let i = 0; i < crackleLen; i++) {
      const noise = Math.random() * 2 - 1;
      // Random sharp pops
      const pop = Math.random() > 0.997 ? (Math.random() * 4 - 2) : 0;
      // Irregular amplitude modulation for crackle texture
      const mod = Math.random() > 0.98 ? Math.random() * 3 : 0.3 + Math.random() * 0.3;
      crackleData[i] = (noise * mod + pop) * 0.3;
    }
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuf;
    const crackleBPF = ctx.createBiquadFilter();
    crackleBPF.type = 'bandpass';
    crackleBPF.frequency.value = 2000;
    crackleBPF.Q.value = 0.3;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.6;
    crackle.connect(crackleBPF).connect(crackleGain).connect(master);
    crackle.start(now);
    crackle.stop(now + duration);
    this.activeNodes.push(crackle);

    // Layer 2: Low roar of fire
    const roarLen = duration * ctx.sampleRate;
    const roarBuf = ctx.createBuffer(1, roarLen, ctx.sampleRate);
    const roarData = roarBuf.getChannelData(0);
    let roarLast = 0;
    for (let i = 0; i < roarLen; i++) {
      const w = Math.random() * 2 - 1;
      roarLast = (roarLast + (0.02 * w)) / 1.02;
      // Slow undulation like fire breathing
      const breathe = Math.sin(i / (ctx.sampleRate * 2.5)) * 0.3 + 0.7;
      roarData[i] = roarLast * 4 * breathe;
    }
    const roar = ctx.createBufferSource();
    roar.buffer = roarBuf;
    const roarLPF = ctx.createBiquadFilter();
    roarLPF.type = 'lowpass';
    roarLPF.frequency.value = 350;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.7;
    roar.connect(roarLPF).connect(roarGain).connect(master);
    roar.start(now);
    roar.stop(now + duration);
    this.activeNodes.push(roar);

    // Layer 3: Mid roar (whooshing flames)
    const whooshLen = duration * ctx.sampleRate;
    const whooshBuf = ctx.createBuffer(1, whooshLen, ctx.sampleRate);
    const whooshData = whooshBuf.getChannelData(0);
    for (let i = 0; i < whooshLen; i++) {
      const n = Math.random() * 2 - 1;
      const surge = Math.sin(i / (ctx.sampleRate * (1 + Math.random() * 0.5))) * 0.5 + 0.5;
      whooshData[i] = n * surge;
    }
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = whooshBuf;
    const whooshBPF = ctx.createBiquadFilter();
    whooshBPF.type = 'bandpass';
    whooshBPF.frequency.value = 800;
    whooshBPF.Q.value = 0.5;
    const whooshGain = ctx.createGain();
    whooshGain.gain.value = 0.15;
    whoosh.connect(whooshBPF).connect(whooshGain).connect(master);
    whoosh.start(now);
    whoosh.stop(now + duration);
    this.activeNodes.push(whoosh);

    // Layer 4: Distant voices — barely noticeable
    // Simulated with modulated tones at voice frequencies
    const voiceFreqs = [320, 440, 520, 380, 600];
    for (let v = 0; v < 5; v++) {
      const voiceStart = now + 2 + Math.random() * (duration - 6);
      const voiceDur = 0.8 + Math.random() * 1.2;

      const voice = ctx.createOscillator();
      voice.type = 'sine';
      voice.frequency.value = voiceFreqs[v] + Math.random() * 60;
      // Vibrato for human-like quality
      const vibrato = ctx.createOscillator();
      vibrato.frequency.value = 5 + Math.random() * 3;
      const vibratoGain = ctx.createGain();
      vibratoGain.gain.value = 15;
      vibrato.connect(vibratoGain).connect(voice.frequency);
      vibrato.start(voiceStart);
      vibrato.stop(voiceStart + voiceDur);

      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(0, voiceStart);
      voiceGain.gain.linearRampToValueAtTime(0.012, voiceStart + 0.15);
      voiceGain.gain.linearRampToValueAtTime(0.015, voiceStart + voiceDur * 0.5);
      voiceGain.gain.linearRampToValueAtTime(0, voiceStart + voiceDur);

      // Distance filter
      const distFilter = ctx.createBiquadFilter();
      distFilter.type = 'lowpass';
      distFilter.frequency.value = 1200;

      voice.connect(voiceGain).connect(distFilter).connect(master);
      voice.start(voiceStart);
      voice.stop(voiceStart + voiceDur);
      this.activeNodes.push(voice, vibrato);
    }

    // Layer 5: A few sharp cracks (wood breaking)
    for (let c = 0; c < 4; c++) {
      const crackTime = now + 1 + Math.random() * (duration - 3);
      const crackDur = 0.05 + Math.random() * 0.08;
      const crackNoise = ctx.createBufferSource();
      const crackBufLen = crackDur * ctx.sampleRate;
      const cb = ctx.createBuffer(1, crackBufLen, ctx.sampleRate);
      const cd = cb.getChannelData(0);
      for (let i = 0; i < crackBufLen; i++) {
        cd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crackBufLen * 0.2));
      }
      crackNoise.buffer = cb;
      const crackG = ctx.createGain();
      crackG.gain.value = 0.15 + Math.random() * 0.15;
      crackNoise.connect(crackG).connect(master);
      crackNoise.start(crackTime);
      this.activeNodes.push(crackNoise);
    }
  }
}

// Global instance
window.sfx = new SoundEffects();
