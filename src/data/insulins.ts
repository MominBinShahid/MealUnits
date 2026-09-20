/**
 * The mealtime insulins this app knows about, and the ones it knows it cannot
 * calculate for.
 *
 * §11.8's reference-data exemption, on the same terms as `carbs.ts`: **every
 * fact here is a measurement of the world rather than a decision the app
 * takes.** Nobody edits "Humalog is insulin lispro" to change how the app
 * behaves. The two conditions that exemption carries hold here as well — this
 * module holds data and nothing else, and every row carries its source.
 *
 * **The NUMBERS are not here.** Onset, the pre-meal wait and the stacking
 * windows live in `config.ts`'s `INSULIN_TIMING`, keyed by class, because those
 * ARE decisions: a wait of twenty minutes against ten is a clinical choice made
 * from a label, not a reading off one. This file says which class a vial
 * belongs to; that file says what a class means.
 *
 * ## Why the list is grouped by class and never sorted alphabetically
 *
 * HumuLIN and HumaLOG are on ISMP's list of confused drug names, as are NovoLIN
 * and NovoLOG, and both premix pairs. An alphabetical list seats those pairs in
 * consecutive rows — and ISMP's own mitigation is to stop look-alike names
 * appearing next to each other. Class headers do that structurally.
 *
 * The grouping also makes the only dangerous mistake the rare one. Tapping
 * Humalog while taking NovoRapid changes nothing: both are rapid analogues, so
 * every timing the app shows is still right. Only a CROSS-CLASS pick matters,
 * and a reader choosing under a heading that says "rapid-acting analogue" has
 * to cross a label to make one.
 *
 * ## Why insulins this app cannot handle are IN the list
 *
 * Leaving premix out does not protect a premix user; it sends them to the
 * nearest-looking name. A NovoMix 30 reader who cannot find their insulin taps
 * Novolin R and receives a carbohydrate-counted dose that means nothing for a
 * fixed twice-daily regimen. Naming the insulin and saying plainly that this
 * calculator does not fit it is the only honest answer, and it is one the
 * reader can act on.
 *
 * This is not a theoretical population. In the ICMR-YDR registry 52.8% of
 * Indian type 1 youth were on once- or twice-daily regimens against 2.0% in the
 * US SEARCH registry, ISPAD's limited-resource chapter discusses premix in type
 * 1 directly, and Pakistan's public sector supplies premixed, regular and NPH
 * only. The premix reader is plausibly more common here than the analogue one.
 *
 * Long-acting and intermediate insulins are listed for a second reason: someone
 * who believes their Lantus is their mealtime insulin is confusing the two
 * halves of their own regimen, and §1.3 already has a place to record it. A row
 * that says so teaches something; an absent row sends them to "not listed".
 */

import type { InsulinClass } from '../core/insulin.js';

export interface Insulin {
  /**
   * The stored key, and the ONLY part of a row that is persisted. Stable
   * forever: a settings row and a prescription period both keep it, so
   * renaming one silently reclassifies history.
   */
  readonly id: string;
  /**
   * What is printed on the vial, and what the app calls the dose. §8.5 asks for
   * the brand rather than a class word because the brand is the fact the reader
   * can check against the box in their hand.
   */
  readonly brand: string;
  /**
   * The generic name, printed under the brand on every box. It is here so the
   * list is findable by someone whose local brand is not listed but whose
   * molecule is — the molecule is what determines the class.
   */
  readonly molecule: string;
  readonly insulinClass: InsulinClass;
  /** The other name the same product is sold under, or null. Not a second row. */
  readonly alsoSoldAs: string | null;
  /** Which prescribing information the class assignment comes from. */
  readonly source: string;
}

/**
 * Ordered by class, and the order of the CLASSES is deliberate too: the three
 * this app can time come first, so the common answer is near the top and the
 * out-of-model rows are not something a reader scrolls past on the way to
 * theirs.
 */
