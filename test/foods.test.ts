import { describe, expect, it } from 'vitest';
import { matchFoods } from '../src/core/foods.js';
import type { Searchable } from '../src/core/foods.js';
import { FOODS } from '../src/data/carbs.js';

const ROTI: Searchable = { name: 'Home flatbread, medium', urdu: 'Roti', aliases: ['roti', 'chapati', 'chappati'] };
const NAAN: Searchable = { name: 'Tandoor naan, small tier', urdu: 'Naan', aliases: ['naan', 'nan'] };
const QEEMA: Searchable = { name: 'Mince samosa', urdu: 'Qeema samosa', aliases: ['keema samosa', 'kheema samosa'] };
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

  it('no row claims zero or negative carbohydrate, and a range never runs backwards', () => {
    for (const food of FOODS) {
      expect(food.grams, food.id).toBeGreaterThan(0);
      if (food.gramsMax !== null) {
        expect(food.gramsMax, food.id).toBeGreaterThan(food.grams);
      }
    }
  });

  it('every row is findable by its own Urdu name', () => {
    // A row nobody can search for is a row nobody will read, and the Urdu name
    // is the one a person in Karachi reaches for first.
    for (const food of FOODS) {
      expect(matchFoods(FOODS, food.urdu), food.id).toContain(food);
    }
  });
});
