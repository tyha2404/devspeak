import * as Phaser from "phaser";
import { createGameConfig } from "./config";
import { REGISTRY_START, type GameStartData } from "./startData";

export function createGame(parent: HTMLElement, start: GameStartData) {
  const game = new Phaser.Game(createGameConfig(parent));
  // Scenes boot asynchronously, so the registry is populated before Preload reads it.
  game.registry.set(REGISTRY_START, start);
  return game;
}
