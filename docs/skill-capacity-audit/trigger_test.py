#!/usr/bin/env python3
"""Behavioural trigger test: does the agent actually pick the right skill?

The structural metric (divergence position) says two descriptions can be told
apart from their first words. This measures the thing that matters: for a
realistic user request, which skill does the agent actually invoke?

Method: run each prompt through the Claude Code CLI in print mode, capture the
stream-json transcript, and read the Skill tool calls out of it. A prompt is
a PASS when the expected skill is invoked; an ABSTAIN when the agent invoked
no skill at all (which is a legitimate answer - not every request needs a
skill); a FAIL when it invoked the sibling.

Only tier-A skills are tested. Tier-B skills are deliberately hidden from the
model's auto-selection surface (skillOverrides: user-invocable-only), so the
model cannot pick them by design - that is the tiering working, not a failure.

Usage:  python trigger_test.py [--workers 4] [--timeout 180] [--json out.json]
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

CLI = "claude"
CWD = tempfile.gettempdir()

# (group, prompt, expected skill, note)
CASES = [
    ("brand family", "Extract the brand guidelines from this .docx brand template into a reusable Brand Profile.", "brand-docx", "format named"),
    ("brand family", "Extract the brand guidelines from this .pptx brand template into a reusable Brand Profile.", "brand-pptx", "format named"),
    ("brand family", "Extract the brand from this .xlsx brand template into a reusable Brand Profile.", "brand-xlsx", "format named"),
    ("social repurposing", "Turn this long blog post into a LinkedIn post with a point of view and a golden quote.", "blog-to-linkedin-post", "platform named"),
    ("social repurposing", "Turn this long blog post into a Twitter/X post with a sharp content angle.", "blog-to-twitter-post", "platform named"),
    ("reporting cadence", "写一份项目进展汇报，含红绿灯状态、里程碑追踪和风险矩阵。", "project-update", "one-off status"),
    ("reporting cadence", "写本周周报，结论先行，不要空话。", "weekly-report", "weekly cadence"),
    ("deck vs pptx", "Edit the existing deck: fix the wording in slide 3 and update the chart on slide 5.", "hands-on-deck", "edit an existing .pptx"),
    ("deck vs pptx", "Create a new pitch deck with five slides about our new pricing model.", "pptx", "create a new .pptx"),
    ("document formats", "Read this Word document and summarise the key decisions in it.", "docx", "Word document"),
    ("document formats", "Read this PDF and extract the tables from it.", "pdf", "PDF file"),
    ("dev loops", "Help me build a small 2D browser game from scratch: design the GDD, pick an engine, implement and test it.", "game-dev-loop", "game domain"),
    ("dev loops", "Help me implement a new REST endpoint in an existing service: plan it, write it test-first, then verify it.", "software-dev-loop", "general software"),
    ("grilling", "Grill me on this design proposal until the plan is sharp.", "grill-me", "questions only"),
    ("grilling", "Grill me on this design proposal and also produce an ADR and a glossary as we go.", "grill-with-docs", "questions plus artifacts"),
    ("company style", "把这份周报按 Google OKR + GRAD 的格式改写。", "style-google", "one named company"),
]


def run_case(case):
    group, prompt, expected, note = case
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "out.jsonl"
        try:
            proc = subprocess.run(
                [CLI, "-p", prompt, "--output-format", "stream-json", "--verbose"],
                cwd=CWD, capture_output=True, text=True, encoding="utf-8",
                errors="replace", timeout=180,
            )
        except subprocess.TimeoutExpired:
            return {"group": group, "prompt": prompt, "expected": expected, "note": note,
                    "picked": [], "verdict": "TIMEOUT"}
        out.write_text(proc.stdout or "", encoding="utf-8")
        picked = []
        for line in (proc.stdout or "").splitlines():
            if '"tool_use"' not in line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            msg = rec.get("message") or {}
            for block in (msg.get("content") or []):
                if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("name") == "Skill":
                    arg = (block.get("input") or {}).get("skill")
                    if arg:
                        picked.append(arg)
        if not picked:
            verdict = "ABSTAIN"
        elif expected in picked:
            verdict = "PASS"
        else:
            verdict = "FAIL"
        return {"group": group, "prompt": prompt, "expected": expected, "note": note,
                "picked": picked, "verdict": verdict}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--timeout", type=int, default=180)
    ap.add_argument("--json", default=None)
    args = ap.parse_args()

    print(f"running {len(CASES)} trigger prompts, {args.workers} at a time, "
          f"timeout {args.timeout}s each\n")
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        results = list(ex.map(run_case, CASES))

    results.sort(key=lambda r: (r["group"], r["expected"]))
    width = max(len(r["prompt"]) for r in results)
    for r in results:
        mark = {"PASS": "ok  ", "FAIL": "FAIL", "ABSTAIN": "none", "TIMEOUT": "TIME"}[r["verdict"]]
        print(f"{mark} [{r['group']:<20}] {r['prompt'][:width]:<{width}}  -> {r['picked'] or '-'}")
    passed = sum(1 for r in results if r["verdict"] == "PASS")
    failed = [r for r in results if r["verdict"] == "FAIL"]
    abstained = [r for r in results if r["verdict"] == "ABSTAIN"]
    timed = [r for r in results if r["verdict"] == "TIMEOUT"]
    print(f"\nPASS={passed}  FAIL={len(failed)}  ABSTAIN={len(abstained)}  TIMEOUT={len(timed)}  of {len(results)}")
    for r in failed:
        print(f"  FAIL {r['expected']} <- picked {r['picked']}  ({r['prompt'][:70]})")
    for r in timed:
        print(f"  TIMEOUT {r['expected']}  ({r['prompt'][:70]})")
    if args.json:
        Path(args.json).write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
