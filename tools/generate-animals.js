// Generates the 9 "animal cast" characters used across animal-sounds,
// animal-quiz, gacha, and night-safari (dog/cat/cow/frog/pig/chicken/
// lion/elephant/sheep) - previously plain emoji, now full-body chibi
// characters in the same hand-rolled zero-dependency PNG pipeline as
// generate-characters.js, so every animal in the app reads consistently
// as "a character with a body" rather than a mix of portraits and emoji.
'use strict';
const fs = require('fs');
const path = require('path');
const {
  makeCanvas,
  fillCircle,
  fillEllipse,
  fillPolygon,
  strokeLine,
  smileArc,
  earTriangle,
  canvasToPNG,
} = require('./lib/pixel-canvas');

const INK = '#4A3B78';

function fillCircleOutlined(cv, cx, cy, r, fillColor, outlineColor, outlineWidth) {
  fillCircle(cv, cx, cy, r + outlineWidth, outlineColor);
  fillCircle(cv, cx, cy, r, fillColor);
}

function drawEyes(cv, cx, cy, r, eyeDX = 0.32, eyeY = -0.02) {
  fillCircle(cv, cx - r * eyeDX, cy + r * eyeY, r * 0.12, INK);
  fillCircle(cv, cx + r * eyeDX, cy + r * eyeY, r * 0.12, INK);
  fillCircle(cv, cx - r * eyeDX + r * 0.038, cy + r * eyeY - r * 0.038, r * 0.042, '#FFFFFF');
  fillCircle(cv, cx + r * eyeDX + r * 0.038, cy + r * eyeY - r * 0.038, r * 0.042, '#FFFFFF');
}

function drawBlush(cv, cx, cy, r, color = '#FFB0C8') {
  fillCircle(cv, cx - r * 0.55, cy + r * 0.2, r * 0.15, color, 0.65);
  fillCircle(cv, cx + r * 0.55, cy + r * 0.2, r * 0.15, color, 0.65);
}

// A real four-legged animal stance (wide horizontal torso, four legs
// evenly spaced underneath) rather than the upright two-arm/two-leg body
// used for the mascot cast (tools/generate-characters.js) - the mascots are
// guide characters that make sense standing like a person, but the animal
// roster should look like actual animals (a sheep standing on four legs,
// not a sheep standing on two). Legs are drawn first so the torso overlaps
// their tops and only the lower "foot" ends peek out below the body.
function drawQuadrupedBody(cv, cx, headCy, headR, bodyColor, outlineColor, footColor) {
  const neckY = headCy + headR * 0.76;
  const bodyRx = headR * 1.05;
  const bodyRy = headR * 0.5;
  const bodyCy = neckY + bodyRy * 0.55;

  const legRx = headR * 0.15;
  const legRy = headR * 0.34;
  const legCy = bodyCy + bodyRy * 0.55;
  [-0.7, -0.24, 0.24, 0.7].forEach((fx) => {
    fillEllipse(cv, cx + fx * bodyRx, legCy, legRx, legRy, 0, footColor);
  });

  fillEllipse(cv, cx, bodyCy, bodyRx + headR * 0.035, bodyRy + headR * 0.035, 0, outlineColor);
  fillEllipse(cv, cx, bodyCy, bodyRx, bodyRy, 0, bodyColor);

  return { bodyCy, bodyRx, bodyRy };
}

function drawDog(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.44, r = size * 0.31;
  const fur = '#E8B372', outline = '#C9925A', earColor = '#C9925A', snoutColor = '#FBEBD8';

  drawQuadrupedBody(cv, cx, cy, r, fur, outline, outline);

  fillEllipse(cv, cx - r * 0.92, cy - r * 0.05, r * 0.3, r * 0.62, 0.35, earColor);
  fillEllipse(cv, cx + r * 0.92, cy - r * 0.05, r * 0.3, r * 0.62, -0.35, earColor);

  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);

  fillEllipse(cv, cx, cy + r * 0.32, r * 0.4, r * 0.28, 0, snoutColor);
  fillCircle(cv, cx, cy + r * 0.12, r * 0.09, '#5B3A29');

  drawEyes(cv, cx, cy, r);
  drawBlush(cv, cx, cy, r, '#FFC3A0');
  smileArc(cv, cx, cy + r * 0.32, r * 0.24, r * 0.15, r * 0.08, '#B4622F');
  return canvasToPNG(cv);
}

