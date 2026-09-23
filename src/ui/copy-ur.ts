/**
 * Every user-facing string, in Urdu. `10a`.
 *
 * The English original in `copy.ts` is the specification; this is that object
 * with the words changed and as little else as possible.
 *
 * **WHAT THE COMPILER ACTUALLY ENFORCES, stated exactly**, because an earlier
 * version of this paragraph claimed more and was wrong twice over. The export is
 * typed `Copy`, and `Copy` is a MAPPED TYPE over `typeof COPY` — not `typeof
 * COPY` itself, which is the defect this file's arrival exposed: `COPY` ends in
 * `as const`, so every string in it is a literal type and nothing but the
 * English words could ever satisfy it.
 *
 * So the compiler catches: a key renamed, a key deleted, a key added, a
 * parameter whose TYPE changed, and a rounding mode paired with the wrong label.
 *
 * It does NOT catch a dropped interpolation. `` `${days} days` `` becoming
 * `` `days` `` compiles clean whenever the parameter is still mentioned
 * somewhere — `days === 0` is enough — and TypeScript permits a function with
 * FEWER parameters than the type declares, so dropping them entirely compiles
 * too. Both were tried against this file and both passed `typecheck`,
 * `check-plan.py` and all 802 tests. `test/interpolation.test.ts` is what covers
 * that gap; the type does not.
 *
 * **IN TESTING, AND NOT REVIEWED BY A NATIVE READER.** Momin ruled Urdu ships
 * in production rather than behind a flag, with a label on the option saying so
 * and a confirmation when it is chosen. Nothing here is his mother's review.
 * The drafts were produced against `docs/URDU.md`, which fixes 49 terms and the
 * alternatives each one beat, so that seven sections translated in parallel
 * could not quietly disagree about what a dose is called. It did not stop them
 * entirely — a glossary fixes WORDS, and two sections still disagreed about an
 * arrow glyph and about how to quote a control by name.
 *
 * Three things this file does NOT translate, all ruled:
 *
 * - **Numbers stay ASCII.** `15`, never `۱۵`. §4.2 rejects Urdu-Indic digits on
 *   input and says so in its own message, and §10.4's formatting rules are
 *   language-independent.
 * - **Anything printed on a device or a box appears exactly as printed** — the
 *   meter's `HI` and `LO`, `mg/dL`, `ISF`, `ICR`, `U-100`, and every insulin
 *   brand. A transliterated Lantus matches nothing the reader is holding.
 * - **`MealUnits` stays Latin.** Where the name sat inside running Urdu prose it
 *   becomes "this app", so no Latin block interrupts a Nastaliq line.
 *
 * The doc comments are still in English on purpose. They are for whoever
 * maintains this file, and they cite `§` sections and build notes that exist in
 * English only. Where a comment's reasoning stops holding in Urdu — a word
 * order, a plural that collapses, an arrow that would point the wrong way — a
 * one-line note says so rather than the comment being deleted.
 */

import {
  FAST_CARB_GRAMS,
  HYPO_LEVEL_1,
  KETONE_ADVISORY,
  RANGE,
  RECHECK_MINUTES,
  RESULT_EXPIRY_MINUTES,
  STACK_ADVISE_HOURS,
  STACK_SUPPRESS_HOURS,
} from '../config.js';
import { formatHundredths } from '../core/decimal.js';
import type { Copy } from './copy.js';
import type { EatDelay, InsulinClass } from '../core/insulin.js';
import type { LexicalReason, RoundingMode } from '../core/types.js';

/**
 * Wrap a value so the bidi algorithm cannot reorder what is inside it.
 *
 * **A NUMBER RANGE COMES OUT BACKWARDS IN URDU WITHOUT THIS**, and it was
 * shipping on the result screen: `20–30` painted as `30–20` on the card that
 * tells someone when to eat. Measured in Chrome against an LTR control, not
 * eyeballed — the first measurement had the assertion inverted and called the
 * broken case correct.
 *
 * The cause is bidi rule N1: a European number is treated as right-to-left when
 * the algorithm resolves the neutral character between two of them, so the dash
 * takes the paragraph's direction and the two numbers swap around it. A colon
 * does NOT do this — `1:10` survives, because `:` is a Common Separator that
 * binds its neighbours — which is why an ICR reads correctly and a range does
 * not.
 *
 * U+2068 FIRST STRONG ISOLATE and U+2069 POP DIRECTIONAL ISOLATE, which is what
 * `<bdi>` does in markup. FIRST STRONG rather than U+2066's LEFT-TO-RIGHT
 * ISOLATE: both fix today's case identically, and first-strong infers the
 * direction from the content instead of asserting one, so it stays correct if a
 * value ever arrives that is not digits.
 *
 * It is NOT needed around a lone number. `«ڈوز 4.5 یونٹ»` and
 * `«180 سے گھٹا کر 120»` were both checked in the running app and both read
 * correctly: one number among RTL words has no neutral between two numbers for
 * N1 to resolve. Isolating everything would be cargo cult; this isolates the
 * shape that actually breaks.
 */
const isolate = (value: string): string => `\u2068${value}\u2069`;

const [MIN_BLOOD_SUGAR, MAX_BLOOD_SUGAR] = RANGE.bloodSugar.hard;
const [, MAX_INJECTED] = RANGE.injected.hard;

