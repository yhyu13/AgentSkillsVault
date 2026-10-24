#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Probe an ELF .so: class/machine, section headers, PT_NOTE contents.

Works on Python 2.7 and 3.x (no f-strings, bytes-safe).
Usage: python elf_probe.py <path.so>

Decision ladder (see SKILL.md):
- section table intact  -> parse .comment for the clang signature strings
- PT_NOTE ndk_version   -> direct NDK letter answer (newer NDK crtbegin only)
- stripped (UE Shipping)-> PT_NOTE shows only GNU build-id; fall back to
                          scan_clang_strings.py
"""
import struct, sys, binascii

PT_NAMES = {1: "LOAD", 2: "DYNAMIC", 3: "INTERP", 4: "NOTE", 6: "PHDR", 7: "TLS",
            0x6474e550: "GNU_EH_FRAME", 0x6474e551: "GNU_STACK", 0x6474e552: "GNU_RELRO",
            0x6474e553: "GNU_PROPERTY"}


def printable(b):
    try:
        s = b.rstrip(b"\x00").decode("ascii")
    except Exception:
        return None
    if len(s) > 0 and all(32 <= ord(c) < 127 for c in s):
        return s
    return None


def main(path):
    f = open(path, "rb")
    ident = f.read(16)
    if ident[:4] != b"\x7fELF":
        print("ERROR: not an ELF file: %s" % path)
        return 2
    ei_class = ord(ident[4:5])
    cls = "ELF64" if ei_class == 2 else "ELF32"
    print("file: %s" % path)
    print("class: %s" % cls)

    if ei_class == 2:
        f.seek(0x20); e_phoff, = struct.unpack("<Q", f.read(8))
        f.seek(0x28); e_shoff, = struct.unpack("<Q", f.read(8))
        f.seek(0x36); e_phentsize, e_phnum = struct.unpack("<HH", f.read(4))
        f.seek(0x3A); e_shentsize, e_shnum, e_shstrndx = struct.unpack("<HHH", f.read(6))
        sh_fmt, ph_fmt = "<IIQQQQ", "<IIQQQQQQ"
    else:
        f.seek(0x1C); e_phoff, = struct.unpack("<I", f.read(4))
        f.seek(0x20); e_shoff, = struct.unpack("<I", f.read(4))
        f.seek(0x2A); e_phentsize, e_phnum = struct.unpack("<HH", f.read(4))
        f.seek(0x2E); e_shentsize, e_shnum, e_shstrndx = struct.unpack("<HHH", f.read(6))
        sh_fmt, ph_fmt = "<IIIIII", "<IIIIIIII"

    # section header count is the stripped-build tell
    print("sections: e_shnum=%d (a stripped UE Shipping .so has ~4-6; intact has dozens+)" % e_shnum)

    if e_shnum and e_shoff:
        sections = []
        f.seek(e_shoff)
        for _ in range(e_shnum):
            hdr = f.read(e_shentsize)
            vals = struct.unpack(sh_fmt, hdr[:struct.calcsize(sh_fmt)])
            sections.append(vals)
        # ELF64: sh_name@0, sh_type@1...; ELF32 same field order, different widths.
        # We only need shstrtab to resolve names; keep it simple for the common case.
        if ei_class == 2:
            shstr = sections[e_shstrndx]
            f.seek(shstr[4]); strtab = f.read(shstr[5])
            names = []
            for v in sections:
                off = v[0]
                end = strtab.find(b"\x00", off)
                names.append(strtab[off:end].decode("ascii", "replace"))
            print("section names: %s" % ", ".join(names))
            if ".comment" in names:
                idx = names.index(".comment")
                f.seek(sections[idx][4]); data = f.read(sections[idx][5])
                print(".comment contents:")
                for part in data.replace(b"\x00", b"\n").split(b"\n"):
                    if len(part) >= 4:
                        print("  %s" % part.decode("utf-8", "replace"))
        else:
            print("(ELF32 name resolution not implemented; use scan_clang_strings.py)")

    # program headers: list them, parse PT_NOTE fully
    notes_found = False
    for i in range(e_phnum):
        f.seek(e_phoff + i * e_phentsize)
        hdr = f.read(e_phentsize)
        vals = struct.unpack(ph_fmt, hdr[:struct.calcsize(ph_fmt)])
        if ei_class == 2:
            p_type, p_flags, p_offset, p_vaddr, p_paddr, p_filesz, p_memsz, p_align = vals
        else:
            p_type, p_offset, p_vaddr, p_paddr, p_filesz, p_memsz, p_flags, p_align = vals
        tname = PT_NAMES.get(p_type, "0x%x" % p_type)
        if p_type in (4, 2) or i < 2:
            print("PHDR[%02d] %-12s offset=0x%x filesz=0x%x" % (i, tname, p_offset, p_filesz))
        if p_type != 4:
            continue
        f.seek(p_offset)
        data = f.read(p_filesz)
        pos = 0
        while pos + 12 <= len(data):
            namesz, descsz, ntype = struct.unpack("<III", data[pos:pos + 12])
            pos += 12
            name = data[pos:pos + namesz].rstrip(b"\x00")
            pos += (namesz + 3) & ~3
            desc = data[pos:pos + descsz]
            pos += (descsz + 3) & ~3
            notes_found = True
            p = printable(desc)
            if ntype == 1 and descsz == 4:
                api = struct.unpack("<I", desc)[0]
                print("  note name=%r type=%d -> Android API level %d" % (name.decode(), ntype, api))
            elif p is not None:
                print("  note name=%r type=%d -> %r (ndk_version note would look like this)" % (name.decode(), ntype, p))
            else:
                print("  note name=%r type=%d descsz=%d hex=%s" % (name.decode(), ntype, descsz, binascii.hexlify(desc)))
    if not notes_found:
        print("PT_NOTE: none found")
    f.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
