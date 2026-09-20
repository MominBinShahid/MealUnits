# MealUnits — Backlog

Companion to `PLAN.md`. **Everything deliberately excluded from v1, with the reason and what
would have to change to reconsider.**

Scope, because several entries turn on it: the app is **for people with type 1 diabetes**, on a
long-acting insulin plus a short-acting one at meals. Type 2 treatment and pump therapy are outside
it, and an entry that would widen the app to either is a change of what this is, not a feature.

The point of this file is that §9's exclusions are decisions, not oversights. Without a written
reason each one gets silently reopened in six months by someone — probably us — who assumes it
was forgotten.

Categories: **Next**, **Later**, **Never** for features, plus **Technical** for toolchain work and
**Decided** for closed questions kept as the record. "Never" means the evidence argues against it,
not that it is technically hard. **Technical** is not a priority tier — it is a different KIND of
entry, waiting on something outside this project rather than on a decision of ours.

**Numbers are identity, not rank.** The feature entries are ONE sequence partitioned across the
tiers — 1-25 today — so a number stays stable enough to cite, while **position within a tier**
carries the priority. That is why 20, 18, 19, 21, 22, 25 and 24 sit above 1, and why 4a and 10a sit above 6. Do not
renumber to tidy it: reusing a number is how `PLAN.md` v14 came to assert three falsehoods about
this file, which is why §20.3 says reference an entry by NAME, never by number.

**THE RULE, added 2026-09-06: if it is built, it comes out of this file.** An entry here means
"excluded from v1". A feature that is implemented and shipping cannot also be deferred, and
leaving it in both places makes the two documents lie about each other.

Applied twice on the day it was written: the *dose adjuster at the confirm step* and the *settings
snapshot on each log row* both moved into `PLAN.md` as `injectedUnits` (§7.1) and `settingsRevision`
(§7.7, §11.3). **§7.8's readings store and §10.6's setup disclosure** were in v1 and never listed
here at all, recorded so the omission is visible. **§6.7's usual-dose field was cut** on Momin's
objection — a calculator whose premise is that the dose varies cannot store a field asserting a
constant — and replaced by one optional free-text question asked at export, which is plan business
and nothing this file needs to carry.

---

## ORDER OF WORK — agreed 2026-09-08

Recorded because a sequence agreed in conversation is lost at the next session, and because two of
these steps have a dependency that is not obvious from reading them.

| # | Step | State | Why here |
|---|---|---|---|
| 1 | **Push and deploy.** Blog first (§20.2), then this repository | **DONE 2026-09-07** | §1.4 — the app competes with a fixed 24-25 units injected blind |
| 2 | **Confirm updates reach a real phone** | **DONE.** Both paths confirmed on Momin's device: the in-app bar renders and can be tapped, and a full restart activates a waiting worker anyway | `T4` closed 2026-09-09 |
| 3 | **Rule on the `[CONFIRM]` build notes**, one at a time | **DONE 2026-09-13.** No entry carries the tag any more. 52 and 59 ruled keep; 16 rewritten to stop hand-carrying counts; 60 split, its open half now entry 20 | Moved AHEAD of `T5` on Momin's instruction. Each recorded a decision already implemented; the question was whether it was right |
| 3a | **Prune every Markdown document** | **DONE 2026-09-13.** `BUILD-NOTES.md` lost most of its body, `PLAN.md` its revision history, `BLOG-FIX.md` its investigation; `CLINICAL.md` and `CARBS.md` untouched. `git log` has the figures — they rot if written here | **After step 3**, because the `[CONFIRM]` rulings decided what the notes still had to carry. *"We can't keep everything for ever, so we will only keep things that earn their place."* Every build-note NUMBER survived even where its body did not — many are cited from source and tests |
| 4 | **`T5` — the audience change.** Empty prescription fields with the strengthened hints, and the confirmation threshold made relative | | **This gates step 5.** Ranking an app that prefills a stranger's dosing ratios is the version of this that goes wrong |
| 5 | **`4a` + `T6` — search and measurement.** Open Graph, canonical, sitemap, Search Console | **DONE 2026-09-14, to the scope written in this row.** `4a` shipped whole; `T6`'s Search Console half is verified on both properties and the sitemap submitted. **Analytics was never in this row** — it is the other half of `T6`, it moved to item 12, and Momin deferred it the day this closed | After `T5`, never before |
| 6 | **`T3` — Preact** | | Kills the whole render-teardown defect class by construction |
| 7 | **`10a` — Urdu** | | **Depends on `T3`**: the current render destroys IME composition state, which is how Urdu is typed |

**The two dependencies worth restating, because getting them wrong is expensive:** search work waits
on `T5`, and Urdu waits on `T3`.

**Deliberately not in this table: carbohydrate reference phases 2 and 3** (entries 18 and 19).
They are real work with code already depending on them, but every slot above is earned and `T5`
gates the public launch. They get a position here when `T5` lands — and 19 needs a ruling before
any code regardless of where it sits.

## NEXT — likely v2, in rough priority order

### 20. §8.2 expires results, never inputs — is that right?
**UNRULED. A specification question, not a screen fix.** Raised 2026-09-13 out of build note 60.

**What the app does today.** §8.2 flips `expired` fifteen minutes after a result, and the result
screen and the block screen both say so. It clears nothing: the typed reading stays in the field.
So any path that recalculates — "Work out the dose" again, or §7.4.1's override, which invalidates,
sets `expired: false` and recomputes — produces a result the app considers **fresh**, from a reading
that is not.

**Why this is not obviously a defect.** §8.2's subject is the ANSWER going stale, and it says so
plainly. Forcing re-entry of the reading is a different rule, and a heavier one: it puts a keyboard
between a man and a dose he has already decided to take, every time he lingers.

**Why it is not obviously fine either.** The reading is the input whose staleness §8.2 exists to
worry about, and the one path where this is sharpest is the override — reached from a screen that
DOES carry the staleness notice, one tap, no input screen in between, and the result is a LARGER
dose than the one that was suppressed.

**What a ruling would have to decide:** whether a stale reading blocks recalculation everywhere,
only on the override, or nowhere; and if it blocks, whether it clears the field or only warns.
Build note 60 records the half that is already shipped — the block screen honouring expiry.

### 18. Carbohydrate reference phase 2 — his own grams, per food
**Trigger: once the list has been used enough that the estimates are visibly wrong for his plate.**

**What phase 1 shipped:** 31 foods, each with an estimate, a confidence (6 high, 24 medium, 1 low)
and a source; 14 carry a `gramsMax` and 25 carry a `varies` note, because the portion genuinely
ranges. The number is an estimate of *a plate nobody weighed* — which is honest, and also the limit
of what a reference can do.

**What phase 2 adds:** he records what **his** roti weighs, and the list shows that instead.

**Constraints, all of which are the point:**
- The stored value is the user's, not reference data. `src/data/carbs.ts` stays a data module with
  no writes — §11.8's reference-data exemption, condition 1: *the module holds data and nothing
  else.* A calibration store is user data and lives with the rest of it.
- A calibrated row must still show the reference figure it replaced and the date it was set. A
  number whose provenance is gone is the class §7.7 exists to prevent.

**Unruled:** per food, per portion, or a single "my roti is this heavy" scale factor.

### 19. Carbohydrate reference phase 3 — the tally that fills the carbohydrate field
**UNRULED, AND IT DELIBERATELY BREAKS A SAFETY PROPERTY. Needs a ruling before any code.**

**What:** pick foods, give each a count, read the total, put the total in the carbohydrate box.

**Phase 1's whole safety argument is that the list never writes into that box.** Both
`src/ui/screens/foods.ts` and `src/ui/copy.ts` state it in those words: *a wrong row can mislead
someone and can never silently drive a dose* — §7.8's property for readings, applied to food.
Phase 3 removes exactly that. A wrong row, or a mis-tapped count, becomes units of insulin.

That is not an argument against building it — the retyping is real friction three times a day, and
friction is what §18.14 names as this app's actual failure mode. It is an argument for deciding the
following **before** any of it exists:

- Does the total arrive as an editable number he confirms, or as a committed value? Editable keeps
  him in the loop; committed is the thing that actually saves the taps.
- Does §10.3's working show the tally, so the dose's provenance survives onto the result screen?
- Does a `low`-confidence row disqualify a food from the tally, or only warn? §10.5's warning
  budget decides where that sits, if anywhere.
- §17's five legs all apply: §4.3 precedence, §11.2 snapshot, §13.2 schema, §13.3 cases, §10.5 rank.

**Recorded 2026-09-13 because it existed nowhere.** Both phases were agreed in conversation while
phase 1 was being built and lived only in a session task list — which is exactly what §20.5's rule
names: a decision not written down does not exist. Found while auditing the documents for the
prune, one step before the prune would have made it permanent.

### 21. Injection-site guidance, for people who were not taught at ten
**Trigger: with `T5`, or whenever the app first says anything to a stranger about technique.**

**Momin's observation, 2026-09-13.** His brother has injected since he was ten and knows where and
how to rotate. Someone who arrives at this app newly diagnosed — or as a parent injecting a child —
may not, and the app currently says nothing about it.

**Why it is more than a nicety here.** `CLINICAL.md` section 10 lists impaired absorption from
repeated injection into one site as a live explanation for needing more insulin while still running
high — the Humulin R label documents exactly that picture, with the ratios entirely correct. **The
app cannot see it and will never flag it**, so the only defence is that the user knows to rotate.

**The line to hold.** Naming the usual sites — abdomen, thigh, upper arm, buttock — and saying to
rotate within and between them is patient education, and is in every insulin label and guideline.
**It is not dosing advice and it must not become any.** No angle, no needle length, no technique
instruction, nothing that varies by product. §14's regulatory posture governs.

**Open:** where it would live. It is not a result-screen advisory and must not enter §10.5's budget;
the how-it-works page is the obvious candidate, and there is an argument for the first-run setup
since that is when a new user is most likely to be new to injecting.

### 22. Nowhere to record a ketone result
**Trigger: a prescriber answering `CLINICAL.md` section 14 question 7.** Recorded 2026-09-13; do not
build it before that answer, because the answer decides whether it needs a recheck clock as well as
a field.

**The gap.** Band E tells the reader to check ketones. **Nothing in the app can record what they
found** — the word does not appear in `src/storage/` or in `Reading` at all. So the export the
prescriber reads, which §10 calls the clinical purpose of this whole project, shows every blood
sugar and no ketone.

**Why it is downstream of question 7 rather than independent.** The guidance pattern is *ketones →
extra insulin → recheck in N hours → escalate if they have not fallen*. ISPAD's N is about 2 hours
and is derived from rapid-acting analogues; Humulin R peaks at 2-4 hours, and section 4 already
refuses two-hour reasoning for it. **A recheck rule with nowhere to record the recheck is advice
with no memory** — but a field built before the interval is known may be the wrong field.

**Related, and separately deferred:** `T9`. §7.8 specified reading entry "available from the home
screen and offered automatically after any band C or band D block" and **only the second half
shipped**, so a reading can be recorded from exactly one screen — `calculator.ts`'s blocked-low
offer. Someone checking every two hours during an illness has nowhere to put those readings unless
each one happens to be a blocked low. Any ketone field wants the same entry point, so the two are
one piece of work.

**The line to hold if it is built:** a recorded ketone value is a record, **never an input to a
dose**. §7.8's "not an input to anything" governs, for the same reason it governs readings.

### 25. A plain-language pass over every user-facing string, before Urdu

**SHIPPED 2026-09-14, in two reviews.** The first covered `copy.ts` as it then
stood; it found the pump contradiction, the imperative-shaped conditionals, and the glossary. The
second covered the ~85 strings that turned out to be rendering from literals elsewhere — because
`copy.ts`'s header claim, *"Every user-facing string, in one file"*, was false. `check-plan.py`'s
`check_ui_text_outside_copy` now holds the claim true, and extending it to read backticks found
eight more that both a hand sweep and a reviewer had missed.

