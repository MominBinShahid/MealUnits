import { describe, expect, it } from 'vitest';
import {
  formatClockTime,
  formatDate,
  formatDayAndMonth,
  isSameLocalDay,
  localDayKey,
  localParts,
  monthName,
} from '../src/core/calendar.js';

/**
 * His zone. Pakistan Standard Time is UTC+5 with no daylight saving, which makes
 * every expectation below arithmetic rather than a lookup.
 */
const KARACHI = 'Asia/Karachi';
/** A zone with an offset that is not a whole hour, to catch a naive divisor. */
const KOLKATA = 'Asia/Kolkata';

/** Builds a UTC instant, so each test states the instant it means. */
const utc = (iso: string): number => Date.parse(iso);

describe('§10.4 noon and midnight are written out', () => {
  it('renders noon as noon, never as 12:00 PM', () => {
    // §10.4: "12:00 PM" is routinely misread, and A LUNCH DOSE AT NOON IS THIS
    // APP'S DAILY CASE — the ambiguity lands exactly where it matters most.
    expect(formatClockTime(utc('2026-09-06T07:00:00Z'), KARACHI)).toBe('12:00 noon');
  });

  it('renders midnight as midnight, never as 12:00 AM', () => {
    expect(formatClockTime(utc('2026-09-05T19:00:00Z'), KARACHI)).toBe('12:00 midnight');
  });

  it('and midnight carries the date of the day it BEGINS', () => {
    // 19:00Z on 5 Sep is 00:00 on 6 Sep in Karachi. The date rendered alongside
    // is 6 Sep — the day beginning — matching how the epoch milliseconds behind
    // it render locally. §7.8's notes include "overnight" and §18.13's
    // clustering question is about which night a low belongs to.
    const midnight = utc('2026-09-05T19:00:00Z');
    expect(formatClockTime(midnight, KARACHI)).toBe('12:00 midnight');
    expect(formatDate(midnight, KARACHI)).toBe('6 Sep 2026');
  });

  it('one minute past either is an ordinary time again', () => {
    expect(formatClockTime(utc('2026-09-06T07:01:00Z'), KARACHI)).toBe('12:01 PM');
    expect(formatClockTime(utc('2026-09-05T19:01:00Z'), KARACHI)).toBe('12:01 AM');
  });
});

describe('§10.4 the twelve-hour clock', () => {
  it('renders morning and evening with an unabbreviated marker', () => {
    expect(formatClockTime(utc('2026-09-06T03:35:00Z'), KARACHI)).toBe('8:35 AM');
    expect(formatClockTime(utc('2026-09-06T14:00:00Z'), KARACHI)).toBe('7:00 PM');
    expect(formatClockTime(utc('2026-09-06T14:30:00Z'), KARACHI)).toBe('7:30 PM');
  });

  it('pads the minute but not the hour — 8:05 AM, never 08:05 or 8:5', () => {
    expect(formatClockTime(utc('2026-09-06T03:05:00Z'), KARACHI)).toBe('8:05 AM');
  });

  it('never emits a 24-hour time', () => {
    for (let hour = 0; hour < 24; hour++) {
      const text = formatClockTime(utc(`2026-09-06T${hour.toString().padStart(2, '0')}:17:00Z`), KARACHI);
      expect(text, text).toMatch(/^(1[0-2]|[1-9]):[0-5][0-9] (AM|PM)$/);
    }
  });

  it('handles the hour before noon and the hour after', () => {
    expect(formatClockTime(utc('2026-09-06T06:59:00Z'), KARACHI)).toBe('11:59 AM');
    expect(formatClockTime(utc('2026-09-06T08:00:00Z'), KARACHI)).toBe('1:00 PM');
  });

  it('works in a zone whose offset is not a whole hour', () => {
    // Kolkata is UTC+5:30. 07:00Z is 12:30 there, not noon.
    expect(formatClockTime(utc('2026-09-06T07:00:00Z'), KOLKATA)).toBe('12:30 PM');
    expect(formatClockTime(utc('2026-09-06T06:30:00Z'), KOLKATA)).toBe('12:00 noon');
  });
});

describe('§10.5 the local calendar day', () => {
  it('is local, not UTC', () => {
    // 20:00Z on 5 Sep is already 6 Sep in Karachi.
    expect(localDayKey(utc('2026-09-05T20:00:00Z'), KARACHI)).toBe('2026-09-06');
    expect(localDayKey(utc('2026-09-05T18:00:00Z'), KARACHI)).toBe('2026-09-05');
  });

  it('rolls over at local midnight, which is what §13.3s day-rollover case needs', () => {
    // 11:59 PM then 12:01 AM: two different days, so both render a full card.
    const late = utc('2026-09-05T18:59:00Z'); // 23:59 on 5 Sep, Karachi
    const early = utc('2026-09-05T19:01:00Z'); // 00:01 on 6 Sep, Karachi
    expect(isSameLocalDay(late, early, KARACHI)).toBe(false);
    expect(localDayKey(late, KARACHI)).toBe('2026-09-05');
    expect(localDayKey(early, KARACHI)).toBe('2026-09-06');
  });

  it('treats breakfast and dinner on one day as the same day', () => {
    const breakfast = utc('2026-09-06T03:00:00Z');
    const dinner = utc('2026-09-06T15:00:00Z');
    expect(isSameLocalDay(breakfast, dinner, KARACHI)).toBe(true);
  });

  it('pads month and day, so the key sorts', () => {
    expect(localDayKey(utc('2026-01-02T06:00:00Z'), KARACHI)).toBe('2026-01-02');
  });
});

describe('localParts', () => {
  it('reads every field for a known instant', () => {
    expect(localParts(utc('2026-09-06T03:35:00Z'), KARACHI)).toEqual({
      year: 2026,
      month: 9,
      day: 6,
      hour: 8,
      minute: 35,
    });
  });

  it('reports midnight as hour zero rather than hour 24', () => {
    expect(localParts(utc('2026-09-05T19:00:00Z'), KARACHI).hour).toBe(0);
  });

  it('refuses a non-finite timestamp', () => {
    expect(() => localParts(Number.NaN, KARACHI)).toThrow(
      /localParts received a non-finite timestamp/,
    );
  });
});

describe('month names are a table rather than a locale lookup', () => {
  it('covers all twelve, and refuses anything outside them', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(monthName)).toEqual([
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]);
    expect(() => monthName(0)).toThrow(/month out of range: 0/);
    expect(() => monthName(13)).toThrow(/month out of range: 13/);
  });

  it('renders September as three letters, which en-GB does not', () => {
    // Measured: `en-GB` gives "Sept" for September alone, and `en-US` gives
    // three letters but puts the month first. §7.7.1's own example is
    // "18 Aug - 2 Sep".
    expect(
      new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(
        new Date(Date.UTC(2026, 8, 15)),
      ),
    ).toBe('Sept');
    expect(monthName(9)).toBe('Sep');
  });
});

describe('§10.4 the date alongside, so a row cannot be read twelve hours out', () => {
  it('renders a full date and a period heading', () => {
    expect(formatDate(utc('2026-09-06T09:00:00Z'), KARACHI)).toBe('6 Sep 2026');
    expect(formatDayAndMonth(utc('2026-08-18T09:00:00Z'), KARACHI)).toBe('18 Aug');
  });
});
