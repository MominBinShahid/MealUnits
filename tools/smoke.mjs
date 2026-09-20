/**
 * Real-browser smoke checks, over the Chrome DevTools Protocol.
 *
 * WHY THIS EXISTS, and why the 559 unit tests are not enough.
 *
 * jsdom does not lay pages out, does not load fonts, does not enforce a content
 * security policy and has no service worker. Every defect below was invisible to
 * the whole suite and to the 100% mutation gate, and each was found by hand:
 *
 *   * the +/- keys measured 28px wide -- BELOW §10.7's 48px floor -- because a
 *     flex child with no width shrinks to its glyph. Two guesses at the cause
 *     preceded one measurement.
 *   * the foot navigation ran the full window width (1440px) against a 480px
 *     column, putting Settings and History in opposite corners of a desktop.
 *   * the app RELOADED ITSELF on a first visit, because `controllerchange`
 *     fires when the first worker claims a page as well as when a new one
 *     replaces an old one. Tapping "Log this injection" at the wrong moment
 *     blanked the screen and looked like the tap was ignored.
 *
 * Run against a served build:  npm run build && npm run preview & npm run smoke
 *
 * WHAT EARNS A PLACE HERE, added 2026-09-11 so this file does not become the
 * place every new assertion lands. A check belongs in this file only if BOTH:
 *
 *   1. jsdom cannot see it — it needs real layout, a real content security
 *      policy, real fonts, or a real service worker; and
 *   2. its failure makes the app UNUSABLE, not merely imperfect.
 *
 * Everything else belongs in the integration suite, which is faster, cheaper and
 * already drives the whole app. Four pieces of interface were added in the batch
 * this rule was written for; two qualified and two did not, and the two that did
 * are below.
 */
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { rmSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/**
 * BOTH origins, and that is the point of the second one.
 *
 * `localhost` is a SECURE CONTEXT. A LAN address is not. Some APIs simply do not
 * exist on an insecure origin — `crypto.randomUUID` among them — and the phone
 * reaches this app over a LAN address. Every check here passed on localhost
 * while "Log this injection" threw on the phone, silently, because the id for
 * the row could not be generated.
 *
 * So the everyday path is driven over both. Testing only the secure origin is
 * testing the one the user is not on.
 *
 * `SMOKE_LAN_URL=none` says THERE IS NO SECOND ORIGIN — see the run itself, at
 * the foot of this file, for when that is true and why it is spelled this way.
 */
const NO_LAN = 'none';
const SECURE_URL = process.env.SMOKE_URL ?? 'http://localhost:4173/MealUnits/';
/**
 * The machine's own LAN address, or null.
 *
 * `BACKLOG` T19's second finding. `package.json` defaulted `SMOKE_LAN_URL` to
 * `127.0.0.1`, and **Chrome treats 127.0.0.1 as a secure context exactly like
 * localhost** — same as `::1`. So the half of this run whose entire purpose is
 * an INSECURE origin was, at its default, testing the secure one twice.
 *
 * It was visible only because two of its checks assert the negative and
 * reported FAIL rather than passing vacuously. The other checks in that session
 * — including "AND IT LOGS", the defect the session exists for — would have
 * gone green against a context that can never reproduce it.
 *
 * Detected rather than configured, so the ordinary `npm run smoke` exercises
 * what it claims to. An explicit `SMOKE_LAN_URL` still wins, and `none` still
 * means there is no second origin.
 */
const lanAddress = () => {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      // `internal` excludes the loopback that started this. IPv4 only: a
      // link-local IPv6 address carries a zone index that a URL cannot hold.
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }
  return null;
};

const configuredLan = process.env.SMOKE_LAN_URL?.trim() || null;
const detectedLan = lanAddress();
// Empty counts as unset. `SMOKE_LAN_URL= node tools/smoke.mjs` used to reach the
// else branch and point Chrome at the empty string, which fails four checks and
// takes a minute to say so, instead of failing immediately with the reason.
const LAN_URL =
  configuredLan ?? (detectedLan === null ? null : `http://${detectedLan}:4173/MealUnits/`);
