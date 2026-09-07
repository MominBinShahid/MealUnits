/**
 * §11.3's cross-tab layers, and the two sequences the plan traces by hand.
 *
 * Both are "the broadcast is dropped" cases, and both were live defects: v5
 * claimed BroadcastChannel was latency-only while layers 1-2 carried
 * correctness, and v6 polled `logRevision` alone.
 */

import { describe, expect, it, vi } from 'vitest';
import { stateToken, watchForChanges } from '../src/storage/sync.js';
import type { Settings } from '../src/core/types.js';

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

describe('§11.3 layer 2 polls a TOKEN, not the log revision', () => {
  it('moves when the log revision moves', () => {
    expect(stateToken(1, SETTINGS)).not.toBe(stateToken(2, SETTINGS));
  });

  it('and when ANY calculation-affecting setting moves — the v6 defect', () => {
    // v6 polled the log revision only. Tab A displays a dose computed at
    // carbohydrate ratio 10; tab B commits 15; the broadcast is dropped; A's
    // poll sees an unchanged `logRevision`; and the stale dose stays actionable
    // until it expires.
    const base = stateToken(1, SETTINGS);
    expect(stateToken(1, { ...SETTINGS, icr: 15 })).not.toBe(base);
    expect(stateToken(1, { ...SETTINGS, isf: 50 })).not.toBe(base);
    expect(stateToken(1, { ...SETTINGS, target: 140 })).not.toBe(base);
    expect(stateToken(1, { ...SETTINGS, mode: 'half' })).not.toBe(base);
    expect(stateToken(1, { ...SETTINGS, revision: 2 })).not.toBe(base);
    // §4.3 step 1 lists the threshold explicitly, even though §7.7 keeps it out
    // of `settingsHistory`: it changes whether the dose is shown at all.
    expect(stateToken(1, { ...SETTINGS, threshold: 25 })).not.toBe(base);
  });

  it('and NOT when something that cannot change a dose moves', () => {
    // §1.3 — the basal regimen is recorded and never calculated, and §13.3
    // requires changing it to leave every dose bit-identical. A token that moved
    // on it would invalidate a correct result for no reason.
    const base = stateToken(1, SETTINGS);
    expect(stateToken(1, { ...SETTINGS, basalName: 'Toujeo' })).toBe(base);
    expect(stateToken(1, { ...SETTINGS, basalUnits: 120 })).toBe(base);
    expect(stateToken(1, { ...SETTINGS, basalTiming: 'at bedtime' })).toBe(base);
  });

  it('handles the pre-settings state without pretending it has values', () => {
    expect(stateToken(0, null)).toBe('0|none');
    expect(stateToken(0, null)).not.toBe(stateToken(1, null));
  });
});

describe('§11.3 the poll is the floor under a dropped broadcast', () => {
  function harness(): {
    watch: ReturnType<typeof watchForChanges>;
    setToken: (value: string) => void;
    changes: () => number;
    fire: () => void;
  } {
    let token = 'a';
    let changed = 0;
    let timerHandler: (() => void) | null = null;
    const watch = watchForChanges({
      readToken: () => Promise.resolve(token),
      onChanged: () => {
        changed += 1;
      },
      setInterval: (handler) => {
        timerHandler = handler;
        return 1;
      },
      clearInterval: () => {
        timerHandler = null;
      },
      addVisibilityListener: () => () => undefined,
      broadcast: () => null,
    });
    return {
      watch,
      setToken: (value) => {
        token = value;
      },
      changes: () => changed,
      fire: () => timerHandler?.(),
    };
  }

  it('reports a change the broadcast never delivered', async () => {
    const h = harness();
    h.watch.start('a');
    h.setToken('b');
    await h.watch.checkNow();
    expect(h.changes()).toBe(1);
    h.watch.dispose();
  });

  it('says nothing while the token holds', async () => {
    const h = harness();
    h.watch.start('a');
    await h.watch.checkNow();
    await h.watch.checkNow();
    expect(h.changes()).toBe(0);
    h.watch.dispose();
  });

  it('reports once, not on every poll after', async () => {
    const h = harness();
    h.watch.start('a');
    h.setToken('b');
    await h.watch.checkNow();
    await h.watch.checkNow();
    expect(h.changes()).toBe(1);
    h.watch.dispose();
  });

  it('stops watching when the result is cleared', async () => {
    const h = harness();
    h.watch.start('a');
    h.watch.stop();
    h.setToken('b');
    await h.watch.checkNow();
    expect(h.changes()).toBe(0);
    h.watch.dispose();
  });

  it('and watches nothing before a result is ever shown', async () => {
    const h = harness();
    h.setToken('b');
    await h.watch.checkNow();
    expect(h.changes()).toBe(0);
    h.watch.dispose();
  });

  it('runs on the interval §11.3 names, not on a hand-picked one', () => {
    const setInterval = vi.fn().mockReturnValue(1);
    const watch = watchForChanges({
      readToken: () => Promise.resolve('a'),
      onChanged: () => undefined,
      setInterval,
      clearInterval: () => undefined,
      addVisibilityListener: () => () => undefined,
      broadcast: () => null,
    });
    watch.start('a');
    // §11.3 layer 2 — "a short interval (~3-5 s)". The value lives in config.ts
    // and the assertion is that this reads it rather than choosing its own.
    expect(setInterval.mock.calls[0]?.[1]).toBe(4000);
    watch.dispose();
  });
});

describe('§11.3 layer 3 — the visibility recheck', () => {
  it('checks when the tab becomes visible again', async () => {
    const listener: { on: (() => void) | null } = { on: null };
    let token = 'a';
    let changed = 0;
    const watch = watchForChanges({
      readToken: () => Promise.resolve(token),
      onChanged: () => {
        changed += 1;
      },
      setInterval: () => 1,
      clearInterval: () => undefined,
      addVisibilityListener: (h) => {
        listener.on = h;
        return () => {
          listener.on = null;
        };
      },
      broadcast: () => null,
    });
    watch.start('a');
    token = 'b';
    listener.on?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(changed).toBe(1);
    watch.dispose();
  });
});
