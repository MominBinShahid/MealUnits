/**
 * §18.14's Step interface, for the everyday path and every gate that interrupts
 * it. `design/step-flow.html` is the build reference.
 *
 * The trade-off Momin accepted is recorded in §18.14 and worth keeping in view
 * while reading this file: **Step's everyday path is four screens against Card's
 * one, and that tax is paid three times a day forever.** Two things already in
 * the plan blunt it, and both are honoured below — §7.1's `injectedUnits`
 * defaults to the calculated dose so the common case needs no typing, and §7.2's
 * commit is two taps with no keyboard.
 */

import {
  AMOUNT_STEP_HUNDREDTHS,
  HYPO_LEVEL_1,
  KETONE_ADVISORY,
  RANGE,
  WIZARD_STEPS,
} from '../../config.js';
import { formatClockTime } from '../../core/calendar.js';
import { formatHundredths } from '../../core/decimal.js';
import { elapsedHours } from '../../core/stacking.js';
import { eatWindow } from '../../core/timing.js';
import { COPY, units } from '../copy.js';
import { advisories, keypad, readout, stepDots } from '../components.js';
import type { AdvisoryView } from '../components.js';
import { button, h } from '../dom.js';
import type { AppState } from '../../state/machine.js';
import type { Advisory, Band, Breakdown, Outcome } from '../../core/types.js';

export interface CalculatorHandlers {
  readonly onDigit: (field: 'bloodSugar' | 'carbs', digit: string) => void;
  readonly onBackspace: (field: 'bloodSugar' | 'carbs') => void;
  /**
   * Still needed after the navigation moved to the shell's foot nav — these are
   * not chrome. Four screens offer going back as a NAMED CHOICE with its own
   * wording: "Change" beside a withheld dose, "Go back and test first" beside a
   * blank reading, "Start again" on a bound failure, and "Keep the smaller
   * dose" on the §7.4.1 override. Each is an answer to the question that screen
   * asks, and collapsing them into a generic Back would delete the wording that
   * makes them answers.
   */
  readonly onBack: () => void;
  readonly onNext: () => void;
  /** §7.2 — the only way out of the terminal logged state. */
  readonly onNewCalculation: () => void;
  readonly onCalculate: () => void;
  readonly onAcknowledgeBlank: () => void;
  readonly onConfirmLargeDose: () => void;
  readonly onBeginLogging: () => void;
  readonly onAdjustAmount: (deltaHundredths: number) => void;
  readonly onCommitLog: () => void;
  readonly onOpenOverride: () => void;
  readonly onTakeOverride: () => void;
  readonly onOfferReading: () => void;
  readonly onSaveReading: () => void;
  readonly onToggleMore: () => void;
  readonly onOpenHistory: () => void;
  readonly onOpenSettings: () => void;
  readonly onStartOver: () => void;
  readonly nowMs: number;
  readonly timeZone: string;
  readonly moreExpanded: boolean;
}

const TOTAL_STEPS = WIZARD_STEPS;
const FIRST_STEP = 1;
const SECOND_STEP = FIRST_STEP + 1;

/**
 * §10.5's ranked list, turned into renderable views. The RANK is the core's
 * (§4.3 step 11b); this only supplies the words, which live in `copy.ts`.
 */
