/**
 * The shell: it opens the record, holds the state, performs the effects, and
 * renders. It makes no dosing decision of its own — every number on screen came
 * from the core, and every transition came from the reducer.
 *
 * §11.2's warning is what this file is arranged against: "the danger is not a
 * wrong dose but the repair an implementer reaches for — computing provenance in
 * the shell at render time, which puts safety-display logic outside the tested
 * core." Nothing here derives a band, a baseline or a provenance. It reads them.
 */

import {
  ADVISORY_MIN_ELIGIBLE,
  DELETE_CONFIRM_WINDOW_HOURS,
  JSON_INDENT,
  MS_PER_MINUTE,
  RANGE,
} from '../config.js';
import { deriveBandEFullCardShownToday, deriveHistory, hasRowInsideWindow } from '../core/history.js';
import { evaluateCarbAdvisory } from '../core/baseline.js';
import { divergesFromCalculated } from '../core/divergence.js';
import { hundredthsFromGrammarText } from '../core/decimal.js';
import { parseField, applyKeystroke } from '../core/parse.js';
import { modeNeedsAcknowledgement } from '../core/round.js';
import type { Injection, Reading, RoundingMode, Settings } from '../core/types.js';
import { buildEnvelope, parseEnvelope } from '../storage/envelope.js';
import { importEnvelope } from '../storage/importer.js';
import { deleteDatabase, openDatabase, readRecoveryBlock } from '../storage/open.js';
import type { RecoveryBlock } from '../storage/schema.js';
import { buildReadableExport } from '../storage/readable.js';
import {
  ackKeys,
  acknowledge,
  appendInjection,
  appendReading,
  clearTheRecord,
  commitSettings,
  deleteLogRow,
  deleteReading,
  readAll,
  recordJsonExport,
  writeDosingHistory,
} from '../storage/repo.js';
import type { StoredState } from '../storage/repo.js';
import { stateToken, watchForChanges } from '../storage/sync.js';
import { initialState, reduce } from '../state/machine.js';
import type { Action, AppState, FrozenLogPayload, RecordContext } from '../state/machine.js';
import { localDayKey } from '../core/calendar.js';
import { newId } from '../core/ids.js';
import { COPY } from './copy.js';
import { button, captureFocus, replaceChildren, restoreFocus, h } from './dom.js';
import { calculatorScreen } from './screens/calculator.js';
import { draftFrom, settingsScreen } from './screens/settings.js';
import type { SettingsDraft } from './screens/settings.js';
import {
  clearScreen,
  disclaimerScreen,
  exportScreen,
  failClosedScreen,
  historyScreen,
  howItWorksScreen,
  settingsAsTextScreen,
} from './screens/misc.js';

/**
 * Transient interface state, deliberately OUTSIDE the reducer.
 *
 * §11.2 asks for one explicit application state, and the thing it is protecting
 * is the dose: "one event updating the dose while another leaves the breakdown,
 * the warning or a saved setting stale". None of the fields below can change a
 * dose, a band or a gate — they decide which confirmation is open and whether a
 * disclosure is expanded. Putting them through the tested reducer would mean
 * every dose test carried a dialog flag.
 */
interface ViewState {
  draft: SettingsDraft;
  disclaimerChecked: boolean;
  moreExpanded: boolean;
  pendingDelete: string | null;
  clearConfirming: 'record' | 'startOver' | null;
  failClosedConfirming: boolean;
  failClosedBlocked: boolean;
  readingNote: Reading['note'] | undefined;
  /** §6.7 — the answer as typed. Never written until he taps save. */
  dosingDraft: string;
  decliningDosing: boolean;
  screenBefore: AppState['screen'];
}

