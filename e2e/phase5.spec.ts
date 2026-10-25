import { expect, test, type Page } from '@playwright/test';
import { back, face, newGame, open, placeByTap, SOLVERS } from './helpers';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  (page as unknown as { _errors: string[] })._errors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as unknown as { _errors: string[] })._errors).toEqual([]);
});

type Log = { t: number; ev: string; key: string }[];
const audioLog = (page: Page) => page.evaluate(() => (window as unknown as { __study0017Audio: { log: Log } }).__study0017Audio.log.map((e) => ({ ...e })));
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('study0017.ch1.save') ?? 'null'));

async function unlock(page: Page) {
  for (const id of ['A', 'B', 'C', 'D']) await SOLVERS[id](page);
  await open(page, 'south', 'door');
  for (const [id, slot] of [['D', 0], ['C', 1], ['B', 2], ['A', 3]] as const) await placeByTap(page, id, slot);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ダイヤルを1分戻す' }).click();
  await expect(page.locator('.door-device-ui.is-unlocked')).toBeVisible();
  await expect(page.locator('.card-back')).toHaveCount(4);
}

/** 時計を進めながら、エンディングの時刻 t(ms) まで待つ */
async function playTo(page: Page, ms: number) {
  const cur = Number(await page.getByTestId('ending').getAttribute('data-t'));
  if (ms > cur) await page.clock.runFor(ms - cur);
}

test('1・2・3・4・5 扉の正解からエンディング、クリア画面まで通しで動く', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await newGame(page);
  await unlock(page);
  await page.clock.runFor(6000); // 解錠演出の終わりに探索画面へ戻る
  await expect(page.locator('.closeup')).toHaveCount(0);
  const clearAtUnlock = (await saved(page)).progress.clearSeconds;
  // 先へ進むまでは自由に再調査できる
  await face(page, 'west');
  await open(page, 'west', 'paintings');
  await back(page);
  await face(page, 'south');
  await page.getByRole('button', { name: '先へ進む' }).click();
  expect((await saved(page)).progress.ending).toBe('playing');

  // 2 扉の演出：暗闇の扉 → ノブ → 扉が開く → 通路
  const tr = page.getByTestId('door-transition');
  await expect(tr).toBeVisible();
  await expect(tr.locator('.dt-leaf')).toBeVisible();
  await expect(tr.locator('.dt-knob')).toBeVisible();
  await expect(tr.locator('.dt-hall')).toBeAttached();
  const anims = await tr.evaluate((el) => el.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName));
  expect(anims).toEqual(expect.arrayContaining(['dt-appear', 'dt-knob', 'dt-open', 'dt-push']));
  await page.clock.runFor(9700);

  const ending = page.getByTestId('ending');
  await expect(ending).toBeVisible();
  const sub = page.getByTestId('ending-sub');
  const checks: [number, string, string | null][] = [
    [2500, 'hall', '……まだ、屋敷の中なのか？'],
    [8000, 'farDoor', '奥にも、部屋がある……？'],
    [12500, 'studyB', '……え？'],
    [15000, 'studyB', 'この部屋……さっきの……？'],
    [18500, 'clockB', '……0時14分？'],
    [21500, 'clockB', 'さっきの時計は、0時17分だったはず……。'],
    [24000, 'end', 'だとしたら……'],
    [26000, 'end', 'あの部屋は、いったい何だったんだ？'],
  ];
  for (const [ms, scene, text] of checks) {
    await playTo(page, ms);
    await expect(ending).toHaveAttribute('data-scene', scene);
    await expect(sub).toHaveText(text ?? '');
    if (scene === 'studyB') {
      // 3 書斎B：Aと同じ背景画像。赤い本・写真の人物は描くが字幕では触れない
      const room = page.locator('[data-ending-room="B-north"]');
      await expect(room.locator('img.stage-bg')).toHaveAttribute('src', /bg\/a_north\.webp$/);
      await expect(room.locator('[data-scene-book="red"]')).toHaveCount(1);
      await expect(room.locator('[data-photo="B"]')).toHaveCount(1);
    }
    if (scene === 'clockB') {
      // 4 書斎Bの時計は00:14（Aと同じ時計本体）
      const room = page.locator('[data-ending-room="B-east"]');
      await expect(room.locator('img.stage-bg')).toHaveAttribute('src', /bg\/a_east\.webp$/);
      await expect(room.getByRole('img', { name: '時計の針は0時14分を指している' })).toBeAttached();
    }
  }
  await playTo(page, 28_000);
  await expect(page.getByTestId('ending-card')).toContainText('第1章 完');
  await expect(page.getByTestId('ending-card')).toContainText('本当の事件は、まだ始まっていない。');
  // 5 音：BGM停止 → 扉のきしみ → reveal・足音 → 書斎Bの前に reveal 停止
  const log = await audioLog(page);
  const t = (ev: string, key: string) => log.find((e) => e.ev === ev && e.key === key)!.t;
  expect(t('stop', 'study')).toBeLessThan(t('play', 'door_open'));
  expect(t('play', 'reveal')).toBeLessThan(t('play', 'footsteps_hallway'));
  const revealPlay = t('play', 'reveal');
  const revealStop = log.find((e) => e.ev === 'stop' && e.key === 'reveal' && e.t > revealPlay)!.t;
  expect(revealStop - revealPlay).toBeGreaterThan(9500);
  expect(revealStop - revealPlay).toBeLessThan(11_000);
  expect(log.filter((e) => e.ev === 'play' && e.t > revealStop && ['title', 'study', 'reveal'].includes(e.key))).toEqual([]);

  // クリア画面
  await page.clock.runFor(3500);
  const clear = page.getByTestId('clear-screen');
  await expect(clear).toBeVisible();
  await expect(clear).toContainText('第1章クリア');
  await expect(clear).toContainText('解決した謎5 / 5');
  await expect(clear).not.toContainText('ヒント');
  await expect(page.getByTestId('clear-notes')).toHaveText('0 / 6');
  const p = (await saved(page)).progress;
  expect(p).toMatchObject({ ending: 'done', chapterCompleted: true, revisiting: false, clearSeconds: clearAtUnlock });
  const mm = String(Math.floor(clearAtUnlock / 60)).padStart(2, '0');
  const ss = String(clearAtUnlock % 60).padStart(2, '0');
  await expect(page.getByTestId('clear-time-final')).toHaveText(`${mm}:${ss}`);
  await expect(clear.getByRole('button', { name: '第2章（準備中）' })).toBeDisabled();
});

