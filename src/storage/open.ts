/**
 * §11.3's connection handling, including the two things it says are easy to get
 * wrong and hard to notice:
 *
 *   - **`VersionError` is an ASYNCHRONOUS REQUEST ERROR, not a synchronous throw
 *     from `open()`.** Handle it on the request, not in a try/catch around the
 *     call. A try/catch here compiles, reads correctly, and never fires.
 *   - **Upgrades block on open connections.** Without `versionchange` and
 *     `blocked` handlers an upgrade hangs behind a stale tab, silently.
 *
 * And §7.9's correction, which v22 got wrong in its own headline fix: a failed
 * downgrade yields no VERSIONED connection, but §11.3 mandates a separate
 * VERSIONLESS `open()` for the recovery read — so at the moment the user taps
 * "start over" there IS a connection open, and `deleteDatabase` blocks on it.
 * The natural build hangs and shows "close this app's other tabs" when no other
 * tab is the blocker.
 */

import {
  ALL_STORES,
  DATABASE_NAME,
  DATABASE_VERSION,
  META_KEY,
  STORE,
  TIMESTAMP_INDEX,
} from './schema.js';
import type { EnvelopeRow, RecoveryBlock } from './schema.js';

export type OpenOutcome =
  | { readonly kind: 'open'; readonly db: IDBDatabase }
  /**
   * §11.3 — a downgrade fails closed. The calculator refuses, and the screen
   * still renders his settings from the frozen recovery block so he is not
   * stranded without his numbers.
   */
  | { readonly kind: 'fail_closed'; readonly reason: 'version' | 'schema'; readonly found: number | null }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'error'; readonly message: string };

export interface OpenOptions {
  /** Called when another tab starts an upgrade or a delete. Close and stand down. */
  readonly onVersionChange: (newVersion: number | null) => void;
  /** Called when THIS open is held up by another tab's connection. */
  readonly onBlocked?: () => void;
  readonly indexedDB?: IDBFactory | undefined;
  readonly nowMs: number;
}

function factory(options: { readonly indexedDB?: IDBFactory | undefined }): IDBFactory {
  const idb = options.indexedDB ?? globalThis.indexedDB;
  if (!idb) throw new Error('This browser has no IndexedDB, so nothing can be stored.');
  return idb;
}

/** Creates every store and index. Runs once per version, inside `onupgradeneeded`. */
function createStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(STORE.meta)) db.createObjectStore(STORE.meta, { keyPath: 'k' });
  if (!db.objectStoreNames.contains(STORE.settings)) {
    db.createObjectStore(STORE.settings, { keyPath: 'k' });
  }
  if (!db.objectStoreNames.contains(STORE.acks)) db.createObjectStore(STORE.acks, { keyPath: 'k' });
  if (!db.objectStoreNames.contains(STORE.log)) {
    const log = db.createObjectStore(STORE.log, { keyPath: 'id' });
    log.createIndex(TIMESTAMP_INDEX, 'timestamp');
  }
  if (!db.objectStoreNames.contains(STORE.readings)) {
    const readings = db.createObjectStore(STORE.readings, { keyPath: 'id' });
    readings.createIndex(TIMESTAMP_INDEX, 'timestamp');
  }
  if (!db.objectStoreNames.contains(STORE.settingsHistory)) {
    // §11.3 — the PRIMARY KEY, which is why the allocation rule exists and why
    // history entries are appended with `add` rather than `put`.
    db.createObjectStore(STORE.settingsHistory, { keyPath: 'revision' });
  }
}

export function openDatabase(options: OpenOptions): Promise<OpenOutcome> {
  return new Promise<OpenOutcome>((resolve) => {
    const request = factory(options).open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (): void => {
      const db = request.result;
      createStores(db);
      // The envelope and the install stamp are written here so a database can
      // never exist without the row the next boot reads to decide whether it
      // may run. §7.9 names that as a way to brick the app.
      const transaction = request.transaction;
      if (transaction) {
        const meta = transaction.objectStore(STORE.meta);
        meta.put({
          k: META_KEY.envelope,
          schemaVersion: DATABASE_VERSION,
          recovery: null,
        } satisfies EnvelopeRow);
        const install = meta.get(META_KEY.install);
        install.onsuccess = (): void => {
          if (install.result === undefined) {
            meta.put({ k: META_KEY.install, installedAtMs: options.nowMs });
          }
        };
      }
    };

    // §11.3 — this fires when another tab is HOLDING a connection open at the
    // old version. Without it the open hangs with no error and no timeout.
    request.onblocked = (): void => {
      options.onBlocked?.();
      resolve({ kind: 'blocked' });
    };

    request.onerror = (): void => {
      const error = request.error;
      // The whole reason this is a handler and not a try/catch.
      if (error?.name === 'VersionError') {
        resolve({ kind: 'fail_closed', reason: 'version', found: null });
        return;
      }
      resolve({ kind: 'error', message: error?.message ?? 'The record could not be opened.' });
    };

    request.onsuccess = (): void => {
      const db = request.result;
      // Another tab wants to upgrade or delete. Close, or block it forever.
      db.onversionchange = (event): void => {
        db.close();
        options.onVersionChange(event.newVersion);
      };

      // §11.3 — one store discovers the schema, and the version is validated as
      // a FINITE INTEGER. String ordering and NaN never decide compatibility.
      const read = db.transaction(STORE.meta, 'readonly').objectStore(STORE.meta).get(META_KEY.envelope);
      read.onsuccess = (): void => {
        const envelope = read.result as EnvelopeRow | undefined;
        const found = envelope?.schemaVersion;
        if (found === undefined) {
          // A database with stores but no envelope predates the discovery row,
          // or was cleared badly. Treat it as unreadable rather than assuming.
          db.close();
          resolve({ kind: 'fail_closed', reason: 'schema', found: null });
          return;
        }
        if (!Number.isInteger(found) || found > DATABASE_VERSION) {
          db.close();
          resolve({ kind: 'fail_closed', reason: 'schema', found: Number.isFinite(found) ? found : null });
          return;
        }
        resolve({ kind: 'open', db });
      };
      read.onerror = (): void => {
        db.close();
        resolve({ kind: 'error', message: 'The record could not be read.' });
      };
    };
  });
}

