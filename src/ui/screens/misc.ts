/**
 * The screens that are mostly words: first run, the history, the two exports,
 * the clearing controls, how-it-works, settings-as-text and the fail-closed
 * screen.
 *
 * They are together because none of them makes a dosing decision — every number
 * on them was decided elsewhere. Keeping them out of `calculator.ts` is how that
 * stays visible.
 */

import {
  ADVISORY_MIN_ELIGIBLE,
  DELETE_CONFIRM_WINDOW_HOURS,
  HOURS_PER_DAY,
  HUNDREDTHS_SCALE,
  MS_PER_HOUR,
} from '../../config.js';
import { formatClockTime, formatDate } from '../../core/calendar.js';
import { formatHundredths } from '../../core/decimal.js';
import { hasRowInsideWindow } from '../../core/history.js';
import { isInjection } from '../../core/types.js';
import type { LogRow, Reading, Settings } from '../../core/types.js';
import type { RecoveryBlock } from '../../storage/schema.js';
import { COPY, units } from '../copy.js';
import { button, h } from '../dom.js';

const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;

// ── §10.6 item 1 — the blocking disclaimer ─────────────────────────────────

export function disclaimerScreen(onAccept: () => void, accepted: boolean, onToggle: () => void): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h('h1', {}, COPY.firstRun.disclaimerTitle),
    ...COPY.firstRun.disclaimerBody.map((line) => h('p', {}, line)),
    h('h2', {}, COPY.firstRun.disagreementTitle),
    h('p', {}, COPY.firstRun.disagreementBody),
    h(
      'div',
      { class: 'sheet' },
      // §10.6 — a CHECKBOX PLUS SUBMIT, and "not dismissible by tapping past it".
      button(
        accepted ? '☑  I have read this' : '☐  I have read this',
        onToggle,
        { class: 'go quiet', 'aria-pressed': String(accepted) },
      ),
      button(COPY.firstRun.disclaimerAccept, onAccept, { class: 'go', disabled: !accepted }),
    ),
  );
}

// ── §7.7 — the history screen ──────────────────────────────────────────────

export interface HistoryHandlers {
  readonly onDelete: (id: string) => void;
  readonly onDeleteReading: (id: string) => void;
  readonly onOpenExport: () => void;
  readonly timeZone: string;
  readonly nowMs: number;
  readonly pendingDelete: string | null;
  readonly onAskDelete: (id: string | null) => void;
}

/**
 * §7.7 — "date, time, blood sugar, carbohydrates, CALCULATED units, INJECTED
 * units, override marker. Delete per row with §7.3's confirmation. **No editing,
 * no charts, no analysis.**"
 *
 * The two figures are never merged. §7.1's whole reason for `injectedUnits` is
 * that they will differ routinely — the app computes 11 where he currently
 * injects 25 — and "a log that cannot record that is recording the wrong thing".
 */
export function historyScreen(
  log: readonly LogRow[],
  readings: readonly Reading[],
  handlers: HistoryHandlers,
): HTMLElement {
  const doses = log.filter(isInjection).slice().sort((a, b) => b.timestamp - a.timestamp);
  const sortedReadings = readings.slice().sort((a, b) => b.timestamp - a.timestamp);

  const rows = [
    ...doses.map((row) => ({ at: row.timestamp, node: doseRow(row, handlers) })),
    ...sortedReadings.map((row) => ({ at: row.timestamp, node: readingRow(row, handlers) })),
  ]
    .sort((a, b) => b.at - a.at)
    .map((entry) => entry.node);

  return h(
    'div',
    { class: 'screen' },
    // Back and "Save a copy" both moved to the shell's foot nav (§10.7).
    h('h1', {}, 'History'),
    h('p', { class: 'hint' }, COPY.log.noEdit),
    rows.length === 0
      ? h('p', {}, 'Nothing recorded yet.')
      : h('ul', { class: 'list' }, ...rows),
  );
}

