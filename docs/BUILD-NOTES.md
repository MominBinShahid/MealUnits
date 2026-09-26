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

`src/core/resolve.ts`. §4.3 puts the bound at step 9 and the rounding at step 10, but §6.4 gives the
check "a one-increment allowance for the rounded dose" — which does not exist until step 10. So the
primary check runs at step 9 as written, and a second assertion including the allowance runs after
step 10. **Both sit ahead of §6.2's confirmation**, so "the app is wrong, not the user" is never
replaced by a prompt asking him to re-read his inputs.

**The margin at the top is exactly zero, and that is why the strict `>` matters.** At the maximum
reachable dose the two sides are equal, not merely close — 45 = 45 at the shipped prescription,
pinned by the golden case *"§6.4 — the maximum reachable dose is NOT a bound failure"*. A
one-character drift to `>=` refuses a legal maximal dose. Note 16's table records why the mutants
here are disabled rather than killed.

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

**Open, and recorded rather than resolved:** the blue circle is the IDF's registered symbol with
published usage guidance. **Worth reading before any app-store listing.** Nothing about the current
GitHub Pages deployment turns on it.

## 11. The calendar functions take an explicit time zone `[RULED 2026-09-11: the device's]`

`src/core/calendar.ts`. Passed in as data, never read from the environment — that is what keeps
`src/core` importing nothing. §10.4 carries the ruling. See note 21.

## 12. Three floating-point values in a test were wrong because they were remembered

Fixed. Compute expected values, do not recall them.

## 13. The avatar-CSS critique in `BLOG-FIX.md` was wrong, and is withdrawn

Withdrawn, and out of scope besides — that file is Momin's and is untouched. The heading here used to
name it as "`BLOG-FIX.md` §6", which broke this file's own notation rule two ways: the sigil means a
`PLAN.md` section, so it resolved silently against §6, and BLOG-FIX renumbered in the prune anyway.

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

## 16. The 100% mutation score is real, and directives silence mutants by name `[RULED 2026-09-13]`

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

**Both were the app working correctly**, recorded because either would read as a defect to anyone
re-running the walkthrough.

The update prompt appearing mid-run is §11.4 doing its job: the new worker installed, waited, and
offered the swap rather than taking it. And **the dose coming out 5 instead of 11 was §7.4's
stacking gate firing on real data** — an 11-unit dose had been logged into the same profile minutes
earlier, so the positive correction was suppressed and the meal covered alone, struck through with
its reason exactly as §10.3 requires. The gate fired on its own, unprompted, on a real log.

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

## 25. The render loop destroyed focus, caret and scroll on every keystroke `[RULED 2026-09-14: fixed by T3]`

`src/ui/app.ts`: `render()` called `replaceChildren`, which destroyed and rebuilt every node, so the
focused input was a different element after each character.

**CLOSED 2026-09-14.** T3 landed and `src/ui/dom.ts` is deleted — `captureFocus`, `restoreFocus` and
`replaceChildren` with it. The class is gone by construction, and §13 now carries the
interaction-continuity requirement it never had (§13.6.1). Everything below is why, kept intact: the
recurrence is the part worth re-reading, not the fix.

**Why 541 tests and a 100% mutation score missed it:** §13 has no interaction-continuity
requirement. The tests assert what the DOM CONTAINS, and it contained the right thing — the defect
was in the identity of the nodes, which nothing asserted. **This is T3's whole justification**: a
framework with keyed reconciliation makes the class impossible by construction rather than by
remembering to patch instead of replace.

**IT HAPPENED AGAIN SIX DAYS LATER, and this note did not say so until 2026-09-14.** `62bf677` fixed
the same defect in the food search: the screen shipped with an `id` and no `data-field`, which is
what `captureFocus` keyed on, so the restore could not find the node. **647 tests and a 100% mutation
score passed straight over it**, for the same reason they missed the first one. No note was written
at the time, so every document described this as a single historical bug.

**The recurrence is the argument, not a footnote.** `captureFocus`'s own comment predicted it — *"it
holds only while every render path remembers"* — and a new screen forgot, on schedule, without any
regression in the patched code. A second data point for §11.3's rule that correctness by discipline
fails silently at the first path that does not participate.

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

**Why the entry cap is four digits when both fields max out at three:** §4.2's grammar admits one
digit more than the range does (`GRAMMAR_INTEGER_DIGIT_SLACK`), so a typed `6000` is answered with
"that is more digits than this can be" rather than by a key that silently stops responding. **A key
that does nothing reads as broken hardware**, which is worse than a message.

**The defect it turned up:** `MAX_ENTRY_DIGITS` was one flat cap over both fields counting integer
and fractional digits together, so `100.25` was blocked at `100.2` — while `core/parse.ts` already
held the correct per-part rule. The constraint existed in the core and the keypad did not honour
it.

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

**Same class as notes 38 and 47, reached a third way.** §4.3 step 5 is emphatic — *"blank and blank
is no result, NOT '0 units'"* — and the core returned exactly that. **The interface rendered nothing
for it.** The outcome existed; the words did not. Note 39's dead-end sweep walks the everyday path
with values in the fields, so it could not see this one. Two messages now, because the two
`no_result` branches mean different things: nothing entered is a prompt, while a reading at or below
target with no carbohydrate is a real answer.

**And the leading zero: the dose was never wrong.** §4.2's grammar accepts leading zeros and
`Number('0008')` is 8. The DISPLAY was wrong — a screen whose whole job is showing one figure
clearly was showing `0008`.

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

**The residual, accepted rather than migrated.** An install that imported and then recorded a
reading BEFORE this fix carries a trusted-provenance stamp that cannot be re-derived — the event
that set it wrongly left no trace. The reversal, if it is ever wanted, is a one-time migration
nulling the stamp wherever `lastImportAtMs` is set. The affected population was judged plausibly
zero, which is why it was accepted; the recipe is here so "plausibly" does not have to be
re-derived.

**2026-09-21: "plausibly" became "certainly".** Momin ruled that he is the only person who has ever
run this app and cleared his own database, which retires this residual along with every other
older-version accommodation. The recipe stays because the reasoning is reusable, not because
anything is owed it.

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

## 66. The Preact port's two surprises were a silent event name and a silent filter

T3's full account is in `BACKLOG.md`; two things belong here because neither is about Preact and
both will happen again in another form.

**`onCompositionStart` attaches to nothing, and says nothing.** Preact works out an event's real
name by probing the DOM — `if (lowerCaseName in dom) name = lowerCaseName.slice(2); else name =
name.slice(2)` — and NO engine exposes `oncompositionstart` as a property. jsdom 30: `false`.
Chrome 152: `false`, on an `<input>`, on `document.body` and on `window`. So the camelCase spelling
registers a listener for the event type `"CompositionStart"`, which nothing fires. Written
all-lowercase the probe still fails, but `name.slice(2)` then yields the right name — so the
lowercase spelling works everywhere and the camelCase spelling works nowhere, and Preact's own types
ship only the one that does not. The composition guard would have shipped doing nothing at all. What
caught it was a test written to fail BEFORE the port, and the first instinct — "this is a jsdom gap"
— was wrong in a way only the measurement showed.

**A filter that stops matching reports clean.** `check_ui_text_outside_copy` selected files with
`name.endswith(".ts")`. Renaming eight files to `.tsx` left it matching nothing, and because it
expects ZERO findings, nothing about its output changed. An entire app's worth of user-facing text
could have sat outside `copy.ts` — with `10a` handing a translator a file that no longer held the
words — and the checker would have gone on printing `clean.` every time.

The rename was caught by ONE check, the retired-phrase sweep, and only because that one pins a
non-zero count: it expected 1 occurrence in source and found 0. **A check that pins a count tells
you when it goes blind; a check that expects nothing cannot.** That is the general lesson, and it
applies to every check here whose healthy output is silence.

