import { describe, expect, it } from 'vitest';
import { asksAboutSugarFree, matchFoods } from '../src/core/foods.js';
import type { Searchable } from '../src/core/foods.js';
import { FOODS } from '../src/data/carbs.js';
import type { Food } from '../src/data/carbs.js';
import { IN_A_MATRIX, MATRICES } from '../src/ui/matrices.js';

const ROTI: Searchable = { text: { en: { name: 'Home flatbread, medium' } }, roman: 'Roti', aliases: ['roti', 'chapati', 'chappati'] };
const NAAN: Searchable = { text: { en: { name: 'Tandoor naan, small tier' } }, roman: 'Naan', aliases: ['naan', 'nan'] };
const QEEMA: Searchable = { text: { en: { name: 'Mince samosa' } }, roman: 'Qeema samosa', aliases: ['keema samosa', 'kheema samosa'] };
const ALL = [ROTI, NAAN, QEEMA];

/** A row's English name. The table keys text by language; search reads English. */
const nameOf = (food: Food): string => food.text.en.name;
/** A row's Urdu name — what Momin's mother reviews. */
const urduOf = (food: Food): string => food.text.ur.name;

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

  // Four rows in DELIBERATELY ADVERSE order — worst match first — so that any
  // mutant which flattens the tiers leaves them where they started and fails.
  // Real FOODS rows are too kind for this: their tiers rarely disagree enough
  // to change the final order, which is how the first version of these tests
  // passed while the mutation gate found twenty-five survivors.
  //
  // Every row's three fields DIFFER, and only one of them carries the match.
  // That is deliberate: with `name` and `roman` identical, `some` and `every`
  // behave the same over the field list and three mutants survive — which is
  // exactly what the gate reported on the first attempt.
  const SUBSTRING: Searchable = { text: { en: { name: 'Zrotix' } }, roman: 'Qorma', aliases: ['bread'] };
  const WORD_START: Searchable = { text: { en: { name: 'Moti roti' } }, roman: 'Ghar ki', aliases: ['bread'] };
  const PREFIX: Searchable = { text: { en: { name: 'Roti, thin' } }, roman: 'Patli', aliases: ['bread'] };
  const EXACT: Searchable = { text: { en: { name: 'Roti' } }, roman: 'Phulka', aliases: ['bread'] };
  const ADVERSE = [SUBSTRING, WORD_START, PREFIX, EXACT];

  it('orders exact, then prefix, then word-start, then substring', () => {
    // The whole point, at 270 rows: `roti` reaches 17 of them, and in data-file
    // order the row actually CALLED "Roti" can render below one that matched on
    // its ninth alias. The reader scrolls, does not see the obvious answer, and
    // takes something adjacent — the wrong-dish failure this module exists to
    // prevent, arriving through ordering rather than through matching.
    expect(matchFoods(ADVERSE, 'roti')).toEqual([EXACT, PREFIX, WORD_START, SUBSTRING]);
  });

  it('a word-start is not a word-END', () => {
    // Separate query because `roti` cannot tell them apart: the word "roti"
    // both starts AND ends with it. `rot` starts "roti" and ends nothing, so
    // this is the case that pins `startsWith` against `endsWith` — and the
    // same query pins splitting on a SPACE, since splitting on '' gives single
    // characters and no character starts with "rot".
    expect(matchFoods(ADVERSE, 'rot')).toEqual([PREFIX, EXACT, WORD_START, SUBSTRING]);
  });

  it('ordering is the ONLY thing ranking changes', () => {
    // The guard that matters. Ranking runs after the filter has already decided
    // what matches, and a comparator cannot add or drop a row — but that is an
    // argument, and this is the assertion.
    const queries = ['roti', 'naan', 'chai', 'chawal', 'curry', 'salan', 'moti', 'oti', '', 'zzz'];
    for (const q of queries) {
      const got = [...matchFoods(FOODS, q)].map((f) => f.id).sort();
      const expected = FOODS.filter((f) =>
        [nameOf(f), f.roman, ...f.aliases].some((v) =>
          v.replace(/\u00A0/g, ' ').trim().toLowerCase().includes(q.trim().toLowerCase())))
        .map((f) => f.id).sort();
      expect(got, `"${q}" changed which rows match`).toEqual(expected);
    }
  });

  it('ties keep the table\'s own order, which is smallest first', () => {
    // Within a family the data file ascends by size, and that is information:
    // the three plain-rice rows are 42, 50 and 84 g. A sort that scrambled
    // equal-ranked rows would lose it. `Array.prototype.sort` is required to be
    // stable since ES2019; this pins that we rely on it.
    expect(matchFoods(FOODS, 'chaawal').map((f) => f.id))
      .toEqual(['rice-katori', 'rice-cup', 'rice-plate']);
  });

  it('"karhi" shows BOTH karahi and kadhi rather than silently picking one', () => {
    // Two different dishes whose Roman spellings are four characters apart, at
    // roughly four times the carbohydrate: karahi 4 g against kadhi 15 g. In
    // Urdu they are کڑاہی and کڑھی and nobody confuses them; in Roman "karhi"
    // is a defensible spelling of either.
    //
    // Returning ONE of them is the hazard — the reader gets an answer, it looks
    // like the answer, and there is nothing on screen to say a different dish
    // was also a candidate. Returning both is safe, because the names and the
    // gram figures are right there and the choice is a person's again. Same
    // disposition as the `chaa` overlap below, for the same reason.
    const ids = matchFoods(FOODS, 'karhi').map((f) => f.id);
    expect(ids).toContain('karahi');
    expect(ids).toContain('kadhi');
  });

  it('"tehari" and "nehari" never cross, and they are one character apart', () => {
    // The sharpest near-miss in the table, and unlike karahi/kadhi the answer
    // is NOT to show both. Aloo tahiri is a rice dish at 50–90 g; nihari is a
    // gravy at 7–20 g. Seven to twelve times apart, one character apart in
    // Roman, and BOTH spellings come straight from docs/CARBS.md — neither is
    // a typo anyone should be protected from.
    //
    // So this is not a fix, it is a fence. Each spelling reaches exactly its
    // own dish today, and a future alias edit that merged them would put a
    // 50 g answer under a 7 g question. Pinned so that edit fails here.
    const tehari = matchFoods(FOODS, 'tehari').map((f) => f.id);
    const nehari = matchFoods(FOODS, 'nehari').map((f) => f.id);
    expect(tehari).toContain('tahiri-cup');
    expect(nehari).toContain('nihari');
    expect(tehari.filter((id) => nehari.includes(id)), 'the two dishes now overlap').toEqual([]);
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
    // EVERY such row, not the first one found. The original version took
    // `FOODS.find(...)` and searched `12 inch`, which worked only because the
    // row it happened to land on was the one named `12\u00A0inch` — an accident
    // of the 31 original rows sorting before the 288 promoted ones. Six rows
    // carry the character now, and a reorder would have pointed the assertion
    // at a different row while still passing for the wrong reason.
    //
    // Asserting the PROPERTY instead of an example is both stronger and
    // order-independent: whatever is printed on the row must find the row.
    const rows = FOODS.filter((f) => nameOf(f).includes('\u00A0'));
    expect(rows.length, 'no row carries a no-break space — retarget this test').toBeGreaterThan(0);
    for (const row of rows) {
      // Typed with an ordinary space, which is all anyone can type...
      expect(matchFoods(FOODS, nameOf(row).replace(/\u00A0/g, ' ')), row.id).toContain(row);
      // ...and with the character itself, so neither spelling is privileged.
      expect(matchFoods(FOODS, nameOf(row)), row.id).toContain(row);
    }
  });

  it('every row is findable by the words printed in its own name', () => {
    // The general form of the case above: whatever a row displays, typing it
    // finds the row. Guards the next name that gains a no-break space.
    for (const food of FOODS) {
      const asDisplayed = nameOf(food).replace(/\u00A0/g, ' ');
      expect(matchFoods(FOODS, asDisplayed), food.id).toContain(food);
    }
  });
});

