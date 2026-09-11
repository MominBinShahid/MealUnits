/**
 * §11.2's reducer and §18.14's wizard.
 *
 * §11.1 withdraws a version-1 claim that this file exists to keep honest: "*A UI
 * refactor cannot change a dose.* **FALSE.** A refactor can swap field mappings,
 * parse separators differently, read stale settings, or bypass a gate entirely,
 * all with `dose.ts` untouched." So the assertions below are about the
 * MAPPING and the INVALIDATION, not about arithmetic — the arithmetic is pinned
 * by the golden cases.
 */

import { describe, expect, it } from 'vitest';
import { COPY } from '../src/ui/copy.js';
import { EMPTY_RECORD, initialState, reduce } from '../src/state/machine.js';
import type { Action, AppState, FrozenLogPayload, RecordContext } from '../src/state/machine.js';
import type { Settings } from '../src/core/types.js';

const NOW = 1_757_000_000_000;
const MINUTE = 60_000;
const HOUR = 3_600_000;

const SETTINGS: Settings = {
  revision: 1,
  target: 150,
  isf: 30,
  icr: 10,
  mode: 'nearest',
  threshold: 20,
  basalName: 'Lantus',
  basalUnits: 36,
  basalTiming: 'early morning', personName: '',
};

const RECORD: RecordContext = { ...EMPTY_RECORD, historyProvenance: 'trusted' };

function run(actions: readonly Action[], from = initialState()): AppState {
  return actions.reduce(reduce, from);
}

const READY: readonly Action[] = [
  { type: 'loaded', settings: SETTINGS, record: RECORD, disclaimerAccepted: true },
];

function typed(bloodSugar: string, carbs: string): Action[] {
  return [
    ...READY,
    { type: 'input_changed', field: 'bloodSugar', value: bloodSugar },
    { type: 'input_changed', field: 'carbs', value: carbs },
  ];
}

describe('§10.6 first run', () => {
  it('shows the blocking disclaimer before anything else', () => {
    const state = run([
      { type: 'loaded', settings: SETTINGS, record: RECORD, disclaimerAccepted: false },
    ]);
    expect(state.screen).toBe('first_run_disclaimer');
  });

  it('then requires settings, because §1.2 ships no defaults', () => {
    const state = run([
      { type: 'loaded', settings: null, record: RECORD, disclaimerAccepted: true },
    ]);
    expect(state.screen).toBe('first_run_settings');
  });

  it('and accepting the disclaimer with no settings still lands on settings', () => {
    const state = run([
      { type: 'loaded', settings: null, record: RECORD, disclaimerAccepted: false },
      { type: 'disclaimer_accepted' },
    ]);
    expect(state.screen).toBe('first_run_settings');
  });

  it('§11.3 — a downgrade puts the app on the fail-closed screen', () => {
    expect(run([{ type: 'load_failed_closed' }]).screen).toBe('fail_closed');
  });

  it('and calculating without settings routes to settings rather than guessing', () => {
    const state = run([
      { type: 'loaded', settings: null, record: RECORD, disclaimerAccepted: true },
      { type: 'input_changed', field: 'carbs', value: '60' },
      { type: 'calculate', nowMs: NOW },
    ]);
    expect(state.screen).toBe('first_run_settings');
    expect(state.outcome).toBeNull();
  });
});

