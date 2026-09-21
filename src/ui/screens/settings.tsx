/**
 * §10.1 — naming the two ratios, and §1.3's basal block.
 *
 * **Eleven of forty-six audited apps had one of these ratios INVERTED**, and the
 * two reference devices disagree on the form: Roche multiplies by sensitivity,
 * Medtronic divides. So §10.1's first rule is that the short form is never the
 * primary label — the setting is a SENTENCE with the number in it.
 */

import {
  DEFAULT_MODE,
  RANGE,
} from '../../config.js';
import { parseField, withinHardRange, withinSoftBand } from '../../core/parse.js';
import { modeNeedsAcknowledgement } from '../../core/round.js';
import type { JSX } from 'preact';
import { COPY } from '../copy.js';
import { Button, TextInput } from '../components.js';
import type { RoundingMode, Settings } from '../../core/types.js';
import { classEatDelay } from '../../core/insulin.js';
import { INSULINS } from '../../data/insulins.js';
import { waitInWords } from './insulin.js';

export interface SettingsDraft {
  readonly target: string;
  readonly isf: string;
  readonly icr: string;
  readonly roundingMode: RoundingMode;
  /**
   * §8.5 — answered on its own screen, and held here because on a FIRST RUN
   * there is nowhere else for it to live: `commitSettings` needs the three
   * ratios, and the insulin question is asked before them. An existing install
   * commits the answer immediately instead and this only mirrors the store.
   */
  readonly bolusId: string;
  /** §8.5 — the reader's own doctor's wait, in minutes. Empty means the class range. */
  readonly eatDelay: string;
  readonly threshold: string;
  readonly basalName: string;
  readonly basalUnits: string;
  readonly basalTiming: string;
  readonly personName: string;
}

export function draftFrom(settings: Settings | null): SettingsDraft {
  // §1.2, RESTORED 2026-09-13 by the audience change. The three ratios start
  // EMPTY. They used to be prefilled with one person's prescription, and the
  // justification for overriding §1.2 was that this app had one user; it no
  // longer does. `src/config.ts` carries the full argument where the constants
  // used to be.
  //
  // The threshold starts empty too and is filled in by the shell once the three
  // ratios are valid — see `deriveThreshold`. It cannot be defaulted here
  // because it is computed FROM them, and on first run there is nothing yet to
  // compute it from.
  //
  // §4.4's refuse-on-empty-settings branch is live exactly as it always was:
  // nothing is stored until the explicit save, and `buildSnapshot` reads the
  // STORE rather than this draft.
  if (settings === null) {
    return {
      target: '',
      isf: '',
      icr: '',
      roundingMode: DEFAULT_MODE,
      bolusId: '',
      eatDelay: '',
      threshold: '',
      basalName: '',
      basalUnits: '',
      basalTiming: '',
      personName: '',
    };
  }
  return {
    target: String(settings.target),
    isf: String(settings.isf),
    icr: String(settings.icr),
    roundingMode: settings.roundingMode,
    bolusId: settings.bolusId,
    // §4.1 — null is "not given" and 0 is a real answer (an ultra-rapid
    // analogue is injected at the start of the meal). `String(0)` is "0" and
    // only null becomes the empty field.
    eatDelay: settings.eatDelayMinutes === null ? '' : String(settings.eatDelayMinutes),
    threshold: String(settings.threshold),
    basalName: settings.basalName,
    basalUnits: String(settings.basalUnits),
    basalTiming: settings.basalTiming,
    personName: settings.personName,
  };
}

export interface FieldProblem {
  readonly field: keyof SettingsDraft;
  readonly message: string;
  /** §4.5 — a soft-band miss is CONFIRMED ONCE, never refused. */
  readonly confirmable: boolean;
}

const NUMERIC: readonly (keyof SettingsDraft & keyof typeof RANGE)[] = [
  'target',
  'isf',
  'icr',
  'threshold',
  'basalUnits',
];

/**
 * §8.5 — checked when filled, accepted when empty.
 *
 * The one optional number on this screen, and it needs its own list rather than
 * an exception inside the loop: every field in `NUMERIC` is REQUIRED, and a
 * conditional inside that loop would be the place a future required field
 * quietly became optional. Empty here means "use the class range", which is a
 * real answer and the default one.
 *
 * The draft key and the `RANGE` key differ — `eatDelay` on both sides, but the
 * pairing is spelled out because `parseField` and `withinHardRange` are keyed
 * by the RANGE name and nothing would notice a mismatch.
 */
