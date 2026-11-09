import { HEIGHT, LAWN_TOP, COLS, ROWS, GRAVITY, Soil, Basin, clamp, patterns, launch, position } from './water.mjs';
import { birdbath, drawCat, drawHose, hosePose, oval } from './artwork.mjs';
import { GardenAudio } from './audio.mjs';

const find = (id) => document.getElementById(id);
const yard = find('yard');
const canvas = find('scene');
const ctx = canvas.getContext('2d');
const guide = find('guide');
const flowButton = find('flow');
const soundButton = find('sound');
const nozzleInput = find('nozzle');
const pressureInput = find('pressure');
const lawnMeter = find('lawn-meter');
const bathMeter = find('bath-meter');
const coverageOutput = find('coverage');
const bathOutput = find('bath-value');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const audio = new GardenAudio();
const soil = new Soil();
const basin = new Basin();
const wetLayer = document.createElement('canvas');
wetLayer.width = COLS;
wetLayer.height = ROWS;
const wetContext = wetLayer.getContext('2d');
const wetPixels = wetContext.createImageData(COLS, ROWS);
const drops = [];
const splashes = [];
const keys = new Set();
const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const view = { width: 1080, plateWidth: 1080, left: 0, scale: 1 };
const bath = { x: 0, y: 367, scale: 1 };
const desired = { sweep: -.12, reach: .43 };
const aim = { ...desired };
let pose;
const cat = { active: false, x: 0, y: 425, scale: .9, direction: 1, startled: 0, flee: false, next: 10 };
let running = false;
let flowing = false;
let pointer = null;
let previous = 0;
let time = 0;
let nextHUD = 0;
let carry = 0;
let spillCarry = 0;
let pressure = Number(pressureInput.value) / 100;
let nozzle = nozzleInput.value;

function resize() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 1.65);
  const previousWidth = view.width;
  view.scale = bounds.height / HEIGHT;
  view.width = bounds.width / view.scale;
  view.plateWidth = Math.max(view.width, 790);
  const crop = view.plateWidth - view.width;
  view.left = -crop * .27;
  canvas.style.backgroundSize = `${view.plateWidth * view.scale}px 100%`;
  canvas.style.backgroundPosition = `${view.left * view.scale}px 0`;
  canvas.width = Math.max(1, Math.round(bounds.width * ratio));
  canvas.height = Math.max(1, Math.round(bounds.height * ratio));
  ctx.setTransform(canvas.width / view.width, 0, 0, canvas.height / HEIGHT, 0, 0);
  if (running) {
    pointer = null;
    yard.classList.remove('dragging');
    cat.x = cat.x / previousWidth * view.width;
    drops.length = 0;
    splashes.length = 0;
  }
  bath.x = view.width * (view.width < 610 ? .72 : .745);
  bath.scale = clamp(view.width / 745, .81, 1.05);
}

function setFlow(next) {
  flowing = next;
  flowButton.setAttribute('aria-pressed', String(next));
  find('flow-text').textContent = next ? 'Flow on' : 'Flow off';
  carry = 0;
}

function begin() {
  running = true;
  yard.classList.add('playing');
  find('intro').hidden = true;
  find('readouts').hidden = false;
  find('game-ui').hidden = false;
  setFlow(true);
  canvas.focus({ preventScroll: true });
}

function steer(sweep, reach) {
  desired.sweep = clamp(desired.sweep + sweep, -1, 1);
  desired.reach = clamp(desired.reach + reach, 0, 1);
}

