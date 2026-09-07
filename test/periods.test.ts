import { describe, expect, it } from 'vitest';
import { countsFor, groupByPrescriptionPeriod } from '../src/core/periods.js';
import type { SettingsPeriod } from '../src/core/periods.js';
import type { Injection, LogRow, Reading, Tombstone } from '../src/core/types.js';

const DAY = 86_400_000;
/** 18 Aug 2026, the start of §7.7.1's own worked example. */
const AUG_18 = Date.parse('2026-08-18T00:00:00Z');
const SEP_3 = Date.parse('2026-09-03T00:00:00Z');

function period(overrides: Partial<SettingsPeriod> = {}): SettingsPeriod {
  return {
    revision: 1,
    changedAtMs: AUG_18,
    target: 150,
    isf: 30,
    icr: 10,
    mode: 'nearest',
    imported: false,
    ...overrides,
  };
}

let seq = 0;
function dose(revision: number, timestamp: number): Injection {
  seq += 1;
  return {
    id: `dose-${seq.toString()}`,
    timestamp,
    bloodSugar: 200,
    carbs: 60,
    units: 600,
    injectedUnits: 600,
    settingsRevision: revision,
    overrodeStacking: false,
    timingAdvice: 'before',
    advisoryFlagged: false,
  };
}

function reading(timestamp: number, bloodSugar = 65): Reading {
  seq += 1;
  return { id: `read-${seq.toString()}`, timestamp, bloodSugar };
}

function tombstone(timestamp: number): Tombstone {
  seq += 1;
  return { id: `gone-${seq.toString()}`, timestamp, deleted: true, deletedAtMs: timestamp + 1000 };
}

describe('§7.7.1 the two placement rules', () => {
  const history = [
    period({ revision: 1, changedAtMs: AUG_18, icr: 10 }),
    period({ revision: 2, changedAtMs: SEP_3, icr: 12 }),
  ];

  it('places a DOSE by its stamp, never by its timestamp', () => {
    // §11.3's ROW STAMP is authoritative. A dose calculated at carbohydrate
    // ratio 10 stays 11 units forever, and printing it under today's ratios is
    // the exact false claim v9 was corrected to remove.
    //
    // This row is stamped revision 1 but timestamped INSIDE period 2 — the
    // cross-tab race §11.3 describes, where a settings commit in another tab
    // lands between calculating and logging.
    const rows = [dose(1, SEP_3 + DAY)];
    const groups = groupByPrescriptionPeriod(history, rows, []);
    expect(groups[0]?.period?.revision).toBe(1);
    expect(groups[0]?.doses).toHaveLength(1);
    expect(groups[1]?.doses).toHaveLength(0);
  });

  it('places a READING by its timestamp, because it carries no revision', () => {
    // §7.8's row is id, timestamp, bloodSugar, note — deliberately, since no
    // settings produced it. Stamping one would attach §7.7's attribution claim
    // to a row nothing produced.
    const readings = [reading(AUG_18 + DAY), reading(SEP_3 + DAY)];
    const groups = groupByPrescriptionPeriod(history, [], readings);
    expect(groups[0]?.readings).toHaveLength(1);
    expect(groups[1]?.readings).toHaveLength(1);
  });

  it('and the same row pair can legitimately land in different groups', () => {
    // The dose is stamped 1; the reading beside it falls in period 2. That is
    // not a bug — it is the two rules doing their separate jobs truthfully.
    const groups = groupByPrescriptionPeriod(
      history,
      [dose(1, SEP_3 + DAY)],
      [reading(SEP_3 + DAY)],
    );
    expect(groups[0]?.doses).toHaveLength(1);
    expect(groups[0]?.readings).toHaveLength(0);
    expect(groups[1]?.doses).toHaveLength(0);
    expect(groups[1]?.readings).toHaveLength(1);
  });
});

