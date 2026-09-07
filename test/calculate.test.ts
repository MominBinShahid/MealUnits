import { describe, expect, it } from 'vitest';
import { boundUnits, computeExact, exceedsBound } from '../src/core/calculate.js';
import type { DosingSettings } from '../src/core/types.js';

const PRESCRIPTION: DosingSettings = { target: 150, isf: 30, icr: 10, mode: 'nearest' };
const NO_SUPPRESSION = false;
const SUPPRESSION = true;

describe('§2 the five lines', () => {
  it('computes the canonical case exactly', () => {
    const result = computeExact(330, 200, PRESCRIPTION, NO_SUPPRESSION);
    expect(result.correction).toBe(6);
    expect(result.meal).toBe(20);
    expect(result.total).toBe(26);
    expect(result.clamped).toBe(26);
  });

  it('§2.1 rule 1 — the correction may be NEGATIVE and is subtracted', () => {
    const result = computeExact(100, 60, PRESCRIPTION, NO_SUPPRESSION);
    expect(result.correction).toBeCloseTo(-1.6666666666666667, 15);
    expect(result.meal).toBe(6);
    expect(result.total).toBeCloseTo(4.333333333333333, 15);
  });

  it('§2.1 rule 2 — only the TOTAL is clamped, and the correction survives it', () => {
    const result = computeExact(60, 0, { ...PRESCRIPTION }, NO_SUPPRESSION);
    // The correction is reported at its true value even though the dose is 0.
    expect(result.correction).toBe(-3);
    expect(result.total).toBe(-3);
    expect(result.clamped).toBe(0);
  });

  it('and flooring the correction instead of the total would raise the dose', () => {
    // §2.1's named defect, as arithmetic. Blood sugar 100 with 60 g:
    //   clamp the total  -> -1.6667 + 6 = 4.3333
    //   clamp the term   ->       0 + 6 = 6.0
    const correct = computeExact(100, 60, PRESCRIPTION, NO_SUPPRESSION);
    const defective = Math.max(0, (100 - 150) / 30) + 60 / 10;
    expect(correct.clamped).toBeCloseTo(4.333333333333333, 15);
    expect(defective).toBe(6);
    expect(defective).toBeGreaterThan(correct.clamped);
  });

  it('never produces a negative meal term', () => {
    expect(computeExact(150, 0, PRESCRIPTION, NO_SUPPRESSION).meal).toBe(0);
  });

  it('§4.6 — a blank reading contributes NO correction, not a zero reading', () => {
    const blank = computeExact(null, 60, PRESCRIPTION, NO_SUPPRESSION);
    const zeroReading = computeExact(0, 60, PRESCRIPTION, NO_SUPPRESSION);
    expect(blank.correction).toBe(0);
    expect(blank.clamped).toBe(6);
    // A reading of zero would have produced a correction of -5, which is the
    // whole reason Number("") giving 0 is a hazard.
    expect(zeroReading.correction).toBe(-5);
    expect(zeroReading.clamped).toBe(1);
  });
});

describe('§7.4 suppression touches only a positive correction', () => {
  it('holds back a positive one', () => {
    const result = computeExact(330, 40, PRESCRIPTION, SUPPRESSION);
    expect(result.correction).toBe(6); // still reported at its true value
    expect(result.clamped).toBe(4); // but not in the total
  });

  it('applies a negative one in full — the round-2 critical', () => {
    const suppressed = computeExact(100, 60, PRESCRIPTION, SUPPRESSION);
    const applied = computeExact(100, 60, PRESCRIPTION, NO_SUPPRESSION);
    expect(suppressed.clamped).toBe(applied.clamped);
  });

  it('applies a correction of exactly zero in full, which changes nothing', () => {
    const result = computeExact(150, 60, PRESCRIPTION, SUPPRESSION);
    expect(result.correction).toBe(0);
    expect(result.clamped).toBe(6);
  });

  it('never touches the meal term — food needs covering regardless', () => {
    for (const carbs of [0, 15, 60, 300]) {
      expect(computeExact(330, carbs, PRESCRIPTION, SUPPRESSION).meal, String(carbs)).toBe(
        carbs / 10,
      );
    }
  });
});

