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
// Empty counts as unset. `SMOKE_LAN_URL= node tools/smoke.mjs` used to reach the
// else branch and point Chrome at the empty string, which fails four checks and
// takes a minute to say so, instead of failing immediately with the reason.
const LAN_URL = process.env.SMOKE_LAN_URL?.trim() || null;
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

const setUp = async ({ ev }) => {
  const tap = async (re) => { await ev(`[...document.querySelectorAll('button')].find(b=>${re}.test(b.textContent))?.click()`); await wait(400); };
  await tap('/I have read this/i'); await tap('/own risk/i'); await wait(400);
  for (const [label, value] of [['Which insulin', 'Lantus'], ['How many units', '36'], ['When', 'early']]) {
    await ev(`(()=>{const q=[...document.querySelectorAll('label')].find(n=>n.textContent.includes(${JSON.stringify(label)}));const i=q.parentElement.querySelector('input');i.focus();i.value=${JSON.stringify(value)};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await wait(120);
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
  await session(`/tmp/mealunits-smoke-${width}`, port, width, async ({ ev, open }) => {
    await open(URL_UNDER_TEST);
    const tap = await setUp({ ev });
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
      await ev(`document.body.innerText.includes('cannot read below') && document.body.innerText.includes('Treat it now')`), true);
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
      await ev(`document.body.innerText.includes('ketoacidosis')`), true);
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
await session('/tmp/mealunits-smoke-foods', 9307, 412, async ({ ev, open }) => {
  await open(URL_UNDER_TEST);
  const tap = await setUp({ ev });
  for (const d of ['1', '8', '0']) await tap(`/^${d}$/`);
  await tap('/^Next$/'); for (const d of ['5', '0']) await tap(`/^${d}$/`);

  check('the food list is offered on the carbohydrate step', await ev(`/Food list/.test(document.body.innerText)`), true);
  await tap('/^Food list$/'); await wait(400);
  check('and it opens with the table behind it', await ev(`/Tandoor naan/.test(document.body.innerText)`), true);
  check('the caveat is above the numbers, not below them', await ev(
    `document.body.innerText.indexOf('Estimates, not measurements') < document.body.innerText.indexOf('Tandoor naan')`), true);

  await tap('/^Back$/'); await wait(400);
  // The whole safety argument: it never writes into the field, and it never
  // costs you what you already typed.
  check('back returns the carbohydrate entry, still holding what was typed', await ev(
    `/50/.test(document.body.innerText) && !/Tandoor naan/.test(document.body.innerText)`), true);
});

await session('/tmp/mealunits-smoke-path', 9304, 412, async ({ send, ev, open }) => {
  await send('Log.enable');
  await open(URL_UNDER_TEST);
  const tap = await setUp({ ev });
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
    logged = (await ev(`/Logged 2 units/.test(document.body.innerText)`)) === true;
    if (logged) break;
    await wait(100);
  }
  check('and logging it says so', logged, true);
  check('the screen is not blank', await ev(`document.body.innerText.length > 40`), true);
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
  const tap = await setUp({ ev });
  check('the app is the first history entry, as on a phone', await ev(`history.length`), 1);
  for (const d of ['1', '8', '0']) await tap(`/^${d}$/`);
  await tap('/^Next$/');
  check('reaching the carbohydrate screen pushes exactly one entry', await ev(`history.length`), 2);

  const entries = (await send('Page.getNavigationHistory')).result.entries;
  await send('Page.navigateToHistoryEntry', { entryId: entries.at(-2)?.id });
  await wait(1200);
  check('and the back gesture returns to the reading screen, not out of the app',
    await ev(`/What.s your blood sugar/.test(document.body.innerText)`), true);
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
    const tap = await setUp({ ev });
    for (const d of ['1', '2', '0']) await tap(`/^${d}$/`);
    await tap('/^Next$/'); for (const d of ['2', '5']) await tap(`/^${d}$/`);
    await tap('/Work out the dose/'); await wait(500);
    check('insecure origin: 120 with 25 g still gives 2 units', await ev(`document.querySelector('.result .n')?.textContent`), '2');
    await tap('/I injected this/'); await wait(500);
    await tap('/Log this injection/');
    let logged = false;
    for (let i = 0; i < 60; i++) {
      logged = (await ev(`/Logged 2 units/.test(document.body.innerText)`)) === true;
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
