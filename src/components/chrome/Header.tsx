import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, EASE } from '../../lib/motion/gsap';
import { lockScroll, unlockScroll, scrollToSection } from '../../lib/motion/scroll';
import { beatStart } from '../../lib/film/config';
import { heroStage } from '../../lib/film/heroStage';
import { chromeVeil } from '../../lib/motion/chrome';
import { BRAND, NAV } from '../../content/site';
import styles from './Header.module.css';

interface HeaderProps {
  /** Controlled by the shell so the brand mark can dock while the menu is open. */
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The navigation bar.
 *
 * It does not exist during the film. As the cut settles into black and the
 * brand mark leaves for the bar, the bar fades up underneath it — so the last
 * thing the film does is hand the viewer the website.
 */
export function Header({ menuOpen, onMenuOpenChange }: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const setMenuOpen = onMenuOpenChange;

  /* Fade in on the same hand-off the mark rides, rather than on a timer, and
     step aside for any section that has claimed the frame. */
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const setOpacity = gsap.quickSetter(header, 'opacity') as (v: number) => void;
    let arrival = 0;
    let veil = 0;

    const apply = () => {
      setOpacity(arrival * (1 - veil));
      // Only reachable once it is substantially on screen — a header at 8%
      // opacity should not be catching clicks or tab stops.
      setLive(arrival > 0.6 && veil < 0.5);
    };

    const offStage = heroStage.subscribe(({ progress, total, reduced }) => {
      if (total < 2) return;
      const dockAt = beatStart('dock', total);
      arrival = reduced ? progress : clamp01((progress - dockAt) / (1 - dockAt));
      apply();
    });
    const offVeil = chromeVeil.subscribe((next) => {
      veil = next;
      apply();
    });

    return () => {
      offStage();
      offVeil();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    lockScroll();
    return unlockScroll;
  }, [menuOpen]);

  /* Close on Escape, and whenever the viewport grows back past the breakpoint. */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const mq = window.matchMedia('(min-width: 861px)');
    const onChange = () => mq.matches && setMenuOpen(false);

    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onChange);
    };
  }, [menuOpen, setMenuOpen]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const ctx = gsap.context(() => {
      if (menuOpen) {
        gsap
          .timeline()
          .set(menu, { display: 'flex' })
          .fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: EASE.fade })
          .fromTo(
            '[data-menu-line]',
            { yPercent: 115 },
            { yPercent: 0, duration: 0.95, stagger: 0.07, ease: EASE.reveal },
            0.12,
          )
          .fromTo('[data-menu-foot]', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.5);
      } else {
        gsap.to(menu, {
          opacity: 0,
          duration: 0.4,
          ease: EASE.fade,
          onComplete: () => gsap.set(menu, { display: 'none' }),
        });
      }
    }, menuRef);

    return () => ctx.revert();
  }, [menuOpen]);

  const go = useCallback(
    (href: string) => {
      setMenuOpen(false);
      // Let the overlay start clearing before the page moves underneath it.
      window.setTimeout(() => scrollToSection(href), 180);
    },
    [setMenuOpen],
  );

  return (
    <>
      {/* Mounted from the start so the brand slot can be measured, but nothing
          in it is clickable or focusable until the film has handed over. */}
      <header
        className={[
          styles.header,
          live ? styles.scrolled : '',
          menuOpen ? styles.menuOpen : '',
          live ? '' : styles.dormant,
        ]
          .filter(Boolean)
          .join(' ')}
        ref={headerRef}
      >
        <div className={styles.bg} aria-hidden="true" />
        <div className={styles.brandSlot} id="brand-slot-nav" aria-hidden="true" />

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <a
              className={styles.link}
              key={item.href}
              href={item.href}
              tabIndex={live ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
          <a
            className={styles.contact}
            href="#contact"
            tabIndex={live ? 0 : -1}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('#contact');
            }}
          >
            Start a Project
          </a>
        </nav>

        <button
          className={styles.toggle}
          type="button"
          aria-expanded={menuOpen}
          tabIndex={live ? 0 : -1}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      <div className={styles.menu} ref={menuRef} role="dialog" aria-modal="true" aria-label="Menu">
        <nav>
          {[...NAV, { label: 'Contact', href: '#contact' }].map((item) => (
            <a
              className={styles.menuLink}
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                go(item.href);
              }}
            >
              <span data-menu-line>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className={styles.menuFoot} data-menu-foot>
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          <span>{BRAND.city}</span>
        </div>
      </div>
    </>
  );
}
