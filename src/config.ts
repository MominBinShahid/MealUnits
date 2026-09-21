/**
 * §11.8 — every number in this codebase lives here, and the lint rule in
 * eslint.config.js is what keeps it that way.
 *
 * The file separates the kinds of number, because they carry different
 * permission to change. A clinical constant needs clinical review; an app-set
 * default needs an argument; a unit conversion needs nothing at all.
 */

// ─── CLINICAL CONSTANTS ────────────────────────────────────
// DO NOT CHANGE WITHOUT CLINICAL REVIEW. Sources differ by line and are named
// per line, because "ADA/EASD definitions" covered this whole block until
// 2026-09-13 and only the first two are ADA/EASD.
export const HYPO_LEVEL_1 = 70; // §3 band C — treat, do not inject. ADA/EASD
export const HYPO_LEVEL_2 = 54; // §3 band D — escalated wording. ADA/EASD
// CDC, not ADA/EASD. The SELF-TESTING trigger is contested and the guidance
// does not converge — CDC and every shipping device say 250, ADA's 2026
// narrative says "particularly above 200", NICE gives no number at all, and
// Diabetes UK gives 13 mmol/L on one page and 14 on another. Separately, the
// DKA DIAGNOSTIC criterion moved to 200, and vanishes entirely for anyone with
// a known diagnosis.
//
// HELD AT 250 BY MOMIN, 2026-09-13, as an interim value pending the prescriber
// (CLINICAL.md section 14 question 5). It is the majority position and the one
// this app has always shipped; moving it is a clinical judgement, not ours.
export const KETONE_ADVISORY = 250; // §3 band E — check ketones
export const FAST_CARB_GRAMS = 15; // the 15-15 rule
export const RECHECK_MINUTES = 15;

// ─── APP-SET DEFAULTS ──────────────────────────────────────
// DEFAULT_THRESHOLD is GONE, removed 2026-09-13. It was 20, and its only
// consumer was the first-run draft. §6.2's threshold is now worked out from the
// three ratios by `deriveThreshold`, so on first run there is nothing to
// default: the field is blank until the ratios it is computed from exist.
export const DEFAULT_MODE = 'nearest'; // §5

// ─── THE PRESCRIPTION, PREFILLED (§1.2, CHANGED ON MOMIN'S RULING) ──────────
// v8 shipped these as "seed values" and both reviewers rejected it. §1.2's
// §1.2 — THE PRESCRIBED VALUES ARE GONE. Removed 2026-09-13 with the audience
// change (`BACKLOG.md`'s "AUDIENCE CHANGE — the app is for anyone, and three
// things assume it is not"). `PRESCRIBED_TARGET` 150, `PRESCRIBED_ISF` 30 and
// `PRESCRIBED_ICR` 10 used to prefill the first-run draft.
//
// The prefill was accepted against §1.2's explicit refusal on ONE argument:
// this is for one person who needs zero friction, and the values ARE his
// prescription. Momin ruled on 2026-09-08 that the app is for anyone with type
// 1 who can enter their own three numbers, and that premise is the whole of
// what the argument rested on. For a stranger, 150 / 30 / 10 is not a stale
// prescription — it is SOMEONE ELSE'S, and §1.2's worked example applies with
// more force: an ICR of 10 against a real 15 doses a 150 g meal at 15 units
// instead of 10, roughly 150 mg/dL of unintended drop.
//
// Published practice says the same thing and was checked before the change:
// no citable universal default exists for these three, because ISPAD's 500 and
// 1800 rules derive from the person's own total daily dose, which this app does
// not collect. The MiniMed 780G and the t:slim both require a clinician to
// supply them and PREFILL NOTHING. A prefilled 150 is a prescription wearing
// the clothes of a default.
//
// WHAT WENT WITH THEM: the first-run acknowledgement used to fire BY DESIGN,
// because 150 sits outside its own 90-140 soft band and that made the prefilled
// value conspicuous. With the fields empty there is no prefilled value to make
// conspicuous. The acknowledgement still fires for anyone who genuinely enters
// 150; it has simply stopped being a first-run tripwire, and nothing else
// depended on it.

// ─── §6.2's CONFIRMATION THRESHOLD, DERIVED ────────────────
// The default was a flat 20 units, which is one person's number: at ISF 50 /
// ICR 30 the same tenfold typo doses 16.7 units and sails past it. `deriveThreshold`
// in `src/core/threshold.ts` works it out from the ratios instead.
//
// Read the formula aloud: one and a half times the dose that the largest single
// portion in this app's own food table would need at a high reading.
//
// 100 g is not a guess. It is the largest single portion in `src/data/carbs.ts`
// — a tandoor kulcha — measured against that table on 2026-09-13, where the
// median portion is 37 g. Grounding it in the project's own data beats picking
// a round number, and if the table grows a bigger dish this number is the one
// to revisit.
export const THRESHOLD_MEAL_GRAMS = 100;

