import { describe, expect, it } from 'vitest';
import { gramsFor, tallyGrams } from '../src/core/portion.js';
import type { Portioned } from '../src/core/portion.js';

/**
 * §13.4's gate reaches this file, so the cases below are written to kill
 * specific mutants rather than to read well. Where a case exists only for a
 * mutant, it says which one.
 *
 * Rows are stated here rather than imported from `src/data`. A case that reads
 * the shipped table still passes when the table changes, which makes it prove
 * nothing about the arithmetic — and the arithmetic is what this file is for.
 */
const ROTI: Portioned = { id: 'roti', grams: 18 };
const RICE: Portioned = { id: 'rice', grams: 45 };
const NONE = { foods: {} };

describe('gramsFor — whose figure a row is showing', () => {
  it('uses the table when the reader has measured nothing', () => {
    expect(gramsFor(ROTI, NONE)).toEqual({ grams: 18, from: 'table' });
  });

  it("uses the reader's own figure when they have one", () => {
    // Phase 2's ruling: calibrating a food must change the DOSE and not only
    // the row, or it is the worse half of both features.
    const own = { foods: { roti: { grams: 28 } } };
    expect(gramsFor(ROTI, own)).toEqual({ grams: 28, from: 'own' });
  });

  it('reads only its own id, not another row that happens to be calibrated', () => {
    // Kills a mutant that ignores the key and takes whatever is in the map.
    const own = { foods: { rice: { grams: 70 } } };
    expect(gramsFor(ROTI, own)).toEqual({ grams: 18, from: 'table' });
  });

  it('honours an own figure of zero rather than falling through to the table', () => {
    // `?? ` versus `||` — a zero is a real measurement. Someone who weighs a
    // free food at 0 g must not silently get the table's number instead.
    const own = { foods: { roti: { grams: 0 } } };
    expect(gramsFor(ROTI, own)).toEqual({ grams: 0, from: 'own' });
  });
});

describe('tallyGrams — what a counted plate comes to', () => {
  it('multiplies by the count and sums across rows', () => {
    // Two distinct counts and two distinct grams, so a mutant swapping
    // multiply for add, or count for grams, cannot survive.
    expect(tallyGrams([ROTI, RICE], { roti: 2, rice: 1 }, NONE)).toBe(81);
  });

  it('counts nothing for a row that is not in the tally', () => {
    expect(tallyGrams([ROTI, RICE], { rice: 1 }, NONE)).toBe(45);
  });

  it('is zero for an empty tally', () => {
    expect(tallyGrams([ROTI, RICE], {}, NONE)).toBe(0);
  });

  it("builds the total from the reader's own figures", () => {
    const own = { foods: { roti: { grams: 28 } } };
    expect(tallyGrams([ROTI, RICE], { roti: 2, rice: 1 }, own)).toBe(101);
  });

  it('rounds once at the end, not once per row', () => {
    // Three rows of 0.5 g: rounding each first gives 3, rounding the sum
    // gives 2 (1.5 to even) — the two disagree, which is the point. §5.3.
    const half: Portioned[] = [
      { id: 'a', grams: 0.5 },
      { id: 'b', grams: 0.5 },
      { id: 'c', grams: 0.5 },
    ];
    expect(tallyGrams(half, { a: 1, b: 1, c: 1 }, NONE)).toBe(2);
  });

  it('rounds rather than truncating or ceiling', () => {
    // Two totals on either side of .5, because a single .5 case cannot tell
    // round from ceil, and a single .4 case cannot tell round from floor.
    expect(tallyGrams([{ id: 'a', grams: 10.4 }], { a: 1 }, NONE)).toBe(10);
    expect(tallyGrams([{ id: 'a', grams: 10.6 }], { a: 1 }, NONE)).toBe(11);
  });

  it('counts a row twice when the tally says two', () => {
    // Kills a mutant that ignores the count and adds grams once.
    expect(tallyGrams([ROTI], { roti: 2 }, NONE)).toBe(36);
  });
});
