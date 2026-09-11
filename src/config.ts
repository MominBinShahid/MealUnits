/**
 * §11.8 — every number in this codebase lives here, and the lint rule in
 * eslint.config.js is what keeps it that way.
 *
 * The file separates the kinds of number, because they carry different
 * permission to change. A clinical constant needs clinical review; an app-set
 * default needs an argument; a unit conversion needs nothing at all.
 */

// ─── CLINICAL CONSTANTS ────────────────────────────────────
// DO NOT CHANGE WITHOUT CLINICAL REVIEW. ADA/EASD definitions.
export const HYPO_LEVEL_1 = 70; // §3 band C — treat, do not inject
export const HYPO_LEVEL_2 = 54; // §3 band D — escalated wording
export const KETONE_ADVISORY = 250; // §3 band E — check ketones
export const FAST_CARB_GRAMS = 15; // the 15-15 rule
export const RECHECK_MINUTES = 15;

// ─── APP-SET DEFAULTS ──────────────────────────────────────
export const DEFAULT_THRESHOLD = 20; // §6.2, recalibrated v7
export const DEFAULT_MODE = 'nearest'; // §5

// ─── THE PRESCRIPTION, PREFILLED (§1.2, CHANGED ON MOMIN'S RULING) ──────────
// v8 shipped these as "seed values" and both reviewers rejected it. §1.2's
// hazard is precise and still stands: "the day the clinician moves the
// insulin-to-carb ratio to 15 — inside the soft range, no confirmation — a
// SILENT revert to 10 makes a 150 g meal dose 15 units instead of 10... Nothing
// on screen would look different."
//
// The word doing the work in that sentence is SILENT. These values are
// PREFILLED AND SHOWN, never applied behind the user's back:
//
//   * They populate the first-run DRAFT only. Nothing is stored until the
//     explicit save, so §4.4's refuse-on-empty-settings branch is still live —
//     `buildSnapshot` reads the STORE, not the draft, and returns null until the
//     save has happened.
//   * The target is 150, which sits outside its own 90-140 soft band, so the
//     acknowledgement of §10.5 fires on first run BY DESIGN. That is the
//     mechanism that makes a stale value noticeable rather than invisible.
//
// What was traded away, stated plainly: someone who taps through without
// reading gets the old prescription. That is a weaker guarantee than typing it
// out, and it is the reason each value is on its own screen rather than in a
// list. See docs/CLINICAL.md.
export const PRESCRIBED_TARGET = 150; // §1.2 — mg/dL
export const PRESCRIBED_ISF = 30; // §1.2 — 1 unit lowers blood sugar by 30
export const PRESCRIBED_ICR = 10; // §1.2 — 1 unit covers 10 g of carbohydrate

// ─── BAND B (§3.2) ─────────────────────────────────────────
export const BAND_B_CORRECTION_UNITS = -1.5; // at or below: caution copy

// ─── ROUNDING (§5) ─────────────────────────────────────────
export const INCREMENT = { nearest: 1, half: 0.5, ceil: 1, floor: 1, off: 0.01 } as const;
export const HUNDREDTHS_SCALE = 100; // §2.2 integer representation

// ─── CLOCK AND TIMING (§7.6, §8.1) ─────────────────────────
export const CLOCK_SKEW_TOLERANCE_HOURS = 1; // §7.6 future-timestamp bound
export const EAT_DELAY_MINUTES = [20, 30] as const; // §8.1 pre-meal window

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
} as const;

// ─── STACKING (§7.4) ───────────────────────────────────────
export const STACK_SUPPRESS_HOURS = 4;
export const STACK_ADVISE_HOURS = 12;
// Declared after STACK_ADVISE_HOURS deliberately — v9 printed this above it,
// which is a TDZ ReferenceError if transcribed literally [R1].
export const DELETE_CONFIRM_WINDOW_HOURS = STACK_ADVISE_HOURS; // §7.3

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

export interface ConfigValues {
  readonly range: RangeTable;
  readonly defaultThreshold: number;
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
  defaultThreshold: DEFAULT_THRESHOLD,
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

  // Every default THAT EXISTS lies inside its HARD range. Note "hard", not
  // "soft": the target of 150 is outside its soft band on purpose and confirms
  // once, correctly (§4.5).
  const [thresholdLo, thresholdHi] = values.range.threshold.hard;
  if (values.defaultThreshold < thresholdLo || values.defaultThreshold > thresholdHi) {
    problems.push(
      `DEFAULT_THRESHOLD ${values.defaultThreshold} is outside its hard range [${thresholdLo}, ${thresholdHi}]`,
    );
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
  if (values.deleteConfirmWindowHours !== values.stackAdviseHours) {
    problems.push(
      `DELETE_CONFIRM_WINDOW_HOURS (${values.deleteConfirmWindowHours}) must equal STACK_ADVISE_HOURS (${values.stackAdviseHours})`,
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

  const [eatLo, eatHi] = values.eatDelayMinutes;
  if (!(eatLo > 0 && eatLo < eatHi)) {
    problems.push(`EAT_DELAY_MINUTES is not an ordered positive pair (${eatLo}, ${eatHi})`);
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