**Five things were flagged and deliberately NOT changed. They are the residue, and they are here so
they are not lost:**

1. **`screens.clearNote` says "other sites on this address."** "This address" means the origin, and
   a reader who does not know what an origin is cannot act on the sentence. No confident rewrite
   was offered — the accurate version is longer than the screen wants.
2. **"Save a copy" scent-matches the wrong tile.** It is the nav label on the path toward deletion,
   and the export screen offers two files with different purposes; a reader heading for "move to
   another phone" may stop at the first thing that says save.
3. **"fast-acting carbohydrate" has no anchor** for a first-timer mid-hypo. Naming examples is
   clinical content, so it is a prescriber question rather than a wording one.
4. **"Check ketones" is instructed three times and explained nowhere.** A missing explainer, not a
   cut — and it belongs with `T12`, which is already blocked on the doctor.
5. **`"away from zero"` in the whole-units mode.** §5's rule is ties half away from zero, which
   differs from "up" only for negatives the interface never shows. The copy states the engine's
   actual rule; "up" would be narrower than the code. Declined deliberately, recorded so nobody
   "fixes" it later.

**What the checker still cannot see:** a sentence assembled by concatenating single-word literals,
and any string built at runtime from data. Neither has appeared yet.

---

**AGREED BY MOMIN 2026-09-13.** Review all of `src/ui/copy.ts` — 218 strings, roughly 4,500 words
— for length, nested clauses and unnecessarily hard terms. **A reviewer proposes; Momin rules; the
change is implemented afterwards.** Nothing is rewritten in place by the review itself.

**Why before `10a` (Urdu), and this is the whole argument.** `10a` says a mistranslation in this file
is a dosing error, not a typo, and needs a translator who can be shown `CLINICAL.md` and asked
whether the Urdu says the same thing. Every sentence simplified now is translated once. Every
tangled one is translated twice, and the second pass costs a clinician's time.

**Scope is the WHOLE file, not one screen**, because the terms have to be decided once. The ISF and
ICR definitions on the how-it-works page are the same strings as the Settings hints — §10.2 reuses
them rather than copying, so "two copies of a clinical definition is two things to keep in step".
Reviewing them separately means deciding the same word twice and risking two answers. The main
deliverable is a **glossary** — one word per concept — with per-string suggestions under it.

**Sequence is how-it-works FIRST**, which is what Momin asked for and is also where the length is:
eleven sections, several of four or five dense paragraphs. It is Tier 1 below, so it is the safest
place to find out whether the suggestions are any good before anything touches a warning.

**Three tiers, and they do not share rules:**

| Tier | What | Rule |
|---|---|---|
| 1 | Explanatory prose — how-it-works, hints that explain | Simplify freely |
| 2 | Labels, questions, buttons, headings | Careful. §10.1 chose these words deliberately and they are short already |
| 3 | **Instructions carrying an action** — "Treat this first. Do not inject.", the 15 g rule, band E, the HI/LO cards | Propose only with a strong argument, and Momin rules each one individually |

**The trap, stated so the reviewer cannot walk into it.** Several Tier 3 strings are ALREADY the
corrected version of a sentence that failed review. v8's compact band E copy read *"Above 250 again
— if this is new, or you feel unwell, check ketones."* For a repeated high reading in someone who
feels well both conditions are false, so the warning stayed on screen while the action quietly
became optional. **That is exactly what a simplification pass produces** — shorter, friendlier, and
a safety regression. `copy.ts`'s comments record these corrections, and they must be read before
anything is proposed.

**Terms that stay unless the argument is overwhelming:**

- **"Stacking"** — the app uses the word on the result screen and in Settings, so the explainer
  teaches it deliberately. Simplifying it here leaves it undefined where it actually appears.
- **ISF and ICR** — §10.1 keeps the QUESTIONS in plain words and names the clinical terms alongside,
  so a person can repeat them back at an appointment. That is the design, not jargon creep.

**On removing sections: flag, never cut.** Several exist because a reviewer found them missing —
§8.5's U-100 assumption went eight months unbuilt. "This seems unnecessary" is frequently "this was
added after its absence caused harm."

**A second beneficiary worth naming:** the glossary is also what `T5`'s audience change needs going
forward. The app is now for anyone with type 1, and the reader who has never been told what ISF
means is the reader it was widened for.

### 26. The two clocks are Humulin R's, and the reader has nowhere to put their own — DONE 2026-09-20

**RULED 2026-09-20 [Momin]: build it. BUILT the same day**, in the shape below, all nine points. The
shape is his, after two rounds of review that first argued against it and then withdrew the argument.

**What shipped, against the nine points.** 1, 2, 3, 4, 6, 7, 8 and 9 in full. Point 5 shipped in two
halves that are not the same: the eat delay is editable and prefilled per class from the labels, and
the stacking windows are keyed by class **in shape and not yet in value** — every row declares the
same 4 and 12 hours, pending `CLINICAL.md` question 10c. That is a hold rather than an omission, and
the entry itself argues for it: the windows fail toward running high, which §2.1 tolerates, while the
eat delay fails toward hypoglycaemia. Shortening a gate is the dose-raising direction and §20.1.1
forbids taking that number off a reading of the literature, so the mechanism ships complete and the
ruling becomes a one-line data edit. `test/insulin.test.ts` pins the hold from the outside, so
changing it is a deliberate act with a test to update.

**Where it lives.** `INSULIN_TIMING` in `src/config.ts` (the clocks), `src/data/insulins.ts` (which
brand is which class), `src/core/insulin.ts` (the gate, the lookups, `effectiveWindows`),
`src/ui/screens/insulin.tsx` (the picker, the echo, the exit). PLAN §8.5.1 is the specification;
`CLINICAL.md` section 4.1 carries the per-class waits and the label each came from.

**All nine points are now built.** Point 4's feedback link shipped once Momin supplied the address:
the dead-end exit carries both a link to the contact form and a `mailto:` with the subject
pre-written, because the reader on that screen is the one the project most needs to hear from and
the one least likely to push through friction.

**Two things this changed that the entry did not predict.** The `settings` row's missing field turned
out to BE the migration — `''` reads as "never asked", so an existing install meets the same required
question on its next open, and no `DATABASE_VERSION` bump was needed. And `RECOVERY_FORMAT` went to 2,
because the mealtime insulin belongs on the block that is copied off the fail-closed screen by hand.

**The problem.** The dose arithmetic is insulin-agnostic — `DosingSettings` is `{target, isf, icr,
mode}` and the app does not know which mealtime insulin is in the pen. The molecule reaches exactly
two clocks: §8.1's 20–30-minute eat delay and §7.4's 4/12-hour stacking windows, plus §7.3's
delete-confirm window derived from the second, and two sentences in `copy.ts` that interpolate them.
`settings.insulinAssumption` says all this on screen and ends *"ask your doctor how long before a
meal to inject"* — **then gives the answer nowhere to live and renders the Humulin R wait after every
dose.** Since `T5` the analogue reader is the more common one, so the fixed clocks are not a
conservative default for the audience; they are the wrong number, rendered daily, to most of it.

**Why the first review was wrong, recorded because the reversal is the useful part.** The objection
was that a picker gives false confirmation of fit to someone who does not know their insulin differs.
That compares the proposal against an ideal informed reader rather than against the shipped screen —
which renders mis-timed advice at the moment of action to everyone, corrected only by prose read
once. And the rationale in `copy.ts` (a setting "would change a label while leaving the advice it
implies untouched") was written against a LABEL-ONLY setting. This changes the behaviour with the
label, so that objection does not reach it.

**One correction to the framing that must not calcify: the eat delay is not secondary.** A rapid
analogue injected 20–30 minutes early is acting before food arrives — the one Humulin-R-specific
behaviour that fails toward hypoglycaemia. The stacking windows fail the other way, holding
corrections longer than needed, which §2.1 treats as the tolerable direction. So "the timing is
secondary" is true of the windows and false of the delay — which is precisely why this is worth
building, and why its numbers need the rigour the dose arithmetic got.

#### The shape

1. **A required question at setup. No default, and no prefill.** The app does not prefill ISF, ICR or
   target — `config.ts` deleted `PRESCRIBED_*` on the ruling that *"a prefilled 150 is a prescription
   wearing the clothes of a default"*. An insulin is the same category. A required question also has
   no tap-through, which is what removes the false-confirmation risk entirely. **No migration value
   either**: an existing install answers the question on next open like everyone else.

2. **Grouped by CLASS, never an alphabetical brand list.** HumuLIN / HumaLOG is on ISMP's confused
   drug names list, as are NovoLIN / NovoLOG and both premix pairs — an alphabetical list seats them
   in consecutive rows, and ISMP's own mitigation is to stop look-alike names appearing
   consecutively. Class headers do that structurally. A WITHIN-class mispick is harmless: tap Humalog
   while taking NovoRapid and every timing shown is still right. Only cross-class picks matter, and
   the grouping is what defends them — helped by a confirmation echo stating class facts and the
   clear-or-cloudy check against the vial in the reader's hand.

3. **Premix and NPH are IN the list, and route to an honest exit.** Not omitted. A NovoMix 30 user
   who cannot find their insulin taps the nearest-looking name and receives a carb-counted dose that
   means nothing for a fixed twice-daily regimen. They are not a wrong-timings case, they are
   **out of model**: premix has no per-meal ratio arithmetic to be correct for, and NPH's 4–12-hour
   peak breaks the stacking model whatever the constants say.

   **And this is a real population here, not a theoretical one.** In the ICMR-YDR registry
   **52.8% of Indian type 1 youth were on once- or twice-daily regimens** — the premix/split-mix
   pattern — against 2.0% in the US SEARCH registry. ISPAD's limited-resource chapter discusses
   premix in type 1 directly, noting some regions receive only premixed insulin. Pakistan's public
   sector supplies **premixed, regular and NPH only**, with analogues unavailable free. The premix
   reader is plausibly more common here than the analogue one.

4. **"I don't know, or mine isn't listed"** suppresses the timing lines, says to ask the doctor, and
   links the feedback form on the blog. That path is today's `insulinAssumption` advice minus the
   wrongly-rendered wait. **The form does not substitute for points 3 and 4**: it catches people who
   KNOW the app does not handle them, and a premix user picking a look-alike does not know.

5. **The eat delay is editable, prefilled from the class. The stacking windows are not editable by
   anyone.** §8.1 is advice — a wrong value mis-times one correct dose and shows as a pattern §7.8
   exists to surface. §7.4 is a GATE, and `T14`'s ketone row already ruled this shape: the person
   most likely to shorten it is the person it exists to catch. The gate has a designed escape —
   §7.4.1's override is per-dose, states its consequence in the reader's own units, and is **recorded
   on the row as `overrodeStacking`**. A shortened window is a permanent override that no row
   records. Worked, using §7.4.1's own decay figures: a window cut to one hour lands a full
   correction on a dose with 150–180 mg/dL of its 180 still pending, and it compounds across a sick
   day.

6. **The label names the insulin.** "units of your mealtime insulin" becomes "units of NovoRapid",
   from the list entry rather than free text.

7. **Both exports record it, and this stands alone.** §1.3 records the basal so the stored picture is
   "the whole regimen rather than half of it" — yet the record names the basal it does NOT log and
   omits the mealtime insulin **every logged row is a dose of**. §7.8's hypo patterns are read
   through kinetics: a low at hour three means something different under regular than under aspart.
   Worth doing even before any behaviour changes.

8. **The class joins `SettingsPeriod`**, beside target/isf/icr/mode — a value, not prose, like
   everything else there. §7.7's revision machinery exists because current settings are not the
   settings that produced a historical row, and an insulin switch is exactly such a change.

9. **Switch-day rule, designed in rather than retrofitted.** The stacking windows model insulin
   ALREADY ON BOARD, so the first calculation after a change must key on the previous injection's
   insulin. Selecting a fast analogue must not shrink the window while regular insulin from lunch is
   still acting. Until the last pre-change dose ages past the advise window, the gate uses the
   **longer** of old and new.

#### What a build touches, so nobody undercounts it

`check-plan.py`'s CANONICAL pins (all three constants, plus the `DELETE_CONFIRM_WINDOW_HOURS`
derivation), §11.2's snapshot and `settingsRevision`, §13.2's golden cases, §7.4.1's invalidation
list, both exports, and `copy.ts`'s two interpolating strings. The canonical machinery is the awkward
part: there stops being "the" value for the checker to assert, so the check has to move from a
constant to a per-class table.

