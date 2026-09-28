import type { JSX } from 'preact';
import { asksAboutSugarFree, matchFoods } from '../../core/foods.js';
import { displayGrams, gramsFor, tallyGrams, vesselRatio } from '../../core/portion.js';
import { formatDayAndMonth } from '../../core/calendar.js';
import { VESSEL_RATIO_MAX } from '../../config.js';
import type { Category, Food } from '../../data/carbs.js';
import { FOODS } from '../../data/carbs.js';
import { IN_A_MATRIX, MATRICES } from '../matrices.js';
import type { FoodMatrix } from '../matrices.js';
import { useCopy } from '../copy.js';
import { displayName, fullName, textOf } from '../food-name.js';
import { Button, TextInput } from '../components.js';

export interface FoodListProps {
  readonly query: string;
  readonly openGroup: string | null;
  readonly tally: Record<string, number>;
  /** Phase 2 — the reader's own figures, keyed by `Food.id`. */
  readonly calibration: Readonly<Record<string, { readonly grams: number; readonly setAt: number }>>;
  readonly vessels: Readonly<Record<string, { readonly ratio: number }>>;
  readonly editingMine: string | null;
  readonly mineDraft: string;
  readonly timeZone: string;
  readonly onQuery: (value: string) => void;
  readonly onToggleGroup: (group: string) => void;
  readonly onAdd: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onUseTotal: (grams: number) => void;
  readonly onClearTally: () => void;
  readonly clearing: boolean;
  readonly onClearing: (on: boolean) => void;
  readonly onEditMine: (id: string | null) => void;
  /** T31 — one plate control: its ratio, its drafts, and the save. */
  readonly plateRatio: number | null;
  readonly plateSetAt: number | null;
  readonly plateOpen: boolean;
  readonly plateFoodDraft: string;
  readonly plateEmptyDraft: string;
  readonly plateNoTare: boolean;
  readonly plateAsserted: boolean;
  readonly onPlateOpen: (open: boolean) => void;
  readonly onPlateFoodDraft: (text: string) => void;
  readonly onPlateEmptyDraft: (text: string) => void;
  readonly onPlateNoTare: (on: boolean) => void;
  readonly onPlateAssert: () => void;
  readonly onPlateSave: (ratio: number, empty: number, total: number) => void;
  readonly onPlateClear: () => void;
  readonly onMineDraft: (text: string) => void;
  readonly onTerm: (key: string) => void;
  readonly onSaveMine: (id: string, grams: number | null) => void;
  readonly resetting: boolean;
  readonly onResetting: (value: boolean) => void;
  readonly onResetMine: () => void;
}

/**
 * A family whose two axes are both real variables, as a table.
 *
 * Tapping a cell adds one to the tally, which is the whole reason this is not
 * a picture: phase 3 has to keep working inside it. A cell carrying a count
 * shows it, so the table doubles as the record of what has been picked.
 *
 * The gram figure in each cell is the READER's where they have set one, for
 * the same reason the tally sums theirs — a calibration that changed the row
 * but not the table would be worse than no calibration.
 */
