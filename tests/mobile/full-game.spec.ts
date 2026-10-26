import { expect, test, type Page } from "@playwright/test";
import { NATIVE_EVENT_COUNTER, Touchscreen } from "./touch";
import { UI, at, activeScenes, runState, waitForGameOverReady, HUB_STUB } from "./helpers";

// One complete game with real input only, on a desktop viewport (mouse and
// keyboard) and on phone viewports (touch). Nothing is forced through the
// debug hooks: the test presses PLAY, pulls and releases the plunger, flips at
// the ball when it reaches the flippers, lets each ball drain for real, reads
// the game-over screen, then restarts with PLAY AGAIN. The debug hooks are
// only read, never written.
//
// A simple flipper bot keeps each ball alive for a while (so the flippers are
// used in anger and points are scored), then stops so the ball drains and the
// game ends in bounded time. A ball that will not drain after that is a
// soft lock and fails the test.

const BOT_MS = 9_000; // flip at the ball for this long after each launch
const DRAIN_MS = 45_000; // after which a ball still in play is a soft lock

type Probe = {
  status: string; ballNumber: number; ballsRemaining: number; score: number;
  x: number; y: number; vy: number; inGame: boolean; gameOver: boolean;
};

const probe = (page: Page): Promise<Probe> =>
  page.evaluate(() => {
    const game = window.__GAME_DEBUG__.getScene().game;
    const scene = game.scene.getScene("Game");
    const s = scene.state;
    const b = scene.world.ball;
    return {
      status: s.status, ballNumber: s.ballNumber, ballsRemaining: s.ballsRemaining, score: s.score,
      x: b.x, y: b.y, vy: b.vy,
      inGame: game.scene.isActive("Game"), gameOver: game.scene.isActive("GameOver"),
    };
  });

interface Driver {
  start(): Promise<void>; // from the title screen to a table with the ball waiting
  plunge(holdMs: number): Promise<void>;
  flip(side: "left" | "right", ballNumber: number): Promise<void>;
  playAgain(): Promise<void>;
}

async function playFullGame(page: Page, driver: Driver) {
  await driver.start();
  await expect.poll(async () => (await runState(page)).status).toBe("ready");
  const fresh = await runState(page);
  expect(fresh).toMatchObject({ score: 0, ballsRemaining: 3, ballNumber: 1 });

  const perBall: { ball: number; score: number; flips: number; ms: number }[] = [];
  let flips = 0;
  let maxSeenScore = 0;
  for (let ball = 1; ball <= 3; ball += 1) {
    // Wait for this ball to sit in the shooter lane, then plunge it.
    await page.waitForFunction((n) => {
      const s = window.__GAME_DEBUG__.getScene().game.scene.getScene("Game").state;
      return s.status === "ready" && s.ballNumber === n;
    }, ball, { timeout: 30_000 });
    await driver.plunge(ball === 1 ? 60 : 700);
    await expect.poll(async () => (await runState(page)).status, `ball ${ball} launches`).not.toBe("ready");

    const launchedAt = Date.now();
    let ballFlips = 0;
    for (;;) {
      const p = await probe(page);
      maxSeenScore = Math.max(maxSeenScore, p.score);
      if (p.gameOver || !p.inGame || p.ballNumber !== ball || p.status === "gameover" || p.status === "ready") {
        // "ready" on the same ball number is a ball save: go round again.
        if (p.status === "ready" && p.ballNumber === ball && p.inGame) {
          await driver.plunge(300);
          await expect.poll(async () => (await runState(page)).status).not.toBe("ready");
          continue;
        }
        break;
      }
      // The ball never leaves the table.
      expect(p.x, "ball x inside the cabinet").toBeGreaterThan(0);
      expect(p.x, "ball x inside the cabinet").toBeLessThan(600);
      expect(p.y, "ball y inside the cabinet").toBeGreaterThan(0);
      expect(p.y, "ball y above the drain").toBeLessThan(1060);
      const elapsed = Date.now() - launchedAt;
      expect(elapsed, `ball ${ball} drains once the player stops flipping (no soft lock)`).toBeLessThan(BOT_MS + DRAIN_MS);
      if (elapsed < BOT_MS && p.y > 860 && p.y < 940 && p.vy > -50) {
        await driver.flip(p.x < 280 ? "left" : "right", ball);
        ballFlips += 1;
      } else {
        await page.waitForTimeout(15);
      }
    }
    flips += ballFlips;
    perBall.push({ ball, score: (await runState(page)).score, flips: ballFlips, ms: Date.now() - launchedAt });
  }

  // Game over: the result screen shows the final score and accepts input.
  await waitForGameOverReady(page);
  const final = await runState(page);
  expect(final.status).toBe("gameover");
  expect(final.ballsRemaining).toBe(0);
  expect(final.score, "the game scored points").toBeGreaterThan(0);
  expect(final.score).toBeGreaterThanOrEqual(maxSeenScore);
  expect(flips, "the flippers were used during play").toBeGreaterThan(0);
  const shown = await page.evaluate(() => window.__GAME_DEBUG__.getScene().game.scene.getScene("GameOver").score);
  expect(shown, "the game-over screen shows the final score").toBe(final.score);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("rokumon-pinball:save:v1") ?? "{}"));
  expect(saved.highScores?.["dragons-lair"], "the score is saved as the table best").toBe(final.score);

  // Rokumon SDK: ready, score updates, exactly one gameOver with the final
  // score, and the high-score event for a new best.
  const calls = await page.evaluate(() => window.hubCalls ?? []);
  if (calls.length > 0) {
    const names = calls.map((c) => c.name);
    expect(names).toContain("ready");
    const scores = calls.filter((c) => c.name === "score").map((c) => c.args[0] as number);
    expect(scores.length).toBeGreaterThan(1);
    expect(scores.at(-1)).toBe(final.score);
    const over = calls.filter((c) => c.name === "gameOver");
    expect(over).toHaveLength(1);
    expect(over[0].args[0]).toBe(final.score);
    expect(over[0].args[1] as number).toBeGreaterThan(0);
    const events = calls.filter((c) => c.name === "event");
    expect(events).toHaveLength(1);
    expect(events[0].args).toEqual(["high-score", { tableId: "dragons-lair", score: final.score, seconds: expect.any(Number) }]);
  }

  // Restart: PLAY AGAIN gives a fresh table.
  await driver.playAgain();
  await expect.poll(() => activeScenes(page)).toContain("Game");
  await expect.poll(async () => (await runState(page)).status).toBe("ready");
  expect(await activeScenes(page)).not.toContain("GameOver");
  expect(await runState(page)).toMatchObject({ score: 0, ballsRemaining: 3, ballNumber: 1 });
  if (calls.length > 0) {
    const after = await page.evaluate(() => window.hubCalls.filter((c) => c.name === "ready").length);
    expect(after, "ready fires again for the new game").toBe(2);
  }
  test.info().annotations.push({ type: "full game", description: JSON.stringify({ final: final.score, perBall }) });
}

