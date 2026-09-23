# Urdu Translation Glossary — MealUnits `src/ui/copy.ts`

**49 terms extracted.** Method: parsed `/Users/mominbinshahid/OSS/MealUnits/src/ui/copy.ts` with the repo's own TypeScript compiler (AST walk — string literals, template literals and template chunks in expression position; imports, property names and comparison operands excluded; comments are trivia and never counted). That yields **439 user-facing string values** — the ~243 plain strings plus the strings inside the 63 functions and 8 arrays, counted individually. Each term's count below is *the number of those 439 strings containing the term* (case-insensitive, word-boundary regex, morphological variants folded — inject/injects/injected/injection is one term). The cut for inclusion was ≥ 3 strings; nothing below 3 made the table except by riding a listed term.

**SAFETY** in the table means the term appears in band C/D copy, hypo-treatment instructions, or a "do not inject" string (copy.ts lines 214–247, 327–397, 415–418, 1592–1593). Those strings are the app's whole safety value — BACKLOG 10a: *"a mistranslation here is a dosing error, not a typo."* Band E (ketones) strings are included in the flag.

**Standing rulings this glossary obeys** (all already decided, cited so no agent re-litigates them):

1. **Numbers stay ASCII** (§4.2; re-ruled for Urdu in BACKLOG 10a, 2026-09-21). Urdu-Indic digits (۰۱۲۳) appear **nowhere** — not in labels, not in prose examples. "type 250, not 2,50" keeps its ASCII digits inside the Urdu sentence. The §10.4 digit rules (leading zero, no trailing zero, tabular-nums) are language-independent and survive translation untouched.
2. **Proper nouns stay Latin** (BACKLOG, ruled: *"Brand names stay in Latin script in every language… a transliterated Lantus matches nothing they are holding"*). Applies to: all 16 brands in `src/data/insulins.ts` (NovoRapid, Humalog, Apidra, Fiasp, Lyumjev, Humulin R, Actrapid, Humulin 70/30, Humalog Mix25/Mix50/Mix75/25, Mixtard 30, Humulin N, Insulatard, Lantus, Levemir, Tresiba), the app name **MealUnits**, the meter displays **HI** and **LO** (they are what the device prints), **mg/dL**, **ISF**, **ICR**, and **U-100 / "100 units/mL"** where the string tells the reader to check the box — the box is printed in English.
3. **"units" is spelled out, never abbreviated** (§10.4: `4U` misread as 40). Urdu: **یونٹ**, always written in full, never "U" and never a Urdu letter shorthand ("یو"). یونٹ is invariant — no plural marker after a numeral — so the English `unit`/`units` ternary collapses to one form. The no-break space between number and word carries over: `4 یونٹ` with U+00A0.

**Grammar conventions** (fixed here so five parallel agents cannot diverge):

- **Address is آپ, always.** Every imperative in the aap-form: کریں، لگائیں، کھائیں. Never تم/تو.
- **Gender assignments for loanwords** (agents must agree or the app reads broken): انسولین f، ڈوز f، ریڈنگ f، کریکشن f، ایپ f، اسٹیکنگ f — یونٹ m، گرام m، ریکارڈ m، ٹیکہ m، ٹارگٹ m، میٹر m، نتیجہ m. So: "ڈوز روک لی گئی"، "4 یونٹ درج ہوئے". Flagged for the native reviewer; whatever she rules, it must be one ruling.
- **Register**: everyday spoken Pakistani Urdu, including the English loanwords Pakistani speakers actually use about diabetes (شوگر، ڈوز، یونٹ، ٹیکہ، چیک، ریڈنگ، ریکارڈ). Persianised/Arabised medical Urdu (معالج، حذف، اندراجات، تصحیح) is rejected throughout — technically correct, practically useless to this reader.
- **Bidi mechanics** (engineering note, not translation): ASCII digits and Latin tokens inside RTL sentences need direction isolation so "70 mg/dL سے اوپر" and ranges like 5–10 render in order. That belongs to the RTL wiring task in BACKLOG 10a, but translators should keep number-first phrase shapes simple so isolation stays tractable.

