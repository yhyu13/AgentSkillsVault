from pathlib import Path
from tempfile import TemporaryDirectory
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.skills_lock import tree_hash


class TreeHashLineEndingTests(unittest.TestCase):
    def test_text_files_hash_identically_with_lf_and_crlf(self):
        with TemporaryDirectory() as temp:
            root = Path(temp)
            lf = root / "lf"
            crlf = root / "crlf"
            lf.mkdir()
            crlf.mkdir()
            (lf / "notes.md").write_bytes("line one\nline two\n".encode("utf-8"))
            (crlf / "notes.md").write_bytes("line one\r\nline two\r\n".encode("utf-8"))

            self.assertEqual(tree_hash(lf), tree_hash(crlf))

    def test_binary_files_keep_byte_sensitive_hashes(self):
        with TemporaryDirectory() as temp:
            root = Path(temp)
            a = root / "a"
            b = root / "b"
            a.mkdir()
            b.mkdir()
            (a / "image.bin").write_bytes(b"PNG\x00\r\n")
            (b / "image.bin").write_bytes(b"PNG\x00\n")

            self.assertNotEqual(tree_hash(a), tree_hash(b))


if __name__ == "__main__":
    unittest.main()