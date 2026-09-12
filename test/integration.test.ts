/**
 * §13.6 — **integration tests are not optional.**
 *
 * §11.1 withdraws the version-1 claim these exist to disprove: "*A UI refactor
 * cannot change a dose.* **FALSE.** A refactor can swap field mappings, parse
 * separators differently, read stale settings, or bypass a gate entirely, all
 * with `dose.ts` untouched. The pure core enables isolated testing; it does not
 * remove the need for integration tests."
 *
 * So these drive the whole app — storage, reducer, screens — through a real DOM
 * and a real IndexedDB, and assert what appears ON SCREEN. Every number checked
 * here is one the golden cases already pin; what is under test is whether the
 * interface carries it across without mangling it.
 *
 * §13.6 names three: interface-to-core mapping, band-to-message pairing, and the
 * confirmation flow.
 */

import { IDBFactory } from 'fake-indexeddb';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { start } from '../src/ui/app.js';
import { DATABASE_NAME } from '../src/storage/schema.js';
// Asserted by reference, not by literal: these cases prove the combined §4.3
// step 3 response RENDERS, which is what was missing. The words themselves are
// a clinical-review matter and must stay free to change without going red.
import { COPY } from '../src/ui/copy.js';
import {
  RESULT_EXPIRY_MINUTES,
  STACK_ADVISE_HOURS,
  STACK_SUPPRESS_HOURS,
} from '../src/config.js';

const KARACHI = 'Asia/Karachi';
/** 6 Sep 2026, 7:00 PM in Karachi. Fixed: nothing here reads a real clock. */
const START_MS = Date.parse('2026-09-06T14:00:00Z');

let dom: JSDOM;
let root: HTMLElement;
let clock: number;
let downloads: { name: string; type: string; contents: string }[];
let fileToImport: string | null;
let scrollY: number;
let canGoBack: boolean;
let buzzes: number;
let hardwareBack: (() => void) | null;
let stuckPrompts: { amount: string; retry: () => void }[];

/**
 * §7.2 — an IndexedDB whose first `n` LOG WRITES throw, so the retry escalation
 * is observable end to end rather than asserted about a helper.
 *
 * Scoped to `readwrite` transactions touching the log store: `SETTINGS_SCOPE`
 * shares `meta` with `HISTORY_SCOPE`, so a blunter filter would break
 * `setUpAsHisBrother` before the case under test began.
 */
function failingWrites(times: number): IDBFactory {
  const real = new IDBFactory();
  let remaining = times;
  const factory = Object.create(real) as IDBFactory;
  factory.open = (name: string, version?: number): IDBOpenDBRequest => {
    const request = version === undefined ? real.open(name) : real.open(name, version);
    request.addEventListener('success', () => {
      const db = request.result;
      const open = db.transaction.bind(db);
      db.transaction = ((stores: string | string[], mode?: IDBTransactionMode) => {
        const names = typeof stores === 'string' ? [stores] : stores;
        if (remaining > 0 && mode === 'readwrite' && names.includes('log')) {
          remaining -= 1;
          throw new dom.window.DOMException('injected write failure', 'UnknownError');
        }
        return mode === undefined ? open(stores) : open(stores, mode);
      }) as typeof db.transaction;
    });
    return request;
  };
  return factory;
}

function install(): void {
  dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'https://example.test/MealUnits/',
    pretendToBeVisual: true,
  });
  const scope = globalThis as unknown as Record<string, unknown>;
  scope.window = dom.window;
  scope.document = dom.window.document;
  scope.Node = dom.window.Node;
  scope.HTMLElement = dom.window.HTMLElement;
  scope.HTMLInputElement = dom.window.HTMLInputElement;
  scope.Event = dom.window.Event;
  scope.MouseEvent = dom.window.MouseEvent;
  root = dom.window.document.querySelector('#app') as HTMLElement;
}

beforeEach(() => {
  install();
  clock = START_MS;
  downloads = [];
  fileToImport = null;
  scrollY = 0;
  canGoBack = false;
  hardwareBack = null;
  buzzes = 0;
  stuckPrompts = [];
});

afterEach(() => {
  dom.window.close();
});

async function boot(indexedDB: IDBFactory = new IDBFactory()): Promise<void> {
  await start({
    root,
    now: () => clock,
    timeZone: KARACHI,
    indexedDB,
    appVersion: 'test',
    buildId: 'test',
    download: (name, type, contents) => downloads.push({ name, type, contents }),
    pickFile: () => Promise.resolve(fileToImport),
    // jsdom does not lay pages out, so `window.scrollY` is permanently 0 and a
    // real scroll cannot be simulated. The Host indirection is what makes the
    // behaviour observable at all: the test owns the number.
    scrollY: () => scrollY,
    scrollTo: (y) => { scrollY = y; },
    // The harness OWNS the history stack, so the hardware-back contract is
    // testable: `canGoBack` records what the shell claims, and `pressBack`
    // fires the gesture. jsdom's own history would not tell us either.
    buzz: () => { buzzes += 1; },
    setCanGoBack: (can) => { canGoBack = can; },
    onHardwareBack: (handler) => { hardwareBack = handler; },
    onSaveStuck: (amount, retry) => { stuckPrompts.push({ amount, retry }); },
  });
  await settle();
}