describe('§7.7.1 periods are ordered by changedAtMs, NOT by revision key', () => {
  it('renders the storage-loss flow correctly — the v23 defect', () => {
    // §1.2's own recovery path: re-enter the settings by hand (local revisions
    // 1..k with TODAY's timestamps), then import the backup (k+1..k+n with LAST
    // YEAR's timestamps). Ordering by key gives:
    //   period k   -> [recent, old) -> EMPTY
    //   period k+n -> [old, ->)     -> the open-ended one, swallowing the present
    const local = period({ revision: 1, changedAtMs: SEP_3, imported: false });
    const imported = period({ revision: 2, changedAtMs: AUG_18, imported: true });
    const groups = groupByPrescriptionPeriod([local, imported], [], []);
    // Chronological, so the imported August period comes first.
    expect(groups.map((group) => group.period?.revision)).toEqual([2, 1]);
    expect(groups[0]?.endMs).toBe(SEP_3);
    expect(groups[1]?.endMs).toBeNull();
  });

  it('and a reading recorded after that import lands under the LOCAL prescription', () => {
    // The composition §13.3 gains: non-empty import, then a reading, then the
    // readable export. With periods ordered by key it lands under an imported
    // prescription from the other install — a false attribution in the
    // clinician-facing document, on the recovery path the remap exists for.
    const local = period({ revision: 1, changedAtMs: SEP_3, imported: false });
    const imported = period({ revision: 2, changedAtMs: AUG_18, imported: true });
    const groups = groupByPrescriptionPeriod([local, imported], [], [reading(SEP_3 + DAY)]);
    const withReading = groups.find((group) => group.readings.length > 0);
    expect(withReading?.period?.revision).toBe(1);
    expect(withReading?.period?.imported).toBe(false);
  });

  it('§7.7.1 v24 — an imported period LATER than the local one never captures a new reading', () => {
    // Chronological order fixes the older-import case and leaves the newer one
    // open. §7.7 is explicit that import PROPOSES settings rather than adopting
    // them, so an imported revision was in force on the other phone and never
    // on this one.
    const local = period({ revision: 1, changedAtMs: AUG_18, imported: false });
    const importedLater = period({ revision: 2, changedAtMs: SEP_3, imported: true });
    const groups = groupByPrescriptionPeriod(
      [local, importedLater],
      [],
      [reading(SEP_3 + DAY)],
    );
    const withReading = groups.find((group) => group.readings.length > 0);
    expect(withReading?.period?.revision).toBe(1);
  });

  it('re-importing your own backup does not migrate a reading into the duplicate', () => {
    // §7.7 already accepts that this appends duplicate settingsHistory entries
    // and calls the orphans cruft. Without the local-timeline rule a reading
    // migrates into the duplicate group while the dose beside it keeps its
    // original stamp — the same row pair, split across two prescriptions.
    const original = period({ revision: 1, changedAtMs: AUG_18, imported: false });
    const duplicate = period({ revision: 2, changedAtMs: AUG_18 + 1000, imported: true });
    const groups = groupByPrescriptionPeriod(
      [original, duplicate],
      [dose(1, AUG_18 + DAY)],
      [reading(AUG_18 + DAY)],
    );
    const withDose = groups.find((group) => group.doses.length > 0);
    const withReading = groups.find((group) => group.readings.length > 0);
    expect(withDose?.period?.revision).toBe(1);
    expect(withReading?.period?.revision).toBe(1);
  });

  it('places an imported reading under its imported period', () => {
    // "An imported period bounds only readings that ARRIVED WITH THE IMPORT" —
    // those carry the other install's older timestamps, before any local
    // period began.
    const local = period({ revision: 1, changedAtMs: SEP_3, imported: false });
    const imported = period({ revision: 2, changedAtMs: AUG_18, imported: true });
    const groups = groupByPrescriptionPeriod([local, imported], [], [reading(AUG_18 + DAY)]);
    const withReading = groups.find((group) => group.readings.length > 0);
    expect(withReading?.period?.revision).toBe(2);
    expect(withReading?.period?.imported).toBe(true);
  });
});

