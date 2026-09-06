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

  const pointerZones = { left: false, right: false };
  const width = scene.scale.width;

  scene.input.on("pointerdown", (pointer) => {
    if (pointer.x < width / 2) pointerZones.left = true;
    else pointerZones.right = true;
  });
  scene.input.on("pointerup", (pointer) => {
    if (pointer.x < width / 2) pointerZones.left = false;
    else pointerZones.right = false;
  });
  scene.input.on("pointerupoutside", () => {
    pointerZones.left = false;
    pointerZones.right = false;
  });

  let wasAnyDown = false;

  return {
    leftFlipperDown: () => keys.left.isDown || keys.leftAlt.isDown || pointerZones.left,
    rightFlipperDown: () => keys.right.isDown || keys.rightAlt.isDown || pointerZones.right,
    anyFlipperJustPressed: () => {
      const down = keys.left.isDown || keys.leftAlt.isDown || keys.right.isDown || keys.rightAlt.isDown || pointerZones.left || pointerZones.right;
      const justDown = down && !wasAnyDown;
      wasAnyDown = down;
      return justDown;
    },
    restartPressed: () => Phaser.Input.Keyboard.JustDown(keys.restart),
  };
}