#### Sequencing — RULED 2026-09-20 [Momin]

**Build the mechanism first and prefill every class from published figures**, rather than holding the
whole thing until a prescriber rules. The values are not invented: onset, peak and duration come from
the manufacturers' own prescribing information, which is the same kind of source `CLINICAL.md` cites
for every other number. Humulin R's values are the ones already shipped and already reasoned about;
the rest are label-derived and **say so on screen** — one line telling the reader where the number
came from and to check it against their own prescription.

This ships the export, the label, the premix exit and the honest not-listed path immediately, all of
which are improvements today. **Blocked on nothing; the clinical question below runs alongside it**,
and a ruling tightens the numbers rather than unblocking the work.

### 24. URL routes for the four screens that are not the calculator — DONE 2026-09-17

**WHEN THIS LANDS, THE SITEMAP AND THE SERVICE WORKER BOTH NEED IT.** Flagged by Momin 2026-09-14,
before the work starts, so it is not discovered afterwards.

- **`vite.config.ts`'s `sitemap()` generates ONE url**, because today every screen is reached by
  tapping. Each new route is a new `<loc>`, and each needs its own `lastmod` — the build date is
  correct for all of them only while they ship together.
- **`src/sw.ts`'s navigation branch answers the shell for every path in scope**, which is exactly
  what real routes want — but `NOT_THE_APP` must stay accurate, or a new route named like a file
  breaks, and a new file named like a route silently becomes the app. That pairing is checked by
  `check_worker_knows_non_app_files`.
- **`index.html`'s canonical is a single URL.** Per-screen routes need per-screen canonicals, or
  every route reports itself as the front door and they compete.

**AGREED BY MOMIN 2026-09-09, in conversation. Recorded 2026-09-13, four days late.** It lived
only in a session transcript until then, and in the meantime a reader of these documents — including
me, on 2026-09-13 — would have concluded from §11.5's *"Routing: None"* that the question had been
settled the other way. **An agreement that exists only in a conversation is not an agreement the
project has.**

**The problem it solves,** in Momin's words: *"if I wanted to guide someone to history page I
can't."* There is no way to send anyone a link to anything except the app's front door.

**The four destinations.** Momin named Settings and History; "How this works" was added in the same
exchange as the one you would most want to send someone; **Food list was added 2026-09-13.**

| Screen | Why it qualifies |
|---|---|
| Settings | Shows your prescription. Same thing whenever opened |
| History | Shows your record. Same thing whenever opened |
| How this works | Static prose |
| Food list | A reference table. Reads the same to everyone |

**The test that admitted them, and it is the whole rule:** *a screen that means the same thing
whenever you open it.* None of the four holds a calculation, and none can be made to.

**What is excluded, and this is a safety exclusion rather than a scoping one.**

- **The calculator.** §8.2 expires a result after `RESULT_EXPIRY_MINUTES` — 15 — because a stale dose
  on screen is the hazard that rule exists for. A URL that can restore a screen is a URL that can
  restore a dose, and a link is exactly the artifact that gets opened days later. **No route may
  reach a calculation.**
- **Export.** An action, not a place. A URL that performs an action on open is a different and worse
  idea.

**Blocked on `T3` (Preact).** A router belongs to the component tree; bolting one onto the
hand-rolled shell means hand-syncing the URL against `machine.ts`, which already owns "where the
app is" — two sources of truth, the bug class this project keeps refusing. Writing it before `T3`
also means writing it twice.

**What it would delete, which is the part worth knowing before costing it.** `hardwareBack` in
`src/main.ts` — a sentinel history entry pushed so the Android back gesture means "back inside the
app" instead of closing it. It exists *because* there is no routing, it carries a documented defect
it already caused (`history.back()` on its own bookkeeping navigated the app to `about:blank` while
a row was being written, about one time in three), and real routes make the browser do its job
natively. Like entry 23's dropped `timeZone`, this change removes a mechanism rather than adding one.

**Two things that must move with it:**

1. **§11.5's table says `Routing: None`**, and `src/state/machine.ts:32` repeats it in a comment
   (*"Not a route: §11.5 rules out routing entirely"*). Both become false the day this lands.
   §11.5's real intent — **no URL state** — survives and should be restated that way, since the
   §10.7 back-gesture sentinel already lives inside that reading.
2. **`start_url` stays `/MealUnits/`.** An installed app must open to the calculator. A bookmarkable
   `/history` is fine; an install that launches into history is not.

**How the installed app still opens at the calculator.** The icon and a link are different entry
paths and they answer different questions.

| Entry path | What decides where it lands |
|---|---|
| Home-screen icon | The manifest's `start_url` — `/MealUnits/`, a fixed property of the install. Routes cannot change it |
| A link to `/MealUnits/history` | The link. That is the whole feature |

So the icon opens the calculator however many routes exist. **And this is precisely why the
exclusion above is a safety rule:** because a link can drop someone into a screen cold, every
routable screen has to be safe to arrive at with no context — which is the same test that admitted
the four.

#### What it turned out to be, 2026-09-17

**The blocker was not in this entry.** `/MealUnits/history` returns **404** on GitHub Pages, which
serves files and has no such file. The worker answers in-scope navigations with the shell — but only
once it is installed, and a stranger opening a shared link has no worker. So the naive
implementation breaks precisely the case this entry exists for. The build now emits a real
`index.html` per route, generated from the built shell with its own title, description, canonical
and `og:url`; a link is a 200 on a first visit, with no JavaScript and no redirect. Those heads are
built from `SITE_URL` and `BASE`, so four pages added **zero** new copies of the deployed path —
see `T15`.

**`hardwareBack` was NOT deleted, and the reason is the safety exclusion above.** This entry
expected real routes to make the browser do the work. They do, for the four screens that have
addresses. The calculator's steps deliberately have none, so back INSIDE the wizard still needs an
entry that carries no address — the same mechanism, now also pushing a real path when the address
changes. The function it replaces kept its push-only shape, so the defect this entry attributes to
it is not inherited.

**No router library.** `machine.ts` already owns where the app is, and a router wants to own it too;
the URL is written as a projection of `state.screen` and read back only as which screen to open.
§11.5's row was restated from "Routing: None" to **no URL state**, which is what it always meant,
and `machine.ts`'s comment with it.

**The four excluded screens are not three.** `loading` and `fail_closed` are states rather than
destinations, and both first-run screens are gates — a link past a disclaimer defeats the
disclaimer. A link during first run is spent: boot lands on the gate and the landing only moves the
app on from the ordinary front door. Tested both ways.

**`check_routes_do_not_collide` is new**, because this entry's own warning — a route named like a
file, a file named like a route — was a thing nothing checked. Two seeds, one per direction.

**One thing to verify before building, not to assume.** iOS Safari's *Add to Home Screen* has
historically bookmarked the CURRENT page URL rather than honouring `start_url`. If that still holds,
a person who installs while sitting on `/history` gets an icon that opens history for ever. Android
bakes `start_url` into the WebAPK and is not affected. **Check this against a current iOS before
writing any route** — if it is true, the fix is a redirect on load when the app is launched
standalone at a non-calculator route, and that is design work, not a line.

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

### 4a. Search visibility — SHIPPED 2026-09-14

**Its old status line said "nothing has been done for search, and the recommendation is that the app
should NOT be discoverable" — directly contradicting this entry's own heading, and resting on an
argument `T5` had already removed.** Both are corrected here; the reasoning below is kept as the
record, which is what it was always for.

**What shipped:** Open Graph and Twitter card tags, a canonical URL, a `WebApplication` JSON-LD
block, a 1200x630 preview card, and a sitemap. One description string, 110 characters, used verbatim
by all three surfaces so search, WhatsApp and a doctor's link preview cannot disagree about what this
is — and short enough that nothing truncates, since the clause a preview cuts is always the last one.

**Three things were verified rather than assumed, and two of them changed the plan.**

1. **JSON-LD is NOT blocked by §11.5's `script-src 'self'`.** Checked in Chrome against the exact
   policy string: a script element whose type is not a JavaScript type is a data block, never
   executed, never subject to `script-src`. It is `WebApplication` with a health CATEGORY and
   deliberately not `MedicalWebPage` or any `MedicalEntity` type — those assert in machine-readable
   form that this is medical content, which is the opposite of §14's posture.
2. **The `robots.txt` here is inert, and ships anyway.** Only the apex file is read, and
   `mominbinshahid.github.io/robots.txt` is served by a different repository — it already says
   `Allow: /`, so this app has been crawlable all along. **RULED BY MOMIN 2026-09-14: ship one
   regardless**, for portability rather than crawling: move this repository to its own domain and the
   file is already right, whereas leaving it out means the move silently drops a directive nobody
   remembers was being inherited. A project that depends on a file in another repository has a
   dependency it cannot see.
3. **The apex sitemap lists five URLs and none is MealUnits.** The sitemap here covers this app's own
   path — legitimate, since a sitemap may list URLs at or below its own location — and has to be
   submitted directly in Search Console. **It was NOT added to the apex sitemap** — that file still
   lists the same five URLs. The other repository names this one as a second `Sitemap:` directive in
   the apex `robots.txt` instead, which is the file a crawler reads from the host root. An earlier
   version of this paragraph claimed the sitemap, contradicting its own first sentence; corrected
   2026-09-14 against the live files.

**A fourth thing was got WRONG first, and the correction is the interesting part.** The first draft
wrote `<changefreq>` and `<priority>` by hand. Google's own documentation says plainly that it
*"ignores `<priority>` and `<changefreq>` values"* and that it uses `<lastmod>` *"if it's consistently
and verifiably accurate"* — so the draft shipped the two inert elements and omitted the only one that
works. `priority` is the one most often misread as ranking weight; it never was, and Google dropped
even its within-site meaning.

**`lastmod` is therefore GENERATED, not written.** A date maintained by memory rots on exactly the
change that should update it — §20.5's listing and the precache walk are both in this document for
that reason. It is the build date, which for this app *is* the last modification: every deploy is a
new build of the page. That moved the file out of `public/` and into `vite.config.ts`, which then
needed the deployed origin as a constant — so `check_site_url_agrees` pins it against `index.html`'s
canonical, `og:url` and JSON-LD. **A canonical that disagrees with the sitemap is the specific
failure that makes a search engine pick its own preferred URL and ignore both**, and nothing else
catches it: the build succeeds, the page renders, and the disagreement is visible only to a crawler,
weeks later.

**A second defect was shipped and found by Momin, not by any check.** Opening
`/MealUnits/sitemap.xml` in a browser rendered the CALCULATOR. Every path under this app's scope used
to BE the app — there is no routing — so the worker's navigation branch could answer any of them with
the shell. `4a` put three files inside that scope and did not teach it otherwise.

**It hid well, and the way it hid is the lesson.** `curl` returns the real file, because curl has no
service worker; Googlebot does not run service workers either. So the command line and the crawler
both saw the truth while the person checking the URL did not — and every verification in this entry
was done with `curl`. `check_worker_knows_non_app_files` now pins `sw.ts`'s exclusions against the
crawler-only classification, so a file cannot be one without being the other.

