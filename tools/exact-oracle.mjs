/**
 * `node tools/exact-oracle.mjs`
 *
 * An INDEPENDENT exact-rational oracle for §2.2's arithmetic, kept in the repo
 * so its figure can be re-derived rather than believed. Note 58's headline
 * measurement — "2,623,215 values, zero disagreements" — exists only as prose,
 * with no script and no record of the five prescriptions it swept, and an audit
 * could not reproduce it. A number backing a ruling should not be in that state.
 *
 * WHAT IT ANSWERS. §2.2 requires every mode to break ties half away from zero,
 * and the shipped code cannot always honour that: a tie destroyed by floating
 * point before the rounder sees it rounds the wrong way (72 mg/dL with 41 g on
 * 150/30/10 is exactly 1.5 on paper and 1.4999999999999996 as a double). The
 * question that governs whether to rewrite the core in exact integer arithmetic
 * is how many GOLDEN EXPECTATIONS would move if it did. Measured: one — the
 * case that exists to document the exception. The other 37 dose cases agree.
 *
 * It is also the oracle a rewrite would need, already validated against those
 * 37 known-good values.
 *
 * It imports nothing from src/. That is the whole point: an oracle built on the
 * code under test can only prove the code agrees with itself, which is the
 * failure mode that makes "regenerate the expectations" worthless as evidence.
 *
 * Everything is BigInt rationals. `bloodSugar`, `target`, `isf`, `icr` and
 * `carbs` come from the fixtures as decimal text; each becomes an exact
 * fraction, and the dose is
 *     (bs - target)/isf + carbs/icr
 * evaluated exactly, then rounded to hundredths by the mode, half AWAY FROM
 * ZERO, with no float anywhere in the chain.
 */
import { readFileSync } from 'node:fs';

const rat = (n, d = 1n) => {
  if (d < 0n) { n = -n; d = -d; }
  const g = (a, b) => (b ? g(b, a % b) : a < 0n ? -a : a);
  const k = g(n, d) || 1n;
  return { n: n / k, d: d / k };
};
const add = (a, b) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
const div = (a, b) => rat(a.n * b.d, a.d * b.n);
const fromNumber = (x) => {
  const s = String(x);
  if (!s.includes('.') && !s.includes('e')) return rat(BigInt(s));
  const [i, f = ''] = s.split('.');
  const sign = i.startsWith('-') ? -1n : 1n;
  const whole = BigInt(i.replace('-', '')) * 10n ** BigInt(f.length) + BigInt(f || '0');
  return rat(sign * whole, 10n ** BigInt(f.length));
};

/** Exact hundredths, rounded by §5.1's mode. Ties break AWAY FROM ZERO (§2.2). */
function toHundredths(r, mode) {
  const scaled = rat(r.n * 100n, r.d);              // exact hundredths, still rational
  const q = scaled.n / scaled.d;                    // BigInt division truncates toward zero
  const rem = scaled.n - q * scaled.d;
  if (rem === 0n) return q;
  const neg = scaled.n < 0n;
  const away = neg ? q - 1n : q + 1n;               // magnitude up
  const twice = (neg ? -rem : rem) * 2n;
  const half = twice === scaled.d || twice === -scaled.d;
  switch (mode) {
    case 'off': return half ? away : (twice > (neg ? -scaled.d : scaled.d) ? away : q);
    case 'ceil': return neg ? q : away;
    case 'floor': return neg ? away : q;
    default: return half ? away : ((neg ? -twice : twice) > (neg ? -scaled.d : scaled.d) ? away : q);
  }
}

/** §5.1's whole- and half-unit modes round the TOTAL, not the hundredths. */
function roundUnits(r, mode) {
  const step = mode === 'half' ? rat(1n, 2n) : rat(1n);
  const inSteps = div(r, step);
  const q = inSteps.n / inSteps.d;
  const rem = inSteps.n - q * inSteps.d;
  let k = q;
  if (rem !== 0n) {
    const neg = inSteps.n < 0n;
    if (mode === 'ceil') k = neg ? q : q + 1n;
    else if (mode === 'floor') k = neg ? q - 1n : q;
    else {
      const twice = (neg ? -rem : rem) * 2n;
      const d = inSteps.d < 0n ? -inSteps.d : inSteps.d;
      if (twice >= d) k = neg ? q - 1n : q + 1n;
    }
  }
  return rat(k * step.n, step.d);
}

const cases = JSON.parse(readFileSync('test/golden/cases.json', 'utf8'));
let compared = 0, agree = 0, skippedSuppressed = 0;
const diffs = [];

for (const c of cases) {
  const e = c.expected ?? {};
  if (e.kind !== 'dose' && e.kind !== 'meal_only_suppressed') continue;
  if (typeof e.hundredths !== 'number') continue;
  const i = c.input ?? {};
  if ([i.bloodSugar, i.target, i.isf, i.icr, i.carbs].some((v) => typeof v !== 'number')) continue;
  // §7.4's stacking suppression removes the positive correction, and this
  // oracle models §2.2's ARITHMETIC only. A suppressed case would be the oracle
  // disagreeing about a gate, not about rounding, so it is out of scope.
  if (i.lastDose !== undefined) { skippedSuppressed += 1; continue; }

  const correction = div(sub(fromNumber(i.bloodSugar), fromNumber(i.target)), fromNumber(i.isf));
  const meal = div(fromNumber(i.carbs), fromNumber(i.icr));
  let total = add(correction, meal);
  if (total.n < 0n) total = rat(0n);                 // §2.1 clamps the TOTAL
  const mode = c.mode ?? 'nearest';

  // §5.1 — `nearest`, `half`, `ceil` and `floor` all round the TOTAL in unit
  // steps; only `off` keeps hundredths. Discovered by running this oracle: the
  // first version rounded hundredths for ceil/floor and disagreed with six
  // goldens, which was the ORACLE being wrong, not the code.
  const exact =
    mode === 'off' ? toHundredths(total, 'off') : toHundredths(roundUnits(total, mode), 'off');

  compared += 1;
  if (Number(exact) === e.hundredths) agree += 1;
  else diffs.push({ name: c.name, mode, shipped: e.hundredths, exact: Number(exact) });
}

console.log(`golden cases in file        : ${cases.length}`);
console.log(`dose cases the oracle covers: ${compared}`);
console.log(`agree with the shipped value: ${agree}`);
console.log(`skipped (§7.4 suppression)  : ${skippedSuppressed}`);
console.log(`DISAGREE                    : ${diffs.length}`);
for (const d of diffs) console.log(`  ${d.mode.padEnd(8)} shipped ${d.shipped}  exact ${d.exact}  — ${d.name}`);
