#!/usr/bin/env python3
"""
Consistency checker for PLAN.md and BACKLOG.md.

WHY THIS EXISTS
---------------
Thirteen adversarial review rounds produced a stable set of defect classes. Most of them are
mechanical: a phrase the document itself condemns still standing as live spec, a section
reference that resolves to nothing, a "removed in v9" claim about text that is still there,
a field in the test schema with no home in the snapshot. Every one of those cost a review round
that should have gone on design.

This script catches that class so the reviewers spend their rounds on real questions.

THE MAINTENANCE OBLIGATION — NOT OPTIONAL
-----------------------------------------
A checker that stops being updated is worse than no checker, because it reports "clean" while
the document rots underneath it. So:

  * Every time a reviewer finds a defect this script COULD have caught, add it here in the
    same edit that fixes the document. Not later.
  * Every time a phrase is retired, corrected or reworded in PLAN.md, add it to RETIRED below
    in the same edit.
  * Every time a canonical number changes, update CANONICAL below in the same edit.
  * Every time a snapshot or schema field is added or removed, update SNAPSHOT_EXEMPT.
  * If a check produces repeated false positives, fix the check. Do not delete it and do not
    start ignoring its output.

The script is part of the document, not a tool that sits beside it. PLAN.md §20.3 records this.

USAGE
-----
    python3 check-plan.py [--verbose]

Exit code 0 = clean, 1 = findings.
"""

import io
import multiprocessing
import json
import math
import os
import re
import sys
from itertools import combinations

HERE = os.path.dirname(os.path.abspath(__file__))
# The prose lives in docs/ so the repository root stays code. The checker sweeps
# from the ROOT, so a document moved out of docs/ is still found rather than
# silently dropped -- a checker that stops seeing a file reports "clean" about
# text it never read, which is the exact rot this script exists to catch.
DOCS = os.path.join(HERE, "docs")
PLAN = os.path.join(DOCS, "PLAN.md")
BACKLOG = os.path.join(DOCS, "BACKLOG.md")
BLOGFIX = os.path.join(DOCS, "BLOG-FIX.md")

# Every live file. Retiring something in ONE document must flag every other
# mention — v17 cut §6.7 from PLAN.md and left it described as shipping in
# BACKLOG.md, exempted in this script's own SNAPSHOT_EXEMPT, and tagged in a
# design file. Both reviewers found them; the author found none. A promise to
# sweep is worth nothing, so the sweep is mechanical.
# Design files are DISCOVERED, never listed. v18 hardcoded three names, so a new
# design file was invisible to every check — [R2] proved it by simulating one. A
# list of inputs maintained by hand is the same rot the tool exists to catch.
SWEPT_SUFFIXES = (".html", ".md", ".py")

# Superseded snapshots are provenance, not live spec: they are FROZEN COPIES of
# retired revisions, so of course they contain retired phrases. Sweeping them
# would make every pin count the whole history.
SNAPSHOT_RE = re.compile(r"^PLAN-v\d+-superseded\.md$")


def _generated_dirs():
    """Directories the sweep skips, READ FROM .gitignore rather than listed here.

    The sweep exists to catch rot in files a person wrote. Build output is not
    that: `dist/` holds a compiled copy of every string in the app, and
    `reports/mutation/` holds the SOURCE OF EVERY MUTANT — including the
    deliberately broken ones. Sweeping those reports every retired phrase and
    every wrong constant the mutation run generated on purpose, which is 490
    findings of pure noise, and noise is how a checker stops being read.

    The list is derived, because a second hand-maintained list is exactly what
    this project has now had to stop maintaining three times (§20.5's file table,
    §7.9's six stores, the checker's own input list). Add a build directory to
    `.gitignore` and the sweep skips it with no edit here.
    """
    ignored = {"node_modules"}
    path = os.path.join(HERE, ".gitignore")
    if not os.path.exists(path):
        return ignored
    with io.open(path, encoding="utf-8") as fh:
        for line in fh:
            entry = line.strip()
            if not entry or entry.startswith("#") or entry.startswith("!"):
                continue
            # Simple directory entries only: `dist/`, `reports/`, `coverage`.
            # A pattern with a slash inside it or a wildcard names files rather
            # than a directory to prune, and is left to the file-suffix filter.
            entry = entry.rstrip("/")
            if "/" in entry or "*" in entry:
                continue
            ignored.add(entry)
    return ignored


def _discovered_files():
    """Every sweepable file under the project, at ANY depth.

    v20 walked the tree for `.html` ONLY, so `design/notes.md` and
    `design/helper.py` — each seeded with a resurrected name and a wrong constant
    — passed clean and were not even reported as unlisted [R1, executed]. That is
    the NEXT-STEPS blind spot re-created one directory down, in the revision that
    deleted NEXT-STEPS to close it.

    Discovery is now by SUFFIX, not by suffix-and-depth. Anything added under this
    tree in a swept format is swept, with two deliberate exclusions: superseded
    snapshots (frozen provenance) and this file's own declaration regions.
    """
    generated = _generated_dirs()
    out = []
    for dirpath, dirnames, filenames in os.walk(HERE):
        dirnames[:] = [d for d in dirnames
                       if not d.startswith(".") and d != "__pycache__"
                       and d not in generated]
        for n in sorted(filenames):
            if not n.endswith(SWEPT_SUFFIXES):
                continue
            rel = os.path.relpath(os.path.join(dirpath, n), HERE)
            rel = rel.replace(os.sep, "/")
            if SNAPSHOT_RE.match(rel):
                continue
            out.append(rel)
    return sorted(out)


def live_files():
    """Every file the checker reads. §20.3's freeze covers exactly this list, and
    the dispatch hashes exactly this list — the two must not drift apart.

    Wholly discovered since v21: naming the four core documents by hand was the
    last hand-maintained input list in the tool.
    """
    return _discovered_files()


DECL_BEGIN = "# --- DECLARED TABLES BEGIN ---"
DECL_END = "# --- DECLARED TABLES END ---"


def _strip_declared(text):
    """This script minus its declaration tables.

    v18's docstring said the self-exclusion covered "the DECLARED TABLES region"
    and the code skipped the WHOLE FILE — so a stale design rule written into a
    comment here escaped every check, which [R2] demonstrated [R1 concurring].
    Excluding the region is what was always meant: naming a retired phrase inside
    RETIRED is a declaration, but asserting one in a comment is rot, and rot in
    the anti-rot tool is the defect this project keeps re-finding.
    """
    # WHOLE-LINE match, not substring: the constants above CONTAIN the marker
    # text, so a substring find matches its own definition and strips two lines
    # instead of the table — caught by running it, which is the method [R2] set.
    lines = text.split("\n")
    kept, depth, seen = [], 0, 0
    for ln in lines:
        t = ln.strip()
        if t == DECL_BEGIN:
            depth += 1
            seen += 1
            kept.append("")            # BLANKED, not removed: line numbers in
            continue                   # findings must point at real lines
        if t == DECL_END:
            depth -= 1
            if depth < 0:
                return None            # END before BEGIN: markers corrupt
            kept.append("")
            continue
        kept.append("" if depth else ln)
    if depth != 0 or seen == 0:
        # Sentinels are load-bearing; losing them must fail loudly, not silently
        # restore the v18 behaviour of skipping the whole file. A marker with
        # trailing text on its line does not match and lands here — which is how
        # v19 caught its own broken sentinel, via the self-test.
        return None
    return "\n".join(kept)


def _corpus_key(rel):
    """`docs/PLAN.md` is keyed as `PLAN.md`.

    The four core documents moved into `docs/` so the repository root is code.
    Their NAMES did not change, and every check, every self-test seed and every
    cross-reference in the prose says `PLAN.md`. Rewriting all of those to carry
    a directory would be a large edit to a tool whose whole value is that it does
    not rot -- and it would have to be redone the next time the layout moves.

    So the directory is stripped for the TOP LEVEL of docs/ only. `docs/design/`
    keeps its prefix, because those files are referred to by path in §20.5.
    """
    if rel.startswith("docs/") and "/" not in rel[len("docs/"):]:
        return rel[len("docs/"):]
    return rel


def load_all():
    """Every live file that exists, as {relative path: text}.

    NOTHING is excluded any more. Until v20 one file was skipped, and it became a
    total blind spot: a canonical drift and a retired name seeded into it both
    passed clean while this docstring claimed another check covered it [R1]. That
    file is gone (§20.5) and the exclusion with it.

    One redaction remains: this script is included MINUS its DECLARED TABLES
    regions, because naming a retired phrase inside a declaration table is a
    declaration, not an occurrence. Everything outside those markers — including
    every comment and docstring here — is swept like any other live file, which is
    how this docstring's own rot was caught.
    """
    out = {}
    for rel in live_files():
        full = os.path.join(HERE, rel)
        if not os.path.exists(full):
            continue
        rel = _corpus_key(rel)
        text = load(full)
        if rel == "check-plan.py":
            text = _strip_declared(text)
            if text is None:
                out["check-plan.py"] = (
                    "SENTINEL-LOST: the DECLARED TABLES markers are gone from "
                    "check-plan.py, so its self-redaction cannot be bounded")
                continue
        out[rel] = text
    return out

# ---------------------------------------------------------------------------
# DECLARED TABLES — keep these current. See the maintenance obligation above.
# ---------------------------------------------------------------------------

# Phrases the document has condemned. Each may appear ONLY inside a correction
# note. Matching is whitespace-tolerant: the logRevision phrase escaped a grep
# in v13 purely because it wrapped across a line break.
# (phrase, expected_occurrences). COUNT-PINNED, and that is the whole point.
#
# v14's first design allowed a phrase anywhere near a "correction marker". [R1]
# then proved the flaw by running the checker against PLAN-v13-superseded.md — the
# exact state whose leftover cost round 13 — and getting ZERO findings. The leftover
# sat beside the note claiming its removal, and a removal claim IS a correction
# marker, so **a false removal claim structurally immunized the text it lied about**.
# 24% of the document sat inside suppressed windows.
#
# Counts fire regardless of surrounding markers. When a phrase is retired, count the
# quotations that legitimately remain and pin that number here. If the count moves in
# either direction, something changed and you look.
#
# WHAT THIS CANNOT CATCH [R1]: modality. Un-striking a withdrawn instruction so it
# reads as live spec again leaves the count unchanged and this check silent. Counts
# see copies appearing and vanishing, not a quotation flipping back into an
# assertion. Do not rely on it for that.
# Naming a retired phrase inside this region is a DECLARATION, not an occurrence of
# it, so load_all strips exactly this span before sweeping the script as a live
# file. The markers are matched as WHOLE LINES — keep them alone on their own line.
# --- DECLARED TABLES BEGIN ---
RETIRED = [
    # v23. v22 retired this user-facing string and added no count, which is the
    # one-edit rule §20.3 states — broken in the revision that added thirty pins
    # [R1]. The two survivors are §7.7.1's own historical quotations of it.
    # v27, ruled 2026-09-09. §4.5 carried two rules for an out-of-range reading
    # and only one could run: "above-range to band E wording" against "a typed
    # 605 gets plain 'check the number'... not band E's ketone wording". The
    # second won — "check ketones" is a confusing reply to a typo — and the
    # first is deleted. Pinned here because a contradiction left in a document
    # is a trap: a later reader finds the losing sentence, sees the code
    # disagree, and corrects the code. BUILD-NOTES note 2.
    #
    # The count is 1, not 0: §4.5 QUOTES the retired phrase to explain that it
    # was retired. Quoting a dead rule to record its death is not the rule
    # living on — but it is indistinguishable to a substring search, so the
    # count is what separates them. A second occurrence is the phrase coming
    # back as live spec.
    #
    # Was 2 until the 2026-09-13 prune: note 2 carried the second quotation and
    # no longer restates the losing sentence.
    # Ruled 2026-09-11. §7.2's pending-save copy claimed TWO things that were
    # false — "retrying" when nothing retried, and "still counted" when the
    # snapshot took `lastDose` from the database a failed write never reached.
    # Pinned because it is the worst shape a retired string can have: a false
    # SAFETY claim on the screen a person reads while deciding whether to inject
    # again. BUILD-NOTES note 61.
    #
    # The count is 1, not 0: §7.2's correction paragraph quotes it to record its
    # death. A second occurrence is the phrase coming back as live spec — which
    # is exactly how it survived in `design/step-flow.html` until this pin was
    # written.
    #
    # Was 4 until the 2026-09-13 prune: note 61 quoted the dead string three
    # times and now states the defect without reprinting it.
    # Ruled 2026-09-13 with the audience change. "for one person" was TRUE for
    # the life of the app until T5 emptied the prescription fields, and then it
    # was a claim about the app that the app had stopped making. It survived in
    # index.html's `<meta name="description">` — the single line Google and
    # WhatsApp show — through the whole of T5, because the README, the
    # disclaimer and the setup copy were all updated and nobody looked at the
    # page metadata. Momin found it by asking a different question.
    #
    # Pinned because the next step, item 4a, is the one that makes the app
    # findable. A false description is a document nobody reads; a false
    # description on an indexed page is the first thing a stranger reads.
    #
    # Count 2, both in BACKLOG.md: one recording that the meta tag was wrong,
    # one quoting the prefill's original justification. Both are the phrase
    # being named as dead, which a substring search cannot tell from the phrase
    # being alive — so the count is what separates them.
    ("for one person", 2),
    ("Couldn't save this yet", 1),
    ("above-range to band E wording", 1),
    ("last backup: N days ago", 2),
    ("the same mechanism `logRevision` already uses", 2),
    ("the log cannot record it", 1),
    ("24 units is under 30", 1),
    ("one cause, not two", 1),
    ("bandEFullCardShownToday`, computed from the log at", 0),
    ("default 30 units", 0),
    ("Soft-confirm outside 20–40", 0),
    ("leave the live counter equal to the largest history key", 1),
    ("Depends on §18.6", 0),
    ("a *wider* band", 0),
    ("begin cautioning *closer to target*", 0),
    # Was 2 until 2026-09-13, when BACKLOG.md's plain-language-pass entry began
    # quoting it too. That entry warns a copy reviewer that "shorter and
    # friendlier" is precisely how this string went wrong — so the quotation is
    # the phrase being named as dead in the one place most likely to revive it.
    ("Above 250 again", 3),
    # 2 in PLAN.md (§13.2's v6 correction note) + 2 in this script's own
    # near-miss docstring, which is swept as a live file since v19.
    ("logEntryCount", 4),
    # withdrawn in v16 — §11.6's two original step-0 instructions. Both were wrong:
    # the upgrade needs Gatsby 4+ on a Gatsby 2 blog, and the denylist is inert
    # because gatsby-plugin-offline never configures navigateFallback [R2].
    ("navigation-fallback denylist", 1),   # §11.6's withdrawal only; §20.2 lost its build row in the prune
    ("Upgrade `gatsby-plugin-offline`", 1),  # BLOG-FIX kept its withdrawal; §20.2's copy went with the row
    # v17: §6.7's usualDose setting cut entirely. Surviving mentions are all in
    # correction notes recording the removal — count-pinned so it cannot return.
    # 5 in PLAN.md (all correction notes recording the removal) + 2 in this
    # script's docstrings (check_tool_rot and check_next_steps), both of which
    # explain a past defect by naming it. Was 8 until the 2026-09-13 prune took
    # the header's copy.
    ("usualDose", 7),
    # v17 cut §6.7's field. This is the phrase BACKLOG.md and the header used to
    # describe it as live; pinned so the cut is verifiable and cannot be undone
    # silently — the claim at PLAN.md:45 has nothing else to check against.
    ("usual-dose field", 1),
    # v19 retired three wordings and pinned NONE of them — the same defect the
    # revision was written to fix, in the revision whose header named it [R1].
    # Both remaining occurrences are historical quotes explaining the round-17
    # blocker; resurrecting the phrase as live spec anywhere moves the count.
    # 1 since v21: v20's header quoted this phrase to explain the round-19
    # finding; the v21 header replaced that paragraph. The surviving occurrence is
    # §6.7 quoting what v17 said, which is the record of the correction.
    ("in the export envelope only", 1),
    # v17's asked-once framing. One occurrence survives, inside §6.7's quotation
    # of what v17 said; the question is asked AT export and re-offered until
    # answered or declined, so any other site asserting "first export" is stale.
    ("at first export", 1),
    ("Carries the text and its date, silently", 0),
    # NEXT-STEPS.md deleted in v20 (§20.5). This was its charter line. The one
    # §20.3's quotation of it went with the 2026-09-13 prune, so the expected
    # count is 0: ANY occurrence means the file, or its charter, has come back —
    # and check_next_steps separately fails if the file itself reappears.
    ("DELIBERATELY EPHEMERAL", 0),
    # The snapshot archive is gone: v21 deleted PLAN-v1..v19-superseded.md once
    # the plan was final, v24 deleted the last one. The 2026-09-13 prune removed
    # the header paragraph that explained the deletion, so the expected count is
    # now 0 for each — the strongest form of this pin. ANY occurrence means a
    # deleted snapshot is being described as present again.
    ("PLAN-v1-superseded.md", 0),
    ("PLAN-v9-superseded.md", 0),
    ("PLAN-v19-superseded.md", 0),
]

# Retired phrases are counted in TypeScript source too — ADDED 2026-09-11. The
# RETIRED counts above cover the document corpus (SWEPT_SUFFIXES), and .ts is
# not in it. That blind spot let §4.5's deleted "above-range to band E wording"
# rule live on as an authoritative-sounding docstring on `looksLikeAPossibleLow`
# in src/core/bands.ts — the exact trap note 2 records ("a later reader finds
# the losing sentence, sees the code disagree, and corrects the code"), one
# directory over from every file this script could see. The counts below are
# the ALLOWED occurrences inside src/**/*.ts: historical quotations whose whole
# point is to explain a retirement. A phrase not named here is allowed zero.
RETIRED_IN_SOURCE_OK = {
    # config.ts quotes the prefill's original argument where the constants used
    # to be, to record why they were deleted.
    "for one person": 1,
    # copy.ts's band E docstring quotes v8's wrong compact copy, twice, to
    # explain why the instruction never changes between forms.
    #
    # FOUR since 2026-09-22, not two, and the doubling is the translation
    # working as intended. `copy-ur.ts` carries the English doc comments
    # verbatim — they cite `§` sections and build notes that exist in English
    # only, and the note explaining why band E's instruction never changes is
    # exactly as load-bearing for whoever maintains the Urdu. Translating a
    # historical quotation would also destroy it: the point of the quote is the
    # words v8 actually shipped.
    "Above 250 again": 4,
    # misc.ts's dosing-history docstring names the cut §6.7 setting to explain
    # what replaced it.
    "usualDose": 1,
}


# CORRECTION_MARKERS lived here until v19. It was defined and referenced NOWHERE —
# dead since the count redesign made marker-exemption unnecessary, so a maintainer
# editing it would have changed nothing [R1]. Deleted rather than left as furniture.

# Canonical values. A different number near these keywords, outside a correction
# note, is a drift finding.
# (label, pattern-with-ONE-capture-group, allowed values).
# [R1] proved the old threshold rule verified nothing: it matched §6.2's sentence,
# found no "=" on the line, and silently continued — a drift from 20 to 25 passed
# clean. Every entry now captures the number it checks. If a pattern cannot capture,
# it does not belong here.
CANONICAL = [
    # v17's central clinical change had NO pin — reverting it to 300 passed clean,
    # the same-edit rule broken on the number that motivated the revision [R1, R2].
    ("target ceiling (§4.5 table)", r"Target blood sugar \| 70–\*\*(\d+)\*\* mg/dL", {"200"}),
    ("confirmation threshold default (§6.2)", r"Threshold:\s*default\s+(\d+(?:\.\d+)?)\s*units", {"20"}),
]

# §11.8's constants and ranges, declared COMPLETELY. Listing them one by one in
# CANONICAL left twelve of eighteen unpinned — [R1] reverted STACK_SUPPRESS_HOURS
# 4->2 and RESULT_EXPIRY_MINUTES 15->60 and both passed clean, the identical class
# as round 18's unpinned target ceiling. Completeness is enforced in BOTH
# directions: a declared constant missing from §11.8 is a finding, and a constant
# in §11.8 missing from here is also a finding — so adding one without pinning it
# cannot pass.
CONSTANTS = {
    "HYPO_LEVEL_1": "70",
    "HYPO_LEVEL_2": "54",
    "KETONE_ADVISORY": "250",
    "FAST_CARB_GRAMS": "15",
    "RECHECK_MINUTES": "15",
    "DEFAULT_MODE": "'nearest'",
    "THRESHOLD_MEAL_GRAMS": "100",
    "THRESHOLD_HIGH_READING": "250",
    "THRESHOLD_MULTIPLE": "1.5",
    "BAND_E_FULL_CARD_WINDOW_HOURS": "12",
    "GRAMMAR_INTEGER_DIGIT_SLACK": "1",
    "BAND_B_CORRECTION_UNITS": "-1.5",
    "INCREMENT": "{ nearest: 1, half: 0.5, ceil: 1, floor: 1, off: 0.01 }",
    "HUNDREDTHS_SCALE": "100",
    "CLOCK_SKEW_TOLERANCE_HOURS": "1",
    # §8.5 — ALIASES onto INSULIN_TIMING's regular row, not literals. The
    # values themselves are pinned by INSULIN_TIMINGS below, row by row, which
    # is what "the check has to move from a constant to a per-class table"
    # meant: there stopped being "the" eat delay on 2026-09-20, and a pin
    # written against one pair would have stopped being able to see the other
    # two. Pinning the ALIAS as well is what stops it being re-pointed at
    # another class while every literal stays correct.
    "EAT_DELAY_MINUTES": "INSULIN_TIMING.regular.eatDelayMinutes",
    "DIVERGE_MIN_UNITS": "5",
    "DIVERGE_RATIO": "3",
    "STACK_SUPPRESS_HOURS": "INSULIN_TIMING.regular.stackSuppressHours",
    "STACK_ADVISE_HOURS": "INSULIN_TIMING.regular.stackAdviseHours",
    # Both are DERIVED, so both are pinned to the expression rather than to a
    # number — the numbers themselves live in INSULIN_TIMINGS below. Pinning the
    # spelling is what stops one being re-pointed at a single class's window
    # while every literal stays correct.
    "LONGEST_ADVISE_HOURS": "Math.max(...Object.values(INSULIN_TIMING).map((t) => t.stackAdviseHours))",
    "DELETE_CONFIRM_WINDOW_HOURS": "LONGEST_ADVISE_HOURS",
    "ADVISORY_MIN_ELIGIBLE": "10",
    "ADVISORY_WINDOW": "30",
    "ADVISORY_LOW_DIVISOR": "4",
    "ADVISORY_HIGH_MULTIPLE": "3",
    "RESULT_EXPIRY_MINUTES": "15",
    "POLL_INTERVAL_MS": "4000",
    "SCHEMA_VERSION": "1",
    "STRUCTURE_VERSION": "2",
}

# §8.5's per-class clocks, row by row. A table rather than three constants,
# because there stopped being "the" eat delay the day the app started asking
# which insulin is in the pen.
#
# The SUPPRESSION windows are identical on every row and that is a hold:
# research on 2026-09-20 found no citable basis below 4 hours and a published
# argument against 3, so CLINICAL.md question 10c's answer is "do not shorten".
# The ADVISE windows differ — regular human insulin carries its own label's 18
# hours (BACKLOG T20), the analogues stay at 12. Pinning all of it here means
# the day somebody edits one, this file has to be edited in the same commit,
# which is exactly the ceremony a clinical change deserves.
INSULIN_TIMINGS = {
    "regular": ("[20, 30]", "4", "18"),
    "rapid": ("[10, 15]", "4", "12"),
    "ultra_rapid": ("[0, 0]", "4", "12"),
}

# Names whose VALUE is a multi-line structure, checked elsewhere rather than as a
# literal. RANGE is checked row by row against RANGES below.
STRUCTURED_CONSTANTS = {"RANGE", "INSULIN_TIMING"}

# §11.8's RANGE block. Every row, not just target — round 18 pinned the ceiling
# because it had just changed, and left the other seven rows unpinned.
RANGES = {
    "bloodSugar": "[20, 600]", "carbs": "[0, 300]",
    "target": "[70, 200]", "isf": "[5, 200]", "icr": "[1, 100]",
    "threshold": "[10, 45]", "basalUnits": "[1, 150]", "injected": "[0.01, 100]",
    "eatDelay": "[0, 45]",
}

# The confirm-once band. v23 declared only the hard bounds, so §4.5's third
# column and §11.8's `soft:` could drift apart from each other silently — [R1]
# moved both to 90-180 independently and both passed. A gate stated twice needs
# checking twice.
#
# `injected` was in here until 2026-09-21 declaring `[0.5, 60]`, ten days after
# `config.ts` struck it. Nothing noticed, because these checks only fire on a
# band a DOCUMENT states — remove the sentence and the stale declaration goes
# quiet rather than failing. Check 35 below compares this table against
# `config.ts` so the table cannot outlive the code again.
SOFT_RANGES = {
    "target": "[90, 140]", "isf": "[20, 100]", "icr": "[5, 50]",
    "threshold": "[15, 35]", "basalUnits": "[5, 80]",
    "eatDelay": "[0, 30]",
}

# Snapshot fields deliberately absent from §11.2, with the section that says so.
#   basal*     — §1.3: recorded, never calculated
#   nowMs      — time is passed as data to the pure core, not carried in the snapshot
# usualDose was here until v18. §6.7 cut the field; leaving it exempted was doc-rot
# inside the anti-rot tool, which both reviewers found and the author did not.
SNAPSHOT_EXEMPT = {"basalName", "basalUnits", "basalTiming", "nowMs"}

# §13.2's schema flattens what §11.2's snapshot groups. These are NOT missing; they
# live under a parent the snapshot does carry. Declaring the mapping is better than
# exempting them: if `inputs` or `settings` ever vanishes from the snapshot, this
# still fires.
GROUPED = {
    "bloodSugar": "inputs",
    "carbs": "inputs",
    "target": "settings",
    "isf": "settings",
    "icr": "settings",
    "mode": "settings",
    "threshold": "settings",
}

# Literals whose DISAPPEARANCE is the finding. A canonical entry catches a number
# that drifts; nothing caught a rule deleted outright, and [R1] proved the gap by
# reverting v18's own two headline fixes — the dosingHistory row and the three-state
# model — both of which passed clean. In a project whose dominant defect is the next
# revision breaking this revision's fix, the newest fixes need the pins most.
# (label, regex that must match PLAN.md at least once)
REQUIRED = [
    ("§6.7 three-state model",
     r'state:\s*"unanswered"\s*\|\s*"declined"\s*\|\s*"answered"'),
    ("§11.3 dosingHistory store row", r'key:\s*"dosingHistory"'),
    ("§6.7 skip re-offers", r"(?i)re-offered at every export"),
    ("§6.7 decline states its consequence", r"you won't be asked again"),
    ("§6.7 empty answer is a skip", r"empty answer is a skip"),
    ("§6.7 missing row reads unanswered", r"missing row reads as `unanswered`"),
    ("§6.7 answered is readable back", r"read back and corrected"),
    ("§10.4 noon written out", r'"12:00 noon"'),
    ("§10.4 midnight written out", r'"12:00 midnight"'),
    ("§10.4 midnight date rule", r"date of the day \*\*beginning\*\*"),
    ("§6.4 correction ceiling comment", r"always positive given target <= 200"),
    ("§7.7 history block is conditional", r"present ONLY when the"),
    # [R1]: the FIFTH of §6.7's five state rules was the only one left unpinned —
    # deleting it OR inverting it to "declined travels in the export" both passed
    # clean, and the inversion then silently contradicts §7.7.
    ("§6.7 declined does not travel in the export",
     r"`declined` does not travel in the export"),
    # v18's import rule, the vintage round 18 proved needs pins most.
    ("§6.7 import keeps the local note",
     r"kept local, never overwritten"),
    # v19's own rename fix: only the conditionality comment was pinned, not the
    # field it renamed.
    ("§7.7 export carries answeredAtMs", r"\{ answeredAtMs, text \}"),
    # [R1]: the Step keypads gave ICR no decimal key while 1:7.5 is an ordinary
    # prescription — a UI narrower than the clinic, not merely than the grammar.
    ("§10.1 keypad may not be narrower than the clinic",
     r"unenterable\.\*\* Where that is in doubt"),
    # §7.9, NEW IN v21. Written from three fragments that already existed — a
    # §13.3 test, a §11.7 constraint and a §10.2 placement rule — for a feature
    # that had no specification. Pinned on arrival rather than after a reviewer
    # proves it can be reverted clean, which is the §19 lesson.
    ("§7.9 both clear operations exist", r"### 7\.9 Clearing the data"),
    ("§7.9 settingsHistory survives clearing the record",
     r"`settingsHistory` survives \"clear the record\""),
    # v22: `acks` holds three unrelated kinds and v21 dropped the store whole.
    # Both halves of the split are pinned — dropping the disclaimer on "clear
    # the record" puts a blocking first-run gate in front of a delete.
    ("§7.9 start over clears the dosing note",
     r"clears §6\.7's `meta\.dosingHistory`"),
    ("§7.9 start over is the fail-closed escape",
     r"only in-app escape from a fail-closed state"),
    ("§7.9 export is offered on the path",
     r"Export is offered on the path, not after it"),
    # v22: v21 gave a data control a code side-effect. The constraint did not
    # weaken — it moved to §11.4, where an unfiltered sweep actually happens.
    ("§7.9 clearing touches no cache or registration",
     r"\*\*Neither operation touches a cache or a worker registration"),
    ("§7.9 the blog constraint moved to the activation path rather than vanishing",
     r"§13\.3's blog-preservation case \(v15\) is retargeted"),
    ("§7.9 §11.7 is not weakened by the move",
     r"\*\*§11\.7's scope constraint does not weaken"),
    ("§13.3 the blog case still exists, on the activation path",
     r"\*\*Cache cleanup preserves the blog — ADDED IN v15, RETARGETED IN v22\*\*"),
    # §7.3 guards deleting ONE row inside the window; v21 left the bulk path
    # unguarded beside it — the frictionless bypass §4.6's argument warns about.
    ("§7.9 clearing carries §7.3's stacking consequence",
     r"#### It must carry §7\.3's stacking consequence"),
    ("§7.9 the consequence line names the dose in the window",
     r"\*\*The stacking check is using a dose from 2:00 PM\.\*\*"),
    ("§7.9 clearing is not a block",
     r"\*\*Not a block\.\*\* §6\.1's ruling stands"),
    # §7.7.1, NEW IN v21. The backup-counter rule and the grouping rule are the
    # two that fail SILENTLY if dropped — one produces a false safety claim, the
    # other reintroduces the false-attribution defect v9 was corrected to remove.
    ("§7.7.1 two exports exist", r"#### 7\.7\.1 Two exports, named by purpose"),
    ("§7.7.1 backup counter tracks the JSON only",
     r"prompt must count \*\*only\*\* the JSON export"),
    ("§7.7.1 readable file grouped by prescription period",
     r"grouped by prescription period, not sorted by date"),
    ("§7.7.1 readable file states what it is not",
     r"##### It states what it is not"),
    ("§7.7.1 readable file carries the refusals",
     r"\*\*readings with no dose\*\* are in it"),
    ("§7.7.1 readable file is not restorable",
     r"only file import accepts"),
    # v22 pins. Each of these is a rule whose loss is SILENT: the build still
    # compiles, the screen still renders, and the defect surfaces only in the
    # one state nobody reaches during development.
    #
    # The escape mechanism. v21 specified "clear six stores" for a state whose
    # definition is "no connection exists" — so the control ran only when it was
    # not needed. Pinned on the call, because reverting to a transaction reads
    # like a simplification.
    ("§7.9 start over is deleteDatabase on both paths",
     r"\*\*\"Start over\" is `indexedDB\.deleteDatabase\(\"MealUnits\"\)` on both paths\.\*\*"),
    ("§7.9 the six-store clear is rejected, not merely unused",
     r"the wrong one\n— RULED IN v22"),
    ("§7.9 the store list would rot in the unsafe direction",
     r"\*\*A hand-enumerated store list rots on the edit that changes it"),
    ("§7.9 the escape lives on the fail-closed screen",
     r"\*\*The fail-closed screen itself\.\*\*"),
    ("§7.9 deleteDatabase blocks on open connections",
     r"\*\*`deleteDatabase` blocks on open connections\*\*"),
    # Start over must not leave the database without the row the next boot reads
    # to decide whether it may run. Deleting `meta` and stopping is the natural
    # implementation and turns the recovery control into a second brick.
    ("§7.9 the envelope-gap hazard is recorded",
     r"\*\*It can leave the database without an envelope\.\*\*"),
    ("§7.9 clear the record keeps a later store by default",
     r"\*\*what to remove\*\*, so a store added later is \*kept\* by default"),
    # Cross-tab invalidation exists in §11.3; v21's clearing paths did not use it.
    # The delete path must not put a third name on files §7.7.1 named by purpose.
    ("§7.9 the export offer routes to the screen rather than naming a file",
     r"\*\*opens the export screen\*\*"),
    # §7.8's row carries no revision, so grouping readings by one is unbuildable.
    # The wrong fix — adding a revision to readings — would manufacture §7.7's
    # attribution claim on a row nothing produced, so it is pinned as a
    # prohibition, not only as a rule.
    ("§7.7.1 readings are placed by timestamp, not by a revision",
     r"\*\*timestamp falling inside the period's date range\*\*"),
    ("§7.7.1 readings must not be given a revision",
     r"\*\*Do not fix this by adding a revision to readings\.\*\*"),
    ("§7.7.1 an unplaceable reading gets its own group",
     r"\*\*A reading outside every period gets its own labelled group\*\*"),
    # A legislated counter with no field to count into — §6.7's v17 defect again.
    ("§7.7.1 the backup timestamp has a store",
     r"`meta` row `\{ k: \"backup\", lastJsonExportAtMs \}`"),
    # Two export controls over one question state; `declined` is what stops the
    # split from doubling the prompting.
    ("§7.7.1 the dosing question is offered at both exports",
     r"question is offered at both exports, over one shared state"),
    # The prompt reported the freshness of a "backup" no button offered to make.
    # v22 chose an HTML format for a document carrying two free-text fields and
    # forwarded it to third parties. Both halves pinned.
    ("§7.7.1 every rendered value is escaped",
     r"\*\*Every value is HTML-escaped on the way in\.\*\*"),
    ("§7.7.1 the readable file carries no script",
     r"\*\*The file contains no script at all\.\*\*"),
    # An attribution decision living in a rendering layer is an untested
    # attribution decision — the fifth time this list has grown for that reason.
    ("§13.1 the period grouping is in the tested core",
     r"\*\*the readable export's period grouping\*\* \(§7\.7\.1\)"),
    # ---------------------------------------------------------------------
    # v23. [R1] and [R2] independently proved the pin set protected prose and
    # left the operative rules bare. These anchor the RULES: the five lines of
    # the dose algorithm, the suppression direction, the gate operands, and
    # every v23 ruling. Where a rule is a NUMBER, the checks above recompute it
    # rather than matching it — a pin on a numeral only proves the numeral is
    # still spelled the same way.
    # ---------------------------------------------------------------------
    ("§2 the dose algorithm, line by line",
     r"correction = \(bloodSugar - target\) / ISF     // exact, may be negative"),
    ("§2 the meal term", r"meal       = carbs / ICR                     // exact, never negative"),
    ("§2 the total is the sum", r"total      = correction \+ meal               // exact"),
    ("§2 ONLY the total is clamped",
     r"clamped    = max\(0, total\)                   // clamp the TOTAL, never the correction"),
    ("§2 the dose is the rounded CLAMPED total, not the meal",
     r"dose       = roundToIncrement\(clamped, mode\) // see §5"),
    ("§2.1 the correction may be negative",
     r"\*\*The correction may be negative and is subtracted from the meal dose\.\*\*"),
    ("§2.1 only the total is clamped", r"\*\*Only the total is clamped\.\*\*"),
    # The round-2 CRITICAL. [R1] reverted it verbatim and the run stayed clean.
    ("§7.4 a positive correction is SUPPRESSED inside the window",
     r"\| under 4 hours \| \*\*positive\*\* \| Suppressed → meal only\."),
    ("§7.4 a negative correction is ALWAYS applied",
     r"\| under 4 hours \| \*\*negative or zero\*\* \| \*\*Applied in full, always\.\*\*"),
    # v23 rulings, §7.9.
    ("§18.14 the interface is decided: Step",
     r"\*\*Which interface ships\? — RESOLVED IN v25 BY THE USER: Step\.\*\*"),
    ("§18.14 the overruled recommendation is recorded",
     r"\*\*This overrules a recommendation, and the recommendation is recorded"),
    ("§18.14 Step adds a wizard state to the reducer",
     r"\*\*wizard state on top of §11\.2's reducer\*\*"),
    ("§7.2 the commit is the amount tap, not the first tap",
     r"\*\*The commit is the second tap\.\*\*"),
    ("§7.9 clearing the record invalidates other tabs",
     r'\*\*"Clear the record" bumps `logRevision`'),
    # v24. [R1]: "the pin anchors the headline sentence, not the operative
    # bullet." Every rule below could be inverted one line under its own pin
    # while the run stayed clean. A heading is a label; the rule is the
    # sentence that tells a build what to do.
    ("§7.9 clearing the record drops NOTHING from acks",
     r'\*\*"Clear the record" drops nothing from `acks`\.\*\*'),
    ("§7.9 the unknown-history copy is not the no-dose copy",
     r'\*"This app cannot read your record right now, so it cannot tell you '
     r'whether a recent dose is about to be forgotten\.'),
    ("§7.9 the escape carries a blocked handler",
     r"same `blocked` handler and the same "
     r'\*"close this app\'s other tabs"\*'),
    ("§7.9 the recovery connection carries versionchange",
     r"\*\*That connection also carries a `versionchange` handler\*\*"),
    ("§7.3 a tombstone's deleted flag is true",
     r"\| `deleted` \| `true`\. Its presence is what makes the row a tombstone \|"),
    ("§7.3 only in-window deletions leave a tombstone",
     r"\*\*Only deletions inside `DELETE_CONFIRM_WINDOW_HOURS` leave one\.\*\*"),
    ("§7.3 the tombstone tiebreak is symmetric",
     r"in either direction\. Deletion is\n  the later statement of intent"),
    ("§7.7 the envelope carries two row shapes",
     r"\[ Injection \| Tombstone \],   // §7\.3 — CHANGED IN v24"),
    ("§7.1 the tombstone fields are in the row list",
     r"\| `deleted`, `deletedAtMs` \| \*\*ADDED IN v24\*\*"),
    ("§7.9 acks follow their values, not the record",
     r"\*\*`acks` survives \"clear the record\" entirely"),
    ("§7.9 the recovery connection exists and must be closed",
     r"#### The recovery connection exists, and v22 reasoned as though it did not"),
    ("§7.9 the recovery connection is closed before the escape",
     r"\*\*The versionless recovery connection is closed after the read and before the escape is offered\.\*\*"),
    ("§7.9 the true reason no export is possible",
     r"\*\*The real reason no export is possible is §11\.3's restriction"),
    ("§7.9 start over invalidates by versionchange, not logRevision",
     r"\*\*`versionchange` fires on every open connection with `newVersion === null`\.\*\*"),
    ("§7.9 the stacking branch has three states",
     r"\*\*The third row is not the second row\.\*\*"),
    ("§7.9 both paths close their own connection first",
     r"\*\*On both paths the app must close its\s+own connection first\*\*"),
    # v23 rulings, §7.7.1 and §7.3.
    ("§7.7.1 periods are ordered by changedAtMs",
     r"\*\*Periods are ordered by `changedAtMs`, not by revision key"),
    ("§7.7.1 the counter reports only what the app observed",
     r"\*\*Last made a copy you can restore from: 12 days ago\*\*"),
    ("§7.7.1 a resolved share is not a saved backup",
     r"\*\*The counter is set on the download route only\.\*\*"),
    ("§7.7.1 three free-text fields, not two",
     r"\*\*v22 said \"two\" and both reviewers\ncounted three\*\*"),
    ("§7.3 the tombstone has a stored shape",
     r"#### The tombstone had no stored shape — SPECIFIED IN v23"),
    ("§7.3 a tombstone keeps no dose values",
     r"\*\*The dose values do not survive\*\*"),
    ("§7.3 a tombstone beats a live row on import",
     r"\*\*A tombstone wins over a live row with the same `id` on import\*\*"),
    ("§11.3 logRevision has a row", r'key: "logRevision", logRevision'),
]


