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

export interface SettingsDraft {
  readonly target: string;
  readonly isf: string;
  readonly icr: string;
  readonly mode: RoundingMode;
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
      mode: DEFAULT_MODE,
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
    mode: settings.mode,
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
      was: `${String(settings.target)} mg/dL`,
      now: `${draft.target} mg/dL`,
    });
  }
  return deltas;
}

export interface SettingsHandlers {
  readonly onChange: (field: keyof SettingsDraft, value: string) => void;
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
}: {
  readonly draft: SettingsDraft;
  readonly settings: Settings | null;
  readonly handlers: SettingsHandlers;
}): JSX.Element {
  const problems = checkDraft(draft);
  const problemFor = (field: keyof SettingsDraft): FieldProblem | undefined =>
    problems.find((problem) => problem.field === field);
  const blocking = problems.filter((problem) => !problem.confirmable);
  const deltas = deltasFor(settings, draft);
  const needsCeilAck = modeNeedsAcknowledgement(draft.mode) && !handlers.ceilAcknowledged;

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
          modes decide how many units, this decides what a unit IS. */}
      <p class="hint">{COPY.settings.unitAssumption}</p>
      {/* §10.2 — the SAME string the how-it-works page renders, not a copy. */}
      <p class="hint">{COPY.settings.insulinAssumption}</p>

      <h2>{COPY.settings.sectionRounding}</h2>
      <div class="group-label" id="label-mode">{COPY.settings.modeQuestion}</div>
      {/* §15 — five modes were selectable with nothing explaining any of them,
          and one of them is unsafe by default. This points at the explanation
          rather than repeating it: §10.5's budget does not allow five
          paragraphs here. */}
      <p class="hint">{COPY.settings.modeHint}</p>
      <div class="list" role="group" aria-labelledby="label-mode">
        {MODES.map(({ mode, name }) => (
          <Button
            key={mode}
            class={draft.mode === mode ? 'go' : 'go quiet'}
            // The boolean, not `String(...)`. Preact renders `aria-*={false}`
            // as the attribute "false" rather than dropping it — the one
            // exception to its remove-on-false rule, and it exists for exactly
            // this. The same two attribute values reach the DOM as before.
            aria-pressed={draft.mode === mode}
            onPress={() => { handlers.onChange('mode', mode); }}
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
