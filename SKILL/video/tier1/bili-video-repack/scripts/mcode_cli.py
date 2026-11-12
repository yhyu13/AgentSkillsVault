# -*- coding: utf-8 -*-
"""Call the mcode-tools CLI from Python.

mcode-tools ships as a .cmd dispatcher, so subprocess.run(list, shell=False)
fails with WinError 2. Go through cmd.exe instead, using the official
launcher so its region/auth env handling stays authoritative.
"""
import json
import os
import re
import subprocess

LAUNCHER = r"C:\Users\yuhang\.minimax\bin\mcode-tools.cmd"


def _cmdline(args):
    return subprocess.list2cmdline([LAUNCHER] + list(args))


def mcode(args, timeout=1200, check=False):
    """Run mcode-tools with args, return (rc, stdout, stderr)."""
    p = subprocess.run(_cmdline(args), shell=True, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout)
    if check and p.returncode != 0:
        raise RuntimeError("mcode-tools failed rc=%d: %s" % (p.returncode, p.stderr[-800:]))
    return p.returncode, p.stdout, p.stderr


def mcode_json(args, timeout=1200):
    """Run mcode-tools and parse the JSON object it prints on stdout."""
    rc, out, err = mcode(args, timeout=timeout)
    if rc != 0:
        raise RuntimeError("mcode-tools failed rc=%d: %s" % (rc, err[-800:]))
    m = re.search(r"\{.*\}", out, re.S)
    if not m:
        raise RuntimeError("no JSON in output: %s" % out[:800])
    return json.loads(m.group(0))
