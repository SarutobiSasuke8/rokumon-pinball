import type { CDPSession, Page } from "@playwright/test";

// Real touch input through the Chrome DevTools Protocol. Input.dispatchTouchEvent
// makes the browser fire genuine touchstart/touchmove/touchend events (and the
// matching pointer events with pointerType "touch"), exactly as a finger on a
// phone screen would. No mouse events are synthesised by this helper.
// Each finger has its own id, so multi-touch holds can overlap.
export class Touchscreen {
  private readonly fingers = new Map<number, { x: number; y: number }>();

  private constructor(private readonly cdp: CDPSession, private readonly page: Page) {}

  static async attach(page: Page): Promise<Touchscreen> {
    return new Touchscreen(await page.context().newCDPSession(page), page);
  }

  private points() {
    return [...this.fingers].map(([id, { x, y }]) => ({ id, x, y, radiusX: 6, radiusY: 6, force: 1 }));
  }

  async down(id: number, x: number, y: number): Promise<void> {
    this.fingers.set(id, { x, y });
    await this.cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: this.points() });
  }

  async move(id: number, x: number, y: number, steps = 6): Promise<void> {
    const from = this.fingers.get(id);
    if (!from) throw new Error(`finger ${id} is not down`);
    for (let step = 1; step <= steps; step += 1) {
      this.fingers.set(id, { x: from.x + ((x - from.x) * step) / steps, y: from.y + ((y - from.y) * step) / steps });
      await this.cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: this.points() });
    }
  }

  async up(id: number): Promise<void> {
    const finger = this.fingers.get(id);
    if (!finger) throw new Error(`finger ${id} is not down`);
    // A touchEnd that lists one point lifts exactly that finger straight away;
    // the other fingers stay down. (Dropping the point from a touchMove instead
    // makes Chromium defer the touchend until the last finger lifts.)
    await this.cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [{ id, ...finger }] });
    this.fingers.delete(id);
  }

  async tap(x: number, y: number, id = 90): Promise<void> {
    await this.down(id, x, y);
    await this.page.waitForTimeout(60);
    await this.up(id);
  }

  async hold(x: number, y: number, ms: number, id = 91): Promise<void> {
    await this.down(id, x, y);
    await this.page.waitForTimeout(ms);
    await this.up(id);
  }
}

// Counts the native events that reach the page, so a test can prove the game
// was driven by touch and that no mouse fallback events were involved.
export const NATIVE_EVENT_COUNTER = `
  window.__nativeEvents = { touchstart: 0, touchend: 0, touchmove: 0, mousedown: 0, mouseup: 0 };
  for (const type of Object.keys(window.__nativeEvents)) {
    window.addEventListener(type, () => { window.__nativeEvents[type] += 1; }, { capture: true, passive: true });
  }
`;
