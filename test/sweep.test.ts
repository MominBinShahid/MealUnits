/**
 * §13.5 — a deterministic boundary sweep instead of a property library.
 *
 * §13.4's justification for mutation testing applies here too, and it is the
 * reason this file asserts values rather than shapes: during research a
 * property suite passed while a mutant that made the function RETURN 0 FOR
 * EVERY INPUT also passed, because the property only asserted "result >= 0 and
 * not negative zero" — which `return 0` satisfies. Property tests assert shape,
 * and shape is satisfiable by degenerate implementations.
 *
 * So the sweep below checks INVARIANTS that a degenerate implementation breaks,
 * and every invariant is paired with a golden case elsewhere pinning a real
 * value.
 *
 * §13.5's counter-intuitive warning, which this file is careful about:
 * "increasing the insulin sensitivity factor shrinks a positive correction but
 * makes a negative one LESS negative — so 'larger sensitivity means smaller
 * dose' would itself be a wrong assertion."
 */

import { describe, expect, it } from 'vitest';
import { computeExact } from '../src/core/calculate.js';
import { classifyBands } from '../src/core/bands.js';
import { roundToHundredths } from '../src/core/round.js';
import { resolve } from '../src/core/resolve.js';
import { toHundredths } from '../src/core/decimal.js';
import type { DosingSettings, RoundingMode, Settings, Snapshot } from '../src/core/types.js';

const MODES: readonly RoundingMode[] = ['nearest', 'half', 'ceil', 'floor', 'off'];
const NOW = 1_757_000_000_000;

/** Boundaries named in §13.3, plus one value either side of each. */
const BLOOD_SUGARS = [
  20, 21, 39, 40, 53, 53.99, 54, 54.01, 69, 69.99, 70, 70.01, 71,
  99, 100, 104, 105, 106, 149, 150, 151, 180, 200,
  249, 249.99, 250, 250.01, 300, 400, 435, 500, 599, 600,
];
const CARBS = [0, 0.01, 1, 9, 10, 11, 14, 15, 20, 37.5, 50, 60, 75, 100, 150, 200, 240, 250, 299, 300];
const TARGETS = [70, 90, 110, 140, 150, 200];
const ISFS = [5, 20, 30, 50, 100, 200];
const ICRS = [1, 5, 10, 15, 20, 50, 100];

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    revision: 1,
    target: 150,
    isf: 30,
    icr: 10,
    mode: 'nearest',
    threshold: 20,
    basalName: 'Lantus',
    basalUnits: 36,
    basalTiming: 'early morning', personName: '',
    ...overrides,
  };
}

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    inputs: { bloodSugar: '', carbs: '' },
    settings: settings(),
    logRevision: 1,
    decisionTime: NOW,
    stackingOverride: false,
    carbBaseline: null,
    eligibleEntryCount: 0,
    historyProvenance: 'trusted',
    lastDose: null,
    bandEFullCardShownToday: false,
    excludedTimeRecords: 0,
    blankReadingAcknowledged: true,
    largeDoseConfirmed: true,
    ...overrides,
  };
}

