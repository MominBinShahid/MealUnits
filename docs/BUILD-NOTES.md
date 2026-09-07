# Build notes — decisions the plan did not state, and things to confirm

**Purpose:** `PLAN.md` is the specification. Building it surfaced questions the specification does
not answer, plus a few places where two of its own sentences point in different directions. Every
one is recorded here rather than settled silently in the code, because §20.5's rule is that anything
decided and not written down does not exist — and a decision buried in a source file is not written
down in any useful sense.

**Status of every entry: DECIDED IN CODE, NOT CONFIRMED BY MOMIN.** Each says what was chosen, what
the alternative was, and what would have to change to reverse it.

**How to use this file:** read it after the build, before the code review. An entry marked
**ORDER, ruled 2026-09-08:** the `[CONFIRM]` entries are reviewed **after the first deployment**, on
Momin's instruction. Nothing in them blocks a deploy — each records a decision already made and
implemented, and the question is whether the decision was right, not whether the code works. Getting
the app onto his brother's phone comes first (§1.4: it currently competes with a fixed 24-25 units).

`[CONFIRM]` needs a yes or no. An entry marked `[FYI]` is a fact about the build worth knowing but
carries no question.

**One notation rule, because breaking it produced a silent defect here.** Throughout this project the
section sigil means a section of `PLAN.md` and nothing else. Entries in THIS file are referred to as
**"note N"**. Three self-references were originally written with the sigil, at 15, 16 and 24 — and
the first two resolved, wrongly and silently, against PLAN.md's own sections of those numbers. Only
the third was caught, because 24 overflows PLAN.md's numbering and `check-plan.py` reported it as
dangling. **A convention that only fails visibly past a boundary is not a convention**, which is why
the rule is written here rather than remembered.

---

## 1. Rounding operates on the decimal representation, not on the value scaled by 100 `[CONFIRM]`

**Where:** `src/core/decimal.ts`, and everything downstream of it.

**The problem.** §2.2 requires every mode to break ties half away from zero. §2.3 warns that
`Math.round(1.005 * 100)` is 100 rather than 101, because the multiplication lands on
`100.49999999999999`. It records the hazard and does not say what to do about it.

**What forced the decision.** §5.2's own table states that under the `off` mode, **−1.495 rounds to
−1.50**. Measured: `-1.495 * 100` is exactly `-149.5`, and `Math.round(-149.5)` is `-149` — because
`Math.round` breaks ties toward +∞, not away from zero. So the scaled route gives **−1.49** and
contradicts the plan. Rounding the shortest decimal the number prints as gives −1.50 and agrees.

**Decision.** Round the decimal representation. `toPlainDecimal` expands any exponent form, and the
rounding rule reads digits positionally.

**What it costs.** The two rules disagree on **572** of the values in (0, 100) whose shortest decimal
has three places. Both tests are in `test/decimal.test.ts` and compute the figure rather than
asserting it.

**To reverse it:** §5.2's −1.495 → −1.50 row would have to change, and the golden cases at 1.005,
±1.125 and ±1.495 with it.

---

## 2. An above-range reading gets "check the number", never band E `[CONFIRM]`

**Where:** `src/core/resolve.ts`, and the golden case named "§4.5 — 605 gets 'check the number'".

**The problem.** §4.5 contains two sentences that cannot both be executed:

> "A reading below 20 or above 600 is **not** merely 'invalid': per step 3, below-range routes to the
> low-reading response and **above-range to band E wording**."

> "A typed `605` (a plausible typo for `60.5`) gets plain *'check the number'* plus a link to the HI
> guidance, **not** band E's ketone wording — 'check ketones' is a confusing reply to a typo."

**Decision.** The second one, because it is the more specific and it carries its own reasoning. An
above-range reading produces `invalid_input` with reason `above_range` and asserts **no band at
all**. The interface attaches the HI guidance to that reason.

**Consequence worth seeing:** the error reasons are `above_range` and `below_range` rather than a
single `out_of_range`, precisely so the interface can tell the HI case from the LO case without
re-reading the number.

---

## 3. `lastDose` is named for the figure it holds `[FYI]`

**Where:** `src/core/types.ts`.

§11.2 records a blocking round-9 finding: the snapshot said `lastDose {units, atMs}` without saying
whether `units` was the calculated or the injected figure, and "a test author who pinned the
calculated number would have pinned the wrong gate input."

The field is therefore called **`injectedHundredths`**. The name answers the question the finding was
about, and §2.2's representation is in it too, so nothing downstream reconstructs units as a float.

The golden fixtures still write `lastDose: { units: 6, atHoursAgo: 2 }`, which is §13.2's schema, and
the harness converts. The fixture stays readable; the type stays unambiguous.

---

## 4. Two snapshot fields the plan implies but §11.2's list does not name `[CONFIRM]`

**Where:** `src/core/types.ts`, `Snapshot`.

§11.2 lists the snapshot's contents. Two things the resolver cannot work without are absent from
that list, though both are legislated elsewhere:

| Field | Legislated in | Why it has to be in the snapshot |
|---|---|---|
| `blankReadingAcknowledged` | §4.6 | The acknowledgement is per-calculation and never persisted, so it cannot come from storage; and §4.3 step 6 resolves it inside the precedence order, which reads only the snapshot |
| `largeDoseConfirmed` | §6.2, §6.3 | The confirmation "applies only to the exact values confirmed", which is exactly what a committed snapshot is |

Neither is persisted. Both die with the snapshot, which is what §4.6 and §6.3 require.

---

## 5. §6.4's bound is checked twice, on purpose `[FYI]`

**Where:** `src/core/resolve.ts`.

§4.3 puts the bound at step 9 and the rounding at step 10. But §6.4 says the check carries "a
one-increment allowance for the rounded dose", and the rounded dose does not exist until step 10.

So: the primary check (`clamped > bound`) runs at step 9 exactly as written, and a second assertion
including the allowance runs after step 10. Both return the same `bound_failure` outcome, and both
sit ahead of §6.2's confirmation, so "the app is wrong, not the user" is never replaced by a prompt
asking him to re-read his inputs.

---

## 6. A blocked low carries every input error alongside it `[CONFIRM]`

**Where:** `src/core/resolve.ts`, the `blocked_low` outcome.

§4.3 step 4 says to collect the errors and not let them replace step 3's low-reading guidance. It
does not say which errors travel with the block.

**Decision:** all of them. A valid in-range low such as 65 produces no blood-sugar error at all, so
nothing spurious appears; a reading of 0 or 19 produces one, and that pair **is** §4.3 step 3's
"combined invalid-reading-and-possible-low response". Settings errors do not travel — a blocked low
needs no setting to be correct, and routing him to settings while telling him to treat first would
bury the instruction that matters.

---

## 7. "History was just imported" needed an operational definition `[CONFIRM]`

**Where:** `src/core/history.ts`, `HistoryContext`.

§7.5 lists four conditions that make provenance suspect: an empty log, a log predating the app's own
install, **history just imported**, and a row excluded by §7.6. The third has no definition — "just"
is not a duration.

**Decision:** an import counts as recent until this install writes a row of its own.

```
justImported = lastImportAtMs !== null
               && (lastLocalWriteAtMs === null || lastLocalWriteAtMs < lastImportAtMs)
```

Imported rows carry the other install's timestamps, so a clock-based window would be wrong in both
directions. This reads "suspect" for exactly as long as the app has not yet seen him inject.

---

## 8. §11.8 needed a second lint rule to be enforceable `[FYI]`

**Where:** `eslint.config.js`.

§11.8 requires that no numeric literal appears outside `src/config.ts`, "enforced by lint rule, not
convention", and names `no-magic-numbers` with an exemption set of 0, 1, −1 and 100.

**`no-magic-numbers` does not report `const ROUND_UP_FROM = 5`.** So any file can launder a literal
through a local constant, which is exactly how a number escapes `config.ts` — and it is the shape a
tidy-looking refactor produces. A second rule reports the literal itself wherever it appears,
exempting only the four values §11.8 names.

Both rules are on. The first gives the better message; the second is the one that actually closes
the door.

---

## 9. `config.ts` gained a section the plan does not list `[CONFIRM]`

**Where:** `src/config.ts`, "UNIT CONVERSION AND FORMATTING".

Milliseconds per hour, minutes per hour, the twelve of a twelve-hour clock, the two of two decimal
places, the digit at which half-away-from-zero rounds up. §11.8's block does not contain them, and
they are not decisions — they are arithmetic.

They are in the file anyway, because §11.8's rule cannot survive an unwritten "except the obvious
ones" clause: the moment one number is allowed to live elsewhere, the rule stops being mechanical.
They sit under their own heading so nobody mistakes them for clinical constants.

---

## 10. The icon's colour is a choice; its geometry is a specification `[CONFIRM]`

**Where:** `tools/icon.svg.mjs`.

§20.4 specifies the mark exactly — ring `r32.5` at stroke `17`, disc `r20.5`, H reversed out — and
gives no hex. The IDF's own style guide puts the blue circle at Pantone 279 C, so the file uses
**`#418FDE`**, which is that colour converted. One constant, one place, easy to change.

