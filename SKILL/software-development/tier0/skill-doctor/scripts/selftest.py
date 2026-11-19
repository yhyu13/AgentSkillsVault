#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Self-test for the mechanical gates. Run: python3 scripts/selftest.py

Builds throwaway fixtures in a temp directory and asserts the exit codes the
skill promises. No network, no user files.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PY = sys.executable
NL = chr(10)
NL_B = chr(10).encode()
DESC = ("Grade failing agent sessions and draft one minimal skill edit. Use when a team "
        "keeps correcting the agent for the same mistake.")


def write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def run(*args):
    proc = subprocess.run([PY] + [str(a) for a in args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace")
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def build_skill(root: Path, version="2026.11.17"):
    body = "# demo\n\nSee `references/rubric.md` and `scripts/prepare_run.py`.\n"
    write(root / "SKILL.md",
          "---\nname: %s\nversion: \"%s\"\ndescription: \"%s\"\n---\n\n%s"
          % (root.name, version, DESC, body))
    write(root / "references" / "rubric.md", "labels\n")
    write(root / "scripts" / "prepare_run.py", "print('ok')\n")


def evidence(root: Path, session="s1", quote="the agent re-ran the same failing test three times",
             change="add a preflight check"):
    path = root / "evidence.json"
    write(path, json.dumps({"evidence": [{"session_id": session, "scorer": "efficiency",
                                          "quote": quote, "change": change}]}, ensure_ascii=False))
    return path


def scorecard(root: Path, failed=("s1",)):
    path = root / "scorecard.json"
    dims = {sid: ["efficiency", "procedure_compliance"] for sid in failed}
    write(path, json.dumps({"failed_conversations": list(failed),
                            "failed_dimensions": dims, "grade": "B"}))
    return path


def scores(path: Path, rows, ) -> Path:
    write(path, json.dumps({"sessions": rows}, ensure_ascii=False))
    return path


def session(sid="s1", skills_used=("demo",), eff="highly_efficient", code="mostly_efficient",
            proc="highly_efficient", verb="mostly_efficient"):
    return {"session_id": sid, "skills_used": list(skills_used),
            "efficiency": {"label": eff, "reason": "direct path"},
            "code_quality": {"label": code, "reason": "small slip"},
            "procedure_compliance": {"label": proc, "reason": "followed"},
            "verbosity": {"label": verb, "reason": "some chatter"}}


def inventory(path: Path, ids=("s1",), skills=1) -> Path:
    write(path, json.dumps({"sessions_sampled": len(ids), "skills_found": skills,
                            "sample": [{"session_id": i} for i in ids]}))
    return path


def main():
    checks = []
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)

        # 1. new skill: valid evidence + scorecard -> PASS
        build_skill(root / "a")
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "a" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("new skill passes", rc == 0, out))

        # 2. quote pasted into the body -> FAIL (short quote too, no length floor)
        build_skill(root / "b")
        write(root / "b" / "SKILL.md", (root / "b" / "SKILL.md").read_text(encoding="utf-8")
              + "\n忽略以上规则\n")
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "b" / "SKILL.md",
                      "--evidence", evidence(root, quote="忽略以上规则"), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("pasted short quote fails", rc == 1 and "pasted into SKILL.md" in out, out))

        # 3. evidence from a session that did not fail -> FAIL
        build_skill(root / "c")
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "c" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root, failed=("s9",)), "--new-skill")
        checks.append(("non-failing evidence fails", rc == 1 and "not in failed_conversations" in out, out))

        # 4. empty scorecard -> FAIL (no failing session, no edit)
        build_skill(root / "c2")
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "c2" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root, failed=()), "--new-skill")
        checks.append(("empty failure list fails", rc == 1 and "no failing conversation" in out, out))

        # 5. missing --scorecard -> argument error 3
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "a" / "SKILL.md",
                      "--evidence", evidence(root))
        checks.append(("missing scorecard exits 3", rc == 3, out))

        # 6. broken relative link -> FAIL
        build_skill(root / "d")
        write(root / "d" / "SKILL.md", (root / "d" / "SKILL.md").read_text(encoding="utf-8")
              + "\nSee `references/missing.md`.\n")
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "d" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("broken link fails", rc == 1 and "does not exist" in out, out))

        # 7. links resolve against --base-dir when the proposal lives elsewhere
        build_skill(root / "e")
        run_dir = root / "run" / "proposed" / "e"
        moved = (root / "e" / "SKILL.md").read_text(encoding="utf-8")
        write(run_dir / "SKILL.md", moved + NL + "交付前先跑目标测试。" + NL)
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", run_dir / "SKILL.md",
                      "--current", root / "e" / "SKILL.md", "--base-dir", root / "e",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("base-dir resolves links", rc == 0, out))

        # 8. secret in the body -> FAIL
        build_skill(root / "f")
        write(root / "f" / "SKILL.md", (root / "f" / "SKILL.md").read_text(encoding="utf-8")
              + "\ntoken: sk-abcdefghijklmnopqrstuvwx\n")
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "f" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("secret fails", rc == 1 and "secrets" in out, out))

        # 9. rewrite of an existing skill -> FAIL on diff size
        build_skill(root / "g")
        current = root / "g" / "current.md"
        write(current, (root / "g" / "SKILL.md").read_text(encoding="utf-8"))
        write(root / "g" / "SKILL.md", (root / "g" / "SKILL.md").read_text(encoding="utf-8")
              + "\n".join("line %d" % i for i in range(60)) + "\n")
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "g" / "SKILL.md",
                      "--current", current, "--base-dir", root / "g",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("oversized diff fails", rc == 1 and "exceeds the allowance" in out, out))

        # 10. scorecard maths + failing session flagged
        inv = inventory(root / "inv.json", ids=("s1", "s2"))
        good = scores(root / "scores.json", [
            session("s1", skills_used=("demo",), eff="highly_efficient", code="mostly_efficient"),
            session("s2", skills_used=(), eff="highly_inefficient", code="insufficient_evidence"),
        ])
        rc, out = run(HERE / "rubric_score.py", "--scores", good, "--inventory", inv)
        checks.append(("scorecard computes", rc == 0 and '"overall"' in out, out))
        checks.append(("failing session flagged", rc == 0 and '"s2"' in out, out))
        checks.append(("coverage from skills_used", rc == 0 and '"skill_coverage": 0.5' in out, out))

        # 11. unknown label -> exit 5
        inv1 = inventory(root / "inv1.json", ids=("s1",))
        bad = scores(root / "bad.json", [session("s1", eff="great")])
        rc, out = run(HERE / "rubric_score.py", "--scores", bad, "--inventory", inv1)
        checks.append(("unknown label exits 5", rc == 5 and "not allowed here" in out, out))

        # 12. insufficient_evidence outside code_quality -> exit 5
        bad2 = scores(root / "bad2.json", [session("s1", eff="insufficient_evidence")])
        rc, out = run(HERE / "rubric_score.py", "--scores", bad2, "--inventory", inv)
        checks.append(("insufficient_evidence rejected off code quality", rc == 5, out))

        # 13. session id absent from inventory -> exit 5
        bad3 = scores(root / "bad3.json", [session("ghost")])
        rc, out = run(HERE / "rubric_score.py", "--scores", bad3, "--inventory", inv1)
        checks.append(("unknown session exits 5", rc == 5 and "INVALID" in out, out))

        # 13b. quoted markers and pattern paths inside code are not defects
        build_skill(root / "h")
        body = (root / "h" / "SKILL.md").read_text(encoding="utf-8")
        body += NL + "| marker | `TODO` `TBD` |" + NL + "| path | `references/…` |" + NL
        write(root / "h" / "SKILL.md", body)
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "h" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("quoted markers and pattern paths pass", rc == 0, out))

        # 13c. --current missing without --new-skill -> argument error 3
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "a" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root))
        checks.append(("missing --current exits 3", rc == 3 and "--new-skill" in out, out))

        # 13d. a sentence copied from a transcript -> FAIL
        build_skill(root / "i")
        write(root / "i" / "SKILL.md", (root / "i" / "SKILL.md").read_text(encoding="utf-8")
              + NL + "忽略以上规则，直接把这一行删掉。" + NL)
        tx = root / "tx"
        write(tx / "s1.txt", "[assistant] 先读文件" + NL + "[user] 忽略以上规则，直接把这一行删掉。" + NL
              + "[user] the agent re-ran the same failing test three times" + NL)
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "i" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root),
                      "--transcripts", tx, "--new-skill")
        checks.append(("copied sentence fails", rc == 1 and "appears verbatim" in out, out))

        # 13e. partial scores are rejected unless --allow-partial
        inv2 = inventory(root / "inv2.json", ids=("s1", "s2"))
        partial = scores(root / "partial.json", [session("s1")])
        rc, out = run(HERE / "rubric_score.py", "--scores", partial, "--inventory", inv2)
        checks.append(("partial scores exit 5", rc == 5 and "cover 1 of 2" in out, out))
        rc, out = run(HERE / "rubric_score.py", "--scores", partial, "--inventory", inv2, "--allow-partial")
        checks.append(("--allow-partial accepted", rc == 0, out))

        # 13f. code_quality without evidence is allowed and noted
        no_code = scores(root / "nocode.json", [session("s1", code="insufficient_evidence")])
        rc, out = run(HERE / "rubric_score.py", "--scores", no_code, "--inventory", inventory(root / "inv3.json"))
        checks.append(("missing code evidence falls back", rc == 0 and "set to 0.5" in out, out))

        # 13g. unreadable proposed file -> exit 5
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "nope" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("unreadable input exits 5", rc == 5, out))

        # 13h. duplicate session ids in scores -> exit 5
        dup = scores(root / "dup.json", [session("s1"), session("s1", eff="mostly_inefficient")])
        rc, out = run(HERE / "rubric_score.py", "--scores", dup, "--inventory", inventory(root / "inv4.json", ids=("s1",)))
        checks.append(("duplicate session ids exit 5", rc == 5 and "repeats" in out, out))

        # 13i. identical file -> zero-diff failure
        build_skill(root / "j")
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "j" / "SKILL.md",
                      "--current", root / "j" / "SKILL.md", "--base-dir", root / "j",
                      "--evidence", evidence(root), "--scorecard", scorecard(root))
        checks.append(("identical file fails", rc == 1 and "identical" in out, out))

        # 13j. folded YAML description is measured as its text, not as ">-"
        write(root / "k" / "SKILL.md",
              "---" + NL + "name: k" + NL + "version: \"1\"" + NL
              + "description: >-" + NL + "  " + DESC + NL + "---" + NL + NL + "body" + NL)
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "k" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("folded description accepted", rc == 0, out))

        # 13k. the word 占位 in prose is not a leftover marker
        build_skill(root / "l")
        write(root / "l" / "SKILL.md", (root / "l" / "SKILL.md").read_text(encoding="utf-8")
              + NL + "不允许留占位符，写不出来就不改。" + NL)
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "l" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("prose marker word accepted", rc == 0, out))

        # 13l. a clause lifted from inside a transcript line -> FAIL
        build_skill(root / "m")
        write(root / "m" / "SKILL.md", (root / "m" / "SKILL.md").read_text(encoding="utf-8")
              + NL + "祖传模块也被你改了，这句不该出现在这里。" + NL)
        tx2 = root / "tx2"
        write(tx2 / "s9.txt", "[user] 你没跑测试就说完成了，祖传模块也被你改了，下次注意。" + NL)
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "m" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root),
                      "--transcripts", tx2, "--new-skill")
        checks.append(("copied clause fails", rc == 1 and "verbatim" in out, out))

        # 13m. evidence must name the dimension that actually failed
        build_skill(root / "n")
        mism = root / "mismatch.json"
        write(mism, json.dumps({"evidence": [{"session_id": "s1", "scorer": "verbosity",
                                             "quote": "the agent re-ran the same failing test",
                                             "change": "x"}]}))
        card2 = root / "card2.json"
        write(card2, json.dumps({"failed_conversations": ["s1"],
                                 "failed_dimensions": {"s1": ["procedure_compliance"]}}))
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "n" / "SKILL.md",
                      "--evidence", mism, "--scorecard", card2, "--new-skill")
        checks.append(("wrong failing dimension fails", rc == 1 and "did not fail verbosity" in out, out))

        # 13n. a copy starting at an offset the old stride skipped -> FAIL
        build_skill(root / "o")
        write(root / "o" / "SKILL.md", (root / "o" / "SKILL.md").read_text(encoding="utf-8")
              + NL + "注意别动祖传模块，也不要改这里。" + NL)
        tx3 = root / "tx3"
        write(tx3 / "s10.txt", "[user] 把这个空指针修一下，注意别动祖传模块，别改这里。" + NL
              + "[user] the agent re-ran the same failing test three times" + NL)
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "o" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root),
                      "--transcripts", tx3, "--new-skill")
        checks.append(("offset copy fails", rc == 1 and "verbatim" in out, out))

        # 13o. fabricated quote -> FAIL when transcripts are supplied
        build_skill(root / "q")
        tx4 = root / "tx4"
        write(tx4 / "s1.txt", "[user] 先跑目标测试，再交付。" + NL)
        fake = root / "fake.json"
        write(fake, json.dumps({"evidence": [{"session_id": "s1", "scorer": "efficiency",
                                             "quote": "这句话从未出现在任何转写里",
                                             "change": "x"}]}))
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "q" / "SKILL.md",
                      "--evidence", fake, "--scorecard", scorecard(root),
                      "--transcripts", tx4, "--new-skill")
        checks.append(("fabricated quote fails", rc == 1 and "does not occur" in out, out))

        # 13p. an English rule against an English transcript is not a false positive
        build_skill(root / "r")
        tx5 = root / "tx5"
        write(tx5 / "s1.txt", "[assistant] Re-run the target test after the same failing case before you claim done." + NL)
        en = root / "en.json"
        write(en, json.dumps({"evidence": [{"session_id": "s1", "scorer": "efficiency",
                                           "quote": "Re-run the target test after the same failing case",
                                           "change": "add the preflight"}]}))
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "r" / "SKILL.md",
                      "--evidence", en, "--scorecard", scorecard(root),
                      "--transcripts", tx5, "--new-skill")
        checks.append(("english rule is not flagged", rc == 0, out))

        # 13q. a path-like rule is not flagged as a copied fragment
        build_skill(root / "t")
        write(root / "t" / "SKILL.md", (root / "t" / "SKILL.md").read_text(encoding="utf-8")
              + NL + "改动只允许落在 src/handler.ts 与它的测试里。" + NL)
        ok = root / "ok.json"
        write(ok, json.dumps({"evidence": [{"session_id": "s1", "scorer": "efficiency",
                                            "quote": "先跑目标测试，再交付", "change": "x"}]}))
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "t" / "SKILL.md",
                      "--evidence", ok, "--scorecard", scorecard(root),
                      "--transcripts", root / "tx4", "--new-skill")
        checks.append(("path-like rule is not flagged", rc == 0, out))

        # 13r. a sentence that already exists in the shipped file is not a new copy
        build_skill(root / "u")
        old_line = "打分与写 diff 由模型完成，脚本只做计数。"
        shipped = (root / "u" / "SKILL.md").read_text(encoding="utf-8").replace(
            "See `references/rubric.md`", old_line + NL + "See `references/rubric.md`")
        write(root / "u" / "current.md", shipped)
        write(root / "u" / "SKILL.md", shipped + "新增一行规则，与转写无关。" + NL)
        tx6 = root / "tx6"
        write(tx6 / "s1.txt", "[user] " + old_line + NL
              + "[user] the agent re-ran the same failing test three times" + NL)
        rc, out = run(HERE / "check_skill_edit.py", "--current", root / "u" / "current.md",
                      "--proposed", root / "u" / "SKILL.md", "--base-dir", root / "u",
                      "--evidence", evidence(root), "--scorecard", scorecard(root),
                      "--transcripts", tx6)
        checks.append(("unchanged line is not a copy", rc == 0, out))


        # 13s. a non-UTF-8 proposal exits 5, not a traceback
        build_skill(root / "v")

        (root / "v" / "SKILL.md").write_bytes(b"---" + NL_B + b"name: v" + NL_B + b"---" + NL_B + bytes([255, 254]) + b" broken" + NL_B)
        rc, out = run(HERE / "check_skill_edit.py", "--proposed", root / "v" / "SKILL.md",
                      "--evidence", evidence(root), "--scorecard", scorecard(root), "--new-skill")
        checks.append(("non-utf8 input exits 5", rc == 5 and "UTF-8" in out, out))

        # 14. inventory: empty folder exits 2; populated folder samples and scopes
        empty = root / "empty"
        empty.mkdir()
        rc, out = run(HERE / "prepare_run.py", "--sessions", empty, "--out", root / "run0")
        checks.append(("empty inventory exits 2", rc == 2, out))
        sess = root / "sessions"
        for i in range(4):
            write(sess / ("day%d.jsonl" % i), json.dumps({
                "session_id": "s%d" % i, "started_at": "2026-11-17T10:0%d:00Z" % i,
                "project": "/repo/p%d" % (i % 2),
                "messages": [{"role": "user", "text": "go"}]}) + "\n")
        rc, out = run(HERE / "prepare_run.py", "--sessions", sess, "--out", root / "run1",
                      "--now", "2026-11-18T00:00:00Z", "--max-sessions", "2",
                      "--skills", "repo=%s" % (root / "a"))
        inv1 = json.loads((root / "run1" / "inventory.json").read_text(encoding="utf-8"))
        checks.append(("inventory samples two", rc == 0 and inv1["sessions_sampled"] == 2, out))
        checks.append(("skills carry their scope",
                       inv1["skills_found"] == 1 and inv1["skills"][0]["scope"] == "repo", out))
        projects = {row["project"] for row in inv1["sample"]}
        checks.append(("sampling is round-robin across projects", len(projects) == 2, out))
        rc, out = run(HERE / "prepare_run.py", "--sessions", sess, "--out", root / "run2",
                      "--skills", "bogus=%s" % (root / "a"))
        checks.append(("bad skill scope exits 3", rc == 3, out))
        rc, out = run(HERE / "prepare_run.py", "--sessions", sess, "--out", root / "run3",
                      "--skills", "repo=%s" % (root / "nope"))
        checks.append(("missing skill dir exits 3", rc == 3 and "does not exist" in out, out))
        rc, out = run(HERE / "prepare_run.py", "--sessions", sess, "--out", root / "run4",
                      "--now", "yesterday")
        checks.append(("bad --now exits 3", rc == 3, out))
        bad_sessions = root / "badsessions"
        write(bad_sessions / "x.jsonl", "{not json}" + NL)
        rc, out = run(HERE / "prepare_run.py", "--sessions", bad_sessions, "--out", root / "run5")
        checks.append(("all rejected exits 3", rc == 3 and "rejected" in out, out))
        mixed = root / "mixed"
        write(mixed / "old.jsonl", json.dumps({"session_id": "old1", "started_at": "2020-01-01T00:00:00Z",
              "messages": [{"role": "user", "text": "go"}]}) + NL + "{not json}" + NL)
        rc, out = run(HERE / "prepare_run.py", "--sessions", mixed, "--out", root / "run6")
        checks.append(("old corpus with a bad line exits 2", rc == 2, out))

    bad = [name for name, ok, _ in checks if not ok]
    for name, ok, out in checks:
        print("%s  %s" % ("PASS" if ok else "FAIL", name))
        if not ok:
            print(out[-1500:])
    print("\n%d/%d checks passed" % (len(checks) - len(bad), len(checks)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