# BACKLOG statements that PLAN.md has since settled.
STALE_BACKLOG = [
    # "UNDECIDED" contains "DECIDED", which RESOLVED_MARKERS matched
    # case-insensitively — the entry suppressed itself and could never fire [R1].
    ("Name — undecided. See the research table", "the name is decided: MealUnits"),
    ("blocks threshold calibration", "§18.6 is closed; ~50 g and 24-25 units per meal"),
]
# --- DECLARED TABLES END ---


def load(path):
    with io.open(path, encoding="utf-8") as fh:
        return fh.read()


def flexible(phrase):
    """Whitespace-tolerant pattern: survives line wrapping."""
    return re.compile(r"\s+".join(re.escape(w) for w in phrase.split()), re.IGNORECASE)


def context(text, start, end, window=400):
    return text[max(0, start - window):min(len(text), end + window)]


def line_of(text, idx):
    return text.count("\n", 0, idx) + 1


# ---------------------------------------------------------------------------
# CHECKS
# ---------------------------------------------------------------------------

def check_retired(corpus):
    """1. A retired phrase whose occurrence count has moved, ACROSS ALL LIVE FILES.

    Count-based, not marker-based — see the RETIRED table for why. A resurrected
    phrase and a false removal claim both change the count, and neither can hide
    behind an adjacent correction note.
    """
    if isinstance(corpus, str):            # tolerate a single-file call
        corpus = {"PLAN.md": corpus}
    out = []
    for phrase, expected in RETIRED:
        where, total = [], 0
        for rel, text in sorted(corpus.items()):
            hits = list(flexible(phrase).finditer(text))
            total += len(hits)
            where += ["%s:%d" % (rel, line_of(text, m.start())) for m in hits]
        if total != expected:
            out.append("retired phrase %r: expected %d across all live files, found "
                       "%d (%s) — if the change is intended, update the count"
                       % (phrase, expected, total, ", ".join(where) or "none"))
    return out


def check_retired_in_source(_plan):
    """1b. A retired phrase living on in TypeScript source — ADDED 2026-09-11.

    The corpus sweep cannot see .ts files, and a docstring is where a dead rule
    reads most like live spec: src/core/bands.ts asserted §4.5's deleted
    band-E-wording rule for two days after note 2's ruling retired it. Reads
    the tree directly rather than through `load`, so the self-test's corpus
    override does not reach it; it was instead shown to fail on the real
    defect by execution — re-seeding the retired sentence into bands.ts
    produces the finding, and removing it returns the checker to clean
    (executed 2026-09-11, the same standard §20.3 sets for every other check).
    """
    # `.tsx` ADDED 2026-09-14 with T3's Preact port. This one failed LOUDLY when
    # the extension changed, and only because it pins a non-zero count: one
    # retired phrase is expected in a docstring here, and a filter matching
    # nothing found none of it. Check 1c expects ZERO findings, so the same
    # rename left it reporting clean — which is what INPUT_FLOORS now catches.
    files = {}
    for path in source_files("check_retired_in_source: src/**",
                             os.path.join(HERE, "src"), SOURCE_SUFFIXES):
        rel = os.path.relpath(path, HERE).replace(os.sep, "/")
        with io.open(path, encoding="utf-8") as handle:
            files[rel] = handle.read()
    # `package.json` joins the sweep 2026-09-21, for the third instance of the
    # same blind spot. Its `description` still said the app was "for one
    # person" eight days after the audience change retired the phrase, because
    # the document corpus is SWEPT_SUFFIXES and the source corpus is
    # `src/**/*.ts{,x}` — and package.json is in neither. That is exactly how
    # this phrase survived in page metadata the first time, which check 1c's
    # own comment records as having lasted "because nobody looked".
    metadata = os.path.join(HERE, "package.json")
    if os.path.exists(metadata):
        files["package.json"] = load(metadata)
    out = []
    for phrase, _expected in RETIRED:
        allowed = RETIRED_IN_SOURCE_OK.get(phrase, 0)
        where, total = [], 0
        for rel, text in sorted(files.items()):
            hits = list(flexible(phrase).finditer(text))
            total += len(hits)
            where += ["%s:%d" % (rel, line_of(text, m.start())) for m in hits]
        if total != allowed:
            out.append("retired phrase %r in source or package metadata: expected %d, found %d (%s)"
                       " — a doc-retired rule in a docstring is the rule living on; quote it"
                       " to explain the retirement and pin the count, or delete it"
                       % (phrase, allowed, total, ", ".join(where) or "none"))
    return out


# Quoted fragments that live outside `copy.ts` and are NOT user-facing words:
# CSS class pieces appended by concatenation, and two separators. Pinned by
# value rather than counted, so adding a real string fails instead of shifting
# a number. `' '` appears twice and is listed once — the pin is a membership
# test, not a tally.
# Files OUTSIDE `src/ui` that render user-facing English, with how much of it
# they currently hold. `10a` found all of it by putting the running app in Urdu
# and reading the screen; none of it was reachable by this check before, because
# the walk stopped at `src/ui` and `src/main.ts`.
#
# A COUNT rather than a list of strings, following `RETIRED_IN_SOURCE_OK`: the
# number goes DOWN as each file gets a language seam and must never go up. Zero
# means the file is done and should move out of this table into the ordinary
# walk. `src/main.ts` did exactly that on the day this was written — it was the
# one whose nine strings were cheap enough to fix immediately.
#
# `readable.ts` is a different case and may legitimately stay at its number:
# `10a` ruled that "exports, imports and stored records stay English", and that
# document is written for a doctor. It is pinned rather than exempted so the
# ruling has to be restated rather than assumed if the count ever moves.
UI_TEXT_PENDING = {
    # ZERO, and it is the point of the table. `main.ts` held nine — the update
    # bar and the install bar — and they were cheap enough to fix on the spot.
    # A pin of 0 says "this file is done" and still fails the build the moment
    # English comes back to it.
    "src/main.ts": 0,
    # Month names, AM/PM, noon, midnight — so every dose timestamp and every
    # history row. `src/core` imports nothing by design, so it cannot read a copy
    # object; the fix is a language seam into the domain, not a `COPY` key.
    "src/core/calendar.ts": 3,
    # `document.title` and the meta description, per route. 9 until 2026-09-22,
    # when the settings-as-text screen got an address of its own and brought a
    # title and a description with it.
    #
    # Rising is LEGITIMATE here and only here, which is why the number is
    # explained rather than just bumped: a route's English title is the shipped
    # value — the crawler's, the link preview's — and `copy.ts`'s `tabTitles`
    # overrides it per language at runtime. The English cannot leave this file
    # without breaking `check_route_titles_agree`'s pin against `index.html`.
    "src/routes.ts": 11,
    # "another brand", "Two insulins in a fixed ratio". Reference data, like the
    # food table — the same task and the same owner.
    "src/data/insulins.ts": 59,
    # The doctor's export, headings and all. `10a` ruled exports stay English;
    # PINNED rather than exempted, so the ruling has to be restated rather than
    # assumed if the number ever moves.
    "src/storage/readable.ts": 27,
}

UI_TEXT_OK = {
    " compact", " mint", " ", " stale", " \u2014 ", "n empty", "go quiet",
    # T3's JSX added ONE entry, not thirteen. The first version listed every
    # multi-word class name in the ported tree — "key dim", "flag mint",
    # "li act" and nine more — on the theory that class lists written out whole
    # in JSX would need exempting. They do not: a class value reaches the
    # attribute arm, which exempts `class` by NAME through
    # JSX_ATTRIBUTES_NOT_TEXT and never consults this set. Twelve of the
    # thirteen matched nothing, and "go quiet" was already here.
    #
    # A dead exemption is not free. This set is the list of strings the checker
    # has been told to ignore, and padding it with entries nobody can explain is
    # how a real one gets added later without anyone noticing.
    #
    # The survivor is a ternary's two branches in `settings.tsx`, which are a
    # class value in EXPRESSION position — single-quoted in code, so the
    # attribute arm never sees it.
    "field wide",
    # `10a`'s language rows build their class list with a ternary, which puts the
    # value in EXPRESSION position where the attribute arm cannot see it — the
    # same shape, and the same reason, as "field wide" above.
    " picked", "go quiet lang-row",
    # `10a`'s four typeface names, in `src/ui/language.ts`. They ARE rendered —
    # each sits beside the row that selects it — and they are exempt for the
    # same reason the insulin brands are: **a typeface name is a proper noun
    # printed by its foundry, and it does not translate.** "Noto Nastaliq Urdu"
    # is what the file is called, what the reader will find if they look it up,
    # and what tells Momin which of the four to keep when his mother has chosen.
    # A transliterated one would name nothing.
    #
    # Note they are NOT the row's label. Each row is written in the face it
    # names, in Urdu, and those words are in `copy.ts` where they belong; these
    # are the Latin identifier beside them.
    "Noto Nastaliq Urdu", "Gulzar", "Noto Naskh Arabic", "Noto Sans Arabic",
    # `10a`'s keep-list, reached once `suffix` and `tag` became scanned
    # attributes. These three are ruled to appear EXACTLY AS PRINTED in every
    # language: `mg/dL` is what the meter shows, and `ISF` and `ICR` are the
    # letters a doctor says out loud — the label's whole job is that "your ISF
    # is 30" finds the right field. A translated «حساسیت کا عنصر» matches
    # nothing anybody says.
    #
    # `TARGET` sat beside them and is NOT here: it is an ordinary word, it is
    # not printed on anything, and `copy-ur` writes it ٹارگٹ elsewhere on the
    # same screen. It moved into `copy.ts` instead.
    "mg/dL", "ISF", "ICR",
}

# JSX attributes whose values are markup, ids or machine names rather than words
# a person reads. The single-quote arm expresses the same set as a regex over the
# text BEFORE the quote; in JSX the attribute name is right there, so it is a set.
#
# `aria-label` is deliberately ABSENT: a string read aloud to a blind user is
# user-facing, and two stepper buttons shipped "half a unit less" and "half a
# unit more" as attribute literals. `aria-labelledby` and `aria-describedby` ARE
# here, because they hold element ids rather than words.
JSX_ATTRIBUTES_NOT_TEXT = {
    "class", "id", "type", "role", "inputmode", "autocomplete", "lang",
    "aria-labelledby", "aria-describedby", "aria-hidden", "aria-live",
    "aria-pressed", "aria-expanded", "key", "name", "rel", "href", "charset",
}

# Attributes whose value is READ TO A PERSON, where even a single word counts.
#
# The two-word rule everywhere else is what separates prose from markup: `key
# dim`, `flag mint` and `go quiet` are class names, and a check reporting every
# one-word string would report every class, id and enum value in the tree and be
# switched off within a day. The cost of that rule is that a one-word SENTENCE
# escapes — and `aria-label="delete"` on the keypad's backspace key is exactly
# that: a string spoken aloud to a blind user, sitting outside `copy.ts` and
# invisible to the translator `10a` will hand that file to.
#
# Narrowing by POSITION is what makes the relaxation safe. Inside these
# attributes there is no markup to confuse with prose — the value is text or it
# is a mistake. `aria-labelledby` and `aria-describedby` are deliberately NOT
# here and never will be: they hold element ids.
# `suffix` and `tag` JOINED 2026-09-22, and they are this project's OWN props
# rather than the platform's — which is why nobody thought of them. `TextInput`
# renders `suffix` beside the field ("units", "minutes", "mg/dL") and `tag`
# beside the label ("TARGET", "ISF", "ICR"). Four of those were English literals
# in `settings.tsx` and rendered on the Urdu settings screen every visit; the
# two-word rule could not see them because each is one word.
#
# `mg/dL`, `ISF` and `ICR` stay literals at those call sites and are correctly
# exempt — `10a` rules that anything printed on a meter or said by a doctor
# appears as printed. `TARGET` was neither, and `copy-ur` writes it ٹارگٹ
# everywhere else on the same screen.
JSX_ATTRIBUTES_SPOKEN = {"aria-label", "title", "alt", "placeholder", "suffix", "tag"}

# What each DISCOVERING WALK found on this run, filled in by `source_files`
# and read by `check_input_sets`. Cleared per run so `--self-test`, which calls
# `main` once per seeded mutation, does not accumulate across them.
_INPUT_SETS = {}

# The floor for every walk that discovers its own inputs.
#
# **This exists because a check that expects zero findings cannot tell you it
# has stopped looking.** Renaming eight files from `.ts` to `.tsx` left
# `check_ui_text_outside_copy` matching nothing, and its output did not change:
# `clean.`, over an entire app's worth of user-facing text that had moved out of
# `copy.ts`, with `10a` about to hand a translator a file that no longer held
# the words. One check caught the rename — the retired-phrase sweep — and only
# because it pins a NON-ZERO count and saw it drop to nought.
#
# A floor is that property, made general. It does not catch a regex that stopped
# matching inside a walk that still finds its files.
#
# **This comment used to say SELF_TESTS covers that half. It does not**, and
# check 34 is the counter-example: it resolved two of three `Omit<>` targets and
# reported clean, and a seeded mutation landing on either of the two it COULD
# see would have certified it. A single seed proves a check can fire once; it
# says nothing about how much of its input the check ever looked at. §20.3 now
# carries the third rule that closes this — a resolver reports what it resolved.
#
# The numbers are deliberately well below today's counts. They are not a census
# — deleting a screen must not fail the build — they are the point at which
# "this directory still has source in it" stops being true.
INPUT_FLOORS = {
    "check_retired_in_source: src/**": 20,
    "check_ui_text_outside_copy: src/ui/**": 4,
    "check_note_references: src, test, tools": 20,
    "check_reference_data: src/data/**": 1,
    "check_number_unit_nowrap: src/**": 20,
    # 1, not the 2 stylesheets that exist today. The floor above are all "well
    # below today's count"; here there is no room to be below. Folding
    # `fonts.css` back into `styles.css` is a refactor, not a check going
    # blind, and failing the build for it is the crying-wolf this file warns
    # against. Zero stylesheets is the state worth reporting.
    "check_logical_properties: src/**": 1,
}


def source_files(label, roots, suffixes):
    """Walk `roots` for `suffixes`, recording the size of what was found.

    Every discovering walk goes through here rather than spelling its own
    `os.walk` and `endswith`, for two reasons. The size is recorded so
    `check_input_sets` can fail when a filter stops matching; and T3's rename
    showed that a suffix list spelled once per check is a suffix list that gets
    updated in seven places out of eight — the citation sweep below still read
    `.ts` and not `.tsx` a day after the port, leaving five note citations in
    the ported screens unchecked.

    `roots` may be one path or several; the count is the total, because a check
    that reads three directories goes blind when the set of three empties, not
    when any one of them does.
    """
    assert label in INPUT_FLOORS, "%s has no floor in INPUT_FLOORS" % label
    paths = []
    for root in ([roots] if isinstance(roots, str) else roots):
        if not os.path.isdir(root):
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if not d.startswith(".")]
            for name in sorted(filenames):
                if name.endswith(suffixes):
                    paths.append(os.path.join(dirpath, name))
    paths.sort()
    _INPUT_SETS[label] = len(paths)
    return paths


def _caret_admits(clause, major):
    """Does a single `^X[.Y[.Z]]` clause admit this MAJOR version?

    Deliberately narrow. It answers for the caret form and says so when it meets
    anything else, because the alternative — treating an unparseable range as
    "still needed" — is how a check quietly stops being able to fail.

    Only the major is compared. An override exists because a range excludes our
    major entirely; a clause that admits the major at all is a clause the
    override has stopped being needed for, and the exact minor is npm's business
    rather than this check's.
    """
    clause = clause.strip()
    if not clause.startswith("^"):
        return None
    head = clause[1:].split(".")[0]
    if not head.isdigit():
        return None
    return int(head) == major


def check_stale_overrides(_plan):
    """22. A `package.json` override that upstream has made unnecessary — ADDED 2026-09-14.

    `overrides` relaxes a peer range npm would otherwise refuse. Two are live,
    both mapping a lint plugin's `eslint` peer to `$eslint`: `eslint-plugin-jsx-a11y`
    declares "^3 .. ^9" and `eslint-plugin-react` declares "^3 .. ^9.7", while
    this repository runs eslint 10. Both were MEASURED to work correctly on
    eslint 10 — seeded probes produced real findings — so the ranges are stale
    rather than accurate, and the override says so per package instead of a
    blanket `--legacy-peer-deps`.

    **An override silences npm permanently, which is the problem.** The day
    upstream publishes a range that admits eslint 10, nothing announces it; the
    override simply goes on suppressing a check that would now pass. This fails
    on that day, so the fix is deleting two lines rather than remembering.

    It also fails when an override names a package that is not in the lockfile,
    or one with no `eslint` peer at all — an override describing something that
    no longer exists is not protection, it is decoration.

    **Read from `package-lock.json`, not `node_modules`, and that is not a
    convenience.** The `plan` CI job installs nothing on purpose — "No npm step:
    the checker reads the documents and the TypeScript as text" — so a check
    reaching into `node_modules` would find nothing there and pass silently.
    The lockfile is committed, is what npm actually resolved, and is present
    wherever this runs.

    Shown to fail by execution against each branch: an override pointed at a
    package whose range already admits eslint 10 reports as unnecessary, and one
    naming an absent package reports as describing nothing.
    """
    out = []
    try:
        manifest = json.loads(load(os.path.join(HERE, "package.json")))
        lock = json.loads(load(os.path.join(HERE, "package-lock.json")))
    except (IOError, ValueError) as problem:
        return ["package.json or package-lock.json could not be read (%s), so the"
                " overrides cannot be checked" % problem]

    overrides = manifest.get("overrides") or {}
    if not overrides:
        return []

    packages = lock.get("packages") or {}
    root_range = ((packages.get("") or {}).get("devDependencies") or {}).get("eslint")
    installed = (packages.get("node_modules/eslint") or {}).get("version")
    if installed is None:
        return ["package-lock.json does not resolve eslint, so no override can be"
                " judged against it"]
    major = int(installed.split(".")[0])

    for name, mapping in sorted(overrides.items()):
        if not isinstance(mapping, dict) or "eslint" not in mapping:
            continue
        entry = packages.get("node_modules/" + name)
        if entry is None:
            out.append("package.json overrides %s but package-lock.json does not"
                       " resolve it — the override describes a package that is not"
                       " installed" % name)
            continue
        peer = (entry.get("peerDependencies") or {}).get("eslint")
        if peer is None:
            out.append("package.json relaxes %s's eslint peer, but %s@%s declares no"
                       " eslint peer at all — the override protects nothing"
                       % (name, name, entry.get("version", "?")))
            continue
        verdicts = [_caret_admits(clause, major) for clause in peer.split("||")]
        if None in verdicts:
            out.append("%s@%s declares the eslint peer %r, which this check cannot"
                       " read — it understands the caret form only. Widen"
                       " `_caret_admits` rather than leaving the range unjudged"
                       % (name, entry.get("version", "?"), peer))
            continue
        if any(verdicts):
            out.append("%s@%s now declares the eslint peer %r, which admits the"
                       " installed eslint %s (root asks %s) — the override in"
                       " package.json is no longer needed. Upgrade the plugin and"
                       " delete it."
                       % (name, entry.get("version", "?"), peer, installed, root_range))
    return out


def check_input_sets(_plan):
    """0. A discovering walk that has stopped finding anything — ADDED 2026-09-14.

    The meta-check. Every other check here reports on what it read; this one
    reports on whether anything was read at all.

    Runs LAST, because `_INPUT_SETS` is filled in by the walks as they happen.
    A label that never appears is a check that did not run, which is its own
    kind of silence and is reported as such.
    """
    out = []
    for label, floor in sorted(INPUT_FLOORS.items()):
        if label not in _INPUT_SETS:
            out.append("%s never ran, so nothing was examined — a check that does"
                       " not execute reports clean" % label)
            continue
        found = _INPUT_SETS[label]
        if found < floor:
            out.append("%s examined %d file(s) and the floor is %d — the walk has"
                       " stopped finding its inputs, and a check with no inputs"
                       " reports clean whatever is wrong" % (label, found, floor))
    return out


# Every hand-written source extension in `src/`. One tuple rather than four
# literals, because T3 renamed eight files from .ts to .tsx and each filter that
# spelled ".ts" for itself was a separate place to miss.
SOURCE_SUFFIXES = (".ts", ".tsx")


def one_word(text):
    """A single run of letters, in any script — the weakest thing still prose.

    Used only where POSITION already guarantees the value is text: an attribute
    read aloud to a screen-reader user. Applied generally it would report every
    class name and enum value in the tree.
    """
    return re.search(r"[^\W\d_]{2,}", text) is not None


def two_words(text):
    """Two runs of letters with whitespace between them — prose, not a token.

    `[^\\W\\d_]` is "a letter in ANY script", which `[A-Za-z]` was not. The
    ASCII form would have reported clean over an entire Urdu screen, in a
    project whose next backlog item is Urdu translation — the same
    expects-nothing blindness as the `.ts` filter, one layer down.

    Two words rather than one, because a single token is almost always a class
    name, an id or an enum value. That leaves single-word prose uncovered, which
    is a known and separately tracked gap.
    """
    return re.search(r"[^\W\d_]{2,}\s+[^\W\d_]{2,}", text) is not None


def without_block_comments(text):
    """Blank out /* ... */ runs, KEEPING every newline so line numbers hold.

    The prefix test below — a line starting `*` or `//` — was written for the
    `h()` call sites, where a block comment's continuation lines all began with
    ` *`. JSX comments are `{/* ... */}` and their continuation lines begin with
    whatever the indentation is, so after T3's port the sweep started reading
    comment prose as rendered text. The first run reported `misc.tsx` rendering
    'no recent dose', which is a quotation from §7.5 inside a JSX comment.

    Only `/* */` is stripped, never `//` to end of line: `//` appears inside URLs
    and stripping it would make this check see LESS than it does today, which is
    the wrong direction for a check whose failure mode is silence.
    """
    out, i, depth = [], 0, 0
    while i < len(text):
        if depth == 0 and text.startswith("/*", i):
            depth, i = 1, i + 2
            out.append("  ")
            continue
        if depth == 1 and text.startswith("*/", i):
            depth, i = 0, i + 2
            out.append("  ")
            continue
        character = text[i]
        out.append(character if depth == 0 or character == "\n" else " ")
        i += 1
    return "".join(out)


