/**
 * §6.5 — the plausibility advisory, redesigned in v4 after both reviewers
 * proved v3's version was structurally dead code.
 *
 * v3 compared the DOSE against `2 x max(last 30 doses)`. For a user whose
 * routine is 20-26 units that trigger sits at 52, while §6.4's bound caps every
 * reachable dose at 45: it could never fire. It was also self-poisoning — had
 * it fired, the 24-unit error would be logged, the maximum would become 24, the
 * trigger 48, and the advisory would be dead for the next thirty doses. The row
 * that killed it would be the exact error it existed to catch.
 *
 * The redesign compares the CARBOHYDRATE INPUT, and mainly DOWNWARD, because
 * that direction has no other protection at all: type 20 for a 200 g plate and
 * the result is 2 units instead of 20 — eighteen units missing, roughly
 * 540 mg/dL of untreated trend, toward ketoacidosis.
 */

import {
  ADVISORY_HIGH_MULTIPLE,
  ADVISORY_LOW_DIVISOR,
  ADVISORY_MIN_ELIGIBLE,
  ADVISORY_WINDOW,
  HALF,
  RANGE,
} from '../config.js';
import { isInjection } from './types.js';
import type { LogRow } from './types.js';

export interface CarbBaseline {
  /** null when no baseline exists — the advisory is then disabled and declared. */
  readonly carbBaseline: number | null;
  readonly eligibleEntryCount: number;
}

/**
 * §6.5's eligibility contract, explicit because v4's was not. v4 gated on
 * ">= 10 entries carrying carbohydrates" but computed the median over "the last
 * 30 entries" — two different populations — while §7.4 demonstrably logs
 * correction-only doses with `carbs: 0`.
 *
 * After a correction-heavy stretch the median would drift toward zero and the
 * feature INVERTS: the LOW trigger becomes unreachable — the sole under-dose
 * defence, the entire point of the redesign — while `baseline * 3 < 300` starts
 * holding, so HIGH fires on every genuine meal. Exactly backwards, from one
 * ambiguous sentence.
 *
 * The minimum and the window both apply AFTER exclusions.
 */
export function eligibleCarbEntries(rows: readonly LogRow[]): number[] {
  // §7.3 — a tombstone is the record of an absence. Feeding it any mechanism
  // that changes a dose is the one thing deletion must not do.
  //
  // Stryker disable next-line MethodExpression: removing this filter changes
  // nothing at RUNTIME, because a tombstone carries no `carbs` and
  // `undefined > 0` is false. It is not removable all the same — the type
  // system needs the narrowing, and leaning on that coercion is exactly what
  // §4.1 refuses to do anywhere else in this codebase.
  const injections = rows.filter(isInjection);
  const eligible = injections
    .filter((row) => row.carbs > 0 && !row.advisoryFlagged && !row.overrodeStacking)
    .sort((a, b) => a.timestamp - b.timestamp);

  // The window is the last N of what survived the exclusions, not the last N of
  // the log.
  return eligible.slice(-ADVISORY_WINDOW).map((row) => row.carbs);
}

/**
 * Median, not max — max is the most poisoning-sensitive statistic available.
 *
 * The empty list is caught by the single `undefined` guard rather than by a
 * separate length check, because a length check in front of it would be a
 * branch no input could distinguish from the guard behind it.
 */
export function median(values: readonly number[]): number | null {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / HALF);
  const upper = sorted[middle];
  if (upper === undefined) return null;
  // For an odd count the two halves meet at the same element. `??` rather than
  // `||`, because a legitimate median of 0 is falsy and `||` would replace it
  // (§2.3 rule 3, in a place it is easy to miss).
  const lower = sorted.length % HALF === 1 ? upper : (sorted[middle - 1] ?? upper);
  return (lower + upper) / HALF;
}

export function deriveCarbBaseline(rows: readonly LogRow[]): CarbBaseline {
  const carbs = eligibleCarbEntries(rows);
  if (carbs.length < ADVISORY_MIN_ELIGIBLE) {
    return { carbBaseline: null, eligibleEntryCount: carbs.length };
  }
  return { carbBaseline: median(carbs), eligibleEntryCount: carbs.length };
}

export type CarbAdvisory = 'low' | 'high' | null;

export interface AdvisoryStatus {
  readonly advisory: CarbAdvisory;
  /**
   * §6.5's unreachability guard, which is the lesson from v3. A trigger above
   * the maximum attainable value is dead code that looks like a safety feature.
   * Every trigger is checked against its own attainable range, and one that
   * cannot fire is DISABLED AND DECLARED — never left in place implying
   * coverage it does not provide.
   */
  readonly highTriggerAvailable: boolean;
  readonly enabled: boolean;
}

/**
 * §4.3 step 11a. Evaluated against the VALIDATED carbohydrate value, never the
 * raw string, and against the eligible baseline carried in the snapshot.
 *
 * The zero-carb exclusion is not optional: §4.4 makes an explicit 0 a valid
 * correction-only calculation, and `0 < baseline/4` is ALWAYS true — so without
 * this clause the low-carb advisory fires on every deliberate correction-only
 * dose, and the sole under-dose defence becomes furniture on a routine path.
 */
export function evaluateCarbAdvisory(
  carbsGrams: number,
  carbBaseline: number | null,
  eligibleEntryCount: number,
): AdvisoryStatus {
  // One condition, so there is nothing here that a second check could restate.
  // The narrowing of `carbBaseline` falls out of it rather than needing its own
  // redundant guard.
  if (carbBaseline === null || eligibleEntryCount < ADVISORY_MIN_ELIGIBLE) {
    return { advisory: null, highTriggerAvailable: false, enabled: false };
  }

  const [, maxCarbs] = RANGE.carbs.hard;
  const highTrigger = carbBaseline * ADVISORY_HIGH_MULTIPLE;
  const highTriggerAvailable = highTrigger < maxCarbs;

  if (carbsGrams <= 0) {
    return { advisory: null, highTriggerAvailable, enabled: true };
  }
  if (carbsGrams < carbBaseline / ADVISORY_LOW_DIVISOR) {
    return { advisory: 'low', highTriggerAvailable, enabled: true };
  }
  if (highTriggerAvailable && carbsGrams > highTrigger) {
    return { advisory: 'high', highTriggerAvailable, enabled: true };
  }
  return { advisory: null, highTriggerAvailable, enabled: true };
}