function advisoryViews(state: AppState, list: readonly Advisory[]): AdvisoryView[] {
  const views: AdvisoryView[] = [];
  const last = state.record.lastDose;
  for (const kind of list) {
    switch (kind) {
      case 'band_e_full':
        views.push({ kind, title: COPY.bandE.title, body: COPY.bandE.body });
        break;
      case 'band_e_compact':
        // §10.5 — "identical instruction, identical escalation, compact
        // presentation. ONLY THE TYPOGRAPHY DE-ESCALATES." The words below are
        // the same object as the full card's.
        views.push({ kind, title: COPY.bandE.title, body: COPY.bandE.body, compact: true });
        break;
      case 'band_b_caution':
        views.push({ kind, title: COPY.bandB.title, body: COPY.bandB.body });
        break;
      case 'stacking_suppressed':
        views.push({ kind, title: COPY.stacking.suppressedTitle, body: COPY.stacking.mealOnly });
        break;
      case 'carb_advisory_low':
      case 'carb_advisory_high': {
        const carbs = state.inputs.carbs;
        const baseline = state.record.carbBaseline;
        if (baseline === null) break;
        const body =
          kind === 'carb_advisory_low'
            ? COPY.advisory.low(carbs, String(baseline))
            : COPY.advisory.high(carbs, String(baseline));
        views.push({ kind, title: null, body });
        break;
      }
      case 'stacking_recent_dose':
        if (last !== null) {
          views.push({
            kind,
            title: null,
            body: COPY.stacking.recentDose(
              units(last.injectedHundredths),
              elapsedHours(last, state.snapshot?.decisionTime ?? 0),
            ),
          });
        }
        break;
      case 'missing_history':
        views.push({ kind, title: null, body: COPY.stacking.missingHistory });
        break;
      case 'stacking_negative_applied':
        views.push({ kind, title: null, body: COPY.stacking.negativeApplied });
        break;
      case 'invalid_time_record':
        views.push({ kind, title: null, body: COPY.stacking.invalidTime });
        break;
    }
  }
  return views;
}

/**
 * §10.3 — show the working, and §2.2's rule that displayed components may not
 * visibly sum to the displayed total.
 *
 * A wrong setting is the dominant silent failure — "it produces a plausible
 * total from a wrong constant, and only a visible breakdown exposes it". MHRA
 * also requires calculators to disclose their formula, which 70% of audited apps
 * failed to do.
 *
 * §10.3 is careful that this is NECESSARY BUT NOT SUFFICIENT: correct decision
 * support cut prescribing errors 58.8%, incorrect decision support increased
 * them 86.6%, and the same literature documents clinicians viewing sufficient
 * information and erring anyway. The breakdown ships alongside the hard gates,
 * which depend on nobody reading anything.
 */
function working(state: AppState, breakdown: Breakdown, doseHundredths: number): HTMLElement {
  const settings = state.settings;
  const rows: HTMLElement[] = [];

  if (settings !== null && state.inputs.bloodSugar !== '') {
    const label = `${state.inputs.bloodSugar} down to ${String(settings.target)}`;
    const value = formatHundredths(breakdown.correctionHundredths);
    rows.push(
      breakdown.correctionSuppressed
        ? // §10.3 — struck through, WITH ITS REASON. Never silently omitted, and
          // never left as a line that visibly fails to reach the total.
          h(
            'div',
            { class: 'row held' },
            h('span', {}, label, ' — ', COPY.stacking.held),
            h('b', {}, h('s', {}, value)),
          )
        : h('div', { class: 'row' }, h('span', {}, label), h('b', {}, value)),
    );
  }

  if (state.inputs.carbs !== '') {
    rows.push(
      h(
        'div',
        { class: 'row' },
        h('span', {}, `${state.inputs.carbs} g of carbohydrate`),
        h('b', {}, formatHundredths(breakdown.mealHundredths)),
      ),
    );
  }

  rows.push(
    h(
      'div',
      { class: 'row total' },
      h('span', {}, 'Total'),
      h('b', {}, units(doseHundredths)),
    ),
  );

  if (!breakdown.componentsSumToTotal) {
    rows.push(
      h(
        'div',
        { class: 'exact' },
        `Worked out exactly: ${formatHundredths(breakdown.exactTotalHundredths)} units, then rounded.`,
      ),
    );
  }

  return h('div', { class: 'working' }, ...rows);
}

/**
 * §3 bands C and D — terminal. **No dose, no working, no partial figure**, and
 * §3.3's scope: the block suppresses every insulin quantity, including the
 * accessibility announcement, and does NOT suppress the treatment instructions.
 *
 * §1.4 — "that single gate may be worth more to him than the arithmetic, it
 * depends on no ratio being correct, and it is available from the first launch."
 */
