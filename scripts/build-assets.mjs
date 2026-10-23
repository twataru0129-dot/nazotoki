#!/usr/bin/env node
// 元素材フォルダ（リポジトリ外で別管理）から、ゲームで使う素材だけを public/assets/ に書き出す。
// 使い方: node scripts/build-assets.mjs <元素材フォルダ>
//   元素材フォルダ = 4つのZIPを展開した場所（CLAUDE.md / source_assets / audio がある階層）
// 元ファイルは docs/source_checksums.txt の SHA-256 と照合してから使う。
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] && path.resolve(process.argv[2]);
if (!SRC || !existsSync(path.join(SRC, 'source_assets'))) {
  console.error('usage: node scripts/build-assets.mjs <元素材フォルダ>');
  process.exit(1);
}
const OUT = path.join(ROOT, 'public', 'assets');
const P13 = 'source_assets/phase13_final_assets';
const EXTRA = 'source_assets/extra_visual_references';
const BG_W = 1448;
const BG_H = 1086;
const MIN_PSNR = 40;

// ---------- 照合 ----------
const checksums = new Map(
  (await readFile(path.join(ROOT, 'docs/source_checksums.txt'), 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, file] = line.split(/\s+\.\//);
      return [file.trim(), hash.trim()];
    }),
);
async function source(rel) {
  const buf = await readFile(path.join(SRC, rel));
  const expected = checksums.get(rel);
  const actual = createHash('sha256').update(buf).digest('hex');
  if (!expected) throw new Error(`チェックサム一覧にない元素材: ${rel}`);
  if (expected !== actual) throw new Error(`チェックサム不一致: ${rel}`);
  return buf;
}

async function out(rel, buf) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
}

// ---------- 画素処理の小道具（RGBA raw, 1448x1086） ----------
async function load(rel) {
  const { data, info } = await sharp(await source(rel)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== BG_W || info.height !== BG_H) throw new Error(`背景サイズ不一致: ${rel}`);
  return { data, w: info.width, h: info.height };
}
let seed = 17;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const clone = (img) => ({ ...img, data: Buffer.from(img.data) });
const idx = (img, x, y) => (y * img.w + x) * 4;

// src の矩形を dst の位置へ写す（横方向にタイル。flop=true なら交互に反転して継ぎ目を目立たなくする）
function tileCopy(img, from, to, { flop = true } = {}) {
  const src = clone(img);
  const sw = from.x1 - from.x0;
  for (let y = to.y0; y < to.y1; y++) {
    const sy = from.y0 + (y - to.y0) % (from.y1 - from.y0);
    for (let x = to.x0; x < to.x1; x++) {
      const k = Math.floor((x - to.x0) / sw);
      let sx = (x - to.x0) % sw;
      if (flop && k % 2 === 1) sx = sw - 1 - sx;
      src.data.copy(img.data, idx(img, x, y), idx(src, from.x0 + sx, sy), idx(src, from.x0 + sx, sy) + 4);
    }
  }
}

// 各行を、参照帯のその行の平均色（＋わずかな粒子）で塗る。縞模様を出さずに無地の壁を作る
function rowFill(img, from, to) {
  for (let y = to.y0; y < to.y1; y++) {
    const sy = from.y0 + ((y - to.y0) % (from.y1 - from.y0));
    const avg = [0, 0, 0];
    for (let x = from.x0; x < from.x1; x++) for (let c = 0; c < 3; c++) avg[c] += img.data[idx(img, x, sy) + c];
    for (let c = 0; c < 3; c++) avg[c] /= from.x1 - from.x0;
    for (let x = to.x0; x < to.x1; x++) {
      const n = (rnd() - 0.5) * 6;
      const o = idx(img, x, y);
      for (let c = 0; c < 3; c++) img.data[o + c] = Math.max(0, Math.min(255, Math.round(avg[c] + n)));
    }
  }
}

