import { expect, test } from '@playwright/test';
import { back, bookOrder, dragBetween, face, newGame, open, placeByTap, slotCards, solveBooksByTap, SOLVERS } from './helpers';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  (page as unknown as { _errors: string[] })._errors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as unknown as { _errors: string[] })._errors).toEqual([]);
});

test('1 本棚：不正解では開かず、正解（タップ）で収納が開く。カードは手動で取る', async ({ page }) => {
  await newGame(page);
  await open(page, 'north', 'bookshelf');
  expect(await bookOrder(page)).toEqual(['green', 'black', 'ivory', 'blue']);
  // 不正解の入れ替え
  await page.locator('[data-book="green"]').click();
  await page.locator('[data-book="black"]').click();
  expect(await bookOrder(page)).toEqual(['black', 'green', 'ivory', 'blue']);
  await expect(page.getByRole('button', { name: '記録カードAを取る' })).toHaveCount(0);
  await solveBooksByTap(page);
  expect(await bookOrder(page)).toEqual(['blue', 'ivory', 'black', 'green']);
  const take = page.getByRole('button', { name: '記録カードAを取る' });
  await expect(take).toBeVisible();
  await take.click();
  await expect(take).toHaveCount(0);
  await expect(page.getByTestId('closeup-monologue')).toContainText('記録カードAを手に入れた');
});

test('1 本棚：ドラッグでも並べ替えられる', async ({ page }) => {
  await newGame(page);
  await open(page, 'north', 'bookshelf');
  await dragBetween(page, '[data-book="blue"]', '[data-book="green"]');
  expect(await bookOrder(page)).toEqual(['blue', 'black', 'ivory', 'green']);
  await dragBetween(page, '[data-book="ivory"]', '[data-book="black"]');
  expect(await bookOrder(page)).toEqual(['blue', 'ivory', 'black', 'green']);
  await expect(page.getByRole('button', { name: '記録カードAを取る' })).toBeVisible();
});

test('2 絵画：A・B・Dは何も起きず、Cだけで額が開く', async ({ page }) => {
  await newGame(page);
  await open(page, 'west', 'paintings');
  for (const k of ['A', 'B', 'D']) {
    await page.locator(`[data-painting="${k}"]`).click();
    await expect(page.getByTestId('closeup-monologue')).toContainText('びくともしない');
    await expect(page.getByRole('button', { name: '記録カードBを取る' })).toHaveCount(0);
  }
  await page.locator('[data-painting="C"]').click();
  await expect(page.getByRole('button', { name: '記録カードBを取る' })).toBeVisible();
});

