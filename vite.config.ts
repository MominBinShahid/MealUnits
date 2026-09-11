import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { build as esbuild } from 'esbuild';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

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
      const walk = (dir: string, prefix: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const at = `${prefix}${entry.name}`;
          if (entry.isDirectory()) return walk(join(dir, entry.name), `${at}/`);
          if (entry.name.endsWith('.map')) return [];
          if (at === 'sw.js' || at === 'index.html') return [];
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
  plugins: [contentSecurityPolicy(), serviceWorker('dist')],
  define: {
    // §10.8: show the running build version. It is the only way to diagnose a
    // report from a phone that is not in front of you.
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
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
    include: ['test/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/core/**'] },
  },
});