// src 矩形を dst 矩形へ伸縮コピー（最近傍）
function stretchCopy(img, from, to) {
  const src = clone(img);
  for (let y = to.y0; y < to.y1; y++) {
    const sy = Math.min(from.y1 - 1, from.y0 + Math.floor(((y - to.y0) * (from.y1 - from.y0)) / (to.y1 - to.y0)));
    for (let x = to.x0; x < to.x1; x++) {
      const sx = Math.min(from.x1 - 1, from.x0 + Math.floor(((x - to.x0) * (from.x1 - from.x0)) / (to.x1 - to.x0)));
      src.data.copy(img.data, idx(img, x, y), idx(src, sx, sy), idx(src, sx, sy) + 4);
    }
  }
}

// 4点対応の射影変換（dst 四角形 → src 四角形）を解く
function homography(dstPts, srcPts) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = dstPts[i];
    const [u, v] = srcPts[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return (x, y) => {
    const d = h[6] * x + h[7] * y + 1;
    return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d];
  };
}

// 双線形補間で src の四角形を dst の矩形（軸平行）に貼る
function warpQuadToRect(img, srcQuad, rect) {
  const src = clone(img);
  const dstQuad = [
    [rect.x0, rect.y0],
    [rect.x1, rect.y0],
    [rect.x1, rect.y1],
    [rect.x0, rect.y1],
  ];
  const map = homography(dstQuad, srcQuad);
  for (let y = rect.y0; y < rect.y1; y++) {
    for (let x = rect.x0; x < rect.x1; x++) {
      const [u, v] = map(x + 0.5, y + 0.5);
      const x0 = Math.max(0, Math.min(src.w - 2, Math.floor(u - 0.5)));
      const y0 = Math.max(0, Math.min(src.h - 2, Math.floor(v - 0.5)));
      const fx = Math.min(1, Math.max(0, u - 0.5 - x0));
      const fy = Math.min(1, Math.max(0, v - 0.5 - y0));
      const o = idx(img, x, y);
      for (let c = 0; c < 4; c++) {
        const p00 = src.data[idx(src, x0, y0) + c];
        const p10 = src.data[idx(src, x0 + 1, y0) + c];
        const p01 = src.data[idx(src, x0, y0 + 1) + c];
        const p11 = src.data[idx(src, x0 + 1, y0 + 1) + c];
        img.data[o + c] = Math.round(p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy);
      }
    }
  }
}

// 左右端を暗くして、方角と矛盾する家具を目立たなくする（仮処置）
function sideShade(img, { left = 0, right = 0, strength = 0.5 }) {
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      let f = 1;
      if (left && x < left) f = Math.min(f, 1 - strength * (1 - x / left) ** 1.6);
      if (right && x > img.w - right) f = Math.min(f, 1 - strength * (1 - (img.w - x) / right) ** 1.6);
      if (f >= 1) continue;
      const o = idx(img, x, y);
      for (let c = 0; c < 3; c++) img.data[o + c] = Math.round(img.data[o + c] * f);
    }
  }
}

