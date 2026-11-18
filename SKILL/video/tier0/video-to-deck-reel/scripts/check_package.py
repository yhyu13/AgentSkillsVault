# -*- coding: utf-8 -*-
"""Check the skill package itself, not the video it produces.

    python check_package.py <skill-dir>

Six checks, each with a concrete failure message:

  frontmatter  --- name/description/version present; name == directory name
  links        every relative path mentioned in any .md file exists
  scripts      every .py compiles, every .mjs/.js passes `node --check`
  required     the entry points named in SKILL.md are actually shipped
  wiring       every script a shipped script invokes exists, the flags the docs
               promise exist in argparse, and theme.json is really read
  hygiene      no TODO / FIXME / 占位 / 待补充 in prose
  examples     examples/ parses as JSON and keeps the required keys

`wiring` exists because a real defect passed every other check: pipeline.py
called a preview script that had been renamed, and the docs advertised flags
that argparse did not have. Ship-time checks have to read the call sites.

Run this before copying a skill into the vault. It is the only check here that
looks at the package rather than at one project built with it.
"""
import json
import os
import re
import subprocess
import sys

SYMBOLS = ("TODO", "FIXME", "TBD", "placeholder", "占位", "待补充", "待完善", "未实现")
PATH_RE = re.compile(r"`((?:references|scripts|examples|templates|assets)/[A-Za-z0-9_.\-\u4e00-\u9fff/]+)`")
FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)
REQUIRED = [
    "SKILL.md",
    "scripts/pipeline.py",
    "scripts/fetch_bili.py",
    "scripts/transcribe_zh.py",
    "scripts/transcribe_all.py",
    "scripts/check_narration.py",
    "scripts/tts_edge.py",
    "scripts/build_timeline.py",
    "scripts/render_frames.mjs",
    "scripts/check_frames.py",
    "scripts/check_deck.py",
    "scripts/build_deck.js",
    "scripts/deck_preview.py",
    "scripts/shot_preview.mjs",
]


