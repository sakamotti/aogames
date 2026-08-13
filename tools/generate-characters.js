// Generates three ORIGINAL mascot characters for the app (not likenesses of
// any existing copyrighted character). Same hand-rolled PNG pipeline as
// generate-icons.js - zero image libraries, zero cost.
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

// A friendly standing body drawn beneath the head. The body is large enough
// to read as a real character at small sizes, while the head remains the
// visual focus for toddlers. It is drawn first so the head overlaps the
// shoulders instead of looking like two stacked circles.
function drawStandingBody(cv, cx, headCy, headR, bodyColor, outlineColor, footColor) {
  const bodyRx = headR * 0.84;
  const bodyRy = headR * 0.62;
  const bodyCy = headCy + headR * 1.16;

  fillEllipse(cv, cx - bodyRx * 0.5, bodyCy + bodyRy * 0.86, headR * 0.24, headR * 0.15, 0.08, footColor);
  fillEllipse(cv, cx + bodyRx * 0.5, bodyCy + bodyRy * 0.86, headR * 0.24, headR * 0.15, -0.08, footColor);

  fillEllipse(cv, cx - bodyRx * 0.98, bodyCy - bodyRy * 0.05, headR * 0.2, headR * 0.36, 0.4, bodyColor);
  fillEllipse(cv, cx + bodyRx * 0.98, bodyCy - bodyRy * 0.05, headR * 0.2, headR * 0.36, -0.4, bodyColor);

  fillEllipse(cv, cx, bodyCy, bodyRx + headR * 0.035, bodyRy + headR * 0.035, 0, outlineColor);
  fillEllipse(cv, cx, bodyCy, bodyRx, bodyRy, 0, bodyColor);

  return { bodyCy, bodyRx, bodyRy };
}

function drawFace(cv, cx, cy, r, { blush = '#FFB0C8', mouth = '#FF6FA5' } = {}) {
  const eyeY = cy - r * 0.02;
  const eyeDX = r * 0.32;
  fillCircle(cv, cx - r * 0.55, cy + r * 0.2, r * 0.15, blush, 0.65);
  fillCircle(cv, cx + r * 0.55, cy + r * 0.2, r * 0.15, blush, 0.65);
  fillCircle(cv, cx - eyeDX, eyeY, r * 0.12, INK);
  fillCircle(cv, cx + eyeDX, eyeY, r * 0.12, INK);
  fillCircle(cv, cx - eyeDX + r * 0.038, eyeY - r * 0.038, r * 0.042, '#FFFFFF');
  fillCircle(cv, cx + eyeDX + r * 0.038, eyeY - r * 0.038, r * 0.042, '#FFFFFF');
  smileArc(cv, cx, cy + r * 0.3, r * 0.28, r * 0.18, r * 0.09, mouth);
}

function drawBear(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.31, r = size * 0.27;
  const fur = '#E3A76F';
  const furDark = '#C98B57';
  const outline = '#B87A45';
  const snoutColor = '#FBEBD8';

  drawStandingBody(cv, cx, cy, r, fur, outline, furDark);

  // ears (behind head, positioned so most of the circle peeks past the head edge)
  fillCircleOutlined(cv, cx - r * 0.82, cy - r * 0.68, r * 0.34, fur, outline, r * 0.03);
  fillCircleOutlined(cv, cx + r * 0.82, cy - r * 0.68, r * 0.34, fur, outline, r * 0.03);
  fillCircle(cv, cx - r * 0.82, cy - r * 0.68, r * 0.16, furDark);
  fillCircle(cv, cx + r * 0.82, cy - r * 0.68, r * 0.16, furDark);

  // head
  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);

  // snout + nose
  fillEllipse(cv, cx, cy + r * 0.3, r * 0.46, r * 0.34, 0, snoutColor);
  fillCircle(cv, cx, cy + r * 0.08, r * 0.09, '#5B3A29');

  drawFace(cv, cx, cy, r, { blush: '#FFC3A0', mouth: '#B4622F' });
  return canvasToPNG(cv);
}