function doseRow(row: Extract<LogRow, { deleted?: undefined }>, handlers: HistoryHandlers): HTMLElement {
  const asking = handlers.pendingDelete === row.id;
  const inWindow = hasRowInsideWindow([row], handlers.nowMs, DELETE_CONFIRM_WINDOW_HOURS);
  const reading = row.bloodSugar === null ? 'no reading' : `${String(row.bloodSugar)} mg/dL`;

  return h(
    'li',
    { class: 'li' },
    h(
      'div',
      { class: 'k' },
      h('b', {}, `${formatDate(row.timestamp, handlers.timeZone)}, ${formatClockTime(row.timestamp, handlers.timeZone)}`),
      `${reading} · ${String(row.carbs)} g of carbohydrate`,
      h('div', {}, `calculated ${units(row.units)} · injected ${units(row.injectedUnits)}`),
      row.overrodeStacking ? h('div', {}, 'recent-insulin check overridden') : null,
      asking
        ? h(
            'div',
            { class: 'flag' },
            h(
              'b',
              {},
              // §7.3 — the confirmation quotes the INJECTED figure, "the number
              // §7.4 is using and the number he acted on".
              COPY.log.deleteTitle(
                units(row.injectedUnits),
                formatClockTime(row.timestamp, handlers.timeZone),
              ),
            ),
            // §7.3 — deleting is a FRICTIONLESS BYPASS of the stacking gate, and
            // §4.6's argument applies verbatim: users learn the escape route.
            // Delete also legitimately means two things the app cannot
            // distinguish — "I never actually injected this" and "tidying up".
            inWindow ? COPY.log.deleteConsequence : 'This is older than the stacking check looks at.',
            h(
              'div',
              { class: 'sheet' },
              button(COPY.log.deleteAction, () => { handlers.onDelete(row.id); }, { class: 'go danger' }),
              button(COPY.cancel, () => { handlers.onAskDelete(null); }, { class: 'go quiet' }),
            ),
          )
        : null,
    ),
    asking ? null : button('Delete', () => { handlers.onAskDelete(row.id); }, { class: 'link' }),
  );
}

function readingRow(row: Reading, handlers: HistoryHandlers): HTMLElement {
  const note = row.note === undefined ? '' : ` · ${COPY.reading.notes[row.note]}`;
  return h(
    'li',
    { class: 'li' },
    h(
      'div',
      { class: 'k' },
      h('b', {}, `${formatDate(row.timestamp, handlers.timeZone)}, ${formatClockTime(row.timestamp, handlers.timeZone)}`),
      `${String(row.bloodSugar)} mg/dL — reading only, no dose${note}`,
    ),
    // §7.8 — reading rows are deletable with a PLAIN confirmation. §7.3's
    // stacking-consequence wording does not apply: deleting a reading removes a
    // record, never insulin-on-board information.
    button('Delete', () => { handlers.onDeleteReading(row.id); }, { class: 'link' }),
  );
}

// ── §7.7.1 — the two exports ───────────────────────────────────────────────

export interface ExportHandlers {
  readonly onMove: () => void;
  readonly onSave: () => void;
  readonly onImport: () => void;
  readonly lastJsonExportAtMs: number | null;
  readonly hasRecord: boolean;
  readonly nowMs: number;
  // §6.7 — the dosing-history question, asked at EXPORT and nowhere else.
  readonly dosingState: 'unanswered' | 'declined' | 'answered';
  readonly dosingText: string;
  readonly dosingDraft: string;
  readonly dosingAnsweredAtMs: number | null;
  readonly onDosingDraft: (value: string) => void;
  readonly onDosingSave: () => void;
  readonly onDosingSkip: () => void;
  readonly onDosingDecline: () => void;
  readonly decliningDosing: boolean;
  readonly onAskDecline: (asking: boolean) => void;
  readonly timeZone: string;
}

/**
 * §6.7 — what replaced the cut `usualDose` setting.
 *
 * The user's argument for cutting it was the strongest of the three: "his
 * brother's fixed 24-25 units per meal is not a baseline, it is the pathology
 * this calculator exists to replace. **A calculator whose entire premise is that
 * the dose varies with the meal and the reading cannot also store a field
 * asserting that it does not.**"
 *
 * But cutting it with nothing in its place loses the incumbent regimen the
 * moment his behaviour changes — "**the record meant to settle 25-against-11
 * must have 25 on it**". So: one optional question, asked at export, stored as a
 * dated note rather than a setting.
 *
 * Free text and not a number, for a clinical reason: this is medication
 * reconciliation, and the discrepancy is not the QUANTITY but the METHOD — a
 * fixed dose irrespective of intake. "A stored `25` cannot express that; a
 * sentence can."
 */
