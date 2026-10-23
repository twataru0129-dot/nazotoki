import { expect, test, type Page } from '@playwright/test';
import { back, bookOrder, dragBetween, face, open, placeByTap, slotCards } from './helpers';

// 第6段階 総合テスト：新規開始から第1章クリア・クリア後まで、実際のUI操作だけで通す。
// 全端末サイズ（小型スマホ・iPhone SE・iPhone 14・iPad・PC）で実行する。

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  (page as unknown as { _errors: string[] })._errors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as unknown as { _errors: string[] })._errors).toEqual([]);
});

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('study0017.ch1.save') ?? 'null'));
const menu = (page: Page, name: string) => page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name, exact: true }).click();

/** 画面内に見えているボタンが、すべて画面の内側にあり、44px以上あること。横スクロールが出ないこと */
async function checkLayout(page: Page, label: string, waitAnimations = true) {
  const vp = page.viewportSize()!;
  // 開閉のアニメーション（拡大0.25秒など）が終わってから測る（無限ループの装飾アニメは除く）。
  // 演出の途中で測るときは待たない（疑似時計は待っている間も実時間で進むため）
  if (waitAnimations) await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  const bad = await page.evaluate(
    ({ w, h }) => {
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('button'))) {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue;
        if (el.closest('[inert]') || el.closest('[aria-hidden="true"]')) continue;
        const name = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '?';
        // 縦スクロールする画面の中のボタンは縦方向の画面外を許す（スクロールで届く）
        const scroller = el.closest('.closeup-body, .modal-body, .clear-screen, .opening');
        if (r.left < -0.5 || r.right > w + 0.5) out.push(`${name}: 横にはみ出し`);
        if (!scroller && (r.top < -0.5 || r.bottom > h + 0.5)) out.push(`${name}: 縦にはみ出し`);
        if (r.width < 43.5 || r.height < 43.5) out.push(`${name}: ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      if (document.documentElement.scrollWidth > w + 1) out.push(`横スクロール ${document.documentElement.scrollWidth}px`);
      return out;
    },
    { w: vp.width, h: vp.height },
  );
  expect(bad, label).toEqual([]);
}

test('総合：タイトル → 手紙 → 4方向 → 4つの謎（任意の順） → 扉 → 演出 → 書斎B 00:14 → クリア → 再調査・再鑑賞・タイトル', async ({ page }) => {
  test.setTimeout(240_000);
  await page.clock.install();
  // 1 タイトル
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '午前0時17分の書斎' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'つづきから' })).toHaveCount(0);
  await checkLayout(page, 'タイトル');
  await page.getByRole('button', { name: 'はじめから' }).click();
  // 2 オープニングと手紙（表・裏）
  await expect(page.getByText('城戸透から届いた一通の手紙を頼りに')).toBeVisible();
  await page.getByRole('button', { name: '手紙を読む' }).click();
  await expect(page.getByText('この部屋には、一つだけ嘘がある。')).toBeVisible();
  await expect(page.getByText('00:17', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '裏返す' }).click();
  await expect(page.getByLabel('城戸透の手紙（裏）')).toBeVisible();
  await checkLayout(page, '手紙');
  await page.getByRole('button', { name: '書斎へ入る' }).click();
  await expect(page.getByText('鍵のかかる音がした。')).toBeVisible();
  await page.getByRole('button', { name: '書斎を調べる' }).click();
  // 3 4方向（ボタン・キーボード・スワイプ）
  const stage = page.getByTestId('stage');
  await expect(stage).toHaveAttribute('data-facing', 'north');
  await checkLayout(page, '探索・北');
  await page.getByRole('button', { name: '右を向く' }).click();
  await expect(stage).toHaveAttribute('data-facing', 'east');
  await page.keyboard.press('ArrowRight');
  await expect(stage).toHaveAttribute('data-facing', 'south');
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.9);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.9, { steps: 8 });
  await page.mouse.up();
  await expect(stage).toHaveAttribute('data-facing', 'west');
  await page.getByRole('button', { name: '左を向く' }).click();
  await page.getByRole('button', { name: '左を向く' }).click();
  await page.getByRole('button', { name: '左を向く' }).click();
  await expect(stage).toHaveAttribute('data-facing', 'north');

  // 4・5 謎を「時計 → 絵画 → 本棚 → 机」の順で、UIだけで解く
  // 時計：+1、−1×4（00:14）でカードD、取得後に00:17へ戻る
  await open(page, 'east', 'clock');
  await checkLayout(page, '時計');
  await page.getByRole('button', { name: '針を1分進める' }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '針を1分戻す' }).click();
  await expect(page.getByTestId('clock-readout')).toHaveText('00:14');
  await expect(page.getByRole('img', { name: '時計の針は0時14分を指している' })).toBeVisible();
  await page.getByRole('button', { name: '記録カードDを取る' }).click();
  await expect(page.getByTestId('clock-readout')).toHaveText('00:17');
  await back(page);
  // 絵画：A（不正解）→ C
  await open(page, 'west', 'paintings');
  await checkLayout(page, '絵画');
  await page.locator('[data-painting="A"]').click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('びくともしない');
  await page.locator('[data-painting="C"]').click();
  await page.getByRole('button', { name: '記録カードBを取る' }).click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('コトッ'); // 2枚目の物音
  await back(page);
  // 本棚：ドラッグ1回＋タップ入れ替え
  await open(page, 'north', 'bookshelf');
  await checkLayout(page, '本棚');
  await dragBetween(page, '[data-book="blue"]', '[data-book="green"]');
  expect(await bookOrder(page)).toEqual(['blue', 'black', 'ivory', 'green']);
  await page.locator('[data-book="ivory"]').click();
  await page.locator('[data-book="black"]').click();
  expect(await bookOrder(page)).toEqual(['blue', 'ivory', 'black', 'green']);
  await page.getByRole('button', { name: '記録カードAを取る' }).click();
  await back(page);
  // 机：左（開かない）→ 右 → 鍵 → 選んで木箱
  await open(page, 'north', 'desk');
  await checkLayout(page, '机');
  await page.locator('[data-drawer="left"]').click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('開かない');
  await page.locator('[data-drawer="right"]').click();
  await page.getByRole('button', { name: '小さな鍵を取る' }).click();
  await page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' }).click();
  await page.getByTestId('desk-box').click();
  await page.getByRole('button', { name: '記録カードCを取る' }).click();
  await expect(page.getByTestId('closeup-monologue')).toContainText('4枚の記録がそろった');
  await back(page);
  // 手帳：記録4枚（時刻順）
  await menu(page, '手帳');
  await checkLayout(page, '手帳');
  expect(await page.getByTestId('record-list').locator('li[data-card]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.card))).toEqual(['A', 'B', 'C', 'D']);
  await page.getByRole('button', { name: '閉じる' }).click();

  // 6 最後の扉：誤り → 正解
  await open(page, 'south', 'door');
  await checkLayout(page, '扉');
  for (const [id, slot] of [['A', 0], ['B', 1], ['C', 2], ['D', 3]] as const) await placeByTap(page, id, slot);
  await expect(page.getByTestId('closeup-monologue')).toContainText('動かない');
  await expect(page.locator('.card-back')).toHaveCount(0);
  await dragBetween(page, '[data-slot="3"]', '[data-slot="0"]'); // D↔A
  await dragBetween(page, '[data-slot="2"]', '[data-slot="1"]'); // C↔B
  expect(await slotCards(page)).toEqual(['D', 'C', 'B', 'A']);
  await expect(page.locator('.door-device-ui.is-unlocked')).toHaveCount(0); // 時刻がまだ 00:17
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'ダイヤルを1分戻す' }).click();
  await expect(page.locator('.door-device-ui.is-unlocked')).toBeVisible();
  await expect(page.locator('.card-back')).toHaveCount(4);
  await page.clock.runFor(6000);
  await expect(page.locator('.closeup')).toHaveCount(0);
  const clearSeconds = (await saved(page)).progress.clearSeconds;

  // 7 扉の演出 → 8 通路・書斎B → 9 時計00:14 → 第1章 完
  await page.getByRole('button', { name: '先へ進む' }).click();
  await expect(page.getByTestId('door-transition')).toBeVisible();
  await checkLayout(page, '扉の演出', false);
  await page.clock.runFor(9700);
  const ending = page.getByTestId('ending');
  await expect(ending).toBeVisible();
  await page.clock.runFor(2500);
  await expect(ending).toHaveAttribute('data-scene', 'hall');
  await page.clock.runFor(10_500);
  await expect(ending).toHaveAttribute('data-scene', 'studyB');
  await page.clock.runFor(6000);
  await expect(ending).toHaveAttribute('data-scene', 'clockB');
  await expect(page.locator('[data-ending-room="B-east"]').getByRole('img', { name: '時計の針は0時14分を指している' })).toBeAttached();
  await page.clock.runFor(9500);
  await expect(page.getByTestId('ending-card')).toContainText('第1章 完');
  await checkLayout(page, 'エンディング', false);
  await page.clock.runFor(3500);

  // 10 クリア画面
  await expect(page.getByTestId('clear-screen')).toBeVisible();
  await checkLayout(page, 'クリア画面');
  const mm = String(Math.floor(clearSeconds / 60)).padStart(2, '0');
  const ss = String(clearSeconds % 60).padStart(2, '0');
  await expect(page.getByTestId('clear-time-final')).toHaveText(`${mm}:${ss}`);
  await expect(page.getByTestId('clear-hints')).toHaveText('0 / 15');
  await expect(page.getByTestId('clear-notes')).toHaveText('0 / 6');

  // 11 再調査 → クリア画面 → 再鑑賞（スキップ）→ タイトル → つづきから
  await page.getByRole('button', { name: '第1章を再調査' }).click();
  await expect(stage).toHaveAttribute('data-facing', 'south');
  await page.getByRole('button', { name: 'クリア画面' }).click();
  await page.getByRole('button', { name: 'エンディングをもう一度見る' }).click();
  await expect(page.getByTestId('door-transition')).toBeVisible();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.getByTestId('clear-screen')).toBeVisible();
  await page.getByRole('button', { name: 'タイトルに戻る' }).click();
  await expect(page.getByRole('button', { name: 'つづきから' })).toBeVisible();
  await page.getByRole('button', { name: 'つづきから' }).click();
  await expect(page.getByTestId('clear-screen')).toBeVisible();
  const p = (await saved(page)).progress;
  expect(p).toMatchObject({ chapterCompleted: true, ending: 'done', clearSeconds, acquired: ['D', 'B', 'A', 'C'] });
});

test('各謎の途中退出と再開：操作途中の状態が保たれ、不正解のまま進まない', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめから' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  // 再読み込み → つづきから。前回開いていた拡大画面から再開する仕様
  const reload = async (expectCloseup?: string) => {
    await page.reload();
    await page.getByRole('button', { name: 'つづきから' }).click();
    if (expectCloseup) await expect(page.getByTestId(`closeup-${expectCloseup}`)).toBeVisible();
    else await expect(page.locator('.closeup')).toHaveCount(0);
  };
  // 本棚：途中の並び
  await open(page, 'north', 'bookshelf');
  await page.locator('[data-book="green"]').click();
  await page.locator('[data-book="ivory"]').click();
  await reload('bookshelf');
  expect(await bookOrder(page)).toEqual(['ivory', 'black', 'green', 'blue']);
  await expect(page.getByRole('button', { name: '記録カードAを取る' })).toHaveCount(0);
  await back(page);
  // 絵画：不正解のあと退出・再開 → 未解決のまま
  await open(page, 'west', 'paintings');
  await page.locator('[data-painting="D"]').click();
  await back(page);
  await reload();
  await open(page, 'west', 'paintings');
  await expect(page.getByRole('button', { name: '記録カードBを取る' })).toHaveCount(0);
  await expect(page.locator('[data-painting="C"]')).toBeEnabled();
  await back(page);
  // 机：右を開けて鍵を取らずに退出 → 鍵は残っている。取ってから再開 → 持ち物に1本
  await open(page, 'north', 'desk');
  await page.locator('[data-drawer="right"]').click();
  await back(page);
  await reload();
  await open(page, 'north', 'desk');
  await page.getByRole('button', { name: '小さな鍵を取る' }).click();
  await reload('desk');
  await expect(page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: '小さな鍵を取る' })).toHaveCount(0);
  await back(page);
  // 時計：00:16 で退出 → 再開しても 00:16、未解決
  await open(page, 'east', 'clock');
  await page.getByRole('button', { name: '針を1分戻す' }).click();
  await back(page);
  await reload();
  await open(page, 'east', 'clock');
  await expect(page.getByTestId('clock-readout')).toHaveText('00:16');
  await expect(page.getByRole('button', { name: '記録カードDを取る' })).toHaveCount(0);
  // 正解 → 取らずに退出 → 再開 → 取れる → 00:17 に戻り、解決は保持
  await page.getByRole('button', { name: '針を1分戻す' }).click();
  await page.getByRole('button', { name: '針を1分戻す' }).click();
  await back(page);
  await reload();
  await open(page, 'east', 'clock');
  await page.getByRole('button', { name: '記録カードDを取る' }).click();
  await reload('clock');
  await expect(page.getByTestId('clock-readout')).toHaveText('00:17');
  await expect(page.getByRole('button', { name: '針を1分戻す' })).toBeDisabled();
  await back(page);
  // 扉：1枚置いたまま退出・再開 → 枠に残る。外すと持ち物へ（消えない）
  await open(page, 'south', 'door');
  await placeByTap(page, 'D', 2);
  await reload('door');
  expect(await slotCards(page)).toEqual([null, null, 'D', null]);
  await page.locator('[data-slot="2"]').click();
  await expect(page.locator('.inv-bar [data-card="D"]')).toBeVisible();
  const p = (await saved(page)).progress;
  expect(p.cards.D).toEqual({ at: 'inventory' });
});

test('ヒント：5問×3段階、順番どおり。第1段階は答えを明かさない', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめから' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await menu(page, 'ヒント');
  const answers: Record<string, RegExp> = {
    本棚: /青 → 白 → 黒 → 緑/,
    絵画: /正解はC/,
    机: /正解は右の引き出し/,
    時計: /0時14分/,
    扉: /◇ → ○ → □ → △/,
  };
  let total = 0;
  for (const [tab, answer] of Object.entries(answers)) {
    await page.getByRole('tab', { name: tab }).click();
    await page.getByRole('button', { name: 'ヒント1（着眼点）を見る' }).click();
    const h1 = await page.locator('.hint').last().innerText();
    expect(h1, `${tab}のヒント1`).not.toMatch(answer);
    await page.getByRole('button', { name: 'ヒント2（解き方）を見る' }).click();
    await page.getByRole('button', { name: '答えを見る' }).click();
    const stages = await page.locator('.hint-stage').allInnerTexts();
    expect(stages).toEqual(['ヒント1：着眼点', 'ヒント2：解き方', 'ヒント3：答えを見る']);
    expect(await page.locator('.hint').last().innerText()).toMatch(answer);
    total += stages.length;
  }
  expect(total).toBe(15);
  await checkLayout(page, 'ヒント');
});

test('キーボードだけで基本操作：向きの変更・調べる・閉じる', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめから' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'スキップ' }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'east');
  await page.locator('[data-hotspot="clock"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('closeup-clock')).toBeVisible();
  await page.getByRole('button', { name: '針を1分戻す' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('clock-readout')).toHaveText('00:16');
  await page.keyboard.press('Escape');
  await expect(page.locator('.closeup')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: '設定', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('モーダル表示中は背面を操作できない。拡大画面の閉じるボタンは常に押せる', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめから' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await menu(page, '持ち物');
  // 背面（探索画面）の「右を向く」の位置を押しても、背面は反応しない（押せるのはモーダルの外側＝閉じるだけ）
  const turn = (await page.getByRole('button', { name: '右を向く', includeHidden: true }).boundingBox())!;
  const inside = await page.evaluate(
    ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.modal'),
    { x: turn.x + turn.width / 2, y: turn.y + turn.height / 2 },
  );
  await page.mouse.click(turn.x + turn.width / 2, turn.y + turn.height / 2);
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'north');
  if (inside) await page.getByRole('button', { name: '閉じる' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await open(page, 'north', 'desk');
  const b = (await page.getByRole('button', { name: '戻る' }).boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(0);
  await back(page);
});

test('初回表示は軽く、BGMは最初の操作まで読み込まない。長く遊んでも音声の再生器が増え続けない', async ({ page }) => {
  test.setTimeout(120_000);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  const t0 = Date.now();
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'はじめから' })).toBeVisible();
  const loadMs = Date.now() - t0;
  expect(loadMs).toBeLessThan(5000);
  expect(requests.filter((u) => u.endsWith('.mp3'))).toEqual([]);
  await page.getByRole('button', { name: 'はじめから' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  const voices = () => page.evaluate(() => (window as unknown as { __study0017Audio: { voiceCount: number } }).__study0017Audio.voiceCount);
  for (let round = 0; round < 3; round++) {
    for (const [f, h] of [['north', 'bookshelf'], ['east', 'clock'], ['west', 'paintings'], ['north', 'desk'], ['south', 'door']] as const) {
      await open(page, f, h);
      await back(page);
    }
    await face(page, 'north');
  }
  const v1 = await voices();
  for (let round = 0; round < 3; round++) {
    for (const [f, h] of [['north', 'bookshelf'], ['east', 'clock'], ['west', 'paintings']] as const) {
      await open(page, f, h);
      await back(page);
    }
  }
  expect(await voices()).toBe(v1);
  expect(v1).toBeLessThanOrEqual(6); // BGM再生器（title×2・study×2・reveal）程度
});

test('アプリが隠れている間は音を止め、戻ると再開する。設定のミュートは再起動後も保たれる', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめから' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  const state = () => page.evaluate(() => (window as unknown as { __study0017Audio: { contextState: string } }).__study0017Audio.contextState);
  await expect.poll(state).toBe('running');
  const setVis = (v: string) =>
    page.evaluate((vis) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => vis });
      document.dispatchEvent(new Event('visibilitychange'));
    }, v);
  await setVis('hidden');
  await expect.poll(state).toBe('suspended');
  await setVis('visible');
  await expect.poll(state).toBe('running');
  // ミュートを保存 → 再起動後も維持
  await page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: 'ミュート' }).nth(1).click(); // 環境音
  await page.reload();
  await page.getByRole('button', { name: '設定' }).click();
  await expect(page.locator('#vol-ambient')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'ミュート中' })).toHaveCount(1);
});
