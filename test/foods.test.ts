import { describe, expect, it } from 'vitest';
import { matchFoods } from '../src/core/foods.js';
import type { Searchable } from '../src/core/foods.js';
import { FOODS } from '../src/data/carbs.js';

const ROTI: Searchable = { name: 'Home flatbread, medium', roman: 'Roti', aliases: ['roti', 'chapati', 'chappati'] };
const NAAN: Searchable = { name: 'Tandoor naan, small tier', roman: 'Naan', aliases: ['naan', 'nan'] };
const QEEMA: Searchable = { name: 'Mince samosa', roman: 'Qeema samosa', aliases: ['keema samosa', 'kheema samosa'] };
const ALL = [ROTI, NAAN, QEEMA];

describe('searching the carbohydrate reference', () => {
  it('an empty query returns everything, because the screen opens before anything is typed', () => {
    // An empty list here would read as "no food matches" rather than "start
    // typing", which is the wrong thing to tell someone who has just arrived.
    expect(matchFoods(ALL, '')).toEqual(ALL);
  });

  it('and so does a query of only spaces', () => {
    expect(matchFoods(ALL, '   ')).toEqual(ALL);
  });

  it('matches the English name, whatever the case', () => {
    expect(matchFoods(ALL, 'TANDOOR')).toEqual([NAAN]);
    expect(matchFoods(ALL, 'tandoor')).toEqual([NAAN]);
  });

  it('matches the Roman Urdu name, which is what the food is called out loud', () => {
    expect(matchFoods(ALL, 'Roti')).toEqual([ROTI]);
  });

  it('matches a spelling variant, so the row is found however it is typed', () => {
    // The whole reason aliases are an explicit list: "keema" and "qeema" are
    // the same mince and a reader types whichever they learned.
    expect(matchFoods(ALL, 'keema')).toEqual([QEEMA]);
    expect(matchFoods(ALL, 'kheema')).toEqual([QEEMA]);
    expect(matchFoods(ALL, 'chappati')).toEqual([ROTI]);
  });

  it('is a substring match, not a prefix — "naan" has to find "Tandoor naan"', () => {
    expect(matchFoods(ALL, 'naan')).toEqual([NAAN]);
    expect(matchFoods(ALL, 'samosa')).toEqual([QEEMA]);
  });

  it('trims the query, because a trailing space is a typing artefact not a filter', () => {
    expect(matchFoods(ALL, '  roti  ')).toEqual([ROTI]);
  });

  it('returns nothing when nothing matches, rather than something adjacent', () => {
    // Deliberate: fuzzy matching on food names eventually returns the wrong
    // dish, and a wrong dish is a wrong dose. Empty is the honest answer.
    expect(matchFoods(ALL, 'pizza')).toEqual([]);
  });

  it('can match more than one row', () => {
    const both = matchFoods([ROTI, NAAN], 'a');
    expect(both).toHaveLength(2);
  });
});

