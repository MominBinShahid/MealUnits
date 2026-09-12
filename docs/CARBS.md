# Carbohydrate reference — Pakistani and Karachi food

**This document is the data of record. Behaviour is specified in `PLAN.md`** — this file says what a
food contains; the plan says what the app does with it.

**It speaks grams per real portion.** The number you want is "this roti is 18 g", "this plate of
biryani is 51 g". Never a serving count.

> **If your clinic taught "servings" or "exchanges":** 1 serving = 15 g of carbohydrate, so "4
> servings" is 60 g. **Translate to grams before using anything here.** Typing a serving count into
> a field expecting grams is a fifteen-fold dosing error, which is the only reason this line exists.

> **These values scale an insulin dose.** Every one is cited. Where sources disagree the range is
> shown and never averaged into a false midpoint. Anything marked *calculated* or *assumption* was
> derived by us rather than measured by a lab. Foods with no credible value are listed as unknown
> rather than guessed at.

## Where the numbers come from

The strongest source is the **2024 Life for a Child *Healthy eating and carbohydrate counting —
Pakistani Foods*** book: Pakistani, Type 1 specific, patient-facing, project-led by Prof. Asher
Fawwad (Baqai / BIDE) with Meethi Zindagi and Carmel Smart. 135 of its food rows were extracted and
verified page by page against the rendered pages, then reconciled row by row against everything
else. It is also why this document speaks grams: the book states outright that carbohydrate *"may be
counted in grams, exchanges or portions"* and that *"in this book we will only refer to grams"*.

**The document this replaces is kept beside it**: `carb-exchange-handout.jpg` is the exchange sheet
Hasham's doctor gave him, and it is where the 15 g model above comes from. It is Western-portioned —
bagels, crackers, pretzels — with naan and chapatti as afterthoughts, which is the gap this file
exists to close. Kept as provenance, not shipped in the app.

Around it sit a Pakistani laboratory study of thirty cooked dishes (Khan 2019), UK CoFID, USDA
FoodData Central, and the Karachi Commissioner's official tandoor weights — which matter more than
they sound, because a naan's weight tier is the single largest uncontrolled variable in a Karachi
meal.

**section 18 records every value that disagrees with a common source and why.** **section 19 carries the licences
and the attribution text**, which is not optional — CoFID is Open Government Licence v3 and omitting
its credit terminates the licence.

## The three kinds of uncertainty

Every "it varies" in here is one of three things, and they need three different answers. section 1 sets this
out in full; the short form is that **(a)** portion size is yours and settles with one measurement,
**(b)** recipe variation changes meal to meal and can only be shown as a range, and **(c)** some
foods have never been analysed by anyone and are marked unknown rather than filled in.

---

## 1. Three kinds of uncertainty — the frame everything below hangs on

Every "it varies" in this table is one of exactly three kinds, and they need three different product responses:

| Tag | Kind | Test | What the app should do |
|---|---|---|---|
| **(a) PORTION** | Depends on the user's own household and is **stable for them**: their katori, their chai cup, the size their roti comes out, their tandoor's naan tier, their usual biryani plate. | *"If I measured it once, would the answer stay true next week?"* → yes | A **user setting** with our figure as the default. Settle once, reuse forever. |
| **(b) RECIPE** | Varies **meal to meal for the same person**: potato in today's biryani, sugar the shop put in this lassi, how thick this daal was cooked, syrup soaked into this gulab jamun. No setting can fix it. | *"Could yesterday's plate and today's plate differ even from the same kitchen?"* → yes | Show a **range**, and where one variable dominates, expose it as a named adjustment (e.g. "+8–16 g per potato chunk"). |
| **(c) UNKNOWN** | **The data does not exist.** Neither a setting nor a range helps. | *"Would a food-composition scientist have to shrug?"* → yes | Show the gap honestly ("no verified value — ask your dietitian"), never a confident number. Fix with better data later. |

Rows can carry more than one tag — biryani is (a) *your plate size* **and** (b) *this pot's rice:meat ratio and potatoes*. The five re-sorted v1 questions (katori, biryani unit, chai cup, fibre policy, mithai unit) are unchanged from section 1 and still stand; the fibre policy remains: prefer available-carb sources, flag by-difference rows as slight overestimates, never ask the user.

---

## 2. How to read the tables

- **Household measure defaults** (all (a)-settings; figures below use the default): **katori** = 150 ml ≈ 150 g of a wet dish · **chai cup** = 150 ml (grid gives 200/250 too) · **glass** = 250 ml · **plate** of rice/biryani = 300 g · **1 tsp sugar** = 4.2 g level [USDA] (heaped ≈ 6 g) · **1 Tbsp** = 15 ml. The LFAC book's own conventions: cup = 250 ml, bowl = 250 ml; its "1 cup" of a wet dish weighs 200–245 g, its "1 cup" of rice 160–190 g — consistent with our katori/plate frame after scaling.
- **Confidence**: **HIGH** lab-analysed or multi-source agreement, low real-world spread · **MED** good source(s) but portion/recipe moves it · **LOW** weak sources, wide disagreement, or our own calculation.
- **Source tags**: **[LFAC]** *Healthy eating and carbohydrate counting — Pakistani Foods*, Ed. 1, 2024 (Life for a Child / ISPAD; BIDE + Meethi Zindagi) — **new in v3, and the ranking Pakistani source**: Pakistani, Type 1-specific, patient-facing, dietitian-compiled. Note the book's own caveat: *"The carbohydrate values mentioned in this book are estimates only as many factors can affect the amounts, for example the method of preparation etc."* (p. 23) · **[KHAN]** Khan et al. 2019 Pakistani AOAC lab study · **[USDA-SR]/[FNDDS]** USDA FoodData Central · **[CoFID]** UK McCance & Widdowson 2021 · **[SJSU]** dietitian carb-counting handout · **[IDF-DAR]** Diabetes & Ramadan guidelines · **[PK-FCT]** Pakistan FCT 2001 (energy cross-check) · **[KHI-OFFICIAL]** Karachi Commissioner tandoor weight/rate list · **[NIN]** Indian food-composition lineage · **[LIT]** peer-reviewed literature (named per row) · **[LABEL]** manufacturer label · **[LABEL-EST]** manufacturer's published estimate · **[WEAK]** tracker/recipe sites only · **[CALC]** our arithmetic from cited components.
- **Reconciliation policy (v3):** where [LFAC] and a prior source agree, the row says so and confidence rises. Where they disagree, both values are shown — never averaged — with the recommended one named and the reason given. **Any row without an [LFAC] tag is unconfirmed by the Pakistani source.**
- **By-difference flag**: rows resting on [KHAN] or USDA by-difference values include fibre — treat as a slight overestimate.

---

## 3. Breads — the families, broken out

Density anchors (CHO per 100 g cooked): **atta breads** ≈ **43–46 g/100 g** [FNDDS chapati 46; CoFID 43.7–48.3; **LFAC's three atta breads run 43–46**: chapatti 43.5, phulka 42.9, tandoori roti 45.5]; **maida breads** ≈ **50 g/100 g** [FNDDS naan 50.1; CoFID 50.2; **LFAC's four maida breads all land on it**: naan 49.6, Afghani naan 49.7, kulcha naan 49.5, rumali roti 49.1]; **paratha ≈ 45 g/100 g** [FNDDS 44.6; CoFID 45.8; LFAC paratha 44.6].

> **The weigh-once rule (the single best calibration in this document):** for any flatbread, **CHO ≈ cooked weight × 0.46 (atta breads: roti, chapati, phulka, tandoori roti, khamiri) or × 0.50 (maida breads: naan, kulcha, rumali, sheermal-style doughs)**. Both coefficients matter — using 0.46 for a naan under-counts it by ~8 %. One kitchen-scale weighing of "your" roti/naan/paratha turns a MED row into a HIGH row for that user. The LFAC book's bread pages confirm both coefficients almost exactly (atta 0.43–0.46, maida 0.49–0.50). [CALC from the anchors above]

### 3.1 Naan family — one value was never enough

The Karachi tandoor sells three official weight tiers — **chapati 100 g; naan 120 g / 140–150 g / 180 g** [KHI-OFFICIAL, notifications 2024–May 2026]; the price you pay identifies the tier. LFAC's photographed naan (133 g → 66 g) sits inside the small–middle tier band and confirms the arithmetic.

| Variant — how to recognise it | CHO per piece | Varies | Conf |
|---|---|---|---|
| **Tandoor naan, small tier** — 120 g, the cheapest at the tandoor | **≈ 60 g** [KHI-OFFICIAL 120 g × 0.50]; **LFAC's 133 g naan = 66 g corroborates the density exactly** | (a) which tier your tandoor sells — settle by price or one weighing; (b) minor: tandoors run heavy | **HIGH** density / MED piece — was MED-HIGH; LFAC agreement upgrades |
| **Tandoor naan, middle tier** — 140–150 g | **≈ 70–75 g** [KHI-OFFICIAL × 0.50] | same | **MED-HIGH** |
| **Tandoor naan, large tier** — 180 g | **≈ 90 g** [KHI-OFFICIAL × 0.50] | same | **MED-HIGH** |
| Restaurant naan (butter/garlic) — plate-sized, 10"+ | **≈ 85–95 g** [FNDDS 10" = 177 g → 89 g; butter adds fat, not carbs] | (a) your restaurant's size | **MED** |
| **Afghani naan** — the huge oval one | **NEW:** ½ piece 145 g = **72 g**; a whole one ≈ 290 g ≈ **145 g** [LFAC] — a full Afghani naan is close to three meals' carbohydrate | (a) how much of it you actually eat | **MED-HIGH** |
| Roghni naan — shiny ghee/milk glaze, sesame | 150 g piece ≈ **72–78 g** [LABEL Sufi/Dawn 450 g/3 pc; density 47–52/100 g via N-American labels] | (a) piece size; (b) glaze | **MED** — no LFAC row; unconfirmed by the Pakistani source |
| **Kulcha, tandoor** (cholay wala) — round, maida | **UPGRADED from LOW:** LFAC "Kulcha Naan" 202 g = **100 g** (49.5/100 g — the naan-density assumption v2 used is now measured). Smaller 80–120 g kulchas ≈ **40–60 g** by the same density | (a) piece size — LFAC's is a big one; weigh yours once | **MED** — was LOW |
| **Kulcha, Peshawari/bakery** (chai wala, dry rusk-like roundel) | **still no verified value** — rusk proxy (CoFID 55.7–73/100 g): a 40 g piece ~22–29 g. LFAC's kulcha is the tandoor bread, not this | (c) | **—** see section 16 |
| **Sheermal** — saffron-yellow, sweet milk dough | **CLOSED (was (c)/LOW):** LFAC: 1 large = 257 g = **167 g CHO** (65/100 g). the earlier naan-density assumption (50–55/100 g) was too low — sheermal is drier and sweeter than naan, closer to rusk density. Per 100 g piece ≈ 65 g; **weigh yours: × 0.65** | (a) piece size — bakery sheermals vary hugely; (b) enrichment. *Flag: 65/100 g is at the physical edge for a bread — credible only because sheermal is semi-dry; treat LFAC's 257 g "large" as a dawat-size piece, not a default* | **MED** — single Pakistani source, plausible-but-extreme density |
| **Taftan** — ring-shaped, enriched | **50–62/100 g**; 100–120 g piece ≈ **55–70 g** [LIT Iranian taftoon 62/100 g as eaten, our conversion; Pakistani taftan richer → lower] | (a) piece; (b) enrichment | **MED-LOW** — no LFAC row; unconfirmed by the Pakistani source |
| Qeema naan | 100 g = **38 g** [LFAC] — filling displaces dough (38/100 g vs plain naan 50) | (a) size; (b) filling share | **MED** — NEW |

