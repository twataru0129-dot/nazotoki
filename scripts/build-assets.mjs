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

// 北：本棚＋机。本の描き込み・机上写真なしは仮のまま（第4段階で補修）
{
  const img = await load(`${P13}/backgrounds/study_A_north_concept.png`);
  await writeBackground('a_north', img, '仮：中段の4冊が描き込み済み、机上写真なし');
}

// 東：時計＋窓。窓の外を敷地の夜景に差し替え。時計の針はゲーム側でSVGを重ねて隠す
{
  const img = await load(`${P13}/backgrounds/study_A_east_concept.png`);
  await replaceEastWindow(img);
  await writeBackground('a_east', img, '仮：窓外を加工（敷地の夜景）。壁の版画は元画像のまま');
}

// 南：開扉（元）と閉扉（扉板を射影変換して戸枠に戻す）を同じベースから作る
{
  const base = await load(`${P13}/backgrounds/study_A_south_open_concept.png`);
  // 南を向いた左手は東壁。描き込まれた本棚を、扉脇の壁と腰板で塗り替える
  rowFill(base, { x0: 448, y0: 0, x1: 474, y1: 612 }, { x0: 0, y0: 0, x1: 306, y1: 612 });
  sideShade(base, { left: 360, right: 420, strength: 0.55 });

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

  await writeBackground('a_south_closed', closed, '仮：閉扉は開扉画像の扉板を射影変換。左右の壁は塗り替え・減光の仮処置');
  await writeBackground('a_south_open', base, '仮：開扉（閉扉と同じベース）');
}

// 西：絵画4枚。北壁側（右端）の窓とカーテンを壁と腰板に塗り替える。額内はゲーム側でSVGを重ねる
{
  const img = await load(`${EXTRA}/西面の絵画参考.png`);
  tileCopy(img, { x0: 1092, y0: 0, x1: 1160, y1: 688 }, { x0: 1225, y0: 0, x1: BG_W, y1: 688 });
  tileCopy(img, { x0: 942, y0: 688, x1: 1165, y1: 1004 }, { x0: 1225, y0: 688, x1: BG_W, y1: 1004 }, { flop: false });
  await writeBackground('a_west', img, '仮：窓を壁に加工。額内の生成絵は謎用SVGで覆う');
}

// ---------- SVG ----------
const books = ['blue', 'ivory', 'black', 'green'];
for (const b of books) {
  let svg = (await source(`${P13}/books/book_${b}.svg`)).toString('utf8');
  // 白（象牙）の本だけ記号色が背と同系色で読めないため、記号色を濃くする（形は変えない）
  if (b === 'ivory') svg = svg.replaceAll('style="color:#F4D58C"', 'style="color:#5B4120"');
  await out(`svg/books/book_${b}.svg`, Buffer.from(svg));
}
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
