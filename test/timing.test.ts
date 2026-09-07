import { describe, expect, it } from 'vitest';
import {
  EAT_DELAY_RANGE_MINUTES,
  decideTimingAdvice,
  eatWindow,
  isResultExpired,
} from '../src/core/timing.js';
import { formatClockTime } from '../src/core/calendar.js';

const KARACHI = 'Asia/Karachi';
const MINUTE = 60_000;

describe('§8.1 band-aware timing', () => {
  it('band A gets the ordinary pre-meal rule', () => {
    expect(decideTimingAdvice(['A'], true)).toBe('before');
    expect(decideTimingAdvice(['A', 'E'], true)).toBe('before');
  });

  it('band B INVERTS it — a 30-minute fast at 71 mg/dL is wrong', () => {
    expect(decideTimingAdvice(['B'], true)).toBe('eat_first');
  });

  it('and version 1 would have shown both instructions at once', () => {
    // One function, one answer, so "eat before injecting" and "inject now, eat
    // in 30 minutes" cannot both come out. Asserted across every band rather
    // than at one value, since the property is about the return type.
    const answers = new Set(
      (['A', 'B', 'C', 'D', 'E'] as const).map((band) => decideTimingAdvice([band], true)),
    );
    for (const answer of answers) {
      expect(['before', 'eat_first', 'suppressed']).toContain(answer);
    }
    expect(decideTimingAdvice(['B'], true)).not.toBe('before');
  });

  it('bands C and D suppress it entirely — no dose exists', () => {
    expect(decideTimingAdvice(['C'], true)).toBe('suppressed');
    expect(decideTimingAdvice(['D'], true)).toBe('suppressed');
  });

  it('§4.6 — a blank reading suppresses it, because the band is unknowable', () => {
    expect(decideTimingAdvice([], false)).toBe('suppressed');
    // Even if a band were somehow asserted, an unknown reading wins.
    expect(decideTimingAdvice(['A'], false)).toBe('suppressed');
  });
});

describe('§8.1 the window opens at the INJECTION, never at the calculation', () => {
  it('is the 20-30 minute range the label and ISPAD give', () => {
    expect(EAT_DELAY_RANGE_MINUTES).toEqual([20, 30]);
  });

  it('renders §8.1s own worked example', () => {
    // "Injected 7:35 PM -> eat around 8:05 PM"
    const injectedAt = Date.parse('2026-09-06T14:35:00Z'); // 7:35 PM Karachi
    const window = eatWindow(injectedAt);
    expect(formatClockTime(injectedAt, KARACHI)).toBe('7:35 PM');
    expect(formatClockTime(window.fromMs, KARACHI)).toBe('7:55 PM');
    expect(formatClockTime(window.toMs, KARACHI)).toBe('8:05 PM');
  });

  it('and version 1s failure is arithmetic: calculating at 7:10 and injecting at 7:35', () => {
    // Version 1 computed the eat-time from the CALCULATION clock, so a
    // distraction between the two silently turned a 30-minute lead into five
    // minutes — the meal absorbing ahead of the insulin's onset.
    const calculatedAt = Date.parse('2026-09-06T14:10:00Z');
    const injectedAt = Date.parse('2026-09-06T14:35:00Z');
    const version1 = eatWindow(calculatedAt).toMs;
    const correct = eatWindow(injectedAt).toMs;
    expect((version1 - injectedAt) / MINUTE).toBe(5);
    expect((correct - injectedAt) / MINUTE).toBe(30);
  });
});

describe('§8.2 results expire', () => {
  it('after fifteen minutes, inclusive at the boundary', () => {
    const at = 1_757_000_000_000;
    expect(isResultExpired(at, at)).toBe(false);
    expect(isResultExpired(at, at + 14 * MINUTE)).toBe(false);
    expect(isResultExpired(at, at + 15 * MINUTE - 1)).toBe(false);
    expect(isResultExpired(at, at + 15 * MINUTE)).toBe(true);
    expect(isResultExpired(at, at + 3 * 60 * MINUTE)).toBe(true);
  });

  it('is what stops a three-hour-old reading from reading as "inject now"', () => {
    const at = 1_757_000_000_000;
    expect(isResultExpired(at, at + 180 * MINUTE)).toBe(true);
  });
});
