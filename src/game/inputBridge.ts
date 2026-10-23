/**
 * Mutable joystick vector written by the React virtual joystick at pointer rate.
 * Deliberately not React state: reading it every frame must not trigger re-renders.
 */
export const inputBridge = {
  joystick: { x: 0, y: 0 },
};
