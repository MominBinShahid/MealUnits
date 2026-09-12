# Build notes — decisions the plan did not state, and things to confirm

**Purpose:** `PLAN.md` is the specification. Building it surfaced questions the specification does
not answer, plus a few places where two of its own sentences point in different directions. Every
one is recorded here rather than settled silently in the code, because §20.5's rule is that anything
decided and not written down does not exist.

**PRUNED 2026-09-13, on Momin's instruction.** This file held 2,035 lines, most of it the full
write-up of bugs fixed in week one and now guarded by tests. Those write-ups are gone. What is kept:
every **ruling**, every **constraint still in force**, and a one-line stub for everything else —
because **many of these notes are cited from source files and tests**, and a dangling "note N" in a
comment is the rot this project keeps fighting. **Every number below keeps a heading for that
reason**, and `check-plan.py` fails on a citation that resolves to nothing.

**Legend.** `[RULED date]` is Momin's decision and is binding. `[RULE]` is a constraint the code
does not carry on its own — breaking it breaks something. Untagged entries are finished work, kept
only so their number resolves; the code and its tests are the record.

**One notation rule, because breaking it produced a silent defect here.** Throughout this project the
section sigil means a section of `PLAN.md` and nothing else. Entries in THIS file are **"note N"**.
Three self-references were written with the sigil, at 15, 16 and 24 — two resolved silently against
PLAN.md's own sections of those numbers. **A convention that only fails visibly past a boundary is
not a convention**, which is why the rule is written here rather than remembered.

---

## 1. Rounding operates on the decimal representation, not on the value scaled by 100 `[RULED 2026-09-09: keep it]`

`src/core/decimal.ts`. Scaling by 100 contradicts §5.2's own table: `Math.round(-149.5)` is `-149`,
because `Math.round` breaks ties toward +∞ rather than away from zero, so −1.495 would round to
−1.49 where the plan says −1.50. Rounding the shortest decimal the number prints as agrees. The two
rules disagree on **572** values in (0, 100) with three decimal places; `test/decimal.test.ts`
computes that figure rather than asserting it.

**To reverse it:** §5.2's −1.495 row would have to change, and the golden cases at 1.005, ±1.125 and
±1.495 with it. Note 58 has the measurement; a third rule (scale, round the magnitude, reapply the
sign) is equally correct, and the shipped one stays because it is already verified.

## 2. An above-range reading gets "check the number", never band E `[RULED 2026-09-09: keep it]`

`src/core/resolve.ts`. §4.5 held two sentences that could not both be executed. The specific one
wins: `605` is a plausible typo for `60.5`, and "check ketones" is a confusing reply to a typo. An
above-range reading produces `invalid_input` with reason `above_range` and **asserts no band at
all**, with `COPY.meterHi` behind a disclosure.

**Why the reasons are `above_range` and `below_range` rather than one `out_of_range`:** so the
interface can tell the HI case from the LO case without re-reading the number. The losing sentence
is in `check-plan.py`'s `RETIRED` table — a contradiction left standing is a trap, because a later
reader finds it, sees the code disagree, and "fixes" the code.

## 3. `lastDose` is named for the figure it holds

`src/core/types.ts`. The field is `injectedHundredths`, not `units`: round 9 found that a test author
pinning the calculated figure would have pinned the wrong gate input. The golden fixtures write
`{ units, atHoursAgo }` and the harness converts — that is the harness's own deviation from §13.2,
recorded because it was written down nowhere.

## 4. Two snapshot fields the plan implies but §11.2's list did not name `[RULED 2026-09-09: keep them]`

`blankReadingAcknowledged` (§4.6) and `largeDoseConfirmed` (§6.2/§6.3) are in the `Snapshot`. Neither
is persisted; both die with it. Holding them as shell state instead would give §4.3's precedence two
sources of truth and would need explicit invalidation on every input change — a convention someone
can forget. In the snapshot, a changed input produces a new snapshot and a stale confirmation has
nowhere to survive. §11.2's list now names them.

## 5. §6.4's bound is checked twice, on purpose

`src/core/resolve.ts`. The second check is unreachable given §4.5's ranges — see note 16's table. It
stays because §6.2 gives `bound_failure` a refusal screen, and an edit that made it reachable must
land somewhere that can render one.

