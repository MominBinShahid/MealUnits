/**
 * §2.2's authoritative representation, and §5.3's rule that formatting is not a
 * second rounding engine.
 *
 * Everything here works on the DECIMAL representation of a double rather than
 * on the double scaled by a power of ten, and that is a deliberate choice with
 * a worked example behind it. §2.3 records that `Math.round(1.005 * 100)` is
 * 100 rather than 101, because the multiplication lands on 100.49999999999999 —
 * scaling does not make binary division exact, and it can push a value across a
 * boundary in either direction.
 *
 * §5.2 then pins the answer this module has to give: under the `off` mode,
 * -1.495 rounds to -1.50. Scaling by 100 gives exactly -149.5, and `Math.round`
 * breaks that tie toward +infinity, producing -1.49. So the plan's own worked
 * value requires rounding the decimal the number prints as.
 */

import {
  HUNDREDTHS_DIGITS,
  MAX_FRACTIONAL_DIGITS,
  ROUND_UP_FROM_DIGIT,
} from '../config.js';

const ZERO = '0';

interface PlainDecimal {
  readonly negative: boolean;
  readonly intDigits: string;
  readonly fracDigits: string;
}

/**
 * The shortest decimal that round-trips to this double, with any exponent
 * expanded. `String(1e-7)` is "1e-7" and `String(1e21)` is "1e+21"; both have to
 * become digit strings before a rounding rule can read them positionally.
 */
export function toPlainDecimal(value: number): PlainDecimal {
  if (!Number.isFinite(value)) {
    throw new RangeError(`toPlainDecimal received a non-finite value: ${String(value)}`);
  }
  const negative = value < 0 || Object.is(value, -0);
  const text = Math.abs(value).toString();

  const exponentAt = text.indexOf('e');
  if (exponentAt === -1) {
    const dotAt = text.indexOf('.');
    return dotAt === -1
      ? { negative, intDigits: text, fracDigits: '' }
      : { negative, intDigits: text.slice(0, dotAt), fracDigits: text.slice(dotAt + 1) };
  }

  const mantissa = text.slice(0, exponentAt);
  const exponent = Number(text.slice(exponentAt + 1));
  const dotAt = mantissa.indexOf('.');
  const mantissaInt = dotAt === -1 ? mantissa : mantissa.slice(0, dotAt);
  const mantissaFrac = dotAt === -1 ? '' : mantissa.slice(dotAt + 1);
  const digits = mantissaInt + mantissaFrac;
  // Where the point sits once the exponent is applied.
  const pointAt = mantissaInt.length + exponent;

  // There are only two shapes here, and that is a fact about JavaScript rather
  // than an assumption: `toString` uses exponent notation ONLY below 1e-6 or at
  // and above 1e21. So the point either falls left of every digit (pointAt <= -6)
  // or right of all of them (pointAt >= digits.length), and the "point lands
  // inside the digits" case cannot occur. Verified by scanning 200,000 random
  // magnitudes plus every extreme: 5e-324, 1e-7, 1e21, 1e308 and
  // 1.7976931348623157e308. Zero hits.
  //
  // Stryker disable next-line EqualityOperator: `exponent` is never 0 in this
  // branch — `(1e0).toString()` is "1", not "1e+0" — so `< 0` and `<= 0` cannot
  // be distinguished by any input.
  if (exponent < 0) {
    return { negative, intDigits: ZERO, fracDigits: ZERO.repeat(-pointAt) + digits };
  }
  return { negative, intDigits: digits.padEnd(pointAt, ZERO), fracDigits: '' };
}

/**
 * Rounds `value` to `decimals` places, half away from zero, and returns the
 * result already scaled to an integer — so the caller never has to divide by a
 * power of ten and reintroduce a float (§5.3).
 *
 * §2.2's tie rule, stated once and applied to every mode: whole unit, half unit
 * and the hundredths quantization in `off` all break ties half away from zero.
 */
