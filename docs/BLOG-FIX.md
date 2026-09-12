# Blog service-worker fix — investigation and plan

**Repo:** `/Users/mominbinshahid/OSS/MominBinShahid.github.io`
**Relationship to this project:** build step 0 (`PLAN.md` §17, §20.2). Ships **before** the app,
so the change has time to propagate.
**Status:** **§4's fix is applied and verified, in the working tree only.** Nothing stashed,
nothing committed, no branch, no PR — Momin's ruling of 6 Sep 2026 (§7). §6's avatar change is
**withdrawn**; that file is his and is untouched.

**Why this file exists:** everything below was established through a dozen read-only tool calls
and is not recoverable from `PLAN.md`. It is written so the work survives a lost conversation.

---

## 1. The problem, confirmed live

`https://mominbinshahid.github.io/sw.js` returns **HTTP 200, 4844 bytes, workbox-v4.3.1**, and
contains:

```js
workbox.routing.registerRoute(/(\.js$|\.css$|static\/)/, new workbox.strategies.CacheFirst(), 'GET')
```

The regex is **unanchored**, and Workbox matches same-origin requests on partial URLs. So
`/<app>/assets/index-abc123.js` matches and is served **cache-first with no expiration** by a
2019 service worker, on any browser that has ever visited the blog.

Other routes in the deployed worker (all fine, leave alone): a `page-data/*.json`
StaleWhileRevalidate, an image/font/asset route, a Google Fonts route, and a `navigationRoute`.

**Scope note:** the blog's worker registers at `/` because `gatsby-plugin-offline` calls
`register('/sw.js')` with no scope option.

---

## 2. Repository state as found

```
branch: main (tracking origin/main)
21 modified/untracked files
1 existing stash:  stash@{0}: On main: upgraded version
```

**The 21 files are a coherent build-environment modernization, not stray edits:**

| Change | Detail |
|---|---|
| Node | `>=14.16.1` → `>=16.0.0`; volta pin `14.21.3` → `16.20.2` |
| npm | `~6.14.12` → `>=8.0.0` |
| CPU | added `arm64` (Apple Silicon) |
| Scripts | added `install:apple-silicon`; tidied `clean-install` |
| Security overrides | pinned `undici ^5.28.4`, `sharp ^0.32.6`, `cheerio 1.0.0-rc.12`, `remark-mdx`, `whatwg-mimetype`, `whatwg-encoding`, `hast-util-raw`, plus per-plugin sharp overrides |

Also modified: `config.js`, `.github/workflows/deployment.yml`, `.codesandbox/Dockerfile`, eight
content markdown files, `docs/notes.md`, `docs/setup.md`, `src/utils/quotes.js`,
`src/components/PageLayout/Sidebar/sidebar.module.less`.

**Do not stash this work.** It is a **prerequisite**: verifying the fix requires building
locally, and the committed `package.json` still declares Node 14.21.3 while the machine runs
v16.20.2. Stashing likely breaks the build.

Running environment as found: `node v16.20.2`, `node_modules` present.

---

## 3. Versions — and why NOT to upgrade Gatsby

| Package | Declared | Installed |
|---|---|---|
| `gatsby` | `^2.29.2` | — |
| `gatsby-plugin-offline` | `^3.1.2` | **3.10.2** |
| `gatsby-plugin-manifest` | `^2.9.1` | — |
| `workbox-build` | — | **4.3.1** |

`PLAN.md` §11.6 originally said "upgrade `gatsby-plugin-offline` to a precache-manifest version."
**That is wrong for this repo.** Those versions require Gatsby 4+, so it would mean a Gatsby 2 → 4
framework migration for a one-line problem.

---

## 4. The fix — a `workboxConfig` override

The offending route is the plugin's own **default**, hardcoded in
`node_modules/gatsby-plugin-offline/gatsby-node.js`:

```
line 138:  dontCacheBustURLsMatching: /(\.js$|\.css$|static\/)/,
line 139:  runtimeCaching: [{
line 142:    urlPattern: /(\.js$|\.css$|static\/)/,
```

