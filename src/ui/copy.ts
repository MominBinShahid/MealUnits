/**
 * Every user-facing string, in one file.
 *
 * They live together because in this app the words ARE the specification. §3's
 * band copy, §7.4.1's ceiling wording, §10.5's compact band E line and §4.2's
 * comma message were each argued over for revisions, and several were WRONG in
 * a way that survived review — v8's compact band E copy quietly made the action
 * optional; v3's comma message told a grouping-intent user to retype "2,50" as
 * "2.50" and produced the identical hundredfold under-dose one obedience step
 * later. Scattered through render functions, none of that is reviewable.
 *
 * §10.2's rules apply throughout: the app says **"blood sugar"**, never "blood
 * glucose" or "BG", and there are **no bare abbreviations anywhere in the
 * interface** — the only exception is small secondary text giving the clinical
 * term so he can talk to his doctor.
 */

import {
  EAT_DELAY_MINUTES,
  FAST_CARB_GRAMS,
  HYPO_LEVEL_1,
  KETONE_ADVISORY,
  RANGE,
  RECHECK_MINUTES,
  STACK_SUPPRESS_HOURS,
} from '../config.js';
import { formatHundredths } from '../core/decimal.js';
import type { LexicalReason } from '../core/types.js';

const [EAT_MIN, EAT_MAX] = EAT_DELAY_MINUTES;
const [MIN_BLOOD_SUGAR, MAX_BLOOD_SUGAR] = RANGE.bloodSugar.hard;
const [, MAX_INJECTED] = RANGE.injected.hard;

/** §10.4 — "units", spelled out, always. `4U` has been misread as 40. */
export function units(hundredths: number): string {
  const value = formatHundredths(hundredths);
  return `${value} ${value === '1' ? 'unit' : 'units'}`;
}

