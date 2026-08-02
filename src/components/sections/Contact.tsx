import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/motion/gsap';
import { BRAND, CTA } from '../../content/site';
import { Button } from '../ui/Button';
import styles from './Contact.module.css';

/** Scroll spent on the closing shot, in viewport heights. */
const SCREENS = 2.2;

/**
 * The ending.
 *
 * Not a headline with a button under it: a last piece of film. The lens holds
 * the screen, the aperture closes to nothing, and the invitation is what is
 * left when the image has gone. The site opens by moving into a lens and ends
 * by closing one — the same gesture, run backwards.
 */
export function Contact() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const ctx = gsap.context(() => {
      gsap.set('[data-cta-line]', { yPercent: 118 });
      gsap.set(['[data-action]', '[data-foot]'], { opacity: 0, y: 22 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * SCREENS)}`,
          pin: stage,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // The camera keeps moving in, right to the last frame.
      tl.fromTo(
        '[data-plate]',
        { scale: 1, clipPath: 'circle(78% at 50% 50%)' },
        { scale: 1.14, ease: 'none', duration: 1 },
        0,
      );

      // The aperture shuts.
      tl.to(
        '[data-plate]',
        { clipPath: 'circle(0% at 50% 50%)', ease: 'power2.inOut', duration: 0.4 },
        0.3,
      );

      // On the black it leaves, the question is asked.
      tl.to(
        '[data-cta-line]',
        { yPercent: 0, duration: 0.22, stagger: 0.06, ease: 'expo.out' },
        0.62,
      )
        .to('[data-action]', { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }, 0.8)
        .to('[data-foot]', { opacity: 1, y: 0, duration: 0.15, ease: 'power2.out' }, 0.88);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className={`section ${styles.contact}`} id="contact" ref={ref}>
      <div className={styles.stage} ref={stageRef}>
        <div className={styles.plate} data-plate aria-hidden="true">
          <img src="/stills/closing.webp" alt="" width={1600} height={900} loading="lazy" />
          <div className={styles.plateVeil} />
        </div>

        <div className={styles.card}>
          <h2 className={styles.headline}>
            {CTA.headline.map((line) => (
              <span className="line-mask" key={line}>
                <span data-cta-line>{line}</span>
              </span>
            ))}
          </h2>

          <div className={styles.action} data-action>
            <Button size="large" href={`mailto:${BRAND.email}`}>
              {CTA.button}
            </Button>
            <a className={styles.email} href={`mailto:${BRAND.email}`}>
              {BRAND.email}
            </a>
          </div>
        </div>

        <footer className={styles.footer} data-foot>
          <span>
            {BRAND.name} — {BRAND.tagline}
          </span>
          <span>{BRAND.city}</span>
          <span>© {new Date().getFullYear()}</span>
        </footer>
      </div>
    </section>
  );
}
