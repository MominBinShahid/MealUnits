/**
 * §8.5 — the insulin question, the confirmation echo, and the honest exit.
 *
 * Three states of one screen rather than three screens, because they are one
 * decision and the reader moves between them freely: pick, read back what that
 * means, change your mind. Splitting them would put a back-stack between a
 * choice and its consequence.
 *
 * **What makes this safe is the GROUPING, not the wording.** HumuLIN and
 * HumaLOG are on ISMP's confused-drug-names list, as are NovoLIN and NovoLOG
 * and both premix pairs, and ISMP's own mitigation is to stop look-alike names
 * appearing in consecutive rows. Class headers do that structurally — and they
 * make the harmless mistake the easy one, since tapping Humalog while taking
 * NovoRapid leaves every timing on this screen correct.
 */

import type { JSX } from 'preact';
import { useCopy } from '../copy.js';
import type { Copy } from '../copy.js';
import { Button } from '../components.js';
import { classEatDelay, exitKindFor, isMealtimeClass, UNKNOWN_INSULIN } from '../../core/insulin.js';
import type { EatDelay, InsulinClass } from '../../core/insulin.js';
import { INSULINS } from '../../data/insulins.js';
import type { Insulin } from '../../data/insulins.js';

/**
 * §8.5 — the two ways to reach a person about an insulin this app does not fit.
 *
 * A form and a mail app, because the reader here is the one the project most
 * needs to hear from and the one least likely to push through friction. The
 * subject is pre-written so a reply lands somewhere findable rather than in a
 * pile of untitled mail.
 *
 * Plain links, and deliberately: an `<a href>` is a navigation, not a fetch, so
 * §11.6's content security policy does not stand in its way — and neither
 * sends anything anywhere until the reader chooses to.
 */
const CONTACT_FORM_URL = 'https://mominbinshahid.github.io/contact/';
const CONTACT_EMAIL = 'MominBinShahid@gmail.com';
/**
 * The subject line is TRANSLATED, so the address cannot be built at module
 * scope — found by the agent that did the `useCopy` sweep, and it is the same
 * trap as `settings.tsx`'s `MODES`: a module-level read happens once, at import,
 * and would have stayed English for ever however the language was set.
 *
 * The two constants above it are NOT translated and stay where they are. A URL
 * and an address are not words.
 */
