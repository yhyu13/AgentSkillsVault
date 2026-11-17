#!/usr/bin/env python3
"""Behavioural trigger sweep: which skills does the harness actually pick?

`score_skills.py` scores the shape of a package (frontmatter, body length,
payload, links, hygiene).  All five dimensions can be perfect on a skill the
model never chooses.  That is queue item #73 in SKILL_CANDIDATES.md: 292 skills
carry a static score and almost none carry behavioural evidence.

`trigger_test.py` holds 16 hand-written pair-discrimination cases.  This script
does the other half: one realistic user request per curated tier-A skill, run
through the real harness, recording which skill the model actually invoked.

Two phases, kept apart on purpose so the prompts are reviewable and the run is
reproducible:

  generate   ask a model to write ONE realistic user sentence per skill, from
             the skill's name + description, with the name forbidden in the
             sentence.  Output is a checked-in cases file.
  run        fire each sentence at the harness in a scratch cwd, read the
             `Skill` tool calls out of the stream-json transcript, and write
             verdicts.

Verdicts
  PASS      the expected skill was invoked
  WRONG     a different skill was invoked (this is the interesting failure:
            two descriptions compete for one request)
  ABSTAIN   no skill was invoked at all
  TIMEOUT   the call did not finish inside --timeout
  ERROR     the harness ran but the transcript could not be parsed

Caveat that must travel with the numbers: the prompts are generated from the
descriptions the model also reads in the listing, so this measures
*ambiguity between neighbours*, not "would a real user's request reach this
skill".  Real-session prompts are the other arm and are not built yet.

Usage
  python trigger_sweep.py generate --out trigger-cases.json [--workers 4]
  python trigger_sweep.py run --cases trigger-cases.json \\
      --json trigger-results.json --md trigger-report.md [--workers 6]
Exit code 0 always for `run` (a failing skill is data, not a tool error);
2 when the case file is unusable, 3 when the harness is missing.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import shutil
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
VAULT = HERE.parent.parent
CLI = os.environ.get("TRIGGER_CLI", "claude")
CUE_MARKERS = ("use when", "use this when", "use this skill", "use for",
               "used when", "when the user", "when someone", "trigger",
               "invoke", "触发", "适用", "什么时候用", "用户说", "用户给")


# ---------------------------------------------------------------- vault inputs

def load_tiers() -> dict:
    f = VAULT / "scripts" / "skill-tiers.txt"
    out = {}
    for line in f.read_text(encoding="utf-8").splitlines():
        if "|" in line and not line.startswith("#"):
            name, tier = line.split("|", 1)
            out[name.strip()] = tier.strip()
    return out


def load_manifest() -> list:
    f = VAULT / "scripts" / "install-manifest.txt"
    rows = []
    for line in f.read_text(encoding="utf-8").splitlines():
        if "|" in line and not line.startswith("#"):
            name, path = line.split("|")[:2]
            rows.append((name.strip(), path.strip()))
    return rows


def parse_frontmatter(text: str):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        return {}
    data, key, buf = {}, None, []
    for line in m.group(1).splitlines():
        if re.match(r"^[A-Za-z_][\w\-]*:", line):
            if key:
                data[key] = " ".join(buf).strip().strip('"\'')
            k, _, v = line.partition(":")
            key, buf = k.strip(), [v.strip()]
        elif key:
            buf.append(line.strip())
    if key:
        data[key] = " ".join(buf).strip().strip('"\'')
    return data


def clean_description(text: str) -> str:
    return re.sub(r"^[|>\-]+\s*", "", (text or "").strip())


def tier_a_skills() -> list:
    tiers = load_tiers()
    out = []
    for name, path in load_manifest():
        if tiers.get(name) != "A":
            continue
        md = VAULT / path / "SKILL.md"
        if not md.is_file():
            continue
        fm = parse_frontmatter(md.read_text(encoding="utf-8", errors="replace"))
        out.append({"skill": name, "path": path,
                    "description": clean_description(fm.get("description"))})
    return out


def store_visible() -> set:
    """Skills the harness can see at all (installed in the canonical store)."""
    store = Path(os.path.expanduser("~/.claude/skills"))
    if not store.is_dir():
        return set()
    return {p.name for p in store.iterdir() if (p / "SKILL.md").is_file()}


# ------------------------------------------------------------------- generate

GEN_INSTRUCTIONS = """你在为一个 agent 的 skill 选择机制造测试用例。

下面给你 {n} 个 skill 的 name 与 description。为**每一个** skill 写一句真实用户会说的话（中文，10–45 字），要求：

