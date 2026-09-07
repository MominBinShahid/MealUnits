import { describe, expect, it } from 'vitest';
import {
  acceptsKeystroke,
  applyKeystroke,
  maxIntegerDigits,
  parseField,
  withinHardRange,
  withinSoftBand,
} from '../src/core/parse.js';

describe('§4.1 four states, not three', () => {
  it('keeps empty distinct from zero, which JavaScript does not', () => {
    // The whole reason the raw-state decision happens before conversion.
    expect(Number('')).toBe(0);
    expect(Number(' ')).toBe(0);
    expect(Number(null)).toBe(0);
    expect(Number(undefined)).toBeNaN();

    expect(parseField('', 'carbs').state).toBe('empty');
    expect(parseField('   ', 'carbs').state).toBe('empty');
    expect(parseField('0', 'carbs').state).toBe('zero');
    expect(parseField('60', 'carbs').state).toBe('valid');
  });

  it('a legitimate zero is not falsy-replaceable', () => {
    const parsed = parseField('0', 'carbs');
    expect(parsed.state).toBe('zero');
    if (parsed.state === 'zero') {
      expect(parsed.value).toBe(0);
      expect(parsed.hundredths).toBe(0);
    }
  });

  it('treats a string of zeros and a zero decimal as zero, not as valid non-zero', () => {
    expect(parseField('0.0', 'carbs').state).toBe('zero');
    expect(parseField('00', 'carbs').state).toBe('zero');
    expect(parseField('0.00', 'carbs').state).toBe('zero');
  });
});

describe('§4.2 the grammar rejects what prefix parsing accepts', () => {
  it('documents what prefix parsing would have done', () => {
    // §4.2's table, executable. These are the reasons the rule is a
    // whole-string match rather than a conversion.
    expect(Number.parseFloat('20g')).toBe(20);
    expect(Number.parseFloat('10,5')).toBe(10);
    expect(Number.parseFloat('1.2.3')).toBe(1.2);
    expect(Number('Infinity')).toBe(Number.POSITIVE_INFINITY);
    expect(Number('0x10')).toBe(16);
    expect(Number.parseInt('0x10')).toBe(16);
  });

  it('rejects each of them', () => {
    for (const text of ['20g', '1.2.3', 'Infinity', '0x10', 'NaN', '1e3', 'abc', '5 5']) {
      const parsed = parseField(text, 'carbs');
      expect(parsed.state, text).toBe('invalid');
      if (parsed.state === 'invalid') expect(parsed.reason).toBe('not_a_number');
    }
  });

  it('rejects a comma with its OWN reason, because the message is different', () => {
    for (const text of ['10,5', '2,50', '1,234.5', ',5', '5,']) {
      const parsed = parseField(text, 'carbs');
      expect(parsed.state, text).toBe('invalid');
      if (parsed.state === 'invalid') expect(parsed.reason, text).toBe('comma');
    }
  });

  it('only treats a sign as a SIGN when it leads, not anywhere in the string', () => {
    // The sign pattern is anchored. Unanchored, "5-5" would be reported as a
    // signed value rather than as "check the number", which is the wrong
    // message for a stuck key or a range typed into one field.
    for (const text of ['5-5', '60+', '1−2']) {
      const parsed = parseField(text, 'carbs');
      expect(parsed.state, text).toBe('invalid');
      if (parsed.state === 'invalid') expect(parsed.reason, text).toBe('not_a_number');
    }
  });

  it('rejects a sign, including the Unicode minus a keyboard can produce', () => {
    for (const text of ['-5', '+5', '-0', '−5']) {
      const parsed = parseField(text, 'carbs');
      expect(parsed.state, text).toBe('invalid');
      if (parsed.state === 'invalid') expect(parsed.reason, text).toBe('signed');
    }
  });

  it('rejects non-ASCII digit forms with their own reason', () => {
    // Arabic-Indic and Devanagari. "Type it in English digits" is a different
    // instruction from "check the number".
    for (const text of ['١٢٣', '१२३']) {
      const parsed = parseField(text, 'bloodSugar');
      expect(parsed.state, text).toBe('invalid');
      if (parsed.state === 'invalid') expect(parsed.reason, text).toBe('non_ascii_digits');
    }
  });

  it('§4.2 — `5.` and `.5` are invalid, and are transient states while typing', () => {
    // Lexical rejection applies at CALCULATION time, not per keystroke. These
    // are what the field holds halfway through typing 5.5, and §10.8's
    // clear-on-change clears the RESULT, it does not validate.
    expect(parseField('5.', 'carbs').state).toBe('invalid');
    expect(parseField('.5', 'carbs').state).toBe('invalid');
    expect(parseField('5.5', 'carbs').state).toBe('valid');
  });

  it('allows at most two fractional digits', () => {
    expect(parseField('1.5', 'carbs').state).toBe('valid');
    expect(parseField('1.55', 'carbs').state).toBe('valid');
    const parsed = parseField('1.555', 'carbs');
    expect(parsed.state).toBe('invalid');
    if (parsed.state === 'invalid') expect(parsed.reason).toBe('too_many_decimals');
  });

  it('allows one integer digit beyond the field maximum, and no more', () => {
    // Blood sugar caps at 600, so four integer digits are accepted and five are
    // rejected on LENGTH — the message is about the typing, not the reading.
    expect(parseField('6000', 'bloodSugar').state).toBe('valid');
    const parsed = parseField('60000', 'bloodSugar');
    expect(parsed.state).toBe('invalid');
    if (parsed.state === 'invalid') expect(parsed.reason).toBe('too_long');
  });

  it('gives the injected-amount field the same grammar (§7.1)', () => {
    // §7.1 — the grammar was written for blood sugar and carbohydrates only,
    // and v8 shipped a free-entry insulin field with none of it.
    expect(parseField('25g', 'injected').state).toBe('invalid');
    expect(parseField('2,5', 'injected').state).toBe('invalid');
    expect(parseField('25', 'injected').state).toBe('valid');
    expect(parseField('2.5', 'injected').state).toBe('valid');
  });

  it('trims surrounding whitespace but nothing inside', () => {
    expect(parseField('  60  ', 'carbs').state).toBe('valid');
    expect(parseField('6 0', 'carbs').state).toBe('invalid');
  });

  it('carries exact hundredths alongside the value', () => {
    const parsed = parseField('2.35', 'injected');
    expect(parsed.state).toBe('valid');
    if (parsed.state === 'valid') {
      expect(parsed.hundredths).toBe(235);
      expect(parsed.value).toBe(2.35);
      expect(parsed.text).toBe('2.35');
    }
  });
});

