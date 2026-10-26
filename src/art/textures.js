import { GAME, PLUNGER } from "../game/constants.js";
import { LAYOUT } from "../game/layout.js";

// Every image in the game is drawn here, in code, once at boot. No image
// files, no licensed art. Textures are Phaser canvas textures keyed by name.

export const DRAGON = Object.freeze({ cx: 280, eyeY: 566, eyeDx: 34 });
export const LAMPS = Object.freeze({
  lanes: LAYOUT.lanes.map((l) => ({ x: l.x, y: 236, letter: l.letter })),
  multipliers: [2, 3, 4, 5].map((m, i) => ({ x: 205 + i * 50, y: 462, label: `${m}X` })),
  gems: LAYOUT.targets.map((t) => ({ x: 498, y: (t.a.y + t.b.y) / 2 })),
  jackpot: { x: 150, y: 482 },
  kickback: { x: 41, y: 812 },
  shootAgain: { x: 280, y: 868 },
});

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  draw(ctx, w, h);
  tex.refresh();
  return tex;
}

function goldGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#fff1b8");
  g.addColorStop(0.35, "#e2b33c");
  g.addColorStop(0.6, "#9a6a12");
  g.addColorStop(1, "#f5d77a");
  return g;
}

function strokeSegment(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawRail(ctx, points, width) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  };
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = width + 6;
  ctx.save();
  ctx.translate(2, 3);
  path();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#5a3b0e";
  ctx.lineWidth = width + 2;
  path();
  ctx.stroke();
  ctx.strokeStyle = "#d9a733";
  ctx.lineWidth = width - 1;
  path();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,244,200,0.75)";
  ctx.lineWidth = Math.max(1, width / 4);
  path();
  ctx.stroke();
}