/** Lets the storage promises the shell fired resolve before the next assertion. */
async function settle(): Promise<void> {
  // A settings commit is a chain of IndexedDB round trips, and each one lands on
  // its own macrotask. Draining microtasks is not enough; this drains turns.
  for (let i = 0; i < 60; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

function text(): string {
  return root.textContent ?? '';
}

/**
 * Buttons are found by the WORDS on them, with decorative glyphs stripped —
 * `Back` carries a leading arrow, and a test that had to spell the arrow would
 * be asserting a typographic choice rather than a label. The words are what the
 * user reads and what a screen reader announces.
 */
function buttonLabel(button: Element): string {
  return (button.textContent ?? '').replace(/[\u2190\u2192\u200a]/g, '').trim();
}

async function tap(label: string): Promise<void> {
  const buttons = [...root.querySelectorAll('button')];
  const found = buttons.find((button) => buttonLabel(button) === label);
  if (!found) {
    throw new Error(`No button "${label}". Buttons: ${buttons.map((b) => buttonLabel(b)).join(' | ')}`);
  }
  found.click();
  await settle();
}

function fieldLabelled(labelIncludes: string): HTMLInputElement {
  const label = [...root.querySelectorAll('label')].find((node) =>
    (node.textContent ?? '').includes(labelIncludes),
  );
  const input = label?.parentElement?.querySelector('input');
  if (!input) throw new Error(`No input labelled "${labelIncludes}"`);
  return input;
}

/**
 * Types ONE CHARACTER AT A TIME, because the whole class of defect this guards
 * lives BETWEEN renders.
 *
 * The original helper assigned `input.value = value` in one statement and fired
 * a single `input` event. That is one render, so it could not reproduce what a
 * person hits: `render()` rebuilds the tree on every keystroke, and typing
 * `150` produced `1` because the element being typed into was destroyed after
 * the first character. 541 tests and a 100% mutation score missed it, and this
 * is the line that was wrong.
 */
async function typeInto(labelIncludes: string, value: string): Promise<void> {
  const field = fieldLabelled(labelIncludes);
  // Fields carry the prescription now (§1.2 as ruled), so typing has to replace
  // rather than append — otherwise '150' into a prefilled 150 becomes '150150'.
  if (field.value !== '') {
    field.value = '';
    field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await settle();
  }
  fieldLabelled(labelIncludes).focus();
  for (const character of value) {
    // Deliberately types into whatever currently HAS focus rather than looking
    // the field up again. Re-finding it each character is a workaround for the
    // defect this is guarding, and it would let the suite stay green while the
    // app was unusable by hand — which is exactly what happened.
    const active = dom.window.document.activeElement;
    if (!(active instanceof dom.window.HTMLInputElement)) {
      throw new Error(
        `Focus left "${labelIncludes}" mid-word: the keystroke "${character}" had nowhere to go. ` +
          `activeElement was <${active?.tagName.toLowerCase() ?? 'null'}>.`,
      );
    }
    active.value += character;
    active.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    // A keystroke is a synchronous reduce-and-render; it does not round-trip to
    // storage, so it does not need `settle`'s 60 turns. Draining them per
    // character multiplied the setup by 47 and timed the longest tests out.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  // The COMMIT may well be asynchronous, so the word as a whole still settles.
  await settle();
}

async function keys(digits: string): Promise<void> {
  for (const digit of digits) await tap(digit);
}

/**
 * Clicks the same-labelled button repeatedly WITHOUT settling between taps.
 * Every render rebuilds the tree, so the button must be re-found each time;
 * but a stepper walk of a hundred taps through `tap` would drain sixty
 * macrotask turns per tap for nothing — the adjustment is a synchronous
 * reduce-and-render. The caller settles once afterwards.
 */
function tapFast(label: string, times: number): void {
  for (let i = 0; i < times; i++) {
    const buttons = [...root.querySelectorAll('button')];
    const found = buttons.find((candidate) => buttonLabel(candidate) === label);
    if (!found) throw new Error(`No button "${label}"`);
    found.click();
  }
}

/** §10.6 items 1 and 2, then his actual prescription. */
/**
 * The path his brother actually walks, after §1.2's ruling: the prescription and
 * the confirmation threshold arrive prefilled, so the only typing is the basal
 * block, which is his and not the prescription's.
 *
 * The prefilled values are ASSERTED rather than assumed. A helper that silently
 * accepted whatever was in the fields would let a wrong default flow into every
 * downstream test as if it were the prescription.
 */
async function setUpAsHisBrother(indexedDB?: IDBFactory): Promise<void> {
  await boot(indexedDB);
  await tap('☐  I have read this');
  await tap('I understand — use at my own risk');
  expect(fieldLabelled('What should a correction aim for').value).toBe('150');
  expect(fieldLabelled('How far does one unit lower').value).toBe('30');
  expect(fieldLabelled('How much carbohydrate does one unit cover').value).toBe('10');
  expect(fieldLabelled('Double-check my typing').value).toBe('20');
  await typeInto('Which insulin', 'Lantus');
  await typeInto('How many units', '36');
  await typeInto('When', 'early morning, before breakfast');
  await tap('Save and start');
}

describe('§10.6 first run', () => {
  it('blocks on the disclaimer, and the accept is disabled until the box is ticked', async () => {
    await boot();
    expect(text()).toContain('Read this before you use it');
    const accept = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === 'I understand — use at my own risk',
    );
    expect(accept?.hasAttribute('disabled')).toBe(true);
    await tap('☐  I have read this');
    const after = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === 'I understand — use at my own risk',
    );
    expect(after?.hasAttribute('disabled')).toBe(false);
  });

  it('prefills the prescription and SHOWS it, rather than applying it silently', async () => {
    await boot();
    await tap('☐  I have read this');
    await tap('I understand — use at my own risk');
    expect(text()).toContain('Your prescription');

    // §1.2, changed on Momin's ruling. The hazard §1.2 names is a SILENT
    // revert; these are on screen, and nothing is stored until the save below.
    expect(fieldLabelled('What should a correction aim for?').value).toBe('150');
    expect(fieldLabelled('How far does one unit lower your blood sugar?').value).toBe('30');
    expect(fieldLabelled('How much carbohydrate does one unit cover?').value).toBe('10');

    // §10.5 — and the target's soft-band acknowledgement fires here BY DESIGN.
    // 150 sits outside 90-140 on purpose, so a stale value has something on
    // screen to be noticed by. It must not be styled as a blocking error.
    const note = [...root.querySelectorAll('p')].find(
      (n) => (n.textContent ?? '').includes('outside the usual range'),
    );
    expect(note?.className).toBe('caution');
  });

  it('§8.5 — states the U-100 assumption, which it was specified to do and never did', async () => {
    await boot();
    await tap('\u2610  I have read this');
    await tap('I understand — use at my own risk');

    // The half of §8.5 that went eight months unbuilt. Setup is the one place a
    // concentration mismatch is catchable ONCE; on the result it would be noise
    // beside a number about to be injected, which is what §10.5 budgets against.
    const setup = text();
    expect(setup).toContain('units of U-100 insulin');
    // The REASON travels with it. §8.5 refuses a U-40 setting because a setting
    // that can be set wrong causes the very error it exists to prevent, and a
    // bare assumption with no reason reads as trivia and gets skipped.
    expect(setup).toContain('2.5x error it was meant to prevent');

    // And §8.5's other half stays REFUSED: the dose names the insulin, which a
    // person can check against the vial in their hand, not a concentration they
    // cannot.
    expect(setup).not.toContain('6 units (U-100)');
  });

  it('but still stores nothing until the explicit save, so §4.4 stays live', async () => {
    await boot();
    await tap('☐  I have read this');
    await tap('I understand — use at my own risk');
    // The basal block is HIS, not the prescription's, and is still empty — so
    // the save is genuinely blocked and the prefill cannot be tapped past
    // without passing through every screen.
    expect(fieldLabelled('Which insulin').value).toBe('');
    const save = [...root.querySelectorAll('button')].find((b) => buttonLabel(b) === 'Save and start');
    expect(save?.hasAttribute('disabled')).toBe(true);
  });


});

describe('§15 — the five rounding modes are explained somewhere findable', () => {
  it('names all five, and warns that rounding up is not a neutral peer', async () => {
    await setUpAsHisBrother();
    await tap('Settings');
    // The pointer, because §10.5's budget does not allow five paragraphs beside
    // the choice itself.
    expect(text()).toContain('"How this works" explains all five');

    await tap('How this works');
    const page = text();
    for (const mode of ['Whole units', 'Half units', 'Always round up', 'Always round down', 'Show the exact number']) {
      expect(page).toContain(mode);
    }
    // The one that matters: `ceil` is gated for a reason, and the reason has to
    // be readable, not just enforced.
    expect(page).toContain('always in the direction of low blood sugar');
    expect(page).toContain('cannot draw 4.37');
  });
});

describe('§10.6 the five terms the app used and never explained', () => {
  it('defines stacking, the word seven user-facing strings already use', async () => {
    await setUpAsHisBrother();
    await tap('Settings');
    await tap('How this works');
    const page = text();

    expect(page).toContain('What "stacking" means');
    // The definition itself, not just the heading.
    expect(page).toContain('the two add together');
    // The exception that is NOT stacking, and gets it backwards if omitted.
    expect(page).toContain('holding that one back would give you more insulin, not less');
    // And the refusal. §7.4 declines to model insulin-on-board on purpose.
    expect(page).toContain('refuses to draw that curve');
  });

  it('says what a carbohydrate is, the one input the app takes on trust', async () => {
    await setUpAsHisBrother();
    await tap('Settings');
    await tap('How this works');
    const page = text();

    expect(page).toContain('What counts as carbohydrate');
    expect(page).toContain('never the weight of what is on the plate');
    // Fibre is stated and the instruction REFUSED — net-carb practice varies and
    // the app has no authority to pick.
    expect(page).toContain('Ask yours which they want');
  });

  it('names ISF and ICR, reusing the settings definitions rather than copying them', async () => {
    await setUpAsHisBrother();
    await tap('Settings');
    const settings = text();
    await tap('How this works');
    const page = text();

    expect(page).toContain('The names your doctor uses');
    // The SAME strings, so the two screens cannot drift apart.
    expect(page).toContain(COPY.settings.isfClinical);
    expect(page).toContain(COPY.settings.icrClinical);
    expect(settings).toContain(COPY.settings.isfClinical);
  });

  it('explains expiry and the missing-history caveat, with windows read from config', async () => {
    await setUpAsHisBrother();
    await tap('Settings');
    await tap('How this works');
    const page = text();

    expect(page).toContain('No recent dose recorded');
    // BOTH halves of the condition. v4 dropped provenance and the caveat fired
    // after every overnight gap; copy naming only one half describes that bug.
    expect(page).toContain('a row was dropped as unreadable when the app opened');
    expect(page).toContain('It does not mean you have no insulin on board');

    // The windows are interpolated, so these read from config rather than prose.
    expect(page).toContain(`after ${String(RESULT_EXPIRY_MINUTES)} minutes`);
    expect(page).toContain(`first ${String(STACK_SUPPRESS_HOURS)} hours`);
    expect(page).toContain(`After ${String(STACK_ADVISE_HOURS)} hours it says nothing`);
  });

});

describe('§10.6 back from "How this works" returns where you came from', () => {
  it('goes back to Settings, not to a hardcoded calculator', async () => {
    await setUpAsHisBrother();
    await tap('Settings');
    await tap('How this works');
    expect(text()).toContain('Rounding, and why there are five choices');

    await tap('Back');
    // Settings, because that is where the trip started. Until 2026-09-12 the
    // back path dispatched a hardcoded 'calculator', and `view.screenBefore`
    // was declared and initialised but read nowhere.
    const after = text();
    expect(after).toContain('What can your syringe measure?');
    expect(after).not.toContain('Rounding, and why there are five choices');
  });

  it('and the same door works from the settings-as-text view', async () => {
    await setUpAsHisBrother();
    await tap('Settings');
    await tap('Show my settings as text');
    expect(text()).toContain('meant to be photographed');

    await tap('Back');
    expect(text()).toContain('What can your syringe measure?');
  });
});

describe('the name, which changes nothing the app calculates', () => {
  it('greets him on the reading screen and NOWHERE a dose is shown', async () => {
    await boot();
    await tap('☐  I have read this');
    await tap('I understand — use at my own risk');
    await typeInto('What should the app call you', 'Ahmed');
    await typeInto('Which insulin', 'Lantus');
    await typeInto('How many units', '36');
    await typeInto('When', 'early morning');
    await tap('Save and start');

    expect(text()).toContain('Hey Ahmed');

    await keys('180');
    await tap('Next');
    // §10.5 — the greeting must not follow the flow toward the dose.
    expect(text()).not.toContain('Hey Ahmed');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('units of Humulin R');
    expect(text()).not.toContain('Hey Ahmed');
  });

  it('and no name means no greeting, because empty is a real answer', async () => {
    await setUpAsHisBrother();
    expect(text()).not.toContain('Hey');
  });

  it('names the readable export and its file, so a folder of them is legible', async () => {
    await boot();
    await tap('☐  I have read this');
    await tap('I understand — use at my own risk');
    await typeInto('What should the app call you', 'Ahmed');
    await typeInto('Which insulin', 'Lantus');
    await typeInto('How many units', '36');
    await typeInto('When', 'early morning');
    await tap('Save and start');
    await keys('180');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    await tap('Done');
    await tap('History');
    await tap('Save a copy');
    await tap('Download report');

    const file = downloads[0];
    expect(file?.contents).toContain("Ahmed&#39;s insulin record");
    // Both exports used a fixed filename, so three months of them were three
    // files nobody could tell apart.
    expect(file?.name).toMatch(/^mealunits-ahmed-\d{4}-\d{2}-\d{2}\.html$/);
  });

  it('and a name with a slash cannot become part of a path', async () => {
    await boot();
    await tap('☐  I have read this');
    await tap('I understand — use at my own risk');
    await typeInto('What should the app call you', 'a/b ../c');
    await typeInto('Which insulin', 'Lantus');
    await typeInto('How many units', '36');
    await typeInto('When', 'early morning');
    await tap('Save and start');
    await keys('180');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    await tap('Done');
    await tap('History');
    await tap('Save a copy');
    await tap('Download report');

    const name = downloads[0]?.name ?? '';
    expect(name).not.toContain('/');
    expect(name).not.toContain('..');
    expect(name).toMatch(/^mealunits-a-b-c-\d{4}-\d{2}-\d{2}\.html$/);
  });
});

describe('dead ends — every action must move or explain', () => {
  /**
   * THE CLASS, not the instance. Momin typed 7090, tapped "Work out the dose",
   * and nothing happened: no crash, no message, clean console, no way forward.
   * The core was right — `above_range` with a golden case pinning it — and the
   * interface had no slot to render it in, so `stepFor` sent him to a screen
   * that could not show the error.
   *
   * 548 tests and a 100% mutation score all passed. What was missing was not
   * another assertion about arithmetic; it was the question "did that tap DO
   * anything?", which nothing had ever asked.
   */
  it('an out-of-range reading explains itself instead of doing nothing', async () => {
    await setUpAsHisBrother();
    await keys('7090');
    await tap('Next');
    await keys('7');

    const before = text();
    await tap('Work out the dose');

    // The two failures this covers, separately: something must CHANGE, and the
    // change must SAY something.
    expect(text()).not.toBe(before);
    expect(text()).toContain('A meter does not read above 600');
    // And it lands on the screen carrying the field that is wrong.
    expect(text()).toContain("What's your blood sugar right now?");
  });

  it('and the reading survives, so the fix is one keystroke', async () => {
    await setUpAsHisBrother();
    await keys('7090');
    await tap('Next');
    await keys('7');
    await tap('Work out the dose');
    // §18.14 — being sent back to fix a field must not discard it. Deleting the
    // stray digit is the whole repair.
    expect(root.querySelector('.entry .n')?.textContent).toBe('7090');
  });

  it('an out-of-range CARBOHYDRATE explains itself on its own screen', async () => {
    await setUpAsHisBrother();
    await keys('180');
    await tap('Next');
    await keys('9999');

    const before = text();
    await tap('Work out the dose');
    expect(text()).not.toBe(before);
    expect(text()).toContain('more than 300 grams');
    expect(text()).toContain('How much carbohydrate');
  });

  /**
   * The zero-unit dead end, which the sweep could not reach because it stopped
   * at the result screen. A legitimate `dose` outcome of ZERO units is reachable
   * on the everyday path — reading 120 with 10 g of carbohydrate on the shipped
   * prescription is -1 + 1 — and stepping any dose down to 0.00 gets there too.
   *
   * "Log this injection" then returned silently: `commitLog` guards on
   * `injected <= 0` and rendered nothing, enforcing §7.2's "a zero-unit result
   * cannot be logged" by exactly the mechanism note 38 condemned — a control
   * that stops responding. The words written for it (`COPY.range.injectedZero`)
   * sat unused in copy.ts.
   */
  it('a zero-unit amount refuses in words, not by ignoring the tap', async () => {
    await setUpAsHisBrother();
    await keys('180');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    // 6 units, stepped down in half-units until the amount is 0.00.
    tapFast('−', 12);
    await settle();
    // The stepper clamps at zero (`Math.max(0, …)`), so twelve half-unit steps
    // down from 6 land exactly there and further taps are a no-op by design.
    expect(root.querySelector('.entry .n')?.textContent).toBe('0');

    const before = text();
    await tap('Log this injection');
    expect(text()).not.toBe(before);
    expect(text()).toContain(COPY.range.injectedZero);
    expect(text()).not.toContain('Logged');
  });

  /**
   * The sweep. Rather than one scripted scenario, this walks the everyday path
   * and asserts after EVERY tap that the screen either changed or grew an
   * explanation. It is the cheap general form of the check above, and it is
   * what would have caught the 7090 dead end without anyone thinking of 7090.
   */
  it('no tap on the everyday path leaves the screen unchanged and silent', async () => {
    await setUpAsHisBrother();
    // EXTENDED 2026-09-11 past "Work out the dose" and through the amount step.
    // Stopping at the result is why this sweep could not see the zero-unit dead
    // end below: the defect lived on a screen the script never reached, which
    // is the same shape as the 7090 defect that caused the sweep to exist.
    const script: readonly string[] = [
      '1', '8', '0', 'Next', '5', '0', 'Work out the dose',
      'I injected this', '+', '−', 'Log this injection',
    ];
    for (const label of script) {
      const before = text();
      await tap(label);
      const after = text();
      if (after === before) {
        throw new Error(`Tapping "${label}" changed nothing on screen and said nothing.`);
      }
    }
    expect(text()).toContain('Logged');
  });
});

describe('interaction continuity — the class of defect §13 does not cover', () => {
  /**
   * Found by hand on 7 Sep 2026, on a real phone and a real Mac, at a point
   * where 541 tests and a 100% mutation score all reported green. Neither
   * number was lying: §13 has no requirement about focus, caret or scroll
   * anywhere, so nothing was ever pointed at them.
   *
   * These four tests fail without the patch in `dom.ts`. That was verified by
   * removing it and watching them go red, because a regression test nobody has
   * seen fail is a guess.
   */
  async function reachSettings(): Promise<void> {
    await boot();
    await tap('☐  I have read this');
    await tap('I understand — use at my own risk');
  }

  it('keeps focus in the field across the rebuild every keystroke triggers', async () => {
    await reachSettings();
    const field = fieldLabelled('What should a correction aim for?');
    field.focus();
    field.value = '1';
    field.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await settle();

    // The element itself is gone — `replaceChildren` destroyed it — so the
    // assertion has to be made against the CURRENT field, which is the whole
    // point of `data-field`.
    const now = fieldLabelled('What should a correction aim for?');
    expect(dom.window.document.activeElement).toBe(now);
  });

  it('so typing 150 one character at a time actually produces 150', async () => {
    await reachSettings();
    await typeInto('What should a correction aim for?', '150');
    expect(fieldLabelled('What should a correction aim for?').value).toBe('150');
  });

  it('and restores the caret, because focus without it turns 150 into 051', async () => {
    await reachSettings();
    await typeInto('What should a correction aim for?', '150');
    const field = fieldLabelled('What should a correction aim for?');
    // Caret at the END of the text, which is where typing leaves it. A restore
    // that drops it to 0 sends the next character to the front.
    expect(field.selectionStart).toBe(3);
    expect(field.selectionEnd).toBe(3);
  });

  it('buzzes once when the row is committed, and at no other moment', async () => {
    await setUpAsHisBrother();
    await keys('120');
    await tap('Next');
    await keys('25');
    await tap('Work out the dose');
    // Not for a calculation. A dose on screen is not a dose recorded.
    expect(buzzes).toBe(0);
    await tap('I injected this');
    expect(buzzes).toBe(0);

    await tap('Log this injection');
    // Once, after the write resolved — §7.2's commit is one transaction, and a
    // buzz before it lands would be a lie about a dosing record.
    expect(buzzes).toBe(1);
    expect(text()).toContain('Logged 2 units');
  });

  it('the device back gesture goes back INSIDE the app, and only when there is somewhere to go', async () => {
    await setUpAsHisBrother();
    // First screen: nothing to go back to, so the gesture must be left alone —
    // in an installed PWA it closes the app, and that is correct here.
    expect(canGoBack).toBe(false);

    await keys('180');
    await tap('Next');
    expect(text()).toContain('How much carbohydrate');
    expect(canGoBack).toBe(true);

    hardwareBack?.();
    await settle();
    expect(text()).toContain("What's your blood sugar right now?");
    expect(canGoBack).toBe(false);
  });

  it('never asks the browser to navigate on the shell\'s own accounting', async () => {
    // The defect this pins: reaching a screen with no back path used to trigger
    // a `history.back()` to tidy the spent sentinel, and when the bookkeeping
    // was off by one that navigated PAST the app — tapping "Log this injection"
    // landed on about:blank. Reproduced roughly one run in three.
    //
    // The contract is now push-only: `setCanGoBack(false)` must ask for
    // nothing. This asserts the shell reports the state and takes no action.
    await setUpAsHisBrother();
    await keys('120');
    await tap('Next');
    await keys('25');
    await tap('Work out the dose');
    expect(canGoBack).toBe(true);

    await tap('I injected this');
    await tap('Log this injection');
    // The logged screen has no back path, and the app is STILL HERE.
    expect(canGoBack).toBe(false);
    expect(text()).toContain('Logged 2 units');
    expect(text()).toContain('Eat around');
  });

  it('and the gesture runs the same action as the on-screen control', async () => {
    await setUpAsHisBrother();
    await keys('180');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('units of Humulin R');

    // Two routes to the same place: the button, then the gesture, must land on
    // the same screen. They read one `backAction`, and this is what pins that.
    await tap('Back');
    const viaButton = text();
    await tap('Work out the dose');
    hardwareBack?.();
    await settle();
    expect(text()).toBe(viaButton);
  });

  it('the page mood follows the SCREEN, so backing out of a block clears the red', async () => {
    await setUpAsHisBrother();
    await keys('65');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('Treat this first. Do not inject.');
    expect(root.className).toBe('mood-halt');

    // §18.14 keeps the outcome across a back navigation on purpose, so a mood
    // read from `state.outcome` alone stayed red on the carbohydrate screen —
    // "do not inject" painted over a question asking about a meal.
    await tap('Back');
    expect(text()).toContain('How much carbohydrate');
    expect(root.className).toBe('');
  });

  it('starts a new screen at the TOP, rather than part-way down the last one', async () => {
    await setUpAsHisBrother();
    await tap('Settings');
    scrollY = 700;
    await tap('How this works');
    // Reached from part-way down settings, this used to open mid-page — the
    // reader had to scroll UP to reach the beginning of a page they had never
    // seen. Every screen opened from settings behaved that way.
    expect(text()).toContain('What this does and does not cover');
    expect(scrollY).toBe(0);
  });

  it('holds the scroll position on a same-view render, and releases it on navigation', async () => {
    await reachSettings();
    scrollY = 600;
    await typeInto('What should a correction aim for?', '1');
    expect(scrollY).toBe(600);

    // And a NAVIGATION releases it. This assertion used to read `toBe(600)`,
    // which encoded the defect as the expected behaviour: `sameView` was always
    // true, so scroll was restored across every navigation, and the test
    // asserted exactly that. The comment above it already said holding it would
    // be wrong. **A test can agree with a bug, and this one did.**
    scrollY = 600;
    await typeInto('What should a correction aim for?', '150');
    await typeInto('Which insulin', 'Lantus');
    await typeInto('How many units', '36');
    await typeInto('When', 'early morning, before breakfast');
    await tap('Save and start');
    expect(scrollY).toBe(0);
  });
});

describe('§13.6 interface-to-core mapping', () => {
  it('carries §1.4s worked case through the whole interface', async () => {
    // 330 mg/dL and 50 g at 150/30/10 is 11 units. The golden cases pin the
    // arithmetic; this pins that the reading reaches the reading slot and the
    // carbohydrate reaches the carbohydrate slot.
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');

    expect(text()).toContain('11');
    expect(text()).toContain('units of Humulin R');
    // §10.3 — the working, with both components and the total.
    expect(text()).toContain('330 down to 150');
    expect(text()).toContain('50 g of carbohydrate');
    expect(text()).toContain('11 units');
  });

  it('and swapping the two fields would produce a different number, so the test means something', async () => {
    // 50 mg/dL with 330 g is not 11 units — it is a band D refusal, because 50
    // is below the level-2 threshold of 54. If the mapping were transposed the
    // case above could not pass.
    await setUpAsHisBrother();
    await keys('50');
    await tap('Next');
    await keys('330');
    await tap('Work out the dose');
    expect(text()).toContain('This is very low. Treat it now.');
    expect(text()).not.toContain('units of Humulin R');
  });
});

describe('§8.2 — a block goes stale too', () => {
  it('says the reading is old, without withdrawing the treat-first instruction', async () => {
    await setUpAsHisBrother();
    await keys('65');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('Treat this first. Do not inject.');
    expect(text()).not.toContain('Check your blood sugar again before deciding');

    // §8.2's fifteen minutes, and then some. `blocked` was the only step that
    // ignored `expired`, so the screen kept presenting a reading whose own body
    // text had said "check again in 15 minutes".
    clock += 20 * 60_000;
    // §8.2 fires the tick on visibility change, which is what returning to the
    // app after treating a low actually looks like.
    dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    await settle();

    expect(text()).toContain('Check your blood sugar again before deciding');
    // The block does NOT go away. Being low is still the likeliest reading of
    // an old low, and §3.3's suppression of every insulin number still holds.
    expect(text()).toContain('Treat this first. Do not inject.');
    expect(text()).not.toContain('units of Humulin R');
  });
});

describe('§8.2 + §6.2 — a confirmation dies with the result it authorised', () => {
  it('re-fires the gate when an expired result is recalculated after the stacking window', async () => {
    await setUpAsHisBrother();
    // A 6-unit injection, logged through the interface, two hours before the
    // meal — the dose §7.4's gate will hold a correction back for.
    await keys('150');
    await tap('Next');
    await keys('60');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    await tap('Done');
    clock += 2 * 60 * 60_000;

    // 300 mg/dL with 250 g: total 30 reaches the threshold of 20, and the
    // suppress window turns the revealed dose into the meal-only 25.
    await keys('300');
    await tap('Next');
    await keys('250');
    await tap('Work out the dose');
    expect(text()).toContain('That will be a large dose');
    await tap('Show the dose');
    expect(text()).toContain('25units of Humulin R');
    expect(text()).toContain('Correction held back');

    // Twenty minutes later the result expires…
    clock += 20 * 60_000;
    dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    await settle();
    expect(text()).toContain('This result is from');

    // …he goes back and recalculates five hours on, once §7.4's window has
    // lapsed. The 5-unit correction is now applied, the total is 30, and the
    // 7:00 confirmation must NOT still stand: §7.4.1 [R2], a recalculation
    // cannot reveal a previously hidden correction under an earlier
    // acknowledgement.
    await tap('Back');
    clock += 5 * 60 * 60_000;
    await tap('Work out the dose');
    expect(text()).toContain('That will be a large dose');
    expect(text()).not.toContain('30units of Humulin R');
    expect(text()).not.toContain('units of Humulin R');
  });
});

describe('§13.6 band-to-message pairing', () => {
  it('band C refuses with no insulin number anywhere on screen', async () => {
    await setUpAsHisBrother();
    await keys('65');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');

    const screen = text();
    // §3.3 — the block suppresses every INSULIN quantity: the main result, the
    // breakdown, the confirmation preview and the announcement.
    expect(screen).toContain('Treat this first. Do not inject.');
    expect(screen).not.toContain('units of Humulin R');
    expect(screen).not.toContain('Total');
    // ...and does NOT suppress the treatment instructions, which necessarily
    // contain 15 grams, 15 minutes and 70 mg/dL. "No insulin dose numbers, not
    // no digits."
    expect(screen).toContain('15 grams of fast-acting carbohydrate');
    expect(screen).toContain('15 minutes');
    expect(screen).toContain('above 70 mg/dL');
  });

  it('band D escalates the wording without changing the block', async () => {
    await setUpAsHisBrother();
    await keys('40');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('This is very low');
    expect(text()).toContain('Get help if you cannot treat yourself');
    expect(text()).not.toContain('units of Humulin R');
  });

  it('§7.8 — and the reading offer sits AFTER the treat-first instruction', async () => {
    await setUpAsHisBrother();
    await keys('65');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    const screen = text();
    expect(screen.indexOf('Treat this first')).toBeLessThan(screen.indexOf('Record this reading'));
  });

  it('band B cautions and still calculates', async () => {
    // 105 mg/dL at target 150 and sensitivity 30 is a correction of exactly
    // -1.5, which is the boundary. 60 g gives 4.5, rounding to 5.
    await setUpAsHisBrother();
    await keys('105');
    await tap('Next');
    await keys('60');
    await tap('Work out the dose');
    expect(text()).toContain('You are well below target');
    expect(text()).toContain('units of Humulin R');
    // §8.1 — band B INVERTS the timing instruction.
    expect(text()).toContain('eat first, then inject');
    expect(text()).not.toContain('Inject 20–30 minutes before eating');
  });

  it('band E shows the ketone advisory alongside a normal dose', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    // §3.1's asymmetry: blocking at the low end, advisory at the high end.
    expect(text()).toContain('Above 250 — check ketones');
    expect(text()).toContain('11');
  });
});

