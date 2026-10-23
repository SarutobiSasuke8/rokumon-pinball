// Scoring and run-state checks: rules.js, state.js and the save helpers.
import assert from "node:assert/strict";
import { createRunState, loseBall } from "../src/game/state.js";
import { applyEvent, startBall, onLaunch, tick, rotateLanes, ballSaveActive, skillLaneFor } from "../src/game/rules.js";
import { RULES, GAME } from "../src/game/constants.js";
import { formatScore, textWidth } from "../src/ui/dmd.js";

const S = RULES.score;
let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`ok - ${name}`); };
const fresh = () => { const s = createRunState(1); startBall(s); s.status = "playing"; return s; };

check("a new run has 3 balls, no score and a lit kickback", () => {
  const s = createRunState(1);
  assert.equal(s.ballsRemaining, GAME.ballsPerGame);
  assert.equal(s.score, 0);
  assert.equal(s.kickbackLit, true);
  assert.equal(s.multiplier, 1);
});

check("bumpers and slings score their base values", () => {
  const s = fresh();
  assert.equal(applyEvent(s, { type: "bumper", id: "bumper-0" }).points, S.bumper);
  assert.equal(applyEvent(s, { type: "sling", id: "sling-left" }).points, S.sling);
  assert.equal(s.score, S.bumper + S.sling);
  assert.equal(s.stats.bumpers, 1);
});

check("lighting all four LAIR lanes raises the multiplier and resets the lanes", () => {
  const s = fresh();
  for (let i = 0; i < 3; i += 1) applyEvent(s, { type: "lane", id: `lane-${i}` });
  assert.deepEqual(s.lanes, [true, true, true, false]);
  const out = applyEvent(s, { type: "lane", id: "lane-3" });
  assert.equal(s.multiplier, 2);
  assert.deepEqual(s.lanes, [false, false, false, false]);
  assert.equal(out.points, S.laneLit + S.lanesComplete);
  assert.ok(out.messages.some((m) => m.text === "MULTIPLIER 2X"));
  // Multiplied scoring after that.
  assert.equal(applyEvent(s, { type: "bumper", id: "bumper-1" }).points, S.bumper * 2);
});

check("a lit lane rolled again scores the repeat value", () => {
  const s = fresh();
  applyEvent(s, { type: "lane", id: "lane-1" });
  assert.equal(applyEvent(s, { type: "lane", id: "lane-1" }).points, S.laneRepeat);
});

check("the multiplier stops at the maximum", () => {
  const s = fresh();
  for (let round = 0; round < 8; round += 1) for (let i = 0; i < 4; i += 1) applyEvent(s, { type: "lane", id: `lane-${i}` });
  assert.equal(s.multiplier, RULES.maxMultiplier);
  assert.equal(s.stats.lanesCompleted, 8);
});

check("flipping moves the lit lanes left and right", () => {
  const s = fresh();
  s.lanes = [true, false, false, true];
  rotateLanes(s, -1);
  assert.deepEqual(s.lanes, [false, false, true, true]);
  rotateLanes(s, 1);
  assert.deepEqual(s.lanes, [true, false, false, true]);
});

check("the skill shot pays only for the blinking lane, only once, only soon after launch", () => {
  const s = fresh();
  onLaunch(s);
  const lane = s.skillLane;
  const out = applyEvent(s, { type: "lane", id: `lane-${lane}` });
  assert.equal(out.points, S.skillShot + S.laneLit);
  assert.equal(s.stats.skillShots, 1);
  assert.equal(s.skillLive, false);

  const miss = fresh();
  onLaunch(miss);
  const other = (miss.skillLane + 1) % 4;
  assert.equal(applyEvent(miss, { type: "lane", id: `lane-${other}` }).points, S.laneLit);
  assert.equal(miss.skillLive, false, "any lane ends the skill shot");

  const late = fresh();
  onLaunch(late);
  tick(late, RULES.skillShotMs + 1);
  assert.equal(applyEvent(late, { type: "lane", id: `lane-${late.skillLane}` }).points, S.laneLit);
});

check("the skill lane is deterministic per seed and ball", () => {
  assert.equal(skillLaneFor(1, 1), skillLaneFor(1, 1));
  for (let b = 1; b <= 3; b += 1) assert.ok(skillLaneFor(7, b) >= 0 && skillLaneFor(7, b) < 4);
});

