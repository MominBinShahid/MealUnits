import { describe, expect, it } from 'vitest';
import {
  countDisplayableRows,
  deriveBandEFullCardShownToday,
  deriveHistory,
  hasRowInsideWindow,
  isImplausiblyFutureDated,
} from '../src/core/history.js';
import type { HistoryContext } from '../src/core/history.js';
import type { Injection, LogRow, Reading, Tombstone } from '../src/core/types.js';

const KARACHI = 'Asia/Karachi';
const HOUR = 3_600_000;
/** 6 Sep 2026, 14:00 in Karachi. */
const NOW = Date.parse('2026-09-06T09:00:00Z');

let seq = 0;
function injection(overrides: Partial<Injection> = {}): Injection {
  seq += 1;
  return {
    id: `dose-${seq.toString()}`,
    timestamp: NOW - HOUR,
    bloodSugar: 200,
    carbs: 60,
    units: 600,
    injectedUnits: 600,
    settingsRevision: 1,
    overrodeStacking: false,
    timingAdvice: 'before',
    advisoryFlagged: false,
    ...overrides,
  };
}

function tombstone(overrides: Partial<Tombstone> = {}): Tombstone {
  seq += 1;
  return {
    id: `gone-${seq.toString()}`,
    timestamp: NOW - HOUR,
    deleted: true,
    deletedAtMs: NOW,
    ...overrides,
  };
}

function reading(overrides: Partial<Reading> = {}): Reading {
  seq += 1;
  return { id: `read-${seq.toString()}`, timestamp: NOW - HOUR, bloodSugar: 65, ...overrides };
}

const CONTEXT: HistoryContext = {
  nowMs: NOW,
  installedAtMs: NOW - 30 * 24 * HOUR,
  lastImportAtMs: null,
  lastLocalInjectionAtMs: NOW - HOUR,
  droppedStoredRows: 0,
};

describe('§7.6 the future-dated predicate', () => {
  it('tolerates an hour of forward skew and no more', () => {
    expect(isImplausiblyFutureDated(NOW + HOUR, NOW)).toBe(false);
    expect(isImplausiblyFutureDated(NOW + HOUR + 1, NOW)).toBe(true);
    expect(isImplausiblyFutureDated(NOW - HOUR, NOW)).toBe(false);
  });
});

describe('§11.2 lastDose reads the INJECTED amount', () => {
  it('takes injectedUnits, never units — the round-9 blocking finding', () => {
    const row = injection({ units: 1100, injectedUnits: 2500 });
    const derived = deriveHistory([row], CONTEXT);
    expect(derived.lastDose?.injectedHundredths).toBe(2500);
    expect(derived.lastDose?.injectedHundredths).not.toBe(1100);
  });

  it('picks the most recent usable row, not the last one in the array', () => {
    const older = injection({ timestamp: NOW - 5 * HOUR, injectedUnits: 100 });
    const newer = injection({ timestamp: NOW - 2 * HOUR, injectedUnits: 900 });
    expect(deriveHistory([newer, older], CONTEXT).lastDose?.injectedHundredths).toBe(900);
    expect(deriveHistory([older, newer], CONTEXT).lastDose?.injectedHundredths).toBe(900);
  });

  it('keeps the FIRST of two rows sharing a timestamp, rather than flipping', () => {
    // A strict `>` keeps the earlier of a tie; `>=` would keep the later. Either
    // is defensible, so the point is that it is stable across argument order —
    // an unstable tiebreak would make the stacking gate depend on store order.
    const a = injection({ timestamp: NOW - HOUR, injectedUnits: 100 });
    const b = injection({ timestamp: NOW - HOUR, injectedUnits: 900 });
    expect(deriveHistory([a, b], CONTEXT).lastDose?.injectedHundredths).toBe(100);
    expect(deriveHistory([b, a], CONTEXT).lastDose?.injectedHundredths).toBe(900);
  });

  it('skips a future-dated row when choosing, and counts it instead', () => {
    const usable = injection({ timestamp: NOW - 5 * HOUR, injectedUnits: 100 });
    const bogus = injection({ timestamp: NOW + 48 * HOUR, injectedUnits: 900 });
    const derived = deriveHistory([usable, bogus], CONTEXT);
    expect(derived.lastDose?.injectedHundredths).toBe(100);
    expect(derived.excludedTimeRecords).toBe(1);
  });

  it('§7.3 — never returns a tombstone as the last dose', () => {
    const rows: LogRow[] = [
      injection({ timestamp: NOW - 5 * HOUR, injectedUnits: 100 }),
      tombstone({ timestamp: NOW - HOUR }),
    ];
    expect(deriveHistory(rows, CONTEXT).lastDose?.injectedHundredths).toBe(100);
  });

  it('returns null on an empty log', () => {
    expect(deriveHistory([], CONTEXT).lastDose).toBeNull();
  });
});