function blocked(state: AppState, bands: readonly Band[], handlers: CalculatorHandlers): HTMLElement {
  const veryLow = bands.includes('D');
  const words = veryLow ? COPY.bandD : COPY.bandC;
  return h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'halt', role: 'status' },
      h('div', { class: 'n' }, state.inputs.bloodSugar || '—'),
      h('h2', {}, words.title),
      h('p', {}, words.body),
      veryLow ? h('p', {}, COPY.bandD.escalation) : null,
      h('p', {}, words.gate),
      // §8.2 — a block goes stale like anything else, and this is the screen it
      // matters most on. `blocked` was the only step that ignored `expired`:
      // the state flipped after fifteen minutes and nothing on screen changed,
      // so the app went on presenting a reading the user had been told to
      // replace. A stale dose is dangerous; a stale "do not inject" keeps
      // someone from eating after they have already recovered.
      state.expired && state.snapshot !== null
        ? h(
            'p',
            { class: 'caution' },
            COPY.expiredBlock(formatClockTime(state.snapshot.decisionTime, handlers.timeZone)),
          )
        : null,
    ),
    // §7.8 — the offer appears AFTER the treat-first instruction, never instead
    // of it, and it is an AFFORDANCE rather than an advisory: §10.5 rank 1 says
    // nothing else shows, and that governs warnings, not the button that lets
    // him save the number he is looking at.
    h(
      'div',
      { class: 'sheet' },
      button(COPY.reading.offer, handlers.onOfferReading, { class: 'go quiet' }),
    ),
  );
}