describe('§13.5 the sweep — invariants a degenerate implementation breaks', () => {
  it('the dose is never negative, and never negative zero, anywhere in the space', () => {
    let checked = 0;
    for (const bloodSugar of BLOOD_SUGARS) {
      for (const carbs of CARBS) {
        for (const mode of MODES) {
          const outcome = resolve(
            snapshot({
              inputs: { bloodSugar: bloodSugar.toString(), carbs: carbs.toString() },
              settings: settings({ mode }),
            }),
          );
          if (outcome.kind !== 'dose' && outcome.kind !== 'meal_only_suppressed') continue;
          checked += 1;
          expect(outcome.hundredths).toBeGreaterThanOrEqual(0);
          expect(Object.is(outcome.hundredths, -0)).toBe(false);
        }
      }
    }
    // And the sweep actually ran, which is the assertion a "return 0" mutant
    // would otherwise satisfy by producing no cases at all.
    expect(checked).toBeGreaterThan(1000);
  });

  it('the dose is NOT constant — the mutant that returns zero for everything', () => {
    const doses = new Set<number>();
    for (const bloodSugar of BLOOD_SUGARS) {
      for (const carbs of CARBS) {
        const outcome = resolve(
          snapshot({ inputs: { bloodSugar: bloodSugar.toString(), carbs: carbs.toString() } }),
        );
        if (outcome.kind === 'dose') doses.add(outcome.hundredths);
      }
    }
    expect(doses.size).toBeGreaterThan(20);
  });

  it('the dose is monotonically non-decreasing in carbohydrates', () => {
    for (const bloodSugar of BLOOD_SUGARS) {
      let previous = -1;
      for (const carbs of CARBS) {
        const outcome = resolve(
          snapshot({ inputs: { bloodSugar: bloodSugar.toString(), carbs: carbs.toString() } }),
        );
        if (outcome.kind !== 'dose') continue;
        expect(outcome.hundredths, `${bloodSugar} / ${carbs}`).toBeGreaterThanOrEqual(previous);
        previous = outcome.hundredths;
      }
    }
  });

  it('the dose is monotonically non-decreasing in blood sugar', () => {
    for (const carbs of CARBS) {
      let previous = -1;
      for (const bloodSugar of BLOOD_SUGARS) {
        const outcome = resolve(
          snapshot({ inputs: { bloodSugar: bloodSugar.toString(), carbs: carbs.toString() } }),
        );
        if (outcome.kind !== 'dose') continue;
        expect(outcome.hundredths, `${bloodSugar} / ${carbs}`).toBeGreaterThanOrEqual(previous);
        previous = outcome.hundredths;
      }
    }
  });

  it('§13.5 — a LARGER sensitivity does NOT always mean a smaller dose', () => {
    // The counter-intuitive property, asserted in both directions so that
    // "larger sensitivity means smaller dose" cannot be written as an
    // invariant by a later reader.
    const above: DosingSettings = { target: 150, isf: 30, icr: 10, mode: 'nearest' };
    const aboveWide: DosingSettings = { ...above, isf: 60 };
    // Above target: a bigger sensitivity SHRINKS the positive correction.
    expect(computeExact(330, 0, above, false).clamped).toBe(6);
    expect(computeExact(330, 0, aboveWide, false).clamped).toBe(3);
    // Below target: a bigger sensitivity makes the NEGATIVE correction less
    // negative, so the combined dose goes UP.
    const belowNarrow = computeExact(90, 60, above, false);
    const belowWide = computeExact(90, 60, aboveWide, false);
    expect(belowNarrow.clamped).toBe(4);
    expect(belowWide.clamped).toBe(5);
    expect(belowWide.clamped).toBeGreaterThan(belowNarrow.clamped);
  });

  it('§2.1 — clamping the CORRECTION instead of the TOTAL is always >= the correct dose', () => {
    // The named defect, swept rather than sampled. Every case where the two
    // differ is a case where the defect hands out MORE insulin.
    let differing = 0;
    for (const bloodSugar of BLOOD_SUGARS) {
      for (const carbs of CARBS) {
        const s = settings();
        const correct = computeExact(bloodSugar, carbs, s, false);
        const defective = Math.max(0, (bloodSugar - s.target) / s.isf) + carbs / s.icr;
        expect(defective, `${bloodSugar} / ${carbs}`).toBeGreaterThanOrEqual(correct.clamped);
        if (defective > correct.clamped) differing += 1;
      }
    }
    expect(differing).toBeGreaterThan(100);
  });

  it('§3 the bands partition the reading space with no gap and no overlap', () => {
    for (const bloodSugar of BLOOD_SUGARS) {
      const bands = classifyBands(bloodSugar, 0);
      expect(bands.length, String(bloodSugar)).toBeGreaterThan(0);
      const blocking = bands.includes('C') || bands.includes('D');
      if (blocking) {
        // Terminal: exactly one band and nothing else.
        expect(bands, String(bloodSugar)).toHaveLength(1);
      } else {
        // Exactly one of A or B, plus E only above the ketone threshold.
        const primary = bands.filter((band) => band === 'A' || band === 'B');
        expect(primary, String(bloodSugar)).toHaveLength(1);
        expect(bands.includes('E'), String(bloodSugar)).toBe(bloodSugar >= 250);
      }
    }
  });

  it('§6.4 the bound is never exceeded anywhere in the validated space', () => {
    for (const target of TARGETS) {
      for (const isf of ISFS) {
        for (const icr of ICRS) {
          const s = settings({ target, isf, icr });
          const worst = computeExact(600, 300, s, false);
          const bound = (600 - target) / isf + 300 / icr;
          expect(worst.clamped, `${target}/${isf}/${icr}`).toBeLessThanOrEqual(bound);
        }
      }
    }
  });

  it('§5 every mode lands on its own increment, at every value it is given', () => {
    for (const units of [0, 0.01, 0.5, 1, 1.5, 4.25, 4.5, 11, 20.5, 26, 44.99, 45]) {
      expect(roundToHundredths(units, 'nearest') % 100).toBe(0);
      expect(roundToHundredths(units, 'ceil') % 100).toBe(0);
      expect(roundToHundredths(units, 'floor') % 100).toBe(0);
      expect(roundToHundredths(units, 'half') % 50).toBe(0);
      expect(Number.isInteger(roundToHundredths(units, 'off'))).toBe(true);
    }
  });

  it('§5 every mode stays within one increment of the exact total', () => {
    for (const units of [0, 0.01, 0.4, 0.5, 0.6, 4.25, 11.11, 26.5, 44.99]) {
      const exact = toHundredths(units);
      expect(Math.abs(roundToHundredths(units, 'nearest') - exact)).toBeLessThanOrEqual(50);
      expect(Math.abs(roundToHundredths(units, 'half') - exact)).toBeLessThanOrEqual(25);
      expect(roundToHundredths(units, 'ceil') - exact).toBeGreaterThanOrEqual(0);
      expect(roundToHundredths(units, 'ceil') - exact).toBeLessThan(100);
      expect(exact - roundToHundredths(units, 'floor')).toBeGreaterThanOrEqual(0);
      expect(exact - roundToHundredths(units, 'floor')).toBeLessThan(100);
    }
  });

  it('§7.4 suppression never RAISES a dose — the round-2 critical, swept', () => {
    for (const bloodSugar of BLOOD_SUGARS) {
      for (const carbs of CARBS) {
        const s = settings();
        const applied = computeExact(bloodSugar, carbs, s, false);
        const suppressed = computeExact(bloodSugar, carbs, s, true);
        expect(suppressed.clamped, `${bloodSugar} / ${carbs}`).toBeLessThanOrEqual(applied.clamped);
      }
    }
  });

  it('and the meal term is identical with and without suppression, everywhere', () => {
    for (const carbs of CARBS) {
      const s = settings();
      expect(computeExact(330, carbs, s, true).meal).toBe(
        computeExact(330, carbs, s, false).meal,
      );
    }
  });

  it('§3.3 no outcome below 70 mg/dL carries an insulin quantity of any kind', () => {
    for (const bloodSugar of BLOOD_SUGARS.filter((v) => v < 70)) {
      for (const carbs of CARBS) {
        const outcome = resolve(
          snapshot({ inputs: { bloodSugar: bloodSugar.toString(), carbs: carbs.toString() } }),
        );
        expect(outcome.kind, `${bloodSugar} / ${carbs}`).toBe('blocked_low');
        expect('hundredths' in outcome).toBe(false);
        expect('breakdown' in outcome).toBe(false);
      }
    }
  });

  it('§6.2 the confirmation gate never lets a dose through above the threshold', () => {
    for (const bloodSugar of BLOOD_SUGARS) {
      for (const carbs of CARBS) {
        const outcome = resolve(
          snapshot({
            inputs: { bloodSugar: bloodSugar.toString(), carbs: carbs.toString() },
            largeDoseConfirmed: false,
          }),
        );
        if (outcome.kind !== 'dose' && outcome.kind !== 'meal_only_suppressed') continue;
        expect(outcome.hundredths, `${bloodSugar} / ${carbs}`).toBeLessThan(2000);
      }
    }
  });
});