describe('§4.3 step 1 — every trigger clears the result', () => {
  // Computed INSIDE the tests, not at describe scope. A `run(...)` evaluated
  // while vitest collects makes every mutant it touches STATIC, and Stryker's
  // vitest runner cannot attribute a static mutant to any test — it reports
  // `testsCompleted: 0` and marks it survived, whatever the assertions say.
  // That is why `initialState`, `invalidate` and `buildSnapshot` showed as
  // uncovered while this file asserted them exhaustively.
  const calculated = (): AppState => run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);

  it('produces a result to begin with', () => {
    expect(calculated().outcome?.kind).toBe('dose');
    expect(calculated().snapshot).not.toBeNull();
  });

  const triggers: [string, Action][] = [
    ['a blood sugar change', { type: 'input_changed', field: 'bloodSugar', value: '331' }],
    ['a carbohydrate change', { type: 'input_changed', field: 'carbs', value: '51' }],
    ['a settings commit', { type: 'settings_committed', settings: { ...SETTINGS, icr: 12, revision: 2 } }],
    ['a mode change', { type: 'settings_committed', settings: { ...SETTINGS, mode: 'half', revision: 2 } }],
    ['a threshold change', { type: 'settings_committed', settings: { ...SETTINGS, threshold: 25, revision: 2 } }],
    ['a log revision change', { type: 'record_changed', record: { ...RECORD, logRevision: 9 } }],
    ['taking the stacking override', { type: 'stacking_override_taken' }],
  ];

  it.each(triggers)('clears it on %s', (_name, action) => {
    const after = reduce(calculated(), action);
    expect(after.outcome).toBeNull();
    expect(after.snapshot).toBeNull();
  });

  it.each(triggers)('and cancels a pending confirmation on %s', (_name, action) => {
    const confirmed = reduce(calculated(), { type: 'large_dose_confirmed' });
    expect(confirmed.largeDoseConfirmed).toBe(true);
    expect(reduce(confirmed, action).largeDoseConfirmed).toBe(false);
  });

  it('§7.4.1 — the OVERRIDE is a target of invalidation, not only a trigger', () => {
    // v3 listed `stackingOverride` as an invalidation trigger and never as a
    // target, "so it could survive a change to the very inputs it was granted
    // for".
    const withOverride = reduce(calculated(), { type: 'stacking_override_taken' });
    expect(withOverride.stackingOverride).toBe(true);
    const afterEdit = reduce(withOverride, {
      type: 'input_changed',
      field: 'carbs',
      value: '60',
    });
    expect(afterEdit.stackingOverride).toBe(false);
  });

  it('§4.6 — the blank-reading acknowledgement clears too, being per-calculation', () => {
    const acknowledged = reduce(calculated(), { type: 'blank_reading_acknowledged' });
    expect(acknowledged.blankReadingAcknowledged).toBe(true);
    const after = reduce(acknowledged, { type: 'input_changed', field: 'carbs', value: '61' });
    expect(after.blankReadingAcknowledged).toBe(false);
  });

  it('but the TYPED VALUES survive — invalidation clears output, not input', () => {
    const after = reduce(calculated(), { type: 'record_changed', record: { ...RECORD, logRevision: 9 } });
    expect(after.inputs).toEqual({ bloodSugar: '330', carbs: '50' });
  });
});

describe('§18.14 the wizard', () => {
  it('walks reading → carbs → result', () => {
    let state = run(READY);
    expect(state.step).toBe('reading');
    state = reduce(state, { type: 'wizard_next' });
    expect(state.step).toBe('carbs');
    state = run(
      [
        { type: 'input_changed', field: 'bloodSugar', value: '330' },
        { type: 'input_changed', field: 'carbs', value: '50' },
        { type: 'calculate', nowMs: NOW },
      ],
      state,
    );
    expect(state.step).toBe('result');
  });

  it('GOING BACK NEVER DISCARDS A COMMITTED INPUT — the named consequence', () => {
    // §18.14: "That is new machinery, it is in the §17 step 5 budget, and it is
    // named here so it is not discovered during the build."
    let state = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);
    expect(state.step).toBe('result');
    state = reduce(state, { type: 'wizard_back' });
    expect(state.step).toBe('carbs');
    expect(state.inputs.carbs).toBe('50');
    state = reduce(state, { type: 'wizard_back' });
    expect(state.step).toBe('reading');
    expect(state.inputs.bloodSugar).toBe('330');
    expect(state.inputs.carbs).toBe('50');
  });

  it('and the first step has nowhere to go back to', () => {
    const state = run(READY);
    expect(reduce(state, { type: 'wizard_back' }).step).toBe('reading');
  });

  it('places a blocked low on its own terminal step', () => {
    const state = run([...typed('65', '50'), { type: 'calculate', nowMs: NOW }]);
    expect(state.outcome?.kind).toBe('blocked_low');
    expect(state.step).toBe('blocked');
  });

  it('§7.8 — and the reading offer sits AFTER that block, with a way back to it', () => {
    let state = run([...typed('65', '50'), { type: 'calculate', nowMs: NOW }]);
    state = reduce(state, { type: 'offer_reading' });
    expect(state.step).toBe('record_reading');
    expect(reduce(state, { type: 'wizard_back' }).step).toBe('blocked');
  });

  it('places §6.2s confirmation on its own step, ahead of the result', () => {
    const state = run([...typed('330', '200'), { type: 'calculate', nowMs: NOW }]);
    expect(state.outcome?.kind).toBe('confirm_required');
    expect(state.step).toBe('confirm_inputs');
  });

  it('and §4.6s acknowledgement likewise', () => {
    const state = run([
      ...READY,
      { type: 'input_changed', field: 'carbs', value: '60' },
      { type: 'calculate', nowMs: NOW },
    ]);
    expect(state.outcome?.kind).toBe('ack_required');
    expect(state.step).toBe('blank_reading_ack');
  });
});

