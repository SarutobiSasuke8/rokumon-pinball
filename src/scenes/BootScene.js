import Phaser from "phaser";
import { generateTextures } from "../art/textures.js";
import { loadSave } from "../game/save.js";
import { setMuted, unlockAudio } from "../systems/audio.js";
import { installDebug } from "../systems/debug.js";

export class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }

  create() {
    generateTextures(this);
    // Debug hook from the first frame (tests read the game through it); the
    // Game scene replaces it with one that also snapshots the run.
    installDebug(this, () => null);
    setMuted(loadSave().settings.muted);
    // Audio may only start after a user gesture; the first tap or key does it.
    const unlock = () => unlockAudio();
    this.game.canvas.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    this.scene.start("Menu");
  }
}
