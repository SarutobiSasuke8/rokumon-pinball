import Phaser from "phaser";
import { GAME } from "../game/constants.js";

export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }

  init(data) {
    this.score = data?.score ?? 0;
    this.tableId = data?.tableId ?? "dragons-lair";
    this.isHighScore = Boolean(data?.isHighScore);
  }

  create() {
    const cx = GAME.width / 2;
    const cy = GAME.height / 2;
    this.add.rectangle(cx, cy, GAME.width, GAME.height, 0x080503, 0.9);
    this.add.text(cx, cy - 90, "BALL DRAINED", {
      fontFamily: "serif", fontSize: "40px", color: "#ffe4b5",
    }).setOrigin(0.5);
    this.add.text(cx, cy - 30, `Score: ${this.score}`, {
      fontFamily: "monospace", fontSize: "26px", color: "#a5f3fc",
    }).setOrigin(0.5);
    if (this.isHighScore) {
      this.add.text(cx, cy + 10, "New high score!", {
        fontFamily: "sans-serif", fontSize: "18px", color: "#ffd700",
      }).setOrigin(0.5);
    }
    this.add.text(cx, cy + 60, "Space / tap to play again", {
      fontFamily: "sans-serif", fontSize: "18px", color: "#93c5fd",
    }).setOrigin(0.5);
    this.add.text(cx, cy + 90, "Esc / long tap for table select", {
      fontFamily: "sans-serif", fontSize: "14px", color: "#6b7280",
    }).setOrigin(0.5);

    const replay = () => this.scene.start("Game", { tableId: this.tableId });
    const toMenu = () => this.scene.start("Menu");
    this.input.keyboard.once("keydown-SPACE", replay);
    this.input.keyboard.once("keydown-ESC", toMenu);
    this.input.once("pointerdown", replay);
  }
}
