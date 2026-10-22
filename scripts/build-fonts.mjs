#!/usr/bin/env node
// src/ 内で使われている文字だけを含む Noto Serif JP（OFL-1.1）のサブセットを public/assets/fonts/ に作る。
// 文言を追加・変更したら再実行する（npm run build でも自動実行）。
import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/fonts');
const FONT_DIR = path.join(ROOT, 'node_modules/@expo-google-fonts/noto-serif-jp');

async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (/\.(tsx?|json|css)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
  }
  return files;
}

const chars = new Set();
for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
for (const ch of '、。・「」『』（）！？…―ー〜：　◇○□△←→↑↓') chars.add(ch);
for (const f of await walk(path.join(ROOT, 'src'))) {
  for (const ch of await readFile(f, 'utf8')) if (ch.codePointAt(0) > 0x7f) chars.add(ch);
}
const text = [...chars].sort().join('');

await mkdir(OUT, { recursive: true });
for (const [weight, file] of [
  [400, '400Regular/NotoSerifJP_400Regular.ttf'],
  [700, '700Bold/NotoSerifJP_700Bold.ttf'],
]) {
  const subset = await subsetFont(await readFile(path.join(FONT_DIR, file)), text, { targetFormat: 'woff2' });
  await writeFile(path.join(OUT, `NotoSerifJP-${weight}.woff2`), subset);
  console.log(`NotoSerifJP-${weight}.woff2: ${(subset.length / 1024).toFixed(0)}KB`);
}
await copyFile(path.join(FONT_DIR, 'LICENSE_FONT'), path.join(OUT, 'OFL.txt'));
await writeFile(path.join(OUT, 'charset.txt'), text);
console.log(`${chars.size} 文字`);