test('7 扉の演出中・ラストシーン中のスキップでも、クリア処理が行われる', async ({ page }) => {
  test.setTimeout(90_000);
  await newGame(page);
  await unlock(page);
  await expect(page.locator('.closeup')).toHaveCount(0, { timeout: 8000 });
  await page.getByRole('button', { name: '先へ進む' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click(); // 扉の演出中
  await expect(page.getByTestId('clear-screen')).toBeVisible();
  let p = (await saved(page)).progress;
  expect(p).toMatchObject({ ending: 'done', chapterCompleted: true });
  const clearedAt = p.clearedAt;
  // 見返し → ラストシーン中にスキップ → クリア日時は変わらない
  await page.getByRole('button', { name: 'エンディングをもう一度見る' }).click();
  await expect(page.getByTestId('door-transition')).toBeVisible();
  await expect(page.getByTestId('ending')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.getByTestId('clear-screen')).toBeVisible();
  p = (await saved(page)).progress;
  expect(p.clearedAt).toBe(clearedAt);
});

test('8 エンディングの途中で閉じたら、次回はエンディングの冒頭から。隠れている間は止まる', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.install();
  await newGame(page);
  await unlock(page);
  await page.clock.runFor(6000);
  await page.getByRole('button', { name: '先へ進む' }).click();
  await page.clock.runFor(9700);
  await expect(page.getByTestId('ending')).toBeVisible();
  await playTo(page, 6000);
  // バックグラウンド：時刻が進まない
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const before = Number(await page.getByTestId('ending').getAttribute('data-t'));
  await page.clock.runFor(5000);
  expect(Number(await page.getByTestId('ending').getAttribute('data-t'))).toBe(before);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(1000);
  expect(Number(await page.getByTestId('ending').getAttribute('data-t'))).toBeGreaterThan(before);
  // 閉じて再開
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.getByTestId('door-transition')).toBeVisible();
  expect((await saved(page)).progress.chapterCompleted).toBe(false);
});

test('9 クリア後の再調査：謎は解けたまま、未発見の調査メモを集められ、記録が増えも消えもしない', async ({ page }) => {
  test.setTimeout(90_000);
  await newGame(page);
  await unlock(page);
  await expect(page.locator('.closeup')).toHaveCount(0, { timeout: 8000 });
  await page.getByRole('button', { name: '先へ進む' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await page.getByRole('button', { name: '第1章を再調査' }).click();
  expect((await saved(page)).progress.revisiting).toBe(true);
  await expect(page.getByRole('button', { name: '先へ進む' })).toBeVisible();
  // 謎は解決済みのまま
  await open(page, 'north', 'bookshelf');
  expect(await page.locator('[data-book]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.book))).toEqual(['blue', 'ivory', 'black', 'green']);
  await expect(page.locator('.compartment.is-open')).toHaveCount(1);
  await page.getByRole('button', { name: '収納の奥の金具を調べる' }).click();
  await back(page);
  await open(page, 'south', 'door');
  await expect(page.locator('.card-back')).toHaveCount(4);
  await back(page);
  // 手帳：もう一つの書斎の記録、カード4枚（重複なし）、調査メモ1件
  await page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: '手帳', exact: true }).click();
  await expect(page.getByTestId('record-other-study')).toContainText('もう一つの書斎');
  await expect(page.getByTestId('record-list').locator('li[data-card]')).toHaveCount(4);
  await page.getByRole('tab', { name: '調査メモ' }).click();
  await expect(page.getByText('調査メモ　1 / 6')).toBeVisible();
  await page.getByRole('button', { name: '閉じる' }).click();
  // 再読み込みしても再調査中のまま
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.getByTestId('stage')).toBeVisible();
  await page.getByRole('button', { name: 'クリア画面' }).click();
  await expect(page.getByTestId('clear-notes')).toHaveText('1 / 6');
  const p = (await saved(page)).progress;
  expect(p.acquired).toEqual(['A', 'B', 'C', 'D']);
  expect(p.revisiting).toBe(false);
});

test('動きを減らす設定でもエンディングを最後まで見られる', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await newGame(page);
  await unlock(page);
  await page.clock.runFor(2000);
  await page.getByRole('button', { name: '先へ進む' }).click();
  await expect(page.locator('.door-transition.is-reduced')).toBeVisible();
  await page.clock.runFor(4300);
  await expect(page.getByTestId('ending')).toBeVisible();
  await playTo(page, 19_000);
  await expect(page.getByTestId('ending-sub')).toHaveText('……0時14分？');
  await playTo(page, 31_200);
  await expect(page.getByTestId('clear-screen')).toBeVisible();
});
