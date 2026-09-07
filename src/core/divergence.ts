/**
 * §7.1 — the divergence confirmation for `injectedUnits`.
 *
 * v8 shipped the adjuster and dropped its constraint in transit: a free-entry
 * insulin field with no grammar, no range, no zero rule and no stored
 * representation. A typo of 250 poisons every quoted amount and reaches the
 * export; a typo of 2.5 for 25 under-counts insulin on board, which is the
 * dose-raising direction.
 *
 *   diverged =  |injected - calculated| >= 5 units
 *               AND ( injected >= 3 x calculated  OR  injected <= calculated / 3 )
 *
 *   if calculated == 0:  the ratio is undefined -> the absolute clause alone
 *
 * Why a ratio of 3 and not 2: his routine divergence is exactly the thing this
 * must NOT fire on. A calculated 11 against his habitual 25 is 2.3x and will
 * recur at most meals until his prescription is revisited (§1.4). A 2x rule
 * would fire on every injection he makes — the tap-through training §6.2 warns
 * against, and the anchoring hazard that removed §6.7's line.
 *
 * Why the 5-unit absolute floor: without it, a calculated 0.5 against an
 * injected 2 is a 4x divergence and would confirm — noise on doses too small
 * for the difference to matter.
 */

import { DIVERGE_MIN_UNITS, DIVERGE_RATIO, HUNDREDTHS_SCALE } from '../config.js';

const DIVERGE_MIN_HUNDREDTHS = DIVERGE_MIN_UNITS * HUNDREDTHS_SCALE;

/**
 * Both arguments are integer hundredths (§2.2). The comparison is done in
 * hundredths and the ratio is expressed as a cross-multiplication, so no
 * division and no float enters a safety predicate.
 *
 * @param calculatedHundredths the dose the app produced
 * @param injectedHundredths what he says he injected
 */
export function divergesFromCalculated(
  calculatedHundredths: number,
  injectedHundredths: number,
): boolean {
  if (!Number.isFinite(calculatedHundredths) || !Number.isFinite(injectedHundredths)) {
    // §2.3 rule 1 — a non-finite value never passes a gate by being
    // incomparable. Confirming is the cautious direction.
    return true;
  }

  const absolute = Math.abs(injectedHundredths - calculatedHundredths);
  if (absolute < DIVERGE_MIN_HUNDREDTHS) return false;

  // §7.1 — this branch is FLOW-UNREACHABLE and is declared rather than left to
  // look live (§6.5's own doctrine). §7.2 forbids logging a zero-unit result,
  // so no tap exists at zero; it is defensive specification for a total
  // function and is tested directly rather than through the interface.
  // Stryker disable next-line ConditionalExpression: removing this branch
  // changes no answer, because with a calculated dose of zero the ratio clause
  // below reduces to `injected >= 0`, which is already true for every amount
  // that got past the absolute floor. §7.1 declares the branch anyway — "it is
  // defensive specification for a total function" — and a total function that
  // relies on a coincidence downstream is not one.
  if (calculatedHundredths === 0) return true;

  // injected >= 3 x calculated, or injected <= calculated / 3, without dividing.
  const farAbove = injectedHundredths >= DIVERGE_RATIO * calculatedHundredths;
  const farBelow = injectedHundredths * DIVERGE_RATIO <= calculatedHundredths;
  return farAbove || farBelow;
}
