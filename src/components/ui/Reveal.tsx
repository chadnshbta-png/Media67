import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap, EASE } from '../../lib/motion/gsap';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds after the trigger fires. Used to stagger siblings by hand. */
  delay?: number;
  /** Travel distance in px. Keep small — this is a settle, not an entrance. */
  distance?: number;
}

/**
 * Fades a block up as it enters. Fires once: re-animating on the way back up
 * turns a page into a slideshow and makes long scrolls feel restless.
 */
export function Reveal({ children, className, delay = 0, distance = 26 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: distance },
        {
          opacity: 1,
          y: 0,
          duration: 1.15,
          delay,
          ease: EASE.reveal,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [delay, distance]);

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}
