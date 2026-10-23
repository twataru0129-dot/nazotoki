import { expect, test, type Page } from '@playwright/test';
import { back, face, newGame, open, placeByTap, SOLVERS, solveBooksByTap } from './helpers';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  (page as unknown as { _errors: string[] })._errors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as unknown as { _errors: string[] })._errors).toEqual([]);
});

const notebook = async (page: Page, tab?: string) => {
  await page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: '手帳', exact: true }).click();
  if (tab) await page.getByRole('tab', { name: tab }).click();
};
const closeModal = (page: Page) => page.getByRole('button', { name: '閉じる' }).click();
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('study0017.ch1.save') ?? 'null'));

test('任意調査6件を見つけて手帳に記録できる（謎の後に出るものは解決後だけ）', async ({ page }) => {
  await newGame(page);
  // 探索補助では任意調査（蝶番）を光らせない
  await face(page, 'south');
  await page.getByRole('button', { name: '調べられる場所を光らせる' }).click();
  await expect(page.locator('[data-hotspot="door"]')).toHaveClass(/is-highlight/);
  await expect(page.locator('[data-hotspot="hinge"]')).not.toHaveClass(/is-highlight/);
  // O5 蝶番
  await page.locator('[data-hotspot="hinge"]').click();
  await expect(page.getByTestId('monologue')).toContainText('蝶番だけが妙に新しい');
  // O6 手紙の裏
  await page.getByRole('button', { name: '持ち物', exact: true }).click();
  await page.getByRole('button', { name: '城戸の手紙' }).click();
  await page.getByRole('button', { name: '裏返す' }).click();
  await page.getByRole('button', { name: '手紙の裏の跡を調べる' }).click();
  await expect(page.getByTestId('overlay-letter')).toContainText('二本の線の跡');
  await closeModal(page);
  // O1 写真の右端（机）。O4 は引き出しを開けるまで出ない
  await open(page, 'north', 'desk');
  await expect(page.locator('[data-optional="O4"]')).toHaveCount(0);
  await page.getByRole('button', { name: '写真の右端を調べる' }).click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('光沢が違う');
  await page.locator('[data-drawer="right"]').click();
  await page.getByRole('button', { name: '引き出しの底を調べる' }).click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('「II」');
  await back(page);
  // O2 本棚の金具（解決後）
  await open(page, 'north', 'bookshelf');
  await expect(page.locator('[data-optional="O2"]')).toHaveCount(0);
  await solveBooksByTap(page);
  await page.getByRole('button', { name: '収納の奥の金具を調べる' }).click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('大きすぎる');
  await back(page);
  // O3 額の裏の傷（解決後）
  await open(page, 'west', 'paintings');
  await expect(page.locator('[data-optional="O3"]')).toHaveCount(0);
  await page.locator('[data-painting="C"]').click();
  await page.getByRole('button', { name: '額の裏の傷を調べる' }).click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('新しい擦り傷');
  // 2回目は記録が増えない
  await page.getByRole('button', { name: '額の裏の傷を調べる' }).click();
  await back(page);
  await notebook(page, '調査メモ');
  await expect(page.getByText('調査メモ　6 / 6')).toBeVisible();
  await expect(page.getByTestId('note-list').locator('li')).toHaveCount(6);
  await expect(page.getByTestId('observer-badge')).toBeVisible();
  expect((await saved(page)).progress.optionalNotes).toEqual(['O5', 'O6', 'O1', 'O4', 'O2', 'O3']);
});

test('手帳：未発見の調査項目名は先に出さない', async ({ page }) => {
  await newGame(page);
  await notebook(page, '調査メモ');
  await expect(page.getByText('調査メモ　0 / 6')).toBeVisible();
  const text = await page.getByTestId('overlay-notebook').innerText();
  expect(text).not.toMatch(/写真の右端|本棚の金具|額縁の傷|引き出しの刻印|新しい蝶番|手紙の裏面/);
});

