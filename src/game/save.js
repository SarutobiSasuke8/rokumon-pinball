// Local-only save: which tables are owned and each table's high score.
// Save schema v1. No accounts, no server, no real purchases yet — buying a
// table just flips its `owned` flag in localStorage. See docs/PROJECT_BRIEF.md.
const STORAGE_KEY = "rokumon-pinball:save:v1";

function defaultSave() {
  return {
    version: 1,
    owned: { "dragons-lair": true },
    highScores: {},
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return defaultSave();
    return { ...defaultSave(), ...parsed };
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
