# MealUnits — Backlog

Companion to `PLAN.md`. **Everything deliberately excluded from v1, with the reason and what
would have to change to reconsider.**

The point of this file is that §9's exclusions are decisions, not oversights. Without a written
reason each one gets silently reopened in six months by someone — probably us — who assumes it
was forgotten.

Categories: **Next**, **Later**, **Never** for features, plus **Technical** for toolchain work and
**Decided** for closed questions kept as the record. "Never" means the evidence argues against it,
not that it is technically hard. **Technical** is not a priority tier — it is a different KIND of
entry, waiting on something outside this project rather than on a decision of ours.

**THE RULE, added 2026-09-06: if it is built, it comes out of this file.** An entry here means
"excluded from v1". A feature that is implemented and shipping cannot also be deferred, and
leaving it in both places makes the two documents lie about each other.

Two entries were removed under this rule on the day it was written:

| Removed | Now lives in | Note |
|---|---|---|
| *Dose adjuster at the confirm step* | `PLAN.md` §7.1, as `injectedUnits` | Implemented in plan v8. Its constraint here — "must not become a way to type any number" — was dropped in transit and restored in v9 with a full input specification: grammar, integer hundredths, finiteness, zero/negative rejection, a 100-unit cap, soft confirm |
| *Settings snapshot on each log row* | `PLAN.md` §7.7, §11.3, as `settingsRevision` + `settingsHistory` | Implemented in plan v9. Took review rounds 11, 12 and 13 to get correct; both reviewers now pass it |

Also now in v1 and never listed here, recorded so the omission is visible: **§7.8's readings
store** (a blood-sugar reading recorded without an injection — the app previously discarded every
blocked low, which made §18.13 unanswerable) and **§10.6's setup disclosure** (wording only, no
stored number).

**§6.7's usual-dose field was also in that list, and was CUT in plan v17** on Momin's objection: a
calculator whose premise is that the dose varies cannot store a field asserting a constant. It is
replaced by one optional free-text question asked **at export and re-offered until answered or
declined** (plan §6.7), kept as dated patient-reported history — **not a setting, and nothing this
file needs to carry.**

---

## ORDER OF WORK — agreed 2026-09-08

Recorded because a sequence agreed in conversation is lost at the next session, and because two of
these steps have a dependency that is not obvious from reading them.

| # | Step | State | Why here |
|---|---|---|---|
| 1 | **Push and deploy.** Blog first (§20.2), then this repository | **DONE 2026-09-07** | §1.4 — the app competes with a fixed 24-25 units injected blind |
| 2 | **Confirm updates reach a real phone** | **DONE.** Three deploys have reached Momin's device, each after a full app restart | `T4` is therefore narrowed: delivery works, only the in-app "a newer version is ready" bar is unproven |
| 3 | **Rule on the `[CONFIRM]` build notes**, one at a time | **IN PROGRESS.** Note 1 ruled 2026-09-09 | Moved AHEAD of `T5` on Momin's instruction. Each records a decision already implemented; the question is whether it was right |
| 3a | **Prune every Markdown document**, on Momin's instruction 2026-09-11: `PLAN.md`, `BUILD-NOTES.md`, `BACKLOG.md`, `CLINICAL.md`, `BLOG-FIX.md`, `README.md`, `CLAUDE.md` | | **After step 3**, because the `[CONFIRM]` rulings decide what the notes still have to carry. *"We can't keep everything for ever, so we will only keep things that earn their place."* A finished `[FYI]` record of a bug fixed in week one is not earning 1,577 lines of attention, and 4,545 lines of `PLAN.md` is now read by people who need the live rules, not the round-by-round history of how they were reached. What comes out and what stays is a judgement per entry, so it is its own pass |
| 4 | **`T5` — the audience change.** Empty prescription fields with the strengthened hints, and the confirmation threshold made relative | | **This gates step 5.** Ranking an app that prefills a stranger's dosing ratios is the version of this that goes wrong |
| 5 | **`4a` + `T6` — search and measurement.** Open Graph, canonical, sitemap, Search Console | | After `T5`, never before |
| 6 | **`T3` — Preact** | | Kills the whole render-teardown defect class by construction |
| 7 | **`10a` — Urdu** | | **Depends on `T3`**: the current render destroys IME composition state, which is how Urdu is typed |

**The two dependencies worth restating, because getting them wrong is expensive:** search work waits
on `T5`, and Urdu waits on `T3`.

## NEXT — likely v2, in rough priority order

### 1. Blood-sugar plausibility advisory
**What:** the mirror of §6.5 for the blood-sugar field — 350 typed as 530, or as 150.

**Why deferred:** §6.5 was hard enough to get right; both reviewers killed two versions of it.
Adding a second advisory before the first is proven in real use would be building on sand.

**Reconsider when:** §6.5 has run for a few months and its false-positive rate is known.

**Note:** §6.6 currently lists blood-sugar mis-entry as uncovered. This is the fix for that row.

### 2. Meal tagging (breakfast / lunch / dinner / snack)
**What:** one tap at log time.

**Why it matters:** it would sharpen §6.5 considerably — comparing a snack against snacks rather
than against all meals removes most of the false positives that currently make the LOW trigger
fire on every small entry.

**Why deferred:** more UI at the moment of dosing, which is the worst time to add friction.

### 3. Basal adherence log
**What:** record whether the daily Lantus dose was actually taken, with an optional reminder.

**Why deferred:** `PLAN.md` §1.3 records the basal *regimen* as a setting — dose, timing, name —
which is what makes the settings-as-text screen and the export show the whole picture. Whether he
took it **today** is a different feature: a new record type, a reminder mechanism, and questions
about missed and late doses. None of it feeds any calculation.

**Constraint if ever built:** it must never appear on the calculator screen and must never enter
the dose arithmetic. A second number labelled "units" is the risk §1.3 already mitigates by
keeping basal in settings only.

### 4. Half-unit output polish
Already in v1 as a rounding mode (§5.1). Deferred: an actual half-unit-pen *mode* that changes
the increment everywhere including the log and export.