The maskable variant scales the mark to 0.62 so it clears every common launcher mask including the
squircle, and it is a **separate file** with `"purpose": "maskable"` — §12 forbids `"any maskable"`
on one file.

---

## 11. The calendar functions take an explicit time zone `[CONFIRM]`

**Where:** `src/core/calendar.ts`.

§13.1 requires the timing function to be tested "with fixed timestamps and an explicit timezone", so
nothing here reads the host's zone. That leaves the app itself needing to supply one.

**Open until the interface is built:** whether the app uses the device's zone or a fixed
`Asia/Karachi`. The device's zone is right for a phone that stays in one country and wrong for a
record that gets read after a move; a fixed zone is the reverse. §10.5's calendar-day boundary and
§10.4's rendered times both depend on the answer, and §18.8 already sends the day-boundary question
to the physician.

---

## 12. Three floating-point values in a test were wrong because they were remembered `[FYI]`

I wrote `2.35 * 100 === 234.99999999999997` and `-1.495 * 100 === -149.49999999999997` from memory.
Both are false: the first is exactly 235, and the second is exactly −149.5. A third was wrong the
same way.

The tests now **measure** rather than assert: they count the disagreements (572 three-decimal values,
4587 two-decimal values) and pin the counts. The corrected examples are `8.575 * 100`, `0.07 * 100`,
`0.29 * 100` and `4.02 * 100`, each verified by execution before being written down.

Recorded because §19's standard is that a withdrawal is written down rather than quietly deleted, and
because it is the same class as every count this project has had to withdraw: a number stated without
being run.

---

## 13. `BLOG-FIX.md` §6's critique of the avatar CSS was wrong, and is withdrawn `[FYI]`

The file claimed `aspect-ratio: 1 / 1` was inert in that rule because width and height are both
definite. Measured in headless Chrome: the height is `clamp(120px, 90%, 230px)`, that percentage
resolves against a parent whose height is `auto`, so it does not resolve — the height computes to
`auto` and **`aspect-ratio` is the line doing the work**.

The committed rule measured 268 × 230 (an ellipse) against the working tree's 230 × 230. Momin's
change is correct, the objection was not, and the file now carries the measurements. The avatar file
is untouched.

---

## 14. `Intl` renders September as "Sept" in en-GB, so month names are spelled out `[FYI]`

**Where:** `src/core/calendar.ts`.

Measured, after a test failed on it:

```
en-GB   6 Sept 2026      Jan Feb Mar Apr May Jun Jul Aug Sept Oct Nov Dec
en-US   Sep 6, 2026      Jan Feb Mar Apr May Jun Jul Aug Sep  Oct Nov Dec
```

`en-GB` gives day-first, which §7.7.1's own example wants, and four letters for September alone.
`en-US` gives three letters and month-first. Neither gives both.

The readable export is a document a clinician reads and forwards, so a nine-line table of month
abbreviations replaces the locale call. It cannot drift when a browser ships a new ICU, and it
matches §7.7.1's "18 Aug – 2 Sep" exactly.

Worth noting that this is the shape of defect the plan keeps naming: it looked right, it was wrong in
one of twelve cases, and only running it showed which.

---

## 15. Vitest is pinned to 4.x because Stryker's runner does not work with 5.x `[FYI]`

**Where:** `package.json`.

The first mutation run reported a score of **2.57%** against 308 passing tests. That is not a
testing gap — it is a tool reporting that nothing happened. The tell was in the log:

```
Ran 1.28 tests per mutant on average.     <- vitest 5.0.0
Ran 9.05 tests per mutant on average.     <- vitest 4.1.11
```

`@stryker-mutator/vitest-runner@10` activates a mutant by `ctx.provide('activeMutant', id)` and
reading it back with `inject()` inside the test worker. Under Vitest 5 the value does not arrive, so
every mutant runs against unmutated code and survives. The runner's own devDependency is
`vitest: 4.1.10`, which is the version it was integration-tested against.

**Pinned to `^4.1.11`.** For a project whose merge gate is a 100% mutation score, a working mutation
runner is worth more than the newest minor.

**A consequence that turned out to be temporary, recorded because I nearly shipped it as permanent.**
On npm 10.9.4 the install needed `--legacy-peer-deps`: npm's own peer resolver **crashed** on this
graph with `TypeError: Cannot read properties of null (reading 'edgesOut')` inside arborist, which is
a bug rather than a conflict message. Momin pushed back on carrying that flag. **On npm 11.19.0,
which ships with Node 24, the crash is gone and a plain `npm install` succeeds** — verified on a
clean tree. The flag is removed and the README no longer mentions it.

A workaround for somebody else's bug should be re-tested when that somebody ships a new version, and
this one would not have been.

**Worth stating plainly:** had the run been taken at face value, "82% of the core is unverified"
would have been the wrong conclusion, and chasing it would have meant writing tests for code the
existing tests already covered. Reading the score without reading the runs-per-mutant line would have
produced exactly that.

---

## 16. The 100% mutation score is real, and eighteen mutants are disabled by name `[CONFIRM]`

**Where:** `reports/mutation/index.html`, and sixteen `// Stryker disable` comments in `src/`.

§13.4 sets `thresholds: { break: 100 }`. The core meets it: **1302 mutants killed, 0 survived, 0
uncovered**, across 405 tests. Getting there took four passes, and it changed the code more than it
changed the tests — which is the point of the exercise.

**A score of 100% with sixteen disables is not the same claim as a score of 100% with none**, so
here is every one, what it is, and why it cannot be shown failing. §6.5's own doctrine is that a
check which cannot fire is "disabled and declared" rather than left implying coverage.

| Where | Kind | Why no test can kill it |
|---|---|---|
| `resolve.ts` ×2 (bound failure) | Unreachable | §6.4 states it: given §4.5's hard ranges, `total <= bound` is a **mathematical identity**. `boundUnits` and `exceedsBound` are tested directly, both failing directions included |
| `resolve.ts` (blocking-band re-check) | Unreachable | Step 3 returns for every reading below 70, so step 7 cannot produce band C or D. Kept because §3.4 makes them terminal and a future edit to step 3 must not route around it |
| `calendar.ts` (part read) | Unreachable | `Intl.DateTimeFormat` rejects an unknown zone at construction, and every zone it accepts emits all five parts |
| `parse.ts`, `resolve.ts` (finiteness re-checks) | Unreachable | §2.3 rule 1 requires finiteness "before range checks **and again** after arithmetic". These are the again |
| `history.ts` ×2, `resolve.ts` (null guards) | **Coercion-equivalent** | `null >= 250` is `0 >= 250`; `null < timestamp` is `0 < timestamp`. The guard and the coercion agree on every input — and §4.1's entire subject is that they must not be allowed to |
| `baseline.ts` (tombstone filter) | Coercion-equivalent | A tombstone carries no `carbs`, and `undefined > 0` is false. The type system needs the filter regardless |
| `divergence.ts` (zero branch) | Equivalent | With a calculated dose of zero the ratio clause reduces to `injected >= 0`, already true past the absolute floor. §7.1 declares the branch anyway |
| `calculate.ts` (`> 0` on suppression) | Equivalent | `>` and `>=` differ only at a correction of exactly zero, and suppressing zero is arithmetically identical to applying it |
| `decimal.ts` (`exponent < 0`) | Unreachable boundary | `(1e0).toString()` is `"1"`, never `"1e+0"`, so the exponent is never zero in that branch. **Verified by scanning 200,000 magnitudes plus every extreme** |
| `resolve.ts` (empty advisory array) | Equivalent by design | Seeding it with a bogus entry changes nothing, because `rankAdvisories` is a **whitelist**. That is the property §10.5 wants |

**Every one of those is a comment in the source with its reasoning attached**, so the next reader
finds the argument at the line rather than in a report.

**What the exercise actually found**, which is worth more than the number:

1. **`resolve.ts` tested a condition whose first half no input could decide.** §7.4.1 says the
   override figures are withheld "when **either** the meal-only figure or the override candidate
   reaches the threshold" — but suppression only ever removes a *positive* correction, so the
   candidate is always at least the meal-only figure and rounding is monotonic. `dose >= threshold`
   **implies** `candidate >= threshold`. One operand, with the implication written down.

2. **`median` had a length check and an undefined check that could never disagree**, and
   `evaluateCarbAdvisory` computed `enabled` and then re-asked `carbBaseline === null`. Both
   collapsed to one condition.

3. **A `??` in `median` turned out to be load-bearing.** `sorted[middle - 1] ?? upper` — as `||` it
   would replace a legitimate median of **0**, which is §2.3 rule 3 in a place that is easy to miss.
   Now pinned by `median([0, 4]) === 2`.

4. **`bands.ts` took a nullable correction**, and `null <= -1.5` coerces to `0 <= -1.5`, so the null
   case was indistinguishable from a correction of zero. Split into `classifyLowBand`, which needs no
   setting at all — which is what §4.3 step 3 describes anyway.

5. **`computeExact` took a one-field options object.** `{}` reads as `false`, so the flag could never
   be shown to matter. Now a boolean parameter.

---

## 17. The design loads Google Fonts; §11.5's policy forbids them — RESOLVED, SELF-HOSTED `[FYI]`