// NOT `KETONE_ADVISORY`, which also holds 250. That one is a clinical trigger
// for testing ketones; this one is a reference point for sizing a typo catch,
// and the two have no relationship beyond the coincidence of their value.
// Neither is derived from the other, for the same reason
// `BAND_E_FULL_CARD_WINDOW_HOURS` is not derived from `STACK_ADVISE_HOURS`.
export const THRESHOLD_HIGH_READING = 250;

// The headroom over that reference dose. §6.2's history warns in both
// directions — a threshold set too high is a dead tier, one set too low "fires
// always, trains tap-through" — so this is the knob that matters most.
//
// 1.5 reproduces the hand-calibrated 20 EXACTLY for target 150 / ISF 30 /
// ICR 10: 100/10 = 10, (250-150)/30 = 3.33, and 1.5 x 13.33 = 20. That a
// formula built from published reasoning lands on the number a person tuned by
// hand is the best evidence available that neither is arbitrary.
export const THRESHOLD_MULTIPLE = 1.5;

// ─── BAND B (§3.2) ─────────────────────────────────────────
export const BAND_B_CORRECTION_UNITS = -1.5; // at or below: caution copy

// ─── ROUNDING (§5) ─────────────────────────────────────────
export const INCREMENT = { nearest: 1, half: 0.5, ceil: 1, floor: 1, off: 0.01 } as const;
export const HUNDREDTHS_SCALE = 100; // §2.2 integer representation

// ─── CLOCK AND TIMING (§7.6, §8.1) ─────────────────────────
export const CLOCK_SKEW_TOLERANCE_HOURS = 1; // §7.6 future-timestamp bound