export const COPY_UR: Copy = {

  appName: 'MealUnits',

  /**
   * §10.4's spelled-out unit, in Urdu.
   *
   * ONE FORM. English picks between "unit" and "units"; یونٹ is invariant after
   * a numeral, so the ternary collapses — which is exactly why this is a
   * function per language rather than one shared function taking a word.
   *
   * The no-break space survives translation unchanged. It is not an English
   * typographic nicety: a break renders the number above the word, and the two
   * rejoin in a reader's head as one token. That misreading does not care which
   * script it happens in.
   */
  /*
   * The glossary, and the two words it lets the PROSE lose.
   *
   * `copy-ur.ts` already glossed two terms inline — «ذیابیطس (شوگر کی بیماری)»
   * and «بیک گراؤنڈ انسولین — پیچھے سے، دن بھر کام کرنے والی —». Both were the
   * right instinct and both are now entries here, so the sentences carrying
   * them can shorten instead of every sentence growing.
   *
   * The transliterated terms are the ones that need this most. «اسٹیکنگ» and
   * «کریکشن» are English words in Urdu letters: pronounceable and completely
   * empty to a reader who does not already know the English. A person who does
   * know the English never needed the entry; a person who does not had no way
   * in at all.
   */
  glossaryClose: 'بند کریں',
  glossary: {
    ketones: {
      word: 'کیٹون',
      body: 'جب جسم میں انسولین کم پڑ جائے تو وہ شوگر کی جگہ چربی جلانے لگتا ہے، اور اس سے کیٹون بنتے ہیں۔ زیادہ ہو جائیں تو خون تیزابی ہو جاتا ہے — یہ خطرناک ہے اور گھنٹوں میں بگڑتا ہے۔ لیب کی رپورٹ پر یہ انگریزی میں لکھا ہوتا ہے، اور الفاظ مختلف ہو سکتے ہیں — Ketones، Ketone Bodies، Urine Ketones، یا صرف KET تلاش کریں۔ چوبیس گھنٹے کھلی لیب چند سو روپے میں پیشاب کا ٹیسٹ کر دیتی ہے؛ عام میڈیکل سٹور پر یہ پٹیاں نہیں ملتیں۔',
    },
    ketoacidosis: {
      word: 'کیٹو ایسڈوسس',
      body: 'یہ وہ حالت ہے جب کیٹون بڑھتے چلے جائیں اور کوئی علاج نہ کرے: قے، گہرا تیز سانس، پیٹ میں درد، اور پھر ہوش جانا۔ اس کے لیے ہسپتال چاہیے، گھر پر بڑی ڈوز نہیں۔ صرف انسولین سے ٹھیک نہیں ہوتا، کیونکہ جسم سے بہت سا پانی اور نمک بھی نکل چکا ہوتا ہے۔',
    },
    stacking: {
      word: 'اسٹیکنگ',
      body: 'انسولین لگانے کے بعد کئی گھنٹے کام کرتی رہتی ہے۔ اگر پچھلی ڈوز ابھی چل رہی ہو اور آپ اور لگا لیں تو دونوں مل کر بلڈ شوگر کو اس سے زیادہ نیچے لے جاتی ہیں جتنا کوئی ایک لے جاتی۔ اسی لیے یہ ایپ پوچھتی ہے کہ آخری انجیکشن کب لگایا تھا۔',
    },
    correction: {
      word: 'کریکشن',
      body: 'ڈوز کا وہ حصہ جو بڑھی ہوئی بلڈ شوگر کو واپس نیچے لاتا ہے — کھانے والے حصے سے الگ۔ اگر آپ پہلے ہی ٹارگٹ پر ہیں تو کریکشن ہوتا ہی نہیں، صرف کھانے والا حصہ ہوتا ہے۔',
    },
    carbohydrate: {
      word: 'کاربوہائیڈریٹ',
      body: 'کھانے کا وہ حصہ جو بلڈ شوگر بن جاتا ہے: روٹی کا آٹا، چاول، چائے کی چینی۔ گوشت، انڈا اور تیل کاربوہائیڈریٹ نہیں ہیں اور بلڈ شوگر کو بہت کم ہلاتے ہیں۔ یہ پلیٹ کا وزن نہیں ہے — 250\u00A0گرام بریانی میں تقریباً 50\u00A0گرام کاربوہائیڈریٹ ہوتا ہے۔',
    },
    diabetes: {
      word: 'ذیابیطس',
      body: 'شوگر کی بیماری۔ ٹائپ 1 میں جسم انسولین بنانا بالکل بند کر دیتا ہے، اس لیے اسے لگانا پڑتا ہے۔ یہ میٹھا کھانے سے نہیں ہوتی اور یہ ختم نہیں ہوتی۔',
    },
    backgroundInsulin: {
      word: 'بیک گراؤنڈ انسولین',
      body: 'دن میں ایک بار لی جانے والی آہستہ انسولین، جو پیچھے سے تقریباً چوبیس گھنٹے خاموشی سے کام کرتی رہتی ہے۔ یہ کھانے کے لیے نہیں ہوتی۔ یہ ایپ نہ اس کا حساب لگاتی ہے نہ اسے بدلتی ہے — اسے آپ کا ڈاکٹر طے کرتا ہے۔',
    },
  },

  units: (hundredths: number): string => `${formatHundredths(hundredths)}\u00A0یونٹ`,

  /**
   * §10.6's explanation page — five sections added 2026-09-12, each for a term
   * the app already used and had never defined.
   *
   * Every window here is INTERPOLATED. The page describes gates whose numbers
   * live in config.ts, and prose that states them as digits drifts silently the
   * day one changes — the defect fixed in `stacking.missingHistory`, which said
   * "4 hours" as characters while the same file read the constant eleven lines
   * away. `check-plan.py` now catches that class.
   */
  explain: {
    /**
     * The FIRST section of "How this works", added 2026-09-13. The disclaimer
     * states the condition as a rule; this explains it, which is the division
     * this project uses everywhere — the gate says what, the reference says why.
     *
     * Pumps are named alongside type 2 deliberately. Someone with type 1 on a
     * pump is in the population this app is for and is still the wrong reader:
     * their device works out doses its own way, from settings this app does not
     * hold, and a second opinion from different arithmetic is a hazard rather
     * than a cross-check.
     *
     * The age line is honest rather than restrictive. The app has no age
     * handling at all, ISPAD's paediatric guidance is cited in CLINICAL.md, and
     * nothing here was checked for a child's dosing. Saying so is truer than
     * either refusing children or silently claiming the scope.
     */
    audienceTitle: 'یہ کس کے لیے ہے',
    /**
     * The bold part is named `condition` rather than found by position, because
     * the NAME is the reason it is bold: a reader skimming this page to find
     * out whether the app is theirs should be able to answer that without
     * reading a sentence.
     *
     * The first attempt was alternating parts — plain, bold, plain — and
     * §11.8's lint rule rejected the `index % 2` that renders it, correctly:
     * the 2 was a magic number encoding a convention. Naming the field removes
     * the arithmetic and says what the emphasis MEANS, which is the better
     * shape anyway.
     *
     * Not a mini-markdown in the copy, deliberately. §10.2's premise is that
     * the words ARE the specification, and a parser between them and the screen
     * is one more thing that can disagree with them.
     */
    audienceBody: [
      {
        lead: 'یہ ایپ ان لوگوں کے لیے ہے جنہیں ',
        condition: 'ٹائپ 1',
        // Urdu: «(شوگر کی بیماری)» glosses ذیابیطس at its first teaching
        // mention, per glossary hard case 5.
        rest: ' ذیابیطس (شوگر کی بیماری) ہے اور جو ہر کھانے کی ڈوز کا حساب دو چیزوں سے لگاتے ہیں: بلڈ شوگر ٹارگٹ سے کتنی اوپر ہے، اور جو کھانا وہ کھانے والے ہیں اس میں کتنا کاربوہائیڈریٹ ہے۔ ایپ یہ فرض کرتی ہے کہ لمبے اثر والی انسولین دن میں ایک بار لگتی ہے اور کھانے کے وقت تیز اثر والی۔',
      },
      {
        // Plain, on Momin's ruling 2026-09-13. It was bold for one revision, to
        // pair with the type 1 above. Two emphases on one screen split the
        // reader's attention instead of answering one question, and this
        // paragraph already opens with the words a type 2 reader is looking for.
        lead: 'اگر آپ کو ٹائپ 2 ذیابیطس ہے تو ہو سکتا ہے آپ کا علاج گولیاں ہوں، انسولین کی ایک مقررہ ڈوز ہو، ہفتے میں ایک بار کا ٹیکہ ہو، یا ان کا ملا جلا — اور یہ حساب ان میں سے کسی کے لیے نہیں بنا۔ یہی بات تب بھی ہے جب آپ کی انسولین پمپ لگاتا ہو: پمپ ڈوز کا حساب اپنے طریقے سے لگاتا ہے، ایسی سیٹنگز سے جو یہ ایپ دیکھ نہیں سکتی۔',
        condition: null,
        rest: '',
      },
      {
        lead: 'یہ ایپ بڑوں کے لیے بنائی گئی ہے، اور اس میں کسی چیز کی جانچ اس حساب سے نہیں ہوئی کہ بچے کو ڈوز کیسے دی جاتی ہے۔ اگر آپ کسی بچے کی ڈوز کا حساب لگا رہے ہیں تو ان نمبروں پر بھروسا کرنے سے پہلے انہیں بچے کے ڈاکٹر کو دکھائیں۔',
        condition: null,
        rest: '',
      },
    ] as const,

    namesTitle: 'وہ نام جو آپ کا ڈاکٹر استعمال کرتا ہے',
    namesLead: 'ان دونوں نمبروں کے باقاعدہ میڈیکل نام ہیں، اور آپ کا ڈاکٹر یہی نام استعمال کرے گا۔',
    /**
     * The two clinical definitions are REUSED from settings rather than written
     * again. Two copies of a clinical definition is two things to keep in step,
     * and §10.2's premise is that the words are the specification — so when T5
     * changes how those examples read, both places change together.
     */
    namesClose:
      'دونوں سیٹنگز میں موجود ہیں، ISF اور ICR کے لیبل کے ساتھ — تو اگر آپ کا ڈاکٹر کہے «آپ کا ISF 30 ہے» تو آپ جان لیں گے کہ وہ کون سا خانہ ہے۔',

    carbTitle: 'کاربوہائیڈریٹ میں کیا کیا شمار ہوتا ہے',
    carbBody: [
      'ریڈنگ آپ کے میٹر سے آتی ہے۔ گرام میٹر سے نہیں آتے — وہ نمبر آپ کا اپنا ہے، اور یہاں یہی ایک چیز ہے جسے ایپ پورے بھروسے پر مان لیتی ہے۔ ایپ جو چیز گن رہی ہے وہ کھانے کا کاربوہائیڈریٹ ہے: نشاستہ اور چینی۔ چاول، روٹی، آلو، بریانی، دال، پھل اور چائے کی چینی — سب شمار ہوتے ہیں۔ 250\u00A0گرام بریانی کی پلیٹ میں تقریباً 50\u00A0گرام کاربوہائیڈریٹ ہوتا ہے، اس لیے یہ نمبر کبھی بھی پلیٹ میں رکھے کھانے کا وزن نہیں ہوتا۔',
      'فائبر بھی کاربوہائیڈریٹ ہی ہے، مگر آپ کا جسم اسے جذب نہیں کرتا، اس لیے وہ بلڈ شوگر اس طرح نہیں بڑھاتا جس طرح نشاستہ بڑھاتا ہے۔ کچھ ڈاکٹر اسے ٹوٹل میں سے نکال دیتے ہیں اور کچھ نہیں نکالتے۔ اپنے ڈاکٹر سے پوچھیں کہ وہ کون سا طریقہ چاہتے ہیں، پھر ہر کھانے پر وہی ایک طریقہ رکھیں — ایپ کو پتہ نہیں چل سکتا کہ آپ نے کون سا اصول برتا، اور ہر بار ایک ہی طرح گننا اس کے لیے اس سے زیادہ کام کا ہے کہ آپ کسی ایک بار بالکل ٹھیک گن لیں۔',
      'پروٹین اور چکنائی کاربوہائیڈریٹ نہیں ہیں اور اس نمبر میں ان کی جگہ نہیں۔ یہ بلڈ شوگر پر اثر ضرور ڈالتے ہیں، مگر گھنٹوں بعد — اور وہ بات نیچے «جو باتیں یہ ایپ نہیں جانتی» میں ہے۔',
    ] as const,

    stackingTitle: '«اسٹیکنگ» کا کیا مطلب ہے',
    stackingBody: [
      'تیز انسولین اس وقت ختم نہیں ہو جاتی جب آپ کی بلڈ شوگر نیچے آ جاتی ہے۔ لگانے کے بعد وہ گھنٹوں تک کام کرتی رہتی ہے۔ اگر پہلے کی ڈوز ابھی اثر کر رہی ہو اور آپ اوپر سے کریکشن لگا لیں تو دونوں مل جاتی ہیں، اور مل کر بلڈ شوگر کو اس سے زیادہ نیچے لے جا سکتی ہیں جتنا کسی اکیلی ڈوز کا مقصد تھا۔ اسی کو «اسٹیکنگ» کہتے ہیں، اور یہی وہ لفظ ہے جو یہ ایپ نتیجے کی اسکرین پر اور سیٹنگز میں استعمال کرتی ہے۔',
      `جو ڈوز آپ نے درج کی ہو اس کے بعد شروع کے ${String(STACK_SUPPRESS_HOURS)}\u00A0گھنٹے ایپ کریکشن روک لیتی ہے اور آپ کو صرف کھانے کی ڈوز دیتی ہے۔ وہ کہتی ہے «کریکشن روک لی گئی»، اور کریکشن حساب میں موجود رہتی ہے — اس پر لکیر پھری ہوتی ہے اور ساتھ اس کی وجہ لکھی ہوتی ہے۔ کھانے والا حصہ کبھی نہیں روکا جاتا — کھانا بہرحال اپنی انسولین مانگتا ہے، چاہے پہلے کی کتنی ہی انسولین ابھی کام کر رہی ہو۔ اور جب آپ ٹارگٹ پر یا اس سے نیچے ہوں تو کریکشن ڈوز کو چھوٹا کرتی ہے؛ ایسی کریکشن ہمیشہ پوری کی پوری لگائی جاتی ہے، کیونکہ اسے روک لینے سے آپ کو انسولین زیادہ ملتی، کم نہیں۔`,
      `${String(STACK_SUPPRESS_HOURS)} سے ${String(STACK_ADVISE_HOURS)}\u00A0گھنٹوں کے درمیان کریکشن پوری لگائی جاتی ہے اور ایپ آپ کو بتاتی ہے کہ پچھلی ڈوز شاید ابھی اثر کر رہی ہو۔ ${String(STACK_ADVISE_HOURS)}\u00A0گھنٹوں کے بعد وہ کچھ نہیں کہتی۔ یہ سب اس کا اندازہ نہیں ہے کہ آپ کے جسم میں کتنی انسولین باقی ہے — ڈوز کتنی دیر چلے گی اس کا انحصار اس پر ہے کہ وہ کتنی بڑی تھی، اس لیے ایپ ایسا کوئی گراف بنانے سے انکار کرتی ہے۔`,
      'اگر آپ کو کریکشن پھر بھی چاہیے — کیونکہ ٹیکے کی جگہ نے اسے جذب نہیں کیا، یا انسولین گرمی میں پڑی رہی ہے، یا آپ بیمار ہیں — تو نتیجے کی اسکرین پر «یہ چھوٹی کیوں ہے؟» اسے واپس شامل کر دیتا ہے۔ پہلے وہ آپ کو یہ بتاتا ہے کہ پہلے والی ڈوز اکیلی ہی آپ کو ابھی کتنا نیچے لے جا سکتی ہے۔ اس کا استعمال اندراج میں ریکارڈ ہو جاتا ہے، تاکہ پیٹرن آپ کی ہسٹری میں موجود رہے۔',
    ] as const,

    /**
     * Quotes `stacking.missingHistory` VERBATIM, the way the English does. It
     * said «…ریکارڈ میں نہیں» while the message says «…درج نہیں», so the help
     * page was defining a sentence the app never prints.
     */
    missingTitle: '«کوئی حالیہ ڈوز درج نہیں»',
    missingBody: `اسٹیکنگ کی جانچ صرف ایک چیز جانتی ہے: جو آپ نے درج کیا۔ یہ لائن صرف اس وقت آتی ہے جب دو باتیں ایک ساتھ سچ ہوں: ایپ کے پاس کوئی ایسی حالیہ ڈوز نہیں جس سے وہ حساب لگا سکے، اور اسے ریکارڈ پر بھروسا بھی نہیں۔ اس کا مطلب یہ نہیں کہ آپ کے اندر کوئی انسولین کام نہیں کر رہی۔ ایپ آپ کو یہ نہیں بتائے گی، کیونکہ وہ اسے جان ہی نہیں سکتی۔ اگر آپ نے پچھلے ${String(STACK_SUPPRESS_HOURS)}\u00A0گھنٹوں میں ٹیکہ لگایا ہے تو آپ کے سامنے والی ڈوز میں سے کچھ نہیں روکا گیا — اسے ایسی کریکشن سمجھیں جو پہلے سے کام کرتی انسولین کے اوپر جا رہی ہے، اور اسی کو سامنے رکھ کر فیصلہ کریں۔ اگر آپ ہر ٹیکہ درج کریں تو اس جانچ کو کبھی سامنے آنا ہی نہیں پڑتا۔`,
    /**
     * BOTH halves of the condition are load-bearing and were got wrong once: the
     * caveat fires only when there is no usable record AND provenance is suspect
     * (`needsMissingHistoryCaveat`, and `deriveHistory`'s five conditions). v4
     * dropped the provenance half and the line appeared after every overnight
     * gap. Enumerating them is what stops the copy describing v4's bug.
     */
    missingConditions: [
      'کچھ بھی درج نہیں ہوا',
      'سب سے نیا اندراج ایپ کے انسٹال ہونے سے پہلے کا ہے',
      'ہسٹری ابھی ابھی امپورٹ ہوئی ہے',
      'کسی اندراج کا وقت ایسا ہے جس پر ایپ کو یقین نہیں آتا، اس لیے وہ الگ رکھ دیا گیا',
      'کوئی اندراج ایپ کے کھلتے وقت پڑھا نہیں جا سکا، اور چھوڑ دیا گیا',
    ] as const,

    expiryTitle: `نتیجہ ${String(RESULT_EXPIRY_MINUTES)}\u00A0منٹ بعد پرانا کیوں ہو جاتا ہے`,
    expiryBody: [
      `ڈوز اتنی ہی بھروسے کی ہوتی ہے جتنی وہ ریڈنگ جس سے وہ نکلی۔ حساب لگنے کے ${String(RESULT_EXPIRY_MINUTES)}\u00A0منٹ بعد نتیجہ مدھم ہو جاتا ہے، اسکرین بتاتی ہے کہ وہ کس وقت کا تھا، اور اس پر سب سے پہلے «دوبارہ چیک کریں» آ جاتا ہے۔ کچھ بھی ڈیلیٹ نہیں ہوتا۔ نمبر پڑھنے کے لیے وہیں موجود رہتا ہے، اور اگر آپ ٹیکہ لگا چکے ہیں تو اب بھی اسے درج کر سکتے ہیں — اندراج وہی وقت ریکارڈ کرتا ہے جس وقت آپ بٹن دباتے ہیں، وہ نہیں جس وقت ڈوز کا حساب لگا تھا، اور بٹن پر یہی لکھا ہوتا ہے۔`,
      `جو ڈبل چیک آپ ایک بار کر چکے ہیں وہ آگے نہیں چلتا۔ اگر آپ ڈوز کا حساب دوبارہ لگائیں تو ایپ دوبارہ پوچھتی ہے، کیونکہ تب تک ${String(STACK_SUPPRESS_HOURS)}\u00A0گھنٹے کی مدت گزر چکی ہو سکتی ہے، جو کریکشن روکی جا رہی تھی وہ واپس آ سکتی ہے، اور نیا ٹوٹل اس ڈوز سے بڑا ہو سکتا ہے جو آپ پہلے مان چکے تھے۔ کم ریڈنگ بھی اسی طرح پرانی ہو جاتی ہے: اسکرین بتاتی ہے کہ وہ ریڈنگ کس وقت کی تھی اور تازہ ریڈنگ مانگتی ہے، اور یہ کہتی رہتی ہے کہ پہلے کچھ میٹھا کھائیں یا پیئں۔`,
    ] as const,

    whatDoTheseMean: 'ان کا مطلب کیا ہے؟',
  },

  /**
   * The carbohydrate reference, as a screen. Phase 1 is READ-ONLY: it never
   * writes into the carbohydrate field. That is the whole safety argument —
   * a wrong row can mislead someone, and can never silently drive a dose,
   * which is the property §7.8 gives readings applied to food.
   */
  foods: {
    navLabel: 'کھانوں کی فہرست',
    title: 'کس کھانے میں کتنا کاربوہائیڈریٹ ہے',
    /**
     * Said before the list, not after. Someone who reads one number and leaves
     * should have met the caveat, and the caveat is the honest one: these are
     * estimates of a plate nobody weighed.
     */
    intro:
      'یہ اندازے ہیں، آپ کی پلیٹ کی پیمائش نہیں۔ نمبر پڑھیں، پھر خود ٹائپ کریں — یہاں کوئی چیز آپ کے لیے خانہ نہیں بھرتی۔',
    searchLabel: 'کھانا تلاش کریں',
    /**
     * Read aloud, never seen: the control it names is a `×`. §10.2's rule about
     * bare abbreviations applies to what a screen reader says as much as to what
     * is printed, so this says what the button DOES rather than "clear".
     */
    searchClear: 'تلاش صاف کریں',
    // Urdu: search matches the Roman `urdu` field in carbs.ts (transliterations,
    // not Urdu script — BACKLOG 10a), so this hint and `empty` below steer the
    // reader to type in English letters, not Urdu script.
    searchHint: 'انگریزی حروف میں ٹائپ کریں — انگریزی نام یا رومن اردو: roti, chawal, qeema, biryani.',
    empty: (query: string): string =>
      `«${query}» سے کچھ نہیں ملا۔ رومن اردو میں نام لکھ کر دیکھیں، یا کوئی سادہ لفظ — "tandoori naan" کے بجائے صرف "naan"۔`,
    /**
     * §11.8's second condition made visible. A value whose confidence is hidden
     * is presented with the same authority as a lab measurement, and the
     * difference between those is the difference this table is built on.
     */
    confidenceLabel: { high: 'اچھی طرح معلوم', medium: 'کم زیادہ ہوتا ہے', low: 'ٹھیک سے ناپا نہیں گیا' } as const,
    categoryLabel: {
      bread: 'روٹی، نان اور بریڈ',
      rice: 'چاول کے کھانے',
      daal: 'دال',
      salan: 'سالن اور کڑھی',
      snack: 'اسنیکس اور بازار کا کھانا',
      sweet: 'مٹھائی اور میٹھا',
      drink: 'مشروبات',
      fruit: 'پھل',
      dairy: 'دودھ، دہی اور پنیر',
      packaged: 'پیکٹ — بسکٹ، چاکلیٹ، چپس',
    } as const,
    categoryCount: (n: number): string => `${String(n)} کھانے`,
    browseHint: 'کسی گروپ پر ٹیپ کریں، یا اوپر تلاش کریں۔',
    matrixTitle: { chai: 'چائے', doodhPatti: 'دودھ پتی', biryani: 'بریانی' } as const,
    matrixAxis: {
      smallCup: 'چھوٹا کپ',
      mug: 'مگ',
      largeMug: 'بڑا مگ',
      noSugar: 'بغیر چینی',
      oneSugar: '1 چمچ',
      twoSugars: '2 چمچ',
      threeSugars: '3 چمچ',
      meatHeavy: 'گوشت زیادہ',
      midPot: 'درمیانی دیگ',
      riceHeavy: 'چاول زیادہ یا دیگ',
      plate: 'پلیٹ',
      dawatPlate: 'دعوت والی پلیٹ',
    } as const,
    matrixRule: {
      chai: 'چینی کا ہر چمچ تقریباً 4\u00A0گرام بڑھا دیتا ہے، کپ چاہے کوئی بھی ہو۔',
      doodhPatti: 'چینی کا ہر چمچ تقریباً 4\u00A0گرام بڑھا دیتا ہے، کپ چاہے کوئی بھی ہو۔',
      biryani: 'کس دیگ کی ہے، یہ عدد کو اتنا ہی بدلتا ہے جتنا پلیٹ کا سائز۔',
    } as const,
    matrixPicked: (n: number): string => isolate(`${String(n)} لیے`),
    mineSet: 'اپنا عدد استعمال کریں',
    mineChange: 'اپنا عدد بدلیں',
    mineClear: 'واپس حوالہ والے عدد پر',
    mineLabel: 'آپ والے میں کتنے گرام کاربوہائیڈریٹ ہیں',
    mineHint: (reference: string): string =>
      isolate(`حوالہ ${reference} ہے — یہ کاربوہائیڈریٹ ہے، وزن نہیں۔`),
    mineSave: 'اپنا عدد محفوظ کریں',
    mineWas: (reference: string, date: string): string =>
      isolate(`آپ کا اپنا۔ حوالہ ${reference}\u00A0گرام ہے — آپ نے یہ ${date} کو رکھا۔`),
    addOne: 'ایک اور',
    removeOne: 'ایک کم',
    tallyCount: (n: number): string => `${String(n)}×`,
    tallyTotal: (foods: number, grams: string): string =>
      isolate(`${String(foods)} کھانے · ${grams}\u00A0گرام`),
    tallyUse: 'یہ ٹوٹل استعمال کریں',
    tallyClear: 'فہرست دوبارہ شروع کریں',
    tallyCheck: 'باکس میں آنے کے بعد بھی آپ یہ عدد بدل سکتے ہیں۔',
    estimateLabel: 'اسے کسی نے ٹھیک سے ناپا نہیں',
    estimateNote: '⚠ کا مطلب ہے کہ اس کھانے کو کسی نے ٹھیک سے ناپا نہیں۔ جو عدد لکھا ہے وہ سب سے بہتر اندازہ ہے، اور ساتھ دی گئی رینج ایمانداری سے بتاتی ہے کہ یہ کتنا اوپر نیچے ہو سکتا ہے۔',
    /** The range is isolated; see `isolate`. 14 of 31 rows read backwards without it. */
    gramsOne: (grams: string): string => `${grams}\u00A0گرام`,
    gramsRange: (lo: string, hi: string): string => `${isolate(`${lo}–${hi}`)}\u00A0گرام`,
    variesPrefix: 'کم زیادہ: ',
    sourcePrefix: 'حوالہ: ',
    /**
     * The single highest-value thing on the screen. One kitchen-scale reading
     * settles every bread row for that household, which no amount of table
     * detail can do.
     */
    weighOnce:
      'اپنی روٹیوں میں سے ایک کو ایک بار تول لیں۔ کاربوہائیڈریٹ پکی ہوئی روٹی کے وزن کے آدھے سے ذرا کم ہوتا ہے — وزن کو 0.46 سے ضرب دیں — اور نیچے روٹی والی ہر لائن اوسط کے بجائے آپ کی اپنی بن جاتی ہے۔',
    // Urdu: "X of Y foods" reads «Y میں سے X کھانے» — the two placeholders swap
    // order, deliberately. The ternary's branches still differ, so it stays.
    countNote: (shown: number, total: number): string =>
      shown === total ? `${String(total)} کھانے` : `${String(total)} میں سے ${String(shown)} کھانے`,
  },

  // ── §3's bands ────────────────────────────────────────────────────────────
  /**
   * THE TITLES NAME THE ACTION, and the bodies name the food — both changed
   * 2026-09-22, ruled by Momin string by string as `BACKLOG.md`'s table of
   * action-carrying instructions requires.
   *
   * They said "Treat this first" and "Treat it now". The word survived every
   * earlier review because it is the clinical term and it is what a doctor
   * says. What surfaced it was translation: asked for an Urdu rendering, three
   * separate reviewers independently warned that `علاج کریں` — the literal
   * "treat" — reads as SEEK MEDICAL CARE, so a reader at 60 mg/dL telephones
   * a doctor while the sugar sits in the kitchen. Two of them said never ship
   * it.
   *
   * And the English has the same weakness in a quieter form. "Treat" is a
   * category that has to be decoded into an action, and decoding is the thing
   * hypoglycaemia takes away first. Naming the action costs four words.
   *
   * **"Do not inject INSULIN", not a bare "do not inject."** Naming the
   * substance costs nothing and removes a guess.
   *
   * The examples are a RESTORATION, not an addition. `docs/design/step-flow.html`
   * has carried "juice, glucose tablets, sugar" since the design; the build
   * dropped them and `BACKLOG.md`'s residue item 3 then recorded the gap —
   * "no anchor for a first-timer mid-hypo" — without noticing the design had
   * already answered it. The category STAYS alongside them, because it is what
   * rules out chocolate, biscuits and mithai, whose fat slows absorption: the
   * classic wrong treatment. Examples alone do not carry that.
   */

  bandC: {
    title: 'پہلے کچھ میٹھا کھائیں یا پیئں۔ انسولین نہ لگائیں۔',
    body: `ابھی ${String(FAST_CARB_GRAMS)}\u00A0گرام تیز اثر والا کاربوہائیڈریٹ لیں — جوس، گلوکوز، یا چینی ملا پانی — پھر ${String(RECHECK_MINUTES)}\u00A0منٹ بعد دوبارہ چیک کریں۔`,
    // §3.3 — the block suppresses every INSULIN quantity. It does not suppress
    // the treatment instructions, which necessarily contain 15 grams, 15
    // minutes and 70 mg/dL. "The rule is no insulin dose numbers, not no digits."
    gate: `جب تک بلڈ شوگر ${String(HYPO_LEVEL_1)}\u00A0mg/dL سے اوپر نہ ہو، انسولین نہ لگائیں۔`,
  },
  bandD: {
    /**
     * Band D is the MORE severe band, so it cannot be the vaguer sentence.
     * Leaving "Treat it now" here while band C names the action would have put
     * the weaker instruction on the worse reading.
     *
     * Urdu note: the vague-vs-named contrast above is about the English words.
     * Per the glossary (hard case 2) BOTH bands name the concrete action in
     * Urdu; band D's escalation is carried by «بہت کم» and «ابھی».
     */
    title: 'یہ بہت کم ہے۔ ابھی کچھ میٹھا کھائیں یا پیئں۔',
    body: `ابھی ${String(FAST_CARB_GRAMS)}\u00A0گرام تیز اثر والا کاربوہائیڈریٹ لیں — جوس، گلوکوز، یا چینی ملا پانی۔ ${String(RECHECK_MINUTES)}\u00A0منٹ بعد دوبارہ چیک کریں، اور اگر ابھی بھی کم ہو تو پھر سے کھائیں یا پیئں۔`,
    escalation: 'اگر آپ خود کھا پی نہ سکیں تو کسی سے مدد لیں۔',
    gate: `جب تک بلڈ شوگر ${String(HYPO_LEVEL_1)}\u00A0mg/dL سے اوپر نہ ہو، انسولین نہ لگائیں۔`,
  },
  bandB: {
    title: 'آپ ٹارگٹ سے کافی نیچے ہیں۔',
    body: 'بہتر ہے کہ انسولین لگانے سے پہلے کچھ کھا لیں، اور بعد میں دوبارہ چیک کریں۔',
  },
  /**
   * §10.5 v9 — the instruction NEVER changes between the full card and the
   * compact line. v8's compact copy read "Above 250 again — if this is new, or
   * you feel unwell, check ketones", and for a repeated high reading in someone
   * who feels well BOTH CONDITIONS ARE FALSE: the warning stayed visible while
   * the action quietly became optional. CDC guidance makes a reading at or above
   * 250 **or** illness a reason to test; novelty is not a prerequisite.
   *
   * "Above 250" rather than "above 250 again", because the derivation never
   * witnessed a repetition — §10.5's residual is that an unrecorded calculation
   * leaves no trace, so a later result can render full again.
   */
  bandE: {
    title: `${String(KETONE_ADVISORY)} سے اوپر — کیٹون چیک کریں`,
    body: 'طبیعت خراب ہونا خود ہی ٹیسٹ کرنے کی وجہ ہے، ریڈنگ چاہے کچھ بھی ہو۔ اگر [[ketones]] موجود ہوں تو اپنے ڈاکٹر سے رابطہ کریں۔',
  },

  // ── §8.1's timing ─────────────────────────────────────────────────────────
  timing: {
    /**
     * §8.5 — THE WAIT IS THE READER'S INSULIN'S, and three shapes is not one
     * shape too many.
     *
     * A range is what a class label states. A single number is what a
     * prescriber says, so `[n, n]` renders as one number rather than as "20 to
     * 20 minutes". And zero is an instruction in its own right — Fiasp and
     * Lyumjev are both labelled for injection at the start of the meal —
     * so "wait 0 minutes" would be the app rendering a sentence nobody means.
     *
     * Urdu note: the three-shape reasoning holds unchanged in Urdu ("20 سے 20
     * منٹ" is exactly as absurd), so all three branches survive.
     */
    before: (delay: EatDelay): string => {
      const [lo, hi] = delay;
      if (hi === 0) return 'کھانا شروع کرتے ہی انسولین لگائیں۔';
      if (lo === hi) return `کھانے سے ${String(lo)}\u00A0منٹ پہلے انسولین لگائیں۔`;
      return `کھانے سے ${isolate(`${String(lo)}–${String(hi)}`)}\u00A0منٹ پہلے انسولین لگائیں۔`;
    },
    /**
     * When the app does not know which insulin is in the pen.
     *
     * It says nothing about a wait, and that silence is the point: this app
     * rendered Humulin R's twenty-to-thirty minutes to every reader until
     * 2026-09-20, including the ones whose insulin starts working in five. §7.5's
     * rule — an absence must never be rendered as a fact — applied to a clock.
     */
    beforeUnknown: 'ابھی انسولین لگائیں۔',
    beforeUnknownDetail:
      'اس ایپ کو معلوم نہیں کہ آپ کی انسولین کون سی ہے، اس لیے یہ نہیں بتا سکتی کہ کھانے سے کتنی دیر پہلے لگانی ہے۔ اپنے ڈاکٹر سے پوچھیں، اور چاہیں تو ان کا جواب سیٹنگز میں درج کر لیں۔',
    beforeDetail:
      'وقت تب شروع ہوتا ہے جب آپ اگلی اسکرین پر مقدار کنفرم کریں — ابھی سے نہیں، اور نہ اُس وقت سے جب ڈوز کا حساب لگا تھا۔',
    // §8.1 — band B INVERTS it. A 30-minute fast at 71 mg/dL is wrong.
    eatFirst: 'بلڈ شوگر ذرا کم ہے — پہلے کھائیں، پھر انسولین لگائیں۔',
    /**
     * Urdu: the arrow is ← rather than the English →, for the reason
     * `stacking.overrideAction` already gives — ARROWS DO NOT BIDI-MIRROR. In an
     * RTL line the injection phrase is painted on the right and the eat
     * instruction on the left (measured: 579px against 416px), so a → points
     * back at the timestamp, away from the instruction it introduces.
     *
     * This file shipped both conventions: the agent who translated the stacking
     * section flipped it and wrote down why, and the agent who translated this
     * one did not. Same file, opposite answers — which is exactly what a
     * glossary exists to prevent and exactly what a glossary cannot cover, since
     * it fixes 49 WORDS and this is a glyph.
     */
    injectedAt: (at: string, eatBy: string): string => `${at} پر ٹیکہ لگا ← ${eatBy} کے آس پاس کھا لیں۔`,
    /** A zero-width window: the instruction is a moment, not a span. */
    injectedAtEatNow: (at: string): string => `${at} پر ٹیکہ لگا ← ابھی کھائیں۔`,
    injectedAtOnly: (at: string): string => `${at} پر ٹیکہ لگا۔`,
  },

  // ── §4.2's lexical messages ───────────────────────────────────────────────
  /**
   * §4.2 v3 — the comma message must NOT presume decimal intent. Pakistan uses
   * period-decimal and comma-GROUPING, so the plausible keystroke here means
   * grouping: "2,50" intends 250. v3's "Use a period for decimals" instructs the
   * grouping-intent user to retype it as "2.50" — 0.25 units instead of 25, the
   * identical hundredfold under-dose, one obedience step later.
   */
  lexical: (reason: LexicalReason): string => {
    switch (reason) {
      case 'comma':
        return 'کوما ہٹا دیں — 250 ٹائپ کریں، 2,50 نہیں۔';
      case 'too_many_decimals':
        return 'اعشاریہ کے بعد زیادہ سے زیادہ دو ہندسے۔';
      case 'too_long':
        return 'ہندسے بہت زیادہ ہیں۔ نمبر چیک کریں۔';
      case 'signed':
        return 'صرف نمبر لکھیں، پلس یا مائنس کا نشان نہیں۔';
      case 'non_ascii_digits':
        return 'مہربانی کر کے نمبر انگریزی ہندسوں میں ٹائپ کریں۔';
      case 'not_a_number':
        return 'صرف نمبر۔ جو آپ نے ٹائپ کیا ہے اسے چیک کریں۔';
    }
  },

  range: {
    injectedAbove: `سرنج میں ${String(MAX_INJECTED)}\u00A0یونٹ سے زیادہ نہیں سماتے۔`,
    injectedZero: 'اس پر ٹیپ کرنے کا مطلب ہے کہ آپ نے ٹیکہ لگا لیا۔ کتنا لگایا، وہ درج کریں۔',
  },

  /**
   * §4.3 step 3 — below 20 or exactly zero is a COMBINED
   * invalid-reading-and-possible-low response, never one half silently chosen.
   * It renders INSIDE the block, because §10.5 rank 1 leaves nowhere else: a
   * band C/D block shows nothing beside it. Both readings of the impossible
   * number are stated — a mistyped entry by someone who may in fact be high,
   * and a meter past the bottom of its range — and neither is endorsed over
   * the other, the same refusal §10.6 item 7 makes about the dose.
   */
  blockedInvalidReading: `میٹر ${String(MIN_BLOOD_SUGAR)} سے نیچے کی ریڈنگ دکھا ہی نہیں سکتا، اس لیے یہ کوئی اصل ریڈنگ نہیں۔ اگر میٹر پر LO آیا تھا تو ابھی کچھ میٹھا کھائیں یا پیئں۔ اگر ٹائپ کرنے میں غلطی ہوئی ہے تو کچھ بھی اور کرنے سے پہلے دوبارہ چیک کریں۔`,

  /**
   * §4.5, written in v3 after v2 promised the text and never supplied it. This
   * is where the §3.1 disagreement actually resolves.
   */
  meterHi: {
    title: 'میٹر پر HI آ رہا ہے؟',
    body: `${String(MAX_BLOOD_SUGAR)} درج کریں۔ یہ ڈوز ${String(MAX_BLOOD_SUGAR)} کے حساب سے ہے اور غالباً کم پڑے گی — اسے کم از کم سمجھیں، مکمل جواب نہیں۔ ابھی [[ketones]] چیک کریں۔ اگر کیٹون موجود ہوں، یا الٹیاں آ رہی ہوں، تو یہ ایمرجنسی ہے: صرف انسولین لگانے سے [[ketoacidosis]] کا علاج نہیں ہو گا۔`,
  },
  /**
   * §4.5 and BUILD-NOTES note 2 — an out-of-range READING gets "check the
   * number", never band E's ketone wording, because "check ketones" is a
   * confusing reply to a typo. The core already produced `above_range` /
   * `below_range` as distinct reasons precisely so the interface could tell the
   * HI case from the LO case; until now the interface never used them, and
   * tapping "Work out the dose" on a 7090 did NOTHING AT ALL.
   */
  entryRange: {
    readingHigh: (max: number): string =>
      `میٹر ${String(max)} سے اوپر کی ریڈنگ نہیں دکھاتا۔ نمبر چیک کریں — اگر واقعی HI آ رہا ہے تو ${String(max)} درج کریں۔`,
    readingLow: (min: number): string =>
      `میٹر ${String(min)} سے نیچے کی ریڈنگ نہیں دکھاتا۔ نمبر چیک کریں — اگر LO آ رہا ہے تو کوئی نمبر بالکل درج نہ کریں۔ پہلے کچھ میٹھا کھائیں یا پیئں۔`,
    carbsHigh: (max: number): string =>
      `یہ ${String(max)}\u00A0گرام کاربوہائیڈریٹ سے زیادہ ہے۔ نمبر چیک کریں — یہ کھانے میں موجود کاربوہائیڈریٹ ہے، پلیٹ کا وزن نہیں۔`,
    carbsLow: 'کاربوہائیڈریٹ مائنس میں نہیں ہو سکتا۔',
  },

  /**
   * §4.3 step 5 — "blank and blank is no result, NOT '0 units'". The core has
   * always been right about that and the interface rendered NOTHING for it, so
   * tapping "Work out the dose" with both fields empty did nothing at all. Same
   * dead end as the out-of-range reading in note 38, reached a different way:
   * the outcome existed, the words did not.
   *
   * Two shapes, because the two branches mean different things. Nothing entered
   * is a prompt; a reading at or below target with no carbohydrate is a real
   * answer — there is nothing to dose for.
   */
  noResult: {
    nothingEntered:
      'ابھی کچھ درج نہیں ہوا۔ اس کھانے کا کاربوہائیڈریٹ درج کریں، اور اگر ریڈنگ موجود ہو تو اپنی بلڈ شوگر بھی۔',
    nothingToDose: (target: number): string =>
      `کوئی کاربوہائیڈریٹ نہیں، اور بلڈ شوگر ${String(target)} پر یا اس سے نیچے ہے۔ ڈوز کی کوئی وجہ ہی نہیں — یہ "0\u00A0یونٹ" نہیں، بلکہ سرے سے کوئی ڈوز نہیں بنتی۔`,
  },

  meterLo: {
    title: 'میٹر پر LO آ رہا ہے؟',
    body: `کوئی نمبر درج نہ کریں۔ ابھی کچھ میٹھا کھائیں یا پیئں — ${String(FAST_CARB_GRAMS)}\u00A0گرام تیز اثر والا کاربوہائیڈریٹ، جوس، گلوکوز، یا چینی ملا پانی سے — اور ${String(RECHECK_MINUTES)}\u00A0منٹ بعد دوبارہ چیک کریں۔`,
  },

  /**
   * §4.5 — the control that opens `meterHi` and `meterLo` on the reading
   * screen. A question rather than a bare "More", because on this screen it
   * stands beside a hint, not a list it is visibly truncating.
   */
  meterGuidance: 'میٹر پر HI یا LO آ رہا ہے؟',
  /**
   * The disclosure was one-way until 2026-09-13: tapping it set a flag that only
   * `new_calculation` cleared, so both cards stayed on the reading screen until a
   * whole dose cycle finished. Opening something with no way to close it is a
   * dead end of the same family as notes 38, 47 and 51.
   */
  meterGuidanceHide: 'اسے چھپا دیں',

  // ── §4.6's blank reading ──────────────────────────────────────────────────
  blankReading: {
    title: 'کوئی ریڈنگ درج نہیں ہوئی۔',
    body: `یہ حساب صرف کاربوہائیڈریٹ کا ہے — یہ نہیں بتا سکتا کہ آپ کی بلڈ شوگر کم تو نہیں۔ اگر لگے کہ بلڈ شوگر کم ہو رہی ہے تو پہلے چیک کریں۔ اگر امکان ہو کہ آپ ${String(HYPO_LEVEL_1)}\u00A0mg/dL سے نیچے ہیں تو اسے استعمال نہ کریں۔`,
    accept: 'سمجھ آ گئی — صرف کاربوہائیڈریٹ',
  },

  // ── §6.2 and §6.3's confirmation ──────────────────────────────────────────
  /**
   * §6.3 — the confirmation shows the INPUTS, not the dose. "The error is in the
   * input, so the input is what must be read. Showing the answer lets him check
   * the answer and skip the inputs, which is the failure the tier exists to
   * prevent."
   */
  confirm: {
    title: 'یہ بڑی ڈوز بنے گی۔ وہ دونوں نمبر چیک کریں۔',
    reveal: 'ڈوز دکھائیں',
    change: 'انہیں بدلیں',
    noReading: 'کوئی ریڈنگ درج نہیں ہوئی',
  },

  // ── §6.4's bound ──────────────────────────────────────────────────────────
  /** §6.4 — "the app is wrong, not the user", and it cannot be overridden. */
  boundFailure: {
    title: 'گڑبڑ اس ایپ میں ہے، آپ کے نمبروں میں نہیں۔',
    body: 'اس نے جو ڈوز نکالی وہ اتنی بڑی ہے کہ آپ کی سیٹنگز سے بن ہی نہیں سکتی — اس لیے ایپ اسے دکھائے گی نہیں۔ اس اسکرین سے انسولین نہ لگائیں۔ ڈوز کا حساب اُسی طریقے سے لگائیں جو اس ایپ سے پہلے تھا۔',
  },

  // ── §7.4 and §7.4.1's stacking ────────────────────────────────────────────
  stacking: {
    /** Urdu: before پہلے the oblique گھنٹے serves both 1 and many, so the English hour/hours ternary collapses to one form. */
    recentDose: (amount: string, hours: number): string =>
      `آخری ڈوز: ${amount}، ${String(hours)}\u00A0گھنٹے پہلے — ہو سکتا ہے اب بھی اثر کر رہی ہو۔`,
    /**
     * §7.5 — "no usable recent record" must never silently assert "no recent
     * insulin".
     */
    /**
     * The window is INTERPOLATED, not typed. Until 2026-09-12 this string said
     * "the last 4 hours" as characters while `pending` eleven lines down already
     * read `${String(STACK_SUPPRESS_HOURS)}` from config — the same file doing it
     * both ways, agreeing only by coincidence. Change the constant and this
     * sentence would have gone on naming the old window, in the one message
     * whose job is warning that a correction may stack.
     *
     * §11.8's lint rules cannot see it: they match numeric LITERALS, and a digit
     * inside a template string is just a character. `check-plan.py` catches the
     * class now (§20.3 — the checker gains the check in the edit that fixes it).
     */
    missingHistory: `کوئی حالیہ ڈوز درج نہیں۔ اگر آپ نے پچھلے ${String(STACK_SUPPRESS_HOURS)}\u00A0گھنٹوں میں انسولین لگائی ہے تو یہ کریکشن اسٹیک ہو سکتی ہے۔`,
    /** §7.6 — the app never converts "untrustworthy record" into "no insulin". */
    invalidTime: 'ایک ڈوز کے ریکارڈ میں وقت درست نہیں، اس لیے اسے نظرانداز کیا جا رہا ہے۔',
    negativeApplied:
      'آپ نے کچھ دیر پہلے انسولین لگائی ہے۔ آپ کی ریڈنگ ٹارگٹ سے نیچے ہے، اس لیے کریکشن پوری کی پوری لاگو کی جا رہی ہے — اسے روک لینے سے آپ کو انسولین زیادہ ملتی، کم نہیں۔',
    suppressedTitle: 'کریکشن روک لی گئی',
    /**
     * §7.4.1 — the consequence in HIS OWN UNITS, never "are you sure?".
     *
     * The wording is "at most about N — likely less this far in", NEVER a bare
     * figure. v3 presented the ceiling as an estimate, which overstates by
     * roughly 2x: at two hours into a ~6 hour profile about 110-135 mg/dL
     * genuinely remains, and by 3.5 hours only 65-90. Overstating discourages a
     * correction that is actually needed — at 400 mg/dL he would wait for 180
     * that is not coming and sit near 310 for hours, which §3.1 calls the unsafe
     * direction.
     */
    /** Urdu: same hour/hours collapse as recentDose (oblique گھنٹے before پہلے); the "at most about N — likely less" shape is preserved. */
    ceiling: (amount: string, hours: number, mgDl: number): string =>
      `آپ نے ${String(hours)}\u00A0گھنٹے پہلے ${amount} انسولین لگائی تھی۔ وہ انسولین اپنے طور پر اب بھی آپ کی بلڈ شوگر زیادہ سے زیادہ تقریباً ${String(mgDl)}\u00A0mg/dL کم کر سکتی ہے — اتنی دیر بعد غالباً اس سے کم ہی۔`,
    mealOnly: 'صرف کاربوہائیڈریٹ کے لیے',
    /** Urdu: the arrow is written ← so it still points from the action to the candidate in an RTL line (arrows do not bidi-mirror). */
    overrideAction: (candidate: string): string => `پھر بھی کریکشن شامل کریں ← ${candidate}`,
    /** §7.4.1 v4 — when either figure reaches the threshold, NO numbers show. */
    overrideWithheld: 'پھر بھی کریکشن شامل کریں',
    held: 'روک لی گئی، آپ نے کچھ دیر پہلے انسولین لگائی',
  },

  // ── §6.5's plausibility advisory ──────────────────────────────────────────
  /**
   * §6.5 — a REMINDER, not an accusation. v4's "Did you mean 200?" is wrong copy
   * on every genuine small entry, and "a 20 g entry is either a real snack or a
   * 200→20 typo, and nothing at entry time distinguishes them" — the
   * false-positive set is identical to the true-positive set. The copy has to
   * read correctly in both cases or it dies before the one firing that matters.
   *
   * No window claim: v3 said "last month" while using the last 30 entries, about
   * five days at his rate. The message states the baseline value, never a period.
   */
  /** Urdu: the English bare "g" is written out as گرام — the glossary bans single-letter unit abbreviations in Urdu. */
  advisory: {
    low: (carbs: string, baseline: string): string =>
      `${carbs}\u00A0گرام آپ کے معمول کے کھانوں سے کم ہے، جو تقریباً ${baseline}\u00A0گرام کے ہوتے ہیں۔ چیک کر لیں کہ یہ درست ہے۔`,
    high: (carbs: string, baseline: string): string =>
      `${carbs}\u00A0گرام آپ کے معمول کے کھانوں سے زیادہ ہے، جو تقریباً ${baseline}\u00A0گرام کے ہوتے ہیں۔ چیک کر لیں کہ یہ درست ہے۔`,
    /** §6.5 — "disabled and declared", as a settings status line. */
    notEnoughHistory: (eligible: number, needed: number): string =>
      `کھانے کے سائز کی جانچ: ابھی کافی ہسٹری نہیں (${String(needed)} میں سے ${String(eligible)} کھانے درج ہوئے ہیں)۔`,
    highDisabled: 'اوپر والی جانچ بند ہے — آپ کے کھانے اتنے بڑے ہیں کہ یہ کبھی چل ہی نہیں سکتی۔',
    active: (baseline: string): string => `کھانے کے سائز کی جانچ: آن ہے، ${baseline}\u00A0گرام کے معمول کے کھانے کے حساب سے۔`,
  },

  // ── §7.1, §7.2, §7.3 — logging ────────────────────────────────────────────
  log: {
    injected: 'میں نے یہ ڈوز لگا لی ہے',
    /**
     * §7.2 — *"**Tap after §8.2 expiry** is permitted with amended wording (the
     * log records what he did, and he may genuinely have injected at minute
     * 16), but the recorded timestamp is the tap time and the wording says so."*
     *
     * This IS the amended wording, and the clause it answers is the last one:
     * the label states the timestamp, because that is the fact a person cannot
     * otherwise see and the one the record depends on.
     *
     * Until 2026-09-11 the expired result replaced the log control with "Check
     * again" under a comment citing §8.2 — a rule §8.2 does not contain; it
     * specifies a staleness banner and says nothing about removing controls. So
     * someone who calculated, was interrupted, injected at minute 16 and came
     * back could not record the injection at all, and §7.4's gate went blind on
     * a real dose. Losing a row is worse than logging a late one.
     */
    /** Urdu: first person uses the نے construction (object agreement) so the label is not gendered for the speaker. */
    injectedAfterExpiry: 'میں نے انسولین لگا لی ہے — موجودہ وقت پر درج کریں',
    amountQuestion: 'آپ نے اصل میں کتنے یونٹ لگائے؟',
    amountHint:
      'پہلے سے وہی بھرا ہوا ہے جو ایپ نے حساب لگا کر نکالا تھا۔ اگر آپ نے کچھ اور لگایا تھا تو اسے بدل دیں — ریکارڈ میں وہی ہونا چاہیے جو اصل میں ہوا۔',
    amountOnlyChance:
      'ابھی سیٹ کر لیں — بدلنے کا بس یہی ایک موقع ہے۔ بعد میں اندراج ڈیلیٹ تو ہو سکتا ہے، مگر بدلا کبھی نہیں جا سکتا۔',
    commitIsHere:
      'نیچے والا ٹیپ ہی اسے محفوظ کرتا ہے۔ اندراج بھی اسی ٹیپ سے بنتا ہے، اور اسٹیکنگ کا وقت بھی اسی سے شروع ہوتا ہے۔',
    commit: 'یہ ٹیکہ درج کریں',
    /** §7.1 — the divergence confirmation, which v9 named and never defined. */
    /** Urdu: "ڈوز ... تھی" keeps the verb agreeing with ڈوز (f), never with the interpolated amount. */
    divergent: (calculated: string, injected: string): string =>
      `ایپ کے حساب سے ڈوز ${calculated} تھی اور آپ نے ${injected} لکھا ہے۔ فرق بڑا ہے — درج کرنے سے پہلے چیک کر لیں۔`,
    /**
     * §7.1 — the tap that stands by the divergent amount. It asserts the fact
     * being recorded, like "I understand — carbohydrates only" does, because
     * the record should say what happened (§7.1) and a bare "yes" invites a
     * tap-through.
     */
    divergentAction: 'میں نے یہی ڈوز لگائی ہے — درج کریں',
    saved: (amount: string, at: string): string => `درج ہو گیا: ${amount}، ${at} پر`,
    /**
     * §7.2 — "the injection has already happened. A failed disk write does not
     * make it unknown to the running session." And the timer starts regardless.
     */
    /**
     * §7.2 — CORRECTED 2026-09-11. Both halves of the previous wording were
     * false, and this is the screen a person reads while deciding whether to
     * inject again.
     *
     * "retrying": nothing retries. `log_save_failed` is dispatched once from
     * the commit path and no code re-attempts the write, so `save.attempts`
     * cannot exceed 1.
     *
     * "still counted": §11.2's snapshot takes `lastDose` from the DATABASE via
     * `contextFrom`, and a failed write never reached it. `inSessionLastDose`
     * was written to close exactly this gap and has no call site, so the next
     * calculation inside the suppress window re-applies the full correction on
     * top of insulin already acting — the stacking event §7.4 exists to prevent,
     * reached through a reassurance.
     *
     * REVISED the same day, once `gateLastDose` landed: the gate now does read
     * the pending dose, so "it counts" became true and is said again — but only
     * for as long as the app is open, because nothing persists it. "Retrying"
     * stays out until something actually retries. The words track what the code
     * does, which is the whole point of the correction above.
     */
    pending: `یہ ڈوز محفوظ نہیں ہو سکی۔ جب تک ایپ کھلی ہے، یہ آپ کے اگلے حساب میں شامل رہے گی، لیکن ایپ بند ہوئی تو یہ ضائع ہو جائے گی — اسے کہیں لکھ لیں۔ ${String(STACK_SUPPRESS_HOURS)}\u00A0گھنٹوں کے اندر یہ بات اہم ہے: کریکشن اسٹیک ہو سکتی ہے۔`,
    /**
     * §7.2 — the escalation, after a write and its automatic retry have both
     * failed. It follows him off the logged screen, so it says WHICH dose
     * rather than "this one": by the time he sees it he may be two screens away.
     */
    /** Urdu: "${amount} والی ڈوز" names which dose while keeping the verb agreeing with ڈوز (f), not the amount. */
    stuck: (amount: string): string => `${amount} والی ڈوز ابھی تک محفوظ نہیں ہوئی۔`,
    stuckAction: 'دوبارہ کوشش کریں',
    stuckDismiss: 'ابھی نہیں',
    /** §7.3 — the confirmation quotes the INJECTED figure, the one §7.4 uses. */
    deleteTitle: (amount: string, at: string): string => `${at} والی ${amount} کی ڈوز ڈیلیٹ کر دیں؟`,
    deleteConsequence:
      'اسٹیکنگ کی جانچ اس وقت یہی ڈوز استعمال کر رہی ہے۔ اسے صرف تب ڈیلیٹ کریں جب آپ نے یہ لگائی ہی نہ ہو۔',
    deleteAction: 'یہ اندراج ڈیلیٹ کریں',
    /** Urdu: generic singular — the natural plural اندراجات is exactly the register the glossary rejects. */
    noEdit: 'اندراج ڈیلیٹ ہو سکتا ہے، بدلا کبھی نہیں جا سکتا۔',
  },

  // ── §7.8 — readings without injections ────────────────────────────────────
  reading: {
    offer: 'یہ ریڈنگ درج کریں',
    title: 'یہ ریڈنگ درج کریں',
    hint: 'یہ بغیر ڈوز کے، صرف ریڈنگ کے طور پر محفوظ ہو گی — جو بالکل وہی ہے جو اصل میں ہوا۔',
    noteQuestion: 'کوئی بات نوٹ کرنی ہے؟',
    notes: {
      before_bed: 'سونے سے پہلے',
      overnight: 'رات کے دوران',
      felt_low: 'بلڈ شوگر کم لگ رہی تھی',
      after_exercise: 'ورزش کے بعد',
    },
    save: 'یہ ریڈنگ محفوظ کریں',
  },

  // ── §7.9 — clearing ───────────────────────────────────────────────────────
  clear: {
    recordTitle: (count: number): string => `${String(count)}\u00A0اندراج ڈیلیٹ کریں؟`,
    recordBody: (from: string, to: string, readings: number): string =>
      `${from} سے ${to} تک کا پورا ریکارڈ، بغیر ڈوز والی ${String(readings)}\u00A0ریڈنگ سمیت۔ آپ کا نسخہ اور اس کی ہسٹری باقی رہیں گے۔ اسے واپس نہیں کیا جا سکتا۔`,
    exportFirst: 'پہلے کاپی محفوظ کریں',
    recordAction: 'ریکارڈ ڈیلیٹ کریں',
    startOverTitle: 'نئے سرے سے شروع کریں؟',
    startOverBody:
      'سب کچھ ختم ہو جائے گا: ریکارڈ، آپ کا نسخہ، اس کی ہسٹری، اور وہ نوٹ کہ آپ پہلے ڈوز کیسے طے کرتے تھے۔ سیٹ اپ دوبارہ چلے گا۔ اسے واپس نہیں کیا جا سکتا۔',
    startOverAction: 'نئے سرے سے شروع کریں',
    /** §7.9 — three states, and the third is NOT the second. */
    stackingKnown: (at: string): string =>
      `اسٹیکنگ کی جانچ ${at} والی ڈوز استعمال کر رہی ہے۔ اس کے بعد جانچ کو اس ڈوز کا پتہ نہیں رہے گا، اور اگلا نتیجہ کچھ بھی نہیں روکے گا۔`,
    /**
     * "Rendering 'no recent dose' when the truth is 'unknown' is §7.5's condemned
     * class — a FALSE SAFETY CLAIM — and it arrives here through a gate that
     * cannot see. Unknown states get their own copy, never the reassuring
     * neighbour's."
     */
    stackingUnknown:
      'یہ ایپ ابھی آپ کا ریکارڈ نہیں پڑھ پا رہی، اس لیے یہ نہیں بتا سکتی کہ کوئی حالیہ ڈوز بھلا دی جانے والی ہے یا نہیں۔ اگر آپ نے پچھلے چند گھنٹوں میں انسولین لگائی ہے تو آگے بڑھنے سے پہلے لکھ لیں کہ کیا لگائی اور کب۔',
  },

  // ── §7.7.1 — the two exports ──────────────────────────────────────────────
  /** §7.7.1 — named by PURPOSE, never by file type, and §10.2's rule applies. */
  exports: {
    moveTitle: 'دوسرے فون پر لے جائیں',
    moveBody: 'صرف یہی فائل ہے جسے یہ ایپ واپس لوڈ کر سکتی ہے۔ اسے ایسی جگہ رکھیں جہاں یہ بعد میں بھی آپ کے پاس رہے۔',
    saveTitle: 'ریکارڈ محفوظ کریں',
    saveBody:
      'ایک ایسا صفحہ جسے کوئی بھی، کسی بھی فون یا کمپیوٹر پر کھول کر پڑھ سکتا ہے۔ ڈاکٹر کو دکھانے کے لیے اچھا ہے۔ اسے ایپ میں واپس لوڈ نہیں کیا جا سکتا۔',
    /**
     * §7.7.1 v23 — the counter reports only the act the app performed. "Last
     * moved to another phone" overstates a local download; "last saved"
     * overstates it too. What the app observes is that a download STARTED.
     *
     * Urdu: the English day/days plural ternary collapses — دن is invariant
     * after a numeral. The today/days-ago ternary genuinely differs and stays.
     */
    lastCopy: (days: number): string =>
      `آخری بار ایسی کاپی بنائی گئی جس سے ریکارڈ واپس لایا جا سکتا ہے: ${days === 0 ? 'آج' : `${String(days)}\u00A0دن پہلے`}`,
    neverCopied: 'ابھی تک کوئی کاپی محفوظ نہیں ہوئی',
    /**
     * Both buttons used to read "Make it". Two controls with the SAME
     * accessible name on one screen is an accessibility defect outright — a
     * screen reader announces "Make it, Make it" with nothing to tell them
     * apart — and "make" never said what would be made. "Download" says what
     * happens, and the noun says which of the two you get.
     */
    makeBackup: 'بیک اپ ڈاؤن لوڈ کریں',
    makeReport: 'رپورٹ ڈاؤن لوڈ کریں',
  },

  // ── §6.7 — the dosing-history note ────────────────────────────────────────
  dosingHistory: {
    question: 'یہ ایپ استعمال کرنے سے پہلے آپ کھانے کی انسولین کی ڈوز کیسے طے کرتے تھے؟',
    hint: 'ایک جملہ کسی نمبر سے زیادہ کام آئے گا — اصل بات یہ ہے کہ ڈوز کیسے چنی جاتی تھی، صرف یہ نہیں کہ کتنی تھی۔',
    skip: 'ابھی نہیں',
    /** §6.7 v19 — declining CONFIRMS FIRST, stating the consequence. */
    declineAction: 'دوبارہ نہ پوچھیں',
    declineConfirm:
      'آپ سے دوبارہ نہیں پوچھا جائے گا، اور بعد میں یہ بات درج کرنے کا کوئی اور راستہ نہیں ہے۔ کیا آپ کو یقین ہے؟',
    save: 'یہ محفوظ کریں',
  },

  // ── §10.6 — first run and disclosure ──────────────────────────────────────
  firstRun: {
    disclaimerTitle: 'استعمال کرنے سے پہلے یہ پڑھ لیں۔',
    /**
     * §10.6 item 1, RESHAPED 2026-09-20 [Momin] — the severity is carried by
     * the FORM now, not only by the words.
     *
     * It was five paragraphs of identical grey prose, and the first two
     * sentences of it are the whole legal position of this app. §12 already
     * learned this lesson one screen over: "the form carries the severity, not
     * just the words", and an advisory that looks like every other paragraph is
     * read like every other paragraph.
     *
     * **ONE red panel, and §10.5's budget is why.** Two reds is no red — the
     * second teaches that red is how this app writes, and then the first stops
     * being read. So the device statement takes it, because it is what the
     * reader must carry out of this screen, and the regimen statement is amber,
     * because its job is to send the wrong reader away rather than to be
     * remembered.
     *
     * The last two are plain prose on purpose. "It fills in none of them" and
     * the non-endorsement line are FACTS about the app, not hazards to the
     * reader, and panelling them would spend the budget on nothing.
     */
    notADevice: {
      title: 'یہ کوئی طبی آلہ نہیں ہے',
      body: 'اسے کسی سرکاری ادارے کی منظوری حاصل نہیں، اور نہ ہی اسے کلینیکل طور پر پرکھا گیا ہے۔ یہ وہی حساب لگاتی ہے جو آپ کے ڈاکٹر نے پہلے سے لکھ دیا ہے — انسولین لگانے سے پہلے اس کی بتائی ہوئی ہر ڈوز چیک کریں۔',
    },
    // ADDED 2026-09-13. Until then the app never said which diabetes it was
    // for, anywhere — the only mention of the condition at all was "diabetic
    // ketoacidosis" inside the band E emergency wording. That was tolerable
    // while one person used it. It is not tolerable for an app about to be
    // made findable, because "insulin dose calculator" is searched by people
    // with type 2 just as often, and their regimen is not what this
    // arithmetic describes.
    //
    // Stated at the GATE rather than only in the reference, because §10.6
    // makes this screen inescapable and note 59 keeps the acknowledgement in
    // memory only — so it is read on every launch, before anything else.
    //
    // Urdu: this title carries the glossary's one-time gloss «(شوگر کی بیماری)»
    // — hard case 5 puts it at the disease's first mention, and this
    // every-launch gate is the first mention.
    typeOne: {
      title: 'یہ ٹائپ\u00A01 ذیابیطس (شوگر کی بیماری) کے لیے ہے',
      body: 'یہ مان کر چلتی ہے کہ آپ روزانہ لمبے اثر والی انسولین لگاتے ہیں اور کھانے کے وقت کاربوہائیڈریٹ گنتے ہیں۔ ٹائپ\u00A02 کے علاج کا طریقہ مختلف ہوتا ہے، اور یہ نمبر اس کے لیے ٹھیک نہیں۔',
    },
    disclaimerBody: [
      'یہ آپ کے ڈاکٹر کے دیے ہوئے تین نمبروں سے کام کرتی ہے، اور ان میں سے کوئی بھی خود نہیں بھرتی۔ کسی اور کے نمبر آپ کے لیے غلط ہیں۔',
      'آپ کا میٹر یا آپ کی انسولین بنانے والی کمپنیوں نے نہ اس ایپ کو منظور کیا ہے، نہ ان کا اس سے کوئی تعلق ہے۔',
    ],
    disclaimerAccept: 'میں نے سمجھ لیا — استعمال میری اپنی ذمہ داری پر',
    /**
     * §10.6 item 7 — the wording deliberately endorses NEITHER figure. §1.4's
     * whole finding is that the app's number and his habit disagree and the
     * RECORD settles which is right. Copy leaning either way would be the
     * anchoring hazard that removed §6.7's result-screen line.
     */
    disagreementTitle: 'اگر یہ نمبر آپ کی عام ڈوز سے بالکل مختلف لگے',
    disagreementBody:
      'یہ ایپ آپ کے ڈاکٹر کے دیے ہوئے تین نمبروں سے ڈوز کا حساب لگاتی ہے۔ اگر اس کا دکھایا ہوا نمبر اس سے بہت مختلف ہو جو آپ عام طور پر لگاتے ہیں، تو کسی ایک نمبر کو بھی صحیح مان کر نہ چلیں۔ نہ اس ایپ کو آپ کی عام ڈوز سے ملا کر جانچا گیا ہے، نہ آپ کی عام ڈوز کو اس ایپ سے۔ ریکارڈ ڈاؤن لوڈ کر کے اپنے ڈاکٹر کو دکھائیں اور فیصلہ انہیں کرنے دیں۔',
  },

  // ── §10.6 item 5 — the two insulins ───────────────────────────────────────
  /** Neither "basal" nor "bolus" appears in the interface (§10.2). */
  twoInsulins: {
    title: 'یہ ایپ کیا کرتی ہے اور کیا نہیں کرتی',
    body: 'انسولین دو طرح کی ہوتی ہے۔ ایک آہستہ والی بیک گراؤنڈ انسولین ہے — پیچھے سے، دن بھر کام کرنے والی — جو دن میں ایک بار لی جاتی ہے: یہی وہ ہے جس کا حساب یہ ایپ نہیں لگاتی اور جسے کبھی نہیں بدلتی۔ دوسری وہ تیز انسولین ہے جو آپ کھانے کے ساتھ لگاتے ہیں — بس اسی ایک کا حساب یہ ایپ لگاتی ہے۔',
  },

  /** §10.6 item 3 — disclosing the gap is the alternative to modelling it (§9). */
  doesNotKnow: {
    title: 'وہ چیزیں جن کا اس ایپ کو پتہ نہیں',
    items: [
      'وہ انسولین جو آپ نے لگائی مگر جس کا اس کے پاس کوئی ریکارڈ نہیں۔',
      'ورزش — بلڈ شوگر کم ہونے کی ان دو سب سے عام وجوہات میں سے ایک، جنہیں یہ ایپ دیکھ نہیں سکتی۔',
      'شراب — دوسری وجہ۔',
      'بیماری، جس میں عام طور پر آپ کی انسولین کی ضرورت بڑھ جاتی ہے۔',
      'چکنائی اور پروٹین، جو گھنٹوں بعد بلڈ شوگر پر اثر کرتے ہیں۔',
      'دن کے مختلف وقتوں پر آپ کی ضرورت میں کوئی بھی تبدیلی۔',
    ],
  },

  /**
   * §12 — what this browser has promised about keeping the record, and what to
   * do when it has promised nothing.
   *
   * **Three states, because there are three answers.** A browser that will not
   * say is not a browser that deletes: reporting capability honestly forbids
   * claiming danger as much as it forbids claiming durability, and §12's rule
   * is explicit that a successful write does not prove persistence.
   *
   * The first sentence of the at-risk copy is the record, not the fix. Someone
   * reading a storage warning on an app holding their doses wants to know what
   * has happened to what they already logged, before they are told what to do
   * about it.
   *
   * iOS is named rather than described, and NOT as "Safari": every browser on
   * an iPhone is the same engine underneath, so a person using Chrome there is
   * affected and would read past a warning about Safari.
   */
  storage: {
    label: 'آپ کا ریکارڈ محفوظ رکھنا',
    durable: 'یہ براؤزر آپ کا ریکارڈ محفوظ رکھے گا۔',
    unknown: 'یہ براؤزر یہ نہیں بتاتا کہ وہ آپ کا ریکارڈ محفوظ رکھے گا یا نہیں۔ کبھی کبھار ایک کاپی محفوظ کر لیا کریں۔',
    atRisk: 'یہ براؤزر آپ کا ریکارڈ ڈیلیٹ کر سکتا ہے۔',
    /**
     * Shown under `atRisk` in Settings. Seven days is not interpolated from a
     * constant because it is not ours — it is WebKit's policy, and a number in
     * `config.ts` would imply this app can change it.
     */
    atRiskWhy:
      'iPhone یا iPad پر براؤزر اُن ایپس کو ڈیلیٹ کر دیتا ہے جو تقریباً ایک ہفتے سے کھولی نہ گئی ہوں — اور اُن کے ساتھ یہاں درج کیا ہوا سب کچھ بھی۔ اس ایپ کو ہوم اسکرین پر شامل کر لیں تو ایسا نہیں ہوتا۔',
    /**
     * ONE bar, and it is the install offer wearing an honest reason.
     *
     * The storage warning and the install offer are the same message: one says
     * why, the other says what. A separate bar would have been a third one
     * stacking on the update prompt, and `promptBar` appends rather than
     * replaces — so the duplication was the bar, not the wording.
     *
     * This shape is for the browser that CANNOT be asked to install: WebKit
     * never fires `beforeinstallprompt`, so the offer that prevents the loss
     * was never shown to the only people who needed it.
     *
     * No "nothing has happened to your record" here, unlike the 404 page.
     * Nothing HAS happened — this is about next week — and reassuring someone
     * about a loss that has not occurred only muddies a short message.
     */
    atRiskBar: 'آپ کی ڈوزیں ڈیلیٹ ہو سکتی ہیں۔',
    /**
     * The bar names its own off switch. An opt-out nobody can find is the
     * same as no opt-out, and without it the only way to stop a reminder that
     * never resolves itself is to dismiss it for ever.
     */
    barOptOut: 'یہ یاد دہانی آپ سیٹنگز میں جا کر بند کر سکتے ہیں۔',
    /**
     * The off switch itself, and it is a TAP rather than an inference.
     * Reaching Settings proves nothing — it is where you go to change a ratio
     * or export, and this section sits near the bottom. Treating a scroll past
     * it as "informed" is the kind of guess this app refuses everywhere else.
     */
    stopWarning: 'یہ یاد دہانی بند کریں',
    stoppedWarning: 'اس بارے میں یاد دہانیاں اب بند ہیں۔ اوپر والی وارننگ اپنی جگہ رہے گی، تاکہ آپ کو پتا رہے کہ معاملہ کہاں کھڑا ہے۔',
    atRiskDismiss: 'ٹھیک ہے',

    /**
     * **The instruction is the one place platform matters, and it has to.**
     *
     * §12's rule governs WHETHER to warn, and that stays a capability question
     * — `persisted()`, no sniffing. But there is no API for "what is the
     * install control called here", and the answer genuinely differs: an iPhone
     * says *Add to Home Screen*, macOS Safari says **Add to Dock**. Telling a
     * Mac user to find a Home Screen sends them looking for something that does
     * not exist.
     *
     * Split by TOUCH rather than by name. `maxTouchPoints` separates iOS and
     * iPadOS from macOS without parsing a user-agent string, and it cannot be
     * wrong in a way that matters: every browser that reaches this copy is
     * WebKit, so the only question is whether it is the handheld one.
     *
     * Three steps, not two. The confirming **Add** is a real tap, and someone
     * following instructions stops at the last step you name.
     *
     * [ur] The control names stay Latin: they are what the device screen
     * prints, same rule as the brand names.
     */
    addToHomeScreen: 'Share پر ٹیپ کریں، پھر “Add to Home Screen”، پھر “Add”۔',
    addToDock: 'Share پر کلک کریں، پھر “Add to Dock”، پھر “Add”۔',
  },

  /**
   * The install steps for THIS device, read once and used in both places that
   * need them — the bar and Settings. Two copies would drift the day either is
   * reworded, and the two are read minutes apart by the same person.
   *
   * Reads its own object, exactly as the English one does. The self-reference
   * resolves at call time rather than at construction, so naming `COPY_UR` from
   * inside its own initialiser is fine — and it has to be `COPY_UR`, not `COPY`,
   * or an Urdu interface would give the steps in English.
   */
  installSteps: (touchPoints: number): string =>
    touchPoints > 0 ? COPY_UR.storage.addToHomeScreen : COPY_UR.storage.addToDock,

  /**
   * §8.5 — which mealtime insulin is in the pen.
   *
   * Every string here exists because the app used to answer this question by
   * assuming. It named Humulin R in four places as though it were the reader's,
   * rendered Humulin R's pre-meal wait after every dose, and ended its one
   * disclosure with *"ask your doctor how long before a meal to inject"* —
   * then gave the answer nowhere to live.
   *
   * **The question is required and has no default.** `src/config.ts` records
   * why the three ratios stopped being prefilled — *"a prefilled 150 is a
   * prescription wearing the clothes of a default"* — and an insulin is the
   * same category. A required question also has no tap-through, which is the
   * whole answer to the objection that a picker gives false confirmation of fit
   * to someone who does not know their insulin differs: they cannot pass it
   * without reading it.
   */
  insulin: {
    title: 'کھانے کے وقت آپ کو کون سی انسولین لگتی ہے؟',
    /**
     * Says what turns on the answer AND what does not, in that order. Someone
     * who thinks this changes their dose will worry about getting it wrong in
     * the wrong way; the dose is theirs either way, and the two clocks are not.
     */
    intro:
      'اس سے آپ کی ڈوز نہیں بدلتی — وہ آپ کے اپنے ٹارگٹ، ISF اور ICR سے نکلتی ہے، انسولین چاہے کوئی بھی ہو۔ اس سے دو چیزیں بدلتی ہیں: کھانے سے پہلے کتنا انتظار کرنا ہے، اور ایک کریکشن کے بعد اگلی سے پہلے ایپ کتنا انتظار کرتی ہے۔',
    whereToLook:
      'یہ پین یا شیشی پر لکھا ہے۔ بڑا نام برانڈ ہے؛ اُس کے نیچے والا چھوٹا نام خود انسولین ہے، اور دونوں میں سے کسی بھی نام سے وہ نیچے کی فہرست میں مل جائے گی۔',
    /**
     * Who Hasham is, said on the screen that now asks first — matching
     * `settings.builtFor`, which names him beside the three ratios.
     *
     * **It ends by pointing at the reader's own box, and that clause is not
     * decoration.** §8.5's objection to a picker was that it could give false
     * confirmation of fit to somebody who does not know their insulin differs.
     * A named example on a screen of tappable brands is the one place that
     * objection has teeth, so the sentence has to close the door it opens.
     *
     * [ur] "Hasham" is left in Latin script deliberately: the Urdu spelling of
     * his name is his family's to give (glossary open question 6) — do not
     * guess ہشام without Momin's confirmation.
     */
    builtFor:
      'یہ ایپ میں نے اپنے بھائی Hasham کے لیے بنائی ہے، جسے Humulin R لگتی ہے۔ بہت ممکن ہے آپ کی کوئی اور ہو — اُس والی چن لینے کے بجائے اپنا ڈبہ پڑھیں۔',
    /** No skip, and the screen says so rather than just having no button. */
    required: 'اس سوال کا کوئی پہلے سے طے شدہ جواب نہیں، اور اسے چھوڑ کر آگے جانے کا کوئی راستہ بھی نہیں۔ جو جواب آپ کی انسولین کے بارے میں غلط ہو، وہ سرے سے ایپ نہ ہونے سے بھی بُرا ہے۔',
    /**
     * The headings. Grouping is the safety mechanism, not the tidiness: HumuLIN
     * and HumaLOG are on ISMP's confused-drug-names list, as are NovoLIN and
     * NovoLOG, and an alphabetical list seats each pair in consecutive rows.
     *
     * [ur] Latin class tags stay beside the Urdu headings where pens print the
     * class word in English (glossary hard case 7).
     */
    classHeading: (insulinClass: InsulinClass): string => {
      switch (insulinClass) {
        case 'rapid':
          return 'تیز اثر والی (Rapid)';
        case 'ultra_rapid':
          return 'بہت تیز اثر والی (Ultra-rapid)';
        case 'regular':
          return 'ریگولر ہیومن انسولین (Regular)';
        case 'premix':
          return 'پری مکس (Premixed)';
        case 'intermediate':
          return 'درمیانے اثر والی';
        case 'long':
          return 'لمبے اثر والی';
      }
    },
    /** One line per heading, so a reader can recognise their class without knowing the word. */
    classNote: (insulinClass: InsulinClass): string => {
      switch (insulinClass) {
        case 'rapid':
          return 'تقریباً پندرہ منٹ میں اثر شروع کر دیتی ہے۔ کھانے سے ذرا پہلے لگائی جاتی ہے۔';
        case 'ultra_rapid':
          return 'اس سے بھی جلدی اثر شروع کرتی ہے۔ کھانے کے شروع میں لگائی جاتی ہے۔';
        case 'regular':
          return 'اثر آہستہ شروع کرتی ہے اور زیادہ دیر چلتی ہے۔ کھانے سے خاصی دیر پہلے لگائی جاتی ہے۔';
        case 'premix':
          return 'ایک پین میں دو انسولین، دن میں دو بار کے بندھے شیڈول پر۔ یہ ایپ اِن کا حساب نہیں لگا سکتی۔';
        case 'intermediate':
          return 'بیک گراؤنڈ انسولین، دن میں ایک یا دو بار لی جاتی ہے۔ ہر کھانے پر الگ ڈوز نہیں۔';
        case 'long':
          return 'بیک گراؤنڈ انسولین، عام طور پر دن میں ایک بار۔ یہ وہ نہیں جو کھانے کے لیے لگائی جاتی ہے۔';
      }
    },
    alsoSoldAs: (name: string): string => `${name} کے نام سے بھی ملتی ہے`,
    /**
     * Brands and INN molecule names stay Latin — they are printed on the vial.
     * These are the app's own words, so they translate.
     */
    generic: {
      'aspart-other': { brand: 'انسولین اسپارٹ، کوئی اور برانڈ' },
      'lispro-other': { brand: 'انسولین لسپرو، کوئی اور برانڈ' },
      'regular-other': { brand: 'ریگولر ہیومن انسولین، کوئی اور برانڈ' },
      'premix-other': {
        brand: 'کوئی اور پری مکس انسولین',
        molecule: 'ایک مقررہ تناسب میں دو انسولین',
      },
    },

    unknownHeading: 'یقین نہیں',
    unknownLabel: 'مجھے معلوم نہیں، یا میری والی فہرست میں نہیں ہے',
    unknownNote:
      'ایپ کام کرتی رہے گی اور آپ کی ڈوز پر کوئی اثر نہیں پڑے گا۔ بس یہ بتانا بند کر دے گی کہ کب کھانا ہے، کیونکہ وہ محض اندازہ ہوتا۔',

    // ── the confirmation echo ───────────────────────────────────────────────
    /**
     * Shown after the tap, before it is saved. It restates the CLASS FACTS
     * rather than the name just tapped, because a reader re-reading their own
     * choice learns nothing — the facts are what a cross-class mispick
     * contradicts.
     */
    confirmTitle: (brand: string): string => `آپ کو ${brand} لگتی ہے`,
    confirmClass: (heading: string, note: string): string => `${heading}۔ ${note}`,
    /**
     * The physical check, and it is the one that catches the dangerous mistake.
     *
     * Rapid, ultra-rapid and regular insulins are all clear solutions. NPH and
     * every premix containing it are SUSPENSIONS — visibly cloudy, and their
     * labels require resuspension before each dose for that reason. So "is it
     * clear?" does not tell a Humalog user from a NovoRapid user, and does not
     * need to: a within-class mispick changes nothing. It tells a premix user
     * that they are on the wrong screen, which is the only pick that matters.
     */
    confirmClear:
      'کھانے کی انسولین پانی جیسی صاف ہوتی ہے۔ اگر آپ کی دھندلی یا دودھیا لگے، یا اُس پر لکھا ہو کہ لگانے سے پہلے رول کریں، تو وہ پری مکس یا بیک گراؤنڈ انسولین ہے — واپس جا کر دوبارہ دیکھیں۔',
    confirmWait: (wait: string): string => `ڈوز کے بعد ایپ آپ کو بتائے گی: ${wait}`,
    confirmWaitEditable: 'سیٹنگز میں جا کر آپ اس کی جگہ اپنے ڈاکٹر کے بتائے ہوئے منٹ رکھ سکتے ہیں۔',
    confirmYes: 'جی، یہی میری ہے',
    confirmChange: 'کوئی اور چنیں',

    // ── the two exits, which are not the same ──────────────────────────────
    /**
     * §8.5 — a DEAD END. Premix only.
     *
     * Not a warning that can be tapped through. §7.4's gate has a designed
     * override because the reader can know better on the day; this has none,
     * because there is no dose here to be right about.
     */
    unsupportedTitle: (brand: string): string => `یہ ایپ ${brand} کی ڈوز کا حساب نہیں لگا سکتی`,
    unsupportedBody:
      'پری مکس انسولین دراصل مقررہ تناسب میں ملی ہوئی دو انسولین ہیں، جو مقررہ شیڈول پر لی جاتی ہیں — عام طور پر ہر روز اُنہی دو وقتوں پر اُتنے ہی یونٹ۔ خود اِن کے لیبل یہی کہتے ہیں: تناسب طے ہے، اور کھانے کے وقت والے حصے کو الگ سے گھٹایا بڑھایا نہیں جا سکتا۔ اس لیے یہاں ہر کھانے کا کوئی کاربوہائیڈریٹ تناسب ہے ہی نہیں جس کے بارے میں یہ ایپ درست ہو سکے، اور آپ کے کاربوہائیڈریٹ سے نکالا ہوا عدد بے معنی ہوتا۔',
    /**
     * §8.5 — the most useful thing this screen can say to a reader HERE, and it
     * is not about the app at all.
     *
     * ISPAD's limited-resource chapter — written for exactly this region, with
     * a Rawalpindi co-author — carries a grade E recommendation that premixed
     * insulins "should only be used until other alternatives can be obtained",
     * and in the same section: "Since the cost per unit of insulin of Regular
     * Insulin, NPH and pre-mixed insulins is similar, donations of Regular and
     * NPH insulins should be insisted upon." Verified from the chapter PDF by
     * two independent research passes.
     *
     * So a reader on premix may be on it because it was what was available,
     * not because it was cheaper — and the alternative is a regimen this app
     * DOES work for. Telling them costs one sentence.
     *
     * **It stops at "ask".** The chapter also says how a total daily dose might
     * be divided across three meals; that is a prescribing instruction and it
     * stays out of this app. Naming the question is the reader's to take to
     * their doctor; answering it is not ours.
     */
    unsupportedAlternative:
      'ایک بات اپنے ڈاکٹر سے پوچھنے لائق ہے: الگ لمبے اثر والی انسولین، اور کھانے سے پہلے ایک تیز اثر والی — فی یونٹ خرچ تقریباً اتنا ہی آتا ہے، اور ڈوز اُس کے حساب سے بنتی ہے جو آپ واقعی کھاتے ہیں۔ جہاں انسولین مشکل سے ملتی ہے، وہاں کے لیے بین الاقوامی رہنمائی یہی کہتی ہے کہ جہاں بندوبست ہو سکے، پری مکس کے بجائے یہی طریقہ اپنایا جائے — اور یہ ایپ اس کے ساتھ کام کرتی ہے۔',

    /**
     * §8.5 — a WRONG TURN. A background insulin, named in answer to a
     * question about meals.
     *
     * SEPARATED FROM THE DEAD END on Momin's question, 2026-09-20. The first
     * version gave both the same screen, so somebody on Lantus plus NovoRapid
     * — a regimen this app fits perfectly — was told "this app cannot
     * work out Lantus doses". It can. They answered with the wrong half of
     * their own regimen, and this screen's job is to ask for the other half
     * rather than to conclude anything.
     *
     * **NPH moved here from the dead end, and that was a real correction.** It
     * is never a mealtime insulin, so naming it is always a wrong turn —
     * but it has two readings and the body carries both. ISPAD's
     * limited-resource chapter actively recommends NPH twice daily plus regular
     * insulin before meals as the affordable regimen for this region; refusing
     * on "NPH" would block exactly the reader that chapter exists to create,
     * and that reader has a perfectly good carbohydrate ratio for the regular
     * insulin they inject at meals.
     *
     * [ur] The English capitalises BETWEEN for emphasis; the Urdu carries that
     * emphasis with the «نہیں بلکہ» contrast instead of capitals.
     */
    wrongTurnTitle: (brand: string): string => `${brand} آپ کی بیک گراؤنڈ انسولین ہے`,
    wrongTurnBody: (insulinClass: InsulinClass): string => {
      switch (insulinClass) {
        case 'intermediate':
          return 'NPH آٹھ سے بارہ گھنٹے کام کرتی ہے۔ یہ کھانوں کے وقت نہیں بلکہ کھانوں کے درمیان کام آتی ہے، اس لیے اس کی ڈوز اُس سے نہیں نکلتی جو آپ کی پلیٹ میں ہے۔ اگر آپ کھانے سے پہلے بھی کچھ لگاتے ہیں — عام طور پر ریگولر انسولین — تو یہاں اُسی کا نام لینا ہے۔';
        case 'long':
          return 'یہ کسی ایک کھانے کے لیے نہیں، پورے دن کے لیے کام کرتی ہے۔ کھانے سے پہلے آپ جو بھی لگاتے ہیں، یہاں اُسی کا نام لینا ہے۔';
        default:
          return 'یہ کھانے کے لیے نہیں، بیک گراؤنڈ کے لیے کام کرتی ہے۔ کھانے سے پہلے آپ جو بھی لگاتے ہیں، یہاں اُسی کا نام لینا ہے۔';
      }
    },
    /** The honest tail for NPH, whose second reading really is a dead end. */
    wrongTurnNoMealtime: (insulinClass: InsulinClass): string | null =>
      insulinClass === 'intermediate'
        ? 'اگر آپ کو صرف یہی انسولین لگتی ہے، ہر روز وہی دو ڈوزیں، تو یہ ایپ اُس طریقے کے لیے نہیں بنی — یہ ایک وقت میں ایک کھانے کا حساب لگاتی ہے۔'
        : null,
    wrongTurnBasalNote:
      'بتا دینے میں کوئی نقصان نہیں۔ آپ کی بیک گراؤنڈ انسولین کی اپنی جگہ سیٹنگز میں ہے، تینوں تناسبوں کے نیچے — وہاں درج کر دیں تاکہ آپ کے ڈاکٹر کو نظر آئے کہ آپ کل ملا کر کیا کیا لگاتے ہیں۔',
    wrongTurnAction: 'کھانے کے وقت والی انسولین چنیں',
    /**
     * What is NOT taken away, said before what is. Someone months into their
     * own record must not read this as the app locking them out of it.
     */
    unsupportedRecord:
      'آپ کے ریکارڈ کو کچھ نہیں ہوا۔ جو کچھ آپ نے درج کیا تھا سب یہیں ہے، آپ اب بھی اسے پڑھ سکتے ہیں، اور اب بھی ڈاکٹر کو دینے کے لیے کاپی محفوظ کر سکتے ہیں۔',
    unsupportedChange: 'کوئی اور انسولین چنیں',
    unsupportedOpenRecord: 'میرا ریکارڈ کھولیں',
    unsupportedFeedback:
      'اگر یہ غلط ہے — اگر آپ یہ انسولین کھانے سے پہلے لگاتے ہیں اور اس کے لیے کاربوہائیڈریٹ گنتے ہیں — تو ضرور بتائیں۔ بالکل ایسی ہی باتیں ہیں جن کا معلوم ہونا ضروری ہے۔',
    /**
     * TWO ways to reach a person, because the reader on this screen is the one
     * the app most needs to hear from and the one least likely to persist.
     * A form to fill in, or a mail app that opens with the subject already
     * written — whichever is less effort for them.
     */
    contactForm: 'رابطہ فارم کھولیں',
    contactEmail: 'اس کے بجائے ای میل بھیجیں',
    /** The subject line, pre-written so a reply is findable rather than untitled.
     * [ur] Stays Latin: it is a machine-matched email subject prefix, and
     * MealUnits stays Latin in every language. */
    contactSubject: 'MealUnits — ',

    // ── how the answer is shown and changed afterwards ──────────────────────
    settingsLabel: 'کھانے کی انسولین',
    settingsChange: 'تبدیل کریں',
    notRecorded: 'درج نہیں',
    /** §4.1 — an answered "I don't know" is not the same as never having asked. */
    notKnownLabel: (id: string): string =>
      id === 'unknown' ? 'معلوم نہیں' : 'درج نہیں',
    /**
     * What Settings shows beside the brand, so the two clocks are not
     * invisible.
     *
     * "After a dose it says", NOT "wait before eating": the phrase it wraps
     * already ends in *before eating*, and the first version rendered
     * "Wait before eating: 5–10 minutes before eating". It also says the
     * true thing, which is where the reader will actually meet this — on the
     * result screen after they log a dose.
     *
     * [ur] The ruling holds in Urdu: the wrapped phrase already carries
     * «کھانے سے … پہلے», so a "wait before eating" label would duplicate it
     * the same way.
     */
    settingsTiming: (wait: string): string => `ڈوز کے بعد ایپ کہتی ہے: ${wait}۔`,
    settingsTimingUnknown:
      'ایپ آپ کو یہ نہیں بتا رہی کہ کب کھائیں، کیونکہ اسے معلوم نہیں کہ آپ کو کون سی انسولین لگتی ہے۔',
    /**
     * Where the prefilled number came from, on screen. The sequencing ruling
     * required this: the values ship before a prescriber has ruled on them, so
     * the screen says whose numbers they are rather than presenting them as
     * this app's judgement.
     */
    /**
     * WHERE THE NUMBER CAME FROM, per class — and it stopped being one sentence
     * on 2026-09-20 when the rapid row moved to ISPAD's recommendation. Saying
     * "the manufacturers label this wait" over a figure that is a guideline's
     * and not a label's would be the app citing the wrong authority for its own
     * advice, which is the failure §10.2 exists to prevent one level up.
     *
     * The rapid line carries ISPAD's own fallback — *"or, at least, immediately
     * before meals"* — because the graded recommendation contains it and a
     * reader who cannot manage ten minutes should not be left thinking they are
     * doing it wrong.
     */
    waitSource: (insulinClass: InsulinClass): string => {
      switch (insulinClass) {
        case 'rapid':
          return 'تیز اثر والی انسولین کے لیے ISPAD یہی سفارش کرتی ہے، اور اُن کے ہاں اس کے ثبوت سب سے مضبوط درجے کے ہیں۔ اگر دس منٹ ممکن نہ ہوں تو کھانے سے فوراً پہلے لگا لینا بھی ٹھیک ہے۔ اسے اپنے نسخے سے ملا کر دیکھ لیں۔';
        case 'regular':
          return 'ریگولر ہیومن انسولین کے لیے ISPAD یہی سفارش کرتی ہے، اور یہ اُس کے قریب ہے جو بنانے والے ڈبے پر چھاپتے ہیں۔ اسے اپنے نسخے سے ملا کر دیکھ لیں۔';
        case 'ultra_rapid':
          return 'اس انسولین کے لیے یہی وہ وقت ہے جو بنانے والے ڈبے پر چھاپتے ہیں۔ اسے اپنے نسخے سے ملا کر دیکھ لیں۔';
        default:
          return 'اسے اپنے نسخے سے ملا کر دیکھ لیں۔';
      }
    },
    waitOwnLabel: 'آپ کے ڈاکٹر کا جواب، منٹوں میں',
    waitOwnHint:
      'اسے خالی چھوڑ دیں تو اوپر والا وقت استعمال ہو گا۔ اگر آپ کے ڈاکٹر نے منٹ بتائے ہیں تو یہاں لکھ دیں، ایپ پھر وہی استعمال کرے گی۔',
    /**
     * The same field, for the reader who has no class wait above it. There is
     * nothing to fall back to here, so the hint says what the empty field
     * means rather than what it overrides.
     */
    waitOwnHintUnknown:
      'اسے خالی چھوڑ دیں تو ایپ کھانے کے وقت کے بارے میں کچھ نہیں کہے گی۔ اگر آپ کے ڈاکٹر نے منٹ بتائے ہیں تو یہاں لکھ دیں، ایپ وہی استعمال کرے گی۔',
    waitOwnSet: (minutes: string): string => `آپ کا اپنا جواب استعمال ہو رہا ہے: کھانے سے ${minutes}\u00A0منٹ پہلے۔`,
    waitZero: 'کھانے کے شروع میں',
    waitRange: (lo: string, hi: string): string =>
      `کھانے سے ${isolate(`${lo}–${hi}`)}\u00A0منٹ پہلے`,
    waitSingle: (minutes: string): string => `کھانے سے ${minutes}\u00A0منٹ پہلے`,
  },

  settings: {
    targetQuestion: 'کریکشن کا ٹارگٹ کیا ہونا چاہیے؟',
    /** The target had no explanatory line at all, only the question. */
    targetClinical:
      'وہ بلڈ شوگر جو آپ کا ڈاکٹر کھانے سے پہلے آپ کے لیے چاہتا ہے۔ اکثر 100 اور 150 کے درمیان۔ Hasham کا ٹارگٹ 150 ہے۔',
    isfSentence: (value: string): string => `1\u00A0یونٹ بلڈ شوگر ${value}\u00A0mg/dL کم کرتا ہے`,
    isfQuestion: 'ایک یونٹ آپ کی بلڈ شوگر کتنی کم کرتا ہے؟',
    /**
     * The clinical NAME and the MEANING, in that order and in two sentences.
     * Momin's note: the name line was worth keeping, and the meaning has to be
     * there too for someone who has never been told what "1 to 30" is.
     *
     * The worked example names Hasham, with his permission — a real
     * prescription is a better illustration than an invented one, and naming a
     * person makes it unmistakably an EXAMPLE rather than a default.
     *
     * Urdu note: ISF stays Latin and the full name is a transliterated gloss —
     * the doctor says the English letters, so a translated name would match
     * ISOLATED, because the two numbers swap around the Latin "to" otherwise —
     * measured on the live settings screen as "30 to 1". The string exists so a
     * reader can match their doctor's notation, and it was showing its inverse.
     *
     * nothing said aloud. The quoted "1 to 30" stays Latin: it is what the
     * prescription paper has written on it.
     */
    isfClinical:
      `انسولین سینسیٹیویٹی فیکٹر (ISF)۔ اکثر ${isolate('"1 to 30"')} لکھا جاتا ہے — یعنی ایک یونٹ آپ کی بلڈ شوگر 30\u00A0mg/dL نیچے لاتا ہے۔ Hasham کا 30 ہے۔`,
    icrSentence: (value: string): string => `1\u00A0یونٹ ${value}\u00A0گرام کاربوہائیڈریٹ کے لیے کافی ہے`,
    icrQuestion: 'ایک یونٹ کتنے کاربوہائیڈریٹ کے لیے کافی ہے؟',
    icrClinical:
      `انسولین اور کاربوہائیڈریٹ کا تناسب (ICR)۔ اکثر ${isolate('"1 to 10"')} لکھا جاتا ہے — یعنی ایک یونٹ 10\u00A0گرام کاربوہائیڈریٹ کے لیے کافی ہے۔ Hasham کا 10 ہے۔`,
    /** §10.1.6 — the delta confirmation. A ratio fat-fingered 10→40 is inside
     * the accepted range, produces 5 units instead of 20 on a 200 g meal, and
     * passes every other check. */
    deltaWas: (value: string): string => `پہلے: ${value}`,
    deltaNow: (value: string): string => `اب: ${value}`,
    deltaTitle: 'یہ تبدیلی چیک کریں',
    softConfirm: 'یہ معمول کی حد سے باہر ہے۔ کیا یہ ٹھیک ہے؟',
    /**
     * §8.5 — "setup states the assumption". It never did: until 2026-09-12 the
     * string `U-100` appeared nowhere in `src/` except a passing mention in the
     * rounding copy, so the one place a concentration mismatch is catchable said
     * nothing. §8.5's OTHER half — `6 units (U-100)` on the output — was dropped
     * in the same amendment: §10.5 budgets what shares space with a dose, and
     * naming the insulin is something a person can check against the vial in
     * their hand where a concentration is not.
     *
     * It sits after the ratios and before rounding because that is where the
     * numbers stop and the word "unit" starts doing the work.
     */
    /**
     * REWRITTEN 2026-09-20, because §8.5.1 made the old sentence false for most
     * readers. It said "the standard strength, and what Humulin R is" — a claim
     * about the reader's own insulin, written when the app assumed there was
     * only one.
     *
     * **It is not parameterised by brand, and that is the safety decision.**
     * "The standard strength, and what NovoRapid is" would be true; the same
     * sentence with Humalog or Lyumjev in it would not, because both are also
     * sold at 200 units/mL. A sentence that is right for most brands and wrong
     * for two is worse than one that names none — it would tell exactly the
     * reader holding a 200-unit pen that their strength had been checked.
     *
     * So it points at the box instead, which is the one thing the reader can
     * actually verify — the same move §8.5 made when it asked for the brand on
     * the dose rather than the concentration.
     *
     * **U-40 stays named and keeps the 2.5-times figure.** It is not a museum
     * piece here: U-40 human insulin with matching syringes is still sold
     * across South Asia, which is this app's own region. U-200 is the newer
     * hazard and is named alongside it. The multiplier belongs to U-40 and is
     * attached to it rather than left floating, because "2.5 times" against a
     * sentence that also mentions U-200 would be wrong about one of them.
     *
     * Urdu note: U-100, U-200, U-40 and the printed "100 units/mL" stay Latin
     * (glossary hard case 8) — the string's one job is matching eye to box, and
     * the box is printed in English.
     */
    unitAssumption:
      'یہ یونٹ U-100 انسولین کے ہیں — یعنی ہر ملی لیٹر میں 100\u00A0یونٹ۔ اسٹرینتھ ڈبے پر اور پین پر چھپی ہوتی ہے، اور ایک نظر ڈال لینا کام کی بات ہے: کچھ اینالوگ پین U-200 ہوتے ہیں، اور U-40 اب بھی بنتی ہے اور اب بھی WHO کی ضروری دواؤں کی فہرست میں ہے۔ اگر آپ کے ڈبے یا پین پر 100\u00A0units/mL نہیں لکھا تو ان میں سے کوئی نمبر اُس انسولین کے لیے ٹھیک نہیں — U-40 کے ساتھ ہر ڈوز 2.5\u00A0گنا غلط ہو جائے گی۔ کسی اور اسٹرینتھ کے لیے جان بوجھ کر کوئی سیٹنگ نہیں رکھی گئی: ایسی سیٹنگ اگر غلط چن لی جائے تو وہی 2.5\u00A0گنا والی غلطی ہو جائے گی جسے روکنا اُس سیٹنگ کا کام ہوتا۔',
    /**
     * §1.3 — visually separated, and labelled so it cannot read as a dose.
     *
     * GENERIC, not the brand. Until 2026-09-13 this said "Your Lantus dose",
     * which contradicted the app's own data: the name is a setting the user
     * types into the "Which insulin" field directly below this heading, so
     * someone on Tresiba read "Your Lantus dose" above their own answer.
     *
     * It does not interpolate the typed name either. On Settings the field is
     * two lines below, so the heading would only repeat it — and it would
     * re-render on every keystroke. That used to matter a great deal — it is
     * what `captureFocus` existed to survive — and since T3 it is ordinary: the
     * field keeps its identity across a render. The reason to leave the heading
     * generic is the one above, not the rendering. On the doctor-facing screen
     * the name is already the first row of the list underneath.
     */
    /**
     * §8.5 — what the reader's answer changes, and what it does not.
     *
     * THIS USED TO BE A DISCLOSURE AND IS NOW A DESCRIPTION, which is the whole
     * of what entry 26 changed. The old string said the timing was built around
     * Humulin R, listed the analogues it was wrong for, and ended "ask your
     * doctor how long before a meal to inject" — sound advice with nowhere to
     * put the answer, under a screen that went on rendering the Humulin R wait
     * after every dose. The app now asks, so this states.
     *
     * Three things it must keep doing, all of them lessons from the version it
     * replaces:
     *
     * 1. **Say the dose is unaffected.** Without it, "the timings depend on
     *    your insulin" reads as "this app is wrong for you", and a reader who
     *    distrusts arithmetic that is correct for them is the worse outcome.
     *    Hedged as *can still be* on the 2026-09-14 review's point: it is false
     *    for a reader who switched insulins and kept stale ratios.
     * 2. **Say the stacking windows are still the same for everybody**, because
     *    a reader who has just named a rapid analogue will reasonably expect
     *    them to have moved. They have not, the direction of the error is
     *    stated, and `CLINICAL.md` question 10c is why.
     * 3. **Not be a copy.** §10.2 — the how-it-works page and Settings render
     *    this same string, not two versions of it.
     *
     * **The wording is not signed off by a prescriber.** `CLINICAL.md` §14
     * questions 8 and 10 carry it.
     */
    insulinNote: (brand: string | null): string =>
      brand === null
        ? `آپ نے ایپ کو یہ نہیں بتایا کہ کھانے کے وقت آپ کون سی انسولین لگاتے ہیں، اس لیے یہ آپ کو یہ نہیں بتاتی کہ کب کھائیں — وہ بس ایک اندازہ ہوتا، اور وقت سے پہلے کا اندازہ ہی وہ راستہ ہے جس سے ایسی ایپ کسی کی بلڈ شوگر گرا دیتی ہے۔ آپ کی ڈوز پر اس کا کوئی اثر نہیں: وہ آپ کے اپنے ٹارگٹ، ISF اور ICR سے نکلتی ہے۔ اپنے ڈاکٹر سے پوچھیں کہ کھانے سے کتنی دیر پہلے انسولین لگانی ہے، اور اُن کے جواب کے لیے سیٹنگز میں جگہ موجود ہے۔`
        : `یہاں دو چیزیں ${brand} کی ہیں: کھانے سے پہلے کتنی دیر رکنا ہے، اور ${String(STACK_SUPPRESS_HOURS)}\u00A0گھنٹے اور ${String(STACK_ADVISE_HOURS)}\u00A0گھنٹے کے وہ وقفے جو اسٹیکنگ کی جانچ استعمال کرتی ہے۔ پین میں جو بھی ہو، ڈوز پھر بھی آپ کی اپنی ہو سکتی ہے — ٹارگٹ، ISF اور ICR آپ کے اپنے نسخے سے آتے ہیں، اُس انسولین کے لیے جو آپ واقعی لگاتے ہیں۔`,
    /**
     * The second half, kept SEPARATE so it can be shown beside the first
     * without being part of a sentence about the reader's own insulin. It is an
     * admission about the app, not a fact about them.
     *
     * Urdu note: «یہ چھوٹی کیوں ہے؟» here quotes the result screen's own
     * "Why is this smaller?" — it must match that section's rendering
     * character-for-character; confirm against the result-screen agent's file.
     */
    stackingWindowsNote:
      `فی الحال یہ ${String(STACK_SUPPRESS_HOURS)} اور ${String(STACK_ADVISE_HOURS)}\u00A0گھنٹے ہر انسولین کے لیے ایک جیسے ہیں۔ یہ سب سے سست انسولین کے حساب سے رکھے گئے ہیں، اس لیے کریکشن تیز انسولین کی ضرورت سے زیادہ دیر روک لی جاتی ہے، کم نہیں — اور جب ضرورت ہو، نتیجے کی اسکرین پر «یہ چھوٹی کیوں ہے؟» سے وہ واپس مل جاتی ہے۔`,
    /**
     * The settings SCREEN's own words, moved here on 2026-09-13. They rendered
     * from literals in `screens/settings.ts` until then, which made this file's
     * header claim — "Every user-facing string, in one file" — false, and left
     * them outside the plain-language review and outside `10a`'s translation
     * scope. Moved verbatim: not one word changed in the move, so the existing
     * tests are the proof that nothing on screen moved with them.
     */
    fieldRequired: 'اس کے بغیر ڈوز کا حساب نہیں لگ سکتا۔',
    outOfHardRange: (lo: string, hi: string): string => `${lo} اور ${hi} کے درمیان ہونا ضروری ہے۔`,
    targetTag: 'ٹارگٹ',
    eatDelaySuffix: 'منٹ',
    unitsSuffix: 'یونٹ',
    isfSuffix: 'mg/dL فی یونٹ',
    icrSuffix: 'گرام کاربوہائیڈریٹ',
    titleFirstRun: 'آپ کا نسخہ',
    title: 'سیٹنگز',
    sectionBloodSugar: 'بلڈ شوگر',
    sectionFood: 'کھانا',
    sectionRounding: 'راؤنڈنگ',
    ceilGateTitle: 'وہ چننے سے پہلے یہ پڑھ لیں',
    save: 'محفوظ کریں',
    saveFirstRun: 'محفوظ کر کے شروع کریں',
    openAsText: 'میری سیٹنگز ٹیکسٹ کی شکل میں دکھائیں',
    openHowItWorks: 'یہ کیسے کام کرتی ہے',
    openExport: 'ریکارڈ محفوظ کریں یا لے جائیں',
    openClear: 'صاف کریں یا نئے سرے سے شروع کریں',
    /** §7.5's change list names the field that moved, in the words it uses. */
    deltaIcr: 'ایک یونٹ کتنے کے لیے کافی ہے',
    deltaIsf: 'ایک یونٹ آپ کو کتنا نیچے لاتا ہے',
    deltaTarget: 'کریکشن کا ٹارگٹ',
    basalNameLabel: 'کون سی انسولین',
    /**
     * The suggestions under "Which insulin" are the background insulins the
     * table happens to hold, and a list of five on a field that accepts
     * anything reads as a list of what is ALLOWED. Toujeo, Basaglar, Abasaglar
     * and the local Pakistani brands are all legitimate answers and none of
     * them is offered, so the field says outright that the list is not the
     * boundary.
     */
    basalNameHint: 'یہ عام برانڈ ہیں۔ اگر آپ کا لسٹ میں نہیں تو خود ٹائپ کر دیں۔',
    basalUnitsLabel: 'کتنے یونٹ',
    basalTimingLabel: 'کب',
    basalRecordNote: 'ان میں سے کچھ بھی کسی حساب میں نہیں جاتا۔ یہ اس لیے ہے کہ ریکارڈ مکمل رہے۔',
    basalTitle: 'آپ کی لمبے اثر والی انسولین',
    basalNote: 'یہ آپ کا ڈاکٹر طے کرتا ہے، یہاں اس کا حساب نہیں لگتا۔',
    /**
     * The name is free text with no validation and an empty default, so the
     * screen meant to be photographed for a doctor could print a blank row.
     * Saying it is not recorded is the honest version of a blank.
     */
    basalNameMissing: 'درج نہیں',
    modeQuestion: 'آپ کی سرنج کیا ناپ سکتی ہے؟',
    /**
     * §15 — the MHRA finding that only 30% of 46 audited apps documented their
     * formula applies to the ROUNDING as much as to the arithmetic. Five modes
     * were offered with no explanation of any of them, and one of them (`ceil`)
     * is unsafe by default. A pointer is not documentation, but it is the
     * difference between a hidden choice and a findable one.
     */
    modeHint: 'سمجھ نہیں آ رہا کون سا چنیں؟ «یہ کیسے کام کرتی ہے» میں پانچوں سمجھائے گئے ہیں۔',
    /**
     * §6.2's confirmation tier, in his words. The previous wording — "Ask me to
     * re-read my numbers at or above" — read as "check your meter again", which
     * is a different action entirely. What it actually does is hide the dose and
     * show back the two figures you TYPED, so a fat-fingered entry is caught
     * before it becomes an injection.
     *
     * Urdu note: the Urdu sentence is verb-final, so "reaches" cannot end it —
     * the threshold slot sits mid-sentence; the input's on-screen position
     * after this label needs an RTL layout check.
     */
    /**
     * §1.2 as ruled — the prefill has to announce itself. Momin's own reaction on
     * first sight was the exact failure: the three values looked settled, so the
     * blocked "Save and start" read as a bug rather than as work still to do.
     *
     * It also carries weight the other way. `docs/CLINICAL.md` records the
     * residual risk of prefilling — that someone taps through without reading —
     * and a line asking him to check the three, next to a prompt on the one most
     * likely to have moved, is what makes tapping through a choice rather than an
     * accident.
     */
    /**
     * Optional, and the empty string is a first-class answer. Forcing a name
     * would add a setup step to an app whose whole argument for existing is
     * that it has to be easier than injecting a fixed 24-25 units (§1.4).
     */
    nameQuestion: 'ایپ آپ کو کس نام سے پکارے؟',
    nameHint: 'ضروری نہیں۔ نام آپ کے ریکارڈ پر آتا ہے تاکہ ڈاکٹر کو پتا چلے کہ یہ کس کا ہے۔',
    /** §10.5 — the reading screen only. Never on a screen showing a dose. */
    greeting: (name: string): string => `سلام ${name}`,
    /**
     * RENAMED from `prefilled*` on 2026-09-13. The fields are not prefilled any
     * more, and copy named for what it used to say is how the next reader gets
     * it wrong — the same rule that renamed `bandEFullCardShownToday`.
     *
     * The old body read "They are already filled in from the prescription."
     * For the person this was built for that was true. For anyone else "the
     * prescription" is not theirs, and a sentence asserting otherwise is worse
     * than silence: it lends the numbers an authority they do not have.
     */
    /**
     * The app's ONE first-person sentence, and it is deliberate rather than a
     * slip of voice. Everything else here is second person — "your doctor",
     * "you inject" — so there is no narrator anywhere else, and introducing one
     * is a decision, not a wording tweak.
     *
     * It exists because three hints below say "Hasham's is 150", "Hasham's is
     * 30" and "Hasham's is 10", and until 2026-09-13 the app never said who
     * that was. A stranger met an unexplained proper noun three times and got
     * no answer.
     *
     * Naming him is also the SAFER wording, which is why it survived the
     * audience change rather than being cut with the prefill: an unexplained
     * number beside an empty field reads as a suggestion, and a number with
     * someone's name on it reads as someone else's. The name is doing the work
     * the prefill used to do wrong.
     *
     * Outside the mint card on purpose. That card carries "nothing is filled
     * in, on purpose", which is the safety sentence on this screen, and origin
     * story inside it would compete with the one line that must land.
     *
     * Urdu note: "Hasham" stays Latin pending Momin's ruling on the Urdu
     * spelling (glossary open question 6) — his family's to give, not guessed.
     */
    builtFor: 'میرے بھائی Hasham کو ٹائپ 1 ذیابیطس ہے۔ میں نے یہ ایپ اُسی کے لیے بنائی ہے، اور نیچے کی مثالیں اُس کے نمبر ہیں — آپ کے مختلف ہوں گے۔',
    setupTitle: 'تین نمبر جو صرف آپ کا ڈاکٹر دے سکتا ہے',
    setupBody:
      'کچھ بھی پہلے سے بھرا ہوا نہیں ہے — جان بوجھ کر۔ ٹارگٹ، ISF اور ICR آپ کے اپنے نسخے سے آتے ہیں — کسی اور کے نمبر آپ کے لیے غلط ہیں۔ پھر مکمل کرنے کے لیے نیچے اپنی لمبے اثر والی انسولین بھی درج کر دیں۔',
    thresholdHeading: 'ڈبل چیک کب ہو',
    thresholdQuestion: 'ڈوز اِتنی ہو جائے تو میری ٹائپنگ ڈبل چیک کریں',
    /** §5.1 — `ceil` is gated behind a one-time acknowledgement. */
    ceilGate:
      'اوپر کی طرف راؤنڈ کرنا ہر ڈوز میں پورے ایک یونٹ تک کا اضافہ کر دیتا ہے — ہمیشہ اُسی سمت میں جس سے بلڈ شوگر کم ہوتی ہے۔ 1\u00A0یونٹ کی کریکشن پر یہ اُسے دُگنی کر دیتا ہے۔',
    ceilAccept: 'سمجھ آ گئی — ہمیشہ اوپر راؤنڈ کریں',
  },

  calculator: {
    // NOTE (Urdu): the Lead/Rest split survives, but the halves hold different
    // words than the English halves — Urdu word order moves the question word
    // ("کتنی ہے؟") into the Rest half. The break is still layout, not punctuation.
    askReadingLead: 'آپ کی بلڈ شوگر ',
    askReadingRest: 'ابھی کتنی ہے؟',
    askCarbsLead: 'اس کھانے میں ',
    askCarbsRest: 'کتنا کاربوہائیڈریٹ ہے؟',
    carbsHint:
      'کھانے کے اندر کا کاربوہائیڈریٹ — یہ نہیں کہ پلیٹ کا وزن کتنا ہے۔ بریانی کی 250\u00A0گرام کی پلیٹ میں تقریباً 50\u00A0گرام کاربوہائیڈریٹ ہوتا ہے۔',
    /** §10.1 — the field says GRAMS OF CARBOHYDRATE, never "grams" or "carbs". */
    // NOTE (Urdu): Urdu script has no letter case, so the English ALL-CAPS
    // styling cannot carry — the words alone must do §10.1's job. mg/dL stays
    // Latin (it is what the meter prints), kept in the English label's casing.
    tallyLine: (count: string, food: string): string => isolate(`${count} × ${food}`),
    unitReading: 'MG/DL',
    unitCarbs: 'گرام کاربوہائیڈریٹ',
    unitDose: 'یونٹ',
    /** Read aloud rather than seen, which does not make them less user-facing. */
    amountDownLabel: 'آدھا یونٹ کم',
    amountUpLabel: 'آدھا یونٹ زیادہ',
    meterHiLoHint: (maxReading: string): string =>
      `میٹر HI دکھا رہا ہے؟ ${maxReading} درج کریں۔ LO دکھا رہا ہے؟ کوئی نمبر درج نہ کریں — پہلے فوری کچھ میٹھا کھائیں یا پیئں۔`,
    eatAround: (at: string): string => `${at} کے آس پاس کھائیں۔`,
    /** §8.5 — an ultra-rapid analogue's wait is zero, and zero is an instruction. */
    eatNow: 'ابھی کھائیں۔',
    /**
     * The working's own sentences. They were template literals in
     * `screens/calculator.ts` until 2026-09-14, which is how they survived both
     * the hand sweep and the first review — prose inside backticks is invisible
     * to anything looking for quoted strings. `check-plan.py` reads backticks
     * now, and found these.
     */
    correctionRow: (from: string, to: string): string => `${from} سے گھٹا کر ${to}`,
    mealRow: (grams: string): string => `${grams}\u00A0گرام کاربوہائیڈریٹ`,
    exactBeforeRounding: (exact: string): string =>
      `ٹھیک ٹھیک حساب: ${exact}\u00A0یونٹ، پھر راؤنڈ کیا گیا۔`,
    decimalPointLabel: 'اعشاریہ',
    /**
     * The backspace key's accessible name. A single word, which is why it sat
     * in `components.tsx` as a literal until 2026-09-14 — check 1c needed two
     * words before it would report anything, so a one-word SENTENCE escaped it.
     *
     * It is spoken aloud to a screen-reader user, which is the whole test for
     * whether a string belongs here. The keypad's other two labels were always
     * in this file; this one was not, and the difference was that it happened
     * to be short.
     */
    // NOTE (Urdu): ڈیلیٹ per the register ruling (delete = ڈیلیٹ کریں). Same
    // word as the record's Delete button, exactly as the English reuses "delete".
    deleteLabel: 'ڈیلیٹ',
    /** Urdu names the total first: «3 میں سے 2» is "2 of 3". */
    stepOf: (step: string, total: string): string => `${total} میں سے ${step}`,
    stepCheck: 'چیک',
    stepRecording: 'درج ہو رہا ہے',
    stepLogged: 'درج ہو گیا',
    rowBloodSugar: 'بلڈ شوگر',
    rowCarbohydrate: 'کاربوہائیڈریٹ',
    rowTotal: 'ٹوٹل',
    confirmHint:
      'ڈوز سامنے آنے سے پہلے یہ دونوں دوبارہ پڑھ لیں۔ یہ غلط ٹائپ ہوا نمبر پکڑ لیتا ہے — پلیٹ کا غلط اندازہ نہیں پکڑ سکتا۔',
    blankTimingOff:
      'اور کھانے کے وقت کا مشورہ بند ہے — ریڈنگ کے بغیر ایپ نہیں بتا سکتی کہ کب کھانا ہے۔',
    goBackAndTest: 'واپس جا کر پہلے بلڈ شوگر چیک کریں',
    startAgain: 'دوبارہ شروع کریں',
    /**
     * «چھوٹی», not «کم». Two screens quote this control BY NAME — the explainer
     * and the Settings note on the stacking windows — and the English comment
     * on both demands a character-for-character match. They said چھوٹی and the
     * button said کم, so the help page named a control that did not exist.
     *
     * چھوٹی is also the right word on its own: کم is the glossary's word for a
     * LOW blood sugar, so «یہ کم کیوں ہے؟» on a result screen reads as a
     * question about the reading rather than about the dose. And it agrees with
     * ڈوز, which is feminine.
     */
    whySmaller: 'یہ چھوٹی کیوں ہے؟',
    checkAgain: 'دوبارہ چیک کریں',
    withheldBoth: 'دونوں نمبر اتنے بڑے ہیں کہ دوبارہ دیکھنے کی ضرورت ہے، اس لیے یہاں دونوں میں سے کوئی نہیں دکھایا گیا۔',
    keepSmaller: 'چھوٹی ڈوز رکھیں',
    openHistory: 'ہسٹری',
    /**
     * The label under the dose, and §8.5 asked for the BRAND all along.
     *
     * It was generic until 2026-09-20 for an honest reason — the app did not
     * know the insulin, and "units of Humulin R" would have been a claim about
     * the reader rather than a fact. It knows now, so the label names what is
     * in the pen: `units of NovoRapid` is checkable against the box in their
     * hand, which is the property §8.5 wanted and the reason it asked for a
     * name rather than a class word.
     *
     * The generic form survives for the reader who answered "I don't know",
     * where it is still the only true thing to say.
     */
    doseUnit: (brand: string | null): string =>
      brand === null ? 'آپ کی کھانے کی انسولین کے یونٹ' : `${brand} کے یونٹ`,
  },

  /**
   * The history, export, clear, arithmetic and settings-as-text screens' own
   * words, moved from `screens/misc.ts` on 2026-09-13. Verbatim, same reason.
   *
   * `recordTarget` is one string where `misc.ts` held TWO identical literals —
   * the export summary and the settings-as-text list both said "A correction
   * aims for", and changing one would have left the other saying the old thing.
   */
  screens: {
    disclaimerRead: (accepted: boolean): string =>
      accepted ? '☑  میں نے یہ پڑھ لیا ہے' : '☐  میں نے یہ پڑھ لیا ہے',
    historyTitle: 'ہسٹری',
    historyEmpty: 'ابھی تک کچھ ریکارڈ نہیں ہوا۔',
    /**
     * A history row is ASSEMBLED from fragments, and the fragments are words.
     * They were built inline in `misc.ts` until 2026-09-13, where a template
     * literal hides prose from every sweep that looks for quoted strings —
     * including `check-plan.py`'s new one, which cannot see inside backticks.
     * Written as functions so the whole sentence is here, in order, for a
     * translator to move around.
     */
    noReading: 'کوئی ریڈنگ نہیں',
    /**
     * "the stacking check", not "recent-insulin check" — which appeared exactly
     * once in the product, here, five lines from `outsideStackingWindow` saying
     * the other name in the same flow. The explainer commits to the word in
     * writing: "it is the word the app uses on the result screen and in
     * Settings." The cost is real: "recent-insulin check" self-explains to a
     * reader who skipped the explainer, and this loses them that.
     */
    stackingOverridden: 'اسٹیکنگ کی جانچ نظرانداز کی گئی',
    /**
     * The history row's two lines, as NAMED PARTS rather than one sentence.
     *
     * A row is scanned, not read: the eye is looking for the numbers, and in a
     * run of identical grey lines it has to find them by counting words. The
     * figures are emphasised so they can be found at a glance — the same reason
     * `explain.audienceBody` names its bold part instead of finding it by
     * position. The NAME is why it is bold, and a screen reader gets the parts
     * in order either way.
     *
     * Still strings, not JSX. §10.2's single-file copy audit depends on these
     * being readable here, and a copy function returning markup ends that.
     */
    historyIntake: (reading: string, carbs: string): readonly {
      readonly value: string;
      readonly rest: string;
    }[] => [
      { value: reading, rest: ' · ' },
      { value: `${carbs}\u00A0گرام`, rest: ' کاربوہائیڈریٹ' },
    ],
    readingOnly: (reading: string, note: string): string =>
      `${reading}\u00A0mg/dL — صرف ریڈنگ، کوئی ڈوز نہیں${note}`,
    dosingAnsweredAt: (at: string): string =>
      `${at} پر جواب دیا گیا۔ ایڈٹ کرنے سے جواب بدل جاتا ہے اور تاریخ بھی نئی ہو جاتی ہے۔`,
    mealCheckNeeds: (meals: string): string =>
      `کچھ بھی کہنے سے پہلے اسے ${meals} درج کیے ہوئے کھانے چاہئیں۔`,
    /** Label, then figure — the word says which number this is, the figure is what is sought. */
    historyDose: (calculated: string, injected: string): readonly {
      readonly label: string;
      readonly value: string;
    }[] => [
      { label: 'حساب سے ', value: calculated },
      { label: ' · لگائی گئی ', value: injected },
    ],
    outsideStackingWindow: 'یہ اندراج اتنا پرانا ہے کہ اسٹیکنگ کی جانچ اسے دیکھتی ہی نہیں۔',
    delete: 'ڈیلیٹ کریں',
    yourAnswer: 'آپ کا جواب',
    exportTitle: 'ریکارڈ محفوظ رکھنا',
    importTitle: 'ریکارڈ واپس لانا',
    importNote:
      'ریکارڈ آپس میں مل جاتے ہیں۔ آپ کا نسخہ صرف تجویز کیا جاتا ہے — واپس لایا ہوا ریکارڈ اسے کبھی چپ چاپ نہیں بدل سکتا۔',
    importAction: 'ریکارڈ لوڈ کریں',
    clearTitle: 'صاف کرنا',
    clearNote:
      'اَن انسٹال کرنے سے کچھ بھی یقینی طور پر صاف نہیں ہوتا، اور براؤزر کی اپنی ری سیٹ میں اس ایڈریس کی دوسری سائٹیں بھی ساتھ چلی جائیں گی۔ یہ دونوں ہی جانتے ہیں کہ اس ایپ کا کیا کیا ہے۔',
    clearEmpty: 'ابھی تک کچھ ریکارڈ نہیں ہوا۔',
    clearRecordTitle: 'ریکارڈ صاف کریں',
    clearRecordBody:
      'ہر ڈوز اور ہر ریڈنگ ہٹا دیتا ہے۔ آپ کا نسخہ اور اس کی ہسٹری قائم رہتی ہے، اور ایپ فوراً استعمال ہو سکتی ہے۔',
    clearRecordAction: 'صاف کریں',
    startOverTitle: 'نئے سرے سے شروع کریں',
    startOverBody:
      'سب کچھ چلا جاتا ہے، آپ کا نسخہ بھی۔ سیٹ اپ دوبارہ چلتا ہے۔ یہ فون کسی اور کو دینے کے لیے ہے، یا کسی پھنسی ہوئی حالت سے نکلنے کے لیے۔',
    // NOTE (Urdu): these four lead-in labels get their value appended after the
    // string. English can end mid-phrase ("aims for"); Urdu word order cannot,
    // so each ends with a colon and the appended value still reads correctly.
    recordTarget: 'کریکشن کا ٹارگٹ:',
    recordIsf: '1\u00A0یونٹ بلڈ شوگر اتنی کم کرتا ہے:',
    recordIcr: '1\u00A0یونٹ اتنے کاربوہائیڈریٹ کے لیے کافی ہے:',
    arithmeticTitle: 'پورا حساب',
    arithmeticBody:
      'کریکشن یوں نکلتی ہے: آپ اپنے ٹارگٹ سے کتنا اوپر ہیں، تقسیم اس پر کہ ایک یونٹ آپ کو کتنا نیچے لاتا ہے۔ کھانے کی ڈوز یوں: کتنا کاربوہائیڈریٹ ہے، تقسیم اس پر کہ ایک یونٹ کتنے کے لیے کافی ہے۔ پھر دونوں جمع کی جاتی ہیں، اور منفی کریکشن کو نظرانداز نہیں کیا جاتا بلکہ کھانے کی ڈوز میں سے کاٹ لیا جاتا ہے۔',
    arithmeticFloor: 'اگر دونوں ملا کر صفر سے نیچے آئیں تو جواب صفر یونٹ ہے — منفی کبھی نہیں۔',
    anyOfThese: 'ان میں سے کوئی ایک بھی کافی ہے:',
    /** The name the two status lines in `advisory` already use. */
    mealCheckTitle: 'کھانے کے سائز کی جانچ',
    asTextTitle: 'میری سیٹنگز',
    asTextRounding: 'ڈوز راؤنڈ ہوتی ہے:',
    /**
     * NOT "Asks me to re-read at", which this said until 2026-09-14. §10.1
     * retired "re-read my numbers" because it read as "check your meter again",
     * a different action — and the as-text screen brought it back on the one
     * screen built to be photographed and read with no surrounding context.
     * G14 rules "double-check" as this feature's single user-facing name.
     */
    asTextThreshold: 'میری ٹائپنگ ڈبل چیک ہونے کی حد:',
    asTextFooter: 'یہ اسکرین اسی لیے بنی ہے کہ اس کی تصویر لے کر اپنے ڈاکٹر کو دکھائیں۔',
    foodsMakeYours: 'انہیں اپنا بنا لیں',
    opening: 'آپ کا ریکارڈ کھل رہا ہے…',
  },

  /** The bottom navigation's labels and its own accessible name. */
  nav: {
    settings: 'سیٹنگز',
    history: 'ہسٹری',
    saveACopy: 'کاپی محفوظ کریں',
    label: 'نیویگیشن',
  },

  rounding: {
    title: 'راؤنڈ کرنا، اور پانچ آپشن کیوں ہیں',
    intro:
      'حساب کم ہی ایسے نمبر پر اترتا ہے جو آپ کی سرنج ناپ سکے۔ یہی آپشن طے کرتے ہیں کہ بچے ہوئے حصے کا کیا ہو گا۔ راؤنڈ ہمیشہ صرف ٹوٹل ہی ہوتا ہے — اکیلی کریکشن یا اکیلی کھانے کی ڈوز کبھی نہیں۔',
    /**
     * Each mode carries the `RoundingMode` it sets, so Settings renders its
     * buttons FROM this list rather than holding a second copy of the five
     * names. Until 2026-09-13 the names existed twice — here and in
     * `settings.ts` — and a rename in one place left the other disagreeing.
     *
     * The key is in the DATA rather than implied by position on purpose. The
     * obvious fix was for Settings to index this array, and that trades a
     * visible disagreement for an invisible one: reorder these five and the
     * button reading "Always round up" would quietly set `floor`. A label that
     * says the opposite of what the control does is a dosing error, not a copy
     * defect, so the pairing is written down instead of counted.
     */
    // NOTE (Urdu fragment): the English closes this array with
    // `as const satisfies readonly { roundingMode: RoundingMode; … }[]`, and it
    // is LOAD-BEARING — do not remove it. It is what keeps each label paired
    // with the mode it actually sets: reorder these five and the button reading
    // «ہمیشہ اوپر راؤنڈ کریں» would quietly set `floor`, which `copy.ts` calls
    // "a dosing error, not a copy defect".
    //
    // A note here used to say the clause had been "dropped … restore it when
    // merging", left over from assembling this file out of seven fragments. It
    // sat two lines above the clause it said was missing, instructing the next
    // reader to delete the guard.
    modes: [
      { roundingMode: 'nearest', name: 'پورے یونٹ', what: 'سب سے قریبی پورے یونٹ تک، یعنی 4.4 بن جاتا ہے 4 اور 4.6 بن جاتا ہے 5۔ ٹھیک آدھا صفر سے دور راؤنڈ ہوتا ہے: 4.5 بن جاتا ہے 5۔ عام U-100 سرنج کے لیے یہی درست ہے، جس پر نشان پورے یونٹ کے ہوتے ہیں۔' },
      { roundingMode: 'half', name: 'آدھے یونٹ', what: 'سب سے قریبی آدھے تک، یعنی 4.37 بن جاتا ہے 4.5۔ یہ صرف اس صورت میں چنیں جب آپ کے پین یا سرنج پر واقعی آدھے یونٹ کے نشان ہوں — جیسے NovoPen Echo یا Humalog Junior KwikPen۔ پورے یونٹ والی سرنج پر یہ آپ سے وہ چیز ناپنے کو کہتا ہے جو آپ دیکھ ہی نہیں سکتے۔' },
      { roundingMode: 'ceil', name: 'ہمیشہ اوپر راؤنڈ کریں', what: 'اگلے پورے یونٹ تک، یعنی 4.1 بن جاتا ہے 5۔ یہ ہر ایک ڈوز میں انسولین بڑھاتا ہے، اور ہمیشہ کم بلڈ شوگر والی سمت میں۔ اگر ایک یونٹ آپ کو 30\u00A0mg/dL نیچے لاتا ہے تو ہر بار 30\u00A0mg/dL تک کی ایسی اضافی کمی ہو سکتی ہے جس کا آپ کا ارادہ نہیں تھا — 1\u00A0یونٹ کی کریکشن پر یہ ڈوز دگنی کر دیتا ہے۔ ایپ یہ والا آپشن استعمال کرنے سے پہلے آپ سے کنفرم کراتی ہے۔' },
      { roundingMode: 'floor', name: 'ہمیشہ نیچے راؤنڈ کریں', what: 'نیچے والے پورے یونٹ تک، یعنی 4.9 بن جاتا ہے 4۔ یہ ہر بار تھوڑی سی کم انسولین دیتا ہے، جس کا جھکاؤ زیادہ بلڈ شوگر کی طرف ہے۔ کچھ ڈاکٹر جان بوجھ کر یہی کہتے ہیں۔' },
      { roundingMode: 'off', name: 'بالکل ٹھیک نمبر دکھائیں', what: 'کوئی راؤنڈ نہیں — 4.37 رہتا ہے 4.37۔ یہ سچا نمبر پڑھنے کے لیے ہے، ناپنے کے لیے نہیں: سرنج 4.37 نہیں کھینچ سکتی۔ یہ دیکھنے کے لیے استعمال کریں کہ ایپ نے اصل میں کیا حساب نکالا۔' },
    ] as const satisfies readonly {
      readonly roundingMode: RoundingMode;
      readonly name: string;
      readonly what: string;
    }[],
    closing:
      'یقین نہ ہو تو اسے پورے یونٹ پر ہی چھوڑ دیں۔ عام سرنج یہی ناپتی ہے، اور اسی وجہ سے یہ ایپ کی ڈیفالٹ ہے۔',
  },

  // ── §8.2 — staleness ──────────────────────────────────────────────────────
  expired: (at: string): string => `یہ نتیجہ ${at} کا ہے۔ اپنی بلڈ شوگر دوبارہ چیک کریں۔`,
  /**
   * §8.2 on a BLOCK, which needs different words from a stale dose.
   *
   * The result screen says "this result is from…", because what went stale
   * there is an answer. On a block there is no answer — what went stale is the
   * READING, and the screen's own instruction was "check again in 15 minutes".
   * Past that point it is showing a number the user was told to replace.
   *
   * It does not suppress the treat-first guidance: being low is still the most
   * likely reading of an old low. It says the number is old and asks for a new
   * one, which is the same thing the body text already asked for.
   */
  expiredBlock: (at: string): string =>
    `وہ ریڈنگ ${at} کی تھی۔ کچھ بھی طے کرنے سے پہلے اپنی بلڈ شوگر دوبارہ چیک کریں — اگر آپ نے میٹھا کھا لیا ہے تو یہ بدل چکی ہو گی۔`,

  /** §11.3 — the fail-closed screen. */
  failClosed: {
    title: 'یہ ایپ آپ کا ریکارڈ نہیں پڑھ سکتی۔',
    body: 'آپ کا ریکارڈ اس ایپ کے اس سے نئے ورژن نے محفوظ کیا تھا۔ کچھ بھی ضائع نہیں ہوا۔ نیا ورژن کھولیں گے تو وہ اسے ٹھیک سے پڑھ لے گا۔',
    settingsHeading: 'آپ کی سیٹنگز، ریکوری کاپی سے',
    copyThemDown: 'نئے سرے سے شروع کرنے سے پہلے یہ لکھ لیں — اس کے بعد یہ اسکرین بھی نہیں رہے گی۔',
    escape: 'نئے سرے سے شروع کریں',
    blocked: 'اس ایپ کے دوسرے ٹیب بند کر کے دوبارہ کوشش کریں۔',
  },

  /**
   * A WRITE THAT FAILED, SAID OUT LOUD — added 2026-09-21.
   *
   * `onSave` was `void saveSettings()` and the rejection went nowhere, so a
   * storage failure showed as a button that did nothing. That is how the
   * keyPath defect of that morning presented: "Save and start" pressed, no
   * message, no record, and a console nobody on a phone can open. An app whose
   * whole value is the record must never fail to write one quietly.
   *
   * Separate from `failClosed`, which says the record cannot be READ and is a
   * state the app boots into. This one is an action that did not happen.
   */
  writeFailed: {
    title: 'یہ محفوظ نہیں ہوا۔',
    body: 'ایپ اس ڈیوائس کی اسٹوریج میں لکھ نہیں سکی، اس لیے اس اسکرین کی کوئی چیز ریکارڈ نہیں ہوئی۔',
    /**
     * Said before the control, not after. Starting over is the only repair the
     * app can offer from here, and it is also the one that costs everything —
     * §7.9's rule that the escape is offered honestly or not at all.
     */
    startOverHint: 'اگر یہ بار بار ہو تو نئے سرے سے شروع کرنا اسٹوریج دوبارہ بنا دیتا ہے — اور جو کچھ پہلے سے ریکارڈ ہے وہ سب ڈیلیٹ ہو جاتا ہے۔',
    dismiss: 'بند کریں',
  },

  /**
   * A REPAIR TOOK THE PRESCRIPTION AND THE RECORD STILL HAS IT — 2026-09-21.
   *
   * `upgradeFrom`'s 1 -> 2 step rebuilds `settings`, so an install mended after
   * `#63` opens on first run with the three ratios empty. `settingsHistory` is
   * NOT rebuilt and still holds them. Asking someone to retype a sensitivity
   * from memory, while the app is sitting on the number, is the one step in
   * this flow that can produce a wrong dose.
   *
   * SHOWN, NEVER PREFILLED. §1.2 makes the fields start empty and that was
   * restored deliberately on 2026-09-13 after a prefill shipped one person's
   * prescription to everybody. This tells the reader what the record says and
   * leaves the typing to them — and says to check it against the paper, because
   * a number the app remembers is still not a number a doctor confirmed today.
   */
  repairedPrescription: {
    title: 'آپ کی سیٹنگز دوبارہ بنانی پڑیں۔',
    body: 'آپ کی ڈوزیں اور ریڈنگیں محفوظ ہیں اور یہیں موجود ہیں۔ نیچے کے تین نمبر آخری ریکارڈ شدہ نمبر ہیں — انہیں دوبارہ ٹائپ کریں، اور اس اسکرین پر بھروسا کرنے کے بجائے ڈاکٹر کے دیے ہوئے نمبروں سے ملا کر چیک کریں۔',
    asOf: (date: string): string => `آخری بار ${date} کو بدلا گیا`,
  },

  /**
   * §11.3 — another tab UPGRADED the database, so this tab's connection is
   * closed and nothing it does can be recorded. Added 2026-09-21.
   *
   * No control, deliberately. There is nothing this tab can do about it and
   * offering a button that pretends otherwise would be worse than the sentence.
   */
  staleConnection: {
    title: 'یہ ایپ کسی دوسری ونڈو میں اپ ڈیٹ ہو گئی ہے۔',
    body: 'کچھ بھی اور درج کرنے سے پہلے یہ والی ونڈو بند کر کے دوبارہ کھولیں۔ کچھ بھی ضائع نہیں ہوا۔',
  },

  /** §11.3 — another tab deleted the record while this one was open. */
  recordDeleted: {
    title: 'ریکارڈ کسی دوسرے ٹیب میں صاف کر دیا گیا۔',
    body: 'یہ اسکرین پرانی ہو چکی ہے۔ سیٹ اپ دوبارہ چلے گا۔',
  },


  /**
   * The language list, as seen by someone already reading Urdu.
   *
   * The warning is not softened for the reader who already took it, because
   * this is also the screen she comes back to. `english` stays the English word
   * "English", never «انگریزی»: someone who switched by mistake, or who has just
   * found a string she cannot trust, has to be able to find the way back WITHOUT
   * reading Urdu to do it. A second key named `backToEnglish` held the same
   * three letters for a day and was never rendered — one string, one place.
   */
  language: {
    label: 'زبان',
    english: 'English',
    urdu: 'اردو',
    inTesting: 'ٹیسٹنگ میں ہے',
    inUse: 'استعمال میں',
    confirmTitle: 'اردو ابھی چیک نہیں ہوئی۔',
    confirmBody:
      'کسی اردو پڑھنے والے نے ان الفاظ کا جائزہ نہیں لیا، اور نہ ہی کسی ڈاکٹر نے '
      + 'انہیں چیک کیا ہے۔ ہر نمبر، ہر انسولین کا نام اور ہر حساب بالکل ویسا ہی '
      + 'رہتا ہے — صرف الفاظ بدلتے ہیں۔',
    confirmSafety: 'اگر کوئی بات غلط لگے تو یہیں سے واپس English پر آ جائیں۔',
    confirmAction: 'پھر بھی اردو استعمال کریں',
  },

  /** §11.4's update offer and §12's install offer — the shell's two bars. */
  update: {
    ready: 'نیا ورژن تیار ہے۔',
    useNow: 'ابھی استعمال کریں',
    later: 'بعد میں',
  },
  install: {
    offer: 'اسے اپنی ہوم اسکرین پر شامل کریں؟',
    add: 'شامل کریں',
    notNow: 'ابھی نہیں',
  },
  /** The app failed to start. `MealUnits` stays Latin, as everywhere. */
  couldNotStart: (name: string): string => `${name} شروع نہیں ہو سکی: `,

  /**
   * Both ISOLATED. The month names stay English — that is a separate task — but
   * the date must not come apart while they do, and `isolate` is what stops it:
   * measured, `Sep 2026 6:38 PM 22` bare against `22 Sep 2026, 6:38 PM` wrapped.
   */
  mgdl: (value: string): string => isolate(`${value}\u00A0mg/dL`),
  timestamp: (date: string, time: string): string => isolate(`${date}, ${time}`),
  asEntered: (value: string): string => isolate(value),

  /**
   * The tab, the Android app-switcher card, and the default bookmark name.
   *
   * `MealUnits` stays Latin in all of them, by the same ruling that keeps it
   * Latin everywhere else. Only the description beside it translates.
   */
  /** Digits and a colon, so it is identical in both languages. */
  ratioShorthand: (one: string, other: string): string => `${one}:${other}`,

  tabTitleFallback: 'MealUnits — ٹائپ 1 ذیابیطس کے لیے کھانے کی انسولین کا حساب',
  tabTitles: {
    how_it_works: 'یہ کیسے کام کرتی ہے — MealUnits',
    food_list: 'پاکستانی کھانوں میں کاربوہائیڈریٹ — MealUnits',
    history: 'آپ کا ریکارڈ — MealUnits',
    settings_text: 'میری سیٹنگز — MealUnits',
    settings: 'سیٹنگز — MealUnits',
    calculator: 'MealUnits — ٹائپ 1 ذیابیطس کے لیے کھانے کی انسولین کا حساب',
  },

  /** §10.8 — show the running build version. */
  // NOTE (Urdu): pure formatting, no words — kept identical to the English.
  build: (version: string, build: string): string => isolate(`${version} (${build})`),

  more: 'مزید',
  /**
   * The word alone. An arrow glyph was tried and Momin's verdict on the phone
   * was that it read as misaligned — U+2190's vertical centring is a property
   * of the face, not something CSS can reliably correct, and a nudge tuned on a
   * Mac is a guess about Android. The control is at the foot of the screen now,
   * which is the affordance the arrow was standing in for.
   */
  // NOTE (Urdu): one more reason the word wins here — in RTL layout U+2190
  // would point the wrong way entirely.
  back: 'واپس',
  next: 'آگے',
  workItOut: 'ڈوز کا حساب لگائیں',
  cancel: 'کینسل کریں',
  done: 'ہو گیا',
};
