import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap, ScrollTrigger, EASE } from '../../lib/motion/gsap';
import { lockScroll, unlockScroll, scrollToSection } from '../../lib/motion/scroll';
import { prefersReducedMotion } from '../../lib/usePrefersReducedMotion';
import {
  FILM,
  beatSpan,
  beatStart,
  heroScrollLength,
  type BeatName,
} from '../../lib/film/config';
import { SequenceCanvas } from '../../lib/film/SequenceCanvas';
import { heroStage } from '../../lib/film/heroStage';
import { HERO } from '../../content/site';
import { Button } from '../ui/Button';
import { IntroLoader } from './IntroLoader';
import { useFilm } from './useFilm';
import styles from './Hero.module.css';

/**
 * The hero.
 *
 * A pinned canvas the viewer scrubs through by scrolling: scroll position is
 * the playhead, forwards and backwards, with no clock anywhere in the system.
 * The typography is not laid over the film — it is cut into it, each element
 * entering on the frame where the story earns it (see BEATS).
 */
export function Hero() {
  // Decided once, before first paint. A viewer who asked for reduced motion
  // never downloads 15 MB of film to be scrubbed.
  const [runsFilm] = useState(() => !prefersReducedMotion());

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const { library, manifest, progress, ready, failed } = useFilm(runsFilm);
  // Kept mounted through its own fade — unmounting on `ready` would cut from
  // the loading screen to the film instead of dissolving between them.
  const [loaderMounted, setLoaderMounted] = useState(true);

  const lines = useMemo(() => {
    const grouped: (typeof HERO.headline)[number][][] = [[], []];
    for (const word of HERO.headline) grouped[word.line].push(word);
    return grouped;
  }, []);

  /* Hide everything the film will reveal, before the browser paints. */
  useLayoutEffect(() => {
    if (!runsFilm) return;
    const ctx = gsap.context(() => {
      gsap.set('[data-word]', { yPercent: 118, opacity: 0 });
      gsap.set([leadRef.current, ctaRef.current], { opacity: 0, y: 26 });
      gsap.set(scrimRef.current, { opacity: 0 });
    }, sectionRef);
    return () => ctx.revert();
  }, [runsFilm]);

  /* Nothing scrolls until the whole film is in memory. */
  useEffect(() => {
    if (!runsFilm || ready || failed) return;
    lockScroll();
    return unlockScroll;
  }, [runsFilm, ready, failed]);

  /* Dissolve the loader once frame one is on the canvas. */
  useEffect(() => {
    if (!ready || !loaderRef.current) return;
    const tween = gsap.to(loaderRef.current, {
      opacity: 0,
      duration: 0.9,
      ease: EASE.fade,
      onComplete: () => setLoaderMounted(false),
    });
    return () => {
      tween.kill();
    };
  }, [ready]);

  /* ------------------------------------------------------------------ */
  /* The film                                                            */
  /* ------------------------------------------------------------------ */
  useLayoutEffect(() => {
    if (!ready || !library || !manifest) return;

    const section = sectionRef.current;
    const canvasEl = canvasRef.current;
    const scrim = scrimRef.current;
    if (!section || !canvasEl || !scrim) return;

    const total = manifest.total;
    const canvas = new SequenceCanvas(canvasEl, library);
    canvas.draw(1);

    heroStage.update({ total, ready: true, reduced: false });

    const ctx = gsap.context(() => {
      const at = (name: BeatName) => beatStart(name, total);
      const span = (name: BeatName) => beatSpan(name, total);

      // Scrubbed state. The playhead is the only thing that reads as motion;
      // `presence` tracks how much typography is on screen.
      const playhead = { frame: 1 };
      const type = { presence: 0 };
      const setScrim = gsap.quickSetter(scrim, 'opacity') as (value: number) => void;

      const paint = () => {
        const index = Math.min(total, Math.max(1, Math.round(playhead.frame)));
        library.track(index);
        canvas.draw(index);

        // The cut runs from a near-black lens to a blown-out sunrise. Read the
        // frame's measured luminance so the scrim behind the type is only ever
        // as heavy as that frame actually requires — barely present through the
        // dark lens act, and never heavy enough to flatten the aerial.
        const luma = manifest.luma[index - 1] ?? 16;
        const glare = Math.min(1, Math.max(0, (luma - 45) / 135));
        setScrim(type.presence * (0.1 + 0.44 * glare));
      };

      gsap.set(cueRef.current, { opacity: 1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          id: 'hero-film',
          trigger: section,
          start: 'top top',
          end: () => `+=${heroScrollLength(total)}`,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          // The hero's pin is created last (it waits for the film) but sits
          // first in the document, and it adds ~5400px in front of every other
          // pinned section. Without an explicit order, those sections keep the
          // start positions they measured before this pin existed and activate
          // thousands of pixels early. Highest priority refreshes first.
          refreshPriority: 5,
          onUpdate: (self) => heroStage.update({ progress: self.progress }),
        },
      });

      // The film spans the entire pin. Its duration of exactly 1 is what makes
      // every beat position below a true fraction of the scroll.
      tl.to(
        playhead,
        {
          frame: total,
          duration: 1,
          ease: 'none',
          snap: { frame: 1 },
          onUpdate: paint,
        },
        0,
      );

      // The cue has done its job the instant the viewer starts scrubbing.
      tl.fromTo(
        cueRef.current,
        { opacity: 1 },
        { opacity: 0, duration: 0.022, ease: 'power1.out' },
        0.004,
      );

      // The headline assembles a word at a time, each on its own beat.
      for (const word of HERO.headline) {
        const beat = word.beat as BeatName;
        tl.fromTo(
          `[data-word="${beat}"]`,
          { yPercent: 118, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: span(beat), ease: 'power3.out' },
          at(beat),
        );
      }

      tl.fromTo(
        leadRef.current,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: span('lead'), ease: 'power2.out' },
        at('lead'),
      );

      tl.fromTo(
        ctaRef.current,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: span('cta'), ease: 'power2.out' },
        at('cta'),
      );

      // Scrim presence accumulates with the typography, never ahead of it.
      tl.to(type, { presence: 0.5, duration: span('one'), ease: 'none' }, at('one'));
      tl.to(type, { presence: 0.8, duration: span('endless'), ease: 'none' }, at('endless'));
      tl.to(type, { presence: 1, duration: span('lead'), ease: 'none' }, at('lead'));
    }, section);

    return () => {
      ctx.revert();
      canvas.dispose();
    };
  }, [ready, library, manifest]);

  /* ------------------------------------------------------------------ */
  /* Reduced motion: a still frame, everything already said              */
  /* ------------------------------------------------------------------ */
  useLayoutEffect(() => {
    if (runsFilm) return;
    const section = sectionRef.current;
    if (!section) return;

    heroStage.update({ total: FILM.total, ready: true, reduced: true, progress: 0 });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${window.innerHeight * 0.7}`,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => heroStage.update({ progress: self.progress }),
      });
    }, section);

    return () => ctx.revert();
  }, [runsFilm]);

  return (
    <section className={styles.hero} ref={sectionRef} id="hero">
      {runsFilm ? (
        <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
      ) : (
        <img
          className={styles.still}
          src="/stills/svc-photography.webp"
          alt=""
          width={1600}
          height={900}
        />
      )}

      <div className={styles.scrim} ref={scrimRef} aria-hidden="true" />

      <div className={styles.content}>
        {/* Reserves the mark's position in the film; the mark itself belongs to
            the page shell so it can leave here for the navigation bar. */}
        <div className={styles.brandSlot} id="brand-slot-hero" aria-hidden="true" />

        <h1 className={styles.headline}>
          {lines.map((line, index) => (
            <span className={styles.line} key={index}>
              {line.map((word) => (
                <span className={styles.word} key={word.beat}>
                  <span data-word={word.beat}>{word.text}</span>
                </span>
              ))}
            </span>
          ))}
        </h1>

        <p className={styles.lead} ref={leadRef}>
          {HERO.lead}
        </p>

        <div className={styles.cta} ref={ctaRef}>
          <Button size="large" onClick={() => scrollToSection('#contact')}>
            {HERO.cta}
          </Button>
        </div>
      </div>

      <div className={styles.cue} ref={cueRef} aria-hidden="true">
        <span className={styles.cueLabel}>{HERO.scrollCue}</span>
        <span className={styles.cueTrack} />
      </div>

      {runsFilm && loaderMounted && <IntroLoader ref={loaderRef} progress={progress} />}
    </section>
  );
}