// ─── THE TWO CLOCKS, PER INSULIN CLASS (§8.1, §7.4, §8.5) ──
// DO NOT CHANGE WITHOUT CLINICAL REVIEW. Until 2026-09-20 there was one row
// here and it was Humulin R's, rendered to everyone — which since the audience
// change is the wrong number, shown daily, to most readers.
//
// Only two things in this app depend on WHICH insulin is in the pen. The dose
// arithmetic does not: target, ISF and ICR are the reader's own and already
// account for their insulin. These two do.
//
// `src/data/insulins.ts` says which class a brand belongs to. This table says
// what a class means. The split is §11.8's: that file holds facts about the
// world, this one holds the decisions taken from them.
//
// ## The pre-meal wait, and why each range is what it is
//
// This is the one that fails toward HYPOGLYCAEMIA. A rapid analogue injected
// twenty minutes early is acting before the food arrives, and §2.1 calls that
// the unsafe direction — which is why these are label-derived rather than
// reasoned from onset curves.
//
// Each range is a GUIDELINE recommendation where one exists, and the label
// where one does not. That rule was arrived at the hard way — see below.
//
//   regular      20-30   ISPAD 2024, chapter 9: "If regular insulin is used as
//                        prandial insulin, it should be administered 20-30 min
//                        before each main meal." Humulin R's own label says
//                        "approximately 30 minutes", a point rather than a
//                        range; the range is ISPAD's.
//   rapid        10-15   ISPAD 2024, chapter 9, GRADE [A]: "RAI should be given
//                        ideally 10-15 min before meals or, at least,
//                        immediately before meals, given the strong evidence
//                        that the rapid action not only reduces postprandial
//                        hyperglycemia but nocturnal hypoglycemia may also be
//                        reduced." Verified from the Karger PDF by two
//                        independent research passes, 2026-09-20.
//   ultra_rapid    0-0   Fiasp and Lyumjev are both labelled for injection at
//                        the START of the meal. Zero is the instruction, not a
//                        missing value, and the interface says so in words
//                        rather than rendering "wait 0 minutes".
//
// ## The rapid row shipped at 5-10 for a few hours, and that was wrong twice
//
// **The derivation was wrong.** 5-10 was the INTERSECTION of what the three
// rapid-analogue labels permit: NovoLog says "within 5-10 minutes", Humalog and
// Apidra say "within 15 minutes before". 5-10 does sit inside all three, and
// the arithmetic is sound. It is still meaningless — a minimum taken over
// heterogeneous regulatory filings is an artefact of the documents, not a fact
// about insulin. The ceiling came entirely from ONE label, and that label's EU
// twin (NovoRapid, same molecule, same manufacturer) says "immediately before a
// meal" instead. Label-permitted is not the same question as recommended.
//
// **The safety reasoning was backwards.** The rationale written alongside it
// was that eating sooner than optimal runs high, which §2.1 tolerates, while
// eating later than onset ends in a hypo — so the narrower, earlier-eating
// answer was the safe one. ISPAD's grade [A] finding is that the LONGER
// pre-bolus reduces nocturnal hypoglycaemia, and two independent reviews report
// no added hypo risk. The asymmetry runs the other way for this interval.
//
// **And it was incoherent.** The regular row already took ISPAD's number.
// Taking a guideline for one class and a label intersection for another is not
// a rule, it is two habits.
//
// ## One outlier, recorded rather than accommodated
//
// Insuman Rapid's SmPC says "15 to 20 minutes before a meal" — shorter than the
// class figure. It stays at the class figure: ISPAD gives 20-30 for regular
// insulin as a CLASS, and preferring one manufacturer's filing over a graded
// guideline is the exact mistake the rapid row just made. Per-brand waits would
// also destroy the reason the list is grouped — that a within-class mispick
// leaves every timing correct. The Insuman reader is served by the editable
// field: their prescriber's number overrides the class.
//
// The reader may replace the range with a single number from their own
// prescriber — see `RANGE.eatDelay`. That is the answer §8.5 used to ask for
// and then give nowhere to live.
//
// ## The ADVISE windows differ, and the reason is a label rather than a model
//
// `stackAdviseHours` is the informational one: between the suppression window
// and this, a correction is applied IN FULL and the app says the last dose may
// still be acting. Past it, the app says nothing. No dose changes at that
// boundary — only whether a sentence appears — which is why §7.4 records that
// "erring long is free" here.
//
// **Regular human insulin gets 18 hours because its own label says so.**
// Humulin R, section 12.2: the effect "terminates after approximately 8 hours
// (range: 3 to 14 hours)", and then, verbatim — "In a study that administered
// 50 and 100 units doses subcutaneously to obese subjects, mean time of
// termination of effect was prolonged to approximately 18 hours (range
// approximately 12-24 hours)." Momin's brother injects 24-25 units a meal. At
// 12 hours the app fell silent while the label still said insulin was acting.
// 18 is quoted, not derived, which is the same standing as the 20-30.
//
// **The analogues stay at 12, and widening them would be furniture.** Every one
// is finished inside 5-7 hours by its own label — Fiasp returns to baseline at
// ~7 h even at 0.4 U/kg, Lyumjev at ~7.3 h even at 30 units — so 12 already
// carries a wide margin, and §10.5's budget is spent on lines that mean
// something.
//
// ## The SUPPRESSION windows are identical in every row
//
// They move by class in the SHAPE of this table and not yet in its values, and
// that is a deliberate hold rather than an oversight. CLINICAL.md question 10c
// asks the prescriber whether the 4-hour suppression and 12-hour advisory may
// shorten for a rapid analogue and to what. Nobody has answered.
//
// Shortening a gate is the dose-RAISING direction, and §20.1.1 forbids picking
// a clinical number off a reading of the literature. Holding a correction
// longer than an analogue needs runs high, which §2.1 tolerates, and §7.4.1's
// per-dose override — recorded on the row as `overrodeStacking` — is the
// designed escape for the reader who knows better on the day.
//
// `stackSuppressHours` is the GATE: inside it a positive correction is held
// back. **RESEARCHED 2026-09-20, and the answer is: do not shorten it.** Every
// regulated device that ships a duration-of-insulin-action default lands on 4
// hours or above — Medtronic 670G and 780G both 4 (range 2-8), Accu-Chek 4,
// mySugr 4.5, Tandem's Control-IQ forced to 5. The bolus-calculator literature
// argues for longer rather than shorter, and names this exact candidate as the
// hazard: Walsh 2014, that a duration "too short such as 3 hours can hide
// insulin stacking and lead to hypoglycemic events that are then compensated
// for by incorrectly adjusting other pump settings". The only citable FLOOR is
// 3 hours, from ISPAD 2024's "less than 2-3 h intervals" and ADA's Safe at
// School material — both written for people reasoning without a decay model,
// which is a different situation from a calculator that has none by design.
//
// So the values stay, and `CLINICAL.md` now says why rather than saying nobody
// has looked. `effectiveWindows` in `core/insulin.ts` already handles the
// switch day if a prescriber ever does move one.
//
// WHEN THESE STOP BEING EQUAL: `COPY.explain.stackingWindows` and
// `COPY.explain.stackingHold` interpolate the shipped pair as though there were
// one, which is true today and false the moment a row changes. They must take
// the reader's class. Recorded here because this comment is what the person
// making that edit will be reading.
export const INSULIN_TIMING = {
  regular: { eatDelayMinutes: [20, 30], stackSuppressHours: 4, stackAdviseHours: 18 },
  rapid: { eatDelayMinutes: [10, 15], stackSuppressHours: 4, stackAdviseHours: 12 },
  ultra_rapid: { eatDelayMinutes: [0, 0], stackSuppressHours: 4, stackAdviseHours: 12 },
} as const;

// §8.1's pre-meal window, and it is REGULAR HUMAN INSULIN'S — an alias onto the
// table above rather than a second copy, so the two cannot drift. Everything
// that still reads this constant is describing Humulin R specifically: the
// timing tests' fixture, and the prose in `CLINICAL.md` section 4.
export const EAT_DELAY_MINUTES = INSULIN_TIMING.regular.eatDelayMinutes;

