import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { GAME, PHYSICS } from "./game/constants.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME.width,
  height: GAME.height,
  backgroundColor: "#0b1020",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: PHYSICS.gravity },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene],
});

if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