describe('§7.2 the commit is the SECOND tap', () => {
  const withResult = (): AppState => run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);

  it('the first tap opens the amount step and WRITES NOTHING', () => {
    // §7.2 v23 — v22's mockups implied the first tap was the commit, which
    // would freeze the payload before `injectedUnits` was known and make the
    // amount screen an EDIT. §7.3 forbids editing a logged row.
    const opened = reduce(withResult(), { type: 'begin_logging' });
    expect(opened.step).toBe('amount');
    expect(opened.committing).toBeNull();
    expect(opened.save.kind).toBe('none');
  });

  it('and it pre-fills the amount with the calculated() dose, so the common case is one tap', () => {
    const opened = reduce(withResult(), { type: 'begin_logging' });
    expect(opened.injectedDraft).toBe('1100');
  });

  it('editing the amount does NOT clear the result', () => {
    // §7.1 — "§4.3 step 1 invalidates on any CALCULATION input change, and the
    // logging draft is explicitly not one."
    const edited = run(
      [{ type: 'begin_logging' }, { type: 'injected_draft_changed', value: '2500' }],
      withResult(),
    );
    expect(edited.outcome?.kind).toBe('dose');
    expect(edited.snapshot).not.toBeNull();
    expect(edited.injectedDraft).toBe('2500');
  });

  it('the second tap freezes the payload and moves to the logged state', () => {
    const payload: FrozenLogPayload = {
      id: 'dose-1',
      timestamp: NOW,
      bloodSugar: 330,
      carbs: 50,
      units: 1100,
      injectedUnits: 2500,
      settingsRevision: 1,
      overrodeStacking: false,
      timingAdvice: 'before',
      advisoryFlagged: false,
    };
    const committed = run(
      [{ type: 'begin_logging' }, { type: 'commit_log', payload }],
      withResult(),
    );
    expect(committed.step).toBe('logged');
    expect(committed.committing).toEqual(payload);
    expect(committed.save.kind).toBe('saving');
  });

  it('refuses to open the amount step when there is no dose to log', () => {
    const blocked = run([...typed('65', '50'), { type: 'calculate', nowMs: NOW }]);
    expect(reduce(blocked, { type: 'begin_logging' }).step).toBe('blocked');
  });
});

describe('§7.2 a failed() write does not un-inject anything', () => {
  const payload: FrozenLogPayload = {
    id: 'dose-1',
    timestamp: NOW,
    bloodSugar: 330,
    carbs: 50,
    units: 1100,
    injectedUnits: 1100,
    settingsRevision: 1,
    overrodeStacking: false,
    timingAdvice: 'before',
    advisoryFlagged: false,
  };
  const failed = (): AppState => run(
    [
      ...typed('330', '50'),
      { type: 'calculate', nowMs: NOW },
      { type: 'begin_logging' },
      { type: 'commit_log', payload },
      { type: 'log_save_failed' },
    ],
  );

  it('enters a pending-save state rather than abandoning the dose', () => {
    // §7.2 v4 — "the button means 'I INJECTED THIS', and the injection has
    // already happened. A failed() disk write does not make it unknown to the
    // running session."
    expect(failed().save).toEqual({ kind: 'pending', attempts: 1 });
    expect(failed().step).toBe('logged');
  });

  it('keeps the frozen payload, so a retry persists THAT and not a re-read draft', () => {
    // v8 froze only the id and timestamp, so a retry could re-read a mutated
    // draft and persist a different amount than the one consumed in step 2.
    const edited = reduce(failed(), { type: 'injected_draft_changed', value: '9999' });
    expect(edited.committing?.injectedUnits).toBe(1100);
    expect(reduce(edited, { type: 'log_save_failed' }).save).toEqual({
      kind: 'pending',
      attempts: 2,
    });
  });

  it('and `inSessionLastDose` computes the dose the gate needs', async () => {
    // Renamed 2026-09-11. This proves the FUNCTION computes; it was named for a
    // property of the GATE, and the gate did not read it — the case below is
    // the one that pins what §7.2 actually promises.
    const { inSessionLastDose } = await import('../src/state/machine.js');
    expect(inSessionLastDose(failed())).toEqual({ injectedHundredths: 1100, atMs: NOW });
    expect(inSessionLastDose(initialState())).toBeNull();
  });

  /**
   * §7.2 — *"The in-session stacking gate still knows about the dose."* The
   * promise, end to end, rather than the helper in isolation: an 11-unit dose
   * whose write FAILED must still reach §7.4's gate on the next calculation,
   * because the failure is a disk fact and the injection happened anyway.
   *
   * Before `gateLastDose` existed this returned a plain `dose` with the full
   * correction re-applied on top of insulin already acting — while the screen
   * told him the dose was counted.
   */
  it('and the STACKING GATE reads it — a failed() write still suppresses', () => {
    const recalculated = run(
      [
        { type: 'new_calculation' },
        { type: 'input_changed', field: 'bloodSugar', value: '330' },
        { type: 'input_changed', field: 'carbs', value: '50' },
        // Two hours on, well inside §7.4's 4-hour suppress window.
        { type: 'calculate', nowMs: NOW + 2 * 60 * 60 * 1000 },
      ],
      failed(),
    );
    expect(recalculated.snapshot?.lastDose).toEqual({ injectedHundredths: 1100, atMs: NOW });
    expect(recalculated.outcome?.kind).toBe('meal_only_suppressed');
  });

  it('but a SAVED write leaves the record to speak, so nothing double-counts', () => {
    // `committing` deliberately survives a successful save (§7.2 freezes the
    // payload for a retry), so `save.kind` is the only honest signal.
    const saved = run([{ type: 'log_saved', record: RECORD }], failed());
    expect(saved.committing).not.toBeNull();
    const recalculated = run(
      [
        { type: 'new_calculation' },
        { type: 'input_changed', field: 'bloodSugar', value: '330' },
        { type: 'input_changed', field: 'carbs', value: '50' },
        { type: 'calculate', nowMs: NOW + 2 * 60 * 60 * 1000 },
      ],
      saved,
    );
    expect(recalculated.snapshot?.lastDose).toBeNull();
  });

  /**
   * §7.2 — a COPY assertion in a reducer file, deliberately, because this is
   * where a reader arrives when they want to know what a pending save does. The
   * string has exactly one render site (`calculator.ts`, the `.flag` div on the
   * logged step), so pinning the words pins what is on screen.
   *
   * It asserts the ABSENCE of two claims rather than the presence of a
   * sentence, so rewording stays free while the two things the app cannot
   * honestly say stay out. Both were shipped until 2026-09-11: nothing retries,
   * and the dose is NOT counted, because the snapshot reads `lastDose` from the
   * database and a failed() write never reached it.
   */
  it('and the pending message promises no retry, and bounds the counting to this session', () => {
    // Nothing retries, so the word stays out until something does.
    expect(COPY.log.pending).not.toMatch(/retry|retrying/i);
    // The gate DOES read it now (the two cases above), so saying it counts is
    // honest again — but only while the app is open, because nothing persists
    // it, and an unqualified "still counted" is what shipped falsely before.
    expect(COPY.log.pending).toMatch(/counts/i);
    expect(COPY.log.pending).toMatch(/while the app is open/i);
    expect(COPY.log.pending).toMatch(/closing the app will lose it/i);
    // And what the gap costs him, in §7.4's own language.
    expect(COPY.log.pending).toMatch(/stack/i);
  });
});

