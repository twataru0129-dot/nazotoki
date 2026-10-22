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

type Log = { t: number; ev: string; key: string }[];
const audioLog = (page: Page) => page.evaluate(() => (window as unknown as { __study0017Audio: { log: Log } }).__study0017Audio.log.map((e) => ({ ...e })));
const plays = async (page: Page) => (await audioLog(page)).filter((e) => e.ev === 'play').map((e) => e.key);

async function unlockDoor(page: Page, solve = ['A', 'B', 'C', 'D']) {
  for (const id of solve) await SOLVERS[id](page);
  await open(page, 'south', 'door');
  for (const [id, slot] of [['D', 0], ['C', 1], ['B', 2], ['A', 3]] as const) await placeByTap(page, id, slot);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ダイヤルを1分戻す' }).click();
}

test('1 音声20ファイルがすべて読み込め、長さが管理表と一致する', async ({ page }) => {
  await page.goto('./');
  const result = await page.evaluate(async () => {
    const manifest = await (await fetch('assets/audio/../../assets/audio/bgm/title.mp3', { method: 'HEAD' })).ok;
    const files = [
      ['bgm/title.mp3', 179.4], ['bgm/study.mp3', 206.71], ['bgm/reveal.mp3', 38.23],
      ['ambient/rain_loop.mp3', 20.04], ['ambient/old_house.mp3', 10.03],
      ['sfx/book_move.mp3', 1.52], ['sfx/box_unlock.mp3', 2.04], ['sfx/card_flip.mp3', 2.04], ['sfx/card_pickup.mp3', 2.04],
      ['sfx/clock_gear.mp3', 3.03], ['sfx/clock_reset.mp3', 2.04], ['sfx/door_mechanism.mp3', 3.03], ['sfx/door_open.mp3', 5.04],
      ['sfx/door_unlock.mp3', 3.03], ['sfx/drawer_open.mp3', 2.04], ['sfx/footsteps_hallway.mp3', 5.04], ['sfx/frame_move.mp3', 2.04],
      ['sfx/mysterious_knock.mp3', 2.04], ['sfx/paper_turn.mp3', 1.52], ['sfx/shelf_unlock.mp3', 3.03],
    ] as const;
    const ctx = new OfflineAudioContext(2, 44100, 44100);
    const out: [string, number, number][] = [];
    for (const [f, d] of files) {
      const buf = await (await fetch(`assets/audio/${f}`)).arrayBuffer();
      const audio = await ctx.decodeAudioData(buf);
      out.push([f, d, audio.duration]);
    }
    return { manifest, out };
  });
  expect(result.manifest).toBe(true);
  expect(result.out).toHaveLength(20);
  for (const [f, d, got] of result.out) expect(Math.abs(got - d), f).toBeLessThan(0.15);
});

test('2 BGM：タイトル→探索で切り替わり（重ならない）、末尾の手前で次の周回へつながる', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめから' }).click();
  expect(await plays(page)).toContain('title');
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect.poll(async () => (await audioLog(page)).map((e) => `${e.ev}:${e.key}`)).toEqual(expect.arrayContaining(['stop:title', 'play:study', 'play:rain_loop']));
  // ループ：末尾の2.5秒前へ進めると、無音になる前に次の周回が始まる
  for (const key of ['study', 'rain_loop']) {
    await page.evaluate((k) => (window as unknown as { __study0017Audio: { seekLoopNearEnd: (k: string, s: number) => void } }).__study0017Audio.seekLoopNearEnd(k, 2.5), key);
    await expect.poll(async () => (await audioLog(page)).some((e) => e.ev === 'loop' && e.key === key), { timeout: 6000 }).toBe(true);
  }
  expect(await page.evaluate(() => (window as unknown as { __study0017Audio: { isLoopPlaying: (k: string) => boolean } }).__study0017Audio.isLoopPlaying('study'))).toBe(true);
  // タイトルに戻ると探索BGMは止まり、タイトルBGMのループもつながる
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: 'タイトルへ戻る' }).click();
  await page.getByRole('button', { name: 'タイトルへ戻る' }).last().click();
  await expect.poll(async () => (await audioLog(page)).filter((e) => e.key === 'study').at(-1)?.ev).toBe('stop');
  await page.evaluate(() => (window as unknown as { __study0017Audio: { seekLoopNearEnd: (k: string, s: number) => void } }).__study0017Audio.seekLoopNearEnd('title', 2.5));
  await expect.poll(async () => (await audioLog(page)).some((e) => e.ev === 'loop' && e.key === 'title'), { timeout: 6000 }).toBe(true);
});