test('2枚目の物音・4枚目の静寂は一度だけ。再読み込みしても再発しない', async ({ page }) => {
  await newGame(page);
  await SOLVERS.B(page);
  await open(page, 'east', 'clock');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '針を1分戻す' }).click();
  await page.getByRole('button', { name: '記録カードDを取る' }).click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('コトッ');
  await back(page);
  expect((await saved(page)).progress.eventsSeen).toEqual(['knock']);
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await open(page, 'north', 'bookshelf');
  await solveBooksByTap(page);
  await page.getByRole('button', { name: '記録カードAを取る' }).click();
  await expect(page.getByTestId('closeup-monologue')).not.toContainText('コトッ');
  await back(page);
  await open(page, 'north', 'desk');
  await page.locator('[data-drawer="right"]').click();
  await page.getByRole('button', { name: '小さな鍵を取る' }).click();
  await page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' }).click();
  await page.getByTestId('desk-box').click();
  await page.getByRole('button', { name: '記録カードCを取る' }).click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('雨の音が遠のいた');
  await expect(page.locator('.silence-veil')).toHaveCount(1);
  expect((await saved(page)).progress.eventsSeen).toEqual(['knock', 'silence']);
});

test('ヒント画面の「次に何を調べる？」：取り忘れ・4枚後の扉を案内', async ({ page }) => {
  await newGame(page);
  await open(page, 'west', 'paintings');
  await page.locator('[data-painting="C"]').click();
  await back(page);
  await page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: 'ヒント', exact: true }).click();
  await page.getByRole('button', { name: /探索の手がかりを見る/ }).click();
  await expect(page.getByTestId('guide')).toContainText('西の絵画の裏に、まだ取っていない記録がある。');
  await closeModal(page);
  await open(page, 'west', 'paintings');
  await page.getByRole('button', { name: '記録カードBを取る' }).click();
  await back(page);
  for (const id of ['A', 'C', 'D']) await SOLVERS[id](page);
  await page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: 'ヒント', exact: true }).click();
  await page.getByRole('button', { name: /探索の手がかりを見る/ }).click();
  await expect(page.getByTestId('guide')).toContainText('4枚の記録がそろった。南の扉の装置を調べよう。');
});

test('プレイ時間：表示中だけ数え、扉の解錠でクリア時間を固定する', async ({ page }) => {
  await page.clock.install();
  await newGame(page);
  await page.clock.runFor(65_000);
  await notebook(page);
  await expect(page.getByTestId('play-time')).toHaveText('01:05');
  await closeModal(page);
  // タブが隠れている間は数えない
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }));
  await page.clock.runFor(30_000);
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }));
  await notebook(page);
  await expect(page.getByTestId('play-time')).toHaveText('01:05');
  await closeModal(page);
  // 解錠
  for (const id of ['A', 'B', 'C', 'D']) await SOLVERS[id](page);
  await open(page, 'south', 'door');
  for (const [id, slot] of [['D', 0], ['C', 1], ['B', 2], ['A', 3]] as const) await placeByTap(page, id, slot);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ダイヤルを1分戻す' }).click();
  await expect(page.locator('.door-device-ui.is-unlocked')).toBeVisible();
  const clear = (await saved(page)).progress.clearSeconds;
  expect(clear).toBeGreaterThanOrEqual(65);
  await page.clock.runFor(20_000);
  // 解錠演出の最後に、拡大画面は自動で閉じて探索画面へ戻る（第4段階）
  await expect(page.locator('.closeup')).toHaveCount(0);
  await notebook(page);
  const shown = await page.getByTestId('clear-time').innerText();
  await page.clock.runFor(15_000);
  await expect(page.getByTestId('clear-time')).toHaveText(shown);
  const p = (await saved(page)).progress;
  expect(p.clearSeconds).toBe(clear);
  expect(p.afterClearSeconds).toBeGreaterThan(0);
});