const URL_UNDER_TEST = SECURE_URL;
const failures = [];
const skipped = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n          expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
  if (!ok) failures.push(name);
}

/**
 * A block that did not run, recorded as neither a pass nor a failure.
 *
 * It accumulates the way `check` does, and for the same reason: the summary at
 * the end is the only line most runs are read by, so anything it does not carry
 * is invisible.
 */
function skip(name, why) {
  console.log(`  SKIP  ${name} — ${why}`);
  skipped.push(`${name} SKIPPED — ${why}`);
}

async function session(profile, port, width, body) {
  /**
   * A Chrome from an EARLIER run, still holding this port.
   *
   * Every session wipes its profile directory, and the comment above the
   * food-list session explains at length why: a check that reuses a dirty
   * profile passes or fails on its own history rather than on the build under
   * test. Wiping the directory does not help if a browser that was already
   * using it is still alive — it keeps its state in memory and it keeps
   * answering on this port, so the `fetch` below attaches to the OLD browser
   * and every check runs against whatever screen that run left behind.
   *
   * It happened on 2026-09-14: two runs were interrupted mid-suite, their
   * Chromes survived, and the next run reported the app skipping its own
   * first-run gate on a freshly wiped profile. A convincing bug that was not
   * one. `session` kills its child in `finally`, which covers a clean exit and
   * not a crash — and a crash is exactly when something is already wrong and
   * the next run's output matters most.
   *
   * Refusing is deliberate rather than killing it silently: a stray browser
   * means a previous run died, and that is worth being told about once rather
   * than tidied away every time.
   */
  try {
    const stale = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
    if (stale.ok) {
      failures.push(`port ${port} is already serving a browser from an earlier run`);
      console.log(`  FAIL  a previous run left a browser on port ${port}`);
      console.log(`          every check in this session would attach to it and run against`);
      console.log(`          its leftover state. Run: pkill -f mealunits-smoke`);
      return;
    }
  } catch { /* nothing there, which is what we want */ }

  const child = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--window-size=${width},915`, 'about:blank',
  ], { stdio: 'ignore' });
  let list = [];
  for (let i = 0; i < 80; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.length) break; } catch { /* not up */ }
    await wait(200);
  }
  const page = list.find((t) => t.type === 'page');
  if (!page) { failures.push('chrome did not start'); child.kill(); return; }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise((r) => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send('Page.enable'); await send('Runtime.enable');

  /**
   * Navigate and WAIT FOR THE APP, rather than for a fixed number of
   * milliseconds. The first version slept, and the fourth Chrome session in a
   * run would occasionally not be ready in time — so `ev` returned undefined,
   * two checks failed, and it looked exactly like the defect they were written
   * to catch. **A flaky check is worse than no check**, because it teaches you
   * to ignore the failure that matters.
   */
  const open = async (url) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 100; i++) {
      const ready = await ev(`!!document.querySelector('#app') && document.querySelector('#app').textContent.trim().length > 0`);
      if (ready === true) return;
      await wait(100);
    }
    failures.push('the app never rendered');
  };

  try { await body({ send, ev, open }); } finally { ws.close(); child.kill(); }
}

/**
 * Types ONE CHARACTER AT A TIME, through real key events.
 *
 * `Input.dispatchKeyEvent` is the whole point. The old helper assigned
 * `i.value = '150'` and fired one `input`, which is one render — and the defect
 * class this file exists to reach lives BETWEEN renders. jsdom's `typeInto`
 * already types per character and catches the desktop case; what it cannot do
 * is be a browser. This is the layer that is.
 *
 * It does NOT re-find the field per character. It focuses once and types into
 * whatever currently has focus, so a render that destroys the input fails here
 * rather than being worked around — the same rule `typeInto` follows, and for
 * the same reason: re-finding the element each keystroke lets the suite stay
 * green while the app is unusable by hand.
 */
const typeInto = async ({ ev, send }, label, value) => {
  const focused = await ev(`(()=>{const q=[...document.querySelectorAll('label')]
    .find(n=>n.textContent.includes(${JSON.stringify(label)}));
    if(!q)return 'no label';const i=q.parentElement.querySelector('input');
    if(!i)return 'no input';i.focus();i.value='';
    i.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()`);
  if (focused !== 'ok') throw new Error(`typeInto(${label}): ${focused}`);
  for (const character of value) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: character });
    await send('Input.dispatchKeyEvent', { type: 'keyUp' });
    await wait(20);
  }
  // What the field HOLDS, read back from whatever has focus rather than from a
  // fresh lookup, so a keystroke that landed on `<body>` is visible as a short
  // value instead of being silently re-found and retyped.
  return ev(`document.activeElement?.value ?? null`);
};

/**
 * Polls until `expr` is true, rather than sleeping a guessed number of
 * milliseconds.
 *
 * Every wait in this file used to be a fixed one, which is fine until a session
 * does something before setup that shifts the timing — `Page.resetNavigation
 * History` in the back-gesture session did exactly that, and setup began typing
 * into a screen that had not rendered. A fixed wait that is long enough is also
 * a fixed wait that is too long everywhere else.
 */
const until = async ({ ev }, expr, what, ms = 5000) => {
  for (let waited = 0; waited < ms; waited += 100) {
    if (await ev(expr)) return true;
    await wait(100);
  }
  // What was on screen instead. A timeout that only says what it wanted sends
  // the reader back to the browser to find out what it got.
  const seen = await ev(`document.querySelector('#app')?.textContent?.slice(0, 120) ?? '(no #app)'`);
  throw new Error(`smoke: waited ${ms}ms for ${what} and it never appeared. On screen: ${seen}`);
};

/**
 * Tap a button, WAITING for it to exist first, and FAILING when it never does.
 *
 * `BACKLOG` T19. The old one was a one-liner:
 *
 *   `[...document.querySelectorAll('button')].find(b=>RE.test(b.textContent))?.click()`
 *
 * followed by a fixed 400 ms. Two things wrong with it, and together they cost
 * this suite two permanent false failures on a clean tree.
 *
 * **The optional chain made a missing button a silent no-op.** Nothing clicked,
 * nothing thrown, and the run continued to the next step — so a failure
 * surfaced three screens later as "the dose never logged", which is a true
 * statement about a cause it cannot name. A helper that quietly does nothing
 * turns "the button moved" into "the feature broke".
 *
 * **And the wait was fixed where every other step polls.** `until` exists for
 * exactly this and the log step did not use it: after "I injected this" the
 * amount screen is a full re-render, and if it was not up inside 400 ms the
 * next tap hit nothing. The six-second poll that followed then waited for a
 * commit that had never been started. Both the secure and the insecure session
 * failed this way, on `main`, for at least one commit before anyone looked.
 *
 * The 400 ms after the click stays. That one is for the render the click
 * CAUSES, which no expression here can wait on — a different problem from
 * waiting for the control to appear.
 */
const tapper = ({ ev }) => async (re) => {
  const present = `[...document.querySelectorAll('button')].some(b=>${re}.test(b.textContent))`;
  await until({ ev }, present, `a button matching ${re}`);
  await ev(`[...document.querySelectorAll('button')].find(b=>${re}.test(b.textContent)).click()`);
  await wait(400);
};

/**
 * The page's text with §10.4's NO-BREAK SPACES folded to ordinary ones.
 *
 * `BACKLOG` T19, and the actual cause of both "it logs" failures — neither the
 * fixed wait nor the silent tap, which is what reading the harness suggested.
 *
 * §10.4 puts U+00A0 between every number and its unit so "2 units" cannot break
 * across a line and rejoin in the reader's head as "2Units". The logged screen
 * therefore reads `Logged 2\u00A0units at 9:35 PM`, and the check polled for
 * `/Logged 2 units/` with an ordinary space. It could never match. It has been
 * failing since the day the no-break space landed, on a check whose own name is
 * "AND IT LOGS — the defect this run exists for".
 *
 * Folded HERE rather than in each regex, because the next assertion about a
 * number and its unit would make the same mistake. The same fold exists in
 * `test/integration.test.ts` as `plain()`, for the same reason.
 */
const bodyText = `document.body.innerText.replace(/\u00a0/g, ' ')`;

const setUp = async ({ ev, send }) => {
  const tap = tapper({ ev });
  await until({ ev }, `!!document.querySelector('#app')?.textContent?.includes('Read this before')`,
    'the disclaimer');
  await tap('/I have read this/i'); await tap('/own risk/i');
  // §8.5, ADDED 2026-09-20 — the insulin is asked BEFORE the ratios and there
  // is no way past it. Humulin R, because everything downstream here is timed
  // for regular human insulin. The confirmation echo is a second tap, and it
  // is a gate rather than a notification: nothing is stored until it.
  await until({ ev }, `!!document.querySelector('#app')?.textContent?.includes('Which insulin do you inject')`,
    'the insulin question');
  await tap('/^Humulin R/');
  await tap('/that\u2019s mine/');
  await until({ ev }, `[...document.querySelectorAll('label')].some(n=>n.textContent.includes('What should a correction aim for'))`,
    'the setup screen');
  // The THREE RATIOS, added 2026-09-14. They used to arrive prefilled, and this
  // helper typed only the basal block because that was the only thing left to
  // fill in. `88f3394` removed the prefill on 2026-09-13 — the app fills in
  // nobody's prescription now — and did not touch this file, so "Save and start"
  // stayed disabled and EVERY check after this point ran against the first-run
  // screen. Seventeen of them, failing the same way on every run since.
  //
  // The failures were loud, which is the only reason this was survivable: the
  // suite reported 17 FAILURES rather than passing. What it could not say is
  // that they all had one cause, three screens earlier.
  //
  // The threshold field fills itself in from these three (§6.2), so it is not
  // typed here — typing it would latch `thresholdIsDerived` false and test a
  // path the user does not take on first run.
  for (const [label, value] of [
    ['What should a correction aim for', '150'],
    ['How far does one unit lower', '30'],
    ['How much carbohydrate does one unit cover', '10'],
    ['Which insulin', 'Lantus'], ['How many units', '36'], ['When', 'early'],
  ]) {
    const got = await typeInto({ ev, send }, label, value);
    // Per field, because a dropped keystroke is what this typing style exists to
    // expose and the next screen would hide it behind a generic failure.
    check(`setup: "${label}" holds what was typed`, got, value);
    await wait(60);
  }

  /**
   * §20.3 applied to the harness. EVERY check in this file depends on setup
   * having succeeded, and until 2026-09-14 nothing asserted that it had.
   *
   * When `88f3394` stopped prefilling the three ratios and did not update this
   * helper, "Save and start" stayed disabled, setup silently did nothing, and
   * seventeen checks failed against the first-run screen — reporting the
   * CONSEQUENCE seventeen times and the cause not once.
   *
   * One assertion, before the tap, naming the real fault on the day it appears.
   */
  const ready = await ev(`(()=>{const b=[...document.querySelectorAll('button')]
    .find(x=>/^Save and start$/.test(x.textContent));
    if(!b)return 'the button is not on screen';
    return b.disabled ? 'the button is disabled, so setup did not complete' : 'ok'})()`);
  check('setup completes: "Save and start" is reachable', ready, 'ok');
  if (ready !== 'ok') {
    throw new Error(`smoke setup did not complete — ${ready}. Every check after `
      + `this point would run against the first-run screen and report a symptom `
      + `rather than this cause.`);
  }

  await tap('/^Save and start$/'); await wait(600);
  return tap;
};

console.log(`smoke: ${URL_UNDER_TEST}`);

// 1. A first visit must load the document ONCE.
rmSync('/tmp/mealunits-smoke-cold', { recursive: true, force: true });
await session('/tmp/mealunits-smoke-cold', 9301, 412, async ({ send, ev, open }) => {
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `sessionStorage.setItem('loads', String(Number(sessionStorage.getItem('loads')||0)+1));`,
  });
  await open(URL_UNDER_TEST);
  // The reload, if it were still happening, lands after activation — so this
  // has to wait past it rather than sampling early and passing by luck.
  await wait(4000);
  check('a first visit does not reload itself', await ev(`Number(sessionStorage.getItem('loads'))`), 1);
  check('the worker took control', await ev(`!!navigator.serviceWorker.controller`), true);
  check('no unstyled flash: a webfont is in use', await ev(`getComputedStyle(document.body).fontFamily.split(',')[0]`), '"Space Grotesk"');
});

// 2. Layout, at a phone width and a desktop width.
for (const [width, port] of [[412, 9302], [1440, 9303]]) {
  rmSync(`/tmp/mealunits-smoke-${width}`, { recursive: true, force: true });
  await session(`/tmp/mealunits-smoke-${width}`, port, width, async ({ ev, send, open }) => {
    await open(URL_UNDER_TEST);
    const tap = await setUp({ ev, send });
    const box = async (sel) => ev(`(()=>{const n=document.querySelector('${sel}');if(!n)return null;const r=n.getBoundingClientRect();return [Math.round(r.x),Math.round(r.width)]})()`);
    check(`${width}px: the nav sits inside the app column`, await box('.foot-nav'), await box('.screen'));
    check(`${width}px: the version line sits inside it too`, await box('.foot'), await box('.screen'));
    // The GENERAL form of note 56's defect, which build note 56 claimed was
    // already asserted here and was not: the two checks above measure the two
    // foot elements, so an element overflowing INSIDE `.screen` — which is
    // exactly what note 56 fixed, export buttons bursting their card at 360px —
    // passed them both. This asks the page itself, once per width, and it is
    // the check that would have caught it without anyone naming the element.
    check(`${width}px: nothing pushes the page sideways`,
      await ev(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);
    for (const d of ['1', '8', '0']) await tap(`/^${d}$/`);
    await tap('/^Next$/'); for (const d of ['5', '0']) await tap(`/^${d}$/`);
    await tap('/Work out the dose/'); await wait(500); await tap('/I injected this/'); await wait(600);
    check(`${width}px: the +/- keys are square and meet §10.7's 48px floor`,
      await ev(`JSON.stringify([...document.querySelectorAll('.stepper .key')].map(k=>{const r=k.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]}))`),
      JSON.stringify([[68, 68], [68, 68]]));

    // §4.3 step 3's combined response, which qualifies on BOTH counts: it added
    // a paragraph to the fullest card in the app, and if that card overflows,
    // the instruction pushed out of view is "Treat it now". jsdom asserts the
    // WORDS are present and is blind to whether they are on screen.
    await open(URL_UNDER_TEST);
    await wait(600);
    for (const d of ['0']) await tap(`/^${d}$/`);
    await tap('/^Next$/'); for (const d of ['5', '0']) await tap(`/^${d}$/`);
    await tap('/Work out the dose/'); await wait(600);
    // `innerText`, not `textContent`, and that is the whole reason this one is
    // not a duplicate of the integration test that asserts the same words:
    // jsdom does not implement `innerText` at all, and `textContent` includes
    // elements CSS has hidden. A card broken by `display: none` reads as
    // present there and absent here.
    check(`${width}px: a typed 0 blocks, and says the reading cannot be real`,
      await ev(`${bodyText}.includes('cannot read below') && ${bodyText}.includes('Treat it now')`), true);
    check(`${width}px: the block card still contains itself`,
      await ev(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);
    check(`${width}px: and the treat-first instruction is ABOVE THE FOLD`,
      await ev(`(()=>{const n=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&/Treat it now/.test(e.textContent));if(!n)return 'missing';return n.getBoundingClientRect().bottom <= window.innerHeight})()`), true);

    // §4.5's HI/LO guidance. It qualifies because the text behind it is the
    // app's diabetic-ketoacidosis warning, and it rendered NOWHERE until this
    // batch — a disclosure that silently fails to open restores that defect.
    await open(URL_UNDER_TEST);
    await wait(600);
    await tap('/Meter showing HI or LO/');
    // Same `innerText` argument as above: jsdom proves the disclosure's text is
    // in the tree, and only a real browser proves it is on the screen.
    check(`${width}px: the meter guidance opens, and reaches the ketone warning`,
      await ev(`${bodyText}.includes('ketoacidosis')`), true);
  });
}