// 東面の窓：西洋都市の夜景を、雨の夜の敷地（庭木・遠い生垣）に差し替える
function gardenSvg(W, H) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#344664"/><stop offset=".22" stop-color="#25324e"/><stop offset=".6" stop-color="#121a2e"/><stop offset="1" stop-color="#070a12"/></linearGradient>
  <filter id="b3"><feGaussianBlur stdDeviation="3"/></filter><filter id="b1"><feGaussianBlur stdDeviation="1.2"/></filter><filter id="b6"><feGaussianBlur stdDeviation="6"/></filter></defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  let d = `M0 ${H} L0 150`;
  for (let x = 0; x <= W; x += 6) d += ` L${x} ${118 + rnd() * 40 + Math.sin(x / 23) * 12}`;
  s += `<path d="${d} L${W} ${H} Z" fill="#1d2944" filter="url(#b3)"/>`;
  s += `<rect x="0" y="200" width="${W}" height="60" fill="#3a4866" opacity=".25" filter="url(#b6)"/>`;
  // 遠くの門灯（屋敷の敷地を示す小さな灯り）
  s += `<circle cx="118" cy="255" r="10" fill="#e8a85a" opacity=".18" filter="url(#b6)"/><circle cx="118" cy="255" r="1.8" fill="#ffd9a0" opacity=".8"/>`;
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * W;
    const cy = 170 + rnd() * 70;
    let g = '';
    for (let k = 0; k < 26; k++) g += `<circle cx="${cx + (rnd() - 0.5) * 90}" cy="${cy + (rnd() - 0.5) * 60}" r="${10 + rnd() * 18}"/>`;
    s += `<g fill="#111a2b" filter="url(#b1)">${g}<rect x="${cx - 3}" y="${cy}" width="6" height="${H - cy}"/></g>`;
  }
  for (let i = 0; i < 5; i++) {
    const cx = 20 + rnd() * (W - 40);
    const top = 110 + rnd() * 90;
    const base = H - 40 - rnd() * 60;
    const w = 40 + rnd() * 35;
    let p = '';
    for (let t = 0; t < 7; t++) {
      const y1 = top + ((base - top) * t) / 7;
      const y2 = top + ((base - top) * (t + 1.6)) / 7;
      const hw = (w * (t + 1)) / 7;
      p += `M${cx} ${y1} L${cx - hw} ${y2} L${cx + hw} ${y2} Z `;
    }
    s += `<path d="${p}" fill="#0a101b" filter="url(#b1)"/>`;
  }
  let h = `M0 ${H} L0 360`;
  for (let x = 0; x <= W; x += 8) h += ` L${x} ${350 + rnd() * 18}`;
  s += `<path d="${h} L${W} ${H} Z" fill="#06090f" filter="url(#b1)"/>`;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const l = 6 + rnd() * 18;
    s += `<line x1="${x}" y1="${y}" x2="${x - 1.5}" y2="${y + l}" stroke="#c9d6f0" stroke-width="${0.6 + rnd() * 0.7}" opacity="${0.08 + rnd() * 0.26}"/>`;
  }
  return s + '</svg>';
}
async function replaceEastWindow(img) {
  const X0 = 1108;
  const Y0 = 201;
  const W = 325;
  const H = 442;
  // 窓の格子は残し、ガラス面（2〜4段目）だけを差し替える。1段目の空と月は元画像のまま。
  const panes = [
    [1108, 201, 1205, 343], [1213, 201, 1326, 343], [1334, 201, 1433, 343],
    [1108, 358, 1205, 495], [1213, 358, 1326, 495], [1334, 358, 1433, 495],
    [1108, 501, 1205, 643], [1213, 501, 1326, 614], [1334, 501, 1433, 612],
  ];
  const g = await sharp(Buffer.from(gardenSvg(W, H))).removeAlpha().blur(0.9).raw().toBuffer();
  for (const [x0, y0, x1, y1] of panes) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const gi = ((y - Y0) * W + (x - X0)) * 3;
        const n = (rnd() - 0.5) * 10;
        const o = idx(img, x, y);
        for (let c = 0; c < 3; c++) img.data[o + c] = Math.max(0, Math.min(255, g[gi + c] + n));
      }
    }
  }
}

