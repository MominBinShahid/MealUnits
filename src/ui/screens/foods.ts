import { matchFoods } from '../../core/foods.js';
import type { Food } from '../../data/carbs.js';
import { FOODS } from '../../data/carbs.js';
import { COPY } from '../copy.js';
import { h } from '../dom.js';

export interface FoodListHandlers {
  readonly query: string;
  readonly onQuery: (value: string) => void;
}

/**
 * One row. Grams lead, because grams are what the app asks for and what the
 * reader came here to get — the name is how you find the row, the number is
 * why you wanted it.
 */
function foodRow(food: Food): HTMLElement {
  const amount = food.gramsMax === null
    ? `${String(food.grams)} g`
    : `${String(food.grams)}–${String(food.gramsMax)} g`;

  const detail: HTMLElement[] = [
    h('div', { class: 'k' }, `${food.name} (${food.urdu})`),
    h('div', { class: 'hint' }, food.portion),
  ];

  // §11.8's second condition, on screen. A value whose confidence is hidden is
  // presented with the authority of a lab measurement, and the gap between
  // those two things is what this table is built on.
  if (food.varies !== null) {
    detail.push(h('div', { class: 'hint' }, COPY.foods.variesPrefix + food.varies));
  }
  detail.push(
    h(
      'div',
      { class: 'clinical' },
      `${COPY.foods.confidenceLabel[food.confidence]} · ${COPY.foods.sourcePrefix}${food.source}`,
    ),
  );

  return h('li', { class: 'li' }, h('div', {}, ...detail), h('div', { class: 'v' }, amount));
}

/**
 * §11.8's reference data, as a screen.
 *
 * **Read-only, and that is the design rather than a limitation.** Nothing here
 * writes into the carbohydrate field: you read a number and type it yourself.
 * A wrong row can mislead someone and can never silently drive a dose, which is
 * the property §7.8 gives blood-sugar readings, applied to food.
 *
 * Reachable only from the carbohydrate step. It is an answer to the question
 * being asked at that exact moment, and it is noise anywhere else.
 */
export function foodListScreen(handlers: FoodListHandlers): HTMLElement {
  const shown = matchFoods(FOODS, handlers.query);

  const field = h('input', {
    type: 'search',
    class: 'field',
    id: 'food-search',
    value: handlers.query,
    autocomplete: 'off',
    // Labelled by the visible heading above it rather than by a placeholder:
    // placeholder-as-label disappears the moment anyone types, which is exactly
    // when a person looks up to check what they are filling in.
    'aria-label': COPY.foods.searchLabel,
  });
  field.addEventListener('input', () => { handlers.onQuery(field.value); });

  return h(
    'div',
    { class: 'screen' },
    h('h1', {}, COPY.foods.title),
    h('p', {}, COPY.foods.intro),

    h('div', { class: 'ask' }, COPY.foods.searchLabel),
    field,
    h('p', { class: 'hint' }, COPY.foods.searchHint),

    h('p', { class: 'hint' }, COPY.foods.countNote(shown.length, FOODS.length)),

    shown.length === 0
      ? h('p', { class: 'flag' }, COPY.foods.empty(handlers.query))
      : h('ul', { class: 'list' }, ...shown.map(foodRow)),

    // Last, not first. It is the most useful thing here, and it is also the
    // thing nobody reads before they have looked up one number and seen how
    // wide the ranges are.
    h('div', { class: 'flag mint' }, h('b', {}, 'Make these yours'), COPY.foods.weighOnce),
  );
}
