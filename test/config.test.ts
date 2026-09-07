/**
 * §11.8's config self-consistency test, plus the assertions §13.3 names by hand.
 *
 * This file is the one place a `config.ts` import is not a defect. §11.8's rule
 * is that GOLDEN CASES must not import from it — a test reading
 * `expect(dose).toBe(DEFAULT_THRESHOLD)` still passes when the constant changes,
 * so it asserts nothing. These tests are about the file's internal structure,
 * which is exactly what it should be read for.
 *
 * §11.8's own warning applies throughout: "the self-check validates structural
 * relationships. Golden cases pin intended behaviour. Neither substitutes for
 * the other."
 */

import { describe, expect, it } from 'vitest';
import type { ConfigValues } from '../src/config.js';
import {
  DEFAULT_MODE,
  DEFAULT_THRESHOLD,
  DELETE_CONFIRM_WINDOW_HOURS,
  HYPO_LEVEL_1,
  HYPO_LEVEL_2,
  INCREMENT,
  KETONE_ADVISORY,
  RANGE,
  STACK_ADVISE_HOURS,
  STACK_SUPPRESS_HOURS,
  SHIPPED,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_LOOK_ATTEMPTS,
  UPDATE_LOOK_INTERVAL_MS,
  checkConfig,
  configSelfCheck,
} from '../src/config.js';

describe('§11.8 the config self-check', () => {
  it('reports nothing on the shipped configuration', () => {
    expect(configSelfCheck()).toEqual([]);
  });

  it('orders the fixed clinical constants as 54 < 70 < 250', () => {
    expect(HYPO_LEVEL_2).toBeLessThan(HYPO_LEVEL_1);
    expect(HYPO_LEVEL_1).toBeLessThan(KETONE_ADVISORY);
  });

  it("does NOT put the patient's configurable target in that ordering", () => {
    // [R2]'s correction. The target is a prescription value, not a clinical
    // constant, and 150 sits between 70 and 250 by coincidence rather than by
    // rule — a self-check that ordered it would be asserting a false invariant.
    const [, targetCeiling] = RANGE.target.hard;
    expect(targetCeiling).toBe(200);
    expect(configSelfCheck()).toEqual([]);
  });

  it('§11.8 v9 — checks every default against its HARD range, not its soft band', () => {
    // v8's version asserted "every default lies inside its own soft band". His
    // target is 150 and the soft band is 90-140, so it failed on the
    // physician's own prescription on day one — and worse, it created pressure
    // to widen the band or "fix" the target, which §18.1 forbids.
    const [softLo, softHi] = RANGE.target.soft;
    expect(150 >= softLo && 150 <= softHi).toBe(false);
    const [hardLo, hardHi] = RANGE.target.hard;
    expect(150 >= hardLo && 150 <= hardHi).toBe(true);
    expect(configSelfCheck()).toEqual([]);
  });

  it('keeps every soft band inside its hard range', () => {
    for (const [name, range] of Object.entries(RANGE)) {
      if (!('soft' in range)) continue;
      const [hardLo, hardHi] = range.hard;
      const [softLo, softHi] = range.soft;
      expect(softLo, name).toBeGreaterThanOrEqual(hardLo);
      expect(softHi, name).toBeLessThanOrEqual(hardHi);
    }
  });

  it('orders the stacking windows and ties the delete window to the longer one', () => {
    expect(STACK_SUPPRESS_HOURS).toBeLessThan(STACK_ADVISE_HOURS);
    expect(DELETE_CONFIRM_WINDOW_HOURS).toBe(STACK_ADVISE_HOURS);
  });

  it('keeps the app-set defaults inside their hard ranges', () => {
    const [lo, hi] = RANGE.threshold.hard;
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(lo);
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(hi);
    expect(DEFAULT_MODE in INCREMENT).toBe(true);
  });
});