// 壁の版画：生成画像の「西洋の大聖堂」を、旧・霧島邸の外観を描いたセピアの銅版画風に差し替える（自作SVG）
function etchingSvg(W, H) {
  const ink = '#2a2017';
  const line = (x1, y1, x2, y2, w = 0.7, o = 1) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width="${w}" opacity="${o}"/>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#e4d8bd"/>`;
  const gy = H * 0.72; // 地面の線
  // 空：横の細いハッチング（雲の部分は抜く）
  for (let y = 4; y < gy - 10; y += 2.4) {
    let x = rnd() * 12;
    while (x < W) {
      const len = 10 + rnd() * 50;
      const cloud = Math.sin(x / 47 + y / 19) + Math.sin(x / 23 - y / 31) > 0.7;
      if (!cloud) s += line(x, y, Math.min(W, x + len), y + (rnd() - 0.5), 0.6, 0.85 - (0.45 * y) / gy);
      x += len + 3 + rnd() * 8;
    }
  }
  // 屋敷の背後の木立（地平の低い帯）
  for (let i = 0; i < 500; i++) {
    const px = rnd() * W;
    const py = gy - 4 - rnd() * H * 0.12 * (0.6 + 0.4 * Math.sin(px / 31));
    s += `<path d="M${px.toFixed(1)} ${py.toFixed(1)} q2 -2.4 4 0" fill="none" stroke="${ink}" stroke-width="0.6" opacity=".5"/>`;
  }
  // 屋敷（中央）：左に塔、中央に破風、両翼に寄棟屋根
  const cx = W * 0.5;
  const bw = W * 0.62;
  const bh = H * 0.26;
  const bx = cx - bw / 2;
  const by = gy - bh;
  // 壁の縦ハッチ（日陰側を濃く）
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#e4d8bd"/>`;
  for (let x = bx; x < bx + bw; x += 1.6) s += line(x, by, x, gy, 0.5, x > cx + bw * 0.18 ? 0.7 : 0.35);
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="${ink}" stroke-width="0.9"/>`;
  // 屋根
  const rh = bh * 0.55;
  s += `<path d="M${bx - 4} ${by} L${bx + bw * 0.12} ${by - rh} L${bx + bw * 0.88} ${by - rh} L${bx + bw + 4} ${by} Z" fill="${ink}" opacity=".55"/>`;
  for (let x = bx; x < bx + bw; x += 2.2) s += line(x, by, x + (x < cx ? 3 : -3), by - rh * 0.9, 0.35, 0.6);
  // 軒下の影
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh * 0.07}" fill="${ink}" opacity=".45"/>`;
  // 中央の破風と玄関
  s += `<path d="M${cx - bw * 0.14} ${by} L${cx} ${by - rh * 1.5} L${cx + bw * 0.14} ${by} Z" fill="#e4d8bd" stroke="${ink}" stroke-width="0.9"/>`;
  s += `<circle cx="${cx}" cy="${by - rh * 0.55}" r="${rh * 0.22}" fill="none" stroke="${ink}" stroke-width="0.7"/>`;
  s += `<rect x="${cx - bw * 0.06}" y="${gy - bh * 0.48}" width="${bw * 0.12}" height="${bh * 0.48}" fill="${ink}" opacity=".85"/>`;
  // 塔
  const tw = bw * 0.16;
  const tx = bx + bw * 0.08;
  const th = bh * 1.9;
  s += `<rect x="${tx}" y="${gy - th}" width="${tw}" height="${th}" fill="#e4d8bd" stroke="${ink}" stroke-width="0.9"/>`;
  for (let x = tx + tw * 0.55; x < tx + tw; x += 1.5) s += line(x, gy - th, x, gy, 0.4, 0.5);
  s += `<path d="M${tx - 3} ${gy - th} L${tx + tw / 2} ${gy - th - tw * 1.3} L${tx + tw + 3} ${gy - th} Z" fill="${ink}" opacity=".75"/>`;
  s += line(tx + tw / 2, gy - th - tw * 1.3, tx + tw / 2, gy - th - tw * 1.7, 0.8);
  // 煙突
  for (const fx of [0.62, 0.8]) s += `<rect x="${bx + bw * fx}" y="${by - rh * 1.05}" width="${bw * 0.03}" height="${rh * 0.5}" fill="${ink}" opacity=".8"/>`;
  // 窓（縦長、2段）
  const win = (x, y, w, h) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${ink}" opacity=".8"/>`;
  for (let i = 0; i < 9; i++) {
    const x = bx + bw * (0.27 + i * 0.075);
    if (Math.abs(x + bw * 0.015 - cx) < bw * 0.08) continue;
    s += win(x, by + bh * 0.12, bw * 0.03, bh * 0.28) + win(x, by + bh * 0.56, bw * 0.03, bh * 0.3);
  }
  for (let k = 0; k < 3; k++) s += win(tx + tw * 0.32, gy - th + th * (0.12 + k * 0.28), tw * 0.36, th * 0.13);
  // 両脇の庭木：短い曲線の集まり
  const tree = (x, y, rx, ry) => {
    let g = '';
    // 形が丸くならないよう、ずらした小さな塊をいくつか重ねる
    const lobes = Array.from({ length: 6 }, () => [x + (rnd() - 0.5) * rx * 1.1, y + (rnd() - 0.5) * ry * 1.1, 0.45 + rnd() * 0.4]);
    for (let i = 0; i < 700; i++) {
      const [lx, ly, lr] = lobes[i % lobes.length];
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd());
      const px = lx + Math.cos(a) * rx * lr * r;
      const py = ly + Math.sin(a) * ry * lr * r;
      const dark = px > x ? 0.85 : 0.5;
      g += `<path d="M${px.toFixed(1)} ${py.toFixed(1)} q2.5 -3 5 0" fill="none" stroke="${ink}" stroke-width="0.8" opacity="${dark}"/>`;
    }
    return g + line(x, y + ry * 0.6, x, gy + 2, 1.4, 0.9);
  };
  s += tree(W * 0.08, gy - H * 0.24, W * 0.13, H * 0.26) + tree(W * 0.93, gy - H * 0.2, W * 0.12, H * 0.24) + tree(W * 0.17, gy - H * 0.08, W * 0.07, H * 0.1) + tree(W * 0.84, gy - H * 0.06, W * 0.06, H * 0.08);
  // 地面・小道
  s += line(0, gy, W, gy, 0.8, 0.9);
  for (let y = gy + 4; y < H - 6; y += 3.5) {
    let x = rnd() * 20;
    while (x < W) {
      const len = 6 + rnd() * 26;
      s += line(x, y, x + len, y, 0.6, 0.45 + ((y - gy) / (H - gy)) * 0.45);
      x += len + 6 + rnd() * 14;
    }
  }
  // 玄関へ続く小道（かすかな曲線）
  s += `<path d="M${cx - 5} ${gy} Q${cx - W * 0.04} ${gy + (H - gy) * 0.5} ${cx - W * 0.12} ${H}" fill="none" stroke="${ink}" stroke-width="0.6" opacity=".6"/>`;
  s += `<path d="M${cx + 5} ${gy} Q${cx + W * 0.03} ${gy + (H - gy) * 0.5} ${cx + W * 0.1} ${H}" fill="none" stroke="${ink}" stroke-width="0.6" opacity=".6"/>`;
  // 版の縁
  s += `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="none" stroke="${ink}" stroke-width="1" opacity=".7"/>`;
  return s + '</svg>';
}

