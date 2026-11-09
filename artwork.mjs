const paths = new Map();

function shape(ctx, outline, fill, stroke, width = 1) {
  if (!paths.has(outline)) paths.set(outline, new Path2D(outline));
  const path = paths.get(outline);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
  if (stroke) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.stroke(path);
  }
}

function gradient(ctx, x, y, x2, y2, colours) {
  const result = ctx.createLinearGradient(x, y, x2, y2);
  colours.forEach(([stop, colour]) => result.addColorStop(stop, colour));
  return result;
}

export function oval(ctx, x, y, w, h, fill, stroke, width = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

export function birdbath(ctx, bath, basin, time) {
  ctx.save();
  ctx.translate(bath.x, bath.y);
  ctx.scale(bath.scale, bath.scale);
  oval(ctx, 15, 73, 54, 10, '#14211848');
  const stone = gradient(ctx, -34, 0, 33, 16, [[0, '#c5ac87'], [.32, '#9e9275'], [.7, '#746c57'], [1, '#4e554a']]);
  const bowl = gradient(ctx, 0, -4, 3, 27, [[0, '#a4977b'], [.55, '#7b705b'], [1, '#484d41']]);
  shape(ctx, 'M-25 69 Q-23 63 -12 59 Q-8 51 -9 37 L-14 22 Q0 15 13 22 L10 39 Q9 53 15 59 Q24 63 28 69 Q26 78 1 78 Q-23 77 -25 69Z', stone);
  shape(ctx, 'M-20 67 Q-2 72 21 67 M-11 57 Q-1 62 11 57 M-6 37 Q-7 48 -4 54', null, '#e1c7a66b', 1.2);
  shape(ctx, 'M-46 0 Q-41 22 -19 27 Q0 33 20 26 Q43 22 46 0Z', bowl, '#4d4e3f', 1.1);
  oval(ctx, 0, 0, 46, 13, '#c4af8e', '#575343');
  oval(ctx, 0, .3, 40, 9.5, '#686951');
  oval(ctx, 0, 1.6, 37, 8.1, '#82775d');
  if (basin.level > .01) {
    const water = gradient(ctx, 0, -6, 0, 10, [[0, '#e4c7b4'], [.43, '#9ebbb2'], [1, '#566e6a']]);
    const level = Math.sqrt(basin.level);
    oval(ctx, 0, 5 - 4 * level, 37.8 * level, 1 + 7.4 * level, water);
    for (let i = 0; i < 3; i++) {
      const t = (time * 1.04 + i / 3) % 1;
      oval(ctx, 0, 2, (4 + 26 * t) * level, (1.1 + 5.1 * t) * level, null, `rgba(251,241,206,${.43 * (1 - t)})`, .65);
    }
  }
  shape(ctx, 'M-44 2 Q-26 17 17 11 Q35 9 44 2 M-43 -2 Q-30 -12 -9 -12', null, '#f4d9ac9e', 1.35);
  shape(ctx, 'M-36 11l8 3m-5 0 12 4m26 4 7-1m-32 1 8 1m39-12 7-3m-47 48 1-8m14 12 5 2', null, '#e1c7a64a', .8);
  ctx.restore();
}

const nozzleAxis = Math.atan2(-18, -30);
const wristLocal = { x: 96, y: 87 };

export function hosePose(wrist, directionPoint, width) {
  const scale = Math.min(1.07, Math.max(.59, width / 465));
  const dx = directionPoint.x - wrist.x;
  const dy = directionPoint.y - wrist.y;
  // The outlet sits off the wrist's centreline. Account for that offset so
  // the barrel and the water's launch direction line up at every angle.
  const lateral = (wristLocal.x * Math.sin(nozzleAxis) - wristLocal.y * Math.cos(nozzleAxis)) * scale;
  const heading = Math.atan2(dy, dx) - Math.asin(lateral / Math.hypot(dx, dy));
  const turn = heading - nozzleAxis;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const mouth = {
    x: wrist.x - (wristLocal.x * cos - wristLocal.y * sin) * scale,
    y: wrist.y - (wristLocal.x * sin + wristLocal.y * cos) * scale,
  };
  return { mouth, heading, turn, scale, wrist };
}

export function drawHose(ctx, pose, active, time) {
  const { mouth, turn, scale, wrist } = pose;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const project = (x, y) => ({
    x: mouth.x + (x * cos - y * sin) * scale,
    y: mouth.y + (x * sin + y * cos) * scale,
  });
  const connector = project(66, 83);
  const bend = project(91, 118);
  const exitX = wrist.x + 92 * scale;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(connector.x, connector.y);
  ctx.bezierCurveTo(bend.x, bend.y, exitX - 45, 670, exitX, 748);
  for (const [colour, thickness] of [['#15281d', 22], ['#506943', 15], ['#8b9b62', 3]]) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = thickness * scale;
    ctx.stroke();
  }
  ctx.restore();

  const wristA = project(89, 71);
  const wristB = project(79, 100);
  const [left, right] = wristA.x < wristB.x ? [wristA, wristB] : [wristB, wristA];
  const wristX = (left.x + right.x) / 2;
  const wristY = (left.y + right.y) / 2;
  const armX = wrist.x + 33 * scale;
  const armY = Math.max(752, wristY + 70 * scale);
  const midY = wristY + (armY - wristY) * .56;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.quadraticCurveTo(wristX - 12 * scale, midY, armX - 42 * scale, armY);
  ctx.lineTo(armX + 40 * scale, armY);
  ctx.quadraticCurveTo(wristX + 49 * scale, midY, right.x, right.y);
  ctx.closePath();
  ctx.fillStyle = gradient(ctx, wristX - 25 * scale, wristY, armX + 20 * scale, armY,
    [[0, '#95967a'], [.4, '#59664f'], [1, '#34463a']]);
  ctx.fill();
  ctx.strokeStyle = '#314038';
  ctx.lineWidth = 1.4 * scale;
  ctx.stroke();

  ctx.save();
  ctx.translate(mouth.x, mouth.y);
  ctx.rotate(turn);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const skin = gradient(ctx, 64, 37, 118, 101, [[0, '#ebba91'], [.31, '#d99770'], [.7, '#ac6e54'], [1, '#70493d']]);
  shape(ctx, 'M58 42 Q70 34 81 47 Q86 54 88 61 L113 80 Q115 93 99 105 Q83 95 70 91 Q54 88 50 77 Q45 62 58 42Z', skin, '#754c3d', 1.25);

  const grip = gradient(ctx, 35, 23, 76, 72, [[0, '#6c755e'], [.41, '#3e4b3c'], [1, '#202f28']]);
  shape(ctx, 'M36 14 Q57 12 63 28 L72 61 Q77 73 69 81 L57 85 Q50 87 47 78 L40 53 Q35 43 25 38Z', grip, '#182b24', 1.5);
  shape(ctx, 'M49 48l15-4m-12 10 14-4m-12 11 13-4m-10 11 12-4 M43 38q12-4 17-6', null, '#99a28b73', 1.4);
  shape(ctx, 'M52 78l19-7 5 9-19 10Z', '#a27b49', '#453d2f', 1.3);
  shape(ctx, 'M54 82l19-7m-17 11 19-7', null, '#d0a66b', 1);

  const brass = gradient(ctx, 12, -6, 22, 33, [[0, '#e0be79'], [.23, '#be9857'], [.62, '#916c39'], [1, '#5f4e36']]);
  shape(ctx, 'M1-7 Q13-10 18-3 L39 11 Q47 19 40 30 Q33 41 23 34 L5 17 Q-5 13 1-7Z', brass, '#413b2a', 1.35);
  shape(ctx, 'M13-5 5 16m15-15-9 21m16-16-10 22m17-17-11 22', null, '#dfbe7b94', 1.45);
  shape(ctx, 'M-4-10 Q1-14 8-8 Q13-4 6 6 Q0 15-5 11 Q-12 7-10 0Z', '#b39961', '#4d4a34', 1.4);
  shape(ctx, 'M-5-7 Q-1-11 4-6 Q5-1-2 7 Q-7 9-8 3Z', '#27352a', '#e8c883', 1);
  shape(ctx, 'M-5-4l6 2m-7 1 5 2m-6 1 4 2', null, active ? '#c6e8d9' : '#a5a083', .85);
  shape(ctx, 'M40 21 Q49 20 51 29 L55 42 Q55 49 50 50 L46 37 Q45 34 40 35Z', '#a6a780', '#3d4739', 1.2);

  // Four fingertips curl around the grip and the thumb rests on the trigger.
  shape(ctx, 'M83 60 Q77 54 68 58 L64 61 Q57 59 52 60 Q47 62 49 67 L54 70 Q47 70 47 75 Q49 80 57 81 Q51 82 54 87 Q58 92 71 92 Q86 92 92 80Z', skin, '#83513e', 1.15);
  shape(ctx, 'M86 62 Q81 48 75 42 Q68 34 62 31 Q53 28 50 33 Q48 38 53 41 L62 48 Q65 51 68 58 Q71 64 79 66', skin, '#8e5843', 1.3);
  shape(ctx, 'M50 65 Q54 65 60 67 M51 74 Q57 74 64 77 M57 83 Q63 83 69 85 M53 34 Q58 33 62 36 M72 55 Q76 55 80 58', null, '#f2c19a9a', 1.15);
  shape(ctx, 'M89 78 Q94 83 98 85 M72 68 Q77 73 76 78 M87 84 Q91 91 98 94', null, '#71483775', 1);
  if (active) oval(ctx, -3, 1, 3 + Math.sin(time * 31) * .4, 1.9, '#e3f9e2a6');
  ctx.restore();
}

