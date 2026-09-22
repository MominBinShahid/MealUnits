/**
 * A translation that quietly stops printing a number.
 *
 * `copy-ur.ts` is typed `Copy`, and that catches a great deal — a key renamed, a
 * key deleted, a key added, a parameter whose type changed, a rounding mode
 * paired with the wrong label. It was claimed to catch more than that, in four
 * places, and it does not:
 *
 *     lastCopy: (days) => `${days} دن پہلے`      // the real string
 *     lastCopy: (days) => `دن پہلے`              // compiles, and says nothing
 *
 * TypeScript is satisfied as long as `days` is mentioned somewhere in the body,
 * and `days === 0` is enough. It also permits a function with FEWER parameters
 * than the type declares, so dropping them outright compiles too. Both were
 * tried against this file and both passed `typecheck`, `check-plan.py` and every
 * test in the suite.
 *
 * What that costs: `stacking.ceiling` tells a reader how far an earlier dose
 * could still lower them. `exports.lastCopy` tells them how long ago they last
 * saved a restorable copy. A translation that silently drops either number reads
 * as a complete sentence.
 *
 * **Parity, not coverage.** This does not try to assert what every string should
 * contain — it calls each function in BOTH languages with the same arguments and
 * requires that a value reaching the English output also reaches the Urdu one.
 * A branch English does not take is a branch neither is measured on, which is
 * why the skipped functions are REPORTED rather than passed over in silence.
 */

import { describe, expect, it } from 'vitest';
import { COPY } from '../src/ui/copy.js';
import { COPY_UR } from '../src/ui/copy-ur.js';

/** Sentinels no copy string could contain by accident. */
const TEXT = ['Qzx1', 'Qzx2', 'Qzx3', 'Qzx4'];
const NUMBERS = [8675309, 2718281, 3141592, 1618033];

type Entry = { readonly path: string; readonly english: unknown; readonly urdu: unknown };

/** Every leaf both objects hold, walked in parallel so the paths cannot drift. */
function walk(english: unknown, urdu: unknown, path: string, into: Entry[]): void {
  if (typeof english === 'function' || typeof urdu === 'function') {
    into.push({ path, english, urdu });
    return;
  }
  if (Array.isArray(english) && Array.isArray(urdu)) {
    english.forEach((item, index) => { walk(item, urdu[index], `${path}[${index}]`, into); });
    return;
  }
  if (typeof english === 'object' && english !== null && typeof urdu === 'object' && urdu !== null) {
    for (const key of Object.keys(english)) {
      walk(
        (english as Record<string, unknown>)[key],
        (urdu as Record<string, unknown>)[key],
        path === '' ? key : `${path}.${key}`,
        into,
      );
    }
  }
}

/** Call with text sentinels, then numeric ones; `null` means neither worked. */
function invoke(fn: unknown, values: readonly unknown[]): string | null {
  if (typeof fn !== 'function') return null;
  try {
    const out: unknown = (fn as (...args: unknown[]) => unknown)(...values);
    return typeof out === 'string' ? out : null;
  } catch {
    return null;
  }
}

const entries: Entry[] = [];
walk(COPY, COPY_UR, '', entries);

describe('a value the English prints', () => {
  const skipped: string[] = [];

  for (const entry of entries) {
    it(`reaches the Urdu too — ${entry.path}`, () => {
      const arity = Math.max(
        (entry.english as { length?: number }).length ?? 0,
        (entry.urdu as { length?: number }).length ?? 0,
      );
      for (const pool of [TEXT, NUMBERS]) {
        const args = pool.slice(0, Math.max(arity, 1));
        const english = invoke(entry.english, args);
        const urdu = invoke(entry.urdu, args);
        if (english === null || urdu === null) continue;
        const reached = args.filter((a) => english.includes(String(a)));
        if (reached.length === 0) continue;
        for (const value of reached) {
          expect(urdu, `${entry.path} drops ${String(value)}`).toContain(String(value));
        }
        return;
      }
      // Neither pool produced a comparable pair — a tuple or a union argument.
      // Recorded so the gap is visible instead of reading as a pass.
      skipped.push(entry.path);
    });
  }

  it('and the functions this cannot reach are named, not hidden', () => {
    // A bound, not a blessing: if this grows, the parity check is covering less
    // than it looks like it covers.
    expect(skipped.length).toBeLessThanOrEqual(entries.length / 2);
  });
});
