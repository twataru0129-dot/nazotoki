#!/usr/bin/env node
// 机上の古い写真（ユーザー提供の画像）を public/assets/photo/ に書き出す。
// 使い方: node scripts/build-photo.mjs <提供画像.png>
// 提供画像は、試遊画面のスクリーンショットに写真を収めたもの（写真は約 -2° 傾き、クリーム色の台紙の内側）。
// 写真の四隅（下の QUAD）から、傾きを戻して写真の部分だけを切り出す。拡大・縮小はしない（元の画素数のまま）。
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node scripts/build-photo.mjs <提供画像.png>');
  process.exit(1);
}
// 提供画像（941×1672）の SHA-256。別の画像で誤って作り直さないための照合
const EXPECTED = 'fd727f50ede3870ff4e5d51fddd765d4cc8b6d1b4e938fe6644dae89810e7037';
// 写真の四隅（左上・右上・右下・左下）。台紙との境目の直線から求め、1px 内側に寄せた値
const QUAD = [
  [59, 496],
  [861, 471.5],
  [882.5, 1011],
  [79.5, 1037],
];
const W = 802;
const H = 540;

const buf = await readFile(SRC);
const hash = createHash('sha256').update(buf).digest('hex');
if (hash !== EXPECTED) throw new Error(`提供画像のハッシュが違います: ${hash}`);
const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });

// 出力の (u,v) → 提供画像の (x,y)：四隅の双一次補間
const at = (u, v) => {
  const [a, b, c, d] = QUAD;
  const top = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const bot = [d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u];
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
};
const out = Buffer.alloc(W * H * 3);
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    const [x, y] = at((i + 0.5) / W, (j + 0.5) / H);
    const x0 = Math.floor(x - 0.5);
    const y0 = Math.floor(y - 0.5);
    const fx = x - 0.5 - x0;
    const fy = y - 0.5 - y0;
    for (let c = 0; c < 3; c++) {
      const p = (xx, yy) => data[(yy * info.width + xx) * 3 + c];
      const v = p(x0, y0) * (1 - fx) * (1 - fy) + p(x0 + 1, y0) * fx * (1 - fy) + p(x0, y0 + 1) * (1 - fx) * fy + p(x0 + 1, y0 + 1) * fx * fy;
      out[(j * W + i) * 3 + c] = Math.round(v);
    }
  }
}
await mkdir(path.join(ROOT, 'public/assets/photo'), { recursive: true });
const webp = await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90, effort: 6 }).toBuffer();
await writeFile(path.join(ROOT, 'public/assets/photo/old_photo.webp'), webp);
console.log(`photo/old_photo.webp: ${W}×${H}, ${(webp.length / 1024).toFixed(0)}KB（元画像 SHA-256 ${hash}）`);