// ─── DIVERGENCE CONFIRMATION (§7.1) ────────────────────────
export const DIVERGE_MIN_UNITS = 5; // absolute floor
export const DIVERGE_RATIO = 3; // 3x or one third

// ─── RANGES (§4.5) ─────────────────────────────────────────
// hard = reject outside.  soft = accept, confirm once.
export const RANGE = {
  bloodSugar: { hard: [20, 600] },
  carbs: { hard: [0, 300] },
  target: { hard: [70, 200], soft: [90, 140] }, // ceiling lowered in v17
  isf: { hard: [5, 200], soft: [20, 100] },
  icr: { hard: [1, 100], soft: [5, 50] },
  threshold: { hard: [10, 45], soft: [15, 35] },
  basalUnits: { hard: [1, 150], soft: [5, 80] }, // §1.3
  // §7.1 — added in v9 WITH a soft band of 0.5-60, struck 2026-09-11. The
  // amount screen is a half-unit stepper, not a typed field, so a fixed band
  // confirms the wrong thing: a calculated 55 stepped to 61 is ordinary and
  // a 61 against a calculated 12 is not, and only the divergence check can
  // tell those apart. `bloodSugar` and `carbs` carry no soft band either.
  injected: { hard: [0.01, 100] },
  // §8.5 — the pre-meal wait, when the reader replaces the class range with
  // their own prescriber's single number.
  //
  // ZERO IS A LEGITIMATE FLOOR, not a missing value: Fiasp and Lyumjev are both
  // labelled for injection at the start of the meal, so a hard floor above zero
  // would refuse an instruction printed on a label. §4.1's rule that a zero is
  // not an empty applies here as much as to a reading.
  //
  // The ceiling is 45 and it is PROVISIONAL — CLINICAL.md question 10b asks the
  // prescriber for the real bounds. It sits above regular human insulin's own
  // 30 with room for a prescriber who wants longer, and stops well short of the
  // waits that turn a pre-meal dose into an unaccompanied one. The confirm-once
  // band closes at 30 for the same reason: past the longest wait any mealtime
  // label states, a typed 40 is more likely a slip than a prescription.
  eatDelay: { hard: [0, 45], soft: [0, 30] },
} as const;

// ─── STACKING (§7.4) ───────────────────────────────────────
// Aliases onto `INSULIN_TIMING`, for the same reason `EAT_DELAY_MINUTES` is
// one: they are regular human insulin's windows, and naming them from that row
// is what stops a per-class edit leaving a second copy behind.
export const STACK_SUPPRESS_HOURS = INSULIN_TIMING.regular.stackSuppressHours;
export const STACK_ADVISE_HOURS = INSULIN_TIMING.regular.stackAdviseHours;

/**
 * The LONGEST advise window any class declares.
 *
 * Exists because §7.3's delete-confirmation window used to be defined as equal
 * to `STACK_ADVISE_HOURS`, and that stopped being a single number on
 * 2026-09-20. A deleted dose must leave a tombstone for at least as long as ANY
 * insulin could still matter to the gate — and the delete rule should not
 * depend on which insulin the reader happens to be on today, which is the other
 * reason this is a maximum rather than a lookup.
 *
 * Derived rather than written down, so a class added to the table joins it.
 */
export const LONGEST_ADVISE_HOURS = Math.max(
  ...Object.values(INSULIN_TIMING).map((timing) => timing.stackAdviseHours),
);
// Declared after STACK_ADVISE_HOURS deliberately — v9 printed this above it,
// which is a TDZ ReferenceError if transcribed literally [R1].
export const DELETE_CONFIRM_WINDOW_HOURS = LONGEST_ADVISE_HOURS; // §7.3

// ─── PLAUSIBILITY ADVISORY (§6.5) ──────────────────────────
export const ADVISORY_MIN_ELIGIBLE = 10;
export const ADVISORY_WINDOW = 30;
export const ADVISORY_LOW_DIVISOR = 4;
export const ADVISORY_HIGH_MULTIPLE = 3;

// ─── WARNING BUDGET (§10.5) ────────────────────────────────
// At most two advisory elements on the result screen at once. Each of version
// one's four was individually defensible; together they train "warnings here
// are noise", which then degrades the band B caution — the one that must land.
export const ADVISORY_BUDGET = 2;

// How long band E's FULL card stays spent before another one may be shown.
// RULED BY MOMIN 2026-09-13: 12 hours, replacing a calendar-day boundary.
// §10.5's intent is "do not show the big card twice in quick succession", and
// quick succession is a DURATION. A date boundary failed it at both ends: a
// 23:40 reading and a 00:20 reading are one episode and got two full cards,
// while 03:00 and 21:00 are plainly two and the second got a compact line.
// Twelve hours fixes both and caps the full card at twice a day — a morning
// episode and a night episode each get one.
//
// NOT DERIVED FROM `STACK_ADVISE_HOURS`, which happens to hold the same value.
// That one is about insulin still acting; this one is about how often a card
// may be large. They share a number and nothing else, and §11.8 puts them in
// different sections for exactly that reason. If one moves, the other does not.
export const BAND_E_FULL_CARD_WINDOW_HOURS = 12;