def check_ui_text_outside_copy(_plan):
    """1c. A user-facing string rendered from somewhere other than `copy.ts` —
    ADDED 2026-09-14.

    `src/ui/copy.ts` opens with "Every user-facing string, in one file", and on
    2026-09-13 that was FALSE: roughly eighty strings rendered from literals in
    `screens/*.ts`, `app.ts` and `components.ts`. Two consequences, and the
    second is the one that matters. The plain-language review (BACKLOG 25) was
    scoped to `copy.ts`, so none of them were reviewed; and `10a` hands a
    translator that same file, so every one of them would have stayed English —
    including "Save and start", the button that ends first-run setup.

    The header's claim is what made this invisible. A file that says it holds
    everything is not re-checked, so the drift never surfaced.

    **Template literals were the first blind spot, and are now covered.**
    `misc.ts` built a history row as `${reading} · ${carbs} g of carbohydrate`,
    and prose inside backticks is invisible to a quoted-string sweep. The second
    review found three more the same way — the HI/LO hint and "Eat around
    {time}" — so backticks are scanned too, with the `${...}` holes removed
    first and two consecutive words required before anything is reported.

    **`aria-label` is text, and is NOT exempt.** Two stepper buttons carried
    "half a unit less" and "half a unit more" as attribute literals. A string
    read aloud to a blind user is user-facing; `aria-labelledby` and
    `aria-describedby` stay exempt because they hold element ids, not words.

    **What it still cannot see:** a sentence assembled by concatenating
    single-word literals, and any string built at runtime from data. Neither has
    appeared here yet.

    **JSX, added 2026-09-14 with T3.** The port moved every screen from `h()`
    calls to JSX, and that moved user-facing text out of the two forms above
    into a THIRD the sweep could not see: a bare text node between tags,
    `<p>Some words here</p>`, which is neither quoted nor in backticks. It also
    changed how attributes are written — `aria-label="half a unit less"` is
    double-quoted in JSX and was single-quoted before, and the sweep only ever
    read single quotes.

    Both are covered below. Without them this check would have gone on reporting
    clean while every string in the app sat outside `copy.ts` — the exact
    "certifies nothing" failure it was written to end, arriving through a file
    rename.

    Every arm has a seeded mutation in SELF_TESTS, which is why this reads
    through `load` rather than opening files itself — see the call site. The
    original was shown to fail by execution instead (re-inlining
    `COPY.settings.saveFirstRun` produced the finding), and that is a weaker
    standard: it verifies the check once, on the day someone remembers to do it.
    """
    out = []
    # Keyed by file, because the four pinned ones are COUNTED rather than listed.
    found = {}
    # `src/main.ts` JOINED THE WALK 2026-09-22, and it had been outside it since
    # this check was written. The shell raises three bars — the update offer, the
    # install offer, the stuck-dose escalation — and nine of their strings were
    # literals in that file: "A newer version is ready.", "Use it now", "Later",
    # "Add this to your home screen?", "Add it", "Not now" twice over.
    #
    # Nothing reported them, because the walk was `src/ui` and `main.ts` is one
    # directory up. So `copy.ts`'s own opening line — "every user-facing string,
    # in one file" — was wrong about nine of them for as long as the bars have
    # existed, and `10a` would have shipped an Urdu interface whose only two
    # interruptions were in English. The header's claim is what made it
    # invisible, which is the same sentence this check's docstring already used
    # about the eighty it was written for.
    #
    # **"NONE OF WHICH RENDER ANYTHING" WAS FALSE**, and that sentence stood here
    # until 2026-09-22 as the reason `src/` outside `src/ui` was not walked. An
    # Urdu audit of the running app found English on screen from all four of the
    # files below, and the walk had never been able to see any of it:
    #
    #   src/core/calendar.ts   every month name, AM/PM, noon, midnight — so
    #                          every dose timestamp and every history row
    #   src/routes.ts          `document.title`, on every screen
    #   src/data/insulins.ts   "another brand", "Two insulins in a fixed ratio"
    #   src/storage/readable.ts the whole doctor's export, headings and all
    #
    # They are walked now, with what they currently hold PINNED below rather
    # than fixed, because fixing them is a language seam into `src/core` and a
    # ruling about the export — both larger than the change that found them.
    # A pin makes the debt machine-visible and stops it growing; see
    # `UI_TEXT_PENDING`.
    walked = source_files("check_ui_text_outside_copy: src/ui/**",
                          os.path.join(HERE, "src", "ui"), SOURCE_SUFFIXES)
    walked += [os.path.join(HERE, *rel.split("/")) for rel in UI_TEXT_PENDING]
    for path in walked:
        name = os.path.basename(path)
        # The LANGUAGE FILES, both of them. This check exists to keep strings in
        # one place per language, and these are those places — `copy-ur.ts`
        # joined 2026-09-22 with `10a`.
        #
        # Exempting a second file is safe here in a way it would not be
        # elsewhere, and the reason is structural rather than a promise: every
        # translation is typed `Copy`, `Copy` is derived from `typeof COPY`, and
        # the compiler therefore refuses a key the English does not have. A
        # stray string cannot hide in a translation — there is nowhere to put it.
        if name in ("copy.ts", "copy-ur.ts"):
            continue
        rel = os.path.relpath(path, HERE).replace(os.sep, "/")
        # `load`, not a direct read. `--self-test` swaps this function out to
        # serve mutated text in memory, and a check that opens the file
        # itself sees the real one and reports clean against a seeded
        # defect. The walk still touches the disk, because the FILE LIST is
        # what makes this check discover new screens rather than be told
        # about them.
        lines = without_block_comments(load(path)).split("\n")
        for number, line in enumerate(lines, 1):
            stripped = line.strip()
            if (stripped.startswith("*") or stripped.startswith("//")
                    or stripped.startswith("import ") or stripped.startswith("} from")):
                continue
            for match in re.finditer(r"'((?:[^'\\]|\\.)*)'", line):
                value = match.group(1)
                if " " not in value or value in UI_TEXT_OK:
                    continue
                if re.search(r"(?:class|id|type|role|inputmode|autocomplete|lang"
                             r"|data-[\w-]+|aria-(?:labelledby|describedby|hidden"
                             r"|live|pressed|expanded))'?\s*:\s*$", line[:match.start()]):
                    continue
                found.setdefault(rel, []).append(
                          "%s:%d renders %r, but src/ui/copy.ts claims to hold every"
                           " user-facing string — move it there, or add it to UI_TEXT_OK"
                           " if it is markup rather than words"
                           % (rel, number, value))
            for match in re.finditer(r"`((?:[^`\\]|\\.)*)`", line):
                # The `${...}` holes are values, not words. What is left is
                # the prose the template wraps around them.
                prose = re.sub(r"\$\{[^}]*\}", " ", match.group(1))
                # Two consecutive words, OR one word from the list below.
                #
                # Two words was the whole rule until 2026-09-22, and `10a` found
                # three escapes through the gap in one afternoon: `${step} of
                # ${total}` on the step counter, `was: ${x}` and `now: ${y}` on
                # the ratio-change confirmation. All three are prose GLUE between
                # interpolations, all three are one word, and all three would
                # have stayed English in an Urdu interface.
                #
                # Lowering the rule to any single word was tried first and
                # reported nineteen findings, fourteen of them class names, ids,
                # `px` and `sw.js`. That is the crying-wolf this file warns
                # about, so the widening is a CLOSED LIST of English function
                # words instead — words that join a value to another value and
                # cannot plausibly be a class name or an identifier.
                #
                # It is not a general solution and does not claim to be. A
                # single CONTENT word between two holes still escapes.
                GLUE = r"(?:of|was|now|and|or|to|from|at|in|per|then|for|with|by|than)"
                if not (re.search(r"[A-Za-z]{2,}\s+[A-Za-z]{2,}", prose)
                        or re.search(r"(?<![\w-])" + GLUE + r"(?![\w-])", prose)):
                    continue
                if prose.strip() in UI_TEXT_OK:
                    continue
                found.setdefault(rel, []).append(
                          "%s:%d builds %r inside a template literal, but src/ui/copy.ts"
                           " claims to hold every user-facing string — move the sentence"
                           " there as a function taking the values"
                           % (rel, number, prose.strip()))
            if not name.endswith(".tsx"):
                continue
            # JSX attribute values are DOUBLE-quoted, which the single-quote
            # sweep above cannot see. Same exemption rule; the attribute
            # allowlist is the one from the single-quote arm plus `class`,
            # which in JSX is written `class="go quiet"` rather than passed
            # in an object.
            for match in re.finditer(r'(\w[\w-]*)="([^"]*)"', line):
                attribute, value = match.group(1), match.group(2)
                if attribute in JSX_ATTRIBUTES_NOT_TEXT:
                    continue
                # One word is enough in an attribute that is read aloud.
                # Everywhere else the two-word rule holds, because the thing it
                # separates prose FROM is markup.
                words = one_word if attribute in JSX_ATTRIBUTES_SPOKEN else two_words
                if not words(value) or value in UI_TEXT_OK:
                    continue
                found.setdefault(rel, []).append(
                          "%s:%d renders %r in the %s attribute, but src/ui/copy.ts"
                           " claims to hold every user-facing string — move it there, or"
                           " add the attribute to JSX_ATTRIBUTES_NOT_TEXT if it holds"
                           " markup rather than words"
                           % (rel, number, value, attribute))
            # A DOUBLE-QUOTED STRING IN CODE, which the arm above skips
            # because it only matches `name="..."`. `{"Type any part of a
            # name"}` is a rendered string in an expression container and
            # was invisible to all four arms. Matches are excluded when a
            # `=` precedes them, which is what makes them attribute values
            # the arm above already judged.
            for match in re.finditer(r'"((?:[^"\\]|\\.)*)"', line):
                before = line[:match.start()].rstrip()
                if before.endswith("="):
                    continue
                value = match.group(1)
                if not two_words(value) or value in UI_TEXT_OK:
                    continue
                found.setdefault(rel, []).append(
                          "%s:%d renders %r, but src/ui/copy.ts claims to hold every"
                           " user-facing string — move it there, or add it to UI_TEXT_OK"
                           " if it is markup rather than words"
                           % (rel, number, value))

        # A BARE TEXT NODE between tags: `<p>Some words here</p>`, and the
        # form the port moved most of the app's prose into. Not quoted, not
        # in backticks, invisible to every arm above.
        #
        # Over the WHOLE FILE rather than per line, because the dominant
        # shape in this codebase puts the text on its own line:
        #
        #     <Button class="go" onPress={save}>
        #       Save these numbers
        #     </Button>
        #
        # A per-line scan needs an opening `>` and a closing `<` on one
        # line and sees none of that — which is most of the tree. Line
        # numbers are recovered by counting newlines up to the match.
        #
        # `</` and not a bare `<`: the run has to sit immediately before a
        # CLOSING tag. Without that, `=> a < b` reads as a text node and the
        # arm reported eight findings, every one of them TypeScript. Text
        # before a self-closing sibling (`<p>words<br />more</p>`) loses its
        # first half to this, which is the price of an arm that is quiet
        # enough to be read.
        source = "\n".join(lines)
        for match in re.finditer(r">([^<>{}]+)</", source):
            prose = " ".join(match.group(1).split())
            if not two_words(prose) or prose in UI_TEXT_OK:
                continue
            found.setdefault(rel, []).append(
                      "%s:%d renders the text %r directly in JSX, but src/ui/copy.ts"
                       " claims to hold every user-facing string — move it there"
                       % (rel, source.count("\n", 0, match.start()) + 1, prose))
    # Reconcile: `src/ui` reports every finding; the four pinned files report
    # only a CHANGE against their number.
    #
    # A pin that is too HIGH is reported as loudly as one that is too low. That
    # is the half this project keeps relearning — a count nobody lowers is a
    # count that stops meaning anything, and `check_input_sets` exists because a
    # check with no inputs reports clean whatever is wrong.
    for rel, findings in sorted(found.items()):
        pinned = UI_TEXT_PENDING.get(rel)
        if pinned is None:
            out.extend(findings)
        elif len(findings) > pinned:
            out.append("%s renders %d user-facing English strings and %d are pinned in "
                       "UI_TEXT_PENDING — something new was added to a file that is "
                       "waiting for a language seam, not a place to put more English"
                       % (rel, len(findings), pinned))
        elif len(findings) < pinned:
            out.append("%s renders %d user-facing English strings and %d are pinned in "
                       "UI_TEXT_PENDING — lower the pin, or it stops reporting the next "
                       "one that is added" % (rel, len(findings), pinned))
    for rel, pinned in sorted(UI_TEXT_PENDING.items()):
        if rel not in found and pinned != 0:
            out.append("%s is pinned at %d user-facing English strings and now has none "
                       "— set its pin to 0, or move it into the ordinary walk"
                       % (rel, pinned))
    return out


# Everything in `public/` is copied into the build, and `vite.config.ts` walks
# the build to make the service worker's precache — so anything added here is
# downloaded to every phone on install unless it is excluded there. Pinned by
# name so a new file forces the decision rather than defaulting to "ship it".
# `manifest.webmanifest` LEFT THIS SET on 2026-09-21 (T15). It is generated into
# `dist` from `BASE` now rather than copied verbatim, so it is not a `public/`
# asset at all — `check_generated_manifest` pins it instead.
PUBLIC_PRECACHED = {"fonts", "icons"}
# `robots.txt` LEFT THIS SET on 2026-09-21 (T15), for the same reason the
# manifest left PUBLIC_PRECACHED: it is generated into `dist` from BASE and
# SITE_URL now, so it is no longer a `public/` asset. The worker's walk still
# excludes it by name — a crawler file has no business on a phone's install
# path — and `check_generated_manifest` pins the generation.
PUBLIC_CRAWLER_ONLY = {"social", "404.html"}

# A THIRD kind, added 2026-09-22 with 10a's Urdu faces, because neither of the
# two above describes them. They are not precached — an English reader, the
# majority, never renders an Arabic character and Momin ruled directly that they
# must not take the hit. And they are emphatically not crawler-only: the APP
# requests them, the worker intercepts them, and it keeps what it fetches in a
# cache no deploy clears, which is what makes Urdu work offline from the second
# session on.
#
# So the two halves pull opposite ways and both are checked. Excluded in
# `vite.config.ts` like a crawler file; ABSENT from the worker's NOT_THE_APP,
# unlike one, because a path the worker refuses to handle is a path it cannot
# cache.
PUBLIC_ON_DEMAND = {"fonts-urdu"}

# Crawler-only files the BUILD writes, which therefore never appear in `public/`
# but are every bit as much not-the-app. The worker must keep both out of the
# precache and out of the shell fallback.
GENERATED_CRAWLER_ONLY = {"sitemap.xml", "robots.txt"}


def check_public_assets_classified(_plan):
    """1d. A new `public/` file silently added to every phone's install — ADDED
    2026-09-14.

    4a's link-preview card is 105 KB that no running app ever requests: a
    crawler or a chat client fetches it once, from the network, to build a
    preview. Adding it to `public/` put it straight into the precache, because
    the walk in `vite.config.ts` takes the whole directory — the same shape the
    walk's own comment already rejects for source maps, "for a developer at a
    desk, not a phone on mobile data". It was caught by reading the built
    `sw.js`, which is not a thing anyone does routinely.

    The failure is quiet in the direction that matters: an offline-first app
    pays for its precache in someone's mobile data, and nothing on screen says
    the install got bigger.

    So the classification is pinned rather than the size. A file that belongs on
    the phone goes in PUBLIC_PRECACHED; one only a crawler reads goes in
    PUBLIC_CRAWLER_ONLY **and** must be excluded in `vite.config.ts`. Both
    halves are checked, because the pin alone would pass while the exclusion was
    deleted.
    """
    out = []
    public = os.path.join(HERE, "public")
    if not os.path.isdir(public):
        return ["public/ is missing, and the build copies it verbatim"]

    found = {name for name in os.listdir(public) if not name.startswith(".")}
    classified = PUBLIC_PRECACHED | PUBLIC_CRAWLER_ONLY | PUBLIC_ON_DEMAND
    for name in sorted(found - classified):
        out.append("public/%s is not classified — add it to PUBLIC_PRECACHED if it belongs"
                   " on every phone, to PUBLIC_CRAWLER_ONLY (and exclude it in"
                   " vite.config.ts) if only a crawler reads it, or to"
                   " PUBLIC_ON_DEMAND if the app fetches it when someone asks for"
                   " it" % name)
    for name in sorted(classified - found):
        out.append("public/%s is pinned but no longer exists — drop it from the pin" % name)

    # `load`, never `open`. `self_test` seeds its mutations by overriding `load`,
    # so a direct disk read reports clean on a file the harness has already
    # broken — and this check did exactly that until 2026-09-22, when a seed
    # deleting the precache exclusion escaped and said so. Every rule this
    # function enforces about `vite.config.ts` was unverifiable before that.
    text = load(os.path.join(HERE, "vite.config.ts"))
    for name in sorted(PUBLIC_CRAWLER_ONLY & found):
        if "'%s'" % name not in text:
            out.append("public/%s is pinned as crawler-only but vite.config.ts never names it,"
                       " so the precache walk still ships it to every phone" % name)
    # Same exclusion, different reason: an on-demand file is fetched when asked
    # for, and precaching it hands the cost to everyone who never asks.
    for name in sorted(PUBLIC_ON_DEMAND & found):
        if "'%s'" % name not in text:
            out.append("public/%s is pinned as on-demand but vite.config.ts never names it,"
                       " so the precache walk still ships it to every phone" % name)
    return out


def check_site_url_agrees(_plan):
    """1e. The deployed address stated twice, drifting — ADDED 2026-09-14.

    `vite.config.ts` holds `SITE_URL` because the sitemap is generated and has
    to write an absolute `<loc>`. `index.html` states the same address three
    times: the canonical link, `og:url`, and the JSON-LD `url`. A canonical that
    disagrees with the sitemap is the specific failure that makes a search
    engine pick its own preferred URL and ignore both.

    Nothing else can catch it: the build succeeds, the page renders, and the
    disagreement is only visible to a crawler weeks later.
    """
    out = []
    with io.open(os.path.join(HERE, "vite.config.ts"), encoding="utf-8") as handle:
        config = handle.read()
    m = re.search(r"const SITE_URL = '([^']+)';", config)
    if not m:
        return ["vite.config.ts no longer declares SITE_URL, which the sitemap writes into <loc>"]
    site = m.group(1)

    with io.open(os.path.join(HERE, "index.html"), encoding="utf-8") as handle:
        page = handle.read()
    for label, pattern in (
        ("canonical", r'rel="canonical" href="([^"]+)"'),
        ("og:url", r'property="og:url" content="([^"]+)"'),
        ("JSON-LD url", r'"url": "([^"]+)"'),
    ):
        found = re.search(pattern, page)
        if not found:
            out.append("index.html no longer states its %s, which 4a shipped" % label)
            continue
        if not found.group(1).startswith(site):
            out.append("index.html's %s is %r but vite.config.ts writes %r into the sitemap"
                       " — a canonical that disagrees with the sitemap lets a search engine"
                       " pick its own preferred URL and ignore both"
                       % (label, found.group(1), site))
    return out


def check_structural_query_count(_plan):
    """1g. `BACKLOG.md` T3's count of structure-dependent test queries — ADDED
    2026-09-14.

    T3 claimed `test/integration.test.ts` had "66 assertions on rendered text and
    **0** on DOM structure", and used that zero as the argument that the suite is
    framework-agnostic and therefore a safe net for the Preact migration. It was
    wrong: there were nine selectors depending on markup shape plus one
    `parentElement` traversal.

    **It did not start wrong, it DRIFTED.** `62bf677` added
    `[data-field="foodQuery"]` on 2026-09-13 and nobody recounted, because a
    number written in prose has nothing watching it. That is the same failure
    §20.5's listing and the precache walk are in this repository to prevent.

    The count matters to the migration specifically: these are the assertions that
    constrain what the port may change. Class names, element ids and the
    `.entry .n` nesting have to survive it, and a reader deciding how safe the
    rewrite is should be told the true number.

    Queries by element type alone — `button`, `label`, `p` — are deliberately NOT
    counted. They depend on nothing a faithful port would alter.

    Shown to fail by execution, the standard §20.3 sets: changing T3's stated
    figure produces the finding, and restoring it returns the checker to clean.
    """
    out = []
    test_path = os.path.join(HERE, "test", "integration.test.ts")
    if not os.path.exists(test_path):
        return ["test/integration.test.ts is missing, so T3's structural-query"
                " count cannot be verified"]
    # `load`, not a direct read: --self-test swaps this function out to serve
    # mutated text in memory, and a check that opens the file itself sees the
    # real one and reports clean against a seeded defect. That is a check which
    # certifies nothing, and it is the exact failure this harness exists to
    # catch -- it caught this one, on the day the check was written.
    source = load(test_path)

    selectors = [m.group(2) for m in
                 re.finditer(r"querySelector(?:All)?\(\s*(['\"`])(.*?)\1", source)]
    structural = [sel for sel in selectors if any(c in sel for c in ".#[ ")]
    actual = len(structural) + len(re.findall(r"parentElement", source))

    backlog = load(os.path.join(HERE, "docs", "BACKLOG.md"))

    stated = re.search(r"There are \*\*(\d+) structural\n?queries\*\*", backlog)
    if stated is None:
        return ["docs/BACKLOG.md T3 no longer states a structural-query count;"
                " this check reads it from the phrase 'There are **N structural"
                " queries**' and cannot verify a figure that is not written down"]
    if int(stated.group(1)) != actual:
        out.append("docs/BACKLOG.md T3 says %s structure-dependent queries in"
                   " test/integration.test.ts, but there are %d (%d selectors"
                   " using a class, id, attribute or descendant combinator, plus"
                   " %d parentElement traversal). T3 uses this number to argue"
                   " the suite is a safe net for the Preact port, so it has to be"
                   " the real one."
                   % (stated.group(1), actual, len(structural),
                      len(re.findall(r"parentElement", source))))
    return out


def check_worker_knows_non_app_files(_plan):
    """1f. The service worker answering the app for a file that is not the app —
    ADDED 2026-09-14.

    Every path under the scope used to BE the app: there is no routing, so the
    worker's navigation branch could answer any of them with the shell. `4a` put
    a sitemap, a robots.txt and a preview card inside that scope without
    teaching the worker they are different, and opening
    /MealUnits/sitemap.xml in a browser rendered the CALCULATOR.

    It hid well. `curl` returns the real file, because curl has no service
    worker, and Googlebot does not run service workers either — so both the
    command line and the crawler saw the truth while the person checking the URL
    did not.

    The set is the same one `vite.config.ts` keeps out of the precache, for the
    same reason, so the two are pinned against each other: a file classified as
    crawler-only must also be excluded from the shell fallback.
    """
    out = []
    # `load`, never `open` — see `check_public_assets_classified`. Two seeds
    # against `src/sw.ts` escaped this check on 2026-09-22 for the same reason.
    worker = load(os.path.join(HERE, "src", "sw.ts"))
    m = re.search(r"const NOT_THE_APP = \[(.*?)\];", worker, re.S)
    if not m:
        return ["src/sw.ts no longer declares NOT_THE_APP, so a navigation to any path"
                " under the scope is answered with the app shell"]
    listed = set(re.findall(r"__SCOPE_PATH__\}([^`]+)`", m.group(1)))

    expected = {name if name != "social" else "social/" for name in PUBLIC_CRAWLER_ONLY}
    # GENERATED into the build rather than living in public/, so neither is in
    # the public pin — and both are just as much not-the-app. `robots.txt`
    # joined the sitemap here on 2026-09-21 when T15 moved it out of `public/`
    # so its `Sitemap:` address could come from BASE.
    #
    # Worth stating because the classification and the WORKER RULE came apart
    # for a moment when it moved: dropping it from `PUBLIC_CRAWLER_ONLY` left
    # `src/sw.ts` excluding a file nothing vouched for, which this check
    # reported immediately. The file's job did not change; only where it is
    # written did.
    expected.update(GENERATED_CRAWLER_ONLY)

    for name in sorted(expected - listed):
        out.append("%s is served from this app's scope but src/sw.ts's NOT_THE_APP does not"
                   " list it, so opening it in a browser renders the calculator instead"
                   % name)
    for name in sorted(listed - expected):
        out.append("src/sw.ts excludes %r from the shell fallback but nothing classifies it as"
                   " crawler-only — add it to PUBLIC_CRAWLER_ONLY or drop it" % name)

    # The OPPOSITE requirement, for the third bucket. An on-demand file is the
    # app's, so the worker must handle it — and must know about it by name,
    # because it goes in a cache that `activate` does not clear. Listing one in
    # NOT_THE_APP would return before `respondWith` and leave the browser to
    # fetch it, which works online and loses the face on the first deploy.
    for name in sorted(PUBLIC_ON_DEMAND):
        if "%s/" % name in listed or name in listed:
            out.append("src/sw.ts lists %s in NOT_THE_APP, so the worker never handles it"
                       " — an on-demand file it does not intercept is one it cannot keep"
                       " across a deploy" % name)
        if "%s/" % name not in worker:
            out.append("src/sw.ts never names %s/, so nothing routes it to the cache that"
                       " survives an activation and Urdu goes offline-blank after the next"
                       " deploy" % name)

    # And the cache it routes them to must outlive the build that fetched them.
    # `activate` sweeps every `mealunits-` cache that is not the current one, and
    # the font cache carries that prefix deliberately — §11.7's shared origin
    # makes the prefix the only thing keeping this app's cleanup off the blog's
    # caches. So the exemption is spelled out in that filter, and checked here:
    # delete it and the faces vanish on the next deploy with nothing failing.
    sweep = re.search(r"\.filter\(\(name\)\s*=>(.*?)\)\s*\n\s*\.map", worker, re.S)
    if sweep is None:
        out.append("src/sw.ts's activate sweep could not be read, so nothing verifies that"
                   " the Urdu faces survive it")
    elif "FONT_CACHE" not in sweep.group(1):
        out.append("src/sw.ts's activate sweep no longer exempts FONT_CACHE — the next deploy"
                   " deletes a face an Urdu reader downloaded on purpose, and they find out"
                   " by opening the app offline")
    return out


def check_note_references(corpus):
    r"""2c. A "note N" pointing at a build note that does not exist — ADDED 2026-09-13.

    Written in the same edit as the prune that made the class possible. The notes
    are cited from source, tests and the other documents — the sigil means a
    PLAN.md section everywhere, so BUILD-NOTES entries are cited as "note N"
    instead — and the prune deleted most of that file. Every number survived as a
    heading on purpose; this is what keeps it that way.

    Reads the source tree and the root-level configs directly as well as the
    corpus, because most citations are in TypeScript where nothing else would see
    them.

    **WIDENED 2026-09-13, same day, after review found three holes in the first
    version** — which is §19's "each revision's defects live in the previous
    revision's fixes" arriving inside the check written to enforce that lesson:

    1. **Case.** `\bnotes? (\d+)` missed "Note 26" at the start of a sentence.
       Two notes were cited ONLY in that form — 26 from PLAN.md and 58 from
       `tools/exact-oracle.mjs` — so deleting either heading passed clean.
    2. **Root-level configs were invisible.** The walk covered `src`, `test` and
       `tools`; `vite.config.ts` cites note 48, and this function's own SELF_TESTS
       comment named that file as a citing site while the check could not read it.
    3. **Multi-number citations.** "notes 11 and 21" and "notes 50, 53 and 55"
       checked only the first number.

    Holes 1 and 3 carry seeded mutations in SELF_TESTS. Hole 2 cannot: the
    self-test overrides the CORPUS, and this function reads source and config
    files straight from disk, so no corpus mutation reaches them — the same limit
    check_retired_in_source documents. It was shown to fail by execution instead:
    appending a citation of an out-of-range number to `vite.config.ts` produced a
    finding naming that file and line, and reverting returned the checker to clean
    (executed 2026-09-13). The finding is described rather than quoted because
    this check reads its own source, and quoting one is how the first version
    reported itself on its very first run.

    A widening that is not itself executed is the class this check exists to
    catch.
    """
    notes = corpus.get("BUILD-NOTES.md", "")
    if not notes:
        return []
    defined = set(re.findall(r"^## (\d+)\.", notes, re.M))
    files = dict(corpus)
    roots = [os.path.join(HERE, name) for name in ("src", "test", "tools")]
    # `.tsx` ADDED 2026-09-14. The port renamed eight files and this suffix list
    # was not one of the places that got updated, so five note citations in the
    # ported screens — notes 3, 6, 25, 38 and 59 — sat unchecked for a day. A
    # citation naming a note that has been renumbered or deleted is exactly what
    # this check exists to catch, and it could not see them.
    for path in source_files("check_note_references: src, test, tools", roots,
                             (".ts", ".tsx", ".mjs", ".css", ".js")):
        rel = os.path.relpath(path, HERE).replace(os.sep, "/")
        with io.open(path, encoding="utf-8") as handle:
            files[rel] = handle.read()
    # Root-level configs are discovered, not listed: a hand-written list of four
    # names is the rot this tool exists to prevent, and `vite.config.ts` was
    # missed by exactly that kind of omission.
    for name in sorted(os.listdir(HERE)):
        if not name.endswith((".ts", ".mjs", ".cjs", ".js")):
            continue
        path = os.path.join(HERE, name)
        if not os.path.isfile(path):
            continue
        with io.open(path, encoding="utf-8") as handle:
            files[name] = handle.read()
    out = []
    for rel, text in sorted(files.items()):
        if rel == "BUILD-NOTES.md":
            continue
        # Case-insensitive, and every number in the citation: "notes 50, 53 and
        # 55" names three notes and all three must resolve.
        for m in re.finditer(r"\bnotes?\s+(\d+(?:\s*(?:,|and)\s*\d+)*)", text, re.I):
            for num in re.findall(r"\d+", m.group(1)):
                if num in defined:
                    continue
                out.append("%s:%d: note %s cited but BUILD-NOTES.md has no such entry"
                           % (rel, line_of(text, m.start()), num))
    return out


def check_readme_mutation_figures(corpus):
    """2d. README's mutation figures against the report that generates them.

    ADDED 2026-09-13, on review. Note 16 was pruned precisely because hand-copied
    mutation counts went stale twice — and the same commit left four of them in
    README.md, which is the "claims about own contents" class reappearing in the
    edit that removed it. README keeps the numbers on purpose: it is the public
    face and a reader deciding whether to trust this project is owed concrete
    figures. So they are checked rather than deleted.

    **Skipped when `reports/mutation/report.json` is absent**, which is the normal
    case in CI: the `plan` job does not run Stryker, and the `mutation` job does
    not read README. That is not a hole — the numbers are edited locally, by a
    person who has just run `npm run mutate` and therefore has the report — so
    local is exactly where the check has to bite.

    **No SELF_TESTS entry, deliberately.** A seeded mutation must fail everywhere
    the self-test runs, and in CI's `plan` job there is no report to compare
    against, so the mutation would escape and the self-test would fail on a
    correct tree. Shown to fail by execution instead: changing README's killed
    figure produced the finding and reverting returned the checker to clean
    (executed 2026-09-13).
    """
    readme = corpus.get("README.md", "")
    if not readme:
        return []
    path = os.path.join(HERE, "reports", "mutation", "report.json")
    if not os.path.isfile(path):
        return []
    try:
        with io.open(path, encoding="utf-8") as handle:
            report = json.load(handle)
    except (ValueError, OSError):
        return ["reports/mutation/report.json exists but could not be read"]
    tally = {}
    for entry in report.get("files", {}).values():
        for mutant in entry.get("mutants", []):
            status = mutant.get("status")
            tally[status] = tally.get(status, 0) + 1
    killed = tally.get("Killed", 0)
    ignored = tally.get("Ignored", 0)
    survived = tally.get("Survived", 0)
    out = []
    for label, actual in (("killed", killed), ("disabled by name", ignored)):
        # The figure is written with a thousands separator or without it.
        shapes = ("{:,}".format(actual), str(actual))
        if not any(shape in readme for shape in shapes):
            out.append("README.md states no %s figure matching report.json (%d) — "
                       "regenerate with `npm run mutate` and update it, or drop the "
                       "number the way BUILD-NOTES note 16 did" % (label, actual))
    if survived and "0\n  survived" not in readme and "0 survived" not in readme:
        out.append("report.json has %d SURVIVED mutant(s) while README claims 0 survived"
                   % survived)
    return out


def headings(plan):
    """Every section id PLAN.md defines — headings AND numbered list items.

    The document writes §18.6 for "item 6 of section 18" and §10.1.6 for "item 6 of
    §10.1". Both are legitimate; a heading-only parser reports nine false positives.
    """
    spans, ids = [], set()
    for m in re.finditer(r"^#{2,5}\s+(\d+(?:\.\d+)*)\.?\s", plan, re.M):
        ids.add(m.group(1))
        parts = m.group(1).split(".")
        for i in range(1, len(parts)):
            ids.add(".".join(parts[:i]))
        spans.append((m.group(1), m.start()))

    # numbered list items become sub-ids of the section that contains them
    for idx, (sec, start) in enumerate(spans):
        end = spans[idx + 1][1] if idx + 1 < len(spans) else len(plan)
        for li in re.finditer(r"^(\d+)[a-z]?\.\s", plan[start:end], re.M):
            ids.add("%s.%s" % (sec, li.group(1)))
    return ids


def check_references_corpus(corpus):
    """2b. Dangling §references in the COMPANION files.

    check_references reads PLAN.md only, so a `§6.9` seeded into a step-flow ref
    chip passed clean [R1]. The design files are dense with §refs — they are how a
    mock states which rule it implements — and a ref pointing at nothing is how a
    mock silently stops being traceable to the plan.
    """
    plan = corpus.get("PLAN.md", "")
    known = headings(plan)
    if not known:
        return []
    out = []
    for rel, text in sorted(corpus.items()):
        if rel == "PLAN.md" or rel == "check-plan.py":
            continue
        # `&sect;` is the SAME reference. The HTML files use both forms — a
        # caption written as `&sect;7.99` was invisible to a check that only
        # knew the literal glyph, which [R2] proved by seeding one [R2].
        for m in re.finditer(r"(?:§|&sect;)(\d+(?:\.\d+)*)", text):
            ref = m.group(1)
            if ref in known:
                continue
            # a bare top-level ref like §3 is fine if §3 exists as a chapter
            if ref.split(".")[0] in known and "." not in ref:
                continue
            out.append("%s:%d: §%s resolves to nothing in PLAN.md"
                       % (rel, line_of(text, m.start()), ref))
    return out


def check_references(plan):
    """2. A §reference that resolves to nothing."""
    defined = headings(plan)
    out = []
    seen = set()
    for m in re.finditer(r"§(\d+(?:\.\d+)*)", plan):
        ref = m.group(1)
        if ref in defined or ref in seen:
            continue
        seen.add(ref)
        out.append("line %d: §%s referenced but no such section"
                   % (line_of(plan, m.start()), ref))
    return out


def check_removal_claims(plan):
    """3. A 'removed in vN' claim whose subject is not tracked in RETIRED."""
    out = []
    for m in re.finditer(r"\b(?:removed|deleted|withdrawn|cut|gone)\b[^.\n]{0,20}?\bin v(\d+)", plan, re.I):
        ctx = context(plan, m.start(), m.end(), 1200)
        if not any(flexible(ph).search(ctx) for ph, _ in RETIRED):
            out.append("line %d: removal claim with no RETIRED entry to verify it — "
                       "add the removed text to RETIRED so this becomes checkable"
                       % line_of(plan, m.start()))
    return out


def _block(plan, start_pat, open_ch, close_ch):
    m = re.search(start_pat, plan)
    if not m:
        return ""
    i = plan.index(open_ch, m.start())
    depth, j = 0, i
    while j < len(plan):
        if plan[j] == open_ch:
            depth += 1
        elif plan[j] == close_ch:
            depth -= 1
            if depth == 0:
                return plan[i:j + 1]
        j += 1
    return ""


def check_schema_snapshot(plan):
    """4. §17's five-leg rule: a §13.2 schema field with no §11.2 snapshot home."""
    snap = _block(plan, r"###\s+11\.2\s", "{", "}")
    schema = _block(plan, r'"input":\s*\{', "{", "}")
    if not snap or not schema:
        return ["could not locate §11.2 snapshot or §13.2 schema block — "
                "the parser needs updating (maintenance obligation)"]
    snap_names = set(re.findall(r"[A-Za-z][A-Za-z0-9_]{2,}", snap))
    # top-level keys only: bloodSugar/carbs nest inside `inputs`, isf/icr/target/threshold
    # inside `settings`, units/atMs inside `lastDose`. The snapshot carries the parents.
    depth, schema_names = 0, set()
    for tok in re.finditer(r'[{}]|"([A-Za-z][A-Za-z0-9_]+)"\s*:', schema):
        if tok.group(0) == "{":
            depth += 1
        elif tok.group(0) == "}":
            depth -= 1
        elif depth == 1:
            schema_names.add(tok.group(1))
    out = []
    for name in sorted(schema_names - snap_names - SNAPSHOT_EXEMPT):
        parent = GROUPED.get(name)
        if parent and parent in snap_names:
            continue
        if parent:
            out.append("§13.2 carries %r, mapped to snapshot parent %r — but %r is not in "
                       "§11.2's snapshot either" % (name, parent, parent))
        else:
            out.append("§13.2 carries %r but §11.2's snapshot does not, and it is in neither "
                       "SNAPSHOT_EXEMPT nor GROUPED — this is the leg that broke six "
                       "revisions running" % name)
    return out


def check_near_miss(plan):
    """5. Two identifiers one or two edits apart.

    Catches one- and two-character typos only. It does NOT catch the defect its
    first docstring claimed: eligibleEntryCount vs logEntryCount is six edits
    apart [R1]. That class is covered by the RETIRED count pin on logEntryCount.
    """
    # Deliberately-related identifiers are not typos. A prefix like un-/no- is a
    # meaningful distinction, not a slip: `answered`/`unanswered` are two of §6.7's
    # three states and must both exist.
    RELATED = {frozenset(("answered", "unanswered"))}
    names = {n for n in re.findall(r"`([a-z][A-Za-z0-9_]{7,})`", plan)}
    out = []
    for a, b in combinations(sorted(names), 2):
        if abs(len(a) - len(b)) > 2:
            continue
        if frozenset((a, b)) in RELATED:
            continue
        if _distance(a, b) <= 2:
            out.append("near-miss identifiers, one may be a typo of the other: %r / %r" % (a, b))
    return out


