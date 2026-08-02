type Listener = (veil: number) => void;

let veil = 0;
const listeners = new Set<Listener>();

/**
 * How far the page chrome should get out of the way, 0…1.
 *
 * The portal is a set piece: a full-screen brand mark with a small copy of the
 * same mark pinned in the corner reads as a mistake, and the navigation
 * competes with the one moment on the page that should hold the screen alone.
 * Sections raise this while they own the frame; the header and the brand mark
 * multiply their own opacity by it.
 */
export const chromeVeil = {
  get(): number {
    return veil;
  },

  set(next: number): void {
    const clamped = Math.min(1, Math.max(0, next));
    if (clamped === veil) return;
    veil = clamped;
    for (const listener of listeners) listener(veil);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(veil);
    return () => listeners.delete(listener);
  },
};
