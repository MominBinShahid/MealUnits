/**
 * §13.2's golden cases, run against §4.3's resolver.
 *
 * Two rules from §11.8 govern this file, and both are the reason it carries
 * literal numbers rather than imports:
 *
 *   "Golden cases must NOT import from config.ts. A test reading
 *    `expect(dose).toBe(DEFAULT_THRESHOLD)` still passes when the constant
 *    changes, so it asserts nothing."
 *
 * So every case states its own threshold, its own ratios and its own expected
 * hundredths. Change a constant and these say what broke, instead of agreeing
 * with you.
 *
 * §13.7's other rule is that golden values are independently re-derived by hand
 * before being committed. Each case carries that derivation in its `note`, so
 * the arithmetic travels with the assertion rather than living in a commit
 * message nobody reads again.
 */

import { describe, expect, it } from 'vitest';
import cases from './golden/cases.json' with { type: 'json' };
import { resolve } from '../src/core/resolve.js';
import type { Outcome, RoundingMode, Settings, Snapshot } from '../src/core/types.js';

/** A fixed decision time. Nothing in these tests reads a real clock. */
const NOW_MS = 1_757_000_000_000; // 2025-09-04T15:33:20Z, arbitrary and fixed
const MS_PER_HOUR = 3_600_000;

interface GoldenLastDose {
  units: number;
  atHoursAgo: number;
}

interface GoldenInput {
  bloodSugar?: number | string | null;
  carbs?: number | string | null;
  target: number;
  isf: number;
  icr: number;
  threshold: number;
  lastDose?: GoldenLastDose | null;
  stackingOverride?: boolean;
  carbBaseline?: number | null;
  eligibleEntryCount?: number;
  historyProvenance?: 'trusted' | 'suspect';
  bandEFullCardShownToday?: boolean;
  excludedTimeRecords?: number;
  blankReadingAcknowledged?: boolean;
  largeDoseConfirmed?: boolean;
  basalName?: string;
  basalUnits?: number;
  basalTiming?: string;
}

interface GoldenExpected {
  kind: Outcome['kind'];
  hundredths?: number;
  bands?: string[];
  correctionHundredths?: number;
  suppressed?: boolean;
  advisories?: string[];
  timingAdvice?: string;
  componentsSumToTotal?: boolean;
  overrideCandidateHundredths?: number | null;
  stackingCeilingMgDl?: number | null;
  overrideFiguresWithheld?: boolean;
  errors?: { field: string; reason: string }[];
  alsoInvalid?: { field: string; reason: string }[];
  ack?: string;
}

interface GoldenCase {
  name: string;
  note: string;
  input: GoldenInput;
  mode: string;
  expected: GoldenExpected;
}

/**
 * A number in the fixture becomes the string a person would have typed, so the
 * case still travels through §4.2's grammar rather than around it. `null`
 * becomes the empty string, which is the blank field — NOT a zero (§4.1).
 */
function asTyped(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : value.toString();
}

function buildSnapshot(input: GoldenInput, mode: string): Snapshot {
  const settings: Settings = {
    revision: 1,
    personName: '',
    target: input.target,
    isf: input.isf,
    icr: input.icr,
    mode: mode as RoundingMode,
    threshold: input.threshold,
    basalName: input.basalName ?? 'Lantus',
    basalUnits: input.basalUnits ?? 36,
    basalTiming: input.basalTiming ?? 'early morning, before breakfast',
  };
  const lastDose = input.lastDose
    ? {
        // §11.2 — this is the INJECTED amount, in hundredths.
        injectedHundredths: Math.round(input.lastDose.units * 100),
        atMs: NOW_MS - input.lastDose.atHoursAgo * MS_PER_HOUR,
      }
    : null;

  return {
    inputs: { bloodSugar: asTyped(input.bloodSugar), carbs: asTyped(input.carbs) },
    settings,
    logRevision: 1,
    decisionTime: NOW_MS,
    stackingOverride: input.stackingOverride ?? false,
    carbBaseline: input.carbBaseline ?? null,
    eligibleEntryCount: input.eligibleEntryCount ?? 0,
    historyProvenance: input.historyProvenance ?? 'trusted',
    lastDose,
    bandEFullCardShownToday: input.bandEFullCardShownToday ?? false,
    excludedTimeRecords: input.excludedTimeRecords ?? 0,
    blankReadingAcknowledged: input.blankReadingAcknowledged ?? false,
    largeDoseConfirmed: input.largeDoseConfirmed ?? false,
  };
}

