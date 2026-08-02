import { FILM, TIER_SIZE, selectRingRadius, type FilmTier } from './config';

export interface PreloadProgress {
  loaded: number;
  total: number;
  /** 0…1 */
  ratio: number;
}

/** Parallel image requests during preload. */
const FETCH_CONCURRENCY = 10;

/** Frames decoded eagerly at the head of the film, so frame one is instant. */
const PRIME = 24;

/** Simultaneous `createImageBitmap` calls while scrubbing. */
const MAX_DECODES = 4;

/** How far the ring leans ahead of the playhead, as a fraction of its radius. */
const LEAD_BIAS = 0.65;

/**
 * Holds the entire sequence, and keeps a decoded window around the playhead.
 *
 * Two layers, because scrubbing needs both completeness and speed:
 *
 *  - Every frame is preloaded as an `HTMLImageElement` and never released. That
 *    is what makes the hero interactive only once the *whole* film is present,
 *    and it guarantees `drawImage` always has something synchronous to draw —
 *    the sequence can never tear, flash, or fall back to an empty canvas.
 *  - A bounded ring of `ImageBitmap`s tracks the playhead. Decoded frames are
 *    what actually make a scrub free, but 720 decoded 720p frames would cost
 *    ~2.6 GB, so the ring holds only the neighbourhood and leans in the
 *    direction of travel.
 */
export class FrameLibrary {
  readonly tier: FilmTier;
  readonly total: number;

  private readonly images: (HTMLImageElement | undefined)[];
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly inflight = new Set<number>();
  private readonly radius: number;

  private centre = 1;
  /** Smoothed scrub direction, -1…1. Biases which side of the ring is filled. */
  private drift = 0;
  private disposed = false;

  constructor(tier: FilmTier, total: number) {
    this.tier = tier;
    this.total = total;
    this.images = new Array(total + 1);
    this.radius = selectRingRadius(tier);
  }

  get size(): { width: number; height: number } {
    return TIER_SIZE[this.tier];
  }

  /** Loads every frame. Resolves only when the film is complete. */
  async preload(onProgress: (p: PreloadProgress) => void): Promise<void> {
    let loaded = 0;
    let next = 1;

    const report = () => {
      loaded += 1;
      onProgress({ loaded, total: this.total, ratio: loaded / this.total });
    };

    const worker = async (): Promise<void> => {
      while (!this.disposed) {
        const index = next;
        if (index > this.total) return;
        next += 1;

        try {
          const image = await this.load(index);
          this.images[index] = image;

          // Decode the opening frames up front: the first thing drawn must not
          // wait on a decode, or the film opens on an empty canvas.
          if (index <= PRIME) await image.decode().catch(() => undefined);
        } catch {
          // One retry, then give up on this frame — a single missing image
          // must not strand the whole hero behind a loading screen.
          try {
            this.images[index] = await this.load(index);
          } catch {
            /* leave the slot empty; the canvas holds the previous frame */
          }
        }

        report();
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(FETCH_CONCURRENCY, this.total) }, () => worker()),
    );
  }

  /**
   * The best drawable source for a frame: the decoded bitmap when the ring has
   * it, otherwise the loaded image. Never returns a half-loaded source.
   */
  sourceFor(index: number): CanvasImageSource | undefined {
    const bitmap = this.bitmaps.get(index);
    if (bitmap) return bitmap;

    const image = this.images[index];
    return image?.complete && image.naturalWidth > 0 ? image : undefined;
  }

  /** Move the decoded ring to follow the playhead. Cheap; call every frame. */
  track(centre: number): void {
    if (this.disposed) return;

    const delta = centre - this.centre;
    // Exponential smoothing: a single fast flick should not whip the ring
    // around, but a sustained scrub in one direction should lead it.
    this.drift = this.drift * 0.82 + Math.sign(delta) * Math.min(Math.abs(delta), 4) * 0.045;
    this.drift = Math.max(-1, Math.min(1, this.drift));
    this.centre = centre;

    const lead = Math.round(this.radius * LEAD_BIAS * this.drift);
    const from = Math.max(1, centre - this.radius + lead);
    const to = Math.min(this.total, centre + this.radius + lead);

    this.evict(from, to);
    this.fill(centre, from, to);
  }

  /** Decode one frame and wait for it. Used for the very first paint. */
  async warm(index: number): Promise<void> {
    const image = this.images[index];
    if (!image || this.bitmaps.has(index) || this.disposed) return;
    await this.decode(index, image);
  }

  /**
   * Build the ring ahead of a frame before handing scroll to the viewer.
   *
   * Without this the first scrub pays for the whole ring at once, which shows
   * up as a single long frame right at the moment the film is meant to feel
   * weightless. Paying it during the loading screen costs nothing visible.
   */
  async primeRing(centre: number): Promise<void> {
    const last = Math.min(this.total, centre + this.radius);
    const jobs: Promise<void>[] = [];
    for (let i = centre; i <= last; i += 1) jobs.push(this.warm(i));
    await Promise.all(jobs);
  }

  dispose(): void {
    this.disposed = true;
    for (const bitmap of this.bitmaps.values()) bitmap.close();
    this.bitmaps.clear();
    this.inflight.clear();
    this.images.length = 0;
  }

  private load(index: number): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = FILM.path(this.tier, index);
      if (image.complete) {
        resolve(image);
        return;
      }
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`frame ${index} failed`));
    });
  }

  /** Queue the missing frames nearest the playhead first. */
  private fill(centre: number, from: number, to: number): void {
    if (this.inflight.size >= MAX_DECODES) return;

    const wanted: number[] = [];
    for (let i = from; i <= to; i += 1) {
      if (!this.bitmaps.has(i) && !this.inflight.has(i) && this.images[i]) wanted.push(i);
    }
    if (!wanted.length) return;

    wanted.sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));

    for (const index of wanted.slice(0, MAX_DECODES - this.inflight.size)) {
      const image = this.images[index];
      if (image) void this.decode(index, image);
    }
  }

  private async decode(index: number, image: HTMLImageElement): Promise<void> {
    this.inflight.add(index);
    try {
      const bitmap = await createImageBitmap(image);
      if (this.disposed) {
        bitmap.close();
        return;
      }
      this.bitmaps.set(index, bitmap);
    } catch {
      // The element is still drawable; the ring simply misses this one.
    } finally {
      this.inflight.delete(index);
    }
  }

  private evict(from: number, to: number): void {
    // A margin of tolerance stops small oscillations around a boundary from
    // repeatedly closing and re-decoding the same frames.
    const low = from - 6;
    const high = to + 6;

    for (const [index, bitmap] of this.bitmaps) {
      if (index < low || index > high) {
        bitmap.close();
        this.bitmaps.delete(index);
      }
    }
  }
}
