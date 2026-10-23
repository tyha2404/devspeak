import * as Phaser from "phaser";
import { NPCS } from "../data/npcs";
import { TILESETS, TILESET_MARGIN, TILESET_SPACING, TILE_SIZE } from "../data/tilesets";
import { RUN_SPEED, WALK_SPEED, Player } from "../entities/Player";
import { Npc } from "../entities/Npc";
import { EventBus } from "../EventBus";
import type { Facing, InteractableKind, MapKey } from "../events";
import { inputBridge } from "../inputBridge";
import { REGISTRY_START, type GameStartData } from "../startData";

export interface WorldData {
  mapKey: MapKey;
  spawnId?: string;
  x?: number;
  y?: number;
  facing?: Facing;
}

type Target =
  | { kind: "npc"; npc: Npc; label: string }
  | {
      kind: "object";
      rect: Phaser.Geom.Rectangle;
      objectId: string;
      objectKind: InteractableKind;
      label: string;
      contentId?: string;
    }
  | {
      kind: "lockedDoor";
      rect: Phaser.Geom.Rectangle;
      requires: string;
      targetMap: MapKey;
      label: string;
    };

type TiledObj = Phaser.Types.Tilemaps.TiledObject;

const DEPTH = {
  Ground: 0,
  GroundDecor: 1,
  Walls: 2,
  Furniture: 3,
  Decor: 4,
  Above: 100_000,
} as const;
const NPC_RANGE = 22;
const RECT_RANGE = 12;

const prop = <T = string>(o: TiledObj, name: string): T | undefined =>
  (o.properties as { name: string; value: unknown }[] | undefined)?.find((p) => p.name === name)
    ?.value as T | undefined;

const requiresLabel = (requires: string) => {
  const [kind, value] = requires.split(":");
  if (kind === "rank" && value) return value[0]!.toUpperCase() + value.slice(1);
  return requires;
};

/**
 * Single parameterised world scene: maps are Tiled data, and player/camera/input code exists once.
 * Map changes go through `scene.restart(newData)`.
 */
export class WorldScene extends Phaser.Scene {
  private mapKey!: MapKey;
  private start!: GameStartData;
  private player!: Player;
  private npcs: Npc[] = [];
  private targets: Target[] = [];
  private target: Target | null = null;
  private talkingTo: Npc | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private keys!: Record<
    "up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "shift",
    Phaser.Input.Keyboard.Key
  >;
  private inputLocked = false;
  private transitioning = false;
  private lastMoveEmit = { x: 0, y: 0, at: 0 };
  private cleanups: (() => void)[] = [];

  constructor() {
    super("World");
  }

  init(data: WorldData) {
    this.mapKey = data.mapKey;
    this.start = this.registry.get(REGISTRY_START) as GameStartData;
    this.npcs = [];
    this.targets = [];
    this.target = null;
    this.talkingTo = null;
    this.inputLocked = false;
    this.transitioning = false;
  }

