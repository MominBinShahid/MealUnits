/**
 * §11.4 — the hand-written service worker.
 *
 * Version 1 claimed a worker covering precache, cache-first and cleanup is "~15
 * lines, 374 B". **That claim was withdrawn**, and §11.4 lists what it omitted:
 * build-generated hashed-asset discovery, versioned shells, install-failure
 * handling, navigation fallback for failed AND non-OK responses, a policy for
 * hanging requests, waiting-worker detection at startup, update messaging and
 * activation acknowledgement, multiple open clients, old-asset retention while
 * old clients still need them, and app-scoped cache cleanup on a shared origin.
 *
 * "Either is defensible; pretending the work is 15 lines is not." This file is
 * the list.
 *
 * Two corrections §11.4 also makes, both load-bearing here:
 *   - **`registerType: 'prompt'` is a vite-plugin-pwa option, not a browser
 *     API.** A hand-written worker implements the prompt protocol itself, which
 *     is the `SKIP_WAITING` message below.
 *   - **`max-age=600` is a freshness directive, not deletion.** The argument for
 *     needing a worker is the absence of a reliable, complete OFFLINE
 *     APPLICATION CONTRACT from the HTTP cache — not a ten-minute expiry.
 */

/// <reference lib="webworker" />

export {};

/**
 * `self` is already declared by the WebWorker lib as a `WorkerGlobalScope`, so
 * it cannot be re-declared as the narrower service-worker type. Narrowing it
 * through a name of our own is the difference between `event.respondWith`
 * type-checking and being invisible.
 */
const sw = self as unknown as ServiceWorkerGlobalScope;

/** Injected at build time: every hashed asset this version needs. */
declare const __PRECACHE__: readonly string[];
declare const __BUILD_ID__: string;
declare const __SCOPE_PATH__: string;

/**
 * §11.7 — this origin is shared with the blog, and "every project on
 * `mominbinshahid.github.io` shares one storage area, ONE CACHE STORE, one
 * worker registration map, one quota."
 *
 * `caches.keys()` is ORIGIN-WIDE. The prefix is what makes cleanup safe: an
 * unfiltered sweep here would delete the blog's `gatsby-plugin-offline` cache
 * and take its offline support with it.
 */
const CACHE_PREFIX = 'mealunits-';
const CACHE = `${CACHE_PREFIX}${__BUILD_ID__}`;
const SHELL = `${__SCOPE_PATH__}index.html`;
/**
 * §11.4 — "a policy for hanging requests". A promise that never settles is a
 * spinner forever, on a phone that may be on a train.
 *
 * THE ONLY DEFINITION. §11.8 sends every number to `config.ts`, and this file
 * is exempt in `eslint.config.js` for a structural reason rather than a
 * convenient one: the worker compiles in its own TypeScript project against
 * the WebWorker lib and cannot import from the app's module graph at all.
 */
const NETWORK_TIMEOUT_MS = 8000;

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async (): Promise<void> => {
      const cache = await caches.open(CACHE);
      // §11.4 — INSTALL-FAILURE HANDLING. `addAll` rejects as a unit, so a
      // partial precache can never be left behind claiming to be complete. The
      // old worker stays in control, which is the correct outcome: a half-cached
      // version is worse than the previous whole one.
      await cache.addAll([...__PRECACHE__, SHELL]);
    })(),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async (): Promise<void> => {
      // §11.4 — app-scoped cleanup on a shared origin. Only THIS app's
      // superseded caches, and §13.3's case asserts three things: the blog's
      // registration and caches are untouched, this app's own registration is
      // still active, and the caches this version needs are still present.
      //
      // A worker does not unregister itself on activate, and nothing here tries
      // to: §7.9 ruled that a data control must not have a code side-effect, and
      // the same reasoning runs the other way.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      // Take over open clients so the blog's root-scoped worker stops serving
      // this path. §11.6: "longest-prefix scope does not switch an
      // already-controlled client's worker at activation" — registering is not
      // controlling, and this is what closes that window.
      await sw.clients.claim();
    })(),
  );
});

/** §11.4 — a network attempt that cannot hang forever. */
async function fetchWithTimeout(request: Request): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, NETWORK_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // §11.7 — never touch anything outside this app's scope. The blog lives at the
  // same origin, and intercepting its requests is the exact defect `BLOG-FIX.md`
  // exists to remove, pointed the other way.
  if (url.origin !== sw.location.origin) return;
  if (!url.pathname.startsWith(__SCOPE_PATH__)) return;

  /**
   * §11.4's UPDATE COHERENCE, and the reason navigations are cache-first.
   *
   * "Network-first HTML defeats prompt-controlled releases — worker v1 stays
   * active while v2 waits, but a navigation can fetch HTML v2 referencing assets
   * v2, so the user runs application v2 WITHOUT EVER ACCEPTING."
   *
   * Serving the cached shell keeps the HTML, the assets, the worker and the
   * schema on one version until the new worker activates. The update lands as a
   * whole or not at all.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      (async (): Promise<Response> => {
        const cached = await caches.match(SHELL);
        if (cached) return cached;
        try {
          const response = await fetchWithTimeout(request);
          // §11.4 — navigation fallback for FAILED AND NON-OK responses. A 404
          // page from the host is not the app, and returning it would leave him
          // staring at someone else's error.
          if (response.ok) return response;
        } catch {
          // fall through
        }
        const shell = await caches.match(SHELL);
        return shell ?? Response.error();
      })(),
    );
    return;
  }

  event.respondWith(
    (async (): Promise<Response> => {
      // Assets are content-hashed, so a hit is always the right file for this
      // version. §11.4's "old-asset retention while old clients still need them"
      // falls out of that: the previous version's cache is only deleted once its
      // worker has been replaced.
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetchWithTimeout(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});

/**
 * §11.4 — the prompt protocol, hand-written, plus ACTIVATION ACKNOWLEDGEMENT.
 *
 * The page asks; the worker steps forward; `controllerchange` in the page is the
 * acknowledgement. Nothing updates without the tap, which is what makes the
 * prompt mean anything.
 */
sw.addEventListener('message', (event) => {
  const data: unknown = event.data;
  if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING') {
    void sw.skipWaiting();
  }
});
