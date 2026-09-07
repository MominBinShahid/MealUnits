import { describe, expect, it } from 'vitest';
import { isInjection, isTombstone } from '../src/core/types.js';
import type { Injection, Tombstone } from '../src/core/types.js';

/**
 * §7.3's discriminator, in one place so no consumer invents its own. It is
 * tested directly rather than only through `.filter(isInjection)`, because a
 * predicate used as a callback is the kind of function whose own behaviour
 * nothing asserts.
 */
const injection: Injection = {
  id: 'dose-1',
  timestamp: 1_757_000_000_000,
  bloodSugar: 200,
  carbs: 60,
  units: 600,
  injectedUnits: 600,
  settingsRevision: 1,
  overrodeStacking: false,
  timingAdvice: 'before',
  advisoryFlagged: false,
};

const tombstone: Tombstone = {
  id: 'dose-1',
  timestamp: 1_757_000_000_000,
  deleted: true,
  deletedAtMs: 1_757_000_100_000,
};

describe('§7.3 the tombstone discriminator', () => {
  it('is the PRESENCE of `deleted`, and nothing else', () => {
    expect(isTombstone(tombstone)).toBe(true);
    expect(isTombstone(injection)).toBe(false);
    expect(isInjection(injection)).toBe(true);
    expect(isInjection(tombstone)).toBe(false);
  });

  it('and the two are exact complements, so no row falls between them', () => {
    for (const row of [injection, tombstone]) {
      expect(isInjection(row)).toBe(!isTombstone(row));
    }
  });

  it('a tombstone carries its id and timestamp and NOTHING above them', () => {
    // §7.3 — "the dose values do not survive, and that is the point rather than
    // an economy": §7.3 exists because deleting can mean "I never injected
    // this", and a tombstone that kept the amount would re-create the ambiguity
    // the deletion resolved.
    expect(Object.keys(tombstone).sort()).toEqual(['deletedAtMs', 'deleted', 'id', 'timestamp'].sort());
    expect('units' in tombstone).toBe(false);
    expect('injectedUnits' in tombstone).toBe(false);
    expect('settingsRevision' in tombstone).toBe(false);
    expect('bloodSugar' in tombstone).toBe(false);
    expect('carbs' in tombstone).toBe(false);
  });

  it('and it stands at the SAME id and timestamp as the dose it replaces', () => {
    expect(tombstone.id).toBe(injection.id);
    expect(tombstone.timestamp).toBe(injection.timestamp);
  });
});
