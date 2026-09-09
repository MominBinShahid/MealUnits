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
});

afterEach(() => {
  dom.window.close();
});

async function boot(): Promise<void> {
  await start({
    root,
    now: () => clock,
    timeZone: KARACHI,
    indexedDB: new IDBFactory(),
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
async function setUpAsHisBrother(): Promise<void> {
  await boot();
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
   * The sweep. Rather than one scripted scenario, this walks the everyday path
   * and asserts after EVERY tap that the screen either changed or grew an
   * explanation. It is the cheap general form of the check above, and it is
   * what would have caught the 7090 dead end without anyone thinking of 7090.
   */
  it('no tap on the everyday path leaves the screen unchanged and silent', async () => {
    await setUpAsHisBrother();
    const script: readonly string[] = ['1', '8', '0', 'Next', '5', '0', 'Work out the dose'];
    for (const label of script) {
      const before = text();
      await tap(label);
      const after = text();
      if (after === before) {
        throw new Error(`Tapping "${label}" changed nothing on screen and said nothing.`);
      }
    }
    expect(text()).toContain('units of Humulin R');
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
