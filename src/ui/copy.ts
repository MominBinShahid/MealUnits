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
 * term so a person can talk to their doctor.
 */

import {
  EAT_DELAY_MINUTES,
  FAST_CARB_GRAMS,
  HYPO_LEVEL_1,
  KETONE_ADVISORY,
  RANGE,
  RECHECK_MINUTES,
  RESULT_EXPIRY_MINUTES,
  STACK_ADVISE_HOURS,
  STACK_SUPPRESS_HOURS,
} from '../config.js';
import { formatHundredths } from '../core/decimal.js';
import type { LexicalReason, RoundingMode } from '../core/types.js';

const [EAT_MIN, EAT_MAX] = EAT_DELAY_MINUTES;
const [MIN_BLOOD_SUGAR, MAX_BLOOD_SUGAR] = RANGE.bloodSugar.hard;
const [, MAX_INJECTED] = RANGE.injected.hard;

/**
 * §10.4 — "units", spelled out, always. `4U` has been misread as 40.
 *
 * The space is U+00A0, so the line cannot break between the number and the
 * word. A break renders "10" above "units", which rejoins in the reader's
 * head as "10Units" — the same misreading, by a different route.
 */
export function units(hundredths: number): string {
  const value = formatHundredths(hundredths);
  return `${value}\u00A0${value === '1' ? 'unit' : 'units'}`;
}

