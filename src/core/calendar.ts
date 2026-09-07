/**
 * §10.4's time rules, and the local-calendar-day boundary §10.5 needs.
 *
 * Every function here takes an explicit time zone. §13.1 requires time to be
 * passed into the core as data and §8.1's timing to be "a separate pure
 * function tested with fixed timestamps and an explicit timezone" — a formatter
 * that silently reads the host's zone is not testable in the way that sentence
 * asks for.
 *
 * Nothing here calls `Date.now()`.
 */

import { CLOCK_MINUTE_DIGITS, HOURS_PER_HALF_DAY } from '../config.js';

export interface LocalParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

type PartType = 'year' | 'month' | 'day' | 'hour' | 'minute';

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    // h23 so midnight is hour 0 rather than 24, and so the AM/PM decision is
    // made here rather than inherited from a locale.
    hourCycle: 'h23',
  });
}

export function localParts(ms: number, timeZone: string): LocalParts {
  if (!Number.isFinite(ms)) throw new RangeError('localParts received a non-finite timestamp');
  const found = new Map<string, string>();
  for (const part of partsFormatter(timeZone).formatToParts(new Date(ms))) {
    // Every part is collected, including the literal separators. Filtering them
    // out first would be a branch no test can distinguish, because `read` only
    // ever asks for the five names below.
    found.set(part.type, part.value);
  }
  const read = (key: PartType): number => {
    const value = Number(found.get(key));
    // Stryker disable all: unreachable. `Intl.DateTimeFormat` rejects an unknown
    // time zone at construction, and every zone it accepts emits all five
    // requested parts — so this guard has no failing input to be shown on.
    if (!Number.isFinite(value)) {
      throw new RangeError(`could not read ${key} for time zone ${timeZone}`);
    }
    // Stryker restore all
    return value;
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

/**
 * §10.5's boundary is the LOCAL CALENDAR DAY. v10 cited "§7.6's existing
 * local-time rule"; §7.6 contains no such rule and the pointer was removed.
 *
 * A clock-skew future-stamped row can demote the next day's first card to
 * compact. The instruction is identical in both forms by §10.5's own rule, so
 * no protection is lost — and whether a calendar boundary is the right one at
 * all is a physician question under §18.8, since a 3 a.m. reading and a 9 a.m.
 * reading are arguably one episode.
 */
export function localDayKey(ms: number, timeZone: string): string {
  const { year, month, day } = localParts(ms, timeZone);
  const pad = (n: number): string => n.toString().padStart(CLOCK_MINUTE_DIGITS, '0');
  return `${year.toString()}-${pad(month)}-${pad(day)}`;
}

export function isSameLocalDay(a: number, b: number, timeZone: string): boolean {
  return localDayKey(a, timeZone) === localDayKey(b, timeZone);
}

/**
 * §10.4 — 12-hour with AM/PM, and noon and midnight written out.
 *
 * "12:00 PM" is routinely misread, and A LUNCH DOSE AT NOON IS THIS APP'S DAILY
 * CASE, so the ambiguity lands exactly where it is most likely to matter. The
 * date-alongside mitigation does not cover it either: noon and midnight of the
 * same day carry the same date.
 *
 * The marker is never abbreviated to a bare letter and never rendered smaller
 * than the digits — that part is the stylesheet's job, and it is recorded in
 * §10.4 rather than here.
 */
export function formatClockTime(ms: number, timeZone: string): string {
  const { hour, minute } = localParts(ms, timeZone);
  const minuteText = minute.toString().padStart(CLOCK_MINUTE_DIGITS, '0');

  if (minute === 0 && hour === HOURS_PER_HALF_DAY) {
    return `${HOURS_PER_HALF_DAY.toString()}:${minuteText} noon`;
  }
  if (minute === 0 && hour === 0) {
    // §10.4 — midnight carries the date of the day it BEGINS, which is simply
    // the local date of this timestamp. §7.8's notes include "overnight" and
    // §18.13's clustering question is precisely about which night a low
    // belongs to.
    return `${HOURS_PER_HALF_DAY.toString()}:${minuteText} midnight`;
  }

  const suffix = hour < HOURS_PER_HALF_DAY ? 'AM' : 'PM';
  const displayHour = hour % HOURS_PER_HALF_DAY === 0 ? HOURS_PER_HALF_DAY : hour % HOURS_PER_HALF_DAY;
  return `${displayHour.toString()}:${minuteText} ${suffix}`;
}

/**
 * Month names are spelled out here rather than taken from `Intl`, and that is a
 * decision with a measurement behind it: `en-GB` renders September as **"Sept"**
 * — four letters, alone among the twelve — while `en-US` renders "Sep" but puts
 * the month first, "Sep 6, 2026". §7.7.1's own worked example is "18 Aug – 2
 * Sep": day first, three letters.
 *
 * Neither locale gives both, and the readable export is a document a clinician
 * reads, so its dates should not change shape because a browser shipped a new
 * ICU. This table is nine lines and cannot drift.
 */
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export function monthName(month: number): string {
  const name = MONTHS[month - 1];
  if (name === undefined) throw new RangeError(`month out of range: ${month.toString()}`);
  return name;
}

/**
 * "6 Sep 2026". The history screen carries the date alongside the time, so a
 * row cannot be read twelve hours out (§10.4).
 */
export function formatDate(ms: number, timeZone: string): string {
  const { year, month, day } = localParts(ms, timeZone);
  return `${day.toString()} ${monthName(month)} ${year.toString()}`;
}

/** "18 Aug" — for §7.7.1's period headings, where the year is on the group. */
export function formatDayAndMonth(ms: number, timeZone: string): string {
  const { month, day } = localParts(ms, timeZone);
  return `${day.toString()} ${monthName(month)}`;
}
