/**
 * §4.2 — the lexical grammar.
 *
 * Version 1 said "reject text and negative numbers, accept decimals", which is
 * not a specification: prefix parsing accepts "20g" as 20, "1.2.3" as 1.2 and
 * "0x10" as 0 or 16 depending on which function you reach for. The rule is a
 * whole-string match against an explicit grammar, and then a conversion.
 *
 *   ASCII-digits [ "." ASCII-digits ]
 *   leading/trailing whitespace trimmed
 *   exactly one optional period, no comma at all
 *   at most 1 integer digit beyond the field's max, at most 2 fractional digits
 *   no sign, no exponent, no hex, no Infinity, no NaN, no Unicode digits
 */

import { GRAMMAR_INTEGER_DIGIT_SLACK, MAX_FRACTIONAL_DIGITS, RANGE } from '../config.js';
import { hundredthsFromGrammarText } from './decimal.js';
import type { ParsedField } from './types.js';

export type RangedField = keyof typeof RANGE;

/** The whole string, or nothing. Anchored at both ends on purpose. */
const GRAMMAR = /^[0-9]+(?:\.[0-9]+)?$/;
/** Any decimal digit that is not ASCII 0–9 — Arabic-Indic, Devanagari, and so on. */
const NON_ASCII_DIGIT = /[\p{Nd}]/u;
const ASCII_DIGIT = /[0-9]/;
/** ASCII plus and minus, and the Unicode minus a keyboard can produce. */
const SIGN = /^[+\-−]/;

/**
 * How many integer digits the field's own hard maximum needs, plus §4.2's one
 * digit of slack — the grammar accepts one digit MORE than the range does, so a
 * mistyped `6000` is answered with "that is more digits than this can be"
 * rather than by a keypad key that silently stops responding. A key that does
 * nothing reads as broken hardware.
 *
 * EXPORTED as of the keypad fix. It was private, and the interface therefore
 * could not ask the question and carried its own flat four-digit cap instead —
 * which counted integer and fractional digits together and made `100.25` grams
 * unenterable. The rule was always right here; the interface just could not
 * reach it.
 */
export function maxIntegerDigits(field: RangedField): number {
  const [, hardMax] = RANGE[field].hard;
  return Math.floor(hardMax).toString().length + GRAMMAR_INTEGER_DIGIT_SLACK;
}

/**
 * §4.1 — the raw-state decision happens before numeric conversion, always.
 * Empty, zero, invalid and valid stay distinguishable, because `Number("")`,
 * `Number(" ")` and `Number(null)` all produce 0 and would turn a blank field
 * into a reading of zero.
 */
export function parseField(raw: string, field: RangedField): ParsedField {
  const text = raw.trim();

  if (text === '') return { state: 'empty' };

  // The comma is checked before anything else so its message is never replaced
  // by a generic one. In Pakistan the plausible comma keystroke is GROUPING —
  // "2,50" intends 250 — so reading it as a decimal separator gives 0.25 units
  // instead of 25, a hundredfold under-dose no cap catches (§4.2).
  if (text.includes(',')) return { state: 'invalid', reason: 'comma' };

  if (SIGN.test(text)) return { state: 'invalid', reason: 'signed' };

  if (!GRAMMAR.test(text)) {
    // Distinguish a non-ASCII digit form, because "type it in English digits"
    // is a different instruction from "check the number".
    if (NON_ASCII_DIGIT.test(text) && !ASCII_DIGIT.test(text)) {
      return { state: 'invalid', reason: 'non_ascii_digits' };
    }
    return { state: 'invalid', reason: 'not_a_number' };
  }

  const dotAt = text.indexOf('.');
  const intDigits = dotAt === -1 ? text : text.slice(0, dotAt);
  const fracDigits = dotAt === -1 ? '' : text.slice(dotAt + 1);

  if (fracDigits.length > MAX_FRACTIONAL_DIGITS) {
    return { state: 'invalid', reason: 'too_many_decimals' };
  }
  // A paste of the whole meter screen, or a stuck key, is rejected on length
  // before it is rejected on range — so the message is about the typing rather
  // than about the reading.
  if (intDigits.length > maxIntegerDigits(field)) {
    return { state: 'invalid', reason: 'too_long' };
  }

  const value = Number(text);
  // Stryker disable next-line all: §2.3 rule 1 requires finiteness to be
  // established independently, and this is that check. It is unreachable in
  // practice — the grammar above admits only ASCII digits with at most one
  // point, and `too_long` caps the integer part at one digit beyond the field's
  // maximum, so the string can never be long enough to overflow to Infinity.
  // Kept because "the range check will catch it" is exactly the reasoning §2.3
  // rule 1 exists to refuse: `NaN < min` and `NaN > max` are both false.
  if (!Number.isFinite(value)) return { state: 'invalid', reason: 'not_a_number' };

  const hundredths = hundredthsFromGrammarText(text);
  if (hundredths === 0) return { state: 'zero', value: 0, hundredths: 0, text };
  return { state: 'valid', value, hundredths, text };
}

