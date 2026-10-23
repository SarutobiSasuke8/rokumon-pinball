import type { Page } from "@playwright/test";

// Game-space constants (src/game/constants.js: a 600 x 1000 portrait table).
export const GAME_W = 600;
export const GAME_H = 1000;

// Where things are, in game space.
export const UI = {
  play: { x: 300, y: 528 },
  howTo: { x: 300, y: 612 },
  gotIt: { x: 300, y: 900 },
  pause: { x: 548, y: 48 },
  resume: { x: 300, y: 390 },
  playAgain: { x: 300, y: 666 },
  titleScreen: { x: 300, y: 744 },
  leftHalf: { x: 150, y: 850 },
  rightHalf: { x: 450, y: 850 },
};

// Convert a point in game space to a viewport point on the scaled canvas.
export async function at(page: Page, point: { x: number; y: number }) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("canvas has no layout box");
  return { x: box.x + (point.x / GAME_W) * box.width, y: box.y + (point.y / GAME_H) * box.height };
}

export const activeScenes = (page: Page) =>
  page.evaluate(() => {
    const game = window.__GAME_DEBUG__?.getScene().game;
    return game ? game.scene.getScenes(true).map((scene: { scene: { key: string } }) => scene.scene.key) : [];
  });

export const flippers = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__GAME_DEBUG__.getScene();
    const read = (flipper: { pressed: boolean; body: { angle: number }; restAngle: number; activeAngle: number }) => ({
      pressed: flipper.pressed,
      raised: Math.abs(flipper.body.angle - flipper.activeAngle) < Math.abs(flipper.body.angle - flipper.restAngle),
    });
    return { left: read(scene.leftFlipper), right: read(scene.rightFlipper), status: scene.state.status as string };
  });

export const runState = (page: Page) => page.evaluate(() => window.__GAME_DEBUG__.snapshotState());

export async function forceGameOver(page: Page, score = 0) {
  await page.evaluate((value) => {
    const scene = window.__GAME_DEBUG__.getScene();
    scene.state.score = value;
    scene.state.ballsRemaining = 1;
    scene.state.status = "playing";
    scene.handleDrain();
  }, score);
}

export const HUB_STUB =
  "window.hubCalls=[]; window.Hub=Object.fromEntries(['ready','score','gameOver','event'].map(name=>[name,(...args)=>window.hubCalls.push({name,args})]));";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __GAME_DEBUG__: any;
    __nativeEvents: Record<string, number>;
    hubCalls: { name: string; args: unknown[] }[];
  }
}
