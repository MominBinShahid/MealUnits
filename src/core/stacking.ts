/**
 * §7.4 — the stacking rule, and §7.6's time handling.
 *
 * v2 said "suppress the correction term". That was wrong and dangerous, and
 * both reviewers traced it independently: the correction may be NEGATIVE, in
 * which case it reduces the dose, so suppressing it RAISES the dose in exactly
 * the situation where insulin is already on board and the reading is below
 * target.
 *
 *   blood sugar 100, 60 g, 6 units injected 2 h ago
 *     correction -1.667, meal 6.0, correct dose 4 units, v2's rule 6 units
 *
 * The gate whose purpose is preventing over-insulinization handed out MORE
 * insulin, while band B simultaneously displayed "you are well below target".
 *
 * The corrected rule: suppression applies only to a POSITIVE correction. The
 * meal term is never touched — food needs covering regardless of what is on
 * board.
 */

import {
  CLOCK_SKEW_TOLERANCE_HOURS,
  HUNDREDTHS_SCALE,
  MS_PER_HOUR,
  STACK_ADVISE_HOURS,
  STACK_SUPPRESS_HOURS,
} from '../config.js';
import { roundScaledHalfAwayFromZero } from './decimal.js';
import type { LastDose } from './types.js';

/**
 * §7.6's cases, which v3 had as two bullets giving OPPOSITE outcomes for the
 * same physical row. "A future timestamp is excluded from the gate" and
 * "negative elapsed time lands in the suppression branch" describe an identical
 * condition, and exclusion is the DOSE-RAISING direction.
 *
 * Traced: he injects 6 units with the clock running an hour fast; the clock
 * auto-corrects; the row is now future-dated, gets excluded, the gate falls
 * back to an older row beyond 4 hours, and a correction that should have been
 * suppressed is applied in full on top of about 6 units still on board.
 */
export type ElapsedCase =
  /** 0 to 4 h. §7.4's suppression branch. */
  | 'within_suppress_window'
  /** 4 to 12 h inclusive. Applied in full, informational line. */
  | 'within_advise_window'
  /** Over 12 h. Applied in full, no line. */
  | 'too_old'
  /** -1 h to 0. Small forward skew, treated as elapsed zero. Safe direction. */
  | 'skewed_to_zero'
  /** Below -1 h. Implausibly future-dated: excluded, and never silently. */
  | 'excluded_future'
  /** There is no record at all. */
  | 'no_record';

const SUPPRESS_MS = STACK_SUPPRESS_HOURS * MS_PER_HOUR;
const ADVISE_MS = STACK_ADVISE_HOURS * MS_PER_HOUR;
const SKEW_TOLERANCE_MS = CLOCK_SKEW_TOLERANCE_HOURS * MS_PER_HOUR;

export function classifyElapsed(lastDose: LastDose | null, nowMs: number): ElapsedCase {
  if (lastDose === null) return 'no_record';
  if (!Number.isFinite(lastDose.atMs) || !Number.isFinite(nowMs)) return 'excluded_future';

  const elapsed = nowMs - lastDose.atMs;

  if (elapsed < -SKEW_TOLERANCE_MS) return 'excluded_future';
  // §7.6: a small forward skew is treated as elapsed zero, which lands in the
  // suppression branch. That is the safe direction, and it is a decision rather
  // than an accident of a sign.
  if (elapsed < 0) return 'skewed_to_zero';
  if (elapsed < SUPPRESS_MS) return 'within_suppress_window';
  if (elapsed <= ADVISE_MS) return 'within_advise_window';
  return 'too_old';
}

/** True when the elapsed case means the gate has a usable record to reason from. */
export function isUsableRecord(elapsed: ElapsedCase): boolean {
  return (
    elapsed === 'within_suppress_window' ||
    elapsed === 'within_advise_window' ||
    elapsed === 'skewed_to_zero'
  );
}

