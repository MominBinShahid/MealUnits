/**
 * What a prompt bar is made of, and how one is painted.
 *
 * SPLIT OUT OF `main.ts` on 2026-09-28, and the reason is a defect this move
 * fixes rather than tidiness. `stale` and `write-failed` had just stopped being
 * Preact components rendered from `app.tsx` and become bars raised through the
 * slot — which is right, one thing owning the bottom edge — but it left the
 * app's two most safety-critical messages reachable only through a host hook.
 * A host that did not wire them was silently mute, and the integration tests
 * were exactly such a host: three of them went from asserting "the reader sees
 * that the dose did not save" to passing on an empty screen.
 *
 * The hooks are REQUIRED on `Host` now, so forgetting is a compile error. This
 * file is the other half: the shell and the tests wire the SAME painter and the
 * SAME spec builders, so a test cannot pass against a fake that drifted from
 * what a reader gets.
 */
import type { Copy } from './copy.js';

export interface BarSpec {
  readonly text: string;
  /**
   * The paragraph under the title, and the quiet line under THAT.
   *
   * Added 2026-09-28 with `stale` and `write-failed`. Those two were Preact
   * components with a title, a body and — for the failed write — a hint said
   * BEFORE its control, because starting over is the only repair from there
   * and it costs everything. Flattening that into one line to fit this shape
   * would have thrown away the sentence that stops someone tapping it. The
   * `.prompt-bar b` and `.prompt-bar p` rules already existed for them, so the
   * markup below is what the stylesheet was already dressed for.
   */
  readonly body?: string | undefined;
  readonly hint?: string | undefined;
  readonly actionLabel?: string | undefined;
  readonly onAction?: (() => void) | undefined;
  /** A second action in the halt colour, for one that destroys the record. */
  readonly dangerLabel?: string | undefined;
  readonly onDanger?: (() => void) | undefined;
  /**
   * Optional, because `stale` has nothing to dismiss to: its own note says
   * "there is nothing this tab can do… a button here would have to either lie
   * or do nothing". A bar with no dismiss holds the slot until the condition
   * clears, which for that one means the window being reopened — and an
   * install offer underneath it would be noise anyway.
   */
  readonly dismissLabel?: string | undefined;
  readonly variant?: 'warn' | 'stop' | undefined;
}

/**
 * Builds one bar and returns its close. Knows nothing about priority or the
 * queue — `reconcileBar` owns which bar exists, this owns what it looks like.
 *
 * `onGone` fires when the bar leaves for ANY reason the reader caused, so the
 * queue can hand the slot to the next one.
 */
export function paintBar(options: BarSpec, onGone: () => void): () => void {
  const bar = document.createElement('div');
  // ANNOUNCED, not just painted. The two panels this replaced carried
  // `role="alert"`; `paintBar` did not, so a reader using a screen reader got
  // no announcement when "That did not save." appeared — and the message is now
  // appended after `#app`, so in reading order it went from the first thing on
  // the page to the last. `alert` for the two that report a failure, `status`
  // for the rest: an install offer interrupting speech is not the same event as
  // a dose that is not in the record.
  bar.setAttribute('role', options.variant === 'stop' ? 'alert' : 'status');
  bar.className = options.variant === undefined ? 'prompt-bar' : `prompt-bar ${options.variant}`;

  const text = document.createElement('b');
  text.textContent = options.text;

  const action = options.actionLabel === undefined ? null : document.createElement('button');
  if (action !== null) {
    action.type = 'button';
    action.className = 'go';
    action.textContent = options.actionLabel ?? '';
  }

  const body = options.body === undefined ? null : document.createElement('p');
  if (body !== null) body.textContent = options.body ?? '';

  const hint = options.hint === undefined ? null : document.createElement('p');
  if (hint !== null) {
    hint.className = 'hint';
    hint.textContent = options.hint ?? '';
  }

  const danger = options.dangerLabel === undefined ? null : document.createElement('button');
  if (danger !== null) {
    danger.type = 'button';
    // `classList`, not a `'go danger'` string: the text check walks `src/ui`
    // and reads a two-word literal as prose. Two tokens, each its own word.
    // (`'go quiet'` below survives only because it is in `UI_TEXT_OK`.)
    danger.classList.add('go', 'danger');
    danger.textContent = options.dangerLabel ?? '';
  }

  const dismiss = options.dismissLabel === undefined ? null : document.createElement('button');
  if (dismiss !== null) {
    dismiss.type = 'button';
  // A LINK beside a real action, a BUTTON when it is the only control. The
  // quiet link reads as secondary next to "Add it"; alone in the bar it reads
  // as text nobody thought to style, and the one thing a person can do here
  // stops looking like a thing they can do.
    dismiss.className = options.actionLabel === undefined ? 'go quiet' : 'link';
    dismiss.textContent = options.dismissLabel ?? '';
  }

  const close = (): void => {
    bar.remove();
    // Only ever one bar, so the padding belongs to the slot and clearing it
    // here is now correct. It was not when bars could overlap: whichever closed
    // first un-padded the page while another was still on screen.
    document.documentElement.style.removeProperty('--prompt-h');
  };

  action?.addEventListener('click', () => {
    close();
    onGone();
    options.onAction?.();
  });
  /**
   * DISMISSAL IS IN MEMORY AND NOTHING ELSE. It is gone for this session and
   * returns on the next launch.
   *
   * Persisting it would let one tap suppress a version's prompt forever, which
   * is the "acknowledgement dropped, value kept" state §7.9 refuses elsewhere.
   * And it costs nothing to omit: the waiting worker activates on the next full
   * restart regardless, so dismissing defers the tap rather than the update.
   */
  dismiss?.addEventListener('click', () => {
    close();
    onGone();
  });

  danger?.addEventListener('click', () => {
    close();
    onGone();
    options.onDanger?.();
  });

  // Title, body, hint, then the controls — the hint BEFORE the danger control
  // it warns about, which is the order the panel it replaced used and the
  // reason that panel said the sentence at all.
  bar.append(...[text, body, hint, action, dismiss, danger]
    .filter((node): node is HTMLElement => node !== null));
  document.body.append(bar);
  // Measured after insertion, because the text wraps differently by width.
  document.documentElement.style.setProperty('--prompt-h', `${String(bar.offsetHeight)}px`);
  return close;
}

