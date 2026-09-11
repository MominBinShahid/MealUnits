import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// §11.8: no numeric literal appears anywhere except src/config.ts, and the rule
// is a lint rule rather than a convention. The exemption set is stated in the
// plan: 0, 1, -1 and 100, plus a whole-directory exemption for test fixtures,
// because §11.8 also requires golden cases to carry literal values rather than
// importing the constants they are supposed to be pinning.
const ALLOWED_LITERALS = [0, 1, -1, 100];

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'reports/**', '.stryker-tmp/**', 'design/**'] },
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
    files: ['src/**/*.ts'],
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
      'no-restricted-properties': ['error', {
        object: '*',
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
    files: ['src/**/*.ts'],
    // `src/sw.ts` is exempt for a structural reason rather than a convenient
    // one: the worker compiles in its own TypeScript project against the
    // WebWorker lib, with no access to the app's module graph, so it cannot
    // import from `config.ts` at all. Its two numbers are declared at the top of
    // the file with the section that decided them.
    ignores: ['src/config.ts', 'src/sw.ts'],
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
      }],
    },
  },
  {
    // §11.8's stated exemption. Fixtures carry literal values on purpose: a
    // golden case that imports DEFAULT_THRESHOLD still passes when the constant
    // changes, so it asserts nothing (§13.7's wrong-oracle class).
    files: ['test/**/*.ts', 'src/config.ts'],
    rules: { '@typescript-eslint/no-magic-numbers': 'off' },
  },
);
