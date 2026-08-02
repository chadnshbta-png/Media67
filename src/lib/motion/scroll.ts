import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';

let lenis: Lenis | null = null;
let locks = 0;

/**
 * Lenis drives the page; GSAP's ticker drives Lenis; ScrollTrigger reads from
 * Lenis. Wiring all three to a single clock is what keeps pinned sections
 * locked to the smoothed scroll position instead of trailing it by a frame.
 */
export function initSmoothScroll(): () => void {
  if (lenis) return () => undefined;

  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    smoothWheel: true,
    // Touch devices already have momentum scrolling; overriding it fights the OS.
    syncTouch: false,
  });

  const onScroll = () => ScrollTrigger.update();
  lenis.on('scroll', onScroll);

  const raf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(raf);
    lenis?.destroy();
    lenis = null;
    locks = 0;
  };
}

/** Freeze the page — used while the hero film is running. Re-entrant. */
export function lockScroll(): void {
  locks += 1;
  if (locks === 1) {
    lenis?.stop();
    document.documentElement.dataset.scrollLocked = 'true';
  }
}

export function unlockScroll(): void {
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    lenis?.start();
    delete document.documentElement.dataset.scrollLocked;
  }
}

export function scrollToSection(selector: string): void {
  if (lenis) lenis.scrollTo(selector, { offset: 0, duration: 1.6 });
  else document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
}
