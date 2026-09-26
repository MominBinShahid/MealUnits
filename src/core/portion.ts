/**
 * What one row of the food table contributes to a dose, and where that figure
 * came from.
 *
 * ## Why this is a module rather than an expression
 *
 * The expression `calibration[food.id]?.grams ?? food.grams` was written FOUR
 * times, all of them in the view layer and none of them mutation-gated:
 * `foods.tsx` had it in the matrix cell, the picked strip and `tallyGrams`,
 * and `calculator.tsx` had it in the working breakdown.
 *
 * That duplication already shipped a defect. The comment at
 * `calculator.tsx`'s working line records it: the meal row said 52 g while the
 * line beneath said "2 × Home flatbread, medium — 36 g", because one of the
 * four copies still read `food.grams` after phase 2 shipped. Four copies of a
 * dose figure is three chances to update three of them.
 *
 * T31 adds a second term to that expression. Adding it to three sites out of
 * four would be the same defect with a bigger number attached, so the copies
 * collapse here FIRST, as their own change, with every figure on screen
 * byte-identical — which is what makes that change reviewable.
 *
 * ## Why it takes a shape rather than `Food`
 *
 * `src/core` imports nothing — no DOM, no storage, no clock, and not
 * `src/data` either. `Portioned` is the shape this arithmetic needs; `Food`
 * satisfies it structurally, the same device `Searchable` uses in `foods.ts`.
 * It also means a test can state its own rows rather than importing the
 * shipped table, so a case still means what it meant when the table changes.
 */

/** The part of a food row this arithmetic reads. */
export interface Portioned {
  readonly id: string;
  /** Grams of carbohydrate, and for a banded row this is the FLOOR. */
  readonly grams: number;
  /**
   * The vessel this row is served in, and what the TABLE assumes it holds —
   * or null where the row does not scale with one.
   *
   * `grams` here is a divisor used when a ratio is WRITTEN, never when one is
   * read. The read is `food.grams × ratio`.
   */
  readonly vessel: { readonly id: string; readonly grams: number } | null;
}

/** What the reader has measured for themselves, as storage reports it. */
export interface OwnFigures {
  readonly foods: Readonly<Record<string, { readonly grams: number }>>;
  /** Vessel id to the ratio the reader's own weighing produced. */
  readonly vessels: Readonly<Record<string, { readonly ratio: number }>>;
}

/**
 * Which figure a row is showing.
 *
 * Returned alongside the number so a screen can say whose figure it is without
 * deriving that decision a second time. Two implementations of "is this row
 * calibrated" is how a screen ends up labelling the table's figure as the
 * reader's, and this app makes an explicit promise about that — the row says
 * "Yours" and prints the date it was set.
 */
export type GramsSource = 'table' | 'own' | 'vessel';

/**
 * The grams one row contributes, and which figure it is.
 *
 * The reader's own measurement wins when they have made one. Phase 2's ruling
 * is the reason and it is worth restating: if calibrating a food changed what
 * the ROW said but not what the DOSE said, that would be the worse half of
 * both features.
 */
export function gramsFor(
  food: Portioned,
  own: OwnFigures,
): { readonly grams: number; readonly from: GramsSource } {
  // PRECEDENCE, NOT ARITHMETIC. A per-food figure already contains the vessel
  // term — the reader weighed THAT food in THEIR plate — so multiplying the
  // two would count the plate twice: `rice-plate` measured at 126 g with a
  // 1.5x plate would read 189 against a true 126, **+6.3 units at ICR 10**.
  const mine = own.foods[food.id];
  if (mine !== undefined) return { grams: mine.grams, from: 'own' };

  // A row with no vessel never scales, whatever the reader has calibrated.
  // This is what keeps a plate ratio off the 332 rows that are not plates.
  if (food.vessel === null) return { grams: food.grams, from: 'table' };

  const vessel = own.vessels[food.vessel.id];
  if (vessel === undefined) return { grams: food.grams, from: 'table' };

  return { grams: food.grams * vessel.ratio, from: 'vessel' };
}

/**
 * What a tally of counted rows comes to, rounded ONCE at the end.
 *
 * Rounding each row first and then summing drifts by up to half a gram per
 * food, which on a six-item plate is a whole unit at some ratios. The rounding
 * lives here rather than in the formatter for the same reason: §5.3 says
 * formatting is not a second rounding engine.
 *
 * `foods` is passed in rather than imported, because `src/core` imports
 * nothing — and because a test that states its own rows keeps meaning what it
 * meant after the shipped table moves.
 */
export function tallyGrams(
  foods: readonly Portioned[],
  tally: Readonly<Record<string, number>>,
  own: OwnFigures,
): number {
  let total = 0;
  for (const food of foods) {
    const count = tally[food.id];
    if (count !== undefined) total += gramsFor(food, own).grams * count;
  }
  return Math.round(total);
}

/**
 * The ratio a weighing produces, or null when no honest one exists.
 *
 * `null` rather than a fallback, because every plausible fallback is wrong.
 * Returning 1 would silently tell a reader their calibration worked and change
 * nothing; returning the raw fill would hand back a weight where a ratio
 * belongs. A refusal is the only answer that cannot be mistaken for a result.
 *
 * The subtraction is the tare, and it is the reason this is a function rather
 * than a division at the call site. An un-tared plate is **+5.1 to +10.2
 * units**, and un-tared during calibration doubles every dose in that vessel
 * permanently — so the empty weight is a required input, not an option.
 */
export function vesselRatio(
  weighed: { readonly emptyGrams: number; readonly fullGrams: number },
  referenceGrams: number,
): number | null {
  if (!Number.isFinite(weighed.emptyGrams) || !Number.isFinite(weighed.fullGrams)) return null;
  if (!Number.isFinite(referenceGrams) || referenceGrams <= 0) return null;
  if (weighed.emptyGrams < 0) return null;
  const fill = weighed.fullGrams - weighed.emptyGrams;
  // A fill at or below zero is a reading taken in the wrong order, or the same
  // number typed twice. Neither is a vessel.
  if (fill <= 0) return null;
  return fill / referenceGrams;
}
