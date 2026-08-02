import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/motion/gsap';
import { PROCESS } from '../../content/site';
import { SectionLabel } from '../ui/SectionLabel';
import styles from './Process.module.css';

/** Scroll spent on each stage, as a share of the viewport height. */
const SCREENS_PER_STAGE = 0.95;

/** How much of a stage's slot is spent arriving and leaving. */
const IN = 0.4;
const OUT = 0.4;

/**
 * Our Process — five scenes rather than five rows.
 *
 * The section pins and each stage takes the screen in turn. Its animation
 * identity is **depth**: stages arrive from below, out of focus, resolve, then
 * recede upward and defocus again as the next one forms. The chapter rail on
 * the right is the only thing that persists, so the viewer always knows how
 * far through the process they are.
 */
export function Process() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const ctx = gsap.context(() => {
      const frames = gsap.utils.toArray<HTMLElement>('[data-frame]');
      const backdrops = gsap.utils.toArray<HTMLElement>('[data-backdrop]');
      const ticks = gsap.utils.toArray<HTMLElement>('[data-tick]');
      const names = gsap.utils.toArray<HTMLElement>('[data-rail-name]');
      const count = frames.length;

      // Opening state: the first scene is already here, the rest are not.
      gsap.set(frames[0], { opacity: 1, yPercent: 0, filter: 'blur(0px)' });
      gsap.set(backdrops[0], { opacity: 0.42, scale: 1 });
      gsap.set(ticks[0], { scaleX: 1, opacity: 1 });
      gsap.set(names[0], { color: '#fff', opacity: 1 });

      frames.slice(1).forEach((frame, i) => {
        gsap.set(frame, { opacity: 0, yPercent: 24, filter: 'blur(14px)' });
        gsap.set(backdrops[i + 1], { opacity: 0, scale: 1.06 });
        gsap.set(ticks[i + 1], { scaleX: 0.34, opacity: 0.22 });
        gsap.set(names[i + 1], { color: 'rgba(255,255,255,0.22)', opacity: 1 });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * SCREENS_PER_STAGE * count)}`,
          pin: stage,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          // Document order for refreshes; the hero's pin is created last.
          refreshPriority: 4,
        },
      });

      for (let i = 0; i < count; i += 1) {
        // Arrive.
        if (i > 0) {
          tl.to(
            frames[i],
            { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: IN, ease: 'power2.out' },
            i - IN / 2,
          )
            .to(
              backdrops[i],
              { opacity: 0.42, scale: 1, duration: IN * 1.6, ease: 'power1.out' },
              i - IN,
            )
            .to(ticks[i], { scaleX: 1, opacity: 1, duration: IN, ease: 'power2.out' }, i - IN / 2)
            .to(names[i], { color: '#fff', duration: IN, ease: 'none' }, i - IN / 2);
        }

        // Leave.
        if (i < count - 1) {
          tl.to(
            frames[i],
            { opacity: 0, yPercent: -24, filter: 'blur(14px)', duration: OUT, ease: 'power2.in' },
            i + 1 - OUT,
          )
            .to(backdrops[i], { opacity: 0, scale: 0.98, duration: OUT, ease: 'power1.in' }, i + 1 - OUT)
            .to(
              ticks[i],
              { scaleX: 0.34, opacity: 0.22, duration: OUT, ease: 'power2.in' },
              i + 1 - OUT,
            )
            .to(
              names[i],
              { color: 'rgba(255,255,255,0.22)', duration: OUT, ease: 'none' },
              i + 1 - OUT,
            );
        }
      }

      // Hold on Delivery before the pin releases, so the last stage gets the
      // same screen time as the four before it.
      tl.to({}, { duration: 0.7 }, count - 1);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className={`section ${styles.process}`} id="process" ref={ref}>
      <div className={styles.stage} ref={stageRef}>
        {PROCESS.stages.map((item) => (
          <div className={styles.backdrop} data-backdrop key={`bg-${item.n}`} aria-hidden="true">
            <img src={item.still} alt="" width={1600} height={900} loading="lazy" decoding="async" />
          </div>
        ))}
        <div className={styles.backdropVeil} aria-hidden="true" />

        <div className={styles.head}>
          <SectionLabel index={PROCESS.index}>{PROCESS.label}</SectionLabel>
        </div>

        <div className={styles.frames}>
          <div className={styles.frameWrap}>
            {PROCESS.stages.map((item) => (
              <article className={styles.frame} data-frame key={item.n}>
                <span className={styles.n}>{item.n}</span>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.copy}>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>

        <ol className={styles.rail} aria-hidden="true">
          {PROCESS.stages.map((item) => (
            <li className={styles.railItem} key={`rail-${item.n}`}>
              <span className={styles.railName} data-rail-name>
                {item.title}
              </span>
              <span className={styles.railTick} data-tick />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