const OPTIONAL_NUMERIC: readonly {
  readonly field: keyof SettingsDraft;
  readonly range: keyof typeof RANGE;
}[] = [{ field: 'eatDelay', range: 'eatDelay' }];

export function checkDraft(draft: SettingsDraft): FieldProblem[] {
  const problems: FieldProblem[] = [];
  for (const field of NUMERIC) {
    const parsed = parseField(draft[field], field);
    if (parsed.state === 'empty') {
      // Was "There is no default", which stopped being true when §1.2's ruling
      // prefilled three of these. A message that asserts something false about
      // the app is worse than a shorter one that does not.
      problems.push({
        field,
        message: COPY.settings.fieldRequired,
        confirmable: false,
      });
      continue;
    }
    if (parsed.state === 'invalid') {
      problems.push({ field, message: COPY.lexical(parsed.reason), confirmable: false });
      continue;
    }
    const value = parsed.state === 'zero' ? 0 : parsed.value;
    if (!withinHardRange(value, field)) {
      const [lo, hi] = RANGE[field].hard;
      problems.push({
        field,
        message: COPY.settings.outOfHardRange(String(lo), String(hi)),
        confirmable: false,
      });
      continue;
    }
    if (!withinSoftBand(value, field)) {
      // §10.5 — "the first confirmation a user ever sees must not be a false
      // alarm: the out-of-range prompt on the physician's own target is worded
      // as a ONE-TIME ACKNOWLEDGEMENT OF AN UNUSUAL-BUT-INTENDED VALUE, not a
      // warning." His target of 150 sits outside 90-140 on purpose.
      problems.push({ field, message: COPY.settings.softConfirm, confirmable: true });
    }
  }
  for (const { field, range } of OPTIONAL_NUMERIC) {
    const parsed = parseField(draft[field], range);
    if (parsed.state === 'empty') continue;
    if (parsed.state === 'invalid') {
      problems.push({ field, message: COPY.lexical(parsed.reason), confirmable: false });
      continue;
    }
    const value = parsed.state === 'zero' ? 0 : parsed.value;
    if (!withinHardRange(value, range)) {
      const [lo, hi] = RANGE[range].hard;
      problems.push({
        field,
        message: COPY.settings.outOfHardRange(String(lo), String(hi)),
        confirmable: false,
      });
      continue;
    }
    if (!withinSoftBand(value, range)) {
      problems.push({ field, message: COPY.settings.softConfirm, confirmable: true });
    }
  }
  return problems;
}

/** §10.1.6 — the delta confirmation, which catches what nothing else can. */
export interface Delta {
  readonly label: string;
  readonly was: string;
  readonly now: string;
}

export function deltasFor(settings: Settings | null, draft: SettingsDraft): Delta[] {
  if (settings === null) return [];
  const deltas: Delta[] = [];
  // A ratio fat-fingered from 10 to 40 is INSIDE the soft range, produces 5
  // units instead of 20 on a 200 g meal, passes every other check, and trends
  // toward ketoacidosis over days. Only showing the delta catches it.
  if (draft.icr !== String(settings.icr)) {
    deltas.push({
      label: COPY.settings.deltaIcr,
      was: COPY.settings.icrSentence(String(settings.icr)),
      now: COPY.settings.icrSentence(draft.icr),
    });
  }
  if (draft.isf !== String(settings.isf)) {
    deltas.push({
      label: COPY.settings.deltaIsf,
      was: COPY.settings.isfSentence(String(settings.isf)),
      now: COPY.settings.isfSentence(draft.isf),
    });
  }
  if (draft.target !== String(settings.target)) {
    deltas.push({
      label: COPY.settings.deltaTarget,
      was: `${String(settings.target)}\u00A0mg/dL`,
      now: `${draft.target}\u00A0mg/dL`,
    });
  }
  return deltas;
}