1. 这句话应该让 agent 主动选中该 skill，而不是它的邻居。
2. **禁止**出现 skill 的名字，也禁止英文拼写，哪怕描述里就是这么写的。
3. **禁止照抄**描述里的原句或专有短语；用用户自己的说法重写。
4. 一句话，不要编号、不要解释、不要引号。
5. 如果描述里有两个以上功能，挑最能区分它的那一个。

只输出 JSON 数组，形如 [{{"skill": "<name>", "prompt": "<那句话>"}}]，一个不漏。

skills:
{blocks}
"""


def gen_batch(batch: list, timeout: int) -> dict:
    blocks = "\n".join(
        "### %s\n%s" % (s["skill"], (s["description"] or "")[:900]) for s in batch)
    prompt = GEN_INSTRUCTIONS.format(n=len(batch), blocks=blocks)
    try:
        proc = subprocess.run(
            [CLI, "-p", prompt, "--output-format", "json"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=timeout, cwd=tempfile.gettempdir())
    except subprocess.TimeoutExpired:
        return {}
    raw = proc.stdout or ""
    # `--output-format json` wraps the answer in {"type":"result","result":"..."};
    # the array is inside that string, so unwrap before looking for it.
    text = raw
    try:
        wrapper = json.loads(raw)
        if isinstance(wrapper, dict) and isinstance(wrapper.get("result"), str):
            text = wrapper["result"]
    except Exception:
        pass
    m = re.search(r"\[.*\]", text, re.S)
    if not m:
        return {}
    try:
        rows = json.loads(m.group(0))
    except Exception:
        return {}
    return {r.get("skill"): (r.get("prompt") or "").strip()
            for r in rows if isinstance(r, dict)}


def cmd_generate(args) -> int:
    skills = tier_a_skills()
    if args.limit:
        skills = skills[:args.limit]
    visible = store_visible()
    skills = [s for s in skills if not visible or s["skill"] in visible]
    print("generating prompts for %d tier-A skills" % len(skills), file=sys.stderr)

    batches = [skills[i:i + args.batch] for i in range(0, len(skills), args.batch)]
    prompts = {}
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        for got in ex.map(lambda b: gen_batch(b, args.timeout), batches):
            prompts.update({k: v for k, v in got.items() if k and v})

    cases, missing, leaked = [], [], []
    for s in skills:
        p = prompts.get(s["skill"], "")
        if not p:
            missing.append(s["skill"])
            continue
        if s["skill"].lower().replace("-", " ") in p.lower() or s["skill"].lower() in p.lower():
            leaked.append(s["skill"])
            continue
        cases.append({"skill": s["skill"], "prompt": p, "path": s["path"],
                      "source": "generated"})
    out = Path(args.out)
    out.write_text(json.dumps({"generated_by": CLI, "cases": cases,
                               "missing": missing, "leaked": leaked},
                              indent=2, ensure_ascii=False), encoding="utf-8")
    print("cases=%d missing=%d leaked=%d -> %s"
          % (len(cases), len(missing), len(leaked), out))
    if missing:
        print("  missing: " + " ".join(missing))
    if leaked:
        print("  leaked (name in prompt): " + " ".join(leaked))
    return 0


# ------------------------------------------------------------------------ run

def harness_error(stream: str) -> bool:
    """True only when the harness reported a failure of its own.

    Substring matching is not good enough: `duration_api_ms`, token counts and
    paths all contain "429", which is how two plain abstentions got misfiled as
    errors on the first run.
    """
    for line in stream.splitlines():
        if '"error"' not in line and '"is_error"' not in line:
            continue
        try:
            rec = json.loads(line)
        except Exception:
            continue
        if rec.get("type") == "error":
            return True
        if rec.get("type") == "result" and rec.get("is_error") is True:
            return True
    return False


def run_case(case: dict, timeout: int) -> dict:
    skill, prompt = case["skill"], case["prompt"]
    # Windows keeps a handle on the cwd of a child that is still exiting, so a
    # TemporaryDirectory here aborts the whole batch on cleanup (observed: 71
    # cases ran, then the run died before writing a single result).  Plain
    # mkdtemp + best-effort delete loses nothing.
    td = tempfile.mkdtemp(prefix="trigger-sweep-")
    try:
        try:
            proc = subprocess.run(
                [CLI, "-p", prompt, "--output-format", "stream-json", "--verbose"],
                cwd=td, capture_output=True, text=True, encoding="utf-8",
                errors="replace", timeout=timeout)
        except subprocess.TimeoutExpired:
            return {**case, "picked": [], "verdict": "TIMEOUT",
                    "said": "no result within %ds" % timeout}
        except OSError as exc:
            return {**case, "picked": [], "verdict": "ERROR", "detail": str(exc)}
        out = proc.stdout or ""
        last_text = ""
        for line in out.splitlines():
            if '"text"' not in line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            for block in (rec.get("message") or {}).get("content") or []:
                if isinstance(block, dict) and block.get("type") == "text":
                    last_text = (block.get("text") or "").strip()
        picked = []
        for line in out.splitlines():
            if '"tool_use"' not in line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            for block in (rec.get("message") or {}).get("content") or []:
                if (isinstance(block, dict) and block.get("type") == "tool_use"
                        and block.get("name") == "Skill"):
                    arg = (block.get("input") or {}).get("skill")
                    if arg:
                        picked.append(arg)
        if picked:
            verdict = "PASS" if skill in picked else "WRONG"
        elif harness_error(out):
            verdict = "ERROR"
        else:
            verdict = "ABSTAIN"
        return {**case, "picked": picked, "verdict": verdict,
                "exit": proc.returncode, "said": last_text[:240]}
    finally:
        shutil.rmtree(td, ignore_errors=True)


def cmd_run(args) -> int:
    src = Path(args.cases)
    if not src.is_file():
        print("case file not found: %s" % src, file=sys.stderr)
        return 2
    blob = json.loads(src.read_text(encoding="utf-8"))
    cases = blob.get("cases") or []
    if not cases:
        print("no cases in %s" % src, file=sys.stderr)
        return 2
    if args.limit:
        cases = cases[:args.limit]
    if subprocess.run([CLI, "--version"], capture_output=True).returncode != 0:
        print("harness not available: %s" % CLI, file=sys.stderr)
        return 3

    visible = store_visible()
    skipped = [c["skill"] for c in cases if visible and c["skill"] not in visible]
    cases = [c for c in cases if not visible or c["skill"] in visible]
    print("running %d prompts, %d workers, timeout %ds (skipped %d not installed)"
          % (len(cases), args.workers, args.timeout, len(skipped)), file=sys.stderr)

    # One bad case must not cost the whole run: results land on disk as they
    # arrive, so an abort still leaves usable evidence.
    partial = Path(args.json).with_suffix(".partial.jsonl")
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex, partial.open("w", encoding="utf-8") as sink:
        futures = {ex.submit(run_case, c, args.timeout): c for c in cases}
        for fut in as_completed(futures):
            case = futures[fut]
            try:
                row = fut.result()
            except Exception as exc:                      # noqa: BLE001
                row = {**case, "picked": [], "verdict": "ERROR", "detail": repr(exc)}
            results.append(row)
            sink.write(json.dumps(row, ensure_ascii=False) + chr(10))
            sink.flush()

    partial.unlink(missing_ok=True)
    order = {"PASS": 0, "WRONG": 1, "ABSTAIN": 2, "TIMEOUT": 3, "ERROR": 4}
    results.sort(key=lambda r: (order.get(r["verdict"], 9), r["skill"]))
    width = max((len(r["skill"]) for r in results), default=8)
    for r in results:
        mark = {"PASS": "ok  ", "WRONG": "WRNG", "ABSTAIN": "none",
                "TIMEOUT": "TIME", "ERROR": "ERR "}[r["verdict"]]
        print("%s %-*s %s | %s" % (mark, width, r["skill"],
                                   ",".join(r["picked"]) or "-", r["prompt"]))

    counts = {}
    for r in results:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    summary = " ".join("%s=%d" % (k, counts.get(k, 0))
                       for k in ("PASS", "WRONG", "ABSTAIN", "TIMEOUT", "ERROR"))
    print("\n%s  of %d" % (summary, len(results)))

    payload = {"cases_file": str(src), "cli": CLI,
               "counts": counts, "results": results,
               "skipped_not_installed": skipped}
    if args.json:
        Path(args.json).write_text(json.dumps(payload, indent=2, ensure_ascii=False),
                                   encoding="utf-8")
        print("wrote %s" % args.json)
    if args.md:
        Path(args.md).write_text(render_markdown(payload), encoding="utf-8")
        print("wrote %s" % args.md)
    return 0


def cmd_report(args) -> int:
    src = Path(args.results)
    if not src.is_file():
        print("results not found: %s" % src, file=sys.stderr)
        return 2
    payload = json.loads(src.read_text(encoding="utf-8"))
    rerun = None
    if args.rerun:
        rp = Path(args.rerun)
        if not rp.is_file():
            print("rerun results not found: %s" % rp, file=sys.stderr)
            return 2
        rerun = json.loads(rp.read_text(encoding="utf-8"))
    Path(args.md).write_text(render_markdown(payload, rerun), encoding="utf-8")
    print("wrote %s" % args.md)
    return 0


def render_markdown(payload: dict, rerun: dict | None = None) -> str:
    rows = payload["results"]
    c = payload["counts"]
    total = len(rows)
    lines = [
        "# Behavioural trigger sweep",
        "",
        "`score_skills.py` scores the shape of a package. This run asked the "
        "harness for real choices: one generated user sentence per curated "
        "tier-A skill, then read back which skill the model actually invoked.",
        "",
        "| verdict | n | share |",
        "| --- | --- | --- |",
    ]
    for k in ("PASS", "WRONG", "ABSTAIN", "TIMEOUT", "ERROR"):
        n = c.get(k, 0)
        lines.append("| %s | %d | %.0f%% |" % (k, n, 100.0 * n / total if total else 0))
    lines += ["", "## Every case", "",
              "| verdict | skill | picked | prompt |", "| --- | --- | --- | --- |"]
    for r in rows:
        lines.append("| %s | `%s` | %s | %s |" % (
            r["verdict"], r["skill"],
            ", ".join("`%s`" % p for p in r["picked"]) or "-",
            r["prompt"].replace("|", "\\|")))
    wrong = [r for r in rows if r["verdict"] == "WRONG"]
    if wrong:
        lines += ["", "## Competing descriptions (WRONG)", ""]
        for r in wrong:
            lines.append("- `%s` 被 `%s` 抢走：%s" % (
                r["skill"], ", ".join(r["picked"]), r["prompt"]))
    none = [r for r in rows if r["verdict"] == "ABSTAIN"]
    if none:
        lines += ["", "## Never picked (ABSTAIN)", ""]
        for r in none:
            lines.append("- `%s`：%s" % (r["skill"], r["prompt"]))
    if rerun:
        first = {r["skill"]: r for r in rows}
        lines += ["", "## 复跑（同一批非 PASS 用例再跑一次）", "",
                  "| skill | 第一次 | 第二次 | 第二次选中的 |",
                  "| --- | --- | --- | --- |"]
        for r in rerun.get("results", []):
            prev = first.get(r["skill"], {}).get("verdict", "-")
            lines.append("| `%s` | %s | %s | %s |" % (
                r["skill"], prev, r["verdict"],
                ", ".join("`%s`" % p for p in r["picked"]) or "-"))
        flipped = [r["skill"] for r in rerun.get("results", [])
                   if first.get(r["skill"], {}).get("verdict") != r["verdict"]]
        lines += ["", "两轮之间改判 %d 个：%s。**只有复现的 WRONG 才值得动 description**，"
                  "单轮结果不足以支撑一次改写。" % (
                      len(flipped), "、".join("`%s`" % s for s in flipped) or "—")]
    lines += [
        "",
        "## How to read this",
        "",
        "- Prompts were generated from the same descriptions the model reads "
        "in its skill listing, so PASS here mostly says \"the description is "
        "findable\", not \"a real user would land here\".",
        "- WRONG is the load-bearing signal: two neighbours claim the same "
        "request, and the description that loses is the one to sharpen.",
        "- ABSTAIN is ambiguous by construction: either the skill never wins "
        "the request, or the generated sentence was too vague to be a "
        "request at all (many mention a document or link that was never "
        "attached, and the model asks for it instead of picking a skill).",
        "- TIMEOUT means the call ran past the budget, not that it failed: two "
        "of the eight timeouts passed on a second run with a longer budget.",
        "",
        "Reproduce: `python docs/skill-capacity-audit/trigger_sweep.py run "
        "--cases docs/skill-capacity-audit/trigger-cases.json "
        "--json trigger-results.json --md trigger-report.md`",
        "",
    ]
    return "\n".join(lines)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="write one prompt per tier-A skill")
    g.add_argument("--out", default=str(HERE / "trigger-cases.json"))
    g.add_argument("--workers", type=int, default=4)
    g.add_argument("--batch", type=int, default=12)
    g.add_argument("--timeout", type=int, default=240)
    g.add_argument("--limit", type=int, default=0)
    g.set_defaults(func=cmd_generate)

    rep = sub.add_parser("report", help="re-render the markdown from saved results")
    rep.add_argument("--results", default=str(HERE / "2026-11-18-trigger-results.json"))
    rep.add_argument("--rerun", default="")
    rep.add_argument("--md", default=str(HERE / "2026-11-18-trigger-report.md"))
    rep.set_defaults(func=cmd_report)

    r = sub.add_parser("run", help="fire the prompts and read back the picks")
    r.add_argument("--cases", default=str(HERE / "trigger-cases.json"))
    r.add_argument("--json", default=str(HERE / "trigger-results.json"))
    r.add_argument("--md", default=str(HERE / "trigger-report.md"))
    r.add_argument("--workers", type=int, default=6)
    r.add_argument("--timeout", type=int, default=180)
    r.add_argument("--limit", type=int, default=0)
    r.set_defaults(func=cmd_run)

    args = ap.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