/**
 * §4.5's hard range, checked separately from the grammar because they answer
 * different questions: the grammar asks whether this is a number, the range
 * asks whether it is a possible one.
 */
export function withinHardRange(value: number, field: RangedField): boolean {
  const [lo, hi] = RANGE[field].hard;
  return Number.isFinite(value) && value >= lo && value <= hi;
}

/**
 * §4.5's soft band. Outside it the value is accepted and confirmed once — it is
 * not a warning, and §10.5 requires the first confirmation a user ever sees not
 * to read like one: the physician's own target of 150 sits outside 90–140.
 */
export function withinSoftBand(value: number, field: RangedField): boolean {
  const range = RANGE[field];
  if (!('soft' in range)) return true;
  const [lo, hi] = range.soft;
  return value >= lo && value <= hi;
}

/**
 * Whether the keypad may append `key` to `current` for this field.
 *
 * This replaces a single flat cap of four digits applied to BOTH fields, which
 * counted the integer and fractional parts together and therefore made
 * `100.25` grams of carbohydrate UNENTERABLE — while §4.2's grammar accepts two
 * decimal places and `RANGE.carbs` accepts 300. The interface was narrower than
 * the specification, in a way no arithmetic test could see.
 *
 * Pure, so §13's boundary sweep and the mutation gate cover it.
 */
export function acceptsKeystroke(
  current: string,
  key: string,
  field: RangedField,
  allowFraction: boolean,
): boolean {
  const pointAt = current.indexOf('.');
  if (key === '.') return allowFraction && pointAt === -1;
  if (pointAt === -1) return current.length < maxIntegerDigits(field);
  return current.length - pointAt - 1 < MAX_FRACTIONAL_DIGITS;
}

/**
 * The value a field holds after `key` is pressed, or `null` if the keystroke is
 * refused.
 *
 * Replaces a bare "may I append?" check, because appending is not always the
 * right answer. Typing 8 into a field showing `0` should give `8`, not `08`:
 *
 *   * `08` and `0008` both parse to 8 — §4.2's grammar accepts leading zeros
 *     and `Number('0008')` is 8 — so the DOSE was never wrong.
 *   * but the field displayed `0008`, which reads as an unfamiliar number on a
 *     screen whose whole job is showing a figure clearly, and
 *   * it spent the digit budget: `0008` is four digits, the maximum for a
 *     reading, so a leading zero could make a legitimate `600` unreachable.
 *
 * The single leading zero SURVIVES a decimal point, because `0.5` needs it.
 */
export function applyKeystroke(
  current: string,
  key: string,
  field: RangedField,
  allowFraction: boolean,
): string | null {
  // A lone `0` is a placeholder for the digit about to replace it — every
  // calculator behaves this way, and the alternative is `08`.
  if (current === '0' && key !== '.') {
    return key === '0' ? null : key;
  }
  if (!acceptsKeystroke(current, key, field, allowFraction)) return null;
  return current + key;
}
