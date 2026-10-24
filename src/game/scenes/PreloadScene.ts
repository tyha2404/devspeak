import * as Phaser from "phaser";
import { BUILT_MAPS, mapUrl } from "../data/maps";
import { TILESETS } from "../data/tilesets";
import { REGISTRY_START, type GameStartData } from "../startData";
import { CHARACTER_SHEET, createCharacterAnims } from "../systems/characterAnims";

/** Loads every texture and the (small) Intern maps up front, then starts the world. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload() {
    const { width, height } = this.scale.gameSize;
    const bar = this.add.rectangle(width / 2 - 100, height / 2, 0, 8, 0xf2a65a).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2, 204, 12).setStrokeStyle(2, 0xf4f1de);
    this.load.on("progress", (p: number) => bar.setSize(200 * p, 8));

    for (const ts of TILESETS) this.load.image(`tiles:${ts.key}`, `/assets/tilesets/${ts.key}.png`);
    for (const key of BUILT_MAPS) this.load.tilemapTiledJSON(`map:${key}`, mapUrl(key));
    this.load.spritesheet("office-sheet", "/assets/tilesets/office.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 1,
      spacing: 2,
    });
    this.load.spritesheet(CHARACTER_SHEET, "/assets/sprites/characters.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create() {
    createCharacterAnims(this.anims);
    const start = this.registry.get(REGISTRY_START) as GameStartData;
    this.scene.start("World", start.position);
  }
}