canvas.addEventListener('pointerdown', (event) => {
  if (!running || pointer !== null || event.button !== 0) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  yard.classList.add('dragging');
});
canvas.addEventListener('pointermove', (event) => {
  if (pointer?.id !== event.pointerId) return;
  steer(
    (event.clientX - pointer.x) / (Math.min(view.width, 880) * view.scale * .34),
    (pointer.y - event.clientY) / (HEIGHT * view.scale * .30),
  );
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
function release(event) {
  if (pointer?.id !== event.pointerId) return;
  pointer = null;
  yard.classList.remove('dragging');
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('lostpointercapture', release);
canvas.addEventListener('keydown', (event) => {
  if (!running || guide.open) return;
  if (event.key in directions) {
    event.preventDefault();
    keys.add(event.key);
  } else if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) setFlow(!flowing);
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key));
canvas.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => {
  keys.clear();
  audio.update(false, pressure, nozzle, false);
});
find('start').addEventListener('click', begin);
flowButton.addEventListener('click', () => setFlow(!flowing));
find('help').addEventListener('click', () => guide.showModal());
nozzleInput.addEventListener('change', () => { nozzle = nozzleInput.value; });
function updatePressure() {
  pressure = Number(pressureInput.value) / 100;
  const strength = pressure < .4 ? 'Soft' : pressure <= .69 ? 'Balanced' : 'Strong';
  find('pressure-text').textContent = strength;
  pressureInput.setAttribute('aria-valuetext', `${strength}, ${pressureInput.value}%`);
}
pressureInput.addEventListener('input', updatePressure);
updatePressure();
soundButton.addEventListener('click', async () => {
  soundButton.disabled = true;
  const enabled = await audio.toggle();
  soundButton.setAttribute('aria-pressed', String(enabled));
  soundButton.disabled = false;
});
new ResizeObserver(resize).observe(canvas);

function sprayHit(from, to, x, y, radiusX, radiusY) {
  const startX = (from.x - x) / radiusX;
  const startY = (from.y - y) / radiusY;
  const stepX = (to.x - from.x) / radiusX;
  const stepY = (to.y - from.y) / radiusY;
  const length = stepX * stepX + stepY * stepY;
  const t = length ? clamp(-(startX * stepX + startY * stepY) / length, 0, 1) : 0;
  if ((startX + stepX * t) ** 2 + (startY + stepY * t) ** 2 > 1) return null;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

function addSplash(x, y, kind) {
  if (reduced.matches || splashes.length >= 100) return;
  const angle = Math.random() * Math.PI * 2;
  const speed = 15 + Math.random() * 52;
  splashes.push({ x, y, vx: Math.cos(angle) * speed, vy: -13 - Math.random() * 54,
    age: 0, life: .16 + Math.random() * .3, kind });
}

function land(drop, { x, y }) {
  if (y < LAWN_TOP || y > HEIGHT || x < view.left || x > view.left + view.plateWidth) return;
  const col = (x - view.left) / view.plateWidth * COLS - .5;
  const row = (y - LAWN_TOP) / (HEIGHT - LAWN_TOP) * ROWS - .5;
  const depth = clamp(row / ROWS, 0, 1);
  soil.deposit(col, row, .0095 * drop.volume, 1.32 + depth * .64, .92 + depth * .69);
  if (Math.random() < .18) addSplash(x, y, 'grass');
}

function updateCat(dt) {
  if (!cat.active) {
    if (time < cat.next) return;
    cat.active = true;
    cat.flee = false;
    cat.direction = Math.random() < .5 ? -1 : 1;
    cat.x = cat.direction === 1 ? -62 : view.width + 62;
  }
  if (cat.startled > 0) {
    cat.startled = Math.max(0, cat.startled - dt);
    if (!cat.startled) cat.flee = true;
  } else {
    const speed = clamp(view.width * .105, 55, 106);
    cat.x += cat.direction * speed * (cat.flee ? 3.65 : 1) * dt;
  }
  if (cat.x < -65 || cat.x > view.width + 65) {
    cat.active = false;
    cat.next = time + 27 + Math.random() * 27;
  }
}

function update(dt) {
  time += dt;
  for (const key of keys) {
    const [x, y] = directions[key];
    steer(x * 1.35 * dt, -y * .85 * dt);
  }
  const blend = reduced.matches ? 1 : 1 - Math.exp(-21 * dt);
  aim.sweep += (desired.sweep - aim.sweep) * blend;
  aim.reach += (desired.reach - aim.reach) * blend;
  const pattern = patterns[nozzle];
  const reach = clamp(aim.reach + (pressure - .55) * .48 + (pattern.reach - 1) * .31, 0, 1);
  const duration = .71 + reach * .06;
  const targetY = 658 + (LAWN_TOP + 4 - 658) * reach;
  const directionPoint = {
    x: view.width * (.5 + aim.sweep * .49),
    y: targetY - GRAVITY * duration ** 2 / 2,
  };
  pose = hosePose({ x: view.width * .53, y: 640 }, directionPoint, view.width);
  basin.settle(dt);
  soil.drain(dt);
  updateCat(dt);
  if (flowing) {
    const rate = pattern.rate * (.64 + pressure * .65);
    const speed = Math.hypot(directionPoint.x - pose.mouth.x, directionPoint.y - pose.mouth.y) / duration;
    carry += dt * rate;
    while (carry >= 1) {
      carry--;
      const drop = launch(pose.mouth, pose.heading, speed, duration, pressure, pattern);
      // Evenly space the drops emitted between animation frames.
      drop.age = carry / rate - dt;
      drops.push(drop);
    }
  }
  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    const from = position(drop, Math.max(0, drop.age));
    drop.age = Math.min(drop.duration, drop.age + dt);
    const to = position(drop, drop.age);
    const bowlHit = sprayHit(from, to, bath.x, bath.y, 39 * bath.scale, 10 * bath.scale);
    if (bowlHit) {
      basin.fill(drop.volume * .00143);
      if (Math.random() < .28) addSplash(bowlHit.x, bowlHit.y, 'bowl');
    } else {
      if (cat.active && !cat.startled && !cat.flee && sprayHit(from, to, cat.x, cat.y - 13, 28, 16)) {
        cat.startled = .64;
        cat.direction *= -1;
      }
      if (drop.age >= drop.duration) land(drop, to);
    }
    if (bowlHit || drop.age >= drop.duration) {
      drops[i] = drops[drops.length - 1];
      drops.pop();
    }
  }
  spillCarry += basin.overflow * dt * 32;
  while (spillCarry >= 1) {
    const x = bath.x + (Math.random() > .45 ? 1 : -1) * (31 + Math.random() * 13) * bath.scale;
    addSplash(x, bath.y + bath.scale * 3, 'spill');
    spillCarry--;
  }
  for (let i = splashes.length - 1; i >= 0; i--) {
    splashes[i].age += dt;
    if (splashes[i].age > splashes[i].life) {
      splashes[i] = splashes[splashes.length - 1];
      splashes.pop();
    }
  }
}

function paintSoil() {
  const pixel = wetPixels.data;
  for (let i = 0; i < soil.moisture.length; i++) {
    const wet = Math.min(1, soil.moisture[i] * 1.36);
    const pool = soil.surface[i];
    const offset = i * 4;
    pixel[offset] = 20 + pool * 85;
    pixel[offset + 1] = 64 + pool * 60;
    pixel[offset + 2] = 47 + pool * 80;
    pixel[offset + 3] = wet * 101 + pool * 65;
  }
  wetContext.putImageData(wetPixels, 0, 0);
  ctx.drawImage(wetLayer, view.left, LAWN_TOP, view.plateWidth, HEIGHT - LAWN_TOP);
  const cellW = view.plateWidth / COLS;
  const cellH = (HEIGHT - LAWN_TOP) / ROWS;
  for (let row = 1; row < ROWS - 1; row++) {
    for (let col = 1; col < COLS - 1; col++) {
      const i = row * COLS + col;
      const depth = soil.surface[i];
      if (depth < .21 || depth < soil.surface[i - 1] || depth <= soil.surface[i + 1]
        || depth < soil.surface[i - COLS] || depth <= soil.surface[i + COLS]) continue;
      const x = view.left + (col + .5) * cellW;
      const y = LAWN_TOP + (row + .5) * cellH;
      if (x < -40 || x > view.width + 40) continue;
      const w = 7 + depth * (13 + row * .53);
      const h = 1.8 + depth * (3 + row * .12);
      oval(ctx, x + 4, y, w, h, `rgba(181,202,177,${depth * .37})`);
      oval(ctx, x + 3, y + .3, w * .82, h * .73, `rgba(104,148,145,${depth * .42})`);
      const ripple = reduced.matches ? .35 : (time * 1.3 + col * .18 + row * .11) % 1;
      oval(ctx, x + 3, y, w * (.15 + .73 * ripple), h * (.2 + .64 * ripple), null, `rgba(245,235,198,${depth * .53 * (1 - ripple)})`, .8);
    }
  }
}

function paintWater() {
  ctx.lineCap = 'round';
  for (let group = 0; group < 3; group++) {
    ctx.strokeStyle = ['#98cecd71', '#d0ebe8af', '#fff1c8bd'][group];
    ctx.lineWidth = [.85, 1.38, 1.1][group];
    ctx.beginPath();
    for (let i = group; i < drops.length; i += 3) {
      const d = drops[i];
      const finish = position(d, d.age);
      const start = position(d, Math.max(0, d.age - (.01 + d.shine * .018) * d.size));
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(finish.x, finish.y);
    }
    ctx.stroke();
  }
  for (const s of splashes) {
    const isSpill = s.kind === 'spill';
    const age = s.age;
    const x = s.x + s.vx * age * (isSpill ? .18 : 1);
    const y = s.y + (isSpill ? 14 : s.vy) * age + (isSpill ? 340 : 125) * age ** 2;
    ctx.globalAlpha = (1 - age / s.life) * .7;
    oval(ctx, x, y, isSpill ? 1.15 : .87, isSpill ? 2.5 : 1, '#e6f1da');
  }
  ctx.globalAlpha = 1;
  if (basin.overflow > .02) {
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = `rgba(214,236,219,${basin.overflow * .72})`;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      const x = bath.x + side * bath.scale * 39;
      ctx.moveTo(x, bath.y + 6);
      ctx.quadraticCurveTo(x + side * 4, bath.y + 18, x + side * 4, bath.y + 26 + basin.overflow * 9);
    }
    ctx.stroke();
  }
}