**A third instance, the same day, and it is the one worth reading.** ESLint flat config REPLACES a
rule's options rather than merging them, so two config objects both matching `src/**/*.tsx` and both
setting `no-restricted-syntax` do not combine — the later wins and the earlier selectors stop
running. That hazard was spotted while adding the first pair of JSX guards, avoided, and written up
as a warning inside the array's own comment. **Hours later the §11.1 `useState` guard was added as
its own block by the person who wrote that comment**, switching off all four selectors — §11.8's two
numeric-literal rules included — while `npx eslint .` printed nothing. A seeded probe found it in one
run; re-reading the file had not, twice.

Knowing about a silent failure mode does not protect you from it. Only a check that fails does, which
is why the linter needs the same `--self-test` treatment this file's tooling already has. Where such a check selects its own
inputs, the selection is the part to distrust — this one now walks for the file list and reads
through `load()`, so `--self-test` can seed a defect into the files it claims to cover, which it
could not do before.

## 67. The real-browser layer had been failing 17 checks for a day, and nothing said so

Found 2026-09-14 while verifying T3, and it is NOT a T3 defect — the identical seventeen failures
reproduce on the pre-port build, from a `git archive` of the commit before it. The port neither
caused them nor fixed them.

`88f3394` removed §1.2's prefill on 2026-09-13 — the app fills in nobody's prescription now — and did
not touch `tools/smoke.mjs`, whose `setUp` typed only the basal block because that used to be the
only thing left to fill in. So "Save and start" stayed disabled, setup never completed, and every
check after it ran against the first-run screen. Layout at two widths, the +/- key sizes, the block
card, the HI/LO disclosure, the food list, the worked dose, the history stack and the back gesture:
seventeen, all with one cause, three screens earlier.

**The failures were loud.** `npm run smoke` reported `17 FAILURE(S)` on every run. That is the whole
difference between this and note 66 — nothing here went silent, and it survived anyway, because
`npm run smoke` is not part of `npm run check` and is not in CI. A check nobody runs and a check that
reports clean while blind cost the same amount.

Two things follow, and only the first is done:

1. `setUp` types the three ratios. Fixed here; both builds then pass, which is what proves the
   harness was broken rather than the app.
2. **The harness's setup path is the part with no coverage of its own.** Every check in that file
   depends on setup having succeeded, and nothing asserts that it did — a single check that "Save
   and start" is enabled before tapping it would have named the real fault on the day it appeared,
   instead of seventeen symptoms. That is a BACKLOG item, with the question of whether smoke belongs
   in CI at all (it needs a built app, a served origin and a real Chrome, which is why it is not
   there today).

## 68. A tidier DOM halved two fields, and nothing in the project could see it

Found by review during T3, 2026-09-14, and fixed in the same change.

The port introduced a shared `TextField` component and gave it the shape the
`personName` field already had — `div.field > label + div > input`. Two fields did
not have that shape: `basalName` and `basalTiming` had the input as a DIRECT CHILD
of `div.field.wide`. Unifying them looked like removing an inconsistency.

`.field` is `display: grid`, and **nothing in `styles.css` sets an input's width**.
`.field input` only caps it at `max-width: 9rem`, and `.field.wide input` lifts that
cap. A wide field is full width because its input is a GRID ITEM and stretches.
Wrapped in a plain `<div>` it stops being one and falls back to its intrinsic size.
Measured in Chrome at 412px, before and after:

| | before | after |
|---|---|---|
| `basalName` | 440px | **223px** |
| `basalTiming` | 440px | **223px** |
| `personName` | 144px | 144px (the 9rem cap decides it either way) |

**Why every layer missed it.** 673 tests assert what the DOM CONTAINS, and it
contained the right thing. The mutation gate does not cover `src/ui`. `check-plan.py`
reads documents and source text, not geometry. `tools/smoke.mjs` TYPES INTO BOTH
FIELDS and never measures them — it was the one layer that could have looked and had
no reason to. jsdom cannot lay out a page at all, so no test in the fast suite could
have measured this even if one had tried.

**The check that was added, and why it is a shape and not a pixel.** A wide field's
input must be a direct child of its `.field`. jsdom cannot measure the width, but it
can see the RELATIONSHIP the width depends on — and that relationship is the thing a
refactor breaks. A pixel assertion would live in smoke, need a real browser, and go
red for a font change or a padding change that had nothing to do with the rule. The
test also asserts it found at least one `.field.wide` before looping, so a renamed
class fails rather than passing over an empty list (note 66's lesson, applied
immediately).

**The general shape, which is the third distinct instance in this file.** Note 25 was
behaviour coupled to node identity. Note 56 was a card bursting its width. This is
layout coupled to NESTING DEPTH. In all three the defect was invisible to assertions
about content, and in all three the fix was to find the structural invariant the
rendering depends on and assert that instead. **When CSS positions something, the
selector it uses is part of the contract** — a component that changes the tree is
changing the stylesheet's input, whether or not it touches the stylesheet.

## 69. §5.3's toFixed ban had never fired, and the linter now has a self-test

Found 2026-09-14 by `test/lint-config.test.ts` on its first run, which is the whole
argument for that file.

`no-restricted-properties` was configured `{ object: '*', property: 'toFixed' }`.
**ESLint's `no-restricted-properties` has no wildcard.** An `object` key matches an
object of that LITERAL NAME, so `'*'` matched an identifier called `*`, which does
not exist, and the rule never reported once. Omitting `object` entirely is what
means "any object" — verified both ways against the rule directly:

    { object: '*', property: 'toFixed' }   ->  0 findings
    { property: 'toFixed' }                ->  1 finding

Nothing had exploited it. There is no `toFixed` anywhere in the tree, so §5.3's
rule — "toFixed rounds the binary value and returns a string" — held the whole time
by discipline rather than by the rule that claimed to hold it. That is luck, and
this note exists because luck is not a control.

**The general problem, which this is the third instance of in two days.** A lint
rule's healthy output is silence, and so is the output of a rule that has stopped
running. The other two:

  * `eslint-plugin-react-hooks` crashed eslint 10 on load, because its top-level
    configs are still eslintrc-shaped. A crash, whose output does not read as a
    lint failure.
  * Flat config REPLACES a rule's options rather than merging them, so a second
    config object setting `no-restricted-syntax` switched off four selectors while
    `npx eslint .` printed nothing — walked into by the person who had written the
    warning about it, hours earlier (note 66).

**`test/lint-config.test.ts` is the answer, and it mirrors `check-plan.py --self-test`.**
A fixture carrying one deliberate violation per pinned rule, linted through ESLint's
Node API with ignoring switched off, asserting that each rule reports. Two details
carry the weight:

  * **It asserts on the MESSAGE, not only the rule id.** Four unrelated bans share
    the id `no-restricted-syntax` — §11.8's literals, §11.5's `style`, §7.7.1's
    `dangerouslySetInnerHTML`, §11.1's scheduled hook state. An id-level assertion
    passes while three of the four are gone. The `§` prefix distinguishes them.
  * **The fixture lives under `src/`, not `test/`.** §11.8's selectors are scoped to
    `src/**`, and the `test/**` block turns `no-magic-numbers` off — a fixture in
    `test/` would exercise a different configuration from the one protecting the app.

Shown to fail on both real defects, not hypothetical ones: re-introducing the
duplicate `no-restricted-syntax` block fails exactly the four §-prefixed cases, and
restoring `object: '*'` fails exactly the §5.3 case. Nothing is imported from the
fixture, so the production bundle is byte-identical with it present.

## 70. Every discovering walk now declares a floor, and one had already gone blind again

The general form of note 66's second half, built 2026-09-14 — and it found a live
instance while being built, which is the argument for it.