function dosingQuestion(handlers: ExportHandlers): HTMLElement | null {
  if (handlers.dosingState === 'declined') return null;

  if (handlers.decliningDosing) {
    // §6.7 v19 — declining CONFIRMS FIRST, stating the consequence. "'Don't ask
    // me again' is a single unguarded tap into an ABSORBING state, offered at
    // the identical hurried moment and sitting next to Skip."
    return h(
      'div',
      { class: 'flag' },
      h('b', {}, COPY.dosingHistory.declineAction),
      COPY.dosingHistory.declineConfirm,
      h(
        'div',
        { class: 'sheet' },
        button(COPY.dosingHistory.declineAction, handlers.onDosingDecline, { class: 'go danger' }),
        button(COPY.cancel, () => { handlers.onAskDecline(false); }, { class: 'go quiet' }),
      ),
    );
  }

  const answered = handlers.dosingState === 'answered';
  return h(
    'div',
    { class: 'flag mint' },
    h('b', {}, COPY.dosingHistory.question),
    answered
      ? // §6.7 v19 — `answered` can be READ BACK AND CORRECTED. Without it the
        // state is absorbing AND write-only: a garbled answer would be
        // permanent, invisible to him, and exported to the prescriber forever.
        h(
          'p',
          { class: 'hint' },
          handlers.dosingAnsweredAtMs === null
            ? ''
            : `Answered ${formatDate(handlers.dosingAnsweredAtMs, handlers.timeZone)}. Editing it replaces the answer and re-dates it.`,
        )
      : h('p', { class: 'hint' }, COPY.dosingHistory.hint),
    h(
      'div',
      { class: 'field wide' },
      h('label', {}, 'Your answer'),
      h('input', {
        type: 'text',
        autocomplete: 'off',
        value: handlers.dosingDraft,
        'data-field': 'dosingNote',
        oninput: (event) => { handlers.onDosingDraft((event.target as HTMLInputElement).value); },
      }),
    ),
    // `card-actions`, not `sheet`. `.sheet` is the SCREEN's bottom bar — full
     // width, `margin-top: auto`, one control per grid row — and using it inside
     // a card stacked three controls vertically. Measured: 192px of action block
     // for one save and two text links, which read as gaps rather than as
     // controls.
    //
    // The two secondary actions share a row instead. Each keeps §10.7's 48px
    // touch target; only the stacking changes.
    h(
      'div',
      { class: 'card-actions' },
      button(COPY.dosingHistory.save, handlers.onDosingSave, { class: 'go quiet' }),
      h(
        'div',
        { class: 'card-actions-row' },
        // §6.7 v18 — **SKIP IS NOT DECLINE.** "One hurried 'Skip' — at an export,
        // i.e. precisely when he is busy and heading to an appointment — would
        // permanently lose the record, unrepairably, because the transition window
        // does not recur." Skip leaves the state `unanswered`.
        button(COPY.dosingHistory.skip, handlers.onDosingSkip, { class: 'link' }),
        answered ? null : button(COPY.dosingHistory.declineAction, () => { handlers.onAskDecline(true); }, { class: 'link' }),
      ),
    ),
  );
}

