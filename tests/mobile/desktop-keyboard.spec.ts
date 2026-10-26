import { expect, test, type Page } from "@playwright/test";
import { UI, at, activeScenes, flippers, runState, forceGameOver, waitForGameOverReady, HUB_STUB } from "./helpers";

// Desktop viewports: keyboard and mouse, plus the Rokumon hub events.

let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  // The hub SDK stub records every call the game makes.
  await page.route("**/hub-bridge.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: HUB_STUB }));
  await page.goto("./");
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(500);
});

test.afterEach(() => {
  expect(errors, "no console errors or uncaught exceptions").toEqual([]);
});

async function start(page: Page) {
  await page.keyboard.press("Space");
  await expect.poll(() => activeScenes(page)).toContain("Game");
  await expect.poll(async () => (await runState(page)).status).toBe("ready");
}

async function click(page: Page, point: { x: number; y: number }) {
  const p = await at(page, point);
  await page.mouse.click(p.x, p.y);
}

test("Space starts the table; holding Space pulls the plunger and releasing launches", async ({ page }) => {
  await start(page);
  await page.keyboard.down("Space");
  await page.waitForTimeout(450);
  expect((await runState(page)).status).toBe("ready");
  expect(await page.evaluate(() => window.__GAME_DEBUG__.getScene().charging)).toBe(true);
  await page.keyboard.up("Space");
  await expect.poll(async () => (await runState(page)).status).not.toBe("ready");
});

test("a longer pull launches harder", async ({ page }) => {
  const launchSpeed = async (holdMs: number) => {
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(holdMs);
    await page.keyboard.up("ArrowDown");
    await expect.poll(async () => (await runState(page)).status).not.toBe("ready");
    return page.evaluate(() => -window.__GAME_DEBUG__.getScene().world.ball.vy);
  };
  await start(page);
  const soft = await launchSpeed(10);
  await page.keyboard.press("r");
  await expect.poll(async () => (await runState(page)).status).toBe("ready");
  const hard = await launchSpeed(950);
  expect(hard).toBeGreaterThan(soft);
});

test("every flipper key raises its own flipper", async ({ page }) => {
  await start(page);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await runState(page)).status).not.toBe("ready");
  for (const [key, side] of [["ArrowLeft", "left"], ["z", "left"], ["Shift", "left"], ["ArrowRight", "right"], ["m", "right"]] as const) {
    await page.keyboard.down(key);
    await expect.poll(() => flippers(page), `${key}`).toMatchObject({ [side]: { pressed: true, raised: true } });
    await page.keyboard.up(key);
    await expect.poll(() => flippers(page), `${key} released`).toMatchObject({ [side]: { pressed: false, raised: false } });
  }
});

test("H opens how to play on the title screen and Esc closes it", async ({ page }) => {
  await page.keyboard.press("h");
  await expect.poll(() => activeScenes(page)).toContain("HowTo");
  await page.keyboard.press("Escape");
  await expect.poll(() => activeScenes(page)).toEqual(["Menu"]);
});

test("Esc pauses, the pause menu can be clicked, and P resumes", async ({ page }) => {
  await start(page);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await runState(page)).status).not.toBe("ready");
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getScene().scene.isPaused("Game"))).toBe(true);
  await click(page, UI.resume);
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getScene().scene.isPaused("Game"))).toBe(false);
  await page.keyboard.press("p");
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getScene().scene.isPaused("Game"))).toBe(true);
  await page.keyboard.press("p");
  await expect.poll(() => page.evaluate(() => window.__GAME_DEBUG__.getScene().scene.isPaused("Game"))).toBe(false);
});

test("game over: Space plays again and Esc goes to the title", async ({ page }) => {
  test.setTimeout(90_000);
  await start(page);
  await forceGameOver(page, 2500);
  await waitForGameOverReady(page);
  await page.keyboard.press("Space");
  await expect.poll(() => activeScenes(page)).toContain("Game");
  await expect.poll(async () => (await runState(page)).status).toBe("ready");
  await forceGameOver(page, 100);
  await waitForGameOverReady(page);
  await page.keyboard.press("Escape");
  await expect.poll(() => activeScenes(page)).toEqual(["Menu"]);
});

test("S toggles sound on the title screen and the choice is saved", async ({ page }) => {
  await page.keyboard.press("s");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rokumon-pinball:save:v1") ?? "{}").settings?.muted)).toBe(true);
  await page.reload();
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(500);
  await page.keyboard.press("s");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rokumon-pinball:save:v1") ?? "{}").settings?.muted)).toBe(false);
});

test("hub events fire as before: ready, score, one gameOver and the high-score event", async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const scene = window.__GAME_DEBUG__.getScene();
    scene.hitBumper(scene.bumpers[0].body);
  });
  await forceGameOver(page, 777);
  await page.evaluate(() => window.__GAME_DEBUG__.getScene().handleDrain());
  const calls = await page.evaluate(() => window.hubCalls);
  const names = calls.map((c) => c.name);
  expect(names).toContain("ready");
  expect(calls.some((c) => c.name === "score" && (c.args[0] as number) > 0)).toBe(true);
  const over = calls.filter((c) => c.name === "gameOver");
  expect(over).toHaveLength(1);
  expect(over[0].args[0]).toBe(777);
  expect(typeof over[0].args[1]).toBe("number");
  const event = calls.find((c) => c.name === "event");
  expect(event?.args[0]).toBe("high-score");
  expect(event?.args[1]).toEqual({ tableId: "dragons-lair", score: 777, seconds: expect.any(Number) });
  expect(names.filter((n) => n === "event")).toHaveLength(1);
});