export interface Host {
  readonly root: HTMLElement;
  readonly now: () => number;
  readonly timeZone: string;
  readonly indexedDB?: IDBFactory | undefined;
  readonly appVersion: string;
  readonly buildId: string;
  readonly download: (name: string, type: string, contents: string) => void;
  readonly pickFile: () => Promise<string | null>;
  /**
   * Reading and writing the page's scroll offset. On the Host rather than
   * reached for directly, for the same reason `now` is: `src/ui` is driven by a
   * jsdom harness in `test/integration.test.ts`, and a module that calls
   * `window` on its own is a module that harness cannot steer.
   */
  readonly scrollY: () => number;
  readonly scrollTo: (y: number) => void;
  /**
   * The device's own back gesture. On Android that is the system button or the
   * edge swipe, and in an installed PWA it otherwise CLOSES THE APP — so a
   * half-entered reading is lost to a gesture people use reflexively.
   *
   * On the Host rather than reached for directly, for the same reason `now` is:
   * `src/ui` is driven by a jsdom harness, and a module that reaches for
   * `window.history` on its own cannot be steered by that harness.
   *
   * §11.5's "Routing: None" is not violated. Nothing is written to the URL,
   * there are no deep links and `start_url` is untouched — what §11.5 rules out
   * is URL STATE, and this is a same-document stack entry whose only job is to
   * give the gesture something to consume.
   */
  /**
   * §7.2 — a single buzz when the row is COMMITTED, chosen over a sound.
   *
   * Momin asked about a sound first. Vibration is the better fit for the same
   * intent: it works with the phone on silent, it does not need a user gesture
   * to be permitted, and it cannot be missed in a noisy room. A sound would be
   * a confirmation that SOMETIMES does not happen, which is worse than none.
   *
   * It is never the only confirmation. The screen says "Logged 2 units at
   * 7:21 AM" regardless — a buzz is not readable, and this is a dosing record.
   * And it fires only AFTER the write resolves, because a buzz before the
   * transaction commits would be a lie about a dosing record.
   */
  readonly buzz: () => void;
  readonly setCanGoBack: (can: boolean) => void;
  readonly onHardwareBack: (handler: () => void) => void;
  /**
   * §12 — called the first time the calculator is reached, which is the first
   * moment an install offer is not an interruption. Version 1 gated ONBOARDING
   * on installing; §12 downgraded that to a light touch, and a prompt over the
   * disclaimer is the same mistake with a smaller footprint.
   */
  readonly onSettled?: (() => void) | undefined;
}

