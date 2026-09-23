/**
 * The pieces more than one screen needs.
 */

import type { ComponentChildren, JSX } from 'preact';
import { useRef } from 'preact/hooks';
import { ADVISORY_BUDGET } from '../config.js';
import { useCopy } from './copy.js';
import type { Advisory } from '../core/types.js';

/**
 * Every button in the app, and it exists for one guarantee: `type="button"`.
 *
 * The default is `submit`, and a submit button inside a form navigates the page
 * — which in an offline PWA is a blank screen, not a reload. There is no
 * `<form>` here today, and the helper this replaces (`dom.ts`'s `button`) made
 * the same bet and stated it as §10.7's "touch targets and keyboard focus are
 * not optional". One place to set it means no screen can forget.
 *
 * `onPress` rather than `onClick`, and the wrapper is not ceremony: `onClick`
 * hands the handler a `MouseEvent`, and a handler written as `onClick={save}`
 * where `save` takes an optional argument silently receives one. The stepper
 * passes deltas and the keypad passes digits; both would take the event.
 */
export interface ButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  readonly onPress: () => void;
  readonly children?: ComponentChildren;
}

export function Button({ onPress, children, ...rest }: ButtonProps): JSX.Element {
  return (
    <button type="button" onClick={() => { onPress(); }} {...rest}>
      {children}
    </button>
  );
}

/**
 * Every text field in the app, and it exists for ONE rule that keyed
 * reconciliation does not give for free.
 *
 * **Never write back to a controlled input's value while a composition is in
 * flight.** A surviving element is necessary and not sufficient: between
 * `compositionstart` and the first `input` event the DOM holds the IME's
 * preview text and the app still holds the last committed value, so any render
 * landing in that window has a DIFFERENT value to write — and writing it kills
 * the composition on a node nobody destroyed. Preact has had exactly one IME
 * regression (issue #4008, introduced 10.14.1, fixed within days) and the fix
 * was making this pattern work.
 *
 * Renders arrive in that window without the user doing anything: §8.2's expiry
 * tick fires every minute and on every return to visibility.
 *
 * The guard is `value={undefined}` rather than a different value, because that
 * is the one thing Preact treats as "do not touch this input" — its value sync
 * short-circuits on `undefined` before it compares against the DOM.
 *
 * A ref and not state, deliberately: starting a composition must not itself
 * cause a render. The ref is read during render, which is what makes the next
 * render — whatever triggers it — see the flag.
 *
 * This matters beyond Urdu (§10.9, 10a). Predictive text and autocorrect on an
 * English soft keyboard run the same machinery, which is the leading theory for
 * the mobile dropped keystroke Momin reported on 2026-09-14 — on every text
 * field, setup and food search alike, which is what pointed at the shared
 * render path rather than at any one screen.
 */
export interface TextInputProps
  extends Omit<
    JSX.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onInput' | 'onChange' | 'oncompositionstart' | 'oncompositionend'
  > {
  readonly value: string;
  readonly onValue: (value: string) => void;
}

