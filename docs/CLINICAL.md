# CLINICAL.md — every clinical decision, and where it came from

**MealUnits is not a medical device and has no regulatory clearance.** It has not been clinically
validated. This file exists because the MHRA's guidance says a calculator should "always provide
details of the formula used and details of the source research", and because only 30% of the 46 apps
in Huckvale's audit did.

It is one section per decision. Where a decision was argued and then reversed, the reversal is here
too — §19's rule is that a withdrawal is recorded rather than quietly deleted.

**This is not medical advice.** It is a description of what this software does and why, written so a
clinician can disagree with a specific line rather than with the app in general.

---

## 1. The arithmetic

```
correction = (bloodSugar - target) / ISF
meal       = carbs / ICR
total      = correction + meal
dose       = max(0, total), rounded
```

Standard bolus arithmetic, with two properties that matter clinically and that most of the
open-source alternatives get wrong:

**The correction may be negative, and it is subtracted from the meal dose.** ISPAD's 2024 insulin
chapter is explicit that a below-target reading reduces the mealtime dose. Both open-source
calculators read at source (`mxklb/boluscalculator`, `Pancreas-Digital/bolus-calculator`) subtract it
correctly — and **neither clamps the result at zero**, so a large negative correction produces a
negative dose. One of them styles it green; the other silently declines to render it.

**Only the TOTAL is clamped, never the correction term.** Flooring the correction at zero discards
the information that the person is below target, and it does so in the direction that INCREASES
insulin. `src/core/calculate.ts` carries the worked example.

**Source:** ISPAD Clinical Practice Consensus Guidelines 2024, insulin treatment chapter. The
"1500 rule" for regular human insulin is the origin of sensitivity factors of this magnitude; the app
does not compute one, because §5.4 leaves ratios to the prescriber.

---

## 2. The blood sugar bands

| Band | Condition | What the app does |
|---|---|---|
| A. Normal | ≥ 70 mg/dL, correction > −1.5 units | Calculates. Shows the dose and the working. |
| B. Caution | ≥ 70 mg/dL, correction ≤ −1.5 units | Calculates, and cautions. Does not block. |
| C. Low, level 1 | 54–69 mg/dL | **No insulin number at all.** Treat first. |
| D. Low, level 2 | < 54 mg/dL | Same block, escalated wording. |
| E. High | ≥ 250 mg/dL | Calculates normally, and says check ketones. |

**70 and 54 are the ADA/EASD international consensus levels for hypoglycaemia**, and in this app they
are absolute — never derived from any setting, never editable. Level 1 (< 70) is clinically
significant; level 2 (< 54) is the threshold at which neuroglycopenic symptoms are expected.

**Source:** ADA/EASD international consensus on reporting of hypoglycaemia in clinical trials;
ISPAD 2022 hypoglycaemia chapter.

### 2.1 Why the low end blocks and the high end does not

This asymmetry is deliberate and is the single most important clinical decision in the app.

**At low blood sugar, not injecting is the safe default. At high blood sugar, not injecting is the
UNSAFE default.** So the hard gate goes where inaction is safe.

A reviewer proposed refusing to dose above 600 mg/dL and routing to "seek care". That was rejected:
someone at 500 mg/dL needs insulin most, and refusing to help is not safer than helping with a
warning. Diabetic ketoacidosis is real and subcutaneous correction alone is inadequate therapy for it
— which is why band E says check ketones and contact a clinician, and why it does **not** withhold
the dose.

### 2.2 Why the caution band is computed rather than fixed

An earlier draft hardcoded band B as `70 ≤ bloodSugar < 100`. **That number is meaningful only
relative to the target and the sensitivity, and both are prescriber-set.** At a target of 110 a fixed
boundary of 100 announces "well below target" at 10 mg/dL under target, which is noise — and noise is
how warnings stop being read.

The band fires on the exact unrounded correction reaching −1.5 units. At target 150 / sensitivity 30
that is 105 mg/dL and below. At target 110 it would be 65 mg/dL, which is beneath the hard gate, so
the band correctly vanishes.

