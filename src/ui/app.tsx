/**
 * The shell: it opens the record, holds the state, performs the effects, and
 * renders. It makes no dosing decision of its own — every number on screen came
 * from the core, and every transition came from the reducer.
 *
 * §11.2's warning is what this file is arranged against: "the danger is not a
 * wrong dose but the repair an implementer reaches for — computing provenance in
 * the shell at render time, which puts safety-display logic outside the tested
 * core." Nothing here derives a band, a baseline or a provenance. It reads them.
 */

import { render as mount } from 'preact';
import { ROUTES, pathForScreen, screenForPath, titleForScreen } from '../routes.js';
import type { JSX } from 'preact';
import {
  ADVISORY_MIN_ELIGIBLE,
  JSON_INDENT,
  MS_PER_MINUTE,
  RANGE,
  TEXT_SCALE_DEFAULT,
} from '../config.js';
import { deriveBandEFullCardShownRecently, deriveHistory } from '../core/history.js';
import { evaluateCarbAdvisory } from '../core/baseline.js';
import { divergesFromCalculated } from '../core/divergence.js';
import { formatHundredths, hundredthsFromGrammarText } from '../core/decimal.js';
import { parseField, applyKeystroke } from '../core/parse.js';
import { modeNeedsAcknowledgement } from '../core/round.js';
import { classOf } from '../core/insulin.js';
import { INSULINS } from '../data/insulins.js';
import { InsulinScreen, InsulinUnsupportedScreen } from './screens/insulin.js';
import type { Injection, Language, Reading, RoundingMode, Settings, UrduFace } from '../core/types.js';
import { buildEnvelope, parseEnvelope } from '../storage/envelope.js';
import { importEnvelope } from '../storage/importer.js';
import { deleteDatabase, openDatabase, readRecoveryBlock } from '../storage/open.js';
import type { RecoveryBlock } from '../storage/schema.js';
import { buildReadableExport } from '../storage/readable.js';
import {
  ackKeys,
  acknowledge,
  appendInjection,
  appendReading,
  clearCalibration,
  clearTheRecord,
  commitSettings,
  deleteLogRow,
  deleteReading,
  readAll,
  recordJsonExport,
  writeCalibration,
  writeDisplay,
  writeDosingHistory,
  writeLanguage,
} from '../storage/repo.js';
import type { StoredState } from '../storage/repo.js';
import { stateToken, watchForChanges } from '../storage/sync.js';
import { initialState, reduce } from '../state/machine.js';
import type { Action, AppState, FrozenLogPayload, RecordContext } from '../state/machine.js';
import { formatDate, localDayKey } from '../core/calendar.js';
import { newId } from '../core/ids.js';
import { FoodListScreen } from './screens/foods.js';
import { COPY, CopyContext } from './copy.js';
import type { Copy } from './copy.js';
import { COPY_UR } from './copy-ur.js';
import { DEFAULT_FACE, DEFAULT_LANGUAGE, documentAttributes } from './language.js';
import { Button, GlossaryPanel } from './components.js';
import { CalculatorScreen } from './screens/calculator.js';
import { deriveThreshold } from '../core/threshold.js';
import { draftFrom, SettingsScreen } from './screens/settings.js';
import type { SettingsDraft } from './screens/settings.js';
import {
  ClearScreen,
  DisclaimerScreen,
  ExportScreen,
  FailClosedScreen,
  HistoryScreen,
  StaleConnectionPanel,
  WriteFailedPanel,
  HowItWorksScreen,
  SettingsAsTextScreen,
} from './screens/misc.js';

/**
 * Transient interface state, deliberately OUTSIDE the reducer.
 *
 * §11.2 asks for one explicit application state, and the thing it is protecting
 * is the dose: "one event updating the dose while another leaves the breakdown,
 * the warning or a saved setting stale". None of the fields below can change a
 * dose, a band or a gate — they decide which confirmation is open and whether a
 * disclosure is expanded. Putting them through the tested reducer would mean
 * every dose test carried a dialog flag.
 */
interface ViewState {
  draft: SettingsDraft;
  /**
   * True while §6.2's threshold is still the one `deriveThreshold` worked out.
   * Goes false for good the first time the user edits that field, so their own
   * number is never recomputed out from under them.
   */
  thresholdIsDerived: boolean;
  disclaimerChecked: boolean;
  moreExpanded: boolean;
  /** §4.5 — the HI/LO guidance disclosure on the reading screen. */
  meterGuidanceShown: boolean;
  /**
   * §7.1 — which amount-gate answer is on screen. Safe OUTSIDE the reducer
   * for the same reason `pendingDelete` is: `commitLog` re-runs the gate on
   * every commit tap, so these flags decide what is rendered and can never
   * bypass the check itself.
   */
  amountProblem: 'zero' | 'over_cap' | null;
  amountDiverging: boolean;
  pendingDelete: string | null;
  clearConfirming: 'record' | 'startOver' | null;
  /**
   * `10a` — the Urdu face awaiting confirmation, or `null`.
   *
   * A face rather than a boolean, because the tap that raises the warning is
   * the tap that says WHICH of the four she chose, and losing it would mean
   * asking her twice.
   *
   * Here in ViewState rather than in the reducer for the reason the rest of
   * this object is: it is a half-finished gesture on one screen, and nothing
   * about a dose depends on it.
   */
  confirmingUrdu: UrduFace | null;
  failClosedConfirming: boolean;
  failClosedBlocked: boolean;
  readingNote: Reading['note'] | undefined;
  /** §6.7 — the answer as typed. Never written until he taps save. */
  dosingDraft: string;
  decliningDosing: boolean;
  screenBefore: AppState['screen'];
  /**
   * The food-list search box. Outside the reducer with the rest of ViewState
   * because it changes no dose, band or gate — only which rows are on screen.
   */
  foodQuery: string;
  /**
   * Which food group is open, or null for all closed. ONE at a time, and that
   * is the whole mechanism: 320 rows is 63 phone screens, and the biggest
   * single group is 47 rows. Allowing two open would already be worse than any
   * screen in the app.
   *
   * Outside the reducer for the reason the block above gives — it decides what
   * is rendered and can never reach a calculation.
   */
  openFoodGroup: string | null;
  /**
   * Phase 3's tally: how many of each food, keyed by `Food.id`.
   *
   * BACKLOG 19 required a ruling before this existed, and the ruling's first
   * answer is the one this shape has to honour — the total arrives as a number
   * the reader confirms, never as a committed value.
   *
   * It lives here rather than in the snapshot, and the drift the snapshot was
   * meant to prevent is prevented a cheaper way: EVERY PATH THAT REPLACES THE
   * CARBOHYDRATE FIGURE ALSO CLEARS THIS. There are four — a keypad digit, a
   * backspace, starting the next calculation, and starting over entirely.
   *
   * The first version named only the keypad and asserted "there is no third
   * state where they disagree". There was: `new_calculation` blanked the input
   * and left the tally, so breakfast's rotis were still counted at lunch and
   * the app dosed five units where one was right. An audit found it; no test
   * had. The lesson is that "every path" is a claim about a SET, and a comment
   * that names one member of the set has not checked it.
   */
  foodTally: Record<string, number>;
  /** Phase 2 — which row has its "what does mine weigh" field open, or null. */
  editingMine: string | null;
  /**
   * WHAT THE READER HAS TYPED into that field, character for character.
   *
   * The field used to render `String(saved.grams)` straight back. Typing `22.5`
   * was therefore impossible: at the keystroke after `22`, `Number('22.')` is
   * `22`, the save round-tripped, and the re-render replaced `22.` with `22` —
   * the decimal point was eaten every time, and the field looked broken rather
   * than restrictive. A half-gram is a real carbohydrate figure, so the fix is
   * to let the text and the number disagree while the reader is mid-number.
   *
   * The DRAFT is what the field shows; the parsed number is what gets saved,
   * and only when it parses. Presentation state, so it lives out here.
   */
  mineDraft: string;
  /** Whether the "put them all back" confirm is showing. */
  resettingMine: boolean;
  /**
   * Which hard word is open, or null. ONE at a time — the panel explains the
   * word you tapped, and two open would be two answers to one question.
   *
   * Outside the reducer with the rest of the presentation flags: it decides
   * what is rendered and can never reach a calculation.
   */
  glossaryTerm: string | null;
  /**
   * §7.9 v23 — another tab deleted the record, so this one is re-booting into
   * the first-run gate. Outside the reducer with the rest of ViewState: it
   * changes no dose, band or gate, only what the loading screen says while the
   * database is being reopened.
   */
  recordDeletedElsewhere: boolean;
  /**
   * A write rejected, and the screen is going to say so — added 2026-09-21.
   *
   * Outside the reducer with the rest of `ViewState` for the usual reason: it
   * changes no dose, band or gate, only whether a panel is on screen. It is NOT
   * a fail-closed state — the app goes on working and the reader can carry on
   * or start over. What it must never do again is nothing at all.
   */
  writeFailed: boolean;
  /**
   * Another tab upgraded the database, so this tab's connection was closed and
   * every write here will now fail — added 2026-09-21.
   *
   * NOT dismissible, unlike `writeFailed`: dismissing it would leave someone
   * carrying on in a tab that cannot record anything, and the condition does
   * not improve until the app is reopened.
   */
  staleConnection: boolean;
  /**
   * §8.5 — the insulin row the reader has TAPPED but not yet confirmed.
   *
   * Outside the reducer with the rest of `ViewState`, and safe there for the
   * reason `pendingDelete` is: it decides which of the picker's three faces is
   * on screen and can never become a stored answer on its own. Only
   * `onConfirm` writes, and it writes the id it is handed.
   */
  pendingInsulin: string | null;
}

/**
 * §8.5 — the name on the vial for a stored id, and `''` for everything else.
 *
 * `''` rather than a placeholder because it feeds the recovery block, which a
 * person copies off a screen and types back in. "Not recorded" written into
 * that block would come back on the next import as an insulin name.
 */
function brandFor(id: string): string {
  return INSULINS.find((row) => row.id === id)?.brand ?? '';
}

/**
 * The deployed path, injected at build time from `vite.config.ts`'s `BASE` —
 * the one constant a domain move changes. `T15` records the fifteen places that
 * still spell it out by hand; these four routes deliberately add none of them.
 */
const BASE_PATH = __SCOPE_PATH__;