**Where:** `design/step-flow.html` links `fonts.googleapis.com`; `src/ui/styles.css` does not.

§11.5 sets the content security policy as `default-src 'self'`, no inline script, no `unsafe-eval`,
**no third-party origins**. The mockup uses Space Grotesk and IBM Plex Mono from Google's CDN, which
that policy blocks outright.

§20.3's ground rule decides it: *"Any mockup, prototype or screen design must match `PLAN.md` as it
currently stands... Where a proposal conflicts with live plan text, the plan wins until Momin rules
otherwise."* The policy is live plan text; the font choice is a mockup.

**Built with a system font stack**, plus `font-variant-numeric: tabular-nums` everywhere digits line
up, which is what §10.4 actually asks for. On his Android phone that resolves to Roboto: already
resident, zero bytes, no load delay, and no flash of fallback text on a cold offline start.

**RESOLVED on 7 Sep 2026: Momin took the self-hosted option.** Both faces now ship as woff2 under
`/MealUnits/fonts/`, declared in `src/ui/fonts.css`, which satisfies `'self'` with no policy change.

**42 KB, not the 109 KB a naive download would have cost.** Google's stylesheet returns 22 faces
across five subsets; only the six `latin` ones are needed for English copy. And the four Space
Grotesk weights it serves — 400, 500, 600, 700 — are **the same file four times**, which was
verified by hashing them: four identical md5s. It is one variable font, so it is declared once over
`font-weight: 300 700`. Taking the four URLs at face value would have tripled the font payload for a
phone on mobile data.

`font-display: swap` on every face, so a cold offline start paints in the system stack immediately
and swaps when ready. **A dose must never wait on a font.**

---

## 18. §11.5's policy blocks inline `style` attributes, and that broke a real layout `[FYI]`

**Where:** `src/ui/components.ts`, `src/main.ts`, `src/ui/dom.ts`.

Driving the built app in headless Chrome turned up seven copies of this:

```
Applying inline style violates the following Content Security Policy directive
'style-src 'self''. ... The action has been blocked.
```

The keypad's primary action spanned its three columns through a `style`
attribute. `style-src 'self'` blocks the attribute form outright, so on the
deployed build that button would have sat in one column with the layout quietly
wrong — **no error a user would see, and nothing a unit test would catch**,
because it is a rendering consequence of a header that only exists in the
production build.

Fixed by moving both cases into the stylesheet, and by **removing `style` from
the `h()` helper's attribute type** so the same mistake cannot be made again.
A helper that offers an attribute the policy forbids is a defect generator.

**Worth stating plainly:** the CSP is injected only at build time — the dev
server needs inline script for hot reload — so `npm run dev` would never have
shown this. It took building, serving and driving the real artifact.

---

## 19. Two things that looked like bugs in the browser run and were not `[FYI]`

Recorded because both would read as defects to anyone re-running the walkthrough.

**"A newer version is ready. Use it now" appeared mid-run.** That is §11.4's
update prompt doing exactly its job: the second build produced new hashed assets,
the new worker installed and waited, and the page offered the swap rather than
taking it. §11.4's update-coherence rule is that HTML, assets and worker move
together or not at all, and the old version kept serving until the tap.

**The dose came out 5 units instead of 11 on the second run.** The first run had
logged 11 units minutes earlier into the same browser profile, so §7.4's stacking
gate suppressed the positive correction and covered the meal alone. The
breakdown rendered it correctly too — struck through, with its reason, exactly as
§10.3 requires:

```
330 down to 150 — held back, you injected recently    6
50 g of carbohydrate                                  5
Total                                                 5 units
```

The gate fired on its own, on real data, without being asked to.

---

## 20. Transient interface state lives outside the reducer `[CONFIRM]`

**Where:** `src/ui/app.ts`, `ViewState`.

§11.2 asks for "one explicit application state, a pure transition function, and a result derived from
a committed snapshot". Nine fields do not go through it: which confirmation is open, whether a
disclosure is expanded, the settings draft as typed, the disclaimer checkbox, and §6.7's answer
before it is saved.

**The thing §11.2 protects is the dose** — "one event updating the dose while another leaves the
breakdown, the warning or a saved setting stale". None of these can change a dose, a band or a gate.
Putting them through the tested reducer would mean every dose test carried a dialog flag.

**To reverse it:** move them into `AppState` and extend `reduce`. The tests would need a `view`
sub-object threaded through them, which is the cost being weighed here.

---

## 21. The time zone is the device's, and that is open `[CONFIRM]`

**Where:** `src/main.ts` — `Intl.DateTimeFormat().resolvedOptions().timeZone`.

§13.1 requires the calendar functions to take an explicit zone, and they do. What the app then passes
is the device's.

**The trade-off, unresolved:** the device's zone is right for a phone that stays in one country and
wrong for a record read after a move — every historical row would silently re-render in the new zone,
including §10.5's calendar-day boundary and §10.4's noon/midnight rendering. A fixed `Asia/Karachi`
is the reverse: right for the record, wrong if he moves.

**Not decidable from the plan**, and §18.8 already sends the neighbouring question — where the
band E day boundary falls — to the physician. Worth deciding at the same time.

---

## 22. What is built, against §17's list

**Toolchain, after Momin's ruling of 7 Sep 2026** (see note 24): Node 24.20.0, and every package on its
latest release except Vitest and TypeScript, each held back for a stated reason.

| Step | State |
|---|---|
| 0. Blog service-worker fix | **Applied in the working tree, verified against the built `sw.js`. Not committed, not pushed** — your ruling. |
| 1. Scaffold, CI, deploy pipeline | Done. Both workflows written; neither has run, because nothing is pushed. |
| 2. The whole tested core | Done. 100% mutation score at the `break: 100` threshold §13.4 sets. |
| 3. State machine and reducer | Done, including §18.14's wizard. |
| 3b. Storage | Done: allocation rule, row stamp, fail-closed, recovery read, all four cross-tab layers. |
| 4. Settings screen | Done, including §10.1.6's delta and §5.1's ceil gate. |
| 5. Calculator | Done, all of `step-flow.html`'s gates. |
| 6. Log, both exports, stacking, override, advisory | Done. |
| 7. Service worker, manifest, install and backup prompts | Done. Every item on §11.4's list is implemented and commented with which item it is. |
| 8. First run, disclosures, clearing controls, fail-closed escape | Done. |
| 9. `CLINICAL.md`, `README.md`, icons | Done. **On-device testing on his actual Android phone is yours** — it needs the phone. |

**What has NOT happened, and cannot happen from here:**

- **§17 step 9's on-device test.** The app has been driven end to end in headless Chrome and in a
  jsdom harness, and neither is an Android phone in his hand. §18.9's human-factors walkthrough — band
  C, a ceiling confirmation, the fail-closed screen, the blank-reading path, walked with the actual
  user — is also outstanding and is the kind of thing this project has repeatedly found only by doing.
- **Nothing is committed or pushed**, in either repository.
- **CI has never run.** The workflows are written against the documented action versions; the first
  push is the first execution.

---

## 23. A real bug the final verification pass found in my own storage layer `[FYI]`

**Where:** `src/storage/tx.ts`.

`npm test` reported an unhandled `InvalidStateError` while every test still passed. Traced to
`runTransaction`: when a REQUEST rejects, IndexedDB has already aborted the transaction, and my
error path then called `tx.abort()` a second time. The spec answers that with an `InvalidStateError`
thrown from a place nothing awaits.

**The failure mode is the bad part.** It surfaced as an unhandled rejection carrying the WRONG error,
so a colliding `settingsHistory` key — §11.3's allocation bug, the one `add`-not-`put` exists to catch
— would have been reported as an invalid-state error from an unrelated line, with the real cause
discarded.

Fixing that exposed a second, quieter one: the transaction's own `onerror` fires before the work's
catch, and `tx.error` was null, so the caller got `"The write did not complete."` §11.3 appends
history with `add` rather than `put` **"so any future allocation bug fails loud instead of silently
rewriting provenance"** — and an anonymous message is not loud.

The error event **bubbles from the failing request to the transaction**, so `event.target.error` is
the specific cause. Both fixed, and pinned by a test that asserts a duplicate key rejects with
`name: 'ConstraintError'` and leaves the store unchanged.

**Worth noting how it was found:** not by a test failing. Every test passed. It was the line
`Errors 1 error` under a green summary, which is exactly the kind of thing that gets skimmed past.

---

## 24. Node and two packages were behind, and the pattern is worth naming `[FYI]`

**Momin asked whether the app was on the latest Node and the latest tooling. Partly, and the gaps
were mine.**

| | Was | Now | Latest | Why the gap |
|---|---|---|---|---|
| Node | 22.22.0 | **24.20.0** | 26.8.1 (Current) | v22 (Jod) is in **maintenance**; v24 (Krypton) is the active LTS. I took whichever version `fnm` already had installed rather than choosing one. |
| TypeScript | 5.9.3 | **6.0.3** | 7.0.2 | A stable major behind for no reason at all. |
| jsdom | 28.1.0 | **30.0.1** | 30.0.1 | Two majors behind, same cause. |
| Vitest | 4.1.11 | 4.1.11 | 5.0.0 | Deliberate — note 15. |

