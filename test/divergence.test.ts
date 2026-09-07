import { describe, expect, it } from 'vitest';
import { divergesFromCalculated } from '../src/core/divergence.js';

/** Hundredths, because §2.2 is the representation everywhere. */
const u = (units: number): number => Math.round(units * 100);

describe('§7.1 the divergence predicate', () => {
  it('THE case it must never fire on: a calculated 11 against his habitual 25', () => {
    // §1.4 — this will recur at most meals until his prescription is revisited.
    // A rule that fired here would be tap-through training on the routine path.
    expect(divergesFromCalculated(u(11), u(25))).toBe(false);
  });

  it('and the reason a ratio of 2 was rejected: 25/11 is 2.27', () => {
    expect(u(25) / u(11)).toBeCloseTo(2.2727, 4);
    // Under a 2x rule this would confirm on every injection he makes.
    expect(u(25) >= 2 * u(11)).toBe(true);
    expect(u(25) >= 3 * u(11)).toBe(false);
  });

  it('fires at exactly three times', () => {
    expect(divergesFromCalculated(u(5), u(15))).toBe(true);
    expect(divergesFromCalculated(u(5), u(14.99))).toBe(false);
  });

  it('fires at exactly one third', () => {
    expect(divergesFromCalculated(u(15), u(5))).toBe(true);
    expect(divergesFromCalculated(u(15), u(5.01))).toBe(false);
  });

  it('the five-unit floor is absolute and stops noise on small doses', () => {
    // A calculated 0.5 against an injected 2 is a 4x divergence, and without
    // the floor it would confirm on doses too small for it to matter.
    expect(divergesFromCalculated(u(0.5), u(2))).toBe(false);
    expect(u(2) >= 3 * u(0.5)).toBe(true);
  });

  it('is exact at exactly five units apart', () => {
    // 1 -> 6 is both 5 apart and 6x.
    expect(divergesFromCalculated(u(1), u(6))).toBe(true);
    // 1 -> 5.99 is 4.99 apart, so the absolute clause stops it.
    expect(divergesFromCalculated(u(1), u(5.99))).toBe(false);
  });

  it('needs BOTH clauses — five apart alone is not enough', () => {
    // 10 -> 15 is exactly 5 apart but only 1.5x.
    expect(divergesFromCalculated(u(10), u(15))).toBe(false);
    // 11 -> 33 is 3x AND 22 apart.
    expect(divergesFromCalculated(u(11), u(33))).toBe(true);
    // 11 -> 3.67 is below one third and 7.33 apart.
    expect(divergesFromCalculated(u(11), u(3.66))).toBe(true);
  });

  it('catches the typo of 2.5 for 25 against a calculated 11', () => {
    expect(divergesFromCalculated(u(11), u(2.5))).toBe(true);
  });

  it('§7.1 — the residual: a 52 for 25 passes only above a calculated ~17.3', () => {
    // v11 claimed 52-for-25 passes silently at "2.1x", which measured the
    // ratio against the wrong operand: the predicate compares against the
    // CALCULATED dose. In this app's routine regime it is caught.
    expect(divergesFromCalculated(u(11), u(52))).toBe(true);
    // The silent pass needs the calculated dose above 52/3 = 17.33.
    expect(divergesFromCalculated(u(17.33), u(52))).toBe(true);
    expect(divergesFromCalculated(u(17.34), u(52))).toBe(false);
  });

  it('a zero calculated dose falls back to the absolute clause alone', () => {
    // §7.1 — flow-unreachable, since §7.2 forbids logging a zero-unit result,
    // so it is tested directly rather than through the interface.
    expect(divergesFromCalculated(0, u(6))).toBe(true);
    expect(divergesFromCalculated(0, u(4.99))).toBe(false);
    expect(divergesFromCalculated(0, 0)).toBe(false);
  });

  it('confirms rather than passes when either value is not finite', () => {
    expect(divergesFromCalculated(Number.NaN, u(25))).toBe(true);
    expect(divergesFromCalculated(u(11), Number.NaN)).toBe(true);
    expect(divergesFromCalculated(u(11), Number.POSITIVE_INFINITY)).toBe(true);
  });

  it('is symmetric about the absolute clause but not about the ratio', () => {
    // Above by 3x fires; below by 3x fires; between them nothing does.
    expect(divergesFromCalculated(u(10), u(30))).toBe(true);
    expect(divergesFromCalculated(u(30), u(10))).toBe(true);
    expect(divergesFromCalculated(u(10), u(20))).toBe(false);
  });
});