### 2.3 The ketone advisory repeats without becoming furniture

This user's readings are frequently above 250, so the advisory would appear at nearly every meal — and
a warning that always fires stops being read.

**The fact is never suppressed; only the form de-escalates.** The first qualifying result each
calendar day shows a full card; subsequent ones show a compact line. **The instruction is identical in
both**, and the compact form is never hidden behind a disclosure.

An earlier version's compact copy read "Above 250 again — if this is new, or you feel unwell, check
ketones." For a repeated high reading in someone who feels well, both of those conditions are false,
so the warning stayed visible while the action quietly became optional. **CDC guidance makes a reading
at or above 250 *or* illness a reason to test; novelty is not a prerequisite.** The wording was
corrected.

**Open question for the prescriber:** whether the calendar day is the right reset boundary at all. A
3 a.m. reading and a 9 a.m. reading are arguably one episode.

---

## 3. Insulin stacking

**Humulin R is regular human insulin, not a rapid analog.** Its action lasts roughly 5–8 hours,
against 3–5 for a rapid analog. That longer tail is why this table's windows are what they are.

| Since the last recorded injection | Correction | Behaviour |
|---|---|---|
| under 4 hours | **positive** | Held back; meal covered. Override available. |
| under 4 hours | **negative or zero** | **Applied in full, always.** |
| 4–12 hours | any | Applied in full, with an informational line. |
| over 12 hours | any | Applied in full, no line. |
| no usable record | any | Applied in full, and the app says it does not know. |

**The meal term is never touched.** Food needs covering regardless of what is on board.

**The rule was wrong in an early draft and the correction matters.** "Suppress the correction term"
raises the dose when the correction is negative — the situation where insulin is already on board and
the reading is already below target. Worked: 100 mg/dL with 60 g of carbohydrate and 6 units two hours
ago gives 4 units correctly and **6 units** under the wrong rule. The gate whose purpose is preventing
over-insulinisation would have handed out more insulin.

**There is deliberately no active-insulin decay model.** The duration of regular insulin is
dose-dependent, so a fixed curve would be false precision. The consequence is stated rather than
hidden: at hour three the only available options are 0% or 100% of the correction, and both are wrong
in some situations.

**The 4-hour re-dose interval is an extrapolation and is flagged as one.** It is derived from the 5–8
hour duration, the 2–3 hour analog stacking threshold, and inpatient four-to-six-hourly correction
practice. No source states a number for regular insulin specifically.

**Source:** Humulin R FDA prescribing information; ISPAD 2024 insulin chapter.

---

## 4. Pre-meal timing

The label says inject about 30 minutes before meals; ISPAD says 20–30. **This is the largest practical
difference from a rapid analog, and advice written for analogs is wrong here.**

**The clock starts at the injection, not at the calculation.** An earlier design computed an absolute
eat-time from the calculation clock, which breaks silently: work the dose out at 7:10, get distracted,
inject at 7:35, eat at the displayed 7:40 — a five-minute lead instead of thirty, so the meal absorbs
ahead of the insulin's onset and the peak lands hours later on a falling curve. Nothing on screen
would have indicated the number had gone stale.

Below target the instruction **inverts**: eat first, then inject. A 30-minute fast at 71 mg/dL is
wrong.

With no reading entered the instruction is **suppressed entirely**, because the app cannot tell which
of the two applies.

**Correcting at two hours is wrong for this insulin.** Humulin R peaks around three hours, so a
two-hour correction lands on the rising limb of the meal dose.

**Source:** Humulin R FDA label; ISPAD 2024.

---

## 5. Rounding

Five modes: nearest whole unit (default), nearest half unit, ceiling, floor, and exact-to-hundredths.
All break ties half away from zero.

**Ceiling is gated behind a one-time acknowledgement, and the modes are not neutral peers.** At a
sensitivity of 30, rounding up adds as much as a full unit — 30 mg/dL of unintended extra drop — on
*every* dose, always toward low blood sugar. On a 20-unit meal dose that is 5% and irrelevant; on a
1-unit correction it is a 100% overdose.