// ─── TIMING (§8.2, §11.3) ──────────────────────────────────
export const RESULT_EXPIRY_MINUTES = 15;
export const POLL_INTERVAL_MS = 4000;

// ─── UNIT CONVERSION AND FORMATTING ────────────────────────
// Not decisions — arithmetic. They are here because §11.8's rule is that no
// numeric literal appears outside this file, and a rule with a "well, obviously
// not THAT number" clause is a rule nobody can enforce mechanically.
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;
export const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR;

export const HOURS_PER_HALF_DAY = 12; // §10.4 the 12-hour clock
export const HOURS_PER_DAY = 24;
export const CLOCK_MINUTE_DIGITS = 2; // 8:05 AM, never 8:5 AM
export const MAX_FRACTIONAL_DIGITS = 2; // §4.2 grammar
export const HUNDREDTHS_DIGITS = 2; // §2.2 textual decimal placement
export const HALF = 2; // divisor, not a threshold
// The digit at which half-away-from-zero rounds up (§2.2's tie rule).
export const ROUND_UP_FROM_DIGIT = 5;

// The lexical grammar allows at most one integer digit beyond the field's
// maximum (§4.2), so "6000" is rejected on length before it is rejected on
// range and a paste of the whole meter screen never becomes a reading.
export const GRAMMAR_INTEGER_DIGIT_SLACK = 1;

// ─── INTERFACE (§10.1, §10.7, §18.14) ──────────────────────
// Not clinical, and not arithmetic either — but §11.8's rule has no "except the
// interface" clause, and a rule with an exception nobody wrote down is the one
// that lets a threshold drift into a render function.
export const WIZARD_STEPS = 3; // §18.14 — reading, carbohydrate, result
// §10.7 — fixed-width inputs sized to expected length, so a four-digit reading
// typo is visible. The keypad stops here rather than letting a stuck key run.
// MAX_ENTRY_DIGITS was here: one flat cap of 4 for both fields. It counted the
// integer and fractional parts TOGETHER, so `100.25` grams of carbohydrate was
// unenterable while §4.2's grammar and `RANGE.carbs` both accept it. Replaced by
// `maxIntegerDigits(field)` in `core/parse.ts`, derived from each field's own
// maximum, because a limit written as a number drifts from the range it is
// supposed to mirror and nothing notices.
// The display name is bounded so an imported file cannot carry an unbounded
// string into the interface or into the readable export's heading. Not a
// validation of the name — it is whatever he calls himself — just a length.
export const MAX_NAME_LENGTH = 40;
// §7.1 — the amount stepper moves in half units, because §5 has a half-unit
// mode and a pen that measures them.
export const AMOUNT_STEP_HUNDREDTHS = HUNDREDTHS_SCALE / HALF;
export const JSON_INDENT = 2;

// ─── CONFIRMATION FEEDBACK (§7.2) ──────────────────────────
// A single short buzz when the row is COMMITTED, and at no other moment. Short
// enough not to be alarming, long enough to be felt through a pocket.
export const COMMIT_BUZZ_MS = 30;

// ─── ROW IDENTIFIERS (see core/ids.ts) ─────────────────────
// A v4 UUID, built from `crypto.getRandomValues` because `crypto.randomUUID`
// is SECURE-CONTEXT ONLY and the phone reaches this app over a LAN address.
export const UUID_BYTES = 16;
export const HEX_RADIX = 16;
export const UUID_VERSION_BYTE = 6;
export const UUID_VARIANT_BYTE = 8;
export const UUID_VERSION_4 = 0x40;
export const UUID_VARIANT_RFC = 0x80;
export const UUID_LOW_NIBBLE = 0x0f;
export const UUID_VARIANT_MASK = 0x3f;
export const UUID_HEX_PAIR = 2;
/** RFC 4122's 8-4-4-4-12, as BYTE counts per group. */
export const UUID_GROUPS = [4, 2, 2, 2, 6] as const;

