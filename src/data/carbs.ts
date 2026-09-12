/**
 * §11.8's second exemption — RULED BY MOMIN 2026-09-12: reference data is not
 * configuration.
 *
 * Every number here is a MEASUREMENT OF THE WORLD, not a decision the app
 * takes. Nobody edits "one medium roti is 18 g" to change how the app behaves.
 * That is the test §11.8 sets, and it is why these live here rather than in
 * `config.ts`, which holds the forty values that genuinely are decisions.
 *
 * **Two conditions the exemption carries, both load-bearing:**
 *
 * 1. **This module holds data and nothing else.** No thresholds, no behaviour,
 *    no branches. The moment an `if (grams > X)` appears here, X is a decision
 *    wearing data's clothes and belongs in `config.ts`.
 * 2. **Every row carries its source and its confidence**, which the type
 *    enforces by making both required. A number nobody can trace is worse here
 *    than in `config.ts`, where a section header at least says who may change
 *    it.
 *
 * `docs/CARBS.md` is the reasoning behind every value — sources, the
 * disagreements between them, and the foods nobody has ever analysed. This file
 * is the payload. **They must agree, and `check-plan.py` checks that they do**
 * rather than trusting that they will.
 *
 * **These values scale an insulin dose.** Where sources disagreed, the range is
 * carried rather than averaged into a false midpoint — `gramsMax` is not
 * decoration, it is the honest width of what is known.
 */

/** How much the value can be trusted, and therefore how it should be shown. */
export type Confidence = 'high' | 'medium' | 'low';

export interface Food {
  /** Stable key. Never shown; used for the "always use this one" choice later. */
  readonly id: string;
  /** English name, as the list is read. */
  readonly name: string;
  /** Roman Urdu, because that is what the food is called out loud. */
  readonly urdu: string;
  /**
   * Spelling variants, so search finds the row however it is typed. An explicit
   * list rather than fuzzy matching: fuzzy matching on food names in a dosing
   * app eventually matches the wrong dish, and a wrong dish is a wrong dose.
   */
  readonly aliases: readonly string[];
  /** What is being measured — "1 cup, 160 g", "1 medium, 7 inch". */
  readonly portion: string;
  /** Grams of carbohydrate. The number the app asks for. */
  readonly grams: number;
  /** Upper bound where the sources genuinely disagree, else null. */
  readonly gramsMax: number | null;
  /** Why it varies, in one line, or null when it barely does. */
  readonly varies: string | null;
  readonly confidence: Confidence;
  /** Which source, using docs/CARBS.md's tags. */
  readonly source: string;
}