describe('the matrices — a family whose two axes are both real variables', () => {
  it('every cell names a row that exists, and no row is in two matrices', () => {
    // Declared rather than derived, so something has to check the declaration.
    // Deriving it would mean parsing "large mug, 3 sugars" out of prose, which
    // drops a cell silently the day somebody rewords a row; declaring it drops
    // a cell loudly, here.
    const seen = new Set<string>();
    for (const matrix of MATRICES) {
      for (const id of matrix.cells.flat()) {
        if (id === null) continue;
        expect(FOODS.some((f) => f.id === id), `${matrix.key} names a missing row: ${id}`)
          .toBe(true);
        expect(seen.has(id), `${id} is in two matrices`).toBe(false);
        seen.add(id);
      }
    }
    expect(seen.size).toBe(IN_A_MATRIX.size);
  });

  it('every cell in a matrix sits in the group that matrix renders inside', () => {
    // Otherwise the table appears under one heading while the rows it replaced
    // are filtered out of another, and those rows vanish from the app.
    for (const matrix of MATRICES) {
      for (const id of matrix.cells.flat()) {
        if (id === null) continue;
        const food = FOODS.find((f) => f.id === id);
        expect(food?.category, `${id} is not in ${matrix.category}`).toBe(matrix.category);
      }
    }
  });

  it('a row inside a matrix is still findable by typing its name', () => {
    // The table replaces the rows while BROWSING only. Search stays flat, so
    // every cell keeps the name, portion, confidence and source that a cell is
    // too small to carry — which is the reason a grid was refused and a matrix
    // was not.
    for (const id of IN_A_MATRIX) {
      const food = FOODS.find((f) => f.id === id);
      if (food === undefined) continue;
      expect(matchFoods(FOODS, nameOf(food)).map((f) => f.id), `${id} is unreachable by search`)
        .toContain(id);
    }
  });
});

