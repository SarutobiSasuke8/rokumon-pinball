// Input contract checks for src/systems/input.js: keyboard and touch share one
// set of named actions. Runs in Node with event-emitter stand-ins for Phaser.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createActions, sideForCode } from "../src/systems/input.js";
import { FLIPPER, GAME } from "../src/game/constants.js";

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; };

function makeScene() {
  const input = new EventEmitter();
  input.keyboard = new EventEmitter();
  input.keyboard.addCapture = () => {};
  const scene = { input, scale: { width: GAME.width }, events: new EventEmitter(), game: { events: new EventEmitter() } };
  let t = 1000;
  const clock = { advance: (ms) => { t += ms; }, now: () => t };
  const actions = createActions(scene, { now: clock.now });
  return { scene, actions, clock };
}
const key = (scene, type, code, repeat = false) => scene.input.keyboard.emit(type, { code, repeat });
const LEFT = { x: 120, y: 800 };
const RIGHT = { x: 480, y: 800 };

check("key codes map to the three actions", () => {
  for (const c of ["ArrowLeft", "KeyZ", "ShiftLeft"]) assert.equal(sideForCode(c), "left");
  for (const c of ["ArrowRight", "KeyM", "ShiftRight"]) assert.equal(sideForCode(c), "right");
  for (const c of ["Space", "ArrowDown", "Enter"]) assert.equal(sideForCode(c), "launch");
  assert.equal(sideForCode("KeyQ"), null);
});

check("touch halves drive the matching flipper, and a release across the centre releases the original", () => {
  const { scene, actions, clock } = makeScene();
  scene.input.emit("pointerdown", { id: 1, ...LEFT });
  assert.equal(actions.leftFlipperDown(), true);
  assert.equal(actions.rightFlipperDown(), false);
  scene.input.emit("pointerup", { id: 1, ...RIGHT });
  clock.advance(FLIPPER.minPressMs + 1);
  assert.equal(actions.leftFlipperDown(), false);
  assert.equal(actions.rightFlipperDown(), false);
});

check("two thumbs hold both flippers with separate lifetimes", () => {
  const { scene, actions, clock } = makeScene();
  scene.input.emit("pointerdown", { id: 1, ...LEFT });
  scene.input.emit("pointerdown", { id: 2, ...RIGHT });
  clock.advance(200);
  assert.equal(actions.leftFlipperDown(), true);
  assert.equal(actions.rightFlipperDown(), true);
  scene.input.emit("pointerup", { id: 1 });
  assert.equal(actions.leftFlipperDown(), false);
  assert.equal(actions.rightFlipperDown(), true, "releasing one finger does not release another");
  scene.input.emit("pointerupoutside", { id: 2 });
  assert.equal(actions.rightFlipperDown(), false);
});

check("touches on the HUD strip are left to the HUD", () => {
  const { scene, actions } = makeScene();
  scene.input.emit("pointerdown", { id: 5, x: 548, y: GAME.hudHeight / 2 });
  assert.equal(actions.anyHeld(), false);
  assert.equal(actions.poll().any, false);
});

check("a tap shorter than a frame still flips and still counts as press and release", () => {
  const { scene, actions, clock } = makeScene();
  key(scene, "keydown", "ArrowRight");
  key(scene, "keyup", "ArrowRight");
  assert.equal(actions.rightFlipperDown(), true, "flipper stays up for the minimum press");
  const p = actions.poll();
  assert.equal(p.right, true);
  assert.equal(p.any, true);
  assert.equal(p.released, true);
  assert.equal(actions.poll().any, false, "poll clears");
  clock.advance(FLIPPER.minPressMs + 1);
  assert.equal(actions.rightFlipperDown(), false);
});

check("held keys, key repeat and the plunger keys", () => {
  const { scene, actions } = makeScene();
  key(scene, "keydown", "Space");
  assert.equal(actions.anyHeld(), true);
  assert.equal(actions.poll().launch, true);
  key(scene, "keydown", "Space", true);
  assert.equal(actions.poll().any, false, "auto-repeat is not a new press");
  assert.equal(actions.leftFlipperDown() || actions.rightFlipperDown(), false, "Space is not a flipper");
  key(scene, "keyup", "Space");
  assert.equal(actions.anyHeld(), false);
});

check("losing focus releases everything", () => {
  const { scene, actions, clock } = makeScene();
  scene.input.emit("pointerdown", { id: 1, ...LEFT });
  key(scene, "keydown", "KeyM");
  clock.advance(200);
  scene.game.events.emit("blur");
  assert.equal(actions.leftFlipperDown(), false);
  assert.equal(actions.rightFlipperDown(), false);
  assert.equal(actions.anyHeld(), false);
});

check("R restarts once per press", () => {
  const { scene, actions } = makeScene();
  key(scene, "keydown", "KeyR");
  assert.equal(actions.restartPressed(), true);
  assert.equal(actions.restartPressed(), false);
});

check("shutdown detaches every listener", () => {
  const { scene } = makeScene();
  scene.events.emit("shutdown");
  assert.equal(scene.game.events.listenerCount("blur"), 0);
  assert.equal(scene.game.events.listenerCount("hidden"), 0);
  assert.equal(scene.input.listenerCount("pointerdown"), 0);
  assert.equal(scene.input.keyboard.listenerCount("keydown"), 0);
});

console.log(`${passed} touch and keyboard input checks passed`);