function Matrix({ matrix, tally, calibration, vessels, onAdd, onRemove }: {
  readonly matrix: FoodMatrix;
  readonly tally: Record<string, number>;
  readonly calibration: Readonly<Record<string, { readonly grams: number }>>;
  readonly vessels: Readonly<Record<string, { readonly ratio: number }>>;
  readonly onAdd: (id: string) => void;
  readonly onRemove: (id: string) => void;
}): JSX.Element {
  const COPY = useCopy();
  const axis = COPY.foods.matrixAxis as Record<string, string>;
  // What is picked, in reading order, with the axis words that name it. Built
  // once here rather than inside the table, because the strip below the table
  // needs the row and column labels the cells themselves never carry.
  const picked = matrix.rows.flatMap((row, rowIndex) => (
    (matrix.cells[rowIndex] ?? []).flatMap((id, columnIndex) => {
      if (id === null) return [];
      const food = FOODS.find((candidate) => candidate.id === id);
      const count = tally[id] ?? 0;
      if (food === undefined || count === 0) return [];
      return [{
        id,
        count,
        grams: displayGrams(gramsFor(food, { foods: calibration, vessels }).grams),
        label: `${axis[row] ?? ''} · ${axis[matrix.columns[columnIndex] ?? ''] ?? ''}`,
      }];
    })
  ));
  return (
    <div class="matrix-wrap">
      <b class="matrix-title">{COPY.foods.matrixTitle[matrix.key]}</b>
      {/* WHAT THE NUMBERS ARE. Momin read "41 g" under a column headed "plate"
          as the weight of the plate, which is the only sensible reading of a
          gram figure sitting under a serving name. The cells are carbohydrate,
          like every other number on this screen, and now say so. */}
      <p class="hint">{COPY.foods.matrixWhat}</p>
      {/* `overflow-x` on the wrapper, not the page: a four-column table at
          320px is the one thing here that can outgrow the column, and the body
          must never scroll sideways. */}
      <table class="matrix">
        <thead>
          <tr>
            <td />
            {matrix.columns.map((column) => <th key={column} scope="col">{axis[column]}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row, rowIndex) => (
            <tr key={row}>
              <th scope="row">{axis[row]}</th>
              {matrix.cells[rowIndex]?.map((id, columnIndex) => {
                const column = matrix.columns[columnIndex] ?? '';
                if (id === null) return <td key={column} />;
                const food = FOODS.find((candidate) => candidate.id === id);
                if (food === undefined) return <td key={column} />;
                const grams = displayGrams(gramsFor(food, { foods: calibration, vessels }).grams);
                const count = tally[id] ?? 0;
                return (
                  <td key={column}>
                    <Button
                      class={`cell${count === 0 ? '' : ' picked'}`}
                      aria-label={`${axis[row] ?? ''} ${axis[column] ?? ''} — ${displayName(food, COPY)}`}
                      onPress={() => { onAdd(id); }}
                    >
                      {COPY.foods.gramsOne(String(grams))}
                      {count === 0 ? null : (
                        <span class="cell-n">{COPY.foods.matrixPicked(count)}</span>
                      )}
                    </Button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/*
        * TAKING ONE BACK, in a strip under the table rather than inside it.
        *
        * The first version put a minus in the cell. Every picked cell then grew
        * a second cell beneath it, and a table with three picks grew six boxes
        * — Momin's screenshot of the biryani grid is the argument. It also has
        * no legal small form: §10.7's floor is 48px and will not bend for a
        * control the tremor argument applies to exactly as much.
        *
        * So the table never changes shape, and what you picked gets a row with
        * the same stepper the food rows use. Only picked combinations appear,
        * so an untouched matrix shows nothing at all.
        */}
      {picked.length === 0 ? null : (
        <ul class="list picked-list">
          {picked.map(({ id, grams, count, label }) => (
            <li key={id} class="li picked-row">
              <div class="k">
                {label}
                <span class="picked-grams">{COPY.foods.gramsOne(String(grams))}</span>
              </div>
              <div class="tally">
                <Button class="tally-step drop" aria-label={COPY.foods.removeOne}
                  onPress={() => { onRemove(id); }}>{'\u2212'}</Button>
                <span class="tally-n">{COPY.foods.tallyCount(count)}</span>
                <Button class="tally-step add" aria-label={COPY.foods.addOne}
                  onPress={() => { onAdd(id); }}>{'+'}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* The pattern the arrangement makes visible, in words — for the reader
          who arrived by search and never saw the table. */}
      <p class="hint">{COPY.foods.matrixRule[matrix.key]}</p>
    </div>
  );
}


/**
 * The order the groups appear in, which is the order a meal is built rather
 * than the order the reference document files them: the bread and the rice
 * first, because those are the rows somebody opens this screen for three times
 * a day, and the packets last.
 */
const GROUPS: readonly Category[] = [
  'bread', 'rice', 'daal', 'salan', 'side', 'snack', 'sweet', 'drink', 'fruit', 'dairy', 'packaged',
];

/**
 * A row's source line, with the TAGS made tappable.
 *
 * §11.8's exemption rests on every row carrying a source "a doctor can be
 * shown". `Source: LFAC` satisfies that for whoever wrote the row and nobody
 * else; the tag is an abbreviation whose expansion lived only in
 * `docs/CARBS.md`. Here it is a control: tap it and the panel says which book,
 * whose laboratory, and — the part that matters — whether the number was
 * MEASURED or calculated.
 *
 * The rest of a source string is left as plain text. A source reads
 * "CoFID, USDA-SR hard candy — spread retained", and only the tags have a
 * definition to give; making the whole string tappable would promise
 * explanations that do not exist.
 *
 * Longest tag first, so `USDA-SR` is matched before `USDA` would swallow its
 * first four letters and leave `-SR` behind as prose.
 */
const SOURCE_TAGS = ['USDA-SR', 'FNDDS', 'CoFID', 'LFAC', 'CALC', 'KHAN', 'USDA', 'NIN'] as const;

function SourceTags({ source, onTerm }: {
  readonly source: string;
  readonly onTerm: (key: string) => void;
}): JSX.Element {
  const pattern = new RegExp(`(${SOURCE_TAGS.join('|')})`, 'g');
  const parts = source.split(pattern);
  return (
    <>
      {parts.map((part, at) => ((SOURCE_TAGS as readonly string[]).includes(part) ? (
        <Button key={`${part}-${String(at)}`} class="link source-tag"
          onPress={() => { onTerm(`src:${part}`); }}>{part}</Button>
      ) : part))}
    </>
  );
}

/**
 * One row. Grams lead, because grams are what the app asks for and what the
 * reader came here to get — the name is how you find the row, the number is
 * why you wanted it.
 */
function FoodRow({
  food, count, mine, editing, draft, onAdd, onRemove, onEditMine, onMineDraft,
  onSaveMine, onTerm, timeZone, vesselRatioSet, vesselSetAt,
}: {
  readonly food: Food;
  readonly count: number;
  /** Phase 2 — the reader's own figure for this food, or null. */
  readonly mine: { readonly grams: number; readonly setAt: number } | null;
  readonly editing: boolean;
  readonly draft: string;
  readonly onAdd: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onEditMine: (id: string | null) => void;
  /**
   * T31 — the ratio in force for THIS row's vessel, or null.
   *
   * Passed rather than looked up inside, so the row need not know where
   * calibrations live, and so a row with no vessel is structurally incapable
   * of showing a plate line.
   */
  readonly vesselRatioSet: number | null;
  readonly vesselSetAt: number | null;
  /** Whether a plate ratio is in force at all — the raita rows have no vessel
   *  of their own, so they cannot tell from `vesselRatioSet`. */
  readonly onMineDraft: (text: string) => void;
  readonly onSaveMine: (id: string, grams: number | null) => void;
  readonly onTerm: (key: string) => void;
  readonly timeZone: string;
}): JSX.Element {
  const COPY = useCopy();
  const text = textOf(food, COPY);
  // PHASE 2: the reader's figure REPLACES the reference in the headline, and
  // the reference moves to the line beneath with the date it was set. It is
  // not shown alongside as an alternative — a row offering two numbers is a
  // question, and this screen exists to answer one.
  // A vessel ratio scales the headline for the same reason a per-food figure
  // replaces it: the row must state the number the app will dose. It did not,
  // and the result was a row reading "84–94 g" while the tally counted 126 —
  // on a screen whose whole design is "you read a number and type it yourself".
  // A reader who typed what the row said would have under-dosed at ratios
  // above 1 and OVER-dosed at ratios below it.
  //
  // `gramsMax` scales too, and stays display-only: the dose comes off the
  // floor, scaled, exactly as it does on every unscaled row.
  const scale = mine === null && vesselRatioSet !== null ? vesselRatioSet : 1;
  const low = displayGrams(food.grams * scale);
  const high = food.gramsMax === null ? null : displayGrams(food.gramsMax * scale);
  const amount = mine !== null
    ? COPY.foods.gramsOne(String(mine.grams))
    : high === null
      ? COPY.foods.gramsOne(String(low))
      : COPY.foods.gramsRange(String(low), String(high));

  return (
    <li class="li food">
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
          {fullName(food, COPY)}
        </div>
        <div class="hint">{text.portion}</div>
        {/* §11.8's second condition, on screen. A value whose confidence is
            hidden is presented with the authority of a lab measurement, and the
            gap between those two things is what this table is built on. */}
        {text.varies === null ? null : (
          <div class="hint">{COPY.foods.variesPrefix + text.varies}</div>
        )}
        {/* PHASE 2's second constraint, on screen: the reference figure this
            replaced, and when the reader chose to replace it. A calibration
            set two years ago is a different claim from one set last week, and
            without the date there is no way to tell them apart. */}
        {mine === null ? null : (
          <div class="hint mine-was">
            {COPY.foods.mineWas(String(food.grams), formatDayAndMonth(mine.setAt, timeZone))}
          </div>
        )}
        {/* T31 — the plate line. Shown only when this row's vessel is
            calibrated AND the reader has NOT set a per-food figure, because
            per-food beats vessel and two provenance lines on one row is a
            question rather than an answer. */}
        {/* Once a plate is set, "1 plate, 300 g" beside a 77 g figure is a
            false sentence. This line is what makes the row true again — and it
            is only on the rows that actually scaled, never on all seven. */}
        {mine === null && vesselRatioSet !== null && vesselSetAt !== null && food.vessel !== null ? (
          <div class="hint mine-was">
            {COPY.foods.plateRowYours(
              String(displayGrams(food.vessel.grams * vesselRatioSet)),
              formatDayAndMonth(vesselSetAt, timeZone),
            )}
          </div>
        ) : null}
        <div class="clinical">
          {`${COPY.foods.confidenceLabel[food.confidence]} · ${COPY.foods.sourcePrefix}`}
          <SourceTags source={food.source} onTerm={onTerm} />
        </div>
        {/* The calibration box, when open, ABOVE the actions rather than in
            place of them. Putting it in the other arm of a ternary took the
            stepper off the row entirely while the box was open — so a reader
            who opened "use my own figure" could no longer add the food until
            they closed it again. */}
      </div>
      <div class="v">{amount}</div>

      {editing ? (
          <div class="mine-edit">
            <label for={`mine-${food.id}`}>{COPY.foods.mineLabel}</label>
            <p class="hint">{COPY.foods.mineHint(
              food.gramsMax === null
                ? COPY.foods.gramsOne(String(food.grams))
                : COPY.foods.gramsRange(String(food.grams), String(food.gramsMax)),
            )}</p>
            {/* `inputMode="decimal"` rather than `numeric`: a phone keypad
                without a decimal point cannot type a figure this field now
                accepts. The value comes from the draft, never from the saved
                number — see `ViewState.mineDraft` for what that repairs. */}
            <TextInput
              id={`mine-${food.id}`}
              type="text"
              inputMode="decimal"
              data-field={`mine-${food.id}`}
              value={draft}
              autocomplete="off"
              onValue={(value: string) => {
                onMineDraft(value);
                const trimmed = value.trim();
                if (trimmed === '') { onSaveMine(food.id, null); return; }
                // A trailing point, a lone point and a lone minus are all
                // half-typed numbers rather than wrong ones: keep the text and
                // save nothing until it means something.
                if (!/^\d+(\.\d+)?$/.test(trimmed)) return;
                const grams = Number(trimmed);
                if (!Number.isFinite(grams)) return;
                onSaveMine(food.id, grams);
              }}
            />
            <Button class="link" onPress={() => { onEditMine(null); }}>{COPY.foods.mineSave}</Button>
            {mine === null ? null : (
              <Button class="link" onPress={() => { onSaveMine(food.id, null); onEditMine(null); }}>
                {COPY.foods.mineClear}
              </Button>
            )}
          </div>
        ) : null}

        {/*
         * ONE LINE, two ends: the quiet control on the leading edge and the
         * stepper on the trailing one.
         *
         * They were stacked — the stepper orphaned under the gram figure in a
         * 76px column, and "use my own figure" alone on a line below the
         * source, which reads as a full-width button for a niche action.
         * Momin's fix, and he is right: the two belong on the same line because
         * they are the two things you can DO to a row, and the one you do
         * constantly should be the one that stands out.
         */}
        <div class="row-actions">
          {editing ? <span /> : (
            <Button class="link mine-open" onPress={() => { onEditMine(food.id); }}>
              {mine === null ? COPY.foods.mineSet : COPY.foods.mineChange}
            </Button>
          )}
          {/* Minus appears only once there is something to remove — the same
              argument the search-clear button makes about a control that does
              nothing most of the time. */}
          <div class="tally">
            {count === 0 ? null : (
              <Button class="tally-step drop" aria-label={COPY.foods.removeOne}
                onPress={() => { onRemove(food.id); }}>{'\u2212'}</Button>
            )}
            {count === 0 ? null : <span class="tally-n">{COPY.foods.tallyCount(count)}</span>}
            <Button class="tally-step add" aria-label={COPY.foods.addOne}
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
/**
 * T31 — the plate, as ONE control with ONE field.
 *
 * This replaced a three-screen flow that sat on each of seven rows. It was one
 * setting wearing the clothes of seven, and it asked everybody for the empty
 * plate to support the minority of scales with no tare button.
 *
 * So the default path is one number — the food you serve yourself — and the
 * reader whose scale cannot zero taps one link to get the second field beside
 * it. Same screen either way.
 *
 * It lives at the head of the rice group because every row it touches is in
 * that group: four list rows, the biryani grid's three plate cells, and the
 * three raita composites it deliberately does not scale.
 */
/**
 * The row the plate panel quotes as its worked example, and the dawat row that
 * bounds it.
 *
 * Read from the table rather than written here, so both move when the figures
 * do. The dawat rows are the everyday rows times exactly 400/300 — 51 → 68,
 * 57 → 76 — which is why that ratio is the last one this table's own data
 * corroborates, and the right place to ask "is that really your serving?".
 */
const PLATE_REFERENCE = FOODS.find((food) => food.id === 'biryani-mid-plate');
const PLATE_DAWAT = FOODS.find((food) => food.id === 'biryani-mid-dawat');
/**
 * Every category that holds at least one row served in a calibrated vessel.
 *
 * Derived, not written down. Today every plate row is in `rice`, so this is
 * `{'rice'}` — but it was `PLATE_REFERENCE.category`, which followed ONE row,
 * and a plate row added to salan would have left the panel behind in rice with
 * no way to reach the setting the new row obeys.
 */
const PLATE_GROUPS: ReadonlySet<string> = new Set(
  FOODS.filter((food) => food.vessel !== null).map((food) => food.category),
);

/**
 * The serving above which the panel asks whether the plate got weighed too.
 *
 * The dawat rows are the everyday rows scaled by 400/300, so 400 g is the
 * largest serving this table's own figures corroborate. Computed from the two
 * rows rather than written as 400, so it moves if they ever do.
 */
const plateAdvisoryGrams =
  PLATE_DAWAT === undefined || PLATE_REFERENCE === undefined
    ? 0
    : Math.round((PLATE_REFERENCE.vessel?.grams ?? 0) * PLATE_DAWAT.grams / PLATE_REFERENCE.grams);

function PlatePanel({
  vesselGrams, dawatGrams, exampleName, exampleGrams, ratio, setAt,
  open, foodDraft, emptyDraft, noTare, asserted,
  onOpen, onFoodDraft, onEmptyDraft, onNoTare, onAssert, onSave, onClear,
}: {
  readonly vesselGrams: number;
  readonly dawatGrams: number;
  readonly exampleName: string;
  readonly exampleGrams: number;
  readonly ratio: number | null;
  readonly setAt: number | null;
  readonly open: boolean;
  readonly foodDraft: string;
  readonly emptyDraft: string;
  readonly noTare: boolean;
  readonly asserted: boolean;
  readonly onOpen: (open: boolean) => void;
  readonly onFoodDraft: (value: string) => void;
  readonly onEmptyDraft: (value: string) => void;
  readonly onNoTare: (on: boolean) => void;
  readonly onAssert: () => void;
  readonly onSave: (ratio: number, empty: number, total: number) => void;
  readonly onClear: () => void;
}): JSX.Element {
  const COPY = useCopy();
  const typed = Number(foodDraft.trim());
  // `Number('')` is 0, and a blank empty-plate field therefore used to mean
  // "the plate weighs nothing" — the app stored the un-subtracted plate+food
  // weight as if it were the food. 380 g typed for a 200 g plate holding 180 g
  // of rice saved a ratio of 1.27 against a true 0.6, and doses `rice-plate` at
  // 106 g against a true 50: +5.6 units at an ICR of 10. NaN, not 0, so
  // `vesselRatio` refuses it like any other unreadable weighing.
  const emptyText = emptyDraft.trim();
  const empty = noTare ? (emptyText === '' ? Number.NaN : Number(emptyText)) : 0;
  const total = noTare ? typed : typed + empty;
  const next = vesselRatio({ emptyGrams: empty, fullGrams: total }, vesselGrams);
  const fill = total - empty;
  // Blank ONLY in the two-field mode, and only worth saying once the reader has
  // started typing the other number — otherwise the panel opens shouting.
  const emptyMissing = noTare && emptyText === '' && foodDraft.trim() !== '';
  // Above the largest serving this table describes. The dawat rows are the
  // everyday rows times exactly 400/300, so that figure is the last ratio the
  // data corroborates — past it, ask, never block.
  const heavy = next !== null && fill > dawatGrams;

  if (!open) {
    return (
      <div class="flag mint plate-panel">
        {ratio === null || setAt === null ? (
          <>
            <p>{COPY.foods.plateLead(String(vesselGrams))}</p>
            <Button class="go" onPress={() => { onOpen(true); }}>{COPY.foods.plateSet}</Button>
          </>
        ) : (
          <>
            <p>{COPY.foods.plateInForce(
              String(displayGrams(vesselGrams * ratio)), exampleName,
              String(exampleGrams), String(displayGrams(exampleGrams * ratio)),
            )}</p>
            <Button class="go quiet" onPress={() => { onOpen(true); }}>{COPY.foods.plateAgain}</Button>
            <Button class="go quiet" onPress={onClear}>{COPY.foods.plateClear(String(vesselGrams))}</Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div class="flag mint plate-panel" role="group">
      {noTare ? (
        <>
          <p class="hint">{COPY.foods.plateNoTareLead}</p>
          <div class="field">
            <TextInput value={emptyDraft} onValue={onEmptyDraft}
              aria-label={COPY.foods.plateEmptyLabel} inputMode="decimal"
              aria-required="true" aria-invalid={emptyMissing ? 'true' : undefined} />
          </div>
          <p class={`hint ${emptyMissing ? 'refused' : ''}`}>
            {emptyMissing ? COPY.foods.plateEmptyRequired : COPY.foods.plateEmptyLabel}
          </p>
          <div class="field">
            <TextInput value={foodDraft} onValue={onFoodDraft}
              aria-label={COPY.foods.plateTotalLabel} inputMode="decimal"
              aria-required="true" />
          </div>
          <p class="hint">{COPY.foods.plateTotalLabel}</p>
          {/* The subtraction, written out. Momin asked for it: if he enters 500
              and the plate was 200, he should be able to SEE 300 rather than
              trust that the app got it right. It is also the clearest possible
              confirmation that the fields went in the right boxes. */}
          {next !== null ? (
            <p class="hint">
              {COPY.foods.plateWorking(
                String(displayGrams(total)), String(displayGrams(empty)),
                String(displayGrams(fill)),
              )}
            </p>
          ) : null}
          {/* The way back. Tapping the no-TARE link used to be one-way: the only
              escape was closing the whole panel, which is not a thing a reader
              would guess. */}
          <Button class="go quiet" onPress={() => { onNoTare(false); }}>
            {COPY.foods.plateHasTare}
          </Button>
        </>
      ) : (
        <>
          <div class="field">
            <TextInput value={foodDraft} onValue={onFoodDraft}
              aria-label={COPY.foods.plateFieldLabel} inputMode="decimal" />
          </div>
          <p class="hint">{COPY.foods.plateFieldLabel}</p>
          <p class="hint">{COPY.foods.plateFoodOnly}</p>
          <Button class="go quiet" onPress={() => { onNoTare(true); }}>
            {COPY.foods.plateNoTare}
          </Button>
        </>
      )}
      <p class="hint">{COPY.foods.plateUsual}</p>
      {foodDraft.trim() !== '' && next === null ? (
        <p class="hint refused">
          {/* Three different refusals, and saying the wrong one is its own
              defect: 1500 g IS readable, it is just more than this can treat
              as one serving, and telling that reader to "type the grams as
              digits" sends them to fix a thing that is not wrong. */}
          {Number.isFinite(typed) && typed > 0 && (!noTare || Number.isFinite(empty))
            && fill > vesselGrams * VESSEL_RATIO_MAX
            ? COPY.foods.plateAboveCap(
                String(displayGrams(fill)),
                String(displayGrams(vesselGrams * VESSEL_RATIO_MAX)),
              )
            : noTare && emptyText !== '' && Number.isFinite(empty) && Number.isFinite(typed)
              ? COPY.foods.plateOrderWrong
              : COPY.foods.plateUnreadable}
        </p>
      ) : null}
      {heavy && !asserted ? (
        <>
          <p class="hint warn">{COPY.foods.plateTooHeavy(String(displayGrams(fill)), String(dawatGrams))}</p>
          <Button class="go quiet" onPress={onAssert}>{COPY.foods.plateAssert}</Button>
        </>
      ) : null}
      {/* The consequence, live, before Save rather than after it.
          The advisory tests the TOTAL, so it cannot see a forgotten tare on a
          small serving: a 200 g plate is +6.0 units at an ICR of 10 whether
          the serving is 50 g or 300 g, and 200 + 150 = 350 never trips 400.
          Nothing derivable from one number can separate plate from food — but
          this line shows what the number DOES, and a reader who served half a
          plate and reads "51 g now counts as 67 g" is watching the figure move
          the wrong way. It is the only check available that costs no second
          weighing. */}
      {next !== null ? (
        <p class="hint">
          {COPY.foods.platePreview(
            String(displayGrams(fill)), exampleName, String(exampleGrams),
            String(displayGrams(exampleGrams * next)),
          )}
        </p>
      ) : null}
      {next !== null && (!heavy || asserted) ? (
        <Button class="go" onPress={() => { onSave(next, empty, total); }}>
          {COPY.foods.plateSave}
        </Button>
      ) : null}
      <Button class="go quiet" onPress={() => { onOpen(false); }}>{COPY.glossaryClose}</Button>
    </div>
  );
}

export function FoodListScreen({
  query, openGroup, tally, calibration, vessels, editingMine, mineDraft, timeZone, resetting,
  plateRatio, plateSetAt, plateOpen, plateFoodDraft, plateEmptyDraft, plateNoTare, plateAsserted,
  onPlateOpen, onPlateFoodDraft, onPlateEmptyDraft, onPlateNoTare, onPlateAssert,
  onPlateSave, onPlateClear,
  onQuery, onToggleGroup, onAdd, onRemove, onUseTotal, onClearTally, clearing, onClearing, onEditMine, onMineDraft,
  onSaveMine, onTerm, onResetting, onResetMine,
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
  const total = tallyGrams(FOODS, tally, { foods: calibration, vessels });

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
      <div class="field wide">
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
          same as being in the table. Browsing with every group shut, all 320
          rows "contain" one and none is visible — the first version tested the
          table and explained a symbol nobody could see. */}
      {visible.some((food) => food.confidence === 'low') ? (
        <p class="hint est-note">{COPY.foods.estimateNote}</p>
      ) : null}

      {browsing ? (
        /*
         * 320 rows is 63 phone screens, measured. Collapsed groups make that
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
          <ul class="list">
            {GROUPS.map((group) => {
              const rows = FOODS.filter((food) => food.category === group);
              const open = openGroup === group;
              return (
                <li key={group} class={open ? 'group open' : 'group'}>
                  <Button
                    class="go quiet group-head"
                    aria-expanded={open}
                    onPress={() => { onToggleGroup(group); }}
                  >
                    {/* The chevron is drawn by CSS rather than rendered here.
                        `aria-hidden` would have kept it out of the accessible
                        name but not out of `textContent`, where it arrived as
                        "▸Roti, naan and bread" — the glyph is decoration and
                        does not belong in the text at all. */}
                    <span class="group-name">{COPY.foods.categoryLabel[group]}</span>
                    <span class="tag">{COPY.foods.categoryCount(rows.length)}</span>
                  </Button>
                  {open ? (
                    <div class="group-body">
                      {/* T31 — ONE control, at the head of the group that owns
                          every row it touches: four list rows, the biryani
                          grid's three plate cells, and the three raita
                          composites it deliberately does not scale. It was on
                          each of seven rows before, which made one setting
                          look like seven. */}
                      {PLATE_GROUPS.has(group) ? (
                        <PlatePanel
                          vesselGrams={PLATE_REFERENCE?.vessel?.grams ?? 0}
                          dawatGrams={plateAdvisoryGrams}
                          exampleName={PLATE_REFERENCE === undefined ? '' : displayName(PLATE_REFERENCE, COPY)}
                          exampleGrams={PLATE_REFERENCE?.grams ?? 0}
                          ratio={plateRatio} setAt={plateSetAt}
                          open={plateOpen} foodDraft={plateFoodDraft}
                          emptyDraft={plateEmptyDraft} noTare={plateNoTare}
                          asserted={plateAsserted}
                          onOpen={onPlateOpen} onFoodDraft={onPlateFoodDraft}
                          onEmptyDraft={onPlateEmptyDraft} onNoTare={onPlateNoTare}
                          onAssert={onPlateAssert} onSave={onPlateSave} onClear={onPlateClear}
                        />
                      ) : null}
                      {/* The two-dimensional families first, as tables. Their
                          rows are then skipped below — the same food cannot be
                          in the table AND under it, or the tally would offer
                          two ways to add one cup of chai. */}
                      {MATRICES.filter((matrix) => matrix.category === group).map((matrix) => (
                        <Matrix key={matrix.key} matrix={matrix}
                          tally={tally} calibration={calibration} vessels={vessels}
                          onAdd={onAdd} onRemove={onRemove} />
                      ))}
                      <ul class="list">
                      {rows.filter((food) => !IN_A_MATRIX.has(food.id)).map((food) => (
                        <FoodRow key={food.id} food={food}
                          count={tally[food.id] ?? 0} onAdd={onAdd} onRemove={onRemove}
                          mine={calibration[food.id] ?? null} editing={editingMine === food.id}
                          draft={mineDraft} onMineDraft={onMineDraft} onTerm={onTerm}
                          onEditMine={onEditMine} onSaveMine={onSaveMine} timeZone={timeZone}
                          vesselRatioSet={food.vessel === null
                            ? null
                            : (vessels[food.vessel.id]?.ratio ?? null)}
                          vesselSetAt={plateSetAt} />
                      ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {/* THE SUGAR-FREE ANSWER, above whatever the search did or did not find.
          Not folded into the empty state, because "gum" may one day match a row
          and the explanation would then disappear exactly when a reader is
          looking at a number they should not dose from. See
          `asksAboutSugarFree` for why an unexplained absence is the hazard. */}
      {asksAboutSugarFree(query) ? (
        <div class="flag sugar-free">
          <b>{COPY.foods.sugarFreeTitle}</b>
          <p>{COPY.foods.sugarFreeDrinks}</p>
          <p>{COPY.foods.sugarFreeSweets}</p>
        </div>
      ) : null}
      {/* T31 — the same one panel, above the hits, when a search turns up a
          row the plate setting governs. It used to render only inside the
          group body, so a reader who always searches "biryani" never met the
          control that decides what their biryani row counts as. Same state,
          same handlers: it is one setting shown in the two places it is
          relevant, not two settings. */}
      {!browsing && shown.some((food) => food.vessel !== null) ? (
        <PlatePanel
          vesselGrams={PLATE_REFERENCE?.vessel?.grams ?? 0}
          dawatGrams={plateAdvisoryGrams}
          exampleName={PLATE_REFERENCE === undefined ? '' : displayName(PLATE_REFERENCE, COPY)}
          exampleGrams={PLATE_REFERENCE?.grams ?? 0}
          ratio={plateRatio} setAt={plateSetAt}
          open={plateOpen} foodDraft={plateFoodDraft}
          emptyDraft={plateEmptyDraft} noTare={plateNoTare}
          asserted={plateAsserted}
          onOpen={onPlateOpen} onFoodDraft={onPlateFoodDraft}
          onEmptyDraft={onPlateEmptyDraft} onNoTare={onPlateNoTare}
          onAssert={onPlateAssert} onSave={onPlateSave} onClear={onPlateClear}
        />
      ) : null}
      {browsing ? null : shown.length === 0 ? (
        <p class="flag">{COPY.foods.empty(query)}</p>
      ) : (
        <ul class="list">
          {shown.map((food) => (
            <FoodRow key={food.id} food={food}
              count={tally[food.id] ?? 0} onAdd={onAdd} onRemove={onRemove}
              mine={calibration[food.id] ?? null} editing={editingMine === food.id}
              draft={mineDraft} onMineDraft={onMineDraft} onTerm={onTerm}
              onEditMine={onEditMine} onSaveMine={onSaveMine} timeZone={timeZone}
              vesselRatioSet={food.vessel === null
                ? null
                : (vessels[food.vessel.id]?.ratio ?? null)}
              vesselSetAt={plateSetAt} />
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
          {/* The total and the throw-away share a line. They were stacked,
              and with the button and the hint under them the bar was four
              full-width blocks deep — on a 320px screen that is most of what
              is left below the list. Side by side costs one row instead of
              two and takes nothing away: the link keeps its own 48px target,
              it is just no longer alone on its own line. */}
          <div class="tally-head">
            <div class="tally-sum">{COPY.foods.tallyTotal(picked, String(total))}</div>
            {/* Asks before it throws the list away, in the SAME place rather
                than on a screen of its own — Momin's shape: "not another UI,
                but on the same place where the start list again is written".
                A mis-tap now costs one more tap, not the whole list. The same
                two-step the calibration reset already uses. */}
            {clearing ? (
              <span class="tally-confirm">
                <b class="tally-ask">{COPY.foods.tallyClearAsk}</b>
                <Button class="link tally-yes" onPress={() => { onClearing(false); onClearTally(); }}>
                  {COPY.foods.tallyClearYes}
                </Button>
                <Button class="link tally-no" onPress={() => { onClearing(false); }}>
                  {COPY.foods.tallyClearNo}
                </Button>
              </span>
            ) : (
              <Button class="link tally-clear" onPress={() => { onClearing(true); }}>
                {COPY.foods.tallyClear}
              </Button>
            )}
          </div>
          <Button class="go" onPress={() => { onUseTotal(total); }}>{COPY.foods.tallyUse}</Button>
          <p class="hint">{COPY.foods.tallyCheck}</p>
        </div>
      )}

      {/*
       * Clearing every calibration at once, and ONLY once there is more than
       * one to clear — a reader who has set a single figure has the per-row
       * control right there and does not need a second way to undo it.
       *
       * Behind a confirm, because it destroys work a person did by weighing
       * things, and §7.6's rule is that a destructive control names what it
       * will destroy before it does it.
       */}
      {/* Whenever there is ANY. It was "more than one", on the reasoning that a
          reader with a single calibration has the per-row control right there —
          and Momin had exactly one, went looking for this, and could not find
          it. A control that exists only above a threshold is a control people
          learn does not exist. */}
      {Object.keys(calibration).length > 0 ? (
        <div class="card-actions">
          {resetting ? (
            <div class="flag">
              <b>{COPY.foods.mineResetAll(Object.keys(calibration).length)}</b>
              <div class="card-actions-row">
                <Button class="go danger" onPress={onResetMine}>
                  {COPY.foods.mineResetConfirm}
                </Button>
                <Button class="link" onPress={() => { onResetting(false); }}>
                  {COPY.foods.mineResetCancel}
                </Button>
              </div>
            </div>
          ) : (
            <Button class="link" onPress={() => { onResetting(true); }}>
              {COPY.foods.mineResetAll(Object.keys(calibration).length)}
            </Button>
          )}
        </div>
      ) : null}

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
