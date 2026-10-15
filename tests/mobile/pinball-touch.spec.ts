import { expect, test, type Page } from "@playwright/test";
import { NATIVE_EVENT_COUNTER, Touchscreen } from "./touch";

// Game-space constants from src/game/constants.js (600 x 1000 portrait table).
const GAME_W = 600;
const GAME_H = 1000;
const LEFT_HALF = { x: 150, y: 850 };
const RIGHT_HALF = { x: 450, y: 850 };
const TABLE_CARD = { x: 300, y: 220 };

let errors: string[] = [];
let touch: Touchscreen;

// Convert a point in game space to a viewport point on the scaled canvas.
async function at(page: Page, point: { x: number; y: number }) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("canvas has no layout box");
  return { x: box.x + (point.x / GAME_W) * box.width, y: box.y + (point.y / GAME_H) * box.height };
}

async function down(page: Page, id: number, point: { x: number; y: number }) {
  const p = await at(page, point);
  await touch.down(id, p.x, p.y);
}

async function tap(page: Page, point: { x: number; y: number }) {
  const p = await at(page, point);
  await touch.tap(p.x, p.y);
}

const activeScenes = (page: Page) =>
  page.evaluate(() => {
    const game = window.__GAME_DEBUG__?.getScene().game;
    return game ? game.scene.getScenes(true).map((scene: { scene: { key: string } }) => scene.scene.key) : [];
  });

const flippers = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__GAME_DEBUG__.getScene();
    const read = (flipper: { pressed: boolean; body: { angle: number }; restAngle: number; activeAngle: number }) => ({
      pressed: flipper.pressed,
      raised: Math.abs(flipper.body.angle - flipper.activeAngle) < Math.abs(flipper.body.angle - flipper.restAngle),
    });
    return { left: read(scene.leftFlipper), right: read(scene.rightFlipper), status: scene.state.status as string };
  });

async function startTableByTouch(page: Page) {
  await tap(page, TABLE_CARD);
  await page.waitForFunction(() => Boolean(window.__GAME_DEBUG__?.getScene().leftFlipper));
  await expect.poll(() => activeScenes(page)).toContain("Game");
}

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  await page.addInitScript(NATIVE_EVENT_COUNTER);
  await page.goto("./");
  await page.locator("canvas").waitFor();
  // Let the Boot and Menu scenes finish creating before the first touch.
  await page.waitForTimeout(400);
  touch = await Touchscreen.attach(page);
});

test.afterEach(async ({ page }) => {
  const native = await page.evaluate(() => window.__nativeEvents);
  expect(native.touchstart, "the game was driven by real touch events").toBeGreaterThan(0);
  expect(native.mousedown, "no mouse fallback events were fired").toBe(0);
  expect(errors, "no console errors or uncaught exceptions").toEqual([]);
});

test("canvas fits the screen with no page scroll", async ({ page }) => {
  const box = await page.locator("canvas").boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await startTableByTouch(page);
});

test("tapping the table card starts Dragon's Lair", async ({ page }) => {
  await startTableByTouch(page);
  expect(await flippers(page)).toEqual({ left: { pressed: false, raised: false }, right: { pressed: false, raised: false }, status: "ready" });
});

test("holding the left half raises the left flipper and launches the ball", async ({ page }) => {
  await startTableByTouch(page);
  await down(page, 1, LEFT_HALF);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: true, raised: true }, right: { pressed: false, raised: false } });
  expect((await flippers(page)).status).not.toBe("ready");
  await page.waitForTimeout(300);
  expect((await flippers(page)).left, "flipper stays up while the finger is held").toEqual({ pressed: true, raised: true });
  await touch.up(1);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false, raised: false } });
});

test("holding the right half raises only the right flipper", async ({ page }) => {
  await startTableByTouch(page);
  await down(page, 1, RIGHT_HALF);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false, raised: false }, right: { pressed: true, raised: true } });
  await touch.up(1);
  await expect.poll(() => flippers(page)).toMatchObject({ right: { pressed: false, raised: false } });
});

test("two thumbs hold both flippers independently", async ({ page }) => {
  await startTableByTouch(page);
  await down(page, 1, LEFT_HALF);
  await down(page, 2, RIGHT_HALF);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: true, raised: true }, right: { pressed: true, raised: true } });
  await touch.up(1);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false, raised: false }, right: { pressed: true, raised: true } });
  await touch.up(2);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false }, right: { pressed: false, raised: false } });
});

test("a swipe across the centre releases the flipper it started on and does not scroll", async ({ page }) => {
  await startTableByTouch(page);
  await down(page, 1, LEFT_HALF);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: true } });
  const to = await at(page, { x: RIGHT_HALF.x, y: 300 });
  await touch.move(1, to.x, to.y, 10);
  expect((await flippers(page)).right.pressed, "sliding into the right half does not press the right flipper").toBe(false);
  await touch.up(1);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false, raised: false }, right: { pressed: false } });
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
});

test("touch play scores points and the HUD shows them", async ({ page }) => {
  await startTableByTouch(page);
  await tap(page, RIGHT_HALF);
  const deadline = Date.now() + 15_000;
  let score = 0;
  // Keep flipping both sides, like a player would, until the ball scores.
  for (let round = 0; Date.now() < deadline && score === 0; round += 1) {
    await tap(page, round % 2 ? LEFT_HALF : RIGHT_HALF);
    await page.waitForTimeout(200);
    score = await page.evaluate(() => window.__GAME_DEBUG__.snapshotState().score);
  }
  expect(score).toBeGreaterThan(0);
  const hud = await page.evaluate(() => window.__GAME_DEBUG__.getScene().scene.get("UI").scoreLabel.text);
  expect(hud).toMatch(/^Score: \d+$/);
});

async function forceGameOver(page: Page) {
  await page.evaluate(() => {
    const scene = window.__GAME_DEBUG__.getScene();
    scene.state.ballsRemaining = 1;
    scene.state.status = "playing";
    scene.handleDrain();
  });
  await expect.poll(() => activeScenes(page)).toContain("GameOver");
}

test("on the game over screen a short tap replays the table", async ({ page }) => {
  await startTableByTouch(page);
  await forceGameOver(page);
  await page.waitForTimeout(200);
  await tap(page, { x: 300, y: 500 });
  await expect.poll(() => activeScenes(page)).toContain("Game");
  expect(await activeScenes(page)).not.toContain("GameOver");
});

test("on the game over screen a long tap returns to table select", async ({ page }) => {
  await startTableByTouch(page);
  await forceGameOver(page);
  await page.waitForTimeout(200);
  const p = await at(page, { x: 300, y: 500 });
  await touch.hold(p.x, p.y, 700);
  await expect.poll(() => activeScenes(page)).toEqual(["Menu"]);
});

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __GAME_DEBUG__: any;
    __nativeEvents: Record<string, number>;
  }
}
