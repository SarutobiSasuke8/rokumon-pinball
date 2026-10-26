import Phaser from "phaser";
import { GAME } from "../game/constants.js";
import { loadSave, topScoresFor, highScoreFor } from "../game/save.js";
import { play } from "../systems/audio.js";
import { heading, body, panel, button, embers, formatNumber, COLORS } from "../ui/widgets.js";

// Accept no input for a moment, so a finger still on a flipper when the last
// ball drains cannot skip past the result.
const INPUT_LOCK_MS = 700;

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }

  init(data) {
    this.score = data?.score ?? 0;
    this.tableId = data?.tableId ?? "dragons-lair";
    this.isHighScore = Boolean(data?.isHighScore);
    this.rank = data?.rank ?? 0;
    this.stats = data?.stats ?? {};
    this.leaving = false;
  }

  create() {
    const cx = GAME.width / 2;
    const save = loadSave();
    this.add.image(0, 0, "playfield").setOrigin(0).setAlpha(0.45);
    this.add.rectangle(cx, GAME.height / 2, GAME.width, GAME.height, 0x050205, 0.6);
    embers(this);
    panel(this, cx, 470, 500, 720);

    heading(this, cx, 170, "GAME OVER", 56);
    body(this, cx, 226, "FINAL SCORE", 15, COLORS.muted).setFontStyle("bold");
    const scoreText = heading(this, cx, 272, "0", 50, COLORS.cream);
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter, v: this.score, duration: Math.min(1400, 300 + this.score / 40), ease: "Cubic.easeOut",
      onUpdate: () => scoreText.setText(formatNumber(counter.v)),
      onComplete: () => scoreText.setText(formatNumber(this.score)),
    });

    if (this.isHighScore) {
      const banner = heading(this, cx, 330, "NEW HIGH SCORE!", 30, "#ffd700");
      this.tweens.add({ targets: banner, scale: { from: 0.9, to: 1.08 }, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.add.particles(cx, 330, "spark", {
        speed: { min: 150, max: 420 }, lifespan: 1100, scale: { start: 1, end: 0 }, gravityY: 300,
        tint: [0xffd700, 0xff8c3a, 0xffffff], blendMode: Phaser.BlendModes.ADD, emitting: false,
      }).explode(70);
      this.time.delayedCall(250, () => play("highscore"));
    } else {
      body(this, cx, 330, `Best: ${formatNumber(highScoreFor(save, this.tableId))}`, 18, COLORS.gold);
    }

    const s = this.stats;
    body(this, cx, 376, `Jackpots ${s.jackpots ?? 0}   ·   Skill shots ${s.skillShots ?? 0}   ·   LAIR ${s.lanesCompleted ?? 0}`, 15, COLORS.muted);

    body(this, cx, 420, "HIGH SCORES", 15, COLORS.gold).setFontStyle("bold");
    const top = topScoresFor(save, this.tableId);
    top.slice(0, 5).forEach((entry, i) => {
      const y = 452 + i * 30;
      const mine = i + 1 === this.rank;
      if (mine) this.add.rectangle(cx, y, 300, 26, 0xa3162c, 0.55).setStrokeStyle(1, 0xffd27a);
      body(this, cx - 130, y, `${i + 1}.`, 17, mine ? COLORS.cream : COLORS.muted, { originX: 0 });
      body(this, cx + 130, y, formatNumber(entry.score), 18, mine ? "#ffd700" : COLORS.cream, { originX: 1 }).setFontFamily("monospace");
      if (mine) body(this, cx - 92, y, "YOU", 13, "#ffd700", { originX: 0 }).setFontStyle("bold");
    });
    if (top.length === 0) body(this, cx, 470, "No score this time. Wake the dragon next run!", 15, COLORS.cream);

    this.again = button(this, cx, 666, 300, 62, "PLAY AGAIN", () => this.replay(), { primary: true, size: 28 });
    this.title = button(this, cx, 744, 300, 52, "TITLE SCREEN", () => this.toMenu());
    body(this, cx, 800, "Space or Enter to play again  ·  Esc for the title screen", 13, COLORS.muted);

    this.readyAt = this.time.now + INPUT_LOCK_MS;
    const keys = this.input.keyboard;
    keys.on("keydown-SPACE", () => this.replay());
    keys.on("keydown-ENTER", () => this.replay());
    keys.on("keydown-ESC", () => this.toMenu());
  }

  ready() {
    return !this.leaving && this.time.now >= this.readyAt;
  }

  replay() {
    if (!this.ready()) return;
    this.leaving = true;
    play("start");
    this.scene.start("Game", { tableId: this.tableId });
  }

  toMenu() {
    if (!this.ready()) return;
    this.leaving = true;
    this.scene.start("Menu");
  }
}
