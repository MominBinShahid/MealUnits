/**
 * `COPY.units` reaches a formatter that THROWS, and three screens feed it.
 *
 * `formatHundredths` refuses a non-integer by design — §2.2's representation is
 * an exact integer number of hundredths, and a float arriving there means some
 * caller has done the conversion by hand. `decimal.ts` says what that costs in
 * its own words: *"`0.29 * 100` is 28.999999999999996, and 4587 of the 45001
 * two-decimal values in the reachable dose range fail the same way."*
 *
 * `misc.tsx` did the multiplication by hand in three places. Under `String()`
 * that was harmless; routing them through `COPY.units` made it reachable, and
 * the worst of the three is the FAIL-CLOSED screen — the one whose entire job is
 * to show a reader their prescription when the database will not open. A throw
 * inside that render rejects `start()`, and the shell replaces the page with
 * "MealUnits could not start".
 *
 * So: the hazard is pinned here rather than the call sites, because the next
 * screen that shows a unit figure will be written by someone who has not read
 * this comment.
 */

import { describe, expect, it } from 'vitest';
import { toHundredths } from '../src/core/decimal.js';
import { COPY } from '../src/ui/copy.js';
import { HUNDREDTHS_SCALE, RANGE } from '../src/config.js';

/** Every value a basal dose or a threshold can hold, at the precision entry allows. */
function* reachable(): Generator<number> {
  const [lo, hi] = RANGE.basalUnits.hard;
  for (let whole = lo; whole <= hi; whole += 1) {
    for (let hundredth = 0; hundredth < HUNDREDTHS_SCALE; hundredth += 1) {
      const value = whole + hundredth / HUNDREDTHS_SCALE;
      if (value <= hi) yield value;
    }
  }
}

describe('a unit figure on screen', () => {
  it('survives every value the basal field accepts, through toHundredths', () => {
    for (const value of reachable()) {
      expect(() => COPY.units(toHundredths(value))).not.toThrow();
    }
  });

  /**
   * The counter-example, so this file cannot pass by testing nothing. If
   * multiplying by 100 were safe, the whole test above would be pointless.
   */
  it('and hand multiplication is what it is protecting against', () => {
    const broken = [...reachable()].filter((v) => !Number.isInteger(v * HUNDREDTHS_SCALE));
    expect(broken.length).toBeGreaterThan(0);
    const first = broken[0] ?? 0;
    expect(() => COPY.units(first * HUNDREDTHS_SCALE)).toThrow(RangeError);
  });
});
