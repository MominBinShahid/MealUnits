/**
 * The list keys T3 introduced, and the invariant each one assumes.
 *
 * JSX lists carry a `key`, and Preact matches nodes across renders by it. Two
 * siblings sharing a key is not a warning here — it is a node reused for the
 * WRONG row, so a list can render stale content beside the wrong label. On the
 * food table that is a carbohydrate figure under another food's name, which is
 * the one failure `foods.tsx` is written to prevent ("a wrong row can mislead
 * someone").
 *
 * The keys are drawn from data rather than from indexes, deliberately: an index
 * key defeats the reconciliation it is meant to drive as soon as the list is
 * filtered, which the food search does on every keystroke. That trade buys
 * correctness on reorder and owes uniqueness, and this file is where the debt
 * is paid.
 *
 * Nothing here asserts what the app renders — the integration suite does that.
 * This asserts only that the keys can do their job, which is a property of the
 * DATA and cannot be seen by a test that renders one screen.
 *
 * Where a key is unique BY CONSTRUCTION it is not listed. `Advisories` keys on
 * `view.kind`, and `resolve.ts`'s `rankAdvisories` is `ADVISORY_RANK.filter(...)`
 * over an array holding each kind once, so duplicates cannot be produced. The
 * history screen keys on row ids from `newId()`. Both are stated here rather
 * than tested, because a test of a constructed guarantee pins the construction
 * and not the guarantee.
 */

import { describe, expect, it } from 'vitest';
import { FOODS } from '../src/data/carbs.js';
import { COPY } from '../src/ui/copy.js';

/** The repeated values, so a failure names the collision rather than a count. */
function duplicates(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, at) => values.indexOf(value) !== at))];
}

describe('every list key the interface uses is unique within its list', () => {
  it('food rows, keyed on the name', () => {
    expect(duplicates(FOODS.map((food) => food.name))).toEqual([]);
  });

  it('rounding modes, keyed on the mode', () => {
    expect(duplicates(COPY.rounding.modes.map((entry) => entry.roundingMode))).toEqual([]);
  });

  // The prose lists are keyed on the paragraph itself: there is no id to key on,
  // and two identical paragraphs in one list would be a copy defect regardless.
  it('the disclaimer body', () => {
    expect(duplicates(COPY.firstRun.disclaimerBody)).toEqual([]);
  });

  it('the audience paragraphs, keyed on the lead sentence', () => {
    expect(duplicates(COPY.explain.audienceBody.map((para) => para.lead))).toEqual([]);
  });

  it('the carbohydrate explanation', () => {
    expect(duplicates(COPY.explain.carbBody)).toEqual([]);
  });

  it('what the app does not know about', () => {
    expect(duplicates(COPY.doesNotKnow.items)).toEqual([]);
  });

  it('the stacking explanation', () => {
    expect(duplicates(COPY.explain.stackingBody)).toEqual([]);
  });

  it('the five missing-history conditions', () => {
    expect(duplicates(COPY.explain.missingConditions)).toEqual([]);
  });

  it('the expiry explanation', () => {
    expect(duplicates(COPY.explain.expiryBody)).toEqual([]);
  });
});