export function roundScaledHalfAwayFromZero(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`roundScaledHalfAwayFromZero received a non-finite value: ${String(value)}`);
  }
  const { negative, intDigits, fracDigits } = toPlainDecimal(value);

  const kept = fracDigits.slice(0, decimals).padEnd(decimals, ZERO);
  // `charCodeAt` past the end is NaN, and every comparison against NaN is
  // false — which is the answer wanted when there is no next digit. Reaching
  // for `Number(charAt(...))` instead would lean on `Number("") === 0`, the
  // coercion §2.3 rule 3 bans outright.
  const nextDigit = fracDigits.charCodeAt(decimals) - ZERO.charCodeAt(0);
  const roundsUp = nextDigit >= ROUND_UP_FROM_DIGIT;

  const magnitude = Number(intDigits + kept) + (roundsUp ? 1 : 0);
  if (!Number.isSafeInteger(magnitude)) {
    // §2.3 rule 2: check Number.isSafeInteger, not merely integrality. Not
    // reachable from validated inputs — the hard ranges cap the total at 406
    // units — but the promised defence has to actually be here.
    throw new RangeError(`rounding produced an unsafe integer: ${String(magnitude)}`);
  }
  // §2.1 rule 3: never emit negative zero.
  if (magnitude === 0) return 0;
  return negative ? -magnitude : magnitude;
}

/** §2.2's representation: an exact integer number of hundredths of a unit. */
export function toHundredths(units: number): number {
  return roundScaledHalfAwayFromZero(units, HUNDREDTHS_DIGITS);
}

/**
 * Converts a string that has already passed §4.2's grammar into hundredths,
 * exactly, without ever multiplying by 100. `0.29 * 100` is 28.999999999999996,
 * and 4587 of the 45001 two-decimal values in the reachable dose range fail the
 * same way.
 */
export function hundredthsFromGrammarText(text: string): number {
  const dotAt = text.indexOf('.');
  const intDigits = dotAt === -1 ? text : text.slice(0, dotAt);
  const fracDigits = dotAt === -1 ? '' : text.slice(dotAt + 1);
  if (fracDigits.length > MAX_FRACTIONAL_DIGITS) {
    throw new RangeError(`hundredthsFromGrammarText received more than two decimals: ${text}`);
  }
  const scaled = Number(intDigits + fracDigits.padEnd(HUNDREDTHS_DIGITS, ZERO));
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError(`hundredthsFromGrammarText produced an unsafe integer: ${text}`);
  }
  return scaled;
}

/**
 * §10.4's ISMP rules, applied to an insulin quantity:
 *   - no trailing zero, because `1.0` is misread as 10
 *   - always a leading zero, because `.5` is misread as 5
 *   - negative zero normalised away (§2.1 rule 3), on EVERY displayed quantity
 *
 * The decimal point is placed textually. Dividing by 100 would hand the
 * formatter a float and make this a second rounding engine (§5.3).
 */
export function formatHundredths(hundredths: number): string {
  if (!Number.isInteger(hundredths)) {
    throw new RangeError(`formatHundredths received a non-integer: ${String(hundredths)}`);
  }
  // Computed before the digits, and used as the only place a sign is decided.
  // `-0 < 0` is false, so negative zero loses its sign here rather than being
  // caught by a second guard further down — one rule, one place.
  const sign = hundredths < 0 ? '-' : '';

  const digits = Math.abs(hundredths).toString().padStart(HUNDREDTHS_DIGITS + 1, ZERO);
  const intPart = digits.slice(0, digits.length - HUNDREDTHS_DIGITS);
  let fracPart = digits.slice(digits.length - HUNDREDTHS_DIGITS);

  // Strip trailing zeros from the FRACTION only. §10.4 warns against stripping
  // unqualified, which would corrupt `10` and `100`.
  while (fracPart.endsWith(ZERO)) fracPart = fracPart.slice(0, -1);

  return fracPart === '' ? `${sign}${intPart}` : `${sign}${intPart}.${fracPart}`;
}
