import { GAME } from "./constants.js";

export function createRunState(seed = GAME.seed) {
  return {
    seed,
    score: 0,
    ballsRemaining: GAME.ballsPerGame,
    ballNumber: 1,
    status: "ready", // ready | launched | playing | gameover
    elapsedMs: 0, // time with a ball in play, for the hub's gameOver duration
    ballTimeMs: 0, // time since this ball was launched
    multiplier: 1,
    lanes: [false, false, false, false], // L A I R rollovers
    gems: [false, false, false], // gem standup targets
    jackpotLit: false,
    kickbackLit: true,
    ballSaveUntilMs: 0,
    ballSaved: false, // the ball save has been used on this ball
    skillLane: 0,
    skillLive: false,
    stats: { bumpers: 0, jackpots: 0, lanesCompleted: 0, skillShots: 0, ballsSaved: 0 },
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
  if (state.status === "ready") state.ballNumber = Math.min(GAME.ballsPerGame, state.ballNumber + 1);
  return state.status;
}