**The pattern, which is exact:** every package I typed a version range for while scaffolding went
stale; every package I installed with a bare `npm install -D` resolved to latest and stayed there. I
then spot-checked six of them against the registry, upgraded those, and stopped — so **partial
verification read as complete verification.** Same shape as the three floating-point values I wrote
from memory earlier in this build: some were checked, none were flagged as unchecked, and the
unchecked ones were wrong.

**TypeScript stops at 6.0.3 rather than 7.0.2, and that is a real constraint rather than caution.**
`typescript-eslint@8.69.0` — the newest release — declares `typescript: >=4.8.4 <6.1.0`, and no
release accepts 7 yet. TypeScript 7 is the Go rewrite; taking it now would disable every type-aware
lint rule, **including the `no-magic-numbers` rule that enforces §11.8's "every number lives in
`config.ts`"**. Worth revisiting when typescript-eslint ships support.

**Node 24 also removed the `--legacy-peer-deps` workaround** — see note 15.

**One thing npm 11 changed that is worth knowing:** it no longer runs install scripts by default, and
warns that `esbuild@0.28.2` has an unapproved `postinstall`. **Nothing is broken by that**, because
esbuild ships its platform binary inside the optional `@esbuild/darwin-arm64` package and the
postinstall is only a fallback path. Verified: the binary is present, it is `arm64`, esbuild loads,
and the service worker still compiles. The script is deliberately left unapproved — an install script
that does not need to run is one that should not.

---

## 25. The render loop destroyed focus, caret and scroll on every keystroke `[FYI]`

**Found by Momin on 7 Sep 2026, by hand, on a real Mac and a real Android phone** — at a moment when
541 tests, a 100% mutation score and a clean headless-Chrome walkthrough all reported green.

**The symptom:** typing a number into any settings field entered ONE character, then dropped focus
to `<body>`, so every later keystroke went nowhere. Entering `150` meant tapping the field, typing
`1`, tapping it again, typing `5`, tapping it again. The screenshot that started this had `1` in the
sensitivity field and `Must be between 5 and 200.` underneath it.

**The cause,** `src/ui/app.ts`: `render()` calls `replaceChildren(host.root, …)`, which destroys and
rebuilds the entire tree on every state change. Everything the browser attaches to a node's
*identity* — focus, caret, scroll anchor, composition state — dies with the node.

Measured in headless Chrome with the field centred in the viewport:

| | Before the patch | After |
|---|---|---|
| Typing `36` | `3` | `36` |
| `document.activeElement` | `BODY` | `INPUT` |
| `scrollY` | 982 → **27** | 982 → **982** |

**Why 541 tests and a 100% mutation score missed it, which is the part worth keeping.**

1. **`typeInto` assigned `input.value = "150"` in one statement and fired one `input` event.** That
   is a single render. The defect exists only BETWEEN renders, so the helper did the one thing that
   cannot reproduce it.
2. **No test anywhere referenced focus.** `grep -rn "activeElement" test/` returned nothing.
3. **The 100% mutation score covers `src/core`** — pure arithmetic with no DOM. This lives in
   `src/ui`. Mutation testing was never pointed at it.
4. **§13 has no interaction-continuity requirement at all** — no mention of focus, caret, keystrokes
   or scroll. Neither number was lying; nothing was ever aimed at this class.

**The fix, and its limits.** `captureFocus`/`restoreFocus` in `src/ui/dom.ts`, called from the single
call site in `render()`. Inputs carry a `data-field` so a rebuilt element can be found again.

**This is the weak kind of fix and is marked as such in the code.** It holds only while every render
path remembers to call it — the exact shape §11.3 rejected when it chose IndexedDB over Web Locks:
*"it only works if every writer takes the lock, and a single path that forgets restores the race with
no error."* The construction-grade answer is keyed reconciliation, which preserves node identity by
algorithm. That is **`BACKLOG.md` T3** (Preact), and these functions are meant to be deleted when it
lands.

**Two details that cost a measurement each:**

- **`focus({ preventScroll: true })` is load-bearing.** A plain `focus()` scrolls the element into
  view AFTER the scroll restore, silently overriding it.
- **Scroll is restored only when the view key is unchanged.** Restoring it across a navigation would
  strand the user part-way down a screen they have not seen.

**The tests that now guard it** — and they were verified by removing the patch and watching them go
red, because a regression test nobody has seen fail is a guess:

- `typeInto` types **one character at a time into whatever currently has focus**, rather than
  re-finding the field. Re-finding is a workaround for the defect under test; typing into
  `document.activeElement` means **the whole integration suite now depends on focus continuity**.
  With the patch removed, most of the suite fails, not just the four new tests.
- Four explicit tests under *"interaction continuity"* cover focus, the full `150`, the caret
  position, and the scroll rule.

**One honest correction, recorded because §19 requires it.** The scroll symptom was first measured at
600 → 27 using a field that sat ABOVE the viewport, where the browser was legitimately scrolling it
into view — a real effect misread as the bug. Re-measured with the field centred: 982 → 27. **The
symptom was real and the first number was not**, and the difference was only visible because the
trace was read instead of the summary.

**Carry into `PLAN.md` when T3 lands:** §11 gains the rule that the view layer preserves DOM identity
across renders; §13 gains an interaction-continuity requirement, which it does not have today.

---

## 26. The mockup's atmosphere was missing, and that was an omission rather than a decision `[FYI]`

**Momin noticed the shipped app looked flat next to `docs/design/step-flow.html` and asked why.**
Two different causes, and only one of them was a decision.

**The fonts were a decision, and it was recorded** — note 17, resolved above.

**The gradients were not.** The mockup carries five and the first build shipped zero. The colour
TOKENS were carried across faithfully; the depth was left behind. **Nothing blocked it** — a
gradient is pure CSS with no origin to fetch from, so §11.5 has no opinion on it. It was simply not
done, and it went unnoticed because no check compares the built app's appearance to the design's.

What went in:

| From the mockup | Where |
|---|---|
| `radial-gradient(120% 90% at 50% 0%, …)` page wash, lit from the top | `#app`, via a `--wash` token |
| The red wash on a §3 block | `#app.mood-halt` |
| White-to-mint sheen on the headline dose | `.result .n`, via `background-clip: text` |
| IBM Plex Mono eyebrow, wide tracking, mark colour | `.dots .where` |
| The display-size headline with tight tracking | `.ask` |

**Three things this turned up that were worth more than the pixels:**

1. **Band E was wired to wash the page amber, and that was wrong.** Band E is an advisory beside a
   VALID dose — "above 250, check ketones" — and it already carries its own amber flag. Washing the
   whole screen made a correct result read as a failure. A page-level colour change has to mean
   *there is no dose here*, or it means nothing, so only a §3 block repaints now. **Caught by
   looking at a screenshot**, which is the only way it could have been caught.
2. **The dose sheen needed a fallback that keeps the number visible.** `color` is set before
   `background-clip: text`, so if the clip is unsupported the dose renders in full-contrast ink
   rather than as a transparent fill. **A dose that vanishes is worse than a dose without a
   gradient.** The sheen is also removed on a stale result (§8.2) — leaving it on would make the
   most eye-catching thing on screen the number you must not use.
3. **The wash sits on `#app`, not `<body>`.** Custom properties inherit downward, and the shell can
   only set a class on its own root, so a token redefined there cannot reach an ancestor.

## 27. The service worker's precache was a hand-maintained list, and the fonts exposed it `[FYI]`

`vite.config.ts` built its precache from `assets` and `icons` **by name**, plus the manifest. Adding
self-hosted fonts under `public/` made them invisible to it: they shipped, the stylesheet referenced
them, and they were absent from the precache — so a cold offline start would have silently fallen
back to the system face. Not a crash. Just quietly not the app that was designed.

**§20.5 and `check-plan.py` had both already learned this lesson** — a hand-maintained list of
inputs rots on exactly the change that adds one. The precache is now produced by walking the output
directory, with three deliberate exclusions: `sw.js`, because a worker that precaches ITSELF serves
its own stale copy and can never be replaced; `index.html`, which the worker adds as `SHELL`; and
source maps, which are for a developer at a desk and not a phone on mobile data.

## 28. Settings and History moved to the foot of the screen `[FYI]`

**Momin's call, and the reasoning is thumb reach**: they sat at the TOP of a one-handed phone
screen, which is the furthest point on the display, and neither is urgent enough to earn that
position. `Back` stays at the top, where a back affordance belongs.

Two details that are not arbitrary:

- **They render on the first step only.** Mid-calculation there is a half-entered reading on screen,
  and an exit sitting next to the keypad invites losing it.
- **`space-around`, not `space-between`.** Pinned to the two bottom corners they become the easiest
  things to hit while reaching for the keypad above — and these are the two controls that ABANDON a
  half-entered reading.

## 29. "Make it" was the same button name twice `[FYI]`

Both export buttons read **"Make it"**. Two controls with the same accessible name on one screen is
an accessibility defect outright — a screen reader announces "Make it, Make it" with nothing to
distinguish them — and "make" never said what would be made.

