import js from '@eslint/js';
import globals from 'globals';
import a11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// §11.8: no numeric literal appears anywhere except src/config.ts, and the rule
// is a lint rule rather than a convention. The exemption set is stated in the
// plan: 0, 1, -1 and 100, plus a whole-directory exemption for test fixtures,
// because §11.8 also requires golden cases to carry literal values rather than
// importing the constants they are supposed to be pinning.
const ALLOWED_LITERALS = [0, 1, -1, 100];

export default tseslint.config(
  {
    ignores: [
      'dist/**', 'coverage/**', 'reports/**', '.stryker-tmp/**', 'design/**',
      // Deliberate violations, one per pinned rule. `npm run lint` must not see
      // them; `test/lint-config.test.ts` lints them anyway with ignoring off,
      // and fails if any rule has stopped reporting. See that file.
      'src/__lint-fixtures/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // This file configures the linter; it is not part of either TypeScript
    // project, so the type-aware rules have nothing to read it with.
    files: ['*.config.js', 'tools/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.nodeBuiltin,
      parserOptions: { projectService: false, project: null },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': ['error', {
        ignore: ALLOWED_LITERALS,
        ignoreArrayIndexes: true,
        ignoreEnums: true,
        ignoreReadonlyClassProperties: true,
        ignoreTypeIndexes: true,
        enforceConst: true,
        detectObjects: false,
      }],
      // §5.3 bans toFixed in the dosing path. The ban is enforced everywhere
      // rather than in one directory, because "the dosing path" is not a
      // location a linter can see.
      //
      // **`object` is OMITTED, and that is the fix rather than the style.** This
      // read `object: '*'` from the day it was written until 2026-09-14, and
      // `no-restricted-properties` HAS NO WILDCARD: an `object` key matches an
      // object of that literal name, so `'*'` matched an identifier called `*`
      // and the rule never fired once. Omitting `object` is what means "any
      // object", and it is the only form that bans `.toFixed` everywhere.
      //
      // Nothing exploited it — there is no `toFixed` anywhere in the tree — so
      // this cost nothing, which is luck and not design. Found by the lint
      // self-test in `test/lint-config.test.ts`, on its first run, which is the
      // entire argument for that file existing.
      'no-restricted-properties': ['error', {
        property: 'toFixed',
        message: '§5.3: toFixed rounds the binary value and returns a string. Format from the authoritative integer hundredths instead.',
      }],
      'no-restricted-globals': ['error', {
        name: 'parseFloat',
        message: '§4.2: prefix parsing accepts "20g" and "1.2.3". Match the whole string against the grammar, then convert.',
      }, {
        name: 'parseInt',
        message: '§4.2: prefix parsing accepts "0x10". Match the whole string against the grammar, then convert.',
      }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // §11.8, enforced rather than asked for. `no-magic-numbers` does not report
    // `const X = 5`, so on its own it lets a file launder a literal through a
    // local constant — which is exactly how a number escapes config.ts. This
    // selector reports the literal itself, wherever it appears, and exempts only
    // the four values §11.8 names: 0, 1, -1 (a unary minus over 1) and 100.
    files: ['src/**/*.{ts,tsx}'],
    // `src/sw.ts` is exempt for a structural reason rather than a convenient
    // one: the worker compiles in its own TypeScript project against the
    // WebWorker lib, with no access to the app's module graph, so it cannot
    // import from `config.ts` at all. Its two numbers are declared at the top of
    // the file with the section that decided them.
    ignores: ['src/config.ts', 'src/sw.ts', 'src/data/**/*.ts'],
    rules: {
      // `^[0-9.]` rather than `^[0-9]`: a raw beginning with a dot is a legal
      // numeric literal (`const HALF = .5`) and escaped the original selector
      // entirely, while `no-magic-numbers` permits it in a const initialiser —
      // so BOTH rules missed it. Found by probing the pair rather than reading
      // them, which is the only way a hole in a lint rule ever shows up.
      'no-restricted-syntax': ['error', {
        selector: 'Literal[raw=/^[0-9.]/]:not([value=0]):not([value=1]):not([value=100])',
        message: '§11.8: every number lives in src/config.ts. Import it from there.',
      }, {
        // The exemptions live on the Literal, so a unary minus carried them:
        // `-100` read as the exempt 100 and escaped. §11.8 lists `-1` SEPARATELY
        // from `1`, which is the plan treating signs as distinct — so -100 was
        // never on the list, and the selector above was reading it as if it were.
        selector: 'UnaryExpression[operator="-"] > Literal[value=100]',
        message: '§11.8 exempts 100, not -100. Put it in src/config.ts.',
      },
      /**
       * T3 — the two guards JSX removed, put back as rules.
       *
       * `dom.ts` enforced both BY CONSTRUCTION and said so: its `Attrs`
       * interface had no `style` key ("a helper that offers it invites a rule
       * violation that only shows up as a silently unstyled element in
       * production"), and its header opened "Nothing here sets `innerHTML`".
       * JSX accepts every attribute, so both guarantees ended with `h()`.
       *
       * Neither is a style preference. `style` produces an element that is
       * correct in dev and silently unstyled in the deployment, because §11.5's
       * policy is `style-src 'self'`. `dangerouslySetInnerHTML` re-opens the
       * escaping question §7.7.1 had to answer for the readable export, over
       * §6.7's dosing note and §1.3's `basalName` and `basalTiming` — free text
       * that reaches these screens too.
       *
       * **In THIS array rather than a block of their own, and that is the
       * point.** Flat config REPLACES a rule's options; it does not merge them.
       * A second `no-restricted-syntax` entry matching `src/**` would have
       * switched §11.8's two selectors off for every ported file while
       * reporting clean — a linter certifying nothing, which is the exact shape
       * check-plan.py's own self-test exists to catch.
       *
       * Selectors rather than `eslint-plugin-react`'s `forbid-dom-props` and
       * `no-danger`, and the reason is the MESSAGE. That plugin is installed
       * (see the block below), so this is a choice and not a workaround — an
       * earlier version of this comment said it "will not install against
       * eslint 10", which was the reasoning at the time and stopped being true
       * two hours later. What a reader gets from these is the section that
       * decided the rule; what they would get from the plugin is a generic
       * string.
       */
      {
        selector: 'JSXAttribute[name.name="style"]',
        message: "§11.5: style-src 'self' blocks the inline style attribute, so this element ships unstyled. Put the rule in styles.css.",
      }, {
        selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
        message: '§7.7.1: this renders free text as markup. Every string here reaches the screen through textContent — keep it that way.',
      },
      /**
       * §11.1's synchronous render, pinned.
       *
       * `render()` calls Preact's top-level render, which commits before it
       * returns, so dispatch → state → DOM is ONE TURN and every test here reads
       * the DOM in the tick it clicked. `useState` does not work that way: its
       * update is scheduled, so a component holding state updates a tick later
       * than everything around it. The failure reads as a flaky test rather than
       * as a design violation, which is why it is worth a rule.
       *
       * NOT a ban — a stop sign. Adding one means deciding whether the one-turn
       * contract still holds, and saying so. Nothing in `src/ui` uses either.
       *
       * Two hooks are in the tree and both are synchronous, which is the whole
       * reason they are allowed: `useRef` in `TextInput`, and `useContext` via
       * `useCopy` on every screen — added 2026-09-21 as 10a's seam. `useContext`
       * reads the value during render and schedules nothing, so dispatch-to-DOM
       * is still one turn. This sentence said `useRef` was the ONLY hook until
       * the change that made that false, and the agent doing it reported the
       * staleness rather than leaving it.
       *
       * **In THIS array, and the first attempt was not.** It went into the
       * plugin block below as its own `no-restricted-syntax`, which silently
       * switched off all four selectors above for every `.tsx` file — §11.8's
       * two included — while `npx eslint .` reported clean. That is the hazard
       * this array's own comment describes, walked into by the person who wrote
       * the comment, the same afternoon. A seeded probe caught it in one run;
       * re-reading the file would not have.
       */
      {
        selector: 'CallExpression[callee.name=/^use(State|Reducer)$/]',
        message: '§11.1: render() is synchronous and dispatch-to-DOM is one turn — every test reads the DOM in the tick it clicked. A scheduled hook update breaks that for this component only. If you need it, decide whether the contract still holds and record the decision.',
      }],
    },
  },
  {
    /**
     * T3's three JSX plugins.
     *
     * **On the peer ranges, because the first reading of them was wrong.**
     * `eslint-plugin-jsx-a11y` declares eslint "^3 .. ^9" and
     * `eslint-plugin-react` declares "^3 .. ^9.7"; this repository is on
     * eslint 10, so npm refuses both. They were skipped on the reasoning that a
     * lint plugin which half-works reports clean on rules it never ran — which
     * is true in general and was NOT TESTED here. It was, afterwards: both load
     * and both report correctly on seeded violations under eslint 10. The
     * ranges are stale, not accurate.
     *
     * `package.json` says so declaratively rather than through a global
     * `--legacy-peer-deps`: `overrides` maps each plugin's `eslint` peer to
     * `$eslint`, the root's own version, so the relaxation is scoped to the two
     * packages it is true of and the next person can see which two.
     *
     * **Both overrides are self-retiring.** An override silences npm's peer
     * check permanently, and nothing would otherwise announce the day upstream
     * publishes a range that admits eslint 10 — the override would simply go on
     * suppressing a check that now passes. `check-plan.py`'s
     * `check_stale_overrides` fails on that day, so the fix is deleting two
     * lines rather than remembering to look.
     *
     * **`eslint-config-preact` is still not here, and on its merits.** It
     * bundles `eslint-plugin-react-hooks` at `^5.2.0` against the `^7.1.1`
     * below, and pins `@eslint/js` to `^9` — so adopting it would downgrade the
     * one plugin that never needed an override, to gain rules already listed
     * here.
     *
     * The rules of hooks are not a style matter: a hook called conditionally
     * reads the WRONG slot on the next render, and in this app a wrong slot is a
     * wrong number on a dosing screen.
     *
     * `configs.flat[...]`, not `configs[...]`: the top-level entries are still
     * eslintrc-shaped (`plugins` as an array of strings) and eslint 10 refuses
     * to load the whole config file when it meets one — a crash, not a warning,
     * and it took a seeded probe to see it because the crash output does not
     * look like a lint failure.
     */
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat['recommended-latest'], a11y.flatConfigs.recommended],
    plugins: { react },
    // `pragma: 'h'` is Preact's, and `version: 'detect'` finds no React to
    // detect — harmless for the three rules below, which are about JSX itself
    // rather than about React's runtime. The plugin is NOT extended wholesale
    // for that reason: most of what it carries is advice about a library this
    // project does not use.
    settings: { react: { version: 'detect', pragma: 'h' } },
    rules: {
      // The keys T3 introduced, guarded. A duplicate or missing key does not
      // warn at runtime — it makes Preact reuse a node for the wrong row, which
      // on the food table is a carbohydrate figure under another food's name.
      // `test/keys.test.ts` pins that the key VALUES are unique; this pins that
      // a key is there at all, which a data test cannot see.
      'react/jsx-key': ['error', { checkFragmentShorthand: true, checkKeyMustBeforeSpread: true }],
      'react/no-children-prop': 'error',
      'react/jsx-no-duplicate-props': 'error',
      // `react/forbid-dom-props` and `react/no-danger` are deliberately NOT
      // taken from here. The equivalent selectors live in §11.8's
      // `no-restricted-syntax` array above, and they carry the reason — §11.5's
      // style-src and §7.7.1's escaping rule — in the message a reader gets.
    },
  },
  {
    // §11.8's stated exemptions.
    //
    // Fixtures carry literal values on purpose: a golden case that imports
    // DEFAULT_THRESHOLD still passes when the constant changes, so it asserts
    // nothing (§13.7's wrong-oracle class).
    //
    // `src/data` is the second, RULED 2026-09-12: reference data is not
    // configuration. A food table is several hundred measurements of the world
    // rather than decisions the app takes, and §11.8's own test separates them —
    // changing HYPO_LEVEL_1 changes what the app does, changing a roti's
    // carbohydrate content does not. The exemption carries two conditions the
    // linter cannot enforce and `check-plan.py` does: the module holds data and
    // no behaviour, and every row agrees with docs/CARBS.md.
    files: ['test/**/*.{ts,tsx}', 'src/config.ts', 'src/data/**/*.ts'],
    rules: { '@typescript-eslint/no-magic-numbers': 'off' },
  },
);