**The problem.** `check-plan.py`'s checks split into two kinds. Some pin a non-zero
count and therefore announce their own blindness: the count drops to nought and they
fail. The rest report findings and are healthy when silent — and for those,
"examined forty files, found nothing" and "examined NO files, found nothing" print
the same word. `clean.`

T3's rename of eight `.ts` files to `.tsx` left `check_ui_text_outside_copy` matching
zero files, and its output did not change by a character.

**The fix.** Every walk that discovers its own inputs goes through one
`source_files(label, roots, suffixes)` helper, which records how many files it found.
`INPUT_FLOORS` pins a minimum per walk, and `check_input_sets` — registered LAST,
because the registry is filled in by the walks as they run — fails when a walk drops
below its floor, or never ran at all.

The floors are deliberately well below the real counts. They are not a census;
deleting a screen must not fail the build. They are the point at which "this
directory still contains source" stops being true.

**What it caught immediately, and this is the part worth reading.** Routing the
citation sweep through the helper meant looking at its suffix list, which read
`(".ts", ".mjs", ".css", ".js")`. **No `.tsx`.** The port had renamed the files a day
earlier and this was one of the places that did not get updated, so five note
citations — notes 3, 6, 25, 38 and 59, in `app.tsx`, `foods.tsx` and
`calculator.tsx` — were not being checked at all. A citation naming a note that has
been renumbered or deleted is precisely what that check exists to catch, and it
could not see any of them.

**So the same rename broke three separate checks, and exactly one of them said so.**
`check_retired_in_source` failed loudly, because it pins a count. The other two went
quiet. That ratio is the whole case for this note.

**What a floor does NOT do.** It catches a walk that stopped finding files. It does
not catch a regex that stopped matching inside a walk that still finds them — which
is what the multi-line JSX arm did in the same session. SELF_TESTS covers that half.
The two are not substitutes, and a reader who trusts one to do the other's job has
recreated the hole.

Shown to fail by execution against each floor: breaking `SOURCE_SUFFIXES` reports
both src walks, breaking the citation suffixes reports the sweep, breaking
`src/data`'s reports that. `_INPUT_SETS` is cleared at the start of every run,
because `--self-test` calls `main` once per seeded mutation and a stale count from
the previous iteration would mask a walk that stopped running in this one.

## 71. Two `overrides` silence npm permanently, so the checker retires them

Added 2026-09-14 with the lint plugins that needed them.

`eslint-plugin-jsx-a11y` declares the eslint peer "^3 .. ^9" and
`eslint-plugin-react` declares "^3 .. ^9.7"; this repository runs eslint 10, so
npm refuses both. Both were then MEASURED to run correctly on eslint 10 — seeded
probes produced real findings — so the ranges are stale rather than accurate, and
`package.json` relaxes them per package rather than through a blanket
`--legacy-peer-deps`.

**The cost of that is an off switch with no timer.** An override suppresses npm's
peer check for good. The day upstream publishes a range admitting eslint 10, nothing
says so: the override goes on silencing a check that would now pass, and the
`package.json` goes on carrying a workaround for a problem that no longer exists.
`package-lock.json` pins the current versions, so it cannot happen on its own — it
happens the first time someone bumps them, which is exactly when nobody is thinking
about it.

`check_stale_overrides` fails on that day. It also fails when an override names a
package the lockfile does not resolve, or one that declares no `eslint` peer at all,
because an override describing something that does not exist is decoration rather
than protection.

**It reads `package-lock.json`, not `node_modules`, and that is structural.** The
`plan` CI job installs nothing on purpose — its own comment says "No npm step: the
checker reads the documents and the TypeScript as text". A check reaching into
`node_modules` would find an empty directory there and pass silently, which is note
70's failure arriving through a new door. The lockfile is committed, is what npm
actually resolved, and is present wherever this runs.

**An unreadable range REPORTS rather than passing.** The semver test understands the
caret form, which is what both plugins use, and says so when it meets anything else
instead of assuming the override is still needed. A check that cannot judge its input
and stays quiet is a check that has stopped being able to fail — which is the thing
notes 66, 69 and 70 are all about.

Shown to fail by execution against each branch: an override pointed at a package
whose range already admits eslint 10 is reported as unnecessary, one naming an absent
package is reported as describing nothing, and a `>=3 <10` range is reported as
unreadable.

## 72. Smoke now types like a person, asserts its own setup, and refuses a stale browser

Three changes to `tools/smoke.mjs`, 2026-09-14, all from the same root: **the only
layer that is a real browser could not see the class of defect it exists for, and
could not tell you when it had stopped testing anything at all.**

**It types one character at a time, through real key events.** It used to assign
`i.value = '150'` and fire one `input`, which is ONE render — and the defect class
this file exists to reach lives between renders. `Input.dispatchKeyEvent` per
character is what a person does. jsdom's `typeInto` already typed per character and
caught the desktop case; what jsdom cannot do is be a browser, and composition,
predictive text and the soft keyboard live only here.

It focuses once and types into whatever currently HAS focus, rather than re-finding
the field per character — the same rule `typeInto` follows, for the same reason:
re-finding the element each keystroke is a workaround for the defect being guarded,
and it lets the suite stay green while the app is unusable by hand.

**It asserts that setup succeeded.** Every check in the file depends on it, and
nothing checked. When `88f3394` stopped prefilling the three ratios without updating
this helper, "Save and start" stayed disabled and seventeen checks failed against
the first-run screen — reporting the consequence seventeen times and the cause not
once (note 67). There is now one assertion before the tap, plus a per-field check
that each value survived being typed, so a dropped keystroke names the field it was
dropped in.

**It refuses to attach to a browser left behind by an earlier run.** Every session
wipes its profile directory, and the food-list session's comment already explains
why at length. Wiping the directory does nothing if a browser that was using it is
still ALIVE: it holds its state in memory, it keeps answering on that port, and the
next run attaches to it and tests whatever screen the dead run left behind.

That is not hypothetical — it happened while this note's own changes were being
written. Two interrupted runs left their Chromes up, and the next run reported the
app skipping its own first-run gate on a freshly wiped profile. A completely
convincing bug that did not exist, and twenty minutes spent on it.

`session` kills its child in `finally`, which covers a clean exit and not a crash
— and a crash is precisely when something is already wrong and the next run's output
matters most. It now refuses the port rather than killing the stray silently,
because a leftover browser means a previous run died, and that is worth being told
once rather than tidied away every time.

**A fast-typing guard, and the first version of it was worthless.** Momin reported
that typing FAST dropped a character and typing slowly did not, so the symptom is a
function of the gap between keys — and every other typing check here leaves 20ms in
that gap. The new one leaves none, and asserts both the value and that focus stayed
in the field.

Then both assertions were run against the PRE-PORT build, and **both passed.** Of
course they did: the old code restored focus after every render,
`document.activeElement === document.querySelector(...)` re-queries and so compares
the REPLACEMENT element against itself, and headless key events are awaited one at a
time so the restore always finished first. **A check that passes on the broken build
is not a regression test, it is decoration** — and it would have been committed as
one if it had not been run against the defect it names.

What the two builds actually disagree about is IDENTITY. The node is stashed before
typing and compared after: `replaceChildren` yields a different object, Preact yields
the same one. That version fails pre-port and passes now, which is the property a
regression test has to have. It is the real-browser twin of the identity case in
`test/integration.test.ts`.

None of it reaches the phone. The original was mobile-only and the leading theory is
the soft keyboard's composition; headless Chrome sending key events is not a soft
keyboard, and jsdom is not a browser. The evidence the defect is gone remains Momin
on his own device.

