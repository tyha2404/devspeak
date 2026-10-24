import * as Phaser from "phaser";
import type { Facing } from "../events";
import { facingFromVector, playCharacterAnim, CHARACTER_SHEET } from "../systems/characterAnims";

export const WALK_SPEED = 80;
export const RUN_SPEED = 128;

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: Facing;

  /** Character sheet row id (cosmetic hoodies are separate rows). */
  skin: string;

  constructor(scene: Phaser.Scene, x: number, y: number, facing: Facing, skin = "player") {
    super(scene, x, y, CHARACTER_SHEET, 0);
    this.facing = facing;
    this.skin = skin;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Origin at the feet; the physics body is a small feet box so the upper body can
    // overlap furniture behind it (top-down depth illusion).
    this.setOrigin(0.5, 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6).setOffset(3, 10);
    body.setCollideWorldBounds(true);
    playCharacterAnim(this, this.skin, "idle", facing);
  }

  move(vx: number, vy: number, speed: number) {
    this.setVelocity(vx * speed, vy * speed);
    const moving = vx !== 0 || vy !== 0;
    this.facing = facingFromVector(vx, vy, this.facing);
    playCharacterAnim(this, this.skin, moving ? "walk" : "idle", this.facing);
    this.setDepth(10 + this.y);
  }

  halt() {
    this.setVelocity(0, 0);
    playCharacterAnim(this, this.skin, "idle", this.facing);
  }

  setSkin(skin: string) {
    this.skin = skin;
    playCharacterAnim(this, this.skin, "idle", this.facing);
  }

  /** Point just in front of the player's chest, used to pick an interaction target. */
  probe(): { x: number; y: number } {
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.facing];
    return { x: this.x + v[0]! * 10, y: this.y - 6 + v[1]! * 10 };
  }
}
