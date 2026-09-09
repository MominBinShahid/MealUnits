/**
 * The entry point: it builds the `Host` — the four things the app cannot do
 * without a browser — and starts.
 *
 * Everything platform-specific is here, so the rest of `src/ui` can be read and
 * tested without one.
 */

import './ui/styles.css';
import { start } from './ui/app.js';
import {
  COMMIT_BUZZ_MS,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_LOOK_ATTEMPTS,
  UPDATE_LOOK_INTERVAL_MS,
} from './config.js';
import { COPY } from './ui/copy.js';

/**
 * §12 — `persist()` is three lines: call it and SURFACE `persisted()` HONESTLY.
 *
 * And §12's warning: "**do not treat private-mode detection as a dependable
 * gate.** There is no supported detection contract, and A SUCCESSFUL WRITE DOES
 * NOT PROVE PERSISTENCE. Report storage capability honestly; never label a
 * successful write as durable."
 *
 * So this asks, records the answer, and claims nothing further.
 */
async function askForPersistence(): Promise<boolean> {
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * §7.7.1 — "a download resolving proves THE DOWNLOAD WAS STARTED. It is the
 * strongest signal the platform offers, and it is still not completion — a
 * download can be cancelled or fail afterwards, and nothing reports that back."
 *
 * The counter that reads this says only what this function knows.
 */
function download(name: string, type: string, contents: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next turn, so the download has taken its reference.
  setTimeout(() => { URL.revokeObjectURL(url); }, 0);
}

function pickFile(): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      void file.text().then(resolve, () => { resolve(null); });
    });
    input.addEventListener('cancel', () => { resolve(null); });
    input.click();
  });
}

/**
 * §11.4 — the prompt protocol, page side, including **waiting-worker detection
 * at startup**: a worker can already be waiting when the page loads, and a page
 * that only listens for `updatefound` never notices.
 */

/**
 * §11.4's prompts, as ONE component — the update offer and the install offer
 * were two copies of the same markup with the same two defects.
 *
 * **It was prepended to `<body>`, so it displaced the entire page downward.**
 * Momin reported it as the app being pushed off centre. A prompt is an
 * interruption; it should sit over the page, not rearrange it.
 *
 * **Fixed to the FOOT, not the head.** Same argument that moved Settings and
 * History: the top of a one-handed phone is the hardest place to reach, and
 * this is a control the user is being asked to act on.
 *
 * **The page keeps its own bottom clear.** A fixed bar at the bottom would sit
 * on top of the primary action — "Work out the dose", "Log this injection" —
 * which is the one control it must never cover. So the bar's height is
 * published as a custom property and `#app` pads by it while a prompt is up.
 * That is the difference between overlaying the PAGE and overlaying a BUTTON.
 */