function drawCat(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.31, r = size * 0.27;
  const fur = '#FFEFD9';
  const outline = '#E9C9A0';
  const patch = '#F4A94F';

  drawStandingBody(cv, cx, cy, r, fur, outline, outline);

  // ears (triangles, mostly peeking above the head edge)
  fillPolygon(cv, earTriangle(cx, cy, r, -125, 0.8, 0.62, 0.62), outline);
  fillPolygon(cv, earTriangle(cx, cy, r, -55, 0.8, 0.62, 0.62), outline);
  fillPolygon(cv, earTriangle(cx, cy, r, -125, 0.85, 0.42, 0.45), fur);
  fillPolygon(cv, earTriangle(cx, cy, r, -55, 0.85, 0.42, 0.45), fur);
  fillPolygon(cv, earTriangle(cx, cy, r, -125, 0.9, 0.2, 0.28), '#FFC2D6');
  fillPolygon(cv, earTriangle(cx, cy, r, -55, 0.9, 0.2, 0.28), '#FFC2D6');

  // head
  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);

  // calico patch (small, tucked near the ear so it reads as fur marking)
  fillCircle(cv, cx + r * 0.58, cy - r * 0.55, r * 0.26, patch, 0.9);

  // whiskers
  const whiskerY = cy + r * 0.3;
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 3; i++) {
      const fan = (i - 1) * r * 0.1;
      strokeLine(
        cv,
        cx + side * r * 0.14, whiskerY + fan * 0.3,
        cx + side * r * 0.88, whiskerY + fan,
        r * 0.025,
        '#D8B896'
      );
    }
  });

  // nose
  fillPolygon(cv, [
    [cx - r * 0.06, cy + r * 0.16],
    [cx + r * 0.06, cy + r * 0.16],
    [cx, cy + r * 0.24],
  ], '#FF9FC0');

  drawFace(cv, cx, cy, r, { blush: '#FFC2D6', mouth: '#E8895F' });
  return canvasToPNG(cv);
}

function drawRabbit(size) {
  const cv = makeCanvas(size, size);
  const cx = size * 0.5, cy = size * 0.31, r = size * 0.27;
  const fur = '#FFF8FA';
  const outline = '#F3C9D8';
  const inner = '#FFC2D6';

  drawStandingBody(cv, cx, cy, r, fur, outline, inner);

  // ears (long ellipses, behind head)
  fillEllipse(cv, cx - r * 0.42, cy - r * 1.02, r * 0.28, r * 0.34, -0.18, outline);
  fillEllipse(cv, cx + r * 0.42, cy - r * 1.02, r * 0.28, r * 0.34, 0.18, outline);
  fillEllipse(cv, cx - r * 0.42, cy - r * 0.98, r * 0.24, r * 0.82, -0.18, fur);
  fillEllipse(cv, cx + r * 0.42, cy - r * 0.98, r * 0.24, r * 0.82, 0.18, fur);
  fillEllipse(cv, cx - r * 0.42, cy - r * 0.95, r * 0.12, r * 0.58, -0.18, inner);
  fillEllipse(cv, cx + r * 0.42, cy - r * 0.95, r * 0.12, r * 0.58, 0.18, inner);

  // head
  fillCircleOutlined(cv, cx, cy, r, fur, outline, r * 0.035);

  // cheek fluff
  fillEllipse(cv, cx - r * 0.75, cy + r * 0.18, r * 0.2, r * 0.16, 0, fur);
  fillEllipse(cv, cx + r * 0.75, cy + r * 0.18, r * 0.2, r * 0.16, 0, fur);

  // nose
  fillPolygon(cv, [
    [cx - r * 0.05, cy + r * 0.12],
    [cx + r * 0.05, cy + r * 0.12],
    [cx, cy + r * 0.19],
  ], '#FF8FB3');

  drawFace(cv, cx, cy, r, { blush: '#FFC2D6', mouth: '#FF6FA5' });
  return canvasToPNG(cv);
}

const outDir = path.join(__dirname, '..', 'icons', 'characters');
fs.mkdirSync(outDir, { recursive: true });

const SIZE = 320;
const characters = [
  { file: 'kuma.png', draw: drawBear },
  { file: 'neko.png', draw: drawCat },
  { file: 'usagi.png', draw: drawRabbit },
];

for (const c of characters) {
  const png = c.draw(SIZE);
  fs.writeFileSync(path.join(outDir, c.file), png);
  console.log('wrote', c.file, png.length, 'bytes');
}