## 6. A blocked low carries every input error alongside it `[RULED 2026-09-09: keep it]`

`src/core/resolve.ts`, the `blocked_low` outcome. A valid in-range low such as 65 produces no
blood-sugar error at all, so the errors travelling with a block are about the OTHER fields — and
suppressing them would mean the user treats the low, comes back, and only then learns the
carbohydrate figure was junk.

## 7. "History was just imported" needed an operational definition `[RULED 2026-09-11]` `[RULE]`

`src/core/history.ts`. §7.5 makes provenance suspect when history was "just" imported, and "just" is
not a duration.

```
justImported = lastImportAtMs !== null
               && (lastLocalInjectionAtMs === null || lastLocalInjectionAtMs < lastImportAtMs)
```

**An import counts as recent until this install writes an injection row of its own** — not until a
clock expires. §7.8's *"not an input to anything"* is the governing reading: a READING never clears
suspect provenance, only a locally observed injection does. Note 62 enforces the same reading.

**The trust asymmetry, which is the part that must not be "simplified".** Imported rows are fully
load-bearing in `mostRecentUsableInjection` while the same import makes provenance suspect. That is
directionally safe: §7.4's gate only ever SUPPRESSES a positive correction, so trusting an imported
row can lower a dose and never raise one, while the suspicion costs a caveat line. **Trust for
suppression, suspicion for silence.**

## 8. §11.8 needed a second lint rule to be enforceable `[RULE]`

`eslint.config.js`. One rule bans numeric literals; the second bans laundering one through a local
`const`. Without both, §11.8 is a preference. See note 63 for the two holes probing found in them.

## 9. `config.ts` gained a section the plan did not list `[RULED 2026-09-11: keep it]`

"UNIT CONVERSION AND FORMATTING". §11.8's amendment records it, and `src/sw.ts`, alongside the rest.

## 10. The icon `[RULED 2026-09-11: keep IDF blue]`

`tools/icon.svg.mjs`, `public/icons/`, `public/manifest.webmanifest`. **IDF blue `#418FDE`**, ring
`r32.5` at stroke `17`, disc `r20.5`, H reversed out. The mark IS the diabetes symbol. A filled
aperture was rejected because it destroys the open ring; a disc past `r22` was rejected because the
gap falls under one device pixel at launcher size and renders as a filled centre regardless of the
artwork. Notes 50, 53 and 55 are merged here — 55 is the one that matters: **Android uses the
MASKABLE icon**, so the `any` icon's scale was never what was on the home screen.

## 11. The calendar functions take an explicit time zone `[RULED 2026-09-11: the device's]`

`src/core/calendar.ts`. Passed in as data, never read from the environment — that is what keeps
`src/core` importing nothing. §10.4 carries the ruling. See note 21.

## 12. Three floating-point values in a test were wrong because they were remembered

Fixed. Compute expected values, do not recall them.

## 13. `BLOG-FIX.md` §6's critique of the avatar CSS was wrong, and is withdrawn

Withdrawn; the section is gone from `BLOG-FIX.md`.

## 14. `Intl` renders September as "Sept" in en-GB, so month names are spelled out

`src/core/calendar.ts`. A four-letter abbreviation in a row of three-letter ones is a rendering
artefact, not a date format.

## 15. Vitest is pinned to 4.x because Stryker's runner does not work with 5.x `[RULE]`

`package.json`, `^4.1.11`. Under Vitest 5 the runner's `ctx.provide('activeMutant')` value never
arrives in the worker, so every mutant runs against unmutated code and survives. The first run
reported **2.57%** against 308 passing tests — not a testing gap, a tool reporting that nothing
happened. The tell was `Ran 1.28 tests per mutant` versus `9.05` on 4.1.11.

**Read the runs-per-mutant line before believing a score.** Taken at face value, "82% of the core is
unverified" would have sent someone writing tests for code the existing tests already covered.

**Unpin when** the runner's own devDependency moves past vitest 4. `BACKLOG.md` carries this as the
vitest half of the toolchain work.

