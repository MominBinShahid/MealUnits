/**
 * §8.5 — which mealtime insulin is in the pen, and the two clocks that depend
 * on it.
 *
 * The dose arithmetic does not depend on the insulin and this module does not
 * touch it. Target, ISF and ICR are the reader's own numbers, set for whatever
 * they actually take. **Exactly two things depend on the molecule:** §8.1's
 * wait before eating, and §7.4's stacking windows. Until 2026-09-20 both were
 * Humulin R's, rendered to everyone.
 *
 * Which way each one fails is not the same, and the difference is the reason
 * this exists:
 *
 * | the wait      | fails toward HYPOGLYCAEMIA. A rapid analogue injected
 * |               |   twenty minutes early is working before the food arrives.
 * | the windows   | fail toward RUNNING HIGH. They hold a correction back
 * |               |   longer than an analogue needs, which §2.1 tolerates and
 * |               |   §7.4.1's per-dose override releases.
 *
 * Kept free of the insulin TABLE, the same way `foods.ts` is kept free of the
 * carbohydrate table: the lookups take their rows as a parameter, so this can
 * be tested against a fixture and the table can grow without touching any of
 * it. The class-keyed functions take a class and know nothing about brands at
 * all.
 */

import { INSULIN_TIMING, MS_PER_HOUR } from '../config.js';
import type { ClassTiming } from '../config.js';

/**
 * What kind of insulin this is. The three mealtime classes are the ones this
 * app can time; the other three are named so a reader can find their insulin
 * and be told plainly that this calculator does not fit it.
 */
export type InsulinClass =
  /** Regular human insulin — soluble, short-acting. Humulin R, Actrapid. */
  | 'regular'
  /** Rapid-acting analogue — aspart, lispro, glulisine. */
  | 'rapid'
  /** Ultra-rapid analogue — faster aspart, lispro-aabc. Injected at the meal. */
  | 'ultra_rapid'
  /** A fixed ratio of two insulins in one pen, on a fixed twice-daily schedule. */
  | 'premix'
  /** NPH — intermediate-acting, peaks at 4-12 hours. Background insulin. */
  | 'intermediate'
  /** Long-acting analogue — glargine, detemir, degludec. §1.3's basal field. */
  | 'long';

/**
 * The classes with a row in `INSULIN_TIMING`, which is the same thing as the
 * classes this app can calculate for. Derived from the table rather than
 * listed, so adding a row cannot leave this disagreeing with it.
 */
export const MEALTIME_CLASSES = Object.keys(INSULIN_TIMING) as readonly MealtimeClass[];

/** A class the app can time. Narrower than `InsulinClass`, and the table's keys. */
export type MealtimeClass = keyof typeof INSULIN_TIMING;

/**
 * §8.5 — the TWO WAYS a pick can be one this app cannot calculate for, which
 * are not the same thing and must not get the same screen.
 *
 * Distinguished on Momin's question, 2026-09-20: *"if you are also adding
 * Lantus in this list can't somebody just pick two insulins that they take?"*
 * They cannot — the question is singular, because the app works out one
 * mealtime dose — but the worry underneath it was right. Someone on basal-bolus
 * takes Lantus AND NovoRapid, and the first version answered a Lantus pick with
 * "this app cannot work out Lantus doses", which sounds like the app does not
 * fit them. It fits them perfectly. They picked the wrong half of their own
 * regimen.
 *
 * | `dead_end`   | premix. There is no per-meal bolus to calculate, at all.
 * | `wrong_turn` | a background insulin. The app fits this reader; the answer
 * |              |   is the other insulin they take, and the screen asks for it.
 *
 * NPH sits in `wrong_turn` and is the genuinely ambiguous one: it is the
 * background half of a basal-bolus regimen for some readers and the whole of a
 * fixed split-mix for others. The wrong-turn shape serves both, because it ASKS
 * rather than concluding — and its body says plainly that if there is no other
 * insulin before meals, this calculator does not fit.
 */
export type ExitKind = 'dead_end' | 'wrong_turn';

export function exitKindFor(insulinClass: InsulinClass): ExitKind {
  return insulinClass === 'premix' ? 'dead_end' : 'wrong_turn';
}