export function exportScreen(handlers: ExportHandlers): HTMLElement {
  // §7.7.1 — SUPPRESSED when `log` and `readings` are both empty. "A fresh
  // install and a just-cleared record have nothing to protect, and §10.5's
  // doctrine is that a prompt firing with nothing behind it teaches the user to
  // dismiss the one that matters."
  const counter = !handlers.hasRecord
    ? null
    : handlers.lastJsonExportAtMs === null
      ? COPY.exports.neverCopied
      : COPY.exports.lastCopy(
          Math.floor((handlers.nowMs - handlers.lastJsonExportAtMs) / MS_PER_DAY),
        );

  return h(
    'div',
    { class: 'screen' },
    h('h1', {}, 'Keeping the record'),
    counter === null ? null : h('p', { class: 'hint' }, counter),

    // §7.7.1 — named by PURPOSE, not by format. "Neither is labelled by its file
    // type, and §10.2's no-abbreviations rule applies to both."
    h(
      'ul',
      { class: 'list' },
      h(
        'li',
        { class: 'li act' },
        h('div', { class: 'k' }, h('b', {}, COPY.exports.moveTitle), COPY.exports.moveBody),
        button(COPY.exports.makeBackup, handlers.onMove, { class: 'go' }),
      ),
      h(
        'li',
        { class: 'li act' },
        h('div', { class: 'k' }, h('b', {}, COPY.exports.saveTitle), COPY.exports.saveBody),
        button(COPY.exports.makeReport, handlers.onSave, { class: 'go quiet' }),
      ),
    ),

    dosingQuestion(handlers),

    h('h2', {}, 'Bringing a record in'),
    h(
      'p',
      { class: 'hint' },
      // §7.7 — "settings are NEVER silently replaced — an import PROPOSES them,
      // and adopting any of them runs §4.5's hard range checks and §10.1.6's
      // delta confirmation exactly as typing would."
      'Records merge in. Your prescription is only ever proposed — an import can never silently rewrite it.',
    ),
    h('div', { class: 'sheet' }, button('Load a record', handlers.onImport, { class: 'go quiet' })),
  );
}

// ── §7.9 — the two clearing controls ───────────────────────────────────────

export interface ClearHandlers {
  readonly onExportFirst: () => void;
  readonly onClearRecord: () => void;
  readonly onStartOver: () => void;
  readonly timeZone: string;
  readonly nowMs: number;
  readonly confirming: 'record' | 'startOver' | null;
  readonly onAsk: (which: 'record' | 'startOver' | null) => void;
}

/**
 * §7.9 — "**Both confirmations state what dies, in his own terms.** Never 'are
 * you sure?' — §7.4.1's principle, applied to deletion."
 *
 * And the stacking-consequence line, which v21 required for ONE row and omitted
 * for all 67: "delete-one was guarded; delete-everything was the unguarded door
 * beside it, which is §4.6's *users learn the escape route* argument arriving
 * from the direction nobody was watching."
 */