describe('§7.7.1 the unplaceable group', () => {
  it('a reading before every period gets its OWN labelled group, never the nearest', () => {
    // Visible and odd beats invisible and wrong. It should be unreachable —
    // §1.2 makes settings mandatory before anything is recordable — but the
    // import path remaps revisions across installs.
    const groups = groupByPrescriptionPeriod([period({ revision: 1 })], [], [reading(AUG_18 - DAY)]);
    const orphan = groups.find((group) => group.period === null);
    expect(orphan?.readings).toHaveLength(1);
    expect(groups[0]?.readings).toHaveLength(0);
  });

  it('a dose whose stamp matches no prescription lands there too', () => {
    const groups = groupByPrescriptionPeriod([period({ revision: 1 })], [dose(99, AUG_18 + DAY)], []);
    const orphan = groups.find((group) => group.period === null);
    expect(orphan?.doses).toHaveLength(1);
  });

  it('sorts the unplaceable group by time as well', () => {
    const groups = groupByPrescriptionPeriod(
      [period({ revision: 1 })],
      [dose(99, AUG_18 + 3 * DAY), dose(99, AUG_18 + DAY)],
      [reading(AUG_18 - 3 * DAY), reading(AUG_18 - 5 * DAY)],
    );
    const orphan = groups.find((group) => group.period === null);
    expect(orphan?.doses.map((d) => d.timestamp)).toEqual([AUG_18 + DAY, AUG_18 + 3 * DAY]);
    expect(orphan?.readings.map((r) => r.timestamp)).toEqual([AUG_18 - 5 * DAY, AUG_18 - 3 * DAY]);
  });

  it('does not reorder the caller\'s arrays while doing it', () => {
    const rows = [dose(99, AUG_18 + 3 * DAY), dose(99, AUG_18 + DAY)];
    const readings = [reading(AUG_18 - 3 * DAY), reading(AUG_18 - 5 * DAY)];
    const rowOrder = rows.map((r) => r.timestamp);
    const readingOrder = readings.map((r) => r.timestamp);
    groupByPrescriptionPeriod([period({ revision: 1 })], rows, readings);
    expect(rows.map((r) => r.timestamp)).toEqual(rowOrder);
    expect(readings.map((r) => r.timestamp)).toEqual(readingOrder);
  });

  it('and the group does not exist at all when nothing is unplaceable', () => {
    const groups = groupByPrescriptionPeriod(
      [period({ revision: 1 })],
      [dose(1, AUG_18 + DAY)],
      [reading(AUG_18 + DAY)],
    );
    expect(groups.every((group) => group.period !== null)).toBe(true);
    expect(groups).toHaveLength(1);
  });
});

describe('§7.3 tombstones are absent from the readable export', () => {
  it('never appear as a dose, and never in a count', () => {
    const rows: LogRow[] = [dose(1, AUG_18 + DAY), tombstone(AUG_18 + DAY), tombstone(AUG_18 + DAY)];
    const groups = groupByPrescriptionPeriod([period({ revision: 1 })], rows, []);
    expect(groups[0]?.doses).toHaveLength(1);
    expect(countsFor(groups[0]!)).toEqual({ doses: 1, readings: 0 });
    // And they do not fall through into the unplaceable group either — a
    // tombstone carries no revision, so "no prescription accounts for it" would
    // be the wrong reading of an absence that was recorded on purpose.
    expect(groups).toHaveLength(1);
    expect(groups.some((group) => group.period === null)).toBe(false);
  });
});

