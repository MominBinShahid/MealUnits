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
import { classOf, eatDelayFor } from '../../core/insulin.js';
import type { EatDelay } from '../../core/insulin.js';
import { INSULINS } from '../../data/insulins.js';
import type { JSX } from 'preact';
import { useCopy } from '../copy.js';
import type { Copy } from '../copy.js';
import { Advisories, Button, Keypad, Readout, StepDots } from '../components.js';
import type { AdvisoryView } from '../components.js';
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
  /** §4.5 — opens the HI/LO meter guidance on the reading screen. */
  readonly onToggleMeterGuidance: () => void;
  readonly onOpenHistory: () => void;
  readonly onOpenSettings: () => void;
  readonly onStartOver: () => void;
  /** §7.1 — the divergence confirmation's second, deliberate tap. */
  readonly onConfirmDivergent: () => void;
  readonly nowMs: number;
  readonly timeZone: string;
  readonly moreExpanded: boolean;
  readonly meterGuidanceShown: boolean;
  /** §7.1 — why the last commit tap was refused, or null. */
  readonly amountProblem: 'zero' | 'over_cap' | null;
  /** §7.1 — the divergence confirmation is open. */
  readonly amountDiverging: boolean;
}

const TOTAL_STEPS = WIZARD_STEPS;
const FIRST_STEP = 1;
const SECOND_STEP = FIRST_STEP + 1;

/**
 * §10.5's ranked list, turned into renderable views. The RANK is the core's
 * (§4.3 step 11b); this only supplies the words, which live in `copy.ts`.
 */
