import { describe, expect, it } from 'vitest';
import {
  formatHundredths,
  hundredthsFromGrammarText,
  roundScaledHalfAwayFromZero,
  toHundredths,
  toPlainDecimal,
} from '../src/core/decimal.js';

describe('§2.3 the scaling trap this module exists to avoid', () => {
  it('documents the trap by demonstrating it, so the reason is executable', () => {
    // §2.3's own worked example, measured rather than remembered.
    expect(1.005 * 100).toBe(100.49999999999999);
    expect(Math.round(1.005 * 100)).toBe(100);
    // And a second, because 1.005 alone could look like a curiosity.
    expect(8.575 * 100).toBe(857.4999999999999);
    expect(Math.round(8.575 * 100)).toBe(857);
  });

  it('measures how often the two rules disagree, instead of asserting "rarely"', () => {
    // Every value in (0, 100) whose shortest decimal has exactly three places.
    // The scaled rule is `Math.round(x * 100)`; the decimal rule is what this
    // module implements. §5.3 quotes 381 disagreements per 100,000 for a
    // different pair of methods; this is the pair that actually applies here.
    let disagreements = 0;
    for (let i = 1; i < 100000; i++) {
      const x = i / 1000;
      const text = String(x);
      const dot = text.indexOf('.');
      if (dot === -1 || text.length - dot - 1 !== 3) continue;
      const lastDigit = Number(text.charAt(text.length - 1));
      const decimalRuleHundredths =
        Number(text.slice(0, text.length - 1).replace('.', '')) + (lastDigit >= 5 ? 1 : 0);
      if (Math.round(x * 100) !== decimalRuleHundredths) disagreements += 1;
    }
    expect(disagreements).toBe(572);
  });

  it('and the decimal rule is the one that matches the arithmetic on paper', () => {
    // 0.145 is the smallest disagreement. On paper it is 0.15; scaling gives
    // 14.499999999999998, which Math.round takes to 0.14.
    expect(0.145 * 100).toBe(14.499999999999998);
    expect(roundScaledHalfAwayFromZero(0.145, 2)).toBe(15);
  });

  it('§5.2 pins the answer: off mode turns -1.495 into -1.50', () => {
    // Scaling by 100 and rounding would give -1.49. The plan states -1.50, so
    // the decimal representation is what gets rounded.
    expect(roundScaledHalfAwayFromZero(-1.495, 2)).toBe(-150);
  });

  it('§2.2 ties break half away from zero at every precision', () => {
    expect(roundScaledHalfAwayFromZero(1.005, 2)).toBe(101);
    expect(roundScaledHalfAwayFromZero(1.125, 2)).toBe(113);
    expect(roundScaledHalfAwayFromZero(-1.125, 2)).toBe(-113);
    expect(roundScaledHalfAwayFromZero(1.495, 2)).toBe(150);
    expect(roundScaledHalfAwayFromZero(1.5, 0)).toBe(2);
    expect(roundScaledHalfAwayFromZero(-1.5, 0)).toBe(-2);
    expect(roundScaledHalfAwayFromZero(2.5, 0)).toBe(3);
    expect(roundScaledHalfAwayFromZero(-2.5, 0)).toBe(-3);
    expect(roundScaledHalfAwayFromZero(0.5, 0)).toBe(1);
    expect(roundScaledHalfAwayFromZero(-0.5, 0)).toBe(-1);
  });

  it('differs from Math.round on exactly the case §5.2 names', () => {
    expect(Math.round(-1.5)).toBe(-1); // toward +infinity
    expect(roundScaledHalfAwayFromZero(-1.5, 0)).toBe(-2); // away from zero
  });

  it('§2.1 rule 3 — never emits negative zero', () => {
    expect(Object.is(roundScaledHalfAwayFromZero(-0.004, 2), 0)).toBe(true);
    expect(Object.is(roundScaledHalfAwayFromZero(-0.4, 0), 0)).toBe(true);
    expect(Object.is(roundScaledHalfAwayFromZero(-0, 2), 0)).toBe(true);
  });

  it('§2.3 rule 1 — a non-finite value is refused, not compared', () => {
    // The MESSAGE is asserted, not just the type. A guard that throws the wrong
    // error for the wrong reason still passes `toThrow(RangeError)`, and an
    // emptied message is indistinguishable from a working one.
    expect(() => roundScaledHalfAwayFromZero(Number.NaN, 2)).toThrow(
      /roundScaledHalfAwayFromZero received a non-finite value: NaN/,
    );
    expect(() => roundScaledHalfAwayFromZero(Number.POSITIVE_INFINITY, 2)).toThrow(
      /non-finite value: Infinity/,
    );
    expect(() => roundScaledHalfAwayFromZero(Number.NEGATIVE_INFINITY, 0)).toThrow(
      /non-finite value: -Infinity/,
    );
    expect(() => toPlainDecimal(Number.NaN)).toThrow(
      /toPlainDecimal received a non-finite value: NaN/,
    );
  });

  it('§2.3 rule 2 — an unsafe integer is refused rather than silently wrong', () => {
    expect(() => roundScaledHalfAwayFromZero(1e300, 2)).toThrow(
      /rounding produced an unsafe integer: 1e\+302/,
    );
  });
});

