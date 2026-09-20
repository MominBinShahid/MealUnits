/**
 * The screens that are mostly words: first run, the history, the two exports,
 * the clearing controls, how-it-works, settings-as-text and the fail-closed
 * screen.
 *
 * They are together because none of them makes a dosing decision — every number
 * on them was decided elsewhere. Keeping them out of `calculator.tsx` is how
 * that stays visible.
 */

import { Fragment } from 'preact';
import type { JSX } from 'preact';
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
import { classOf, eatDelayFor } from '../../core/insulin.js';
import { INSULINS } from '../../data/insulins.js';
import { waitInWords } from './insulin.js';
import type { LogRow, Reading, Settings } from '../../core/types.js';
import type { RecoveryBlock } from '../../storage/schema.js';
import { COPY, units } from '../copy.js';
import { Button, TextInput } from '../components.js';

const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;

// ── §10.6 item 1 — the blocking disclaimer ─────────────────────────────────

export function DisclaimerScreen({
  onAccept,
  accepted,
  onToggle,
}: {
  readonly onAccept: () => void;
  readonly accepted: boolean;
  readonly onToggle: () => void;
}): JSX.Element {
  return (
    <div class="screen">
      <h1>{COPY.firstRun.disclaimerTitle}</h1>
      {/* §10.6 item 1 — the FORM carries the severity, the same correction §12
          made one screen over. Five paragraphs of identical grey prose meant
          the legal position of this app read exactly like the sentence about
          meter manufacturers.

          One red, by §10.5's budget: two reds is no red. */}
      <div class="flag stop">
        <b>{COPY.firstRun.notADevice.title}</b>
        <p>{COPY.firstRun.notADevice.body}</p>
      </div>
      {/* Amber, and the distinction is what each one is FOR. The red statement
          is what every reader must carry out of this screen; this one exists to
          send the wrong reader away, and a type 2 reader who gets this far has
          already been told in the words. */}
      <div class="flag">
        <b>{COPY.firstRun.typeOne.title}</b>
        <p>{COPY.firstRun.typeOne.body}</p>
      </div>
      {/* Plain, deliberately. These are facts about the app rather than hazards
          to the reader, and panelling them would spend the budget on nothing. */}
      {COPY.firstRun.disclaimerBody.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {/* §10.6 item 7 — a heading and a paragraph, promoted to amber because it
          is the one thing on this screen that asks the reader to DO something
          when the app and their habit disagree: show the doctor the record.
          It keeps its heading rather than borrowing the panel's, because it is
          a question rather than a statement and reads as one. */}
      <div class="flag">
        <b>{COPY.firstRun.disagreementTitle}</b>
        <p>{COPY.firstRun.disagreementBody}</p>
      </div>
      <div class="sheet">
        {/* §10.6 — a CHECKBOX PLUS SUBMIT, and "not dismissible by tapping past it". */}
        <Button class="go quiet" aria-pressed={accepted} onPress={onToggle}>
          {COPY.screens.disclaimerRead(accepted)}
        </Button>
        <Button class="go" disabled={!accepted} onPress={onAccept}>
          {COPY.firstRun.disclaimerAccept}
        </Button>
      </div>
    </div>
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

function DoseRow({
  row,
  handlers,
}: {
  readonly row: Extract<LogRow, { deleted?: undefined }>;
  readonly handlers: HistoryHandlers;
}): JSX.Element {
  const asking = handlers.pendingDelete === row.id;
  const inWindow = hasRowInsideWindow([row], handlers.nowMs, DELETE_CONFIRM_WINDOW_HOURS);
  const reading = row.bloodSugar === null ? COPY.screens.noReading : `${String(row.bloodSugar)}\u00A0mg/dL`;

  return (
    <li class="li">
      <div class="k">
        <b>
          {`${formatDate(row.timestamp, handlers.timeZone)}, ${formatClockTime(row.timestamp, handlers.timeZone)}`}
        </b>
        <div>
          {COPY.screens.historyIntake(reading, String(row.carbs)).map((part) => (
            <Fragment key={part.value}>
              <b class="fig">{part.value}</b>
              {part.rest}
            </Fragment>
          ))}
        </div>
        <div>
          {COPY.screens.historyDose(units(row.units), units(row.injectedUnits)).map((part) => (
            <Fragment key={part.label}>
              {part.label}
              <b class="fig">{part.value}</b>
            </Fragment>
          ))}
        </div>
        {row.overrodeStacking ? <div>{COPY.screens.stackingOverridden}</div> : null}
        {asking ? (
          <div class="flag">
            <b>
              {/* §7.3 — the confirmation quotes the INJECTED figure, "the number
                  §7.4 is using and the number he acted on". */}
              {COPY.log.deleteTitle(
                units(row.injectedUnits),
                formatClockTime(row.timestamp, handlers.timeZone),
              )}
            </b>
            {/* §7.3 — deleting is a FRICTIONLESS BYPASS of the stacking gate, and
                §4.6's argument applies verbatim: users learn the escape route.
                Delete also legitimately means two things the app cannot
                distinguish — "I never actually injected this" and "tidying up". */}
            {inWindow ? COPY.log.deleteConsequence : COPY.screens.outsideStackingWindow}
            <div class="sheet">
              <Button class="go danger" onPress={() => { handlers.onDelete(row.id); }}>
                {COPY.log.deleteAction}
              </Button>
              <Button class="go quiet" onPress={() => { handlers.onAskDelete(null); }}>
                {COPY.cancel}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      {asking ? null : (
        <Button class="link" onPress={() => { handlers.onAskDelete(row.id); }}>
          {COPY.screens.delete}
        </Button>
      )}
    </li>
  );
}

function ReadingRow({
  row,
  handlers,
}: {
  readonly row: Reading;
  readonly handlers: HistoryHandlers;
}): JSX.Element {
  const note = row.note === undefined ? '' : ` · ${COPY.reading.notes[row.note]}`;
  return (
    <li class="li">
      <div class="k">
        <b>
          {`${formatDate(row.timestamp, handlers.timeZone)}, ${formatClockTime(row.timestamp, handlers.timeZone)}`}
        </b>
        {COPY.screens.readingOnly(String(row.bloodSugar), note)}
      </div>
      {/* §7.8 — reading rows are deletable with a PLAIN confirmation. §7.3's
          stacking-consequence wording does not apply: deleting a reading removes
          a record, never insulin-on-board information. */}
      <Button class="link" onPress={() => { handlers.onDeleteReading(row.id); }}>
        {COPY.screens.delete}
      </Button>
    </li>
  );
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
export function HistoryScreen({
  log,
  readings,
  handlers,
}: {
  readonly log: readonly LogRow[];
  readonly readings: readonly Reading[];
  readonly handlers: HistoryHandlers;
}): JSX.Element {
  const doses = log.filter(isInjection).slice().sort((a, b) => b.timestamp - a.timestamp);
  const sortedReadings = readings.slice().sort((a, b) => b.timestamp - a.timestamp);

  const rows = [
    ...doses.map((row) => ({
      at: row.timestamp,
      node: <DoseRow key={row.id} row={row} handlers={handlers} />,
    })),
    ...sortedReadings.map((row) => ({
      at: row.timestamp,
      node: <ReadingRow key={row.id} row={row} handlers={handlers} />,
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .map((entry) => entry.node);

  return (
    <div class="screen">
      {/* Back and "Save a copy" both moved to the shell's foot nav (§10.7). */}
      <h1>{COPY.screens.historyTitle}</h1>
      <p class="hint">{COPY.log.noEdit}</p>
      {rows.length === 0 ? <p>{COPY.screens.historyEmpty}</p> : <ul class="list">{rows}</ul>}
    </div>
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
function DosingQuestion({ handlers }: { readonly handlers: ExportHandlers }): JSX.Element | null {
  if (handlers.dosingState === 'declined') return null;

  if (handlers.decliningDosing) {
    // §6.7 v19 — declining CONFIRMS FIRST, stating the consequence. "'Don't ask
    // me again' is a single unguarded tap into an ABSORBING state, offered at
    // the identical hurried moment and sitting next to Skip."
    return (
      <div class="flag">
        <b>{COPY.dosingHistory.declineAction}</b>
        {COPY.dosingHistory.declineConfirm}
        <div class="sheet">
          <Button class="go danger" onPress={handlers.onDosingDecline}>
            {COPY.dosingHistory.declineAction}
          </Button>
          <Button class="go quiet" onPress={() => { handlers.onAskDecline(false); }}>
            {COPY.cancel}
          </Button>
        </div>
      </div>
    );
  }

  const answered = handlers.dosingState === 'answered';
  return (
    <div class="flag mint">
      <b>{COPY.dosingHistory.question}</b>
      {answered ? (
        // §6.7 v19 — `answered` can be READ BACK AND CORRECTED. Without it the
        // state is absorbing AND write-only: a garbled answer would be
        // permanent, invisible to him, and exported to the prescriber forever.
        <p class="hint">
          {handlers.dosingAnsweredAtMs === null
            ? ''
            : COPY.screens.dosingAnsweredAt(
                formatDate(handlers.dosingAnsweredAtMs, handlers.timeZone),
              )}
        </p>
      ) : (
        <p class="hint">{COPY.dosingHistory.hint}</p>
      )}
      <div class="field wide">
        <label>{COPY.screens.yourAnswer}</label>
        <TextInput
          type="text"
          autocomplete="off"
          value={handlers.dosingDraft}
          data-field="dosingNote"
          onValue={handlers.onDosingDraft}
        />
      </div>
      {/* `card-actions`, not `sheet`. `.sheet` is the SCREEN's bottom bar — full
          width, `margin-top: auto`, one control per grid row — and using it
          inside a card stacked three controls vertically. Measured: 192px of
          action block for one save and two text links, which read as gaps rather
          than as controls.

          The two secondary actions share a row instead. Each keeps §10.7's 48px
          touch target; only the stacking changes. */}
      <div class="card-actions">
        <Button class="go quiet" onPress={handlers.onDosingSave}>
          {COPY.dosingHistory.save}
        </Button>
        <div class="card-actions-row">
          {/* §6.7 v18 — **SKIP IS NOT DECLINE.** "One hurried 'Skip' — at an
              export, i.e. precisely when he is busy and heading to an
              appointment — would permanently lose the record, unrepairably,
              because the transition window does not recur." Skip leaves the
              state `unanswered`. */}
          <Button class="link" onPress={handlers.onDosingSkip}>
            {COPY.dosingHistory.skip}
          </Button>
          {answered ? null : (
            <Button class="link" onPress={() => { handlers.onAskDecline(true); }}>
              {COPY.dosingHistory.declineAction}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExportScreen({ handlers }: { readonly handlers: ExportHandlers }): JSX.Element {
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

  return (
    <div class="screen">
      <h1>{COPY.screens.exportTitle}</h1>
      {counter === null ? null : <p class="hint">{counter}</p>}

      {/* §7.7.1 — named by PURPOSE, not by format. "Neither is labelled by its
          file type, and §10.2's no-abbreviations rule applies to both." */}
      <ul class="list">
        <li class="li act">
          <div class="k">
            <b>{COPY.exports.moveTitle}</b>
            {COPY.exports.moveBody}
          </div>
          <Button class="go" onPress={handlers.onMove}>{COPY.exports.makeBackup}</Button>
        </li>
        <li class="li act">
          <div class="k">
            <b>{COPY.exports.saveTitle}</b>
            {COPY.exports.saveBody}
          </div>
          <Button class="go quiet" onPress={handlers.onSave}>{COPY.exports.makeReport}</Button>
        </li>
      </ul>

      <DosingQuestion handlers={handlers} />

      <h2>{COPY.screens.importTitle}</h2>
      <p class="hint">
        {/* §7.7 — "settings are NEVER silently replaced — an import PROPOSES
            them, and adopting any of them runs §4.5's hard range checks and
            §10.1.6's delta confirmation exactly as typing would." */}
        {COPY.screens.importNote}
      </p>
      <div class="sheet">
        <Button class="go quiet" onPress={handlers.onImport}>{COPY.screens.importAction}</Button>
      </div>
    </div>
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
export function ClearScreen({
  log,
  readings,
  handlers,
}: {
  readonly log: readonly LogRow[];
  readonly readings: readonly Reading[];
  readonly handlers: ClearHandlers;
}): JSX.Element {
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
    recent === undefined ? null : (
      <div class="flag">
        {COPY.clear.stackingKnown(formatClockTime(recent.timestamp, handlers.timeZone))}
      </div>
    );

  return (
    <div class="screen">
      <h1>{COPY.screens.clearTitle}</h1>
      <p>
        {/* §7.9 — WHY these have to be in the app. Uninstalling without
            accepting "also clear data" leaves the IndexedDB intact; accepting it
            is ORIGIN-WIDE and takes the blog's storage with it (§11.7). Only
            code inside this app can filter by scope. */}
        {COPY.screens.clearNote}
      </p>

      {handlers.confirming === 'record' ? (
        <div class="flag">
          <b>{COPY.clear.recordTitle(total)}</b>
          {from === null || to === null
            ? COPY.screens.clearEmpty
            : COPY.clear.recordBody(from, to, readings.length)}
          {stackingLine}
          <div class="sheet">
            {/* §7.9 — "**export is offered ON THE PATH, not after it.** The log
                is the only copy of the thing the doctor reads, and the 65 mg/dL
                readings live in it." The control OPENS THE EXPORT SCREEN rather
                than naming a file: v21 wrote "[ Export first ]" in the revision
                that split export in two, so the button named neither. */}
            <Button class="go quiet" onPress={handlers.onExportFirst}>
              {COPY.clear.exportFirst}
            </Button>
            <Button class="go danger" onPress={handlers.onClearRecord}>
              {COPY.clear.recordAction}
            </Button>
            <Button class="go quiet" onPress={() => { handlers.onAsk(null); }}>
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {handlers.confirming === 'startOver' ? (
        <div class="flag">
          <b>{COPY.clear.startOverTitle}</b>
          {COPY.clear.startOverBody}
          {/* §7.9 — "**start over carries the same line for the same reason.**
              It is the larger operation; it cannot owe less." */}
          {stackingLine}
          <div class="sheet">
            <Button class="go quiet" onPress={handlers.onExportFirst}>
              {COPY.clear.exportFirst}
            </Button>
            <Button class="go danger" onPress={handlers.onStartOver}>
              {COPY.clear.startOverAction}
            </Button>
            <Button class="go quiet" onPress={() => { handlers.onAsk(null); }}>
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {handlers.confirming !== null ? null : (
        <ul class="list">
          <li class="li">
            <div class="k">
              <b>{COPY.screens.clearRecordTitle}</b>
              {COPY.screens.clearRecordBody}
            </div>
            <Button class="go danger" onPress={() => { handlers.onAsk('record'); }}>
              {COPY.screens.clearRecordAction}
            </Button>
          </li>
          <li class="li">
            <div class="k">
              <b>{COPY.screens.startOverTitle}</b>
              {COPY.screens.startOverBody}
            </div>
            <Button class="go danger" onPress={() => { handlers.onAsk('startOver'); }}>
              {COPY.screens.startOverTitle}
            </Button>
          </li>
        </ul>
      )}
    </div>
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
export function FailClosedScreen({
  recovery,
  onStartOver,
  blocked,
  canReadLog,
  confirming,
  onAsk,
}: {
  readonly recovery: RecoveryBlock | null;
  readonly onStartOver: () => void;
  readonly blocked: boolean;
  readonly canReadLog: boolean;
  readonly confirming: boolean;
  readonly onAsk: (asking: boolean) => void;
}): JSX.Element {
  return (
    <div class="screen">
      <h1>{COPY.failClosed.title}</h1>
      <p>{COPY.failClosed.body}</p>

      {recovery === null ? null : (
        <div>
          <h2>{COPY.failClosed.settingsHeading}</h2>
          <ul class="list">
            <li class="li">
              <div class="k">{COPY.screens.recordTarget}</div>
              <div class="v">{`${String(recovery.targetMgDl)}\u00A0mg/dL`}</div>
            </li>
            <li class="li">
              <div class="k">{COPY.screens.recordIsf}</div>
              <div class="v">{`${String(recovery.oneUnitLowersMgDl)}\u00A0mg/dL`}</div>
            </li>
            <li class="li">
              <div class="k">{COPY.screens.recordIcr}</div>
              <div class="v">{`${String(recovery.oneUnitCoversGramsCarbohydrate)}\u00A0g`}</div>
            </li>
            {/* §8.5 — the mealtime insulin, on the screen whose whole purpose
                is that the settings survive a database this build cannot open.
                A block written before the field existed has no value here and
                shows nothing rather than an empty row. */}
            {recovery.mealtimeInsulin === '' ? null : (
              <li class="li">
                <div class="k">{COPY.insulin.settingsLabel}</div>
                <div class="v">{recovery.mealtimeInsulin}</div>
              </li>
            )}
            <li class="li">
              <div class="k">{recovery.basalInsulinName}</div>
              <div class="v">{`${String(recovery.basalUnitsPerDay)}\u00A0units`}</div>
            </li>
          </ul>
          <p class="hint">{COPY.failClosed.copyThemDown}</p>
        </div>
      )}

      {blocked ? <div class="flag">{COPY.failClosed.blocked}</div> : null}

      {confirming ? (
        <div class="flag">
          <b>{COPY.clear.startOverTitle}</b>
          {COPY.clear.startOverBody}
          {/* §7.9 v23 — **the third state is NOT the second state.** The
              stacking-consequence line reads the log, and the recovery
              connection may not. "Rendering 'no recent dose' when the truth is
              'unknown' is §7.5's condemned class — a false safety claim — and it
              arrives here through a gate that cannot see." */}
          <div class="flag">{canReadLog ? '' : COPY.clear.stackingUnknown}</div>
          <div class="sheet">
            <Button class="go danger" onPress={onStartOver}>{COPY.failClosed.escape}</Button>
            <Button class="go quiet" onPress={() => { onAsk(false); }}>{COPY.cancel}</Button>
          </div>
        </div>
      ) : (
        <div class="sheet">
          <Button class="go danger" onPress={() => { onAsk(true); }}>
            {COPY.failClosed.escape}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── §10.6 items 3, 4 and 5 ─────────────────────────────────────────────────

export function HowItWorksScreen({
  advisoryStatus,
  insulinBrand,
}: {
  readonly advisoryStatus: string;
  /**
   * §8.5 — the reader's own insulin, or null for "I don't know". This page is
   * REACHABLE DURING SETUP (§10.6's gate would otherwise hide the explanation
   * at the one moment it is needed), and during setup the answer may be a draft
   * that has not been stored — so it is passed in rather than read.
   */
  readonly insulinBrand: string | null;
}): JSX.Element {
  return (
    <div class="screen">
      <h1>{COPY.twoInsulins.title}</h1>
      <p>{COPY.twoInsulins.body}</p>
      {/* What the reader's own insulin decides, in the section that already
          says what this app does and does not cover. Same strings as the
          Settings hints (§10.2), not a second copy of them. */}
      <p>{COPY.settings.insulinNote(insulinBrand)}</p>
      <p>{COPY.settings.stackingWindowsNote}</p>

      {/* FIRST, ahead of the arithmetic, because who this is for decides whether
          any of the arithmetic applies to the reader at all. The disclaimer
          states it as a rule; this is where it is explained. */}
      <h2>{COPY.explain.audienceTitle}</h2>
      {/* The condition is bold; a paragraph without one renders as plain prose. */}
      {COPY.explain.audienceBody.map((para) =>
        para.condition === null ? (
          <p key={para.lead}>{para.lead}</p>
        ) : (
          <p key={para.lead}>
            {para.lead}
            <b>{para.condition}</b>
            {para.rest}
          </p>
        ),
      )}

      <h2>{COPY.screens.arithmeticTitle}</h2>
      <p>
        {/* §15 — MHRA: "always provide details of the formula used". Only 30% of
            the 46 audited apps documented theirs. */}
        {COPY.screens.arithmeticBody}
      </p>
      <p>{COPY.screens.arithmeticFloor}</p>

      {/* The two phrases above are what these names NAME, so the section
          attaches to them rather than opening the page. The clinical definitions
          are the settings strings themselves, not copies of them (§10.2 — the
          words are the specification, and two copies are two things to keep in
          step). */}
      <h2>{COPY.explain.namesTitle}</h2>
      <p>{COPY.explain.namesLead}</p>
      <p class="clinical">{COPY.settings.isfClinical}</p>
      <p class="clinical">{COPY.settings.icrClinical}</p>
      <p>{COPY.explain.namesClose}</p>

      {/* §10.6 — the reading comes off a meter; this number does not, and until
          now nothing anywhere said what it should contain. It sits before "what
          this app does not know about" so its third paragraph can point forward
          at the fat-and-protein item rather than repeat it. */}
      <h2>{COPY.explain.carbTitle}</h2>
      {COPY.explain.carbBody.map((para) => (
        <p key={para}>{para}</p>
      ))}

      <h2>{COPY.doesNotKnow.title}</h2>
      <ul class="list">
        {COPY.doesNotKnow.items.map((item) => (
          <li key={item} class="li">{item}</li>
        ))}
      </ul>

      {/* The word appeared SEVEN times in user-facing copy and was never defined
          — the app's most important safety behaviour explained in a term the
          reader was assumed to know. It follows the list above because that
          list's first item ("insulin you injected that it has no record of") is
          the thing this section is about. */}
      <h2>{COPY.explain.stackingTitle}</h2>
      {COPY.explain.stackingBody.map((para) => (
        <p key={para}>{para}</p>
      ))}

      {/* A stacking message, unreadable apart from one, so it follows
          immediately. The five conditions are enumerated rather than summarised:
          copy that says only "when you have not logged anything recently"
          describes v4's bug, which fired the caveat after every overnight gap. */}
      <h2>{COPY.explain.missingTitle}</h2>
      <p>{COPY.explain.missingBody}</p>
      <p class="hint">{COPY.screens.anyOfThese}</p>
      <ul class="list">
        {COPY.explain.missingConditions.map((item) => (
          <li key={item} class="li">{item}</li>
        ))}
      </ul>

      <h2>{COPY.explain.expiryTitle}</h2>
      {COPY.explain.expiryBody.map((para) => (
        <p key={para}>{para}</p>
      ))}

      <h2>{COPY.firstRun.disagreementTitle}</h2>
      <p>{COPY.firstRun.disagreementBody}</p>

      <h2>{COPY.rounding.title}</h2>
      <p>{COPY.rounding.intro}</p>
      <ul class="list">
        {COPY.rounding.modes.map(({ mode, name, what }) => (
          <li key={mode} class="li">
            <div class="k">
              <b>{name}</b>
              {what}
            </div>
          </li>
        ))}
      </ul>
      <p class="hint">{COPY.rounding.closing}</p>

      <h2>{COPY.screens.mealCheckTitle}</h2>
      <p>{advisoryStatus}</p>
      <p class="hint">{COPY.screens.mealCheckNeeds(String(ADVISORY_MIN_ELIGIBLE))}</p>
    </div>
  );
}

/**
 * The mode's DISPLAY name, not its key. Until 2026-09-14 this screen rendered
 * `settings.mode` raw, so the page built to be photographed and handed to a
 * doctor read "Doses are rounded to — ceil". The one reader who most needs the
 * setting to be legible got the enum.
 */
function roundingName(mode: Settings['mode']): string {
  const found = COPY.rounding.modes.find((entry) => entry.mode === mode);
  return found === undefined ? mode : found.name;
}

/** §10.6 item 4 — "show my settings as text", made to be photographed. */
export function SettingsAsTextScreen({
  settings,
}: {
  readonly settings: Settings;
}): JSX.Element {
  const waitText = waitInWords(
    eatDelayFor(classOf(INSULINS, settings.insulinId), settings.eatDelayMinutes),
  );
  return (
    <div class="screen">
      <h1>{COPY.screens.asTextTitle}</h1>
      <ul class="list">
        <li class="li">
          <div class="k">{COPY.screens.recordTarget}</div>
          <div class="v">{`${String(settings.target)}\u00A0mg/dL`}</div>
        </li>
        <li class="li">
          <div class="k">{COPY.settings.isfSentence(String(settings.isf))}</div>
        </li>
        <li class="li">
          <div class="k">{COPY.settings.icrSentence(String(settings.icr))}</div>
        </li>
        <li class="li">
          <div class="k">{COPY.screens.asTextRounding}</div>
          <div class="v">{roundingName(settings.mode)}</div>
        </li>
        <li class="li">
          <div class="k">{COPY.screens.asTextThreshold}</div>
          <div class="v">{units(settings.threshold * HUNDREDTHS_SCALE)}</div>
        </li>
        {/* §8.5 — this screen exists to be PHOTOGRAPHED and shown to a doctor,
            and the mealtime insulin is the first thing they would ask. Below
            the ratios because it changes none of them. */}
        <li class="li">
          <div class="k">{COPY.insulin.settingsLabel}</div>
          <div class="v">
            {INSULINS.find((row) => row.id === settings.insulinId)?.brand ??
              COPY.insulin.notRecorded}
          </div>
        </li>
        {waitText === null ? null : (
          <li class="li">
            <div class="k">{COPY.insulin.settingsTiming(waitText)}</div>
          </li>
        )}
      </ul>
      <div class="basal">
        <h2>{COPY.settings.basalTitle}</h2>
        <p class="hint">{COPY.settings.basalNote}</p>
        <ul class="list">
          <li class="li">
            <div class="k">
              {settings.basalName.trim() === '' ? COPY.settings.basalNameMissing : settings.basalName}
            </div>
            <div class="v">
              {`${formatHundredths(settings.basalUnits * HUNDREDTHS_SCALE)}\u00A0units`}
            </div>
          </li>
          <li class="li">
            <div class="k">{settings.basalTiming}</div>
          </li>
        </ul>
      </div>
      <p class="hint">{COPY.screens.asTextFooter}</p>
    </div>
  );
}
