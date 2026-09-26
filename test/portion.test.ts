import { describe, expect, it } from 'vitest';
import { gramsFor, tallyGrams, vesselRatio } from '../src/core/portion.js';
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
const ROTI: Portioned = { id: 'roti', grams: 18, vessel: null };
const RICE: Portioned = { id: 'rice', grams: 45, vessel: null };
const NONE = { foods: {}, vessels: {} };

describe('gramsFor — whose figure a row is showing', () => {
  it('uses the table when the reader has measured nothing', () => {
    expect(gramsFor(ROTI, NONE)).toEqual({ grams: 18, from: 'table' });
  });

  it("uses the reader's own figure when they have one", () => {
    // Phase 2's ruling: calibrating a food must change the DOSE and not only
    // the row, or it is the worse half of both features.
    const own = { foods: { roti: { grams: 28 } }, vessels: {} };
    expect(gramsFor(ROTI, own)).toEqual({ grams: 28, from: 'own' });
  });

  it('reads only its own id, not another row that happens to be calibrated', () => {
    // Kills a mutant that ignores the key and takes whatever is in the map.
    const own = { foods: { rice: { grams: 70 } }, vessels: {} };
    expect(gramsFor(ROTI, own)).toEqual({ grams: 18, from: 'table' });
  });

  it('honours an own figure of zero rather than falling through to the table', () => {
    // `?? ` versus `||` — a zero is a real measurement. Someone who weighs a
    // free food at 0 g must not silently get the table's number instead.
    const own = { foods: { roti: { grams: 0 } }, vessels: {} };
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
    const own = { foods: { roti: { grams: 28 } }, vessels: {} };
    expect(tallyGrams([ROTI, RICE], { roti: 2, rice: 1 }, own)).toBe(101);
  });

  it('rounds once at the end, not once per row', () => {
    // Three rows of 0.5 g: rounding each first gives 3, rounding the sum
    // gives 2 (1.5 to even) — the two disagree, which is the point. §5.3.
    const half: Portioned[] = [
      { id: 'a', grams: 0.5, vessel: null },
      { id: 'b', grams: 0.5, vessel: null },
      { id: 'c', grams: 0.5, vessel: null },
    ];
    expect(tallyGrams(half, { a: 1, b: 1, c: 1 }, NONE)).toBe(2);
  });

  it('rounds rather than truncating or ceiling', () => {
    // Two totals on either side of .5, because a single .5 case cannot tell
    // round from ceil, and a single .4 case cannot tell round from floor.
    expect(tallyGrams([{ id: 'a', grams: 10.4, vessel: null }], { a: 1 }, NONE)).toBe(10);
    expect(tallyGrams([{ id: 'a', grams: 10.6, vessel: null }], { a: 1 }, NONE)).toBe(11);
  });

  it('counts a row twice when the tally says two', () => {
    // Kills a mutant that ignores the count and adds grams once.
    expect(tallyGrams([ROTI], { roti: 2 }, NONE)).toBe(36);
  });
});

describe('vesselRatio — the tare, the division, and the refusal', () => {
  it('subtracts the empty weight before dividing', () => {
    // 735 on the scale, 285 of it plate: 450 g of food against a 300 g
    // reference is 1.5x. If the subtraction were dropped this would be 2.45.
    expect(vesselRatio({ emptyGrams: 285, fullGrams: 735 }, 300)).toBe(1.5);
  });

  it('returns exactly 1 when the reader matches the table', () => {
    expect(vesselRatio({ emptyGrams: 285, fullGrams: 585 }, 300)).toBe(1);
  });

  it('keeps the ratio unrounded', () => {
    // 445 / 300 = 1.48333...  Storing a displayed 1.5 and feeding it back is
    // the second rounding engine §5.3 forbids.
    expect(vesselRatio({ emptyGrams: 285, fullGrams: 730 }, 300)).toBeCloseTo(1.48333, 5);
  });

  it('accepts a scale that was already zeroed', () => {
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 450 }, 300)).toBe(1.5);
  });

  it('refuses a fill of zero rather than returning a ratio of zero', () => {
    expect(vesselRatio({ emptyGrams: 300, fullGrams: 300 }, 300)).toBeNull();
  });

  it('refuses the weighings taken in the wrong order', () => {
    // Full lower than empty: the reader entered them the other way round.
    expect(vesselRatio({ emptyGrams: 500, fullGrams: 300 }, 300)).toBeNull();
  });

  it('refuses a negative empty weight', () => {
    expect(vesselRatio({ emptyGrams: -10, fullGrams: 400 }, 300)).toBeNull();
  });

  it('refuses a reference of zero or below rather than dividing by it', () => {
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 450 }, 0)).toBeNull();
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 450 }, -300)).toBeNull();
  });

  it('refuses anything that is not a finite number', () => {
    expect(vesselRatio({ emptyGrams: Number.NaN, fullGrams: 450 }, 300)).toBeNull();
    expect(vesselRatio({ emptyGrams: 0, fullGrams: Number.POSITIVE_INFINITY }, 300)).toBeNull();
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 450 }, Number.NaN)).toBeNull();
  });
});

describe('gramsFor with a vessel — T31 phase 5', () => {
  const PLATE: Portioned = { id: 'biryani', grams: 51, vessel: { id: 'plate', grams: 300 } };
  const POPCORN: Portioned = { id: 'popcorn', grams: 14, vessel: null };
  const BIG = { foods: {}, vessels: { plate: { ratio: 1.5 } } };

  it('scales a row whose vessel the reader has calibrated', () => {
    expect(gramsFor(PLATE, BIG)).toEqual({ grams: 76.5, from: 'vessel' });
  });

  it('leaves a row alone when its vessel is not calibrated', () => {
    const other = { foods: {}, vessels: { katori: { ratio: 2 } } };
    expect(gramsFor(PLATE, other)).toEqual({ grams: 51, from: 'table' });
  });

  it('never scales a row that declares no vessel', () => {
    // THE CATASTROPHE THIS GUARDS. The adversarial pass calibrated a cup at
    // 220 g of curry and applied it to popcorn: 128 g against a true 14, an
    // over-dose of 11.4 units. A null vessel must ignore every ratio.
    const huge = { foods: {}, vessels: { plate: { ratio: 5.33 } } };
    expect(gramsFor(POPCORN, huge)).toEqual({ grams: 14, from: 'table' });
  });

  it("lets the reader's own figure beat the vessel, never multiplying both", () => {
    // Multiplying would count the plate twice: a rice row measured at 126 g
    // with a 1.5x plate reads 189 against a true 126 — +6.3 units at ICR 10.
    const both = { foods: { biryani: { grams: 126 } }, vessels: { plate: { ratio: 1.5 } } };
    expect(gramsFor(PLATE, both)).toEqual({ grams: 126, from: 'own' });
  });

  it('is bit-identical to the table at a ratio of exactly 1', () => {
    // The feature's central safety claim: a default that reproduces today
    // cannot make anything worse.
    expect(gramsFor(PLATE, { foods: {}, vessels: { plate: { ratio: 1 } } }))
      .toEqual({ grams: 51, from: 'vessel' });
  });

  it('carries the ratio through a tally', () => {
    expect(tallyGrams([PLATE, POPCORN], { biryani: 1, popcorn: 1 }, BIG)).toBe(91);
  });
});
