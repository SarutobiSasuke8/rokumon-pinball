import { GAME } from "./constants.js";

export function createRunState(seed = GAME.seed) {
  return {
    seed,
    score: 0,
    ballsRemaining: GAME.ballsPerGame,
    status: "ready", // ready | launched | draining | gameover
    elapsedMs: 0,
  };
}

export function snapshotRun(state) {
  return JSON.parse(JSON.stringify(state));
}

export function addScore(state, amount) {
  state.score += amount;
  return state.score;
}

export function loseBall(state) {
  state.ballsRemaining = Math.max(0, state.ballsRemaining - 1);
  state.status = state.ballsRemaining > 0 ? "ready" : "gameover";
  return state.status;
}
