import type { JSX } from 'preact';
import { matchFoods } from '../../core/foods.js';
import type { Food } from '../../data/carbs.js';
import { FOODS } from '../../data/carbs.js';
import { COPY } from '../copy.js';
import { TextInput } from '../components.js';

export interface FoodListProps {
  readonly query: string;
  readonly onQuery: (value: string) => void;
}

/**
 * One row. Grams lead, because grams are what the app asks for and what the
 * reader came here to get — the name is how you find the row, the number is
 * why you wanted it.
 */
function FoodRow({ food }: { readonly food: Food }): JSX.Element {
  const amount = food.gramsMax === null
    ? `${String(food.grams)}\u00A0g`
    : `${String(food.grams)}–${String(food.gramsMax)}\u00A0g`;

  return (
    <li class="li">
      <div>
        <div class="k">{`${food.name} (${food.urdu})`}</div>
        <div class="hint">{food.portion}</div>
        {/* §11.8's second condition, on screen. A value whose confidence is
            hidden is presented with the authority of a lab measurement, and the
            gap between those two things is what this table is built on. */}
        {food.varies === null ? null : (
          <div class="hint">{COPY.foods.variesPrefix + food.varies}</div>
        )}
        <div class="clinical">
          {`${COPY.foods.confidenceLabel[food.confidence]} · ${COPY.foods.sourcePrefix}${food.source}`}
        </div>
      </div>
      <div class="v">{amount}</div>
    </li>
  );
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
export function FoodListScreen({ query, onQuery }: FoodListProps): JSX.Element {
  const shown = matchFoods(FOODS, query);

  return (
    <div class="screen">
      <h1>{COPY.foods.title}</h1>
      <p>{COPY.foods.intro}</p>

      <div class="ask">{COPY.foods.searchLabel}</div>
      <TextInput
        type="search"
        class="field"
        id="food-search"
        /*
         * `data-field` no longer drives a focus restore — nothing restores
         * focus any more, because nothing destroys the field. It stays because
         * it is this input's stable identity for anything that has to FIND it:
         * the continuity tests key on it, and note 25's recurrence was a screen
         * shipping without one.
         *
         * The name is the state key it drives, so the two cannot drift.
         */
        data-field="foodQuery"
        value={query}
        autocomplete="off"
        /* Labelled by the visible heading above it rather than by a
           placeholder: placeholder-as-label disappears the moment anyone types,
           which is exactly when a person looks up to check what they are
           filling in. */
        aria-label={COPY.foods.searchLabel}
        onValue={onQuery}
      />
      <p class="hint">{COPY.foods.searchHint}</p>

      <p class="hint">{COPY.foods.countNote(shown.length, FOODS.length)}</p>

      {shown.length === 0 ? (
        <p class="flag">{COPY.foods.empty(query)}</p>
      ) : (
        <ul class="list">
          {shown.map((food) => (
            <FoodRow key={food.name} food={food} />
          ))}
        </ul>
      )}

      {/* Last, not first. It is the most useful thing here, and it is also the
          thing nobody reads before they have looked up one number and seen how
          wide the ranges are. */}
      <div class="flag mint">
        <b>{COPY.screens.foodsMakeYours}</b>
        {COPY.foods.weighOnce}
      </div>
    </div>
  );
}
