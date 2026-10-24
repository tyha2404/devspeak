import * as Phaser from "phaser";
import type { NpcDef } from "../data/npcs";
import type { Facing } from "../events";
import { CHARACTER_SHEET, facingFromVector, playCharacterAnim } from "../systems/characterAnims";

const WANDER_SPEED = 40;
const FACINGS: Facing[] = ["down", "left", "right", "up"];

type State =
  | { kind: "idle"; until: number }
  | { kind: "walking"; tx: number; ty: number; stuckSince: number | null }
  | { kind: "talking" };

/** NPC with a tiny brain: idle (glance around), wander (stroll near home), talking (face player). */
export class Npc extends Phaser.Physics.Arcade.Sprite {
  readonly def: NpcDef;
  private facing: Facing;
  private readonly behavior: "idle" | "wander";
  private readonly home: { x: number; y: number };
  private readonly radius: number;
  private brain: State;
  private readonly label: Phaser.GameObjects.Text;
  private readonly marker: Phaser.GameObjects.Text;
  private last = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
    def: NpcDef,
    x: number,
    y: number,
    opts: { facing: Facing; behavior: "idle" | "wander"; wanderRadius?: number },
  ) {
    super(scene, x, y, CHARACTER_SHEET, 0);
    this.def = def;
    this.facing = opts.facing;
    this.behavior = opts.behavior;
    this.home = { x, y };
    this.radius = (opts.wanderRadius ?? 2) * 16;
    this.brain = { kind: "idle", until: scene.time.now + Phaser.Math.Between(1000, 3000) };

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6).setOffset(3, 10).setImmovable(true);
    body.pushable = false;

    this.label = scene.add
      .text(x, y - 17, def.name, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#f4f1de",
        stroke: "#1b1b28",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setResolution(4);
    // "!" marks someone with something to say; M2 drives this from quests/dialogue state.
    this.marker = scene.add
      .text(x, y - 26, "!", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffd166",
        stroke: "#1b1b28",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setResolution(4);
    this.anim("idle");
  }

  setMarker(visible: boolean) {
    this.marker.setVisible(visible);
  }

  startTalking(towards: { x: number; y: number }) {
    this.brain = { kind: "talking" };
    this.setVelocity(0, 0);
    this.facing = facingFromVector(towards.x - this.x, towards.y - this.y, this.facing);
    this.anim("idle");
    this.marker.setVisible(false);
  }

  stopTalking() {
    if (this.brain.kind === "talking")
      this.brain = { kind: "idle", until: this.scene.time.now + 1500 };
  }

  tick(now: number) {
    const s = this.brain;
    if (s.kind === "idle" && now >= s.until) {
      if (this.behavior === "wander" && Math.random() < 0.6) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * this.radius;
        this.brain = {
          kind: "walking",
          tx: this.home.x + Math.cos(angle) * r,
          ty: this.home.y + Math.sin(angle) * r,
          stuckSince: null,
        };
      } else {
        this.facing = Phaser.Utils.Array.GetRandom(FACINGS);
        this.anim("idle");
        this.brain = { kind: "idle", until: now + Phaser.Math.Between(2000, 5000) };
      }
    } else if (s.kind === "walking") {
      const dx = s.tx - this.x;
      const dy = s.ty - this.y;
      const dist = Math.hypot(dx, dy);
      const moved = Math.hypot(this.x - this.last.x, this.y - this.last.y);
      if (moved < 0.2) s.stuckSince ??= now;
      else s.stuckSince = null;
      if (dist < 2 || (s.stuckSince !== null && now - s.stuckSince > 1000)) {
        this.setVelocity(0, 0);
        this.anim("idle");
        this.brain = { kind: "idle", until: now + Phaser.Math.Between(1500, 4000) };
      } else {
        this.setVelocity((dx / dist) * WANDER_SPEED, (dy / dist) * WANDER_SPEED);
        this.facing = facingFromVector(dx, dy, this.facing);
        this.anim("walk");
      }
    }
    this.last = { x: this.x, y: this.y };
    this.setDepth(10 + this.y);
    this.label.setPosition(this.x, this.y - 17).setDepth(9000);
    this.marker.setPosition(this.x, this.y - 26 + Math.sin(now / 200)).setDepth(9000);
  }

  private anim(action: "idle" | "walk") {
    playCharacterAnim(this, this.def.sprite ?? this.def.id, action, this.facing);
  }
}
