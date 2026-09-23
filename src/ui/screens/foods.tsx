import type { JSX } from 'preact';
import { matchFoods } from '../../core/foods.js';
import type { Category, Food } from '../../data/carbs.js';
import { FOODS } from '../../data/carbs.js';
import { useCopy } from '../copy.js';
import { Button, TextInput } from '../components.js';

export interface FoodListProps {
  readonly query: string;
  readonly openGroup: string | null;
  readonly tally: Record<string, number>;
  readonly onQuery: (value: string) => void;
  readonly onToggleGroup: (group: string) => void;
  readonly onAdd: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onUseTotal: (grams: number) => void;
  readonly onClearTally: () => void;
}

/**
 * What the tally comes to.
 *
 * `grams` — the typical — rather than either end of a row's band, and the
 * phase 3 ruling is why: the total arrives as a number the reader confirms, so
 * the range beside each row is information that informs their edit rather than
 * a decision the app has to make for them. Taking the low end of every row
 * would under-dose every meal; taking the high end would over-dose it, and
 * over-dosing is the hypo.
 *
 * Rounded once, at the end. Rounding each row first and summing would drift by
 * up to half a gram per food, which on a six-item plate is a whole unit at some
 * ratios.
 */
function tallyGrams(tally: Record<string, number>): number {
  let total = 0;
  for (const food of FOODS) {
    const count = tally[food.id];
    if (count !== undefined) total += food.grams * count;
  }
  return Math.round(total);
}

/**
 * The order the groups appear in, which is the order a meal is built rather
 * than the order the reference document files them: the bread and the rice
 * first, because those are the rows somebody opens this screen for three times
 * a day, and the packets last.
 */
const GROUPS: readonly Category[] = [
  'bread', 'rice', 'daal', 'salan', 'snack', 'sweet', 'drink', 'fruit', 'dairy', 'packaged',
];

/**
 * One row. Grams lead, because grams are what the app asks for and what the
 * reader came here to get — the name is how you find the row, the number is
 * why you wanted it.
 */
function FoodRow({ food, count, onAdd, onRemove }: {
  readonly food: Food;
  readonly count: number;
  readonly onAdd: (id: string) => void;
  readonly onRemove: (id: string) => void;
}): JSX.Element {
  const COPY = useCopy();
  const amount = food.gramsMax === null
    ? COPY.foods.gramsOne(String(food.grams))
    : COPY.foods.gramsRange(String(food.grams), String(food.gramsMax));

  return (
    <li class="li">
      <div>
        <div class="k">
          {/* The marker sits on the ROW, where the food is chosen, and not on
              the result screen — which is what keeps it out of §10.5's budget
              of two advisory elements. A result-screen warning would compete
              with the band B caution, and band B is the one that must land.

              Momin's shape, in his words: "maybe a warning logo or small thing
              right that's it." One glyph here; the sentence that explains it
              sits once under the list rather than repeating on every row. */}
          {food.confidence === 'low' ? (
            <span class="est" aria-label={COPY.foods.estimateLabel}>{'\u26A0'}</span>
          ) : null}
          {`${food.name} (${food.roman})`}
        </div>
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
      <div class="v">
        {amount}
        {/* Phase 3. Minus appears only once there is something to remove — a
            control that does nothing most of the time is noise on a 412px
            screen, which is the same argument the search-clear button makes. */}
        <div class="tally">
          {count === 0 ? null : (
            <Button class="tally-step" aria-label={COPY.foods.removeOne}
              onPress={() => { onRemove(food.id); }}>{'\u2212'}</Button>
          )}
          {count === 0 ? null : <span class="tally-n">{COPY.foods.tallyCount(count)}</span>}
          <Button class="tally-step" aria-label={COPY.foods.addOne}
            onPress={() => { onAdd(food.id); }}>{'+'}</Button>
        </div>
      </div>
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
export function FoodListScreen({
  query, openGroup, tally, onQuery, onToggleGroup, onAdd, onRemove, onUseTotal, onClearTally,
}: FoodListProps): JSX.Element {
  const COPY = useCopy();
  const shown = matchFoods(FOODS, query);
  // Searching flattens the groups. A query is already a filter, and filtering
  // twice — once by word, once by which section happens to be open — would hide
  // matches behind a heading and look like the search had missed them.
  const browsing = query.trim() === '';
  // What is actually painted: the open group's rows while browsing, the
  // matches while searching. Nothing while every group is shut.
  const visible = browsing
    ? FOODS.filter((food) => food.category === openGroup)
    : shown;
  const picked = Object.values(tally).reduce((sum, n) => sum + n, 0);
  const total = tallyGrams(tally);

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
      {/* Once, under the count — not per row. A warning repeated on every row
          is furniture, and furniture is what §10.5 says trains people to skip
          the warning that matters.

          Shown only when a marked row is actually ON SCREEN, which is not the
          same as being in the table. Browsing with every group shut, all 319
          rows "contain" one and none is visible — the first version tested the
          table and explained a symbol nobody could see. */}
      {visible.some((food) => food.confidence === 'low') ? (
        <p class="hint est-note">{COPY.foods.estimateNote}</p>
      ) : null}

      {browsing ? (
        /*
         * 319 rows is 63 phone screens, measured. Collapsed groups make that
         * one screen, and opening the largest of them costs ten — which is a
         * list, not a scroll.
         *
         * ONE open at a time. Two would already be worse than anything else in
         * the app, and the control that opens a group is the control that
         * closes it, so there is no way to end up with a screen you cannot
         * undo.
         */
        <>
          <p class="hint">{COPY.foods.browseHint}</p>
          <ul class="list groups">
            {GROUPS.map((group) => {
              const rows = FOODS.filter((food) => food.category === group);
              const open = openGroup === group;
              return (
                <li key={group} class="group">
                  <Button
                    class="go quiet group-head"
                    aria-expanded={open}
                    onPress={() => { onToggleGroup(group); }}
                  >
                    <span class="group-name">{COPY.foods.categoryLabel[group]}</span>
                    <span class="tag">{COPY.foods.categoryCount(rows.length)}</span>
                  </Button>
                  {open ? (
                    <ul class="list">
                      {rows.map((food) => (
                        <FoodRow key={food.id} food={food}
                          count={tally[food.id] ?? 0} onAdd={onAdd} onRemove={onRemove} />
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : shown.length === 0 ? (
        <p class="flag">{COPY.foods.empty(query)}</p>
      ) : (
        <ul class="list">
          {shown.map((food) => (
            <FoodRow key={food.id} food={food}
              count={tally[food.id] ?? 0} onAdd={onAdd} onRemove={onRemove} />
          ))}
        </ul>
      )}

      {/*
       * PHASE 3, and the ruling's first answer made visible: this is a total
       * you USE, not one that happens. Nothing has reached the carbohydrate
       * box until the button below is pressed, and the line under it says the
       * number is still yours to change afterwards.
       *
       * `.sheet` is the screen's bottom bar, the same shape the settings save
       * uses — so it sits where the reader's thumb already expects a commit.
       */}
      {picked === 0 ? null : (
        <div class="sheet tally-bar" aria-live="polite">
          <div class="tally-sum">{COPY.foods.tallyTotal(picked, String(total))}</div>
          <Button class="go" onPress={() => { onUseTotal(total); }}>{COPY.foods.tallyUse}</Button>
          <Button class="link" onPress={onClearTally}>{COPY.foods.tallyClear}</Button>
          <p class="hint">{COPY.foods.tallyCheck}</p>
        </div>
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
