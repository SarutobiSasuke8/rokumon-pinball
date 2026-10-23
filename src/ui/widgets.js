import Phaser from "phaser";
import { play } from "../systems/audio.js";

export const FONT_DISPLAY = "Georgia, 'Times New Roman', serif";
export const FONT_UI = "'Trebuchet MS', 'Segoe UI', Roboto, Arial, sans-serif";

export const COLORS = {
  gold: "#f4d27a",
  goldDeep: 0xd9a733,
  cream: "#ffe9c4",
  ember: "#ff8c3a",
  muted: "#b9a48a",
  panel: 0x140808,
  panelEdge: 0xd9a733,
};

export function heading(scene, x, y, text, size = 44, color = COLORS.gold) {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_DISPLAY,
    fontSize: `${size}px`,
    fontStyle: "bold",
    color,
    stroke: "#2a0e06",
    strokeThickness: Math.max(3, Math.round(size / 9)),
  }).setOrigin(0.5).setShadow(0, 3, "#000000", 6, true, true);
}

export function body(scene, x, y, text, size = 18, color = COLORS.cream, opts = {}) {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_UI,
    fontSize: `${size}px`,
    color,
    align: opts.align ?? "center",
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: opts.lineSpacing ?? 4,
  }).setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
}

export function panel(scene, x, y, w, h, alpha = 0.94) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.5);
  g.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 6, w, h, 18);
  g.fillStyle(COLORS.panel, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);
  g.lineStyle(3, COLORS.panelEdge, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 18);
  g.lineStyle(1, 0xfff1b8, 0.35);
  g.strokeRoundedRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 12, 14);
  return g;
}

// A tappable button. Returns { container, zone, setLabel }.
export function button(scene, x, y, w, h, label, onClick, { primary = false, size = 22 } = {}) {
  const g = scene.add.graphics();
  const draw = (hover) => {
    g.clear();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, h / 2);
    g.fillStyle(primary ? (hover ? 0xc8452a : 0xa3162c) : (hover ? 0x3a1a10 : 0x24100a), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(3, primary ? 0xffd27a : COLORS.goldDeep, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(0xffffff, primary ? 0.18 : 0.08);
    g.fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h / 2 - 4, (h / 2 - 4) / 2);
  };
  draw(false);
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONT_DISPLAY,
    fontSize: `${size}px`,
    fontStyle: "bold",
    color: primary ? "#fff6e0" : COLORS.gold,
  }).setOrigin(0.5).setShadow(0, 2, "#000", 3, true, true);
  const container = scene.add.container(x, y, [g, text]);
  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
  zone.on("pointerover", () => draw(true));
  zone.on("pointerout", () => { draw(false); container.setScale(1); });
  zone.on("pointerdown", () => container.setScale(0.96));
  zone.on("pointerup", () => {
    container.setScale(1);
    play("click");
    onClick();
  });
  return {
    container,
    zone,
    setLabel: (value) => text.setText(value),
    setVisible: (v) => { container.setVisible(v); zone.setVisible(v); if (v) zone.setInteractive(); else zone.disableInteractive(); },
    destroy: () => { container.destroy(); zone.destroy(); },
  };
}

// Embers drifting up from the lair, for the menu screens.
export function embers(scene, depth = 0) {
  return scene.add.particles(0, 0, "spark", {
    x: { min: 20, max: 580 },
    y: 1010,
    lifespan: { min: 3000, max: 6000 },
    speedY: { min: -60, max: -25 },
    speedX: { min: -12, max: 12 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.9, end: 0 },
    frequency: 140,
    blendMode: Phaser.BlendModes.ADD,
  }).setDepth(depth);
}

export function formatNumber(n) {
  return Math.max(0, Math.floor(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
