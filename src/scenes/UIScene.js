import Phaser from "phaser";
import { GAME } from "../game/constants.js";

export class UIScene extends Phaser.Scene {
  constructor() { super("UI"); }

  init(data) {
    this.tableName = data?.tableName ?? "";
  }

  create() {
    this.scoreLabel = this.add.text(16, GAME.height - 34, "Score: 0", {
      fontFamily: "monospace", fontSize: "20px", color: "#ffffff",
    });
    this.ballsLabel = this.add.text(GAME.width - 16, GAME.height - 34, `Balls: ${GAME.ballsPerGame}`, {
      fontFamily: "monospace", fontSize: "20px", color: "#ffffff",
    }).setOrigin(1, 0);

    // Pause lives here, not in the Game scene: a paused scene gets no input, so the
    // overlay scene above it owns pausing and resuming.
    this.pauseLayer = this.add.container(0, 0, [
      this.add.rectangle(GAME.width / 2, GAME.height / 2, GAME.width, GAME.height, 0x000000, 0.6),
      this.add.text(GAME.width / 2, GAME.height / 2 - 24, "PAUSED", {
        fontFamily: "serif", fontSize: "44px", color: "#ffe4b5",
      }).setOrigin(0.5),
      this.add.text(GAME.width / 2, GAME.height / 2 + 30, "Tap or press Esc to resume", {
        fontFamily: "sans-serif", fontSize: "18px", color: "#93c5fd",
      }).setOrigin(0.5),
    ]).setVisible(false);

    this.game.events.on("score-changed", this.onScoreChanged, this);
    this.game.events.on("balls-changed", this.onBallsChanged, this);
    // Leaving the tab or window with the ball in play pauses the run instead of draining it.
    this.game.events.on("hidden", this.autoPause, this);
    this.game.events.on("blur", this.autoPause, this);
    this.input.keyboard.on("keydown-ESC", this.togglePause, this);
    this.input.keyboard.on("keydown-P", this.togglePause, this);
    this.input.on("pointerdown", () => { if (this.isPaused()) this.setPaused(false); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("score-changed", this.onScoreChanged, this);
      this.game.events.off("balls-changed", this.onBallsChanged, this);
      this.game.events.off("hidden", this.autoPause, this);
      this.game.events.off("blur", this.autoPause, this);
    });
  }

  isPaused() {
    return this.scene.isPaused("Game");
  }

  autoPause() {
    const status = this.scene.get("Game")?.state?.status;
    if (status === "playing" || status === "launched") this.setPaused(true);
  }

  togglePause() {
    if (this.scene.get("Game")?.state?.status === "gameover") return;
    this.setPaused(!this.isPaused());
  }

  setPaused(paused) {
    if (paused === this.isPaused()) return;
    if (paused) this.scene.pause("Game");
    else this.scene.resume("Game");
    this.pauseLayer.setVisible(paused);
  }

  onScoreChanged(score) {
    this.scoreLabel.setText(`Score: ${score}`);
  }

  onBallsChanged(balls) {
    this.ballsLabel.setText(`Balls: ${balls}`);
  }
}