describe('the Urdu names — display only, and every one distinct', () => {
  it('every row has one, and it is Urdu script', () => {
    for (const food of FOODS) {
      expect(urduOf(food).length, `${food.id} has no Urdu name`).toBeGreaterThan(0);
      expect(/[؀-ۿ]/.test(urduOf(food)), `${food.id} carries no Urdu letters`).toBe(true);
    }
  });

  it('no two foods read the same in Urdu, even after folding', () => {
    // THE property this field has to hold. 54 groups share a `roman` and no two
    // rows in any group share a gram figure — four say 'Naan' and span 60 to
    // 90 g. Two rows reading alike in Urdu is a reader choosing blind on a
    // number that becomes insulin, so the qualifier goes into the name.
    //
    // Folded before comparing, because two names differing only by a harakat or
    // by Arabic-vs-Urdu yeh are the same name to a reader's eye at 14px.
    const fold = (value: string): string => value
      .normalize('NFC')
      .replace(/[ً-ٰٕ]/g, '')
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ه/g, 'ہ')
      .replace(/[\u200B-\u200F\uFEFF\u060C,.\s]/g, '');
    const seen = new Map<string, string>();
    for (const food of FOODS) {
      const key = fold(urduOf(food));
      const first = seen.get(key);
      expect(first, `${food.id} and ${String(first)} read the same in Urdu`).toBeUndefined();
      seen.set(key, food.id);
    }
  });

  it('digits stay ASCII, per docs/URDU.md ruling 1', () => {
    // Urdu-Indic digits appear nowhere in this app, and a food name is exactly
    // where they would creep in.
    for (const food of FOODS) {
      expect(/[۰-۹٠-٩]/.test(urduOf(food)), food.id).toBe(false);
    }
  });

  it('the only Latin left in an Urdu name is a brand', () => {
    // Ruling 2: a token whose job is to match something the reader is holding
    // stays in that thing's script. Ten brands qualify; anything else in Latin
    // is a name that did not get translated.
    const BRANDS = /^(Cadbury|Dairy|Milk|Caramel|KitKat|Lindt|Excellence|Loacker|Nido|Dawn|Sooper|Rooh|Afza|Royal|Special|Yaadgaar)$/;
    for (const food of FOODS) {
      for (const word of urduOf(food).match(/[A-Za-z][A-Za-z0-9%-]*/g) ?? []) {
        expect(BRANDS.test(word), `${food.id} has untranslated Latin: ${word}`).toBe(true);
      }
    }
  });
});

