import { defineConfig } from 'vitest/config';

/**
 * The test run Stryker uses, and only that.
 *
 * §13.4 puts mutation testing "over the whole core in §13.1". Tests that touch
 * no mutated file add nothing to the score and cost a run each — and two of them
 * exercise `fake-indexeddb`, whose `DOMException` the Stryker vitest runner
 * cannot stringify when it collects results, which crashes the dry run outright.
 *
 * `npm test` still runs everything. This file narrows the MUTATION run to the
 * suites that cover the mutated files, which is what the plan asks for anyway.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'test/bands.test.ts',
      'test/baseline.test.ts',
      'test/calculate.test.ts',
      'test/calendar.test.ts',
      'test/config.test.ts',
      'test/decimal.test.ts',
      'test/divergence.test.ts',
      'test/golden.test.ts',
      'test/history.test.ts',
      'test/ids.test.ts',
      'test/machine.test.ts',
      'test/parse.test.ts',
      'test/periods.test.ts',
      'test/resolve.test.ts',
      'test/round.test.ts',
      'test/stacking.test.ts',
      'test/sweep.test.ts',
      'test/timing.test.ts',
      'test/types.test.ts',
    ],
  },
});
