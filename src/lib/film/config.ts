/**
 * The hero film.
 *
 * 720 frames baked by `npm run assets`, played by scroll rather than by a
 * clock. Nothing here autoplays: scroll position *is* the playhead, so the
 * whole module is expressed in frames and the scroll maths is derived from
 * them. Change the sequence length and every beat below re-lands on its own.
 */

export type FilmTier = 'hd' | 'sm';

export interface FilmManifest {
  total: number;
  tiers: FilmTier[];
  pattern: string;
  /** Mean luminance per frame, limited-range Y (16 = black, 235 = white). */
  luma: number[];
}

export const FILM = {
  /** Fallback until the manifest lands. The manifest is authoritative. */
  total: 720,
  manifestUrl: '/frames/manifest.json',
  path: (tier: FilmTier, index: number) =>
    `/frames/${tier}/f_${String(index).padStart(4, '0')}.webp`,
} as const;

/** Natural pixel dimensions of each baked tier. */
export const TIER_SIZE: Record<FilmTier, { width: number; height: number }> = {
  hd: { width: 1280, height: 720 },
  sm: { width: 768, height: 432 },
};

/* ------------------------------------------------------------------------ */
/* Story beats                                                               */
/* ------------------------------------------------------------------------ */

/**
 * Where each element enters the film, in frames.
 *
 * These are editorial marks, read off the footage itself — this cut has no
 * hard cuts to detect, it is built entirely from dissolves, so the moments
 * below are the ones a person watching would name. Every scroll position on
 * the page is derived from these numbers, never hard-coded as a percentage.
 *
 * `span` is how many frames the reveal takes to complete.
 */
export interface Beat {
  /** 1-based frame at which the reveal begins. */
  frame: number;
  /** Frames over which it completes. */
  span: number;
  /** What is happening on screen — the reason this frame was chosen. */
  cue: string;
}

export const BEATS = {
  /** The lens has grown to fill the frame and become the whole image. */
  logo: { frame: 214, span: 40, cue: 'the lens becomes the dominant element' },
  /** The camera reaches the front element; aperture blades and flares. */
  one: { frame: 258, span: 26, cue: 'the camera begins entering the lens' },
  /** Still travelling through the optic, a beat later. */
  lens: { frame: 286, span: 26, cue: 'a moment further inside' },
  /** The floor: lights, haze, crew — the making of things begins. */
  endless: { frame: 312, span: 30, cue: 'the filmmaking journey begins' },
  /** The aerial rises over the city at sunrise — the cut's biggest moment. */
  stories: { frame: 470, span: 34, cue: 'the strongest storytelling moment' },
  /** Climbing into open sky — the copy settles as the sunrise peaks, not as it fades. */
  lead: { frame: 520, span: 42, cue: 'the aerial climbs into open sky' },
  /** The lens has returned, centred and dark. Room for a single action. */
  cta: { frame: 628, span: 42, cue: 'the lens returns, near the end' },
  /** The film has settled to black: the mark leaves for the navigation bar. */
  dock: { frame: 686, span: 34, cue: 'the film settles into black' },
} as const satisfies Record<string, Beat>;

export type BeatName = keyof typeof BEATS;

/** Frame number (1-based) to scroll progress (0…1) across the pinned hero. */
export function frameToProgress(frame: number, total: number): number {
  return (frame - 1) / (total - 1);
}

export function beatStart(name: BeatName, total: number): number {
  return frameToProgress(BEATS[name].frame, total);
}

export function beatSpan(name: BeatName, total: number): number {
  return BEATS[name].span / (total - 1);
}

/* ------------------------------------------------------------------------ */
/* Scroll                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * How far the page scrolls while the hero is pinned.
 *
 * Expressed per frame rather than in viewport heights so the scrubbing rate —
 * how much film a given wheel gesture advances — feels identical on every
 * screen. The floor keeps it from ever feeling hurried on tall displays.
 */
export function heroScrollLength(total: number): number {
  const compact = window.innerWidth < 860;
  const pixelsPerFrame = compact ? 5.5 : 7.5;
  return Math.max(Math.round(total * pixelsPerFrame), Math.round(window.innerHeight * 4.5));
}

/* ------------------------------------------------------------------------ */
/* Device budget                                                             */
/* ------------------------------------------------------------------------ */

export function selectTier(): FilmTier {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string; saveData?: boolean };
  };

  if (nav.connection?.saveData) return 'sm';
  if (nav.connection?.effectiveType && /(^|-)[23]g/.test(nav.connection.effectiveType)) return 'sm';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return 'sm';

  const longEdge = Math.max(window.innerWidth, window.innerHeight);
  if (longEdge * Math.min(window.devicePixelRatio || 1, 2) <= 1280) return 'sm';

  return 'hd';
}

/**
 * Radius, in frames, of the decoded-bitmap ring held around the playhead.
 *
 * Every resident bitmap costs width x height x 4 bytes, so decoding all 720
 * hd frames at once would cost ~2.6 GB. The ring is what makes scrubbing free
 * in the region the viewer is actually in, while total memory stays bounded.
 */
export function selectRingRadius(tier: FilmTier): number {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const { width, height } = TIER_SIZE[tier];
  const bytesPerFrame = width * height * 4;

  const budget = memory * 1024 ** 3 * 0.09;
  const affordable = Math.floor(budget / bytesPerFrame / 2);

  return Math.max(10, Math.min(26, affordable));
}
