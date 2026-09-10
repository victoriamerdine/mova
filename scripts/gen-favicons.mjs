import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

// MOVA icon: rounded green tile + white "raised-arms" figure. Pure-JS raster
// (no deps) so it's reproducible. Mirrors public/icon.svg (viewBox 180).

const V = 180
const SS = 4 // supersample

function lerp(a, b, t) {
  return a + (b - a) * t
}
const TOP = [0x4f, 0xb2, 0x8f]
const BOT = [0x34, 0x86, 0x6c]

// signed distance helpers -----------------------------------------------------
function sdRoundRect(px, py, w, h, r) {
  const qx = Math.abs(px - w / 2) - (w / 2 - r)
  const qy = Math.abs(py - h / 2) - (h / 2 - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax
  const pay = py - ay
  const bax = bx - ax
  const bay = by - ay
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)))
  return Math.hypot(pax - bax * h, pay - bay * h)
}

const ARMS = [
  [44, 42, 90, 130],
  [90, 130, 136, 42],
  [90, 130, 90, 150],
]
const STROKE_HALF = 11 // stroke-width 22
const HEAD = [90, 46, 18]

function sampleFigure(x, y) {
  let d = Math.hypot(x - HEAD[0], y - HEAD[1]) - HEAD[2]
  for (const [ax, ay, bx, by] of ARMS) d = Math.min(d, sdSegment(x, y, ax, ay, bx, by) - STROKE_HALF)
  return d // <0 inside
}

function render(size) {
  const W = size
  const buf = Buffer.alloc(W * W * 4)
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = ((x + (sx + 0.5) / SS) / W) * V
          const fy = ((y + (sy + 0.5) / SS) / W) * V
          const inTile = sdRoundRect(fx, fy, V, V, 40) <= 0
          if (!inTile) continue
          const inFig = sampleFigure(fx, fy) <= 0
          a += 255
          if (inFig) {
            r += 255
            g += 255
            b += 255
          } else {
            const t = fy / V
            r += lerp(TOP[0], BOT[0], t)
            g += lerp(TOP[1], BOT[1], t)
            b += lerp(TOP[2], BOT[2], t)
          }
        }
      }
      const n = SS * SS
      const i = (y * W + x) * 4
      buf[i] = Math.round(r / n)
      buf[i + 1] = Math.round(g / n)
      buf[i + 2] = Math.round(b / n)
      buf[i + 3] = Math.round(a / n)
    }
  }
  return buf
}

// minimal PNG encoder (RGBA, 8-bit, no interlace) ---------------------------
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Uso: `node scripts/gen-favicons.mjs [dir-de-salida]` (default: public/).
// Regenera apple-icon.png (180) e icon-32x32.png a partir del mismo arte que
// public/icon.svg. Raster puro, sin dependencias, reproducible.
const out = process.argv[2] ?? 'public'
for (const s of [180, 32]) {
  const file = s === 180 ? `${out}/apple-icon.png` : `${out}/icon-32x32.png`
  writeFileSync(file, png(s, render(s)))
  console.log('wrote', file)
}
