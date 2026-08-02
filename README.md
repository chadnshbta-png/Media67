# Media Six Seven — Cinematic Landing Experience

A single-page site whose hero is a 720-frame cinema sequence the visitor scrubs
through by scrolling. There is no video element and no autoplay anywhere: scroll
position *is* the playhead, forwards and backwards.

```bash
npm install
npm run assets     # one-time: bake the frame sequence, stills, logo, manifest
npm run dev
```

`npm run build` type-checks and bundles. `npm run preview` serves the build.

---

## The asset pipeline

`npm run assets` reads the delivered footage in `frame/` and the logo in `Logo/`
and bakes everything the site actually ships. It is a one-time step; its output
lives in `public/` and is what the app loads.

It exists because the source assets could not be used as delivered:

| Problem in the source | What the pipeline does |
| --- | --- |
| Every frame carries an AI-generator sparkle watermark in the lower right | `ffmpeg delogo` inpaints it from the surrounding band |
| Files are named `frame (7).webp` — not addressable by a numeric URL pattern | Re-emits a zero-padded sequence, `f_0007.webp` |
| One resolution only | Bakes an `hd` (1280×720) and an `sm` (768×432) tier |
| No content data for the runtime to reason about | Measures per-frame luminance into `frames/manifest.json` |
| Logo is a 150×150 JPEG of white lettering on black | Crops to the wordmark, upscales, derives straight alpha from luminance |

Re-run individual steps rather than the whole thing:

```bash
npm run assets -- stills        # just the editorial stills
npm run assets -- manifest      # just the luminance pass
npm run assets -- frames logo   # tiers and brand mark
```

**Output weight:** `hd` 15.2 MB, `sm` 7.9 MB, stills 0.5 MB.

---

## The hero

### Scrubbing, not playing

The hero is pinned for `720 × 7.5px` of scroll (5.5px per frame on small
screens, with a floor of 4.5 viewport heights). A single GSAP timeline of
duration exactly `1` is bound to that pin with `scrub: true`, and the film is
one tween inside it:

```ts
tl.to(playhead, { frame: total, duration: 1, ease: 'none', snap: { frame: 1 }, onUpdate: paint }, 0);
```

Because that tween's duration is `1`, every other position in the timeline is a
true fraction of the scroll, which is what lets the story beats below be
expressed in frames rather than hand-tuned percentages.

### Memory: why there are two layers

Decoding all 720 `hd` frames to `ImageBitmap` would cost ~2.6 GB, so
`FrameLibrary` keeps two:

- **Every frame** is preloaded as an `HTMLImageElement` and never released
  (~15 MB of compressed bytes). This is what makes the hero interactive only
  once the *whole* film is present — a scrubbed hero can be at frame 700 a
  second after arriving, so there is no such thing as "buffered far enough
  ahead". It also guarantees `drawImage` always has a synchronous source, so
  the canvas can never tear, flash white, or fall back to empty.
- **A bounded ring** of decoded `ImageBitmap`s tracks the playhead, sized from
  `navigator.deviceMemory` and biased in the direction of travel so scrubbing
  backwards is as cheap as scrubbing forwards. The ring is primed before scroll
  is handed over, so the first scrub never pays to build it.

`SequenceCanvas` has no clock. It answers "put frame N on screen" and refuses
even that when frame N is already showing.

### Story beats

Reveals are anchored to frames in `src/lib/film/config.ts`, each recording what
is on screen at that moment. All scroll positions derive from `frame / total`,
so changing the sequence length re-lands every beat automatically.

| Frame | Element | On screen |
| --- | --- | --- |
| 214 | Logo | the lens becomes the dominant element |
| 258 | `ONE` | the camera begins entering the lens |
| 286 | `LENS.` | a moment further inside |
| 312 | `ENDLESS` | the filmmaking journey begins |
| 470 | `STORIES.` | the strongest storytelling moment |
| 520 | Paragraph | the aerial climbs into open sky |
| 628 | CTA | the lens returns, near the end |
| 686 | Mark → navbar | the film settles into black |

This cut has **no hard cuts** — it is built entirely from dissolves, verified by
a luminance pass over all 720 frames — so automatic shot detection cannot
produce meaningful beats. These are editorial marks read off the footage.

### The scrim reads the film

The cut runs from a near-black lens (luma 16) to a blown-out sunrise aerial
(luma 180). A fixed overlay would be invisible on one act and a grey veil over
the other, so the scrim behind the typography is driven per frame from the
measured luminance in the manifest — nearly absent through the dark lens act,
firm over the aerial, and never heavy enough to flatten the image.

### The brand mark

One element for the whole page. It fades up out of the film when the lens fills
the frame, breathes once (1 → 1.03 → 1), rides the hero, and then travels into
the navigation bar as the film settles to black. There is no second copy to
cross-fade with.