They are now **"Download backup"** and **"Download report"**. The integration test for the exports
had been selecting them out of an array **by position** (`const [, save] = …`), which is the same
ambiguity showing up in the test suite; it names them directly now.

## 30. The soft-band prompt was styled as a hard error `[FYI]`

**Momin's screenshot showed his prescribed target of 150 flagged in red: "That is outside the usual
range. Is it right?"** It looked like a mistake. It is not.

§4.5 puts the target's plausibility band at 90–140 and his prescription is 150, deliberately — the
app is meant to raise a **one-time acknowledgement of an unusual-but-intended value**. §10.5 says so
in as many words: *"the first confirmation a user ever sees must not be a false alarm."*

`checkDraft` already modelled this correctly, marking soft misses `confirmable: true`. **The render
threw that distinction away**, emitting `class: 'error'` for both. So the model was right, the copy
was right, and the stylesheet contradicted both.

Soft misses now render as `.caution`. **The band was NOT widened** — §13.3 already ruled that
widening it to silence the prompt is the wrong direction, and note 31's prefill now depends on this
prompt firing: it is the mechanism that makes a stale prescription noticeable.

## 31. The prescription is prefilled now, and §1.2 had to be answered rather than overridden `[FYI]`

**Momin's instruction: "for my brother he don't need to do anything."** §1.2 had refused prefilled
values across three revisions, so this needed answering rather than simply doing.

**The objection was specific, not a general preference for strictness.** §1.2 traced it: if the
prescriber moves ICR from 10 to 15 and a device that lost its record refills 10, a 150 g meal doses
15 units instead of 10 — about **150 mg/dL of unintended drop**, taking a post-meal 180 to roughly
30 — and *"nothing on screen would look different."*

**The load-bearing word is SILENT.** Prefilled-and-shown is not silent, and three things keep it
that way:

1. **Nothing is stored until the explicit save.** `buildSnapshot` reads the STORE, never the draft,
   and returns null until then — so §4.4's refuse-on-empty-settings branch stays reachable. That was
   v1's unanswerable objection ("if defaults pre-populate, that refuse-branch is dead code") and it
   is answered by where the values live, not by argument.
2. **The basal block stays empty**, so the save is blocked and the sequence cannot be skipped.
3. **The target's own soft band does the noticing** — 150 sits outside 90–140 on purpose, so §10.5's
   acknowledgement fires on the value most likely to have changed. Note 30 exists because that
   prompt was being rendered as a red error, which would have undermined exactly this.

**The residual risk is real and is recorded in `docs/CLINICAL.md` rather than argued away:** someone
who taps through without reading gets the old prescription.

**Two tests were made obsolete by this and were replaced, not left to rot** — *"then demands
settings, because §1.2 ships no defaults"* and *"and refuses to save until every value is entered"*.
The first now asserts the prefill is present AND that the soft-band note is styled `caution` rather
than `error`; the second asserts nothing is stored until the save. `setUpAsHisBrother` no longer
types the three ratios — it **asserts** them, because a helper that silently accepted whatever was
in the fields would let a wrong default flow into every downstream test as if it were the
prescription.

## 32. The red wash survived the back navigation, and said "do not inject" about a meal `[FYI]`

**Momin's screenshot, 7 Sep 2026:** back out of a low-blood-sugar block and the CARBOHYDRATE screen
is still washed red.

**The mood was keyed on `state.outcome`, and §18.14 keeps the outcome across a back navigation on
purpose** — *"going back never discards a committed input."* So the block's outcome was still there,
and the page went on painting a refusal over a screen that was asking about a meal. Note 26 had
narrowed the wash to blocks so the colour would mean *there is no dose here*; keyed this way it
meant that on a screen where it was false, which is worse than meaning nothing.

**Now keyed on the STEP** — `blocked` or `record_reading` — because the mood has to describe the
screen on display, and the step is what names that.

**Verified by removing the fix and watching the test go red**, per note 25's rule.

## 33. The interface batch, and one thing that changed a message's truth `[FYI]`

Momin's review of the built app, all applied on 7 Sep 2026:

| | |
|---|---|
| Back carried no affordance | `←` + hair space, prepended to the WORD. One character in a face already loaded — no icon font, no SVG, scales with the type, inherits colour. The word stays: an arrow alone is a guess about what the reader knows |
| No press feedback | `:active` scale on keys and actions. There is no hover on a phone, and without it a tap gives no confirmation — which on a keypad means re-tapping and **entering a digit twice** |
| Buttons shorter than the mockup | `--touch-key: 3.5rem` (56px) for keys and primary actions. §10.7's 48px floor is untouched and remains the floor |
| The dose was left-aligned | Centred, and `docs/design/step-flow.html` centred with it. The mockup left-aligns it, so this is a CHANGE and not a fidelity fix — both entry screens centre their number, and the eye should not jump left at the screen that matters most |
| The result number was 88px | 96px, and the sweep is now the mockup's 175deg to `#5EE6C5` rather than an approximation |

**`tap()` in the integration tests now strips decorative glyphs** before matching. A test that had to
spell the arrow would be asserting a typographic choice; the words are what a person reads and what a
screen reader announces.

**And one thing that was not cosmetic.** The empty-field message read **"This is needed. There is no
default."** — which stopped being true the moment §1.2's ruling prefilled three of the fields. It now
reads *"This is needed before a dose can be worked out."* A message that asserts something false
about the app is worse than a shorter one that does not, and this is the kind of rot that survives
because nobody re-reads copy after a behaviour change.

## 34. The prefill did not announce itself, and the blocked save read as a bug `[FYI]`

**Momin's own first reaction to the prefill was the failure mode:** the three values looked settled,
so *"I was thinking it default then why button is not showing up"*. The save was correctly blocked —
the basal block (§1.3) is his and stays empty — but nothing on screen said so.

**A prefill that does not announce itself is the silent default §1.2 refused.** The first-run screen
now opens with a flag: *"Check these three before you start"*, naming target, ISF and ICR, and saying
what remains to be filled in.

**It carries safety weight, not just clarity.** `docs/CLINICAL.md` records the residual risk of
prefilling — that someone taps through without reading. A line asking him to check the three, next to
§10.5's acknowledgement on the target (the value most likely to have moved), is what makes tapping
through a **choice** rather than an accident. Momin identified this himself: making the prefill
visible is what closes the gap the clinical note had to leave open.

## 35. All navigation moved to the foot, and the shell took it over from fourteen screens `[FYI]`

**Momin's ruling, and the correction to my first attempt:** *"I gave you settings and history for
reference but now I am noticing everything is above."* Only those two had moved; every `Back` was
still at the top of the screen.

**Fourteen screens each drew their own top bar.** They are gone, replaced by ONE `footNav()` in the
shell. That is not tidying — fourteen copies of a pattern is fourteen places for it to drift, and a
new screen could simply forget.

**`backAction()` is the single source of truth for whether back is possible**, and both the on-screen
control and the Android gesture read it. They cannot disagree, and a test asserts that they land on
the same screen.

**Four `onBack` uses were NOT chrome and stayed.** "Change" beside a withheld dose, "Go back and test
first" beside a blank reading, "Start again" on a bound failure, "Keep the smaller dose" on the
§7.4.1 override. Each is a NAMED ANSWER to the question its screen asks, and collapsing them into a
generic Back would delete the wording that makes them answers. I removed the prop first and the
linter caught it.

**The back arrow is gone.** `←` was added and Momin's verdict on the phone was that it looked
misaligned. U+2190's vertical centring is a property of the face, not something CSS corrects
reliably, and a nudge tuned on a Mac is a guess about Android. The word alone, at the foot of the
screen, which is the affordance the arrow was standing in for.

## 36. The Android back gesture closed the app `[FYI]`

**Momin: "why the android back button do not do back on my app?"** In an installed PWA the system
back button and the edge swipe leave the app, and people use that gesture reflexively — so it
discarded a half-entered reading.

**One sentinel history entry, held exactly while the app has somewhere to go back to.** Pushed when
back-ability turns on; the gesture consumes it and runs `backAction()`; and when back-ability turns
off it is spent with a SUPPRESSED `history.back()` so the stack cannot accumulate dead entries that
would swallow a later gesture and make the button feel broken.

**§11.5's "Routing: None" is not violated.** `pushState` is called with the current URL. Nothing is
written to the URL, there are no deep links and `start_url` is untouched — what §11.5 rules out is
URL STATE, and this is a stack entry with no state in it.

**§10.6 and §11.3 stay inescapable**: the first run and the fail-closed screen return `null` from
`backAction`, so neither the control nor the gesture offers a way out of them.

It sits on the `Host` for the same reason `now` does — a module that reaches for `window.history` on
its own cannot be steered by the jsdom harness, and the contract is tested there.

## 37. The keypad, the press feedback, and the placeholder that looked broken `[FYI]`

