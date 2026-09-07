/**
 * §4.3's resolver, at the branches the golden cases do not reach.
 *
 * The golden file pins behaviour a person can read: real readings, real meals,
 * real doses. This file covers the boundaries between them, the settings gates,
 * and the two places §6.2 and §7.4.1 make a decision from more than one number.
 */

import { describe, expect, it } from 'vitest';
import { ADVISORY_RANK, resolve, splitAdvisoryBudget } from '../src/core/resolve.js';
import type { Advisory, RoundingMode, Settings, Snapshot } from '../src/core/types.js';

const NOW = 1_757_000_000_000;
const HOUR = 3_600_000;

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

function snapshot(
  bloodSugar: string,
  carbs: string,
  overrides: Partial<Snapshot> = {},
): Snapshot {
  return {
    inputs: { bloodSugar, carbs },
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

describe('§4.4 the settings gate refuses to calculate, field by field', () => {
  const cases: [string, Partial<Settings>, string, string][] = [
    ['target below its floor', { target: 69 }, 'target', 'below_range'],
    ['target above its ceiling', { target: 201 }, 'target', 'above_range'],
    ['sensitivity below its floor', { isf: 4 }, 'isf', 'below_range'],
    ['sensitivity above its ceiling', { isf: 201 }, 'isf', 'above_range'],
    ['carbohydrate ratio below its floor', { icr: 0.5 }, 'icr', 'below_range'],
    ['carbohydrate ratio above its ceiling', { icr: 101 }, 'icr', 'above_range'],
    ['threshold below its floor', { threshold: 9 }, 'threshold', 'below_range'],
    ['threshold above its ceiling', { threshold: 46 }, 'threshold', 'above_range'],
  ];

  it.each(cases)('rejects a %s', (_name, override, field, reason) => {
    const outcome = resolve(snapshot('200', '60', { settings: settings(override) }));
    expect(outcome.kind).toBe('invalid_settings');
    if (outcome.kind !== 'invalid_settings') return;
    expect(outcome.errors).toHaveLength(1);
    expect(outcome.errors[0]).toEqual({ field, reason });
  });

  it('accepts every hard endpoint, because a boundary is inside the range', () => {
    for (const override of [
      { target: 70 },
      { target: 200 },
      { isf: 5 },
      { isf: 200 },
      { icr: 1 },
      { icr: 100 },
      { threshold: 10 },
      { threshold: 45 },
    ]) {
      const outcome = resolve(snapshot('200', '60', { settings: settings(override) }));
      expect(outcome.kind, JSON.stringify(override)).not.toBe('invalid_settings');
    }
  });

  it('§2.3 rule 1 — a non-finite setting is rejected as NOT FINITE, not as out of range', () => {
    // `NaN < lo` and `NaN > hi` are both false, so a range check alone lets it
    // straight through into the arithmetic.
    for (const field of ['target', 'isf', 'icr', 'threshold'] as const) {
      const outcome = resolve(
        snapshot('200', '60', { settings: settings({ [field]: Number.NaN }) }),
      );
      expect(outcome.kind, field).toBe('invalid_settings');
      if (outcome.kind !== 'invalid_settings') continue;
      expect(outcome.errors, field).toEqual([{ field, reason: 'not_finite' }]);
    }
  });

  it('rejects a rounding mode the store should never have held', () => {
    const outcome = resolve(
      snapshot('200', '60', { settings: settings({ mode: 'closest' as RoundingMode }) }),
    );
    expect(outcome.kind).toBe('invalid_settings');
    if (outcome.kind !== 'invalid_settings') return;
    expect(outcome.errors).toEqual([{ field: 'mode', reason: 'missing' }]);
  });

  it('collects more than one at a time rather than stopping at the first', () => {
    const outcome = resolve(
      snapshot('200', '60', { settings: settings({ target: 10, isf: 1, icr: 500 }) }),
    );
    expect(outcome.kind).toBe('invalid_settings');
    if (outcome.kind !== 'invalid_settings') return;
    expect(outcome.errors).toHaveLength(3);
  });

  it('and settings errors NEVER replace the low-reading guidance', () => {
    // §4.3 step 3 runs before step 4, so a reading of 65 with unusable settings
    // still says "treat first" rather than "go and fix your settings".
    const outcome = resolve(
      snapshot('65', '60', { settings: settings({ target: 10, isf: 1, icr: 500 }) }),
    );
    expect(outcome.kind).toBe('blocked_low');
  });
});

describe('§4.3 step 5 — was a calculation requested', () => {
  it('carbohydrates blank with the reading exactly AT target gives no result', () => {
    expect(resolve(snapshot('150', '')).kind).toBe('no_result');
  });

  it('one mg/dL above target it becomes a correction-only dose', () => {
    const outcome = resolve(snapshot('151', ''));
    expect(outcome.kind).toBe('dose');
  });

  it('and below target it is still no result, not a zero', () => {
    expect(resolve(snapshot('120', '')).kind).toBe('no_result');
  });

  it('a blank reading with blank carbohydrates is no result even when acknowledged', () => {
    expect(resolve(snapshot('', '', { blankReadingAcknowledged: true })).kind).toBe('no_result');
  });
});

describe('§6.2 the operand is EITHER the exact total OR the rounded dose', () => {
  it('fires on the exact total when the rounded dose alone would not', () => {
    // threshold 20.5, mode floor. carbs 205 gives a meal of exactly 20.5 and no
    // correction, so the exact total REACHES 20.5 while floor rounds to 20 and
    // does not. Without the exact-total operand this reveals 20 units silently.
    const s = settings({ threshold: 20.5, mode: 'floor' });
    const withGate = resolve(snapshot('150', '205', { settings: s, largeDoseConfirmed: false }));
    expect(withGate.kind).toBe('confirm_required');

    const confirmed = resolve(snapshot('150', '205', { settings: s, largeDoseConfirmed: true }));
    expect(confirmed.kind).toBe('dose');
    if (confirmed.kind !== 'dose') return;
    expect(confirmed.hundredths).toBe(2000);
  });

  it('fires on the rounded dose when the exact total alone would not', () => {
    // threshold 20, mode ceil. carbs 191 gives an exact total of 19.1, which
    // does not reach 20 — but ceil rounds it to 20, which does.
    const s = settings({ mode: 'ceil' });
    expect(resolve(snapshot('150', '191', { settings: s, largeDoseConfirmed: false })).kind).toBe(
      'confirm_required',
    );
  });

  it('does not fire one hundredth below the threshold on either operand', () => {
    const s = settings({ threshold: 20.5, mode: 'floor' });
    expect(resolve(snapshot('150', '204.9', { settings: s, largeDoseConfirmed: false })).kind).toBe(
      'dose',
    );
  });
});

describe('§7.4.1 the override panel withholds its figures at the threshold', () => {
  const twoHoursAgo = { injectedHundredths: 600, atMs: NOW - 2 * HOUR };

  it('shows both figures when neither reaches the threshold', () => {
    const outcome = resolve(snapshot('330', '40', { lastDose: twoHoursAgo }));
    expect(outcome.kind).toBe('meal_only_suppressed');
    if (outcome.kind !== 'meal_only_suppressed') return;
    expect(outcome.hundredths).toBe(400);
    expect(outcome.overrideCandidateHundredths).toBe(1000);
    expect(outcome.overrideFiguresWithheld).toBe(false);
  });

  it('withholds them when the OVERRIDE CANDIDATE alone reaches it', () => {
    // 600 mg/dL with 40 g: meal-only is 4 units and stays well under, but the
    // candidate is 15 + 4 = 19... so use 50 g to push the candidate to 20 while
    // the meal-only figure is 5.
    const outcome = resolve(snapshot('600', '50', { lastDose: twoHoursAgo }));
    expect(outcome.kind).toBe('meal_only_suppressed');
    if (outcome.kind !== 'meal_only_suppressed') return;
    expect(outcome.hundredths).toBe(500);
    expect(outcome.overrideCandidateHundredths).toBe(2000);
    expect(outcome.overrideFiguresWithheld).toBe(true);
  });

  it('withholds them when the MEAL-ONLY figure reaches it', () => {
    const outcome = resolve(snapshot('600', '200', { lastDose: twoHoursAgo }));
    expect(outcome.kind).toBe('meal_only_suppressed');
    if (outcome.kind !== 'meal_only_suppressed') return;
    expect(outcome.hundredths).toBe(2000);
    expect(outcome.overrideFiguresWithheld).toBe(true);
  });

  it('reports nothing to withhold when no correction was held back', () => {
    const outcome = resolve(snapshot('330', '40'));
    expect(outcome.kind).toBe('dose');
    if (outcome.kind !== 'dose') return;
    expect(outcome.overrideCandidateHundredths).toBeNull();
    expect(outcome.stackingCeilingMgDl).toBeNull();
    expect(outcome.overrideFiguresWithheld).toBe(false);
    expect(outcome.overrideAvailable).toBe(false);
  });

  it('and a LARGE unsuppressed dose still reports nothing withheld', () => {
    // 26 units, well past the threshold, with no recent injection. There is no
    // override panel to withhold anything from — the flag describes that panel,
    // not the dose. §6.3's withholding of the dose itself is a different gate.
    const outcome = resolve(snapshot('330', '200'));
    expect(outcome.kind).toBe('dose');
    if (outcome.kind !== 'dose') return;
    expect(outcome.hundredths).toBe(2600);
    expect(outcome.overrideFiguresWithheld).toBe(false);
  });

  it('is exact at the threshold: a candidate AT it withholds, one hundredth below does not', () => {
    // 600 mg/dL and 50 g: correction 15 suppressed, meal 5, candidate exactly 20
    // units against a threshold of 20.
    const at = resolve(snapshot('600', '50', { lastDose: twoHoursAgo }));
    expect(at.kind === 'meal_only_suppressed' && at.overrideFiguresWithheld).toBe(true);

    // Threshold raised by a hundredth: the same candidate no longer reaches it.
    const below = resolve(
      snapshot('600', '50', { lastDose: twoHoursAgo, settings: settings({ threshold: 20.01 }) }),
    );
    expect(below.kind === 'meal_only_suppressed' && below.overrideFiguresWithheld).toBe(false);
  });
});

describe('§7.4 the informational line for a correction that is NOT suppressed', () => {
  const twoHoursAgo = { injectedHundredths: 600, atMs: NOW - 2 * HOUR };

  it('fires on a negative correction inside the window', () => {
    const outcome = resolve(snapshot('100', '60', { lastDose: twoHoursAgo }));
    expect(outcome.kind).toBe('dose');
    if (outcome.kind !== 'dose') return;
    expect(outcome.advisories).toContain('stacking_negative_applied');
  });

  it('fires on a correction of exactly zero, which is applied in full', () => {
    const outcome = resolve(snapshot('150', '60', { lastDose: twoHoursAgo }));
    expect(outcome.kind).toBe('dose');
    if (outcome.kind !== 'dose') return;
    expect(outcome.advisories).toContain('stacking_negative_applied');
  });

  it('does NOT fire on a positive correction, which is suppressed instead', () => {
    const outcome = resolve(snapshot('151', '60', { lastDose: twoHoursAgo }));
    expect(outcome.kind).toBe('meal_only_suppressed');
    if (outcome.kind !== 'meal_only_suppressed') return;
    expect(outcome.advisories).not.toContain('stacking_negative_applied');
    expect(outcome.advisories).toContain('stacking_suppressed');
  });

  it('fires in the skewed-to-zero case too, which is the same branch', () => {
    const skewed = { injectedHundredths: 600, atMs: NOW + 30 * 60_000 };
    const outcome = resolve(snapshot('100', '60', { lastDose: skewed }));
    expect(outcome.kind).toBe('dose');
    if (outcome.kind !== 'dose') return;
    expect(outcome.advisories).toContain('stacking_negative_applied');
  });

  it('does not fire outside the suppression window', () => {
    const fiveHoursAgo = { injectedHundredths: 600, atMs: NOW - 5 * HOUR };
    const outcome = resolve(snapshot('100', '60', { lastDose: fiveHoursAgo }));
    expect(outcome.kind).toBe('dose');
    if (outcome.kind !== 'dose') return;
    expect(outcome.advisories).not.toContain('stacking_negative_applied');
    expect(outcome.advisories).toContain('stacking_recent_dose');
  });

  it('does not fire when there is no reading at all', () => {
    // §4.6 — with no reading there is no correction to describe as applied.
    const outcome = resolve(snapshot('', '60', { lastDose: twoHoursAgo }));
    expect(outcome.kind).toBe('dose');
    if (outcome.kind !== 'dose') return;
    expect(outcome.advisories).not.toContain('stacking_negative_applied');
  });
});

describe('§10.5 the warning budget', () => {
  it('shows at most two, and puts the rest behind "more"', () => {
    const ranked: Advisory[] = [
      'band_e_full',
      'band_b_caution',
      'stacking_recent_dose',
      'missing_history',
    ];
    const split = splitAdvisoryBudget(ranked);
    expect(split.shown).toEqual(['band_e_full', 'band_b_caution']);
    expect(split.behindMore).toEqual(['stacking_recent_dose', 'missing_history']);
  });

  it('shows everything when there is nothing to hide', () => {
    expect(splitAdvisoryBudget(['band_e_full'])).toEqual({
      shown: ['band_e_full'],
      behindMore: [],
    });
    expect(splitAdvisoryBudget([])).toEqual({ shown: [], behindMore: [] });
  });

  it('ranks band E above band B, because only band E can indicate an emergency', () => {
    // v2's ordering could hide it behind "more". §10.5 promotes it to rank 2 and
    // says it must never sit behind a disclosure.
    expect(ADVISORY_RANK.indexOf('band_e_full')).toBeLessThan(
      ADVISORY_RANK.indexOf('band_b_caution'),
    );
    expect(ADVISORY_RANK.indexOf('band_e_compact')).toBeLessThan(
      ADVISORY_RANK.indexOf('band_b_caution'),
    );
  });

  it('ranks every advisory exactly once, so a new one cannot arrive unranked', () => {
    expect(new Set(ADVISORY_RANK).size).toBe(ADVISORY_RANK.length);
  });

  it('returns the advisories in rank order regardless of the order found', () => {
    // Four qualify at once: band B (3), the 4-12 hour line (6) and the
    // invalid-time line (9). The resolver collects them in its own order and
    // ranks afterwards.
    const outcome = resolve(
      snapshot('100', '60', {
        lastDose: { injectedHundredths: 600, atMs: NOW - 5 * HOUR },
        historyProvenance: 'suspect',
        excludedTimeRecords: 2,
      }),
    );
    expect(outcome.kind).toBe('dose');
    if (outcome.kind !== 'dose') return;
    const positions = outcome.advisories.map((a) => ADVISORY_RANK.indexOf(a));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe('§3.3 a blocked low carries no insulin quantity and no timing', () => {
  it('and its errors travel with it rather than replacing it', () => {
    const outcome = resolve(snapshot('19', '20g'));
    expect(outcome.kind).toBe('blocked_low');
    if (outcome.kind !== 'blocked_low') return;
    expect(outcome.bands).toEqual(['D']);
    expect(outcome.alsoInvalid).toEqual([
      { field: 'bloodSugar', reason: 'below_range' },
      { field: 'carbs', reason: 'not_a_number' },
    ]);
  });
});
