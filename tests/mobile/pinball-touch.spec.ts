import { expect, test, type Page } from "@playwright/test";
import { NATIVE_EVENT_COUNTER, Touchscreen } from "./touch";
import { UI, at, activeScenes, flippers, runState, forceGameOver, waitForGameOverReady } from "./helpers";

// Phone viewports, driven by real touch events only.

let errors: string[] = [];
let touch: Touchscreen;

async function down(page: Page, id: number, point: { x: number; y: number }) {
  const p = await at(page, point);
  await touch.down(id, p.x, p.y);
}

async function tap(page: Page, point: { x: number; y: number }) {
  const p = await at(page, point);
  await touch.tap(p.x, p.y);
}

async function startTableByTouch(page: Page) {
  await tap(page, UI.play);
  await page.waitForFunction(() => Boolean(window.__GAME_DEBUG__?.getScene().leftFlipper));
  await expect.poll(() => activeScenes(page)).toContain("Game");
}

async function launchByTouch(page: Page) {
  await tap(page, UI.rightHalf);
  await expect.poll(async () => (await runState(page)).status).not.toBe("ready");
}

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  await page.addInitScript(NATIVE_EVENT_COUNTER);
  await page.goto("./");
  await page.locator("canvas").waitFor();
  // Let the Boot and Menu scenes finish creating before the first touch.
  await page.waitForTimeout(500);
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

test("tapping PLAY starts Dragon's Lair with the ball waiting in the lane", async ({ page }) => {
  await startTableByTouch(page);
  expect(await flippers(page)).toEqual({ left: { pressed: false, raised: false }, right: { pressed: false, raised: false }, status: "ready" });
  expect(await page.evaluate(() => window.__GAME_DEBUG__.getScene().launchHint.visible), "launch instructions are on screen").toBe(true);
});

test("how to play opens from the title and closes with GOT IT", async ({ page }) => {
  await tap(page, UI.howTo);
  await expect.poll(() => activeScenes(page)).toContain("HowTo");
  await page.waitForTimeout(150);
  await tap(page, UI.gotIt);
  await expect.poll(() => activeScenes(page)).toEqual(["Menu"]);
});

test("touch and hold pulls the plunger, letting go launches", async ({ page }) => {
  await startTableByTouch(page);
  await down(page, 1, UI.leftHalf);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getScene().charging)).toBe(true);
  await page.waitForTimeout(500);
  expect((await runState(page)).status, "still waiting while held").toBe("ready");
  await touch.up(1);
  await expect.poll(async () => (await runState(page)).status).not.toBe("ready");
});

test("holding the left half raises only the left flipper", async ({ page }) => {
  await startTableByTouch(page);
  await launchByTouch(page);
  await down(page, 1, UI.leftHalf);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: true, raised: true }, right: { pressed: false, raised: false } });
  await page.waitForTimeout(300);
  expect((await flippers(page)).left, "flipper stays up while the finger is held").toEqual({ pressed: true, raised: true });
  await touch.up(1);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false, raised: false } });
});

test("holding the right half raises only the right flipper", async ({ page }) => {
  await startTableByTouch(page);
  await launchByTouch(page);
  await down(page, 1, UI.rightHalf);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false, raised: false }, right: { pressed: true, raised: true } });
  await touch.up(1);
  await expect.poll(() => flippers(page)).toMatchObject({ right: { pressed: false, raised: false } });
});

test("two thumbs hold both flippers independently", async ({ page }) => {
  await startTableByTouch(page);
  await launchByTouch(page);
  await down(page, 1, UI.leftHalf);
  await down(page, 2, UI.rightHalf);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: true, raised: true }, right: { pressed: true, raised: true } });
  await touch.up(1);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false, raised: false }, right: { pressed: true, raised: true } });
  await touch.up(2);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false }, right: { pressed: false, raised: false } });
});

test("a swipe across the centre releases the flipper it started on and does not scroll", async ({ page }) => {
  await startTableByTouch(page);
  await launchByTouch(page);
  await down(page, 1, UI.leftHalf);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: true } });
  const to = await at(page, { x: UI.rightHalf.x, y: 300 });
  await touch.move(1, to.x, to.y, 10);
  expect((await flippers(page)).right.pressed, "sliding into the right half does not press the right flipper").toBe(false);
  await touch.up(1);
  await expect.poll(() => flippers(page)).toMatchObject({ left: { pressed: false, raised: false }, right: { pressed: false } });
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
});

test("touch play scores points and the score display shows them", async ({ page }) => {
  test.setTimeout(60_000);
  await startTableByTouch(page);
  await launchByTouch(page);
  const deadline = Date.now() + 40_000;
  let score = 0;
  for (let round = 0; Date.now() < deadline && score === 0; round += 1) {
    await tap(page, round % 2 ? UI.leftHalf : UI.rightHalf);
    await page.waitForTimeout(200);
    score = (await runState(page)).score;
  }
  expect(score).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getScene().scene.get("UI").displayedScore)).toBeGreaterThan(0);
});

test("the pause button pauses play and RESUME carries on", async ({ page }) => {
  await startTableByTouch(page);
  await launchByTouch(page);
  await tap(page, UI.pause);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getScene().scene.isPaused("Game"))).toBe(true);
  const before = await runState(page);
  await page.waitForTimeout(300);
  expect((await runState(page)).elapsedMs, "time stands still while paused").toBe(before.elapsedMs);
  await tap(page, UI.resume);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getScene().scene.isPaused("Game"))).toBe(false);
  expect((await flippers(page)).left.pressed, "the resume tap does not leave a flipper stuck up").toBe(false);
});

test("touches on the score strip do not flip or launch", async ({ page }) => {
  await startTableByTouch(page);
  await tap(page, { x: 200, y: 40 });
  await page.waitForTimeout(200);
  expect(await flippers(page)).toMatchObject({ left: { pressed: false }, right: { pressed: false }, status: "ready" });
});

test("game over: PLAY AGAIN replays the table", async ({ page }) => {
  test.setTimeout(60_000);
  await startTableByTouch(page);
  await forceGameOver(page, 4321);
  await waitForGameOverReady(page);
  await tap(page, UI.playAgain);
  await expect.poll(() => activeScenes(page)).toContain("Game");
  expect(await activeScenes(page)).not.toContain("GameOver");
  expect((await runState(page)).score).toBe(0);
});

test("game over: TITLE SCREEN returns to the title with the new high score listed", async ({ page }) => {
  test.setTimeout(60_000);
  await startTableByTouch(page);
  await forceGameOver(page, 4321);
  await waitForGameOverReady(page);
  await tap(page, UI.titleScreen);
  await expect.poll(() => activeScenes(page)).toEqual(["Menu"]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("rokumon-pinball:save:v1") ?? "{}"));
  expect(saved.highScores["dragons-lair"]).toBe(4321);
  expect(saved.topScores["dragons-lair"][0].score).toBe(4321);
});