export function isMealtimeClass(value: InsulinClass | null): value is MealtimeClass {
  // Stryker disable next-line ConditionalExpression: the `value !== null` half
  // is EQUIVALENT and deliberately kept. `null in INSULIN_TIMING` coerces the
  // key to the string "null", which is not a row, so dropping the check gives
  // the same answer for every input. §4.1 forbids leaning on that coercion —
  // a reader must not have to know it to see that null is handled — so the
  // check stays and the mutant is disabled with the reason rather than chased
  // with a test that could only appear to prove something.
  return value !== null && value in INSULIN_TIMING;
}

/**
 * The stored answer when the reader has not been asked yet.
 *
 * §4.1's rule about not collapsing states, applied to a string: this is NOT the
 * same as `UNKNOWN_INSULIN`. "Nobody has asked" must produce the question;
 * "I don't know" is an answer, given deliberately, that must not.
 *
 * A settings row written before this field existed reads back as this, so an
 * existing install answers the question on next open like everyone else — which
 * is the whole of the migration.
 */
export const UNANSWERED_INSULIN = '';

/**
 * The stored answer for "I don't know, or mine isn't listed".
 *
 * A real answer with real consequences: the timing lines are suppressed rather
 * than guessed, the dose keeps a generic label, and the stacking gate falls
 * back to the most conservative windows in the table.
 */
export const UNKNOWN_INSULIN = 'unknown';

/** What the app should do about the insulin answer, before anything else runs. */
export type InsulinGate =
  /** No answer stored. §8.5's required question, which has no tap-through. */
  | 'ask'
  /** Answered with an insulin this calculator cannot be right for. */
  | 'unsupported'
  /** Answered usably — a known mealtime class, or a deliberate "I don't know". */
  | 'ok';

/**
 * Rows this module can look a class up in. Structural, so the table stays in
 * `src/data` and the test can hand this two rows instead of twenty.
 */
export interface Classified {
  readonly id: string;
  readonly insulinClass: InsulinClass;
}

/**
 * The class of a stored insulin id, or null when there is no class to have —
 * unanswered, "I don't know", or an id no longer in the table.
 *
 * The third case is not hypothetical and is the reason this returns null rather
 * than throwing: a historical prescription period keeps the id that was stored
 * at the time, and a row retired from the table years later must degrade to
 * "not recorded" rather than take the whole export down with it.
 */
export function classOf(rows: readonly Classified[], id: string): InsulinClass | null {
  // NO GUARD FOR THE TWO SENTINELS, and the absence is the point. Neither is a
  // row id — `test/insulin.test.ts` asserts no shipped row may take either
  // name — so the lookup answers `null` for them by the same path it answers
  // `null` for a retired id. A guard here would be a branch no test could
  // distinguish, which this codebase treats as a defect in its own right.
  return rows.find((row) => row.id === id)?.insulinClass ?? null;
}

/**
 * §8.5's gate, from the stored id alone.
 *
 * An id that is not in the table is `ok` rather than `ask`: it was answered
 * once, and re-asking a question the reader has already answered — because the
 * app forgot the row, not because they changed insulin — would read as the app
 * losing their settings.
 */
export function insulinGate(rows: readonly Classified[], id: string): InsulinGate {
  if (id === UNANSWERED_INSULIN) return 'ask';
  // `UNKNOWN_INSULIN` needs no branch of its own: it is not a row id, so it
  // falls through the lookup below and answers `ok` — which is exactly right.
  // "I don't know" is an answer, and an answer does not re-open the question.
  const found = rows.find((row) => row.id === id);
  if (found === undefined) return 'ok';
  return isMealtimeClass(found.insulinClass) ? 'ok' : 'unsupported';
}

// ─── the wait before eating (§8.1) ──────────────────────────────────────────

/**
 * §8.1's window, in minutes. A PAIR even when both ends are equal: an
 * ultra-rapid analogue's instruction is a moment ("at the start of the meal"),
 * and `[0, 0]` says that without a second shape to reason about.
 */
export type EatDelay = readonly [number, number];

