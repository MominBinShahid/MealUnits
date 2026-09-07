# MealUnits

A mealtime insulin dose calculator for one adult with type 1 diabetes, built as an installable,
offline-capable web app.

It takes a blood sugar reading and a carbohydrate amount and returns the number of units of
short-acting insulin to inject. It is arithmetic its user currently does in his head.

**It is not a medical device, it has no regulatory clearance, and it has not been clinically
validated.** It does not diagnose, does not adjust therapy, and does not decide anything a clinician
has not already decided. It is configured for one specific person's prescription; if you are not that
person, the numbers in it are wrong for you.

---

## The formula

```
correction = (bloodSugar − target) ÷ insulinSensitivity
meal       = carbohydrate ÷ carbRatio
total      = correction + meal
dose       = max(0, total), rounded to your syringe's increment
```

Three properties this app takes seriously, and that most of the alternatives do not:

- **The correction may be negative, and it is subtracted from the meal dose.** Below target, you need
  less insulin for the same meal.
- **Only the total is clamped at zero — never the correction on its own.** Flooring the correction
  discards the fact that you are low, in the direction that gives you *more* insulin.
- **Nothing is rounded until the end.** Rounding the two parts and then adding them gives a different
  answer, and the plan carries the worked pair where it does.

Everything clinical, with its sources and the arguments behind it, is in
**[CLINICAL.md](docs/CLINICAL.md)**.

---

## What it refuses to do

| At | It does |
|---|---|
| below 70 mg/dL | **Shows no insulin number at all.** Treat first — 15 g of fast-acting carbohydrate, check again in 15 minutes. |
| below 54 mg/dL | The same, with escalated wording and a get-help line. |
| below target | Calculates, cautions, and inverts the timing advice: eat first, then inject. |
| at or above 250 mg/dL | Calculates normally, and says check ketones. |
| at or above 20 units | Withholds the dose and shows your two inputs instead, until you tap. |
| within 4 hours of a logged injection | Holds back a *positive* correction and covers the meal. Never holds back a negative one. |
| with no reading entered | Asks for one explicit tap first, and switches the timing advice off. |

**The low gate is the part that works from the first launch and depends on no ratio being correct.**

---

## Running it

Requires Node 24 or later — the active LTS line. The exact version is pinned in `.node-version`, and
CI reads that file rather than carrying its own copy.

```sh
npm install
npm run dev        # development server
npm test           # 566 tests
npm run check      # typecheck, lint and tests — what CI runs
npm run mutate     # mutation testing on the core, at a 100% break threshold
npm run build      # production build, including the service worker
npm run smoke      # real-browser checks against a served build (see tools/smoke.mjs)
```

Everything is on its latest release except two, both deliberate:

- **Vitest is held at 4.x.** Stryker's runner silently fails to activate mutants under Vitest 5 — the
  score reads 2.57% instead of 100%, which looks like a testing gap and is not one. See
  `BUILD-NOTES.md` note 15.
- **TypeScript is held at 6.0.3.** 7.0.2 is out, but `typescript-eslint` declares
  `typescript: >=4.8.4 <6.1.0` and has no release that accepts 7. Taking it would disable every
  type-aware lint rule, including the one enforcing "every number lives in `config.ts`".

---

## How it is put together

```
docs/              PLAN.md, CLINICAL.md, BUILD-NOTES.md, BACKLOG.md, the designs
src/config.ts      every number in the codebase, and nothing else has one
src/core/          pure functions: the arithmetic, the bands, the gates, the parsing
src/state/         one application state and one pure transition function
src/storage/       IndexedDB, the two exports, the import, cross-tab invalidation
src/ui/            the screens, and the strings they say
src/sw.ts          the service worker
```

**`src/core` imports nothing** — no DOM, no storage, no clock, no framework. Time is passed in as
data. That is what makes the 76 golden cases and the boundary sweep possible, and it is why the
mutation-testing gate can be set to 100%.

**Every number lives in `src/config.ts`**, enforced by two lint rules rather than by convention. The
second rule exists because `no-magic-numbers` does not report `const X = 5`, so a file can otherwise
launder a literal through a local constant.

### The testing, and what it is worth

- **566 tests**, including 76 golden cases that each carry the hand derivation of their expected
  value in the fixture.
- **100% mutation score** on the core (1347 mutants killed, 0 survived). Eighteen mutants are disabled
  by name, each with the reason written at the line — see `BUILD-NOTES.md` note 16.
- **Integration tests** driving the whole app through a real DOM and a real IndexedDB, because a
  refactor can swap two field mappings without touching a single line of arithmetic.

**None of that is a proof.** Neither golden cases nor mutation testing validates the *specification*
used as the oracle — and this project has caught itself shipping a wrong expected value more than
once. The honest claim is the validation actually performed, which is the list above.

---

## The record

The app keeps every dose, every injected amount, and every reading it refused to dose — and the
refusals are the point. It exports two files:

- **Move to another phone** — the only file the app can load back.
- **Save the record** — a self-contained page anyone can open, grouped by the prescription that
  produced each row, so a dose worked out under older ratios is never printed under newer ones.

Storage is per-browser and plaintext. The app never claims otherwise, and nothing leaves the device:
no backend, no accounts, no sync, no analytics.

---

## Documents

| File | What it is |
|---|---|
| [PLAN.md](docs/PLAN.md) | The specification. Twenty-five revisions, twenty-two adversarial review rounds. The single source of truth. |
| [CLINICAL.md](docs/CLINICAL.md) | Every clinical decision with its source, and the reversals. |
| [BUILD-NOTES.md](docs/BUILD-NOTES.md) | Every decision the build had to make that the plan does not state. |
| [BACKLOG.md](docs/BACKLOG.md) | Everything deliberately left out, with reasons. |
| [BLOG-FIX.md](docs/BLOG-FIX.md) | A separate repository's service-worker fix, which had to ship first. |

---

## Licence

MIT. See the disclaimer at the top: free does not mean validated, and the regulators say so
explicitly — being free and open source is not an exemption from anything.