function entryScreen(
  state: AppState,
  field: 'bloodSugar' | 'carbs',
  handlers: CalculatorHandlers,
): HTMLElement {
  const isReading = field === 'bloodSugar';
  const value = state.inputs[field];
  const [minReading, maxReading] = RANGE.bloodSugar.hard;
  const [, maxCarbs] = RANGE.carbs.hard;

  /**
   * §4.5 — the field's OWN error, shown on the field's own screen.
   *
   * This slot did not exist. The core produced `above_range` correctly and
   * nothing rendered it, so an out-of-range reading ended the flow silently:
   * `stepFor` sent the user to a screen that had no reading on it, and
   * "Work out the dose" appeared to be broken.
   */
  const problem = ((): string | null => {
    const outcome = state.outcome;
    // §4.3 step 5 — the "nothing was asked for" outcome, which had no words.
    // Shown on the carbohydrate screen, where `stepFor` sends it, because
    // carbohydrate is the field that makes a dose possible at all.
    if (outcome !== null && outcome.kind === 'no_result') {
      if (isReading) return null;
      return state.inputs.bloodSugar === '' && state.inputs.carbs === ''
        ? COPY.noResult.nothingEntered
        : COPY.noResult.nothingToDose(state.snapshot?.settings.target ?? 0);
    }
    if (outcome === null || outcome.kind !== 'invalid_input') return null;
    const error = outcome.errors.find((candidate) => candidate.field === field);
    if (error === undefined) return null;
    if (error.reason === 'above_range') {
      return isReading
        ? COPY.entryRange.readingHigh(maxReading)
        : COPY.entryRange.carbsHigh(maxCarbs);
    }
    if (error.reason === 'below_range') {
      return isReading ? COPY.entryRange.readingLow(minReading) : COPY.entryRange.carbsLow;
    }
    if (error.reason === 'missing' || error.reason === 'not_finite') return null;
    // Everything else is §4.2's lexical grammar, which already has its wording.
    return COPY.lexical(error.reason);
  })();

  return h(
    'div',
    { class: 'screen' },
    stepDots(isReading ? FIRST_STEP : SECOND_STEP, TOTAL_STEPS, `${String(isReading ? FIRST_STEP : SECOND_STEP)} of ${String(TOTAL_STEPS)}`),
    // Every navigation control — Back, Settings, History — is rendered by the
    // shell at the FOOT of the screen (§10.7). Nothing here draws chrome.
    //
    // The greeting is on THIS screen and no other. §10.5 runs a strict budget on
    // what shares space with a dose, and a greeting beside "11 units" is noise
    // at the one moment noise is dangerous. Here there is no dose yet.
    isReading && state.settings !== null && state.settings.personName !== ''
      ? h(
          'p',
          { class: 'greeting' },
          COPY.settings.greeting(state.settings.personName),
          ' ',
          h('span', { class: 'wave', 'aria-hidden': 'true' }, '\u{1F44B}'),
        )
      : null,
    h(
      'div',
      { class: 'ask' },
      // The break is DELIBERATE and not left to `text-wrap: balance`, which
      // rebalances with the viewport and would split "blood / sugar" on a
      // narrower phone. The question has two parts — the measurement, then the
      // moment — and the line ending is where that division belongs.
      // The trailing space before each `<br>` is load-bearing: `textContent`
      // concatenates across the break with no whitespace, so without it the
      // question reads "blood sugarright now?" to a screen reader and to every
      // test that asserts on the sentence.
      ...(isReading
        ? ["What's your blood sugar ", h('br', {}), 'right now?']
        : ['How much carbohydrate ', h('br', {}), 'is in this meal?']),
    ),
    h(
      'p',
      { class: 'hint' },
      isReading
        ? `Meter showing HI? Enter ${String(maxReading)}. Showing LO? Don't enter a number — treat first.`
        : // §10.1 — "the carbohydrate field says GRAMS OF CARBOHYDRATE, never
          // grams or carbs". A 250 g plate of biryani is about 50 g of
          // carbohydrate: two real numbers, both in grams, five-fold apart.
          'The carbohydrate in the food — not what the plate weighs. A 250 g plate of biryani is about 50 g of carbohydrate.',
    ),
    h(
      'div',
      { class: 'entry' },
      h('div', { class: value === '' ? 'n empty' : 'n' }, value === '' ? '—' : value),
      h('div', { class: 'u' }, isReading ? 'MG/DL' : 'GRAMS OF CARBOHYDRATE'),
    ),
    // §10.9 — `aria-live` so the explanation is announced when it appears. It
    // arrives in response to a tap, without a screen change, which is the case
    // a live region exists for.
    problem === null
      ? null
      : h('p', { class: 'error entry-error', 'aria-live': 'polite' }, problem),
    keypad({
      // §10.1 — no decimal key for the reading, because mg/dL meter readings are
      // whole numbers and omitting it makes no clinical value unenterable.
      // Carbohydrate keeps its key.
      decimal: !isReading,
      onDigit: (digit) => { handlers.onDigit(field, digit); },
      onBackspace: () => { handlers.onBackspace(field); },
      action: {
        label: isReading ? COPY.next : COPY.workItOut,
        onPress: isReading ? handlers.onNext : handlers.onCalculate,
        enabled: true,
      },
    }),
  );
}

/** §6.3 — the inputs restated, the dose withheld until the tap. */
function confirmInputs(state: AppState, handlers: CalculatorHandlers): HTMLElement {
  const reading =
    state.inputs.bloodSugar === ''
      ? COPY.confirm.noReading
      : `${state.inputs.bloodSugar} mg/dL`;
  return h(
    'div',
    { class: 'screen' },
    stepDots(TOTAL_STEPS, TOTAL_STEPS, 'Check'),
    h('div', { class: 'ask' }, COPY.confirm.title),
    h(
      'div',
      { class: 'working' },
      h('div', { class: 'row' }, h('span', {}, 'Blood sugar'), h('b', {}, reading)),
      h(
        'div',
        { class: 'row' },
        h('span', {}, 'Carbohydrate'),
        h('b', {}, `${state.inputs.carbs} g`),
      ),
    ),
    h(
      'p',
      { class: 'hint' },
      // §6.3 — claim the narrower thing. It catches TRANSCRIPTION errors, not
      // ESTIMATION ones: read the plate as 250 in good faith and the restatement
      // confirms his own mistake back to him.
      'Read those two back before the dose appears. This catches a mistyped number — it cannot catch a misjudged plate.',
    ),
    h(
      'div',
      { class: 'sheet' },
      button(COPY.confirm.reveal, handlers.onConfirmLargeDose, { class: 'go' }),
      button(COPY.confirm.change, handlers.onBack, { class: 'go quiet' }),
    ),
  );
}

