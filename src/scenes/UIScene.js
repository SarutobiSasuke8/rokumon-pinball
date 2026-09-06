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

    this.game.events.on("score-changed", this.onScoreChanged, this);
    this.game.events.on("balls-changed", this.onBallsChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("score-changed", this.onScoreChanged, this);
      this.game.events.off("balls-changed", this.onBallsChanged, this);
    });
  }

  onScoreChanged(score) {
    this.scoreLabel.setText(`Score: ${score}`);
  }

  onBallsChanged(balls) {
    this.ballsLabel.setText(`Balls: ${balls}`);
  }
}
