import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve("dist");
const evidence = resolve("tests/evidence/2026-10-15-boot");
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  // Standalone mode: a present no-op script supplies no Hub object.
  if (pathname === "/hub-bridge.js") {
    res.setHeader("Content-Type", "text/javascript");
    return res.end("/* Standalone smoke: no optional Hub SDK. */");
  }
  const file = resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css" })[extname(file)] ?? "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", request => errors.push(`Request failed: ${request.url()}`));
  page.on("response", response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const canvas = page.locator("canvas");
  await canvas.waitFor();
  await page.waitForFunction(() => document.querySelector("canvas")?.width > 0);
  await mkdir(evidence, { recursive: true });
  const first = await canvas.screenshot({ path: resolve(evidence, "menu.png") });
  assert.ok(first.length > 5000, "menu must contain visible rendered content");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__GAME_DEBUG__?.getScene()?.scene.isActive("Game"));
  const ready = await page.evaluate(() => window.__GAME_DEBUG__.snapshotState());
  assert.equal(ready.status, "ready");
  const table = await canvas.screenshot({ path: resolve(evidence, "table.png") });
  assert.notDeepEqual(table, first, "starting must render a different frame");
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => ["playing", "launched"].includes(window.__GAME_DEBUG__.snapshotState().status));
  const launched = await page.evaluate(() => window.__GAME_DEBUG__.snapshotState());
  if (process.argv.includes("--playtest")) {
    for (let i = 0; i < 8; i++) {
      await page.keyboard.down(i % 2 ? "ArrowRight" : "ArrowLeft");
      await page.waitForTimeout(300);
      await page.keyboard.up(i % 2 ? "ArrowRight" : "ArrowLeft");
      await page.waitForTimeout(300);
    }
    const before = await page.evaluate(() => ({ state: window.__GAME_DEBUG__.snapshotState(), paused: window.__GAME_DEBUG__.getScene().scene.isPaused("Game") }));
    await page.keyboard.press("Escape");
    const after = await page.evaluate(() => ({ state: window.__GAME_DEBUG__.snapshotState(), paused: window.__GAME_DEBUG__.getScene().scene.isPaused("Game") }));
    await page.screenshot({ path: resolve(evidence, "playtest.png") });
    console.log(JSON.stringify({ beforeEscape: before, afterEscape: after }));
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: "passed", ready, launched, errors, evidence }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