**One regression was introduced and caught before merge.** `vite.config.ts` walks the whole build to
build the precache, so adding a 105 KB preview card put it on the install path of every phone — for a
file only a crawler ever fetches. That is the shape the walk's own comment already rejects for source
maps, "for a developer at a desk, not a phone on mobile data". `check-plan.py`'s
`check_public_assets_classified` now pins every `public/` entry as precached or crawler-only, and
checks both that the classification is complete and that `vite.config.ts` still honours it.

**That was the last thing needing Momin, and it is closed.** The verification tag is live on both
properties and the sitemap is submitted — see `T6`, which now records the Search Console half only.

**What exists** in `index.html`: `<title>`, a `<meta name="description">` that reads *"An insulin
dose calculator for people with type 1 diabetes. Not a medical device."* — corrected on 2026-09-13,
because it still said *"for one person"* after `T5` had made that false, and this is the line search
results and link previews actually show, `lang="en"`, theme colours, and a
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
the name and *"for people with type 1 diabetes, not a medical device"* rather than a bare URL. That is the case where
metadata does safety work — it puts the disclaimer in front of someone BEFORE they open it.

**Still worth adding, and now more so:** Open Graph and Twitter card tags, so a shared link previews
with the name, **who it is for**, and the "not a medical device" line rather than as a bare URL. The
preview copy must say type 1: "insulin dose calculator" is searched by people with type 2 just as
often, and the preview is the last thing they read before deciding whether to open it. For a public app that is
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

**What §11.5 does to the shortlist above — folded in from `T6`, 2026-09-14.** Cookieless and
same-origin are different properties, and only the second one matters to the policy. Plausible is
cookieless and still **blocked**, because its script loads from a third-party origin, as does every
other drop-in tag; the policy refuses them rather than merely discouraging them. Loosening
`default-src 'self'` to admit one analytics origin admits everything else at that origin — which is
the read access to the dose log described above. *Three shapes survive:* a self-hosted collector
behind this same origin, script-free server-side measurement, or GitHub's repo traffic stats, which
survive trivially by not being in the page at all.

**And what may be measured is bounded by the same reasoning as the export.** This app holds blood
sugar readings and insulin doses. Counting page views is fine; anything that could carry a reading or
a dose off the device is not, and nothing in this app has ever sent data anywhere.

**Cloudflare Web Analytics evaluated 2026-09-15, and the evaluation found something larger.** Momin
is moving the blog off GA4 and asked whether MealUnits could use the same tool, so both properties
report consistently. **Nothing is chosen yet — GA4, Cloudflare and anything else are all still open,
and this entry records what any of them has to answer here.**

*On the app itself*, Cloudflare is the shape the fold-in above already refuses. `beacon.min.js`
loads from `static.cloudflareinsights.com` and reports to a Cloudflare endpoint; the policy shipped
on the deployed page is `script-src 'self'; connect-src 'self'`, so it is blocked on load AND on
send. Dropping the snippet before `</body>` yields two policy violations and no data. Cookieless
does not help — the fold-in's point is that same-origin, not cookielessness, is the property the
policy is about.

**The larger finding, which is not about analytics at all.** The dose log lives in **IndexedDB**,
database `MealUnits` (`src/storage/schema.ts:25`), with the `log` and `readings` stores created in
`src/storage/open.ts:56-66`; the service worker additionally uses Cache Storage. **All of those are
scoped to the ORIGIN, not the path**, and the blog shares `mominbinshahid.github.io`. The service
worker's `/MealUnits/` scope does not partition storage — it governs fetch interception.

So a third-party script on any page of the BLOG — homepage, a post, anywhere — runs in the same
origin and can call `indexedDB.open('MealUnits')` and read blood sugar readings and insulin doses.
The database name is the app's name, so there is no practical friction. **MealUnits' CSP protects
MealUnits' documents and has no reach into the blog's pages.** Path is not a security boundary for
storage, and the isolation this app has been assuming is by path.

This is not a property of Cloudflare, or of analytics. It is true of **any** third-party script the
blog loads — a tag manager, an embed, a comment widget, a font that ships JavaScript. The threat is
sharing an origin with a medical record.

**CHOSEN 2026-09-17 [Momin]: Cloudflare Web Analytics.** Ruled after comparing it against GA4,
Plausible, Umami and Fathom. It wins here on the things this app actually needs: free, cookieless
so no consent banner, ~10 KB against GA4's ~50, far less often blocked, and it reports Core Web
Vitals — the one measurement with engineering value here, since it says how the app performs on
the phones people really use. GA4 leads only on custom events, funnels and 14-month retention,
none of which the open question needs, and it is the worst fit in kind: a surveillance-shaped tool
on an app holding blood sugar readings.

**Momin also ruled the origin question 2026-09-17: the blog and the app stay on one origin, and the
CSP is widened for reputable services when a feature needs it.** That admits the third-party script
this entry's §11.5 fold-in refuses, so the fold-in is now a cost he has accepted rather than a bar.
The storage exposure it describes is unchanged and still recorded above — deferred, not withdrawn.

**Still true whatever is chosen, and worth reading before trusting a number:** offline sessions
never report, and offline is when this app matters most. Ad-blockers remove more of a
developer-heavy audience than a general one. The figure will undercount, and it will undercount
exactly the usage most worth knowing about. **Search Console already answers "is anyone finding
this?" for free, with no script in the page** — shipped 2026-09-14, verified on both properties.

**What that does to the remaining options.** GitHub's repo traffic stats survive by putting nothing
in any page, on either property. A self-hosted same-origin collector still survives for the app. And
*Dedicated GitHub organisation / clean origin*, filed under DECIDED as a tidiness matter, now has a
security reason: a separate domain is what makes the isolation real rather than assumed, and it is
the only option that also frees the blog to use whatever it likes. **Raised by the blog session,
2026-09-15; recorded here rather than acted on.**

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

### T3. Move the UI layer to a framework with keyed reconciliation — DONE 2026-09-14, Preact 10.29.8

**SHIPPED.** `src/ui` is JSX throughout, `src/ui/dom.ts` is deleted with `captureFocus`,
`restoreFocus` and `replaceChildren`, and `render()` is one `mount()` call that diffs. 673 tests
pass, up from 670 — the three added are the interaction-continuity cases §13 never had, and all
three were RED before the port. Everything below is the reasoning as it stood, kept because the
argument is the record; **what the port actually found is at the end of this entry, and two of the
four things it found were not predicted here.**

**Trigger: after v1 is in his brother's hands and in use.** Not before. The app is otherwise
complete and verified, and refactoring working code while he is still injecting a fixed 24-25 units
is the wrong order.

**What:** replace the hand-rolled render loop in `src/ui` with Preact. `src/core`, `src/state`,
`src/storage` and `src/config.ts` — **5,662 lines**, counted 2026-09-14 — are untouched, because none
of them import the DOM. `src/ui` itself is 4,719 lines of TypeScript.

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
the field genuinely on screen. **`src/ui/dom.ts` carried the retracted number until 2026-09-14**, and
described the field as "below the fold", the opposite geometry — because the correction was written
here and never propagated there. The file was deleted later the same day; this paragraph is now the
only place either number is recorded.)*

**It has happened TWICE, and only the commit log records the second time.** On 2026-09-13, six days
after the patch shipped, `62bf677` fixed the same defect in the food search: the screen was built
with an `id` and no `data-field`, which is what `captureFocus` keys on, so the restore could not find
the node. Its commit message: *"Note 25's defect, reintroduced by a new screen rather than by a
regression — and 647 tests with a 100% mutation score passed straight over it."* **That is the
patch's own stated failure mode — "it holds only while every render path remembers" — coming true on
schedule.** No build note was written for it, so every document here read as though this happened
once.

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
- **Size — REMEASURED 2026-09-14, and all three of the old numbers were wrong.** The app is
  **36.9 KB gzip** of JavaScript (117.5 KB raw), not 26 KB: it grew with `T5`, `4a` and the food
  list. React is **69 KB** gzip, not 60 — that figure was React 18, and 19 is larger. Preact's
  4.5 KB is right for the core alone; the import set this app actually needs — core, hooks and the
  JSX runtime — is **5.6 KB**. So the real comparison is **+15% against +189%**, on a phone on
  mobile data in Pakistan.
- React's fibre scheduler, concurrent rendering, synthetic events and server components buy nothing
  here — this is a local-only offline PWA with no ecosystem dependencies to shim.

**The honest cost:** Preact would be this project's **first runtime dependency, ever**
(`"dependencies": NONE` today). For an offline medical-adjacent app that is a real change of
posture, not a neutral one, and should be a deliberate decision rather than a default.

**RULED 2026-09-14 after an independent audit, because "the incumbent proposal" is not a reason.**
Momin asked for every serious alternative compared before any code. Preact, React, Solid, Svelte,
Vue, Lit, and *"stay hand-rolled and write the keyed diff ourselves"* were measured — bundle sizes by
building and gzipping, CSP compatibility by grepping the shipped `dist` files for `new Function` and
`eval`, dependency counts by resolving real lockfiles.

| | Preact | React | Solid | Vue (runtime-only) | Lit |
|---|---|---|---|---|---|
| gzip, the import set this app needs | **5.6 KB** | 69 KB | 5.2 KB | 25.2 KB | 6.1 KB |
| Share of the 36.9 KB app | **+15%** | +189% | +14% | +69% | +17% |
| Packages in the lockfile | **1** | 3 | 4 | 23 | 6 |

**Vue is disqualified outright, on a hard constraint rather than a preference.** Its full build calls
the Function constructor to compile templates at runtime — verified in the shipped file — and §11.5's
`script-src 'self'` blocks it. The runtime-only build passes, but then it is 25.2 KB and 23 packages
for a JSX dialect its own community treats as a minority.

**Svelte and Lit are out on the JSX ruling** — neither has JSX at all. Lit is worth naming as the
challenger: `render(template(state), root)` is the closest match to this app's existing architecture
of any candidate. **If the JSX ruling is ever reversed, re-examine Lit, not Vue and not Svelte.**

**Solid loses on fit, not on size.** Its JSX *looks* like React and behaves differently — components
run once, props cannot be destructured, `<Show>`/`<For>` replace ternaries and `map` — so every React
reflex is subtly wrong in a codebase ruled to follow React idiom. Worse, the trap sits exactly on
§11.2's architecture: this reducer replaces the whole state object per dispatch, and `<For>` keys by
*reference*, so every history row is recreated unless threaded through `reconcile()`. **That is the
focus-loss defect this entry exists to fix, reintroduced by the fix.** And `solid-js@2.0.0-rc` is on
npm now, so adopting it means a breaking major immediately.

**React costs +189% for machinery this app never runs** — scheduler, concurrent rendering, server
components. Two concrete costs beyond size: `createRoot().render()` is **not synchronous**, so the
integration suite that is this migration's designated safety net would need `act()`/`flushSync`
retrofitting throughout; and the migration becomes a real sweep (`className`, `htmlFor`, synthetic
event semantics) rather than a mechanical one.

**Hand-rolling the keyed diff loses to this project's own doctrine.** It is 400-800 lines of new
*safety-critical* code with none of the production burn-in, and §13 still has no interaction-continuity
tests to catch its bugs — which is precisely how the original defect survived 541 tests and a 100%
mutation score. Add JSX and you need a factory and a vdom, at which point you are maintaining a
private, worse Preact. **The zero-dependency posture is worth a great deal; it is not worth becoming
a framework vendor with a bus factor of one.**

**So: Preact, and pin `10.29.8` rather than the v11 release candidate.** One package, zero
dependencies of its own — the smallest possible answer to "our first runtime dependency ever". CSP
clean, verified. `render()` is synchronous, so the existing suite's dispatch-then-assert shape keeps
working. `h(tag, attrs, ...children)` matches `dom.ts` exactly and `class` plus lowercase
`onclick`/`oninput` are accepted natively. Seven years on one major version.

