/**
 * §11.3's cross-tab invalidation — four layers, correctness first.
 *
 * The switch to IndexedDB silently gave up the `storage` event, which
 * localStorage provided free and which §4.3 step 1 REQUIRES: a row added,
 * deleted or imported in another tab must invalidate a visible result here.
 * **IndexedDB has no change events.** v4 specified no replacement, so a required
 * §13.3 test had no way to pass.
 *
 * BroadcastChannel alone would be correctness-by-discipline — precisely what
 * §11.3 rejected when it chose IndexedDB over Web Locks.
 *
 * | 1 | Transactional re-verify at the write | `repo.ts` — the append and the revision bump share one transaction |
 * | 2 | Poll a `stateToken` while a result is displayed OR A CONFIRMATION IS OPEN | here |
 * | 3 | `visibilitychange` recheck | here |
 * | 4 | BroadcastChannel | here — **latency only** |
 *
 * §11.3 is careful about what these deliver, and this file does not overclaim:
 * "Layer 1 protects the WRITE. **It cannot protect the injection, because the
 * 'I injected' transaction happens after the injection — the syringe precedes
 * the tap.** Nothing in this architecture can reach backwards through that."
 */

import { POLL_INTERVAL_MS } from '../config.js';
import type { Settings } from '../core/types.js';

/**
 * §11.3 v7 — layer 2 polls a TOKEN, not `logRevision`.
 *
 * v6 polled the log revision only, so this sequence survived it: tab A displays
 * a dose computed at carbohydrate ratio 10; tab B commits ratio 15; the
 * broadcast is dropped; A's poll sees an unchanged `logRevision`; and **the
 * stale dose stays actionable until it expires.** A settings change is as
 * dose-affecting as a log append, and §4.3 step 1 already said so — layer 2
 * simply did not implement it.
 *
 * `threshold` is in the token even though §7.7 keeps it out of
 * `settingsHistory`: it never changes a dose VALUE, but §4.3 step 1 invalidates
 * on it because it changes whether the dose is shown at all.
 */
export function stateToken(logRevision: number, settings: Settings | null): string {
  if (settings === null) return `${String(logRevision)}|none`;
  return [
    logRevision,
    settings.revision,
    settings.target,
    settings.isf,
    settings.icr,
    settings.mode,
    settings.threshold,
  ]
    .map((part) => String(part))
    .join('|');
}

export const BROADCAST_CHANNEL = 'mealunits-record';

export interface SyncHost {
  /** Reads the current token. Cheap: one transaction, two rows. */
  readonly readToken: () => Promise<string>;
  /** Called when the token has moved since `start`. */
  readonly onChanged: () => void;
  readonly setInterval?: (handler: () => void, ms: number) => number;
  readonly clearInterval?: (id: number) => void;
  readonly addVisibilityListener?: (handler: () => void) => () => void;
  readonly broadcast?: () => BroadcastChannel | null;
}

export interface SyncWatch {
  /** Called by the shell when a result is revealed or a confirmation opens. */
  readonly start: (token: string) => void;
  /** Called when the result is cleared, consumed or expired. */
  readonly stop: () => void;
  /** Tells other tabs that the record moved. Latency only. */
  readonly announce: () => void;
  readonly dispose: () => void;
  /** For tests: run one poll now rather than waiting for the timer. */
  readonly checkNow: () => Promise<void>;
}

/**
 * §11.3's honest statement about what this delivers, kept next to the code:
 *
 * "A poll gives EVENTUAL invalidation on a browser timer, not an instantaneous
 * guarantee — timer intervals are not deadlines. The window between a commit in
 * one tab and its detection in another is small and bounded, and the reveal-time
 * re-verify is what narrows it furthest. That is a NARROWING, not a guarantee."
 *
 * The window is bounded above by §8.2's fifteen-minute expiry regardless.
 */
export function watchForChanges(host: SyncHost): SyncWatch {
  // `Number(...)` because Node's `setInterval` returns a `Timeout` object rather
  // than a numeric id, and the tests run there. Its `Symbol.toPrimitive` gives
  // the id, so this is the documented conversion rather than a cast that hides
  // a type error.
  const setTimer =
    host.setInterval ?? ((handler: () => void, ms: number) => Number(globalThis.setInterval(handler, ms)));
  const clearTimer = host.clearInterval ?? ((id) => { globalThis.clearInterval(id); });

  let watching: string | null = null;
  let timer: number | null = null;
  let channel: BroadcastChannel | null = null;
  let removeVisibility: (() => void) | null = null;

  const check = async (): Promise<void> => {
    if (watching === null) return;
    const current = await host.readToken();
    if (current !== watching) {
      watching = null;
      stopTimer();
      host.onChanged();
    }
  };

  function stopTimer(): void {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  // Layer 4 — post on write so other tabs invalidate immediately. A dropped
  // message costs RESPONSIVENESS, never correctness, now that layer 2 is the
  // floor. v5 asserted this was true while layers 1-2 carried correctness; they
  // did not, and a dropped broadcast left a stale dose actionable with nothing
  // to re-check it.
  const openChannel = host.broadcast ?? (() => {
    if (typeof BroadcastChannel === 'undefined') return null;
    return new BroadcastChannel(BROADCAST_CHANNEL);
  });
  channel = openChannel();
  if (channel) {
    channel.onmessage = (): void => {
      void check();
    };
  }

  // Layer 3 — coverage for tab switching, and for cross-tab SETTINGS changes,
  // which §4.3 step 1 also requires.
  const addVisibility =
    host.addVisibilityListener ??
    ((handler): (() => void) => {
      if (typeof document === 'undefined') return () => undefined;
      const listener = (): void => {
        if (document.visibilityState === 'visible') handler();
      };
      document.addEventListener('visibilitychange', listener);
      return () => {
        document.removeEventListener('visibilitychange', listener);
      };
    });
  removeVisibility = addVisibility(() => {
    void check();
  });

  return {
    start(token: string): void {
      watching = token;
      stopTimer();
      timer = setTimer(() => {
        void check();
      }, POLL_INTERVAL_MS);
    },
    stop(): void {
      watching = null;
      stopTimer();
    },
    announce(): void {
      channel?.postMessage(1);
    },
    dispose(): void {
      watching = null;
      stopTimer();
      removeVisibility?.();
      channel?.close();
      channel = null;
    },
    checkNow: check,
  };
}
