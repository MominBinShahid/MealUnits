import { describe, expect, it } from 'vitest';
import {
  classifyElapsed,
  decideStacking,
  elapsedHours,
  isUsableRecord,
  needsInvalidTimeLine,
  needsMissingHistoryCaveat,
} from '../src/core/stacking.js';
import type { LastDose } from '../src/core/types.js';

const NOW = 1_757_000_000_000;
const HOUR = 3_600_000;
const dose = (hoursAgo: number, units = 6): LastDose => ({
  injectedHundredths: units * 100,
  atMs: NOW - hoursAgo * HOUR,
});

describe('§7.6 the elapsed cases, and every boundary between them', () => {
  it('classifies the four windows', () => {
    expect(classifyElapsed(dose(0), NOW)).toBe('within_suppress_window');
    expect(classifyElapsed(dose(3.99), NOW)).toBe('within_suppress_window');
    expect(classifyElapsed(dose(4), NOW)).toBe('within_advise_window');
    expect(classifyElapsed(dose(12), NOW)).toBe('within_advise_window');
    expect(classifyElapsed(dose(12.001), NOW)).toBe('too_old');
    expect(classifyElapsed(null, NOW)).toBe('no_record');
  });

  it('is exact at four hours to the millisecond', () => {
    expect(classifyElapsed({ injectedHundredths: 600, atMs: NOW - 4 * HOUR + 1 }, NOW)).toBe(
      'within_suppress_window',
    );
    expect(classifyElapsed({ injectedHundredths: 600, atMs: NOW - 4 * HOUR }, NOW)).toBe(
      'within_advise_window',
    );
  });

  it('is exact at twelve hours to the millisecond', () => {
    expect(classifyElapsed({ injectedHundredths: 600, atMs: NOW - 12 * HOUR }, NOW)).toBe(
      'within_advise_window',
    );
    expect(classifyElapsed({ injectedHundredths: 600, atMs: NOW - 12 * HOUR - 1 }, NOW)).toBe(
      'too_old',
    );
  });

  it('treats a small forward skew as elapsed zero — the SAFE direction', () => {
    // §7.6's traced failure: he injects 6 units with the clock an hour fast,
    // the clock corrects, and the row is future-dated. Excluding it lets a
    // correction be applied over ~6 units still on board. So it suppresses.
    expect(classifyElapsed(dose(-0.5), NOW)).toBe('skewed_to_zero');
    expect(classifyElapsed(dose(-1), NOW)).toBe('skewed_to_zero');
    expect(isUsableRecord('skewed_to_zero')).toBe(true);
  });

  it('excludes an implausibly future-dated row, and never silently', () => {
    expect(classifyElapsed(dose(-1.001), NOW)).toBe('excluded_future');
    expect(classifyElapsed(dose(-48), NOW)).toBe('excluded_future');
    expect(isUsableRecord('excluded_future')).toBe(false);
  });

  it('excludes a non-finite timestamp the same way', () => {
    expect(classifyElapsed({ injectedHundredths: 600, atMs: Number.NaN }, NOW)).toBe(
      'excluded_future',
    );
    expect(classifyElapsed(dose(2), Number.NaN)).toBe('excluded_future');
  });

  it('knows which cases give the gate something to reason from', () => {
    expect(isUsableRecord('within_suppress_window')).toBe(true);
    expect(isUsableRecord('within_advise_window')).toBe(true);
    expect(isUsableRecord('too_old')).toBe(false);
    expect(isUsableRecord('no_record')).toBe(false);
  });
});

describe('§7.4 the corrected suppression rule', () => {
  it('suppresses a positive correction inside the window', () => {
    const decision = decideStacking(dose(2), NOW, 6, 30, false);
    expect(decision.suppressPositiveCorrection).toBe(true);
    expect(decision.overrideAvailable).toBe(true);
  });

  it('NEVER suppresses a negative correction — the round-2 critical', () => {
    const decision = decideStacking(dose(2), NOW, -1.6666666666666667, 30, false);
    expect(decision.suppressPositiveCorrection).toBe(false);
    // And no override is offered, because nothing is being held back.
    expect(decision.overrideAvailable).toBe(false);
  });

  it('does not suppress a correction of exactly zero', () => {
    expect(decideStacking(dose(2), NOW, 0, 30, false).suppressPositiveCorrection).toBe(false);
  });

  it('does not suppress outside the window', () => {
    expect(decideStacking(dose(5), NOW, 6, 30, false).suppressPositiveCorrection).toBe(false);
    expect(decideStacking(dose(20), NOW, 6, 30, false).suppressPositiveCorrection).toBe(false);
    expect(decideStacking(null, NOW, 6, 30, false).suppressPositiveCorrection).toBe(false);
  });

  it('the override cancels suppression entirely', () => {
    const decision = decideStacking(dose(2), NOW, 6, 30, true);
    expect(decision.suppressPositiveCorrection).toBe(false);
    expect(decision.overrideAvailable).toBe(false);
  });
});

