import type { FrameLibrary } from './FrameLibrary';

/** Retina is enough; a 3x phone would triple fill cost for no visible gain. */
const MAX_DPR = 2;

/**
 * Paints the sequence into a canvas, cover-fitted to the viewport.
 *
 * Deliberately has no clock of its own — the playhead lives in scroll. This
 * class only answers "put frame N on screen", and refuses to do even that when
 * frame N is already the one showing.
 */
export class SequenceCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly library: FrameLibrary;

  private index = 0;
  private painted = -1;
  private vignette: CanvasGradient | null = null;
  private observer: ResizeObserver | null = null;
  private resizeFrame = 0;

  constructor(canvas: HTMLCanvasElement, library: FrameLibrary) {
    this.canvas = canvas;
    this.library = library;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    this.applyContextDefaults();
    this.resize();
    this.observe();
  }

  get currentIndex(): number {
    return this.index;
  }

  /**
   * Show a frame. No-ops when that frame is already on screen, so a scroll that
   * moves less than one frame costs nothing at all.
   */
  draw(index: number): void {
    this.index = index;
    if (index === this.painted) return;

    const source = this.library.sourceFor(index);
    // Hold the previous frame rather than clearing: a missing source must never
    // become a flash of empty canvas.
    if (!source) return;

    const { width, height } = this.canvas;
    const natural = this.library.size;

    const scale = Math.max(width / natural.width, height / natural.height);
    const drawWidth = natural.width * scale;
    const drawHeight = natural.height * scale;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.drawImage(
      source,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );

    if (this.vignette) {
      this.ctx.fillStyle = this.vignette;
      this.ctx.fillRect(0, 0, width, height);
    }

    this.painted = index;
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    cancelAnimationFrame(this.resizeFrame);
  }

  private observe(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this.observer = new ResizeObserver(() => {
      // Coalesce to one resize per painted frame; a drag-resize otherwise
      // reallocates the backing store dozens of times a second.
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.resize();
        this.draw(this.index);
      });
    });
    this.observer.observe(this.canvas);
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = Math.round(this.canvas.clientWidth * dpr);
    const height = Math.round(this.canvas.clientHeight * dpr);
    if (!width || !height) return;
    if (width === this.canvas.width && height === this.canvas.height) return;

    this.canvas.width = width;
    this.canvas.height = height;

    // The backing store reset clears context state along with the pixels.
    this.applyContextDefaults();
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);

    this.buildVignette(width, height);
    this.painted = -1;
  }

  private applyContextDefaults(): void {
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Soft corner falloff. Reads as lens vignetting, and incidentally makes the
   * inpainted corner where the generator watermark used to sit unreadable.
   */
  private buildVignette(width: number, height: number): void {
    const cx = width / 2;
    const cy = height / 2;
    const gradient = this.ctx.createRadialGradient(
      cx,
      cy,
      Math.min(width, height) * 0.34,
      cx,
      cy,
      Math.hypot(cx, cy),
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.62, 'rgba(0,0,0,0.10)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.46)');
    this.vignette = gradient;
  }
}
