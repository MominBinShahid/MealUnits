/**
 * The pieces more than one screen needs.
 */

import { ADVISORY_BUDGET } from '../config.js';
import { COPY } from './copy.js';
import { button, h } from './dom.js';
import type { Advisory } from '../core/types.js';

/**
 * §10.1 item 2, added in v20 — **the keypad is a different contract from the
 * grammar.**
 *
 * §4.2's grammar is the PARSER's contract: uniform across every field, accepting
 * two fractional digits, never narrowed, because it has to accept anything a
 * valid source can produce including an imported file. The keypad is per field,
 * and omitting its decimal key is a CLINICAL CLAIM that a fraction cannot occur
 * there.
 *
 * The claim holds for blood sugar, the meter reading and the target, which are
 * whole mg/dL. **It does not hold for the ratios**: an insulin-to-carbohydrate
 * ratio of 1 unit per 7.5 g is an ordinary prescription, and a keypad without a
 * decimal key makes it unenterable. It does not hold for carbohydrate, and it
 * does not hold for the injected amount, where half-units are the reason §5 has
 * a half-unit mode at all.
 *
 * The rule: **omitting the decimal key must never make a value a prescriber
 * could write unenterable.** Where that is in doubt, the key is present. A
 * keypad narrower than the grammar is allowed; a keypad narrower than the clinic
 * is a defect.
 */
export function keypad(options: {
  readonly decimal: boolean;
  readonly onDigit: (digit: string) => void;
  readonly onBackspace: () => void;
  readonly action: { readonly label: string; readonly onPress: () => void; readonly enabled: boolean };
}): HTMLElement {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) =>
    button(digit, () => { options.onDigit(digit); }, { class: 'key' }),
  );

  const dot = options.decimal
    ? button('.', () => { options.onDigit('.'); }, { class: 'key dim', 'aria-label': 'decimal point' })
    : h('button', { class: 'key dim', type: 'button', disabled: true, 'aria-hidden': 'true' });

  const primary = button(options.action.label, options.action.onPress, {
    class: 'go',
    disabled: !options.action.enabled,
  });

  return h(
    'div',
    { class: 'pad' },
    ...keys,
    dot,
    button('0', () => { options.onDigit('0'); }, { class: 'key' }),
    button('⌫', () => { options.onBackspace(); }, { class: 'key dim', 'aria-label': 'delete' }),
    // The span lives in the stylesheet, not in a `style` attribute: §11.5's
    // policy is `style-src 'self'`, which blocks the attribute form outright.
    h('div', { class: 'sheet pad-action' }, primary),
  );
}

/** §18.14 — the wizard's position, which is what makes it a wizard. */
export function stepDots(current: number, total: number, label: string): HTMLElement {
  const track = h(
    'div',
    { class: 'track' },
    ...Array.from({ length: total }, (_, index) =>
      h('i', { class: index < current ? 'on' : '' }),
    ),
  );
  return h('div', { class: 'dots' }, track, h('span', { class: 'where' }, label));
}

export interface AdvisoryView {
  readonly kind: Advisory;
  readonly title: string | null;
  readonly body: string;
  readonly compact?: boolean;
  readonly mint?: boolean;
}

/**
 * §10.5's warning budget — **at most two advisory elements on the result screen
 * at once**, and anything beyond the top two behind a "more" affordance rather
 * than stacked.
 *
 * Version 1 could put four separate warnings on one result screen. "Each was
 * individually defensible; together they train 'warnings here are noise', which
 * then degrades the band B caution — the one that must land."
 *
 * The ordering arrives already ranked from the core (§4.3 step 11b), so this
 * function never decides priority. It only decides what is visible, which is why
 * band E — rank 2, "safety information, never collapsed" — cannot end up behind
 * the disclosure: nothing above it can push it past position two.
 */
export function advisories(views: readonly AdvisoryView[], onMore: () => void, expanded: boolean): HTMLElement | null {
  if (views.length === 0) return null;
  const shown = expanded ? views : views.slice(0, ADVISORY_BUDGET);
  const hidden = views.length - shown.length;

  const nodes = shown.map((view) =>
    h(
      'div',
      { class: `flag${view.compact === true ? ' compact' : ''}${view.mint === true ? ' mint' : ''}` },
      view.title === null ? null : h('b', {}, view.title),
      view.body,
    ),
  );

  return h(
    'div',
    {},
    ...nodes,
    hidden > 0
      ? button(`${COPY.more} (${String(hidden)})`, onMore, { class: 'more' })
      : null,
  );
}

/** §10.4 — the primary readout, and it is never animated. */
export function readout(value: string, unit: string, stale: boolean): HTMLElement {
  return h(
    'div',
    { class: `result${stale ? ' stale' : ''}` },
    h('div', { class: 'n' }, value),
    h('div', { class: 'u' }, unit),
  );
}

export function bar(...children: (Node | null)[]): HTMLElement {
  return h('div', { class: 'bar' }, ...children.filter((child) => child !== null));
}
