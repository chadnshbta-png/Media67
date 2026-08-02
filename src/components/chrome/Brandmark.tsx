import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger, EASE } from '../../lib/motion/gsap';
import { scrollToSection } from '../../lib/motion/scroll';
import { beatSpan, beatStart } from '../../lib/film/config';
import { heroStage, type HeroStageState } from '../../lib/film/heroStage';
import { chromeVeil } from '../../lib/motion/chrome';
import { BRAND } from '../../content/site';
import styles from './Brandmark.module.css';

interface BrandmarkProps {
  /**
   * Force the mark to its header position regardless of the film — used when
   * the overlay menu opens, so it never floats loose in the middle of it.
   */
  docked?: boolean;
  /** Runs before the mark scrolls the page home. */
  onNavigate?: () => void;
}

interface Anchor {
  x: number;
  y: number;
  width: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Ease the travel so the mark leaves and settles rather than sliding. */
const smooth = (p: number) => p * p * (3 - 2 * p);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * One mark for the whole page.
 *
 * It fades up out of the film when the lens fills the frame, breathes once,
 * rides the hero for the rest of the cut, and then — as the film settles to
 * black — travels into the navigation bar and becomes the site's logo. It is
 * a single element throughout: there is no second copy to cross-fade with.
 *
 * Its position is derived from the hero's playhead rather than from its own
 * ScrollTrigger, so it can never drift out of sync with the pin.
 */
export function Brandmark({ docked = false, onNavigate }: BrandmarkProps) {
  const markRef = useRef<HTMLAnchorElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  /** Menu-driven dock, blended with the film-driven one by whichever is larger. */
  const override = useRef({ value: 0 });
  const render = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    const mark = markRef.current;
    const inner = innerRef.current;
    if (!mark || !inner) return;

    let hero: Anchor = { x: 0, y: 0, width: 1 };
    let nav: Anchor = { x: 0, y: 0, width: 1 };
    let state: HeroStageState = heroStage.get();
    let veil = chromeVeil.get();

    const measure = () => {
      const heroEl = document.getElementById('hero');
      const heroSlot = document.getElementById('brand-slot-hero');
      const navSlot = document.getElementById('brand-slot-nav');
      if (!heroEl || !heroSlot || !navSlot) return;

      const h = heroEl.getBoundingClientRect();
      const s = heroSlot.getBoundingClientRect();
      const n = navSlot.getBoundingClientRect();

      // Measured relative to the hero, not the viewport: while the hero is
      // pinned its box *is* the viewport, so this stays correct at any scroll
      // position and needs no scroll term of its own.
      hero = {
        x: s.left - h.left + s.width / 2,
        y: s.top - h.top + s.height / 2,
        width: s.width,
      };
      // The header is fixed, so its slot is already in viewport coordinates.
      nav = { x: n.left + n.width / 2, y: n.top + n.height / 2, width: n.width };

      mark.style.width = `${hero.width}px`;
    };

    const draw = () => {
      const { progress, total, reduced } = state;
      if (total < 2) return;

      // Reveal: the mark exists from the frame where the lens takes over.
      const revealed = reduced
        ? 1
        : clamp01((progress - beatStart('logo', total)) / beatSpan('logo', total));

      // Dock: the film-driven hand-off to the navigation bar, or the menu's.
      const filmDock = reduced
        ? progress
        : clamp01(
            (progress - beatStart('dock', total)) / (1 - beatStart('dock', total)),
          );
      const dock = Math.max(smooth(filmDock), override.current.value);

      gsap.set(mark, {
        x: lerp(hero.x, nav.x, dock),
        y: lerp(hero.y, nav.y, dock),
        scale: lerp(1, nav.width / hero.width, dock),
        xPercent: -50,
        yPercent: -50,
        // Steps aside for any section that has claimed the frame — the portal
        // shows this same mark at full screen, and two copies would be a bug.
        opacity: smooth(revealed) * (1 - veil),
      });

      // A single breath as it appears — 1 → 1.03 → 1 — on an inner node so it
      // cannot fight the transform the dock is writing to the outer one.
      gsap.set(inner, { scale: 1 + 0.03 * Math.sin(Math.PI * revealed) });

      mark.style.pointerEvents = revealed > 0.6 && veil < 0.5 ? 'auto' : 'none';
    };

    render.current = draw;

    measure();
    draw();

    const offStage = heroStage.subscribe((next) => {
      state = next;
      draw();
    });
    const offVeil = chromeVeil.subscribe((next) => {
      veil = next;
      draw();
    });

    const onRefresh = () => {
      measure();
      draw();
    };
    ScrollTrigger.addEventListener('refresh', onRefresh);

    return () => {
      offStage();
      offVeil();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      render.current = () => undefined;
    };
  }, []);

  /* The menu claims the mark for as long as it is open. */
  useEffect(() => {
    const tween = gsap.to(override.current, {
      value: docked ? 1 : 0,
      duration: 0.55,
      ease: EASE.travel,
      onUpdate: () => render.current(),
    });
    return () => {
      tween.kill();
    };
  }, [docked]);

  return (
    <a
      className={styles.mark}
      ref={markRef}
      href="#hero"
      aria-label={`${BRAND.name} — back to top`}
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.();
        scrollToSection('#hero');
      }}
    >
      <span className={styles.inner} ref={innerRef}>
        <img
          className={styles.image}
          src="/brand/logo.png"
          alt={BRAND.name}
          width={800}
          height={376}
        />
      </span>
    </a>
  );
}