export const COPY = {
  appName: 'MealUnits',

  // ── §3's bands ────────────────────────────────────────────────────────────
  bandC: {
    title: 'Treat this first. Do not inject.',
    body: `Have ${String(FAST_CARB_GRAMS)} grams of fast-acting carbohydrate now, then check again in ${String(RECHECK_MINUTES)} minutes.`,
    // §3.3 — the block suppresses every INSULIN quantity. It does not suppress
    // the treatment instructions, which necessarily contain 15 grams, 15
    // minutes and 70 mg/dL. "The rule is no insulin dose numbers, not no digits."
    gate: `Do not inject until you are above ${String(HYPO_LEVEL_1)} mg/dL.`,
  },
  bandD: {
    title: 'This is very low. Treat it now.',
    body: `Have ${String(FAST_CARB_GRAMS)} grams of fast-acting carbohydrate now. Check again in ${String(RECHECK_MINUTES)} minutes, and repeat if you have not recovered.`,
    escalation: 'Get help if you cannot treat yourself.',
    gate: `Do not inject until you are above ${String(HYPO_LEVEL_1)} mg/dL.`,
  },
  bandB: {
    title: 'You are well below target.',
    body: 'Consider eating before injecting, and check again afterwards.',
  },
  /**
   * §10.5 v9 — the instruction NEVER changes between the full card and the
   * compact line. v8's compact copy read "Above 250 again — if this is new, or
   * you feel unwell, check ketones", and for a repeated high reading in someone
   * who feels well BOTH CONDITIONS ARE FALSE: the warning stayed visible while
   * the action quietly became optional. CDC guidance makes a reading at or above
   * 250 **or** illness a reason to test; novelty is not a prerequisite.
   *
   * "Above 250" rather than "above 250 again", because the derivation never
   * witnessed a repetition — §10.5's residual is that an unrecorded calculation
   * leaves no trace, so a later result can render full again.
   */
  bandE: {
    title: `Above ${String(KETONE_ADVISORY)} — check ketones`,
    body: 'If ketones are present or you feel unwell, contact your clinician.',
  },

  // ── §8.1's timing ─────────────────────────────────────────────────────────
  timing: {
    before: `Inject ${String(EAT_MIN)}–${String(EAT_MAX)} minutes before eating.`,
    beforeDetail:
      'The clock starts when you confirm the amount on the next screen — not now, and not when the dose was worked out.',
    // §8.1 — band B INVERTS it. A 30-minute fast at 71 mg/dL is wrong.
    eatFirst: 'You are low-ish — eat first, then inject.',
    injectedAt: (at: string, eatBy: string): string => `Injected ${at} → eat around ${eatBy}.`,
  },

  // ── §4.2's lexical messages ───────────────────────────────────────────────
  /**
   * §4.2 v3 — the comma message must NOT presume decimal intent. Pakistan uses
   * period-decimal and comma-GROUPING, so the plausible keystroke here means
   * grouping: "2,50" intends 250. v3's "Use a period for decimals" instructs the
   * grouping-intent user to retype it as "2.50" — 0.25 units instead of 25, the
   * identical hundredfold under-dose, one obedience step later.
   */
  lexical: (reason: LexicalReason): string => {
    switch (reason) {
      case 'comma':
        return 'Remove the comma — type 250, not 2,50.';
      case 'too_many_decimals':
        return 'Two decimal places at most.';
      case 'too_long':
        return 'That is more digits than this can be. Check the number.';
      case 'signed':
        return 'Numbers only, with no plus or minus sign.';
      case 'non_ascii_digits':
        return 'Please type the number in English digits.';
      case 'not_a_number':
        return 'Numbers only. Check what you typed.';
    }
  },

  range: {
    injectedAbove: `A syringe does not hold more than ${String(MAX_INJECTED)} units.`,
    injectedZero: 'Tapping this says you injected. Enter how much.',
  },

  /**
   * §4.3 step 3 — below 20 or exactly zero is a COMBINED
   * invalid-reading-and-possible-low response, never one half silently chosen.
   * It renders INSIDE the block, because §10.5 rank 1 leaves nowhere else: a
   * band C/D block shows nothing beside it. Both readings of the impossible
   * number are stated — a mistyped entry by someone who may in fact be high,
   * and a meter past the bottom of its range — and neither is endorsed over
   * the other, the same refusal §10.6 item 7 makes about the dose.
   */
  blockedInvalidReading: `A meter cannot read below ${String(MIN_BLOOD_SUGAR)}, so that is not a real reading. If it showed LO, treat now. If you mistyped it, check again before anything else.`,

  /**
   * §4.5, written in v3 after v2 promised the text and never supplied it. This
   * is where the §3.1 disagreement actually resolves.
   */
  meterHi: {
    title: 'Meter showing HI?',
    body: `Enter ${String(MAX_BLOOD_SUGAR)}. This dose treats ${String(MAX_BLOOD_SUGAR)} and is probably too little — treat it as a minimum, not the answer. Check ketones now. If ketones are present, or you are vomiting, this is an emergency: injected insulin alone will not treat diabetic ketoacidosis.`,
  },
  /**
   * §4.5 and BUILD-NOTES note 2 — an out-of-range READING gets "check the
   * number", never band E's ketone wording, because "check ketones" is a
   * confusing reply to a typo. The core already produced `above_range` /
   * `below_range` as distinct reasons precisely so the interface could tell the
   * HI case from the LO case; until now the interface never used them, and
   * tapping "Work out the dose" on a 7090 did NOTHING AT ALL.
   */
  entryRange: {
    readingHigh: (max: number): string =>
      `A meter does not read above ${String(max)}. Check the number — if it really is showing HI, enter ${String(max)}.`,
    readingLow: (min: number): string =>
      `A meter does not read below ${String(min)}. Check the number — if it is showing LO, do not enter a number at all. Treat first.`,
    carbsHigh: (max: number): string =>
      `That is more than ${String(max)} grams of carbohydrate. Check the number — this is the carbohydrate in the food, not what the plate weighs.`,
    carbsLow: 'Carbohydrate cannot be negative.',
  },

  /**
   * §4.3 step 5 — "blank and blank is no result, NOT '0 units'". The core has
   * always been right about that and the interface rendered NOTHING for it, so
   * tapping "Work out the dose" with both fields empty did nothing at all. Same
   * dead end as the out-of-range reading in note 38, reached a different way:
   * the outcome existed, the words did not.
   *
   * Two shapes, because the two branches mean different things. Nothing entered
   * is a prompt; a reading at or below target with no carbohydrate is a real
   * answer — there is nothing to dose for.
   */
  noResult: {
    nothingEntered:
      'Nothing entered yet. Put in the carbohydrate for this meal, and your blood sugar if you have it.',
    nothingToDose: (target: number): string =>
      `No carbohydrate, and your blood sugar is at or below ${String(target)}. There is nothing to dose for — this is not "0 units", it is no dose at all.`,
  },

  meterLo: {
    title: 'Meter showing LO?',
    body: `Do not enter a number. Treat now — ${String(FAST_CARB_GRAMS)} grams of fast-acting carbohydrate, and check again in ${String(RECHECK_MINUTES)} minutes.`,
  },

  /**
   * §4.5 — the control that opens `meterHi` and `meterLo` on the reading
   * screen. A question rather than a bare "More", because on this screen it
   * stands beside a hint, not a list it is visibly truncating.
   */
  meterGuidance: 'Meter showing HI or LO?',

  // ── §4.6's blank reading ──────────────────────────────────────────────────
  blankReading: {
    title: 'No reading entered.',
    body: `This covers carbohydrates only — it cannot check whether you are low. If you feel low, test first. Do not use this if you might be below ${String(HYPO_LEVEL_1)} mg/dL.`,
    accept: 'I understand — carbohydrates only',
  },

  // ── §6.2 and §6.3's confirmation ──────────────────────────────────────────
  /**
   * §6.3 — the confirmation shows the INPUTS, not the dose. "The error is in the
   * input, so the input is what must be read. Showing the answer lets him check
   * the answer and skip the inputs, which is the failure the tier exists to
   * prevent."
   */
  confirm: {
    title: 'That will be a large dose. Check those two numbers.',
    reveal: 'Show the dose',
    change: 'Change them',
    noReading: 'No reading entered',
  },

  // ── §6.4's bound ──────────────────────────────────────────────────────────
  /** §6.4 — "the app is wrong, not the user", and it cannot be overridden. */
  boundFailure: {
    title: 'Something is wrong with this app, not with your numbers.',
    body: 'It worked out a dose larger than your settings can possibly produce, so it will not show it. Do not inject from this screen. Work the dose out the way you did before this app existed.',
  },

  // ── §7.4 and §7.4.1's stacking ────────────────────────────────────────────
  stacking: {
    recentDose: (amount: string, hours: number): string =>
      `Last dose: ${amount}, ${String(hours)} hour${hours === 1 ? '' : 's'} ago — may still be acting.`,
    /**
     * §7.5 — "no usable recent record" must never silently assert "no recent
     * insulin".
     */
    missingHistory: `No recent dose recorded. If you injected within the last 4 hours, this correction may stack.`,
    /** §7.6 — the app never converts "untrustworthy record" into "no insulin". */
    invalidTime: 'One dose record has an invalid time and is being ignored.',
    negativeApplied:
      'You injected recently. Your reading is below target, so the correction is being applied in full — holding it back would give you more insulin, not less.',
    suppressedTitle: 'Correction held back',
    /**
     * §7.4.1 — the consequence in HIS OWN UNITS, never "are you sure?".
     *
     * The wording is "at most about N — likely less this far in", NEVER a bare
     * figure. v3 presented the ceiling as an estimate, which overstates by
     * roughly 2x: at two hours into a ~6 hour profile about 110-135 mg/dL
     * genuinely remains, and by 3.5 hours only 65-90. Overstating discourages a
     * correction that is actually needed — at 400 mg/dL he would wait for 180
     * that is not coming and sit near 310 for hours, which §3.1 calls the unsafe
     * direction.
     */
    ceiling: (amount: string, hours: number, mgDl: number): string =>
      `You injected ${amount} ${String(hours)} hour${hours === 1 ? '' : 's'} ago. That insulin may still lower you by at most about ${String(mgDl)} mg/dL on its own — likely less this far in.`,
    mealOnly: 'Covering carbohydrates only',
    overrideAction: (candidate: string): string => `Add the correction anyway → ${candidate}`,
    /** §7.4.1 v4 — when either figure reaches the threshold, NO numbers show. */
    overrideWithheld: 'Add the correction anyway',
    held: 'held back, you injected recently',
  },

  // ── §6.5's plausibility advisory ──────────────────────────────────────────
  /**
   * §6.5 — a REMINDER, not an accusation. v4's "Did you mean 200?" is wrong copy
   * on every genuine small entry, and "a 20 g entry is either a real snack or a
   * 200→20 typo, and nothing at entry time distinguishes them" — the
   * false-positive set is identical to the true-positive set. The copy has to
   * read correctly in both cases or it dies before the one firing that matters.
   *
   * No window claim: v3 said "last month" while using the last 30 entries, about
   * five days at his rate. The message states the baseline value, never a period.
   */
  advisory: {
    low: (carbs: string, baseline: string): string =>
      `${carbs} g is smaller than your usual meals, which are around ${baseline} g. Check that's right.`,
    high: (carbs: string, baseline: string): string =>
      `${carbs} g is larger than your usual meals, which are around ${baseline} g. Check that's right.`,
    /** §6.5 — "disabled and declared", as a settings status line. */
    notEnoughHistory: (eligible: number, needed: number): string =>
      `Meal-size check: not enough history yet (${String(eligible)} of ${String(needed)} meals logged).`,
    highDisabled: 'Upper check off — your meals are large enough that it could never trigger.',
    active: (baseline: string): string => `Meal-size check: on, against a usual meal of ${baseline} g.`,
  },

  // ── §7.1, §7.2, §7.3 — logging ────────────────────────────────────────────
  log: {
    injected: 'I injected this',
    /**
     * §7.2 — *"**Tap after §8.2 expiry** is permitted with amended wording (the
     * log records what he did, and he may genuinely have injected at minute
     * 16), but the recorded timestamp is the tap time and the wording says so."*
     *
     * This IS the amended wording, and the clause it answers is the last one:
     * the label states the timestamp, because that is the fact a person cannot
     * otherwise see and the one the record depends on.
     *
     * Until 2026-09-11 the expired result replaced the log control with "Check
     * again" under a comment citing §8.2 — a rule §8.2 does not contain; it
     * specifies a staleness banner and says nothing about removing controls. So
     * someone who calculated, was interrupted, injected at minute 16 and came
     * back could not record the injection at all, and §7.4's gate went blind on
     * a real dose. Losing a row is worse than logging a late one.
     */
    injectedAfterExpiry: 'I already injected — log it at the current time',
    amountQuestion: 'How many units did you actually inject?',
    amountHint:
      'Starts at what the app worked out. Change it if you injected something different — the record should say what happened.',
    amountOnlyChance:
      'Set it now — this is the only moment it can be changed. Afterwards a row can be deleted, but never edited.',
    commitIsHere:
      'Tapping below is the commit. It writes the row and starts the clock, in one transaction.',
    commit: 'Log this injection',
    /** §7.1 — the divergence confirmation, which v9 named and never defined. */
    divergent: (calculated: string, injected: string): string =>
      `The app worked out ${calculated} and you have entered ${injected}. That is a large difference — check it before recording.`,
    /**
     * §7.1 — the tap that stands by the divergent amount. It asserts the fact
     * being recorded, like "I understand — carbohydrates only" does, because
     * the record should say what happened (§7.1) and a bare "yes" invites a
     * tap-through.
     */
    divergentAction: 'It is what I injected — log it',
    saved: (amount: string, at: string): string => `Logged ${amount} at ${at}`,
    /**
     * §7.2 — "the injection has already happened. A failed disk write does not
     * make it unknown to the running session." And the timer starts regardless.
     */
    /**
     * §7.2 — CORRECTED 2026-09-11. Both halves of the previous wording were
     * false, and this is the screen a person reads while deciding whether to
     * inject again.
     *
     * "retrying": nothing retries. `log_save_failed` is dispatched once from
     * the commit path and no code re-attempts the write, so `save.attempts`
     * cannot exceed 1.
     *
     * "still counted": §11.2's snapshot takes `lastDose` from the DATABASE via
     * `contextFrom`, and a failed write never reached it. `inSessionLastDose`
     * was written to close exactly this gap and has no call site, so the next
     * calculation inside the suppress window re-applies the full correction on
     * top of insulin already acting — the stacking event §7.4 exists to prevent,
     * reached through a reassurance.
     *
     * REVISED the same day, once `gateLastDose` landed: the gate now does read
     * the pending dose, so "it counts" became true and is said again — but only
     * for as long as the app is open, because nothing persists it. "Retrying"
     * stays out until something actually retries. The words track what the code
     * does, which is the whole point of the correction above.
     */
    pending: `Couldn't save this dose. It still counts toward your next calculation while the app is open, but closing the app will lose it — write it down. Within ${String(STACK_SUPPRESS_HOURS)} hours that matters: a correction could stack.`,
    /**
     * §7.2 — the escalation, after a write and its automatic retry have both
     * failed. It follows him off the logged screen, so it says WHICH dose
     * rather than "this one": by the time he sees it he may be two screens away.
     */
    stuck: (amount: string): string => `${amount} is still not saved.`,
    stuckAction: 'Try again',
    stuckDismiss: 'Not now',
    /** §7.3 — the confirmation quotes the INJECTED figure, the one §7.4 uses. */
    deleteTitle: (amount: string, at: string): string => `Delete the ${amount} from ${at}?`,
    deleteConsequence:
      'The stacking check is currently using this dose. Delete it only if you did not inject it.',
    deleteAction: 'Delete this entry',
    noEdit: 'Rows can be deleted, never edited.',
  },

  // ── §7.8 — readings without injections ────────────────────────────────────
  reading: {
    offer: 'Record this reading',
    title: 'Record this reading',
    hint: 'It is saved as a reading with no dose, which is exactly what happened.',
    noteQuestion: 'Anything worth noting?',
    notes: {
      before_bed: 'before bed',
      overnight: 'overnight',
      felt_low: 'felt low',
      after_exercise: 'after exercise',
    },
    save: 'Save this reading',
  },

  // ── §7.9 — clearing ───────────────────────────────────────────────────────
  clear: {
    recordTitle: (count: number): string => `Delete ${String(count)} entries?`,
    recordBody: (from: string, to: string, readings: number): string =>
      `Everything recorded from ${from} to ${to}, including ${String(readings)} readings with no dose. Your prescription and its history stay. This cannot be undone.`,
    exportFirst: 'Save a copy first',
    recordAction: 'Delete the record',
    startOverTitle: 'Start over?',
    startOverBody:
      'Everything goes: the record, your prescription, its history, and the note about how you dosed before. Setup will run again. This cannot be undone.',
    startOverAction: 'Start over',
    /** §7.9 — three states, and the third is NOT the second. */
    stackingKnown: (at: string): string =>
      `The stacking check is using a dose from ${at}. After this it will not know about it, and the next result will not hold anything back.`,
    /**
     * "Rendering 'no recent dose' when the truth is 'unknown' is §7.5's condemned
     * class — a FALSE SAFETY CLAIM — and it arrives here through a gate that
     * cannot see. Unknown states get their own copy, never the reassuring
     * neighbour's."
     */
    stackingUnknown:
      'This app cannot read your record right now, so it cannot tell you whether a recent dose is about to be forgotten. If you injected in the last few hours, write down what and when before you continue.',
  },

  // ── §7.7.1 — the two exports ──────────────────────────────────────────────
  /** §7.7.1 — named by PURPOSE, never by file type, and §10.2's rule applies. */
  exports: {
    moveTitle: 'Move to another phone',
    moveBody: 'The only file this app can load back. Keep it somewhere you will still have it.',
    saveTitle: 'Save the record',
    saveBody:
      'A page anyone can open and read, on any phone or computer. Good for showing a doctor. It cannot be loaded back into the app.',
    /**
     * §7.7.1 v23 — the counter reports only the act the app performed. "Last
     * moved to another phone" overstates a local download; "last saved"
     * overstates it too. What the app observes is that a download STARTED.
     */
    lastCopy: (days: number): string =>
      `Last made a copy you can restore from: ${days === 0 ? 'today' : `${String(days)} day${days === 1 ? '' : 's'} ago`}`,
    neverCopied: 'No copy saved yet',
    /**
     * Both buttons used to read "Make it". Two controls with the SAME
     * accessible name on one screen is an accessibility defect outright — a
     * screen reader announces "Make it, Make it" with nothing to tell them
     * apart — and "make" never said what would be made. "Download" says what
     * happens, and the noun says which of the two you get.
     */
    makeBackup: 'Download backup',
    makeReport: 'Download report',
  },

  // ── §6.7 — the dosing-history note ────────────────────────────────────────
  dosingHistory: {
    question: 'Before you started using this app, how did you decide your mealtime insulin dose?',
    hint: 'A sentence is more use than a number — what mattered was how the dose was chosen, not just its size.',
    skip: 'Skip for now',
    /** §6.7 v19 — declining CONFIRMS FIRST, stating the consequence. */
    declineAction: "Don't ask again",
    declineConfirm:
      "You won't be asked again, and there is no other way to enter this later. Are you sure?",
    save: 'Save this',
  },

  // ── §10.6 — first run and disclosure ──────────────────────────────────────
  firstRun: {
    disclaimerTitle: 'Read this before you use it.',
    disclaimerBody: [
      'This is not a medical device and it has no regulatory clearance. It has not been clinically validated.',
      'It does the arithmetic your doctor already prescribed. Check every dose it gives you before you inject.',
      'It is configured for one specific person’s prescription. If you are not that person, the numbers here are wrong for you.',
      'MealUnits is not endorsed by, and has no connection with, the makers of your meter or your insulin.',
    ],
    disclaimerAccept: 'I understand — use at my own risk',
    /**
     * §10.6 item 7 — the wording deliberately endorses NEITHER figure. §1.4's
     * whole finding is that the app's number and his habit disagree and the
     * RECORD settles which is right. Copy leaning either way would be the
     * anchoring hazard that removed §6.7's result-screen line.
     */
    disagreementTitle: 'If this number looks nothing like what you usually take',
    disagreementBody:
      'This app works out doses from the three numbers your doctor gave you. If what it shows is very different from what you usually inject, do not assume either number is the right one. Neither this app nor your usual dose has been checked against the other. Show your doctor the exported record and let them decide.',
  },

  // ── §10.6 item 5 — the two insulins ───────────────────────────────────────
  /** Neither "basal" nor "bolus" appears in the interface (§10.2). */
  twoInsulins: {
    title: 'What this does and does not cover',
    body: 'There are two kinds of insulin. Your Lantus is the slow background one you take once a day — this app does not calculate it and never changes it. Your Humulin R is the fast one you take with meals, and that is the only number this app works out.',
  },

  /** §10.6 item 3 — disclosing the gap is the alternative to modelling it (§9). */
  doesNotKnow: {
    title: 'What this app does not know about',
    items: [
      'Insulin you injected that it has no record of.',
      'Exercise — one of the two most common causes of low blood sugar it cannot see.',
      'Alcohol — the other one.',
      'Illness, which usually raises what you need.',
      'Fat and protein, which move blood sugar hours later.',
      'Any change in what you need at different times of day.',
    ],
  },

  // ── §10.1 — naming the two ratios ─────────────────────────────────────────
  settings: {
    targetQuestion: 'What should a correction aim for?',
    targetUnit: 'MG/DL',
    /** The target had no explanatory line at all, only the question. */
    targetClinical:
      'The blood sugar your doctor wants you at before a meal. Often between 100 and 150. Hasham\u2019s is 150.',
    isfSentence: (value: string): string => `1 unit lowers blood sugar by ${value} mg/dL`,
    isfQuestion: 'How far does one unit lower your blood sugar?',
    /**
     * The clinical NAME and the MEANING, in that order and in two sentences.
     * Momin's note: the name line was worth keeping, and the meaning has to be
     * there too for someone who has never been told what "1 to 30" is.
     *
     * The worked example names Hasham, with his permission — a real
     * prescription is a better illustration than an invented one, and naming a
     * person makes it unmistakably an EXAMPLE rather than a default.
     */
    isfClinical:
      'Insulin sensitivity factor (ISF). Often written "1 to 30" — meaning one unit brings your blood sugar down 30 mg/dL. Hasham\u2019s is 30.',
    icrSentence: (value: string): string => `1 unit covers ${value} grams of carbohydrate`,
    icrQuestion: 'How much carbohydrate does one unit cover?',
    icrClinical:
      'Insulin-to-carbohydrate ratio (ICR). Often written "1 to 10" — meaning one unit covers 10 grams of carbohydrate. Hasham\u2019s is 10.',
    icrUnit: 'GRAMS OF CARBOHYDRATE',
    /** §10.1.6 — the delta confirmation. A ratio fat-fingered 10→40 is inside
     * the accepted range, produces 5 units instead of 20 on a 200 g meal, and
     * passes every other check. */
    deltaTitle: 'Check this change',
    delta: (was: string, now: string): string => `was: ${was}\nnow: ${now}`,
    softConfirm: 'That is outside the usual range. Is it right?',
    /** §1.3 — visually separated, and labelled so it cannot read as a dose. */
    /**
     * §8.5 — "setup states the assumption". It never did: until 2026-09-12 the
     * string `U-100` appeared nowhere in `src/` except a passing mention in the
     * rounding copy, so the one place a concentration mismatch is catchable said
     * nothing. §8.5's OTHER half — `6 units (U-100)` on the output — was dropped
     * in the same amendment: §10.5 budgets what shares space with a dose, and
     * naming the insulin is something a person can check against the vial in
     * their hand where a concentration is not.
     *
     * It sits after the ratios and before rounding because that is where the
     * numbers stop and the word "unit" starts doing the work.
     */
    unitAssumption:
      'These are units of U-100 insulin — the standard strength, and what Humulin R is. There is no setting for any other strength, deliberately: one that could be set wrong would cause the exact 2.5x error it was meant to prevent. If your insulin is not U-100, these numbers are not right for it.',
    basalTitle: 'Your Lantus dose',
    basalNote: 'Set by your doctor, not calculated here.',
    modeQuestion: 'What can your syringe measure?',
    /**
     * §15 — the MHRA finding that only 30% of 46 audited apps documented their
     * formula applies to the ROUNDING as much as to the arithmetic. Five modes
     * were offered with no explanation of any of them, and one of them (`ceil`)
     * is unsafe by default. A pointer is not documentation, but it is the
     * difference between a hidden choice and a findable one.
     */
    modeHint: 'Not sure which? "How this works" explains all five.',
    /**
     * §6.2's confirmation tier, in his words. The previous wording — "Ask me to
     * re-read my numbers at or above" — read as "check your meter again", which
     * is a different action entirely. What it actually does is hide the dose and
     * show back the two figures you TYPED, so a fat-fingered entry is caught
     * before it becomes an injection.
     */
    /**
     * §1.2 as ruled — the prefill has to announce itself. Momin's own reaction on
     * first sight was the exact failure: the three values looked settled, so the
     * blocked "Save and start" read as a bug rather than as work still to do.
     *
     * It also carries weight the other way. `docs/CLINICAL.md` records the
     * residual risk of prefilling — that someone taps through without reading —
     * and a line asking him to check the three, next to a prompt on the one most
     * likely to have moved, is what makes tapping through a choice rather than an
     * accident.
     */
    /**
     * Optional, and the empty string is a first-class answer. Forcing a name
     * would add a setup step to an app whose whole argument for existing is
     * that it has to be easier than injecting a fixed 24-25 units (§1.4).
     */
    nameQuestion: 'What should the app call you?',
    nameHint: 'Optional. It appears on your record so a doctor can tell whose it is.',
    /** §10.5 — the reading screen only. Never on a screen showing a dose. */
    greeting: (name: string): string => `Hey ${name}`,
    prefilledTitle: 'Check these three before you start',
    prefilledBody:
      'They are already filled in from the prescription — target, ISF and ICR. Change any that your doctor has changed. Then add your Lantus details below to finish.',
    thresholdHeading: 'When to double-check',
    thresholdQuestion: 'Double-check my typing when the dose reaches',
    thresholdUnit: 'UNITS',
    /** §5.1 — `ceil` is gated behind a one-time acknowledgement. */
    ceilGate:
      'Rounding up adds as much as a whole unit to every dose, always in the direction of low blood sugar. On a 1-unit correction that doubles it.',
    ceilAccept: 'I understand — always round up',
  },

  /**
   * §5.1's five modes, explained. They were selectable and undocumented — and
   * they are NOT neutral peers: `ceil` adds up to a whole unit to every dose,
   * always toward low blood sugar, which is why §5.1 gates it.
   */
  rounding: {
    title: 'Rounding, and why there are five choices',
    intro:
      'A calculation rarely lands on a number your syringe can measure. These decide what happens to the remainder. Only the total is ever rounded — never the correction or the meal dose on their own.',
    modes: [
      ['Whole units', 'To the nearest whole unit, so 4.4 becomes 4 and 4.6 becomes 5. Exactly half rounds away from zero: 4.5 becomes 5. This is right for an ordinary U-100 syringe, which is marked in whole units.'],
      ['Half units', 'To the nearest half, so 4.37 becomes 4.5. Choose this only if your pen or syringe actually has half-unit markings — a NovoPen Echo or a Humalog Junior KwikPen. On a whole-unit syringe it asks you to measure something you cannot see.'],
      ['Always round up', 'To the next whole unit, so 4.1 becomes 5. This adds insulin on every single dose, always in the direction of low blood sugar. At a sensitivity of 30 that is up to 30 mg/dL of extra drop you did not intend — on a 1-unit correction it doubles the dose. The app asks you to confirm this one before it will use it.'],
      ['Always round down', 'To the whole unit below, so 4.9 becomes 4. This gives slightly less insulin every time, which errs toward higher blood sugar. Some clinicians ask for this deliberately.'],
      ['Show the exact number', 'No rounding — 4.37 stays 4.37. This is for reading the true figure, not for measuring: a syringe cannot draw 4.37. Useful with a pump, or to see what the app really worked out.'],
    ] as const,
    closing:
      'If you are not sure, leave it on whole units. It is what an ordinary syringe measures, and it is the app\u2019s default for that reason.',
  },

  // ── §8.2 — staleness ──────────────────────────────────────────────────────
  expired: (at: string): string => `This result is from ${at}. Check your blood sugar again.`,
  /**
   * §8.2 on a BLOCK, which needs different words from a stale dose.
   *
   * The result screen says "this result is from…", because what went stale
   * there is an answer. On a block there is no answer — what went stale is the
   * READING, and the screen's own instruction was "check again in 15 minutes".
   * Past that point it is showing a number the user was told to replace.
   *
   * It does not suppress the treat-first guidance: being low is still the most
   * likely reading of an old low. It says the number is old and asks for a new
   * one, which is the same thing the body text already asked for.
   */
  expiredBlock: (at: string): string =>
    `That reading was at ${at}. Check your blood sugar again before deciding anything — if you have treated, it will have changed.`,

  /** §11.3 — the fail-closed screen. */
  failClosed: {
    title: 'This app cannot read your record.',
    body: 'It was saved by a newer version than the one running here. Nothing has been lost. Opening the newer version will read it normally.',
    settingsHeading: 'Your settings, from the recovery copy',
    copyThemDown: 'Copy these down before you start over — after that, this screen is gone too.',
    escape: 'Start over',
    blocked: 'Close this app’s other tabs and try again.',
  },

  /** §11.3 — another tab deleted the record while this one was open. */
  recordDeleted: {
    title: 'The record was cleared in another tab.',
    body: 'This screen is out of date. Setup will run again.',
  },

  /** §10.8 — show the running build version. */
  build: (version: string, build: string): string => `${version} (${build})`,

  more: 'More',
  /**
   * The word alone. An arrow glyph was tried and Momin's verdict on the phone
   * was that it read as misaligned — U+2190's vertical centring is a property
   * of the face, not something CSS can reliably correct, and a nudge tuned on a
   * Mac is a guess about Android. The control is at the foot of the screen now,
   * which is the affordance the arrow was standing in for.
   */
  back: 'Back',
  next: 'Next',
  workItOut: 'Work out the dose',
  cancel: 'Cancel',
  done: 'Done',
} as const;
