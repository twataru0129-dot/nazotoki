import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import manifest from '../data/audio_manifest.json';
import { SOUNDS } from './audioRegistry';
import { LETTER_LINES } from './text';

const pub = (p: string) => path.resolve(__dirname, '../../public/assets', p);

describe('音声（audio_manifest.json が正本）', () => {
  it('20ファイル：BGM3・環境音2・効果音15', () => {
    const defs = Object.values(SOUNDS);
    expect(defs).toHaveLength(20);
    expect(defs.filter((d) => d.channel === 'bgm')).toHaveLength(3);
    expect(defs.filter((d) => d.channel === 'ambient')).toHaveLength(2);
    expect(defs.filter((d) => d.channel === 'sfx')).toHaveLength(15);
  });

  it('public/assets/audio に配布用（タグ除去・再エンコードなし）が置かれている（SHA-256一致）', () => {
    for (const a of manifest.assets) {
      const file = pub(`audio/${a.relative_path}`);
      expect(existsSync(file), a.relative_path).toBe(true);
      expect(createHash('sha256').update(readFileSync(file)).digest('hex'), a.relative_path).toBe(a.distributed_sha256);
    }
  });

  it('配布用の音声にタグ（作成者名・生成ID・カバー画像などのメタデータ）が残っていない', () => {
    for (const a of manifest.assets) {
      const b = readFileSync(pub(`audio/${a.relative_path}`));
      expect(b.toString('latin1', 0, 3), a.relative_path).not.toBe('ID3');
      expect(b.toString('latin1', b.length - 128, b.length - 125), a.relative_path).not.toBe('TAG');
      expect(b.includes('APETAGEX'), a.relative_path).toBe(false);
      expect(b.includes('suno.com'), a.relative_path).toBe(false);
      expect(b.includes('c2pa'), a.relative_path).toBe(false);
      // 先頭は MPEG フレーム
      expect(b[0], a.relative_path).toBe(0xff);
    }
  });
});

describe('文言とフォント', () => {
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

describe('机上の古い写真（ユーザー提供）', () => {
  it('photo/old_photo.webp：横長 802×540（比率はそのまま）。位置情報などのメタデータを含まない', async () => {
    const sharp = (await import('sharp')).default;
    const m = await sharp(pub('photo/old_photo.webp')).metadata();
    expect([m.format, m.width, m.height]).toEqual(['webp', 802, 540]);
    expect(m.exif ?? null).toBeNull();
    expect(m.xmp ?? null).toBeNull();
    expect(m.icc ?? null).toBeNull();
  });
});
