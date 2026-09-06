import Phaser from "phaser";
import { GAME, BALL, BUMPER, TARGET, PLUNGER } from "../game/constants.js";
import { getTable } from "../game/tables.js";
import { createRunState, addScore, loseBall, snapshotRun } from "../game/state.js";
import { loadSave, recordHighScore } from "../game/save.js";
import { createActions } from "../systems/input.js";
import { installDebug } from "../systems/debug.js";
import { Flipper } from "../game/flipper.js";
import { hub } from "../integrations/hub.js";

const WALL_THICKNESS = 20;
const LANE_GAP_TOP = 230; // opening above the plunger divider the ball curves through

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
    this.actions = createActions(this);
    this.ballLoaded = false;

    this.matter.world.setBounds(0, 0, GAME.width, GAME.height, WALL_THICKNESS, true, true, true, true);
    this.cameras.main.setBackgroundColor(this.table.colors.background);
    this.add.rectangle(GAME.width / 2, GAME.height / 2, GAME.width - WALL_THICKNESS * 2, GAME.height - WALL_THICKNESS * 2, this.table.colors.playfield);

    this.buildDivider();
    this.buildLaneDeflector();
    this.buildFlippers();
    this.bumpers = this.buildBumpers();
    this.targets = this.buildTargets();
    this.buildDrain();
    this.buildBall();

    this.add.text(GAME.width / 2, 40, this.table.name, {
      fontFamily: "serif",
      fontSize: "26px",
      color: Phaser.Display.Color.IntegerToColor(this.table.colors.text ?? 0xffe4b5).rgba,
    }).setOrigin(0.5);

    this.matter.world.on("collisionstart", (event) => this.onCollision(event));

    this.scene.launch("UI", { tableName: this.table.name });
    hub.ready();
    installDebug(this, () => snapshotRun(this.state));
  }

  buildDivider() {
    const dividerHeight = GAME.height - LANE_GAP_TOP - WALL_THICKNESS;
    const dividerY = LANE_GAP_TOP + dividerHeight / 2;
    this.matter.add.rectangle(PLUNGER.dividerX, dividerY, 8, dividerHeight, {
      isStatic: true,
      render: { visible: false },
      label: "divider",
    });
    this.add.rectangle(PLUNGER.dividerX, dividerY, 8, dividerHeight, this.table.colors.wall);
  }

  buildLaneDeflector() {
    // The ball launches straight up with zero horizontal velocity, so
    // nothing would ever carry it sideways out of the shooter lane without
    // this: a sloped plate over the top of the lane gap that catches the
    // rising ball and slides it left into the main playfield.
    // Rises toward the field (left) and drops toward the lane (right), so
    // its underside normal points down-and-left — the face an upward-moving
    // ball needs to hit to get kicked left instead of into the corner.
    const p1 = { x: PLUNGER.dividerX - 20, y: LANE_GAP_TOP - 60 };
    const p2 = { x: GAME.width - WALL_THICKNESS, y: LANE_GAP_TOP };
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const length = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    const angle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);
    this.matter.add.rectangle(mid.x, mid.y, length, 10, {
      isStatic: true,
      angle,
      friction: 0.02,
      label: "deflector",
    });
    this.add.rectangle(mid.x, mid.y, length, 10, this.table.colors.wall).setRotation(angle);
  }

  buildFlippers() {
    const flipperY = GAME.height - 120;
    const color = this.table.colors.flipper;
    this.leftFlipper = new Flipper(this, GAME.width / 2 - 90, flipperY, "left", color);
    this.rightFlipper = new Flipper(this, GAME.width / 2 + 90, flipperY, "right", color);
  }

  buildBumpers() {
    const positions = [
      { x: GAME.width / 2, y: 340 },
      { x: GAME.width / 2 - 110, y: 460 },
      { x: GAME.width / 2 + 110, y: 460 },
    ];
    return positions.map(({ x, y }) => {
      const body = this.matter.add.circle(x, y, BUMPER.radius, {
        isStatic: true,
        restitution: BUMPER.restitution,
        label: "bumper",
      });
      const gfx = this.add.circle(x, y, BUMPER.radius, this.table.colors.bumperUnlit);
      return { body, gfx, litUntil: 0 };
    });
  }

  buildTargets() {
    const positions = [
      { x: 70, y: 560 },
      { x: 490, y: 560 },
    ];
    return positions.map(({ x, y }) => {
      const body = this.matter.add.rectangle(x, y, TARGET.width, TARGET.height, {
        isStatic: true,
        label: "target",
      });
      const gfx = this.add.rectangle(x, y, TARGET.width, TARGET.height, this.table.colors.target);
      return { body, gfx, litUntil: 0 };
    });
  }

  buildDrain() {
    // Any ball reaching this strip past the flippers is lost, whether it
    // slipped down an outlane or straight through the centre gap. Stops
    // short of the plunger lane so a weak plunge just rolls back for
    // another try instead of costing a ball (see the lane-return check
    // in update()).
    const width = PLUNGER.dividerX - WALL_THICKNESS;
    const x = WALL_THICKNESS + width / 2;
    this.drain = this.matter.add.rectangle(x, GAME.height - 30, width, 16, {
      isStatic: true,
      isSensor: true,
      label: "drain",
    });
  }

  buildBall() {
    const x = PLUNGER.laneX;
    const y = PLUNGER.restY;
    this.ball = this.matter.add.circle(x, y, BALL.radius, {
      restitution: BALL.restitution,
      friction: BALL.friction,
      frictionAir: BALL.frictionAir,
      density: BALL.density,
      label: "ball",
    });
    this.ballGfx = this.add.circle(x, y, BALL.radius, this.table.colors.ball);
    this.ballLoaded = true;
    this.state.status = "ready";
  }

  launchBall() {
    if (!this.ballLoaded || this.state.status !== "ready") return;
    this.matter.body.setVelocity(this.ball, { x: 0, y: BALL.launchStrength });
    this.state.status = "launched";
    this.curvedThisLaunch = false;
  }

  // The deflector plate gives the rising ball a physical nudge left, but a
  // thin rotated rectangle is too fiddly to rely on alone for a guaranteed
  // exit from the lane — so once the ball clears the gap threshold, give it
  // one deterministic redirect into the field. Keeps the "curve out of the
  // shooter lane" feel reliable regardless of exact plunge strength.
  maybeCurveIntoField() {
    if (this.curvedThisLaunch) return;
    if (this.ball.position.y > LANE_GAP_TOP || this.ball.position.x < PLUNGER.dividerX) return;
    const speed = Math.max(Math.hypot(this.ball.velocity.x, this.ball.velocity.y), 8);
    this.matter.body.setVelocity(this.ball, { x: -speed * 0.6, y: -speed * 0.75 });
    this.curvedThisLaunch = true;
  }

  onCollision(event) {
    for (const pair of event.pairs) {
      const [a, b] = [pair.bodyA, pair.bodyB];
      const other = a === this.ball ? b : b === this.ball ? a : null;
      if (!other) continue;
      if (other.label === "bumper") this.hitBumper(other);
      else if (other.label === "target") this.hitTarget(other);
      else if (other.label === "drain") this.handleDrain();
    }
  }

  hitBumper(body) {
    const entry = this.bumpers.find((b) => b.body === body);
    if (!entry) return;
    addScore(this.state, BUMPER.score);
    entry.litUntil = this.time.now + BUMPER.litMs;
    entry.gfx.setFillStyle(this.table.colors.bumperLit);
    this.game.events.emit("score-changed", this.state.score);
    hub.score(this.state.score);
  }

  hitTarget(body) {
    const entry = this.targets.find((t) => t.body === body);
    if (!entry) return;
    addScore(this.state, TARGET.score);
    entry.litUntil = this.time.now + BUMPER.litMs;
    entry.gfx.setAlpha(0.5);
    this.game.events.emit("score-changed", this.state.score);
    hub.score(this.state.score);
  }

  handleDrain() {
    if (this.state.status === "ready") return; // ball settling at rest, not a real drain
    const status = loseBall(this.state);
    this.game.events.emit("balls-changed", this.state.ballsRemaining);
    this.matter.body.setPosition(this.ball, { x: PLUNGER.laneX, y: PLUNGER.restY });
    this.matter.body.setVelocity(this.ball, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(this.ball, 0);
    if (status === "gameover") {
      const isHighScore = recordHighScore(this.save, this.tableId, this.state.score);
      this.scene.stop("UI");
      hub.gameOver(this.state.score);
      this.scene.start("GameOver", { score: this.state.score, tableId: this.tableId, isHighScore });
    } else {
      this.state.status = "ready";
    }
  }

  update(_time, delta) {
    this.leftFlipper.setPressed(this.actions.leftFlipperDown());
    this.rightFlipper.setPressed(this.actions.rightFlipperDown());
    this.leftFlipper.update();
    this.rightFlipper.update();

    if (this.actions.anyFlipperJustPressed()) this.launchBall();

    this.ballGfx.setPosition(this.ball.position.x, this.ball.position.y);

    const now = this.time.now;
    for (const bumper of this.bumpers) {
      if (bumper.litUntil && now > bumper.litUntil) {
        bumper.gfx.setFillStyle(this.table.colors.bumperUnlit);
        bumper.litUntil = 0;
      }
    }
    for (const target of this.targets) {
      if (target.litUntil && now > target.litUntil) {
        target.gfx.setAlpha(1);
        target.litUntil = 0;
      }
    }

    if (this.state.status === "playing" || this.state.status === "launched") {
      this.state.elapsedMs += delta;
      this.maybeCurveIntoField();
      const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.y);
      if (speed > BALL.maxSpeed) {
        const scale = BALL.maxSpeed / speed;
        this.matter.body.setVelocity(this.ball, { x: this.ball.velocity.x * scale, y: this.ball.velocity.y * scale });
      }
      if (this.state.status === "launched" && speed > 0.5) this.state.status = "playing";

      // A weak plunge that never clears the lane gap just rolls back down
      // and comes to rest in the lane — that is a do-over, not a lost ball.
      if (this.ball.position.x > PLUNGER.dividerX && speed < 0.3) {
        this.state.status = "ready";
      }
    }
  }
}
