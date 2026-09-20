/**
 * §8.5 — the insulin, the two clocks, and the switch day.
 *
 * The module this covers exists because the app rendered ONE insulin's timing
 * to everyone. Two things follow from that and both are asserted here: an
 * unknown insulin must produce no wait at all rather than a default one, and
 * the stacking gate must belong to the insulin ON BOARD rather than to the one
 * selected since.
 */

import { describe, expect, it } from 'vitest';
import {
  classEatDelay,
  classOf,
  eatDelayFor,
  effectiveWindows,
  exitKindFor,
  insulinGate,
  longerOf,
  isMealtimeClass,
  MEALTIME_CLASSES,
  UNANSWERED_INSULIN,
  UNKNOWN_INSULIN,
  windowsFor,
} from '../src/core/insulin.js';
import type { Classified, InsulinClass } from '../src/core/insulin.js';
import { DELETE_CONFIRM_WINDOW_HOURS, INSULIN_TIMING, MS_PER_HOUR } from '../src/config.js';
import { INSULINS } from '../src/data/insulins.js';

/**
 * Two rows, not twenty. The lookups take their table as a parameter for this
 * reason — the same reason `foods.ts` does — so these cases cannot go green or
 * red because the shipped list grew.
 */
const TABLE: readonly Classified[] = [
  { id: 'fast', insulinClass: 'rapid' },
  { id: 'slow', insulinClass: 'regular' },
  { id: 'mixed', insulinClass: 'premix' },
];

describe('§8.5 the stored answer has three shapes, and they are not two', () => {
  it('tells "never asked" from "asked, and I do not know"', () => {
    // §4.1's rule about not collapsing states, applied to a string. Both have
    // no class; only one of them makes the app ask.
    expect(classOf(TABLE, UNANSWERED_INSULIN)).toBeNull();
    expect(classOf(TABLE, UNKNOWN_INSULIN)).toBeNull();
    expect(insulinGate(TABLE, UNANSWERED_INSULIN)).toBe('ask');
    expect(insulinGate(TABLE, UNKNOWN_INSULIN)).toBe('ok');
  });

  it('routes an insulin this calculator cannot fit to the exit', () => {
    expect(insulinGate(TABLE, 'mixed')).toBe('unsupported');
    expect(insulinGate(TABLE, 'fast')).toBe('ok');
  });

  it('does not re-ask because the app forgot the row', () => {
    // An id retired from the table years later degrades to "not recorded". It
    // must NOT reopen a required question the reader has already answered —
    // that reads as the app losing their settings.
    expect(insulinGate(TABLE, 'retired-brand')).toBe('ok');
    expect(classOf(TABLE, 'retired-brand')).toBeNull();
  });

  it('every shipped row resolves, and every mealtime row is timeable', () => {
    for (const insulin of INSULINS) {
      expect(classOf(INSULINS, insulin.id), insulin.id).toBe(insulin.insulinClass);
      const gate = insulinGate(INSULINS, insulin.id);
      expect(gate, insulin.id).toBe(isMealtimeClass(insulin.insulinClass) ? 'ok' : 'unsupported');
    }
  });

  it('gives every shipped id its own row, because the id is what is STORED', () => {
    // A duplicate id makes a stored answer ambiguous and silently reclassifies
    // somebody's history on the day the second row is added.
    const ids = INSULINS.map((insulin) => insulin.id);
    expect(new Set(ids).size).toBe(ids.length);
    // And nothing may take a sentinel's name.
    expect(ids).not.toContain(UNKNOWN_INSULIN);
    expect(ids).not.toContain(UNANSWERED_INSULIN);
  });

  /**
   * The distinction that stops a basal-bolus reader being told the app does not
   * fit them. Premix is the only genuine dead end; every background insulin is
   * a reader one tap from the right answer.
   */
  it('§8.5 — tells a dead end from a wrong turn', () => {
    expect(exitKindFor('premix')).toBe('dead_end');
    // NPH is here rather than with premix, and that was the correction: ISPAD's
    // limited-resource chapter recommends NPH twice daily PLUS regular insulin
    // before meals, and that reader has a real carbohydrate ratio for the
    // regular insulin. Refusing on "NPH" would block them.
    expect(exitKindFor('intermediate')).toBe('wrong_turn');
    expect(exitKindFor('long')).toBe('wrong_turn');
  });

  it('§8.5 — and every class that is not a dead end is a wrong turn', () => {
    // Stated as a property rather than three literals, so a class added to the
    // table cannot quietly default to the wrong screen.
    const classes = ['regular', 'rapid', 'ultra_rapid', 'premix', 'intermediate', 'long'] as const;
    for (const insulinClass of classes) {
      const expected = insulinClass === 'premix' ? 'dead_end' : 'wrong_turn';
      expect(exitKindFor(insulinClass), insulinClass).toBe(expected);
    }
  });

  it('names at least one insulin the app cannot calculate for, on purpose', () => {
    // Leaving premix out does not protect a premix reader; it sends them to
    // the nearest-looking name. This is the assertion that stops a later tidy-up
    // "simplifying" the list down to the ones that work.
    const exits = INSULINS.filter((insulin) => !isMealtimeClass(insulin.insulinClass));
    expect(exits.length).toBeGreaterThan(0);
    for (const insulinClass of ['premix', 'intermediate', 'long'] as const) {
      expect(
        exits.some((insulin) => insulin.insulinClass === insulinClass),
        insulinClass,
      ).toBe(true);
    }
  });
});

