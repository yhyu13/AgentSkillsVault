#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Scan one or more .so files for NDK/clang toolchain signature strings.

Works on Python 2.7 and 3.x (bytes regex via br"..." literals, mmap streaming).
Usage: python scan_clang_strings.py <path.so> [<path2.so> ...]

The decisive string format is:
  Android (<build-id>[, +pgo, +bolt, +lto, +mlgo], based on r<LLVM rev>) clang version <X.Y.Z>
- clang version pins the NDK family (major)
- the r<LLVM rev> pins the exact letter version via the NDK changelog
Do NOT use hit counts to find "the engine's" toolchain: .comment is
deduplicated at link time, every distinct string survives exactly once.
"""
import re, sys, mmap

PAT = re.compile(br"Android \(\d[\d,]*[^)]*\) clang version [0-9][^\x00\r\n]{0,120}")
PAT_SHORT = re.compile(br"clang version [0-9][^\x00\r\n]{0,120}")


def scan(path):
    f = open(path, "rb")
    mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
    print("=== %s (%d bytes) ===" % (path, len(mm)))
    seen = []
    for m in PAT.finditer(mm):
        s = m.group(0).decode("utf-8", "replace")
        if s not in seen:
            seen.append(s)
    for s in seen:
        print("  %s" % s)
    if not seen:
        # degraded: report short forms so the caller knows the file is not silent
        short = []
        for m in PAT_SHORT.finditer(mm):
            s = m.group(0).decode("utf-8", "replace")
            if s not in short:
                short.append(s)
            if len(short) >= 10:
                break
        if short:
            print("  (no full 'Android (...) clang version' strings; short forms found:)")
            for s in short:
                print("  %s" % s)
        else:
            print("  (no clang version strings found at all)")
    mm.close()
    f.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    for p in sys.argv[1:]:
        scan(p)
