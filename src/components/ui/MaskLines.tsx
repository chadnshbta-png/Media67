import { createElement, useLayoutEffect, useRef } from 'react';
import { gsap, EASE } from '../../lib/motion/gsap';

interface MaskLinesProps {
  lines: readonly string[];
  className?: string;
  /** Which element to render. Headings should not all be h2s. */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
  start?: string;
}

/**
 * Type that rises out of a mask, one authored line at a time.
 *
 * Lines are authored rather than measured: a runtime line-splitter has to
 * reflow on every resize and fights variable fonts, and this site's headlines
 * are art-directed anyway — where they break is a design decision.
 */
export function MaskLines({ lines, className, as = 'h2', start = 'top 84%' }: MaskLinesProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-mask-line]',
        { yPercent: 112 },
        {
          yPercent: 0,
          duration: 1.25,
          stagger: 0.1,
          ease: EASE.reveal,
          scrollTrigger: { trigger: el, start, once: true },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [start]);

  return createElement(
    as,
    { className, ref },
    lines.map((line) => (
      <span className="line-mask" key={line}>
        <span data-mask-line>{line}</span>
      </span>
    )),
  );
}
