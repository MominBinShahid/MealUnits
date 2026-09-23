/**
 * Which language the interface is in, and — while the choice is open — which
 * Urdu face it is set in.
 *
 * `10a` ships FOUR Urdu faces at once so Momin's mother can see the same screens
 * in each and say which she reads. Three of them get deleted when she has, and
 * `UrduFace` goes with them: at that point the language is a language and the
 * typeface is not a setting. This file is written to be mostly deleted.
 *
 * **English is the default and stays the default.** Not a browser-language
 * guess: `navigator.language` says what the phone is set to, which is not the
 * same question as which language this reader wants their insulin instructions
 * in — and being handed an unreviewed translation because of an OS setting is
 * the failure the in-testing label exists to prevent.
 */

import type { Language, UrduFace } from '../core/types.js';

/**
 * What an install with no stored choice runs as, and what `10a` ruled: *"default
 * is always English"*.
 *
 * NOT a guess from `navigator.language`. What the phone is set to is a different
 * question from which language this reader wants their insulin instructions in,
 * and being handed an unreviewed translation because of an OS setting is exactly
 * what the in-testing label exists to prevent.
 *
 * Here rather than in `src/core/types.js` beside the types they annotate, and
 * the split is not arbitrary: a type is erased and a value is not, §13.4 holds
 * `src/core` at 100% mutation, and a constant no core test reads is a mutant
 * nothing can kill. These are interface defaults, and this is the interface.
 */
export const DEFAULT_LANGUAGE: Language = 'en';

/** Arbitrary among the four, and it is the one Urdu is conventionally set in. */
export const DEFAULT_FACE: UrduFace = 'nastaliq';

/**
 * The language whose strings have not been reviewed by a native reader yet.
 *
 * Momin ruled Urdu ships in PRODUCTION rather than behind a flag, with a label
 * on the option saying it is in testing and a confirmation when it is chosen.
 * Asked whether an unreviewed string reaching a stranger was acceptable:
 * *"we have locked the warning — somebody ignored the warning, this is not
 * something that we report that we are supporting."* The concern was raised
 * twice and overruled twice, so it is settled rather than an open risk — but
 * the warning it was settled ON has to actually be there, which is what this
 * constant makes checkable.
 */
export const LANGUAGE_IN_TESTING: Language = 'ur';

/**
 * The four faces, in the order the list shows them: the two Nastaliq options
 * first, because Urdu is conventionally set in Nastaliq, then the two Naskh.
 *
 * `name` is the foundry's own name and is deliberately NOT translated — a
 * typeface name is a proper noun, like the insulin brands, and a transliterated
 * one would name nothing. It is also what tells Momin which of the four files to
 * keep when his mother has chosen; the other three get deleted, and this list
 * with them.
 *
 * **No sample of each face in the list.** Rendering اردو four times, once per
 * family, would make the browser fetch all four — 448 KB the moment anyone
 * opened Settings, which is the exact cost the whole lazy-fetch design exists to
 * avoid, paid by every English reader who ever scrolled that far. It is also the
 * worse test: a face is judged by reading the app in it, not by reading one word
 * four times. She picks one, uses the app, comes back and picks another.
 *
 * Measured sizes, for the record rather than for the screen — Noto Nastaliq
 * Urdu 156 KB, Gulzar 187 KB, Noto Naskh Arabic 52 KB, Noto Sans Arabic 48 KB.
 */
export const URDU_FACES: readonly { readonly id: UrduFace; readonly name: string }[] = [
  { id: 'nastaliq', name: 'Noto Nastaliq Urdu' },
  { id: 'gulzar', name: 'Gulzar' },
  // Below Gulzar, Momin's placement, and they share its one limitation: a
  // single published weight, so bold renders at normal. Added anyway because
  // two Nastaliqs to choose between is not much of a choice, and this is the
  // only other one on the open web that can be shipped — see the note in
  // `fonts-urdu.css` for what ruled the rest out.
  { id: 'beaconhouse', name: 'Beaconhouse Nastaliq' },
  { id: 'naskh', name: 'Noto Naskh Arabic' },
  { id: 'sans', name: 'Noto Sans Arabic' },
];

/**
 * What the document element must carry for a language, in one place.
 *
 * `lang` and `dir` are not decoration here. `lang` is what `:lang(ur)` in
 * `fonts-urdu.css` selects on — the PSEUDO-CLASS rather than `[lang="ur"]`,
 * because it inherits, so one attribute on the root reaches every descendant.
 * `dir` is what the RTL sweep of 2026-09-22 made meaningful: every inline-axis
 * property in the stylesheet is logical, so this one attribute mirrors the
 * whole interface.
 */
export function documentAttributes(
  language: Language,
  face: UrduFace,
): { readonly lang: string; readonly dir: 'ltr' | 'rtl'; readonly face: UrduFace | null } {
  if (language === 'ur') return { lang: 'ur', dir: 'rtl', face };
  return { lang: 'en', dir: 'ltr', face: null };
}