| | |
|---|---|
| Keys were 56px and flat | **68px** (`--touch-pad`), larger type, and their own surface tokens so the keypad can be more pronounced than a plain card without dragging every other panel with it |
| Press feedback was invisible | `scale(0.94)` **plus** a surface and border change. 0.97 alone could not be seen under the thumb that was covering the key — which is the only moment it needs to be seen. Without feedback a tap invites re-tapping, and on a keypad that enters a digit twice: a **wrong number** |
| The version line took a band of the screen | 9px at 55% opacity. §10.8 requires it to be VISIBLE — "the only way to diagnose a report" — and requires nothing about prominence |
| The empty placeholder looked like a broken element | An em-dash at 4.5rem is a solid grey BAR. Held at 2rem so it reads as punctuation, with the box keeping full height so the keypad does not jump when the first digit lands |

**And one glyph per settings field**, naming the subject — blood for target and ISF, food for ICR.
§10.1 item 5 requires grouping by subject "never colour alone", and a glyph is not colour: it
survives greyscale and colour-blindness. `aria-hidden`, because the heading and label already say
which group it is and "droplet" adds nothing to a screen reader.

## 38. A dead end: an out-of-range reading made "Work out the dose" do nothing `[FYI]`

**Momin typed 7090, tapped Next, typed 7, tapped "Work out the dose", and nothing happened.** No
crash, no message, clean console, no way forward. Reproduced exactly.

**The core was right.** 7090 is above the hard range, so `resolve` returns `invalid_input` with
reason `above_range`, and a golden case pins it: *"§4.5 — 605 gets 'check the number', NOT band E's
ketone wording."*

**Two interface failures stacked.**

1. `stepFor` mapped `invalid_input` to **`carbs`** unconditionally. The error was on the READING,
   which lives on the previous screen — so it navigated to a screen that could not show it.
2. `calculator.ts` had **no field-error rendering at all**. `grep` for `invalid_input` in it returned
   nothing.

**Note 2 of this very file says "The interface attaches the HI guidance to that reason." It never
did.** The core rule landed and its display slot did not — which is precisely the §17 standing rule
this project wrote after being burned four times: *no feature lands without its precedence step, its
snapshot field, and its test-schema representation in the same change.* A note asserting that
something is wired is not a wire.

**`stepFor` now routes to the field that is wrong**, and each entry screen renders its own field's
error with `aria-live` — the message arrives in response to a tap with no screen change, which is
the case a live region exists for.

**MAX_ENTRY_DIGITS was NOT the bug, and was not changed.** Momin asked whether the keypad should
enforce the range. It already enforces a limit — four digits — and `config.ts` explains why that is
deliberately one digit looser than the range: *"the lexical grammar allows at most one integer digit
beyond the field's maximum, so '6000' is rejected on length before it is rejected on range."* The
slack exists so an out-of-range value is EXPLAINED rather than silently refused, because a keypad
key that stops responding reads as broken. The design was right; the explanation was missing.

## 39. Testing the experience, which is the question this bug actually raised `[FYI]`

**Momin asked how experience can be tested end to end.** The honest answer has layers, and two of
them are not automatable.

**1. Dead-end sweeps — new, cheap, and catch this whole class.** The missing test was never another
assertion about arithmetic; it was the question *"did that tap DO anything?"*, which nothing had ever
asked. `test/integration.test.ts` now walks the everyday path and, after every tap, fails if the
screen neither changed nor gained an explanation. **That would have caught 7090 without anyone
thinking of 7090.**

**2. Interaction-continuity assertions — added in note 25.** Focus, caret and scroll are observable
in jsdom once the platform calls go through the `Host`. `typeInto` types one character at a time into
`document.activeElement`, so the whole suite fails if the app becomes unusable by hand.

**3. Real-browser checks.** jsdom does not lay out, load fonts or enforce CSP. The headless-Chrome
harness over CDP is what caught the CSP violation, the font loading, `focus({ preventScroll })`, and
the 982→27 scroll measurement. **jsdom cannot see any of those.**

**4. Looking at screenshots — NOT automatable, and it found a real defect.** Band E was wired to wash
the page amber and it was immediately, obviously wrong: a correct result looked like a failure. No
assertion would have flagged that, because every value on the screen was right.

**5. The actual user, §18.9.** The focus bug, the misaligned arrow, the button sizes, the prefill
confusion, the persistent red wash and this dead end were ALL found by Momin on a real phone, at a
point where 548 tests and a 100% mutation score were green. **This is the layer that keeps working
when the others agree with each other.**

**What this means for the numbers, stated plainly:** 556 tests and 100% mutation on `src/core` say
the arithmetic is defended. They say almost nothing about whether the app can be USED. §13 still has
no requirement covering layers 3-5, and pretending otherwise is how the next one of these ships.

## 40. The name, and what it is really for `[FYI]`

**Momin's idea: ask for a name, greet him, and use it in the report.** Taken, with the greeting as
the least important part.

**The report was the strongest argument.** Both exports used FIXED filenames, so three months of
exports produced three files nobody could tell apart, and re-downloading gave
"insulin-record (2).html". Files are now `mealunits-<name>-YYYY-MM-DD.html` and the heading reads
"Ahmed's insulin record" — for a document whose whole purpose is being handed to a doctor.

**The greeting is on the READING screen and no other.** §10.5 runs a strict budget on what shares
space with a dose, and a greeting beside "11 units" is noise at the one moment noise is dangerous. A
test asserts it is absent from the result screen.

**Optional, and empty is a first-class answer** — §4.1's rule about not collapsing states applies to
text as much as to numbers. Forcing a name would add a setup step to an app whose argument for
existing is that it must beat injecting a fixed 24-25 units (§1.4).

**Three safety details, none of them incidental:**

- **The filename is reduced to ASCII letters, digits and single hyphens.** A name is free text, and
  a filename is the wrong place to discover it contained a slash. Tested with `a/b ../c`.
- **The readable export escapes it**, like every other value — §7.7.1's escaping rule exists because
  that file is assembled as HTML, and this is the one field a person types freely.
- **The importer validates it as a string and bounds it** to `MAX_NAME_LENGTH`, so an untrusted file
  cannot carry an unbounded string into the interface. It enters no calculation.

**It is PII in a plaintext file, and that is recorded in `docs/CLINICAL.md`** rather than added
silently: the export may be emailed, and §7.7 is explicit that storage is plaintext.

**The typechecker found all eleven construction sites** when `Settings` gained the field — six test
fixtures, the schema rows, the commit, the envelope, the importer and the recovery block. The load
path uses `?? ''` for rows written before the field existed, which is **the same empty state the
field already models**, not a fallback inventing data.

## 41. Two layout defects I had guessed at twice, and finally measured `[FYI]`

**Momin reported the +/- buttons broken three times, and my first two fixes were guesses.** The
third attempt measured them in a real browser at two viewport widths, and the numbers named both
defects immediately:

| | Measured before | Measured after |
|---|---|---|
| `−` / `+` keys | **28px wide** × 68px tall, at opposite edges | **68 × 68**, circular, centred, 40px apart |
| `.foot-nav` at a 1440px window | **1440px wide**, against a 480px `.screen` | **480px, x=480** — identical to `.screen` |

**Why the keys were 28px.** They sat in a flex row with a `flex: 1` spacer between them, and `.key`
declares no width — so each shrank to the width of its glyph while `min-height` held it at 68px.
Two thin pills, far apart. **28px is also below §10.7's 48px minimum**, so it was an accessibility
failure and not merely an ugly one, which is exactly what guessing at a layout hides. Rebuilt as a
centred group of two fixed squares: no spacer, no edge pinning, identical at every width — there is
nothing about a wide window that should move these apart.

**Why the nav escaped the app.** It is a child of `#app`, not of `.screen`, and only `.screen`
carried the measure — so on a desktop window Settings and History sat in opposite corners of the
display with the app in the middle. This is what Momin meant by "buttons are going beyond the frame
of the app", and I had read it as a remark about a border. **The measure is now a token,
`--column`,** shared by `.screen`, `.foot-nav` and `.foot`, so a fourth element cannot drift out of
the column the way this one did.

**The lesson, stated because it cost three rounds:** a layout defect described in words is a
hypothesis. `getBoundingClientRect` in the browser it actually breaks in is the evidence. Both
causes were obvious the moment there were numbers.

## 42. The keypad was narrower than the specification, and the rule was already in the core `[FYI]`

**Momin asked why the entry cap is four digits when both fields max out at three.** Answering it
properly turned up a real defect.

**The answer to the question:** §4.2's grammar admits **one digit more** than the range does —
`GRAMMAR_INTEGER_DIGIT_SLACK`. 600 needs three digits, so four are accepted, and a typed `6000` is
answered with "that is more digits than this can be" rather than by a key that silently stops
responding. **A key that does nothing reads as broken hardware**, which is worse than a message.

**The defect.** `MAX_ENTRY_DIGITS = 4` was a single flat cap applied to BOTH fields, and it counted
the integer and fractional parts together:

```
100.25  ->  BLOCKED at '100.2'
250.25  ->  BLOCKED at '250.2'
```

§4.2's grammar accepts two decimal places and `RANGE.carbs` accepts 300, so **the interface was
narrower than the specification** — in a way no arithmetic test could see, because the core was
never asked.

