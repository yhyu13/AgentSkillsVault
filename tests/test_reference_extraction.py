from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "docs/skill-capacity-audit"))

from score_skills import collect_refs  # noqa: E402


class ReferenceExtractionTests(unittest.TestCase):
    def test_trailing_sentence_punctuation_is_not_part_of_path(self):
        refs = collect_refs("See references/music/sound-design.md. Also references/json-schema.md.")
        self.assertIn("references/music/sound-design.md", refs)
        self.assertIn("references/json-schema.md", refs)
        self.assertNotIn("references/music/sound-design.md.", refs)

    def test_ellipsis_placeholder_does_not_remain_a_file_path(self):
        refs = collect_refs("Asset paths are root-relative (`assets/...`), in sub-compositions too.")
        self.assertNotIn("assets/...", refs)

    def test_markdown_link_anchor_is_stripped(self):
        refs = collect_refs("[doc](references/guide.md#section)")
        self.assertIn("references/guide.md", refs)


if __name__ == "__main__":
    unittest.main()