/** §4.6 — one explicit tap, and never persisted. */
function blankReadingAck(handlers: CalculatorHandlers): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'ask' }, COPY.blankReading.title),
    h('p', { class: 'hint' }, COPY.blankReading.body),
    h(
      'p',
      { class: 'hint' },
      // §4.6 — why ONE tap is the right amount of friction, recorded so it is
      // not "improved" later: stronger friction displaces him to entering a
      // FABRICATED in-range reading, which is strictly worse. A fake 150
      // contributes a fake correction of zero, defeats the low-blood-sugar gate
      // entirely, AND corrupts the log §7.4 reads.
      'And the timing advice is switched off — without a reading the app cannot tell you when to eat.',
    ),
    h(
      'div',
      { class: 'sheet' },
      button(COPY.blankReading.accept, handlers.onAcknowledgeBlank, { class: 'go' }),
      button('Go back and test first', handlers.onBack, { class: 'go quiet' }),
    ),
  );
}

/** §6.4 — the app is wrong, not the user, and it cannot be overridden. */
function boundFailure(handlers: CalculatorHandlers): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'halt' }, h('h2', {}, COPY.boundFailure.title), h('p', {}, COPY.boundFailure.body)),
    h('div', { class: 'sheet' }, button('Start again', handlers.onBack, { class: 'go quiet' })),
  );
}

function timingLine(state: AppState, outcome: Outcome, timeZone: string): HTMLElement | null {
  if (outcome.kind !== 'dose' && outcome.kind !== 'meal_only_suppressed') return null;
  if (outcome.timingAdvice === 'suppressed') return null;
  if (outcome.timingAdvice === 'eat_first') {
    return h('div', { class: 'flag mint' }, h('b', {}, COPY.timing.eatFirst));
  }
  // §8.1 — BEFORE the tap the app shows the RULE, not a time. Version 1 computed
  // an absolute eat-time from the CALCULATION clock: calculate at 7:10, get
  // distracted, inject at 7:35, eat at the displayed 7:40 — a five-minute lag
  // instead of thirty, and nothing on screen would indicate the number went
  // stale.
  if (state.committing === null) {
    return h(
      'div',
      { class: 'flag mint' },
      h('b', {}, COPY.timing.before),
      COPY.timing.beforeDetail,
    );
  }
  const window = eatWindow(state.committing.timestamp);
  return h(
    'div',
    { class: 'flag mint' },
    h(
      'b',
      {},
      COPY.timing.injectedAt(
        formatClockTime(state.committing.timestamp, timeZone),
        formatClockTime(window.toMs, timeZone),
      ),
    ),
  );
}

function resultScreen(state: AppState, outcome: Outcome, handlers: CalculatorHandlers): HTMLElement {
  if (outcome.kind !== 'dose' && outcome.kind !== 'meal_only_suppressed') {
    return h('div', { class: 'screen' });
  }
  const views = advisoryViews(state, outcome.advisories);

  return h(
    'div',
    { class: 'screen' },
    stepDots(TOTAL_STEPS, TOTAL_STEPS, COPY.done),
    // §10.9 — `role="status"`, POLITE, never assertive: assertive could announce
    // `55` on the way to `550`. The region pre-exists, and focus is not moved.
    h(
      'div',
      { role: 'status' },
      readout(formatHundredths(outcome.hundredths), 'units of Humulin R', state.expired),
      state.expired
        ? h(
            'div',
            { class: 'flag' },
            COPY.expired(formatClockTime(state.snapshot?.decisionTime ?? 0, handlers.timeZone)),
          )
        : null,
      working(state, outcome.breakdown, outcome.hundredths),
      advisories(views, handlers.onToggleMore, handlers.moreExpanded),
      timingLine(state, outcome, handlers.timeZone),
    ),
    h(
      'div',
      { class: 'sheet' },
      // §7.4.1 — offered FROM the result, never in place of it.
      outcome.overrideAvailable
        ? button('Why is this smaller?', handlers.onOpenOverride, { class: 'go quiet' })
        : null,
      // §8.2 — an expired result cannot be acted on.
      state.expired
        ? button('Check again', handlers.onNewCalculation, { class: 'go' })
        : button(COPY.log.injected, handlers.onBeginLogging, { class: 'go' }),
    ),
  );
}

