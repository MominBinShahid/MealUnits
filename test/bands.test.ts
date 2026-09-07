import { describe, expect, it } from 'vitest';
import {
  classifyBands,
  classifyLowBand,
  isBlockingBand,
  looksLikeAPossibleLow,
} from '../src/core/bands.js';

describe('§3 the band table, at every boundary', () => {
  it('bands D and C at and around the consensus levels', () => {
    // 70 and 54 are the ADA/EASD international consensus levels. They are
    // absolute and never derived from any setting.
    expect(classifyBands(53.99, 0)).toEqual(['D']);
    expect(classifyBands(54, 0)).toEqual(['C']);
    expect(classifyBands(69.99, 0)).toEqual(['C']);
    expect(classifyBands(70, 0)).toEqual(['A']);
  });

  it('is terminal for C and D — nothing else co-occurs', () => {
    // Even at a reading that would also be band E, which cannot happen, and
    // even with a correction that would fire band B.
    expect(classifyBands(60, -5)).toEqual(['C']);
    expect(classifyBands(30, -5)).toEqual(['D']);
    expect(isBlockingBand(classifyBands(60, -5))).toBe(true);
    expect(isBlockingBand(classifyBands(30, -5))).toBe(true);
    expect(isBlockingBand(classifyBands(100, -5))).toBe(false);
  });

  it('band B fires at exactly -1.5 units and not above it', () => {
    expect(classifyBands(100, -1.5)).toEqual(['B']);
    expect(classifyBands(100, -1.4999999)).toEqual(['A']);
    expect(classifyBands(100, -100)).toEqual(['B']);
  });

  it('band E fires at exactly 250 and not below it', () => {
    expect(classifyBands(249.99, 3)).toEqual(['A']);
    expect(classifyBands(250, 3)).toEqual(['A', 'E']);
    expect(classifyBands(600, 15)).toEqual(['A', 'E']);
  });

  it('§4.6 — with no reading the app asserts NO band rather than guessing', () => {
    expect(classifyBands(null, 6)).toEqual([]);
    expect(classifyBands(null, -6)).toEqual([]);
  });

  it('§4.3 step 3 — the low bands are decided WITHOUT any setting', () => {
    // A separate function rather than a null correction, because `null <= -1.5`
    // coerces to `0 <= -1.5` and would be indistinguishable from a correction
    // of exactly zero.
    expect(classifyLowBand(53.99)).toBe('D');
    expect(classifyLowBand(54)).toBe('C');
    expect(classifyLowBand(69.99)).toBe('C');
    expect(classifyLowBand(70)).toBeNull();
    expect(classifyLowBand(0)).toBe('D');
    expect(classifyLowBand(600)).toBeNull();
  });

  it('§3.1 — band E is advisory and the dose is NOT withheld', () => {
    // R1 proposed refusing to dose above 600 and routing to "seek care".
    // Rejected: someone at 500 needs insulin most, and refusing to help is not
    // safer than helping with a warning. The band is present; nothing blocks.
    expect(isBlockingBand(classifyBands(600, 15))).toBe(false);
  });
});

describe('§4.3 step 3 — the possible-low predicate is settings-free', () => {
  it('is exactly "below the consensus level", with no ratio involved', () => {
    expect(looksLikeAPossibleLow(69.99)).toBe(true);
    expect(looksLikeAPossibleLow(70)).toBe(false);
    expect(looksLikeAPossibleLow(0)).toBe(true);
    expect(looksLikeAPossibleLow(19)).toBe(true);
  });
});