// 3. The everyday path must reach a logged row, with nothing on the console.
rmSync('/tmp/mealunits-smoke-path', { recursive: true, force: true });
// §11.8's food list, at sanity level only. It is read-only, so the one thing
// worth proving in a real browser is that the door opens, the table is behind
// it, and coming back does not cost the number already typed.
// The profile is wiped first, like every other session here. Omitting it cost a
// real hour: this block was written, run against the deployed site BEFORE the
// feature shipped, and its service worker cached that build — so every later
// run replayed the old bundle and reported four failures against code that was
// live. A check reusing a dirty profile passes or fails on its own history
// rather than on the build under test, which is worse than not having it.
rmSync('/tmp/mealunits-smoke-foods', { recursive: true, force: true });
await session('/tmp/mealunits-smoke-foods', 9307, 412, async ({ ev, send, open }) => {
  await open(URL_UNDER_TEST);
  const tap = await setUp({ ev, send });
  for (const d of ['1', '8', '0']) await tap(`/^${d}$/`);
  await tap('/^Next$/'); for (const d of ['5', '0']) await tap(`/^${d}$/`);

  check('the food list is offered on the carbohydrate step', await ev(`/Food list/.test(${bodyText})`), true);
  await tap('/^Food list$/'); await wait(400);
  check('and it opens with the table behind it', await ev(`/Tandoor naan/.test(${bodyText})`), true);
  check('the caveat is above the numbers, not below them', await ev(
    `${bodyText}.indexOf('Estimates, not measurements') < ${bodyText}.indexOf('Tandoor naan')`), true);

  /**
   * TYPED AS FAST AS THE PROTOCOL WILL SEND, with no wait between keystrokes.
   *
   * Momin reported on 2026-09-14 that typing FAST into a text field on his
   * phone dropped a character, and that typing slowly did not — so the symptom
   * is a function of the gap between keys, and every other typing check in this
   * file leaves 20ms in that gap. This one leaves none.
   *
   * The cause was the render destroying the input between keystrokes, and T3
   * removed it: the element now survives, so there is nothing for a keystroke to
   * fall off. He confirmed on the device that it is gone.
   *
   * **The identity check below is the one that means something, and the value
   * check on its own does not.** Both were written together, and both passed
   * against the PRE-PORT build — measured, not assumed. Of course they did: the
   * old code restored focus after every render, `document.activeElement ===
   * document.querySelector(...)` re-queries and therefore compares the
   * REPLACEMENT element against itself, and headless key events are awaited one
   * at a time so the restore always finished first. A check that passes on the
   * broken build is not a regression test; it is decoration.
   *
   * Identity is what the two builds actually disagree about. The node is stashed
   * before typing and compared after: `replaceChildren` returns a different
   * object, Preact returns the same one. That distinguishes them, and it is the
   * real-browser twin of the identity case in `test/integration.test.ts`.
   *
   * **What none of this covers.** The original was mobile-only, and the leading
   * theory is the soft keyboard's composition — predictive text running
   * compositionstart/update/end against the element. Headless Chrome sending key
   * events is not a soft keyboard. The composition half is covered in jsdom by
   * `test/integration.test.ts`; neither layer is a phone.
   */
  // Already on the food list — opened four lines above, and the two checks in
  // between only read text. A second `tap('/^Food list$/')` stood here and was
  // a NO-OP: that control lives on the carbohydrate step, which this session
  // has left. It never failed, because the old `tap` used `?.click()` and did
  // nothing quietly. T19's stricter tap found it on its first run, which is
  // the whole argument for making a missing button loud.
  const searchField = `document.querySelector('[data-field="foodQuery"]')`;
  await ev(`window.__field = ${searchField}; window.__field?.focus()`);
  for (const character of 'roti') {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: character });
    await send('Input.dispatchKeyEvent', { type: 'keyUp' });
  }
  await wait(300);
  check('typing fast into the food search drops nothing', await ev(`${searchField}?.value`), 'roti');
  // The SAME element object, not one that was rebuilt to look like it. This is
  // the assertion the pre-port build fails.
  check('and the field is the same element it was before typing', await ev(
    `window.__field === ${searchField} && window.__field.isConnected`), true);

  await tap('/^Back$/'); await wait(400);
  // The whole safety argument: it never writes into the field, and it never
  // costs you what you already typed.
  check('back returns the carbohydrate entry, still holding what was typed', await ev(
    `/50/.test(${bodyText}) && !/Tandoor naan/.test(${bodyText})`), true);
});