/**
 * §11.3 — recovery uses a SEPARATE VERSIONLESS `open()`, restricted by
 * application logic to reading the frozen recovery block and nothing else.
 *
 * "The log and the readings are unreadable BY RULE, not by accident" (§7.9 v23):
 * an older build must never present unknown-schema numbers as verified
 * prescription settings, and that restriction — not the absence of a connection
 * — is why the fail-closed screen cannot offer an export.
 *
 * The connection is CLOSED before this resolves. §7.9 v23's blocking defect was
 * a build that kept the handle, called `deleteDatabase`, fired `blocked`, and
 * told the user to close tabs that were not the blocker.
 */
export function readRecoveryBlock(options: {
  readonly indexedDB?: IDBFactory | undefined;
}): Promise<RecoveryBlock | null> {
  return new Promise<RecoveryBlock | null>((resolve) => {
    // No version argument: this open never triggers an upgrade and never fails
    // on a downgrade.
    const request = factory(options).open(DATABASE_NAME);
    request.onerror = (): void => {
      resolve(null);
    };
    request.onblocked = (): void => {
      resolve(null);
    };
    request.onsuccess = (): void => {
      const db = request.result;
      // §7.9 v23 — this connection carries a `versionchange` handler too, so a
      // delete started in another tab is not blocked by this one either.
      db.onversionchange = (): void => {
        db.close();
      };
      if (!db.objectStoreNames.contains(STORE.meta)) {
        db.close();
        resolve(null);
        return;
      }
      const read = db.transaction(STORE.meta, 'readonly').objectStore(STORE.meta).get(META_KEY.envelope);
      read.onsuccess = (): void => {
        const envelope = read.result as EnvelopeRow | undefined;
        // Read the block, render the numbers, CLOSE, then delete.
        db.close();
        resolve(envelope?.recovery ?? null);
      };
      read.onerror = (): void => {
        db.close();
        resolve(null);
      };
    };
  });
}

export type DeleteOutcome =
  | { readonly kind: 'deleted' }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'error'; readonly message: string };

/**
 * §7.9 — "start over" is `deleteDatabase` on BOTH paths, and that is one
 * mechanism rather than two.
 *
 * The alternative — clearing an enumerated list of stores — works on the running
 * path only and carries two defects this call does not have. **A hand-enumerated
 * store list rots on the edit that changes it, silently and in the unsafe
 * direction**: the day a seventh store is added, a reset naming six leaves its
 * rows behind, so "start over" quietly does not start over and every screen it
 * touches still looks correct. And it can leave the database WITHOUT AN
 * ENVELOPE, turning the recovery control into a second way to brick the app.
 *
 * `deleteDatabase` takes no version and needs no connection, so the downgrade
 * that blocks everything else does not block it. It is scoped by database name,
 * so §11.7 is satisfied by construction — unlike `caches.keys()` and
 * `getRegistrations()`, which are origin-wide and must be filtered. The blog has
 * no rows in `MealUnits` and is untouched.
 */
export function deleteDatabase(options: {
  readonly indexedDB?: IDBFactory | undefined;
  readonly onBlocked?: (() => void) | undefined;
}): Promise<DeleteOutcome> {
  return new Promise<DeleteOutcome>((resolve) => {
    const request = factory(options).deleteDatabase(DATABASE_NAME);
    // §7.9 — it blocks on open connections exactly as an upgrade does, and the
    // app must close its OWN connection first or it blocks on itself.
    request.onblocked = (): void => {
      options.onBlocked?.();
      resolve({ kind: 'blocked' });
    };
    request.onerror = (): void => {
      resolve({ kind: 'error', message: request.error?.message ?? 'The record could not be cleared.' });
    };
    request.onsuccess = (): void => {
      resolve({ kind: 'deleted' });
    };
  });
}

/** Every store this build knows about, for callers that need to name them. */
export const STORES_IN_THIS_BUILD = ALL_STORES;
