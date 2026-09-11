/**
 * §4.3 — the precedence order, which is the whole reason this file exists.
 *
 * Version 1 gave bands (§3), input states (§4) and ranges (§4.5) as three
 * independent tables with no stated resolution order, leaving many cells
 * contradictory. The order below is the specification, step for step, and the
 * step numbers in the comments are §4.3's own.
 *
 * This function is pure. It reads one committed snapshot (§11.2) and nothing
 * else — no storage, no clock, no DOM.
 */

import { ADVISORY_BUDGET, INCREMENT, RANGE } from '../config.js';
import { boundUnits, computeExact, exceedsBound } from './calculate.js';
import { classifyBands, classifyLowBand, isBlockingBand } from './bands.js';
import { evaluateCarbAdvisory } from './baseline.js';
import { toHundredths } from './decimal.js';
import { parseField } from './parse.js';
import { incrementHundredths, roundToHundredths } from './round.js';
import {
  decideStacking,
  needsInvalidTimeLine,
  needsMissingHistoryCaveat,
} from './stacking.js';
import { decideTimingAdvice } from './timing.js';
import type {
  Advisory,
  Band,
  Breakdown,
  FieldError,
  Outcome,
  ParsedField,
  Settings,
  Snapshot,
} from './types.js';

/**
 * §10.5's priority order. The array IS the ranking, so a new advisory cannot be
 * added without deciding where it sits — which is the failure §10.5 records
 * twice: v2 left two lines unranked, and v6 wrote the copy for the invalid-time
 * line and never gave it a slot.
 */
export const ADVISORY_RANK: readonly Advisory[] = [
  // 1 is the band C/D block, which is terminal and therefore not an advisory.
  'band_e_full', // 2 — safety information, never collapsed
  'band_e_compact', // 2 — still band E, only the typography de-escalates
  'band_b_caution', // 3
  'stacking_suppressed', // 4 — and its override
  'carb_advisory_low', // 5
  'carb_advisory_high', // 5
  'stacking_recent_dose', // 6 — the 4-12 hour "may still be acting" line
  'missing_history', // 7
  'stacking_negative_applied', // 8 — the informational line, negative case
  'invalid_time_record', // 9 — ranked in v7; v6 wrote the copy and no slot
];

function rankAdvisories(found: readonly Advisory[]): Advisory[] {
  return ADVISORY_RANK.filter((candidate) => found.includes(candidate));
}

/**
 * §10.5 — at most two advisory elements on screen at once; anything beyond the
 * top two is available behind a "more" affordance rather than stacked.
 *
 * Gates do not count against the budget and always show: §6.2's confirmation
 * and §4.6's blank-reading acknowledgement are not in this list at all.
 */
export function splitAdvisoryBudget(ranked: readonly Advisory[]): {
  shown: readonly Advisory[];
  behindMore: readonly Advisory[];
} {
  return {
    shown: ranked.slice(0, ADVISORY_BUDGET),
    behindMore: ranked.slice(ADVISORY_BUDGET),
  };
}

/** §4.5's hard gates over the settings, which are entered and not defaulted. */
function settingsErrors(settings: Settings): FieldError[] {
  const errors: FieldError[] = [];
  const check = (field: 'target' | 'isf' | 'icr' | 'threshold', value: number): void => {
    // §2.3 rule 1 — finiteness is established independently, BEFORE the range
    // comparison, because `if (x < lo || x > hi)` does not reject NaN.
    if (!Number.isFinite(value)) {
      errors.push({ field, reason: 'not_finite' });
      return;
    }
    const [lo, hi] = RANGE[field].hard;
    if (value < lo) errors.push({ field, reason: 'below_range' });
    else if (value > hi) errors.push({ field, reason: 'above_range' });
  };
  check('target', settings.target);
  check('isf', settings.isf);
  check('icr', settings.icr);
  check('threshold', settings.threshold);
  // §4.4 — a zero setting is rejected, never defaulted, because it is a division
  // by zero. There is no separate branch for it: the hard ranges above already
  // exclude zero (isf >= 5, icr >= 1), and `checkConfig` asserts that those
  // floors stay above zero so widening one cannot silently open the door. A
  // second runtime check here would be a branch no input can reach.
  // Guards against a corrupted or hand-edited store, not against the type
  // system: §11.3 re-validates on every load, and an unknown mode would fall
  // through `roundToHundredths`'s switch with no case to answer it.
  if (!(settings.mode in INCREMENT)) errors.push({ field: 'mode', reason: 'missing' });
  return errors;
}