// quad（左上・右上・右下・左下）の内側を版画で塗る。明るさと色味は元の画像のぼかしに合わせる
async function replacePrint(img, quad) {
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  const bx = Math.floor(Math.min(...xs));
  const by = Math.floor(Math.min(...ys));
  const bw = Math.ceil(Math.max(...xs)) - bx;
  const bh = Math.ceil(Math.max(...ys)) - by;
  // 元の明るさ（照明のむら）
  const region = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
    .extract({ left: bx, top: by, width: bw, height: bh })
    .removeAlpha()
    .raw()
    .toBuffer();
  const illum = await sharp(region, { raw: { width: bw, height: bh, channels: 3 } }).blur(Math.max(4, Math.min(bw, bh) / 5)).raw().toBuffer();
  // 版画は2倍で描いて縮小（線を細かく）
  const EW = Math.round(bw * 2);
  const EH = Math.round(bh * 2);
  const etch = await sharp(Buffer.from(etchingSvg(EW, EH))).removeAlpha().resize(bw * 2, bh * 2).blur(0.8).raw().toBuffer();
  let meanE = 0;
  for (let i = 0; i < etch.length; i++) meanE += etch[i];
  meanE /= etch.length;
  const map = homography(
    quad,
    [
      [0, 0],
      [EW, 0],
      [EW, EH],
      [0, EH],
    ],
  );
  for (let y = by; y < by + bh; y++) {
    for (let x = bx; x < bx + bw; x++) {
      const [u, v] = map(x + 0.5, y + 0.5);
      if (u < 0 || v < 0 || u >= EW || v >= EH) continue;
      const ei = (Math.floor(v) * EW + Math.floor(u)) * 3;
      const li = ((y - by) * bw + (x - bx)) * 3;
      const o = idx(img, x, y);
      const n = (rnd() - 0.5) * 4;
      for (let c = 0; c < 3; c++) img.data[o + c] = Math.max(0, Math.min(255, Math.round((etch[ei + c] / meanE) * illum[li + c] + n)));
    }
  }
}

