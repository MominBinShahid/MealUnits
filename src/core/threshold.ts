/**
 * §6.2's confirmation threshold, worked out from the ratios rather than shipped
 * as one person's number.
 *
 * WHY THIS EXISTS (`BACKLOG.md`'s "AUDIENCE CHANGE — the app is for anyone, and
 * three things assume it is not"). The default was 20 units, calibrated against
 * a target of 150, an ISF of 30 and an ICR of 10. Against a different
 * prescription it is silently inert:
 *
 *   ISF 30, ICR 10 — 21 g typed as 210 g doses 24.3 units. Caught at 20.
 *   ⚠ Corrected 2026-09-26: this example was "50 g typed as 500 g", which
 *   CANNOT REACH THIS GATE — `RANGE.carbs.hard` is [0, 300] and
 *   `rangeErrorFor` rejects 500 before any dose is computed. The gate's
 *   real job is the tenfold typo of a SMALL row, which is most of the
 *   table: 228 of 339 rows are 30 g or under, so their ten-times
 *   mistyping lands inside the enterable range and reaches here.
 *   ISF 50, ICR 30 — the same typo doses 16.7 units. NOT caught at 20, and
 *                    that person's ordinary mealtime dose is 1.7 units.
 *
 * A fat-finger catch that does nothing for a whole class of user is worse than
 * no catch, because nothing on screen says it is asleep.
 *
 * THE SHAPE, and it is deliberately readable aloud: one and a half times the
 * dose that the largest single portion in this app's own food table would need
 * at a high reading. Above that, the typing gets checked.
 *
 * Both ratios are in it on purpose. Keying off ICR alone would fire constantly
 * for someone whose corrections are large — a person at ISF 10 needs 15 units
 * to come down from 250 to 100 before any food is counted.
 */

import {
  RANGE,
  THRESHOLD_HIGH_READING,
  THRESHOLD_MEAL_GRAMS,
  THRESHOLD_MULTIPLE,
} from '../config.js';

/**
 * Null when the three ratios cannot produce a number — a non-finite value, or a
 * divisor at or below zero. The caller leaves the field blank in that case
 * rather than inventing a figure, which is the whole point of the change: this
 * app no longer puts a number in a dosing field that nobody chose.
 *
 * The result is CLAMPED into `RANGE.threshold.hard`, not merely checked against
 * it. §4.5 refuses a stored threshold outside that range, so an unclamped
 * derivation would hand the user a value the core will not accept — the app
 * arguing with itself on first run.
 *
 * The clamp is also what makes the low-ratio user safe. At ISF 50 / ICR 30 with
 * a target of 120 the raw figure is 8.9, and the floor of 10 lifts it; their
 * tenfold typo reaches 16.7 and is caught, while an ordinary 4.6-unit meal is
 * not. The floor was not chosen for them, but it holds.
 */
export function deriveThreshold(target: number, isf: number, icr: number): number | null {
  if (!Number.isFinite(target) || !Number.isFinite(isf) || !Number.isFinite(icr)) return null;
  if (isf <= 0 || icr <= 0) return null;

  const mealDose = THRESHOLD_MEAL_GRAMS / icr;
  // A correction from a high reading, floored at zero: a target ABOVE the
  // reference high would otherwise subtract from the meal dose and hand back a
  // threshold lower than the meal itself needs. Nobody's target is above 250
  // today — `RANGE.target.hard` stops well below it — so this is unreachable by
  // any accepted setting. It stays because the alternative is a subtraction
  // whose safety depends on a bound in a different constant.
  const correctionDose = Math.max(0, (THRESHOLD_HIGH_READING - target) / isf);

  const raw = Math.round(THRESHOLD_MULTIPLE * (mealDose + correctionDose));
  const [lo, hi] = RANGE.threshold.hard;
  return Math.min(hi, Math.max(lo, raw));
}
