import { FLIPPER, GAME } from "../game/constants.js";

// One input contract shared by keyboard and touch/mouse.
//
// Keyboard: left flipper Left Arrow / Z / Left Shift, right flipper Right
// Arrow / M / Right Shift, plunger Space / Down Arrow / Enter.
// Touch or mouse: the left half of the table is the left flipper, the right
// half the right flipper. The score panel strip at the top is left to the HUD.
//
// While a ball waits in the shooter lane, holding ANY of these pulls the
// plunger and letting go launches it, so a phone never needs a third zone.
//
// Presses are recorded as they happen and read once per frame, so a tap that
// starts and ends between two frames still counts as a press and a release,
// and still flips the flipper for at least FLIPPER.minPressMs.

const LEFT_CODES = new Set(["ArrowLeft", "KeyZ", "ShiftLeft"]);
const RIGHT_CODES = new Set(["ArrowRight", "KeyM", "ShiftRight", "Slash"]);
const LAUNCH_CODES = new Set(["Space", "ArrowDown", "Enter", "NumpadEnter"]);

export function sideForCode(code) {
  if (LEFT_CODES.has(code)) return "left";
  if (RIGHT_CODES.has(code)) return "right";
  if (LAUNCH_CODES.has(code)) return "launch";
  return null;
}

export function createActions(scene, options = {}) {
  const hudHeight = options.hudHeight ?? GAME.hudHeight;
  const width = scene.scale.width;
  const now = options.now ?? (() => scene.time?.now ?? performance.now());

  const heldKeys = new Map(); // code -> side
  const pointerZones = new Map(); // pointer id -> side
  const lastPressAt = { left: -Infinity, right: -Infinity };
  let pending = { left: false, right: false, launch: false, released: false };
  let restart = false;

  const press = (side) => {
    if (side === "left" || side === "right") lastPressAt[side] = now();
    pending[side] = true;
  };

  const keyboard = scene.input.keyboard;
  keyboard?.addCapture?.("SPACE,LEFT,RIGHT,DOWN,ENTER,SHIFT");
  const onKeyDown = (event) => {
    if (event.code === "KeyR" && !event.repeat) restart = true;
    const side = sideForCode(event.code);
    if (!side || event.repeat || heldKeys.has(event.code)) return;
    heldKeys.set(event.code, side);
    press(side);
  };
  const onKeyUp = (event) => {
    if (heldKeys.delete(event.code)) pending.released = true;
  };
  keyboard?.on("keydown", onKeyDown);
  keyboard?.on("keyup", onKeyUp);

  const onPointerDown = (pointer) => {
    if (pointer.y < hudHeight) return; // the HUD strip owns these touches
    const side = pointer.x < width / 2 ? "left" : "right";
    pointerZones.set(pointer.id, side);
    press(side);
  };
  const onPointerUp = (pointer) => {
    if (pointerZones.delete(pointer.id)) pending.released = true;
  };
  scene.input.on("pointerdown", onPointerDown);
  scene.input.on("pointerup", onPointerUp);
  scene.input.on("pointerupoutside", onPointerUp);

  const clearAll = () => {
    pointerZones.clear();
    heldKeys.clear();
    lastPressAt.left = -Infinity;
    lastPressAt.right = -Infinity;
    pending.released = true;
  };
  scene.game.events.on("blur", clearAll);
  scene.game.events.on("hidden", clearAll);
  scene.events.once("shutdown", () => {
    clearAll();
    scene.game.events.off("blur", clearAll);
    scene.game.events.off("hidden", clearAll);
    keyboard?.off("keydown", onKeyDown);
    keyboard?.off("keyup", onKeyUp);
    scene.input.off("pointerdown", onPointerDown);
    scene.input.off("pointerup", onPointerUp);
    scene.input.off("pointerupoutside", onPointerUp);
  });

  const held = (side) => {
    for (const s of heldKeys.values()) if (s === side) return true;
    for (const s of pointerZones.values()) if (s === side) return true;
    return false;
  };
  const anyHeld = () => heldKeys.size > 0 || pointerZones.size > 0;

  return {
    leftFlipperDown: () => held("left") || now() - lastPressAt.left < FLIPPER.minPressMs,
    rightFlipperDown: () => held("right") || now() - lastPressAt.right < FLIPPER.minPressMs,
    anyHeld,
    // Read and clear what happened since the previous frame.
    poll: () => {
      const out = { ...pending, any: pending.left || pending.right || pending.launch };
      pending = { left: false, right: false, launch: false, released: false };
      return out;
    },
    restartPressed: () => {
      const r = restart;
      restart = false;
      return r;
    },
    clear: clearAll,
  };
}