let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
});

test.afterEach(() => {
  expect(errors, "no console errors or uncaught exceptions").toEqual([]);
});

test("desktop: a full game with mouse and keyboard, from PLAY to game over and PLAY AGAIN", async ({ page, hasTouch }) => {
  test.skip(hasTouch, "desktop flow");
  test.setTimeout(240_000);
  await page.route("**/hub-bridge.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: HUB_STUB }));
  await page.goto("./");
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(500);
  const click = async (point: { x: number; y: number }) => {
    const p = await at(page, point);
    await page.mouse.click(p.x, p.y);
  };
  await playFullGame(page, {
    start: async () => {
      await click(UI.play);
      await expect.poll(() => activeScenes(page)).toContain("Game");
    },
    plunge: async (holdMs) => {
      await page.keyboard.down("Space");
      await page.waitForTimeout(holdMs);
      await page.keyboard.up("Space");
    },
    // Ball 2 is flipped with the mouse (left or right half of the table),
    // the others with the arrow keys.
    flip: async (side, ball) => {
      if (ball === 2) {
        const p = await at(page, side === "left" ? UI.leftHalf : UI.rightHalf);
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
        await page.waitForTimeout(120);
        await page.mouse.up();
      } else {
        const key = side === "left" ? "ArrowLeft" : "ArrowRight";
        await page.keyboard.down(key);
        await page.waitForTimeout(120);
        await page.keyboard.up(key);
      }
    },
    playAgain: () => click(UI.playAgain),
  });
});

test("phone: a full game by touch, from PLAY to game over and PLAY AGAIN", async ({ page, hasTouch }) => {
  test.skip(!hasTouch, "touch flow");
  test.setTimeout(240_000);
  await page.addInitScript(NATIVE_EVENT_COUNTER);
  await page.route("**/hub-bridge.js", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: HUB_STUB }));
  await page.goto("./");
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(500);
  const touch = await Touchscreen.attach(page);
  const tap = async (point: { x: number; y: number }) => {
    const p = await at(page, point);
    await touch.tap(p.x, p.y);
  };
  await playFullGame(page, {
    start: async () => {
      await tap(UI.play);
      await page.waitForFunction(() => Boolean(window.__GAME_DEBUG__?.getScene().leftFlipper));
      await expect.poll(() => activeScenes(page)).toContain("Game");
    },
    plunge: async (holdMs) => {
      const p = await at(page, UI.rightHalf);
      await touch.hold(p.x, p.y, holdMs, 5);
    },
    flip: async (side) => {
      const p = await at(page, side === "left" ? UI.leftHalf : UI.rightHalf);
      await touch.hold(p.x, p.y, 120, side === "left" ? 1 : 2);
    },
    playAgain: () => tap(UI.playAgain),
  });
  const native = await page.evaluate(() => window.__nativeEvents);
  expect(native.touchstart, "the game was driven by real touch events").toBeGreaterThan(10);
  expect(native.mousedown, "no mouse fallback events were fired").toBe(0);
});