function drawCat(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.44, r = size * 0.31;
  const fur = '#FFEFD9', outline = '#E9C9A0', patch = '#F4A94F';

  drawQuadrupedBody(cv, cx, cy, r, fur, outline, outline);

  fillPolygon(cv, earTriangle(cx, cy, r, -125, 0.8, 0.62, 0.62), outline);
  fillPolygon(cv, earTriangle(cx, cy, r, -55, 0.8, 0.62, 0.62), outline);
  fillPolygon(cv, earTriangle(cx, cy, r, -125, 0.85, 0.42, 0.45), fur);
  fillPolygon(cv, earTriangle(cx, cy, r, -55, 0.85, 0.42, 0.45), fur);
  fillPolygon(cv, earTriangle(cx, cy, r, -125, 0.9, 0.2, 0.28), '#FFC2D6');
  fillPolygon(cv, earTriangle(cx, cy, r, -55, 0.9, 0.2, 0.28), '#FFC2D6');

  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);
  fillCircle(cv, cx + r * 0.58, cy - r * 0.55, r * 0.26, patch, 0.9);

  const whiskerY = cy + r * 0.3;
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 3; i++) {
      const fan = (i - 1) * r * 0.1;
      strokeLine(cv, cx + side * r * 0.14, whiskerY + fan * 0.3, cx + side * r * 0.88, whiskerY + fan, r * 0.025, '#D8B896');
    }
  });

  fillPolygon(cv, [[cx - r * 0.06, cy + r * 0.16], [cx + r * 0.06, cy + r * 0.16], [cx, cy + r * 0.24]], '#FF9FC0');
  drawEyes(cv, cx, cy, r);
  drawBlush(cv, cx, cy, r, '#FFC2D6');
  smileArc(cv, cx, cy + r * 0.3, r * 0.28, r * 0.18, r * 0.09, '#E8895F');
  return canvasToPNG(cv);
}

function drawCow(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.44, r = size * 0.31;
  const fur = '#FDFBF5', outline = '#D8D0C0', patch = '#6B5B4A', snoutColor = '#FFC7D6', hornColor = '#F0E4D0';

  drawQuadrupedBody(cv, cx, cy, r, fur, outline, outline);

  fillEllipse(cv, cx - r * 0.4, cy - r * 0.98, r * 0.14, r * 0.24, -0.2, hornColor);
  fillEllipse(cv, cx + r * 0.4, cy - r * 0.98, r * 0.14, r * 0.24, 0.2, hornColor);
  fillCircleOutlined(cv, cx - r * 0.88, cy - r * 0.35, r * 0.2, fur, outline, r * 0.025);
  fillCircleOutlined(cv, cx + r * 0.88, cy - r * 0.35, r * 0.2, fur, outline, r * 0.025);

  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);
  fillCircle(cv, cx - r * 0.5, cy - r * 0.4, r * 0.26, patch, 0.85);
  fillCircle(cv, cx + r * 0.6, cy + r * 0.5, r * 0.22, patch, 0.85);

  fillEllipse(cv, cx, cy + r * 0.42, r * 0.44, r * 0.3, 0, snoutColor);
  fillCircle(cv, cx - r * 0.14, cy + r * 0.42, r * 0.055, '#B4667A');
  fillCircle(cv, cx + r * 0.14, cy + r * 0.42, r * 0.055, '#B4667A');

  drawEyes(cv, cx, cy, r, 0.32, -0.08);
  drawBlush(cv, cx, cy, r, '#FFC2D6');
  return canvasToPNG(cv);
}

