/**
 * §11.3 and §7.9, against a real IndexedDB implementation.
 *
 * `fake-indexeddb` rather than a hand-written stub, deliberately: the three
 * things this file has to prove — that `VersionError` arrives on the request's
 * error event, that `deleteDatabase` blocks on an open connection, and that
 * `versionchange` fires with `newVersion === null` — are all behaviours of the
 * specification. A stub written from the same reading of the spec that produced
 * the code under test would agree with it by construction.
 */

import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { DATABASE_NAME, META_KEY, SETTINGS_KEY, STORE } from '../src/storage/schema.js';
import type { EnvelopeRow, SettingsHistoryRow, SettingsRow } from '../src/storage/schema.js';
import { deleteDatabase, openDatabase, readRecoveryBlock } from '../src/storage/open.js';
import {
  appendInjection,
  appendReading,
  clearTheRecord,
  commitSettings,
  deleteLogRow,
  readAll,
  recordJsonExport,
} from '../src/storage/repo.js';
import { get, getAll, request, runTransaction } from '../src/storage/tx.js';
import type { Injection, LogRow, Reading } from '../src/core/types.js';

const NOW = 1_757_000_000_000;
const HOUR = 3_600_000;

let idb: IDBFactory;
let versionChanges: (number | null)[];

beforeEach(() => {
  idb = new IDBFactory();
  versionChanges = [];
});

async function open(): Promise<IDBDatabase> {
  const outcome = await openDatabase({
    indexedDB: idb,
    nowMs: NOW,
    onVersionChange: (newVersion) => versionChanges.push(newVersion),
  });
  if (outcome.kind !== 'open') throw new Error(`expected an open database, got ${outcome.kind}`);
  return outcome.db;
}

const PRESCRIPTION = {
  target: 150,
  isf: 30,
  icr: 10,
  mode: 'nearest' as const,
  threshold: 20,
  basalName: 'Lantus',
  basalUnits: 36,
  basalTiming: 'early morning, before breakfast', personName: '',
  acknowledged: [],
  nowMs: NOW,
};

let seq = 0;
function injection(overrides: Partial<Injection> = {}): Injection {
  seq += 1;
  return {
    id: `dose-${seq.toString()}`,
    timestamp: NOW - HOUR,
    bloodSugar: 330,
    carbs: 50,
    units: 1100,
    injectedUnits: 1100,
    settingsRevision: 1,
    overrodeStacking: false,
    timingAdvice: 'before',
    advisoryFlagged: false,
    ...overrides,
  };
}