describe('§7.4.1 the ceiling is injected units x sensitivity', () => {
  it('gives 180 mg/dL for 6 units at a sensitivity of 30', () => {
    expect(decideStacking(dose(2, 6), NOW, 6, 30, false).ceilingMgDl).toBe(180);
  });

  it('reads the INJECTED amount, so 25 units gives 750', () => {
    // §11.2, blocking in round 9: a test author who pinned the CALCULATED
    // figure would have pinned the wrong gate input.
    expect(decideStacking(dose(2, 25), NOW, 6, 30, false).ceilingMgDl).toBe(750);
  });

  it('scales with the sensitivity', () => {
    expect(decideStacking(dose(2, 6), NOW, 6, 50, false).ceilingMgDl).toBe(300);
    expect(decideStacking(dose(2, 6), NOW, 6, 5, false).ceilingMgDl).toBe(30);
  });

  it('handles a half-unit injected amount without a float artifact', () => {
    expect(decideStacking(dose(2, 6.5), NOW, 6, 30, false).ceilingMgDl).toBe(195);
  });

  it('is absent outside the window, where there is nothing to state', () => {
    expect(decideStacking(dose(5), NOW, 6, 30, false).ceilingMgDl).toBeNull();
    expect(decideStacking(null, NOW, 6, 30, false).ceilingMgDl).toBeNull();
  });
});

describe('§7.5 and §7.6 — the two lines, and the collision between them', () => {
  it('§7.5 needs BOTH no usable record AND suspect provenance', () => {
    // v4 dropped the provenance half and fired on "older than 12 hours, or
    // absent", which made the caveat appear after every overnight gap.
    expect(needsMissingHistoryCaveat('no_record', 'suspect')).toBe(true);
    expect(needsMissingHistoryCaveat('too_old', 'suspect')).toBe(true);
    expect(needsMissingHistoryCaveat('excluded_future', 'suspect')).toBe(true);
    expect(needsMissingHistoryCaveat('no_record', 'trusted')).toBe(false);
    expect(needsMissingHistoryCaveat('too_old', 'trusted')).toBe(false);
    expect(needsMissingHistoryCaveat('within_advise_window', 'suspect')).toBe(false);
  });

  it('§7.6 shows the invalid-time line only when a usable record also exists', () => {
    expect(needsInvalidTimeLine('within_advise_window', 1)).toBe(true);
    expect(needsInvalidTimeLine('within_suppress_window', 3)).toBe(true);
    expect(needsInvalidTimeLine('within_advise_window', 0)).toBe(false);
    expect(needsInvalidTimeLine('no_record', 1)).toBe(false);
  });

  it('and the two lines are never shown together', () => {
    // v5 said an excluded row "triggers §7.5's caveat", which would display
    // "Last dose, 5 hours ago" and "No recent dose recorded" simultaneously.
    for (const elapsed of [
      'within_suppress_window',
      'within_advise_window',
      'skewed_to_zero',
      'too_old',
      'excluded_future',
      'no_record',
    ] as const) {
      const both =
        needsMissingHistoryCaveat(elapsed, 'suspect') && needsInvalidTimeLine(elapsed, 1);
      expect(both, elapsed).toBe(false);
    }
  });
});

describe('elapsed hours, for §7.4 informational copy', () => {
  it('rounds to the nearest whole hour, half away from zero', () => {
    expect(elapsedHours(dose(5), NOW)).toBe(5);
    expect(elapsedHours(dose(5.4), NOW)).toBe(5);
    expect(elapsedHours(dose(5.5), NOW)).toBe(6);
    expect(elapsedHours(dose(0), NOW)).toBe(0);
  });
});
