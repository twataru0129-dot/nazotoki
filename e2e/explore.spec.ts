import { expect, test, type Page } from '@playwright/test';

const SCENE_W = 1448;
const SCENE_H = 1086;

// 第1段階のホットスポット（src/game/scenes.ts と同じ値。ずれ検査用）
const SPOTS: Record<string, { facing: string; rect: [number, number, number, number] }> = {
  bookshelf: { facing: 'north', rect: [570, 190, 310, 145] },
  desk: { facing: 'north', rect: [240, 695, 990, 95] },
  clock: { facing: 'east', rect: [345, 20, 240, 770] },
  window: { facing: 'east', rect: [1100, 15, 345, 630] },
  door: { facing: 'south', rect: [560, 108, 460, 738] },
  paintings: { facing: 'west', rect: [355, 95, 730, 550] },
};

async function startGame(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめから' }).click();
  await page.getByRole('button', { name: '手紙を読む' }).click();
  await expect(page.getByText('この部屋には、一つだけ嘘がある。')).toBeVisible();
  await page.getByRole('button', { name: '書斎へ入る' }).click();
  await page.getByRole('button', { name: '書斎を調べる' }).click();
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'north');
}

/** 回転アニメーション（0.3秒）が終わるまで待つ */
async function settle(page: Page) {
  await page.locator('.stage-layer').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}

async function face(page: Page, facing: string) {
  for (let i = 0; i < 4; i++) {
    if ((await page.getByTestId('stage').getAttribute('data-facing')) === facing) return settle(page);
    await page.getByRole('button', { name: '右を向く' }).click();
  }
  throw new Error(`cannot face ${facing}`);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  (page as Page & { _errors?: string[] })._errors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { _errors?: string[] })._errors).toEqual([]);
});

test('タイトル→手紙→書斎、左右ボタンで4方向を一周できる', async ({ page }) => {
  await startGame(page);
  const order = ['east', 'south', 'west', 'north'];
  for (const f of order) {
    await page.getByRole('button', { name: '右を向く' }).click();
    await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', f);
  }
  await page.getByRole('button', { name: '左を向く' }).click();
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'west');
  await expect(page.getByTestId('facing-label')).toHaveText('西');
});

test('背景画像がすべて読み込まれる', async ({ page }) => {
  await startGame(page);
  for (const f of ['north', 'east', 'south', 'west']) {
    await face(page, f);
    const ok = await page.locator('.stage-bg').evaluate(async (img: HTMLImageElement) => {
      await img.decode().catch(() => undefined);
      return img.naturalWidth === 1448 && img.naturalHeight === 1086;
    });
    expect(ok, f).toBe(true);
  }
});

test('横スワイプとキーボードで向きを変えられる', async ({ page }) => {
  await startGame(page);
  const box = (await page.getByTestId('stage').boundingBox())!;
  const y = box.y + box.height * 0.9;
  // 指を左へ払う → 右を向く
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 });
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'east');
  // スワイプでは拡大画面が開かない
  await expect(page.locator('.closeup')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'north');
});

test('家具・仕掛けをタップすると拡大画面が開き、戻れる', async ({ page }) => {
  await startGame(page);
  for (const [id, s] of Object.entries(SPOTS)) {
    await face(page, s.facing);
    await page.locator(`[data-hotspot="${id}"]`).click();
    await expect(page.getByTestId(`closeup-${id}`)).toBeVisible();
    await page.getByRole('button', { name: '戻る' }).click();
    await expect(page.locator('.closeup')).toHaveCount(0);
    await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', s.facing);
  }
});

test('拡大画面の確定文言が表示される', async ({ page }) => {
  await startGame(page);
  await page.locator('[data-hotspot="bookshelf"]').click();
  await expect(page.getByText('「月から太陽へ。途切れた道をつなげ。」')).toBeVisible();
  await page.getByRole('button', { name: '戻る' }).click();
  await face(page, 'east');
  await page.locator('[data-hotspot="clock"]').click();
  await expect(page.getByRole('img', { name: '時計の針は0時17分を指している' })).toBeVisible();
});

test('調べられる場所の強調と独白', async ({ page }) => {
  await startGame(page);
  await page.getByRole('button', { name: '調べられる場所を光らせる' }).click();
  await expect(page.locator('.hotspot.is-highlight').first()).toBeVisible();
  await expect(page.locator('.hotspot.is-highlight')).toHaveCount(0, { timeout: 3000 });
  await page.locator('[data-hotspot="lamp"]').click();
  await expect(page.getByTestId('monologue')).toContainText('緑のシェードのランプ');
});

