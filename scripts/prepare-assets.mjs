/**
 * Asset pipeline for the Media Six Seven hero film.
 *
 * The source frames ship with an AI-generator sparkle watermark burned into the
 * lower-right corner of every frame, and with unpadded filenames ("frame (7).webp")
 * that cannot be addressed by a numeric URL pattern at runtime.
 *
 * This script bakes, once, an on-disk sequence the renderer can stream:
 *   - watermark removed via ffmpeg `delogo` (interpolates from the surrounding band)
 *   - deterministic zero-padded names            -> f_0001.webp
 *   - two resolution tiers (hd / sm) so low-memory + slow-network clients
 *     get a lighter film rather than a stuttering one
 *   - editorial stills pulled from the film for the Work + Services sections
 *   - the brand mark converted from JPEG-on-black to a straight-alpha PNG
 *
 * Run once:  npm run assets
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SRC_FRAMES = path.join(ROOT, 'frame');
const SRC_LOGO = path.join(ROOT, 'Logo');
const PUBLIC = path.join(ROOT, 'public');
const STAGE = path.join(ROOT, '.asset-stage');

/** Bounding box of the generator watermark in the 1280x720 source, plus margin. */
const WATERMARK = { x: 1134, y: 573, w: 56, h: 58 };
const DELOGO = `delogo=x=${WATERMARK.x}:y=${WATERMARK.y}:w=${WATERMARK.w}:h=${WATERMARK.h}`;

/** Resolution tiers. `hd` is the source resolution; `sm` is for phones / low memory. */
const TIERS = [
  { id: 'hd', filter: DELOGO, quality: 78 },
  { id: 'sm', filter: `${DELOGO},scale=768:432:flags=lanczos`, quality: 74 },
];

/**
 * Editorial stills lifted from the film. Frame numbers are 1-based source indices.
 * `id` becomes the filename the site imports.
 */
/*
 * Frames chosen for focus as well as content: the cut rack-focuses constantly,
 * and a frame that reads fine at 16:9 can be pure bokeh once it is cropped to
 * a portrait viewport. Every entry here is a settled, in-focus moment.
 */
const STILLS = [
  // Featured Work — one per fullscreen panel
  { id: 'optics', frame: 248 },    // macro cinema glass, cool flares, aperture centred
  { id: 'atelier', frame: 390 },   // fragrance macro, gold
  { id: 'skyline', frame: 472 },   // aerial city at sunrise
  { id: 'the-floor', frame: 344 }, // clapperboard, sharp, lights behind
  { id: 'the-cut', frame: 410 },   // colourist at the suite

  /*
   * The closing shot. The page opens by travelling into this optic and ends by
   * closing it — the same lens a beat later, so the ending rhymes with the way
   * in rather than introducing a new image at the last moment.
   */
  { id: 'closing', frame: 258 },

  // Services — revealed on hover
  { id: 'svc-brand-films', frame: 296 },  // DOP framing a cinema lens
  { id: 'svc-commercials', frame: 372 },  // product standing in smoke
  { id: 'svc-social', frame: 336 },       // clapper, wider on the floor
  { id: 'svc-aerial', frame: 506 },       // drone over the city
  { id: 'svc-post', frame: 430 },         // edit timeline
  { id: 'svc-photography', frame: 264 },  // aperture macro

  // Ambient
  { id: 'atmosphere', frame: 310 },       // studio lights through haze
];

const ff = (args) => exec('ffmpeg', ['-y', '-hide_banner', '-v', 'error', ...args], {
  maxBuffer: 1024 * 1024 * 32,
});

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function dirSize(dir) {
  const files = await fs.readdir(dir);
  const sizes = await Promise.all(files.map((f) => fs.stat(path.join(dir, f)).then((s) => s.size)));
  return { count: files.length, bytes: sizes.reduce((a, b) => a + b, 0) };
}

/**
 * ffmpeg's image2 demuxer needs a zero-padded numeric pattern, so mirror the
 * source into a staging dir first. Copying is far cheaper than 720 ffmpeg spawns.
 */
