import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import manifest from '../data/audio_manifest.json';
import { SOUNDS } from './audioRegistry';
import { HINTS, LETTER_LINES } from './text';
import { PUZZLES } from './types';

const pub = (p: string) => path.resolve(__dirname, '../../public/assets', p);

describe('音声（audio_manifest.json が正本）', () => {
  it('20ファイル：BGM3・環境音2・効果音15', () => {
    const defs = Object.values(SOUNDS);
    expect(defs).toHaveLength(20);
    expect(defs.filter((d) => d.channel === 'bgm')).toHaveLength(3);
    expect(defs.filter((d) => d.channel === 'ambient')).toHaveLength(2);
    expect(defs.filter((d) => d.channel === 'sfx')).toHaveLength(15);
  });

  it('public/assets/audio に無変換で配置されている（SHA-256一致）', () => {
    for (const a of manifest.assets) {
      const file = pub(`audio/${a.relative_path}`);
      expect(existsSync(file), a.relative_path).toBe(true);
      expect(createHash('sha256').update(readFileSync(file)).digest('hex'), a.relative_path).toBe(a.sha256);
    }
  });
});

describe('文言とフォント', () => {
  it('ヒントは5問×3段階＝15本', () => {
    expect(PUZZLES.flatMap((p) => HINTS[p])).toHaveLength(15);
  });

  it('手紙の確定文面', () => {
    expect(LETTER_LINES.at(-1)).toBe('この部屋には、一つだけ嘘がある。');
  });

  it('src で使う日本語の文字はすべて同梱フォントのサブセットに含まれる（npm run fonts 済み）', () => {
    const charset = new Set(readFileSync(path.resolve(__dirname, '../data/font-charset.txt'), 'utf8'));
    const root = path.resolve(__dirname, '..');
    const files = (readdirSync(root, { recursive: true }) as string[]).filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes('.test.'));
    const src = files.map((f) => readFileSync(path.join(root, f), 'utf8')).join('');
    const missing = [...new Set(src)].filter((c) => c.codePointAt(0)! > 0x7f && !charset.has(c));
    expect(missing).toEqual([]);
  });
});
