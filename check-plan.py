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
    # The count is 2, not 0: §4.5 and note 2 each QUOTE the retired phrase to
    # explain that it was retired. Quoting a dead rule to record its death is
    # not the rule living on — but it is indistinguishable to a substring
    # search, so the count is what separates them. A third occurrence is the
    # phrase coming back as live spec.
    ("above-range to band E wording", 2),
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
    ("Above 250 again", 2),
    # 2 in PLAN.md (§13.2's v6 correction note) + 2 in this script's own
    # near-miss docstring, which is swept as a live file since v19.
    ("logEntryCount", 4),
    # withdrawn in v16 — §11.6's two original step-0 instructions. Both were wrong:
    # the upgrade needs Gatsby 4+ on a Gatsby 2 blog, and the denylist is inert
    # because gatsby-plugin-offline never configures navigateFallback [R2].
    ("navigation-fallback denylist", 2),   # §11.6 withdrawal + §20.2 build row
    ("Upgrade `gatsby-plugin-offline`", 3),  # same two sites
    # v17: §6.7's usualDose setting cut entirely. Surviving mentions are all in
    # correction notes recording the removal — count-pinned so it cannot return.
    # 6 in PLAN.md (all correction notes recording the removal) + 2 in this
    # script's docstrings (check_tool_rot and check_next_steps), both of which
    # explain a past defect by naming it.
    ("usualDose", 8),
    # v17 cut §6.7's field. This is the phrase BACKLOG.md and the header used to
    # describe it as live; pinned so the cut is verifiable and cannot be undone
    # silently — the claim at PLAN.md:45 has nothing else to check against.
    ("usual-dose field", 2),
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
    # surviving occurrence is §20.3 quoting it to explain the removal; a second
    # would mean the file, or its charter, has come back — and check_next_steps
    # separately fails if the file itself reappears.
    ("DELIBERATELY EPHEMERAL", 1),
    # v21 deleted PLAN-v1..v19-superseded.md once the plan was final (§20.5).
    # Only PLAN-v20-superseded.md remains on disk. Each name below survives as a
    # single reference explaining the deletion — a second occurrence would mean a
    # deleted snapshot is being described as present again.
    # 2: §20.5's listing names the range start, and v21's header explains the
    # deletion.
    # v24 deleted the last snapshot; §20.5 now mentions the series once, in the
    # sentence recording that the archive is gone.
    ("PLAN-v1-superseded.md", 1),
    ("PLAN-v9-superseded.md", 1),
    # 2: §20.5's listing names the range end, and v21's header explains the
    # deletion. Both are records OF the deletion, not descriptions of a live file.
    ("PLAN-v19-superseded.md", 1),
]


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
    "DEFAULT_THRESHOLD": "20",
    "DEFAULT_MODE": "'nearest'",
    "BAND_B_CORRECTION_UNITS": "-1.5",
    "INCREMENT": "{ nearest: 1, half: 0.5, ceil: 1, floor: 1, off: 0.01 }",
    "HUNDREDTHS_SCALE": "100",
    "CLOCK_SKEW_TOLERANCE_HOURS": "1",
    "EAT_DELAY_MINUTES": "[20, 30]",
    "DIVERGE_MIN_UNITS": "5",
    "DIVERGE_RATIO": "3",
    "STACK_SUPPRESS_HOURS": "4",
    "STACK_ADVISE_HOURS": "12",
    "DELETE_CONFIRM_WINDOW_HOURS": "STACK_ADVISE_HOURS",
    "ADVISORY_MIN_ELIGIBLE": "10",
    "ADVISORY_WINDOW": "30",
    "ADVISORY_LOW_DIVISOR": "4",
    "ADVISORY_HIGH_MULTIPLE": "3",
    "RESULT_EXPIRY_MINUTES": "15",
    "POLL_INTERVAL_MS": "4000",
}

# Names whose VALUE is a multi-line structure, checked elsewhere rather than as a
# literal. RANGE is checked row by row against RANGES below.
STRUCTURED_CONSTANTS = {"RANGE"}

# §11.8's RANGE block. Every row, not just target — round 18 pinned the ceiling
# because it had just changed, and left the other seven rows unpinned.
RANGES = {
    "bloodSugar": "[20, 600]", "carbs": "[0, 300]",
    "target": "[70, 200]", "isf": "[5, 200]", "icr": "[1, 100]",
    "threshold": "[10, 45]", "basalUnits": "[1, 150]", "injected": "[0.01, 100]",
}