**Rounding error is small next to carbohydrate-counting error, but only for meal doses.** Adults miss
carbohydrate estimates by 15–21 g on average, about 21% of the meal, which at a ratio of 10 is 1.5–2
units. A trial feeding 50/60/70 g meals all dosed for 60 g found no significant difference in glucose
or hypoglycaemia. **That premise is absent on a correction-only dose**, where the residual error is
bounded at half a unit — 15 mg/dL at a sensitivity of 30.

**Source:** Smart et al. 2009 (carbohydrate estimation accuracy); Brazeau et al. 2013.

---

## 6. The confirmation threshold

At or above 20 units the app **withholds the dose and shows the two inputs instead**, until an
explicit tap.

**It shows the inputs and not the answer, deliberately.** The error being caught is in the input, so
the input is what must be read; showing the answer lets you check the answer and skip the inputs,
which is the failure the gate exists to prevent.

**Why 20.** A 250 g plate entered as carbohydrate is 25 units *from the meal term alone*, and a 240 g
typo is 24 — so both are caught **at every blood sugar**, not only at a high reading. It is an
input-check threshold, not a clinically validated dose boundary, and it is provisional until the log
supplies a real distribution.

**What it cannot catch.** It catches **transcription** errors — typed 250, meant 200, visible on
sight. It cannot catch **estimation** errors: read the plate as 250 in good faith and the restatement
confirms your own mistake back to you. Since estimation error dominates, the narrower claim is the
honest one.

**Source:** Lyell and Coiera 2017 (automation bias); Schmidt and Nørgaard 2014 (bolus calculators).

---

## 7. The under-dose check

The app compares the **carbohydrate figure you type** against the median of your last 30 logged meals,
and says something when it is under a quarter of that.

**It aims downward because that direction has no other protection.** Type 20 for a 200 g plate and the
result is 2 units instead of 20 — eighteen units missing, roughly 540 mg/dL of untreated trend, in the
direction of ketoacidosis. Every other mechanism in the app looks upward.

**Median, not maximum.** An earlier version compared the *dose* against twice the largest recent dose,
which for this user sat above the maximum dose the app can produce: it could never fire. It was also
self-poisoning — had it fired, the erroneous dose would be logged, the maximum would rise, and the
check would be dead for the next thirty doses. *The row that killed it would have been the exact error
it existed to catch.*

**The upper check turns itself off when it cannot fire**, and says so on the settings screen, rather
than sitting there implying coverage it does not provide.

**The wording accuses nobody.** A 20 g entry is either a real snack or a typo, and nothing at entry
time distinguishes them, so the copy has to read correctly in both cases.

---

## 8. What the app cannot see, and does not model

Excluded, each for a stated reason:

| Excluded | Why |
|---|---|
| Active-insulin decay curve | Dose-dependent duration makes a fixed curve false precision. |
| mmol/L | mg/dL-native is asymmetrically safer here: `8` typed into a mg/dL field is *rejected* by the 20–600 range, while `150` typed into an mmol/L field would give roughly 85 units. |
| Time-of-day ratio profiles | The only study designed to detect diurnal insulin sensitivity in type 1 diabetes found no significant between-meal difference and concluded the pattern is individual. |
| Fat and protein dosing (FPU / Warsaw) | Reliably improves the late curve and reliably causes more hypoglycaemia doing it. Dietary protein is *protective* (odds ratio 0.16), so adding insulin for it removes a safety margin. |
| Exercise, illness, alcohol | Undetectable by the app. **Disclosed in the interface rather than modelled.** |
| Photo carbohydrate estimation | Estimates are 32–73% off; one study found a frontier model over-estimating by 20 g or more on 38% of meals against 3% for dietitians — and over-estimation is the overdose direction. |
| Meter connection | Web Bluetooth is absent from Safari on iOS and awkward for bonded glucose profiles on Android. Manual entry, accepted. |

**Source:** Brazeau et al. 2013; Bell et al. (fat/protein); Smart et al. 2009.

---

## 9. Number formatting

Every rule here is a Joint Commission "do not use" item or an ISMP error-prone abbreviation, not a
style preference:

- **No trailing zero.** `1.0` is misread as 10.
- **Always a leading zero.** `.5` is misread as 5.
- **Never abbreviate units as "U".** `4U` is misread as 40 — a tenfold overdose. Spelled out
  everywhere, including screen-reader text.
- **A space between the number and the unit**, and never a line break between them. `10Units` has been
  misread as 100.
- **12-hour times with an unabbreviated marker**, and **noon and midnight written out**. "12:00 PM" is
  routinely misread, and a lunch dose at noon is this app's daily case.

**Source:** ISMP List of Error-Prone Abbreviations, Symbols, and Dose Designations; Joint Commission
Do Not Use list.

---

## 10. What the record is for

**The clinical purpose of this project is the record, not the arithmetic.**

The user's brother currently injects a fixed 24–25 units per meal regardless of the reading or the
meal, plus 36 units of long-acting insulin. His blood sugar runs high most of the time, and has fallen
to **65 mg/dL**.

At his prescribed ratios, a 330 mg/dL reading with a 50 g meal calls for **11 units**. He injects 25.
Both numbers are real and they differ by 14 units.

**Several explanations fit that pattern, and this app does not choose between them:**

- Impaired absorption from repeated injection into the same sites. The Humulin R label documents
  hyperglycaemia associated with affected sites and hypoglycaemia on switching to unaffected ones —
  needing more insulin and still running high is exactly that picture, with the ratios entirely
  correct. It is the cheapest thing on this list to check.
- The long-acting dose, if the lows cluster overnight.
- Exercise and alcohol, which the app cannot see.
- Ratios that are wrong for him.

**What the record discriminates.** Lows clustering after smaller-than-usual meals support the
fixed-dose explanation. Lows clustering overnight point at the long-acting insulin instead. Note the
verb: support, not confirm.

**The app must not claim its number is the right one**, and its interface deliberately backs neither:
"Neither this app nor your usual dose has been checked against the other."

**The one thing that helps from day one and depends on no ratio being correct** is the band C gate. At
65 mg/dL the app refuses to produce a dose at all. Nothing in his current routine stops him injecting
25 units at that reading.

---

## 11. Readings with no dose are recorded, and that is not incidental

An early version logged injections only. So a blocked low produced **no row at all** — and the 65
mg/dL events, the very ones the record exists to explain, were systematically absent. Overnight
readings were missing for the same reason. No amount of time would have fixed it: the data was never
captured.

Recording a reading exposes no insulin quantity and does not weaken the block. The offer appears
*after* the treat-first instruction, never instead of it.

---

## 11a. The prescription is prefilled, and what that costs

**The app opens with target 150, ISF 30 and ICR 10 already in the fields.** They are shown, not
applied silently, and nothing is stored until the setup is saved.

**Earlier revisions refused to do this**, and the argument against it was not vague. Prefilled
values create one specific hazard: the day the prescriber changes a ratio, a device that has lost
its record will refill the OLD number. Worked through with real figures — if the insulin-to-carb
ratio moves from 10 to 15 and the app quietly restores 10, a 150 g meal is dosed at 15 units instead
of 10. **Five units of Humulin R at a sensitivity of 30 is about 150 mg/dL of unintended drop**,
which takes an ordinary post-meal 180 to roughly 30. The reason that is dangerous rather than merely
wrong is that **nothing on the screen would look different**.

**What changed is the word "quietly".** The values are on screen, one question per screen, and the
setup cannot be completed without moving through all of them. The basal figures are left empty on
purpose, so the save is blocked until the person has actually been present for the sequence. And the
target of 150 sits deliberately outside its own 90–140 plausibility band, so the app raises its
one-time "is that right?" on the exact value most likely to have moved — **which is why that band
must not be widened to make the prompt go away.**

**The residual risk, stated plainly: someone who taps through without reading gets the previous
prescription.** That is weaker than requiring all three to be typed. It was accepted because the
person this was built for currently injects a fixed 24–25 units at every meal regardless of reading
or carbohydrate, and an app that demands data entry before it will help is an app that loses to the
habit it exists to replace.

