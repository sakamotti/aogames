// Dependency-free PWA icon generator.
// Draws a friendly rounded "sun" mascot (gradient circle + star) and hand-encodes
// it to PNG using only Node's built-in zlib, so no image libraries/costs are needed.
'use strict';
const fs = require('fs');
const path = require('path');
const {
  makeCanvas,
  fillRoundedRectGradient,
  fillSquareGradient,
  fillCircle,
  fillStar,
  smileArc,
  canvasToPNG,
} = require('./lib/pixel-canvas');

function drawMascot(size, { maskable }) {
  const cv = makeCanvas(size, size);
  const bgA = '#FFB84D';
  const bgB = '#FF6FA5';
  if (maskable) {
    fillSquareGradient(cv, bgA, bgB);
  } else {
    fillRoundedRectGradient(cv, size * 0.2, bgA, bgB);
  }

  // Content scale: maskable icons need to stay inside the ~80% safe-zone circle.
  const scale = maskable ? 0.62 : 0.82;
  const cx = size / 2, cy = size / 2;
  const faceR = size * 0.5 * scale;

  // face
  fillCircle(cv, cx, cy + faceR * 0.05, faceR, '#FFFFFF');
  // star behind face for a little "sparkle" flourish
  fillStar(cv, cx, cy - faceR * 1.05, faceR * 0.34, faceR * 0.14, '#FFE072');
  fillStar(cv, cx + faceR * 1.05, cy - faceR * 0.55, faceR * 0.22, faceR * 0.09, '#FFE072');

  // cheeks
  fillCircle(cv, cx - faceR * 0.55, cy + faceR * 0.25, faceR * 0.16, '#FF9FC0', 0.7);
  fillCircle(cv, cx + faceR * 0.55, cy + faceR * 0.25, faceR * 0.16, '#FF9FC0', 0.7);

  // eyes
  const eyeY = cy - faceR * 0.12;
  const eyeDX = faceR * 0.36;
  fillCircle(cv, cx - eyeDX, eyeY, faceR * 0.13, '#4A3B78');
  fillCircle(cv, cx + eyeDX, eyeY, faceR * 0.13, '#4A3B78');
  fillCircle(cv, cx - eyeDX + faceR * 0.04, eyeY - faceR * 0.04, faceR * 0.045, '#FFFFFF');
  fillCircle(cv, cx + eyeDX + faceR * 0.04, eyeY - faceR * 0.04, faceR * 0.045, '#FFFFFF');

  // smile
  smileArc(cv, cx, cy + faceR * 0.22, faceR * 0.42, faceR * 0.3, faceR * 0.16, '#FF6FA5');

  return canvasToPNG(cv);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'favicon-32.png', size: 32, maskable: false },
];

for (const job of jobs) {
  const png = drawMascot(job.size, { maskable: job.maskable });
  fs.writeFileSync(path.join(outDir, job.file), png);
  console.log('wrote', job.file, png.length, 'bytes');
}
