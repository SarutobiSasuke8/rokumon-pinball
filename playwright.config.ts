import { defineConfig, devices } from "@playwright/test";

// Browser tests against the built game (npm run build first): touch on phone
// viewports (pinball-touch.spec.ts) and keyboard, mouse and hub events on
// desktop viewports (desktop-keyboard.spec.ts), plus one complete real-input
// game to game over and a restart (full-game.spec.ts) on desktop 1280, Pixel 7
// portrait and iPhone 13 landscape.
// Every project runs in Chromium, including the iPhone 13 ones: the device
// descriptor gives the iPhone viewport, pixel ratio, user agent and touch
// support, but the engine is Chromium, not Safari/WebKit. Chromium is used
// because the tests drive real touch events through the Chrome DevTools
// Protocol (Input.dispatchTouchEvent), and because WebKit is heavy to run on
// the Windows dev machine. Real Safari is covered by the human checklist in
// docs/mobile-test-plan.md.
const port = Number(process.env.PORT ?? 4317);
const chromium = { browserName: "chromium" as const, defaultBrowserType: "chromium" as const };

export default defineConfig({
  testDir: "tests/mobile",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}/games/pinball/play/`,
    serviceWorkers: "block",
    trace: "off",
  },
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: `http://127.0.0.1:${port}/games/pinball/play/`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "iphone-13-portrait", testMatch: /pinball-touch/, use: { ...devices["iPhone 13"], ...chromium } },
    { name: "iphone-13-landscape", testMatch: /pinball-touch|full-game/, use: { ...devices["iPhone 13 landscape"], ...chromium } },
    { name: "pixel-7-portrait", testMatch: /pinball-touch|full-game/, use: { ...devices["Pixel 7"], ...chromium } },
    { name: "pixel-7-landscape", testMatch: /pinball-touch/, use: { ...devices["Pixel 7 landscape"], ...chromium } },
    { name: "desktop-1280", testMatch: /desktop-keyboard|full-game/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, ...chromium } },
    { name: "desktop-1920", testMatch: /desktop-keyboard/, use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 }, ...chromium } },
  ],
});
