# -*- coding: utf-8 -*-
"""Check that a practice card keeps the talk's method.

Exit 0 means the required fields and qualifiers are present.
It does not prove that practice worked.
"""
import re
import sys

REQUIRED = ("具体事项", "分步计划", "略高难度", "全程专注", "反馈及原因", "指导者", "分散到一周", "刻意练习时长", "睡眠")


def fail(message):
    print(message)
    return 1


def main():
    if len(sys.argv) != 2:
        return fail("usage: check_plan.py <session-card.md>")
    try:
        text = open(sys.argv[1], encoding="utf-8").read()
    except OSError:
        return fail("missing card")
    for field in REQUIRED:
        match = re.search(r"%s[^\n:：]*[:：]\s*(.+)" % re.escape(field), text)
        if not match or not match.group(1).strip():
            return fail("missing " + field)
    if "讲者转述" not in text and "未知" not in text:
        return fail("feedback needs a source or 未知")
    if re.search(r"已证实|一定有效|保证变强", text):
        return fail("card states an unproven guarantee")
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