function rangeErrorFor(field: 'bloodSugar' | 'carbs', value: number): FieldError | null {
  const [lo, hi] = RANGE[field].hard;
  // Stryker disable next-line all: §2.3 rule 1 requires finiteness to be
  // established "before range checks and AGAIN after arithmetic". This is the
  // again. `parseField` has already rejected every non-finite string, so no
  // input reaches it — which is what a defence-in-depth layer looks like, and
  // removing it because it never fires is how the first layer's next bug ships.
  if (!Number.isFinite(value)) return { field, reason: 'not_finite' };
  if (value < lo) return { field, reason: 'below_range' };
  if (value > hi) return { field, reason: 'above_range' };
  return null;
}

/**
 * §4.3 step 3 — recognise low blood sugar INDEPENDENTLY OF SETTINGS. An
 * in-range reading below 70 takes priority for the primary message even when
 * carbs are invalid or settings are missing, and no insulin number appears.
 *
 * Below 20 or exactly zero shows a COMBINED invalid-reading-and-possible-low
 * response rather than silently choosing one.
 */
function lowReadingBands(parsed: ParsedField): Band[] | null {
  const reading =
    parsed.state === 'zero'
      ? 0
      : // Stryker disable next-line ConditionalExpression: forcing this arm
        // yields `undefined` for the other states, and
        // `classifyLowBand(undefined)` answers null exactly as the `null` arm
        // does — indistinguishable from outside. The four states are spelled out
        // anyway, because §4.1's whole point is that they must not collapse into
        // one another. NARROWED 2026-09-11: the `=== 'zero'` arm beside it is
        // killable and was being silenced by a block that never claimed it.
        parsed.state === 'valid'
        ? parsed.value
        : null;
  if (reading === null) return null;
  // Below the hard floor is not merely "invalid" — §4.3 step 3 routes it to the
  // low-reading response, and below HYPO_LEVEL_1 does too. `classifyLowBand`
  // answers both without needing a single setting.
  const low = classifyLowBand(reading);
  return low === null ? null : [low];
}

/**
 * There is deliberately no time-zone argument. §10.5's band E form is decided
 * from `bandEFullCardShownToday`, which §11.2 carries IN the snapshot — derived
 * once, from both stores, at `logRevision`. A resolver that recomputed the
 * calendar day would be a second place the day boundary is decided, and §10.5
 * already lost a round to having two.
 */