Its position is derived from the hero's playhead (`heroStage`) rather than its
own ScrollTrigger, so it cannot drift out of sync with the pin. Anchors are
measured *relative to the hero element*: while the hero is pinned its box is the
viewport, which makes the measurement correct at any scroll position without a
scroll term.

---

## Performance

Measured in headless Chrome over a sustained scrub (`--use-angle=swiftshader`;
do **not** measure with `--disable-gpu`, which throttles rAF to ~13 fps and is
not representative):

| | median frame | p95 | fps |
| --- | --- | --- | --- |
| Hero scrub | 7.0 ms | 48.6 ms | 72.8 |
| Ordinary page scroll | 20.8 ms | 27.8 ms | 53.9 |
| Hero idle | 6.9 ms | 7.0 ms | 143.4 |

CPU profile during a scrub: **68.8% idle**, GSAP/Lenis 5.4%, the app's own paint
path 0.5%. The scrub costs less main thread than scrolling the rest of the page.

Other measures: below-the-fold sections are a lazy chunk; all imagery below the
hero is `loading="lazy"`; DPR is capped at 2; resizes are coalesced to one per
painted frame. Note there is deliberately **no** `content-visibility: auto` on
sections — it zeroes the rects of skipped descendants, which silently corrupts
every ScrollTrigger measured against them.

**Reduced motion:** `prefers-reduced-motion` skips the film entirely — nothing is
downloaded, the hero is a still with the typography already resolved, and the
mark docks on a short ordinary scroll.

---

## Below the hero

The page is a running order, not a stack of blocks. Each part has its own
**animation identity** so nothing repeats, and they share one opening gesture —
a label rising out of a mask — so it still reads as one piece.

| Act | Identity | What happens |
| --- | --- | --- |
| Studio | **focus pull** | The statement arrives defocused and resolves word by word as you travel it — the same gesture the film opens with. |
| Process | **depth** | Pinned. Five stages take the screen in turn, arriving from below out of focus and receding upward; a chapter rail tracks where you are. |
| Portal | **travel** | Pinned. The first project is visible only inside the brand mark's letterforms, which rush toward you until an aperture opens through them. |
| Work | **lateral travel** | Pinned. Vertical scroll becomes horizontal; each project holds the full screen, the ones either side sit back in the dark. |
| Services | **line reveal** | Each rule draws itself and each title rises out of a mask, so the list builds like credits. |
| Why | **scale + mask** | Pinned. Each value grows into focus, holds alone, then scales past you as the next arrives. |
| Contact | **iris out** | Pinned. The lens holds the screen, the aperture closes to nothing, and the invitation is what is left. |

Two details make it hold together:

- **The lens is carried through.** The hero ends on cinema glass; the portal
  travels into that same optic; Featured Work opens on it (*Optics*, panel one,
  the identical frame — which is what makes the join invisible); and the page
  closes by shutting the same aperture. No warm or off-brand imagery is used at
  a transition.
- **`chromeVeil`** (`src/lib/motion/chrome.ts`) lets a section ask the header
  and brand mark to step aside. The portal raises it: a full-screen brand mark
  with a small copy of itself pinned in the corner would read as a bug.

### Pinned sections must declare `refreshPriority`

The hero's pin is created **last** — it waits for the whole film to load — but
sits **first** in the document and adds ~5400px in front of everything. Without
an explicit refresh order, every later pinned section keeps the start position
it measured before the hero's pin existed and activates thousands of pixels
early. Order is hero 5, process 4, portal 3, work 2, why 1. If you add another
pinned section, give it a priority consistent with its document position.

---

## Structure

```
scripts/prepare-assets.mjs   asset pipeline (ffmpeg)
src/
  lib/film/                  config + beats, FrameLibrary, SequenceCanvas, heroStage
  lib/motion/                gsap + ScrollTrigger registration, Lenis, scroll lock
  components/hero/           Hero, useFilm, IntroLoader
  components/chrome/         Header, Brandmark
  components/sections/       Studio, Process, Work, Services, Why, Contact
  content/site.ts            every word on the site
  styles/                    tokens + global
```

---

## Before launch

These are placeholders, written to the right shape and tone but not real:

- **Project slate** in `src/content/site.ts` — titles, disciplines and years for
  the four Featured Work panels are invented. So is the contact address
  (`hello@mediasixseven.com`) and the city.
- **Project imagery** — the Work, Process and Services stills are frames lifted
  from the hero film, because no separate project assets were supplied. Replace
  `public/stills/` and the `still` paths in `site.ts` with real work. Note that
  `WORK.projects[0].still` is also the portal's plate: keep those two the same
  image, or the transition into the gallery will visibly cut.
- **The logo is 150×150.** Everything downstream is derived from it, so it is
  soft at large sizes and is used restrained for that reason. Drop a vector or a
  ≥1000px master into `Logo/` and re-run `npm run assets -- logo`; the crop box
  in `prepare-assets.mjs` will need adjusting to the new dimensions.