describe('§8.2 results expire', () => {
  // Computed INSIDE the tests, not at describe scope. A `run(...)` evaluated
  // while vitest collects makes every mutant it touches STATIC, and Stryker's
  // vitest runner cannot attribute a static mutant to any test — it reports
  // `testsCompleted: 0` and marks it survived, whatever the assertions say.
  // That is why `initialState`, `invalidate` and `buildSnapshot` showed as
  // uncovered while this file asserted them exhaustively.
  const calculated = (): AppState => run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);

  it('after fifteen minutes, and not before', () => {
    expect(reduce(calculated(), { type: 'tick', nowMs: NOW + 14 * MINUTE }).expired).toBe(false);
    expect(reduce(calculated(), { type: 'tick', nowMs: NOW + 15 * MINUTE }).expired).toBe(true);
  });

  it('and a resumed app three hours later is expired, not actionable', () => {
    // Version 1 cleared the dose when INPUTS changed but never when TIME
    // passed, so a resumed app could show "7 units — inject now" computed from
    // a reading three hours old.
    expect(reduce(calculated(), { type: 'tick', nowMs: NOW + 3 * HOUR }).expired).toBe(true);
  });

  it('ticking with no result at all changes nothing', () => {
    const fresh = run(READY);
    expect(reduce(fresh, { type: 'tick', nowMs: NOW + HOUR })).toBe(fresh);
  });

  it('and a fresh calculation clears the expiry', () => {
    const stale = reduce(calculated(), { type: 'tick', nowMs: NOW + HOUR });
    expect(stale.expired).toBe(true);
    expect(reduce(stale, { type: 'calculate', nowMs: NOW + HOUR }).expired).toBe(false);
  });

  it('and expiry clears the acknowledgements, so a stale confirmation cannot authorise a larger dose', () => {
    // §11.2 — the decision time is part of what the dose was computed from,
    // and §7.4.1 [R2] says a recalculation "cannot reveal a previously hidden
    // correction under an earlier acknowledgement". A dose two hours back
    // suppresses the 5-unit correction, so the confirmation was given for the
    // meal-only 25; five hours later the window has lapsed and the total is
    // 30 — the gate must re-fire rather than arrive pre-confirmed.
    const confirmed = run([
      {
        type: 'record_changed',
        record: { ...RECORD, lastDose: { injectedHundredths: 600, atMs: NOW - 2 * HOUR } },
      },
      { type: 'input_changed', field: 'bloodSugar', value: '300' },
      { type: 'input_changed', field: 'carbs', value: '250' },
      { type: 'calculate', nowMs: NOW },
      { type: 'large_dose_confirmed' },
      { type: 'calculate', nowMs: NOW },
    ], run(READY));
    expect(confirmed.outcome?.kind).toBe('meal_only_suppressed');

    const stale = reduce(confirmed, { type: 'tick', nowMs: NOW + 20 * MINUTE });
    expect(stale.largeDoseConfirmed).toBe(false);
    expect(stale.blankReadingAcknowledged).toBe(false);

    const recalculated = run([
      { type: 'wizard_back' },
      { type: 'calculate', nowMs: NOW + 5 * HOUR },
    ], stale);
    expect(recalculated.outcome?.kind).toBe('confirm_required');
  });
});