export interface SettingsHandlers {
  readonly onChange: (field: keyof SettingsDraft, value: string) => void;
  /** §8.5 — opens the picker. The answer comes back into the draft. */
  readonly onChangeInsulin: () => void;
  readonly onSave: () => void;
  readonly onAcknowledgeCeil: () => void;
  readonly onOpenClear: () => void;
  readonly onOpenExport: () => void;
  readonly onOpenHowItWorks: () => void;
  readonly onOpenSettingsAsText: () => void;
  readonly ceilAcknowledged: boolean;
  readonly firstRun: boolean;
  readonly advisoryStatus: string;
}

/**
 * A free-text field — the name, and §1.3's two basal strings.
 *
 * Separate from `NumberField` because it carries no keypad claim, no range and
 * no problem line. It exists so that no screen hand-rolls an `<input>`: every
 * text field in the app goes through one of these two components, which is what
 * makes "does every field have a stable identity" a question with one place to
 * look rather than a grep.
 */
function TextField({
  id,
  label,
  value,
  describedBy,
  wide,
  hint,
  onChange,
}: {
  readonly id: keyof SettingsDraft;
  readonly label: string;
  readonly value: string;
  readonly describedBy?: string;
  readonly wide?: boolean;
  readonly hint?: string;
  readonly onChange: (field: keyof SettingsDraft, value: string) => void;
}): JSX.Element {
  return (
    <div class={wide === true ? 'field wide' : 'field'}>
      <label id={describedBy}>{label}</label>
      {/*
        A DIRECT CHILD of `.field`, with no wrapper, and that is load-bearing.
        `.field` is `display: grid` (styles.css) and nothing sets an input's
        width — `.field.wide input` only lifts the 9rem cap. A wide input is
        full width because it is a GRID ITEM and stretches; put it inside a
        plain `<div>` and it falls back to its intrinsic size instead.

        Measured in Chrome at the moment this was got wrong: wrapping the two
        basal fields took them from 440px to 223px, about half. `NumberField`
        below keeps its wrapper because it genuinely needs one — the suffix span
        sits beside the input — and it is not `wide`, so the cap decides its
        width either way.
      */}
      <TextInput
        type="text"
        // §10.7 — these are transient measurements, and offering a stale
        // previous value is an active hazard.
        autocomplete="off"
        value={value}
        aria-describedby={describedBy}
        data-field={id}
        onValue={(next) => { onChange(id, next); }}
      />
      {hint === undefined ? null : <p class="clinical">{hint}</p>}
    </div>
  );
}

interface NumberFieldProps {
  readonly id: keyof SettingsDraft;
  readonly label: string;
  readonly value: string;
  readonly problem: FieldProblem | undefined;
  readonly onChange: (field: keyof SettingsDraft, value: string) => void;
  readonly decimal: boolean;
  readonly clinical?: string;
  readonly suffix?: string;
  /**
   * The clinician's shorthand, shown beside the question rather than only in
   * the small print below it. §10.1 keeps the QUESTION in plain words on
   * purpose, and that stands — this adds the name he needs to repeat back at
   * an appointment ("my ISF is 30"), which was previously buried in a grey
   * line under the field.
   */
  readonly tag?: string;
  /**
   * One glyph naming the SUBJECT — blood (target, ISF) or food (ICR) — so the
   * two groups are distinguishable at a glance while scrolling.
   *
   * §10.1 item 5's rule is "group by subject... never colour alone", and a
   * glyph is not colour: it survives greyscale and colour-blindness. It is
   * `aria-hidden` because the heading and the label already say which group
   * this is, and a screen reader announcing "droplet" adds nothing.
   */
  readonly icon?: string;
}

