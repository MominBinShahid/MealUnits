# Blog service-worker fix — what is live, and why it must not be tidied away

**Repo:** `/Users/mominbinshahid/OSS/MominBinShahid.github.io` — the blog, which owns the origin.
**Status: applied, deployed and verified.** Both fixes below are live on
`mominbinshahid.github.io`.

**Why this file still exists now that the work is done.** It is the only place that explains why
two negative lookaheads sit inside the blog's cache patterns, and why an empty `{}` sits between
them. Both read as noise, and both are load-bearing. The blog's own config carries a short comment;
this file carries the failure it prevents.

**PRUNED 2026-09-13.** The investigation, the repository state as found, the
upgrade-versus-override comparison and the delivery plan are gone — all decided, all in `git log`.

**This file does not use the section sigil for its own sections.** `§N` means a `PLAN.md` section
everywhere in this repository, and the earlier version of this document used it for its own
headings — where `§4` silently resolved against PLAN.md's section 4. Internal pointers are written
"section N", the same rule `CARBS.md` follows.

---

## 1. The problem

`https://mominbinshahid.github.io/sw.js` is a **workbox-v4.3.1** worker from 2019, registered at
`/` because `gatsby-plugin-offline` calls `register('/sw.js')` with no scope option. It carried:

```js
workbox.routing.registerRoute(/(\.js$|\.css$|static\/)/, new workbox.strategies.CacheFirst(), 'GET')
```

The regex is **unanchored** and Workbox matches same-origin requests on partial URLs, so
`/MealUnits/assets/index-abc123.js` matched and was served **cache-first with no expiration** — by
a 2019 worker, on any browser that had ever visited the blog.

**Scope does not save the app, and the window is wider than "the first visit."** Service-worker
scope is longest-prefix, so the app's own worker at `/MealUnits/` wins — *once it is installed and
in control.* Registering a worker does not take over a client that is already loaded, and if the
app's worker fails to install at all, the blog's worker keeps serving those URLs indefinitely.

## 2. The route table — routes 0 AND 2

**An earlier draft targeted `runtimeCaching[0]` alone. That does not work.** The generated worker
registers four runtime routes plus a navigation route, and **Workbox serves the first route that
matches** — excluding a URL from one route does not exclude it from the routes after it.

| # | Pattern (as installed) | Handler | Catches `/MealUnits/` assets? |
|---|---|---|---|
| 0 | `/(\.js$\|\.css$\|static\/)/` | CacheFirst | **YES** — the route this file has always been about |
| 1 | `/^https?:.*\/page-data\/.*\.json/` | StaleWhileRevalidate | No — the app has no `/page-data/` path |
| 2 | `/^https?:.*\.(png\|jpg\|jpeg\|webp\|avif\|svg\|gif\|tiff\|js\|woff\|woff2\|json\|css)$/` | StaleWhileRevalidate | **YES — it matches `.js` and `.css` again.** Missed entirely until round 14 |
| 3 | `/^https?:\/\/fonts\.googleapis\.com\/css/` | StaleWhileRevalidate | No |
| + | `/\/.gatsby-plugin-offline:.+/` — registered separately in `sw-append.js` | API handler | No — it requires the literal `gatsby-plugin-offline:` in the URL |

**Route 2 is the one that would have made the fix look successful while the app stayed
intercepted.**

**The navigation route needs no change, and `navigateFallbackBlacklist` does nothing here.**
Workbox emits that option only when `navigateFallback` is configured; the plugin appends its own
`NavigationRoute` in `sw-append.js` instead. Any earlier instruction in this file to add a
navigation denylist was wrong and is withdrawn. Reading the handler through shows it is already
safe — there is no `resources:/MealUnits/` key, because that store is populated by the blog's own
page visits, so a navigation to the app falls through to the network.

## 3. The fix, as it stands in `gatsby-config.plugins.js`