function advisoryViews(state: AppState, list: readonly Advisory[], copy: Copy): AdvisoryView[] {
  // Not a component, so no hook: the words arrive from the component that
  // could call one, rebound to the name the body already reads.
  const COPY = copy;
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
              COPY.units(last.injectedHundredths),
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
function Working({
  state,
  breakdown,
  doseHundredths,
}: {
  readonly state: AppState;
  readonly breakdown: Breakdown;
  readonly doseHundredths: number;
}): JSX.Element {
  const COPY = useCopy();
  const settings = state.settings;
  const correction =
    settings === null || state.inputs.bloodSugar === ''
      ? null
      : {
          label: COPY.calculator.correctionRow(state.inputs.bloodSugar, String(settings.target)),
          value: formatHundredths(breakdown.correctionHundredths),
        };

  return (
    <div class="working">
      {correction === null ? null : breakdown.correctionSuppressed ? (
        // §10.3 — struck through, WITH ITS REASON. Never silently omitted, and
        // never left as a line that visibly fails to reach the total.
        <div class="row held">
          <span>
            {correction.label}
            {' — '}
            {COPY.stacking.held}
          </span>
          <b><s>{correction.value}</s></b>
        </div>
      ) : (
        <div class="row">
          <span>{correction.label}</span>
          <b>{correction.value}</b>
        </div>
      )}

      {state.inputs.carbs === '' ? null : (
        <div class="row">
          <span>{COPY.calculator.mealRow(state.inputs.carbs)}</span>
          <b>{formatHundredths(breakdown.mealHundredths)}</b>
        </div>
      )}

      <div class="row total">
        <span>{COPY.calculator.rowTotal}</span>
        <b>{COPY.units(doseHundredths)}</b>
      </div>

      {breakdown.componentsSumToTotal ? null : (
        <div class="exact">
          {COPY.calculator.exactBeforeRounding(formatHundredths(breakdown.exactTotalHundredths))}
        </div>
      )}
    </div>
  );
}

/**
 * §3 bands C and D — terminal. **No dose, no working, no partial figure**, and
 * §3.3's scope: the block suppresses every insulin quantity, including the
 * accessibility announcement, and does NOT suppress the treatment instructions.
 *
 * §1.4 — "that single gate may be worth more to him than the arithmetic, it
 * depends on no ratio being correct, and it is available from the first launch."
 */
function Blocked({
  state,
  bands,
  handlers,
}: {
  readonly state: AppState;
  readonly bands: readonly Band[];
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const COPY = useCopy();
  const veryLow = bands.includes('D');
  const words = veryLow ? COPY.bandD : COPY.bandC;
  // §4.3 step 3 — a typed zero or a reading below the meter's floor gets the
  // COMBINED invalid-reading-and-possible-low response, and §10.5 rank 1
  // ("nothing else shows") leaves only one place for the invalid half: the
  // block's own copy. The carbohydrate half of `alsoInvalid` deliberately does
  // NOT render here for the same rank-1 reason — its own entry screen shows it
  // on the way back (see `EntryScreen`).
  const impossibleReading =
    state.outcome?.kind === 'blocked_low' &&
    state.outcome.alsoInvalid.some(
      (error) => error.field === 'bloodSugar' && error.reason === 'below_range',
    );

  return (
    <div class="screen">
      <div class="halt" role="status">
        <div class="n">{state.inputs.bloodSugar || '—'}</div>
        <h2>{words.title}</h2>
        <p>{words.body}</p>
        {veryLow ? <p>{COPY.bandD.escalation}</p> : null}
        <p>{words.gate}</p>
        {impossibleReading ? <p>{COPY.blockedInvalidReading}</p> : null}
        {/* §8.2 — a block goes stale like anything else, and this is the screen
            it matters most on. `blocked` was the only step that ignored
            `expired`: the state flipped after fifteen minutes and nothing on
            screen changed, so the app went on presenting a reading the user had
            been told to replace. A stale dose is dangerous; a stale "do not
            inject" keeps someone from eating after they have already
            recovered. */}
        {state.expired && state.snapshot !== null ? (
          <p class="caution">
            {COPY.expiredBlock(formatClockTime(state.snapshot.decisionTime, handlers.timeZone))}
          </p>
        ) : null}
      </div>
      {/* §7.8 — the offer appears AFTER the treat-first instruction, never
          instead of it, and it is an AFFORDANCE rather than an advisory: §10.5
          rank 1 says nothing else shows, and that governs warnings, not the
          button that lets him save the number he is looking at. */}
      <div class="sheet">
        <Button class="go quiet" onPress={handlers.onOfferReading}>{COPY.reading.offer}</Button>
      </div>
    </div>
  );
}

/**
 * §4.5 — an above-range reading gets "check the number" PLUS the HI guidance,
 * and note 38's lesson is that the guidance needs a rendered slot, not a note
 * claiming one. The LO half sits behind the same control because a meter
 * showing LO produces no typed value, so no error slot can ever reach that
 * user — the standing hint above the keypad is the only thing pointing at
 * either case. The mechanic matches §10.5's "more" affordance: a quiet
 * button, expansion in place, nothing modal.
 */
function MeterGuidance({ handlers }: { readonly handlers: CalculatorHandlers }): JSX.Element {
  const COPY = useCopy();
  if (!handlers.meterGuidanceShown) {
    return (
      <div>
        <Button class="more" aria-expanded={false} onPress={handlers.onToggleMeterGuidance}>
          {COPY.meterGuidance}
        </Button>
      </div>
    );
  }
  return (
    // §10.9 — announced when it appears, like the error slot above: the cards
    // arrive in response to a tap with no screen change.
    <div aria-live="polite">
      <div class="flag">
        <b>{COPY.meterHi.title}</b>
        {COPY.meterHi.body}
      </div>
      <div class="flag">
        <b>{COPY.meterLo.title}</b>
        {COPY.meterLo.body}
      </div>
      {/* The way back. Without it the only exit was finishing a calculation. */}
      <Button class="more" aria-expanded onPress={handlers.onToggleMeterGuidance}>
        {COPY.meterGuidanceHide}
      </Button>
    </div>
  );
}

function EntryScreen({
  state,
  field,
  handlers,
}: {
  readonly state: AppState;
  readonly field: 'bloodSugar' | 'carbs';
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const COPY = useCopy();
  const isReading = field === 'bloodSugar';
  const value = state.inputs[field];
  const [minReading, maxReading] = RANGE.bloodSugar.hard;
  const [, maxCarbs] = RANGE.carbs.hard;
  const step = isReading ? FIRST_STEP : SECOND_STEP;

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
    // §4.3 step 4 — the errors collected alongside a block travel with it,
    // and this slot is where they land: §10.5 rank 1 keeps them off the block
    // screen, and §18.14's back path returns here with the unusable value
    // still in the field (§8.2's expiry clears nothing, so it survives the
    // whole interruption — note 6's "second trip" case). Scoped to range and
    // grammar reasons only, because this renders a message derived from a
    // PREVIOUS calculation on a live input screen: those reasons stay true of
    // the text still on display, while `missing`/`not_finite` describe an
    // absence, and any edit invalidates the outcome (§4.3 step 1) before the
    // message could go stale.
    const errors =
      outcome === null
        ? null
        : outcome.kind === 'invalid_input'
          ? outcome.errors
          : outcome.kind === 'blocked_low'
            ? outcome.alsoInvalid
            : null;
    if (errors === null) return null;
    const error = errors.find((candidate) => candidate.field === field);
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

  return (
    <div class="screen">
      <StepDots
        current={step}
        total={TOTAL_STEPS}
        label={COPY.calculator.stepOf(String(step), String(TOTAL_STEPS))}
      />
      {/* Every navigation control — Back, Settings, History — is rendered by the
          shell at the FOOT of the screen (§10.7). Nothing here draws chrome.

          The greeting is on THIS screen and no other. §10.5 runs a strict budget
          on what shares space with a dose, and a greeting beside "11 units" is
          noise at the one moment noise is dangerous. Here there is no dose
          yet. */}
      {isReading && state.settings !== null && state.settings.personName !== '' ? (
        <p class="greeting">
          {COPY.settings.greeting(state.settings.personName)}
          {' '}
          <span class="wave" aria-hidden="true">{'\u{1F44B}'}</span>
        </p>
      ) : null}
      <div class="ask">
        {/* The break is DELIBERATE and not left to `text-wrap: balance`, which
            rebalances with the viewport and would split "blood / sugar" on a
            narrower phone. The question has two parts — the measurement, then
            the moment — and the line ending is where that division belongs.

            The trailing space before each `<br>` is load-bearing: `textContent`
            concatenates across the break with no whitespace, so without it the
            question reads "blood sugarright now?" to a screen reader and to
            every test that asserts on the sentence. It lives inside the copy
            string, which is why nothing here adds one. */}
        {isReading ? COPY.calculator.askReadingLead : COPY.calculator.askCarbsLead}
        <br />
        {isReading ? COPY.calculator.askReadingRest : COPY.calculator.askCarbsRest}
      </div>
      <p class="hint">
        {isReading
          ? COPY.calculator.meterHiLoHint(String(maxReading))
          : // §10.1 — "the carbohydrate field says GRAMS OF CARBOHYDRATE, never
            // grams or carbs". A 250 g plate of biryani is about 50 g of
            // carbohydrate: two real numbers, both in grams, five-fold apart.
            COPY.calculator.carbsHint}
      </p>
      <div class="entry">
        <div class={value === '' ? 'n empty' : 'n'}>{value === '' ? '—' : value}</div>
        <div class="u">{isReading ? COPY.calculator.unitReading : COPY.calculator.unitCarbs}</div>
      </div>
      {/* §10.9 — `aria-live` so the explanation is announced when it appears. It
          arrives in response to a tap, without a screen change, which is the
          case a live region exists for. */}
      {problem === null ? null : (
        <p class="error entry-error" aria-live="polite">{problem}</p>
      )}
      {isReading ? <MeterGuidance handlers={handlers} /> : null}
      <Keypad
        // §10.1 — no decimal key for the reading, because mg/dL meter readings
        // are whole numbers and omitting it makes no clinical value
        // unenterable. Carbohydrate keeps its key.
        decimal={!isReading}
        onDigit={(digit) => { handlers.onDigit(field, digit); }}
        onBackspace={() => { handlers.onBackspace(field); }}
        action={{
          label: isReading ? COPY.next : COPY.workItOut,
          onPress: isReading ? handlers.onNext : handlers.onCalculate,
          enabled: true,
        }}
      />
    </div>
  );
}

/** §6.3 — the inputs restated, the dose withheld until the tap. */
function ConfirmInputs({
  state,
  handlers,
}: {
  readonly state: AppState;
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const COPY = useCopy();
  const reading =
    state.inputs.bloodSugar === ''
      ? COPY.confirm.noReading
      : `${state.inputs.bloodSugar}\u00A0mg/dL`;
  return (
    <div class="screen">
      <StepDots current={TOTAL_STEPS} total={TOTAL_STEPS} label={COPY.calculator.stepCheck} />
      <div class="ask">{COPY.confirm.title}</div>
      <div class="working">
        <div class="row">
          <span>{COPY.calculator.rowBloodSugar}</span>
          <b>{reading}</b>
        </div>
        <div class="row">
          <span>{COPY.calculator.rowCarbohydrate}</span>
          <b>{`${state.inputs.carbs}\u00A0g`}</b>
        </div>
      </div>
      <p class="hint">
        {/* §6.3 — claim the narrower thing. It catches TRANSCRIPTION errors, not
            ESTIMATION ones: read the plate as 250 in good faith and the
            restatement confirms his own mistake back to him. */}
        {COPY.calculator.confirmHint}
      </p>
      <div class="sheet">
        <Button class="go" onPress={handlers.onConfirmLargeDose}>{COPY.confirm.reveal}</Button>
        <Button class="go quiet" onPress={handlers.onBack}>{COPY.confirm.change}</Button>
      </div>
    </div>
  );
}

/** §4.6 — one explicit tap, and never persisted. */
function BlankReadingAck({ handlers }: { readonly handlers: CalculatorHandlers }): JSX.Element {
  const COPY = useCopy();
  return (
    <div class="screen">
      <div class="ask">{COPY.blankReading.title}</div>
      <p class="hint">{COPY.blankReading.body}</p>
      <p class="hint">
        {/* §4.6 — why ONE tap is the right amount of friction, recorded so it is
            not "improved" later: stronger friction displaces him to entering a
            FABRICATED in-range reading, which is strictly worse. A fake 150
            contributes a fake correction of zero, defeats the low-blood-sugar
            gate entirely, AND corrupts the log §7.4 reads. */}
        {COPY.calculator.blankTimingOff}
      </p>
      <div class="sheet">
        <Button class="go" onPress={handlers.onAcknowledgeBlank}>{COPY.blankReading.accept}</Button>
        <Button class="go quiet" onPress={handlers.onBack}>{COPY.calculator.goBackAndTest}</Button>
      </div>
    </div>
  );
}

/** §6.4 — the app is wrong, not the user, and it cannot be overridden. */
function BoundFailure({ handlers }: { readonly handlers: CalculatorHandlers }): JSX.Element {
  const COPY = useCopy();
  return (
    <div class="screen">
      <div class="halt">
        <h2>{COPY.boundFailure.title}</h2>
        <p>{COPY.boundFailure.body}</p>
      </div>
      <div class="sheet">
        <Button class="go quiet" onPress={handlers.onBack}>{COPY.calculator.startAgain}</Button>
      </div>
    </div>
  );
}

/**
 * §8.5 — the wait this reader should be shown, or null when the app must not
 * name one.
 *
 * Read off the SNAPSHOT wherever there is one. §11.2's rule is that a result is
 * derived from a committed snapshot and from nothing else, and the wait is part
 * of the result: a settings change between working the dose out and injecting
 * it must not move the clock underneath the number already on screen.
 */
function eatDelayOf(state: AppState): EatDelay | null {
  const settings = state.snapshot?.settings ?? state.settings;
  if (settings === null || settings === undefined) return null;
  const insulinClass = state.snapshot?.insulinClass ?? classOf(INSULINS, settings.bolusId);
  return eatDelayFor(insulinClass, settings.eatDelayMinutes);
}

/** The name on the vial, for the label under the dose. Null for "I don't know". */
function brandOf(state: AppState): string | null {
  const settings = state.snapshot?.settings ?? state.settings;
  if (settings === null || settings === undefined) return null;
  return INSULINS.find((row) => row.id === settings.bolusId)?.brand ?? null;
}

function TimingLine({
  state,
  outcome,
  timeZone,
}: {
  readonly state: AppState;
  readonly outcome: Outcome;
  readonly timeZone: string;
}): JSX.Element | null {
  const COPY = useCopy();
  if (outcome.kind !== 'dose' && outcome.kind !== 'meal_only_suppressed') return null;
  if (outcome.timingAdvice === 'suppressed') return null;
  if (outcome.timingAdvice === 'eat_first') {
    return <div class="flag mint"><b>{COPY.timing.eatFirst}</b></div>;
  }
  // §8.1 — BEFORE the tap the app shows the RULE, not a time. Version 1 computed
  // an absolute eat-time from the CALCULATION clock: calculate at 7:10, get
  // distracted, inject at 7:35, eat at the displayed 7:40 — a five-minute lag
  // instead of thirty, and nothing on screen would indicate the number went
  // stale.
  const delay = eatDelayOf(state);
  if (state.committing === null) {
    // §8.5 — with no insulin named there is no wait to state, and the app says
    // so instead of rendering one insulin's clock to everyone. It still says
    // "inject now", because the dose in front of the reader is theirs.
    return delay === null ? (
      <div class="flag mint">
        <b>{COPY.timing.beforeUnknown}</b>
        {COPY.timing.beforeUnknownDetail}
      </div>
    ) : (
      <div class="flag mint">
        <b>{COPY.timing.before(delay)}</b>
        {COPY.timing.beforeDetail}
      </div>
    );
  }
  const injectedAt = formatClockTime(state.committing.timestamp, timeZone);
  if (delay === null) {
    return <div class="flag mint"><b>{COPY.timing.injectedAtOnly(injectedAt)}</b></div>;
  }
  // A zero-width window is an instruction, not a time to wait for: "eat around
  // 7:35" beside "injected 7:35" reads as a coincidence rather than as advice.
  if (delay[1] === 0) {
    return <div class="flag mint"><b>{COPY.timing.injectedAtEatNow(injectedAt)}</b></div>;
  }
  const window = eatWindow(state.committing.timestamp, delay);
  return (
    <div class="flag mint">
      <b>{COPY.timing.injectedAt(injectedAt, formatClockTime(window.toMs, timeZone))}</b>
    </div>
  );
}

function ResultScreen({
  state,
  outcome,
  handlers,
}: {
  readonly state: AppState;
  readonly outcome: Outcome;
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const COPY = useCopy();
  if (outcome.kind !== 'dose' && outcome.kind !== 'meal_only_suppressed') {
    return <div class="screen" />;
  }
  const views = advisoryViews(state, outcome.advisories, COPY);

  return (
    <div class="screen">
      <StepDots current={TOTAL_STEPS} total={TOTAL_STEPS} label={COPY.done} />
      {/* §10.9 — `role="status"`, POLITE, never assertive: assertive could
          announce `55` on the way to `550`. The region pre-exists, and focus is
          not moved. */}
      <div role="status">
        <Readout
          value={formatHundredths(outcome.hundredths)}
          unit={COPY.calculator.doseUnit(brandOf(state))}
          stale={state.expired}
        />
        {state.expired ? (
          <div class="flag">
            {COPY.expired(formatClockTime(state.snapshot?.decisionTime ?? 0, handlers.timeZone))}
          </div>
        ) : null}
        <Working state={state} breakdown={outcome.breakdown} doseHundredths={outcome.hundredths} />
        <Advisories views={views} onMore={handlers.onToggleMore} expanded={handlers.moreExpanded} />
        <TimingLine state={state} outcome={outcome} timeZone={handlers.timeZone} />
      </div>
      <div class="sheet">
        {/* §7.4.1 — offered FROM the result, never in place of it. */}
        {outcome.overrideAvailable ? (
          <Button class="go quiet" onPress={handlers.onOpenOverride}>
            {COPY.calculator.whySmaller}
          </Button>
        ) : null}
        {/* §8.2 dims the expired dose and adds its staleness banner — it does
            not remove either the figure or the log control, which is what this
            branch used to do. "Check again" leads because re-reading is the
            right next move, not because the result is gone.

            The section said "replaced by" until 2026-09-12 and the code never
            did that; §8.2 was amended to match, on its own reasoning — a dimmed
            figure stamped with its time answers "did I already inject?", and
            deleting it leaves §7.2's "how many units did you actually inject?"
            with nothing on screen to answer from. */}
        {state.expired ? (
          <Button class="go" onPress={handlers.onNewCalculation}>
            {COPY.calculator.checkAgain}
          </Button>
        ) : null}
        {/* §7.2 — "Tap after §8.2 expiry is permitted with amended wording …
            but the recorded timestamp is the tap time and the wording says so."
            Quiet, because re-checking is the better move for almost everyone;
            but present, because the one person this is for has ALREADY
            injected, and refusing the row loses a real dose from §7.4's gate.
            `commitLog` stamps `host.now()`, so the tap time is what lands — the
            label says that. */}
        {state.expired ? (
          <Button class="go quiet" onPress={handlers.onBeginLogging}>
            {COPY.log.injectedAfterExpiry}
          </Button>
        ) : (
          <Button class="go" onPress={handlers.onBeginLogging}>{COPY.log.injected}</Button>
        )}
      </div>
    </div>
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
function OverrideScreen({
  state,
  outcome,
  handlers,
}: {
  readonly state: AppState;
  readonly outcome: Outcome;
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const COPY = useCopy();
  if (outcome.kind !== 'meal_only_suppressed') return <div class="screen" />;
  const last = state.record.lastDose;
  const withheld = outcome.overrideFiguresWithheld;

  return (
    <div class="screen">
      <div class="ask">{COPY.stacking.suppressedTitle}</div>
      {last !== null && outcome.stackingCeilingMgDl !== null ? (
        <p class="hint">
          {COPY.stacking.ceiling(
            COPY.units(last.injectedHundredths),
            elapsedHours(last, state.snapshot?.decisionTime ?? 0),
            outcome.stackingCeilingMgDl,
          )}
        </p>
      ) : null}
      {withheld ? (
        <p class="hint">{COPY.calculator.withheldBoth}</p>
      ) : (
        <div class="working">
          <div class="row">
            <span>{COPY.stacking.mealOnly}</span>
            <b>{COPY.units(outcome.hundredths)}</b>
          </div>
        </div>
      )}
      <div class="sheet">
        <Button class="go quiet" onPress={handlers.onTakeOverride}>
          {withheld || outcome.overrideCandidateHundredths === null
            ? COPY.stacking.overrideWithheld
            : COPY.stacking.overrideAction(COPY.units(outcome.overrideCandidateHundredths))}
        </Button>
        <Button class="go" onPress={handlers.onBack}>{COPY.calculator.keepSmaller}</Button>
      </div>
    </div>
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
function AmountScreen({
  state,
  outcome,
  handlers,
}: {
  readonly state: AppState;
  readonly outcome: Outcome;
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const COPY = useCopy();
  if (outcome.kind !== 'dose' && outcome.kind !== 'meal_only_suppressed') {
    return <div class="screen" />;
  }
  const draft = Number(state.injectedDraft);

  return (
    <div class="screen">
      <StepDots current={TOTAL_STEPS} total={TOTAL_STEPS} label={COPY.calculator.stepRecording} />
      <div class="ask">{COPY.log.amountQuestion}</div>
      <p class="hint">{COPY.log.amountHint}</p>
      <div class="entry">
        <div class="n">{formatHundredths(Number.isFinite(draft) ? draft : 0)}</div>
        <div class="u">{COPY.calculator.unitDose}</div>
      </div>
      {/* No `bar`, and no spacer: the spacer is what pushed these to opposite
          edges and let them collapse to 28px wide. See `.stepper` in
          styles.css. */}
      <div class="stepper">
        <Button
          class="key"
          aria-label={COPY.calculator.amountDownLabel}
          onPress={() => { handlers.onAdjustAmount(-AMOUNT_STEP_HUNDREDTHS); }}
        >
          −
        </Button>
        <Button
          class="key"
          aria-label={COPY.calculator.amountUpLabel}
          onPress={() => { handlers.onAdjustAmount(AMOUNT_STEP_HUNDREDTHS); }}
        >
          +
        </Button>
      </div>
      {/* §7.1 — the commit gate's answers, beside the stepper that fixes them.
          The hard cap and the zero are refusals with no way through (§4.5: hard
          ranges reject; only soft ones confirm), worded and aria-treated like
          the entry screens' error slot. The divergence is a CONFIRMATION, so the
          sheet below swaps its commit for the deliberate second tap instead. */}
      {handlers.amountProblem === null ? null : (
        <p class="error entry-error" aria-live="polite">
          {handlers.amountProblem === 'over_cap' ? COPY.range.injectedAbove : COPY.range.injectedZero}
        </p>
      )}
      {handlers.amountDiverging && Number.isInteger(draft) ? (
        <div class="flag" aria-live="polite">
          {COPY.log.divergent(COPY.units(outcome.hundredths), COPY.units(draft))}
        </div>
      ) : null}
      <div class="flag">{COPY.log.amountOnlyChance}</div>
      <div class="flag mint"><b>{COPY.log.commitIsHere}</b></div>
      <div class="sheet">
        {handlers.amountDiverging ? (
          <Button class="go" onPress={handlers.onConfirmDivergent}>{COPY.log.divergentAction}</Button>
        ) : (
          <Button class="go" onPress={handlers.onCommitLog}>{COPY.log.commit}</Button>
        )}
      </div>
    </div>
  );
}

function LoggedScreen({
  state,
  handlers,
}: {
  readonly state: AppState;
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const COPY = useCopy();
  const payload = state.committing;
  const delay = eatDelayOf(state);
  const window = payload === null || delay === null ? null : eatWindow(payload.timestamp, delay);
  return (
    <div class="screen">
      <StepDots current={TOTAL_STEPS} total={TOTAL_STEPS} label={COPY.calculator.stepLogged} />
      {payload === null ? null : (
        <div role="status">
          <div class="ask">
            {COPY.log.saved(
              COPY.units(payload.injectedUnits),
              formatClockTime(payload.timestamp, handlers.timeZone),
            )}
          </div>
          {/* §7.2 — the timer starts REGARDLESS of the write, because the
              injection happened and he still needs the eat-at guidance. */}
          {/* §8.5 — no window, no line. A zero-width one is "eat now" rather
              than a clock time identical to the injection's. */}
          {window !== null && payload.timingAdvice === 'before' ? (
            <div class="flag mint">
              <b>
                {window.toMs === payload.timestamp
                  ? COPY.calculator.eatNow
                  : COPY.calculator.eatAround(formatClockTime(window.toMs, handlers.timeZone))}
              </b>
            </div>
          ) : null}
          {state.save.kind === 'pending' ? <div class="flag">{COPY.log.pending}</div> : null}
        </div>
      )}
      <div class="sheet">
        <Button class="go quiet" onPress={handlers.onOpenHistory}>
          {COPY.calculator.openHistory}
        </Button>
        <Button class="go" onPress={handlers.onNewCalculation}>{COPY.done}</Button>
      </div>
    </div>
  );
}

/** §7.8 — a reading is its own event, and it exposes no insulin quantity. */
function RecordReadingScreen({
  state,
  handlers,
}: {
  readonly state: AppState;
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const COPY = useCopy();
  return (
    <div class="screen">
      <div class="ask">{COPY.reading.title}</div>
      <p class="hint">{COPY.reading.hint}</p>
      <div class="entry">
        {/* §7.8 — the offer PRE-FILLS the blocked reading. He already typed it,
            and retyping invites a transcription error. */}
        <div class="n">{state.inputs.bloodSugar || '—'}</div>
        <div class="u">{COPY.calculator.unitReading}</div>
      </div>
      {Number(state.inputs.bloodSugar) >= KETONE_ADVISORY ? (
        // §10.5 v10 — recording a reading at or above 250 shows band E ITSELF.
        // "Whenever this app sees a number at or above 250, it says check
        // ketones — whether a dose follows or not."
        <div class="flag">
          <b>{COPY.bandE.title}</b>
          {COPY.bandE.body}
        </div>
      ) : null}
      {Number(state.inputs.bloodSugar) < HYPO_LEVEL_1 ? (
        <div class="flag mint">{COPY.bandC.gate}</div>
      ) : null}
      <div class="sheet">
        <Button class="go" onPress={handlers.onSaveReading}>{COPY.reading.save}</Button>
      </div>
    </div>
  );
}

export function CalculatorScreen({
  state,
  handlers,
}: {
  readonly state: AppState;
  readonly handlers: CalculatorHandlers;
}): JSX.Element {
  const outcome = state.outcome;

  switch (state.step) {
    case 'reading':
      return <EntryScreen state={state} field="bloodSugar" handlers={handlers} />;
    case 'carbs':
      return <EntryScreen state={state} field="carbs" handlers={handlers} />;
    case 'blocked':
      return (
        <Blocked
          state={state}
          bands={outcome?.kind === 'blocked_low' ? outcome.bands : []}
          handlers={handlers}
        />
      );
    case 'blank_reading_ack':
      return <BlankReadingAck handlers={handlers} />;
    case 'confirm_inputs':
      return <ConfirmInputs state={state} handlers={handlers} />;
    case 'result':
      if (outcome?.kind === 'bound_failure') return <BoundFailure handlers={handlers} />;
      return outcome === null ? (
        <EntryScreen state={state} field="carbs" handlers={handlers} />
      ) : (
        <ResultScreen state={state} outcome={outcome} handlers={handlers} />
      );
    case 'stacking_override':
      return outcome === null ? (
        <EntryScreen state={state} field="carbs" handlers={handlers} />
      ) : (
        <OverrideScreen state={state} outcome={outcome} handlers={handlers} />
      );
    case 'amount':
      return outcome === null ? (
        <EntryScreen state={state} field="carbs" handlers={handlers} />
      ) : (
        <AmountScreen state={state} outcome={outcome} handlers={handlers} />
      );
    case 'logged':
      return <LoggedScreen state={state} handlers={handlers} />;
    case 'record_reading':
      return <RecordReadingScreen state={state} handlers={handlers} />;
  }
}