export const FOODS: readonly Food[] = [
  // ── Breads ────────────────────────────────────────────────────────────────
  {
    id: 'phulka',
    name: 'Thin flatbread, small',
    urdu: 'Phulka',
    aliases: ['phulka', 'chapati', 'chapatti', 'roti', 'fulka'],
    portion: '1 small, about 35 g',
    grams: 12,
    gramsMax: 15,
    varies: 'Size. Weigh one of yours once and the whole bread family settles.',
    confidence: 'high',
    source: 'LFAC',
  },
  {
    id: 'roti-medium',
    name: 'Home flatbread, medium',
    urdu: 'Roti',
    aliases: ['roti', 'chapati', 'chapatti', 'chappati', 'rotli', 'phulka'],
    portion: '1 medium, 7 inch, about 40 g',
    grams: 18,
    gramsMax: 19,
    varies: 'Size only. Carbohydrate is about the cooked weight times 0.46.',
    confidence: 'high',
    source: 'FNDDS',
  },
  {
    id: 'roti-thin-8',
    name: 'Home flatbread, large and thin',
    urdu: 'Roti',
    aliases: ['roti', 'chapati', 'chapatti', 'badi roti'],
    portion: '1 large, 8 inch, about 50 g',
    grams: 23,
    gramsMax: null,
    varies: 'Thickness as much as width.',
    confidence: 'medium',
    source: 'CALC from FNDDS density',
  },
  {
    id: 'moti-roti',
    name: 'Home flatbread, thick',
    urdu: 'Moti roti',
    aliases: ['moti roti', 'ghar ki roti', 'thick roti', 'roti'],
    portion: '1 thick, 8 inch, 60 to 80 g',
    grams: 28,
    gramsMax: 37,
    varies: 'Thickness varies house to house. This is the row to weigh once.',
    confidence: 'medium',
    source: 'CALC',
  },
  {
    id: 'chapatti-large',
    name: 'Large flatbread, 12 inch',
    urdu: 'Bari chapatti',
    aliases: ['chapatti', 'chapati', 'large roti', 'bari roti', 'tandoori roti'],
    portion: '1 large, about 92 g',
    grams: 40,
    gramsMax: 46,
    varies: 'Tandoors sell above their official weight.',
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'naan-small',
    name: 'Tandoor naan, small tier',
    urdu: 'Naan',
    aliases: ['naan', 'nan', 'tandoori naan', 'khamiri roti'],
    portion: '1 naan, 120 g — the cheapest at the tandoor',
    grams: 60,
    gramsMax: null,
    varies: 'Which tier your tandoor sells. The price tells you.',
    confidence: 'medium',
    source: 'KHI-OFFICIAL, corroborated by LFAC',
  },
  {
    id: 'naan-middle',
    name: 'Tandoor naan, middle tier',
    urdu: 'Naan',
    aliases: ['naan', 'nan', 'tandoori naan'],
    portion: '1 naan, 140 to 150 g',
    grams: 70,
    gramsMax: 75,
    varies: 'Which tier your tandoor sells.',
    confidence: 'medium',
    source: 'KHI-OFFICIAL',
  },
  {
    id: 'naan-large',
    name: 'Tandoor naan, large tier',
    urdu: 'Naan',
    aliases: ['naan', 'nan', 'bara naan'],
    portion: '1 naan, 180 g',
    grams: 90,
    gramsMax: null,
    varies: 'Which tier your tandoor sells.',
    confidence: 'medium',
    source: 'KHI-OFFICIAL',
  },
  {
    id: 'naan-restaurant',
    name: 'Restaurant naan, butter or garlic',
    urdu: 'Naan',
    aliases: ['butter naan', 'garlic naan', 'naan', 'restaurant naan'],
    portion: '1 plate-sized, 10 inch or more',
    grams: 85,
    gramsMax: 95,
    varies: 'Butter and garlic add fat, not carbohydrate.',
    confidence: 'medium',
    source: 'FNDDS',
  },
  {
    id: 'naan-afghani-half',
    name: 'Afghani naan, half',
    urdu: 'Afghani naan',
    aliases: ['afghani naan', 'afghan naan', 'naan'],
    portion: 'half a piece, about 145 g',
    grams: 72,
    gramsMax: null,
    varies: 'A whole one is about 145 g of carbohydrate — close to three meals.',
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'naan-roghni',
    name: 'Roghni naan',
    urdu: 'Roghni naan',
    aliases: ['roghni naan', 'roghani naan', 'ghee naan', 'naan'],
    portion: '1 piece, about 150 g',
    grams: 72,
    gramsMax: 78,
    varies: 'Piece size, and the sweet glaze.',
    confidence: 'medium',
    source: 'LABEL',
  },
  {
    id: 'kulcha-tandoor',
    name: 'Kulcha, tandoor',
    urdu: 'Kulcha',
    aliases: ['kulcha', 'cholay wala kulcha', 'kulcha naan'],
    portion: '1 piece, about 200 g',
    grams: 100,
    gramsMax: null,
    varies: 'Smaller 80 to 120 g kulchas are 40 to 60 g.',
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Rice ──────────────────────────────────────────────────────────────────
  {
    id: 'rice-katori',
    name: 'Plain boiled rice, small bowl',
    urdu: 'Sada chawal',
    aliases: ['rice', 'chawal', 'chaawal', 'boiled rice', 'ublay chawal', 'sada chawal'],
    portion: '1 katori, 150 g',
    grams: 42,
    gramsMax: 47,
    varies: 'Bowl size. Measure yours once with water.',
    confidence: 'high',
    source: 'LFAC, USDA-SR',
  },
  {
    id: 'rice-cup',
    name: 'Plain boiled rice, cup',
    urdu: 'Sada chawal',
    aliases: ['rice', 'chawal', 'boiled rice', 'sada chawal'],
    portion: '1 cup, 160 g',
    grams: 50,
    gramsMax: null,
    varies: null,
    confidence: 'high',
    source: 'LFAC',
  },
  {
    id: 'rice-plate',
    name: 'Plain boiled rice, full plate',
    urdu: 'Sada chawal',
    aliases: ['rice', 'chawal', 'plate of rice'],
    portion: '1 plate, 300 g',
    grams: 84,
    gramsMax: 94,
    varies: 'Plate size. This is the largest single carbohydrate a meal usually holds.',
    confidence: 'high',
    source: 'LFAC, USDA-SR',
  },
  {
    id: 'biryani',
    name: 'Biryani, chicken mutton or beef',
    urdu: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani'],
    portion: '1 cup, 160 g, including 85 g rice',
    grams: 27,
    gramsMax: null,
    varies: 'Rice to meat ratio, and whether there is potato. A potato chunk adds 10 to 16 g.',
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pulao',
    name: 'Pulao, meat',
    urdu: 'Pulao',
    aliases: ['pulao', 'pilau', 'pilaf', 'yakhni pulao', 'polao'],
    portion: '1 cup, 160 to 180 g',
    grams: 29,
    gramsMax: 44,
    varies: 'Meat-heavy pots sit at the bottom of this range.',
    confidence: 'medium',
    source: 'LFAC, CoFID',
  },
  {
    id: 'pulao-kabuli',
    name: 'Kabuli pulao',
    urdu: 'Kabuli pulao',
    aliases: ['kabuli pulao', 'kabli pulao', 'pulao'],
    portion: '1 cup, 180 g',
    grams: 44,
    gramsMax: null,
    varies: 'Raisins and carrots add a little.',
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pulao-matar',
    name: 'Pea pulao',
    urdu: 'Matar pulao',
    aliases: ['matar pulao', 'peas pulao', 'pulao'],
    portion: '1 cup, 180 g',
    grams: 42,
    gramsMax: null,
    varies: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pulao-chana',
    name: 'Chickpea pulao',
    urdu: 'Chana pulao',
    aliases: ['chana pulao', 'chanay walay chawal', 'chola pulao', 'pulao'],
    portion: '1 cup, 188 g',
    grams: 44,
    gramsMax: null,
    varies: 'How many chickpeas.',
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Daal and salan ────────────────────────────────────────────────────────
  {
    id: 'daal-thin',
    name: 'Lentils, thin',
    urdu: 'Patli daal',
    aliases: ['daal', 'dal', 'dhal', 'patli daal', 'tarka daal', 'lentils'],
    portion: '1 katori, 150 g',
    grams: 13,
    gramsMax: 18,
    varies: 'How watery it was cooked, and bowl size.',
    confidence: 'medium',
    source: 'CoFID, LFAC',
  },
  {
    id: 'daal-thick',
    name: 'Lentils, thick',
    urdu: 'Gaarhi daal',
    aliases: ['daal', 'dal', 'dhal', 'gaarhi daal', 'thick daal', 'lentils'],
    portion: '1 katori, 150 g',
    grams: 23,
    gramsMax: 32,
    varies: 'Thickness, and bowl size.',
    confidence: 'medium',
    source: 'FNDDS, CoFID, KHAN',
  },
  {
    id: 'karahi',
    name: 'Karahi, chicken or mutton',
    urdu: 'Karahi',
    aliases: ['karahi', 'kadhai', 'karhai'],
    portion: '1 katori',
    grams: 4,
    gramsMax: 17,
    varies: 'Tomato and onion base. Typically 6 to 12.',
    confidence: 'medium',
    source: 'LFAC, KHAN, CoFID',
  },
  {
    id: 'korma',
    name: 'Korma',
    urdu: 'Qorma',
    aliases: ['korma', 'qorma', 'kurma'],
    portion: '1 katori',
    grams: 7,
    gramsMax: 20,
    varies: 'The thickener decides. UK and Pakistani recipes genuinely disagree threefold.',
    confidence: 'low',
    source: 'CoFID vs KHAN — unresolved',
  },

  // ── Snacks ────────────────────────────────────────────────────────────────
  {
    id: 'samosa-aloo',
    name: 'Potato samosa, large',
    urdu: 'Aloo samosa',
    aliases: ['samosa', 'samoosa', 'sambosa', 'aloo samosa'],
    portion: '1 large, 100 g',
    grams: 30,
    gramsMax: null,
    varies: 'A cocktail samosa is about 8 g.',
    confidence: 'high',
    source: 'LFAC, FNDDS, CoFID agree',
  },
  {
    id: 'samosa-qeema',
    name: 'Mince samosa',
    urdu: 'Qeema samosa',
    aliases: ['qeema samosa', 'keema samosa', 'kheema samosa', 'samosa'],
    portion: '1 piece, 45 g',
    grams: 8,
    gramsMax: null,
    varies: null,
    confidence: 'medium',
    source: 'LFAC, CoFID',
  },
  {
    id: 'kachori-qeema',
    name: 'Mince kachori',
    urdu: 'Qeema kachori',
    aliases: ['kachori', 'qeema kachori', 'keema kachori'],
    portion: '1 piece, 126 g',
    grams: 33,
    gramsMax: null,
    varies: null,
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Chai ──────────────────────────────────────────────────────────────────
  // The largest daily carbohydrate line for most people, and the one nobody
  // counts. Sugar is a level teaspoon at 4.2 g; a heaped one is nearer 6.
  {
    id: 'chai-150-1',
    name: 'Tea with milk, small cup, 1 sugar',
    urdu: 'Chai',
    aliases: ['chai', 'chaa', 'tea', 'doodh wali chai'],
    portion: '1 Pakistani cup, 150 ml',
    grams: 8,
    gramsMax: null,
    varies: 'A heaped spoon is nearer 6 g than 4.2.',
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified',
  },
  {
    id: 'chai-150-2',
    name: 'Tea with milk, small cup, 2 sugars',
    urdu: 'Chai',
    aliases: ['chai', 'chaa', 'tea', 'doodh wali chai'],
    portion: '1 Pakistani cup, 150 ml',
    grams: 12,
    gramsMax: null,
    varies: 'Three cups a day is about 36 g nobody counts.',
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified',
  },
  {
    id: 'chai-200-2',
    name: 'Tea with milk, mug, 2 sugars',
    urdu: 'Chai',
    aliases: ['chai', 'tea', 'mug of chai'],
    portion: '1 standard mug, 200 ml',
    grams: 13,
    gramsMax: null,
    varies: null,
    confidence: 'medium',
    source: 'CALC, LFAC-verified at 10 g for 1 sugar',
  },
  {
    id: 'chai-250-2',
    name: 'Tea with milk, large mug, 2 sugars',
    urdu: 'Chai',
    aliases: ['chai', 'tea', 'large chai'],
    portion: '1 large mug, 250 ml',
    grams: 15,
    gramsMax: null,
    varies: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },
];
