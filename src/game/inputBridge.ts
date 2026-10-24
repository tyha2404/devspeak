/**
 * Mutable joystick vector written by the React virtual joystick at pointer rate.
 * Deliberately not React state: reading it every frame must not trigger re-renders.
 */
export const inputBridge = {
  joystick: { x: 0, y: 0 },
  /**
   * True while a React overlay is open. Source of truth for the lock: a scene created (or restarted)
   * while an overlay is already open reads it on create, because it missed the `input:lock` event.
   */
  locked: false,
};

/** True while the learner is typing in a text field: the game must ignore every key then. */
export function typingInField() {
  if (typeof document === "undefined") return false;
  const el = document.activeElement as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}