**The strongest argument against it, recorded because it is real:** bus factor. Preact is four or
five independent maintainers with no corporate guarantor; React is Meta and Vercel and will certainly
exist in ten years. The counterweight is that Preact's entire source is ~12 KB of readable code this
project could vendor and patch indefinitely — an option `react-dom`'s ~600 KB source does not offer.

**Why the rewrite is lower-risk than it sounds — RECOUNTED 2026-09-14, and the old claim was wrong.**
This said "66 assertions on rendered text and **0** on DOM structure". There are **15 structural
queries** (14 at the recount, plus one added 2026-09-19), not zero: selectors that depend on markup
shape — `#app`, `.ask`, `[role="group"]`, `#label-mode`, `#food-search`, `.entry .n` twice,
`[data-field="foodQuery"]`, `.flag` twice — plus the `label.parentElement.querySelector('input')`
traversal this entry already names.

**The fifteenth is deliberate and is the exception that shows the rule.** §12's storage section takes
`.flag` only when the browser has NOT promised to keep the record, and plain text for the other two
answers — the form carries the severity, so that an amber panel never appears on an answer that is
not a problem. What is under test there IS the markup: no assertion on rendered text can tell you
which treatment a paragraph received. A structural query is the honest tool for a structural claim,
and the count is kept true rather than the query avoided. Queries by element
type alone (`button`, `label`, `p`, `b`, `input`) are not counted: they survive any faithful port.

**The correction makes the safety net BETTER understood, not weaker.** Most of those survive a
faithful port untouched, because Preact renders the same classes and ids — but they are a constraint
on it, and the constraint is the useful part: **the port must preserve class names, element ids, and
the `.entry .n` nesting.** Only two are genuinely fragile — `label.parentElement.querySelector` and
`.entry .n` — and both depend on markup shape rather than on the framework.

The bulk of the suite does find things by label and button text, which is framework-agnostic, and it
stays green throughout the migration. **A count nobody recounted is how "0" survived `62bf677`
adding one**, which is why `check-plan.py` now pins this number.

**Carry these into PLAN.md when it lands** — they are spec, not notes:

- **§11 gains the rule** that the view layer preserves DOM identity across renders, so focus, caret,
  scroll and composition survive a state change.