**And the rule was already there.** `core/parse.ts` had `maxIntegerDigits(field)`, deriving exactly
this from each field's own maximum — **private**, so the interface could not ask the question and
carried its own number instead. My first fix wrote a second copy of it; the typechecker reported a
duplicate implementation and that is how the original was found. It is exported now, with
`acceptsKeystroke` beside it, both pure and therefore inside the mutation gate.

**`MAX_ENTRY_DIGITS` is deleted**, not left as a dead constant. §11.8 puts every number in
`config.ts`; it says nothing about keeping numbers that no longer mean anything, and a limit written
as a literal drifts from the range it is meant to mirror while nothing notices.

**The property test is the one worth keeping:** everything the keypad admits must either parse or be
reported. Nothing typeable may fall through both.

## 43. The greeting waves, three times, and then stops `[FYI]`

Centred, per Momin, and the hand animates as it does on his own site — `transform-origin` at the
wrist, which is what makes it read as a wave rather than a spin.

**Three repeats, then it stops**, and none at all under `prefers-reduced-motion`. A greeting that
waves forever is something moving on screen while a person reads a dose decision, and §10.9's
motion rules are not a formality on this screen.

## 44. The app reloaded itself on a first visit, and that is what "stuck on mobile" was `[FYI]`

**Momin: tap "Log this injection" with a 2-unit dose and nothing happens — no history, and the app
appears stuck on the phone.** Reproduced once, then it worked on the retry. A flaky report is
usually a race, and this one was.

**`src/main.ts` reloaded the page on `controllerchange`, unguarded.** That event fires in two
situations, and only one of them wants a reload:

1. a NEW worker replaces an existing one — §11.4's case, where HTML, assets and worker must be made
   coherent, and
2. the FIRST worker claims a page that had no controller at all.

Case 2 is every first visit. **Measured: a cold browser profile recorded TWO document loads, a warm
one recorded one.**

**What that looked like in use.** The reload lands at an arbitrary moment. If it landed on the tap,
the screen went blank and the tap appeared ignored — and **the row had actually been written**; the
reload just discarded the screen that would have said so. The console was clean because nothing had
gone wrong. On a phone, arriving mid-flow, it reads as the app being stuck.

**Guarded on `hadController`, read BEFORE registering.** On a first visit there is nothing incoherent
to fix: the page already loaded the assets it was served. §11.4 wants coherence *after an update*,
which is exactly what the guard distinguishes. Cold profile now records one load.

**Same cause behind the other report.** Momin said the foot navigation was still full-width on
desktop after I had measured it fixed. It was a **stale worker serving the previous bundle** — he
confirmed it himself after a hard refresh. Worth stating because it will happen again: while
iterating, the service worker is a cache between the build and the phone, and "still broken" can
mean "not yet delivered".

## 45. `tools/smoke.mjs` — the layer that can see any of this `[FYI]`

None of notes 41, 42 or 44 was visible to 559 unit tests or to the 100% mutation gate. jsdom does not
lay pages out, load fonts, enforce a content security policy, or run a service worker. Every one was
found by Momin on a real device.

`npm run smoke` drives a served build over the DevTools Protocol and asserts **twelve** things that
only exist in a real browser:

- a first visit loads the document **once** (note 44)
- the worker takes control, and a webfont is actually in use
- at 412px **and** 1440px: the nav and the version line sit inside `.screen`'s box, measured with
  `getBoundingClientRect` and compared to it (note 41)
- the `+`/`−` keys are 68x68 at both widths — **above §10.7's 48px floor**, which is what the 28px
  regression violated
- 120 mg/dL with 25 g gives 2 units, logging it says so, and the screen is not blank (note 44)

**It is not a replacement for looking.** It cannot tell that a correct result looks like a failure —
note 26's amber wash needed eyes. It closes the gap between "the arithmetic is right" and "the app
works on the device", which is where the last several defects lived.

## 46. Two finishes, and the keypad stopped being opaque `[FYI]`

**A sheen on the number being typed, distinct from the dose's.** The result's is white to mint at
175deg — the app's answer. The entry screens now use white to grey at 185deg: the same idea, quieter,
because **an input should not wear the same finish as the conclusion**. `color` is set first as the
fallback on both, and the empty placeholder is exempt — a gradient on a dash means nothing.

**The keypad keys were opaque hexes approximating the mockup's translucent values.** They are now the
mockup's values literally — `rgb(234 240 250 / 7%)` on a 9% border — and the translucency is the
point: the keys sit ON the wash rather than covering it, so the gradient shows through and they read
as glass rather than as flat panels. That is most of why the keypad had looked heavier than the
design.

## 47. The real cause: the app navigated away from itself while logging a dose `[FYI]`

**This is the defect Momin actually hit, and note 44's reload guard was a different bug found on the
way to it.** Symptom: tap "Log this injection", the screen goes blank, no history row visible, and
on the phone the app appears stuck. **About one run in three**, which is why it read as flaky.

**It was my own code, from the hardware-back work in note 36.** That design held one sentinel history
entry while the app had somewhere to go back to, and tidied the entry when back-ability turned off:

```
if (!can && sentinel) { suppress = true; history.back(); }
```