### 3.2 Roti / chapati family — thickness matters as much as diameter

Weight captures diameter and thickness together; density is stable at ≈ 0.43–0.46 — so the table is one rule (weight × 0.46) shown at recognisable sizes.

| Variant — how to recognise it | Cooked weight | CHO per piece | Varies | Conf |
|---|---|---|---|---|
| **Phulka** — small, thin, puffs up | 27–35 g [FNDDS small 27; **LFAC "1 small" = 35 g**] | **12–15 g** [FNDDS 12–14; **LFAC 35 g = 15 g** — same density, LFAC's phulka runs a shade bigger] | (a) your roti's size — weigh once | **HIGH** — two independent sources, same density |
| Home roti, 7", medium | ~40 g [FNDDS] | **18–19 g** | (a) | **HIGH** |
| Home roti, 8", thin | ~50 g [CALC scaled] | **≈ 23 g** | (a) | **MED** |
| Moti roti — 8", thick, heavy | 60–80 g [*assumed*] | **28–37 g** [CALC] | (a) — weigh once | **MED** |
| Large thick roti / **Chapatti 12"** | 90–100 g [**LFAC large chapatti = 92 g**] | **40–46 g** [**LFAC 92 g = 40 g**; CALC 41–46] — LFAC lands at the bottom: its density is 0.435 | (a) | **MED-HIGH** — was MED; LFAC corroborates |
| **Tandoori roti** — bought, atta | Karachi official 100 g [KHI-OFFICIAL]; **LFAC's "1 medium" is only 33 g** | Karachi tandoor roti: **46–55 g** [KHI-OFFICIAL × 0.46]. LFAC small roti: **15 g per 33 g piece** — same density (45.5/100 g), very different piece. **The density agrees; the piece weight is the whole question — weigh yours** | (a) your tandoor vs a small home-style roti — a 3× spread in piece weight | **MED** — density HIGH, portion (a) |
| **Laal chapati** (red/whole atta) | 80 g | **28 g** [LFAC] (35/100 g — below the atta anchor; moister dough) | (a) | **MED** — NEW |
| **Baajrey ki roti** (bajra/millet) | 55 g | **35 g** [LFAC] — *flag: implies 64/100 g, well above any fresh-roti density; plausible only for a very dry, thin bajra roti. Use with caution, verify with the meter* | (a); (b) dryness | **LOW-MED** — LFAC value passes no independent check |
| **Makkai ki roti** (maize) | 56 g | **35 g** [LFAC] — *same flag as bajra: 62.5/100 g is very high* | (a); (b) | **LOW-MED** |
| **Koki** (Sindhi, ghee-laden, pan-fried) | 98 g | **28 g** [LFAC] (28.6/100 g — ghee dilutes the flour) | (a); (b) ghee share | **MED** — NEW |
| **Rumali roti** | 55 g | **27 g** [LFAC] (49/100 g — it's maida: use × 0.50, not × 0.46) | (a) | **MED** — NEW |
| Khamiri roti — atta, yeast, spongy | 100–200 g | **≈ 45–90 g** [atta anchor × weight] | (a) piece weight — weigh once | **MED-LOW** until weighed; no LFAC row |
| Bread slice, white (double roti) | 25–34 g | **13–15 g** [SJSU; USDA; **LFAC international: 34 g slice = 15 g** — agree] | — packaged | **HIGH** |
| **Bhatura** | 65 g | **30 g** [LFAC] (46/100 g — fried maida) | (a) size | **MED** — NEW |

### 3.3 Paratha family — now with the whole stuffed-paratha menu

| Variant | CHO per piece | Varies | Conf |
|---|---|---|---|
| Plain paratha, home | **LFAC "1 medium" 74 g = 33 g**; an 8" 90–100 g home paratha ≈ **40–46 g** [FNDDS density 44.6 = LFAC's 44.6 exactly] | (a) your size/thickness — weigh once; ghee changes fat, not carbs | **HIGH** density — was MED; LFAC = FNDDS to the decimal |
| Frozen plain paratha (Dawn) — labelled | **39 g per 80 g piece** [LABEL] | — packaged | **HIGH** for the packet |
| Frozen lachha / other brands | read the packet — labels beat every estimate here [LABEL] | — | **HIGH** per packet |
| **Lachha paratha, fresh** | 95 g = **44 g** [LFAC] (46.3/100 g) | (a) size | **MED** — NEW (fresh; frozen row above unchanged) |
| Aloo paratha | **LFAC 103 g = 46 g (44.7/100 g)** vs frozen label 37/100 g — LFAC's is potato-lean; recommended: **weight × 0.37–0.45 by stuffing generosity**; typical 100–120 g piece **≈ 40–50 g** | (a) size; **(b) potato load — the dominant variable** | **MED** — CHANGED: the earlier single 44 g becomes a stuffing-dependent band with LFAC at the top |
| Qeema paratha | 125 g = **46 g** [LFAC 36.8/100 g — meat displaces dough, exactly as the earlier CALC predicted 35–45] | (a) size; (b) filling:dough | **MED** — was MED-LOW; LFAC confirms the CALC |
| **Anda paratha** | 125 g = **46 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Cheese paratha** | 85 g = **30 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Chicken paratha** | 90 g = **31 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Puri paratha** | 110 g = **49 g** [LFAC] | (a) | **MED** — NEW |
| **Baisan paratha** | 85 g (6") = **25 g** [LFAC] (besan runs leaner than atta) | (a); (b) besan share | **MED** — NEW |
| **Puri** | **CHANGED — it was a size question, not a density dispute:** density ~39–41/100 g [FNDDS 38.9; LFAC 41.2 — agree]. Small 4–5" thin puri ≈ **7–14 g** [SJSU/FNDDS]; **halwa-puri-shop puri 68 g = 28 g** [LFAC] | (a) your puri-wala's size — the 2× "disagreement" in v2 was two real sizes; (b) thickness | **MED-HIGH** — was MED |
| Bakarkhani | **CHANGED:** LFAC 47 g = **21 g** (44.7/100 g) vs label mirrors 58–60/100 g. LFAC recommended — it is a measured Pakistani piece, the labels were packaged export variants (drier). A 50 g piece ≈ **22 g** | (a) piece size; (b) bakery style — dry packaged ones run to 60/100 g | **MED** — was LOW-MED |
| **Bolani** (Pashtun stuffed fried flatbread) | 128 g = **68 g** [LFAC] (53/100 g) | (a); (b) filling | **MED** — NEW |
| Rusk / cake rusk | 10 g rusk = **6 g** [**LFAC**, 60/100 g; CoFID 55.7–73 agrees]; cake rusk 20 g ≈ 11 g [CoFID] | (a) brand | **MED-HIGH** — was MED; two sources agree |

---

## 4. Rice dishes — Chawal, with biryani done properly

Density anchors: plain boiled **28–31/100 g** [USDA-SR 28.2; CoFID basmati 26.5–32.2; **LFAC white rice 160 g cup = 50 g → 31.3** — top of the band]; pulao **18–24/100 g** [KHAN beef pulao 22.2; CoFID pilau 24.3; **LFAC meat pulao 160 g = 29 g → 18.1** — *widened down in v3*: a meaty pulao runs lighter than the lab recipes].

| Food | CHO per portion | Varies | Conf |
|---|---|---|---|
| Plain boiled rice (sada chawal) | katori 150 g ≈ **42–47 g**; cup ≈ **45–50 g** [**LFAC cup 160 g = 50 g**]; plate 300 g ≈ **84–94 g** — the earlier 80–90 nudged up: LFAC sits at the top of the lab band | (a) plate/katori size only | **HIGH** |
| Pulao (yakhni/meat pulao) | **CHANGED (widened down):** cup 160–180 g ≈ **29–44 g** — LFAC meat pulao 160 g = 29 g (18.1/100 g, meat-heavy, "incl. 120 g rice") vs KHAN/CoFID 22–24/100 g (rice-heavy). Plate 300 g ≈ **54–73 g**; the rice:meat ratio decides which end | (a) plate; (b) meat share — now a named 18–24/100 g band | **MED-HIGH** |
| **Kabuli pulao** | cup 180 g = **44 g** [LFAC] (24.4/100 g = CoFID pilau to the decimal) | (a) plate; (b) raisins/carrots add a little | **MED-HIGH** — NEW |
| **Matar pulao** | cup 180 g = **42 g** [LFAC] (23.3/100 g) | (a); (b) | **MED-HIGH** — NEW |
| Chana pulao | cup 188 g = **44 g** [**LFAC**; the earlier CALC said 46–50 — confirmed] | (a); (b) chickpea share | **MED-HIGH** — was MED |
| **Qeema masoor pulao (Memon)** | cup 166 g = **38 g** (rice only) [LFAC] | (a); (b) | **MED** — NEW |
| **Chicken akni (Memon pulao)** | cup 167 g = **41 g** (rice only) [LFAC] | (a); (b) | **MED** — NEW |
| **Cholistani-style pulao (Saraiki, camel meat)** | cup 164 g = **46 g** (rice only) [LFAC] | (a); (b) | **MED** — NEW |
| Khichdi | cup ≈ **30 g** [SJSU]; **LFAC Bohra qeema khichdi 246 g cup = 35 g** (14.2/100 g — agrees) | (a) katori; (b) wetness | **MED-HIGH** — was MED |
| Tehari / **Aloo tahiri** | **CHANGED:** LFAC aloo tahiri cup 166 g = **50 g** (30.1/100 g) vs FNDDS vegetable biryani 17.9/100 g. **LFAC recommended for Pakistani aloo tahiri** — it is rice + potato, nearly plain-rice density; FNDDS's dish is a wetter vegetable pilaf. Katori ≈ 45 g; plate 300 g ≈ **90 g**. The two figures are different dishes, both kept | (a) plate; (b) potato load | **MED** — the +68 % relative change is the largest per-100 g move in v3 |
| **Vegetable fried rice** | cup 162 g = **48 g** [LFAC] (29.6/100 g) | (a) | **MED** — NEW |
| Sweet rice (zarda) | katori ≈ **45–50 g** [FNDDS honey-rice proxy; trackers 50–70/serving] — **LFAC does not list zarda; still proxy-based** | (a); (b) sugar/dried fruit; (c) no real analysis — see section 16 | **LOW-MED** |
| Kheer | **CHANGED — the Pakistani recipe is much richer than the UK lab one:** LFAC ¾ cup 118 g = **37 g** (31.4/100 g) vs CoFID/FNDDS rice pudding 18.4–18.9/100 g. **LFAC recommended**: it is the Pakistani preparation (reduced milk + more sugar), and v2 itself warned its 28 g katori figure was "the floor". Katori 150 g ≈ **47 g**; both densities shown in-app as home-light (19) vs shop/dawat (31) | (a) katori; (b) how reduced/sweet — now a named 19–31/100 g band | **MED-HIGH** |
| **Firni** | ¾ cup 158 g = **23 g** [LFAC] (14.6/100 g — thinner than kheer; CoFID-adjacent). Split from the kheer row: firni ≠ kheer | (a); (b) | **MED** — NEW as its own row |
| **Kheer kharkoon (Sindhi date kheer)** | ½ cup 72 g = **21 g** [LFAC] (29.2/100 g) | (a); (b) dates | **MED** — NEW |
| **Daal chawal (as a plate)** | 1 cup rice + 1 cup daal = 355 g = **75 g** [LFAC composite: rice 159 g = 50 + daal 196 g = 25] — section 14's 65–75 g estimate confirmed at the top end | (a) rice share | **MED-HIGH** |
| **Daal chawal palidu (Bohra)** | 1½ cup 350 g = **78 g** [LFAC] | (a) | **MED** — NEW |
| **Bademjan (Pashtun rice + eggplant)** | cup 240 g = **25 g** [LFAC] | (a); (b) | **MED** — NEW |

### 4.1 Biryani — the discrepancy, resolved with the working shown

**The scare was an extraction artifact, and the book confirms v2.** The naive `pdftotext` run interleaved page 27's three photo cards into `White Rice / Kabuli Pulao / Biryani` followed by `1 / 160g / 50g`, `1 / 180g / 44g` — reading "biryani = 44 g per 180 g" (24.4/100 g), which would have sat above the earlier whole range. Layout-preserved re-extraction plus a rendered-image check of page 27 gives the true assignment:

| Book row (p. 27, verified visually) | Portion | CHO | g/100 g |
|---|---|---|---|
| White Rice | 1 cup, 160 g | 50 g | 31.3 |
| Kabuli Pulao | 1 cup, 180 g | **44 g** | 24.4 |
| **Biryani (Chicken/Mutton/Beef)** | 1 cup, 160 g, "incl. 85 g rice" | **27 g** | **16.9** |

The 44 g belongs to Kabuli Pulao. **Biryani is 27 g per 160 g cup = 16.9 g/100 g.**

*Internal coherence check:* the book's cup holds 85 g rice (53 % rice). 85 g of biryani rice at pulao-rice density (~24/100 g) ≈ 20 g, leaving ~7 g for 75 g of masala/meat/potato — a normal salan density. The number is self-consistent.

*Verdict:* **the book's figure sits inside the earlier 13–22 g/100 g spread**, essentially on CoFID takeaway (16.6) — a mid rice:meat pot. It neither replaces nor widens the range; it **anchors the middle** and it validates the earlier "don't know" default: 300 g plate × 16.9 = **51 g**, vs the earlier "assume 50 g and verify with the meter". The grid survives with the Pakistani anchor added:

| Which biryani is on your plate | CHO /100 g | Plate 300 g | Plate 400 g (degh/dawat) | Conf |
|---|---|---|---|---|
| Meat-heavy home biryani — meat in most bites | **13–17** [FNDDS 13.6; CoFID takeaway 16.6] | **41–50 g** | 54–66 g | **MED** |
| **Mid pot — rice just over half the plate** | **≈ 17** [**LFAC 16.9**, "incl. 85 g rice" per 160 g] | **≈ 51 g** | ≈ 68 g | **MED-HIGH** — the Pakistani anchor |
| Rice-heavy / degh / commercial | **20–22** [CoFID homemade 20.9; KHAN 21.9] | **60–66 g** | **80–88 g** | **MED** |
| + Potato (Sindhi usually; count the chunks) | — | **+8–16 g per chunk** (50–80 g × 15–20/100 g potato — see section 13) | same | **MED** |
| Don't know which pot this is | — | assume **50 g** and verify with the meter — now book-backed; honest spread per plate **40–90 g** | — | — |

**Tags: (a)** your plate weight — weigh one typical serving once; **(b)** which row today's pot is + potato count.

---

## 5. Lentils & legumes — Daal

Thin vs thick matters more than which daal: thin tarka daal **8–12/100 g**, thick **15–21/100 g** [CoFID; FNDDS 19.2; KHAN chana 14.9, mash 21.2]. **LFAC's daal rows all land inside this frame**: moong-masoor 14.6, khati daal 13.5, daal-chawal daal 12.8, daal gosht 9.4. Plain boiled [USDA-SR]: masoor 20.1, mung 19.2, mash 18.3, chickpeas 27.4, kidney 22.8, lobia 20.3.

| Food | CHO per katori (150 g) | Varies | Conf |
|---|---|---|---|
| Thin daal (patli/tarka) | **13–18 g** [CoFID; LFAC daal-chawal daal 12.8/100 g agrees] | (a) katori; (b) wetness | **MED-HIGH** — was MED |
| Thick daal (gaarhi) | **23–32 g** [FNDDS; CoFID; KHAN] | (a); (b) | **MED** |
| Chana daal | **22–27 g** [KHAN 14.9; CoFID 17.8] | (a); (b) small | **MED-HIGH** |
| Masoor daal | **16–29 g** [CoFID by thickness] | (a); (b) | **MED** |
| Moong daal | **11–29 g** [CoFID thin → USDA boiled]; **LFAC moong-masoor cup 185 g = 27 g (14.6/100 g)** pins the everyday mid | (a); (b) thickness | **MED-HIGH** — was MED |
| Mash daal | **13–32 g** [CoFID thin vs KHAN dry-style] | (a); (b) dryness | **MED-LOW** |
| Chanay / cholay | **28–41 g** [KHAN 19.2; USDA 27.4; **LFAC chanay ½ cup 54 g = 10 g → 18.5/100 g = KHAN to a decimal**] | (a); (b) gravy vs solid | **MED-HIGH** — was MED |
| **Khati daal (Memon)** | ½ cup 96 g = **13 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Daal gosht (Memon)** | cup 212 g = **20 g** [LFAC] (9.4/100 g) | (a); (b) | **MED** — NEW |
| **Shorwa/shorba (Pashtun)** | cup 245 g = **29 g** [LFAC] | (a); (b) | **MED** — NEW |
| Lobia | **20–30 g** [USDA 20.3; KHAN 13.1] — and see lobia chaat, section 7 | (a); (b) | **MED** |
| Rajma | **20–34 g** [USDA 22.8; KHAN 13.1; **LFAC ½ cup 90 g = 20 g → 22.2/100 g = USDA**] — the plain-beans end is now double-confirmed | (a); (b) gravy dilution | **MED-HIGH** — was MED |
| **Haleem** | bowl 250 g ≈ **35 g**; **LFAC cup 214 g = 30 g (14.0/100 g) vs KHAN 14.6 — two Pakistani sources agree to half a gram per 100** | (a) bowl; (b) wheat/barley share | **HIGH** — was MED-HIGH |

---

## 6. Salan / curries

Carbs come from onion masala, potato chunks, and thickeners (atta in nihari, besan in kadhi, daal in korma). All per katori 150 g unless stated; KHAN by-difference.

| Food | CHO per katori | Varies | Conf |
|---|---|---|---|
| Karahi, chicken/mutton | **4–17 g**, typical 6–12 [CoFID 2.5/100 g; KHAN 5.8–11.1; **LFAC cup 240 g = 10 g → 4.2/100 g, the low-mid end**] | (a); (b) gravy amount | **MED-HIGH** — was MED |
| Korma | **7–20 g** [CoFID 4.6 vs KHAN 13.2 — thickener decides] | (a); (b) thickener | **MED-LOW** — no LFAC row |
| **Nihari** | **CHANGED (widened down):** bowl 250 g ≈ **7–18 g** — LFAC cup 240 g = 7 g (2.9/100 g) vs KHAN 7.1/100 g. Not averaged: they are different pots — KHAN's a thick atta-laden degh, LFAC's a thinner one. The atta thickener is the whole variable; when the gravy coats the spoon, count the top end | (a) bowl; **(b) thickness — now demonstrably a 2.5× swing** | **MED** |
| Aloo gosht | **16–17 g** [KHAN 10.8/100 g; **LFAC cup 200 g = 23 g → 11.5/100 g — agreement within 6 %**]; +8–16 g per extra potato chunk | (a); (b) potato count | **MED-HIGH** — was MED |
| Aloo qeema | **12–18 g** [CALC] | (a); (b) potato | **MED-LOW** — no LFAC row |
| Qeema, plain | **10 g** [KHAN 6.9/100 g] | (a) | **MED** |
| **Aloo baingan** | LFAC ½ cup 138 g = **14 g** (10.1/100 g); katori ≈ **15 g** — the earlier baingan-with-potato 13.4 [CoFID] confirmed | (a); (b) potato share | **MED-HIGH** — was MED |
| **Aloo gobhi** | ½ cup 122 g = **16 g** [LFAC] (13.1/100 g); katori ≈ **20 g** | (a); (b) | **MED** — NEW |
| **Aloo ki bhujia** | ½ cup 122 g = **22 g** [LFAC] (18/100 g — potato-dominant, nearly a starch dish) | (a); (b) | **MED** — NEW |
| **Aloo palak** | ½ cup 118 g = **17 g** [LFAC] | (a); (b) | **MED** — NEW |
| Bhindi | **≈ 12–18 g** [KHAN 12.1 by-diff; CoFID 7.7–8.9] | (a); (b) small | **MED** |
| Palak / saag | **8–11 g** [KHAN 7.5; CoFID 5.0; **LFAC sarson ka saag 116 g = 6 g → 5.2/100 g = CoFID**] | (a) — reliably low | **HIGH** |
| **Palli saag (Sindhi)** | cup 104 g = **16 g** [LFAC] — heavier than plain saag (besan/peanut) | (a); (b) | **MED** — NEW |
| Baingan bharta | **13–20 g** [KHAN 8.6; CoFID 13.4; **LFAC ½ cup 118 g = 12 g → 10.2/100 g, mid**] | (a); (b) potato in or out | **MED-HIGH** — was MED |
| Mix sabzi | **14–17 g** [KHAN 11.0; CoFID 9.2] | (a); (b) | **MED** |
| Karela / qeema karela | **7–17 g** [CoFID 4.6 vs KHAN 11.6; **LFAC qeema karela ½ cup 124 g = 17 g → 13.7/100 g** — nearer KHAN] | (a); (b) | **MED** — was MED-LOW |
| **Kaddu gosht** | cup 235 g = **12 g** [LFAC] (5.1/100 g) | (a); (b) | **MED** — NEW |
| **Loki ki sabzi** | ½ cup 120 g = **7 g** [LFAC] (5.8/100 g) | (a); (b) | **MED** — NEW |
| Daal kadu (lauki + chana daal) | **21 g** [KHAN 13.8] | (a); (b) | **MED** |
| Kadhi (karhi pakora) | **15–30 g** [KHAN 10.3; SJSU; **LFAC ½ bowl 110 g = 18 g → 16.4/100 g, inside the band**] | (a); (b) pakora count | **MED-HIGH** — was MED |
| Koftay / kofta curry | **CHANGED (widened down):** **6–12 g** [KHAN 8.1/100 g vs **LFAC cup 200 g = 8 g → 4.0/100 g**] — binder share decides; not averaged | (a); (b) binder | **MED** |
| Chapli kabab | 100 g kabab ≈ **14 g** [KHAN 13.6 — maize binder] | (b) binder | **MED-HIGH** — no LFAC row |
| Shami kabab | **CHANGED:** LFAC 76 g kabab = **6 g** (7.9/100 g) vs the earlier CALC 7–10 g per 60 g (12–17/100 g). **LFAC recommended** — measured Pakistani piece beats our arithmetic; the CALC over-weighted the daal share. A 60 g kabab ≈ **5 g** | (b) daal share | **MED-HIGH** — was MED-LOW |
| Seekh kabab, tikka, grilled fish, anda | **0–4 g** [CoFID; USDA] | — protein anchors | **HIGH** |
| Fried fish, masala-coated | **7 g**/150 g [KHAN — coating only] | (b) coating | **MED-HIGH** |
| Kaleji | **15 g** [KHAN — masala] | (a); (b) | **MED** |
| **Mantu (Pashtun meat dumpling)** | per dumpling 36 g = **5 g** [LFAC] | (b) wrapper | **MED** — NEW |
| **Aushak (Pashtun chive dumpling)** | per dumpling 34 g = **8 g** [LFAC] | (b) | **MED** — NEW |
| **Pineapple chicken (Bohri "continental")** | cup 200 g = **30 g** [LFAC] — the sweet sauce is the carb | (b) sauce | **MED** — NEW |

---

## 7. Snacks & street food

| Food | CHO per portion | Varies | Conf |
|---|---|---|---|
| **Samosa, aloo** | large 100 g = **30 g** [**LFAC 100 g = 30 g**; FNDDS 33.1; CoFID 30.0 — three-source agreement]; cocktail 25 g ≈ 8 g | (a) size; (b) filling | **HIGH** — was MED |
| Samosa, qeema | 45 g = **8 g** [**LFAC 17.8/100 g**; CoFID 17–19 — agree] | (a); (b) | **MED-HIGH** — was MED |
| **Qeema kachori** | 126 g = **33 g** [LFAC] | (a); (b) | **MED** — NEW |
| Pakora | plate ~100 g ≈ **16–30 g** [FNDDS 16.2; CoFID 16.5–30; **LFAC aloo pakora 60 g = 15 g (25/100 g), onion pakora 50 g = 11 g (22/100 g) — both inside**] | (a) plate; (b) besan:vegetable + which vegetable | **MED-HIGH** — was MED |
| Bun kabab | **35–45 g** [CALC: bun 26 + patty 8–15 + chutney 2–4] — still no measured value; LFAC lacks it | (b) aloo vs shami patty | **LOW-MED** — unconfirmed by the Pakistani source |
| Chana chaat | **CHANGED:** LFAC ½ cup 130 g = **30 g** (23/100 g) vs v2 CALC 41 g/katori (27/100 g). **LFAC recommended** — measured plate vs our arithmetic; katori 150 g ≈ **35 g**, + meethi chutney ≈ +5–10 g | (a) katori; (b) potato + chutney | **MED-HIGH** — was MED |
| **Lobia chaat** | cup 117 g = **22 g** [LFAC] (18.8/100 g ≈ USDA lobia 20.3 — coherent) | (a); (b) | **MED** — NEW |
| **Cream chaat** | ½ serving 100 g = **30 g** [LFAC] — the cream + sweetener is half the number | (a); (b) recipe | **MED** — NEW |
| Fruit chaat | cup ≈ **20–30 g** [CALC] | (a); (b) fruit mix + sugar | **MED-LOW** — no LFAC row |
| Dahi bhalay | **CHANGED (portion honesty):** LFAC 1 cup 220 g = **35 g** vs the earlier plate ≈ 25 g [SJSU+CALC]. Same food, bigger real serving — a thela plate with chutney is the LFAC number | (a) serving; (b) sweet dahi + chutney | **MED-HIGH** — was MED-LOW |
| Gol gappay | **CHANGED:** LFAC 4 pieces w/ chana filling, 32 g = **19 g** (≈ 4.8 g per filled puri) vs the earlier 6 puris ≈ 15 g [SJSU, shells only]. **LFAC recommended** — filled puris are the real unit; 6 filled ≈ **28 g**, + meetha pani **+5–10 g** [CALC] | (a) count; (b) filling + sweet water | **MED** — was MED-LOW |
| **Bhutta (corn on the cob)** | 1 cob 195 g = **22 g** [LFAC — weight includes the cob] | (a) cob size | **MED** — NEW |
| French fries | street cone ~100 g ≈ **19–23 g** [FNDDS]; franchise medium ≈ **48 g** [FNDDS] | (a) street vs franchise | **MED** |
| Spring roll / chicken roll patti | 64 g ≈ **17–19 g** [FNDDS] | (b) wrapper | **MED** |
| **Kabab paratha roll** | 1 roll 183 g = **71 g** [LFAC] — *the roll is a paratha delivery vehicle; among the highest single-item snacks in this table* | (a) roll size; (b) paratha share | **MED** — NEW, high-volume Karachi food |
| Sandwich / **club sandwich** | **25–30 g** [CALC 28–30; **LFAC club sandwich 120 g = 25 g** — agree] | (a) bread brand | **MED-HIGH** — was MED |
| **Chicken patties (bakery)** | 1 piece 60 g = **13 g** [LFAC] | (a) bakery size | **MED** — NEW |
| Nimco / namkeen | ½ cup 40 g ≈ **14 g** [CoFID chevda 35.5/100 g] | (b) mix | **MED** |
| **Namak paray** | 10 pieces 18 g = **6 g** [LFAC] — *flag: 33/100 g reads low for fried maida (expect ~50–60); oil uptake may explain it; treat as the floor* | (b) | **LOW-MED** — NEW, flagged |
| Papar (papad) | fried 13 g ≈ **4–8 g** [CoFID 28.3/100 g fried; SJSU]. **LFAC's papar row (15 g = 15 g carbs) fails arithmetic — carbs cannot equal total weight in a ~10 % moisture fried food — printed error, excluded** (see section 16) | (b) size | **MED** — v2 value kept |
| **Boondi raita chaat (Bohri)** | ½ cup 122 g = **7 g** [LFAC] | (b) | **MED** — NEW |
| **Bajra fritters (Memon)** | 3 pieces 36 g = **12 g** [LFAC] | (b) | **MED** — NEW |
| **Dhokray (Memon)** | 1 piece 60 g = **16 g** [LFAC] | (b) | **MED** — NEW |
| **Khow suey (Memon)** | 1 cup noodles + ½ cup curry, 300 g = **34 g** [LFAC, without chips/papdi — toppings add] | (a); (b) toppings | **MED** — NEW |
| **Lasan (Memon, bajra roti + raita)** | 1 rofi + ½ cup raita, 105 g = **46 g** [LFAC — the 55 g bajra rofi alone is 38 g; same high-bajra-density flag as section 3.2] | (a); (b) | **LOW-MED** — NEW, flagged |
| **Malida** | cup 100 g = **36 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Bohra lasanyo / chicken lasagna** | 1 piece 106 g = **18 g** [LFAC] | (a); (b) | **MED** — NEW |
| Popcorn | 24 g popped ≈ **14 g** [CoFID] | (a) cup | **HIGH** |
| Tea biscuits | 1 Sooper = **4.4 g** [LABEL]; digestive 15 g ≈ 10 g [CoFID] | (a) brand | **MED-HIGH** |
| Crisps packet | 27 g packet ≈ **13–14 g** [USDA; SJSU] | — labelled | **HIGH** |

---

## 8. Sweets (Mithai) & desserts

Mithai = **(a)** your sweet shop's piece weight (weigh one box once) + **(b)** syrup/khoya richness of this batch. LFAC pieces below are photographed single sweets — use them as the default piece.

| Food | CHO per portion | Varies | Conf |
|---|---|---|---|
| Gulab jamun | 1 piece 36 g = **15 g** [**LFAC**, 41.7/100 g; CoFID 43.3–49.9 with more syrup — consistent]; a syrup-drenched 50 g piece ≈ **22–25 g** | (a) piece; (b) syrup soaked | **HIGH** density — was MED-HIGH |
| **Jalebi** | **CLOSED — was the oldest (c) in the file:** LFAC "Jalebi (without sheera)": 1 piece 41 g = **23 g** (**56/100 g**). Tracker guesses (60–75/100 g) ran slightly high. With extra sheera poured on, add **+5–10 g** [CALC]. the earlier "medium 25–30 g ≈ 15–22 g" becomes **≈ 14–17 g per 25–30 g piece** at book density | (a) piece; (b) sheera — shop-to-shop sucrose spread is real [LIT khoa-jalebi] | **MED** — single Pakistani patient-facing source; was LOW/(c) |
| Barfi | 1 piece 40 g = **16 g** [**LFAC 40/100 g**; FNDDS 40.5 — exact agreement] | (a) piece; (b) type, small | **HIGH** — was MED-HIGH |
| Laddu (besan/motichoor) | small ~40 g ≈ **25–30 g** [SJSU; WEAK] | (a); (b) | **MED-LOW** — no LFAC row |
| Rasgulla | 1 medium ≈ **15 g** [SJSU] | (b) syrup drunk or left | **MED-LOW** — no LFAC row |
| Ras malai | 1½ pc + ½ cup milk syrup, 117 g = **16 g** [**LFAC**; the earlier 15–20 confirmed] | (b) ras amount | **MED-HIGH** — was MED-LOW |
| Sewaiyan | **CHANGED (split by preparation):** boiled without milk, ½ bowl 56 g = **18 g** [LFAC, 32/100 g]; milky/CoFID-style **20 g/100 g** → katori of milk sewaiyan ≈ **30 g**; **Sindhi sayun (dry, ghee + sugar) ½ cup 68 g = 42 g** [LFAC, 62/100 g] — three real preparations, three densities, do not blend | (a) katori; (b) **which preparation — now the named variable** | **MED-HIGH** |
| Sheer khurma | **CHANGED (raised):** LFAC ¾ cup 125 g = **46 g** (36.8/100 g) vs v2 CALC 35–45/katori (23–30/100 g). **LFAC recommended**; katori 150 g ≈ **55 g** — Eid sheer khurma is nearly rice-kheer-plus-dates rich | (a) katori; (b) Eid richness | **MED** — was LOW-MED |
| Sooji ka halwa | **the 2× spread is now book-internal fact, not source noise:** LFAC prints it at *both* densities — breakfast halwa (with puri) ¼ cup 88 g = **23 g** (26/100 g) and dessert suji halwa ¼ cup 88 g = **43 g** (49/100 g = CoFID 49.1). Sugar:sooji ratio is the whole story; halwa-puri-shop halwa sits at the low end, dawat halwa at the top | (a) serving; (b) sugar load — a genuine 2× | **MED-HIGH** for the range — was MED |
| Gajar ka halwa | ½ cup 102 g = **44 g** [**LFAC 43.1/100 g**; CoFID 44 — exact agreement]. the earlier "2 heaped Tbsp ≈ 14–22 g" stands for small servings | (a); (b) khoya/sugar | **HIGH** density — was MED |
| **Sohan halwa** | **CHANGED:** LFAC 1 piece 50 g = **20 g** (40/100 g) vs Hafiz's own estimate 55–60/100 g [LABEL-EST]. Not averaged. **LFAC recommended as the dosing default** — dietitian-compiled for T1D vs a marketing approximation — but the Hafiz figure is energy-consistent with PK-FCT's 481 kcal lab value, so a ghee-light Multani sohan may truly run 55–60. Range **40–60/100 g**; a 25 g piece ≈ **10–15 g** | (a) piece; (b) ghee/nut share | **MED-LOW** — was LOW-MED; dose cautiously, verify with meter |
| Habshi / Karachi halwa | **still no credible value** [LFAC lacks it] — expect very high | (c) | **—** see section 16 |
| **Petha halwa** | ½ cup 114 g = **28 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Daal halwa** | ½ cup 113 g = **33 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Malpua** | 1 piece 46 g = **20 g** [LFAC] | (a); (b) syrup | **MED** — NEW |
| **Rabri** | ½ cup 124 g = **40 g** [LFAC] (32/100 g) | (a); (b) | **MED** — NEW |
| **Pinni** | 1 piece 38 g = **15 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Kaju katli** | 1 piece 9 g = **5 g** [LFAC] | (a) | **MED** — NEW |
| **Double ka meetha / shahi tukray** | 1 piece 88 g (with 2 Tbsp milk sauce) = **25 g** [LFAC] | (a); (b) syrup | **MED** — NEW |
| **Lab-e-shireen** | 1 cup 243 g = **51 g** [LFAC] | (a); (b) | **MED** — NEW |
| **Gur papri** | 4 pieces 76 g = **57 g** [LFAC] (75/100 g — coherent with gur at 95–98, section 8 below) | (a); (b) | **MED** — NEW |
| Kulfi | **CHANGED (raised):** LFAC 1 kulfi 74 g = **18 g** (24.3/100 g) vs CoFID UK-recipe floor 13.8. **LFAC recommended** — Pakistani khoya/condensed-milk kulfi is the dense one; the earlier 11–20 band becomes **15–20 g per typical kulfi** | (a) size; (b) recipe | **MED-HIGH** — was MED-LOW |
| Ice cream, vanilla | scoop 66 g ≈ **16 g** [USDA-SR] | (a) scoop | **HIGH** |
| Custard | katori ≈ **24 g** [CoFID] | (a) | **HIGH** |
| Jelly | 120 g ≈ **18 g** [CoFID] | (a) | **HIGH** |
| Falooda | **CLOSED (was component-CALC only):** LFAC 1 cup 248 g = **56 g** (22.6/100 g). the earlier CALC (50–60 per 300 ml) was on target; a large 300 ml glass ≈ **68 g** [scaled from LFAC] | (a) glass; (b) shop recipe | **MED-HIGH** — was LOW |
| Kheer — moved to section 4 (rice) with the changed value | | | |
| Sugar (cheeni) | 1 tsp level = **4.2 g**; heaped ≈ 6 g; 1 Tbsp = 12.5 g [USDA-SR] | (a) your spoon | **HIGH** |
| Gur (jaggery) | **95–98 g/100 g** [NIN lineage]; 15 g lump ≈ **14 g**. LFAC's gur papri (75/100 g with flour+ghee) is coherent with it | (b) moisture | **MED-HIGH** |
| Honey | 1 Tbsp 21 g = **17 g** [USDA-SR] | — | **HIGH** |
| Jam / murabba | 1 Tbsp ≈ **14–15 g** [USDA] | — | **HIGH** |

---

## 9. Drinks — with the chai grid

### 9.1 Chai — most users' largest daily carbohydrate line, as a grid

Components [CALC, each HIGH]: milk lactose ≈ **5 g/100 ml** [USDA-SR]; sugar **4.2 g per level tsp** [USDA]. Regular chai ≈ half milk; doodh patti all milk. Tea itself is 0.

**The grid is now Pakistani-source-verified at two cells:** LFAC "Tea/coffee, 100 ml milk, 1 tsp sugar, 200 ml cup" = **10 g** (grid says 9); LFAC "Doodh patti, 230 ml, unsweetened" = **10 g** (grid interpolates 11–12 — LFAC's patti carries some water). Agreement within 1–2 g; the grid stands. [LFAC]

**Regular chai (aadhi doodh wali) — grams CHO per cup:**

| Cup size ↓ · sugar → | 0 tsp | 1 tsp | 2 tsp | 3 tsp |
|---|---|---|---|---|
| **150 ml** (Pakistani chai cup) | 4 | 8 | **12** | 16 |
| **200 ml** (standard mug) | 5 | 9 | **13** | 18 |
| **250 ml** (large mug) | 6 | 11 | **15** | 19 |

**Doodh patti (all milk) — grams CHO per cup:**

| Cup size ↓ · sugar → | 0 tsp | 1 tsp | 2 tsp | 3 tsp |
|---|---|---|---|---|
| **150 ml** | 8 | 12 | **16** | 20 |
| **200 ml** | 10 | 15 | **19** | 23 |
| **250 ml** | 13 | 17 | **21** | 26 |

**Tags:** cup size = **(a)** measure once with water; sugar habit = **(a)** count and weigh the spoon (heaped chamach ≈ 6 g). **Bought chai = (b):** dhaba pre-sweetens; condensed milk ("tar wali") +10 g per Tbsp [USDA-SR]; hotel chai +5–10 g band. **Kashmiri chai (pink, sweet, milky): 1 glass 235 ml = 26 g [LFAC] — a full meal's-worth more than plain chai; NEW row.** Confidence **HIGH** for home chai once (a) is set (was MED-HIGH); **MED-LOW** for dhaba chai.

### 9.2 Other drinks

| Drink | CHO per serving | Varies | Conf |
|---|---|---|---|
| Green tea / qahwa | ~0; **+4.2 g per tsp sugar** [CoFID]; **LFAC leemu pani w/ 1 tsp = 8 g per 250 ml** brackets a heaped-spoon reality | (a) sugar habit | **HIGH** |
| Milk, glass 250 ml | cow **11.6–12 g**; buffalo **13 g** [USDA-SR] | (a) glass | **HIGH** |
| Sweet lassi (meethi) | **LFAC (2 tsp sugar): 235 ml = 24 g**; CoFID recipe → glass ≈ 31–32 g. Not averaged: LFAC is the lighter home recipe, CoFID/bazaar lassi the sweeter — **24–32 g per glass**, shop lassi at the top | (a) glass; (b) shop's sugar | **MED-HIGH** — was MED-HIGH/MED-LOW split, band now source-anchored at both ends |
| Namkeen lassi (chaas) | glass ≈ **4–6 g** [CALC; **LFAC 200 ml = 5 g** — dead centre] | (a) | **HIGH** — was MED |
| Mango shake / lassi | **LFAC (no added sugar): ½ mango + 200 ml milk = 25 g**; with the usual 2 tsp sugar **≈ 33–40 g** [v2 CALC] — LFAC pins the unsweetened floor | (a) glass; (b) sugar + mango | **MED-HIGH** — was MED-LOW |
| **Banana milkshake** | 1 small banana + 200 ml milk = **25 g** [LFAC] | (a); (b) sugar | **MED-HIGH** — NEW |
| **Doodh soda** | ½ milk + ½ Sprite/7-Up, 240 ml = **22 g** [LFAC] | (a) ratio | **MED** — NEW |
| **Leemu pani (1 tsp sugar)** | 250 ml = **8 g** [LFAC] | (a) sugar | **MED-HIGH** — NEW |
| Rooh Afza | syrup ≈ **22–23 g per 30 ml** [LABEL mirrors]; **LFAC: 2 tsp in water = 15 g / in milk = 25 g** — implying their "tsp" pours ≈ 10 ml, i.e. a real-world sharbat spoon; the earlier 15–23 g per glass band confirmed | (a) your pour — measure once; (b) at someone else's house | **MED-HIGH** — was MED-LOW |
| Sugarcane juice | glass ≈ **25–27 g** [LIT+trackers] | (a); (b) dilution | **MED-LOW** — no LFAC row |
| Fresh juice (kinnow/orange) | glass 250 ml ≈ **21–26 g** [USDA 10.4/100 ml; **LFAC "fruit juice fresh" 180 ml = 15 g → 8.3/100 ml**] — band widened down slightly | (a) glass | **HIGH** |
| Apple juice | glass ≈ **28 g** [USDA-SR] | (a) | **HIGH** |
| Soft drink | 250 ml ≈ **26 g**; 300 ml ≈ **31 g**; 500 ml ≈ **52 g** [USDA; CoFID] | (a) bottle — printed on it | **HIGH** |
| **Sattu drink** | 1 Tbsp sugar + 2 Tbsp sattu = **22 g** [LFAC; component CALC gives 25 — coherent] | (a) spoons | **MED** — NEW |
| **Saffron milk (Bohri)** | cup 220 ml = **15 g** [LFAC] | (a) | **MED** — NEW |
| Diet drinks, water, unsweetened chai/coffee | ~0 | — | **HIGH** |
| Flavoured milk (chocolate) | 250 ml ≈ **26 g** [FNDDS] | — labelled | **HIGH** |

---

## 10. Fruits

LFAC's fruit pages are international "≈ 15 g" anchors (some weights include peel/inedible portions), so the earlier USDA/CoFID rows remain primary; LFAC cross-checks are noted where they add signal.

| Fruit | CHO per portion | Varies | Conf |
|---|---|---|---|
| Khajoor, dried/semi-dry | large 24 g = **18 g**; small aseel 7–10 g ≈ **5–7 g** [USDA 75/100 g; CoFID; **LFAC: 4 dates 20 g = 15 g → 75/100 g — exact agreement**] | (a) which dates your house buys | **HIGH** |
| Fresh dates (doka) | 5 ≈ **16 g** [CoFID raw] | (a) | **MED** |
| Aam (chaunsa/sindhri/anwar ratol) | ½ cup slices ≈ **12–15 g** [USDA 15.0–17.4; CoFID 10.7; **LFAC ½ cup 120 g = 15 g → 12.5/100 g**]; whole medium (200 g flesh) ≈ **30–35 g** — count a whole mango as ≥ 30 g | (a) how you cut it; (b) variety/ripeness | **MED-HIGH** |
| Kela (banana) | small 80–100 g flesh ≈ **18–23 g** [USDA 22.8/100 g] (LFAC's "130 g small = 15 g" weighs the peel — ignore for dosing) | (a) size | **HIGH** |
| Amrood (guava) | medium 120 g ≈ **6–17 g** [USDA 14.3 vs CoFID 5.0 — unresolved, range shown] | (b) variety; (c)-ish conflict | **MED-LOW** |
| Chikoo | 1 fruit 170 g ≈ **34 g** [USDA 20/100 g] — a sugar bomb that looks innocent | (a) size | **HIGH** |
| Tarbooz (watermelon) | cup ≈ **11.5 g**; wedge 300 g ≈ 23 g [USDA 7.55/100 g; **LFAC 220 g = 15 g → 6.8 — agree**] | (a) | **HIGH** |
| Kharbooza / sarda / garma | cup ≈ **9–13 g** [USDA; CoFID] | (a) | **HIGH** |
| Papita (papaya) | cup ≈ **14–16 g** [USDA; CoFID] | (a) | **HIGH** |
| Jamun | katori ~100 g ≈ **15.5 g** [USDA-SR] | (a); single source | **MED** |
| Kinnow / malta / santra | 1 medium ≈ **12 g** [USDA tangerine] | (a) | **HIGH** |
| Saib (apple) | small 150 g ≈ **20 g** [USDA; **LFAC 135 g small = 15 g — agree**] | (a) | **HIGH** |
| Angoor (grapes) | 15 grapes ≈ **13.5 g** [USDA 18.1/100 g; LFAC's 20 small = 15 g runs lower — count grapes, verify with meter if a heavy eater] | (a) count them | **HIGH** |
| Anaar (pomegranate) | ½ cup arils ≈ **16 g** [USDA; **LFAC ½ cup 130 g = 15 g — agree**] | (a) | **HIGH** |
| Aaroo (peach) | 1 large ≈ **15 g** [USDA] | (a) | **HIGH** |
| Falsa | 1 katori whole ≈ **5–10 g available CHO** [LIT review ranges] | (b) ripeness; residual (c) | **MED-LOW** — no LFAC row |

---

## 11. Dairy

| Food | CHO per portion | Varies | Conf |
|---|---|---|---|
| Doodh — see Drinks | 250 ml ≈ **12–13 g** [USDA-SR] | (a) glass | **HIGH** |
| Dahi, plain | katori ≈ **7–12 g** [USDA; CoFID]; sweetened: add per tsp | (a); (b) if sweetened | **HIGH** |
| Raita | katori ≈ **5–8 g** [CALC; **LFAC boondi raita chaat 122 g = 7 g corroborates**] | (a) | **MED-HIGH** — was MED |
| Milk powder (Nido) | 4 Tbsp nonfat 23 g ≈ **12 g** [USDA] | (a) spoon | **HIGH** |
| Condensed milk, sweetened | 1 Tbsp 19 g ≈ **10 g** [USDA-SR] | — | **HIGH** |
| Evaporated milk | ½ cup ≈ **13 g** [USDA] | — | **HIGH** |
| Paneer / cheese | **1–3 g** [USDA] | — | **HIGH** |
| Khoya (khoa/mawa) | **20–29 g/100 g** (lactose) [LIT dairy-science]; 100 g ≈ **20–25 g**; 50 g mithai portion ≈ 10–12 g | (b) moisture/milk type | **MED** — no LFAC row |

---

## 12. Ramadan quick sheet

| Item | CHO | Tags |
|---|---|---|
| 3 small khajoor at iftar | ≈ **15 g** [USDA; SJSU; IDF-DAR; LFAC dates agree] | (a) date size |
| Iftar pakora plate ~100 g | **16–30 g** [FNDDS/CoFID/LFAC] | (a) plate; (b) mix |
| 1 large aloo samosa | **30 g** [LFAC = CoFID] | (a) size |
| 1 cup fruit chaat | **20–30 g** | (b) mix |
| 1 glass Rooh Afza | **15–23 g** [LABEL; LFAC 15 g at a 2-tsp pour] | (a) pour |
| Dahi bhallay, full cup | ≈ **35 g** [LFAC] — was 25 g; the real serving is bigger | (b) chutney |
| 1 bowl haleem 250 g | **≈ 35 g** [KHAN+LFAC agree] | (a) bowl |
| 1 jalebi 41 g (no extra sheera) | **≈ 23 g** [LFAC] — was a (c) unknown, now MED | (b) sheera |
| Sehri: home paratha + doodh patti (200 ml, 2 tsp) + omelette | ≈ **60–66 g** [CALC from LFAC-confirmed rows] | (a) paratha + cup |
| 1 katori sheer khurma (Eid) | **≈ 55 g** [LFAC density] — was 35–45; raised | (b) recipe |

---

## 13. How to estimate something not on this list

Carbs live in five visible carriers — grain (rice/atta/maida), potato, sugar/syrup, milk, and besan/binder. Meat, eggs, oil, ghee, leafy vegetables are ~0. Estimate carrier by carrier:

| If you can see… | Count |
|---|---|
| Cooked rice, any style | **~28 g per cup-sized fist**, ~4 g per heaped tablespoon [USDA]; biryani/pulao rice runs 17–24/100 g (oil + meat dilute) [LFAC/CoFID/KHAN] |
| Any flatbread | **weight × 0.46 (atta) / × 0.50 (maida)** [FNDDS; LFAC breads confirm both] — or match to a section 3 row by size |
| Potato chunks | **+8–16 g per gol chunk** (50–80 g × 15–20 g/100 g) [USDA 20.1 boiled; LFAC potato rows imply ~15] — *lower bound widened in v3* |
| Thin salan/gravy, any meat | **5–10 g per katori** [KHAN/CoFID/LFAC pattern] |
| Thick/thickened gravy (besan, atta, daal, fried onion) | **10–20 g per katori** [KHAN korma/kadhi pattern] |
| Syrup-soaked sweet | **≈ half its weight is carbohydrate** (40–56/100 g across gulab jamun→jalebi [LFAC]) |
| Milk in anything | **5 g per 100 ml** before sugar [USDA] |
| Added sugar | **4.2 g per level tsp, ~6 g heaped, 12.5 g per Tbsp**; condensed milk 10 g/Tbsp [USDA] |
| Besan coating / fried batter | **+5–15 g per plate** [CoFID/LFAC pakora pattern] |

**Method:** (1) name the carriers; (2) size each against an anchor; (3) add; (4) eating out, add +10–20 %; (5) check the 2-hour meter reading and correct the stored estimate — the meter is the final source.

**Worked examples** (unchanged in method from v2, totals refreshed): kat-a-kat + two 120 g naans ≈ **125–128 g** — *in meat-dish meals the bread is the dose, not the dish*; shaadi plate (qorma + naan + zarda katori + cold drink) ≈ **123–128 g**; thela chana chaat + potato + chutney ≈ **45–60 g** [LFAC-adjusted] — street chaat is a full meal's carbs.

---

## 14. Combination meals as eaten — the totals people actually type in

Pre-added totals [CALC from rows above; tags inherited]. LFAC's own composites (marked) now anchor two of them.

| Meal as ordered/served | Total CHO | Biggest lever |
|---|---|---|
| **Biryani plate (mid pot, 300 g) + raita** | **≈ 55–60 g** [LFAC-anchored 51 + raita 5–8] | (a) plate weight; (b) potato chunks +8–16 each |
| Biryani plate (degh/commercial, 300 g) + raita | **65–75 g** | (b) which pot |
| Biryani plate (meat-heavy home, 300 g) + raita | **46–58 g** | (b) which pot |
| **Nihari + 2 tandoor naan (120 g)** | **127–138 g** — the naans are ~87 % of it; with 1 naan **67–78 g** (nihari itself now 7–18) | (a) naan tier |
| **Daal chawal (1 cup rice + 1 cup daal)** | **75 g** [**LFAC's own composite**; v2 said 65–75] | (a) rice serving |
| **Halwa puri nashta (1 puri + halwa + chanay)** | **61 g** [**LFAC's own composite**: puri 28 + halwa 23 + chanay 10]; with 2 puris **≈ 89 g** | (b) puri count + halwa richness |
| Sehri: paratha + omelette + doodh patti (200 ml, 2 tsp) | **60–66 g** | (a) paratha size |
| Haleem bowl + ½ naan | **65–68 g** | (a) bowl |
| Qorma + 1 naan (120 g) — dawat serving | **67–80 g** | (a) naan tier |
| Bun kabab + 300 ml soft drink | **66–76 g** | (b) aloo vs shami patty |
| **Kabab paratha roll + 300 ml soft drink** | **≈ 102 g** [LFAC roll 71 + 31] | (a) roll size |
| Chai (150 ml, 2 tsp) + 2 Sooper | **≈ 21 g** | (a) cup + spoons |
| Chai (150 ml, 2 tsp) + 1 cake rusk | **≈ 23 g** | (a) |

---

## 15. What one user measurement buys — calibration priority for the app

Ranked by (how often eaten) × (grams of uncertainty removed) × (stability of the answer):

1. **Weigh one home roti** → sets every roti row via weight × 0.46. Collapses a 12→46 g/piece spread. The single highest-value measurement in the system.
2. **Chai: measure the cup + count and weigh the sugar spoon** → sets the daily chai line; collapses an 8→26 g/cup spread and the level-vs-heaped bias.
3. **Measure the katori** → rescales ~25 rows at once.
4. **Weigh one typical biryani/rice plate serving** → collapses the 40→90 g plate spread.
5. **Weigh one home paratha** → sehri staple; 20→46 g spread.
6. **Identify the tandoor naan tier** (price, or one weighing) → 60/75/90 g per naan.
7. **Weigh one piece per mithai type from the usual sweet shop** — *and the sheermal/kulcha specifically*: LFAC's pieces run 202–257 g where v2 assumed 100–120; nowhere does piece weight move the dose more.
8. **Weigh one serving-spoon of rice** → count spoonfuls instead of plate fractions.
9. **Measure the house glass** → lassi, sharbat, juice, milk rows.
10. **Measure the Rooh Afza pour** → 15→25 g per glass.

---

## 16. Still unknown — and what was already tried, so nobody repeats it

**Closed in v3 by the LFAC book:** **jalebi** (41 g piece = 23 g, 56/100 g, without sheera — section 8), **sheermal** (257 g large = 167 g, 65/100 g — section 3.1), **falooda** (248 g cup = 56 g — section 8), **tandoor kulcha density** (kulcha naan 202 g = 100 g confirms the ×0.50 assumption — section 3.1), **halwa-puri plate** (book composite 61 g — section 14). Closed in v2 and untouched: taftan, sohan halwa (now revised, section 8), gur, khoya, falsa.

**Still open (c):**

1. **Zarda** — LFAC does not list it (checked every glossary cuisine). Stays FNDDS-honey-rice proxy + tracker bracket, LOW-MED. Fix: one lab analysis; recipe sugar load is the whole question.
2. **Peshawari/bakery chai kulcha** — LFAC's "Kulcha Naan" is the tandoor bread, not the dry roundel. Rusk proxy only. Fix: weigh + lab one bakery kulcha.
3. **Habshi / Karachi halwa** — nothing anywhere, LFAC included. Expect very high. Stays out of the table.
4. **Bun kabab** — still component arithmetic; LFAC lacks it (its club sandwich 25 g supports the bread math). Stays LOW-MED.
5. **Jalebi with sheera** — the closed row is "without sheera"; the poured-syrup increment (+5–10 g) is our CALC.
6. **Khamiri roti piece weight** — density solved (atta anchor), piece spread 100–200 g unresolved; weigh once.
7. **Full PK-FCT 2001 carbohydrate columns** — still only the energy extract retrievable (standing ask from v1).
8. **Guava source conflict** (USDA 14.3 vs CoFID 5.0) — unresolved; range shown.
9. **NEW — LFAC internal issues found during extraction, so nobody re-imports them as fact:** (i) **Papar 15 g = 15 g carbs** — carbohydrate equals total weight; physically impossible for a fried ~10 %-moisture food; printed error, excluded (the earlier CoFID row kept). (ii) **Sooji halwa appears at two densities** (26 vs 49/100 g) — treated as real recipe spread, not error. (iii) **Bajra/makkai roti at 62–64/100 g** — above plausible fresh-roti density; retained but flagged LOW-MED. (iv) **Tandoori roti "medium" = 33 g** vs Karachi official 100 g — a home-size roti, not the Karachi tandoor piece; both kept with the (a) tag. (v) **Taryal patata 178 g = 20 g** (11 g/100 g) — reads low against USDA potato 20 g/100 g; retained as printed, flagged.
10. **Rows still unconfirmed by any Pakistani source** (kept from v2, watch for local data): korma, laddu, rasgulla, bhindi, aloo qeema, chapli kabab, taftan, roghni naan, khamiri, nimco, fruit chaat, sugarcane juice, falsa, khoya, habshi, zarda, bun kabab, guava.

---

## 17. Sources & weighting

Unchanged from v2 (full citations there): **[KHAN]** Khan I et al., Progress in Nutrition 2019;21(2):421–429 — Pakistani AOAC lab analysis of 30 cooked dishes (by difference) · **[USDA-SR]/[FNDDS]** USDA FoodData Central SR-Legacy 2018 / FNDDS 2019–2020 · **[CoFID]** McCance & Widdowson 2021 · **[SJSU]** Wagle et al. carb-counting handout · **[IDF-DAR]** IDF-DAR Practical Guidelines 2021 · **[KHI-OFFICIAL]** Commissioner Karachi tandoor rate notifications 2024–May 2026 · **[PK-FCT]** Pakistan FCT 2001 energy extract via PLOS ONE 10.1371/journal.pone.0185466 · plus the v2 [LIT]/[NIN]/[LABEL] additions (taftoon, khoa, phalsa, khoa-jalebi, gur, Dawn paratha, Sufi/Dawn roghni naan, Hafiz sohan halwa).

**New in v3 — [LFAC]:** *Healthy eating and carbohydrate counting for children and adults with type 1 diabetes — Pakistani Foods, Edition 1, 2024.* Life for a Child (Diabetes Australia) with ISPAD. Project consultant Salma Mehar RD; project leads Dr. Sana Ajmal (Meethi Zindagi) and Prof. Dr. Asher Fawwad (Baqai Medical University / BIDE); authors Sheryl Salis, Anna Pham-Short, Carmel Smart, Cecile Eigenmann, Graham Ogle. https://lifeforachild.org/wp-content/uploads/2024/08/Carb-Counting-Book_Pakistan-v4c.pdf

*Extraction provenance:* 56-page PDF; naive `pdftotext` interleaved photo-page columns (the source of the false biryani-44 g reading), so pages were re-extracted with `pdftotext -layout` and **all 11 Pakistani photo pages (24–34) were additionally rendered to images and read visually — every retained number matched both extractions.** 135 Pakistani rows recovered (74 photo cards including 2 in-book duplicates + 61 single-column glossary rows across Karachi, Sindhi, Punjabi, Pashtun, Saraiki, Memon and Bohri cuisines); ~89 international "≈ 15 g anchor" rows used only as cross-checks; 1 row rejected on arithmetic (papar, section 16.9). Every retained row passes carbohydrate < portion weight and a g/100 g plausibility check.

*Ranking:* for Pakistani prepared dishes, **[LFAC] outranks every prior source** — it is Pakistani, Type 1-specific, patient-facing, and produced by the institution (BIDE) v2 could only cite indirectly — subject to its own caveat that values are estimates. Lab analyses ([KHAN], CoFID, USDA) still rank above it for single-ingredient foods and for by-difference cross-checks; where LFAC and a lab agree (haleem, saag, rajma, barfi, gajar halwa, suji halwa, samosa), that agreement is the strongest signal in this file.

**Carbs & Cals World Foods** (its photos appear in the LFAC book itself) remains the best print cross-check to hand to users.

---

## 18. Every value that changed from v2 — and why

Confidence-only upgrades (~30 rows, marked "was MED" etc. inline above) are not repeated here. **Value or range changes (22):**

| # | Food | v2 said | v3 says | Why |
|---|---|---|---|---|
| 1 | **Kheer** | katori ≈ 28 g "floor" (CoFID/FNDDS 18.4–18.9/100 g) | katori ≈ **47 g** (LFAC 31.4/100 g); band 19–31/100 g | LFAC measured the Pakistani preparation; v2 itself warned its figure was a floor. Largest per-portion dessert change (+19 g/katori) |
| 2 | **Sheermal** | assumed 50–65 g per 100–120 g piece (naan density, LOW) | **167 g per 257 g large piece** (65/100 g), ×0.65 rule | Closed (c) → measured; the earlier density assumption was ~20 % low and its piece weight less than half real. Largest single per-piece change in v3 (+~100 g if you eat a whole one) |
| 3 | **Tehari → aloo tahiri** | cup ≈ 31 g (FNDDS 17.9/100 g) | cup 166 g = **50 g** (LFAC 30.1/100 g) | +68 % — the largest per-100 g change. FNDDS's "vegetable biryani" is a different, wetter dish; LFAC's is the Pakistani rice+potato one |
| 4 | **Pulao anchor** | 22–24/100 g | **18–24/100 g** | LFAC meat pulao 18.1/100 g — meat share dilutes below the lab recipes; band widened down |
| 5 | **Plain rice, plate** | 80–90 g/300 g | **84–94 g** | LFAC 31.3/100 g sits at the top of the lab band |
| 6 | **Nihari** | bowl ≈ 18 g (KHAN only) | **7–18 g** per bowl | LFAC 2.9/100 g vs KHAN 7.1 — thickness is a real 2.5× swing; range, not average |
| 7 | **Kofta curry** | ≈ 12 g/1.5 katori (KHAN) | **6–12 g** | LFAC 4.0/100 g vs KHAN 8.1; binder share decides |
| 8 | **Shami kabab** | 7–10 g per 60 g (CALC) | **6 g per 76 g** (LFAC); 60 g ≈ 5 g | Measured Pakistani piece beats our arithmetic, which over-weighted the daal |
| 9 | **Chana chaat** | katori ≈ 41 g (CALC) | katori ≈ **35 g** (LFAC 23/100 g) | Measured plate vs component arithmetic |
| 10 | **Dahi bhallay** | plate ≈ 25 g | cup 220 g = **35 g** (LFAC) | Real serving is bigger than the earlier SJSU-derived plate |
| 11 | **Gol gappay** | 6 shells ≈ 15 g + pani | 4 filled = **19 g**; 6 filled ≈ 28 g + pani | LFAC counts filled puris — the real street unit |
| 12 | **Jalebi** | (c) unknown; trackers 60–75/100 g | **23 g per 41 g piece** (56/100 g, no sheera) | Closed by LFAC; trackers ran high |
| 13 | **Sohan halwa** | 55–60/100 g (Hafiz estimate) | **40/100 g default** (LFAC), range 40–60 | Dietitian-compiled T1D source outranks a marketing estimate; Hafiz kept as the ghee-light upper bound |
| 14 | **Kulfi** | 11–20 g (CoFID UK floor) | **18 g per 74 g kulfi** (LFAC 24.3/100 g) | Pakistani khoya kulfi is the dense one; UK recipe floor misleading |
| 15 | **Sewaiyan** | katori ≈ 30 g (CoFID) | split: no-milk 32/100 g (LFAC), milky 20/100 g (CoFID), Sindhi sayun 62/100 g (LFAC) | Three real preparations; one number was hiding a 3× spread |
| 16 | **Sheer khurma** | katori 35–45 g | katori ≈ **55 g** (LFAC 36.8/100 g) | Measured Eid recipe richer than the CALC |
| 17 | **Bakarkhani** | 29–30 g per 50 g (labels 58–60/100 g) | **21 g per 47 g** (LFAC 44.7/100 g) | Fresh Pakistani piece vs dry packaged-export labels |
| 18 | **Puri** | 7–14 g each (4–5") | small 7–14 g; **halwa-puri size 68 g = 28 g** (LFAC) | the earlier "2× source disagreement" was two real sizes; density agreed all along |
| 19 | **Aloo paratha** | 44 g per 120 g (label 37/100 g) | band **×0.37–0.45**; LFAC 103 g = 46 g (44.7/100 g) | LFAC's potato-lean piece tops the band; stuffing generosity is the variable |
| 20 | **Kulcha (tandoor)** | 40–60 g per assumed 80–120 g piece | density confirmed 49.5/100 g; **LFAC piece is 202 g = 100 g** | Piece weight, not density, was the unknown; weigh yours |
| 21 | **Potato chunk adjustment** | +10–16 g per chunk | **+8–16 g** | LFAC potato rows imply ~15 g/100 g vs USDA 20.1; lower bound widened |
| 22 | **Falooda** | 50–60 g per 300 ml (CALC, LOW) | **56 g per 248 g cup** (LFAC); 300 ml ≈ 68 g | Closed; the earlier arithmetic was on target, the real cup is just denser than the assumed glass |

Structural changes under Task 3: exchange columns and "(N ex)" tags deleted throughout; single 15 g translation line kept at the top; weigh-once rule carries **both** coefficients (×0.46 atta / ×0.50 maida) at every appearance (section 3, section 13).

---

## 19. Sources, licensing & attribution — for shipping this table in a public app

> **This is not legal advice.** It is a research summary of each source's published terms, with reasoning flagged where terms are silent. Have a person with actual legal competence review this section before public release.

### 19.1 Per-source terms

| Source | What we take from it | Licence / terms found | Attribution required? |
|---|---|---|---|
| **LFAC Pakistani Foods book (2024)** | ~135 portion+carb values; the grams-only precedent | The book's printed notice (p. 56): *"This book can be reproduced in whole or part but individual images cannot be used without permission from Life for a Child and contributors."* The LFAC website carries a general "© Life for a Child. All Rights Reserved" but the book's own notice is the specific grant. **Text and values: reproduction expressly permitted, whole or part. Images (food photos — Carbs & Cals, Nurture, Julia Zinga; the p. 9 plate figure © 2017 Joslin Diabetes Center "all rights reserved"): NOT reusable without permission.** | Not stated as a condition, but credit is obviously due; see 19.2. *Flags:* the grant says "reproduced", not "adapted" — merging values into a new table is arguably adaptation (reasoning, not citation); the grant is silent on commercial use. A short courtesy email to LFAC confirming app use would close both gaps before release. |
| **USDA FoodData Central** (SR-Legacy, FNDDS) | densities for rice, fruits, sugar, milk, many dishes | Works of the US federal government are not subject to US copyright (17 U.S.C. § 105); USDA has long stated its food composition data are public domain. *Note: the current FDC website pages checked this pass no longer display the public-domain/suggested-citation wording where it used to be — the legal basis (US government work) is unaffected, but re-verify the citation wording before release.* | Not legally required; citation is standard practice. See 19.2. |
| **UK CoFID / McCance & Widdowson 2021** | densities for breads, daals, sweets, drinks | **© Crown copyright, released under the Open Government Licence v3.0** (confirmed on the gov.uk dataset page). OGL v3 expressly permits copying, adapting, commercial and non-commercial exploitation, including "in your own product or application". | **YES — mandatory.** OGL requires the attribution statement, and non-compliance automatically terminates the licence. Exact wording in 19.2. This is the one source where missing attribution is a genuine legal defect, not just bad manners. |
| **Khan et al. 2019** (Progress in Nutrition, Mattioli 1885) | ~15 lab densities for cooked Pakistani dishes | Journal states articles are **CC BY-NC 4.0**; authors retain copyright; *"No formal permission will be required to reproduce parts (tables or illustrations) of published papers, provided the source is quoted appropriately and reproduction has no commercial intent. Reproductions with commercial intent will require written permission and payment of royalties."* | **YES for any reproduction; non-commercial only.** A free open-source app is plausibly non-commercial under CC BY-NC's definition, **but this is the licence that bites if the app is ever monetised** (ads, paid tier, bundling). Mitigation: we use ~15 individual nutrient values (facts), not the paper's table as such — see 19.3 — but flag for real legal review. |
| **NIN / IFCT lineage (India)** | the gur/jaggery value only | **Terms could not be verified this pass.** ICMR-NIN's IFCT 2017 is a priced publication; no open licence found in earlier searches. | Unclear. Exposure is one value on one row. Mitigations: treat as a single uncopyrightable fact with citation, or re-source gur (e.g. lab literature) before release. **Flag for real check.** |
| **Karachi Commissioner rate lists** (via Dawn, Express Tribune, Aaj, Pakistan Today) | official naan/roti weights | Government notifications and the weights they fix are facts; news articles are copyrighted but we reproduce none of their expression, only the gazetted numbers. (Reasoning — Pakistan's Copyright Ordinance 1962 protects expression, not facts.) | Not required; cite the notifications for verifiability. |
| **Manufacturer labels / published estimates** (Dawn, Sufi, Hafiz, Peek Freans…) | per-pack values | Nutrition declarations are uncopyrightable facts; naming the brands to identify the products is nominative use. (Reasoning.) | Not required; keep brand names purely descriptive. |
| **SJSU dietitian handout** (Wagle et al.) | scattered cross-check values | Copyrighted educational handout; no licence stated. We use individual values with citation, and must **not** reproduce the sheet itself. (Reasoning.) | Cite; do not reproduce wholesale. |
| **PK-FCT 2001 energy extract** | energy cross-checks only | Obtained via a PLOS ONE paper — PLOS is **CC BY 4.0**: reuse permitted, attribution required. | **YES** — cite the PLOS ONE paper (19.2). |
| **IDF-DAR 2021, ISPAD 2022, [LIT] papers** (taftoon, khoa, phalsa, khoa-jalebi) | single derived values / context | Various publisher terms; we take individual findings (facts) with citation, no reproduced text/tables/figures. (Reasoning.) | Cite per row, as already done. |
| **Carbs & Cals** | recommendation only — no values or photos taken | Fully commercial, all rights reserved. Nothing reproduced. | n/a — keep it that way; in particular its photos inside the LFAC book are among the excluded images. |

### 19.2 Ready-to-use attributions section (paste into the app's about/credits screen)

> **Data sources & attributions**
>
> - Portion sizes and carbohydrate values for Pakistani dishes include data reproduced from *Healthy eating and carbohydrate counting for children and adults with type 1 diabetes — Pakistani Foods, Edition 1 (2024)*, Life for a Child (Diabetes Australia) and the International Society for Pediatric and Adolescent Diabetes (ISPAD), with Meethi Zindagi and Baqai Institute of Diabetology and Endocrinology (BIDE). Reproduced under the book's copyright notice permitting reproduction in whole or part; no images from the book are used. https://lifeforachild.org
> - Contains public sector information licensed under the Open Government Licence v3.0. Includes data from McCance and Widdowson's *The Composition of Foods Integrated Dataset* (CoFID), Public Health England, 2021. © Crown copyright. https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
> - Includes data from U.S. Department of Agriculture, Agricultural Research Service, *FoodData Central* (fdc.nal.usda.gov). USDA data are in the public domain as works of the United States Government.
> - Includes values from Khan I, et al. "Developing a meal-planning exchange list for commonly consumed Pakistani dishes." *Progress in Nutrition* 2019;21(2):421–429. © the authors, licensed CC BY-NC 4.0.
> - Pakistan Food Composition Table (2001) energy data via a CC BY 4.0 article in *PLOS ONE* (doi:10.1371/journal.pone.0185466).
> - Additional single values cited to: NIN/Indian food-composition publications (jaggery); Commissioner Karachi tandoor-bread weight notifications; peer-reviewed studies of taftoon bread, khoa, and phalsa; manufacturers' published nutrition information (identified by brand for product identification only); a San José State University dietetics carbohydrate-counting handout; and IDF-DAR Practical Guidelines 2021.
> - **These values are estimates that scale insulin doses. They do not replace individual medical advice — confirm your doses with your diabetes team.**

(The last line mirrors the LFAC book's own disclaimer duty and is a safety requirement, not a licensing one.)

### 19.3 Facts vs tables — the compilation-rights question

- **Individual nutrient values are facts** and facts are not copyrightable in the US (*Feist*), and generally not protectable as such in Pakistan (Copyright Ordinance 1962 protects original expression, including compilations *as* compilations). Using "biryani ≈ 17 g/100 g [LFAC]" is fact reuse. *(Reasoning from black-letter doctrine, not a case citation on food tables specifically.)*
- **Reproducing a substantial portion of a table is different.** The UK/EU recognise a *sui generis* database right over datasets built with substantial investment — extracting a substantial part of CoFID would engage it, **but CoFID's OGL licence covers exactly that use**, so attribution is the entire obligation. The US has no database right. Pakistan has no sui generis database right, but a wholesale copied table could infringe compilation copyright in its selection/arrangement. *(Reasoning; flagged.)*
- Where this project *does* reproduce substantially — the LFAC book, ~135 rows — the book's own notice expressly permits it (images excepted). Where the sources are all-rights-reserved (SJSU, IDF-DAR, NIN), the project takes scattered individual facts only, which is the defensible posture. **Keep it that way: never bulk-import a protected table wholesale.**
- **Things that warrant a real check before public release:** (1) the Khan CC BY-NC boundary if any monetisation is ever contemplated; (2) a courtesy confirmation from Life for a Child that app-embedding of the book's values (an adaptation, arguably beyond literal "reproduction") is within their intent — their notice reads permissive and their mission is aligned, but the word "adapt" is absent; (3) the NIN/IFCT gur value — verify terms or re-source; (4) re-verify USDA's current suggested-citation wording. None of these blocks the build; (1) and (2) should be resolved before shipping.

---

*v3 prepared 2026-09-12. Extraction and reconciliation methodology in section 17; complete change log in section 18. This document is research input for the MealUnits carbohydrate reference — not medical advice, and section 19 is not legal advice.*
