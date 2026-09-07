/**
 * §7.7.1's second export — "save the record".
 *
 * Until v21 the record existed in exactly one format, readable by exactly one
 * program: this app's own import. §11.7 simultaneously accepts that the export
 * IS the record's survival path — "a later move loses every logged dose and
 * setting unless the user exports first" — and a survival path only one program
 * can read is not one.
 *
 * **This is not a prescriber feature.** It is for him, his family, a future
 * clinician, a second opinion, and his own reading in five years.
 *
 * Why HTML and not PDF: a PDF library is 200-400 KB in an app that otherwise
 * ships no dependencies, and buys nothing. A self-contained HTML file opens on
 * the phone without a computer, shares through WhatsApp, and prints to PDF
 * through the browser's own dialog for free. CSV was declined — it cannot carry
 * the per-prescription attribution legibly, and it presents a medical record as a
 * spreadsheet.
 */

import { formatClockTime, formatDate, formatDayAndMonth } from '../core/calendar.js';
import { formatHundredths } from '../core/decimal.js';
import { groupByPrescriptionPeriod } from '../core/periods.js';
import type { PeriodGroup, SettingsPeriod } from '../core/periods.js';
import type { LogRow, Reading, Settings } from '../core/types.js';

/**
 * §7.7.1 v22 — **every value is HTML-escaped on the way in. Not only the
 * free-text ones.**
 *
 * "Escaping SOME fields is how the unescaped one is eventually found, and there
 * is no field here whose meaning is markup." v22's own miscount is the argument:
 * it said two free-text values where there are three, and a rule written as
 * "escape these two" would have shipped with `basalTiming` unescaped.
 *
 * The three are §6.7's dosing note, §1.3's `basalName` and §1.3's `basalTiming`.
 * §7.8's `note` comes from a fixed list and is already safe — worth saying only
 * so a later revision that makes it free text knows what it is inheriting.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface ReadableInput {
  readonly settings: Settings | null;
  readonly settingsHistory: readonly SettingsPeriod[];
  readonly log: readonly LogRow[];
  readonly readings: readonly Reading[];
  readonly dosingNote: { readonly text: string; readonly answeredAtMs: number } | null;
  readonly generatedAtMs: number;
  readonly timeZone: string;
  readonly appVersion: string;
}

/**
 * §7.7.1 — whose record this is, in the heading and the tab title.
 *
 * A doctor handed a file called "insulin record" cannot tell whose it is, and
 * neither can a folder holding three months of them. The name is ESCAPED like
 * every other value here — §7.7.1's escaping rule exists because this file is
 * assembled as HTML, and the name is the one field a person types freely.
 */
function recordTitle(settings: Settings | null): string {
  const name = settings?.personName.trim() ?? '';
  return name === '' ? 'Insulin record' : `${name}'s insulin record`;
}

const READING_NOTE_WORDS: Record<NonNullable<Reading['note']>, string> = {
  before_bed: 'before bed',
  overnight: 'overnight',
  felt_low: 'felt low',
  after_exercise: 'after exercise',
};

function prescriptionHeading(period: SettingsPeriod): string {
  // §10.1 — the sentence form, in the document as on the screen. Never the
  // short form as a primary label.
  return [
    `1 unit covers ${String(period.icr)} g`,
    `1 unit lowers ${String(period.isf)} mg/dL`,
    `target ${String(period.target)}`,
  ].join(' &middot; ');
}

function periodRange(group: PeriodGroup, timeZone: string, nowMs: number): string {
  if (group.startMs === null) return 'No prescription recorded for these';
  const from = formatDayAndMonth(group.startMs, timeZone);
  const to = group.endMs === null ? formatDayAndMonth(nowMs, timeZone) : formatDayAndMonth(group.endMs, timeZone);
  return `${from} &ndash; ${to}`;
}

function doseRows(group: PeriodGroup, timeZone: string): string {
  return group.doses
    .map((dose) => {
      const reading = dose.bloodSugar === null ? 'not entered' : `${String(dose.bloodSugar)} mg/dL`;
      const override = dose.overrodeStacking ? ' <span class="mark">override</span>' : '';
      return `<tr>
        <td>${escapeHtml(formatDate(dose.timestamp, timeZone))}</td>
        <td class="t">${escapeHtml(formatClockTime(dose.timestamp, timeZone))}</td>
        <td class="n">${escapeHtml(reading)}</td>
        <td class="n">${escapeHtml(String(dose.carbs))} g</td>
        <td class="n">${escapeHtml(formatHundredths(dose.units))} units</td>
        <td class="n">${escapeHtml(formatHundredths(dose.injectedUnits))} units${override}</td>
      </tr>`;
    })
    .join('\n');
}

function readingRows(group: PeriodGroup, timeZone: string): string {
  return group.readings
    .map((reading) => {
      const note = reading.note === undefined ? '' : READING_NOTE_WORDS[reading.note];
      return `<tr class="reading">
        <td>${escapeHtml(formatDate(reading.timestamp, timeZone))}</td>
        <td class="t">${escapeHtml(formatClockTime(reading.timestamp, timeZone))}</td>
        <td class="n">${escapeHtml(String(reading.bloodSugar))} mg/dL</td>
        <td colspan="3">reading only, no dose${note === '' ? '' : ` &mdash; ${escapeHtml(note)}`}</td>
      </tr>`;
    })
    .join('\n');
}