- **§11 also gains the composition rule, and it is NOT implied by the one above.** Keyed
  reconciliation is necessary but **not sufficient** for IME: a controlled input whose `value` is
  rewritten *during* a composition session can still break it, on a node that was never destroyed.
  So: **never write back to a controlled input's value while a composition is in flight.** Preact
  has had exactly one IME regression (issue #4008, introduced 10.14.1, fixed within days) and the
  fix was making that pattern work. This matters beyond Urdu — see the mobile dropped-keystroke
  report of 2026-09-14, which is a NEW symptom no prior record predicts. Momin narrowed it the same
  day: **every text field, not one screen** — setup and the food search alike — which points at the
  render path they share, not at any single call site.
- **The `value` attribute-versus-property hazard, which nobody has ever written down.** `dom.ts`'s
  `h()` ends in `node.setAttribute(key, String(value))`, so an input's value is set as the **content
  attribute** — the element's *default* value — not as the property. That is harmless **only**
  because `replaceChildren` hands every render a brand-new element whose dirty-value flag is unset,
  so attribute and property agree. **Preserving node identity is exactly what removes that
  guarantee.** Preact sets `value` as a property on reused nodes and is correct; the danger is this
  entry's own promise that *"every existing call site stays as written"*. A half-migrated path that
  keeps `setAttribute` on a reused node gives an input whose displayed value silently stops tracking
  state the moment the user types into it.
- **§13 gains an interaction-continuity requirement, which it does not have today.** §13 has no
  mention of focus, caret, keystrokes or scroll anywhere — which is precisely why 541 tests and a
  100% mutation score missed both symptoms.

  **CORRECTED 2026-09-14: this entry said `typeInto` "sets `input.value` in one assignment and fires
  one `input` event". That was false on the day it was written** — `typeInto` already typed one
  character at a time into `document.activeElement` in the same commit, deliberately, so that the
  whole suite would fail if focus continuity broke. The sentence described the pre-fix state as
  though it were current and was never corrected. **`tools/smoke.mjs` is the one that still types in
  one shot** (`i.value = …; dispatchEvent(new Event('input'))`) — so the only layer that types like a
  person is not a browser, and the only layer that is a browser does not type like a person.

#### What the port actually found, 2026-09-14

Everything above is the plan. Four things came out of doing it, and the plan predicted two.

**1. Predicted, and it held.** The attribute-versus-property hazard never materialised, because no
path stayed half-migrated: `dom.ts` was deleted in the same change that removed its last caller, so
there was never a reused node still being written with `setAttribute`. The way to get this right was
to make the old thing impossible rather than to remember not to use it.

**2. Predicted, and it needed more than the framework.** Keyed reconciliation alone does not carry
IME, exactly as this entry says. The rule is implemented as one shared `TextInput` in
`src/ui/components.tsx`: while a composition is in flight it passes `value={undefined}`, which is the
one thing Preact's value sync treats as *do not touch this input*. Every text field in the app goes
through it — the four that exist, and any that are added. The window is real and arrives unprompted:
§8.2's expiry tick fires a render every minute and on every return to visibility, and between
`compositionstart` and the first `input` event the DOM holds the IME's preview while the app still
holds the last committed value.

**3. NOT predicted — `onCompositionStart` does not work in Preact, in any engine.** Preact infers an
event's real name by probing the DOM: `if (lowerCaseName in dom) name = lowerCaseName.slice(2); else
name = name.slice(2)`. **Nothing exposes `oncompositionstart` as a property**, so the camelCase form
registers a listener for the event type `"CompositionStart"` — capital C — which nothing ever fires.
No error, no warning, a handler that is simply never called. Measured rather than assumed, because
the first instinct was that this was a jsdom gap:

| | `'oncompositionstart' in <input>` |
|---|---|
| jsdom 30 | `false` |
| Chrome 152 | `false` |
| Chrome 152, on `document.body` and on `window` | `false` |

All-lowercase the probe still fails, but `name.slice(2)` then yields `compositionstart`, which is
right. **So the lowercase spelling is correct in both environments and the camelCase spelling is
correct in neither.** `src/env.d.ts` declares the working spelling, because Preact's own types ship
only the broken one. This would have shipped as a guard that silently did nothing; the continuity
test written before the port is what caught it.

**Confirmed upstream after the fact, and it is not a bug we are routing around.** preactjs/preact
[#3003](https://github.com/preactjs/preact/issues/3003), opened 2021-02-11, names these exact three
handlers; it was closed 2025-08-06 as a duplicate of
[#1978](https://github.com/preactjs/preact/issues/1978) with *"will be fixed in v11"* — so v10 will
not change, and pinning 10.29.8 means living with it. The maintainer's position on v10 is explicit:
*"Preact has always and will always support attaching event handlers with the exact casing defined
in the HTML/DOM specs. That is the lowercase variants all work."* The lowercase form is the
SUPPORTED one; what is wrong is the camelCase typing, and the issue thread says so.

**It generalises, which is the part worth carrying.** The rule is not about composition — ANY event
whose `on*` property the DOM does not expose takes the same path, and #3003 names `focusin`,
`focusout` and `beforeinput` in the same breath. `beforeinput` in particular is the one a future
input-handling change would reach for. Before adding a handler for an event not already used here,
check `'on' + name in element` and spell it lowercase if that is false.

**4. NOT predicted — `@preact/preset-vite` cannot be installed here.** It peer-deps `@babel/core`
7.x and Stryker 10 already pins `@babel/core` 8; npm refuses outright and the only way through is a
forced duplicate Babel tree. Not taken. JSX is transformed by **oxc**, which is what Vite 8 uses,
configured as `oxc.jsx` in `vite.config.ts` — setting the `esbuild` block instead is silently ignored
and prints a warning on every run. **No Babel in the toolchain at all.** What is lost is Prefresh,
which preserves component state across a dev edit.

**The lint plugins looked like the same wall and were not, and the first answer here was wrong.**
`eslint-plugin-jsx-a11y` (`^3 .. ^9`) and `eslint-plugin-react` (`^3 .. ^9.7`) both declare peer
ranges that exclude this repository's eslint 10, and npm refuses both. They were dropped on the
reasoning that a lint plugin which half-works reports clean on rules it never ran — true in general,
and **not tested**. Tested afterwards, because Momin asked whether the answer was to downgrade
eslint: **both load and both report correctly under eslint 10.** The ranges are stale, not accurate,
and no downgrade is needed. `package.json` states the relaxation declaratively — `overrides` maps
each plugin's `eslint` peer to `$eslint` — rather than through a global `--legacy-peer-deps`, so it
is scoped to the two packages it is true of.

Both are in. `jsx-a11y` reports **zero findings** on the ported tree, which is the first automated
confirmation the app's accessibility discipline holds. From `eslint-plugin-react`, three rules:
`jsx-key` — which guards the keys this port introduced and which `test/keys.test.ts` cannot see,
since a data test pins that key VALUES are unique and says nothing about a key being absent —
plus `no-children-prop` and `jsx-no-duplicate-props`. The plugin is not extended wholesale: most of
what it carries is advice about a library this project does not use.

`eslint-plugin-react-hooks@7.1.1` declares `^10` and needed no override. It earned its place
immediately, catching a ref read during render and a ref not named `*Ref`.

`eslint-config-preact` is still out, and on its merits rather than on its peer range: it bundles
`eslint-plugin-react-hooks` at `^5.2.0` against the `^7.1.1` above and pins `@eslint/js` to `^9`, so
adopting it would downgrade the one plugin that never needed an override to gain rules already
listed.

The two rules wanted from `eslint-plugin-react` — no inline `style`, no `dangerouslySetInnerHTML` —
are still hand-written `no-restricted-syntax` JSX selectors rather than `forbid-dom-props` and
`no-danger`, because the hand-written ones carry §11.5's `style-src` and §7.7.1's escaping rule in
the message a reader actually gets. They live in the same array as §11.8's, because flat config
REPLACES a rule's options rather than merging them and a second block would have switched §11.8 off
for every ported file while reporting clean.

**Cost.** 117.50 kB raw / 36.86 kB gzip before, 135.03 kB / 42.38 kB after: **+5.5 kB gzipped**,
against the ~4 kB estimated. As a proportion that is +15% of the JavaScript, or +12.8% of the whole
page gzipped — the absolute number is the small one, and both are worth quoting.

**What review caught that nothing else did.** A second opinion on the finished port found one real
regression: the new shared `TextField` wrapped its input in a `<div>`, and the two §1.3 basal fields
had had theirs as a DIRECT CHILD of `div.field.wide`. `.field` is `display: grid` and nothing sets an
input's width, so those two were full width by being grid items — measured in Chrome, they went
**440px to 223px** while every test stayed green. Build note 68 has the full account. The fix removed
the wrapper rather than adding CSS, because the old tree is the one that had been looked at on a
real device; the check added with it asserts the SHAPE the width depends on, which jsdom can see
even though it cannot lay out a page.

The same review found four blind spots in the JSX arms of `check_ui_text_outside_copy` as first
written — multi-line text children (the dominant shape in this tree), text beside an expression, a
double-quoted string inside an expression container, and **any non-Latin prose**, because the word
test was `[A-Za-z]{2,}`. That last one would have reported clean over an entire Urdu screen, in the
checker written to protect `10a`. All four are fixed and seeded; the self-test is 117/117.

**What `check-plan.py` needed, and why it is the part worth remembering.**
`check_ui_text_outside_copy` filtered on `name.endswith(".ts")`. Renaming eight files to `.tsx` would
have left it matching nothing and reporting clean over an entire app's worth of text sitting outside
`copy.ts` — with `10a` then handing a translator a file that no longer held the words. It failed
loudly in exactly one place, the retired-phrase sweep, and only because that one pins a NON-ZERO
count. **A check that expects zero findings cannot tell you it has stopped looking.** Fixed in the
same change as the rename: both filters take `.tsx`, the sweep reads JSX text nodes and
double-quoted attributes as well as quoted and backticked strings, JSX `{/* */}` comments are
stripped first (their continuation lines carry no marker the old prefix test could see), and the
check reads through `load()` so `--self-test` can seed a defect into a `.tsx` file. Three seeded
mutations, all caught; 113/113.

---

### T4. The in-app update prompt — CLOSED 2026-09-09, IT WORKS

**Momin, on a real phone against the deployed app: "in app bar does render and ask me to use it now,
so that's perfect."** Updates reach a phone two ways, both confirmed: the in-app bar renders and can
be tapped, and a full close-and-reopen activates a waiting worker anyway. Nothing outstanding.

**Kept because it was wrong twice, in opposite directions.** First it claimed a device that had
cached a build "stays on it, permanently" and that this blocked launch — wrong; closing and
reopening delivers the new build, which is the lifecycle working as specified. Then it claimed the
in-app prompt never rendered, on the strength of `vite preview` over a LAN — also wrong.

**The lesson that outlives the entry: twice, a confident conclusion was reported from an environment
that could not produce the behaviour under test.** The measurements were real; the setting was not.
`tools/smoke.mjs` exists partly because of this, and the same trap caught the lower-case redirect
check a week later (`BLOG-FIX.md` section 6).

### T5. AUDIENCE CHANGE — the app is for anyone, and three things assume it is not
**SHIPPED 2026-09-13.** Parts 1 and 2 are built; part 3 is a standing consideration, not a task.
What landed, and where the reasoning now lives:

| | What shipped | Where it is recorded |
|---|---|---|
| 1 | The three ratios ship **empty**. `PRESCRIBED_TARGET/ISF/ICR` are deleted | `PLAN.md` §1.2, `src/config.ts` |
| 2 | §6.2's threshold is **derived** from the ratios — `deriveThreshold` | `PLAN.md` §11.8, `src/core/threshold.ts` |
| 3 | §14's regulatory posture — **unchanged, and still a decision to take with eyes open** before promotion | §14 |

**Two things the build turned up that this entry did not predict:**

- **A test forbade prescription defaults and the prefill shipped anyway**, because the test named
  `DEFAULT_TARGET`, `DEFAULT_ISF` and `DEFAULT_ICR` as three literals and the constants were spelled
  `PRESCRIBED_*`. Naming a hazard by one exact identifier is not checking for the hazard. The test
  now matches the SHAPE of the name.
- **`check-plan.py` could not see a constant that never reached `PLAN.md`.** Its completeness check
  read the document, so `BAND_E_FULL_CARD_WINDOW_HOURS` shipped unpinned the day before and the
  checker stayed clean. It now reads `src/config.ts` as the authority on what exists.

**Still open, and it needs Momin:** the ISF and ICR hints say *"Hasham's is 30"* and *"Hasham's is
10"*. Beside a PREFILLED field that was an illustration of a value already there. Beside an EMPTY
field it is the only concrete number on screen, which makes it the path of least resistance for
exactly the stranger this change exists to protect. Left as it was, deliberately — a comment records
that naming him was a decision taken with his permission, and §20.1.1 says ask rather than correct.

---



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

### T14. Vitest is pinned to 4.x, and the pin is not ours to lift
**Trigger: when `@stryker-mutator/vitest-runner`'s own devDependency moves past vitest 4.**

**What:** `package.json` holds `vitest: ^4.1.11`. Vitest 5 is out.

**Why it cannot be taken.** The runner activates a mutant with
`ctx.provide('activeMutant', id)` and reads it back with `inject()` inside the test worker. Under
Vitest 5 the value never arrives, so **every mutant runs against unmutated code and survives.** The
first run under 5 scored **2.57% against 308 passing tests** — not a testing gap, a tool reporting
that nothing happened. For a project whose merge gate is a 100% mutation score, a working runner is
worth more than the newest minor.

**How to tell it is fixed rather than guessing:** read the `Ran N tests per mutant on average` line,
not the score. 1.28 means the mutants are not being activated; 9.05 is the healthy figure on 4.1.11.

**Recorded 2026-09-13.** Build note 15 pointed at this file for it and there was no entry here to
point at — the pin lived only in a build note and in `package.json`'s caret. Same class as the carbs
phases: a constraint with no home is a constraint nobody will find.

**What the 2026-09-13 research settled about the defaults, with sources in `CLINICAL.md` section
2.4 and its source list.** The question Momin raised — *set a standard, then let the user adjust* —
turns out to have a different answer per number, and one of them inverts:

| Number | Kind | What follows |
|---|---|---|
| Target, ISF, ICR | **Individualised.** No citable universal default exists — ISPAD's 500/1800 rules derive from the person's own total daily dose, which this app does not collect | Ship them **empty**. Both the MiniMed 780G and t:slim require a clinician to supply them and prefill nothing. A prefilled 150 is a prescription wearing the clothes of a default |
| Hypo 70 and 54 | **Universal floor.** ADA Standards of Care 2026 Table 6.4; no guidance individualises them downward | Stay absolute and uneditable. These are the best-supported constants in the app |
| Ketone advisory | **Universal in character** — no source makes it patient-adjustable — **but the value is contested** | Must NOT become user-configurable, which is the one place "give the user a config" would be the unsafe answer: the person most likely to raise a ketone threshold is the person it exists to catch |
| Max dose / confirmation threshold | **Hybrid, and the comparators split it the same way** | An absolute ceiling nobody can raise, plus an adjustable check beneath it. The 780G caps the bolus at 25 units and has a clinician-set maximum under that. This is a precedent for T5's "made relative" plan |

**So the T5 plan is supported by published practice on every count**, and the one addition the
research argues for is that the ketone threshold be explicitly excluded from anything user-editable.

### T6. Search Console — DONE 2026-09-14. Its analytics half moved to item 12

**Trigger: alongside item 4a, once the audience change (T5) is ruled on.** Both happened.

**Search Console — DONE.** Both properties are verified twice over: auto-verified through the parent
property, then independently by a `google-site-verification` tag, so this app's ownership does not
rest on the blog's. `/MealUnits/sitemap.xml` is submitted. Reading what people search to land on it
is not a task — it is what the verification exists to make possible, months from now.

**Analytics was the other half of this entry and never shipped.** Its reasoning is folded into item
12, where usage analytics already lived, and **Momin deferred it on 2026-09-14** when step 5 closed:
*"can we discuss analytics after other task?"* This heading used to claim both halves, which is how
a step could look finished while half its entry had not started — splitting them is why it no longer
does.

---

### T14. Lighthouse, and what it is actually worth here

**REQUESTED BY MOMIN 2026-09-13, alongside `4a` and `T6`.** Run Lighthouse — or an equivalent — over
the deployed app and act on what it finds.

**UNBLOCKED 2026-09-14, and deliberately queued behind the other work on Momin's ruling.** The SEO
category's precondition below — run it after `4a` ships — is now met, so nothing is waiting on this
entry except a decision about when.

**Four categories, and they are not equally useful to this app.**

- **PWA and Best Practices** are the two that pay. They check installability, the manifest, the
  service worker, HTTPS and console errors — and this app is an installable offline PWA whose update
  path was measured wrong twice in opposite directions (`T4`). An automated check of the manifest and
  the worker is exactly the layer that caught nothing then.
- **SEO** overlaps `4a` almost entirely: title, meta description, crawlability, a valid canonical.
  Run it AFTER `4a` ships or it will only report what `4a` is already about to fix.
- **Accessibility** is worth running and worth reading sceptically. It catches contrast ratios and
  missing labels, which this app has real history with — but `§10.7`'s touch targets and the
  focus-restoration work in `dom.ts` are the kind of thing it cannot see at all.
- **Performance** is the one to be careful with. The app is a few hundred kilobytes of hand-written
  TypeScript with no framework, no images and no third-party origins; it will score well for reasons
  that have nothing to do with whether it doses correctly. **A green Performance number is not
  evidence about this app's actual risk**, and it should not be quoted as though it were.

**Where it should run.** Against the DEPLOYED app, not `vite preview` — `T4` is in this document
precisely because measuring in `vite preview` gave the wrong answer twice. `npm run smoke` already
drives a served build in real Chrome over two origins, so the harness for "real browser, real build"
exists; whether Lighthouse joins it as a CI job or stays a hand-run check before a release is the
open question, and the honest default is hand-run until it has caught something once.

**What it must not become.** A score to optimise. The failure mode is real and common: shaving
kilobytes or deferring a script to move a number, on an app whose entire value is that the arithmetic
is right and the warnings fire. Treat every finding as a question, not a defect, and write down the
ones deliberately not acted on — the same standing as everything else in this file.

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

### T9. Log a reading, any time — not only after a blocked low

**Momin, 2026-09-13: "the recording on blocked low is something else entirely."** He is right, and
this entry was filed under the wrong idea. Two different features have been sharing one number:

| | What it is |
|---|---|
| **What shipped** | After a band C or D block, the app offers to save the reading it just refused to dose on. That offer exists because the refusals were the rows going missing — it is a by-product of a refusal |
| **What people actually want** | Open the app, type the number you just measured, save it. No dose, no refusal, no occasion. **A log.** Someone checking every two hours during an illness has nowhere to put those readings today unless each one happens to be a blocked low |

**Trigger: Momin's own framing — people want it, so it goes in.** Not "whenever readings matter more
than they do today", which is what this entry said while the feature was the point of §7.8 all along.

§7.8 specified reading entry as *"One field, one button, available from the home screen and offered
automatically after any band C or band D block"*, with an optional `note` from a fixed list — *before
bed*, *overnight*, *felt low*, *after exercise*. **Only the post-block half shipped.**
`COPY.reading.noteQuestion` has no consumer, and `ViewState.readingNote` is never set by any control,
so the fixed list renders only for rows that arrived by import.

**The line that governs it: these entries are RECORD ONLY.** §7.8's *"not an input to anything"* —
a reading never clears suspect provenance, never enters a dose, never moves a gate. That property is
what makes the feature safe to add freely, and note 62 is what happens when it is weakened by
accident. Entry 22's ketone field wants the same entry point and the same rule.

**Miscategorised, deliberately not moved.** This sits under TECHNICAL, whose charter is work waiting
on something outside this project. This waits on nothing — it is a feature request. It keeps the
number because `T9` is cited from entry 22 and renumbering is how pointers rot (§20.3).

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

### T11. Credit the prescribing doctor — BLOCKED ON HIS PERMISSION

**Momin offered the name 2026-09-12 and ruled it stays out until asked.** Recorded so the offer is
not lost and not acted on early.

**Why it is not a formality.** Crediting a named physician on an insulin calculator reads as
clinical endorsement. If a dose goes wrong and his name is on the app, the exposure is professional
and it is his, not ours. Three things follow:

- **Ask him with the exact wording in front of him**, and say where it will appear — a public
  repository and a live app, not a private tool.
- **Credit what he actually did.** He wrote the prescription this app was built around and supplied
  the carbohydrate handout. That is *not* "clinically reviewed by", which would be untrue today and
  is precisely the claim that could harm him.
- **One affiliation, not a list.** A name plus one institution is a credit; a name plus three
  workplaces and their neighbourhoods is a directory entry, and it adds identifiability without
  adding honour. Keep it minimal unless he asks otherwise.

**Where it would go:** `docs/CLINICAL.md` and a credits line on the how-it-works screen. **Never
beside a dose** — §14 says this is not a medical device, and a doctor's name next to a number
argues with that.

**Natural trigger:** the same conversation that asks him to sign off the ketones section (T12),
since both need him and neither should ship without him.

### T12. The ketones section — BLOCKED ON THE DOCTOR

**Drafted 2026-09-12, not shipped.** Band E and the meter-HI guidance tell the reader to check
ketones and name diabetic ketoacidosis, and nothing in the app says what to check with or what a
result means. The draft explains and says when to seek help; it prescribes no doses, which is the
line §14 draws.

**It waits on a physician because three things in it are open, and two are about the app being
wrong rather than incomplete:**

1. **`COPY.meterHi.body` and `CLINICAL.md` section 2.1 may now be out of date.** Both say injected
   insulin alone will not treat ketoacidosis. **ADA Standards of Care 2026 section 6** permits home
   management of MILD ketoacidosis with subcutaneous insulin, hydration and rechecking, for someone
   alert and able to drink. The claim is right for the vomiting case and overstates the rest. Neither
   file was changed — §20.1.1 says ask.

   **Corrected 2026-09-13:** this entry previously also credited the 2024 ADA/EASD consensus with
   permitting home management. It does not — it permits subcutaneous insulin for mild and moderate
   DKA **in emergency departments and step-down units**, which is not home management. Only the 2026
   Standards of Care go to the home.
2. **The 250 mg/dL advisory threshold now sits ABOVE the diagnostic one.** The 2024 consensus and
   ADA 2026 lowered the glucose criterion to 200 — **and removed it entirely for anyone with a known
   diabetes diagnosis** — so a reading of 210 with ketones meets the definition and the app says
   nothing. Changing `KETONE_ADVISORY` trades that gap against alarm fatigue, which is a clinical
   judgement, not ours.

   **Researched 2026-09-13, and it split into two questions rather than one.** The *diagnostic*
   criterion and the *self-testing* trigger are different numbers. The second is genuinely contested:
   CDC and every shipping device say 250, ADA's narrative says "particularly above 200", NICE gives
   no number at all, Diabetes UK gives two. `CLINICAL.md` section 2.4 carries the evidence and the
   citations. **The uncontested part is that illness or symptoms should trigger a test at any
   glucose, and the app has no such trigger** — that half needs a design decision about the warning
   budget rather than a clinical ruling.
3. **No guideline gives a ketone recheck interval for regular human insulin.** ISPAD's "should have
   fallen by two hours" is analogue-derived, and `CLINICAL.md` §4 already refuses two-hour reasoning
   for Humulin R.

**Also settled by the draft's research and worth keeping:** no blood beta-ketone strip is registered
with DRAP, and Abbott's Optium Neo registrations expired 2024-10-09 — so the copy must name no
product. Urine strips are cheap but sold by diagnostic suppliers rather than pharmacies. The
"neither" branch has a real local answer: a lab urine ketone, Rs 250-600, at a 24-hour lab.

**Trigger: the appointment that also settles T11's attribution.** One conversation, both questions.

### T13. Rewriting `check-plan.py` in TypeScript — UNRULED, the trade-off in full

**Momin's question, 2026-09-12: the project is TypeScript, so should the checker be?** Written up so
the question is not re-asked from scratch by every new reader, and left open because it is his.

**Two earlier drafts of this entry got the framing wrong and both are worth recording.** The first
was headed "CONSIDERED AND DECLINED", stating a ruling nobody made. The second said "recommendation
is to decline" while the body conceded there is no technical benefit to Python — which Momin caught:
*if there is no benefit, and this is a TypeScript project, then TypeScript is the natural state and
the only question is when the migration gets paid.* **That is a deferral, not a decline**, and a
verdict in a heading over a conceded argument is advocacy rather than a record.

**So: the cost, plainly, and nothing recommended.** The script
is **2742 lines** carrying **27 checks** and **104 seeded mutations** that each prove a specific
check still bites — figures as of 2026-09-13; `python3 check-plan.py --self-test` prints the
current one. That self-test is the asset, more than the checks are. A rewrite is only finished
when every one of them is reproduced and passing, and until that moment the repository has a checker nobody
can trust, guarding a specification for an app that doses insulin. The best available outcome is
*exactly what exists today, in a different language*.

**The honest case FOR it, so this is not a strawman:** one language in the tree, no `python3` in CI,
and 15 places where the checker reads `.ts` files as TEXT could instead read them as code. That last
one is real — `check_constants` regex-matches `export const NAME = value` and is therefore blind to
any value form its pattern does not anticipate, which is precisely how it failed before v20.

**But that benefit does not need a rewrite, and that is the third option.** The valuable half is
*parsing config as data instead of matching it as prose*, and a ~30-line build step emitting
`src/config.ts` as JSON buys it outright — no language change, no 103 mutations to re-earn. **If this
entry ever becomes work, it is that step, not a port.**

**Why it is Python at all — the actual reason, recovered 2026-09-12 rather than assumed.** Nothing
ever recorded it, and no session transcript on this machine contains the decision. But §20.3 dates
the tool to **plan revision v14**, after *"thirteen rounds"* of review, and every defect class it
was built for is a DOCUMENT defect: a condemned phrase still standing as live spec, a §reference
resolving to nothing, a false completion claim, a §13.2 field with no §11.2 home. **When it was
written this repository was a Markdown specification under adversarial review — no `package.json`,
no `node_modules`, no build, no TypeScript.** Python for a document checker in a repo with no
JavaScript toolchain was not a preference; it was the only thing available.

The fifteen checks that read `.ts` files were bolted on afterwards, once code existed. **That is
also why they read source as TEXT rather than importing it** — an artifact of the tool being older
than the code it now checks, not a robustness decision somebody made.

**And TypeScript is perfectly capable of the job — this entry declines on cost, not on
impossibility.** Node 24 runs a `.ts` file directly with no compile step and no dependencies
(verified by execution, 2026-09-12), so a TypeScript checker would keep the one property that
matters: still working when `src/` does not compile, which is exactly when a checker earns its
keep. An earlier draft of this entry implied otherwise. **An argument won with a wrong reason is
worse than one that concedes the point and still wins**, and the point above — 103 seeded mutations
to re-earn before anyone can trust the result — wins without help.

**Stated plainly, because the entry should not be read as advocacy: there is no remaining technical
benefit of Python over TypeScript here.** Not speed, not the regular expressions, not the file
handling — the work is reading text and comparing it, and both languages do that equally well. The
ONLY thing keeping the script in Python is the cost of moving it. If someone is willing to pay that
cost properly, there is no principle standing in the way.

**And a port is not just the script — the `plan` CI job changes with it.** Recorded because it is
easy to miss and it is where the current arrangement is quietly better:

- The job today is a checkout and two `python3` commands. **No `setup-node`, no `npm ci`, no
  `node_modules`** — `python3` is preinstalled on `ubuntu-latest`.
- A TypeScript checker needs `actions/setup-node` pinned to `.node-version`, because running a
  `.ts` file directly requires Node 22.6 or newer and the system Node on the runner is not
  guaranteed to be one.
- **The zero-dependency property has to be kept deliberately.** The moment the checker imports one
  npm package, the job gains `npm ci` — and then the tool that tells you the specification and the
  code disagree stops working whenever the install is broken. That is the state it must never be
  in, and it is a constraint a port has to be held to rather than discovering later.

**What would make it worth doing, since cost is the only thing holding it:** the port stops being
speculative the moment somebody is already deep in the checker — the `config.ts`-as-JSON work above
is the obvious candidate, since it touches `check_constants` anyway. Doing both at once pays the
migration against a change that was happening regardless.

**Trigger: Momin's ruling, and the options are three, not two.** Port it now; port it alongside the
config-as-data work; or leave it and accept that the repository has one file in another language.
The constraints above are the brief for whichever he picks.

### T15. The deployed path is stated sixteen times and guarded three

**Count is now eighteen, seventeen of them in files that cannot be generated.** `public/404.html` added two on 2026-09-17; both are guarded, because `public/` is copied verbatim and the page whose job is to offer the way back offering a broken one is the worst version of this defect.

**Found 2026-09-17, while costing a possible move to `mealunits.github.io`.** Momin asked the right
question — *"when we move, do we have to change it everywhere?"* — and the answer today is yes, in
more places than the constants suggest.

`vite.config.ts` holds both halves already: `BASE = '/MealUnits/'` (line 48) and `SITE_URL`
(line 54). A domain move is meant to be those two lines. It is not.

| File | Copies | Guarded |
|---|---|---|
| `index.html` | 8 — canonical, `og:url`, `og:image`, `twitter:image`, manifest, apple-touch-icon, icon, JSON-LD `url` | 3, by `check_site_url_agrees` |
| `public/manifest.webmanifest` | 3 — `id`, `start_url`, `scope` | none |
| `public/404.html` | 2 — the link back to the app, and its icon | both, by `check_404_paths_agree` |
| `src/ui/fonts.css` | 3 font URLs | none |
| `public/robots.txt` | 1 sitemap URL | none |

**The failures are silent and they are not equal.** A wrong `scope` in the manifest orphans an
installed app — the icon on a phone stops matching the site it was installed from, and nobody is
told. Wrong font URLs render the page with no webfont and no error. Both survive a green build,
a passing test suite and a successful deploy.

**Why it is not one job.** `index.html` is transformed at build time already (`transformIndexHtml`,
the CSP plugin), so its eight are the cheap ones — and **`24`'s routing work generates four route
heads from the same constants, which takes those eight with it.** The other seven are harder for
real reasons: `public/` is copied verbatim, so the manifest and `robots.txt` have to move out and
be emitted the way `sitemap.xml` already is, which shrinks the `public/` walk that
`check_public_assets_classified` pins and that `check_input_sets` fails on when it empties. And the
idiomatic fix for `fonts.css` — importing the fonts from `src/` so Vite rewrites the URLs — turns
them into hashed filenames, which the worker's precache manifest then has to pick up. That last one
would also clear the "didn't resolve at build time" warnings printed on every build today.

**Order, and the reason for it:** the manifest is the item that can break an existing install, so it
gets a change where it is the only thing moving, rather than riding along with routing.

**Not urgent.** The cost lands on the day the domain actually moves. Recorded now so that day has a
price attached before anyone decides it is cheap.

### T16. This app's crawlability belongs to a repository it does not control

**Recorded 2026-09-18, for book-keeping. Nothing is wrong today.**

`robots.txt` is defined per HOST, not per path. There is exactly one per origin, at `/robots.txt`,
and it governs every path on that host. Crawlers do not look for `/MealUnits/robots.txt`, there is no
include directive, and there is no way to delegate a subtree. So the rules for this app are written
by whoever serves `mominbinshahid.github.io/` — **the blog, a different repository.**

This is already recorded obliquely: item 4a notes that `public/robots.txt` here "is inert, and ships
anyway. Only the apex file is read." This entry names the consequence that note does not.

**Today the apex file reads `Allow: /`, so the app is fully crawlable.** The exposure is that the day
the blog adds a `Disallow` covering `/MealUnits/` — deliberately, or by a template change, or by a
Gatsby plugin default — this app stops being indexed and **nothing here says so**. Search Console
lists "sitemap blocked by robots.txt" as the first cause of a fetch failure, and the symptom is
indistinguishable from the ordinary crawl-scheduling lag that this project has already spent a day
diagnosing (see below). A silent failure whose symptom matches a benign one is the worst shape a
dependency can have.

**It cannot be fixed by agreement.** A promise from the blog side is a social contract, and those
decay without anyone noticing — which is the same argument §20.3 makes about a convention no check
enforces.

**Three options, and only the third is available under the current ruling.**

| | |
|---|---|
| A separate origin for the app | Real isolation: its own `robots.txt`, and it also settles item 12's storage exposure and the github.io crawl sluggishness in one move. **Ruled out 2026-09-17** — Momin keeps one origin and widens the CSP for reputable services when a feature needs it |
| Ask the blog to leave `/MealUnits/` alone | Not a mechanism |
| **Watch it, and make a break loud** | A scheduled job — weekly, not per-commit, since nothing in a pull request here can change another repository's file — that fetches the apex `robots.txt` and fails when a `Disallow` covers a path under `BASE` |

**If the third is built, two things constrain it.** It does **not** belong in `check-plan.py`: that tool
is deliberately offline, and a network call would mean the thing that tells you the specification and
the code disagree stops working whenever the network does — `T13` records the same argument against
letting it acquire an npm dependency. And it must fail only on an unambiguous `Disallow`, never on a
timeout, or it becomes a check people learn to ignore, which `check_copy_hardcodes_config`'s docstring
already names as the failure mode that matters.

**GitHub disables scheduled workflows after about sixty days without repository activity**, so the
watch goes quiet exactly when the project is dormant — which is also when nobody would notice the
blog changing. Worth knowing before trusting it.

**Where this came from.** 2026-09-17/18, diagnosing a Search Console "Couldn't fetch" on the sitemap.
That turned out to be benign — Google's own help lists "low crawl demand" as a cause of that exact
status, and a live test returned "URL is available to Google" — but reading the apex `robots.txt` to
rule it out is what surfaced the ownership question.

### T20. The 12-hour advisory ceiling is shorter than the label it was reasoned from — DONE 2026-09-20

**Found by research, 2026-09-20, verified from the label.** Not part of entry 26 and not changed
with it — this is its own PR, because it drags §7.3 in behind it.

**The finding.** §7.4's advisory window is 12 hours: between 4 and 12 hours after a dose, a
correction is applied in full and the app says the last dose may still be acting; past 12 it says
nothing. Humulin R's own label, section 12.2: *"terminates after approximately 8 hours (range: 3 to
14 hours). In a study that administered 50 and 100 units doses subcutaneously to obese subjects,
mean time of termination of effect was prolonged to approximately **18 hours (range approximately
12-24 hours)**."* Hasham injects 24–25 units a meal. **The advisory expires while the label still
says insulin is acting.**

**Why this is safe to widen.** §7.4 already says the quiet part: *"twelve is chosen because the line
is informational only, so erring long is free."* No dose changes on either side of that boundary —
only whether a sentence appears. And 18 is quoted off a label rather than derived, which is the same
standing as the 20–30.

**Proposed.** Per class, like the eat delay: regular 18, analogues stay at 12. Every analogue is
done inside 5–7 hours by its own label, so widening theirs would only add furniture.

**BUILT as proposed.** Regular human insulin's advise window is 18; the analogues stay at 12.

**Two knock-ons, which are why it was not folded into entry 26.**

1. **`DELETE_CONFIRM_WINDOW_HOURS` is currently *defined* as equal to this number** (§7.3), and
   `checkConfig` asserts the equality. Per-class windows break that. The honest replacement is the
   LONGEST of them — a deleted dose should leave a tombstone for at least as long as any insulin
   could still matter — so the assertion becomes "equals the maximum" rather than "equals the
   constant".
2. **It changes when §7.5's caveat fires.** A 15-hour-old dose becomes a usable record, so "no
   recent dose recorded" appears less often. That is correct — there IS a record — but it is a real
   behaviour change next to the gate, and it deserves its own tests rather than riding along.

**What it took.** `LONGEST_ADVISE_HOURS`, derived as a maximum over the table so a class added later
joins it automatically; `DELETE_CONFIRM_WINDOW_HOURS` points at that instead of at one class's
window, and `checkConfig` asserts the relationship rather than an equality with a constant. Two
golden cases moved from the 12-hour boundary to the 18-hour one — they were always regular
insulin's, and now say so. `check-plan.py` gained a check that the derivation in `src/config.ts` IS
a maximum and not a row lookup, because the constants table reads `PLAN.md` and would not have seen
a re-pointing in the shipping file — the same hole the three timing aliases had, closed here before
a seeded mutation had to find it.

---

### T19. `npm run smoke` reports two failures on a clean tree, and they are the harness — DONE 2026-09-20

**Measured 2026-09-20.** `npm run smoke` ends with:

    smoke: 2 FAILURE(S): and logging it says so,
           insecure origin: AND IT LOGS — the defect this run exists for

**The app is not doing this.** Both were reproduced by hand in Chrome against the same served
build, over `localhost` AND over `http://192.168.1.10:4173/` — a genuinely insecure origin, with
`isSecureContext === false` and `crypto.randomUUID` undefined, which is the case that run exists
for. The dose logs and the screen reads *"Logged 2 units at 5:40 PM"* both times.

**And it is not this change.** `HEAD` (`be8fac8`) was extracted with `git archive`, built and
smoke-tested on its own: identical two failures. It has been reporting them for at least one commit.

**The cause I proposed from READING the harness was wrong, and the record of that is the useful
part.** I said: `tap` is `…find(…)?.click()`, so a button that has not rendered is a silent no-op,
and the log step waits a fixed 500 ms where every other step polls. Both observations were true.
Neither was the cause.

**The cause was §10.4's no-break space.** The check polls for `/Logged 2 units/` with an ordinary
space. The screen reads `Logged 2\u00A0units at 9:35 PM`, because §10.4 puts U+00A0 between every
number and its unit so the pair cannot break across a line. The regex could never match. It has
been failing since the day that rule landed — on a check whose own name is *"AND IT LOGS — the
defect this run exists for"*.

Found by instrumenting rather than by reasoning: the diagnostic printed a screen that plainly read
`Logged 2 units at 9:35 PM` beside an expression returning `false`, which is the only shape that
tells you the two spaces are different characters.

**Fixed centrally.** A `bodyText` expression folds U+00A0 to an ordinary space, and all thirteen
assertions that read the rendered page go through it — because the next assertion about a number
and its unit would have made the same mistake. `test/integration.test.ts` has carried the identical
fold as `plain()` since §10.4 shipped; smoke never got one.

**Both observations were worth acting on anyway, and one of them paid immediately.** `tap` now waits
for the button with `until` and throws when it never appears, naming the pattern and dumping the
screen. On its first run it caught a *second* latent no-op: the food-list session tapped
`/^Food list$/` twice, and the second had nothing to click because that control lives on the
carbohydrate step, which the session had already left. It had been doing nothing quietly for as long
as it had existed. That is the argument for a loud helper, demonstrated rather than asserted.

**One more thing found on the way, and it was the worse of the two.** `SMOKE_LAN_URL` defaulted to
`127.0.0.1`, which Chrome treats as a secure context exactly like `localhost`. So the half of the
run whose entire purpose is an INSECURE origin was, at its default, testing the secure one twice —
including the check that exists for note 48's `crypto.randomUUID` defect, which cannot reproduce on
a secure context at all.

It was visible only because two of its checks assert a negative and reported FAIL rather than
passing vacuously. Every other check in that session would have gone green against a context that
could not exercise them.

**The address is detected now**, from `os.networkInterfaces()`, so the ordinary `npm run smoke`
exercises what it claims to. An explicit `SMOKE_LAN_URL` still wins and `none` still means there is
no second origin.

---

### T18. §7.7's "a threshold-only change does not bump it" is not implemented — ASKING, not fixing

**Found 2026-09-20 while building entry 26, in a browser, and NOT touched.** §20.1.1's rule is that
where the plan and the code disagree, only Momin can say which was meant.

**What the plan says.** §7.7: *"A threshold-only change does not bump it [the settings revision] —
`settingsHistory` carries no `threshold`, so an identical-values row would be noise."*

**What the code does.** `commitSettings` allocates a fresh revision on EVERY save, unconditionally.
There is no comparison anywhere in `app.tsx` or `repo.ts`. Changing only the threshold, only the
basal block, only the name — or, since entry 26, only the pre-meal wait — writes a `settingsHistory`
row identical to the one before it in every field that store holds.

**What it costs.** §7.7.1's export groups by prescription period, so two identical periods print as
two sections with the same ratios and the doses split between them. Not wrong, but noise in the
document whose whole argument is that it does not misstate what produced a row. Nothing about a dose
changes: the row stamp is still accurate, and every period it can point at has identical ratios.

**Why it was not fixed here.** Three readings, and they are not the same change:

1. **Suppress the bump when no `settingsHistory` field moved.** What §7.7 literally says. It makes
   the revision mean "the prescription changed", which is what the export reads it as.
2. **Suppress the append, keep the bump.** Keeps the counter as a change marker for §11.3's
   cross-tab layer while keeping the export clean. More code, two meanings for one number.
3. **Leave it.** An extra period is cosmetic, and the guard is a comparison that has to stay in step
   with the field list — the class of thing that rots silently in the unsafe direction.

The gap predates entry 26 by every revision; `eatDelayMinutes` simply joined the fields it applies
to. **Momin's call.**

---

### T17. Prune the long documents again, after this round

**Momin, 2026-09-18.** `BUILD-NOTES.md`, `BACKLOG.md` and `PLAN.md` have grown through a week of
work. Review them and remove pointers that are done and no longer needed **even for future
reference** — not merely closed, but genuinely spent.

**Step 3a did this once, on 2026-09-13**, under the rule *"we can't keep everything for ever, so we
will only keep things that earn their place."* Two outcomes from that pass are the brief for this
one: every build-note NUMBER survived even where its body did not, because many are cited from
source and tests; and `git log` keeps the figures, which rot in prose.

**The order matters — this waits until the current round lands**, because a note is hardest to judge
while the work it describes is still moving.

**One thing to weigh rather than assume.** Several entries are load-bearing in a way their status
does not show: note 77 records a premise invalidated by a decision made three sections away, and
`T16` records a dependency on a repository this project does not control. Neither is "done" in any
sense that makes it disposable. The test is whether removing it would let the same mistake happen
again unnoticed.

**And one piece of housekeeping to fold in:** two entries in this file are both numbered `T14` —
the Vitest pin and the Lighthouse question. Citations to "T14" are ambiguous today.

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

### D2. Band E's full card resets on a rolling window, not a calendar day — SHIPPED 2026-09-13
**Was entry 23. The number is retired, not reused** — the numbering rule at the top of this file
says why.

**RULED BY MOMIN 2026-09-13: a 12-hour rolling window**, replacing local midnight. §10.5's intent
is *"do not show the big card twice in quick succession"*, and quick succession is a duration. The
date boundary failed at both ends: 23:40 and 00:20 are one episode and got two full cards, while
03:00 and 21:00 are two and the second got a compact line. Twelve hours caps the full card at
twice a day — one for a morning episode, one for a night episode.

**The reasoning now lives where it belongs** and is not repeated here: `PLAN.md` §10.5 for the
boundary and the constant, `CLINICAL.md` §2.3 for why nothing clinical turns on it, and
`src/config.ts` for the value.

**Three things shipped with it that are worth knowing:**

1. **`BAND_E_FULL_CARD_WINDOW_HOURS` is not derived from `STACK_ADVISE_HOURS`** despite holding the
   same 12. One is about insulin still acting, the other about how often a card may be large.
2. **The derivation lost its `timeZone` parameter.** A duration is zone-free, so it no longer
   depends on notes 11 and 21's device-zone ruling — and §18.8's physician question about the reset
   boundary lost its subject entirely.
3. **Two passing tests were DELETED, not adapted** — `history.test.ts`'s *"rolls over at LOCAL
   midnight"* and `integration.test.ts`'s *"a session left open across midnight still gets the FULL
   band E card"*. Both asserted the behaviour the ruling removes. The second was also guarding a
   real shell-wiring bug, so its guard was kept with a scenario the window actually produces.

---

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

**Not restated here.** `PLAN.md` §18 is the list, and keeping a second copy is how the two came to
disagree once already. Five are open: §18.1 (is the 150 target deliberate), §18.7 (regulatory
framing), §18.8 (should the physician see the thresholds), §18.9 (the human-factors walkthrough)
and §18.13 (where the 65 mg/dL readings cluster). The last one is what the export exists to answer.

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