/**
 * §7.4.1 — the override, stating the consequence in HIS OWN UNITS.
 *
 * "The candidate dose is hidden when it would need confirmation." v3's button
 * printed the resulting total unconditionally, so at 600 mg/dL with 200 g it
 * disclosed exactly the number §6.3 requires withheld — defeating its own claim
 * that it cannot reveal a previously hidden correction. When either figure
 * reaches the threshold the panel shows **no numbers**, including in the
 * accessibility tree.
 */
function overrideScreen(state: AppState, outcome: Outcome, handlers: CalculatorHandlers): HTMLElement {
  if (outcome.kind !== 'meal_only_suppressed') return h('div', { class: 'screen' });
  const last = state.record.lastDose;
  const withheld = outcome.overrideFiguresWithheld;

  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'ask' }, COPY.stacking.suppressedTitle),
    last !== null && outcome.stackingCeilingMgDl !== null
      ? h(
          'p',
          { class: 'hint' },
          COPY.stacking.ceiling(
            units(last.injectedHundredths),
            elapsedHours(last, state.snapshot?.decisionTime ?? 0),
            outcome.stackingCeilingMgDl,
          ),
        )
      : null,
    withheld
      ? h('p', { class: 'hint' }, 'Both figures are large enough to need a second look, so neither is shown here.')
      : h(
          'div',
          { class: 'working' },
          h(
            'div',
            { class: 'row' },
            h('span', {}, COPY.stacking.mealOnly),
            h('b', {}, units(outcome.hundredths)),
          ),
        ),
    h(
      'div',
      { class: 'sheet' },
      button(
        withheld || outcome.overrideCandidateHundredths === null
          ? COPY.stacking.overrideWithheld
          : COPY.stacking.overrideAction(units(outcome.overrideCandidateHundredths)),
        handlers.onTakeOverride,
        { class: 'go quiet' },
      ),
      button('Keep the smaller dose', handlers.onBack, { class: 'go' }),
    ),
  );
}

/**
 * §7.2's amount step — **the commit is the tap on THIS screen**, not the one
 * that opened it.
 *
 * v22's mockups implied the first tap was the commit, which would freeze the
 * payload before `injectedUnits` was known and make this screen an EDIT — and
 * §7.3 forbids editing a logged row.
 */
function amountScreen(state: AppState, outcome: Outcome, handlers: CalculatorHandlers): HTMLElement {
  if (outcome.kind !== 'dose' && outcome.kind !== 'meal_only_suppressed') {
    return h('div', { class: 'screen' });
  }
  const draft = Number(state.injectedDraft);

  return h(
    'div',
    { class: 'screen' },
    stepDots(TOTAL_STEPS, TOTAL_STEPS, 'Recording'),
    h('div', { class: 'ask' }, COPY.log.amountQuestion),
    h('p', { class: 'hint' }, COPY.log.amountHint),
    h(
      'div',
      { class: 'entry' },
      h('div', { class: 'n' }, formatHundredths(Number.isFinite(draft) ? draft : 0)),
      h('div', { class: 'u' }, 'UNITS'),
    ),
    h(
      'div',
      // No `bar`, and no spacer: the spacer is what pushed these to opposite
      // edges and let them collapse to 28px wide. See `.stepper` in styles.css.
      { class: 'stepper' },
      button('−', () => { handlers.onAdjustAmount(-AMOUNT_STEP_HUNDREDTHS); }, { class: 'key', 'aria-label': 'half a unit less' }),
      button('+', () => { handlers.onAdjustAmount(AMOUNT_STEP_HUNDREDTHS); }, { class: 'key', 'aria-label': 'half a unit more' }),
    ),
    h('div', { class: 'flag' }, COPY.log.amountOnlyChance),
    h('div', { class: 'flag mint' }, h('b', {}, COPY.log.commitIsHere)),
    h('div', { class: 'sheet' }, button(COPY.log.commit, handlers.onCommitLog, { class: 'go' })),
  );
}