describe('§13.6 the confirmation flow', () => {
  it('§6.3 — withholds the dose and shows the INPUTS', async () => {
    await setUpAsHisBrother();
    await keys('350');
    await tap('Next');
    await keys('250');
    await tap('Work out the dose');

    const screen = text();
    expect(screen).toContain('That will be a large dose');
    expect(screen).toContain('350 mg/dL');
    expect(screen).toContain('250 g');
    // The dose is 31.7 -> 32 units, and none of it may appear yet.
    expect(screen).not.toContain('units of Humulin R');
    expect(screen).not.toContain('32');
  });

  it('and reveals it on the tap', async () => {
    await setUpAsHisBrother();
    await keys('350');
    await tap('Next');
    await keys('250');
    await tap('Work out the dose');
    await tap('Show the dose');
    expect(text()).toContain('32');
    expect(text()).toContain('units of Humulin R');
  });

  it('§6.2 — a 250 g plate confirms at EVERY blood sugar, even a perfect one', async () => {
    // What actually justifies a threshold of 20: the meal term alone is 25
    // units, so the reread prompt fires without depending on a high reading.
    await setUpAsHisBrother();
    await keys('150');
    await tap('Next');
    await keys('250');
    await tap('Work out the dose');
    expect(text()).toContain('That will be a large dose');
  });

  it('§4.6 — a blank reading needs one explicit tap, and suppresses the timing', async () => {
    await setUpAsHisBrother();
    await tap('Next');
    await keys('60');
    await tap('Work out the dose');
    expect(text()).toContain('No reading entered');
    await tap('I understand — carbohydrates only');
    expect(text()).toContain('6');
    // §8.1 — suppressed ENTIRELY when blood sugar is unknown.
    expect(text()).not.toContain('Inject 20–30 minutes before eating');
    expect(text()).not.toContain('eat first');
  });
});

