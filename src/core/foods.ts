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
  /** Roman Urdu. Named for the SCRIPT, not the language — see `Food.roman`. */
  readonly roman: string;
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
  // §10.4 put a no-break space inside `Large flatbread, 12\u00A0inch`, and a
  // name is SEARCHED as well as rendered. Nobody types U+00A0, so without this
  // the row is unreachable by the words printed on it — a silent miss in the
  // module whose header says matching the wrong dish is a wrong dose.
  //
  // Safe for the same reason the case fold is: BOTH the needle and the haystack
  // come through here, so normalising one more character on both sides cannot
  // change which rows match. It can only stop a match being lost to a character
  // the user has no way to enter.
  //
  // Stryker disable next-line MethodExpression: toLowerCase -> toUpperCase is
  // EQUIVALENT and no assertion can distinguish it. Both the needle and the
  // haystack pass through this function, so folding both to upper case matches
  // exactly the same rows as folding both to lower. Disabled with the reason
  // rather than chased with a test that would only appear to prove something.
  return value.replace(/\u00A0/g, ' ').trim().toLowerCase();
}

/**
 * THE WORDS THAT MEAN "SUGAR-FREE", and why a search for them cannot just
 * return nothing.
 *
 * `docs/CARBS.md` section 20 rules that this table carries no figure for
 * sugar-free confectionery: the label counts sugar alcohols as carbohydrate,
 * the body absorbs little of them, and dosing the printed number gives insulin
 * for food that is not there. Refusing to publish a number is right. Refusing
 * SILENTLY is not — a reader who searches "sugar free" and gets "nothing
 * matches" has learnt nothing and will read the packet instead, which is the
 * exact hazard the refusal exists to prevent.
 *
 * So the refusal is searchable. Momin's framing: "for things like that where we
 * don't want to give a line but we know if somebody search, we have to show
 * something."
 *
 * DRINK BRANDS ARE DELIBERATELY ABSENT from this list. A diet cola is sweetened
 * with aspartame, not a polyol, and is genuinely zero — it has a real row with
 * a real figure, and sending "coke zero" to an explanation instead of that row
 * would be a downgrade. The split is the whole point: drinks have an answer,
 * confectionery has a reason there is no answer.
 */
const SUGAR_FREE_WORDS = [
  'sugar free', 'sugarfree', 'sugar-free', 'no sugar added', 'gum', 'chewing gum',
  'stevia', 'maltitol', 'sorbitol', 'xylitol', 'erythritol', 'isomalt', 'polyol',
  'sugar alcohol', 'diabetic sweet', 'diabetic mithai', 'diabetic chocolate',
] as const;

/**
 * Whether a query is asking about sugar-free food, so the screen can answer the
 * question instead of reporting an absence.
 *
 * Substring on the FOLDED query, matching how `matchFoods` compares, so
 * "Sugar Free" and "sugar-free gum" both land.
 */
export function asksAboutSugarFree(query: string): boolean {
  // NO EMPTY-QUERY GUARD, deliberately. One was written here and the mutation
  // gate killed it — twice, as a surviving ConditionalExpression and a
  // surviving StringLiteral, both pointing at the same dead branch. It was
  // unreachable behaviour: every word in the list is non-empty, and `''`
  // contains none of them, so an empty query already answers false by the only
  // route that matters. A guard no input can distinguish is not caution, it is
  // a line that looks like it is doing something.
  const needle = fold(query);
  return SUGAR_FREE_WORDS.some((word) => needle.includes(word));
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
  const hits = foods.filter((food) => {
    if (fold(food.name).includes(needle)) return true;
    if (fold(food.roman).includes(needle)) return true;
    return food.aliases.some((alias) => fold(alias).includes(needle));
  });
  // Sorted in place: `filter` above already built a fresh array, so there is
  // nothing of the caller's to protect. A defensive copy here would be an
  // equivalent mutant — no test could tell it from its absence — and the gate
  // says so rather than letting it sit as decoration.
  return hits.sort((a, b) => tier(a, needle) - tier(b, needle));
}

/**
 * How well a row answers the query, lower being better. The ONLY thing this
 * changes is order — `matchFoods` has already decided which rows match, and
 * every tier below is a row that matched.
 *
 * It exists because the table is about to grow from 31 rows to roughly 270, and
 * at that size unordered results stop being merely untidy. `roti` reaches 17
 * rows; returned in data-file order, the row actually CALLED "Roti" can render
 * below one that matched on its ninth alias. The reader scrolls, does not find
 * the obvious answer near the top, and picks something adjacent — which is the
 * wrong-dish failure this module's header is about, arriving through ordering
 * rather than through matching.
 *
 * Four tiers, and the reasoning is the same each time: the more of a field the
 * query accounts for, the more likely that field is what the reader meant.
 *
 *   0  the query IS the whole field          "roti"   -> `Roti`
 *   1  the field starts with the query       "roti"   -> `Roti, thin`
 *   2  a WORD in the field starts with it    "roti"   -> `Moti roti`
 *   3  it appears somewhere inside           "oti"    -> `Moti roti`
 *
 * Tier 2 earns its place: Urdu dish names are compounds, and the distinguishing
 * word is as often last as first — `moti roti`, `qeema samosa`, `matar pulao`.
 * Without it those rank level with an incidental substring match.
 *
 * Ties keep the table's own order, which is grouped by dish family and ascends
 * by size within a family. `Array.prototype.sort` has been required to be
 * stable since ES2019, so that ordering survives rather than being scrambled.
 */
const TIERS: ReadonlyArray<(field: string, needle: string) => boolean> = [
  (field, needle) => field === needle,
  (field, needle) => field.startsWith(needle),
  (field, needle) => field.split(' ').some((word) => word.startsWith(needle)),
];

function tier(food: Searchable, needle: string): number {
  const fields = [food.name, food.roman, ...food.aliases].map(fold);
  // An ordered LIST rather than a chain of `if`s returning 0, 1, 2, 3 — and
  // §11.8 is why. Those ordinals are literals, and the rule admits only 0, 1,
  // -1 and 100, so the chain failed lint. Writing the tiers as rules in
  // priority order lets `findIndex` supply the number: no literal to launder,
  // and the order on screen is the order on the page.
  //
  // `-1` is the documented "none matched", and a row that matched nothing
  // above still matched the filter — it contains the needle somewhere inside —
  // so it sorts last rather than being dropped.
  const matched = TIERS.findIndex((rule) => fields.some((field) => rule(field, needle)));
  return matched === -1 ? TIERS.length : matched;
}
