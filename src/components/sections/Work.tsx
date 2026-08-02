import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/motion/gsap';
import { WORK } from '../../content/site';
import { SectionLabel } from '../ui/SectionLabel';
import styles from './Work.module.css';

/** Lateral travel of a plate's image across its pass, in pixels. */
const PARALLAX = 110;

/** How far the cursor can push the image, in pixels. */
const CURSOR_PUSH = 18;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Featured Work — a lateral gallery.
 *
 * The section pins and vertical scroll becomes horizontal travel. Each project
 * holds the full screen; the plate you are on is lit and titled, the ones
 * either side sit back in the dark. Its animation identity is **travel** —
 * every value here is derived from one number, how far each plate is from the
 * centre of the screen, so image parallax, dimming and the title reveal all
 * move as one thing rather than as four separate triggers.
 */
export function Work() {
  const ref = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const gleamRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!root || !viewport || !track) return;

    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add('(min-width: 861px)', () => {
        const panels = gsap.utils.toArray<HTMLElement>('[data-panel]');
        const pick = (panel: HTMLElement, selector: string) =>
          panel.querySelector<HTMLElement>(selector) as HTMLElement;

        const setImageX = panels.map((p) =>
          gsap.quickSetter(pick(p, '[data-image]'), 'x', 'px'),
        );
        const setDim = panels.map((p) => gsap.quickSetter(pick(p, '[data-dim]'), 'opacity'));
        const setTitleY = panels.map((p) =>
          gsap.quickSetter(pick(p, '[data-title]'), 'yPercent'),
        );
        const setMeta = panels.map((p) => gsap.quickSetter(pick(p, '[data-meta]'), 'opacity'));

        /** Cursor lean, applied on top of the travel parallax. */
        const cursor = { push: 0 };
        let progress = 0;

        const distance = () => track.scrollWidth - window.innerWidth;

        /**
         * One pass over the plates. `offset` is how many screens each plate is
         * from centre: 0 means it owns the screen.
         */
        const render = () => {
          const vw = window.innerWidth;
          const x = -distance() * progress;

          let nearest = 0;
          let nearestOffset = Infinity;

          panels.forEach((_, i) => {
            const offset = i + x / vw;
            const focus = clamp01(1 - Math.abs(offset) * 1.35);

            setImageX[i](-offset * PARALLAX + cursor.push * focus);
            setDim[i]((1 - focus) * 0.62);
            setTitleY[i]((1 - focus) * 118);
            setMeta[i](focus);

            if (Math.abs(offset) < nearestOffset) {
              nearestOffset = Math.abs(offset);
              nearest = i;
            }
          });

          if (countRef.current) {
            countRef.current.textContent = `${String(nearest + 1).padStart(2, '0')} / ${String(
              panels.length,
            ).padStart(2, '0')}`;
          }
        };

        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: viewport,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: true,
            invalidateOnRefresh: true,
            refreshPriority: 2,
            onUpdate: (self) => {
              progress = self.progress;
              render();
            },
            onRefresh: (self) => {
              progress = self.progress;
              render();
            },
          },
        });

        render();

        /* ---- Cursor: light and depth ---------------------------------- */
        const gleam = gleamRef.current as HTMLElement;
        const gleamX = gsap.quickTo(gleam, 'x', { duration: 0.7, ease: 'power3' });
        const gleamY = gsap.quickTo(gleam, 'y', { duration: 0.7, ease: 'power3' });

        const onMove = (e: MouseEvent) => {
          const rect = viewport.getBoundingClientRect();
          gleamX(e.clientX - rect.left);
          gleamY(e.clientY - rect.top);
          // Away from the cursor: the plate leans as though it had thickness.
          cursor.push = -((e.clientX - rect.left) / rect.width - 0.5) * 2 * CURSOR_PUSH;
          render();
        };

        const onEnter = () => gsap.to(gleam, { opacity: 1, duration: 0.6, ease: 'power2.out' });
        const onLeave = () => {
          gsap.to(gleam, { opacity: 0, duration: 0.5, ease: 'power2.out' });
          gsap.to(cursor, { push: 0, duration: 0.7, ease: 'power3.out', onUpdate: render });
        };

        viewport.addEventListener('mousemove', onMove);
        viewport.addEventListener('mouseenter', onEnter);
        viewport.addEventListener('mouseleave', onLeave);

        return () => {
          viewport.removeEventListener('mousemove', onMove);
          viewport.removeEventListener('mouseenter', onEnter);
          viewport.removeEventListener('mouseleave', onLeave);
        };
      });

      /* ---- Stacked plates: reveal each as it arrives ------------------- */
      media.add('(max-width: 860px)', () => {
        gsap.utils.toArray<HTMLElement>('[data-panel]').forEach((panel) => {
          gsap
            .timeline({ scrollTrigger: { trigger: panel, start: 'top 78%', once: true } })
            .fromTo(
              panel.querySelector('[data-media]'),
              { clipPath: 'inset(100% 0% 0% 0%)' },
              { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power3.inOut' },
            )
            .fromTo(
              panel.querySelector('[data-title]'),
              { yPercent: 115 },
              { yPercent: 0, duration: 1.1, ease: 'expo.out' },
              0.25,
            )
            .fromTo(
              panel.querySelector('[data-meta]'),
              { opacity: 0 },
              { opacity: 1, duration: 0.9 },
              0.45,
            );
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section className={`section ${styles.work}`} id="work" ref={ref}>
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.headVeil} aria-hidden="true" />
        <div className={styles.head}>
          <SectionLabel index={WORK.index}>{WORK.label}</SectionLabel>
          <span className={styles.count} ref={countRef}>
            01 / {String(WORK.projects.length).padStart(2, '0')}
          </span>
        </div>

        <div className={styles.track} ref={trackRef}>
          {WORK.projects.map((project) => (
            <article className={styles.panel} data-panel key={project.id}>
              <div className={styles.media} data-media>
                <img
                  className={styles.image}
                  data-image
                  src={project.still}
                  alt={`${project.title} — ${project.discipline}`}
                  width={1600}
                  height={900}
                  loading="lazy"
                  decoding="async"
                />
                <div className={styles.scrim} aria-hidden="true" />
              </div>
              <div className={styles.dim} data-dim aria-hidden="true" />

              <div className={styles.meta} data-meta>
                <h3 className={styles.titleMask}>
                  <span className={styles.title} data-title>
                    {project.title}
                  </span>
                </h3>
                <div className={styles.detail}>
                  <span>{project.discipline}</span>
                  <span>{project.year}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.gleam} ref={gleamRef} aria-hidden="true" />
      </div>
    </section>
  );
}