await session('/tmp/mealunits-smoke-path', 9304, 412, async ({ send, ev, open }) => {
  await send('Log.enable');
  await open(URL_UNDER_TEST);
  const tap = await setUp({ ev, send });
  for (const d of ['1', '2', '0']) await tap(`/^${d}$/`);
  await tap('/^Next$/'); for (const d of ['2', '5']) await tap(`/^${d}$/`);
  await tap('/Work out the dose/'); await wait(500);
  check('120 mg/dL with 25 g gives 2 units', await ev(`document.querySelector('.result .n')?.textContent`), '2');
  await tap('/I injected this/'); await wait(500);
  await tap('/Log this injection/');
  // Poll: the commit is a chain of IndexedDB round trips (§7.2), and how long
  // that takes is not ours to predict.
  let logged = false;
  for (let i = 0; i < 60; i++) {
    logged = (await ev(`/Logged 2 units/.test(${bodyText})`)) === true;
    if (logged) break;
    await wait(100);
  }
  check('and logging it says so', logged, true);
  check('the screen is not blank', await ev(`${bodyText}.length > 40`), true);
});

// 3b. The device back gesture, with the app as the FIRST history entry.
//
// Momin reported that back at the carbohydrate screen closed the app. It could
// not be reproduced on the current build — but the first attempt to check it
// was WEAK, because Chrome starts at `about:blank`, so `history.length` was 2
// and back had something other than our sentinel to consume. `resetNavigationHistory`
// makes the app entry 1, which is what a phone opening it fresh looks like and
// what an installed PWA always looks like. That is the condition the report
// describes, so that is the condition this checks.
rmSync('/tmp/mealunits-smoke-back', { recursive: true, force: true });
await session('/tmp/mealunits-smoke-back', 9306, 412, async ({ send, ev, open }) => {
  await open(URL_UNDER_TEST);
  await send('Page.resetNavigationHistory');
  const tap = await setUp({ ev, send });
  check('the app is the first history entry, as on a phone', await ev(`history.length`), 1);
  for (const d of ['1', '8', '0']) await tap(`/^${d}$/`);
  await tap('/^Next$/');
  check('reaching the carbohydrate screen pushes exactly one entry', await ev(`history.length`), 2);

  const entries = (await send('Page.getNavigationHistory')).result.entries;
  await send('Page.navigateToHistoryEntry', { entryId: entries.at(-2)?.id });
  await wait(1200);
  check('and the back gesture returns to the reading screen, not out of the app',
    await ev(`/What.s your blood sugar/.test(${bodyText})`), true);
  check('the app is still loaded', await ev(`!!document.querySelector('#app')?.textContent`), true);
});

