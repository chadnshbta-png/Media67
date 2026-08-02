export interface HeroStageState {
  /** Scroll progress through the pinned hero, 0…1. */
  progress: number;
  /** Frames in the loaded sequence — beats are derived from this. */
  total: number;
  /** True once the film is loaded and the hero is interactive. */
  ready: boolean;
  /** The film never ran: the hero is a still, and the chrome behaves plainly. */
  reduced: boolean;
}

type Listener = (state: HeroStageState) => void;

let state: HeroStageState = { progress: 0, total: 0, ready: false, reduced: false };
const listeners = new Set<Listener>();

/**
 * The hero's playhead, published for the page chrome.
 *
 * The header and the brand mark both belong to the hero's choreography — the
 * mark flies out of the film and into the navigation bar — but neither is a
 * child of the hero. Rather than give them their own ScrollTriggers, which
 * would have to be kept in lockstep with the pin by hand, they read the one
 * value the hero already computes each frame.
 */
export const heroStage = {
  get(): HeroStageState {
    return state;
  },

  update(next: Partial<HeroStageState>): void {
    state = { ...state, ...next };
    for (const listener of listeners) listener(state);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  },
};
