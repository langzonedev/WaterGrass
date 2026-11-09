export const HEIGHT = 720;
export const LAWN_TOP = 354;
export const COLS = 64;
export const ROWS = 32;
export const GRAVITY = 700;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const patterns = {
  mist: { rate: 330, spread: .33, speed: .83, drag: 2.6, size: .48, volume: .27, splash: .20 },
  shower: { rate: 205, spread: .13, speed: 1.10, drag: .55, size: 1, volume: .93, splash: .60 },
  jet: { rate: 220, spread: .027, speed: 1.42, drag: .18, size: 1.20, volume: 1.22, splash: 1 },
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

export function flightTravel(time, drag) {
  return -Math.expm1(-drag * time) / drag;
}

export function gravityDrop(time, drag) {
  return GRAVITY * (time - flightTravel(time, drag)) / drag;
}

export function spraySource(pose, target, duration) {
  const groundY = HEIGHT - 12;
  const travel = flightTravel(duration, patterns.shower.drag);
  const height = groundY - pose.mouth.y;
  const groundSpeed = (target.y - groundY) / travel;
  return {
    from: pose.mouth, heading: pose.heading, height, groundSpeed,
    speed: Math.hypot(target.x - pose.mouth.x,
      target.y - pose.mouth.y - gravityDrop(duration, patterns.shower.drag)) / travel,
  };
}

// The spray moves across the ground and falls independently. The projected
// path bends under gravity while fine droplets lose speed quickly in the air.
export function launch(source, pressure, nozzle, random = Math.random) {
  const pattern = patterns[nozzle];
  const fan = random() * 2 - 1;
  const spread = nozzle === 'shower' ? Math.round(fan * 4) / 4 + (random() - .5) * .18 : fan;
  const angle = source.heading + spread * pattern.spread;
  const speedFactor = Math.sqrt(pressure / .55) * pattern.speed * (.91 + random() * .18);
  const velocity = source.speed * speedFactor;
  const vx = Math.cos(angle) * velocity;
  const vy = Math.sin(angle) * velocity;
  const lift = source.groundSpeed * speedFactor - vy;
  const drag = pattern.drag * (.84 + random() * .32);
  let low = 0;
  let high = 2.5;
  for (let i = 0; i < 12; i++) {
    const middle = (low + high) / 2;
    const altitude = source.height + lift * flightTravel(middle, drag) - gravityDrop(middle, drag);
    if (altitude > 0) low = middle;
    else high = middle;
  }
  const duration = high;
  const impactSpeed = Math.hypot(vx * Math.exp(-drag * duration),
    vy * Math.exp(-drag * duration) + GRAVITY * flightTravel(duration, drag));
  return {
    from: source.from, duration, drag, vx, vy, age: 0, nozzle,
    size: (.70 + random() * .66) * pattern.size,
    shine: random() > .66,
    splash: pattern.splash * clamp(impactSpeed / 360, .4, 1.7) * (.6 + pressure * .7),
    volume: pattern.volume * (.60 + pressure * .76),
  };
}

export function position(drop, time) {
  const travel = flightTravel(time, drop.drag);
  return {
    x: drop.from.x + drop.vx * travel,
    y: drop.from.y + drop.vy * travel + GRAVITY * (time - travel) / drop.drag,
  };
}
