import { describe, expect, it } from 'vitest';
import {
  deriveCarbBaseline,
  eligibleCarbEntries,
  evaluateCarbAdvisory,
  median,
} from '../src/core/baseline.js';
import type { Injection, LogRow, Tombstone } from '../src/core/types.js';

let nextId = 0;
function injection(overrides: Partial<Injection> = {}): Injection {
  nextId += 1;
  return {
    id: `row-${nextId.toString()}`,
    timestamp: 1_757_000_000_000 + nextId * 1000,
    bloodSugar: 200,
    carbs: 150,
    units: 1100,
    injectedUnits: 1100,
    settingsRevision: 1,
    overrodeStacking: false,
    timingAdvice: 'before',
    advisoryFlagged: false,
    ...overrides,
  };
}

function tombstone(id: string): Tombstone {
  return { id, timestamp: 1_757_000_000_000, deleted: true, deletedAtMs: 1_757_000_100_000 };
}

function meals(count: number, carbs: number): LogRow[] {
  return Array.from({ length: count }, () => injection({ carbs }));
}

describe('§6.5 eligibility, which v4 got wrong in a way that INVERTED the feature', () => {
  it('excludes correction-only rows entirely', () => {
    // v4 gated on ">= 10 entries carrying carbohydrates" and computed the
    // median over "the last 30 entries" — two different populations. After a
    // correction-heavy stretch the median drifts toward zero, the LOW trigger
    // becomes unreachable, and HIGH starts firing on every genuine meal.
    const rows = [...meals(10, 150), ...meals(20, 0)];
    expect(eligibleCarbEntries(rows)).toHaveLength(10);
    expect(deriveCarbBaseline(rows).carbBaseline).toBe(150);
  });

  it('excludes flagged rows, so the advisory cannot poison its own baseline', () => {
    const rows = [...meals(10, 150), ...Array.from({ length: 5 }, () =>
      injection({ carbs: 20, advisoryFlagged: true }),
    )];
    expect(deriveCarbBaseline(rows).carbBaseline).toBe(150);
  });

  it('excludes rows where the stacking override was used', () => {
    const rows = [...meals(10, 150), ...Array.from({ length: 5 }, () =>
      injection({ carbs: 20, overrodeStacking: true }),
    )];
    expect(deriveCarbBaseline(rows).carbBaseline).toBe(150);
  });

  it('§7.3 — excludes tombstones, because a deletion must not change a dose', () => {
    const rows: LogRow[] = [...meals(10, 150), tombstone('gone-1'), tombstone('gone-2')];
    expect(eligibleCarbEntries(rows)).toHaveLength(10);
  });

  it('applies the window AFTER the exclusions, not before', () => {
    // 40 correction-only rows then 12 meals: a window taken first would see
    // only correction-only rows and find nothing eligible.
    const rows = [...meals(40, 0), ...meals(12, 100)];
    expect(eligibleCarbEntries(rows)).toHaveLength(12);
    expect(deriveCarbBaseline(rows).eligibleEntryCount).toBe(12);
  });

  it('keeps only the most recent thirty eligible rows', () => {
    const older = Array.from({ length: 30 }, () => injection({ carbs: 40 }));
    const newer = Array.from({ length: 30 }, () => injection({ carbs: 200 }));
    const values = eligibleCarbEntries([...older, ...newer]);
    expect(values).toHaveLength(30);
    expect(values.every((v) => v === 200)).toBe(true);
  });

  it('orders by timestamp rather than by array position', () => {
    const filler = meals(29, 100);
    const newest = Math.max(...filler.map((row) => row.timestamp));
    const early = injection({ carbs: 40, timestamp: newest + 1000 });
    const late = injection({ carbs: 200, timestamp: newest + 2000 });
    // Handed to it newest-first, which is how a store keyed on an index would
    // hand them over.
    const values = eligibleCarbEntries([late, early, ...filler]);
    expect(values.at(-1)).toBe(200);
    expect(values.at(-2)).toBe(40);
  });

  it('disables the advisory below ten eligible rows', () => {
    const nine = deriveCarbBaseline(meals(9, 150));
    expect(nine.carbBaseline).toBeNull();
    expect(nine.eligibleEntryCount).toBe(9);
    expect(deriveCarbBaseline(meals(10, 150)).carbBaseline).toBe(150);
  });
});

describe('median, chosen because max is the most poisoning-sensitive statistic', () => {
  it('handles odd and even counts', () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([5])).toBe(5);
    expect(median([])).toBeNull();
  });

  it('does not reorder the array it is given', () => {
    // The eligible list is derived once per snapshot and read by more than one
    // consumer, so sorting in place would reorder history under whoever holds it.
    const values = [30, 10, 20];
    expect(median(values)).toBe(20);
    expect(values).toEqual([30, 10, 20]);
  });

  it('sorts numerically, not lexically', () => {
    // [10, 9, 100].sort() gives [10, 100, 9] and a median of 100.
    expect([10, 9, 100].sort().join()).toBe('10,100,9');
    expect(median([10, 9, 100])).toBe(10);
  });

  it('does not move when one wild value is added — the anti-poisoning property', () => {
    const routine = [140, 145, 150, 150, 155, 160, 160, 165, 170, 175];
    const withError = [...routine, 300];
    expect(median(routine)).toBe(157.5);
    expect(median(withError)).toBe(160);
    // The max, by contrast, nearly doubles.
    expect(Math.max(...routine)).toBe(175);
    expect(Math.max(...withError)).toBe(300);
  });
});