/** The screens with an address, as a set, for the reverse question. */
const ROUTABLE = new Set<string>(ROUTES.map((route) => route.screen));

export interface Host {
  readonly root: HTMLElement;
  readonly now: () => number;
  readonly timeZone: string;
  readonly indexedDB?: IDBFactory | undefined;
  readonly appVersion: string;
  readonly buildId: string;
  readonly download: (name: string, type: string, contents: string) => void;
  readonly pickFile: () => Promise<string | null>;
  /**
   * Reading and writing the page's scroll offset. On the Host rather than
   * reached for directly, for the same reason `now` is: `src/ui` is driven by a
   * jsdom harness in `test/integration.test.ts`, and a module that calls
   * `window` on its own is a module that harness cannot steer.
   */
  readonly scrollY: () => number;
  readonly scrollTo: (y: number) => void;
  /**
   * The device's own back gesture. On Android that is the system button or the
   * edge swipe, and in an installed PWA it otherwise CLOSES THE APP — so a
   * half-entered reading is lost to a gesture people use reflexively.
   *
   * On the Host rather than reached for directly, for the same reason `now` is:
   * `src/ui` is driven by a jsdom harness, and a module that reaches for
   * `window.history` on its own cannot be steered by that harness.
   *
   * §11.5's "Routing: None" is not violated. Nothing is written to the URL,
   * there are no deep links and `start_url` is untouched — what §11.5 rules out
   * is URL STATE, and this is a same-document stack entry whose only job is to
   * give the gesture something to consume.
   */
  /**
   * §7.2 — a single buzz when the row is COMMITTED, chosen over a sound.
   *
   * Momin asked about a sound first. Vibration is the better fit for the same
   * intent: it works with the phone on silent, it does not need a user gesture
   * to be permitted, and it cannot be missed in a noisy room. A sound would be
   * a confirmation that SOMETIMES does not happen, which is worse than none.
   *
   * It is never the only confirmation. The screen says "Logged 2 units at
   * 7:21 AM" regardless — a buzz is not readable, and this is a dosing record.
   * And it fires only AFTER the write resolves, because a buzz before the
   * transaction commits would be a lie about a dosing record.
   */
  readonly buzz: () => void;
  /**
   * BACKLOG 24 — the URL is a PROJECTION of `state.screen`, never a second copy
   * of it. `machine.ts` owns where the app is; this reports that outwards and
   * reports the browser's navigations back in. A router library would want to
   * own the answer too, and two owners of "where is the app" is the bug class
   * this project keeps refusing.
   *
   * `can` is whether there is anywhere to go back to, read from the same
   * `backAction` the on-screen control uses, so the gesture and the button can
   * never disagree.
   */
  /**
   * The document title, which a route's own HTML file cannot be relied on to
   * carry. The worker answers every in-scope navigation with the SHELL — that
   * is what makes the app work offline — so anyone with it installed receives
   * `index.html`'s title whatever address they opened. Measured on the deployed
   * app: `deliveryType: 'cache-storage'`, `transferSize: 0`. A crawler has no
   * worker and reads the route file, so the canonical is right where it counts;
   * the TITLE is what a person sees on a tab and a bookmark, so the app sets it.
   */
  /**
   * Whether this browser has promised to keep the record, as THREE answers:
   * `true` durable, `false` evictable, `null` the browser will not say.
   *
   * §12: "call it and SURFACE `persisted()` honestly." Until 2026-09-18 the
   * answer was computed and thrown away, so the app knew and never said. It
   * matters most on iOS, where storage is deleted after seven days without a
   * visit unless the app is on the home screen — and where `beforeinstallprompt`
   * never fires, so the install that would prevent it is never offered.
   *
   * A promise rather than a value: asking is asynchronous and boot does not wait
   * on it. Deliberately NOT a browser check — §12 forbids treating detection as
   * a dependable gate, and this asks the browser the actual question instead of
   * inferring the answer from its name.
   */
  readonly storagePersisted: Promise<boolean | null>;
  readonly setTitle: (title: string) => void;
  readonly syncHistory: (can: boolean, path: string) => void;
  /** Fired on a real browser navigation, with the path it landed on. */
  readonly onNavigate: (handler: (path: string) => void) => void;
  /** The path the app was opened at, so a shared link lands on its screen. */
  readonly initialPath: string;
  /**
   * §12 — called the first time the calculator is reached, which is the first
   * moment an install offer is not an interruption. Version 1 gated ONBOARDING
   * on installing; §12 downgraded that to a light touch, and a prompt over the
   * disclaimer is the same mistake with a smaller footprint.
   */
  readonly onSettled?: (() => void) | undefined;
  /**
   * §12 — offered once, and only with a record to lose.
   *
   * The moment chosen is the first dose LANDING, not boot and not first run.
   * Before anything is logged the warning is about nothing, and a storage
   * warning on an empty app reads as the app apologising for itself; after a
   * dose is written there is something a seven-day gap would take.
   */
  readonly onStorageAtRisk?: ((show: boolean) => void) | undefined;
  /**
   * §7.2 — a dose whose write has now failed TWICE, handed to something that
   * follows him off the screen he logged it on.
   *
   * On the Host rather than built here because the bar lives outside the app
   * root (it is fixed to the foot and offsets the page through `--prompt-h`,
   * note 59), and because `src/ui` is driven by a jsdom harness that has to be
   * able to see the escalation without a real document.
   *
   * Called with the amount (§10.4's spelled-out form, because by the time he
   * sees this he may be two screens from the dose it names) and the retry.
   * Called AGAIN if that retry also fails, which is what lets a bar that closes
   * on tap come back rather than vanishing on a failure.
   */
  readonly onSaveStuck?: ((amount: string, retry: () => void) => void) | undefined;
  /**
   * `10a` — which language the SHELL's own strings are in.
   *
   * Everything inside the app root reads its words through `CopyContext`, which
   * is the seam #74 built. `main.ts` cannot: the update bar, the storage bar and
   * the stuck-dose bar live OUTSIDE the root — fixed to the foot and offsetting
   * the page through `--prompt-h` — so no provider reaches them, and they are
   * built in plain closures where no hook can answer.
   *
   * So the app tells the shell instead. Called once at boot and again whenever
   * the choice changes, never from a render that did not change it.
   */
  readonly onCopy?: ((copy: Copy) => void) | undefined;
}

