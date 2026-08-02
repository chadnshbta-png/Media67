import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from '../../lib/motion/gsap';
import styles from './SectionLabel.module.css';

interface SectionLabelProps {
  index: string;
  children: ReactNode;
  className?: string;
  light?: boolean;
}

/**
 * The one gesture every section shares.
 *
 * Each part of the page below the hero has its own animation identity, but they
 * all announce themselves the same way — a hairline and a label rising out of a
 * mask. It is the rhythm that holds the page together as one piece.
 */
export function SectionLabel({ index, children, className, light }: SectionLabelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-label]',
        { yPercent: 120 },
        {
          yPercent: 0,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 94%', once: true },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <div className={[styles.mask, className].filter(Boolean).join(' ')} ref={ref}>
      <p className="label" data-label style={light ? { color: 'var(--c-text-soft)' } : undefined}>
        {index} — {children}
      </p>
    </div>
  );
}
