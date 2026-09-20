/**
 * §8.1 — pre-meal timing, anchored to the INJECTION and not to the calculation.
 *
 * **The wait is the reader's insulin's, not this app's.** Humulin R is regular
 * human insulin, not rapid-acting, and its label says inject about 30 minutes
 * before a meal while ISPAD says 20-30. A rapid analogue's label says five to
 * ten. Until 2026-09-20 this module held Humulin R's pair as a module constant
 * and rendered it to everyone; §8.5 now asks which insulin is in the pen and
 * `core/insulin.ts` turns the answer into the pair passed in below.
 *
 * Version 1 computed an absolute eat-time from the CALCULATION clock — "inject
 * now, eat at 7:40 PM". That breaks silently: calculate at 7:10, get
 * distracted, inject at 7:35, eat at the displayed 7:40, and the meal absorbs
 * ahead of the insulin's onset with the peak landing three hours later on a
 * falling curve. Nothing on screen would indicate the number went stale.
 */

import { MS_PER_MINUTE, RESULT_EXPIRY_MINUTES } from '../config.js';
import type { EatDelay } from './insulin.js';
import type { Band, TimingAdvice } from './types.js';

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
 *
 * @param delay §8.5 — the reader's own class range, or their prescriber's
 *   single number as the pair `[n, n]`. There is no default: a caller with no
 *   delay to pass has no window to draw, and `eatDelayFor` returns null for
 *   exactly that case rather than handing this a guess.
 */
export function eatWindow(injectedAtMs: number, delay: EatDelay): EatWindow {
  const [fromMinutes, toMinutes] = delay;
  return {
    fromMs: injectedAtMs + fromMinutes * MS_PER_MINUTE,
    toMs: injectedAtMs + toMinutes * MS_PER_MINUTE,
  };
}

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