export function drawCat(ctx, cat, time) {
  if (!cat.active) return;
  const pace = cat.flee ? 25 : 9;
  const phase = time * pace;
  const arch = cat.startled ? 1 : 0;
  const coat = gradient(ctx, -9, -43, 9, -8, [[0, '#d5965a'], [.5, '#b97646'], [1, '#755039']]);
  ctx.save();
  ctx.translate(cat.x, cat.y);
  oval(ctx, 1, 0, 28, 4, '#14211865');
  ctx.scale(cat.direction * cat.scale, cat.scale);
  ctx.translate(0, -Math.abs(Math.sin(phase)) * (cat.flee ? 4 : 1.4));
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = i < 2 ? -14 : 16;
    const stride = Math.sin(phase + i * Math.PI * .89) * (cat.flee ? 12 : 6);
    ctx.strokeStyle = i % 2 ? '#c28956' : '#78533d';
    ctx.lineWidth = i % 2 ? 4.2 : 3.5;
    ctx.beginPath();
    ctx.moveTo(x, -14);
    ctx.quadraticCurveTo(x - stride * .6, -7, x + stride, -1 + Math.min(0, stride * .2));
    ctx.stroke();
  }
  const tail = cat.startled ? 'M-19-21Q-33-29-33-53Q-33-60-30-59' : `M-18-19Q-36 ${-20 + Math.sin(phase * .23) * 3}-38-37Q-39-45-33-46`;
  // Tail is generated from motion each frame, so it bypasses the static path cache.
  const tailPath = new Path2D(tail);
  ctx.strokeStyle = '#a26e46';
  ctx.lineWidth = 4.5;
  ctx.stroke(tailPath);
  ctx.strokeStyle = '#da9d5e';
  ctx.lineWidth = 1.3;
  ctx.stroke(tailPath);
  shape(ctx, arch ? 'M-21-16 Q-27-34-8-42 Q9-49 21-23 L25-18 Q22-9 13-9 Q4-22-5-23 Q-15-12-21-16Z' : 'M-23-16 Q-25-30-10-29 Q6-27 17-30 Q29-31 27-18 Q22-10 7-11 L-14-11 Q-22-11-23-16Z', coat, '#624832', 1);
  shape(ctx, 'M17-22 Q17-27 20-32 L19-42 Q23-44 27-35 L32-35 L36-41 L38-32 Q43-27 40-21 Q35-16 27-16 Q20-16 17-22Z', coat, '#745139', 1);
  shape(ctx, 'M24-33l-2-6 5 5m6 0 3-4v6', '#ba7d67');
  oval(ctx, 34, -27, 1.6, 1, '#f1d69c');
  oval(ctx, 40, -23, 1.1, .8, '#5b4133');
  shape(ctx, arch ? 'M-17-33l4 4m3-8 5 5m4-8 5 6m3-5 6 6' : 'M-18-26q2 4 1 8m6-10q4 3 2 8m7-7q4 4 3 7m6-8q4 3 4 7', null, '#7951398b', 1.7);
  ctx.restore();
}
