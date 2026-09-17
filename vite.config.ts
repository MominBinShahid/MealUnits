import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build as esbuild } from 'esbuild';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { ROUTES } from './src/routes.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// §11.5's content security policy. It is injected at build time rather than
// written into index.html, because the dev server needs inline script for hot
// reload and a policy that only holds in development is worse than none.
//
// frame-ancestors and report-uri are deliberately absent: a policy delivered in
// a meta tag ignores both, and listing a directive the browser drops reads as
// protection that is not there.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  // Vite inlines small assets as data URIs, and the icons are ours.
  "img-src 'self' data:",
  "font-src 'self'",
  // §10.8: the math is local and nothing leaves the device (§9, §14). There is
  // no endpoint this app is allowed to reach.
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'mealunits-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="utf-8" />',
        `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

const BASE = '/MealUnits/';

// The deployed origin, for the generated sitemap. `index.html` states the same
// address in its canonical link, its og:url and its JSON-LD, and two files
// holding one address is two things to keep in step — so `check-plan.py`
// asserts they agree rather than hoping.
const SITE_URL = 'https://mominbinshahid.github.io';

/**
 * §11.4 — "build-generated hashed-asset discovery" was the first item on the
 * list version 1's fifteen-line worker omitted. This plugin is that item: after
 * the client build it reads what was actually emitted and compiles the worker
 * with the manifest baked in.
 *
 * The worker is built separately, to a FIXED path. §11.5: "Worker path
 * `/MealUnits/sw.js` — never hashed, never nested." A hashed worker cannot be
 * found by a browser looking for the one it registered, and a nested one has a
 * narrower scope than the app it is meant to serve.
 */
/**
 * 4a's sitemap, GENERATED rather than written, for one element: `lastmod`.
 *
 * Google's own documentation is explicit that `<priority>` and `<changefreq>`
 * are ignored, and that `<lastmod>` is used "if it's consistently and
 * verifiably accurate". The first draft of this file shipped the two inert
 * elements by hand and omitted the one that works.
 *
 * `lastmod` cannot be hand-written, because a date maintained by memory rots on
 * exactly the change that should update it — the lesson §20.5's listing and the
 * precache walk above both already carry. It is the build date, which for this
 * app IS the last modification: every deploy is a new build of the page.
 *
 * ONE url, and that is not an oversight. Every screen is reached by tapping,
 * not by navigating; per-screen routes are BACKLOG entry 24, blocked on T3.
 * **When they land, each one belongs here with its own lastmod** — the build
 * date is right for all of them only while they ship as one build.
 *
 * The file sits under /MealUnits/ rather than at the domain root, which is
 * legitimate — a sitemap may list URLs at or below its own path — and has to be
 * submitted directly in Search Console, because the robots.txt crawlers
 * actually read is the apex one, served by a different repository.
 */
function sitemap(outDir: string): Plugin {
  return {
    name: 'mealunits-sitemap',
    apply: 'build',
    closeBundle() {
      const day = new Date().toISOString().split('T')[0];

      /**
       * BACKLOG 24 — one real file per route, so a shared link is a 200 on a
       * FIRST visit. The worker answers in-scope navigations with the shell,
       * but only once it is installed; a stranger opening a link has no worker,
       * and GitHub Pages serves files. Without this, `/history` is a 404 for
       * exactly the person the feature exists for.
       *
       * The file is the same shell with a different head. It carries no
       * content: the app still renders the screen, reading the path on boot.
       *
       * Every address is built from SITE_URL and BASE rather than written out.
       * `index.html` states the deployed path eight times by hand and
       * `check_site_url_agrees` exists because of it — four more pages would
       * have made that fifteen. See `T15`.
       */
      const shell = readFileSync(join(outDir, 'index.html'), 'utf8');
      const swap = (html: string, pattern: RegExp, replacement: string): string => {
        if (!pattern.test(html)) {
          throw new Error(`sitemap: ${String(pattern)} matched nothing in index.html — the head changed shape`);
        }
        return html.replace(pattern, replacement);
      };

      for (const route of ROUTES) {
        const url = `${SITE_URL}${BASE}${route.segment}`;
        let html = shell;
        html = swap(html, /<title>[^<]*<\/title>/, `<title>${route.title}</title>`);
        html = swap(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${route.description}" />`);
        html = swap(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
        html = swap(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
        html = swap(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${route.title}" />`);
        html = swap(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${route.description}" />`);
        html = swap(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${route.title}" />`);
        html = swap(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${route.description}" />`);
        mkdirSync(join(outDir, route.segment), { recursive: true });
        writeFileSync(join(outDir, route.segment, 'index.html'), html, 'utf8');
      }

      // Every route is its own `<loc>`. One `lastmod` is honest only while they
      // ship together, which they do — the build date is the day all five were
      // emitted.
      const entries = [BASE, ...ROUTES.map((route) => `${BASE}${route.segment}`)];
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries.flatMap((path) => [
          '  <url>',
          `    <loc>${SITE_URL}${path}</loc>`,
          `    <lastmod>${String(day)}</lastmod>`,
          '  </url>',
        ]),
        '</urlset>',
        '',
      ].join('\n');
      writeFileSync(join(outDir, 'sitemap.xml'), xml, 'utf8');
    },
  };
}

function serviceWorker(outDir: string): Plugin {
  return {
    name: 'mealunits-service-worker',
    apply: 'build',
    async closeBundle() {
      // DISCOVERED, never listed. This was `assets` and `icons` by name plus the
      // manifest, and adding self-hosted fonts under public/ made them invisible
      // to it: they shipped, they were referenced by the stylesheet, and they
      // were absent from the precache, so a cold offline start would have
      // silently fallen back to the system face.
      //
      // §20.5 and check-plan.py already learned this — a hand-maintained list of
      // inputs rots on exactly the change that adds one. The same reasoning
      // applies to a precache manifest, so the directory is walked.
      //
      // `sw.js` is excluded because a worker that precaches ITSELF serves its own
      // stale copy from cache and can never be replaced; `index.html` because it
      // is added as SHELL by the worker; and source maps because they are for a
      // developer at a desk, not a phone on mobile data.
      //
      // `social/` and `sitemap.xml` are excluded on that SAME argument, and it
      // took adding them to notice. 4a's link-preview card is 105 KB that no
      // running app ever requests — only a crawler or a chat client fetching a
      // preview does, from the network, once. Walking the whole directory put it
      // on the install path of every phone, which is the shape the source-map
      // exclusion above already rejected. An offline-first app pays for its
      // precache in someone's mobile data.
      const walk = (dir: string, prefix: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const at = `${prefix}${entry.name}`;
          if (entry.isDirectory()) {
            if (at === 'social') return [];
            return walk(join(dir, entry.name), `${at}/`);
          }
          if (entry.name.endsWith('.map')) return [];
          // `index.html` at ANY depth, not just the root. BACKLOG 24's routes
          // emit one shell per route, and the worker answers every in-scope
          // navigation with the SHELL it already holds — so precaching them
          // would put four more copies of the same bytes on the install path,
          // which is the shape the source-map exclusion above already rejects.
          if (at === 'sw.js' || entry.name === 'index.html') return [];
          if (at === 'sitemap.xml' || at === 'robots.txt') return [];
          return [`${BASE}${at}`];
        });
      const precache = walk(outDir, '');

      await esbuild({
        entryPoints: [new URL('./src/sw.ts', import.meta.url).pathname],
        outfile: join(outDir, 'sw.js'),
        bundle: true,
        format: 'iife',
        target: 'es2022',
        // A worker is not a module script here: `type: 'module'` workers are
        // supported unevenly, and nothing in this one needs imports.
        define: {
          __PRECACHE__: JSON.stringify(precache),
          __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
          __SCOPE_PATH__: JSON.stringify(BASE),
        },
      });
    },
  };
}

