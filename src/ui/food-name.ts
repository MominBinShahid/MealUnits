/**
 * Which of a food's names a language shows, and how it frames the other one.
 *
 * **This is split in two on purpose, and the split is what keeps a safety check
 * working.** `test/interpolation.test.ts` asserts PARITY: a value the English
 * copy prints must also reach the Urdu copy. It exists because a translation
 * that quietly stops printing a number reads as a complete sentence — the
 * stacking ceiling, the gram figure — and TypeScript cannot see it.
 *
 * The first version of this put the whole thing in `COPY.foods`: one function
 * taking `(name, roman, script)`, where English printed `name` and Urdu printed
 * `script`. That compiles, it renders correctly, and it fails the parity check
 * — correctly. Each language dropped an argument the other one printed, which
 * is the exact shape the check is there to catch. Exempting it would have cost
 * the check its first hole, over a function that is not a sentence at all.
 *
 * So SELECTION lives here and FORMATTING stays in copy:
 *
 *   - `COPY.foods.nameField` names which field this language displays.
 *   - `COPY.foods.foodName(display, roman)` takes two arguments and prints
 *     both, in every language, so parity holds with no exemption.
 *
 * Compared as a string rather than used as an index, so `Words<T>` can widen
 * the literal to `string` the way it widens every other word in `COPY` — no
 * second `RoundingMode`-style carve-out in the type.
 *
 * BACKLOG T28 is where this goes next: when a third language arrives the names
 * become a map and `nameField` becomes its key. Only this file changes.
 */

import type { Food } from '../data/carbs.js';
import type { Copy } from './copy.js';

/**
 * The name to SHOW. Falls back to English when the language's own field is
 * empty — a missing translation should leave a reader with the English name,
 * never with a blank where a food used to be.
 */
export function displayName(food: Food, copy: Copy): string {
  const own = copy.foods.nameField === 'script' ? food.script : food.name;
  return own === '' ? food.name : own;
}

/** The same name with its Roman anchor, for the row a reader picks from. */
export function fullName(food: Food, copy: Copy): string {
  return copy.foods.foodName(displayName(food, copy), food.roman);
}