// 4. The same path over an INSECURE origin, which is what a phone uses.
//
// THREE outcomes, not two, and the default is still the strict one. Losing this
// run loses real coverage — note 48's defect existed on this origin and nowhere
// else — so a forgotten `SMOKE_LAN_URL` remains a FAILURE and the run still
// exits 1. That is the local case, and it does not get weaker.
//
// But some origins have no LAN counterpart at all. Verifying the DEPLOYED site
// is one: every substantive check passes against
// `https://mominbinshahid.github.io/MealUnits/` and the run exited 1 anyway,
// because the one thing it could not do was reach a phone on this laptop's
// network. A verification step that cannot report success is a verification
// step people stop reading.
//
// So `SMOKE_LAN_URL=none` — the same variable that names the second origin says
// there is not one. One knob rather than two: a separate `SMOKE_NO_LAN` would
// have to define precedence against a `SMOKE_LAN_URL` that is also set, and
// `npm run smoke` already defaults the variable, so the second knob would be
// silently overridden by the first on the npm path. `none` travels through that
// default (`${SMOKE_LAN_URL:-…}`) untouched.
if (LAN_URL === null) {
  console.log(`  FAIL  insecure-origin run (set SMOKE_LAN_URL, or SMOKE_LAN_URL=${NO_LAN} if this origin has no LAN counterpart)`);
  failures.push('insecure-origin run was skipped');
} else if (LAN_URL.toLowerCase() === NO_LAN) {
  skip('insecure-origin block', 'not applicable to a remote origin');
} else {
  rmSync('/tmp/mealunits-smoke-lan', { recursive: true, force: true });
  await session('/tmp/mealunits-smoke-lan', 9305, 412, async ({ send, ev, open }) => {
    await send('Log.enable');
    await open(LAN_URL);
    check('insecure origin: this really is not a secure context', await ev(`window.isSecureContext`), false);
    check('insecure origin: crypto.randomUUID is absent, as on the phone', await ev(`typeof crypto.randomUUID`), 'undefined');
    const tap = await setUp({ ev, send });
    for (const d of ['1', '2', '0']) await tap(`/^${d}$/`);
    await tap('/^Next$/'); for (const d of ['2', '5']) await tap(`/^${d}$/`);
    await tap('/Work out the dose/'); await wait(500);
    check('insecure origin: 120 with 25 g still gives 2 units', await ev(`document.querySelector('.result .n')?.textContent`), '2');
    await tap('/I injected this/'); await wait(500);
    await tap('/Log this injection/');
    let logged = false;
    for (let i = 0; i < 60; i++) {
      logged = (await ev(`/Logged 2 units/.test(${bodyText})`)) === true;
      if (logged) break;
      await wait(100);
    }
    check('insecure origin: AND IT LOGS — the defect this run exists for', logged, true);
  });
}

// A run that skipped a block must NEVER look like a full one. The word "clean"
// on its own is the whole report for most runs, so the reduced coverage is
// carried on the same line rather than left further up the scrollback.
const gap = skipped.length === 0 ? '' : ` (${skipped.join('; ')})`;
console.log(failures.length === 0
  ? `\nsmoke: clean${gap || '.'}`
  : `\nsmoke: ${failures.length} FAILURE(S): ${failures.join(', ')}${gap}`);
process.exit(failures.length === 0 ? 0 : 1);
