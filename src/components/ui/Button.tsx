import type { ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  size?: 'base' | 'large';
  className?: string;
}

export function Button({ children, onClick, href, size = 'base', className }: ButtonProps) {
  const classes = [styles.button, size === 'large' ? styles.large : '', className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span>{children}</span>
      <span className={styles.arrow} aria-hidden="true" />
    </>
  );

  if (href) {
    return (
      <a className={classes} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} type="button" onClick={onClick}>
      {content}
    </button>
  );
}