describe('the shipped table — §11.8\'s exemption conditions, as tests', () => {
  it('every row carries a source and a confidence, which is what the exemption was granted on', () => {
    for (const food of FOODS) {
      expect(food.source, food.id).not.toBe('');
      expect(['high', 'medium', 'low']).toContain(food.confidence);
    }
  });

  it('every id is unique, because the id is what a saved preference will key on', () => {
    const ids = FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no row claims NEGATIVE carbohydrate, and a range never runs backwards', () => {
    // Zero is a real answer and the table has to be able to give it. Grilled
    // meat, tikka, fish and eggs are 0–4 g [CoFID; USDA, HIGH] — and "do not
    // dose for this" is one of the more useful things a bolus calculator can
    // say. The rule read `> 0` and forbade it.
    //
    // It was written in the same batch as the unique-id and
    // range-not-backwards checks, as a guard against a half-filled row. That
    // job is already done, properly, by the source-and-confidence test above:
    // a forgotten row has no source, and a row that has one was filled in on
    // purpose. `> 0` added nothing to it and cost a true value.
    //
    // Negative stays impossible, because nothing contains less than none.
    for (const food of FOODS) {
      expect(food.grams, food.id).toBeGreaterThanOrEqual(0);
      if (food.gramsMax !== null) {
        expect(food.gramsMax, food.id).toBeGreaterThan(food.grams);
      }
    }
  });

  it('every row is findable by its own Urdu name', () => {
    // A row nobody can search for is a row nobody will read, and the Urdu name
    // is the one a person in Karachi reaches for first.
    for (const food of FOODS) {
      expect(matchFoods(FOODS, food.roman), food.id).toContain(food);
    }
  });

  it('every spelling of a dish finds every row of that dish', () => {
    // The aliases are hand-written, and a hand-written list drifts: a variant
    // gets added to whichever row was being edited that day. `chaawal` reached
    // ONE of the three plain-rice rows, so a reader who spells it with the long
    // vowel saw the 42 g bowl and never learned the plate is 84 g. `nan` reached
    // three of the seven naans.
    //
    // A partial answer is worse than an empty one. An empty result makes you
    // retype; three rows out of seven looks like the whole truth, and the count
    // line beside it says so.
    // The rows each spelling must reach, named rather than counted: a count
    // passes when the right number of WRONG rows come back.
    const FAMILIES: ReadonlyArray<readonly [string, readonly string[], readonly string[]]> = [
      [
        'plain rice',
        ['rice', 'chawal', 'chaawal', 'chaval', 'sada chawal', 'ublay chawal'],
        ['rice-katori', 'rice-cup', 'rice-plate'],
      ],
      [
        'naan',
        ['naan', 'nan'],
        ['naan-small', 'naan-middle', 'naan-large', 'naan-restaurant',
          'naan-afghani-half', 'naan-roghni', 'kulcha-tandoor'],
      ],
      [
        'chai',
        ['chai', 'chaye', 'doodh wali chai'],
        ['chai-150-1', 'chai-150-2', 'chai-200-2', 'chai-250-2'],
      ],
      [
        'pulao',
        ['pulao', 'pulav'],
        ['pulao', 'pulao-kabuli', 'pulao-matar', 'pulao-chana'],
      ],
      // The English word and the Urdu word for the same category. Neither
      // reached a single row: every gravy dish was named only by its own name,
      // so someone who did not already know the dish had no way in. Momin
      // asked for this by name — "it should be findable if I search for
      // C U R R Y".
      [
        'gravy dishes',
        ['curry', 'salan'],
        ['karahi', 'korma', 'daal-thin', 'daal-thick'],
      ],
      // `kadai` and `karai` are ordinary spellings of karahi and reached
      // nothing. They matter more than they look: once kadhi ships, a query
      // that finds neither dish is better than one that silently finds the
      // wrong one, and these two are the near-misses between them.
      [
        'karahi spellings',
        ['karahi', 'kadhai', 'karhai', 'kadai', 'karai'],
        ['karahi'],
      ],
    ];
    // A superset, not an equality: `chawal` also reaches `pulao-chana`, because
    // chana pulao genuinely is «chanay walay chawal». Reaching a related dish is
    // not the failure this test is for — MISSING one is.
    for (const [family, spellings, expected] of FAMILIES) {
      for (const spelling of spellings) {
        const ids = matchFoods(FOODS, spelling).map((f) => f.id);
        for (const id of expected) {
          expect(ids, `${family}: "${spelling}" does not reach ${id}`).toContain(id);
        }
      }
    }
  });

  it('"chaa" reaches rice as well as tea, and that is known', () => {
    // NOT an assertion that this is right. `chaa` is a real spelling of chai and
    // it is also the first four letters of `chaawal`, so substring matching
    // cannot separate them and neither can prefix matching. Pinned so the
    // overlap is a decision on the record rather than a surprise later.
    //
    // It predates the alias sweep: `chaa` already reached `rice-katori` on the
    // deployed app. The sweep widened it to all three rice rows by giving them
    // the `chaawal` spelling they were missing.
    const ids = matchFoods(FOODS, 'chaa').map((f) => f.id);
    expect(ids).toContain('chai-150-1');
    expect(ids).toContain('rice-katori');
  });

  it('a name carrying §10.4\'s no-break space is still found by typing a space', () => {
    // `Large flatbread, 12\u00A0inch` — the name is rendered AND searched, and
    // nobody can type U+00A0. Without the fold in `matchFoods`, this row is
    // unreachable by the words printed on it.
    const row = FOODS.find((f) => f.name.includes('\u00A0'));
    expect(row, 'no row carries a no-break space — retarget this test').toBeDefined();
    expect(matchFoods(FOODS, '12 inch')).toContain(row);
    // And the character itself still works, so neither spelling is privileged.
    expect(matchFoods(FOODS, '12\u00A0inch')).toContain(row);
  });

  it('every row is findable by the words printed in its own name', () => {
    // The general form of the case above: whatever a row displays, typing it
    // finds the row. Guards the next name that gains a no-break space.
    for (const food of FOODS) {
      const asDisplayed = food.name.replace(/\u00A0/g, ' ');
      expect(matchFoods(FOODS, asDisplayed), food.id).toContain(food);
    }
  });
});