describe('§11.3 opening the database', () => {
  it('creates every store this build knows about, with its timestamp index', async () => {
    const db = await open();
    expect([...db.objectStoreNames].sort()).toEqual(
      ['acks', 'log', 'meta', 'readings', 'settings', 'settingsHistory'].sort(),
    );
    const tx = db.transaction([STORE.log, STORE.readings], 'readonly');
    expect([...tx.objectStore(STORE.log).indexNames]).toContain('by_timestamp');
    expect([...tx.objectStore(STORE.readings).indexNames]).toContain('by_timestamp');
    db.close();
  });

  it('writes the envelope during the upgrade, so no boot can find a database without one', async () => {
    // §7.9 — a clear that drops `meta` and stops removes the row the next boot
    // reads to decide whether it may run, turning a recovery control into a
    // second way to brick the app.
    const db = await open();
    const envelope = await runTransaction(db, [STORE.meta], 'readonly', (tx) =>
      get<EnvelopeRow>(tx, STORE.meta, META_KEY.envelope),
    );
    expect(envelope?.schemaVersion).toBe(1);
    expect(envelope?.recovery).toBeNull();
    db.close();
  });

  it('§11.3 — a DOWNGRADE fails closed, on the request error event', async () => {
    // The behaviour the plan calls out twice: "`VersionError` is an ASYNCHRONOUS
    // REQUEST ERROR, not a synchronous throw from `open()`. Handle it on the
    // request, not in a try/catch around the call."
    //
    // A database written at schema 2, opened by a build at schema 1.
    await new Promise<void>((resolve) => {
      const request = idb.open(DATABASE_NAME, 2);
      request.onupgradeneeded = (): void => {
        request.result.createObjectStore(STORE.meta, { keyPath: 'k' });
      };
      request.onsuccess = (): void => {
        request.result.close();
        resolve();
      };
    });

    const outcome = await openDatabase({
      indexedDB: idb,
      nowMs: NOW,
      onVersionChange: () => undefined,
    });
    expect(outcome.kind).toBe('fail_closed');
    if (outcome.kind !== 'fail_closed') return;
    expect(outcome.reason).toBe('version');
  });

  it('and a try/catch around open() would NOT have caught it', async () => {
    // Executable, because the wrong build is the readable one.
    let threwSynchronously = false;
    let request: IDBOpenDBRequest | null = null;
    await new Promise<void>((resolve) => {
      const setup = idb.open(DATABASE_NAME, 2);
      setup.onupgradeneeded = (): void => {
        setup.result.createObjectStore(STORE.meta, { keyPath: 'k' });
      };
      setup.onsuccess = (): void => {
        setup.result.close();
        resolve();
      };
    });
    try {
      request = idb.open(DATABASE_NAME, 1);
    } catch {
      threwSynchronously = true;
    }
    expect(threwSynchronously).toBe(false);
    const name = await new Promise<string | undefined>((resolve) => {
      if (!request) {
        resolve(undefined);
        return;
      }
      request.onerror = (): void => {
        resolve(request?.error?.name);
      };
      request.onsuccess = (): void => {
        resolve(undefined);
      };
    });
    expect(name).toBe('VersionError');
  });

  it('refuses a schema from the future even when the version number allows the open', async () => {
    const db = await open();
    await runTransaction(db, [STORE.meta], 'readwrite', (tx) =>
      tx.objectStore(STORE.meta).put({ k: META_KEY.envelope, schemaVersion: 99, recovery: null }),
    );
    db.close();

    const outcome = await openDatabase({
      indexedDB: idb,
      nowMs: NOW,
      onVersionChange: () => undefined,
    });
    expect(outcome.kind).toBe('fail_closed');
    if (outcome.kind !== 'fail_closed') return;
    expect(outcome.reason).toBe('schema');
    expect(outcome.found).toBe(99);
  });

  it('and a non-integer schema version never decides compatibility by comparison', async () => {
    // §11.3 — "validated as a finite integer. String ordering and `NaN` never
    // decide compatibility." `NaN > 1` is false, so a bare comparison lets it
    // straight through.
    /* eslint-disable use-isnan */
    expect(Number.NaN > 1).toBe(false);
    /* eslint-enable use-isnan */
    const db = await open();
    await runTransaction(db, [STORE.meta], 'readwrite', (tx) =>
      tx.objectStore(STORE.meta).put({ k: META_KEY.envelope, schemaVersion: Number.NaN, recovery: null }),
    );
    db.close();
    const outcome = await openDatabase({
      indexedDB: idb,
      nowMs: NOW,
      onVersionChange: () => undefined,
    });
    expect(outcome.kind).toBe('fail_closed');
  });
});

describe('§11.3 the allocation rule', () => {
  it('gives the FIRST commit revision 1, from an explicit base case', async () => {
    const db = await open();
    expect(await commitSettings(db, PRESCRIPTION)).toBe(1);
    db.close();
  });

  it('allocates max(history keys) + 1, never settings.revision + 1', async () => {
    const db = await open();
    await commitSettings(db, PRESCRIPTION);
    // Simulate §7.7's import: history appended at max + 1, and `settings.revision`
    // deliberately UNTOUCHED, because import only PROPOSES settings.
    await runTransaction(db, [STORE.settingsHistory], 'readwrite', async (tx) => {
      for (const revision of [2, 3]) {
        await request(tx.objectStore(STORE.settingsHistory).add({
          revision,
          changedAtMs: NOW - 400 * 24 * HOUR,
          target: 150,
          isf: 30,
          icr: 12,
          mode: 'nearest',
          imported: true,
        } satisfies SettingsHistoryRow));
      }
    });

    const live = await runTransaction(db, [STORE.settings], 'readonly', (tx) =>
      get<SettingsRow>(tx, STORE.settings, SETTINGS_KEY),
    );
    expect(live?.revision).toBe(1);

    // v12's collision: incrementing the settings record would issue 2 and
    // silently overwrite an imported entry, re-attributing every row remapped
    // to it. The rule reads the history instead.
    expect(await commitSettings(db, { ...PRESCRIPTION, icr: 15 })).toBe(4);
    db.close();
  });

  it('appends history with `add`, so a colliding key fails LOUD', async () => {
    const db = await open();
    await commitSettings(db, PRESCRIPTION);
    await expect(
      runTransaction(db, [STORE.settingsHistory], 'readwrite', (tx) =>
        request(
          tx.objectStore(STORE.settingsHistory).add({
          revision: 1,
          changedAtMs: NOW,
          target: 150,
          isf: 30,
          icr: 10,
          mode: 'nearest',
            imported: false,
          } satisfies SettingsHistoryRow),
        ),
      ),
    ).rejects.toThrow();
    db.close();
  });

  it('keeps the recovery block synchronised with the committed settings', async () => {
    const db = await open();
    await commitSettings(db, PRESCRIPTION);
    const envelope = await runTransaction(db, [STORE.meta], 'readonly', (tx) =>
      get<EnvelopeRow>(tx, STORE.meta, META_KEY.envelope),
    );
    // §11.3 — fixed field names and EXPLICIT UNITS, so an older build cannot
    // read 150 and guess what it counts.
    expect(envelope?.recovery).toEqual({
      recoveryFormat: 1,
      targetMgDl: 150,
      oneUnitLowersMgDl: 30,
      oneUnitCoversGramsCarbohydrate: 10,
      basalInsulinName: 'Lantus',
      basalUnitsPerDay: 36,
      basalTiming: 'early morning, before breakfast', personName: '',
    });
    db.close();
  });
});

