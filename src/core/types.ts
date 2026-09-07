/**
 * The shapes the tested core (§13.1) reasons about.
 *
 * Nothing here imports the DOM, storage, a clock or a framework. §7.6: clock
 * discontinuity and restart semantics are passed in as data, never pre-reduced
 * to an unquestioned elapsed number.
 */

export type RoundingMode = 'nearest' | 'half' | 'ceil' | 'floor' | 'off';

/** §3's bands. C and D are terminal; B and E can co-occur with nothing else. */
export type Band = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * §4.1 — four states, not three. They must stay distinguishable before any
 * numeric conversion, because JavaScript collapses them: Number(""), Number(" ")
 * and Number(null) are all 0, and `value || fallback` replaces a legitimate zero.
 */
export type ParsedField =
  | { readonly state: 'empty' }
  | { readonly state: 'invalid'; readonly reason: LexicalReason }
  | { readonly state: 'zero'; readonly value: 0; readonly hundredths: 0; readonly text: string }
  | {
      readonly state: 'valid';
      readonly value: number;
      readonly hundredths: number;
      readonly text: string;
    };

/**
 * Why a string failed §4.2's grammar. The comma case is separate from the rest
 * because its message is different and load-bearing: in Pakistan a comma means
 * grouping, so "2,50" intends 250, and any message that says "use a period for
 * decimals" turns it into 2.50 — 0.25 units instead of 25 (§4.2).
 */
export type LexicalReason =
  | 'comma'
  | 'not_a_number'
  | 'too_many_decimals'
  | 'too_long'
  | 'signed'
  | 'non_ascii_digits';

/** The settings that change a dose. §7.7: `threshold` is deliberately not among them. */
export interface DosingSettings {
  readonly target: number;
  readonly isf: number;
  readonly icr: number;
  readonly mode: RoundingMode;
}

/**
 * The full settings record. `revision` is the settings currently in force
 * (§11.3's identity rule) and is carried into the snapshot so a log row can be
 * stamped from the snapshot rather than from a fresh read of the store.
 *
 * The basal fields are recorded and never calculated (§1.3). A §13.3 case
 * asserts that changing any of them leaves every dose bit-identical.
 */
export interface Settings extends DosingSettings {
  readonly revision: number;
  readonly threshold: number;
  readonly basalName: string;
  readonly basalUnits: number;
  readonly basalTiming: string;
  /**
   * Whose record this is. OPTIONAL, and the empty string is a first-class value
   * meaning "not given" — §4.1's rule about not collapsing states applies to
   * text as much as to numbers.
   *
   * It changes nothing the app calculates. It exists so the greeting is his
   * name and so an exported file is identifiable in a folder of exports — a
   * doctor being handed "insulin-record.html" cannot tell whose it is.
   */
  readonly personName: string;
}

/** §11.2 — the raw text of the two calculation inputs, before any conversion. */
export interface RawInputs {
  readonly bloodSugar: string;
  readonly carbs: string;
}

/** §7.5 — whether the absence of a recent record means anything. */
export type HistoryProvenance = 'trusted' | 'suspect';

/**
 * §11.2, blocking in round 9 — §7.4 reads `injectedUnits`, and v8's snapshot
 * said only `lastDose {units, atMs}` without saying which figure. A test author
 * who pinned the CALCULATED number would have pinned the wrong gate input, and
 * that is §13.7's wrong-oracle class, the one mutation testing cannot catch.
 *
 * The field is therefore named for the figure it holds. The core never needs a
 * past dose's calculated amount for anything: what is in his body is what
 * matters. The representation is §2.2's integer hundredths — reconstructing
 * units as a float downstream is the defect §2.2 exists to remove.
 */
export interface LastDose {
  readonly injectedHundredths: number;
  readonly atMs: number;
}

/**
 * §11.2's committed snapshot. A result is derived from one of these and from
 * nothing else, so a settings or log change between computing and revealing is
 * detectable rather than silent.
 */
export interface Snapshot {
  readonly inputs: RawInputs;
  readonly settings: Settings;
  readonly logRevision: number;
  readonly decisionTime: number;
  readonly stackingOverride: boolean;
  /** §6.5, computed from the log at `logRevision`. null when no baseline exists. */
  readonly carbBaseline: number | null;
  readonly eligibleEntryCount: number;
  readonly historyProvenance: HistoryProvenance;
  readonly lastDose: LastDose | null;
  readonly bandEFullCardShownToday: boolean;
  /** §7.6 — how many rows were dropped for an implausible timestamp. */
  readonly excludedTimeRecords: number;
  /** §4.6's per-calculation acknowledgement. Never persisted. */
  readonly blankReadingAcknowledged: boolean;
  /** §6.2's confirmation, bound to the exact values confirmed. */
  readonly largeDoseConfirmed: boolean;
}

/**
 * §10.5's ranked advisory list. The rank is the array order in `ADVISORY_RANK`;
 * the budget is two on screen and the rest behind a "more" affordance.
 */
export type Advisory =
  | 'band_e_full'
  | 'band_e_compact'
  | 'band_b_caution'
  | 'stacking_suppressed'
  | 'carb_advisory_low'
  | 'carb_advisory_high'
  | 'stacking_recent_dose'
  | 'missing_history'
  | 'stacking_negative_applied'
  | 'invalid_time_record';

/** Which field an error belongs to, so the shell can put it in the right place. */
export type FieldName = 'bloodSugar' | 'carbs' | 'target' | 'isf' | 'icr' | 'mode' | 'threshold';