async function stageSource() {
  await fs.rm(STAGE, { recursive: true, force: true });
  await fs.mkdir(STAGE, { recursive: true });

  const names = (await fs.readdir(SRC_FRAMES)).filter((n) => n.toLowerCase().endsWith('.webp'));
  const indexed = names
    .map((name) => {
      const match = name.match(/\((\d+)\)/);
      return match ? { name, index: Number(match[1]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

  if (!indexed.length) throw new Error(`No "frame (N).webp" files found in ${SRC_FRAMES}`);

  // Verify the sequence is contiguous — a hole would desync the whole film.
  const holes = [];
  for (let i = 0; i < indexed.length; i += 1) {
    if (indexed[i].index !== i + 1) holes.push(i + 1);
  }
  if (holes.length) throw new Error(`Frame sequence has gaps near: ${holes.slice(0, 5).join(', ')}`);

  await Promise.all(
    indexed.map(({ name }, i) =>
      fs.copyFile(
        path.join(SRC_FRAMES, name),
        path.join(STAGE, `src_${String(i + 1).padStart(4, '0')}.webp`),
      ),
    ),
  );

  console.log(`  staged ${indexed.length} frames`);
  return indexed.length;
}

async function buildTier({ id, filter, quality }) {
  const outDir = path.join(PUBLIC, 'frames', id);
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  await ff([
    '-start_number', '1',
    '-i', path.join(STAGE, 'src_%04d.webp'),
    '-vf', filter,
    '-fps_mode', 'passthrough',
    '-c:v', 'libwebp',
    '-quality', String(quality),
    '-preset', 'picture',
    '-compression_level', '6',
    '-start_number', '1',
    path.join(outDir, 'f_%04d.webp'),
  ]);

  const { count, bytes } = await dirSize(outDir);
  console.log(`  frames/${id}: ${count} frames, ${mb(bytes)} (${Math.round(bytes / count)} B avg)`);
  return { count, bytes };
}

async function buildStills() {
  const outDir = path.join(PUBLIC, 'stills');
  await fs.mkdir(outDir, { recursive: true });

  for (const { id, frame } of STILLS) {
    const src = path.join(STAGE, `src_${String(frame).padStart(4, '0')}.webp`);
    await ff([
      '-i', src,
      '-vf', `${DELOGO},scale=1600:900:flags=lanczos`,
      '-c:v', 'libwebp', '-quality', '86', '-preset', 'picture',
      path.join(outDir, `${id}.webp`),
    ]);
  }

  const { count, bytes } = await dirSize(outDir);
  console.log(`  stills: ${count} images, ${mb(bytes)}`);
}

/**
 * The supplied logo is a 150x150 JPEG of white lettering on black. Composited
 * naively it drags a grey box across any surface that is not pure black, so
 * derive straight alpha from luminance and crush JPEG ringing to zero.
 */
async function buildLogo() {
  const outDir = path.join(PUBLIC, 'brand');
  await fs.mkdir(outDir, { recursive: true });

  const files = (await fs.readdir(SRC_LOGO)).filter((n) => /\.(jpe?g|png|webp|svg)$/i.test(n));
  if (!files.length) throw new Error(`No logo image found in ${SRC_LOGO}`);
  const src = path.join(SRC_LOGO, files[0]);

  // Content bounds of the wordmark inside the 150x150 source, plus a hair of
  // margin. Cropping before upscaling keeps every available pixel of detail.
  const CROP = 'crop=100:47:26:51';
  const ALPHA = [
    'format=rgba',
    // alpha = brightest channel, with the JPEG noise floor clipped to zero so
    // the mark composites cleanly onto anything, not just pure black
    "geq=r='255':g='255':b='255':a='clip((max(max(r(X,Y),g(X,Y)),b(X,Y))-20)*1.45,0,255)'",
  ].join(',');

  await ff([
    '-i', src,
    '-vf', `${CROP},scale=iw*8:ih*8:flags=lanczos,${ALPHA}`,
    '-frames:v', '1',
    path.join(outDir, 'logo.png'),
  ]);

  // Square lockup for the favicon / share card.
  await ff([
    '-i', src,
    '-vf', `scale=512:512:flags=lanczos,${ALPHA}`,
    '-frames:v', '1',
    path.join(outDir, 'logo-square.png'),
  ]);

  const { size } = await fs.stat(path.join(outDir, 'logo.png'));
  console.log(`  brand/logo.png: ${(size / 1024).toFixed(1)} KB (800x376, straight alpha)`);
}

/**
 * Measure the average luminance of every baked frame.
 *
 * The hero uses this at runtime to decide how much scrim the typography needs:
 * the cut runs from a near-black lens to a blown-out sunrise aerial, and a
 * fixed overlay is either invisible on the dark act or a grey veil over the
 * bright one. Reading the film's own luminance lets the scrim breathe with it.
 */
async function measureLuminance(total) {
  const { stderr } = await exec(
    'ffmpeg',
    [
      '-hide_banner', '-v', 'info',
      '-start_number', '1',
      '-framerate', '30',
      '-i', path.join(PUBLIC, 'frames', 'hd', 'f_%04d.webp'),
      '-vf', 'signalstats,metadata=print',
      '-f', 'null', '-',
    ],
    { maxBuffer: 1024 * 1024 * 64 },
  );

  const luma = [];
  for (const line of stderr.split('\n')) {
    const match = line.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
    // signalstats reports Y on the limited-range scale, where 16 is black.
    if (match) luma.push(Math.round(Number(match[1])));
  }

  if (luma.length !== total) {
    throw new Error(`Luminance pass returned ${luma.length} samples for ${total} frames`);
  }

  console.log(`  luminance: ${Math.min(...luma)}–${Math.max(...luma)} across ${luma.length} frames`);
  return luma;
}

async function main() {
  // `npm run assets -- stills logo` re-bakes only what changed; baking the two
  // frame tiers is by far the slow part and rarely needs repeating.
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const wants = (step) => requested.length === 0 || requested.includes(step);

  console.log('Preparing hero assets…');
  const total = await stageSource();

  if (wants('frames')) for (const tier of TIERS) await buildTier(tier);
  if (wants('stills')) await buildStills();
  if (wants('logo')) await buildLogo();

  if (wants('manifest')) {
    const luma = await measureLuminance(total);
    await fs.writeFile(
      path.join(PUBLIC, 'frames', 'manifest.json'),
      `${JSON.stringify({
        total,
        tiers: TIERS.map((t) => t.id),
        pattern: 'f_%04d.webp',
        lumaScale: 'limited-range Y, 16 = black',
        luma,
      })}\n`,
    );
    console.log('  frames/manifest.json written');
  }

  await fs.rm(STAGE, { recursive: true, force: true });
  console.log(`Done. ${total} frames baked.`);
}

main().catch((err) => {
  console.error(err.stderr || err.message);
  process.exitCode = 1;
});