### 5. mmol/L support
**Why deferred:** mg/dL-native is asymmetrically safer (§9), and every unit-confusion defect in
the literature comes from apps that support both. If it is ever added it must be a **whole-app
mode**, never a per-field guess, and the stored sensitivity must convert with it.

**Reconsider when:** someone outside Pakistan needs it — i.e. only if this stops being a
single-user app.

---

## LATER — real, but not soon

### 4a. Search visibility — RULED: index it (see T5 first)

**Status: nothing has been done for search, and the recommendation is that the app should NOT be
discoverable. The REPOSITORY should.**

**What exists** in `index.html`: `<title>`, a `<meta name="description">` that already reads *"An
insulin dose calculator for one person. Not a medical device."*, `lang="en"`, theme colours, and a
manifest. That is the baseline and it is accurate.

**Why ranking would be a hazard rather than a win.** This app is configured for ONE prescription —
target 150, ISF 30, ICR 10 — and `README.md` says so in its second paragraph: *"if you are not that
person, the numbers in it are wrong for you."* A stranger searching "insulin dose calculator" who
lands on it and enters their own blood sugar gets a dose computed from someone else's ratios. §14's
regulatory posture is that this is not a medical device and has no clearance; being findable by
patients is the fastest route to it being used as one.

**RULED BY MOMIN 2026-09-08: index it. The reasoning above was based on a wrong premise and is
retained only as the record.** The app is for anyone with type 1 diabetes who can enter their own
three numbers — the prefill is his brother's, not a limit on who may use it. *"I want this to rank."*

**What that makes conditional rather than cancelled:** the hazard in the paragraph above is real for
one specific configuration — a stranger arriving at a first run with **someone else's prescription
already in the fields**. That is `T5`, and it should be resolved before the app is promoted. Ranking
an app that prefills a stranger's dosing ratios is the version of this that goes wrong.

So: **index, with `T5` settled first.**

**What IS worth adding: link preview, which is not discovery.** Open Graph and Twitter card tags so
that when the URL is sent to a doctor, a family member, or in a WhatsApp message, the preview shows
the name and *"for one person, not a medical device"* rather than a bare URL. That is the case where
metadata does safety work — it puts the disclaimer in front of someone BEFORE they open it.

**Still worth adding, and now more so:** Open Graph and Twitter card tags, so a shared link previews
with the name and the "not a medical device" line rather than as a bare URL. For a public app that is
the first thing most people will see of it. Plus a canonical URL, and a sitemap for `T6`.

### 10a. Urdu — what it actually requires, since item 10 understates it

Item 10 says "worth doing if the app is ever shared". Having built the interface, the work is larger
than that and two parts of it are not engineering.

**Blocked on T3 (Preact), for a concrete reason.** `render` destroys and rebuilds the whole tree on
every keystroke, which destroys **IME composition state** — and composed input is how Urdu is typed.
The focus and caret patch of note 25 does not cover composition. Keyed reconciliation does, by not
destroying the node. So Urdu comes after T3, not before.

**Blocked on a qualified translator, which is the harder half.** `src/ui/copy.ts` is not UI chrome —
it is clinical instruction. *"Treat this first. Do not inject."* and *"Have 15 grams of fast-acting
carbohydrate now"* are the app's whole safety value. **A mistranslation here is a dosing error, not a
typo**, so machine translation is not acceptable and neither is a bilingual friend without clinical
context. This needs someone who can be shown `docs/CLINICAL.md` and asked whether the Urdu says the
same thing.

**Three engineering pieces, in order of nastiness:**

1. **The digits are a real decision, not a detail.** §4.2 deliberately rejects non-ASCII digits with
   its own message, because *"Please type the number in English digits"* is a different instruction
   from "check the number". An Urdu keyboard offers Urdu-Indic digits (۰۱۲۳). Accepting and
   normalising them is friendlier; it also adds a conversion step to a string that becomes an insulin
   dose. **§10.4's number formatting is language-independent and must survive translation** — the
   digits shown in a result stay ASCII regardless, or the golden cases stop meaning anything.
2. **RTL layout.** `dir="rtl"` plus converting the physical CSS properties that remain —
   `margin-left` on `.tag`, `margin-right` on `.field-icon` — to logical ones (`margin-inline-start`).
   Small and mechanical, but it has to be swept for rather than assumed done.
3. **The font.** Nastaliq needs a real face; Noto Nastaliq Urdu is several hundred kilobytes against a
   current font budget of **42 KB**.

   **Self-hosted, and lazily fetched — those are two separate things and both hold.** The `.woff2` is
   downloaded once at build time into `public/fonts/` and served from `'self'`, so §11.5's policy
   needs no change and Google is never contacted at runtime. A `@font-face` rule does not request
   the file until something on screen uses that family, so **an English user never downloads a byte
   of it** — the laziness comes from the browser, not from who hosts it.

   **The open question is OFFLINE, and it is a real trade-off.** Momin's preference is that Urdu
   should work offline. Precaching the face guarantees that and costs every user the download,
   including everyone who never selects Urdu; caching on first use costs nobody who does not want
   it, but the first Urdu session must be online.

   *A third option worth weighing when this is decided:* precache it only AFTER Urdu has been
   selected once — the service worker adds it to the cache at that point, so the cost falls only on
   Urdu users and offline works from the second session onward. **To be settled before implementing,
   not during.**

**Trigger: after T3.** Recorded now because the DEPENDENCY is the useful part — anyone picking this
up would otherwise start with the copy and discover the composition problem last.



### 6. Insulin-on-board display (not a decay model)
**What:** show remaining active insulin as a *range* rather than gating on elapsed time alone.

**Why deferred and constrained:** §7.4 deliberately refuses a decay model, because Humulin R's
duration is dose-dependent — the label stretches toward 18 hours at large doses — so a fixed
curve gives false precision. Any future version must show a **range**, never a point estimate,
and must not feed the dose calculation.

