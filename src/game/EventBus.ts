import type { AllEvents } from "./events";

type Payload<K extends keyof AllEvents> = AllEvents[K] extends void ? [] : [AllEvents[K]];
type Listener = (...args: unknown[]) => void;

/**
 * Typed bridge between Phaser and React. Deliberately has no Phaser import so React
 * components can use it without pulling Phaser (which touches `window`) into SSR.
 * `on` returns its own unsubscribe.
 */
class TypedBus {
  private readonly listeners = new Map<keyof AllEvents, Set<Listener>>();

  emit<K extends keyof AllEvents>(event: K, ...payload: Payload<K>) {
    for (const fn of [...(this.listeners.get(event) ?? [])]) fn(...payload);
  }

  on<K extends keyof AllEvents>(event: K, fn: (...payload: Payload<K>) => void) {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(fn as Listener);
    return () => {
      set.delete(fn as Listener);
    };
  }
}

export const EventBus = new TypedBus();