**For the prescriber:** if any of the three values changes, it must be changed in the app at the
same visit. The exported record prints the ratios that produced each dose, so a row calculated under
older ratios is never displayed under newer ones — that is the check that catches this after the
fact, and it is the reason to look at the export rather than trusting the current settings screen.

---

## 11b. The record carries a name

**The app asks for a name at setup, optionally, and prints it on the exported record** — "Ahmed's
insulin record" — and in the filename.

**Why:** a document whose purpose is being handed to a clinician should say whose it is, and a folder
holding several months of exports should not be several files nobody can tell apart.

**What it means for privacy, stated rather than assumed.** The name is personal information held in
plaintext, in the same browser storage as everything else, and printed into a file that may be
emailed or messaged. Nothing leaves the device unless someone sends it — there is no backend and no
sync — but the export is exactly the thing intended to be shared, so the name travels with it. It is
optional, and leaving it blank produces the previous behaviour in full.

**It changes nothing clinical.** It enters no calculation, appears on no screen that shows a dose,
and has no effect on any number the app produces.

---

## 12. Regulatory position

All three regulators name this app type as a medical device. The MHRA lists "apps and software that
are intended to calculate the dose of insulin a diabetic needs… based on carbohydrate in a meal"; EU
MDCG 2019-11 names insulin-dose-recommendation software at a Class IIa floor; the FDA has product code
QRX plus January 2026 clinical-decision-support guidance.

**Three exits are closed by the MHRA's own text.** Free does not exempt — "placing on the market"
covers free of charge, and names open source. Disclaimers are insufficient. And "just arithmetic"
fails: "calculators linked to specific devices/drugs are likely to qualify as devices whatever the
complexity of the calculation."

What Loop, AndroidAPS and OpenAPS rely on is **structural** — the user compiles or self-hosts, so
arguably nothing is placed on the market. The disclaimer text is not the load-bearing part.

This is a summary of what the regulators' own documents say. It is not legal advice.

---

## 13. Load-bearing sources

- ADA/EASD international consensus on reporting hypoglycaemia — the 70 and 54 mg/dL levels.
- ISPAD Clinical Practice Consensus Guidelines 2022, hypoglycaemia.
- ISPAD Clinical Practice Consensus Guidelines 2024, insulin treatment — negative corrections, the
  1500 rule for regular insulin, the U-40 hazard.
- Humulin R (regular human insulin) FDA prescribing information — onset, peak, duration, injection-site
  effects.
- Accu-Chek Aviva Expert and Medtronic MiniMed manuals — the two reference implementations, which
  disagree on the *form* of the sensitivity calculation.
- Huckvale et al. 2015 — the 46-app audit: eleven had a ratio inverted, 70% documented no formula.
- Smart et al. 2009 — carbohydrate estimation accuracy and the 50/60/70 g trial.
- Brazeau et al. 2013 — carbohydrate counting error in adults.
- Schmidt and Nørgaard 2014 — bolus calculators, review.
- Lyell and Coiera 2017 — automation bias in clinical decision support.
- ISMP List of Error-Prone Abbreviations, Symbols, and Dose Designations.
- CDC diabetes guidance — ketone testing at or above 250 mg/dL, or when ill.

---

## 14. Questions worth putting to the prescriber

1. **Is the target of 150 mg/dL deliberate, and what would need to change for it to come down?** It
   is above the ADA's 80–130 preprandial goal, which is defensible given the 65 mg/dL readings — but
   the app treats it as fixed and this file should not pretend to know why it was chosen.
2. **Have the injection sites been examined?** It is the cheapest explanation on the list in §10 and
   the only one with a physical sign.
3. **Where do the lows fall?** The record answers this, and the answer changes which of §10's
   explanations is live.
4. **Should the ketone advisory reset on a calendar day, or on something else?**
5. Long-acting insulin is 36 units of a daily total of 84–111 — **32–43%**, against a commonly cited
   40–50%. That is arithmetic from his own figures, recorded so it reaches you, and not a
   recommendation.
