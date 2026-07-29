// Dependency-free PWA icon generator.
// Draws a friendly rounded "sun" mascot (gradient circle + star) and hand-encodes
// it to PNG using only Node's built-in zlib, so no image libraries/costs are needed.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = createCrc32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });
  const idat = chunk('IDAT', idatData);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

// ---- drawing helpers on a flat RGBA Float buffer with simple AA ----
function makeCanvas(w, h) {
  const px = new Float64Array(w * h * 4); // premultiplied-ish accumulation
  return { w, h, px };
}
function blendPixel(cv, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h || a <= 0) return;
  const i = (y * cv.w + x) * 4;
  const outA = a + cv.px[i + 3] * (1 - a);
  if (outA <= 0) return;
  cv.px[i] = (r * a + cv.px[i] * cv.px[i + 3] * (1 - a)) / outA;
  cv.px[i + 1] = (g * a + cv.px[i + 1] * cv.px[i + 3] * (1 - a)) / outA;
  cv.px[i + 2] = (b * a + cv.px[i + 2] * cv.px[i + 3] * (1 - a)) / outA;
  cv.px[i + 3] = outA;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function hex(c) {
  const n = parseInt(c.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fillRoundedRectGradient(cv, radius, colorA, colorB) {
  const [ar, ag, ab] = hex(colorA);
  const [br, bg, bb] = hex(colorB);
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      // rounded-rect coverage (distance field from a rounded box)
      const dx = Math.max(radius - x, x - (cv.w - 1 - radius), 0);
      const dy = Math.max(radius - y, y - (cv.h - 1 - radius), 0);
      const cornerDist = Math.sqrt(dx * dx + dy * dy);
      let cov = 1;
      if ((x < radius || x > cv.w - 1 - radius) && (y < radius || y > cv.h - 1 - radius)) {
        cov = clamp01(radius + 0.5 - cornerDist);
      }
      if (cov <= 0) continue;
      const t = (x / cv.w + y / cv.h) / 2;
      const r = lerp(ar, br, t), g = lerp(ag, bg, t), b = lerp(ab, bb, t);
      blendPixel(cv, x, y, r, g, b, cov);
    }
  }
}
function fillSquareGradient(cv, colorA, colorB) {
  fillRoundedRectGradient(cv, 0, colorA, colorB);
}
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function fillCircle(cv, cx, cy, r, color, alphaMul) {
  const [cr, cg, cb] = hex(color);
  const x0 = Math.max(0, Math.floor(cx - r - 2));
  const x1 = Math.min(cv.w - 1, Math.ceil(cx + r + 2));
  const y0 = Math.max(0, Math.floor(cy - r - 2));
  const y1 = Math.min(cv.h - 1, Math.ceil(cy + r + 2));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cov = clamp01(r + 0.5 - dist);
      if (cov > 0) blendPixel(cv, x, y, cr, cg, cb, cov * (alphaMul === undefined ? 1 : alphaMul));
    }
  }
}

// 5-point star polygon fill with simple per-pixel coverage via ray casting.
function starPoints(cx, cy, outerR, innerR, rotation) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = rotation + (Math.PI * i) / 5;
    pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return pts;
}
function pointInPolygon(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function fillStar(cv, cx, cy, outerR, innerR, color) {
  const pts = starPoints(cx, cy, outerR, innerR, -Math.PI / 2);
  const [cr, cg, cb] = hex(color);
  const x0 = Math.floor(cx - outerR - 1), x1 = Math.ceil(cx + outerR + 1);
  const y0 = Math.floor(cy - outerR - 1), y1 = Math.ceil(cy + outerR + 1);
  const SS = 3; // supersample for soft edges
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (pointInPolygon(pts, px, py)) hit++;
        }
      }
      const cov = hit / (SS * SS);
      if (cov > 0) blendPixel(cv, x, y, cr, cg, cb, cov);
    }
  }
}

function smileArc(cv, cx, cy, halfWidth, depth, thickness, color) {
  const [cr, cg, cb] = hex(color);
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = lerp(-halfWidth, halfWidth, t);
    const y = depth * (1 - (x / halfWidth) * (x / halfWidth));
    for (let dt = -thickness / 2; dt <= thickness / 2; dt += 0.5) {
      fillCircle(cv, cx + x, cy + y + dt, thickness / 2.6, color);
    }
  }
}

function toRGBABuffer(cv) {
  const buf = Buffer.alloc(cv.w * cv.h * 4);
  for (let i = 0; i < cv.w * cv.h; i++) {
    buf[i * 4] = Math.round(cv.px[i * 4]);
    buf[i * 4 + 1] = Math.round(cv.px[i * 4 + 1]);
    buf[i * 4 + 2] = Math.round(cv.px[i * 4 + 2]);
    buf[i * 4 + 3] = Math.round(cv.px[i * 4 + 3] * 255);
  }
  return buf;
}

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

  return encodePNG(size, size, toRGBABuffer(cv));
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
