import { expect, type Page } from '@playwright/test';

export async function newGame(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'はじめから' }).click();
  await page.getByRole('button', { name: 'スキップ' }).click();
  await expect(page.getByTestId('stage')).toHaveAttribute('data-facing', 'north');
}

export async function settle(page: Page) {
  await page.locator('.stage-layer').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}

export async function face(page: Page, facing: string) {
  for (let i = 0; i < 4; i++) {
    if ((await page.getByTestId('stage').getAttribute('data-facing')) === facing) return settle(page);
    await page.getByRole('button', { name: '右を向く' }).click();
  }
  throw new Error(`cannot face ${facing}`);
}

export async function open(page: Page, facing: string, hotspot: string) {
  await face(page, facing);
  await page.locator(`[data-hotspot="${hotspot}"]`).click();
}

export async function back(page: Page) {
  await page.getByRole('button', { name: '戻る' }).click();
  await expect(page.locator('.closeup')).toHaveCount(0);
}

export async function bookOrder(page: Page) {
  return page.locator('[data-book]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.book));
}

/** タップ操作だけで本を正解順に並べる */
export async function solveBooksByTap(page: Page) {
  const target = ['blue', 'ivory', 'black', 'green'];
  for (let i = 0; i < 4; i++) {
    const o = await bookOrder(page);
    if (o[i] === target[i]) continue;
    await page.locator(`[data-book="${o[i]}"]`).click();
    await page.locator(`[data-book="${target[i]}"]`).click();
  }
}

export const SOLVERS: Record<string, (page: Page) => Promise<void>> = {
  A: async (page) => {
    await open(page, 'north', 'bookshelf');
    await solveBooksByTap(page);
    await page.getByRole('button', { name: '記録カードAを取る' }).click();
    await back(page);
  },
  B: async (page) => {
    await open(page, 'west', 'paintings');
    await page.locator('[data-painting="C"]').click();
    await page.getByRole('button', { name: '記録カードBを取る' }).click();
    await back(page);
  },
  C: async (page) => {
    await open(page, 'north', 'desk');
    await page.locator('[data-drawer="right"]').click();
    await page.getByRole('button', { name: '小さな鍵を取る' }).click();
    await page.locator('.inv-bar').getByRole('button', { name: '小さな鍵' }).click();
    await page.getByTestId('desk-box').click();
    await page.getByRole('button', { name: '記録カードCを取る' }).click();
    await back(page);
  },
  D: async (page) => {
    await open(page, 'east', 'clock');
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '針を1分戻す' }).click();
    await page.getByRole('button', { name: '記録カードDを取る' }).click();
    await back(page);
  },
};

/** 扉の枠へ、持ち物のカードをタップで置く */
export async function placeByTap(page: Page, id: string, slot: number) {
  await page.locator('.inv-bar').getByRole('button', { name: new RegExp(`^記録カード${id}（`) }).click();
  await page.locator(`[data-slot="${slot}"]`).click();
}

export async function slotCards(page: Page) {
  return page.locator('[data-slot]').evaluateAll((els) =>
    els.map((e) => {
      const m = (e.getAttribute('aria-label') ?? '').match(/記録カード([ABCD])/);
      return m ? m[1] : null;
    }),
  );
}

export async function dragBetween(page: Page, from: string, to: string) {
  const a = (await page.locator(from).boundingBox())!;
  const b = (await page.locator(to).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
}
