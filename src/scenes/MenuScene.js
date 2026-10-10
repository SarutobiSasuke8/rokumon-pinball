import Phaser from "phaser";
import { GAME } from "../game/constants.js";
import { TABLES } from "../game/tables.js";
import { loadSave, isOwned, highScoreFor } from "../game/save.js";

// Table-select screen: one playable free table today, plus locked/buyable
// fantasy tables shown as coming soon. Buying is a design placeholder only
// (see docs/PROJECT_BRIEF.md) — locked tables just explain that, no payment.
export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create() {
    this.firstOwnedId = null;
    this.save = loadSave();
    this.add.text(GAME.width / 2, 90, "ROKUMON PINBALL", {
      fontFamily: "serif", fontSize: "40px", color: "#ffe4b5",
    }).setOrigin(0.5);
    this.add.text(GAME.width / 2, 134, "Choose a table", {
      fontFamily: "sans-serif", fontSize: "18px", color: "#93c5fd",
    }).setOrigin(0.5);

    const startY = 220;
    const rowHeight = 130;
    TABLES.forEach((table, index) => this.buildRow(table, startY + index * rowHeight));
  }

  buildRow(table, y) {
    const owned = isOwned(this.save, table.id);
    const width = GAME.width - 80;
    const card = this.add.rectangle(GAME.width / 2, y, width, 100, table.colors.playfield, owned ? 1 : 0.5)
      .setStrokeStyle(2, table.colors.rail ?? 0x888888);

    this.add.text(GAME.width / 2, y - 22, table.name, {
      fontFamily: "serif", fontSize: "24px", color: owned ? "#ffe4b5" : "#7a7a7a",
    }).setOrigin(0.5);

    if (owned) {
      const best = highScoreFor(this.save, table.id);
      this.add.text(GAME.width / 2, y + 12, `Best: ${best}`, {
        fontFamily: "monospace", fontSize: "16px", color: "#a5f3fc",
      }).setOrigin(0.5);
      this.add.text(GAME.width / 2, y + 34, "Tap or press Space to play", {
        fontFamily: "sans-serif", fontSize: "13px", color: "#93c5fd",
      }).setOrigin(0.5);
      card.setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => this.playTable(table.id));
      if (!this.firstOwnedId) {
        this.firstOwnedId = table.id;
        this.input.keyboard.once("keydown-SPACE", () => this.playTable(this.firstOwnedId));
      }
    } else {
      this.add.text(GAME.width / 2, y + 12, `Locked — ${table.price} coins`, {
        fontFamily: "sans-serif", fontSize: "15px", color: "#7a7a7a",
      }).setOrigin(0.5);
      this.add.text(GAME.width / 2, y + 34, "Coming soon", {
        fontFamily: "sans-serif", fontSize: "13px", color: "#5a5a5a",
      }).setOrigin(0.5);
    }
  }

  playTable(tableId) {
    this.scene.start("Game", { tableId });
  }
}