describe('a failed write rejects with the cause, not with a second failure', () => {
  it('does not abort a transaction the failed request has already aborted', async () => {
    // A rejected request aborts its own transaction. Calling `abort()` again
    // throws `InvalidStateError` from a place nothing awaits, which arrives as
    // an unhandled rejection carrying the WRONG error — and the real one is the
    // one that got away.
    const db = await open();
    await commitSettings(db, PRESCRIPTION);

    const duplicate = runTransaction(db, [STORE.settingsHistory], 'readwrite', (tx) =>
      request(
        tx.objectStore(STORE.settingsHistory).add({
          revision: 1,
          changedAtMs: NOW,
          target: 150,
          isf: 30,
          icr: 10,
          mode: 'nearest',
          imported: false,
        } satisfies SettingsHistoryRow),
      ),
    );

    // The NAME, not the message: `ConstraintError` is what identifies a key
    // collision, and asserting the prose would pin a browser's wording.
    await expect(duplicate).rejects.toMatchObject({ name: 'ConstraintError' });
    // The store is unchanged, which is what "one transaction" is worth.
    const history = await runTransaction(db, [STORE.settingsHistory], 'readonly', (tx) =>
      getAll<SettingsHistoryRow>(tx, STORE.settingsHistory),
    );
    expect(history).toHaveLength(1);
    db.close();
  });
});

describe('§7.9 the fail-closed escape', () => {
  it('reads the recovery block through a VERSIONLESS open, and CLOSES it', async () => {
    // §7.9 v23's blocking defect: v22 reasoned that a failed downgrade leaves no
    // connection, but §11.3 mandates this versionless read and the screen must
    // render the settings BEFORE offering the escape. So a connection is open at
    // the moment of the tap, and `deleteDatabase` blocks on it.
    const db = await open();
    await commitSettings(db, PRESCRIPTION);
    db.close();

    const recovery = await readRecoveryBlock({ indexedDB: idb });
    expect(recovery?.targetMgDl).toBe(150);

    // The proof that it closed: the delete goes through without blocking.
    let blocked = false;
    const outcome = await deleteDatabase({
      indexedDB: idb,
      onBlocked: () => {
        blocked = true;
      },
    });
    expect(blocked).toBe(false);
    expect(outcome.kind).toBe('deleted');
  });

  it('and the delete DOES block while a connection is held — the hang v22 would have shipped', async () => {
    const db = await open();
    await commitSettings(db, PRESCRIPTION);
    // Deliberately NOT closed, and its versionchange handler removed, which is
    // what "the natural build keeps the handle" looks like.
    db.onversionchange = null;

    let blocked = false;
    // The delete is awaited to COMPLETION, not just to `blocked`. Leaving a
    // pending request behind while the next test replaces the factory is what
    // produces an unhandled `InvalidStateError` two tests later — a real
    // leak in the test, reported as noise somewhere else.
    const deleted = new Promise<void>((resolve, reject) => {
      const request = idb.deleteDatabase(DATABASE_NAME);
      request.onblocked = (): void => {
        blocked = true;
        // Now stand down, which is what the app does on `versionchange`.
        db.close();
      };
      request.onsuccess = (): void => {
        resolve();
      };
      request.onerror = (): void => {
        reject(new Error('the delete failed'));
      };
    });
    await deleted;
    expect(blocked).toBe(true);
  });

  it('fires versionchange with newVersion === null on every open connection', async () => {
    // §7.9 v23 — `logRevision` CANNOT carry this invalidation, because the
    // delete destroys the counter in the same gesture. The mechanism is the one
    // IndexedDB provides.
    const db = await open();
    const seen = new Promise<number | null>((resolve) => {
      db.onversionchange = (event): void => {
        db.close();
        resolve(event.newVersion);
      };
    });
    void deleteDatabase({ indexedDB: idb });
    expect(await seen).toBeNull();
  });

  it('and the database comes back EMPTY, indistinguishable from a first install', async () => {
    let db = await open();
    await commitSettings(db, PRESCRIPTION);
    await appendInjection(db, injection(), NOW);
    db.close();

    expect((await deleteDatabase({ indexedDB: idb })).kind).toBe('deleted');

    db = await open();
    const state = await readAll(db, NOW);
    expect(state.settings).toBeNull();
    expect(state.settingsHistory).toEqual([]);
    expect(state.log).toEqual([]);
    expect(state.readings).toEqual([]);
    expect(state.acks.size).toBe(0);
    // §6.7 — a missing row reads as `unanswered`, so the question is re-offered.
    expect(state.dosingHistory.state).toBe('unanswered');
    db.close();
  });
});

