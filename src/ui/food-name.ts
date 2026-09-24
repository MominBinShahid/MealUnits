/**
 * Which of a food's names a language shows, and how it frames the other one.
 *
 * **This is split in two on purpose, and the split is what keeps a safety check
 * working.** `test/interpolation.test.ts` asserts PARITY: a value the English
 * copy prints must also reach the Urdu copy. It exists because a translation
 * that quietly stops printing a number reads as a complete sentence — the
 * stacking ceiling, the gram figure — and TypeScript cannot see it.
 *
 * An earlier version put the whole thing in `COPY.foods`: one function taking
 * every name, where English printed one argument and Urdu printed another.
 * That compiles, it renders correctly, and it fails the parity check —
 * correctly. Each language dropped an argument the other printed, which is the
 * exact shape the check hunts for. Exempting it would have cost the check its
 * first hole, over a function that is not a sentence at all.
 *
 * So SELECTION lives here and FORMATTING stays in copy:
 *
 *   - `COPY.foods.lang` names which language this copy object speaks.
 *   - `COPY.foods.foodName(display, roman)` takes two arguments and prints
 *     both, in every language, so parity holds with no exemption.
 *
 * `lang` is COMPARED as a string rather than used as an index, so `Words<T>`
 * can widen the literal the way it widens every other word in `COPY` — no
 * second `RoundingMode`-style carve-out in the type.
 */

import type { Food, FoodText } from '../data/carbs.js';
import type { Copy } from './copy.js';

/**
 * The row's text in the reader's language.
 *
 * FALLS BACK TO ENGLISH per field, not per row. A half-translated row should
 * leave a reader with the English portion line beside an Urdu name, never with
 * a blank where a measurement used to be — and `varies` is allowed to be null,
 * so an empty string is the only signal a translation is missing.
 */
export function textOf(food: Food, copy: Copy): FoodText {
  const own = copy.foods.lang === 'ur' ? food.text.ur : food.text.en;
  const fallback = food.text.en;
  return {
    name: own.name === '' ? fallback.name : own.name,
    portion: own.portion === '' ? fallback.portion : own.portion,
    varies: own.varies === '' ? fallback.varies : own.varies,
  };
}

/** The name to SHOW, where there is no room for the Roman anchor. */
export function displayName(food: Food, copy: Copy): string {
  return textOf(food, copy).name;
}

/** The same name with its Roman anchor, for the row a reader picks from. */
export function fullName(food: Food, copy: Copy): string {
  return copy.foods.foodName(displayName(food, copy), food.roman);
}
