import { useEffect, useState } from 'react';
import { FILM, selectTier, type FilmManifest } from '../../lib/film/config';
import { FrameLibrary } from '../../lib/film/FrameLibrary';

export interface FilmState {
  library: FrameLibrary | null;
  manifest: FilmManifest | null;
  /** 0…1 across the whole sequence. */
  progress: number;
  /** Every frame is in memory and the first is decoded. */
  ready: boolean;
  failed: boolean;
}

/**
 * Loads the whole sequence before the hero becomes interactive.
 *
 * The hero is scrubbed, so a viewer can be at frame 700 a second after
 * arriving. There is no such thing as "far enough ahead" — the film has to be
 * complete before scroll is handed over, or scrubbing would hit holes.
 */
export function useFilm(enabled: boolean): FilmState {
  const [state, setState] = useState<FilmState>({
    library: null,
    manifest: null,
    progress: 0,
    ready: false,
    failed: false,
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let library: FrameLibrary | null = null;

    const run = async () => {
      try {
        const response = await fetch(FILM.manifestUrl, { cache: 'force-cache' });
        const manifest = (await response.json()) as FilmManifest;
        if (cancelled) return;

        library = new FrameLibrary(selectTier(), manifest.total);
        setState((s) => ({ ...s, library, manifest }));

        // Repaint at whole percentages only: 720 state updates would cost more
        // than the loading they report on.
        let shown = -1;
        await library.preload(({ ratio }) => {
          const percent = Math.floor(ratio * 100);
          if (cancelled || percent === shown) return;
          shown = percent;
          setState((s) => ({ ...s, progress: ratio }));
        });
        if (cancelled) return;

        await library.primeRing(1);
        if (cancelled) return;

        setState((s) => ({ ...s, progress: 1, ready: true }));
      } catch {
        if (!cancelled) setState((s) => ({ ...s, failed: true }));
      }
    };

    void run();

    return () => {
      cancelled = true;
      library?.dispose();
    };
  }, [enabled]);

  return state;
}