describe('§4.5 ranges are checked separately from the grammar', () => {
  it('answers a different question from the grammar', () => {
    // "605" is a perfectly well-formed number and an impossible reading.
    expect(parseField('605', 'bloodSugar').state).toBe('valid');
    expect(withinHardRange(605, 'bloodSugar')).toBe(false);
  });

  it('holds at both endpoints of every hard range', () => {
    expect(withinHardRange(20, 'bloodSugar')).toBe(true);
    expect(withinHardRange(19.99, 'bloodSugar')).toBe(false);
    expect(withinHardRange(600, 'bloodSugar')).toBe(true);
    expect(withinHardRange(600.01, 'bloodSugar')).toBe(false);
    expect(withinHardRange(0, 'carbs')).toBe(true);
    expect(withinHardRange(300, 'carbs')).toBe(true);
    expect(withinHardRange(300.01, 'carbs')).toBe(false);
    expect(withinHardRange(70, 'target')).toBe(true);
    expect(withinHardRange(200, 'target')).toBe(true);
    // §4.5 — the ceiling was lowered from 300 to 200 in v17: 200 accepts a
    // genuine less-stringent target and rejects a mistyped 250 or 300.
    expect(withinHardRange(250, 'target')).toBe(false);
    expect(withinHardRange(0.01, 'injected')).toBe(true);
    expect(withinHardRange(100, 'injected')).toBe(true);
    expect(withinHardRange(100.01, 'injected')).toBe(false);
  });

  it('rejects a non-finite value rather than comparing it', () => {
    // §2.3 rule 1: `if (x < min || x > max) reject` does NOT reject NaN,
    // because both comparisons are false. The lint rule below exists to stop
    // exactly this comparison being written by accident; here it is the
    // subject of the test, so it is disabled by name rather than worked around.
    /* eslint-disable use-isnan */
    expect(Number.NaN < 20).toBe(false);
    expect(Number.NaN > 600).toBe(false);
    /* eslint-enable use-isnan */
    expect(withinHardRange(Number.NaN, 'bloodSugar')).toBe(false);
    expect(withinHardRange(Number.POSITIVE_INFINITY, 'carbs')).toBe(false);
  });

  it("puts the physician's own target of 150 OUTSIDE the soft band, correctly", () => {
    // §4.5 — 150 sits just above the standard band, so it confirms once. §11.8
    // records that v8's self-check asserted the opposite and failed on day one.
    expect(withinSoftBand(150, 'target')).toBe(false);
    expect(withinSoftBand(140, 'target')).toBe(true);
    expect(withinSoftBand(90, 'target')).toBe(true);
    expect(withinSoftBand(89.99, 'target')).toBe(false);
  });

  it('treats a field with no soft band as always inside one', () => {
    expect(withinSoftBand(600, 'bloodSugar')).toBe(true);
    expect(withinSoftBand(0, 'carbs')).toBe(true);
  });
});