function contactMailto(copy: Copy): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(copy.insulin.contactSubject)}`;
}

/**
 * The class order on screen, and every part of it is a decision.
 *
 * **The three this app can time come first**, so the common answer is near the
 * top and nobody scrolls past an exit to reach theirs.
 *
 * **Regular human insulin leads them, corrected 2026-09-20 [Momin].** The first
 * version put rapid first, reasoning that since the audience widened the
 * analogue reader is the more common one. That is true in general and false
 * HERE: Pakistan's public sector supplies premixed, regular and NPH only, with
 * analogues unavailable free — `BACKLOG.md` entry 26 records it — so regular is
 * the likelier answer for this app's actual readers. Nothing about safety turns
 * on the order; ISMP's concern is look-alike names in CONSECUTIVE ROWS, which
 * the class headings already break up.
 *
 * Then, by how fast they act: regular, rapid, ultra-rapid. The order is the
 * clock, which is the one thing the answer decides.
 */
const CLASS_ORDER: readonly InsulinClass[] = [
  'regular',
  'rapid',
  'ultra_rapid',
  'premix',
  'intermediate',
  'long',
];

/** §8.5 — a wait, in the words the reader gets rather than as a pair of numbers. */
export function waitInWords(delay: EatDelay | null, copy: Copy): string | null {
  // Not a component, so no hook: the words arrive from the component that
  // could call one, rebound to the name the body already reads.
  const COPY = copy;
  if (delay === null) return null;
  const [lo, hi] = delay;
  if (hi === 0) return COPY.insulin.waitZero;
  if (lo === hi) return COPY.insulin.waitSingle(String(lo));
  return COPY.insulin.waitRange(String(lo), String(hi));
}

export interface InsulinHandlers {
  /** The row under the reader's finger, before it is committed. */
  readonly onPick: (id: string) => void;
  /** The echo's "yes, that's mine" — this is the only thing that writes. */
  readonly onConfirm: (id: string) => void;
  readonly onBack: () => void;
  /** Reachable from the exit, because a record must never be held hostage. */
  readonly onOpenRecord: () => void;
  /** Null during setup: there is nothing to go back to yet. */
  readonly onCancel: (() => void) | null;
}

function Row({
  insulin,
  onPick,
}: {
  readonly insulin: Insulin;
  readonly onPick: (id: string) => void;
}): JSX.Element {
  const COPY = useCopy();
  return (
    <Button
      class="go quiet insulin"
      onPress={() => {
        onPick(insulin.id);
      }}
    >
      <span class="brand">{insulin.brand}</span>
      {/* The molecule, always — it is printed under the brand on the box, and
          it is how somebody whose local brand is missing finds the right class
          anyway. */}
      <span class="molecule">
        {insulin.molecule}
        {insulin.alsoSoldAs === null ? '' : ` · ${COPY.insulin.alsoSoldAs(insulin.alsoSoldAs)}`}
      </span>
    </Button>
  );
}

/** The list. Grouped, ordered, and with "I don't know" as a real row at the end. */
function Picker({ handlers }: { readonly handlers: InsulinHandlers }): JSX.Element {
  const COPY = useCopy();
  return (
    <div class="screen">
      <h1>{COPY.insulin.title}</h1>
      <p>{COPY.insulin.intro}</p>
      <p class="hint">{COPY.insulin.whereToLook}</p>
      {/* §10.6 item 6's voice, on the screen that asks first. Settings says who
          Hasham is beside the three ratios; this screen asked a question about
          the reader's own insulin and said nothing about whose app it is.

          Placed HERE, above every group, rather than beside the Humulin R row.
          A named example sitting next to a tappable brand is a suggestion, and
          §8.5's whole objection to a picker was false confirmation of fit — so
          the sentence ends by telling the reader to read their own box. */}
      <p class="hint">{COPY.insulin.builtFor}</p>

      {CLASS_ORDER.map((insulinClass) => {
        const rows = INSULINS.filter((insulin) => insulin.insulinClass === insulinClass);
        return (
          <div key={insulinClass} class="insulin-group">
            <h2>{COPY.insulin.classHeading(insulinClass)}</h2>
            <p class="hint">{COPY.insulin.classNote(insulinClass)}</p>
            <div class="list">
              {rows.map((insulin) => (
                <Row key={insulin.id} insulin={insulin} onPick={handlers.onPick} />
              ))}
            </div>
          </div>
        );
      })}

      {/* A real answer with its own heading, not a link in small print. Someone
          who cannot find their insulin here is the reader most at risk of
          tapping the nearest-looking name, so the alternative has to be as
          easy to reach as the rows above it. */}
      <div class="insulin-group">
        <h2>{COPY.insulin.unknownHeading}</h2>
        <p class="hint">{COPY.insulin.unknownNote}</p>
        <div class="list">
          {/* CENTRED, unlike every row above it, and the difference is the
              point. Those are a scannable column of names — you read down the
              left edge. This is not a name and not part of that scan: it is an
              action, under its own heading, and left-aligned against a column
              of brands it read as an unfinished row rather than a deliberate
              alternative. Reported by Momin off a screenshot. */}
          <Button
            class="go quiet insulin sole"
            onPress={() => {
              handlers.onPick(UNKNOWN_INSULIN);
            }}
          >
            <span class="brand">{COPY.insulin.unknownLabel}</span>
          </Button>
        </div>
      </div>

      <p class="hint">{COPY.insulin.required}</p>
      {handlers.onCancel === null ? null : (
        <div class="sheet">
          <Button class="go quiet" onPress={handlers.onCancel}>
            {COPY.back}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The echo. It restates the CLASS FACTS rather than the name just tapped:
 * re-reading your own choice confirms nothing, and the facts are what a
 * cross-class mispick contradicts.
 */
function Echo({
  insulin,
  handlers,
}: {
  readonly insulin: Insulin;
  readonly handlers: InsulinHandlers;
}): JSX.Element {
  const COPY = useCopy();
  const wait = waitInWords(classEatDelay(insulin.insulinClass), COPY);
  return (
    <div class="screen">
      <h1>{COPY.insulin.confirmTitle(insulin.brand)}</h1>
      <div class="flag mint">
        <p>
          {COPY.insulin.confirmClass(
            COPY.insulin.classHeading(insulin.insulinClass),
            COPY.insulin.classNote(insulin.insulinClass),
          )}
        </p>
        {wait === null ? null : <p>{COPY.insulin.confirmWait(wait)}</p>}
        {wait === null ? null : <p class="hint">{COPY.insulin.confirmWaitEditable}</p>}
      </div>
      {/* The physical check, and the only one that catches the pick that
          matters. A premix or an NPH is a visible suspension; every mealtime
          insulin is a clear solution. */}
      <p>{COPY.insulin.confirmClear}</p>
      <div class="sheet">
        <Button
          class="go"
          onPress={() => {
            handlers.onConfirm(insulin.id);
          }}
        >
          {COPY.insulin.confirmYes}
        </Button>
        <Button class="go quiet" onPress={handlers.onBack}>
          {COPY.insulin.confirmChange}
        </Button>
      </div>
    </div>
  );
}

/** The echo for "I don't know", which has no class facts to restate. */
function UnknownEcho({ handlers }: { readonly handlers: InsulinHandlers }): JSX.Element {
  const COPY = useCopy();
  return (
    <div class="screen">
      <h1>{COPY.insulin.unknownLabel}</h1>
      <div class="flag">
        <p>{COPY.insulin.unknownNote}</p>
        <p>{COPY.settings.insulinNote(null)}</p>
      </div>
      <div class="sheet">
        <Button
          class="go"
          onPress={() => {
            handlers.onConfirm(UNKNOWN_INSULIN);
          }}
        >
          {COPY.insulin.confirmYes}
        </Button>
        <Button class="go quiet" onPress={handlers.onBack}>
          {COPY.insulin.confirmChange}
        </Button>
      </div>
    </div>
  );
}

/**
 * §8.5's two exits.
 *
 * **They are not the same screen, and giving them the same one was a defect.**
 * Premix is a DEAD END — there is no per-meal bolus to calculate, so there is
 * nothing to be right about. A background insulin is a WRONG TURN — the app
 * fits this reader perfectly, they answered a question about meals with the
 * other half of their own regimen, and the only thing the screen should do is
 * ask for the right half. `exitKindFor` decides which.
 *
 * **Both lead with what has NOT happened** when there is a record to lose.
 * Someone months into their own log who answers truthfully must not read the
 * next screen as the app taking it away — the same first sentence, for the same
 * reason, as the 404 page.
 *
 * Neither offers a way through. §7.4's gate has an override because the reader
 * can know better on the day; here there is no dose to override.
 */
export function InsulinUnsupportedScreen({
  insulin,
  hasRecord,
  handlers,
}: {
  readonly insulin: Insulin | null;
  /**
   * Whether there is anything logged. On a FIRST RUN there is not, and both
   * the reassurance and the way to open it would be about nothing — "nothing
   * has happened to your record" reads oddly to somebody who has never made
   * one, and it spends the reader's attention on the wrong sentence.
   */
  readonly hasRecord: boolean;
  readonly handlers: InsulinHandlers;
}): JSX.Element {
  const COPY = useCopy();
  const brand = insulin?.brand ?? '';
  const insulinClass = insulin?.insulinClass ?? 'premix';
  const wrongTurn = exitKindFor(insulinClass) === 'wrong_turn';
  const alsoDeadEnd = COPY.insulin.wrongTurnNoMealtime(insulinClass);

  return (
    <div class="screen">
      <h1>
        {wrongTurn
          ? COPY.insulin.wrongTurnTitle(brand)
          : COPY.insulin.unsupportedTitle(brand)}
      </h1>
      {hasRecord ? <p class="keep">{COPY.insulin.unsupportedRecord}</p> : null}
      {wrongTurn ? (
        <>
          <p>{COPY.insulin.wrongTurnBody(insulinClass)}</p>
          <p class="hint">{COPY.insulin.wrongTurnBasalNote}</p>
          {/* NPH's second reading, and it really is a dead end — said here
              rather than in a separate screen, because the app cannot tell the
              two apart and only the reader can. */}
          {alsoDeadEnd === null ? null : <p>{alsoDeadEnd}</p>}
        </>
      ) : (
        <>
          <p>{COPY.insulin.unsupportedBody}</p>
          <p>{COPY.insulin.unsupportedAlternative}</p>
        </>
      )}
      <div class="sheet">
        <Button class="go" onPress={handlers.onBack}>
          {wrongTurn ? COPY.insulin.wrongTurnAction : COPY.insulin.unsupportedChange}
        </Button>
        {hasRecord ? (
          <Button class="go quiet" onPress={handlers.onOpenRecord}>
            {COPY.insulin.unsupportedOpenRecord}
          </Button>
        ) : null}
      </div>
      {/* Only the dead end asks to hear about it. A wrong turn is not a gap in
          what the app covers — it is a reader one tap from the right answer,
          and inviting a bug report there would be noise for them and for us. */}
      {wrongTurn ? null : (
        <div class="flag">
          <p>{COPY.insulin.unsupportedFeedback}</p>
          <div class="list">
            <a class="go quiet" href={CONTACT_FORM_URL} target="_blank" rel="noreferrer">
              {COPY.insulin.contactForm}
            </a>
            <a class="go quiet" href={contactMailto(COPY)}>
              {COPY.insulin.contactEmail}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @param pending the row the reader has tapped but not confirmed. Null shows
 *   the list. Holding it OUTSIDE the stored settings is what makes the echo a
 *   real gate rather than a notification about a write that already happened.
 */
export function InsulinScreen({
  pending,
  hasRecord,
  handlers,
}: {
  readonly pending: string | null;
  readonly hasRecord: boolean;
  readonly handlers: InsulinHandlers;
}): JSX.Element {
  if (pending === null) return <Picker handlers={handlers} />;
  if (pending === UNKNOWN_INSULIN) return <UnknownEcho handlers={handlers} />;
  const insulin = INSULINS.find((row) => row.id === pending);
  // An id with no row cannot be echoed, so the list comes back rather than a
  // screen about an insulin nobody can name.
  if (insulin === undefined) return <Picker handlers={handlers} />;
  // A pick that cannot be calculated for goes STRAIGHT to the exit, with no
  // "yes, that's mine" in between: there is nothing to confirm, and a
  // confirmation button under it would read as a way through.
  if (!isMealtimeClass(insulin.insulinClass)) {
    return <InsulinUnsupportedScreen insulin={insulin} hasRecord={hasRecord} handlers={handlers} />;
  }
  return <Echo insulin={insulin} handlers={handlers} />;
}