## 16. The 100% mutation score is real, and 21 directives silence mutants by name `[RULED 2026-09-13]`

`npm run mutate`, `thresholds.break: 100`, over `src/core`, `src/state` and `src/config.ts`.

**The counts are deliberately not written here.** This note carried them twice and went stale twice —
once when §13.4 extended the gate to `src/state`, once when carbs phase 1 added `foods.ts`. The
authority is `reports/mutation/report.json`, which regenerates on every run and in CI; a
hand-copied figure beside it is just a second, worse copy. What does not rot is **why each mutant is
silenced rather than killed**, and that is the table.

**A score of 100% with directives is not the same claim as a score of 100% with none**, so:

| Where | Kind | Why it is disabled rather than killed |
|---|---|---|
| `resolve.ts` ×2 (bound failure) | Unreachable | §6.4: given §4.5's hard ranges, `total <= bound` is a **mathematical identity**. `boundUnits` and `exceedsBound` are tested directly, both directions |
| `resolve.ts` (blocking-band re-check) | Unreachable | Step 3 returns for every reading below 70, so step 7 cannot produce band C or D. Kept because §3.4 makes them terminal |
| `calendar.ts` (part read) | Unreachable | `Intl.DateTimeFormat` rejects an unknown zone at construction, and every zone it accepts emits all five parts |
| `parse.ts`, `resolve.ts` (finiteness re-checks) | Unreachable | §2.3 rule 1 requires finiteness before range checks **and again** after arithmetic. These are the again |
| `history.ts` ×2, `resolve.ts` (override candidate) | Coercion-equivalent | `null >= 250` is `0 >= 250`; the guard and the coercion agree on every input — and §4.1's whole subject is that they must not be allowed to |
| `resolve.ts` (carbs-blank null guard) | Coercion-equivalent | Blank-and-blank returned above, so the value is non-null here. Written out rather than inferred, because inferring breaks silently if that earlier return moves |
| `resolve.ts` (low-reading ternary arm) | Equivalent | Forcing the arm yields `undefined`, and `classifyLowBand(undefined)` answers null exactly as the `null` arm does |
| `history.ts`, `baseline.ts` (tombstone filters) | Coercion-equivalent | A tombstone carries no `bloodSugar` and no `carbs`; `undefined >= 250` and `undefined > 0` are both false. The type system needs the filters regardless |
| `divergence.ts` (zero branch) | Equivalent | With a calculated dose of zero the ratio clause reduces to `injected >= 0`, already true past the absolute floor. §7.1 declares the branch anyway |
| `calculate.ts` (`> 0` on suppression) | Equivalent | `>` and `>=` differ only at a correction of exactly zero, and suppressing zero is arithmetically identical to applying it |
| `decimal.ts` (`exponent < 0`) | Unreachable boundary | `(1e0).toString()` is `"1"`, never `"1e+0"`. Verified by scanning 200,000 magnitudes plus every extreme |
| `resolve.ts` (empty advisory array) | Equivalent by design | Seeding it with a bogus entry changes nothing, because `rankAdvisories` is a **whitelist**. That is the property §10.5 wants |
| `ids.ts` ×2 (version/variant `?? 0`) | Unreachable, shape-invisible | The array is created with sixteen elements three lines above. The mutants still yield a well-formed v4 UUID, so no shape assertion sees them; a distributional test could, and buys less than the comment at the line |
| `foods.ts` (`toLowerCase`) | Equivalent | Needle and haystack both pass through `fold`, so folding both to upper case matches exactly the same rows |
| `machine.ts` (`bound_failure` routing) | Unreachable | Same identity as the first row, one layer out. Listed first of three case labels because a comment between labels reads as a statement to `no-fallthrough` |

**What the exercise found, which is worth more than the number.** `resolve.ts` tested a condition
whose first half no input could decide (`dose >= threshold` **implies** `candidate >= threshold`,
since suppression only removes a positive correction and rounding is monotonic). `median` had a
length check and an undefined check that could never disagree. A `??` in `median` turned out to be
load-bearing — as `||` it would replace a legitimate median of **0**. `bands.ts` took a nullable
correction, where `null <= -1.5` coerces to `0 <= -1.5`, making null indistinguishable from zero.
And `computeExact` took a one-field options object, so `{}` read as `false` and the flag could never
be shown to matter.