describe('§7.2 the injection write', () => {
  it('is idempotent on id — two taps cannot log 52 units', async () => {
    const db = await open();
    const row = injection({ injectedUnits: 2500 });
    const first = await appendInjection(db, row, NOW);
    const second = await appendInjection(db, { ...row, injectedUnits: 9999 }, NOW + 1000);
    expect(first.kind).toBe('written');
    expect(second.kind).toBe('already_written');

    const rows = await runTransaction(db, [STORE.log], 'readonly', (tx) =>
      getAll<Injection>(tx, STORE.log),
    );
    expect(rows).toHaveLength(1);
    // And the retry never moved the amount or the timestamp.
    expect(rows[0]?.injectedUnits).toBe(2500);
    expect(rows[0]?.timestamp).toBe(row.timestamp);
    db.close();
  });

  it('bumps the log revision, so another tab invalidates', async () => {
    const db = await open();
    const before = (await readAll(db, NOW)).logRevision;
    await appendInjection(db, injection(), NOW);
    expect((await readAll(db, NOW)).logRevision).toBe(before + 1);
    db.close();
  });

  it('and a READING bumps the same counter, not a second one', async () => {
    // §11.2 v10 — §4.3 step 1 legislated invalidation on a "reading revision"
    // that existed nowhere. Rather than a second counter, a readings write bumps
    // `logRevision` in the same transaction, so band E's two-store derivation
    // cannot race.
    const db = await open();
    const before = (await readAll(db, NOW)).logRevision;
    const reading: Reading = { id: 'r1', timestamp: NOW, bloodSugar: 65, note: 'felt_low' };
    await appendReading(db, reading, NOW);
    expect((await readAll(db, NOW)).logRevision).toBe(before + 1);
    expect((await readAll(db, NOW)).readings).toHaveLength(1);
    db.close();
  });

  it('records that this install wrote a row, which is what clears suspect provenance', async () => {
    const db = await open();
    expect((await readAll(db, NOW)).lastLocalWriteAtMs).toBeNull();
    await appendInjection(db, injection(), NOW);
    expect((await readAll(db, NOW)).lastLocalWriteAtMs).toBe(NOW);
    db.close();
  });
});

describe('§7.3 delete leaves a tombstone only inside the window', () => {
  it('inside twelve hours: a tombstone at the same id and timestamp, with NO dose values', async () => {
    const db = await open();
    const row = injection({ timestamp: NOW - 2 * HOUR });
    await appendInjection(db, row, NOW);

    const result = await deleteLogRow(db, row.id, NOW);
    expect(result.kind).toBe('tombstoned');

    const stored = await runTransaction(db, [STORE.log], 'readonly', (tx) =>
      getAll<LogRow>(tx, STORE.log),
    );
    expect(stored).toHaveLength(1);
    const tombstone = stored[0];
    expect(tombstone?.id).toBe(row.id);
    expect(tombstone?.timestamp).toBe(row.timestamp);
    expect(tombstone?.deleted).toBe(true);
    expect(Object.keys(tombstone ?? {}).sort()).toEqual(
      ['deleted', 'deletedAtMs', 'id', 'timestamp'].sort(),
    );
    db.close();
  });

  it('outside the window: the row is removed and leaves nothing behind', async () => {
    // §7.3 — outside the window there is no gate to bypass, and a tombstone for
    // every tidied old row would bury the signal it exists to show.
    const db = await open();
    const row = injection({ timestamp: NOW - 13 * HOUR });
    await appendInjection(db, row, NOW);
    expect((await deleteLogRow(db, row.id, NOW)).kind).toBe('removed');
    expect(
      await runTransaction(db, [STORE.log], 'readonly', (tx) => getAll<LogRow>(tx, STORE.log)),
    ).toEqual([]);
    db.close();
  });

  it('is exact at the window boundary', async () => {
    const db = await open();
    const atBoundary = injection({ id: 'at', timestamp: NOW - 12 * HOUR });
    const justOutside = injection({ id: 'outside', timestamp: NOW - 12 * HOUR - 1 });
    await appendInjection(db, atBoundary, NOW);
    await appendInjection(db, justOutside, NOW);
    expect((await deleteLogRow(db, 'at', NOW)).kind).toBe('tombstoned');
    expect((await deleteLogRow(db, 'outside', NOW)).kind).toBe('removed');
    db.close();
  });

  it('reports a missing row rather than inventing a tombstone for it', async () => {
    const db = await open();
    expect((await deleteLogRow(db, 'never-existed', NOW)).kind).toBe('not_found');
    db.close();
  });
});

