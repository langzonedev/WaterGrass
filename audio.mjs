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
    loop.start();
    this.nextBird = ctx.currentTime + 2;
  }

  update(flowing, pressure, nozzle, visible) {
    if (!this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const playing = this.enabled && visible;
    this.master.gain.setTargetAtTime(playing ? .52 : 0, now, .14);
    const waterTone = nozzle === 'mist' ? 2700 : nozzle === 'jet' ? 960 : 1550;
    const waterGain = nozzle === 'mist' ? .72 : nozzle === 'jet' ? 1.13 : 1;
    this.water.gain.setTargetAtTime(playing && flowing ? (.075 + pressure * .21) * waterGain : 0, now, .095);
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
