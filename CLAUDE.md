# MealUnits — working instructions

An insulin bolus calculator for one adult with type 1 diabetes. It takes a blood sugar reading and
a carbohydrate amount and returns units of short-acting insulin. **A wrong number here is a
hypoglycaemic event, not a bug report.** Read that sentence before changing anything.

## Where everything is

| | |
|---|---|
| **`docs/PLAN.md`** | **The specification and the single source of truth.** `§N` anywhere in this repository means a section of this file. Its revision history was pruned on 2026-09-13; `git log` is the record |
| `docs/CLINICAL.md` | Every clinical decision with its source and its reversals. Written to be read by a physician |
| `docs/BUILD-NOTES.md` | Decisions the build had to make that the plan does not state. Entries are cited as **"note N"**, never `§N`, and every number resolves — 24 of them are cited from source and tests. `[RULED]` is binding, `[RULE]` is a constraint the code does not carry |
| **`docs/CARBS.md`** | The carbohydrate reference — what Pakistani food contains per real portion, every value with its source, confidence and licence. **Data of record; `PLAN.md` governs what the app does with it.** It does not use `§`, because `§` means a `PLAN.md` section everywhere else |
| `docs/BACKLOG.md` | Everything deliberately excluded, with the reason. Includes a **TECHNICAL** section (`T0`-`T13`) for toolchain work and open defects |
| `docs/design/` | The screen designs. `step-flow.html` is the one that shipped |
| `docs/BLOG-FIX.md` | The blog's service-worker exclusion and the lower-case redirect — both live, both easy to delete as noise. Uses "section N" for its own headings |
| `README.md` | For someone arriving at the repository |

## Rules that are not negotiable

1. **No code without two explicit go-aheads** (§20.1). Propose, wait for yes, confirm the scope,
   wait again. Every change, however small. A go-ahead is scoped to the change it names and never
   carries to an adjacent one.
2. **If a test, a comment, or the plan looks WRONG, ASK — do not correct it** (§20.1.1). State what
   it asserts, what the code does, and which you think is right, then wait. Either the artefact was
   written to match a defect, or the behaviour was deliberate and you are about to break it on
   purpose — **those are indistinguishable from the code**, and only the user can tell them apart.
   Silently picking one turns the specification into a record of whatever the code happens to do.
3. **Every number lives in `src/config.ts`** (§11.8), enforced by two type-aware lint rules. A
   literal laundered through a local `const` is the same violation.
4. **`src/core` imports nothing** — no DOM, no storage, no clock. Time is passed in as data. This is
   what makes the golden cases, the boundary sweep and the 100% mutation gate possible.
5. **Clamp the total, never the correction** (§2.1). Flooring a negative correction discards the
   fact that the reading is low, in the direction that gives more insulin.
6. **Run `python3 check-plan.py` before finishing** — CI runs it too, as the `plan` job, so this
   is about finding a defect in seconds rather than in a failed pipeline. It checks the documents
   against each other and against the code. If it reports a defect it could have caught earlier,
   add that check in the same edit that fixes the document — §20.3 makes that an obligation, not a
   suggestion.

## Before you claim something works

`npm run check` is typecheck, lint and 647 tests. `npm run mutate` is the 100%-or-fail mutation gate
on `src/core`, `src/state` and `src/config.ts` (§13.4, extended 2026-09-11 — the reducer holds the
gates, and it scored 94% the day it was measured). Counts go stale; the commands print the live ones. Neither proves the specification is right — this project has shipped a wrong expected
value more than once, and the honest claim is always the validation actually performed.

**`npm run smoke` is the layer the others cannot reach.** jsdom does not lay pages out, load fonts,
enforce a content security policy or run a service worker. It drives a served build in real Chrome
over **both a secure and an insecure origin** — the second one because `localhost` is a secure
context and the phone is not, and an API missing only on the insecure origin cost three rounds of
chasing the wrong bug (note 48).

**The test suite still cannot see everything.** §13 has no interaction-continuity requirement. A
focus-destroying defect survived 541 tests and a 100% mutation score; a page-level colour that made a
correct result look like a failure needed someone to LOOK at a screenshot; and every layout defect so
far was found by Momin on a real device. When you change the interface, open it in a browser.

**Updates reach a phone two ways, both confirmed on the deployed app:** the in-app "a newer version
is ready" bar renders and can be tapped, and a full close-and-reopen activates a waiting worker
anyway. `docs/BACKLOG.md` T4 is closed — it is kept because it was wrong twice, in opposite
directions, both times from measuring in `vite preview` rather than in the deployment.
