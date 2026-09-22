/**
 * A string that names another string must name it correctly — in every language.
 *
 * `copy.ts` quotes its own controls by name. The explainer tells a reader that
 * *"Why is this smaller?"* on the result screen gives the correction back; the
 * Settings note on the stacking windows says the same; `explain.missingTitle`
 * quotes the stacking caveat verbatim so the help page defines the sentence the
 * app actually printed. Each of those is a promise that two strings agree.
 *
 * **Both promises were broken the day a second language existed.** Seven agents
 * translated seven sections of `copy.ts` in parallel, and section boundaries are
 * exactly where a cross-reference falls: the agent who owned the explainer wrote
 * «یہ چھوٹی کیوں ہے؟» and the agent who owned the result screen wrote
 * «یہ کم کیوں ہے؟», so the help page named a control that did not exist — while
 * the English comment beside it asked for a character-for-character match.
 *
 * A glossary cannot catch this. It fixes 49 WORDS; this is a whole sentence, and
 * the two halves live in different sections by construction.
 *
 * Here rather than in `check-plan.py` because here the copy is an OBJECT. The
 * checker would have to resolve a dotted key path out of TypeScript source with
 * a regex, which is the fragile half of a check that would then claim to have
 * verified something. `expect(container).toContain(part)` is exact.
 */

import { describe, expect, it } from 'vitest';
import { COPY } from '../src/ui/copy.js';
import { COPY_UR } from '../src/ui/copy-ur.js';
import type { Copy } from '../src/ui/copy.js';


/**
 * Every place one string quotes another, as a pair of readers.
 *
 * Functions are called with the arguments the screen calls them with, because
 * the quotation sits in the interpolated result and not in the template.
 */
const REFERENCES: readonly {
  readonly what: string;
  readonly container: (copy: Copy) => string;
  readonly part: (copy: Copy) => string;
}[] = [
  {
    what: 'the explainer names the control that gives a held-back correction back',
    // `stackingBody` is four paragraphs; the reference lives in the last one,
    // and joining them is what makes this independent of which one it moves to.
    container: (copy) => copy.explain.stackingBody.join(' '),
    part: (copy) => copy.calculator.whySmaller,
  },
  {
    what: "Settings' stacking-windows note names the same control",
    container: (copy) => copy.settings.stackingWindowsNote,
    part: (copy) => copy.calculator.whySmaller,
  },
  {
    what: 'the explainer quotes the held-back label the result screen prints',
    container: (copy) => copy.explain.stackingBody.join(' '),
    part: (copy) => copy.stacking.suppressedTitle,
  },
  {
    what: 'the rounding hint names the page that explains the modes',
    container: (copy) => copy.settings.modeHint,
    part: (copy) => copy.settings.openHowItWorks,
  },
];

describe('a string that quotes another string', () => {
  for (const reference of REFERENCES) {
    for (const [language, copy] of [['English', COPY] as const, ['Urdu', COPY_UR] as const]) {
      it(`${reference.what} — ${language}`, () => {
        expect(reference.container(copy)).toContain(reference.part(copy));
      });
    }
  }

  /**
   * `explain.missingTitle` is the one that quotes a PREFIX: the caveat goes on
   * after the quoted sentence, so the containment runs the other way.
   */
  for (const [language, copy] of [['English', COPY] as const, ['Urdu', COPY_UR] as const]) {
    it(`the explainer's missing-history title quotes the caveat the app prints — ${language}`, () => {
      const quoted = copy.explain.missingTitle.replace(/^[«"]|[»"]$/gu, '');
      expect(copy.stacking.missingHistory).toContain(quoted);
    });
  }
});