## 17. The design loads Google Fonts; §11.5's policy forbids them — self-hosted

`src/ui/fonts.css`. The mockup links `fonts.googleapis.com`; the app does not.

## 18. §11.5's policy blocks inline `style` attributes, and that broke a real layout

Fixed in `src/ui/components.ts`, `src/main.ts`, `src/ui/dom.ts`. A content security policy is not a
header you add at the end.

## 19. Two things that looked like bugs in the browser run and were not

Both were the test harness, not the app.

## 20. Transient interface state lives outside the reducer `[RULED 2026-09-11]` `[RULE]`

`src/ui/app.ts` (`ViewState` and the shell closure). **The reducer's charge is the dose.** A disclosure
toggle, a search query or an expanded panel is not a dosing input and putting it through §11.2's
state would mean every such tap produces a new application state — and §4.3 step 1's invalidation
rules would have to grow an exception list. Anything that can change a dose goes through the reducer;
anything that cannot, does not.

## 21. The time zone is the device's `[RULED 2026-09-11]`

`src/main.ts` reads `Intl.DateTimeFormat().resolvedOptions().timeZone` and passes it in. Travelling
across zones re-renders past rows in the new zone — accepted: the alternative is storing a zone per
row and explaining two clocks to someone counting carbohydrates.

## 22. What is built, against §17's list — DELETED 2026-09-11, on Momin's ruling

A list of what is built rots the day after it is written. `git log` is the record.

## 23. A real bug the final verification pass found in my own storage layer

`src/storage/tx.ts`. Fixed, with a test.

## 24. Node and two packages were behind, and the pattern is worth naming

A pinned toolchain goes quiet rather than failing loudly. `BACKLOG.md`'s technical entries carry the
live version constraints; this note is the observation, not the record.

## 25. The render loop destroyed focus, caret and scroll on every keystroke `[RULE]`

`src/ui/app.ts`: `render()` calls `replaceChildren`, which destroys and rebuilds every node, so the
focused input is a different element after each character.

**Why 541 tests and a 100% mutation score missed it:** §13 has no interaction-continuity
requirement. The tests assert what the DOM CONTAINS, and it contained the right thing — the defect
was in the identity of the nodes, which nothing asserted. **This is T3's whole justification**: a
framework with keyed reconciliation makes the class impossible by construction rather than by
remembering to patch instead of replace.

## 26. The mockup's atmosphere was missing, and that was an omission rather than a decision

A design detail dropped in translation is not a design decision. Restored.

## 27. The service worker's precache was a hand-maintained list, and the fonts exposed it

Discovered from the build output now. A hand-maintained list of files to cache rots on the day a
file is added.

## 28. Settings and History moved to the foot of the screen

The top of a one-handed phone is the hardest place to reach. Superseded in scope by note 35.

## 29. "Make it" was the same button name twice

Two different actions cannot share a label.

## 30. The soft-band prompt was styled as a hard error

§10.5's ranks have to be visible in the styling or the budget means nothing.

## 31. The prescription is prefilled now, and §1.2 had to be answered rather than overridden

§1.2 ships no defaults, deliberately: an app that dosed on defaults was round 1's finding from two
directions. The prefill is Hasham's own prescription, which is the answer for one user and the
wrong answer for anyone else. **`BACKLOG.md` T5 is the fix** and gates every search task.

## 32. The red wash survived the back navigation, and said "do not inject" about a meal

A page-level colour outlived the state that justified it. Found by looking at a screenshot; no test
could see it.

## 33. The interface batch, and one thing that changed a message's truth

A copy edit can change what a sentence asserts. Copy changes get read as claims, not as wording.

## 34. The prefill did not announce itself, and the blocked save read as a bug

A field filled in by the app must say so, or a validation failure on it looks like the app is broken.

## 35. All navigation moved to the foot, and the shell took it over from fourteen screens

§10.7. Fourteen screens each drawing their own navigation is fourteen chances to differ; the shell
draws it once.

## 36. The Android back gesture closed the app

`src/main.ts` keeps a history entry so the gesture goes back a wizard step instead. See note 47 for
the defect the first version of this created.

