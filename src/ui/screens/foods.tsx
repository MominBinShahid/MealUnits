import type { JSX } from 'preact';
import { matchFoods } from '../../core/foods.js';
import type { Food } from '../../data/carbs.js';
import { FOODS } from '../../data/carbs.js';
import { useCopy } from '../copy.js';
import { Button, TextInput } from '../components.js';

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
  const COPY = useCopy();
  const amount = food.gramsMax === null
    ? COPY.foods.gramsOne(String(food.grams))
    : COPY.foods.gramsRange(String(food.grams), String(food.gramsMax));

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
  const COPY = useCopy();
  const shown = matchFoods(FOODS, query);

  return (
    <div class="screen">
      <h1>{COPY.foods.title}</h1>
      <p>{COPY.foods.intro}</p>

      {/* `field wide` and NOT `ask`, both of which were wrong before.
          `class="field"` sat on the input itself, where every input rule in the
          stylesheet is a descendant — `.field input` — so this field matched
          none of them and rendered as the browser's own control: no line, no
          radius, no surface, and no `min-height`, which left the one field in
          the app below §10.7's touch floor. The label wore `.ask`, the display
          size meant for a screen's SINGLE question, and this screen already has
          its h1 — the same defect Momin caught on the settings rounding
          question, arriving on a different screen. */}
      <div class="field wide search">
        {/* A real `<label for>` rather than the `aria-label` this carried. The
            accessible name is identical; the difference is that a visible label
            is also a tap target that focuses the field.

            Still a VISIBLE label and still not a placeholder, which is the part
            of the old comment worth keeping: placeholder-as-label disappears
            the moment anyone types, which is exactly when a person looks up to
            check what they are filling in. */}
        <label for="food-search">{COPY.foods.searchLabel}</label>
        <div class="search-box">
          <span class="search-icon" aria-hidden="true">{'\u{1F50D}'}</span>
          <TextInput
            type="search"
            id="food-search"
            /*
             * `data-field` no longer drives a focus restore — nothing restores
             * focus any more, because nothing destroys the field. It stays
             * because it is this input's stable identity for anything that has
             * to FIND it: the continuity tests key on it, and note 25's
             * recurrence was a screen shipping without one.
             *
             * The name is the state key it drives, so the two cannot drift.
             */
            data-field="foodQuery"
            value={query}
            autocomplete="off"
            onValue={onQuery}
          />
          {/* Only once there is something to clear. A control that is always
              there but does nothing most of the time is noise on a 412px
              screen, and `type="search"`'s native version is hidden in the
              stylesheet because two clear buttons is worse than either. */}
          {query === '' ? null : (
            <Button
              class="search-clear"
              aria-label={COPY.foods.searchClear}
              onPress={() => { onQuery(''); }}
            >
              {'×'}
            </Button>
          )}
        </div>
        {/* Inside the field group, so the 0.25rem grid gap binds it to the box
            it describes. It used to be a sibling of the count below, and two
            identical `.hint` paragraphs in a row read as one grey block. */}
        <p class="hint">{COPY.foods.searchHint}</p>
      </div>

      <p class="hint count">{COPY.foods.countNote(shown.length, FOODS.length)}</p>

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