describe('§1.2 there are no prescription defaults, and that is the point', () => {
  it('ships no target, sensitivity or carbohydrate ratio', async () => {
    // v8's file shipped DEFAULT_TARGET = 150, DEFAULT_ISF = 30 and
    // DEFAULT_ICR = 10 under the heading "seed values", and both reviewers
    // rejected it: v8 rebuilt v1's first critical finding inside v8's own new
    // file. A seed constant either pre-populates onboarding — the
    // silent-defaults hazard §1.2 exists to kill — or it pre-populates nothing
    // and is dead code.
    const config = (await import('../src/config.js')) as Record<string, unknown>;
    expect(Object.keys(config)).not.toContain('DEFAULT_TARGET');
    expect(Object.keys(config)).not.toContain('DEFAULT_ISF');
    expect(Object.keys(config)).not.toContain('DEFAULT_ICR');
  });

  it('and the two defaults that DO exist are the two §5 and §6.2 grant', () => {
    expect(DEFAULT_THRESHOLD).toBeDefined();
    expect(DEFAULT_MODE).toBeDefined();
  });

  it('§1.2s traced consequence, as arithmetic', () => {
    // "The day the clinician moves the insulin-to-carb ratio to 15 — inside
    // the soft range, no confirmation — a silent revert to 10 makes a 150 g
    // meal dose 15 units instead of 10. Five units over is 150 mg/dL of
    // unintended drop, taking a normal post-meal 180 to about 30."
    const prescribed = 150 / 15;
    const silentlyReverted = 150 / 10;
    expect(prescribed).toBe(10);
    expect(silentlyReverted).toBe(15);
    expect((silentlyReverted - prescribed) * 30).toBe(150);
    expect(180 - 150).toBe(30);
  });
});

describe('§11.8 the self-check catches what it claims to catch', () => {
  /**
   * §20.3's standard: "a check that cannot be shown to fail on a real defect is
   * not a check." Five separate rounds of this project found checks that
   * certified nothing, and in every case READING the check suggested it worked
   * while RUNNING it revealed otherwise.
   *
   * So each case below hands `checkConfig` a genuinely broken configuration and
   * asserts it reports the specific problem — the real function, not a
   * reimplementation of it beside itself.
   */
  const broken: [string, ConfigValues, RegExp][] = [
    [
      'a soft band escaping its hard range',
      { ...SHIPPED, range: { ...SHIPPED.range, isf: { hard: [5, 200] as const, soft: [1, 300] as const } } },
      /soft band \[1, 300\] escapes hard range/,
    ],
    [
      'a hard range that is not ordered',
      { ...SHIPPED, range: { ...SHIPPED.range, carbs: { hard: [300, 0] as const } } },
      /hard range is not ordered/,
    ],
    [
      'a soft band that is not ordered',
      { ...SHIPPED, range: { ...SHIPPED.range, target: { hard: [70, 200] as const, soft: [140, 90] as const } } },
      /soft band is not ordered/,
    ],
    [
      'a default threshold outside its hard range',
      { ...SHIPPED, defaultThreshold: 100 },
      /DEFAULT_THRESHOLD 100 is outside its hard range/,
    ],
    [
      'a default mode that is not a rounding mode',
      { ...SHIPPED, defaultMode: 'closest' },
      /is not a rounding mode/,
    ],
    [
      'the two low levels swapped — the mutation that matters most here',
      { ...SHIPPED, hypoLevel1: 54, hypoLevel2: 70 },
      /clinical constants are out of order/,
    ],
    [
      'the ketone threshold moved below the low gate',
      { ...SHIPPED, ketoneAdvisory: 50 },
      /clinical constants are out of order/,
    ],
    [
      'the stacking windows swapped',
      { ...SHIPPED, stackSuppressHours: 12, stackAdviseHours: 4, deleteConfirmWindowHours: 4 },
      /stacking windows are out of order/,
    ],
    [
      'the delete window drifting away from the advise window',
      { ...SHIPPED, deleteConfirmWindowHours: 8 },
      /must equal STACK_ADVISE_HOURS/,
    ],
    [
      'the eat-delay window reversed',
      { ...SHIPPED, eatDelayMinutes: [30, 20] as const },
      /not an ordered positive pair/,
    ],
    [
      'a low divisor that would fire on every meal',
      { ...SHIPPED, advisoryLowDivisor: 1 },
      /would fire on every meal/,
    ],
    [
      'a high multiple that would fire on every meal',
      { ...SHIPPED, advisoryHighMultiple: 1 },
      /would fire on every meal/,
    ],
    [
      'a minimum eligible count larger than the window it is drawn from',
      { ...SHIPPED, advisoryMinEligible: 40 },
      /cannot be met inside a window/,
    ],
    [
      'a divergence ratio that would confirm every injection',
      { ...SHIPPED, divergeRatio: 1 },
      /would confirm every injection/,
    ],
    [
      'the absolute floor removed from the divergence predicate',
      { ...SHIPPED, divergeMinUnits: 0 },
      /removes the absolute floor/,
    ],
    [
      'an amount stepper that is not half a unit',
      { ...SHIPPED, amountStepHundredths: 200 },
      /is not half a unit/,
    ],
    [
      'and one a hundredth off it',
      { ...SHIPPED, amountStepHundredths: 51 },
      /is not half a unit/,
    ],
  ];

  it.each(broken)('reports %s', (_name, values, pattern) => {
    const problems = checkConfig(values);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(' | ')).toMatch(pattern);
  });

  it('and reports nothing when nothing is broken, so the cases above mean something', () => {
    expect(checkConfig(SHIPPED)).toEqual([]);
  });
});