## 37. The keypad, the press feedback, and the placeholder that looked broken

Three small interface fixes, all found on a real device.

## 38. A dead end: an out-of-range reading made "Work out the dose" do nothing

`stepFor` routed `invalid_input` to `carbs` unconditionally, so an out-of-range READING landed on a
screen with no reading on it, which could not show the error. It now routes to the field that is
wrong. **A clean console and a button that does nothing is the worst failure mode in this app** —
there is nothing to report and nothing to see.

## 39. Testing the experience, which is the question this bug actually raised

556 tests and 100% mutation on `src/core` say the arithmetic is right. They say nothing about whether
the app can be used. Note 45 is the answer that came out of this.

## 40. The name, and what it is really for

`BACKLOG.md` T0 carries the ruling and the candidate table.

## 41. Two layout defects I had guessed at twice, and finally measured

Guessing at a layout defect twice costs more than measuring it once. See note 45.

## 42. The keypad was narrower than the specification, and the rule was already in the core

The constraint existed in `config.ts` and the stylesheet did not honour it. A number in one file and
a layout in another is not enforcement.

## 43. The greeting waves, three times, and then stops

`prefers-reduced-motion` respected.

## 44. The app reloaded itself on a first visit, and that is what "stuck on mobile" was

`src/main.ts`. The service worker's `controllerchange` handler reloaded on the FIRST activation, not
only on an update — so a first visit reloaded at an arbitrary moment, including mid-tap.

## 45. `tools/smoke.mjs` — the layer that can see any of this `[RULE]`

jsdom does not lay pages out, load fonts, enforce a content security policy or run a service worker.
`npm run smoke` drives a served build in real Chrome, **over both a secure and an insecure origin** —
the second because `localhost` is a secure context and the phone is not (note 48).

**Every smoke session wipes its own Chrome profile.** Omitting that once produced four false
failures against correct deployed code, because the session's service worker had cached the previous
build.

## 46. Two finishes, and the keypad stopped being opaque

Visual polish, found on a device.

## 47. The real cause: the app navigated away from itself while logging a dose

Note 36's back-gesture support called `history.back()` from a state check, so committing a log could
navigate the app out of itself. `setCanGoBack` is push-only now, and there is deliberately no branch
that pops.

## 48. `crypto.randomUUID` is secure-context only, and that is why logging failed on the phone `[RULE]`

**Fixed by removing the dependency, not by branching on it.** `src/core/ids.ts` builds the same v4
shape from `getRandomValues`, which is available on both origins.

**Why every layer of testing missed it:** unit, integration and browser tests all ran on `localhost`,
which IS a secure context. The API was present everywhere the tests looked and absent on the only
device that mattered. This is why `smoke.mjs` runs two origins, and why feature-detecting here would
have been the wrong fix — it would have split the tested path from the shipped one and hidden the
defect permanently. Contrast note 52, where the fallback is genuinely acceptable.

## 49. `sameView` was always true, and a comment explained why that was fine

`render` compared `${state.screen}/${state.step}` against a value it had just assigned. A comment
explaining why a broken thing is fine is worth less than reading the thing.

## 50. Three smaller ones from the same review

Merged into note 10.

## 51. A third dead end, and the leading zero

`0` typed ahead of a digit parsed as a separate value. Fixed in `parse.ts`.

## 52. Vibration instead of a sound `[RULED 2026-09-13: the vibration stands]`

Momin asked about a sound; the build shipped a buzz. It works with the phone on silent, needs no
user gesture to be permitted, and cannot be missed in a noisy room — a sound would be a confirmation
that SOMETIMES does not happen, which is worse than none.

**Constraints, all of which are the point:** after the write resolves, never before, and nothing on
the failure path — §7.2's commit is one transaction and a buzz ahead of it would be a lie about a
dosing record. **Never the only confirmation**; the screen says "Logged 2 units at 7:21 AM"
regardless. Wrapped, because some browsers throw without a prior gesture.

## 53. The icon, twice

Merged into note 10.

## 54. I called a launch blocker on a mechanism I had not finished understanding

