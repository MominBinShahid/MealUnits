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

## 1. Rounding operates on the decimal representation, not on the value scaled by 100 `[RULED 2026-09-09: keep it]`

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

**RULED 2026-09-09 — keep it, and the reasoning changed.** Momin asked what was actually correct
rather than what the plan said, which turned up a THIRD rule the note never recorded: scale, round the
MAGNITUDE, reapply the sign. It is as correct as the decimal-text route. See note 58 for the
measurement and §5.2 for the table — 2,623,215 integer-grid values, zero disagreements between them
there [corrected 2026-09-11: that grid is not "every reachable value" — over the full ranges the
rules do part, and where they part the shipped rule is the one that matches exact arithmetic; note
58 carries the corrected measurement]. The shipped rule stays because it is already verified, not
because the alternative is worse.

---

## 2. An above-range reading gets "check the number", never band E `[RULED 2026-09-09: keep it]`

**Where:** `src/core/resolve.ts`, and the golden case named "§4.5 — 605 gets 'check the number'".

**The problem.** §4.5 contains two sentences that cannot both be executed:

> "A reading below 20 or above 600 is **not** merely 'invalid': per step 3, below-range routes to the
> low-reading response and **above-range to band E wording**."

> "A typed `605` (a plausible typo for `60.5`) gets plain *'check the number'* plus a link to the HI
> guidance, **not** band E's ketone wording — 'check ketones' is a confusing reply to a typo."

**Decision.** The second one, because it is the more specific and it carries its own reasoning. An
above-range reading produces `invalid_input` with reason `above_range` and asserts **no band at
all**. The interface shows that reason's "check the number" line with a disclosure beside it that
opens the full HI guidance (`COPY.meterHi`), and the reading screen offers the same control for the
LO case.

**CORRECTED 2026-09-11.** The last sentence originally read *"the interface attaches the HI guidance
to that reason"* — written as a claim while nothing rendered `meterHi` at all, which is the missing
wire note 38 found: a note asserting that something is wired is not a wire. The disclosure exists
now, so the sentence above describes what is actually built rather than what was intended.

**Consequence worth seeing:** the error reasons are `above_range` and `below_range` rather than a
single `out_of_range`, precisely so the interface can tell the HI case from the LO case without
re-reading the number.

**RULED 2026-09-09 — keep it.** Momin confirmed against the running app: typing `605` shows *"A meter
does not read above 600. Check the number — if it really is showing HI, enter 600."* and no ketone
advisory. §4.5's losing sentence is deleted rather than left standing, and the retired phrase is in
`check-plan.py`'s RETIRED table so it cannot reappear in any document unnoticed — a contradiction
left in place is a trap: a later reader finds the band-E sentence, sees the code disagree, and
"fixes" the code.

---

## 3. `lastDose` is named for the figure it holds `[FYI]`

**Where:** `src/core/types.ts`.

§11.2 records a blocking round-9 finding: the snapshot said `lastDose {units, atMs}` without saying
whether `units` was the calculated or the injected figure, and "a test author who pinned the
calculated number would have pinned the wrong gate input."

The field is therefore called **`injectedHundredths`**. The name answers the question the finding was
about, and §2.2's representation is in it too, so nothing downstream reconstructs units as a float.

The golden fixtures write `lastDose: { units: 6, atHoursAgo: 2 }`, and the harness converts
(`test/golden.test.ts`: `atMs: NOW_MS - atHoursAgo * MS_PER_HOUR`). That is **not** §13.2's schema —
§13.2 writes `{"units": 6, "atMs": 0}` plus a per-case `nowMs` — so `atHoursAgo` is the harness's
own deviation, recorded here because until now it was written down nowhere. The fixture stays
readable; the type stays unambiguous.

**CORRECTED 2026-09-11.** The paragraph above originally called `atHoursAgo` "§13.2's schema". It
never was; the sentence now records the deviation instead of denying it.

---

## 4. Two snapshot fields the plan implies but §11.2's list did not name `[RULED 2026-09-09: keep them, and §11.2 now names them]`

**Where:** `src/core/types.ts`, `Snapshot`.

§11.2 lists the snapshot's contents. Two things the resolver cannot work without are absent from
that list, though both are legislated elsewhere:

| Field | Legislated in | Why it has to be in the snapshot |
|---|---|---|
| `blankReadingAcknowledged` | §4.6 | The acknowledgement is per-calculation and never persisted, so it cannot come from storage; and §4.3 step 6 resolves it inside the precedence order, which reads only the snapshot |
| `largeDoseConfirmed` | §6.2, §6.3 | The confirmation "applies only to the exact values confirmed", which is exactly what a committed snapshot is |

Neither is persisted. Both die with the snapshot, which is what §4.6 and §6.3 require.

**RULED 2026-09-09 — keep them, and §11.2's list now names them.** No code change: the fields were
already there and already correct. What changed is that the plan stopped describing a snapshot the
resolver could not work from.

**The alternative was to hold both as shell state outside the snapshot**, and it fails on the
question §11.2 exists to answer. §4.3's precedence would read from two places instead of one, so the
"one committed picture" guarantee would acquire an exception — and both flags would need explicit
invalidation on every input change, a convention someone can forget. Keeping them in the snapshot
makes a changed input produce a new snapshot, and the stale confirmation cannot survive because there
is nowhere for it to survive.

---

## 5. §6.4's bound is checked twice, on purpose `[FYI]`

**Where:** `src/core/resolve.ts`.

§4.3 puts the bound at step 9 and the rounding at step 10. But §6.4 says the check carries "a
one-increment allowance for the rounded dose", and the rounded dose does not exist until step 10.

So: the primary check (`clamped > bound`) runs at step 9 exactly as written, and a second assertion
including the allowance runs after step 10. Both return the same `bound_failure` outcome, and both
sit ahead of §6.2's confirmation, so "the app is wrong, not the user" is never replaced by a prompt
asking him to re-read his inputs.

**The margin at the top is exactly zero — ADDED 2026-09-11, ruled: keep both checks.** At the
maximum reachable dose the two sides are equal, not merely close: blood sugar 600 with 300 g at
target 70, ISF 5, ICR 1 gives total = bound = 406 units (verified by execution), and the golden
case *"§6.4 — the maximum reachable dose is NOT a bound failure"* pins the same equality at the
shipped prescription, 45 = 45. So the unreachability §6.4 claims rests entirely on the comparison
being strict `>`: a one-character drift to `>=` refuses a legal maximal dose with "the app is
wrong, not the user". That corner IS pinned — flipping step 9's comparison to `>=` fails that
golden case (verified by execution, 2026-09-11) — but the protection comes from the golden, not
from the mutation gate: note 16 disables the Stryker mutants at those lines by name, and a reader
of note 16 alone would conclude the corner is unprotected. It is not. Both checks stay, consistent
with §6.4's "both reviewers said keep it".

---

## 6. A blocked low carries every input error alongside it `[RULED 2026-09-09: keep it]`

**Where:** `src/core/resolve.ts`, the `blocked_low` outcome.

§4.3 step 4 says to collect the errors and not let them replace step 3's low-reading guidance. It
does not say which errors travel with the block.

**Decision:** all of them. A valid in-range low such as 65 produces no blood-sugar error at all, so
nothing spurious appears; a reading of 0 or 19 produces one, and that pair **is** §4.3 step 3's
"combined invalid-reading-and-possible-low response". Settings errors do not travel — a blocked low
needs no setting to be correct, and routing him to settings while telling him to treat first would
bury the instruction that matters.

**RULED 2026-09-09 — keep it.** Worked through with the resolver rather than argued:

