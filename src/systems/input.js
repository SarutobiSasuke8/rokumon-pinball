import Phaser from "phaser";

// One input contract shared by keyboard (desktop) and touch zones (mobile):
// left flipper, right flipper, restart. There is no separate launch key —
// while the ball is waiting in the plunger lane, pressing either flipper
// launches it, so a phone screen never needs a third input zone.
export function createActions(scene) {
  const keys = scene.input.keyboard.addKeys({
    left: "LEFT",
    leftAlt: "Z",
    right: "RIGHT",
    rightAlt: "M",
    restart: "R",
  });

  // Track the half each pointer pressed, rather than where it is released.
  const pointerZones = new Map();
  const width = scene.scale.width;

  scene.input.on("pointerdown", (pointer) => {
    pointerZones.set(pointer.id, pointer.x < width / 2 ? "left" : "right");
  });
  const release = (pointer) => pointerZones.delete(pointer.id);
  scene.input.on("pointerup", release);
  scene.input.on("pointerupoutside", release);
  const clearPointers = () => { pointerZones.clear(); wasAnyDown = false; };
  scene.game.events.on("blur", clearPointers);
  scene.events.once("shutdown", () => {
    clearPointers();
    scene.game.events.off("blur", clearPointers);
  });

  const zoneDown = (zone) => {
    for (const side of pointerZones.values()) if (side === zone) return true;
    return false;
  };

  let wasAnyDown = false;

  return {
    leftFlipperDown: () => keys.left.isDown || keys.leftAlt.isDown || zoneDown("left"),
    rightFlipperDown: () => keys.right.isDown || keys.rightAlt.isDown || zoneDown("right"),
    anyFlipperJustPressed: () => {
      const down = keys.left.isDown || keys.leftAlt.isDown || keys.right.isDown || keys.rightAlt.isDown || pointerZones.size > 0;
      const justDown = down && !wasAnyDown;
      wasAnyDown = down;
      return justDown;
    },
    restartPressed: () => Phaser.Input.Keyboard.JustDown(keys.restart),
  };
}