**Waits became conditions.** The fixed `wait(400)` calls around setup worked until a
session did something beforehand that shifted the timing — `Page.resetNavigation
History` in the back-gesture session — and setup began typing into a screen that had
not rendered. `until(expr, what)` polls, and its timeout reports WHAT WAS ON SCREEN
instead of only what it wanted. That message is what identified the stale browser in
one run, after guessing had failed twice.

## 73. A one-word sentence is still a sentence, and check 1c could not see one

Closed 2026-09-14, the last of the gaps T3's review opened in check 1c.

The check requires TWO WORDS before it reports a string, and that rule is what makes
it usable: `key dim`, `flag mint` and `go quiet` are class names, not prose, and a
check reporting every one-word string would report every class, id and enum value in
the tree and be switched off within a day.

The cost is that a ONE-WORD SENTENCE escapes. The live instance was
`aria-label="delete"` on the keypad's backspace key — a string spoken aloud to a
blind user, sitting outside `copy.ts`, invisible to the translator `10a` will hand
that file to. It had been there since the first commit, and the port carried it
across faithfully; a note was written at the time saying a port is not the place to
add a copy key, which was right, and this is that place.

**The fix is narrowing by POSITION, not by loosening the rule.** Inside an attribute
that is read to a person — `aria-label`, `title`, `alt`, `placeholder` — there is no
markup to confuse with prose: the value is text or it is a mistake. One word is
enough there and the two-word rule stands everywhere else.

`aria-labelledby` and `aria-describedby` are deliberately absent from that set and
always will be. They hold element ids, which are exactly the one-word tokens the
two-word rule exists to ignore.

What is still uncovered, and now the only known hole: a sentence assembled by
concatenating single-word literals, and any string built at runtime from data.
Neither has appeared here yet.

Seeded: a one-word `aria-label` is caught, 118/118.

## 74. §10.4's never-wrap rule, enforced by a character rather than a stylesheet

Closed 2026-09-15. The rule had been in the plan since v1 and applied nowhere.

`white-space: nowrap` was the stated mechanism, and `Qty` carried it. `Qty` had zero
call sites — before the port as `quantity()`, after it as `Qty` — and `.qty` had no
other user, so whether "10 units" broke across a line depended on the viewport, the
font and the surrounding text. The docstring on `Qty` had already been corrected once
to admit this; the gap itself stayed open because closing it moves the text of every
assertion that names a dose, which is its own piece of work rather than a line to
slip into a port.

**Wiring `Qty` up was not the weaker option. It was impossible.** Most dose strings
are not standalone JSX children — they are arguments into sentence-composing copy
functions (`historyDose`, `divergent`, `overrideAction`, `stuck`), and a `<span>`
cannot wrap a substring of a string. `onSaveStuck`'s figure goes to `promptBar` in
pre-framework DOM where no component exists at all. Making it work would have forced
copy functions to return JSX and dismantled the single-file copy audit that check 1c
exists to protect. The component had zero call sites because it could not have the
ones that mattered.

Only a character travels with a string through every path. So `\u00A0`, written as
the escape and never as a raw character: a raw one fails `no-irregular-whitespace`,
which does not skip templates, and is invisible in a diff — the way this rots.

**The export keeps `&nbsp;` and is not stripped back.** An earlier plan normalised the
character away at the export boundary, on the theory that a doctor's document should
carry plain text. Two things killed it. The export never consumes `units()` at all —
`readable.ts` builds its own strings from raw numbers, so the strip would have guarded
a flow that does not exist, which is the same defect as `Qty` rebuilt on the day `Qty`
was deleted. And the only shared boundary, `download()` in `main.ts`, serves the JSON
restore envelope too, where free text can legitimately contain the character; rewriting
bytes on the way to a medical record's restore file is not a typographic decision.

**Scope is units, grams, g and mg/dL; duration words are exempt.** The misreading §10.4
guards is a glyph passing for a digit — `4U` read as 40, "10"/"units" rejoined as
"10Units". Nothing in "minutes" can do that. Grams are in for the opposite reason: the
food-list figure is the one number in the app a person reads off the screen and types
back into the calculator, and the hypo-treatment line — "have 15 grams of fast-acting
carbohydrate now" — is a grams string read by someone while they are low.

**Tests fold the character away, and that is what keeps the negative assertions honest.**
`plain()` normalises before every wording assertion, following `buttonLabel`'s precedent
of stripping decorative glyphs. Six `not.toContain` assertions carry a digit-unit pair;
against un-normalised text each would have passed whether or not the phrase was on
screen — an assertion that silently stops testing anything. One test reads the raw DOM
and asserts the character itself, which is where that guarantee lives now.

**The check has two arms because the rule fails two ways.** A sweep catches a plain space
between a digit and a unit word anywhere in `src/`. `units()` needs its own pin: it picks
"unit" or "units" with a ternary, so its source holds no literal pair for the sweep to
match — revert its no-break space and the sweep reports clean. The one string that matters
most is the one the general rule structurally cannot see.

**The entity goes OUTSIDE `escapeHtml`, and one cell had it inside.** `doseRows` built the
blood-sugar cell as `` `${bloodSugar}&nbsp;mg/dL` `` and then escaped the whole string, so
`&` became `&amp;` and the doctor's record printed the characters `330&nbsp;mg/dL` — in the
most common row of the document. Every sibling cell appends the entity after the escape and
was correct. 697 tests passed over it: the only two `&nbsp;mg/dL` assertions both name a
reading-only row, which goes through the other function, and the dose row's reading cell had
no assertion at all. Found by review, not by the suite; it now has a test that fails without
the fix.

**What the check does not catch, recorded so the next reader does not assume more.** It
matches the literal form only. Concatenation, `join(' ')`, a template literal broken across
lines, a space at a JSX element boundary, and multi-line JSX text that collapses to a space
were all seeded in review and all escaped. §10.4 and the check's own docstring say so
explicitly — a check whose documentation claims more than it does is the thing this note
opens by describing.

**`ml` and `inch` added 2026-09-17, and the reason is not the one above.** "m" cannot pass for
a digit any more than "minutes" can, so these are not here on the glyph ground — they are here
because `carbs.ts:78` read `'1 medium, 7 inch, about 40\u00A0g'`: one pair protected, one not,
in a single string, in a file whose rows are written by copying the row above. A template
teaching both patterns is how the next wrong row appears. Durations stay exempt on hazard,
measurement units come in on coherence, and §10.4 now states the two grounds separately rather
than stretching one over both.

**Where the list stops.** `CARBS.md` defines the household words in metric — katori, chai cup,
glass, Tbsp — which gives the line: a word whose magnitude this project must declare is a
container noun; a word used to do the declaring is a unit. `'1 katori, 150\u00A0g'` already
enacts it, count on the noun and protection on the measure. An earlier attempt at the line —
"quantities you could put on a scale or a ruler" — fails on its own terms, since a cup is a
volume measure you level off and a katori is what a Pakistani kitchen measures with.

**One name is searched, not just rendered.** `'Large flatbread, 12\u00A0inch'` is a `name`, and
`matchFoods` folds with trim and lower case only. Nobody types U+00A0, so the row became
unreachable by the words printed on it — a silent miss, in the module whose header says matching
the wrong dish is a wrong dose. `fold()` now normalises the character, which is safe for exactly
the reason the case fold is: both needle and haystack pass through it. Two tests, one naming the
row and one general over every row's displayed name; both fail without the fix.

**And the self-test could not have caught any of this.** `src/data` was not in the harness's held
corpus, so a seed there reported its file missing — which the runner counts as an ESCAPE, not a
skip. Held now, with a seed reverting a portion, which is a third shape after the formatter and
the screen: a data row someone edits by copying its neighbour.

Measured in Chrome at 64px: an ordinary space breaks between the number and the word, the
no-break space holds them on one line, and both subsetted webfonts render it at identical
width to an ordinary space. Seeded: three shapes, 121/121.

