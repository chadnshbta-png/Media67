import { Studio } from './Studio';
import { Process } from './Process';
import { LogoPortal } from './LogoPortal';
import { Work } from './Work';
import { Services } from './Services';
import { Why } from './Why';
import { Contact } from './Contact';
import { WORK } from '../../content/site';

/**
 * Everything below the hero, in one lazily-imported chunk.
 *
 * The order is a running order, not a stack of blocks: the studio states its
 * position, the process moves through the making of it, the mark opens onto
 * the work itself, the services list what that work is, the values land, and
 * the page returns to the black it started in.
 *
 * It mounts while the film is still loading — invisible, scroll-locked and with
 * all of its imagery lazy — so the hero never shares a frame with a large
 * React commit.
 */
export default function Sections() {
  return (
    <>
      <Studio />
      <Process />
      {/* Passes the viewer through the brand mark and into the first plate,
          which is why it is handed the same image Work opens on. */}
      <LogoPortal image={WORK.projects[0].still} />
      <Work />
      <Services />
      <Why />
      <Contact />
    </>
  );
}