function drawFrog(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.46, r = size * 0.31;
  const skin = '#8BC34A', outline = '#5E8F2E', belly = '#DFF3BC';

  drawQuadrupedBody(cv, cx, cy, r, skin, outline, outline);
  fillCircleOutlined(cv, cx, cy, r, skin, outline, r * 0.035);
  fillEllipse(cv, cx, cy + r * 0.58, r * 0.5, r * 0.3, 0, belly);

  // bulging eyes on top of the head
  fillCircleOutlined(cv, cx - r * 0.42, cy - r * 0.78, r * 0.26, skin, outline, r * 0.03);
  fillCircleOutlined(cv, cx + r * 0.42, cy - r * 0.78, r * 0.26, skin, outline, r * 0.03);
  fillCircle(cv, cx - r * 0.42, cy - r * 0.78, r * 0.13, INK);
  fillCircle(cv, cx + r * 0.42, cy - r * 0.78, r * 0.13, INK);
  fillCircle(cv, cx - r * 0.42 + r * 0.04, cy - r * 0.82, r * 0.045, '#FFFFFF');
  fillCircle(cv, cx + r * 0.42 + r * 0.04, cy - r * 0.82, r * 0.045, '#FFFFFF');

  drawBlush(cv, cx, cy, r, '#FFC2D6');
  smileArc(cv, cx, cy + r * 0.16, r * 0.34, r * 0.16, r * 0.08, '#3E6B1E');
  return canvasToPNG(cv);
}

function drawPig(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.44, r = size * 0.31;
  const fur = '#FFB3C6', outline = '#E8899E', snoutColor = '#FF8FA8';

  drawQuadrupedBody(cv, cx, cy, r, fur, outline, outline);

  fillPolygon(cv, earTriangle(cx, cy, r, -120, 0.75, 0.42, 0.4), outline);
  fillPolygon(cv, earTriangle(cx, cy, r, -60, 0.75, 0.42, 0.4), outline);
  fillPolygon(cv, earTriangle(cx, cy, r, -120, 0.8, 0.28, 0.28), fur);
  fillPolygon(cv, earTriangle(cx, cy, r, -60, 0.8, 0.28, 0.28), fur);

  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);
  fillEllipse(cv, cx, cy + r * 0.36, r * 0.36, r * 0.26, 0, snoutColor);
  fillCircle(cv, cx - r * 0.13, cy + r * 0.36, r * 0.06, '#C2607A');
  fillCircle(cv, cx + r * 0.13, cy + r * 0.36, r * 0.06, '#C2607A');

  drawEyes(cv, cx, cy, r);
  drawBlush(cv, cx, cy, r, '#FF9FC0');
  return canvasToPNG(cv);
}

function drawChicken(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.44, r = size * 0.31;
  const feather = '#FFF6E6', outline = '#E8DCC0', comb = '#FF6B5B', beak = '#F4A94F';

  drawQuadrupedBody(cv, cx, cy, r, feather, outline, beak);

  [-1, 0, 1].forEach((i) => fillCircle(cv, cx + i * r * 0.16, cy - r * 1.02, r * 0.18, comb));
  fillCircleOutlined(cv, cx, cy, r, feather, outline, r * 0.035);
  fillPolygon(cv, [[cx - r * 0.03, cy + r * 0.42], [cx + r * 0.03, cy + r * 0.42], [cx, cy + r * 0.52]], comb);
  fillPolygon(cv, [[cx - r * 0.15, cy + r * 0.24], [cx + r * 0.15, cy + r * 0.24], [cx, cy + r * 0.4]], beak);

  drawEyes(cv, cx, cy, r, 0.3, -0.1);
  drawBlush(cv, cx, cy, r, '#FFC2D6');
  return canvasToPNG(cv);
}

function drawLion(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.44, r = size * 0.31;
  const fur = '#F2B84B', outline = '#D89A2E', mane = '#E08A2E', snoutColor = '#FBEBD8';

  drawQuadrupedBody(cv, cx, cy, r, fur, outline, outline);

  const maneCount = 14;
  for (let i = 0; i < maneCount; i++) {
    const a = (i / maneCount) * Math.PI * 2;
    fillCircle(cv, cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 1.12, r * 0.26, mane);
  }
  fillCircleOutlined(cv, cx - r * 0.8, cy - r * 0.7, r * 0.24, fur, outline, r * 0.03);
  fillCircleOutlined(cv, cx + r * 0.8, cy - r * 0.7, r * 0.24, fur, outline, r * 0.03);

  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);
  fillEllipse(cv, cx, cy + r * 0.3, r * 0.42, r * 0.3, 0, snoutColor);
  fillCircle(cv, cx, cy + r * 0.1, r * 0.08, '#8A5A32');

  drawEyes(cv, cx, cy, r);
  drawBlush(cv, cx, cy, r, '#FFC3A0');
  smileArc(cv, cx, cy + r * 0.3, r * 0.24, r * 0.15, r * 0.08, '#B4622F');
  return canvasToPNG(cv);
}