describe('toPlainDecimal expands exponent forms', () => {
  it('handles a small magnitude that String() prints with an exponent', () => {
    expect(String(1e-7)).toBe('1e-7');
    expect(toPlainDecimal(1e-7)).toEqual({
      negative: false,
      intDigits: '0',
      fracDigits: '0000001',
    });
  });

  it('is exact at the ends of the exponent form, both directions', () => {
    // JavaScript switches to exponent notation only below 1e-6 and at or above
    // 1e21, which is why `toPlainDecimal` has exactly two branches. These are
    // the values on either side of each switch.
    expect(String(1e-6)).toBe('0.000001');
    expect(String(1e-7)).toBe('1e-7');
    expect(String(999999999999999900000)).toBe('999999999999999900000');
    expect(String(1e21)).toBe('1e+21');
    expect(toPlainDecimal(1e-6)).toEqual({ negative: false, intDigits: '0', fracDigits: '000001' });
    expect(toPlainDecimal(5e-324).fracDigits.length).toBe(324);
    expect(toPlainDecimal(1e308).intDigits.length).toBe(309);
  });

  it('handles a large magnitude that String() prints with an exponent', () => {
    expect(toPlainDecimal(1e21)).toEqual({
      negative: false,
      intDigits: '1000000000000000000000',
      fracDigits: '',
    });
  });

  it('handles a mantissa with its own fraction', () => {
    expect(toPlainDecimal(1.25e-7).fracDigits).toBe('000000125');
    expect(toPlainDecimal(1.25e3)).toEqual({ negative: false, intDigits: '1250', fracDigits: '' });
  });

  it('reads negative zero as negative, so the sign is normalised deliberately', () => {
    expect(toPlainDecimal(-0).negative).toBe(true);
    expect(toPlainDecimal(0).negative).toBe(false);
  });

  it('handles a plain decimal and a plain integer', () => {
    expect(toPlainDecimal(123.456)).toEqual({
      negative: false,
      intDigits: '123',
      fracDigits: '456',
    });
    expect(toPlainDecimal(-7)).toEqual({ negative: true, intDigits: '7', fracDigits: '' });
  });
});

describe('§2.2 hundredths from a grammar-valid string, never by multiplying', () => {
  it('is exact where multiplication is not', () => {
    // 4587 of the 45001 two-decimal values in 0..450 — the reachable dose range
    // — do not survive a multiplication by 100 as an integer. Three of them:
    expect(0.07 * 100).toBe(7.000000000000001);
    expect(0.29 * 100).toBe(28.999999999999996);
    expect(4.02 * 100).toBe(401.99999999999994);
    expect(hundredthsFromGrammarText('0.07')).toBe(7);
    expect(hundredthsFromGrammarText('0.29')).toBe(29);
    expect(hundredthsFromGrammarText('4.02')).toBe(402);
  });

  it('counts them, so "most values are fine" is not the claim being made', () => {
    let inexact = 0;
    for (let i = 0; i <= 45000; i++) {
      const hundredths = i;
      const units = hundredths / 100;
      if (!Number.isInteger(units * 100)) inexact += 1;
    }
    expect(inexact).toBe(4587);
  });

  it('handles every shape the grammar admits', () => {
    expect(hundredthsFromGrammarText('0')).toBe(0);
    expect(hundredthsFromGrammarText('7')).toBe(700);
    expect(hundredthsFromGrammarText('7.5')).toBe(750);
    expect(hundredthsFromGrammarText('7.05')).toBe(705);
    expect(hundredthsFromGrammarText('600')).toBe(60_000);
    expect(hundredthsFromGrammarText('007')).toBe(700);
  });

  it('refuses more than two decimals rather than rounding them away', () => {
    expect(() => hundredthsFromGrammarText('1.234')).toThrow(
      /hundredthsFromGrammarText received more than two decimals: 1\.234/,
    );
  });

  it('refuses a value that would leave the safe integer range', () => {
    expect(() => hundredthsFromGrammarText('999999999999999999')).toThrow(
      /hundredthsFromGrammarText produced an unsafe integer: 999999999999999999/,
    );
  });
});

describe('§10.4 ISMP formatting', () => {
  it('drops the trailing zero, because 1.0 is misread as 10', () => {
    expect(formatHundredths(700)).toBe('7');
    expect(formatHundredths(100)).toBe('1');
    expect(formatHundredths(2600)).toBe('26');
  });

  it('keeps the leading zero, because .5 is misread as 5', () => {
    expect(formatHundredths(50)).toBe('0.5');
    expect(formatHundredths(5)).toBe('0.05');
    expect(formatHundredths(1)).toBe('0.01');
  });

  it('strips trailing zeros from the FRACTION only, so 10 and 100 survive', () => {
    // §10.4 warns against stripping unqualified — it corrupts 10 and 100.
    expect(formatHundredths(1000)).toBe('10');
    expect(formatHundredths(10_000)).toBe('100');
    expect(formatHundredths(4500)).toBe('45');
  });

  it('renders a mixed value to the hundredth', () => {
    expect(formatHundredths(113)).toBe('1.13');
    expect(formatHundredths(403)).toBe('4.03');
    expect(formatHundredths(1150)).toBe('11.5');
  });

  it('never signs a zero', () => {
    expect(formatHundredths(0)).toBe('0');
    expect(formatHundredths(-0)).toBe('0');
  });

  it('renders a negative correction with its sign', () => {
    expect(formatHundredths(-150)).toBe('-1.5');
    expect(formatHundredths(-267)).toBe('-2.67');
  });

  it('refuses a non-integer, because that means someone divided by 100 first', () => {
    expect(() => formatHundredths(1.5)).toThrow(
      /formatHundredths received a non-integer: 1\.5/,
    );
  });
});

describe('toHundredths', () => {
  it('quantizes a recurring quotient once, at the end', () => {
    expect(toHundredths(1 / 30)).toBe(3);
    expect(toHundredths(100 / 3)).toBe(3333);
    expect(toHundredths(-1 / 30)).toBe(-3);
  });
});
