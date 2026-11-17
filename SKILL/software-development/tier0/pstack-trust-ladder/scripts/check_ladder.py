#!/usr/bin/env python3
"""Check a pstack trust-ladder handoff.

The record is the only input. Missing evidence stays missing; this does not
infer a higher rung from hopeful wording.

Exit 0 when the record supports --want. Exit 1 when it does not.
"""
import argparse
import json
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

VAGUE = ("更好", "好看", "优化一下", "适当", "尽量", "差不多", "尽可能", "更好一些")


def load(path):
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("handoff must be a JSON object")
    return data


def errors(data):
    rows = data.get("repeated_errors") or []
    if not isinstance(rows, list):
        raise ValueError("repeated_errors must be a list")
    if any(not isinstance(row, dict) or int(row.get("count") or 0) < 2 for row in rows):
        return []
    return rows


def supports(data):
    """Return the highest rung this record has actually earned."""
    rung = 1
    if len(errors(data)) < 3:
        return rung
    rung = 2
    author = " ".join(str(data.get("author") or "").split()).casefold()
    reviewer = " ".join(str(data.get("reviewer") or "").split()).casefold()
    same_person = (not author or not reviewer or author == reviewer
                   or author in reviewer or reviewer in author)
    if int(data.get("evidence_count") or 0) >= 1 and not same_person:
        rung = 3
    else:
        return rung
    if int(data.get("accepted_without_rewrite") or 0) >= 3 and int(data.get("clean_mornings") or 0) >= 3:
        rung = 4
    return rung


def reasons(data, want):
    found = []
    definition = str(data.get("done_definition") or "")
    hits = [word for word in VAGUE if word in definition]
    if hits:
        found.append("完成条件含模糊词: " + "、".join(hits))
    earned = supports(data)
    if earned < want:
        found.append("记录只支持第 %d 阶，目标是第 %d 阶" % (earned, want))
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("handoff")
    parser.add_argument("--want", type=int, default=0,
                        help="target rung, 2-4; 5 means automatic merge")
    args = parser.parse_args()
    if args.want and args.want not in (2, 3, 4, 5):
        raise SystemExit("--want 只能是 2、3、4，或 5（自动合并）")
    data = load(args.handoff)
    earned = supports(data)
    claimed = int(data.get("current_rung") or 1)
    definition = str(data.get("done_definition") or "")
    vague_hits = [word for word in VAGUE if word in definition]
    if vague_hits:
        print(json.dumps({"earned_rung": earned, "target": args.want or earned, "ok": False,
                          "errors": len(errors(data)),
                          "reasons": ["完成条件含模糊词: " + "、".join(vague_hits)]},
                         ensure_ascii=False))
        return 1
    if claimed > earned:
        print(json.dumps({"earned_rung": earned, "target": args.want or earned, "ok": False,
                          "errors": len(errors(data)),
                          "reasons": ["current_rung 写成了第 %d 阶，记录只支持第 %d 阶" % (claimed, earned)]},
                         ensure_ascii=False))
        return 1
    target = args.want or earned
    failed = reasons(data, 4 if target == 5 else target)
    if target == 5 and not data.get("merge_requested"):
        failed.append("没有用户明确要求自动合并")
    print(json.dumps({
        "earned_rung": earned,
        "target": target,
        "ok": not failed,
        "errors": len(errors(data)),
        "reasons": failed,
    }, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