describe('§8.1 the wait before eating', () => {
  it('says NOTHING when the insulin is unknown, rather than saying Humulin R', () => {
    // The defect this whole entry exists to remove. A default here is not a
    // conservative choice: for the reader on a rapid analogue it is twenty
    // minutes of insulin acting before the food arrives.
    expect(eatDelayFor(null, null)).toBeNull();
    expect(classEatDelay(null)).toBeNull();
    // And an insulin the app cannot calculate for has no wait either.
    expect(eatDelayFor('premix', null)).toBeNull();
  });

  it('otherwise gives the class range, which is the guideline or the label', () => {
    // Without this the whole `eatDelayFor` body could return null and every
    // other case here would still pass — the reader would be told nothing
    // about when to eat, for every insulin, silently.
    for (const insulinClass of MEALTIME_CLASSES) {
      expect(eatDelayFor(insulinClass, null), insulinClass).toEqual(
        INSULIN_TIMING[insulinClass].eatDelayMinutes,
      );
    }
    // The two figures a reader acts on, pinned as literals so that moving
    // either one has to be deliberate. Both are ISPAD 2024 chapter 9's, and the
    // rapid one is its grade [A] recommendation — see `INSULIN_TIMING`, which
    // records why this row was 5-10 for a few hours on 2026-09-20 and why that
    // derivation was wrong.
    expect(eatDelayFor('regular', null)).toEqual([20, 30]);
    expect(eatDelayFor('rapid', null)).toEqual([10, 15]);
  });

  it("uses the reader's own prescriber's number when they have given one", () => {
    // A single minute, because that is the shape of a doctor's answer. It
    // REPLACES the class range rather than narrowing it.
    expect(eatDelayFor('regular', 15)).toEqual([15, 15]);
    expect(eatDelayFor('rapid', 15)).toEqual([15, 15]);
  });

  it('and zero is a value, not an absence', () => {
    // §4.1 again. An ultra-rapid analogue is labelled for injection at the
    // start of the meal, so a `value || fallback` here would silently restore
    // a wait the label does not have.
    expect(eatDelayFor('ultra_rapid', 0)).toEqual([0, 0]);
    expect(eatDelayFor(null, 0)).toEqual([0, 0]);
  });

  it('gives a class range that is inside what the class permits', () => {
    for (const insulinClass of MEALTIME_CLASSES) {
      const delay = classEatDelay(insulinClass);
      expect(delay, insulinClass).not.toBeNull();
      const [lo, hi] = delay ?? [0, 0];
      expect(lo, insulinClass).toBeGreaterThanOrEqual(0);
      expect(hi, insulinClass).toBeGreaterThanOrEqual(lo);
    }
  });

  it('waits LONGER for regular insulin than for a rapid analogue', () => {
    // The one clinical relationship in the table that must never invert. If
    // this flips, a rapid-analogue reader is told to wait longer than a regular
    // insulin reader, which is the exact failure mode §8.5 was opened for.
    const [, regular] = INSULIN_TIMING.regular.eatDelayMinutes;
    const [, rapid] = INSULIN_TIMING.rapid.eatDelayMinutes;
    const [, ultra] = INSULIN_TIMING.ultra_rapid.eatDelayMinutes;
    expect(regular).toBeGreaterThan(rapid);
    expect(rapid).toBeGreaterThan(ultra);
  });
});

