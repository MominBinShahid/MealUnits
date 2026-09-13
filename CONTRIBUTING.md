# Contributing

**This app returns a number of units of insulin to inject. A wrong number here is a hypoglycaemic
event, not a bug report.** Everything below follows from that sentence.

**It is for people with type 1 diabetes** — a long-acting insulin daily, plus a short-acting one at
meals worked out from the person's own target, ISF and ICR. Type 2 treatment is different and this
arithmetic does not describe it, and neither does a pump. Knowing that is the difference between
reviewing a change and reviewing it for the right people.

Contributions are welcome, including bug reports from people who just use it. But this repository is
stricter than its size suggests, and the strictness is not taste — every rule here exists because
something went wrong once.

---

## Before you open a pull request

```sh
npm install
npm run check            # typecheck, lint, and the full test suite
python3 check-plan.py    # the documents against each other and against the code
```

Both must pass. `check-plan.py` needs no dependencies — it is one file and the standard library.

**Four jobs gate a pull request**, and the second one surprises people:

| Job | What it does |
|---|---|
| `check` | Typecheck, lint, and the tests |
| `plan` | Runs `check-plan.py --self-test`, then `check-plan.py`. It reads the documents and the code together and fails on drift between them |
| `mutation` | Stryker over `src/core`, `src/state` and `src/config.ts`, at a **100%-or-fail** threshold |
| `golden-change` | Fails if you changed a file under `test/golden/` without writing `GOLDEN-CHANGE:` and a rationale in the pull request body |

That last one is deliberate friction. Mutation testing cannot validate the oracle — it only proves
the tests notice when the code changes. **A golden case is the oracle**, so changing one has to be a
conspicuous act rather than a quiet edit inside a green build.

---

## Five rules that will get a change rejected

1. **Every number lives in `src/config.ts`.** Enforced by two lint rules, because the obvious one
   does not report `const X = 5` — so a file can otherwise launder a literal through a local
   constant. Reference data is the one exemption, and it has conditions: see §11.8.
2. **`src/core` imports nothing.** No DOM, no storage, no clock, no framework. Time is passed in as
   data. That constraint is what makes the golden cases, the boundary sweep and the 100% mutation
   gate possible at all.
3. **Clamp the total, never the correction** (§2.1). Flooring a negative correction at zero discards
   the fact that the reading is low — and it errs in the direction that gives *more* insulin. This
   has been reintroduced by a well-meaning edit before.
4. **`check-plan.py` is maintained with the documents, not after them.** If your change retires a
   phrase, moves a number, or adds a rule the script tracks, update the script in the same commit.
   A new check arrives with a seeded mutation in `SELF_TESTS` proving it can fail.
5. **The tests are not the specification.** `docs/PLAN.md` is. A change that makes the tests pass by
   changing what the app means is a change to the specification, and it needs to say so.

---

## If something looks wrong, ask — do not fix it

**This is the rule most likely to catch you out, and it is the one worth reading twice** (§20.1.1).

If a test, a comment, or the plan looks wrong, open an issue saying what it asserts, what the code
does, and which you think is right. Then wait.

The reason is that two situations are **indistinguishable from the code**: either the artefact was
written to match a defect, or the behaviour was deliberate and you are about to break it on purpose.
Only the maintainer can tell them apart. Silently picking one turns the specification into a record
of whatever the code happens to do — and in this project that record is the safety argument.

Things that look like bugs and are not, with their reasons, are in `docs/BUILD-NOTES.md`.

---

## What this project will not accept

`docs/BACKLOG.md` records everything deliberately excluded **with the reason**, so that nothing gets
silently reopened. Its **NEVER** section is the short answer: no fat/protein dosing, no Bluetooth
meter import, and nothing resembling a closed loop or automated dosing. Those are not "not yet".

Before proposing a feature, check whether it is already in there. If it is and you disagree with the
reason, that is a conversation worth having — open an issue rather than a pull request.

---

## Where the answers are

| File | What it is |
|---|---|
| [`docs/PLAN.md`](docs/PLAN.md) | The specification and the single source of truth. `§N` anywhere in this repository means a section of this file |
| [`docs/CLINICAL.md`](docs/CLINICAL.md) | Every clinical decision with its source, and the reversals. Written to be read by a physician |
| [`docs/BUILD-NOTES.md`](docs/BUILD-NOTES.md) | What the build had to decide that the plan does not state. Cited as *note N*, never `§N` |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Everything excluded, with the reason |
| [`docs/CARBS.md`](docs/CARBS.md) | The carbohydrate reference, every value with its source and confidence |
| [`README.md`](README.md) | The formula, what the app refuses to do, and how it is put together |

---

## Reporting a problem you hit while using it

You do not need any of the above. Open an issue and say what you entered, what it showed, and what
you expected. **If the number looked wrong, say so first and say what your settings are** — that is
the only kind of report that gets dropped everything for.

Please do not include anything identifying in a screenshot of your log.
