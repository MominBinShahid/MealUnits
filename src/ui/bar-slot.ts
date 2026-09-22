/**
 * §10.5 — one bar at a time, chosen by priority, the rest queued.
 *
 * **They used to overlap rather than stack.** Every bar is `position: fixed;
 * bottom: 0`, and the old code appended, so a second bar was painted directly
 * OVER the first and hid it completely. That is the likeliest reason an update
 * offer never reached Momin: raised, then covered by the storage bar, with no
 * way to know it had ever been there.
 *
 * A second symptom came from the same cause. `--prompt-h` is the padding that
 * stops a bar covering page content; it was set by whichever bar was built last
 * and REMOVED when any bar closed, so dismissing the top one un-padded the page
 * while another was still on screen.
 *
 * **Replacing rather than queueing would be the wrong fix.** It throws a
 * message away, and these are not interchangeable: "a dose is still not saved"
 * must not be lost because an update happened to land at the same moment.
 *
 * Kept free of the DOM deliberately. What is hard here is the ORDER, and order
 * is what a test can pin — `main.ts` owns pixels, this owns which message wins.
 */

/**
 * Highest priority first, and this order is a HAZARD order rather than a
 * preference.
 *
 * `stuck` leads because an unrecorded dose is live harm: §7.2's write failed
 * AND its automatic retry failed, so the dose is not in the record and the
 * stacking check cannot see it. `update` next — a newer build may be fixing a
 * calculation, which is a latent wrong number against the stuck bar's actual
 * one. `install` last: it is about a record that may be deleted next week.
 */
export const BAR_ORDER = ['stuck', 'update', 'install'] as const;

export type BarKind = (typeof BAR_ORDER)[number];

export interface BarSlot<Spec> {
  /** Offer a bar. It takes the slot only if nothing higher is waiting. */
  readonly raise: (kind: BarKind, spec: Spec) => void;
  /**
   * Withdraw a bar the app no longer wants shown — whether or not it is the
   * visible one. Retiring the visible bar hands the slot to the next in line.
   */
  readonly retire: (kind: BarKind) => void;
  /** The bar occupying the slot, for tests and for reasoning about state. */
  readonly showing: () => BarKind | null;
}

/**
 * `paint` puts a bar on screen and returns the function that removes it. It is
 * handed `gone`, to be called when the READER finishes with the bar — by acting
 * on it or dismissing it — which is what frees the slot.
 */
export function createBarSlot<Spec>(
  paint: (spec: Spec, gone: () => void) => () => void,
): BarSlot<Spec> {
  const queued = new Map<BarKind, Spec>();
  let showing: BarKind | null = null;
  let close: (() => void) | null = null;

  const reconcile = (): void => {
    const next = BAR_ORDER.find((kind) => queued.has(kind)) ?? null;
    if (next === showing) return;

    // Taken off screen because something higher arrived — NOT removed from the
    // queue. It returns when the one above it is answered, which is the whole
    // difference between a queue and a replacement.
    close?.();
    close = null;
    showing = null;

    if (next === null) return;
    const spec = queued.get(next);
    if (spec === undefined) return;

    showing = next;
    close = paint(spec, () => {
      // Answered or dismissed: finished with, and out of the queue.
      queued.delete(next);
      showing = null;
      close = null;
      reconcile();
    });
  };

  return {
    /**
     * Raise a bar, or REPLACE the words of one already on screen.
     *
     * `reconcile` returns early when the winner has not changed, which is right
     * for the queue and wrong for the spec: re-raising the bar that is showing
     * used to update the queue and leave the painted text alone. Two things
     * depended on that being wrong —
     *
     *   §7.2's stuck-dose bar is raised again when a RETRY fails, with a
     *   different amount, and kept displaying the first one.
     *
     *   `10a`'s language switch re-raises whatever is standing so its words
     *   follow the choice. The install offer sat in English on an Urdu screen on
     *   the deployed build, which is how this was found.
     *
     * So a re-raise of the showing kind tears it down first. A re-raise of any
     * other kind still only queues, because taking a bar down to queue one
     * BEHIND it is the replacement behaviour this slot exists to prevent.
     */
    raise: (kind, spec) => {
      const replacing = showing === kind;
      queued.set(kind, spec);
      if (replacing) {
        close?.();
        close = null;
        showing = null;
      }
      reconcile();
    },
    retire: (kind) => {
      queued.delete(kind);
      reconcile();
    },
    showing: () => showing,
  };
}