**And the plugin exposes `workboxConfig`** (lines 94–95, validated by a Joi schema at line 219),
merged at:

```
line 162:  var combinedOptions = _.merge(options, workboxConfig);
```

`_.merge` merges arrays **by index**, so supplying `runtimeCaching: [{ urlPattern: … }]` replaces
only `urlPattern` on element 0 and leaves every other route untouched.

**Change `gatsby-config.plugins.js` only.** The plugin is currently a bare string on line 34;
it becomes an object with options:

#### The full route table — CORRECTED, and the earlier fix was wrong [R2, round 14]

**An earlier draft of this file targeted `runtimeCaching[0]` alone. That does not work**, and
[R2] proved it by reading the installed plugin. The generated worker registers **four** runtime
routes plus a navigation route, and **Workbox serves the first route that matches** — excluding a
URL from one route does not exclude it from the routes after it.

| # | Pattern (as installed) | Handler | Catches `/MealUnits/` assets? |
|---|---|---|---|
| 0 | `/(\.js$\|\.css$\|static\/)/` | CacheFirst | **YES** — the route this file has always been about |
| 1 | `/^https?:.*\/page-data\/.*\.json/` | StaleWhileRevalidate | No — the app has no `/page-data/` path |
| 2 | `/^https?:.*\.(png\|jpg\|jpeg\|webp\|avif\|svg\|gif\|tiff\|js\|woff\|woff2\|json\|css)$/` | StaleWhileRevalidate | **YES — it matches `.js` and `.css` again.** Missed entirely until round 14 |
| 3 | `/^https?:\/\/fonts\.googleapis\.com\/css/` | StaleWhileRevalidate | No |
| + | `/\/.gatsby-plugin-offline:.+/` — registered separately in `sw-append.js`, and present in the deployed worker | API handler | No — it requires the literal `gatsby-plugin-offline:` in the URL, which no app URL contains [R1] |

**So routes 0 and 2 both need the exclusion.** Route 2 is the one that would have made the fix
look successful and leave the app still intercepted.

#### The navigation route needs no change — and here is why, because it is not obvious

`navigateFallbackBlacklist` **does nothing in this plugin** [R2]. Workbox emits it only when
`navigateFallback` is configured; `gatsby-plugin-offline` instead appends its own `NavigationRoute`
in `sw-append.js` with no blacklist option. **Any earlier instruction in this file to add a
navigation denylist entry was wrong and is withdrawn.**

But reading that handler through (`sw-append.js`, lines 80–99) shows it is already safe:

```js
const resources = await idbKeyval.get(`resources:${pathname}`)
if (!resources || !(await caches.match(`%pathPrefix%/%appFile%`))) {
  return await fetch(event.request)     // <- /MealUnits/ lands here
}
```

There is no `resources:/MealUnits/` key — that store is populated by the blog's own page visits —
so a navigation to the app **falls through to the network**. Safe, and it must be **tested rather
than assumed**, because it depends on the plugin's internals rather than on anything configured.

#### Scope protects the app — but only once its worker is installed AND in control

Service-worker scope uses **longest-prefix matching**, so the app's own worker at `/MealUnits/`
takes that path in preference to the blog's root-scoped worker.

**An earlier draft called the exposure "the first visit". That understates it** [R2].
**Registering a worker does not transfer control of a client that is already loaded** — control
passes on the next navigation, or an explicit `clients.claim()`. And if the app's worker fails to
install at all, the blog's worker keeps serving those URLs on *every* visit, indefinitely. The
window is therefore "until the app's worker is installed **and** controlling", which is exactly
why §5's transition tests are mandatory rather than a formality.

Inside that window route 0 is `CacheFirst`, so the blog's worker caches the app's assets under
`gatsby-plugin-offline`. **The staleness risk is bounded for content-hashed files** — a rebuilt
app asks for a new filename, so a cached old one is simply never requested again — but it is
**unbounded for anything served at a stable URL**, and either way it consumes the shared origin's
quota.