export async function start(host: Host): Promise<void> {
  let state = initialState();
  let db: IDBDatabase | null = null;
  let stored: StoredState | null = null;
  /**
   * `10a` — the words this render is using. English until a stored choice says
   * otherwise, and RE-DERIVED FROM `stored` at the top of every render rather
   * than assigned at each of the five places `stored` is re-read: the row is the
   * single source of truth, and a language that can be set from two places is a
   * language that can disagree with the database it was chosen in.
   */
  let copy: Copy = COPY;
  /*
   * `COPY_UR` IS IMPORTED STATICALLY, AND THAT IS A DECISION, NOT AN OVERSIGHT.
   *
   * Two reviews flagged it, and both were right about the cost: the words are 66
   * KB — 18 KB gzipped — inside the bundle the service worker precaches on every
   * phone, re-downloads on every deploy and parses at every boot. 448 KB of
   * typefaces were kept off that path with a dedicated cache, a precache
   * exclusion and three seeded checks, while the WORDS walked straight onto it.
   *
   * `import()` was implemented and measured — 173 KB main, 63 KB chunk, and an
   * English reader fetches none of the second. It was REVERTED, because the
   * font's design does not transfer and the difference is the whole point:
   *
   *   A MISSING FONT DEGRADES TO A FONT. The system Arabic face renders, the
   *   words are still Urdu, and the reader loses typography.
   *
   *   A MISSING COPY MODULE DEGRADES TO A DIFFERENT LANGUAGE. An Urdu reader
   *   who opens the app offline the morning after a deploy — when the new chunk
   *   has never been fetched and the old build's cache is gone — gets English.
   *   `BACKLOG` 10a rejected an eviction timer in exactly those words: "a
   *   returning Urdu reader opens the app offline and finds their own language
   *   gone, which is the one failure the offline guarantee exists to prevent."
   *
   * A design that keeps both — the worker precaching the chunk only for installs
   * that have already chosen Urdu, which the durable font cache can tell it — is
   * written up in `BACKLOG` 10a. It belongs in its own change: `src/sw.ts` is
   * where this project shipped the defect that would have deleted the dose log,
   * and it is not the file to improvise in at the end of a long one.
   */

  /**
   * `lang`, `dir` and the face, on the document element.
   *
   * Through `host.root.ownerDocument` rather than a global `document`, for the
   * reason `now` and `scrollY` are on the Host: `src/ui` is driven by a jsdom
   * harness, and a module that reaches for a global document is a module that
   * harness cannot steer. The root element it was handed knows which document
   * it is in.
   *
   * `lang` is what `fonts-urdu.css` selects on — `:lang(ur)`, the pseudo-class
   * rather than `[lang="ur"]`, because it INHERITS, so this one attribute
   * reaches every descendant. `dir` is what the RTL sweep made meaningful:
   * every inline-axis property in the stylesheet is logical now, so this one
   * attribute mirrors the interface. And `data-urdu-face` is the only thing
   * that causes a font file to be requested at all.
   *
   * Written unconditionally rather than diffed. They are three attribute
   * assignments on one element, the browser does nothing when a value is
   * unchanged, and a diff here would be a cache to keep in step with the DOM
   * for no measurable gain.
   */
  function applyDocumentAttributes(
    language: Language,
    face: UrduFace,
    textScale: number,
  ): void {
    const root = host.root.ownerDocument.documentElement;
    const attributes = documentAttributes(language, face);
    root.lang = attributes.lang;
    root.dir = attributes.dir;
    if (attributes.face === null) delete root.dataset['urduFace'];
    else root.dataset['urduFace'] = attributes.face;
    /*
     * The reader's size, as an inline custom property on the root. Everything
     * in the stylesheet is in `rem`, so this one value moves the whole
     * interface together and no screen is hand-tuned.
     *
     * It MULTIPLIES with `--script-scale`, which `fonts-urdu.css` sets per Urdu
     * face because Nastaliq paints smaller than Latin at the same nominal size.
     * Choosing Urdu and choosing larger type therefore compose rather than one
     * overriding the other.
     */
    root.style.setProperty('--text-scale', String(textScale));
  }
  let recovery: RecoveryBlock | null = null;

  const view: ViewState = {
    draft: draftFrom(null),
    thresholdIsDerived: true,
    disclaimerChecked: false,
    moreExpanded: false,
    meterGuidanceShown: false,
    amountProblem: null,
    amountDiverging: false,
    pendingDelete: null,
    clearConfirming: null,
    confirmingUrdu: null,
    failClosedConfirming: false,
    failClosedBlocked: false,
    readingNote: undefined,
    dosingDraft: '',
    decliningDosing: false,
    screenBefore: 'calculator',
    foodQuery: '',
    openFoodGroup: null,
    foodTally: {},
    editingMine: null,
    mineDraft: '',
    resettingMine: false,
    glossaryTerm: null,
    recordDeletedElsewhere: false,
    writeFailed: false,
    staleConnection: false,
    pendingInsulin: null,
  };

  const dispatch = (action: Action): void => {
    state = reduce(state, action);
    render();
  };

  /** §11.2 — the snapshot fields the core needs, derived once, from the record. */
  const contextFrom = (source: StoredState): RecordContext => {
    const derived = deriveHistory(source.log, {
      nowMs: host.now(),
      installedAtMs: source.installedAtMs,
      lastImportAtMs: source.lastImportAtMs,
      lastLocalInjectionAtMs: source.lastLocalInjectionAtMs,
      droppedStoredRows: source.droppedStoredRows,
      // §8.5's switch-day rule — which insulin each prescription period was.
      // Built from `settingsHistory` rather than from the settings in force,
      // because the whole point is the case where those two disagree.
      classByRevision: new Map(
        source.settingsHistory.map((period) => [
          period.revision,
          classOf(INSULINS, period.bolusId),
        ]),
      ),
    });
    return {
      logRevision: source.logRevision,
      carbBaseline: derived.carbBaseline,
      eligibleEntryCount: derived.eligibleEntryCount,
      historyProvenance: derived.historyProvenance,
      lastDose: derived.lastDose,
      bandEFullCardShownRecently: deriveBandEFullCardShownRecently(
        source.log,
        source.readings,
        host.now(),
      ),
      excludedTimeRecords: derived.excludedTimeRecords,
    };
  };

  const refresh = async (): Promise<void> => {
    if (db === null) return;
    stored = await readAll(db, host.now());
    dispatch({ type: 'record_changed', record: contextFrom(stored) });
  };

  // §11.3 layer 2 — polls a token while a result is displayed or a confirmation
  // is open. Layer 4 posts on write; a dropped message costs responsiveness.
  const watch = watchForChanges({
    readToken: async () => {
      if (db === null) return 'closed';
      const current = await readAll(db, host.now());
      return stateToken(current.logRevision, current.settings);
    },
    onChanged: () => {
      void refresh();
    },
  });

  // ── effects ──────────────────────────────────────────────────────────────

  /**
   * §6.2's threshold, worked out from whatever the three ratio fields currently
   * hold. A field that does not parse reads as NaN, and `deriveThreshold`
   * answers null for that — so a half-typed ICR blanks the box rather than
   * putting a number in a dosing field on the strength of an incomplete one.
   */
  const derivedThresholdFor = (draft: SettingsDraft): number | null => {
    const read = (field: 'target' | 'isf' | 'icr'): number => {
      const parsed = parseField(draft[field], field);
      return parsed.state === 'valid' ? parsed.value : Number.NaN;
    };
    return deriveThreshold(read('target'), read('isf'), read('icr'));
  };

  const saveSettings = async (): Promise<void> => {
    if (db === null) return;
    const draft = view.draft;
    const numeric = (field: keyof typeof RANGE, text: string): number => {
      const parsed = parseField(text, field);
      return parsed.state === 'valid' ? parsed.value : 0;
    };
    const optionalNumeric = (text: string): number | null => {
      const parsed = parseField(text, 'eatDelay');
      if (parsed.state === 'zero') return 0;
      return parsed.state === 'valid' ? parsed.value : null;
    };
    const acknowledged: string[] = [];
    if (modeNeedsAcknowledgement(draft.roundingMode)) acknowledged.push(ackKeys.forMode(draft.roundingMode));
    for (const field of ['target', 'isf', 'icr', 'threshold', 'basalUnits'] as const) {
      acknowledged.push(ackKeys.forSetting(field, numeric(field, draft[field])));
    }
    await commitSettings(db, {
      target: numeric('target', draft.target),
      isf: numeric('isf', draft.isf),
      icr: numeric('icr', draft.icr),
      roundingMode: draft.roundingMode,
      bolusId: draft.bolusId,
      bolusName: brandFor(draft.bolusId),
      // §4.1 — empty means "use the class range" and 0 means "at the start of
      // the meal". `parseField` keeps those apart; `Number(text) || null` would
      // collapse them and turn an ultra-rapid analogue's instruction into the
      // absence of one.
      eatDelayMinutes: optionalNumeric(draft.eatDelay),
      threshold: numeric('threshold', draft.threshold),
      personName: draft.personName.trim(),
      basalName: draft.basalName,
      basalUnits: numeric('basalUnits', draft.basalUnits),
      basalTiming: draft.basalTiming,
      acknowledged,
      nowMs: host.now(),
    });
    stored = await readAll(db, host.now());
    watch.announce();
    if (stored.settings !== null) {
      dispatch({ type: 'settings_committed', settings: stored.settings });
    }
  };

  /**
   * §7.2 — the SECOND tap. It freezes the entire payload, stamps the clock, and
   * writes, in that order. §7.1: "frozen at step 1, not read at step 3 — a retry
   * that re-reads a mutable draft is exactly the hole 'captured at the tap' is
   * meant to close."
   */
  const commitLog = async (divergenceConfirmed: boolean): Promise<void> => {
    if (db === null || state.settings === null || state.snapshot === null) return;
    const outcome = state.outcome;
    if (outcome?.kind !== 'dose' && outcome?.kind !== 'meal_only_suppressed') return;

    const injected = Number(state.injectedDraft);
    // The draft is written only by the stepper, so a non-finite, negative or
    // fractional-hundredth value is a corrupted state and refuses silently.
    // ZERO is reachable — the stepper clamps there — and gets its words:
    // §7.1, the tap asserts an injection happened, and zero contradicts it.
    if (!Number.isFinite(injected) || !Number.isInteger(injected) || injected < 0) return;
    if (injected === 0) {
      view.amountProblem = 'zero';
      view.amountDiverging = false;
      render();
      return;
    }

    // §7.1's amount gate, which v9 specified and the build left unwired. The
    // draft holds integer HUNDREDTHS while `amountNeedsConfirming` reads §4.2
    // grammar text in UNITS (note 3's naming trap), so the conversion goes
    // through `formatHundredths` rather than a division that would hand a
    // float to a safety predicate (§5.3).
    const injectedText = formatHundredths(injected);
    if (amountNeedsConfirming(outcome.hundredths, injectedText)) {
      // The predicate folds §7.1's two rows into one answer, and they resolve
      // differently: outside the hard range is the 100-unit cap — "a U-100
      // syringe holds no more, so above it is a typo by construction" — and a
      // hard range REJECTS with no confirm path (§4.5). Everything else it
      // flags is the large divergence, which commits only through the
      // explicit second tap.
      const parsed = parseField(injectedText, 'injected');
      const [lo, hi] = RANGE.injected.hard;
      const withinHardRange = parsed.state === 'valid' && parsed.value >= lo && parsed.value <= hi;
      if (!withinHardRange) {
        view.amountProblem = 'over_cap';
        view.amountDiverging = false;
        render();
        return;
      }
      if (!divergenceConfirmed) {
        view.amountProblem = null;
        view.amountDiverging = true;
        render();
        return;
      }
    }
    view.amountProblem = null;
    view.amountDiverging = false;

    const reading = parseField(state.inputs.bloodSugar, 'bloodSugar');
    const carbs = parseField(state.inputs.carbs, 'carbs');
    const advisory = evaluateCarbAdvisory(
      carbs.state === 'valid' ? carbs.value : 0,
      state.record.carbBaseline,
      state.record.eligibleEntryCount,
    );

    // §7.2 — the timestamp and §8.1's clock are BOTH taken here, so the record's
    // time and the timing advice cannot disagree.
    const timestamp = host.now();
    const payload: FrozenLogPayload = {
      id: newId(),
      timestamp,
      bloodSugar: reading.state === 'valid' ? reading.value : null,
      carbs: carbs.state === 'valid' ? carbs.value : 0,
      calculatedUnits: outcome.hundredths,
      injectedUnits: injected,
      // §11.3's ROW STAMP — from the committed SNAPSHOT, never a fresh read of
      // the store. Cross-tab those diverge inside the poll window.
      settingsRevision: state.snapshot.settings.revision,
      overrodeStacking: state.snapshot.stackingOverride,
      timingAdvice: outcome.timingAdvice,
      // §6.5 — a flagged row is excluded from the baseline, so the advisory
      // cannot poison the statistic it reads.
      advisoryFlagged: advisory.advisory !== null,
    };

    dispatch({ type: 'commit_log', payload });
    await attemptWrite(payload);
  };

  /**
   * §7.2's *"with retry"*, which nothing implemented until 2026-09-11:
   * `log_save_failed` was dispatched once and no code ever re-attempted, so
   * `save.attempts` could not exceed 1 and the counter the reducer maintains
   * counted nothing.
   *
   * The escalation, chosen over a bare button or a silent loop. Attempt 1 fails
   * → the flag says so on the logged screen, where he is standing. Attempt 2
   * runs IMMEDIATELY and silently, because most write failures here are
   * transient — lock contention, quota pressure, a backgrounded tab — and a
   * recovery he never had to notice is the best outcome. Only when that also
   * fails does the prompt bar appear, because by then the app has genuinely
   * lost the row and he has to write it down.
   *
   * The flag shows from the FIRST failure rather than after the retry settles:
   * if he closes the app inside the retry window, a silent version would have
   * shown him nothing at all about a dose that is not in his record.
   *
   * Immediate rather than backed off, deliberately. A delay needs a timer on
   * the Host to stay drivable from the jsdom harness (§11.1), and buys little
   * against the failure modes above. If it ever needs backoff, that is a Host
   * capability, not a `setTimeout` reached for here.
   */
  const attemptWrite = async (payload: FrozenLogPayload): Promise<void> => {
    const row: Injection = { ...payload };
    try {
      /*
       * A CLOSED CONNECTION IS A FAILED WRITE, not a quiet no-op — changed
       * 2026-09-21, and it is the most dangerous line in this file.
       *
       * This was `if (db === null) return;` ABOVE the try. `commit_log` has
       * already set `step: 'logged'`, so the screen says the dose is recorded —
       * and returning here wrote nothing, dispatched neither `log_saved` nor
       * `log_save_failed`, armed no retry and never reached `onSaveStuck`. The
       * reader is told a dose is in the record when it is in no store.
       *
       * **And the next calculation reasons from that record.** A missing
       * injection understates what is still acting, so §7.4's stacking check
       * releases a correction it should have held back. A silent no-op here is
       * an insulin error one dose later, which is the hazard this whole app
       * exists to keep away from.
       *
       * `db` is null between another tab's `versionchange` and this tab being
       * reloaded. That branch was unreachable until `STRUCTURE_VERSION` moved:
       * the app's IndexedDB version had never changed since the first commit,
       * so the only `versionchange` anyone could cause was a DELETE, which
       * takes the other branch and reboots. #70 made it live and did not touch
       * this line.
       */
      if (db === null) {
        await writeFailed();
        return;
      }
      await appendInjection(db, row, payload.timestamp);
      stored = await readAll(db, host.now());
      watch.announce();
      dispatch({ type: 'log_saved', record: contextFrom(stored) });
      // AFTER the write resolved, and only here. §7.2's commit is "one
      // transaction"; a buzz before it lands would be a lie about a dosing
      // record, and one on the failure path would be a lie about a worse thing.
      host.buzz();
    } catch {
      await writeFailed();
    }

    /**
     * §7.2's failure path, named so the null-connection case can take it too.
     *
     * It was inline in the `catch`, which is why a missing connection could not
     * reach it without throwing a string to itself — and a thrown string that
     * is never rendered is exactly the kind of thing `check_ui_text_outside_copy`
     * is right to object to. Calling the path directly says what is meant: a
     * connection that is gone IS a failed write.
     */
    async function writeFailed(): Promise<void> {
      // §7.2 — the app enters a PENDING-SAVE state. The in-session gate still
      // knows about the dose (`gateLastDose`), and the timer started regardless.
      dispatch({ type: 'log_save_failed' });
      if (state.save.kind === 'pending' && state.save.attempts === 1) {
        await attemptWrite(payload);
        return;
      }
      // Twice is not transient. Hand it to something that follows him off this
      // screen, because `committing` now outlives the logged step.
      host.onSaveStuck?.(copy.units(payload.injectedUnits), retryPendingSave);
    }
  };

  /** The frozen payload, never a re-read draft (§7.1). */
  const retryPendingSave = (): void => {
    const pending = state.committing;
    if (pending === null || state.save.kind !== 'pending') return;
    void attemptWrite(pending);
  };

  const saveReading = async (): Promise<void> => {
    if (db === null) return;
    const parsed = parseField(state.inputs.bloodSugar, 'bloodSugar');
    if (parsed.state !== 'valid') return;
    const reading: Reading =
      view.readingNote === undefined
        ? { id: newId(), timestamp: host.now(), bloodSugar: parsed.value }
        : {
            id: newId(),
            timestamp: host.now(),
            bloodSugar: parsed.value,
            note: view.readingNote,
          };
    await appendReading(db, reading);
    watch.announce();
    await refresh();
    dispatch({ type: 'go', screen: 'history' });
  };

  const exportJson = async (): Promise<void> => {
    if (db === null || stored === null) return;
    const envelope = buildEnvelope({
      settings: stored.settings,
      settingsHistory: stored.settingsHistory,
      log: stored.log,
      readings: stored.readings,
      dosingHistory: stored.dosingHistory,
      // T34 — it was in hand here all along and simply never passed.
      calibration: stored.calibration?.foods ?? {},
    });
    host.download(exportFilename('.json'), 'application/json', JSON.stringify(envelope, null, JSON_INDENT));
    // §7.7.1 — set on the DOWNLOAD ROUTE ONLY. A share that resolves is not
    // evidence of a stored copy.
    await recordJsonExport(db, host.now());
    await refresh();
  };

  const exportReadable = (): void => {
    if (stored === null) return;
    const html = buildReadableExport({
      settings: stored.settings,
      settingsHistory: stored.settingsHistory,
      log: stored.log,
      readings: stored.readings,
      dosingNote:
        stored.dosingHistory.state === 'answered' && stored.dosingHistory.answeredAtMs !== null
          ? { text: stored.dosingHistory.text, answeredAtMs: stored.dosingHistory.answeredAtMs }
          : null,
      generatedAtMs: host.now(),
      timeZone: host.timeZone,
      appVersion: host.appVersion,
    });
    // Deliberately does NOT touch the backup counter (§7.7.1).
    host.download(exportFilename('.html'), 'text/html', html);
  };

  const importRecord = async (): Promise<void> => {
    if (db === null) return;
    const text = await host.pickFile();
    if (text === null) return;
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return;
    }
    const parsed = parseEnvelope(raw);
    // §11.3 — validate before commit, and PRESERVE EXISTING DATA ON FAILURE.
    if (!parsed.ok) return;
    await importEnvelope(db, parsed.envelope, host.now());
    watch.announce();
    await refresh();
  };

  /**
   * A WRITE WHOSE FAILURE REACHES THE SCREEN — added 2026-09-21.
   *
   * Four writes were spelled `void somethingAsync()`, which discards the
   * promise and with it the rejection. When `#63`'s keyPath rename made every
   * write to three stores throw, that is precisely what the reader met: a
   * "Save and start" that did nothing, a disclaimer that would not stay
   * accepted, and `Uncaught (in promise)` in a console no phone has. Diagnosing
   * it took an hour; the screen could have said it in a sentence.
   *
   * The dose write is NOT routed through here and must not be. §7.2 gives it a
   * pending state, a retry and `onSaveStuck`, because a dose that did not save
   * outlives the screen it was entered on. This is for the writes that had
   * nothing.
   */
  const guardWrite = (write: () => Promise<unknown>): void => {
    void write().catch(() => {
      view.writeFailed = true;
      render();
    });
  };

  /**
   * `guardWrite` for a write that needs the connection, with the null case
   * taking the SAME path as a rejection.
   *
   * #72's ruling: a connection that is gone is a failed write, not a quiet
   * no-op. Every call site that wants `db` had been spelling
   * `if (db === null) return;` and capturing a `handle` — which is the shape
   * that ruling exists to delete, and `10a`'s language handlers reintroduced it
   * twice. The reader taps, nothing is written, and nothing says so.
   *
   * It takes the connection as an argument rather than letting the body close
   * over `db`, so the narrowing is the helper's and cannot be forgotten.
   */
  const guardConnectedWrite = (write: (connection: IDBDatabase) => Promise<unknown>): void => {
    const connection = db;
    if (connection === null) {
      view.writeFailed = true;
      render();
      return;
    }
    // Captured, so the narrowing survives into the closure — `db` is reassigned
    // by `startOver` and by `onVersionChange`, and TypeScript is right to refuse
    // to carry a narrowing across that.
    guardWrite(() => write(connection));
  };

  const startOver = async (): Promise<void> => {
    // §7.9 — the app must close its OWN connection first, on both paths, or it
    // blocks on itself.
    db?.close();
    db = null;
    const outcome = await deleteDatabase({
      indexedDB: host.indexedDB,
      onBlocked: () => {
        view.failClosedBlocked = true;
        render();
      },
    });
    if (outcome.kind !== 'deleted') {
      view.failClosedBlocked = outcome.kind === 'blocked';
      render();
      return;
    }
    state = initialState();
    view.draft = draftFrom(null);
    view.thresholdIsDerived = true;
    view.disclaimerChecked = false;
    view.clearConfirming = null;
    // The tally too. `startOver` deletes the database, so a surviving tally
    // would outlive the entire record AND a prescription that no longer
    // exists — the longest-lived thing in the app, describing nothing.
    view.foodTally = {};
    view.confirmingUrdu = null;
    view.failClosedConfirming = false;
    await boot();
  };

  // ── render ───────────────────────────────────────────────────────────────

  const advisoryStatus = (): string => {
    const status = evaluateCarbAdvisory(1, state.record.carbBaseline, state.record.eligibleEntryCount);
    if (!status.enabled) {
      return copy.advisory.notEnoughHistory(state.record.eligibleEntryCount, ADVISORY_MIN_ELIGIBLE);
    }
    if (!status.highTriggerAvailable) return copy.advisory.highDisabled;
    return copy.advisory.active(String(state.record.carbBaseline));
  };

  /**
   * §13.3's window-expiry case. Every `calculate` re-derives the record context
   * from the rows the shell already holds, against the CURRENT clock, because
   * three of its fields are time-dependent — `bandEFullCardShownRecently` reads
   * an elapsed window, and `excludedTimeRecords` and `historyProvenance` read
   * `now`.
   *
   * Deliberately not a `record_changed`: that means the ROWS moved and
   * invalidates, which would wipe the confirmation the user just gave on the
   * two paths that acknowledge and then recalculate.
   */
  const calculateNow = (): void => {
    dispatch(
      stored === null
        ? { type: 'calculate', nowMs: host.now() }
        : { type: 'calculate', nowMs: host.now(), record: contextFrom(stored) },
    );
  };

  /**
   * §8.5 — the insulin answer, committed by one of two routes.
   *
   * On a FIRST RUN there is nothing to commit into: `commitSettings` needs the
   * three ratios and the insulin question is asked before them, so the answer
   * lands in the draft and travels with the first save. On an EXISTING install
   * it is written immediately, as its own settings revision — which is correct
   * rather than heavy-handed, since §7.7's machinery exists precisely because
   * the settings in force now are not the ones that produced a historical row.
   */
  const insulinHandlers = {
    onPick: (id: string): void => {
      view.pendingInsulin = id;
      render();
    },
    onConfirm: (id: string): void => {
      view.pendingInsulin = null;
      view.draft = { ...view.draft, bolusId: id };
      const current = state.settings;
      if (current === null) {
        // Nothing stored yet. The answer rides in the draft and the setup
        // continues into the ratios.
        dispatch({ type: 'go', screen: 'first_run_settings' });
        return;
      }
      void (async (): Promise<void> => {
        if (db === null) return;
        await commitSettings(db, {
          target: current.target,
          isf: current.isf,
          icr: current.icr,
          roundingMode: current.roundingMode,
          bolusId: id,
          bolusName: brandFor(id),
          // The reader's own wait belonged to the OLD insulin. Cleared rather
          // than carried: a prescriber's "twenty minutes" was an answer about
          // regular insulin, and silently keeping it against a rapid analogue
          // is the exact failure §8.5 exists to remove — with the app's own
          // fingerprints on it this time.
          eatDelayMinutes: null,
          threshold: current.threshold,
          personName: current.personName,
          basalName: current.basalName,
          basalUnits: current.basalUnits,
          basalTiming: current.basalTiming,
          // §4.5's confirm-once acks are keyed by VALUE and none of those
          // values moved, so there is nothing to re-acknowledge and nothing is
          // lost by acknowledging nothing.
          acknowledged: [],
          nowMs: host.now(),
        });
        stored = await readAll(db, host.now());
        watch.announce();
        if (stored.settings !== null) {
          view.draft = draftFrom(stored.settings);
          dispatch({ type: 'settings_committed', settings: stored.settings });
        }
      })();
    },
    onBack: (): void => {
      view.pendingInsulin = null;
      dispatch({ type: 'go', screen: 'insulin_setup' });
    },
    onOpenRecord: (): void => {
      dispatch({ type: 'go', screen: 'history' });
    },
    onCancel: null as (() => void) | null,
  };

  function screenFor(): JSX.Element {
    switch (state.screen) {
      case 'loading':
        // §7.9 — a re-boot after another tab's delete says so. Its second
        // sentence ("Setup will run again.") is true now: `boot()` is running.
        return view.recordDeletedElsewhere ? (
          <div class="screen">
            <h2>{copy.recordDeleted.title}</h2>
            <p>{copy.recordDeleted.body}</p>
          </div>
        ) : (
          <div class="screen">
            <p>{copy.screens.opening}</p>
          </div>
        );

      case 'fail_closed':
        return (
          <FailClosedScreen
            recovery={recovery}
            blocked={view.failClosedBlocked}
            // §7.9 v23 — the recovery connection may read the frozen block AND
            // NOTHING ELSE, so the stacking consequence cannot be evaluated here.
            canReadLog={false}
            confirming={view.failClosedConfirming}
            onAsk={(asking) => {
              view.failClosedConfirming = asking;
              render();
            }}
            onStartOver={() => { void startOver(); }}
          />
        );

      case 'first_run_disclaimer':
        return (
          <DisclaimerScreen
            onAccept={() => {
              if (db !== null) { const handle = db; guardWrite(() => acknowledge(handle, ackKeys.disclaimer, host.now())); }
              dispatch({ type: 'disclaimer_accepted' });
            }}
            accepted={view.disclaimerChecked}
            onToggle={() => {
              view.disclaimerChecked = !view.disclaimerChecked;
              render();
            }}
          />
        );

      case 'insulin_setup':
        return (
          <InsulinScreen
            pending={view.pendingInsulin}
            hasRecord={(stored?.log.length ?? 0) > 0}
            handlers={{
              ...insulinHandlers,
              // There is something to go back to only once an answer exists —
              // on a first run, before one does, a Back button would lead to a
              // settings form that cannot be saved.
              onCancel:
                view.draft.bolusId === ''
                  ? null
                  : (): void => {
                      view.pendingInsulin = null;
                      dispatch({
                        type: 'go',
                        screen: state.settings === null ? 'first_run_settings' : 'settings',
                      });
                    },
            }}
          />
        );

      case 'insulin_unsupported':
        return (
          <InsulinUnsupportedScreen
            insulin={INSULINS.find((row) => row.id === (state.settings?.bolusId ?? '')) ?? null}
            hasRecord={(stored?.log.length ?? 0) > 0}
            handlers={insulinHandlers}
          />
        );

      case 'first_run_settings':
      case 'settings':
        return <SettingsScreen
          draft={view.draft}
          settings={state.settings}
          /*
           * The prescription the RECORD still holds while the settings row does
           * not — which only `upgradeFrom`'s 1 -> 2 repair and an import can
           * produce. `null` on every ordinary first run, because a new install
           * has no history either.
           *
           * The LAST period by revision, not by array position: §11.3 allocates
           * `max(keys) + 1` and an import appends, so order is not identity.
           */
          rebuilt={(() => {
            if (state.settings !== null) return null;
            const periods = stored?.settingsHistory ?? [];
            if (periods.length === 0) return null;
            const latest = periods.reduce((a, b) => (b.revision > a.revision ? b : a));
            return { period: latest, changedAt: formatDate(latest.changedAtMs, host.timeZone) };
          })()}
          storageDurable={storageDurable}
          language={stored?.languageChoice?.language ?? DEFAULT_LANGUAGE}
          urduFace={stored?.languageChoice?.urduFace ?? DEFAULT_FACE}
          textScale={stored?.display?.textScale ?? TEXT_SCALE_DEFAULT}
          confirmingUrdu={view.confirmingUrdu}
          storageWarningOff={stored?.acks.has(ackKeys.storageEviction) ?? false}
          onStopStorageWarning={() => {
            if (db !== null) { const handle = db; guardWrite(() => acknowledge(handle, ackKeys.storageEviction, host.now()).then(refresh)); }
          }}
          handlers={{
          firstRun: state.screen === 'first_run_settings',
          onChangeInsulin: () => {
            view.pendingInsulin = null;
            dispatch({ type: 'go', screen: 'insulin_setup' });
          },
          ceilAcknowledged: stored?.acks.has(ackKeys.forMode(view.draft.roundingMode)) ?? false,
          advisoryStatus: advisoryStatus(),
          /**
           * `10a` — English applies at once; Urdu asks first, and only when it
           * is a CHANGE of language.
           *
           * Switching between the four faces while already in Urdu does not
           * re-ask. The confirmation is about the words being unreviewed, which
           * is a property of the language and not of the typeface — asking
           * again for a face would train her to tap through it, which is how a
           * warning stops being read.
           *
           * Going BACK to English never asks. Nothing about that direction
           * needs a caution, and putting one there would sit between a reader
           * and the language they can definitely read.
           */
          /*
           * Applied to the document at once, then written. A reader who cannot
           * read the screen should not wait on a database round trip to learn
           * whether the tap worked — and if the write fails, the next refresh
           * puts the stored value back, which is the honest behaviour.
           */
          onChooseTextScale: (scale: number): void => {
            applyDocumentAttributes(
              stored?.languageChoice?.language ?? DEFAULT_LANGUAGE,
              stored?.languageChoice?.urduFace ?? DEFAULT_FACE,
              scale,
            );
            guardConnectedWrite(async (connection) => {
              await writeDisplay(connection, { textScale: scale });
              return refresh();
            });
          },
          onChooseLanguage: (language, face) => {
            const current = stored?.languageChoice?.language ?? DEFAULT_LANGUAGE;
            if (language === 'ur' && current !== 'ur') {
              view.confirmingUrdu = face;
              render();
              return;
            }
            view.confirmingUrdu = null;
            // A LOST CONNECTION IS A FAILED WRITE, not a quiet no-op — #72's
            // ruling, and this handler broke it twice. `if (db === null) return`
            // left the panel on screen with the model saying it was closed, so a
            // second tap read `face === null` and did nothing: a dead control,
            // and no feedback at all. `guardWrite` is what raises the panel
            // saying the write failed, and it cannot do that from outside itself.
            guardConnectedWrite(async (connection) => {
              await writeLanguage(connection, { language, urduFace: face });
              return refresh();
            });
          },
          onConfirmUrdu: () => {
            const face = view.confirmingUrdu;
            view.confirmingUrdu = null;
            // `render()` on the way out, or the panel stays on screen while the
            // model says it is closed.
            if (face === null) {
              render();
              return;
            }
            guardConnectedWrite(async (connection) => {
              await writeLanguage(connection, { language: 'ur', urduFace: face });
              return refresh();
            });
          },
          onCancelUrdu: () => {
            view.confirmingUrdu = null;
            render();
          },
          onChange: (field, value) => {
            view.draft = { ...view.draft, [field]: field === 'roundingMode' ? (value as RoundingMode) : value };
            // §6.2's threshold is DERIVED from the three ratios rather than
            // shipped as one person's 20 — see `deriveThreshold`. It fills in as
            // soon as the three are readable, and stops doing so the moment the
            // user types in the field themselves.
            //
            // The latch is one-way on purpose. Recomputing over a number a
            // person chose would be the app overruling them silently, which is
            // §7.7's rule about proposed-not-adopted settings arriving in a new
            // place. Once it is theirs it stays theirs, even if they go back and
            // change a ratio.
            if (field === 'threshold') view.thresholdIsDerived = false;
            else if (view.thresholdIsDerived && field !== 'roundingMode') {
              const derived = derivedThresholdFor(view.draft);
              view.draft = {
                ...view.draft,
                threshold: derived === null ? '' : String(derived),
              };
            }
            render();
          },
          onSave: () => { guardWrite(() => saveSettings()); },
          onAcknowledgeCeil: () => {
            if (db !== null) { const handle = db; guardWrite(() => acknowledge(handle, ackKeys.forMode(view.draft.roundingMode), host.now()).then(refresh)); }
          },
          onOpenClear: () => { dispatch({ type: 'go', screen: 'export' }); view.clearConfirming = null; showClear = true; render(); },
          onOpenExport: () => { showClear = false; dispatch({ type: 'go', screen: 'export' }); },
          // §10.6 — record where we came FROM before leaving. `screenBefore` was
          // declared and initialised in v23 and read nowhere, and the back path
          // hardcoded 'calculator' instead. That is survivable only while this
          // page is unreachable during setup: the moment a first-run link exists,
          // back-from-here lands on the calculator MID-SETUP, whose foot nav
          // offers Settings, which renders `firstRun: false`. The gate §10.6
          // calls inescapable is then walked around rather than broken.
          onOpenHowItWorks: () => {
            view.screenBefore = state.screen;
            dispatch({ type: 'go', screen: 'how_it_works' });
          },
          onOpenSettingsAsText: () => {
            view.screenBefore = state.screen;
            dispatch({ type: 'go', screen: 'settings_text' });
          },
        }} />;

      case 'history':
        return <HistoryScreen log={stored?.log ?? []} readings={stored?.readings ?? []} handlers={{
          timeZone: host.timeZone,
          nowMs: host.now(),
          pendingDelete: view.pendingDelete,
          onAskDelete: (id) => {
            view.pendingDelete = id;
            render();
          },
          onDelete: (id) => {
            view.pendingDelete = null;
            if (db !== null) {
              void deleteLogRow(db, id, host.now()).then(() => {
                watch.announce();
                return refresh();
              });
            }
          },
          onDeleteReading: (id) => {
            if (db !== null) {
              void deleteReading(db, id).then(() => {
                watch.announce();
                return refresh();
              });
            }
          },
          onOpenExport: () => { showClear = false; dispatch({ type: 'go', screen: 'export' }); },
        }} />;

      case 'export':
        if (
          !showClear &&
          view.dosingDraft === '' &&
          stored?.dosingHistory.state === 'answered'
        ) {
          view.dosingDraft = stored.dosingHistory.text;
        }
        return showClear ? (
          <ClearScreen log={stored?.log ?? []} readings={stored?.readings ?? []} handlers={{
              timeZone: host.timeZone,
              nowMs: host.now(),
              confirming: view.clearConfirming,
              onAsk: (which) => {
                view.clearConfirming = which;
                render();
              },
              onExportFirst: () => {
                showClear = false;
                view.clearConfirming = null;
                render();
              },
              onClearRecord: () => {
                if (db !== null) {
                  void clearTheRecord(db).then(() => {
                    watch.announce();
                    view.clearConfirming = null;
                    return refresh();
                  });
                }
              },
              onStartOver: () => { void startOver(); },
            }} />
        ) : (
          <ExportScreen handlers={{
              lastJsonExportAtMs: stored?.lastJsonExportAtMs ?? null,
              hasRecord: (stored?.log.length ?? 0) + (stored?.readings.length ?? 0) > 0,
              nowMs: host.now(),
              timeZone: host.timeZone,
              onMove: () => { void exportJson(); },
              onSave: () => { exportReadable(); },
              onImport: () => { void importRecord(); },
                  dosingState: stored?.dosingHistory.state ?? 'unanswered',
              dosingText: stored?.dosingHistory.text ?? '',
              dosingDraft: view.dosingDraft,
              dosingAnsweredAtMs: stored?.dosingHistory.answeredAtMs ?? null,
              decliningDosing: view.decliningDosing,
              onAskDecline: (asking) => {
                view.decliningDosing = asking;
                render();
              },
              onDosingDraft: (value) => {
                view.dosingDraft = value;
                render();
              },
              onDosingSave: () => {
                // §6.7 v19 — **an empty answer is a SKIP, never an `answered`
                // with empty text.** Otherwise the sentinel state silently
                // becomes the absorbing one and the record is lost while
                // reading as captured.
                const text = view.dosingDraft.trim();
                if (text === '' || db === null) {
                  view.dosingDraft = '';
                  render();
                  return;
                }
                void writeDosingHistory(db, {
                  state: 'answered',
                  text,
                  // Correcting re-stamps the date, "because the note is a
                  // self-report and its date is the date the standing text was
                  // given".
                  answeredAtMs: host.now(),
                }).then(() => {
                  view.dosingDraft = '';
                  return refresh();
                });
              },
              onDosingSkip: () => {
                // Leaves the state `unanswered`, so it is re-offered next time.
                view.dosingDraft = '';
                render();
              },
              onDosingDecline: () => {
                if (db === null) return;
                view.decliningDosing = false;
                void writeDosingHistory(db, { state: 'declined', text: '', answeredAtMs: null }).then(
                  refresh,
                );
              },
            }} />
        );

      case 'food_list':
        return (
          <FoodListScreen
            query={view.foodQuery}
            openGroup={view.openFoodGroup}
            onQuery={(value: string): void => {
              view.foodQuery = value;
              render();
            }}
            onToggleGroup={(group: string): void => {
              // Tapping the open one closes it, so the way out is where the way
              // in was. Nothing else on this screen goes back.
              view.openFoodGroup = view.openFoodGroup === group ? null : group;
              render();
            }}
            tally={view.foodTally}
            calibration={stored?.calibration?.foods ?? {}}
            editingMine={view.editingMine}
            mineDraft={view.mineDraft}
            timeZone={host.timeZone}
            onTerm={(key: string): void => { view.glossaryTerm = key; render(); }}
            onEditMine={(id: string | null): void => {
              view.editingMine = id;
              // Seeded from what is already saved, so opening the box on a
              // calibrated row shows that figure rather than an empty field
              // the reader would read as "nothing recorded".
              const saved = id === null ? undefined : stored?.calibration?.foods[id];
              view.mineDraft = saved === undefined ? '' : String(saved.grams);
              render();
            }}
            onMineDraft={(text: string): void => { view.mineDraft = text; render(); }}
            resetting={view.resettingMine}
            onResetting={(value: boolean): void => { view.resettingMine = value; render(); }}
            onResetMine={(): void => {
              view.resettingMine = false;
              // One transaction, the whole map replaced with an empty one —
              // rather than a write per food, which could half-succeed and
              // leave the reader with a table that is partly theirs and partly
              // the reference, with no way to tell which rows are which.
              guardConnectedWrite(async (connection) => {
                await clearCalibration(connection);
                return refresh();
              });
            }}
            onSaveMine={(id: string, grams: number | null): void => {
              // PHASE 2's first constraint: this is USER data, not reference
              // data. `src/data/carbs.ts` stays a module that holds numbers and
              // nothing else — §11.8's exemption depends on it — so the
              // reader's own figure lives with the rest of their record.
              //
              // `guardConnectedWrite` for the reason #72 ruled: a lost
              // connection is a FAILED write that says so, never a quiet no-op.
              guardConnectedWrite(async (connection) => {
                await writeCalibration(connection, id, grams, host.now());
                return refresh();
              });
            }}
            onAdd={(id: string): void => {
              view.foodTally = { ...view.foodTally, [id]: (view.foodTally[id] ?? 0) + 1 };
              render();
            }}
            onRemove={(id: string): void => {
              const next = { ...view.foodTally };
              const left = (next[id] ?? 0) - 1;
              // Deleted rather than left at zero, so `Object.values` counts what
              // is picked without having to filter, and the bar disappears when
              // the last one goes.
              if (left > 0) next[id] = left; else delete next[id];
              view.foodTally = next;
              render();
            }}
            onClearTally={(): void => { view.foodTally = {}; render(); }}
            onUseTotal={(grams: number): void => {
              /*
               * The moment phase 3 exists. Everything before this is a list;
               * this is the number reaching the box.
               *
               * It does NOT commit a dose — it fills the field the reader was
               * going to type into, and they still press Next. The ruling's
               * first answer, in one line of code: "the total arrives as a
               * value the reader can see and change, and nothing is calculated
               * until they act on it."
               *
               * The tally SURVIVES this, deliberately. It is what the number on
               * screen is made of, and the result screen prints it as the
               * working. The keypad clears it the moment anyone edits the
               * figure by hand, which is what stops the two disagreeing.
               */
              dispatch({ type: 'input_changed', field: 'carbs', value: String(grams) });
              dispatch({ type: 'go', screen: 'calculator' });
            }}
          />
        );

      case 'settings_text':
        // `state.settings === null` cannot be reached from the control that
        // opens this — it lives on a settings screen that has them — but the
        // reducer's type allows it and an ADDRESS now reaches this screen
        // directly, so the null case is a real arrival rather than a
        // hypothetical. How-it-works is the honest thing to show: it explains
        // the numbers this screen would have printed.
        return state.settings === null ? (
          <HowItWorksScreen
            advisoryStatus={advisoryStatus()}
            insulinBrand={brandFor(view.draft.bolusId) || null}
          />
        ) : (
          <SettingsAsTextScreen settings={state.settings} />
        );

      case 'how_it_works':
        return (
          <HowItWorksScreen
            advisoryStatus={advisoryStatus()}
            insulinBrand={brandFor(view.draft.bolusId) || null}
          />
        );

      case 'calculator':
        return <CalculatorScreen state={state} handlers={{
          nowMs: host.now(),
          timeZone: host.timeZone,
          moreExpanded: view.moreExpanded,
          meterGuidanceShown: view.meterGuidanceShown,
          amountProblem: view.amountProblem,
          amountDiverging: view.amountDiverging,
          foodTally: view.foodTally,
          calibration: stored?.calibration?.foods ?? {},
          onTerm: (key: string): void => { view.glossaryTerm = key; render(); },
          onDigit: (field, digit) => {
            const current = state.inputs[field];
            // §4.2's grammar, per field, derived from that field's own range —
            // and the leading-zero rule, so `0` then `8` is `8` and not `08`.
            const next = applyKeystroke(current, digit, field, field === 'carbs');
            if (next === null) return;
            // The tally described the old number. It does not describe this
            // one, so it stops existing rather than becoming a caption for a
            // figure nobody assembled.
            if (field === 'carbs') view.foodTally = {};
            dispatch({ type: 'input_changed', field, value: next });
          },
          onBackspace: (field) => {
            if (field === 'carbs') view.foodTally = {};
            dispatch({ type: 'input_changed', field, value: state.inputs[field].slice(0, -1) });
          },
          onNext: () => { dispatch({ type: 'wizard_next' }); },
          onBack: () => { dispatch({ type: 'wizard_back' }); },
          onNewCalculation: () => {
            view.meterGuidanceShown = false;
            /*
             * AND THE TALLY. It described the meal just logged, and the next
             * meal is not that one.
             *
             * Without this, breakfast outlives itself: two rotis (36 g), log
             * it, tap Done, then one mug of chai (13 g) — and the tally still
             * carries the rotis, so "use this total" hands over 49 g and the
             * app doses FIVE units where one was right. Four units of excess
             * rapid insulin, on the most ordinary sequence this app has.
             *
             * The comment on `foodTally` claimed there was "no third state
             * where they disagree", and named only the keypad. The keypad was
             * the path I had thought of, not the only one there is.
             */
            view.foodTally = {};
            dispatch({ type: 'new_calculation' });
          },
          onCalculate: () => { calculateNow(); },
          onAcknowledgeBlank: () => {
            dispatch({ type: 'blank_reading_acknowledged' });
            calculateNow();
          },
          onConfirmLargeDose: () => {
            dispatch({ type: 'large_dose_confirmed' });
            calculateNow();
          },
          onBeginLogging: () => {
            view.amountProblem = null;
            view.amountDiverging = false;
            dispatch({ type: 'begin_logging' });
          },
          onAdjustAmount: (delta) => {
            // §6.3's principle at the amount step: a refusal or an open
            // divergence confirmation was shown for the exact value on
            // screen, so changing the value withdraws it. The commit tap
            // re-runs the gate against the new value.
            view.amountProblem = null;
            view.amountDiverging = false;
            const next = Math.max(0, Number(state.injectedDraft) + delta);
            dispatch({ type: 'injected_draft_changed', value: String(next) });
          },
          onCommitLog: () => { void commitLog(false); },
          onConfirmDivergent: () => { void commitLog(true); },
          onOpenOverride: () => { view.moreExpanded = false; state = { ...state, step: 'stacking_override' }; render(); },
          onTakeOverride: () => {
            dispatch({ type: 'stacking_override_taken' });
            calculateNow();
          },
          onOfferReading: () => { dispatch({ type: 'offer_reading' }); },
          onSaveReading: () => { void saveReading(); },
          onToggleMore: () => {
            view.moreExpanded = !view.moreExpanded;
            render();
          },
          onToggleMeterGuidance: () => {
            view.meterGuidanceShown = !view.meterGuidanceShown;
            render();
          },
          onOpenHistory: () => { dispatch({ type: 'go', screen: 'history' }); },
          onOpenSettings: () => {
            view.draft = draftFrom(state.settings);
            // Same rule as on boot: a stored threshold is theirs, so editing a
            // ratio from the settings screen must not silently rewrite it.
            view.thresholdIsDerived = state.settings === null;
            dispatch({ type: 'go', screen: 'settings' });
          },
          onStartOver: () => { void startOver(); },
        }} />;
    }
  }

  // The view rendered last, so `render` can tell a redraw from a navigation.
  let lastViewKey = '';
  let showClear = false;

  let settled = false;
  /** §12's answer once it lands; `undefined` until then, which is not `null`. */
  let storageDurable: boolean | null | undefined;
  /** §12's bar: never raised, on screen, or finished with for this session. */
  let storageBar: 'never' | 'showing' | 'done' = 'never';


  /**
   * §10.7 as Momin ruled it — ALL navigation lives at the foot of the screen.
   *
   * Rendered by the shell rather than by each screen, and that is the point:
   * fourteen screens each drew their own `Back` bar at the TOP, which is both
   * the hardest place on a one-handed phone to reach and fourteen places for
   * the pattern to drift. One function means one place to change and no screen
   * can forget.
   *
   * Returning `null` is what tells the shell there is nowhere to go back to,
   * and the hardware-back wiring reads the SAME function — so the Android
   * gesture and the on-screen control can never disagree about whether back is
   * possible.
   */

  /**
   * §7.7.1 — the export filenames.
   *
   * Both were fixed strings, so a folder holding three months of exports held
   * three files a doctor could not tell apart, and re-downloading produced
   * "insulin-record (2).html". The name and the date make each one identifiable
   * without opening it.
   *
   * The name is reduced to ASCII letters, digits and single hyphens before it
   * goes anywhere near a filename. It is a string he typed, or one that arrived
   * in an imported file, and a filename is the wrong place to find out that it
   * contained a slash.
   */
  function exportFilename(extension: string): string {
    const name = (stored?.settings?.personName ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    // `localDayKey` already yields YYYY-MM-DD in the device's zone (§10.4).
    const day = localDayKey(host.now(), host.timeZone);
    return ['mealunits', name, day].filter((part) => part !== '').join('-') + extension;
  }

  function backAction(): (() => void) | null {
    switch (state.screen) {
      case 'calculator':
        // `wizard_back` is a no-op on these two, so offering it would be a
        // control that does nothing (§18.14's switch is the source of truth).
        return state.step === 'reading' || state.step === 'logged'
          ? null
          : (): void => { dispatch({ type: 'wizard_back' }); };
      case 'settings':
        return (): void => { dispatch({ type: 'go', screen: 'calculator' }); };
      case 'history':
        return (): void => { dispatch({ type: 'go', screen: 'calculator' }); };
      case 'export':
        return showClear
          ? (): void => { showClear = false; dispatch({ type: 'go', screen: 'settings' }); }
          : (): void => { dispatch({ type: 'go', screen: 'calculator' }); };
      case 'food_list':
        return (): void => { dispatch({ type: 'go', screen: 'calculator' }); };

      case 'how_it_works':
      case 'settings_text':
        // Back goes where you CAME from, not to a fixed screen. The entry points
        // both sit in settings today, so this reads as "settings" either way —
        // but it is the mechanism that lets first-run setup link here without
        // handing out an exit from itself.
        return (): void => { dispatch({ type: 'go', screen: view.screenBefore }); };
      // §10.6 and §11.3 — the first run and the fail-closed screen are
      // deliberately inescapable. No back, and no hardware back either.
      //
      // §8.5's two are here for the same reason: the insulin question is
      // required, so it gets no foot-nav back. The picker carries its OWN back
      // control, offered only once an answer exists to go back to, and the exit
      // carries two — both of which lead somewhere rather than around.
      case 'loading':
      case 'fail_closed':
      case 'first_run_disclaimer':
      case 'first_run_settings':
      case 'insulin_setup':
      case 'insulin_unsupported':
        return null;
    }
  }

  function footNav(): JSX.Element | null {
    const goBack = backAction();
    const items: JSX.Element[] = [];
    if (goBack !== null) {
      items.push(<Button key="back" class="link" onPress={goBack}>{copy.back}</Button>);
    }
    if (state.screen === 'calculator' && state.step === 'reading') {
      items.push(
        <Button key="settings" class="link" onPress={() => { dispatch({ type: 'go', screen: 'settings' }); }}>
          {copy.nav.settings}
        </Button>,
        <Button key="history" class="link" onPress={() => { dispatch({ type: 'go', screen: 'history' }); }}>
          {copy.nav.history}
        </Button>,
      );
    }
    // §10.7 — on the carbohydrate step ONLY. The list answers the question being
    // asked at that exact moment and is noise on every other screen, which is
    // why it is gated the same way History is gated to the reading step.
    if (state.screen === 'calculator' && state.step === 'carbs') {
      items.push(
        <Button key="foods" class="link" onPress={() => { dispatch({ type: 'go', screen: 'food_list' }); }}>
          {copy.foods.navLabel}
        </Button>,
      );
    }
    if (state.screen === 'history') {
      items.push(
        <Button
          key="save-a-copy"
          class="link mark"
          onPress={() => { showClear = false; dispatch({ type: 'go', screen: 'export' }); }}
        >
          {copy.nav.saveACopy}
        </Button>,
      );
    }
    if (items.length === 0) return null;
    return <nav class="foot-nav" aria-label={copy.nav.label}>{items}</nav>;
  }

  function render(): void {
    /**
     * `10a` — the language, derived from the stored row and nowhere else.
     *
     * `stored === null` is a database that has not been read yet, not a reader
     * who has chosen English, and both render English — which is why the
     * default is a constant rather than a branch.
     *
     * `host.onCopy` fires only on a CHANGE. The shell's bars are built once and
     * left standing; calling it every render would rebuild text that is already
     * correct, on every keystroke.
     */
    const language = stored?.languageChoice?.language ?? DEFAULT_LANGUAGE;
    const next = language === 'ur' ? COPY_UR : COPY;
    if (next !== copy) {
      copy = next;
      host.onCopy?.(copy);
    }
    applyDocumentAttributes(
      language,
      stored?.languageChoice?.urduFace ?? DEFAULT_FACE,
      stored?.display?.textScale ?? TEXT_SCALE_DEFAULT,
    );

    if (!settled && state.screen === 'calculator') {
      settled = true;
      host.onSettled?.();
    }

    // §12 — something is now STORED and this browser has not promised to keep
    // it. The moment is the settings landing, not the first dose: "Save and
    // start" writes a prescription, and losing that means re-entering ISF, ICR,
    // target and basal. Waiting for a dose would warn about the second thing at
    // risk and not the first.
    //
    // Not on the first-run screens themselves — mid-setup, about data that does
    // not exist yet, is the wrong moment for it. And `=== false` deliberately:
    // `null` is "will not say", `undefined` is "has not answered", and warning
    // on either would be a guess, which §12 forbids.
    // §12's bar has exactly three states and one transition out of each, which
    // is why it is a word rather than two booleans. It was a `shown` flag here
    // and another inside `main.ts`, so "raise once" lived in one file and
    // "do not raise again" in the other, and neither could be read alone.
    const storageWarningOff = stored?.acks.has(ackKeys.storageEviction) ?? false;
    if (
      storageDurable === false
      && state.settings !== null
      && storageBar !== 'done'
      // An explicit tap in Settings, never an inference from having been there.
      && !storageWarningOff
    ) {
      const onAGate = state.screen === 'first_run_disclaimer' || state.screen === 'first_run_settings';
      if (storageBar === 'never' && !onAGate && state.screen !== 'settings') {
        storageBar = 'showing';
        host.onStorageAtRisk?.(true);
      } else if (storageBar === 'showing' && state.screen === 'settings') {
        // RETIRED, not withheld. Settings carries the same warning in full with
        // the steps, and it does not come back afterwards — the reader has now
        // seen the longer version, so raising the short one again is nagging.
        storageBar = 'done';
        host.onStorageAtRisk?.(false);
      }
    }

    // §11.3 layer 2 — watch while a result is displayed OR a confirmation is
    // open, and stop otherwise. §13.3 required "result or confirmation open" and
    // v6's wording said only "while a result is displayed".
    const watching =
      state.outcome !== null &&
      ['result', 'confirm_inputs', 'stacking_override', 'amount'].includes(state.step);
    if (watching && stored !== null) {
      watch.start(stateToken(stored.logRevision, stored.settings));
    } else {
      watch.stop();
    }

    // The page mood, from the OUTCOME rather than from the screen name — the
    // same source the copy is derived from, so the colour cannot disagree with
    // the words. §3.3 refuses to print an insulin number on a block; this makes
    // that refusal visible before anything is read.
    // ONLY a §3 block repaints the page. Band E was wired here first and it was
    // wrong: band E is an ADVISORY beside a valid dose ("above 250, check
    // ketones"), it already carries its own amber flag, and washing the whole
    // screen made a correct result read as a failure. A page-level colour change
    // has to mean "there is no dose here", or it means nothing.
    //
    // Keyed on the STEP, not on the outcome alone. §18.14 is explicit that going
    // back never discards a committed input, so `state.outcome` survives the
    // back navigation by design — and reading it here left the carbohydrate
    // screen washed red after backing out of a low-reading block, which said
    // "do not inject" about a screen that was asking for a meal. The mood has to
    // describe THE SCREEN ON DISPLAY, and the step is what names that.
    const blocking = state.step === 'blocked' || state.step === 'record_reading';
    host.root.className =
      blocking && state.outcome?.kind === 'blocked_low' ? 'mood-halt' : '';

    // Keep the history stack in step with whether the app HAS a back path, read
    // from the same `backAction` the on-screen control uses — so the gesture and
    // the button can never disagree.
    host.syncHistory(backAction() !== null, pathForScreen(state.screen, BASE_PATH));
    // The language's own title if it has one, the route's otherwise. English has
    // none by design — `routes.ts` owns those, because `DEFAULT_TITLE` is pinned
    // against `index.html`'s `<title>` and a second English copy would be a
    // second place to drift.
    // Its own title, then the language's fallback for a screen with no address,
    // then the route's. English supplies neither override, so it lands on
    // `routes.ts` — which is where `DEFAULT_TITLE` is pinned to `index.html`.
    host.setTitle(
      copy.tabTitles[state.screen]
      ?? (copy.tabTitleFallback === '' ? titleForScreen(state.screen) : copy.tabTitleFallback),
    );

    /**
     * Compared against the view rendered LAST TIME, held across calls.
     *
     * This read `${state.screen}/${state.step}` twice inside one render and
     * claimed the second read would have "moved on". It cannot: `dispatch`
     * updates the state and THEN calls render, so both reads saw the same
     * already-updated value and the comparison was ALWAYS "same view". That is
     * why opening a screen from part-way down settings dropped the reader into
     * the middle of a page they had not seen.
     *
     * The comparison has to span renders, so the previous key has to outlive
     * one — a note explaining why a wrong comparison was right is worth less
     * than a variable in the right scope.
     */
    const viewKey = `${state.screen}/${state.step}`;
    const navigated = viewKey !== lastViewKey;
    lastViewKey = viewKey;

    // Read BEFORE the diff, because a diff that shortens the page can have the
    // browser clamp the offset on its own — then the branch below would be
    // deciding from a number the render itself produced.
    const scrollBefore = host.scrollY();

    /**
     * T3 — **one `mount` call, and it is a DIFF, not a rebuild.**
     *
     * This was `replaceChildren`, which destroyed every node on every
     * keystroke, and the focus/caret/scroll patch in `dom.ts` existed to put
     * back the three things anyone had thought to name. That patch is deleted
     * with this change, and `dom.ts` with it: node identity now survives by
     * algorithm rather than by every render path remembering to capture and
     * restore — which is the same argument §11.3 made choosing IndexedDB over
     * Web Locks, "it only works if every writer takes the lock, and a single
     * path that forgets restores the race with no error". The food search WAS
     * that path.
     *
     * What comes back for free is everything identity carries that no restore
     * ever handled: IME composition, text selection, a running CSS transition,
     * the soft keyboard's own state.
     *
     * Synchronous, deliberately. Preact's top-level `render` diffs and commits
     * before it returns, so `dispatch` → state → DOM stays one turn, exactly as
     * it was. Making it async would change the timing every test and every
     * handler here already depends on.
     */
    mount(
      /**
       * The provider #74 built the seam for. Every screen under here reads its
       * words through `useCopy()`, so the day a second language exists — today —
       * not one call site changes.
       */
      <CopyContext.Provider value={copy}>
        {/* ABOVE the screen, not inside one, because three of the four writes it
            reports fire from different screens and a panel each would be three
            places for the wording to drift. */}
        {view.staleConnection ? <StaleConnectionPanel /> : null}
        {view.writeFailed ? (
          <WriteFailedPanel
            onStartOver={() => { void startOver(); }}
            onDismiss={() => { view.writeFailed = false; render(); }}
          />
        ) : null}
        {screenFor()}
        {/* Over the screen you are on, not a page of its own. The reader is in
            the middle of something — the result they are reading expires — and
            a screen change would cost them their place for a definition. */}
        <GlossaryPanel
          term={view.glossaryTerm}
          onClose={() => { view.glossaryTerm = null; render(); }}
        />
        {footNav()}
        {/* §10.8 — show the running build version. "It is the only way to
            diagnose a report." Deliberately small and quiet: it is for the one
            moment someone is diagnosing a report, not for every moment of every
            day. */}
        <div class="foot">{copy.build(host.appVersion, host.buildId)}</div>
      </CopyContext.Provider>,
      host.root,
    );

    // A NEW view starts at the top, and this is the one piece of `restoreFocus`
    // that was never a patch. The browser keeps the old offset across a render,
    // so opening "How this works" from part-way down the settings screen
    // dropped the reader into the middle of a page they had not seen — they had
    // to scroll UP to find the beginning. Every screen reached from settings had
    // it.
    //
    // Its other half is gone rather than ported: nothing restores the offset on
    // a same-view render, because nothing moves it any more.
    if (navigated && scrollBefore > 0) host.scrollTo(0);
  }

  // ── boot ─────────────────────────────────────────────────────────────────

  async function boot(): Promise<void> {
    const outcome = await openDatabase({
      indexedDB: host.indexedDB,
      nowMs: host.now(),
      onVersionChange: (newVersion) => {
        // §7.9 v23 — `versionchange` with `newVersion === null` is a DELETE. The
        // handler must invalidate the displayed result and any pending
        // confirmation, "since a result left rendered after the record beneath
        // it was deleted is §4.3's stale-output defect arriving by a new route".
        db = null;
        // An UPGRADE in another tab, not a delete. Until 2026-09-21 this could
        // not happen — the version had never moved — so the branch below was
        // the only one anybody could reach, and this one went quiet. A tab that
        // cannot write must say so rather than look ordinary.
        if (newVersion !== null) {
          view.staleConnection = true;
          render();
        }
        if (newVersion === null) {
          state = initialState();
          // §7.9 v23's THIRD clause, which nothing implemented: "…invalidate the
          // rendered result, AND RETURN TO THE FIRST-RUN GATE." Invalidating
          // alone left `screen: 'loading'` on screen with nothing to re-boot it,
          // so the surviving tab sat on "Opening your record…" forever — and
          // `COPY.recordDeleted`, whose second sentence promises setup will run
          // again, had no consumer at all.
          //
          // `open.ts` already closed the connection before calling this, so the
          // delete is not blocked by re-opening: `openDatabase` recreates the
          // database empty and `boot` lands on the disclaimer, which IS the
          // first-run gate. The notice renders in the meantime rather than a
          // spinner, because "out of date" is a truer thing to say than nothing.
          view.recordDeletedElsewhere = true;
          render();
          void boot();
        }
      },
    });

    if (outcome.kind === 'open') {
      db = outcome.db;
      stored = await readAll(db, host.now());
      view.draft = draftFrom(stored.settings);
      // Derived only while there is nothing stored. A STORED threshold is the
      // user's — whether they typed it or accepted what first run worked out —
      // and must never be recomputed under them.
      view.thresholdIsDerived = stored.settings === null;
      dispatch({
        type: 'loaded',
        settings: stored.settings,
        record: contextFrom(stored),
        disclaimerAccepted: stored.acks.has(ackKeys.disclaimer),
      });
      return;
    }

    // §11.3 — the fail-closed screen renders his settings from the frozen
    // recovery block BEFORE offering the escape, read through a separate
    // versionless open that is closed again before the delete.
    recovery = await readRecoveryBlock({ indexedDB: host.indexedDB });
    dispatch({ type: 'load_failed_closed' });
  }

  // §8.2 — the expiry runs on a timer, on resume, and on visibility change.
  const tick = (): void => { dispatch({ type: 'tick', nowMs: host.now() }); };
  globalThis.setInterval(tick, MS_PER_MINUTE);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tick();
    });
  }

  // The device's back gesture runs the SAME action as the on-screen control. If
  // there is nowhere to go back to, nothing is registered and the gesture does
  // what it always did — which on the first screen is leave the app, and that
  // is correct.
  host.onNavigate((path) => {
    // Back and FORWARD both land here, so the screen is read from where the
    // browser actually is rather than assumed to be one step backwards. A
    // forward tap that only ran `backAction` would leave the address bar saying
    // one thing and the app showing another.
    const target = screenForPath(path, BASE_PATH);
    if (target !== null && target !== state.screen) {
      dispatch({ type: 'go', screen: target });
      return;
    }
    if (target === null && ROUTABLE.has(state.screen)) {
      dispatch({ type: 'go', screen: 'calculator' });
      return;
    }
    // Same address either way: the calculator's steps are deliberately not
    // routable (§8.2 — a URL that restores a screen restores a dose), so back
    // INSIDE the wizard is still the app's own action.
    const goBack = backAction();
    if (goBack !== null) goBack();
  });

  // §12 — the answer arrives after boot and re-renders when it does. Settings
  // reports it whatever it says; the bar below acts only on `false`.
  void host.storagePersisted.then((answer) => {
    storageDurable = answer;
    render();
  });

  await boot();

  /**
   * BACKLOG 24 — a shared link lands on its screen.
   *
   * AFTER `boot`, and only from `calculator`, which is what makes it safe. Boot
   * decides where the app opens, and two of its answers are gates: an
   * unaccepted disclaimer and a first run with no settings. A link that jumped
   * past either would defeat the thing it is there for, so this moves the app
   * only when boot has already landed it on the ordinary front door.
   *
   * The calculator itself has no address, so nothing here can restore a dose.
   */
  const landing = screenForPath(host.initialPath, BASE_PATH);
  if (landing !== null && state.screen === 'calculator') {
    dispatch({ type: 'go', screen: landing });
  }
}

/** §7.1 — exported for the amount screen's confirmation, and for tests. */
export function amountNeedsConfirming(
  calculatedHundredths: number,
  injectedText: string,
): boolean {
  const parsed = parseField(injectedText, 'injected');
  if (parsed.state !== 'valid') return true;
  const [lo, hi] = RANGE.injected.hard;
  if (parsed.value < lo || parsed.value > hi) return true;
  const injected = hundredthsFromGrammarText(parsed.text);
  return divergesFromCalculated(calculatedHundredths, injected);
}

export type { Settings };
