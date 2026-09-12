/**
 * §11.2 — ONE explicit application state, a pure transition function, and a
 * result derived from a committed snapshot.
 *
 * The bundle comparison in §11.1 justifies "no framework". It does **not**
 * justify implementing state as scattered DOM mutations and booleans, and §11.2
 * says why: this interface has setup gates, settings drafts, confirmations,
 * validation states, band gates, the ceiling, staleness, accessibility
 * announcements and update coordination. "The predictable failure is one event
 * updating the dose while another leaves the breakdown, the warning or a saved
 * setting stale."
 *
 * §18.14 adds the wizard on top of it, and names the addition up front so it is
 * not discovered during the build: "a screen sequence with a position, a back
 * path, and the rule that GOING BACK NEVER DISCARDS A COMMITTED INPUT".
 *
 * This module is pure. Every write is an EFFECT the shell performs, and the
 * shell reports the outcome back as another action.
 */

import { isResultExpired } from '../core/timing.js';
import { resolve } from '../core/resolve.js';
import type {
  HistoryProvenance,
  LastDose,
  Outcome,
  RawInputs,
  Settings,
  Snapshot,
} from '../core/types.js';

/** Where the app is. Not a route: §11.5 rules out routing entirely. */
export type Screen =
  | 'loading'
  /** §11.3 — a downgrade yields no connection. The calculator refuses. */
  | 'fail_closed'
  /** §10.6 item 1 — blocking, accepted once, persisted. */
  | 'first_run_disclaimer'
  /** §10.6 item 2 — settings entry is mandatory. There are no defaults. */
  | 'first_run_settings'
  | 'calculator'
  | 'settings'
  | 'history'
  | 'export'
  | 'how_it_works'
  /**
   * §11.8's reference data, as a screen. Read-only by design: it never writes
   * into the carbohydrate field, so a wrong row can mislead but can never
   * silently drive a dose — the property §7.8 gives readings, applied to food.
   */
  | 'food_list';

/**
 * §18.14's wizard, as positions. The everyday path is
 * `reading → carbs → result → amount → logged`, and each gate inserts itself
 * into that sequence rather than replacing it.
 */
export type WizardStep =
  | 'reading'
  | 'carbs'
  /** §4.6 — one explicit tap before a meal dose appears without a reading. */
  | 'blank_reading_ack'
  /** §6.2/§6.3 — the inputs restated, the dose withheld. */
  | 'confirm_inputs'
  | 'result'
  /** §7.4.1 — offered from the result, never in place of it. */
  | 'stacking_override'
  /** §7.2 — the amount step. Opening it writes NOTHING. */
  | 'amount'
  | 'logged'
  /** §3 bands C and D. Terminal. */
  | 'blocked'
  /** §7.8 — offered AFTER the treat-first instruction, never instead of it. */
  | 'record_reading';

