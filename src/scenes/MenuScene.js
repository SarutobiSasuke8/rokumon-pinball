import Phaser from "phaser";
import { GAME } from "../game/constants.js";
import { TABLES } from "../game/tables.js";
import { loadSave, highScoreFor, topScoresFor, setMuted as saveMuted } from "../game/save.js";
import { DRAGON } from "../art/textures.js";
import { play, setMuted, isMuted, unlockAudio } from "../systems/audio.js";
import { heading, body, panel, button, embers, formatNumber, COLORS, FONT_UI } from "../ui/widgets.js";

// Title screen. Dragon's Lair is the one playable table; the other catalogue
// tables are shown as locked previews ("coming soon"). There is nothing to buy.
export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create() {
    this.save = loadSave();
    this.starting = false;
    const table = TABLES.find((t) => t.playable);
    this.tableId = table.id;
    const cx = GAME.width / 2;

    this.add.image(0, 0, "playfield").setOrigin(0).setAlpha(0.5);
    this.add.rectangle(cx, GAME.height / 2, GAME.width, GAME.height, 0x050205, 0.55);
    embers(this);

    // The dragon's eyes glow on the title screen.
    for (const dir of [-1, 1]) {
      const eye = this.add.image(DRAGON.cx + DRAGON.eyeDx * dir, DRAGON.eyeY, "glow").setTint(0xffa21a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.45, 0.25);
      this.tweens.add({ targets: eye, alpha: { from: 0.45, to: 1 }, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    body(this, cx, 92, "R O K U M O N   G A M E S", 15, COLORS.muted);
    const title = heading(this, cx, 160, "PINBALL", 84);
    this.tweens.add({ targets: title, scale: { from: 1, to: 1.03 }, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    heading(this, cx, 236, "DRAGON'S LAIR", 34, COLORS.cream);
    body(this, cx, 274, "Three balls. One sleeping dragon. Wake it for the jackpot.", 16, COLORS.muted);

    // High scores.
    panel(this, cx, 392, 360, 156, 0.88);
    body(this, cx, 336, "HIGH SCORES", 15, COLORS.gold).setFontStyle("bold");
    const top = topScoresFor(this.save, this.tableId);
    if (top.length === 0) {
      body(this, cx, 392, "No scores yet.\nBe the first to wake the dragon.", 16, COLORS.cream);
    } else {
      top.slice(0, 5).forEach((entry, i) => {
        const y = 362 + i * 22;
        body(this, cx - 120, y, `${i + 1}.`, 16, COLORS.muted, { originX: 0 });
        body(this, cx + 120, y, formatNumber(entry.score), 17, i === 0 ? COLORS.gold : COLORS.cream, { originX: 1 }).setFontFamily("monospace");
      });
    }
    this.bestText = `Best ${formatNumber(highScoreFor(this.save, this.tableId))}`;

    this.playButton = button(this, cx, 528, 300, 64, "PLAY", () => this.playTable(), { primary: true, size: 30 });
    this.tweens.add({ targets: this.playButton.container, scale: { from: 1, to: 1.04 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    button(this, cx, 612, 300, 52, "HOW TO PLAY", () => this.openHowTo());
    this.soundButton = button(this, cx, 682, 300, 52, this.soundLabel(), () => this.toggleSound());

    body(this, cx, 752, "Space or Enter to play  ·  H for how to play  ·  S for sound", 13, COLORS.muted);

    // Locked catalogue previews.
    body(this, cx, 812, "MORE TABLES", 13, COLORS.muted).setFontStyle("bold");
    TABLES.filter((t) => !t.playable).forEach((t, i) => {
      const x = cx + (i === 0 ? -132 : 132);
      const g = this.add.graphics();
      g.fillStyle(t.colors.playfield ?? 0x111111, 0.85);
      g.fillRoundedRect(x - 120, 832, 240, 70, 12);
      g.lineStyle(2, t.colors.rail ?? 0x888888, 0.6);
      g.strokeRoundedRect(x - 120, 832, 240, 70, 12);
      this.add.text(x, 856, t.name, { fontFamily: "Georgia, serif", fontSize: "20px", color: "#9a9a9a" }).setOrigin(0.5);
      this.add.text(x, 882, "Locked · coming soon", { fontFamily: FONT_UI, fontSize: "13px", color: "#7a7a7a" }).setOrigin(0.5);
    });
    body(this, cx, 950, "Play money only. No purchases, no accounts.", 12, "#7d6a58");

    const keys = this.input.keyboard;
    keys.on("keydown-SPACE", () => this.playTable());
    keys.on("keydown-ENTER", () => this.playTable());
    keys.on("keydown-H", () => this.openHowTo());
    keys.on("keydown-S", () => this.toggleSound());
  }

  soundLabel() {
    return isMuted() ? "SOUND: OFF" : "SOUND: ON";
  }

  toggleSound() {
    if (this.scene.isActive("HowTo")) return;
    unlockAudio();
    setMuted(!isMuted());
    saveMuted(this.save, isMuted());
    this.soundButton.setLabel(this.soundLabel());
    play("click");
  }

  openHowTo() {
    if (this.scene.isActive("HowTo")) return;
    this.scene.launch("HowTo", { returnTo: "Menu" });
    this.scene.pause();
  }

  playTable(tableId = this.tableId) {
    if (this.starting || this.scene.isActive("HowTo")) return;
    this.starting = true;
    unlockAudio();
    play("start");
    this.scene.start("Game", { tableId });
  }
}
