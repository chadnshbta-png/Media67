import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/motion/gsap';
import { STUDIO } from '../../content/site';
import { SectionLabel } from '../ui/SectionLabel';
import styles from './Studio.module.css';

/**
 * Who We Are.
 *
 * The section's animation identity is a **focus pull**: the statement arrives
 * defocused and resolves as the viewer travels it, word by word. It is the
 * same gesture the film opens with — a lens finding its subject — which is why
 * this reads as a continuation of the hero rather than a new page.
 */
export function Studio() {
  const ref = useRef<HTMLElement>(null);
  const statementRef = useRef<HTMLHeadingElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const statement = statementRef.current;
    if (!root || !statement) return;

    const ctx = gsap.context(() => {
      const words = statement.querySelectorAll('[data-word]');

      // Out of focus, into focus. One filter on one node.
      gsap.fromTo(
        statement,
        { filter: 'blur(11px)' },
        {
          filter: 'blur(0px)',
          ease: 'none',
          scrollTrigger: { trigger: statement, start: 'top 88%', end: 'top 42%', scrub: true },
        },
      );

      // The words resolve in sequence behind that focus, so the sentence is
      // read at the pace it is scrolled rather than appearing all at once.
      gsap.fromTo(
        words,
        { opacity: 0.1, yPercent: 26 },
        {
          opacity: 1,
          yPercent: 0,
          ease: 'none',
          stagger: 0.4,
          scrollTrigger: { trigger: statement, start: 'top 84%', end: 'bottom 58%', scrub: true },
        },
      );

      // Supporting copy rises out of its own mask, a beat behind the statement.
      gsap.fromTo(
        '[data-para] > span',
        { yPercent: 105 },
        {
          yPercent: 0,
          duration: 1.25,
          stagger: 0.12,
          ease: 'expo.out',
          scrollTrigger: { trigger: '[data-body]', start: 'top 86%', once: true },
        },
      );

      // The bloom drifts a fraction of the scroll — parallax slow enough that
      // it registers as depth, not as movement.
      gsap.fromTo(
        bloomRef.current,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  const words = STUDIO.statement.split(' ');

  return (
    <section className={`section ${styles.studio}`} id="studio" ref={ref}>
      <div className={styles.bloom} ref={bloomRef} aria-hidden="true" />

      <div className="shell">
        <div className={styles.grid}>
          <SectionLabel index={STUDIO.index} className={styles.labelRow}>
            {STUDIO.label}
          </SectionLabel>

          <h2 className={styles.statement} ref={statementRef}>
            {words.map((word, i) => (
              <span className={styles.word} data-word key={`${i}-${word}`}>
                {word}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h2>

          <div className={styles.body} data-body>
            {STUDIO.body.map((paragraph) => (
              <p className={styles.para} data-para key={paragraph}>
                <span>{paragraph}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