/** §7.2 — the write can fail, and the injection has already happened. */
export type SaveState =
  | { readonly kind: 'none' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved' }
  /**
   * §7.2 v4 — consumed state is DECOUPLED from persistence, because the button
   * means "I injected this" and the injection has already happened. A failed
   * disk write does not make it unknown to the running session.
   *
   * `attempts` counts them: 1 is the failure the user is shown, 2 is the silent
   * automatic retry, and past that the prompt bar takes over (note 61). It could
   * not exceed 1 until 2026-09-11, because nothing retried.
   *
   * The wording this state renders lives in `COPY.log.pending` and is not quoted
   * here: the version that was, claimed a retry that did not happen and a dose
   * that was not counted, and a docstring repeating a retired string is how the
   * string comes back.
   */
  | { readonly kind: 'pending'; readonly attempts: number };

export interface RecordContext {
  readonly logRevision: number;
  readonly carbBaseline: number | null;
  readonly eligibleEntryCount: number;
  readonly historyProvenance: HistoryProvenance;
  readonly lastDose: LastDose | null;
  readonly bandEFullCardShownToday: boolean;
  readonly excludedTimeRecords: number;
}

export interface AppState {
  readonly screen: Screen;
  readonly step: WizardStep;
  /**
   * The typed values. §18.14's back path reads these, which is what makes
   * "going back never discards a committed input" true by construction rather
   * than by remembering to re-populate a field.
   */
  readonly inputs: RawInputs;
  readonly settings: Settings | null;
  readonly record: RecordContext;
  /** §11.2 — the committed snapshot a result was derived from, or null. */
  readonly snapshot: Snapshot | null;
  readonly outcome: Outcome | null;
  readonly stackingOverride: boolean;
  readonly blankReadingAcknowledged: boolean;
  readonly largeDoseConfirmed: boolean;
  /**
   * §7.1 — the injected amount, as typed. Editing it MUST NOT clear the result:
   * §4.3 step 1 invalidates on any CALCULATION input change, and the logging
   * draft is explicitly not one.
   */
  readonly injectedDraft: string;
  /** §7.2 step 1 — the frozen payload. Null until the second tap begins. */
  readonly committing: FrozenLogPayload | null;
  readonly save: SaveState;
  /** §8.2 — the result is stale and says so. */
  readonly expired: boolean;
}

/**
 * §7.2 step 1 — "generate the event `id` and FREEZE THE ENTIRE PAYLOAD —
 * timestamp, `units`, `injectedUnits`, and every field §7.1 stores."
 *
 * v8 froze only the `id` and timestamp, so a retry could re-read a mutated draft
 * and persist a different amount than the one consumed in step 2.
 */
export interface FrozenLogPayload {
  readonly id: string;
  readonly timestamp: number;
  readonly bloodSugar: number | null;
  readonly carbs: number;
  readonly units: number;
  readonly injectedUnits: number;
  readonly settingsRevision: number;
  readonly overrodeStacking: boolean;
  readonly timingAdvice: 'before' | 'eat_first' | 'suppressed';
  readonly advisoryFlagged: boolean;
}

export const EMPTY_RECORD: RecordContext = {
  logRevision: 0,
  carbBaseline: null,
  eligibleEntryCount: 0,
  historyProvenance: 'suspect',
  lastDose: null,
  bandEFullCardShownToday: false,
  excludedTimeRecords: 0,
};

export function initialState(): AppState {
  return {
    screen: 'loading',
    step: 'reading',
    inputs: { bloodSugar: '', carbs: '' },
    settings: null,
    record: EMPTY_RECORD,
    snapshot: null,
    outcome: null,
    stackingOverride: false,
    blankReadingAcknowledged: false,
    largeDoseConfirmed: false,
    injectedDraft: '',
    committing: null,
    save: { kind: 'none' },
    expired: false,
  };
}

export type Action =
  | { readonly type: 'loaded'; readonly settings: Settings | null; readonly record: RecordContext; readonly disclaimerAccepted: boolean }
  | { readonly type: 'load_failed_closed' }
  | { readonly type: 'disclaimer_accepted' }
  | { readonly type: 'go'; readonly screen: Screen }
  | { readonly type: 'input_changed'; readonly field: 'bloodSugar' | 'carbs'; readonly value: string }
  | { readonly type: 'settings_committed'; readonly settings: Settings }
  | { readonly type: 'record_changed'; readonly record: RecordContext }
  | { readonly type: 'stacking_override_taken' }
  | { readonly type: 'blank_reading_acknowledged' }
  | { readonly type: 'large_dose_confirmed' }
  /**
   * `record` re-derives the SAME stored rows against the current clock, and is
   * deliberately not a `record_changed`: that action means the rows themselves
   * moved (another tab wrote) and therefore invalidates, while this is the
   * correct reading of unchanged rows at the moment of decision. Without it a
   * calculation can use a record context derived hours earlier — see
   * `bandEFullCardShownToday` and §13.3's day-rollover case.
   */
  | { readonly type: 'calculate'; readonly nowMs: number; readonly record?: RecordContext }
  | { readonly type: 'wizard_next' }
  | { readonly type: 'wizard_back' }
  | { readonly type: 'tick'; readonly nowMs: number }
  /** §7.2 — the FIRST tap. Opens the amount step and writes nothing. */
  | { readonly type: 'begin_logging' }
  | { readonly type: 'injected_draft_changed'; readonly value: string }
  /** §7.2 — the SECOND tap. Freezes, stamps, records and writes. */
  | { readonly type: 'commit_log'; readonly payload: FrozenLogPayload }
  | { readonly type: 'log_saved'; readonly record: RecordContext }
  | { readonly type: 'log_save_failed' }
  | { readonly type: 'offer_reading' }
  /**
   * §7.2 — "after a successful tap the result enters a terminal LOGGED state
   * ... and **a second injection requires a new calculation**." This is that
   * new calculation: the only way out of `logged`, and the reason the back path
   * refuses to leave it.
   */
  | { readonly type: 'new_calculation' }
  | { readonly type: 'reset' };

/**
 * §4.3 step 1, in ONE function so no branch can forget a target.
 *
 * "Any change to any input, setting, mode, threshold, LOG REVISION, a readings
 * write, or STACKING OVERRIDE clears all previous dose output and cancels any
 * pending confirmation."
 *
 * The override is in the list as a TARGET as well as a trigger — v3 listed it as
 * a trigger only, "so it could survive a change to the very inputs it was
 * granted for" (§7.4.1).
 */
function invalidate(state: AppState): AppState {
  return {
    ...state,
    snapshot: null,
    outcome: null,
    // §6.3 — the confirmation "applies only to the exact values confirmed".
    largeDoseConfirmed: false,
    stackingOverride: false,
    expired: false,
    // The logging draft belongs to a result that no longer exists.
    injectedDraft: '',
    // But a PENDING save does not. §7.2: "the button means 'I INJECTED THIS',
    // and the injection has already happened. A failed disk write does not make
    // it unknown to the running session." `committing` is not a draft — it is a
    // frozen record of insulin that is in him — so discarding a result must not
    // discard it, or §7.2's in-session gate loses its only input at precisely
    // the moment it is needed: the next calculation. Anything not pending is a
    // finished or never-started write and clears with the result as before.
    ...(state.save.kind === 'pending'
      ? {}
      : { committing: null, save: { kind: 'none' } as const }),
    // §18.14 — going back to a bare wizard position, never past the inputs.
    step: state.step === 'logged' || state.step === 'blocked' ? 'reading' : state.step,
  };
}

/**
 * §4.6's acknowledgement is PER-CALCULATION and never persisted, so it clears
 * with the result like everything else. §11.3's persisted-ack list excludes it
 * deliberately: "a one-time persisted acknowledgement here would be near-zero
 * protection."
 */
function invalidateWithAck(state: AppState): AppState {
  return { ...invalidate(state), blankReadingAcknowledged: false };
}

function buildSnapshot(state: AppState, nowMs: number): Snapshot | null {
  if (state.settings === null) return null;
  return {
    inputs: state.inputs,
    settings: state.settings,
    logRevision: state.record.logRevision,
    decisionTime: nowMs,
    stackingOverride: state.stackingOverride,
    carbBaseline: state.record.carbBaseline,
    eligibleEntryCount: state.record.eligibleEntryCount,
    historyProvenance: state.record.historyProvenance,
    lastDose: gateLastDose(state),
    bandEFullCardShownToday: state.record.bandEFullCardShownToday,
    excludedTimeRecords: state.record.excludedTimeRecords,
    blankReadingAcknowledged: state.blankReadingAcknowledged,
    largeDoseConfirmed: state.largeDoseConfirmed,
  };
}

/** Where an outcome puts the wizard. The core decides; this only places it. */
function stepFor(outcome: Outcome): WizardStep {
  switch (outcome.kind) {
    case 'blocked_low':
      return 'blocked';
    case 'ack_required':
      return 'blank_reading_ack';
    case 'confirm_required':
      return 'confirm_inputs';
    // Stryker disable next-line StringLiteral,ConditionalExpression: §6.4 makes
    // `bound_failure` unreachable through the resolver — "given §4.5's hard
    // ranges, `total <= bound` is a MATHEMATICAL IDENTITY" — so no input can
    // reach this label and no test can show it routing. It stays for the same
    // reason the two checks that produce it stay (note 5): §6.2 gives the
    // outcome a REFUSAL SCREEN, and a future edit that made it reachable must
    // land somewhere that can render one.
    //
    // Listed FIRST of the three, not last: a comment between case labels reads
    // as a statement to `no-fallthrough`, and the disable has to sit adjacent.
    case 'bound_failure':
    case 'dose':
    case 'meal_only_suppressed':
      return 'result';
    case 'invalid_input':
      // Route to the field that is WRONG, not to the last screen visited. This
      // returned 'carbs' unconditionally, so an out-of-range READING sent the
      // user to the carbohydrate screen — which has no reading on it, cannot
      // show the reading's error, and therefore showed nothing. "Work out the
      // dose" appeared to do nothing at all, with a clean console.
      return outcome.errors.some((error) => error.field === 'bloodSugar')
        ? 'reading'
        : 'carbs';
    case 'invalid_settings':
    case 'no_result':
      return 'carbs';
  }
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'loaded': {
      // §10.6 items 1 and 2 — the disclaimer is blocking and accepted once;
      // settings entry is mandatory, because §1.2 ships no defaults.
      const screen: Screen = !action.disclaimerAccepted
        ? 'first_run_disclaimer'
        : action.settings === null
          ? 'first_run_settings'
          : 'calculator';
      return { ...state, screen, settings: action.settings, record: action.record };
    }

    case 'load_failed_closed':
      return { ...state, screen: 'fail_closed' };

    case 'disclaimer_accepted':
      return { ...state, screen: state.settings === null ? 'first_run_settings' : 'calculator' };

    case 'go':
      return { ...state, screen: action.screen };

    case 'input_changed': {
      // §10.8 — clear the dose the INSTANT any input changes. 37% of audited
      // apps had output desynchronised from inputs.
      const inputs: RawInputs = { ...state.inputs, [action.field]: action.value };
      return { ...invalidateWithAck({ ...state, inputs }) };
    }

    case 'settings_committed':
      // A settings change is as dose-affecting as a log append (§11.3 layer 2).
      return { ...invalidateWithAck({ ...state, settings: action.settings }), screen: 'calculator' };

    case 'record_changed':
      // §4.3 step 1 — the log is a dosing input, so a row added, deleted or
      // imported in another tab invalidates a visible result here.
      return invalidateWithAck({ ...state, record: action.record });

    case 'stacking_override_taken':
      // §7.4.1 — using it recomputes the total and RE-RUNS §6.2's confirmation,
      // so it "cannot reveal a previously hidden correction under an earlier
      // acknowledgement". Invalidating first is what makes that true.
      //
      // `invalidateWithAck`, not `invalidate`: §4.3 step 1 lists the stacking
      // override among the triggers that cancel a pending confirmation, and
      // `invalidateWithAck`'s own comment says §4.6's acknowledgement "clears
      // with the result like everything else". Using the narrower one let the
      // blank-reading ack survive an override.
      //
      // Unreachable today, by a three-link coincidence: a blank reading yields
      // correction 0, suppression needs a POSITIVE correction, and the override
      // renders only when suppression happened. §4.1's doctrine is that this
      // project does not lean on coincidences it has not written down — and
      // every one of those three links is free to move independently.
      return { ...invalidateWithAck(state), stackingOverride: true };

    case 'blank_reading_acknowledged':
      return { ...state, blankReadingAcknowledged: true };

    case 'large_dose_confirmed':
      return { ...state, largeDoseConfirmed: true };

    case 'calculate': {
      // §13.3 — "a qualifying result at 11:59 PM then another at 12:01 AM —
      // both full." `bandEFullCardShownToday` is derived against a DAY KEY, and
      // the shell derived it when the record last changed, so a session left
      // open across midnight computed the new day's first result against
      // yesterday's "today" and rendered COMPACT where the case requires FULL.
      // The core always passed that case; the shell wiring did not.
      //
      // `excludedTimeRecords` and `historyProvenance` are derived against `now`
      // too, so this fixes a family rather than one field. It cannot mask
      // another tab's write: the rows come from the shell's existing snapshot
      // of storage, and a genuine change still arrives as `record_changed`.
      const current = action.record === undefined ? state : { ...state, record: action.record };
      const snapshot = buildSnapshot(current, action.nowMs);
      if (snapshot === null) return { ...state, screen: 'first_run_settings' };
      const outcome = resolve(snapshot);
      return { ...current, snapshot, outcome, expired: false, step: stepFor(outcome) };
    }

    case 'wizard_next': {
      if (state.step === 'reading') return { ...state, step: 'carbs' };
      return state;
    }

    case 'wizard_back': {
      // §18.14 — the back path. Nothing here touches `inputs`, which is the
      // whole rule: going back never discards a committed input.
      switch (state.step) {
        case 'carbs':
          return { ...state, step: 'reading' };
        case 'blank_reading_ack':
        case 'confirm_inputs':
        case 'blocked':
        case 'result':
          return { ...state, step: 'carbs' };
        case 'stacking_override':
        case 'amount':
          return { ...state, step: 'result' };
        case 'record_reading':
          return { ...state, step: 'blocked' };
        case 'reading':
        case 'logged':
          return state;
      }
      break;
    }

    case 'tick': {
      // §8.2 — every result carries a timestamp and expires after 15 minutes.
      // Version 1 cleared the dose when INPUTS changed but never when TIME
      // passed, so a resumed app could show "inject now" from a reading three
      // hours old.
      if (state.snapshot === null || state.expired) return state;
      if (!isResultExpired(state.snapshot.decisionTime, action.nowMs)) return state;
      // The decision time is part of what the dose was computed from (§11.2),
      // so its passing invalidates the acknowledgements the way §4.3 step 1
      // does. Leaving them set let a confirmation outlive its result: confirm
      // at 7:00, expire, go back, recalculate hours later — §7.4's suppress
      // window has lapsed, the hidden correction is revealed, and the larger
      // total arrives pre-confirmed. §7.4.1 [R2] forbids exactly that: a
      // recalculation "cannot reveal a previously hidden correction under an
      // earlier acknowledgement". The snapshot on display keeps its own
      // copies, so nothing on the expired screen changes here.
      return {
        ...state,
        expired: true,
        largeDoseConfirmed: false,
        blankReadingAcknowledged: false,
      };
    }

    case 'begin_logging': {
      // §7.2 v23 — THE FIRST TAP OPENS THE AMOUNT STEP AND WRITES NOTHING.
      // v22's mockups implied this tap was the commit, which would freeze the
      // payload before `injectedUnits` was known and make the amount screen an
      // EDIT — and §7.3 forbids editing a logged row.
      if (state.outcome === null) return state;
      if (state.outcome.kind !== 'dose' && state.outcome.kind !== 'meal_only_suppressed') {
        return state;
      }
      // §7.1 — defaults to `units`, so the common case stays one tap.
      return { ...state, step: 'amount', injectedDraft: String(state.outcome.hundredths) };
    }

    case 'injected_draft_changed':
      // Deliberately NOT an invalidation. §7.1: "Editing it must not clear the
      // result — §4.3 step 1 invalidates on any CALCULATION input change, and
      // the logging draft is explicitly not one."
      return { ...state, injectedDraft: action.value };

    case 'commit_log':
      // §7.2 — the SECOND tap. The payload is frozen by the caller and handed
      // in whole; step 2 marks the result consumed IN MEMORY before the write
      // is attempted, which is why `save` goes to `saving` and the step goes to
      // `logged` here rather than after the write returns.
      return { ...state, committing: action.payload, save: { kind: 'saving' }, step: 'logged' };

    case 'log_saved':
      return { ...state, save: { kind: 'saved' }, record: action.record };

    case 'log_save_failed': {
      // §7.2 v4/v5 — the in-session stacking gate still knows about the dose,
      // and THE TIMER STARTS REGARDLESS, because the injection happened and he
      // still needs the eat-at guidance. v4 rewrote the paragraph and left a
      // bullet saying the opposite; an implementer could not satisfy both.
      const attempts = state.save.kind === 'pending' ? state.save.attempts + 1 : 1;
      return { ...state, save: { kind: 'pending', attempts } };
    }

    case 'new_calculation':
      // Clears the inputs as well as the result. A second meal is a second set
      // of numbers, and leaving the last reading in the field is how a stale one
      // gets reused — §10.7 bans `autocomplete` on these fields for the same
      // reason.
      return {
        ...invalidateWithAck({ ...state, inputs: { bloodSugar: '', carbs: '' } }),
        step: 'reading',
      };

    case 'offer_reading':
      // §7.8 — the offer appears AFTER the treat-first instruction, never
      // instead of it, and it is an affordance rather than an advisory, so it
      // sits outside §10.5's budget.
      return { ...state, step: 'record_reading' };

    case 'reset':
      return initialState();
  }
}

