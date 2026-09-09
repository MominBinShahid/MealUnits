# Project MealUnits — Implementation Plan

**Version:** 25 (revised 2026-09-06 after twenty-two adversarial review rounds)
**Status:** Specification complete. Not approved. No code written.
**Round 20: [R1] returned fourteen findings and did not certify clean.** [R2] has been unavailable
for two rounds (external limit), so rounds 19 and 20 were single-reviewer and are recorded as such.
**No clinical-arithmetic error was found anywhere in seven files** — but seven checker escapes were,
five of them inside v20's own flagship completeness fix.

**§19 held for a seventeenth consecutive revision.** v20 declared §11.8's constants checked "in both
directions" while the pattern matched only `export const NAME = <digits>;` — so negating
`BAND_B_CORRECTION_UNITS`, narrowing `EAT_DELAY_MINUTES` from `[20, 30]` to `[5, 10]`, and adding a
brand-new negative constant all passed clean. Non-numeric values were invisible to the check written
to catch exactly them.

**The blind spot v20 closed, re-opened one directory down.** v20 deleted `NEXT-STEPS.md` because an
unswept file accumulates stale spec — then discovered only `.html` below the root, so `design/notes.md`
and `design/helper.py` were invisible to everything. **Discovery is now by suffix, not by suffix and
depth**, and `live_files()` is wholly discovered: the last hand-maintained input list is gone.

**Two mockups specified weaker copy than the plan requires.** §10.3 demands a suppressed correction be
*shown, struck through, with its reason*; step-flow rendered it as a bare dash, which makes the
remaining lines visibly fail to reach the total. §7.4.1 demands the stacking consequence in his own
units as a ceiling — *"at most about 180 mg/dL, likely less this far in"* — and the override screen
gave none. Both are now machine-checked, along with a rule that a struck component is excluded from
the sum but its markup still verified.

**§10.4's daily case had no screen.** The section names a lunch dose at noon as the reason the
noon/midnight rule exists, and no mockup rendered one. The history screen now shows **12:00 noon** and
an overnight **12:00 midnight**, and any design rendering "12:00 PM", "12:00 AM" or a 24-hour time
fails the dispatch.

**v21 adds §7.7.1, a second export.** Until now the record existed in exactly one format, readable
by exactly one program — this app's own import — while §11.7 simultaneously accepts that the export
*is* the record's survival path. A survival path only one program can read is not one. There are now
two exports named by what the person is trying to do: **move to another phone** (the JSON, the only
restorable file, the only one the backup counter counts) and **save the record** (a self-contained
HTML file, readable anywhere, printable to PDF through the browser, explicitly not a backup). The
readable file is **grouped by prescription period rather than sorted by date**, which carries §7.7's
attribution rule into the rendering: a flat table would print every historical row under today's
ratios, the exact false claim v9 was corrected to remove.

**v21 adds §7.9, the data-clearing controls.** Momin asked for them and the plan turned out to
already assume them: a §13.3 test case for "a full app reset", a §11.7 scope constraint on one, and a
§10.7 placement rule for one — **a shipped test for a feature with no specification**. The controls
are also not optional: on an installed PWA, uninstalling without accepting "also clear data" leaves
the IndexedDB intact, and accepting it is origin-wide and takes the blog with it (§11.7). Only code
inside the app can filter by scope.

**v25 closes the last open decision: the interface is Step** (§18.14). `design/step-flow.html`'s
44 screens are the build reference. The author recommended a Card/Step hybrid and was overruled;
both the argument and the accepted trade-off are recorded rather than dropped, because §19's first
principle is that the user holds facts a reviewer does not — in this case, what his brother will
actually open three times a day. **The one structural consequence is named up front: Step adds a
wizard state on top of §11.2's reducer**, and that is §17 step 5 work, not a discovery.

**Round 22 was a narrow verification of v23's diff, and its verdict on this repository's tooling was
worse than round 21's.** [R1] seeded 21 fresh mutations and **all 21 escaped**; [R2] seeded 50 and
**38 escaped**. Both confirmed that the three specific holes round 21 reported are genuinely closed
and stay closed — and both established that **the class was not.**

**v23's header claimed the class was closed structurally. That claim was false and is withdrawn.**
What v23 actually did was fix the seven examples it had been shown and generalise from them, which
is the same error as the pin-the-prose habit it replaced, in a new register. The patterns stopped at
the `.md` boundary, so every numeral in the three design files was unguarded — the ketone threshold,
the band D boundary, §7.4.1's ceiling, the eat-by window. They knew band C's shape and not band A's
one row above it. Bolding a field label removed the coverage.

**And the check v23 wrote to catch an unproducible dose accepted one.** `_allowed_doses` listed
floor-half *and* ceil-half as though `half` were a range; it is one mode and rounds to the nearest
half. For 194 mg/dL and 45 g it admitted 5.5 against an exact 5.9667 [R2]. **A recomputation is only
safer than a pin when the recomputation is right**, which is now written into the function.

v24 widens the patterns to every live file and every shape the reviewers found, corrects the oracle,
pins the fifth line of the dose algorithm (v23 pinned four of five and reported the algorithm
protected), and makes a worked example the check **cannot parse** a finding rather than a silence.
It also stops pinning headings: [R1] inverted six v23 rules one line under their own pins. The
checker now runs **twenty-two checks** and holds **101** seeded mutations, all caught.

**Three findings above the round's bar, all in v23's own work.** §13.3 still shipped v22's clearing
case asserting that the "result-scoped" acknowledgements are dropped, eight bullets from v23's new
case asserting that none are — **two shipped tests commanding opposite gate behaviour for one
action**, and a test author follows the one listed first. The tombstone §7.3 specified could not be
exported: §7.7's envelope required `settingsRevision` on every log row and import remapped it on
every row, so the restore path had an unspecified branch. And the post-commit edit control was still
on the Logged screen — **v23 rewrote the paragraph above it and left the button.**

**Round 21 ran with both reviewers for the first time since round 18, and neither certified clean.**
[R2] returned seven findings above the round's bar, [R1] one, and between them thirty-one below it.
**No clinical-arithmetic error was found anywhere in seven files** — [R1] re-derived every worked dose
in the document and every dose in the mockups independently. The bar was changed for this round, on
the owner's decision: not *"no findings at any severity"*, which twenty rounds had shown to be
self-perpetuating, but **"does anything left change a dose, a gate, or a stored shape."**