// ─── SERVICE WORKER (§11.4) ────────────────────────────────
// How often the app may ask whether a newer worker exists, when it returns to
// the foreground. Registering does NOT check, and the browser's own check needs
// a navigation — which an installed PWA can go days without. Without this a
// phone stays on the build it first cached, carrying whatever that build got
// wrong.
export const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
// How many times, and how often, the page LOOKS at `registration.waiting`
// after startup. Every service-worker event can fire outside the window in
// which it is useful, so the state is observed directly instead. Bounded: it
// stops as soon as an offer is made, or after these attempts.
export const UPDATE_LOOK_ATTEMPTS = 10;
export const UPDATE_LOOK_INTERVAL_MS = 1000;
// §11.4's "policy for hanging requests" lives in `src/sw.ts`, NOT here, and
// this comment is the pointer so its absence does not read as its removal. The
// worker compiles in its own TypeScript project against the WebWorker lib with
// no access to the app's module graph, so it cannot import from this file —
// which is why `eslint.config.js` exempts it from §11.8's literal rule. An
// exported copy stood here until 2026-09-11, imported by nobody, duplicating a
// live value that could drift: the one file whose whole premise is being the
// single source cannot also hold a second, dead definition.

// ─── SCHEMA (§11.3) ────────────────────────────────────────
export const SCHEMA_VERSION = 1;
// §11.3's recovery block carried a `RECOVERY_FORMAT` integer beside this one
// until 2026-09-21. Nothing ever compared it — it was written as a constant and
// overwritten on read — so the independent versioning it claimed to provide was
// never implemented. See `RecoveryBlock` in `storage/schema.ts` for the rule
// that stands in its place.

/**
 * §11.8's self-consistency test, as an executable assertion rather than a
 * paragraph. §13.3 requires it and v8's own version of it was broken: it
 * asserted "every default lies inside its own soft band", which fails on the
 * physician's target of 150 against a soft band of 90-140 — on day one, on the
 * prescription itself. Worse than a false failure, it created pressure in two
 * wrong directions: widen the soft band and weaken the confirmation, or "fix"
 * the target, which §18.1 forbids.
 *
 * What survives is structural only. §11.8: "the self-check validates structural
 * relationships. Golden cases pin intended behaviour. Neither substitutes for
 * the other."
 */
/**
 * The table is declared `as const` so the shipped values keep their literal
 * types, which is what makes `RANGE.threshold.hard` destructure without a
 * possibly-undefined. `checkConfig` takes this wider shape instead, so a test
 * can hand it a deliberately broken range.
 */
export interface RangeSpec {
  readonly hard: readonly [number, number];
  readonly soft?: readonly [number, number];
}
export type RangeTable = Readonly<Record<keyof typeof RANGE, RangeSpec>>;

/** One class's two clocks. See `INSULIN_TIMING`. */
export interface ClassTiming {
  readonly eatDelayMinutes: readonly [number, number];
  readonly stackSuppressHours: number;
  readonly stackAdviseHours: number;
}
export type InsulinTimingTable = Readonly<Record<keyof typeof INSULIN_TIMING, ClassTiming>>;

export interface ConfigValues {
  readonly range: RangeTable;
  readonly insulinTiming: InsulinTimingTable;
  readonly thresholdMealGrams: number;
  readonly thresholdHighReading: number;
  readonly thresholdMultiple: number;
  readonly defaultMode: string;
  readonly hypoLevel1: number;
  readonly hypoLevel2: number;
  readonly ketoneAdvisory: number;
  readonly stackSuppressHours: number;
  readonly stackAdviseHours: number;
  readonly deleteConfirmWindowHours: number;
  readonly eatDelayMinutes: readonly [number, number];
  readonly advisoryLowDivisor: number;
  readonly advisoryHighMultiple: number;
  readonly advisoryMinEligible: number;
  readonly advisoryWindow: number;
  readonly divergeRatio: number;
  readonly divergeMinUnits: number;
  readonly amountStepHundredths: number;
}

/** The values this build actually ships. */
export const SHIPPED: ConfigValues = {
  range: RANGE,
  insulinTiming: INSULIN_TIMING,
  thresholdMealGrams: THRESHOLD_MEAL_GRAMS,
  thresholdHighReading: THRESHOLD_HIGH_READING,
  thresholdMultiple: THRESHOLD_MULTIPLE,
  defaultMode: DEFAULT_MODE,
  hypoLevel1: HYPO_LEVEL_1,
  hypoLevel2: HYPO_LEVEL_2,
  ketoneAdvisory: KETONE_ADVISORY,
  stackSuppressHours: STACK_SUPPRESS_HOURS,
  stackAdviseHours: STACK_ADVISE_HOURS,
  deleteConfirmWindowHours: DELETE_CONFIRM_WINDOW_HOURS,
  eatDelayMinutes: EAT_DELAY_MINUTES,
  advisoryLowDivisor: ADVISORY_LOW_DIVISOR,
  advisoryHighMultiple: ADVISORY_HIGH_MULTIPLE,
  advisoryMinEligible: ADVISORY_MIN_ELIGIBLE,
  advisoryWindow: ADVISORY_WINDOW,
  divergeRatio: DIVERGE_RATIO,
  divergeMinUnits: DIVERGE_MIN_UNITS,
  amountStepHundredths: AMOUNT_STEP_HUNDREDTHS,
};