export function TextInput({ value, onValue, ...rest }: TextInputProps): JSX.Element {
  const composingRef = useRef(false);
  return (
    <input
      {...rest}
      /*
       * Read during render, which `react-hooks/immutability` forbids and is
       * right to forbid in general: a ref read at render time does not cause a
       * re-render, so a component that DEPENDS on the value updating will not
       * update. Here that is the requirement, not the hazard. Starting a
       * composition must not itself render — a render is the very thing this
       * flag exists to make harmless — and the flag has to be visible to
       * whatever render lands next, whoever triggers it.
       *
       * `useState` would satisfy the rule and lose the guarantee: its update is
       * scheduled, so a render arriving between `compositionstart` and the
       * state actually flipping would write the value anyway. A ref flips
       * synchronously.
       */
      // eslint-disable-next-line react-hooks/refs
      value={composingRef.current ? undefined : value}
      // LOWERCASE, and it is not a style choice — `onCompositionStart` attaches
      // to an event type nothing fires, in jsdom AND in Chrome. `src/env.d.ts`
      // holds the measurement and the mechanism.
      oncompositionstart={() => { composingRef.current = true; }}
      // The latch's way out if `compositionend` never arrives. Every engine
      // fires it on blur or cancel, so this should be unreachable — but the
      // flag is one missing event away from leaving the field PERMANENTLY
      // uncontrolled, and a field that silently stops accepting writes from the
      // app is the shape of defect this whole component exists to end. The
      // fallback costs one line. `onBlur` camelCases correctly because `onblur`
      // IS a DOM property, unlike the two composition handlers above.
      onBlur={() => { composingRef.current = false; }}
      oncompositionend={(event) => {
        composingRef.current = false;
        // The composed word, committed once. Without this the final form only
        // reaches the app if the browser also fires a trailing `input` — which
        // it does on every engine today, and which is not a thing to depend on
        // for the last character of a word.
        onValue((event.target as HTMLInputElement).value);
      }}
      onInput={(event) => { onValue(event.currentTarget.value); }}
    />
  );
}

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
export interface KeypadProps {
  readonly decimal: boolean;
  readonly onDigit: (digit: string) => void;
  readonly onBackspace: () => void;
  readonly action: { readonly label: string; readonly onPress: () => void; readonly enabled: boolean };
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export function Keypad({ decimal, onDigit, onBackspace, action }: KeypadProps): JSX.Element {
  const COPY = useCopy();
  return (
    /*
     * `dir="ltr"`, ALWAYS, whatever direction the page runs in.
     *
     * The RTL sweep mirrored the interface and took the keypad with it: in Urdu
     * the leftmost column became 3/6/9 instead of 1/4/7. Measured on the
     * deployed build, not assumed.
     *
     * **A NUMBER PAD DOES NOT MIRROR.** Every dialer and every numeric keyboard
     * on the phone this runs on keeps 1 at the top left in Arabic, Hebrew and
     * Urdu, because the digits themselves read left-to-right — `10` is one then
     * zero in every script this app supports, which is why §4.2 keeps them
     * ASCII in the first place. Mirroring the grid puts this app's keypad out of
     * step with every other keypad its reader touches.
     *
     * The stake is the usual one. The thing typed here is a blood sugar, often
     * by someone whose hands are unsteady, and muscle memory reaching for 1 and
     * landing on 3 is a reading the app then does arithmetic on.
     *
     * On the CONTAINER rather than the buttons: the grid's column order is what
     * flips, so the fix belongs where the columns are laid out.
     */
    <div class="pad" dir="ltr">
      {DIGITS.map((digit) => (
        <Button key={digit} class="key" onPress={() => { onDigit(digit); }}>
          {digit}
        </Button>
      ))}
      {decimal ? (
        <Button class="key dim" aria-label={COPY.calculator.decimalPointLabel} onPress={() => { onDigit('.'); }}>
          .
        </Button>
      ) : (
        <button class="key dim" type="button" disabled aria-hidden="true" />
      )}
      <Button class="key" onPress={() => { onDigit('0'); }}>0</Button>
      <Button class="key dim" aria-label={COPY.calculator.deleteLabel} onPress={onBackspace}>
        ⌫
      </Button>
      {/* The sheet lives in the stylesheet, not in a `style` attribute: §11.5's
          policy is `style-src 'self'`, which blocks the attribute form outright. */}
      <div class="sheet pad-action">
        <Button class="go" disabled={!action.enabled} onPress={action.onPress}>
          {action.label}
        </Button>
      </div>
    </div>
  );
}

/** §18.14 — the wizard's position, which is what makes it a wizard. */
export function StepDots({
  current,
  total,
  label,
}: {
  readonly current: number;
  readonly total: number;
  readonly label: string;
}): JSX.Element {
  return (
    <div class="dots">
      <div class="track">
        {Array.from({ length: total }, (_, index) => (
          <i key={index} class={index < current ? 'on' : ''} />
        ))}
      </div>
      <span class="where">{label}</span>
    </div>
  );
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
 * component never decides priority. It only decides what is visible, which is
 * why band E — rank 2, "safety information, never collapsed" — cannot end up
 * behind the disclosure: nothing above it can push it past position two.
 */
export function Advisories({
  views,
  onMore,
  expanded,
  onTerm,
}: {
  readonly views: readonly AdvisoryView[];
  readonly onMore: () => void;
  readonly expanded: boolean;
  readonly onTerm: (key: string) => void;
}): JSX.Element | null {
  const COPY = useCopy();
  if (views.length === 0) return null;
  const shown = expanded ? views : views.slice(0, ADVISORY_BUDGET);
  const hidden = views.length - shown.length;

  return (
    <div>
      {shown.map((view) => (
        <div
          key={view.kind}
          class={`flag${view.compact === true ? ' compact' : ''}${view.mint === true ? ' mint' : ''}`}
        >
          {view.title === null ? null : <b>{view.title}</b>}
          {/* The compact form runs the title INLINE with the body (`styles.css`
              flips `<b>` to `display: inline`), and without this the two abut:
              "Above 250 — check ketonesFeeling unwell is its own reason to
              test". Pre-existing since the first commit; found when the
              rolling-window ruling made the compact form reachable more often.

              A space in the DOM rather than a CSS margin, deliberately: a margin
              is invisible to every test this project has, and §19's rule is that
              a guarantee enforced by memory is not enforced. It is also not a
              copy change — §10.5 requires the two forms to carry IDENTICAL
              words, and a separator is not a word. */}
          {view.compact === true && view.title !== null ? ' ' : null}
          {/* THROUGH `Prose`, because an advisory body can carry a glossary
              marker and `bandE.body` does. Rendered raw it shipped the literal
              text `[[ketones]]` onto the card §10.5 calls "safety information,
              never collapsed" — in both languages, on the one screen that tells
              a reader to go and test for the thing the marker names. */}
          <Prose text={view.body} onTerm={onTerm} />
        </div>
      ))}
      {hidden > 0 ? (
        <Button class="more" onPress={onMore}>{`${COPY.more} (${String(hidden)})`}</Button>
      ) : null}
    </div>
  );
}

/** §10.4 — the primary readout, and it is never animated. */
export function Readout({
  value,
  unit,
  stale,
}: {
  readonly value: string;
  readonly unit: string;
  readonly stale: boolean;
}): JSX.Element {
  return (
    <div class={`result${stale ? ' stale' : ''}`}>
      <div class="n">{value}</div>
      <div class="u">{unit}</div>
    </div>
  );
}

/**
 * Prose whose hard words can be tapped.
 *
 * `[[key]]` inside a copy string becomes the glossary word, underlined and
 * tappable; everything else renders unchanged. The marker is in the COPY rather
 * than in the markup for the reason `mgdl` and `timestamp` are: a component
 * cannot reach the translation, and Urdu marks different words in different
 * places — «اسٹیکنگ» sits where English puts "stacking" only by accident.
 *
 * It also makes the pairing checkable. Both languages have to mark the same
 * keys for the same sentence, and a test can say so; a component that guessed
 * which words to underline could not be checked at all.
 *
 * Unknown keys render as the plain key rather than throwing. A missing entry
 * should look wrong on screen, not take the screen down — this text sits on the
 * band C advisory among others, and there is no version of "blank screen" that
 * beats "odd-looking word".
 */
export function Prose({ text, onTerm }: {
  readonly text: string;
  readonly onTerm: (key: string) => void;
}): JSX.Element {
  const COPY = useCopy();
  const glossary = COPY.glossary as Record<string, { word: string } | undefined>;
  // Walked rather than `split`-and-alternate. The split version reads the
  // capture groups off the ODD indices, which needs a literal 2 that §11.8 does
  // not admit — and it is the less obvious code anyway.
  const parts: JSX.Element[] = [];
  let from = 0;
  for (const match of text.matchAll(/\[\[([a-zA-Z]+)\]\]/g)) {
    const at = match.index;
    const key = match[1] ?? '';
    parts.push(<>{text.slice(from, at)}</>);
    const entry = glossary[key];
    parts.push(entry === undefined
      // An unknown key renders as the bare key. A missing entry should look
      // wrong on screen, not take the screen down — this text sits on advisory
      // cards, and no version of "blank screen" beats "odd-looking word".
      ? <>{key}</>
      : (
        <Button class="term" aria-describedby="glossary-panel" onPress={() => { onTerm(key); }}>
          {entry.word}
        </Button>
      ));
    from = at + match[0].length;
  }
  parts.push(<>{text.slice(from)}</>);
  return <>{parts}</>;
}

/**
 * The explanation, over the screen you are on rather than as a page.
 *
 * Over rather than away because the reader is in the middle of something — the
 * result they are reading expires, and a screen change would lose their place
 * for a definition. It renders NOTHING when nothing is open, so it costs an
 * unopened screen one null check.
 */
export function GlossaryPanel({ term, onClose }: {
  readonly term: string | null;
  readonly onClose: () => void;
}): JSX.Element | null {
  const COPY = useCopy();
  if (term === null) return null;
  const entry = (COPY.glossary as Record<string, { word: string; body: string } | undefined>)[term];
  if (entry === undefined) return null;
  return (
    <div class="glossary" id="glossary-panel" role="dialog" aria-modal="false" aria-live="polite">
      <b>{entry.word}</b>
      <p>{entry.body}</p>
      <Button class="go quiet" onPress={onClose}>{COPY.glossaryClose}</Button>
    </div>
  );
}
