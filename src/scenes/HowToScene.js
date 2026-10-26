import Phaser from "phaser";
import { GAME } from "../game/constants.js";
import { heading, body, panel, button, COLORS, FONT_UI } from "../ui/widgets.js";

// How to play: an overlay opened from the title screen or the pause menu.
// It pauses whichever scene opened it and resumes that scene when closed.
export class HowToScene extends Phaser.Scene {
  constructor() { super("HowTo"); }

  init(data) {
    this.returnTo = data?.returnTo ?? "Menu";
    this.closing = false;
  }

  create() {
    const cx = GAME.width / 2;
    const touch = this.sys.game.device.input.touch;
    this.add.rectangle(cx, GAME.height / 2, GAME.width, GAME.height, 0x000000, 0.72).setInteractive();
    panel(this, cx, 500, 552, 900);
    heading(this, cx, 98, "HOW TO PLAY", 38);

    const rows = [
      ["LAUNCH", touch
        ? "Touch and hold anywhere to pull the plunger. Let go to launch. Hold longer for a stronger plunge."
        : "Hold Space (or Down) to pull the plunger. Let go to launch. Hold longer for a stronger plunge."],
      ["FLIPPERS", touch
        ? "Tap or hold the left half of the table for the left flipper, the right half for the right. Use two thumbs."
        : "Left flipper: Left Arrow, Z or Left Shift.  Right flipper: Right Arrow, M or Right Shift. Touch works too."],
      ["GOAL", "Keep the ball out of the drain between the flippers and down the outer lanes. You have 3 balls."],
      ["L-A-I-R", "Roll through all four top lanes to raise the multiplier (up to 5x). Flipping moves the lit lanes."],
      ["SKILL SHOT", "After a plunge one top lane blinks. Roll through it first for 5,000."],
      ["JACKPOT", "Hit all three gems on the right to wake the dragon, then shoot the Mouth on the left for 25,000."],
      ["SAVES", "A ball that drains in its first 8 seconds comes back. The lit Breath kickback saves one left outlane drain."],
      ["PAUSE", touch ? "Tap the II button at the top right." : "Esc or P, or the II button at the top right."],
    ];
    let y = 150;
    for (const [label, text] of rows) {
      this.add.text(56, y, label, { fontFamily: FONT_UI, fontSize: "15px", fontStyle: "bold", color: COLORS.gold }).setOrigin(0, 0);
      const t = body(this, 168, y - 1, text, 15, COLORS.cream, { align: "left", wrap: 372, originX: 0, originY: 0, lineSpacing: 3 });
      y += Math.max(26, t.height) + 16;
    }

    // A small picture of the touch zones.
    const zy = y + 8;
    const g = this.add.graphics();
    g.lineStyle(2, 0xd9a733, 0.8);
    g.strokeRoundedRect(cx - 90, zy, 180, 112, 10);
    g.fillStyle(0xa3162c, 0.35);
    g.fillRoundedRect(cx - 88, zy + 2, 88, 108, { tl: 8, tr: 0, bl: 8, br: 0 });
    g.fillStyle(0x2a5aa3, 0.35);
    g.fillRoundedRect(cx, zy + 2, 88, 108, { tl: 0, tr: 8, bl: 0, br: 8 });
    g.lineStyle(1, 0xffffff, 0.5);
    g.lineBetween(cx, zy + 4, cx, zy + 108);
    body(this, cx - 44, zy + 46, "LEFT\nFLIPPER", 13, COLORS.cream);
    body(this, cx + 44, zy + 46, "RIGHT\nFLIPPER", 13, COLORS.cream);
    body(this, cx, zy + 126, "Hold anywhere to pull the plunger", 12, COLORS.muted);

    this.closeButton = button(this, cx, 900, 240, 56, "GOT IT", () => this.close(), { primary: true, size: 24 });
    const keys = this.input.keyboard;
    for (const k of ["keydown-ESC", "keydown-SPACE", "keydown-ENTER", "keydown-H"]) keys.on(k, () => this.close());
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.scene.resume(this.returnTo);
    this.scene.stop();
  }

}