def frontmatter(text):
    m = FM_RE.match(text)
    if not m:
        return {}
    data, key = {}, None
    for line in m.group(1).splitlines():
        if re.match(r"^[A-Za-z_][\w\-]*:", line):
            k, _, v = line.partition(":")
            key = k.strip()
            data[key] = v.strip().strip('"')
        elif key and line.strip():
            data[key] += " " + line.strip().strip('"')
    return data


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    root = os.path.abspath(sys.argv[1])
    name = os.path.basename(root.rstrip(os.sep))
    problems = []

    skill_md = os.path.join(root, "SKILL.md")
    if not os.path.isfile(skill_md):
        print("SKILL.md 不存在：%s" % skill_md)
        return 1
    text = open(skill_md, encoding="utf-8").read()

    fm = frontmatter(text)
    for key in ("name", "description", "version"):
        if not fm.get(key):
            problems.append("frontmatter 缺 %s" % key)
    if fm.get("name") and fm["name"] != name:
        problems.append("name=%s 与目录名 %s 不一致" % (fm["name"], name))
    if fm.get("description") and len(fm["description"]) < 80:
        problems.append("description 只有 %d 字，触发词不足" % len(fm["description"]))

    docs = [skill_md] + [os.path.join(dp, f)
                         for dp, _, fs in os.walk(os.path.join(root, "references"))
                         for f in fs if f.endswith(".md")]
    for doc in docs:
        body = open(doc, encoding="utf-8").read()
        for ref in sorted(set(PATH_RE.findall(body))):
            if not os.path.exists(os.path.join(root, ref)):
                problems.append("%s 引用 %s 不存在" % (os.path.relpath(doc, root), ref))
        # references 里的“未实现”是转述原片的合法用词（见 verified.md），只在 SKILL.md 当占位词
        allowed = ("未实现",) if doc != skill_md else ()
        for word in SYMBOLS:
            if word in body and word not in allowed:
                problems.append("%s 出现占位词 %s" % (os.path.relpath(doc, root), word))

    for rel in REQUIRED:
        if not os.path.exists(os.path.join(root, rel)):
            problems.append("缺必需文件 %s" % rel)

    for dp, _, fs in os.walk(root):
        for f in fs:
            path = os.path.join(dp, f)
            if f.endswith(".py"):
                proc = subprocess.run([sys.executable, "-m", "py_compile", path],
                                      capture_output=True, text=True)
                if proc.returncode != 0:
                    problems.append("%s 编译失败：%s"
                                    % (os.path.relpath(path, root), proc.stderr.strip().splitlines()[-1:]))
            elif f.endswith((".mjs", ".js")):
                proc = subprocess.run(["node", "--check", path], capture_output=True, text=True)
                if proc.returncode != 0:
                    problems.append("%s 语法错误：%s"
                                    % (os.path.relpath(path, root), proc.stderr.strip().splitlines()[:1]))

    # --- wiring: a script that calls a missing file breaks "one command"
    for dp, _, fs in os.walk(os.path.join(root, "scripts")):
        for f in fs:
            if not f.endswith((".py", ".mjs", ".js")):
                continue
            body = open(os.path.join(dp, f), encoding="utf-8").read()
            refs = set(re.findall(r'(?:py\("|HERE,\s*"|"scripts/)([A-Za-z0-9_]+\.(?:py|mjs|js))"', body))
            for ref in sorted(refs):
                if ref == f:
                    continue
                if not os.path.exists(os.path.join(root, "scripts", ref)):
                    problems.append("%s 调用 %s，但包里没有" % (f, ref))
            if f == "build_deck.js" and "theme.json" not in body:
                problems.append("build_deck.js 没有读取 theme.json（颜色会与文档脱钩）")
    # flags: every --flag the docs show must exist in some script's argparse.
    # Limiting this to one script or one position let a stale flag through.
    all_flags = set()
    for dp, _, fs in os.walk(os.path.join(root, "scripts")):
        for f in fs:
            if f.endswith((".py", ".mjs", ".js")):
                body = open(os.path.join(dp, f), encoding="utf-8").read()
                all_flags |= set(re.findall(r'add_argument\("(--[a-z0-9-]+)"', body))
                all_flags |= set(re.findall(r'pick\("(--[a-z0-9-]+)"', body))
                # a tiny allowlist for flags accepted by string comparison
                # instead of argparse; a blanket literal scan would let a stale
                # flag in a comment count as implemented
                for flag in ("--selftest",):
                    if '"%s"' % flag in body:
                        all_flags.add(flag)
    documented = set(re.findall(r"(?<![\w-])(--[a-z][a-z0-9-]+)", text))
    for flag in sorted(documented - all_flags):
        problems.append("SKILL.md 写了 %s，但没有脚本接受这个参数" % flag)

    ex = os.path.join(root, "examples")
    for f in sorted(os.listdir(ex)) if os.path.isdir(ex) else []:
        if not f.endswith(".json"):
            continue
        try:
            data = json.load(open(os.path.join(ex, f), encoding="utf-8"))
        except Exception as exc:
            problems.append("examples/%s 不是合法 JSON：%s" % (f, exc))
            continue
        if f == "narration.json":
            if not data.get("voice") or not data.get("segments"):
                problems.append("examples/narration.json 缺 voice 或 segments")
            else:
                ids = [s.get("id") for s in data["segments"]]
                if len(ids) != len(set(ids)):
                    problems.append("examples/narration.json id 重复")
        if f == "deck.json" and not data.get("slides"):
            problems.append("examples/deck.json 缺 slides")
        if f == "theme.json" and "colors" not in data:
            problems.append("examples/theme.json 缺 colors")

    if problems:
        print("\n".join(problems))
        return 1
    scripts = len([f for _, _, fs in os.walk(root) for f in fs
                   if f.endswith((".py", ".mjs", ".js"))])
    print("PASS %s  scripts=%d docs=%d" % (name, scripts, len(docs)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