**The round's most important finding is about this repository's own tooling, and it invalidates a
claim v22 made repeatedly.** Both reviewers, independently and by different routes, established that
the pin set protected **explanatory prose** and left the **operative rules** bare. [R1] executed three
mutations that a reader would call unthinkable — clamping the correction instead of the total
(§2.1's named defect), inverting §7.4's suppression direction (the round-2 CRITICAL, reverted
verbatim), and moving band C from 54/70 to 44/60 — and **all three printed `clean`.** [R2] escaped 17
of 19 seeded mutations the same way. **The five-line dose algorithm had no pin at all**, and neither
did the band table or §4.5's range table that an implementer actually reads; §11.8's declarations
were pinned in both directions while every prose restatement of the same numbers was unguarded.

v23 stops pinning sentences. Three new checks **recompute the document's own numbers**: §2's worked
examples are recalculated from their own inputs, every prose restatement of a §11.8 constant or range
is compared against the declaration, and **every mock history row is recomputed from the reading and
carbohydrate figure it prints beside itself**. All seven of [R1]'s escapes and the checker half of
[R2]'s are now caught, seeded permanently, and executed by `--self-test`.

**v22 was a self-review pass over v21's own new material, and it found thirteen defects there — four of
them blocking.** No reviewer has seen v21; this was run before dispatch on the explicit reasoning that
§19's pattern makes the newest 156 lines the likeliest place for the next round's findings, and that
paying a review round to learn what a careful read would surface is the wrong way round. Four passes
were run, and **each of the last four found something every pass before it had read straight past** —
including the two that are arguably the worst of the thirteen.

**The blocking one is §7.9's fail-closed escape, which could not run.** v21 correctly identified that
a build meeting a schema from the future is bricked with no way out, and named "start over" as the
escape — then specified that control as *clearing six stores*. §11.3 states the fail-closed state's
defining property one section away: **a failed downgrade yields no connection.** A store clear needs a
transaction, a transaction needs a connection, and the absence of one is what the state *is*. The
escape ran only when it was not needed. It is now `deleteDatabase` on **both** paths — it takes no
version and needs no connection, and using it for the ordinary reset too retires a hand-enumerated
list of six stores that would have rotted, silently and unsafely, on the day a seventh was added.
The escape lives on the fail-closed screen rather than behind the calculator that refused, and
carries the `blocked` handler that call requires. The screen shows his settings from the recovery
block **before** offering it, because after the delete that block is gone too and no export is
possible without a connection.

**The second blocking one: §7.9 dropped `acks` as though it were one thing.** §11.3 puts three
unrelated kinds in that store, and *"clear the record"* would have taken §10.6's blocking disclaimer
with the log — putting the first-run disclosure gate in front of a man who asked to delete some test
entries, in flat contradiction of the same table's *"the app is immediately usable"*. The
result-scoped rows go with the record; the disclaimer dies only with "start over", where re-showing
it is the point.

**And §7.7.1 grouped readings by a revision they do not carry.** §7.8's row is `id`, `timestamp`,
`bloodSugar`, `note` — deliberately, since no settings produce a reading — while v21's worked example
printed a reading count inside every prescription group. Doses are placed by their stamp; readings by
their timestamp falling inside the period. **Not** by giving readings a revision, which would
manufacture §7.7's attribution claim on a row nothing produced.

**The fourth blocking one came from the third pass, and it is the one that should not have taken
three.** §7.3 requires a confirmation stating the stacking consequence before deleting **one** row
inside the window — and v21 wrote a control that deletes all 67 without one. Delete-one was guarded;
delete-everything was the unguarded door beside it, which is §4.6's *users learn the escape route*
argument arriving from the direction nobody was watching. Both confirmations now carry the line.

**And the fourth pass found the injection surface v22 itself had just created.** Choosing HTML for
the readable file means rendering §6.7's dosing note and §1.3's `basalName` — the app's only two
free-text values — into markup, in the one file whose entire purpose is that it forwards to other
people. Everything rendered is escaped and the file carries no script.

**The fifth pass found a data control with a code side-effect.** v21 had both operations clearing
"this app's owned caches and its own registration" — deleting the app's *code* to reset the user's
*data*, which advances nothing and can leave the app unopenable until the next online load, on a
phone that may not be online. Neither operation now touches a cache or a registration. §11.7's
origin-wide constraint does not weaken; it moves to §11.4's cleanup-on-activation, where an
unfiltered sweep actually happens, and §13.3's blog-preservation case moves with it. **That case was
written in v15 against a feature nobody had specified yet** — this section's own opening complaint,
arriving one revision later as an inheritance.

The remaining seven: the backup counter got a rule about what it may count and no field to count into
(**§6.7's v17 defect exactly, four revisions later**); *"[ Export first ]"* named neither export in
the revision that split export in two; the prompt reported the freshness of a *"backup"* no button
anywhere offered to make; the clearing paths never bumped `logRevision`, so another tab would keep
rendering a result citing an injection that no longer exists; §6.7's *"asked at export"* was left
pointing at two exports and neither; and "start over" enumerated its six stores by hand, which
**rots unsafely on the day a seventh is added** — a reset that quietly does not reset. That last one
is why the escape mechanism is now `deleteDatabase` on both paths rather than only the bricked one.

**Both v21 features also arrived with no §13.3 cases and no §17 build-order slot** — §17's own
standing checklist, unrun. Both are now placed, and §17 records which of its five legs genuinely do
not apply rather than leaving them looking skipped. **§13.3 is where the fail-closed defect would
have surfaced without a reviewer**: you cannot write *"assert the six-store clear runs"* against a
state defined by having no connection.

**§19 therefore holds for an eighteenth consecutive revision**, and this time without a reviewer to
report it: every one of the thirteen lives inside v21's fixes, and v21 ran clean through nineteen
checks and thirty-seven mutations while carrying all of them. **A clean checker run is evidence about
the rules the checker holds, and about nothing else** — which is the argument for writing the new
rules down as pins rather than as prose — **and rounds 21 and 22 then showed that pinning prose, and
then recomputing through patterns chosen from examples, were the same mistake twice.** v22's header claimed nineteen checks and fifty-eight mutations against a
file that ran eighteen and held fifty-nine; both reviewers caught the discrepancy, which is the
claim-about-own-contents class §19 names, committed inside the anti-rot tool itself.

**The escape detector fired three times during v23**, on mutations whose anchors its own edits had
moved. [R2] predicted exactly this in the round-21 brief — *"v22 added 21 mutations and 30-odd pins in
one revision, which is the condition under which a pin gets written against text that later moves"* —
and it was right, one revision later, in the revision written to answer it.

**v21 also retires the snapshot archive.** `PLAN-v1-superseded.md` through `PLAN-v19-superseded.md`
were deleted on Momin's instruction once the plan was final (§20.5). The self-test grew to
thirty-one seeded mutations and caught three regressions introduced during v21 itself, including one
where a refactor silently lost cross-file drift coverage.

**v17 made four substantive changes, three of them from the user.**

1. **§6.7 is cut entirely.** The `usualDose` setting is gone — no onboarding question, no settings
   row, no range, no constant. Replaced by one optional free-text question asked **at export**,
   stored as dated patient-reported history. Both reviewers, asked in isolation and without this
   document, independently said cut it; [R2]'s export placement and free-text form were adopted
   over [R1]'s settings-adjacent version. v18 gave it a store and three states; v19 settled the
   five transitions around them (§6.7).
2. **The target ceiling drops 300 → 200** (§4.5). 300 had no clinical basis and was picked as
   "generously permissive". ADA puts the preprandial goal at 80–130 for Type 1 and allows less
   stringent targets for hypoglycaemia unawareness; 200 accepts a genuine one and rejects a typo.
3. **Times are 12-hour with AM/PM** (§10.4), with the ambiguity that creates handled explicitly.
4. **The designs-follow-the-plan ground rule** is recorded in §20.3.

Plus round 16's seven checker-precision items, each re-verified by seeded mutation rather than by
reading.

**BOTH REVIEWERS CONFIRMED v15** — the third time both have passed. v16 clears their combined
non-blocking list: four checker repairs that still certified nothing (each now re-verified by
seeded mutation rather than by reading), two live by-number pointers into `BACKLOG.md` — one
already rotted onto the wrong entry — a candidate count contradicting the file it cited, and
§11.6/§20.2 still prescribing the two step-0 instructions `BLOG-FIX.md` had withdrawn.

**Round 14 split:** [R1] CONFIRMED with nine non-blocking items; [R2] BLOCKED on step 0 — the
blog-worker fix targeted one route when the plugin registers four, and the second one matches
`.js` and `.css` again, so the fix could have "worked" while the app stayed intercepted. That is
corrected in `BLOG-FIX.md` with the full route table. **[R1] also mutation-tested `check-plan.py`
and proved three of its checks certified nothing** — including the flagship, which reported zero
findings against the very document state whose leftover caused round 13. All rebuilt around
occurrence counts; the fix is verified against that same state.

**Review standing: BOTH REVIEWERS CONFIRMED v13** — the second time both have passed, after v10.
Rounds 11 and 12 each returned one blocker, both inside the settings-provenance mechanism (§7.7,
§11.3), each introduced by the previous round's fix. v14 clears the eight non-blocking items from
round 13 and is **not yet reviewed**.

**Scope note — RESOLVED IN v15.** Four things entered v1 without the user being asked:
`injectedUnits` (§7.1), the settings-provenance mechanism (§7.7, §11.3) — the source of every
blocker in rounds 11–13 — and, invented outright, §7.8's readings store and §6.7's usual-dose
field. **The user's ruling in v15 was that all four stay** — they were built, correct and
reviewer-confirmed, and a feature that ships cannot also be deferred. **Three of them still do.**
**§6.7 was subsequently cut in v17** on the user's own objection (change 1 above), so this note now
covers `injectedUnits`, §7.8's readings store and §10.6's setup disclosure. [R1] caught v17
asserting "all four stay" thirty lines below the change list announcing the cut — the same class as
the v14 header defect this note replaced. `BACKLOG.md` removed the two entries that named them
and now carries the rule that produced that removal: *if it is built, it comes out of this file.*

**v14's version of this note asserted three falsehoods** [R1] — it referenced the two by backlog
number after those numbers had been reused, and claimed `BACKLOG.md` still listed them as
deferred when the same afternoon's edit had removed them. **Reference companion-document entries
by name, never by number**; numbers are renumbered and the pointer rots silently.

**v12 fixes the blocker that v11's cleanup created.** Round 11 split: [R2] CONFIRMED, [R1]
BLOCKED on one item — `settingsHistory`'s primary key collides with the live `revision` counter
after either import path, silently re-attributing log rows to settings that never produced them,
or bricking settings saves forever. **v11's entire purpose was clearing non-blocking items, and it
introduced the round's only blocker** (§19, ninth consecutive revision). Both reviewers also found
that v11's restatement of the divergence residual measured the ratio against the wrong operand and
gave the wrong mechanism for it — a correction this document had already made in v9, contradicted
eleven lines from where it was written.

**What v11 did, for the record.** Round 10 was the first round both
reviewers passed: [R2] found no implementation blockers, [R1] verified the freeze by hash and
confirmed all three of its round-9 blockers closed. v11 clears the eleven **non-blocking** items
they raised anyway — a storage home for `settingsHistory`, three missing entries in §13.1's core
list, one genuine uncovered residual in §6.6, and eight leftovers where a v9 or v10 correction was
written while the sentence it replaced stayed standing three sections away. **That leftover-copy
class is this document's most persistent defect** (§19), and clearing it is worth one revision.
**Supersedes:** `PLAN-v17-superseded.md` and earlier, all retained for provenance.
**Provenance gap:** v9 was never snapshotted — the copy was taken *after* the v10 edits were
applied, so `PLAN-v9-superseded.md` was a byte-duplicate of v10 rather than of v9. It is **gone with the rest
of v1..v19**, deleted in v21 (§20.5). Ten revisions ran with this paragraph ordering a deletion that
§20.5 simultaneously described as retained — one of the two had to be wrong, and the question is now
moot. **The lesson it recorded is kept here because it is the only place it now survives:** v9's
content is v8 plus the round-9 changes, each marked `ADDED IN v9` in place, and the mistake was
acting on a file before capturing its prior state — the same class as the freeze failure below.

**A process failure in round 9, recorded because it invalidated a verdict.** Round 9's fixes from
[R2] were applied to `PLAN.md` **while [R1] was still reading it**. The file grew from 2,764 to
2,816 lines mid-review, so the two reviewers necessarily reviewed different documents and [R1]
correctly refused to let any verdict bind to a moving artifact. **§20.3 now forbids it.** Round 10
reviews this frozen v10.

**v9 closes round 8's blockers.** Round 8 produced no new design arguments — every finding was a
contradiction between two parts of this document, a missing range, or copy left behind by an
earlier fix. Both reviewers said the decisions were made and only the *specification* was
incomplete. v9 is that specification: `injectedUnits` given a grammar and bounds, `lastDose.units`
defined as the injected figure, band E's daily state given a home, the config file's prescription
defaults deleted, **and one genuine hole nobody had seen in eight revisions — §7.8.**

**What changed in v7 and v8, and why they differ from v1–v6.** Every revision through v6 was
driven by reviewer findings. **These two were driven by facts, and each fact invalidated the
round of review before it.**

**v7's fact:** his brother injects 24–25 units of Humulin R *per meal*, not per day. That
invalidated the premise all six earlier rounds had reasoned from, and with it §6.2's threshold,
round 6's two competing proposals for it, and §1.4's whole calibration analysis.

**v8's fact, and it is the more important one:** *his blood sugar does not only run high.* **It
sometimes falls to 65 mg/dL.** Round 7's central recommendation — do not ship the calculator,
because 25 units is empirically tolerated and the app's smaller number is the hazard — rested on
the sentence "he injects 25 per meal without hypoglycaemia." **That sentence is false.** A
reading of 65 means 25 units has sometimes been too much, and the recommendation built on it does
not hold.

**What the new fact actually shows** is in §1.4: a fixed dose meeting variable meals produces
exactly this signature — high most of the time, occasionally crashing — and the remedy for it is
a calculation, which is what this app is. **The project is confirmed, and the full app ships**
(§20.6).

**Three times now a review verdict has collapsed on a fact only the user held.** Recorded in
§19, because it is the most transferable thing this process has produced.
**Companion:** `BACKLOG.md` — everything deliberately deferred.

**Revision note.** Reviewed twice by two independent model families. Findings are marked
**[R1]** (clinical / state-machine) and **[R2]** (implementation / code-level) at the point of
change.

**Round 1** found the same class of failure from two unrelated directions — the app silently
dosing on default settings that are not the prescription — which drives §1.2 and §11.3.

**Round 2 found that the round-1 fixes introduced new defects**, all in §7, the log added to
fix a round-1 finding. Both reviewers independently traced the same critical: suppressing the
correction term to prevent stacking *raised* the dose when the correction was negative, because
a negative correction is a dose reduction. §7 has been rewritten and integrated into the
precedence order (§4.3), the state snapshot (§11.2) and the test schema (§13.2) — the three
places v2 omitted it.

**Round 3** confirmed the round-2 critical was properly fixed — with a monotonicity proof that
positive-only suppression cannot raise a dose — and then found the pattern had held again. §6.5,
the advisory added in v3 to close a round-2 gap, was **structurally incapable of ever firing**:
its trigger sat above the maximum dose the plan's own bound permits. Round 3 also found the
storage concurrency fix did not work, and that a fix's own error message recreated the error it
prevented.

**Round 4** blocked on four items, all in v4's new material. The finding of the round was a
compliance failure: v4 introduced §17's standing rule and violated it for the very feature it
redesigned. Round 4 also found that the IndexedDB switch had silently discarded cross-tab change
notification, and that a v4 fix's leftover copy again contradicted the fix beside it.

**The pattern is established over four rounds: each revision's defects live in the code added by
the previous revision's fixes.** Every revision, including this one, should be assumed to contain
its own. Findings are diminishing — round 2 required a rewrite, round 3 a redesign, round 4
amendments — but they have not reached zero.

**Terminology rule.** Full form on first use in each section, short form in brackets, short
form thereafter within that section. **In the app itself, no bare abbreviations at all** —
the only exception is small secondary text giving the clinical term so the user can talk to
their doctor.

---

## 1. What this is

A mealtime insulin dose calculator for one adult with Type 1 diabetes, built as an
installable, offline-capable web app. It takes a blood sugar reading and a carbohydrate
amount and returns the number of units of short-acting insulin to inject.

It is arithmetic the user currently does in their head. It does not diagnose, does not adjust
therapy, and does not decide anything a clinician has not already decided.

### 1.1 The user

- Adult male, Type 1 diabetes, on multiple daily injections (MDI).
- **Humulin R** — regular human insulin, *short-acting*, not rapid-acting — for meals and
  corrections.
- **Lantus** (insulin glargine) as basal, on a fixed clinician-set plan. **Out of scope.**
- Meter: Accu-Chek Instant S. **Manual entry only** — no device connection (§9).
- **Phone: Android.** iPhone is supported but does not drive the architecture (§12).
- Pakistan. Blood sugar measured in milligrams per decilitre (mg/dL).
- The author is the user's brother and the sole maintainer.

### 1.2 Clinician-set parameters

| Parameter | Value | Meaning in the app's own words |
|---|---|---|
| Target blood sugar | 150 mg/dL | What corrections aim for |
| Insulin sensitivity factor (ISF) | 30 | 1 unit lowers blood sugar by 30 mg/dL |
| Insulin-to-carb ratio (ICR) | 10 | 1 unit covers 10 grams of carbohydrate |

**These are the current prescription. PREFILLED AND SHOWN at onboarding — CHANGED IN v26 ON
MOMIN'S RULING.** They still require an explicit save before anything is stored.

**The history, because the reversal is partial and the reasoning still binds.** Version 1 called
them "defaults, all editable," which contradicted §4's rule that empty settings must refuse to
calculate. v2 removed them entirely; v8 reintroduced them as "seed values" and both reviewers
rejected that too.

The hazard those rounds identified is real and is quoted here in full, because it is the thing the
current design has to answer to:

> Today 150/30/10 equals the prescription, so silent defaulting is invisible. The day the clinician
> moves the insulin-to-carb ratio to 15 — inside the soft range, no confirmation — a silent revert
> to 10 makes a 150 g meal dose 15 units instead of 10. **Five units over is 150 mg/dL of
> unintended drop**, taking a normal post-meal 180 to about 30. **Nothing on screen would look
> different.**

**The load-bearing word is SILENT, and that is what v26 changes rather than accepts.** The values
are prefilled into the DRAFT and rendered on screen; they are never applied behind the user:

1. **Nothing is stored until the explicit save.** `buildSnapshot` reads the STORE, not the draft,
   and returns null until then — so §4.4's refuse-on-empty-settings branch is still reachable and
   is not dead code. The objection v1 could not answer, this design does.
2. **The basal block (§1.3) stays empty**, so the save is genuinely blocked and the setup cannot be
   tapped past without passing through every screen.
3. **The target's own soft band does the noticing.** 150 sits outside 90–140 deliberately (§4.5), so
   §10.5's one-time acknowledgement fires on first run BY DESIGN. That is the mechanism that makes a
   stale value visible instead of invisible — and it is why **widening that band to silence the
   prompt is forbidden**, which §13.3 already ruled for a different reason.

**What was traded away, stated rather than glossed:** someone who taps through without reading gets
the previous prescription. That is a weaker guarantee than typing all three by hand, and it is
accepted because the alternative — a person who needs this app doing data entry before every
recovery — is the failure mode that gets the app abandoned for the fixed 24–25 units it exists to
replace (§1.4). Each value is on its own screen (§18.14) so that tapping through is at least
tapping past something legible. Recorded in `docs/CLINICAL.md`.

### 1.3 Basal insulin — recorded, never calculated — NEW IN v6

The app records the basal regimen as a **setting** so the stored picture is the whole regimen
rather than half of it:

| Field | Value |
|---|---|
| Basal insulin | Lantus |
| Dose | 36 units |
| Timing | early morning, before breakfast and the first Humulin R dose |

**It never enters any calculation.** It is not an input to §2, it is not in the §11.2 snapshot,
and it never appears on the calculator screen. It exists so the settings-as-text screen (§10.6)
and the export show the complete regimen — the thing a clinician would actually want to see.

**The risk it creates, and the mitigation.** Putting a second number labelled "units" into the
app invites confusion with the calculated dose. So it lives in settings only, is visually
separated from the dosing settings, and is labelled: *"Your Lantus dose — set by your doctor,
not calculated here."*

**Validation — ADDED IN v7.** v6 stored the basal figure and never said what a valid one is,
so a typo stores 360 units. It touches no calculation and therefore cannot produce a wrong dose,
but it can produce a wrong export and a wrong record in front of a clinician. **Hard range 1–150
units; soft-confirm outside 5–80.** The name field is free text; the timing field is free text.

**Persistence — ADDED IN v7** [R1, R2 — both]. §11.3's settings store must carry
`basalName`, `basalUnits`, `basalTiming`; §7.7's export is log-only in v6, so the basal regimen
belongs in the **settings** portion of the export, and §7.7 must say which. A §13.3 case asserts
that changing any basal field leaves every calculated dose bit-identical.

**Not logged daily in v1.** Whether he took it today is a different feature — adherence tracking
with reminders — and belongs in `BACKLOG.md`, not here.

### 1.4 Calibration — RESOLVED IN v7, and not as anyone expected

v6 recorded a doubt: a total daily dose near 45–50 units with 36 of them basal would leave only
9–14 units of bolus a day, implying meals near 30–50 g rather than §2's illustrative 200 g. Both
reviewers examined it in round 6. Both reasoned correctly. **Both were working from a premise
that turned out to be false.**

**The actual figures, supplied by the user.** His brother injects **24–25 units of Humulin R per
meal** — per meal, not per day — at two or three meals, plus **36 units of Lantus** in the early
morning. Total daily insulin is therefore **84–111 units** depending on whether he eats two
meals or three — not 45–50. **Do not collapse that to a single constant** [R2]: v8's first draft
said "about 111", which is the three-meal day only, and replacing one mistaken constant with
another is how §2's 200 g got here in the first place. The basal share is correspondingly
**32–43%**, not 32%.

**The meal estimate was right; the dose estimate was wrong.** The user independently confirmed
~50 g of carbohydrate for a 250 g plate of biryani — the figure both reviewers derived and the
one this section already carried. What nobody had was the injection figure.

#### The contradiction this exposes, stated without any formula

| | |
|---|---|
| Correction, 330 → 150 target, at ISF 30 | 6 units |
| Meal, 50 g at ICR 10 | 5 units |
| **What the app will output** | **11 units** |
| **What he injects today** | **25 units** |

Both numbers are real and they differ by 14 units.

**v7 drew the wrong conclusion from that, and so did round 7.** v7 argued that if 11 were
correct, 25 would have caused severe hypoglycaemia at every meal — therefore his real requirement
must be at or above 25. Round 7's [R1] adopted the same reasoning and recommended against
shipping the calculator on the strength of it.

**Two things break that inference.**

**First, the user's correction: his blood sugar does not only run high. It sometimes falls to
65 mg/dL.** So 25 units *has* sometimes been too much. The premise that his habitual dose is
empirically safe is false, and every conclusion resting on it — including round 7's shipping
recommendation — falls with it.

**Second, historical tolerance was never validation anyway** [R2]. The Humulin R label documents
hyperglycaemia associated with affected injection sites, and hypoglycaemia on switching to
unaffected ones. Repeated injection into the same site can produce exactly this picture — needing
more insulin and still running high — with the ratios entirely correct. **It is cheaper to check
than anything else on the table**, and it belongs in the clinical conversation alongside the
ratios.

#### What the 65 actually shows — NEW IN v8, and it is the heart of the project

A fixed dose cannot be correct for both a large meal at 330 and a small one near target:

| Situation | What his ratios call for | What he injects | Outcome |
|---|---|---|---|
| Large meal, blood sugar high | ~21–26 units | 25 | About right |
| Small meal, near target | ~3–5 units | 25 | Large overshoot → **65 mg/dL** |

**High most of the time, occasionally crashing, is *consistent with* a fixed dose meeting variable
meals — DOWNGRADED IN v9** [R1, R2 — both]. v8 wrote "one cause, not two" and "the remedy is a
calculation." **Both overclaimed, and the document contradicted itself**: §18.13 correctly frames
the cause as the open empirical question the record exists to answer, while §1.4 asserted the
answer to it.

**Three rival explanations live in this same plan**, any of which reproduces the pattern with the
fixed dose held constant:

- **Injection-site absorption** — recorded from [R2] two paragraphs above. Damaged sites absorbing
  poorly (the highs) plus an occasional clean site absorbing fully (a 65).
- **Basal** — §18.13's own alternative. If the lows cluster overnight they point at the 36 units
  of Lantus.
- **Exercise and alcohol** — §10.6 already names these as the two most common causes of low blood
  sugar the app cannot see.

**And the arithmetic strains** [R1]. If the ratios were approximately right, injecting 25 against
typical 50 g meals would be a 14-unit overshoot *at most meals*, and the pattern would be
relentless hypoglycaemia rather than mostly-high. For the table's "large meal, about right" row to
describe his **routine**, his routine meals would have to be 150–260 g — three to five times the
confirmed typical figure. So the mostly-high pattern points *away* from "ratios right, dose fixed"
and toward either wrong-for-him ratios or impaired absorption.

**The honest statement, which §18.13 already had right:** the pattern is consistent with the
fixed-dose explanation, several rivals are equally consistent, and **the record discriminates
between them.** A calculation is not automatically the remedy — under wrong ratios it produces a
different wrong number, in the under-dose direction this plan calls the ketoacidosis-trending one.
That is why §18.13 is the first question the log answers and why §10.6 must set the expectation
in-app on day one.

**This does not establish that ISF 30 and ICR 10 are correct**, and the app must not claim it
does. What it establishes is that *no fixed number* can be correct, and that the disagreement is
resolvable only with the record the app produces. That is the project's actual clinical purpose,
recorded here rather than assumed.

#### The gate that matters most on day one

At 65 mg/dL this app refuses to produce a dose at all: **band C blocks below 70** — treat first,
15 g of fast-acting carbohydrate, re-check in 15 minutes, do not inject until above 70 (§3).

Nothing in his current routine stops him injecting 25 units at a reading of 65. **That single
gate may be worth more to him than the arithmetic**, it depends on no ratio being correct, and it
is available from the first launch.

**This plan does not resolve that, and must not try.** §1.2 stands: the app uses the prescribed
ratios exactly as entered — one unit per 30 mg/dL above target, one unit per 10 g of
carbohydrate. Whether those ratios are right is the prescriber's decision. The project's stated
intention is to build a calculator accurate enough that the prescriber can adjust against it,
which is the correct division of responsibility and the reason the app never derives ratios
(§5.4).

**What the plan owes instead is a guard**, because on the first day he uses this app it will say
11 and he is accustomed to 25. See **§6.7**.

#### One observation for the clinical conversation — recorded, not acted on

Basal is 36 units of **84–111**, so **32–43%** — the range, not a single figure, for the reason
given above. The commonly cited range is 40–50%. This is
arithmetic from his own figures, not a recommendation, and it is written here so it reaches the
prescriber rather than being decided in this document.

#### What this retires

- **§6.2's threshold** is recalibrated 30 → **20**, against real doses rather than §2's
  illustrative example. Round 6's proposals of 10 and 15 are superseded along with it.
- **§6.5's baseline** needs no change. It is a median computed from history, never a constant —
  found independently by both reviewers. **150 must never become an initialisation value.**
- **The plate-weight error mode is downgraded.** The user confirms his brother enters grams of
  carbohydrate. Defence reduces to §10.1's field label plus one line of how-it-works copy; v6's
  comprehension test and §18.9 walkthrough item are withdrawn as over-engineering.
- **§18.6 is closed.**

#### Where §2's 200 g came from — worth recording [R1]

§6.1's own words were "a 200 g **plate**", and that figure propagated into §2's worked example as
200 g *of carbohydrate*, then into two thresholds. **This plan committed the exact
plate-weight-for-carbohydrate error it warns users against.** That is the strongest available
evidence the error mode is real, and the reason the field label stays even though this particular
user is not the one at risk of it.

---

## 2. The calculation

```
correction = (bloodSugar - target) / ISF     // exact, may be negative, NOT quantized
meal       = carbs / ICR                     // exact, never negative, NOT quantized
total      = correction + meal               // exact
clamped    = max(0, total)                   // clamp the TOTAL, never the correction
dose       = roundToIncrement(clamped, mode) // see §5
```

Canonical case:

```
blood sugar 330, carbs 200, target 150, ISF 30, ICR 10
correction = (330 - 150) / 30 =  6.0 units
meal       = 200 / 10         = 20.0 units
total                          = 26.0 units
```

### 2.1 Non-negotiable rules

1. **The correction may be negative and is subtracted from the meal dose.** Never floor the
   correction at zero — silently discarding it is a documented defect.
2. **Only the total is clamped.**
3. **Never emit negative zero**, and normalize it on *every* displayed insulin quantity, not
   just the main readout. [R2]
4. **Never display a value that was not used to compute the dose**, and never recompute a
   dose from a displayed string. [R2]

### 2.2 Where quantization happens — CHANGED IN v2 [R2]

Version 1 said "compute and store insulin in integer hundredths of a unit" without saying
*what* gets quantized. That is a dosing-policy decision, not a representation detail, and the
two readings give different doses:

| Blood sugar | Carbs | Correction | Meal | Quantize components first | Round exact total |
|---:|---:|---:|---:|---:|---:|
| 105.12 | 59.94 | −1.496 | 5.994 | −150 + 599 = 449 → **4 units** | 4.498 → **4 units** |
| 105.18 | 59.86 | −1.494 | 5.986 | −149 + 599 = 450 → **5 units** | 4.492 → **4 units** |

**Corrected in v3** [R2]. The v2 table claimed row one gave 4 versus 5 and that "the answers
invert." Both were wrong: 4.498 rounds directly to 4, and reaching 5 requires the intermediate
quantization the rule prohibits. Row two alone demonstrates the defect — and demonstrates it
sufficiently. Both exact totals are below 4.5, so **4 units is correct in both cases** and
component-quantization is wrong.

This matters beyond the table: §13.3 promotes this pair into golden cases, so v2 would have
shipped a wrong expected dose. **Mutation testing cannot detect a wrong oracle** — a defect
class now recorded in §13.8.

**The rule:**

- Correction and meal stay **exact and unquantized** for dose calculation and for the caution
  predicate in §3.
- Sum them, clamp the total, then round the **clamped total directly** to the output
  increment. No intermediate rounding to hundredths.
- The `off` mode is the only one that quantizes to hundredths, and it does so on the total,
  with an explicitly stated tie rule.
- Breakdown components are quantized **for display only** and never fed back into dosing.
- **Displayed components may not visibly sum to the displayed total.** When that happens the
  breakdown shows the exact total on its own line rather than implying the components add up.

This retires v1's claim that all insulin values are stored in hundredths. Recurring values
such as 1/3 cannot satisfy it. [R2]

**Authoritative output representation** [R2]: the dose returned by the core is an **integer
number of hundredths**, and every consumer — display, announcement, log row, export — derives
from that one value. Returning units as a float and reconstructing hundredths downstream
reintroduces exactly the problem this section exists to remove: `1.13 * 100` is
`112.99999999999999`.

**Tie rules, now actually selected** [R1-L1, R2]. v2 referred to "a stated tie rule" twice and
never stated one. **All modes break ties half away from zero** — whole unit, half unit, and the
hundredths quantization in `off`. One rule, stated once, pinned by golden cases at 1.005,
±1.125 and ±1.495.

### 2.3 Finiteness and safe range — NEW IN v2 [R2]

`Math.round(1.005 * 100)` is `100`, not `101`, because `1.005 * 100` evaluates to
`100.49999999999999`. Scaling does not make binary division exact: `100/3` is still not an
integer.

Therefore:

1. **Establish finiteness independently, before range checks and again after arithmetic.**
   A guard written `if (x < min || x > max) reject` does **not** reject `NaN` — both
   comparisons are false. Every numeric gate needs an explicit `Number.isFinite` test.
2. **Check `Number.isSafeInteger`, not merely integrality**, wherever integers are assumed.
3. **Never use `||` for a numeric fallback.** `Number("")`, `Number(" ")` and `Number(null)`
   all produce `0`, and truthiness treats a legitimate zero as absent. This is the exact
   mechanism behind the silent-defaults failure in §1.2 — a third independent route to it.
4. Division by the insulin sensitivity factor or insulin-to-carb ratio uses ordinary
   floating-point division; that limitation is accepted and specified, not papered over.
5. **Placement matters, and v2 got it wrong** [R2]. §4.3 clamped at step 8 and checked
   finiteness at step 9 — but `max(0, -Infinity)` is a finite zero, so clamping *erases the
   evidence*. Finiteness is checked **on each component before the band predicate, on the sum
   before clamping, on the bound itself, and on the final rounded representation.** Not
   reachable from validated inputs (the hard ranges cap the total at 406 units), but it was a
   hole in the promised defence.

---

## 3. Blood sugar bands

The target (150) is above guideline pre-meal ranges — NICE 72–126 mg/dL, ADA 80–130 mg/dL,
Medtronic device soft range 90–140 mg/dL. It is the physician's deliberate choice (§18.1).
The structural consequence: **"below target" is the normal case, not an edge case.**

| Band | Condition | Behaviour |
|---|---|---|
| **A. Normal** | blood sugar >= 70 and correction > −1.5 units | Calculate. Show result and breakdown. |
| **B. Caution** | blood sugar >= 70 and correction <= −1.5 units | Calculate **and** show a non-blocking caution: "You are well below target. Consider eating before injecting, and re-check." |
| **C. Low (Level 1)** | 54 <= blood sugar < 70 | **No insulin number.** "Treat first — 15 grams of fast-acting carbohydrate, re-check in 15 minutes. Do not inject until above 70 mg/dL." Offer re-check-and-recalculate. |
| **D. Very low (Level 2)** | blood sugar < 54 | Same block, escalated: "Repeat treatment if not recovered in 15 minutes. Get help if you cannot treat yourself." |
| **E. High — advisory** | blood sugar >= 250 | Calculate and show the dose **normally**, plus: "Above 250 — check ketones. If ketones are present or you feel unwell, contact your clinician." |

70 and 54 are the ADA/EASD international consensus levels. **They are absolute and never
derived from any setting.**

### 3.1 Band E is advisory, not blocking — and that asymmetry is deliberate [R1, partial]

R1 proposed refusing to dose above 600 mg/dL and routing to "seek care." **Rejected.** That
repeats the mistake of the v1 dose ceiling: someone at 500 mg/dL needs insulin most, and
refusing to help is not safer than helping with a warning.

The asymmetry is intentional and stated here so it is not "fixed" later:
**blocking at the low end, advisory at the high end.** At low blood sugar, not injecting is
the safe default. At high blood sugar, not injecting is the *unsafe* default. The gate goes
where inaction is safe.

Diabetic ketoacidosis (DKA) is real and subcutaneous correction alone is inadequate therapy
for it — which is why band E says check ketones and call someone. It does not withhold the
dose.

### 3.2 Why the caution band is derived

An earlier draft hardcoded band B as `70 <= bloodSugar < 100`, with 100 chosen as 50 mg/dL
under a target of 150. **That number is meaningful only relative to the target and the
insulin sensitivity factor**, and both are editable.

With a target of 110 a fixed boundary of 100 would announce "well below target" at 10 mg/dL
under target — noise, and noise is how warnings stop being read. A user with an insulin
sensitivity factor of 50 has to be *further below target* before a 1.5-unit correction exists at
all, because each unit moves them further. **v10 said "wider band" and v11 "closer to target";
both were wrong and v11's own correction note four lines down said so** — the rationale and the
correction asserted opposite directions inside one subsection [R1, R2]. The predicate is exact and
all three worked examples are right, so nothing could be built from the prose; it is fixed here on
the third attempt.

So band B fires on the **exact unrounded correction**, never a rounded one [R2]:

```
band B  <=>  bloodSugar >= 70  AND  correction <= -1.5 units
```

Worked: target 150, ISF 30 → fires at blood sugar <= 105. Target 110, ISF 30 → fires at
<= 65, below the hard gate, so band B correctly vanishes. Target 150, ISF 50 → fires at
<= 75, correctly. **Note the direction — corrected in v11** [R1, R2]: v10 called this "wider", and
the fired band is in fact *narrower* on screen (70–75 at ISF 50 against 70–105 at ISF 30). What
widens is the distance below target at which caution begins. The predicate is exact and
golden-cased; only the word was wrong.

### 3.3 "No insulin number" — precise scope [R1]

Bands C and D suppress **every insulin quantity**: the main result, the breakdown components,
the confirmation preview, the settings worked-examples, and the accessibility announcement.

It does **not** suppress the treatment instructions, which necessarily contain numbers — 15
grams, 15 minutes, 70 mg/dL. Version 1's "no number is displayed anywhere on screen" was
literally read as deleting the treatment advice. The rule is **no insulin dose numbers**, not
no digits.

### 3.4 Band E and band B can co-occur with nothing else

Bands are evaluated in the precedence order of §4.3. C and D are terminal — no dose, no
timing instruction, no confirmation prompt.

---

## 4. Input states, validation, and precedence

### 4.1 Four states, not three [R2]

Version 1 said "empty, zero, invalid — and they are not the same." There is a fourth:
**valid non-zero**. All four must be distinguishable before any numeric conversion, because
JavaScript collapses them:

| Expression | Result | Consequence |
|---|---|---|
| `Number("")` | `0` | Empty becomes a real reading of zero |
| `Number(" ")` | `0` | Whitespace becomes zero |
| `Number(null)` | `0` | Missing becomes zero |
| `Number(undefined)` | `NaN` | Missing becomes not-a-number |
| `value \|\| fallback` | replaces `0` | A legitimate zero silently becomes a default |

**The raw-state decision happens before numeric conversion, always.** TypeScript annotations
do not change these coercions.

### 4.2 Lexical grammar — NEW IN v2 [R2]

Version 1 said "reject text and negative numbers, accept decimals." That is not a
specification. Prefix parsing accepts garbage:

| Input | `parseFloat` | `Number` |
|---|---|---|
| `"20g"` | `20` | `NaN` |
| `"10,5"` | `10` | `NaN` |
| `"1.2.3"` | `1.2` | `NaN` |
| `"Infinity"` | `Infinity` | `Infinity` |
| `"0x10"` | `0` | `16` |

**The rule: whole-string match against an explicit grammar, then convert.** Never
`parseFloat` as validation.

```
grammar:  ASCII-digits [ "." ASCII-digits ]
          leading/trailing whitespace trimmed
          exactly one optional period, no comma at all
          at most 1 integer digit beyond the field's max, at most 2 fractional digits
          no sign, no exponent, no hex, no Infinity, no NaN, no Unicode digits
```

**Commas are rejected outright — CHANGED IN v3** [R1-M4]. v2 treated comma as a decimal
separator to defend against a European habit. **That is the wrong locale.** Pakistan uses
period-decimal and comma-*grouping* (lakh/crore style), so the plausible comma keystroke here
means grouping: `2,50` intends **250**, and v2's grammar would have read it as `2.5` — giving
**0.25 units instead of 25**, a hundredfold under-dose that no cap catches and that trends
toward ketoacidosis on a large meal.

A comma produces an explicit message and is never interpreted. **The message must not presume
decimal intent** [R1-M6]: v3 said *"Use a period for decimals"*, which instructs the
grouping-intent user to retype `2,50` as `2.50` — **0.25 units instead of 25**, the identical
hundredfold under-dose, one obedience step later. The message is:

> **Remove the comma — type 250, not 2,50.**

**`digits` means ASCII 0–9.** Unicode digit forms are rejected.

**Lexical rejection applies at calculation time, not per keystroke** [R1-L6]. `5.` and `.5` are
invalid under this grammar but are transient states while typing `5.5`; mid-typing shows no
error. §10.8's clear-on-change still applies — it clears the *result*, it does not validate.

### 4.3 Precedence order — NEW IN v2 [R2]

Version 1 gave bands (§3), input states (§4) and ranges (§4.1) as three independent tables
with no stated resolution order, leaving many cells contradictory. This is the order:

1. **Invalidate.** Any change to any input, setting, mode, threshold, **log revision, a readings write
   (§7.8 — it bumps the same `logRevision`; v9's wording implied a second counter that never
   existed, corrected in v11 [R1]), or
   stacking override** clears all previous dose output and cancels any pending confirmation.
   The log is a dosing input (§7.4), so a row added, deleted or imported in another tab
   invalidates a visible result here [R1-H1, R2].
2. **Classify raw input.** Preserve empty / zero / invalid / valid separately. No default
   substitution. Establish lexical validity and finiteness before any numeric comparison.
3. **Recognise low blood sugar independently of settings.** An in-range reading below 70
   takes priority for the primary message **even when carbs are invalid or settings are
   missing.** No insulin number appears. Below 20 or exactly zero, show a combined
   invalid-reading-and-possible-low response rather than silently choosing one.
4. **Apply hard validity gates.** Invalid blood sugar or carbs, missing or invalid settings,
   or non-finite values prohibit calculation. Collect the errors — do not let them replace
   the low-blood-sugar guidance from step 3.
5. **Decide whether a calculation was requested.** Blood sugar blank *and* carbs blank → no
   result, not "0 units". Carbs blank with blood sugar at or below target → no result.
   Explicit zero carbs **is** a valid calculation (correction-only).
6. **Resolve acknowledgements.** A confirmation applies only to the exact values confirmed.
   Declining leaves no result.
7. **Evaluate the exact correction and the band A/B predicate** using the unrounded,
   **unsuppressed** correction. The band predicate always sees the true value — if suppression
   ran first, blood sugar 71 would have its correction zeroed and band B would never fire,
   which is the v1 defect reborn through the stacking door [R1-H1].
7a. **Apply the stacking decision** (§7.4), reading the committed log revision. Suppression
   affects **only a positive correction**; a negative correction always survives. If the
   override is active, no suppression occurs and the §6.2 confirmation is re-run.
8. **Check finiteness of the sum, then clamp the total.** Never clamp the correction. The
   finiteness check precedes the clamp because `max(0, -Infinity)` is a finite zero — clamping
   first erases the evidence [R2-F8]. Components are also checked before step 7's predicate.
9. **Check the mathematical bound** on the unrounded clamped total (§6.4). A failure here cannot
   be overridden by user confirmation.
10. **Round the clamped total** to the output increment per §5. No intermediate quantization.
11. **Apply the confirmation threshold** (§6.2).
11a. **Evaluate the §6.5 plausibility advisory** against the *validated* carbohydrate value
    (never the raw string) and the eligible baseline carried in the snapshot. **It evaluates
    only when carbs > 0**, mirroring §6.5's own eligibility rule. It is advisory only: it never
    alters the dose, never gates, and cannot suppress the §6.2 confirmation.

    **The zero-carb exclusion is not optional** [R1]. §4.4 makes an explicit `0` a valid
    correction-only calculation, and `0 < baseline/4` is **always true** — so without this
    clause the low-carb advisory fires on *every deliberate correction-only dose* ("0 g is
    smaller than your usual meals…"). The sole under-dose defence would become furniture on a
    routine path and be dead before the one 200→20 firing that matters.

11b. **Select band E's form** (§10.5) — full card or compact line — from
     `bandEFullCardShownToday` in the committed snapshot. **ADDED IN v9.** The *instruction* is
     identical either way; only the presentation differs, so this step can never change what the
     user is told to do. It is here rather than in the shell because §11.2 twice forbids
     safety-display logic outside the tested core, and because v8 ruled the behaviour without
     giving it a step — the §17 leg that has failed six revisions running.
12. **Reveal the result and only the instructions compatible with the band.** Caution
    survives confirmation. Zero, correction-only, meal-only and combined results each get
    explicit message rules.

**Step 11a was missing from v4** [R1-B1, R2]. §17's standing rule requires a precedence step, a
snapshot field and a schema representation in the same change — v4 supplied the schema, and
omitted the other two for the very feature it redesigned. **The rule was written and broken in
the same revision**, which is evidence that a stated principle does not prevent the error: §17
now requires the three-legged check to be run explicitly at each change, not merely declared.

### 4.4 Input states resolved

| Input | Empty | Zero | Invalid | Valid |
|---|---|---|---|---|
| **Blood sugar** | Meal dose only. **Never substitute zero.** Requires the confirmation in §4.6. | Reject *and* show the low-reading guidance (step 3) | Reject with message | Band per §3 |
| **Carbs** | Correction only, and only when blood sugar is above target; otherwise no result | Valid — a correction-only dose | Reject with message | Normal |
| **Any setting** | **Refuse to calculate.** Route to settings. | Reject — division by zero | Reject | Normal |

Rejecting one field never authorises calculating from the other alone. [R2]

### 4.5 Ranges

| Field | Hard reject outside | Confirm once outside |
|---|---|---|
| Blood sugar | 20–600 mg/dL | — |
| Carbohydrates | 0–300 g | — |
| Target blood sugar | 70–**200** mg/dL | 90–140 mg/dL |
| Insulin sensitivity factor | 5–200 mg/dL per unit | 20–100 |
| Insulin-to-carb ratio | 1–100 g per unit | 5–50 |
| Basal dose (§1.3) | 1–150 units | 5–80 |
| Injected amount (§7.1) — **ADDED IN v9** | 0.01–100 units | 0.5–60 |

**The target ceiling is 200, lowered from 300 in v17.** 300 was picked as "generously permissive"
and has no clinical basis — no one sets a preprandial target there. The ADA's Standards of Care put
the preprandial goal at **80–130 mg/dL** for Type 1, peak post-meal under 180, and explicitly allow
**less stringent** goals for hypoglycaemia unawareness, older age and comorbidity. His physician's
150 sits just above the standard band, which is defensible given his 65 mg/dL readings — and is why
150 is *outside* the 90–140 soft band and confirms once, correctly. **200 accepts a genuine
less-stringent target and rejects a mistyped 250 or 300.** The hard range is a typo-catcher, not a
clinical recommendation, and §18.1 still holds: the target itself is the prescriber's choice.

Settings hard limits are **new in v2** [R2]. Version 1 rejected only zero and negatives,
which permitted an insulin sensitivity factor of 0.001 and therefore an arbitrarily large
dose — while the derived ceiling rose in step with it and never fired (§6.4).

A reading below 20 or above 600 is **not** merely "invalid": per step 3, below-range routes
to the low-reading response, and above-range gets **"check the number"** with the HI guidance.

**RULED 2026-09-09 by Momin. This sentence used to end "and above-range to band E wording", which
contradicted the paragraph below it** — the one that says a typed `605`, a plausible typo for `60.5`,
gets plain "check the number" and *not* band E's ketone advisory, because **"check ketones" is a
confusing reply to a typo.** Both could not be executed; the second is the more specific and carries
its own reasoning, so it wins and the first is deleted rather than left as a live alternative.

An above-range reading therefore produces `invalid_input` with reason `above_range` and **asserts no
band at all.** The reasons are `above_range` and `below_range` rather than one `out_of_range`
precisely so the interface can tell HI from LO without re-reading the number: one says a meter cannot
read that high, the other says not to enter a number at all and to treat first.

**`LO` and `HI` instructions — WRITTEN IN v3** [R1-M5]. v2 promised this text and never supplied
it, which is where the §3.1 disagreement actually resolves. The Accu-Chek Instant caps at 600.

> **Meter shows HI?** Enter 600. **This dose treats 600 and is probably too little** — treat it
> as a minimum, not the answer. Check ketones now. If ketones are present, or you are vomiting,
> this is an emergency: injected insulin alone will not treat diabetic ketoacidosis.

> **Meter shows LO?** Do not enter a number. Treat now — 15 grams of fast-acting carbohydrate,
> re-check in 15 minutes.

A typed `605` (a plausible typo for `60.5`) gets plain *"check the number"* plus a link to the
HI guidance, **not** band E's ketone wording — "check ketones" is a confusing reply to a typo.

### 4.6 The blank-blood-sugar path needs friction [R1]

Version 1 let a blank reading produce a meal dose with no gate — but the low-blood-sugar
check never runs when there is no reading, so someone at 60 mg/dL who skips the fingerstick
gets a full dose with no warning. Worse, users learn the blank field as the way to skip
warnings.

The blank path therefore requires an explicit acknowledgement:

> **No reading entered.** This covers carbohydrates only — it cannot check whether you are
> low. If you feel low, test first. Do not use this if you might be below 70 mg/dL.

And the pre-meal timing instruction (§8.1) is **suppressed entirely** when blood sugar is
unknown.

**This acknowledgement is per-calculation, never persisted** [R1-L4]. §11.3's persisted-ack list
excludes it deliberately: a one-time persisted acknowledgement here would be near-zero
protection.

**Why one tap is the right amount of friction, recorded so it is not "improved" later** [R1]:
any stronger friction displaces the user to entering a *fabricated* in-range reading, which is
strictly worse — a fake 150 contributes a fake correction of zero, defeats the low-blood-sugar
gate entirely, **and** corrupts the log that §7.4 reads.

---

## 5. Rounding

### 5.1 Modes

Applied to the **clamped total** only (§2.2), never to components.

| Mode | Behaviour | Notes |
|---|---|---|
| **nearest whole unit** | Half away from zero | **Default** |
| nearest half unit | To the nearest 0.5 | For a half-unit pen [R1] |
| ceil | Toward +∞ | **Gated behind a one-time acknowledgement** |
| floor | Toward −∞ | |
| off | Exact to hundredths, stated tie rule | Display precision, not a pen mode |

Version 1 offered `off` as the half-unit-pen mode. It is not — it hands the user `4.37` and
makes them choose a rounding direction unaided, which is the exact unguided decision that
`ceil` is gated to prevent. A real **nearest half unit** mode is added. [R1]

**Why `ceil` is gated:** with an insulin sensitivity factor of 30, one unit is 30 mg/dL of
intended movement. Rounding up adds as much as a full unit — 30 mg/dL of unintended extra
drop — on *every* dose, always toward low blood sugar. On a 20-unit meal dose that is 5% and
irrelevant; on a 1-unit correction it is a 100% overdose. The modes are not neutral peers.

### 5.2 Negative values — scope clarified [R2]

Because the total is clamped before rounding, **final-dose rounding never receives a negative
number.** Negative behaviour therefore affects only display of the correction component, and
must still be pinned by tests so a future refactor cannot reorder clamp and round silently.

| Mode | Correct on −1.5 | The trap |
|---|---|---|
| nearest, half away | −2 | `Math.round(-1.5)` gives **−1** — it rounds toward +∞ |
| ceil, toward +∞ | −1 | "up" misread as increasing magnitude gives −2 |
| floor, toward −∞ | −2 | `Math.trunc(-1.5)` gives **−1** |
| off | half away from zero (§2.2) | −1.495 → −1.50 |

Truncating a negative correction makes it *less* negative and therefore **increases** the
combined dose relative to flooring it.

**Three rules satisfy this table, not two — RECORDED IN v27, ruled by Momin 2026-09-09.** The build
compared rounding the decimal representation against `Math.round(value * 100) / 100` and chose the
first. A third was never written down and is equally correct:

| | `-1.495` | `1.005` | `-1.125` | `2.675` |
|---|---|---|---|---|
| **A** `Math.round(v * 100) / 100` | **-1.49** | 1.00 | **-1.12** | 2.68 |
| **B** round the decimal representation — **SHIPPED** | -1.50 | 1.00 | -1.13 | 2.67 |
| **C** scale, round the MAGNITUDE, reapply the sign | -1.50 | 1.00 | -1.13 | 2.68 |

**A is excluded, and floating point is not the reason.** `Math.round` breaks ties toward **+∞**, so
`Math.round(149.5)` is 150 while `Math.round(-149.5)` is -149: the same magnitude is treated
differently by sign, which §2.2 forbids for every mode. `Math.sign(v) * Math.round(Math.abs(v))`
removes exactly that fault, and that is rule C.

**B and C disagree only where a decimal LITERAL looks like a tie while the double behind it is not.**
`2.675` is really 2.67499999…, so B trusts the printed digits and C trusts the value. Both are
defensible; neither is a floating-point bug.

**Measured across every value this app can reach** — corrections and meal doses, five prescriptions,
blood sugar 20-600, carbohydrate 0-300, **2,623,215 values: zero disagreements.** With real ratios a
correction is a multiple of `1/isf` and a meal a multiple of `1/icr`, and those essentially never
land on a third-decimal tie. §13.3's 572-value figure is over SYNTHETIC three-decimal values, not
reachable doses.

**B is kept because it is shipped, tested and already agrees with this table — not because C is
worse.** C is recorded so that a later reader does not rediscover it and assume it was overlooked.

### 5.3 Formatting is not a second rounding engine [R2]

- **`toFixed` is banned in the dosing path.** It returns a string, rounds the binary value it
  receives, and uses half-away-from-zero — a different mode from `Math.round`. 381
  disagreements per 100,000 three-decimal samples.
- **Format from the authoritative result. Never recompute a result from a display string.**
- Dividing integer hundredths by 100 reintroduces a float; do decimal placement textually.
- Never strip trailing zeros unqualified — it corrupts `10` and `100`.
- Locale formatting can emit decimal commas that the input parser would read differently.
- Normalize negative zero on **every** displayed quantity, not only the main readout.

### 5.4 Rounding is small next to carb-counting error — but only for meal doses [R1]

Adults miss carbohydrate estimates by 15–21 g on average, about 21% of the meal, which at an
insulin-to-carb ratio of 10 is 1.5–2 units. A trial feeding 50/60/70 g meals all dosed for 60
g found no significant difference in glucose or low-blood-sugar episodes.

**That premise is absent on a correction-only dose**, where carbs are zero. There the residual
rounding error is bounded at half a unit — 15 mg/dL at an insulin sensitivity factor of 30 —
so the conclusion still holds, but the honest statement is "negligible for meal doses,
bounded at 15 mg/dL for corrections", not "clinically irrelevant" outright.

---

## 6. Dose ceiling and plausibility

Revised three times. v1 specified warn 15 / block 25 — both wrong, derived from "maximum
plausible dose" rather than what this user actually injects. Both reviewers and the user
rejected them.

### 6.1 Why a hard block is the wrong mechanism

With valid inputs and the prescribed settings the largest reachable dose is
`(600-150)/30 + 300/10 = 45 units`. **Any hard block below 45 can refuse a clinically correct
dose.** At 25 it refused the canonical case in §2. A ceiling that fires on legitimate doses
teaches the user the app is unreliable and trains a workaround.

The 15-unit warning was worse: this user's meal dose alone is 20 units for a 200 g plate.

### 6.2 The confirmation tier

| Tier | Threshold | Behaviour |
|---|---|---|
| Normal | below the threshold | Dose shown, no friction |
| **Confirm** | threshold and above | **Inputs shown, dose withheld until an explicit tap** |
| Bound failure | exceeds §6.4 | Refuse — the app is wrong, not the user |

**Threshold: default 20 units. Hard range 10–45. Soft-confirm outside 15–35. Changing it
requires the delta confirmation of §10.1.6** [R1-M1] — v2 left the only safety-relevant number
in the app exempt from §4.5's own discipline, so it could be set to 100 (tier dead) or 5
(fires always, trains tap-through).

**The operand is explicit** [R2]: confirmation is required when **either** the clamped exact
total **or** the final rounded dose reaches the threshold.

**Why 20 — RECALIBRATED IN v7 against real doses.** v6's 30 came from §2's illustrative 200 g
example. Round 6 doubted it and proposed **10** [R2] and **15** [R1]; both derivations assumed a
routine of 3–5 units per meal. **The user then supplied the actual figures: 24–25 units of
Humulin R per meal, two or three meals a day, plus 36 units of Lantus** (§1.4). Both proposals
were reasoning from a false premise, and so was v6.

At the prescribed ratios the app produces 5 units for a 50 g meal at target, 11 at a reading of
330, 13 at 400, 20 at 600.

**Two of v7's justifying sentences were arithmetically wrong and are corrected here** [R1]:

- *"10 or 15 fires on ordinary high-reading days."* **True of 10, false of 15.** At 50 g, a
  threshold of 15 fires from a reading of **435** — not 450, because §6.2's operand includes the
  **rounded** dose and 14.5 rounds to 15 under the default mode [R2]. For 75 g the boundary is
  **360**, not 375. His worked example of 330 gives 11 and does not fire either way.
- *"20 sits above the routine band."* **False at the boundary.** The plan's own table puts a 50 g
  meal at a 600 reading — the meter's HI cap, reachable for him — at exactly 20 units, and the
  operand is "reaches", so 20 fires there. It **equals** the top of the reachable band rather
  than clearing it.

**What actually justifies 20** is stronger than either sentence: a 250 g plate entered as
carbohydrate is 25 units **from the meal term alone**, and a 240 g typo is 24 — so both are
caught **at every blood sugar**, not only at a high reading [R1]. The uncovered gap narrows to
12–19 units, against v6's 12–29.

**20 is an input-check threshold, not a clinically validated dose boundary** [R2]. It is the
point at which the app asks him to re-read what he typed. It is provisional until the log
supplies a real distribution of outputs.

**The soft-confirm band moved with it, 20–40 → 15–35.** If the prescriber strengthens the ratios
the calculated doses roughly double and this threshold will want to move to about 30–35; a band
ending at 30 would object at precisely the value it is most likely to become.

`threshold` is a settings constant **and** a §13.2 golden-case field [R1], so the build does not
wait on this number being final.

### 6.3 The confirmation shows inputs, not the dose — CONTRADICTION RESOLVED [R1-H2, R2]

v2 said in §6.2 that the dose is "not rendered anywhere — including the accessibility tree —
until the tap", then printed `→ 27 units` in §6.3's own example copy. Both reviewers flagged
it. **Resolution: the dose is withheld.**

```
Blood sugar 350 mg/dL  ·  250 g carbohydrate

That will be a large dose. Check those two numbers.
[ Show the dose ]
```

Rationale: the error is in the *input*, so the input is what must be read. Showing the answer
lets him check the answer and skip the inputs, which is the failure the tier exists to prevent.
**Rationale repaired in v4** [R1-HIGH-1]: v3 justified withholding by claiming the magnitude
check "moved to §6.5." §6.5 was dead code, so that compensation was inert. The honest
justification is narrower — the dose is withheld because reading the inputs is the only thing
that catches a transcription error, and the magnitude check is **not** replaced elsewhere. §6.6
records the resulting gap.

(The v2 example also used 27 units, below its own 30-unit threshold, so it did not illustrate
the gate it was demonstrating. Corrected above: 350/250 gives 31.7 units.)

**Blank-reading case** [R1-L7]: the restatement says "No reading entered · 250 g
carbohydrate", never a blank field.

**What the restatement can and cannot catch** [R1]. It catches **transcription** errors — typed
250, meant 200, visible on sight. It cannot catch **estimation** errors — read the plate as 250
in good faith, and the restatement confirms his own mistake back to him. §5.4 says estimation
error dominates. Claim the narrower thing.

**Confirmation lifetime:** applies only to the exact values confirmed. Any change to any input,
setting, mode, threshold, **log revision or stacking override** cancels it (§4.3 step 1). Not
persisted across sessions. Cancelling leaves no result.

### 6.4 The bound is a tripwire, not a settings validator [R2]

v1 claimed the hard stop detects "settings corruption." **Withdrawn.** A wrong sensitivity
inflates the dose and the bound identically; a matching unit-scale error passes both; and a
non-finite dose makes the bound non-finite too, so `Infinity > Infinity` is false.

What it actually is: given §4.5's hard ranges, `total <= bound` is a **mathematical identity**.
It is therefore unreachable unless something upstream is broken — a bypassed gate, a mismatched
snapshot, an arithmetic regression. That is a legitimate, nearly free defence-in-depth layer,
and "the app is wrong, not the user" is the correct wording. Both reviewers said keep it.

```
maxCorrection = (600 - target) / ISF     // always positive given target <= 200 (§4.5)
maxMeal       = 300 / ICR
bound         = maxCorrection + maxMeal
```

v2's `max(0, ...)` was dead code and its comment about the blank-reading case was wrong [R1-L2];
removed. **The bound and the total must be computed from the same committed snapshot** (§11.2),
or a settings change between the two produces a false refusal.

Checked on the unrounded clamped total, with a one-increment allowance for the rounded dose so
rounding cannot make an attainable maximum look impossible. Preceded by an explicit
`Number.isFinite` check.

### 6.5 Plausibility advisory — REDESIGNED IN v4 [R1-HIGH-1, R1-HIGH-2, R2-F6]

**v3's version was structurally dead code, and both reviewers proved it.** Recorded in full,
because the failure mode is instructive.

v3 compared the *dose* against `2 x max(last 30 doses)`. For this user, whose routine is 20–26
units, that trigger is **52 units** — while §6.4's bound caps every reachable dose at **45**.
The trigger sat above the maximum possible dose: **it could never fire.** To protect below the
30-unit confirmation — its entire stated purpose — it needed `2 x recentMax < 30`, i.e. a recent
maximum under 15, which never holds for him. v3's own worked example ("your largest dose in the
last month was 6 units") described a different patient, three paragraphs after stating his real
routine.

It was also **self-poisoning**: had it fired, the 24-unit error would be logged, the maximum
would become 24, the trigger 48 — above the bound — and the advisory would be dead for the next
thirty doses. *The row that killed it would be the exact error it existed to catch.* `max` is
the most poisoning-sensitive statistic available.

§6.3's rationale for withholding the dose leaned on this as the relocated magnitude check. That
compensation was inert, so §6.3's justification was broken too — repaired below.

#### The redesign: compare the CARBOHYDRATE INPUT, and mainly downward

**Compare the input, not the output.** The log already stores `carbs`. The error is in the
input, so that is what to check — consistent with §6.3 and §10.1.6.

**Aim downward, because that direction has no protection at all** [R1]. Every other mechanism
here looks upward. Type `20` for a 200 g plate and the result is 2 units instead of 20 —
**eighteen units missing, roughly 540 mg/dL of untreated trend, toward ketoacidosis.** Nothing
in v3 looked down. §10.1.6 added exactly this asymmetry check for *settings* and it was never
carried to meal entry.

```
ELIGIBLE = the last 30 log entries satisfying ALL of:
             carbs > 0                    // correction-only doses excluded entirely
             advisoryFlagged == false      // §7.1 field, not a notion
             overrodeStacking == false

if ELIGIBLE.length < 10  ->  advisory DISABLED and declared. No baseline exists.

baseline = MEDIAN(carbs) over ELIGIBLE     // median, not max — poisoning-resistant

LOW  trigger:  carbs < baseline / 4    -> active whenever a baseline exists
HIGH trigger:  carbs > baseline * 3    -> ONLY IF baseline * 3 < 300 (the §4.5 cap),
                                          otherwise DISABLED and declared, not left dormant
```

**The eligibility contract is explicit because v4's was not** [R1-B1, R2]. v4 gated on ">= 10
entries carrying carbohydrates" but computed the median over "the last 30 entries" — two
different populations — while §7.4 demonstrably logs correction-only doses with `carbs: 0`.
After a correction-heavy stretch the median would drift toward zero, and the feature **inverts**:
the LOW trigger becomes unreachable — the sole under-dose defence, the entire point of the
redesign — while `baseline * 3 < 300` starts holding, so HIGH fires on *every genuine meal*.
Exactly backwards, from one ambiguous sentence.

**The minimum and the window both apply AFTER exclusions.** "Flagged" is now a stored field
(§7.1), not an undefined notion — v4 referenced it twice and gave the log no way to record it.

#### The message is a reminder, not an accusation [R1-B1]

> **20 g is smaller than your usual meals, which are around 150 g. Check that's right.**

v4 said *"Did you mean 200?"*, which is wrong copy on every genuine small entry. **A 20 g entry
is either a real snack or a 200→20 typo, and nothing at entry time distinguishes them** — the
false-positive set is identical to the true-positive set. Against a 150 g baseline this fires on
every snack under 40 g. The copy therefore has to read correctly in both cases, or it dies before
the one firing that matters (§10.5's own doctrine).

§6.6's coverage claim is downgraded accordingly: this is a *prompt to look*, not a filter.

**The unreachability guard is the lesson from v3** [R1-HIGH-2]. A trigger above the maximum
attainable value is dead code that looks like a safety feature. **Every trigger in this plan is
now checked against its own attainable range, and one that cannot fire is disabled and
declared** — never left in place implying coverage it does not provide.

**Anti-poisoning:** median rather than max; flagged and overridden rows excluded from the
baseline.

**Where "disabled and declared" renders** [R1]: on the settings screen, as a status line —
*"Meal-size check: not enough history yet (8 of 10 meals logged)"* or *"…upper check off — your
meals are large enough that it could never trigger."* **It does not take a §10.5 warning-budget
slot**, because it is a settings status, never a result-screen advisory.

**No window claim in the copy** [R2-F6]. v3 said "last month" while using the last 30 entries —
about five days at his rate, and a false factual claim. The message states the baseline value,
never a period.

**It never changes the dose.** Advisory text only, no tap, no gate.

### 6.6 Residual risk — restated honestly [R1, R2]

v3 understated this. The full picture:

| Error | Caught by | Status |
|---|---|---|
| Under-entered carbohydrates (200 → 20) | §6.5 LOW trigger | **Newly covered in v4** |
| Wildly over-entered carbohydrates (200 → 2000) | §4.5 carb cap | Covered |
| Over-entered *within* plausible range (40 → 240) | **nothing** | **Uncovered** |
| Any input error yielding a dose in 12–19 units | **nothing** | **Uncovered** — narrowed in v7 from 12–29 by the threshold move to 20 |
| **An injection taken after a *clamped*-to-zero result** (`correction + meal <= 0`; v11 wrote "negative correction ≥ meal", which has the sign backwards — it means the *magnitude* of the negative correction reaches the meal component [R2]) — §7.2 forbids logging a zero result, so the row cannot exist | **nothing** | **Uncovered — ADDED IN v11** [R1]. The stacking gate is blind to it for up to 12 h. The *suppressed*-to-zero case has an escape through §7.4.1's override; the clamped case has none. Narrow, and stated rather than papered over per this section's own standard |
| **Blood-sugar mis-entry** (350 → 530 gives +6 units; 350 → 150 under-doses) | **nothing** | **Uncovered** [R1] — §6.5 is carbohydrate-only by design and definitionally cannot see it |
| **Food weight entered instead of carbohydrate weight** (250 g plate → 25 units instead of 5) | **§6.2's confirmation, at every blood sugar** — the meal term alone is 25 units (§6.2). §6.5 HIGH adds a second look once calibrated | **Covered as a prompt to reread**, not as detection. §18.6 closed |
| Injection lost to a failed write plus restart, with an older row under 12 h | **nothing** | **Uncovered** [R1-B2] — see §7.5 |
| Wrong setting | §10.1.6 delta confirm, §10.3 breakdown | Partly |

**The over-entry case is genuinely uncatchable, and that is stated rather than implied away.**
For a user whose legitimate meals span roughly 150–250 g, a 240 g typo is statistically
invisible — no threshold, multiple or percentile separates it from a real dinner. §6.2's
confirmation **now does reach it** — 24 units is above the v7 threshold of 20, so the reread
prompt fires (**corrected in v9**, [R1, R2]; v6's text said "24 units is under 30" and survived
the threshold change). §6.4's bound still does not, and a prompt to reread is not detection.

The remaining defences are the §10.3 breakdown — which §10.3 itself says is necessary but not
sufficient — and the user reading it. **This is the largest unmitigated risk in the design.**

### 6.7 The usual-dose record — REDUCED IN v8 [R2, ruling adopted]

**v7 proposed a per-result divergence line** — beside every dose, "this is 11 units, you usually
take about 25." **v8 removes it.** The stored figure survives; the line does not.

#### Why it was removed

**Round 7 split on this and [R2] was right.** Three arguments, and the third is decisive:

1. **The behavioural direction is not predictable.** "11; usually 25" can produce following 11,
   substituting 25, or picking something between. Automation-bias research establishes that users
   follow erroneous decision support; it does **not** establish that a two-number warning safely
   resolves the conflict. That was a human-factors inference of v7's, not a measured result.

2. **It would corrupt the record it exists to serve** [R2]. If the line pushes him to inject 25
   after being shown 11, §7 logs 11 — and §7.4's stacking gate then reasons from a number that is
   not in his body, while the export the prescriber needs shows doses he did not take.

3. **The anchor is now known to be unsafe.** §1.4: 25 units has sometimes produced a reading of
   65 mg/dL. A line reading "you usually take about 25" beside a computed 5 would point at
   precisely the dose that caused the hypoglycaemia. **v7 built this guard believing 25 was the
   empirically safe number. It is not.**

**And the upper branch was dead on arrival** — both reviewers, independently. At a usual dose of
25 the ×2 trigger sits above 50 units while §6.4's bound caps every reachable dose at 45; it can
never fire, for any usual dose above 22.5. That is §6.5-v3's defect exactly, rebuilt one section
away, one revision after both reviewers taught it. **Recorded rather than quietly deleted**
(§19).

#### CUT IN v17 — the setting is gone [R1, R2, converged independently]

**v8 kept `usualDose` as a settings value reaching the export. v17 removes even that**, on the
user's objection and both reviewers' agreement.

**The user's argument, and it is the strongest of the three put forward:** his brother's fixed
24–25 units per meal is not a baseline, it is the pathology this calculator exists to replace. **A
calculator whose entire premise is that the dose varies with the meal and the reading cannot also
store a field asserting that it does not.** That is a contradiction in what the app *is*, not a
question about whether 25 is accurate.

Both reviewers, asked the question in isolation and without this document, reached the same
verdict:

- [R1]: *"a permanent, present-tense 'usual dose: 25' living in settings is exactly the assumption
  the owner refuses to let the app carry, and he is right on the substance."*
- [R2]: *"a permanent setting gives a historical habit the appearance of a current parameter."*

**The risk in cutting it with nothing in its place — which neither the user nor this document had
seen** [R1, R2 — both]: **he is motivated to abandon 25, and that is the point of the app.** If his
behaviour changes on day one, the 24–25 baseline vanishes unrecorded. The prescriber then sees a
log beginning at ~11 units with no evidence of the incumbent regimen, cannot judge the magnitude of
the change, and cannot connect the historical 65 mg/dL readings to the old practice. **The record
meant to settle 25-against-11 must have 25 on it.**

#### What replaces it — one optional question, asked at export [R2]

| | |
|---|---|
| **Asked** | At **export** — never at onboarding, so no field exists in settings for a later feature to reach for. **Re-offered at every export** until answered or declined (three states, below) |
| **The question** | *"Before you started using this app, how did you decide your mealtime insulin dose?"* |
| **The answer** | **Free text**, optional, skippable. A lone number loses the clinically meaningful part — the answer wanted is "24–25 units regardless of the meal or the reading", and it is the *regardless* that matters |
| **Stored as** | A dated note in **`meta.dosingHistory`** (§11.3), carried into the export envelope. **Not a setting.** No settings-screen row, no range, no §4.5 entry, no §11.8 constant |
| **Exported as** | *"Patient-reported dosing history before app use (self-reported, 6 Sep 2026)"* |
| **In the app** | **Only at the export prompt**, which shows an answer already given so it can be read back and corrected (below). No other screen displays it, and it enters no calculation |
| **Which export** | **Both of §7.7.1's**, over the one shared state — this section was written when there was one export. Answering at either satisfies both, and `declined` silences both |

#### Where it lives, and its three states — SPECIFIED IN v18 [R2 blocking, R1 concurring]

**v17 said "in the export envelope only" and gave it no store.** The export is a file the app
generates, not storage — so: answer at first export, close the app, reopen, export again, and the
answer is gone. Either the second export omits it or the app asks again, breaking "first export
only". Importing the original file hits the same missing destination. **That recreates the
missing-history problem this replacement exists to solve** [R2].

**Store:** one row in `meta` (§11.3), alongside `schemaVersion` — envelope-level, deliberately
**not** in `settings`, since never being a setting is the entire point.

```
meta.dosingHistory = { state: "unanswered" | "declined" | "answered",
                       text, answeredAtMs }
```

**Three states, because a boolean cannot tell "never asked" from "asked and declined":**

| State | What an export does |
|---|---|
| `unanswered` | **Offers the question** |
| `declined` | Offers nothing — he chose "don't ask again" |
| `answered` | Carries the text and its date. The export asks no question, but the prompt **displays the standing answer** so it can be corrected (rule 4 below) |

**Skip is not decline — ADDED IN v18** [R1]. v17 made this optional, asked exactly once, never
displayed again and with no re-entry path. **One hurried "Skip" — at an export, i.e. precisely when
he is busy and heading to an appointment — would permanently lose the record, unrepairably, because
the transition window does not recur.** So: **"Skip" leaves the state `unanswered` and the question
is re-offered at the next export.** Only an explicit "don't ask again" sets `declined`. Still never
a setting, still never shown outside an export prompt.

**The five state rules the three states did not settle — ADDED IN v19** [R1]. v18 fixed skip and
left the neighbouring transitions unstated; each is one line, and each closes a way the same record
is lost.

| Rule | Why |
|---|---|
| **Declining confirms first, stating the consequence** — §7.3's pattern, not a bare tap | "Don't ask me again" is a single unguarded tap into an **absorbing** state, offered at the identical hurried moment and sitting next to Skip. The confirm says *"you won't be asked again, and there is no other way to enter this later"* |
| **An empty answer is a skip, never an `answered` with empty text** | Otherwise the sentinel state silently becomes the absorbing one and the record is lost while reading as captured |
| **A missing row reads as `unanswered`** — the row is **not** seeded at database creation | An install that predates this feature, or a partial restore, must ask rather than assume; nothing has to write a row before the first export |
| **`answered` can be read back and corrected at the export prompt** | Without it the state is absorbing **and** write-only: a garbled or mistakenly submitted answer would be permanent, invisible to him, and exported to the prescriber forever. Correcting replaces `text` and re-stamps `answeredAtMs`, because the note is a self-report and its date is the date the standing text was given |
| **`declined` does not travel in the export**, so restoring from a file re-offers the question | Deliberate, not an oversight: the file carries no state field (§7.7), and a refusal recorded on one install should not silence a fresh one. The cost is one re-ask after a storage loss; the alternative is a permanent silence propagated by a file |

**Import** [R2, R1]: `dosingHistory` is **kept local, never overwritten**. An imported note is
adopted only into an `unanswered` state; where both exist, the local one wins and the imported one
is discarded, because it describes a different install's history. Stated so an implementer does not
have to choose.

**Second residual, stated per this section's own standard** [R1]: first export may fall weeks after
his behaviour changes, and recall degrades over that gap. The date stamp is the mitigation — a
prescriber can see the recall distance against the log's start date — not a fix.

**Free text, not a number, and the reason is clinical** [R2]. This is medication reconciliation —
recording actual use and discrepancies against the prescribed regimen — and the discrepancy here is
not the quantity but the *method*: a fixed dose irrespective of intake. A stored `25` cannot express
that; a sentence can.

**Never derived from the log** [R1, R2 — both, emphatically]. A log-derived "usual" manufactures a
normative number the prescriber can already read off the actual-dose column, and rebuilds from his
own data precisely the anchor v8 removed. Any summary of the log must say **"recorded doses"** and
name its date range.

**Residual hazard, stated rather than dismissed** [R2]: even a dated historical note can go stale,
can be read as clinician-approved, or can be copied into a current regimen. Past tense, the date,
and the explicit "self-reported" provenance are what keep its meaning clear. It is not risk-free;
it is the least-risk option that preserves the transition.

#### What the result screen shows instead

Nothing on the result screen, and now nothing in settings either. The disagreement between
calculation and habit is surfaced **once, at setup**, in §10.6's first-run disclosure — which is
*wording*, carrying no stored number — and the pre-app regimen reaches the prescriber through the
export note above. The gate that does real work at run time is **band C** (§1.4), which depends on
no ratio being right.

**§18.10 is closed by this.** The trigger and rank question disappears with the trigger.

## 7. The dose log

v1 excluded history for simplicity. Both reviewers rejected that and the user agreed to
include it: **"no decay model" does not imply "no log."** The one documented case of a dose
calculator *increasing* low-blood-sugar events was attributed to a missing active-insulin
function, studied on rapid analogs — Humulin R acts 5–8 hours, so the risk here is larger. And
every field is already on screen at calculation time.

**v2 added the log without threading it through the precedence order, the state snapshot or the
test spec.** That single omission produced one critical and four high findings in round 2. This
section is rewritten with those integrations made explicit.

### 7.1 What is stored

| Field | Source |
|---|---|
| `id` | stable event identity, generated once per injection |
| `timestamp` | clock at the moment of the "I injected" tap |
| `bloodSugar` | what the user entered, or an explicit "not entered" marker |
| `carbs` | what the user entered |
| `units` | the calculated dose, exactly as the app produced it |
| `injectedUnits` | **what he actually injected — NEW IN v8.** Defaults to `units`; editable at the moment of logging only |
| `settingsRevision` | **ADDED IN v13** [R1] — **the `revision` carried in the committed snapshot that produced the result** (§11.3 ROW STAMP), i.e. the settings **in force at calculation**. v14 still said "read from `settings.revision`", the wording §11.3 corrects for leaving the wrong build readable [R1]. Frozen at §7.2 step 1. v12 relied on this field existing and never listed it, so §7.2's "freeze every field §7.1 stores" excluded it by literal reading |
| `overrodeStacking` | whether §7.4's override was used |
| `timingAdvice` | `before` / `eat_first` / `suppressed` — the §8.1 decision made at calculation time [R1] |
| `advisoryFlagged` | true if §6.5 showed an advisory for this entry — **excluded from the baseline** |
| `deleted`, `deletedAtMs` | **ADDED IN v24** [R1, R2] — present only on a **tombstone** (§7.3), which carries these plus `id` and `timestamp` and **nothing else above**. Their presence is the discriminator: a row with `deleted` has no `units`, no `injectedUnits` and no `settingsRevision`, and every consumer that reads those fields must skip it |

About 70 characters per row; six doses a day is ~150 KB per year against 5 MB. Decades.

**Why `injectedUnits` exists — NEW IN v8.** §7.3 already labelled the column "calculated", not
"dose", because the two can differ. **They will now differ routinely**: the app computes 11 where
he currently injects 25 (§1.4), and until the prescription conversation happens he may keep
injecting what he was told to. A log that cannot record that is recording the wrong thing, and
two things read it:

- **§7.4's override wording and §7.5's caveat**, which quote an amount. **Not the suppression
  decision itself — CORRECTED IN v9** [R2]: §7.4 suppresses on *elapsed time*, so 11 units and 25
  units produce the same decision. v8's rationale overstated this. What the magnitude changes is
  every line that states a number — §7.4.1's "up to 180 mg/dL" is `units x ISF` — and whether an
  injection happened at all (zero versus positive).
- **The export.** The prescriber needs what happened, not what was suggested. [R2] made the same
  point from the other direction: a guard that widens the gap between recorded and actual
  degrades the exact record the appointment depends on.

#### `injectedUnits` is an INPUT, and v8 forgot to specify it as one — BLOCKING, FIXED IN v9

**[R1] found that v8 shipped `BACKLOG`'s "dose adjuster at the confirm step" and dropped its
constraint in transit.** The backlog entry reads: *"the adjuster must respect §6.2's confirmation
threshold and §6.4's bound. It must not become a way to type any number."* §7.1 v8 had none of
it — a free-entry insulin field with no grammar, no range, no zero rule and no stored
representation. A typo of 250 poisons every quoted amount and reaches the export; a typo of 2.5
for 25 under-counts insulin on board, the dose-raising direction.

| Property | Rule |
|---|---|
| **Grammar** | §4.2's whole-string grammar applies — it was written for blood sugar and carbohydrates only. Rejects `25g`, `2,5`, Unicode digits |
| **Representation** | §2.2's **integer hundredths**. A float here reintroduces the exact defect §2.2 exists to remove, in the export |
| **Finiteness** | Explicit `Number.isFinite` before any use |
| **Zero and negative** | **Rejected.** The tap asserts an injection happened; zero contradicts it. §7.2's "a zero-unit result cannot be logged" governs `units`, not this field, and needed saying |
| **Hard cap** | **100 units** — a U-100 syringe holds no more, so above it is a typo by construction |
| **Soft confirm** | Outside 0.5–60 units (§4.5), or on large divergence from `units` — **predicate defined below**. v9's prose named only the upper end; the range governs [R1] |

**"Large divergence" defined — ADDED IN v10** [R2, blocking]. v9 named this confirmation and gave
it no predicate, so an implementer could not tell whether a calculated 11 against an entered 25
must confirm. That is an unfinished safety gate, not a style question.

```
diverged =  |injected - calculated| >= 5 units
            AND ( injected >= 3 x calculated  OR  injected <= calculated / 3 )

if calculated == 0:  the ratio is undefined -> the absolute clause alone applies
```

**The `calculated == 0` branch is flow-unreachable, and is declared rather than left to look
live** [R1] — §6.5's own doctrine. §7.2 forbids logging a zero-unit result, so no tap exists at
zero; the branch is defensive specification for a total function and is tested directly rather
than through the interface.

**One residual the 3x ratio buys — RESTATED IN v12, because v11 got both halves wrong** [R1, R2 —
both, independently].

v11 claimed a typo of **52 for 25** passes silently at "2.1x". **That measured the ratio against
the wrong operand.** The predicate compares injected against **calculated**, not against the
amount he meant to inject. In this app's routine regime — calculated 11 against a habitual 25 —
a 52 gives `52 >= 3 x 11` and **is caught**. The silent pass exists only when the *calculated*
dose exceeds about 17.3 units, a regime he does not currently occupy. The residual is real but
narrower than v11 described.

v11 then compounded it: *"the gate over-counts insulin on board, which suppresses rather than
adds."* **§7.4 suppresses on elapsed time**, so a recorded amount never changes the suppression
decision — a correction this very section made in v9, eleven lines up-page, and then contradicted
here. What an over-count actually inflates is §7.4.1's quoted ceiling and §7.4's informational
line, biasing the human *against* overriding. The cautious-direction conclusion survives; the
mechanism given for it did not.

**Why a ratio of 3 and not 2.** His routine divergence is exactly the thing this must *not* fire
on: a calculated 11 against his habitual 25 is 2.3x, and it will recur at most meals until his
prescription is revisited (§1.4). **A 2x rule would fire on every injection he makes** — the
tap-through training that §6.2 warns against and the anchoring hazard that removed §6.7's line.
At 3x, an 11-unit calculation confirms above 33 or below 3.67: his 25 passes silently, a typo of
2.5 for 25 confirms, and a typo of 110 is already refused by the 100-unit cap.

**Why the 5-unit absolute floor.** Without it, a calculated 0.5 against an injected 2 is a 4x
divergence and would confirm — noise on doses too small for the difference to matter.

**Boundary cases pinned in §13.3**: exactly 5 units apart; exactly 3x; exactly one third; a zero
calculated dose with a positive injection; and the routine 11-against-25 case asserting **no**
confirmation.

**A hard refusal on a large-but-possible amount would be the wrong mechanism** [R1], for §11.3's
own reason: **the syringe precedes the tap.** Refusing to record what happened does not un-inject
it — it blinds the gate. The cap sits at physical impossibility, and everything below it is
confirmed, never refused. This is the same logic as "the injection is never discarded."

**Frozen at step 1, not read at step 3** [R1]. §7.2's transaction freezes the `id` and timestamp;
**v9 freezes the entire payload including both amounts**, because a retry that re-reads a mutable
draft is exactly the hole "captured at the tap" is meant to close.

**Constraints.** Captured at the "I injected" tap and never afterwards — §7.3's no-edit rule
stands, and this is a field of the logging action, not a later revision. Defaults to `units`, so
the common case stays one tap, and the commit control names the amount being recorded. Editing it
**must not** clear the result: §4.3 step 1 invalidates on any *calculation* input change, and the
logging draft is explicitly not one. It is **never** an input to §2 and never appears in §11.2's
dosing snapshot. Both numbers show in the history table, labelled *calculated* and *injected*.

**§18.12 is settled, not deferred** [R2]: under §6.5's eligibility predicate as written,
divergence alone **does not** exclude a row — the carbohydrates are still a true record of what
was eaten. Recorded as the v1 decision.

### 7.2 Logging is explicit, transactional, and idempotent [R2, R1-M2, R1-M3]

Automatic logging would fill the log with doses computed but never taken, making "last dose 2
hours ago" false in the exact field the safety gate reads.

**One commit, and it is a transaction, not three independent effects.**

**Which tap is the commit — SPECIFIED IN v23** [R2]. Logging takes two screens: the result screen's
*"I injected this"*, then the amount screen that pre-fills `injectedUnits` with the calculated dose
(§7.1). **The commit is the second tap.** v22's mockups implied the first, which would freeze the
payload before `injectedUnits` was known and make the amount screen an edit — and §7.3 forbids
editing a logged row. The first tap opens the amount step and writes nothing; the second freezes,
stamps, records and writes. **§7.1's `timestamp` and §8.1's eat-by clock are both taken there**, so
the record's time and the timing advice cannot disagree.

Then, in order:

1. Generate the event `id` and **freeze the entire payload** — timestamp, `units`,
   `injectedUnits`, and every field §7.1 stores. **CHANGED IN v9** [R1]: v8 froze only the `id`
   and timestamp, so a retry could re-read a mutated draft and persist a different amount than
   the one consumed in step 2.
2. **Immediately mark the result consumed in memory**, record the injection for the stacking
   gate, and remove the button.
3. **Then** write and verify the row.

**Consumed state is decoupled from persistence — CHANGED IN v4** [R2-F3]. v3 marked the result
consumed only *after* a verified write, and abandoned the dose for stacking if the write failed.
That is backwards: the button means **"I injected this"**, and the injection has already
happened. A failed disk write does not make it unknown to the running session.

On write failure the app enters a **pending-save** state — *"Couldn't save this yet. Retrying."*
— with retry. The in-session stacking gate still knows about the dose. Only a restart before a
successful write loses it, and §7.5's caveat line then applies.

**The timer carries its eligibility, it is not recomputed** [R2-F4]. v3 started the eat-at timer
unconditionally, so logging an injection in band B displayed "eat around 7:30 PM" directly
contradicting band B's "eat first, then inject." And recovery could not reconstruct the band,
because the row lacked the target and sensitivity that produced it.

The log row therefore stores `timingAdvice` — the decision made at calculation time (`before`,
`eat_first`, or `suppressed`) — and the timer, the logged-state wording and restart recovery all
read that stored value. The band is never re-derived from settings that may since have changed.

**Failure and edge behaviour, all specified:**

- **Write fails** (quota, private mode, storage throws): *"Couldn't save this yet — retrying.
  This dose is still counted while the app stays open."* **The timer starts regardless** — the
  injection happened and he still needs the eat-at guidance.

  **Corrected in v5** [R1-B3, R2]. v4 rewrote the paragraph above to decouple consumed-state from
  persistence, then left this bullet claiming *"the stacking check will not know about this
  dose"* and *"do not start the timer."* Both became false under v4's own logic, and an
  implementer could not satisfy both specifications. A fix's leftover copy recreating the error
  it removed — the round-3 defect class, verbatim.
- **Repeated tap / retry:** idempotent on `id`. A retry never creates a second row and never
  moves the timestamp. Two taps cannot log 52 units.
- **After a successful tap** the result enters a terminal *logged* state — *"Logged 26 units at
  7:00 PM — eat around 7:30 PM"* — and the button is gone. A second injection requires a new
  calculation.
- **A zero-unit result cannot be logged.** Zero units establishes no insulin activity.
- **Tap after §8.2 expiry** is permitted with amended wording (the log records what he did, and
  he may genuinely have injected at minute 16), but the recorded timestamp is the tap time and
  the wording says so.
- **Restart mid-transaction:** a verified row without a started timer is reconciled on next
  load by recovering the timer from the row. The storage state is authoritative, not the UI.

### 7.3 Delete only, with consequence [R1-H3]

No edit. Deleting the most recent entry falls the gate back to the previous one.

**But delete is a frictionless bypass of the stacking gate**, and §4.6's own argument applies
verbatim — users learn the escape route. Delete also legitimately means two things the app
cannot distinguish: *"I never actually injected this"* (the gate should forget it) and
*"tidying up"* (it should not).

**Therefore: deleting a row whose timestamp is inside the last 12 hours requires a confirmation
that states the consequence.**

> **Delete the 6 units from 2:00 PM?**
> The stacking check is currently using this dose. Delete it only if you did **not** inject it.

Deletions inside the window leave a tombstone, so a pattern of deleting-to-bypass is visible in
the history rather than invisible.

#### The tombstone had no stored shape — SPECIFIED IN v23 [R2]

**This section has required tombstones since v2 and no revision ever said what one is.** §7.1's row
list, §11.3's stores and §7.7's envelope all omit them, so the requirement was unimplementable in the
same way §7.9's grouping was: readable, agreed, and with nothing to build.

A tombstone is a **row in `log`**, not a new store — it belongs to the history it makes legible, and
a separate store would need its own merge, export and clearing rules for no gain:

| Field | |
|---|---|
| `id`, `timestamp` | as §7.1, **preserved from the deleted row** — the tombstone stands where the dose stood |
| `deleted` | `true`. Its presence is what makes the row a tombstone |
| `deletedAtMs` | when the deletion happened, which is the part a pattern is visible in |
| everything else | **gone.** No `units`, no `injectedUnits`, no `bloodSugar`, no `carbs` |

**The dose values do not survive**, and that is the point rather than an economy: §7.3 exists because
delete legitimately means *"I never injected this"*, and a tombstone that kept the amount would
re-create the ambiguity the deletion resolved.

Consequences, each of which an implementer would otherwise decide alone:

- **Excluded from §7.4's stacking gate and §6.5's carbohydrate baseline.** A tombstone is the record
  of an absence; feeding it either mechanism would make deleting a row change a dose, which is the
  one thing §7.3 must not do.
- **Excluded from every count the user is shown** — §7.9's *"delete 67 entries"*, §7.7.1's per-period
  totals, §7.7's envelope counts. He deleted those rows already.
- **It travels in the export and dedups on `id` like any other row** (§7.7), so a restore cannot
  resurrect a deleted dose by importing a backup taken before the deletion. **This is the only reason
  the tombstone must be exported at all**, and it is a good one: without it, import's merge sees an
  `id` it does not have and adds the dose back.
- **A tombstone wins over a live row with the same `id` on import**, in either direction. Deletion is
  the later statement of intent, and §7.5's merge rule — *"never replaces history wholesale"* — needs
  a tiebreak here or the outcome depends on file order.
- **"Clear the record" removes them with everything else.** They are part of the record, and §7.9's
  own reasoning already says 67 tombstones in a cleared history is not a record of anything.

**Only deletions inside `DELETE_CONFIRM_WINDOW_HOURS` leave one.** Outside the window §7.3 requires
no confirmation, there is no gate to bypass, and a tombstone for every tidied old row would bury the
signal it exists to show.

**v8's known gap is closed** [R1, R2 — both]. This paragraph previously read "if he injects a
different amount than calculated, the log cannot record it." **That is now false** — §7.1's
`injectedUnits` records exactly that, and an implementer reading only this section would have
built the wrong log. Third occurrence of this document's own named class: a fix's leftover copy
recreating the error it removed (§19).

**The delete confirmation quotes the injected figure**, not the calculated one — it is the number
§7.4 is using and the number he acted on.

### 7.4 The stacking rule — CRITICAL FIX [R1-C1, R2-CRITICAL]

**v2 said "suppress the correction term." That was wrong and dangerous.** The correction may be
negative, in which case it *reduces* the dose — so suppressing it *raises* the dose, in exactly
the situation where he already has insulin on board and is below target.

Traced by both reviewers independently:

| | Blood sugar 100, 60 g, injected 6 units 2 h ago | Blood sugar 90, 30 g, injected 2 h ago |
|---|---|---|
| Correction | −1.667 | −2 |
| Meal | 6.0 | 3.0 |
| **Correct dose** | **4 units** | **1 unit** |
| **v2's rule** | **6 units** | **3 units** |

The gate whose purpose is preventing over-insulinization handed out *more* insulin, while band B
simultaneously displayed "you are well below target", and the message presented the larger dose
as the cautious option. This was a fresh instance of the defect §2.1 calls non-negotiable.

**The corrected rule — suppression applies only to a POSITIVE correction:**

| Since last logged injection | Correction | Behaviour |
|---|---|---|
| under 4 hours | **positive** | Suppressed → meal only. Override available (§7.4.1). |
| under 4 hours | **negative or zero** | **Applied in full, always.** It is the safety-direction term. Informational line only. |
| 4–12 hours | any | Applied in full. "Last dose: 6 units, 5 hours ago — may still be acting." |
| over 12 hours | any | Applied in full. No line. |
| **no usable record** | any | Applied in full, plus §7.5's line. |

**The meal term is never touched.** Food needs covering regardless of what is on board.

A correction-only dose (zero carbs) inside 4 hours is suppressed to zero units — with the
override, since blocking outright is what drove users to delete rows.

**Twelve hours, not eight** [R2]. v2 used 8 while simultaneously noting action extends "toward
18 hours at large doses" — a contradiction. Twelve is chosen because the line is informational
only, so erring long is free. **No decay model, now or ever**: dose-dependent duration makes a
fixed curve false precision.

#### 7.4.1 The override — fully specified [R1-H5]

v2 said "user may override deliberately" and specified nothing. That is a rubber stamp by
omission, and the legitimate need is real: an injection into a scarred site that did not absorb,
insulin degraded by heat (a genuine concern in a Pakistani summer), illness, or an
under-counted previous meal. In those cases the gate's assumption is simply false.

**The override states the consequence in his own units, never "are you sure?":**

> **You injected 6 units 2 hours ago.**
> That insulin may still lower you by up to **180 mg/dL** on its own.
>
> Covering carbohydrates only: **4 units**
> [ Add the correction anyway → 10 units ]

**The candidate dose is hidden when it would need confirmation — NEW IN v4** [R2-F2, R1-M5].
v3's button printed the resulting total unconditionally. At blood sugar 600 with 200 g the
override candidate is 35 units — past the 20-unit threshold (**v4-era value corrected in v9**,
[R1]) — so the button disclosed exactly the
number §6.3 requires withheld until the input-check tap, defeating its own claim that it "cannot
reveal a previously hidden correction." When either the meal-only figure or the override
candidate reaches the threshold, the panel shows **no numbers** and defers entirely to the §6.2
confirmation flow, including in the accessibility tree.

180 = 6 units × sensitivity 30. **This is a ceiling, and v4 says so in the copy** [R1-M4]. v3
presented it as an estimate, which overstates by roughly 2x: at two hours into a ~6 hour profile
about 110–135 mg/dL genuinely remains, and by 3.5 hours only 65–90. Overstating discourages a
correction that is actually needed — at blood sugar 400 he would wait for 180 that is not coming
and sit near 310 for hours, which §3.1 calls the unsafe direction.

The wording is therefore *"at most about 180 mg/dL — likely less this far in"*, never a bare
figure. The bias direction (toward preventing lows) is defensible; presenting a ceiling as a
point estimate is not.

- The override is **recorded on the log row** (`overrodeStacking`), so a pattern is visible.
- **The override resets to false on any input, setting, mode or threshold change** [R1-LOW-9].
  v3 listed `stackingOverride` as an invalidation *trigger* but never as a *target*, so it could
  survive a change to the very inputs it was granted for.
- Using it **recomputes the total and re-runs the §6.2 confirmation** — it cannot reveal a
  previously hidden correction under an earlier acknowledgement [R2].
- It occupies a slot in the §10.5 warning budget.
- Honest limitation, stated in the plan: at hour 3 the only available options are 0% or 100% of
  the correction. Both are wrong in some situations, and without a decay model that is
  irreducible.

### 7.5 Missing history has no safety meaning [R2]

The app knows only the last **recorded** injection. A backup from yesterday passes every schema,
type and range check while omitting an injection from an hour ago; storage loss followed by
settings re-entry does the same.

**"No usable recent record" must never silently assert "no recent insulin."** When the log is
empty, or its most recent entry predates the app's own install, or history was just imported:

> No recent dose recorded. If you injected within the last 4 hours, this correction may stack.

This is v1's static banner — but now shown only when there is genuinely no data, so it carries
information instead of becoming furniture.

**Two different lines, two different conditions — CORRECTED IN v5** [R1-B2, R2].

| Line | Fires when |
|---|---|
| §7.4's *"Last dose: 6 units, 5 hours ago — may still be acting"* | elapsed is 4–12 h |
| §7.5's *"No recent dose recorded…"* caveat | **no usable record within 12 h** *and* **provenance is suspect** — empty log, log predating install, history just imported, or a row excluded by §7.6 |

v4 dropped the provenance condition and fired purely on "older than 12 hours, or absent." That
collided with §7.4's "over 12 hours → No line" for identical data, and made the caveat fire after
**every overnight gap** — furniture on a daily schedule, the exact failure the rewrite was meant
to prevent, while the history screen showed last night's dose one tap away.

**Residual, stated rather than papered over** [R1-B2]: if the "I injected" write fails *and* the
app restarts before a retry succeeds, that injection is lost to the gate. If an older row under
12 hours exists with clean provenance, neither line fires; a row 4–12 hours old fires §7.4's
informational line but names the **wrong dose**. Either way a correction may be applied over
insulin minutes old —
up to ~180 mg/dL unaccounted. v4 claimed §7.5's caveat covered this; it does not. **This case is
not fully catchable** and is recorded in §6.6.

**Import is a merge, not a replacement.** Deduplicate on `id`. Out-of-order and duplicate rows
are handled explicitly. An import invalidates any open result and confirmation (§4.3 step 1).

### 7.6 Time handling [R2]

- Timestamps stored as absolute epoch milliseconds.
- Clock discontinuity and restart semantics are passed into the pure core **as data**, never
  pre-reduced to an unquestioned elapsed number.

**Mutually exclusive cases — REWRITTEN IN v4** [R1-HIGH-3, R2-F5]. v3 had two bullets giving
**opposite outcomes for the same physical row**: "a future timestamp is excluded from the gate"
and "negative elapsed time lands in the suppression branch" describe an identical condition, and
exclusion is the **dose-raising** direction. Traced: he injects 6 units with the clock running an
hour fast; the clock auto-corrects; the row is now future-dated, gets excluded, the gate falls
back to an older row beyond 4 hours, and a correction that should have been suppressed is applied
in full **on top of about 6 units still on board — up to ~180 mg/dL unaccounted.**

| Elapsed | Case | Behaviour |
|---|---|---|
| 0 to 12 h | normal | Gate as per §7.4 |
| −1 h to 0 | small forward skew | **Treated as elapsed zero → suppression branch.** Safe direction. |
| below −1 h | implausibly future-dated | Excluded from the gate **and** §7.5's caveat line is shown. Exclusion never silently restores a correction. |
| above 12 h | too old | No line |

**The governing rule: exclusion is never silent — but it has its own wording** [R2].

v5 said an excluded row "triggers §7.5's caveat." That contradicts §7.5 whenever a *usable*
record also exists: a row excluded for a future timestamp **plus** a usable injection five hours
ago would display "Last dose, 5 hours ago" and "No recent dose recorded" simultaneously.

| Situation | Line |
|---|---|
| Row excluded, **and** a usable record exists | *"One dose record has an invalid time and is being ignored."* Shown alongside §7.4's normal line. |
| Row excluded, **and** no usable record within 12 h | §7.5's missing-history caveat |

The app never converts "untrustworthy record" into "no insulin on board" in silence — but it
also never claims there is no record when one is visibly in use.

### 7.7 History screen

Date, time, blood sugar, carbohydrates, calculated units, injected units, override marker. Delete
per row with §7.3's confirmation. No editing, no charts, no analysis.

**Export has two blocks, not one — CORRECTED IN v8** [R1, R2 — both]. v6 and v7 described export
as log-only while §1.3 legislated that the basal regimen must appear in it. An implementer
building from this section alone would have dropped it.

```
{ "schemaVersion": 1,                        // ADDED IN v9 — §11.3 rejects
                                             // future schemas; v8 gave it
                                             // nothing to read
  "settings":       { target, isf, icr, mode, threshold,
                      basalName, basalUnits, basalTiming },  // §1.3
  "dosingHistoryBeforeApp":                  // §6.7 — present ONLY when the
      { answeredAtMs, text },                // state is `answered`. Absent for
                                             // `unanswered` and `declined`, and
                                             // the state itself is never exported
                                             // (§6.7) — same ruling the empty
                                             // `settings` block got in v14
  "settingsHistory":[ { revision, changedAtMs, target, isf, icr, mode } ],
  "readings":       [ ...§7.8 rows... ],
  "log":            [ Injection | Tombstone ],   // §7.3 — CHANGED IN v24
                                             // an Injection carries settingsRevision;
                                             // a Tombstone carries id, timestamp,
                                             // deleted, deletedAtMs and nothing else }
```

**Current settings are not the settings that produced a historical row — FIXED IN v9** [R2,
blocking]. A dose calculated at carbohydrate ratio 10 stays 11 units forever. Change the ratio to
15 and v8's export still presented a single settings block reading 15, so a prescriber would read
every historical row as though 15 produced it. **The claim that the export supplies "the ratios
that produced them" was false.**

Each log row therefore carries the `settingsRevision` in force when it was calculated, and the
envelope carries the revisions themselves. The settings store gains a `revision`, **allocated, owned and stamped
per §11.3's three-part rule**, written in the same transaction as any calculation-affecting
settings change and polled by the same `stateToken` layer 2 already uses. **A threshold-only
change does not bump it** [R1] — `settingsHistory` carries no `threshold`, so an identical-values
row would be noise.

**The `logRevision` analogy is deleted here, on the third attempt** [R1, R2 — both, twice]. v10
wrote that this used "the same mechanism `logRevision` already uses"; §11.3 shows the analogy is
false — `logRevision` is a counter whose value is never a key, and this one is a primary key — and
that false analogy is what produced round 11's blocker. **v12 left it standing inside its own fix.
v13 then added a note claiming it had been removed and removed only part of it**, leaving the tail
of the same sentence intact, so the document asserted a false fact about its own contents. It
survived a targeted grep because it wrapped across a line break. Deleted in full in v14.

**Import semantics, which v8 left to the word "merges"** [R2]: log rows and readings are merged by
`id`. **Settings are never silently replaced** — an import proposes them, and adopting any of them
runs §4.5's hard range checks and §10.1.6's delta confirmation exactly as typing would.
`settingsHistory` is read-only provenance and is never adopted.

**Revision identity across an import — SPECIFIED IN v10** [R1, blocking]. `settingsRevision` is a
bare monotonic integer with no identity across installs, and the plan's own recovery flow breaks
it: §1.2 says storage loss requires re-entering the settings, so the user re-enters them
(producing local revisions 1..k) and *then* imports the backup (carrying an unrelated 1..n).
Merging by revision number collides and attributes rows to settings that never produced them —
**the exact falsity this whole mechanism was added to remove, now in front of the prescriber.**
Discarding the history instead leaves imported rows pointing at nothing.

**Rule: imported revisions are remapped, never merged by number.** On import into a non-empty
store, each imported `settingsHistory` entry is appended at `max(localRevision) + 1` onward, and
every imported log row's `settingsRevision` is rewritten to its new local id in the same
transaction. Identity is preserved by *remapping*, not by hoping the integers agree.

**When no settings have ever been committed, the envelope's `settings` block is present and
explicitly empty** — **ADDED IN v14** [R1]. v13's composed test exports from exactly this state
(import-into-empty, before the first commit) and §7.7 specified the block unconditionally without
saying what it holds when nothing was ever committed, leaving the test to a judgement call.

**Import into an *empty* store keeps the imported numbers** — the complement of the rule above,
stated in v11 rather than left implicit [R1].

**Re-importing your own backup appends duplicate `settingsHistory` entries.** Log rows dedup by
`id` and keep their local revisions, so **attribution stays truthful** and no dose or export claim
becomes false; the cost is orphan history rows. Accepted as cruft, recorded so it is not
rediscovered as a defect [R1].

**§13.3 case:** import into a non-empty store, then export — every row still attributed to the
settings that produced it. v9's export case covered the single-install path only, so nothing would
have caught this.

**The `log` array holds two row shapes, and v23 specified one of them and not the envelope —
FIXED IN v24** [R1, R2 — both]. §7.3's tombstone exports *"like any other row"*, and this envelope
said every log row carries `settingsRevision` while §7.7's import **remaps that field on every
imported log row**. A valid exported tombstone therefore lacked a field the importer required, on
exactly the restore path tombstones exist to protect — and the remap step had an unspecified branch
(skip, throw, or misattribute) with no rule to pick between them.

**The contract is `Injection | Tombstone`, discriminated by the presence of `deleted`:**

| | Validated against the prescription? | `settingsRevision` remapped on import? |
|---|---|---|
| Injection | Yes — §4.5, §2.3, and every rule §11.3 re-validates | **Yes** |
| Tombstone | **No.** It asserts an absence; there is nothing to range-check | **No** — it carries none |

**v23 named §7.1, §11.3 and §7.7 as the three places the tombstone was missing from, then fixed
§7.3 alone.** The other two are corrected here: §7.1's row list gains the shape, and §11.3's `log`
line no longer reads "one record per injection". Naming the omissions is not repairing them, and a
section that names three and repairs one reads as though it repaired three.

**`settingsHistory` deliberately omits `threshold`** [R1]: it never changes a dose value, so no
consumer needs its historical setting. Stated so it does not read as an oversight.

**The settings block is why the export is worth anything to a prescriber**: a table of readings
and doses without the ratios that produced them cannot be reasoned about.

**Consequence:** the log makes stored data valuable, so export/backup and the **"last saved a copy
you can restore from: N days ago"** prompt are in v1 (§12). The prompt's wording is §7.7.1's — it names the
control that produces the file, and the field it reads is §11.3's `meta.backup`.

#### 7.7.1 Two exports, named by purpose — NEW IN v21 [Momin]

Until v21 there was **one** export, the JSON envelope above, readable by exactly one program: this
app's own import. That made the record's survival permanently conditional on this app continuing to
exist and continuing to import that schema. §11.7 already accepts that storage is origin-keyed and
**"a later move loses every logged dose and setting unless the user exports first"**, so the export
*is* the record's survival path — and a survival path only one program can read is not one.

**This is not a prescriber feature.** It is for him, his family, a future clinician, a second
opinion, and his own reading in five years.

| | **Move to another phone** | **Save the record** |
|---|---|---|
| **Format** | The §7.7 JSON envelope | A **self-contained HTML file** |
| **For** | Continuity of the app — restoring onto a new device, via §7.7's import | The record itself, readable by anyone, on anything |
| **Contains** | Everything, machine-shaped | Everything, rendered |
| **Restores?** | **Yes** — this is the only file import accepts | **No**, and it says so on its face |
| **Counts as a backup?** | **Yes** | **No** — see below |

**Named by purpose, not by format** (§10.1): the controls say what the person is trying to do. Neither
is labelled by its file type, and §10.2's no-abbreviations rule applies to both.

**Why HTML and not PDF.** A PDF library is 200–400 KB in an app that otherwise ships no
dependencies, and buys nothing: a self-contained HTML file opens on the phone without a computer,
shares through WhatsApp, and **prints to PDF through the browser's own dialog for free**. CSV was
considered and declined — it cannot carry the per-prescription attribution below legibly, and it
presents a medical record as a spreadsheet.

##### The backup counter tracks the JSON only

§12's *"last backup: N days ago"* prompt must count **only** the JSON export. If it counted any
export, saving the readable file weekly would report a recent backup while nothing restorable
existed — **a false safety claim, which is the class §7.5 condemns**. Stated explicitly because the
obvious implementation wires the counter to "any export".

**And it needs a store, which v21 legislated it without — FIXED IN v22.** §12 has asked for this
prompt since v1 and no revision ever gave the timestamp a home; v21 then wrote a rule about what the
counter may count, against a §11.3 schema with no field to count into. **This is §6.7's v17 defect
exactly, four revisions later**: v17 placed the dosing note in the export envelope and nowhere else,
the envelope turned out to be a file the app generates rather than a store, and v18 had to give it a
`meta` row. The same answer applies for the same reason.

| | |
|---|---|
| **Stored as** | `meta` row `{ k: "backup", lastJsonExportAtMs }` (§11.3) — alongside `dosingHistory`, envelope-level, not a setting |
| **Written by** | The JSON export, and **only** on a completed write — defined below |
| **Read by** | §12's prompt, and nothing else. It enters no calculation and appears on no result screen |
| **Cleared by** | **Both** §7.9 operations. "Start over" takes it with the database; **"clear the record" must reset it explicitly**, or a timestamp claiming a recent backup outlives the record it described. The cleared state is reachable and needs its own string — clear the record, then log one dose, and the prompt un-suppresses with nothing behind it: **"No copy saved yet"** |
| **Suppressed when** | `log` and `readings` are both empty. A fresh install and a just-cleared record have nothing to protect, and §10.5's doctrine is that a prompt firing with nothing behind it teaches the user to dismiss the one that matters |

**"A completed write" needs an observable definition — ADDED IN v23** [R2]. The browser gives two
delivery routes and neither reports what this counter claims:

| Route | What resolution actually proves |
|---|---|
| A download (`Blob` + save) | **The download was started.** It is the strongest signal the platform offers, and it is still not completion — a download can be cancelled or fail afterwards, and nothing reports that back |
| **Web Share** | **The share sheet was dismissed without error.** It does not report which application received the file, or that anything saved it |

**The counter is set on the download route only.** A share that resolves is not evidence of a stored
copy, and treating it as one is the same false safety claim as counting the readable export — arrived
at from the other direction, and less obvious, because the promise really did resolve.

**And the string is honest about what it knows.** *"Last moved to another phone"* overstates a local
download — the app cannot see another phone — and **v23's replacement, "last saved", overstates it
too** [R2]: what the app observes is that a download *started*. It reads **"Last made a copy you can
restore from"**, which claims only the act the app performed. The two export controls keep their §10.1 names — those
describe intent, and intent is what a control is for — but a *counter* reports a fact, and it may
only report the fact it has.

**And the prompt has to say the control's name — CORRECTED IN v22, RESTATED IN v23.** §12 has carried the string
*"last backup: N days ago"* since v1, and §7.7.1 then named the controls *move to another phone* and
*save the record* under §10.1 — leaving a prompt that reports the freshness of a **"backup"** the
interface offers no way to make, because no button anywhere says that word. §10.1's naming rot,
introduced by the section that invoked §10.1. The string is:

> **Last made a copy you can restore from: 12 days ago**

*"Backup counter"* stays as this document's internal name for the field; it is not copy. §7.7 and §12
were updated in the same edit; **the one remaining quotation of the old string is the historical one
at the head of this subsection, which is what a retired wording is supposed to look like** — v22
claimed no section quoted it at all, twenty-nine lines below a subsection heading that does [R1].

##### The readable file is grouped by prescription period, not sorted by date

This is §7.7's attribution rule carried into a human rendering, and it is the reason the readable
file is not simply a table. A dose calculated at carbohydrate ratio 10 stays 11 units forever;
printing every row under one current settings block makes them all read as though today's ratios
produced them — **the exact false claim v9 was corrected to remove**. A flat date-sorted table
reintroduces it in prose.

Grouping by `settingsRevision` resolves it structurally, so the document cannot misstate what
produced a row:

```
1 unit covers 10 g · 1 unit lowers 30 mg/dL · target 150
   18 Aug – 2 Sep          47 doses, 6 readings
   ... rows ...

1 unit covers 12 g · 1 unit lowers 30 mg/dL · target 150
   3 Sep – 6 Sep           11 doses, 3 readings
   ... rows ...
```

**Doses and readings are placed by different rules, and v21's example quietly assumed one rule for
both — FIXED IN v22.** The example prints a reading count inside every group. **§7.8's row carries no
`settingsRevision`** — it is `id`, `timestamp`, `bloodSugar`, `note`, and that is deliberate: a
reading enters no calculation, so no settings produced it. As written, the grouping was unbuildable.

| | Placed by |
|---|---|
| **A dose** | Its **stamp** (§11.3's ROW STAMP) — authoritative, and never re-derived from its timestamp |
| **A reading** | Its **timestamp falling inside the period's date range**, where periods are ordered by **`changedAtMs`** and a reading takes the latest period whose start precedes it |

**Do not fix this by adding a revision to readings.** Stamping a reading with the ratios in force
would attach §7.7's attribution claim — *these settings produced this row* — to a row nothing
produced, manufacturing in the `readings` store precisely the false statement §7.7.1 exists to
prevent in the rendering. The period is a span of time; a reading is an event in that span. That is
all the document should say, and deriving placement from the boundaries §11.3 already stores says
exactly it, with no schema change.

**Periods are ordered by `changedAtMs`, not by revision key — FIXED IN v23** [R1, R2 — both]. v22
wrote *"to the next revision's"*, and "next" has only one meaning against a numeric primary key.
**After an import the key order is not chronological**: §7.7 appends imported history at
`max(local) + 1` while §11.3 keeps **the other install's `changedAtMs`**. Run §1.2's own
storage-loss flow — re-enter the settings by hand (local revisions 1..k, today's timestamps), then
import the backup (k+1..k+n, last year's timestamps):

```
key order:   1..k  (recent)   then   k+1..k+n  (old)
period k  ->  [recent, old)  ->  EMPTY
period k+n -> [old, ->)      ->  the open-ended one, and it swallows the present
```

Every reading he records from that moment on falls inside **an imported prescription from the other
install**, and prints under its header — while the dose beside it, placed by its stamp, groups
correctly. **A false attribution in the clinician-facing document, silent, on precisely the recovery
path the remap machinery exists for.** Ordering by `changedAtMs` is the whole fix, and it costs one
comparator.

v22 handled the reading that falls **outside every period** and never the one that falls **inside the
wrong one** — the same import path produces both, and only one had a rule. §13.3 gains the
composition that would have caught it: non-empty import, then a reading, then the readable export,
asserting the reading lands under the **local in-force** prescription.

**Chronological order is necessary and not sufficient — EXTENDED IN v24** [R2]. Ordering by
`changedAtMs` fixes the older-import case and leaves the newer-import one open: an imported revision
whose `changedAtMs` is *later* than the locally in-force one would capture readings recorded after
the import, under a prescription **this install never adopted**. §7.7 is explicit that import
*proposes* settings rather than adopting them, so an imported revision was in force on the other
phone and never on this one.

**The timeline is built from revisions that were in force on this install.** An imported period
bounds only readings that arrived with the import; readings recorded after the import point are
placed against the locally in-force revision, whatever its `changedAtMs` says. **Re-importing your
own backup is the case that makes this concrete**: §7.7 already accepts that it appends duplicate
`settingsHistory` entries, and without this rule a reading migrates into the duplicate group while
the dose beside it keeps its original stamp — the same row pair, split across two prescriptions.

**A reading outside every period gets its own labelled group**, never the nearest one. It should be
unreachable — §1.2 makes settings mandatory before anything is recordable — but §7.7's import path
remaps revisions across installs, and a rendering that silently attaches an unplaceable row to an
adjacent prescription is back to inventing attribution. Visible and odd beats invisible and wrong.

##### It states what it is not

One line on the file itself: **this is a readable copy, and to move the record to another phone the
other control is the one to use.** Without it, someone saves this file, believes it is their backup,
and discovers otherwise when the phone is gone.

##### It carries everything, including the refusals

§7.8's **readings with no dose** are in it. The 65 mg/dL events are the entire reason that store
exists, and a "history" showing only injections hides exactly the events this project was built
around. Also present: the basal regimen (§1.3), §6.7's dosing note when `answered`, the date range,
and the counts.

**It is a human-readable rendering, so §10.4 governs its times** — 12-hour with AM/PM, noon and
midnight written out — and §10.2 governs its words. The JSON envelope remains epoch milliseconds and
is unaffected.

**§6.7's question is offered at both exports, over one shared state — SETTLED IN v22.** §6.7 says the
question is asked *"at export"* and *"re-offered at every export"*, written when there was one export;
v21 split export in two and left the sentence pointing at both and neither. **Both**, for the reason
the question exists: the note's job is to put *"24–25 units regardless of the meal or the reading"* on
the record a clinician reads, and the readable file is the one a clinician is most likely to actually
open. The state in `meta.dosingHistory` is shared, so answering at either satisfies both, and §6.7's
three states absorb the rest — `declined` silences it permanently, and that is what stops two export
controls from becoming twice the prompting.

##### The file is generated, so everything in it is escaped — ADDED IN v22

**v22 decided to render user-authored text into an HTML document and did not say this, so it is said
here.** **Three** values in the record are free text rather than numbers or fixed choices: §6.7's
dosing note, §1.3's `basalName`, and §1.3's `basalTiming` — **v22 said "two" and both reviewers
counted three**, §1.3 having stated outright that the name field and the timing field are both free
text. The miscount changed nothing, because the rule below is deliberately blanket rather than a
list; it is corrected here so §13.3's render case exercises all three.

- **Every value is HTML-escaped on the way in.** Not only the free-text ones — escaping *some*
  fields is how the unescaped one is eventually found, and there is no field here whose meaning is
  markup. **v22's own miscount is the argument**: a rule written as "escape these two" would have
  shipped with `basalTiming` unescaped.
- **The file contains no script at all.** It is a document: text, a stylesheet and nothing else.
  This is not defence-in-depth about the app's own values, it is about where the file goes — the
  whole point of the format is that it forwards through WhatsApp and opens on someone else's phone,
  and a self-contained page that runs code is a worse thing to forward than one that does not.
- **§7.8's `note` is from a fixed list** and is therefore already safe, which is worth noting only
  so a later revision that makes it free text knows what it is inheriting.

Recorded rather than left implicit because the same value has an established safe path elsewhere and
that is not evidence about this one: §11.3 requires the recovery block be plain text, reasoning that
*"plain text prevents injection but does not establish meaning."* The JSON envelope has no such
exposure — `JSON.stringify` escapes by construction — so **this hazard is created by v22's format
choice and exists in exactly one place.**

##### One risk, accepted and recorded

The readable file is his complete medical record in plain view, and the property that makes it
useful — that anyone can open and forward it — is the property that makes it leak. Recorded rather
than mitigated, following §11.7's precedent for accepted risks. No password, no encryption: both
would defeat the purpose and neither survives the file being forwarded anyway.

### 7.8 Readings without injections — NEW IN v9 [R2, blocking]

**The log could not answer the question this project depends on, and eight revisions did not
notice.** Trace it:

```
65 mg/dL entered  ->  band C blocks  ->  no dose  ->  no "I injected" tap  ->  NO LOG ROW
```

§7 stores injection events only. So **every low reading is systematically absent from the record**
— exactly the events that corrected round 7's premise, exactly what §18.13 promises the log will
locate, exactly what the prescriber needs. Overnight readings are missing for the same reason. No
amount of time fixes it: the data was never captured.

**§20.6 claims the record is this app's clinical purpose. Without this section that claim is
false.**

**A reading is its own event.** One field, one button, available from the home screen and offered
automatically after any band C or band D block:

| Field | |
|---|---|
| `id`, `timestamp` | as §7.1 |
| `bloodSugar` | §4.5's range and §4.2's grammar, unchanged |
| `note` | optional, one line from a fixed list — *before bed*, *overnight*, *felt low*, *after exercise* |

**It exposes no insulin quantity and does not weaken band C** [R2]. Recording a 65 is not a step
toward dosing at 65; the block still applies, and the recording offer appears *after* the
treat-first instruction, never instead of it.

**Not an input to anything.** Readings are absent from §11.2's dosing snapshot, from §6.5's
carbohydrate baseline, and from §7.4's stacking gate — a reading is not an injection. They exist
for **both** exports (§7.7.1 — the readable one carries them precisely because they are the
refusals) and the history screen. The one exception is §10.5's band E derivation, which reads
`bloodSugar >= 250` across **both** stores.

**Storage:** a separate `readings` store in the same database, included in §11.3's transaction
scope wherever `logRevision` is bumped, so the band E derivation cannot race.

**Three details v9 left unstated** [R1]:

- The offer after a band C/D block **pre-fills the blocked reading** — he already typed it, and
  retyping invites a transcription error.
- Reading rows **are deletable**, with a plain confirmation. §7.3's stacking-consequence wording
  does not apply: deleting a reading removes a record, never insulin-on-board information.
- The recording offer on a band C/D screen is **an affordance, not an advisory**, and therefore
  sits outside §10.5's budget — §10.5 rank 1 says nothing else shows, and that governs *warnings*,
  not the button that lets him save the number he is looking at.

**A reading at or above 250 shows band E** (§10.5) — the app says check ketones whenever it sees
such a number, dose or no dose.

**This is the smallest possible version of it.** No charts, no averages, no time-in-range — those
are `BACKLOG.md`. One number, one timestamp, one optional note.

### 7.9 Clearing the data — NEW IN v21 [Momin]

**Two controls, and the second one is not a convenience.** v20 shipped a §13.3 test case for "a full
app reset", a §11.7 scope constraint on one, and a §10.7 placement rule for one — and never specified
the feature. This section is that specification.

#### Why it has to be in the app

On an installed PWA there is **no reliable route back to first run from outside it**, and both
external routes fail in opposite directions:

| Route | What actually happens |
|---|---|
| Uninstall, without accepting "also clear data from Chrome" | The IndexedDB **survives**. Reinstalling from the same origin returns the same settings and the same log. No clean first run |
| Uninstall, accepting it — or "Clear & reset" in site settings | **Origin-wide.** Path is not part of an origin (§11.7), so it takes the blog's storage and its root-scoped worker registration with it |

The prompt is also not offered consistently across Chrome and Android versions, so neither route can
be relied on. **The shared-origin decision taken in v14 is precisely what makes an in-app control
necessary rather than optional**: §11.7 already requires that any reset filter by scope, and only code
inside this app can do that.

#### The two operations

| | **Clear the record** | **Start over** |
|---|---|---|
| **Drops** | `log`, `readings`, and `meta.backup` | **the whole database**, by name — see the mechanism below |
| **Keeps** | `meta` **except its backup timestamp**, `settings`, **`settingsHistory`**, and **all of `acks`** | nothing |
| **After it** | The prescription is intact; the app is immediately usable | **Onboarding runs again** — there are no defaults (§1.2) |
| **For** | Removing test entries; starting the record fresh once a prescriber has the export | A clean first run; **handing the phone on**; escaping §11.3's fail-closed state |

**`settingsHistory` survives "clear the record", and that is load-bearing rather than tidy** [R1's
allocation rule]. §11.3 allocates the next `revision` as `max(settingsHistory keys) + 1`. Dropping the
store restarts the counter, so the next settings change would issue a revision that earlier rows had
already used — the exact re-attribution failure §11.3's allocation rule exists to prevent. It also
keeps the prescription trail, which is the part a prescriber may still want after the doses are gone.

**`acks` survives "clear the record" entirely — v21 dropped it, v22 split it, and both were wrong
[R1, R2 — both, independently]. FIXED IN v23.**

v21 dropped the whole store on both operations. v22 kept the `disclaimer` row and dropped the other
two as *"per-result and consumed immediately (§6.2)"*. **Every clause of that sentence is contradicted
elsewhere in this document**, and both reviewers found it:

| Row | What it actually is | Where |
|---|---|---|
| `disclaimer` | Accepted **once**, persisted, about the app | §10.6 item 1 |
| `ceilMode` | Gated behind a **one-time** acknowledgement of a rounding mode | §5.1 |
| out-of-range | **Confirm-once** acknowledgements of a setting *value* | §4.5 |

§11.3 says it plainly: `acks` holds persisted state **"bound to the value it acknowledged."** And
§6.2/§6.3's per-result confirmation is **not persisted at all** — so the thing v22's rationale
described was never in this store to survive anything. **The citation pointed at the wrong
confirmation**, which is worse than a wrong conclusion: it invites an implementer to start persisting
dose confirmations, the precise hazard the sentence was written to name.

**Corrected rule, and it is simpler than either previous version: `acks` is bound to settings and to
the app, never to the record.** So:

- **"Clear the record" drops nothing from `acks`.** Every row in it is bound to something that
  survives the operation. Deleting the acknowledgement of a `ceil` mode or a target of 150 that
  **remain in `settings`** re-gates a man who changed nothing — v22's disclaimer defect, repeated one
  row down for the two kinds it had just finished mis-classifying.
- **"Start over" drops all of `acks`**, because the values they are bound to go too. Nothing is
  orphaned and first run legitimately re-asks everything.

**This removes a sentinel state rather than defining one** [R1]. v22 left "acknowledgement dropped,
value kept" reachable and never said when the gate re-fires — at the next calculation, at the next
mode selection, or never — and the natural builds differ. Making `acks` follow its values means the
state cannot occur.

#### Both confirmations state what dies, in his own terms

Never *"are you sure?"* — §7.4.1's principle, applied to deletion:

> **Delete 67 entries?**
> Everything recorded from 18 August to 6 September, including 9 readings with no dose.
> Your prescription and its history stay. **This cannot be undone.**
>
> [ Save a copy first ]   [ Delete the record ]

**Export is offered on the path, not after it.** The log is the only copy of the thing the doctor
reads, and the 65 mg/dL readings live in it (§18.13). "Start over" states additionally that the
prescription and the dosing-history note go too, and that setup will run again.

#### It must carry §7.3's stacking consequence, and v21 did not — FIXED IN v22

**§7.3 requires a confirmation stating the stacking consequence before deleting *one* row inside
`DELETE_CONFIRM_WINDOW_HOURS`, and v21 let the same user delete all 67 without one.** The argument
§7.3 makes is §4.6's — *users learn the escape route* — and it does not weaken as the blast radius
grows. Delete-one was guarded; delete-everything was the unguarded door beside it.

**When the record contains any row inside that window, both confirmations gain a line:**

> **The stacking check is using a dose from 2:00 PM.** After this it will not know about it, and
> the next result will not hold anything back.

Three things this is deliberately **not**:

- **Not a block.** §6.1's ruling stands — a hard refusal is the wrong mechanism, and a man who
  needs to clear his data is not asking permission.
- **Not a tombstone.** §7.3 leaves one per deleted row so a bypass *pattern* stays visible in the
  history; 67 tombstones in a cleared history is not a record of anything, and the destruction is
  itself the friction the single-row case lacked. **The visibility §7.3 wanted is served here by
  the consequence being stated before the act, not after it.**
- **Not new machinery.** §7.5 already fires the missing-history line on the next result, which is
  exactly the state a clear produces. This section's obligation is to say so **on the path**, not
  to invent a second mechanism — the clear is the one moment the app knows, and he does not, that
  the gate is about to go blind.

**"Start over" carries the same line for the same reason.** It is the larger operation; it cannot
owe less.

**The offer routes to the export screen; it does not name an export — CORRECTED IN v22.** v21 wrote
*"[ Export first ]"* in the same revision that split export in two (§7.7.1), so the button named
neither file. Inventing a third label here would put a third name on files §7.7.1 already named by
purpose — §10.1's rot exactly. The control therefore **opens the export screen**, where both already
carry their names and the restorable one is marked as such, and returns to the confirmation
afterwards. **Which file he needs depends on why he is deleting**, and only he knows: handing the
phone over wants the readable copy, clearing test entries before a real start wants the JSON.

**Placement is already legislated:** §10.7 keeps destructive controls out of the primary thumb arc,
so neither control sits near a commit button, and neither is reachable in one tap from a result.

#### What it must not touch, and one thing it must reach

**Neither operation touches a cache or a worker registration — RULED IN v22.** v21 wrote that both
act on "this app's explicitly owned caches and its own registration", which quietly gave a data
control a code side-effect:

- **Caches hold the app's code; the database holds his record.** Deleting cached assets cannot
  advance a data reset by anything, and it can leave the app **unopenable until the next online
  load** — imposed on someone who may be offline, by a control they reached to clean up test
  entries. §12 records that this user's phone is Android and that the app is used a few times a day;
  an app that will not open is a worse outcome than any it was clearing.
- **A wedged *install* and a wedged *database* are different failures with different fixes**, and
  §7.9's own "for" column conflated them. Stale cached code is §11.4's update-coherence problem, and
  a user-facing button is the wrong instrument: if the code is truly wedged, the button is inside it.
  What §7.9 recovers is the **fail-closed database state**, and `deleteDatabase` is the whole of that.

**§11.7's scope constraint does not weaken — it moves to where the risk actually is.** `caches.keys()`
and `getRegistrations()` are origin-wide, and the code path that legitimately enumerates and deletes
caches is **§11.4's cleanup-on-activation**, not this section. That is where an unfiltered sweep would
unregister the blog's root-scoped worker, and **§13.3's blog-preservation case (v15) is retargeted
there in the same edit** rather than deleted, so the coverage survives the ruling.

**That test was written against a feature that did not exist**, which is this section's opening
complaint turned on its own inheritance: v20 shipped a case for "a full app reset" while nothing
specified one, so the case necessarily encoded an *imagined* implementation. **A test written before
its specification does not get to become the specification** — v22 wrote the feature, and the case
follows the feature.

**"Clear the record" bumps `logRevision` — ADDED IN v22, NARROWED IN v23.** ("Start over" cannot;
see the escape section below.) §11.3 already carries cross-tab invalidation
and §7.8 already puts the `readings` store inside its transaction scope; v21's clearing paths simply
did not use it. Without the bump, a second tab goes on rendering a result whose §7.4 stacking line
cites an injection that no longer exists, and whose §10.5 band E form was chosen by reading two
stores that are now empty. The stale screen errs in the safe direction — a cleared history suppresses
nothing, so the tab shows *more* caution than the data now warrants — but it states a fact about the
record that has stopped being true, and §11.3 built the mechanism that fixes it.

**"Start over" clears §6.7's `meta.dosingHistory`.** It is patient-reported history for *this* install,
so it goes with `meta` — and the three-state model absorbs that without a special case: a missing row
reads as `unanswered`, so the question is simply re-offered at the next export.

#### The fail-closed escape needs a different mechanism — BLOCKING DEFECT FOUND IN v21, FIXED IN v22

v21 wrote that *"start over is the only in-app escape from a fail-closed state"* and specified it as
*clearing six stores*. **Those two sentences cannot both be executed.** §11.3's fail-closed state is
reached by `open()` failing with `VersionError` on a downgrade, and that section states the
consequence outright: **"a failed downgrade yields no connection."** Clearing six stores requires a
read-write transaction, a transaction requires a connection at the code's version, and no such
connection exists — which is the entire definition of the state. **The escape, as v21 specified it,
runs only when it is not needed.**

The mechanism that does work is a different call:

**"Start over" is `indexedDB.deleteDatabase("MealUnits")` on both paths.** One mechanism, not two:

| | Ordinary "start over" | The fail-closed escape |
|---|---|---|
| **When** | The app is running | `open()` returned `VersionError`; the calculator refuses |
| **Call** | `deleteDatabase`, after closing this app's own connection | `deleteDatabase`. **It takes no version and needs no connection**, so the downgrade that blocks everything else does not block it |
| **Reached from** | Settings, per §10.7's placement rule | **The fail-closed screen itself.** Settings sits behind the calculator, and the calculator is what refused |
| **Export first?** | Yes — §7.7.1's screen, above | **Impossible**, but not for the reason v22 gave — see *"the recovery connection exists"* below |
| **Afterwards** | Re-open, which runs `onupgradeneeded` and builds the stores empty — the ordinary first-run path (§1.2) | The same, on the next launch |

**The obvious implementation is to clear the six stores in one transaction, and it is the wrong one
— RULED IN v22.** It works, on the running path only, and it carries two defects that
`deleteDatabase` does not have:

- **A hand-enumerated store list rots on the edit that changes it, silently and in the unsafe
  direction.** The day a seventh store is added, a reset naming six leaves the seventh's rows
  behind — so "start over" quietly does not start over, and the failure is invisible because every
  screen it touches looks correct. **This is the hand-maintained file list of §20.5 and the
  hand-listed number words of the checker, one directory over**; both rotted exactly this way, and
  the answer both times was to stop enumerating. `deleteDatabase` names the database, and the
  database is closed over its own stores.
- **It can leave the database without an envelope.** §11.3 discovers the schema from
  `meta.envelope.schemaVersion`, so a clear that drops `meta` and stops has removed the row the
  next boot reads to decide whether it may run — turning the recovery control into a second way to
  brick the app. Writing a fresh envelope inside the same transaction fixes it, but that is a
  correctness obligation the other mechanism simply does not create: **after `deleteDatabase` there
  is no database to misread, and the next `open()` is indistinguishable from a first install.**

#### The recovery connection exists, and v22 reasoned as though it did not — FIXED IN v23 [R1, R2]

**v22 built this whole section on "a failed downgrade yields no connection", and treated that as
absolute. It is not.** §11.3 specifies that recovery **"uses a separate versionless `open()`"** to
read the frozen block, and this section *requires* the fail-closed screen to render those settings
**before** offering the escape. So at the moment the user taps "start over", a connection this
document mandates is open — and `deleteDatabase` blocks on open connections, as the bullet below has
said all along.

**The natural build hangs.** It keeps the handle from the recovery read, calls `deleteDatabase`,
fires `blocked`, and shows *"close this app's other tabs"* — misdirecting copy, because no other tab
is the blocker, in the one state where §7.9 itself says the user has no other move. **v22's headline
blocking fix carried the exact class of error it replaced: correct in its own paragraph, contradicted
by the section it depends on.**

Three corrections, and they must travel together:

- **The versionless recovery connection is closed after the read and before the escape is offered.**
  Read the block, render the numbers, close, then delete. It is no harder to build than the version
  that hangs, which is precisely why it has to be written down — §13/§14's standard is that a wrong
  build being equally readable is itself the defect.
- **That connection also carries a `versionchange` handler** and closes on it, so a delete started in
  another tab is not blocked by this one either.
- **The real reason no export is possible is §11.3's restriction, not the absence of a connection.**
  The versionless open is **restricted by application logic to the frozen recovery block and nothing
  else**, because an older build must never present unknown-schema numbers as verified prescription
  settings. The log and the readings are unreadable *by rule*, not by accident. v22's rationale was
  false and its conclusion was right, which is the combination that survives review and ships wrong.

**`logRevision` cannot carry the invalidation for "start over" — CORRECTED IN v23** [R2]. v22 had
both operations bump it. That is right for "clear the record" and meaningless for "start over", which
**deletes the database the counter lives in**: the bump is written and then destroyed in the same
gesture, and on the fail-closed path it cannot be written at all, because the recovery connection may
read the recovery block and nothing else. The mechanism for a deleted database is the one IndexedDB
provides: **`versionchange` fires on every open connection with `newVersion === null`.** Every tab
closes its connection on that event and returns to the first-run gate. **It does not clear the
screen by itself** — the handler must invalidate the displayed result and any pending confirmation,
which is §11.2's job and needs stating, since a result left rendered after the record beneath it was
deleted is §4.3's stale-output defect arriving by a new route.

| Operation | How other views learn |
|---|---|
| Clear the record | **`logRevision` bump** (§11.3's existing cross-tab invalidation) |
| Start over, either path | **`versionchange` with `newVersion === null`**, then close, invalidate the rendered result, and return to the first-run gate |

**The stacking-consequence line cannot be evaluated on the fail-closed path — ADDED IN v23** [R2].
Its condition is *"when the record contains any row inside `DELETE_CONFIRM_WINDOW_HOURS`"*, and that
is a read of `log`, which the recovery connection may not perform. The branch is therefore **three
states, not two**:

| What the app knows | What the confirmation says |
|---|---|
| A row inside the window | *"The stacking check is using a dose from 2:00 PM. After this it will not know about it."* |
| No row inside the window | Nothing — §10.5's budget, and there is no consequence to state |
| **Cannot read the log at all** (fail-closed) | *"This app cannot read your record right now, so it cannot tell you whether a recent dose is about to be forgotten. If you injected in the last few hours, write down what and when before you continue."* |

**The third row is not the second row.** Rendering "no recent dose" when the truth is "unknown" is
§7.5's condemned class — **a false safety claim** — and it arrives here through a gate that cannot
see. Unknown states get their own copy, never the reassuring neighbour's.

Two obligations remain, and both ship broken if they are not written down:

- **`deleteDatabase` blocks on open connections**, exactly as an upgrade does (§11.3). It needs the
  same `blocked` handler and the same *"close this app's other tabs"* message, or the escape hangs
  silently in the one state where the user has no other move. **On both paths the app must close its
  own connection first** — the running path's ordinary handle, and the fail-closed path's versionless
  recovery handle — or it blocks on itself.
- **It is scoped by database name, so §11.7 is satisfied by construction** — unlike `caches.keys()`
  and `getRegistrations()`, which are origin-wide and must be filtered. The blog has no rows in
  `MealUnits` and is untouched.

**"Clear the record" still needs a transaction**, because it is selective by definition: it drops
`log`, `readings` and `meta.backup`, and keeps the rest.
**`meta.backup` is the one exception to "keeps `meta`"** and is called out in the table above rather
than left to §7.7.1, because an implementer reading this section alone would keep it — the
section-local reading failure §7.7 was corrected for in v8. Its list is a list of
**what to remove**, so a store added later is *kept* by default — the conservative direction for a
control whose promise is that the prescription survives. Stated so the asymmetry between the two
reads as a decision rather than an inconsistency.

**The fail-closed screen must show the settings before it offers the escape.** §11.3 already renders
them there from the frozen recovery block so the user is not stranded without his numbers — and
after `deleteDatabase` the recovery block is gone with everything else. That screen is the last place
those three numbers exist, so it says so, in §10.6 item 4's terms: **copy these down before you start
over.** A delete path that cannot offer an export has to offer the next best thing, and this is it.

**Recorded here as a recovery path, not a testing convenience**, so a later revision does not cut the
control as redundant.

**Provenance, because it is §19's pattern and not an unlucky one** [§19]. The defect is not that the
escape was missing — v21 identified the need correctly, from [R1]'s schema rule, and was right that
nothing else offered a way out. It is that the section specified the escape **in terms of the feature
it was bolted onto** rather than in terms of the state it had to survive. "Start over clears the six
stores; also, start over escapes fail-closed" reads as one control doing two jobs, and the second job
is in the one state where the first job's mechanism does not exist. **Each revision's defects live in
the previous revision's fixes**, and this one lived inside the paragraph written to close a gap.

---

## 8. Humulin R specifics

**Humulin R is short-acting regular human insulin, not rapid-acting.** The app must never
call it rapid — the timing advice depends on the distinction.

### 8.1 Pre-meal timing — anchored to injection [R1]

The FDA label says inject about 30 minutes before meals; ISPAD says 20–30. This is the largest
practical difference from a rapid analog.

Version 1 computed an absolute eat-time from the **calculation** clock: "Inject now → eat at
7:40 PM." That breaks silently. Calculate at 7:10, get distracted, inject at 7:35, eat at the
displayed 7:40 — a five-minute lag instead of thirty, so the meal absorbs ahead of the
insulin's onset and the peak lands three hours later on a falling curve. Nothing on screen
would indicate the number went stale.

**The timer starts on the "I injected" tap (§7.2), not on calculation.** Before that tap the
app shows the *rule*, not a time: "Inject 20–30 minutes before eating." After it: "Injected
7:35 PM → eat around 8:05 PM."

**Band-aware suppression** [R1]:

| State | Timing instruction |
|---|---|
| Band A | "Inject 20–30 minutes before eating" |
| Band B (well below target) | **Inverted**: "You are low-ish — eat first, then inject." A 30-minute fast at 71 mg/dL is wrong, and version 1 would have shown "eat before injecting" and "inject now, eat in 30 minutes" simultaneously. |
| Bands C / D | **Suppressed** — no dose exists |
| Blood sugar blank | **Suppressed** — cannot know the band (§4.6) |

### 8.2 Results expire [R1]

Version 1 cleared the dose when *inputs* changed but never when *time* passed. A resumed app
could show "7 units — inject now" computed from a reading three hours old, which is both a
bad dosing basis and ambiguous evidence in a "did I already inject?" moment.

**Every result carries a timestamp and expires after 15 minutes**, replaced by "This result is
from 7:10 PM. Re-check your blood sugar." Applies on resume, on visibility change, and on a
timer.

### 8.3 Re-dose interval

Four hours minimum, versus the three quoted for analogs. Derived from the 5–8 hour duration,
the 2–3 hour analog stacking threshold, and inpatient four-to-six-hourly correction practice.
**Flagged as extrapolation** — no source states a number for regular insulin specifically.

### 8.4 Post-meal correction window

Humulin R peaks around three hours, so correcting at two hours means correcting into the
rising limb of the meal dose. Analog-derived advice ("correct at two hours") is wrong here.

### 8.5 U-100 assumed, stated, not configurable

Confirmed U-100 by the user. Output reads `6 units (U-100)`; setup states the assumption.

**No U-40 mode is built.** It would be a setting that could itself be set wrong, causing the
exact 2.5× error it exists to prevent.

---

## 9. Scope

| Feature | v1 | Reason |
|---|---|---|
| Dose log, history, delete, export | **IN** | §7 — reversed from v1 on review |
| Active-insulin decay model | OUT | Dose-dependent duration makes a fixed curve false precision (§7.4) |
| Millimoles per litre (mmol/L) | OUT | mg/dL-native is asymmetrically safer: `8` typed into a mg/dL field is now *rejected* by the 20–600 range; `150` typed into a mmol/L field would give ~85 units. **Correction to v1** [R1]: v1 claimed the first case gives an under-dose; it gives a rejection. |
| Time-of-day ratio profiles | OUT | The only study designed to detect diurnal insulin sensitivity in Type 1 diabetes found no significant between-meal difference and concluded the pattern is individual |
| Fat/protein dosing (FPU / Warsaw) | OUT | Reliably improves the late curve and reliably causes more low-blood-sugar events doing it. Dietary protein is *protective* (odds ratio 0.16), so adding insulin for it removes a safety margin |
| Exercise / illness / alcohol adjustment | OUT | Undetectable by the app. Disclosed in §10.6 rather than modelled |
| AI carbohydrate estimation | OUT | Photo estimates are 32–73% off; one study found a frontier model over-estimating by 20 g or more on 38% of meals versus 3% for dietitians — over-estimation is the overdose direction |
| Bluetooth meter import | OUT | Web Bluetooth is absent from Safari on iOS entirely and awkward for bonded glucose profiles on Android. User accepts manual entry |
| Multiple profiles | OUT | Single user |
| Backend / accounts / sync | OUT | Nothing leaves the device |
| Analytics | OUT | §14 |

---

## 10. User interface

### 10.1 Naming the two ratios

Eleven of forty-six audited apps had one of these ratios **inverted**, and the two reference
devices disagree on the form — Roche multiplies by sensitivity, Medtronic divides.

1. **Never show the short form as the primary label.** The setting is a sentence with the
   number in it:

   ```
   1 unit lowers blood sugar by [ 30 ] mg/dL
   1 unit covers          [ 10 ] grams of carbohydrate
   ```

   The clinical terms — insulin sensitivity factor, insulin-to-carb ratio — appear in small
   secondary text so he can talk to his doctor.

2. **Units do visual work.** One field ends in `mg/dL`, the other in `g`.

   **The carbohydrate field says "grams of carbohydrate", never "grams" or "carbs"** [v6]. A
   250 g plate of biryani contains about 50 g of carbohydrate — two real numbers, both in grams,
   five-fold apart (§1.4). The label is the first defence against entering the wrong one.

   **The keypad is a different contract from the grammar — ADDED IN v20** [R1]. §4.2's grammar
   is the **parser's** contract: uniform across every field, accepting two fractional digits, and
   never narrowed — it has to accept anything a valid source can produce, including an imported
   file and §2.2's golden inputs. The **keypad** is per field, and omitting its decimal key is a
   *clinical claim* that a fraction cannot occur in that field. The claim holds for blood sugar,
   the meter reading and the target, which are whole mg/dL. **It does not hold for the ratios**:
   an ICR of **1 unit per 7.5 g** is an ordinary prescription, and a keypad without a decimal key
   makes it unenterable. It does not hold for carbohydrate, and it does not hold for the injected
   amount, where half-units are the reason §5 has a half-unit mode at all.

   **The rule: omitting the decimal key must never make a value a prescriber could write
   unenterable.** Where that is in doubt, the key is present. A keypad narrower than the grammar
   is allowed; a keypad narrower than the clinic is a defect.

3. **Live worked example under each**, recomputed as the value changes:
   *"e.g. a reading of 210 would need 2 units to reach 150"*
   *"e.g. a plate with 60 g of carbs would need 6 units"*

4. **Same sentence structure in settings and in the result breakdown.**

5. **Group by subject.** Blood-sugar settings (target and sensitivity, both mg/dL) in one
   card; food (carb ratio, grams) in another. Two identical number rows stacked is the layout
   that invites transposition. Distinguish by heading and icon, **never colour alone**.

6. **Changing a ratio needs a confirmation that shows the delta** [R1]:
   *"was: 1 unit per 10 g → now: 1 unit per 40 g"*. Version 1 had no guard in the under-dose
   direction: a ratio fat-fingered from 10 to 40 is inside the soft range, produces 5 units
   instead of 20 on a 200 g meal, passes every check, and trends toward ketoacidosis over
   days.

### 10.2 Vocabulary

The app says **"blood sugar"**, not "blood glucose" or "BG" — it is what the user actually
says. "Blood glucose" appears once in help text as the clinical synonym. **No bare
abbreviations anywhere in the interface.**

### 10.3 Show the working

```
Correction   (330 − 150) mg/dL  ÷  30 mg/dL per unit   =   6.0 units
Meal         200 g              ÷  10 g per unit       =  20.0 units
Total                                                   =  26 units  (calculated 26.0)
```

A **wrong setting** is the dominant silent failure — it produces a plausible total from a
wrong constant, and only a visible breakdown exposes it. MHRA also requires calculators to
disclose their formula, which 70% of audited apps failed to do.

**Necessary but not sufficient.** Correct decision support cut prescribing errors 58.8%;
*incorrect* decision support increased them 86.6%, and the same literature documents clinicians
viewing sufficient information and erring anyway. So the breakdown ships **alongside** the
hard gates in §4.5 and §6, which do not depend on anyone reading anything.

Where quantized components do not visibly sum to the total (§2.2), the total is shown as its
own authoritative line rather than implying the components add up.

**A suppressed correction is shown, struck through, with its reason** [R1-M8] — never silently
omitted, and never left as a line that visibly fails to reach the total:

```
Correction   (300 − 150) ÷ 30   =   5.0 units   — held back, you injected 2 hours ago
Meal         60 g ÷ 10          =   6.0 units
Total                            =   6 units
```

v3 specified neither behaviour, leaving §10.3's transparency mandate and §2.2's
components-must-not-imply-sum rule in collision.

### 10.4 Number formatting — ISMP rules

Joint Commission "do not use" items, not style preferences.

- **No trailing zero.** `1.0` is misread as 10. Render `7 units`.
- **Always a leading zero.** `.5` is misread as 5. Render `0.5`.
- **Never abbreviate units as "U".** `4U` is misread as 40 — a tenfold overdose. Spell out
  "units" everywhere, **including screen-reader text**.
- **Space between number and unit**; `10Units` has been misread as 100.
- **Never wrap between number and unit** — `white-space: nowrap`.
- Warnings phrased affirmatively, in the active voice.
- `font-variant-numeric: tabular-nums` so a digit appearing or disappearing is noticeable.


#### Times are 12-hour with AM/PM — ADDED IN v17

**Momin's decision.** Pakistan reads 12-hour, and these times are glanced at while holding a meter.
`8:35 AM`, never `08:35`. It applies everywhere a time is **rendered for a person**: §8.1's
eat-at line and the history screen. It does **not** apply to the export payload, which carries epoch
milliseconds and is machine-read (§7.7).

**Noon and midnight are written out — ADDED IN v18** [R1, clinical]. *"12:00 PM"* is routinely
misread, and **a lunch dose at noon is this app's daily case**, so the ambiguity lands exactly where
it is most likely to matter. The misreading literature this section is built on recommends rendering
them explicitly: **"12:00 noon"** and **"12:00 midnight"**, never "12:00 PM" or "12:00 AM". Note the
date-on-history-rows mitigation below does **not** cover this — noon and midnight of the same day
carry the same date.

**Midnight carries the date of the day it begins — ADDED IN v19** [R1]. Written-out "midnight"
removes the AM/PM misread but not midnight's *other* ambiguity: *"12:00 midnight, 6 Sep"* reads as
either end of that day, and the date-alongside mitigation cannot resolve it because the date is the
ambiguous part. So a midnight timestamp renders with the date of the day **beginning** — matching
how the epoch milliseconds behind it render locally. Rare, but §7.8's notes include **overnight**
and §18.13's clustering question is precisely about which night a low belongs to.

**Scope, stated once** [R1]: the rule governs human-readable renderings only. v17's wording extended
it to "the export" and to §7.6, which renders no times at all; both were corrected in v19 by editing
the sentence, not by adding a paragraph beside it — the defect class §19 names.

**One consequence worth naming:** an AM/PM time is ambiguous if the marker is lost or clipped, which
24-hour is not. So the marker is never abbreviated to a bare letter, never rendered smaller than the
digits, and the history screen carries the date alongside, so a row cannot be read twelve hours out.

### 10.5 Warning budget — NEW IN v2 [R1]

Version 1 could put four separate warnings on one result screen. Each was individually
defensible; together they train "warnings here are noise," which then degrades the band B
caution — the one that must land.

**Rule: at most two advisory elements on the result screen at once.** Priority order when more
than two qualify:

1. Band C/D block (terminal — nothing else shows)
2. Band E ketone advisory — **safety information, never collapsed** [R1]
3. Band B caution
4. Stacking suppression and its override (§7.4)
5. Relative plausibility advisory (§6.5)
6. The 4–12 hour "may still be acting" line (§7.4)
7. Missing-history line (§7.5)
8. The "held back" note accompanying a suppressed correction (§7.4, negative-correction case)
9. The §7.6 "invalid time record, ignored" line — **ranked in v7** [R2]; v6 wrote the copy and
   never gave it a slot

**v7's rank 9 held a §6.7 divergence line. §6.7 no longer produces result-screen output, so the
slot is withdrawn and §7.6's line moves up to 9.**

#### Band E repetition — RULED IN v8, both reviewers concurring

Band E fires above 250 mg/dL and this user's readings are frequently above it, so the ketone
warning would appear at nearly every meal. §10.5's own doctrine says a warning that always fires
stops being read — and this is the one warning here capable of catching ketoacidosis.

**Both reviewers independently reached the same resolution: never suppress the fact, de-escalate
the form.**

| Firing | Form |
|---|---|
| First qualifying result of the calendar day | **Full card.** Rank 2, as now |
| Every subsequent qualifying result that day | **Compact single line.** Still rank 2, still on screen, never behind "more", never absent |

**The instruction never changes — CORRECTED IN v9** [R2]. v8's compact copy read *"Above 250
again — if this is new, or you feel unwell, check ketones."* **For a repeated high reading in
someone who feels well, both conditions are false**, so the warning stayed visible while the
action quietly became optional. That is precisely the loss of protection this section says
repetition must not introduce — introduced in the sentence written to prevent it. CDC guidance
makes a reading at or above 250 **or** illness a reason to test; novelty is not a prerequisite.

> **Above 250 — check ketones. If ketones are present or you feel unwell, contact your
> clinician.**

Identical instruction, identical escalation, compact presentation. **Only the typography
de-escalates.**

#### Where "first firing today" lives — SPECIFIED IN v9 [R1, blocking]

"First qualifying result of the calendar day" is **state**. v8 ruled the behaviour and gave the
state no home — no snapshot field, no store, no schema representation, no cases. Left there, the
full-versus-compact choice happens in the shell, which is safety-display logic outside the tested
core, the exact repair §11.2 twice warns against.

**Decision: derive it from the record, do not persist a counter.** (v9 read "from the log"; the
predicate below spans both stores — corrected in v11 [R1, R2].)

```
firstToday = no record exists today, in EITHER the log or the readings store
             (§7.8), with bloodSugar >= KETONE_ADVISORY
```

**Both stores, not the log alone — CONTRADICTION RESOLVED IN v10** [R1, blocking]. v9 specified
this twice and incompatibly: §10.5's formula said log-only, while §7.8, §4.3 step 1 and two §13.3
cases said both stores. **That is contradictory oracles for the same required test** — a
standalone 280 reading at breakfast followed by the day's first calculated result at lunch demands
*full* under one and *compact* under the other — and it is §13.7's wrong-oracle class in the one
warning this plan calls capable of catching ketoacidosis. Both new sentences were written in v9;
the defect lived entirely in that revision's own additions (§19).

**Both stores wins, and it forces a second ruling that v9 left open** [R1]: **recording a reading
at or above 250 shows the band E advisory itself.** Otherwise the day's first *calculated* result
could render compact on a day when no full card was ever shown, and
`bandEFullCardShownToday` would assert something false. The coherent rule is simple: **whenever
this app sees a number at or above 250, it says check ketones** — whether a dose follows or not.
A 280 reading deserves that advice on its own.

**Why derived still beats persisted.** No counter to reconcile across tabs, and it cannot drift
from the record. The residual cost, stated rather than discovered: a calculation he did not act on
and did not record leaves no trace, so a later result renders full again. That is the safe
direction — an extra full warning, never a missing one — and it is why the compact copy above says
"Above 250" rather than v8's "Above 250 **again**", which would have asserted a repetition the derivation never
witnessed.

- **§11.2 snapshot:** carried as `bandEFullCardShownToday`, computed from **the log and the
  readings store** at `logRevision`
  alongside `carbBaseline` — same mechanism, same reason. The core decides the form; the shell
  renders it.
- **§13.2 schema:** the input carries `bandEFullCardShownToday`; `advisories` distinguishes
  `band_e_full` from `band_e_compact`. Without both, the distinguishing case is inexpressible —
  the recurring schema defect this plan has now hit five times.
- **§13.3 cases:** first firing; subsequent firing same day; **day rollover** (a qualifying result
  at 11:59 PM then another at 12:01 AM — both full); restart mid-day (still compact, because the log
  survives); two tabs (eventual consistency accepted, extra full card is the safe direction).
- **Ordering — STATED IN v11** [R1]: `firstToday` is evaluated **excluding the row being
  committed**, or the breakfast 280 renders compact for itself. §13.3's case would fail a wrong
  ordering, but the ordering is written here rather than left to be inferred from a test.
- **Boundary:** **local calendar day.** v10 cited "§7.6's existing local-time rule"; §7.6 contains
  no such rule and the pointer is removed [R1]. A clock-skew future-stamped row can demote the
  next day's first card to compact — the instruction is identical either way by this section's own
  rule, so no protection is lost. **The physician question
  under §18.8 is whether a calendar boundary is the right one at all** — a 3 a.m. reading and a
  9 a.m. reading are arguably one episode.

**Why presence is never conditional** [R1]: suppressing the warning on the day of an actual
episode because it has already shown today is indefensible, and any frequency rule converts a
clinical warning into a probabilistic one. The true discriminator for ketoacidosis is ketones and
symptoms — which the app cannot see — not the repetition of a number he lives above.

This is the standard alarm-fatigue resolution, and it is consistent with §10.5's existing rule
that band E is safety information and never collapsed: **the compact line is still band E.**

**The daily-reset boundary goes to the physician under §18.8** [R1] — one question, and it
discharges §18.11's "clinical judgement, not an engineering call" properly.

Gates do not count against the budget and always show: the §6.2 confirmation, the §4.6
blank-reading acknowledgement.

**Every advisory is classified** [R1]. v2 listed five items and left the 4–12 hour line and the
missing-history line unranked. Band E is promoted above band B because it is the only line that
can indicate an emergency, and it must never sit behind "more" — v2's ordering could hide it.

Anything beyond the top two is available behind a "more" affordance rather than stacked on
screen. And the first confirmation a user ever sees must not be a false alarm: the
out-of-range prompt on the physician's own target (§4.5) is worded as a one-time
acknowledgement of an unusual-but-intended value, not a warning.

### 10.6 First run and disclosure

1. **Blocking disclaimer**, accepted once (checkbox plus submit), persisted. Not a medical
   device, no regulatory clearance, not clinically validated, verify every dose, consult the
   clinician, use at own risk. Plus explicit non-endorsement of the meter and insulin
   manufacturers.
2. **Settings entry is mandatory** — there are no defaults (§1.2).
3. **"What this doesn't know about"**, reachable any time: active insulin, exercise, illness,
   alcohol, fat and protein, time-of-day variation. Exercise and alcohol named as the two most
   common causes of low blood sugar the app cannot see.
4. **"Show my settings as text"** — a screenshot-able screen showing target, sensitivity, carb
   ratio **and the basal regimen** (§1.3), so the picture is complete.
5. **"What this does and doesn't cover"**, in plain words on the how-it-works screen:

   > There are two kinds of insulin. Your **Lantus** is the slow background one you take once a
   > day — this app does not calculate it and never changes it. Your **Humulin R** is the fast
   > one you take with meals, and that is the only number this app works out.

   Neither "basal" nor "bolus" appears in the interface; both are explained here in ordinary
   words, per §10.2.
6. **"Configured for one specific person's prescription"** stated on first run [R1] — the URL
   is public and anyone on a rapid analog would inherit wrong timing advice.
7. **"If this number looks nothing like what you usually take" — NEW IN v9** [R1]. §6.7 promised
   this disclosure and §10.6 never contained it. Shown once at setup, and reachable afterwards
   from the how-it-works screen:

   > This app works out doses from the three numbers your doctor gave you. **If what it shows is
   > very different from what you usually inject, do not assume either number is the right one.**
   > Neither this app nor your usual dose has been checked against the other. Show your doctor the
   > exported record and let them decide.

   **The wording deliberately endorses neither figure.** §1.4's whole finding is that the app's
   number and his habit disagree and the record — not this document, not the app, not habit —
   settles which is right. Copy that leaned either way would be the anchoring hazard that removed
   §6.7's result-screen line in the first place.

### 10.7 Input and touch

- `type="text" inputmode="decimal"` — **never** `type="number"`, whose invalid values are
  silently set to empty string per spec, with no way to read the raw input.
- 48×48 CSS pixel touch targets, 8 dp gaps. WCAG 2.5.5's intent names irreversible actions and
  hand tremor — **tremor is a low-blood-sugar symptom**, so the target user is periodically in
  that population.
- Bottom-anchored primary action, padded `max(12px, env(safe-area-inset-bottom))`.
- **Destructive controls out of the primary thumb arc** — no reset or delete beside the commit
  button.
- `autocomplete="off"` on both inputs: they are transient measurements, and offering a stale
  previous reading is an active hazard.
- Fixed-width inputs sized to expected length, so a four-digit reading typo is visible.

### 10.8 State and staleness

- **Clear the dose the instant any input changes** (§4.3 step 1). 37% of audited apps had
  output desynchronised from inputs.
- **Expire results after 15 minutes** (§8.2).
- **Never gate the calculation on connectivity.** `navigator.onLine` is unreliable by design;
  the math is local. Greying out the calculator in a basement would itself be a safety failure.
- **Show the running build version.** It is the only way to diagnose a report.

### 10.9 Accessibility

- `role="status"` for the dose — **never `assertive`**, which could announce `55` on the way
  to `550`. Debounce; announce only a value considered complete and valid. The region
  pre-exists, empty. Do not move focus to the result.
- **Announce "units", spelled out.** "Seven U" is the exact ambiguity ISMP proscribes.
- Reflow at 320 CSS pixels. Never `user-scalable=no`. Type in `rem`.
- `prefers-color-scheme` plus `color-scheme: light dark` on `:root` for form-control theming,
  plus the `<meta name="color-scheme">` tag to prevent a white launch flash.
- **Do not animate the dose number** — a count-up puts transient wrong values on screen and
  into the live region.
- Primary readout at 7:1 contrast in both themes; never the large-text allowance.

---

## 11. Architecture

### 11.1 Stack

**Vite + vanilla TypeScript. No framework, no router, no state library.** Measured production
bundles for the same two-input app: vanilla TypeScript 629 B gzipped (16 packages), Preact
5.8 kB (17), Svelte 10.5 kB (49), React 59.3 kB (27).

**Two v1 claims withdrawn** [R2]:

- *"Named fields eliminate transposition for free."* They prevent positional-argument
  mistakes. They do **not** stop assigning the carb-ratio value to the `isf` property, because
  both are `number` and TypeScript's structural typing gives no unit separation. Branded
  types where warranted, and the interface-to-core mapping gets its own tests regardless.
- *"A UI refactor cannot change a dose."* **False.** A refactor can swap field mappings, parse
  separators differently, read stale settings, or bypass a gate entirely, all with `dose.ts`
  untouched. The pure core enables isolated testing; it does not remove the need for
  integration tests.

### 11.2 One explicit application state — NEW IN v2 [R2]

The bundle comparison justifies "no framework." It does **not** justify implementing state as
scattered DOM mutations and booleans — and this interface has setup gates, settings drafts,
confirmations, validation states, band gates, the ceiling, staleness, accessibility
announcements and update coordination. The predictable failure is one event updating the dose
while another leaves the breakdown, the warning or a saved setting stale.

**Requirement: a single application state, a pure transition function, and a result derived
from a committed snapshot.** That is a reducer, not a state library, and it is defined before
any screen is built.

**The snapshot contains — CORRECTED IN v3** [R1-H6, R2]:

```
{ inputs, settings (including settings.revision — §11.3's ROW STAMP),
  logRevision, decisionTime, stackingOverride,
  carbBaseline, eligibleEntryCount, historyProvenance, lastDose,
  bandEFullCardShownToday, excludedTimeRecords,
  blankReadingAcknowledged, largeDoseConfirmed }
```

**The last two were added to this list in v27, ruled by Momin 2026-09-09.** They were legislated in
§4.6 and §6.3 and never named here, so the list described a snapshot the resolver could not actually
work from. Neither is persisted; both die with the snapshot, which is what those sections require.

| Field | Required by | Why it belongs HERE and not in shell state |
|---|---|---|
| `blankReadingAcknowledged` | §4.6 | The acknowledgement is **per-calculation and never persisted**, so it cannot come from storage — and §4.3 **step 6** resolves it inside the precedence order, which reads only the snapshot |
| `largeDoseConfirmed` | §6.2, §6.3 | §6.3: the confirmation **"applies only to the exact values confirmed"**, and a committed snapshot IS exactly those values |

**`largeDoseConfirmed` is the one that shows why the location is the rule.** Confirm a large dose,
then change the carbohydrate: if the flag lived outside the snapshot, **a confirmation of the old
numbers would silently apply to the new ones** — 27 units approved, 41 shown as already-confirmed.
Held in the snapshot, a changed input produces a new snapshot and the confirmation is simply gone.
§6.3's rule is enforced by WHERE THE FIELD LIVES rather than by remembering to clear it, which is
§11.3's "correctness by construction rather than by discipline" applied a third time.

`carbBaseline` and `eligibleEntryCount` are computed from the log at `logRevision` and carried
**in** the snapshot [R1-B1, R2-F7]. A revision *identifies* history; it does not *supply* a
baseline, and the pure core cannot reach into storage.

**`logRevision` covers the readings store too — ADDED IN v10** [R1, blocking]. §7.8 created a
readings store and §4.3 step 1 legislated invalidation on a "reading revision" that **existed
nowhere**: §11.3 listed no such store, no counter, and layer 2's `stateToken` was never extended.
Rather than a second counter, **a readings write bumps the same `logRevision` in the same
transaction**, and every readings mutation carries scope `["meta", "log", "readings"]`. The field
name is kept for continuity; it is a *history* revision and this section says so. Band E's
two-store derivation therefore cannot race, and layer 2 already polls it.

**`excludedTimeRecords` — ADDED IN v10** [R2, blocking, open since round 6]. §7.6 requires the
line *"One dose record has an invalid time and is being ignored"* — but only when such a record
exists. Two histories were indistinguishable in the snapshot:

| History | `lastDose` | `historyProvenance` | Required output |
|---|---|---|---|
| Imported, usable injection 5 h ago | that dose | `suspect` | no invalid-time line |
| Same, **plus** a future-dated excluded row | that dose | `suspect` | **the invalid-time line** |

The excluded row is absent from the snapshot by construction, and a binary provenance flag cannot
say *why* history is suspect. **v6 added `historyProvenance` believing it closed this; it closed
half of it.** The count is computed from the log at `logRevision` alongside `carbBaseline`,
evaluated at **step 7a**, and carried in §13.2's input so both histories are expressible as
distinct golden cases — the point [R2] makes about listing an integration case not being the same
as giving the core what it needs to pass one.

**`lastDose.units` IS THE INJECTED AMOUNT — DEFINED IN v9** [R1, blocking]. §7.1 says §7.4 reads
`injectedUnits`, but v8's snapshot and §13.2's schema both said only `lastDose {units, atMs}`
without saying which figure. **A test author who pinned the calculated number would pin the wrong
gate input** — §13.7's wrong-oracle class, the one mutation testing cannot catch, and the defect
that has bitten this plan more than any other. The core never needs a past dose's *calculated*
figure for anything; what is in his body is what matters. The storage-to-snapshot mapping gets its
own §13.3 case.

**`historyProvenance` and `lastDose {units, atMs}` added in v7** [R1, R2 — both, independently].
v6 named `historyProvenance` in §13.2's schema and never added it here, and `lastDose` has been
missing since v5. As written, the snapshot could not feed §7.4's stacking gate or §7.5's caveat
at all. The danger is not a wrong dose but the repair an implementer reaches for: computing
provenance in the shell at render time, which puts safety-display logic outside the tested core
and is precisely what §13.1 exists to prevent. `historyProvenance` has its precedence home at
**§4.3 step 7a**.

**The usual-dose figure and the basal regimen are absent from this snapshot — and in v7 that was
a contradiction, now resolved** [R1, R2 — both, blocking]. v7 declared `usualDose` "deliberately
absent" here while §13.2 listed it as a golden-case *input*. It cannot be both: either the core
receives it, or the advisory was computed in the shell — safety-display logic outside the tested
core, the exact repair this section warns against two paragraphs above.

**v8 removes the reason for the conflict.** §6.7 no longer produces any result-screen output, so
the core never needs `usualDose` and it is genuinely absent — from the snapshot, from §13.2's
input, and from §4.3's precedence order. **In v17 it is absent from the settings store as well**:
§6.7 was cut entirely and replaced by an export-only dated note.

Had the advisory survived, the correct shape was the one both reviewers named: carry it as an
explicitly **advisory-only** context alongside the dosing snapshot, pinned by a §13.3 test
asserting that changing it leaves every calculated dose bit-identical — the same separation
`carbBaseline` already needs. Recorded because the next feature of this shape will need it.

v2's snapshot was "input-and-settings" only. But §7.4 made the last-dose timestamp a third
dosing input, so a result computed in one tab could be silently stale against an injection
recorded in another. The log revision and the decision time are part of what the dose was
computed *from*, and changing either invalidates the result (§4.3 step 1).

### 11.3 Storage — IndexedDB — CHANGED IN v4 [R2-F1]

**v1 and v2 chose localStorage. v3 tried to patch its concurrency. v4 abandons it.** The
reasoning is recorded because the premises moved underneath the decision.

**Why localStorage was right, and then was not.** The original comparison was for *three settings
numbers*: ~200 bytes, written only on a settings edit, read once at boot. At that size IndexedDB
is roughly ten times the code for no capability, and the synchronous boot read is a genuine
correctness win — no async window in which the calculator can render with default ratios.

Three things then changed and the decision was never revisited:

| | v1 | v4 |
|---|---|---|
| Stored | 3 numbers | settings **plus a growing dose log** |
| Written | rarely | **4–6 times daily** |
| Read by | the calculator | **a safety gate** (§7.4) |
| Writers | effectively one | **two** — settings and log paths |

**Why v3's fix did not work** [R2-F1]. v3 specified a monotonic counter with "re-read and compare
immediately before every write." That is a time-of-check-to-time-of-use race:

| | Tab A (logging an injection) | Tab B (saving settings) |
|---|---|---|
| 1 | reads counter 40 | |
| 2 | | reads counter 40 |
| 3 | re-reads, sees 40, check passes | |
| 4 | | re-reads, sees 40, check passes |
| 5 | writes counter 41 + the new injection | |
| 6 | reads back — verified success | |
| 7 | | writes counter 41 + settings + **old** history |
| 8 | | reads back — success |

Both report success. **The injection is gone, and neither saw a mismatch.** "Immediately before"
does not make read and write atomic, and the Web Storage specification provides no cross-agent
locking. The same ordering lets an old build overwrite a newer schema after passing its own
compatibility check.

**Why IndexedDB rather than Web Locks.** Web Locks would serialise this, but it is a *convention*
— it only works if every writer takes the lock, and a single path that forgets restores the race
with no error. IndexedDB serialises overlapping read-write transactions in the store itself:
correctness by construction rather than by discipline, in the one place a lost row means a blind
safety gate.

Second reason: a single localStorage blob is **all-or-nothing**. Every injection rewrites the
entire log, so a bad write loses *everything*. With records, a bad write loses *one row*.

**What is given up, honestly:** the synchronous boot read. That was the strongest argument for
localStorage. It costs one additional state in a machine §11.2 already requires — the app has a
first-run gate and a fail-closed gate, so a loading state is not new machinery. IndexedDB also
provides `VersionError` for downgrade detection, which v3 hand-built.

#### Schema

```
db: MealUnits   (version = code schema version)
  store: meta      keyPath "k"   -> { k: "envelope", schemaVersion, recovery },
                                   { k: "dosingHistory",              // §6.7 v18
                                     state, text, answeredAtMs },
                                   { k: "backup",                     // §7.7.1 v22
                                     lastJsonExportAtMs },            // JSON only
                                   { k: "logRevision", n }            // ADDED IN v23 [R1]
  store: settings  keyPath "k"   -> revision,                             // §7.7
                                    target, isf, icr, mode, threshold,
                                    basalName, basalUnits, basalTiming    // §1.3
                                    // usualDose REMOVED IN v17 — see §6.7
  store: acks      keyPath "k"   -> disclaimer, ceilMode, out-of-range confirmations
  store: log       keyPath "id"  -> one record per injection OR one tombstone
                                    (§7.3, `deleted: true`), index on timestamp
  store: readings  keyPath "id"  -> one record per standalone reading (§7.8),
                                    index on timestamp                  // ADDED IN v10
  store: settingsHistory
                   keyPath "revision"          // PRIMARY KEY — see the
                                               // allocation rule below
                                 -> { revision, changedAtMs,
                                      target, isf, icr, mode }          // ADDED IN v11
```

**`logRevision` gets its row in v23** [R1]. The counter the entire cross-tab correctness stack keys
on — §11.2's snapshot carries it, §4.3 invalidates against it, §7.8 puts `readings` inside its
transaction scope, and §7.9 bumps it — **had no declared home in twenty-two revisions.** The
transaction scope implied `meta`, and every implementer would have landed it there, which is exactly
why it survived: a missing declaration that everyone guesses correctly reads as a decision. **Third
instance of the class this document has now named twice** — v18 gave §6.7's note a store after v17
put it "in the envelope", and v22 gave §7.7.1's backup timestamp one after v21 legislated its
semantics. It sat one row above the second fix while that fix was being written.

**`settingsHistory` gets its store in v11** [R1]. v10 legislated the entries in §7.7, granted the
settings store a `revision`, and specified an import that *appends* to them — against a schema
block that named neither.

#### Revision allocation — BLOCKING DEFECT FOUND IN v11, FIXED IN v12 [R1]

**`revision` is the primary key of `settingsHistory`, and v11 never said where the next one comes
from.** §7.7's own wording pointed at the colliding implementation — "bumped in the same
transaction, **the same mechanism `logRevision` already uses**" — and that analogy is false:
`logRevision` is a counter whose value is never a key. Here it is a key. Two deterministic
collisions, both on paths this document legislates:

| Path | Trace | Result |
|---|---|---|
| **Non-empty import** (§7.7's remap rule) | Local history 1..k, live counter k. Import appends remapped entries at k+1..k+n; the counter still reads k. The **next settings change** bumps k→k+1 | Collides with the first remapped entry. With `put`, it is **silently overwritten** and every log row remapped to k+1 is re-attributed to settings that never produced it. With `add`, the settings save throws `ConstraintError` **forever** — he can never change his prescription after a restore |
| **Empty import** (v11's own new sentence, plus §1.2's storage-loss flow) | Import keeps history 1..n; the settings store is still empty because import only *proposes*. The user then adopts or types the settings, and the first local commit takes revision **1** | Collides with imported entry 1, on day one of a recovery |

**The rule, which v11 lacked:**

> **Allocation.** The next `revision` is `max(settingsHistory keys) + 1`, read inside the same
> transaction — **never** by incrementing the value stored on the settings record. On a virgin
> install the store is empty and the base case is explicit: `(max ?? 0) + 1`, so the first commit
> takes 1.
>
> **Identity.** `settings.revision` means **the revision of the settings currently in force**, and
> nothing else. **Only a settings commit or an adoption writes it. An import never touches it.**
>
> **The row stamp.** A log row's `settingsRevision` is **the `revision` carried in the committed
> snapshot that produced the displayed result** (§11.2) — **never a fresh read of the store at the
> tap** — and it is frozen at §7.2 step 1 with the rest of the payload.

**Why "from the snapshot", not "from the store" — TIGHTENED IN v14** [R1]. v13 said the stamp is
"read from `settings.revision`", while §7.1 and §7.7 define the semantics as the settings **in
force at calculation**. Same-tab those coincide, because §4.3 step 1 clears the result on any
settings change so no tap survives one. **Cross-tab they diverge** inside the acknowledged poll
window: a settings commit in tab B racing a tap in tab A. The mismatch policy rightly commits the
append — but a build that re-reads the live store at step 1 stamps k+1 onto a dose computed under
k. The natural reducer build reads the snapshot and is correct; v13 left the wrong build equally
readable. **§11.2's snapshot therefore carries `settings.revision` explicitly**, not merely
`settings`.

> **Adoption allocates.** Adopting an imported setting is a settings commit: it takes a fresh
> `revision` and writes a new history row, exactly as typing the value would (§7.7). **It never
> re-points at the imported entry** — that entry carries another install's `changedAtMs` and
> `settingsHistory` is never adopted. **CLARIFIED IN v14** [R1]: v13's "a settings commit or an
> adoption" left the second reading open.

**v12 got the allocation right and the identity wrong — CORRECTED IN v13 [R1, R2, converged].**
v12's final sentence read *"both import paths leave the live counter equal to the largest history
key."* Both reviewers traced the same failure from different directions:

1. Local history 1..k; the settings in force were committed at revision k, carb ratio 10.
2. Import appends remapped entries k+1..k+n. **Import only proposes settings — the values in force
   are still revision k's.**
3. v12's sentence makes the import write `settings.revision = k+n` anyway.
4. He calculates. The row stamps from `settings.revision` → **k+n**, attributing the dose to the
   last *imported* entry — settings that never produced it, at a ratio that would have given a
   different number.
5. Every dose until the next settings change carries it. **Prescription changes are months
   apart**, so the window is months long, on exactly the recovery path this mechanism exists for.

**And v12's own new test could not tell the two implementations apart** [R1]: the composed case ran
import → settings change → export — **the abbreviation is why it failed**: no dose row existed in
the interval and no assertion covered
a new row's stamp. §13.7's no-oracle class — the natural build ships wrong, silently, passing every
specified test.

**The contributing gap v12 converted from latent to live** [R1]: **the source of a new row's
`settingsRevision` was specified nowhere.** §7.1's field table omitted it, so §7.2's "freeze every
field §7.1 stores" excluded it by literal reading. Before v12 that was harmless, because only a
settings commit ever wrote `settings.revision`. v12 made the import a second writer, and the
implicit implementation became the wrong one. **Tenth consecutive instance of §19's pattern, and
the same shape as round 11: a latent half that predates the revision, made structural by the
revision's own new sentence.**

**History entries are appended with `add`, never `put`**, so any future allocation bug fails loud
instead of silently rewriting provenance.

**Why the specified tests could not catch it** [R1]: §13.3's non-empty-import case imports and
exports but never composes a **subsequent settings change**, and the export-provenance case is
single-install. The natural build ships wrong, silently, in the one mechanism §20.6 calls this
app's clinical purpose. **§13.3 gains a composed case** — import (both variants), then a settings
change, then export: a fresh key, no overwritten entry, every old row's attribution unchanged.

**Provenance of the defect, recorded because it is the pattern exactly** [R1]: the latent half
existed in v10 and [R1] passed it — with no store, "where does the next key land" was not yet a
well-formed question. v11's `keyPath` and its empty-store sentence made it one and made the
collision structural. **A cleanup revision, whose entire purpose was clearing non-blocking items,
introduced the round's only blocker** (§19).

- **One store discovers the schema.** `meta.envelope.schemaVersion` is validated as a finite
  integer; string ordering and `NaN` never decide compatibility.
- **Downgrade fails closed**: `open(name, olderVersion)` produces a `VersionError` **on the
  request's error event — not a synchronous throw** (see the implementation details below), and
  an explicit version check backs it up. The calculator refuses.
- **But the fail-closed screen still renders settings** [R1] so the user is not stranded without
  his numbers — read from the **frozen recovery block** below, never from the live payload.
- **The recovery block is immutable in format** [R2]: fixed field names and explicit units,
  versioned independently of the evolving payload, and kept synchronised with committed settings.
  Plain text prevents injection but does not establish meaning — "a parsed integer does not reveal
  whether `150` means units, hundredths or mg/dL" — so an older build must never present
  unknown-schema numbers as verified prescription settings.
- **Every write is one transaction.** The "I injected" row is a single `add` on `log`, so it
  cannot clobber settings and settings cannot clobber it.
- **Re-validate on every load and import** — type, presence, finiteness, precision, range.
- **Import is validate-before-commit and merges** (§7.5), deduplicating on `id`; it never replaces
  history wholesale, rejects future schemas, and preserves existing data on failure.
- Storage is plaintext. Say so; never claim "encrypted."

#### Cross-tab invalidation — ADDED IN v5 [R1-B4]

**The switch to IndexedDB silently gave up the `storage` event**, which localStorage provided
free and which §4.3 step 1 *requires*: a row added, deleted or imported in another tab must
invalidate a visible result here. **IndexedDB has no change events.** v4 specified no
replacement, so a required §13.3 test had no way to pass.

BroadcastChannel alone would be correctness-by-discipline — precisely what §11.3 rejected when it
chose IndexedDB. Three layers instead, correctness first:

| Layer | Mechanism | Role |
|---|---|---|
| **1. Transactional re-verify at the write** | The "I injected" write is a `readwrite` transaction with scope **`["meta", "log", "readings"]`** (**readings added in v11** [R1, R2] — v10 added the store and left this table at the two-store scope; the stricter scope is the one every revision-bumping mutation uses) containing the revision read, the comparison, the row `add`, and the revision bump. Every competing mutation must include **all three** — v11 widened the scope above and left this
sentence at "both stores" [R2]. | **Correctness at the write.** IndexedDB serialises overlapping transactions, so nothing can intervene. Separate read and write transactions would reopen the race. |
| **2. Poll while a result is displayed *or a confirmation is open*** | Re-read a **`stateToken` covering `logRevision` and every calculation-affecting setting** on a short interval (~3–5 s). Invalidate on change. Window is bounded to 15 minutes by §8.2. | **Correctness at the reveal.** A transaction protects a write; it cannot protect the lifetime of an already-displayed number. |
| **3. `visibilitychange` recheck** | On becoming visible, compare `logRevision` **and the committed settings**. | Coverage for tab-switching, and for cross-tab *settings* changes, which §4.3 step 1 also requires. |
| **4. BroadcastChannel** | Post on write so other tabs invalidate immediately. | **Latency only** — genuinely, now that layer 2 is the floor. A dropped message costs responsiveness, never correctness. |

**Layer 2 polls a token, not `logRevision` — CORRECTED IN v7** [R2]. v6 polled the log revision
only, so this sequence survived it: tab A displays a dose computed at ICR 10; tab B commits ICR
15; the broadcast is dropped; A's poll sees an unchanged `logRevision` and **the stale dose stays
actionable until it expires.** A settings change is as dose-affecting as a log append, and §4.3
step 1 already says so — layer 2 simply did not implement it. The token must cover target, ISF,
ICR, rounding mode and threshold alongside `logRevision`.

**And it runs while a confirmation is open, not only while a dose is visible** [R2]. §13.3
already required "result **or confirmation** open"; v6's layer-2 wording said only "while a
result is displayed."

**The residual is stated honestly, not papered over** [R2]. A poll gives *eventual* invalidation
on a browser timer, not an instantaneous guarantee — timer intervals are not deadlines. The
window between a commit in one tab and its detection in another is small and bounded, and the
reveal-time re-verify (layer 1) is what narrows it furthest.

**That is a narrowing, not a guarantee, and v7's wording overstated it** [R2]. Layer 1 protects
the *write*: it serialises the append against competing mutations. It cannot protect the
injection, because **the "I injected" transaction happens after the injection** — the syringe
precedes the tap. Nothing in this architecture can reach backwards through that. What the layers
actually deliver is: no lost or duplicated row, no stale number surviving a settings or log
change **undetected** — detection is eventual, on a browser timer that is not a deadline, so "one
poll interval" is a typical case and not a bound [R2] — and an honest expiry. **Any sentence in this document claiming a
layer "protects the injection" is wrong and is corrected here.**

**Layer 2 exists because v5's claim was wrong** [R2]. v5 asserted BroadcastChannel was
latency-only while layers 1–2 carried correctness. They did not: tab A displays a dose, tab B
commits an injection, the broadcast is dropped, and **A stays visible** — no visibility change,
no new reveal, so nothing re-checks. The stale dose remains actionable, and the "I injected"
check comes *after* he has already injected. A poll is the floor that makes the broadcast
optional.

#### The mismatch policy is split by commit point — CORRECTED IN v6 [R1, R2]

v5 applied one rule — *"mismatch → abort, invalidate, recompute"* — to both commit points. At a
**reveal** that is right. At the **"I injected" write** it is unimplementable in either reading:

- Abort and discard the tap → **a physical injection goes unrecorded**, the gate is blind, and
  the next correction rides on up to ~180 mg/dL of unaccounted insulin — precisely what §7.2's
  decoupling exists to prevent.
- Or treat abort as a §7.2 write failure → the pending-save retry **loops forever**, because a
  revision mismatch is permanent, manufacturing §6.6's lost-injection residual every time.

| Commit point | On revision mismatch |
|---|---|
| Revealing a dose | Abort the reveal, invalidate, recompute from current state |
| **"I injected" write** | **Always commit the append.** A keyed single `add` cannot clobber anything, and the revision bump rides in the same transaction. *Then* invalidate the displayed result and recompute the UI, surfacing the §7.4 line. |

**The injection is never discarded and its units are never replaced.** The event is frozen at the
tap (§7.2); only the *result* is invalidated.

#### IndexedDB implementation details [R2]

- **`VersionError` is an asynchronous request error, not a synchronous throw from `open()`.**
  Handle it on the request, not in a try/catch around the call.
- **Upgrades block on open connections.** Implement `versionchange` and `blocked` handlers, or an
  upgrade hangs behind a stale tab.
- **A failed downgrade yields no connection**, so the fail-closed screen cannot read recovery
  through it. Recovery uses a **separate versionless `open()`**, restricted by application logic
  to reading the frozen recovery block and nothing else.
- Settings, their recovery copy, the `settingsHistory` append **and the
  max-key allocation read** (§11.3's rule), and any affected acknowledgements **commit in one
  transaction** ([R1] — v12 left this bullet naming neither the store nor the read).
  A log mutation and its `logRevision` bump likewise.

**Acknowledgements are persisted state** and live in `acks`, each bound to the value it
acknowledged. The §4.6 blank-reading acknowledgement is **not** among them — it is
per-calculation.

### 11.4 Service worker — scope corrected [R2]

Version 1 claimed a hand-written worker covering precache, cache-first and cleanup is "~15
lines, 374 B." **That claim is withdrawn.** It omits what this plan actually requires:
build-generated hashed-asset discovery, versioned shells, install-failure handling, navigation
fallback for failed and non-OK responses, a policy for hanging requests, waiting-worker
detection at startup, update messaging and activation acknowledgement, multiple open clients,
old-asset retention while old clients still need them, and app-scoped cache cleanup on a
shared origin.

Two further corrections:

- **`registerType: 'prompt'` is a vite-plugin-pwa option, not a browser API.** A hand-written
  worker must implement the prompt protocol itself.
- **`max-age=600` is a freshness directive, not deletion.** Stale responses remain usable
  while disconnected. The correct argument for needing a worker is the absence of a reliable,
  complete offline application contract from the HTTP cache — not a ten-minute expiry.

**Decision: hand-written worker, but the above list is the specification, and it is tested.**
The alternative is the maintained plugin at 333 packages. Either is defensible; pretending the
work is 15 lines is not.

**Update coherence** [R2]: network-first HTML defeats prompt-controlled releases — worker v1
stays active while v2 waits, but a navigation can fetch HTML v2 referencing assets v2, so the
user runs application v2 without ever accepting. Compatibility between HTML, assets, worker
and schema version must be defined and tested. Conversely, cleaning old caches on activation
can break an older page still open in another tab.

### 11.5 Deployment

`https://MominBinShahid.github.io/MealUnits/`

| Item | Setting |
|---|---|
| Vite `base` | `/MealUnits/` — never `'./'` |
| Manifest `id` / `start_url` / `scope` | all `/MealUnits/` — **set `id` day one, never change it** |
| Worker path | `/MealUnits/sw.js` — never hashed, never nested |
| Routing | **None.** Single screen plus sheets; component state, not URL state |
| Storage | IndexedDB database `MealUnits` (§11.3) — the localStorage key was v3 residue |
| Content security policy | `default-src 'self'`, no inline script, no `unsafe-eval`, no third-party origins |
| Actions | `configure-pages@v6`, `upload-pages-artifact@v5` (path `./dist`), `deploy-pages@v5`; needs **both** `pages: write` and `id-token: write` plus `environment: github-pages` |

`id` resolves against the **origin**, not the manifest path. Omitted, it defaults to
`start_url`, and any later change to `start_url` orphans every install and creates a second
home-screen icon — which then boots an old cached build. Verify Computed App Id in DevTools
before first publish.

**Origin change is expensive, not impossible** [R2]. Version 1 said "irreversible." Moving
separates storage and a redirect at the worker endpoint obstructs updates — but the
requirement is a migration plan (keep the old endpoint serving a final self-destroying worker
*before* redirecting), not fatalism.

### 11.6 The blog service worker — keeping both offline

`mominbinshahid.github.io` serves a root-scoped Workbox 4.3.1 worker from 2019 containing:

```js
workbox.routing.registerRoute(/(\.js$|\.css$|static\/)/, new workbox.strategies.CacheFirst(), 'GET')
```

Unanchored, and Workbox matches same-origin requests on partial URLs, so
`/MealUnits/assets/index-abc123.js` matches and is served cache-first with no expiration.

**Decision: keep the blog offline. Both apps offline. Two changes, not one** [R2]:

**REPLACED IN v16 — both steps below were wrong, and `BLOG-FIX.md` is the authority** [R2].

1. ~~Upgrade `gatsby-plugin-offline` to a precache-manifest version~~ — **withdrawn.** Those
   versions require Gatsby 4+; this blog is on Gatsby 2, so it would mean a major-version
   migration for a blog already scheduled to be rebuilt.
2. ~~Add `/MealUnits/` to the navigation-fallback denylist~~ — **withdrawn as inert.** Workbox
   emits `navigateFallbackBlacklist` only when `navigateFallback` is configured;
   `gatsby-plugin-offline` never configures it and appends its own `NavigationRoute` instead, so
   the option would have done nothing at all.

**What actually ships:** a `workboxConfig` override on `gatsby-config.plugins.js` replacing the
`urlPattern` of **two** runtime routes — index 0 (`CacheFirst` on `.js`/`.css`/`static/`) and
**index 2**, which re-matches `.js` and `.css` after route 0 rejects them and which every earlier
draft missed. Workbox serves the first *matching* route, so excluding a URL from one route does
not exclude it from later ones. Full route table, patterns and verification in `BLOG-FIX.md`.

**v15 corrected `BLOG-FIX.md` and left this section prescribing the withdrawn approach** [R2] —
the leftover-copy class, in the one section an implementer would read first.

**Version 1's exposure bound was overstated** [R2]. "Exactly one cold load" does not follow
from scope matching: a root navigation fallback could return blog HTML for the app URL, in
which case the app's registration code never runs at all; installation can fail while fetching
precache assets; and longest-prefix scope does not switch an already-controlled client's
worker at activation. Registration matching and client control are different things.

**Required test:** a browser that still has the old blog worker, visiting the app **cold,
without visiting the blog first.** Plus failed installation, offline launch, and an update with
two clients open.

Also ship this first, so it propagates while the app is built.

### 11.7 Shared origin — accepted knowingly

Path is not part of an origin. Every project on `mominbinshahid.github.io` shares one storage
area, one cache store, one worker registration map, one quota. A root-scoped worker from any
sibling can intercept this app's requests; a cross-site-scripting flaw in any sibling can read
its storage.

Namespacing defends against accident, not a compromised sibling.

**DECIDED 2026-09-06 — v14: the app stays on `mominbinshahid.github.io`.** A dedicated origin was
available free and declined to keep the URL under the author's name (`BACKLOG.md`, *Dedicated
GitHub organisation / clean origin*, under DECIDED). **v15 wrote "item 12" here, which after the
backlog renumber points at *Usage analytics* — the exact rot the same revision's own rule warns
against** [R1]. This
was **decide-now-or-never** — browser storage is keyed by origin, so a later move loses every
logged dose and setting unless the user exports first. **The risk below is therefore accepted
permanently, not provisionally**, which promotes the consequence from precaution to requirement.

Enforced consequence: **all cache lookup, cache deletion, storage reset and registration
cleanup operate only on this app's explicitly owned resources.** `getRegistrations()` and
`caches.keys()` are origin-wide; any reset must filter by scope or it unregisters the blog's
worker.

---

### 11.8 Every number lives in one file — NEW IN v8

**Requirement from the user, and a real hole in v1–v7: no numeric literal appears anywhere in the
codebase except `src/config.ts`.** Enforced by lint rule, not convention.

The file separates three kinds of number, because they carry different permission to change:

```ts
// ─── CLINICAL CONSTANTS ────────────────────────────────────
// DO NOT CHANGE WITHOUT CLINICAL REVIEW. ADA/EASD definitions.
export const HYPO_LEVEL_1    = 70;   // §3 band C — treat, do not inject
export const HYPO_LEVEL_2    = 54;   // §3 band D — escalated wording
export const KETONE_ADVISORY = 250;  // §3 band E — check ketones
export const FAST_CARB_GRAMS = 15;   // the 15-15 rule
export const RECHECK_MINUTES = 15;

// ─── APP-SET DEFAULTS ──────────────────────────────────────
// The ONLY setting this app is entitled to pick a value for.
// There is deliberately no DEFAULT_TARGET / DEFAULT_ISF / DEFAULT_ICR:
// see the note below — §1.2 forbids them.
export const DEFAULT_THRESHOLD = 20;   // §6.2, recalibrated v7
export const DEFAULT_MODE      = 'nearest';   // §5

// ─── BAND B (§3.2) ─────────────────────────────────────────
export const BAND_B_CORRECTION_UNITS = -1.5;  // at or below: caution copy

// ─── ROUNDING (§5) ─────────────────────────────────────────
export const INCREMENT = { nearest: 1, half: 0.5, ceil: 1, floor: 1, off: 0.01 };
                          // ceil/floor added in v10 — §5.2 pins whole-unit
                          // granularity for both, and v9's map could not
                          // drive them [R1]
export const HUNDREDTHS_SCALE = 100;          // §2.2 integer representation

// ─── CLOCK AND TIMING (§7.6, §8.1) ─────────────────────────
export const CLOCK_SKEW_TOLERANCE_HOURS = 1;  // §7.6 future-timestamp bound
export const EAT_DELAY_MINUTES = [20, 30];    // §8.1 pre-meal window

// ─── DIVERGENCE CONFIRMATION (§7.1) ────────────────────────
export const DIVERGE_MIN_UNITS = 5;           // absolute floor
export const DIVERGE_RATIO     = 3;           // 3x or one third

// ─── RANGES (§4.5) ─────────────────────────────────────────
// hard = reject outside.  soft = accept, confirm once.
export const RANGE = {
  bloodSugar: { hard: [20, 600] },
  carbs:      { hard: [0, 300] },
  target:     { hard: [70, 200], soft: [90, 140] },  // ceiling lowered in v17
  isf:        { hard: [5, 200],  soft: [20, 100] },
  icr:        { hard: [1, 100],  soft: [5, 50]   },
  threshold:  { hard: [10, 45],  soft: [15, 35]  },
  basalUnits: { hard: [1, 150],  soft: [5, 80]   },  // §1.3
  injected:   { hard: [0.01, 100], soft: [0.5, 60] },// §7.1 — ADDED IN v9
};

// ─── STACKING (§7.4) ───────────────────────────────────────
export const STACK_SUPPRESS_HOURS = 4;
export const STACK_ADVISE_HOURS   = 12;
// Declared after STACK_ADVISE_HOURS deliberately — v9 printed this above it,
// which is a TDZ ReferenceError if transcribed literally [R1].
export const DELETE_CONFIRM_WINDOW_HOURS = STACK_ADVISE_HOURS;  // §7.3

// ─── PLAUSIBILITY ADVISORY (§6.5) ──────────────────────────
export const ADVISORY_MIN_ELIGIBLE  = 10;
export const ADVISORY_WINDOW        = 30;
export const ADVISORY_LOW_DIVISOR   = 4;
export const ADVISORY_HIGH_MULTIPLE = 3;

// ─── TIMING (§8.2, §11.3) ──────────────────────────────────
export const RESULT_EXPIRY_MINUTES = 15;
export const POLL_INTERVAL_MS      = 4000;
```

Every value carries a comment naming what it does and which section decided it.

#### There are no prescription defaults, and that is the point — CORRECTED IN v9

**v8's file shipped `DEFAULT_TARGET = 150`, `DEFAULT_ISF = 30`, `DEFAULT_ICR = 10` under the
heading "seed values".** Both reviewers rejected it, and [R1] named it exactly: **v8 rebuilt v1's
first critical finding inside v8's own new file.**

§1.2 legislates that these are *not* defaults, that the app ships with no values, and that first
run requires entering all three. So a seed constant has only two possible fates, and both are
bad: it pre-populates onboarding — the silent-defaults hazard §1.2 exists to kill, one tap-through
and the prescription came from a config file — or it pre-populates nothing and is a dead constant
with no legitimate consumer, since §4.4 refuses to calculate on empty settings and §2.3 bans
numeric fallbacks outright.

**They are deleted.** `DEFAULT_THRESHOLD` stays because §6.2 explicitly grants the threshold a
default; `DEFAULT_MODE` stays for the same reason (§5). The numbers 150, 30 and 10 survive in
this document as *his prescription* and in §13.2 as *golden-case literals*. Neither is a default.

**This is §19's second principle made flesh** — the defect lived in the previous revision's fix,
in a file created to prevent exactly this class of problem.

**Three obligations come with the file, and without them it is a liability.**

**Golden cases must NOT import from it.** A test reading `expect(dose).toBe(DEFAULT_THRESHOLD)`
still passes when the constant changes, so it asserts nothing — the wrong-oracle defect class of
§13.7, which mutation testing cannot catch. **§13.2 cases carry literal values**, which is exactly
why `threshold` became an explicit schema field. Change a constant and the tests say what broke,
instead of agreeing with you.

**The lint rule needs a stated exemption list** [R1]. "No numeric literal anywhere" is
unimplementable as an absolute — loop indices, `max(0, total)`, the ×100 hundredths scaling. The
rule is the standard `no-magic-numbers` shape with an explicit ignore set of `0`, `1`, `-1` and
`100`, **plus a whole-directory exemption for test fixtures**, which the obligation above
requires.

**A config self-consistency test** (§13.3), **corrected in v9**. One file holding every number is
one file where a bad edit does maximum damage. But v8's version was itself broken, and both
reviewers caught it on the same value:

> *v8: "every default lies inside its own soft band."* **His target is 150. The soft band is
> 90–140.** The test fails on the physician's own prescription, on day one.

Worse than a false failure, it creates pressure in two wrong directions — widen the soft band and
weaken the confirmation, or "fix" the target, which §18.1 forbids. With the prescription defaults
deleted the clause mostly evaporates. What remains:

- every soft band lies inside its hard range
- every default **that exists** lies inside its hard range
- the fixed clinical constants order as `54 < 70 < 250` — **the patient's configurable target is
  not a clinical constant and does not belong in that ordering** [R2]
- the stacking windows are ordered, and `DELETE_CONFIRM_WINDOW_HOURS` equals `STACK_ADVISE_HOURS`

**The self-check validates structural relationships. Golden cases pin intended behaviour. Neither
substitutes for the other** [R2].

**Config versus settings.** `config.ts` is the app's *design* — changing it needs a rebuild and a
deploy. The IndexedDB settings store is the *prescription* — it changes on his phone. `threshold`
appears in both: the config holds the default, the store holds what he is actually using.

## 12. Platform — Android first

**His phone is Android.** iPhone stays supported but no longer drives the architecture.

| | Android Chrome | iOS Safari |
|---|---|---|
| 7-day storage eviction | **No** | Yes, unless installed to Home Screen |
| Data transfers on install | **Yes** — the generated package shares origin storage | **No** — installed app starts empty |
| Install prompt | `beforeinstallprompt` | None; hand-drawn "tap Share → Add to Home Screen" |
| Maskable icons | Yes | No — separate `apple-touch-icon` |
| `safe-area-inset` / `position:fixed` bugs | Neither | Both |

The two facts that drove version 1's install-before-onboarding ordering — eviction and
non-transferring data — **do not apply to this user.**

**Still in v1:** `persist()` (three lines, call it and surface `persisted()` honestly),
export/backup, and the **"last made a copy you can restore from: N days ago"** prompt (§7.7.1 owns
its wording, its field, and the rules that it counts the JSON only and reports only what the app
observed) — the log makes stored data worth protecting.

**Downgraded to a light touch:** the install prompt becomes an ordinary `beforeinstallprompt`
flow rather than an onboarding gate; iOS danger-state warnings appear only when iOS Safari and
not standalone is actually detected.

**Do not treat private-mode detection as a dependable gate** [R2]. There is no supported
detection contract, and a successful write does not prove persistence. Report storage
capability honestly; never label a successful write as durable.

Android install criteria: HTTPS, linked manifest with a name, icons at **both** 192×192 and
512×512, `start_url`, `display` not `browser`. Maskable icons need a **separate file** with
`"purpose": "maskable"`, never `"any maskable"` on one file.

---

## 13. Testing

### 13.1 What goes in the tested core — CHANGED IN v2 [R1]

Version 1 put only the arithmetic in `dose.ts` under mutation testing, and scheduled bands and
validation into the interface step. So the verified 100%-mutation-covered code was the
three-line calculation — 10% of the work by the plan's own estimate — while the low-blood-sugar
gate, the ceiling and the input matrix shipped with **no specified tests at all**. A mutant
deleting the band C block would have passed CI.

**All of these are pure functions and all live in the tested core:**

- the calculation (§2)
- band classification including the caution predicate (§3)
- input-state classification and the precedence resolution (§4.3)
- lexical parsing (§4.2)
- range and finiteness gates (§4.5, §2.3)
- clamping and rounding, all modes, both signs (§5)
- the ceiling comparison and bound check (§6)
- the stacking-window decision (§7.4)
- **the divergence predicate** (§7.1) — **ADDED IN v11** [R1]
- **the `firstToday` / `bandEFullCardShownToday` derivation** over log **and** readings rows
  (§10.5) — **ADDED IN v11** [R1]
- **the `excludedTimeRecords` count** (§7.6, §11.2) — **ADDED IN v11** [R1]
- **the ELIGIBLE-set filter and median derivation** (§6.5) — a named pure function taking log
  rows and returning `{carbBaseline, eligibleEntryCount}`. The golden schema carries the
  *precomputed* baseline, so this derivation needs its own home and its own cases [R1]
- **the readable export's period grouping** (§7.7.1) — **ADDED IN v22**. A pure function over
  `settingsHistory`, `log` and `readings` returning the ordered groups and each row's placement.
  **It decides what produced what**, which is the same claim §7.7's row stamp exists to make
  truthfully, and it applies two different placement rules — stamp for doses, timestamp-in-range
  for readings — plus the unplaceable case. Left in the rendering layer it would be the one
  attribution decision in the app with no tests, in the document handed to a clinician. This list
  has now grown five times for the same reason: a derivation is easy to write beside the thing that
  displays it, and that is exactly where it escapes the core

`dose.ts` imports nothing — no DOM, no storage, no clock, no framework. **Time is passed in as
data**, so §8.1's timing is a separate pure function tested with fixed timestamps and an
explicit timezone. [R2]

### 13.2 Golden cases — schema extended [R2]

Version 1's schema had no rounding-mode field, making §5.2's own requirement to pin both
branches of each mode literally unexpressible, and could not represent a blocked or gated
outcome at all.

```json
{
  "input": { "bloodSugar": 100, "carbs": 60, "target": 150, "isf": 30, "icr": 10,
             "lastDose": { "units": 6, "atMs": 0 },   // units = INJECTED (§11.2)
             "nowMs": 7200000,          // == §11.2's decisionTime — same moment,
                                       // two names. Identity stated in v15 [R1]
             "stackingOverride": false,
             "carbBaseline": 50, "eligibleEntryCount": 24,
             "historyProvenance": "trusted | suspect",
             "threshold": 20,
             "bandEFullCardShownToday": false,   // §10.5
             "excludedTimeRecords": 0 },         // §7.6 — ADDED IN v10
  "mode": "nearest",
  "expected": {
    "kind": "dose | meal_only_suppressed | blocked_low | no_result | confirm_required | ack_required | bound_failure | invalid_input | invalid_settings",
    "hundredths": 400,
    "bands": ["A|B|C|D|E"],
    "correctionHundredths": -167,
    "suppressed": false,
    "advisories": ["band_b_caution"]
  }
}
```

**Extended in v3** [R1-M7, R2]. v2's enum could not express "meal-only with suppressed
correction", could not distinguish the §4.6 acknowledgement from the §6.2 confirmation, and had
no way to carry a last-dose timestamp — so **no §7.4 case was expressible at all.** That is the
same defect class found in v1's schema, fixed for the ceiling and immediately re-created for the
log. Blocked outcomes use an outcome-specific shape carrying no renderable dose.

**`eligibleEntryCount`, not `logEntryCount` — CORRECTED IN v6** [R1, R2]. v5 named the field
`eligibleEntryCount` in §11.2 and left §13.2 saying `logEntryCount`, undefined and unbound. The
disable rule keys on the **eligible** count (§6.5), so a test author reading it as a total-log
count would pin "advisory active" for a 24-row, 8-eligible log where the spec requires "disabled
and declared" — **a wrong oracle**, the one defect class §13.7 says mutation testing cannot
catch. `historyProvenance` is added for the same reason: §7.5's caveat keys on it and v5 gave the
schema no way to express it.

**Extended again in v4** [R1-M7, R2-F7]. v3's schema could not express §6.5 (no carbohydrate
baseline, no entry count), had no invalid-input or invalid-settings outcome, and carried a single
`band` when B and E can co-occur. **This is the same defect class three revisions running** — v1
for the ceiling, v2 for the log, v3 for the advisory: each revision added a feature the test
schema could not represent. §17's build order now requires the schema extension to land **in the
same step as the feature**, not after it.

**Zero assertions must distinguish negative zero from positive zero** — ordinary equality does
not, and JSON serialization erases the distinction. [R2]

### 13.3 Required cases the plan previously did not name [R2]

- The §2.2 component-versus-total quantization pair, and totals 4.499, 0.999, 0.001
- Below-target cases: blood sugar 120 carbs 15 (correction −1, meal 1.5, total 0.5); 135/14
- Exact cancellation, slightly negative, slightly positive totals
- Every mode at integer and half boundaries, both signs
- Hundredths ties (±1.125), the decimal 1.005, recurring quotients such as 1/30
- Blood sugar at and either side of 20, 54, 70, target, 250, 600
- Carbs at 0, 300 and adjacent; each setting at both hard and soft endpoints
- Ceiling: at and either side of the threshold; exact and rounded values on opposite sides
- Every cell of the §4.4 matrix, including low blood sugar with invalid carbs or missing
  settings
- Inputs `""`, whitespace, `0`, `-0`, `.5`, `5.`, `10,5`, `1,234.5`, `20g`, `0x10`,
  `Infinity`, Unicode digits, excessive length
- Non-finite and wrong-type imported values; missing and future schema versions
- Calculate → edit → pending debounce fires; settings edit → cancel; background and resume;
  result expiry
- **Stacking — none of these existed in v2** [R1-H6]: elapsed exactly 4 h and 12 h and either
  side; negative elapsed (clock moved back); future timestamp; positive correction suppressed;
  **negative correction NOT suppressed** (the §7.4 critical); zero carbs inside 4 h; override on
  and off; tap-then-recalculate; delete-then-recalculate; empty log; imported stale log
- **Cross-tab interleavings**: old and new build concurrently; simultaneous log and settings
  saves; an external injection recorded while a result or confirmation is open;
  **broadcast dropped while the result stays visible** (layer 2 must catch it); **revision
  mismatch at the "I injected" tap** (the append must still commit); **a row excluded for a
  future timestamp while a usable record also exists** (both lines, correct wording each)
- **Injection recording**: write failure before and after persistence; restart mid-transaction;
  repeated taps; zero-unit result rejected as a log entry
- **Plausibility advisory** (§6.5): fewer than 10 *eligible* entries (advisory disabled); a log
  of only correction-only rows (no baseline exists); exactly at `baseline/4` and `baseline*3`;
  `baseline*3 >= 300` so HIGH is disabled and declared; flagged and overridden rows correctly
  excluded from the baseline. **v4's listed case — "dominant component selection (carbohydrates
  versus blood sugar)" — described v3's dead dose-based design and is removed** [R1]
- **Composition, not just units** [R2]: negative correction with recent injection with override
  with band B with a confirmation threshold — the cross-product, not each in isolation
- **Basal non-interference — ADDED IN v8** [R1, R2 — both; §1.3 promised this case and v7 never
  listed it]: changing any of `basalName`, `basalUnits`, `basalTiming` leaves every calculated
  dose **bit-identical**. **`usualDose` is gone in v17** (§6.7), so the assertion it carried is
  retired with it — `dosingHistoryBeforeApp` is export-only free text and enters no calculation
- **Settings-change staleness — ADDED IN v8** [R2]: a **dropped broadcast on a settings change**,
  with (a) a result open and (b) a confirmation open. Layer 2's `stateToken` must catch both. v7
  tested only the dropped *log* broadcast
- **Export shape — ADDED IN v8**: the export carries both a `settings` block and a `log` block
  (§7.7); a round-trip through export and import preserves the basal regimen and, if present,
  `dosingHistoryBeforeApp` — which is asked at export, never at onboarding, and **re-offered at
  every export until answered or declined** (§6.7). Required cases: answer -> restart -> export
  carries it; skip -> restart -> export **asks again**; decline -> restart -> export asks nothing
  and carries nothing; import into `unanswered` adopts, import over a local answer does not
- **Injected-versus-calculated — ADDED IN v8** (§7.1): a row where `injectedUnits` differs from
  `units` feeds §7.4's stacking gate from `injectedUnits`; the history screen labels both; the
  default path leaves them equal
- **Cache cleanup preserves the blog — ADDED IN v15, RETARGETED IN v22** (§11.7, §11.4) [R1]:
  §11.4's cleanup-on-activation removes only this app's **superseded** caches and **leaves its own
  registration active** — a worker does not unregister itself on activate, and v22's retarget carried
  that clause across from the reset it replaced [R2]. Assert three things: the blog's root-scoped
  registration and caches are **untouched**, this app's own registration is **still active**, and the
  caches the new version needs are **still present**. v15 aimed this at "a full app
  reset" — a feature that did not yet exist, and which §7.9 has since specified as touching **no**
  cache and **no** registration. The case is retargeted rather than dropped: the origin-wide hazard
  is real, it simply lives on the activation path. The requirement existed only in `BACKLOG.md`'s *Dedicated GitHub
  organisation / clean origin* entry — the file whose
  charter is "everything excluded from v1" — so by §20.5's own rule it did not exist
- **Config self-consistency — ADDED IN v8, CORRECTED IN v9** (§11.8): every soft band inside its
  hard range; every default **that exists** inside its **hard** range; fixed clinical constants
  ordered `54 < 70 < 250` with the configurable target excluded; stacking windows ordered;
  `DELETE_CONFIRM_WINDOW_HOURS == STACK_ADVISE_HOURS`
- **Band E form selection — ADDED IN v9** (§10.5): first qualifying result of the day renders the
  full card; a subsequent one renders compact; **day rollover** at 11:59 PM then 12:01 AM renders two
  full cards; restart mid-day still renders compact; two tabs may both render full (accepted, safe
  direction). The instruction text is **identical** in both forms — assert it, since v8's compact
  copy silently weakened it
- **`injectedUnits` as an input — ADDED IN v9** (§7.1): §4.2 grammar rejections (`25g`, `2,5`,
  Unicode digits); non-finite; zero and negative rejected; 100-unit hard cap; soft confirm above
  60 and on large divergence; integer-hundredths storage; **editing the draft does not clear the
  result** (§4.3 step 1 governs calculation inputs only); **a retry after write failure persists
  the frozen payload, not a re-read draft**
- **Divergence confirmation — ADDED IN v10** (§7.1): exactly 5 units apart (the absolute floor);
  exactly 3x and exactly one third (endpoint rule); a zero calculated dose with a positive
  injection (absolute clause only); **calculated 11 against injected 25 asserting NO
  confirmation** — the routine case this must never fire on
- **Provenance across a cross-tab settings race — ADDED IN v14** (§11.3 ROW STAMP) [R2]: calculate
  under revision k; commit different settings in another tab before the "I injected" tap; then log.
  The committed row retains **k** and its original amount, **including through a write-failure
  retry**. This pins the snapshot-not-store reading of the stamp, which is otherwise only implied
- **Revision allocation and identity after import — ADDED IN v12, EXTENDED IN v13** (§11.3, §7.7)
  [R1, R2 — blocking in rounds 11 and 12]: import (empty-store variant **and** non-empty variant),
  **then a dose calculated and logged BEFORE any settings change**, then export, **then** a
  settings change, then another dose, then export. Assert: the interval row carries the
  **pre-import in-force revision** (k, not k+n) — the assertion v12 lacked, and the reason its own
  test passed the misattributing build; the post-change row carries k+n+1; the new revision takes a
  fresh key; no history entry is overwritten; every pre-existing row's attribution is unchanged.
  The empty variant cannot calculate at all until the first settings commit (§4.4), so its interval
  is provably empty
- **Import into a non-empty store — ADDED IN v10** (§7.7): local revisions 1..k, imported history
  1..n, remapped on import; after a round-trip every row is still attributed to the settings that
  produced it. v9's case covered the single-install path only
- **Band E across both stores — ADDED IN v10** (§10.5, §7.8): a standalone 280 reading at
  breakfast renders the full card and **consumes the day**, so the first calculated result at lunch
  renders compact; a day with no ≥250 record anywhere renders full on the first qualifying result.
  These two were the contradictory oracles in v9
- **Invalid-time history — ADDED IN v10** (§7.6, §11.2): two histories with identical `lastDose`
  and identical `historyProvenance`, differing only in `excludedTimeRecords` — the first shows no
  invalid-time line, the second shows it. Both expressible as golden cases, which was the point
  of carrying the count
- **Readings without injections — ADDED IN v9** (§7.8): a band C block offers a reading record and
  the block still applies; a reading never enters the dosing snapshot, the carbohydrate baseline
  or the stacking gate; band E's derivation reads both stores; a reading and an injection in the
  same second both persist
- **Export provenance — ADDED IN v9** (§7.7): a row calculated at ratio 10 still exports as ratio
  10 after the setting becomes 15; `schemaVersion` present; an import proposes settings rather
  than adopting them, and adopting one runs §4.5 and §10.1.6
- **Clearing the record — ADDED IN v22** (§7.9): after it, `settings` and `settingsHistory` are
  intact and the next settings change allocates `max(settingsHistory keys) + 1`, **not 1** — the
  §11.3 collision this store survives the clear to prevent; `log`, `readings` and the result-scoped
  `meta.backup` is reset; **`acks` is untouched in full** — v22's version of this case asserted
  that the "result-scoped" rows were gone and only the `disclaimer` survived, which §7.9 no longer
  says and v23's acknowledgements case directly contradicts. **Two shipped cases commanding opposite
  gate behaviour for one action is worse than either being wrong**, because a test author follows
  the one listed first: §10.6's blocking screen does not reappear, and neither does §5.1's ceil gate
  or §4.5's confirm-once. `logRevision` is bumped, so a second tab's rendered result invalidates. Assert the confirmation counted **readings
  as well as doses** before deleting, and that with a row inside `DELETE_CONFIRM_WINDOW_HOURS` it
  **carried §7.3's stacking-consequence line** and without one it did not — the guard v21 required
  for a single row and omitted for all 67. After it, the next result renders §7.5's missing-history
  line, because a cleared record is indistinguishable from one that never existed
- **Start over — ADDED IN v22** (§7.9): all six stores empty, **and `meta.envelope` present at the
  code's schema version** — v22's "in the same transaction" wording described the store-clear that
  §7.9 rejected, and a case is not free to keep describing a mechanism its section retired; next
  launch runs
  onboarding (§1.2) and re-shows the disclaimer; `meta.dosingHistory` absent, so §6.7 reads
  `unanswered` and asks again at the next export
- **The fail-closed escape — ADDED IN v22, CORRECTED IN v23** (§7.9, §11.3) [R1]: open a database
  written at schema 2 with a build at schema 1. Assert `VersionError` arrives **on the request's
  error event** and that the versioned `open()` yields no connection, so the ordinary store clear is
  *unavailable*. Then assert the sequence the screen actually performs: **the versionless recovery
  `open()` succeeds, the settings render from the frozen block, that connection is closed, and only
  then does `deleteDatabase` succeed.** v22's case asserted "no connection exists" *and* "the
  settings were rendered" in one sequence — **both cannot hold**, so a test author following it
  would have deleted with nothing open and verified a state the screen is never in. With a second
  tab open, the delete **blocks** and the handler renders the close-other-tabs message. **Negative
  case, and it is the one that fails on the natural build: hold the recovery connection open and
  assert the delete blocks on it** — the hang v22 would have shipped
- **`versionchange` invalidation after "start over" — ADDED IN v23** (§7.9, §11.2) [R2]: two tabs,
  a result rendered in the second. Start over in the first. Assert the second receives
  `versionchange` with **`newVersion === null`**, closes its connection, **clears the rendered dose
  and any pending confirmation**, and returns to the first-run gate. Assert also that `logRevision`
  is **not** relied on here — it was deleted with the database, which is why v22's "both operations
  bump it" was meaningless for this one
- **The three-state stacking branch — ADDED IN v23** (§7.9) [R2]: a row inside
  `DELETE_CONFIRM_WINDOW_HOURS` renders the consequence line; no row renders nothing; and the
  **fail-closed path, which cannot read `log` at all, renders the unknown-history copy** — assert it
  is **not** the no-recent-dose copy, which would be a false safety claim (§7.5) issued by a gate
  that cannot see
- **Acknowledgements follow their values — ADDED IN v23** (§7.9, §5.1, §4.5) [R1, R2]: set `ceil`
  mode and a target of 150, acknowledging both. Clear the record. Assert **no acknowledgement was
  dropped**, that neither gate re-fires, and that §10.6's disclaimer does not reappear. Then start
  over and assert all three are gone. The v22 build dropped two of the three and left
  "acknowledgement dropped, value kept" reachable with no rule for when the gate re-arms
- **Tombstones — ADDED IN v23** (§7.3, §7.1, §7.7) [R2]: delete a row inside the window; assert a
  `deleted` row remains at the original `id` and `timestamp` with **no dose values**, that §7.4's
  gate and §6.5's baseline ignore it, and that it is absent from every displayed count. Export,
  then import a backup **taken before the deletion**: assert the dose is **not** resurrected — the
  reason tombstones travel at all — and that a tombstone beats a live row with the same `id` in
  **both** merge directions. A deletion outside the window leaves none
- **The backup timestamp — ADDED IN v22** (§7.7.1, §12): a completed JSON export sets
  `meta.backup.lastJsonExportAtMs`; **a readable export does not touch it** — the false-safety case
  §7.5 condemns, and the one an implementer wiring the counter to "any export" would ship; a failed
  write does not set it; clearing the record resets it; the prompt is suppressed while `log` and
  `readings` are both empty
- **The readable export — ADDED IN v22** (§7.7.1): rows appear under the prescription that produced
  them, **placed by their stamp and not re-derived from their timestamp** — reuse §11.3's cross-tab
  race, where a row's stamp and the settings in force at its timestamp deliberately disagree, and
  assert the row groups by `k`; **readings are placed by timestamp inside the period's range**,
  since §7.8's row carries no revision; a reading outside every period lands in its own labelled
  group, never an adjacent one; readings with no dose are present; the file states on its face that
  it does not restore; §10.4 governs its times, so a lunch dose renders **12:00 noon**. **Compose it
  with a non-empty import and a subsequent reading** (§1.2's storage-loss flow: local revisions
  1..k with today's timestamps, imported k+1..k+n with older ones) and assert the new reading lands
  under the **local in-force** prescription — with periods ordered by revision key it lands under an
  imported one from the other install, which is the v22 defect and the composition that catches it. **Render a
  dosing note, a `basalName` and a `basalTiming` containing `<script>` and a raw `&`** — all three
  free-text fields, since v22 counted two and shipped a case exercising two — and assert each appears
  as text
  in the document and as escaped entities in its source — the one injection surface v22's format
  choice created, in the one file the app is designed to hand to other people

### 13.4 Mutation testing

Stryker over the whole core in §13.1, `thresholds: { break: 100 }`.

Justification: during research a property suite passed while a mutant that made the function
**return 0 for every input** also passed — the property only asserted "result ≥ 0 and not
negative zero", which `return 0` satisfies. **Property tests assert shape, and shape is
satisfiable by degenerate implementations.** Every property needs a paired golden case pinning
a real value.

### 13.5 Boundary sweep instead of a property library [R2]

A deterministic generated sweep over the boundaries in §13.3 gives comparable coverage without
a dependency. One property worth stating because it is counter-intuitive: **increasing the
insulin sensitivity factor shrinks a positive correction but makes a negative one *less*
negative** — so "larger sensitivity means smaller dose" would itself be a wrong assertion.

### 13.6 Integration tests are not optional

The pure core cannot guarantee the interface maps fields correctly, parses separators
consistently, uses current settings, or honours a gate (§11.1). Interface-to-core mapping,
band-to-message pairing, and the confirmation flow each get tests.

### 13.7 What tests cannot catch — recorded [R2]

Mutation testing validates that the tests exercise the code. **It cannot validate the
specification used as the oracle.** v2 proved this on itself: §2.2's worked example contained a
wrong expected dose and §7.4 contained a dose-increasing rule, and **both could have been
implemented faithfully, tested thoroughly, and mutation-tested to 100%.**

Therefore: golden values are independently re-derived by hand before being committed, and the
`GOLDEN-CHANGE:` rule exists to make changing one a conspicuous, argued act. A boundary sweep
needs combined-state coverage and an independent oracle, not merely more neighbouring numbers.

### 13.8 CI

`tsc --noEmit`, unit suite, Stryker on the core, integration suite — all required to merge.

`CODEOWNERS` alone does not enforce review [R2]; it needs a branch ruleset requiring
code-owner approval, and that ruleset must itself be protected. Golden-file changes
additionally require `GOLDEN-CHANGE:` plus a rationale in the pull request body.

**Version 1's claim that step 2 makes the math "provably correct" is withdrawn** [R2]. Neither
golden cases nor mutation testing is a proof. The honest statement is the validation actually
performed.

---

## 14. Regulatory posture

All three regulators name this app type as a medical device: MHRA lists "apps and software
that are intended to calculate the dose of insulin a diabetic needs… based on carbohydrate in
a meal"; EU MDCG 2019-11 names insulin-dose-recommendation software at a Class IIa floor; FDA
has product code QRX plus January 2026 clinical-decision-support guidance making
patient-facing dose recommendations devices by definition.

Three exits are closed by MHRA's own text: **free does not exempt** ("placing on the market"
covers free of charge, and names open source); **disclaimers are insufficient**; and **"just
arithmetic" fails** ("calculators linked to specific devices/drugs are likely to qualify as
devices whatever the complexity of the calculation").

What Loop, AndroidAPS and OpenAPS actually rely on is **structural** — the user compiles or
self-hosts, so arguably nothing is placed on the market. The disclaimer text is not the
load-bearing part.

**Decision: deferred to launch.** The v1 safety work is identical either way; only README
framing, whether the URL is promoted, and any store listing differ.

**Analytics: none.** It would reintroduce the network, give a third-party script read access to
the log on a shared origin, produce systematically biased data (beacons fail offline — exactly
the important sessions), and GitHub Pages does not expose access logs to owners anyway. A
"report a problem" link that opens a pre-filled issue with app version and user agent is
user-initiated and higher signal.

Not legal advice — a summary of what the regulators' own documents say.

---

## 15. Documentation

MHRA: "always provide details of the formula used and details of the source research for any
calculator." Only 30% of the 46 audited apps documented their formula.

1. **In-app "How this works"** — formulas, plain language, offline, no links.
2. **README** — formulas plus load-bearing citations.
3. **`CLINICAL.md`** — one section per design decision with its source. About twelve
   references, not the hundred in the research briefs.
4. **Code comments on clinical constants only** —
   `const LOW_GATE_MG_DL = 70; // Level 1 low blood sugar — CLINICAL.md §3`. Arithmetic gets
   no comment.

Load-bearing sources: ADA/EASD consensus levels; ISPAD 2022 hypoglycemia; ISPAD 2024 insulin
(negative correction reduces the meal dose, the 1500 rule for regular insulin, the U-40
hazard); Humulin R FDA label; Accu-Chek Aviva Expert and Medtronic MiniMed manuals; Huckvale
2015; Smart 2009; Brazeau 2013; Schmidt and Nørgaard 2014; Lyell 2017; ISMP error-prone
abbreviations.

---

## 16. Prior art

No credible open-source insulin dose calculator progressive web app exists. Fourteen GitHub
results; the top is 32 stars (Swift, iOS, carbohydrate-estimation focus); the best *web*
candidate is 6 stars, last touched May 2022; six of fourteen carry **no licence**; no test
suites in evidence anywhere.

Both closest were read at source:

**`mxklb/boluscalculator`** (MIT, 2022) — subtracts the negative correction correctly, but does
not clamp at zero and styles a negative dose *green*. No low-blood-sugar gate, no ceiling. Has
a `validateInputNumber()` that is **never called**. Offline built on `cache.manifest` —
AppCache, removed from all browsers. README admits it "lacks testing, code review, or
validation."

**`Pancreas-Digital/bolus-calculator`** (GPL-3.0, 2024) — also correct on the negative
correction, also no clamp, no gate, no ceiling. **Treats a blank glucose field as the number
zero.** Its guard `result > 0 && result < Infinity` means the resulting negative total simply
does not render — silent failure. Uses `Number.EPSILON` in its rounding, the anti-pattern
measured as altering ~4.8% of legitimate three-decimal inputs while not fixing what it appears
to target.

Borrowed: the blocking first-run disclaimer, and field helper text that independently arrived
at the same sentence-form labelling as §10.1.

**Neither has a low-blood-sugar gate, a zero clamp, a ceiling, a visible breakdown, or tests.**

---

## 17. Build order

0. **Blog service worker fix** (§11.6) — separate repo, first, so it propagates.
1. Repo scaffold, CI, deploy pipeline, empty app at a live URL.
2. **The whole core** (§13.1) — calculation, bands, precedence, parsing, gates, rounding,
   ceiling, stacking — with golden cases, boundary sweep and Stryker. **No interface.**
3. The state machine and reducer (§11.2), tested against the core.
4. Settings screen: sentence labels, live examples, delta confirmation.
5. Calculator screen: breakdown, bands, validation, ceiling confirmation.
6. Log: transactional "I injected" tap, history list, delete-with-consequence, **both exports
   (§7.7.1) and the backup timestamp**, the §7.4 stacking gate, the §7.4.1 override, and the §6.5
   plausibility advisory. **Built with §4.3, §11.2 and §13.2 integration in the same step, not
   after it.**

**Standing rule, learned four times over** [v1 ceiling, v2 log, v3 advisory, **v4 the redesigned
advisory**]: *no feature lands without its precedence step, its snapshot field, and its
test-schema representation in the same change.*

**v4 wrote this rule and broke it in the same revision** — §6.5 was redesigned with a schema
representation and neither of the other two legs. That is evidence a stated principle does not
prevent the error. It is therefore a **checklist run explicitly at each change**, not a
declaration:

```
[ ] §4.3  — which precedence step evaluates it, and against which value?
[ ] §11.2 — which snapshot field carries its inputs?
[ ] §13.2 — which schema fields express its inputs and outcomes?
[ ] §13.3 — which required cases exercise it?
[ ] §10.5 — where does it sit in the warning budget, if it renders anything?
```
7. Service worker, manifest, install prompt, backup prompt.
8. First-run disclaimer, "how this works", "what this doesn't know", settings-as-text, **and
   §7.9's two clearing controls with the fail-closed escape** — "start over" is only testable once
   there is a first run to return to, and the escape needs the fail-closed screen built in step 3.

**v21 added two features and ran none of this checklist — RECORDED IN v22** (§19). §7.7.1 and §7.9
arrived with no §13.3 cases and no place in this list, in a document whose every other feature has
both. Three of the five legs are genuinely not applicable and are recorded as such rather than left
looking skipped: neither feature has a §4.3 precedence step (neither is a calculation input), a
§11.2 snapshot field (neither enters the dosing snapshot), or a §10.5 rank (a confirmation is not a
result-screen advisory — §7.8's affordance ruling, applied again). The two that did apply were both
missing, and one of them, §13.3, is where the fail-closed escape's impossibility would have surfaced
without a reviewer: **you cannot write "assert the six-store clear runs" against a state defined by
having no connection.**
9. `CLINICAL.md`, README, on-device testing on his actual Android phone, then iOS.

Estimated: 700–900 lines of TypeScript — up from v1's 400–500, because the core grew to
include everything in §13.1 and the log is now in scope.

---

## 18. Open questions

1. **Is the 150 mg/dL target deliberate?** Confirmed as the physician's recommendation and
   **not to be changed by this project.** Worth one question at the next appointment — "is 150
   deliberate, and what would need to change for it to come down?" — purely so we know whether
   low-blood-sugar caution is the driver. If it is, that reinforces §3.
2. ~~U-100 or U-40?~~ **RESOLVED: U-100.**
3. ~~Pre-meal rule communicated?~~ **RESOLVED: yes.**
4. ~~Blog: remove or upgrade?~~ **RESOLVED: upgrade, keep both offline (§11.6).**
5. ~~Which phone?~~ **RESOLVED: Android (§12).**
6. ~~**What is a typical meal, in grams?**~~ **CLOSED IN v7.** Answered directly: about **50 g**
   of carbohydrate for a 250 g plate of biryani — and, the figure that actually mattered,
   **24–25 units of Humulin R per meal**. Six review rounds never asked for the second one.
   §6.2's threshold is recalibrated to **20** (§1.4, §6.2) and is no longer provisional.
7. **Regulatory framing** — deferred to launch (§14).
8. **Should the physician see the band thresholds and the ceiling before launch?** [R1]
   Recommended, not a hard gate.
9. **Human-factors walkthrough** [R1] — walk the actual user through band C, a ceiling
   confirmation, the fail-closed screen and the blank-reading path before shipping. The plan
   tests arithmetic exhaustively and the experience not at all.

---

10. ~~**What should §6.7's divergence check trigger on, and where does it rank?**~~ **CLOSED IN
    v8.** The trigger is withdrawn along with the result-screen line (§6.7). Both reviewers found
    the upper branch unreachable; [R2]'s three arguments against the line were adopted; and the
    65 mg/dL fact made the anchor itself unsafe. No trigger, no rank, no question.

11. ~~**Does band E need a repetition rule?**~~ **RULED IN v8** (§10.5): presence never
    suppressed, form de-escalates after the first firing each day. Both reviewers concurred. **One
    residual for the physician, under §18.8:** where the daily reset boundary falls.

12. ~~**Should a divergence between `injectedUnits` and `units` be flagged for §6.5
    eligibility?**~~ **SETTLED IN v9** [R2]: under §6.5's eligibility predicate as written,
    divergence alone does **not** exclude a row — the carbohydrate figure remains a true record of
    what was eaten, and that is the only thing the baseline uses. Recorded as the v1 decision, no
    new feature required.

13. **Where do the 65 mg/dL readings cluster?** — NEW IN v8, **and v8 could not have answered
    it** [R2]. The app logged injections only, so a blocked low produced no row at all and the
    very events in question were the ones systematically missing. **§7.8 exists because of this
    question.** With readings recorded: clustering after smaller-than-usual meals **supports**
    §1.4's fixed-dose hypothesis; clustering overnight points at the 36 units of Lantus instead.
    Note the verb — support, not confirm. Several explanations remain consistent with any
    pattern, and this question is for the prescriber reading the export, not for this document.

14. **Which interface ships? — RESOLVED IN v25 BY THE USER: Step.** `design/step-flow.html`,
    all 44 screens, as drawn. Card and Band are not shipping and `design/looks.html` becomes a
    record of the comparison rather than a live option.

    **This overrules a recommendation, and the recommendation is recorded because §19 requires
    it.** The author argued for a hybrid — Card for the everyday path, Step's takeover reserved
    for the band C/D refusals — on the grounds that **abandonment, not a misread number, is this
    project's real failure mode**: the app competes with a zero-tap habit (§1.4's fixed 24–25
    units), Step's everyday path is four screens against Card's one, and that tax is paid three
    times a day forever. Momin's answer was that Card is too basic. **That is a judgement about
    his own brother's phone and the thing he will actually open, and it beats a reasoned argument
    about tap counts** — §19's first principle is that a review verdict collapses on facts only
    the user holds, and this is one of them.

    **The trade-off is accepted, not dissolved.** If the app is abandoned for the old habit, the
    everyday tap count is the first thing to examine, and §17's step 9 — on-device testing on his
    actual Android phone — is where it would first show. Two things already in the plan blunt it:
    §7.1's `injectedUnits` defaults to the calculated dose so the common case needs no typing,
    and §7.2's commit is two taps with no keyboard.

    **What this decision does not change:** every rule in this document is stated as *what a
    screen must say*, never how it is laid out, so §13.1's core, §11.2's reducer and §4.3's
    precedence are untouched. What it does add is a **wizard state on top of §11.2's reducer** —
    a screen sequence with a position, a back path, and the rule that going back never discards a
    committed input. That is new machinery, it is in the §17 step 5 budget, and it is named here
    so it is not discovered during the build.

## 19. Principles

- **Adversarial review checks consistency, not truth.** Three times in this project a review
  verdict collapsed on a fact only the user held — the per-meal dose (v7), the 65 mg/dL readings
  (v8), and the meal size before them. Each time both reviewers reasoned impeccably from a false
  premise and converged confidently on the wrong answer. **Convergence between independent
  reviewers is evidence of shared premises, not of correctness.** Ask the human for facts before
  asking a model for findings.
- **Each revision's defects live in the previous revision's fixes.** §6.5's unreachable trigger
  was found in v3, taught by both reviewers, and rebuilt one section away in v7's §6.7 — after
  the lesson was written down in this very document. A rule you have recorded is not a rule you
  have absorbed; §17's checklist exists because of this and has still been broken five revisions
  running.
- A wrong dose is worse than no dose — **at the low end.** At the high end, no dose is worse.
  The gate goes where inaction is safe (§3.1).
- The arithmetic is three lines. The work is guardrails, input state, output clarity and tests.
- Every excluded feature is excluded for a stated reason, recorded so it is not silently
  re-opened.
- The app is a checkable arithmetic aid, not an oracle. It shows its work and refuses when it
  should.
- Where a v1 claim was withdrawn, the withdrawal is recorded rather than quietly deleted.
- The difficulty of this project is in **refusing to add things** — and in v2, in noticing the
  one thing that should have been added.

---

## 20. Working agreement

Process rules agreed in conversation. **Recorded here because they are not derivable from the
code or the rest of this document, and would otherwise be lost.**

### 20.1 The code gate — strict

**No code is written without two explicit go-aheads from the user, and the question is asked
every single time.**

1. I propose what I am about to build and ask.
2. The user says go.
3. I ask again, confirming scope.
4. The user confirms.
5. Only then is code written.

This applies to **both repositories** and to every change, however small. The blog service
worker fix counts as code and gets no exemption for being one file.

A go-ahead is scoped to the specific change it names. Approval for one item never carries to an
adjacent one.

### 20.1.1 When the document or a test looks WRONG — ask, do not correct

**Added 2026-09-08, on Momin's instruction, after it was broken.**

If a test, a comment, or this document asserts something that appears wrong, **that is a question for
Momin at the moment it is found.** Not a line in a summary afterwards. Not "I updated an obsolete
test."

**Why, in the words of the case that produced the rule.** A test named *"holds the scroll position on
a same-view render, and releases it on navigation"* asserted that scroll was RETAINED across a
navigation — directly contradicting the comment written two lines above it. The assertion was
silently changed to match the new behaviour and reported as tidying up.

That was wrong regardless of which way the answer went, because there were two possibilities and they
are not distinguishable from the code:

1. the test was written to match a defect, and agreeing with it entrenched the defect, or
2. the behaviour was deliberate, and changing it broke something on purpose without saying so.

**Only the user can tell those apart.** Silently picking one converts the specification from a source
of truth into a record of whatever the code currently does — which is the entire failure this
document exists to prevent, arriving through the back door.

**The obligation, concretely:**

- **Stop and ask, in that turn.** State what the artefact asserts, what the code does, and which of
  the two readings you think is right — then wait.
- **A disagreement is a finding, not a chore.** §20.4's obsolete-test sweep says to update tests the
  same change; it does NOT license deciding what they should have said.
- **This applies to `check-plan.py` too.** If a check fires and the check looks wrong, that is the
  same question — the tool is part of the document (§20.3), not an obstacle in front of it.

### 20.2 Repositories and order

| # | Repository | Change |
|---|---|---|
| 0 | `mominbinshahid.github.io` (existing blog) | **`workboxConfig` override on `gatsby-config.plugins.js`, excluding `/MealUnits/` from runtime routes 0 AND 2** — then execute every `urlPattern` in the generated `sw.js` against representative app URLs and assert none match (§11.6, `BLOG-FIX.md`). **Withdrawn in v16** [R2]: neither *Upgrade `gatsby-plugin-offline`* nor the *navigation-fallback denylist* — the first needs Gatsby 4+ on a Gatsby 2 blog, the second is inert because the plugin never configures `navigateFallback` |
| 1 | `MealUnits` (new) | The app |

**Blog first**, so the worker change has time to propagate — it only reaches a browser when that
browser next visits the blog. The maintainer's own browser is the most likely to hold the stale
worker, so leaving it in place would also poison his own testing.

### 20.3 Review cycle

Every revision of this plan goes to two independent reviewers before implementation:
**[R1]** clinical / state-machine, **[R2]** implementation / code-level, from different model
families. Findings are marked at the point of change.

#### `check-plan.py` runs before every dispatch, and is maintained with the document — ADDED IN v14

Thirteen rounds produced a stable set of *mechanical* defects: a phrase this document condemns
still standing as live spec, a §reference resolving to nothing, a completion claim about text
that is still there, a §13.2 field with no §11.2 home. **Every one cost a review round that
should have gone on design.** `check-plan.py` catches that class.

**It runs before every dispatch to reviewers, and a finding is fixed before the round opens.**

**The maintenance obligation is binding, and exists because an unmaintained checker is worse than
none** — it reports "clean" while the document rots underneath it:

- A reviewer finds a defect the script *could* have caught → **add the check in the same edit that
  fixes the document.** Not afterwards.
- A phrase is retired, corrected or reworded → **add it to `RETIRED` in the same edit.**
- A canonical number changes → **update `CANONICAL` in the same edit.**
- A snapshot or schema field is added or removed → **update `SNAPSHOT_EXEMPT` or `GROUPED`.**
- **A check produces false positives → fix the check.** Never delete it, never start ignoring its
  output. Its first run reported 23 findings of which 21 were its own
  bugs; every cause was fixed rather than suppressed, which is the standard. **[R1] later
  mutation-tested it and found three checks certifying nothing** — the flagship among them. See
  the count-pinning note in the script.

**The script is part of this document, not a tool beside it.** A revision that changes PLAN.md
without changing `check-plan.py`, where the change touches anything the script tracks, is
incomplete.

**The checker verifies itself — ADDED IN v19.** `python3 check-plan.py --self-test` re-runs every
seeded mutation reviewers have used to break it: the four BLOG-FIX route escapes, canonical drift in
a non-PLAN file, both target-ceiling reversions, the deletion of §6.7's store row and its three
states, the noon/midnight revert, a retired name resurrected in a design file **and in this script's
own comments**, and a §20.5 listing naming a file that does not exist. Each mutation must produce a
finding; a mutation that changes nothing is itself reported, because a test whose anchor has moved
verifies nothing while still passing.

**This is not belt-and-braces — it is the answer to this project's most persistent defect.** Five
separate rounds found checks that certified nothing, and in every case *reading* the check suggested
it worked; only *running* it revealed otherwise. The self-test earned its place immediately: it
caught a broken sentinel in v19's own redaction, introduced minutes earlier, which had silently
switched the script's self-sweep back off while the checker still printed `clean`.

**A check that cannot be shown to fail on a real defect is not a check.** New checks arrive with a
seeded mutation in `SELF_TESTS`, in the same edit.

#### A change here is a change everywhere — ADDED IN v18

**Momin's rule, set after the §6.7 cut left the feature described as live in three other files.**
**Editing `PLAN.md` is not finishing a change.** Every edit is followed by a sweep of every live
file — every `.md`, `.py` and `.html` under this directory, at any depth, which is exactly what
`python3 check-plan.py --files` prints — for references to whatever moved. **The list is discovered,
never written down here**: v20 named `NEXT-STEPS.md` in this very sentence after deleting it in the
same revision, and named `design/*.html` after discovery had stopped being one level deep. A rule
about stale references that carries a stale reference is not a rule.

v17 cut §6.7 and left it described as shipping in `BACKLOG.md`, exempted in `check-plan.py`'s own
`SNAPSHOT_EXEMPT`, tagged in a design file, and asserted as one of "all four stay" in this
document's own header. **Both reviewers found them; the author found none of them.**

**The rule is enforced mechanically, not by memory** (§20.3's checker paragraph): the retired-phrase
sweep and the canonical **drift** scan read **every live file**, so retiring something in one
document flags every other mention automatically. A promise to sweep is worth nothing; a check that
fails the dispatch is.

**What the sweep cannot do, stated so it is not mistaken for total coverage** [R1]: it is automatic
only *after* a retirement is pinned. v18 retired two wordings and pinned neither, so both leftovers
sat in a frozen corpus under a "clean" verdict. **Retiring a phrase and adding its pin are one edit,
not two** — which is why the canonical table now also pins the things each revision most recently
fixed, those being the ones the next revision is likeliest to undo.

#### The designs follow this document, not the other way round — ADDED IN v17

**Momin's ground rule.** Any mockup, prototype or screen design must match `PLAN.md` **as it
currently stands** — not a proposal for it, and not anyone's memory of it. Where a proposal
conflicts with live plan text, **the plan wins until Momin rules otherwise.**

It was set after a mockup reintroduced §6.7's removed per-result line — the third recurrence of a
deleted feature in this project, and the first in a form that looks like a decision rather than a
slip. Its first application went **against** the recommendation of whoever was holding the pen:
§6.7 was still live, so the design kept it, while the proposal to cut it waited for a ruling. **That
is the rule working.**

**THE DOCUMENT IS FROZEN WHILE A ROUND IS OPEN — ADDED IN v10** [R1]. No edit is applied to
`PLAN.md` between dispatching a round and receiving **both** verdicts, however obviously correct
the edit seems. Round 9 broke this: [R2]'s findings were applied while [R1] was still reading,
the file grew by 52 lines mid-review, and [R1] correctly refused to let its verdict bind to a
moving artifact. **Two reviewers reviewing different documents are not two independent reviews of
anything.** Fixes from both are batched into the next version, which is what gets dispatched.

**The freeze covers every file `check-plan.py` reads — EXTENDED IN v15, WIDENED IN v19** [R1]:
every file `--files` prints. v14 froze only
`PLAN.md`, and `BACKLOG.md` was edited mid-round — [R1] caught it by hash. v18 made the designs
checker inputs via the all-files sweep but left them outside the freeze and outside the dispatch
hash set, so a mid-round design edit could move a reviewed input undetected — the identical class,
one file further out. **A checker input that moves after dispatch means "clean at dispatch" no
longer describes the reviewed state**, so the dispatch hashes **every** file the script reads.

**`python3 check-plan.py --files` prints that list** — the dispatch hash set must be exactly it,
name for name. v19 asserted this was verified and nothing verified it: the list held eight files
while the dispatch hashed seven, so a mid-round edit to the eighth could flip the verdict after
dispatch [R1]. The eighth was `NEXT-STEPS.md` — the file whose charter called it **DELIBERATELY
EPHEMERAL** — and v20 removed it, moving its two surviving items to §20.5 and §18.14. The check now
exists rather than the claim.

**The dispatch carries the script's output and its hash**, so a reviewer can tell whether the
checker ran and against what — a written rule alone broke under momentum in round 9.

**Established empirically over three rounds: each revision's defects live in the previous
revision's fixes.** Round 2's critical was in the log added to fix round 1. Round 3 found two
fixes that reintroduced defects earlier fixes had removed. Reviews therefore target the newest
material first, and a revision is never assumed clean because the previous one was reviewed.

### 20.4 Decisions made in conversation

Recorded so they are not silently reopened.

| Decision | Choice | Where |
|---|---|---|
| Blog offline | **Keep it.** Both the blog and the app work offline | §11.6 |
| Phone | Android is the actual device; iPhone supported but not architecture-driving | §12 |
| Meter | Accu-Chek Instant S, **manual entry only** — Web Bluetooth is absent from iOS Safari and awkward on Android | §9 |
| Log editing | **Delete only, no edit.** Column labelled "calculated", not "dose" | §7.3 |
| Decimal inputs | **Kept.** Integer-only inputs were considered as a simplification and declined | §4.2 |
| Vocabulary | "blood sugar", not "blood glucose" or any abbreviation | §10.2 |
| Target 150 | Physician's choice. **Not to be changed by this project** | §18.1 |
| App icon | **The IDF blue circle with a solid inner disc, ring `r32.5` at stroke `17`, disc `r20.5`, H reversed out** — the mark reviewed as "3b". Chosen after twelve studies; a filled aperture was rejected because it destroys the open ring that is the symbol, and a disc past `r22` was rejected because the gap falls under one device pixel at launcher size and renders as a filled centre regardless of the artwork | §20.4 |
| Clearing data | **Two controls, not one** — clear the record, and start over | §7.9 |
| Reset mechanism | **`deleteDatabase` by name, on both the running and the fail-closed path.** Clearing an enumerated list of stores was considered and rejected: the list rots unsafely when a store is added, and it cannot run at all in the fail-closed state, whose versionless connection may read the recovery block and nothing else | §7.9 |
| Acknowledgements | **`acks` is bound to settings and to the app, never to the record.** So "clear the record" drops none of it and "start over" drops all of it — which removes the "acknowledgement dropped, value kept" state rather than defining it | §7.9 |
| **Interface** | **Step** — `design/step-flow.html`, all 44 screens. Card and Band declined. The author recommended a Card/Step hybrid on abandonment-risk grounds and was overruled by the user, whose call this is; the argument and the accepted trade-off are recorded in §18.14 | §18.14 |
| The review bar | **Round 21 onward: a finding stops the build only if it changes a dose, a gate, or a stored shape.** "No findings at any severity" ran for twenty rounds and is self-perpetuating — each round's fixes are the next round's findings (§19) | §20.3 |
| Exporting | **Two exports, named by purpose** — *move to another phone* (JSON, restorable, counts as the backup) and *save the record* (self-contained HTML, readable by anyone, not restorable). PDF via a library declined: the browser prints HTML to PDF for free | §7.7.1 |
| **Origin** | **Stays on `mominbinshahid.github.io`.** Decide-now-or-never; §11.7's risk accepted permanently | §11.7 |
| **Name** | **`MealUnits`** — no spelling trap (British "maths" lands in Waitrose/Ocado territory), clean on search, names the output rather than the process. **about 32 candidates checked** across five sessions, table in `BACKLOG.md` | — |
| Regulatory framing | Deferred to launch | §14 |

### 20.5 Files

```
MealUnits/
  README.md                  <- §15 item 2: the formulas and the load-bearing
                                citations. Stays at the root: it is what GitHub
                                renders on the repository page
  CLAUDE.md                  <- the project's standing instructions for an LLM
                                working in this repository. At the root because
                                that is where the tooling looks for it
  check-plan.py              <- consistency checker; run before every dispatch (§20.3)
  index.html                 <- the app's document shell (§11.5)
  docs/PLAN.md               <- this document, the single source of truth
  docs/BACKLOG.md            <- everything deliberately deferred, with reasons
  docs/BLOG-FIX.md           <- the separate blog service-worker change (§11.6)
  docs/BUILD-NOTES.md        <- decisions the BUILD had to make that this document
                                does not state, each awaiting a ruling (§20.1)
  docs/CLINICAL.md           <- §15 item 3: one section per clinical decision,
                                with its source and its reversals
  docs/design/screens.html   <- 8 screens, Card design, annotated
  docs/design/looks.html     <- three interfaces compared: Card / Band / Step
  docs/design/step-flow.html <- 44 screens, the Step design in full
  src/                       <- the app. Not enumerated here, deliberately: a
                                per-file listing of an implementation rots on
                                every refactor, which is the failure this block
                                has already had twice. `README.md` describes the
                                six directories and what each may import.
  test/                      <- the suites §13 requires, including the golden
                                cases and the boundary sweep
  tools/                     <- the icon generator (§20.4's geometry, rasterised)
```

**Paths are written in full rather than as an indented tree**, because
`check_file_listing` matches entries at one indent level and a nested tree is
invisible to it — which is the listing rotting in a new way, silently, in the
revision that moved the documents.

**The listing stops at the directory for `src`, `test` and `tools`, and that is a
decision rather than laziness.** §20.5's own history is two rotted listings — it
named `BACKLOG-REVIEW.md` after that file was deleted, and said `v2..v16` while
`v17` existed — and a table naming forty source files would rot on the first
rename. What is checked mechanically is what a person maintains by hand; what a
compiler maintains is checked by the compiler.

**No snapshot is kept — CHANGED IN v24, on Momin's instruction.** Every `PLAN-vN-superseded.md`
from v1 to v22 has now been deleted. The archive existed to give a reviewer a diff base across
rounds, and **the plan is going to implementation rather than to another round**, so the last one's
only remaining job had ended. Recorded rather than silently dropped, so a later reader does not
look for a history this listing once described. **From here the record of change is the git history
of the implementation repository** (§20.2), which is a better instrument than a 259 KB copy of a
Markdown file.

**The three design files, as published — MOVED HERE IN v20** from `NEXT-STEPS.md`, which is
deleted. **§18.14 is now closed: Step ships.** `design/step-flow.html` is therefore the build
reference and the other two are kept as the record of what was compared and declined — deleting
them would remove the evidence that the choice was made rather than defaulted.

| Page | File | Published at |
|---|---|---|
| MealUnits Screens — 8 screens, Card design | `design/screens.html` | https://claude.ai/code/artifact/8baa7341-1b02-44c5-8176-f2a5b4173cce |
| Three Interfaces — Card / Band / Step | `design/looks.html` | https://claude.ai/code/artifact/67caeeec-045e-4e85-930d-d556c8786364 |
| MealUnits Step Flow — 44 screens | `design/step-flow.html` | https://claude.ai/code/artifact/37b782b2-233c-4b35-b0f6-26dc1ea73a71 |

`PLAN.md` is written to be self-sufficient: if the conversation that produced it is lost, this
document alone should be enough to build from. Anything decided in conversation and not written
here does not exist.

**This listing is checked mechanically — ADDED IN v19** [R1]. It has rotted twice: it named
`BACKLOG-REVIEW.md` after that file was deleted, and said `v2..v16` while `v17` existed. A listing
maintained by memory rots on exactly the edits that change it, so `check-plan.py` now compares this
block against the actual directory and reports both directions — a file present and unlisted, and a
file listed and absent.

### 20.6 The shipping decision — RULED BY THE USER IN v8

**The full application ships and is published.** No record-only first release, no staged
enablement, no crippled build. Every threshold, every guard, every screen.

**Round 7 recommended otherwise, and both reviewers were overruled.** The reasoning matters
enough to record, because a future reader will find their recommendation in this file:

1. **Publishing is not prescribing.** Releasing an open-source app to GitHub Pages is a software
   act. Whether the one known user acts on its output is a separate decision, made by his brother,
   in person. Round 7 reasoned as though shipping meant handing an instruction to a stranger.
2. **[R1]'s recommendation rested on a false premise** — "he injects 25 per meal without
   hypoglycaemia." §1.4: he sometimes reads 65 mg/dL.
3. **The 65 inverts the argument.** Round 7 held that his habitual dose was the safe default and
   the app's smaller number the hazard. A fixed dose that has produced both chronic highs and a
   65 is not a safe default; it is the problem the calculation exists to solve.
4. **Band C ships with everything else** and blocks below 70 regardless of whether any ratio is
   right. Withholding the app withholds that too.

**What is *not* overruled**, and what the user has undertaken separately: his brother is told not
to rely on the output until his prescriber has reviewed it. That is a conversation, not a code
path, and this document does not pretend otherwise.

**The clinical purpose is the record, not the arithmetic.** Neither the ratios nor the doses can
be settled by reasoning in this file. They are settled by the prescriber reading the export —
readings, carbohydrates, calculated doses, injected doses, times — which is exactly what §7 and
§7.7 exist to produce. **§18.13 is the question that record answers first.**