def _distance(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def check_constants(corpus):
    r"""17. §11.8's constants and ranges — VALUE and COMPLETENESS, any value form.

    v20 matched only `export const NAME = <digits>;`, so every non-numeric value
    was invisible in BOTH directions while the header claimed "a constant added to
    §11.8 without a pin fails the dispatch". [R1] executed the proof: negating
    `BAND_B_CORRECTION_UNITS` to -15 (band B would then almost never fire),
    narrowing `EAT_DELAY_MINUTES` from [20, 30] to [5, 10] (§8.1's clinical
    pre-meal window), and adding a brand-new `NEW_CLINICAL_GATE = -5` all passed
    clean. Same class as v18's check_blogfix: a stronger guarantee claimed than
    performed.

    Three separate things are checked, because they fail separately:
      * every declared name exists with the declared value, whatever its form;
      * every `export const` in PLAN.md is declared here or listed as structured;
      * EVERY occurrence is compared, not the last — a false restatement placed
        ABOVE §11.8 was masked by dict() keeping the later correct one [R1].
    """
    if isinstance(corpus, str):
        corpus = {"PLAN.md": corpus}
    plan = corpus.get("PLAN.md", "")
    out = []

    # Any value form: digits, negatives, quoted strings, arrays, objects, aliases.
    decl = re.compile(r"^export const\s+([A-Z_][A-Z0-9_]*)\s*=\s*(.+?);\s*(?://.*)?$",
                      re.M)
    names = re.findall(r"^export const\s+([A-Z_][A-Z0-9_]*)", plan, re.M)

    seen = {}
    for m in decl.finditer(plan):
        name, val = m.group(1), m.group(2).strip()
        seen.setdefault(name, []).append((line_of(plan, m.start()), val))

    for name, want in sorted(CONSTANTS.items()):
        if name not in seen:
            if name in names:
                out.append("§11.8 constant %s has no single-line value the checker "
                           "can read — declare it in STRUCTURED_CONSTANTS if that "
                           "is intended" % name)
            else:
                out.append("§11.8 constant %s is declared in check-plan.py but is "
                           "not in PLAN.md — it was deleted or renamed" % name)
            continue
        # EVERY occurrence, not just the last one.
        for line, val in seen[name]:
            if val != want:
                out.append("PLAN.md:%d: %s is %s; check-plan.py declares %s — if "
                           "the change is intended, change both in one edit"
                           % (line, name, val, want))

    declared = set(CONSTANTS) | STRUCTURED_CONSTANTS
    for name in sorted(set(names) - declared):
        out.append("PLAN.md declares `export const %s` which is NOT in "
                   "check-plan.py's CONSTANTS or STRUCTURED_CONSTANTS — an "
                   "unpinned constant is what round 19 found twelve of, and round "
                   "20 found again for every non-numeric value" % name)

    # THE SHIPPING FILE IS THE AUTHORITY ON WHAT EXISTS, not PLAN.md.
    #
    # Everything above reads PLAN.md, so the completeness it enforces is
    # completeness against the DOCUMENT. A constant added to src/config.ts and
    # never written into §11.8 was invisible to all of it: it is absent from
    # `names`, so nothing reports it, and absent from CONSTANTS, so nothing pins
    # its value either. BAND_E_FULL_CARD_WINDOW_HOURS shipped exactly that way on
    # 2026-09-13 and the checker stayed clean.
    #
    # So the same completeness is asserted the other way round, against the file
    # that actually compiles. §11.8's rule is that every number lives in
    # config.ts; this makes config.ts the thing that has to be complete.
    # Read THROUGH `load`, not with io.open, and deliberately. `live_files()`
    # sweeps documents only — `src/` is not in the corpus at all — so an earlier
    # version of this check read `corpus["src/config.ts"]`, got an empty string
    # and silently verified nothing. Going through `load` also means the
    # self-test can substitute a mutated config, which is what makes the seeds
    # below real instead of decorative.
    try:
        config_src = load(os.path.join(HERE, "src", "config.ts"))
    except (IOError, OSError):
        config_src = ""
    if config_src:
        shipped = set(re.findall(r"^export const\s+([A-Z_][A-Z0-9_]*)",
                                 config_src, re.M))

        # NOT every export — that would be 34 findings and the wrong rule.
        # §11.8's rule is that numbers LIVE in config.ts, not that every one is
        # documented; plenty are plumbing (UUID_VERSION_BYTE, WIZARD_STEPS) that
        # §11.8 has never claimed to govern.
        #
        # The class that matters is narrower and exact: a constant the DOCUMENTS
        # DISCUSS BY NAME is a decision someone argued for, and a decision whose
        # value nothing pins is one that can drift away from the prose arguing
        # for it. BAND_E_FULL_CARD_WINDOW_HOURS was written into §10.5's prose on
        # 2026-09-13 and pinned nowhere, which is what this catches.
        prose = "\n".join(text for rel, text in sorted(corpus.items())
                          if rel.endswith(".md"))
        for name in sorted(shipped - declared):
            # In CODE CONTEXT — backticked, or written as a declaration. A bare
            # word match reported `SHIPPED` on the strength of the English word
            # in a backlog heading, and a check that cries wolf gets switched
            # off. Every real reference to a decision constant in these
            # documents is already backticked or inside a fenced block.
            quoted = re.search(r"`%s`|export const\s+%s\b"
                               % (re.escape(name), re.escape(name)), prose)
            if quoted:
                out.append("src/config.ts exports %s and the documents discuss it "
                           "by name, but it is in neither §11.8's block nor "
                           "check-plan.py's CONSTANTS — a constant the prose "
                           "argues for and nothing pins is one that can drift "
                           "away from its own argument, which is how "
                           "BAND_E_FULL_CARD_WINDOW_HOURS shipped unpinned" % name)

        # The other direction: a pin that outlived the constant it pinned. This
        # is the state the file was in when DEFAULT_THRESHOLD was deleted and CI
        # caught the stale seed rather than the stale pin.
        # DELETE_CONFIRM_WINDOW_HOURS is pinned to an alias, not a literal, and
        # is exported — it is excluded only from the ALIAS spelling check above.
        for name in sorted(declared - shipped):
            out.append("check-plan.py pins %s but src/config.ts does not export "
                       "it — the pin outlived the constant" % name)
    for name in sorted(STRUCTURED_CONSTANTS - set(names)):
        out.append("check-plan.py lists %s as a structured constant but PLAN.md no "
                   "longer declares it" % name)

    # DRIFT across every live file INCLUDING PLAN.md, and WITHOUT requiring a
    # semicolon: prose restatements do not carry one, which is how
    # a halved STACK_SUPPRESS_HOURS seeded into BACKLOG.md passed clean [R1].
    # (No literal wrong value in this comment: writing one makes the comment
    # itself a false restatement, which this check then correctly reports.)
    numeric = {k: v for k, v in CONSTANTS.items()
               if re.match(r"^-?[0-9.]+$", v)}
    bare = re.compile(r"\b([A-Z_][A-Z0-9_]{3,})\s*=\s*(-?[0-9]+(?:\.[0-9]+)?)")
    for rel, text in sorted(corpus.items()):
        for m in bare.finditer(text):
            name, val = m.group(1), m.group(2)
            if name in numeric and val != numeric[name]:
                out.append("%s:%d: %s restated as %s; §11.8 says %s"
                           % (rel, line_of(text, m.start()), name, val,
                              numeric[name]))

    rows = dict(re.findall(
        r"^\s*([a-zA-Z]+):\s*\{\s*hard:\s*(\[[^\]]*\])", plan, re.M))
    for name, want in sorted(RANGES.items()):
        if name not in rows:
            out.append("§11.8 RANGE row %s is declared here but not in PLAN.md" % name)
        elif rows[name].replace(" ", "") != want.replace(" ", ""):
            out.append("§11.8 RANGE %s hard bound is %s in PLAN.md; check-plan.py "
                       "declares %s" % (name, rows[name], want))
    for name in sorted(set(rows) - set(RANGES)):
        out.append("§11.8 RANGE row %s is in PLAN.md but NOT declared here" % name)
    return out


def check_required(plan):
    """12. A rule this document must still contain, deleted outright.

    The mirror of check_canonical: that one fires when a number CHANGES, this one
    when a rule VANISHES. [R1] reverted v18's dosingHistory row and its three
    states and the checker stayed clean, so the fixes most likely to be undone had
    no mechanical representation at all.
    """
    out = []
    for label, pat in REQUIRED:
        if not re.search(pat, plan):
            out.append("REQUIRED rule %r is no longer in PLAN.md — it was deleted "
                       "or reworded past its pin; if the change is intended, change "
                       "the pin in the same edit" % label)
    return out


def check_canonical(corpus):
    """6. A number contradicting a canonical value, ACROSS ALL LIVE FILES.

    v18 dispatched this against PLAN.md alone while §20.3 claimed the canonical
    checks read every live file — so a wrong DEFAULT_THRESHOLD seeded into
    BACKLOG.md, BLOG-FIX.md or a design file passed clean while the identical
    mutation in PLAN.md failed [R2]. Drift is scanned everywhere; the PRESENCE
    pin stays bound to PLAN.md, which is the document that owns these values —
    BACKLOG.md is not required to restate them.
    """
    if isinstance(corpus, str):            # tolerate a single-file call
        corpus = {"PLAN.md": corpus}
    plan = corpus.get("PLAN.md", "")
    out = []
    for label, pat, allowed in CANONICAL:
      for rel, text in sorted(corpus.items()):
        for m in re.finditer(pat, text, re.I):
            # use the pattern's own capture where it has one; otherwise the first
            # number after "=" on the SAME line. Scanning a 120-char window caught
            # numbers from neighbouring lines — three false positives.
            if m.groups():
                num = m.group(1)
            else:
                eol = text.find("\n", m.end())
                tail = text[m.end():eol if eol > 0 else len(text)]
                found = re.search(r"=\s*(\d+)", tail)
                if not found:
                    continue
                num = found.group(1)
            if num in allowed:
                continue
            # NO marker exemption. [R1, R2] both proved the old one made this check
            # dead at its only site: §6.2's line carries a permanent "v2 left the only
            # safety-relevant number..." annotation, which matched `v\d+ left` and
            # immunized the number forever. A drift 20->25 passed clean twice.
            # Patterns here are specific enough that a correction note quoting an old
            # value does not match them; if one ever does, narrow the PATTERN.
            out.append("%s:%d: %s — found %s, expected one of %s"
                       % (rel, line_of(text, m.start()), label, num,
                          sorted(allowed)))
        # PRESENCE PIN: zero matches meant zero findings, so deleting the line
        # outright passed clean — the same silent-continue shape [R1] found in the
        # marker design. A canonical value that vanishes is a finding.
      if not list(re.finditer(pat, plan, re.I)):
            out.append("canonical value %r has NO statement in PLAN.md — "
                       "it was deleted or reworded past its pattern" % label)
    return out


# A match inside one of these is a RESOLVED entry being kept as a record, not a
# stale assertion. Struck-through text counts too.
# MARKUP, not English. [R1] broke the word-boundary version with plain prose:
# "See the research table below before anything is resolved" contains "resolved"
# and suppressed a live regression. A resolution must be marked up — struck
# through, or an ALL-CAPS/bold token — never merely mentioned in a sentence.
RESOLVED_MARKERS = re.compile(
    r"(~~|\*\*(?:DECIDED|ANSWERED|RESOLVED|CLOSED|CUT)\b|"
    r"\b(?:DECIDED|ANSWERED|RESOLVED|CLOSED|CUT) IN v\d+)")
# \b matters: without it "undecided" contains "decided" and the entry
# suppresses itself. [R1] caught this twice — the v15 rephrase kept the
# poison word instead of fixing the matcher.


def check_cross_document(backlog):
    """7. BACKLOG asserting something PLAN.md has settled.

    Skips matches that are struck through or carry a resolution marker: once an
    entry is answered it is kept as a record, and the old wording survives inside
    the strikethrough. Reporting that is a false positive, and a noisy check gets
    ignored — see the maintenance obligation.
    """
    out = []
    for phrase, why in STALE_BACKLOG:
        for m in flexible(phrase).finditer(backlog):
            # Bound to the match's OWN LINE. A 160-char window let the NEXT list
            # item's "~~" or "ANSWERED" suppress a live regression 12 chars below —
            # [R1] proved it three rounds running, most recently on the repaired
            # version. A resolution marker only counts if it wraps this entry.
            ls = backlog.rfind("\n", 0, m.start()) + 1
            le = backlog.find("\n", m.end())
            if le < 0:
                le = len(backlog)
            if RESOLVED_MARKERS.search(backlog[ls:le]):
                continue
            out.append("BACKLOG.md still says %r — %s" % (phrase, why))
    return out


def check_tool_rot(plan):
    """11. This script describing a thing the plan no longer has.

    Doc-rot inside the anti-rot tool. v17 cut §6.7 and left `usualDose` sitting in
    SNAPSHOT_EXEMPT with a comment describing the v8 design — both reviewers found
    it, the author did not. Any name this script exempts or maps must not be a name
    the document has retired.

    WHAT THIS DOES NOT COVER, stated so the coverage is not overread [R1]: only
    single-identifier names appearing in SNAPSHOT_EXEMPT or GROUPED. Rot inside
    CANONICAL, REQUIRED or STALE_BACKLOG is not checked here — those tables sit in
    the DECLARED TABLES region, which load_all redacts by design. Since v19 the
    rest of this script IS swept as a live file, so a retired phrase asserted in a
    comment out here is caught by check_retired; inside the region it is not.
    """
    retired_names = {ph for ph, _ in RETIRED if re.match(r"^[A-Za-z][A-Za-z0-9_]*$", ph)}
    out = []
    for name in sorted((SNAPSHOT_EXEMPT | set(GROUPED)) & retired_names):
        out.append("check-plan.py exempts or maps %r, which RETIRED lists as gone "
                   "from the plan — stale entry inside the anti-rot tool" % name)
    return out


def check_bold_balance(plan):
    """9. An unbalanced ** outside code fences.

    Added after [R1] found one at §11.3 that v14 CLAIMED to have fixed — the edit
    touched that line and removed the balanced pair beside it while leaving the
    stray. Same claim-about-own-contents class as the retired-phrase defect, so it
    gets a mechanical check rather than another promise.
    """
    out, in_fence = [], False
    for n, line in enumerate(plan.split("\n"), 1):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.count("**") % 2:
            out.append("line %d: odd number of ** outside a code fence" % n)
    # markdown allows a pair to span two lines; report only if the whole
    # paragraph is unbalanced
    return _paragraph_filter(plan, out)


def _paragraph_filter(plan, findings):
    if not findings:
        return []
    lines = plan.split("\n")
    bad, in_fence, start, count = [], False, None, 0
    for n, line in enumerate(lines, 1):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if not line.strip():
            if start and count % 2:
                bad.append("lines %d-%d: paragraph has an unbalanced ** "
                           "(a claim about the document's own contents has been "
                           "wrong here before)" % (start, n - 1))
            start, count = None, 0
            continue
        if start is None:
            start = n
        count += line.count("**")
    if start and count % 2:
        bad.append("lines %d-end: paragraph has an unbalanced **" % start)
    return bad


def check_plan_against_backlog(plan):
    """10. PLAN.md asserting something about BACKLOG.md that is not true.

    Added after [R1] found v14's header referencing backlog entries BY NUMBER after
    those numbers had been reused, and claiming BACKLOG still listed two features as
    deferred when the same day's edit had removed them. Checking was one-directional
    before, so nothing looked.
    """
    # The guard was narrower than the regex and let three shapes through, including
    # a live wrong pointer at §11.7. Dropped — the regex alone is cheap. Widened to
    # lettered ids: v15 added an "item D1" reference in the same revision that wrote
    # "reference by name, never by number", invisible to its own check [R1].
    out = []
    # re.I because "the backlog's item 12" is lowercase, and one interposed word
    # because "entry number 13" is natural English. [R1] slipped both past the
    # previous version.
    _PTR = re.compile(
        r"BACKLOG(?:\.md)?`?(?:'s)?\s+(?:items?|entr(?:y|ies))\s+(?:\w+\s+)?([A-Z]?\d+)"
        r"|(?:items?|entr(?:y|ies))\s+(?:\w+\s+)?([A-Z]?\d+)[^.\n]{0,24}?BACKLOG",
        re.I)
    for m in _PTR.finditer(plan):
        out.append("line %d: PLAN.md references a BACKLOG entry by id (item %s). "
                   "Ids get renumbered and the pointer rots silently — use the name"
                   % (line_of(plan, m.start()), m.group(1) or m.group(2)))
    return out


# Fixture URLs for the executed route test (§11.6 / BLOG-FIX §5). The app's own
# assets must match NOTHING the blog's worker installs; the blog's must still match,
# or the "fix" is just a broken blog.
APP_URLS = [
    "https://mominbinshahid.github.io/MealUnits/assets/index-abc123.js",
    "https://mominbinshahid.github.io/MealUnits/assets/index-abc123.css",
    "https://mominbinshahid.github.io/MealUnits/",
    "https://mominbinshahid.github.io/MealUnits/manifest.webmanifest",
    "https://mominbinshahid.github.io/MealUnits/sw.js",
    "https://mominbinshahid.github.io/MealUnits/icons/icon-192.svg",
    "https://mominbinshahid.github.io/MealUnits/static/chunk.js",
]
BLOG_URLS = [
    "https://mominbinshahid.github.io/app-abc123.js",
    "https://mominbinshahid.github.io/component---src-pages-index-js-abc.css",
    "https://mominbinshahid.github.io/static/example.png",
]


def blogfix_patterns(blogfix):
    """Every runtime pattern BLOG-FIX.md PROPOSES, as (key, regex source).

    Lines beginning "line NNN:" are quotations of the plugin's shipped defaults —
    the broken originals — and are skipped.
    """
    out = []
    for raw in blogfix.split("\n"):
        ln = raw.strip()
        if re.match(r"^line \d+:", ln):
            continue
        m = re.search(r"(urlPattern|dontCacheBustURLsMatching):\s*/(.+)/\s*,?\s*\}?\s*,?\s*$", ln)
        if m:
            out.append((m.group(1), m.group(2)))
    return out


def check_blogfix(blogfix):
    r"""8. BLOG-FIX.md's routes, EXECUTED against real URLs — not spell-checked.

    v18's comment here claimed "we also EXECUTE each one" while the code ran a
    `re.search` over the line's spelling and executed nothing — a checker claiming
    a stronger guarantee than it performs, found by both reviewers. The gap was not
    theoretical: changing the exclusion to `(?!.*\/MealUnits\/$)` passed all
    eleven checks while re-intercepting the app's .js, .css and sw.js, because `$`
    narrows the exclusion to a URL that ENDS at /MealUnits/ [R2, confirmed in Node;
    reproduced here in Python, which accepts these sources verbatim].

    Shape checks stay — they name the specific inversions reviewers have already
    produced, and give a better message than a bare match table — but EXECUTION is
    what actually decides.
    """
    out = []
    if "/MealUnits/" not in blogfix:
        out.append("BLOG-FIX.md never names the deployment path /MealUnits/")

    pats = blogfix_patterns(blogfix)
    if len(pats) < 3:
        out.append("BLOG-FIX.md proposes %d runtime pattern(s); needs 3 — two "
                   "urlPattern overrides (route 2 re-matches .js/.css after route 0 "
                   "rejects them) and dontCacheBustURLsMatching [R2]" % len(pats))

    # --- EXECUTION: the app must be invisible to every proposed route ---
    for key, src in pats:
        try:
            rx = re.compile(src)
        except re.error as exc:
            out.append("BLOG-FIX.md %s does not compile: %s" % (key, exc))
            continue
        leaks = [u for u in APP_URLS if rx.search(u)]
        if leaks:
            out.append("BLOG-FIX.md %s MATCHES the app's own URL(s) %s — the blog's "
                       "worker would intercept them. Pattern: /%s/"
                       % (key, ", ".join(leaks), src))
        if not any(rx.search(u) for u in BLOG_URLS):
            out.append("BLOG-FIX.md %s matches NO blog URL — the exclusion is too "
                       "broad and would stop caching the blog itself. Pattern: /%s/"
                       % (key, src))

    if "dontCacheBustURLsMatching: /^(?!" not in blogfix:
        out.append("BLOG-FIX.md's dontCacheBustURLsMatching must also be anchored "
                   "^(?! — its lookahead can be inverted silently otherwise [R1]")
    if "navigateFallbackBlacklist" not in blogfix:
        out.append("BLOG-FIX.md no longer names navigateFallbackBlacklist — "
                   "Workbox 4 spelling is load-bearing here")

    # The `{}` at index 1 is LOAD-BEARING: `_.merge` merges arrays BY INDEX, so
    # deleting the "pointless" placeholder slides route 2 into slot 1 and route 2's
    # ORIGINAL pattern re-intercepts the app's assets — the round-14 failure
    # resurrected by one tidying edit, which the line-counting check could not see
    # because two anchored overrides still remained [R1, executed against lodash].
    if not re.search(r"\{\s*\}\s*,", blogfix):
        out.append("BLOG-FIX.md no longer contains the `{}` placeholder at index 1 "
                   "of runtimeCaching — `_.merge` merges arrays BY INDEX, so "
                   "removing it slides route 2 into slot 1 and re-intercepts the "
                   "app's assets [R1]")
    return out


def _number_words():
    """0-99 as English words, GENERATED. v20 hand-listed nine of them and lacked
    "thirty-nine", so the next legitimate screen addition (38->39) would silently
    have disabled the only working total check at the moment it was needed [R1].
    A hand-list of number words is the same rot as a hand-list of files.
    """
    ones = ["zero", "one", "two", "three", "four", "five", "six", "seven",
            "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
            "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
    tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
            "eighty", "ninety"]
    out = {w: i for i, w in enumerate(ones)}
    for t in range(2, 10):
        out[tens[t]] = t * 10
        for u in range(1, 10):
            out["%s-%s" % (tens[t], ones[u])] = t * 10 + u
    return out


WORD_NUMBERS = _number_words()

# A screen CATALOGUE declares its screens as cells or plates, and its totals are
# checkable. looks.html is not a catalogue — it is a three-way comparison, so its
# "three screens" is prose about tap count, not a file total. Counting is limited
# to catalogues on purpose.
SCREEN_CONTAINERS = (r'<div class="cell">', r'<div class="plate">')

# Bounding the arithmetic window is a different job: it needs whatever frame the
# file actually uses, or the window runs to the start of the file and pairs one
# screen's meal with another screen's correction. looks.html has no cell or plate,
# so before v21 its window was unbounded — the same defect that produced a false
# positive in step-flow, sitting unnoticed in the file next door.
FRAME_CONTAINERS = SCREEN_CONTAINERS + (r'<div class="ph">',)


def _screen_count(text):
    return sum(len(re.findall(p, text)) for p in SCREEN_CONTAINERS)


def check_design_claims(corpus):
    """16. Every screen-count and plan-version claim, in the designs AND in PLAN.md.

    v20 checked word-number totals in design files only, and skipped digits "by
    design" — so the masthead's own "38 screens", every section chip, and PLAN.md's
    two claims about step-flow were all unchecked. [R1] found three live stale "36
    screens" and a chip set summing to 43 over a 38-screen file. Claims about a
    file's contents rot on edits to that file, wherever the claim lives.
    """
    plan = corpus.get("PLAN.md", "")
    m = re.search(r"^\*\*Version:\*\*\s*v?(\d+)", plan, re.M)
    if not m:
        return ["PLAN.md has no parseable **Version:** line to check designs against"]
    current = m.group(1)
    out = []
    counts = {}

    for rel, text in sorted(corpus.items()):
        if not rel.endswith(".html"):
            continue
        cells = _screen_count(text)
        counts[rel] = cells

        # --- plan-version claims. "vN", "PLAN.md vN", "version N", "vN of the plan"
        for vm in re.finditer(
                r"(?:PLAN(?:\.md)?\s*(?:v|version\s+)|plan\s+v)(\d+)"
                r"|\bv(\d+)\s+of the plan", text, re.I):
            got = vm.group(1) or vm.group(2)
            if got != current:
                out.append("%s:%d: names plan v%s; PLAN.md is at v%s"
                           % (rel, line_of(text, vm.start()), got, current))
        # --- §10.4 in the designs: runs on EVERY html file, catalogue or not.
        # v22 left this below the `if not cells: continue` that skips
        # non-catalogues, so looks.html — which has no cell or plate — was
        # exempt from the noon rule entirely. [R2] rendered "12:00 PM" there
        # and the run stayed clean. A formatting rule is about the text, not
        # about whether the file happens to count screens.
        # --- 12-hour, and NEVER "12:00 PM"/"12:00 AM": 12-hour, and NEVER "12:00 PM"/"12:00 AM" ---
        for tm in re.finditer(r"\b(\d{1,2}):(\d{2})\s*(AM|PM|noon|midnight)",
                              text, re.I):
            hh, mm, marker = int(tm.group(1)), tm.group(2), tm.group(3)
            marker = marker.upper() if marker.lower() in ("am", "pm") else marker.lower()
            line = line_of(text, tm.start())
            if hh == 12 and mm == "00" and marker in ("AM", "PM"):
                out.append("%s:%d: renders \"12:00 %s\"; §10.4 requires \"12:00 noon\" "
                           "and \"12:00 midnight\" written out — a lunch dose at noon "
                           "is this app's daily case" % (rel, line, marker))
            if hh == 0 or hh > 12:
                out.append("%s:%d: renders a 24-hour time \"%d:%s\"; §10.4 is 12-hour "
                           "with AM/PM" % (rel, line, hh, mm))
            if marker in ("noon", "midnight") and not (hh == 12 and mm == "00"):
                out.append("%s:%d: \"%d:%s %s\" is not a valid noon/midnight "
                           "rendering" % (rel, line, hh, mm, marker))

        if not cells:
            continue

        # --- section chips are SUBTOTALS and must sum to the whole
        # screens.html labels its sections `band-tag`, step-flow `chip` — both
        # are SUBTOTALS. v20 knew only about chips, so screens.html's three
        # section labels were read as (wrong) totals.
        chips = [int(n) for n in re.findall(
            r'<span class="(?:chip|band-tag)">\s*(\d+) screens', text)]
        if chips and sum(chips) != cells:
            out.append("%s: section chips claim %s = %d screens; the file has %d"
                       % (rel, " + ".join(str(c) for c in chips), sum(chips), cells))
        # a chip naming the whole ("completing 38")
        for cm in re.finditer(r"completing\s+(\d+)", text):
            if int(cm.group(1)) != cells:
                out.append("%s:%d: chip says \"completing %s\"; the file has %d "
                           "screens" % (rel, line_of(text, cm.start()),
                                        cm.group(1), cells))

        # --- every OTHER "N screens" is a TOTAL claim. Digits included: v20
        # skipped them and the masthead went unchecked for two revisions.
        for cm in re.finditer(r"\b([A-Za-z-]+|\d+) screens\b", text):
            tok = cm.group(1).lower()
            n = WORD_NUMBERS.get(tok, int(tok) if tok.isdigit() else None)
            if n is None:
                continue
            before = text[max(0, cm.start() - 40):cm.start()]
            if re.search(r"\bfirst\s+$", before):
                continue                      # deliberate subset claim
            if re.search(r'<span class="(?:chip|band-tag)">\s*$', before):
                continue                      # already handled as a subtotal
            after = text[cm.end():cm.end() + 12]
            if re.match(r"\s*(?:up|down|above|below|earlier|later|ago)\b", after):
                continue                      # "two screens up" is a direction
            if n != cells:
                out.append("%s:%d: says \"%s screens\" but the file has %d"
                           % (rel, line_of(text, cm.start()), cm.group(1), cells))

    # --- PLAN.md's OWN claims about each design file [R1: three were stale] ---
    for rel, cells in sorted(counts.items()):
        base = rel.split("/")[-1]
        for pm in re.finditer(re.escape(rel) + r"[^\n]{0,60}?\b(\d+) screens", plan):
            if int(pm.group(1)) != cells:
                out.append("PLAN.md:%d: says %s has %s screens; it has %d"
                           % (line_of(plan, pm.start()), rel, pm.group(1), cells))
        # artifact table rows name the file in a later cell than the count
        for pm in re.finditer(r"\|[^\n|]*?\b(\d+) screens[^\n]*?" +
                              re.escape(base), plan):
            if int(pm.group(1)) != cells:
                out.append("PLAN.md:%d: the artifact table says %s has %s screens; "
                           "it has %d" % (line_of(plan, pm.start()), rel,
                                          pm.group(1), cells))
    return out


def check_design_arithmetic(corpus):
    """15. A mockup showing a dose its own working cannot produce.

    [R1] found the band-E result screen printing **9 units** in two design files
    while the working directly beneath it read 4.6 + 5.5, and while both files'
    own history tables showed 10 for the same event. A mock is a specification of
    what the screen says; a mock that displays an impossible dose specifies a bug,
    and this one sat on the ketone-warning screen.

    Checks internal consistency only — correction + meal, rounded, against both the
    stated total and the big dose numeral — so it needs no prescription values and
    stays correct when the example settings change.
    """
    out = []
    tot_pat = re.compile(r"Total(?:, rounded)?</span><b>(-?[\d.]+) units</b>")
    # Components are read by SHAPE, not by the phrase "N down to N". v20's pattern
    # required that wording, so the band-B screen — "92 is below your target" with
    # a NEGATIVE correction — was wholly invisible: its total and headline could
    # both be set to 8 against a -1.9 + 5 working and pass clean [R1]. Band B is
    # the low-blood-sugar branch; an unchecked dose there is the worst place for one.
    comp_pat = re.compile(
        r"<span>([^<]*?)</span><b>\s*(?:<s>)?\s*(&minus;|&#8722;|\u2212|-)?\s*([\d.]+)\s*(</s>)?\s*</b>")
    # §10.3: a SUPPRESSED correction is shown, struck through, with its reason —
    # never silently omitted and never a bare dash, or the remaining lines visibly
    # fail to reach the total and the screen looks like an arithmetic error.
    # A struck component is excluded from the sum but its markup is still checked.
    held_pat = re.compile(r"<span>([^<]*?held back[^<]*?)</span><b>\s*(.*?)\s*</b>",
                          re.I)
    num_pat = re.compile(r'(?:dose-num">|class="n">)(-?[\d.]+)<')
    for rel, text in sorted(corpus.items()):
        if not rel.endswith(".html"):
            continue
        for tm in tot_pat.finditer(text):
            stated = float(tm.group(1))
            # Bound the window to the ENCLOSING SCREEN, not a fixed byte count.
            # A 2000-char lookback reached into the previous cell and paired this
            # screen's meal with the previous screen's correction — a false
            # positive that would have trained me to loosen the check.
            start = 0
            for opener in FRAME_CONTAINERS:
                idx = text.rfind(opener, 0, tm.start())
                if idx > start:
                    start = idx
            window = text[start:tm.start()]
            held = 0
            for hm in held_pat.finditer(window):
                held += 1
                inner = hm.group(2)
                if "<s>" not in inner:
                    # offsets are window-relative; report the REAL line
                    out.append("%s:%d: a held-back component is rendered %r; §10.3 "
                               "requires it SHOWN and STRUCK THROUGH with its "
                               "reason, never a bare dash"
                               % (rel, line_of(text, start + hm.start()), inner))
            comps = []
            for cm2 in comp_pat.finditer(window):
                label, sign, val, struck = (cm2.group(1), cm2.group(2),
                                            cm2.group(3), cm2.group(4))
                if "Total" in label:
                    continue
                if struck or "held back" in label.lower():
                    continue          # suppressed: shown, but not summed (§7.4)
                v = float(val)
                if sign:
                    v = -v
                comps.append((label, v))
            meal = [v for lab, v in comps if "carbohydrate" in lab.lower()]
            corr = [v for lab, v in comps if "carbohydrate" not in lab.lower()]
            if not meal:
                continue
            if not corr:
                # A screen whose ONLY correction is suppressed still has a total,
                # and it must equal the meal alone. v21 first skipped these, so the
                # §7.4 suppression screen — the one place the total deliberately
                # does not include a visible line — went unchecked.
                if not held:
                    continue
                c = 0.0
            else:
                c = corr[-1]
            m = meal[-1]
            exact = c + m
            line = line_of(text, tm.start())
            # v20 allowed +/-0.5 around round(exact), so a stated 9.6 against a
            # 4.6 + 5.5 working passed clean even though NO §5.1 mode can produce
            # 9.6 from 10.1 [R1]. The right test is membership of the set §5.1
            # actually permits, not a tolerance band.
            allowed = {round(exact),                      # nearest / ceil / floor
                       math.floor(exact), math.ceil(exact),
                       math.floor(exact * 2) / 2, math.ceil(exact * 2) / 2,
                       round(exact, 2)}                   # off = hundredths
            if not any(abs(a - stated) < 1e-9 for a in allowed):
                out.append("%s:%d: working shows %s + %s = %s; no §5.1 rounding "
                           "mode yields the stated %s units (permitted: %s)"
                           % (rel, line, c, m, round(exact, 2), stated,
                              ", ".join("%g" % a for a in sorted(allowed))))
                continue
            nums = num_pat.findall(window)
            if nums and abs(float(nums[-1]) - stated) > 1e-9:
                out.append("%s:%d: the headline dose reads %s but the same screen's "
                           "total says %s units"
                           % (rel, line, nums[-1], stated))

        # PROSE form. looks.html's Band design states the working as a sentence —
        # "6 to correct + 5 for the meal" — not as component rows, so it was
        # invisible to everything above. Seeding a wrong component there passed
        # clean, which I found by executing it rather than by reading the file.
        prose = re.compile(r"([\d.]+)\s*to correct\s*\+\s*([\d.]+)\s*for the meal")
        for pm in prose.finditer(text):
            c2, m2 = float(pm.group(1)), float(pm.group(2))
            exact2 = c2 + m2
            start2 = 0
            for opener in FRAME_CONTAINERS:
                idx = text.rfind(opener, 0, pm.start())
                if idx > start2:
                    start2 = idx
            nums2 = num_pat.findall(text[start2:pm.start()])
            if not nums2:
                out.append("%s:%d: \"%s to correct + %s for the meal\" has no dose "
                           "numeral on the same screen to check it against"
                           % (rel, line_of(text, pm.start()), pm.group(1), pm.group(2)))
                continue
            shown = float(nums2[-1])
            allowed2 = {round(exact2), math.floor(exact2), math.ceil(exact2),
                        math.floor(exact2 * 2) / 2, math.ceil(exact2 * 2) / 2,
                        round(exact2, 2)}
            if not any(abs(a - shown) < 1e-9 for a in allowed2):
                out.append("%s:%d: prose working %s + %s = %s but the dose shown is "
                           "%s (permitted: %s)"
                           % (rel, line_of(text, pm.start()), c2, m2,
                              round(exact2, 2), shown,
                              ", ".join("%g" % a for a in sorted(allowed2))))
    return out



# ---------------------------------------------------------------------------
# v23. Both reviewers proved the same structural gap independently: the pins
# protected EXPLANATORY PROSE and left the operative rules bare. [R1] inverted
# §7.4's suppression direction (the round-2 CRITICAL), clamped the correction
# instead of the total (§2.1's named defect), and moved band C from 54/70 to
# 44/60 — all three printed `clean`. [R2] escaped 17 of 19 mutations the same
# way. The three checks below stop protecting sentences and start recomputing
# the document's own numbers.
# ---------------------------------------------------------------------------

# The prescription every mock and worked example in this project is written
# against. Declared once so a check can recompute rather than trust.
CANON = {"target": 150.0, "isf": 30.0, "icr": 10.0}


def _allowed_doses(exact):
    """§5.1's five modes: nearest, half, ceil, floor, off.

    v23 wrote SIX values here, listing floor-half AND ceil-half as though `half`
    were a range. It is one mode and it rounds to the NEAREST half, so v23's
    oracle admitted a dose no build can produce — for 194 mg/dL and 45 g it
    accepted 5.5 against an exact 5.9667 [R2]. **The check written to catch an
    unproducible dose accepted one.** Recomputing is only safer than matching
    when the recomputation is right.
    """
    import math
    return {float(round(exact)), float(math.floor(exact)), float(math.ceil(exact)),
            round(exact * 2) / 2.0, round(exact, 2)}


def check_worked_examples(plan):
    """19. PLAN.md's own worked arithmetic, recomputed.

    The mockups have been arithmetic-checked since v20; the document that FEEDS
    the golden cases never was. [R1] changed §2's canonical total from 26.0 to
    27.0 and the run stayed clean — in the five lines an implementer copies
    first, and §13.7 records that v2 shipped exactly this class.
    """
    out = []

    # A worked example this check cannot READ is not a passing example. v23
    # matched one rigid three-line shape, so abbreviating `units` to `u` — or
    # writing the block any other way — made the arithmetic invisible while the
    # run stayed clean [R2]. Every `correction = (a - b) / c = d` line must be
    # followed by a parseable meal and total, or the block is reported.
    for lead in re.finditer(r"correction\s*=\s*\([^)]*\)\s*/\s*[\d.]+\s*=", plan):
        tail = plan[lead.start():lead.start() + 400]
        if not re.match(
                r"correction\s*=\s*\(\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\)\s*/\s*"
                r"\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?\s*units?\s*\n"
                r"\s*meal\s*=\s*\d+(?:\.\d+)?\s*/\s*\d+(?:\.\d+)?\s*=\s*"
                r"-?\d+(?:\.\d+)?\s*units?\s*\n"
                r"\s*total\s*=?\s*-?\d+(?:\.\d+)?\s*units?", tail):
            out.append("PLAN.md:%d: a worked example this check cannot parse — "
                       "it must read `correction = (a - b) / c = d units`, then "
                       "`meal`, then `total`, each with the word `units`, or its "
                       "arithmetic is unverified"
                       % line_of(plan, lead.start()))
    for m in re.finditer(
            r"correction\s*=\s*\((\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\)\s*/\s*"
            r"(\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)\s*units?\s*\n"
            r"\s*meal\s*=\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*=\s*"
            r"(-?\d+(?:\.\d+)?)\s*units?\s*\n"
            r"\s*total\s*=\s*(-?\d+(?:\.\d+)?)\s*units?", plan):
        bs, tgt, isf, corr, carbs, icr, meal, tot = (float(x) for x in m.groups())
        ln = line_of(plan, m.start())
        if abs((bs - tgt) / isf - corr) > 0.005:
            out.append("PLAN.md:%d: worked correction says %g; (%g - %g) / %g "
                       "= %g" % (ln, corr, bs, tgt, isf, (bs - tgt) / isf))
        if abs(carbs / icr - meal) > 0.005:
            out.append("PLAN.md:%d: worked meal says %g; %g / %g = %g"
                       % (ln, meal, carbs, icr, carbs / icr))
        if abs(corr + meal - tot) > 0.005:
            out.append("PLAN.md:%d: worked total says %g; %g + %g = %g"
                       % (ln, tot, corr, meal, corr + meal))
    return out


def check_prose_numbers(corpus):
    """20. Every restatement of a §11.8 constant or range, in EVERY live file.

    v23 wrote this check, claimed it covered "every prose restatement", and both
    reviewers then escaped 21 and 38 mutations through it. Three reasons, all
    fixed here:

      1. **It read only `.md`.** Every numeral in the three design files — the
         ketone threshold, the band D boundary, the override's ceiling, the
         eat-by window — was outside it entirely, and those are the numbers an
         implementer copies [R1].
      2. **It knew the shapes round 21 happened to mutate.** Band C's
         `X <= blood sugar < Y` was guarded; band A's `>= 70` one row above it
         was not, nor band B's `-1.5`, nor §7.4's `4-12 hours` range directly
         under two pinned rows [R1, R2].
      3. **It matched only unadorned text.** Bolding a field label, or writing
         a Unicode minus, removed the coverage [R1, R2].

    The lesson is recorded rather than just fixed: a recomputation is not
    structurally safer than a pin unless its PATTERNS are as wide as the
    document. v23 claimed the class was closed on the evidence of seven examples.
    """
    out = []
    C = {k: v for k, v in CONSTANTS.items()}
    hypo1, hypo2 = int(C["HYPO_LEVEL_1"]), int(C["HYPO_LEVEL_2"])
    keto = int(C["KETONE_ADVISORY"])
    # §8.5 — the three timing constants became ALIASES onto INSULIN_TIMING's
    # regular row on 2026-09-20, so their pins no longer hold a number. The
    # values come from the per-class table, and REGULAR's row is the right one:
    # every prose restatement this function hunts for is Humulin R's, because
    # that is the insulin §8.1 and CLINICAL.md section 4 are written about.
    #
    # Resolved rather than re-pinned. A second copy of 20-30 here is exactly the
    # drift this whole function exists to catch, one level up.
    eat_regular, suppress_regular, advise_regular = INSULIN_TIMINGS["regular"]
    advise, suppress = int(advise_regular), int(suppress_regular)
    bandb = C["BAND_B_CORRECTION_UNITS"]
    eat = re.findall(r"\d+", eat_regular)

    labels = {
        "blood sugar": "bloodSugar", "carbohydrates": "carbs",
        "target blood sugar": "target", "insulin sensitivity factor": "isf",
        "insulin-to-carb ratio": "icr", "basal dose": "basalUnits",
        "injected amount": "injected",
    }

    def norm(s):
        """Strip the decorations that used to hide a mutation: bold markers,
        Unicode minus and the HTML entity forms of the dashes."""
        s = s.replace("&minus;", "-").replace("\u2212", "-")
        s = s.replace("&ndash;", "-").replace("&mdash;", "-")
        s = s.replace("\u2013", "-").replace("\u2014", "-")
        return s.replace("**", "").replace("<b>", "").replace("</b>", "")

    for rel, text in sorted(corpus.items()):
        if rel == "check-plan.py":
            continue
        text = norm(text)
        def at(m):
            return "%s:%d" % (rel, line_of(text, m.start()))

        # ---- §4.5's table, both columns, against both declared tables ----
        for m in re.finditer(
                r"^\|\s*([A-Za-z][A-Za-z \-]*?)\s*(?:\(§[\d.]+\))?"
                r"(?:\s*-[^|]*?)?\s*\|\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)"
                r"[^|]*\|\s*(?:(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)|—|-)",
                text, re.M):
            key = labels.get(m.group(1).strip().lower())
            if not key:
                continue
            got = "[%s, %s]" % (_trim(m.group(2)), _trim(m.group(3)))
            if got != RANGES[key]:
                out.append("%s: %s hard range stated as %s; §11.8 declares %s"
                           % (at(m), key, got, RANGES[key]))
            if m.group(4) and key in SOFT_RANGES:
                soft = "[%s, %s]" % (_trim(m.group(4)), _trim(m.group(5)))
                if soft != SOFT_RANGES[key]:
                    out.append("%s: %s confirm-once band stated as %s; §11.8 "
                               "declares %s" % (at(m), key, soft, SOFT_RANGES[key]))

        # ---- §11.8's own soft: rows ----
        for m in re.finditer(r"(\w+):\s*\{\s*hard:\s*\[[^\]]+\],\s*"
                             r"soft:\s*(\[[^\]]+\])", text):
            key = m.group(1)
            if key in SOFT_RANGES:
                got = re.sub(r"\s+", " ", m.group(2)).replace("[ ", "[").replace(" ]", "]")
                if got != SOFT_RANGES[key]:
                    out.append("%s: §11.8 soft range for %s is %s; the declared "
                               "table says %s" % (at(m), key, got, SOFT_RANGES[key]))

        # ---- band boundaries, every shape they are written in ----
        for m in re.finditer(r"(\d+)\s*<=\s*blood sugar\s*<\s*(\d+)", text):
            if (int(m.group(1)), int(m.group(2))) != (hypo2, hypo1):
                out.append("%s: band C stated as %s <= blood sugar < %s; §11.8 "
                           "declares %d and %d"
                           % (at(m), m.group(1), m.group(2), hypo2, hypo1))
        for m in re.finditer(r"(?<!<= )blood sugar\s*<\s*(\d+)\b", text):
            if int(m.group(1)) != hypo2:
                out.append("%s: a band-D boundary stated as blood sugar < %s; "
                           "§11.8 declares %d" % (at(m), m.group(1), hypo2))
        # band A's floor and any other ">= N" against the hypo/ketone constants
        for m in re.finditer(r"blood sugar\s*>=\s*(\d+)\b", text):
            n = int(m.group(1))
            if n not in (hypo1, keto):
                out.append("%s: a band boundary stated as blood sugar >= %s; "
                           "§11.8 declares HYPO_LEVEL_1 %d and KETONE_ADVISORY %d"
                           % (at(m), m.group(1), hypo1, keto))
        # "Below 54 — band D" is how the mocks state a boundary, and no
        # `blood sugar < N` pattern reaches it [R1].
        for m in re.finditer(r"\bBelow\s+(\d+)\b", text):
            ctx = text[max(0, m.start() - 60):m.end() + 60].lower()
            if "band" not in ctx and "treat" not in ctx:
                continue
            if int(m.group(1)) not in (hypo1, hypo2):
                out.append("%s: a band boundary stated as \"Below %s\"; §11.8 "
                           "declares HYPO_LEVEL_1 %d and HYPO_LEVEL_2 %d"
                           % (at(m), m.group(1), hypo1, hypo2))
        # the ketone threshold, in prose or in a table condition, either order
        for m in re.finditer(r"(?:above|at or above|>=|over)\s*(\d{3})\b", text, re.I):
            n = int(m.group(1))
            window = text[max(0, m.start() - 60):m.end() + 60].lower()
            if "ketone" in window and n != keto:
                out.append("%s: ketone advisory stated at %s; §11.8 declares %d"
                           % (at(m), m.group(1), keto))
        # §3.2's band B trigger
        for m in re.finditer(r"correction\s+(?:of\s+|at\s+|below\s+)?(-\d+(?:\.\d+)?)\s*units?", text):
            if m.group(1) != bandb:
                out.append("%s: band B trigger stated as %s units; §11.8 declares "
                           "BAND_B_CORRECTION_UNITS %s" % (at(m), m.group(1), bandb))
        # hour windows: single values AND ranges
        for m in re.finditer(r"inside the last (\d+) hours", text):
            if int(m.group(1)) != advise:
                out.append("%s: delete-confirmation window stated as %s hours; "
                           "§11.8 declares %d" % (at(m), m.group(1), advise))
        for m in re.finditer(r"under (\d+) hours", text):
            if int(m.group(1)) != suppress:
                out.append("%s: stacking suppression stated as under %s hours; "
                           "§11.8 declares %d" % (at(m), m.group(1), suppress))
        # Scoped to the stacking window: "Humulin R acts 5-8 hours" is
        # pharmacology, not a restatement of a constant, and an unscoped
        # pattern reports it — a check that cries wolf gets its findings
        # dismissed, which is how a real one gets missed.
        # A table row `| A-B hours |` is the stacking window and nothing else.
        for m in re.finditer(r"^\|\s*(\d+)\s*-\s*(\d+)\s*hours\s*\|", text, re.M):
            if (int(m.group(1)), int(m.group(2))) != (suppress, advise):
                out.append("%s: the advise window row reads %s-%s hours; §11.8 "
                           "declares STACK_SUPPRESS_HOURS %d and "
                           "STACK_ADVISE_HOURS %d"
                           % (at(m), m.group(1), m.group(2), suppress, advise))
        for m in re.finditer(r"(\d+)\s*-\s*(\d+)\s*hours", text):
            ctx = text[max(0, m.start() - 90):m.end() + 90].lower()
            if not any(w in ctx for w in ("stack", "suppress", "advise", "override")):
                continue
            if (int(m.group(1)), int(m.group(2))) != (suppress, advise):
                out.append("%s: the advise window stated as %s-%s hours; §11.8 "
                           "declares STACK_SUPPRESS_HOURS %d and "
                           "STACK_ADVISE_HOURS %d"
                           % (at(m), m.group(1), m.group(2), suppress, advise))
        # §8.1's eat delay, wherever it is restated.
        #
        # THREE legitimate pairs since 2026-09-20, not one. A pin written
        # against Humulin R's alone reported CLINICAL.md section 4.1's rapid row
        # as drift on the day it was written — the exact "there stops being THE
        # value for the checker to assert" that BACKLOG entry 26 flagged before
        # the build.
        #
        # So the rule is class-aware rather than relaxed. Where the surrounding
        # prose NAMES a class, that class's pair is the only right answer; where
        # it names none, any declared pair passes and anything else is drift. A
        # rapid row stating 20-30 is still caught, which is the case that
        # matters — it is the wrong number in the hypo direction.
        declared = {name: re.findall(r"\d+", row[0])
                    for name, row in INSULIN_TIMINGS.items()}
        class_words = {
            # The bare word too. Without it CLINICAL.md's "we render 20-30
            # minutes for regular" named no class at all, and the nearest word
            # in the window was `ultra-rapid` from the sentence after it.
            "regular": ("regular", "humulin r", "actrapid", "novolin r"),
            "rapid": ("rapid analogue", "rapid-acting", "novorapid", "novolog",
                      "humalog", "apidra", "aspart", "lispro", "glulisine"),
            "ultra_rapid": ("ultra-rapid", "fiasp", "lyumjev", "faster aspart",
                            "lispro-aabc"),
        }
        for m in re.finditer(r"(\d+)\s*-\s*(\d+)\s*minutes", text):
            ctx = text[max(0, m.start() - 90):m.end() + 90].lower()
            if not any(w in ctx for w in ("inject", "eat", "before eating", "meal")):
                continue
            pair = [m.group(1), m.group(2)]
            # NEAREST class word wins, not the first found in some fixed
            # order. A fixed order reported CLINICAL.md section 14's question
            # 10b — "we render 20-30 minutes for regular" — as an ULTRA-RAPID
            # statement, because question 10a two paragraphs above mentions
            # ultra-rapid and fell inside the context window. Proximity is what
            # actually says which class a sentence is about.
            #
            # `rapid` is excluded where it is the tail of `ultra-rapid`, which
            # is the one case where two words occupy the same text and the
            # inner one would otherwise sit closer to a following number.
            here = m.start() - max(0, m.start() - 90)
            named, best = None, None
            for name, words in class_words.items():
                for word in words:
                    pattern = r"(?<!ultra-)rapid" if word == "rapid" else re.escape(word)
                    for hit in re.finditer(pattern, ctx):
                        distance = min(abs(hit.start() - here), abs(hit.end() - here))
                        if best is None or distance < best:
                            named, best = name, distance
            if named is not None:
                if pair != declared[named]:
                    out.append("%s: the %s eat delay stated as %s-%s minutes; "
                               "§11.8 declares [%s, %s]"
                               % (at(m), named, pair[0], pair[1],
                                  declared[named][0], declared[named][1]))
            elif pair not in declared.values():
                out.append("%s: an eat delay stated as %s-%s minutes, which is no "
                           "class's; §11.8 declares %s"
                           % (at(m), pair[0], pair[1],
                              ", ".join("%s [%s, %s]" % (n, v[0], v[1])
                                        for n, v in sorted(declared.items()))))
    return out


def check_design_numbers(corpus):
    """22. Arithmetic the mockups assert about themselves.

    check_mock_doses recomputes a history row from its own inputs. These are the
    other self-checking numerals [R1, R2]: §7.4.1's override ceiling is
    `earlier units x ISF` and v23's own new copy computed it from the WRONG
    OPERAND — it named 25 units injected and derived 180 from the 6 being added.
    A number a screen derives from another number on the same screen can be
    recomputed, and every one of these escaped every check until now.
    """
    out = []
    isf = CANON["isf"]
    for rel, text in sorted(corpus.items()):
        if not rel.endswith(".html"):
            continue
        flat = re.sub(r"<[^>]+>", " ", text)
        flat = flat.replace("&mdash;", "-").replace("&ndash;", "-")
        for m in re.finditer(
                r"injected\s+(\d+(?:\.\d+)?)\s*units?.{0,180}?"
                r"(?:lower|bring)\s+you\s+by\s+up\s+to\s+(?:about\s+)?"
                r"(\d+(?:\.\d+)?)\s*mg/dL", flat, re.S | re.I):
            units, ceiling = float(m.group(1)), float(m.group(2))
            if abs(units * isf - ceiling) > 0.5:
                out.append(
                    "%s: states %g units injected and a ceiling of %g mg/dL; "
                    "§7.4.1's ceiling is the EARLIER injection times sensitivity "
                    "= %g" % (rel, units, ceiling, units * isf))
    return out


def _trim(s):
    return s[:-2] if s.endswith(".0") else s


def check_mock_doses(corpus):
    """21. Every rendered history row recomputed from its own reading and carbs.

    v22 added a readable-export preview whose rows carry a reading, a carbohydrate
    figure and a calculated dose in a markup shape `check_design_arithmetic` cannot
    see — it looks for a correction/meal/total working, and these rows have none.
    [R1] changed one from 6 to 9 and it passed. A row that states its own inputs
    states enough to be checked.
    """
    out = []
    pat = re.compile(
        r"(\d+(?:\.\d+)?)\s*mg/dL\s*(?:·|&middot;)\s*(\d+(?:\.\d+)?)\s*g"
        r".{0,220}?<span class=\"c\">\s*(\d+(?:\.\d+)?)\s*</span>",
        re.S)
    tab = re.compile(
        r"<td>(\d+(?:\.\d+)?)</td>\s*<td>(\d+(?:\.\d+)?)\s*g</td>\s*"
        r"<td class=\"calc\">(\d+(?:\.\d+)?)</td>")
    for rel, text in sorted(corpus.items()):
        if not rel.endswith(".html"):
            continue
        for rx in (pat, tab):
            for m in rx.finditer(text):
                bs, carbs, shown = (float(x) for x in m.groups())
                exact = (bs - CANON["target"]) / CANON["isf"] + carbs / CANON["icr"]
                exact = max(0.0, exact)
                if shown not in _allowed_doses(exact):
                    out.append(
                        "%s:%d: row shows %g units for %g mg/dL and %g g; the "
                        "exact dose is %.4f and no §5.1 mode produces %g"
                        % (rel, line_of(text, m.start()), shown, bs, carbs,
                           exact, shown))
    return out

def check_copy_hardcodes_config(_plan):
    r"""Config values typed as digits inside user-facing copy.

    `src/ui/copy.ts:222` read "if you injected within the last 4 hours" as
    CHARACTERS while `pending`, eleven lines below it, already interpolated
    `${String(STACK_SUPPRESS_HOURS)}` from config. The same file, the same
    window, two mechanisms — agreeing only because nobody had changed the
    constant yet. Change `STACK_SUPPRESS_HOURS` to 6 and the sentence whose
    entire job is warning that a correction may stack would have gone on naming
    the old window.

    §11.8's two lint rules cannot reach it. Both match numeric LITERALS, and a
    digit inside a template string is a character, not a literal — the same way
    `.5` escaped through a raw beginning with a dot and `-100` escaped through a
    unary minus carrying the exemption. Three doors now, one species: a number
    leaving config.ts by a route the rules do not watch.

    Deliberately narrow. It fires only where a constant names its own unit —
    `*_HOURS`, `*_MINUTES`, `*_DAYS`, `*_SECONDS` — and copy states that value
    followed by that unit word. Worked examples ("4.4 becomes 4") and numbers
    that merely coincide are not flagged, because a check that cries wolf is one
    people learn to route around.
    """
    config = os.path.join(HERE, "src", "config.ts")
    copy = os.path.join(HERE, "src", "ui", "copy.ts")
    if not os.path.exists(config) or not os.path.exists(copy):
        return []

    with open(config, encoding="utf-8") as fh:
        text = fh.read()
    units = {"HOURS": "hours?", "MINUTES": "minutes?", "DAYS": "days?",
             "SECONDS": "seconds?"}
    consts = []
    for m in re.finditer(
            r"^export const\s+([A-Z_][A-Z0-9_]*_(HOURS|MINUTES|DAYS|SECONDS))\s*=\s*(\d+)\s*;",
            text, re.M):
        consts.append((m.group(1), m.group(2), int(m.group(3))))
    if not consts:
        return []

    with open(copy, encoding="utf-8") as fh:
        body = fh.read()
    out = []
    for name, unit, value in consts:
        word = units[unit]
        # The value written out, followed by its unit word. Skip the line if the
        # constant is interpolated on it — that is the correct form.
        for m in re.finditer(r"\b%d\s+(?:%s)\b" % (value, word), body):
            line_no = body.count("\n", 0, m.start()) + 1
            line = body.splitlines()[line_no - 1]
            if name in line:
                continue
            # Comments QUOTE copy — including the comment explaining this very
            # defect, and a note recording what a screen used to say. Both
            # tripped the first version of this check, which is the cry-wolf
            # failure its own docstring warns about. A comment cannot drift
            # against config because nobody reads it to a patient.
            if line.lstrip().startswith(("*", "//", "/*")):
                continue
            if not ("`" in line or "'" in line or '"' in line):
                continue
            out.append(
                "src/ui/copy.ts:%d states \"%s\" as text while %s = %d owns that "
                "value — interpolate it (§11.8; the lint rules cannot see a digit "
                "inside a string)" % (line_no, m.group(0), name, value))
    return out


def check_number_unit_nowrap(_plan):
    r"""§10.4 — a plain space between a number and its unit, anywhere in src.

    "10 units" broken across a line renders "10" above "units", which rejoins in
    the reader's head as "10Units" — the same misreading that made §10.4 spell
    the word out to begin with. Until 2026-09-15 the rule was enforced NOWHERE:
    `Qty` and `.qty` both existed, both had zero call sites, and the docstring
    on `Qty` claimed the rule was enforced rather than hoped for in a stylesheet.

    The invariant checked here is the CHARACTER, not the component. A no-break
    space in the app strings and `&nbsp;` in the readable export both pass,
    because neither contains U+0020; a contributor's `` `${carbs} g` `` fails
    with a file and a line. `units()` is therefore not required, only the
    character it emits.

    **What it does NOT catch, stated because an overclaiming docstring is the
    defect this check exists to delete.** It matches a LITERAL digit-or-closing-
    brace, a space, and a unit word, on one line. It is blind to
    `String(n) + ' g'`, to `[n, 'units'].join(' ')`, to a template literal broken
    across lines, to `<b>{n}</b> grams` where the space sits at a JSX element
    boundary, and to multi-line JSX text that collapses to a space when rendered.
    All five were seeded during review and all five escaped. The literal form is
    the one people actually write, which is why this earns its place — but it
    NARROWS the next call site, it does not make it impossible.

    Duration words are deliberately absent from the list. "30 minutes" split
    over two lines still reads as thirty minutes: no glyph in "minutes" can pass
    for a digit, and that substitution is the whole mechanism §10.4 guards.

    `ml` and `inch` joined the list 2026-09-17 on a DIFFERENT ground, and the
    distinction is worth keeping straight: "m" cannot pass for a digit either, so
    they are not here on the glyph argument. They are here because `carbs.ts`
    rows are written by copying the row above, and a row holding one protected
    pair and one plain one teaches both patterns at once. Durations stay out on
    hazard; measurement units come in on coherence.

    Two limits, stated rather than fixed. An en-dash range ("12–15 g") can still
    break at the dash, where there is no space to replace; `.v` carries
    `white-space: nowrap` for the food rows where that matters. And this reads
    source rather than the rendered DOM, which is the trade every check in this
    file makes.
    """
    src = os.path.join(HERE, "src")
    if not os.path.isdir(src):
        return []

    # `inch(?:es)?`, NOT `inches?` — the latter requires "inche" and misses the
    # bare word, which is every site in the corpus. "inches" appears nowhere
    # today; it costs nothing to cover and the trap is easy to walk into.
    # Case-sensitive, so a hypothetical "150 mL" escapes — consistent with the
    # narrows-not-prevents charter stated above.
    unit = r"(?:units?|grams?|mg/dL|ml|inch(?:es)?|g)"
    # THE URDU UNITS, added 2026-09-22 — and until then this rule did not cover
    # the translation at all. §10.4 exists because "10" above "units" rejoins in
    # a reader's head as "10Units", and nothing about that misreading is English:
    # «15 گرام» broken across a line is the same defect in the same app, on the
    # band C screen, in the language the reader is least able to double-check.
    #
    # Found by a SEED. The one covering "a screen builds its own pair" lost its
    # anchor when `10a` moved every such pair into `copy.ts`; re-aimed at a
    # translated string, it applied cleanly and was NOT CAUGHT, which is how the
    # hole surfaced. A seed that cannot find its anchor is a warning; a seed that
    # lands and survives is a finding.
    #
    # No `\b` after the Urdu alternatives: `\b` is defined by the `\w` class and
    # Arabic letters are word characters, so a boundary after گرام only exists
    # where the next character is not a letter — which is exactly where a
    # suffixed form like «گراموں» should still match. The lookahead for a
    # non-letter would exclude it; going without means the pattern matches the
    # stem wherever it appears, which is the direction this rule should err in.
    urdu_unit = r"(?:\u06af\u0631\u0627\u0645|\u06cc\u0648\u0646\u0679|\u0645\u0646\u0679"
    urdu_unit += r"|\u06af\u06be\u0646\u0679\u06d2|\u06af\u06be\u0646\u0679\u06c1)"
    pattern = re.compile(
        r"(?:[0-9]|\}) (?:" + unit + r"\b|" + urdu_unit + r")")
    out = []
    for path in source_files("check_number_unit_nowrap: src/**", src, (".ts", ".tsx")):
        if "__lint-fixtures" in path:
            continue
        # `load`, never `open`: `self_test` seeds its mutations by overriding
        # `load`, so a check that reads the disk directly reports "clean" on a
        # file the harness has already broken — which is the exact shape of
        # escape this checker's self-test exists to catch.
        body = load(path)
        rel = os.path.relpath(path, HERE)
        for line_no, line in enumerate(without_block_comments(body).splitlines(), 1):
            # `without_block_comments` leaves `//` alone on purpose — it appears
            # inside URLs — so line comments are dropped here. A TRAILING one
            # counts: `const CAP = 30; // at most 30 units` is a comment, and
            # reporting it is the crying-wolf failure this file warns about. The
            # lookbehind keeps `https://` intact, which is why `//` survives the
            # sweep above in the first place.
            line = re.sub(r"(?<!:)//.*$", "", line)
            if line.strip().startswith("*"):
                continue
            for m in pattern.finditer(line):
                out.append(
                    "%s:%d joins a number to its unit with an ordinary space "
                    "(\"%s\") — §10.4 forbids a line break there. Use \\u00A0 in "
                    "a TypeScript string, or &nbsp; in the readable export"
                    % (rel, line_no, m.group()))

    # The formatter every dose goes through, pinned separately — and it has to
    # be. `units` picks "unit" or "units" with a ternary, so its source holds
    # no literal `} units` for the sweep above to match: revert its no-break
    # space and the sweep reports clean. The one string that matters most is the
    # one the general rule structurally cannot see.
    #
    # **PINNED PER LANGUAGE since 2026-09-22.** It was an `export function` in
    # `copy.ts` until `10a` moved it INTO the copy object, because the name of a
    # unit is a word: the old shape rendered "4 units" inside an Urdu sentence on
    # every screen that shows a dose. Each language now writes its own, so each
    # language can lose the no-break space on its own, and both are checked.
    # A language file that does not exist is not a finding; one that exists and
    # has dropped the character is.
    for rel in ("copy.ts", "copy-ur.ts"):
        copy_path = os.path.join(HERE, "src", "ui", rel)
        if not os.path.exists(copy_path):
            continue
        body = load(copy_path)
        m = re.search(r"\n  units: \([^)]*\)[^=]*=>(.*?)\n  (?=[A-Za-z/])", body, re.S)
        if m is None:
            out.append("src/ui/%s no longer defines a `units:` member — §10.4's "
                       "no-break space was pinned to it and that pin is now blind"
                       % rel)
        # THE OVERRUN ARM, restored 2026-09-22 after a review found it deleted.
        #
        # The pin used to be an `export function` whose body ended at a
        # column-zero `}`; the third arm caught a match that ran past it. Moving
        # `units` INTO the object lost that terminator, and the replacement — the
        # next member — is only correct while a member follows. Reflow or delete
        # the doc comment after `units` and a non-greedy match runs to the next
        # one anywhere in the file: measured at 9075 characters, reporting clean
        # while `units` had lost its no-break space.
        #
        # A length bound is cruder than a real terminator and it is the point:
        # this pin's whole job is to notice when it has stopped looking at what
        # it thinks it is looking at. The longest either version has been is
        # about 130 characters.
        elif len(m.group(1)) > 400:
            out.append("src/ui/%s: the §10.4 pin matched %d characters, which is far more "
                       "than `units` has ever been — it has run past its own member and is "
                       "checking somebody else's body" % (rel, len(m.group(1))))
        elif "\\u00A0" not in m.group(1):
            out.append("src/ui/%s: `units` no longer joins the number to its word "
                       "with \\u00A0 — §10.4's rule is enforced there and nowhere "
                       "else for a dose figure" % rel)
    return out


def check_logical_properties(_plan):
    r"""10a — a stylesheet declaration that assumes the line starts on the left.

    10a's RTL piece is `dir="rtl"` plus "converting the physical CSS properties
    that remain to logical ones — small and mechanical, but IT HAS TO BE SWEPT
    FOR RATHER THAN ASSUMED DONE." The sweep happened. This is what keeps it
    done: a `margin-left` added next month puts the tag back on the
    wrong side of the heading in Urdu, and nothing else in the build would say
    so, because every test this project runs reads text and not layout.

    Only the INLINE axis is banned. `dir` flips the inline axis and leaves the
    block axis alone, so `bottom: 0` on a bar pinned to the foot of the screen is
    correct in both directions and stays. `top`/`bottom`, `margin-block-*` and
    `env(safe-area-inset-bottom)` are all untouched by this.

    **What it does NOT catch**, because a check whose docstring overclaims is the
    defect this file's overclaiming-docstring rule exists to delete. It reads property NAMES at declaration
    position, so it is blind to a physical direction expressed some other way: a
    `background-position: left`, a `::before` holding a rightwards arrow, a
    `transform: translateX()` whose sign is only right in English, a shadow
    offset, or a physical value reached through a custom property. It is also
    blind to anything outside `src/**/*.css` — an inline `style` attribute, or a
    stylesheet that arrives with a dependency. It narrows the next call site; it
    does not make the mistake impossible.
    """
    src = os.path.join(HERE, "src")
    if not os.path.isdir(src):
        return []

    # Spelled out rather than derived. The radius corners are why: the logical
    # name of `border-top-left-radius` is `border-start-start-radius`, naming the
    # block axis and then the inline one — NOT `border-top-start-radius`, which
    # is what a rule mapping only the left/right half produces and which is not a
    # property at all.
    BANNED = {
        "left": "inset-inline-start",
        "right": "inset-inline-end",
        "border-top-left-radius": "border-start-start-radius",
        "border-top-right-radius": "border-start-end-radius",
        "border-bottom-left-radius": "border-end-start-radius",
        "border-bottom-right-radius": "border-end-end-radius",
    }
    for box in ("margin", "padding"):
        BANNED[box + "-left"] = box + "-inline-start"
        BANNED[box + "-right"] = box + "-inline-end"
    for part in ("", "-width", "-style", "-color"):
        BANNED["border-left" + part] = "border-inline-start" + part
        BANNED["border-right" + part] = "border-inline-end" + part

    # These are physical in their VALUE, not their name, so they are matched on
    # the pair. `text-align: left` is the one that actually shipped, three times.
    BY_VALUE = {
        ("text-align", "left"): "text-align: start",
        ("text-align", "right"): "text-align: end",
        ("float", "left"): "float: inline-start",
        ("float", "right"): "float: inline-end",
        ("clear", "left"): "clear: inline-start",
        ("clear", "right"): "clear: inline-end",
    }

    out = []
    for path in source_files("check_logical_properties: src/**", src, (".css",)):
        # `load`, never `open`: `self_test` seeds its mutations by overriding
        # `load`, so reading the disk directly reports "clean" on a file the
        # harness has already broken.
        body = without_block_comments(load(path))
        rel = os.path.relpath(path, HERE)
        for line_no, line in enumerate(body.splitlines(), 1):
            # A declaration, not a line. Compact CSS puts several on one line and
            # a selector shares the line with its first one, so the separators
            # are split on rather than assumed absent.
            for fragment in re.split(r"[;{}]", line):
                if ":" not in fragment:
                    continue
                name, _, value = fragment.partition(":")
                name, value = name.strip().lower(), value.strip().lower()
                if not re.match(r"^[a-z-]+$", name):
                    continue
                if name in BANNED:
                    out.append(
                        "%s:%d declares `%s`, which points at a side rather than "
                        "at where the line starts — 10a puts this app in "
                        "`dir=\"rtl\"`. Write `%s`"
                        % (rel, line_no, name, BANNED[name]))
                if (name, value) in BY_VALUE:
                    out.append(
                        "%s:%d declares `%s: %s`, which points at a side rather "
                        "than at where the line starts — 10a puts this app in "
                        "`dir=\"rtl\"`. Write `%s`"
                        % (rel, line_no, name, value, BY_VALUE[(name, value)]))
    return out


def check_rtl_ranges_isolated(_plan):
    r"""10a — a number RANGE in a right-to-left language, painted backwards.

    `20-30` renders as `30-20` in Urdu. Not a font problem and not a translation
    problem: bidi rule N1 treats a European number as right-to-left when it
    resolves the neutral character between two of them, so the dash takes the
    paragraph's direction and the two numbers swap around it. A colon does not —
    `1:10` survives, because `:` is a Common Separator that binds its neighbours
    — which is why an ICR reads correctly and a range does not.

    **It shipped.** The result screen's timing card told a reader to inject
    `30-20` minutes before eating, and it took putting a built app in `dir="rtl"`
    with Urdu around the number to see it. Nothing else could have: every test
    here reads `textContent`, and `textContent` is the SOURCE order — it says
    `20-30` whichever way the glyphs are painted.

    So the fix is a character, and this is what keeps it there. A range inside a
    right-to-left string must sit inside `isolate(...)`, which wraps it in U+2068
    and U+2069 — the same thing `<bdi>` does in markup.

    **What it does NOT catch.** It reads the RTL language files only, matches a
    dash between two interpolations or two digit runs on one line, and asks
    whether `isolate` appears on that line. A range assembled across two lines,
    or built from a variable that already holds `"20-30"`, escapes. It is also
    blind to every other bidi hazard — a Latin unit after a number reorders too,
    and that one is cosmetic rather than wrong, so it is deliberately not here.
    """
    out = []
    # The right-to-left languages. English cannot have this defect: in an
    # left-to-right paragraph the algorithm never reorders the run at all.
    for rel in ("copy-ur.ts",):
        path = os.path.join(HERE, "src", "ui", rel)
        if not os.path.exists(path):
            continue
        body = without_block_comments(load(path))
        for number, line in enumerate(body.splitlines(), 1):
            if line.lstrip().startswith("//"):
                continue
            for pattern in (r"\$\{[^}]*\}\s*[-\u2013]\s*\$\{", r"[0-9]\s*[-\u2013]\s*[0-9]"):
                if re.search(pattern, line) is None:
                    continue
                if "isolate(" in line:
                    continue
                out.append(
                    "src/ui/%s:%d builds a number range that nothing isolates — in"
                    " right-to-left text the two numbers swap around the dash, so"
                    " `20-30` is painted `30-20`. Wrap it in `isolate(...)`"
                    % (rel, number))
                break

        # And the arrows, which are the same defect in a different costume.
        #
        # ARROWS DO NOT BIDI-MIRROR. U+2192 is painted pointing right whichever
        # way the paragraph runs, so a string that reads left-to-right in English
        # with an arrow between two phrases needs U+2190 in Urdu — the phrases
        # have swapped sides and the glyph has not.
        #
        # This file shipped BOTH conventions for a day: one translator flipped
        # the arrow in `stacking.overrideAction` and wrote down why, and another
        # left `timing.injectedAt` pointing back at the timestamp it came from.
        # Measured rather than reasoned: the injection phrase paints at 579px and
        # the eat instruction at 416px, so the arrow runs right-to-left.
        #
        # A glossary cannot catch this. It fixes 49 WORDS, and this is a glyph.
        for number, line in enumerate(body.splitlines(), 1):
            if line.lstrip().startswith("//"):
                continue
            if "\u2192" in line:
                out.append(
                    "src/ui/%s:%d uses \u2192 in a right-to-left language — arrows do not"
                    " bidi-mirror, so it points back at whatever came first instead"
                    " of forward at what follows. Use \u2190" % (rel, number))
    return out


def check_routes_do_not_collide(_plan):
    r"""BACKLOG 24 — a route named like a file, or a file named like a route.

    The worker answers every in-scope navigation with the shell, and that is
    exactly what real routes want. It is also the hazard: `NOT_THE_APP` in
    `src/sw.ts` is what keeps `sitemap.xml` and `robots.txt` from being served
    the application, and the two lists are maintained apart. A route segment
    that matches a real file means the file wins and the route 404s in a fresh
    browser and renders the app in an installed one — the same address behaving
    two ways depending on who clicks it. A file added under a route's name is
    the same collision from the other side.

    Checked against `public/`, because that is the directory copied verbatim
    into the deploy, and against the worker's own exclusion list.
    """
    routes_file = os.path.join(HERE, "src", "routes.ts")
    worker = os.path.join(HERE, "src", "sw.ts")
    public = os.path.join(HERE, "public")
    if not os.path.exists(routes_file):
        return []

    segments = re.findall(r"segment:\s*'([^']+)'", load(routes_file))
    if not segments:
        return ["src/routes.ts declares no segments — BACKLOG 24's four routes "
                "are the input to this check and it has gone blind"]

    out = []
    if os.path.isdir(public):
        present = set(os.listdir(public))
        for segment in segments:
            for name in (segment, "%s.html" % segment, "%s.xml" % segment, "%s.txt" % segment):
                if name in present:
                    out.append(
                        "route '%s' collides with public/%s — the file is served "
                        "verbatim and the route never reaches the app"
                        % (segment, name))

    if os.path.exists(worker):
        excluded = re.findall(r"\$\{__SCOPE_PATH__\}([^`']+)", load(worker))
        for segment in segments:
            for path in excluded:
                if path.rstrip("/") == segment:
                    out.append(
                        "route '%s' is listed in src/sw.ts's NOT_THE_APP — the "
                        "worker refuses to answer it with the app, so the route "
                        "works only where no worker is installed"
                        % segment)
    return out


def check_route_titles_agree(_plan):
    r"""BACKLOG 24 — `DEFAULT_TITLE` against the title `index.html` actually ships.

    The app sets the document title itself, because the worker answers every
    in-scope navigation with the SHELL and a route's own HTML never reaches
    anyone who has the app installed. So two files state the front door's title:
    `index.html`, which a first visit and every crawler read, and
    `src/routes.ts`, which the app applies a moment later.

    Drift is visible as a title that CHANGES while the page is opening — the
    kind of defect nobody reports and everybody notices.
    """
    routes_file = os.path.join(HERE, "src", "routes.ts")
    page = os.path.join(HERE, "index.html")
    if not os.path.exists(routes_file) or not os.path.exists(page):
        return []

    declared = re.search(r"DEFAULT_TITLE\s*=\s*'([^']+)'", load(routes_file))
    shipped = re.search(r"<title>([^<]+)</title>", load(page))
    if declared is None:
        return ["src/routes.ts no longer declares DEFAULT_TITLE — the app's "
                "title and index.html's can now disagree unnoticed"]
    if shipped is None:
        return ["index.html has no <title> — BACKLOG 24 pins the app's default "
                "against it and that pin is now blind"]
    if declared.group(1) != shipped.group(1):
        return ["src/routes.ts's DEFAULT_TITLE is %r but index.html ships %r — "
                "the title would change as the app boots"
                % (declared.group(1), shipped.group(1))]
    return []


def check_404_paths_agree(_plan):
    r"""`public/404.html`'s links against `BASE` — ADDED 2026-09-17.

    The page is copied verbatim, so it cannot be generated from the constants
    the way the route heads are; it states the deployed path twice, in the link
    back to the app and in its icon. `T15` counts both.

    Getting them wrong is silent in the worst way: the page whose whole job is
    to say "nothing is broken, here is the way back" would offer a way back that
    404s as well. It is also exactly the class of drift a domain move causes,
    and the day it moves is the day nobody is looking at this file.
    """
    page = os.path.join(HERE, "public", "404.html")
    config = os.path.join(HERE, "vite.config.ts")
    if not os.path.exists(page) or not os.path.exists(config):
        return []

    base = re.search(r"const BASE\s*=\s*'([^']+)'", load(config))
    if base is None:
        return ["vite.config.ts no longer declares BASE — public/404.html's "
                "links are pinned against it and that pin is now blind"]
    want = base.group(1)

    body = load(page)
    hrefs = re.findall(r'href="(/[^"]*)"', body)
    if not hrefs:
        return ["public/404.html has no absolute links — the way back to the "
                "app is what the page is for"]

    out = []
    for href in hrefs:
        if not href.startswith(want):
            out.append("public/404.html links to %r, which is outside BASE (%r) "
                       "— the page offering the way back would 404 too"
                       % (href, want))
    if want not in hrefs:
        out.append("public/404.html never links to %r itself — it tells someone "
                   "the address is wrong and does not offer the right one" % want)
    return out


def check_reference_data(_plan):
    r"""§11.8's second exemption, and the two conditions it was granted on.

    RULED 2026-09-12: reference data is not configuration, so `src/data/` is
    exempt from the numeric-literal rules. §11.8 grants that on two conditions
    the linter cannot see, and states that this checker verifies them rather
    than trusting they hold. This is that check; without it the section promises
    something nothing performs, which is the class §20.3 exists to stop.

    **Condition 1 — the module holds data and nothing else.** No thresholds, no
    behaviour, no branches. The moment `if (grams > X)` appears there, X is a
    decision wearing data's clothes and belongs in `config.ts` where §11.8 can
    see it. Enforced by refusing control flow outright: a data file has no need
    of any, so there is no honest false positive to weigh.

    **Condition 2 — every row is documented.** A food in the code that is not in
    `docs/CARBS.md` has no source and no confidence anyone can check, which is
    worse in a data file than in `config.ts` — at least `config.ts` has a header
    saying who may change a value. Matched on the Roman Urdu name, because that
    is the stable one: English descriptions get reworded, "Qorma" does not.
    """
    data_dir = os.path.join(HERE, "src", "data")
    carbs_doc = os.path.join(HERE, "docs", "CARBS.md")
    if not os.path.isdir(data_dir):
        return []
    out = []

    # The first version of this list was too short and let a seeded ternary
    # through — a check claiming a guarantee it did not perform, which is the
    # class §20.3 exists to stop, appearing inside a check written under §20.3.
    # `" ? "` catches the ternary while optional properties (`gramsMax?: x`) and
    # object literals, which have no spaces around the mark, pass untouched.
    banned = [("if (", "a branch"), ("for (", "a loop"), ("while (", "a loop"),
              ("switch (", "a branch"), ("function ", "a function"),
              ("=>", "a function"), (" ? ", "a ternary"),
              (".map(", "a transformation"), (".filter(", "a transformation"),
              (".reduce(", "a transformation"), (".sort(", "a transformation"),
              ("...", "a spread, which hides where rows come from")]
    sources = {}
    for path in source_files("check_reference_data: src/data/**", data_dir, (".ts",)):
        name = os.path.basename(path)
        with open(path, encoding="utf-8") as fh:
            body = fh.read()
        sources[name] = body
        for line_no, line in enumerate(body.splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith(("*", "//", "/*")):
                continue
            for token, what in banned:
                if token in stripped:
                    out.append(
                        "src/data/%s:%d contains %s — §11.8 exempts this "
                        "directory for DATA only, and behaviour here is a "
                        "decision escaping config.ts" % (name, line_no, what))

    if not os.path.exists(carbs_doc):
        if sources:
            out.append("src/data holds reference data but docs/CARBS.md is "
                       "missing — §11.8's second condition is that every row is "
                       "documented, and nothing can satisfy it")
        return out

    with open(carbs_doc, encoding="utf-8") as fh:
        doc = fh.read().lower()

    for name, body in sources.items():
        for m in re.finditer(r"^\s*roman:\s*'([^']+)'", body, re.M):
            roman = m.group(1)
            if roman.lower() not in doc:
                out.append(
                    "src/data/%s offers \"%s\" but docs/CARBS.md never mentions "
                    "it — §11.8's exemption requires every row to carry a source "
                    "and a confidence the document can be checked against"
                    % (name, roman))
    return out


def check_mutation_coverage_list(_plan):
    r"""Tests that exercise mutated code but are missing from the Stryker run.

    `vitest.stryker.config.ts` names the suites the mutation run executes, by
    hand, and a hand-maintained list rots. `test/foods.test.ts` was written,
    passed, and left out — so `src/core/foods.ts` scored **0.00% with eighteen
    mutants reported as having no coverage** while `npm test` was green. A file
    can be fully tested and score zero, and the only symptom is a number in a
    report nobody reads line by line.

    The invariant: a test that VALUE-imports from a mutated directory belongs in
    the list. Type-only imports are excluded because they execute nothing —
    `test/sync.test.ts` imports `Settings` as a type and correctly adds nothing
    to the score. Suites importing `fake-indexeddb` are excluded too, and that
    exclusion is deliberate rather than forgotten: the runner cannot stringify
    its `DOMException` and the dry run crashes outright, which the config says.
    """
    cfg = os.path.join(HERE, "vitest.stryker.config.ts")
    stryker = os.path.join(HERE, "stryker.config.json")
    test_dir = os.path.join(HERE, "test")
    if not (os.path.exists(cfg) and os.path.exists(stryker) and os.path.isdir(test_dir)):
        return []

    with open(stryker, encoding="utf-8") as fh:
        mutated = json.load(fh).get("mutate", [])
    # "src/core/**/*.ts" -> "src/core". config.ts is a file, not a directory.
    dirs = set()
    for glob in mutated:
        head = glob.split("/**")[0]
        if head.endswith(".ts"):
            continue
        dirs.add(head)
    if not dirs:
        return []

    with open(cfg, encoding="utf-8") as fh:
        listed = set(re.findall(r"'(test/[^']+\.ts)'", fh.read()))

    out = []
    for name in sorted(os.listdir(test_dir)):
        if not name.endswith(".ts"):
            continue
        rel = "test/" + name
        with open(os.path.join(test_dir, name), encoding="utf-8") as fh:
            body = fh.read()
        if "fake-indexeddb" in body:
            continue
        value_import = False
        for m in re.finditer(r"^import\s+(type\s+)?.*?from\s+'\.\./(src/[^']+)'",
                             body, re.M | re.S):
            if m.group(1):
                continue
            target = m.group(2)
            if any(target.startswith(d + "/") for d in dirs):
                value_import = True
                break
        if value_import and rel not in listed:
            out.append(
                "%s runs mutated code but is not in vitest.stryker.config.ts — "
                "its coverage is silently absent from the 100%% gate, which is "
                "how src/core/foods.ts once scored 0.00%% with a green suite"
                % rel)
    return out


def check_file_listing(plan):
    """13. §20.5's file listing against the actual directory, both directions.

    It has rotted twice: it named `BACKLOG-REVIEW.md` after deletion, and said
    `v2..v16` while v17 existed [R1]. A listing maintained by memory rots on
    exactly the edits that change it.

    Superseded snapshots are collapsed to a `PLAN-vA..vB-superseded.md` range in
    the listing, so they are checked as a RANGE rather than name by name.
    """
    out = []
    m = re.search(r"### 20\.5 Files\s*\n+```\n(.*?)```", plan, re.S)
    if not m:
        out.append("§20.5's file listing block is gone — nothing to check against")
        return out
    block = m.group(1)
    listed = set(re.findall(r"^\s{2}([A-Za-z0-9_.\-/]+\.(?:md|py|html))", block, re.M))
    # v20 used os.listdir(HERE) filtered to .md/.py, so nothing below the root
    # could ever be reported as unlisted — `design/notes.md` was invisible to the
    # very check whose charter says "both directions" [R1]. Walk, do not listdir.
    actual = set(_discovered_files())
    for dirpath, dirnames, filenames in os.walk(HERE):
        dirnames[:] = [d for d in dirnames
                       if not d.startswith(".") and d != "__pycache__"]
        for n in filenames:
            rel = os.path.relpath(os.path.join(dirpath, n), HERE).replace(os.sep, "/")
            if SNAPSHOT_RE.match(rel):
                actual.add(rel)          # listed as a RANGE, checked below

    snap = re.compile(r"^PLAN-v\d+-superseded\.md$")
    rng = re.search(r"PLAN-v(\d+)\.\.v(\d+)-superseded\.md", block)
    lo, hi = (int(rng.group(1)), int(rng.group(2))) if rng else (None, None)

    for name in sorted(actual - listed):
        if snap.match(name):
            v = int(re.search(r"v(\d+)", name).group(1))
            if lo is not None and lo <= v <= hi:
                continue
            out.append("§20.5: %s exists but falls outside the listed range "
                       "PLAN-v%s..v%s-superseded.md" % (name, lo, hi))
            continue
        out.append("§20.5: %s exists in the directory and is NOT listed" % name)

    for name in sorted(listed - actual):
        if ".." in name:
            continue
        out.append("§20.5: %s is listed but does NOT exist" % name)
    return out


def check_next_steps(plan):
    """14. NEXT-STEPS.md has come back.

    It was deleted in v20 (§20.5). While it existed it was excluded from the
    all-files sweep, which made it a total blind spot: [R1] seeded a canonical
    drift and a resurrected `usualDose` into it and both passed clean, while
    load_all's docstring claimed this check enforced its ephemerality. Its two
    unique items now live in §20.5 and §18.14.

    If the file returns it is an unswept input again, so its mere existence is the
    finding — recreate it only by adding it to live_files() and the dispatch hash
    set at the same time.
    """
    path = os.path.join(HERE, "NEXT-STEPS.md")
    if not os.path.exists(path):
        return []
    return ["NEXT-STEPS.md exists again. It was deleted in v20 (§20.5) because a "
            "file whose charter is to be temporary accumulates stale spec. Since "
            "v21 it WOULD be swept — discovery is by suffix — so the risk is no "
            "longer invisibility but drift: it must then be in the dispatch hash "
            "set too, and §20.5 must list it. Delete it, or add it to both."]


def check_insulin_timing(corpus):
    """29. §8.5's per-class clocks, in the code, in §11.8 and in §8.1's table.

    The awkward part of entry 26, flagged in BACKLOG.md before the build:
    "there stops being 'the' value for the checker to assert, so the check has
    to move from a constant to a per-class table."

    The three single-value constants became ALIASES onto the regular row, so
    CONSTANTS now pins the alias SPELLING and this pins the numbers. Both halves
    are load-bearing: without the alias pin a row could be re-pointed at another
    class with every literal still correct, and without this one every literal
    could move with the aliases still spelled right.

    Three places have to agree, because all three are read by somebody:
      * `src/config.ts`, which is what compiles;
      * §11.8's block, which is what a reader of the plan believes;
      * §8.1's class table, which is the clinical statement of the same numbers
        and the one a prescriber would be handed.
    """
    out = []
    plan = corpus.get("PLAN.md", "")
    config_src = corpus.get("src/config.ts", "")
    if not config_src:
        try:
            config_src = load(os.path.join(HERE, "src", "config.ts"))
        except (IOError, OSError):
            config_src = ""

    row = re.compile(
        r"^\s*(\w+):\s*\{\s*eatDelayMinutes:\s*(\[[^\]]*\]),\s*"
        r"stackSuppressHours:\s*(\d+),\s*stackAdviseHours:\s*(\d+)\s*\}",
        re.M)

    for label, text in (("src/config.ts", config_src), ("PLAN.md", plan)):
        if not text:
            continue
        found = {}
        for m in row.finditer(text):
            found[m.group(1)] = (
                re.sub(r"\s+", " ", m.group(2)).replace("[ ", "[").replace(" ]", "]"),
                m.group(3), m.group(4),
            )
        for name in sorted(set(INSULIN_TIMINGS) - set(found)):
            out.append("%s: INSULIN_TIMING has no `%s` row; check-plan.py declares "
                       "one" % (label, name))
        for name in sorted(set(found) - set(INSULIN_TIMINGS)):
            out.append("%s: INSULIN_TIMING declares a `%s` row that check-plan.py "
                       "does not pin — an unpinned clinical clock is what §8.5 "
                       "existed to remove" % (label, name))
        for name in sorted(set(found) & set(INSULIN_TIMINGS)):
            want, got = INSULIN_TIMINGS[name], found[name]
            if got != want:
                out.append("%s: INSULIN_TIMING.%s is (%s, %s, %s); check-plan.py "
                           "declares (%s, %s, %s) — if the change is intended, "
                           "change both in one edit"
                           % (label, name, got[0], got[1], got[2],
                              want[0], want[1], want[2]))

    # THE ALIASES, IN THE SHIPPING FILE.
    #
    # `check_constants` reads its declarations out of PLAN.md, so re-pointing
    # `EAT_DELAY_MINUTES` at the rapid row in `src/config.ts` alone passed every
    # check while the document still said `regular` — caught by the seeded
    # mutation below rather than by reading this file, which is the only way a
    # hole in a checker has ever shown up here.
    #
    # It is not a hypothetical spelling error either. These three aliases are
    # what `CLINICAL.md` section 4's Humulin R prose and §8.1's own worked
    # example are written about; pointed at another class they would silently
    # restate somebody else's insulin as the reference one.
    for name in ("EAT_DELAY_MINUTES", "STACK_SUPPRESS_HOURS", "STACK_ADVISE_HOURS"):
        want = CONSTANTS.get(name, "")
        if not want.startswith("INSULIN_TIMING."):
            continue
        m = re.search(r"^export const %s = (.+?);" % re.escape(name), config_src, re.M)
        if not m:
            out.append("src/config.ts does not export %s; §11.8 declares it as "
                       "`%s`" % (name, want))
        elif m.group(1).strip() != want:
            out.append("src/config.ts:%d: %s is `%s`; §11.8 declares `%s` — an "
                       "alias pointed at another class restates a different "
                       "insulin's clock as the reference one"
                       % (line_of(config_src, m.start()), name,
                          m.group(1).strip(), want))

    # §7.3's delete window, IN THE SHIPPING FILE. `check_constants` reads its
    # declarations out of PLAN.md, so re-pointing this at one class's window in
    # `src/config.ts` alone would pass — the same hole the three timing aliases
    # had, found there by a seeded mutation and closed here before it could be.
    #
    # The property rather than the spelling: a tombstone must outlive anything
    # the gate could still be reasoning about, so this has to be a maximum over
    # the whole table and never a single row.
    if config_src:
        if not re.search(
                r"export const LONGEST_ADVISE_HOURS = Math\.max\(\s*"
                r"\.\.\.Object\.values\(INSULIN_TIMING\)\.map\(", config_src):
            out.append("src/config.ts: LONGEST_ADVISE_HOURS is not a maximum over "
                       "INSULIN_TIMING — §7.3's delete window must outlive every "
                       "class's advise window, not track one of them")
        if not re.search(
                r"export const DELETE_CONFIRM_WINDOW_HOURS = LONGEST_ADVISE_HOURS;",
                config_src):
            out.append("src/config.ts: DELETE_CONFIRM_WINDOW_HOURS is not "
                       "LONGEST_ADVISE_HOURS — §7.3's window would then change "
                       "with whichever insulin the reader last selected")

    # The class table, which states the same waits in words. BOTH documents
    # carry one — §8.1 in the plan, section 4.1 in CLINICAL.md — and only the
    # plan's was pinned until a seeded mutation walked straight through the
    # other. The prose sweep could not see it either: its context window is 90
    # characters, and CLINICAL.md's source column pushes every trigger word
    # ("inject", "eat", "meal") out of reach of the number. A row whose own
    # citation makes it invisible to the general check is exactly what a
    # targeted pin is for.
    #
    # The ultra-rapid row deliberately carries no number in either document,
    # because [0, 0] is an instruction and not a duration.
    tables = {
        "PLAN.md": ("§8.1", plan, {
            "regular": "Regular human insulin",
            "rapid": "Rapid analogue",
            "ultra_rapid": "Ultra-rapid analogue",
        }),
        "CLINICAL.md": ("section 4.1", corpus.get("CLINICAL.md", ""), {
            "regular": "Regular human insulin",
            "rapid": "Rapid analogue (aspart, lispro, glulisine)",
            "ultra_rapid": "Ultra-rapid analogue (faster aspart, lispro-aabc)",
        }),
    }
    for rel, (section, text, labels) in sorted(tables.items()):
        if not text:
            continue
        for name, label in sorted(labels.items()):
            pattern = r"^\|\s*%s\s*\|\s*([^|]+?)\s*\|" % re.escape(label)
            m = re.search(pattern, text, re.M)
            if not m:
                out.append("%s: %s's class table has no `%s` row; §11.8 declares "
                           "a `%s` clock and a table that omits one is how a "
                           "class ships with nobody having read its number"
                           % (rel, section, label, name))
                continue
            stated = m.group(1).replace("\u2013", "-").replace("&ndash;", "-")
            lo, hi = re.findall(r"\d+", INSULIN_TIMINGS[name][0])
            if lo == hi == "0":
                if re.search(r"\d", stated):
                    out.append("%s: %s states a NUMERIC wait for %s; §11.8 "
                               "declares [0, 0], which is \"at the start of the "
                               "meal\" and not a duration" % (rel, section, label))
                continue
            got = re.findall(r"\d+", stated)
            if got[:2] != [lo, hi]:
                out.append("%s:%d: %s states the %s wait as %s; §11.8 declares "
                           "[%s, %s]" % (rel, line_of(text, m.start()), section,
                                         label, stated, lo, hi))
    return out


def check_persisted_names(corpus):
    """31. A persisted name is renameable ONLY while nobody holds data.

    2026-09-21 renamed the stored rows, the export format and §5.1's
    acknowledgement key. Momin's ruling, twice: he is the only person who has
    ever run this app, so a name people can read is worth more than
    compatibility with rows that do not exist. The reads accepted the old
    spellings for one day and were deleted the same day, with every other
    older-version accommodation — he clears his own database through "start
    over" rather than being migrated.

    What survives is the thing that made the rename DANGEROUS, and it is not
    about any particular name: THE EXPORTED SETTINGS BLOCK MUST BE ITS OWN TYPE
    rather than an `Omit<>` of a live one. It used to be the latter, which is
    how the rename reached the FILE FORMAT before anybody had decided it
    should — a serialisation format derived from a domain type moves when the
    type moves, silently, and a file is the one artefact here that outlives the
    build that wrote it.
    """
    out = []
    try:
        schema = load(os.path.join(HERE, "src", "storage", "schema.ts"))
        envelope = load(os.path.join(HERE, "src", "storage", "envelope.ts"))
    except (IOError, OSError):
        return out

    for name in ("SettingsRow", "SettingsHistoryRow"):
        block = re.search(r"export interface %s \{(.*?)\n\}" % name, schema, re.S)
        if not block:
            out.append("src/storage/schema.ts: could not find %s — the parser "
                       "needs updating (maintenance obligation)" % name)
            continue
        if not re.search(r"^\s*readonly roundingMode\s*:", block.group(1), re.M):
            out.append("src/storage/schema.ts: %s does not declare "
                       "`roundingMode`; §5's rounding mode has to be stored "
                       "somewhere" % name)

    if re.search(r"readonly settings:\s*Omit<Settings", envelope):
        out.append("src/storage/envelope.ts: the exported settings block is an "
                   "`Omit<>` of the live `Settings` type, so renaming a domain "
                   "field silently changes the FILE FORMAT — which is how the "
                   "2026-09-21 rename reached it before anybody decided it "
                   "should. Declare it separately")
    return out


# The store structure this build is expected to write, pinned here so the pin
# and the code have to be changed in ONE edit. `open.ts`'s STORE_SCHEMA is the
# authority; this is the second reader that makes a silent change loud.
EXPECTED_STORES = {
    "meta": ("key", []),
    "settings": ("key", []),
    "acks": ("key", []),
    "log": ("id", ["by_timestamp"]),
    "readings": ("id", ["by_timestamp"]),
    "settingsHistory": ("revision", []),
}
# The IndexedDB version that structure belongs to. Bumping the structure without
# bumping this is the defect below, so they are pinned together.
EXPECTED_STRUCTURE_VERSION = 2


def check_store_schema_pinned(corpus):
    """36. A store's SHAPE changed without the version that ships the change —
    ADDED 2026-09-21, from a defect that reached every install that existed.

    `#63` renamed the keyPath of `meta`, `settings` and `acks` from `k` to
    `key`. That edit lives inside `onupgradeneeded`, which runs only when the
    IndexedDB version INCREASES — and the version was an alias of
    `SCHEMA_VERSION`, which had been 1 since the first commit and which nobody
    thought to move, because no ROW had changed shape. So the rename reached
    databases created afterwards and no others. Every existing install kept
    three stores keyed on `k`, every write sent an object keyed `key`, and
    IndexedDB answered `DataError: Evaluating the object store's key path did
    not yield a value`. The disclaimer acknowledgement and the settings commit
    both failed. The screen said nothing.

    **Neither the suite nor the smoke run could see it**: every vitest case gets
    a fresh `fake-indexeddb` and every smoke session wipes its profile on
    purpose, so nothing here had ever opened a database written by a previous
    build. `tools/smoke.mjs` now does, and this check is the other half — the
    one that fires at the edit rather than at the symptom.

    The pin is the whole mechanism. Changing a keyPath, adding an index or
    adding a store means changing `EXPECTED_STORES` too, and the message says
    what else has to move with it. A check that read only `open.ts` would agree
    with whatever `open.ts` said, which is the "certifies nothing" failure §20.3
    exists to end.
    """
    out = []
    try:
        source = load(os.path.join(HERE, "src", "storage", "open.ts"))
        config = load(os.path.join(HERE, "src", "config.ts"))
    except (IOError, OSError):
        return ["src/storage/open.ts or src/config.ts is missing, so the store"
                " structure cannot be verified"]

    # Read the createObjectStore CALLS, because after 2026-09-21 there is no
    # declaration to read: the schema-as-data engine was deleted when two
    # reviews independently found that its "any mismatch, rebuild the store"
    # rule would answer a future added index by deleting the log. The code is
    # the authority now, which is the stronger arrangement anyway.
    calls = re.findall(
        r"createObjectStore\(\s*STORE\.(\w+)\s*,\s*\{\s*keyPath:\s*'([^']+)'\s*\}\s*\)",
        source)
    if not calls:
        return ["src/storage/open.ts: no createObjectStore calls found — check 36's"
                " parser needs updating (maintenance obligation)"]

    actual = {}
    for name, key_path in calls:
        actual[name] = (key_path, [])
    # Indexes are created on the store handle rather than in the same call, so
    # they are read separately and resolved through the constant they name.
    for name, index_const in re.findall(r"(\w+)\.createIndex\((\w+),", source):
        owner = re.search(
            r"const %s = db\.createObjectStore\(\s*STORE\.(\w+)" % re.escape(name), source)
        if owner is None or owner.group(1) not in actual:
            out.append("src/storage/open.ts: createIndex on `%s`, whose store check 36"
                       " cannot resolve — an index it cannot see is one it cannot"
                       " pin" % name)
            continue
        resolved = re.search(r"export const %s = '([^']+)'" % re.escape(index_const),
                             load(os.path.join(HERE, "src", "storage", "schema.ts")))
        actual[owner.group(1)][1].append(resolved.group(1) if resolved else index_const)

    # §20.3's third rule: a check that resolves its own inputs says how many it
    # resolved. Silence here would look identical to a clean run.
    if len(actual) != len(EXPECTED_STORES):
        out.append("check 36 read %d stores from src/storage/open.ts and the pin"
                   " names %d — one of them is wrong, and a count that does not"
                   " match is the finding" % (len(actual), len(EXPECTED_STORES)))

    for name in sorted(set(EXPECTED_STORES) - set(actual)):
        out.append("check-plan.py pins store `%s` and src/storage/open.ts no longer"
                   " creates it — if the store was removed, drop it from the pin and"
                   " bump STRUCTURE_VERSION in src/config.ts in the same edit" % name)
    for name in sorted(set(actual) - set(EXPECTED_STORES)):
        out.append("src/storage/open.ts creates store `%s` and check-plan.py does not"
                   " pin it — add it to EXPECTED_STORES and bump STRUCTURE_VERSION in"
                   " src/config.ts in the same edit" % name)
    for name in sorted(set(actual) & set(EXPECTED_STORES)):
        if actual[name] != EXPECTED_STORES[name]:
            out.append("store `%s` is %r in src/storage/open.ts and %r in"
                       " check-plan.py's pin. A STORE's shape changed, so"
                       " STRUCTURE_VERSION in src/config.ts must move with it and"
                       " `upgradeFrom` needs a step saying what happens to the rows"
                       " — an upgrade that never fires reaches no install that"
                       " already exists, which is exactly how #63 shipped"
                       % (name, actual[name], EXPECTED_STORES[name]))

    version = re.search(r"export const STRUCTURE_VERSION = (\d+);", config)
    if version is None:
        out.append("src/config.ts no longer exports STRUCTURE_VERSION; the"
                   " IndexedDB version is what makes a structural change reach"
                   " an install that already exists")
    elif int(version.group(1)) != EXPECTED_STRUCTURE_VERSION:
        out.append("src/config.ts's STRUCTURE_VERSION is %s and check-plan.py"
                   " expects %d — if the bump is intended, change both in one"
                   " edit, and check that EXPECTED_STORES describes what the"
                   " bump actually ships"
                   % (version.group(1), EXPECTED_STRUCTURE_VERSION))
    return out


def check_soft_bands_against_config(corpus):
    """35. `SOFT_RANGES` must name exactly the fields `config.ts` gives a soft band.

    The §4.5 and §11.8 soft-band checks both fire only on a band a DOCUMENT
    states. That makes them silent in the one direction that matters here: take
    the band out of `config.ts`, take the sentence out of `PLAN.md`, and a stale
    row in `SOFT_RANGES` sits there declaring a confirm-once band for a field
    that has none, with nothing to compare it against.

    That is what happened to `injected`. Its soft band was struck from
    `config.ts` on 2026-09-11; `PLAN.md` kept saying the band "remains in
    `config.ts` with no consumer" and `SOFT_RANGES` kept declaring `[0.5, 60]`
    until 2026-09-21, and the checker passed clean throughout.

    So this reads the file rather than the prose. `config.ts` is the authority
    on which fields have a confirm-once band and what it is; a disagreement
    either way is a finding, because a band declared here and absent there is
    exactly as wrong as the reverse.
    """
    out = []
    try:
        config = load(os.path.join(HERE, "src", "config.ts"))
    except (IOError, OSError):
        return out

    block = re.search(r"export const RANGE = \{(.*?)\n\} as const;", config, re.S)
    if not block:
        return ["src/config.ts: could not find `export const RANGE` — check 35's "
                "parser needs updating (maintenance obligation)"]

    actual = {}
    for m in re.finditer(r"^\s*(\w+):\s*\{[^}]*?soft:\s*\[([^\]]+)\]",
                         block.group(1), re.M | re.S):
        actual[m.group(1)] = "[%s]" % re.sub(r"\s+", " ", m.group(2)).strip()

    for name in sorted(set(SOFT_RANGES) - set(actual)):
        out.append("check-plan.py's SOFT_RANGES declares a confirm-once band for "
                   "`%s` (%s) but src/config.ts gives it none — §4.5's band was "
                   "struck in code and the declaration outlived it"
                   % (name, SOFT_RANGES[name]))
    for name in sorted(set(actual) - set(SOFT_RANGES)):
        out.append("src/config.ts gives `%s` a confirm-once band of %s and "
                   "check-plan.py's SOFT_RANGES does not declare it — an "
                   "unpinned gate is one §4.5 can drift on silently"
                   % (name, actual[name]))
    for name in sorted(set(actual) & set(SOFT_RANGES)):
        if actual[name] != SOFT_RANGES[name]:
            out.append("src/config.ts's soft band for `%s` is %s; check-plan.py "
                       "declares %s — if the change is intended, change both in "
                       "one edit" % (name, actual[name], SOFT_RANGES[name]))
    return out


# Targets check 34 knowingly cannot resolve, each of which must earn its place.
# EMPTY IS THE CORRECT STATE. A name here is a site the check is blind to, so it
# is a debt rather than a configuration — see §20.3's third rule.
OMIT_UNRESOLVED_OK = set()


def check_omit_targets(corpus):
    """34. `Omit<T, 'field'>` naming a field that is not a key of `T`.

    TypeScript does not require it to be one. The lib signature is
    `Omit<T, K extends keyof any>`, so an `Omit` left pointing at a renamed
    field keeps compiling and quietly omits NOTHING.

    Both instances were made by the 2026-09-21 rename and found the same day,
    and neither failed anywhere:

      * `StoredEnvelope` held `Omit<SettingsRow, 'k'>` after the row's key
        became `key`. Dead code, so the hole was inert — but it is the same
        trap check 31 exists to keep out of the file format.
      * `bumpLogRevision` took `Partial<Omit<LogRevisionRow, 'k' | 'n'>>`,
        which stopped forbidding a patch from rewriting the PRIMARY KEY. Only
        the `put` re-setting `key` after the spread kept that harmless.

    An `Omit` whose target this parser cannot resolve is REPORTED, not skipped.
    Silently skipping is how the check came to be blind to a third of its own
    input while reporting clean; §20.3's third rule is the general form of that
    lesson. A target that genuinely cannot be resolved goes in
    OMIT_UNRESOLVED_OK, where it is visible as a debt.
    """
    out = []
    sources = {}
    for dirpath, dirnames, filenames in os.walk(os.path.join(HERE, "src")):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for name in sorted(filenames):
            if not name.endswith(SOURCE_SUFFIXES):
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, HERE).replace(os.sep, "/")
            try:
                sources[rel] = load(full)
            except (IOError, OSError):
                continue

    # `interface X extends Y {` as well as `interface X {`. Without the
    # `extends` clause `Settings` did not resolve at all, which is a THIRD of
    # this check's targets skipped silently — and an inherited field must count
    # as a field, or omitting one would be reported as a mistake.
    own, parents = {}, {}
    decl = re.compile(r"interface (\w+)(?:\s+extends\s+([^{]+?))?\s*\{(.*?)\n\}", re.S)
    for rel, text in sources.items():
        for m in decl.finditer(text):
            own[m.group(1)] = set(
                re.findall(r"^\s*readonly (\w+)\??\s*:", m.group(3), re.M))
            parents[m.group(1)] = [part.strip()
                                   for part in (m.group(2) or "").split(",")
                                   if part.strip()]

    def fields_of(name, seen=None):
        """Every field, inherited ones included, or None if it cannot be resolved.

        None rather than a partial set: an incomplete field list turns a correct
        `Omit` of an inherited field into a false report, and this check is only
        worth having if a finding is always a defect.
        """
        seen = set() if seen is None else seen
        if name in seen or name not in own:
            return None
        seen.add(name)
        total = set(own[name])
        for parent in parents[name]:
            inherited = fields_of(parent, seen)
            if inherited is None:
                return None
            total |= inherited
        return total

    for rel in sorted(sources):
        text = sources[rel]
        for m in re.finditer(r"Omit<\s*(\w+)\s*,([^>]*)>", text):
            target, keys = m.group(1), m.group(2)
            known = fields_of(target)
            if known is None:
                # §20.3's third rule. Skipping silently is what let this check
                # sit blind to `Settings` — `interface Settings extends
                # DosingSettings` did not match the parser, so a THIRD of the
                # `Omit<>` in this repository were invisible and the check said
                # clean. An unresolvable target is now a finding: either teach
                # the parser, or declare it in OMIT_UNRESOLVED_OK with a reason.
                if target not in OMIT_UNRESOLVED_OK:
                    out.append("%s:%d: `Omit<%s, ...>` — this check CANNOT "
                               "resolve `%s`, so it is not checking this site "
                               "at all. Teach the parser, or declare it in "
                               "OMIT_UNRESOLVED_OK"
                               % (rel, text[:m.start()].count("\n") + 1,
                                  target, target))
                continue
            for key in re.findall(r"['\"](\w+)['\"]", keys):
                if key not in known:
                    out.append("%s:%d: `Omit<%s, '%s'>` — `%s` is not a field "
                               "of `%s`, so this omits NOTHING and TypeScript "
                               "does not object. Either the field was renamed "
                               "and this was left behind, or the name is a typo"
                               % (rel, text[:m.start()].count("\n") + 1,
                                  target, key, key, target))
    return out


def check_generated_manifest(corpus):
    """32. The manifest and robots.txt are GENERATED from `BASE`, not hand-written.

    `T15`: the deployed path was stated eighteen times and guarded three. The
    manifest held three of them — `id`, `start_url` and `scope` — in `public/`,
    which the build copies verbatim, so nothing rewrote them and nothing
    compared them to anything.

    **A wrong `scope` orphans an app somebody has already installed.** The icon
    on their home screen stops matching the site it came from, the install
    quietly stops being the install, and nothing says so: it survives a green
    build, a passing suite and a successful deploy. That is why this one moved
    first rather than riding along with the rest of T15.

    Three things, because each fails differently:
      * the hand-written file must NOT come back to `public/`, where nothing
        would rewrite it;
      * the three base-carrying fields must read `BASE` rather than a literal;
      * the icon paths must stay RELATIVE — a manifest resolves them against
        its own URL, so writing the base into them would be three more copies
        to keep in step, which is the defect rather than the fix.
    """
    out = []
    if os.path.exists(os.path.join(HERE, "public", "manifest.webmanifest")):
        out.append("public/manifest.webmanifest is back. `public/` is copied "
                   "verbatim, so every deployed path in it is unguarded — T15's "
                   "whole point. Generate it from BASE in vite.config.ts")
    try:
        config = load(os.path.join(HERE, "vite.config.ts"))
    except (IOError, OSError):
        return out

    block = re.search(r"const manifest = \{(.*?)\n      \};", config, re.S)
    if not block:
        out.append("vite.config.ts: no generated `manifest` object — T15 moved "
                   "the web manifest out of public/ so its deployed paths come "
                   "from BASE; without it they are unguarded again")
        return out
    body = block.group(1)
    for field in ("id", "start_url", "scope"):
        stated = re.search(r"^\s*%s: (.+?),$" % re.escape(field), body, re.M)
        if not stated:
            out.append("vite.config.ts: the generated manifest has no `%s`; a "
                       "manifest without one is not an installable app" % field)
        elif stated.group(1).strip() != "BASE":
            out.append("vite.config.ts: the manifest's `%s` is %s rather than "
                       "BASE — a literal here is a deployed path nothing "
                       "rewrites, and a wrong `scope` orphans an existing "
                       "install silently" % (field, stated.group(1).strip()))
    icons = re.search(r"icons: \[(.*?)\n        \]", body, re.S)
    if icons and "BASE" in icons.group(1):
        out.append("vite.config.ts: an icon path carries BASE. Manifest icon "
                   "paths resolve against the manifest's own URL, so they are "
                   "already correct relative — adding the base makes three more "
                   "copies to keep in step")

    # `robots.txt` went the same way, and its one address is a `Sitemap:` line.
    # The failure is quieter than the manifest's — a stale URL is a 404 that a
    # crawler reports to nobody — but it is the same unguarded copy.
    if os.path.exists(os.path.join(HERE, "public", "robots.txt")):
        out.append("public/robots.txt is back. Its `Sitemap:` line is a "
                   "deployed address, and `public/` is copied verbatim — T15 "
                   "moved it so the address comes from SITE_URL and BASE")
    if not re.search(r"Sitemap: \$\{SITE_URL\}\$\{BASE\}sitemap\.xml", config):
        out.append("vite.config.ts: the generated robots.txt no longer builds "
                   "its `Sitemap:` line from SITE_URL and BASE — a literal "
                   "there is an address that survives a domain move by being "
                   "silently wrong")
    return out


def check_period_comparison(corpus):
    """30. §7.7's no-change rule covers every field `settingsHistory` declares.

    `BACKLOG` T18's fix decides whether a settings commit starts a new
    prescription period by comparing the proposed history row against the
    previous one. The obvious way to write that is a hand-kept list of field
    names, and it rots in the UNSAFE direction: the day a field joins
    `SettingsHistoryRow` and nobody adds it to the list, a real prescription
    change stops starting a new period and §7.7.1's export attributes doses to
    settings that did not produce them. Silently, and with no test to notice,
    because the tests were written against the fields that existed then.

    `sameProvenance` therefore builds the row and walks its OWN KEYS, so the
    type is the list. This asserts that it still does — the property, not the
    spelling — and that every declared field is either compared or named as
    provenance, with nothing in between.
    """
    out = []
    try:
        repo = load(os.path.join(HERE, "src", "storage", "repo.ts"))
        schema = load(os.path.join(HERE, "src", "storage", "schema.ts"))
    except (IOError, OSError):
        return out

    block = re.search(r"export interface SettingsHistoryRow \{(.*?)\n\}", schema, re.S)
    if not block:
        out.append("src/storage/schema.ts: could not find SettingsHistoryRow — the "
                   "parser needs updating (maintenance obligation)")
        return out
    declared = set(re.findall(r"^\s*readonly\s+(\w+)\s*:", block.group(1), re.M))

    built = re.search(r"const proposed: SettingsHistoryRow = \{(.*?)\n  \};", repo, re.S)
    if not built:
        out.append("src/storage/repo.ts: `sameProvenance` no longer builds a whole "
                   "SettingsHistoryRow — §7.7's no-change rule must compare every "
                   "field the store declares, and a partial literal silently stops "
                   "covering the ones it omits")
        return out
    compared = set(re.findall(r"^\s*(\w+):", built.group(1), re.M))

    provenance = re.search(r"PERIOD_PROVENANCE: readonly \(keyof SettingsHistoryRow\)\[\] = \[([^\]]*)\]",
                           repo)
    excluded = set(re.findall(r"'(\w+)'", provenance.group(1))) if provenance else set()

    for name in sorted(declared - compared):
        out.append("src/storage/repo.ts: `sameProvenance` does not carry `%s`, which "
                   "SettingsHistoryRow declares — a change to it would not start a "
                   "new prescription period and §7.7.1 would attribute doses to "
                   "settings that did not produce them" % name)
    for name in sorted(compared - declared):
        out.append("src/storage/repo.ts: `sameProvenance` carries `%s`, which "
                   "SettingsHistoryRow does not declare" % name)
    for name in sorted(excluded - declared):
        out.append("src/storage/repo.ts: PERIOD_PROVENANCE names `%s`, which "
                   "SettingsHistoryRow does not declare — the exclusion outlived "
                   "the field" % name)
    # The walk must read the object's keys rather than a written-out list.
    if not re.search(r"Object\.keys\(proposed\)", repo):
        out.append("src/storage/repo.ts: `sameProvenance` no longer walks "
                   "`Object.keys(proposed)` — a hand-written field list is what "
                   "T18's fix was shaped to avoid, because it rots toward "
                   "attributing doses to the wrong prescription")
    return out


CHECKS = [
    ("retired phrases living as spec (ALL FILES)", check_retired, "corpus"),
    ("retired phrases living in src/**/*.ts", check_retired_in_source, "plan"),
    ("user-facing text outside src/ui/copy.ts", check_ui_text_outside_copy, "plan"),
    ("unclassified public/ asset", check_public_assets_classified, "plan"),
    ("deployed address disagrees between index.html and vite.config.ts", check_site_url_agrees, "plan"),
    ("service worker answers the app for a non-app file", check_worker_knows_non_app_files, "plan"),
    ("T3's structural-query count vs the test file", check_structural_query_count, "plan"),
    ("dangling section references", check_references, "plan"),
    ("dangling section references in companions", check_references_corpus, "corpus"),
    ("dangling build-note references", check_note_references, "corpus"),
    ("README's mutation figures vs the report", check_readme_mutation_figures, "corpus"),
    ("unverifiable removal claims", check_removal_claims, "plan"),
    ("schema field with no snapshot home", check_schema_snapshot, "plan"),
    ("near-miss identifiers", check_near_miss, "plan"),
    ("numbers contradicting canonical values", check_canonical, "corpus"),
    ("required rules deleted outright", check_required, "plan"),
    ("§11.8 constants and ranges", check_constants, "corpus"),
    ("§8.5's per-class clocks", check_insulin_timing, "corpus"),
    ("§7.7's no-change comparison vs the store", check_period_comparison, "corpus"),
    ("persisted names vs the domain rename", check_persisted_names, "corpus"),
    ("Omit<> naming a field that is not a key", check_omit_targets, "corpus"),
    ("soft bands declared vs src/config.ts", check_soft_bands_against_config, "corpus"),
    ("store structure vs its IndexedDB version", check_store_schema_pinned, "corpus"),
    ("the web manifest is generated from BASE", check_generated_manifest, "corpus"),
    ("BACKLOG stale against PLAN", check_cross_document, "backlog"),
    ("BLOG-FIX names the app path", check_blogfix, "blogfix"),
    ("checker describing retired things", check_tool_rot, "plan"),
    ("unbalanced bold markers", check_bold_balance, "plan"),
    ("PLAN references BACKLOG by number", check_plan_against_backlog, "plan"),
    ("config values typed as digits in copy", check_copy_hardcodes_config, "plan"),
    ("§11.8's reference-data exemption", check_reference_data, "plan"),
    ("BACKLOG 24: a route colliding with a file", check_routes_do_not_collide, "plan"),
    ("BACKLOG 24: the app's default title vs index.html", check_route_titles_agree, "plan"),
    ("404.html's links vs BASE", check_404_paths_agree, "plan"),
    ("§10.4: a number joined to its unit by a plain space", check_number_unit_nowrap, "plan"),
    ("10a: a stylesheet declaration that names a side", check_logical_properties, "plan"),
    ("10a: a number range that bidi will reverse", check_rtl_ranges_isolated, "plan"),
    ("tests missing from the mutation run", check_mutation_coverage_list, "plan"),
    ("§20.5 listing vs the directory", check_file_listing, "plan"),
    ("NEXT-STEPS.md has come back", check_next_steps, "plan"),
    ("a mockup showing an impossible dose", check_design_arithmetic, "corpus"),
    ("design version tags and screen counts", check_design_claims, "corpus"),
    ("PLAN's own worked arithmetic", check_worked_examples, "plan"),
    ("prose restating §11.8's numbers", check_prose_numbers, "corpus"),
    ("a mock history row that cannot be produced", check_mock_doses, "corpus"),
    ("a mockup's self-derived numbers", check_design_numbers, "corpus"),
    ("a package.json override upstream has made unnecessary", check_stale_overrides, "plan"),
    # LAST, and it has to be: `_INPUT_SETS` is filled in by the walks above as
    # they run, so this reads what actually happened rather than what the file
    # says should happen.
    ("a discovering walk that found nothing", check_input_sets, "plan"),
]


# --- DECLARED TABLES BEGIN ---
# Seeded mutations this checker MUST catch. Each is a real escape a reviewer found
# by executing it, or a revert of a fix a later revision is likely to make. The
# checker verifying ITSELF is the answer to this project's most persistent defect:
# five separate rounds found checks that certified nothing, and reading them never
# revealed it — running them did. Every entry here failed to be caught at some point.
#   (label, file, transform)
SELF_TESTS = [
    ("blogfix: exclusion narrowed to /MealUnits/$ [R2]", "BLOG-FIX.md",
     lambda t: t.replace(r"(?!.*\/MealUnits\/)", r"(?!.*\/MealUnits\/$)")),
    ("blogfix: leading anchor dropped [R1]", "BLOG-FIX.md",
     lambda t: t.replace("/^(?!", "/(?!")),
    ("blogfix: lookahead inverted ?! -> ?: [R1]", "BLOG-FIX.md",
     lambda t: t.replace(r"(?!.*\/MealUnits", r"(?:.*\/MealUnits")),
    ("blogfix: load-bearing {} placeholder deleted [R1]", "BLOG-FIX.md",
     lambda t: t.replace("        {},", "", 1)),
    # Was DEFAULT_THRESHOLD until 2026-09-13, when the audience change deleted
    # that constant and this seeded mutation kept pointing at it — so it stopped
    # proving anything and the self-test reported the escape. Re-aimed at a
    # constant that exists, and deliberately at one of the NEW ones, so the drift
    # check is proven over the pins added in the same commit.
    ("canonical: threshold drift seeded in BACKLOG.md [R2]", "BACKLOG.md",
     lambda t: t + "\n\nTHRESHOLD_MEAL_GRAMS = 25;\n"),
    # §20.3 — the check added in the same commit arrives with its own mutation.
    # This is the ORIGINAL defect, replayed: T3 asserted "0 assertions on DOM
    # structure" and used that zero to argue the integration suite is a safe net
    # for the Preact port. There were ten. The number did not start wrong, it
    # drifted when 62bf677 added a tenth and nobody recounted.
    # T3's three arms of check 1c, 2026-09-14. Each seeds the form of
    # user-facing text the port introduced, into a file the checker discovers by
    # walking rather than by being told — so a NEW screen is covered by the same
    # three without anyone adding a fourth seed.
    # §20.3 — check 36 arrives with the defect it was written for, replayed
    # exactly. #63 renamed three keyPaths inside a callback that only fires when
    # the version moves, and the version did not move.
    ("a store's keyPath changed with no STRUCTURE_VERSION bump",
     "src/storage/open.ts",
     lambda t: t.replace("db.createObjectStore(STORE.acks, { keyPath: 'key' })",
                         "db.createObjectStore(STORE.acks, { keyPath: 'k' })")),
    # The other direction: the version rolled back while the structure stayed.
    ("STRUCTURE_VERSION rolled back under an unchanged structure",
     "src/config.ts",
     lambda t: t.replace("export const STRUCTURE_VERSION = 2;",
                         "export const STRUCTURE_VERSION = 1;")),
    # A store dropped from creation. Nothing would make it, and nothing would
    # ask why it was missing.
    ("a store dropped from createStores", "src/storage/open.ts",
     lambda t: t.replace(
         "    db.createObjectStore(STORE.settingsHistory, { keyPath: 'revision' });\n", "")),
    # An index quietly dropped. The store still opens; §7.7's timestamp reads
    # lose the index they were written for.
    ("a timestamp index dropped from createStores", "src/storage/open.ts",
     lambda t: t.replace("    readings.createIndex(TIMESTAMP_INDEX, 'timestamp');\n", "")),
    ("a sentence rendered as a bare JSX text node", "src/ui/screens/misc.tsx",
     lambda t: t.replace("<h1>{COPY.screens.exportTitle}</h1>",
                         "<h1>Save a copy of your record</h1>")),
    ("a sentence rendered in a JSX double-quoted attribute",
     "src/ui/screens/settings.tsx",
     lambda t: t.replace('aria-describedby={`label-${id}`}',
                         'aria-label="how far one unit lowers you"')),
    ("a user-facing string inlined in a .tsx, which .ts-only filters miss",
     "src/ui/screens/foods.tsx",
     lambda t: t.replace("{COPY.foods.searchHint}", "{'Type any part of a name'}")),
    # The four forms Fable's review found the first version blind to, 2026-09-14.
    # Seeded rather than demonstrated once, because the arms they cover are the
    # kind whose healthy output is silence.
    ("a sentence as a MULTI-LINE JSX text child, the shape most of this tree uses",
     "src/ui/screens/misc.tsx",
     lambda t: t.replace(
         '<Button class="go" onPress={handlers.onMove}>{COPY.exports.makeBackup}</Button>',
         '<Button class="go" onPress={handlers.onMove}>\n            Make a backup copy\n          </Button>')),
    ("a sentence double-quoted inside an expression container",
     "src/ui/screens/misc.tsx",
     lambda t: t.replace("{COPY.screens.importTitle}", '{"Bring a record back"}')),
    ("URDU prose as a bare text node, which an [A-Za-z] word test cannot see",
     "src/ui/screens/foods.tsx",
     lambda t: t.replace("<p>{COPY.foods.intro}</p>", "<p>کھانے کی مقدار دیکھیں</p>")),
    ("a sentence in a double-quoted aria-label, which is read aloud",
     "src/ui/screens/settings.tsx",
     lambda t: t.replace('aria-describedby={`label-${id}`}',
                         'aria-label="how far one unit lowers you"')),
    # ONE WORD in an aria-label. The two-word rule let this whole shape through
    # until 2026-09-14, and `aria-label="delete"` was the live instance.
    ("a ONE-WORD aria-label, which the two-word rule used to let through",
     "src/ui/screens/settings.tsx",
     lambda t: t.replace('aria-describedby={`label-${id}`}', 'aria-label="dosage"')),
    # Re-aimed 2026-09-19: the recount moved to 15 when §12's storage section
    # gained a `.flag` query, and this seed still named 14 — so it edited nothing
    # and proved nothing. The self-test reported it, which is the whole point of
    # a seed knowing whether its anchor still exists.
    #
    # Re-aimed again 2026-09-23, to 16: phase 3's tally test reaches for
    # `.entry`. Twice now this seed has gone stale the same way, so the lesson
    # is the anchor rather than the number — a seed naming a FIGURE that another
    # check keeps current will rot every time that figure moves, and only the
    # self-test notices.
    ("T3's structural-query count reverted to the wrong 0", "BACKLOG.md",
     lambda t: t.replace("There are **17 structural", "There are **0 structural")),
    # §20.3 — the check added in the same commit arrives with its own mutation.
    # A constant exported from src/config.ts and never written into §11.8 used to
    # be invisible: absent from PLAN.md so nothing reported it, absent from
    # CONSTANTS so nothing pinned its value. That is how
    # BAND_E_FULL_CARD_WINDOW_HOURS shipped unpinned.
    # Seeded on the DOCUMENT side, which is the direction the rule actually
    # runs in: the trigger is prose starting to argue for a constant that
    # nothing pins. Seeding a new export into config.ts proves nothing, because
    # a constant no document discusses is deliberately not a finding — §11.8
    # governs decisions, not plumbing.
    # §20.3 — the pin added in the same commit arrives with its own mutation.
    # This is the exact shape the defect had: a live description claiming the
    # app is for one person, months after it stopped being.
    ("retired: 'for one person' comes back as live copy", "README.md",
     lambda t: t + "\n\nAn insulin dose calculator for one person.\n"),
    ("constants: prose argues for a config constant nothing pins", "BACKLOG.md",
     lambda t: t + "\n\nThe wizard is `WIZARD_STEPS` long.\n"),
    # And the other direction: a pin that outlived the constant it pinned, which
    # is the state this file was in when CI caught it.
    ("constants: a pin whose constant no longer exists", "src/config.ts",
     lambda t: t.replace("export const THRESHOLD_MULTIPLE", "export const THRESHOLD_MULTIPLE_RENAMED")),
    # The 2026-09-13 prune cut most of BUILD-NOTES.md's body and kept every note
    # NUMBER as a heading, because many are cited from source, tests and the other
    # documents. This is the mutation that proves the keeping is checked: note 48
    # is cited by CLAUDE.md, vite.config.ts and smoke.mjs. No line or citation
    # count is written here — the first version carried both and both were stale
    # within the hour, in the commit whose subject was removing counts that rot.
    ("notes: note 48's heading deleted by a prune", "BUILD-NOTES.md",
     lambda t: t.replace("## 48. `crypto.randomUUID`", "## Secure contexts and `crypto.randomUUID`")),
    # The first version of check_note_references matched `\bnotes? (\d+)` — case
    # sensitive, first number only. Both holes below escaped it, and note 26 was
    # cited ONLY in the capitalised form, so deleting its heading passed clean.
    ("notes: a capitalised citation of a note that does not exist", "PLAN.md",
     lambda t: t.replace("Note 26's amber", "Note 97's amber")),
    ("notes: the second number of a multi-number citation does not exist", "PLAN.md",
     lambda t: t.replace("notes 11 and 21", "notes 11 and 96")),
    ("canonical: target ceiling reverted to 300 (table)", "PLAN.md",
     lambda t: t.replace("Target blood sugar | 70–**200** mg/dL",
                         "Target blood sugar | 70–**300** mg/dL")),
    ("canonical: target ceiling reverted to 300 (§11.8)", "PLAN.md",
     lambda t: t.replace("target:     { hard: [70, 200]",
                         "target:     { hard: [70, 300]")),
    ("required: dosingHistory store row deleted [R1]", "PLAN.md",
     lambda t: t.replace('key: "dosingHistory"', 'key: "somethingElse"')),
    ("required: three states collapsed to a boolean [R1]", "PLAN.md",
     lambda t: t.replace(
         'state: "unanswered" | "declined" | "answered"', "asked: true | false")),
    ("required: noon/midnight rule reverted [R1]", "PLAN.md",
     lambda t: t.replace('**"12:00 noon"**', '**"12:00 PM"**')),
    ("required: §6.4 correction ceiling reverted to 300 [R1]", "PLAN.md",
     lambda t: t.replace("always positive given target <= 200",
                         "always positive given target <= 300")),
    ("retired: usualDose resurrected in a design file", "docs/design/screens.html",
     lambda t: t + "\n<p>Live setting: usualDose.</p>\n"),
    ("retired: phrase resurrected in this script's own comments", "check-plan.py",
     lambda t: t + "\n# Live design rule: the log cannot record it.\n"),
    ("design: band-E mock reverted to the impossible 9 units [R1]",
     "docs/design/step-flow.html",
     lambda t: t.replace('<b>10 units</b>', '<b>9 units</b>')),
    ("design: headline dose disagrees with its own total [R1]",
     "docs/design/screens.html",
     lambda t: t.replace('<span class="dose-num">10</span>',
                         '<span class="dose-num">7</span>')),
    ("listing: §20.5 names a file that does not exist", "PLAN.md",
     lambda t: t.replace("  check-plan.py              <-",
                         "  GHOST-FILE.md              <- not real\n"
                         "  check-plan.py              <-")),
    ("listing: a real file goes unlisted in §20.5", "PLAN.md",
     lambda t: t.replace("  docs/BLOG-FIX.md           <-", "")),
    ("retired: 'in the export envelope only' resurrected as live spec [R1]",
     "BACKLOG.md",
     lambda t: t + "\n\nThe note lives in the export envelope only.\n"),
    ("required: 5th state rule deleted — declined/export [R1]", "PLAN.md",
     lambda t: t.replace("`declined` does not travel in the export",
                         "`declined` is recorded")),
    ("required: 5th state rule INVERTED [R1]", "PLAN.md",
     lambda t: t.replace("`declined` does not travel in the export",
                         "`declined` travels in the export")),
    ("required: v18 import rule deleted [R1]", "PLAN.md",
     lambda t: t.replace("kept local, never overwritten", "merged")),
    ("required: answeredAtMs dropped from the export shape [R1]", "PLAN.md",
     lambda t: t.replace("{ answeredAtMs, text }", "{ text }")),
    ("design: prose working contradicts its dose [looks.html]", "docs/design/looks.html",
     lambda t: t.replace("6 to correct + 5 for the meal",
                         "6 to correct + 9 for the meal")),
    ("design: held-back component not struck through", "docs/design/step-flow.html",
     lambda t: t.replace("<b><s>5.0</s></b>", "<b>&mdash;</b>")),
    ("design: suppression screen total wrong", "docs/design/step-flow.html",
     lambda t: t.replace('<div class="gr tot"><span>Total</span><b>5 units</b></div>',
                         '<div class="gr tot"><span>Total</span><b>9 units</b></div>')),
    ("design: band-B negative-correction total wrong", "docs/design/step-flow.html",
     lambda t: t.replace('<div class="gr tot"><span>Total</span><b>3 units</b></div>',
                         '<div class="gr tot"><span>Total</span><b>8 units</b></div>')),
    ("design: noon reverted to 12:00 PM [§10.4]", "docs/design/step-flow.html",
     lambda t: t.replace("<b>12:00 noon</b>", "<b>12:00 PM</b>")),
    ("design: midnight reverted to 12:00 AM [§10.4]", "docs/design/step-flow.html",
     lambda t: t.replace("<b>12:00 midnight</b>", "<b>12:00 AM</b>")),
    ("design: a 24-hour time appears [§10.4]", "docs/design/step-flow.html",
     lambda t: t.replace("<b>8:40 PM</b>", "<b>20:40 PM</b>")),
    # v22 mutants. Each restores a defect that shipped in v21 and survived a
    # clean checker run, so each is evidence the new pin does work.
    ("required: start over reverted to a store clear [v21 defect, list rots]",
     "PLAN.md",
     lambda t: t.replace('**"Start over" is `indexedDB.deleteDatabase("MealUnits")` on both paths.**',
                         "Start over clears all six stores in one transaction.")),
    ("required: the store-list rot argument dropped", "PLAN.md",
     lambda t: t.replace("**A hand-enumerated store list rots on the edit that changes it",
                         "**A store list is fine")),
    ("required: escape moved back behind settings [unreachable when needed]",
     "PLAN.md",
     lambda t: t.replace("**The fail-closed screen itself.**",
                         "Settings, as above.")),
    ("required: blocked handler dropped from the escape", "PLAN.md",
     lambda t: t.replace("**`deleteDatabase` blocks on open connections**",
                         "The escape completes immediately")),
    ("required: envelope-gap hazard dropped [second brick]", "PLAN.md",
     lambda t: t.replace("**It can leave the database without an envelope.**",
                         "It is otherwise equivalent.")),
    ("required: clearing the record no longer invalidates other tabs", "PLAN.md",
     lambda t: t.replace('**"Clear the record" bumps `logRevision`',
                         '**"Clear the record" leaves `logRevision` alone')),
    ("required: readings given a revision [manufactured attribution]", "PLAN.md",
     lambda t: t.replace("**Do not fix this by adding a revision to readings.**",
                         "Add a `settingsRevision` to readings.")),
    ("required: reading placement reverted to a stamp [unbuildable]", "PLAN.md",
     lambda t: t.replace("**timestamp falling inside the period's date range**",
                         "**`settingsRevision`**")),
    ("required: unplaceable reading silently reattributed", "PLAN.md",
     lambda t: t.replace("**A reading outside every period gets its own labelled group**",
                         "A reading outside every period joins the nearest group")),
    ("required: backup timestamp loses its store [legislated, unstorable]",
     "PLAN.md",
     lambda t: t.replace('`meta` row `{ k: "backup", lastJsonExportAtMs }`',
                         "in the export envelope")),
    ("required: dosing question left pointing at neither export", "PLAN.md",
     lambda t: t.replace("question is offered at both exports, over one shared state",
                         "question is offered at export")),
    ("required: the export offer names a file again [third name, §10.1 rot]",
     "PLAN.md",
     lambda t: t.replace("**opens the export screen**", "is labelled Export first")),
    ("required: backup prompt reverts to naming a control that does not exist",
     "PLAN.md",
     lambda t: t.replace("**Last made a copy you can restore from: 12 days ago**",
                         "**Last backup: 12 days ago**")),
    ("required: escaping narrowed to the free-text fields only", "PLAN.md",
     lambda t: t.replace("**Every value is HTML-escaped on the way in.**",
                         "The two free-text values are escaped.")),
    ("required: readable file allowed to carry script", "PLAN.md",
     lambda t: t.replace("**The file contains no script at all.**",
                         "A little inline script is fine.")),
    ("required: period grouping drops out of the tested core", "PLAN.md",
     lambda t: t.replace("- **the readable export's period grouping** (§7.7.1)",
                         "- ~~the readable export's period grouping~~ (§7.7.1)")),
    # -----------------------------------------------------------------------
    # v23. Every mutation below ESCAPED the v22 checker and was found by a
    # reviewer, not by this file. They are seeded permanently so the repair is
    # provable rather than asserted — the first four are the four most dangerous
    # sentences in the document, and none of them was pinned.
    # -----------------------------------------------------------------------
    # -----------------------------------------------------------------------
    # v24. Every mutation here escaped the v23 checker and was found by a
    # reviewer. [R1] escaped 21 of 21 fresh probes; [R2] escaped 38 of 50. The
    # v23 header claimed the class was closed structurally on the evidence of
    # seven examples, which is the same mistake in a new register: fixing what
    # you were shown is not fixing the category.
    # -----------------------------------------------------------------------
    ("required: the fifth algorithm line rounds the meal, not the total",
     "PLAN.md",
     lambda t: t.replace("roundToIncrement(clamped, mode)",
                         "roundToIncrement(meal, mode)")),
    ("arithmetic: a worked example written in a shape the check cannot read",
     "PLAN.md",
     lambda t: t.replace("total                          = 26.0 units",
                         "total                          = 27.0 u")),
    ("canonical: band A's floor drifts from HYPO_LEVEL_1", "PLAN.md",
     lambda t: t.replace("blood sugar >= 70", "blood sugar >= 60")),
    ("canonical: §7.4's advise row drifts from its constants", "PLAN.md",
     lambda t: t.replace("| 4\u201318 hours | any |", "| 4\u20136 hours | any |")),
    ("ranges: §4.5's confirm-once band drifts from §11.8's soft", "PLAN.md",
     lambda t: t.replace("| Target blood sugar | 70–**200** mg/dL | 90–140 mg/dL |",
                         "| Target blood sugar | 70–**200** mg/dL | 90–180 mg/dL |")),
    ("ranges: §11.8's own soft row drifts from the declared table", "PLAN.md",
     lambda t: t.replace("soft: [90, 140]", "soft: [90, 180]")),
    ("ranges: bolding a field label used to hide the drift", "PLAN.md",
     lambda t: t.replace("| Blood sugar | 20–600 mg/dL",
                         "| **Blood sugar** | 20–700 mg/dL")),
    ("design: the ketone threshold drifts in a mockup",
     "docs/design/step-flow.html",
     lambda t: t.replace("Above 250 — check ketones", "Above 350 — check ketones")),
    ("design: a band boundary drifts in a mockup", "docs/design/step-flow.html",
     lambda t: t.replace("Below 54 — band D", "Below 44 — band D")),
    ("design: the eat delay drifts in a mockup", "docs/design/step-flow.html",
     lambda t: t.replace("Inject 20&ndash;30", "Inject 10&ndash;20")),
    # §8.5's per-class clocks. The class the entry was opened FOR — a rapid
    # analogue reader told to wait Humulin R's twenty to thirty minutes is the
    # one place this app can push somebody low — so the seed puts that exact
    # wrong number back.
    # The class-aware prose rule, both ways round: a class row restating
    # another class's pair, and a pair that is nobody's.
    ("§8.5: CLINICAL.md gives the rapid class Humulin R's wait", "CLINICAL.md",
     lambda t: t.replace(
         "| Rapid analogue (aspart, lispro, glulisine) | 10\u201315 minutes |",
         "| Rapid analogue (aspart, lispro, glulisine) | 20\u201330 minutes |")),
    ("§8.5: CLINICAL.md invents a wait no class declares", "CLINICAL.md",
     lambda t: t.replace(
         "| Regular human insulin | 20\u201330 minutes",
         "| Regular human insulin | 25\u201335 minutes")),
    ("rename: the file format tracks the live type again", "src/storage/envelope.ts",
     lambda t: t.replace("readonly settings: ExportedSettings | Record<string, never>;",
                         "readonly settings: Omit<Settings, 'revision'> | Record<string, never>;")),
    # Check 1c, extended to package.json. The audience change retired "for one
    # person" on 2026-09-13; package.json kept saying it until 2026-09-21
    # because it sat outside both corpora.
    ("retired 'for one person' back in the package description", "package.json",
     lambda t: t.replace(
         '"An insulin bolus calculator for people with type 1 diabetes',
         '"An insulin bolus calculator for one person')),
    # §20.3's third rule, and check 34's own blind spot made permanent. An
    # `Omit` of a type declared nowhere in `src/` is a site the check cannot
    # examine; before 2026-09-21 it was skipped in silence and the run stayed
    # clean, which is the exact shape that hid `Settings` from it.
    ("Omit<> of a type the checker cannot resolve", "src/storage/repo.ts",
     lambda t: t.replace(
         "export interface StoredState {",
         "type Unresolvable = Omit<NotDeclaredAnywhere, 'field'>;\n\nexport interface StoredState {")),
    # Check 35. `injected` sat in SOFT_RANGES for ten days after `config.ts`
    # struck its band, and every soft-band check stayed quiet because they only
    # fire on a band a DOCUMENT states. This seeds the same drift on a field
    # that still has one.
    ("a soft band struck from config.ts, still declared", "src/config.ts",
     lambda t: t.replace("target: { hard: [70, 200], soft: [90, 140] }",
                         "target: { hard: [70, 200] }")),
    # Check 34. This is the exact state `bumpLogRevision` was left in by the
    # 2026-09-21 rename: an `Omit` still naming the row's OLD key, omitting
    # nothing, and compiling without complaint.
    ("Omit<> left pointing at a renamed field", "src/storage/repo.ts",
     lambda t: t.replace("Partial<Omit<LogRevisionRow, 'key' | 'logRevision'>>",
                         "Partial<Omit<LogRevisionRow, 'k' | 'n'>>")),
    # T15's generated files. Both hold a deployed address that nothing would
    # rewrite if it went back to being written by hand.
    ("T15: the manifest scope written as a literal again", "vite.config.ts",
     lambda t: t.replace("        scope: BASE,", "        scope: '/MealUnits/',")),
    ("T15: the manifest start_url written as a literal again", "vite.config.ts",
     lambda t: t.replace("        start_url: BASE,", "        start_url: '/MealUnits/',")),
    ("T15: robots.txt's sitemap address stops following BASE", "vite.config.ts",
     lambda t: t.replace("`Sitemap: ${SITE_URL}${BASE}sitemap.xml`",
                         "'Sitemap: https://mominbinshahid.github.io/MealUnits/sitemap.xml'")),
    # T18's comparison, which decides whether a settings commit starts a new
    # prescription period. Both failures are silent and both misattribute doses.
    ("T18: a prescription field dropped from the period comparison",
     "src/storage/repo.ts",
     lambda t: t.replace("    bolusId: commit.bolusId,\n    imported: previous.imported,",
                         "    imported: previous.imported,")),
    ("T18: the comparison hand-lists its fields instead of reading the type",
     "src/storage/repo.ts",
     lambda t: t.replace("(Object.keys(proposed) as (keyof SettingsHistoryRow)[])",
                         "(['target', 'isf', 'icr'] as (keyof SettingsHistoryRow)[])")),
    ("T18: an exclusion outlives the field it excluded", "src/storage/repo.ts",
     lambda t: t.replace("= ['revision', 'changedAtMs', 'imported']",
                         "= ['revision', 'changedAtMs', 'imported', 'usualDose']")),
    # T20's window, and §7.3's coupling to it.
    ("T20: the advise window narrowed back under the label it quotes", "src/config.ts",
     lambda t: t.replace("stackSuppressHours: 4, stackAdviseHours: 18 }",
                         "stackSuppressHours: 4, stackAdviseHours: 12 }")),
    ("T20: the delete window pinned to one class instead of the longest",
     "src/config.ts",
     lambda t: t.replace(
         "export const DELETE_CONFIRM_WINDOW_HOURS = LONGEST_ADVISE_HOURS;",
         "export const DELETE_CONFIRM_WINDOW_HOURS = STACK_ADVISE_HOURS;")),
    ("T20: the longest-window derivation reduced to a single row", "src/config.ts",
     lambda t: t.replace(
         "export const LONGEST_ADVISE_HOURS = Math.max(",
         "export const LONGEST_ADVISE_HOURS = Math.min(")),
    ("§8.5: the rapid analogue wait widened to Humulin R's", "src/config.ts",
     lambda t: t.replace("rapid: { eatDelayMinutes: [10, 15],",
                         "rapid: { eatDelayMinutes: [20, 30],")),
    ("§8.5: a stacking gate shortened for one class", "src/config.ts",
     lambda t: t.replace(
         "rapid: { eatDelayMinutes: [10, 15], stackSuppressHours: 4,",
         "rapid: { eatDelayMinutes: [10, 15], stackSuppressHours: 2,")),
    ("§8.5: an alias re-pointed at another class", "src/config.ts",
     lambda t: t.replace(
         "export const EAT_DELAY_MINUTES = INSULIN_TIMING.regular.eatDelayMinutes;",
         "export const EAT_DELAY_MINUTES = INSULIN_TIMING.rapid.eatDelayMinutes;")),
    ("§8.5: §8.1's table disagrees with the class it names", "PLAN.md",
     lambda t: t.replace("| Rapid analogue | 10\u201315 minutes |",
                         "| Rapid analogue | 15\u201320 minutes |")),
    ("§8.5: the ultra-rapid row grew a wait its label does not have", "PLAN.md",
     lambda t: t.replace("| Ultra-rapid analogue | at the start of the meal |",
                         "| Ultra-rapid analogue | 10 minutes |")),
    ("design: §7.4.1's ceiling computed from the wrong operand",
     "docs/design/step-flow.html",
     lambda t: t.replace("up to <b>180 mg/dL</b>", "up to <b>80 mg/dL</b>")),
    ("design: a lowercase 12:00 pm dodged the §10.4 check",
     "docs/design/step-flow.html",
     lambda t: t.replace("<b>12:00 noon</b>", "<b>12:00 pm</b>")),
    ("design: an unproducible half-unit dose in a history row",
     "docs/design/step-flow.html",
     lambda t: t.replace('<span class="c">10</span>', '<span class="c">10.5</span>')),
    # v23 rules invertible one line under their own pins [R1].
    ("required: clearing the record drops acks again", "PLAN.md",
     lambda t: t.replace('**"Clear the record" drops nothing from `acks`.**',
                         '**"Clear the record" drops only `ceilMode`.**')),
    ("required: unknown history rendered as the reassuring copy", "PLAN.md",
     lambda t: t.replace('*"This app cannot read your record right now',
                         '*"No recent dose is on record')),
    ("required: the escape loses its blocked handler", "PLAN.md",
     lambda t: t.replace("same `blocked` handler and the same",
                         "no handler and the same")),
    ("required: the recovery connection loses versionchange", "PLAN.md",
     lambda t: t.replace("**That connection also carries a `versionchange` handler**",
                         "That connection needs no handler")),
    ("required: a tombstone's deleted flag flipped to false", "PLAN.md",
     lambda t: t.replace("| `deleted` | `true`.", "| `deleted` | `false`.")),
    ("required: every deletion leaves a tombstone [buries the signal]",
     "PLAN.md",
     lambda t: t.replace("**Only deletions inside `DELETE_CONFIRM_WINDOW_HOURS` leave one.**",
                         "**Every deletion leaves one.**")),
    ("required: the tombstone tiebreak narrowed to one direction", "PLAN.md",
     lambda t: t.replace("in either direction. Deletion is",
                         "in one direction only. Deletion is")),
    ("required: the envelope reverts to a single row shape", "PLAN.md",
     lambda t: t.replace("[ Injection | Tombstone ],   // §7.3 — CHANGED IN v24",
                         "[ ...rows, each carrying settingsRevision... ]  //")),
    ("required: §7.1 loses the tombstone fields again", "PLAN.md",
     lambda t: t.replace("| `deleted`, `deletedAtMs` | **ADDED IN v24**",
                         "| ~~deleted~~ | **cut**")),
    ("required: the interface decision is reopened as undecided", "PLAN.md",
     lambda t: t.replace("**Which interface ships? — RESOLVED IN v25 BY THE USER: Step.**",
                         "**Which interface ships?** Still open.")),
    ("required: the wizard state is dropped from the build budget", "PLAN.md",
     lambda t: t.replace("**wizard state on top of §11.2's reducer**",
                         "no additional state")),
    ("required: clamp the CORRECTION instead of the total [§2.1 banned]",
     "PLAN.md",
     lambda t: t.replace(
         "clamped    = max(0, total)                   // clamp the TOTAL, never the correction",
         "clamped    = correction + max(0, meal)       // clamp the correction")),
    ("required: §7.4 suppression direction INVERTED [round-2 CRITICAL]",
     "PLAN.md",
     lambda t: t.replace(
         "| under 4 hours | **positive** | Suppressed → meal only.",
         "| under 4 hours | **positive** | Applied in full, always.")),
    ("canonical: band C boundary drifted 54/70 -> 44/60", "PLAN.md",
     lambda t: t.replace("| **C. Low (Level 1)** | 54 <= blood sugar < 70 |",
                         "| **C. Low (Level 1)** | 44 <= blood sugar < 60 |")),
    ("arithmetic: §2's canonical total 26.0 -> 27.0", "PLAN.md",
     lambda t: t.replace("total                          = 26.0 units",
                         "total                          = 27.0 units")),
    ("ranges: §4.5's blood-sugar row drifts from §11.8", "PLAN.md",
     lambda t: t.replace("| Blood sugar | 20–600 mg/dL | — |",
                         "| Blood sugar | 20–700 mg/dL | — |")),
    ("ranges: §4.5's target row drifts from §11.8", "PLAN.md",
     lambda t: t.replace("| Target blood sugar | 70–**200** mg/dL |",
                         "| Target blood sugar | 70–**300** mg/dL |")),
    ("canonical: §7.3's window prose contradicts its constant", "PLAN.md",
     lambda t: t.replace("inside the last 18 hours", "inside the last 4 hours")),
    ("design: a mock history row shows an unproducible dose",
     "docs/design/step-flow.html",
     lambda t: t.replace('194 mg/dL · 45 g</span>\n                <span class="v"><span class="c">6</span>',
                         '194 mg/dL · 45 g</span>\n                <span class="v"><span class="c">9</span>')),
    ("design: a card-design table row shows an unproducible dose",
     "docs/design/screens.html",
     lambda t: t.replace('<td>288</td><td>55 g</td><td class="calc">10</td>',
                         '<td>288</td><td>55 g</td><td class="calc">7</td>')),
    ("design: 12:00 PM in the file with no screen catalogue [§10.4]",
     "docs/design/looks.html",
     lambda t: t.replace("8:15 AM", "12:00 PM")),
    ("design: an entity-encoded dangling §ref", "docs/design/step-flow.html",
     lambda t: t.replace("&sect;10.1", "&sect;7.99")),
    # v23's own rulings.
    ("required: acks reverted to being dropped with the record", "PLAN.md",
     lambda t: t.replace('**`acks` survives "clear the record" entirely',
                         '**`acks` goes with the record')),
    ("required: the recovery connection left open [escape hangs]", "PLAN.md",
     lambda t: t.replace(
         "**The versionless recovery connection is closed after the read and before the escape is offered.**",
         "The recovery connection may stay open.")),
    ("required: start over reverts to logRevision [counter is deleted]",
     "PLAN.md",
     lambda t: t.replace(
         "**`versionchange` fires on every open connection with `newVersion === null`.**",
         "Both operations bump `logRevision`.")),
    ("required: unknown history rendered as no-recent-dose [false safety]",
     "PLAN.md",
     lambda t: t.replace("**The third row is not the second row.**",
                         "The third row renders the second row's copy.")),
    ("required: periods reordered by revision key [misattribution on import]",
     "PLAN.md",
     lambda t: t.replace("**Periods are ordered by `changedAtMs`, not by revision key",
                         "**Periods are ordered by revision key")),
    ("required: a resolved share counted as a saved backup", "PLAN.md",
     lambda t: t.replace("**The counter is set on the download route only.**",
                         "Either route sets the counter.")),
    ("required: the tombstone loses its stored shape again", "PLAN.md",
     lambda t: t.replace("#### The tombstone had no stored shape — SPECIFIED IN v23",
                         "#### Notes on deletion")),
    ("required: a tombstone keeps its dose values [restores the ambiguity]",
     "PLAN.md",
     lambda t: t.replace("**The dose values do not survive**",
                         "The dose values are kept")),
    ("required: logRevision loses its row again", "PLAN.md",
     lambda t: t.replace('key: "logRevision", logRevision', '// counter lives somewhere')),
    ("required: the commit moves back to the first tap [amount becomes an edit]",
     "PLAN.md",
     lambda t: t.replace("**The commit is the second tap.**",
                         "The commit is the first tap.")),
    ("required: §7.7.1 deleted outright", "PLAN.md",
     lambda t: t.replace("#### 7.7.1 Two exports, named by purpose",
                         "#### 7.7.1 Notes")),
    ("required: backup counter widened to any export [false safety claim]",
     "PLAN.md",
     lambda t: t.replace("prompt must count **only** the JSON export",
                         "prompt counts any export")),
    ("required: readable file flattened to a date sort [false attribution]",
     "PLAN.md",
     lambda t: t.replace("grouped by prescription period, not sorted by date",
                         "sorted by date")),
    ("required: bulk clear loses §7.3's stacking consequence [unguarded bypass]",
     "PLAN.md",
     lambda t: t.replace("#### It must carry §7.3's stacking consequence",
                         "#### Notes on clearing")),
    ("required: the stacking-consequence line dropped from the confirmation",
     "PLAN.md",
     lambda t: t.replace("**The stacking check is using a dose from 2:00 PM.**",
                         "Everything will be deleted.")),
    ("required: clearing turned into a hard block [contradicts §6.1]", "PLAN.md",
     lambda t: t.replace("**Not a block.** §6.1's ruling stands",
                         "**A block.** The app refuses")),
    ("required: clearing regains a cache side-effect [can strand the app offline]",
     "PLAN.md",
     lambda t: t.replace("**Neither operation touches a cache or a worker registration",
                         "**Both operations clear this app's caches and registration")),
    ("required: blog-preservation coverage dropped rather than retargeted", "PLAN.md",
     lambda t: t.replace("**Cache cleanup preserves the blog — ADDED IN v15, RETARGETED IN v22**",
                         "**Cache cleanup notes**")),
    ("required: §7.9 deleted outright", "PLAN.md",
     lambda t: t.replace("### 7.9 Clearing the data", "### 7.9 Notes")),
    ("required: settingsHistory made droppable [breaks §11.3 allocation]", "PLAN.md",
     lambda t: t.replace('`settingsHistory` survives "clear the record"',
                          '`settingsHistory` is dropped too')),
    ("required: §11.7 constraint softened where it now lives [blog unregistered]",
     "PLAN.md",
     lambda t: t.replace("**§11.7's scope constraint does not weaken",
                         "**§11.7's scope constraint is relaxed here")),
    ("design: dangling §ref in a companion file", "docs/design/step-flow.html",
     lambda t: t.replace('<span class="ref">§8.1</span>',
                         '<span class="ref">§6.9</span>', 1)),
    ("constants: drift seeded in a design file", "docs/design/screens.html",
     lambda t: t + "\n<code>export const HYPO_LEVEL_1 = 60;</code>\n"),
    # §10.4's no-break space, added 2026-09-15 with the check. Two seeds rather
    # than one because the rule has two halves that fail independently: the
    # formatter every dose goes through, and a screen that builds its own
    # string. The second is the one a new screen reintroduces.
    ("nowrap: the no-break space in units() reverted to a plain space",
     "src/ui/copy.ts",
     lambda t: t.replace(r"${value}\u00A0${value", "${value} ${value")),
    # RE-AIMED TWICE on 2026-09-22, and the second time it changed SHAPE.
    #
    # It pointed at `foods.tsx`, then at `misc.tsx` — a screen building its own
    # `${n}\u00A0unit` pair. Both anchors are gone, because `10a` moved every
    # one of them into `copy.ts`: the unit word is a WORD and had to translate.
    # `grep -rn 'u00A0' src/ui/screens` is now empty, so the shape this seed was
    # written for has no instance left to seed.
    #
    # It could have been retired. Instead it is aimed at the shape that replaced
    # it and has 53 instances: a TRANSLATION losing the character. The rule is
    # per language and so is the risk — `copy-ur.ts` was assembled from seven
    # fragments by seven agents, and 52 of its no-break spaces were normalised by
    # hand on the day it landed.
    ("nowrap: a translated safety string loses its no-break space",
     "src/ui/copy-ur.ts",
     lambda t: t.replace(r"${String(FAST_CARB_GRAMS)}\u00A0" + "گرام",
                         "${String(FAST_CARB_GRAMS)} گرام", 1)),
    # A third, 2026-09-17, when `ml` and `inch` joined the list: the food table
    # is a THIRD shape — not a formatter, not a screen, a data row someone edits
    # by copying the row above. It is also the seed that proves `src/data` is
    # held by the harness at all; before it was, a seed here reported its file
    # missing, which the runner counts as an escape.
    ("nowrap: a data row reverts a portion to a plain space",
     "src/data/carbs.ts",
     lambda t: t.replace(r"150\u00A0ml", "150 ml", 1)),
    # BACKLOG 24's routes, 2026-09-17. Two seeds because the collision has two
    # directions and the check has two arms: a route renamed onto a file that
    # already ships, and a route the worker has been told is not the app.
    ("routes: a segment renamed onto a file that ships verbatim",
     "src/routes.ts",
     lambda t: t.replace("segment: 'foods'", "segment: 'robots.txt'", 1)),
    ("routes: the table emptied, so the check sees nothing",
     "src/routes.ts",
     lambda t: re.sub(r"segment: '[^']+'", "segmentX: 'x'", t)),
    ("routes: DEFAULT_TITLE drifts from the title index.html ships",
     "src/routes.ts",
     lambda t: t.replace("MealUnits \u2014 mealtime insulin calculator for type 1 diabetes",
                         "MealUnits", 1)),
    # The 404 page, 2026-09-17. A domain move is the case this guards, and the
    # failure is the page that exists to offer a way back offering a broken one.
    ("404: the way back points outside BASE",
     "public/404.html",
     lambda t: t.replace('href="/MealUnits/"', 'href="/"', 1)),
    # 10a's RTL sweep, 2026-09-22, seeded three ways because the check has three
    # shapes of finding and one seed would certify only the shape it lands on.
    # Each of these is a real declaration this file carried until that day.
    ("logical: the tag's margin points at a side again",
     "src/ui/styles.css",
     lambda t: t.replace("margin-inline-start: 0.5rem;", "margin-left: 0.5rem;", 1)),
    ("logical: text aligned to the left rather than to the start",
     "src/ui/styles.css",
     lambda t: t.replace("text-align: start;", "text-align: left;", 1)),
    ("logical: the warning accent back on a named corner",
     "src/ui/styles.css",
     lambda t: t.replace("border-start-start-radius: 0;",
                         "border-top-left-radius: 0;", 1)),
    # 10a's faces, 2026-09-22. Three seeds because the rule has three halves and
    # each fails a different way: shipped to everyone, never intercepted, or
    # intercepted and then swept away by the next deploy.
    ("faces: the precache exclusion deleted, so 448 KB ships to every phone",
     "vite.config.ts",
     lambda t: t.replace("if (at === 'fonts-urdu') return [];", "")),
    ("faces: routed to NOT_THE_APP, so the worker never caches one",
     "src/sw.ts",
     lambda t: t.replace("const NOT_THE_APP = [",
                         "const NOT_THE_APP = [\n    `${__SCOPE_PATH__}fonts-urdu/`,", 1)),
    ("faces: the activate sweep stops exempting FONT_CACHE [lost on deploy]",
     "src/sw.ts",
     lambda t: t.replace("name.startsWith(CACHE_PREFIX) && name !== CACHE && name !== FONT_CACHE",
                         "name.startsWith(CACHE_PREFIX) && name !== CACHE")),
    # `src/main.ts` joining the UI-text walk, 2026-09-22. The literal below is
    # the exact one that was there — the update bar's headline, English in an
    # Urdu interface for as long as the bar has existed, with nothing reporting
    # it because the walk stopped one directory short.
    ("ui text: the update bar goes back to a literal in main.ts",
     "src/main.ts",
     lambda t: t.replace("text: copy.update.ready,", "text: 'A newer version is ready.',", 1)),
    # The glue-word widening, 2026-09-22. This is the literal that was on the
    # step counter — one English word between two interpolations, on the screen
    # this app is used on most, invisible to the two-word rule for as long as
    # the check has existed.
    ("ui text: the step counter goes back to a one-word template literal",
     "src/ui/screens/calculator.tsx",
     lambda t: t.replace("label={COPY.calculator.stepOf(String(step), String(TOTAL_STEPS))}",
                         "label={`${String(step)} of ${String(TOTAL_STEPS)}`}", 1)),
    # The bidi range, 2026-09-22. This is the exact line that shipped `30-20` on
    # the result screen's timing card.
    ("rtl: the eat-delay range loses its isolation [renders backwards]",
     "src/ui/copy-ur.ts",
     lambda t: t.replace("${isolate(`${lo}\u2013${hi}`)}", "${lo}\u2013${hi}", 1)),
    # The arrow, 2026-09-22. This is the exact glyph that shipped in
    # `timing.injectedAt`, pointing back at the injection time instead of
    # forward at the instruction to eat.
    ("rtl: an arrow reverts to \u2192 and points the wrong way",
     "src/ui/copy-ur.ts",
     lambda t: t.replace("\u067e\u0631 \u0679\u06cc\u06a9\u06c1 \u0644\u06af\u0627 \u2190",
                         "\u067e\u0631 \u0679\u06cc\u06a9\u06c1 \u0644\u06af\u0627 \u2192", 1)),
]


# --- DECLARED TABLES END ---


# The corpus every seeded run starts from, filled in by `self_test` before the
# pool is forked. It is module-level rather than a closure for one reason: a
# forked child inherits module globals, and `Pool.map` pickles the function it is
# given BY NAME, which a nested one does not have.
_SELF_TEST_BASE = {}


def _self_test_run(overrides):
    """One full run of the checker over `_SELF_TEST_BASE` plus `overrides`.

    Every check in this file is supposed to read through `load`, which is what
    makes a seeded mutation visible to it — the override below is the entire
    mechanism. Two checks were reading the disk directly as late as 2026-09-22,
    and the only reason anyone found out is that a seed against them escaped.
    """
    files = dict(_SELF_TEST_BASE)
    files.update(overrides)
    saved = globals()["load"]
    globals()["load"] = lambda p: files.get(
        _corpus_key(os.path.relpath(p, HERE).replace(os.sep, "/")), saved(p))
    try:
        buf = io.StringIO()
        stdout, sys.stdout = sys.stdout, buf
        try:
            rc = main(_inner=True)
        finally:
            sys.stdout = stdout
        return rc
    finally:
        globals()["load"] = saved


def _self_test_seed(index):
    """Run seed `index` and return `(label, why)` if it escaped, else `None`.

    Takes an INDEX rather than the seed itself because the seeds are lambdas and
    a lambda cannot be pickled to a worker process. The index can; the child
    already has `SELF_TESTS` from the fork.
    """
    label, rel, fn = SELF_TESTS[index]
    if rel not in _SELF_TEST_BASE:
        return (label, "target file %s is missing" % rel)
    mutated = fn(_SELF_TEST_BASE[rel])
    if mutated == _SELF_TEST_BASE[rel]:
        return (label, "mutation changed nothing — the anchor it edits "
                       "has moved, so this test verifies nothing")
    if _self_test_run({rel: mutated}) == 0:
        return (label, "NOT CAUGHT")
    return None


def self_test():
    """Run every seeded mutation and report which the checker fails to catch.

    A check that cannot be shown to fail on a real defect is not a check. This
    runs entirely in memory: nothing on disk is read twice or written once.

    ACROSS EVERY CORE, since 2026-09-22. The seeds are independent by
    construction — each is one mutation applied to a private copy of an
    in-memory corpus — so the serial loop was costing about three minutes of a
    developer's attention per verification pass, on a machine with ten cores
    sitting idle. Momin asked why the loop was so slow; this was the largest
    single answer.

    `fork` explicitly, not the platform default. macOS defaults to `spawn`, which
    re-imports the module — and this file is a SCRIPT, so a spawned child would
    execute it from the top rather than import it. Fork also hands each child the
    corpus for free, which is the expensive thing to set up. This process has no
    threads, which is the condition that makes fork safe.

    Order is preserved and the serial path is kept, so the output is identical
    either way: `Pool.map` returns results in input order, and a platform without
    fork falls back rather than failing.
    """
    # Keyed the same way `load_all` keys the corpus, so a seed naming `PLAN.md`
    # still finds it after the documents moved into docs/. Keying by raw path
    # here silently turned 102 of 103 seeds into "target file is missing", which
    # the runner reports as ESCAPED rather than skipped -- correctly, because a
    # seed that cannot find its file verifies nothing.
    base = {}
    for rel in live_files():
        full = os.path.join(HERE, rel)
        if os.path.exists(full):
            base[_corpus_key(rel)] = load(full)
    # `live_files()` is documents only, and §11.8's completeness check reads
    # src/config.ts as the authority on which constants exist. A seed cannot
    # mutate a file the harness does not hold, so it is held here — WITHOUT
    # joining `live_files()`, which drives §20.3's freeze and the dispatch hash
    # and is not the thing being changed.
    config_rel = "src/config.ts"
    config_full = os.path.join(HERE, "src", "config.ts")
    if os.path.exists(config_full):
        base[config_rel] = load(config_full)

    # `src/routes.ts` for the same reason, ADDED 2026-09-17 with BACKLOG 24: the
    # route-collision check reads it, and a seed against a file the harness does
    # not hold reports "missing", which the runner counts as an ESCAPE.
    routes_full = os.path.join(HERE, "src", "routes.ts")
    if os.path.exists(routes_full):
        base["src/routes.ts"] = load(routes_full)

    # `src/storage/repo.ts` and `src/storage/schema.ts` for T18's comparison
    # check, ADDED 2026-09-20 — same reason as every file above: a seed cannot
    # mutate what the harness does not hold, and a seed that cannot find its
    # file reports "missing", which the runner counts as an ESCAPE.
    # `src/ui/styles.css` joins them 2026-09-22 with 10a's RTL sweep, and it is
    # the first NON-TypeScript source file here: the `src/ui` walk below filters
    # on SOURCE_SUFFIXES, which is `.ts` and `.tsx`, so a stylesheet seed would
    # report "target file is missing" and count as an escape.
    for rel in ("src/storage/repo.ts", "src/storage/schema.ts",
                "src/storage/envelope.ts", "vite.config.ts",
                "src/storage/open.ts", "package.json",
                "src/ui/styles.css", "src/sw.ts", "src/main.ts",
                "src/ui/copy-ur.ts", "src/ui/screens/calculator.tsx"):
        full = os.path.join(HERE, *rel.split("/"))
        if os.path.exists(full):
            base[rel] = load(full)

    # `public/404.html` likewise, for `check_404_paths_agree`.
    page_full = os.path.join(HERE, "public", "404.html")
    if os.path.exists(page_full):
        base["public/404.html"] = load(page_full)

    # `src/ui` for the same reason, ADDED 2026-09-14 with T3: check 1c reads
    # those files, and a seed cannot mutate what the harness does not hold — it
    # reports "target file is missing", which the runner counts as an ESCAPE.
    # Held here rather than joined to `live_files()`, which drives §20.3's freeze
    # and the dispatch hash and is not the thing being changed.
    #
    # `src/data` joins it 2026-09-17, for the same reason one step later: §10.4's
    # sweep reads the food table, and a seed there reported "target is missing",
    # which the runner counts as an ESCAPE rather than a skip — a seed that
    # cannot find its file verifies nothing and says nothing.
    for root in (os.path.join(HERE, "src", "ui"), os.path.join(HERE, "src", "data")):
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if not d.startswith(".")]
            for name in sorted(filenames):
                if not name.endswith(SOURCE_SUFFIXES):
                    continue
                full = os.path.join(dirpath, name)
                base[os.path.relpath(full, HERE).replace(os.sep, "/")] = load(full)

    _SELF_TEST_BASE.clear()
    _SELF_TEST_BASE.update(base)

    # Serial, and BEFORE the fork. A checker that is already failing makes every
    # seed below meaningless — each one would be "caught" by the defect that was
    # there to begin with — and the children inherit this corpus, so it is also
    # the last chance to find out cheaply.
    if _self_test_run({}) != 0:
        print("SELF-TEST ABORTED: the checker is not clean on the real files.")
        return 1

    escaped = []
    try:
        pool = multiprocessing.get_context("fork").Pool(
            min(len(SELF_TESTS), os.cpu_count() or 1))
    except ValueError:
        # No fork on this platform. Serial rather than spawn: a spawned child
        # re-executes this file from the top, because it is a script and not a
        # module.
        pool = None
    if pool is None:
        results = [_self_test_seed(i) for i in range(len(SELF_TESTS))]
    else:
        with pool:
            results = pool.map(_self_test_seed, range(len(SELF_TESTS)))
    escaped = [r for r in results if r is not None]

    for label, why in escaped:
        print("  ESCAPE: %-52s %s" % (label, why))
    print("\nself-test: %d/%d seeded mutations caught."
          % (len(SELF_TESTS) - len(escaped), len(SELF_TESTS)))
    return 1 if escaped else 0


