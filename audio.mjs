export class GardenAudio {
  context = null;
  enabled = false;

  async toggle() {
    if (this.enabled) {
      this.enabled = false;
      this.update(false, .55, 'shower', false);
      return false;
    }
    try {
      if (!this.context) this.create();
      await this.context.resume();
      this.enabled = this.context.state === 'running';
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }

  create() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    this.context = new Audio();
    const ctx = this.context;
    const noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    const loop = ctx.createBufferSource();
    loop.buffer = noise;
    loop.loop = true;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.value = 260;
    const air = ctx.createGain();
    air.gain.value = .15;
    loop.connect(airFilter).connect(air).connect(this.master);
    this.waterFilter = ctx.createBiquadFilter();
    this.waterFilter.type = 'bandpass';
    this.waterFilter.Q.value = .52;
    this.water = ctx.createGain();
    this.water.gain.value = 0;
    loop.connect(this.waterFilter).connect(this.water).connect(this.master);
    const splashFilter = ctx.createBiquadFilter();
    splashFilter.type = 'bandpass';
    splashFilter.frequency.value = 780;
    splashFilter.Q.value = 1.6;
    this.splash = ctx.createGain();
    this.splash.gain.value = 0;
    const splashLoop = ctx.createBufferSource();
    const splashBuffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
    const splashData = splashBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += Math.floor(ctx.sampleRate * (.014 + Math.random() * .032))) {
      const length = Math.min(data.length - i, Math.floor(ctx.sampleRate * (.009 + Math.random() * .021)));
      for (let j = 0; j < length; j++) splashData[i + j] += data[i + j] * (1 - j / length) ** 2;
    }
    splashLoop.buffer = splashBuffer;
    splashLoop.loop = true;
    splashLoop.connect(splashFilter).connect(this.splash).connect(this.master);
    splashLoop.start();
    loop.start();
    this.nextBird = ctx.currentTime + 2;
  }

  createMeow() {
    const rate = this.context.sampleRate;
    const duration = .61;
    const buffer = this.context.createBuffer(1, Math.ceil(rate * duration), rate);
    const samples = buffer.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < samples.length; i++) {
      const time = i / rate;
      const progress = time / duration;
      const pitch = 490 + 310 * Math.sin(Math.PI * progress ** .55) - 180 * progress;
      phase += 2 * Math.PI * pitch / rate;
      const envelope = Math.min(1, time / .035, (duration - time) / .11) * (1 - .45 * progress);
      // Move the resonances as the mouth closes to give the call its vowel change.
      const first = 1050 - 570 * progress;
      const second = 2450 - 1250 * progress;
      let voice = 0;
      for (let harmonic = 1; harmonic <= 9; harmonic++) {
        const frequency = pitch * harmonic;
        const resonance = Math.exp(-(((frequency - first) / 390) ** 2)) +
          .48 * Math.exp(-(((frequency - second) / 560) ** 2));
        voice += Math.sin(harmonic * phase) * resonance / Math.sqrt(harmonic);
      }
      samples[i] = envelope * (.44 * voice + .022 * (Math.random() * 2 - 1));
    }
    return buffer;
  }

  meow() {
    if (!this.enabled || document.hidden || this.context.state !== 'running') return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = .45;
    source.buffer = this.meowBuffer ??= this.createMeow();
    source.connect(gain).connect(this.master);
    source.start();
  }

  update(flowing, pressure, nozzle, visible, puddleImpact = 0) {
    if (!this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const playing = this.enabled && visible;
    this.master.gain.setTargetAtTime(playing ? .52 : 0, now, .14);
    const waterTone = nozzle === 'mist' ? 2700 : nozzle === 'jet' ? 960 : 1550;
    const waterGain = nozzle === 'mist' ? .72 : nozzle === 'jet' ? 1.13 : 1;
    this.water.gain.setTargetAtTime(playing && flowing ? (.075 + pressure * .21) * waterGain : 0, now, .095);
    this.splash.gain.setTargetAtTime(playing ? puddleImpact * .34 : 0, now, .055);
    this.waterFilter.frequency.setTargetAtTime(waterTone * (.85 + pressure * .25), now, .14);
    if (!playing || now < this.nextBird) return;
    this.nextBird = now + 6 + Math.random() * 13;
    for (let i = 0; i < 3; i++) {
      const start = now + i * .16;
      const chirp = ctx.createOscillator();
      const envelope = ctx.createGain();
      chirp.frequency.setValueAtTime(1400 + i * 155, start);
      chirp.frequency.exponentialRampToValueAtTime(2300 - i * 115, start + .05);
      chirp.frequency.exponentialRampToValueAtTime(1350, start + .13);
      envelope.gain.setValueAtTime(.0001, start);
      envelope.gain.exponentialRampToValueAtTime(.016, start + .023);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + .14);
      chirp.connect(envelope).connect(this.master);
      chirp.start(start);
      chirp.stop(start + .145);
    }
  }
}
