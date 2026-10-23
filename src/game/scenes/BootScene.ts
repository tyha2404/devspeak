import * as Phaser from "phaser";

/** First scene: nothing to load yet beyond what Preload draws itself. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this.scene.start("Preload");
  }
}