---

## Main glossary

| English (as the app uses it) | Strings | Urdu | Roman | Why this, and what was rejected | SAFETY |
|---|---|---|---|---|---|
| dose | 55 | ڈوز | dose (ḍoz) | The everyday loan every Pakistani insulin household uses ("ڈوز بڑھا دی"). Rejected **خوراک** — it also means *food*, and in an app that pairs every dose with a meal, "کھانے کی خوراک" is unreadable. See hard case 4. | yes |
| app | 50 | ایپ | aip | Universal. "یہ ایپ". Rejected اطلاقیہ (nobody, ever). | yes |
| inject (verb) / injection (noun) | 49 | لگانا / ٹیکہ | lagana / teeka | "انسولین لگائیں" is exactly what people say; **"Do not inject" → "انسولین نہ لگائیں"** names the substance, so the prohibition cannot be misread. Noun: ٹیکہ ("یہ ٹیکہ درج کریں"). Rejected انجیکٹ کرنا (unnatural), داخل کرنا (bureaucratic). | **yes — "do not inject" ×4** |
| insulin | 48 | انسولین | insulin | The only word; universal, feminine. No serious alternative. | yes |
| check (verb) | 44 | چیک کرنا | check karna | "شوگر چیک کریں" is verbatim what the audience says. Rejected معائنہ کرنا (a doctor's examination — wrong actor), جانچنا (formal; acceptable in noun form جانچ where a noun is needed). | yes ×10 |
| check again | 7 of those | دوبارہ چیک کریں | dobara check karen | One fixed phrase everywhere — the app never says "recheck" and the Urdu never varies either. "15 منٹ بعد دوبارہ چیک کریں". | yes ×4 |
| double-check (the §6.2 confirmation's single name, ruled G14) | 4 | ڈبل چیک | double check | Spoken Urdu genuinely says "ڈبل چیک کر لو"; it means *verify what you typed*, which is exactly the feature. Rejected دوبارہ جانچ (collides with "check again", which is a meter action — the confusion G14 exists to prevent). | — |
| the record | 44 | ریکارڈ | record | Universal loan ("ریکارڈ رکھنا"). Rejected اندراجات (bureaucratic), روزنامچہ (archaic diary). | — |
| meal / mealtime | 38 | کھانا / کھانے کے وقت | khana / khane ke waqt | Everyday. Meal dose = "کھانے کی ڈوز". Rejected غذا (nutrition-leaflet register — reserve for nothing), طعام (never). | — |
| unit / units | 36 | یونٹ | yunit | What every insulin user in Pakistan says ("بیس یونٹ"). Invariant plural; **never abbreviated** (rule 3). Rejected اکائی — pure-Urdu maths word nobody uses of insulin; an unfamiliar word on the dose line is its own misread risk. | rule-critical (§10.4) |
| carbohydrate | 31 | کاربوہائیڈریٹ | carbohydrate | What food labels and dieticians in Pakistan use. **Rejected نشاستہ (starch)** — clinically wrong here: the copy defines carbohydrate as *starch and sugar* ("Rice, roti… and the sugar in chai all count"), and نشاستہ excludes the sugar. "grams of carbohydrate" → "گرام کاربوہائیڈریٹ" — long, but §10.1 spends that length deliberately; the label is the defence against entering plate weight. Never shorten to کارب (the app bans "carbs" in English for the same reason). | yes ×5 |
| low / below | 31 | کم / نیچے | kam / neeche | "شوگر کم ہے" is the household phrase. "very low" → "بہت کم"; "below target" → "ٹارگٹ سے نیچے"; "low-ish" (band B) → "ذرا کم". Meter's **LO stays Latin** (rule 2). Rejected پست (literary). | yes ×4 |
| doctor | 25 | ڈاکٹر | doctor | Universal. Rejected معالج، طبیب (formal/archaic). | yes |
| eat / eating | 25 | کھانا (فعل) | khana | "پہلے کھائیں، پھر انسولین لگائیں". "before eating" → "کھانے سے پہلے". Same root as meal — natural in Urdu, no collision in context. | — |
| blood sugar | 21 | بلڈ شوگر | blood sugar | What Pakistani speakers say — §10.2's own logic transposed. Bare **شوگر** is what the audience says even more often, but bare شوگر also means *the disease* ("مجھے شوگر ہے"), so the app standardises on بلڈ شوگر; see hard case 5. Rejected: خون میں شکر (bookish), گلوکوز (clinical; "blood glucose" appears once as the clinical synonym → "خون میں گلوکوز" in that help text only). | yes |
| correction | 21 | کریکشن | correction | Hard case 3 — see below. Loanword recommended; descriptive runner-up recorded. | — (but "held back" flows feed band-adjacent copy) |
| reading | 19 | ریڈنگ | reading | Universal ("میٹر کی ریڈنگ"). Rejected پیمائش (abstract measurement). | yes ×4 |
| work out (the dose) | 19 | حساب لگانا | hisaab lagana | The everyday arithmetic verb; "Work out the dose" → "ڈوز کا حساب لگائیں". Rejected کیلکولیٹ کرنا (understood but colder), معلوم کرنا (vague). | yes ×1 (boundFailure) |
| save | 17 | محفوظ کریں | mehfooz karen | Standard Urdu app convention (WhatsApp, Google) and fully within a fluent reader's vocabulary. Runner-up سیو کریں (spoken form) — flagged as an open register question. "Save a copy" → "کاپی محفوظ کریں". | — |
| gram / grams | 15 | گرام | gram | Universal kitchen word; invariant plural. "15 گرام"، ASCII digits, no-break space, never abbreviated to a single letter (the §10.4 nbsp scope includes bare *g*). | yes ×3 |
| hour / hours | 15 | گھنٹہ / گھنٹے | ghanta / ghantay | "4 گھنٹے". ASCII digits. | — |
| settings | 14 | سیٹنگز | settings | What Pakistani phone users say. Runner-up ترتیبات (Google's Urdu Android convention — recognisable to Urdu-UI users, stiffer). Open question for the reviewer; must be one answer. | yes ×1 |
| log (verb) | 14 | درج کرنا | darj karna | Standard written Urdu for making an entry; keeps English's log-the-act vs record-the-store distinction as درج/ریکارڈ. "Log this injection" → "یہ ٹیکہ درج کریں". Rejected نوٹ کرنا (reads as jotting a note, weaker than committing a record). | — |
| minute / minutes | 13 | منٹ | minute | Invariant: "15 منٹ بعد". ASCII digits. | yes ×3 |
| delete | 13 | ڈیلیٹ کریں | delete karen | Universal phone word. Runner-up مٹا دیں (plain Urdu "erase" — also good, flagged). **Rejected حذف کریں** (Google's formal choice; Arabic, opaque to many older readers — the exact register failure this glossary exists to avoid). | — |
| covers ("1 unit covers 10 grams") | 13 | کے لیے کافی ہے | ke liye kaafi hai | "ایک یونٹ 10 گرام کاربوہائیڈریٹ کے لیے کافی ہے" — plain, exact, no loan needed. Runner-up کور کرنا (spoken loan; shorter in row labels like "How much one unit covers" → "ایک یونٹ کتنا کور کرتی ہے"). Rejected سنبھالنا (folksy, imprecise). | — |
| prescription | 12 | نسخہ | nuskha | The everyday word for what a doctor writes; carries the app's meaning (the three numbers) fine. Rejected پرسکرپشن (needless loan when the native word is universal). | — |
| stacking | 11 | اسٹیکنگ | stacking | **Hard case 1** — see below. | adjacent (drives "correction held back") |
| treat (a low) | 11 | فوری میٹھا کھائیں / شوگر ٹھیک کریں | fauran meetha khayen | **Hard case 2** — the most dangerous term in the file; 8 of its 11 strings are safety copy. See below. | **yes ×8** |
| rounding | 11 | راؤنڈ کرنا | round karna | "راؤنڈ فگر" is everyday speech. "Whole units" → "پورے یونٹ"، "Half units" → "آدھے یونٹ". Rejected گول کرنا (physical "make round" reading). | — |
| entry / entries | 11 | اندراج | indraaj | Pairs visibly with درج کرنا (same root), the way log/logged pair in English; a fluent Urdu reader knows it. Runner-up انٹری (spoken). Flagged for the reviewer. | — |
| high / above | 10 | زیادہ / سے اوپر | zyada / se oopar | "Above 250" → "250 سے اوپر". Meter's **HI stays Latin**. The app rarely says the word "high" — do not introduce it where English used a number. | yes ×4 |
| mg/dL | 10 | mg/dL (لاطینی ہی) | — | **Stays Latin** (rule 2): it is what the meter prints, and the field exists to match the device. Never ملی گرام فی ڈیسی لیٹر. | yes ×3 |
| target | 9 | ٹارگٹ | target | Universal loan; "شوگر کا ٹارگٹ" is what clinicians say to patients. Rejected ہدف (news-register Arabic), مقررہ حد (vague). | — |
| meter | 9 | میٹر | meter | Unambiguous inside a sugar app; گلوکومیٹر available for a first mention if a string needs it. Rejected مشین ("the machine" — vague), آلہ (formal). | yes ×5 |
| history (the screen) | 9 | ہسٹری | history | Universal medical loan ("مریض کی ہسٹری"). Rejected تاریخچہ (literary; تاریخ also collides with "date"). Kept distinct from ریکارڈ, mirroring the English History-screen / the-record distinction. | — |
| held back (correction) | 8 | روک لی گئی / روک لینا | rok li gayi | "کریکشن روک لی گئی" for "Correction held back" — exact: withheld for now, not cancelled ("Why is this smaller?" gives it back). Rejected معطل (bureaucratic suspension), منہا / کاٹ لی (asserts deduction — wrong fact). | — |
| background insulin | 7 | بیک گراؤنڈ انسولین | background insulin | **Hard case 6** — the plain-Urdu alternatives smuggle in duration claims that are false for NPH. See below. | — |
| syringe | 7 | سرنج | syringe (sirinj) | THE word in Pakistan. Rejected انجکشن (names the shot, not the instrument — and the copy distinguishes syringe from pen). | — |
| result | 7 | نتیجہ | nateeja | Everyday (exam results are نتیجہ). "This result is from 2:15 PM" → "یہ نتیجہ 2:15 PM کا ہے". | — |
| long-acting insulin | 6 | لمبے اثر والی انسولین | lambay asar wali insulin | Plain and duration-true. Rejected طویل اثر (Arabic طویل — stiff), **بیسل** (banned: §10.2 — neither "basal" nor "bolus" appears in the interface; the Urdu must not reintroduce them). | — |
| ISF | 6 | ISF (لاطینی ہی) | — | Stays Latin. The label's whole job: *"if your doctor says 'your ISF is 30' you know which field that is."* The doctor says the English letters. The one full-name string → transliterated gloss "انسولین سینسیٹیویٹی فیکٹر (ISF)", because a translated "حساسیت کا عنصر" matches nothing any doctor says. | — |
| ICR | 6 | ICR (لاطینی ہی) | — | Same logic. Full-name string → "انسولین اور کاربوہائیڈریٹ کا تناسب (ICR)". | — |
| type 1 / type 2 | 6 | ٹائپ 1 / ٹائپ 2 | type 1 | ASCII digit (rule 1). Disease word is hard case 5. | — |
| start over | 6 | نئے سرے سے شروع کریں | naye siray se shuru karen | The destructive full-reset; the idiom signals *from scratch*. Rejected دوبارہ شروع کریں (reads as merely reopening the app — understates what dies). | — |
| pen | 5 | پین | pen | "انسولین پین" — loan; قلم is a writing pen only. | — |
| mealtime insulin | 4 | کھانے کی انسولین | khane ki insulin | Plain, exact, and what households say. Rejected بولس (banned, §10.2), میل ٹائم انسولین (needless loan over natural Urdu). | — |
| ketones | 3 | کیٹون / کیٹونز | ketone(s) | No Urdu word exists; urine strips and labs say Ketones. "کیٹون چیک کریں". The word may be unknown to the reader in any language — the English shares that property, and the advisory teaches the action, not the chemistry. | **yes ×3 (band E, meterHi)** |
| fast-acting carbohydrate | 3 | تیز اثر والا کاربوہائیڈریٹ | tez asar wala carbohydrate | Exact rendering of the band C/D treatment instruction. A mouthful in an emergency — whether to add concrete examples (گلوکوز، جوس) is a copy change, not a translation, and goes to Momin under §20.1 (open question 4). | **yes ×3 (band C/D, meterLo)** |
| ratio | 3 | تناسب | tanaasub | School-maths Urdu; appears only in secondary clinical text, where a slightly formal word is acceptable. Runner-up ریشو (spoken loan). | — |

---

## Hard cases

Each entry gives the recommendation, the runner-up, and what taking the runner-up would cost. None was picked quietly.

### 1. stacking — اسٹیکنگ (loan)

§10.6/`explain.stackingBody` defines stacking at length, and the copy commits in writing to using one word for it: *"That is stacking, and it is the word the app uses on the result screen and in Settings."* The English already chose a technical word over the self-explaining alternative ("recent-insulin check") and documented the cost. The translation should not silently reverse that decision.

- **Recommendation: اسٹیکنگ** (stacking, f — "اسٹیکنگ کی جانچ" for "the stacking check"). The explainer page teaches it exactly as the English does: «اسٹیکنگ» کا کیا مطلب ہے. One stable short noun works in every position the English uses it — history rows ("stacking check overridden"), Settings, the result screen.
- **Runner-up: انسولین پر انسولین** ("insulin on top of insulin") — self-explaining to a reader who skipped the explainer.
- **What the runner-up costs:** there is no compact noun. "stacking check" becomes "انسولین پر انسولین والی جانچ" (a mouthful in a history row scanned, not read), the explainer's title loses its taught-term structure, and a doctor who says "stacking" in English (they do) matches nothing on screen. The English copy paid the opposite cost knowingly; the Urdu should pay the same one, not a new one.

### 2. treat (a low) — the most safety-loaded word in the file

8 of its 11 strings are band C/D, meterLo, or stale-low copy. The action "treat" names is *eat fast-acting carbohydrate now*. Two Urdu traps, both fatal:

- **علاج کریں** (the literal "treat/get treatment") pulls toward *seek medical care* — the reader delays the sugar that IS the treatment, in the exact worst moment.
- **ٹریٹ کریں** (loan) — "treat" in Pakistani Urdu means a celebration treat ("ٹریٹ دو!"). Unusable.

- **Recommendation: translate the action, not the word.** Imperative contexts render concretely: "Treat this first. Do not inject." → «پہلے فوری کچھ میٹھا کھائیں — انسولین نہ لگائیں»؛ "Treat it now" → «ابھی کچھ میٹھا کھائیں». Referential contexts ("if you have treated") → «اگر آپ نے میٹھا کھا لیا ہے». The body sentence's 15 گرام تیز اثر والا کاربوہائیڈریٹ carries the precision; the verb carries the urgency.
- **Runner-up: علاج کریں** — closest to source structure, used in Pakistani diabetes-educator literature ("ہائپو کا علاج").
- **What the runner-up costs:** the misread above, on the app's most safety-critical screen, for exactly the reader (non-clinician, everyday register) this translation serves. A hypoglycaemic person's helper reading "علاج کریں" and reaching for a phone instead of juice is the failure mode.
- **Separate sense, same English word:** `meterHi.body` "treat it as a minimum" is *regard as* — «اسے کم از کم سمجھیں» (سمجھنا), never the hypo verb. And "this dose treats 500" is the dosing sense — «یہ ڈوز 500 کے حساب سے ہے». Three senses, three renderings; agents must not unify them.
- **This entry needs the native reviewer AND clinical sign-off before it ships** (BACKLOG 10a's own bar for exactly these strings).

### 3. correction — کریکشن (loan)

The concept — extra insulin to bring a high reading down to target — has no established everyday Urdu word.

- **Recommendation: کریکشن** (f). Pakistani clinicians say "correction" / "correction dose" in Urdu sentences; the working breakdown (§10.3) visually defines it every time it appears — the arithmetic row *is* the definition; and it inflects cleanly: "کریکشن روک لی گئی".
- **Runner-up: شوگر گھٹانے کی ڈوز** ("the sugar-lowering dose") — transparent to a reader who has never met the concept.
- **What the runner-up costs:** it is a sentence, not a term. It cannot sit in the §10.3 working table's label column, collides with the meal dose (also a ڈوز) in strings that contrast the two, and drifts — five agents will each shorten it differently, which is the exact inconsistency this glossary exists to prevent.

### 4. dose vs خوراک — the food collision

خوراک is the standard Urdu word for a medicine dose *and* for food/nourishment. In an app whose every calculation pairs a کھانا with a dose, خوراک is unusable: "کھانے کی خوراک" (the meal dose) parses as "the food of the food". **Ruling for all agents: dose = ڈوز, always; خوراک appears nowhere in the app.** This is the glossary's most important collision fix — it will read fine in any single string and corrupt the app in aggregate, which is precisely the class of defect a per-screen review cannot catch.

### 5. diabetes — شوگر vs ذیابیطس

Everyday Pakistani Urdu calls the disease شوگر ("مجھے شوگر ہے") — the same word as the reading. The app says "blood sugar" ~21 times and names the disease 6 times (type 1/type 2). Letting شوگر mean both invites real confusion in strings like the disclaimer's "This is for type 1 diabetes."

- **Recommendation:** disease = **ذیابیطس**, glossed once at first mention as «ذیابیطس (شوگر کی بیماری)»; reading = **بلڈ شوگر**. "type 1 diabetes" → «ٹائپ 1 ذیابیطس».
- **Runner-up:** disease = «شوگر کی بیماری» everywhere (no Arabic word at all).
- **What the runner-up costs:** three extra words in the two red/amber disclaimer panels, which §10.6 built for a skimming reader; and bare شوگر will inevitably leak in and re-create the collision. ذیابیطس is within a fluent reader's vocabulary (it is what TV health segments say).

### 6. background insulin — بیک گراؤنڈ انسولین (loan)

The copy uses "background" for what covers you *between* meals — deliberately duration-neutral, because it must cover both once-daily Lantus AND 8–12-hour NPH (`wrongTurnBody`).

- **Recommendation: بیک گراؤنڈ انسولین**, with the copy's own gloss doing the teaching where the string explains ("پیچھے سے، دن بھر کام کرنے والی" in `twoInsulins.body`, which already glosses it in English too: "the slow background one").
- **Runner-up: دن بھر والی انسولین** ("the all-day insulin") — warmer, no loan.
- **What the runner-up costs:** it is **false for NPH** ("NPH works over eight to twelve hours") — and the NPH strings are exactly where "background" does its hardest work, telling a reader their named insulin covers *between* meals, not this meal. A rendering that is right for Lantus and wrong for NPH is the same category of defect the U-100 copy refused ("right for most brands and wrong for two is worse than one that names none").

### 7. Insulin class headings (the picker)

One-off strings, but a mispick here is the dangerous mistake the screen exists to catch, so the headings must aid recognition of the *box*:

- Rapid-acting → «تیز اثر والی (Rapid)» ; Ultra-rapid → «بہت تیز اثر والی (Ultra-rapid)» — the Latin tag stays because pens say Rapid/Ultra-rapid in English.
- Regular human insulin → «ریگولر ہیومن انسولین (Regular)» — the vial literally prints REGULAR; a translated «عام انسانی انسولین» matches nothing in the reader's hand.
- Premixed → «پری مکس (Premixed)» — boxes say Mixtard/Mix25/70-30.
- Intermediate-acting → «درمیانے اثر والی» ; Long-acting → «لمبے اثر والی».
- The `classNote` lines under each heading translate fully — they are the recognition aid for someone who does not know the class word, which describes this audience.

### 8. U-100 / "100 units/mL"

`settings.unitAssumption` tells the reader to check the strength printed on the box. The box prints "U-100" and "100 units/ml" in English. Keep **U-100** and the printed form Latin inside the Urdu sentence; the surrounding prose (and the 2.5-times warning) translates. Translating the printed token would defeat the string's one job — matching eye to box.

---

## Open questions for the native reviewer

Per BACKLOG 10a the reviewer is Momin's mother, on a deployed build; draft strings may be LLM-produced but nothing ships as her review. These are the calls this glossary could not close:

1. **Register pairs needing one ruling each** (either is defensible; five agents must not split): سیٹنگز / ترتیبات؛ محفوظ کریں / سیو کریں؛ ڈیلیٹ کریں / مٹا دیں؛ اندراج / انٹری.
2. **The treat verb** (hard case 2) — needs her reading AND a clinical check that the concrete rendering («فوری کچھ میٹھا کھائیں») matches what CLINICAL.md means by treating a level-1/2 low. Highest-stakes item in this document.
3. **Gender assignments** for کریکشن، اسٹیکنگ، ایپ — my proposals are in the conventions block; a native ear should confirm before mass translation, because retrofitting gender agreement across 439 strings is a full re-pass.
4. **Fast-acting carbohydrate examples** — adding «(مثلاً گلوکوز، جوس)» to band C/D bodies would help this audience but is a copy change, not a translation; §20.1 requires Momin's explicit go-ahead, twice.
5. **"diabetic ketoacidosis"** (`meterHi.body`, an emergency string) — proposed «کیٹو ایسڈوسس», transliterated, since no Urdu term exists that a lay reader would know; the sentence's "this is an emergency" carries the weight. Clinician should confirm.
6. **Hasham's name in Urdu script** — the settings examples name him ("Hasham's is 150"). A person's name normally goes to Urdu script in Urdu prose, but the spelling (ہشام؟) is his family's to give — ask Momin, do not guess a spelling.
7. **`foods.searchHint`** says "English or Roman Urdu — roti, chawal…". Search matches the Roman `roman` field in `carbs.ts` (called `urdu` until #87 renamed it, because it holds Roman Urdu and a separate field will hold the script) (which, per BACKLOG 10a, contains transliterations, not Urdu script — filling it with real Urdu is a separate data task assigned to her). The Urdu version of this hint must describe what search *actually matches* at ship time; wording depends on whether the carbs.ts Urdu-script task lands first.
8. **units() pluralisation collapse** — the `units()` function's `'1' ? 'unit' : 'units'` ternary is meaningless in Urdu (یونٹ invariant). Whoever wires the Urdu strings should confirm the localisation mechanism tolerates a language where the branch collapses, rather than forcing a fake plural.
9. **"blood glucose" help-text synonym** — proposed «خون میں گلوکوز» for the single clinical-synonym mention. Low stakes, but it is the one licensed exception to the بلڈ شوگر rule and should stay unique.

---

*Sources: `src/ui/copy.ts` (the corpus), `docs/PLAN.md` §4.2, §10.1–10.6 (vocabulary, digits, ISMP rules, stacking definition), `docs/CLINICAL.md` §2–4 (what the terms clinically mean), `docs/BACKLOG.md` item 10a and the brand-names ruling (translation decisions already made). Counting scripts and extracted strings: `extract-strings.cjs`, `final-counts.cjs`, `strings.json` in this scratchpad.*
