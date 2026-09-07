/**
 * §7.7 and §7.7.1 — both exports, and the import that reads one of them.
 *
 * §13.3's composed cases live here, because each one is a SEQUENCE rather than a
 * value: import, then a dose, then export, then a settings change, then another
 * dose, then export again. v12's own test ran import → settings change → export
 * and passed a build that misattributed every row in between, "because no dose
 * row existed in the interval and no assertion covered a new row's stamp".
 */

import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildEnvelope, parseEnvelope, planMerge } from '../src/storage/envelope.js';
import type { Envelope } from '../src/storage/envelope.js';
import { importEnvelope } from '../src/storage/importer.js';
import { buildReadableExport, escapeHtml } from '../src/storage/readable.js';
import { openDatabase } from '../src/storage/open.js';
import { appendInjection, appendReading, commitSettings, readAll } from '../src/storage/repo.js';
import type { Injection, LogRow, Reading, Settings, Tombstone } from '../src/core/types.js';
import type { SettingsPeriod } from '../src/core/periods.js';

const KARACHI = 'Asia/Karachi';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-09-06T09:00:00Z');
const AUG_18 = Date.parse('2026-08-18T00:00:00Z');

let idb: IDBFactory;
beforeEach(() => {
  idb = new IDBFactory();
});

