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

/**
 * Which part of the list a row belongs to.
 *
 * Added with the promotion that took this table from 31 rows to 319. At that
 * size an ungrouped list is about forty phone screens of scroll, and the screen
 * needs something to group BY. Deriving it from array position would work right
 * up until someone reorders the file, which is the kind of implicit coupling
 * this repo does not keep.
 *
 * The categories are the reader's, not the chemist's: kheer is a `sweet` even
 * though it is rice, because that is where someone would look for it.
 */
export type Category =
  | 'bread' | 'rice' | 'daal' | 'salan' | 'side' | 'snack'
  | 'sweet' | 'drink' | 'fruit' | 'dairy' | 'packaged';

/**
 * The languages this table speaks.
 *
 * A UNION, not an open string key, so adding Spanish is a type error at every
 * row that has not been translated yet rather than a blank on a phone. The cost
 * of that choice is one line here; the cost of the other choice is a dish with
 * no name on the screen of someone about to inject.
 */
export type Lang = 'en' | 'ur';

/**
 * Everything about a food that CHANGES WITH THE LANGUAGE, and nothing that does
 * not. `grams` is not in here, and that is the point — a number is the same
 * number in every language, and a shape that let a translation hold its own
 * figure would be a shape where a translation could change a dose.
 */
export interface FoodText {
  /** The name, as the list is read in this language. */
  readonly name: string;
  /**
   * What is being measured — `1 cup, 160\u00A0g`, `1 medium, 7\u00A0inch`.
   *
   * §10.4: the space before a unit is \u00A0, not an ordinary one. The check
   * strips comments, so this example is unenforced — and it is written the right
   * way anyway, because rows here are made by copying the row above and an
   * example teaching the old shape is how the next wrong one appears.
   */
  readonly portion: string;
  /** Why it varies, in one line, or null when it barely does. */
  readonly varies: string | null;
}

export interface Food {
  /** Stable key. Never shown; used for the "always use this one" choice later. */
  readonly id: string;
  readonly category: Category;
  /**
   * THE SAME FOOD IN EVERY LANGUAGE, keyed by language.
   *
   * This replaced four flat fields — `name`, `script`, `portion`, `varies` —
   * and the reason is BACKLOG T28, raised by Momin while the Urdu was being
   * built: `script` names a writing system, so Spanish fits none of them, and a
   * field per language per attribute grows as their product. He also caught the
   * shape drifting mid-flight, `script` for one attribute and `portionUr` for
   * the next: "the logic should be consistent".
   *
   * Migrated the day the Urdu portions and varies notes arrived, because that
   * was the one moment all 319 rows were being rewritten anyway. Only TEXT
   * moved: `grams`, `gramsMax`, `confidence`, `source`, `category`, `aliases`
   * and every `id` came through byte-identical, which a test pins.
   *
   * NOT REVIEWED. Momin's mother is the native speaker and reads every Urdu
   * string here. It ships behind the in-testing badge, which is where review
   * happens — a reviewer cannot review what she cannot see.
   */
  readonly text: { readonly [L in Lang]: FoodText };
  /**
   * Roman Urdu, because that is what the food is called out loud.
   *
   * OUTSIDE the language map on purpose: it is not a translation, it is the
   * household's spoken name, and it is shown in BOTH languages — English leads
   * with English and brackets this, Urdu leads with Urdu and brackets the same
   * string. It is also what search leans on from a QWERTY keyboard: Momin types
   * "roti" and "dal" whichever language the interface is in.
   */
  readonly roman: string;
  /**
   * Spelling variants, so search finds the row however it is typed. An explicit
   * list rather than fuzzy matching: fuzzy matching on food names in a dosing
   * app eventually matches the wrong dish, and a wrong dish is a wrong dose.
   *
   * Language-neutral for the same reason `roman` is — these are what a thumb
   * types, not what a screen shows. Urdu script is deliberately NOT searched:
   * matching it would need these aliases mirrored and eight normalisation rules
   * in `fold()`, and a review over the real table found «دال» putting a 78 g
   * rice dish above every actual bowl of daal at 13 to 32 g.
   */
  readonly aliases: readonly string[];
  /** Grams of carbohydrate. The number the app asks for. */
  readonly grams: number;
  /** Upper bound where the sources genuinely disagree, else null. */
  readonly gramsMax: number | null;
  readonly confidence: Confidence;
  /** Which source, using docs/CARBS.md's tags. */
  readonly source: string;
}