/**
 * Takes its values as an argument rather than reading the module directly, so
 * the check can be RUN against a broken configuration and shown to report it.
 *
 * §20.3's standard, which this repository has had to learn five times: "a check
 * that cannot be shown to fail on a real defect is not a check", and in every
 * case reading the check suggested it worked while running it revealed
 * otherwise. A self-check that can only ever be called on the shipped values
 * has no failing case, and therefore no evidence.
 */
export function checkConfig(values: ConfigValues): string[] {
  const problems: string[] = [];

  for (const [name, range] of Object.entries(values.range)) {
    const [hardLo, hardHi] = range.hard;
    const soft = range.soft;

    if (!(hardLo < hardHi)) {
      problems.push(`RANGE.${name}: hard range is not ordered (${hardLo}, ${hardHi})`);
    }
    if (soft) {
      const [softLo, softHi] = soft;
      if (!(softLo < softHi)) {
        problems.push(`RANGE.${name}: soft band is not ordered (${softLo}, ${softHi})`);
      }
      if (softLo < hardLo || softHi > hardHi) {
        problems.push(
          `RANGE.${name}: soft band [${softLo}, ${softHi}] escapes hard range [${hardLo}, ${hardHi}]`,
        );
      }
    }
  }

  // §6.2's derivation, checked at its premises rather than at its output.
  // `deriveThreshold` clamps into the hard range, so the output cannot be
  // wrong; what CAN go wrong is an input that makes the formula meaningless.
  //
  // The reference high must sit above every acceptable target. `deriveThreshold`
  // floors the correction term at zero so a target above it cannot produce a
  // threshold BELOW what the meal alone needs — this makes that guard's premise
  // checkable instead of leaving it as a sentence in a comment two files away.
  const [, targetHi] = values.range.target.hard;
  if (values.thresholdHighReading <= targetHi) {
    problems.push(
      `THRESHOLD_HIGH_READING ${values.thresholdHighReading} must be above the highest acceptable target (${targetHi})`,
    );
  }
  // Headroom, not parity. At a multiple of 1 the threshold equals an ordinary
  // large meal's dose and §6.2's "fires always, trains tap-through" failure
  // arrives; below 1 it fires on doses smaller than a normal meal.
  if (values.thresholdMultiple <= 1) {
    problems.push(`THRESHOLD_MULTIPLE ${values.thresholdMultiple} must be greater than 1`);
  }
  if (values.thresholdMealGrams <= 0) {
    problems.push(`THRESHOLD_MEAL_GRAMS ${values.thresholdMealGrams} must be above zero`);
  }
  if (!(values.defaultMode in INCREMENT)) {
    problems.push(`DEFAULT_MODE "${values.defaultMode}" is not a rounding mode`);
  }

  // The fixed clinical constants order as 54 < 70 < 250. The patient's
  // configurable target is NOT a clinical constant and does not belong in this
  // ordering [R2].
  if (!(values.hypoLevel2 < values.hypoLevel1 && values.hypoLevel1 < values.ketoneAdvisory)) {
    problems.push(
      `clinical constants are out of order: ${values.hypoLevel2} < ${values.hypoLevel1} < ${values.ketoneAdvisory}`,
    );
  }

  if (!(values.stackSuppressHours < values.stackAdviseHours)) {
    problems.push(
      `stacking windows are out of order: ${values.stackSuppressHours} < ${values.stackAdviseHours}`,
    );
  }
  // §7.3 — the delete window tracks the LONGEST advise window rather than one
  // class's, because a tombstone must outlive every insulin the gate could
  // still be reasoning about. It was `=== stackAdviseHours` until the advise
  // windows stopped being one number.
  const longestAdvise = Math.max(
    ...Object.values(values.insulinTiming).map((timing) => timing.stackAdviseHours),
  );
  if (values.deleteConfirmWindowHours !== longestAdvise) {
    problems.push(
      `DELETE_CONFIRM_WINDOW_HOURS (${values.deleteConfirmWindowHours}) must equal the longest stackAdviseHours (${longestAdvise})`,
    );
  }

  // §4.4 — a zero divisor is a division by zero, and §2.3 rule 3 forbids a
  // numeric fallback, so there is nothing to recover to. The guarantee is made
  // HERE rather than re-checked at every calculation: if these floors stay above
  // zero, the resolver's range gate already excludes it and a second runtime
  // branch would be code no input can reach.
  for (const field of ['isf', 'icr'] as const) {
    const [floor] = values.range[field].hard;
    if (!(floor > 0)) {
      problems.push(`RANGE.${field}.hard floor is ${floor}; a zero divisor would reach the calculation`);
    }
  }

  // §8.5 — the per-class clocks, checked as a TABLE. There stopped being "the"
  // eat delay on 2026-09-20, so a check written against one pair stopped being
  // able to see the other two — which is the shape of every gap §20.3 records.
  const [delayFloor, delayCeiling] = values.range.eatDelay.hard;
  for (const [name, timing] of Object.entries(values.insulinTiming)) {
    const [eatLo, eatHi] = timing.eatDelayMinutes;
    // `<=`, not `<`. An ultra-rapid analogue's instruction is "at the start of
    // the meal", which is the pair [0, 0] — a point rather than a range, and a
    // check demanding a width would reject the one label that states an exact
    // moment.
    if (!(eatLo >= 0 && eatLo <= eatHi)) {
      problems.push(`INSULIN_TIMING.${name}: eat delay is not an ordered non-negative pair (${eatLo}, ${eatHi})`);
    }
    // The prefill has to be enterable. A class range outside the bounds the
    // reader's own field accepts would prefill a value the same screen refuses,
    // and the reader would have no way to put it back.
    //
    // Stryker disable next-line ConditionalExpression,EqualityOperator: the
    // `eatLo < delayFloor` half is unreachable while `RANGE.eatDelay`'s floor
    // is zero — anything below it is negative, and the check above reports that
    // first with a better message. It is written out rather than dropped
    // because the floor is a value someone may move (CLINICAL.md question 10b
    // asks for the real bounds), and a one-sided check would then silently stop
    // covering half of what it claims to.
    if (eatLo < delayFloor || eatHi > delayCeiling) {
      problems.push(
        `INSULIN_TIMING.${name}: eat delay [${eatLo}, ${eatHi}] escapes RANGE.eatDelay [${delayFloor}, ${delayCeiling}]`,
      );
    }
    if (!(timing.stackSuppressHours < timing.stackAdviseHours)) {
      problems.push(
        `INSULIN_TIMING.${name}: stacking windows are out of order (${timing.stackSuppressHours}, ${timing.stackAdviseHours})`,
      );
    }
  }
  // The three surviving single-value constants are ALIASES onto the regular
  // row. Asserting that rather than trusting it is what stops an alias being
  // quietly re-pointed at another class — the constants are what `CLINICAL.md`
  // section 4's Humulin R prose and `check-plan.py`'s pins both name.
  const regular = values.insulinTiming.regular;
  if (
    values.eatDelayMinutes[0] !== regular.eatDelayMinutes[0] ||
    values.eatDelayMinutes[1] !== regular.eatDelayMinutes[1]
  ) {
    problems.push(
      `EAT_DELAY_MINUTES [${values.eatDelayMinutes[0]}, ${values.eatDelayMinutes[1]}] is not INSULIN_TIMING.regular's [${regular.eatDelayMinutes[0]}, ${regular.eatDelayMinutes[1]}]`,
    );
  }
  if (
    values.stackSuppressHours !== regular.stackSuppressHours ||
    values.stackAdviseHours !== regular.stackAdviseHours
  ) {
    problems.push(
      `the stacking constants (${values.stackSuppressHours}, ${values.stackAdviseHours}) are not INSULIN_TIMING.regular's (${regular.stackSuppressHours}, ${regular.stackAdviseHours})`,
    );
  }

  // §6.5's triggers must be able to fire at all — the lesson from v3's
  // unreachable dose trigger. A divisor or multiple of 1 or below makes the
  // trigger either always-on or dead.
  if (!(values.advisoryLowDivisor > 1)) {
    problems.push(`ADVISORY_LOW_DIVISOR ${values.advisoryLowDivisor} would fire on every meal`);
  }
  if (!(values.advisoryHighMultiple > 1)) {
    problems.push(`ADVISORY_HIGH_MULTIPLE ${values.advisoryHighMultiple} would fire on every meal`);
  }
  if (!(values.advisoryMinEligible > 0 && values.advisoryMinEligible <= values.advisoryWindow)) {
    problems.push(
      `ADVISORY_MIN_ELIGIBLE ${values.advisoryMinEligible} cannot be met inside a window of ${values.advisoryWindow}`,
    );
  }

  // §7.1 — a ratio of 1 or below makes every injection diverge, which is the
  // tap-through training §6.2 warns about.
  if (!(values.divergeRatio > 1)) {
    problems.push(`DIVERGE_RATIO ${values.divergeRatio} would confirm every injection`);
  }
  if (!(values.divergeMinUnits > 0)) {
    problems.push(`DIVERGE_MIN_UNITS ${values.divergeMinUnits} removes the absolute floor`);
  }

  // §7.1 — the amount stepper moves in HALF UNITS, because §5 has a half-unit
  // mode and a pen that measures them. A step of two units would make the
  // stepper unable to express the amounts the mode exists for, and a step
  // larger than the smallest whole dose is a stepper nobody can land on.
  if (values.amountStepHundredths * HALF !== HUNDREDTHS_SCALE) {
    problems.push(
      `AMOUNT_STEP_HUNDREDTHS ${values.amountStepHundredths} is not half a unit`,
    );
  }

  return problems;
}

export function configSelfCheck(): string[] {
  return checkConfig(SHIPPED);
}