test('3 効果音の発生タイミング（謎・カード・物音・解錠・先へ進む）', async ({ page }) => {
  test.setTimeout(90_000);
  await newGame(page);
  await open(page, 'north', 'bookshelf');
  await page.locator('[data-book="green"]').click();
  await page.locator('[data-book="blue"]').click();
  expect(await plays(page)).toContain('book_move');
  await back(page);
  await SOLVERS.A(page);
  await SOLVERS.B(page);
  const p1 = await plays(page);
  expect(p1).toEqual(expect.arrayContaining(['shelf_unlock', 'card_pickup', 'frame_move']));
  // 2枚目：取得音の約1.6秒後に物音（一度だけ）
  await expect.poll(async () => (await plays(page)).filter((k) => k === 'mysterious_knock').length, { timeout: 4000 }).toBe(1);
  const log = await audioLog(page);
  const knock = log.find((e) => e.key === 'mysterious_knock')!;
  const pickup2 = log.filter((e) => e.key === 'card_pickup' && e.t < knock.t).at(-1)!;
  expect(knock.t - pickup2.t).toBeGreaterThan(1300);
  await SOLVERS.C(page);
  await SOLVERS.D(page);
  await expect.poll(() => plays(page), { timeout: 4000 }).toEqual(expect.arrayContaining(['drawer_open', 'box_unlock', 'clock_gear', 'clock_reset', 'duck']));
  const p2 = await plays(page);
  expect(p2.filter((k) => k === 'mysterious_knock')).toHaveLength(1);
  // 解錠：装置 → 反転（約1.5秒後）→ 解錠（約3.8秒後）。5.2秒後に探索画面へ戻り、扉が開く
  await open(page, 'south', 'door');
  for (const [id, slot] of [['D', 0], ['C', 1], ['B', 2], ['A', 3]] as const) await placeByTap(page, id, slot);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ダイヤルを1分戻す' }).click();
  await expect(page.locator('.closeup')).toHaveCount(0, { timeout: 8000 });
  const d = await audioLog(page);
  const at = (k: string) => d.find((e) => e.ev === 'play' && e.key === k)!.t;
  expect(at('card_flip') - at('door_mechanism')).toBeGreaterThan(1300);
  expect(at('door_unlock') - at('door_mechanism')).toBeGreaterThan(3500);
  // 先へ進む：BGMを止め、きしみ → 足音
  await page.getByRole('button', { name: '先へ進む' }).click();
  await expect(page.getByTestId('door-transition')).toBeVisible();
  await expect.poll(async () => (await plays(page)).includes('footsteps_hallway'), { timeout: 12000 }).toBe(true);
  const e = await audioLog(page);
  const studyStop = e.filter((x) => x.key === 'study' && x.ev === 'stop').at(-1)!;
  const open1 = e.find((x) => x.key === 'door_open')!;
  const steps = e.find((x) => x.key === 'footsteps_hallway')!;
  expect(studyStop.t).toBeLessThan(open1.t);
  expect(steps.t - open1.t).toBeGreaterThan(4000);
  await expect(page.getByText('扉の向こうには、暗い通路が続いている。')).toBeVisible({ timeout: 6000 });
  expect(await plays(page)).toContain('reveal');
});

test('4 ミュート・音量変更が系統ごとに反映される', async ({ page }) => {
  await newGame(page);
  const level = (ch: string) => page.evaluate((c) => (window as unknown as { __study0017Audio: { channelLevel: (c: string) => number } }).__study0017Audio.channelLevel(c), ch);
  await page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: 'ミュート' }).first().click(); // BGM
  await expect.poll(() => level('bgm')).toBeLessThan(0.01);
  expect(await level('sfx')).toBeGreaterThan(0.5);
  await page.locator('#vol-sfx').fill('30');
  await expect.poll(() => level('sfx')).toBeCloseTo(0.3, 1);
  await page.getByRole('button', { name: 'ミュート中' }).click();
  await expect.poll(() => level('bgm')).toBeGreaterThan(0.5);
});

test('洋館のきしみは不規則な間隔で、40秒以上あけて鳴る', async ({ page }) => {
  await page.clock.install();
  await newGame(page);
  await page.clock.runFor(6 * 60_000);
  const log = (await audioLog(page)).filter((e) => e.key === 'old_house' && e.ev === 'play');
  expect(log.length).toBeGreaterThanOrEqual(3);
  expect(log.length).toBeLessThanOrEqual(9);
  for (let i = 1; i < log.length; i++) expect(log[i].t - log[i - 1].t).toBeGreaterThanOrEqual(40_000);
});