// a と b を x0〜x1 の範囲で横方向に混ぜる（x0 より左は a、x1 より右は b）
function crossFadeX(img, a, b, x0, x1, y0 = 0, y1 = img.h) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < img.w; x++) {
      const t = x >= x1 ? 1 : (x - x0) / (x1 - x0);
      const o = idx(img, x, y);
      for (let c = 0; c < 3; c++) img.data[o + c] = Math.round(a.data[o + c] * (1 - t) + b.data[o + c] * t);
    }
  }
}

// ---------- 書き出し ----------
const report = [];

async function psnr(rawA, encoded) {
  const b = await sharp(encoded).ensureAlpha().raw().toBuffer();
  let se = 0;
  let n = 0;
  for (let i = 0; i < rawA.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = rawA[i + c] - b[i + c];
      se += d * d;
      n++;
    }
  }
  return se === 0 ? Infinity : 10 * Math.log10((255 * 255) / (se / n));
}

async function writeBackground(name, img, note) {
  // 画質は PSNR 40dB 以上になる最も軽い設定を選ぶ（不必要に落とさない）。
  // 通常の非可逆で届かない場合はニアロスレス、最後は可逆圧縮。
  const tries = [90, 92, 94, 96, 98, 100].map((quality) => ({ label: `q${quality}`, opts: { quality, smartSubsample: true } }));
  tries.push({ label: 'near-lossless60', opts: { nearLossless: true, quality: 60 } });
  tries.push({ label: 'lossless', opts: { lossless: true } });
  for (const t of tries) {
    const webp = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
      .removeAlpha()
      .webp({ ...t.opts, effort: 6 })
      .toBuffer();
    const score = await psnr(img.data, webp);
    if (score >= MIN_PSNR || t.label === 'lossless') {
      await out(`bg/${name}.webp`, webp);
      report.push({ file: `bg/${name}.webp`, quality: t.label, psnr: Number(Math.min(score, 99).toFixed(2)), bytes: webp.length, note });
      return;
    }
  }
}

// 北：本棚＋机。中段の4冊（緑・黒・白・青）を消して空き棚にし、ゲーム側で操作用の4冊（SVG）を置く。
// 書斎Bも同じ画像を使い、赤い本・写真の違いはゲーム側で重ねる（A/Bを同じ構図にするため）。
{
  const img = await load(`${P13}/backgrounds/study_A_north_concept.png`);
  // 本の上に見えている棚の奥（暗い板）を縦に伸ばして、本のあった場所を埋める
  stretchCopy(img, { x0: 673, y0: 204, x1: 793, y1: 221 }, { x0: 673, y0: 221, x1: 793, y1: 317 });
  await writeBackground('a_north', img, '加工：中段の4冊を消して空き棚に（本と机上の写真はゲーム側でSVG表示）');
}

// 東：時計＋窓。窓の外を敷地の夜景に差し替え。時計の針はゲーム側でSVGを重ねて隠す
{
  const img = await load(`${P13}/backgrounds/study_A_east_concept.png`);
  await replaceEastWindow(img);
  // 壁の版画（西洋の大聖堂）を、屋敷の外観の銅版画に差し替える
  await replacePrint(img, [[664, 139], [857, 127], [858, 294], [665, 301]]);
  await replacePrint(img, [[705, 385], [765, 385], [765, 442], [705, 442]]);
  await writeBackground('a_east', img, '加工：窓外を敷地の夜景に、壁の版画を屋敷の外観（自作SVG）に差し替え');
}