describe('a search for sugar-free gets an answer, not an absence', () => {
  // CARBS.md section 20 refuses to publish a figure for sugar-free
  // confectionery, and that refusal is right: the label counts sugar alcohols
  // as carbohydrate, the body absorbs little of them, and dosing the printed
  // number gives insulin for food that is not there.
  //
  // What this pins is the second half — refusing SILENTLY sends the reader to
  // the packet, which is the thing the refusal exists to prevent.

  it('recognises the words a reader would actually type', () => {
    for (const query of [
      'sugar free', 'sugarfree', 'sugar-free', 'Sugar Free', 'SUGAR FREE',
      'gum', 'chewing gum', 'sugar free gum', 'stevia', 'maltitol', 'sorbitol',
      'xylitol', 'erythritol', 'isomalt', 'polyol', 'sugar alcohol',
      'diabetic sweet', 'diabetic mithai', 'diabetic chocolate',
      'no sugar added',
    ]) {
      expect(asksAboutSugarFree(query), query).toBe(true);
    }
  });

  it('leaves ordinary searches alone', () => {
    // Every one of these is a real thing to look up, and none of them should
    // be answered with a lecture about polyols.
    for (const query of [
      '', '   ', 'roti', 'chawal', 'biryani', 'sugar', 'cheeni', 'gulab jamun',
      'chai', 'mithai', 'chocolate', 'sweet', 'barfi',
    ]) {
      expect(asksAboutSugarFree(query), query).toBe(false);
    }
  });

  it('sends a diet DRINK to its real row rather than to the explanation', () => {
    // The split this whole feature rests on. A diet cola is aspartame, not a
    // polyol, and it genuinely is zero — it has a row with a real figure and a
    // HIGH confidence. Routing it to "there is no honest number" would be a
    // downgrade, so the drink words are deliberately absent from the predicate.
    for (const query of ['coke zero', 'pepsi max', 'sprite zero', '7up free', 'diet coke']) {
      expect(asksAboutSugarFree(query), query).toBe(false);
      const hits = matchFoods(FOODS, query);
      expect(hits.length, query).toBeGreaterThan(0);
      expect(hits[0]?.id, query).toBe('zero-drinks');
    }
    const zero = FOODS.find((food) => food.id === 'zero-drinks');
    expect(zero?.grams).toBe(0);
  });

  it('and the confectionery it refuses to price is still absent from the table', () => {
    // If a sugar-free sweet ever gains a row, this fails — and it should, so
    // that the figure and the explanation are reconsidered together.
    for (const food of FOODS) {
      expect(/sugar[- ]?free/i.test(nameOf(food)), food.id).toBe(false);
    }
  });
});

describe('the language map — what T28 said would eventually be needed', () => {
  // The shape changed from four flat fields (`name`, `script`, `portion`,
  // `varies`) to `text` keyed by language, on the day the Urdu portions and
  // varies notes arrived — the one moment all 319 rows were being rewritten
  // anyway. What follows is the promise that migration was allowed on.

  it('every row speaks both languages, with nothing left blank', () => {
    for (const food of FOODS) {
      for (const [lang, text] of Object.entries(food.text)) {
        expect(text.name.length, `${food.id} has no ${lang} name`).toBeGreaterThan(0);
        expect(text.portion.length, `${food.id} has no ${lang} portion`).toBeGreaterThan(0);
      }
    }
  });

  it('a row says it varies in both languages or in neither', () => {
    // `varies` is the honest caveat about what moves the number. A row that
    // carries one in English and null in Urdu would quietly drop the caveat for
    // the reader least able to supply it themselves.
    for (const food of FOODS) {
      expect(food.text.ur.varies === null, `${food.id} disagrees on varies`)
        .toBe(food.text.en.varies === null);
    }
  });

  it('the Urdu portion keeps every WEIGHT the English one states', () => {
    // A translation may change every word and no measurement. The portion line
    // is where a weight reaches the reader, and one saying 150 in one language
    // and 120 in the other is a dosing error wearing a translation's clothes.
    //
    // TWO DIGITS OR MORE, which is the weights and not the counts. Urdu words
    // its small numbers where English uses a figure — «ڈیڑھ کپ» for "1 and a
    // half cups", «پورا ڈبہ» for "1 sharing tin" — and demanding digit-for-digit
    // equality would have forced eleven rows into stilted Urdu to satisfy a
    // test. Every number that carries a unit has two digits or more; this ran
    // over all 319 rows and found zero disagreements, so the rule is tight
    // enough to be worth keeping and loose enough to let the language breathe.
    const weights = (value: string): string[] => (value.match(/\d{2,}(?:\.\d+)?/g) ?? []).sort();
    for (const food of FOODS) {
      expect(weights(food.text.ur.portion), `${food.id} portion weights differ`)
        .toEqual(weights(food.text.en.portion));
    }
  });

  it('no Urdu string writes a range with a dash', () => {
    // Bidi rule N1: `20-30` between two right-to-left words paints as `30-20`,
    // and it has shipped in this app once already. Urdu ranges use «سے».
    for (const food of FOODS) {
      const all = `${food.text.ur.name} ${food.text.ur.portion} ${food.text.ur.varies ?? ''}`;
      expect(/\d\s*[-\u2013]\s*\d/.test(all), `${food.id} has a dash range in Urdu`).toBe(false);
    }
  });
});
