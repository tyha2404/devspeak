export type MapKey =
  | "office-floor"
  | "meeting-room"
  | "pantry"
  | "hr-room"
  | "server-room"
  | "client-office"
  | "conference-hall"
  | "rooftop";

export type Facing = "up" | "down" | "left" | "right";
export type InteractableKind =
  | "whiteboard"
  | "sprintBoard"
  | "desk"
  | "computer"
  | "coffeeMachine"
  | "noticeBoard"
  | "terminal"
  | "demoScreen"
  | "elevator";
export type Emote = "exclaim" | "question" | "heart" | "dots" | "happy";
export type InputLockReason = "dialogue" | "quiz" | "menu" | "chat";

export interface GameToUiEvents {
  "game:ready": void;
  "scene:changed": { mapKey: MapKey; spawnId?: string; x: number; y: number; facing: Facing };
  "player:moved": { mapKey: MapKey; x: number; y: number; facing: Facing };
  "npc:interact": { npcId: string };
  "object:interact": {
    objectId: string;
    kind: InteractableKind;
    label: string;
    contentId?: string;
  };
  "door:locked": { requires: string; targetMap: MapKey };
  "interaction:target": { label: string | null };
  /** Everything interactable on the current map (accessible "menu mode"). */
  "map:people": {
    npcs: { id: string; name: string }[];
    objects: { objectId: string; kind: InteractableKind; label: string }[];
  };
}

export interface UiToGameEvents {
  "input:lock": { reason: InputLockReason };
  "input:unlock": void;
  "map:goto": { mapKey: MapKey; spawnId?: string; x?: number; y?: number; facing?: Facing };
  "npc:emote": { npcId: string; emote: Emote };
  "game:sleep": void;
  "game:wake": void;
  /** Mobile action button: same as pressing E. */
  "player:interact": void;
  "player:cosmetics-changed": { avatar: string; deskItems: string[] };
  "npc:markers": { npcIds: string[] };
  /** Rank or unlocks changed: rebuild the current map with fresh start data. */
  "world:reload": void;
  /** Menu mode: interact with something without walking to it. */
  "menu:interact": { kind: "npc" | "object"; id: string };
}

export type AllEvents = GameToUiEvents & UiToGameEvents;