## 75. Routes, and the 404 that was not in the plan

Closed 2026-09-17. `BACKLOG` 24 listed four things that move with routing — the sitemap, the
worker's `NOT_THE_APP`, the canonical, and §11.5's wording. All four were real. The thing that
actually decided the shape was none of them.

**`/MealUnits/history` is a 404.** Measured, not reasoned: GitHub Pages serves files, and there is
no `history` file. The service worker answers every in-scope navigation with the shell, which is
exactly what routes want — but only once it is installed. A stranger opening a link Momin sent has
no worker, so the naive implementation 404s for precisely the person the feature exists for:
*"if I wanted to guide someone to history page I can't."*

Three ways out were weighed. Hash routes (`#/history`) work everywhere and cost nothing, but a
fragment is one page to a crawler, so the per-route canonicals this entry asks for would mean
nothing. A `404.html` redirect works, at the cost of every first visit being a 404 response with a
redirect flash. **The build emits a real file per route instead** — the same shell with a different
head — so a shared link is a 200 on a first visit with no JavaScript involved. The file carries no
content: the app still renders the screen, reading the path on boot.

**Those heads are generated from `SITE_URL` and `BASE`.** `index.html` states the deployed path
eight times by hand and `check_site_url_agrees` exists because of it; four more pages written the
same way would have made fifteen. `T15` records the fifteen that remain.

**The shells are excluded from the precache, and the walk needed widening to do it.** It skipped
`index.html` by exact path, so `history/index.html` would have shipped four more copies of the same
bytes to every phone — the shape the source-map and `social/` exclusions already reject. An
offline-first app pays for its precache in someone's mobile data, and the worker serves the shell
for these navigations anyway.

**`hardwareBack` survives, and this entry expected it not to.** Real routes let the browser do the
work for the four screens that have addresses. The calculator's steps deliberately have none —
§8.2 expires a result, and a URL that restores a screen restores a dose — so back inside the wizard
still needs an entry carrying no address. The safety exclusion that keeps the calculator unroutable
is exactly what keeps the sentinel necessary. It now pushes a real path when the address changes
and keeps its push-only shape otherwise.

**No router library, and the reason is the same one that delayed this work.** `machine.ts` owns
where the app is. A router wants to own it too, and two owners of that question is the defect §11.5
existed to prevent. The URL is written as a projection of `state.screen` and read back only as which
screen to open, so the rule's content survives its wording changing from "no routing" to **no URL
state**.

**Forward is not "one step back".** The first draft ran the app's own back action on `popstate`,
which is what the old gesture did. A forward tap then leaves the address bar saying one thing and
the screen showing another. The handler reads the path the browser actually landed on.

**A link during first run is spent.** Boot lands on the disclaimer or on first-run settings, and the
landing only moves the app on from the ordinary front door. The alternative is a URL that walks a
stranger past a disclaimer, which is worse than a link that merely does not work.

**One thing the tests made visible, and it had to be fixed after all.** The harness now records the
projected path, a string, where it recorded a boolean before. Asserting on it straight after setup
passed in isolation and failed in a full run — a previous test's pending render writing to module
state after `install()` had already replaced the DOM. The first instinct was to drop the assertion
and record the weakness; CI then failed on a DIFFERENT assertion in the same test, which settled it:
an order-dependent harness does not stay confined to the assertion you noticed it on.

Each `boot` now takes a generation, and a Host stops reporting once it is not the live one. The leak
was always there — a stale render overwriting `canGoBack` with the same boolean is invisible — and
it becomes a real failure the moment the recorded value carries information. Both assertions are
back, and the suite is stable across repeated full runs.

**The worker serves ONE shell for every route, and the browser found it.** Opening the deployed
`/MealUnits/foods` rendered the right screen and showed the wrong tab title. Measured rather than
guessed: `deliveryType: 'cache-storage'`, `transferSize: 0`, `workerStart > 0` — the navigation never
reached the network, so the route's own `<title>` and canonical never arrived. That is not a bug in
the worker; answering in-scope navigations from cache is what makes the app work offline. It means
the route files serve exactly two audiences — a first visit, and every crawler, neither of which has
a worker. For those the canonical is right, which is where a canonical matters.

The title is different: it is what a person sees on a tab and in a bookmark, so the app sets it from
the same table. Four precached shells would have fixed it too, at 28 KB on every install for a
string — the trade the precache exclusion above already refuses. `check_route_titles_agree` pins the
app's default against the one `index.html` ships, because two files stating the front door's title
drift into a title that visibly changes while the page opens.

**And this is the second finding in this note that only a browser could produce.** The suite was
green, `check-plan` was clean, CI was green, the deploy was verified by HTTP status — 200 on all four
routes — and the page still showed the wrong title. CLAUDE.md's rule is not a courtesy.

`check_routes_do_not_collide` is new, because this entry's own warning — a route named like a file,
a file named like a route — was checked by nothing. Two seeds, one per direction. 124/124.

## 76. The address that does not exist, and who actually sees it

Closed 2026-09-17, after Momin asked whether the app could have its own 404 page — and corrected the
answer I gave.

**The premise was wrong, and testing it is what showed that.** I had said a mistyped address returns
404. That is true only for someone with no service worker. With the app installed, the worker answers
every in-scope navigation from cache, the app finds no route for the path and stays on the
calculator, and `syncHistory` rewrites the address bar to `/MealUnits/`. Measured on the deployed
app: `deliveryType: 'cache-storage'`, `workerStart > 0`, address bar `/MealUnits/`. So the app
already did the sensible thing, and it does it without a 404 page existing at all.

**Which narrows who this page is for, and that decided its design.** Only two audiences reach it: a
FIRST visit with nothing cached — a new device, a cleared browser, a link opened on someone else's
phone — and a crawler. Both arrive cold. So the page carries no script and no external stylesheet:
booting the application to say "this page is missing" is a second thing that can fail, on the one
visit where nothing is warm. The styles are inlined from `styles.css`, because a page telling you
nothing is broken should not arrive unstyled.

**The first sentence is the whole reason it is worth building.** Someone who bookmarked a screen and
lands on a 404 has a specific fear on an app holding their doses: that the record is gone. It is not
— the log is in this device's IndexedDB and a missing page cannot reach it. The page says that
before it says anything else, above the explanation and above the way back.

**It is a real 404, deliberately.** GitHub Pages serves this file with a 404 status, which is
correct. The SPA trick — pointing `404.html` at the app so every unknown address opens it — was
rejected for the same reason in `BACKLOG` 24: a typo should not look like success.

**Three checks fired while building it, and each was right.**
`check_public_assets_classified` refused the new `public/` file until it was declared precache or
crawler-only; it is crawler-only, and excluded — the only people who can SEE this page are the ones
with no worker to have cached it with, so shipping it to every phone buys nothing and costs mobile
data. `check_worker_knows_non_app_files` caught that `/MealUnits/404.html` asked for BY NAME would
render the calculator, since it sits inside the worker's scope; it is now in `NOT_THE_APP`. And
§20.5's listing refused to let it exist undocumented.

**And it added two hardcoded copies of the deployed path**, which is `T15`'s subject, so both are
guarded: `check_404_paths_agree` pins the link back and the icon against `BASE`. The failure it
prevents is the sharpest version of that defect — the page whose entire job is to offer a way back,
offering one that 404s as well. Seeded. 125/125.

**A correction to note 75, found while verifying this one.** That note reports the four routes
returning 200. They return **301**, to the same address with a trailing slash — the build emits
`history/index.html`, and a static host redirects `/history` to `/history/`. The original
measurement used `curl -L`, which follows the hop and reports the final 200, so the redirect was
never in the output I read.

