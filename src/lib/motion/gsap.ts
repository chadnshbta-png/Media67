import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The house eases. Everything on this site uses one of four curves so that
 * unrelated elements still feel like they belong to the same camera move.
 */
export const EASE = {
  /** Entrances. Fast departure, long settle — reads as weight, not bounce. */
  reveal: 'expo.out',
  /** Anything that travels between two known positions. */
  travel: 'power3.inOut',
  /** Opacity-only changes, where an aggressive curve would look like a flicker. */
  fade: 'power2.out',
  /** Scroll-scrubbed values, which must stay linear against the wheel. */
  scrub: 'none',
} as const;

export const DURATION = {
  fast: 0.45,
  base: 0.9,
  slow: 1.4,
  film: 2.6,
} as const;

gsap.defaults({ ease: EASE.reveal, duration: DURATION.base });

export { gsap, ScrollTrigger };
