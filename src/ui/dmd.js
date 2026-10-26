// A dot-matrix score display, drawn in code. Text is set in a hand-made 5x7
// pixel font, then each lit pixel is painted as a glowing amber dot.

const FONT = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
};

export const DMD_COLS = 130;
export const DMD_ROWS = 24;

export function textWidth(text, scale = 1) {
  return text.length ? (text.length * 6 - 1) * scale : 0;
}

export function formatScore(n) {
  return Math.max(0, Math.floor(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// A frame is a Uint8Array of DMD_COLS x DMD_ROWS brightness levels (0-3).
export function createFrame() {
  return new Uint8Array(DMD_COLS * DMD_ROWS);
}

export function drawText(frame, text, x, y, { scale = 1, level = 3 } = {}) {
  let cx = Math.round(x);
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let gy = 0; gy < 7; gy += 1) {
      for (let gx = 0; gx < 5; gx += 1) {
        if (glyph[gy][gx] !== "1") continue;
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            const px = cx + gx * scale + sx;
            const py = y + gy * scale + sy;
            if (px >= 0 && px < DMD_COLS && py >= 0 && py < DMD_ROWS) frame[py * DMD_COLS + px] = level;
          }
        }
      }
    }
    cx += 6 * scale;
  }
}

export function drawCentered(frame, text, y, opts = {}) {
  drawText(frame, text, (DMD_COLS - textWidth(text, opts.scale ?? 1)) / 2, y, opts);
}

// The biggest scale at which the text still fits the display width.
export function fitScale(text, maxScale = 3) {
  for (let s = maxScale; s > 1; s -= 1) if (textWidth(text, s) <= DMD_COLS - 2) return s;
  return 1;
}

const LEVELS = ["#2a1306", "#7a3b0c", "#d9771c", "#ffb347"];

// Paint a frame onto a 2D canvas context at the given dot pitch.
export function paintFrame(ctx2d, frame, pitch, offsetX = 0, offsetY = 0) {
  const r = pitch * 0.42;
  ctx2d.fillStyle = "#0b0503";
  ctx2d.fillRect(offsetX, offsetY, DMD_COLS * pitch, DMD_ROWS * pitch);
  for (let level = 0; level < 4; level += 1) {
    ctx2d.fillStyle = LEVELS[level];
    if (level === 3) { ctx2d.shadowColor = "#ff8c1a"; ctx2d.shadowBlur = pitch * 1.4; } else { ctx2d.shadowBlur = 0; }
    ctx2d.beginPath();
    for (let i = 0; i < frame.length; i += 1) {
      if (frame[i] !== level) continue;
      const x = offsetX + (i % DMD_COLS) * pitch + pitch / 2;
      const y = offsetY + Math.floor(i / DMD_COLS) * pitch + pitch / 2;
      ctx2d.moveTo(x + r, y);
      ctx2d.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx2d.fill();
  }
  ctx2d.shadowBlur = 0;
}