describe('§7.4 the stacking windows, and §8.5s switch day', () => {
  const hours = (windows: { suppressMs: number; adviseMs: number }): [number, number] => [
    windows.suppressMs / MS_PER_HOUR,
    windows.adviseMs / MS_PER_HOUR,
  ];

  it('gives an unknown insulin the LONGEST windows in the table', () => {
    // Deliberately the conservative direction: a longer window suppresses more
    // corrections, which runs high, and §2.1 calls high the tolerable one.
    const longest: [number, number] = [
      Math.max(...Object.values(INSULIN_TIMING).map((row) => row.stackSuppressHours)),
      Math.max(...Object.values(INSULIN_TIMING).map((row) => row.stackAdviseHours)),
    ];
    expect(hours(windowsFor(null))).toEqual(longest);
    expect(hours(windowsFor('premix'))).toEqual(longest);
  });

  it('uses the LONGER of the two after a switch, in both orders', () => {
    // The rule, tested against a table where the classes DIFFER — which the
    // shipped one does not, because CLINICAL.md question 10c is unanswered. The
    // mechanism has to be provably right before the values move, which is the
    // whole of why it was built now rather than retrofitted then.
    const pairs: readonly (readonly [InsulinClass | null, InsulinClass | null])[] = [
      ['rapid', 'regular'],
      ['regular', 'rapid'],
    ];
    for (const [current, last] of pairs) {
      const both = effectiveWindows(current, last);
      const now = windowsFor(current);
      const then = windowsFor(last);
      expect(both.suppressMs).toBe(Math.max(now.suppressMs, then.suppressMs));
      expect(both.adviseMs).toBe(Math.max(now.adviseMs, then.adviseMs));
      // Never shorter than either one alone. That is the safety claim, said
      // as a property rather than as a number, so it survives the day
      // question 10c moves the table.
      expect(both.suppressMs).toBeGreaterThanOrEqual(now.suppressMs);
      expect(both.suppressMs).toBeGreaterThanOrEqual(then.suppressMs);
      expect(both.adviseMs).toBeGreaterThanOrEqual(now.adviseMs);
      expect(both.adviseMs).toBeGreaterThanOrEqual(then.adviseMs);
    }
  });

  it('and an unknown PREVIOUS insulin cannot shrink the window either', () => {
    // A dose stamped with a revision whose insulin was never recorded. The gate
    // falls back to the longest windows rather than to the current selection,
    // because "we do not know what is in them" is not "there is nothing in them"
    // — §7.5's doctrine, applied to a clock.
    const withUnknownPast = effectiveWindows('ultra_rapid', null);
    expect(withUnknownPast.suppressMs).toBeGreaterThanOrEqual(
      windowsFor('ultra_rapid').suppressMs,
    );
    expect(hours(withUnknownPast)).toEqual(hours(windowsFor(null)));
  });

  /**
   * The RULE, over windows that actually differ.
   *
   * `effectiveWindows` cannot test it: every row in `INSULIN_TIMING` declares
   * the same pair today, so through the classes "the longer of the two" and
   * "the shorter of the two" are the same function. This is the one thing here
   * that must never be wrong — a shorter window releases a correction onto
   * insulin that is still acting — so it gets a case that can fail.
   */
  it('takes the LONGER end of each window, not the shorter', () => {
    const shortOne = { suppressMs: 2 * MS_PER_HOUR, adviseMs: 6 * MS_PER_HOUR };
    const longOne = { suppressMs: 4 * MS_PER_HOUR, adviseMs: 12 * MS_PER_HOUR };
    expect(longerOf(shortOne, longOne)).toEqual(longOne);
    expect(longerOf(longOne, shortOne)).toEqual(longOne);
    // And each end is taken independently, so a pair that is longer on one
    // end and shorter on the other cannot smuggle the short end through.
    expect(
      longerOf(
        { suppressMs: 4 * MS_PER_HOUR, adviseMs: 6 * MS_PER_HOUR },
        { suppressMs: 2 * MS_PER_HOUR, adviseMs: 12 * MS_PER_HOUR },
      ),
    ).toEqual(longOne);
  });

  it('is a no-op when nothing changed', () => {
    for (const insulinClass of MEALTIME_CLASSES) {
      expect(effectiveWindows(insulinClass, insulinClass)).toEqual(windowsFor(insulinClass));
    }
  });
});