export function clearScreen(
  log: readonly LogRow[],
  readings: readonly Reading[],
  handlers: ClearHandlers,
): HTMLElement {
  const doses = log.filter(isInjection);
  const total = doses.length + readings.length;
  const stamps = [...doses, ...readings].map((row) => row.timestamp);
  const from = stamps.length === 0 ? null : formatDate(Math.min(...stamps), handlers.timeZone);
  const to = stamps.length === 0 ? null : formatDate(Math.max(...stamps), handlers.timeZone);

  const recent = doses
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .find((row) => hasRowInsideWindow([row], handlers.nowMs, DELETE_CONFIRM_WINDOW_HOURS));

  const stackingLine =
    recent === undefined
      ? null
      : h(
          'div',
          { class: 'flag' },
          COPY.clear.stackingKnown(formatClockTime(recent.timestamp, handlers.timeZone)),
        );

  return h(
    'div',
    { class: 'screen' },
    h('h1', {}, 'Clearing'),
    h(
      'p',
      {},
      // §7.9 — WHY these have to be in the app. Uninstalling without accepting
      // "also clear data" leaves the IndexedDB intact; accepting it is
      // ORIGIN-WIDE and takes the blog's storage with it (§11.7). Only code
      // inside this app can filter by scope.
      'Uninstalling does not reliably clear anything, and the browser’s own reset would take other sites on this address with it. These two are the ones that know what belongs to this app.',
    ),

    handlers.confirming === 'record'
      ? h(
          'div',
          { class: 'flag' },
          h('b', {}, COPY.clear.recordTitle(total)),
          from === null || to === null
            ? 'There is nothing recorded yet.'
            : COPY.clear.recordBody(from, to, readings.length),
          stackingLine,
          h(
            'div',
            { class: 'sheet' },
            // §7.9 — "**export is offered ON THE PATH, not after it.** The log is
            // the only copy of the thing the doctor reads, and the 65 mg/dL
            // readings live in it." The control OPENS THE EXPORT SCREEN rather
            // than naming a file: v21 wrote "[ Export first ]" in the revision
            // that split export in two, so the button named neither.
            button(COPY.clear.exportFirst, handlers.onExportFirst, { class: 'go quiet' }),
            button(COPY.clear.recordAction, handlers.onClearRecord, { class: 'go danger' }),
            button(COPY.cancel, () => { handlers.onAsk(null); }, { class: 'go quiet' }),
          ),
        )
      : null,

    handlers.confirming === 'startOver'
      ? h(
          'div',
          { class: 'flag' },
          h('b', {}, COPY.clear.startOverTitle),
          COPY.clear.startOverBody,
          // §7.9 — "**start over carries the same line for the same reason.** It
          // is the larger operation; it cannot owe less."
          stackingLine,
          h(
            'div',
            { class: 'sheet' },
            button(COPY.clear.exportFirst, handlers.onExportFirst, { class: 'go quiet' }),
            button(COPY.clear.startOverAction, handlers.onStartOver, { class: 'go danger' }),
            button(COPY.cancel, () => { handlers.onAsk(null); }, { class: 'go quiet' }),
          ),
        )
      : null,

    handlers.confirming !== null
      ? null
      : h(
          'ul',
          { class: 'list' },
          h(
            'li',
            { class: 'li' },
            h(
              'div',
              { class: 'k' },
              h('b', {}, 'Clear the record'),
              'Removes every dose and reading. Your prescription and its history stay, and the app is usable straight away.',
            ),
            button('Clear', () => { handlers.onAsk('record'); }, { class: 'go danger' }),
          ),
          h(
            'li',
            { class: 'li' },
            h(
              'div',
              { class: 'k' },
              h('b', {}, 'Start over'),
              'Everything goes, including your prescription. Setup runs again. For handing the phone on, or for getting out of a stuck state.',
            ),
            button('Start over', () => { handlers.onAsk('startOver'); }, { class: 'go danger' }),
          ),
        ),
  );
}

// ── §11.3 — the fail-closed screen ─────────────────────────────────────────

/**
 * §11.3, §7.9 — the screen that "had never been drawn", required since v4.
 *
 * It renders the settings from the frozen recovery block BEFORE offering the
 * escape, because after `deleteDatabase` that block is gone with everything else
 * and no export is possible without a connection. "That screen is the last place
 * those three numbers exist, so it says so."
 */
export function failClosedScreen(options: {
  readonly recovery: RecoveryBlock | null;
  readonly onStartOver: () => void;
  readonly blocked: boolean;
  readonly canReadLog: boolean;
  readonly confirming: boolean;
  readonly onAsk: (asking: boolean) => void;
}): HTMLElement {
  const { recovery } = options;
  return h(
    'div',
    { class: 'screen' },
    h('h1', {}, COPY.failClosed.title),
    h('p', {}, COPY.failClosed.body),

    recovery === null
      ? null
      : h(
          'div',
          {},
          h('h2', {}, COPY.failClosed.settingsHeading),
          h(
            'ul',
            { class: 'list' },
            h(
              'li',
              { class: 'li' },
              h('div', { class: 'k' }, 'A correction aims for'),
              h('div', { class: 'v' }, `${String(recovery.targetMgDl)} mg/dL`),
            ),
            h(
              'li',
              { class: 'li' },
              h('div', { class: 'k' }, '1 unit lowers blood sugar by'),
              h('div', { class: 'v' }, `${String(recovery.oneUnitLowersMgDl)} mg/dL`),
            ),
            h(
              'li',
              { class: 'li' },
              h('div', { class: 'k' }, '1 unit covers'),
              h('div', { class: 'v' }, `${String(recovery.oneUnitCoversGramsCarbohydrate)} g`),
            ),
            h(
              'li',
              { class: 'li' },
              h('div', { class: 'k' }, recovery.basalInsulinName),
              h('div', { class: 'v' }, `${String(recovery.basalUnitsPerDay)} units`),
            ),
          ),
          h('p', { class: 'hint' }, COPY.failClosed.copyThemDown),
        ),

    options.blocked ? h('div', { class: 'flag' }, COPY.failClosed.blocked) : null,

    options.confirming
      ? h(
          'div',
          { class: 'flag' },
          h('b', {}, COPY.clear.startOverTitle),
          COPY.clear.startOverBody,
          // §7.9 v23 — **the third state is NOT the second state.** The
          // stacking-consequence line reads the log, and the recovery connection
          // may not. "Rendering 'no recent dose' when the truth is 'unknown' is
          // §7.5's condemned class — a false safety claim — and it arrives here
          // through a gate that cannot see."
          h('div', { class: 'flag' }, options.canReadLog ? '' : COPY.clear.stackingUnknown),
          h(
            'div',
            { class: 'sheet' },
            button(COPY.failClosed.escape, options.onStartOver, { class: 'go danger' }),
            button(COPY.cancel, () => { options.onAsk(false); }, { class: 'go quiet' }),
          ),
        )
      : h(
          'div',
          { class: 'sheet' },
          button(COPY.failClosed.escape, () => { options.onAsk(true); }, { class: 'go danger' }),
        ),
  );
}