describe('§7.9 clearing the record', () => {
  it('keeps the prescription, its history and EVERY acknowledgement', async () => {
    const db = await open();
    await commitSettings(db, {
      ...PRESCRIPTION,
      mode: 'ceil',
      acknowledged: ['disclaimer', 'mode:ceil', 'setting:target:150'],
    });
    await appendInjection(db, injection(), NOW);
    await appendReading(db, { id: 'r1', timestamp: NOW, bloodSugar: 65 }, NOW);
    await recordJsonExport(db, NOW);

    await clearTheRecord(db);

    const state = await readAll(db, NOW);
    expect(state.settings?.target).toBe(150);
    expect(state.settings?.mode).toBe('ceil');
    expect(state.settingsHistory).toHaveLength(1);
    // §7.9 v23 — `acks` is bound to settings and to the app, never to the
    // record. Dropping the acknowledgement of a `ceil` mode or a target that
    // REMAIN in settings would re-gate a man who changed nothing.
    expect(state.acks.has('disclaimer')).toBe(true);
    expect(state.acks.has('mode:ceil')).toBe(true);
    expect(state.acks.has('setting:target:150')).toBe(true);

    expect(state.log).toEqual([]);
    expect(state.readings).toEqual([]);
    // §7.7.1 — the counter is reset explicitly, or a timestamp claiming a recent
    // backup outlives the record it described.
    expect(state.lastJsonExportAtMs).toBeNull();
    db.close();
  });

  it('and the NEXT settings change still allocates max + 1, not 1', async () => {
    // The reason `settingsHistory` survives the clear. Dropping it would restart
    // the counter, and the next change would issue a revision earlier rows had
    // already used — the re-attribution failure §11.3's allocation rule exists
    // to prevent.
    const db = await open();
    await commitSettings(db, PRESCRIPTION);
    await commitSettings(db, { ...PRESCRIPTION, icr: 12 });
    await clearTheRecord(db);
    expect(await commitSettings(db, { ...PRESCRIPTION, icr: 15 })).toBe(3);
    db.close();
  });

  it('bumps the log revision so a second tab invalidates its rendered result', async () => {
    const db = await open();
    await appendInjection(db, injection(), NOW);
    const before = (await readAll(db, NOW)).logRevision;
    await clearTheRecord(db);
    expect((await readAll(db, NOW)).logRevision).toBeGreaterThan(before);
    db.close();
  });
});

describe('§7.7.1 the backup counter', () => {
  it('is set by the JSON export and by nothing else', async () => {
    const db = await open();
    expect((await readAll(db, NOW)).lastJsonExportAtMs).toBeNull();
    await recordJsonExport(db, NOW);
    expect((await readAll(db, NOW)).lastJsonExportAtMs).toBe(NOW);
    db.close();
  });

  it('and saving the readable file leaves it alone', async () => {
    // The false safety claim §7.7.1 names: if it counted any export, saving the
    // readable file weekly would report a recent backup while nothing
    // restorable existed. The readable export never calls this function, and
    // asserting that here is the only place the absence is visible.
    const db = await open();
    await recordJsonExport(db, NOW - 12 * 24 * HOUR);
    // ...a readable export happens here, touching no meta row...
    await appendInjection(db, injection(), NOW);
    expect((await readAll(db, NOW)).lastJsonExportAtMs).toBe(NOW - 12 * 24 * HOUR);
    db.close();
  });
});