describe('§4.3 step 3 — an impossible reading combines with the possible low, never one half silently', () => {
  it('a typed 0 blocks AND says the number cannot be real', async () => {
    await setUpAsHisBrother();
    await keys('0');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('This is very low. Treat it now.');
    expect(text()).toContain(COPY.blockedInvalidReading);
    expect(text()).not.toContain('units of Humulin R');
  });

  it('a typed 19 gets the same pair', async () => {
    await setUpAsHisBrother();
    await keys('19');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('This is very low. Treat it now.');
    expect(text()).toContain(COPY.blockedInvalidReading);
  });

  it('a genuine 65 blocks with no invalid-reading line', async () => {
    await setUpAsHisBrother();
    await keys('65');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('Treat this first. Do not inject.');
    expect(text()).not.toContain(COPY.blockedInvalidReading);
  });

  it('the carbohydrate half stays OFF the block and waits on its own screen', async () => {
    await setUpAsHisBrother();
    await keys('65');
    await tap('Next');
    await keys('999');
    await tap('Work out the dose');
    expect(text()).toContain('Treat this first. Do not inject.');
    // §10.5 rank 1 — nothing shows beside a band C/D block, and 65 is a real
    // reading, so the blood-sugar half has no business here either.
    expect(text()).not.toContain('more than 300 grams');
    expect(text()).not.toContain(COPY.blockedInvalidReading);
    // §18.14 — Back keeps the committed input, and the screen that owns the
    // unusable 999 now explains it instead of holding it silently (note 6's
    // avoidable second trip).
    await tap('Back');
    expect(text()).toContain('999');
    expect(text()).toContain('That is more than 300 grams of carbohydrate');
  });
});

