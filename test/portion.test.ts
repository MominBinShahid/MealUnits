import { describe, expect, it } from 'vitest';
import { displayGrams, gramsFor, tallyGrams, vesselRatio } from '../src/core/portion.js';
import { VESSEL_RATIO_MAX } from '../src/config.js';
import { FOODS } from '../src/data/carbs.js';
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

describe('the cap, and the whole gram on screen', () => {
  const PLATE: Portioned = { id: 'biryani', grams: 51, vessel: { id: 'plate', grams: 300 } };

  it('refuses a ratio above VESSEL_RATIO_MAX instead of returning it', () => {
    // 1500 g typed into the one field — a pot weighed, or a scale read in the
    // wrong unit. The cap lived ONLY at the JSON import boundary, so this
    // returned 5 and doses `rice-plate` at 420 g against a true 84.
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 1500 }, 300)).toBeNull();
  });

  it('admits the cap exactly, and refuses just past it', () => {
    // The boundary is spelled out rather than written as `300 *
    // VESSEL_RATIO_MAX`, which would move WITH the constant and let a mutated
    // cap pass its own test — the survivor that took the mutation score to
    // 99.95. This pins the value; the assertion below pins the name to it.
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 900 }, 300)).toBe(3);
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 901 }, 300)).toBeNull();
    expect(VESSEL_RATIO_MAX).toBe(3);
  });

  it('refuses a zero reference on its own, not by way of the cap', () => {
    // The cap now MASKS this guard for +0: the division gives Infinity, which
    // the cap refuses anyway, so both a `<= 0` and a `< 0` test read the same.
    // Negative zero is what separates them — `-0 < 0` is false, so without the
    // `<=` the division returns -Infinity and sails past a cap that only looks
    // upwards. The guard is what refuses a reference of zero; this pins that.
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 450 }, 0)).toBeNull();
    expect(vesselRatio({ emptyGrams: 0, fullGrams: 450 }, -0)).toBeNull();
  });

  it('caps on the FILL, so a heavy plate does not buy headroom', () => {
    // 285 g plate, 1200 g of food: the fill is 1200, ratio 4, still refused.
    expect(vesselRatio({ emptyGrams: 285, fullGrams: 1485 }, 300)).toBeNull();
  });

  it('rounds a scaled figure to the whole gram for display', () => {
    // 51 x (450.5 / 300) is 76.58500000000001, which is what the matrix cell
    // and the result screen's working line printed.
    expect(displayGrams(51 * (450.5 / 300))).toBe(77);
    expect(displayGrams(76.5)).toBe(77);
    expect(displayGrams(51)).toBe(51);
  });

  it('does not round the figure the dose is summed from', () => {
    // §5.3 — display rounding must not become a second rounding engine.
    // Two rows at 76.5 sum to 153 and round to 153, not to 77 + 77 = 154.
    const own = { foods: {}, vessels: { plate: { ratio: 1.5 } } };
    expect(tallyGrams([PLATE], { biryani: 2 }, own)).toBe(153);
    expect(displayGrams(51 * 1.5) * 2).toBe(154);
  });
});

describe('refusals and the read-side cap', () => {
  const PLATE = { id: 'rice-plate', grams: 84, vessel: { id: 'plate', grams: 300 } };
  it('refuses NaN, not returns it', () => {
    expect(vesselRatio({ emptyGrams: 0, fullGrams: Number.NaN }, 300)).toBeNull();
    expect(vesselRatio({ emptyGrams: Number.NaN, fullGrams: 450 }, 300)).toBeNull();
  });
  it('falls back to the table figure for a stored ratio above the cap', () => {
    // The build that shipped before this one had no cap on save, so this can
    // already exist in a browser. 84 x 5 = 420 g would be the dose.
    expect(gramsFor(PLATE, { foods: {}, vessels: { plate: { ratio: 5 } } }))
      .toEqual({ grams: 84, from: 'table' });
    expect(gramsFor(PLATE, { foods: {}, vessels: { plate: { ratio: VESSEL_RATIO_MAX } } }))
      .toEqual({ grams: 252, from: 'vessel' });
  });
  it('falls back for a nonsense stored ratio, and SAYS it is the table', () => {
    // `from` is asserted, not just `grams`: the row reads it to decide whether
    // to print "Counted for your 450 g serving". A fallback that returned the
    // table figure while still claiming 'vessel' would put that line on a row
    // that did not scale — the provenance saying one thing, the number another.
    for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(gramsFor(PLATE, { foods: {}, vessels: { plate: { ratio } } }))
        .toEqual({ grams: 84, from: 'table' });
    }
  });
});

describe('the raita composites scale with the plate', () => {
  // Reversed on 2026-09-27: not scaling over-doses below a ratio of 1, which is
  // the direction every note justifying the exclusion left out.
  const COMPOSITE = 'meal-biryani-degh-raita';
  it('is tagged as a plate row in the table', () => {
    const row = FOODS.find((food) => food.id === COMPOSITE);
    expect(row?.vessel).toEqual({ id: 'plate', grams: 300 });
  });
  it('scales down with a smaller plate instead of standing still', () => {
    const row = FOODS.find((food) => food.id === COMPOSITE);
    if (row === undefined) throw new Error('row missing');
    const small = gramsFor(row, { foods: {}, vessels: { plate: { ratio: 0.5 } } });
    expect(small.from).toBe('vessel');
    // Standing still at 62 g against a true ~34 is +2.9 units at an ICR of 10.
    expect(small.grams).toBeLessThan(row.grams);
  });
});