export interface StackingDecision {
  readonly elapsedCase: ElapsedCase;
  /** §7.4 — only ever true for a POSITIVE correction, and never with an override. */
  readonly suppressPositiveCorrection: boolean;
  /** §7.4.1 — offered only when a correction was actually held back. */
  readonly overrideAvailable: boolean;
  /**
   * §7.4.1's ceiling in his own units: `injected units x ISF`, rounded to a
   * whole mg/dL. It is a CEILING and the copy says so — at two hours into a
   * ~6 hour profile about 110-135 mg/dL genuinely remains, and by 3.5 hours
   * only 65-90. Overstating it discourages a correction that is actually
   * needed, which §3.1 calls the unsafe direction.
   */
  readonly ceilingMgDl: number | null;
}

/**
 * @param stackingOverride §7.4.1 — when active, NO suppression occurs and
 *   §6.2's confirmation is re-run by the caller. The override resets to false
 *   on any input, setting, mode or threshold change: v3 listed it as an
 *   invalidation TRIGGER but never as a TARGET, so it could survive a change to
 *   the very inputs it was granted for.
 */
export function decideStacking(
  lastDose: LastDose | null,
  nowMs: number,
  exactCorrectionUnits: number,
  isf: number,
  stackingOverride: boolean,
): StackingDecision {
  const elapsedCase = classifyElapsed(lastDose, nowMs);
  const inSuppressWindow =
    elapsedCase === 'within_suppress_window' || elapsedCase === 'skewed_to_zero';

  // §7.4's corrected table. A negative or zero correction is applied in full,
  // ALWAYS — it is the safety-direction term.
  const wouldSuppress = inSuppressWindow && exactCorrectionUnits > 0;
  const suppressPositiveCorrection = wouldSuppress && !stackingOverride;

  // Narrowed through a single value rather than two conditions. `lastDose !==
  // null && inSuppressWindow` was redundant — `classifyElapsed(null)` is
  // `no_record`, so a null dose can never be in the window — and a redundant
  // guard is a branch no test can distinguish.
  const doseInWindow = inSuppressWindow ? lastDose : null;
  const ceilingMgDl =
    doseInWindow === null
      ? null
      : roundScaledHalfAwayFromZero((doseInWindow.injectedHundredths * isf) / HUNDREDTHS_SCALE, 0);

  return {
    elapsedCase,
    suppressPositiveCorrection,
    // The override is only meaningful where something is being held back.
    overrideAvailable: suppressPositiveCorrection,
    ceilingMgDl,
  };
}

/**
 * §7.5 — missing history has no safety meaning, and "no usable recent record"
 * must never silently assert "no recent insulin".
 *
 * §7.5's two-condition rule, corrected in v5: the caveat fires when there is no
 * usable record within 12 h AND the provenance is suspect. v4 dropped the
 * provenance half and fired on "older than 12 hours, or absent", which made the
 * caveat appear after EVERY overnight gap — furniture on a daily schedule,
 * while the history screen showed last night's dose one tap away.
 */
export function needsMissingHistoryCaveat(
  elapsed: ElapsedCase,
  provenance: 'trusted' | 'suspect',
): boolean {
  return !isUsableRecord(elapsed) && provenance === 'suspect';
}

/**
 * §7.6 — the app never claims there is no record when one is visibly in use.
 * v5 said an excluded row "triggers §7.5's caveat", which would display "Last
 * dose, 5 hours ago" and "No recent dose recorded" at the same time.
 */
export function needsInvalidTimeLine(
  elapsed: ElapsedCase,
  excludedTimeRecords: number,
): boolean {
  return excludedTimeRecords > 0 && isUsableRecord(elapsed);
}

/** Whole hours since the last dose, for §7.4's informational line. */
export function elapsedHours(lastDose: LastDose, nowMs: number): number {
  return roundScaledHalfAwayFromZero((nowMs - lastDose.atMs) / MS_PER_HOUR, 0);
}