describe('§7.5 the conditions that make provenance suspect', () => {
  it('an empty log', () => {
    expect(deriveHistory([], CONTEXT).historyProvenance).toBe('suspect');
  });

  it('and a log holding ONLY tombstones counts as empty', () => {
    // §7.3 — a tombstone is the record of an absence. A history of nothing but
    // deletions is a history with no injection in it, and reading it as
    // "trusted, no recent dose" would be §7.5's condemned false safety claim.
    const onlyDeletions: LogRow[] = [tombstone(), tombstone()];
    const derived = deriveHistory(onlyDeletions, CONTEXT);
    expect(derived.lastDose).toBeNull();
    expect(derived.historyProvenance).toBe('suspect');
  });

  /**
   * §11.3's load-time re-validation, joining §7.5's four named conditions as a
   * fifth. A row the app had to DROP is one it cannot vouch for, and the whole
   * point of §7.5 is that "no usable recent record" must never silently become
   * "no recent insulin" — which is exactly what dropping a row and saying
   * nothing would be.
   */
  it('a log the LOAD path had to prune, even though what survived looks fine', () => {
    const context: HistoryContext = { ...CONTEXT, droppedStoredRows: 1 };
    // The surviving row is ordinary and recent: nothing else here is suspect.
    expect(deriveHistory([injection()], CONTEXT).historyProvenance).toBe('trusted');
    expect(deriveHistory([injection()], context).historyProvenance).toBe('suspect');
  });

  it('a log whose newest row predates this install', () => {
    const ancient = injection({ timestamp: CONTEXT.installedAtMs - HOUR });
    expect(deriveHistory([ancient], CONTEXT).historyProvenance).toBe('suspect');
  });

  it('history just imported, with nothing written locally since', () => {
    const context: HistoryContext = {
      ...CONTEXT,
      lastImportAtMs: NOW - 2 * HOUR,
      lastLocalInjectionAtMs: null,
      droppedStoredRows: 0,
    };
    expect(deriveHistory([injection()], context).historyProvenance).toBe('suspect');
  });

  it('and stops being suspect once this install writes a row of its own', () => {
    const context: HistoryContext = {
      ...CONTEXT,
      lastImportAtMs: NOW - 2 * HOUR,
      lastLocalInjectionAtMs: NOW - HOUR,
      droppedStoredRows: 0,
    };
    expect(deriveHistory([injection()], context).historyProvenance).toBe('trusted');
  });

  it('a row excluded by §7.6', () => {
    const rows = [injection(), injection({ timestamp: NOW + 48 * HOUR })];
    expect(deriveHistory(rows, CONTEXT).historyProvenance).toBe('suspect');
  });

  it('an ordinary recent log is trusted', () => {
    expect(deriveHistory([injection()], CONTEXT).historyProvenance).toBe('trusted');
  });

  it('is exact at the install boundary — a row stamped AT it is not suspect', () => {
    const atInstall = injection({ timestamp: CONTEXT.installedAtMs });
    expect(deriveHistory([atInstall], CONTEXT).historyProvenance).toBe('trusted');
    const justBefore = injection({ timestamp: CONTEXT.installedAtMs - 1 });
    expect(deriveHistory([justBefore], CONTEXT).historyProvenance).toBe('suspect');
  });

  it('is exact at the import boundary — a local write AT the import clears it', () => {
    const atImport: HistoryContext = {
      ...CONTEXT,
      lastImportAtMs: NOW - 2 * HOUR,
      lastLocalInjectionAtMs: NOW - 2 * HOUR,
      droppedStoredRows: 0,
    };
    expect(deriveHistory([injection()], atImport).historyProvenance).toBe('trusted');
    const justBefore: HistoryContext = {
      ...CONTEXT,
      lastImportAtMs: NOW - 2 * HOUR,
      lastLocalInjectionAtMs: NOW - 2 * HOUR - 1,
      droppedStoredRows: 0,
    };
    expect(deriveHistory([injection()], justBefore).historyProvenance).toBe('suspect');
  });

  it('a log that was never imported is trusted whatever the local write says', () => {
    const neverImported: HistoryContext = {
      ...CONTEXT,
      lastImportAtMs: null,
      lastLocalInjectionAtMs: null,
      droppedStoredRows: 0,
    };
    expect(deriveHistory([injection()], neverImported).historyProvenance).toBe('trusted');
  });
});