It mattered more than a status code. The canonical and every sitemap `<loc>` named the bare form,
so each pointed at a URL that redirects — which Search Console reports as "page with redirect" and
which is the one thing a canonical must not be, since its whole job is to name the address that
serves the content. `pathForScreen` now returns the trailing-slash form and the build follows it;
`screenForPath` already accepted both, so a link typed either way still lands.

**The general lesson, which is the reason this is written down: `-L` hides the thing you are
checking.** A redirect is invisible to a tool told to follow redirects, and "200" was a true
statement about the wrong URL.


## 77. The app knew its storage was evictable and never said

Closed 2026-09-18. `§12` said "call it and SURFACE `persisted()` honestly"; `main.ts` read
`void askForPersistence()`. It did the calling and none of the surfacing, and had since v1.

**What that cost.** WebKit deletes IndexedDB, and with it the entire dose log, after about seven
days without a visit — unless the app is on the home screen. The record simply is not there when the
app next opens, with no error and nothing on screen to explain it. §12's own table has said so from
the beginning: *"7-day storage eviction — iOS Safari: Yes, unless installed to Home Screen."*

**The reason it sat there is the interesting part, and it is a pattern worth naming.** The line under
that table read *"The two facts that drove version 1's install-before-onboarding ordering — eviction
and non-transferring data — do not apply to this user."* That was TRUE and well-reasoned: the user
was one person, on Android. `T5` then made the audience anyone with type 1, and this sentence did not
change, because nothing links an audience decision to a sentence three sections away that depends on
it. **A premise can be invalidated by a decision made somewhere else entirely, and the sentence
resting on it goes on reading as though it were still checked.**

Worse, the protection was unreachable: the install offer is gated on `beforeinstallprompt`, which iOS
never fires. So the one action that prevents the loss was never offered to the only people who needed
it.

**Capability, not detection.** §12 also said the warning should appear "when iOS Safari and not
standalone is actually detected" — detection, a paragraph above the rule forbidding detection, and
wrong anyway: every browser on an iPhone is WebKit, so naming Safari misses Chrome and Firefox users
who are equally affected. Asking `navigator.storage.persisted()` selects exactly the people at risk
without reading a user-agent string, and it is the question the app was already asking.

**Three answers, and collapsing them to two is the defect this note would otherwise repeat.** Durable,
evictable, and *will not say*. The old helper returned `false` for a missing API, which reports a
browser that keeps data perfectly well as one that deletes it. Reporting capability honestly forbids
claiming danger as firmly as it forbids claiming durability, so the type is `boolean | null` and the
trigger is `=== false`, never falsy.

**Where it appears — and the first answer was wrong twice, both times caught by Momin.**

The first draft warned after the first DOSE. He asked why setup did not show it, which exposed the
hole: "Save and start" writes a prescription, and losing ISF, ICR, target and basal means re-entering
it. Waiting for a dose warns about the second thing at risk and not the first. The trigger is now the
settings landing.

Then, offered a line on setup as well, he asked whether that made three bars — install, update, and
this. It would have, and `promptBar` APPENDS rather than replaces, so they stack on a phone screen.
**The answer was that the storage warning and the install offer are the same message**: one says why,
the other says what. So there is no new bar. The install offer gained a second shape — where a real
prompt exists, one tap installs as before; where it does not, the same bar carries the reason and the
three taps. That also closed a gap nobody had named: the offer is gated on `beforeinstallprompt`,
which iOS never fires, so **the action that prevents the loss had never been shown to the only people
who needed it.**

The taps sit in the text rather than behind a button, because a button revealing instructions means a
second bar — the duplication just removed. `promptBar`'s action is now optional for that.

Final shape: a permanent line in Settings, and one bar at the settings landing. Not on the setup
screen, which the bar follows by seconds. No "nothing has happened to your record" line here, unlike
note 76's 404 page — nothing has, and reassuring about a loss that has not occurred muddies it.

Six tests, one per answer and one per placement, including that first-run says nothing at all.

**Three more corrections, 2026-09-19, all from Momin checking it on a real machine.**

*The steps named two taps and there are three.* "Share, then Add to Home Screen" omits the confirming
**Add**, and someone following instructions stops at the last step you name.

*The steps were only in the bar.* The bar is dismissed and gone for the session; Settings is the
permanent place, and someone returning there meaning to fix it was told what to do and never how.
Both now read from one helper, because two copies drift the day either is reworded.

*And the instruction was iOS-worded while firing on a Mac.* Research settles what §12's table only
implied: WebKit's rule is *"seven days of Safari use without user interaction on the site"*, so
**macOS Safari evicts exactly as iOS does** — same engine, same policy — while Chrome and Firefox on
the same Mac grant persistence. `persist()` is REFUSED on Safari rather than unanswered, so the
`false` is a true answer. But a Mac has no Home Screen: there the control is **Add to Dock**.

So the split is: **capability decides whether to warn, platform decides how to word the instruction.**
The trigger stays `persisted()` with no sniffing. The wording keys on `maxTouchPoints`, which
separates handheld WebKit from desktop WebKit without parsing a user-agent — and everything that
reaches this copy is WebKit already, so the only question left is whether it is the one with a Home
Screen. Getting this wrong confuses; getting the TRIGGER wrong would be a false alarm, which is why
they are different mechanisms.

The bar also takes §10.5's advisory treatment — the design's `.alert.warn`: a 3px left accent in the
caution colour on a soft caution ground, so the colour is read before the words. `.flag` is
deliberately untouched; bringing the rest of the app back to the mockup is its own pass.

**Two more from Momin checking the deployed build, and the first is a process failure rather than a
defect.**

*The bar's only control rendered as bare text.* Removing the action button left the dismissal alone,
and it still carried `.link` — a class with **transitions and nothing else**, correct beside a real
button and invisible on its own. The one thing a person could do stopped looking like a thing they
could do. It now takes `go quiet` when it is alone: `.go` supplies `border: 1px solid transparent`
for `.quiet`'s `border-color` to land on, plus the radius, the padding and the 48px touch floor.

**The lesson is not about CSS.** When an element loses a sibling, what remains has to be looked at.
This was findable by reading two rules in `styles.css` and needed no browser at all, and it shipped
because the check was never made. Verified this time before pushing, from the built CSS and then in
a rendered page.

*And the bar is suppressed while Settings is open*, because that screen carries the same warning in
full, with the steps. A bar repeating it over the section you are reading is noise.

**One tooling note worth keeping, because it wasted three measurements.** `.prompt-bar` slides in
over 220ms. **CSS animations are throttled in a background tab**, so geometry read over CDP on an
unfocused tab is the animation's FIRST frame — the bar measured at `top: 1118` in an 1118px viewport
three times running, which is exactly `translateY(100%)` from its resting place. With the animation
disabled it measures `top: 998, bottom: 1118`: flush to the bottom edge, fully visible, no defect.
Anything animated must be measured with `animation: none` or not at all.

**The reminder now has an off switch, and it is a TAP rather than an inference — 2026-09-20.**

The first proposal was to stop warning once the reader had "seen the explanation in Settings". Momin
rejected the premise: Settings is where you go to change a ratio or export, the storage panel sits
near the bottom, and scrolling past something is not reading it. Inferring comprehension from a
visit is the kind of guess this app refuses everywhere else.

So the panel carries an explicit **Stop warning me about this**, persisted in the existing `acks`
store — the same mechanism as the disclaimer and the round-up gate. It turns off the REMINDER and
not the status: the panel survives the tap, so someone who decided not to install can still find out
where they stand. And the bar names its own off switch, because an opt-out nobody can find is the
same as no opt-out.

**It matters that this exists at all.** The update bar's dismissal is in-memory by design, and its
docstring justifies that: *"the waiting worker activates on the next full restart regardless, so
dismissing defers the tap rather than the update."* **That reasoning does not transfer.** Dismissing
the storage bar defers nothing — the risk stands until the app is installed — so without an opt-out
the bar returns every launch for ever, which §10.5's warning budget says is how a warning stops being
read. Inheriting a policy along with a mechanism is easy; the rationale has to be re-checked.

