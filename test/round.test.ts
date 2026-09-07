import { describe, expect, it } from 'vitest';
import {
  incrementHundredths,
  modeNeedsAcknowledgement,
  roundToHundredths,
} from '../src/core/round.js';

describe('§5.2 the traps, each demonstrated then avoided', () => {
  it('nearest breaks the tie away from zero, where Math.round breaks it upward', () => {
    expect(Math.round(-1.5)).toBe(-1);
    expect(roundToHundredths(-1.5, 'nearest')).toBe(-200);
    expect(roundToHundredths(1.5, 'nearest')).toBe(200);
  });

  it('ceil goes toward +infinity, not toward greater magnitude', () => {
    // "up" misread as increasing magnitude would give -2 for -1.5.
    expect(roundToHundredths(-1.5, 'ceil')).toBe(-100);
    expect(roundToHundredths(1.5, 'ceil')).toBe(200);
    expect(roundToHundredths(1.01, 'ceil')).toBe(200);
    expect(roundToHundredths(1, 'ceil')).toBe(100);
  });

  it('floor goes toward -infinity, where trunc would go toward zero', () => {
    expect(Math.trunc(-1.5)).toBe(-1);
    expect(roundToHundredths(-1.5, 'floor')).toBe(-200);
    expect(roundToHundredths(1.99, 'floor')).toBe(100);
  });

  it('and truncating a negative correction would INCREASE the combined dose', () => {
    // §5.2's closing sentence, made arithmetic. A correction of -1.5 combined
    // with a 6-unit meal: flooring gives -2 + 6 = 4; truncating gives
    // -1 + 6 = 5. The wrong direction, by a whole unit.
    const flooredCorrection = roundToHundredths(-1.5, 'floor');
    const truncatedCorrection = Math.trunc(-1.5) * 100;
    expect(flooredCorrection).toBeLessThan(truncatedCorrection);
  });

  it('off breaks its hundredths tie half away from zero too', () => {
    expect(roundToHundredths(-1.495, 'off')).toBe(-150);
    expect(roundToHundredths(1.005, 'off')).toBe(101);
    expect(roundToHundredths(1.125, 'off')).toBe(113);
    expect(roundToHundredths(-1.125, 'off')).toBe(-113);
  });
});

describe('§5.1 nearest half unit', () => {
  it('rounds to the nearest 0.5, not to a range', () => {
    // [R2] found v23's oracle listing floor-half AND ceil-half as though `half`
    // were a range. It is one mode and rounds to the NEAREST half.
    expect(roundToHundredths(4.25, 'half')).toBe(450);
    expect(roundToHundredths(4.24, 'half')).toBe(400);
    expect(roundToHundredths(4.26, 'half')).toBe(450);
    expect(roundToHundredths(4.74, 'half')).toBe(450);
    expect(roundToHundredths(4.75, 'half')).toBe(500);
    expect(roundToHundredths(4, 'half')).toBe(400);
    expect(roundToHundredths(4.5, 'half')).toBe(450);
  });

  it('breaks its own tie away from zero on both signs', () => {
    expect(roundToHundredths(-4.25, 'half')).toBe(-450);
    expect(roundToHundredths(-4.75, 'half')).toBe(-500);
  });

  it('and 5.9667 is NOT 5.5 under it — the mutation [R2] caught', () => {
    // 194 mg/dL and 45 g at 150/30/10: correction 1.46667, meal 4.5,
    // total 5.96667. Rounding to the nearest half gives 6.0. An oracle that
    // admitted 5.5 accepted a dose no build can produce.
    const exact = (194 - 150) / 30 + 45 / 10;
    expect(roundToHundredths(exact, 'half')).toBe(600);
    expect(roundToHundredths(exact, 'nearest')).toBe(600);
    expect(roundToHundredths(exact, 'floor')).toBe(500);
    expect(roundToHundredths(exact, 'ceil')).toBe(600);
    expect(roundToHundredths(exact, 'off')).toBe(597);
  });
});

describe('§2.1 rule 3 — negative zero is normalised on every quantity', () => {
  it('holds for every mode', () => {
    expect(Object.is(roundToHundredths(-0.4, 'nearest'), 0)).toBe(true);
    expect(Object.is(roundToHundredths(-0.2, 'half'), 0)).toBe(true);
    // Math.ceil(-0.5) is negative zero, and -0 * 100 stays negative zero.
    expect(Object.is(Math.ceil(-0.5), -0)).toBe(true);
    expect(Object.is(roundToHundredths(-0.5, 'ceil'), 0)).toBe(true);
    expect(Object.is(roundToHundredths(-0, 'floor'), 0)).toBe(true);
    expect(Object.is(roundToHundredths(-0.001, 'off'), 0)).toBe(true);
  });
});

describe('§5 whole-unit granularity for ceil and floor', () => {
  it('is a WHOLE unit, not a hundredth — v9 could not drive either mode', () => {
    // §11.8: ceil and floor were added to INCREMENT in v10 because v9's map
    // could not express them, and §5.2 pins whole-unit granularity for both.
    expect(incrementHundredths('nearest')).toBe(100);
    expect(incrementHundredths('ceil')).toBe(100);
    expect(incrementHundredths('floor')).toBe(100);
    expect(incrementHundredths('half')).toBe(50);
    expect(incrementHundredths('off')).toBe(1);
  });
});

describe('§5.1 ceil is the only gated mode', () => {
  it('gates ceil and nothing else', () => {
    expect(modeNeedsAcknowledgement('ceil')).toBe(true);
    for (const mode of ['nearest', 'half', 'floor', 'off'] as const) {
      expect(modeNeedsAcknowledgement(mode), mode).toBe(false);
    }
  });

  it('and the reason is arithmetic: ceil always moves toward low blood sugar', () => {
    // At isf 30, one unit is 30 mg/dL. On a 1.01-unit correction ceil adds
    // almost a whole unit — a 100% overdose. On a 20-unit meal dose the same
    // absolute error is 5%.
    const smallDose = 1.01;
    const largeDose = 20.01;
    const smallOvershoot = roundToHundredths(smallDose, 'ceil') - roundToHundredths(smallDose, 'floor');
    const largeOvershoot = roundToHundredths(largeDose, 'ceil') - roundToHundredths(largeDose, 'floor');
    expect(smallOvershoot).toBe(100);
    expect(largeOvershoot).toBe(100);
    // Same absolute overshoot, wildly different proportion — which is §5.1's
    // point that the modes are not neutral peers.
    expect(smallOvershoot / roundToHundredths(smallDose, 'floor')).toBeCloseTo(1, 10);
    expect(largeOvershoot / roundToHundredths(largeDose, 'floor')).toBeCloseTo(0.05, 10);
  });
});

describe('finiteness', () => {
  it('refuses a non-finite value in every mode', () => {
    for (const mode of ['nearest', 'half', 'ceil', 'floor', 'off'] as const) {
      expect(() => roundToHundredths(Number.NaN, mode), mode).toThrow(
        /roundToHundredths received a non-finite value/,
      );
    }
  });
});