```
bs=65  carbs=50   ->  blocked_low, bands ["C"], alsoInvalid []
bs=65  carbs=999  ->  blocked_low, bands ["C"], alsoInvalid [{carbs, above_range}]
bs=180 carbs=999  ->  invalid_input, errors [{carbs, above_range}]
```

The block always wins and no insulin number appears either way; `alsoInvalid` is empty unless there
genuinely is a second problem.

**Momin's question is what settled it: "won't it reset the values fifteen minutes later?" It does
not.** §8.2's expiry sets one flag and clears nothing —

```
right away : step=blocked expired=false
+20 minutes: step=blocked expired=true
inputs kept: {"bloodSugar":"65","carbs":"999"}
```

So the unusable `999` survives the entire interruption. Without `alsoInvalid` the sequence is: block
shown, carbohydrate problem silent, treat the low, wait, come back, type a new reading over the old
one — and only THEN learn about a value the app has been holding the whole time. The second trip is
avoidable and the app already knows enough to avoid it.

**Against it**, and it is a real argument: §10.5 budgets hard, and this is the most safety-critical
screen in the app. The answer is rank 1 itself: the band C/D block is terminal — *nothing else
shows* — so the carbohydrate half is deliberately **not rendered on the block at all**. It waits on
its own entry screen, which §18.14's back path returns to with the unusable value still in the
field. The blood-sugar half is different: it is about the very number the block is presenting, so
it renders inside the block's own copy — the block's message, not a second element, which is what
rank 1 governs.

**CORRECTED 2026-09-11.** This paragraph originally defended a carbohydrate line that "sits below
the block". Nothing ever rendered it — and nothing should have, because §10.5 rank 1 forbids
anything beside the block. What ships now is the split above: the blood-sugar half inside the
block's copy, the carbohydrate half on its own screen after Back. The ruling — all input errors
travel with the block — stands.

---

## 7. "History was just imported" needed an operational definition `[RULED 2026-09-11: keep it — §7.8's "Not an input to anything" governs]`

**Where:** `src/core/history.ts`, `HistoryContext`.

**RULED 2026-09-11.** The definition below stands, and the reading beneath it is blessed as the
governing one: §7.8's "Not an input to anything" is why a READING never clears suspect
provenance — only a locally observed injection does. Note 62 is the enforcement of the same
reading; this note carried its rationale. The question this entry held open is closed.

§7.5 lists four conditions that make provenance suspect: an empty log, a log predating the app's own
install, **history just imported**, and a row excluded by §7.6. The third has no definition — "just"
is not a duration.

**Decision:** an import counts as recent until this install writes an injection row of its own.

```
justImported = lastImportAtMs !== null
               && (lastLocalInjectionAtMs === null || lastLocalInjectionAtMs < lastImportAtMs)
```

(The second operand was `lastLocalWriteAtMs` until 2026-09-11 — note 62 records the rename and the
wrong write site the old name invited. The persisted key keeps the old name; only the domain field
moved.) This reads "suspect" for exactly as long as the app has not yet seen him inject.

**CORRECTED 2026-09-11 — the original argument here defeated a proposal nobody made.** It read:
*"Imported rows carry the other install's timestamps, so a clock-based window would be wrong in
both directions."* That defeats a window on ROW timestamps and says nothing about the real
alternative, which is a window on `lastImportAtMs` — stamped with THIS install's clock in
`importer.ts`, so a clock-based expiry on it is perfectly well defined. The argument that actually
holds is about truth, not clocks: the only person who sees §7.5's caveat indefinitely under this
rule is someone who imported recent-ish rows into an older install and then calculates dose after
dose without ever logging one — and for that person the caveat's sentence is TRUE, the app has
still never watched him inject, so a clock expiry would silence a true warning. It would also be
the odd rule out: none of §7.5's other three suspect conditions is cleared by a duration. An empty
log and a log predating install are cleared by a local write, and a §7.6 exclusion clears only when
the offending timestamp stops being in the future — each waits on an event, not on time passing.

**The trust asymmetry, never recorded here and worth writing down.** Imported rows are fully
load-bearing in `mostRecentUsableInjection` — no origin check, because log rows carry no origin
marker at all — while the same import makes provenance suspect. That is directionally safe: §7.4's
gate only ever SUPPRESSES a positive correction, so trusting an imported row can lower a dose,
never raise one, while the suspicion costs only a caveat line. **Trust for suppression, suspicion
for silence.** And it fails safe under clock trouble: `lastImportAtMs` and
`lastLocalInjectionAtMs` come from the same local clock, so only a backwards step between the two
writes can misorder them — and that misordering reads as still-just-imported, which is suspect,
which over-warns rather than under-warns.

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

## 9. `config.ts` gained a section the plan did not list `[RULED 2026-09-11: keep it — §11.8 now records it]`

**Where:** `src/config.ts`, "UNIT CONVERSION AND FORMATTING".

Milliseconds per hour, minutes per hour, the twelve of a twelve-hour clock, the two of two decimal
places, the digit at which half-away-from-zero rounds up. §11.8's block does not contain them, and
they are not decisions — they are arithmetic.

They are in the file anyway, because §11.8's rule cannot survive an unwritten "except the obvious
ones" clause: the moment one number is allowed to live elsewhere, the rule stops being mechanical.
They sit under their own heading so nobody mistakes them for clinical constants.