**The ack lives in the storage the warning is about**, which is right rather than ironic: if the
eviction fires, the record goes and the opt-out goes with it, and someone who has just lost their log
is exactly who should be told it can happen again.

**Two smaller things, both Momin's eye.**

*The heading was smaller than its own body text.* `.flag` declares `0.8125rem`, the heading inherited
it, and the global `p` rule is `0.9375rem` — so a paragraph inside an advisory rendered LARGER than
the heading above it. `.flag` had never contained a `<p>` until §12's panel. Fixed at the component:
its children honour its scale, which is also what the design does — `.alert h4` and `.alert p` are
one size, separated by weight and colour.

*And "this browser has not promised to keep it" was API-speak.* Browsers do not make promises to
people. The three answers now say what happens: **will keep**, **won't say**, **can delete**.

**A second browser-verification trap, after the throttled animation.** A preview server reused across
builds serves the NEW `index.html` only to a browser that has not cached the old one. A stale page
requests the previous hashed CSS, the dev server answers a missing asset with `index.html`, and that
parses as **zero CSS rules** — so every element measures as unstyled and the app never boots. It
looks exactly like a broken stylesheet. Bust the cache, or use a fresh port.

**And the opt-out's own weight was wrong, which Momin spotted immediately.** A filled button inside
the advisory made *turn this off* look like the thing to do — the same mistake as a cyan dismissal,
one level down. It is `.more` now: the app's existing understated text action, underlined, no
background, and still 48px tall so §10.7's touch floor holds. Findable without competing with the
warning it sits beneath.

**The confirmation is a footer, not a second warning.** Under a `--warn-line` hairline and in
`--ink-3` — dimmer rather than louder, and deliberately not a warning colour. Turning a reminder off
is a choice, not a fault, and colouring it as an error would tell someone they had done something
wrong while the panel above still carries everything that actually is. The shape copies
`.working .row.total`, which is already how this app sets a settled line apart from the rows above it.

Measured on a fresh port: heading and body 13px, the opt-out 13px amber and underlined at 48px, the
footer `--ink-3` above a `--warn-line` rule.


---

## 78. Asking which insulin, and the four places the answer had to reach

`BACKLOG.md` entry 26, built 2026-09-20. This note is the decisions the entry did not make.

### The stacking windows ship keyed by class and identical in value, and that is deliberate

The entry asks for both clocks to move by class. Only one does, and the split is the entry's own
argument read back: **the eat delay fails toward hypoglycaemia and the windows fail toward running
high.** A rapid analogue injected twenty minutes early is acting before the food arrives. A
correction held back longer than an analogue needs runs high, which §2.1 calls the tolerable
direction, and §7.4.1's per-dose override — recorded on the row — is the designed escape.

So the waits are label-derived per class and live today, and the windows wait on `CLINICAL.md`
question 10c. Shortening a gate is the dose-RAISING direction, no source states a number, and
§20.1.1 forbids picking one off a reading of the literature.

**The mechanism still shipped complete**, including the switch-day rule, and that was the point of
doing it now rather than later. Entry 26 point 9 warns that the rule would be retrofitted if the
windows became per-class afterwards — and a retrofit is exactly when somebody forgets that the gate
belongs to the insulin already ON BOARD. `effectiveWindows` takes the longer of old and new, is
tested against a table whose classes DIFFER, and the shipped table's equality is pinned from the
outside by `test/insulin.test.ts`. The eventual ruling is a data edit with the tests already written.

### The missing field turned out to be the migration

`SettingsRow.bolusId` (then `insulinId`) did not exist before this. A row written without it read
back `undefined`, and `repo.ts` mapped that to `''` — which is `UNANSWERED_INSULIN`, the state that
makes the app ask. An install that had been running for months therefore met the required question
on its next open, exactly as entry 26 point 1 asks for, and **no `DATABASE_VERSION` bump was
needed**: no store and no index changed, and the one absent field already had a meaning.

That is not a trick, it is what §4.1's rule buys. `''` and `'unknown'` are two different answers with
two different behaviours, so the sentinel that means "never asked" was already in the design before
anything needed migrating.

**The mapping itself went on 2026-09-21** with every other older-version accommodation, on Momin's
ruling that he is the only person who has ever run the app and would clear his own database. `''` is
still `UNANSWERED_INSULIN` and still makes the app ask, but nothing WRITES it to a settings row
either — the gate on it is defence in depth now. What survives here is the design point,
which was always the interesting half: a sentinel that already means something absorbs a schema
addition for free.

### The question is asked BEFORE the three ratios

The obvious placement is a row in the settings form. It is wrong for one reason: an answer of
"premixed" ends the setup, and making somebody type a target, a sensitivity and a carbohydrate ratio
first — then telling them the calculator does not fit their insulin — is a worse way to say the same
thing. It is also a long grouped list that deserves its own screen.

On a first run the answer has nowhere to be stored, because `commitSettings` needs the three ratios.
It rides in the settings DRAFT and travels with the first save. On an existing install it is
committed immediately, as its own settings revision — which is right rather than heavy-handed: §7.7's
machinery exists because the settings in force now are not the ones that produced a historical row,
and an insulin switch is exactly such a change.

**Changing insulin clears the reader's own pre-meal wait.** A prescriber's "twenty minutes" was an
answer about the old insulin, and carrying it silently onto a rapid analogue would be the original
defect with the app's own fingerprints on it.

### Why the list is grouped, and why the insulins that do not work are in it

HumuLIN and HumaLOG are on ISMP's confused-drug-names list, as are NovoLIN and NovoLOG and both
premix pairs. An alphabetical list seats each pair in consecutive rows; ISMP's own mitigation is to
stop that happening. Class headers do it structurally — and they make the harmless mistake the easy
one, because a within-class mispick leaves every timing correct.

Premixed, NPH and long-acting insulins are named and route to an exit. Leaving them out does not
protect those readers, it sends them to the nearest-looking name. The long-acting rows were added on
top of the entry's list for a second reason: somebody who believes their Lantus is their mealtime
insulin is confusing the two halves of their own regimen, and §1.3 already has a field for it.

**The confirmation echo restates the class FACTS, not the name just tapped** — re-reading your own
choice confirms nothing. It ends with the physical check: every mealtime insulin is a clear solution,
while NPH and every premix containing it are suspensions whose labels require resuspending. That does
not tell a Humalog user from a NovoRapid user and does not need to. It tells a premix user they are
on the wrong screen.

### The exit gates the calculator and nothing else

Someone months into their own record who answers this question truthfully must not lose access to it.
The exit reaches History, and its FIRST sentence is that nothing has happened to their record — the
same opening, for the same reason, as the 404 page.

There is no "continue anyway". §7.4's gate has an override because the reader can know better on the
day; here there is no dose to be right about.

### Two things found by opening it in a browser, which the tests could not see

**The out-of-model exit was escapable.** It offers "open my record"; History's Back dispatches
`go: 'calculator'`; the reader was on the calculator, past the premix exit AND past §1.2's mandatory
settings, typing a reading. Every screen that goes home says `'calculator'`, so fixing the two
reachable callers would have left the next one to be written wrong — the same shape as §12's
suppression defect, where the raise was guarded and the bar already on screen was not. The guard is
in the reducer's `go` now: a `go: 'calculator'` resolves through the same gate as `loaded` does, and
no route can walk around it. History and Export stay reachable, because the exit must not hold a
record hostage.