  create(data: WorldData) {
    const map = this.make.tilemap({ key: `map:${this.mapKey}` });
    const tilesets = TILESETS.map((ts) =>
      map.addTilesetImage(
        ts.name,
        `tiles:${ts.key}`,
        TILE_SIZE,
        TILE_SIZE,
        TILESET_MARGIN,
        TILESET_SPACING,
      )!,
    );
    for (const [name, depth] of Object.entries(DEPTH))
      map.createLayer(name, tilesets)?.setDepth(depth);
    const collision = map.createLayer("Collision", tilesets)!.setVisible(false);
    collision.setCollisionByExclusion([-1]);

    const worldW = map.widthInPixels;
    const worldH = map.heightInPixels;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    if (this.start.debug) this.physics.world.createDebugGraphic();

    // ----- player -----
    const objects = (layer: string) => map.getObjectLayer(layer)?.objects ?? [];
    const spawns = objects("Spawns");
    const spawn =
      spawns.find((s) => s.name === data.spawnId) ??
      spawns.find((s) => s.name === "default") ??
      spawns[0]!;
    let px = spawn.x!;
    let py = spawn.y! + TILE_SIZE / 2;
    if (data.x !== undefined && data.y !== undefined && !data.spawnId) {
      // Restored position; fall back to the spawn if map edits moved a wall onto it.
      const tile = collision.getTileAtWorldXY(data.x, data.y - 2);
      if (!tile && data.x > 0 && data.y > 0 && data.x < worldW && data.y < worldH) {
        px = data.x;
        py = data.y;
      }
    }
    this.player = new Player(this, px, py, data.facing ?? "down");
    this.physics.add.collider(this.player, collision);

    // ----- NPCs (only those unlocked for this learner) -----
    for (const o of objects("NPCs")) {
      const def = NPCS[prop(o, "npcId") ?? ""];
      if (!def || def.unlockLevel > this.start.level) continue;
      if (def.unlockRank && !this.start.unlocks.includes(`rank:${def.unlockRank}`)) continue;
      const npc = new Npc(this, def, o.x!, o.y! + TILE_SIZE / 2, {
        facing: (prop<Facing>(o, "facing") ?? "down") as Facing,
        behavior: prop<"idle" | "wander">(o, "behavior") ?? "idle",
        wanderRadius: prop<number>(o, "wanderRadius"),
      });
      this.physics.add.collider(npc, collision);
      this.physics.add.collider(this.player, npc);
      this.npcs.push(npc);
      this.targets.push({ kind: "npc", npc, label: `Talk to ${def.name}` });
    }

    // ----- doors -----
    for (const o of objects("Doors")) {
      const rect = new Phaser.Geom.Rectangle(o.x!, o.y!, o.width!, o.height!);
      const targetMap = prop<MapKey>(o, "targetMap")!;
      const requires = prop(o, "requires");
      const zone = this.add.zone(rect.centerX, rect.centerY, rect.width, rect.height);
      if (requires && !this.start.unlocks.includes(requires)) {
        this.physics.add.existing(zone, true);
        this.physics.add.collider(this.player, zone);
        this.targets.push({
          kind: "lockedDoor",
          rect,
          requires,
          targetMap,
          label: `Locked · cần ${requiresLabel(requires)}`,
        });
      } else {
        this.physics.add.existing(zone, true);
        this.physics.add.overlap(this.player, zone, () =>
          this.goTo({ mapKey: targetMap, spawnId: prop(o, "targetSpawn") }),
        );
      }
    }

    // ----- interactables -----
    for (const o of objects("Interactables")) {
      this.targets.push({
        kind: "object",
        rect: new Phaser.Geom.Rectangle(o.x!, o.y!, o.width!, o.height!),
        objectId: prop(o, "objectId")!,
        objectKind: prop<InteractableKind>(o, "kind")!,
        label: prop(o, "label") ?? "Interact",
        contentId: prop(o, "contentId"),
      });
    }

    this.prompt = this.add
      .text(0, 0, "E", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#1b1b28",
        backgroundColor: "#f4f1de",
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(DEPTH.Above + 1)
      .setVisible(false);

    // ----- input -----
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: "UP",
      down: "DOWN",
      left: "LEFT",
      right: "RIGHT",
      w: "W",
      a: "A",
      s: "S",
      d: "D",
      shift: "SHIFT",
    }) as typeof this.keys;
    // Keydown events rather than JustDown polling: a tap whose down and up land in the same
    // frame would otherwise be lost.
    for (const key of ["E", "SPACE", "ENTER"]) kb.on(`keydown-${key}`, () => this.interact());