function loggedScreen(state: AppState, handlers: CalculatorHandlers): HTMLElement {
  const payload = state.committing;
  const window = payload === null ? null : eatWindow(payload.timestamp);
  return h(
    'div',
    { class: 'screen' },
    stepDots(TOTAL_STEPS, TOTAL_STEPS, 'Logged'),
    payload === null
      ? null
      : h(
          'div',
          { role: 'status' },
          h('div', { class: 'ask' }, COPY.log.saved(units(payload.injectedUnits), formatClockTime(payload.timestamp, handlers.timeZone))),
          // §7.2 — the timer starts REGARDLESS of the write, because the
          // injection happened and he still needs the eat-at guidance.
          window !== null && payload.timingAdvice === 'before'
            ? h(
                'div',
                { class: 'flag mint' },
                h('b', {}, `Eat around ${formatClockTime(window.toMs, handlers.timeZone)}.`),
              )
            : null,
          state.save.kind === 'pending'
            ? h('div', { class: 'flag' }, COPY.log.pending)
            : null,
        ),
    h(
      'div',
      { class: 'sheet' },
      button('History', handlers.onOpenHistory, { class: 'go quiet' }),
      button(COPY.done, handlers.onNewCalculation, { class: 'go' }),
    ),
  );
}

/** §7.8 — a reading is its own event, and it exposes no insulin quantity. */
function recordReadingScreen(state: AppState, handlers: CalculatorHandlers): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h('div', { class: 'ask' }, COPY.reading.title),
    h('p', { class: 'hint' }, COPY.reading.hint),
    h(
      'div',
      { class: 'entry' },
      // §7.8 — the offer PRE-FILLS the blocked reading. He already typed it, and
      // retyping invites a transcription error.
      h('div', { class: 'n' }, state.inputs.bloodSugar || '—'),
      h('div', { class: 'u' }, 'MG/DL'),
    ),
    Number(state.inputs.bloodSugar) >= KETONE_ADVISORY
      ? // §10.5 v10 — recording a reading at or above 250 shows band E ITSELF.
        // "Whenever this app sees a number at or above 250, it says check
        // ketones — whether a dose follows or not."
        h('div', { class: 'flag' }, h('b', {}, COPY.bandE.title), COPY.bandE.body)
      : null,
    Number(state.inputs.bloodSugar) < HYPO_LEVEL_1
      ? h('div', { class: 'flag mint' }, COPY.bandC.gate)
      : null,
    h('div', { class: 'sheet' }, button(COPY.reading.save, handlers.onSaveReading, { class: 'go' })),
  );
}

export function calculatorScreen(state: AppState, handlers: CalculatorHandlers): HTMLElement {
  const outcome = state.outcome;

  switch (state.step) {
    case 'reading':
      return entryScreen(state, 'bloodSugar', handlers);
    case 'carbs':
      return entryScreen(state, 'carbs', handlers);
    case 'blocked':
      return blocked(state, outcome?.kind === 'blocked_low' ? outcome.bands : [], handlers);
    case 'blank_reading_ack':
      return blankReadingAck(handlers);
    case 'confirm_inputs':
      return confirmInputs(state, handlers);
    case 'result':
      if (outcome?.kind === 'bound_failure') return boundFailure(handlers);
      return outcome === null ? entryScreen(state, 'carbs', handlers) : resultScreen(state, outcome, handlers);
    case 'stacking_override':
      return outcome === null
        ? entryScreen(state, 'carbs', handlers)
        : overrideScreen(state, outcome, handlers);
    case 'amount':
      return outcome === null
        ? entryScreen(state, 'carbs', handlers)
        : amountScreen(state, outcome, handlers);
    case 'logged':
      return loggedScreen(state, handlers);
    case 'record_reading':
      return recordReadingScreen(state, handlers);
  }
}