`_.merge` merges arrays **by index**, so an entry at a given index overrides only the keys it names
and leaves the rest of that route — and every other route — untouched.

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

**The empty `{}` at index 1 is load-bearing — do not tidy it away.** Because the merge is by index,
deleting it slides route 2 up into slot 1, and route 2's *original* pattern then re-intercepts
`/MealUnits/assets/index-*.js` through `StaleWhileRevalidate` — **the exact round-14 failure,
resurrected by one edit that looks like removing dead weight.** It reads as pointless precisely
because its job is to occupy a position. **Every route's position is part of the fix, not just its
pattern**, and `check-plan.py` fails if the placeholder disappears.

**`check-plan.py` executes these patterns against real URLs rather than spell-checking them.** That
matters: narrowing the exclusion to `(?!.*\/MealUnits\/$)` passed eleven shape checks while
re-intercepting everything, because `$` limits the exclusion to a URL that *ends* at `/MealUnits/`.

## 4. Verification — do not skip

1. **Read the generated `public/sw.js`** and confirm no route can match a `/MealUnits/` URL. The
   check is not "does the config look right".
2. Test from a browser that **still holds the old blog worker**, visiting the app URL **cold,
   without visiting the blog first.** That is the actual exposure path and the one nobody tests.
3. Also test failed installation, offline launch, and an update with two clients open.

**The maintainer's own browser is the most likely to hold the stale worker**, so an unfixed worker
would have poisoned his own testing too. That is also why the blog ships before the app.

## 5. Confirmed live — 2026-09-13

**Verified against the deployed worker, not the working copy**, because the config file had
uncommitted edits at the time and a local grep would have proved nothing:

```js
registerRoute(/^(?!.*\/MealUnits\/).*(?:\.js$|\.css$|static\/)/, CacheFirst)
registerRoute(/^(?!.*\/MealUnits\/)https?:.*\.(png|jpg|…)/,        StaleWhileRevalidate)
```

## 6. Lower-case URLs — fixed 2026-09-13, in the blog repo

**`mominbinshahid.github.io/mealunits/` returned a 404 and `/MealUnits/` did not**, and the obvious
diagnosis is wrong: **that 404 never came from this app.** GitHub Pages serves a project site at its
repository's EXACT case, so any other casing does not resolve to the project at all — it falls
through to the user site, and the blog's 404 page answers it. The response body was Gatsby's.

Which means it could not be fixed from this repository, and two of the three options were worse than
the problem:

| | |
|---|---|
| Rename the repo to lower case | Swaps which casing works. And `BACKLOG.md` T0 gives the real cost: a new manifest `id` and `scope` is a different app to the browser, so **every installed home-screen icon dies** |
| A second repository named `mealunits` | Works, and is an entire repository holding a redirect |
| **Redirect from the blog's 404** | **Taken.** `src/pages/404/index.jsx` in the blog repo |

**Two things in that redirect are load-bearing and easy to drop in a rewrite:** the effect is
guarded on `window`, because Gatsby renders the page at build time; and a path whose casing is
already correct returns `null` rather than redirecting — **that null is what stops it looping.**
Only a first segment that case-insensitively matches a listed project is rewritten, so every other
404 still renders as one.

**Verified in a real browser after deploy:** `/mealunits/` lands on `/MealUnits/` with the app
loaded. A first attempt appeared to fail and did not — the tab held a service-worker-cached copy of
the old 404 chunk, which the blog worker caches `CacheFirst` because it is not under `/MealUnits/`.
Same trap as build note 45's smoke profile: the measurement was real, the setting was stale.

## 7. Open

- The blog is to be rebuilt later; this is explicitly a temporary fix, so elegance is not the goal.
- Momin mentioned "one more thing to check" on the blog and has not yet said what it is.
- The avatar change proposed here was **withdrawn** — out of scope, and the critique was wrong on
  the substance. That file is his and is untouched.
