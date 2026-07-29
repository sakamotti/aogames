// Dependency-free RGBA canvas + PNG encoder shared by every icon/character
// generator script. Pure Node (only built-in zlib), no image libraries.
'use strict';
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

// ---- flat RGBA canvas with simple alpha-compositing ----
function makeCanvas(w, h) {
  return { w, h, px: new Float64Array(w * h * 4) };
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
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function hex(c) {
  const n = parseInt(c.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fillRoundedRectGradient(cv, radius, colorA, colorB) {
  const [ar, ag, ab] = hex(colorA);
  const [br, bg, bb] = hex(colorB);
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
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

// Rotated ellipse, supersampled for clean edges regardless of aspect ratio.
function fillEllipse(cv, cx, cy, rx, ry, rotation, color, alphaMul) {
  const [cr, cg, cb] = hex(color);
  const maxR = Math.max(rx, ry);
  const x0 = Math.max(0, Math.floor(cx - maxR - 2));
  const x1 = Math.min(cv.w - 1, Math.ceil(cx + maxR + 2));
  const y0 = Math.max(0, Math.floor(cy - maxR - 2));
  const y1 = Math.min(cv.h - 1, Math.ceil(cy + maxR + 2));
  const cosR = Math.cos(-rotation), sinR = Math.sin(-rotation);
  const SS = 3;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS - cx;
          const py = y + (sy + 0.5) / SS - cy;
          const lx = px * cosR - py * sinR;
          const ly = px * sinR + py * cosR;
          if ((lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1) hit++;
        }
      }
      const cov = hit / (SS * SS);
      if (cov > 0) blendPixel(cv, x, y, cr, cg, cb, cov * (alphaMul === undefined ? 1 : alphaMul));
    }
  }
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
function fillPolygon(cv, pts, color, alphaMul) {
  const [cr, cg, cb] = hex(color);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs) - 1), x1 = Math.ceil(Math.max(...xs) + 1);
  const y0 = Math.floor(Math.min(...ys) - 1), y1 = Math.ceil(Math.max(...ys) + 1);
  const SS = 3;
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
      if (cov > 0) blendPixel(cv, x, y, cr, cg, cb, cov * (alphaMul === undefined ? 1 : alphaMul));
    }
  }
}

function starPoints(cx, cy, outerR, innerR, rotation) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = rotation + (Math.PI * i) / 5;
    pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return pts;
}
function fillStar(cv, cx, cy, outerR, innerR, color) {
  fillPolygon(cv, starPoints(cx, cy, outerR, innerR, -Math.PI / 2), color);
}

// Thick line by stamping circles along the segment - reused for whiskers,
// smile curves, simple strokes.
function strokeLine(cv, x1, y1, x2, y2, thickness, color) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 1.5));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    fillCircle(cv, lerp(x1, x2, t), lerp(y1, y2, t), thickness / 2, color);
  }
}

function smileArc(cv, cx, cy, halfWidth, depth, thickness, color) {
  const steps = 200;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = lerp(-halfWidth, halfWidth, t);
    const y = depth * (1 - (x / halfWidth) * (x / halfWidth));
    fillCircle(cv, cx + x, cy + y, thickness / 2.6, color);
  }
}

// Ear/petal-shaped triangle pointing outward from a center point - handy for
// cat ears, leaf shapes, etc. angleDeg: direction from (cx,cy), 0 = right.
function earTriangle(cx, cy, r, angleDeg, baseDist, width, height) {
  const a = (angleDeg * Math.PI) / 180;
  const dir = [Math.cos(a), Math.sin(a)];
  const perp = [-dir[1], dir[0]];
  const baseCx = cx + dir[0] * baseDist * r;
  const baseCy = cy + dir[1] * baseDist * r;
  const tipX = cx + dir[0] * (baseDist + height) * r;
  const tipY = cy + dir[1] * (baseDist + height) * r;
  const halfW = (width * r) / 2;
  return [
    [baseCx + perp[0] * halfW, baseCy + perp[1] * halfW],
    [baseCx - perp[0] * halfW, baseCy - perp[1] * halfW],
    [tipX, tipY],
  ];
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

function canvasToPNG(cv) {
  return encodePNG(cv.w, cv.h, toRGBABuffer(cv));
}

module.exports = {
  makeCanvas,
  blendPixel,
  lerp,
  clamp01,
  hex,
  fillRoundedRectGradient,
  fillSquareGradient,
  fillCircle,
  fillEllipse,
  fillPolygon,
  pointInPolygon,
  starPoints,
  fillStar,
  strokeLine,
  smileArc,
  earTriangle,
  toRGBABuffer,
  encodePNG,
  canvasToPNG,
};
