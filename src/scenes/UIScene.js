import Phaser from "phaser";
import { GAME } from "../game/constants.js";
import { loadSave, setMuted as saveMuted } from "../game/save.js";
import { createFrame, drawText, drawCentered, textWidth, fitScale, formatScore, paintFrame, DMD_COLS, DMD_ROWS } from "../ui/dmd.js";
import { play, setMuted, isMuted } from "../systems/audio.js";
import { heading, panel, button, COLORS } from "../ui/widgets.js";

const PITCH = 3.7;
const DMD_X = 8;
const DMD_Y = 4;
const MESSAGE_MS = 1500;

// The HUD strip above the table (dot-matrix score display and pause button)
// and the pause menu. Pause lives here, not in the Game scene: a paused scene
// gets no input, so the overlay scene above it owns pausing and resuming.
export class UIScene extends Phaser.Scene {
  constructor() { super("UI"); }

  init(data) {
    this.tableName = data?.tableName ?? "";
  }

  create() {
    this.save = loadSave();
    this.displayedScore = 0;
    this.messages = [];
    this.current = null;
    this.lastKey = "";

    const band = this.add.graphics();
    band.fillStyle(0x0b0505, 1);
    band.fillRect(0, 0, GAME.width, GAME.hudHeight);
    band.lineStyle(3, 0xd9a733, 1);
    band.lineBetween(0, GAME.hudHeight - 1, GAME.width, GAME.hudHeight - 1);
    band.lineStyle(2, 0x3a2208, 1);
    band.strokeRoundedRect(DMD_X - 3, DMD_Y - 2, DMD_COLS * PITCH + 6, DMD_ROWS * PITCH + 4, 6);

    if (this.textures.exists("dmd")) this.textures.remove("dmd");
    this.dmdTexture = this.textures.createCanvas("dmd", Math.ceil(DMD_COLS * PITCH), Math.ceil(DMD_ROWS * PITCH));
    this.add.image(DMD_X, DMD_Y, "dmd").setOrigin(0);
    this.frame = createFrame();

    // Pause button.
    const px = 548;
    const py = GAME.hudHeight / 2;
    const pg = this.add.graphics();
    pg.fillStyle(0x24100a, 1);
    pg.fillCircle(px, py, 30);
    pg.lineStyle(3, 0xd9a733, 1);
    pg.strokeCircle(px, py, 30);
    pg.fillStyle(0xf4d27a, 1);
    pg.fillRoundedRect(px - 11, py - 13, 8, 26, 2);
    pg.fillRoundedRect(px + 3, py - 13, 8, 26, 2);
    this.pauseZone = this.add.zone(px, py, 84, GAME.hudHeight).setInteractive({ useHandCursor: true });
    this.pauseZone.on("pointerup", () => { play("click"); this.togglePause(); });

    this.buildPauseMenu();

    this.game.events.on("score-changed", this.onScoreChanged, this);
    this.game.events.on("dmd-message", this.onMessage, this);
    // Leaving the tab or window with the ball in play pauses the run instead of draining it.
    this.game.events.on("hidden", this.autoPause, this);
    this.game.events.on("blur", this.autoPause, this);
    this.input.keyboard.on("keydown-ESC", this.togglePause, this);
    this.input.keyboard.on("keydown-P", this.togglePause, this);
    this.events.on("resume", () => this.pauseLayer.setVisible(this.isPaused()));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("score-changed", this.onScoreChanged, this);
      this.game.events.off("dmd-message", this.onMessage, this);
      this.game.events.off("hidden", this.autoPause, this);
      this.game.events.off("blur", this.autoPause, this);
    });
  }

  buildPauseMenu() {
    const cx = GAME.width / 2;
    const items = [];
    const shade = this.add.rectangle(cx, GAME.height / 2, GAME.width, GAME.height, 0x000000, 0.66).setInteractive();
    items.push(shade, panel(this, cx, 520, 400, 560), heading(this, cx, 300, "PAUSED", 48));
    this.pauseButtons = [
      button(this, cx, 390, 300, 58, "RESUME", () => this.setPaused(false), { primary: true, size: 26 }),
      button(this, cx, 462, 300, 52, "HOW TO PLAY", () => this.openHowTo()),
      button(this, cx, 528, 300, 52, isMuted() ? "SOUND: OFF" : "SOUND: ON", () => this.toggleSound()),
      button(this, cx, 594, 300, 52, "RESTART", () => this.restart()),
      button(this, cx, 660, 300, 52, "QUIT TO TITLE", () => this.quit()),
    ];
    this.soundButton = this.pauseButtons[2];
    const hint = this.add.text(cx, 740, "Esc or P to resume", { fontFamily: "sans-serif", fontSize: "15px", color: COLORS.muted }).setOrigin(0.5);
    items.push(...this.pauseButtons.map((b) => b.container), hint);
    this.pauseLayer = this.add.container(0, 0, items).setVisible(false);
    // The shade blocks taps to the table; the button hit zones must sit above it.
    this.pauseButtons.forEach((b) => { this.children.bringToTop(b.zone); b.setVisible(false); });
  }

  isPaused() {
    return this.scene.isPaused("Game");
  }

  autoPause() {
    const status = this.scene.get("Game")?.state?.status;
    if (status === "playing" || status === "launched") this.setPaused(true);
  }

  togglePause() {
    if (this.scene.isActive("HowTo")) return;
    if (this.scene.get("Game")?.state?.status === "gameover") return;
    this.setPaused(!this.isPaused());
  }

  setPaused(paused) {
    if (paused === this.isPaused()) return;
    if (paused) this.scene.pause("Game");
    else this.scene.resume("Game");
    this.pauseLayer.setVisible(paused);
    this.pauseButtons.forEach((b) => b.setVisible(paused));
    this.pauseZone.setVisible(!paused);
  }

  openHowTo() {
    this.scene.launch("HowTo", { returnTo: "UI" });
    this.scene.pause();
  }

  toggleSound() {
    setMuted(!isMuted());
    saveMuted(this.save, isMuted());
    this.soundButton.setLabel(isMuted() ? "SOUND: OFF" : "SOUND: ON");
  }

  restart() {
    const game = this.scene.get("Game");
    this.setPaused(false);
    this.scene.stop();
    game.scene.restart({ tableId: game.tableId });
  }

  quit() {
    this.scene.stop("Game");
    this.scene.start("Menu");
  }

  onScoreChanged(score) {
    this.score = score;
  }

  onMessage(message) {
    // A new big message replaces anything queued behind it; small ones queue.
    if (message.kind !== "small") this.messages = this.messages.filter((m) => m.kind === "small");
    this.messages.push(message);
    if (this.current && this.current.kind === "small" && message.kind !== "small") this.current = null;
  }

  update(time, delta) {
    const game = this.scene.get("Game");
    const state = game?.state;
    if (!state) return;
    // Score counts up quickly rather than jumping.
    const target = state.score;
    if (this.displayedScore < target) {
      const step = Math.max(1, Math.ceil((target - this.displayedScore) * Math.min(1, delta / 90)));
      this.displayedScore = Math.min(target, this.displayedScore + step);
    } else {
      this.displayedScore = target;
    }

    if (this.current && time > this.current.until) this.current = null;
    if (!this.current && this.messages.length) {
      const m = this.messages.shift();
      this.current = { ...m, until: time + (m.kind === "jackpot" ? MESSAGE_MS * 1.6 : MESSAGE_MS), start: time };
    }

    const blink = Math.floor(time / 120) % 2;
    const key = this.current
      ? `m:${this.current.text}:${this.current.kind}:${blink}`
      : `s:${this.displayedScore}:${state.ballNumber}:${state.multiplier}:${state.status}:${Math.floor(time / 600) % 2}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.drawDmd(state, blink);
  }

  drawDmd(state, blink) {
    const f = this.frame;
    f.fill(0);
    if (this.current) {
      const { text, kind } = this.current;
      if (kind === "jackpot") {
        if (blink) f.fill(1);
        drawCentered(f, text, 1, { scale: fitScale(text, 3), level: blink ? 0 : 3 });
      } else if (kind === "big") {
        const scale = fitScale(text, 3);
        drawCentered(f, text, Math.round((DMD_ROWS - 7 * scale) / 2), { scale, level: 3 });
      } else {
        drawCentered(f, text, 2, { level: 3 });
        drawCentered(f, formatScore(this.displayedScore), 12, { scale: 1, level: 2 });
      }
    } else {
      const ballText = state.status === "gameover" ? "GAME OVER" : `BALL ${state.ballNumber}`;
      drawText(f, ballText, 1, 0, { level: 2 });
      const mult = `${state.multiplier}X`;
      drawText(f, mult, DMD_COLS - textWidth(mult) - 1, 0, { level: state.multiplier > 1 ? 3 : 1 });
      const score = formatScore(this.displayedScore);
      drawCentered(f, score, 9, { scale: 2, level: 3 });
    }
    const ctx = this.dmdTexture.getContext();
    paintFrame(ctx, f, PITCH);
    this.dmdTexture.refresh();
  }
}
