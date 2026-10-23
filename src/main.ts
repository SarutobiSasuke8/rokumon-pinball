import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { HowToScene } from "./scenes/HowToScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { GAME } from "./game/constants.js";

// Physics is the game's own fixed-step simulation (src/game/physics.js), so no
// Phaser physics plugin is configured.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME.width,
  height: GAME.height,
  backgroundColor: "#07040a",
  input: { activePointers: 3 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, HowToScene],
});

// index.html shows a loading line while the bundle downloads; drop it once Phaser is up.
game.events.once("ready", () => document.getElementById("boot-loading")?.remove());

if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
