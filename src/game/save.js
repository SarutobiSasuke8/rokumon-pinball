// Local-only save: which tables are owned and each table's high score.
// Save schema v1. No accounts, no server, no real purchases yet — buying a
// table just flips its `owned` flag in localStorage. See docs/PROJECT_BRIEF.md.
const STORAGE_KEY = "rokumon-pinball:save:v1";

function defaultSave() {
  return {
    version: 1,
    owned: { "dragons-lair": true },
    highScores: {},
    // Added in 0.2.0, still schema v1: older saves just gain these fields.
    topScores: {}, // tableId -> [{ score, date }] best first, at most TOP_N
    settings: { muted: false },
  };
}

export const TOP_N = 5;

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return defaultSave();
    const base = defaultSave();
    const save = {
      ...base,
      ...parsed,
      highScores: parsed.highScores && typeof parsed.highScores === "object" ? parsed.highScores : {},
      topScores: parsed.topScores && typeof parsed.topScores === "object" ? parsed.topScores : {},
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
    };
    // A 0.1.x save has a best score but no list yet: seed the list with it.
    for (const [tableId, best] of Object.entries(save.highScores)) {
      if (!save.topScores[tableId] && best > 0) save.topScores[tableId] = [{ score: best, date: null }];
    }
    return save;
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // localStorage unavailable (private mode, quota) — play continues, just unsaved.
  }
}

export function isOwned(save, tableId) {
  return Boolean(save.owned[tableId]);
}

export function buyTable(save, tableId) {
  save.owned[tableId] = true;
  writeSave(save);
  return save;
}

export function recordHighScore(save, tableId, score) {
  const current = save.highScores[tableId] ?? 0;
  if (score > current) {
    save.highScores[tableId] = score;
    writeSave(save);
    return true;
  }
  return false;
}

export function highScoreFor(save, tableId) {
  return save.highScores[tableId] ?? 0;
}

// Insert a finished run into the table's top-N list. Returns its 1-based rank,
// or 0 when it did not make the list. Zero scores are never listed.
export function recordTopScore(save, tableId, score, date = new Date().toISOString().slice(0, 10)) {
  if (!(score > 0)) return 0;
  const list = (save.topScores[tableId] ?? []).slice();
  let rank = list.findIndex((entry) => score > entry.score);
  if (rank === -1) rank = list.length;
  if (rank >= TOP_N) return 0;
  list.splice(rank, 0, { score, date });
  save.topScores[tableId] = list.slice(0, TOP_N);
  writeSave(save);
  return rank + 1;
}

export function topScoresFor(save, tableId) {
  return save.topScores[tableId] ?? [];
}

export function setMuted(save, muted) {
  save.settings.muted = Boolean(muted);
  writeSave(save);
}