describe('§4.2 — what the keypad may append, per field', () => {
  it('the reading takes three digits plus one of slack, and no decimal point', () => {
    // 600 is the maximum, so three digits, and the slack digit exists so a
    // mistyped 6000 is EXPLAINED rather than silently refused.
    expect(maxIntegerDigits('bloodSugar')).toBe(4);
    expect(acceptsKeystroke('60', '0', 'bloodSugar', false)).toBe(true);
    expect(acceptsKeystroke('600', '0', 'bloodSugar', false)).toBe(true);
    expect(acceptsKeystroke('6000', '0', 'bloodSugar', false)).toBe(false);
    // §10.1 — no decimal key on the reading at all.
    expect(acceptsKeystroke('60', '.', 'bloodSugar', false)).toBe(false);
  });

  it('and carbohydrate takes two decimal places, which a flat cap of four did not', () => {
    // The defect this pins: a single four-digit cap counted the integer and
    // fractional parts TOGETHER, so 100.25 was unenterable while §4.2's grammar
    // and RANGE.carbs both accept it.
    expect(acceptsKeystroke('100.2', '5', 'carbs', true)).toBe(true);
    expect(acceptsKeystroke('250.2', '5', 'carbs', true)).toBe(true);
    // The FIRST point must be accepted. Two mutants survived for want of this
    // one line — `allowFraction && pointAt === -1` could be replaced with
    // `false`, and `-1` with `+1`, and every test still passed. Nothing
    // asserted that a decimal point could be typed at all.
    expect(acceptsKeystroke('50', '.', 'carbs', true)).toBe(true);
    expect(acceptsKeystroke('', '.', 'carbs', true)).toBe(true);
    // Two places and no more, and never a second point.
    expect(acceptsKeystroke('100.25', '5', 'carbs', true)).toBe(false);
    expect(acceptsKeystroke('100.2', '.', 'carbs', true)).toBe(false);
  });

  it('and every keystroke it admits parses, or is reported — never silently wrong', () => {
    // The property that matters: anything the keypad lets you build is either a
    // value the grammar accepts, or one the range REPORTS on. Nothing typeable
    // may fall through both.
    for (const field of ['bloodSugar', 'carbs'] as const) {
      const allowFraction = field === 'carbs';
      let built = '';
      for (const key of ['9', '9', '9', '9', '.', '9', '9']) {
        if (!acceptsKeystroke(built, key, field, allowFraction)) continue;
        built += key;
        const parsed = parseField(built, field);
        expect(parsed.state === 'valid' || parsed.state === 'invalid').toBe(true);
      }
      expect(built.length).toBeGreaterThan(0);
    }
  });
});

describe('§4.2 — the leading zero, which is a display defect and a budget one', () => {
  it('replaces a lone zero rather than appending to it', () => {
    // `08` parses to 8, so the dose was never wrong. What was wrong is that the
    // screen showed `08`, and that `0008` spends all four digits of a reading's
    // budget — which could make a legitimate 600 unreachable.
    expect(applyKeystroke('0', '8', 'bloodSugar', false)).toBe('8');
    expect(applyKeystroke('0', '1', 'carbs', true)).toBe('1');
  });

  it('and refuses a second zero, so `00` cannot exist', () => {
    expect(applyKeystroke('0', '0', 'bloodSugar', false)).toBe(null);
  });

  it('but keeps the zero before a decimal point, because 0.5 needs it', () => {
    expect(applyKeystroke('0', '.', 'carbs', true)).toBe('0.');
    expect(applyKeystroke('0.', '5', 'carbs', true)).toBe('0.5');
  });

  it('and leaves every other keystroke to the grammar', () => {
    expect(applyKeystroke('12', '0', 'bloodSugar', false)).toBe('120');
    expect(applyKeystroke('6000', '0', 'bloodSugar', false)).toBe(null);
    expect(applyKeystroke('10', '0', 'carbs', true)).toBe('100');
  });

  it('so nothing typeable can carry a leading zero at all', () => {
    // The property, rather than the cases: build every value the keypad can
    // produce from a leading 0 and assert none of them keeps it as padding.
    for (const field of ['bloodSugar', 'carbs'] as const) {
      let built = '0';
      for (const key of ['0', '5', '0', '2']) {
        const next = applyKeystroke(built, key, field, field === 'carbs');
        if (next !== null) built = next;
      }
      expect(built.startsWith('00')).toBe(false);
      expect(built === '0' || !/^0[0-9]/.test(built)).toBe(true);
    }
  });
});