describe('§11.8 the self-check is exact at every boundary it compares on', () => {
  /**
   * A comparison written `<` where `<=` was meant is the quietest possible
   * defect in a table of numbers: it fires on nothing except the one value
   * sitting exactly on the line. Each pair below puts a value ON the line and
   * one step past it, so the direction of every comparison is pinned rather
   * than assumed.
   */
  it('a hard range whose ends are EQUAL is not ordered', () => {
    const equal = { ...SHIPPED, range: { ...SHIPPED.range, carbs: { hard: [50, 50] as const } } };
    expect(checkConfig(equal).join(' ')).toMatch(/hard range is not ordered/);
    const ordered = { ...SHIPPED, range: { ...SHIPPED.range, carbs: { hard: [50, 51] as const } } };
    expect(checkConfig(ordered)).toEqual([]);
  });

  it('a soft band whose ends are EQUAL is not ordered', () => {
    const equal = {
      ...SHIPPED,
      range: { ...SHIPPED.range, isf: { hard: [5, 200] as const, soft: [50, 50] as const } },
    };
    expect(checkConfig(equal).join(' ')).toMatch(/soft band is not ordered/);
  });

  it('a soft band sitting exactly ON its hard ends does NOT escape them', () => {
    const flush = {
      ...SHIPPED,
      range: { ...SHIPPED.range, isf: { hard: [5, 200] as const, soft: [5, 200] as const } },
    };
    expect(checkConfig(flush)).toEqual([]);
    const oneBelow = {
      ...SHIPPED,
      range: { ...SHIPPED.range, isf: { hard: [5, 200] as const, soft: [4, 200] as const } },
    };
    expect(checkConfig(oneBelow).join(' ')).toMatch(/escapes hard range/);
    const oneAbove = {
      ...SHIPPED,
      range: { ...SHIPPED.range, isf: { hard: [5, 200] as const, soft: [5, 201] as const } },
    };
    expect(checkConfig(oneAbove).join(' ')).toMatch(/escapes hard range/);
  });

  it('a default sitting exactly ON a hard end is inside the range', () => {
    expect(checkConfig({ ...SHIPPED, defaultThreshold: 10 })).toEqual([]);
    expect(checkConfig({ ...SHIPPED, defaultThreshold: 45 })).toEqual([]);
    expect(checkConfig({ ...SHIPPED, defaultThreshold: 9 }).join(' ')).toMatch(/outside its hard range/);
    expect(checkConfig({ ...SHIPPED, defaultThreshold: 46 }).join(' ')).toMatch(/outside its hard range/);
  });

  it('two clinical constants that are EQUAL are out of order', () => {
    // The ordering is strict: 54 < 70 < 250. Two levels at the same number
    // means one of the two bands can never fire.
    expect(checkConfig({ ...SHIPPED, hypoLevel2: 70 }).join(' ')).toMatch(/out of order/);
    expect(checkConfig({ ...SHIPPED, ketoneAdvisory: 70 }).join(' ')).toMatch(/out of order/);
  });

  it('two stacking windows that are EQUAL are out of order', () => {
    // Equal windows would make the 4-12 hour advise band empty, so the
    // informational line could never appear.
    const equal = {
      ...SHIPPED,
      stackSuppressHours: 12,
      stackAdviseHours: 12,
      deleteConfirmWindowHours: 12,
    };
    expect(checkConfig(equal).join(' ')).toMatch(/stacking windows are out of order/);
  });

  it('a divisor floor of exactly zero is reported', () => {
    const zeroFloor = { ...SHIPPED, range: { ...SHIPPED.range, isf: { hard: [0, 200] as const, soft: [20, 100] as const } } };
    expect(checkConfig(zeroFloor).join(' ')).toMatch(/a zero divisor would reach the calculation/);
    const justAbove = {
      ...SHIPPED,
      range: { ...SHIPPED.range, isf: { hard: [0.01, 200] as const, soft: [20, 100] as const } },
    };
    expect(checkConfig(justAbove).join(' ')).not.toMatch(/zero divisor/);
  });

  it('an eat-delay lower end of exactly zero is not positive', () => {
    expect(checkConfig({ ...SHIPPED, eatDelayMinutes: [0, 30] as const }).join(' ')).toMatch(
      /not an ordered positive pair/,
    );
    expect(checkConfig({ ...SHIPPED, eatDelayMinutes: [1, 30] as const })).toEqual([]);
  });

  it('an eat-delay pair whose ends are EQUAL is not ordered', () => {
    expect(checkConfig({ ...SHIPPED, eatDelayMinutes: [30, 30] as const }).join(' ')).toMatch(
      /not an ordered positive pair/,
    );
  });

  it('a minimum eligible count of exactly zero is reported', () => {
    expect(checkConfig({ ...SHIPPED, advisoryMinEligible: 0 }).join(' ')).toMatch(
      /cannot be met inside a window/,
    );
    expect(checkConfig({ ...SHIPPED, advisoryMinEligible: 1 })).toEqual([]);
  });

  it('a minimum eligible count EQUAL to the window is achievable', () => {
    expect(checkConfig({ ...SHIPPED, advisoryMinEligible: 30 })).toEqual([]);
    expect(checkConfig({ ...SHIPPED, advisoryMinEligible: 31 }).join(' ')).toMatch(
      /cannot be met inside a window/,
    );
  });

  it('a divergence ratio of exactly one confirms every injection', () => {
    expect(checkConfig({ ...SHIPPED, divergeRatio: 1 }).join(' ')).toMatch(/every injection/);
    expect(checkConfig({ ...SHIPPED, divergeRatio: 1.01 })).toEqual([]);
  });

  it('a divergence floor of exactly zero removes the floor', () => {
    expect(checkConfig({ ...SHIPPED, divergeMinUnits: 0 }).join(' ')).toMatch(/absolute floor/);
    expect(checkConfig({ ...SHIPPED, divergeMinUnits: 0.01 })).toEqual([]);
  });

  it('an advisory divisor or multiple of exactly one fires on every meal', () => {
    expect(checkConfig({ ...SHIPPED, advisoryLowDivisor: 1 }).join(' ')).toMatch(/every meal/);
    expect(checkConfig({ ...SHIPPED, advisoryHighMultiple: 1 }).join(' ')).toMatch(/every meal/);
    expect(checkConfig({ ...SHIPPED, advisoryLowDivisor: 1.01 })).toEqual([]);
    expect(checkConfig({ ...SHIPPED, advisoryHighMultiple: 1.01 })).toEqual([]);
  });
});