describe('§11.2 the snapshot is what the result came from', () => {
  it('carries every field the core reads, from the state at that instant', () => {
    const record: RecordContext = {
      logRevision: 7,
      carbBaseline: 150,
      eligibleEntryCount: 24,
      historyProvenance: 'suspect',
      lastDose: { injectedHundredths: 600, atMs: NOW - 2 * HOUR },
      bandEFullCardShownToday: true,
      excludedTimeRecords: 2,
    };
    const state = run([
      { type: 'loaded', settings: SETTINGS, record, disclaimerAccepted: true },
      { type: 'input_changed', field: 'bloodSugar', value: '330' },
      { type: 'input_changed', field: 'carbs', value: '50' },
      { type: 'calculate', nowMs: NOW },
    ]);
    expect(state.snapshot).toEqual({
      inputs: { bloodSugar: '330', carbs: '50' },
      settings: SETTINGS,
      logRevision: 7,
      decisionTime: NOW,
      stackingOverride: false,
      carbBaseline: 150,
      eligibleEntryCount: 24,
      historyProvenance: 'suspect',
      lastDose: { injectedHundredths: 600, atMs: NOW - 2 * HOUR },
      bandEFullCardShownToday: true,
      excludedTimeRecords: 2,
      blankReadingAcknowledged: false,
      largeDoseConfirmed: false,
    });
  });

  it('and the settings REVISION travels with it — §11.3s row stamp reads this', () => {
    // §11.3 v14 — "v13 said the stamp is read from `settings.revision`", but
    // cross-tab those diverge inside the poll window: a settings commit in tab B
    // racing a tap in tab A stamps k+1 onto a dose computed under k.
    const state = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);
    expect(state.snapshot?.settings.revision).toBe(1);
  });
});

describe('a reset returns to the beginning', () => {
  it('drops everything', () => {
    const busy = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);
    expect(reduce(busy, { type: 'reset' })).toEqual(initialState());
  });
});

describe('navigation', () => {
  it('moves between screens without touching the calculation', () => {
    // Computed INSIDE the tests, not at describe scope. A `run(...)` evaluated
  // while vitest collects makes every mutant it touches STATIC, and Stryker's
  // vitest runner cannot attribute a static mutant to any test — it reports
  // `testsCompleted: 0` and marks it survived, whatever the assertions say.
  // That is why `initialState`, `invalidate` and `buildSnapshot` showed as
  // uncovered while this file asserted them exhaustively.
  const calculated = (): AppState => run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);
    const away = reduce(calculated(), { type: 'go', screen: 'history' });
    expect(away.screen).toBe('history');
    expect(away.outcome?.kind).toBe('dose');
    expect(reduce(away, { type: 'go', screen: 'calculator' }).outcome?.kind).toBe('dose');
  });
});

/**
 * §13.4's mutation gate reached `src/state` on 2026-09-11, and these are the
 * assertions that were missing when it did. They are deliberately EXHAUSTIVE
 * rather than illustrative: the survivors were `initialState`'s three safety
 * flags mutated to `true`, the whole `invalidate` reset, and every arm of
 * `stepFor`'s routing — the seams where a wrong value is a wrong gate, and
 * precisely what the old scope could not see.
 *
 * The same blindness hid the `appendReading` defect in `src/storage`, which is
 * still outside the gate (see BACKLOG's technical entry).
 */