describe('§4.5 the HI/LO meter guidance is reachable, not merely written', () => {
  it('opens from the reading screen and shows both cards', async () => {
    await setUpAsHisBrother();
    await tap('Meter showing HI or LO?');
    expect(text()).toContain('injected insulin alone will not treat diabetic ketoacidosis');
    expect(text()).toContain('Do not enter a number. Treat now');
  });

  it('sits beside the above-range error — the link §4.5 promises', async () => {
    await setUpAsHisBrother();
    await keys('7090');
    await tap('Next');
    await keys('7');
    await tap('Work out the dose');
    expect(text()).toContain('A meter does not read above 600');
    await tap('Meter showing HI or LO?');
    expect(text()).toContain('treat it as a minimum, not the answer');
  });
});

describe('§13.3 a session left open across midnight still gets the FULL band E card', () => {
  /**
   * §13.3: *"a qualifying result at 11:59 PM then another at 12:01 AM — both
   * full."* The core always passed that case; the SHELL did not, because it
   * derived `bandEFullCardShownToday` when the RECORD last changed rather than
   * when a calculation happens. A session left open across midnight computed
   * the new day's first result against yesterday's day key and rendered the
   * compact line where the case requires the full card.
   *
   * §10.5 rules the class lossless — the instruction is identical either way —
   * but it is a specified behaviour the integrated app did not honour, and the
   * same staleness reached `excludedTimeRecords` and `historyProvenance`.
   */
  it('rather than the compact line meant for a repeat', async () => {
    await setUpAsHisBrother();
    // 11:40 PM Karachi: a qualifying 280 gets the full card and logs it.
    clock = Date.parse('2026-09-06T18:40:00Z');
    await keys('280');
    await tap('Next');
    await keys('40');
    await tap('Work out the dose');
    expect(text()).toContain('check ketones');
    await tap('I injected this');
    await tap('Log this injection');

    // 12:10 AM, the NEXT day, same session, no record change in between.
    clock = Date.parse('2026-09-06T19:10:00Z');
    await tap('Done');
    await keys('280');
    await tap('Next');
    await keys('40');
    await tap('Work out the dose');

    // §10.5 makes the WORDS identical between the two forms — "only the
    // typography de-escalates" — so the class is the only thing that can tell
    // them apart, and here typography IS the assertion.
    const bandE = [...root.querySelectorAll('.flag')].find((node) =>
      (node.textContent ?? '').includes('check ketones'),
    );
    expect(bandE).toBeDefined();
    expect(bandE?.className).toBe('flag');
  });
});