describe('§7.7.1 the rendered shape', () => {
  it('bounds each period half-open: a reading AT a boundary belongs to the NEW one', () => {
    // The instant a prescription changes belongs to the prescription that
    // starts, not the one that ends. Anything else double-counts the boundary.
    const history = [
      period({ revision: 1, changedAtMs: AUG_18 }),
      period({ revision: 2, changedAtMs: SEP_3 }),
    ];
    const atBoundary = groupByPrescriptionPeriod(history, [], [reading(SEP_3)]);
    expect(atBoundary[0]?.readings).toHaveLength(0);
    expect(atBoundary[1]?.readings).toHaveLength(1);

    const oneBefore = groupByPrescriptionPeriod(history, [], [reading(SEP_3 - 1)]);
    expect(oneBefore[0]?.readings).toHaveLength(1);
    expect(oneBefore[1]?.readings).toHaveLength(0);
  });

  it('and a reading exactly at the FIRST period start is inside it, not an orphan', () => {
    const groups = groupByPrescriptionPeriod([period({ revision: 1 })], [], [reading(AUG_18)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.readings).toHaveLength(1);
  });

  it('bounds each period at the next one, and leaves the last open', () => {
    const history = [
      period({ revision: 1, changedAtMs: AUG_18 }),
      period({ revision: 2, changedAtMs: SEP_3 }),
    ];
    const groups = groupByPrescriptionPeriod(history, [], []);
    expect(groups[0]?.startMs).toBe(AUG_18);
    expect(groups[0]?.endMs).toBe(SEP_3);
    expect(groups[1]?.startMs).toBe(SEP_3);
    expect(groups[1]?.endMs).toBeNull();
  });

  it('does not reorder the caller\'s arrays when grouping into a period', () => {
    const rows = [dose(1, AUG_18 + 3 * DAY), dose(1, AUG_18 + DAY)];
    const readings = [reading(AUG_18 + 5 * DAY), reading(AUG_18 + 2 * DAY)];
    const rowOrder = rows.map((r) => r.timestamp);
    const readingOrder = readings.map((r) => r.timestamp);
    groupByPrescriptionPeriod([period({ revision: 1 })], rows, readings);
    expect(rows.map((r) => r.timestamp)).toEqual(rowOrder);
    expect(readings.map((r) => r.timestamp)).toEqual(readingOrder);
  });

  it('sorts rows inside a group by time', () => {
    const groups = groupByPrescriptionPeriod(
      [period({ revision: 1 })],
      [dose(1, AUG_18 + 3 * DAY), dose(1, AUG_18 + DAY)],
      [reading(AUG_18 + 5 * DAY), reading(AUG_18 + 2 * DAY)],
    );
    const doses = groups[0]?.doses ?? [];
    const readings = groups[0]?.readings ?? [];
    expect(doses[0]?.timestamp).toBeLessThan(doses[1]?.timestamp ?? 0);
    expect(readings[0]?.timestamp).toBeLessThan(readings[1]?.timestamp ?? 0);
  });

  it('counts doses and readings separately, which is what the heading prints', () => {
    // §7.7.1's example heading: "18 Aug - 2 Sep    47 doses, 6 readings"
    const groups = groupByPrescriptionPeriod(
      [period({ revision: 1 })],
      Array.from({ length: 47 }, (_, i) => dose(1, AUG_18 + i * 1000)),
      Array.from({ length: 6 }, (_, i) => reading(AUG_18 + i * 1000)),
    );
    expect(countsFor(groups[0]!)).toEqual({ doses: 47, readings: 6 });
  });

  it('is empty when there is no history at all', () => {
    expect(groupByPrescriptionPeriod([], [], [])).toEqual([]);
  });

  it('breaks a same-millisecond tie on the revision key, so renders are stable', () => {
    const a = period({ revision: 2, changedAtMs: AUG_18 });
    const b = period({ revision: 1, changedAtMs: AUG_18 });
    expect(groupByPrescriptionPeriod([a, b], [], []).map((g) => g.period?.revision)).toEqual([1, 2]);
    expect(groupByPrescriptionPeriod([b, a], [], []).map((g) => g.period?.revision)).toEqual([1, 2]);
  });

  it('does not mutate the arrays it is given', () => {
    const history = [period({ revision: 2, changedAtMs: SEP_3 }), period({ revision: 1, changedAtMs: AUG_18 })];
    const before = history.map((p) => p.revision);
    groupByPrescriptionPeriod(history, [], []);
    expect(history.map((p) => p.revision)).toEqual(before);
  });
});