# The confirm-once band. v23 declared only the hard bounds, so §4.5's third
# column and §11.8's `soft:` could drift apart from each other silently — [R1]
# moved both to 90-180 independently and both passed. A gate stated twice needs
# checking twice.
SOFT_RANGES = {
    "target": "[90, 140]", "isf": "[20, 100]", "icr": "[5, 50]",
    "threshold": "[15, 35]", "basalUnits": "[5, 80]", "injected": "[0.5, 60]",
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
    ("§11.3 dosingHistory store row", r'k:\s*"dosingHistory"'),
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
    ("§11.3 logRevision has a row", r'\{ k: "logRevision", n \}'),
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
    advise, suppress = int(C["STACK_ADVISE_HOURS"]), int(C["STACK_SUPPRESS_HOURS"])
    bandb = C["BAND_B_CORRECTION_UNITS"]
    eat = re.findall(r"\d+", C["EAT_DELAY_MINUTES"])

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
        # §8.1's eat delay, wherever it is restated
        for m in re.finditer(r"(\d+)\s*-\s*(\d+)\s*minutes", text):
            ctx = text[max(0, m.start() - 90):m.end() + 90].lower()
            if not any(w in ctx for w in ("inject", "eat", "before eating", "meal")):
                continue
            if [m.group(1), m.group(2)] != eat:
                out.append("%s: the eat delay stated as %s-%s minutes; §11.8 "
                           "declares EAT_DELAY_MINUTES [%s, %s]"
                           % (at(m), m.group(1), m.group(2), eat[0], eat[1]))
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


CHECKS = [
    ("retired phrases living as spec (ALL FILES)", check_retired, "corpus"),
    ("dangling section references", check_references, "plan"),
    ("dangling section references in companions", check_references_corpus, "corpus"),
    ("unverifiable removal claims", check_removal_claims, "plan"),
    ("schema field with no snapshot home", check_schema_snapshot, "plan"),
    ("near-miss identifiers", check_near_miss, "plan"),
    ("numbers contradicting canonical values", check_canonical, "corpus"),
    ("required rules deleted outright", check_required, "plan"),
    ("§11.8 constants and ranges", check_constants, "corpus"),
    ("BACKLOG stale against PLAN", check_cross_document, "backlog"),
    ("BLOG-FIX names the app path", check_blogfix, "blogfix"),
    ("checker describing retired things", check_tool_rot, "plan"),
    ("unbalanced bold markers", check_bold_balance, "plan"),
    ("PLAN references BACKLOG by number", check_plan_against_backlog, "plan"),
    ("§20.5 listing vs the directory", check_file_listing, "plan"),
    ("NEXT-STEPS.md has come back", check_next_steps, "plan"),
    ("a mockup showing an impossible dose", check_design_arithmetic, "corpus"),
    ("design version tags and screen counts", check_design_claims, "corpus"),
    ("PLAN's own worked arithmetic", check_worked_examples, "plan"),
    ("prose restating §11.8's numbers", check_prose_numbers, "corpus"),
    ("a mock history row that cannot be produced", check_mock_doses, "corpus"),
    ("a mockup's self-derived numbers", check_design_numbers, "corpus"),
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
    ("canonical: threshold drift seeded in BACKLOG.md [R2]", "BACKLOG.md",
     lambda t: t + "\n\nDEFAULT_THRESHOLD = 25;\n"),
    ("canonical: target ceiling reverted to 300 (table)", "PLAN.md",
     lambda t: t.replace("Target blood sugar | 70–**200** mg/dL",
                         "Target blood sugar | 70–**300** mg/dL")),
    ("canonical: target ceiling reverted to 300 (§11.8)", "PLAN.md",
     lambda t: t.replace("target:     { hard: [70, 200]",
                         "target:     { hard: [70, 300]")),
    ("required: dosingHistory store row deleted [R1]", "PLAN.md",
     lambda t: t.replace('k: "dosingHistory"', 'k: "somethingElse"')),
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
     lambda t: t.replace("| 4–12 hours | any |", "| 4–6 hours | any |")),
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
     lambda t: t.replace("inside the last 12 hours", "inside the last 4 hours")),
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
     lambda t: t.replace('{ k: "logRevision", n }', '// counter lives somewhere')),
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
]


# --- DECLARED TABLES END ---


def self_test():
    """Run every seeded mutation and report which the checker fails to catch.

    A check that cannot be shown to fail on a real defect is not a check. This
    runs entirely in memory: nothing on disk is read twice or written once.
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

    def run(overrides):
        files = dict(base)
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

    if run({}) != 0:
        print("SELF-TEST ABORTED: the checker is not clean on the real files.")
        return 1

    escaped = []
    for label, rel, fn in SELF_TESTS:
        if rel not in base:
            escaped.append((label, "target file %s is missing" % rel))
            continue
        mutated = fn(base[rel])
        if mutated == base[rel]:
            escaped.append((label, "mutation changed nothing — the anchor it edits "
                                   "has moved, so this test verifies nothing"))
            continue
        if run({rel: mutated}) == 0:
            escaped.append((label, "NOT CAUGHT"))

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
