/**
 * §5 — rounding, applied to the CLAMPED TOTAL only and never to components
 * (§2.2). Every mode breaks ties half away from zero: whole unit, half unit,
 * and the hundredths quantization in `off`. One rule, stated once.
 *
 * §5.2's scope note: because the total is clamped before rounding, the final
 * dose never receives a negative number. Negative behaviour therefore affects
 * only the DISPLAY of the correction component — and it is still pinned by
 * tests here, so a future refactor cannot reorder clamp and round silently.
 */

import { HALF, HUNDREDTHS_DIGITS, HUNDREDTHS_SCALE } from '../config.js';
import { roundScaledHalfAwayFromZero } from './decimal.js';
import type { RoundingMode } from './types.js';

const WHOLE_UNIT_DIGITS = 0;
const HALF_UNIT_HUNDREDTHS = HUNDREDTHS_SCALE / HALF;

/** §2.1 rule 3 — never emit negative zero, on every quantity, not just the readout. */
function noNegativeZero(hundredths: number): number {
  return hundredths === 0 ? 0 : hundredths;
}

/**
 * Rounds a value in units to the mode's increment and returns integer
 * hundredths (§2.2's authoritative representation).
 *
 * The traps §5.2 names, and why none of them is reachable here:
 *   nearest  `Math.round(-1.5)` is -1 — it rounds toward +infinity, not away
 *            from zero. This uses the decimal rule instead, which gives -2.
 *   ceil     "up" misread as increasing magnitude would give -2 for -1.5.
 *            Toward +infinity gives -1.
 *   floor    `Math.trunc(-1.5)` is -1. Toward -infinity gives -2, and
 *            truncating a negative correction makes it LESS negative and
 *            therefore INCREASES the combined dose.
 */
export function roundToHundredths(units: number, mode: RoundingMode): number {
  if (!Number.isFinite(units)) {
    throw new RangeError('roundToHundredths received a non-finite value');
  }
  switch (mode) {
    case 'nearest':
      return noNegativeZero(
        roundScaledHalfAwayFromZero(units, WHOLE_UNIT_DIGITS) * HUNDREDTHS_SCALE,
      );
    case 'half':
      // Doubling is exact in binary, so this introduces no error of its own.
      return noNegativeZero(
        roundScaledHalfAwayFromZero(units * HALF, WHOLE_UNIT_DIGITS) * HALF_UNIT_HUNDREDTHS,
      );
    case 'ceil':
      return noNegativeZero(Math.ceil(units) * HUNDREDTHS_SCALE);
    case 'floor':
      return noNegativeZero(Math.floor(units) * HUNDREDTHS_SCALE);
    case 'off':
      return noNegativeZero(roundScaledHalfAwayFromZero(units, HUNDREDTHS_DIGITS));
  }
}

/**
 * §6.4's one-increment allowance, in hundredths, so rounding cannot make an
 * attainable maximum look impossible.
 */
export function incrementHundredths(mode: RoundingMode): number {
  switch (mode) {
    case 'nearest':
    case 'ceil':
    case 'floor':
      return HUNDREDTHS_SCALE;
    case 'half':
      return HALF_UNIT_HUNDREDTHS;
    case 'off':
      return 1;
  }
}

/**
 * §5.1 — `ceil` is gated behind a one-time acknowledgement, and the modes are
 * not neutral peers. At an insulin sensitivity factor of 30, one unit is
 * 30 mg/dL of intended movement; rounding up adds as much as a full unit on
 * EVERY dose, always toward low blood sugar. On a 20-unit meal dose that is 5%
 * and irrelevant; on a 1-unit correction it is a 100% overdose.
 */
export function modeNeedsAcknowledgement(mode: RoundingMode): boolean {
  return mode === 'ceil';
}
