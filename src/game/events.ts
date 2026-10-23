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
  | "demoScreen";
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
}

export interface UiToGameEvents {
  "input:lock": { reason: InputLockReason };
  "input:unlock": void;
  "map:goto": { mapKey: MapKey; spawnId?: string };
  "npc:emote": { npcId: string; emote: Emote };
  "game:sleep": void;
  "game:wake": void;
  /** Mobile action button: same as pressing E. */
  "player:interact": void;
}

export type AllEvents = GameToUiEvents & UiToGameEvents;