### 7. Time-of-day ratio profiles
**Why deferred:** the only study designed to detect diurnal insulin sensitivity in Type 1
diabetes found no significant between-meal difference and concluded the pattern is individual,
not population-level. A per-meal multiplier is not a defensible default.

**Reconsider when:** his own clinician sets different ratios by meal. Then it is transcription,
not inference — and that is the only acceptable form.

### 8. Multiple profiles
Single user today. Trivial to add, pointless until needed.

### 9. Sync across devices
**Constraint if ever built:** Cloudflare Workers, not Supabase (7-day idle pause is fatal for an
app used a few times a day) and not Firebase (Blaze has no hard spend cap). The v1 answer —
export a JSON file into a folder the OS already syncs — covers most of the need at zero
infrastructure.

### 10. Urdu / multi-language
Worth doing if the app is ever shared. Note the §10.4 number-formatting rules are
language-independent and must survive translation. **See item 10a for what it actually requires** —
this entry understated it, and the dependency on T3 is the part worth knowing before starting.

### 11. Blog rebuild
Separate project. The v1 service-worker change (§11.6) is explicitly a **temporary fix** chosen
because the blog is being rewritten later anyway.

### 12. Usage analytics — MOVED HERE FROM "NEVER", 2026-09-06
**Momin's call:** worth having, not now. Answers the one question the project cannot otherwise
answer — is anyone using this?

