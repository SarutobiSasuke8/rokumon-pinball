import { RULES } from "./constants.js";
import { addScore } from "./state.js";

// Dragon's Lair rules. Pure functions over the run state, so scoring is unit
// tested without a browser. Each handler returns what happened, and the scene
// turns that into sound, light and screen text.
//
//  - Pop bumpers (dragon eggs) 100, slingshots 10. Everything is multiplied by
//    the playfield multiplier.
//  - L-A-I-R rollover lanes: light all four for 2,000 and +1x multiplier (max
//    5x). The flippers move the lit lanes left and right.
//  - Skill shot: the plunge lights one lane; roll through it first for 5,000.
//  - Gems: hit all three standups to wake the dragon (lights the jackpot and
//    relights the kickback).
//  - Dragon's mouth saucer: 1,000, or the 25,000 jackpot while the dragon is awake.
//  - Ball save for the first 8 seconds of each ball; the left outlane kickback
//    starts lit.

const S = RULES.score;

function result() {
  return { points: 0, messages: [], sounds: [], lights: [] };
}

function award(state, out, base) {
  const points = base * state.multiplier;
  addScore(state, points);
  out.points += points;
  return points;
}

// Simple deterministic choice of the skill-shot lane for each ball.
export function skillLaneFor(seed, ballNumber) {
  const n = Math.imul((seed | 0) ^ 0x9e3779b9, 31 + ballNumber * 17) >>> 0;
  return n % 4;
}

export function startBall(state) {
  state.multiplier = 1;
  state.ballTimeMs = 0;
  state.ballSaveUntilMs = 0;
  state.ballSaved = false;
  state.skillLane = skillLaneFor(state.seed, state.ballNumber);
  state.skillLive = false;
}

export function onLaunch(state) {
  state.ballTimeMs = 0;
  state.ballSaveUntilMs = RULES.ballSaveMs;
  state.skillLive = true;
}

export function tick(state, deltaMs) {
  state.elapsedMs += deltaMs;
  state.ballTimeMs += deltaMs;
  if (state.skillLive && state.ballTimeMs > RULES.skillShotMs) state.skillLive = false;
}

export function ballSaveActive(state) {
  return !state.ballSaved && state.ballTimeMs < state.ballSaveUntilMs;
}

// Flipper presses shift the lit rollover lanes, like a real lane change.
export function rotateLanes(state, direction) {
  const l = state.lanes;
  state.lanes = direction < 0 ? [...l.slice(1), l[0]] : [l[l.length - 1], ...l.slice(0, -1)];
  if (state.skillLive) state.skillLane = (state.skillLane + (direction < 0 ? 3 : 1)) % 4;
}

function onLane(state, index, out) {
  if (state.skillLive) {
    state.skillLive = false;
    if (index === state.skillLane) {
      award(state, out, S.skillShot);
      state.stats.skillShots += 1;
      out.messages.push({ text: "SKILL SHOT", kind: "big" });
      out.sounds.push("skill");
    }
  }
  if (state.lanes[index]) {
    award(state, out, S.laneRepeat);
    out.sounds.push("rollover");
    return;
  }
  state.lanes[index] = true;
  award(state, out, S.laneLit);
  out.sounds.push("rollover");
  if (state.lanes.every(Boolean)) {
    award(state, out, S.lanesComplete);
    state.lanes = [false, false, false, false];
    state.stats.lanesCompleted += 1;
    if (state.multiplier < RULES.maxMultiplier) {
      state.multiplier += 1;
      out.messages.push({ text: `MULTIPLIER ${state.multiplier}X`, kind: "big" });
    } else {
      out.messages.push({ text: "LAIR COMPLETE", kind: "big" });
    }
    out.sounds.push("complete");
  }
}

function onGem(state, index, out) {
  if (state.gems[index]) {
    award(state, out, S.gemRepeat);
    out.sounds.push("target");
    return;
  }
  state.gems[index] = true;
  award(state, out, S.gem);
  out.sounds.push("target");
  if (state.gems.every(Boolean)) {
    state.gems = [false, false, false];
    state.jackpotLit = true;
    state.kickbackLit = true;
    out.messages.push({ text: "DRAGON AWAKE", kind: "big" }, { text: "SHOOT THE MOUTH", kind: "small" });
    out.sounds.push("wake");
  }
}

function onMouth(state, out) {
  if (state.jackpotLit) {
    state.jackpotLit = false;
    award(state, out, S.jackpot);
    state.stats.jackpots += 1;
    out.messages.push({ text: "JACKPOT", kind: "jackpot" });
    out.sounds.push("jackpot");
  } else {
    award(state, out, S.mouth);
    out.messages.push({ text: "DRAGON'S MOUTH", kind: "small" });
    out.sounds.push("saucer");
  }
}

// Apply one physics event to the run state.
export function applyEvent(state, event) {
  const out = result();
  const index = Number(event.id?.split("-").pop());
  switch (event.type) {
    case "bumper":
      award(state, out, S.bumper);
      state.stats.bumpers += 1;
      out.sounds.push("bumper");
      if (state.skillLive) state.skillLive = false;
      break;
    case "sling":
      award(state, out, S.sling);
      out.sounds.push("sling");
      break;
    case "lane":
      onLane(state, index, out);
      break;
    case "target":
      onGem(state, index, out);
      if (state.skillLive) state.skillLive = false;
      break;
    case "saucer":
      onMouth(state, out);
      break;
    case "kickback":
      state.kickbackLit = false;
      out.messages.push({ text: "DRAGON'S BREATH", kind: "small" });
      out.sounds.push("kickback");
      break;
    default:
      break;
  }
  return out;
}