export const FOODS: readonly Food[] = [
  // ── Breads ────────────────────────────────────────────────────────────────
  {
    id: 'phulka',
    category: 'bread',
    text: {
      en: {
        name: 'Thin flatbread, small',
        portion: '1 small, about 35\u00A0g',
        varies: 'Size. Weigh one of yours and multiply what it weighs by 0.46.',
      },
      ur: {
        name: 'پھلکا',
        portion: '1 چھوٹا، تقریباً 35\u00A0گرام',
        varies: 'سائز۔ اپنا ایک تول لیں اور اس کے وزن کو 0.46 سے ضرب دیں۔',
      },
    },
    roman: 'Phulka',
    aliases: ['phulka', 'chapati', 'chapatti', 'roti', 'fulka'],
    grams: 12,
    gramsMax: 15,
    confidence: 'high',
    source: 'LFAC; FNDDS agrees on the density',
  },
  {
    id: 'roti-medium',
    category: 'bread',
    text: {
      en: {
        name: 'Home flatbread, medium',
        portion: '1 medium, 7\u00A0inch, about 40\u00A0g',
        varies: 'Size only. Carbohydrate is about the cooked weight times 0.46.',
      },
      ur: {
        name: 'گھر کی روٹی، درمیانی',
        portion: '1 درمیانی، 7\u00A0انچ، تقریباً 40\u00A0گرام',
        varies: 'صرف سائز۔ کاربوہائیڈریٹ پکی ہوئی روٹی کے وزن کا تقریباً 0.46 ہوتا ہے۔',
      },
    },
    roman: 'Roti',
    aliases: ['roti', 'chapati', 'chapatti', 'chappati', 'rotli', 'phulka', 'rotti'],
    grams: 18,
    gramsMax: 19,
    confidence: 'high',
    source: 'FNDDS',
  },
  {
    id: 'roti-thin-8',
    category: 'bread',
    text: {
      en: {
        name: 'Home flatbread, large and thin',
        portion: '1 large, 8\u00A0inch, about 50\u00A0g',
        varies: 'Thickness as much as width.',
      },
      ur: {
        name: 'گھر کی روٹی، بڑی اور پتلی',
        portion: '1 بڑی، 8\u00A0انچ، تقریباً 50\u00A0گرام',
        varies: 'موٹائی بھی اتنی ہی، جتنی چوڑائی۔',
      },
    },
    roman: 'Roti',
    aliases: ['roti', 'chapati', 'chapatti', 'badi roti', 'rotti'],
    grams: 23,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from FNDDS density',
  },
  {
    id: 'moti-roti',
    category: 'bread',
    text: {
      en: {
        name: 'Home flatbread, thick',
        portion: '1 thick, 8\u00A0inch, 60 to 80\u00A0g',
        varies: 'Thickness varies house to house. This is the row to weigh once.',
      },
      ur: {
        name: 'موٹی روٹی',
        portion: '1 موٹی، 8\u00A0انچ، 60 سے 80\u00A0گرام',
        varies: 'موٹائی گھر گھر بدلتی ہے۔ ایک بار تولنے والی لائن یہی ہے۔',
      },
    },
    roman: 'Moti roti',
    aliases: ['moti roti', 'ghar ki roti', 'thick roti', 'roti'],
    grams: 28,
    gramsMax: 37,
    confidence: 'medium',
    source: 'CALC',
  },
  {
    id: 'chapatti-large',
    category: 'bread',
    text: {
      en: {
        name: 'Large flatbread, 12\u00A0inch',
        portion: '1 large, about 92\u00A0g',
        varies: 'Tandoors sell above their official weight.',
      },
      ur: {
        name: 'بڑی چپاتی، 12 انچ',
        portion: '1 بڑی، تقریباً 92\u00A0گرام',
        varies: 'تندور والے سرکاری وزن سے بڑی بیچتے ہیں۔',
      },
    },
    roman: 'Bari chapatti',
    aliases: ['chapatti', 'chapati', 'large roti', 'bari roti', 'tandoori roti'],
    grams: 40,
    gramsMax: 46,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'naan-small',
    category: 'bread',
    text: {
      en: {
        name: 'Tandoor naan, small tier',
        portion: '1 naan, 120\u00A0g — the cheapest at the tandoor',
        varies: 'Which tier your tandoor sells. The price tells you.',
      },
      ur: {
        name: 'تندوری نان، چھوٹا',
        portion: '1 نان، 120\u00A0گرام — تندور کا سب سے سستا',
        varies: 'آپ کا تندور کون سا سائز بیچتا ہے۔ قیمت سے پتہ چل جاتا ہے۔',
      },
    },
    roman: 'Naan',
    aliases: ['naan', 'nan', 'tandoori naan', 'khamiri roti'],
    grams: 60,
    gramsMax: null,
    confidence: 'medium',
    source: 'KHI-OFFICIAL, corroborated by LFAC',
  },
  {
    id: 'naan-middle',
    category: 'bread',
    text: {
      en: {
        name: 'Tandoor naan, middle tier',
        portion: '1 naan, 140 to 150\u00A0g',
        varies: 'Which tier your tandoor sells.',
      },
      ur: {
        name: 'تندوری نان، درمیانہ',
        portion: '1 نان، 140 سے 150\u00A0گرام',
        varies: 'آپ کا تندور کون سا سائز بیچتا ہے۔',
      },
    },
    roman: 'Naan',
    aliases: ['naan', 'nan', 'tandoori naan'],
    grams: 70,
    gramsMax: 75,
    confidence: 'medium',
    source: 'KHI-OFFICIAL',
  },
  {
    id: 'naan-large',
    category: 'bread',
    text: {
      en: {
        name: 'Tandoor naan, large tier',
        portion: '1 naan, 180\u00A0g',
        varies: 'Which tier your tandoor sells.',
      },
      ur: {
        name: 'تندوری نان، بڑا',
        portion: '1 نان، 180\u00A0گرام',
        varies: 'آپ کا تندور کون سا سائز بیچتا ہے۔',
      },
    },
    roman: 'Naan',
    aliases: ['naan', 'nan', 'tandoori naan', 'bara naan'],
    grams: 90,
    gramsMax: null,
    confidence: 'medium',
    source: 'KHI-OFFICIAL',
  },
  {
    id: 'naan-restaurant',
    category: 'bread',
    text: {
      en: {
        name: 'Restaurant naan, butter or garlic',
        portion: '1 plate-sized, 10\u00A0inch or more',
        varies: 'Butter and garlic add fat, not carbohydrate.',
      },
      ur: {
        name: 'ریسٹورنٹ کا نان، بٹر یا گارلک',
        portion: '1 پلیٹ جتنا، 10\u00A0انچ یا اس سے بڑا',
        varies: 'بٹر اور گارلک چکنائی بڑھاتے ہیں، کاربوہائیڈریٹ نہیں۔',
      },
    },
    roman: 'Naan',
    aliases: ['naan', 'nan', 'butter naan', 'garlic naan', 'restaurant naan'],
    grams: 85,
    gramsMax: 95,
    confidence: 'medium',
    source: 'FNDDS',
  },
  {
    id: 'naan-afghani-half',
    category: 'bread',
    text: {
      en: {
        name: 'Afghani naan, half',
        portion: 'half a piece, about 145\u00A0g',
        varies: 'A whole one is twice this row — tap + twice if you ate all of it. That is close to three meals of carbohydrate in one bread.',
      },
      ur: {
        name: 'افغانی نان، آدھا',
        portion: 'آدھا نان، تقریباً 145\u00A0گرام',
        varies: 'پورا نان اس لائن سے دگنا ہے — سارا کھایا ہو تو + دو بار دبائیں۔ ایک ہی روٹی میں تقریباً تین وقت کے کھانے جتنا کاربوہائیڈریٹ ہے۔',
      },
    },
    roman: 'Afghani naan',
    aliases: ['naan', 'nan', 'afghani naan', 'afghan naan'],
    grams: 72,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'naan-roghni',
    category: 'bread',
    text: {
      en: {
        name: 'Roghni naan',
        portion: '1 piece, about 150\u00A0g',
        varies: 'Piece size, and the sweet glaze.',
      },
      ur: {
        name: 'روغنی نان',
        portion: '1 عدد، تقریباً 150\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور اوپر کی میٹھی تہہ۔',
      },
    },
    roman: 'Roghni naan',
    aliases: ['naan', 'nan', 'roghni naan', 'roghani naan', 'ghee naan'],
    grams: 72,
    gramsMax: 78,
    confidence: 'medium',
    source: 'LABEL',
  },
  {
    id: 'kulcha-bakery',
    category: 'bread',
    text: {
      en: {
        name: 'Kulcha, bakery, the dry chai one',
        portion: '1 piece, about 40\u00A0g — weigh yours',
        varies: 'No lab has ever measured this kulcha; this is the rusk family\u2019s density on a 40\u00A0g piece. The 200\u00A0g tandoor kulcha is a different bread — do not use its row for this one. Your bakery\u2019s piece weight is half the answer: weigh one.',
      },
      ur: {
        name: 'کلچہ، بیکری والا سوکھا',
        portion: '1 عدد، تقریباً 40\u00A0گرام — اپنا تول لیں',
        varies: 'اس کلچے کو آج تک کسی لیب نے نہیں ناپا؛ یہ رسک والے خاندان کی کثافت 40\u00A0گرام کے ٹکڑے پر لگائی گئی ہے۔ 200\u00A0گرام والا تندوری کلچہ الگ روٹی ہے — اس کی لائن یہاں استعمال نہ کریں۔ آپ کی بیکری کے ٹکڑے کا وزن آدھا جواب ہے: ایک تول لیں۔',
      },
    },
    roman: 'Chai kulcha',
    aliases: ['kulcha', 'chai kulcha', 'bakery kulcha', 'peshawari kulcha', 'dry kulcha'],
    grams: 20,
    gramsMax: 26,
    confidence: 'low',
    source: 'CALC from CoFID rusk 55.7 to 73 per 100, converted at the starch divisor 1.10 at both ends',
  },
  {
    id: 'kulcha-tandoor',
    category: 'bread',
    text: {
      en: {
        name: 'Kulcha, tandoor',
        portion: '1 piece, about 200\u00A0g',
        varies: 'Smaller 80 to 120\u00A0g kulchas are 40 to 60\u00A0g. The small dry kulcha a bakery sells with chai is a different bread and a much smaller number — that is its own row.',
      },
      ur: {
        name: 'کلچہ، تندور والا',
        portion: '1 عدد، تقریباً 200\u00A0گرام',
        varies: 'چھوٹے 80 سے 120\u00A0گرام والے کلچے 40 سے 60\u00A0گرام ہوتے ہیں۔ بیکری والا چھوٹا سوکھا کلچہ، جو چائے کے ساتھ ملتا ہے، الگ روٹی ہے اور اس کا عدد بہت کم — اس کی اپنی لائن ہے۔',
      },
    },
    roman: 'Kulcha',
    aliases: ['kulcha', 'nan', 'cholay wala kulcha', 'kulcha naan'],
    grams: 100,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Rice ──────────────────────────────────────────────────────────────────
  {
    id: 'rice-katori',
    category: 'rice',
    text: {
      en: {
        name: 'Plain boiled rice, small bowl',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size. Measure yours once with water.',
      },
      ur: {
        name: 'سادہ چاول، کٹوری',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کٹوری کا سائز۔ اپنی کٹوری ایک بار پانی سے ناپ لیں۔',
      },
    },
    roman: 'Sada chawal',
    aliases: ['rice', 'chawal', 'chaawal', 'chaval', 'boiled rice', 'ublay chawal', 'sada chawal'],
    grams: 42,
    gramsMax: 47,
    confidence: 'high',
    source: 'LFAC, USDA-SR',
  },
  {
    id: 'rice-cup',
    category: 'rice',
    text: {
      en: {
        name: 'Plain boiled rice, cup',
        portion: '1 cup, 160\u00A0g',
        varies: null,
      },
      ur: {
        name: 'سادہ چاول، کپ',
        portion: '1 کپ، 160\u00A0گرام',
        varies: null,
      },
    },
    roman: 'Sada chawal',
    aliases: ['rice', 'chawal', 'chaawal', 'chaval', 'boiled rice', 'ublay chawal', 'sada chawal'],
    grams: 45,
    gramsMax: 50,
    confidence: 'high',
    source: 'USDA-SR, LFAC at the top',
  },
  {
    id: 'rice-plate',
    category: 'rice',
    text: {
      en: {
        name: 'Plain boiled rice, full plate',
        portion: '1 plate, 300\u00A0g',
        varies: 'Plate size. This is the largest single carbohydrate a meal usually holds.',
      },
      ur: {
        name: 'سادہ چاول، بھری پلیٹ',
        portion: '1 پلیٹ، 300\u00A0گرام',
        varies: 'پلیٹ کا سائز۔ عام کھانے میں اکیلا سب سے بڑا کاربوہائیڈریٹ یہی ہوتا ہے۔',
      },
    },
    roman: 'Sada chawal',
    aliases: ['rice', 'chawal', 'chaawal', 'chaval', 'boiled rice', 'ublay chawal', 'sada chawal', 'plate of rice'],
    grams: 84,
    gramsMax: 94,
    confidence: 'high',
    source: 'LFAC, USDA-SR',
  },
  {
    id: 'biryani',
    category: 'rice',
    text: {
      en: {
        name: 'Biryani, chicken mutton or beef',
        portion: '1 cup, 160\u00A0g, including 85\u00A0g rice',
        varies: 'Rice to meat ratio, and whether there is potato. A potato chunk adds 8 to 16\u00A0g.',
      },
      ur: {
        name: 'بریانی، کپ',
        portion: '1 کپ، 160\u00A0گرام، جس میں 85\u00A0گرام چاول',
        varies: 'چاول اور گوشت کا تناسب، اور آلو ہے یا نہیں۔ آلو کا ایک ٹکڑا 8 سے 16\u00A0گرام بڑھا دیتا ہے۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani'],
    grams: 27,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pulao',
    category: 'rice',
    text: {
      en: {
        name: 'Pulao, meat',
        portion: '1 cup, 160 to 180\u00A0g',
        varies: 'Meat-heavy pots sit at the bottom of this range.',
      },
      ur: {
        name: 'پلاؤ، گوشت والا، کپ',
        portion: '1 کپ، 160 سے 180\u00A0گرام',
        varies: 'گوشت زیادہ والی دیگیں اس رینج کے نچلے سرے پر رہتی ہیں۔',
      },
    },
    roman: 'Pulao',
    aliases: ['pulao', 'pulav', 'pilau', 'pilaf', 'yakhni pulao', 'polao'],
    grams: 29,
    gramsMax: 44,
    confidence: 'medium',
    source: 'LFAC, CoFID',
  },
  {
    id: 'pulao-kabuli',
    category: 'rice',
    text: {
      en: {
        name: 'Kabuli pulao',
        portion: '1 cup, 180\u00A0g',
        varies: 'Raisins and carrots add a little.',
      },
      ur: {
        name: 'کابلی پلاؤ',
        portion: '1 کپ، 180\u00A0گرام',
        varies: 'کشمش اور گاجر تھوڑا سا بڑھا دیتے ہیں۔',
      },
    },
    roman: 'Kabuli pulao',
    aliases: ['kabuli pulao', 'kabli pulao', 'pulao', 'pulav'],
    grams: 44,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pulao-matar',
    category: 'rice',
    text: {
      en: {
        name: 'Pea pulao',
        portion: '1 cup, 180\u00A0g',
        varies: null,
      },
      ur: {
        name: 'مٹر پلاؤ',
        portion: '1 کپ، 180\u00A0گرام',
        varies: null,
      },
    },
    roman: 'Matar pulao',
    aliases: ['matar pulao', 'peas pulao', 'pulao', 'pulav'],
    grams: 42,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pulao-chana',
    category: 'rice',
    text: {
      en: {
        name: 'Chickpea pulao',
        portion: '1 cup, 188\u00A0g',
        varies: 'How many chickpeas.',
      },
      ur: {
        name: 'چنا پلاؤ',
        portion: '1 کپ، 188\u00A0گرام',
        varies: 'چنے کتنے ہیں۔',
      },
    },
    roman: 'Chana pulao',
    aliases: ['chana pulao', 'chanay walay chawal', 'chola pulao', 'pulao', 'pulav'],
    grams: 44,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Daal and salan ────────────────────────────────────────────────────────
  {
    id: 'daal-thin',
    category: 'daal',
    text: {
      en: {
        name: 'Lentils, thin',
        portion: '1 katori, 150\u00A0g',
        varies: 'How watery it was cooked, and bowl size.',
      },
      ur: {
        name: 'پتلی دال',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کتنی پتلی پکی، اور کٹوری کا سائز۔',
      },
    },
    roman: 'Patli daal',
    aliases: ['daal', 'dal', 'dhal', 'patli daal', 'tarka daal', 'lentils', 'curry', 'salan'],
    grams: 13,
    gramsMax: 18,
    confidence: 'medium',
    source: 'CoFID, LFAC',
  },
  {
    id: 'daal-thick',
    category: 'daal',
    text: {
      en: {
        name: 'Lentils, thick',
        portion: '1 katori, 150\u00A0g',
        varies: 'Thickness, and bowl size.',
      },
      ur: {
        name: 'گاڑھی دال',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'گاڑھا پن، اور کٹوری کا سائز۔',
      },
    },
    roman: 'Gaarhi daal',
    aliases: ['daal', 'dal', 'dhal', 'gaarhi daal', 'thick daal', 'lentils', 'curry', 'salan'],
    grams: 23,
    gramsMax: 32,
    confidence: 'medium',
    source: 'FNDDS, CoFID, KHAN',
  },
  {
    id: 'karahi',
    category: 'salan',
    text: {
      en: {
        name: 'Karahi, chicken or mutton',
        portion: '1 katori',
        varies: 'Tomato and onion base. Typically 6 to 12.',
      },
      ur: {
        name: 'کڑاہی، چکن یا مٹن',
        portion: '1 کٹوری',
        varies: 'نیچے کا ٹماٹر پیاز کا مسالہ۔ عام طور پر 6 سے 12 کے بیچ۔',
      },
    },
    roman: 'Karahi',
    aliases: ['karahi', 'kadhai', 'karhai', 'kadai', 'karai', 'kari', 'karhi', 'curry', 'salan'],
    grams: 4,
    gramsMax: 17,
    confidence: 'medium',
    source: 'LFAC, KHAN, CoFID',
  },
  {
    id: 'korma',
    category: 'salan',
    text: {
      en: {
        name: 'Korma',
        portion: '1 katori',
        varies: 'The thickener decides. UK and Pakistani recipes genuinely disagree threefold.',
      },
      ur: {
        name: 'قورمہ',
        portion: '1 کٹوری',
        varies: 'گاڑھا کرنے والی چیز فیصلہ کرتی ہے۔ برطانوی اور پاکستانی ترکیبوں میں سچ مچ تین گنا کا فرق ہے۔',
      },
    },
    roman: 'Qorma',
    aliases: ['korma', 'qorma', 'kurma', 'curry', 'salan'],
    grams: 7,
    gramsMax: 20,
    confidence: 'low',
    source: 'CoFID vs KHAN — unresolved',
  },

  // ── Snacks ────────────────────────────────────────────────────────────────
  {
    id: 'samosa-aloo',
    category: 'snack',
    text: {
      en: {
        name: 'Potato samosa, large',
        portion: '1 large, 100\u00A0g',
        varies: 'A cocktail samosa is about 8\u00A0g.',
      },
      ur: {
        name: 'آلو سموسہ، بڑا',
        portion: '1 بڑا، 100\u00A0گرام',
        varies: 'کاک ٹیل سموسہ تقریباً 8\u00A0گرام ہوتا ہے۔',
      },
    },
    roman: 'Aloo samosa',
    aliases: ['samosa', 'samoosa', 'sambosa', 'aloo samosa'],
    grams: 30,
    gramsMax: null,
    confidence: 'high',
    source: 'LFAC, FNDDS, CoFID agree',
  },
  {
    id: 'samosa-qeema',
    category: 'snack',
    text: {
      en: {
        name: 'Mince samosa',
        portion: '1 piece, 45\u00A0g',
        varies: null,
      },
      ur: {
        name: 'قیمہ سموسہ',
        portion: '1 عدد، 45\u00A0گرام',
        varies: null,
      },
    },
    roman: 'Qeema samosa',
    aliases: ['qeema samosa', 'keema samosa', 'kheema samosa', 'samosa'],
    grams: 8,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CoFID',
  },
  {
    id: 'kachori-qeema',
    category: 'snack',
    text: {
      en: {
        name: 'Mince kachori',
        portion: '1 piece, 126\u00A0g',
        varies: null,
      },
      ur: {
        name: 'قیمہ کچوری',
        portion: '1 عدد، 126\u00A0گرام',
        varies: null,
      },
    },
    roman: 'Qeema kachori',
    aliases: ['kachori', 'qeema kachori', 'keema kachori'],
    grams: 33,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Chai ──────────────────────────────────────────────────────────────────
  // The largest daily carbohydrate line for most people, and the one nobody
  // counts. Sugar is a level teaspoon at 4.2 g; a heaped one is nearer 6.
  {
    id: 'chai-150-1',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, small cup, 1 sugar',
        portion: '1 Pakistani cup, 150\u00A0ml',
        varies: 'A heaped spoon is nearer 6\u00A0g than 4.2.',
      },
      ur: {
        name: 'چائے، پیالی، 1 چمچ چینی',
        portion: '1 پیالی، 150\u00A0ملی لیٹر',
        varies: 'بھرا ہوا چمچ 4.2 نہیں، 6\u00A0گرام کے قریب ہوتا ہے۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'chae'],
    grams: 8,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified',
  },
  {
    id: 'chai-150-2',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, small cup, 2 sugars',
        portion: '1 Pakistani cup, 150\u00A0ml',
        varies: 'Three cups a day is about 36\u00A0g nobody counts.',
      },
      ur: {
        name: 'چائے، پیالی، 2 چمچ چینی',
        portion: '1 پیالی، 150\u00A0ملی لیٹر',
        varies: 'دن کی تین پیالیاں تقریباً 36\u00A0گرام ہیں جنہیں کوئی نہیں گنتا۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'chae'],
    grams: 12,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified',
  },
  {
    id: 'chai-200-2',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, mug, 2 sugars',
        portion: '1 standard mug, 200\u00A0ml',
        varies: null,
      },
      ur: {
        name: 'چائے، مگ، 2 چمچ چینی',
        portion: '1 مگ، 200\u00A0ملی لیٹر',
        varies: null,
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'mug of chai', 'chae'],
    grams: 13,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC, LFAC-verified at 10\u00A0g for 1 sugar',
  },
  {
    id: 'chai-250-2',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, large mug, 2 sugars',
        portion: '1 large mug, 250\u00A0ml',
        varies: null,
      },
      ur: {
        name: 'چائے، بڑا مگ، 2 چمچ چینی',
        portion: '1 بڑا مگ، 250\u00A0ملی لیٹر',
        varies: null,
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'large chai', 'chae'],
    grams: 15,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },

// ── Breads, naan family (CARBS.md 3.1) ────────────────────────────────────
  {
    id: 'sheermal-large',
    category: 'bread',
    text: {
      en: {
        name: 'Sheermal, large bakery piece',
        portion: '1 large piece, 257 g',
        varies: 'Piece size, and nothing moves a dose more. Bakery sheermals run from a saucer to a dawat-size round — weigh yours once and multiply the weight by 0.65.',
      },
      ur: {
        name: 'شیرمال، بڑا بیکری والا',
        portion: '1 بڑا، 257\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور ڈوز کو اس سے زیادہ کوئی چیز نہیں ہلاتی۔ بیکری کے شیرمال طشتری جتنے سے دعوت کے سائز تک ہوتے ہیں — اپنا ایک بار تول لیں اور وزن کو 0.65 سے ضرب دیں۔',
      },
    },
    roman: 'Sheermal',
    aliases: ['sheermal', 'shermal', 'shirmal', 'sheermaal', 'naan', 'nan'],
    grams: 167,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'sheermal-small',
    category: 'bread',
    text: {
      en: {
        name: 'Sheermal, small piece',
        portion: '1 piece, 100 g',
        varies: 'Piece size. A dawat sheermal is nearer 257 g and carries 167 g, close to three meals.',
      },
      ur: {
        name: 'شیرمال، چھوٹا',
        portion: '1 عدد، 100\u00A0گرام',
        varies: 'ٹکڑے کا سائز۔ دعوت والا شیرمال 257\u00A0گرام کے قریب ہوتا ہے اور 167\u00A0گرام کاربوہائیڈریٹ رکھتا ہے، قریب تین کھانوں جتنا۔',
      },
    },
    roman: 'Sheermal',
    aliases: ['sheermal', 'shermal', 'shirmal', 'sheermaal', 'naan', 'nan'],
    grams: 65,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CALC at the same density',
  },
  {
    id: 'taftan',
    category: 'bread',
    text: {
      en: {
        name: 'Taftan, ring-shaped enriched bread',
        portion: '1 piece, 100 to 120 g',
        varies: 'Piece size, and how enriched the dough is. A richer, sweeter taftan carries less flour per gram, so it sits lower.',
      },
      ur: {
        name: 'تافتان',
        portion: '1 عدد، 100 سے 120\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور آٹے میں کتنی چیزیں گندھی ہیں۔ جتنا گھی دودھ زیادہ اور تافتان میٹھا، فی گرام آٹا اتنا کم — اس لیے وہ نیچے بیٹھتا ہے۔',
      },
    },
    roman: 'Taftan',
    aliases: ['taftan', 'taftaan', 'taftoon', 'naan', 'nan'],
    grams: 55,
    gramsMax: 70,
    confidence: 'low',
    source: 'LIT Iranian taftoon, CALC — no LFAC row, unconfirmed by the Pakistani source',
  },
  {
    id: 'naan-qeema',
    category: 'bread',
    text: {
      en: {
        name: 'Mince-stuffed naan',
        portion: '1 naan, 100 g',
        varies: 'Size, and how much of the piece is filling. The mince displaces dough, so this holds a quarter less than a plain naan of the same weight.',
      },
      ur: {
        name: 'قیمہ نان',
        portion: '1 نان، 100\u00A0گرام',
        varies: 'سائز، اور ٹکڑے کا کتنا حصہ بھرائی ہے۔ قیمہ آٹے کی جگہ لے لیتا ہے، اس لیے اِس میں اتنے ہی وزن کے سادہ نان سے چوتھائی کم ہوتا ہے۔',
      },
    },
    roman: 'Qeema naan',
    aliases: ['qeema naan', 'keema naan', 'kheema naan', 'qeema nan', 'mince naan', 'naan', 'nan'],
    grams: 38,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Breads, roti and chapati family (CARBS.md 3.2) ─────────────────────────
  {
    id: 'roti-tandoori-karachi',
    category: 'bread',
    text: {
      en: {
        name: 'Tandoori roti, bought at the tandoor',
        portion: '1 roti, 100 g — the Karachi official weight',
        varies: 'Piece weight, and tandoors sell above their gazetted weight. A home-style "medium" roti is only 33 g and 15 g of carbohydrate — the same flour, a third of the piece.',
      },
      ur: {
        name: 'تندوری روٹی',
        portion: '1 روٹی، 100\u00A0گرام — کراچی کا سرکاری وزن',
        varies: 'ٹکڑے کا وزن، اور تندور والے سرکاری وزن سے بڑا بیچتے ہیں۔ گھر کی «درمیانی» روٹی صرف 33\u00A0گرام کی ہے اور 15\u00A0گرام کاربوہائیڈریٹ — آٹا وہی، ٹکڑا تہائی۔',
      },
    },
    roman: 'Tandoori roti',
    aliases: ['tandoori roti', 'tandoor roti', 'tandoori rooti', 'roti', 'chapati', 'chapatti', 'rotti'],
    grams: 46,
    gramsMax: 55,
    confidence: 'medium',
    source: 'KHI-OFFICIAL, LFAC',
  },
  {
    id: 'chapati-laal',
    category: 'bread',
    text: {
      en: {
        name: 'Red whole-atta chapati',
        portion: '1 piece, 80 g',
        varies: 'Size. The dough is moister than ordinary atta, so it carries a little less for its weight.',
      },
      ur: {
        name: 'لال چپاتی',
        portion: '1 عدد، 80\u00A0گرام',
        varies: 'سائز۔ اس کا آٹا عام آٹے سے گیلا گندھتا ہے، اس لیے اپنے وزن کے حساب سے ذرا کم رکھتی ہے۔',
      },
    },
    roman: 'Laal chapati',
    aliases: ['laal chapati', 'lal chapati', 'laal chapatti', 'red roti', 'roti', 'chapati', 'chapatti'],
    grams: 28,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'roti-bajra',
    category: 'bread',
    text: {
      en: {
        name: 'Millet flatbread',
        portion: '1 roti, 55 g',
        varies: 'How dry and how thin. This number implies a density no other fresh roti reaches, so treat it as the high end and check the 2-hour meter reading.',
      },
      ur: {
        name: 'باجرے کی روٹی',
        portion: '1 روٹی، 55\u00A0گرام',
        varies: 'کتنی خشک اور کتنی پتلی۔ اس نمبر کے حساب سے اس میں فی گرام اتنا کاربوہائیڈریٹ بنتا ہے جتنا کسی اور تازہ روٹی میں نہیں — اس لیے اسے اوپر کی حد سمجھیں اور 2\u00A0گھنٹے بعد میٹر سے چیک کر لیں۔',
      },
    },
    roman: 'Baajrey ki roti',
    aliases: ['baajrey ki roti', 'bajre ki roti', 'bajray ki roti', 'bajra roti', 'baajra roti', 'millet roti', 'roti', 'rotti'],
    grams: 35,
    gramsMax: null,
    confidence: 'low',
    source: 'LFAC — flagged, passes no independent check',
  },
  {
    id: 'roti-makkai',
    category: 'bread',
    text: {
      en: {
        name: 'Maize flatbread',
        portion: '1 roti, 56 g',
        varies: 'How dry and how thin. Same flag as the bajra roti — the density behind this figure is very high for a fresh roti, so verify with the meter.',
      },
      ur: {
        name: 'مکئی کی روٹی',
        portion: '1 روٹی، 56\u00A0گرام',
        varies: 'کتنی خشک اور کتنی پتلی۔ باجرے کی روٹی والی ہی بات ہے — اس نمبر کے پیچھے فی گرام حساب تازہ روٹی کے لیے بہت اونچا ہے، اس لیے میٹر سے تصدیق کر لیں۔',
      },
    },
    roman: 'Makkai ki roti',
    aliases: ['makkai ki roti', 'makai ki roti', 'makki ki roti', 'maize roti', 'corn roti', 'roti', 'rotti'],
    grams: 35,
    gramsMax: null,
    confidence: 'low',
    source: 'LFAC — flagged, passes no independent check',
  },
  {
    id: 'koki',
    category: 'bread',
    text: {
      en: {
        name: 'Koki, Sindhi pan-fried bread',
        portion: '1 piece, 98 g',
        varies: 'Size, and how much ghee went into it. Ghee dilutes the flour, so a richer koki holds less for its weight.',
      },
      ur: {
        name: 'کوکی (سندھی)',
        portion: '1 عدد، 98\u00A0گرام',
        varies: 'سائز، اور گھی کتنا گیا۔ گھی آٹے کا حصہ گھٹا دیتا ہے، اس لیے زیادہ گھی والی کوکی اپنے وزن کے حساب سے کم رکھتی ہے۔',
      },
    },
    roman: 'Koki',
    aliases: ['koki', 'kooki', 'sindhi koki', 'roti'],
    grams: 28,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'roti-rumali',
    category: 'bread',
    text: {
      en: {
        name: 'Rumali roti',
        portion: '1 piece, 55 g',
        varies: 'Size. It is maida, not atta, so weigh it and multiply by 0.50 rather than 0.46.',
      },
      ur: {
        name: 'رومالی روٹی',
        portion: '1 عدد، 55\u00A0گرام',
        varies: 'سائز۔ یہ میدے کی ہے، آٹے کی نہیں — تولیں اور 0.46 کے بجائے 0.50 سے ضرب دیں۔',
      },
    },
    roman: 'Rumali roti',
    aliases: ['rumali roti', 'roomali roti', 'rumaali roti', 'roti', 'rotti'],
    grams: 27,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'roti-khamiri',
    category: 'bread',
    text: {
      en: {
        name: 'Khamiri roti, leavened and spongy',
        portion: '1 piece, 100 to 200 g',
        varies: 'Piece weight alone — the density is settled, the piece is not. A 100 g one is 45 g, a 200 g one is 90. Weigh one of yours once and this row stops being a guess.',
      },
      ur: {
        name: 'خمیری روٹی',
        portion: '1 عدد، 100 سے 200\u00A0گرام',
        varies: 'صرف ٹکڑے کا وزن — فی گرام حساب طے ہے، ٹکڑا نہیں۔ 100\u00A0گرام والی 45\u00A0گرام ہے، 200\u00A0گرام والی 90۔ اپنی ایک بار تول لیں تو یہ لائن اندازہ نہیں رہتی۔',
      },
    },
    roman: 'Khamiri roti',
    aliases: ['khamiri roti', 'khameeri roti', 'khamiri', 'khameeri', 'roti', 'rotti'],
    grams: 45,
    gramsMax: 90,
    confidence: 'low',
    source: 'CALC from the atta anchor — no LFAC row',
  },
  {
    id: 'bread-slice',
    category: 'bread',
    text: {
      en: {
        name: 'White bread slice',
        portion: '1 slice, 25 to 34 g',
        varies: 'Slice thickness and brand, and both are printed on the wrapper.',
      },
      ur: {
        name: 'ڈبل روٹی کا سلائس',
        portion: '1 سلائس، 25 سے 34\u00A0گرام',
        varies: 'سلائس کی موٹائی اور برانڈ، اور دونوں ریپر پر چھپے ہوتے ہیں۔',
      },
    },
    roman: 'Double roti',
    aliases: ['double roti', 'dabal roti', 'bread', 'bread slice', 'slice', 'toast', 'white bread'],
    grams: 13,
    gramsMax: 15,
    confidence: 'high',
    source: 'SJSU, USDA, LFAC agree',
  },
  {
    id: 'bhatura',
    category: 'bread',
    text: {
      en: {
        name: 'Bhatura, fried maida bread',
        portion: '1 piece, 65 g',
        varies: 'Size. Frying adds fat, not carbohydrate.',
      },
      ur: {
        name: 'بھٹورا',
        portion: '1 عدد، 65\u00A0گرام',
        varies: 'سائز۔ تلنے سے چکنائی بڑھتی ہے، کاربوہائیڈریٹ نہیں۔',
      },
    },
    roman: 'Bhatura',
    aliases: ['bhatura', 'bhature', 'batura', 'bhatoora'],
    grams: 30,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Breads, paratha family (CARBS.md 3.3) ──────────────────────────────────
  {
    id: 'paratha-plain-medium',
    category: 'bread',
    text: {
      en: {
        name: 'Plain paratha, medium',
        portion: '1 medium, 74 g',
        varies: 'Size and thickness. The ghee changes the fat, never the carbohydrate — weigh one of yours once and every paratha row settles.',
      },
      ur: {
        name: 'سادہ پراٹھا، درمیانہ',
        portion: '1 درمیانہ، 74\u00A0گرام',
        varies: 'سائز اور موٹائی۔ گھی چکنائی بدلتا ہے، کاربوہائیڈریٹ کبھی نہیں — اپنا ایک پراٹھا ایک بار تول لیں تو پراٹھے کی ساری لائنیں طے ہو جاتی ہیں۔',
      },
    },
    roman: 'Paratha',
    aliases: ['paratha', 'parantha', 'paraatha', 'prantha', 'parata', 'sada paratha', 'plain paratha', 'prata'],
    grams: 33,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, FNDDS agree on the density to the decimal',
  },
  {
    id: 'paratha-plain-large',
    category: 'bread',
    text: {
      en: {
        name: 'Plain paratha, large',
        portion: '1 large, 8 inch, 90 to 100 g',
        varies: 'Size and thickness. This is the one to weigh if sehri is a paratha.',
      },
      ur: {
        name: 'سادہ پراٹھا، بڑا',
        portion: '1 بڑا، 8\u00A0انچ، 90 سے 100\u00A0گرام',
        varies: 'سائز اور موٹائی۔ اگر سحری پراٹھے کی ہوتی ہے تو تولنے والا یہی ہے۔',
      },
    },
    roman: 'Paratha',
    aliases: ['paratha', 'parantha', 'paraatha', 'prantha', 'parata', 'sada paratha', 'bara paratha', 'prata'],
    grams: 40,
    gramsMax: 46,
    confidence: 'medium',
    source: 'FNDDS density, LFAC agrees',
  },
  {
    id: 'paratha-frozen-dawn',
    category: 'bread',
    text: {
      en: {
        name: 'Frozen plain paratha, Dawn',
        portion: '1 piece, 80 g',
        varies: null,
      },
      ur: {
        name: 'Dawn فروزن پراٹھا',
        portion: '1 عدد، 80\u00A0گرام',
        varies: null,
      },
    },
    roman: 'Paratha',
    aliases: ['paratha', 'parantha', 'frozen paratha', 'dawn paratha', 'packet paratha', 'prata'],
    grams: 39,
    gramsMax: null,
    confidence: 'high',
    source: 'LABEL',
  },
  {
    id: 'paratha-lachha',
    category: 'bread',
    text: {
      en: {
        name: 'Lachha paratha, fresh',
        portion: '1 piece, 95 g',
        varies: 'Size. The layers are folded ghee, not extra flour.',
      },
      ur: {
        name: 'لچھا پراٹھا',
        portion: '1 عدد، 95\u00A0گرام',
        varies: 'سائز۔ لچھے تہہ در تہہ گھی ہیں، زیادہ آٹا نہیں۔',
      },
    },
    roman: 'Lachha paratha',
    aliases: ['lachha paratha', 'laccha paratha', 'lacha paratha', 'lachaa paratha', 'paratha', 'parantha', 'prata'],
    grams: 44,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'paratha-aloo',
    category: 'bread',
    text: {
      en: {
        name: 'Potato-stuffed paratha',
        portion: '1 piece, 100 to 120 g',
        varies: 'How generous the stuffing is, and it runs the opposite way to instinct: potato carries less per gram than dough, so a fat stuffed paratha sits at the bottom of this band and a dough-heavy, potato-lean one at the top.',
      },
      ur: {
        name: 'آلو پراٹھا',
        portion: '1 عدد، 100 سے 120\u00A0گرام',
        varies: 'آلو کتنا کھلے ہاتھ سے بھرا ہے، اور بات اندازے کے الٹ چلتی ہے: آلو میں فی گرام کاربوہائیڈریٹ آٹے سے کم ہوتا ہے، اس لیے خوب بھرا ہوا پراٹھا اس رینج کے نچلے سرے پر بیٹھتا ہے اور جس میں آٹا زیادہ اور آلو کم ہو وہ اوپر۔',
      },
    },
    roman: 'Aloo paratha',
    aliases: ['aloo paratha', 'alu paratha', 'aalu paratha', 'potato paratha', 'paratha', 'parantha', 'prata'],
    grams: 40,
    gramsMax: 50,
    confidence: 'medium',
    source: 'LFAC, LABEL',
  },
  {
    id: 'paratha-qeema',
    category: 'bread',
    text: {
      en: {
        name: 'Mince-stuffed paratha',
        portion: '1 piece, 125 g',
        varies: 'Size, and how much of it is meat rather than dough. Meat displaces flour.',
      },
      ur: {
        name: 'قیمہ پراٹھا',
        portion: '1 عدد، 125\u00A0گرام',
        varies: 'سائز، اور اس میں گوشت کتنا ہے، آٹا کتنا۔ گوشت آٹے کی جگہ لے لیتا ہے۔',
      },
    },
    roman: 'Qeema paratha',
    aliases: ['qeema paratha', 'keema paratha', 'kheema paratha', 'mince paratha', 'paratha', 'parantha', 'prata'],
    grams: 46,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CALC agree',
  },
  {
    id: 'paratha-anda',
    category: 'bread',
    text: {
      en: {
        name: 'Egg paratha',
        portion: '1 piece, 125 g',
        varies: 'Size, and the dough-to-egg share. The egg itself adds nothing.',
      },
      ur: {
        name: 'انڈا پراٹھا',
        portion: '1 عدد، 125\u00A0گرام',
        varies: 'سائز، اور آٹے اور انڈے کا تناسب۔ انڈا خود کچھ نہیں بڑھاتا۔',
      },
    },
    roman: 'Anda paratha',
    aliases: ['anda paratha', 'andaa paratha', 'egg paratha', 'paratha', 'parantha', 'prata'],
    grams: 46,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'paratha-cheese',
    category: 'bread',
    text: {
      en: {
        name: 'Cheese paratha',
        portion: '1 piece, 85 g',
        varies: 'Size, and how much cheese. Cheese is close to carbohydrate-free, so more of it means less of this.',
      },
      ur: {
        name: 'چیز پراٹھا',
        portion: '1 عدد، 85\u00A0گرام',
        varies: 'سائز، اور چیز کتنا۔ چیز میں کاربوہائیڈریٹ تقریباً نہیں ہوتا، تو جتنا وہ زیادہ، اتنا یہ کم۔',
      },
    },
    roman: 'Cheese paratha',
    aliases: ['cheese paratha', 'cheese parantha', 'paneer paratha', 'paratha', 'parantha', 'prata'],
    grams: 30,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'paratha-chicken',
    category: 'bread',
    text: {
      en: {
        name: 'Chicken paratha',
        portion: '1 piece, 90 g',
        varies: 'Size, and the filling-to-dough share.',
      },
      ur: {
        name: 'چکن پراٹھا',
        portion: '1 عدد، 90\u00A0گرام',
        varies: 'سائز، اور بھرائی اور آٹے کا تناسب۔',
      },
    },
    roman: 'Chicken paratha',
    aliases: ['chicken paratha', 'chicken parantha', 'murgh paratha', 'paratha', 'parantha', 'prata'],
    grams: 31,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'paratha-puri',
    category: 'bread',
    text: {
      en: {
        name: 'Puri paratha',
        portion: '1 piece, 110 g',
        varies: 'Size.',
      },
      ur: {
        name: 'پوری پراٹھا',
        portion: '1 عدد، 110\u00A0گرام',
        varies: 'سائز۔',
      },
    },
    roman: 'Puri paratha',
    aliases: ['puri paratha', 'poori paratha', 'paratha', 'parantha', 'prata'],
    grams: 49,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'paratha-baisan',
    category: 'bread',
    text: {
      en: {
        name: 'Gram-flour paratha',
        portion: '1 piece, 6 inch, 85 g',
        varies: 'Size, and the besan share. Besan runs leaner than atta, which is why this is the lightest paratha here.',
      },
      ur: {
        name: 'بیسن پراٹھا',
        portion: '1 عدد، 6\u00A0انچ، 85\u00A0گرام',
        varies: 'سائز، اور بیسن کا حصہ۔ بیسن آٹے سے ہلکا پڑتا ہے، اسی لیے یہ یہاں کا سب سے ہلکا پراٹھا ہے۔',
      },
    },
    roman: 'Baisan paratha',
    aliases: ['baisan paratha', 'besan paratha', 'basan paratha', 'gram flour paratha', 'paratha', 'parantha', 'prata'],
    grams: 25,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'puri-small',
    category: 'bread',
    text: {
      en: {
        name: 'Puri, small and thin',
        portion: '1 small, 4 to 5 inch',
        varies: 'Diameter and thickness. This is the home-size puri; the halwa-puri shop sells one twice as heavy.',
      },
      ur: {
        name: 'پوری، چھوٹی گھر کی',
        portion: '1 چھوٹی، 4 سے 5\u00A0انچ',
        varies: 'چوڑائی اور موٹائی۔ یہ گھر کے سائز کی پوری ہے؛ حلوہ پوری والا اس سے دگنی بھاری بیچتا ہے۔',
      },
    },
    roman: 'Puri',
    aliases: ['puri', 'poori', 'pooree', 'pury'],
    grams: 7,
    gramsMax: 14,
    confidence: 'medium',
    source: 'SJSU, FNDDS, LFAC agree on the density',
  },
  {
    id: 'puri-halwa-shop',
    category: 'bread',
    text: {
      en: {
        name: 'Puri, halwa-puri shop size',
        portion: '1 shop puri, 68 g',
        varies: 'Your puri-wala. The apparent twofold disagreement between sources was two real sizes, not two densities.',
      },
      ur: {
        name: 'پوری، حلوہ پوری دکان والی',
        portion: 'دکان کی 1 پوری، 68\u00A0گرام',
        varies: 'آپ کا پوری والا۔ ذرائع میں جو دگنا فرق لگتا تھا وہ دراصل دو الگ سائز تھے، ترکیب کا فرق نہیں۔',
      },
    },
    roman: 'Puri',
    aliases: ['puri', 'poori', 'halwa puri', 'nashta puri', 'pooree'],
    grams: 28,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, FNDDS',
  },
  {
    id: 'bakarkhani',
    category: 'bread',
    text: {
      en: {
        name: 'Bakarkhani',
        portion: '1 piece, 47 g',
        varies: 'Piece size, and bakery style. A fresh Pakistani piece sits here; the dry packaged export kind runs to 60 g per 100, about a third higher.',
      },
      ur: {
        name: 'باقرخانی',
        portion: '1 عدد، 47\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور بیکری کا انداز۔ تازہ پاکستانی باقرخانی یہی ہے؛ خشک پیکٹ والی ایکسپورٹ قسم ہر 100\u00A0گرام پر 60\u00A0گرام تک جاتی ہے، تقریباً تہائی زیادہ۔',
      },
    },
    roman: 'Bakarkhani',
    aliases: ['bakarkhani', 'baqarkhani', 'bakerkhani', 'bakar khani'],
    grams: 21,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC recommended over LABEL export mirrors',
  },
  {
    id: 'bolani',
    category: 'bread',
    text: {
      en: {
        name: 'Bolani, Pashtun stuffed fried flatbread',
        portion: '1 piece, 128 g',
        varies: 'Size and filling. Among the heaviest single breads in this list.',
      },
      ur: {
        name: 'بولانی (پشتون)',
        portion: '1 عدد، 128\u00A0گرام',
        varies: 'سائز اور بھرائی۔ اس فہرست کی سب سے بھاری اکیلی روٹیوں میں سے ہے۔',
      },
    },
    roman: 'Bolani',
    aliases: ['bolani', 'bolaani', 'bulani', 'roti'],
    grams: 68,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'rusk-plain',
    category: 'bread',
    text: {
      en: {
        name: 'Rusk, plain',
        portion: '1 rusk, 10 g',
        varies: 'Brand and piece size. It is dry, so almost two-thirds of its weight is carbohydrate.',
      },
      ur: {
        name: 'سادہ رسک',
        portion: '1 رسک، 10\u00A0گرام',
        varies: 'برانڈ اور ٹکڑے کا سائز۔ یہ خشک ہوتا ہے، اس لیے وزن کا قریب دو تہائی کاربوہائیڈریٹ ہی ہوتا ہے۔',
      },
    },
    roman: 'Rusk',
    aliases: ['rusk', 'rask', 'toast rusk', 'chai rusk'],
    grams: 6,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CoFID agree',
  },
  {
    id: 'rusk-cake',
    category: 'bread',
    text: {
      en: {
        name: 'Cake rusk',
        portion: '1 cake rusk, 20 g',
        varies: 'Brand and piece size.',
      },
      ur: {
        name: 'کیک رسک',
        portion: '1 کیک رسک، 20\u00A0گرام',
        varies: 'برانڈ اور ٹکڑے کا سائز۔',
      },
    },
    roman: 'Cake rusk',
    aliases: ['cake rusk', 'cake rask', 'rusk'],
    grams: 11,
    gramsMax: null,
    confidence: 'medium',
    source: 'CoFID',
  },

  // ── Rice dishes, and the rice-based sweets (CARBS.md 4) ───────────────────
  {
    id: 'pulao-plate',
    category: 'rice',
    text: {
      en: {
        name: 'Pulao, meat, full plate',
        portion: '1 plate, 300\u00A0g',
        varies: 'The rice-to-meat ratio decides which end. Meat in most bites puts you near 54; a plate that is mostly rice puts you near 73.',
      },
      ur: {
        name: 'پلاؤ، گوشت والا، بھری پلیٹ',
        portion: '1 پلیٹ، 300\u00A0گرام',
        varies: 'چاول اور گوشت کا تناسب طے کرتا ہے کہ کون سا سرا۔ ہر نوالے میں گوشت ہو تو 54 کے قریب؛ پلیٹ زیادہ تر چاول ہو تو 73 کے قریب۔',
      },
    },
    roman: 'Pulao',
    aliases: ['pulao', 'pulav', 'pilau', 'pilaf', 'polao', 'yakhni pulao', 'plate of pulao'],
    grams: 54,
    gramsMax: 73,
    confidence: 'medium',
    source: 'LFAC, KHAN, CoFID — band widened down, not averaged',
  },
  {
    id: 'pulao-qeema-masoor',
    category: 'rice',
    text: {
      en: {
        name: 'Mince and lentil pulao, Memon',
        portion: '1 cup, 166\u00A0g',
        varies: 'Bowl size, and how much of the cup is rice rather than mince.',
      },
      ur: {
        name: 'قیمہ مسور پلاؤ (میمنی)',
        portion: '1 کپ، 166\u00A0گرام',
        varies: 'پیالے کا سائز، اور کپ میں چاول کتنا ہے، قیمہ کتنا۔',
      },
    },
    roman: 'Qeema masoor pulao',
    aliases: ['qeema masoor pulao', 'keema masoor pulao', 'qeema pulao', 'pulao', 'pulav'],
    grams: 38,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'akni-chicken',
    category: 'rice',
    text: {
      en: {
        name: 'Chicken akni, Memon pulao',
        portion: '1 cup, 167\u00A0g',
        varies: 'Bowl size, and the rice-to-chicken share.',
      },
      ur: {
        name: 'چکن اکنی (میمنی)',
        portion: '1 کپ، 167\u00A0گرام',
        varies: 'پیالے کا سائز، اور چاول اور چکن کا تناسب۔',
      },
    },
    roman: 'Chicken akni',
    aliases: ['chicken akni', 'akni', 'aakni', 'memon pulao', 'pulao', 'pulav'],
    grams: 41,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pulao-cholistani',
    category: 'rice',
    text: {
      en: {
        name: 'Cholistani pulao, Saraiki',
        portion: '1 cup, 164\u00A0g',
        varies: 'Bowl size, and the rice share.',
      },
      ur: {
        name: 'چولستانی پلاؤ',
        portion: '1 کپ، 164\u00A0گرام',
        varies: 'پیالے کا سائز، اور چاول کا حصہ۔',
      },
    },
    roman: 'Cholistani-style pulao',
    aliases: ['cholistani pulao', 'cholistani-style pulao', 'saraiki pulao', 'pulao', 'pulav'],
    grams: 46,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'khichdi',
    category: 'rice',
    text: {
      en: {
        name: 'Khichri, plain rice and lentils',
        portion: '1 cup',
        varies: 'Bowl size, and how wet it was cooked. A looser khichri holds less per bowl.',
      },
      ur: {
        name: 'سادہ کھچڑی',
        portion: '1 کپ',
        varies: 'پیالے کا سائز، اور کتنی گیلی پکی۔ پتلی کھچڑی میں فی پیالہ کم ہوتا ہے۔',
      },
    },
    roman: 'Khichdi',
    aliases: ['khichdi', 'khichri', 'khichree', 'khichari', 'kichri', 'khichdee'],
    grams: 30,
    gramsMax: null,
    confidence: 'medium',
    source: 'SJSU, LFAC agree',
  },
  {
    id: 'khichdi-qeema-bohra',
    category: 'rice',
    text: {
      en: {
        name: 'Mince khichdi, Bohra',
        portion: '1 cup, 246\u00A0g',
        varies: 'Bowl size and wetness.',
      },
      ur: {
        name: 'قیمہ کھچڑی (بوہری)',
        portion: '1 کپ، 246\u00A0گرام',
        varies: 'پیالے کا سائز اور گیلا پن۔',
      },
    },
    roman: 'Bohra qeema khichdi',
    aliases: ['bohra qeema khichdi', 'qeema khichdi', 'keema khichdi', 'khichdi', 'khichri'],
    grams: 35,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'tahiri-cup',
    category: 'rice',
    text: {
      en: {
        name: 'Aloo tahiri, cup',
        portion: '1 cup, 166\u00A0g',
        varies: 'Bowl size and the potato load. This is rice plus potato and sits at nearly plain-rice density — a katori is about 45\u00A0g.',
      },
      ur: {
        name: 'آلو تہاری، کپ',
        portion: '1 کپ، 166\u00A0گرام',
        varies: 'پیالے کا سائز اور آلو کتنا ہے۔ یہ چاول اور آلو ملا کر ہے اور فی گرام تقریباً سادہ چاول جتنا ہی بیٹھتا ہے — 1 کٹوری تقریباً 45\u00A0گرام۔',
      },
    },
    roman: 'Aloo tahiri',
    aliases: ['aloo tahiri', 'alu tahiri', 'tahiri', 'tehari', 'tahari', 'aloo tehari', 'potato rice'],
    grams: 50,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC recommended over FNDDS, which measures a wetter vegetable pilaf',
  },
  {
    id: 'tahiri-plate',
    category: 'rice',
    text: {
      en: {
        name: 'Aloo tahiri, full plate',
        portion: '1 plate, 300\u00A0g',
        varies: 'Plate size and the potato load.',
      },
      ur: {
        name: 'آلو تہاری، بھری پلیٹ',
        portion: '1 پلیٹ، 300\u00A0گرام',
        varies: 'پلیٹ کا سائز اور آلو کتنا ہے۔',
      },
    },
    roman: 'Aloo tahiri',
    aliases: ['aloo tahiri', 'alu tahiri', 'tahiri', 'tehari', 'tahari', 'aloo tehari', 'plate of tahiri'],
    grams: 90,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CALC to a 300\u00A0g plate',
  },
  {
    id: 'fried-rice-vegetable',
    category: 'rice',
    text: {
      en: {
        name: 'Vegetable fried rice',
        portion: '1 cup, 162\u00A0g',
        varies: 'Bowl size. The oil adds nothing.',
      },
      ur: {
        name: 'ویجیٹیبل فرائیڈ رائس',
        portion: '1 کپ، 162\u00A0گرام',
        varies: 'پیالے کا سائز۔ تیل کچھ نہیں بڑھاتا۔',
      },
    },
    roman: 'Vegetable fried rice',
    aliases: ['vegetable fried rice', 'fried rice', 'chinese rice', 'sabzi wale chawal', 'rice'],
    grams: 48,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'daal-chawal-plate',
    category: 'rice',
    text: {
      en: {
        name: 'Daal chawal, as a plate',
        portion: '1 cup rice with 1 cup daal, 355\u00A0g',
        varies: 'How much of the plate is rice. The rice is about two-thirds of this number, so a smaller helping of rice moves it more than a smaller helping of daal.',
      },
      ur: {
        name: 'دال چاول',
        portion: '1 کپ چاول اور 1 کپ دال، 355\u00A0گرام',
        varies: 'پلیٹ میں چاول کتنا ہے۔ اس نمبر کا قریب دو تہائی چاول ہے، اس لیے چاول تھوڑا کم لینا دال تھوڑی کم لینے سے زیادہ فرق ڈالتا ہے۔',
      },
    },
    roman: 'Daal chawal',
    aliases: ['daal chawal', 'dal chawal', 'daal chaval', 'rice and daal', 'daal rice'],
    grams: 75,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC composite',
  },
  {
    id: 'daal-chawal-palidu',
    category: 'rice',
    text: {
      en: {
        name: 'Daal chawal palidu, Bohra',
        portion: '1 and a half cups, 350\u00A0g',
        varies: 'Plate size.',
      },
      ur: {
        name: 'دال چاول پالیدو (بوہری)',
        portion: 'ڈیڑھ کپ، 350\u00A0گرام',
        varies: 'پلیٹ کا سائز۔',
      },
    },
    roman: 'Daal chawal palidu',
    aliases: ['daal chawal palidu', 'dal chawal palidu', 'palidu', 'paalidu', 'daal chawal'],
    grams: 78,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'bademjan',
    category: 'rice',
    text: {
      en: {
        name: 'Bademjan, Pashtun rice with eggplant',
        portion: '1 cup, 240\u00A0g',
        varies: 'Bowl size, and the rice-to-eggplant share. Eggplant is close to free.',
      },
      ur: {
        name: 'بادمجان (پشتون)',
        portion: '1 کپ، 240\u00A0گرام',
        varies: 'پیالے کا سائز، اور چاول اور بینگن کا تناسب۔ بینگن میں نہ ہونے کے برابر ہے۔',
      },
    },
    roman: 'Bademjan',
    aliases: ['bademjan', 'badenjan', 'baademjan', 'rice', 'pulao'],
    grams: 25,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'zarda',
    category: 'sweet',
    text: {
      en: {
        name: 'Sweet yellow rice',
        portion: '1 katori, 150\u00A0g',
        varies: 'The sugar and dried fruit, and nobody has ever analysed this dish — the figure is a honey-rice stand-in. Treat it as a floor at a dawat and check the meter afterwards.',
      },
      ur: {
        name: 'زردہ',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'چینی اور میوہ، اور اس ڈش کو آج تک کسی نے ناپا ہی نہیں — یہ نمبر شہد والے چاول کا قائم مقام ہے۔ دعوت میں اسے کم از کم سمجھیں اور بعد میں میٹر سے چیک کر لیں۔',
      },
    },
    roman: 'Zarda',
    aliases: ['zarda', 'zardah', 'sweet rice', 'meethay chawal', 'meethe chawal'],
    grams: 45,
    gramsMax: 50,
    confidence: 'low',
    source: 'FNDDS honey-rice proxy, WEAK trackers — no LFAC row, still an open unknown',
  },
  {
    id: 'kheer-home',
    category: 'sweet',
    text: {
      en: {
        name: 'Kheer, home-style light',
        portion: '1 katori, 150\u00A0g',
        varies: 'How far the milk was reduced and how much sugar went in. Pale, pourable, only faintly sweet is this row; thick and shop-sweet is the other one, at nearly double.',
      },
      ur: {
        name: 'کھیر، گھر کی ہلکی',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'دودھ کتنا پکا کر گاڑھا کیا اور چینی کتنی ڈلی۔ ہلکی، بہنے والی، ذرا سی میٹھی ہو تو یہ والی لائن ہے؛ گاڑھی اور دکان جیسی میٹھی ہو تو دوسری والی، تقریباً دگنے پر۔',
      },
    },
    roman: 'Kheer',
    aliases: ['kheer', 'kheeer', 'khir', 'rice pudding', 'chawal ki kheer'],
    grams: 28,
    gramsMax: null,
    confidence: 'medium',
    source: 'CoFID, FNDDS at 19\u00A0g per 100',
  },
  {
    id: 'kheer-shop',
    category: 'sweet',
    text: {
      en: {
        name: 'Kheer, shop or dawat',
        portion: '1 katori, 150\u00A0g',
        varies: 'How far the milk was reduced and how much sugar. Thick enough to hold the spoon, deep cream in colour, is this row at 31\u00A0g per 100 — the Pakistani preparation the book measured.',
      },
      ur: {
        name: 'کھیر، دکان یا دعوت والی',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'دودھ کتنا گاڑھا کیا اور چینی کتنی۔ اتنی گاڑھی کہ چمچ تھام لے، گہری ملائی جیسی رنگت — وہ یہی لائن ہے، ہر 100\u00A0گرام میں 31\u00A0گرام — کتاب نے یہی پاکستانی کھیر ناپی تھی۔',
      },
    },
    roman: 'Kheer',
    aliases: ['kheer', 'kheeer', 'khir', 'rice pudding', 'chawal ki kheer', 'dawat kheer'],
    grams: 47,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC recommended over CoFID and FNDDS, which measure a UK rice pudding',
  },
  {
    id: 'firni',
    category: 'sweet',
    text: {
      en: {
        name: 'Firni, ground-rice pudding',
        portion: 'three-quarters of a cup, 158\u00A0g',
        varies: 'Bowl size and sweetness. Firni is thinner than kheer and is a separate dish, not a portion of it.',
      },
      ur: {
        name: 'فرنی',
        portion: 'پون کپ، 158\u00A0گرام',
        varies: 'پیالے کا سائز اور مٹھاس۔ فرنی کھیر سے پتلی ہوتی ہے اور الگ ڈش ہے، کھیر کا حصہ نہیں۔',
      },
    },
    roman: 'Firni',
    aliases: ['firni', 'phirni', 'firnee', 'feerni'],
    grams: 23,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'kheer-kharkoon',
    category: 'sweet',
    text: {
      en: {
        name: 'Kheer kharkoon, Sindhi date kheer',
        portion: 'half a cup, 72\u00A0g',
        varies: 'Bowl size, and how many dates. The dates are most of the sugar.',
      },
      ur: {
        name: 'کھیر کھارکون (سندھی)',
        portion: 'آدھا کپ، 72\u00A0گرام',
        varies: 'پیالے کا سائز، اور کھجوریں کتنی۔ زیادہ تر مٹھاس کھجوروں ہی کی ہے۔',
      },
    },
    roman: 'Kheer kharkoon',
    aliases: ['kheer kharkoon', 'kharkoon', 'date kheer', 'khajoor kheer', 'kheer'],
    grams: 21,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Biryani, by which pot it came from (CARBS.md 4.1) ──────────────────────
  {
    id: 'biryani-meat-heavy-plate',
    category: 'rice',
    text: {
      en: {
        name: 'Biryani, meat-heavy home pot, plate',
        portion: '1 plate, 300\u00A0g',
        varies: 'Look at the plate: meat in most bites, rice not covering it, is this pot. Each potato chunk adds 8 to 16\u00A0g on top.',
      },
      ur: {
        name: 'بریانی، گوشت زیادہ، پلیٹ',
        portion: '1 پلیٹ، 300\u00A0گرام',
        varies: 'پلیٹ دیکھ لیں: ہر نوالے میں گوشت ہو اور چاول اسے ڈھانپ نہ رہے ہوں تو یہی دیگ ہے۔ آلو کا ہر ٹکڑا اوپر سے 8 سے 16\u00A0گرام بڑھا دیتا ہے۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani', 'biryaani', 'ghar ki biryani'],
    grams: 41,
    gramsMax: 50,
    confidence: 'medium',
    source: 'FNDDS, CoFID takeaway',
  },
  {
    id: 'biryani-mid-plate',
    category: 'rice',
    text: {
      en: {
        name: 'Biryani, mid pot, plate',
        portion: '1 plate, 300\u00A0g',
        varies: 'Look at the plate: rice just over half of it, meat findable in most spoonfuls. This is the Pakistani anchor. Each potato chunk adds 8 to 16\u00A0g.',
      },
      ur: {
        name: 'بریانی، درمیانی دیگ، پلیٹ',
        portion: '1 پلیٹ، 300\u00A0گرام',
        varies: 'پلیٹ دیکھ لیں: چاول آدھی سے کچھ زیادہ، گوشت تقریباً ہر چمچ میں مل جائے۔ پاکستانی پیمائش کی بنیاد یہی ہے۔ آلو کا ہر ٹکڑا 8 سے 16\u00A0گرام۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani', 'biryaani'],
    grams: 51,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'biryani-rice-heavy-plate',
    category: 'rice',
    text: {
      en: {
        name: 'Biryani, rice-heavy or degh, plate',
        portion: '1 plate, 300\u00A0g',
        varies: 'Look at the plate: mostly rice, with meat to be hunted for. Degh and commercial biryani sit here. Each potato chunk adds 8 to 16\u00A0g.',
      },
      ur: {
        name: 'بریانی، چاول زیادہ یا دیگ والی، پلیٹ',
        portion: '1 پلیٹ، 300\u00A0گرام',
        varies: 'پلیٹ دیکھ لیں: زیادہ تر چاول، گوشت ڈھونڈنا پڑے۔ دیگ اور کمرشل بریانی یہیں بیٹھتی ہے۔ آلو کا ہر ٹکڑا 8 سے 16\u00A0گرام۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani', 'degh biryani', 'commercial biryani'],
    grams: 60,
    gramsMax: 66,
    confidence: 'medium',
    source: 'CoFID homemade, KHAN',
  },
  {
    id: 'biryani-meat-heavy-dawat',
    category: 'rice',
    text: {
      en: {
        name: 'Biryani, meat-heavy home pot, dawat plate',
        portion: '1 dawat plate, 400\u00A0g',
        varies: 'Meat in most bites. A dawat plate is a third bigger than an everyday one, which is where the extra comes from.',
      },
      ur: {
        name: 'بریانی، گوشت زیادہ، دعوت کی پلیٹ',
        portion: '1 دعوت کی پلیٹ، 400\u00A0گرام',
        varies: 'ہر نوالے میں گوشت۔ دعوت کی پلیٹ روز کی پلیٹ سے تہائی بڑی ہوتی ہے — زیادہ اسی سے آتا ہے۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani', 'shaadi biryani', 'dawat biryani'],
    grams: 54,
    gramsMax: 66,
    confidence: 'medium',
    source: 'FNDDS, CoFID takeaway',
  },
  {
    id: 'biryani-mid-dawat',
    category: 'rice',
    text: {
      en: {
        name: 'Biryani, mid pot, dawat plate',
        portion: '1 dawat plate, 400\u00A0g',
        varies: 'Rice just over half the plate. Each potato chunk adds 8 to 16\u00A0g.',
      },
      ur: {
        name: 'بریانی، درمیانی دیگ، دعوت کی پلیٹ',
        portion: '1 دعوت کی پلیٹ، 400\u00A0گرام',
        varies: 'چاول پلیٹ کے آدھے سے کچھ زیادہ۔ آلو کا ہر ٹکڑا 8 سے 16\u00A0گرام۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani', 'shaadi biryani', 'dawat biryani'],
    grams: 68,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'biryani-rice-heavy-dawat',
    category: 'rice',
    text: {
      en: {
        name: 'Biryani, rice-heavy or degh, dawat plate',
        portion: '1 dawat plate, 400\u00A0g',
        varies: 'Mostly rice, at a dawat plate size. This is the largest single carbohydrate in this table.',
      },
      ur: {
        name: 'بریانی، چاول زیادہ یا دیگ والی، دعوت کی پلیٹ',
        portion: '1 دعوت کی پلیٹ، 400\u00A0گرام',
        varies: 'زیادہ تر چاول، اور دعوت کی پلیٹ کے سائز پر۔ اس فہرست کا سب سے بڑا اکیلا کاربوہائیڈریٹ یہی ہے۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani', 'degh biryani', 'shaadi biryani'],
    grams: 80,
    gramsMax: 88,
    confidence: 'medium',
    source: 'CoFID homemade, KHAN',
  },
  {
    id: 'biryani-unknown-pot',
    category: 'rice',
    text: {
      en: {
        name: 'Biryani, plate, pot unknown',
        portion: '1 plate, 300\u00A0g',
        varies: 'You cannot tell which pot it came from. 50\u00A0g is the honest default; the true spread across plates is 40 to 90, so check the 2-hour reading and remember which restaurant it was.',
      },
      ur: {
        name: 'بریانی، پلیٹ، دیگ معلوم نہیں',
        portion: '1 پلیٹ، 300\u00A0گرام',
        varies: 'پتہ نہیں چل سکتا کہ کون سی دیگ سے آئی۔ 50\u00A0گرام ایمانداری کا اندازہ ہے؛ پلیٹوں میں اصل پھیلاؤ 40 سے 90 ہے، اس لیے 2\u00A0گھنٹے بعد چیک کریں اور یاد رکھیں کہ ریسٹورنٹ کون سا تھا۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'briyani', 'biriani', 'plate of biryani'],
    grams: 50,
    gramsMax: 90,
    confidence: 'medium',
    source: 'LFAC, FNDDS, CoFID, KHAN — the honest spread, deliberately not narrowed',
  },

  // ── Lentils and legumes (CARBS.md 5) ───────────────────────────────────────
  {
    id: 'daal-chana',
    category: 'daal',
    text: {
      en: {
        name: 'Chana daal, split gram lentils',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size, and how thick it was cooked. Chana daal holds its grain, so the spread is narrower than most.',
      },
      ur: {
        name: 'چنے کی دال',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کٹوری کا سائز، اور کتنی گاڑھی پکی۔ چنے کی دال کا دانہ ثابت رہتا ہے، اس لیے اس کا پھیلاؤ باقیوں سے کم ہے۔',
      },
    },
    roman: 'Chana daal',
    aliases: ['chana daal', 'chana dal', 'chanay ki daal', 'channa daal', 'daal', 'dal', 'dhal', 'curry', 'salan'],
    grams: 22,
    gramsMax: 27,
    confidence: 'medium',
    source: 'KHAN, CoFID',
  },
  {
    id: 'daal-masoor',
    category: 'daal',
    text: {
      en: {
        name: 'Masoor daal, red lentils',
        portion: '1 katori, 150\u00A0g',
        varies: 'Thickness, and that alone — a watery tarka at the bottom, a spoon-holding daal at the top. Bowl size on top of that.',
      },
      ur: {
        name: 'مسور کی دال',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'گاڑھا پن، اور بس یہی — پانی جیسی تڑکے والی نچلے سرے پر، چمچ تھامنے والی اوپر۔ اوپر سے کٹوری کا سائز۔',
      },
    },
    roman: 'Masoor daal',
    aliases: ['masoor daal', 'masoor dal', 'masur daal', 'red lentils', 'daal', 'dal', 'dhal', 'curry', 'salan'],
    grams: 16,
    gramsMax: 29,
    confidence: 'medium',
    source: 'CoFID by thickness',
  },
  {
    id: 'daal-moong',
    category: 'daal',
    text: {
      en: {
        name: 'Moong daal, yellow lentils',
        portion: '1 katori, 150\u00A0g',
        varies: 'Thickness. Thin and pourable is the bottom, boiled-dry grains the top; the everyday middle, where a moong-masoor mix sits, is about 22.',
      },
      ur: {
        name: 'مونگ کی دال',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'گاڑھا پن۔ پتلی بہنے والی نچلا سرا ہے، خشک ابلے دانے اوپر کا؛ روز والی درمیانی، جہاں مونگ مسور کی ملی جلی بیٹھتی ہے، تقریباً 22 ہے۔',
      },
    },
    roman: 'Moong daal',
    aliases: ['moong daal', 'mung daal', 'moong dal', 'mong daal', 'moong masoor', 'daal', 'dal', 'dhal', 'curry', 'salan'],
    grams: 11,
    gramsMax: 29,
    confidence: 'medium',
    source: 'CoFID, USDA-SR, LFAC moong-masoor pins the middle',
  },
  {
    id: 'daal-mash',
    category: 'daal',
    text: {
      en: {
        name: 'Mash daal, white lentils',
        portion: '1 katori, 150\u00A0g',
        varies: 'How dry it was cooked. Mash is often made dry-style, grain separate, and that is the top of this band; a thin one is the bottom.',
      },
      ur: {
        name: 'ماش کی دال',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کتنی خشک پکی۔ ماش اکثر خشک، کھلے دانے والی بنتی ہے، اور وہ اس رینج کا اوپر والا سرا ہے؛ پتلی ہو تو نیچے والا۔',
      },
    },
    roman: 'Mash daal',
    aliases: ['mash daal', 'mash dal', 'maash daal', 'urad daal', 'daal', 'dal', 'dhal', 'curry', 'salan'],
    grams: 13,
    gramsMax: 32,
    confidence: 'low',
    source: 'CoFID thin style, KHAN dry style — unresolved, not averaged',
  },
  {
    id: 'chanay',
    category: 'daal',
    text: {
      en: {
        name: 'Chanay or cholay, whole chickpeas',
        portion: '1 katori, 150\u00A0g',
        varies: 'Gravy or solid. A katori that is mostly gravy sits at the bottom; a katori of drained chanay at the top. Half a cup of the nashta kind is about 10\u00A0g.',
      },
      ur: {
        name: 'چنے (چھولے)',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'شوربے والے ہیں یا نتھرے ہوئے۔ جس کٹوری میں زیادہ شوربہ ہو وہ نچلے سرے پر؛ نتھرے چنوں کی کٹوری اوپر۔ ناشتے والوں کا آدھا کپ تقریباً 10\u00A0گرام ہے۔',
      },
    },
    roman: 'Chanay',
    aliases: ['chanay', 'chana', 'chole', 'cholay', 'chholay', 'chickpeas', 'chick peas', 'curry', 'salan', 'chhole'],
    grams: 28,
    gramsMax: 41,
    confidence: 'medium',
    source: 'KHAN, USDA-SR, LFAC agree with KHAN to a decimal',
  },
  {
    id: 'daal-khati-memon',
    category: 'daal',
    text: {
      en: {
        name: 'Khati daal, Memon sour lentils',
        portion: 'half a cup, 96\u00A0g',
        varies: 'Bowl size and thickness.',
      },
      ur: {
        name: 'کھٹی دال (میمنی)',
        portion: 'آدھا کپ، 96\u00A0گرام',
        varies: 'پیالے کا سائز اور گاڑھا پن۔',
      },
    },
    roman: 'Khati daal',
    aliases: ['khati daal', 'khatti daal', 'khati dal', 'sour daal', 'daal', 'dal', 'curry', 'salan'],
    grams: 13,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'daal-gosht-memon',
    category: 'daal',
    text: {
      en: {
        name: 'Daal gosht, lentils with meat',
        portion: '1 cup, 212\u00A0g',
        varies: 'Bowl size, and how much of the cup is meat. Meat dilutes the daal, so this is lighter than a plain thick daal of the same volume.',
      },
      ur: {
        name: 'دال گوشت',
        portion: '1 کپ، 212\u00A0گرام',
        varies: 'پیالے کا سائز، اور کپ میں گوشت کتنا ہے۔ گوشت دال کا حصہ گھٹا دیتا ہے، اس لیے یہ اتنی ہی گاڑھی سادہ دال سے ہلکی ہے۔',
      },
    },
    roman: 'Daal gosht',
    aliases: ['daal gosht', 'dal gosht', 'daal ghosht', 'meat daal', 'daal', 'dal', 'curry', 'salan'],
    grams: 20,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'shorwa-pashtun',
    category: 'daal',
    text: {
      en: {
        name: 'Shorwa, Pashtun broth',
        portion: '1 cup, 245\u00A0g',
        varies: 'Bowl size, and how much bread or pulse is in the broth.',
      },
      ur: {
        name: 'شوروا (پشتون)',
        portion: '1 کپ، 245\u00A0گرام',
        varies: 'پیالے کا سائز، اور شوربے میں روٹی یا دال کتنی ہے۔',
      },
    },
    roman: 'Shorwa',
    aliases: ['shorwa', 'shorba', 'shorwah', 'shurwa', 'curry', 'salan'],
    grams: 29,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'lobia',
    category: 'daal',
    text: {
      en: {
        name: 'Lobia, black-eyed beans',
        portion: '1 katori, 150\u00A0g',
        varies: 'Gravy or drained beans, and bowl size. A gravy-heavy katori sits at the bottom.',
      },
      ur: {
        name: 'لوبیا',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'شوربہ ہے یا نتھرے دانے، اور کٹوری کا سائز۔ زیادہ شوربے والی کٹوری نچلے سرے پر ہوتی ہے۔',
      },
    },
    roman: 'Lobia',
    aliases: ['lobia', 'lubia', 'lobiya', 'black eyed beans', 'cowpeas', 'curry', 'salan'],
    grams: 20,
    gramsMax: 30,
    confidence: 'medium',
    source: 'USDA-SR, KHAN',
  },
  {
    id: 'rajma',
    category: 'daal',
    text: {
      en: {
        name: 'Rajma, red kidney beans',
        portion: '1 katori, 150\u00A0g',
        varies: 'How much gravy dilutes the beans. Plain drained beans are the bottom of this band and the double-confirmed end.',
      },
      ur: {
        name: 'راجما (لال لوبیا)',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'شوربہ دانوں کو کتنا ہلکا کرتا ہے۔ سادہ نتھرے لوبیا اس رینج کا نچلا سرا ہیں، اور یہی سرا دونوں ذرائع سے پکا ہے۔',
      },
    },
    roman: 'Rajma',
    aliases: ['rajma', 'raajma', 'rajmah', 'kidney beans', 'red beans', 'curry', 'salan'],
    grams: 20,
    gramsMax: 34,
    confidence: 'medium',
    source: 'USDA-SR, KHAN, LFAC agrees with USDA',
  },
  {
    id: 'haleem',
    category: 'salan',
    text: {
      en: {
        name: 'Haleem',
        portion: '1 bowl, 250\u00A0g',
        varies: 'Thickness, and it is a twofold swing. Loose, with visible meat shreds, is 30 to 35; a stiff uniform paste that holds the spoon upright is 55. The grain is the carbohydrate and the water decides the rest — and weigh your bowl, cups differ by a tenth between sources.',
      },
      ur: {
        name: 'حلیم',
        portion: '1 پیالہ، 250\u00A0گرام',
        varies: 'گاڑھا پن، اور فرق پورا دگنا ہے۔ پتلی، جس میں گوشت کے ریشے نظر آئیں، 30 سے 35؛ اتنی سخت یکساں کہ چمچ کھڑا رہے، 55۔ کاربوہائیڈریٹ اناج کا ہے اور باقی سب پانی طے کرتا ہے — اور اپنا پیالہ تول لیں، ذرائع کے کپ آپس میں دسویں حصے تک الگ ہیں۔',
      },
    },
    roman: 'Haleem',
    aliases: ['haleem', 'halim', 'haaleem', 'harees', 'daleem', 'curry', 'salan'],
    grams: 35,
    gramsMax: 55,
    confidence: 'low',
    source: 'LFAC, KHAN, SJSU for the default; LIT Al-Faris and LABEL Shan at the floor; CALC and LIT dry-matter at the top. PK-FCT rejected as unreachable from its own recipe',
  },

  // ── Salan and curries (CARBS.md 6) ─────────────────────────────────────────
  {
    id: 'nihari',
    category: 'salan',
    text: {
      en: {
        name: 'Nihari',
        portion: '1 bowl, 250\u00A0g',
        varies: 'The atta slurry stirred in at the end, and only that — sourced recipes put the flour anywhere from 18 to 150\u00A0g per kilo of meat. Gravy that runs off the spoon is near 7; gravy that coats the spoon is near 20. The everyday middle is 11 to 17.',
      },
      ur: {
        name: 'نہاری',
        portion: '1 پیالہ، 250\u00A0گرام',
        varies: 'آخر میں گھولا جانے والا آٹا، اور بس وہی — ترکیبیں فی کلو گوشت 18 سے 150\u00A0گرام تک آٹا ڈالتی ہیں۔ جو شوربہ چمچ سے بہہ جائے وہ 7 کے قریب؛ جو چمچ پر تہہ چڑھا دے وہ 20 کے قریب۔ روز کا درمیانہ 11 سے 17۔',
      },
    },
    roman: 'Nihari',
    aliases: ['nihari', 'nehari', 'niharee', 'nahari', 'nihaari', 'curry', 'salan'],
    grams: 7,
    gramsMax: 20,
    confidence: 'medium',
    source: 'LFAC at the floor; KHAN, LABEL Kohinoor and LIT Saakshi at the top; LIT Aga Khan, Mount Holyoke and My Choice Foods in the middle',
  },
  {
    id: 'aloo-gosht',
    category: 'salan',
    text: {
      en: {
        name: 'Aloo gosht, meat and potato curry',
        portion: '1 katori, 150\u00A0g',
        varies: 'Count the potato chunks — each one beyond the usual adds 8 to 16\u00A0g, more than the whole band between these two numbers.',
      },
      ur: {
        name: 'آلو گوشت',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'آلو کے ٹکڑے گن لیں — معمول سے ہر زیادہ ٹکڑا 8 سے 16\u00A0گرام بڑھاتا ہے، جو اِن دونوں نمبروں کے بیچ کی پوری رینج سے زیادہ ہے۔',
      },
    },
    roman: 'Aloo gosht',
    aliases: ['aloo gosht', 'alu gosht', 'aalu gosht', 'aloo ghosht', 'potato meat curry', 'curry', 'salan'],
    grams: 16,
    gramsMax: 17,
    confidence: 'medium',
    source: 'KHAN, LFAC agree within a twentieth',
  },
  {
    id: 'aloo-qeema',
    category: 'salan',
    text: {
      en: {
        name: 'Aloo qeema, mince with potato',
        portion: '1 katori, 150\u00A0g',
        varies: 'How much potato is in it. The mince itself is nearly free; the potato is the whole number.',
      },
      ur: {
        name: 'آلو قیمہ',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'آلو کتنا ہے۔ قیمہ خود تقریباً صفر ہے؛ سارا نمبر آلو کا ہے۔',
      },
    },
    roman: 'Aloo qeema',
    aliases: ['aloo qeema', 'aloo keema', 'alu qeema', 'aalu keema', 'mince with potato', 'curry', 'salan'],
    grams: 12,
    gramsMax: 18,
    confidence: 'low',
    source: 'CALC — no LFAC row, unconfirmed by the Pakistani source',
  },
  {
    id: 'qeema-plain',
    category: 'salan',
    text: {
      en: {
        name: 'Qeema, plain mince',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size and how much onion-tomato masala came with it. The meat is free.',
      },
      ur: {
        name: 'سادہ قیمہ',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کٹوری کا سائز اور ساتھ پیاز ٹماٹر کا مسالہ کتنا آیا۔ گوشت میں کچھ نہیں ہوتا۔',
      },
    },
    roman: 'Qeema',
    aliases: ['qeema', 'keema', 'kheema', 'qeemah', 'mince', 'curry', 'salan'],
    grams: 10,
    gramsMax: null,
    confidence: 'medium',
    source: 'KHAN',
  },
  {
    id: 'aloo-baingan',
    category: 'salan',
    text: {
      en: {
        name: 'Aloo baingan, potato and brinjal',
        portion: '1 katori, 150\u00A0g',
        varies: 'Count the potato pieces. Brinjal is close to free, so the potato share is the entire number, and each extra chunk is worth more than this whole band. No laboratory has ever analysed this dish.',
      },
      ur: {
        name: 'آلو بینگن',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'آلو کے ٹکڑے گن لیں۔ بینگن میں نہ ہونے کے برابر ہے، اس لیے سارا نمبر آلو کا ہے، اور ہر زیادہ ٹکڑا اس پوری رینج سے بڑا ہے۔ اس ڈش کو کسی لیبارٹری نے آج تک ناپا نہیں۔',
      },
    },
    roman: 'Aloo baingan',
    aliases: ['aloo baingan', 'alu baingan', 'aloo bengan', 'aalu baingan', 'brinjal potato', 'curry', 'salan', 'aubergine'],
    grams: 15,
    gramsMax: 18,
    confidence: 'medium',
    source: 'LFAC for the default, CoFID converted for the top, CALC for the floor — CoFID 15-669 is a recipe, not an analysis',
  },
  {
    id: 'aloo-gobhi',
    category: 'salan',
    text: {
      en: {
        name: 'Aloo gobhi, potato and cauliflower',
        portion: '1 katori, 150\u00A0g',
        varies: 'The potato share. Cauliflower is nearly free; half a cup of the measured dish is 16\u00A0g.',
      },
      ur: {
        name: 'آلو گوبھی',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'آلو کا حصہ۔ گوبھی تقریباً صفر ہے؛ ناپی ہوئی ڈش کا آدھا کپ 16\u00A0گرام ہے۔',
      },
    },
    roman: 'Aloo gobhi',
    aliases: ['aloo gobhi', 'aloo gobi', 'alu gobi', 'aalu gobhi', 'cauliflower potato', 'curry', 'salan'],
    grams: 20,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'aloo-bhujia',
    category: 'salan',
    text: {
      en: {
        name: 'Aloo ki bhujia, dry potato',
        portion: 'half a cup, 122\u00A0g',
        varies: 'How much potato. This is potato-dominant and is nearly a starch dish rather than a salan — treat it the way you would treat rice.',
      },
      ur: {
        name: 'آلو کی بھجیا',
        portion: 'آدھا کپ، 122\u00A0گرام',
        varies: 'آلو کتنا ہے۔ اس میں آلو ہی آلو ہے اور یہ سالن سے زیادہ نشاستے کی ڈش ہے — اسے ویسے ہی گنیں جیسے چاول کو گنتے ہیں۔',
      },
    },
    roman: 'Aloo ki bhujia',
    aliases: ['aloo ki bhujia', 'aloo bhujia', 'alu bhujia', 'aalu ki bhujia', 'dry potato', 'curry', 'salan'],
    grams: 22,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'aloo-palak',
    category: 'salan',
    text: {
      en: {
        name: 'Aloo palak, potato and spinach',
        portion: 'half a cup, 118\u00A0g',
        varies: 'The potato share. The spinach is free.',
      },
      ur: {
        name: 'آلو پالک',
        portion: 'آدھا کپ، 118\u00A0گرام',
        varies: 'آلو کا حصہ۔ پالک میں کچھ نہیں ہوتا۔',
      },
    },
    roman: 'Aloo palak',
    aliases: ['aloo palak', 'alu palak', 'aalu palak', 'spinach potato', 'curry', 'salan'],
    grams: 17,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'bhindi',
    category: 'salan',
    text: {
      en: {
        name: 'Bhindi, okra',
        portion: '1 katori, 150\u00A0g',
        varies: 'How much onion-tomato masala came with it. The okra itself moves the number very little.',
      },
      ur: {
        name: 'بھنڈی',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'ساتھ پیاز ٹماٹر کا مسالہ کتنا آیا۔ بھنڈی خود نمبر کو بہت کم ہلاتی ہے۔',
      },
    },
    roman: 'Bhindi',
    aliases: ['bhindi', 'bhindee', 'bindi', 'okra', 'ladyfinger', 'curry', 'salan'],
    grams: 12,
    gramsMax: 18,
    confidence: 'medium',
    source: 'KHAN by difference, CoFID',
  },
  {
    id: 'palak-saag',
    category: 'salan',
    text: {
      en: {
        name: 'Palak or saag, greens',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size only. Greens are reliably low whoever cooks them.',
      },
      ur: {
        name: 'پالک یا ساگ',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'صرف کٹوری کا سائز۔ ساگ کوئی بھی پکائے، بھروسے سے کم ہی رہتا ہے۔',
      },
    },
    roman: 'Palak',
    aliases: ['palak', 'saag', 'sag', 'paalak', 'sarson ka saag', 'spinach', 'greens', 'curry', 'salan'],
    grams: 8,
    gramsMax: 11,
    confidence: 'high',
    source: 'KHAN, CoFID, LFAC sarson ka saag agrees with CoFID',
  },
  {
    id: 'palli-saag',
    category: 'salan',
    text: {
      en: {
        name: 'Palli saag, Sindhi greens with besan',
        portion: '1 cup, 104\u00A0g',
        varies: 'The besan or peanut in it, which is what makes this twice a plain saag.',
      },
      ur: {
        name: 'پلی ساگ (سندھی)',
        portion: '1 کپ، 104\u00A0گرام',
        varies: 'اس میں پڑا بیسن یا مونگ پھلی — یہی اسے سادہ ساگ کا دگنا بناتی ہے۔',
      },
    },
    roman: 'Palli saag',
    aliases: ['palli saag', 'pali saag', 'palli sag', 'saag', 'curry', 'salan'],
    grams: 16,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'baingan-bharta',
    category: 'salan',
    text: {
      en: {
        name: 'Baingan bharta, smoked brinjal',
        portion: '1 katori, 150\u00A0g',
        varies: 'Whether there is potato in it. Brinjal alone is the bottom; potato in the pot is the top.',
      },
      ur: {
        name: 'بینگن کا بھرتا',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'آلو پڑا ہے یا نہیں۔ صرف بینگن ہو تو نچلا سرا؛ ہانڈی میں آلو ہو تو اوپر والا۔',
      },
    },
    roman: 'Baingan bharta',
    aliases: ['baingan bharta', 'bengan bharta', 'baingan ka bharta', 'brinjal bharta', 'curry', 'salan', 'aubergine'],
    grams: 13,
    gramsMax: 20,
    confidence: 'medium',
    source: 'KHAN, CoFID, LFAC sits mid-band',
  },
  {
    id: 'mix-sabzi',
    category: 'salan',
    text: {
      en: {
        name: 'Mixed vegetables',
        portion: '1 katori, 150\u00A0g',
        varies: 'Which vegetables. Potato, peas and carrot carry it; the leafy ones do not.',
      },
      ur: {
        name: 'مکس سبزی',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کون سی سبزیاں ہیں۔ آلو، مٹر اور گاجر نمبر بناتے ہیں؛ پتوں والی نہیں۔',
      },
    },
    roman: 'Mix sabzi',
    aliases: ['mix sabzi', 'mixed sabzi', 'mix sabji', 'mili juli sabzi', 'vegetables', 'curry', 'salan'],
    grams: 14,
    gramsMax: 17,
    confidence: 'medium',
    source: 'KHAN, CoFID',
  },
  {
    id: 'karela',
    category: 'salan',
    text: {
      en: {
        name: 'Karela, bitter gourd, plain or with mince',
        portion: '1 katori, 150\u00A0g',
        varies: 'How much fried onion and masala is in the pot. The gourd is free; the browned onion is not. The mince-stuffed version sits near the top.',
      },
      ur: {
        name: 'کریلا، سادہ یا قیمہ والا',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'ہانڈی میں بھنی پیاز اور مسالہ کتنا ہے۔ کریلے میں کچھ نہیں؛ بھنی ہوئی پیاز میں ہے۔ قیمہ بھرا والا اوپر کے سرے کے قریب ہوتا ہے۔',
      },
    },
    roman: 'Karela',
    aliases: ['karela', 'karaila', 'kerala', 'qeema karela', 'keema karela', 'bitter gourd', 'curry', 'salan'],
    grams: 7,
    gramsMax: 17,
    confidence: 'medium',
    source: 'CoFID at the floor, KHAN and LFAC qeema karela at the top — not averaged',
  },
  {
    id: 'kaddu-gosht',
    category: 'salan',
    text: {
      en: {
        name: 'Kaddu gosht, pumpkin with meat',
        portion: '1 cup, 235\u00A0g',
        varies: 'Bowl size. Pumpkin and meat are both light; the masala is the number.',
      },
      ur: {
        name: 'کدو گوشت',
        portion: '1 کپ، 235\u00A0گرام',
        varies: 'پیالے کا سائز۔ کدو اور گوشت دونوں ہلکے ہیں؛ نمبر مسالے کا ہے۔',
      },
    },
    roman: 'Kaddu gosht',
    aliases: ['kaddu gosht', 'kadu gosht', 'kaddu ghosht', 'pumpkin meat', 'curry', 'salan', 'kadoo'],
    grams: 12,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'loki-sabzi',
    category: 'salan',
    text: {
      en: {
        name: 'Loki ki sabzi, bottle gourd',
        portion: 'half a cup, 120\u00A0g',
        varies: 'Bowl size. This is one of the lightest dishes in the table.',
      },
      ur: {
        name: 'لوکی کی سبزی',
        portion: 'آدھا کپ، 120\u00A0گرام',
        varies: 'پیالے کا سائز۔ یہ اس فہرست کی سب سے ہلکی ڈشوں میں سے ہے۔',
      },
    },
    roman: 'Loki ki sabzi',
    aliases: ['loki ki sabzi', 'lauki ki sabzi', 'loki sabzi', 'ghiya', 'bottle gourd', 'curry', 'salan'],
    grams: 7,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'daal-kadu',
    category: 'salan',
    text: {
      en: {
        name: 'Daal kadu, bottle gourd with chana daal',
        portion: '1 katori, 150\u00A0g',
        varies: 'How much daal rather than gourd. The daal is the whole number.',
      },
      ur: {
        name: 'دال کدو',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'دال کتنی ہے، کدو کتنا۔ سارا نمبر دال کا ہے۔',
      },
    },
    roman: 'Daal kadu',
    aliases: ['daal kadu', 'dal kadu', 'lauki chana daal', 'loki daal', 'daal', 'curry', 'salan'],
    grams: 21,
    gramsMax: null,
    confidence: 'medium',
    source: 'KHAN',
  },
  {
    id: 'kadhi',
    category: 'salan',
    text: {
      en: {
        name: 'Kadhi, besan and yoghurt with pakoray',
        portion: '1 katori, 150\u00A0g',
        varies: 'Count the pakoray. A kadhi served with none is near the floor; a bowl with several is at the top. The besan in the gravy is there either way.',
      },
      ur: {
        name: 'کڑھی، پکوڑوں والی',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'پکوڑے گن لیں۔ بغیر پکوڑوں کی کڑھی سب سے نیچے؛ کئی پکوڑوں والی کٹوری اوپر۔ شوربے کا بیسن بہرحال موجود ہے۔',
      },
    },
    roman: 'Kadhi',
    aliases: ['kadhi', 'karhi', 'kadi', 'khadi', 'kadhi pakora', 'karhi pakora', 'besan kadhi', 'curry', 'salan'],
    grams: 15,
    gramsMax: 25,
    confidence: 'medium',
    source: 'KHAN and LFAC, the only direct measurements — SJSU excluded, its higher figure was a per-cup unit error',
  },
  {
    id: 'koftay',
    category: 'salan',
    text: {
      en: {
        name: 'Koftay, meatball curry',
        portion: '1 katori, 150\u00A0g',
        varies: 'How much binder went into the balls — bread, besan or daal. Meat-only koftay in a thin gravy are the floor.',
      },
      ur: {
        name: 'کوفتے',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کوفتے باندھنے میں کیا گیا اور کتنا — ڈبل روٹی، بیسن یا دال۔ صرف گوشت کے کوفتے پتلے شوربے میں نچلا سرا ہیں۔',
      },
    },
    roman: 'Koftay',
    aliases: ['koftay', 'kofta', 'koftey', 'kofte', 'meatball curry', 'curry', 'salan'],
    grams: 6,
    gramsMax: 12,
    confidence: 'medium',
    source: 'KHAN at the top, LFAC at the floor — not averaged',
  },
  {
    id: 'kabab-chapli',
    category: 'salan',
    text: {
      en: {
        name: 'Chapli kabab',
        portion: '1 kabab, 100\u00A0g',
        varies: 'The maize binder. A kabab made with more flour carries more; one that is nearly all meat carries little.',
      },
      ur: {
        name: 'چپلی کباب',
        portion: '1 کباب، 100\u00A0گرام',
        varies: 'مکئی کے آٹے کا بندھن۔ زیادہ آٹے والا کباب زیادہ رکھتا ہے؛ جو تقریباً سارا گوشت ہو اس میں برائے نام۔',
      },
    },
    roman: 'Chapli kabab',
    aliases: ['chapli kabab', 'chapli kebab', 'chappli kabab', 'chapali kabab', 'kabab', 'curry', 'salan'],
    grams: 14,
    gramsMax: null,
    confidence: 'medium',
    source: 'KHAN — no LFAC row',
  },
  {
    id: 'kabab-shami',
    category: 'salan',
    text: {
      en: {
        name: 'Shami kabab',
        portion: '1 kabab, 76\u00A0g',
        varies: 'The daal share, and piece size. A smaller 60\u00A0g kabab is about 5\u00A0g.',
      },
      ur: {
        name: 'شامی کباب',
        portion: '1 کباب، 76\u00A0گرام',
        varies: 'دال کا حصہ، اور کباب کا سائز۔ چھوٹا 60\u00A0گرام والا کباب تقریباً 5\u00A0گرام ہے۔',
      },
    },
    roman: 'Shami kabab',
    aliases: ['shami kabab', 'shaami kabab', 'shami kebab', 'shami tikki', 'kabab', 'curry', 'salan'],
    grams: 6,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC recommended over an earlier CALC that over-weighted the daal',
  },
  {
    id: 'protein-anchors',
    category: 'salan',
    text: {
      en: {
        name: 'Seekh kabab, tikka, grilled fish or egg',
        portion: '1 ordinary helping',
        varies: 'Nothing here carries carbohydrate. Only a coating, a bun, a chutney or a paratha alongside would, and those are their own rows — do not dose for this.',
      },
      ur: {
        name: 'سیخ کباب، تکہ، مچھلی یا انڈا',
        portion: '1 عام مقدار',
        varies: 'یہاں کسی چیز میں کاربوہائیڈریٹ نہیں۔ صرف کوٹنگ، بن، چٹنی یا ساتھ کا پراٹھا رکھتا ہے، اور وہ اپنی الگ لائنیں ہیں — اس کی ڈوز نہ بنائیں۔',
      },
    },
    roman: 'Seekh kabab',
    aliases: ['seekh kabab', 'sikh kabab', 'seekh kebab', 'tikka', 'grilled fish', 'anda', 'unda', 'egg', 'omelette', 'kabab', 'curry', 'salan', 'boti', 'bihari boti', 'malai boti', 'tikka boti', 'reshmi kabab', 'grilled chicken', 'roast chicken'],
    grams: 0,
    gramsMax: 4,
    confidence: 'high',
    source: 'CoFID, USDA',
  },
  {
    id: 'fish-fried-masala',
    category: 'salan',
    text: {
      en: {
        name: 'Fried fish, masala-coated',
        portion: '1 helping, 150\u00A0g',
        varies: 'The coating, and only the coating. The fish is free; a thicker besan batter is what moves this.',
      },
      ur: {
        name: 'تلی ہوئی مچھلی، مسالے والی',
        portion: '1 ٹکڑا، 150\u00A0گرام',
        varies: 'کوٹنگ، اور صرف کوٹنگ۔ مچھلی میں کچھ نہیں؛ بیسن کا موٹا گھول ہی اس نمبر کو ہلاتا ہے۔',
      },
    },
    roman: 'Fried fish',
    aliases: ['fried fish', 'masala fish', 'machli', 'machhli', 'fish fry', 'curry', 'salan'],
    grams: 7,
    gramsMax: null,
    confidence: 'medium',
    source: 'KHAN, coating only',
  },
  {
    id: 'kaleji',
    category: 'salan',
    text: {
      en: {
        name: 'Kaleji, liver masala',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size, and how much masala came with it.',
      },
      ur: {
        name: 'کلیجی',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کٹوری کا سائز، اور ساتھ مسالہ کتنا آیا۔',
      },
    },
    roman: 'Kaleji',
    aliases: ['kaleji', 'kalayji', 'kalegi', 'liver', 'curry', 'salan'],
    grams: 15,
    gramsMax: null,
    confidence: 'medium',
    source: 'KHAN',
  },
  {
    id: 'mantu',
    category: 'salan',
    text: {
      en: {
        name: 'Mantu, Pashtun meat dumpling',
        portion: '1 dumpling, 36\u00A0g',
        varies: 'The wrapper, which is the only carbohydrate in it — count the dumplings on the plate.',
      },
      ur: {
        name: 'منتو (پشتون)',
        portion: '1 عدد، 36\u00A0گرام',
        varies: 'اوپر کی پٹی، جو اس میں واحد کاربوہائیڈریٹ ہے — پلیٹ میں منتو گن لیں۔',
      },
    },
    roman: 'Mantu',
    aliases: ['mantu', 'mantoo', 'manto', 'dumpling', 'curry', 'salan'],
    grams: 5,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'aushak',
    category: 'salan',
    text: {
      en: {
        name: 'Aushak, Pashtun chive dumpling',
        portion: '1 dumpling, 34\u00A0g',
        varies: 'The wrapper. Count the dumplings on the plate.',
      },
      ur: {
        name: 'آشک (پشتون)',
        portion: '1 عدد، 34\u00A0گرام',
        varies: 'اوپر کی پٹی۔ پلیٹ میں گن لیں۔',
      },
    },
    roman: 'Aushak',
    aliases: ['aushak', 'ashak', 'aushaak', 'dumpling', 'curry', 'salan'],
    grams: 8,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pineapple-chicken',
    category: 'salan',
    text: {
      en: {
        name: 'Pineapple chicken, Bohri',
        portion: '1 cup, 200\u00A0g',
        varies: 'The sweet sauce is the carbohydrate, not the chicken. A sweeter sauce is a bigger number.',
      },
      ur: {
        name: 'پائن ایپل چکن (بوہری)',
        portion: '1 کپ، 200\u00A0گرام',
        varies: 'میٹھی ساس کاربوہائیڈریٹ ہے، چکن نہیں۔ ساس جتنی میٹھی، نمبر اتنا بڑا۔',
      },
    },
    roman: 'Pineapple chicken',
    aliases: ['pineapple chicken', 'ananas chicken', 'continental chicken', 'curry', 'salan'],
    grams: 30,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },

  // ── Snacks and street food (CARBS.md 7) ────────────────────────────────────
  {
    id: 'samosa-cocktail',
    category: 'snack',
    text: {
      en: {
        name: 'Potato samosa, cocktail size',
        portion: '1 cocktail samosa, 25\u00A0g',
        varies: 'Size, and how much of it is potato. Four of these are one large samosa.',
      },
      ur: {
        name: 'آلو سموسہ، کاک ٹیل چھوٹا',
        portion: '1 کاک ٹیل سموسہ، 25\u00A0گرام',
        varies: 'سائز، اور اس میں آلو کتنا ہے۔ چار یہ والے ایک بڑے سموسے کے برابر ہیں۔',
      },
    },
    roman: 'Aloo samosa',
    aliases: ['samosa', 'samoosa', 'sambosa', 'aloo samosa', 'cocktail samosa', 'chota samosa'],
    grams: 8,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, FNDDS, CoFID density',
  },
  {
    id: 'pakora-plate',
    category: 'snack',
    text: {
      en: {
        name: 'Pakora, mixed plate',
        portion: '1 plate, about 100\u00A0g',
        varies: 'The besan-to-vegetable ratio, and which vegetable. Potato pakoray are the top of this band; onion and leafy ones the bottom.',
      },
      ur: {
        name: 'پکوڑے، ملی جلی پلیٹ',
        portion: '1 پلیٹ، تقریباً 100\u00A0گرام',
        varies: 'بیسن اور سبزی کا تناسب، اور سبزی کون سی۔ آلو کے پکوڑے اس رینج کے اوپر والے سرے پر؛ پیاز اور پتوں والے نیچے۔',
      },
    },
    roman: 'Pakora',
    aliases: ['pakora', 'pakoray', 'pakore', 'pakoda', 'bhajia', 'fritters'],
    grams: 16,
    gramsMax: 30,
    confidence: 'medium',
    source: 'FNDDS, CoFID, LFAC aloo and onion pakora both sit inside',
  },
  {
    id: 'pakora-aloo',
    category: 'snack',
    text: {
      en: {
        name: 'Aloo pakora',
        portion: '60\u00A0g of pakoray',
        varies: 'How thick the besan coat is, and how big the potato slices are.',
      },
      ur: {
        name: 'آلو کے پکوڑے',
        portion: '60\u00A0گرام پکوڑے',
        varies: 'بیسن کی تہہ کتنی موٹی ہے، اور آلو کے قتلے کتنے بڑے۔',
      },
    },
    roman: 'Aloo pakora',
    aliases: ['aloo pakora', 'alu pakora', 'potato pakora', 'pakora', 'pakoray'],
    grams: 15,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pakora-onion',
    category: 'snack',
    text: {
      en: {
        name: 'Onion pakora',
        portion: '50\u00A0g of pakoray',
        varies: 'How thick the besan coat is. Onion carries less than potato.',
      },
      ur: {
        name: 'پیاز کے پکوڑے',
        portion: '50\u00A0گرام پکوڑے',
        varies: 'بیسن کی تہہ کتنی موٹی ہے۔ پیاز میں آلو سے کم ہوتا ہے۔',
      },
    },
    roman: 'Pakora',
    aliases: ['onion pakora', 'pyaz pakora', 'piyaz pakora', 'pakora', 'pakoray', 'pyaaz'],
    grams: 11,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'bun-kabab',
    category: 'snack',
    text: {
      en: {
        name: 'Bun kabab',
        portion: '1 bun kabab',
        varies: 'Whether the patty is aloo or shami. An aloo patty is the top; a shami patty the bottom. The bun is about 26\u00A0g of it either way.',
      },
      ur: {
        name: 'بن کباب',
        portion: '1 بن کباب',
        varies: 'پیٹی آلو کی ہے یا شامی۔ آلو والی اوپر کا سرا؛ شامی والی نیچے کا۔ بن دونوں صورتوں میں اس کا تقریباً 26\u00A0گرام ہے۔',
      },
    },
    roman: 'Bun kabab',
    aliases: ['bun kabab', 'bun kebab', 'bun kabaab', 'burger bun kabab', 'kabab'],
    grams: 35,
    gramsMax: 45,
    confidence: 'low',
    source: 'CALC from bun, patty and chutney — no measured value anywhere, unconfirmed by the Pakistani source',
  },
  {
    id: 'chana-chaat',
    category: 'snack',
    text: {
      en: {
        name: 'Chana chaat',
        portion: '1 katori, 150\u00A0g',
        varies: 'The potato in it, and the meethi chutney poured over — the chutney alone adds 5 to 10\u00A0g.',
      },
      ur: {
        name: 'چنا چاٹ',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'اس میں پڑا آلو، اور اوپر ڈلی میٹھی چٹنی — اکیلی چٹنی 5 سے 10\u00A0گرام بڑھا دیتی ہے۔',
      },
    },
    roman: 'Chana chaat',
    aliases: ['chana chaat', 'chana chat', 'channa chaat', 'chanay ki chaat', 'chaat'],
    grams: 35,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC recommended over an earlier component CALC',
  },
  {
    id: 'lobia-chaat',
    category: 'snack',
    text: {
      en: {
        name: 'Lobia chaat',
        portion: '1 cup, 117\u00A0g',
        varies: 'Serving size, and the chutney.',
      },
      ur: {
        name: 'لوبیا چاٹ',
        portion: '1 کپ، 117\u00A0گرام',
        varies: 'مقدار کتنی ہے، اور چٹنی۔',
      },
    },
    roman: 'Lobia chaat',
    aliases: ['lobia chaat', 'lobia chat', 'lubia chaat', 'chaat'],
    grams: 22,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, coherent with USDA lobia',
  },
  {
    id: 'cream-chaat',
    category: 'snack',
    text: {
      en: {
        name: 'Cream chaat',
        portion: 'half a serving, 100\u00A0g',
        varies: 'The cream and sweetener are half the number, the fruit the other half.',
      },
      ur: {
        name: 'کریم چاٹ',
        portion: 'آدھی سرونگ، 100\u00A0گرام',
        varies: 'کریم اور مٹھاس آدھا نمبر ہیں، پھل باقی آدھا۔',
      },
    },
    roman: 'Cream chaat',
    aliases: ['cream chaat', 'cream chat', 'kreem chaat', 'chaat'],
    grams: 30,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'fruit-chaat',
    category: 'snack',
    text: {
      en: {
        name: 'Fruit chaat',
        portion: '1 cup',
        varies: 'Which fruits, how big the cup is, and the sugar sprinkled on. An apple and amrood cup sits near the bottom; a kela and aam cup near the top. Each level spoon of sugar is 4.2\u00A0g on top of that.',
      },
      ur: {
        name: 'فروٹ چاٹ',
        portion: '1 کپ',
        varies: 'کون سے پھل، کپ کتنا بڑا ہے، اور اوپر چھڑکی ہوئی چینی۔ سیب اور امرود والا کپ نیچے کی طرف؛ کیلا اور آم والا اوپر کی طرف۔ ہر ہموار چمچ چینی اس کے علاوہ 4.2\u00A0گرام ہے۔',
      },
    },
    roman: 'Fruit chaat',
    aliases: ['fruit chaat', 'fruit chat', 'phal chaat', 'chaat'],
    grams: 14,
    gramsMax: 36,
    confidence: 'low',
    source: 'CALC from the fruit rows in this table across a 150 to 200\u00A0g cup — no LFAC row, unconfirmed by the Pakistani source',
  },
  {
    id: 'dahi-bhalay',
    category: 'snack',
    text: {
      en: {
        name: 'Dahi bhalay',
        portion: '1 cup, 220\u00A0g',
        varies: 'Whether the dahi was sweetened and how much chutney went on. A thela plate with both is this number.',
      },
      ur: {
        name: 'دہی بھلے',
        portion: '1 کپ، 220\u00A0گرام',
        varies: 'دہی میٹھی کی گئی تھی یا نہیں، اور چٹنی کتنی ڈلی۔ ٹھیلے کی پلیٹ دونوں کے ساتھ یہی نمبر ہے۔',
      },
    },
    roman: 'Dahi bhalay',
    aliases: ['dahi bhalay', 'dahi bhallay', 'dahi bhalla', 'dahi baray', 'dahi vada', 'chaat'],
    grams: 35,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC — the real street serving is bigger than the earlier SJSU plate',
  },
  {
    id: 'gol-gappay-4',
    category: 'snack',
    text: {
      en: {
        name: 'Gol gappay, 4 filled',
        portion: '4 filled puris, 32\u00A0g',
        varies: 'The filling. Chana filling is counted here; meetha pani adds 5 to 10\u00A0g on top of whatever you eat.',
      },
      ur: {
        name: 'گول گپے، 4 بھرے ہوئے',
        portion: '4 بھرے ہوئے گول گپے، 32\u00A0گرام',
        varies: 'بھرائی۔ چنے والی بھرائی اس میں گنی گئی ہے؛ میٹھا پانی جو بھی پئیں اوپر سے 5 سے 10\u00A0گرام اور ڈالتا ہے۔',
      },
    },
    roman: 'Gol gappay',
    aliases: ['gol gappay', 'golgappay', 'gol gappe', 'pani puri', 'paani puri', 'puchka'],
    grams: 19,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC — filled puris, not shells',
  },
  {
    id: 'gol-gappay-6',
    category: 'snack',
    text: {
      en: {
        name: 'Gol gappay, 6 filled',
        portion: '6 filled puris',
        varies: 'The filling, and the meetha pani — the sweet water adds 5 to 10\u00A0g more.',
      },
      ur: {
        name: 'گول گپے، 6 بھرے ہوئے',
        portion: '6 بھرے ہوئے گول گپے',
        varies: 'بھرائی، اور میٹھا پانی — میٹھا پانی 5 سے 10\u00A0گرام اور بڑھا دیتا ہے۔',
      },
    },
    roman: 'Gol gappay',
    aliases: ['gol gappay', 'golgappay', 'gol gappe', 'pani puri', 'paani puri', 'puchka'],
    grams: 28,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CALC scaled to six',
  },
  {
    id: 'bhutta',
    category: 'snack',
    text: {
      en: {
        name: 'Bhutta, corn on the cob',
        portion: '1 cob, 195\u00A0g including the cob',
        varies: 'Cob size. The weight here includes the cob you do not eat.',
      },
      ur: {
        name: 'بھٹا (چھلی)',
        portion: '1 بھٹا، 195\u00A0گرام، ڈنڈی سمیت',
        varies: 'بھٹے کا سائز۔ اس وزن میں اندر کی ڈنڈی بھی شامل ہے جو کھائی نہیں جاتی۔',
      },
    },
    roman: 'Bhutta',
    aliases: ['bhutta', 'bhuta', 'butta', 'corn on the cob', 'makai', 'challi'],
    grams: 22,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'fries-street',
    category: 'snack',
    text: {
      en: {
        name: 'French fries, street cone',
        portion: '1 street cone, about 100\u00A0g',
        varies: 'How full the cone is, and how thick the cut. Thin fries take up more oil and less potato per gram.',
      },
      ur: {
        name: 'فرنچ فرائز، ٹھیلے کا کون',
        portion: 'ٹھیلے کا 1 کون، تقریباً 100\u00A0گرام',
        varies: 'کون کتنا بھرا ہے، اور کٹائی کتنی موٹی۔ پتلے فرائز میں تیل زیادہ چڑھتا ہے اور فی گرام آلو کم ہوتا ہے۔',
      },
    },
    roman: 'French fries',
    aliases: ['french fries', 'fries', 'chips', 'finger chips', 'aloo fries'],
    grams: 19,
    gramsMax: 23,
    confidence: 'medium',
    source: 'FNDDS',
  },
  {
    id: 'fries-franchise',
    category: 'snack',
    text: {
      en: {
        name: 'French fries, franchise medium',
        portion: '1 medium franchise portion',
        varies: 'A franchise medium is two and a half street cones. Size up and it goes up with it.',
      },
      ur: {
        name: 'فرنچ فرائز، فرنچائز میڈیم',
        portion: '1 فرنچائز میڈیم',
        varies: 'فرنچائز کا میڈیم ٹھیلے کے ڈھائی کون ہے۔ سائز بڑھائیں گے تو یہ بھی ساتھ بڑھے گا۔',
      },
    },
    roman: 'French fries',
    aliases: ['french fries', 'fries', 'chips', 'medium fries', 'burger fries'],
    grams: 48,
    gramsMax: null,
    confidence: 'medium',
    source: 'FNDDS',
  },
  {
    id: 'spring-roll',
    category: 'snack',
    text: {
      en: {
        name: 'Spring roll or chicken roll patti',
        portion: '1 roll, 64\u00A0g',
        varies: 'The wrapper. The filling is mostly cabbage or chicken and adds almost nothing.',
      },
      ur: {
        name: 'اسپرنگ رول یا چکن رول پٹی',
        portion: '1 رول، 64\u00A0گرام',
        varies: 'پٹی۔ بھرائی زیادہ تر بند گوبھی یا چکن ہے اور تقریباً کچھ نہیں بڑھاتی۔',
      },
    },
    roman: 'Spring roll',
    aliases: ['spring roll', 'chicken roll', 'roll patti', 'patti roll', 'spring rolls'],
    grams: 17,
    gramsMax: 19,
    confidence: 'medium',
    source: 'FNDDS',
  },
  {
    id: 'kabab-paratha-roll',
    category: 'snack',
    text: {
      en: {
        name: 'Kabab paratha roll',
        portion: '1 roll, 183\u00A0g',
        varies: 'Roll size, and the paratha share. The roll is a paratha delivery vehicle — the kabab inside it is nearly free.',
      },
      ur: {
        name: 'کباب پراٹھا رول',
        portion: '1 رول، 183\u00A0گرام',
        varies: 'رول کا سائز، اور پراٹھے کا حصہ۔ رول اصل میں پراٹھا ہی ہے — اندر کا کباب تقریباً کچھ نہیں۔',
      },
    },
    roman: 'Kabab paratha roll',
    aliases: ['kabab paratha roll', 'paratha roll', 'kabab roll', 'kebab roll', 'roll'],
    grams: 71,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'club-sandwich',
    category: 'snack',
    text: {
      en: {
        name: 'Club sandwich',
        portion: '1 sandwich, 120\u00A0g',
        varies: 'The bread brand and how many slices. The filling barely moves it.',
      },
      ur: {
        name: 'کلب سینڈوچ',
        portion: '1 سینڈوچ، 120\u00A0گرام',
        varies: 'ڈبل روٹی کا برانڈ اور سلائس کتنے۔ بھرائی نمبر کو بمشکل ہلاتی ہے۔',
      },
    },
    roman: 'Club sandwich',
    aliases: ['club sandwich', 'sandwich', 'sandwhich', 'sanwich', 'chicken sandwich'],
    grams: 25,
    gramsMax: 30,
    confidence: 'medium',
    source: 'LFAC, CALC agree',
  },
  {
    id: 'chicken-patties',
    category: 'snack',
    text: {
      en: {
        name: 'Chicken patties, bakery',
        portion: '1 piece, 60\u00A0g',
        varies: 'Bakery size. The pastry is the whole number.',
      },
      ur: {
        name: 'چکن پیٹیز، بیکری والی',
        portion: '1 عدد، 60\u00A0گرام',
        varies: 'بیکری کا سائز۔ سارا نمبر پیسٹری کا ہے۔',
      },
    },
    roman: 'Chicken patties',
    aliases: ['chicken patties', 'chicken patty', 'patties', 'bakery patties', 'puff patties'],
    grams: 13,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'nimco-loose',
    category: 'snack',
    text: {
      en: {
        name: 'Nimco or namkeen, loose by the bowl',
        portion: 'half a cup, 40\u00A0g',
        varies: 'Which mix. Papri- and rice-heavy mixes run higher than a nut-heavy one.',
      },
      ur: {
        name: 'نمکو، کھلی',
        portion: 'آدھا کپ، 40\u00A0گرام',
        varies: 'کون سا مکس ہے۔ پاپڑی اور چاول زیادہ والے مکس مونگ پھلی زیادہ والے سے اوپر رہتے ہیں۔',
      },
    },
    roman: 'Nimco',
    aliases: ['nimco', 'namkeen', 'nimko', 'namkin', 'mixture', 'chevda', 'sev'],
    grams: 14,
    gramsMax: null,
    confidence: 'medium',
    source: 'CoFID chevda',
  },
  {
    id: 'namak-paray',
    category: 'snack',
    text: {
      en: {
        name: 'Namak paray',
        portion: '10 pieces, 18\u00A0g',
        varies: 'Piece size. This figure reads low for fried maida, so treat it as the floor and check the meter.',
      },
      ur: {
        name: 'نمک پارے',
        portion: '10 عدد، 18\u00A0گرام',
        varies: 'ٹکڑے کا سائز۔ تلی ہوئی میدے کی چیز کے حساب سے یہ نمبر کم لگتا ہے، اس لیے اسے کم از کم سمجھیں اور میٹر سے چیک کر لیں۔',
      },
    },
    roman: 'Namak paray',
    aliases: ['namak paray', 'namak pare', 'namakparay', 'nimki', 'shakarparay'],
    grams: 6,
    gramsMax: null,
    confidence: 'low',
    source: 'LFAC — flagged, the implied density is below what fried maida should give',
  },
  {
    id: 'papar-fried',
    category: 'snack',
    text: {
      en: {
        name: 'Papar, fried pulse papad',
        portion: '1 fried papar, 13 to 15\u00A0g',
        varies: 'Finished weight and how much oil it took up. This is the fried pulse kind only — a dry roasted papad or a rice fryum is a different food with no verified value.',
      },
      ur: {
        name: 'پاپڑ، تلا ہوا',
        portion: '1 تلا ہوا پاپڑ، 13 سے 15\u00A0گرام',
        varies: 'تلنے کے بعد کا وزن اور تیل کتنا چڑھا۔ یہ صرف دال والا تلا ہوا پاپڑ ہے — بھنا ہوا پاپڑ یا چاول والا فرائم الگ چیز ہے جس کا کوئی جانچا ہوا نمبر نہیں۔',
      },
    },
    roman: 'Papar',
    aliases: ['papar', 'papad', 'papadum', 'papadam', 'pappar'],
    grams: 3,
    gramsMax: 4,
    confidence: 'medium',
    source: 'CoFID papadums takeaway, converted; CALC. The LFAC row for this food fails arithmetic and is excluded',
  },
  {
    id: 'boondi-raita-chaat',
    category: 'snack',
    text: {
      en: {
        name: 'Boondi raita chaat, Bohri',
        portion: 'half a cup, 122\u00A0g',
        varies: 'How much boondi is in the dahi.',
      },
      ur: {
        name: 'بوندی رائتہ چاٹ (بوہری)',
        portion: 'آدھا کپ، 122\u00A0گرام',
        varies: 'دہی میں بوندی کتنی ہے۔',
      },
    },
    roman: 'Boondi raita chaat',
    aliases: ['boondi raita chaat', 'boondi raita', 'bundi raita', 'raita chaat', 'chaat'],
    grams: 7,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'bajra-fritters',
    category: 'snack',
    text: {
      en: {
        name: 'Bajra fritters, Memon',
        portion: '3 pieces, 36\u00A0g',
        varies: 'Piece size and how many.',
      },
      ur: {
        name: 'باجرے کے پکوڑے (میمنی)',
        portion: '3 عدد، 36\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور کتنے ہیں۔',
      },
    },
    roman: 'Bajra',
    aliases: ['bajra fritters', 'bajra', 'baajra', 'bajray kay pakoray', 'fritters'],
    grams: 12,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'dhokray',
    category: 'snack',
    text: {
      en: {
        name: 'Dhokray, Memon',
        portion: '1 piece, 60\u00A0g',
        varies: 'Piece size.',
      },
      ur: {
        name: 'ڈھوکرے (میمنی)',
        portion: '1 عدد، 60\u00A0گرام',
        varies: 'ٹکڑے کا سائز۔',
      },
    },
    roman: 'Dhokray',
    aliases: ['dhokray', 'dhokra', 'dhokre', 'dhokla'],
    grams: 16,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'khow-suey',
    category: 'snack',
    text: {
      en: {
        name: 'Khow suey, Memon',
        portion: '1 cup noodles with half a cup curry, 300\u00A0g',
        varies: 'The toppings. This number is the noodles and curry alone — the fried chips and papdi on top are extra.',
      },
      ur: {
        name: 'کھاؤ سوئے',
        portion: '1 کپ نوڈلز اور آدھا کپ کری، 300\u00A0گرام',
        varies: 'اوپر ڈالی جانے والی چیزیں۔ یہ نمبر صرف نوڈلز اور کری کا ہے — اوپر کے تلے چپس اور پاپڑی اس سے الگ ہیں۔',
      },
    },
    roman: 'Khow suey',
    aliases: ['khow suey', 'khao suey', 'khowsuey', 'khao suay', 'noodles'],
    grams: 34,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, without chips or papdi',
  },
  {
    id: 'lasan-memon',
    category: 'snack',
    text: {
      en: {
        name: 'Lasan, Memon bajra rofi with raita',
        portion: '1 rofi with half a cup raita, 105\u00A0g',
        varies: 'Rofi size. The 55\u00A0g rofi alone is 38\u00A0g, and it carries the same very-high bajra density flag as the bajra roti — verify with the meter.',
      },
      ur: {
        name: 'لسن (میمنی)',
        portion: '1 روفی، آدھا کپ رائتے کے ساتھ، 105\u00A0گرام',
        varies: 'روفی کا سائز۔ اکیلی 55\u00A0گرام روفی 38\u00A0گرام ہے، اور اس پر وہی باجرے والا بہت اونچے نمبر کا جھنڈا ہے — میٹر سے تصدیق کر لیں۔',
      },
    },
    roman: 'Lasan',
    aliases: ['lasan', 'lasaan', 'bajra rofi', 'rofi'],
    grams: 46,
    gramsMax: null,
    confidence: 'low',
    source: 'LFAC — flagged',
  },
  {
    id: 'malida',
    category: 'sweet',
    text: {
      en: {
        name: 'Malida',
        portion: '1 cup, 100\u00A0g',
        varies: 'Bowl size, and how much sugar and ghee went in.',
      },
      ur: {
        name: 'ملیدہ',
        portion: '1 کپ، 100\u00A0گرام',
        varies: 'پیالے کا سائز، اور چینی اور گھی کتنا گیا۔',
      },
    },
    roman: 'Malida',
    aliases: ['malida', 'maleeda', 'malidah', 'malido'],
    grams: 36,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'lasanyo-bohra',
    category: 'snack',
    text: {
      en: {
        name: 'Bohra lasanyo, chicken lasagna',
        portion: '1 piece, 106\u00A0g',
        varies: 'Piece size. The pasta sheets are the carbohydrate.',
      },
      ur: {
        name: 'بوہری لسانیو',
        portion: '1 عدد، 106\u00A0گرام',
        varies: 'ٹکڑے کا سائز۔ کاربوہائیڈریٹ پاستا کی تہوں کا ہے۔',
      },
    },
    roman: 'Bohra lasanyo',
    aliases: ['bohra lasanyo', 'lasanyo', 'lasagna', 'chicken lasagna', 'lasania'],
    grams: 18,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'popcorn',
    category: 'snack',
    text: {
      en: {
        name: 'Popcorn, popped',
        portion: '24\u00A0g popped, about a large cup',
        varies: 'How much of the tub. Caramel coating would be its own number on top.',
      },
      ur: {
        name: 'پاپ کارن',
        portion: '24\u00A0گرام پاپ کارن، تقریباً 1 بڑا کپ',
        varies: 'ٹب میں سے کتنا کھایا۔ کیریمل کوٹنگ ہو تو وہ اوپر سے اپنا الگ نمبر ہے۔',
      },
    },
    roman: 'Popcorn',
    aliases: ['popcorn', 'pop corn', 'popkarn', 'makai popcorn'],
    grams: 14,
    gramsMax: null,
    confidence: 'high',
    source: 'CoFID',
  },
  {
    id: 'biscuit-sooper',
    category: 'packaged',
    text: {
      en: {
        name: 'Tea biscuit, one Sooper',
        portion: '1 biscuit',
        varies: 'Brand and piece weight, and neither is established — no manufacturer panel for this biscuit has been verified, so this is the weakest number in the table. Weigh a few and use the packaged tea-biscuit row instead if you can.',
      },
      ur: {
        name: 'Sooper بسکٹ',
        portion: '1 بسکٹ',
        varies: 'برانڈ اور فی بسکٹ وزن، اور دونوں پکے نہیں — اس بسکٹ کا کوئی تصدیق شدہ کمپنی پینل نہیں ملا، اس لیے یہ اس فہرست کا سب سے کمزور نمبر ہے۔ چند تول لیں، اور ہو سکے تو پیکٹ والے سادے بسکٹ کی لائن استعمال کریں۔',
      },
    },
    roman: 'Tea biscuits',
    aliases: ['sooper', 'super biscuit', 'tea biscuit', 'biscuit', 'biscuits', 'chai biscuit', 'marie'],
    grams: 4.4,
    gramsMax: null,
    confidence: 'low',
    source: 'LABEL, downgraded to WEAK by the section 20 label audit',
  },
  {
    id: 'biscuit-digestive',
    category: 'packaged',
    text: {
      en: {
        name: 'Digestive biscuit',
        portion: '1 biscuit, 15\u00A0g',
        varies: 'Brand and piece size.',
      },
      ur: {
        name: 'ڈائجسٹو بسکٹ',
        portion: '1 بسکٹ، 15\u00A0گرام',
        varies: 'برانڈ اور ٹکڑے کا سائز۔',
      },
    },
    roman: 'Tea biscuits',
    aliases: ['digestive', 'digestive biscuit', 'biscuit', 'biscuits', 'tea biscuit'],
    grams: 10,
    gramsMax: null,
    confidence: 'medium',
    source: 'CoFID',
  },
  {
    id: 'crisps-packet',
    category: 'packaged',
    text: {
      en: {
        name: 'Crisps, single packet',
        portion: '1 packet, 27\u00A0g',
        varies: 'It is printed on the packet, and the packet beats this row.',
      },
      ur: {
        name: 'چپس کا پیکٹ',
        portion: '1 پیکٹ، 27\u00A0گرام',
        varies: 'یہ پیکٹ پر چھپا ہوتا ہے، اور پیکٹ کا نمبر اس لائن سے بہتر ہے۔',
      },
    },
    roman: 'Crisps packet',
    aliases: ['crisps', 'chips', 'potato chips', 'packet of chips', 'lays', 'slanty'],
    grams: 13,
    gramsMax: 14,
    confidence: 'high',
    source: 'USDA, SJSU',
  },

  // ── Mithai and desserts (CARBS.md 8) ───────────────────────────────────────
  {
    id: 'gulab-jamun',
    category: 'sweet',
    text: {
      en: {
        name: 'Gulab jamun, shop piece',
        portion: '1 piece, 36\u00A0g',
        varies: 'Piece size, and how long it sat in syrup. About half its weight is carbohydrate either way.',
      },
      ur: {
        name: 'گلاب جامن، دکان کا',
        portion: '1 عدد، 36\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور شیرے میں کتنی دیر پڑا رہا۔ دونوں صورتوں میں وزن کا تقریباً آدھا کاربوہائیڈریٹ ہے۔',
      },
    },
    roman: 'Gulab jamun',
    aliases: ['gulab jamun', 'gulaab jamun', 'gulab jaman', 'jamun', 'mithai'],
    grams: 15,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CoFID consistent at more syrup',
  },
  {
    id: 'gulab-jamun-large',
    category: 'sweet',
    text: {
      en: {
        name: 'Gulab jamun, large and syrup-drenched',
        portion: '1 large piece, 50\u00A0g',
        varies: 'How much syrup it is holding. A piece lifted dripping is at the top of this band.',
      },
      ur: {
        name: 'گلاب جامن، بڑا شیرے بھرا',
        portion: '1 بڑا، 50\u00A0گرام',
        varies: 'کتنا شیرا اٹھائے ہوئے ہے۔ جو ٹپکتا ہوا اٹھے وہ اس رینج کے اوپر والے سرے پر ہے۔',
      },
    },
    roman: 'Gulab jamun',
    aliases: ['gulab jamun', 'gulaab jamun', 'gulab jaman', 'jamun', 'mithai'],
    grams: 22,
    gramsMax: 25,
    confidence: 'medium',
    source: 'CoFID, LFAC density',
  },
  {
    id: 'jalebi-large',
    category: 'sweet',
    text: {
      en: {
        name: 'Jalebi, large piece',
        portion: '1 piece, 41\u00A0g, without extra sheera',
        varies: 'The sheera. This is the piece as sold; syrup poured over on top adds 5 to 10\u00A0g more.',
      },
      ur: {
        name: 'جلیبی، بڑی',
        portion: '1 عدد، 41\u00A0گرام، اوپر کے شیرے کے بغیر',
        varies: 'شیرا۔ جیسی بکتی ہے یہ ویسی ہے؛ اوپر سے شیرا ڈلوائیں تو 5 سے 10\u00A0گرام اور۔',
      },
    },
    roman: 'Jalebi',
    aliases: ['jalebi', 'jalaibi', 'jilebi', 'jalebee', 'mithai'],
    grams: 23,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC — the single Pakistani patient-facing source, was an open unknown until it',
  },
  {
    id: 'jalebi-medium',
    category: 'sweet',
    text: {
      en: {
        name: 'Jalebi, medium piece',
        portion: '1 piece, 25 to 30\u00A0g',
        varies: 'Piece size, and the shop. Sugar loads genuinely differ shop to shop; extra sheera adds 5 to 10\u00A0g.',
      },
      ur: {
        name: 'جلیبی، درمیانی',
        portion: '1 عدد، 25 سے 30\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور دکان۔ چینی سچ مچ دکان دکان بدلتی ہے؛ اوپر کا شیرا 5 سے 10\u00A0گرام بڑھاتا ہے۔',
      },
    },
    roman: 'Jalebi',
    aliases: ['jalebi', 'jalaibi', 'jilebi', 'jalebee', 'mithai'],
    grams: 14,
    gramsMax: 17,
    confidence: 'medium',
    source: 'LFAC density, CALC to a smaller piece',
  },
  {
    id: 'barfi',
    category: 'sweet',
    text: {
      en: {
        name: 'Barfi',
        portion: '1 piece, 40\u00A0g',
        varies: 'Piece size. The type of barfi barely changes the density.',
      },
      ur: {
        name: 'برفی',
        portion: '1 ٹکڑا، 40\u00A0گرام',
        varies: 'ٹکڑے کا سائز۔ برفی کی قسم فی گرام حساب کو بمشکل بدلتی ہے۔',
      },
    },
    roman: 'Barfi',
    aliases: ['barfi', 'burfi', 'barfee', 'khoya barfi', 'mithai'],
    grams: 16,
    gramsMax: null,
    confidence: 'high',
    source: 'LFAC, FNDDS agree exactly',
  },
  {
    id: 'laddu',
    category: 'sweet',
    text: {
      en: {
        name: 'Laddu, besan or motichoor',
        portion: '1 small laddu, about 40\u00A0g',
        varies: 'Piece size and how much syrup the boondi soaked up. Sweet-shop laddus run bigger than 40\u00A0g.',
      },
      ur: {
        name: 'لڈو، بیسن یا موتی چور',
        portion: '1 چھوٹا لڈو، تقریباً 40\u00A0گرام',
        varies: 'سائز، اور بوندی نے کتنا شیرا پیا۔ حلوائی کے لڈو 40\u00A0گرام سے بڑے ہوتے ہیں۔',
      },
    },
    roman: 'Laddu',
    aliases: ['laddu', 'ladoo', 'laddoo', 'ladu', 'motichoor', 'mithai'],
    grams: 25,
    gramsMax: 30,
    confidence: 'low',
    source: 'SJSU, WEAK trackers — no LFAC row, unconfirmed by the Pakistani source',
  },
  {
    id: 'rasgulla',
    category: 'sweet',
    text: {
      en: {
        name: 'Rasgulla',
        portion: '1 medium piece',
        varies: 'Whether you drink the syrup or leave it. Squeezed out, it is much less.',
      },
      ur: {
        name: 'رس گلہ',
        portion: '1 درمیانہ عدد',
        varies: 'شیرا پیتے ہیں یا چھوڑ دیتے ہیں۔ نچوڑ لیں تو کہیں کم رہ جاتا ہے۔',
      },
    },
    roman: 'Rasgulla',
    aliases: ['rasgulla', 'rosogulla', 'rasgulley', 'rass gulla', 'mithai'],
    grams: 15,
    gramsMax: null,
    confidence: 'low',
    source: 'SJSU — no LFAC row, unconfirmed by the Pakistani source',
  },
  {
    id: 'ras-malai',
    category: 'sweet',
    text: {
      en: {
        name: 'Ras malai',
        portion: '1 and a half pieces with half a cup of the milk, 117\u00A0g',
        varies: 'How much of the sweet milk you take with it.',
      },
      ur: {
        name: 'رس ملائی',
        portion: 'ڈیڑھ عدد، آدھا کپ دودھ کے ساتھ، 117\u00A0گرام',
        varies: 'ساتھ کا میٹھا دودھ کتنا لیتے ہیں۔',
      },
    },
    roman: 'Ras malai',
    aliases: ['ras malai', 'rasmalai', 'ras malaai', 'rasmalaai', 'mithai'],
    grams: 16,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'sewaiyan-plain',
    category: 'sweet',
    text: {
      en: {
        name: 'Sewaiyan, boiled without milk',
        portion: 'half a bowl, 56\u00A0g',
        varies: 'Bowl size and sugar. Three preparations of sewaiyan have three real densities — do not blend them.',
      },
      ur: {
        name: 'سویاں، ابلی ہوئی بغیر دودھ',
        portion: 'آدھا پیالہ، 56\u00A0گرام',
        varies: 'پیالے کا سائز اور چینی۔ سویوں کی تین ترکیبوں کے تین سچ مچ الگ نمبر ہیں — انہیں آپس میں نہ ملائیں۔',
      },
    },
    roman: 'Sewaiyan',
    aliases: ['sewaiyan', 'sewayian', 'siwaiyan', 'seviyan', 'vermicelli', 'mithai'],
    grams: 18,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'sewaiyan-milky',
    category: 'sweet',
    text: {
      en: {
        name: 'Sewaiyan, milky',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size, the sugar, and how much milk was reduced into it.',
      },
      ur: {
        name: 'دودھ والی سویاں',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'پیالے کا سائز، چینی، اور دودھ کتنا پکا کر اس میں اتارا گیا۔',
      },
    },
    roman: 'Sewaiyan',
    aliases: ['sewaiyan', 'sewayian', 'siwaiyan', 'seviyan', 'doodh sewaiyan', 'vermicelli', 'mithai'],
    grams: 30,
    gramsMax: null,
    confidence: 'medium',
    source: 'CoFID',
  },
  {
    id: 'sayun-sindhi',
    category: 'sweet',
    text: {
      en: {
        name: 'Sindhi sayun, dry with ghee and sugar',
        portion: 'half a cup, 68\u00A0g',
        varies: 'Bowl size and sugar. This is the dry preparation and is twice the density of the milky one.',
      },
      ur: {
        name: 'سندھی سیوں، گھی شکر والی',
        portion: 'آدھا کپ، 68\u00A0گرام',
        varies: 'پیالے کا سائز اور چینی۔ یہ خشک ترکیب ہے اور فی گرام دودھ والی کی دگنی ہے۔',
      },
    },
    roman: 'Sindhi sayun',
    aliases: ['sindhi sayun', 'sayun', 'sayoon', 'dry sewaiyan', 'sewaiyan', 'mithai'],
    grams: 42,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'sheer-khurma',
    category: 'sweet',
    text: {
      en: {
        name: 'Sheer khurma',
        portion: '1 katori, 150\u00A0g',
        varies: 'How rich the Eid pot was — dates, nuts and reduced milk all add. A smaller three-quarter cup is 46\u00A0g.',
      },
      ur: {
        name: 'شیر خرما',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'عید کی دیگچی کتنی بھاری بنی — کھجور، میوہ اور گاڑھا کیا دودھ سب بڑھاتے ہیں۔ چھوٹا پون کپ 46\u00A0گرام ہے۔',
      },
    },
    roman: 'Sheer khurma',
    aliases: ['sheer khurma', 'sheer khorma', 'shir khurma', 'sheerkhurma', 'mithai'],
    grams: 55,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC recommended over an earlier component CALC',
  },
  {
    id: 'sooji-halwa-breakfast',
    category: 'sweet',
    text: {
      en: {
        name: 'Sooji ka halwa, halwa-puri shop',
        portion: '1 small serving, 88\u00A0g',
        varies: 'The sugar-to-sooji ratio, and it is a genuine twofold spread. Breakfast halwa served with puri is this row; dawat halwa is the other one, at nearly double.',
      },
      ur: {
        name: 'سوجی کا حلوہ، ناشتے والا',
        portion: '1 چھوٹا حصہ، 88\u00A0گرام',
        varies: 'چینی اور سوجی کا تناسب، اور فرق سچ مچ دگنا ہے۔ پوری کے ساتھ ملنے والا ناشتے کا حلوہ یہ والا ہے؛ دعوت والا دوسری لائن ہے، تقریباً دگنے پر۔',
      },
    },
    roman: 'Sooji ka halwa',
    aliases: ['sooji ka halwa', 'suji ka halwa', 'sooji halwa', 'suji halwa', 'halwa', 'mithai'],
    grams: 23,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC breakfast halwa',
  },
  {
    id: 'sooji-halwa-dessert',
    category: 'sweet',
    text: {
      en: {
        name: 'Sooji ka halwa, dessert or dawat',
        portion: '1 small serving, 88\u00A0g',
        varies: 'The sugar-to-sooji ratio. Glossy, dense and very sweet is this row; the paler breakfast halwa is half of it.',
      },
      ur: {
        name: 'سوجی کا حلوہ، دعوت والا',
        portion: '1 چھوٹا حصہ، 88\u00A0گرام',
        varies: 'چینی اور سوجی کا تناسب۔ چمکدار، ٹھوس اور بہت میٹھا یہ والا ہے؛ پھیکا ناشتے والا اس کا آدھا ہے۔',
      },
    },
    roman: 'Sooji ka halwa',
    aliases: ['sooji ka halwa', 'suji ka halwa', 'sooji halwa', 'suji halwa', 'halwa', 'mithai'],
    grams: 43,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC dessert halwa, CoFID agrees',
  },
  {
    id: 'gajar-halwa',
    category: 'sweet',
    text: {
      en: {
        name: 'Gajar ka halwa, half cup',
        portion: 'half a cup, 102\u00A0g',
        varies: 'How much khoya and sugar. Carrot is the smaller half of this number.',
      },
      ur: {
        name: 'گاجر کا حلوہ، آدھا کپ',
        portion: 'آدھا کپ، 102\u00A0گرام',
        varies: 'کھویا اور چینی کتنی۔ گاجر اس نمبر کا چھوٹا حصہ ہے۔',
      },
    },
    roman: 'Gajar ka halwa',
    aliases: ['gajar ka halwa', 'gajar halwa', 'gaajar ka halwa', 'carrot halwa', 'halwa', 'mithai'],
    grams: 44,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CoFID agree exactly',
  },
  {
    id: 'gajar-halwa-spoons',
    category: 'sweet',
    text: {
      en: {
        name: 'Gajar ka halwa, two heaped tablespoons',
        portion: '2 heaped tablespoons',
        varies: 'How heaped the spoon is, and how much khoya and sugar the batch carried.',
      },
      ur: {
        name: 'گاجر کا حلوہ، 2 بھرے چمچ',
        portion: '2 بھرے چمچ',
        varies: 'چمچ کتنا بھرا ہے، اور دیگچی میں کھویا اور چینی کتنی گئی۔',
      },
    },
    roman: 'Gajar ka halwa',
    aliases: ['gajar ka halwa', 'gajar halwa', 'gaajar ka halwa', 'carrot halwa', 'halwa', 'mithai'],
    grams: 14,
    gramsMax: 22,
    confidence: 'medium',
    source: 'LFAC, CoFID density',
  },
  {
    id: 'petha-halwa',
    category: 'sweet',
    text: {
      en: {
        name: 'Petha halwa',
        portion: 'half a cup, 114\u00A0g',
        varies: 'Serving size and sugar.',
      },
      ur: {
        name: 'پیٹھے کا حلوہ',
        portion: 'آدھا کپ، 114\u00A0گرام',
        varies: 'مقدار کا سائز اور چینی۔',
      },
    },
    roman: 'Petha halwa',
    aliases: ['petha halwa', 'peta halwa', 'petha', 'halwa', 'mithai'],
    grams: 28,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'daal-halwa',
    category: 'sweet',
    text: {
      en: {
        name: 'Daal ka halwa',
        portion: 'half a cup, 113\u00A0g',
        varies: 'Serving size, and the sugar and ghee.',
      },
      ur: {
        name: 'دال کا حلوہ',
        portion: 'آدھا کپ، 113\u00A0گرام',
        varies: 'مقدار کا سائز، اور چینی اور گھی۔',
      },
    },
    roman: 'Daal halwa',
    aliases: ['daal halwa', 'dal halwa', 'daal ka halwa', 'moong daal halwa', 'halwa', 'mithai'],
    grams: 33,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'malpua',
    category: 'sweet',
    text: {
      en: {
        name: 'Malpua',
        portion: '1 piece, 46\u00A0g',
        varies: 'Piece size, and how much syrup it soaked.',
      },
      ur: {
        name: 'مال پوا',
        portion: '1 عدد، 46\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور کتنا شیرا پیا۔',
      },
    },
    roman: 'Malpua',
    aliases: ['malpua', 'malpuwa', 'malpura', 'mithai'],
    grams: 20,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'rabri',
    category: 'sweet',
    text: {
      en: {
        name: 'Rabri',
        portion: 'half a cup, 124\u00A0g',
        varies: 'Serving size, and how far the milk was reduced.',
      },
      ur: {
        name: 'ربڑی',
        portion: 'آدھا کپ، 124\u00A0گرام',
        varies: 'مقدار کا سائز، اور دودھ کتنا پکا کر گاڑھا کیا گیا۔',
      },
    },
    roman: 'Rabri',
    aliases: ['rabri', 'rabdi', 'rabari', 'mithai'],
    grams: 40,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'pinni',
    category: 'sweet',
    text: {
      en: {
        name: 'Pinni',
        portion: '1 piece, 38\u00A0g',
        varies: 'Piece size, and the gur or sugar in it.',
      },
      ur: {
        name: 'پنی',
        portion: '1 عدد، 38\u00A0گرام',
        varies: 'ٹکڑے کا سائز، اور اندر کا گڑ یا چینی۔',
      },
    },
    roman: 'Pinni',
    aliases: ['pinni', 'panjiri pinni', 'pinnee', 'mithai'],
    grams: 15,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'kaju-katli',
    category: 'sweet',
    text: {
      en: {
        name: 'Kaju katli',
        portion: '1 piece, 9\u00A0g',
        varies: 'Piece size. These are small, and it is easy to eat six.',
      },
      ur: {
        name: 'کاجو کتلی',
        portion: '1 ٹکڑا، 9\u00A0گرام',
        varies: 'ٹکڑے کا سائز۔ یہ چھوٹی ہوتی ہیں، اور چھ کھا جانا آسان ہے۔',
      },
    },
    roman: 'Kaju katli',
    aliases: ['kaju katli', 'kaju barfi', 'kaaju katli', 'katli', 'mithai'],
    grams: 5,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'shahi-tukray',
    category: 'sweet',
    text: {
      en: {
        name: 'Shahi tukray, double ka meetha',
        portion: '1 piece, 88\u00A0g, with 2 tablespoons of the milk sauce',
        varies: 'Piece size, and how much syrup and sauce came with it.',
      },
      ur: {
        name: 'شاہی ٹکڑے (ڈبل کا میٹھا)',
        portion: '1 ٹکڑا، 88\u00A0گرام، ساتھ 2 بڑے چمچ میٹھا دودھ',
        varies: 'ٹکڑے کا سائز، اور ساتھ شیرا اور میٹھا دودھ کتنا آیا۔',
      },
    },
    roman: 'Double ka meetha',
    aliases: ['double ka meetha', 'shahi tukray', 'shahi tukda', 'shahi tukre', 'mithai'],
    grams: 25,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'lab-e-shireen',
    category: 'sweet',
    text: {
      en: {
        name: 'Lab-e-shireen',
        portion: '1 cup, 243\u00A0g',
        varies: 'Bowl size, and how much jelly, cream and custard the batch carried.',
      },
      ur: {
        name: 'لب شیریں',
        portion: '1 کپ، 243\u00A0گرام',
        varies: 'پیالے کا سائز، اور دیگچی میں جیلی، کریم اور کسٹرڈ کتنا گیا۔',
      },
    },
    roman: 'Lab-e-shireen',
    aliases: ['lab e shireen', 'lab-e-shireen', 'labeshireen', 'shireen', 'mithai'],
    grams: 51,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'gur-papri',
    category: 'sweet',
    text: {
      en: {
        name: 'Gur papri',
        portion: '4 pieces, 76\u00A0g',
        varies: 'DOUBTED, and that is why this row is marked. The source prints it as three-quarters carbohydrate by weight — but gur papri is made with ghee, and no sweet carrying that much fat can be 75 per cent carbohydrate. Every comparable sweet in the same book sits at 40 to 43. Treat this as an upper bound and weigh your own if you eat it often.',
      },
      ur: {
        name: 'گڑ پاپڑی',
        portion: '4 ٹکڑے، 76\u00A0گرام',
        varies: 'یہ نمبر مشکوک ہے، اسی لیے اس لائن پر نشان ہے۔ ذریعہ اسے وزن کا تین چوتھائی کاربوہائیڈریٹ چھاپتا ہے — مگر گڑ پاپڑی گھی سے بنتی ہے، اور اتنی چکنائی والی کوئی مٹھائی 75 فیصد کاربوہائیڈریٹ نہیں ہو سکتی۔ اسی کتاب کی ہر ملتی جلتی مٹھائی 40 سے 43 پر بیٹھتی ہے۔ اسے اوپر کی حد سمجھیں، اور اکثر کھاتے ہوں تو اپنی تول لیں۔',
      },
    },
    roman: 'Gur papri',
    aliases: ['gur papri', 'gur papdi', 'gud papri', 'papri', 'mithai'],
    grams: 57,
    gramsMax: null,
    confidence: 'low',
    source: 'LFAC, coherent with the gur figure',
  },
  {
    id: 'sohan-halwa-50g',
    category: 'sweet',
    text: {
      en: {
        name: 'Sohan halwa, 50\u00A0g piece',
        portion: '1 piece, 50\u00A0g',
        varies: 'The ghee and nut share. A ghee-light Multani sohan may run half again as high, so dose cautiously and verify with the meter.',
      },
      ur: {
        name: 'سوہن حلوہ، 50\u00A0گرام ٹکڑا',
        portion: '1 ٹکڑا، 50\u00A0گرام',
        varies: 'گھی اور میوے کا حصہ۔ کم گھی والا ملتانی سوہن اس سے ڈیڑھ گنا تک ہو سکتا ہے، اس لیے ڈوز محتاط رکھیں اور میٹر سے تصدیق کریں۔',
      },
    },
    roman: 'Sohan halwa',
    aliases: ['sohan halwa', 'sohan halva', 'suhan halwa', 'habshi sohan', 'halwa', 'mithai'],
    grams: 20,
    gramsMax: null,
    confidence: 'low',
    source: 'LFAC recommended as the default, LABEL-EST Hafiz as the upper bound — not averaged',
  },
  {
    id: 'sohan-halwa-25g',
    category: 'sweet',
    text: {
      en: {
        name: 'Sohan halwa, 25\u00A0g piece',
        portion: '1 small piece, 25\u00A0g',
        varies: 'The ghee and nut share, across a range of 40 to 60\u00A0g per 100. Dose cautiously and verify with the meter.',
      },
      ur: {
        name: 'سوہن حلوہ، 25\u00A0گرام چھوٹا ٹکڑا',
        portion: '1 چھوٹا ٹکڑا، 25\u00A0گرام',
        varies: 'گھی اور میوے کا حصہ، ہر 100\u00A0گرام پر 40 سے 60\u00A0گرام کی رینج میں۔ ڈوز محتاط رکھیں اور میٹر سے تصدیق کریں۔',
      },
    },
    roman: 'Sohan halwa',
    aliases: ['sohan halwa', 'sohan halva', 'suhan halwa', 'halwa', 'mithai'],
    grams: 10,
    gramsMax: 15,
    confidence: 'low',
    source: 'LFAC and LABEL-EST Hafiz, the two ends kept apart',
  },
  {
    id: 'kulfi',
    category: 'sweet',
    text: {
      en: {
        name: 'Kulfi',
        portion: '1 kulfi, 74\u00A0g',
        varies: 'Size and recipe. The typical band is 15 to 20\u00A0g; Pakistani khoya or condensed-milk kulfi sits at the top of it, a UK-style one at the bottom.',
      },
      ur: {
        name: 'قلفی',
        portion: '1 قلفی، 74\u00A0گرام',
        varies: 'سائز اور ترکیب۔ عام رینج 15 سے 20\u00A0گرام ہے؛ کھوئے یا کنڈینسڈ ملک والی پاکستانی قلفی اس کے اوپر والے سرے پر، برطانوی طرز کی نیچے۔',
      },
    },
    roman: 'Kulfi',
    aliases: ['kulfi', 'qulfi', 'kulfee', 'malai kulfi', 'ice cream'],
    grams: 18,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC recommended over the CoFID UK-recipe floor',
  },
  {
    id: 'ice-cream-scoop',
    category: 'sweet',
    text: {
      en: {
        name: 'Ice cream, vanilla scoop',
        portion: '1 scoop, 66\u00A0g',
        varies: 'Scoop size. Sauces and cones are their own numbers.',
      },
      ur: {
        name: 'آئس کریم، ونیلا اسکوپ',
        portion: '1 اسکوپ، 66\u00A0گرام',
        varies: 'اسکوپ کا سائز۔ ساس اور کون اپنے الگ نمبر ہیں۔',
      },
    },
    roman: 'Ice cream',
    aliases: ['ice cream', 'icecream', 'vanilla ice cream', 'aiskreem', 'scoop'],
    grams: 16,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'custard',
    category: 'sweet',
    text: {
      en: {
        name: 'Custard',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size, and whether fruit was added.',
      },
      ur: {
        name: 'کسٹرڈ',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کٹوری کا سائز، اور پھل ڈلا ہے یا نہیں۔',
      },
    },
    roman: 'Custard',
    aliases: ['custard', 'kustard', 'custerd', 'fruit custard'],
    grams: 24,
    gramsMax: null,
    confidence: 'medium',
    source: 'CoFID',
  },
  {
    id: 'jelly',
    category: 'sweet',
    text: {
      en: {
        name: 'Jelly',
        portion: '1 serving, 120\u00A0g',
        varies: 'Serving size. Sugar-free jelly is a different product entirely.',
      },
      ur: {
        name: 'جیلی',
        portion: '1 سرونگ، 120\u00A0گرام',
        varies: 'مقدار کا سائز۔ شوگر فری جیلی بالکل الگ چیز ہے۔',
      },
    },
    roman: 'Jelly',
    aliases: ['jelly', 'jello', 'jeli', 'jelly dessert'],
    grams: 18,
    gramsMax: null,
    confidence: 'medium',
    source: 'CoFID',
  },
  {
    id: 'falooda-cup',
    category: 'sweet',
    text: {
      en: {
        name: 'Falooda, cup',
        portion: '1 cup, 248\u00A0g',
        varies: 'The shop recipe — syrup, sewaiyan, ice cream and basil seeds all sit in the same glass.',
      },
      ur: {
        name: 'فالودہ، کپ',
        portion: '1 کپ، 248\u00A0گرام',
        varies: 'دکان کی ترکیب — شربت، سویاں، آئس کریم اور تخم ملنگا سب اسی گلاس میں ہیں۔',
      },
    },
    roman: 'Falooda',
    aliases: ['falooda', 'faluda', 'faloodah', 'falooda ice cream'],
    grams: 56,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'falooda-glass',
    category: 'sweet',
    text: {
      en: {
        name: 'Falooda, large glass',
        portion: '1 large glass, 300\u00A0ml',
        varies: 'Glass size and the shop recipe.',
      },
      ur: {
        name: 'فالودہ، بڑا گلاس',
        portion: '1 بڑا گلاس، 300\u00A0ملی لیٹر',
        varies: 'گلاس کا سائز اور دکان کی ترکیب۔',
      },
    },
    roman: 'Falooda',
    aliases: ['falooda', 'faluda', 'faloodah', 'bara falooda'],
    grams: 68,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, CALC scaled to a 300\u00A0ml glass',
  },
  {
    id: 'sugar-tsp-level',
    category: 'sweet',
    text: {
      en: {
        name: 'Sugar, one level teaspoon',
        portion: '1 level teaspoon',
        varies: 'Whether the spoon is truly level. A heaped one is nearer 6\u00A0g.',
      },
      ur: {
        name: 'چینی، لیول چائے کا چمچ',
        portion: '1 لیول چائے کا چمچ',
        varies: 'چمچ واقعی لیول ہے یا نہیں۔ بھرا ہوا 6\u00A0گرام کے قریب ہوتا ہے۔',
      },
    },
    roman: 'Cheeni',
    aliases: ['cheeni', 'chini', 'sugar', 'shakar', 'chamach cheeni'],
    grams: 4.2,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'sugar-tsp-heaped',
    category: 'sweet',
    text: {
      en: {
        name: 'Sugar, one heaped teaspoon',
        portion: '1 heaped teaspoon',
        varies: 'How heaped. This is the spoon most people actually use, and it is 40 per cent more than a level one.',
      },
      ur: {
        name: 'چینی، بھرا ہوا چائے کا چمچ',
        portion: '1 بھرا ہوا چائے کا چمچ',
        varies: 'کتنا بھرا ہوا۔ زیادہ تر لوگ اصل میں یہی چمچ لیتے ہیں، اور یہ لیول سے 40 فیصد زیادہ ہے۔',
      },
    },
    roman: 'Cheeni',
    aliases: ['cheeni', 'chini', 'sugar', 'shakar', 'heaped sugar'],
    grams: 6,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'sugar-tbsp',
    category: 'sweet',
    text: {
      en: {
        name: 'Sugar, one tablespoon',
        portion: '1 tablespoon',
        varies: null,
      },
      ur: {
        name: 'چینی، کھانے کا بڑا چمچ',
        portion: '1 کھانے کا بڑا چمچ',
        varies: null,
      },
    },
    roman: 'Cheeni',
    aliases: ['cheeni', 'chini', 'sugar', 'shakar', 'bara chamach cheeni'],
    grams: 12.5,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'gur',
    category: 'sweet',
    text: {
      en: {
        name: 'Gur, jaggery lump',
        portion: '1 lump, 15\u00A0g',
        varies: 'Moisture. Gur is nearly all sugar — roughly 85 to 95\u00A0g per 100 depending on how dry the lump is — so weight is the whole answer.',
      },
      ur: {
        name: 'گڑ کی ڈلی',
        portion: '1 ڈلی، 15\u00A0گرام',
        varies: 'نمی۔ گڑ تقریباً پوری چینی ہی ہے — ہر 100\u00A0گرام میں تقریباً 85 سے 95\u00A0گرام، ڈلی کتنی خشک ہے اس پر منحصر — اس لیے سارا جواب وزن ہے۔',
      },
    },
    roman: 'Gur',
    aliases: ['gur', 'gud', 'jaggery', 'gurr', 'shakar gur'],
    grams: 13,
    gramsMax: null,
    confidence: 'medium',
    source: 'NIN, Indian Food Composition Tables 2017 jaggery row, 84.87 per 100 as eaten',
  },
  {
    id: 'honey',
    category: 'sweet',
    text: {
      en: {
        name: 'Honey, one tablespoon',
        portion: '1 tablespoon, 21\u00A0g',
        varies: null,
      },
      ur: {
        name: 'شہد',
        portion: '1 بڑا چمچ، 21\u00A0گرام',
        varies: null,
      },
    },
    roman: 'Honey',
    aliases: ['honey', 'shehad', 'shahad', 'sheheed'],
    grams: 17,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'jam-murabba',
    category: 'sweet',
    text: {
      en: {
        name: 'Jam or murabba, one tablespoon',
        portion: '1 tablespoon',
        varies: null,
      },
      ur: {
        name: 'جیم یا مربہ',
        portion: '1 بڑا چمچ',
        varies: null,
      },
    },
    roman: 'Murabba',
    aliases: ['murabba', 'muraba', 'jam', 'jaam', 'marmalade'],
    grams: 14,
    gramsMax: 15,
    confidence: 'medium',
    source: 'USDA',
  },

  // ── Chai, the rest of the grid (CARBS.md 9.1) ──────────────────────────────
  {
    id: 'chai-150-0',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, small cup, no sugar',
        portion: '1 Pakistani cup, 150\u00A0ml',
        varies: 'The milk is the whole number here. Half milk is assumed; a milkier cup is higher.',
      },
      ur: {
        name: 'چائے، پیالی، بغیر چینی',
        portion: '1 پیالی، 150\u00A0ملی لیٹر',
        varies: 'یہاں سارا نمبر دودھ کا ہے۔ آدھا دودھ مان کر چلا گیا ہے؛ زیادہ دودھ والی پیالی زیادہ ہو گی۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'pheeki chai', 'chae'],
    grams: 4,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at two cells of the grid',
  },
  {
    id: 'chai-150-3',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, small cup, 3 sugars',
        portion: '1 Pakistani cup, 150\u00A0ml',
        varies: 'Whether the three spoons were level or heaped. Heaped, this is nearer 22\u00A0g.',
      },
      ur: {
        name: 'چائے، پیالی، 3 چمچ چینی',
        portion: '1 پیالی، 150\u00A0ملی لیٹر',
        varies: 'تین چمچ لیول تھے یا بھرے ہوئے۔ بھرے ہوں تو یہ 22\u00A0گرام کے قریب ہے۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'meethi chai', 'chae'],
    grams: 16,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at two cells of the grid',
  },
  {
    id: 'chai-200-0',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, mug, no sugar',
        portion: '1 standard mug, 200\u00A0ml',
        varies: 'The milk only. Tea itself is zero.',
      },
      ur: {
        name: 'چائے، مگ، بغیر چینی',
        portion: '1 مگ، 200\u00A0ملی لیٹر',
        varies: 'صرف دودھ۔ چائے خود صفر ہے۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'pheeki chai', 'mug of chai', 'chae'],
    grams: 5,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at two cells of the grid',
  },
  {
    id: 'chai-200-1',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, mug, 1 sugar',
        portion: '1 standard mug, 200\u00A0ml',
        varies: 'Level or heaped spoon. The book measured this cup at 10\u00A0g, one above the grid.',
      },
      ur: {
        name: 'چائے، مگ، 1 چمچ چینی',
        portion: '1 مگ، 200\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھا یا بھرا ہوا۔ کتاب نے یہ کپ 10\u00A0گرام ناپا، جدول سے ایک اوپر۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'mug of chai', 'chae'],
    grams: 9,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at this cell',
  },
  {
    id: 'chai-200-3',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, mug, 3 sugars',
        portion: '1 standard mug, 200\u00A0ml',
        varies: 'Whether the spoons were level or heaped. Three heaped spoons are nearer 23\u00A0g.',
      },
      ur: {
        name: 'چائے، مگ، 3 چمچ چینی',
        portion: '1 مگ، 200\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھے یا بھرے۔ تین بھرے چمچ 23\u00A0گرام کے قریب ہیں۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'meethi chai', 'mug of chai', 'chae'],
    grams: 18,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at two cells of the grid',
  },
  {
    id: 'chai-250-0',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, large mug, no sugar',
        portion: '1 large mug, 250\u00A0ml',
        varies: 'The milk only.',
      },
      ur: {
        name: 'چائے، بڑا مگ، بغیر چینی',
        portion: '1 بڑا مگ، 250\u00A0ملی لیٹر',
        varies: 'صرف دودھ۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'pheeki chai', 'large chai', 'chae'],
    grams: 6,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },
  {
    id: 'chai-250-1',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, large mug, 1 sugar',
        portion: '1 large mug, 250\u00A0ml',
        varies: 'Level or heaped spoon.',
      },
      ur: {
        name: 'چائے، بڑا مگ، 1 چمچ چینی',
        portion: '1 بڑا مگ، 250\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھا یا بھرا ہوا۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'large chai', 'chae'],
    grams: 11,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },
  {
    id: 'chai-250-3',
    category: 'drink',
    text: {
      en: {
        name: 'Tea with milk, large mug, 3 sugars',
        portion: '1 large mug, 250\u00A0ml',
        varies: 'Level or heaped spoons. Three heaped ones add about 5\u00A0g more.',
      },
      ur: {
        name: 'چائے، بڑا مگ، 3 چمچ چینی',
        portion: '1 بڑا مگ، 250\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھے یا بھرے۔ تین بھرے تقریباً 5\u00A0گرام اور بڑھا دیتے ہیں۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaa', 'chaye', 'tea', 'doodh wali chai', 'meethi chai', 'large chai', 'chae'],
    grams: 19,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },
  {
    id: 'patti-150-0',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, small cup, no sugar',
        portion: '1 Pakistani cup, 150\u00A0ml',
        varies: 'It is all milk and no water, which is why an unsweetened doodh patti is twice an unsweetened chai.',
      },
      ur: {
        name: 'دودھ پتی، پیالی، بغیر چینی',
        portion: '1 پیالی، 150\u00A0ملی لیٹر',
        varies: 'یہ ساری دودھ ہے، پانی بالکل نہیں — اسی لیے بغیر چینی کی دودھ پتی بغیر چینی کی چائے سے دگنی ہے۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 8,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at 230\u00A0ml unsweetened',
  },
  {
    id: 'patti-150-1',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, small cup, 1 sugar',
        portion: '1 Pakistani cup, 150\u00A0ml',
        varies: 'Level or heaped spoon.',
      },
      ur: {
        name: 'دودھ پتی، پیالی، 1 چمچ چینی',
        portion: '1 پیالی، 150\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھا یا بھرا ہوا۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 12,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at 230\u00A0ml unsweetened',
  },
  {
    id: 'patti-150-2',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, small cup, 2 sugars',
        portion: '1 Pakistani cup, 150\u00A0ml',
        varies: 'Level or heaped spoons. Heaped, add about 4\u00A0g.',
      },
      ur: {
        name: 'دودھ پتی، پیالی، 2 چمچ چینی',
        portion: '1 پیالی، 150\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھے یا بھرے۔ بھرے ہوں تو تقریباً 4\u00A0گرام اور۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 16,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at 230\u00A0ml unsweetened',
  },
  {
    id: 'patti-150-3',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, small cup, 3 sugars',
        portion: '1 Pakistani cup, 150\u00A0ml',
        varies: 'Level or heaped spoons. Heaped, add about 5\u00A0g.',
      },
      ur: {
        name: 'دودھ پتی، پیالی، 3 چمچ چینی',
        portion: '1 پیالی، 150\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھے یا بھرے۔ بھرے ہوں تو تقریباً 5\u00A0گرام اور۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 20,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at 230\u00A0ml unsweetened',
  },
  {
    id: 'patti-200-0',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, mug, no sugar',
        portion: '1 standard mug, 200\u00A0ml',
        varies: 'All milk. The book measured a 230\u00A0ml unsweetened patti at 10\u00A0g, which is this cell.',
      },
      ur: {
        name: 'دودھ پتی، مگ، بغیر چینی',
        portion: '1 مگ، 200\u00A0ملی لیٹر',
        varies: 'ساری دودھ۔ کتاب نے 230\u00A0ملی لیٹر کی بغیر چینی والی پتی 10\u00A0گرام ناپی، اور یہی خانہ ہے۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 10,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified',
  },
  {
    id: 'patti-200-1',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, mug, 1 sugar',
        portion: '1 standard mug, 200\u00A0ml',
        varies: 'Level or heaped spoon.',
      },
      ur: {
        name: 'دودھ پتی، مگ، 1 چمچ چینی',
        portion: '1 مگ، 200\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھا یا بھرا ہوا۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 15,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at 230\u00A0ml unsweetened',
  },
  {
    id: 'patti-200-2',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, mug, 2 sugars',
        portion: '1 standard mug, 200\u00A0ml',
        varies: 'Level or heaped spoons. This is the sehri cup, and three a day is a meal on its own.',
      },
      ur: {
        name: 'دودھ پتی، مگ، 2 چمچ چینی',
        portion: '1 مگ، 200\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھے یا بھرے۔ یہ سحری والا کپ ہے، اور دن کے تین کپ اپنی جگہ ایک پورا کھانا ہیں۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 19,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at 230\u00A0ml unsweetened',
  },
  {
    id: 'patti-200-3',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, mug, 3 sugars',
        portion: '1 standard mug, 200\u00A0ml',
        varies: 'Level or heaped spoons. Heaped, add about 5\u00A0g.',
      },
      ur: {
        name: 'دودھ پتی، مگ، 3 چمچ چینی',
        portion: '1 مگ، 200\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھے یا بھرے۔ بھرے ہوں تو تقریباً 5\u00A0گرام اور۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 23,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA, LFAC-verified at 230\u00A0ml unsweetened',
  },
  {
    id: 'patti-250-0',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, large mug, no sugar',
        portion: '1 large mug, 250\u00A0ml',
        varies: 'All milk, and a large mug of it.',
      },
      ur: {
        name: 'دودھ پتی، بڑا مگ، بغیر چینی',
        portion: '1 بڑا مگ، 250\u00A0ملی لیٹر',
        varies: 'ساری دودھ، اور وہ بھی بڑا مگ بھر کے۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 13,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },
  {
    id: 'patti-250-1',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, large mug, 1 sugar',
        portion: '1 large mug, 250\u00A0ml',
        varies: 'Level or heaped spoon.',
      },
      ur: {
        name: 'دودھ پتی، بڑا مگ، 1 چمچ چینی',
        portion: '1 بڑا مگ، 250\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھا یا بھرا ہوا۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 17,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },
  {
    id: 'patti-250-2',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, large mug, 2 sugars',
        portion: '1 large mug, 250\u00A0ml',
        varies: 'Level or heaped spoons.',
      },
      ur: {
        name: 'دودھ پتی، بڑا مگ، 2 چمچ چینی',
        portion: '1 بڑا مگ، 250\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھے یا بھرے۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 21,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },
  {
    id: 'patti-250-3',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh patti, large mug, 3 sugars',
        portion: '1 large mug, 250\u00A0ml',
        varies: 'Level or heaped spoons. This single cup is more than a katori of daal.',
      },
      ur: {
        name: 'دودھ پتی، بڑا مگ، 3 چمچ چینی',
        portion: '1 بڑا مگ، 250\u00A0ملی لیٹر',
        varies: 'چمچ لیول تھے یا بھرے۔ یہ اکیلا کپ ایک کٹوری دال سے زیادہ ہے۔',
      },
    },
    roman: 'Doodh patti',
    aliases: ['doodh patti', 'dodh patti', 'dudh patti', 'doodh pati', 'patti', 'chai', 'tea'],
    grams: 26,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from USDA',
  },
  {
    id: 'chai-kashmiri',
    category: 'drink',
    text: {
      en: {
        name: 'Kashmiri chai, pink and sweet',
        portion: '1 glass, 235\u00A0ml',
        varies: 'How sweet the pot was made, and how much khoya or cream went in.',
      },
      ur: {
        name: 'کشمیری چائے',
        portion: '1 گلاس، 235\u00A0ملی لیٹر',
        varies: 'دیگچی کتنی میٹھی بنی، اور کھویا یا کریم کتنی گئی۔',
      },
    },
    roman: 'Kashmiri chai',
    aliases: ['kashmiri chai', 'kashmiri tea', 'pink tea', 'gulabi chai', 'chai', 'tea', 'chae'],
    grams: 26,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'chai-condensed-milk',
    category: 'drink',
    text: {
      en: {
        name: 'Condensed milk in chai, per tablespoon',
        portion: '1 tablespoon stirred in',
        varies: 'How many spoons. This is on top of whatever the cup already holds, and dhaba chai is often pre-sweetened as well.',
      },
      ur: {
        name: 'چائے میں کنڈینسڈ ملک، فی چمچ',
        portion: '1 چمچ، چائے میں ملا ہوا',
        varies: 'کتنے چمچ۔ یہ اُس کے اوپر ہے جو کپ میں پہلے سے ہے، اور ڈھابے کی چائے اکثر پہلے ہی میٹھی ہوتی ہے۔',
      },
    },
    roman: 'Chai',
    aliases: ['tar wali chai', 'condensed milk chai', 'condensed milk', 'chai', 'tea', 'chae'],
    grams: 10,
    gramsMax: null,
    confidence: 'medium',
    source: 'USDA-SR',
  },

  // ── Other drinks (CARBS.md 9.2) ────────────────────────────────────────────
  {
    id: 'qahwa',
    category: 'drink',
    text: {
      en: {
        name: 'Green tea or qahwa, unsweetened',
        portion: '1 cup',
        varies: 'Only the sugar. Each level spoon adds 4.2\u00A0g and a heaped one about 6 — do not dose for the qahwa itself.',
      },
      ur: {
        name: 'قہوہ یا سبز چائے، بغیر چینی',
        portion: '1 پیالی',
        varies: 'صرف چینی۔ ہر لیول چمچ 4.2\u00A0گرام بڑھاتا ہے اور بھرا ہوا تقریباً 6 — خود قہوے کی ڈوز نہ بنائیں۔',
      },
    },
    roman: 'Qahwa',
    aliases: ['qahwa', 'kahwa', 'qehwa', 'green tea', 'sabz chai', 'chai'],
    grams: 0,
    gramsMax: null,
    confidence: 'high',
    source: 'CoFID',
  },
  {
    id: 'leemu-pani',
    category: 'drink',
    text: {
      en: {
        name: 'Leemu pani with 1 sugar',
        portion: '1 glass, 250\u00A0ml',
        varies: 'The sugar, which is all of it. Count the spoons and remember a heaped one is nearer 6\u00A0g.',
      },
      ur: {
        name: 'لیموں پانی، 1 چمچ چینی',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'چینی، اور بس وہی۔ چمچ گن لیں، اور یاد رکھیں کہ بھرا ہوا چمچ 6\u00A0گرام کے قریب ہوتا ہے۔',
      },
    },
    roman: 'Leemu pani',
    aliases: ['leemu pani', 'limo pani', 'lemon pani', 'lemonade', 'nimbu pani', 'shikanjabeen'],
    grams: 8,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'milk-cow',
    category: 'drink',
    text: {
      en: {
        name: 'Cow milk, glass',
        portion: '1 glass, 250\u00A0ml',
        varies: 'Glass size. The lactose is fixed; fat content does not change it.',
      },
      ur: {
        name: 'گائے کا دودھ، گلاس',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'گلاس کا سائز۔ لیکٹوز طے ہے؛ چکنائی گھٹنے بڑھنے سے یہ نہیں بدلتا۔',
      },
    },
    roman: 'Doodh',
    aliases: ['doodh', 'dudh', 'dood', 'milk', 'gaye ka doodh', 'cow milk'],
    grams: 11.6,
    gramsMax: 12,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'milk-buffalo',
    category: 'drink',
    text: {
      en: {
        name: 'Buffalo milk, glass',
        portion: '1 glass, 250\u00A0ml',
        varies: 'Glass size.',
      },
      ur: {
        name: 'بھینس کا دودھ، گلاس',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'گلاس کا سائز۔',
      },
    },
    roman: 'Doodh',
    aliases: ['doodh', 'dudh', 'dood', 'milk', 'bhains ka doodh', 'buffalo milk'],
    grams: 13,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'lassi-sweet-home',
    category: 'drink',
    text: {
      en: {
        name: 'Sweet lassi, home glass with counted spoons',
        portion: '1 glass, 250\u00A0ml',
        varies: 'The sugar, and nothing else matters as much. Two level spoons is this row; every extra heaped spoon is about 6\u00A0g more.',
      },
      ur: {
        name: 'میٹھی لسی، گھر کی',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'چینی، اور کوئی چیز اتنا فرق نہیں ڈالتی۔ دو لیول چمچ یہ لائن ہے؛ ہر اضافی بھرا چمچ تقریباً 6\u00A0گرام اور۔',
      },
    },
    roman: 'Sweet lassi',
    aliases: ['sweet lassi', 'meethi lassi', 'lassi', 'lasi', 'laban'],
    grams: 25,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC rescaled to a 250\u00A0ml glass, CoFID lab analysis nearby',
  },
  {
    id: 'lassi-sweet-shop',
    category: 'drink',
    text: {
      en: {
        name: 'Sweet lassi, halwai glass',
        portion: '1 glass, 250\u00A0ml',
        varies: 'The shop decides, and no standard anywhere sets a sugar level for lassi — two packs legally called meethi lassi can differ several times over. Thicker, near-undiluted dahi with three or four heaped spoons is this row.',
      },
      ur: {
        name: 'میٹھی لسی، حلوائی کی',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'دکان طے کرتی ہے، اور لسی کی چینی کا کوئی معیار کہیں مقرر نہیں — قانوناً میٹھی لسی کہلانے والے دو پیک آپس میں کئی گنا الگ ہو سکتے ہیں۔ گاڑھی، تقریباً بغیر پانی کی دہی تین چار بھرے چمچوں کے ساتھ — وہ یہ لائن ہے۔',
      },
    },
    roman: 'Sweet lassi',
    aliases: ['sweet lassi', 'meethi lassi', 'lassi', 'lasi', 'laban', 'shop lassi'],
    grams: 41,
    gramsMax: null,
    confidence: 'low',
    source: 'CoFID converted, LABEL Prema Sweet Laban, LIT recipe studies, NIN and IGNOU dairy specifications',
  },
  {
    id: 'lassi-namkeen',
    category: 'drink',
    text: {
      en: {
        name: 'Namkeen lassi or chaas',
        portion: '1 glass, 250\u00A0ml',
        varies: 'Glass size and how much it was diluted. No sugar, so this is only the dairy.',
      },
      ur: {
        name: 'نمکین لسی یا چھاچھ',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'گلاس کا سائز اور کتنی پتلی کی گئی۔ چینی نہیں، اس لیے یہ صرف دودھ دہی کا ہے۔',
      },
    },
    roman: 'Namkeen lassi',
    aliases: ['namkeen lassi', 'namkin lassi', 'chaas', 'chach', 'salty lassi', 'lassi'],
    grams: 4,
    gramsMax: 6,
    confidence: 'high',
    source: 'CALC, LFAC lands dead centre',
  },
  {
    id: 'mango-shake-plain',
    category: 'drink',
    text: {
      en: {
        name: 'Mango shake, no added sugar',
        portion: 'half a mango with 200\u00A0ml milk',
        varies: 'Mango ripeness and size. This is the unsweetened floor.',
      },
      ur: {
        name: 'مینگو شیک، بغیر چینی',
        portion: 'آدھا آم، 200\u00A0ملی لیٹر دودھ کے ساتھ',
        varies: 'آم کتنا پکا اور کتنا بڑا۔ یہ بغیر چینی والی کم از کم حد ہے۔',
      },
    },
    roman: 'Mango shake',
    aliases: ['mango shake', 'aam ka shake', 'mango lassi', 'aam lassi', 'milkshake'],
    grams: 25,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'mango-shake-sweet',
    category: 'drink',
    text: {
      en: {
        name: 'Mango shake with sugar',
        portion: '1 glass with the usual 2 spoons of sugar',
        varies: 'The sugar and the mango. Two spoons is the usual; a shop adds more.',
      },
      ur: {
        name: 'مینگو شیک، چینی والا',
        portion: '1 گلاس، حسبِ معمول 2 چمچ چینی کے ساتھ',
        varies: 'چینی اور آم۔ دو چمچ عام رواج ہے؛ دکان زیادہ ڈالتی ہے۔',
      },
    },
    roman: 'Mango shake',
    aliases: ['mango shake', 'aam ka shake', 'mango lassi', 'aam lassi', 'milkshake'],
    grams: 33,
    gramsMax: 40,
    confidence: 'medium',
    source: 'LFAC floor plus CALC for the sugar',
  },
  {
    id: 'banana-milkshake',
    category: 'drink',
    text: {
      en: {
        name: 'Banana milkshake',
        portion: '1 small banana with 200\u00A0ml milk',
        varies: 'Banana size, and any sugar added on top.',
      },
      ur: {
        name: 'کیلے کا شیک',
        portion: '1 چھوٹا کیلا، 200\u00A0ملی لیٹر دودھ کے ساتھ',
        varies: 'کیلے کا سائز، اور اوپر سے ڈلی چینی۔',
      },
    },
    roman: 'Banana milkshake',
    aliases: ['banana milkshake', 'banana shake', 'kela shake', 'milkshake'],
    grams: 25,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'doodh-soda',
    category: 'drink',
    text: {
      en: {
        name: 'Doodh soda',
        portion: '1 glass, 240\u00A0ml, half milk and half soft drink',
        varies: 'The milk-to-soda ratio. More soda means more sugar, not less.',
      },
      ur: {
        name: 'دودھ سوڈا',
        portion: '1 گلاس، 240\u00A0ملی لیٹر، آدھا دودھ آدھا کولڈ ڈرنک',
        varies: 'دودھ اور سوڈے کا تناسب۔ سوڈا زیادہ تو چینی زیادہ، کم نہیں۔',
      },
    },
    roman: 'Doodh soda',
    aliases: ['doodh soda', 'dudh soda', 'milk soda', 'doodh sprite'],
    grams: 22,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'rooh-afza-water',
    category: 'drink',
    text: {
      en: {
        name: 'Rooh Afza in water',
        portion: '1 glass, 2 spoons of syrup in water',
        varies: 'Your pour, and it is the only variable — measure it once. The syrup is about 22\u00A0g per 30\u00A0ml, so a heavy hand doubles this.',
      },
      ur: {
        name: 'Rooh Afza، پانی میں',
        portion: '1 گلاس، پانی میں 2 چمچ شربت',
        varies: 'آپ کا ہاتھ، اور بس وہی — ایک بار ناپ لیں۔ شربت ہر 30\u00A0ملی لیٹر میں تقریباً 22\u00A0گرام ہے، اس لیے کھلا ہاتھ اسے دگنا کر دیتا ہے۔',
      },
    },
    roman: 'Rooh Afza',
    aliases: ['rooh afza', 'roohafza', 'ruh afza', 'sharbat', 'squash', 'rose syrup'],
    grams: 15,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, LABEL mirrors agree',
  },
  {
    id: 'rooh-afza-milk',
    category: 'drink',
    text: {
      en: {
        name: 'Rooh Afza in milk',
        portion: '1 glass, 2 spoons of syrup in milk',
        varies: 'Your pour, plus the milk underneath it.',
      },
      ur: {
        name: 'Rooh Afza، دودھ میں',
        portion: '1 گلاس، دودھ میں 2 چمچ شربت',
        varies: 'آپ کا ہاتھ، اور نیچے کا دودھ اس کے اوپر۔',
      },
    },
    roman: 'Rooh Afza',
    aliases: ['rooh afza', 'roohafza', 'ruh afza', 'sharbat', 'rose milk', 'rose syrup'],
    grams: 25,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, LABEL mirrors agree',
  },
  {
    id: 'sugarcane-juice',
    category: 'drink',
    text: {
      en: {
        name: 'Sugarcane juice',
        portion: '1 glass',
        varies: 'Glass size and how much ice diluted it.',
      },
      ur: {
        name: 'گنے کا رس',
        portion: '1 گلاس',
        varies: 'گلاس کا سائز، اور برف نے کتنا پتلا کیا۔',
      },
    },
    roman: 'Sugarcane juice',
    aliases: ['ganne ka ras', 'ganna juice', 'gana juice', 'sugarcane juice', 'roh'],
    grams: 25,
    gramsMax: 27,
    confidence: 'low',
    source: 'LIT and WEAK trackers — no LFAC row, unconfirmed by the Pakistani source',
  },
  {
    id: 'juice-fresh',
    category: 'drink',
    text: {
      en: {
        name: 'Fresh orange or kinnow juice',
        portion: '1 glass, 250\u00A0ml',
        varies: 'Glass size, and how much of it is pulp. Squeezed fresh runs at the bottom of this band.',
      },
      ur: {
        name: 'تازہ جوس، مالٹا یا کینو',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'گلاس کا سائز، اور گودا کتنا ہے۔ تازہ نچوڑا ہوا اس رینج کے نچلے سرے پر رہتا ہے۔',
      },
    },
    roman: 'Fresh juice',
    aliases: ['fresh juice', 'kinnow juice', 'orange juice', 'santra juice', 'malta juice', 'juice'],
    grams: 21,
    gramsMax: 26,
    confidence: 'high',
    source: 'USDA, LFAC',
  },
  {
    id: 'juice-apple',
    category: 'drink',
    text: {
      en: {
        name: 'Apple juice',
        portion: '1 glass, 250\u00A0ml',
        varies: 'Glass size. A packet says its own number.',
      },
      ur: {
        name: 'ایپل جوس',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'گلاس کا سائز۔ پیکٹ اپنا نمبر خود بتاتا ہے۔',
      },
    },
    roman: 'Apple juice',
    aliases: ['apple juice', 'saib ka juice', 'juice', 'packet juice'],
    grams: 28,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'soft-drink-250',
    category: 'drink',
    text: {
      en: {
        name: 'Soft drink, small glass',
        portion: '1 glass, 250\u00A0ml',
        varies: 'It is printed on the bottle, and the bottle beats this row.',
      },
      ur: {
        name: 'کولڈ ڈرنک، گلاس',
        portion: '1 گلاس، 250\u00A0ملی لیٹر',
        varies: 'یہ بوتل پر چھپا ہوتا ہے، اور بوتل کا نمبر اس لائن سے بہتر ہے۔',
      },
    },
    roman: 'Soft drink',
    aliases: ['soft drink', 'cold drink', 'coke', 'pepsi', 'sprite', 'fizzy drink', 'bottle'],
    grams: 26,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, CoFID',
  },
  {
    id: 'soft-drink-300',
    category: 'drink',
    text: {
      en: {
        name: 'Soft drink, regular bottle',
        portion: '1 bottle, 300\u00A0ml',
        varies: 'It is printed on the bottle.',
      },
      ur: {
        name: 'کولڈ ڈرنک، ریگولر بوتل',
        portion: '1 بوتل، 300\u00A0ملی لیٹر',
        varies: 'بوتل پر چھپا ہوتا ہے۔',
      },
    },
    roman: 'Soft drink',
    aliases: ['soft drink', 'cold drink', 'coke', 'pepsi', 'sprite', 'fizzy drink', 'bottle'],
    grams: 31,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, CoFID',
  },
  {
    id: 'soft-drink-500',
    category: 'drink',
    text: {
      en: {
        name: 'Soft drink, large bottle',
        portion: '1 bottle, 500\u00A0ml',
        varies: 'It is printed on the bottle. This is a full meal of carbohydrate with nothing else in it.',
      },
      ur: {
        name: 'کولڈ ڈرنک، بڑی بوتل (آدھا لیٹر)',
        portion: '1 بوتل، 500\u00A0ملی لیٹر',
        varies: 'بوتل پر چھپا ہوتا ہے۔ یہ پورے کھانے جتنا کاربوہائیڈریٹ ہے، اور ساتھ میں کچھ بھی نہیں۔',
      },
    },
    roman: 'Soft drink',
    aliases: ['soft drink', 'cold drink', 'coke', 'pepsi', 'sprite', 'fizzy drink', 'bari bottle'],
    grams: 52,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, CoFID',
  },
  {
    id: 'sattu-drink',
    category: 'drink',
    text: {
      en: {
        name: 'Sattu drink',
        portion: '1 tablespoon sugar with 2 tablespoons sattu',
        varies: 'The spoons. Sugar is about half of this and the sattu the other half.',
      },
      ur: {
        name: 'ستو کا شربت',
        portion: '1 بڑا چمچ چینی اور 2 بڑے چمچ ستو',
        varies: 'چمچ۔ اس کا تقریباً آدھا چینی ہے اور باقی آدھا ستو۔',
      },
    },
    roman: 'Sattu',
    aliases: ['sattu', 'satu', 'sattoo', 'sattu sharbat'],
    grams: 22,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC, component CALC coherent',
  },
  {
    id: 'saffron-milk-bohri',
    category: 'drink',
    text: {
      en: {
        name: 'Saffron milk, Bohri',
        portion: '1 cup, 220\u00A0ml',
        varies: 'The sugar, on top of the milk itself.',
      },
      ur: {
        name: 'زعفرانی دودھ (بوہری)',
        portion: '1 کپ، 220\u00A0ملی لیٹر',
        varies: 'چینی، خود دودھ کے اوپر۔',
      },
    },
    roman: 'Saffron milk',
    aliases: ['saffron milk', 'zafrani doodh', 'kesar milk', 'doodh', 'milk'],
    grams: 15,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC',
  },
  {
    id: 'zero-drinks',
    category: 'drink',
    text: {
      en: {
        name: 'Water, diet drinks and unsweetened tea or coffee',
        portion: '1 glass or cup',
        varies: 'Nothing, so long as no sugar and no milk went in. Do not dose for these.',
      },
      ur: {
        name: 'پانی، ڈائٹ ڈرنک، بغیر چینی چائے یا کافی',
        portion: '1 گلاس یا کپ',
        varies: 'کچھ نہیں — بس یہ کہ چینی اور دودھ نہ ڈلا ہو۔ اِن کی ڈوز نہ بنائیں۔',
      },
    },
    roman: 'Diet drink',
    aliases: ['diet drink', 'diet coke', 'diet pepsi', 'water', 'pani', 'black tea', 'black coffee', 'coffee', 'coke zero', 'pepsi max', 'pepsi black', 'sprite zero', '7up free', 'seven up free', 'zero cola', 'zero drink', 'sugar free drink', 'sugar free cola'],
    grams: 0,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, CoFID',
  },
  {
    id: 'flavoured-milk',
    category: 'drink',
    text: {
      en: {
        name: 'Flavoured milk, chocolate',
        portion: '1 pack, 250\u00A0ml',
        varies: 'It is printed on the pack.',
      },
      ur: {
        name: 'چاکلیٹ دودھ، ڈبہ پیک',
        portion: '1 ڈبہ، 250\u00A0ملی لیٹر',
        varies: 'ڈبے پر چھپا ہوتا ہے۔',
      },
    },
    roman: 'Flavoured milk',
    aliases: ['flavoured milk', 'chocolate milk', 'flavored milk', 'milk pak chocolate', 'doodh'],
    grams: 26,
    gramsMax: null,
    confidence: 'high',
    source: 'FNDDS',
  },

  // ── Fruit (CARBS.md 10) ────────────────────────────────────────────────────
  {
    id: 'khajoor-large',
    category: 'fruit',
    text: {
      en: {
        name: 'Dried date, large',
        portion: '1 large date, 24\u00A0g',
        varies: 'Which dates your house buys. Three-quarters of a dried date by weight is sugar.',
      },
      ur: {
        name: 'کھجور، بڑی',
        portion: '1 بڑی کھجور، 24\u00A0گرام',
        varies: 'آپ کے گھر کون سی کھجور آتی ہے۔ خشک کھجور کے وزن کا تین چوتھائی چینی ہے۔',
      },
    },
    roman: 'Khajoor',
    aliases: ['khajoor', 'khajur', 'khajoor', 'dates', 'date', 'chuhara', 'chhuara'],
    grams: 18,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, CoFID, LFAC agree exactly',
  },
  {
    id: 'khajoor-small',
    category: 'fruit',
    text: {
      en: {
        name: 'Dried date, small aseel',
        portion: '1 small date, 7 to 10\u00A0g',
        varies: 'Date size, and that alone. Count them — six small ones are a large date and a half.',
      },
      ur: {
        name: 'کھجور، چھوٹی اصیل',
        portion: '1 چھوٹی کھجور، 7 سے 10\u00A0گرام',
        varies: 'کھجور کا سائز، اور بس وہی۔ گن لیں — چھ چھوٹی ڈیڑھ بڑی کے برابر ہیں۔',
      },
    },
    roman: 'Khajoor',
    aliases: ['khajoor', 'khajur', 'aseel', 'asil', 'dates', 'date', 'chhuara'],
    grams: 5,
    gramsMax: 7,
    confidence: 'high',
    source: 'USDA, CoFID, LFAC',
  },
  {
    id: 'dates-fresh',
    category: 'fruit',
    text: {
      en: {
        name: 'Fresh dates, doka',
        portion: '5 fresh dates',
        varies: 'Size and ripeness. A riper date is a drier, sweeter one.',
      },
      ur: {
        name: 'تازہ کھجور (ڈوکا)',
        portion: '5 تازہ کھجوریں',
        varies: 'سائز، اور کتنی پکی ہیں۔ جتنی پکی، اتنی خشک اور میٹھی۔',
      },
    },
    roman: 'Fresh dates',
    aliases: ['fresh dates', 'doka', 'dokay', 'rutab', 'khajoor', 'dates'],
    grams: 16,
    gramsMax: null,
    confidence: 'medium',
    source: 'CoFID raw',
  },
  {
    id: 'aam-slices',
    category: 'fruit',
    text: {
      en: {
        name: 'Mango, half a cup of slices',
        portion: 'half a cup of slices, 120\u00A0g',
        varies: 'Variety and ripeness, and how you cut it. A riper mango is at the top.',
      },
      ur: {
        name: 'آم کے قتلے، آدھا کپ',
        portion: 'آدھا کپ قتلے، 120\u00A0گرام',
        varies: 'قسم، پکاؤ، اور کاٹنے کا انداز۔ زیادہ پکا آم اوپر والے سرے پر۔',
      },
    },
    roman: 'Aam',
    aliases: ['aam', 'am', 'aam ki phaank', 'mango', 'chaunsa', 'sindhri', 'anwar ratol'],
    grams: 12,
    gramsMax: 15,
    confidence: 'medium',
    source: 'USDA, CoFID, LFAC',
  },
  {
    id: 'aam-whole',
    category: 'fruit',
    text: {
      en: {
        name: 'Mango, whole medium',
        portion: '1 medium mango, about 200\u00A0g of flesh',
        varies: 'Size and variety. Count a whole mango as at least 30\u00A0g whatever it looks like.',
      },
      ur: {
        name: 'آم، پورا درمیانہ',
        portion: '1 درمیانہ آم، گودا تقریباً 200\u00A0گرام',
        varies: 'سائز اور قسم۔ پورا آم کیسا بھی لگے، کم از کم 30\u00A0گرام گنیں۔',
      },
    },
    roman: 'Aam',
    aliases: ['aam', 'am', 'mango', 'chaunsa', 'sindhri', 'anwar ratol', 'whole mango'],
    grams: 30,
    gramsMax: 35,
    confidence: 'medium',
    source: 'USDA, CoFID',
  },
  {
    id: 'kela',
    category: 'fruit',
    text: {
      en: {
        name: 'Banana, small',
        portion: '1 small banana, 80 to 100\u00A0g of flesh',
        varies: 'Size, weighed without the peel. A large banana is half as much again.',
      },
      ur: {
        name: 'کیلا، چھوٹا',
        portion: '1 چھوٹا کیلا، گودا 80 سے 100\u00A0گرام',
        varies: 'سائز، چھلکے کے بغیر تولا ہوا۔ بڑا کیلا اس سے ڈیڑھ گنا ہے۔',
      },
    },
    roman: 'Kela',
    aliases: ['kela', 'kaila', 'kelaa', 'banana', 'bananas'],
    grams: 18,
    gramsMax: 23,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'amrood',
    category: 'fruit',
    text: {
      en: {
        name: 'Guava, medium',
        portion: '1 medium guava, 120\u00A0g',
        varies: 'Two good laboratories disagree threefold about this fruit and nobody has resolved it. Variety is the likely reason. Treat the top of the band as the safe assumption and check the meter.',
      },
      ur: {
        name: 'امرود، درمیانہ',
        portion: '1 درمیانہ امرود، 120\u00A0گرام',
        varies: 'دو اچھی لیبارٹریاں اس پھل پر تین گنا کے فرق سے الجھی ہوئی ہیں اور فیصلہ آج تک کسی نے نہیں کیا۔ غالباً وجہ قسم کا فرق ہے۔ رینج کے اوپر والے سرے کو محفوظ اندازہ مانیں اور میٹر سے چیک کریں۔',
      },
    },
    roman: 'Amrood',
    aliases: ['amrood', 'amrud', 'amrooth', 'guava', 'guavas'],
    grams: 6,
    gramsMax: 17,
    confidence: 'low',
    source: 'USDA against CoFID — unresolved, range shown rather than averaged',
  },
  {
    id: 'chikoo',
    category: 'fruit',
    text: {
      en: {
        name: 'Chikoo, sapodilla',
        portion: '1 fruit, 170\u00A0g',
        varies: 'Size. This is a sugar bomb that looks innocent — one chikoo is most of a katori of rice.',
      },
      ur: {
        name: 'چیکو',
        portion: '1 چیکو، 170\u00A0گرام',
        varies: 'سائز۔ یہ دیکھنے میں بھولا بھالا ہے مگر چینی کا گولہ ہے — ایک چیکو تقریباً کٹوری بھر چاول کے برابر ہے۔',
      },
    },
    roman: 'Chikoo',
    aliases: ['chikoo', 'chiku', 'cheeku', 'sapodilla', 'sapota'],
    grams: 34,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'tarbooz-cup',
    category: 'fruit',
    text: {
      en: {
        name: 'Watermelon, cup of cubes',
        portion: '1 cup of cubes',
        varies: 'How full the cup is. Watermelon is mostly water.',
      },
      ur: {
        name: 'تربوز، کپ بھر ٹکڑے',
        portion: '1 کپ ٹکڑے',
        varies: 'کپ کتنا بھرا ہے۔ تربوز زیادہ تر پانی ہے۔',
      },
    },
    roman: 'Tarbooz',
    aliases: ['tarbooz', 'tarboz', 'tarbuz', 'watermelon', 'water melon'],
    grams: 11.5,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, LFAC agree',
  },
  {
    id: 'tarbooz-wedge',
    category: 'fruit',
    text: {
      en: {
        name: 'Watermelon, large wedge',
        portion: '1 wedge, 300\u00A0g',
        varies: 'Wedge size, weighed without the rind.',
      },
      ur: {
        name: 'تربوز، بڑی قاش',
        portion: '1 قاش، 300\u00A0گرام',
        varies: 'قاش کا سائز، چھلکے کے بغیر تولی ہوئی۔',
      },
    },
    roman: 'Tarbooz',
    aliases: ['tarbooz', 'tarboz', 'tarbuz', 'watermelon', 'water melon'],
    grams: 23,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, LFAC agree',
  },
  {
    id: 'kharbooza',
    category: 'fruit',
    text: {
      en: {
        name: 'Melon, kharbooza sarda or garma',
        portion: '1 cup of cubes',
        varies: 'Which melon and how ripe.',
      },
      ur: {
        name: 'خربوزہ، سردا یا گرما',
        portion: '1 کپ ٹکڑے',
        varies: 'کون سا خربوزہ اور کتنا پکا۔',
      },
    },
    roman: 'Kharbooza',
    aliases: ['kharbooza', 'kharbuza', 'sarda', 'garma', 'melon', 'musk melon'],
    grams: 9,
    gramsMax: 13,
    confidence: 'high',
    source: 'USDA, CoFID',
  },
  {
    id: 'papita',
    category: 'fruit',
    text: {
      en: {
        name: 'Papaya, cup of cubes',
        portion: '1 cup of cubes',
        varies: 'Ripeness.',
      },
      ur: {
        name: 'پپیتا',
        portion: '1 کپ ٹکڑے',
        varies: 'کتنا پکا ہے۔',
      },
    },
    roman: 'Papita',
    aliases: ['papita', 'papeeta', 'papaya', 'papaw'],
    grams: 14,
    gramsMax: 16,
    confidence: 'high',
    source: 'USDA, CoFID',
  },
  {
    id: 'jamun',
    category: 'fruit',
    text: {
      en: {
        name: 'Jamun, black plum',
        portion: '1 katori, about 100\u00A0g',
        varies: 'Bowl size. One source only, so check the meter the first time.',
      },
      ur: {
        name: 'جامن',
        portion: '1 کٹوری، تقریباً 100\u00A0گرام',
        varies: 'کٹوری کا سائز۔ ذریعہ صرف ایک ہے، اس لیے پہلی بار میٹر سے چیک کر لیں۔',
      },
    },
    roman: 'Jamun',
    aliases: ['jamun', 'jaamun', 'jambul', 'black plum', 'java plum'],
    grams: 15.5,
    gramsMax: null,
    confidence: 'medium',
    source: 'USDA-SR, single source',
  },
  {
    id: 'kinnow',
    category: 'fruit',
    text: {
      en: {
        name: 'Kinnow, malta or santra',
        portion: '1 medium fruit',
        varies: 'Size. Juiced, the same fruit lands in a glass at twice this.',
      },
      ur: {
        name: 'کینو، مالٹا یا سنترہ',
        portion: '1 درمیانہ پھل',
        varies: 'سائز۔ یہی پھل جوس بن کر گلاس میں اس کا دگنا ہو جاتا ہے۔',
      },
    },
    roman: 'Kinnow',
    aliases: ['kinnow', 'kino', 'malta', 'santra', 'orange', 'tangerine', 'mandarin', 'kinnu'],
    grams: 12,
    gramsMax: null,
    confidence: 'medium',
    source: 'USDA tangerine',
  },
  {
    id: 'saib',
    category: 'fruit',
    text: {
      en: {
        name: 'Apple, small',
        portion: '1 small apple, 150\u00A0g',
        varies: 'Size. A large apple is half as much again.',
      },
      ur: {
        name: 'سیب، چھوٹا',
        portion: '1 چھوٹا سیب، 150\u00A0گرام',
        varies: 'سائز۔ بڑا سیب اس سے ڈیڑھ گنا ہے۔',
      },
    },
    roman: 'Saib',
    aliases: ['saib', 'seb', 'sayb', 'apple', 'apples'],
    grams: 20,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, LFAC agree',
  },
  {
    id: 'angoor',
    category: 'fruit',
    text: {
      en: {
        name: 'Grapes, 15',
        portion: '15 grapes',
        varies: 'Grape size, and how many you actually ate. Count them — grapes are eaten absent-mindedly.',
      },
      ur: {
        name: 'انگور، 15 دانے',
        portion: '15 دانے',
        varies: 'دانے کا سائز، اور واقعی کتنے کھائے۔ گن لیں — انگور دھیان دیے بغیر کھائے جاتے ہیں۔',
      },
    },
    roman: 'Angoor',
    aliases: ['angoor', 'angur', 'angoor', 'grapes', 'grape'],
    grams: 13.5,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR, LFAC runs lower',
  },
  {
    id: 'anaar',
    category: 'fruit',
    text: {
      en: {
        name: 'Pomegranate, half a cup of arils',
        portion: 'half a cup of arils, 130\u00A0g',
        varies: 'How full the cup is.',
      },
      ur: {
        name: 'انار کے دانے، آدھا کپ',
        portion: 'آدھا کپ دانے، 130\u00A0گرام',
        varies: 'کپ کتنا بھرا ہے۔',
      },
    },
    roman: 'Anaar',
    aliases: ['anaar', 'anar', 'anaar dana', 'pomegranate'],
    grams: 16,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, LFAC agree',
  },
  {
    id: 'aaroo',
    category: 'fruit',
    text: {
      en: {
        name: 'Peach, large',
        portion: '1 large peach',
        varies: 'Size.',
      },
      ur: {
        name: 'آڑو، بڑا',
        portion: '1 بڑا آڑو',
        varies: 'سائز۔',
      },
    },
    roman: 'Aaroo',
    aliases: ['aaroo', 'aru', 'aaru', 'peach', 'peaches'],
    grams: 15,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA',
  },
  {
    id: 'falsa',
    category: 'fruit',
    text: {
      en: {
        name: 'Falsa, whole',
        portion: '1 katori of whole falsa',
        varies: 'Ripeness, and the literature itself is uncertain here. Riper berries are at the top.',
      },
      ur: {
        name: 'فالسہ',
        portion: '1 کٹوری ثابت فالسے',
        varies: 'کتنے پکے ہیں، اور خود لٹریچر بھی یہاں غیر یقینی ہے۔ زیادہ پکے دانے اوپر والے سرے پر۔',
      },
    },
    roman: 'Falsa',
    aliases: ['falsa', 'phalsa', 'falsay', 'phalsay'],
    grams: 5,
    gramsMax: 10,
    confidence: 'low',
    source: 'LIT review ranges — no LFAC row, unconfirmed by the Pakistani source',
  },

  // ── Dairy (CARBS.md 11) ────────────────────────────────────────────────────
  {
    id: 'dahi-plain',
    category: 'dairy',
    text: {
      en: {
        name: 'Dahi, plain yoghurt',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size. If it was sweetened, add the sugar separately — a spoon is 4.2\u00A0g.',
      },
      ur: {
        name: 'سادہ دہی',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کٹوری کا سائز۔ میٹھی کی گئی ہو تو چینی الگ سے جوڑیں — ایک چمچ 4.2\u00A0گرام ہے۔',
      },
    },
    roman: 'Dahi',
    aliases: ['dahi', 'dahee', 'yoghurt', 'yogurt', 'curd'],
    grams: 7,
    gramsMax: 12,
    confidence: 'high',
    source: 'USDA, CoFID',
  },
  {
    id: 'raita',
    category: 'dairy',
    text: {
      en: {
        name: 'Raita',
        portion: '1 katori, 150\u00A0g',
        varies: 'Bowl size, and whether boondi or fruit went in.',
      },
      ur: {
        name: 'رائتہ',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'کٹوری کا سائز، اور بوندی یا پھل ڈلا ہے یا نہیں۔',
      },
    },
    roman: 'Raita',
    aliases: ['raita', 'raitha', 'rayta', 'dahi', 'cucumber raita'],
    grams: 5,
    gramsMax: 8,
    confidence: 'medium',
    source: 'CALC, LFAC boondi raita chaat corroborates',
  },
  {
    id: 'milk-powder',
    category: 'dairy',
    text: {
      en: {
        name: 'Milk powder, Nido',
        portion: '4 tablespoons nonfat, 23\u00A0g',
        varies: 'How heaped the spoon is.',
      },
      ur: {
        name: 'خشک دودھ، Nido',
        portion: '4 بڑے چمچ (بغیر چکنائی)، 23\u00A0گرام',
        varies: 'چمچ کتنا بھرا ہوا ہے۔',
      },
    },
    roman: 'Milk powder',
    aliases: ['milk powder', 'nido', 'powder milk', 'doodh powder', 'everyday'],
    grams: 12,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA',
  },
  {
    id: 'condensed-milk',
    category: 'dairy',
    text: {
      en: {
        name: 'Condensed milk, sweetened',
        portion: '1 tablespoon, 19\u00A0g',
        varies: null,
      },
      ur: {
        name: 'کنڈینسڈ ملک، میٹھا',
        portion: '1 بڑا چمچ، 19\u00A0گرام',
        varies: null,
      },
    },
    roman: 'Condensed milk',
    aliases: ['condensed milk', 'condense milk', 'milkmaid', 'tar', 'meetha doodh'],
    grams: 10,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA-SR',
  },
  {
    id: 'evaporated-milk',
    category: 'dairy',
    text: {
      en: {
        name: 'Evaporated milk',
        portion: 'half a cup',
        varies: null,
      },
      ur: {
        name: 'ایویپوریٹڈ ملک',
        portion: 'آدھا کپ',
        varies: null,
      },
    },
    roman: 'Evaporated milk',
    aliases: ['evaporated milk', 'evaporated', 'unsweetened condensed milk', 'doodh'],
    grams: 13,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA',
  },
  {
    id: 'paneer-cheese',
    category: 'dairy',
    text: {
      en: {
        name: 'Paneer or cheese',
        portion: '1 ordinary helping',
        varies: 'Barely anything. Do not dose for this unless it came on bread.',
      },
      ur: {
        name: 'پنیر یا چیز',
        portion: '1 عام مقدار',
        varies: 'برائے نام۔ اِس کی ڈوز نہ بنائیں، ہاں اگر ڈبل روٹی پر آیا ہو تو الگ بات ہے۔',
      },
    },
    roman: 'Paneer',
    aliases: ['paneer', 'panir', 'cheese', 'cheddar', 'cheese slice'],
    grams: 1,
    gramsMax: 3,
    confidence: 'high',
    source: 'USDA',
  },
  {
    id: 'khoya-100g',
    category: 'dairy',
    text: {
      en: {
        name: 'Khoya, 100\u00A0g',
        portion: '100\u00A0g',
        varies: 'Moisture and which milk it was reduced from. All of it is lactose.',
      },
      ur: {
        name: 'کھویا، 100\u00A0گرام',
        portion: '100\u00A0گرام',
        varies: 'نمی، اور کس دودھ سے پکا کر بنایا گیا۔ اس کا سب کچھ لیکٹوز ہے۔',
      },
    },
    roman: 'Khoya',
    aliases: ['khoya', 'khoa', 'mawa', 'khoya mawa'],
    grams: 20,
    gramsMax: 25,
    confidence: 'medium',
    source: 'LIT dairy science — no LFAC row',
  },
  {
    id: 'khoya-mithai-portion',
    category: 'dairy',
    text: {
      en: {
        name: 'Khoya, mithai-sized portion',
        portion: '1 mithai portion, 50\u00A0g',
        varies: 'Moisture. A drier khoya is denser and carries more.',
      },
      ur: {
        name: 'کھویا، مٹھائی جتنا ٹکڑا',
        portion: 'مٹھائی جتنا 1 ٹکڑا، 50\u00A0گرام',
        varies: 'نمی۔ جتنا خشک کھویا، فی گرام اتنا زیادہ۔',
      },
    },
    roman: 'Khoya',
    aliases: ['khoya', 'khoa', 'mawa', 'khoya mithai'],
    grams: 10,
    gramsMax: 12,
    confidence: 'medium',
    source: 'LIT dairy science — no LFAC row',
  },

  // ── Ramadan quick sheet (CARBS.md 12) ──────────────────────────────────────
  {
    id: 'khajoor-iftar-three',
    category: 'fruit',
    text: {
      en: {
        name: 'Three small dates at iftar',
        portion: '3 small dates',
        varies: 'Date size. This is the standard opening of a fast and it is one clinic serving exactly.',
      },
      ur: {
        name: 'افطار کی 3 چھوٹی کھجوریں',
        portion: '3 چھوٹی کھجوریں',
        varies: 'کھجور کا سائز۔ روزہ کھولنے کا یہ عام طریقہ ٹھیک ایک کلینک کی بتائی مقدار ہے۔',
      },
    },
    roman: 'Khajoor',
    aliases: ['khajoor', 'khajur', 'dates', 'iftar dates', 'roza khajoor', 'iftari', 'chhuara'],
    grams: 15,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA, SJSU, IDF-DAR, LFAC agree',
  },

  // ── Estimating something not on this list (CARBS.md 13) ────────────────────
  {
    id: 'rice-fist',
    category: 'rice',
    text: {
      en: {
        name: 'Cooked rice, one cup-sized fist',
        portion: '1 cup-sized fist',
        varies: 'Your fist. This is the eyeball measure for a plate you cannot weigh — a measured 160\u00A0ml cup holds nearly twice it.',
      },
      ur: {
        name: 'چاول، کپ جتنی مٹھی',
        portion: 'کپ جتنی 1 مٹھی',
        varies: 'آپ کی مٹھی۔ جو پلیٹ تول نہیں سکتے اس کے لیے آنکھ کا اندازہ یہی ہے — ناپا ہوا 160\u00A0ملی لیٹر کا کپ اس کا تقریباً دگنا رکھتا ہے۔',
      },
    },
    roman: 'Chawal',
    aliases: ['rice', 'chawal', 'chaval', 'fist of rice', 'muthi chawal'],
    grams: 28,
    gramsMax: null,
    confidence: 'medium',
    source: 'USDA anchor',
  },
  {
    id: 'rice-tablespoon',
    category: 'rice',
    text: {
      en: {
        name: 'Cooked rice, one heaped tablespoon',
        portion: '1 heaped serving tablespoon',
        varies: 'How heaped the spoon is. Count spoonfuls when the plate is not yours to weigh.',
      },
      ur: {
        name: 'چاول، ایک بھرا ہوا چمچ',
        portion: '1 بھرا ہوا بڑا چمچ',
        varies: 'چمچ کتنا بھرا ہوا ہے۔ جب پلیٹ اپنی نہ ہو کہ تول سکیں تو چمچ گن لیں۔',
      },
    },
    roman: 'Chawal',
    aliases: ['rice', 'chawal', 'chaval', 'spoon of rice', 'chamach chawal'],
    grams: 4,
    gramsMax: null,
    confidence: 'medium',
    source: 'USDA anchor',
  },
  {
    id: 'aloo-chunk',
    category: 'salan',
    text: {
      en: {
        name: 'Potato chunk in a salan or biryani',
        portion: '1 gol chunk, 50 to 80\u00A0g',
        varies: 'Chunk size. Count the chunks on the plate — in a potato dish this is worth more than the whole band on the dish row.',
      },
      ur: {
        name: 'آلو کا ٹکڑا، سالن یا بریانی کا',
        portion: '1 گول ٹکڑا، 50 سے 80\u00A0گرام',
        varies: 'ٹکڑے کا سائز۔ پلیٹ میں ٹکڑے گن لیں — آلو والی ڈش میں یہ اُس ڈش کی پوری رینج سے زیادہ فرق ڈالتا ہے۔',
      },
    },
    roman: 'Aloo',
    aliases: ['aloo', 'alu', 'aalu', 'potato', 'potato chunk', 'aloo ka tukra'],
    grams: 8,
    gramsMax: 16,
    confidence: 'medium',
    source: 'USDA boiled potato, LFAC potato rows imply the lower end',
  },
  {
    id: 'aloo-whole',
    category: 'salan',
    text: {
      en: {
        name: 'Whole potato in a degh or salan',
        portion: '1 whole potato, 80 to 130\u00A0g',
        varies: 'A degh potato is a whole one, not the half that goes into a home pot — worth about twice a chunk. If you cannot tell which you have, count it as two chunks.',
      },
      ur: {
        name: 'سالم آلو، دیگ یا سالن کا',
        portion: '1 سالم آلو، 80 سے 130\u00A0گرام',
        varies: 'دیگ کا آلو سالم ہوتا ہے، گھر کی ہانڈی والے آدھے آلو سے الگ — تقریباً ایک ٹکڑے سے دگنا۔ سمجھ نہ آئے تو اسے دو ٹکڑے گن لیں۔',
      },
    },
    roman: 'Sabut aloo',
    aliases: ['whole potato', 'sabut aloo', 'poora aloo', 'degh aloo', 'aloo', 'alu', 'aalu', 'potato', 'bara aloo'],
    grams: 12,
    gramsMax: 26,
    confidence: 'medium',
    source: 'USDA boiled potato 20.0 to 20.1 per 100\u00A0g, FNDDS 20.4, CoFID 16.7 converted, LFAC implies 15 — applied to an 80 to 130\u00A0g Pakistani potato',
  },
  {
    id: 'salan-thin-unnamed',
    category: 'salan',
    text: {
      en: {
        name: 'Thin gravy, a dish you cannot name',
        portion: '1 katori, 150\u00A0g',
        varies: 'Use this when the gravy is thin and runs off the spoon, whatever meat is in it. The masala is the whole number.',
      },
      ur: {
        name: 'پتلا سالن',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'یہ تب لیں جب شوربہ پتلا ہو اور چمچ سے بہہ جائے، گوشت جو بھی ہو۔ سارا نمبر مسالے کا ہے۔',
      },
    },
    roman: 'Salan',
    aliases: ['salan', 'saalan', 'curry', 'gravy', 'thin salan', 'patli gravy'],
    grams: 5,
    gramsMax: 10,
    confidence: 'medium',
    source: 'KHAN, CoFID and LFAC pattern across every thin salan in this table',
  },
  {
    id: 'salan-thick-unnamed',
    category: 'salan',
    text: {
      en: {
        name: 'Thick gravy, a dish you cannot name',
        portion: '1 katori, 150\u00A0g',
        varies: 'Use this when the gravy clings to the spoon, which means besan, atta, daal or a lot of fried onion went in. Those are the carbohydrate, not the meat.',
      },
      ur: {
        name: 'گاڑھا سالن',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'یہ تب لیں جب شوربہ چمچ سے چپکے — یعنی بیسن، آٹا، دال یا بہت سی بھنی پیاز پڑی ہے۔ کاربوہائیڈریٹ وہی ہیں، گوشت نہیں۔',
      },
    },
    roman: 'Salan',
    aliases: ['salan', 'saalan', 'curry', 'gravy', 'thick salan', 'gaarhi gravy'],
    grams: 10,
    gramsMax: 20,
    confidence: 'medium',
    source: 'KHAN korma and kadhi pattern, CoFID',
  },
  {
    id: 'besan-coating',
    category: 'snack',
    text: {
      en: {
        name: 'Besan coating or fried batter, per plate',
        portion: '1 plate of coated fried food',
        varies: 'How thick the batter was. A thin dusting is the floor, a heavy pakora-style coat the top.',
      },
      ur: {
        name: 'بیسن کی تہہ (کوٹنگ)، فی پلیٹ',
        portion: 'بیسن لگی تلی ہوئی چیزوں کی 1 پلیٹ',
        varies: 'گھول کتنا موٹا چڑھا۔ ہلکی سی تہہ نچلا سرا ہے، پکوڑے جیسا موٹا خول اوپر کا۔',
      },
    },
    roman: 'Besan',
    aliases: ['besan', 'basan', 'gram flour', 'batter', 'coating', 'fried batter'],
    grams: 5,
    gramsMax: 15,
    confidence: 'medium',
    source: 'CoFID and LFAC pakora pattern',
  },

  // ── Meals as served, pre-added (CARBS.md 14) ───────────────────────────────
  {
    id: 'meal-biryani-mid-raita',
    category: 'rice',
    text: {
      en: {
        name: 'Meal: biryani plate, mid pot, with raita',
        portion: '1 plate, 300\u00A0g, with a katori of raita',
        varies: 'Plate weight, and the potato chunks — each one is 8 to 16\u00A0g on top of this.',
      },
      ur: {
        name: 'بریانی پلیٹ، درمیانی دیگ، رائتے کے ساتھ',
        portion: '1 پلیٹ، 300\u00A0گرام، 1 کٹوری رائتے کے ساتھ',
        varies: 'پلیٹ کا وزن، اور آلو کے ٹکڑے — ہر ٹکڑا اس کے اوپر 8 سے 16\u00A0گرام ہے۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'biryani plate', 'biryani with raita', 'biryani meal'],
    grams: 55,
    gramsMax: 60,
    confidence: 'medium',
    source: 'LFAC-anchored biryani plus the raita row',
  },
  {
    id: 'meal-biryani-degh-raita',
    category: 'rice',
    text: {
      en: {
        name: 'Meal: biryani plate, degh or commercial, with raita',
        portion: '1 plate, 300\u00A0g, with a katori of raita',
        varies: 'Which pot it came from, and the potato chunks.',
      },
      ur: {
        name: 'بریانی پلیٹ، دیگ یا کمرشل، رائتے کے ساتھ',
        portion: '1 پلیٹ، 300\u00A0گرام، 1 کٹوری رائتے کے ساتھ',
        varies: 'کون سی دیگ سے آئی، اور آلو کے ٹکڑے۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'degh biryani', 'biryani with raita', 'biryani meal'],
    grams: 65,
    gramsMax: 75,
    confidence: 'medium',
    source: 'CoFID and KHAN biryani plus the raita row',
  },
  {
    id: 'meal-biryani-meat-raita',
    category: 'rice',
    text: {
      en: {
        name: 'Meal: biryani plate, meat-heavy home, with raita',
        portion: '1 plate, 300\u00A0g, with a katori of raita',
        varies: 'Which pot it came from, and the potato chunks.',
      },
      ur: {
        name: 'بریانی پلیٹ، گوشت زیادہ، رائتے کے ساتھ',
        portion: '1 پلیٹ، 300\u00A0گرام، 1 کٹوری رائتے کے ساتھ',
        varies: 'کون سی دیگ سے آئی، اور آلو کے ٹکڑے۔',
      },
    },
    roman: 'Biryani',
    aliases: ['biryani', 'biriyani', 'ghar ki biryani', 'biryani with raita', 'biryani meal'],
    grams: 46,
    gramsMax: 58,
    confidence: 'medium',
    source: 'FNDDS and CoFID biryani plus the raita row',
  },
  {
    id: 'meal-nihari-two-naan',
    category: 'salan',
    text: {
      en: {
        name: 'Meal: nihari with 2 tandoor naans',
        portion: '1 bowl with 2 naans of 120\u00A0g each',
        varies: 'The naan tier, which is nearly nine-tenths of this number. The nihari itself is the small part.',
      },
      ur: {
        name: 'نہاری، 2 تندوری نان کے ساتھ',
        portion: '1 پیالہ اور 120\u00A0گرام کے 2 نان',
        varies: 'نان کا سائز، جو اس نمبر کا قریب نو دسواں حصہ ہے۔ نہاری خود چھوٹا حصہ ہے۔',
      },
    },
    roman: 'Nihari',
    aliases: ['nihari', 'nehari', 'nihari naan', 'nihari meal', 'naan', 'curry', 'salan'],
    grams: 127,
    gramsMax: 138,
    confidence: 'medium',
    source: 'CALC from the nihari and naan rows',
  },
  {
    id: 'meal-nihari-one-naan',
    category: 'salan',
    text: {
      en: {
        name: 'Meal: nihari with 1 tandoor naan',
        portion: '1 bowl with 1 naan of 120\u00A0g',
        varies: 'The naan tier. The bread is the dose, not the dish.',
      },
      ur: {
        name: 'نہاری، 1 تندوری نان کے ساتھ',
        portion: '1 پیالہ اور 120\u00A0گرام کا 1 نان',
        varies: 'نان کا سائز۔ ڈوز روٹی کی بنتی ہے، ڈش کی نہیں۔',
      },
    },
    roman: 'Nihari',
    aliases: ['nihari', 'nehari', 'nihari naan', 'nihari meal', 'naan', 'curry', 'salan'],
    grams: 67,
    gramsMax: 78,
    confidence: 'medium',
    source: 'CALC from the nihari and naan rows',
  },
  {
    id: 'meal-halwa-puri-one',
    category: 'bread',
    text: {
      en: {
        name: 'Meal: halwa puri nashta, 1 puri',
        portion: '1 puri with halwa and chanay',
        varies: 'The puri count and how rich the halwa is. Puri 28, halwa 23, chanay 10.',
      },
      ur: {
        name: 'حلوہ پوری ناشتہ، 1 پوری',
        portion: '1 پوری، حلوے اور چنوں کے ساتھ',
        varies: 'پوریاں کتنی، اور حلوہ کتنا بھاری۔ پوری 28، حلوہ 23، چنے 10۔',
      },
    },
    roman: 'Halwa puri',
    aliases: ['halwa puri', 'halwa poori', 'nashta', 'breakfast', 'puri halwa'],
    grams: 61,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC composite',
  },
  {
    id: 'meal-halwa-puri-two',
    category: 'bread',
    text: {
      en: {
        name: 'Meal: halwa puri nashta, 2 puris',
        portion: '2 puris with halwa and chanay',
        varies: 'The puri count and the halwa richness. Each extra puri is 28\u00A0g.',
      },
      ur: {
        name: 'حلوہ پوری ناشتہ، 2 پوریاں',
        portion: '2 پوریاں، حلوے اور چنوں کے ساتھ',
        varies: 'پوریاں کتنی، اور حلوہ کتنا بھاری۔ ہر اگلی پوری 28\u00A0گرام ہے۔',
      },
    },
    roman: 'Halwa puri',
    aliases: ['halwa puri', 'halwa poori', 'nashta', 'breakfast', 'puri halwa'],
    grams: 89,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC composite plus one more puri',
  },
  {
    id: 'meal-sehri-paratha',
    category: 'bread',
    text: {
      en: {
        name: 'Meal: sehri paratha, omelette and doodh patti',
        portion: '1 home paratha, omelette, and 200\u00A0ml doodh patti with 2 sugars',
        varies: 'Paratha size and the cup. The omelette adds nothing.',
      },
      ur: {
        name: 'سحری: پراٹھا، آملیٹ اور دودھ پتی',
        portion: 'گھر کا 1 پراٹھا، آملیٹ، اور 200\u00A0ملی لیٹر دودھ پتی 2 چمچ چینی کے ساتھ',
        varies: 'پراٹھے کا سائز اور کپ۔ آملیٹ کچھ نہیں بڑھاتا۔',
      },
    },
    roman: 'Sehri',
    aliases: ['sehri', 'sehri paratha', 'suhoor', 'sahri', 'paratha', 'nashta'],
    grams: 60,
    gramsMax: 66,
    confidence: 'medium',
    source: 'CALC from LFAC-confirmed rows',
  },
  {
    id: 'meal-haleem-half-naan',
    category: 'salan',
    text: {
      en: {
        name: 'Meal: haleem bowl with half a naan',
        portion: '1 bowl, 250\u00A0g, with half a naan',
        varies: 'Bowl size and how thick the haleem was — see the haleem row, whose own spread is wider than this band.',
      },
      ur: {
        name: 'حلیم، آدھے نان کے ساتھ',
        portion: '1 پیالہ، 250\u00A0گرام، آدھے نان کے ساتھ',
        varies: 'پیالے کا سائز اور حلیم کتنی گاڑھی تھی — حلیم کی اپنی لائن دیکھیں، جس کا اپنا پھیلاؤ اس رینج سے بھی چوڑا ہے۔',
      },
    },
    roman: 'Haleem',
    aliases: ['haleem', 'halim', 'haleem naan', 'haleem meal', 'naan', 'curry', 'salan'],
    grams: 65,
    gramsMax: 68,
    confidence: 'low',
    source: 'CALC from the haleem and naan rows',
  },
  {
    id: 'meal-qorma-naan',
    category: 'salan',
    text: {
      en: {
        name: 'Meal: qorma with 1 naan, dawat serving',
        portion: '1 katori of qorma with a 120\u00A0g naan',
        varies: 'The naan tier, and the qorma thickener — UK and Pakistani qorma recipes disagree threefold on that.',
      },
      ur: {
        name: 'قورمہ، 1 نان کے ساتھ (دعوت)',
        portion: '1 کٹوری قورمہ، 120\u00A0گرام کے نان کے ساتھ',
        varies: 'نان کا سائز، اور قورمے کو گاڑھا کرنے والی چیز — برطانوی اور پاکستانی قورمے کی ترکیبیں اس پر تین گنا الجھی ہوئی ہیں۔',
      },
    },
    roman: 'Qorma',
    aliases: ['qorma', 'korma', 'kurma', 'qorma naan', 'dawat', 'naan', 'curry', 'salan'],
    grams: 67,
    gramsMax: 80,
    confidence: 'low',
    source: 'CALC from the qorma and naan rows',
  },
  {
    id: 'meal-bun-kabab-drink',
    category: 'snack',
    text: {
      en: {
        name: 'Meal: bun kabab with a 300\u00A0ml soft drink',
        portion: '1 bun kabab with a 300\u00A0ml bottle',
        varies: 'Whether the patty is aloo or shami, and the bottle size.',
      },
      ur: {
        name: 'بن کباب، کولڈ ڈرنک کے ساتھ',
        portion: '1 بن کباب، 300\u00A0ملی لیٹر کی بوتل کے ساتھ',
        varies: 'پیٹی آلو کی ہے یا شامی، اور بوتل کا سائز۔',
      },
    },
    roman: 'Bun kabab',
    aliases: ['bun kabab', 'bun kebab', 'bun kabab drink', 'burger meal'],
    grams: 66,
    gramsMax: 76,
    confidence: 'low',
    source: 'CALC from the bun kabab and soft-drink rows',
  },
  {
    id: 'meal-roll-drink',
    category: 'snack',
    text: {
      en: {
        name: 'Meal: kabab paratha roll with a 300\u00A0ml soft drink',
        portion: '1 roll with a 300\u00A0ml bottle',
        varies: 'Roll size. Two of the largest single items in this table, eaten together.',
      },
      ur: {
        name: 'کباب پراٹھا رول، کولڈ ڈرنک کے ساتھ',
        portion: '1 رول، 300\u00A0ملی لیٹر کی بوتل کے ساتھ',
        varies: 'رول کا سائز۔ اس فہرست کی دو سب سے بڑی اکیلی چیزیں، ایک ساتھ کھائی ہوئی۔',
      },
    },
    roman: 'Kabab paratha roll',
    aliases: ['kabab paratha roll', 'paratha roll', 'roll meal', 'roll and drink'],
    grams: 102,
    gramsMax: null,
    confidence: 'medium',
    source: 'LFAC roll plus the soft-drink row',
  },
  {
    id: 'meal-chai-two-biscuits',
    category: 'drink',
    text: {
      en: {
        name: 'Meal: chai with 2 tea biscuits',
        portion: '1 cup, 150\u00A0ml with 2 sugars, and 2 biscuits',
        varies: 'The cup, the spoons, and the biscuit — the biscuit weight behind this is the weakest number in the table.',
      },
      ur: {
        name: 'چائے، 2 بسکٹ کے ساتھ',
        portion: '1 پیالی، 150\u00A0ملی لیٹر 2 چمچ چینی کے ساتھ، اور 2 بسکٹ',
        varies: 'کپ، چمچ، اور بسکٹ — اس کے پیچھے بسکٹ کا وزن اس فہرست کا سب سے کمزور نمبر ہے۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaye', 'tea', 'chai biscuit', 'chai aur biscuit'],
    grams: 21,
    gramsMax: null,
    confidence: 'low',
    source: 'CALC from the chai grid and the Sooper row',
  },
  {
    id: 'meal-chai-cake-rusk',
    category: 'drink',
    text: {
      en: {
        name: 'Meal: chai with 1 cake rusk',
        portion: '1 cup, 150\u00A0ml with 2 sugars, and 1 cake rusk',
        varies: 'The cup and the spoons. The rusk is 11\u00A0g of it.',
      },
      ur: {
        name: 'چائے، 1 کیک رسک کے ساتھ',
        portion: '1 پیالی، 150\u00A0ملی لیٹر 2 چمچ چینی کے ساتھ، اور 1 کیک رسک',
        varies: 'کپ اور چمچ۔ رسک اس میں 11\u00A0گرام ہے۔',
      },
    },
    roman: 'Chai',
    aliases: ['chai', 'chaye', 'tea', 'chai rusk', 'chai aur rusk'],
    grams: 23,
    gramsMax: null,
    confidence: 'medium',
    source: 'CALC from the chai grid and the cake rusk row',
  },
  {
    id: 'meal-kat-a-kat-naan',
    category: 'salan',
    text: {
      en: {
        name: 'Meal: kat-a-kat with 2 naans',
        portion: '1 plate with 2 naans of 120\u00A0g each',
        varies: 'The naan tier, and it is the whole number — in a meat-dish meal the bread is the dose, not the dish.',
      },
      ur: {
        name: 'کٹاکٹ، 2 نان کے ساتھ',
        portion: '1 پلیٹ، 120\u00A0گرام کے 2 نان کے ساتھ',
        varies: 'نان کا سائز، اور سارا نمبر وہی ہے — گوشت والے کھانے میں ڈوز روٹی کی بنتی ہے، ڈش کی نہیں۔',
      },
    },
    roman: 'Kat-a-kat',
    aliases: ['kat a kat', 'kat-a-kat', 'katakat', 'tawa kat a kat', 'naan', 'curry', 'salan'],
    grams: 125,
    gramsMax: 128,
    confidence: 'low',
    source: 'CALC worked example from the naan rows',
  },
  {
    id: 'meal-shaadi-plate',
    category: 'salan',
    text: {
      en: {
        name: 'Meal: shaadi plate, qorma naan zarda and a drink',
        portion: '1 plate with qorma, naan, a katori of zarda and a cold drink',
        varies: 'The naan tier, the zarda serving and the bottle size. Zarda itself has never been analysed by anyone.',
      },
      ur: {
        name: 'شادی کی پلیٹ: قورمہ، نان، زردہ، کولڈ ڈرنک',
        portion: '1 پلیٹ: قورمہ، نان، 1 کٹوری زردہ اور کولڈ ڈرنک',
        varies: 'نان کا سائز، زردے کی مقدار اور بوتل کا سائز۔ زردے کو خود آج تک کسی نے ناپا نہیں۔',
      },
    },
    roman: 'Shaadi plate',
    aliases: ['shaadi plate', 'shadi plate', 'wedding plate', 'dawat plate', 'qorma', 'zarda'],
    grams: 123,
    gramsMax: 128,
    confidence: 'low',
    source: 'CALC worked example from the qorma, naan, zarda and soft-drink rows',
  },
  {
    id: 'meal-thela-chana-chaat',
    category: 'snack',
    text: {
      en: {
        name: 'Meal: thela chana chaat with potato and chutney',
        portion: '1 street plate with potato and meethi chutney',
        varies: 'The potato and the chutney. Street chaat is a full meal of carbohydrate, not a snack.',
      },
      ur: {
        name: 'چنا چاٹ، ٹھیلے والی، آلو اور میٹھی چٹنی',
        portion: 'ٹھیلے کی 1 پلیٹ، آلو اور میٹھی چٹنی کے ساتھ',
        varies: 'آلو اور چٹنی۔ ٹھیلے کی چاٹ پورا کھانا بھر کاربوہائیڈریٹ ہے، ہلکی پھلکی چیز نہیں۔',
      },
    },
    roman: 'Chana chaat',
    aliases: ['chana chaat', 'chana chat', 'thela chaat', 'street chaat', 'chaat'],
    grams: 45,
    gramsMax: 60,
    confidence: 'medium',
    source: 'CALC worked example, LFAC-adjusted',
  },

  // ── Packaged food (CARBS.md 20.1) ──────────────────────────────────────────
  // The packet beats this table. Every row here is a named product or a
  // generic reference, and a formulation changes by country and by year.
  {
    id: 'chocolate-milk-bar',
    category: 'packaged',
    text: {
      en: {
        name: 'Milk chocolate bar, Cadbury Dairy Milk',
        portion: '1 single bar, 45\u00A0g',
        varies: 'Which formulation and which country made it. This is the UK recipe at 57\u00A0g per 100 — read the panel on the pack in your hand, because it beats this row.',
      },
      ur: {
        name: 'Cadbury Dairy Milk چاکلیٹ، سنگل بار',
        portion: '1 سنگل بار، 45\u00A0گرام',
        varies: 'کون سی ترکیب اور کس ملک کی بنی۔ یہ برطانوی ترکیب ہے، ہر 100\u00A0گرام میں 57\u00A0گرام — ہاتھ والے پیک کا پینل پڑھ لیں، وہ اس لائن سے بہتر ہے۔',
      },
    },
    roman: 'Cadbury Dairy Milk',
    aliases: ['chocolate', 'cadbury', 'dairy milk', 'chaklet', 'milk chocolate', 'cadbury dairy milk'],
    grams: 26,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL, two manufacturer declarations of the same recipe',
  },
  {
    id: 'chocolate-milk-block',
    category: 'packaged',
    text: {
      en: {
        name: 'Milk chocolate sharing block, Cadbury Dairy Milk',
        portion: '1 sharing block, 180\u00A0g',
        varies: 'How much of the block you ate, and it is the only thing that matters — count grams eaten times 57, divided by 100.',
      },
      ur: {
        name: 'Cadbury Dairy Milk چاکلیٹ، بڑا بلاک',
        portion: '1 بڑا بلاک، 180\u00A0گرام',
        varies: 'بلاک میں سے کتنا کھایا، اور بس یہی — جتنے گرام کھائے انہیں 57 سے ضرب دے کر 100 پر تقسیم کر لیں۔',
      },
    },
    roman: 'Cadbury Dairy Milk',
    aliases: ['chocolate', 'cadbury', 'dairy milk', 'chaklet', 'sharing block', 'cadbury dairy milk'],
    grams: 103,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL, retailer panel agrees at 57\u00A0g per 100',
  },
  {
    id: 'chocolate-dark-70',
    category: 'packaged',
    text: {
      en: {
        name: 'Dark chocolate 70 per cent, Lindt Excellence',
        portion: '1 block, 100\u00A0g',
        varies: 'How much of the block. A weighed 20\u00A0g portion is 6.8\u00A0g.',
      },
      ur: {
        name: 'Lindt Excellence ڈارک چاکلیٹ، 70 فیصد',
        portion: '1 بلاک، 100\u00A0گرام',
        varies: 'بلاک میں سے کتنا۔ تولا ہوا 20\u00A0گرام ٹکڑا 6.8\u00A0گرام ہے۔',
      },
    },
    roman: 'Lindt Excellence',
    aliases: ['chocolate', 'dark chocolate', 'lindt', 'chaklet', 'lindt excellence', '70 percent'],
    grams: 34,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL',
  },
  {
    id: 'chocolate-dark-85',
    category: 'packaged',
    text: {
      en: {
        name: 'Dark chocolate 85 per cent, Lindt Excellence',
        portion: '1 block, 100\u00A0g',
        varies: 'How much of the block. A weighed 20\u00A0g portion is 4.4\u00A0g.',
      },
      ur: {
        name: 'Lindt Excellence ڈارک چاکلیٹ، 85 فیصد',
        portion: '1 بلاک، 100\u00A0گرام',
        varies: 'بلاک میں سے کتنا۔ تولا ہوا 20\u00A0گرام ٹکڑا 4.4\u00A0گرام ہے۔',
      },
    },
    roman: 'Lindt Excellence',
    aliases: ['chocolate', 'dark chocolate', 'lindt', 'chaklet', 'lindt excellence', '85 percent'],
    grams: 22,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL',
  },
  {
    id: 'chocolate-dark-90',
    category: 'packaged',
    text: {
      en: {
        name: 'Dark chocolate 90 per cent, Lindt Excellence',
        portion: '1 block, 100\u00A0g',
        varies: 'How much of the block. A weighed 20\u00A0g portion is 2.8\u00A0g. No formula links cocoa percentage to carbohydrate, so another brand at 90 per cent is not this number.',
      },
      ur: {
        name: 'Lindt Excellence ڈارک چاکلیٹ، 90 فیصد',
        portion: '1 بلاک، 100\u00A0گرام',
        varies: 'بلاک میں سے کتنا۔ تولا ہوا 20\u00A0گرام ٹکڑا 2.8\u00A0گرام ہے۔ کوکو کے فیصد سے کاربوہائیڈریٹ کا کوئی کلیہ نہیں نکلتا، اس لیے کسی اور برانڈ کا 90 فیصد یہ نمبر نہیں ہے۔',
      },
    },
    roman: 'Lindt Excellence',
    aliases: ['chocolate', 'dark chocolate', 'lindt', 'chaklet', 'lindt excellence', '90 percent'],
    grams: 14,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL',
  },
  {
    id: 'chocolate-caramel-bar',
    category: 'packaged',
    text: {
      en: {
        name: 'Caramel-filled chocolate bar, Cadbury Dairy Milk Caramel',
        portion: '1 single bar, 45\u00A0g',
        varies: 'The filling, and the country of manufacture. This does not cover peanut, nougat or coconut bars — those need their own panel.',
      },
      ur: {
        name: 'Cadbury Dairy Milk Caramel چاکلیٹ، سنگل بار',
        portion: '1 سنگل بار، 45\u00A0گرام',
        varies: 'بھرائی، اور کس ملک کی بنی۔ یہ مونگ پھلی، نوگٹ یا ناریل والی باروں کے لیے نہیں — ان کا اپنا پینل چاہیے۔',
      },
    },
    roman: 'Cadbury Dairy Milk Caramel',
    aliases: ['chocolate', 'caramel', 'cadbury caramel', 'dairy milk caramel', 'chaklet', 'cadbury dairy milk caramel'],
    grams: 28,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL at 62\u00A0g per 100',
  },
  {
    id: 'chocolate-caramel-block',
    category: 'packaged',
    text: {
      en: {
        name: 'Caramel chocolate sharing block, Cadbury Dairy Milk Caramel',
        portion: '1 sharing block, 120\u00A0g',
        varies: 'How much of the block you ate.',
      },
      ur: {
        name: 'Cadbury Dairy Milk Caramel چاکلیٹ، بڑا بلاک',
        portion: '1 بڑا بلاک، 120\u00A0گرام',
        varies: 'بلاک میں سے کتنا کھایا۔',
      },
    },
    roman: 'Cadbury Dairy Milk Caramel',
    aliases: ['chocolate', 'caramel', 'cadbury caramel', 'dairy milk caramel', 'sharing block', 'cadbury dairy milk caramel'],
    grams: 74,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL at 62\u00A0g per 100',
  },
  {
    id: 'kitkat-4-finger',
    category: 'packaged',
    text: {
      en: {
        name: 'Chocolate wafer bar, KitKat 4 Finger',
        portion: '1 bar, 41.5\u00A0g',
        varies: 'Regional formulation, and how many fingers. This is the UK bar; match the import origin on the wrapper.',
      },
      ur: {
        name: 'KitKat ویفر چاکلیٹ، 4 فنگر',
        portion: '1 بار، 41.5\u00A0گرام',
        varies: 'کس خطے کی ترکیب، اور کتنی فنگرز۔ یہ برطانوی بار ہے؛ ریپر پر امپورٹ کا ملک ملا لیں۔',
      },
    },
    roman: 'KitKat',
    aliases: ['chocolate', 'kitkat', 'kit kat', 'wafer', 'chaklet', 'chocolate wafer'],
    grams: 26,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL, CALC to the bar weight',
  },
  {
    id: 'biscuit-tea-pack-small',
    category: 'packaged',
    text: {
      en: {
        name: 'Plain tea biscuits, snack pack',
        portion: '1 snack pack, 32.6\u00A0g',
        varies: 'This is a UK semi-sweet benchmark, not a measured Pakistani Marie or Sooper. A richer egg, milk or butter biscuit runs higher. Weigh what you eat and read the panel.',
      },
      ur: {
        name: 'سادے بسکٹ، چھوٹا پیک',
        portion: '1 چھوٹا پیک، 32.6\u00A0گرام',
        varies: 'یہ برطانوی سادہ بسکٹ کا معیار ہے، ناپا ہوا پاکستانی Marie یا Sooper نہیں۔ انڈے، دودھ یا مکھن والا بھاری بسکٹ اس سے اوپر جاتا ہے۔ جو کھائیں اسے تولیں اور پینل پڑھیں۔',
      },
    },
    roman: 'Plain tea biscuits',
    aliases: ['biscuit', 'biscuits', 'tea biscuit', 'marie', 'semi sweet biscuit', 'plain tea biscuits'],
    grams: 22.6,
    gramsMax: null,
    confidence: 'low',
    source: 'CoFID converted, CALC — no Pakistani manufacturer panel verified',
  },
  {
    id: 'biscuit-tea-pack-family',
    category: 'packaged',
    text: {
      en: {
        name: 'Plain tea biscuits, family pack',
        portion: '1 family pack, 200\u00A0g',
        varies: 'How much of the pack. Nobody eats 200\u00A0g at once — weigh what you take.',
      },
      ur: {
        name: 'سادے بسکٹ، فیملی پیک',
        portion: '1 فیملی پیک، 200\u00A0گرام',
        varies: 'پیک میں سے کتنا۔ 200\u00A0گرام ایک بار میں کوئی نہیں کھاتا — جتنا لیں اتنا تولیں۔',
      },
    },
    roman: 'Plain tea biscuits',
    aliases: ['biscuit', 'biscuits', 'tea biscuit', 'marie', 'family pack', 'plain tea biscuits'],
    grams: 138.9,
    gramsMax: null,
    confidence: 'low',
    source: 'CoFID converted, CALC — no Pakistani manufacturer panel verified',
  },
  {
    id: 'biscuit-sandwich-small',
    category: 'packaged',
    text: {
      en: {
        name: 'Cream sandwich biscuits, small pack',
        portion: '1 small pack, 19\u00A0g',
        varies: 'The cream share and the recipe. The UK vanilla panel declares 68\u00A0g per 100, inside this band.',
      },
      ur: {
        name: 'کریم والے بسکٹ، چھوٹا پیک',
        portion: '1 چھوٹا پیک، 19\u00A0گرام',
        varies: 'کریم کا حصہ اور ترکیب۔ برطانوی ونیلا پینل ہر 100\u00A0گرام پر 68\u00A0گرام بتاتا ہے، اسی رینج کے اندر۔',
      },
    },
    roman: 'Cream-filled sandwich biscuits',
    aliases: ['biscuit', 'biscuits', 'oreo', 'cream biscuit', 'sandwich biscuit', 'cream-filled sandwich biscuits'],
    grams: 11.6,
    gramsMax: 13.4,
    confidence: 'medium',
    source: 'CoFID converted, USDA-SR, CALC — not a Pakistani label',
  },
  {
    id: 'biscuit-sandwich-roll',
    category: 'packaged',
    text: {
      en: {
        name: 'Cream sandwich biscuits, larger pack',
        portion: '1 larger pack, 119.6\u00A0g',
        varies: 'The cream share, and how much of the pack. One retailer page says 133\u00A0g where its own title says 119.6 — use the wrapper.',
      },
      ur: {
        name: 'کریم والے بسکٹ، بڑا پیک',
        portion: '1 بڑا پیک، 119.6\u00A0گرام',
        varies: 'کریم کا حصہ، اور پیک میں سے کتنا۔ ایک دکان کا صفحہ 133\u00A0گرام کہتا ہے جہاں خود اس کا عنوان 119.6 کہتا ہے — ریپر والا مانیں۔',
      },
    },
    roman: 'Cream-filled sandwich biscuits',
    aliases: ['biscuit', 'biscuits', 'oreo', 'cream biscuit', 'sandwich biscuit', 'cream-filled sandwich biscuits'],
    grams: 73.3,
    gramsMax: 84.4,
    confidence: 'medium',
    source: 'CoFID converted, USDA-SR, CALC — not a Pakistani label',
  },
  {
    id: 'wafer-loacker-small',
    category: 'packaged',
    text: {
      en: {
        name: 'Cream wafers, Loacker snack pack',
        portion: '1 snack pack, 45\u00A0g',
        varies: 'The filling and fat share. This is the hazelnut Napolitaner at 58\u00A0g per 100.',
      },
      ur: {
        name: 'Loacker ویفر، چھوٹا پیک',
        portion: '1 چھوٹا پیک، 45\u00A0گرام',
        varies: 'بھرائی اور چکنائی کا حصہ۔ یہ ہیزل نٹ Napolitaner ہے، ہر 100\u00A0گرام میں 58\u00A0گرام۔',
      },
    },
    roman: 'Loacker Classic Napolitaner',
    aliases: ['wafer', 'wafers', 'loacker', 'biscuit', 'napolitaner', 'loacker classic napolitaner'],
    grams: 26.1,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL, CALC',
  },
  {
    id: 'wafer-loacker-sharing',
    category: 'packaged',
    text: {
      en: {
        name: 'Cream wafers, Loacker sharing pack',
        portion: '1 sharing pack, 175\u00A0g',
        varies: 'How much of the pack you ate.',
      },
      ur: {
        name: 'Loacker ویفر، بڑا پیک',
        portion: '1 بڑا پیک، 175\u00A0گرام',
        varies: 'پیک میں سے کتنا کھایا۔',
      },
    },
    roman: 'Loacker Classic Napolitaner',
    aliases: ['wafer', 'wafers', 'loacker', 'biscuit', 'sharing pack', 'loacker classic napolitaner'],
    grams: 101.5,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL, CALC',
  },
  {
    id: 'wafer-unidentified',
    category: 'packaged',
    text: {
      en: {
        name: 'Cream wafers, brand not identified',
        portion: '1 snack pack, 45\u00A0g',
        varies: 'Which recipe. Observed wafers run 58 to 69\u00A0g per 100 and no midpoint was picked — read the panel if the pack has one.',
      },
      ur: {
        name: 'کریم ویفر، برانڈ معلوم نہیں',
        portion: '1 چھوٹا پیک، 45\u00A0گرام',
        varies: 'کون سی ترکیب۔ دیکھے گئے ویفر ہر 100\u00A0گرام پر 58 سے 69\u00A0گرام تک ہیں اور کوئی بیچ کا نمبر نہیں چنا گیا — پیک پر پینل ہو تو وہی پڑھیں۔',
      },
    },
    roman: 'Loacker Classic Napolitaner',
    aliases: ['wafer', 'wafers', 'biscuit', 'cream wafer', 'unknown wafer'],
    grams: 26,
    gramsMax: 31,
    confidence: 'low',
    source: 'LABEL, USDA-SR sugar wafers, CALC — spread retained',
  },
  {
    id: 'boiled-sweet-one',
    category: 'packaged',
    text: {
      en: {
        name: 'Boiled sweet, one piece',
        portion: '1 weighed sweet, 5\u00A0g',
        varies: 'Piece weight and recipe — 5\u00A0g is a weighing example, not a verified Pakistani sweet weight. Sugar-free sweets are a different product and are not covered here.',
      },
      ur: {
        name: 'سخت ٹافی (چوسنے والی)، 1 عدد',
        portion: '1 ٹافی، تول کر 5\u00A0گرام',
        varies: 'ٹکڑے کا وزن اور ترکیب — 5\u00A0گرام تولنے کی ایک مثال ہے، کسی پاکستانی ٹافی کا جانچا ہوا وزن نہیں۔ شوگر فری ٹافیاں الگ چیز ہیں اور یہاں شامل نہیں۔',
      },
    },
    roman: 'Boiled sweets',
    aliases: ['boiled sweets', 'hard candy', 'toffee', 'candy', 'sweet', 'mithai candy', 'eclairs'],
    grams: 4.2,
    gramsMax: 4.9,
    confidence: 'low',
    source: 'CoFID converted, USDA-SR hard candy — spread retained',
  },
  {
    id: 'boiled-sweet-tin',
    category: 'packaged',
    text: {
      en: {
        name: 'Boiled sweets, sharing tin',
        portion: '1 sharing tin, 200\u00A0g',
        varies: 'How many you ate out of it. Count the pieces, not the tin.',
      },
      ur: {
        name: 'سخت ٹافی (چوسنے والی)، پورا ڈبہ',
        portion: 'پورا ڈبہ، 200\u00A0گرام',
        varies: 'ڈبے میں سے کتنی کھائیں۔ دانے گنیں، ڈبہ نہیں۔',
      },
    },
    roman: 'Boiled sweets',
    aliases: ['boiled sweets', 'hard candy', 'candy tin', 'candy', 'sweet jar'],
    grams: 166.8,
    gramsMax: 196,
    confidence: 'low',
    source: 'CoFID converted, USDA-SR hard candy — spread retained',
  },
  {
    id: 'toffee-one',
    category: 'packaged',
    text: {
      en: {
        name: 'Toffee or milk caramel, one piece',
        portion: '1 weighed toffee, 5\u00A0g',
        varies: 'Piece weight, and whether milk, butter, filling or polyols went in. The individual piece weight of a local toffee was never verified.',
      },
      ur: {
        name: 'نرم ٹافی (کیریمل)، 1 عدد',
        portion: '1 ٹافی، تول کر 5\u00A0گرام',
        varies: 'ٹکڑے کا وزن، اور دودھ، مکھن، بھرائی یا شوگر فری مٹھاس پڑی ہے یا نہیں۔ مقامی ٹافی کے فی دانہ وزن کی کبھی تصدیق نہیں ہوئی۔',
      },
    },
    roman: 'Toffees',
    aliases: ['toffees', 'toffee', 'caramel', 'candy', 'sweet', 'milk toffee'],
    grams: 3,
    gramsMax: 3.9,
    confidence: 'low',
    source: 'CoFID converted, USDA-SR caramels — spread retained',
  },
  {
    id: 'toffee-pouch',
    category: 'packaged',
    text: {
      en: {
        name: 'Toffees, sharing pouch',
        portion: '1 sharing pouch, 250\u00A0g',
        varies: 'How many you ate out of it. Count the pieces.',
      },
      ur: {
        name: 'نرم ٹافی (کیریمل)، پوری تھیلی',
        portion: 'پوری تھیلی، 250\u00A0گرام',
        varies: 'تھیلی میں سے کتنی کھائیں۔ دانے گن لیں۔',
      },
    },
    roman: 'Toffees',
    aliases: ['toffees', 'toffee', 'caramel', 'candy pouch', 'sweet pouch'],
    grams: 149.8,
    gramsMax: 192.5,
    confidence: 'low',
    source: 'CoFID converted, USDA-SR caramels — spread retained',
  },
  {
    id: 'corn-snack-small',
    category: 'packaged',
    text: {
      en: {
        name: 'Corn snacks or cheese puffs, small bag',
        portion: '1 small bag, 23\u00A0g',
        varies: 'Extrusion, frying and ingredients. The local recipe was never confirmed, so the spread is kept.',
      },
      ur: {
        name: 'کارن اسنیکس یا چیز پفس، چھوٹا پیک',
        portion: '1 چھوٹا پیک، 23\u00A0گرام',
        varies: 'بننے کا طریقہ، تلائی اور اجزاء۔ مقامی ترکیب کی کبھی تصدیق نہیں ہوئی، اس لیے رینج کھلی رکھی گئی ہے۔',
      },
    },
    roman: 'Extruded corn snacks',
    aliases: ['corn snacks', 'cheese puffs', 'cheetos', 'kurkure', 'crisps', 'chips', 'extruded corn snacks'],
    grams: 11.7,
    gramsMax: 14.2,
    confidence: 'medium',
    source: 'USDA-SR minus fibre, CoFID converted, CALC',
  },
  {
    id: 'corn-snack-medium',
    category: 'packaged',
    text: {
      en: {
        name: 'Corn snacks or cheese puffs, larger bag',
        portion: '1 larger bag, 99.2\u00A0g',
        varies: 'Recipe, and how much of the bag.',
      },
      ur: {
        name: 'کارن اسنیکس یا چیز پفس، درمیانہ پیک',
        portion: '1 درمیانہ پیک، 99.2\u00A0گرام',
        varies: 'ترکیب، اور پیک میں سے کتنا۔',
      },
    },
    roman: 'Extruded corn snacks',
    aliases: ['corn snacks', 'cheese puffs', 'cheetos', 'kurkure', 'crisps', 'chips', 'extruded corn snacks'],
    grams: 50.6,
    gramsMax: 61.3,
    confidence: 'medium',
    source: 'USDA-SR minus fibre, CoFID converted, CALC',
  },
  {
    id: 'corn-snack-sharing',
    category: 'packaged',
    text: {
      en: {
        name: 'Corn snacks or cheese puffs, sharing bag',
        portion: '1 sharing bag, 226.8\u00A0g',
        varies: 'How much of the bag. Nobody eats a sharing bag alone on purpose, and this is why it is listed.',
      },
      ur: {
        name: 'کارن اسنیکس یا چیز پفس، بڑا پیک',
        portion: '1 بڑا پیک، 226.8\u00A0گرام',
        varies: 'پیک میں سے کتنا۔ بڑا شیئرنگ پیک جان بوجھ کر کوئی اکیلا نہیں کھاتا، اور اسی لیے یہ یہاں درج ہے۔',
      },
    },
    roman: 'Extruded corn snacks',
    aliases: ['corn snacks', 'cheese puffs', 'cheetos', 'sharing bag', 'crisps', 'chips', 'extruded corn snacks'],
    grams: 115.7,
    gramsMax: 140.2,
    confidence: 'medium',
    source: 'USDA-SR minus fibre, CoFID converted, CALC',
  },
  {
    id: 'nimco-pack-small',
    category: 'packaged',
    text: {
      en: {
        name: 'Nimco or Bombay mix, small pack',
        portion: '1 small pack, 45\u00A0g',
        varies: 'The mix proportions, and they dominate everything else. A papri-, rice- or potato-heavy mixture needs its own panel; this band is a composite against one commercial specification, not a survey of Pakistani nimco.',
      },
      ur: {
        name: 'نمکو، چھوٹا پیک',
        portion: '1 چھوٹا پیک، 45\u00A0گرام',
        varies: 'مکس کا تناسب، اور وہی باقی سب پر بھاری ہے۔ پاپڑی، چاول یا آلو زیادہ والے مکس کو اپنا پینل چاہیے؛ یہ رینج ایک کمرشل نسخے سے جوڑی گئی ہے، پاکستانی نمکو کے سروے سے نہیں۔',
      },
    },
    roman: 'Nimco',
    aliases: ['nimco', 'nimko', 'namkeen', 'namkin', 'bombay mix', 'mixture', 'dal moth'],
    grams: 14.4,
    gramsMax: 21.6,
    confidence: 'low',
    source: 'CoFID converted, LABEL Cofresh specification, CALC — both endpoints retained',
  },
  {
    id: 'nimco-pack-sharing',
    category: 'packaged',
    text: {
      en: {
        name: 'Nimco or Bombay mix, sharing pack',
        portion: '1 sharing pack, 200\u00A0g',
        varies: 'The mix, and how much of the pack. Weigh what you take.',
      },
      ur: {
        name: 'نمکو، بڑا پیک',
        portion: '1 بڑا پیک، 200\u00A0گرام',
        varies: 'مکس، اور پیک میں سے کتنا۔ جتنا لیں اتنا تول لیں۔',
      },
    },
    roman: 'Nimco',
    aliases: ['nimco', 'nimko', 'namkeen', 'namkin', 'bombay mix', 'mixture', 'sharing pack'],
    grams: 64,
    gramsMax: 96,
    confidence: 'low',
    source: 'CoFID converted, LABEL Cofresh specification, CALC — both endpoints retained',
  },
  {
    id: 'peanuts-pack-small',
    category: 'packaged',
    text: {
      en: {
        name: 'Salted peanuts, small pack',
        portion: '1 small pack, 27\u00A0g',
        varies: 'Roast and composition. Peanuts are nearly free once fibre is taken out — importing the raw by-difference figure here would push insulin up for no reason. No besan or sugar coating and no raisins are included.',
      },
      ur: {
        name: 'نمکین مونگ پھلی، چھوٹا پیک',
        portion: '1 چھوٹا پیک، 27\u00A0گرام',
        varies: 'بھنائی اور اجزاء۔ فائبر نکال دیں تو مونگ پھلی میں تقریباً کچھ نہیں بچتا — یہاں کچا خام نمبر رکھ دیتے تو بلاوجہ انسولین بڑھتی۔ بیسن یا چینی چڑھی، اور کشمش والی، اس میں شامل نہیں۔',
      },
    },
    roman: 'Salted peanuts',
    aliases: ['peanuts', 'moongphali', 'mungfali', 'salted peanuts', 'nuts', 'chilgoza'],
    grams: 1.6,
    gramsMax: 3.5,
    confidence: 'low',
    source: 'USDA-SR minus fibre, CoFID converted, CALC — spread retained',
  },
  {
    id: 'peanuts-pack-sharing',
    category: 'packaged',
    text: {
      en: {
        name: 'Salted peanuts, sharing bag',
        portion: '1 sharing bag, 200\u00A0g',
        varies: 'Roast and composition, and how much of the bag. A coated or sweetened peanut is a different food.',
      },
      ur: {
        name: 'نمکین مونگ پھلی، بڑا پیک',
        portion: '1 بڑا پیک، 200\u00A0گرام',
        varies: 'بھنائی اور اجزاء، اور تھیلی میں سے کتنا۔ کوٹنگ یا مٹھاس چڑھی مونگ پھلی الگ چیز ہے۔',
      },
    },
    roman: 'Salted peanuts',
    aliases: ['peanuts', 'moongphali', 'mungfali', 'salted peanuts', 'nuts', 'sharing bag'],
    grams: 11.7,
    gramsMax: 25.7,
    confidence: 'low',
    source: 'USDA-SR minus fibre, CoFID converted, CALC — spread retained',
  },

  // ── Habshi halwa, the two labelled products (CARBS.md 20.2) ────────────────
  {
    id: 'habshi-halwa-royal',
    category: 'packaged',
    text: {
      en: {
        name: 'Habshi halwa, Royal Special packaged',
        portion: '1 weighed portion, 50\u00A0g',
        varies: 'This is one UK product at 43.5\u00A0g per 100, not a Karachi sweet-shop recipe. A whole 300\u00A0g box is 130.5\u00A0g. Do not treat Karachi or Bombay halwa as the same food.',
      },
      ur: {
        name: 'Royal Special حبشی حلوہ',
        portion: 'تول کر 50\u00A0گرام',
        varies: 'یہ ایک برطانوی پروڈکٹ ہے، ہر 100\u00A0گرام میں 43.5\u00A0گرام — کراچی کے حلوائی کی ترکیب نہیں۔ پورا 300\u00A0گرام کا ڈبہ 130.5\u00A0گرام ہے۔ کراچی یا بمبئی حلوے کو یہی چیز نہ سمجھیں۔',
      },
    },
    roman: 'Royal Special Habshi Halwa',
    aliases: ['habshi halwa', 'habshi', 'halwa', 'royal habshi halwa', 'royal special habshi halwa', 'mithai'],
    grams: 21.8,
    gramsMax: null,
    confidence: 'medium',
    source: 'LABEL, retailer reproduction, energy cross-check passes',
  },
  {
    id: 'habshi-halwa-yaadgaar',
    category: 'packaged',
    text: {
      en: {
        name: 'Habshi halwa, Yaadgaar bakery',
        portion: '1 weighed portion, 50\u00A0g',
        varies: 'This is one UK bakery product at 58\u00A0g per 100, with a small energy inconsistency on its own label. Using it where the other product applies adds about 7\u00A0g per 50\u00A0g, in the over-dosing direction.',
      },
      ur: {
        name: 'Yaadgaar حبشی حلوہ',
        portion: 'تول کر 50\u00A0گرام',
        varies: 'یہ ایک برطانوی بیکری کی چیز ہے، ہر 100\u00A0گرام میں 58\u00A0گرام، اور خود اس کے لیبل پر توانائی کا چھوٹا سا تضاد ہے۔ جہاں دوسری والی بنتی ہو وہاں اسے لگانا ہر 50\u00A0گرام پر تقریباً 7\u00A0گرام بڑھا دیتا ہے، زیادہ ڈوز کی سمت میں۔',
      },
    },
    roman: 'Yaadgaar',
    aliases: ['habshi halwa', 'habshi', 'halwa', 'yaadgaar', 'yadgar halwa', 'mithai'],
    grams: 29,
    gramsMax: null,
    confidence: 'low',
    source: 'LABEL, manufacturer website — single declaration',
  },

  // ── Added 2026-09-25: dishes whose ABSENCE was the hazard ───────────────
  //
  // A search that returns nothing is not read as "this has no carbohydrate",
  // it is read as "the app does not know" — and this table's search is
  // substring-based, so a missing dish gets answered by an accidental match.
  // `paya` returned "Papaya, cup of cubes" at 14 g; `butter` returned butter
  // naan at 85; `ghee` returned roghni naan at 72; `yakhni` returned meat
  // pulao at 29; `chutney` returned a 45 g thela meal. Every one of those is
  // the OVER-dose direction. A real row retires each, because a true match
  // outranks a substring accident.
  //
  // Several are deliberately near-zero. That is the point: "do not dose for
  // this" is an answer, and the app could not give it.

  {
    id: 'sajji',
    category: 'salan',
    text: {
      en: {
        name: 'Sajji, salt-roasted chicken or lamb',
        portion: '1 helping, leg or quarter',
        varies: 'Plain salted roast meat, so nothing — do not dose for this. The rice a Balochi sajji is stuffed with, or served on, is the dose: count it as the pulao row.',
      },
      ur: {
        name: 'سجی، نمک لگا بھنا گوشت',
        portion: '1 حصہ، ران یا چوتھائی',
        varies: 'سادہ نمکین بھنا گوشت، تو کچھ نہیں — اس کے لیے انسولین نہ لگائیں۔ بلوچی سجی میں جو چاول بھرے ہوتے ہیں یا ساتھ آتے ہیں، اصل عدد وہ ہے: انہیں پلاؤ والی لائن سے گنیں۔',
      },
    },
    roman: 'Sajji',
    aliases: ['sajji', 'saji', 'balochi sajji', 'chicken sajji', 'lamb sajji', 'mutton sajji', 'namkeen gosht', 'rosh', 'namkeen rosh'],
    grams: 0,
    gramsMax: 4,
    confidence: 'high',
    source: 'CoFID, USDA protein anchors',
  },
  {
    id: 'chargha',
    category: 'salan',
    text: {
      en: {
        name: 'Chargha or steam roast, quarter',
        portion: '1 quarter of a chicken',
        varies: 'The marinade coat and nothing else. Yoghurt and spice alone is 1 to 2; a besan or flour coat pushes toward 5. The chicken is 0. A breaded broast is its own row.',
      },
      ur: {
        name: 'چرغہ یا سٹیم روسٹ، چوتھائی',
        portion: '1 چوتھائی مرغی',
        varies: 'صرف مصالحے کی تہہ، اور کچھ نہیں۔ دہی اور مصالحہ اکیلا 1 سے 2؛ بیسن یا آٹے کی تہہ اسے 5 کی طرف لے جاتی ہے۔ مرغی 0 ہے۔ بریڈڈ بروسٹ کی اپنی الگ سطر ہے۔',
      },
    },
    roman: 'Chargha',
    aliases: ['chargha', 'charga', 'chicken chargha', 'lahori chargha', 'steam roast', 'steam roast chicken'],
    grams: 1,
    gramsMax: 5,
    confidence: 'low',
    source: 'CALC from USDA yoghurt and besan, six named marinade recipes per quarter bird',
  },
  {
    id: 'broast-quarter',
    category: 'snack',
    text: {
      en: {
        name: 'Fried chicken, broast',
        portion: '1 quarter, leg and thigh, with the coating',
        varies: 'The crispy coating is the whole number — the chicken under it is 0, and coating left on the plate halves it. The bun and fries beside it are their own rows.',
      },
      ur: {
        name: 'فرائیڈ چکن، بروسٹ',
        portion: '1 چوتھائی، ران اور تھائی، کوٹنگ سمیت',
        varies: 'اوپر کی کرسپی کوٹنگ ہی پورا عدد ہے — نیچے کی مرغی 0 ہے، اور کوٹنگ پلیٹ میں چھوڑ دیں تو عدد آدھا۔ ساتھ کا بن اور فرائز الگ لائنیں ہیں۔',
      },
    },
    roman: 'Broast',
    aliases: ['broast', 'chicken broast', 'fried chicken', 'crispy chicken'],
    grams: 15,
    gramsMax: 22,
    confidence: 'medium',
    source: 'FNDDS fried coated chicken, 12.1 per 100\u00A0g',
  },
  {
    id: 'jhinga',
    category: 'salan',
    text: {
      en: {
        name: 'Jhinga, prawns, plain or karahi',
        portion: '1 helping',
        varies: 'Prawn meat is 0. A karahi masala adds a few grams. A besan or crumb coat on fried prawns is different — count that like the fried fish row.',
      },
      ur: {
        name: 'جھینگا، سادہ یا کڑاہی',
        portion: '1 حصہ',
        varies: 'جھینگے کا گوشت 0 ہے۔ کڑاہی کا مصالحہ چند گرام بڑھا دیتا ہے۔ تلے ہوئے جھینگوں پر بیسن یا بریڈ کرمب ہو تو بات الگ ہے — اسے تلی مچھلی والی لائن کی طرح گنیں۔',
      },
    },
    roman: 'Jhinga',
    aliases: ['jhinga', 'jheenga', 'jhinga karahi', 'prawn', 'prawns', 'prawn karahi', 'shrimp'],
    grams: 0,
    gramsMax: 6,
    confidence: 'medium',
    source: 'USDA crustaceans; CALC masala',
  },
  {
    id: 'paya',
    category: 'salan',
    text: {
      en: {
        name: 'Paya, trotters',
        portion: '1 bowl, 250\u00A0g',
        varies: 'The atta slurry that thickens the gravy — the trotters, marrow and gelatin are 0. Gravy that runs off the spoon is near 5; gravy that coats it is near 18, the same eightfold flour spread as nihari. The naan is most of the meal\u2019s dose.',
      },
      ur: {
        name: 'پائے',
        portion: '1 پیالہ، 250\u00A0گرام',
        varies: 'شوربے کو گاڑھا کرنے والا آٹا ہی عدد ہے — پائے، گودا اور جیلاٹن 0 ہیں۔ شوربہ چمچ سے بہہ جائے تو 5 کے قریب؛ چمچ پر جم جائے تو 18 کے قریب، نہاری والا ہی آٹھ گنا فرق۔ ساتھ کا نان ہی کھانے کا زیادہ تر عدد ہے۔',
      },
    },
    roman: 'Paya',
    aliases: ['paya', 'paaya', 'paye', 'payay', 'siri paya', 'paya curry', 'trotters'],
    grams: 5,
    gramsMax: 18,
    confidence: 'low',
    source: 'CALC from the nihari flour range and the salan pattern',
  },
  {
    id: 'organ-fry',
    category: 'salan',
    text: {
      en: {
        name: 'Kat-a-kat, maghaz or gurda-kapura, dish only',
        portion: '1 katori, 150\u00A0g',
        varies: 'The onion-tomato masala and the splash of malai — the brain, kidneys and meat are 0. KHAN\u2019s qeema at 10 and kaleji at 15 bracket this family. The roti or naan is the dose.',
      },
      ur: {
        name: 'کٹاکٹ، مغز یا گردہ کپورہ، صرف ڈش',
        portion: '1 کٹوری، 150\u00A0گرام',
        varies: 'پیاز ٹماٹر کا مصالحہ اور تھوڑی سی بالائی — مغز، گردے اور گوشت 0 ہیں۔ ساتھ کی روٹی یا نان ہی اصل عدد ہے۔',
      },
    },
    roman: 'Kat-a-kat',
    aliases: ['kat a kat', 'kat-a-kat', 'katakat', 'kata kat', 'taka tak', 'maghaz', 'bheja', 'brain masala', 'gurda', 'kapura', 'gurda kapura', 'ojri'],
    grams: 5,
    gramsMax: 15,
    confidence: 'low',
    source: 'CALC; KHAN qeema and kaleji bracket',
  },
  {
    id: 'yakhni-soup',
    category: 'side',
    text: {
      en: {
        name: 'Yakhni, clear chicken broth',
        portion: '1 cup, 250\u00A0ml',
        varies: 'Clear broth is free — do not dose for it. Cornflour thickening or noodles make it the corn soup row instead. Yakhni pulao is a rice dish, not this.',
      },
      ur: {
        name: 'یخنی، صاف شوربہ',
        portion: '1 کپ، 250\u00A0ملی لیٹر',
        varies: 'صاف شوربہ مفت ہے — اس کے لیے انسولین نہ لگائیں۔ کارن فلور سے گاڑھا کیا ہو یا نوڈلز ہوں تو وہ کارن سوپ والی لائن ہے۔ یخنی پلاؤ چاول کی ڈش ہے، یہ نہیں۔',
      },
    },
    roman: 'Yakhni',
    aliases: ['yakhni', 'chicken yakhni', 'broth', 'chicken broth', 'stock', 'soup', 'clear soup'],
    grams: 0,
    gramsMax: 3,
    confidence: 'high',
    source: 'USDA broth',
  },
  {
    id: 'soup-chicken-corn',
    category: 'side',
    text: {
      en: {
        name: 'Chicken corn soup',
        portion: '1 bowl, 250\u00A0ml',
        varies: 'The bowl, and how thick it is. Four sourced recipes put a measured 250\u00A0ml bowl at 6 to 11\u00A0g. A restaurant bowl is often 400 to 500\u00A0ml and thicker, and a big thick one can reach 20 — count that as two bowls. The chicken and egg are 0.',
      },
      ur: {
        name: 'چکن کارن سوپ',
        portion: '1 پیالہ، 250\u00A0ملی لیٹر',
        varies: 'پیالہ، اور وہ کتنا گاڑھا ہے۔ چار حوالوں کے مطابق 250\u00A0ملی لیٹر کے پیالے میں 6 سے 11\u00A0گرام۔ ریستوران کا پیالہ اکثر 400 سے 500\u00A0ملی لیٹر اور زیادہ گاڑھا ہوتا ہے، بڑا گاڑھا پیالہ 20 تک پہنچ سکتا ہے — اسے دو پیالے گنیں۔ مرغی اور انڈا 0 ہیں۔',
      },
    },
    roman: 'Chicken corn soup',
    aliases: ['chicken corn soup', 'corn soup', 'soup', 'chinese soup', 'hot and sour soup'],
    grams: 6,
    gramsMax: 11,
    confidence: 'low',
    source: 'CALC from USDA cornstarch and canned sweetcorn, four named recipes at a measured 250\u00A0ml bowl',
  },
  {
    id: 'salad-kachumber',
    category: 'side',
    text: {
      en: {
        name: 'Green salad, kachumber',
        portion: '1 side plate',
        varies: 'Cucumber, onion, tomato and lemon are free at side-plate amounts — do not dose for this. A creamy or sweet dressing is the exception.',
      },
      ur: {
        name: 'سبز سلاد، کچومر',
        portion: '1 سائیڈ پلیٹ',
        varies: 'کھیرا، پیاز، ٹماٹر اور لیموں سائیڈ پلیٹ جتنی مقدار میں مفت ہیں — ان کے لیے انسولین نہ لگائیں۔ کریم والی یا میٹھی ڈریسنگ اس سے الگ ہے۔',
      },
    },
    roman: 'Salad',
    aliases: ['salad', 'salaad', 'green salad', 'kachumber', 'kachumbar', 'kheera', 'cucumber', 'tamatar', 'onion salad'],
    grams: 0,
    gramsMax: 5,
    confidence: 'high',
    source: 'USDA vegetables',
  },
  {
    id: 'achar',
    category: 'side',
    text: {
      en: {
        name: 'Achar, pickle',
        portion: '1 spoonful beside the plate',
        varies: 'Oil, salt and spice — free at pickle amounts. A sweet murabba or chhundo is sugar, and that is the murabba row.',
      },
      ur: {
        name: 'اچار',
        portion: 'پلیٹ کے ساتھ 1 چمچ',
        varies: 'تیل، نمک اور مصالحہ — اچار جتنی مقدار میں مفت۔ میٹھا مربہ یا چھندو چینی ہے، وہ مربے والی لائن ہے۔',
      },
    },
    roman: 'Achar',
    aliases: ['achar', 'achaar', 'aachar', 'pickle', 'mango pickle', 'mixed pickle', 'lemon pickle'],
    grams: 0,
    gramsMax: 2,
    confidence: 'high',
    source: 'USDA, CoFID pickles',
  },
  {
    id: 'chutney-hari',
    category: 'side',
    text: {
      en: {
        name: 'Hari chutney, green',
        portion: '2 tablespoons',
        varies: 'Podina, dhania, chili and dahi are all near-free. If it tastes sweet the shop added sugar or imli — that is the meethi chutney row.',
      },
      ur: {
        name: 'ہری چٹنی',
        portion: '2 کھانے کے چمچ',
        varies: 'پودینہ، دھنیا، مرچ اور دہی سب تقریباً مفت ہیں۔ میٹھی لگے تو دکان نے چینی یا املی ڈالی ہے — وہ میٹھی چٹنی والی لائن ہے۔',
      },
    },
    roman: 'Hari chutney',
    aliases: ['chutney', 'hari chutney', 'green chutney', 'podina chutney', 'mint chutney', 'dhania chutney'],
    grams: 1,
    gramsMax: 3,
    confidence: 'medium',
    source: 'CALC from USDA components — every ingredient is near zero, so the answer is bounded',
  },
  {
    id: 'chutney-meethi',
    category: 'side',
    text: {
      en: {
        name: 'Meethi chutney, imli',
        portion: '1 tablespoon, 20\u00A0g',
        varies: 'How thick it is. Thin home-style is 6 to 7 a spoon; thick street-style is 10 to 13, and thela chaat usually comes with two or three spoons. The chaat rows already carry one.',
      },
      ur: {
        name: 'میٹھی چٹنی، املی والی',
        portion: '1 کھانے کا چمچ، 20\u00A0گرام',
        varies: 'یہ کتنی گاڑھی ہے۔ گھر کی پتلی چٹنی ایک چمچ میں 6 سے 7؛ ٹھیلے کی گاڑھی 10 سے 13، اور ٹھیلے کی چاٹ کے ساتھ عموماً دو تین چمچ آتے ہیں۔ چاٹ کی سطروں میں ایک چمچ پہلے سے شامل ہے۔',
      },
    },
    roman: 'Meethi chutney',
    aliases: ['chutney', 'meethi chutney', 'imli chutney', 'tamarind chutney', 'khatti meethi chutney', 'sonth'],
    grams: 6,
    gramsMax: 13,
    confidence: 'medium',
    source: 'CALC from CoFID tamarind pulp and sugar, USDA tamarind agreeing, two named recipes by style',
  },
  {
    id: 'malai',
    category: 'dairy',
    text: {
      en: {
        name: 'Malai, cream',
        portion: '2 tablespoons, 30\u00A0g',
        varies: 'Free by itself — it is nearly all fat. Malai with sugar on it is the sugar\u2019s line, 4.2 a spoon. Ras malai is a sweet, not this.',
      },
      ur: {
        name: 'بالائی',
        portion: '2 کھانے کے چمچ، 30\u00A0گرام',
        varies: 'اکیلی ہو تو مفت — یہ تقریباً ساری چکنائی ہے۔ اوپر چینی ڈالی ہو تو وہ چینی کا عدد ہے، فی چمچ 4.2۔ رس ملائی مٹھائی ہے، یہ نہیں۔',
      },
    },
    roman: 'Malai',
    aliases: ['malai', 'balai', 'cream', 'fresh cream'],
    grams: 1,
    gramsMax: 2,
    confidence: 'high',
    source: 'USDA cream',
  },
  {
    id: 'butter-ghee-oil',
    category: 'dairy',
    text: {
      en: {
        name: 'Butter, ghee or oil',
        portion: 'Any amount',
        varies: 'Zero at any amount — fat changes how fast a meal lands, not its carbohydrate. Do not dose for these.',
      },
      ur: {
        name: 'مکھن، گھی یا تیل',
        portion: 'کوئی بھی مقدار',
        varies: 'کتنی بھی مقدار ہو، 0 — چکنائی یہ بدلتی ہے کہ کھانا کتنی جلدی اثر کرے گا، اس کا کاربوہائیڈریٹ نہیں۔ ان کے لیے انسولین نہ لگائیں۔',
      },
    },
    roman: 'Makhan',
    aliases: ['makhan', 'butter', 'ghee', 'desi ghee', 'oil', 'cooking oil', 'banaspati', 'margarine', 'blue band'],
    grams: 0,
    gramsMax: null,
    confidence: 'high',
    source: 'USDA',
  },
  {
    id: 'bread-brown',
    category: 'bread',
    text: {
      en: {
        name: 'Bread slice, brown or wholemeal',
        portion: '1 slice, about 30\u00A0g',
        varies: 'Nearly the same as white — a slice is 11 to 14 against white\u2019s 13 to 15. The fibre slows the rise; it does not remove the grams. A bakery\u2019s "diabetic" loaf is this row unless its packet says otherwise — read the packet.',
      },
      ur: {
        name: 'براؤن یا چکی کے آٹے کا بریڈ سلائس',
        portion: '1 سلائس، تقریباً 30\u00A0گرام',
        varies: 'سفید بریڈ سے تقریباً برابر — ایک سلائس 11 سے 14، سفید کی 13 سے 15 کے مقابلے میں۔ ریشہ شوگر چڑھنے کی رفتار کم کرتا ہے، گرام کم نہیں کرتا۔ بیکری کا «ذیابیطس والا» بریڈ بھی یہی لائن ہے، جب تک ڈبے پر کچھ اور نہ لکھا ہو — ڈبہ پڑھ لیں۔',
      },
    },
    roman: 'Brown bread',
    aliases: ['brown bread', 'bran bread', 'wholemeal bread', 'whole wheat bread', 'wholewheat bread', 'diabetic bread', 'brown double roti'],
    grams: 11,
    gramsMax: 13,
    confidence: 'medium',
    source: 'USDA-SR 172688 — 42.71 total minus 6.0 fibre at the floor, total carbohydrate at the top; CoFID wholemeal',
  },
  {
    id: 'dalia',
    category: 'rice',
    text: {
      en: {
        name: 'Dalia, broken wheat porridge',
        portion: '1 bowl, 250\u00A0ml, milk and 2 sugars',
        varies: 'The dry grain is the number: about 25\u00A0g dry is 16 to 19\u00A0g before anything else. Milk adds 5 per 100\u00A0ml, each spoon of sugar 4.2. Namkeen dalia in water is just the grain. Weigh the dry dalia once: grams \u00d7 0.65.',
      },
      ur: {
        name: 'دلیہ',
        portion: '1 پیالہ، 250\u00A0ملی لیٹر، دودھ اور 2 چمچ چینی',
        varies: 'سوکھا دانہ ہی عدد ہے: تقریباً 25\u00A0گرام سوکھا دلیہ کسی چیز سے پہلے 16 سے 19\u00A0گرام ہے۔ دودھ فی 100\u00A0ملی لیٹر 5 بڑھاتا ہے، چینی کا ہر چمچ 4.2۔ پانی میں بنا نمکین دلیہ صرف دانہ ہے۔ سوکھا دلیہ ایک بار تول لیں: گرام کو 0.65 سے ضرب دیں۔',
      },
    },
    roman: 'Dalia',
    aliases: ['dalia', 'daliya', 'dalya', 'broken wheat', 'porridge', 'meetha dalia', 'namkeen dalia'],
    grams: 30,
    gramsMax: 40,
    confidence: 'low',
    source: 'CALC from USDA bulgur, milk and sugar',
  },
  {
    id: 'oats-porridge',
    category: 'packaged',
    text: {
      en: {
        name: 'Oats, porridge',
        portion: 'half a cup dry, 40\u00A0g, before milk',
        varies: 'Weigh the dry oats, and the packet\u2019s own panel beats this row. Milk adds 5 per 100\u00A0ml and each spoon of sugar 4.2. The top of this row includes fibre — a slight overestimate.',
      },
      ur: {
        name: 'اوٹس، دلیہ',
        portion: 'آدھا کپ سوکھا، 40\u00A0گرام، دودھ سے پہلے',
        varies: 'سوکھے اوٹس تول لیں، اور ڈبے پر لکھا عدد اس لائن سے بہتر ہے۔ دودھ فی 100\u00A0ملی لیٹر 5 بڑھاتا ہے اور چینی کا ہر چمچ 4.2۔ اس لائن کا اوپر والا عدد ریشہ بھی گن رہا ہے — تھوڑا زیادہ ہے۔',
      },
    },
    roman: 'Oats',
    aliases: ['oats', 'oatmeal', 'porridge', 'quaker'],
    grams: 24,
    gramsMax: 27,
    confidence: 'medium',
    source: 'USDA-SR Quaker quick oats 68.2 per 100\u00A0g; labels near 60',
  },
  {
    id: 'cornflakes',
    category: 'packaged',
    text: {
      en: {
        name: 'Cornflakes',
        portion: '1 bowl, 30\u00A0g flakes, without milk',
        varies: 'Weigh the flakes once — bowls pour anywhere from 30 to 60\u00A0g. Milk on top adds 5 per 100\u00A0ml. Frosted or honey flakes run a third higher: read that packet.',
      },
      ur: {
        name: 'کارن فلیکس',
        portion: '1 پیالہ، 30\u00A0گرام فلیکس، دودھ کے بغیر',
        varies: 'فلیکس ایک بار تول لیں — پیالے میں 30 سے 60\u00A0گرام تک آ جاتے ہیں۔ اوپر ڈالا دودھ فی 100\u00A0ملی لیٹر 5 بڑھاتا ہے۔ فراسٹڈ یا شہد والے فلیکس ایک تہائی زیادہ ہوتے ہیں: وہ ڈبہ پڑھ لیں۔',
      },
    },
    roman: 'Cornflakes',
    aliases: ['cornflakes', 'corn flakes', 'cereal', 'breakfast cereal', 'kelloggs'],
    grams: 25,
    gramsMax: 27,
    confidence: 'high',
    source: 'USDA-SR corn flakes 88 per 100\u00A0g; labels agree',
  },
];