function drawDragon(ctx) {
  const { cx } = DRAGON;
  ctx.save();
  // Wings: two bat wings spread behind the head.
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(dir, 1);
    const wing = ctx.createLinearGradient(0, 480, 230, 640);
    wing.addColorStop(0, "rgba(120,18,22,0.55)");
    wing.addColorStop(1, "rgba(40,6,10,0.15)");
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(30, 560);
    ctx.quadraticCurveTo(90, 470, 225, 455);
    ctx.lineTo(205, 520);
    ctx.quadraticCurveTo(175, 545, 182, 600);
    ctx.quadraticCurveTo(150, 585, 128, 615);
    ctx.quadraticCurveTo(105, 600, 82, 640);
    ctx.quadraticCurveTo(60, 610, 40, 625);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,120,60,0.22)";
    ctx.lineWidth = 2;
    for (const end of [[205, 520], [182, 600], [128, 615], [82, 640]]) {
      ctx.beginPath();
      ctx.moveTo(34, 565);
      ctx.quadraticCurveTo((34 + end[0]) / 2, 520, end[0], end[1]);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Head: a symmetric horned silhouette, front view.
  const head = ctx.createRadialGradient(cx, 560, 10, cx, 590, 120);
  head.addColorStop(0, "#5a1414");
  head.addColorStop(1, "#1c0507");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.moveTo(cx, 515);
  for (const dir of [1]) {
    ctx.bezierCurveTo(cx + 30 * dir, 512, cx + 52 * dir, 520, cx + 64 * dir, 540);
    ctx.lineTo(cx + 112 * dir, 492); // horn
    ctx.quadraticCurveTo(cx + 92 * dir, 545, cx + 72 * dir, 566);
    ctx.quadraticCurveTo(cx + 80 * dir, 600, cx + 54 * dir, 628);
    ctx.quadraticCurveTo(cx + 34 * dir, 668, cx + 20 * dir, 690);
    ctx.quadraticCurveTo(cx, 702, cx - 20 * dir, 690);
    ctx.quadraticCurveTo(cx - 34 * dir, 668, cx - 54 * dir, 628);
    ctx.quadraticCurveTo(cx - 80 * dir, 600, cx - 72 * dir, 566);
    ctx.quadraticCurveTo(cx - 92 * dir, 545, cx - 112 * dir, 492);
    ctx.lineTo(cx - 64 * dir, 540);
    ctx.bezierCurveTo(cx - 52 * dir, 520, cx - 30 * dir, 512, cx, 515);
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(230,160,60,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Brow ridges, nostrils and scales.
  ctx.strokeStyle = "rgba(255,170,80,0.35)";
  ctx.lineWidth = 3;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + 10 * dir, 548);
    ctx.quadraticCurveTo(cx + 34 * dir, 538, cx + 58 * dir, 556);
    ctx.stroke();
    ctx.fillStyle = "#0b0203";
    ctx.beginPath();
    ctx.ellipse(cx + 11 * dir, 668, 5, 8, dir * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Eyes (unlit). The awake glow is a separate runtime light.
    ctx.fillStyle = "#3a1a05";
    ctx.beginPath();
    ctx.ellipse(cx + DRAGON.eyeDx * dir, DRAGON.eyeY, 14, 7, dir * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(cx + DRAGON.eyeDx * dir, DRAGON.eyeY, 2.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,190,90,0.10)";
  for (let row = 0; row < 5; row += 1) {
    for (let i = -row; i <= row; i += 1) {
      ctx.beginPath();
      ctx.arc(cx + i * 12, 590 + row * 14, 6, 0, Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHoard(ctx, random) {
  // Gold coins spilling out under the flippers.
  for (let i = 0; i < 140; i += 1) {
    const t = random();
    const x = 120 + random() * 320;
    const y = 940 + random() * 70 - Math.abs(x - 280) * 0.08;
    const r = 5 + t * 6;
    const coin = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    coin.addColorStop(0, "#fff0a0");
    coin.addColorStop(0.5, "#c8901c");
    coin.addColorStop(1, "#6b4306");
    ctx.fillStyle = coin;
    ctx.globalAlpha = 0.35 + random() * 0.4;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, random() * 0.6 - 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLabel(ctx, text, x, y, size, color = "#f4d27a", rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.font = `700 ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText(text, 1, 2);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawInsert(ctx, x, y, shape, color, label) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "rgba(255,230,170,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (shape === "circle") ctx.arc(0, 0, 13, 0, Math.PI * 2);
  else if (shape === "diamond") { ctx.moveTo(0, -11); ctx.lineTo(13, 0); ctx.lineTo(0, 11); ctx.lineTo(-13, 0); ctx.closePath(); }
  else { ctx.moveTo(0, -16); ctx.lineTo(13, 6); ctx.lineTo(5, 6); ctx.lineTo(5, 14); ctx.lineTo(-5, 14); ctx.lineTo(-5, 6); ctx.lineTo(-13, 6); ctx.closePath(); }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  if (label) {
    ctx.font = "700 11px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,230,180,0.7)";
    ctx.fillText(label, 0, 1);
  }
  ctx.restore();
}

function drawPlayfield(ctx, w, h) {
  const random = rng(20261023);
  const top = GAME.hudHeight;
  // Deep cavern floor.
  const bg = ctx.createRadialGradient(280, 560, 60, 280, 560, 640);
  bg.addColorStop(0, "#3d1410");
  bg.addColorStop(0.55, "#1d0a0b");
  bg.addColorStop(1, "#080305");
  ctx.fillStyle = "#07040a";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  // Clip to the table outline: the arch on top, straight sides below.
  ctx.beginPath();
  ctx.arc(LAYOUT.arc.cx, LAYOUT.arc.cy, LAYOUT.arc.r, Math.PI, 0);
  ctx.lineTo(LAYOUT.arc.cx + LAYOUT.arc.r, h);
  ctx.lineTo(LAYOUT.arc.cx - LAYOUT.arc.r, h);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = bg;
  ctx.fillRect(0, top, w, h - top);
  // Stone texture: scattered cracked flagstones and speckle.
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i += 1) {
    const x = random() * w;
    const y = top + random() * (h - top);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k += 1) ctx.lineTo(x + (random() - 0.5) * 70, y + (random() - 0.5) * 70);
    ctx.stroke();
  }
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = random() > 0.5 ? "rgba(255,140,80,0.05)" : "rgba(0,0,0,0.18)";
    ctx.fillRect(random() * w, top + random() * (h - top), 2, 2);
  }
  // Ember glow from the lair below.
  const ember = ctx.createRadialGradient(280, 1000, 10, 280, 1000, 360);
  ember.addColorStop(0, "rgba(255,110,30,0.35)");
  ember.addColorStop(1, "rgba(255,110,30,0)");
  ctx.fillStyle = ember;
  ctx.fillRect(0, 600, w, 400);
  drawDragon(ctx);
  drawHoard(ctx, random);
  // Shooter lane floor.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(PLUNGER.dividerX, 404, 578 - PLUNGER.dividerX, h - 404);
  ctx.restore();

  // Title on the playfield.
  ctx.save();
  ctx.font = "700 30px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText("DRAGON'S LAIR", 282, 752);
  ctx.fillStyle = goldGradient(ctx, 180, 725, 380, 755);
  ctx.fillText("DRAGON'S LAIR", 280, 750);
  ctx.restore();

  // Inserts (unlit). Runtime lights sit on top of these.
  LAMPS.lanes.forEach((l) => drawInsert(ctx, l.x, l.y, "circle", "#ffb347", l.letter));
  LAMPS.multipliers.forEach((m) => drawInsert(ctx, m.x, m.y, "circle", "#ff6b1a", m.label));
  LAMPS.gems.forEach((g, i) => drawInsert(ctx, g.x, g.y, "diamond", ["#ff3b5c", "#2ee59d", "#4aa8ff"][i]));
  drawInsert(ctx, LAMPS.jackpot.x, LAMPS.jackpot.y, "arrow", "#ffd700");
  drawLabel(ctx, "JACKPOT", LAMPS.jackpot.x + 2, LAMPS.jackpot.y + 28, 11);
  drawInsert(ctx, LAMPS.kickback.x, LAMPS.kickback.y, "arrow", "#ff7a2a");
  drawLabel(ctx, "BREATH", LAMPS.kickback.x, LAMPS.kickback.y - 30, 10, "#f4d27a", -Math.PI / 2);
  drawInsert(ctx, LAMPS.shootAgain.x, LAMPS.shootAgain.y, "circle", "#ff3b3b");
  drawLabel(ctx, "SHOOT AGAIN", LAMPS.shootAgain.x, LAMPS.shootAgain.y + 24, 10);

  // Saucer: the dragon's mouth.
  const s = LAYOUT.saucer;
  const hole = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r + 6);
  hole.addColorStop(0, "#000");
  hole.addColorStop(0.7, "#120404");
  hole.addColorStop(1, "#5a3b0e");
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = goldGradient(ctx, s.x - 20, s.y - 20, s.x + 20, s.y + 20);
  ctx.lineWidth = 4;
  ctx.stroke();
  // Fangs around the mouth.
  ctx.fillStyle = "#f3e6c8";
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const r0 = s.r + 6;
    ctx.beginPath();
    ctx.moveTo(s.x + Math.cos(a - 0.15) * r0, s.y + Math.sin(a - 0.15) * r0);
    ctx.lineTo(s.x + Math.cos(a) * (r0 - 8), s.y + Math.sin(a) * (r0 - 8));
    ctx.lineTo(s.x + Math.cos(a + 0.15) * r0, s.y + Math.sin(a + 0.15) * r0);
    ctx.fill();
  }
  drawLabel(ctx, "MOUTH", s.x, s.y - 34, 11);

  // Lane labels and the lane mouths.
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (const l of LAYOUT.lanes) ctx.fillRect(l.x - 20, LAYOUT.laneTop, 40, LAYOUT.laneBottom - LAYOUT.laneTop);

  // Slingshots: dark bodies wrapped in white rubber.
  for (const sl of LAYOUT.slings) {
    ctx.beginPath();
    ctx.moveTo(sl.top.x, sl.top.y);
    ctx.lineTo(sl.bottom.x, sl.bottom.y);
    ctx.lineTo(sl.tip.x, sl.tip.y);
    ctx.closePath();
    const body = ctx.createLinearGradient(sl.top.x, sl.top.y, sl.tip.x, sl.tip.y);
    body.addColorStop(0, "#7d1a1f");
    body.addColorStop(1, "#3a0a0e");
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#f1ece0";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawLabel(ctx, "✦", (sl.top.x + sl.bottom.x + sl.tip.x) / 3, (sl.top.y + sl.bottom.y + sl.tip.y) / 3, 16, "#ffcf6b");
  }

  // Rails and walls, in gold.
  for (const w of LAYOUT.walls) {
    if (w.kind === "gate") continue;
    drawRail(ctx, [w.a, w.b], w.r * 2 + 2);
  }
  // Lane gate: a thin steel flap.
  const gate = LAYOUT.walls.find((w) => w.kind === "gate");
  ctx.strokeStyle = "#c9d3dd";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  strokeSegment(ctx, gate.a, gate.b);
  // Rubber posts at the guide tops.
  for (const p of [LAYOUT.guides.left[0], LAYOUT.guides.right[0], ...LAYOUT.laneGuideXs.map((x) => ({ x, y: LAYOUT.laneTop }))]) {
    ctx.fillStyle = "#f1ece0";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b33";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outlane / drain labels.
  drawLabel(ctx, "DRAIN", 280, 992, 11, "rgba(255,200,140,0.45)");

  // Vignette for depth.
  const vig = ctx.createRadialGradient(290, 560, 260, 290, 560, 700);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, top, w, h - top);
}

function drawBall(ctx, w) {
  const r = w / 2;
  const g = ctx.createRadialGradient(r * 0.7, r * 0.6, 1, r, r, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, "#e6ebf0");
  g.addColorStop(0.6, "#8b95a1");
  g.addColorStop(0.85, "#3b434c");
  g.addColorStop(1, "#1b1f24");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r - 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Warm reflection of the lair from below.
  const warm = ctx.createRadialGradient(r * 1.1, r * 1.5, 1, r * 1.1, r * 1.5, r * 0.8);
  warm.addColorStop(0, "rgba(255,150,60,0.55)");
  warm.addColorStop(1, "rgba(255,150,60,0)");
  ctx.fillStyle = warm;
  ctx.fill();
}

function drawGlow(ctx, w) {
  const r = w / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
}

function drawBumper(ctx, w, lit) {
  const c = w / 2;
  const R = 26;
  // Skirt.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(c + 3, c + 4, R + 2, 0, Math.PI * 2);
  ctx.fill();
  const rim = ctx.createLinearGradient(c - R, c - R, c + R, c + R);
  rim.addColorStop(0, "#fff1b8");
  rim.addColorStop(0.5, "#b07a14");
  rim.addColorStop(1, "#5a3b0e");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fill();
  // Dragon egg cap.
  const egg = ctx.createRadialGradient(c - 6, c - 8, 2, c, c, R - 5);
  if (lit) {
    egg.addColorStop(0, "#fffbe0");
    egg.addColorStop(0.4, "#ffb347");
    egg.addColorStop(1, "#ff4d1a");
  } else {
    egg.addColorStop(0, "#d27a3a");
    egg.addColorStop(0.5, "#8b2a12");
    egg.addColorStop(1, "#3d0d06");
  }
  ctx.fillStyle = egg;
  ctx.beginPath();
  ctx.arc(c, c, R - 5, 0, Math.PI * 2);
  ctx.fill();
  // Scale pattern.
  ctx.strokeStyle = lit ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.2;
  for (let row = -2; row <= 2; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      const x = c + col * 8 + (row % 2 ? 4 : 0);
      const y = c + row * 7;
      if (Math.hypot(x - c, y - c) > R - 9) continue;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(c - 7, c - 9, 7, 4, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlipper(ctx, w, h) {
  // Drawn pointing right, pivot at (pivotR, h/2).
  const pivotR = 13;
  const tipR = 7;
  const len = 80;
  const cy = h / 2;
  const shape = () => {
    ctx.beginPath();
    ctx.arc(pivotR, cy, pivotR, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.lineTo(pivotR + len, cy - tipR);
    ctx.arc(pivotR + len, cy, tipR, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
  };
  const body = ctx.createLinearGradient(0, cy - pivotR, 0, cy + pivotR);
  body.addColorStop(0, "#ff6a5a");
  body.addColorStop(0.45, "#a3162c");
  body.addColorStop(1, "#4a0612");
  shape();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#f1ece0";
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.stroke();
  // Gold pivot cap.
  ctx.fillStyle = goldGradient(ctx, pivotR - 6, cy - 6, pivotR + 6, cy + 6);
  ctx.beginPath();
  ctx.arc(pivotR, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  // Blade highlight.
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pivotR + 6, cy - pivotR + 5);
  ctx.lineTo(pivotR + len - 4, cy - tipR + 3);
  ctx.stroke();
}

function drawGem(ctx, w, h, color) {
  const cx = w / 2;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(cx - 4, 2, 12, h - 2);
  ctx.beginPath();
  ctx.moveTo(cx, 1);
  ctx.lineTo(w - 1, h * 0.3);
  ctx.lineTo(w - 1, h * 0.7);
  ctx.lineTo(cx, h - 1);
  ctx.lineTo(1, h * 0.7);
  ctx.lineTo(1, h * 0.3);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.3, color);
  g.addColorStop(1, "#111");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawSpark(ctx, w) {
  const r = w / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,230,1)");
  g.addColorStop(0.4, "rgba(255,200,90,0.9)");
  g.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
}

function drawShadow(ctx, w) {
  const r = w / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
}

function drawPlunger(ctx, w, h) {
  // Rod and spring, drawn top down: knob at the top.
  ctx.fillStyle = "#8a939d";
  ctx.fillRect(w / 2 - 3, 10, 6, h - 10);
  ctx.strokeStyle = "#d8dee5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = 16; y < h - 4; y += 6) {
    ctx.moveTo(w / 2 - 10, y);
    ctx.lineTo(w / 2 + 10, y + 3);
  }
  ctx.stroke();
  const knob = ctx.createLinearGradient(0, 0, w, 0);
  knob.addColorStop(0, "#5a3b0e");
  knob.addColorStop(0.5, "#f5d77a");
  knob.addColorStop(1, "#5a3b0e");
  ctx.fillStyle = knob;
  ctx.fillRect(2, 0, w - 4, 12);
}

export function generateTextures(scene) {
  canvasTexture(scene, "playfield", GAME.width, GAME.height, drawPlayfield);
  canvasTexture(scene, "ball", 24, 24, drawBall);
  canvasTexture(scene, "ball-shadow", 32, 32, drawShadow);
  canvasTexture(scene, "glow", 128, 128, drawGlow);
  canvasTexture(scene, "spark", 16, 16, drawSpark);
  canvasTexture(scene, "bumper", 64, 64, (ctx, w) => drawBumper(ctx, w, false));
  canvasTexture(scene, "bumper-lit", 64, 64, (ctx, w) => drawBumper(ctx, w, true));
  canvasTexture(scene, "flipper", 104, 30, drawFlipper);
  canvasTexture(scene, "plunger", 30, 60, drawPlunger);
  ["#ff3b5c", "#2ee59d", "#4aa8ff"].forEach((color, i) => canvasTexture(scene, `gem-${i}`, 14, 30, (ctx, w, h) => drawGem(ctx, w, h, color)));
}