/**
 * `above_range` and `below_range` are separate because §4.5 gives them
 * different copy and the difference is clinical. A typed 605 — a plausible typo
 * for 60.5 — gets plain "check the number" plus a link to the HI guidance, and
 * NOT band E's ketone wording, because "check ketones" is a confusing reply to
 * a typo. A reading below the floor routes to the low-reading response instead.
 */
export interface FieldError {
  readonly field: FieldName;
  readonly reason: LexicalReason | 'above_range' | 'below_range' | 'missing' | 'not_finite';
}

/** §8.1's decision, made at calculation time and stored on the log row (§7.2). */
export type TimingAdvice = 'before' | 'eat_first' | 'suppressed';

/**
 * §2's breakdown, quantized for DISPLAY only and never fed back into dosing
 * (§2.2). `componentsSumToTotal` is false when the displayed components do not
 * visibly add up, which §10.3 requires the interface to acknowledge rather than
 * imply away.
 */
export interface Breakdown {
  readonly correctionHundredths: number;
  readonly mealHundredths: number;
  readonly exactTotalHundredths: number;
  readonly componentsSumToTotal: boolean;
  /** §10.3: a suppressed correction is shown struck through, with its reason. */
  readonly correctionSuppressed: boolean;
}

/**
 * §13.2's outcome kinds. Blocked outcomes carry no renderable dose — §3.3's
 * "no insulin number" covers the main result, the breakdown, the confirmation
 * preview and the accessibility announcement alike.
 */
export type Outcome =
  /** Nothing was asked for. Blank and blank is not "0 units" (§4.3 step 5). */
  | { readonly kind: 'no_result'; readonly bands: readonly Band[] }
  | {
      readonly kind: 'invalid_input';
      readonly errors: readonly FieldError[];
      readonly bands: readonly Band[];
    }
  | { readonly kind: 'invalid_settings'; readonly errors: readonly FieldError[] }
  /** §3 bands C and D. Terminal: no dose, no timing, no confirmation. */
  | {
      readonly kind: 'blocked_low';
      readonly bands: readonly Band[];
      readonly alsoInvalid: readonly FieldError[];
    }
  /** §4.6 — a meal dose with no reading needs one explicit tap first. */
  | { readonly kind: 'ack_required'; readonly ack: 'blank_blood_sugar' }
  /** §6.2/§6.3 — inputs restated, dose withheld until the tap. */
  | {
      readonly kind: 'confirm_required';
      readonly bands: readonly Band[];
      readonly advisories: readonly Advisory[];
    }
  /** §6.4 — the app is wrong, not the user. Cannot be overridden. */
  | { readonly kind: 'bound_failure'; readonly boundUnits: number }
  /** §7.4 — a positive correction held back; the meal term is never touched. */
  | ({ readonly kind: 'meal_only_suppressed' } & DoseBody)
  | ({ readonly kind: 'dose' } & DoseBody);

export interface DoseBody {
  /** §2.2's authoritative representation: an integer number of hundredths. */
  readonly hundredths: number;
  readonly bands: readonly Band[];
  readonly advisories: readonly Advisory[];
  readonly breakdown: Breakdown;
  readonly timingAdvice: TimingAdvice;
  /** §7.4.1 — the override is offered only when a correction was held back. */
  readonly overrideAvailable: boolean;
  /**
   * §7.4.1 — what the correction would add if the override were taken, and the
   * ceiling that insulin could still lower him by. Both null when no correction
   * was suppressed.
   */
  readonly overrideCandidateHundredths: number | null;
  readonly stackingCeilingMgDl: number | null;
  /**
   * §7.4.1 v4 — when either figure reaches the threshold, the override panel
   * shows NO numbers and defers to §6.2's flow, including in the accessibility
   * tree. Otherwise the button would disclose the number §6.3 withholds.
   */
  readonly overrideFiguresWithheld: boolean;
}

// ─── log and readings rows (§7.1, §7.3, §7.8) ───────────────────────────────

export interface Injection {
  readonly id: string;
  readonly timestamp: number;
  /** §4.6 — an explicit "not entered" marker, never a substituted zero. */
  readonly bloodSugar: number | null;
  readonly carbs: number;
  /** The calculated dose, in hundredths (§2.2). */
  readonly units: number;
  /** What he actually injected, in hundredths. Defaults to `units` (§7.1). */
  readonly injectedUnits: number;
  readonly settingsRevision: number;
  readonly overrodeStacking: boolean;
  readonly timingAdvice: TimingAdvice;
  readonly advisoryFlagged: boolean;
  readonly deleted?: undefined;
}

/**
 * §7.3 — a tombstone stands where the dose stood. It carries these four fields
 * and nothing else: the amounts do not survive, because §7.3 exists for the
 * case where the deletion means "I never injected this", and keeping the amount
 * would re-create the ambiguity the deletion resolved.
 */
export interface Tombstone {
  readonly id: string;
  readonly timestamp: number;
  readonly deleted: true;
  readonly deletedAtMs: number;
}

export type LogRow = Injection | Tombstone;

export type ReadingNote = 'before_bed' | 'overnight' | 'felt_low' | 'after_exercise';

export interface Reading {
  readonly id: string;
  readonly timestamp: number;
  readonly bloodSugar: number;
  readonly note?: ReadingNote;
}

/** §7.3's discriminator, in one place so no consumer invents its own. */
export function isTombstone(row: LogRow): row is Tombstone {
  return row.deleted === true;
}

export function isInjection(row: LogRow): row is Injection {
  return row.deleted !== true;
}