function promptBar(options: {
  readonly text: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly dismissLabel: string;
}): void {
  const bar = document.createElement('div');
  bar.className = 'prompt-bar';

  const text = document.createElement('b');
  text.textContent = options.text;

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'go';
  action.textContent = options.actionLabel;

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'link';
  dismiss.textContent = options.dismissLabel;

  const close = (): void => {
    bar.remove();
    document.documentElement.style.removeProperty('--prompt-h');
  };

  action.addEventListener('click', () => {
    close();
    options.onAction();
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
  dismiss.addEventListener('click', close);

  bar.append(text, action, dismiss);
  document.body.append(bar);
  // Measured after insertion, because the text wraps differently by width.
  document.documentElement.style.setProperty('--prompt-h', `${String(bar.offsetHeight)}px`);
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  let offered = false;
  const offer = (waiting: ServiceWorker): void => {
    // `offerIfReady` is called from four places on purpose. Idempotent, or the
    // page grows a stack of identical bars.
    if (offered) return;
    offered = true;
    promptBar({
      text: 'A newer version is ready.',
      actionLabel: 'Use it now',
      onAction: () => { waiting.postMessage({ type: 'SKIP_WAITING' }); },
      dismissLabel: 'Later',
    });
  };

  /**
   * Runs on `load`, or IMMEDIATELY if load has already happened.
   *
   * `window.addEventListener('load', ...)` alone never fires when the document
   * is already complete by the time this module executes — and on a revisit
   * served entirely from the service-worker cache, that is exactly what can
   * happen. Diagnosed by exposing the registration callback's own state: on a
   * first visit it reported `reachedThen: true` with eight looks; on a revisit
   * it reported NOTHING AT ALL. The handler had never run, so nothing
   * registered, nothing checked for an update, and no prompt could appear —
   * which is why a phone stayed on the build it first cached.
   */
  const whenLoaded = (run: () => void): void => {
    if (document.readyState === 'complete') {
      run();
      return;
    }
    window.addEventListener('load', run);
  };

  whenLoaded(() => {
    // Read BEFORE registering. `controllerchange` fires both when a NEW worker
    // replaces an old one — the case §11.4's reload exists for — and when the
    // very FIRST worker claims a page that had none. Only the first of those
    // needs a reload.
    const hadController = navigator.serviceWorker.controller !== null;
    let lastUpdateCheck = Date.now();

    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        /**
         * ONE place that decides whether to offer, called from every point a
         * new worker can become available — because each of them alone misses
         * cases:
         *
         *   * at registration, `waiting` is usually null: the update has not
         *     run yet.
         *   * `updatefound` reads `registration.installing`, which can ALREADY
         *     have moved on to `waiting` by the time the handler runs.
         *
         * Measured: a revisit after a new build reported `waiting: "installed"`
         * — the worker was there and ready — and no prompt appeared, because
         * every individual hook had looked at the wrong moment. So the check is
         * idempotent and is run repeatedly instead of being placed perfectly.
         */
        const offerIfReady = (): void => {
          const next = registration.waiting;
          // `controller` is the guard against offering on a FIRST install,
          // where there is no previous version to replace (see note 44).
          if (next && navigator.serviceWorker.controller) offer(next);
        };
        offerIfReady();

        /**
         * And LOOK, rather than trusting an event to fire at a useful moment.
         *
         * Every hook above can miss. At registration `waiting` is usually null;
         * `updatefound` may fire before this code runs; `installing` can already
         * have moved to `waiting`; and `update()` can resolve while the new
         * worker is still installing. Measured with all four wired:
         * `waiting: "installed"` and **no prompt on screen** — the worker was
         * ready and nothing had looked at the right time.
         *
         * `registration.waiting` is directly observable, so this looks at it a
         * bounded number of times and stops. Polling is the crude answer and it
         * is the one that cannot miss, which for the mechanism that tells a
         * person their dosing app is out of date is the right trade.
         */
        let looks = 0;
        const watch = setInterval(() => {
          looks += 1;
          offerIfReady();
          if (offered || looks >= UPDATE_LOOK_ATTEMPTS) clearInterval(watch);
        }, UPDATE_LOOK_INTERVAL_MS);

        /**
         * ASK. Registering does not check whether a newer worker exists, and
         * §11.4's prompt protocol is worthless if nothing ever triggers it.
         *
         * Measured: install a build, ship a new one, revisit — `waiting` and
         * `installing` were both null. Nothing had asked, so the new worker was
         * not even installing yet, and the offer could not exist.
         *
         * This does NOT mean a cached build is permanent — an earlier version of
         * this comment claimed that and it was wrong. A waiting worker activates
         * once every client is gone, so closing and reopening the app delivers
         * the new build (measured; see BACKLOG T4). What the check buys is
         * NOTICING SOONER, without waiting for a navigation that an installed
         * PWA may not make for a long time.
         *
         * The browser does check on a navigation within scope, but an INSTALLED
         * PWA is opened and left open — it may go days without one, which is
         * exactly the case this app is built for.
         */
        void registration.update().then(offerIfReady, () => {
          // Offline, most likely. §10.8 — never gate the app on connectivity.
        });
        document.addEventListener('visibilitychange', () => {
          // On coming back to the app, which is when a phone actually resumes.
          // Throttled, because this fires on every tab switch and each call is
          // a network request.
          if (document.visibilityState !== 'visible') return;
          const now = Date.now();
          if (now - lastUpdateCheck < UPDATE_CHECK_INTERVAL_MS) return;
          lastUpdateCheck = now;
          void registration.update().then(offerIfReady, () => { /* offline */ });
        });
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          // Already past `installing`; `offerIfReady` will see it in `waiting`.
          if (!installing) {
            offerIfReady();
            return;
          }
          installing.addEventListener('statechange', offerIfReady);
        });
      })
      .catch(() => {
        // §10.8 — never gate the app on this. The math is local, and an app that
        // will not open offline is a worse outcome than one without an update
        // prompt.
      });

    // The activation acknowledgement: the new worker took control, so reload
    // once onto a coherent set of HTML, assets and worker (§11.4).
    //
    // GUARDED, and the guard is the whole point. Without `hadController` this
    // also fired on a FIRST visit, when the initial worker claims a page that
    // had no controller — and then the app reloaded ITSELF mid-session, for
    // nothing. Measured: a cold profile recorded TWO document loads, a warm one
    // recorded one.
    //
    // What that looked like in use: tap "Log this injection", and if the reload
    // landed on that moment the screen went blank and the tap appeared to be
    // ignored. The row was written — the reload just threw away the screen that
    // would have said so. Momin reported it as the app being stuck on his
    // phone, and the console was clean because nothing had gone wrong.
    //
    // On a first visit there is nothing incoherent to fix: the page already
    // loaded the assets it was served, and the worker has only just started
    // caching them. §11.4 wants coherence AFTER AN UPDATE, which is exactly
    // what `hadController` distinguishes.
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}

