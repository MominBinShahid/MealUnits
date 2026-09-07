/**
 * A promise wrapper over IndexedDB requests, and nothing more.
 *
 * §11.3 chose IndexedDB over Web Locks for a reason this file has to preserve:
 * "Web Locks would serialise this, but it is a CONVENTION — it only works if
 * every writer takes the lock, and a single path that forgets restores the race
 * with no error. IndexedDB serialises overlapping read-write transactions in the
 * store itself: correctness by construction rather than by discipline."
 *
 * So every helper here takes a transaction rather than opening one, and the
 * callers below assemble a whole write inside a single `runTransaction`. A
 * helper that opened its own transaction would hand the discipline back.
 */

export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = (): void => {
      resolve(req.result);
    };
    req.onerror = (): void => {
      reject(req.error ?? new Error('The store refused the request.'));
    };
  });
}

/**
 * Runs `work` inside one transaction and resolves when the TRANSACTION
 * completes, not when the last request succeeds. The difference matters: a
 * request can succeed and the transaction still abort, and §7.2 requires the
 * "I injected" row to be verified rather than assumed.
 */
export function runTransaction<T>(
  db: IDBDatabase,
  stores: readonly string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction([...stores], mode);
    } catch (cause: unknown) {
      reject(cause instanceof Error ? cause : new Error(String(cause)));
      return;
    }

    let result: T;
    let settled = false;

    tx.oncomplete = (): void => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    tx.onerror = (event): void => {
      if (!settled) {
        settled = true;
        // The error event BUBBLES from the failing request to the transaction,
        // so `event.target` is the request and its `.error` is the specific
        // cause — a `ConstraintError` from a colliding key, say. Rejecting with
        // the transaction's own error first and this second matters: §11.3
        // appends history with `add` rather than `put` precisely "so any future
        // allocation bug FAILS LOUD instead of silently rewriting provenance",
        // and "The write did not complete" is not loud, it is anonymous.
        const source = event.target as IDBRequest | null;
        reject(tx.error ?? source?.error ?? new Error('The write did not complete.'));
      }
    };
    tx.onabort = (): void => {
      if (!settled) {
        settled = true;
        reject(tx.error ?? new Error('The write was abandoned.'));
      }
    };

    void (async (): Promise<void> => {
      try {
        result = await work(tx);
      } catch (cause: unknown) {
        if (!settled) {
          settled = true;
          reject(cause instanceof Error ? cause : new Error(String(cause)));
        }
        // A REQUEST that rejects has already aborted the transaction, so this
        // `abort()` would be a second one — and IndexedDB answers that with an
        // `InvalidStateError` thrown from a place nothing is awaiting. It
        // surfaces as an unhandled rejection carrying the WRONG error, which is
        // worse than silence: the real failure is the one that got away.
        //
        // §11.3's own reason applies — "a store clear needs a transaction, and
        // the absence of one is what the state IS". The same holds here: the
        // absence of an active transaction is what a failed request leaves
        // behind, and asking it to abort is asking the wrong question.
        try {
          tx.abort();
        } catch {
          // Already finished. The rejection above carries the cause.
        }
      }
    })();
  });
}

export function getAll<T>(tx: IDBTransaction, store: string): Promise<T[]> {
  return request(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}

export function get<T>(tx: IDBTransaction, store: string, key: IDBValidKey): Promise<T | undefined> {
  return request(tx.objectStore(store).get(key) as IDBRequest<T | undefined>);
}

export function put(tx: IDBTransaction, store: string, value: unknown): Promise<IDBValidKey> {
  return request(tx.objectStore(store).put(value));
}

/**
 * §11.3 — history entries are appended with `add`, NEVER `put`, "so any future
 * allocation bug fails loud instead of silently rewriting provenance".
 */
export function add(tx: IDBTransaction, store: string, value: unknown): Promise<IDBValidKey> {
  return request(tx.objectStore(store).add(value));
}

export function remove(tx: IDBTransaction, store: string, key: IDBValidKey): Promise<undefined> {
  return request(tx.objectStore(store).delete(key));
}

export function clear(tx: IDBTransaction, store: string): Promise<undefined> {
  return request(tx.objectStore(store).clear());
}

/**
 * The largest key in a store, read INSIDE the caller's transaction. §11.3's
 * allocation rule turns on that word: the next `revision` is
 * `max(settingsHistory keys) + 1`, "read inside the same transaction — NEVER by
 * incrementing the value stored on the settings record."
 */
export function maxKey(tx: IDBTransaction, store: string): Promise<number | null> {
  return new Promise<number | null>((resolve, reject) => {
    const cursor = tx.objectStore(store).openKeyCursor(null, 'prev');
    cursor.onsuccess = (): void => {
      const found = cursor.result;
      if (found === null) {
        resolve(null);
        return;
      }
      const key = found.key;
      resolve(typeof key === 'number' ? key : null);
    };
    cursor.onerror = (): void => {
      reject(cursor.error ?? new Error('The prescription history could not be read.'));
    };
  });
}
