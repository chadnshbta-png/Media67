import { forwardRef } from 'react';
import { BRAND } from '../../content/site';
import styles from './IntroLoader.module.css';

interface IntroLoaderProps {
  /** 0…1 */
  progress: number;
}

export const IntroLoader = forwardRef<HTMLDivElement, IntroLoaderProps>(function IntroLoader(
  { progress },
  ref,
) {
  const percent = Math.min(100, Math.floor(progress * 100));

  return (
    <div className={styles.loader} ref={ref} aria-hidden="true">
      <div className={styles.footer}>
        <span className={styles.mark}>{BRAND.name}</span>
        <span className={styles.count}>
          {String(percent).padStart(2, '0')}
          <sup>%</sup>
        </span>
      </div>
      <div className={styles.rule}>
        <span className={styles.fill} style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
});