test('5 4方向の背景（北の本は操作中の並び、机上の写真、東の時計00:17）', async ({ page }) => {
  await newGame(page);
  await expect(page.locator('[data-scene-book]')).toHaveCount(4);
  expect(await page.locator('[data-scene-book]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.sceneBook))).toEqual(['green', 'black', 'ivory', 'blue']);
  await expect(page.locator('[data-scene-book="red"]')).toHaveCount(0);
  await expect(page.locator('[data-scene-photo="A"]')).toHaveCount(1);
  await open(page, 'north', 'bookshelf');
  await solveBooksByTap(page);
  await back(page);
  expect(await page.locator('[data-scene-book]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.sceneBook))).toEqual(['blue', 'ivory', 'black', 'green']);
  for (const [f, img] of [['east', 'a_east'], ['south', 'a_south_closed'], ['west', 'a_west'], ['north', 'a_north']]) {
    await face(page, f);
    await expect(page.locator('.stage-bg')).toHaveAttribute('src', new RegExp(`${img}\\.webp$`));
  }
  await face(page, 'east');
  await expect(page.getByTestId('stage').getByRole('img', { name: '時計の針は0時17分を指している' })).toBeVisible();
});

test('6・7 正解演出は一度だけ。演出の途中で再読み込みしても、進行は壊れず演出も繰り返さない', async ({ page }) => {
  await newGame(page);
  await open(page, 'north', 'bookshelf');
  await solveBooksByTap(page);
  await expect(page.locator('.compartment.animate-open')).toHaveCount(1);
  await back(page);
  await open(page, 'north', 'bookshelf'); // 開き直しても繰り返さない
  await expect(page.locator('.compartment.is-open')).toHaveCount(1);
  await expect(page.locator('.compartment.animate-open')).toHaveCount(0);
  await back(page);
  for (const id of ['B', 'C', 'D']) await SOLVERS[id](page);
  await open(page, 'north', 'bookshelf');
  await page.getByRole('button', { name: '記録カードAを取る' }).click();
  await back(page);
  await open(page, 'south', 'door');
  for (const [id, slot] of [['D', 0], ['C', 1], ['B', 2], ['A', 3]] as const) await placeByTap(page, id, slot);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ダイヤルを1分戻す' }).click();
  await expect(page.locator('.door-device-ui.animate-solve')).toHaveCount(1);
  await page.waitForTimeout(1800); // 反転の途中
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.getByTestId('closeup-door')).toBeVisible();
  await expect(page.locator('.door-device-ui.is-unlocked')).toHaveCount(1);
  await expect(page.locator('.door-device-ui.animate-solve')).toHaveCount(0);
  await expect(page.locator('.card-back')).toHaveCount(4);
  await page.waitForTimeout(5600);
  await expect(page.getByTestId('closeup-door')).toBeVisible(); // 自動で閉じる演出も繰り返さない
  await back(page);
  await expect(page.getByRole('button', { name: '先へ進む' })).toBeVisible();
  // 扉の演出の途中で再読み込み → 探索（南・解錠済み）から再開でき、もう一度見られる
  await page.getByRole('button', { name: '先へ進む' }).click();
  await page.waitForTimeout(3000);
  await page.reload();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.getByRole('button', { name: '先へ進む' })).toBeVisible();
  await page.getByRole('button', { name: '先へ進む' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.getByText('扉の向こうには、暗い通路が続いている。')).toBeVisible();
});

test('動きを減らす設定：解錠と扉の演出が短くなり、カード獲得の飛び出しを出さない', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await newGame(page);
  await SOLVERS.B(page);
  await expect(page.getByTestId('card-toast')).toBeHidden();
  await unlockDoor(page, ['A', 'C', 'D']);
  await expect(page.locator('.closeup')).toHaveCount(0, { timeout: 3000 });
  await page.getByRole('button', { name: '先へ進む' }).click();
  await expect(page.locator('.door-transition.is-reduced')).toBeVisible();
  await expect(page.getByText('扉の向こうには、暗い通路が続いている。')).toBeVisible({ timeout: 6000 });
});

test('8 スマホ縦：扉の演出・解錠画面で重要なボタンが画面内にあり、44px以上', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await newGame(page);
  await unlockDoor(page);
  for (const name of ['戻る', 'ヒント']) {
    const b = (await page.getByTestId('closeup-door').getByRole('button', { name, exact: true }).boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
  }
  await expect(page.locator('.closeup')).toHaveCount(0, { timeout: 8000 });
  const go = (await page.getByRole('button', { name: '先へ進む' }).boundingBox())!;
  expect(go.y + go.height).toBeLessThanOrEqual(667);
  await page.getByRole('button', { name: '先へ進む' }).click();
  const skip = (await page.getByRole('button', { name: 'スキップ' }).boundingBox())!;
  expect(skip.x + skip.width).toBeLessThanOrEqual(375);
  expect(skip.y).toBeGreaterThanOrEqual(0);
  expect(skip.height).toBeGreaterThanOrEqual(43.5);
});

test('9 音声が使えない環境でも最後まで進められる', async ({ page }) => {
  await page.addInitScript(() => {
    // AudioContext を使えなくする
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true });
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined, configurable: true });
  });
  await newGame(page);
  await unlockDoor(page);
  await expect(page.locator('.door-device-ui.is-unlocked')).toBeVisible();
  await expect(page.locator('.closeup')).toHaveCount(0, { timeout: 8000 });
  await page.getByRole('button', { name: '先へ進む' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.getByText('扉の向こうには、暗い通路が続いている。')).toBeVisible();
  expect(await plays(page)).toEqual([]);
});