describe('§6.5 the triggers, and the unreachability guard', () => {
  it('the LOW trigger fires below a quarter of the baseline', () => {
    expect(evaluateCarbAdvisory(20, 150, 24).advisory).toBe('low');
    expect(evaluateCarbAdvisory(37.49, 150, 24).advisory).toBe('low');
    expect(evaluateCarbAdvisory(37.5, 150, 24).advisory).toBeNull();
  });

  it('and it is the only mechanism in the app that looks DOWNWARD', () => {
    // Type 20 for a 200 g plate: 2 units instead of 20. Eighteen units
    // missing, roughly 540 mg/dL of untreated trend, toward ketoacidosis.
    expect(20 / 10).toBe(2);
    expect(200 / 10).toBe(20);
    expect((20 - 2) * 30).toBe(540);
    expect(evaluateCarbAdvisory(20, 200, 24).advisory).toBe('low');
  });

  it('§4.3 step 11a — zero carbohydrates never fire it', () => {
    // 0 < baseline/4 is ALWAYS true, so without this the sole under-dose
    // defence would fire on every correction-only dose and be dead before the
    // one 200 -> 20 firing that matters.
    expect(0 < 150 / 4).toBe(true);
    expect(evaluateCarbAdvisory(0, 150, 24).advisory).toBeNull();
  });

  it('the HIGH trigger fires above three times the baseline when it can', () => {
    const fired = evaluateCarbAdvisory(151, 50, 24);
    expect(fired.advisory).toBe('high');
    expect(fired.enabled).toBe(true);
    expect(fired.highTriggerAvailable).toBe(true);
    expect(evaluateCarbAdvisory(150, 50, 24).advisory).toBeNull();
    expect(evaluateCarbAdvisory(149, 50, 24).advisory).toBeNull();
  });

  it('is DISABLED AND DECLARED when three times the baseline exceeds the cap', () => {
    // v3's dose trigger sat at 52 units while the bound capped every dose at
    // 45: dead code that looked like a safety feature. Every trigger is now
    // checked against its own attainable range.
    const big = evaluateCarbAdvisory(299, 150, 24);
    expect(big.highTriggerAvailable).toBe(false);
    expect(big.advisory).toBeNull();
    expect(big.enabled).toBe(true);

    const small = evaluateCarbAdvisory(60, 50, 24);
    expect(small.highTriggerAvailable).toBe(true);
  });

  it('is exact at the boundary where HIGH becomes unreachable', () => {
    // 3 x 99.99 = 299.97, below the 300 g cap, so it is live.
    expect(evaluateCarbAdvisory(300, 99.99, 24).highTriggerAvailable).toBe(true);
    // 3 x 100 = 300, which is not BELOW the cap.
    expect(evaluateCarbAdvisory(300, 100, 24).highTriggerAvailable).toBe(false);
  });

  it('reports the trigger available even when nothing fires', () => {
    // `highTriggerAvailable` is a STATUS, not a consequence of this meal: §6.5
    // renders it as a settings line reading "upper check off". It stays true on
    // an ordinary meal that trips neither trigger.
    const ordinary = evaluateCarbAdvisory(60, 50, 24);
    expect(ordinary.advisory).toBeNull();
    expect(ordinary.highTriggerAvailable).toBe(true);
    expect(ordinary.enabled).toBe(true);
  });

  it('reports it available alongside a LOW firing, not only alongside a HIGH one', () => {
    const low = evaluateCarbAdvisory(1, 50, 24);
    expect(low.advisory).toBe('low');
    expect(low.highTriggerAvailable).toBe(true);
    expect(low.enabled).toBe(true);
  });

  it('reports it available alongside a zero-carbohydrate dose', () => {
    const zero = evaluateCarbAdvisory(0, 50, 24);
    expect(zero.advisory).toBeNull();
    expect(zero.highTriggerAvailable).toBe(true);
    expect(zero.enabled).toBe(true);
  });

  it('reports itself disabled when no baseline exists', () => {
    const none = evaluateCarbAdvisory(20, null, 8);
    expect(none.enabled).toBe(false);
    expect(none.advisory).toBeNull();
    expect(none.highTriggerAvailable).toBe(false);
  });

  it('stays disabled with a null baseline even when the COUNT is plenty', () => {
    // The two halves of the gate are independent. A null baseline treated as a
    // number is zero, which makes every meal "more than three times it" — the
    // advisory would fire HIGH on every meal he eats.
    const none = evaluateCarbAdvisory(20, null, 24);
    expect(none.enabled).toBe(false);
    expect(none.advisory).toBeNull();
    expect(none.highTriggerAvailable).toBe(false);
  });

  it('is disabled when the count is short even if a baseline was passed in', () => {
    expect(evaluateCarbAdvisory(20, 150, 9).enabled).toBe(false);
    expect(evaluateCarbAdvisory(20, 150, 10).enabled).toBe(true);
  });
});
