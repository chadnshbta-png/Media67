import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, EASE } from '../../lib/motion/gsap';
import { SERVICES } from '../../content/site';
import { SectionLabel } from '../ui/SectionLabel';
import styles from './Services.module.css';

/** Only devices with a real cursor get the tracked still. */
const POINTER_QUERY = '(hover: hover) and (min-width: 861px)';

/** Degrees of lean the still takes from the cursor's horizontal speed. */
const MAX_TILT = 7;

/** Parallax of the image inside its own frame, in percent. */
const INNER_SHIFT = 6;

/**
 * Services.
 *
 * Animation identity: **line reveal** — each service is a rule that draws
 * itself and a title that rises out of a mask, so the list builds like credits.
 *
 * On hover, the still does not simply appear: it leans into the direction the
 * cursor is travelling and its image drifts inside its own frame, so the plate
 * reads as a physical object being carried rather than a tooltip.
 */
export function Services() {
  const ref = useRef<HTMLElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const motion = useRef<{
    x?: (v: number) => void;
    y?: (v: number) => void;
    tilt?: (v: number) => void;
    shift?: (v: number) => void;
  }>({});
  const lastX = useRef<number | null>(null);

  const [tracked, setTracked] = useState(false);
  const [near, setNear] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(POINTER_QUERY);
    const sync = () => setTracked(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* Mount the stills only as the section approaches, so six full-width images
     are never on the critical path for a viewer who stops earlier. */
  useEffect(() => {
    const root = ref.current;
    if (!root || !tracked) return;

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNear(true),
      { rootMargin: '40% 0px' },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [tracked]);

  /* Each property gets its own eased clock, which is what separates this from
     an element pinned rigidly to mouse coordinates. */
  useLayoutEffect(() => {
    const el = pointerRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;

    gsap.set(el, { xPercent: -50, yPercent: -50 });
    motion.current = {
      x: gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3' }),
      tilt: gsap.quickTo(el, 'rotation', { duration: 0.9, ease: 'power3' }),
      shift: gsap.quickTo(inner, 'xPercent', { duration: 1.1, ease: 'power3' }),
    };

    return () => {
      motion.current = {};
      lastX.current = null;
    };
  }, [near]);

  /* Row reveals: the rule draws, then the title rises behind it. */
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-row]').forEach((row) => {
        gsap
          .timeline({ scrollTrigger: { trigger: row, start: 'top 88%', once: true } })
          .fromTo(
            row.querySelector('[data-rule]'),
            { scaleX: 0 },
            { scaleX: 1, duration: 1.2, ease: 'power3.inOut' },
          )
          .fromTo(
            row.querySelector('[data-title]'),
            { yPercent: 118 },
            { yPercent: 0, duration: 1.05, ease: 'expo.out' },
            0.12,
          )
          .fromTo(
            row.querySelectorAll('[data-fade]'),
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.9, stagger: 0.06, ease: 'power2.out' },
            0.25,
          );
      });
    }, root);

    return () => ctx.revert();
  }, []);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const { x, y, tilt, shift } = motion.current;
    x?.(e.clientX);
    y?.(e.clientY);

    // Lean and drift from horizontal speed, not position — the plate reacts to
    // being moved rather than to where it happens to be.
    const previous = lastX.current;
    if (previous !== null) {
      const velocity = gsap.utils.clamp(-40, 40, e.clientX - previous);
      tilt?.((velocity / 40) * MAX_TILT);
      shift?.((velocity / 40) * INNER_SHIFT);
    }
    lastX.current = e.clientX;
  }, []);

  const handleEnter = useCallback((index: number, e: React.MouseEvent) => {
    setActive(index);
    const el = pointerRef.current;
    if (!el) return;
    // Arrive at the cursor before fading up, or the plate slides in from
    // wherever the previous hover left it.
    gsap.set(el, { x: e.clientX, y: e.clientY });
    lastX.current = e.clientX;
    gsap.to(el, { opacity: 1, scale: 1, duration: 0.5, ease: EASE.fade });
  }, []);

  const handleLeave = useCallback(() => {
    setActive(null);
    lastX.current = null;
    const el = pointerRef.current;
    if (el) gsap.to(el, { opacity: 0, scale: 0.94, duration: 0.4, ease: EASE.fade });
    motion.current.tilt?.(0);
    motion.current.shift?.(0);
  }, []);

  return (
    <section className="section" id="services" ref={ref}>
      <div className="shell">
        <SectionLabel index={SERVICES.index}>{SERVICES.label}</SectionLabel>

        <ul className={styles.list} onMouseLeave={handleLeave}>
          {SERVICES.items.map((item, i) => (
            <li
              className={styles.item}
              data-row
              key={item.n}
              onMouseEnter={tracked ? (e) => handleEnter(i, e) : undefined}
              onMouseMove={tracked ? handleMove : undefined}
            >
              <span className={styles.rule} data-rule aria-hidden="true" />
              <div className={styles.row}>
                <span className={styles.n} data-fade>
                  {item.n}
                </span>
                <h3 className={styles.titleMask}>
                  <span className={styles.title} data-title>
                    {item.title}
                  </span>
                </h3>
                <div data-fade>
                  <p className={styles.copy}>{item.copy}</p>
                  <div className={styles.inlineMedia}>
                    <img
                      src={item.still}
                      alt={item.title}
                      width={1600}
                      height={900}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {tracked && near && (
        <div className={styles.pointer} ref={pointerRef} aria-hidden="true">
          <div className={styles.pointerInner} ref={innerRef}>
            {SERVICES.items.map((item, i) => (
              <img
                className={`${styles.pointerImg} ${active === i ? styles.pointerImgActive : ''}`}
                key={item.n}
                src={item.still}
                alt=""
                width={1600}
                height={900}
                decoding="async"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
