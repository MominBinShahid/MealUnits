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
  DEFAULT_THRESHOLD,
  PRESCRIBED_ICR,
  PRESCRIBED_ISF,
  PRESCRIBED_TARGET,
  RANGE,
} from '../../config.js';
import { parseField, withinHardRange, withinSoftBand } from '../../core/parse.js';
import { modeNeedsAcknowledgement } from '../../core/round.js';
import { COPY } from '../copy.js';
import { button, h } from '../dom.js';
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
  // §1.2, CHANGED ON MOMIN'S RULING — the three prescribed values are PREFILLED
  // into the draft so the person this was built for does not have to type
  // anything. They are shown on screen and still require the explicit save.
  //
  // The refuse-on-empty branch this used to protect is NOT dead code: nothing
  // is stored until that save, `buildSnapshot` reads the STORE rather than this
  // draft, and it returns null until then. The threshold and the basal block
  // stay empty on purpose — the threshold has always had a default (§6.2) and
  // is filled below, and the basal figures are HIS, not the prescription's.
  if (settings === null) {
    return {
      target: String(PRESCRIBED_TARGET),
      isf: String(PRESCRIBED_ISF),
      icr: String(PRESCRIBED_ICR),
      mode: DEFAULT_MODE,
      threshold: String(DEFAULT_THRESHOLD),
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
        message: 'This is needed before a dose can be worked out.',
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
        message: `Must be between ${String(lo)} and ${String(hi)}.`,
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
      label: 'How much one unit covers',
      was: COPY.settings.icrSentence(String(settings.icr)),
      now: COPY.settings.icrSentence(draft.icr),
    });
  }
  if (draft.isf !== String(settings.isf)) {
    deltas.push({
      label: 'How far one unit lowers you',
      was: COPY.settings.isfSentence(String(settings.isf)),
      now: COPY.settings.isfSentence(draft.isf),
    });
  }
  if (draft.target !== String(settings.target)) {
    deltas.push({
      label: 'What a correction aims for',
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

function numberField(
  id: keyof SettingsDraft,
  label: string,
  value: string,
  problem: FieldProblem | undefined,
  handlers: SettingsHandlers,
  options: {
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
  },
): HTMLElement {
  return h(
    'div',
    { class: 'field' },
    h(
      'label',
      { id: `label-${id}` },
      options.icon === undefined
        ? null
        : h('span', { class: 'field-icon', 'aria-hidden': 'true' }, options.icon),
      label,
      options.tag === undefined ? null : h('span', { class: 'tag' }, options.tag),
    ),
    h(
      'div',
      {},
      h('input', {
        // §10.7 — `type="text"` with `inputmode`, NEVER `type="number"`, whose
        // invalid values are silently set to empty string per spec with no way
        // to read the raw input. §4.1's four states depend on reading it.
        type: 'text',
        // §10.1 item 2 — the keypad claim, per field.
        inputmode: options.decimal ? 'decimal' : 'numeric',
        // §10.7 — these are transient measurements, and offering a stale
        // previous value is an active hazard.
        autocomplete: 'off',
        value,
        'aria-describedby': `label-${id}`,
        // Survives the rebuild `render()` performs on every keystroke.
        'data-field': id,
        oninput: (event) => {
          handlers.onChange(id, (event.target as HTMLInputElement).value);
        },
      }),
      options.suffix === undefined ? null : h('span', { class: 'clinical' }, ` ${options.suffix}`),
    ),
    options.clinical === undefined ? null : h('p', { class: 'clinical' }, options.clinical),
    // §10.5 — "the first confirmation a user ever sees must not be a false
    // alarm." A soft-band miss is an acknowledgement of an unusual-but-intended
    // value, and rendering it in the same red as a blocking error contradicts
    // the wording it was given: his prescribed target of 150 sits outside
    // 90-140 ON PURPOSE, and it was showing up looking like a mistake.
    problem === undefined
      ? null
      : h('p', { class: problem.confirmable ? 'caution' : 'error' }, problem.message),
  );
}

const MODES: readonly { readonly mode: RoundingMode; readonly label: string }[] = [
  { mode: 'nearest', label: 'Whole units' },
  { mode: 'half', label: 'Half units' },
  { mode: 'ceil', label: 'Always round up' },
  { mode: 'floor', label: 'Always round down' },
  { mode: 'off', label: 'Show the exact number' },
];

export function settingsScreen(
  draft: SettingsDraft,
  settings: Settings | null,
  handlers: SettingsHandlers,
): HTMLElement {
  const problems = checkDraft(draft);
  const problemFor = (field: keyof SettingsDraft): FieldProblem | undefined =>
    problems.find((problem) => problem.field === field);
  const blocking = problems.filter((problem) => !problem.confirmable);
  const deltas = deltasFor(settings, draft);
  const needsCeilAck = modeNeedsAcknowledgement(draft.mode) && !handlers.ceilAcknowledged;

  return h(
    'div',
    { class: 'screen' },
    h('h1', {}, handlers.firstRun ? 'Your prescription' : 'Settings'),
    // §1.2 as ruled — the three prescribed values arrive PREFILLED, and a
    // prefill that does not announce itself is the silent default §1.2 refused.
    // This flag is what makes it visible, and it says what is still outstanding
    // so a blocked save reads as work-to-do rather than as a broken button.
    handlers.firstRun
      ? h(
          'div',
          { class: 'flag mint' },
          h('b', {}, COPY.settings.prefilledTitle),
          COPY.settings.prefilledBody,
        )
      : null,

    // Optional, and first, because it is the only question here that is not
    // clinical — asking it among the ratios would imply it carries the same
    // weight. It changes nothing the app calculates.
    h(
      'div',
      { class: 'field' },
      h('label', { id: 'label-personName' }, COPY.settings.nameQuestion),
      h(
        'div',
        {},
        h('input', {
          type: 'text',
          autocomplete: 'off',
          value: draft.personName,
          'aria-describedby': 'label-personName',
          'data-field': 'personName',
          oninput: (event) => { handlers.onChange('personName', (event.target as HTMLInputElement).value); },
        }),
      ),
      h('p', { class: 'clinical' }, COPY.settings.nameHint),
    ),

    // §10.1 item 5 — GROUP BY SUBJECT. "Two identical number rows stacked is the
    // layout that invites transposition." Blood-sugar settings in one group,
    // food in another, distinguished by heading — never colour alone.
    h('h2', {}, 'Blood sugar'),
    numberField('target', COPY.settings.targetQuestion, draft.target, problemFor('target'), handlers, {
      decimal: false,
      suffix: 'mg/dL',
      tag: 'TARGET',
      icon: '\u{1FA78}',
      clinical: COPY.settings.targetClinical,
    }),
    numberField('isf', COPY.settings.isfQuestion, draft.isf, problemFor('isf'), handlers, {
      // §10.1 — the ratios KEEP their decimal key. A sensitivity or a
      // carbohydrate ratio can legitimately carry a fraction.
      decimal: true,
      tag: 'ISF',
      icon: '\u{1FA78}',
      suffix: 'mg/dL per unit',
      clinical: COPY.settings.isfClinical,
    }),
    draft.isf === ''
      ? null
      : h('p', { class: 'hint' }, COPY.settings.isfSentence(draft.isf)),

    h('h2', {}, 'Food'),
    numberField('icr', COPY.settings.icrQuestion, draft.icr, problemFor('icr'), handlers, {
      decimal: true,
      suffix: 'grams of carbohydrate',
      clinical: COPY.settings.icrClinical,
      tag: 'ICR',
      icon: '\u{1F35A}',
    }),
    draft.icr === ''
      ? null
      : h('p', { class: 'hint' }, COPY.settings.icrSentence(draft.icr)),

    h('h2', {}, 'Rounding'),
    h('div', { class: 'ask' }, COPY.settings.modeQuestion),
    // §15 — five modes were selectable with nothing explaining any of them, and
    // one of them is unsafe by default. This points at the explanation rather
    // than repeating it: §10.5's budget does not allow five paragraphs here.
    h('p', { class: 'hint' }, COPY.settings.modeHint),
    h(
      'div',
      { class: 'list' },
      ...MODES.map(({ mode, label }) =>
        button(
          label,
          () => { handlers.onChange('mode', mode); },
          { class: draft.mode === mode ? 'go' : 'go quiet', 'aria-pressed': String(draft.mode === mode) },
        ),
      ),
    ),
    // §5.1 — `ceil` is GATED behind a one-time acknowledgement, and the reason
    // is arithmetic: at a sensitivity of 30, rounding up adds as much as 30
    // mg/dL of unintended extra drop on EVERY dose, always toward low blood
    // sugar. On a 20-unit meal dose that is 5%; on a 1-unit correction it is a
    // 100% overdose. The modes are not neutral peers.
    needsCeilAck
      ? h(
          'div',
          { class: 'flag' },
          h('b', {}, 'Read this before choosing that'),
          COPY.settings.ceilGate,
          h('div', { class: 'sheet' }, button(COPY.settings.ceilAccept, handlers.onAcknowledgeCeil, { class: 'go quiet' })),
        )
      : null,

    h('h2', {}, COPY.settings.thresholdHeading),
    numberField('threshold', COPY.settings.thresholdQuestion, draft.threshold, problemFor('threshold'), handlers, {
      decimal: false,
      suffix: 'units',
    }),
    h('p', { class: 'hint' }, handlers.advisoryStatus),

    // §1.3 — VISUALLY SEPARATED, and labelled. "Putting a second number labelled
    // 'units' into the app invites confusion with the calculated dose."
    h(
      'div',
      { class: 'basal' },
      h('h2', {}, COPY.settings.basalTitle),
      h('p', { class: 'hint' }, COPY.settings.basalNote),
      h(
        'div',
        { class: 'field wide' },
        h('label', {}, 'Which insulin'),
        h('input', {
          type: 'text',
          autocomplete: 'off',
          value: draft.basalName,
          'data-field': 'basalName',
          oninput: (event) => { handlers.onChange('basalName', (event.target as HTMLInputElement).value); },
        }),
      ),
      numberField('basalUnits', 'How many units', draft.basalUnits, problemFor('basalUnits'), handlers, {
        decimal: true,
        suffix: 'units',
      }),
      h(
        'div',
        { class: 'field wide' },
        h('label', {}, 'When'),
        h('input', {
          type: 'text',
          autocomplete: 'off',
          value: draft.basalTiming,
          'data-field': 'basalTiming',
          oninput: (event) => { handlers.onChange('basalTiming', (event.target as HTMLInputElement).value); },
        }),
      ),
      h('p', { class: 'hint' }, 'None of this enters any calculation. It is here so the record is complete.'),
    ),

    // §10.1.6 — the delta, shown before it is saved.
    deltas.length === 0
      ? null
      : h(
          'div',
          { class: 'flag' },
          h('b', {}, COPY.settings.deltaTitle),
          ...deltas.map((delta) =>
            h(
              'div',
              {},
              h('div', {}, `${delta.label}:`),
              h('div', {}, `was: ${delta.was}`),
              h('div', {}, `now: ${delta.now}`),
            ),
          ),
        ),

    h(
      'div',
      { class: 'sheet' },
      button(handlers.firstRun ? 'Save and start' : 'Save', handlers.onSave, {
        class: 'go',
        disabled: blocking.length > 0 || needsCeilAck,
      }),
    ),

    handlers.firstRun
      ? null
      : h(
          'div',
          { class: 'list' },
          button('Show my settings as text', handlers.onOpenSettingsAsText, { class: 'go quiet' }),
          button('How this works', handlers.onOpenHowItWorks, { class: 'go quiet' }),
          button('Save or move the record', handlers.onOpenExport, { class: 'go quiet' }),
          // §10.7 — destructive controls OUT of the primary thumb arc. Last on
          // the screen, visually distinct, and never beside a commit button.
          button('Clear or start over', handlers.onOpenClear, { class: 'go danger' }),
        ),
  );
}
