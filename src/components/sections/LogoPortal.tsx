import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/motion/gsap';
import { chromeVeil } from '../../lib/motion/chrome';
import styles from './LogoPortal.module.css';

interface LogoPortalProps {
  /** The plate the viewer emerges into. Should match whatever follows. */
  image: string;
}

const MAX_DPR = 2;

/** Scroll spent passing through the mark, in viewport heights. */
const SCREENS = 1.7;

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    if (img.complete) {
      resolve(img);
      return;
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
  });

/**
 * Through the mark.
 *
 * The brand mark sits alone on black, and the first project is visible only
 * inside its letterforms. As the viewer scrolls, the mark rushes toward them
 * and an aperture opens through it until the image is all there is.
 *
 * The mask is composited on an offscreen canvas as *letterforms ∪ iris*, which
 * is what makes it work: letterforms alone would leave the gaps between glyphs
 * showing black at large scales, and would go soft long before they cleared the
 * screen. The iris takes over exactly when the type stops being legible — and
 * a lens opening is the right image for this brand anyway.
 */
export function LogoPortal({ image }: LogoPortalProps) {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!root || !stage || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mask = document.createElement('canvas');
    const mctx = mask.getContext('2d');
    if (!mctx) return;

    let plate: HTMLImageElement | null = null;
    let logo: HTMLImageElement | null = null;
    let progress = 0;
    let disposed = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (!width || !height) return;
      if (width === canvas.width && height === canvas.height) return;
      canvas.width = width;
      canvas.height = height;
      mask.width = width;
      mask.height = height;
    };

    const draw = () => {
      if (disposed) return;
      const { width: w, height: h } = canvas;
      if (!w || !h) return;

      ctx.clearRect(0, 0, w, h);
      if (!plate || !logo) return;

      // Ease the travel so it accelerates toward the viewer.
      const p = progress * progress * (3 - 2 * progress);

      // The plate pulls back as the mark rushes forward — parallax between the
      // two is what sells passing *through* rather than a zoom.
      const dolly = 1.18 - 0.18 * p;
      const cover = Math.max(w / plate.width, h / plate.height) * dolly;
      const pw = plate.width * cover;
      const ph = plate.height * cover;
      const px = (w - pw) / 2;
      const py = (h - ph) / 2;

      /*
       * The plate is near-black cinema glass, and the mark sits over its
       * darkest region. Held inside letterforms a few hundred pixels wide it
       * would read as an empty outline, so the exposure is lifted while it is
       * small and settles to true as it takes the screen: light blooming
       * through the optic first, then the optic itself.
       *
       * A flat floor guarantees the letterforms are legible whatever the frame
       * is doing; the additive pass on top keeps the glass's own highlights.
       */
      const lift = Math.max(0, 1 - p / 0.5);
      const floor = 0.28 * lift;
      if (floor > 0.001) {
        ctx.fillStyle = `rgba(255,255,255,${floor})`;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(plate, px, py, pw, ph);

      const bloom = 0.7 * lift;
      if (bloom > 0.001) {
        ctx.globalAlpha = bloom;
        ctx.drawImage(plate, px, py, pw, ph);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';

      /* ---- mask: letterforms ∪ iris ---------------------------------- */
      mctx.clearRect(0, 0, w, h);

      // Exponential growth reads as constant speed toward a receding object.
      const startW = Math.min(w * 0.42, 520 * (w / canvas.clientWidth));
      const endW = w * 9;
      const lw = startW * (endW / startW) ** p;
      const lh = lw * (logo.height / logo.width);
      mctx.drawImage(logo, (w - lw) / 2, (h - lh) / 2, lw, lh);

      // The aperture opens once the type has grown past legibility.
      const irisAt = 0.52;
      if (p > irisAt) {
        const t = (p - irisAt) / (1 - irisAt);
        const radius = Math.hypot(w, h) * 0.55 * (t * t);
        mctx.beginPath();
        mctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
        mctx.fillStyle = '#fff';
        mctx.fill();
      }

      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    };

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            resize();
            draw();
          })
        : null;
    observer?.observe(canvas);

    resize();

    void Promise.all([load(image), load('/brand/logo.png')])
      .then(([loadedPlate, loadedLogo]) => {
        if (disposed) return;
        plate = loadedPlate;
        logo = loadedLogo;
        draw();
      })
      .catch(() => undefined);

    const gsapCtx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * SCREENS)}`,
          pin: stage,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: 3,
          onUpdate: (self) => {
            progress = self.progress;
            // Clear the chrome for the length of the set piece, and hand it
            // back at both ends so entering or leaving either way is clean.
            chromeVeil.set(
              Math.min(progress / 0.06, (1 - progress) / 0.14, 1),
            );
            draw();
          },
        },
      });
    }, root);

    return () => {
      disposed = true;
      observer?.disconnect();
      gsapCtx.revert();
      chromeVeil.set(0);
    };
  }, [image]);

  return (
    <section className={styles.portal} ref={ref} aria-hidden="true">
      <div className={styles.stage} ref={stageRef}>
        <canvas className={styles.canvas} ref={canvasRef} />
      </div>
    </section>
  );
}