/**
 * §7.2 — *"the in-session stacking gate still knows about the dose."* It did
 * not. A failed write never reaches the database, so `record.lastDose` — which
 * the shell derives from stored rows alone — cannot see it, and the next
 * calculation inside §7.4's suppress window re-applied the full correction on
 * top of insulin already acting. That is the stacking event §7.4 exists to
 * prevent, and the app was reassuring him while it happened.
 *
 * `inSessionLastDose` was written for exactly this and had no call site until
 * 2026-09-11; the test beside it proved the function computed, which is not the
 * same as proving the gate reads it.
 *
 * **Only while the save is PENDING.** `committing` is deliberately left
 * standing after a successful save (§7.2 freezes the payload so a retry
 * persists THAT and not a re-read draft), so its presence cannot be the signal
 * — once saved, `record` carries the row and using both would double-count.
 *
 * **The NEWER of the two wins**, rather than the pending one unconditionally:
 * an imported row can post-date a failed local write, and the gate's question
 * is "what is the most recent insulin", not "what did this session do".
 */
function gateLastDose(state: AppState): LastDose | null {
  if (state.save.kind !== 'pending') return state.record.lastDose;
  const pending = inSessionLastDose(state);
  if (pending === null) return state.record.lastDose;
  const recorded = state.record.lastDose;
  return recorded !== null && recorded.atMs > pending.atMs ? recorded : pending;
}

/** §11.3 — the in-session dose the gate still knows about after a failed write. */
export function inSessionLastDose(state: AppState): LastDose | null {
  if (state.committing === null) return null;
  return {
    injectedHundredths: state.committing.injectedUnits,
    atMs: state.committing.timestamp,
  };
}