export const INSULINS: readonly Insulin[] = [
  // ── Rapid-acting analogues ────────────────────────────────────────────────
  // First, not second: since the audience widened past one Humulin R user, this
  // is the most common mealtime insulin among readers who have a choice.
  {
    id: 'novorapid',
    brand: 'NovoRapid',
    molecule: 'Insulin aspart',
    insulinClass: 'rapid',
    alsoSoldAs: 'NovoLog',
    source: 'NovoLog (insulin aspart) US prescribing information',
  },
  {
    id: 'humalog',
    brand: 'Humalog',
    molecule: 'Insulin lispro',
    insulinClass: 'rapid',
    alsoSoldAs: null,
    source: 'Humalog (insulin lispro) US prescribing information',
  },
  {
    id: 'apidra',
    brand: 'Apidra',
    molecule: 'Insulin glulisine',
    insulinClass: 'rapid',
    alsoSoldAs: null,
    source: 'Apidra (insulin glulisine) US prescribing information',
  },
  {
    id: 'aspart-other',
    brand: 'Insulin aspart, another brand',
    molecule: 'Insulin aspart',
    insulinClass: 'rapid',
    alsoSoldAs: null,
    source: 'Class assignment by molecule; timing from the aspart label',
  },
  {
    id: 'lispro-other',
    brand: 'Insulin lispro, another brand',
    molecule: 'Insulin lispro',
    insulinClass: 'rapid',
    alsoSoldAs: null,
    source: 'Class assignment by molecule; timing from the lispro label',
  },

  // ── Ultra-rapid analogues ─────────────────────────────────────────────────
  {
    id: 'fiasp',
    brand: 'Fiasp',
    molecule: 'Faster-acting insulin aspart',
    insulinClass: 'ultra_rapid',
    alsoSoldAs: null,
    source: 'Fiasp (insulin aspart) US prescribing information',
  },
  {
    id: 'lyumjev',
    brand: 'Lyumjev',
    molecule: 'Insulin lispro-aabc',
    insulinClass: 'ultra_rapid',
    alsoSoldAs: null,
    source: 'Lyumjev (insulin lispro-aabc) US prescribing information',
  },

  // ── Regular human insulin ─────────────────────────────────────────────────
  // The insulin this app was built around, and the one every timing constant in
  // it came from. It is a class here like any other now.
  {
    id: 'humulin-r',
    brand: 'Humulin R',
    molecule: 'Regular human insulin',
    insulinClass: 'regular',
    alsoSoldAs: null,
    source: 'Humulin R (insulin human injection) US prescribing information',
  },
  {
    id: 'actrapid',
    brand: 'Actrapid',
    molecule: 'Regular human insulin',
    insulinClass: 'regular',
    alsoSoldAs: 'Novolin R',
    source: 'Novolin R (insulin human injection) US prescribing information',
  },
  {
    id: 'insuman-rapid',
    brand: 'Insuman Rapid',
    molecule: 'Regular human insulin',
    insulinClass: 'regular',
    alsoSoldAs: null,
    source: 'Insuman Rapid summary of product characteristics',
  },
  {
    id: 'regular-other',
    brand: 'Regular human insulin, another brand',
    molecule: 'Soluble insulin',
    insulinClass: 'regular',
    alsoSoldAs: null,
    source: 'Class assignment by molecule; timing from the regular human insulin label',
  },

  // ── Premixed ──────────────────────────────────────────────────────────────
  // Out of model, and named anyway. See the header.
  {
    id: 'humulin-70-30',
    brand: 'Humulin 70/30',
    molecule: 'NPH and regular human insulin, premixed',
    insulinClass: 'premix',
    alsoSoldAs: null,
    source: 'Humulin 70/30 US prescribing information',
  },
  {
    id: 'novomix-30',
    brand: 'NovoMix 30',
    molecule: 'Insulin aspart, premixed',
    insulinClass: 'premix',
    alsoSoldAs: 'NovoLog Mix 70/30',
    source: 'NovoLog Mix 70/30 US prescribing information',
  },
  {
    id: 'humalog-mix',
    brand: 'Humalog Mix25 or Mix50',
    molecule: 'Insulin lispro, premixed',
    insulinClass: 'premix',
    alsoSoldAs: 'Humalog Mix75/25',
    source: 'Humalog Mix75/25 US prescribing information',
  },
  {
    id: 'mixtard-30',
    brand: 'Mixtard 30',
    molecule: 'NPH and regular human insulin, premixed',
    insulinClass: 'premix',
    alsoSoldAs: 'Novolin 70/30',
    source: 'Novolin 70/30 US prescribing information',
  },
  {
    id: 'premix-other',
    brand: 'Another premixed insulin',
    molecule: 'Two insulins in a fixed ratio',
    insulinClass: 'premix',
    alsoSoldAs: null,
    source: 'Class assignment by formulation',
  },

  // ── Intermediate-acting ───────────────────────────────────────────────────
  {
    id: 'humulin-n',
    brand: 'Humulin N',
    molecule: 'NPH insulin',
    insulinClass: 'intermediate',
    alsoSoldAs: null,
    source: 'Humulin N (NPH human insulin) US prescribing information',
  },
  {
    id: 'insulatard',
    brand: 'Insulatard',
    molecule: 'NPH insulin',
    insulinClass: 'intermediate',
    alsoSoldAs: 'Novolin N',
    source: 'Novolin N (NPH human insulin) US prescribing information',
  },

  // ── Long-acting ───────────────────────────────────────────────────────────
  // Here because confusing the basal with the mealtime insulin is a mistake
  // this screen can name and §1.3 already has a field for.
  {
    id: 'lantus',
    brand: 'Lantus',
    molecule: 'Insulin glargine',
    insulinClass: 'long',
    alsoSoldAs: 'Basaglar, Toujeo',
    source: 'Lantus (insulin glargine) US prescribing information',
  },
  {
    id: 'levemir',
    brand: 'Levemir',
    molecule: 'Insulin detemir',
    insulinClass: 'long',
    alsoSoldAs: null,
    source: 'Levemir (insulin detemir) US prescribing information',
  },
  {
    id: 'tresiba',
    brand: 'Tresiba',
    molecule: 'Insulin degludec',
    insulinClass: 'long',
    alsoSoldAs: null,
    source: 'Tresiba (insulin degludec) US prescribing information',
  },
];
