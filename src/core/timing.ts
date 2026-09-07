/**
 * §8.1 — pre-meal timing, anchored to the INJECTION and not to the calculation.
 *
 * Humulin R is short-acting regular human insulin, not rapid-acting, and the
 * app must never call it rapid: the timing advice depends on the distinction.
 * The FDA label says inject about 30 minutes before meals; ISPAD says 20-30.
 *
 * Version 1 computed an absolute eat-time from the CALCULATION clock — "inject
 * now, eat at 7:40 PM". That breaks silently: calculate at 7:10, get
 * distracted, inject at 7:35, eat at the displayed 7:40, and the meal absorbs
 * ahead of the insulin's onset with the peak landing three hours later on a
 * falling curve. Nothing on screen would indicate the number went stale.
 */

import {
  EAT_DELAY_MINUTES,
  MS_PER_MINUTE,
  RESULT_EXPIRY_MINUTES,
} from '../config.js';
import type { Band, TimingAdvice } from './types.js';

const [EAT_DELAY_MIN, EAT_DELAY_MAX] = EAT_DELAY_MINUTES;

/**
 * §8.1's band-aware suppression. Version 1 would have shown "eat before
 * injecting" and "inject now, eat in 30 minutes" at the same time.
 *
 * @param bloodSugarKnown false when the field was blank (§4.6). The instruction
 *   is suppressed ENTIRELY, because the app cannot know the band.
 */
export function decideTimingAdvice(bands: readonly Band[], bloodSugarKnown: boolean): TimingAdvice {
  if (!bloodSugarKnown) return 'suppressed';
  if (bands.includes('C') || bands.includes('D')) return 'suppressed';
  // A 30-minute fast at 71 mg/dL is wrong, so band B inverts the instruction.
  if (bands.includes('B')) return 'eat_first';
  return 'before';
}

export interface EatWindow {
  readonly fromMs: number;
  readonly toMs: number;
}

/**
 * The window opens at the injection, never at the calculation. §7.2 takes the
 * timestamp and this clock at the same tap, so the record's time and the timing
 * advice cannot disagree.
 */
export function eatWindow(injectedAtMs: number): EatWindow {
  return {
    fromMs: injectedAtMs + EAT_DELAY_MIN * MS_PER_MINUTE,
    toMs: injectedAtMs + EAT_DELAY_MAX * MS_PER_MINUTE,
  };
}

export const EAT_DELAY_RANGE_MINUTES: readonly [number, number] = [EAT_DELAY_MIN, EAT_DELAY_MAX];

/**
 * §8.2 — every result carries a timestamp and expires after 15 minutes.
 *
 * Version 1 cleared the dose when INPUTS changed but never when TIME passed, so
 * a resumed app could show "7 units — inject now" computed from a reading three
 * hours old. That is both a bad dosing basis and ambiguous evidence in a "did I
 * already inject?" moment.
 */
export function isResultExpired(decisionTimeMs: number, nowMs: number): boolean {
  return nowMs - decisionTimeMs >= RESULT_EXPIRY_MINUTES * MS_PER_MINUTE;
}