#### The change — `gatsby-config.plugins.js` only

`_.merge` merges arrays **by index**, so an entry supplied at a given index overrides only the
keys it names and leaves the rest of that route, and every other route, untouched.

```js
{
  resolve: `gatsby-plugin-offline`,
  options: {
    workboxConfig: {
      runtimeCaching: [
        { urlPattern: /^(?!.*\/MealUnits\/).*(?:\.js$|\.css$|static\/)/ },
        {},                                    // page-data — unchanged.
                                               // LOAD-BEARING: see below
        { urlPattern: /^(?!.*\/MealUnits\/)https?:.*\.(png|jpg|jpeg|webp|avif|svg|gif|tiff|js|woff|woff2|json|css)$/ },
      ],
      dontCacheBustURLsMatching: /^(?!.*\/MealUnits\/).*(?:\.js$|\.css$|static\/)/,
    },
  },
}
```

**The empty `{}` at index 1 is load-bearing — do not tidy it away** [R1, verified by executing
`_.merge` against the blog's own lodash 4.17.21]. Because the merge is **by index**, deleting it
slides route 2 up into slot 1, and route 2's *original* pattern then re-intercepts
`/MealUnits/assets/index-*.js` through `StaleWhileRevalidate` — **the exact round-14 failure,
resurrected by one edit that looks like removing dead weight.** It reads as pointless precisely
because its job is to occupy a position, so it is the kind of line a later cleanup deletes. Every
route's *position* is part of the fix, not just its pattern. `check-plan.py` fails the dispatch if
this placeholder disappears.

**Every pattern above is a candidate, to be verified against the generated `public/sw.js` per §5 —
never trusted.** The check is not "does the config look right" but "does the built worker contain
any route that can match a `/MealUnits/` URL".

This is explicitly a **temporary fix** — the blog is to be rebuilt later, so elegance is not the
goal.

---

## 5. Verification — do not skip

1. Build locally with the environment work in place.
2. **Read the generated `public/sw.js`** and confirm the unanchored regex is gone or scoped. Do
   not assume.
3. After deploy, test from a browser that **still holds the old blog worker**, visiting the app
   URL **cold, without visiting the blog first.** That is the actual exposure path and the one
   nobody tests.
4. Also test: failed installation, offline launch, and an update with two clients open.

**Note:** the maintainer's own browser is the most likely to hold the stale worker, since he is
the one who visits his own blog — so an unfixed worker would also poison his own app testing.

---

## 6. The avatar change — WITHDRAWN, the existing code is correct

`src/components/PageLayout/Sidebar/sidebar.module.less`, `.profileAvatar`. **Momin ruled this
out of scope and the file is untouched. The critique below was also wrong on the substance**,
and that is recorded rather than deleted (§19).

**What the working-tree change does, and it fixes a real bug.** The committed rule set only
`height: 230px` with `border-radius: 50%`, so the width came from the container and the
"circle" was an ellipse at any container width other than 230px. Measured in headless Chrome,
container 300px:

| | width x height |
|---|---|
| committed code | **268.0 x 230.0** — an ellipse |
| the working-tree version | **230.0 x 230.0** — a circle |

**The claim that `aspect-ratio: 1 / 1` is inert was wrong.** It is inert only when both width
and height are *definite*. Here the height is `clamp(120px, 90%, 230px)` and that percentage
resolves against the parent's height, which is `auto` — so it does not resolve, the height
computes to `auto`, and **`aspect-ratio` is exactly what keeps the box square**. Removing the
height line would have been harmless; calling the line that does the work inert was not.

Measured across container widths, the working-tree version and a width-only variant agree
everywhere, which is what "the height clamp is redundant, not wrong" looks like:

| container | working tree | width + aspect-ratio only |
|---|---|---|
| 160px | 120.0 x 120.0 | 120.0 x 120.0 |
| 200px | 151.2 x 151.2 | 151.2 x 151.2 |
| 300px | 230.0 x 230.0 | 230.0 x 230.0 |
| 400px | 230.0 x 230.0 | 230.0 x 230.0 |

So the only defensible objection left is the IE11 comment on a browser Microsoft retired in
June 2022 — a comment, not behaviour. **Nothing to fix. The file stays as Momin wrote it.**

**The lesson worth keeping:** the inertness claim was derived from the spec and never measured,
and the spec sentence has a precondition ("both definite") that this container does not meet.
A read of the rule in isolation cannot tell you whether that precondition holds — only the
containing block can — which is the same class as every §19 finding: right in its own
paragraph, wrong against the thing it depends on.

---

## 7. Delivery plan (agreed)

**Momin's ruling, 6 Sep 2026: the fix is applied locally and nothing is pushed.** No branch, no
commit, no PR, until the app is built and he has reviewed both together.

```
working tree only
  gatsby-config.plugins.js    <- service worker scope fix (§4), applied and verified
  sidebar.module.less         <- WITHDRAWN (§6). Momin's own edit, untouched
→ later, on his say-so: branch → commit → PR → he merges → CI deploys
```

- **Exactly one file changes**, and it changes in the working tree only.
- CI builds from the **committed** `package.json` (Node 14, Linux x64), which is what has always
  deployed — so pushing one config file changes nothing about how CI runs.
- Both commits are code: `PLAN.md` §20.1's two-go-ahead gate applies to both.

---

## 8. The worker exclusion is LIVE — verified 2026-09-13

**Confirmed against the deployed blog, not the working copy**, because the config file had
uncommitted edits at the time and a local grep would have proved nothing. `mominbinshahid.github.io/sw.js`
carries both routes:

```js
registerRoute(/^(?!.*\/MealUnits\/).*(?:\.js$|\.css$|static\/)/, CacheFirst)
registerRoute(/^(?!.*\/MealUnits\/)https?:.*\.(png|jpg|…)/,        StaleWhileRevalidate)
```

**The work is done. This document is not therefore finished.** It is the only place explaining why
those negative lookaheads exist, and a lookahead inside a URL pattern is exactly the kind of thing a
later tidy-up deletes as noise. The blog's own config carries a short version in comments; this file
carries the failure it prevents.

## 9. Lower-case URLs — FIXED 2026-09-13, in the BLOG repo

**`mominbinshahid.github.io/mealunits/` returned a 404 and `/MealUnits/` did not.** Worth recording
precisely, because the obvious diagnosis is wrong: **that 404 never came from this app.** GitHub
Pages serves a project site at its repository's EXACT case, so any other casing does not resolve to
the project at all — it falls through to the user site, and the blog's 404 page answers it. The
response body was Gatsby's.

**Which means it could not be fixed from this repository**, and two of the three available options
were worse than the problem:

| | |
|---|---|
| Rename the repo to lower case | Swaps which casing works. And BACKLOG T0 establishes the real cost: a new manifest `id` and `scope` is a different app to the browser, so **every installed home-screen icon dies** |
| A second repository named `mealunits` | Works, and is an entire repository holding a redirect |
| **Redirect from the blog's 404** | **Taken.** `src/pages/404/index.jsx` in the blog repo |

**Two things in that redirect are load-bearing and easy to drop in a rewrite:** the effect is
guarded on `window` because Gatsby renders the page at build time, and a path whose casing is
already correct returns `null` rather than redirecting — **that null is what stops it looping.**
Only a first segment that case-insensitively matches a listed project is rewritten, so every other
404 still renders as one.

**Verified in a real browser after deploy:** `/mealunits/` lands on `/MealUnits/` with the app
loaded. A first attempt appeared to fail and did not — the tab held a service-worker-cached copy of
the old 404 chunk, which the blog worker caches `CacheFirst` because it is not under `/MealUnits/`.
Same trap as §7 and as note 45's smoke profile: the measurement was real, the setting was stale.

## 10. Open

- Remove-vs-upgrade was decided as **upgrade** (keep the blog offline). §4 above is the upgrade
  path.
- The user mentioned "one more thing to check" on the blog and had not yet said what it is.