**RULED 2026-09-11: keep it.** §11.8's amendment now records this section AND the `src/sw.ts`
lint exemption (note 64's flag), so neither decision lives only in code any more.

---

## 10. The icon — the colour is ruled, the geometry is measured; notes 50, 53 and 55 merged here `[RULED 2026-09-11: keep IDF blue]`

**Where:** `tools/icon.svg.mjs`, `public/icons/`, `public/manifest.webmanifest`.

§20.4 specifies the mark exactly — ring `r32.5` at stroke `17`, disc `r20.5`, H reversed out — and
gives no hex. The IDF's own style guide puts the blue circle at Pantone 279 C, so the file uses
**`#418FDE`**, which is that colour converted. One constant, one place, easy to change.

**RULED 2026-09-11 — keep IDF blue `#418FDE`.** The mark IS the diabetes symbol, and on a home
screen it reads as one before the name does; recolouring would keep the geometry and lose the
recognition. One caveat, recorded rather than resolved: the blue circle is the IDF's registered
symbol with published usage guidance, worth a look before any app-store listing.

The maskable variant is a **separate file** with `"purpose": "maskable"` — §12 forbids
`"any maskable"` on one file. That part of the original note stands.

**CORRECTED 2026-09-11, and notes 50, 53 and 55 are merged in.** This note said the maskable
variant scales the mark to 0.62, and notes 50 and 53 both defended that figure as "the 80% safe
circle... a constraint, not a preference" — the claim note 55 dismantled. Three notes contradicting
one another about a single artefact is worse than one wrong note, so this is now the single icon
record.

**What actually happened, in order.** The `any` icon went 0.86 → 1.0 (note 50, after Momin said
the app icon looked smaller than its neighbours; 1.0 was called "the largest this geometry allows
without clipping", also wrong) → **1.17** (note 53, span 96 of 100). 1.17 is safe BECAUSE
the mark is a centred circle: a rounded-corner mask — iOS's ~22% radius, Android's squircle —
removes area at the CORNERS, and a circle's extremes sit at the middle of each edge, where no
corner rounding reaches. A square mark could not be pushed this far. Then Momin reported the
INSTALLED icon still small, and note 55 found why both enlargements had changed nothing on his
phone: **Android's home screen uses the MASKABLE icon**, which was still at 0.62. The maskable
safe zone is a centred circle of 80% of the canvas diameter; the ring's outer edge sits 41 from
centre at scale 1, so the safe radius of 40 permits up to 40/41 = 0.9756. At 0.62 the mark spanned
50.8 of 100 — it could be half again as large and never clip. *"0.62 was not the constraint, it
was timidity"* is now the comment in `tools/icon.svg.mjs`, which reasons from the safe circle
rather than from "the squircle": every launcher mask is LARGER than the safe circle, so fitting
the circle is sufficient for all of them, and the squircle was never the binding limit. A number
defended by a plausible-sounding comment went unexamined for six revisions.

**What ships, measured rather than asserted.** The generator uses **0.94 maskable / 1.17 any**,
and the PNGs in `public/icons/` were decoded and bounding-boxed on 2026-09-11:

| File | Mark span | Of canvas |
|---|---|---|
| `icon-maskable-512.png` | 396 px of 512 | **0.7734** — inside the 0.80 safe circle (409.6 px) with ~6.8 px of margin, white background baked in |
| `icon-512.png` | 492 px of 512 | **0.9609**, transparent |
| `apple-touch-icon.png` | 174 px of 180 | **0.9667**, white background baked in |

Why 0.94 measures as 0.77: the scale multiplies the mark's own 82-unit span (outer radius 41), so
0.94 × 0.82 ≈ 0.77 of the canvas. The two numbers describe the same geometry — stated because
"0.94" beside "0.7734" reads like a contradiction and is not.

**To reverse the colour:** change `IDF_BLUE` in `tools/icon.svg.mjs` and regenerate; nothing else
holds a hex. To reverse the geometry, §20.4 is the authority and would have to change first.

---

## 11. The calendar functions take an explicit time zone `[RULED 2026-09-11: keep the device zone]`

**Where:** `src/core/calendar.ts`.

§13.1 requires the timing function to be tested "with fixed timestamps and an explicit timezone", so
nothing here reads the host's zone. That leaves the app itself needing to supply one.

**Open until the interface is built:** whether the app uses the device's zone or a fixed
`Asia/Karachi`. The device's zone is right for a phone that stays in one country and wrong for a
record that gets read after a move; a fixed zone is the reverse. §10.5's calendar-day boundary and
§10.4's rendered times both depend on the answer, and §18.8 already sends the day-boundary question
to the physician.

**RULED 2026-09-11: the app passes the device's zone.** §10.4's amendment carries the ruling in
full — nothing dose-bearing reads the zone, the execution-measured day-key behaviour across the
2026 transitions, the accepted stale-until-restart cost, and the per-row UTC-offset stamp that was
considered and deferred. Note 21 is the sibling record, ruled the same day. The §18.8 day-boundary
half stays open with the physician, as before.

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

## 16. The 100% mutation score is real, and 19 directives silence 66 mutants by name `[CONFIRM]`

**Where:** `reports/mutation/report.json`, and nineteen `// Stryker disable` comments in `src/core/`.

§13.4 sets `thresholds: { break: 100 }`. The core meets it: **1395 mutants killed and 2 timed out
(a timeout is a detected mutant), 0 survived, 0 uncovered, 66 ignored by directive**, across the
470 tests in the mutation run (`vitest.stryker.config.ts` narrows it to the suites that cover the
mutated files; `npm run check` runs more). Getting there took four passes, and it changed the code
more than it changed the tests — which is the point of the exercise.

**CORRECTED 2026-09-11, on every count it stated.** The heading said "eighteen mutants are
disabled by name" — that was the number of DIRECTIVES, not mutants, and a `disable all` silences
every mutant down to its `restore`, so the directives silence far more than their own count. The
"Where" line said sixteen comments; the body said 1302 killed across 405 tests; and the table
below listed only 14 of the directives, omitting `ids.ts` ×2, `resolve.ts`'s low-reading ternary
arm and its carbs-blank null guard — so a reader auditing "every one" against the source would
have found five comments the table never mentioned. Current figures re-derived from
`reports/mutation/report.json`; the directive count is a grep. Note 65 records the narrowing that
moved the ignored count and added the nineteenth directive.

**A score of 100% with nineteen disables is not the same claim as a score of 100% with none**, so
here is every one, what it is, how many mutants it silences, and why it is disabled rather than
killed. §6.5's own doctrine is that a check which cannot fire is "disabled and declared" rather
than left implying coverage.

| Where | Kind | Mutants | Why it is disabled rather than killed |
|---|---|---|---|
| `resolve.ts` ×2 (bound failure, steps 9 and 10) | Unreachable | 15 | §6.4 states it: given §4.5's hard ranges, `total <= bound` is a **mathematical identity**. `boundUnits` and `exceedsBound` are tested directly, both failing directions included — and note 5's golden case pins the exact-equality corner |
| `resolve.ts` (blocking-band re-check) | Unreachable | 6 | Step 3 returns for every reading below 70, so step 7 cannot produce band C or D. Kept because §3.4 makes them terminal and a future edit to step 3 must not route around it |
| `calendar.ts` (part read) | Unreachable | 6 | `Intl.DateTimeFormat` rejects an unknown zone at construction, and every zone it accepts emits all five parts |
| `parse.ts`, `resolve.ts` (finiteness re-checks) | Unreachable | 11 | §2.3 rule 1 requires finiteness "before range checks **and again** after arithmetic". These are the again |
| `history.ts` ×2, `resolve.ts` (override-candidate) — null guards | **Coercion-equivalent** | 9 | `null >= 250` is `0 >= 250`; `null < timestamp` is `0 < timestamp`; `null >= threshold` is `0 >= threshold` with every threshold at least 10. The guard and the coercion agree on every input — and §4.1's entire subject is that they must not be allowed to |
| `resolve.ts` (carbs-blank null guard, step 5) | Coercion-equivalent | 5 | Blank-and-blank has already returned above, so `bloodSugarValue` is non-null by the time it runs. Written out rather than inferred, because inferring it breaks silently if the earlier return ever moves |
| `resolve.ts` (low-reading ternary arm) | Equivalent | 2 | Forcing the arm yields `undefined`, and `classifyLowBand(undefined)` answers null exactly as the `null` arm does. The four §4.1 states are spelled out anyway; the `=== 'zero'` arm beside it is killable and is no longer silenced (note 65) |
| `history.ts` (tombstone filter) | Coercion-equivalent | 2 | A tombstone carries no `bloodSugar`, and `undefined >= 250` is false, so it cannot qualify either way. Surfaced by note 65's narrowing — it had been riding under a block whose justification was about a different line |
| `baseline.ts` (tombstone filter) | Coercion-equivalent | 1 | A tombstone carries no `carbs`, and `undefined > 0` is false. The type system needs the filter regardless |
| `divergence.ts` (zero branch) | Equivalent | 2 | With a calculated dose of zero the ratio clause reduces to `injected >= 0`, already true past the absolute floor. §7.1 declares the branch anyway |
| `calculate.ts` (`> 0` on suppression) | Equivalent | 2 | `>` and `>=` differ only at a correction of exactly zero, and suppressing zero is arithmetically identical to applying it |
| `decimal.ts` (`exponent < 0`) | Unreachable boundary | 2 | `(1e0).toString()` is `"1"`, never `"1e+0"`, so the exponent is never zero in that branch. **Verified by scanning 200,000 magnitudes plus every extreme** |
| `resolve.ts` (empty advisory array) | Equivalent by design | 1 | Seeding it with a bogus entry changes nothing, because `rankAdvisories` is a **whitelist**. That is the property §10.5 wants |
| `ids.ts` ×2 (version/variant `?? 0`) | Unreachable, shape-invisible | 2 | The array is created three lines above with sixteen elements, so the nullish branch cannot be taken. The mutants (`??` → `&&`) still yield a well-formed v4 UUID — **no SHAPE assertion can see them**. This claim was originally stated as "no test can kill it", which is too strong: each mutant pins random low bits of its byte at a constant zero, so a distributional test over the version/variant bytes would fail both every time (and pass the real code with negligible flake risk). It is not written because the honest cost — a statistical test guarding under two bytes of entropy — buys less than the comment at the line does |

The mutant counts sum to 66 and the rows cover all nineteen directives.

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

## 20. Transient interface state lives outside the reducer `[RULED 2026-09-11: the reducer's charge is the dose — kept outside]`

**Where:** `src/ui/app.ts` (`ViewState` and the shell closure), `src/main.ts`.

§11.2 asks for "one explicit application state, a pure transition function, and a result derived
from a committed snapshot". Not everything goes through it, and the argument for that — none of it
can change a dose, a band or a gate — is only checkable against a complete list. So here is all of
it.

**RULED 2026-09-11.** The purposive reading below is blessed as the governing one: the state
§11.2 protects is the DOSE, which is why transient interface state may live outside the reducer.
That was an interpretation, not a restatement — §11.2's own opening sentence names "settings
drafts, confirmations" among its motivations — so it is recorded as ruled rather than left
implicit. Two loose ends keep their own status: `readingNote`'s inertness is now recorded in
§7.8's amendment as a deferred control, and `screenBefore` (nothing reads it) stays flagged for
Momin below — this ruling does not touch it.

**CORRECTED 2026-09-11.** This note said "nine fields". `ViewState` has FOURTEEN, and `ViewState`
was never the whole story: the shell closure and `main.ts` hold state of exactly the same kind
that the note simply did not count. A "none of these can..." claim over an incomplete enumeration
is unauditable — the same defect §20.5's file listing had twice.

**`ViewState`, fourteen fields:** `draft` (the settings screen as typed — nothing stored until the
explicit save, note 31), `disclaimerChecked`, `moreExpanded`, `meterGuidanceShown`,
`amountProblem` and `amountDiverging` (which §7.1 amount-gate answer is on screen — safe out here
because `commitLog` re-runs the gate on every commit tap, so these decide what renders and can
never bypass the check), `pendingDelete`, `clearConfirming`, `failClosedConfirming`,
`failClosedBlocked`, `readingNote`, `dosingDraft` (§6.7's answer before it is saved),
`decliningDosing`, `screenBefore`.

**The shell closure beside it:** `db`, `stored`, `recovery`, `lastViewKey` (note 49 — the previous
view key has to outlive a render), `showClear`, `showAsText`, `settled`.

**And `main.ts`:** `offered` (the update bar offers once), `pending` and `shown` (the deferred
`beforeinstallprompt`), `sentinel` and `handler` (the hardware-back entry, note 47) — plus the
service-worker wiring's own `hadController`, `lastUpdateCheck`, `looks` and `reloading`, which
bound the update checks and the one §11.4 reload.

**One field crosses into the record, so "none of it can touch the record" would be false.**
`readingNote` rides into the `appendReading` payload as the row's optional §7.8 note. It still
cannot change a dose, a band or a gate — §7.8: a reading is "not an input to anything" — but it is
the one `ViewState` field that becomes PERSISTED data, so the claim this note makes is "cannot
change a dose", deliberately not the stronger one.

**Two of the fourteen are currently inert — flagged for Momin, not tidied.** Nothing ever writes
`readingNote`: the reading screen has no control for §7.8's fixed note list, so the field the row
schema carries is never populated. And nothing reads `screenBefore`. One may be an unbuilt §7.8
affordance and the other a leftover, but those are indistinguishable from the code (§20.1.1), so
neither is settled here.

**And one seam in this arrangement WAS wrong — fixed 2026-09-11.** `stacking_override_taken` used
`invalidate` rather than `invalidateWithAck`, so §4.6's blank-reading acknowledgement survived an
override. Unreachable today by a three-link coincidence — a blank reading yields a correction of
zero, suppression needs a POSITIVE correction, and the override renders only when suppression
happened — and every link is free to move independently, which is exactly the kind of coincidence
§4.1 refuses to lean on. Now `invalidateWithAck`, behaviour-identical today, with the three links
written at the call site.

**The thing §11.2 protects is the dose** — "one event updating the dose while another leaves the
breakdown, the warning or a saved setting stale". None of the state above can change a dose, a band
or a gate. Putting it through the tested reducer would mean every dose test carried a dialog flag.

**To reverse it:** move them into `AppState` and extend `reduce`. The tests would need a `view`
sub-object threaded through them, which is the cost being weighed here.

---

## 21. The time zone is the device's `[RULED 2026-09-11: keep the device zone]`

**Where:** `src/main.ts` — `Intl.DateTimeFormat().resolvedOptions().timeZone`.

§13.1 requires the calendar functions to take an explicit zone, and they do. What the app then passes
is the device's.

**The trade-off, unresolved:** the device's zone is right for a phone that stays in one country and
wrong for a record read after a move — every historical row would silently re-render in the new zone,
including §10.5's calendar-day boundary and §10.4's noon/midnight rendering. A fixed `Asia/Karachi`
is the reverse: right for the record, wrong if he moves.

**Not decidable from the plan**, and §18.8 already sends the neighbouring question — where the
band E day boundary falls — to the physician. Worth deciding at the same time.

**RULED 2026-09-11: keep the device's zone** (this heading used to end "and that is open"; it is
now closed). §10.4's amendment is the full record: what execution measured (day keys monotonic
through both 2026 transitions in `America/New_York` and `America/Santiago`, whose transitions
fall at local midnight; `Australia/Lord_Howe`'s half-hour offset parses; `Asia/Karachi` has no
DST in 2026), the accepted cost (a stale zone until restart, then a silent re-render of history),
and the third option deferred rather than taken (a per-row UTC-offset stamp, which grows §7.1's
stored shape). The day-boundary half was never this note's to settle: it stays with §18.8's
physician question. Cross-reference: note 11, ruled the same day.

---

## 22. What is built, against §17's list — DELETED 2026-09-11, on Momin's ruling `[FYI]`

This was a point-in-time status table — §17's build steps against "Done" rows. A status snapshot
in a permanent document decays into a lie: it went stale the day work continued, carried no tag
inviting a re-check, and its "Done" rows concealed four unwired features — the HI/LO guidance
(notes 2, 38), the blank-inputs rendering (note 51), the block screen's expiry (note 60), and
§7.2's retry and in-session gate (note 61). What is built is what the code and tests say; the
notes that found each gap are the durable record.

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

**MERGED 2026-09-11 into note 35.** This recorded the first half of the move — two controls, while
this note's own text still said "`Back` stays at the top, where a back affordance belongs", which
note 35 reversed a day later. Note 35 records the whole move and now carries this note's two
surviving details (first-step-only rendering, `space-around`). Kept as a numbered stub so
references to "note 28" stay resolvable.

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

**Note 34 is merged here (2026-09-11), because it is this ruling's fourth leg.** Momin's own first
reaction to the prefill was the failure mode: the three values looked settled, so *"I was thinking
it default then why button is not showing up"* — the save was correctly blocked on the empty basal
block (§1.3), and nothing on screen said so. **A prefill that does not announce itself is the
silent default §1.2 refused**, so the first-run screen now opens with a flag — *"Check these three
before you start"* — naming target, ISF and ICR and saying what remains to be filled in. It
carries safety weight, not just clarity: `docs/CLINICAL.md` records the residual risk of
prefilling as someone tapping through without reading, and the flag beside §10.5's acknowledgement
on the target (the value most likely to have moved) is what makes tapping through a **choice**
rather than an accident. Momin identified this himself: making the prefill visible is what closes
the gap the clinical note had to leave open.

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
| Back carried no affordance | `←` + hair space, prepended to the WORD. One character in a face already loaded — no icon font, no SVG, scales with the type, inherits colour. The word stays: an arrow alone is a guess about what the reader knows. [superseded 2026-09-11: the arrow is GONE — note 35; Momin's on-phone verdict was that U+2190's centring cannot be corrected reliably, and the word alone shipped] |
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

**MERGED 2026-09-11 into note 31.** The announcement is the fourth leg of note 31's ruling — the
thing that keeps the prefill from being §1.2's silent default — and splitting it across two notes
hid that. Note 31 carries the content. Kept as a numbered stub so references to "note 34" stay
resolvable.

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

**Note 28 is merged here (2026-09-11)** — it recorded the first half of this move, Settings and
History alone, and still asserted that `Back` belongs at the top, which this note reversed. Its
two surviving details, both Momin's thumb-reach reasoning: the two links render **on the first
step only**, because mid-calculation there is a half-entered reading on screen and an exit beside
the keypad invites losing it; and the row is **`space-around`, not `space-between`**, because
pinned to the two bottom corners these — the two controls that ABANDON a half-entered reading —
become the easiest things to hit while reaching for the keypad above.

## 36. The Android back gesture closed the app `[FYI]`

**MERGED 2026-09-11 into note 47.** This note described the tidy-the-stack `history.back()` branch
as part of the working design; note 47 records that branch as the defect that navigated the app to
`about:blank` while logging a dose, and deleted it. A note presenting a deleted defect as a live
mechanism misleads exactly the reader these notes exist for, so the surviving design lives in note
47 with the deletion beside it. Kept as a numbered stub so references to "note 36" stay
resolvable.

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

[corrected 2026-09-11: the quoted comment no longer exists — note 42 deleted `MAX_ENTRY_DIGITS`
outright, after finding the flat cap this paragraph defends WAS a defect in a way this bug never
exposed: it counted integer and fractional digits together, making the interface narrower than
§4.2's grammar. The one-digit slack — the part that really was right — now lives as
`GRAMMAR_INTEGER_DIGIT_SLACK` and `maxIntegerDigits` in `core/parse.ts`, derived per field. "Was
not changed" was true on this day and reversed four notes later; a reader who stops here would
defend a constant that is gone.]

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

`npm run smoke` drives a served build over the DevTools Protocol and asserts **twenty** things
that only exist in a real browser [corrected 2026-09-11: this said twelve, which was right when
written — counting each width's run separately, as this list does. The back-gesture block (four
checks, note 47's regression) and the insecure-origin run (four checks, note 48) were added
afterwards and the count was not. A run without `SMOKE_LAN_URL` records the skipped
insecure-origin pass as a FAILURE rather than quietly passing on the one origin the phone uses]:

- a first visit loads the document **once** (note 44)
- the worker takes control, and a webfont is actually in use
- at 412px **and** 1440px: the nav and the version line sit inside `.screen`'s box, measured with
  `getBoundingClientRect` and compared to it (note 41)
- the `+`/`−` keys are 68x68 at both widths — **above §10.7's 48px floor**, which is what the 28px
  regression violated
- 120 mg/dL with 25 g gives 2 units, logging it says so, and the screen is not blank (note 44)
- the app is the FIRST history entry as on a phone, reaching the carbohydrate screen pushes exactly
  one entry, and the back gesture returns to the reading screen with the app still loaded (note 47)
- over the insecure origin: `isSecureContext` is genuinely false, `crypto.randomUUID` is genuinely
  absent, the dose still computes — and it still LOGS, which is the defect the run exists for
  (note 48)

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

**It was my own code, from the hardware-back work (note 36, merged below).** That design held one
sentinel history entry while the app had somewhere to go back to, and tidied the entry when
back-ability turned off:

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

**Note 36 is merged here (2026-09-11), because its mechanism section described the deleted branch
as a feature.** What survives of it: Momin asked *"why the android back button do not do back on
my app?"* — in an installed PWA the system back button and the edge swipe leave the app, and
people use the gesture reflexively, so it discarded a half-entered reading. The design is ONE
sentinel history entry, pushed when back-ability turns on; the gesture consumes it and runs
`backAction()`. **§11.5's "Routing: None" is not violated** — `pushState` is called with the
current URL, nothing is written to the URL, there are no deep links and `start_url` is untouched;
what §11.5 rules out is URL STATE, and this is a stack entry with none in it. **§10.6 and §11.3
stay inescapable**: the first run and the fail-closed screen return `null` from `backAction`, so
neither the control nor the gesture offers a way out of them. It sits on the `Host` for the same
reason `now` does — a module that reaches for `window.history` on its own cannot be steered by the
jsdom harness. What note 36 ALSO said — that a spent entry is tidied with a suppressed
`history.back()` so the stack "cannot accumulate dead entries" — is the branch deleted above. The
tidiness it bought was the app leaving the screen while recording an injection.

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
a well-formed v4 UUID, so no assertion about shape can see it. The tally in note 16 was eighteen
when this was written [corrected 2026-09-11: nineteen directives silencing 66 mutants — note 16
carries the full table, and softens the "no assertion" claim to what is actually true].

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
| The app icon looked smaller than its neighbours | [merged 2026-09-11 into note 10, the single icon record. This row's two closing claims — 1.0 as "the largest this geometry allows" and 0.62 as "a constraint, not a preference" — were both wrong, and note 55 dismantled the second; note 10 carries the measured truth] |
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

## 52. Vibration instead of a sound, and where feature detection earns its keep `[CONFIRM]`

**Question for Momin (retagged from `[FYI]` 2026-09-11 — this note records a substitution decided
in code, not a mere fact):** you asked about a sound and the build shipped a vibration instead —
does the substitution stand, or do you want the sound?

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

**MERGED 2026-09-11 into note 10.** This note fixed the `any` icon (0.86 → 1.0 → 1.17, with the
circle-versus-corner reasoning note 10 now carries) while re-asserting that the maskable 0.62 "is
a constraint, not a preference" — the claim note 55 dismantled two notes later. Note 10 is the
single icon record. Kept as a numbered stub so references to "note 53" stay resolvable.

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

**MERGED 2026-09-11 into note 10.** This is the note that found the truth — Android's home screen
uses the maskable icon, so notes 50 and 53 had been enlarging the wrong file, and "0.62 was not a
constraint, it was timidity". Note 10 now carries that finding, the arithmetic, and the measured
spans of the shipped PNGs. Kept as a numbered stub so references to "note 55" stay resolvable.

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
and both buttons fit.

**CORRECTED 2026-09-11.** This note ended by claiming `tools/smoke.mjs` "already asserts the page
never scrolls sideways". It does not — there is no `scrollWidth` or overflow assertion anywhere in
it. What it actually asserts is narrower: that `.foot-nav` and `.foot` sit inside `.screen`'s box,
at 412px and 1440px — a containment check on two NAMED elements, not the general property, and
neither element is the one that overflowed here. The general check — the document's `scrollWidth`
against the viewport at the smallest supported width — does not exist anywhere in the suite. It is
on Momin's list and is deliberately not added here.

## 57. Five rounding modes were selectable and undocumented `[FYI]`

**Momin, reading note 1: "have we explained these meanings in how this works?"** No — nothing in the
app explained any of the five, and `grep` for "round" in `howItWorks` returned nothing.

**§15 quotes the MHRA finding that only 30% of 46 audited apps documented their formula.** The
arithmetic WAS documented; the rounding was not, and rounding is where §5.1 says the modes "are not
neutral peers": `ceil` adds up to a whole unit to every dose, always toward low blood sugar. It is
gated behind an acknowledgement — but the acknowledgement explained the risk without the app ever
explaining what the alternatives were.

**"How this works" now carries all five**, each with what it does, what hardware it suits, and the
consequence. Two lines earn their place:

- for `ceil`, that on a 1-unit correction it **doubles the dose**;
- for `off`, that **a syringe cannot draw 4.37** — it is for reading, not measuring.

**And the settings screen points at it** rather than repeating it: §10.5's budget does not allow five
paragraphs beside the choice. A pointer is not documentation, but it is the difference between a
hidden choice and a findable one.

## 58. Note 1, decided on measurement rather than on the plan's authority `[FYI]`

**Momin: "I am thinking right now what is correct? ... even if we have to change the plan I am good
with that."** The right question, and it turns the note from an appeal to §5.2 into an experiment.

**There are THREE candidate rules, not two.** The note compared the decimal-text route against
`Math.round(v * 100) / 100` and stopped there. A third exists and was never written down:

| | `-1.495` | `1.005` | `-1.125` | `2.675` |
|---|---|---|---|---|
| **A** `Math.round(v*100)/100` | **-1.49** | 1.00 | **-1.12** | 2.68 |
| **B** decimal text *(shipped)* | -1.50 | **1.01** | -1.13 | 2.68 |
| **C** sign-aware scaled | -1.50 | 1.00 | -1.13 | 2.68 |

**CORRECTED 2026-09-11 — the B row above was wrong**, here and in §5.2's copy of the table: it read
`1.005 → 1.00` and `2.675 → 2.67`, while `roundScaledHalfAwayFromZero` gives **1.01** and **2.68**
and the tests have always pinned 1.005 → 1.01. The code and the tests are right; the table was
wrong.

**A is simply wrong**, and not because of floating point: `Math.round` breaks ties toward +∞, so the
same magnitude rounds differently by sign. §2.2 requires half-away-from-zero for every mode.

**B and C are both correct, and they disagree only where a decimal LITERAL looks like a tie while
the SCALED double is not** — `1.005` prints as a tie while `1.005 * 100` is `100.49999999999999`,
so B trusts the printed digits (1.01) and C trusts the value (1.00). At `2.675` they agree: the
literal is really 2.67499999..., but `2.675 * 100` lands exactly on `267.5`, and both rules see the
same tie.

**The measurement that settles it** — corrections and meal doses across five different
prescriptions, INTEGER blood sugars 20-600 and INTEGER carbohydrates 0-300:

```
values checked : 2,623,215
disagreements  : 0
```

**On that integer grid B and C never differ.** [CORRECTED 2026-09-11: this block originally
headlined "every value this app can reach", which is false — over the full admissible ranges the
two rules disagree thousands of times, and ordinary prescriptions do land on third-decimal ties
(ISF 40, target 150, reading 173 → correction exactly 0.575: B 0.58, C 0.57). Where they differ B
is the closer match to exact rational arithmetic: 0 deviations against C's 8,486 across the
14,917,756 integer-reading corrections the hard ranges admit. See §5.2 for the full corrected
measurement.] The 572-value disagreement the note records is over synthetic three-decimal values:
see note 1 and `test/decimal.test.ts`.

**So the ruling holds, and B stays** — it is shipped, it is tested, it agrees with §5.2's corrected
table, and where the rules part it is the one that matches the arithmetic on paper. What changes is
the JUSTIFICATION: not "the plan says so" but "A is wrong, and B is the one already verified and
the stricter match to exact arithmetic."

## 59. The prompts pushed the page down, and were two copies of one component `[CONFIRM]`

**Question for Momin (retagged from `[FYI]` 2026-09-11 — the dismissal-scope paragraph below
reads like a live conversation, not a settled fact):** is the update-bar dismissal's scope — in
memory only, gone for this session, back on the next launch — the scope you want?

**Momin, on the update bar: "it shoves the whole page down instead of overlaying — this is my
problem."** Correct, and the same defect existed twice: the update offer and the install offer were
separate copies of the same markup.

**The cause was one line.** `document.body.prepend(bar)` puts the bar in normal flow, so it displaces
everything below it. A prompt is an interruption; it should sit OVER the page rather than rearrange
it.

**Now one `promptBar` component, fixed to the FOOT.** Same argument that moved Settings and History
there: the top of a one-handed phone is the hardest place to reach, and this is a control the user is
being asked to act on.

**The part that needed thought: a fixed bottom bar covers the primary action.** "Work out the dose"
and "Log this injection" live at the bottom of their screens, and those are the controls it must
never hide. So the bar publishes its own height as `--prompt-h` and `#app` pads by it while a prompt
is up. **Overlaying the PAGE is fine; overlaying that BUTTON is not.** Measured at 412px:

| | screen top | "Next" bottom | prompt top | covered |
|---|---|---|---|---|
| no prompt | 0 | 650 | — | — |
| prompt up | **0** | **650** | 727 | **false** |

The page does not move, and nothing is hidden.

**"Use it now" was styled `go quiet`** — a secondary button for the only action on the bar. It is the
primary now.

**And the update offer gained a dismiss, which the install offer already had.** Momin asked whether
to allow one at all. The argument against is that dismissing means knowingly running an older build;
the argument for is that a bar you cannot clear is a nag, and it can appear mid-calculation.

**Resolved by scope: the dismissal is IN MEMORY and nothing else.** Gone for this session, back on the
next launch. Persisting it would let one tap suppress a version's prompt forever — the
"acknowledgement dropped, value kept" state §7.9 refuses elsewhere. And it costs nothing, because the
waiting worker activates on the next full restart anyway: dismissing defers the tap, not the update.

**Why not `window.confirm`, which is what the blog uses.** Momin noticed `mominbinshahid.github.io`
shows a native confirm box and asked whether that was the default. It is not — `gatsby-plugin-offline`
supplies no UI at all, it only fires an `onServiceWorkerUpdateReady` hook, and the box is his own
handler copied from Gatsby's docs. **A `confirm()` is a MODAL: it blocks the entire page and takes
focus until answered.** On a blog that is fine. Here it could land while a dose is on screen, which
is the exact interruption §11.4 chose a prompt over a silent reload to avoid.

## 60. The block screen was the only step that ignored expiry `[CONFIRM]`

**Question for Momin (retagged from `[FYI]` 2026-09-11 — the tail below leaves a live
alternative, explicitly labelled arguable, under a tag that means "no question"):** should
`overrideScreen` also honour §8.2's expiry, or is the notice on the result screen it is reached
from enough?

**Found by a question, not by a test.** Ruling on note 6 I argued that a bad carbohydrate value
survives the interruption of treating a low. Momin asked: *"but fifteen minutes later won't it reset
the values?"*

It does not — §8.2's expiry sets one flag and clears nothing:

```
right away : step=blocked expired=false
+20 minutes: step=blocked expired=true
inputs kept: {"bloodSugar":"65","carbs":"999"}
```

**But checking that turned up something worse.** Only `resultScreen` read `expired`:

```
resultScreen         5 references
blocked()            0
overrideScreen       0
amountScreen         0
loggedScreen         0
recordReadingScreen  0
```

So after twenty minutes the state said `expired: true` and **the block screen showed exactly what it
had shown at minute zero** — the original `65`, and "check again in 15 minutes", indefinitely.

**This is the screen where it matters most.** §8.2 exists to stop a stale reading driving a decision,
and this screen's own instruction is time-bound: it tells the user to recheck in fifteen minutes and
then keeps presenting the number they were told to replace. **A stale dose is dangerous; a stale "do
not inject" keeps someone from eating after they have already recovered.** §8.2 says expiry "applies
on resume, on visibility change, and on a timer" — it never scoped itself to the result screen.

**The wording is deliberately different from the result screen's.** There, what went stale is an
ANSWER: "this result is from 7:10 PM". On a block there is no answer — what went stale is the
READING. So: *"That reading was at 7:10 PM. Check your blood sugar again before deciding anything —
if you have treated, it will have changed."*

**And the block does not go away.** Being low is still the likeliest reading of an old low, so §3.3's
suppression of every insulin number still holds. The test asserts both halves: the staleness line
appears AND "Treat this first. Do not inject." is still there with no dose anywhere.

**The other four screens were left alone**, deliberately. `amount` and `logged` are recording an
injection that already happened, and `recordReading` is saving a number the user is looking at — none
of them is a decision resting on a reading being current. Only `overrideScreen` is arguable, and it
is reached from a result screen that already carries the notice.

## 61. §7.2's pending-save promise was two lies and a dead function `[FYI]`

**Where:** `src/state/machine.ts`, `src/ui/app.ts`, `src/ui/copy.ts`, `src/main.ts`.

`COPY.log.pending` read *"Couldn't save this yet — retrying. This dose is still counted while the
app stays open."* — §7.2's own specified wording, and both halves were false in the build.

**Nothing retried.** `log_save_failed` was dispatched once from the commit path and no code ever
re-attempted the write, so `save.attempts` — a counter the reducer dutifully maintained — could
never exceed 1. §7.2 says the pending-save state comes *"with retry"*; the state existed, the
retry did not.

**And the dose was not counted.** `buildSnapshot` took `lastDose` from `state.record`, which the
shell derives from stored rows alone (`contextFrom` in `src/ui/app.ts`) — so a failed write was
invisible to §7.4's gate, and the next calculation inside the suppress window re-applied the full
correction on top of insulin already acting. That is the stacking event §7.4 exists to prevent,
reached through a reassurance. `inSessionLastDose` (`src/state/machine.ts`) was written for
exactly this and had ZERO call sites; the test beside it proved the function computed, which is
not the same as proving the gate read it.

**Three fixes shipped, and the middle one is the interesting one.**

1. **`gateLastDose`** now feeds `buildSnapshot`. It is guarded on `save.kind === 'pending'` —
   because `committing` deliberately survives a successful save (§7.2 freezes the payload so a
   retry persists THAT, never a re-read draft), its mere presence cannot be the signal: once
   saved, the record carries the row and reading both would double-count. And it takes the NEWER
   of the pending and recorded dose, because an imported row can post-date a failed local write
   and the gate's question is "what is the most recent insulin", not "what did this session do".

2. **`invalidate` was clearing `committing` and `save`**, so `new_calculation` wiped the pending
   dose at precisely the moment the gate needed it — the wiring in fix 1 alone did nothing until
   this was found. The clearing was justified by its comment as *"the logging draft belongs to a
   result that no longer exists"*, which is true of `injectedDraft` and false of `committing`:
   that is a frozen record of insulin that is in him. Same shape as the `tick` defect in the
   sibling batch (§11.2's corrected passage): an invalidation clearing something that must outlive
   the result.

3. **Retry, escalating.** Attempt 1 fails and the flag appears on the logged screen, where he is
   standing — from the FIRST failure, so closing the app inside the retry window never hides a
   dose that is not in his record. Attempt 2 runs immediately and silently, because most write
   failures here are transient — lock contention, quota pressure, a backgrounded tab — and a
   recovery he never had to notice is the best outcome. Only if that also fails does a prompt bar
   appear, via the new `Host.onSaveStuck`, naming the amount rather than "this dose": because
   `committing` now outlives the logged step, the bar follows him across screens, and by the time
   he sees it he may be two screens from the dose it names. `save.attempts` finally counts
   something.

**The copy was corrected twice in one day, deliberately.** First to stop claiming anything —
"retrying" with no retry, and "counted" with no gate input, are not wordings but false safety
claims on the screen where he decides whether to inject again. Then, once `gateLastDose` genuinely
read the dose, "it counts" became true and is said again, bounded to the session:

> Couldn't save this dose. It still counts toward your next calculation while the app is open, but
> closing the app will lose it — write it down. Within 4 hours that matters: a correction could
> stack.

The test (`test/machine.test.ts`) asserts the ABSENCE of "retry"/"retrying" rather than the
presence of a sentence — so the wording stays free while the claim the app cannot make stays out.

**One flag for Momin, not settled here:** §7.2's own text still specifies the old wording, twice
(*"Couldn't save this yet. Retrying."*, and the failure bullet quoted above). The shipped copy now
deliberately deviates from live plan text, and §20.3's one-edit rule wants the plan sentence
changed and the retired phrase pinned in `check-plan.py` in the same edit. That is a PLAN.md
change and is not made from here.

**RESOLVED 2026-09-11, in part:** §7.2 is corrected in both places — it now quotes the shipped
copy and states the real behaviour (one silent automatic retry, then the prompt bar). The
`check-plan.py` RETIRED pin was deliberately not added in the same pass (that file was out of the
pass's scope), so the pin — and `design/step-flow.html`'s surviving "Couldn't save this yet" —
stay on Momin's list.

**Tests, each watched failing against the unfixed code before it was trusted (note 25's rule):**
`test/machine.test.ts` — the gate reads the pending dose (a 330 reading two hours after an unsaved
11-unit dose resolves `meal_only_suppressed`, not a full correction), a SAVED write leaves the
record to speak so nothing double-counts, and the copy assertions above. `test/integration.test.ts`
— three cases through a wrapped `IDBFactory` whose first n `readwrite` transactions touching the
log store throw: a transient failure recovers on the automatic retry with nothing asked of him; a
persistent one escalates to a bar naming "11 units"; and the bar's retry writes the FROZEN payload
once the disk comes back.

**To reverse it:** §7.2 would have to stop saying "with retry" and stop decoupling consumed state
from persistence — both of which it argues for at length — and §7.4's gate would have to accept
going blind on a dose the app itself just told him still counts.

## 62. A reading was clearing suspect provenance, which §7.8 forbids `[RULED 2026-09-11: fixed, residual accepted — no confirm needed]`

**Where:** `src/storage/repo.ts`, `src/storage/schema.ts`, `src/core/history.ts`, `src/ui/app.ts`.

`appendReading` stamped `lastLocalWriteAtMs` — the second conjunct of note 7's `justImported`,
which feeds `historyProvenance`, a §11.2 snapshot field whose only consumer is §7.5's *"No recent
dose recorded"* caveat. So wherever `justImported` was the only thing keeping provenance suspect,
recording a blood sugar flipped it to trusted — on an install that had never once watched him
inject — and the caveat went quiet. §7.8 forbids exactly this, in as many words:

> **Not an input to anything.** Readings are absent from §11.2's dosing snapshot, from §6.5's
> carbohydrate baseline, and from §7.4's stacking gate — a reading is not an injection.

A reading clearing `justImported` made it an input to a snapshot field. And the commonest reading
is the one §7.8 has the app OFFER after a band C/D block — a session in which dosing is
structurally impossible — so the rows buying the trust were precisely the ones least entitled to.

**How the stamp got there.** §4.3 step 1 and §11.2 rule that a readings write bumps the SAME
`logRevision` rather than a second counter, so `appendReading` shares `bumpLogRevision` with
`appendInjection` — and the stamp rode along in the shared call's patch. The bump stays; only the
stamp goes. `appendReading` also lost its now-unused `nowMs` parameter — the row carries its own
timestamp, and a parameter whose only job was feeding a stamp that must not happen is an
invitation to put the stamp back.

**The rename, and why the name mattered.** The domain field is now **`lastLocalInjectionAtMs`**
(`HistoryContext`, `StoredState`, the `app.ts` mapping), while the PERSISTED key stays
`lastLocalWriteAtMs` in `LogRevisionRow`, translated at `readAll` — no migration for a cosmetic
gain. The old name described a MECHANISM (any local write) while its one consumer needed a MEANING
(this install has watched an injection), and that mismatch is what invited the wrong write site:
to someone reading `appendReading`, stamping "last local write" there looked correct. Note 3's
`lastDose.units` → `injectedHundredths` rename is the in-repo precedent for the same failure
class — a name answering the wrong question recruits correct-looking code.

**The residual is real, and it is left, deliberately.** A deployed install that both imported and
then recorded a reading holds a stamp that will go on reading as trusted, and it CANNOT be
re-derived — log rows carry no origin marker, so an imported row and a local one are
indistinguishable after the fact. Nulling the stamp on upgrade was rejected: it would also wipe
legitimate injection stamps, flipping every install that ever imported back to suspect until its
next injection — a larger population over-warned to cure a smaller one under-warned, both
self-healing on the same event, at the cost of the app's first data migration. The affected
population today is plausibly zero. **To reverse:** a one-time migration nulling
`lastLocalWriteAtMs` wherever `lastImportAtMs` is set, accepting the over-warning.

**The missing pin that let it ship:** both tests that pinned the stamp used `appendInjection`, so
they passed either way. The new one (`test/export.test.ts`, *"§7.8 — a READING bumps the revision
but never clears suspect provenance"*) asserts both halves, and was verified failing against the
old behaviour.

## 63. §11.8's lint rules had two holes, found by probing rather than reading `[FYI]`

**Where:** `eslint.config.js`.

**`const B = .5` escaped BOTH rules.** The second rule's selector was `Literal[raw=/^[0-9]/]`,
which misses a raw literal beginning with a dot — `.5` is a legal numeric literal — while
`no-magic-numbers` permits any literal in a const initialiser, which is the first rule's known gap
the second rule exists to close (note 8). A number could therefore leave `config.ts` so long as it
was written with a bare leading dot. Fixed: `raw=/^[0-9.]/`.

**And `-100` escaped.** The exemptions sit on the `Literal` node, and a unary minus is a separate
node above it — so the literal inside `-100` read as the exempt `100` and passed. §11.8 lists `-1`
SEPARATELY from `1` in its exemption set ("0, 1, -1 and 100"), which is the plan treating signs as
distinct values: `-100` was never exempt, and the selector was reading it as though it were. Fixed
with a second selector: `UnaryExpression[operator="-"] > Literal[value=100]`.

Both holes were shown open by probe before the fix and shown closed after it; `-1`, `100` and `0`
remain correctly exempt, and the tree still lints clean. The general point, which is note 8's one
level up: **a lint rule's holes are invisible to reading it** — the original selector read as
airtight — **and show up only when adversarial input is run through it.** That is how note 8 found
the first rule's laundering gap, and it is the only way either of these would have been found.

## 64. Dead code the audits surfaced, and what each one's deadness meant `[FYI]`

Deleted, each verified as having no consumer beyond its own declaration:

| What | Where | What its deadness meant |
|---|---|---|
| `clearNeedsStackingLine` | `src/ui/app.ts` | A dead DUPLICATE: §7.9's stacking line is implemented INLINE in `clearScreen`, so this was one comment away from being mistaken for the wire — note 38's class ("a note asserting that something is wired is not a wire"), one step earlier in the pipeline |
| `bar()` | `src/ui/components.ts` | Orphaned by note 41's stepper rebuild |
| `STORES_IN_THIS_BUILD` | `src/storage/open.ts` | An exported store enumeration nothing imported. The live enumeration is `schema.ts`'s `ALL_STORES`, DERIVED from the `STORE` table — and §7.9's own delete-path comment condemns exactly this shape: "a hand-enumerated store list rots on the edit that changes it, silently and in the unsafe direction" |
| `COPY.range.bloodSugarAbove`, `COPY.range.carbsAbove` | `src/ui/copy.ts` | Superseded by `entryRange` |
| `looksLikeAPossibleLow` + its test block | `src/core/bands.ts`, `test/bands.test.ts` | Production never called it; `classifyLowBand(value) !== null` answers the same question from the path that actually runs. Its tests were green and proved nothing about the live path — tests agreeing with a dead wire |

Also removed: a second `NETWORK_TIMEOUT_MS` in `src/config.ts` that nothing imported, duplicating
the live one in `src/sw.ts` — a dead second definition in the one file whose whole premise is
being the single source, free to drift from the value actually running. `config.ts` keeps a
pointer comment so the absence does not read as removal, and `sw.ts` now documents why its literal
is allowed to live there: the worker compiles in its own TypeScript project against the WebWorker
lib and cannot import the app's module graph — the structural reason `eslint.config.js` exempts it
from §11.8's literal rule.

**Flag for Momin, not acted on:** that `sw.ts` exemption is now recorded in `eslint.config.js` and
in `sw.ts` itself — and NOT in §11.8, which presents its rule as exceptionless. An enforcement
carve-out that lives only in the enforcement's own config is the "decided and not written down"
state §20.5 condemns, in the one section whose premise is that every number has a declared home.
Whether §11.8 gains the exemption or the worker loses it is a plan edit, not made from here.

**RESOLVED 2026-09-11:** §11.8 gained the exemption, with its structural reason, alongside note
9's arithmetic-identities ruling — Momin ruled both; the plan edit is made.

## 65. The Stryker disables were narrowed, and it bought real coverage `[FYI]`

**Where:** `src/core/history.ts`, `src/core/resolve.ts`; counts from
`reports/mutation/report.json`.

Block `disable all` regions were silencing whole expressions under justifications that covered one
clause each. The four whose reason was narrower than their scope were rewritten as
`disable next-line <specific mutators>` — two in `history.ts` (the band-E qualifying expression,
which one block silenced 31 mutants of, and `justImported`) and two in `resolve.ts` (the
low-reading ternary arm and the override-candidate null guard). The run moved:

```
Ignored   100 -> 66      Killed  1,366 -> 1,395      Survived  0 throughout
```

The right side is the run recorded in `reports/mutation/report.json` (which also has 2 timeouts —
a timeout is a detected mutant); the left is the pre-narrowing run. The same batch's dead-code
deletion (note 64's `looksLikeAPossibleLow`) moved the total mutant count slightly as well, so the
killed delta is not pure reclassification — but the ignored column is: 34 mutants that were
silenced on someone else's justification are now mutants the suite demonstrably detects, among
them the `row.id !== excludeId` mutant that §13.3's "the breakfast 280 renders compact for itself"
case exists to kill.

**Two findings worth the note.**

**First, narrowing `history.ts`'s band-E block exposed a genuinely unexamined mutant** —
`rows.filter(isInjection)` → `rows` — riding under a block whose stated reason was the null check
three lines down. It turned out equivalent for an ENTIRELY DIFFERENT reason than the block
claimed: a tombstone carries no `bloodSugar`, and `undefined >= 250` is false, so a tombstone
cannot qualify with or without the filter — the same equivalence as `baseline.ts`'s tombstone
filter. It now carries its own disable, with its own reason, at its own line (note 16's
nineteenth directive). That is the argument against block disables in one example: one
justification was covering several unrelated mutants, and a real gap would hide the same way —
this one was merely lucky. Re-enabling each narrowed region proved every neighbouring mutant dies,
so nothing else was hiding.

**Second, not every block disable was wrong.** `resolve.ts`'s three unreachable-statement blocks —
the step-7 blocking-band re-check and the two §6.4 bound checks — wrap statements no input can
execute, so a block-wide disable with a block-wide reason is exactly right there, and they were
left alone (as was `calendar.ts`'s part-read block, the same class). The distinction worth
keeping: **a disable's scope must match its reason's scope.**