describe('§13.4 — the reducer seams the mutation gate now covers', () => {
  it('a fresh state has every gate CLOSED and every field empty', () => {
    // Every flag false, not "some of them": each one open by default is a gate
    // that never fires, and all three survived as `true` before this test.
    expect(initialState()).toEqual({
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
    });
  });

  it('an empty record is suspect and claims nothing', () => {
    // §7.5 — the safe default. `trusted` here would assert "no recent insulin"
    // about a record the app has never read.
    expect(EMPTY_RECORD).toEqual({
      logRevision: 0,
      carbBaseline: null,
      eligibleEntryCount: 0,
      historyProvenance: 'suspect',
      lastDose: null,
      bandEFullCardShownToday: false,
      excludedTimeRecords: 0,
    });
  });

  it('§4.3 step 1 — invalidating clears the result and every acknowledgement', () => {
    const live = run([
      ...typed('330', '50'),
      { type: 'calculate', nowMs: NOW },
      { type: 'large_dose_confirmed' },
      { type: 'stacking_override_taken' },
    ]);
    const after = reduce(live, { type: 'input_changed', field: 'carbs', value: '51' });
    expect(after.snapshot).toBeNull();
    expect(after.outcome).toBeNull();
    expect(after.largeDoseConfirmed).toBe(false);
    expect(after.blankReadingAcknowledged).toBe(false);
    expect(after.stackingOverride).toBe(false);
    expect(after.expired).toBe(false);
    expect(after.injectedDraft).toBe('');
    expect(after.committing).toBeNull();
    expect(after.save).toEqual({ kind: 'none' });
    // And the typed value that caused it survives — §18.14's whole rule.
    expect(after.inputs).toEqual({ bloodSugar: '330', carbs: '51' });
  });

  it('§18.14 — invalidating rewinds only the two terminal steps', () => {
    const at = (step: AppState['step']): AppState['step'] => {
      const state = { ...run(typed('330', '50')), step } as AppState;
      return reduce(state, { type: 'input_changed', field: 'carbs', value: '9' }).step;
    };
    expect(at('logged')).toBe('reading');
    expect(at('blocked')).toBe('reading');
    // Everything else keeps its place: rewinding from `carbs` would discard the
    // screen he is standing on for a keystroke he just made on it.
    expect(at('carbs')).toBe('carbs');
    expect(at('result')).toBe('result');
  });

  it('§7.2 — a PENDING save survives invalidation; a finished one does not', () => {
    const payload: FrozenLogPayload = {
      id: 'd', timestamp: NOW, bloodSugar: 330, carbs: 50, units: 1100,
      injectedUnits: 1100, settingsRevision: 1, overrodeStacking: false,
      timingAdvice: 'before', advisoryFlagged: false,
    };
    const base = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }, { type: 'begin_logging' }, { type: 'commit_log', payload }]);
    expect(base.save).toEqual({ kind: 'saving' });
    expect(base.committing).toEqual(payload);

    const pending = reduce(base, { type: 'log_save_failed' });
    const afterPending = reduce(pending, { type: 'new_calculation' });
    expect(afterPending.committing).toEqual(payload);
    expect(afterPending.save).toEqual({ kind: 'pending', attempts: 1 });

    const saved = reduce(base, { type: 'log_saved', record: RECORD });
    expect(saved.save).toEqual({ kind: 'saved' });
    expect(reduce(saved, { type: 'new_calculation' }).committing).toBeNull();
    expect(reduce(saved, { type: 'new_calculation' }).save).toEqual({ kind: 'none' });
  });

  it('§4.3 — every outcome lands on the step that can show it', () => {
    const stepFor = (bs: string, carbs: string, settings = SETTINGS): AppState['step'] =>
      run([
        { type: 'loaded', settings, record: RECORD, disclaimerAccepted: true },
        { type: 'input_changed', field: 'bloodSugar', value: bs },
        { type: 'input_changed', field: 'carbs', value: carbs },
        { type: 'calculate', nowMs: NOW },
      ]).step;
    expect(stepFor('330', '50')).toBe('result');
    expect(stepFor('65', '50')).toBe('blocked');
    expect(stepFor('', '50')).toBe('blank_reading_ack');
    // §4.5 — the error is on the READING, so it routes to the reading screen…
    expect(stepFor('605', '50')).toBe('reading');
    // …and a carbohydrate error to the carbohydrate screen. Routing to the
    // wrong one is note 38's defect: a screen that cannot show the error.
    expect(stepFor('180', '999')).toBe('carbs');
    // §4.3 step 5 — nothing asked for. Carbohydrate is the field that makes a
    // dose possible, so that is where "nothing entered" belongs.
    expect(stepFor('', '')).toBe('carbs');
    expect(stepFor('180', '', { ...SETTINGS, isf: Number.NaN })).toBe('carbs');
  });

  it('§18.14 — `wizard_next` advances only from the reading screen', () => {
    const from = (step: AppState['step']): AppState['step'] =>
      reduce({ ...run(typed('180', '50')), step }, { type: 'wizard_next' }).step;
    expect(from('reading')).toBe('carbs');
    expect(from('carbs')).toBe('carbs');
    expect(from('result')).toBe('result');
  });

  it('§18.14 — `wizard_back` walks the gates back to where they came from', () => {
    const from = (step: AppState['step']): AppState['step'] =>
      reduce({ ...run(typed('180', '50')), step }, { type: 'wizard_back' }).step;
    expect(from('carbs')).toBe('reading');
    expect(from('blank_reading_ack')).toBe('carbs');
    expect(from('confirm_inputs')).toBe('carbs');
    expect(from('blocked')).toBe('carbs');
    expect(from('result')).toBe('carbs');
    expect(from('stacking_override')).toBe('result');
    expect(from('amount')).toBe('result');
    // §18.14 — the two it is a no-op on, which is why no Back is offered there.
    expect(from('reading')).toBe('reading');
    expect(from('logged')).toBe('logged');
  });

  it('§10.6 — where `loaded` puts you depends on what is already answered', () => {
    const land = (accepted: boolean, settings: typeof SETTINGS | null): AppState['screen'] =>
      reduce(initialState(), { type: 'loaded', settings, record: RECORD, disclaimerAccepted: accepted }).screen;
    expect(land(false, SETTINGS)).toBe('first_run_disclaimer');
    expect(land(true, null)).toBe('first_run_settings');
    expect(land(true, SETTINGS)).toBe('calculator');
    // And accepting the disclaimer still stops at settings when there are none.
    expect(reduce(land(false, null) === 'first_run_disclaimer'
      ? reduce(initialState(), { type: 'loaded', settings: null, record: RECORD, disclaimerAccepted: false })
      : initialState(), { type: 'disclaimer_accepted' }).screen).toBe('first_run_settings');
  });

  it('§7.2 — `begin_logging` opens only on a dose, and writes nothing', () => {
    const blocked = run([...typed('65', '50'), { type: 'calculate', nowMs: NOW }]);
    expect(reduce(blocked, { type: 'begin_logging' }).step).toBe('blocked');
    expect(reduce(initialState(), { type: 'begin_logging' })).toEqual(initialState());
    const dosed = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);
    const opened = reduce(dosed, { type: 'begin_logging' });
    expect(opened.step).toBe('amount');
    expect(opened.committing).toBeNull();
    expect(opened.save).toEqual({ kind: 'none' });
  });

  it('§4.3 step 1 — a settings commit invalidates and lands on the calculator', () => {
    const live = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);
    const after = reduce(live, { type: 'settings_committed', settings: { ...SETTINGS, isf: 40, revision: 2 } });
    expect(after.screen).toBe('calculator');
    expect(after.outcome).toBeNull();
    expect(after.settings?.isf).toBe(40);
  });

  it('§13.3 — `calculate` uses the record it is handed, and keeps it', () => {
    const fresh: RecordContext = { ...RECORD, bandEFullCardShownToday: true };
    const state = run([
      ...typed('330', '50'),
      { type: 'calculate', nowMs: NOW, record: fresh },
    ]);
    expect(state.snapshot?.bandEFullCardShownToday).toBe(true);
    expect(state.record).toEqual(fresh);
    // Without one, the state's own record stands.
    expect(run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]).record).toEqual(RECORD);
  });

  it('§7.4 — the gate prefers whichever dose is NEWER', () => {
    const payload: FrozenLogPayload = {
      id: 'd', timestamp: NOW - 3 * 60 * 60 * 1000, bloodSugar: 330, carbs: 50,
      units: 1100, injectedUnits: 1100, settingsRevision: 1, overrodeStacking: false,
      timingAdvice: 'before', advisoryFlagged: false,
    };
    const recorded: RecordContext = { ...RECORD, lastDose: { injectedHundredths: 200, atMs: NOW - 60 * 60 * 1000 } };
    const pending = run([
      { type: 'loaded', settings: SETTINGS, record: recorded, disclaimerAccepted: true },
      { type: 'input_changed', field: 'bloodSugar', value: '330' },
      { type: 'input_changed', field: 'carbs', value: '50' },
      { type: 'calculate', nowMs: NOW },
      { type: 'begin_logging' },
      { type: 'commit_log', payload },
      { type: 'log_save_failed' },
      { type: 'calculate', nowMs: NOW },
    ]);
    // The RECORDED dose is an hour old; the pending one is three. Newer wins.
    expect(pending.snapshot?.lastDose).toEqual({ injectedHundredths: 200, atMs: NOW - 60 * 60 * 1000 });
  });
});

