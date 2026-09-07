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
  const calculated = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);

  it('produces a result to begin with', () => {
    expect(calculated.outcome?.kind).toBe('dose');
    expect(calculated.snapshot).not.toBeNull();
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
    const after = reduce(calculated, action);
    expect(after.outcome).toBeNull();
    expect(after.snapshot).toBeNull();
  });

  it.each(triggers)('and cancels a pending confirmation on %s', (_name, action) => {
    const confirmed = reduce(calculated, { type: 'large_dose_confirmed' });
    expect(confirmed.largeDoseConfirmed).toBe(true);
    expect(reduce(confirmed, action).largeDoseConfirmed).toBe(false);
  });

  it('§7.4.1 — the OVERRIDE is a target of invalidation, not only a trigger', () => {
    // v3 listed `stackingOverride` as an invalidation trigger and never as a
    // target, "so it could survive a change to the very inputs it was granted
    // for".
    const withOverride = reduce(calculated, { type: 'stacking_override_taken' });
    expect(withOverride.stackingOverride).toBe(true);
    const afterEdit = reduce(withOverride, {
      type: 'input_changed',
      field: 'carbs',
      value: '60',
    });
    expect(afterEdit.stackingOverride).toBe(false);
  });

  it('§4.6 — the blank-reading acknowledgement clears too, being per-calculation', () => {
    const acknowledged = reduce(calculated, { type: 'blank_reading_acknowledged' });
    expect(acknowledged.blankReadingAcknowledged).toBe(true);
    const after = reduce(acknowledged, { type: 'input_changed', field: 'carbs', value: '61' });
    expect(after.blankReadingAcknowledged).toBe(false);
  });

  it('but the TYPED VALUES survive — invalidation clears output, not input', () => {
    const after = reduce(calculated, { type: 'record_changed', record: { ...RECORD, logRevision: 9 } });
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
  const withResult = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);

  it('the first tap opens the amount step and WRITES NOTHING', () => {
    // §7.2 v23 — v22's mockups implied the first tap was the commit, which
    // would freeze the payload before `injectedUnits` was known and make the
    // amount screen an EDIT. §7.3 forbids editing a logged row.
    const opened = reduce(withResult, { type: 'begin_logging' });
    expect(opened.step).toBe('amount');
    expect(opened.committing).toBeNull();
    expect(opened.save.kind).toBe('none');
  });

  it('and it pre-fills the amount with the calculated dose, so the common case is one tap', () => {
    const opened = reduce(withResult, { type: 'begin_logging' });
    expect(opened.injectedDraft).toBe('1100');
  });

  it('editing the amount does NOT clear the result', () => {
    // §7.1 — "§4.3 step 1 invalidates on any CALCULATION input change, and the
    // logging draft is explicitly not one."
    const edited = run(
      [{ type: 'begin_logging' }, { type: 'injected_draft_changed', value: '2500' }],
      withResult,
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
      withResult,
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

describe('§7.2 a failed write does not un-inject anything', () => {
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
  const failed = run(
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
    // already happened. A failed disk write does not make it unknown to the
    // running session."
    expect(failed.save).toEqual({ kind: 'pending', attempts: 1 });
    expect(failed.step).toBe('logged');
  });

  it('keeps the frozen payload, so a retry persists THAT and not a re-read draft', () => {
    // v8 froze only the id and timestamp, so a retry could re-read a mutated
    // draft and persist a different amount than the one consumed in step 2.
    const edited = reduce(failed, { type: 'injected_draft_changed', value: '9999' });
    expect(edited.committing?.injectedUnits).toBe(1100);
    expect(reduce(edited, { type: 'log_save_failed' }).save).toEqual({
      kind: 'pending',
      attempts: 2,
    });
  });

  it('and the in-session gate still knows about the dose', async () => {
    const { inSessionLastDose } = await import('../src/state/machine.js');
    expect(inSessionLastDose(failed)).toEqual({ injectedHundredths: 1100, atMs: NOW });
    expect(inSessionLastDose(initialState())).toBeNull();
  });
});

describe('§8.2 results expire', () => {
  const calculated = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);

  it('after fifteen minutes, and not before', () => {
    expect(reduce(calculated, { type: 'tick', nowMs: NOW + 14 * MINUTE }).expired).toBe(false);
    expect(reduce(calculated, { type: 'tick', nowMs: NOW + 15 * MINUTE }).expired).toBe(true);
  });

  it('and a resumed app three hours later is expired, not actionable', () => {
    // Version 1 cleared the dose when INPUTS changed but never when TIME
    // passed, so a resumed app could show "7 units — inject now" computed from
    // a reading three hours old.
    expect(reduce(calculated, { type: 'tick', nowMs: NOW + 3 * HOUR }).expired).toBe(true);
  });

  it('ticking with no result at all changes nothing', () => {
    const fresh = run(READY);
    expect(reduce(fresh, { type: 'tick', nowMs: NOW + HOUR })).toBe(fresh);
  });

  it('and a fresh calculation clears the expiry', () => {
    const stale = reduce(calculated, { type: 'tick', nowMs: NOW + HOUR });
    expect(stale.expired).toBe(true);
    expect(reduce(stale, { type: 'calculate', nowMs: NOW + HOUR }).expired).toBe(false);
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
    const calculated = run([...typed('330', '50'), { type: 'calculate', nowMs: NOW }]);
    const away = reduce(calculated, { type: 'go', screen: 'history' });
    expect(away.screen).toBe('history');
    expect(away.outcome?.kind).toBe('dose');
    expect(reduce(away, { type: 'go', screen: 'calculator' }).outcome?.kind).toBe('dose');
  });
});