    // ----- camera -----
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.12, 0.12);
    this.applyZoom();
    this.scale.on("resize", this.applyZoom, this);
    cam.fadeIn(250);

    this.cleanups.push(
      EventBus.on("input:lock", () => this.lockInput()),
      EventBus.on("input:unlock", () => this.unlockInput()),
      EventBus.on("player:interact", () => this.interact()),
      EventBus.on("map:goto", (d) => this.goTo(d)),
      EventBus.on("game:sleep", () => this.game.loop.sleep()),
      EventBus.on("game:wake", () => this.game.loop.wake()),
    );
    // scene.restart re-runs create(); without this, bus listeners would stack per map change.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.applyZoom, this);
      for (const off of this.cleanups.splice(0)) off();
    });

    EventBus.emit("scene:changed", {
      mapKey: this.mapKey,
      spawnId: data.spawnId,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.player.facing,
    });
    if (this.start.e2e) this.exposeTestHooks();
    EventBus.emit("game:ready");
  }

  update(time: number) {
    for (const npc of this.npcs) npc.tick(time);
    if (this.inputLocked || this.transitioning) return;

    const v = this.readInputVector();
    const running =
      this.keys.shift.isDown || Math.hypot(inputBridge.joystick.x, inputBridge.joystick.y) > 0.9;
    this.player.move(v.x, v.y, running ? RUN_SPEED : WALK_SPEED);

    this.updateTarget(time);
    this.emitMovedThrottled(time);
  }

  private readInputVector() {
    const k = this.keys;
    let x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    if (x === 0 && y === 0) {
      const j = inputBridge.joystick;
      if (Math.hypot(j.x, j.y) > 0.15) ({ x, y } = j);
    }
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  private updateTarget(time: number) {
    const p = this.player.probe();
    let best: { t: Target; d: number } | null = null;
    for (const t of this.targets) {
      let d: number;
      if (t.kind === "npc") {
        d = Phaser.Math.Distance.Between(p.x, p.y, t.npc.x, t.npc.y - 8) - (NPC_RANGE - RECT_RANGE);
      } else {
        const cx = Phaser.Math.Clamp(p.x, t.rect.left, t.rect.right);
        const cy = Phaser.Math.Clamp(p.y, t.rect.top, t.rect.bottom);
        d = Phaser.Math.Distance.Between(p.x, p.y, cx, cy);
      }
      if (d <= RECT_RANGE && (!best || d < best.d)) best = { t, d };
    }
    const next = best?.t ?? null;
    if (next !== this.target) {
      this.target = next;
      EventBus.emit("interaction:target", { label: next?.label ?? null });
    }
    this.prompt.setVisible(!!next);
    if (next) {
      const at =
        next.kind === "npc"
          ? { x: next.npc.x, y: next.npc.y - 28 }
          : { x: next.rect.centerX, y: next.rect.top - 2 };
      this.prompt.setPosition(at.x, at.y + Math.sin(time / 150));
    }
  }

  private interact() {
    const t = this.target;
    if (this.inputLocked || this.transitioning || !t) return;
    if (t.kind === "npc") {
      t.npc.startTalking(this.player);
      this.talkingTo = t.npc;
      EventBus.emit("npc:interact", { npcId: t.npc.def.id });
    } else if (t.kind === "object") {
      EventBus.emit("object:interact", {
        objectId: t.objectId,
        kind: t.objectKind,
        label: t.label,
        contentId: t.contentId,
      });
    } else {
      EventBus.emit("door:locked", { requires: t.requires, targetMap: t.targetMap });
    }
  }

  private goTo(to: { mapKey: MapKey; spawnId?: string }) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.halt();
    this.cameras.main.fadeOut(250);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapKey: to.mapKey, spawnId: to.spawnId } satisfies WorldData);
    });
  }

  private emitMovedThrottled(time: number) {
    const { x, y } = this.player;
    if (time - this.lastMoveEmit.at < 500) return;
    if (Phaser.Math.Distance.Between(x, y, this.lastMoveEmit.x, this.lastMoveEmit.y) < 8) return;
    this.lastMoveEmit = { x, y, at: time };
    EventBus.emit("player:moved", {
      mapKey: this.mapKey,
      x: Math.round(x),
      y: Math.round(y),
      facing: this.player.facing,
    });
  }

  private lockInput() {
    this.inputLocked = true;
    this.player.halt();
    const kb = this.input.keyboard!;
    // Without this Phaser keeps preventDefault on Space/arrows and learners can't type spaces.
    kb.disableGlobalCapture();
    kb.enabled = false;
    this.input.enabled = false;
  }

  private unlockInput() {
    const kb = this.input.keyboard!;
    kb.enabled = true;
    kb.enableGlobalCapture();
    // A key held while the overlay was open would otherwise keep the player walking.
    kb.resetKeys();
    this.input.enabled = true;
    this.talkingTo?.stopTalking();
    this.talkingTo = null;
    // Short cooldown so the key that closed the overlay doesn't immediately re-open it.
    this.time.delayedCall(250, () => {
      this.inputLocked = false;
    });
  }

  /** Playwright hooks: canvas pixel-hunting is brittle, so tests teleport instead of walking. */
  private exposeTestHooks() {
    (window as unknown as { __dq: unknown }).__dq = {
      mapKey: this.mapKey,
      teleport: (tileX: number, tileY: number, facing: Facing = "down") => {
        this.player.setPosition(tileX * TILE_SIZE + TILE_SIZE / 2, (tileY + 1) * TILE_SIZE);
        this.player.facing = facing;
        this.player.move(0, 0, 0);
      },
      player: () => ({ x: this.player.x, y: this.player.y, facing: this.player.facing }),
      npcs: () => this.npcs.map((n) => n.def.id),
    };
  }

  private applyZoom() {
    const { width, height } = this.scale.gameSize;
    // Integer zoom keeps pixels crisp; the short side always shows >= 12 tiles.
    const zoom = Phaser.Math.Clamp(Math.floor(Math.min(width, height) / 192), 2, 6);
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    // Rooms smaller than the viewport are centred instead of pinned to the top-left.
    const worldW = this.physics.world.bounds.width;
    const worldH = this.physics.world.bounds.height;
    const viewW = width / zoom;
    const viewH = height / zoom;
    const bx = viewW > worldW ? (worldW - viewW) / 2 : 0;
    const by = viewH > worldH ? (worldH - viewH) / 2 : 0;
    cam.setBounds(bx, by, Math.max(worldW, viewW), Math.max(worldH, viewH));
  }
}