def main(_inner=False):
    if not _inner and "--files" in sys.argv:
        # The dispatch freezes and hashes EXACTLY this list (§20.3). Printing it
        # is what makes that claim checkable: v19 asserted the hash count was
        # verified against the script's file list and nothing verified it, while
        # the list held 8 files and the dispatch hashed 7 [R1].
        for rel in live_files():
            print(rel)
        return 0
    if not _inner and "--self-test" in sys.argv:
        return self_test()
    verbose = "--verbose" in sys.argv
    # Cleared per run, because `--self-test` calls this once per seeded mutation
    # and a count left over from the previous iteration would mask a walk that
    # stopped running in this one — the meta-check going blind to blindness.
    _INPUT_SETS.clear()
    plan, backlog, blogfix = load(PLAN), load(BACKLOG), load(BLOGFIX)
    corpus = load_all()
    total = 0
    for name, fn, target in CHECKS:
        source = {"plan": plan, "backlog": backlog, "blogfix": blogfix,
                  "corpus": corpus}[target]
        findings = fn(source)
        if findings:
            total += len(findings)
            print("\n== %s (%d) ==" % (name, len(findings)))
            for f in findings:
                print("  " + f)
        elif verbose:
            print("ok: %s" % name)
    print("\n%d finding(s)." % total if total else "\nclean.")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