test('手帳の記録：時刻順と手に入れた順を切り替え、所持先も分かる', async ({ page }) => {
  await newGame(page);
  for (const id of ['D', 'A', 'C']) await SOLVERS[id](page);
  await open(page, 'south', 'door');
  await placeByTap(page, 'C', 1);
  await back(page);
  await notebook(page);
  const order = () => page.getByTestId('record-list').locator('li[data-card]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.card));
  expect(await order()).toEqual(['A', 'C', 'D']);
  await page.getByRole('button', { name: '手に入れた順' }).click();
  expect(await order()).toEqual(['D', 'A', 'C']);
  await expect(page.locator('li[data-card="C"]')).toContainText('所持先：扉の枠2');
  await expect(page.locator('li[data-card="A"]')).toContainText('所持先：持ち物');
});

test('オープニングを見返しても進行は変わらず、元の向きに戻る', async ({ page }) => {
  await newGame(page);
  await SOLVERS.B(page);
  await face(page, 'east');
  await notebook(page, '手紙');
  await page.getByRole('button', { name: 'オープニングを見返す' }).click();
  await expect(page.getByRole('button', { name: '書斎に戻る' })).toBeVisible();
  await page.getByRole('button', { name: '手紙を読む' }).click();
  await page.getByRole('button', { name: '書斎へ入る' }).click();
  await page.getByRole('button', { name: '書斎を調べる' }).click();
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'east');
  await page.getByRole('button', { name: '持ち物', exact: true }).click();
  await expect(page.getByText('記録カード　1 / 4')).toBeVisible();
});

test('本体が壊れたら、ひとつ前の保存から再開／書き出し／最初からを選べる', async ({ page }) => {
  await newGame(page);
  await SOLVERS.B(page);
  await face(page, 'east');
  await page.reload();
  await page.evaluate(() => localStorage.setItem('study0017.ch1.save', '{"saveVersion":2,"oops'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('正しく読み込めませんでした');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: '読み込めなかったデータを書き出す' }).click();
  expect((await dl).suggestedFilename()).toMatch(/^study0017-ch1-save-\d+\.json$/);
  await page.getByRole('button', { name: 'ひとつ前の保存から再開' }).click();
  await expect(page.getByTestId('stage')).toBeVisible();
  await page.getByRole('button', { name: '持ち物', exact: true }).click();
  await expect(page.getByText('記録カード　1 / 4')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('study0017.ch1.save.corrupt'))).toContain('oops');
});

test('旧い版（v1）の保存データを移行して再開できる', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const v1 = {
      saveVersion: 1,
      chapter: 1,
      savedAt: '',
      facing: 'west',
      closeup: null,
      progress: {
        books: { order: ['green', 'black', 'ivory', 'blue'], solved: false, compartmentOpen: false },
        paintings: { solved: true, frameOpen: true },
        desk: { rightOpen: false, key: 'unfound', boxOpen: false },
        clock: { minutes: 17, solved: false, compartmentOpen: false, handsReturned: false },
        door: { dialMinute: 17, unlocked: false },
        cards: { A: { at: 'unfound' }, B: { at: 'inventory' }, C: { at: 'unfound' }, D: { at: 'unfound' } },
        hintLevels: { books: 1, paintings: 0, desk: 0, clock: 0, door: 0 },
        optionalNotes: [],
        eventsSeen: [],
      },
    };
    localStorage.setItem('study0017.ch1.save', JSON.stringify(v1));
  });
  await page.reload();
  await expect(page.getByText('以前の版の保存データを読み込みました。')).toBeVisible();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'west');
  await page.getByRole('button', { name: '持ち物', exact: true }).click();
  await expect(page.getByText('記録カード　1 / 4')).toBeVisible();
  await closeModal(page);
  await face(page, 'north');
  expect((await saved(page)).saveVersion).toBe(3);
});