describe('§2.3 finiteness, and where it is checked', () => {
  it('refuses a non-finite COMPONENT before anything else reads it', () => {
    // The message names which guard fired. Without that, a guard that let the
    // component through and tripped the later total check would look identical.
    expect(() => computeExact(Number.NaN, 60, PRESCRIPTION, NO_SUPPRESSION)).toThrow(
      /a dose component is not finite: correction NaN, meal 6/,
    );
    expect(() => computeExact(330, 200, { ...PRESCRIPTION, isf: 0 }, NO_SUPPRESSION)).toThrow(
      /a dose component is not finite: correction Infinity/,
    );
    expect(() => computeExact(330, 200, { ...PRESCRIPTION, icr: 0 }, NO_SUPPRESSION)).toThrow(
      /a dose component is not finite: .*meal Infinity/,
    );
  });

  it('and the TOTAL guard is a separate one, with its own message', () => {
    // Reachable only when both components are FINITE and their sum is not.
    // correction = (MAX_VALUE - 0) / 1 is finite; meal = MAX_VALUE / 1 is
    // finite; the sum overflows to Infinity. Unreachable from validated inputs,
    // which is exactly why the guard has to be its own statement rather than
    // something the component check is assumed to have covered.
    const wide = { ...PRESCRIPTION, target: 0, isf: 1, icr: 1 };
    expect(Number.isFinite(Number.MAX_VALUE / 1)).toBe(true);
    expect(Number.MAX_VALUE + Number.MAX_VALUE).toBe(Number.POSITIVE_INFINITY);
    expect(() =>
      computeExact(Number.MAX_VALUE, Number.MAX_VALUE, wide, NO_SUPPRESSION),
    ).toThrow(/the dose total is not finite: Infinity/);
  });

  it('names the bound in its own message when the bound is not finite', () => {
    expect(() => boundUnits({ ...PRESCRIPTION, isf: 0 })).toThrow(
      /the dose bound is not finite: Infinity/,
    );
  });

  it('§2.3 rule 5 — clamping would ERASE the evidence, so it comes second', () => {
    // max(0, -Infinity) is a finite zero. v2 clamped at step 8 and checked
    // finiteness at step 9, so a broken correction became a plausible zero.
    expect(Math.max(0, Number.NEGATIVE_INFINITY)).toBe(0);
    expect(Number.isFinite(Math.max(0, Number.NEGATIVE_INFINITY))).toBe(true);
    // Which is why computeExact throws instead of returning a clamped zero.
    expect(() =>
      computeExact(-Number.POSITIVE_INFINITY, 60, PRESCRIPTION, NO_SUPPRESSION),
    ).toThrow(/a dose component is not finite: correction -Infinity/);
  });
});

describe('§6.4 the bound is a mathematical identity, not a validator', () => {
  it('is exactly 45 units at the prescription', () => {
    // (600 - 150) / 30 + 300 / 10 = 15 + 30
    expect(boundUnits(PRESCRIPTION)).toBe(45);
  });

  it('does not fire on the maximum attainable dose', () => {
    const worst = computeExact(600, 300, PRESCRIPTION, NO_SUPPRESSION);
    expect(worst.clamped).toBe(45);
    expect(exceedsBound(worst.clamped, 4500, PRESCRIPTION, 100)).toBe(false);
  });

  it('rises in step with a smaller sensitivity, which is why it never fires', () => {
    // §4.5's hard limits are what make this an identity. Version 1 rejected
    // only zero and negatives, permitting a sensitivity of 0.001 — and the
    // derived ceiling rose with it, so the guard never fired.
    expect(boundUnits({ ...PRESCRIPTION, isf: 5 })).toBe(120);
    expect(boundUnits({ ...PRESCRIPTION, icr: 1 })).toBe(315);
    expect(boundUnits({ ...PRESCRIPTION, isf: 5, icr: 1 })).toBe(390);
  });

  it('fires when something upstream is broken', () => {
    expect(exceedsBound(46, 4600, PRESCRIPTION, 100)).toBe(true);
    expect(exceedsBound(Number.NaN, 0, PRESCRIPTION, 100)).toBe(true);
  });

  it('allows one increment so rounding cannot make a maximum look impossible', () => {
    // ceil on an attainable 44.5 gives 45, which must pass.
    expect(exceedsBound(44.5, 4500, PRESCRIPTION, 100)).toBe(false);
    // Two increments past it is a real failure.
    expect(exceedsBound(45, 4700, PRESCRIPTION, 100)).toBe(true);
  });

  it('refuses a non-finite bound rather than comparing against it', () => {
    // §6.4: a non-finite dose makes the bound non-finite too, so
    // `Infinity > Infinity` is false — the comparison itself is the hazard.
    expect(Number.POSITIVE_INFINITY > Number.POSITIVE_INFINITY).toBe(false);
    expect(() => boundUnits({ ...PRESCRIPTION, isf: 0 })).toThrow(RangeError);
  });

  it('is exact at the one-increment allowance boundary', () => {
    // bound 45 units is 4500 hundredths; the allowance is one whole unit. A
    // rounded dose of exactly 4600 is AT the allowance and must pass; 4601 is
    // past it. Without the boundary the comparison could be `>=` and refuse an
    // attainable maximum.
    expect(exceedsBound(45, 4600, PRESCRIPTION, 100)).toBe(false);
    expect(exceedsBound(45, 4601, PRESCRIPTION, 100)).toBe(true);
    expect(exceedsBound(45, 4500, PRESCRIPTION, 100)).toBe(false);
  });

  it('is exact at the bound itself', () => {
    expect(exceedsBound(45, 4500, PRESCRIPTION, 100)).toBe(false);
    expect(exceedsBound(45.000001, 4500, PRESCRIPTION, 100)).toBe(true);
  });
});