function drawElephant(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.44, r = size * 0.31;
  const fur = '#C3CAD3', outline = '#9AA5B0';

  drawQuadrupedBody(cv, cx, cy, r, fur, outline, outline);

  fillEllipse(cv, cx - r * 1.0, cy - r * 0.08, r * 0.48, r * 0.6, 0.12, outline);
  fillEllipse(cv, cx + r * 1.0, cy - r * 0.08, r * 0.48, r * 0.6, -0.12, outline);
  fillEllipse(cv, cx - r * 0.98, cy - r * 0.08, r * 0.38, r * 0.5, 0.12, fur);
  fillEllipse(cv, cx + r * 0.98, cy - r * 0.08, r * 0.38, r * 0.5, -0.12, fur);

  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);

  // trunk, curving down from the middle of the face - outlined so it reads
  // as its own feature instead of blending into the head/body seam below.
  strokeLine(cv, cx, cy + r * 0.28, cx - r * 0.1, cy + r * 0.74, r * 0.28, outline);
  strokeLine(cv, cx - r * 0.1, cy + r * 0.74, cx + r * 0.14, cy + r * 1.08, r * 0.24, outline);
  strokeLine(cv, cx, cy + r * 0.28, cx - r * 0.1, cy + r * 0.74, r * 0.2, fur);
  strokeLine(cv, cx - r * 0.1, cy + r * 0.74, cx + r * 0.14, cy + r * 1.08, r * 0.16, fur);
  fillCircleOutlined(cv, cx + r * 0.14, cy + r * 1.08, r * 0.1, fur, outline, r * 0.02);

  drawEyes(cv, cx, cy, r, 0.34, -0.14);
  drawBlush(cv, cx, cy, r, '#FFC2D6');
  return canvasToPNG(cv);
}

function drawSheep(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.44, r = size * 0.31;
  const wool = '#FDFBF5', woolOutline = '#E4DED0', face = '#8D7B6B', faceOutline = '#6E5E50';

  drawQuadrupedBody(cv, cx, cy, r, wool, woolOutline, faceOutline);

  const woolCount = 10;
  for (let i = 0; i < woolCount; i++) {
    const a = (i / woolCount) * Math.PI * 2;
    fillCircle(cv, cx + Math.cos(a) * r * 1.02, cy + Math.sin(a) * r * 1.02, r * 0.32, wool);
  }
  fillCircleOutlined(cv, cx - r * 0.88, cy + r * 0.15, r * 0.18, face, faceOutline, r * 0.02);
  fillCircleOutlined(cv, cx + r * 0.88, cy + r * 0.15, r * 0.18, face, faceOutline, r * 0.02);

  fillCircleOutlined(cv, cx, cy, r * 0.82, face, faceOutline, r * 0.03);

  fillCircle(cv, cx - r * 0.28, cy - r * 0.02, r * 0.1, INK);
  fillCircle(cv, cx + r * 0.28, cy - r * 0.02, r * 0.1, INK);
  fillCircle(cv, cx - r * 0.28 + r * 0.032, cy - r * 0.06, r * 0.035, '#FFFFFF');
  fillCircle(cv, cx + r * 0.28 + r * 0.032, cy - r * 0.06, r * 0.035, '#FFFFFF');
  drawBlush(cv, cx, cy, r * 0.82, '#FFC2D6');
  smileArc(cv, cx, cy + r * 0.24, r * 0.2, r * 0.13, r * 0.07, '#5A4A3D');
  return canvasToPNG(cv);
}

const outDir = path.join(__dirname, '..', 'icons', 'animals');
fs.mkdirSync(outDir, { recursive: true });

const SIZE = 320;
const animals = [
  { file: 'dog.png', draw: drawDog },
  { file: 'cat.png', draw: drawCat },
  { file: 'cow.png', draw: drawCow },
  { file: 'frog.png', draw: drawFrog },
  { file: 'pig.png', draw: drawPig },
  { file: 'chicken.png', draw: drawChicken },
  { file: 'lion.png', draw: drawLion },
  { file: 'elephant.png', draw: drawElephant },
  { file: 'sheep.png', draw: drawSheep },
];

for (const a of animals) {
  const png = a.draw(SIZE);
  fs.writeFileSync(path.join(outDir, a.file), png);
  console.log('wrote', a.file, png.length, 'bytes');
}
