/**
 * The four screens that have an address, and nothing else does.
 *
 * `BACKLOG` 24's test, and it is the whole rule: **a screen that means the same
 * thing whenever you open it.** A link is opened days later by someone with no
 * context, so every routable screen has to be safe to arrive at cold.
 *
 * **What is excluded is a safety exclusion, not a scoping one.** The calculator
 * is absent because §8.2 expires a result after `RESULT_EXPIRY_MINUTES` — a URL
 * that can restore a screen is a URL that can restore a dose, and a link is
 * exactly the artefact that gets opened next week. Export is absent because it
 * is an action, not a place; a URL that performs one on open is a worse idea.
 * `loading` and `fail_closed` are states rather than destinations, and the two
 * first-run screens are gates — a link past a disclaimer defeats the disclaimer.
 *
 * This table is the ONE place the mapping lives. `vite.config.ts` reads it to
 * emit a real file per route and to write the sitemap; `app.tsx` reads it to
 * turn a path into a screen and back. Two lists would drift the day one route
 * is renamed, and the failure — a link that 404s, or a page whose canonical
 * points at another — is invisible until a stranger clicks it.
 *
 * Nothing is imported here on purpose: the build config loads this file
 * directly, so a dependency would drag the app's module graph into the build.
 */

/** The screen names this table may address. Kept structural rather than imported — see above. */
export type RoutableScreen = 'settings' | 'history' | 'how_it_works' | 'food_list';

export interface Route {
  /** The path segment under `BASE`. No leading or trailing slash. */
  readonly segment: string;
  readonly screen: RoutableScreen;
  /** The page's own `<title>`, which is also what a shared link shows. */
  readonly title: string;
  /**
   * The per-route description. Written to be read by someone deciding whether
   * to tap a link, not by a crawler — §10.2's rule that the words are the
   * specification does not stop at the app's edge.
   */
  readonly description: string;
}

export const ROUTES: readonly Route[] = [
  {
    segment: 'how-it-works',
    screen: 'how_it_works',
    title: 'How this works — MealUnits',
    description:
      'How a mealtime insulin dose is worked out: the correction, the meal dose, and what the app cannot know about.',
  },
  {
    segment: 'foods',
    screen: 'food_list',
    title: 'Carbohydrate in Pakistani food — MealUnits',
    description:
      'Carbohydrate per real portion for everyday Pakistani food, each value with its source and how well measured it is.',
  },
  {
    segment: 'history',
    screen: 'history',
    title: 'Your record — MealUnits',
    description:
      'Every dose logged on this device, with the reading and the carbohydrate it was worked out from.',
  },
  {
    segment: 'settings',
    screen: 'settings',
    title: 'Settings — MealUnits',
    description:
      'The three numbers your doctor set, and the choices the app makes with them.',
  },
] as const;

/**
 * The title for the app's own front door, and the fallback for every screen
 * without an address. Must match `index.html`'s `<title>`, which is where a
 * first visit gets it from — `check_route_titles_agree` asserts that rather
 * than hoping.
 */
export const DEFAULT_TITLE = 'MealUnits — mealtime insulin calculator for type 1 diabetes';

/** The title for a screen: its own if it has an address, the front door's otherwise. */
export function titleForScreen(screen: string): string {
  return ROUTES.find((route) => route.screen === screen)?.title ?? DEFAULT_TITLE;
}

/** The screen a path addresses, or `null` for anything else — including the app's own front door. */
export function screenForPath(pathname: string, base: string): RoutableScreen | null {
  if (!pathname.startsWith(base)) return null;
  const rest = pathname.slice(base.length).replace(/\/$/, '');
  return ROUTES.find((route) => route.segment === rest)?.screen ?? null;
}

/**
 * The path a screen lives at. Anything unroutable answers with `base` — the
 * calculator's address, and the only honest answer for a screen that has none.
 */
export function pathForScreen(screen: string, base: string): string {
  const route = ROUTES.find((entry) => entry.screen === screen);
  return route === undefined ? base : `${base}${route.segment}`;
}