describe('§10.5 the band E derivation reads BOTH stores', () => {
  it('finds a qualifying dose row from today', () => {
    const rows = [injection({ bloodSugar: 280 })];
    expect(deriveBandEFullCardShownToday(rows, [], NOW, KARACHI)).toBe(true);
  });

  it('finds a standalone reading from today, with no dose at all', () => {
    // §10.5's contradiction, resolved in v10: a standalone 280 at breakfast
    // CONSUMES THE DAY, so the first calculated result at lunch renders
    // compact. v9 specified log-only in one place and both stores in three.
    const readings = [reading({ bloodSugar: 280, timestamp: NOW - 6 * HOUR })];
    expect(deriveBandEFullCardShownToday([], readings, NOW, KARACHI)).toBe(true);
  });

  it('ignores a qualifying record from yesterday', () => {
    const yesterday = NOW - 24 * HOUR;
    expect(
      deriveBandEFullCardShownToday([injection({ bloodSugar: 280, timestamp: yesterday })], [], NOW, KARACHI),
    ).toBe(false);
    expect(
      deriveBandEFullCardShownToday([], [reading({ bloodSugar: 280, timestamp: yesterday })], NOW, KARACHI),
    ).toBe(false);
  });

  it('is exact at 250, in the log AND in the readings store', () => {
    expect(deriveBandEFullCardShownToday([injection({ bloodSugar: 250 })], [], NOW, KARACHI)).toBe(true);
    expect(deriveBandEFullCardShownToday([injection({ bloodSugar: 249.99 })], [], NOW, KARACHI)).toBe(false);
    expect(deriveBandEFullCardShownToday([], [reading({ bloodSugar: 250 })], NOW, KARACHI)).toBe(true);
    expect(deriveBandEFullCardShownToday([], [reading({ bloodSugar: 249.99 })], NOW, KARACHI)).toBe(false);
  });

  it('ignores a row with no reading at all', () => {
    expect(deriveBandEFullCardShownToday([injection({ bloodSugar: null })], [], NOW, KARACHI)).toBe(false);
  });

  it('EXCLUDES the row being committed, or the breakfast 280 renders compact for itself', () => {
    // §10.5, stated in v11. §13.3's case would fail a wrong ordering, but the
    // ordering is written down rather than left to be inferred from a test.
    const row = injection({ bloodSugar: 280 });
    expect(deriveBandEFullCardShownToday([row], [], NOW, KARACHI, row.id)).toBe(false);
    expect(deriveBandEFullCardShownToday([row], [], NOW, KARACHI)).toBe(true);
  });

  it('excludes a reading being committed too', () => {
    const row = reading({ bloodSugar: 280 });
    expect(deriveBandEFullCardShownToday([], [row], NOW, KARACHI, row.id)).toBe(false);
  });

  it('rolls over at LOCAL midnight, so 11:59 PM and 12:01 AM are two days', () => {
    const late = Date.parse('2026-09-05T18:59:00Z'); // 23:59 Karachi, 5 Sep
    const early = Date.parse('2026-09-05T19:01:00Z'); // 00:01 Karachi, 6 Sep
    const rows = [injection({ bloodSugar: 280, timestamp: late })];
    expect(deriveBandEFullCardShownToday(rows, [], late, KARACHI)).toBe(true);
    expect(deriveBandEFullCardShownToday(rows, [], early, KARACHI)).toBe(false);
  });

  it('§7.3 — a tombstone can never qualify, having no reading', () => {
    expect(deriveBandEFullCardShownToday([tombstone()], [], NOW, KARACHI)).toBe(false);
  });
});

describe('§7.3 tombstones are absent from every count the user is shown', () => {
  it('counts only injections', () => {
    const rows: LogRow[] = [injection(), injection(), tombstone(), tombstone(), tombstone()];
    expect(rows).toHaveLength(5);
    expect(countDisplayableRows(rows)).toBe(2);
  });
});

describe('§7.9 is there a row inside the delete-confirmation window', () => {
  it('finds one inside twelve hours and none outside', () => {
    expect(hasRowInsideWindow([injection({ timestamp: NOW - 2 * HOUR })], NOW, 12)).toBe(true);
    expect(hasRowInsideWindow([injection({ timestamp: NOW - 12 * HOUR })], NOW, 12)).toBe(true);
    expect(hasRowInsideWindow([injection({ timestamp: NOW - 13 * HOUR })], NOW, 12)).toBe(false);
    expect(hasRowInsideWindow([], NOW, 12)).toBe(false);
  });

  it('does not count a tombstone as a row worth warning about', () => {
    expect(hasRowInsideWindow([tombstone({ timestamp: NOW - HOUR })], NOW, 12)).toBe(false);
  });

  it('does not count an implausibly future-dated row', () => {
    expect(hasRowInsideWindow([injection({ timestamp: NOW + 48 * HOUR })], NOW, 12)).toBe(false);
  });
});

describe('§6.5 the baseline is derived alongside everything else', () => {
  it('travels in the same derivation, at the same log revision', () => {
    const rows = Array.from({ length: 12 }, () => injection({ carbs: 100 }));
    const derived = deriveHistory(rows, CONTEXT);
    expect(derived.carbBaseline).toBe(100);
    expect(derived.eligibleEntryCount).toBe(12);
  });
});