// 南：開扉（元）と閉扉（扉板を射影変換して戸枠に戻す）を同じベースから作る
{
  const base = await load(`${P13}/backgrounds/study_A_south_open_concept.png`);
  // 南を向いた左手は東壁。描き込まれた本棚を、扉脇の壁と腰板で塗り替える
  rowFill(base, { x0: 448, y0: 0, x1: 474, y1: 612 }, { x0: 0, y0: 0, x1: 306, y1: 612 });
  // 左の壁の版画（西洋の大聖堂）を屋敷の外観の版画に
  await replacePrint(base, [[356, 185], [428, 185], [428, 271], [356, 271]]);
  await replacePrint(base, [[362, 342], [428, 342], [428, 431], [362, 431]]);
  // 右手は西壁。北面にあるはずの机・椅子・ランプ（と外套掛け）を消し、壁・腰板・床に戻す
  {
    const keep = clone(base);
    // 壁：外套掛けの左の無地の壁の色で塗る（額縁の部分は残す）
    const wall = clone(base);
    rowFill(wall, { x0: 1098, y0: 0, x1: 1116, y1: 545 }, { x0: 1100, y0: 0, x1: BG_W, y1: 545 });
    // 額縁（左辺 x 1340、上辺は右へ上がる斜め、下辺 y 366）の外側だけを壁にする
    for (let y = 0; y < 545; y++) {
      for (let x = 1100; x < BG_W; x++) {
        const inFrame = x >= 1338 && y < 366 && y > 98 - (x - 1340) * 0.57;
        if (!inFrame) wall.data.copy(base.data, idx(base, x, y), idx(wall, x, y), idx(wall, x, y) + 4);
      }
    }
    // 腰板：笠木から幅木まで。扉脇の腰板の行ごとの色で塗る
    rowFill(base, { x0: 1097, y0: 545, x1: 1108, y1: 800 }, { x0: 1100, y0: 545, x1: BG_W, y1: 800 });
    rowFill(base, { x0: 1097, y0: 770, x1: 1108, y1: 800 }, { x0: 1100, y0: 800, x1: BG_W, y1: 846 });
    // 戸枠の右の台座（椅子に隠れていた下端）は、左の台座を左右反転して補う
    for (let y = 790; y < 848; y++) {
      for (let x = 1022; x < 1100; x++) keep.data.copy(base.data, idx(base, x, y), idx(keep, 1580 - x, y), idx(keep, 1580 - x, y) + 4);
    }
    // 床：寄木の帯は扉の下の寄木を並べ、絨毯は扉の右下を中心に左右反転して続ける
    tileCopy(base, { x0: 800, y0: 888, x1: 1000, y1: 926 }, { x0: 1005, y0: 848, x1: BG_W, y1: 926 });
    for (let y = 926; y < BG_H; y++) {
      for (let x = 1005; x < BG_W; x++) keep.data.copy(base.data, idx(base, x, y), idx(keep, 2010 - x, y), idx(keep, 2010 - x, y) + 4);
    }
  }
  sideShade(base, { left: 360, right: 460, strength: 0.6 });

  const closed = clone(base);
  warpQuadToRect(
    closed,
    [
      [712, 112],
      [1016, 75],
      [1020, 878],
      [712, 838],
    ],
    { x0: 560, y0: 108, x1: 1020, y1: 846 },
  );
  // 開いていた扉板の上端・下端が残る部分を、戸枠上部と床で埋める
  stretchCopy(closed, { x0: 562, y0: 62, x1: 710, y1: 108 }, { x0: 710, y0: 62, x1: 1024, y1: 108 });
  tileCopy(closed, { x0: 712, y0: 890, x1: 1022, y1: 930 }, { x0: 712, y0: 846, x1: 1022, y1: 886 }, { flop: false });

  await writeBackground('a_south_closed', closed, '仮：閉扉は開扉画像の扉板を射影変換。左の本棚・右の机と椅子を壁・腰板・床に塗り替え、版画を差し替え');
  await writeBackground('a_south_open', base, '仮：開扉（閉扉と同じベース）');

  // 扉の演出用：戸枠ごとの扉（暗闇に浮かぶ扉）と、開く扉板だけを、閉扉と同じ画像から切り出す
  const crop = async (name, img, r, note) => {
    const buf = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
      .extract({ left: r.x, top: r.y, width: r.w, height: r.h })
      .removeAlpha()
      .webp({ quality: 92, smartSubsample: true, effort: 6 })
      .toBuffer();
    await out(`fx/${name}.webp`, buf);
    report.push({ file: `fx/${name}.webp`, quality: 'q92', psnr: '-', bytes: buf.length, note });
  };
  await crop('door_leaf', closed, { x: 560, y: 108, w: 460, h: 738 }, '閉扉の扉板だけの切り出し（開く部品）');
  // 扉板の部分を透明にした戸枠（扉が開くと奥の通路が見える）
  {
    const r = { x: 470, y: 20, w: 640, h: 860 };
    const raw = Buffer.alloc(r.w * r.h * 4);
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        const sx = r.x + x;
        const sy = r.y + y;
        const o = (y * r.w + x) * 4;
        closed.data.copy(raw, o, idx(closed, sx, sy), idx(closed, sx, sy) + 4);
        if (sx >= 560 && sx < 1020 && sy >= 108 && sy < 846) raw[o + 3] = 0;
      }
    }
    const buf = await sharp(raw, { raw: { width: r.w, height: r.h, channels: 4 } }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toBuffer();
    await out('fx/door_frame_hole.webp', buf);
    report.push({ file: 'fx/door_frame_hole.webp', quality: 'q92', psnr: '-', bytes: buf.length, note: '戸枠（扉板の部分は透明）' });
  }
}

