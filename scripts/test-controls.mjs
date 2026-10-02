import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { EventEmitter } from "node:events";

const Phaser = { Scene: class {}, Input: { Keyboard: { JustDown: (key) => { const down = !!key.justDown; key.justDown = false; return down; } } } };
function load(file, imports = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => name === "phaser" ? Phaser : imports[name] });
  return exports;
}
const { createActions } = load("../src/systems/input.js");
const input = new EventEmitter();
let keys;
input.keyboard = { addKeys: (map) => keys = Object.fromEntries(Object.keys(map).map(k => [k, { isDown: false }])) };
const events = new EventEmitter();
const gameEvents = new EventEmitter();
const actions = createActions({ input, scale: { width: 560 }, events, game: { events: gameEvents } });

input.emit("pointerdown", { id: 1, x: 100 });
input.emit("pointerup", { id: 1, x: 450 });
assert.equal(actions.leftFlipperDown(), false, "releasing across the centre releases the original flipper");
input.emit("pointerdown", { id: 1, x: 100 });
input.emit("pointerdown", { id: 2, x: 450 });
assert.equal(actions.leftFlipperDown(), true);
assert.equal(actions.rightFlipperDown(), true);
input.emit("pointerup", { id: 1, x: 450 });
assert.equal(actions.leftFlipperDown(), false);
assert.equal(actions.rightFlipperDown(), true, "releasing one finger does not release another");
input.emit("pointerupoutside", { id: 2 });
assert.equal(actions.rightFlipperDown(), false);
input.emit("pointerdown", { id: 3, x: 100 });
input.emit("pointerdown", { id: 4, x: 150 });
input.emit("pointerup", { id: 3, x: 100 });
assert.equal(actions.leftFlipperDown(), true, "two touches on the same half have separate lifetimes");
gameEvents.emit("blur");
assert.equal(actions.leftFlipperDown(), false, "focus loss releases touch controls");
keys.left.isDown = true;
assert.equal(actions.leftFlipperDown(), true, "keyboard controls still work");
keys.left.isDown = false;

const { GAME } = load("../src/game/constants.js");
const { MenuScene } = load("../src/scenes/MenuScene.js", {
  "../game/constants.js": { GAME }, "../game/tables.js": { TABLES: [{ id: "dragons-lair", name: "Dragon", colors: {} }] },
  "../game/save.js": { loadSave: () => ({}), isOwned: () => true, highScoreFor: () => 0 },
});
const node = { setOrigin() { return this; }, setStrokeStyle() { return this; }, setInteractive() { return this; }, on() { return this; } };
const keyboard = new EventEmitter();
let tableStarted = null;
const menu = { add: { text: () => node, rectangle: () => node }, input: { keyboard }, buildRow: MenuScene.prototype.buildRow, playTable: (id) => tableStarted = id };
MenuScene.prototype.create.call(menu);
keyboard.emit("keydown-SPACE");
assert.equal(tableStarted, "dragons-lair");
keyboard.removeAllListeners();
tableStarted = null;
MenuScene.prototype.create.call(menu);
keyboard.emit("keydown-SPACE");
assert.equal(tableStarted, "dragons-lair", "Space works after returning to table select");

const { GameScene } = load("../src/scenes/GameScene.js");
let restarted = null;
const context = {
  actions: { restartPressed: () => true, leftFlipperDown: () => false, rightFlipperDown: () => false, anyFlipperJustPressed: () => false },
  scene: { stop: (key) => assert.equal(key, "UI"), restart: (data) => restarted = data.tableId },
  tableId: "dragons-lair", leftFlipper: { setPressed() {}, update() {} }, rightFlipper: { setPressed() {}, update() {} },
  ball: { position: { x: 500, y: 700 } }, ballGfx: { setPosition() {} }, time: { now: 0 }, bumpers: [], targets: [], state: { status: "ready" },
};
GameScene.prototype.update.call(context, 0, 16.667);
assert.equal(restarted, "dragons-lair", "R restarts the current table");
events.emit("shutdown");
assert.equal(gameEvents.listenerCount("blur"), 0, "shutdown detaches the shared blur listener");
console.log("14 touch, keyboard and table-return checks passed");