check("three gems wake the dragon, light the jackpot and relight the kickback", () => {
  const s = fresh();
  s.kickbackLit = false;
  applyEvent(s, { type: "target", id: "gem-0" });
  applyEvent(s, { type: "target", id: "gem-0" });
  applyEvent(s, { type: "target", id: "gem-2" });
  assert.equal(s.jackpotLit, false);
  const out = applyEvent(s, { type: "target", id: "gem-1" });
  assert.equal(s.jackpotLit, true);
  assert.equal(s.kickbackLit, true);
  assert.deepEqual(s.gems, [false, false, false]);
  assert.ok(out.messages.some((m) => m.text === "DRAGON AWAKE"));
  assert.equal(s.score, S.gem * 3 + S.gemRepeat);
});

check("the mouth pays the jackpot only while the dragon is awake", () => {
  const s = fresh();
  assert.equal(applyEvent(s, { type: "saucer", id: "mouth" }).points, S.mouth);
  s.jackpotLit = true;
  const out = applyEvent(s, { type: "saucer", id: "mouth" });
  assert.equal(out.points, S.jackpot);
  assert.ok(out.messages.some((m) => m.kind === "jackpot"));
  assert.equal(s.jackpotLit, false);
  assert.equal(s.stats.jackpots, 1);
  assert.equal(applyEvent(s, { type: "saucer", id: "mouth" }).points, S.mouth);
});

check("ball save covers the first seconds after launch, once per ball", () => {
  const s = fresh();
  assert.equal(ballSaveActive(s), false, "not before launch");
  onLaunch(s);
  tick(s, RULES.ballSaveMs - 1);
  assert.equal(ballSaveActive(s), true);
  s.ballSaved = true;
  assert.equal(ballSaveActive(s), false);
  const late = fresh();
  onLaunch(late);
  tick(late, RULES.ballSaveMs + 1);
  assert.equal(ballSaveActive(late), false);
});

check("losing balls counts down to game over and advances the ball number", () => {
  const s = fresh();
  assert.equal(loseBall(s), "ready");
  assert.equal(s.ballNumber, 2);
  assert.equal(loseBall(s), "ready");
  assert.equal(s.ballNumber, 3);
  assert.equal(loseBall(s), "gameover");
  assert.equal(s.ballsRemaining, 0);
});

check("a new ball resets the multiplier but keeps lit lanes and gems", () => {
  const s = fresh();
  s.multiplier = 3;
  s.lanes = [true, false, false, false];
  s.gems = [true, false, false];
  startBall(s);
  assert.equal(s.multiplier, 1);
  assert.deepEqual(s.lanes, [true, false, false, false]);
  assert.deepEqual(s.gems, [true, false, false]);
});

check("the score display formats numbers", () => {
  assert.equal(formatScore(1234567), "1,234,567");
  assert.equal(formatScore(0), "0");
  assert.equal(textWidth("ABC"), 17);
  assert.equal(textWidth("ABC", 2), 34);
});

// Save helpers, against an in-memory localStorage.
const store = new Map();
globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
const save = await import("../src/game/save.js");

check("top scores keep the best five, best first, and report the rank", () => {
  const data = save.loadSave();
  assert.deepEqual(save.topScoresFor(data, "dragons-lair"), []);
  assert.equal(save.recordTopScore(data, "dragons-lair", 0), 0, "zero is never listed");
  const ranks = [5000, 9000, 1000, 7000, 3000, 8000].map((n) => save.recordTopScore(data, "dragons-lair", n, "2026-10-23"));
  assert.deepEqual(ranks, [1, 1, 3, 2, 4, 2]);
  assert.deepEqual(save.topScoresFor(data, "dragons-lair").map((e) => e.score), [9000, 8000, 7000, 5000, 3000]);
  assert.equal(save.recordTopScore(data, "dragons-lair", 2000), 0, "too low to list");
  assert.equal(save.loadSave().topScores["dragons-lair"].length, 5, "persisted");
});

check("a 0.1.x save keeps its best score and gains a list and settings", () => {
  store.clear();
  store.set("rokumon-pinball:save:v1", JSON.stringify({ version: 1, owned: { "dragons-lair": true }, highScores: { "dragons-lair": 4200 } }));
  const data = save.loadSave();
  assert.equal(save.highScoreFor(data, "dragons-lair"), 4200);
  assert.deepEqual(save.topScoresFor(data, "dragons-lair").map((e) => e.score), [4200]);
  assert.equal(data.settings.muted, false);
  save.setMuted(data, true);
  assert.equal(save.loadSave().settings.muted, true);
});

check("a corrupt save falls back to defaults", () => {
  store.set("rokumon-pinball:save:v1", "{not json");
  const data = save.loadSave();
  assert.equal(data.version, 1);
  assert.deepEqual(data.highScores, {});
});

delete globalThis.window;
console.log(`${passed} rules, scoring and save checks passed`);