async function open(): Promise<IDBDatabase> {
  const outcome = await openDatabase({ indexedDB: idb, nowMs: NOW, onVersionChange: () => undefined });
  if (outcome.kind !== 'open') throw new Error(outcome.kind);
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
  basalTiming: 'early morning', personName: '',
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

const SETTINGS: Settings = {
  revision: 1,
  target: 150,
  isf: 30,
  icr: 10,
  mode: 'nearest',
  threshold: 20,
  basalName: 'Lantus',
  basalUnits: 36,
  basalTiming: 'early morning, before breakfast', personName: '',
};

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

describe('§7.7 the envelope', () => {
  it('carries a settings block AND a log block — v6 and v7 described log only', () => {
    const envelope = buildEnvelope({
      settings: SETTINGS,
      settingsHistory: [period()],
      log: [injection()],
      readings: [],
      dosingHistory: { state: 'unanswered', text: '', answeredAtMs: null },
    });
    expect(envelope.settings).toMatchObject({ target: 150, isf: 30, icr: 10 });
    // §1.3 legislated that the basal regimen must appear in it, and an
    // implementer building from §7.7 alone would have dropped it.
    expect(envelope.settings).toMatchObject({ basalName: 'Lantus', basalUnits: 36 });
    expect(envelope.log).toHaveLength(1);
  });

  it('§7.7 v14 — the block is present and EXPLICITLY EMPTY before the first commit', () => {
    const envelope = buildEnvelope({
      settings: null,
      settingsHistory: [],
      log: [],
      readings: [],
      dosingHistory: { state: 'unanswered', text: '', answeredAtMs: null },
    });
    expect(envelope.settings).toEqual({});
    expect('settings' in envelope).toBe(true);
  });

  it('omits `threshold` and `imported` from the history, on purpose', () => {
    // §7.7 [R1] — `threshold` never changes a dose value, so no consumer needs
    // its historical setting and an identical-values row would be noise.
    // `imported` is LOCAL provenance and cannot mean anything in a file.
    const envelope = buildEnvelope({
      settings: SETTINGS,
      settingsHistory: [period({ imported: true })],
      log: [],
      readings: [],
      dosingHistory: { state: 'unanswered', text: '', answeredAtMs: null },
    });
    expect(Object.keys(envelope.settingsHistory[0] ?? {}).sort()).toEqual(
      ['changedAtMs', 'icr', 'isf', 'mode', 'revision', 'target'].sort(),
    );
  });

  it('§6.7 — carries the dosing note only when ANSWERED, and never the state', () => {
    const base = { settings: SETTINGS, settingsHistory: [], log: [], readings: [] };
    const answered = buildEnvelope({
      ...base,
      dosingHistory: { state: 'answered', text: '24-25 units regardless', answeredAtMs: NOW },
    });
    expect(answered.dosingHistoryBeforeApp).toEqual({
      answeredAtMs: NOW,
      text: '24-25 units regardless',
    });

    for (const state of ['unanswered', 'declined']) {
      const other = buildEnvelope({ ...base, dosingHistory: { state, text: 'x', answeredAtMs: NOW } });
      expect(other.dosingHistoryBeforeApp, state).toBeUndefined();
      // §6.7 — `declined` does not travel, "so restoring from a file re-offers
      // the question". A refusal recorded on one install should not silence a
      // fresh one.
      expect(JSON.stringify(other), state).not.toContain('declined');
    }
  });

  it('round-trips through JSON without losing a tombstone', () => {
    const tombstone: Tombstone = { id: 'gone', timestamp: NOW - HOUR, deleted: true, deletedAtMs: NOW };
    const envelope = buildEnvelope({
      settings: SETTINGS,
      settingsHistory: [period()],
      log: [injection(), tombstone],
      readings: [{ id: 'r1', timestamp: NOW, bloodSugar: 65, note: 'felt_low' }],
      dosingHistory: { state: 'unanswered', text: '', answeredAtMs: null },
    });
    const parsed = parseEnvelope(JSON.parse(JSON.stringify(envelope)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.envelope.log).toHaveLength(2);
    expect(parsed.envelope.readings[0]?.note).toBe('felt_low');
  });
});

describe('§11.3 import validates before it commits', () => {
  it('rejects a schema from the future', () => {
    const parsed = parseEnvelope({ schemaVersion: 99, settings: {}, settingsHistory: [], log: [], readings: [] });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.problem.kind).toBe('future_schema');
  });

  it('rejects anything that is not an envelope at all', () => {
    for (const raw of [null, 42, 'text', []]) {
      expect(parseEnvelope(raw).ok, JSON.stringify(raw)).toBe(false);
    }
  });

  it('drops a log row that fails a range check rather than repairing it', () => {
    // Repairing it would invent a dose.
    const parsed = parseEnvelope({
      schemaVersion: 1,
      settings: {},
      settingsHistory: [],
      readings: [],
      log: [
        { ...injection(), carbs: 5000 },
        { ...injection({ id: 'good' }) },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.envelope.log).toHaveLength(1);
    expect(parsed.envelope.log[0]?.id).toBe('good');
  });

  it('§7.7 v24 — a TOMBSTONE is not validated against the prescription', () => {
    // "It asserts an absence; there is nothing to range-check." v23's envelope
    // required `settingsRevision` on every log row, so a valid exported
    // tombstone lacked a field the importer demanded — on exactly the restore
    // path tombstones exist to protect.
    const parsed = parseEnvelope({
      schemaVersion: 1,
      settings: {},
      settingsHistory: [],
      readings: [],
      log: [{ id: 'gone', timestamp: NOW, deleted: true, deletedAtMs: NOW }],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.envelope.log).toHaveLength(1);
    expect(parsed.envelope.log[0]).toEqual({
      id: 'gone',
      timestamp: NOW,
      deleted: true,
      deletedAtMs: NOW,
    });
  });
});

describe('§7.3 a tombstone beats a live row with the same id, in BOTH directions', () => {
  const live: Injection = injection({ id: 'shared' });
  const dead: Tombstone = { id: 'shared', timestamp: live.timestamp, deleted: true, deletedAtMs: NOW };

  function envelopeWith(log: LogRow[]): Envelope {
    return { schemaVersion: 1, settings: {}, settingsHistory: [], readings: [], log };
  }

  it('local tombstone, imported dose: the dose is NOT resurrected', () => {
    // The whole reason a tombstone travels at all: without it, import's merge
    // sees an id it does not have and adds the dose back.
    const plan = planMerge(envelopeWith([live]), {
      log: [dead],
      readings: [],
      maxHistoryRevision: null,
    });
    expect(plan.log).toHaveLength(1);
    expect(plan.log[0]).toEqual(dead);
  });

  it('local dose, imported tombstone: the deletion wins', () => {
    const plan = planMerge(envelopeWith([dead]), {
      log: [live],
      readings: [],
      maxHistoryRevision: null,
    });
    expect(plan.log).toHaveLength(1);
    expect(plan.log[0]).toEqual(dead);
  });
});

describe('§7.7 revision remapping', () => {
  it('into an EMPTY store, the imported numbers stand', () => {
    const plan = planMerge(
      {
        schemaVersion: 1,
        settings: {},
        settingsHistory: [
          { revision: 1, changedAtMs: AUG_18, target: 150, isf: 30, icr: 10, mode: 'nearest' },
          { revision: 2, changedAtMs: AUG_18 + DAY, target: 150, isf: 30, icr: 12, mode: 'nearest' },
        ],
        readings: [],
        log: [injection({ id: 'a', settingsRevision: 2 })],
      },
      { log: [], readings: [], maxHistoryRevision: null },
    );
    expect([...plan.revisionRemap.entries()]).toEqual([
      [1, 1],
      [2, 2],
    ]);
    expect((plan.log[0] as Injection).settingsRevision).toBe(2);
  });

  it('into a NON-EMPTY store, they are appended at max + 1 and every row is rewritten', () => {
    // §1.2's storage-loss flow: re-enter the settings by hand (local revisions
    // 1..k), then import the backup (carrying an unrelated 1..n). Merging by
    // number collides and attributes rows to settings that never produced them.
    const plan = planMerge(
      {
        schemaVersion: 1,
        settings: {},
        settingsHistory: [
          { revision: 1, changedAtMs: AUG_18, target: 150, isf: 30, icr: 10, mode: 'nearest' },
          { revision: 2, changedAtMs: AUG_18 + DAY, target: 150, isf: 30, icr: 12, mode: 'nearest' },
        ],
        readings: [],
        log: [injection({ id: 'a', settingsRevision: 1 }), injection({ id: 'b', settingsRevision: 2 })],
      },
      { log: [], readings: [], maxHistoryRevision: 3 },
    );
    expect([...plan.revisionRemap.entries()]).toEqual([
      [1, 4],
      [2, 5],
    ]);
    const byId = new Map(plan.log.map((row) => [row.id, row as Injection]));
    expect(byId.get('a')?.settingsRevision).toBe(4);
    expect(byId.get('b')?.settingsRevision).toBe(5);
    expect(plan.historyToAppend.map((h) => h.revision)).toEqual([4, 5]);
  });

  it('and a LOCAL row keeps its own revision through the merge', () => {
    const plan = planMerge(
      {
        schemaVersion: 1,
        settings: {},
        settingsHistory: [
          { revision: 1, changedAtMs: AUG_18, target: 150, isf: 30, icr: 10, mode: 'nearest' },
        ],
        readings: [],
        log: [],
      },
      { log: [injection({ id: 'mine', settingsRevision: 1 })], readings: [], maxHistoryRevision: 1 },
    );
    const mine = plan.log.find((row) => row.id === 'mine') as Injection | undefined;
    expect(mine?.settingsRevision).toBe(1);
  });
});

describe('§13.3 the composed case v12 lacked', () => {
  it('import, then a dose BEFORE any settings change, then a change, then another dose', async () => {
    // v12's test ran import → settings change → export and passed a build that
    // misattributed every row in the interval, because no dose row existed
    // there. The interval row is the assertion.
    const db = await open();
    const localRevision = await commitSettings(db, PRESCRIPTION);
    expect(localRevision).toBe(1);

    const imported: Envelope = {
      schemaVersion: 1,
      settings: {},
      settingsHistory: [
        { revision: 1, changedAtMs: AUG_18 - 365 * DAY, target: 150, isf: 30, icr: 8, mode: 'nearest' },
      ],
      readings: [],
      log: [injection({ id: 'old', settingsRevision: 1, timestamp: AUG_18 - 300 * DAY })],
    };
    const result = await importEnvelope(db, imported, NOW);
    expect(result.historyAppended).toBe(1);
    // §7.7 — import PROPOSES settings; it does not adopt them.
    const afterImport = await readAll(db, NOW);
    expect(afterImport.settings?.revision).toBe(1);
    expect(afterImport.settings?.icr).toBe(10);

    // The interval row: calculated and logged under the PRE-IMPORT settings.
    await appendInjection(db, injection({ id: 'interval', settingsRevision: 1 }), NOW);

    // Now a real settings change.
    const nextRevision = await commitSettings(db, { ...PRESCRIPTION, icr: 15, nowMs: NOW + HOUR });
    expect(nextRevision).toBe(3); // 1 local, 2 imported-remapped, 3 next
    await appendInjection(db, injection({ id: 'after', settingsRevision: 3 }), NOW + 2 * HOUR);

    const state = await readAll(db, NOW);
    const stamps = new Map(
      state.log.filter((row): row is Injection => !('deleted' in row)).map((row) => [row.id, row.settingsRevision]),
    );
    // The interval row keeps the PRE-IMPORT in-force revision — k, not k+n.
    expect(stamps.get('interval')).toBe(1);
    // The imported row was remapped to its new local id.
    expect(stamps.get('old')).toBe(2);
    // And the post-change row carries the fresh key.
    expect(stamps.get('after')).toBe(3);
    // No history entry was overwritten.
    expect(state.settingsHistory.map((h) => h.revision).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    db.close();
  });

  it('§7.5 — an import makes provenance suspect until this install writes a row', async () => {
    const db = await open();
    await commitSettings(db, PRESCRIPTION);
    await importEnvelope(
      db,
      { schemaVersion: 1, settings: {}, settingsHistory: [], readings: [], log: [] },
      NOW,
    );
    const afterImport = await readAll(db, NOW);
    expect(afterImport.lastImportAtMs).toBe(NOW);
    expect(afterImport.lastLocalWriteAtMs).toBeNull();

    await appendInjection(db, injection(), NOW + HOUR);
    const afterWrite = await readAll(db, NOW);
    expect(afterWrite.lastLocalWriteAtMs).toBe(NOW + HOUR);
    db.close();
  });

  it('§6.7 — an imported note is adopted into `unanswered` and never over a local one', async () => {
    const db = await open();
    const withNote: Envelope = {
      schemaVersion: 1,
      settings: {},
      settingsHistory: [],
      readings: [],
      log: [],
      dosingHistoryBeforeApp: { answeredAtMs: NOW - DAY, text: 'imported answer' },
    };
    await importEnvelope(db, withNote, NOW);
    expect((await readAll(db, NOW)).dosingHistory.text).toBe('imported answer');

    // A second import must not overwrite it — "it describes a different
    // install's history".
    await importEnvelope(
      db,
      { ...withNote, dosingHistoryBeforeApp: { answeredAtMs: NOW, text: 'someone else' } },
      NOW,
    );
    expect((await readAll(db, NOW)).dosingHistory.text).toBe('imported answer');
    db.close();
  });

  it('merges readings by id without duplicating them', async () => {
    const db = await open();
    const reading: Reading = { id: 'r1', timestamp: NOW - DAY, bloodSugar: 65 };
    await appendReading(db, reading, NOW);
    await importEnvelope(
      db,
      { schemaVersion: 1, settings: {}, settingsHistory: [], readings: [reading], log: [] },
      NOW,
    );
    expect((await readAll(db, NOW)).readings).toHaveLength(1);
    db.close();
  });
});

describe('§7.7.1 the readable export', () => {
  const input = {
    settings: SETTINGS,
    settingsHistory: [
      period({ revision: 1, changedAtMs: AUG_18, icr: 10 }),
      period({ revision: 2, changedAtMs: Date.parse('2026-09-03T00:00:00Z'), icr: 12 }),
    ],
    log: [
      injection({ id: 'd1', settingsRevision: 1, timestamp: AUG_18 + DAY }),
      injection({ id: 'd2', settingsRevision: 2, timestamp: Date.parse('2026-09-04T07:00:00Z') }),
    ],
    readings: [{ id: 'r1', timestamp: AUG_18 + 2 * DAY, bloodSugar: 65, note: 'felt_low' as const }],
    dosingNote: null,
    generatedAtMs: NOW,
    timeZone: KARACHI,
    appVersion: '0.1.0',
  };

  it('states on its face that it does not restore', () => {
    const html = buildReadableExport(input);
    expect(html).toContain('cannot be loaded back into the app');
    expect(html).toContain('Move to another phone');
  });

  it('CONTAINS NO SCRIPT AT ALL', () => {
    // §7.7.1 — "it is a document: text, a stylesheet and nothing else... the
    // whole point of the format is that it forwards through WhatsApp and opens
    // on someone else's phone, and a self-contained page that runs code is a
    // worse thing to forward than one that does not."
    const html = buildReadableExport(input);
    expect(html.toLowerCase()).not.toContain('<script');
    expect(html.toLowerCase()).not.toContain('javascript:');
    expect(html.toLowerCase()).not.toMatch(/\son[a-z]+=/);
  });

  it('groups by prescription, so no row prints under ratios that did not produce it', () => {
    const html = buildReadableExport(input);
    expect(html).toContain('1 unit covers 10 g');
    expect(html).toContain('1 unit covers 12 g');
    // Each heading appears exactly once — the two doses are in different groups.
    expect(html.split('1 unit covers 10 g')).toHaveLength(2);
  });

  it('carries the readings with no dose, which are the whole reason §7.8 exists', () => {
    const html = buildReadableExport(input);
    expect(html).toContain('reading only, no dose');
    expect(html).toContain('felt low');
    expect(html).toContain('65 mg/dL');
  });

  it('§10.4 governs its times — a lunch dose renders as 12:00 noon', () => {
    const html = buildReadableExport({
      ...input,
      log: [injection({ id: 'lunch', settingsRevision: 1, timestamp: Date.parse('2026-08-19T07:00:00Z') })],
      readings: [],
    });
    expect(html).toContain('12:00 noon');
    expect(html).not.toContain('12:00 PM');
  });

  it('ESCAPES ALL THREE free-text fields — v22 counted two', () => {
    // §1.3 states outright that the name field and the timing field are both
    // free text, and §6.7's note is the third. A rule written as "escape these
    // two" would have shipped with `basalTiming` unescaped.
    const nasty = '<script>alert(1)</script> & "quoted"';
    const html = buildReadableExport({
      ...input,
      settings: { ...SETTINGS, basalName: nasty, basalTiming: nasty },
      dosingNote: { text: nasty, answeredAtMs: NOW },
    });
    expect(html.toLowerCase()).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;quoted&quot;');
    // Three fields, three escaped renderings.
    expect(html.split('&lt;script&gt;').length - 1).toBe(3);
  });

  it('and the escaper handles every character it claims to', () => {
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
    // Ampersand first, or the entities it produces get escaped again.
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('renders an empty period rather than pretending it is not there', () => {
    const html = buildReadableExport({ ...input, log: [], readings: [] });
    expect(html).toContain('Nothing recorded in this period');
  });
});