**"I don't know" promised a field it then hid.** The note tells that reader to ask their doctor and
says Settings has a place for the answer; Settings hid the wait field whenever the class was unknown,
which is the one case where a prescriber's number is the ONLY wait there could be. The field is
always shown now, with its own hint — *leave this empty and the app says nothing about when to eat* —
and `eatDelayFor` already preferred an override over a class, so nothing else moved.

Settings also labelled that answer "Not recorded", which is what a prescription period predating the
question says. An answered "I don't know" reads "Not known". §4.1's three states, one layer out.

### The U-100 sentence had to be rewritten, and NOT parameterised

`unitAssumption` said *"the standard strength, and what Humulin R is"* — a claim about the reader's
own insulin, written when the app assumed there was one. Naming their brand instead would be the
obvious fix and it is unsafe: **Humalog and Lyumjev are also sold at 200 units/mL**, so the same
sentence would be true for most brands and false for exactly the readers holding a 200-unit pen.

So it names no brand and points at the box, which is the one thing the reader can verify — the same
move §8.5 made in asking for the brand on the dose rather than the concentration. **U-40 keeps its
2.5-times figure and stays named**: it is not a museum piece in this app's own region, and the
multiplier is attached to it rather than left floating beside a mention of U-200, where it would be
wrong about one of the two.

### The one piece that was not built — BUILT, and this note said otherwise for too long

⚠ **CORRECTED 2026-09-26.** This note read *"the screen carries the sentence and no link, because
nobody has given this build the form's address"*. That was true when written and stopped being true
once Momin supplied the address: `src/ui/screens/insulin.tsx` builds a `mailto:` from
`CONTACT_EMAIL`, and `BACKLOG.md` entry 26 records it as shipped. Two documents disagreed with the
code and with each other, and `check-plan.py` could not see it — a cross-document status claim is
not something it checks.

The original reasoning is kept because it still governs: a control labelled "tell us about it" that
lands somewhere wrong is worse on that screen than the words alone. That is why it waited for a real
address rather than shipping a placeholder.

### A pre-existing gap this did not touch — CLOSED 2026-09-20

§7.7 says a threshold-only change does not bump the settings revision. When this note was written
nothing implemented it — `commitSettings` allocated on every save — so an eat-delay-only change
wrote a `settingsHistory` row identical to the one before it and the export printed two identical
prescription periods. The gap predated that work by every revision; `eatDelayMinutes` simply joined
the fields it applied to. It was raised as `BACKLOG.md` T18, a question rather than a fix, per
§20.1.1.

**T18 was ruled and shipped on 2026-09-20.** `sameProvenance` in `repo.ts` implements the
comparison by walking the proposed row's own keys rather than a hand-written list, and a
`storage.test.ts` block pins it field by field.

### What the checker had to learn

`check-plan.py` pinned `EAT_DELAY_MINUTES` as a literal, and the entry predicted the problem: "there
stops being *the* value for the checker to assert." Three things changed, and two of them were found
by running it rather than by reading it.

- **The three constants are now pinned as ALIASES** onto `INSULIN_TIMING.regular`, and a new check
  pins the table row by row — in `src/config.ts`, in §11.8 and in §8.1's class table. Both halves are
  load-bearing: without the alias pin a row could be re-pointed at another class with every literal
  still correct.
- **The alias pin reads PLAN.md**, so re-pointing the alias in `src/config.ts` alone passed clean.
  A seeded mutation caught it; the fix asserts the aliases in the shipping file too.
- **The prose rule is class-aware rather than relaxed.** It fired on `CLINICAL.md`'s new rapid row
  the moment that row was written. A statement is now checked against the class the surrounding prose
  NAMES — nearest word wins, which matters because "ultra-rapid" contains "rapid" and because a
  ±90-character window reaches into the paragraph next door. A rapid row stating 20–30 is still a
  finding, which is the case that matters: it is the wrong number in the hypo direction.

---

## 79. Three alignment bugs, two measurements, and a class name that was already taken

Four small things from the built insulin screen and §10.6's disclaimer, 2026-09-20. They are
together because they share one lesson: **the type system and the linter cannot see any of them**,
and three of the four were found by looking at the screen rather than by reading the code.

### The row that was reported twice, and why the first fix missed

Momin said the "I don't know" row was not centred. It was left-aligned among a column of brands, so
the first fix centred it horizontally — `justify-items: center` — and a measurement said the
vertical was already fine: `getBoundingClientRect()` on the `.brand` span gave 13px above and 13px
below in a 56px box.

**The measurement was of the wrong thing.** `.go.insulin` is a grid, and with the default
`align-content: stretch` the row takes all the spare height, so the span stretches to fill the cell
while its line box stays at the top. The rect describes the STRETCHED CELL, which really is centred,
and says nothing about where the glyphs are.

A `Range` over the text node says what the eye said: **15px above, 22px below**. Seven pixels high.
`align-content: center` fixed it — 18/18 on the one-line row, 15/15 on the two-line ones.

The lesson is not about grid. It is that a measurement can agree with the code and disagree with the
screen, and when a person says a thing looks wrong twice, the measurement is the suspect.

### `.flag.halt` inherited a panel that already existed

The disclaimer's red panel was written as `.flag.halt` — `.flag` for the shape, `halt` for the
colour. `.halt` has been a class since the first stylesheet: §3's band C and D refusal, with
`flex: 1`, `display: flex`, `justify-content: center` and 1.5rem of padding.

So the panel rendered **360 pixels tall with three lines floating in the middle of it**. Not subtly
wrong — obviously wrong, the moment anyone looked, and invisible to everything that does not look.
It is `.flag.stop` now.

Two classes that each have rules do not compose into "the first one, but the second one's colour".
That is worth saying because the naming reads as though they should.

### One red, and the argument against a second

The `--halt` tokens had existed with no panel using them, which is why the name was free to collide
with. Bands C and D are red by REFUSAL — they replace the dose rather than sitting beside it — so
nothing had ever needed a red advisory.

The disclaimer gets exactly one, and §10.5's budget is the whole reason. Two reds is no red: the
second teaches that red is how this app writes, and then the first stops being read. The type-1
paragraph is amber on the same screen, and the split is by JOB rather than by importance — the
device statement is what every reader must carry out of the screen, the regimen statement exists to
send the wrong reader away.

The two remaining paragraphs stay plain prose. "It fills in none of them" and the non-endorsement
line are facts about the app rather than hazards to the reader, and panelling them would spend the
budget on nothing.

### And a flake that had started hiding real results

`test/lint-config.test.ts` timed out at vitest's default five seconds, twice, during full runs. It
passes in well under five when the file runs alone — so it is contention with the other
twenty-eight files, not a cold start. `findings()` caches, so one case spawns ESLint and the other
eleven read its result; that one case pays for the whole file.

Fixed rather than deferred because it had begun failing the verification of other work, and **a
green run you cannot trust is worse than a red one.** Thirty seconds, stated at the line as being
about process start rather than about the assertion.

### The missing-row default that had a safety direction

Deleting every older-version read left `installedAtMs: install?.installedAtMs ?? nowMs` in
`readAll`, and it looked like one more of them. It is not, and the reason is worth a line because
the mechanics are trivial enough to hide it.

The install row is written in `onupgradeneeded`, so it exists for every database that exists and
that branch only runs on one that is already broken. What matters is not that a default is needed —
IndexedDB's `get` returns `undefined` for an absent key, so something has to go there — but WHICH
default. §7.5 marks a log predating the install as `suspect`, so `nowMs` makes every existing row
suspect where `0` would make every row **trusted**. Same shape, opposite direction, no test
distinguishes them because neither can be reached on a healthy database.

Momin, on being asked: *"it's basically use the installedAtMs or use the now, it's a basic
condition."* Which is right, and is exactly why it needed writing down — a fallback simple enough
to read past is a fallback whose value nobody re-examines. When provenance cannot be established,
claiming less of it is the only safe way to be wrong.
