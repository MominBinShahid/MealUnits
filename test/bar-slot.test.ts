/**
 * §10.5's one-bar slot — the ORDER, which is the part that can be wrong.
 *
 * These bars used to overlap: every one is `position: fixed; bottom: 0` and the
 * old code appended, so a second was painted over the first and hid it. That
 * had no test because the logic lived in `main.ts`, which the jsdom harness
 * never reaches. The decision is separated from the pixels so it can have one.
 */

import { describe, expect, it } from 'vitest';
import { createBarSlot, BAR_ORDER } from '../src/ui/bar-slot.js';

/** Records what was painted, in order, and hands back the removals. */
function spy(): {
  slot: ReturnType<typeof createBarSlot<string>>;
  painted: string[];
  removed: string[];
  finish: (label: string) => void;
} {
  const painted: string[] = [];
  const removed: string[] = [];
  const finishers = new Map<string, () => void>();
  const slot = createBarSlot<string>((label, gone) => {
    painted.push(label);
    finishers.set(label, gone);
    return () => { removed.push(label); };
  });
  return {
    slot,
    painted,
    removed,
    finish: (label) => { finishers.get(label)?.(); },
  };
}

describe('§10.5 — one bar at a time, by priority, the rest queued', () => {
  it('shows one bar and only one', () => {
    const { slot, painted } = spy();
    slot.raise('install', 'install');
    slot.raise('update', 'update');
    // Two raised, one on screen. Overlapping bars are the defect this exists
    // to remove: they do not stack, they cover each other.
    expect(painted.filter((_, i) => i === painted.length - 1)).toHaveLength(1);
    expect(slot.showing()).toBe('update');
  });

  it('gives the slot to the higher hazard, whichever arrived first', () => {
    for (const order of [['install', 'update', 'stuck'], ['stuck', 'update', 'install']] as const) {
      const { slot } = spy();
      for (const kind of order) slot.raise(kind, kind);
      // An unrecorded dose outranks everything: §7.2's write AND its retry
      // failed, so the stacking check cannot see a dose that was injected.
      expect(slot.showing(), order.join('>')).toBe('stuck');
    }
  });

  it('hands the slot down when the top one is answered, losing nothing', () => {
    const { slot, painted, finish } = spy();
    slot.raise('install', 'install');
    slot.raise('stuck', 'stuck');
    expect(slot.showing()).toBe('stuck');

    finish('stuck');
    // The install bar was never discarded — displaced, then restored. That is
    // the difference between a queue and a replacement, and the reason for one:
    // "your doses could be deleted" must not be lost because a dose failed to
    // save at the same moment.
    expect(slot.showing()).toBe('install');
    expect(painted).toEqual(['install', 'stuck', 'install']);
  });

  it('empties the slot when the last bar is answered', () => {
    const { slot, finish } = spy();
    slot.raise('update', 'update');
    finish('update');
    expect(slot.showing()).toBeNull();
  });

  it('does not re-raise a bar the reader has finished with', () => {
    const { slot, painted, finish } = spy();
    slot.raise('update', 'update');
    slot.raise('install', 'install');
    finish('update');
    expect(slot.showing()).toBe('install');
    finish('install');
    expect(slot.showing()).toBeNull();
    // Four paints would mean one came back after being dismissed.
    expect(painted).toEqual(['update', 'install']);
  });

  it('retires a bar the app withdraws, on screen or not', () => {
    const { slot, removed } = spy();
    slot.raise('install', 'install');
    expect(slot.showing()).toBe('install');
    // §12 retires this one when Settings is opened, which explains it in full.
    slot.retire('install');
    expect(slot.showing()).toBeNull();
    expect(removed).toEqual(['install']);

    // And retiring one that is merely queued removes it without disturbing the
    // bar on screen.
    const b = spy();
    b.slot.raise('stuck', 'stuck');
    b.slot.raise('install', 'install');
    b.slot.retire('install');
    expect(b.slot.showing()).toBe('stuck');
    expect(b.removed).toEqual([]);
  });

  /**
   * CORRECTED 2026-09-22, and the old assertion is worth recording because the
   * test's own NAME and COMMENT already described the right behaviour while the
   * expectation encoded the wrong one.
   *
   * It asserted `painted === ['first']` — the second spec queued and the painted
   * text left alone — under a name reading "replaces the spec" and a comment
   * reading "§7.2's retry updates the amount". Two things were conflated: not
   * opening a SECOND bar (right, and still asserted below) and not updating the
   * FIRST one (wrong).
   *
   * Two defects rode on it. §7.2's stuck-dose bar is re-raised when a retry
   * fails, with a different amount, and kept showing the first. And `10a`'s
   * language switch re-raises whatever is standing so its words follow the
   * choice — the install offer sat in English on an Urdu screen on the deployed
   * build, which is how this was found.
   */
  it('repaints the same bar with the new spec, without opening a second', () => {
    const { slot, painted, removed } = spy();
    slot.raise('stuck', 'first');
    slot.raise('stuck', 'second');
    // The words follow the re-raise...
    expect(painted).toEqual(['first', 'second']);
    // ...and the first one came DOWN rather than being covered by the second.
    expect(removed).toEqual(['first']);
    expect(slot.showing()).toBe('stuck');
  });

  /**
   * The other direction, which the corrected test above must not have broken: a
   * bar raised BEHIND the one on screen still only queues. Taking the showing
   * bar down to queue something lower is the replacement behaviour this slot
   * exists to prevent.
   */
  it('and a lower-priority bar raised behind it still only queues', () => {
    const { slot, painted, removed } = spy();
    slot.raise('stuck', 'stuck');
    slot.raise('install', 'install');
    expect(painted).toEqual(['stuck']);
    expect(removed).toEqual([]);
    expect(slot.showing()).toBe('stuck');
  });

  it('orders by hazard, and the order is stated rather than incidental', () => {
    expect([...BAR_ORDER]).toEqual(['stuck', 'update', 'install']);
  });
});