// ── §10.6 items 3, 4 and 5 ─────────────────────────────────────────────────

export function howItWorksScreen(advisoryStatus: string): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h('h1', {}, COPY.twoInsulins.title),
    h('p', {}, COPY.twoInsulins.body),

    h('h2', {}, 'The arithmetic, in full'),
    h(
      'p',
      {},
      // §15 — MHRA: "always provide details of the formula used". Only 30% of
      // the 46 audited apps documented theirs.
      'A correction is how far you are above your target, divided by how far one unit lowers you. A meal dose is the carbohydrate divided by how much one unit covers. The two are added, and a negative correction is subtracted from the meal dose rather than ignored.',
    ),
    h('p', {}, 'If the two together come out below zero, the answer is zero units — never a negative one.'),

    h('h2', {}, COPY.doesNotKnow.title),
    h('ul', { class: 'list' }, ...COPY.doesNotKnow.items.map((item) => h('li', { class: 'li' }, item))),

    h('h2', {}, COPY.firstRun.disagreementTitle),
    h('p', {}, COPY.firstRun.disagreementBody),

    h('h2', {}, 'The meal-size check'),
    h('p', {}, advisoryStatus),
    h('p', { class: 'hint' }, `It needs ${String(ADVISORY_MIN_ELIGIBLE)} logged meals before it can say anything.`),
  );
}

/** §10.6 item 4 — "show my settings as text", made to be photographed. */
export function settingsAsTextScreen(settings: Settings): HTMLElement {
  return h(
    'div',
    { class: 'screen' },
    h('h1', {}, 'My settings'),
    h(
      'ul',
      { class: 'list' },
      h('li', { class: 'li' }, h('div', { class: 'k' }, 'A correction aims for'), h('div', { class: 'v' }, `${String(settings.target)} mg/dL`)),
      h('li', { class: 'li' }, h('div', { class: 'k' }, COPY.settings.isfSentence(String(settings.isf)))),
      h('li', { class: 'li' }, h('div', { class: 'k' }, COPY.settings.icrSentence(String(settings.icr)))),
      h('li', { class: 'li' }, h('div', { class: 'k' }, 'Doses are rounded to'), h('div', { class: 'v' }, settings.mode)),
      h('li', { class: 'li' }, h('div', { class: 'k' }, 'Asks me to re-read at'), h('div', { class: 'v' }, units(settings.threshold * HUNDREDTHS_SCALE))),
    ),
    h(
      'div',
      { class: 'basal' },
      h('h2', {}, COPY.settings.basalTitle),
      h('p', { class: 'hint' }, COPY.settings.basalNote),
      h(
        'ul',
        { class: 'list' },
        h('li', { class: 'li' }, h('div', { class: 'k' }, settings.basalName), h('div', { class: 'v' }, `${formatHundredths(settings.basalUnits * HUNDREDTHS_SCALE)} units`)),
        h('li', { class: 'li' }, h('div', { class: 'k' }, settings.basalTiming)),
      ),
    ),
    h('p', { class: 'hint' }, 'This screen is meant to be photographed and shown to your doctor.'),
  );
}