export async function start(host: Host): Promise<void> {
  let state = initialState();
  let db: IDBDatabase | null = null;
  let stored: StoredState | null = null;
  let recovery: RecoveryBlock | null = null;

  const view: ViewState = {
    draft: draftFrom(null),
    disclaimerChecked: false,
    moreExpanded: false,
    pendingDelete: null,
    clearConfirming: null,
    failClosedConfirming: false,
    failClosedBlocked: false,
    readingNote: undefined,
    dosingDraft: '',
    decliningDosing: false,
    screenBefore: 'calculator',
  };

  const dispatch = (action: Action): void => {
    state = reduce(state, action);
    render();
  };

  /** §11.2 — the snapshot fields the core needs, derived once, from the record. */
  const contextFrom = (source: StoredState): RecordContext => {
    const derived = deriveHistory(source.log, {
      nowMs: host.now(),
      installedAtMs: source.installedAtMs,
      lastImportAtMs: source.lastImportAtMs,
      lastLocalWriteAtMs: source.lastLocalWriteAtMs,
    });
    return {
      logRevision: source.logRevision,
      carbBaseline: derived.carbBaseline,
      eligibleEntryCount: derived.eligibleEntryCount,
      historyProvenance: derived.historyProvenance,
      lastDose: derived.lastDose,
      bandEFullCardShownToday: deriveBandEFullCardShownToday(
        source.log,
        source.readings,
        host.now(),
        host.timeZone,
      ),
      excludedTimeRecords: derived.excludedTimeRecords,
    };
  };

  const refresh = async (): Promise<void> => {
    if (db === null) return;
    stored = await readAll(db, host.now());
    dispatch({ type: 'record_changed', record: contextFrom(stored) });
  };

  // §11.3 layer 2 — polls a token while a result is displayed or a confirmation
  // is open. Layer 4 posts on write; a dropped message costs responsiveness.
  const watch = watchForChanges({
    readToken: async () => {
      if (db === null) return 'closed';
      const current = await readAll(db, host.now());
      return stateToken(current.logRevision, current.settings);
    },
    onChanged: () => {
      void refresh();
    },
  });

  // ── effects ──────────────────────────────────────────────────────────────

  const saveSettings = async (): Promise<void> => {
    if (db === null) return;
    const draft = view.draft;
    const numeric = (field: keyof typeof RANGE, text: string): number => {
      const parsed = parseField(text, field);
      return parsed.state === 'valid' ? parsed.value : 0;
    };
    const acknowledged: string[] = [];
    if (modeNeedsAcknowledgement(draft.mode)) acknowledged.push(ackKeys.forMode(draft.mode));
    for (const field of ['target', 'isf', 'icr', 'threshold', 'basalUnits'] as const) {
      acknowledged.push(ackKeys.forSetting(field, numeric(field, draft[field])));
    }
    await commitSettings(db, {
      target: numeric('target', draft.target),
      isf: numeric('isf', draft.isf),
      icr: numeric('icr', draft.icr),
      mode: draft.mode,
      threshold: numeric('threshold', draft.threshold),
      personName: draft.personName.trim(),
      basalName: draft.basalName,
      basalUnits: numeric('basalUnits', draft.basalUnits),
      basalTiming: draft.basalTiming,
      acknowledged,
      nowMs: host.now(),
    });
    stored = await readAll(db, host.now());
    watch.announce();
    if (stored.settings !== null) {
      dispatch({ type: 'settings_committed', settings: stored.settings });
    }
  };

  /**
   * §7.2 — the SECOND tap. It freezes the entire payload, stamps the clock, and
   * writes, in that order. §7.1: "frozen at step 1, not read at step 3 — a retry
   * that re-reads a mutable draft is exactly the hole 'captured at the tap' is
   * meant to close."
   */
  const commitLog = async (): Promise<void> => {
    if (db === null || state.settings === null || state.snapshot === null) return;
    const outcome = state.outcome;
    if (outcome?.kind !== 'dose' && outcome?.kind !== 'meal_only_suppressed') return;

    const injected = Number(state.injectedDraft);
    if (!Number.isFinite(injected) || injected <= 0) return;

    const reading = parseField(state.inputs.bloodSugar, 'bloodSugar');
    const carbs = parseField(state.inputs.carbs, 'carbs');
    const advisory = evaluateCarbAdvisory(
      carbs.state === 'valid' ? carbs.value : 0,
      state.record.carbBaseline,
      state.record.eligibleEntryCount,
    );

    // §7.2 — the timestamp and §8.1's clock are BOTH taken here, so the record's
    // time and the timing advice cannot disagree.
    const timestamp = host.now();
    const payload: FrozenLogPayload = {
      id: newId(),
      timestamp,
      bloodSugar: reading.state === 'valid' ? reading.value : null,
      carbs: carbs.state === 'valid' ? carbs.value : 0,
      units: outcome.hundredths,
      injectedUnits: injected,
      // §11.3's ROW STAMP — from the committed SNAPSHOT, never a fresh read of
      // the store. Cross-tab those diverge inside the poll window.
      settingsRevision: state.snapshot.settings.revision,
      overrodeStacking: state.snapshot.stackingOverride,
      timingAdvice: outcome.timingAdvice,
      // §6.5 — a flagged row is excluded from the baseline, so the advisory
      // cannot poison the statistic it reads.
      advisoryFlagged: advisory.advisory !== null,
    };

    dispatch({ type: 'commit_log', payload });

    const row: Injection = { ...payload };
    try {
      await appendInjection(db, row, timestamp);
      stored = await readAll(db, host.now());
      watch.announce();
      dispatch({ type: 'log_saved', record: contextFrom(stored) });
      // AFTER the write resolved, and only here. §7.2's commit is "one
      // transaction"; a buzz before it lands would be a lie about a dosing
      // record, and one on the failure path would be a lie about a worse thing.
      host.buzz();
    } catch {
      // §7.2 — the app enters a PENDING-SAVE state. The in-session gate still
      // knows about the dose, and the timer started regardless.
      dispatch({ type: 'log_save_failed' });
    }
  };

  const saveReading = async (): Promise<void> => {
    if (db === null) return;
    const parsed = parseField(state.inputs.bloodSugar, 'bloodSugar');
    if (parsed.state !== 'valid') return;
    const reading: Reading =
      view.readingNote === undefined
        ? { id: newId(), timestamp: host.now(), bloodSugar: parsed.value }
        : {
            id: newId(),
            timestamp: host.now(),
            bloodSugar: parsed.value,
            note: view.readingNote,
          };
    await appendReading(db, reading, host.now());
    watch.announce();
    await refresh();
    dispatch({ type: 'go', screen: 'history' });
  };

  const exportJson = async (): Promise<void> => {
    if (db === null || stored === null) return;
    const envelope = buildEnvelope({
      settings: stored.settings,
      settingsHistory: stored.settingsHistory,
      log: stored.log,
      readings: stored.readings,
      dosingHistory: stored.dosingHistory,
    });
    host.download(exportFilename('.json'), 'application/json', JSON.stringify(envelope, null, JSON_INDENT));
    // §7.7.1 — set on the DOWNLOAD ROUTE ONLY. A share that resolves is not
    // evidence of a stored copy.
    await recordJsonExport(db, host.now());
    await refresh();
  };

  const exportReadable = (): void => {
    if (stored === null) return;
    const html = buildReadableExport({
      settings: stored.settings,
      settingsHistory: stored.settingsHistory,
      log: stored.log,
      readings: stored.readings,
      dosingNote:
        stored.dosingHistory.state === 'answered' && stored.dosingHistory.answeredAtMs !== null
          ? { text: stored.dosingHistory.text, answeredAtMs: stored.dosingHistory.answeredAtMs }
          : null,
      generatedAtMs: host.now(),
      timeZone: host.timeZone,
      appVersion: host.appVersion,
    });
    // Deliberately does NOT touch the backup counter (§7.7.1).
    host.download(exportFilename('.html'), 'text/html', html);
  };

  const importRecord = async (): Promise<void> => {
    if (db === null) return;
    const text = await host.pickFile();
    if (text === null) return;
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return;
    }
    const parsed = parseEnvelope(raw);
    // §11.3 — validate before commit, and PRESERVE EXISTING DATA ON FAILURE.
    if (!parsed.ok) return;
    await importEnvelope(db, parsed.envelope, host.now());
    watch.announce();
    await refresh();
  };

  const startOver = async (): Promise<void> => {
    // §7.9 — the app must close its OWN connection first, on both paths, or it
    // blocks on itself.
    db?.close();
    db = null;
    const outcome = await deleteDatabase({
      indexedDB: host.indexedDB,
      onBlocked: () => {
        view.failClosedBlocked = true;
        render();
      },
    });
    if (outcome.kind !== 'deleted') {
      view.failClosedBlocked = outcome.kind === 'blocked';
      render();
      return;
    }
    state = initialState();
    view.draft = draftFrom(null);
    view.disclaimerChecked = false;
    view.clearConfirming = null;
    view.failClosedConfirming = false;
    await boot();
  };

  // ── render ───────────────────────────────────────────────────────────────

  const advisoryStatus = (): string => {
    const status = evaluateCarbAdvisory(1, state.record.carbBaseline, state.record.eligibleEntryCount);
    if (!status.enabled) {
      return COPY.advisory.notEnoughHistory(state.record.eligibleEntryCount, ADVISORY_MIN_ELIGIBLE);
    }
    if (!status.highTriggerAvailable) return COPY.advisory.highDisabled;
    return COPY.advisory.active(String(state.record.carbBaseline));
  };

  function screenFor(): HTMLElement {
    switch (state.screen) {
      case 'loading':
        return h('div', { class: 'screen' }, h('p', {}, 'Opening your record…'));

      case 'fail_closed':
        return failClosedScreen({
          recovery,
          blocked: view.failClosedBlocked,
          // §7.9 v23 — the recovery connection may read the frozen block AND
          // NOTHING ELSE, so the stacking consequence cannot be evaluated here.
          canReadLog: false,
          confirming: view.failClosedConfirming,
          onAsk: (asking) => {
            view.failClosedConfirming = asking;
            render();
          },
          onStartOver: () => { void startOver(); },
        });

      case 'first_run_disclaimer':
        return disclaimerScreen(
          () => {
            if (db !== null) void acknowledge(db, ackKeys.disclaimer, host.now());
            dispatch({ type: 'disclaimer_accepted' });
          },
          view.disclaimerChecked,
          () => {
            view.disclaimerChecked = !view.disclaimerChecked;
            render();
          },
        );

      case 'first_run_settings':
      case 'settings':
        return settingsScreen(view.draft, state.settings, {
          firstRun: state.screen === 'first_run_settings',
          ceilAcknowledged: stored?.acks.has(ackKeys.forMode(view.draft.mode)) ?? false,
          advisoryStatus: advisoryStatus(),
          onChange: (field, value) => {
            view.draft = { ...view.draft, [field]: field === 'mode' ? (value as RoundingMode) : value };
            render();
          },
          onSave: () => { void saveSettings(); },
          onAcknowledgeCeil: () => {
            if (db !== null) void acknowledge(db, ackKeys.forMode(view.draft.mode), host.now()).then(refresh);
          },
          onOpenClear: () => { dispatch({ type: 'go', screen: 'export' }); view.clearConfirming = null; showClear = true; render(); },
          onOpenExport: () => { showClear = false; dispatch({ type: 'go', screen: 'export' }); },
          onOpenHowItWorks: () => { dispatch({ type: 'go', screen: 'how_it_works' }); },
          onOpenSettingsAsText: () => { showAsText = true; dispatch({ type: 'go', screen: 'how_it_works' }); },
        });

      case 'history':
        return historyScreen(stored?.log ?? [], stored?.readings ?? [], {
          timeZone: host.timeZone,
          nowMs: host.now(),
          pendingDelete: view.pendingDelete,
          onAskDelete: (id) => {
            view.pendingDelete = id;
            render();
          },
          onDelete: (id) => {
            view.pendingDelete = null;
            if (db !== null) {
              void deleteLogRow(db, id, host.now()).then(() => {
                watch.announce();
                return refresh();
              });
            }
          },
          onDeleteReading: (id) => {
            if (db !== null) {
              void deleteReading(db, id).then(() => {
                watch.announce();
                return refresh();
              });
            }
          },
          onOpenExport: () => { showClear = false; dispatch({ type: 'go', screen: 'export' }); },
        });

      case 'export':
        if (
          !showClear &&
          view.dosingDraft === '' &&
          stored?.dosingHistory.state === 'answered'
        ) {
          view.dosingDraft = stored.dosingHistory.text;
        }
        return showClear
          ? clearScreen(stored?.log ?? [], stored?.readings ?? [], {
              timeZone: host.timeZone,
              nowMs: host.now(),
              confirming: view.clearConfirming,
              onAsk: (which) => {
                view.clearConfirming = which;
                render();
              },
              onExportFirst: () => {
                showClear = false;
                view.clearConfirming = null;
                render();
              },
              onClearRecord: () => {
                if (db !== null) {
                  void clearTheRecord(db).then(() => {
                    watch.announce();
                    view.clearConfirming = null;
                    return refresh();
                  });
                }
              },
              onStartOver: () => { void startOver(); },
            })
          : exportScreen({
              lastJsonExportAtMs: stored?.lastJsonExportAtMs ?? null,
              hasRecord: (stored?.log.length ?? 0) + (stored?.readings.length ?? 0) > 0,
              nowMs: host.now(),
              timeZone: host.timeZone,
              onMove: () => { void exportJson(); },
              onSave: () => { exportReadable(); },
              onImport: () => { void importRecord(); },
                  dosingState: stored?.dosingHistory.state ?? 'unanswered',
              dosingText: stored?.dosingHistory.text ?? '',
              dosingDraft: view.dosingDraft,
              dosingAnsweredAtMs: stored?.dosingHistory.answeredAtMs ?? null,
              decliningDosing: view.decliningDosing,
              onAskDecline: (asking) => {
                view.decliningDosing = asking;
                render();
              },
              onDosingDraft: (value) => {
                view.dosingDraft = value;
                render();
              },
              onDosingSave: () => {
                // §6.7 v19 — **an empty answer is a SKIP, never an `answered`
                // with empty text.** Otherwise the sentinel state silently
                // becomes the absorbing one and the record is lost while
                // reading as captured.
                const text = view.dosingDraft.trim();
                if (text === '' || db === null) {
                  view.dosingDraft = '';
                  render();
                  return;
                }
                void writeDosingHistory(db, {
                  state: 'answered',
                  text,
                  // Correcting re-stamps the date, "because the note is a
                  // self-report and its date is the date the standing text was
                  // given".
                  answeredAtMs: host.now(),
                }).then(() => {
                  view.dosingDraft = '';
                  return refresh();
                });
              },
              onDosingSkip: () => {
                // Leaves the state `unanswered`, so it is re-offered next time.
                view.dosingDraft = '';
                render();
              },
              onDosingDecline: () => {
                if (db === null) return;
                view.decliningDosing = false;
                void writeDosingHistory(db, { state: 'declined', text: '', answeredAtMs: null }).then(
                  refresh,
                );
              },
            });

      case 'how_it_works':
        return showAsText && state.settings !== null
          ? settingsAsTextScreen(state.settings)
          : howItWorksScreen(advisoryStatus());

      case 'calculator':
        return calculatorScreen(state, {
          nowMs: host.now(),
          timeZone: host.timeZone,
          moreExpanded: view.moreExpanded,
          onDigit: (field, digit) => {
            const current = state.inputs[field];
            // §4.2's grammar, per field, derived from that field's own range —
            // and the leading-zero rule, so `0` then `8` is `8` and not `08`.
            const next = applyKeystroke(current, digit, field, field === 'carbs');
            if (next === null) return;
            dispatch({ type: 'input_changed', field, value: next });
          },
          onBackspace: (field) => {
            dispatch({ type: 'input_changed', field, value: state.inputs[field].slice(0, -1) });
          },
          onNext: () => { dispatch({ type: 'wizard_next' }); },
          onBack: () => { dispatch({ type: 'wizard_back' }); },
          onNewCalculation: () => { dispatch({ type: 'new_calculation' }); },
          onCalculate: () => { dispatch({ type: 'calculate', nowMs: host.now() }); },
          onAcknowledgeBlank: () => {
            dispatch({ type: 'blank_reading_acknowledged' });
            dispatch({ type: 'calculate', nowMs: host.now() });
          },
          onConfirmLargeDose: () => {
            dispatch({ type: 'large_dose_confirmed' });
            dispatch({ type: 'calculate', nowMs: host.now() });
          },
          onBeginLogging: () => { dispatch({ type: 'begin_logging' }); },
          onAdjustAmount: (delta) => {
            const next = Math.max(0, Number(state.injectedDraft) + delta);
            dispatch({ type: 'injected_draft_changed', value: String(next) });
          },
          onCommitLog: () => { void commitLog(); },
          onOpenOverride: () => { view.moreExpanded = false; state = { ...state, step: 'stacking_override' }; render(); },
          onTakeOverride: () => {
            dispatch({ type: 'stacking_override_taken' });
            dispatch({ type: 'calculate', nowMs: host.now() });
          },
          onOfferReading: () => { dispatch({ type: 'offer_reading' }); },
          onSaveReading: () => { void saveReading(); },
          onToggleMore: () => {
            view.moreExpanded = !view.moreExpanded;
            render();
          },
          onOpenHistory: () => { dispatch({ type: 'go', screen: 'history' }); },
          onOpenSettings: () => {
            view.draft = draftFrom(state.settings);
            dispatch({ type: 'go', screen: 'settings' });
          },
          onStartOver: () => { void startOver(); },
        });
    }
  }

  // The view rendered last, so `render` can tell a redraw from a navigation.
  let lastViewKey = '';
  let showClear = false;
  let showAsText = false;

  let settled = false;


  /**
   * §10.7 as Momin ruled it — ALL navigation lives at the foot of the screen.
   *
   * Rendered by the shell rather than by each screen, and that is the point:
   * fourteen screens each drew their own `Back` bar at the TOP, which is both
   * the hardest place on a one-handed phone to reach and fourteen places for
   * the pattern to drift. One function means one place to change and no screen
   * can forget.
   *
   * Returning `null` is what tells the shell there is nowhere to go back to,
   * and the hardware-back wiring reads the SAME function — so the Android
   * gesture and the on-screen control can never disagree about whether back is
   * possible.
   */

  /**
   * §7.7.1 — the export filenames.
   *
   * Both were fixed strings, so a folder holding three months of exports held
   * three files a doctor could not tell apart, and re-downloading produced
   * "insulin-record (2).html". The name and the date make each one identifiable
   * without opening it.
   *
   * The name is reduced to ASCII letters, digits and single hyphens before it
   * goes anywhere near a filename. It is a string he typed, or one that arrived
   * in an imported file, and a filename is the wrong place to find out that it
   * contained a slash.
   */
  function exportFilename(extension: string): string {
    const name = (stored?.settings?.personName ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    // `localDayKey` already yields YYYY-MM-DD in the device's zone (§10.4).
    const day = localDayKey(host.now(), host.timeZone);
    return ['mealunits', name, day].filter((part) => part !== '').join('-') + extension;
  }

  function backAction(): (() => void) | null {
    switch (state.screen) {
      case 'calculator':
        // `wizard_back` is a no-op on these two, so offering it would be a
        // control that does nothing (§18.14's switch is the source of truth).
        return state.step === 'reading' || state.step === 'logged'
          ? null
          : (): void => { dispatch({ type: 'wizard_back' }); };
      case 'settings':
        return (): void => { dispatch({ type: 'go', screen: 'calculator' }); };
      case 'history':
        return (): void => { dispatch({ type: 'go', screen: 'calculator' }); };
      case 'export':
        return showClear
          ? (): void => { showClear = false; dispatch({ type: 'go', screen: 'settings' }); }
          : (): void => { dispatch({ type: 'go', screen: 'calculator' }); };
      case 'how_it_works':
        return showAsText
          ? (): void => { showAsText = false; dispatch({ type: 'go', screen: 'settings' }); }
          : (): void => { dispatch({ type: 'go', screen: 'calculator' }); };
      // §10.6 and §11.3 — the first run and the fail-closed screen are
      // deliberately inescapable. No back, and no hardware back either.
      case 'loading':
      case 'fail_closed':
      case 'first_run_disclaimer':
      case 'first_run_settings':
        return null;
    }
  }

  function footNav(): HTMLElement | null {
    const goBack = backAction();
    const items: HTMLElement[] = [];
    if (goBack !== null) items.push(button(COPY.back, goBack, { class: 'link' }));
    if (state.screen === 'calculator' && state.step === 'reading') {
      items.push(button('Settings', () => { dispatch({ type: 'go', screen: 'settings' }); }, { class: 'link' }));
      items.push(button('History', () => { dispatch({ type: 'go', screen: 'history' }); }, { class: 'link' }));
    }
    if (state.screen === 'history') {
      items.push(button('Save a copy', () => { showClear = false; dispatch({ type: 'go', screen: 'export' }); }, { class: 'link mark' }));
    }
    if (items.length === 0) return null;
    return h('nav', { class: 'foot-nav', 'aria-label': 'Navigation' }, ...items);
  }

  function render(): void {
    if (!settled && state.screen === 'calculator') {
      settled = true;
      host.onSettled?.();
    }

    // §11.3 layer 2 — watch while a result is displayed OR a confirmation is
    // open, and stop otherwise. §13.3 required "result or confirmation open" and
    // v6's wording said only "while a result is displayed".
    const watching =
      state.outcome !== null &&
      ['result', 'confirm_inputs', 'stacking_override', 'amount'].includes(state.step);
    if (watching && stored !== null) {
      watch.start(stateToken(stored.logRevision, stored.settings));
    } else {
      watch.stop();
    }

    // The page mood, from the OUTCOME rather than from the screen name — the
    // same source the copy is derived from, so the colour cannot disagree with
    // the words. §3.3 refuses to print an insulin number on a block; this makes
    // that refusal visible before anything is read.
    // ONLY a §3 block repaints the page. Band E was wired here first and it was
    // wrong: band E is an ADVISORY beside a valid dose ("above 250, check
    // ketones"), it already carries its own amber flag, and washing the whole
    // screen made a correct result read as a failure. A page-level colour change
    // has to mean "there is no dose here", or it means nothing.
    //
    // Keyed on the STEP, not on the outcome alone. §18.14 is explicit that going
    // back never discards a committed input, so `state.outcome` survives the
    // back navigation by design — and reading it here left the carbohydrate
    // screen washed red after backing out of a low-reading block, which said
    // "do not inject" about a screen that was asking for a meal. The mood has to
    // describe THE SCREEN ON DISPLAY, and the step is what names that.
    const blocking = state.step === 'blocked' || state.step === 'record_reading';
    host.root.className =
      blocking && state.outcome?.kind === 'blocked_low' ? 'mood-halt' : '';

    // The ONLY call site for the focus patch. `replaceChildren` destroys every
    // node, so focus, caret and scroll are captured here and put back below.
    // See `captureFocus` for why this is a patch and not a fix, and
    // `docs/BACKLOG.md` T3 for what replaces it.
    // Keep the history stack in step with whether the app HAS a back path, read
    // from the same `backAction` the on-screen control uses — so the gesture and
    // the button can never disagree.
    host.setCanGoBack(backAction() !== null);

    const memory = captureFocus(host.root, host.scrollY());

    /**
     * Compared against the view rendered LAST TIME, held across calls.
     *
     * This read `${state.screen}/${state.step}` twice inside one render — once
     * before `replaceChildren` and once after — and claimed the second read
     * would have "moved on". It cannot: `dispatch` updates the state and THEN
     * calls render, so both reads see the same already-updated value and
     * `sameView` was ALWAYS TRUE. The scroll was therefore restored across
     * every navigation, which is why opening a screen from part-way down
     * settings dropped the reader into the middle of a page they had not seen.
     *
     * The comparison has to span renders, so the previous key has to outlive
     * one — a note explaining why a wrong comparison was right is worth less
     * than a variable in the right scope.
     */
    const viewKey = `${state.screen}/${state.step}`;
    const sameView = viewKey === lastViewKey;
    lastViewKey = viewKey;

    replaceChildren(
      host.root,
      screenFor(),
      footNav(),
      // §10.8 — show the running build version. "It is the only way to diagnose
      // a report." Deliberately small and quiet: it is for the one moment
      // someone is diagnosing a report, not for every moment of every day.
      h('div', { class: 'foot' }, COPY.build(host.appVersion, host.buildId)),
    );

    restoreFocus(host.root, memory, sameView, host.scrollTo);
  }

  // ── boot ─────────────────────────────────────────────────────────────────

  async function boot(): Promise<void> {
    const outcome = await openDatabase({
      indexedDB: host.indexedDB,
      nowMs: host.now(),
      onVersionChange: (newVersion) => {
        // §7.9 v23 — `versionchange` with `newVersion === null` is a DELETE. The
        // handler must invalidate the displayed result and any pending
        // confirmation, "since a result left rendered after the record beneath
        // it was deleted is §4.3's stale-output defect arriving by a new route".
        db = null;
        if (newVersion === null) {
          state = initialState();
          render();
        }
      },
    });

    if (outcome.kind === 'open') {
      db = outcome.db;
      stored = await readAll(db, host.now());
      view.draft = draftFrom(stored.settings);
      dispatch({
        type: 'loaded',
        settings: stored.settings,
        record: contextFrom(stored),
        disclaimerAccepted: stored.acks.has(ackKeys.disclaimer),
      });
      return;
    }

    // §11.3 — the fail-closed screen renders his settings from the frozen
    // recovery block BEFORE offering the escape, read through a separate
    // versionless open that is closed again before the delete.
    recovery = await readRecoveryBlock({ indexedDB: host.indexedDB });
    dispatch({ type: 'load_failed_closed' });
  }

  // §8.2 — the expiry runs on a timer, on resume, and on visibility change.
  const tick = (): void => { dispatch({ type: 'tick', nowMs: host.now() }); };
  globalThis.setInterval(tick, MS_PER_MINUTE);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tick();
    });
  }

  // The device's back gesture runs the SAME action as the on-screen control. If
  // there is nowhere to go back to, nothing is registered and the gesture does
  // what it always did — which on the first screen is leave the app, and that
  // is correct.
  host.onHardwareBack(() => {
    const goBack = backAction();
    if (goBack !== null) goBack();
  });

  await boot();
}

/** §7.1 — exported for the amount screen's confirmation, and for tests. */
export function amountNeedsConfirming(
  calculatedHundredths: number,
  injectedText: string,
): boolean {
  const parsed = parseField(injectedText, 'injected');
  if (parsed.state !== 'valid') return true;
  const [lo, hi] = RANGE.injected.hard;
  if (parsed.value < lo || parsed.value > hi) return true;
  const injected = hundredthsFromGrammarText(parsed.text);
  return divergesFromCalculated(calculatedHundredths, injected);
}

/** §7.9 — is there a row the clearing confirmation has to mention? */
export function clearNeedsStackingLine(source: StoredState, nowMs: number): boolean {
  return hasRowInsideWindow(source.log, nowMs, DELETE_CONFIRM_WINDOW_HOURS);
}

export type { Settings };
