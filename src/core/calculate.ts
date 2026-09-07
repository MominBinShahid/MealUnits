/**
 * §2 — the calculation, and §6.4's bound.
 *
 *   correction = (bloodSugar - target) / ISF     // exact, may be negative, NOT quantized
 *   meal       = carbs / ICR                     // exact, never negative, NOT quantized
 *   total      = correction + meal               // exact
 *   clamped    = max(0, total)                   // clamp the TOTAL, never the correction
 *   dose       = roundToIncrement(clamped, mode) // see §5
 *
 * §2.1's non-negotiable rules, in the order they bite:
 *   1. The correction may be negative and is SUBTRACTED from the meal dose.
 *      Never floor the correction at zero — silently discarding it is a
 *      documented defect.
 *   2. Only the total is clamped.
 *   3. Never emit negative zero, on every displayed insulin quantity.
 *   4. Never display a value that was not used to compute the dose, and never
 *      recompute a dose from a displayed string.
 */

import { RANGE } from '../config.js';
import { toHundredths } from './decimal.js';
import type { DosingSettings } from './types.js';

export interface Computation {
  /** Exact, unquantized, may be negative. §3.2's band predicate reads this. */
  readonly correction: number;
  /** Exact, unquantized, never negative. */
  readonly meal: number;
  /** correction + meal, exact. Not clamped. */
  readonly total: number;
  /** max(0, total). The only clamp in the app. */
  readonly clamped: number;
}

/**
 * §4.3 step 7 evaluates the band predicate on the UNSUPPRESSED correction, so
 * this function never knows about §7.4. Suppression is applied by the caller,
 * to a copy, after the band has been decided — because if suppression ran
 * first, a reading of 71 would have its correction zeroed and band B would
 * never fire, which is the v1 defect reborn through the stacking door.
 */
export function computeExact(
  bloodSugarMgDl: number | null,
  carbsGrams: number,
  settings: DosingSettings,
  suppressPositiveCorrection: boolean,
): Computation {
  const correction =
    bloodSugarMgDl === null ? 0 : (bloodSugarMgDl - settings.target) / settings.isf;
  const meal = carbsGrams / settings.icr;

  // §2.3 rule 5: finiteness is checked on each COMPONENT before the band
  // predicate, and on the sum before clamping. Placement matters — v2 clamped
  // first and `max(0, -Infinity)` is a finite zero, so clamping erases the
  // evidence.
  if (!Number.isFinite(correction) || !Number.isFinite(meal)) {
    throw new RangeError(
      `a dose component is not finite: correction ${String(correction)}, meal ${String(meal)}`,
    );
  }

  // §7.4's corrected rule: suppression applies ONLY to a positive correction.
  // A negative correction is the safety-direction term and is applied in full,
  // always. v2 suppressed the whole term, which RAISED the dose in exactly the
  // situation where insulin was already on board and the reading was below
  // target.
  //
  // Stryker disable next-line EqualityOperator: `>` and `>=` differ only at a
  // correction of exactly zero, and suppressing zero is arithmetically the same
  // as applying it. The guard is defence in depth against a caller passing
  // `true` with a NEGATIVE correction — §7.4's round-2 critical — and that is
  // what `computeExact` refuses to do, pinned in calculate.test.ts.
  const effectiveCorrection = suppressPositiveCorrection && correction > 0 ? 0 : correction;

  const total = effectiveCorrection + meal;
  if (!Number.isFinite(total)) throw new RangeError(`the dose total is not finite: ${String(total)}`);

  const clamped = Math.max(0, total);

  return { correction, meal, total, clamped };
}

/**
 * §6.4 — a tripwire, not a settings validator.
 *
 * v1 claimed the hard stop detects "settings corruption"; that was withdrawn. A
 * wrong sensitivity inflates the dose and the bound identically, a matching
 * unit-scale error passes both, and a non-finite dose makes the bound
 * non-finite too, so `Infinity > Infinity` is false.
 *
 * What it actually is: given §4.5's hard ranges, `total <= bound` is a
 * MATHEMATICAL IDENTITY, so it is unreachable unless something upstream is
 * broken — a bypassed gate, a mismatched snapshot, an arithmetic regression.
 * "The app is wrong, not the user" is the correct wording.
 */
export function boundUnits(settings: DosingSettings): number {
  const [, maxBloodSugar] = RANGE.bloodSugar.hard;
  const [, maxCarbs] = RANGE.carbs.hard;
  // Always positive given target <= 200 (§4.5). v2's `max(0, ...)` was dead
  // code and its comment about the blank-reading case was wrong; both removed.
  const maxCorrection = (maxBloodSugar - settings.target) / settings.isf;
  const maxMeal = maxCarbs / settings.icr;
  const bound = maxCorrection + maxMeal;
  if (!Number.isFinite(bound)) {
    throw new RangeError(`the dose bound is not finite: ${String(bound)}`);
  }
  return bound;
}

/**
 * §6.4 — checked on the unrounded clamped total, with a one-increment
 * allowance for the rounded dose so rounding cannot make an attainable maximum
 * look impossible. Preceded by an explicit finiteness check.
 *
 * The bound and the total must be computed from the SAME committed snapshot
 * (§11.2), or a settings change between the two produces a false refusal.
 */
export function exceedsBound(
  clampedUnits: number,
  roundedHundredths: number,
  settings: DosingSettings,
  allowanceHundredths: number,
): boolean {
  if (!Number.isFinite(clampedUnits)) return true;
  const bound = boundUnits(settings);
  if (clampedUnits > bound) return true;
  return roundedHundredths > toHundredths(bound) + allowanceHundredths;
}