for (const vp of [
  { width: 375, height: 667 },
  { width: 667, height: 375 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
  { width: 1024, height: 1366 },
]) {
  test(`ホットスポットが画像上の同じ位置に来る（${vp.width}×${vp.height}）`, async ({ page }) => {
    await page.setViewportSize(vp);
    await startGame(page);
    for (const [id, s] of Object.entries(SPOTS)) {
      await face(page, s.facing);
      const stage = (await page.getByTestId('stage').boundingBox())!;
      expect(stage.width / stage.height).toBeCloseTo(SCENE_W / SCENE_H, 1);
      const hs = (await page.locator(`[data-hotspot="${id}"]`).boundingBox())!;
      const [x, y, w, h] = s.rect;
      const expectX = stage.x + ((x + w / 2) / SCENE_W) * stage.width;
      const expectY = stage.y + ((y + h / 2) / SCENE_H) * stage.height;
      expect(Math.abs(hs.x + hs.width / 2 - expectX), `${id} x`).toBeLessThan(1.5);
      expect(Math.abs(hs.y + hs.height / 2 - expectY), `${id} y`).toBeLessThan(1.5);
      expect(hs.width).toBeGreaterThanOrEqual(43.5);
      expect(hs.height).toBeGreaterThanOrEqual(43.5);
    }
  });
}

test('画面の向きを変えてもホットスポットがずれない', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await startGame(page);
  const rel = async () => {
    const st = (await page.getByTestId('stage').boundingBox())!;
    const hs = (await page.locator('[data-hotspot="bookshelf"]').boundingBox())!;
    return [(hs.x + hs.width / 2 - st.x) / st.width, (hs.y + hs.height / 2 - st.y) / st.height];
  };
  const before = await rel();
  await page.setViewportSize({ width: 667, height: 375 });
  const after = await rel();
  expect(after[0]).toBeCloseTo(before[0], 2);
  expect(after[1]).toBeCloseTo(before[1], 2);
});

test('探索画面のボタンは44px以上', async ({ page }) => {
  await startGame(page);
  const small = await page.locator('.explore button:visible').evaluateAll((els) =>
    els
      .map((e) => ({ name: e.getAttribute('aria-label') ?? e.textContent, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
      .map(({ name }) => name),
  );
  expect(small).toEqual([]);
});

test('持ち物・手帳・ヒント・設定が開閉でき、モーダルは重ならない', async ({ page }) => {
  await startGame(page);
  for (const [label, id] of [
    ['持ち物', 'inventory'],
    ['手帳', 'notebook'],
    ['ヒント', 'hints'],
    ['設定', 'settings'],
  ]) {
    await page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByTestId(`overlay-${id}`)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await page.getByRole('button', { name: '閉じる' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  // 持ち物から手紙を開くと、持ち物は閉じて手紙だけになる
  await page.getByRole('button', { name: '持ち物', exact: true }).click();
  await page.getByRole('button', { name: '城戸の手紙' }).click();
  await expect(page.getByTestId('overlay-letter')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByRole('button', { name: '裏返す' }).click();
  await expect(page.getByLabel('城戸透の手紙（裏）')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('拡大画面からヒントを開き、閉じると拡大画面に戻る。ヒントは1段階ずつ', async ({ page }) => {
  await startGame(page);
  await face(page, 'east');
  await page.locator('[data-hotspot="clock"]').click();
  await page.getByTestId('closeup-clock').getByRole('button', { name: 'ヒント' }).click();
  await expect(page.getByRole('tab', { name: '時計' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'ヒント1（着眼点）を見る' }).click();
  await expect(page.getByText('時計は0時17分で止まっている。')).toBeVisible();
  await expect(page.getByText('正解は午前0時14分')).toHaveCount(0);
  await page.getByRole('button', { name: '閉じる' }).click();
  await expect(page.getByTestId('closeup-clock')).toBeVisible();
});

test('設定はリロード後も保持される', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '設定' }).click();
  await page.getByRole('button', { name: 'ミュート' }).first().click();
  await page.getByRole('radio', { name: '動きを減らす' }).check();
  await page.reload();
  await page.getByRole('button', { name: '設定' }).click();
  await expect(page.getByRole('button', { name: 'ミュート中' })).toHaveCount(1);
  await expect(page.getByRole('radio', { name: '動きを減らす' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
});

test('GitHub Pages の配下パス /nazotoki/ で素材URLが解決される', async ({ page, baseURL }) => {
  expect(baseURL).toContain('/nazotoki/');
  await page.goto('./');
  const src = await page.locator('.title-bg').getAttribute('src');
  expect(src).toBe('/nazotoki/assets/bg/a_north.webp');
});