describe('§7.9 a cross-tab delete returns this tab to the first-run gate', () => {
  /**
   * §7.9 v23: on `versionchange` with `newVersion === null` — "close, invalidate
   * the rendered result, AND RETURN TO THE FIRST-RUN GATE."
   *
   * Only the first two happened. The handler reset to `initialState()`, whose
   * screen is `loading`, and nothing re-booted — so the surviving tab sat on
   * "Opening your record…" indefinitely, with `COPY.recordDeleted` (whose body
   * promises setup will run again) referenced by nothing at all.
   */
  it('says what happened and re-runs setup, rather than hanging on the spinner', async () => {
    const factory = new IDBFactory();
    await setUpAsHisBrother(factory);
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    expect(text()).toContain('units of Humulin R');

    // Another tab starts over. `open.ts` closes our connection on
    // `versionchange`, so the delete is not blocked by this one.
    await new Promise<void>((resolve) => {
      const request = factory.deleteDatabase(DATABASE_NAME);
      request.onsuccess = (): void => { resolve(); };
      request.onerror = (): void => { resolve(); };
    });
    await settle();

    // The stale result is gone, the tab says why, and setup is running again.
    expect(text()).not.toContain('units of Humulin R');
    expect(text()).not.toContain('Opening your record');
    expect(text()).toContain('I have read this');
  });
});