function NumberField({
  id,
  label,
  value,
  problem,
  onChange,
  decimal,
  clinical,
  suffix,
  tag,
  icon,
}: NumberFieldProps): JSX.Element {
  return (
    <div class="field">
      <label id={`label-${id}`}>
        {icon === undefined ? null : (
          <span class="field-icon" aria-hidden="true">{icon}</span>
        )}
        {label}
        {tag === undefined ? null : <span class="tag">{tag}</span>}
      </label>
      <div>
        <TextInput
          // §10.7 — `type="text"` with `inputmode`, NEVER `type="number"`, whose
          // invalid values are silently set to empty string per spec with no way
          // to read the raw input. §4.1's four states depend on reading it.
          type="text"
          // §10.1 item 2 — the keypad claim, per field.
          inputmode={decimal ? 'decimal' : 'numeric'}
          // §10.7 — these are transient measurements, and offering a stale
          // previous value is an active hazard.
          autocomplete="off"
          value={value}
          aria-describedby={`label-${id}`}
          // The field's stable identity. It no longer drives a focus restore —
          // nothing restores focus, because nothing destroys the field — but it
          // is how anything else finds this input, the continuity tests
          // included.
          data-field={id}
          onValue={(next) => { onChange(id, next); }}
        />
        {suffix === undefined ? null : <span class="clinical">{` ${suffix}`}</span>}
      </div>
      {clinical === undefined ? null : <p class="clinical">{clinical}</p>}
      {/* §10.5 — "the first confirmation a user ever sees must not be a false
          alarm." A soft-band miss is an acknowledgement of an
          unusual-but-intended value, and rendering it in the same red as a
          blocking error contradicts the wording it was given: his prescribed
          target of 150 sits outside 90-140 ON PURPOSE, and it was showing up
          looking like a mistake. */}
      {problem === undefined ? null : (
        <p class={problem.confirmable ? 'caution' : 'error'}>{problem.message}</p>
      )}
    </div>
  );
}

/**
 * The buttons ARE `COPY.rounding.modes` — the same list the how-it-works page
 * explains, each entry carrying the mode it sets. Until 2026-09-13 the five
 * names existed twice, here and there, so renaming one left the other
 * disagreeing about what the button is called (§10.2).
 */
const MODES = COPY.rounding.modes;