// §11.5: base is the repository path and is never './'. A relative base breaks
// the service worker scope and the manifest start_url, both of which have to be
// absolute for an install to be recognised as the same app.
export default defineConfig({
  base: BASE,
  plugins: [contentSecurityPolicy(), sitemap('dist'), serviceWorker('dist')],
  // T3's JSX, stated rather than inferred. Vite can read `jsx` and
  // `jsxImportSource` out of tsconfig, but this repository's root tsconfig is
  // solution-style (`files: []` plus references), so that path depends on the
  // resolver following a reference to find the options. It does; this does not
  // rely on it.
  //
  // `oxc`, not `esbuild`. Vite 8 transforms with oxc, and setting the esbuild
  // block instead produces "esbuild options will be ignored" on every run —
  // configuration that reads as deliberate and does nothing. There is no Babel
  // in any of this; `@preact/preset-vite` would have brought it, and cannot be
  // installed here because it peer-deps @babel/core 7 against Stryker 10's 8.
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'preact',
    },
  },
  define: {
    // §10.8: show the running build version. It is the only way to diagnose a
    // report from a phone that is not in front of you.
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
    // BACKLOG 24 — the app reads the deployed path to turn a URL into a screen,
    // from the SAME constant the worker's scope and the sitemap are built from.
    // Spelling it a second time is what `T15` is about.
    __SCOPE_PATH__: JSON.stringify(BASE),
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  /**
   * `npm run preview -- --host`, reached from a phone on the same wifi. This is
   * the ONLY way to test the things jsdom and headless Chrome cannot reach —
   * touch targets, the on-screen keyboard, Android's back gesture, and the
   * insecure-origin APIs §11.5 and note 48 are about.
   *
   * **Why a hostname rather than the IP.** Browser storage is per-ORIGIN, and a
   * router hands out a different lease whenever it feels like it: the app at
   * `192.168.1.40` and the app at `192.168.1.10` are two different installs
   * with two different databases, so every IP change lands on the first-run
   * screen with the record gone. macOS advertises a stable mDNS name —
   * `<machine>.local` — which resolves on the LAN without a DNS server and does
   * not move when the lease does. One origin, so the record survives.
   *
   * **Why this line is needed at all.** Vite's preview server refuses a request
   * whose `Host` header it does not recognise, and that refusal is a real
   * protection: without it a malicious page could use the browser as a relay to
   * a dev server through DNS rebinding. An unrecognised host gets a 403, which
   * is what `<machine>.local` was getting.
   *
   * **Why `.local` is a narrow allowance.** The leading dot matches the domain
   * and its subdomains, so this admits any machine's mDNS name rather than
   * hardcoding one developer's — and mDNS names resolve only on the local
   * link. They cannot be pointed at a public address, which is the attack the
   * allowlist exists to stop.
   *
   * It applies to `vite preview` and nothing else. No part of it reaches the
   * built output or GitHub Pages.
   */
  preview: {
    allowedHosts: ['.local'],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    coverage: { provider: 'v8', include: ['src/core/**'] },
  },
});