test('3 机：左・中央は開かず、右→鍵→選んで木箱→カードC', async ({ page }) => {
  await newGame(page);
  await open(page, 'north', 'desk');
  await page.getByTestId('desk-box').click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('鍵がかかっている');
  for (const d of ['left', 'middle']) {
    await page.locator(`[data-drawer="${d}"]`).click();
    await expect(page.getByTestId('closeup-monologue')).toContainText('開かない');
  }
  await expect(page.getByRole('button', { name: '小さな鍵を取る' })).toHaveCount(0);
  await page.locator('[data-drawer="right"]').click();
  await page.getByRole('button', { name: '小さな鍵を取る' }).click();
  // 鍵を選ばずに木箱 → 開かない（取得と解錠は別操作）
  await page.getByTestId('desk-box').click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('持ち物から鍵を選んで');
  await page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' }).click();
  await page.getByTestId('desk-box').click();
  await expect(page.getByRole('button', { name: '記録カードCを取る' })).toBeVisible();
  await expect(page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' })).toHaveCount(0);
});

test('4 時計：±1分で00:14にすると開く。取得後は00:17に戻り、解決は保持', async ({ page }) => {
  await newGame(page);
  await open(page, 'east', 'clock');
  const readout = page.getByTestId('clock-readout');
  await expect(readout).toHaveText('00:17');
  await page.getByRole('button', { name: '針を1分進める' }).click();
  await expect(readout).toHaveText('00:18');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '針を1分戻す' }).click();
  await expect(readout).toHaveText('00:15');
  await expect(page.getByRole('button', { name: '記録カードDを取る' })).toHaveCount(0);
  await page.getByRole('button', { name: '針を1分戻す' }).click();
  await expect(readout).toHaveText('00:14');
  await page.getByRole('button', { name: '記録カードDを取る' }).click();
  await expect(readout).toHaveText('00:17');
  await expect(page.getByRole('button', { name: '針を1分戻す' })).toBeDisabled();
  await expect(page.getByRole('img', { name: '時計の針は0時17分を指している' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.getByTestId('clock-readout')).toHaveText('00:17');
  await expect(page.getByRole('button', { name: '記録カードDを取る' })).toHaveCount(0);
});

test('4 時計：分針のドラッグでも合わせられる', async ({ page }) => {
  await newGame(page);
  await open(page, 'east', 'clock');
  const box = (await page.getByTestId('clock-dial').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = box.width * 0.35;
  const at = (min: number) => [cx + r * Math.sin((min * 6 * Math.PI) / 180), cy - r * Math.cos((min * 6 * Math.PI) / 180)] as const;
  await page.mouse.move(...at(17));
  await page.mouse.down();
  for (const m of [16, 15, 14]) await page.mouse.move(...at(m), { steps: 3 });
  await expect(page.getByTestId('clock-readout')).toHaveText('00:14');
  await page.mouse.up();
  await expect(page.getByRole('button', { name: '記録カードDを取る' })).toBeVisible();
});

test('6 別の順番で解く（D→B→C→A）', async ({ page }) => {
  await newGame(page);
  for (const id of ['D', 'B', 'C', 'A']) await SOLVERS[id](page);
  await open(page, 'south', 'door');
  await expect(page.getByText('集めた記録　4 / 4')).toBeVisible();
});

test('7 謎を解いてカードを取らずに移動・再読み込みしても、収納は開いたままで取れる', async ({ page }) => {
  await newGame(page);
  await open(page, 'west', 'paintings');
  await page.locator('[data-painting="C"]').click();
  await back(page);
  await face(page, 'north');
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await open(page, 'west', 'paintings');
  await page.getByRole('button', { name: '記録カードBを取る' }).click();
  await page.getByRole('button', { name: '戻る' }).click();
  await page.getByRole('button', { name: '持ち物', exact: true }).click();
  await expect(page.getByText('記録カード　1 / 4')).toBeVisible();
});

test('8 扉：カード配置の途中で閉じて再開しても、配置とダイヤルが残る', async ({ page }) => {
  await newGame(page);
  await SOLVERS.A(page);
  await SOLVERS.B(page);
  await open(page, 'south', 'door');
  await placeByTap(page, 'A', 3);
  await placeByTap(page, 'B', 0);
  await page.getByRole('button', { name: 'ダイヤルを1分戻す' }).click();
  expect(await slotCards(page)).toEqual(['B', null, null, 'A']);
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.getByTestId('closeup-door')).toBeVisible();
  expect(await slotCards(page)).toEqual(['B', null, null, 'A']);
  await expect(page.getByTestId('dial-readout')).toHaveText('00:16');
  // 枠から外す・枠どうしを入れ替える（ドラッグ）
  await page.locator('[data-slot="0"]').click();
  expect(await slotCards(page)).toEqual([null, null, null, 'A']);
  await dragBetween(page, '[data-slot="3"]', '[data-slot="1"]');
  expect(await slotCards(page)).toEqual([null, 'A', null, null]);
  await dragBetween(page, '.inv-bar [data-card="B"]', '[data-slot="1"]');
  expect(await slotCards(page)).toEqual([null, 'B', null, null]);
  await expect(page.locator('.inv-bar [data-card="A"]')).toBeVisible();
});

test('9 カード・鍵の二重取得はできない', async ({ page }) => {
  await newGame(page);
  await open(page, 'north', 'desk');
  await page.locator('[data-drawer="right"]').click();
  const key = page.getByRole('button', { name: '小さな鍵を取る' });
  await key.dblclick();
  await expect(page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' })).toHaveCount(1);
  await page.locator('[data-drawer="right"]').click();
  await expect(key).toHaveCount(0);
  await page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' }).click();
  await page.getByTestId('desk-box').click();
  await page.getByRole('button', { name: '記録カードCを取る' }).dblclick();
  await back(page);
  await page.getByRole('button', { name: '持ち物', exact: true }).click();
  await expect(page.getByText('記録カード　1 / 4')).toBeVisible();
  await expect(page.getByText('小さな鍵（使用済み）')).toBeVisible();
});

test('5・10 全カード取得から扉の解錠・先へ進むまで通しでプレイ', async ({ page }) => {
  await newGame(page);
  for (const id of ['A', 'B', 'C', 'D']) await SOLVERS[id](page);
  await open(page, 'south', 'door');
  // 順序だけ正解（ダイヤル 00:17）では開かない
  for (const [id, slot] of [['D', 0], ['C', 1], ['B', 2], ['A', 3]] as const) await placeByTap(page, id, slot);
  await expect(page.getByTestId('closeup-monologue')).toContainText('動かない');
  await expect(page.locator('.card-back')).toHaveCount(0); // 裏面はまだ描画されない
  // 時刻だけ正解（順序が違う：△○□◇）でも開かない
  await page.locator('[data-slot="0"]').click(); // ◇を外す
  await page.locator('[data-slot="3"]').click(); // △を外す
  await placeByTap(page, 'A', 0);
  await placeByTap(page, 'D', 3);
  expect(await slotCards(page)).toEqual(['A', 'C', 'B', 'D']);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ダイヤルを1分戻す' }).click();
  await expect(page.getByTestId('dial-readout')).toHaveText('00:14');
  await expect(page.locator('.door-device-ui.is-unlocked')).toHaveCount(0);
  await expect(page.locator('.card-back')).toHaveCount(0);
  // 正解：◇○□△ ＋ 00:14
  await dragBetween(page, '[data-slot="3"]', '[data-slot="0"]'); // 枠どうしの入れ替え → D,C,B,A
  expect(await slotCards(page)).toEqual(['D', 'C', 'B', 'A']);
  await expect(page.locator('.door-device-ui.is-unlocked')).toBeVisible();
  await expect(page.locator('.card-back')).toHaveCount(4);
  await expect(page.getByText('錠は外れた。')).toBeVisible();
  await back(page);
  await expect(page.getByRole('button', { name: '先へ進む' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await face(page, 'south');
  await page.getByRole('button', { name: '先へ進む' }).click();
  await expect(page.getByText('扉の向こうには、暗い通路が続いている。')).toBeVisible();
  await page.getByRole('button', { name: '書斎に戻る' }).click();
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'south');
});

test('進行中の本の並びは再読み込み後も保たれる（操作途中の保存）', async ({ page }) => {
  await newGame(page);
  await open(page, 'north', 'bookshelf');
  await page.locator('[data-book="green"]').click();
  await page.locator('[data-book="blue"]').click();
  expect(await bookOrder(page)).toEqual(['blue', 'black', 'ivory', 'green']);
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  expect(await bookOrder(page)).toEqual(['blue', 'black', 'ivory', 'green']);
});

test('持ち物を選んだまま向きを変え、解除できる', async ({ page }) => {
  await newGame(page);
  await open(page, 'north', 'desk');
  await page.locator('[data-drawer="right"]').click();
  await page.getByRole('button', { name: '小さな鍵を取る' }).click();
  await page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' }).click();
  await back(page);
  await expect(page.getByText('選択中：小さな鍵')).toBeVisible();
  await page.getByRole('button', { name: '右を向く' }).click();
  await expect(page.getByText('選択中：小さな鍵')).toBeVisible();
  await page.getByRole('button', { name: '解除' }).click();
  await expect(page.getByText('選択中：')).toHaveCount(0);
});

test('はじめから：保存がある場合は確認し、他の章のデータは消さない', async ({ page }) => {
  await newGame(page);
  await page.evaluate(() => localStorage.setItem('study0017.ch2.save', 'keep'));
  await page.reload();
  await page.getByRole('button', { name: 'はじめから' }).click();
  await expect(page.getByText('第1章の進行を消して')).toBeVisible();
  await page.getByRole('button', { name: '最初から始める' }).click();
  expect(await page.evaluate(() => localStorage.getItem('study0017.ch2.save'))).toBe('keep');
});

test('壊れた保存データは読み込まず、警告を出す', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('study0017.ch1.save', '{broken'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('正しく読み込めなかった');
  await expect(page.getByRole('button', { name: 'つづきから' })).toHaveCount(0);
});

test('本棚：絵柄は図形で表示し、答えになる漢字を画面に出さない。並べ替え・ドラッグ中も絵柄が本からずれない', async ({ page }) => {
  const EXPECTED: Record<string, [string, string]> = {
    blue: ['moon', 'wave'],
    ivory: ['wave', 'leaf'],
    black: ['leaf', 'star'],
    green: ['star', 'sun'],
  };
  await newGame(page);
  await open(page, 'north', 'bookshelf');

  const check = async () => {
    for (const [id, [l, r]] of Object.entries(EXPECTED)) {
      const book = page.locator(`[data-book="${id}"]`);
      const bb = (await book.boundingBox())!;
      for (const [side, sym] of [['left', l], ['right', r]] as const) {
        const g = book.locator(`[data-side="${side}"]`);
        await expect(g).toHaveAttribute('data-symbol', sym);
        const gb = (await g.boundingBox())!;
        // 絵柄は本の中、左は左半分・右は右半分に収まる
        expect(gb.width).toBeGreaterThan(8);
        expect(gb.x).toBeGreaterThanOrEqual(bb.x);
        expect(gb.x + gb.width).toBeLessThanOrEqual(bb.x + bb.width + 0.5);
        const mid = bb.x + bb.width / 2;
        if (side === 'left') expect(gb.x + gb.width / 2).toBeLessThan(mid);
        else expect(gb.x + gb.width / 2).toBeGreaterThan(mid);
      }
    }
  };

  const visibleText = () => page.locator('.shelf').evaluate((el) => (el as HTMLElement).innerText);
  const noKanji = async () => {
    expect(await visibleText()).not.toMatch(/[月波葉星陽]/);
    const help = await page.locator('.op-help').allInnerTexts();
    for (const t of help) expect(t).not.toMatch(/[月波葉星陽]/);
  };

  await check();
  await noKanji();
  await page.locator('[data-book="blue"]').click();
  await noKanji();
  await page.locator('[data-book="green"]').click();
  await check();
  // ドラッグ途中（指を離す前）も、棚の本と絵柄の対応・位置は変わらない
  const a = (await page.locator('[data-book="ivory"]').boundingBox())!;
  const t = (await page.locator('[data-book="black"]').boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 15, a.y + a.height / 2, { steps: 3 });
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 6 });
  await expect(page.locator('.book-ghost [data-symbol]')).toHaveCount(2);
  await check();
  await page.mouse.up();
  await check();
  expect(await bookOrder(page)).toEqual(['blue', 'ivory', 'black', 'green']);
  await expect(page.getByRole('button', { name: '記録カードAを取る' })).toBeVisible();
  await noKanji();
  // 読み上げ用の説明は内部に保持（画面には出ない）
  await expect(page.locator('[data-book="blue"]')).toHaveAttribute('aria-label', /左：月、右：波/);
});