export function SettingsScreen({
  draft,
  settings,
  handlers,
  storageDurable,
  storageWarningOff,
  onStopStorageWarning,
}: {
  readonly draft: SettingsDraft;
  readonly settings: Settings | null;
  readonly handlers: SettingsHandlers;
  /**
   * §12's answer: `true` durable, `false` evictable, `null` the browser will not
   * say, `undefined` it has not answered yet. Four cases because the question is
   * asynchronous and has three answers — reporting "at risk" while the answer is
   * still in flight would be a guess, which is the thing §12 forbids.
   */
  readonly storageDurable: boolean | null | undefined;
  /** §12 — an explicit tap, persisted. The warning stays; only the reminder stops. */
  readonly storageWarningOff: boolean;
  readonly onStopStorageWarning: () => void;
}): JSX.Element {
  const problems = checkDraft(draft);
  const problemFor = (field: keyof SettingsDraft): FieldProblem | undefined =>
    problems.find((problem) => problem.field === field);
  // §8.5 — read off the DRAFT rather than off `settings`, so on a first run the
  // answer given two screens ago is visible before anything has been stored.
  const insulin = INSULINS.find((row) => row.id === draft.bolusId);
  const insulinBrand = insulin?.brand ?? null;
  const insulinMolecule = insulin?.molecule ?? null;
  const insulinClass = insulin === undefined ? null : insulin.insulinClass;
  const classWait = waitInWords(classEatDelay(insulinClass));
  const ownParsed = parseField(draft.eatDelay, 'eatDelay');
  const ownWait =
    ownParsed.state === 'valid' || ownParsed.state === 'zero'
      ? COPY.insulin.waitOwnSet(String(ownParsed.value))
      : null;
  const blocking = problems.filter((problem) => !problem.confirmable);
  const deltas = deltasFor(settings, draft);
  const needsCeilAck = modeNeedsAcknowledgement(draft.roundingMode) && !handlers.ceilAcknowledged;

  return (
    <div class="screen">
      <h1>{handlers.firstRun ? COPY.settings.titleFirstRun : COPY.settings.title}</h1>

      {/* §1.2 as ruled — the three prescribed values arrive PREFILLED, and a
          prefill that does not announce itself is the silent default §1.2
          refused. This flag is what makes it visible, and it says what is still
          outstanding so a blocked save reads as work-to-do rather than as a
          broken button. */}
      {handlers.firstRun ? (
        <div class="flag mint">
          <b>{COPY.settings.setupTitle}</b>
          {COPY.settings.setupBody}
          {/* §10.6 — until now the ONE moment the app asks for ISF and ICR was
              the one moment the explanation was unreachable: the button list
              below is gated on `!firstRun`, so "How this works" did not exist
              during setup.

              One link, inside the flag that already names all three numbers and
              already asks the reader to check them. NOT one per field: two
              controls sharing an accessible name is the defect the export
              buttons were renamed to fix.

              It is only safe because `view.screenBefore` now exists. Back from
              that page used to dispatch a hardcoded 'calculator', which
              mid-setup exposes a foot nav whose Settings renders
              `firstRun: false` — §10.6's inescapable gate walked around rather
              than broken. */}
          <div class="sheet">
            <Button class="go quiet" onPress={handlers.onOpenHowItWorks}>
              {COPY.explain.whatDoTheseMean}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Who Hasham is, said once, in the app's only first-person sentence. The
          three ratio hints name him and nothing else ever did. Outside the card
          above so it does not compete with "nothing is filled in, on purpose". */}
      {handlers.firstRun ? <p class="hint">{COPY.settings.builtFor}</p> : null}

      {/* Optional, and first, because it is the only question here that is not
          clinical — asking it among the ratios would imply it carries the same
          weight. It changes nothing the app calculates. */}
      <TextField
        id="personName"
        label={COPY.settings.nameQuestion}
        value={draft.personName}
        describedBy="label-personName"
        hint={COPY.settings.nameHint}
        onChange={handlers.onChange}
      />

      {/* §10.1 item 5 — GROUP BY SUBJECT. "Two identical number rows stacked is
          the layout that invites transposition." Blood-sugar settings in one
          group, food in another, distinguished by heading — never colour
          alone. */}
      <h2>{COPY.settings.sectionBloodSugar}</h2>
      <NumberField
        id="target"
        label={COPY.settings.targetQuestion}
        value={draft.target}
        problem={problemFor('target')}
        onChange={handlers.onChange}
        decimal={false}
        suffix="mg/dL"
        tag="TARGET"
        icon={'\u{1FA78}'}
        clinical={COPY.settings.targetClinical}
      />
      <NumberField
        id="isf"
        label={COPY.settings.isfQuestion}
        value={draft.isf}
        problem={problemFor('isf')}
        onChange={handlers.onChange}
        // §10.1 — the ratios KEEP their decimal key. A sensitivity or a
        // carbohydrate ratio can legitimately carry a fraction.
        decimal
        tag="ISF"
        icon={'\u{1FA78}'}
        suffix={COPY.settings.isfSuffix}
        clinical={COPY.settings.isfClinical}
      />
      {draft.isf === '' ? null : <p class="hint">{COPY.settings.isfSentence(draft.isf)}</p>}

      <h2>{COPY.settings.sectionFood}</h2>
      <NumberField
        id="icr"
        label={COPY.settings.icrQuestion}
        value={draft.icr}
        problem={problemFor('icr')}
        onChange={handlers.onChange}
        decimal
        suffix={COPY.settings.icrSuffix}
        clinical={COPY.settings.icrClinical}
        tag="ICR"
        icon={'\u{1F35A}'}
      />
      {draft.icr === '' ? null : <p class="hint">{COPY.settings.icrSentence(draft.icr)}</p>}

      {/* §8.5 — the assumption setup was always supposed to state. Placed here
          so it closes the ratios rather than opening the rounding question: the
          modes decide how many units, this decides what a unit IS.

          SET APART from the echo above it. `icrSentence` reads back the number
          just typed and belongs to that field; these two belong to the ratios as
          a whole. Run together as identical hints they read as one block, and the
          assumptions look like more small print about the box above rather than
          the conditions under which every number on this screen is wrong for
          you. A lighter rule than `.basal`'s, because this divides a section
          rather than starting one. */}
      {/* §8.5 — the answer, what it decides, and the way to change it.
          ONE selection gave both halves: the list is grouped by class but the
          reader taps a BRAND, so the app has the name for the dose label and
          the class for the two clocks without asking twice. */}
      <div class="basal">
        <h2>{COPY.insulin.settingsLabel}</h2>
        {/* `.li` — the app's existing label-and-value row, which is what this
            is. `.row` exists only inside `.working`. */}
        {/* The SAME two-line shape as the row that was tapped in the picker —
            brand in full weight, molecule under it. Momin, off a screenshot:
            one small line in a tall card read as an unfilled field. What you
            chose and what you see afterwards should look like one thing. */}
        <div class="li insulin-chosen">
          {/* Three states, not two (§4.1). "I don't know" is an ANSWER and
              says so; `Not recorded` is for an imported period this build
              cannot identify. Showing one as the other tells a reader who
              answered that the app lost it. */}
          <div class="k">
            <span class="brand">
              {insulinBrand ?? COPY.insulin.notKnownLabel(draft.bolusId)}
            </span>
            {insulinMolecule === null ? null : <span class="molecule">{insulinMolecule}</span>}
          </div>
          <Button class="more" onPress={handlers.onChangeInsulin}>
            {COPY.insulin.settingsChange}
          </Button>
        </div>
        {insulinClass === null ? (
          // No class, so no prefilled wait to state — and nothing is stated,
          // which is §8.5's point. The FIELD still appears below: for this
          // reader a prescriber's number is the only wait there could be, and
          // `insulinNote` sends them here to put it. Hiding it was the first
          // version of this screen, and it promised somewhere to write an
          // answer and then had nowhere.
          ownWait === null ? <p class="hint">{COPY.insulin.settingsTimingUnknown}</p> : null
        ) : (
          <>
            <p class="hint">{COPY.insulin.settingsTiming(classWait ?? '')}</p>
            {/* Where the prefilled number came from, on screen rather than in
                a document nobody opens. The values ship ahead of a prescriber's
                ruling, so the screen says whose they are. */}
            <p class="hint">{COPY.insulin.waitSource(insulinClass)}</p>
          </>
        )}
        <NumberField
          id="eatDelay"
          label={COPY.insulin.waitOwnLabel}
          value={draft.eatDelay}
          problem={problemFor('eatDelay')}
          onChange={handlers.onChange}
          decimal={false}
          suffix="minutes"
        />
        <p class="hint">
          {insulinClass === null ? COPY.insulin.waitOwnHintUnknown : COPY.insulin.waitOwnHint}
        </p>
        {ownWait === null ? null : <p class="settled">{ownWait}</p>}
      </div>

      {/* §8.5's concentration warning stays a HINT, and the amber panel it
          wore for one local build is recorded in `BACKLOG.md` rather than
          shipped. Momin's question was the right one — why is this important
          NOW — and the research done for entry 26 answers it against me. */}
      <div class="assumptions">
        <p class="hint">{COPY.settings.unitAssumption}</p>
        {/* §10.2 — the SAME string the how-it-works page renders, not a copy. */}
        <p class="hint">{COPY.settings.insulinNote(insulinBrand)}</p>
        <p class="hint">{COPY.settings.stackingWindowsNote}</p>
      </div>

      <h2>{COPY.settings.sectionRounding}</h2>
      <div class="group-label" id="label-mode">{COPY.settings.modeQuestion}</div>
      {/* §15 — five modes were selectable with nothing explaining any of them,
          and one of them is unsafe by default. This points at the explanation
          rather than repeating it: §10.5's budget does not allow five
          paragraphs here. */}
      <p class="hint">{COPY.settings.modeHint}</p>
      <div class="list" role="group" aria-labelledby="label-mode">
        {MODES.map(({ roundingMode, name }) => (
          <Button
            key={roundingMode}
            class={draft.roundingMode === roundingMode ? 'go' : 'go quiet'}
            // The boolean, not `String(...)`. Preact renders `aria-*={false}`
            // as the attribute "false" rather than dropping it — the one
            // exception to its remove-on-false rule, and it exists for exactly
            // this. The same two attribute values reach the DOM as before.
            aria-pressed={draft.roundingMode === roundingMode}
            onPress={() => { handlers.onChange('roundingMode', roundingMode); }}
          >
            {name}
          </Button>
        ))}
      </div>

      {/* §5.1 — `ceil` is GATED behind a one-time acknowledgement, and the
          reason is arithmetic: at a sensitivity of 30, rounding up adds as much
          as 30 mg/dL of unintended extra drop on EVERY dose, always toward low
          blood sugar. On a 20-unit meal dose that is 5%; on a 1-unit correction
          it is a 100% overdose. The modes are not neutral peers. */}
      {needsCeilAck ? (
        <div class="flag">
          <b>{COPY.settings.ceilGateTitle}</b>
          {COPY.settings.ceilGate}
          <div class="sheet">
            <Button class="go quiet" onPress={handlers.onAcknowledgeCeil}>
              {COPY.settings.ceilAccept}
            </Button>
          </div>
        </div>
      ) : null}

      <h2>{COPY.settings.thresholdHeading}</h2>
      <NumberField
        id="threshold"
        label={COPY.settings.thresholdQuestion}
        value={draft.threshold}
        problem={problemFor('threshold')}
        onChange={handlers.onChange}
        decimal={false}
        suffix="units"
      />
      <p class="hint">{handlers.advisoryStatus}</p>

      {/* §1.3 — VISUALLY SEPARATED, and labelled. "Putting a second number
          labelled 'units' into the app invites confusion with the calculated
          dose." */}
      <div class="basal">
        <h2>{COPY.settings.basalTitle}</h2>
        <p class="hint">{COPY.settings.basalNote}</p>
        <TextField
          id="basalName"
          label={COPY.settings.basalNameLabel}
          value={draft.basalName}
          wide
          onChange={handlers.onChange}
        />
        <NumberField
          id="basalUnits"
          label={COPY.settings.basalUnitsLabel}
          value={draft.basalUnits}
          problem={problemFor('basalUnits')}
          onChange={handlers.onChange}
          decimal
          suffix="units"
        />
        <TextField
          id="basalTiming"
          label={COPY.settings.basalTimingLabel}
          value={draft.basalTiming}
          wide
          onChange={handlers.onChange}
        />
        <p class="hint">{COPY.settings.basalRecordNote}</p>
      </div>

      {/* §10.1.6 — the delta, shown before it is saved. */}
      {deltas.length === 0 ? null : (
        <div class="flag">
          <b>{COPY.settings.deltaTitle}</b>
          {deltas.map((delta) => (
            <div key={delta.label}>
              <div>{`${delta.label}:`}</div>
              <div>{`was: ${delta.was}`}</div>
              <div>{`now: ${delta.now}`}</div>
            </div>
          ))}
        </div>
      )}

      <div class="sheet">
        <Button
          class="go"
          disabled={blocking.length > 0 || needsCeilAck}
          onPress={handlers.onSave}
        >
          {handlers.firstRun ? COPY.settings.saveFirstRun : COPY.settings.save}
        </Button>
      </div>

      {/*
          §12 — what the browser has promised, reported whatever it says.
          **The FORM carries the severity, not just the words.** Two of the three
          answers are not problems, and an amber panel on "it has promised to
          keep it" would teach someone to stop reading the amber. Only the
          at-risk answer takes §10.5's advisory treatment, so the section is
          calm two times out of three and means something the third.

          Not on first run: nothing is stored yet, so there is nothing at risk
          and a warning would be about nothing.
      */}
      {handlers.firstRun || storageDurable === undefined ? null : storageDurable === false ? (
        <div class="flag">
          <b>{COPY.storage.label}</b>
          <p>{COPY.storage.atRisk}</p>
          <p>{COPY.storage.atRiskWhy}</p>
          {/* The steps live here as well as in the bar. The bar is dismissed
              and gone for the session; this is the permanent place. */}
          <p>{COPY.installSteps(navigator.maxTouchPoints)}</p>
          {/* The off switch, and it turns off the REMINDER rather than the
              status. Someone who has decided not to install should stop being
              interrupted; they should not stop being able to find out where
              they stand, which is why the panel above survives the tap. */}
          {storageWarningOff ? (
            <p class="settled">{COPY.storage.stoppedWarning}</p>
          ) : (
            <Button class="more" onPress={onStopStorageWarning}>
              {COPY.storage.stopWarning}
            </Button>
          )}
        </div>
      ) : (
        <div class="card">
          <b>{COPY.storage.label}</b>
          <p class="hint">
            {storageDurable === true ? COPY.storage.durable : COPY.storage.unknown}
          </p>
        </div>
      )}

      {handlers.firstRun ? null : (
        <div class="list">
          <Button class="go quiet" onPress={handlers.onOpenSettingsAsText}>
            {COPY.settings.openAsText}
          </Button>
          <Button class="go quiet" onPress={handlers.onOpenHowItWorks}>
            {COPY.settings.openHowItWorks}
          </Button>
          <Button class="go quiet" onPress={handlers.onOpenExport}>
            {COPY.settings.openExport}
          </Button>
          {/* §10.7 — destructive controls OUT of the primary thumb arc. Last on
              the screen, visually distinct, and never beside a commit button. */}
          <Button class="go danger" onPress={handlers.onOpenClear}>
            {COPY.settings.openClear}
          </Button>
        </div>
      )}
    </div>
  );
}