/**
 * The wait this reader should be told about, or null when the app has no
 * business naming one.
 *
 * Null is returned for an unknown insulin and it is the point of the whole
 * exercise: the shipped app rendered Humulin R's twenty-to-thirty minutes to a
 * reader whose insulin it had never asked about. Saying nothing, and saying why
 * nothing, is the honest answer — §7.5's rule that an absence must never be
 * rendered as a fact, applied to a clock instead of to a log.
 *
 * @param override §8.5 — the reader's own prescriber's number, which replaces
 *   the class range entirely. A single minute rather than a span, because that
 *   is the shape of the answer a doctor gives.
 */
export function eatDelayFor(
  insulinClass: InsulinClass | null,
  override: number | null,
): EatDelay | null {
  if (override !== null) return [override, override];
  if (!isMealtimeClass(insulinClass)) return null;
  return INSULIN_TIMING[insulinClass].eatDelayMinutes;
}

/** The range a class prefills into the reader's own field. Null for the rest. */
export function classEatDelay(insulinClass: InsulinClass | null): EatDelay | null {
  return isMealtimeClass(insulinClass) ? INSULIN_TIMING[insulinClass].eatDelayMinutes : null;
}

// ─── the stacking windows (§7.4) ────────────────────────────────────────────

export interface StackWindows {
  readonly suppressMs: number;
  readonly adviseMs: number;
}

function windowsFromTiming(timing: ClassTiming): StackWindows {
  return {
    suppressMs: timing.stackSuppressHours * MS_PER_HOUR,
    adviseMs: timing.stackAdviseHours * MS_PER_HOUR,
  };
}

/**
 * The LONGEST windows any class declares.
 *
 * What an unknown insulin gets, and the direction is chosen rather than
 * inherited: a longer window suppresses more corrections, which runs high, and
 * §2.1 calls high the tolerable direction. Guessing short on an insulin nobody
 * named would grant corrections sooner than the insulin actually in the reader
 * allows.
 */
function longestWindows(): StackWindows {
  let suppressMs = 0;
  let adviseMs = 0;
  for (const timing of Object.values(INSULIN_TIMING)) {
    const windows = windowsFromTiming(timing);
    suppressMs = Math.max(suppressMs, windows.suppressMs);
    adviseMs = Math.max(adviseMs, windows.adviseMs);
  }
  return { suppressMs, adviseMs };
}

/** One class's windows, or the conservative maximum when there is no class. */
export function windowsFor(insulinClass: InsulinClass | null): StackWindows {
  return isMealtimeClass(insulinClass)
    ? windowsFromTiming(INSULIN_TIMING[insulinClass])
    : longestWindows();
}

/**
 * §8.5's switch-day rule, and it is the one part of this that a later edit
 * would have had to retrofit.
 *
 * **The windows model insulin ALREADY ON BOARD.** So the gate belongs to the
 * dose that was given, not to the vial that is out on the counter now. Someone
 * who takes regular insulin at lunch, switches to a rapid analogue, and
 * calculates at four o'clock still has lunch's regular insulin in them —
 * selecting the analogue must not shrink the window underneath it.
 *
 * The rule is therefore the LONGER of the two, and it expires by itself:
 * once the pre-change dose ages past the advise window, `classifyElapsed`
 * returns `too_old` under either pair and the maximum stops meaning anything.
 * No date arithmetic, no stored switch timestamp, nothing to get wrong on the
 * day the clock changes.
 *
 * Equal on every row as this ships — see `INSULIN_TIMING`, where the values
 * wait on CLINICAL.md question 10c while the mechanism does not.
 */
export function effectiveWindows(
  current: InsulinClass | null,
  lastDose: InsulinClass | null,
): StackWindows {
  return longerOf(windowsFor(current), windowsFor(lastDose));
}

/**
 * The rule itself, over WINDOWS rather than classes.
 *
 * Separated so it can be tested against pairs that actually differ. Every row
 * in `INSULIN_TIMING` declares the same windows today — the hold described
 * there — so a test of `effectiveWindows` alone cannot tell "the longer of the
 * two" from "the shorter of the two", and the one thing that must never be
 * wrong here would have had no failing case. §20.3's standard: a check that
 * cannot be shown to fail on a real defect is not a check.
 */
export function longerOf(a: StackWindows, b: StackWindows): StackWindows {
  return {
    suppressMs: Math.max(a.suppressMs, b.suppressMs),
    adviseMs: Math.max(a.adviseMs, b.adviseMs),
  };
}