describe('§8.5 the shipped table, stated rather than assumed', () => {
  it('holds every SUPPRESSION window at the same value, which is the gate', () => {
    // A HOLD, and the assertion records it so that changing it is a deliberate
    // act with a test to update rather than a quiet data edit. Shortening this
    // one is the dose-RAISING direction: research on 2026-09-20 found no
    // citable basis below 4 hours and a published argument against 3.
    for (const row of Object.values(INSULIN_TIMING)) {
      expect(row.stackSuppressHours).toBe(INSULIN_TIMING.regular.stackSuppressHours);
    }
  });

  it('but lets the ADVISE window differ, because that one is only a sentence', () => {
    // No dose changes at this boundary — only whether "your last dose may still
    // be acting" appears — so §7.4's "erring long is free" applies. Regular
    // human insulin gets its own label's 18 hours; the analogues stay at 12,
    // which already carries a wide margin over their 5-7.
    expect(INSULIN_TIMING.regular.stackAdviseHours).toBe(18);
    expect(INSULIN_TIMING.rapid.stackAdviseHours).toBe(12);
    expect(INSULIN_TIMING.ultra_rapid.stackAdviseHours).toBe(12);
    // And the relationship that must not invert: the slowest insulin gets the
    // longest window.
    for (const row of Object.values(INSULIN_TIMING)) {
      expect(row.stackAdviseHours).toBeLessThanOrEqual(
        INSULIN_TIMING.regular.stackAdviseHours,
      );
    }
  });

  it('§7.3 — the delete window outlives every class, not just the current one', () => {
    // A tombstone must survive as long as any insulin could still matter to the
    // gate, and the delete rule must not depend on which insulin the reader is
    // on today.
    expect(DELETE_CONFIRM_WINDOW_HOURS).toBe(
      Math.max(...Object.values(INSULIN_TIMING).map((row) => row.stackAdviseHours)),
    );
  });

  it('keeps `MEALTIME_CLASSES` and the table the same list', () => {
    expect([...MEALTIME_CLASSES].sort()).toEqual(Object.keys(INSULIN_TIMING).sort());
    for (const insulinClass of MEALTIME_CLASSES) expect(isMealtimeClass(insulinClass)).toBe(true);
    for (const insulinClass of ['premix', 'intermediate', 'long'] as const) {
      expect(isMealtimeClass(insulinClass), insulinClass).toBe(false);
    }
    expect(isMealtimeClass(null)).toBe(false);
  });
});
