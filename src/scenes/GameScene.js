import Phaser from "phaser";
import { GAME, PLUNGER, BUMPER } from "../game/constants.js";
import { LAYOUT } from "../game/layout.js";
import { getTable } from "../game/tables.js";
import { createRunState, loseBall, snapshotRun } from "../game/state.js";
import { applyEvent, startBall, onLaunch, tick, rotateLanes, ballSaveActive } from "../game/rules.js";
import { loadSave, recordHighScore, recordTopScore } from "../game/save.js";
import { createWorld, advance, launch, resetBall, ballInLane } from "../game/physics.js";
import { createActions } from "../systems/input.js";
import { installDebug } from "../systems/debug.js";
import { play } from "../systems/audio.js";
import { hub } from "../integrations/hub.js";
import { DRAGON, LAMPS } from "../art/textures.js";
import { FONT_DISPLAY, FONT_UI, formatNumber } from "../ui/widgets.js";

const ADD = Phaser.BlendModes.ADD;
const STUCK_MS = 4000;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  init(data) {
    this.tableId = data?.tableId ?? "dragons-lair";
  }

  create() {
    this.table = getTable(this.tableId);
    this.save = loadSave();
    this.state = createRunState(this.registry.get("seed") ?? GAME.seed);
    startBall(this.state);
    this.world = createWorld(LAYOUT);
    this.world.kickbackLit = this.state.kickbackLit;
    this.carry = 0;
    this.charging = false;
    this.chargeStart = 0;
    this.stillMs = 0;
    this.flipsThisGame = 0;
    this.touchDevice = this.sys.game.device.input.touch;
    this.actions = createActions(this);

    this.cameras.main.setBackgroundColor(0x07040a);
    this.add.image(0, 0, "playfield").setOrigin(0);
    this.buildLamps();
    this.buildBumpers();
    this.buildGems();
    this.buildSlingFlashes();
    this.buildPlunger();
    this.buildFlippers();
    this.buildBall();
    this.buildEffects();
    this.buildInstructions();

    this.events.on("resume", () => this.actions.clear());
    this.scene.launch("UI", { tableName: this.table.name });
    hub.ready();
    hub.score(0);
    installDebug(this, () => snapshotRun(this.state));
  }

  // ---------------------------------------------------------------- building

  lamp(x, y, color, scale = 0.5) {
    const glow = this.add.image(x, y, "glow").setTint(color).setBlendMode(ADD).setScale(scale).setAlpha(0);
    const core = this.add.image(x, y, "glow").setTint(0xffffff).setBlendMode(ADD).setScale(scale * 0.32).setAlpha(0);
    return {
      set: (on, strength = 1) => { glow.setAlpha(on ? 0.85 * strength : 0); core.setAlpha(on ? 0.35 * strength : 0); },
    };
  }

  buildLamps() {
    this.lamps = {
      lanes: LAMPS.lanes.map((l) => this.lamp(l.x, l.y, 0xffb347, 0.42)),
      multipliers: LAMPS.multipliers.map((m) => this.lamp(m.x, m.y, 0xff6b1a, 0.42)),
      gems: LAMPS.gems.map((g, i) => this.lamp(g.x, g.y, [0xff3b5c, 0x2ee59d, 0x4aa8ff][i], 0.42)),
      jackpot: this.lamp(LAMPS.jackpot.x, LAMPS.jackpot.y, 0xffd700, 0.5),
      kickback: this.lamp(LAMPS.kickback.x, LAMPS.kickback.y, 0xff7a2a, 0.45),
      shootAgain: this.lamp(LAMPS.shootAgain.x, LAMPS.shootAgain.y, 0xff3b3b, 0.45),
      mouth: this.lamp(LAYOUT.saucer.x, LAYOUT.saucer.y, 0xffd700, 0.7),
    };
    this.eyes = [-1, 1].map((dir) => this.add.image(DRAGON.cx + DRAGON.eyeDx * dir, DRAGON.eyeY, "glow")
      .setTint(0xffa21a).setBlendMode(ADD).setScale(0.42, 0.22).setAlpha(0.15));
  }

  buildBumpers() {
    // Kept as { body, ... } entries: `body` is the physics bumper, so
    // hitBumper(scene.bumpers[i].body) works as it did before the rewrite.
    this.bumpers = this.world.bumpers.map((b) => ({
      body: b,
      glow: this.add.image(b.x, b.y, "glow").setTint(0xff7a1a).setBlendMode(ADD).setScale(0.9).setAlpha(0),
      sprite: this.add.image(b.x, b.y, "bumper"),
      litUntil: 0,
    }));
  }

  buildGems() {
    this.gems = LAYOUT.targets.map((t, i) => ({
      sprite: this.add.image(t.a.x, (t.a.y + t.b.y) / 2, `gem-${i}`),
      flash: this.add.image(t.a.x, (t.a.y + t.b.y) / 2, "glow").setTint([0xff3b5c, 0x2ee59d, 0x4aa8ff][i]).setBlendMode(ADD).setScale(0.5).setAlpha(0),
    }));
  }

  buildSlingFlashes() {
    this.slingFlash = {};
    for (const s of LAYOUT.slings) {
      const g = this.add.graphics().setBlendMode(ADD).setAlpha(0);
      g.lineStyle(10, 0xffe08a, 1);
      g.lineBetween(s.top.x, s.top.y, s.tip.x, s.tip.y);
      g.lineStyle(4, 0xffffff, 1);
      g.lineBetween(s.top.x, s.top.y, s.tip.x, s.tip.y);
      this.slingFlash[s.id] = g;
    }
  }

  buildPlunger() {
    this.plunger = this.add.image(PLUNGER.laneX, PLUNGER.restY + 14, "plunger").setOrigin(0.5, 0);
    this.powerBack = this.add.rectangle(591, 990, 8, 220, 0x000000, 0.55).setOrigin(0.5, 1);
    this.powerBar = this.add.rectangle(591, 990, 6, 0, 0xffb347).setOrigin(0.5, 1);
  }

  buildFlippers() {
    const [left, right] = this.world.flippers;
    // Texture pivot sits 13 px from its left edge, vertically centred.
    this.leftFlipper = this.flipperView(left, false);
    this.rightFlipper = this.flipperView(right, true);
  }

  flipperView(f, mirrored) {
    const sprite = this.add.image(f.x, f.y, "flipper").setOrigin(13 / 104, 0.5).setFlipY(mirrored);
    // The view exposes the shape older tests read: pressed, body.angle,
    // restAngle and activeAngle.
    return {
      sprite,
      model: f,
      get pressed() { return f.pressed; },
      body: { get angle() { return f.angle; } },
      restAngle: f.restAngle,
      activeAngle: f.activeAngle,
      update() { sprite.setRotation(f.angle); },
    };
  }

  buildBall() {
    const b = this.world.ball;
    this.ballShadow = this.add.image(b.x + 4, b.y + 6, "ball-shadow").setScale(1.1);
    this.ballGlow = this.add.image(b.x, b.y, "glow").setTint(0xffc27a).setBlendMode(ADD).setScale(0.35).setAlpha(0.35);
    this.ballSprite = this.add.image(b.x, b.y, "ball");
    // Compatibility with older debug tooling: scene.ball.position.
    this.ball = { get position() { return { x: b.x, y: b.y }; }, get velocity() { return { x: b.vx, y: b.vy }; } };
  }

  buildEffects() {
    this.sparks = this.add.particles(0, 0, "spark", {
      speed: { min: 120, max: 420 },
      lifespan: { min: 250, max: 600 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 600,
      blendMode: ADD,
      emitting: false,
    });
    this.fire = this.add.particles(0, 0, "spark", {
      speed: { min: 200, max: 700 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 1200 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffd27a, 0xff7a1a, 0xff3b1a],
      blendMode: ADD,
      emitting: false,
    });
  }

  buildInstructions() {
    const launchText = this.touchDevice
      ? "TOUCH & HOLD TO PULL THE PLUNGER\nLET GO TO LAUNCH"
      : "HOLD SPACE TO PULL THE PLUNGER\nLET GO TO LAUNCH";
    const bg = this.add.graphics();
    bg.fillStyle(0x0b0503, 0.82);
    bg.fillRoundedRect(130, 596, 340, 70, 14);
    bg.lineStyle(2, 0xd9a733, 0.9);
    bg.strokeRoundedRect(130, 596, 340, 70, 14);
    const text = this.add.text(300, 631, launchText, {
      fontFamily: FONT_UI, fontSize: "17px", fontStyle: "bold", color: "#ffe9c4", align: "center", lineSpacing: 4,
    }).setOrigin(0.5);
    const arrow = this.add.text(500, 631, "➜", { fontFamily: FONT_UI, fontSize: "30px", color: "#ffb347" }).setOrigin(0.5);
    this.tweens.add({ targets: arrow, x: 512, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.launchHint = this.add.container(0, 0, [bg, text, arrow]);

    const leftHint = this.touchDevice ? "◀ TAP LEFT" : "◀ Z  or  ←";
    const rightHint = this.touchDevice ? "TAP RIGHT ▶" : "→  or  M ▶";
    const style = { fontFamily: FONT_UI, fontSize: "15px", fontStyle: "bold", color: "#ffe9c4", backgroundColor: "#0b0503cc", padding: { x: 8, y: 5 } };
    this.flipperHints = this.add.container(0, 0, [
      this.add.text(150, 988, leftHint, style).setOrigin(0.5, 1),
      this.add.text(410, 988, rightHint, style).setOrigin(0.5, 1),
    ]);
  }

  // ------------------------------------------------------------- game rules

  // Kept for the hub smoke test, which scores by calling this directly.
  hitBumper(body) {
    this.handleEvent({ type: "bumper", id: body.id });
  }

  handleEvent(ev) {
    if (this.state.status === "gameover") return;
    switch (ev.type) {
      case "drain": this.onBallDrained(); return;
      case "saucer-eject": play("eject"); this.cameras.main.shake(120, 0.004); return;
      case "flipper-hit": return;
      case "outlane": return;
      default: break;
    }
    const out = applyEvent(this.state, ev);
    if (out.points > 0) {
      this.game.events.emit("score-changed", this.state.score);
      hub.score(this.state.score);
    }
    for (const s of out.sounds) play(s);
    for (const m of out.messages) this.game.events.emit("dmd-message", m);
    this.effectsFor(ev, out);
  }

  effectsFor(ev, out) {
    const b = this.world.ball;
    if (ev.type === "bumper") {
      const entry = this.bumpers.find((x) => x.body.id === ev.id);
      if (entry) {
        entry.litUntil = this.time.now + BUMPER.litMs;
        entry.sprite.setTexture("bumper-lit");
        entry.glow.setAlpha(1);
        this.tweens.add({ targets: entry.sprite, scale: { from: 1.15, to: 1 }, duration: 140, ease: "Quad.easeOut" });
        this.sparks.explode(10, b.x, b.y);
      }
    } else if (ev.type === "sling") {
      const g = this.slingFlash[ev.id];
      if (g) { g.setAlpha(1); this.tweens.add({ targets: g, alpha: 0, duration: 180 }); }
      this.sparks.explode(5, b.x, b.y);
    } else if (ev.type === "target") {
      const gem = this.gems[Number(ev.id.split("-").pop())];
      if (gem) { gem.flash.setAlpha(1); this.tweens.add({ targets: gem.flash, alpha: 0, duration: 400 }); }
      this.sparks.explode(8, b.x, b.y);
    } else if (ev.type === "saucer") {
      this.cameras.main.shake(160, 0.006);
    } else if (ev.type === "kickback") {
      this.fire.explode(30, b.x, b.y);
      this.cameras.main.shake(200, 0.006);
    }
    if (out.messages.some((m) => m.kind === "jackpot")) {
      this.fire.explode(80, LAYOUT.saucer.x, LAYOUT.saucer.y);
      this.cameras.main.shake(450, 0.012);
      this.cameras.main.flash(250, 255, 180, 80);
    }
    if (out.points >= 500) this.popup(b.x, b.y - 20, `+${formatNumber(out.points)}`, out.points >= 5000);
  }

  popup(x, y, text, big = false) {
    const t = this.add.text(x, y, text, {
      fontFamily: FONT_DISPLAY, fontSize: big ? "30px" : "20px", fontStyle: "bold", color: big ? "#ffd700" : "#ffe9c4",
      stroke: "#2a0e06", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: big ? 1300 : 800, ease: "Quad.easeOut", onComplete: () => t.destroy() });
  }

  onBallDrained() {
    if (this.state.status === "ready" || this.state.status === "gameover") return;
    if (ballSaveActive(this.state)) {
      this.state.ballSaved = true;
      this.state.stats.ballsSaved += 1;
      this.state.status = "ready";
      resetBall(this.world, LAYOUT.ballStart.x, LAYOUT.ballStart.y);
      play("save");
      this.game.events.emit("dmd-message", { text: "BALL SAVED", kind: "big" });
      return;
    }
    play("drain");
    this.handleDrain();
  }

  handleDrain() {
    if (this.state.status === "ready" || this.state.status === "gameover") return; // settling or terminal, not a new drain
    const status = loseBall(this.state);
    this.charging = false;
    this.game.events.emit("balls-changed", this.state.ballsRemaining);
    resetBall(this.world, LAYOUT.ballStart.x, LAYOUT.ballStart.y);
    if (status === "gameover") {
      const isHighScore = recordHighScore(this.save, this.tableId, this.state.score);
      const rank = recordTopScore(this.save, this.tableId, this.state.score);
      hub.gameOver(this.state.score, Math.round(this.state.elapsedMs));
      if (isHighScore) hub.event("high-score", { tableId: this.tableId, score: this.state.score, seconds: Math.round(this.state.elapsedMs / 1000) });
      this.world.drained = true;
      this.game.events.emit("dmd-message", { text: "GAME OVER", kind: "big" });
      play("gameover");
      const data = { score: this.state.score, tableId: this.tableId, isHighScore, rank, stats: { ...this.state.stats } };
      this.time.delayedCall(1100, () => {
        this.scene.stop("UI");
        this.scene.start("GameOver", data);
      });
    } else {
      startBall(this.state);
      this.state.status = "ready";
      this.game.events.emit("dmd-message", { text: `BALL ${this.state.ballNumber}`, kind: "big" });
    }
  }

  // ------------------------------------------------------------------ frame

  update(time, delta) {
    if (this.actions.restartPressed()) {
      this.scene.stop("UI");
      this.scene.restart({ tableId: this.tableId });
      return;
    }

    const input = this.actions.poll();
    const s = this.state;
    const [lf, rf] = this.world.flippers;
    const live = s.status !== "gameover";
    const leftDown = live && this.actions.leftFlipperDown();
    const rightDown = live && this.actions.rightFlipperDown();
    if (leftDown && !lf.pressed) { play("flipper"); this.flipsThisGame += 1; if (s.status === "playing") rotateLanes(s, -1); }
    if (rightDown && !rf.pressed) { play("flipper"); this.flipsThisGame += 1; if (s.status === "playing") rotateLanes(s, 1); }
    lf.pressed = leftDown;
    rf.pressed = rightDown;

    // Plunger: any press while the ball waits starts the pull, letting go
    // of everything launches. A tap gives the lightest plunge.
    if (s.status === "ready" && ballInLane(this.world)) {
      if (!this.charging && input.any) {
        this.charging = true;
        this.chargeStart = time;
      }
      if (this.charging && !this.actions.anyHeld()) {
        const power = Math.min(1, (time - this.chargeStart) / PLUNGER.chargeMs);
        this.launchBall(power);
      }
    } else {
      this.charging = false;
    }

    this.world.kickbackLit = s.kickbackLit;
    this.carry = advance(this.world, delta / 1000, this.carry, (events) => { for (const ev of events) this.handleEvent(ev); });
    s.kickbackLit = this.world.kickbackLit;

    if (s.status === "launched" && !ballInLane(this.world)) s.status = "playing";
    if (s.status === "launched" || s.status === "playing") {
      tick(s, delta);
      this.checkStuck(delta);
    }

    this.render(time);
  }

  launchBall(power = 0) {
    if (this.state.status !== "ready") return;
    launch(this.world, power);
    this.charging = false;
    this.state.status = "launched";
    onLaunch(this.state);
    play("launch");
    this.plunger.y = PLUNGER.restY + 14;
  }

  // A ball resting somewhere it should not (wedged on a post) gets a nudge.
  checkStuck(delta) {
    const b = this.world.ball;
    if (b.held || ballInLane(this.world) || Math.hypot(b.vx, b.vy) > 30) { this.stillMs = 0; return; }
    const onFlipper = this.world.flippers.some((f) => f.pressed);
    if (onFlipper) { this.stillMs = 0; return; }
    this.stillMs += delta;
    if (this.stillMs > STUCK_MS) {
      this.stillMs = 0;
      b.vx = b.x < LAYOUT.fieldCenter ? 260 : -260;
      b.vy = -520;
      this.cameras.main.shake(120, 0.005);
      this.game.events.emit("dmd-message", { text: "NUDGE", kind: "small" });
    }
  }

  // --------------------------------------------------------------- drawing

  render(time) {
    const s = this.state;
    const b = this.world.ball;
    const pull = this.charging ? Math.min(1, (time - this.chargeStart) / PLUNGER.chargeMs) : 0;
    const ballY = b.y + (s.status === "ready" ? pull * 18 : 0);
    this.ballSprite.setPosition(b.x, ballY);
    this.ballGlow.setPosition(b.x, ballY);
    this.ballShadow.setPosition(b.x + 4, ballY + 6);
    this.ballSprite.setVisible(!b.held);
    this.ballShadow.setVisible(!b.held);
    this.ballGlow.setVisible(!b.held);
    this.plunger.y = PLUNGER.restY + 14 + pull * 18;
    this.powerBar.height = pull * 216;
    this.powerBar.fillColor = pull > 0.85 ? 0xff4d1a : 0xffb347;
    this.powerBack.setVisible(s.status === "ready");
    this.powerBar.setVisible(s.status === "ready");

    this.leftFlipper.update();
    this.rightFlipper.update();

    for (const entry of this.bumpers) {
      if (entry.litUntil && time > entry.litUntil) {
        entry.sprite.setTexture("bumper");
        entry.litUntil = 0;
      }
      if (!entry.litUntil && entry.glow.alpha > 0) entry.glow.setAlpha(Math.max(0, entry.glow.alpha - 0.08));
    }

    const blink = Math.floor(time / 180) % 2 === 0;
    const slow = Math.floor(time / 400) % 2 === 0;
    const skillShown = s.skillLive || s.status === "ready";
    s.lanes.forEach((on, i) => this.lamps.lanes[i].set(on || (skillShown && i === s.skillLane && blink)));
    this.lamps.multipliers.forEach((lamp, i) => lamp.set(s.multiplier >= i + 2));
    s.gems.forEach((on, i) => this.lamps.gems[i].set(on || slow, on ? 1 : 0.3));
    this.lamps.jackpot.set(s.jackpotLit && blink);
    this.lamps.mouth.set(s.jackpotLit, 0.5 + 0.5 * Math.sin(time / 120));
    this.lamps.kickback.set(s.kickbackLit, slow ? 1 : 0.6);
    this.lamps.shootAgain.set(ballSaveActive(s) && s.status !== "ready" && blink);
    const eyeAlpha = s.jackpotLit ? 0.75 + 0.25 * Math.sin(time / 90) : 0.12 + 0.06 * Math.sin(time / 700);
    for (const eye of this.eyes) eye.setAlpha(eyeAlpha);

    const waiting = s.status === "ready" && ballInLane(this.world);
    this.launchHint.setVisible(waiting && !this.charging);
    this.flipperHints.setVisible(s.ballNumber === 1 && this.flipsThisGame < 6 && s.status !== "gameover");
  }
}