function paint() {
  ctx.clearRect(0, 0, view.width, HEIGHT);
  if (running) {
    paintSoil();
    drawCat(ctx, cat, reduced.matches ? 0 : time);
  }
  birdbath(ctx, bath, basin, reduced.matches ? 0 : time);
  if (!running || !pose) return;
  paintWater();
  drawHose(ctx, pose, flowing && !guide.open, time);
}

function renderHUD() {
  const left = Math.max(0, Math.ceil(-view.left / view.plateWidth * COLS));
  const right = Math.min(COLS, Math.floor((view.width - view.left) / view.plateWidth * COLS));
  const covered = soil.coverage(left, right, ROWS - 3);
  const fill = Math.floor(basin.level * 100);
  lawnMeter.value = covered;
  bathMeter.value = fill;
  coverageOutput.textContent = covered > 0 && covered < .5 ? '<1%' : `${Math.round(covered)}%`;
  bathOutput.textContent = basin.overflow > .12 ? 'Overflow' : fill === 100 ? 'Full' : fill ? `${fill}%` : 'Empty';
}

function frame(now) {
  const dt = Math.min((now - (previous || now)) / 1000, .05);
  previous = now;
  if (running && !guide.open) update(dt);
  if (now >= nextHUD) {
    if (running) renderHUD();
    audio.update(running && flowing && !guide.open, pressure, nozzle, !document.hidden);
    nextHUD = now + 110;
  }
  paint();
  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);
