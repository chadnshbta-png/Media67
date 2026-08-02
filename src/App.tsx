import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ScrollTrigger } from './lib/motion/gsap';
import { initSmoothScroll } from './lib/motion/scroll';
import { heroStage } from './lib/film/heroStage';
import { Header } from './components/chrome/Header';
import { Brandmark } from './components/chrome/Brandmark';
import { Hero } from './components/hero/Hero';

const Sections = lazy(() => import('./components/sections/Sections'));

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    // The film has to start from its first frame, whatever the browser
    // remembers about where this page was left.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    return initSmoothScroll();
  }, []);

  useEffect(() => heroStage.subscribe((state) => setReady(state.ready)), []);

  /* Pinning the hero changes the document height by several thousand pixels.
     Measure once the browser has settled on the new layout. */
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  return (
    <>
      <Header menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} />
      <Brandmark docked={menuOpen} onNavigate={closeMenu} />

      <main>
        <Hero />
        <Suspense fallback={null}>
          <Sections />
        </Suspense>
      </main>
    </>
  );
}