/**
 * §7.7.1 — grouped by prescription period rather than sorted by date, and that
 * is §7.7's attribution rule carried into a human rendering rather than a
 * layout preference.
 *
 * A dose calculated at carbohydrate ratio 10 stays 11 units forever. Printing
 * every row under one current settings block makes them all read as though
 * today's ratios produced them — **the exact false claim v9 was corrected to
 * remove**, reintroduced in prose. Grouping resolves it structurally, so the
 * document CANNOT misstate what produced a row.
 */
export function buildReadableExport(input: ReadableInput): string {
  const groups = groupByPrescriptionPeriod(input.settingsHistory, input.log, input.readings);
  const { timeZone } = input;

  const sections = groups
    .map((group) => {
      const heading =
        group.period === null
          ? 'Recorded outside any prescription period'
          : prescriptionHeading(group.period);
      const counts = `${String(group.doses.length)} dose${group.doses.length === 1 ? '' : 's'}, ${String(group.readings.length)} reading${group.readings.length === 1 ? '' : 's'}`;
      const rows = [...group.doses, ...group.readings].length === 0
        ? '<tr><td colspan="6" class="empty">Nothing recorded in this period.</td></tr>'
        : [doseRows(group, timeZone), readingRows(group, timeZone)].filter(Boolean).join('\n');
      return `<section>
      <h2>${heading}</h2>
      <p class="range">${periodRange(group, timeZone, input.generatedAtMs)} &nbsp;&nbsp; ${escapeHtml(counts)}</p>
      <table>
        <thead><tr><th>Date</th><th>Time</th><th>Blood sugar</th><th>Carbohydrate</th><th>Calculated</th><th>Injected</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </section>`;
    })
    .join('\n');

  const basal =
    input.settings === null
      ? ''
      : `<p><strong>${escapeHtml(input.settings.basalName)}</strong>, ${escapeHtml(String(input.settings.basalUnits))} units, ${escapeHtml(input.settings.basalTiming)}. Set by his doctor and not calculated by this app.</p>`;

  const note =
    input.dosingNote === null
      ? ''
      : `<section class="note">
      <h2>Patient-reported dosing history before app use</h2>
      <p>${escapeHtml(input.dosingNote.text)}</p>
      <p class="range">Self-reported, ${escapeHtml(formatDate(input.dosingNote.answeredAtMs, timeZone))}</p>
    </section>`;

  // §7.7.1 — the file CONTAINS NO SCRIPT AT ALL. "It is a document: text, a
  // stylesheet and nothing else. This is not defence-in-depth about the app's
  // own values, it is about where the file goes — the whole point of the format
  // is that it forwards through WhatsApp and opens on someone else's phone, and
  // a self-contained page that runs code is a worse thing to forward than one
  // that does not."
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(recordTitle(input.settings))} &mdash; ${escapeHtml(formatDate(input.generatedAtMs, timeZone))}</title>
<style>
  :root { color-scheme: light; }
  body { font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; padding: 1.5rem;
         color: #16202c; background: #fff; }
  main { max-width: 60rem; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  h2 { font-size: 1rem; margin: 0 0 .2rem; font-weight: 600; }
  .lede { color: #46586c; margin: 0 0 1.5rem; }
  .notice { border: 1px solid #d7c48a; background: #fdf8e8; padding: .75rem 1rem; border-radius: .4rem;
            margin: 0 0 1.5rem; }
  section { margin: 0 0 2rem; }
  .range { color: #46586c; font-size: .85rem; margin: 0 0 .5rem; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: .35rem .5rem; border-bottom: 1px solid #e3e8ee; white-space: nowrap; }
  th { font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; color: #46586c; }
  td.n, td.t { text-align: right; }
  tr.reading td { color: #46586c; font-style: italic; }
  .mark { font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; color: #8a5a00; }
  .empty { color: #7b8794; font-style: italic; }
  .note p { margin: .25rem 0; }
  footer { color: #7b8794; font-size: .8rem; border-top: 1px solid #e3e8ee; padding-top: 1rem; }
  @media print { body { padding: 0; } .notice { border-color: #999; background: none; } }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(recordTitle(input.settings))}</h1>
<p class="lede">Generated ${escapeHtml(formatDate(input.generatedAtMs, timeZone))} at ${escapeHtml(formatClockTime(input.generatedAtMs, timeZone))} by MealUnits ${escapeHtml(input.appVersion)}.</p>

<div class="notice">
  <strong>This is a readable copy. It cannot be loaded back into the app.</strong>
  To move the record to another phone, use <em>Move to another phone</em> instead &mdash; that file is
  the only one the app can restore from.
</div>

${basal}
${note}
${sections}

<footer>
  <p>Doses are grouped by the prescription that produced them, so a dose worked out under older
  ratios is never printed under newer ones.</p>
  <p>Rows marked <span class="mark">override</span> are ones where the recent-insulin check was
  deliberately overridden. Rows shown as readings had no dose &mdash; the app refused to give one,
  or none was asked for.</p>
  <p>MealUnits is not a medical device and has no regulatory clearance.</p>
</footer>
</main>
</body>
</html>
`;
}