describe('the service-worker update cadence', () => {
  /**
   * `UPDATE_CHECK_INTERVAL_MS` had no assertion at all, so the mutation gate
   * reported `15 * 60 / 1000` and `15 / 60` as surviving mutants — the constant
   * could become 0.9ms or 0.25ms and nothing would object.
   *
   * Both ends matter. Too short and every return to the foreground is a network
   * request; too long and §11.4's prompt cannot tell the user their dosing app
   * is out of date — which is exactly the defect recorded as BACKLOG T4.
   */
  it('is frequent enough to matter and rare enough not to hammer the network', () => {
    expect(UPDATE_CHECK_INTERVAL_MS).toBeGreaterThanOrEqual(60_000);
    expect(UPDATE_CHECK_INTERVAL_MS).toBeLessThanOrEqual(60 * 60_000);
  });

  it('and the startup look is bounded, so it cannot poll forever', () => {
    expect(UPDATE_LOOK_ATTEMPTS).toBeGreaterThanOrEqual(3);
    expect(UPDATE_LOOK_ATTEMPTS).toBeLessThanOrEqual(30);
    expect(UPDATE_LOOK_INTERVAL_MS).toBeGreaterThanOrEqual(250);
    // The whole look window must stay short: it runs at startup, and the app
    // has to be usable while it does.
    expect(UPDATE_LOOK_ATTEMPTS * UPDATE_LOOK_INTERVAL_MS).toBeLessThanOrEqual(30_000);
  });
});
