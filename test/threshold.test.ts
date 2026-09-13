import { describe, expect, it } from 'vitest';
import { deriveThreshold } from '../src/core/threshold.js';
import { RANGE } from '../src/config.js';

/**
 * §6.2's threshold, derived rather than shipped as one person's number.
 *
 * The literals here are deliberate. Deriving the expected values from
 * `THRESHOLD_MULTIPLE` and friends would make every case move WITH a mutation of
 * those constants instead of killing it, which is the whole point of the gate.
 * Same convention as `stacking.test.ts` and the band E window.
 */
describe('§6.2 the confirmation threshold is worked out from the ratios', () => {
  it('reproduces the hand-calibrated 20 for the prescription it was tuned against', () => {
    // THE case. 20 was chosen by hand for target 150 / ISF 30 / ICR 10 long
    // before any formula existed. 100/10 = 10, (250-150)/30 = 3.33, and
    // 1.5 x 13.33 = 20 exactly. A formula built from published reasoning
    // landing on the number a person tuned by hand is the best evidence
    // available that neither is arbitrary — so if this case ever changes, the
    // formula has drifted away from the one prescription it can be checked
    // against, and that is a finding rather than a test to update.
    expect(deriveThreshold(150, 30, 10)).toBe(20);
  });

  it('catches the tenfold typo that a flat 20 slept through', () => {
    // The row that motivated the whole change. At ISF 50 / ICR 30, 50 g typed
    // as 500 g doses 16.7 units — under a flat 20, and that person's ordinary
    // mealtime dose is 1.7 units.
    const threshold = deriveThreshold(120, 50, 30);
    expect(threshold).not.toBeNull();

    const tenfoldTypo = 500 / 30 + (250 - 120) / 50; // 16.67 + 2.6
    const ordinaryMeal = 50 / 30 + (250 - 120) / 50; // 1.67 + 2.6

    expect(tenfoldTypo).toBeGreaterThanOrEqual(threshold ?? 0);
    expect(ordinaryMeal).toBeLessThan(threshold ?? 0);
  });

  it('does not nag the user whose corrections are large', () => {
    // ISF 10 means 15 units to come down from 250 to 100 before any food is
    // counted. Keying the threshold off ICR alone would fire on every meal.
    expect(deriveThreshold(100, 10, 10)).toBe(38);
  });

  it('clamps into the hard range rather than handing back a value §4.5 refuses', () => {
    const [lo, hi] = RANGE.threshold.hard;
    // Very insulin-sensitive: the raw figure falls under the floor.
    expect(deriveThreshold(100, 200, 100)).toBe(lo);
    // Very insulin-resistant: the raw figure runs past the ceiling.
    expect(deriveThreshold(70, 1, 1)).toBe(hi);
  });

  it('answers null rather than guessing when a ratio is not usable', () => {
    expect(deriveThreshold(Number.NaN, 30, 10)).toBeNull();
    expect(deriveThreshold(150, Number.NaN, 10)).toBeNull();
    expect(deriveThreshold(150, 30, Number.NaN)).toBeNull();
    expect(deriveThreshold(Number.POSITIVE_INFINITY, 30, 10)).toBeNull();
    // Zero and negative divisors, which are a division by zero and a negative
    // dose respectively. §4.4 refuses them at the gate too; this is the same
    // refusal one layer earlier, so a half-typed field never produces a number.
    expect(deriveThreshold(150, 0, 10)).toBeNull();
    expect(deriveThreshold(150, 30, 0)).toBeNull();
    expect(deriveThreshold(150, -30, 10)).toBeNull();
    expect(deriveThreshold(150, 30, -10)).toBeNull();
  });

  it('never returns less than the dose a large meal alone would need', () => {
    // The property the Math.max(0, ...) floor protects, stated as a property
    // rather than as a case: whatever the target, the threshold is at least the
    // meal dose. `checkConfig` asserts the reference high sits above every
    // acceptable target, so this holds by construction — and this is what would
    // break first if that assertion were ever relaxed.
    const [lo, hi] = RANGE.target.hard;
    for (const target of [lo, 100, 150, hi]) {
      const threshold = deriveThreshold(target, 30, 10);
      expect(threshold).not.toBeNull();
      expect(threshold ?? 0).toBeGreaterThanOrEqual(Math.min(100 / 10, RANGE.threshold.hard[1]));
    }
  });
});