/** §4.3 step 4 collects errors and states no order for them. */
function sortErrors(errors: readonly { field: string; reason: string }[]): string[] {
  return errors.map((error) => `${error.field}:${error.reason}`).sort();
}

const golden = cases as GoldenCase[];

describe('§13.2 golden cases', () => {
  it('every case carries a hand derivation (§13.7)', () => {
    for (const testCase of golden) {
      expect(testCase.note, testCase.name).toBeTruthy();
    }
  });

  it.each(golden.map((testCase) => [testCase.name, testCase] as const))('%s', (_name, testCase) => {
    const outcome = resolve(buildSnapshot(testCase.input, testCase.mode));
    const want = testCase.expected;

    expect(outcome.kind, testCase.note).toBe(want.kind);

    if (want.bands !== undefined && 'bands' in outcome) {
      expect([...outcome.bands]).toEqual(want.bands);
    }
    if (want.advisories !== undefined && 'advisories' in outcome) {
      expect([...outcome.advisories]).toEqual(want.advisories);
    }
    if (want.errors !== undefined && outcome.kind === 'invalid_settings') {
      expect(sortErrors(outcome.errors)).toEqual(sortErrors(want.errors));
    }
    if (want.errors !== undefined && outcome.kind === 'invalid_input') {
      expect(sortErrors(outcome.errors)).toEqual(sortErrors(want.errors));
    }
    if (want.alsoInvalid !== undefined && outcome.kind === 'blocked_low') {
      expect(sortErrors(outcome.alsoInvalid)).toEqual(sortErrors(want.alsoInvalid));
    }
    if (want.ack !== undefined && outcome.kind === 'ack_required') {
      expect(outcome.ack).toBe(want.ack);
    }

    if (outcome.kind === 'dose' || outcome.kind === 'meal_only_suppressed') {
      if (want.hundredths !== undefined) {
        // §13.2 — zero assertions must distinguish negative zero from positive
        // zero. Ordinary equality does not, and JSON serialization erases it.
        expect(Object.is(outcome.hundredths, want.hundredths)).toBe(true);
        expect(Object.is(outcome.hundredths, -0)).toBe(false);
      }
      if (want.correctionHundredths !== undefined) {
        expect(
          Object.is(outcome.breakdown.correctionHundredths, want.correctionHundredths),
        ).toBe(true);
      }
      if (want.suppressed !== undefined) {
        expect(outcome.breakdown.correctionSuppressed).toBe(want.suppressed);
      }
      if (want.componentsSumToTotal !== undefined) {
        expect(outcome.breakdown.componentsSumToTotal).toBe(want.componentsSumToTotal);
      }
      if (want.timingAdvice !== undefined) {
        expect(outcome.timingAdvice).toBe(want.timingAdvice);
      }
      if (want.overrideCandidateHundredths !== undefined) {
        expect(outcome.overrideCandidateHundredths).toBe(want.overrideCandidateHundredths);
      }
      if (want.stackingCeilingMgDl !== undefined) {
        expect(outcome.stackingCeilingMgDl).toBe(want.stackingCeilingMgDl);
      }
      if (want.overrideFiguresWithheld !== undefined) {
        expect(outcome.overrideFiguresWithheld).toBe(want.overrideFiguresWithheld);
      }
    } else {
      // §3.3 and §6.3 — a blocked or withheld outcome carries no renderable
      // dose at all. The absence is asserted, not assumed.
      expect('hundredths' in outcome).toBe(false);
      expect('breakdown' in outcome).toBe(false);
    }
  });
});

describe('§1.3 the basal regimen never touches a calculated dose', () => {
  it('changing every basal field leaves the whole outcome bit-identical', () => {
    const base: GoldenInput = {
      bloodSugar: 330,
      carbs: 200,
      target: 150,
      isf: 30,
      icr: 10,
      threshold: 20,
      largeDoseConfirmed: true,
    };
    const withBasal: GoldenInput = {
      ...base,
      basalName: 'Toujeo',
      basalUnits: 120,
      basalTiming: 'at bedtime',
    };
    expect(resolve(buildSnapshot(withBasal, 'nearest'))).toStrictEqual(
      resolve(buildSnapshot(base, 'nearest')),
    );
  });
});
