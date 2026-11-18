#!/usr/bin/env python3
"""Behavior checks for the ladder. Run: python scripts/test_check_ladder.py"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHECK = HERE / "check_ladder.py"


def run(data, want=None):
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / "handoff.json"
        path.write_text(json.dumps(data), encoding="utf-8")
        command = [sys.executable, str(CHECK), str(path)]
        if want is not None:
            command.extend(["--want", str(want)])
        result = subprocess.run(command, capture_output=True)
        output = result.stdout.decode("utf-8")
        return result.returncode, json.loads(output)


BASE = {
    "current_rung": 1,
    "repeated_errors": [
        {"name": "口头完成", "count": 2},
        {"name": "同一盲点", "count": 2},
        {"name": "写了提醒仍再犯", "count": 2},
    ],
    "evidence_count": 0,
    "author": "writer",
    "reviewer": "",
    "accepted_without_rewrite": 0,
    "clean_mornings": 0,
    "merge_requested": False,
    "done_definition": "三条都有计数",
}


def expect(name, code, ok, data, want=None):
    actual_code, payload = run(data, want)
    if actual_code != code or payload["ok"] is not ok:
        raise SystemExit("%s failed: %s %s" % (name, actual_code, payload))
    print("ok", name)


def main():
    expect("观察够三种，只能停在第2阶", 0, True, BASE, 2)
    expect("没有独立审查者，不能进第3阶", 1, False, BASE, 3)

    reviewed = dict(BASE, evidence_count=2, reviewer="other")
    expect("有证据且审查者不同，进入第3阶", 0, True, reviewed, 3)

    same = dict(reviewed, reviewer="writer")
    expect("作者兼审查者，拒绝第3阶", 1, False, same, 3)

    accepted = dict(reviewed, accepted_without_rewrite=3, clean_mornings=3)
    expect("连续接受三次，进入第4阶", 0, True, accepted, 4)
    expect("没人要求合并，不能自动合并", 1, False, accepted, 5)

    asked = dict(accepted, merge_requested=True)
    expect("用户要求合并且早晨干净，允许", 0, True, asked, 5)

    vague = dict(BASE, done_definition="尽量改得更好看")
    expect("模糊完成条件直接失败", 1, False, vague, 2)

    disguised = dict(reviewed, reviewer=" Writer ")
    expect("换大小写和空格仍是同一人", 1, False, disguised, 3)

    mixed = dict(BASE)
    mixed["repeated_errors"] = list(BASE["repeated_errors"]) + [{"name": "新错误", "count": 1}]
    expect("混进一次新错误，整份观察无效", 1, False, mixed, 2)

    soft = dict(BASE, done_definition="尽可能改好")
    expect("尽可能也是模糊完成条件", 1, False, soft, 2)

    claimed = dict(BASE, current_rung=4)
    expect("自报第4阶但不能用低阶检查蒙混", 1, False, claimed, None)

    alias = dict(reviewed, reviewer="writer-reviewer")
    expect("角色名包含原作者，仍不算另一个人", 1, False, alias, 3)

    vague_claim = dict(BASE, current_rung=4, done_definition="尽可能更好一些")
    code, payload = run(vague_claim, None)
    if code != 1 or not any("模糊词" in item for item in payload["reasons"]):
        raise SystemExit("模糊词被阶位错误盖住: %s %s" % (code, payload))
    print("ok", "自报高阶时仍先报模糊词")
    print("13 checks passed")


if __name__ == "__main__":
    main()