**Traced with `Page.frameNavigated`.** Tapping the commit reaches the `logged` step, which has no
back path (§18.14's switch returns `state` for it), so `setCanGoBack(false)` ran that branch — and
with the accounting off by one, `history.back()` walked **past the app to `about:blank`**. The row
was written. The app was simply gone.

**The tell was `loads=undefined`.** `sessionStorage.getItem` returning undefined rather than a count
meant the execution context had been destroyed — a navigation, not an exception. Nothing was logged
to the console because nothing had gone wrong; the page had left.

**The fix is to delete the branch.** `setCanGoBack` is push-only now, and there is deliberately no
`!can` case. The cost: one back press after reaching a no-back screen is absorbed doing nothing, and
the next leaves the app. **A press that does nothing is a wart; a press that closes the app while
recording an injection is a defect.**

**The principle, which is §11.3's again in a third layer:** never navigate on your own bookkeeping.
The sentinel count was a convention maintained by hand, and the one path that got it wrong did not
fail loudly — it took the whole app off the screen.

**Two process notes worth more than the fix.**

- **Six clean runs, not one.** A defect that appears one time in three cannot be verified fixed by a
  single passing run, and my first "it works on the retry" was exactly that mistake.
- **The smoke suite was ALSO flaky, and I nearly blamed the harness.** It slept for fixed intervals
  instead of waiting for the app, so a slow session looked identical to this defect. It polls for
  readiness now — because **a flaky check teaches you to ignore the failure that matters**, and this
  one was real.

## 48. `crypto.randomUUID` is secure-context only, and that is why logging failed on the phone `[FYI]`

**Momin reported "Log this injection does nothing" three times.** Twice I fixed something else that
looked like it (notes 44 and 47) and twice it kept happening. The third report carried the detail
that mattered: *"everything is happening on mobile app just the issue is the main injection never
logs"* — everything else worked.

**`src/ui/app.ts` generated the log row's id with `crypto.randomUUID()`.** That method exists **only
in a secure context**. `localhost` is one. `http://192.168.1.40` is not:

```
TypeError: crypto.randomUUID is not a function
```

The commit promise rejected before writing, nothing rendered, and the console on his phone showed
nothing because from the app's point of view a promise had simply failed.

**Why every layer of testing missed it, which is the part worth keeping.** Unit tests, integration
tests, the 100% mutation gate and `tools/smoke.mjs` all ran against **`localhost`** — a secure
context. **The one origin never exercised was the one the user was on.** No amount of coverage on
the wrong origin finds this.

**Fixed by removing the dependency, not by branching on it.** `core/ids.ts` builds the same v4 shape
from `crypto.getRandomValues`, which has no secure-context requirement. Momin asked whether to
feature-detect instead — use `randomUUID` where available and the fallback elsewhere. **Rejected,
and this defect is the argument:** a branch means localhost takes one path and the phone takes the
other, so the code the user runs is the path nothing exercises. That is how this shipped. One path
means the tested path IS the shipped path, and there is nothing to gain — `randomUUID` is a
convenience wrapper over the same CSPRNG.

**`tools/smoke.mjs` now drives the everyday path over BOTH origins** and asserts on the insecure one
that `window.isSecureContext` is false, that `crypto.randomUUID` is genuinely absent, and that the
dose still logs. Testing only the secure origin is testing the one the user is not on.

**Two mutants in `core/ids.ts` are disabled by name.** `bytes[6] ?? 0` is unreachable — the array is
created three lines above with sixteen elements — and the guard exists only because
`noUncheckedIndexedAccess` types the read as possibly undefined. Mutating `??` to `&&` still yields
a well-formed v4 UUID, so no assertion about shape can see it. The tally in note 16 is eighteen.

## 49. `sameView` was always true, and a comment explained why that was fine `[FYI]`

**Momin: tapping "How this works" from part-way down settings opens the page mid-scroll, so you have
to scroll UP to reach the start. He suspected it applied to every screen reached from settings, and
it did.**

**The cause is a comparison that could not fail.** `render` read `${state.screen}/${state.step}`
before `replaceChildren` and again after, and compared them — with a comment claiming the second
read "has already moved on". It cannot: `dispatch` updates the state and THEN calls render, so both
reads see the same already-updated value. **`sameView` was always true**, so scroll was restored
across every navigation.

The comparison has to span renders, so the previous key has to outlive one. It is held in the
shell's closure now.

**And a test had agreed with the bug.** *"holds the scroll position on a same-view render, and
releases it on navigation"* asserted `toBe(600)` after a navigation — while the comment directly
above it said holding the scroll would be wrong. The assertion was written to match what the code
did. **A test can agree with a defect, and a comment can explain why a broken comparison is
correct**; neither is evidence.

## 50. Three smaller ones from the same review `[FYI]`

| | |
|---|---|
| The app icon looked smaller than its neighbours | The `any`-purpose icon scaled the mark to **0.86**, so it spanned ~70 of the 100 canvas — about 30% empty. Now 1.0, spanning 82, which is the largest this geometry allows without clipping. The **maskable** icon stays at 0.62: that is the 80% safe circle and is a constraint, not a preference |
| The headline wrapped wherever it fitted | An explicit `<br>`: "What's your blood sugar / right now?". Not left to `text-wrap: balance`, which rebalances with the viewport and would split "blood / sugar" on a narrower phone. **The trailing space before the `<br>` is load-bearing** — `textContent` concatenates across a break with no whitespace, so without it the question reads "blood sugarright now?" to a screen reader |
| No hover on desktop | Added, gated on `@media (hover: hover) and (pointer: fine)`. The gate is the point: without it a touch device applies hover on tap **and leaves it applied**, so the last thing touched stays lit as though a finger were still on it |

**`UPDATE_CHECK_INTERVAL_MS` had no assertion**, which the mutation gate reported as two survivors —
`15 * 60 / 1000` and `15 / 60` both passed every test. It is bounded at both ends now, and the reason
is written down: too short is a network request on every foreground, too long defeats §11.4's prompt.

## 51. A third dead end, and the leading zero `[FYI]`

**Momin: tap "Next" with nothing entered, then "Work out the dose", and the app sits there.**

**Same class as notes 38 and 47, reached a third way.** §4.3 step 5 is emphatic — *"blank and blank
is no result, NOT '0 units'"* — and the core returns exactly that. **The interface rendered nothing
for it.** The outcome existed; the words did not. The dead-end sweep added in note 39 walks the
everyday path with values in the fields, so it could not see this one.

Two messages, because the two `no_result` branches mean different things: nothing entered is a
prompt, while a reading at or below target with no carbohydrate is a real answer — there is nothing
to dose for, which is not the same as zero units.

**And the leading zero.** Typing `0` then `8` gave `08`, and `0008` was reachable. Momin asked why it
was not just `8`.

- **The dose was never wrong.** §4.2's grammar accepts leading zeros and `Number('0008')` is 8.
- **The display was.** A screen whose whole job is showing one figure clearly was showing `0008`.
- **And it spent the digit budget.** Four digits is the maximum for a reading, so a leading zero could
  make a legitimate `600` unreachable — that is a functional consequence, not a cosmetic one.

`applyKeystroke` replaces a lone `0` rather than appending to it, refuses a second `0` so `00` cannot
exist, and KEEPS the zero before a decimal point because `0.5` needs it. Pure, in `core/parse.ts`,
so the mutation gate covers it.

## 52. Vibration instead of a sound, and where feature detection earns its keep `[FYI]`

**Momin asked about a sound; the answer is a buzz.** Same intent, and it works with the phone on
silent, needs no user gesture to be permitted, and cannot be missed in a noisy room. A sound would be
a confirmation that SOMETIMES does not happen, which is worse than none.

**Constraints on it, all of which are the point:**

- **After the write resolves, never before.** §7.2's commit is one transaction, and a buzz ahead of
  it would be a lie about a dosing record. Nothing on the failure path.
- **Never the only confirmation.** The screen says "Logged 2 units at 7:21 AM" regardless — a buzz is
  not readable, and this is a record of an injection.
- **Cannot break the commit.** Wrapped, because some browsers throw without a prior gesture.

**Feature-detected, and this is the contrast with note 48.** There, detecting `crypto.randomUUID`
would have meant localhost took one path and the phone took the other — hiding the defect on the
only origin that mattered. Here the fallback is *no buzz*, which is genuinely fine and changes
nothing about correctness. **Detection earns its keep when the fallback is acceptable and costs you
when it splits the tested path from the shipped one.**

## 53. The icon, twice `[FYI]`

0.86 → 1.0 → **1.17**, and Momin was right both times that it was still too small.

The mark now spans **96 of the 100 canvas**, a 2% margin. That is safe **because the mark is a
centred circle**: a rounded-corner mask — iOS's ~22% radius, Android's squircle — removes area at the
CORNERS, and a circle's extremes sit at the middle of each edge, where no corner rounding reaches. A
square mark could not be pushed this far, and the reasoning is written at the line so nobody
"tidies" it later.

**The maskable icon stays at 0.62.** That is the 80%-diameter safe circle from §12 and it is a
constraint, not a preference.

## 54. I called a launch blocker on a mechanism I had not finished understanding `[FYI]`

**Recorded because it is the same failure as §20.1.1, aimed at the platform instead of the
document, and because Momin caught it after I had stated it three times.**

I claimed the in-app update prompt not rendering meant *"a device that has cached a build stays on
it, permanently"*, that a bad build could never be replaced remotely, and that this **blocked
launch**. Momin rejected it — *"the issue you are mentioning is totally wrong here"* — and told me to
confirm it from the code.

**He was right.** The test I had never run:

| | Bundle served |
|---|---|
| Install build A | `index-BjuqWl9V.js` |
| Ship build B, revisit with the app still open | `index-BjuqWl9V.js`, new worker `waiting: "installed"` |
| **Close the app, reopen** | **`index-v3G2ALM4.js`** |

**That is the specified service-worker lifecycle behaving correctly.** A waiting worker activates as
soon as every client using the old one is gone. I saw "old bundle served while a new worker waits",
recognised it as the symptom of my problem, and stopped — without checking whether it was the
mechanism working.

**What is actually missing is smaller:** the offer does not render, so an update is taken by closing
and reopening rather than by tapping. Convenience, not a trap.

**Why this one matters more than the fix.** An overstated defect is not a harmless error — it was
recorded in `BACKLOG.md` as blocking launch, in `CLAUDE.md` as a known blocker, and in a code comment
in `main.ts`. Had it gone unchallenged it would have delayed the app reaching the person it exists
for, on the strength of a misreading. **The two habits that produced it:** stopping at the first
observation that matched my hypothesis, and describing a partially-understood mechanism in absolute
terms ("permanently", "never"). All three records are corrected.

## 55. The installed icon was small because Android uses the MASKABLE one `[FYI]`

**Momin, after installing it on his phone: the icon looks small.** He was right, and note 53's fix
never reached it — Android's home screen uses the **maskable** icon, and only the `any` icon had been
enlarged.

**0.62 was not a constraint, it was timidity.** The maskable safe zone is a centred circle of 80% of
the canvas diameter. The ring's outer edge sits 41 from centre at scale 1, so the safe radius of 40
permits up to **40/41 = 0.9756**. At 0.62 the mark spanned **50.8 of 100** — it could be half again
as large and never clip. Now **0.94**: spans 77.1, outer radius 38.5, inside 40 with room for
rasterisation rounding.

**The earlier comment reasoned from the wrong shape.** It worried about "the squircle", but every
launcher mask is LARGER than the safe circle — fitting the circle is sufficient for all of them, so
the squircle was never the binding limit. A number defended by a plausible-sounding comment went
unexamined for six revisions.

## 56. `.sheet` inside a card, and buttons pushed off the edge `[FYI]`

Two layout defects Momin found on the export screen, both mine, both from reusing a component
outside the context it was built for.

**1. A 192px block of actions.** The dosing-note card used `.sheet` — the SCREEN's bottom bar, which
carries `margin-top: auto` and gives every control its own full-width grid row. Inside a card that
stacked one button and two text links vertically. Measured child by child: 56 + 48 + 48 plus gaps
and padding = **192px**, which reads as gaps rather than as controls.

`.card-actions` instead, with the two secondary actions sharing a row: **120px**. Each keeps §10.7's
48px touch target — *only the stacking changed*, and the 48px is why they looked so far apart in the
first place: a 13px label centred in a 48px box, twice.

**2. The download buttons overflowed their cards** — and this was a consequence of note 29. `.li` is
a flex row with `space-between`, sized when both buttons read **"Make it"**. Renaming them to
"Download backup" and "Download report" left the pill unable to fit beside three lines of
description, so it wrapped its own label and pushed past the card's edge.

**Caught by looking at a screenshot taken for something else** — I was checking the card spacing and
the overflow was simply visible in the frame. No assertion would have flagged it.

Fixed with a `.li.act` modifier rather than by changing `.li`: only the two export rows carry an
action, every other `.li` pairs a label with a number. They stack, giving a full-width tap target
like every other primary action in the app.

**Verified at 360px**, a small Android: no sideways scroll, worst overflow past `.screen` is **0px**,
and both buttons fit. `tools/smoke.mjs` already asserts the page never scrolls sideways, which is the
general form of this.