/**
 * §12 — the install prompt is **DOWNGRADED TO A LIGHT TOUCH**: "an ordinary
 * `beforeinstallprompt` flow rather than an onboarding gate."
 *
 * Version 1 gated onboarding on installing first, for two reasons that §12
 * establishes **do not apply to this user**: Android Chrome does not evict
 * storage after seven days, and its generated package shares origin storage, so
 * data does transfer on install. Both facts were iOS facts.
 */
function offerInstall(): () => void {
  let pending: (Event & { prompt: () => Promise<void> }) | null = null;
  let shown = false;

  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep it from appearing on its own; offer it where he can see it, at a
    // moment when it is not standing on top of something that matters.
    event.preventDefault();
    pending = event as Event & { prompt: () => Promise<void> };
  });

  return (): void => {
    const prompt = pending;
    if (prompt === null || shown) return;
    shown = true;
    promptBar({
      text: 'Add this to your home screen?',
      actionLabel: 'Add it',
      onAction: () => { void prompt.prompt(); },
      dismissLabel: 'Not now',
    });
  };
}

/**
 * §10.7 — the Android back gesture, made to mean "back inside the app".
 *
 * In an installed PWA the system back button and the edge swipe otherwise CLOSE
 * THE APP, and people use that gesture reflexively — losing a half-entered
 * reading to it is the kind of thing that gets an app abandoned.
 *
 * The mechanism is ONE sentinel history entry, held exactly while the app has
 * somewhere to go back to:
 *
 *   * back-ability false -> true: push the sentinel.
 *   * the gesture fires: the browser has already popped it, so run the app's
 *     back action; `render` then re-pushes if there is still further to go.
 *   * back-ability true -> false: NOTHING. The sentinel is left where it is.
 *
 * That last rule was `history.back()` and it was a real defect. The intent was
 * to tidy a spent entry; the effect was a navigation driven by this module's own
 * bookkeeping, and when the bookkeeping was off by one it walked PAST the app.
 * Traced with `Page.frameNavigated`: tapping "Log this injection" reached the
 * logged screen, which has no back path, and the resulting `history.back()`
 * navigated to `about:blank`. The row was written; the app was simply gone. On a
 * phone that is "the app closed when I logged a dose", and it reproduced about
 * one time in three, which is why it read as flaky rather than as broken.
 *
 * The cost of leaving the entry is that one back press after reaching a
 * no-back screen is absorbed doing nothing, and the next one leaves the app.
 * **A press that does nothing is a wart; a press that closes the app while
 * recording an injection is a defect.** Never navigate on your own accounting.
 *
 * `pushState` is called with the CURRENT url. Nothing is written to the URL and
 * there are no deep links, so §11.5's "Routing: None" holds — what it rules out
 * is URL state, and this is a stack entry with no state in it.
 */
function hardwareBack(): {
  setCanGoBack: (can: boolean) => void;
  onHardwareBack: (handler: () => void) => void;
} {
  let sentinel = false;
  let handler: (() => void) | null = null;

  window.addEventListener('popstate', () => {
    // The browser has already popped our entry by the time this runs.
    sentinel = false;
    // `handler` asks the app to go back and does nothing if it cannot, and the
    // render that follows re-pushes only if there is still somewhere to go. So
    // a press on a no-back screen is absorbed, and the next one leaves the app.
    handler?.();
  });

  return {
    setCanGoBack: (can) => {
      // PUSH ONLY. There is deliberately no branch for `!can` — see above.
      if (can && !sentinel) {
        history.pushState(null, '', location.href);
        sentinel = true;
      }
    },
    onHardwareBack: (next) => {
      handler = next;
    },
  };
}

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  void askForPersistence();
  registerServiceWorker();
  const showInstallOffer = offerInstall();
  void start({
    root,
    now: () => Date.now(),
    // The device's zone. See BUILD-NOTES.md — whether this or a fixed
    // Asia/Karachi is right is open until the record outlives the phone.
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    appVersion: __APP_VERSION__,
    buildId: __BUILD_ID__,
    download,
    pickFile,
    /**
     * §7.2 — the commit buzz. Feature-detected because the fallback is
     * genuinely fine: no vibration at all, with the screen still saying what
     * happened. That is the case where detection earns its keep, unlike
     * `crypto.randomUUID` where it would only have hidden a defect.
     *
     * iOS Safari does not implement this and will simply not buzz.
     */
    buzz: () => {
      if (typeof navigator.vibrate !== 'function') return;
      try {
        navigator.vibrate(COMMIT_BUZZ_MS);
      } catch {
        // Some browsers throw without a prior user gesture. The tap that got
        // here IS one, but a confirmation must never be able to break a commit.
      }
    },
    scrollY: () => window.scrollY,
    scrollTo: (y) => { window.scrollTo(0, y); },
    ...hardwareBack(),
    onSettled: showInstallOffer,
  }).catch((cause: unknown) => {
    root.textContent = `${COPY.appName} could not start: ${String(cause)}`;
  });
}