describe('§7.2 a tap after expiry is permitted, and the row takes the tap time', () => {
  /**
   * PLAN.md §7.2: *"Tap after §8.2 expiry is permitted with amended wording (the
   * log records what he did, and he may genuinely have injected at minute 16),
   * but the recorded timestamp is the tap time and the wording says so."*
   *
   * The expired result used to REPLACE the log control with "Check again",
   * under a comment citing §8.2 — which specifies a staleness banner and says
   * nothing about removing controls. So the one person the clause is written
   * for could not record a real injection, and §7.4's gate went blind on it.
   */
  it('offers both, and re-checking still leads', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    clock += 20 * 60_000;
    dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    await settle();
    expect(text()).toContain('Check again');
    expect(text()).toContain(COPY.log.injectedAfterExpiry);
    // The plain label belongs to a live result; this one states the timestamp.
    expect(text()).not.toContain('>I injected this<');
  });

  it('and the row records the TAP time, not the calculation time', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    const calculatedAt = clock;
    clock += 20 * 60_000;
    dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    await settle();
    await tap(COPY.log.injectedAfterExpiry);
    await tap('Log this injection');
    expect(text()).toContain('Logged 11 units');
    await tap('History');
    // 7:00 PM + 20 min in Karachi. The calculation time must NOT be what landed.
    expect(text()).toContain('7:20');
    expect(clock).toBe(calculatedAt + 20 * 60_000);
  });
});

describe('§7.2 a failed write retries, and escalates only when retrying stops helping', () => {
  /**
   * The common case, and the one that must stay invisible. Lock contention and
   * quota pressure clear on their own; a bar for every one of those is noise
   * that teaches him to dismiss the bar that matters.
   */
  it('a transient failure recovers on the automatic retry, with nothing asked of him', async () => {
    await setUpAsHisBrother(failingWrites(1));
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    expect(text()).toContain('Logged 11 units');
    expect(stuckPrompts).toHaveLength(0);
    // §7.2 — the buzz fires only after a write RESOLVED, so exactly one.
    expect(buzzes).toBe(1);
    await tap('History');
    expect(text()).toContain('injected 11 units');
  });

  /**
   * Twice is not transient. The bar names the amount because `committing` now
   * outlives the logged screen, so by the time he reads it he may be elsewhere.
   */
  it('a persistent failure escalates, naming the dose that is not in the record', async () => {
    await setUpAsHisBrother(failingWrites(99));
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    expect(stuckPrompts).toHaveLength(1);
    expect(stuckPrompts[0]?.amount).toBe('11 units');
    expect(text()).toContain('still counts toward your next calculation while the app is open');
    expect(text()).not.toMatch(/retry|retrying/i);
    expect(buzzes).toBe(0);
  });

  it('and the bar\'s retry writes the FROZEN payload once the disk comes back', async () => {
    await setUpAsHisBrother(failingWrites(2));
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    expect(stuckPrompts).toHaveLength(1);
    stuckPrompts[0]?.retry();
    await settle();
    expect(text()).toContain('Logged 11 units');
    await tap('History');
    expect(text()).toContain('injected 11 units');
  });
});

