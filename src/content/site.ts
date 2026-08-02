/**
 * Every word on the site, in one file.
 *
 * PLACEHOLDER: project titles, disciplines, years and the contact details are
 * written to the right shape and tone but are not real credits — replace them
 * with the studio's actual slate before launch. The project imagery is pulled
 * from the hero film for the same reason.
 */

export const BRAND = {
  name: 'Media Six Seven',
  tagline: 'The Social House',
  email: 'hello@mediasixseven.com',
  city: 'Dubai',
} as const;

export const NAV = [
  { label: 'Studio', href: '#studio' },
  { label: 'Process', href: '#process' },
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
] as const;

/**
 * The headline arrives one word at a time as the film plays under it. Each word
 * names the story beat it belongs to — see BEATS in lib/film/config.ts for what
 * is happening on screen at that moment.
 */
export const HERO = {
  headline: [
    { text: 'One', beat: 'one', line: 0 },
    { text: 'Lens.', beat: 'lens', line: 0 },
    { text: 'Endless', beat: 'endless', line: 1 },
    { text: 'Stories.', beat: 'stories', line: 1 },
  ],
  lead: 'We transform ideas into cinematic experiences that people remember.',
  cta: 'Start Your Project',
  scrollCue: 'Scroll',
} as const;

export const STUDIO = {
  index: '01',
  label: 'Who We Are',
  statement:
    'A film-first studio for brands that would rather be remembered than merely seen.',
  body: [
    'Media Six Seven is a creative house built around a single discipline: cinema.',
    'Strategy, camera, colour and cut live under one roof — so the idea that leaves the room is the idea that reaches the screen.',
  ],
} as const;

export const PROCESS = {
  index: '02',
  label: 'Our Process',
  /** Each stage takes the whole screen in turn, over its own frame of the film. */
  stages: [
    {
      n: '01',
      title: 'Vision',
      copy: 'We find the idea worth filming before a single frame exists.',
      still: '/stills/svc-photography.webp',
    },
    {
      n: '02',
      title: 'Planning',
      copy: 'Boards, beats, locations, logistics. Nothing is left to the day.',
      still: '/stills/atmosphere.webp',
    },
    {
      n: '03',
      title: 'Production',
      copy: 'Crew, camera, light. The set runs on intention, not improvisation.',
      still: '/stills/svc-brand-films.webp',
    },
    {
      n: '04',
      title: 'Editing',
      copy: 'Rhythm, colour and sound. This is where footage becomes a film.',
      still: '/stills/svc-post.webp',
    },
    {
      n: '05',
      title: 'Delivery',
      copy: 'Every frame, every format, finished to the last pixel.',
      still: '/stills/svc-aerial.webp',
    },
  ],
} as const;

export const WORK = {
  index: '03',
  label: 'Featured Work',
  /*
   * Order matters. The first project is what the viewer travels into through
   * the brand mark, so it has to continue the lens the hero ends on — the
   * portal and this panel are the same frame, which is what makes the join
   * between them invisible.
   */
  projects: [
    { id: 'optics', title: 'Optics', discipline: 'Brand Film', year: '2025', still: '/stills/optics.webp' },
    { id: 'atelier', title: 'Atelier No. Six', discipline: 'Fragrance Film', year: '2025', still: '/stills/atelier.webp' },
    { id: 'skyline', title: 'Skyline', discipline: 'Aerial Brand Series', year: '2025', still: '/stills/skyline.webp' },
    { id: 'the-cut', title: 'The Cut', discipline: 'Post & Colour', year: '2024', still: '/stills/the-cut.webp' },
  ],
} as const;

export const SERVICES = {
  index: '04',
  label: 'Services',
  items: [
    { n: '01', title: 'Brand Films', copy: 'Long-form storytelling that gives a company a voice.', still: '/stills/svc-brand-films.webp' },
    { n: '02', title: 'Commercials', copy: 'Scripted, scheduled, shot and delivered on brief.', still: '/stills/svc-commercials.webp' },
    { n: '03', title: 'Social Content', copy: 'Cinema-grade craft, cut for the feed.', still: '/stills/svc-social.webp' },
    { n: '04', title: 'Aerial & Drone', copy: 'Scale, movement and geography from the air.', still: '/stills/svc-aerial.webp' },
    { n: '05', title: 'Post Production', copy: 'Edit, colour, sound design and finishing.', still: '/stills/svc-post.webp' },
    { n: '06', title: 'Photography', copy: 'Stills that speak the same language as the film.', still: '/stills/svc-photography.webp' },
  ],
} as const;

export const WHY = {
  index: '05',
  label: 'Why Media Six Seven',
  points: [
    { title: 'One roof.', copy: 'Idea, camera and cut never change hands.' },
    { title: 'Cinema discipline.', copy: 'Shot lists, not guesswork. Every frame is a decision.' },
    { title: 'Built to last.', copy: 'Work that performs this quarter and still holds up next year.' },
  ],
} as const;

export const CTA = {
  headline: ['Ready to create', 'something unforgettable?'],
  button: 'Start Your Project',
} as const;