// 通路（扉の先）。扉の演出で扉板の奥に見せる
{
  const img = await load(`${EXTRA}/暗い回廊参考.png`);
  await writeBackground('hallway', img, '暗い通路（扉の演出・第5段階のエンディングで使用）');
}

// 西：絵画4枚。北壁側（右端）の窓とカーテンを壁と腰板に塗り替える。額内はゲーム側でSVGを重ねる
{
  const img = await load(`${EXTRA}/西面の絵画参考.png`);
  const orig = clone(img);
  tileCopy(img, { x0: 1092, y0: 0, x1: 1160, y1: 688 }, { x0: 1160, y0: 0, x1: BG_W, y1: 688 });
  tileCopy(img, { x0: 942, y0: 688, x1: 1165, y1: 1004 }, { x0: 1165, y0: 688, x1: BG_W, y1: 1004 }, { flop: false });
  // 継ぎ目：窓の手前（x 1160〜1222）で元の壁と混ぜ、右へ行くほど壁の角に向かって暗くする
  crossFadeX(img, orig, clone(img), 1160, 1222, 0, 1004);
  sideShade(img, { right: 300, strength: 0.5 });
  await writeBackground('a_west', img, '加工：右端の窓を壁と腰板に（継ぎ目をなじませ、角へ向けて減光）。額内は謎用SVGで覆う');
}

// ---------- SVG ----------
// 本棚の本は src/components/art/BookArt.tsx で⑬の本SVGと同じ図形を描くため、ここでは書き出さない
for (const p of ['A', 'B', 'C', 'D']) {
  await out(`svg/paintings/painting_${p}.svg`, await source(`${P13}/paintings/painting_${p}.svg`));
  await out(`svg/cards/card_${p}_back.svg`, await source(`${P13}/cards/card_${p}_back.svg`));
}
await out('svg/clock_face.svg', await source(`${P13}/clock/clock_face_no_hands.svg`));

// ---------- 音声（再エンコードせずそのままコピー） ----------
const manifest = JSON.parse((await source('audio/docs/audio_manifest.json')).toString('utf8'));
if (manifest.assets.length !== 20) throw new Error('音声マニフェストが20件ではありません');
for (const a of manifest.assets) {
  const buf = await source(`audio/${a.relative_path}`);
  if (createHash('sha256').update(buf).digest('hex') !== a.sha256) throw new Error(`音声ハッシュ不一致: ${a.relative_path}`);
  await mkdir(path.join(OUT, 'audio', path.dirname(a.relative_path)), { recursive: true });
  await copyFile(path.join(SRC, 'audio', a.relative_path), path.join(OUT, 'audio', a.relative_path));
}
await writeFile(path.join(ROOT, 'src/data/audio_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// ---------- 報告 ----------
const lines = [
  '# 素材ビルド報告（scripts/build-assets.mjs が自動生成）',
  '',
  '| 出力 | WebP設定 | PSNR(dB) | サイズ | 備考 |',
  '|---|---|---|---|---|',
  ...report.map((r) => `| ${r.file} | ${r.quality} | ${r.psnr} | ${(r.bytes / 1024).toFixed(0)}KB | ${r.note} |`),
  '',
  `音声: ${manifest.assets.length}ファイルを無変換でコピー（SHA-256照合済み）`,
  '',
];
await writeFile(path.join(ROOT, 'docs/asset_build_report.md'), lines.join('\n'));
console.log(lines.join('\n'));