**The problem to solve when we build it, not a reason to refuse.** Google Analytics means
third-party JavaScript running on `mominbinshahid.github.io` — and because the app shares that
origin with the blog (see *Dedicated GitHub organisation / clean origin*, under DECIDED —
this entry said "item 12", which is now this entry's own number), **that script has read access
to the dose log.** It also
breaks the app's `default-src 'self'` policy, which is the thing keeping the app offline-only.

**Better shapes to weigh:** Cloudflare Web Analytics or Plausible — cookieless, no third-party
read access to page storage — or simply GitHub's repo traffic stats, which cost nothing and add
no script at all.

**A limit no analytics escapes here:** offline sessions do not report, and offline is when this
app matters most. Any number will undercount, and undercount exactly the usage worth knowing
about.

### 13. AI carbohydrate estimation — MOVED HERE FROM "NEVER", 2026-09-06
**Momin asked for this in v2 and it was misfiled.** The old entry sat under NEVER while
specifying how to build it safely, which is a contradiction: that is a constraint list, not a
refusal.

**The evidence, which belongs in the constraints rather than the refusal:** photo-based estimates
run 32-73% off; one study found a frontier model over-estimating by 20 g or more on **38% of
meals** against 3% for dietitians; over-estimation is the **overdose** direction — at a ratio of
1:10 a 20 g error is 2 extra units; and **no study anywhere measures glycaemic outcomes.**

**Hard constraints if built:** description-driven, not photo-driven (text estimates are 5-25% off
against 32-73%); output a **range**, never a point estimate; itemise what the model claims to see;
require explicit confirmation; **never auto-populate the dose field.** If it cannot show a range,
it does not ship.

**One thing that changed since it was first written:** the original motive was that his brother's
carbohydrate counting might be wrong. The calibration work weakened that — 50 g for a 250 g plate
of biryani checks out against what he actually injects, so the ratios look like the problem, not
the counting.

### 14. Exercise adjustment — MOVED HERE FROM "NEVER", 2026-09-06
The old entry refused this because the app cannot **detect** exercise. That argues against
*automatic* adjustment, not against a **manual declaration**, which real apps do have.

**What it would change.** Exercise makes insulin work harder, so the meal component comes down —
the correction stays, because a high reading is real regardless. At his typical 50 g meal and a
330 reading, an 11-unit dose becomes:

| Reduction | Total |
|---|---|
| none | 11 units |
| 25% | 10 units |
| 50% | 9 units |
| 75% | 7 units |

**That 4-unit spread is 120 mg/dL of blood sugar**, and the app cannot tell a walk to the shop
from an hour of cricket. So the build is the same shape as time-of-day ratios: **his doctor sets
the percentage in settings and the app applies exactly that.** Transcription, not inference. With
nothing set, the checkbox shows a warning instead of a number.

**Two things it still would not fix:** exercise lowers blood sugar for up to 12 hours, so a
mealtime reduction does nothing for a 3 a.m. low; and illness pushes the other way, raising
requirements, so it is a separate feature and not the same checkbox.

---

## TECHNICAL — toolchain and dependencies, not features

Everything above this line is something the app could *do*. This section is different: it is work
the app needs done *to* it, held back by something outside the project. **The distinction matters
because the trigger is different** — a feature waits on a decision we make, a technical item waits
on someone else shipping, so it needs a stated unblock condition rather than a priority.

**The rule for this section: an entry names a concrete trigger.** Either an upstream release (T1) or
a stated project milestone (T3) — never "when convenient", which is how technical work gets deferred
forever. An entry that cannot name a trigger is a feature in disguise.

*(This rule was originally written as "the exact thing that has to happen ELSEWHERE". T3 broke it
immediately: its trigger is our own milestone, not someone else's release. Widened rather than
bent.)*

### T0. The name — RULED 2026-09-08: ship as `MealUnits`

**Momin's decision: the name stands for v1.** If a better one comes along it will be changed then,
and the user will be asked to re-install — by an in-app notice rather than by being left to discover
a dead icon.

**What a rename actually costs, so the decision is made with the price attached.** `/MealUnits/` is
baked into `vite.config.ts`, `index.html`, and the manifest's `id`, `start_url` and `scope`. §11.5
says *"set `id` day one, never change it"*:

- **The record SURVIVES.** IndexedDB is keyed to the ORIGIN, and `MominBinShahid.github.io` does not
  change. He re-installs and his history is intact.
- **The install breaks.** A new `id` and `scope` is a different app to the browser, so the home-screen
  icon stops working and the old service worker is orphaned.

**So a rename is a re-install, not a data loss** — which is what makes deferring it a reasonable
call rather than a risk. **The in-app notice is the part that needs building if it ever happens**, and
it cannot be delivered by the app being renamed: it has to ship in the LAST version under the old
name. Recorded here because that ordering is easy to get wrong and expensive to get wrong.

### T1. TypeScript 7 — blocked on `typescript-eslint`

**What:** move from TypeScript 6.0.3 to 7.x, the native Go compiler.

**Why it is held:** `typescript-eslint` — at 8.69.0, its own latest — declares
`peerDependencies.typescript: ">=4.8.4 <6.1.0"`, and **hard-throws at import** under TS 7:

```
Error: typescript-eslint does not support TS 7.0.
```

Not a warning that can be lived with. npm also refuses the pair outright with a genuine `ERESOLVE`,
so taking TS 7 would mean `--legacy-peer-deps` **and** a dead linter.

Losing the linter is the real cost, not an inconvenience: §11.8's "every number lives in
`config.ts`" is enforced by two **type-aware** rules, and type-aware rules are exactly the ones that
stop working. The guarantee would go quiet rather than fail loudly, which is the worst way for a
guarantee to end.

**Unblock condition:** `typescript-eslint` publishes a release whose `peerDependencies.typescript`
admits 7.x. Upstream tracking issue **typescript-eslint#10940**, which is explicitly scoped to
**TS >= 7.1** — so TS 7.0 is being skipped, and 7.1 is the first version worth trying.

**How to check, in one command:**

```sh
npm view typescript-eslint peerDependencies.typescript
```

If that range admits 7, bump both together, run `npm run check`, and confirm the two §11.8 rules
still report. **If the linter is silent rather than failing, the migration is not done** — verify by
adding a bare numeric literal to a `src/` file and confirming it is still reported.

**What is NOT a reason to do this:** speed. TS 7's selling point is compile time, and a full
typecheck of this project's ~14,000 lines takes **0.39s warm**. There is nothing to win here except
staying current, which is a real reason but not an urgent one.

### T2. `fnm` default is Node 16, and non-interactive shells get it

**What:** the machine's `fnm` default is `v16.20.2`. `.node-version` pins this project to 24.20.0
and an interactive shell honours it, but **`fnm`'s use-on-cd hook does not run in a non-interactive
shell** — so `zsh -lc`, a git hook, or a CI-ish local script silently gets Node 16 and npm 8.

**How it was found:** a from-scratch install test run under `zsh -lc` failed with
`Cannot read properties of null (reading 'edgesOut')` — an npm 8 arborist bug — while the same test
under Node 24 passed cleanly. The failure looked like a dependency problem and was a shell problem.

**Not a project bug.** CI is safe: all three jobs use `node-version-file: .node-version`. This is a
workstation note, recorded because the failure mode is convincingly disguised as something else.

**Unblock condition:** none needed — `fnm default 24.20.0`, or prefix scripts with `fnm exec --`.

### T3. Move the UI layer to a framework with keyed reconciliation — Preact

**Trigger: after v1 is in his brother's hands and in use.** Not before. The app is otherwise
complete and verified, and refactoring working code while he is still injecting a fixed 24-25 units
is the wrong order.

**What:** replace the hand-rolled render loop in `src/ui` with Preact. `src/core`, `src/state`,
`src/storage` and `src/config.ts` — 4,931 lines — are untouched, because none of them import the DOM.

**Why, and this is not a preference.** `render()` calls `replaceChildren(host.root, ...)`, which
destroys and rebuilds the entire tree on every state change. Everything the browser attaches to a
DOM node's *identity* dies with it. Two symptoms were live at v1, both measured in headless Chrome
on 7 Sep 2026:

| Symptom | Measured, with the field centred in the viewport |
|---|---|
| Focus lost on every keystroke | typing `36` produced `3` — focus fell to `<body>` after character one, so the second key went nowhere |
| Scroll position reset | the same single keystroke moved `scrollY` from **982 to 27** |

*(A first attempt measured 600 → 27 against a field that was ABOVE the viewport, where the browser
was legitimately scrolling it into view. The symptom is real; that number was not. Re-measured with
the field genuinely on screen.)*

Still latent, same cause: CSS transitions restarting, `<details>` snapping shut, and **IME
composition breaking** — which blocks backlog item 10 (Urdu), because composed input is exactly what
a full teardown destroys.

**This is PLAN.md §11.3's own argument, applied to the view layer.** §11.3 chose IndexedDB over Web
Locks because a lock "only works if every writer takes it, and a single path that forgets restores
the race with no error." Save-and-restore-focus is the Web Locks answer: it holds only while every
render path remembers, and the one that forgets fails silently. Keyed reconciliation is the
IndexedDB answer — node identity is preserved by the algorithm, so a render site cannot forget.
**Correctness by construction rather than by discipline**, which this project has already ruled on
once.

**Why Preact specifically:**

- **`src/ui/dom.ts`'s `h(tag, attrs, ...children)` is Preact's `h` signature exactly.** Every
  existing call site stays as written; Preact also accepts lowercase `onclick`/`oninput`, so the
  handlers do not change either. The work is the import, `replaceChildren(root, …)` becoming
  `render(vnode, root)`, and keys on the history list.
- **Size, measured by bundling and gzipping both:** Preact **4.5 KB**, React + ReactDOM **60 KB**.
  Against a 26 KB app that is +17% versus +230%, on a phone on mobile data in Pakistan.
- React's fibre scheduler, concurrent rendering, synthetic events and server components buy nothing
  here — this is a local-only offline PWA with no ecosystem dependencies to shim.

**The honest cost:** Preact would be this project's **first runtime dependency, ever**
(`"dependencies": NONE` today). For an offline medical-adjacent app that is a real change of
posture, not a neutral one, and should be a deliberate decision rather than a default.

**Why the rewrite is lower-risk than it sounds:** `test/integration.test.ts` has **66 assertions on
rendered text and 0 on DOM structure** — it finds things by label and button text, which is
framework-agnostic. The suite stays green throughout the migration and is the safety net for it.
One coupling point to fix: `label.parentElement.querySelector('input')` assumes the input sits under
the label's parent.

**Carry these into PLAN.md when it lands** — they are spec, not notes:

- **§11 gains the rule** that the view layer preserves DOM identity across renders, so focus, caret,
  scroll and composition survive a state change.
- **§13 gains an interaction-continuity requirement, which it does not have today.** §13 has no
  mention of focus, caret, keystrokes or scroll anywhere — which is precisely why 541 tests and a
  100% mutation score missed both symptoms. `typeInto` sets `input.value` in one assignment and
  fires one `input` event; the bug only exists *between* renders, so the test does the one thing
  that cannot reproduce it.

---

### T4. The in-app update prompt — CLOSED 2026-09-09, IT WORKS

**CLOSED. Momin, 2026-09-09, on a real phone against the deployed app: "in app bar does render and
ask me to use it now, so that's perfect."** The prompt appears and the update can be taken by tapping
it. Nothing further is outstanding.

**The entry is kept because it was wrong twice, in opposite directions, and both are instructive.**

First it claimed a device which had cached a build "stays on it, permanently" and that this blocked
launch. **That was wrong** — Momin rejected it and told me to confirm from the code. Closing and
reopening delivers the new build, which is the specified service-worker lifecycle working correctly.

Then it claimed the in-app prompt did not render at all, on the strength of `vite preview` over a
LAN. **That was wrong too.** On real HTTPS with real Pages caching it renders. A local preview is not
the deployment, and I reported a negative result from the wrong environment as a defect in the app.

**The lesson, which outlives the entry: I twice reported a confident conclusion from an environment
that could not produce the behaviour under test.** The measurements were real; the setting was not.

**What actually happens, measured across a close-and-reopen:**

| | Bundle served |
|---|---|
| Install build A | `index-BjuqWl9V.js` |
| Ship build B, revisit while the app is still open | `index-BjuqWl9V.js` — old worker in control, new one `waiting: "installed"` |
| **Close the app entirely, reopen** | **`index-v3G2ALM4.js` — the new build** |

That is the **standard service-worker lifecycle working correctly**: a waiting worker activates as
soon as every client using the old one is gone. I read "old bundle served while a new worker waits"
as a fault when it is the specified behaviour, and never ran the close-and-reopen that would have
shown it.

**What IS still missing:** the in-app offer — *"A newer version is ready — Use it now"* — does not
render, so an update cannot be taken WITHOUT closing and reopening the app. That is a convenience
gap, not a trap. §11.4 chose a prompt over an automatic reload deliberately (never swap versions
mid-dose), and the prompt is the part not working.

**Three real defects were fixed on the way and are worth keeping regardless:**

- **Nothing ever asked whether an update existed.** `registration.update()` now runs at startup and
  on returning to the foreground, throttled. The browser's own check needs a navigation, which an
  installed PWA can go a long time without — so without this the check could be much later than it
  should be.
- **Registration depended on the `load` event alone**, which never fires if the document is already
  complete when the module runs.
- **Every hook could miss the moment** — `waiting` null at registration, `updatefound` firing before
  the listener attaches, `installing` already moved on. `offerIfReady` is idempotent and runs from
  all of them plus a bounded poll.

**Trigger: after the first deployment**, and Momin named the test — change something visible and
cheap, such as the position of the greeting, deploy, and watch a real phone. A real deploy over HTTPS
with real Pages caching is a different environment from `vite preview` on a LAN, and it is the one
that matters.

**The lesson recorded rather than the fix:** I called a launch blocker on a mechanism I had not
finished understanding, and stated it three times. §20.1.1 now covers the mirror of this — ask when
something looks wrong — and this is the same failure pointed at the platform instead of at the
document.

### T5. AUDIENCE CHANGE — the app is for anyone, and three things assume it is not

**Momin's ruling, 2026-09-08:** *"this app is created for anyone to use for free... if they can
change these ratios any Type 1 can use it."* The prefill exists for his brother; the app is not
private.

**This is a change of premise, not of wording**, and three parts of the design were justified BY the
old premise. Recorded so they are decided rather than discovered by a stranger.

**1. THE PREFILL IS THE DANGEROUS ONE, and it should be resolved before public promotion.**

§1.2 refused prefilled values for a traced reason, and the prefill was accepted (note 31) on one
argument: *this is for one person who needs zero friction, and the values ARE his prescription.*
**Remove that premise and the justification goes with it.** For a stranger, prefilled `150 / 30 / 10`
is not a stale prescription — it is **someone else's prescription entirely**, and §1.2's worked
example applies with more force: an ICR of 10 against a real 15 doses a 150 g meal at 15 units
instead of 10, about 150 mg/dL of unintended drop.

A first-time stranger who taps through setup and doses from those numbers is the **single most
dangerous configuration this app can be in.** Momin has said the prefill can go once more people use
it; the argument here is that it must go BEFORE the app is promoted, not after.

**And the warning already on that screen does not cover it.** The first-run flag reads *"They are
already filled in from the prescription — target, ISF and ICR."* For his brother that is true. For a
stranger, **"the prescription" is not theirs**, and a sentence asserting otherwise is worse than
silence — it tells them the numbers have authority they do not have.

*Options, for Momin to rule on:* empty fields as §1.2 originally required, with the existing
explanatory hints strengthened so nobody is left guessing what ISF means; or a first-run fork —
"enter my doctor's numbers" / "fill in the example prescription" — where the example path is labelled
as an example. **The fork is the weaker option**: it keeps someone else's ratios one tap away and
adds a screen to the setup, and the hazard it is meant to solve is exactly "a stranger tapped
through".

**2. The confirmation threshold's DEFAULT is calibrated to one person, and here is the arithmetic.**

§6.2 hides the dose and shows the two typed inputs back when the dose reaches the threshold — a
fat-finger catch for `500` typed instead of `50`. The default is 20 units. Worked against real
ratios:

| Ratios | Meant to type | Typed | Dose | Caught? |
|---|---|---|---|---|
| ISF 30, ICR 10 (his brother) | 50 g | **500 g** | 51.0 units | **yes** |
| ISF 50, ICR 30 | 50 g | **500 g** | 16.7 units | **NO — silent** |

The second user's normal mealtime dose is **1.7 units**. A tenfold overdose reaches 16.7 and passes
with no check at all, because 20 was chosen against doses ten times larger. **Nothing on screen tells
them their fat-finger catch is inert.**

It is an editable setting, so nothing is broken for someone who understands it — but a default that
silently does nothing for a whole class of user is worse than no default. **The fix is to make it
RELATIVE rather than absolute**: ask at setup what a usual mealtime dose is and set the threshold
above it, or derive it from the ratios the user just entered. §6.2's own history warns against both
failure modes — a threshold set too high is a dead tier, one set too low "fires always, trains
tap-through".

**3. §14's regulatory posture is a different conversation for a public app.** Stated as fact, not as
an objection: a general-purpose insulin bolus calculator is a regulated medical device in several
jurisdictions — EU MDR and FDA both — and `README.md` already records that **being free and open
source is not an exemption from anything.** A personal tool shared with a brother and a promoted
public calculator sit differently with that. Plenty of such calculators exist publicly; the point is
that going public should be a decision made with this in view rather than around it.

**Wording to change once the above is ruled on**, currently in six places: `src/ui/copy.ts` line 368
(*"configured for one specific person's prescription. If you are not that person, the numbers here
are wrong for you"* — this is in the **first-run disclaimer**, so it is the first thing a stranger
reads), `README.md`, `CLAUDE.md`, and `docs/PLAN.md` §1.

**Trigger: before the app is promoted anywhere.** Deploying it at a URL is not promotion; item 4a's
search work is.

### T6. Analytics and Search Console, for a public app

**Trigger: alongside item 4a, once the audience change (T5) is ruled on.**

**Search Console** — verify the property, submit a sitemap, and read what people actually search to
land on it. Verification is a meta tag or a DNS record; neither costs anything at runtime.

**Analytics is not a free choice here, and item 12 already ruled on it.** `BACKLOG.md` item 12 moved
usage analytics out of "NEVER" on 2026-09-06 — read that entry before implementing, because the
constraint it records still binds: §11.5's content security policy is `default-src 'self'` **with no
third-party origins**, so Google Analytics, Plausible's hosted script and every other drop-in tag are
**blocked by the policy**, not merely discouraged. Loosening the policy to admit an analytics origin
also admits everything else at that origin.

*Which leaves two honest options:* a self-hosted collector behind the same origin, or Cloudflare Web
Analytics-style server-side measurement that needs no script. **And what may be measured is bounded
by the same reasoning as the export:** this app holds blood sugar readings and insulin doses. Counting
page views is fine; anything that could carry a reading or a dose off the device is not, and nothing
in this app has ever sent data anywhere.

---

### T8. Mutation testing for `src/storage`, behind a runner bug

**Trigger: when Stryker's vitest runner can survive `fake-indexeddb`.** Added 2026-09-11 with
§13.4's extension to `src/state`.

**The evidence that this matters, rather than a completeness urge.** `appendReading` stamped the
field that decides §7.5's provenance, which made a blood-sugar reading an input to a §11.2 snapshot
field — forbidden by §7.8 in as many words. It shipped, and the mutation gate could not have caught
it: `stryker.config.json` mutated `src/core` only, so the `ObjectLiteral` mutant that turns
`{ lastLocalWriteAtMs: nowMs }` into `{}` **was never generated**. Neither of the two tests pinning
that field used `appendReading`, so nothing else caught it either. See note 62.

**The obstacle is outside this project.** `vitest.stryker.config.ts` records it: the runner crashes
stringifying `fake-indexeddb`'s `DOMException`. Until that is fixed upstream — or the storage tests
can run against something else — the scope cannot be extended without the run failing for a reason
that has nothing to do with the code.

**What to do meanwhile:** treat every `src/storage` write site as unguarded by the gate, and pin its
effects with an explicit test rather than trusting the badge. The badge is honest about what it
covers; it just does not cover this.

---

### T9. §7.8's home-screen reading entry, and the note control

**Trigger: whenever readings matter more than they do today.** Deferred 2026-09-11 with §7.8's
amendment; recorded here because §7.8 stopped promising it and something has to carry it.

§7.8 specified a reading as *"One field, one button, available from the home screen and offered
automatically after any band C or band D block"*, with an optional `note` from a fixed list —
*before bed*, *overnight*, *felt low*, *after exercise*. **Only the post-block offer shipped.**
There is no home-screen or History affordance, `COPY.reading.noteQuestion` has no consumer, and
`ViewState.readingNote` is never set by any control, so the fixed list renders only for rows that
arrived by import.

**The consequence, stated because it is the section's own motivation:** §7.8 exists because *"every
low reading is systematically absent from the record"* and names overnight readings as an example
— *"Overnight readings are missing for the same reason."* Those are precisely the readings that
still cannot be captured, because they happen when nobody is calculating a dose.

**What it costs to build:** one control on the calculator's home step and one on History, plus a
writer for the note list. Nothing in the core changes; §7.8's storage, validation and export
already handle reading rows, and §10.5's band E derivation already reads them.

---

### T10. A sanity suite, separate from smoke — decide whether two files are worth it

**Trigger: when `smoke.mjs` next feels too big, or when a change needs deep verification of one
area rather than a broad check that the build works.** Raised and deliberately deferred
2026-09-11.

**The distinction, since the terms get used interchangeably.** Smoke is wide and shallow — *does
the build come up, and can a person dose with it.* It runs after every build; the name is from
hardware, where you power the thing on and see whether smoke comes out. Sanity is narrow and deep
— *does this one area still work after I changed it.* It runs after a targeted fix.

**`tools/smoke.mjs` does the first correctly** and has had a few of the second folded into it.

**Not split, and the reason matters more than the decision.** Two suites means two things to
maintain and a judgement call on every new check about which file it belongs in — and that
judgement is the part that erodes, quietly, until both files hold everything. The real concern was
unbounded growth, and a second file does not fix that; it gives growth two places to happen.

**An admission rule went into `smoke.mjs` instead:** a check earns its place only if **(1)** jsdom
cannot see it — it needs real layout, a real content security policy, real fonts or a real service
worker — and **(2)** its failure makes the app UNUSABLE rather than merely imperfect. Applied on
the day it was written, four new pieces of interface produced two qualifying checks and two
rejections, which is the rule doing its job.

**Reconsider when the rule stops holding the line.** If `smoke.mjs` passes roughly thirty checks
or takes more than about two minutes, the argument for splitting becomes real: a sanity suite
would take the per-area depth and smoke would keep the one end-to-end path. Until then, a second
file costs maintenance and buys a category boundary nobody is struggling with.

---

### T7. Release process — versions, tags, and what a tag should mean

**Trigger: when the current fix batch is merged. Parked 2026-09-11 mid-discussion, deliberately —
the safety fixes queued behind it matter more than the ceremony around them.**

**The version bump itself is settled: `0.1.0` → `0.2.0`, not `0.1.1`.** In `0.x` a patch means "bugs
fixed, nothing new to encounter", and this batch gives the user four things they will meet — a
confirmation step at commit (§7.1), a meter-guidance disclosure (§4.5), a new paragraph on the block
screen (§4.3 step 3), and expiry now clearing confirmations (§6.3). Fix E decides it on its own:
backups that imported cleanly before will now have rows dropped, which is a behaviour change at a
data boundary. A patch number would lie about what changed.

**Momin's proposed shape, which is the `release-please` pattern arrived at independently:** small
commits and small PRs for the work; then ONE commit and PR that does nothing but bump the version;
tag that merge commit. Good, and the reason is this batch — 817 insertions across 14 files is past
what anyone reviews well.

**The fact that complicates it, and the reason this is parked rather than decided.** `deploy.yml`
fires on `push: branches: [main]`, so **every merged PR already ships to a real phone.** A tag under
the proposal would therefore be retrospective — "this commit was 0.2.0" — while delivery happened at
each merge. The release would gate nothing. Three ways out:

1. **Deploy on tag instead.** The version shown in the app is then always accurate, and releases are
   deliberate. Cost: a safety fix waits for a release, and in this app a bug is a hypo.
2. **Keep deploy-on-main, tag as a marker.** Fixes travel in minutes; the tag means little.
3. **Keep deploy-on-main, and make the version-bump PR the ON-DEVICE checkpoint** — the tag then
   means *"verified on a real phone"* rather than *"deployed"*. This is the one worth thinking about:
   §13's suite has no interaction-continuity requirement, jsdom has missed every layout defect so
   far, `smoke.mjs` cannot exercise the insecure origin without a real LAN URL, and note 54 was an
   overstated launch blocker born of build confusion. An on-device pass is the check nothing
   automated covers, and tying the tag to it gives it a place in the process instead of depending on
   someone remembering.

**Two consequences to settle with it.** Under options 2 and 3 the app shows the last *released*
version between releases, with a fresh `buildId` — which is fine, because `buildId` is the real
diagnostic key, but it makes §10.8's *"show the running build version … it is the only way to
diagnose a report"* wrong in its emphasis; that line should name the build id. And **no git tags
exist yet**, so whatever is chosen starts clean.

**Separate provenance gap, found in the same discussion:** log rows carry `settingsRevision` but no
app version (§7.1's row shape). If a rounding rule or a band threshold ever changes, an old row's
dose cannot be reconstructed — you would know which settings produced it, not which arithmetic. For
a record §20.6 calls this app's clinical purpose, that is a real hole. It is a schema change, so it
is its own decision, not part of any version bump.

---

## DECIDED — not pending, kept as the record

### D1. Dedicated GitHub organisation / clean origin — DECLINED
`MealUnits.github.io` would give an isolated origin, root scope, and remove §11.7's
shared-storage risk entirely.

**DECIDED 2026-09-06: stays on `mominbinshahid.github.io`.** The URL keeps the author's name, and
§11.7's shared-origin risk is accepted permanently rather than provisionally. Two consequences
that now bind:

- **§11.7's cleanup rule is load-bearing, not precautionary.** `getRegistrations()` and
  `caches.keys()` are origin-wide, so all cache lookup, cache deletion, storage reset and
  registration cleanup must filter to this app's own resources — a careless reset would
  unregister the blog's service worker. It ships as a test, not a sentence.
- **`/MealUnits/` must be excluded from the blog worker permanently**, not transitionally. See
  `BLOG-FIX.md`.

**If it is ever moved anyway:** browser storage is keyed by origin, so nothing migrates
automatically. The path is export → move → import, which preserves the log, the readings,
`settingsHistory` and the current settings. It does **not** carry the `acks` store, so the
disclaimer and any out-of-range confirmations are re-presented, and imported settings are
*proposed* rather than adopted (§7.7). Roughly two minutes of re-accepting — **provided he exports
first.** There is no cross-origin rescue if he does not.

---

## NEVER — the evidence argues against it

### 15. Fat/protein dosing (fat-protein units, Warsaw method)
Reliably improves the late glucose curve and reliably causes **more** low-blood-sugar events
doing it. ISPAD explicitly flags the higher rate as a limitation of the formula. Dietary protein
is *protective* against lows (odds ratio 0.16) — so adding insulin for it removes a safety
margin.

### 16. Bluetooth meter import
Web Bluetooth is absent from Safari on iOS entirely and awkward for bonded glucose profiles on
Android. He types the reading into the calculator regardless, so logging it costs nothing extra.

### 17. A closed-loop or automated dosing anything
Out of scope by an enormous margin. Loop, AndroidAPS and Trio exist, require a pump, and are
built by teams. This app is a calculator.

---

## Open questions carried from PLAN.md §18

1. Is the 150 mg/dL target deliberate? Physician's choice, not to be changed by this project —
   but worth one question at the next appointment.
2. Regulatory framing — deferred to launch (§14).
3. Should the physician see the band thresholds and the ceiling before launch? Recommended, not a
   hard gate.
4. Human-factors walkthrough — walk the actual user through band C, a ceiling confirmation, the
   fail-closed screen and the blank-reading path before shipping.
5. ~~Name — undecided~~ **DECIDED: `MealUnits`.** Chosen over `MealMath` because it carries no
   spelling trap (British "maths" lands in Waitrose/Ocado territory), is clean on every search,
   and names the app's output rather than its process. Research table below kept as the record.
6. ~~Typical meal size in grams~~ **ANSWERED, and it moved two thresholds.** About **50 g** of
   carbohydrate for a 250 g plate of biryani, and — the figure that actually mattered — **24–25
   units of Humulin R per meal**, two or three meals daily, plus 36 units of Lantus. Also
   answered: **his blood sugar sometimes falls to 65 mg/dL**, which falsified the premise two
   review rounds had been built on. See `PLAN.md` §1.4; §18.6 is closed.

---

## Name research — do not repeat this

**34 candidates checked** across five sessions against Google (exact string), npm, GitHub, both app
stores, USPTO trademark search and domain A-records. **Two survive.** Recorded so the dead
ones are not re-proposed.

### Survivors

| Name | Google | npm | GitHub | Note |
|---|---|---|---|---|
| **snackmath** | nothing at all | free | 0 repos | Cleanest. But "snack" undersells a 200 g dinner, and the low-carb advisory fires on genuine snacks — an ironic mismatch |
| **MealMath** | nothing exact | free | 2 repos, **0 stars** each | More accurate — the app calculates a *meal bolus* |

### Rejected, with the reason

| Name | Why it failed |
|---|---|
| `MealMaths` | **Waitrose** and **Ocado** both run "Meal Maths" recipe campaigns. Huge domains. The British "s" is the wrong choice here |
| `InsulinMath` | "Insulin math" is an **established teaching term** — Phoenix Children's and Texas Children's worksheets, Quizlet decks, InsulinWorx. Competing with hospital PDFs |
| `InsuMath` | Nothing real, but two Korean dropshipping subdomains squat the exact string. Also announces medical purpose (§14) |
| `MealBolus` | `bolus.app` is a live product; BolusCalc on both stores; *Bolus Wizard* (Medtronic) and *Bolus Advisor* (Roche) adjacency. And the user did not know the word |
| `PlateMath` | ~15 GitHub repos, App Store app, Vercel site. To lifters "plate math" means barbell plates |
| `DiaMath` | "DiaMath (Diamond Math)" — App Store puzzle game with a YouTube channel |
| `CarbMath` | "Carb math" is generic keto/diabetes-education vocabulary |
| `Gluvi` | Four GitHub repos incl. `Gluvia-Backend` |
| `Gluvia` | Wikipedia genus (Iberian camel spiders) + gluvia.com |
| `Insulife` | Funded Norwegian pharma company doing needle-free insulin. Same sector, owns the .com |
| `Diamate` | diamate.health (AI diabetes management), a DiaMate GitHub **org**, and a registered DiaMate® trademark |
| `DiaBuddy` | A GitHub repo doing literally this, plus multiple Play Store apps |
| `Dialife` | Swiss renal-care company, 40 years, 50 countries — plus a German diabetes education programme with published trials |
| `Glumate` | glumate.net, a shipping chronic-disease app; also a common misspelling of *glutamate* |
| `Kitna` | KITNA on the App Store (currency reader for the visually impaired); also NFL quarterback Jon Kitna |
| `Andaza` | Andaza Quiz App, Andaza Kids, andaza.web.app |
| `SweetSpot` | `github.com/sweetspot` is **SweetSpot Diabetes**, acquired by Dexcom in 2012 |
| `BolusBuddy` | *My Bolus Buddy* is a live shipping MDI companion app |
| `DosePal` | dosepal.com is a live medication-management product |
| `Kibo` | Kibu — "a warm diabetes companion" — one letter away, same category |
| `Spoonful` | Spoonful diet/food scanner app; SPOONFUL is a registered US mark |
| `Unitful` | Unitful.jl, 674 stars — discoverability, not legal |
| `SugarLoop` | "Loop" is *the* DIY closed-loop project. Implies automation this app does not do |
| `Cadence`, `Tally`, `Abaco`, `Beeline`, `Numo` | Large trademark holders, some in the diabetes supply chain |
| `Glymor` | The exact string is a **live agrochemical product** ([cedagro.com/products/glymor](https://cedagro.com/products/glymor)). GitHub has the near-miss `glymorn-dev/glymorn`. npm free and no live US mark — but `Gly-` is a contested morpheme and `-mor` reads as a generic drug (*Glumetza*, *Glyxambi* are real diabetes drugs) |
| `carbcanary` | **Nothing found anywhere** — zero GitHub repos, npm free, no app, no indexed mark. Rejected on meaning: a canary *warns you*, and warning/monitoring is itself a medical-purpose signal (§14). As two words, "carb canary" also collides with CARB (California Air Resources Board) and Canary Media |
| `Diavexa` | **The cleanest string checked** — 0 GitHub repos, npm free, neither app store, no exact web match, 0 live USPTO marks. Rejected on meaning: `dia-` was the most contested prefix in the whole search, and `-vexa` reads unmistakably as a prescription drug, which fights a first screen saying this is not a medical device |

**Structural finding:** every name built from `dia-`, `glu-`, `insu-`, `bolus` or `carb` is
taken, because those morphemes are the contested resource. Anything descriptive enough to signal
"diabetes app" was claimed years ago. Only coined words nobody had a reason to register survive —
which is why the two survivors are both compounds of ordinary English words.

**And the last three rows say the opposite thing, which is worth keeping:** a free string is not
the same as a usable name. `carbcanary` and `Diavexa` cleared every source and were still refused,
because what a name *implies* — alerting, or a prescription drug — argues with §14's "not a medical
device". Availability was never the binding constraint.
