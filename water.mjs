export const HEIGHT = 720;
export const LAWN_TOP = 354;
export const COLS = 64;
export const ROWS = 32;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const patterns = {
  mist: { rate: 230, spread: 1.65, fall: 1.32, size: .71, volume: .56 },
  shower: { rate: 168, spread: 1, fall: 1, size: 1, volume: 1 },
  jet: { rate: 190, spread: .26, fall: .8, size: 1.23, volume: 1.31 },
};

export class Soil {
  constructor() {
    this.moisture = new Float32Array(COLS * ROWS);
    this.surface = new Float32Array(COLS * ROWS);
  }

  deposit(x, y, amount, width, depth) {
    for (let row = Math.max(0, Math.floor(y - depth)); row <= Math.min(ROWS - 1, Math.ceil(y + depth)); row++) {
      for (let col = Math.max(0, Math.floor(x - width)); col <= Math.min(COLS - 1, Math.ceil(x + width)); col++) {
        const distance = ((col - x) / width) ** 2 + ((row - y) / depth) ** 2;
        if (distance >= 1) continue;
        const i = row * COLS + col;
        const water = amount * (1 - distance) ** 1.7;
        const uptake = Math.min(1 - this.moisture[i], water);
        this.moisture[i] += uptake;
        this.surface[i] = Math.min(1, this.surface[i] + (water - uptake) * .93);
      }
    }
  }

  drain(dt) {
    for (let i = 0; i < this.surface.length; i++) {
      this.surface[i] = Math.max(0, this.surface[i] - dt * (.042 + this.surface[i] * .12));
    }
  }

  coverage(left, right, bottom) {
    let covered = 0;
    let total = 0;
    for (let row = 0; row < bottom; row++) {
      for (let col = left; col < right; col++) {
        covered += Math.min(1, this.moisture[row * COLS + col] / .58);
        total++;
      }
    }
    return total ? covered / total * 100 : 0;
  }
}

export class Basin {
  level = 0;
  overflow = 0;

  fill(amount) {
    const next = this.level + amount;
    this.level = Math.min(1, next);
    if (next > 1) this.overflow = Math.min(1, this.overflow + amount * 18);
  }

  settle(dt) {
    this.overflow = Math.max(0, this.overflow - dt * 2.3);
  }
}

// Each droplet keeps the velocity it had at launch, so sweeping the nozzle
// bends the live spray without dragging water that is already in the air.
export function launch(from, to, pressure, pattern, random = Math.random) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const duration = clamp((.23 + distance / 1150) * pattern.fall / (.74 + pressure * .55), .22, .9);
  const gravity = 760;
  const vx = (to.x - from.x) / duration;
  const vy = (to.y - from.y) / duration - gravity * duration / 2;
  return {
    from, to, duration, gravity, vx, vy, age: 0,
    size: (.67 + random() * .88) * pattern.size,
    shine: .35 + random() * .62,
    volume: pattern.volume * (.49 + pressure * .93),
  };
}

export function position(drop, time) {
  return {
    x: drop.from.x + drop.vx * time,
    y: drop.from.y + drop.vy * time + drop.gravity * time ** 2 / 2,
  };
}