/**
 * The three host hooks that raise a bar, built once and used by both the shell
 * and the tests.
 *
 * `getCopy` rather than a `Copy`, because a bar raised before the database is
 * read is raised in English and the language arrives later — the redraw in
 * `main.ts` repaints whatever is standing.
 */
export function barHooks(
  raise: (kind: 'stuck' | 'stale' | 'write-failed', spec: BarSpec) => void,
  retire: (kind: 'stuck' | 'stale' | 'write-failed') => void,
  getCopy: () => Copy,
  /**
   * How a standing bar re-reads its words when the language changes.
   *
   * These three were NOT in the redraw map, and the comment here used to claim
   * they were. Before the move they were Preact components reading `useCopy()`,
   * so they followed a language change for free; after it they were built from
   * words read once at raise time and never again. A failed write, then Settings
   * → Urdu, and the bar stayed in English over an Urdu interface — which is the
   * exact defect this project already shipped once with the install bar.
   *
   * Each hook registers a closure that raises ITSELF again, so the repaint goes
   * through the same builder rather than a second copy of the spec.
   */
  onRedraw: (kind: 'stuck' | 'stale' | 'write-failed', paint: () => void) => void,
): {
  readonly onStale: (show: boolean, unsaved: string | null) => void;
  readonly onWriteFailed: (show: boolean, startOver: () => void) => void;
  readonly onSaveStuck: (amount: string, retry: () => void) => void;
} {
  return {
    onStale: (show, unsaved) => {
      if (!show) { retire('stale'); return; }
      const paint = (): void => {
        const copy = getCopy();
        raise('stale', {
          text: copy.staleConnection.title,
          // "Nothing has been lost" is true when the only casualty is this
          // tab's connection. It is false when a dose is sitting unwritten in
          // memory, because the bar's own advice — close and reopen — is what
          // destroys it, and the next session's stacking check will not see a
          // dose that never reached the record.
          body: unsaved === null
            ? copy.staleConnection.body
            : copy.staleConnection.unsavedBody(unsaved),
          variant: 'stop',
        });
      };
      onRedraw('stale', paint);
      paint();
    },
    onWriteFailed: (show, startOver) => {
      if (!show) { retire('write-failed'); return; }
      const paint = (): void => {
        const copy = getCopy();
        raise('write-failed', {
        text: copy.writeFailed.title,
        body: copy.writeFailed.body,
        hint: copy.writeFailed.startOverHint,
        dismissLabel: copy.writeFailed.dismiss,
        dangerLabel: copy.failClosed.escape,
          onDanger: startOver,
          variant: 'stop',
        });
      };
      onRedraw('write-failed', paint);
      paint();
    },
    onSaveStuck: (amount, retry) => {
      const paint = (): void => {
        const copy = getCopy();
        raise('stuck', {
        text: copy.log.stuck(amount),
        actionLabel: copy.log.stuckAction,
        onAction: retry,
          dismissLabel: copy.log.stuckDismiss,
        });
      };
      onRedraw('stuck', paint);
      paint();
    },
  };
}
