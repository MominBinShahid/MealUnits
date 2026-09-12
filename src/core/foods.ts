/**
 * Searching the carbohydrate reference.
 *
 * In `core` rather than in the screen, and under the 100% mutation gate,
 * because **matching the wrong dish is a wrong dose.** A search that quietly
 * returns naan when the user typed "nihari" is the same class of defect as bad
 * arithmetic, and the arithmetic is not trusted to review alone either.
 *
 * Structural parameter rather than an import from `src/data`: this stays a
 * function over names, so it can be tested without the table and the table can
 * grow without touching it. §11.8's data module holds no behaviour, which is
 * the other half of the same rule.
 */

/** The minimum a row must offer to be findable. */
export interface Searchable {
  readonly name: string;
  readonly urdu: string;
  readonly aliases: readonly string[];
}

/**
 * Folded once here rather than at every comparison. Lowercasing only — no
 * accent stripping and no fuzzy distance, deliberately: **fuzzy matching on
 * food names eventually matches the wrong dish**, and a list that silently
 * returns something adjacent is worse than one that returns nothing and lets
 * the user look again.
 */
function fold(value: string): string {
  // Stryker disable next-line MethodExpression: toLowerCase -> toUpperCase is
  // EQUIVALENT and no assertion can distinguish it. Both the needle and the
  // haystack pass through this function, so folding both to upper case matches
  // exactly the same rows as folding both to lower. Disabled with the reason
  // rather than chased with a test that would only appear to prove something.
  return value.trim().toLowerCase();
}

/**
 * Rows whose name, Roman Urdu name, or any recorded spelling variant contains
 * the query.
 *
 * An EMPTY query returns everything, because the screen opens before anything
 * is typed and an empty list would read as "no food matches" rather than "start
 * typing".
 *
 * Substring rather than prefix: "naan" has to find "Tandoor naan, small tier",
 * and someone typing "qeema" has to find "Mince samosa" through its alias.
 */
export function matchFoods<T extends Searchable>(foods: readonly T[], query: string): readonly T[] {
  const needle = fold(query);
  // No early return for the empty query, and the mutation gate is why. A
  // `if (needle === '') return foods;` guard survived two mutants because it
  // changes nothing: every string contains the empty string, so the filter
  // below already returns every row. The guard restated the filter's behaviour
  // and read like a decision, which is worse than absent.
  return foods.filter((food) => {
    if (fold(food.name).includes(needle)) return true;
    if (fold(food.urdu).includes(needle)) return true;
    return food.aliases.some((alias) => fold(alias).includes(needle));
  });
}