export const COPY = {
  appName: 'MealUnits',

  /**
   * §10.6's explanation page — five sections added 2026-09-12, each for a term
   * the app already used and had never defined.
   *
   * Every window here is INTERPOLATED. The page describes gates whose numbers
   * live in config.ts, and prose that states them as digits drifts silently the
   * day one changes — the defect fixed in `stacking.missingHistory`, which said
   * "4 hours" as characters while the same file read the constant eleven lines
   * away. `check-plan.py` now catches that class.
   */
  explain: {
    /**
     * The FIRST section of "How this works", added 2026-09-13. The disclaimer
     * states the condition as a rule; this explains it, which is the division
     * this project uses everywhere — the gate says what, the reference says why.
     *
     * Pumps are named alongside type 2 deliberately. Someone with type 1 on a
     * pump is in the population this app is for and is still the wrong reader:
     * their device works out doses its own way, from settings this app does not
     * hold, and a second opinion from different arithmetic is a hazard rather
     * than a cross-check.
     *
     * The age line is honest rather than restrictive. The app has no age
     * handling at all, ISPAD's paediatric guidance is cited in CLINICAL.md, and
     * nothing here was checked for a child's dosing. Saying so is truer than
     * either refusing children or silently claiming the scope.
     */
    audienceTitle: 'Who this is for',
    /**
     * The bold part is named `condition` rather than found by position, because
     * the NAME is the reason it is bold: a reader skimming this page to find
     * out whether the app is theirs should be able to answer that without
     * reading a sentence.
     *
     * The first attempt was alternating parts — plain, bold, plain — and
     * §11.8's lint rule rejected the `index % 2` that renders it, correctly:
     * the 2 was a magic number encoding a convention. Naming the field removes
     * the arithmetic and says what the emphasis MEANS, which is the better
     * shape anyway.
     *
     * Not a mini-markdown in the copy, deliberately. §10.2's premise is that
     * the words ARE the specification, and a parser between them and the screen
     * is one more thing that can disagree with them.
     */
    audienceBody: [
      {
        lead: 'This app is for people with ',
        condition: 'type 1',
        rest: ' diabetes who work out each mealtime dose from two things: how far above target their blood sugar is, and how much carbohydrate they are about to eat. It assumes a long-acting insulin once a day and a short-acting one at meals.',
      },
      {
        // Plain, on Momin's ruling 2026-09-13. It was bold for one revision, to
        // pair with the type 1 above. Two emphases on one screen split the
        // reader's attention instead of answering one question, and this
        // paragraph already opens with the words a type 2 reader is looking for.
        lead: 'If you have type 2 diabetes your treatment may be tablets, a fixed insulin dose, a weekly injection, or a mix — and none of those are what this arithmetic describes. The same is true if a pump delivers your insulin: a pump works out doses its own way, from settings this app cannot see.',
        condition: null,
        rest: '',
      },
      {
        lead: 'It was built for an adult, and nothing in it has been checked against how a child is dosed. If you are working out a child’s dose, take the numbers to their doctor before you rely on them.',
        condition: null,
        rest: '',
      },
    ] as const,

    namesTitle: 'The names your doctor uses',
    namesLead: 'Those two numbers have clinical names, and your doctor will use them.',
    /**
     * The two clinical definitions are REUSED from settings rather than written
     * again. Two copies of a clinical definition is two things to keep in step,
     * and §10.2's premise is that the words are the specification — so when T5
     * changes how those examples read, both places change together.
     */
    namesClose:
      'Both are in Settings, labelled ISF and ICR, so if your doctor says "your ISF is 30" you know which field that is.',

    carbTitle: 'What counts as carbohydrate',
    carbBody: [
      'The reading comes off your meter. The grams do not — that number is yours, and it is the one thing here the app takes entirely on trust. What it is counting is the carbohydrate in the food: starch and sugar. Rice, roti, potato, biryani, daal, fruit and the sugar in chai all count. A 250\u00A0g plate of biryani is about 50\u00A0g of carbohydrate, so this is never the weight of what is on the plate.',
      'Fibre is carbohydrate as well, but your body does not absorb it, so it does not raise blood sugar the way starch does. Some doctors subtract it from the total and some do not. Ask yours which they want, then do the same thing every meal — the app cannot tell which rule you used, and counting the same way every time helps it more than being exactly right once.',
      'Protein and fat are not carbohydrate and do not belong in this number. They do move blood sugar, hours later, and that is in "What this app does not know about" below.',
    ] as const,

    stackingTitle: 'What "stacking" means',
    stackingBody: [
      'Fast insulin does not finish when your blood sugar comes down. It goes on working for hours after you inject it. If you take a correction while an earlier dose is still acting, the two add together, so the total can take you lower than either one was meant to. That is stacking, and it is the word the app uses on the result screen and in Settings.',
      `For the first ${String(STACK_SUPPRESS_HOURS)} hours after a dose you logged, the app holds the correction back and gives you the meal dose alone. It says "Correction held back", and the correction is still there in the working, struck through, with its reason. The meal part is never held back — food needs covering no matter how much insulin is still working. And when you are at or below target the correction makes the dose smaller; that kind is always applied in full, because holding it back would give you more insulin, not less.`,
      `Between ${String(STACK_SUPPRESS_HOURS)} and ${String(STACK_ADVISE_HOURS)} hours the correction is applied in full and the app tells you the last dose may still be acting. After ${String(STACK_ADVISE_HOURS)} hours it says nothing. None of this is a model of how much insulin is left in you — how long a dose lasts depends on how big it was, so the app refuses to draw that curve.`,
      'If you need the correction anyway — because the injection site did not absorb it, or the insulin has been in the heat, or you are ill — "Why is this smaller?" on the result screen adds it back. It tells you first how far the earlier dose could still lower you on its own. Using it is recorded on the entry, so the pattern is in your history.',
    ] as const,

    missingTitle: '"No recent dose recorded"',
    missingBody: `The stacking check knows one thing: what you logged. That line appears only when two things are both true: the app has no recent dose it can reason from, and it has no confidence in the record either. It does not mean you have no insulin still working. The app will not tell you that, because it cannot know it. If you injected within the last ${String(STACK_SUPPRESS_HOURS)} hours, nothing has been held back from the dose in front of you — read it as a correction sitting on top of insulin that is still working, and decide from there. If you log every injection, this check never has to appear.`,
    /**
     * BOTH halves of the condition are load-bearing and were got wrong once: the
     * caveat fires only when there is no usable record AND provenance is suspect
     * (`needsMissingHistoryCaveat`, and `deriveHistory`'s five conditions). v4
     * dropped the provenance half and the line appeared after every overnight
     * gap. Enumerating them is what stops the copy describing v4's bug.
     */
    missingConditions: [
      'nothing logged at all',
      'the newest entry is from before this app was installed',
      'the history was just imported',
      'an entry has a time the app cannot believe, so it was set aside',
      'an entry could not be read when the app opened, and was dropped',
    ] as const,

    expiryTitle: `Why a result expires after ${String(RESULT_EXPIRY_MINUTES)} minutes`,
    expiryBody: [
      `A dose is only as good as the reading it came from. ${String(RESULT_EXPIRY_MINUTES)} minutes after it is worked out the result dims, the screen says what time it was from, and "Check again" becomes the first thing on it. Nothing is deleted. The number is still there to read, and if you have already injected you can still log it — the entry records the time you tap, not the time the dose was worked out, and the button says so.`,
      `A double-check you already tapped through does not carry over. If you work the dose out again, the app asks again, because by then the ${String(STACK_SUPPRESS_HOURS)}-hour window may have passed, a correction that was being held back can come back, and the new total can be larger than the one you confirmed. A low reading goes stale the same way: the screen tells you what time that reading was and asks for a fresh one, and it goes on telling you to treat first.`,
    ] as const,

    whatDoTheseMean: 'What do these mean?',
  },

  /**
   * The carbohydrate reference, as a screen. Phase 1 is READ-ONLY: it never
   * writes into the carbohydrate field. That is the whole safety argument —
   * a wrong row can mislead someone, and can never silently drive a dose,
   * which is the property §7.8 gives readings applied to food.
   */
  foods: {
    navLabel: 'Food list',
    title: 'How much carbohydrate is in it',
    /**
     * Said before the list, not after. Someone who reads one number and leaves
     * should have met the caveat, and the caveat is the honest one: these are
     * estimates of a plate nobody weighed.
     */
    intro:
      'Estimates, not measurements of your plate. Read the number, then type it yourself — nothing here fills the box in for you.',
    searchLabel: 'Search food',
    searchHint: 'English or Roman Urdu — roti, chawal, qeema, biryani.',
    empty: (query: string): string =>
      `Nothing matches "${query}". Try the Urdu name, or a simpler word — "naan" rather than "tandoori naan".`,
    /**
     * §11.8's second condition made visible. A value whose confidence is hidden
     * is presented with the same authority as a lab measurement, and the
     * difference between those is the difference this table is built on.
     */
    confidenceLabel: { high: 'well established', medium: 'varies', low: 'poorly measured' } as const,
    variesPrefix: 'Varies: ',
    sourcePrefix: 'Source: ',
    /**
     * The single highest-value thing on the screen. One kitchen-scale reading
     * settles every bread row for that household, which no amount of table
     * detail can do.
     */
    weighOnce:
      'Weigh one of your own rotis once. Carbohydrate is just under half its cooked weight — times 0.46 — and every bread row below becomes yours rather than an average.',
    countNote: (shown: number, total: number): string =>
      shown === total ? `${String(total)} foods` : `${String(shown)} of ${String(total)} foods`,
  },

  // ── §3's bands ────────────────────────────────────────────────────────────
  bandC: {
    title: 'Treat this first. Do not inject.',
    body: `Have ${String(FAST_CARB_GRAMS)}\u00A0grams of fast-acting carbohydrate now, then check again in ${String(RECHECK_MINUTES)} minutes.`,
    // §3.3 — the block suppresses every INSULIN quantity. It does not suppress
    // the treatment instructions, which necessarily contain 15 grams, 15
    // minutes and 70 mg/dL. "The rule is no insulin dose numbers, not no digits."
    gate: `Do not inject until you are above ${String(HYPO_LEVEL_1)}\u00A0mg/dL.`,
  },
  bandD: {
    title: 'This is very low. Treat it now.',
    body: `Have ${String(FAST_CARB_GRAMS)}\u00A0grams of fast-acting carbohydrate now. Check again in ${String(RECHECK_MINUTES)} minutes, and repeat if you have not recovered.`,
    escalation: 'Get help if you cannot treat yourself.',
    gate: `Do not inject until you are above ${String(HYPO_LEVEL_1)}\u00A0mg/dL.`,
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
    body: 'Feeling unwell is its own reason to test, whatever your reading says. If ketones are present, contact your doctor.',
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
        return 'That is too many digits. Check the number.';
      case 'signed':
        return 'Numbers only, with no plus or minus sign.';
      case 'non_ascii_digits':
        return 'Please type the number in English digits.';
      case 'not_a_number':
        return 'Numbers only. Check what you typed.';
    }
  },

  range: {
    injectedAbove: `A syringe does not hold more than ${String(MAX_INJECTED)}\u00A0units.`,
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
      `That is more than ${String(max)}\u00A0grams of carbohydrate. Check the number — this is the carbohydrate in the food, not what the plate weighs.`,
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
      `No carbohydrate, and your blood sugar is at or below ${String(target)}. There is nothing to dose for — this is not "0\u00A0units", it is no dose at all.`,
  },

  meterLo: {
    title: 'Meter showing LO?',
    body: `Do not enter a number. Treat now — ${String(FAST_CARB_GRAMS)}\u00A0grams of fast-acting carbohydrate, and check again in ${String(RECHECK_MINUTES)} minutes.`,
  },

  /**
   * §4.5 — the control that opens `meterHi` and `meterLo` on the reading
   * screen. A question rather than a bare "More", because on this screen it
   * stands beside a hint, not a list it is visibly truncating.
   */
  meterGuidance: 'Meter showing HI or LO?',
  /**
   * The disclosure was one-way until 2026-09-13: tapping it set a flag that only
   * `new_calculation` cleared, so both cards stayed on the reading screen until a
   * whole dose cycle finished. Opening something with no way to close it is a
   * dead end of the same family as notes 38, 47 and 51.
   */
  meterGuidanceHide: 'Hide this',

  // ── §4.6's blank reading ──────────────────────────────────────────────────
  blankReading: {
    title: 'No reading entered.',
    body: `This covers carbohydrates only — it cannot check whether you are low. If you feel low, test first. Do not use this if you might be below ${String(HYPO_LEVEL_1)}\u00A0mg/dL.`,
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
    /**
     * The window is INTERPOLATED, not typed. Until 2026-09-12 this string said
     * "the last 4 hours" as characters while `pending` eleven lines down already
     * read `${String(STACK_SUPPRESS_HOURS)}` from config — the same file doing it
     * both ways, agreeing only by coincidence. Change the constant and this
     * sentence would have gone on naming the old window, in the one message
     * whose job is warning that a correction may stack.
     *
     * §11.8's lint rules cannot see it: they match numeric LITERALS, and a digit
     * inside a template string is just a character. `check-plan.py` catches the
     * class now (§20.3 — the checker gains the check in the edit that fixes it).
     */
    missingHistory: `No recent dose recorded. If you injected within the last ${String(STACK_SUPPRESS_HOURS)} hours, this correction may stack.`,
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
      `You injected ${amount} ${String(hours)} hour${hours === 1 ? '' : 's'} ago. That insulin may still lower you by at most about ${String(mgDl)}\u00A0mg/dL on its own — likely less this far in.`,
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
      `${carbs}\u00A0g is smaller than your usual meals, which are around ${baseline}\u00A0g. Check that's right.`,
    high: (carbs: string, baseline: string): string =>
      `${carbs}\u00A0g is larger than your usual meals, which are around ${baseline}\u00A0g. Check that's right.`,
    /** §6.5 — "disabled and declared", as a settings status line. */
    notEnoughHistory: (eligible: number, needed: number): string =>
      `Meal-size check: not enough history yet (${String(eligible)} of ${String(needed)} meals logged).`,
    highDisabled: 'Upper check off — your meals are large enough that it could never trigger.',
    active: (baseline: string): string => `Meal-size check: on, against a usual meal of ${baseline}\u00A0g.`,
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
      'Set it now — this is the only moment it can be changed. Afterwards an entry can be deleted, but never edited.',
    commitIsHere:
      'Tapping below is what saves it. The entry and the stacking clock both start at that tap.',
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
    noEdit: 'Entries can be deleted, never edited.',
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
    hint: 'A sentence is more use than a number — what matters is how the dose was chosen, not just its size.',
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
      // ADDED 2026-09-13. Until then the app never said which diabetes it was
      // for, anywhere — the only mention of the condition at all was "diabetic
      // ketoacidosis" inside the band E emergency wording. That was tolerable
      // while one person used it. It is not tolerable for an app about to be
      // made findable, because "insulin dose calculator" is searched by people
      // with type 2 just as often, and their regimen is not what this
      // arithmetic describes.
      //
      // Stated at the GATE rather than only in the reference, because §10.6
      // makes this screen inescapable and note 59 keeps the acknowledgement in
      // memory only — so it is read on every launch, before anything else.
      'This is for type 1 diabetes. It assumes you take a long-acting insulin every day and count carbohydrate at meals. A type 2 regimen works differently, and these numbers are not right for it.',
      'It works from three numbers your doctor gives you, and it fills in none of them. Another person’s numbers are wrong for you.',
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
    body: 'There are two kinds of insulin. The slow background one, taken once a day, is the one this app does not calculate and never changes. The fast one you take with meals is the only number this app works out.',
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
  /**
   * §12 — what this browser has promised about keeping the record, and what to
   * do when it has promised nothing.
   *
   * **Three states, because there are three answers.** A browser that will not
   * say is not a browser that deletes: reporting capability honestly forbids
   * claiming danger as much as it forbids claiming durability, and §12's rule
   * is explicit that a successful write does not prove persistence.
   *
   * The first sentence of the at-risk copy is the record, not the fix. Someone
   * reading a storage warning on an app holding their doses wants to know what
   * has happened to what they already logged, before they are told what to do
   * about it.
   *
   * iOS is named rather than described, and NOT as "Safari": every browser on
   * an iPhone is the same engine underneath, so a person using Chrome there is
   * affected and would read past a warning about Safari.
   */
  storage: {
    label: 'Keeping your record',
    durable: 'This browser has promised to keep it.',
    unknown: 'This browser has not said either way. Save a copy from time to time.',
    atRisk: 'This browser has not promised to keep it.',
    /**
     * Shown under `atRisk` in Settings. Seven days is not interpolated from a
     * constant because it is not ours — it is WebKit's policy, and a number in
     * `config.ts` would imply this app can change it.
     */
    atRiskWhy:
      'On an iPhone or iPad, a browser clears apps it has not seen for about a week \u2014 including everything logged here. Adding this to your home screen stops that.',
    /**
     * ONE bar, and it is the install offer wearing an honest reason.
     *
     * The storage warning and the install offer are the same message: one says
     * why, the other says what. A separate bar would have been a third one
     * stacking on the update prompt, and `promptBar` appends rather than
     * replaces — so the duplication was the bar, not the wording.
     *
     * This shape is for the browser that CANNOT be asked to install: iOS never
     * fires `beforeinstallprompt`, so the offer that prevents the loss was
     * never shown to the only people who needed it. The three taps are in the
     * text because putting them behind a button means a second bar.
     *
     * No "nothing has happened to your record" here, unlike the 404 page.
     * Nothing HAS happened — this is about next week — and reassuring someone
     * about a loss that has not occurred only muddies a short message.
     */
    atRiskBar: 'Your doses could be deleted. Tap Share, then \u201cAdd to Home Screen\u201d.',
    atRiskDismiss: 'Got it',
  },

  settings: {
    targetQuestion: 'What should a correction aim for?',
    /** The target had no explanatory line at all, only the question. */
    targetClinical:
      'The blood sugar your doctor wants you at before a meal. Often between 100 and 150. Hasham\u2019s is 150.',
    isfSentence: (value: string): string => `1\u00A0unit lowers blood sugar by ${value}\u00A0mg/dL`,
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
      'Insulin sensitivity factor (ISF). Often written "1 to 30" — meaning one unit brings your blood sugar down 30\u00A0mg/dL. Hasham\u2019s is 30.',
    icrSentence: (value: string): string => `1\u00A0unit covers ${value}\u00A0grams of carbohydrate`,
    icrQuestion: 'How much carbohydrate does one unit cover?',
    icrClinical:
      'Insulin-to-carbohydrate ratio (ICR). Often written "1 to 10" — meaning one unit covers 10\u00A0grams of carbohydrate. Hasham\u2019s is 10.',
    /** §10.1.6 — the delta confirmation. A ratio fat-fingered 10→40 is inside
     * the accepted range, produces 5 units instead of 20 on a 200 g meal, and
     * passes every other check. */
    deltaTitle: 'Check this change',
    softConfirm: 'That is outside the usual range. Is it right?',
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
      'These are units of U-100 insulin — the standard strength, and what Humulin R is. There is deliberately no setting for other strengths: a strength setting chosen wrong would cause the exact 2.5-times error it exists to prevent. If your insulin is not U-100, these numbers are not right for it.',
    /**
     * §1.3 — visually separated, and labelled so it cannot read as a dose.
     *
     * GENERIC, not the brand. Until 2026-09-13 this said "Your Lantus dose",
     * which contradicted the app's own data: the name is a setting the user
     * types into the "Which insulin" field directly below this heading, so
     * someone on Tresiba read "Your Lantus dose" above their own answer.
     *
     * It does not interpolate the typed name either. On Settings the field is
     * two lines below, so the heading would only repeat it — and it would
     * re-render on every keystroke. That used to matter a great deal — it is
     * what `captureFocus` existed to survive — and since T3 it is ordinary: the
     * field keeps its identity across a render. The reason to leave the heading
     * generic is the one above, not the rendering. On the doctor-facing screen
     * the name is already the first row of the list underneath.
     */
    /**
     * §8.1 and §3's windows are calibrated for ONE insulin, and until
     * 2026-09-13 nothing on screen said so — the app named Humulin R in four
     * places as though it were the reader's, which is a different claim from
     * the true one.
     *
     * `CLINICAL.md` §4: "This is the largest practical difference from a rapid
     * analog, and advice written for analogs is wrong here." §3: Humulin R
     * lasts 5-8 hours against 3-5 for an analog, and "that longer tail is why
     * this table's windows are what they are."
     *
     * So BOTH the pre-meal wait and the stacking windows are wrong for a
     * reader on a rapid analog, and they are the more common reader now that
     * `T5` widened the audience. This states it rather than adding a setting,
     * for `unitAssumption`'s reason: a setting that could be wrong causes the
     * error it was meant to prevent, and here it would change a label while
     * leaving the advice it implies untouched.
     *
     * The arithmetic is NOT disclaimed, and that is deliberate. ISF and ICR are
     * prescribed for the insulin the reader actually takes, so the dose is
     * theirs whatever is in the pen. Only the two clocks are not.
     *
     * **The wording is not yet signed off by a prescriber.** `CLINICAL.md` §14
     * carries it as an open question.
     */
    insulinAssumption:
      `The timing here is built around Humulin R — regular human insulin, which starts working slowly and lasts a long time. Two things depend on that: the ${String(EAT_MIN)}\u2013${String(EAT_MAX)} minutes to wait before eating, and the ${String(STACK_SUPPRESS_HOURS)}-hour and ${String(STACK_ADVISE_HOURS)}-hour windows the stacking check uses. If you take a rapid-acting insulin — NovoRapid, Humalog, Apidra — it starts sooner and clears sooner, and both of those timings are wrong for you. The dose itself is still yours, because your ISF and ICR were set for your own insulin. Ask your doctor how long before a meal to inject, and how long to leave between corrections.`,
    /**
     * The settings SCREEN's own words, moved here on 2026-09-13. They rendered
     * from literals in `screens/settings.ts` until then, which made this file's
     * header claim — "Every user-facing string, in one file" — false, and left
     * them outside the plain-language review and outside `10a`'s translation
     * scope. Moved verbatim: not one word changed in the move, so the existing
     * tests are the proof that nothing on screen moved with them.
     */
    fieldRequired: 'This is needed before a dose can be worked out.',
    outOfHardRange: (lo: string, hi: string): string => `Must be between ${lo} and ${hi}.`,
    isfSuffix: 'mg/dL per unit',
    icrSuffix: 'grams of carbohydrate',
    titleFirstRun: 'Your prescription',
    title: 'Settings',
    sectionBloodSugar: 'Blood sugar',
    sectionFood: 'Food',
    sectionRounding: 'Rounding',
    ceilGateTitle: 'Read this before choosing that',
    save: 'Save',
    saveFirstRun: 'Save and start',
    openAsText: 'Show my settings as text',
    openHowItWorks: 'How this works',
    openExport: 'Save or move the record',
    openClear: 'Clear or start over',
    /** §7.5's change list names the field that moved, in the words it uses. */
    deltaIcr: 'How much one unit covers',
    deltaIsf: 'How far one unit lowers you',
    deltaTarget: 'What a correction aims for',
    basalNameLabel: 'Which insulin',
    basalUnitsLabel: 'How many units',
    basalTimingLabel: 'When',
    basalRecordNote: 'None of this enters any calculation. It is here so the record is complete.',
    basalTitle: 'Your long-acting insulin',
    basalNote: 'Set by your doctor, not calculated here.',
    /**
     * The name is free text with no validation and an empty default, so the
     * screen meant to be photographed for a doctor could print a blank row.
     * Saying it is not recorded is the honest version of a blank.
     */
    basalNameMissing: 'Not recorded',
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
    /**
     * RENAMED from `prefilled*` on 2026-09-13. The fields are not prefilled any
     * more, and copy named for what it used to say is how the next reader gets
     * it wrong — the same rule that renamed `bandEFullCardShownToday`.
     *
     * The old body read "They are already filled in from the prescription."
     * For the person this was built for that was true. For anyone else "the
     * prescription" is not theirs, and a sentence asserting otherwise is worse
     * than silence: it lends the numbers an authority they do not have.
     */
    /**
     * The app's ONE first-person sentence, and it is deliberate rather than a
     * slip of voice. Everything else here is second person — "your doctor",
     * "you inject" — so there is no narrator anywhere else, and introducing one
     * is a decision, not a wording tweak.
     *
     * It exists because three hints below say "Hasham's is 150", "Hasham's is
     * 30" and "Hasham's is 10", and until 2026-09-13 the app never said who
     * that was. A stranger met an unexplained proper noun three times and got
     * no answer.
     *
     * Naming him is also the SAFER wording, which is why it survived the
     * audience change rather than being cut with the prefill: an unexplained
     * number beside an empty field reads as a suggestion, and a number with
     * someone's name on it reads as someone else's. The name is doing the work
     * the prefill used to do wrong.
     *
     * Outside the mint card on purpose. That card carries "nothing is filled
     * in, on purpose", which is the safety sentence on this screen, and origin
     * story inside it would compete with the one line that must land.
     */
    builtFor: 'My brother Hasham has type 1. I built this for him, and the examples below are his numbers — yours will be different.',
    setupTitle: 'Three numbers only your doctor can give you',
    setupBody:
      'Nothing is filled in, on purpose. Target, ISF and ICR come from your own prescription — another person’s are wrong for you. Then add your long-acting insulin below to finish.',
    thresholdHeading: 'When to double-check',
    thresholdQuestion: 'Double-check my typing when the dose reaches',
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
  /**
   * The calculator's own words, moved here on 2026-09-13 from
   * `screens/calculator.ts` for the reason given at `settings.fieldRequired`:
   * a string that lives in a render function is outside review and outside
   * `10a`'s translation scope. Moved verbatim.
   *
   * The two questions are SPLIT around a `<br>` rather than carrying one, and
   * the halves are named `Lead`/`Rest` so a translator sees that the break is
   * layout and not punctuation.
   */
  calculator: {
    askReadingLead: "What's your blood sugar ",
    askReadingRest: 'right now?',
    askCarbsLead: 'How much carbohydrate ',
    askCarbsRest: 'is in this meal?',
    carbsHint:
      'The carbohydrate in the food — not what the plate weighs. A 250\u00A0g plate of biryani is about 50\u00A0g of carbohydrate.',
    /** §10.1 — the field says GRAMS OF CARBOHYDRATE, never "grams" or "carbs". */
    unitReading: 'MG/DL',
    unitCarbs: 'GRAMS OF CARBOHYDRATE',
    unitDose: 'UNITS',
    /** Read aloud rather than seen, which does not make them less user-facing. */
    amountDownLabel: 'half a unit less',
    amountUpLabel: 'half a unit more',
    meterHiLoHint: (maxReading: string): string =>
      `Meter showing HI? Enter ${maxReading}. Showing LO? Don't enter a number — treat first.`,
    eatAround: (at: string): string => `Eat around ${at}.`,
    /**
     * The working's own sentences. They were template literals in
     * `screens/calculator.ts` until 2026-09-14, which is how they survived both
     * the hand sweep and the first review — prose inside backticks is invisible
     * to anything looking for quoted strings. `check-plan.py` reads backticks
     * now, and found these.
     */
    correctionRow: (from: string, to: string): string => `${from} down to ${to}`,
    mealRow: (grams: string): string => `${grams}\u00A0g of carbohydrate`,
    exactBeforeRounding: (exact: string): string =>
      `Worked out exactly: ${exact}\u00A0units, then rounded.`,
    decimalPointLabel: 'decimal point',
    /**
     * The backspace key's accessible name. A single word, which is why it sat
     * in `components.tsx` as a literal until 2026-09-14 — check 1c needed two
     * words before it would report anything, so a one-word SENTENCE escaped it.
     *
     * It is spoken aloud to a screen-reader user, which is the whole test for
     * whether a string belongs here. The keypad's other two labels were always
     * in this file; this one was not, and the difference was that it happened
     * to be short.
     */
    deleteLabel: 'delete',
    stepCheck: 'Check',
    stepRecording: 'Recording',
    stepLogged: 'Logged',
    rowBloodSugar: 'Blood sugar',
    rowCarbohydrate: 'Carbohydrate',
    rowTotal: 'Total',
    confirmHint:
      'Read those two back before the dose appears. This catches a mistyped number — it cannot catch a misjudged plate.',
    blankTimingOff:
      'And the timing advice is switched off — without a reading the app cannot tell you when to eat.',
    goBackAndTest: 'Go back and test first',
    startAgain: 'Start again',
    whySmaller: 'Why is this smaller?',
    checkAgain: 'Check again',
    withheldBoth: 'Both figures are large enough to need a second look, so neither is shown here.',
    keepSmaller: 'Keep the smaller dose',
    openHistory: 'History',
    /** The label under the dose. Not a brand — see `settings.insulinAssumption`. */
    doseUnit: 'units of your mealtime insulin',
  },

  /**
   * The history, export, clear, arithmetic and settings-as-text screens' own
   * words, moved from `screens/misc.ts` on 2026-09-13. Verbatim, same reason.
   *
   * `recordTarget` is one string where `misc.ts` held TWO identical literals —
   * the export summary and the settings-as-text list both said "A correction
   * aims for", and changing one would have left the other saying the old thing.
   */
  screens: {
    disclaimerRead: (accepted: boolean): string =>
      accepted ? '\u2611  I have read this' : '\u2610  I have read this',
    historyTitle: 'History',
    historyEmpty: 'Nothing recorded yet.',
    /**
     * A history row is ASSEMBLED from fragments, and the fragments are words.
     * They were built inline in `misc.ts` until 2026-09-13, where a template
     * literal hides prose from every sweep that looks for quoted strings —
     * including `check-plan.py`'s new one, which cannot see inside backticks.
     * Written as functions so the whole sentence is here, in order, for a
     * translator to move around.
     */
    noReading: 'no reading',
    /**
     * "the stacking check", not "recent-insulin check" — which appeared exactly
     * once in the product, here, five lines from `outsideStackingWindow` saying
     * the other name in the same flow. The explainer commits to the word in
     * writing: "it is the word the app uses on the result screen and in
     * Settings." The cost is real: "recent-insulin check" self-explains to a
     * reader who skipped the explainer, and this loses them that.
     */
    stackingOverridden: 'stacking check overridden',
    historyIntake: (reading: string, carbs: string): string =>
      `${reading} \u00b7 ${carbs}\u00A0g of carbohydrate`,
    readingOnly: (reading: string, note: string): string =>
      `${reading}\u00A0mg/dL \u2014 reading only, no dose${note}`,
    dosingAnsweredAt: (at: string): string =>
      `Answered ${at}. Editing it replaces the answer and re-dates it.`,
    mealCheckNeeds: (meals: string): string =>
      `It needs ${meals} logged meals before it can say anything.`,
    historyDose: (calculated: string, injected: string): string =>
      `calculated ${calculated} \u00b7 injected ${injected}`,
    outsideStackingWindow: 'This entry is older than anything the stacking check looks at.',
    delete: 'Delete',
    yourAnswer: 'Your answer',
    exportTitle: 'Keeping the record',
    importTitle: 'Bringing a record in',
    importNote:
      'Records merge in. Your prescription is only ever proposed — an import can never silently rewrite it.',
    importAction: 'Load a record',
    clearTitle: 'Clearing',
    clearNote:
      'Uninstalling does not reliably clear anything, and the browser\u2019s own reset would take other sites on this address with it. These two are the ones that know what belongs to this app.',
    clearEmpty: 'There is nothing recorded yet.',
    clearRecordTitle: 'Clear the record',
    clearRecordBody:
      'Removes every dose and reading. Your prescription and its history stay, and the app is usable straight away.',
    clearRecordAction: 'Clear',
    startOverTitle: 'Start over',
    startOverBody:
      'Everything goes, including your prescription. Setup runs again. For handing the phone on, or for getting out of a stuck state.',
    recordTarget: 'A correction aims for',
    recordIsf: '1\u00A0unit lowers blood sugar by',
    recordIcr: '1\u00A0unit covers',
    arithmeticTitle: 'The arithmetic, in full',
    arithmeticBody:
      'A correction is how far you are above your target, divided by how far one unit lowers you. A meal dose is the carbohydrate divided by how much one unit covers. The two are added, and a negative correction is subtracted from the meal dose rather than ignored.',
    arithmeticFloor: 'If the two together come out below zero, the answer is zero units — never a negative one.',
    anyOfThese: 'Any one of these is enough:',
    mealCheckTitle: 'The meal-size check',
    asTextTitle: 'My settings',
    asTextRounding: 'Doses are rounded to',
    /**
     * NOT "Asks me to re-read at", which this said until 2026-09-14. §10.1
     * retired "re-read my numbers" because it read as "check your meter again",
     * a different action — and the as-text screen brought it back on the one
     * screen built to be photographed and read with no surrounding context.
     * G14 rules "double-check" as this feature's single user-facing name.
     */
    asTextThreshold: 'Double-checks my typing at',
    asTextFooter: 'This screen is meant to be photographed and shown to your doctor.',
    foodsMakeYours: 'Make these yours',
    opening: 'Opening your record\u2026',
  },

  /** The bottom navigation's labels and its own accessible name. */
  nav: {
    settings: 'Settings',
    history: 'History',
    saveACopy: 'Save a copy',
    label: 'Navigation',
  },

  rounding: {
    title: 'Rounding, and why there are five choices',
    intro:
      'A calculation rarely lands on a number your syringe can measure. These decide what happens to the remainder. Only the total is ever rounded — never the correction or the meal dose on their own.',
    /**
     * Each mode carries the `RoundingMode` it sets, so Settings renders its
     * buttons FROM this list rather than holding a second copy of the five
     * names. Until 2026-09-13 the names existed twice — here and in
     * `settings.ts` — and a rename in one place left the other disagreeing.
     *
     * The key is in the DATA rather than implied by position on purpose. The
     * obvious fix was for Settings to index this array, and that trades a
     * visible disagreement for an invisible one: reorder these five and the
     * button reading "Always round up" would quietly set `floor`. A label that
     * says the opposite of what the control does is a dosing error, not a copy
     * defect, so the pairing is written down instead of counted.
     */
    modes: [
      { mode: 'nearest', name: 'Whole units', what: 'To the nearest whole unit, so 4.4 becomes 4 and 4.6 becomes 5. Exactly half rounds away from zero: 4.5 becomes 5. This is right for an ordinary U-100 syringe, which is marked in whole units.' },
      { mode: 'half', name: 'Half units', what: 'To the nearest half, so 4.37 becomes 4.5. Choose this only if your pen or syringe actually has half-unit markings — a NovoPen Echo or a Humalog Junior KwikPen. On a whole-unit syringe it asks you to measure something you cannot see.' },
      { mode: 'ceil', name: 'Always round up', what: 'To the next whole unit, so 4.1 becomes 5. This adds insulin on every single dose, always in the direction of low blood sugar. If one unit brings you down 30\u00A0mg/dL, that is up to 30\u00A0mg/dL of extra drop you did not intend — on a 1-unit correction it doubles the dose. The app asks you to confirm this one before it will use it.' },
      { mode: 'floor', name: 'Always round down', what: 'To the whole unit below, so 4.9 becomes 4. This gives slightly less insulin every time, which errs toward higher blood sugar. Some doctors ask for this deliberately.' },
      { mode: 'off', name: 'Show the exact number', what: 'No rounding — 4.37 stays 4.37. This is for reading the true figure, not for measuring: a syringe cannot draw 4.37. Use it to see what the app really worked out.' },
    ] as const satisfies readonly { readonly mode: RoundingMode; readonly name: string; readonly what: string }[],
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
    body: 'Your record was saved by a newer version of this app than this one. Nothing has been lost. Opening the newer version will read it normally.',
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
