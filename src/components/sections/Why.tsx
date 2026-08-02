import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/motion/gsap';
import { WHY } from '../../content/site';
import { SectionLabel } from '../ui/SectionLabel';
import styles from './Why.module.css';

/** Scroll spent on each statement, as a share of the viewport height. */
const SCREENS_PER_MOMENT = 0.9;

const IN = 0.45;
const OUT = 0.45;

/**
 * Why Media Six Seven.
 *
 * Three values, each given the whole screen in turn. A value arrives slightly
 * small with its words still masked, opens, holds alone, and then scales past
 * the viewer as the next one takes its place — so the section reads as three
 * statements made, not three boxes listed.
 */
export function Why() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const ctx = gsap.context(() => {
      const moments = gsap.utils.toArray<HTMLElement>('[data-moment]');
      const pick = (el: HTMLElement, selector: string) =>
        el.querySelector<HTMLElement>(selector) as HTMLElement;

      const titles = moments.map((m) => pick(m, '[data-title]'));
      const copies = moments.map((m) => pick(m, '[data-copy]'));
      const ghosts = moments.map((m) => pick(m, '[data-ghost]'));
      const ticks = gsap.utils.toArray<HTMLElement>('[data-tick]');
      const count = moments.length;

      // The first statement is already made; the rest are waiting.
      gsap.set(moments[0], { opacity: 1, scale: 1 });
      gsap.set(titles[0], { yPercent: 0 });
      gsap.set(copies[0], { opacity: 1, y: 0 });
      gsap.set(ghosts[0], { scale: 1 });
      gsap.set(ticks[0], { scaleX: 1, opacity: 1 });

      moments.slice(1).forEach((moment, i) => {
        gsap.set(moment, { opacity: 0, scale: 0.92 });
        gsap.set(titles[i + 1], { yPercent: 118 });
        gsap.set(copies[i + 1], { opacity: 0, y: 22 });
        gsap.set(ghosts[i + 1], { scale: 1.14 });
        gsap.set(ticks[i + 1], { scaleX: 0.28, opacity: 0.2 });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * SCREENS_PER_MOMENT * count)}`,
          pin: stage,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: 1,
        },
      });

      for (let i = 0; i < count; i += 1) {
        if (i > 0) {
          tl.to(moments[i], { opacity: 1, scale: 1, duration: IN, ease: 'power2.out' }, i - IN / 2)
            .to(titles[i], { yPercent: 0, duration: IN * 1.35, ease: 'expo.out' }, i - IN / 2)
            .to(copies[i], { opacity: 1, y: 0, duration: IN, ease: 'power2.out' }, i - IN / 4)
            .to(ghosts[i], { scale: 1, duration: IN * 2, ease: 'power1.out' }, i - IN)
            .to(ticks[i], { scaleX: 1, opacity: 1, duration: IN, ease: 'power2.out' }, i - IN / 2);
        }

        if (i < count - 1) {
          // Scales up as it goes, so the viewer passes through the statement
          // rather than watching it slide away.
          tl.to(
            moments[i],
            { opacity: 0, scale: 1.09, duration: OUT, ease: 'power2.in' },
            i + 1 - OUT,
          )
            .to(ghosts[i], { scale: 0.9, duration: OUT, ease: 'power2.in' }, i + 1 - OUT)
            .to(
              ticks[i],
              { scaleX: 0.28, opacity: 0.2, duration: OUT, ease: 'power2.in' },
              i + 1 - OUT,
            );
        }
      }

      tl.to({}, { duration: 0.65 }, count - 1);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className={`section ${styles.why}`} id="why" ref={ref}>
      <div className={styles.stage} ref={stageRef}>
        <div className={styles.head}>
          <SectionLabel index={WHY.index}>{WHY.label}</SectionLabel>
        </div>

        <div className={styles.moments}>
          {WHY.points.map((point, i) => (
            <article className={styles.moment} data-moment key={point.title}>
              <span className={styles.ghost} data-ghost aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className={styles.mask}>
                <span className={styles.title} data-title>
                  {point.title}
                </span>
              </h3>
              <p className={styles.copy} data-copy>
                {point.copy}
              </p>
            </article>
          ))}
        </div>

        <div className={styles.rail} aria-hidden="true">
          {WHY.points.map((point) => (
            <span className={styles.tick} data-tick key={`tick-${point.title}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
