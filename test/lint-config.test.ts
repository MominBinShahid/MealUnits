/**
 * §20.3, applied to the linter itself — ADDED 2026-09-14.
 *
 * **A lint rule's healthy output is silence, which is also what a rule that has
 * stopped running looks like.** That is the same failure mode `check-plan.py`
 * grew `--self-test` for, and the linter had no equivalent. It cost twice in one
 * afternoon:
 *
 *   * ESLint flat config REPLACES a rule's options rather than merging them, so
 *     a second config object matching `src/**` and setting `no-restricted-syntax`
 *     silently switched off all four of §11.8's and §11.5's selectors while
 *     `npx eslint .` printed nothing. It was written up as a warning inside the
 *     array's own comment, and then walked into hours later by the person who
 *     wrote the warning.
 *   * `eslint-plugin-react-hooks` crashed eslint 10 on load, because its
 *     top-level configs are still eslintrc-shaped. A crash, not a lint failure,
 *     and its output does not look like one.
 *
 * And on the first run of THIS file it found a third: §5.3's `toFixed` ban read
 * `object: '*'`, and `no-restricted-properties` has no wildcard — `object`
 * matches a literal name, so the rule had never fired once since it was written.
 * Nothing had exploited it, which was luck.
 *
 * **Asserted on the MESSAGE, not only the rule id.** Four separate selectors
 * share the id `no-restricted-syntax`, so an id-level assertion passes while
 * three of the four are gone. The `§` each message opens with is what
 * distinguishes them, and it is also what a reader gets told when one fires.
 *
 * The fixture lives under `src/` and not `test/` because that is the only place
 * the rules under test apply: §11.8's selectors are scoped to `src/**`, and the
 * `test/**` block turns `no-magic-numbers` off. A fixture in `test/` would
 * exercise a different configuration from the one protecting the app.
 */

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const FIXTURE = 'src/__lint-fixtures/violations.tsx';

/**
 * `ignore: false`, because `eslint.config.js` globally ignores the fixture so
 * that `npm run lint` stays clean. Without this the run reports nothing and the
 * whole file passes over a config with every rule removed.
 */
async function lintFixture(): Promise<ESLint.LintResult[]> {
  const eslint = new ESLint({ cwd: process.cwd(), ignore: false });
  return eslint.lintFiles([FIXTURE]);
}

let cached: ESLint.LintResult[] | null = null;
async function findings(): Promise<{ ruleId: string; message: string }[]> {
  cached ??= await lintFixture();
  return cached.flatMap((result) =>
    result.messages.map((message) => ({
      // A fatal parse error has no ruleId, and would otherwise read as "no rule
      // fired" for every assertion below rather than as the breakage it is.
      ruleId: message.ruleId ?? `FATAL(${message.message})`,
      message: message.message,
    })),
  );
}

/**
 * `BACKLOG` T21 — the first case pays for the whole file, and it needed longer
 * than vitest's default five seconds.
 *
 * `findings()` caches, so ONE case spawns a real ESLint over the fixture and
 * the other eleven read its result. That one took 6.3 seconds during a full
 * `vitest run` — not cold start, since it passes in well under five when this
 * file runs alone: it is contention with the other twenty-eight files sharing
 * the cores.
 *
 * It matters because this file is inside `npm run check`, which is a required
 * CI job. A required job that fails on machine load fails for a reason the log
 * does not name, and the reflex it trains is "re-run it" — the same reflex that
 * hides a real failure.
 *
 * The number is about PROCESS START, not about the assertion. Thirty seconds is
 * far past anything observed and still far short of the run hanging.
 */
const ESLINT_START_MS = 30_000;

describe('the linter still reports what eslint.config.js claims', () => {
  it('parses the fixture at all', async () => {
    const reported = await findings();
    expect(reported.filter((f) => f.ruleId.startsWith('FATAL'))).toEqual([]);
    // A fixture that stopped violating anything is a fixture that proves
    // nothing, and it would leave every case below passing on an empty set.
    expect(reported.length).toBeGreaterThan(0);
  }, ESLINT_START_MS);

  /**
   * Each entry is a rule the project depends on, paired with a fragment of the
   * message it must produce. The fragment is the point: `no-restricted-syntax`
   * carries four unrelated bans under one id.
   */
  const PINNED: readonly (readonly [string, string, string])[] = [
    ['§11.8 numeric literals live in config.ts', 'no-restricted-syntax', '§11.8'],
    ['§11.5 no inline style attribute', 'no-restricted-syntax', '§11.5'],
    ['§7.7.1 no dangerouslySetInnerHTML', 'no-restricted-syntax', '§7.7.1'],
    ['§11.1 no scheduled hook state', 'no-restricted-syntax', '§11.1'],
    ['§5.3 no toFixed', 'no-restricted-properties', '§5.3'],
    ['§4.2 no parseFloat or parseInt', 'no-restricted-globals', '§4.2'],
    ['§11.8 no-magic-numbers', '@typescript-eslint/no-magic-numbers', ''],
    ['strict equality', 'eqeqeq', ''],
    ['the rules of hooks', 'react-hooks/rules-of-hooks', ''],
    ['a list element without a key', 'react/jsx-key', ''],
    ['an image without alt text', 'jsx-a11y/alt-text', ''],
  ];

  for (const [what, ruleId, fragment] of PINNED) {
    it(`reports ${what}`, async () => {
      const reported = await findings();
      const matched = reported.filter(
        (f) => f.ruleId === ruleId && (fragment === '' || f.message.includes(fragment)),
      );
      expect(matched.length).toBeGreaterThan(0);
    });
  }
});