export function resolve(snapshot: Snapshot): Outcome {
  const { inputs, settings } = snapshot;

  // ── step 2. Classify raw input. No default substitution, and lexical
  // validity and finiteness are established before any numeric comparison.
  const bs = parseField(inputs.bloodSugar, 'bloodSugar');
  const carbs = parseField(inputs.carbs, 'carbs');

  // ── step 3. Low blood sugar, ahead of everything that needs settings.
  const lowBands = lowReadingBands(bs);

  // ── step 4. Hard validity gates. Errors are COLLECTED — they must not
  // replace step 3's guidance.
  const inputErrors: FieldError[] = [];
  if (bs.state === 'invalid') inputErrors.push({ field: 'bloodSugar', reason: bs.reason });
  else if (bs.state === 'valid') {
    const error = rangeErrorFor('bloodSugar', bs.value);
    if (error) inputErrors.push(error);
  } else if (bs.state === 'zero') {
    // §4.4 — an explicit zero reading is rejected AND shows the low guidance.
    inputErrors.push({ field: 'bloodSugar', reason: 'below_range' });
  }

  if (carbs.state === 'invalid') inputErrors.push({ field: 'carbs', reason: carbs.reason });
  else if (carbs.state === 'valid') {
    const error = rangeErrorFor('carbs', carbs.value);
    if (error) inputErrors.push(error);
  }

  const settingErrors = settingsErrors(settings);

  if (lowBands !== null) {
    // Terminal. §3.3 suppresses every insulin quantity: the main result, the
    // breakdown, the confirmation preview, the settings worked examples and the
    // accessibility announcement. It does NOT suppress the treatment
    // instructions, which necessarily contain 15 grams, 15 minutes and
    // 70 mg/dL — the rule is no insulin dose numbers, not no digits.
    return {
      kind: 'blocked_low',
      bands: lowBands,
      // §4.3 step 4 — the errors are collected and travel WITH the low-reading
      // guidance rather than replacing it. A valid in-range low such as 65
      // produces no blood-sugar error at all, so nothing spurious appears; a
      // reading of 0 or 15 produces one, and that pair IS §4.3 step 3's
      // "combined invalid-reading-and-possible-low response".
      alsoInvalid: inputErrors,
    };
  }

  // §4.4 — missing or invalid settings refuse to calculate and route to
  // settings. Rejecting one field never authorises calculating from the other.
  if (settingErrors.length > 0) return { kind: 'invalid_settings', errors: settingErrors };
  if (inputErrors.length > 0) {
    return { kind: 'invalid_input', errors: inputErrors, bands: [] };
  }

  // ── step 5. Was a calculation even requested?
  const bloodSugarKnown = bs.state === 'valid';
  const bloodSugarValue = bs.state === 'valid' ? bs.value : null;
  const carbsBlank = carbs.state === 'empty';
  const carbsValue = carbs.state === 'valid' ? carbs.value : 0;

  // Blank and blank is no result, NOT "0 units".
  if (!bloodSugarKnown && carbsBlank) return { kind: 'no_result', bands: [] };
  // Carbs blank with the reading at or below target: there is nothing to do,
  // and "0 units" would be an answer to a question nobody asked.
  // Stryker disable next-line ConditionalExpression: the null guard is not
  // separately observable here — a blank reading with blank carbohydrates has
  // already returned above, so `bloodSugarValue` is non-null by the time this
  // runs. It is written out rather than inferred, because inferring it means
  // this line breaks silently if the guard above ever moves.
  if (carbsBlank && bloodSugarValue !== null && bloodSugarValue <= settings.target) {
    return { kind: 'no_result', bands: [] };
  }

  // ── step 6. Acknowledgements. §4.6's blank-reading tap is per-calculation and
  // never persisted: the low-blood-sugar check cannot run without a reading, so
  // someone at 60 mg/dL who skips the fingerstick would otherwise get a full
  // meal dose with no warning — and users learn the blank field as the way to
  // skip warnings.
  if (!bloodSugarKnown && !snapshot.blankReadingAcknowledged) {
    return { kind: 'ack_required', ack: 'blank_blood_sugar' };
  }

  // ── step 7. The EXACT correction, and the band A/B predicate on the
  // unrounded, UNSUPPRESSED value. If suppression ran first, a reading of 71
  // would have its correction zeroed and band B would never fire.
  const unsuppressed = computeExact(bloodSugarValue, carbsValue, settings, false);
  const bands = classifyBands(bloodSugarValue, unsuppressed.correction);

  // A blocking band cannot appear here — step 3 already returned — but the
  // invariant is asserted rather than assumed, because §3.4 makes C and D
  // terminal and a future edit to step 3 must not quietly route around it.
  // Stryker disable all: unreachable. Step 3 returns for every reading below 70,
  // so `classifyBands` cannot produce C or D here. The assertion stays because
  // §3.4 makes those bands terminal and a future edit to step 3 must not quietly
  // route around them — but no input reaches it, so no test can show it failing.
  if (isBlockingBand(bands)) {
    return { kind: 'blocked_low', bands, alsoInvalid: [] };
  }
  // Stryker restore all

  // ── step 7a. The stacking decision, reading the committed log revision.
  const stacking = decideStacking(
    snapshot.lastDose,
    snapshot.decisionTime,
    unsuppressed.correction,
    settings.isf,
    snapshot.stackingOverride,
  );

  const applied = computeExact(
    bloodSugarValue,
    carbsValue,
    settings,
    stacking.suppressPositiveCorrection,
  );

  // ── step 8. Finiteness of the sum, THEN clamp. computeExact does both in
  // that order, because `max(0, -Infinity)` is a finite zero and clamping first
  // erases the evidence.
  // ── step 9. The mathematical bound, on the unrounded clamped total. A failure
  // here cannot be overridden by user confirmation.
  // Stryker disable all: §6.4 — given §4.5's hard ranges, `total <= bound` is a
  // MATHEMATICAL IDENTITY, so this is unreachable unless something upstream is
  // broken. `exceedsBound` and `boundUnits` carry the tests in calculate.test.ts,
  // including both failing directions; through the resolver nothing fires it.
  if (!Number.isFinite(applied.clamped) || applied.clamped > boundUnits(settings)) {
    return { kind: 'bound_failure', boundUnits: boundUnits(settings) };
  }
  // Stryker restore all

  // ── step 10. Round the clamped total. No intermediate quantization.
  const doseHundredths = roundToHundredths(applied.clamped, settings.mode);

  // The secondary half of §6.4: a one-increment allowance so rounding cannot
  // make an attainable maximum look impossible.
  // Stryker disable all: the same identity, one increment wider. See above.
  if (exceedsBound(applied.clamped, doseHundredths, settings, incrementHundredths(settings.mode))) {
    return { kind: 'bound_failure', boundUnits: boundUnits(settings) };
  }
  // Stryker restore all

  // ── step 11a. The §6.5 advisory, against the VALIDATED carbohydrate value
  // and the eligible baseline carried in the snapshot. Advisory only: it never
  // alters the dose, never gates, and cannot suppress §6.2's confirmation.
  const carbAdvisory = evaluateCarbAdvisory(
    carbsValue,
    snapshot.carbBaseline,
    snapshot.eligibleEntryCount,
  );

  // ── step 11b. Band E's form, from the committed snapshot. It is here rather
  // than in the shell because §11.2 twice forbids safety-display logic outside
  // the tested core. The INSTRUCTION is identical either way, so this step can
  // never change what the user is told to do.
  // Stryker disable next-line ArrayDeclaration: seeding this array with a bogus
  // entry changes nothing, because `rankAdvisories` is a whitelist — it filters
  // against ADVISORY_RANK rather than sorting whatever it is given. That is the
  // property §10.5 wants (an unranked advisory cannot reach the screen), and it
  // makes the mutant equivalent by design.
  const found: Advisory[] = [];
  if (bands.includes('E')) {
    found.push(snapshot.bandEFullCardShownToday ? 'band_e_compact' : 'band_e_full');
  }
  if (bands.includes('B')) found.push('band_b_caution');
  if (stacking.suppressPositiveCorrection) found.push('stacking_suppressed');
  if (carbAdvisory.advisory === 'low') found.push('carb_advisory_low');
  if (carbAdvisory.advisory === 'high') found.push('carb_advisory_high');
  if (stacking.elapsedCase === 'within_advise_window') found.push('stacking_recent_dose');
  if (needsMissingHistoryCaveat(stacking.elapsedCase, snapshot.historyProvenance)) {
    found.push('missing_history');
  }
  // §7.4's informational line for the case that is NOT suppressed: inside the
  // window with a negative or zero correction, which is applied in full because
  // it is the safety-direction term.
  if (
    (stacking.elapsedCase === 'within_suppress_window' ||
      stacking.elapsedCase === 'skewed_to_zero') &&
    unsuppressed.correction <= 0 &&
    bloodSugarKnown
  ) {
    found.push('stacking_negative_applied');
  }
  if (needsInvalidTimeLine(stacking.elapsedCase, snapshot.excludedTimeRecords)) {
    found.push('invalid_time_record');
  }
  const advisories = rankAdvisories(found);

  // ── step 11. The confirmation threshold. §6.2's operand is explicit:
  // confirmation is required when EITHER the clamped exact total OR the final
  // rounded dose reaches the threshold.
  const thresholdHundredths = toHundredths(settings.threshold);
  const reachesThreshold =
    toHundredths(applied.clamped) >= thresholdHundredths ||
    doseHundredths >= thresholdHundredths;

  if (reachesThreshold && !snapshot.largeDoseConfirmed) {
    // §6.3 — the dose is WITHHELD. The error is in the input, so the input is
    // what must be read; showing the answer lets him check the answer and skip
    // the inputs, which is the failure the tier exists to prevent. Band E still
    // travels, because withholding a dose must not withhold "check ketones".
    return { kind: 'confirm_required', bands, advisories };
  }

  // ── step 12. Reveal.
  const correctionHundredths = toHundredths(unsuppressed.correction);
  const mealHundredths = toHundredths(applied.meal);
  const exactTotalHundredths = toHundredths(applied.clamped);
  const shownComponentSum = stacking.suppressPositiveCorrection
    ? mealHundredths
    : correctionHundredths + mealHundredths;

  const breakdown: Breakdown = {
    correctionHundredths,
    mealHundredths,
    exactTotalHundredths,
    // §2.2 — displayed components may not visibly sum to the displayed total.
    // When that happens the breakdown shows the exact total on its own line
    // rather than implying the components add up.
    componentsSumToTotal: shownComponentSum === exactTotalHundredths,
    // §10.3 — a suppressed correction is shown, STRUCK THROUGH, with its
    // reason. Never silently omitted, and never left as a line that visibly
    // fails to reach the total.
    correctionSuppressed: stacking.suppressPositiveCorrection,
  };

  // §7.4.1 — the override candidate is the dose with the correction applied.
  const overrideCandidateHundredths = stacking.suppressPositiveCorrection
    ? roundToHundredths(unsuppressed.clamped, settings.mode)
    : null;
  // v3's button printed the resulting total unconditionally. At blood sugar 600
  // with 200 g the override candidate is past the threshold, so the button
  // disclosed exactly the number §6.3 requires withheld — defeating its own
  // claim that it "cannot reveal a previously hidden correction".
  //
  // §7.4.1 says "when EITHER the meal-only figure or the override candidate
  // reaches the threshold". Only the candidate is tested, and that is not a
  // narrowing: suppression removes a POSITIVE correction, so the candidate is
  // always at least the meal-only figure, and rounding is monotonic in every
  // mode. `dose >= threshold` therefore implies `candidate >= threshold`, and
  // testing both would be a condition whose first half no input can decide.
  const overrideFiguresWithheld =
    // Stryker disable next-line ConditionalExpression,EqualityOperator: this
    // null guard is not separately observable, because `null >= threshold`
    // coerces to `0 >= threshold` and every threshold is at least 10. Same
    // family as the guards in history.ts, and kept for the same reason: §4.1
    // does not let a coercion stand in for a check. NARROWED 2026-09-11 — the
    // `>=` beside it decides §7.4.1's withholding and is very much testable.
    overrideCandidateHundredths !== null &&
    overrideCandidateHundredths >= thresholdHundredths;

  const body = {
    hundredths: doseHundredths,
    bands,
    advisories,
    breakdown,
    timingAdvice: decideTimingAdvice(bands, bloodSugarKnown),
    overrideAvailable: stacking.overrideAvailable,
    overrideCandidateHundredths,
    stackingCeilingMgDl: stacking.suppressPositiveCorrection ? stacking.ceilingMgDl : null,
    overrideFiguresWithheld,
  };

  return stacking.suppressPositiveCorrection
    ? { kind: 'meal_only_suppressed', ...body }
    : { kind: 'dose', ...body };
}