/** The last seams the gate found once `src/state` joined it. */
describe('§13.4 — the remaining reducer branches', () => {
  it('§10.6 — accepting the disclaimer goes to settings, or past them if they exist', () => {
    const after = (settings: Settings | null): AppState['screen'] =>
      reduce(
        reduce(initialState(), { type: 'loaded', settings, record: RECORD, disclaimerAccepted: false }),
        { type: 'disclaimer_accepted' },
      ).screen;
    expect(after(null)).toBe('first_run_settings');
    expect(after(SETTINGS)).toBe('calculator');
  });

  it('§4.5 — a reading error wins the routing even when carbohydrate is wrong too', () => {
    // `some` not `every`: with BOTH fields bad, the reading is the one that
    // decides, because it is the field the user reaches first and the one whose
    // error the carbohydrate screen cannot display.
    const both = run([...typed('605', '999'), { type: 'calculate', nowMs: NOW }]);
    expect(both.outcome?.kind).toBe('invalid_input');
    expect(both.step).toBe('reading');
    // And with only the carbohydrate wrong, it routes there instead.
    expect(run([...typed('180', '999'), { type: 'calculate', nowMs: NOW }]).step).toBe('carbs');
  });

  it('§7.2 — a suppressed meal-only dose is loggable, like any other', () => {
    const record: RecordContext = {
      ...RECORD,
      lastDose: { injectedHundredths: 600, atMs: NOW - 2 * HOUR },
    };
    const state = run([
      { type: 'loaded', settings: SETTINGS, record, disclaimerAccepted: true },
      { type: 'input_changed', field: 'bloodSugar', value: '300' },
      { type: 'input_changed', field: 'carbs', value: '50' },
      { type: 'calculate', nowMs: NOW },
    ]);
    expect(state.outcome?.kind).toBe('meal_only_suppressed');
    expect(reduce(state, { type: 'begin_logging' }).step).toBe('amount');
  });

  it('§10.7 — a new calculation clears the fields, not just the result', () => {
    const after = reduce(
      run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]),
      { type: 'new_calculation' },
    );
    expect(after.inputs).toEqual({ bloodSugar: '', carbs: '' });
    expect(after.step).toBe('reading');
    expect(after.outcome).toBeNull();
  });

  it('§7.2 — the gate takes the pending dose only while the save is pending', () => {
    const payload: FrozenLogPayload = {
      id: 'd', timestamp: NOW - HOUR, bloodSugar: 330, carbs: 50, units: 1100,
      injectedUnits: 1100, settingsRevision: 1, overrodeStacking: false,
      timingAdvice: 'before', advisoryFlagged: false,
    };
    const older: RecordContext = {
      ...RECORD,
      lastDose: { injectedHundredths: 300, atMs: NOW - 3 * HOUR },
    };
    const upTo = (...extra: Action[]): AppState =>
      run([
        { type: 'loaded', settings: SETTINGS, record: older, disclaimerAccepted: true },
        { type: 'input_changed', field: 'bloodSugar', value: '330' },
        { type: 'input_changed', field: 'carbs', value: '50' },
        { type: 'calculate', nowMs: NOW },
        { type: 'begin_logging' },
        { type: 'commit_log', payload },
        ...extra,
      ]);

    // Pending, and the pending dose is the newer of the two.
    const pending = run([{ type: 'calculate', nowMs: NOW }], upTo({ type: 'log_save_failed' }));
    expect(pending.snapshot?.lastDose).toEqual({ injectedHundredths: 1100, atMs: NOW - HOUR });

    // Saved: the record speaks, even though `committing` still stands.
    const saved = run([{ type: 'calculate', nowMs: NOW }], upTo({ type: 'log_saved', record: older }));
    expect(saved.committing).not.toBeNull();
    expect(saved.snapshot?.lastDose).toEqual({ injectedHundredths: 300, atMs: NOW - 3 * HOUR });

    // Pending with NOTHING frozen falls back to the record rather than throwing.
    const noPayload = { ...upTo({ type: 'log_save_failed' }), committing: null };
    expect(run([{ type: 'calculate', nowMs: NOW }], noPayload).snapshot?.lastDose)
      .toEqual({ injectedHundredths: 300, atMs: NOW - 3 * HOUR });

    // And a RECORDED dose newer than the pending one wins: the question is
    // "what is the most recent insulin", not "what did this session do".
    const newerRecord: RecordContext = {
      ...RECORD,
      lastDose: { injectedHundredths: 900, atMs: NOW - MINUTE },
    };
    const state = { ...upTo({ type: 'log_save_failed' }), record: newerRecord };
    expect(run([{ type: 'calculate', nowMs: NOW }], state).snapshot?.lastDose)
      .toEqual({ injectedHundredths: 900, atMs: NOW - MINUTE });
  });

  it('and at the SAME instant the frozen payload wins, being first-hand', () => {
    // The `>` boundary, which decides nothing except when the two timestamps are
    // identical — and then the two are the same event by any sane reading: this
    // session's own injection, seen once as a frozen payload and once as a row
    // that reached storage another way. The frozen one is the first-hand record,
    // so a strict `>` (recorded must be STRICTLY newer to displace it) is the
    // rule. `>=` would hand the gate the storage copy instead.
    const payload: FrozenLogPayload = {
      id: 'd', timestamp: NOW - HOUR, bloodSugar: 330, carbs: 50, units: 1100,
      injectedUnits: 1100, settingsRevision: 1, overrodeStacking: false,
      timingAdvice: 'before', advisoryFlagged: false,
    };
    const sameInstant: RecordContext = {
      ...RECORD,
      lastDose: { injectedHundredths: 300, atMs: NOW - HOUR },
    };
    const state = run([
      { type: 'loaded', settings: SETTINGS, record: sameInstant, disclaimerAccepted: true },
      { type: 'input_changed', field: 'bloodSugar', value: '330' },
      { type: 'input_changed', field: 'carbs', value: '50' },
      { type: 'calculate', nowMs: NOW },
      { type: 'begin_logging' },
      { type: 'commit_log', payload },
      { type: 'log_save_failed' },
      { type: 'calculate', nowMs: NOW },
    ]);
    expect(state.snapshot?.lastDose).toEqual({ injectedHundredths: 1100, atMs: NOW - HOUR });
  });
});
