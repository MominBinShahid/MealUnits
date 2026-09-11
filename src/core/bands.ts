/**
 * §3 — the blood sugar bands.
 *
 * The target (150) is above guideline pre-meal ranges, and that is the
 * physician's deliberate choice (§18.1). The structural consequence is that
 * "below target" is the NORMAL case here, not an edge case.
 *
 * 70 and 54 are the ADA/EASD international consensus levels. They are absolute
 * and never derived from any setting.
 *
 * §3.1's asymmetry, stated here so it is not "fixed" later: BLOCKING at the low
 * end, ADVISORY at the high end. At low blood sugar, not injecting is the safe
 * default. At high blood sugar, not injecting is the UNSAFE default. The gate
 * goes where inaction is safe.
 */

import { BAND_B_CORRECTION_UNITS, HYPO_LEVEL_1, HYPO_LEVEL_2, KETONE_ADVISORY } from '../config.js';
import type { Band } from './types.js';

/**
 * §4.3 step 3's half of the job, and it needs NO setting to be correct — which
 * is why it is its own function rather than a null argument to the one below.
 * A null correction reaching the band A/B predicate would be indistinguishable
 * from a correction of zero, because `null <= -1.5` coerces to `0 <= -1.5`.
 */
export function classifyLowBand(bloodSugarMgDl: number): 'C' | 'D' | null {
  if (bloodSugarMgDl < HYPO_LEVEL_2) return 'D';
  if (bloodSugarMgDl < HYPO_LEVEL_1) return 'C';
  return null;
}

/**
 * @param bloodSugarMgDl the validated reading, or null when none was entered
 * @param exactCorrectionUnits §3.2 — the EXACT UNROUNDED correction. Never a
 *   rounded one, and never a suppressed one: §4.3 step 7 evaluates the band
 *   predicate before §7.4's stacking decision precisely so that suppression
 *   cannot hide band B.
 */
export function classifyBands(
  bloodSugarMgDl: number | null,
  exactCorrectionUnits: number,
): Band[] {
  // §4.6 — with no reading the app cannot know the band, and it does not guess.
  if (bloodSugarMgDl === null) return [];

  // Bands C and D are terminal. Nothing else shows.
  const low = classifyLowBand(bloodSugarMgDl);
  if (low !== null) return [low];

  // §3.2 — band B fires on the exact correction rather than a fixed boundary,
  // because a boundary like "below 100" is meaningful only relative to the
  // target and the sensitivity, and both are editable. At target 110 a fixed
  // 100 would announce "well below target" at 40 mg/dL under target, which is
  // noise, and noise is how warnings stop being read.
  const bands: Band[] = [exactCorrectionUnits <= BAND_B_CORRECTION_UNITS ? 'B' : 'A'];

  // §3.1 — advisory, never blocking. Someone at 500 mg/dL needs insulin most,
  // and refusing to help is not safer than helping with a warning.
  if (bloodSugarMgDl >= KETONE_ADVISORY) bands.push('E');

  return bands;
}

/** §3 bands C and D suppress every insulin quantity (§3.3). */
export function isBlockingBand(bands: readonly Band[]): boolean {
  return bands.includes('C') || bands.includes('D');
}