describe('§7.1 the amount gate at commit — §13.6\'s confirmation flow', () => {
  it('a large divergence needs a second, explicit tap before the row is written', async () => {
    await setUpAsHisBrother();
    await keys('150');
    await tap('Next');
    await keys('10');
    await tap('Work out the dose');
    await tap('I injected this');
    tapFast('+', 10); // 1 unit stepped up to 6: |6-1| >= 5 and 6 >= 3x1
    await settle();
    await tap('Log this injection');
    expect(text()).toContain('The app worked out 1 unit and you have entered 6 units');
    // Not committed: still on the amount screen, no logged row.
    expect(text()).toContain('How many units did you actually inject?');
    expect(text()).not.toContain('Logged 6 units');
    await tap('It is what I injected — log it');
    expect(text()).toContain('Logged 6 units');
    await tap('History');
    expect(text()).toContain('calculated 1 unit · injected 6 units');
  });

  it('adjusting the amount withdraws the confirmation — it applied to the exact value shown', async () => {
    await setUpAsHisBrother();
    await keys('150');
    await tap('Next');
    await keys('10');
    await tap('Work out the dose');
    await tap('I injected this');
    tapFast('+', 10);
    await settle();
    await tap('Log this injection');
    expect(text()).toContain('That is a large difference');
    await tap('−'); // 6 -> 5.5: the difference is 4.5, under the 5-unit floor
    expect(text()).not.toContain('That is a large difference');
    await tap('Log this injection');
    expect(text()).toContain('Logged 5.5 units');
  });

  it('the 100-unit hard cap refuses with no way through', async () => {
    await setUpAsHisBrother();
    await keys('600');
    await tap('Next');
    await keys('300');
    await tap('Work out the dose');
    await tap('Show the dose'); // 45 units clears §6.2's gate first
    await tap('I injected this');
    tapFast('+', 111); // 45 stepped to 100.5
    await settle();
    await tap('Log this injection');
    expect(text()).toContain('A syringe does not hold more than 100 units');
    expect(text()).toContain('How many units did you actually inject?');
    // A hard refusal offers no confirm-anyway control (§4.5: hard rejects).
    expect(text()).not.toContain('It is what I injected');
    await tap('−'); // back inside the syringe: the refusal is withdrawn
    expect(text()).not.toContain('A syringe does not hold more than 100 units');
  });

  it('a zero amount is refused with words, not silence', async () => {
    await setUpAsHisBrother();
    await keys('150');
    await tap('Next');
    await keys('10');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('−');
    await tap('−'); // 1 -> 0.5 -> 0
    await tap('Log this injection');
    expect(text()).toContain('Tapping this says you injected. Enter how much.');
    expect(text()).not.toContain('Logged');
  });
});

describe('§7.2 the two taps, through the interface', () => {
  it('the first opens the amount step and writes nothing; the second commits', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');

    await tap('I injected this');
    expect(text()).toContain('How many units did you actually inject?');
    // §7.1 — pre-filled with the calculated dose, so the common case is two
    // taps and no typing.
    expect(text()).toContain('11');
    // Nothing is in the history yet.
    expect(text()).not.toContain('Logged');

    await tap('Log this injection');
    expect(text()).toContain('Logged 11 units');
    // §8.1 — the eat-by clock starts at THIS tap. 7:00 PM plus thirty minutes.
    expect(text()).toContain('7:30 PM');
  });

  it('and the history shows calculated and injected separately, never merged', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    // §7.1 — he injected more than the app worked out, which is the routine
    // case until his prescription is revisited.
    await tap('+');
    await tap('+');
    await tap('Log this injection');
    await tap('History');

    expect(text()).toContain('calculated 11 units');
    expect(text()).toContain('injected 12 units');
  });
});

describe('§7.4 the stacking gate, end to end', () => {
  it('suppresses a positive correction after a recent injection, and says so', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    await tap('Done');

    // Two hours later, the same reading and meal.
    clock += 2 * 3_600_000;
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');

    const screen = text();
    // The meal term alone.
    expect(screen).toContain('Correction held back');
    // §10.3 — shown, struck through, WITH ITS REASON.
    expect(screen).toContain('held back, you injected recently');
    expect(screen).toContain('Total5 units');
    // §7.4.1 — the override is offered, never taken for him.
    expect(screen).toContain('Why is this smaller?');
  });

  it('§7.4.1 — the override states the ceiling in his own units', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    await tap('Done');

    clock += 2 * 3_600_000;
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('Why is this smaller?');

    // 11 injected units x 30 mg/dL per unit = 330.
    expect(text()).toContain('at most about 330 mg/dL');
    // Never a bare figure: v3 presented the ceiling as an estimate, which
    // overstates by roughly 2x and discourages a correction that is needed.
    expect(text()).toContain('likely less this far in');
  });

  it('and NEVER suppresses a negative correction — the round-2 critical', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    await tap('Done');

    clock += 2 * 3_600_000;
    // 100 mg/dL with 60 g: correction -1.667, meal 6, total 4.333 -> 4 units.
    // v2's rule gave 6 — MORE insulin, on top of insulin already on board.
    await keys('100');
    await tap('Next');
    await keys('60');
    await tap('Work out the dose');

    expect(text()).toContain('Total4 units');
    expect(text()).not.toContain('Correction held back');
    expect(text()).toContain('You are well below target');
  });
});

describe('§7.7.1 both exports, from the interface', () => {
  it('produces a restorable file and a readable one, and only the first counts', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    await tap('History');
    await tap('Save a copy');

    expect(text()).toContain('Move to another phone');
    expect(text()).toContain('Save the record');
    // §7.7.1 — the counter is suppressed until there is something to protect,
    // and this record has one dose in it.
    expect(text()).toContain('No copy saved yet');

    // Both buttons used to read "Make it", so this test had to pick them out of
    // an array by POSITION. They have distinct names now, which is the same
    // change that makes them distinguishable to a screen reader.
    const named = (label: string): HTMLButtonElement | undefined =>
      [...root.querySelectorAll('button')].find((b) => buttonLabel(b) === label);
    const move = named('Download backup');
    const save = named('Download report');
    save?.click();
    await settle();
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.type).toBe('text/html');
    // The readable export does NOT touch the counter.
    expect(text()).toContain('No copy saved yet');

    move?.click();
    await settle();
    expect(downloads).toHaveLength(2);
    expect(downloads[1]?.type).toBe('application/json');
    expect(text()).toContain('Last made a copy you can restore from: today');
  });

  it('and the readable file carries the reading that had no dose', async () => {
    await setUpAsHisBrother();
    await keys('65');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('Record this reading');
    await tap('Save this reading');
    await tap('Save a copy');

    const save = [...root.querySelectorAll('button')].find(
      (b) => buttonLabel(b) === 'Download report',
    );
    save?.click();
    await settle();
    const html = downloads[0]?.contents ?? '';
    expect(html).toContain('reading only, no dose');
    expect(html).toContain('65 mg/dL');
    expect(html).toContain('cannot be loaded back into the app');
    expect(html.toLowerCase()).not.toContain('<script');
  });
});

describe('§7.3 delete, with its consequence', () => {
  it('names the injected figure and what deleting it changes', async () => {
    await setUpAsHisBrother();
    await keys('330');
    await tap('Next');
    await keys('50');
    await tap('Work out the dose');
    await tap('I injected this');
    await tap('Log this injection');
    await tap('History');
    await tap('Delete');

    expect(text()).toContain('Delete the 11 units from');
    expect(text()).toContain('The stacking check is currently using this dose');
    expect(text()).toContain('Delete it only if you did not inject it');

    await tap('Delete this entry');
    expect(text()).not.toContain('calculated 11 units');
  });
});

describe('§10.8 the running build is on screen', () => {
  it('because it is the only way to diagnose a report', async () => {
    await boot();
    expect(text()).toContain('test (test)');
  });
});
