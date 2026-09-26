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
}

/** What the reader has measured for themselves, as storage reports it. */
export interface OwnFigures {
  readonly foods: Readonly<Record<string, { readonly grams: number }>>;
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
export type GramsSource = 'table' | 'own';

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
  const mine = own.foods[food.id];
  return mine === undefined
    ? { grams: food.grams, from: 'table' }
    : { grams: mine.grams, from: 'own' };
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