The update offer did not render, which meant an update was taken by closing and reopening the app —
not that updates were undeliverable, which is what was reported. **An overstated defect is not a
harmless error**: it was about to reorder the work ahead of getting the app onto his brother's
phone. `BACKLOG.md` T4 is the closed record, and it was wrong twice in opposite directions, both
times from measuring in `vite preview` rather than in the deployment.

## 55. The installed icon was small because Android uses the MASKABLE one

Merged into note 10.

## 56. `.sheet` inside a card, and buttons pushed off the edge

`tools/smoke.mjs` asserts against this now.

## 57. Five rounding modes were selectable and undocumented

A setting with five options and no explanation is a setting nobody can answer. §5.1's modes are
described in the app now.

## 58. Note 1, decided on measurement rather than on the plan's authority

The third rounding rule — scale, round the magnitude, reapply the sign — is as correct as the
shipped one. Over the full ranges the rules do part, and where they part the shipped rule matches
exact arithmetic. **The shipped rule stays because it is already verified, not because the
alternative is worse.**

## 59. The prompts pushed the page down, and were two copies of one component `[RULED 2026-09-13: in-memory dismissal stands]`

`document.body.prepend(bar)` put the bar in normal flow, so it displaced everything below it. Now one
`promptBar` component, fixed to the FOOT, publishing its height as `--prompt-h` so `#app` pads by it:
**overlaying the page is fine; overlaying "Work out the dose" is not.**

**Momin's ruling on the dismissal: in memory only, and it comes back on the next launch.** His
reason, which is the one to keep: **updates in this app are not optional**, so being asked again
every launch is the behaviour, not a nag to be fixed. Persisting it would let one tap suppress a
version's prompt forever.

**Not `window.confirm`**, which is what the blog uses — that is a MODAL, blocking the page and taking
focus until answered. It could land while a dose is on screen.

## 60. The block screen was the only step that ignored expiry — SHIPPED

`src/ui/screens/calculator.ts`. Only `resultScreen` read `expired`, so after twenty minutes the block
screen still showed the original reading and "check again in 15 minutes", indefinitely. **A stale
dose is dangerous; a stale "do not inject" keeps someone from eating after they have already
recovered.** The staleness line renders now, and the block does not go away with it — being low is
still the likeliest reading of an old low.

**The remainder is no longer a build note.** `overrideScreen` still does not read `expired`, and
looking at it showed the question is bigger than one screen: taking the override invalidates, sets
`expired: false` and recalculates, so a 20-minute-old reading yields a result the app considers
fresh — and re-tapping "Work out the dose" does the same. **The app expires results, never inputs.**
That is a §8.2 question, and it is `BACKLOG.md` entry 20.

## 61. §7.2's pending-save promise was two lies and a dead function

`src/state/machine.ts`. The in-session stacking gate did not know about a failed write:
`inSessionLastDose` was written for exactly this and had no call site. The next calculation inside
§7.4's window re-applied the full correction on top of insulin already acting — the stacking event
§7.4 exists to prevent, while the app reassured him. **The test beside it proved the function
computed, which is not the same as proving the gate reads it.**

## 62. A reading was clearing suspect provenance, which §7.8 forbids `[RULED 2026-09-11: fixed]`

`lastLocalWriteAtMs` was stamped by any local write, so recording a READING cleared the
just-imported caveat. Renamed `lastLocalInjectionAtMs` and stamped only on an injection. **The wrong
name invited the wrong write site**, which is note 7's definition being defeated by a field name.

## 63. §11.8's lint rules had two holes, found by probing rather than reading `[RULE]`

`eslint.config.js`. Reading a lint rule tells you what it was meant to catch. **Seed a violation and
run it.** The same method found three `check-plan.py` checks that certified nothing.

## 64. Dead code the audits surfaced, and what each one's deadness meant

Some was genuinely unused; some was a wire that was never connected (note 61). **The two look
identical in a coverage report** and have opposite fixes.

## 65. The Stryker disables were narrowed, and it bought real coverage

`disable all` silences every mutant down to its `restore`, so a block written for one line was
covering its neighbours. Narrowing to `disable next-line` with a named mutator surfaced two
directives that had been riding under a justification about a different line. Folded into note 16's
table.
