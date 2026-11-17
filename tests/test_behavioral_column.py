"""The behavioural column: a static score must not read as "verified".

`score_skills.py` grades the shape of a package.  Whether the model ever picks
the skill is a different question, answered by `trigger_sweep.py`; these tests
pin the join between the two, because the whole point of the column is that a
10.00 with no evidence cannot be mistaken for a 10.00 that triggers.
"""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCORE = (Path(__file__).resolve().parents[1]
         / "docs" / "skill-capacity-audit" / "score_skills.py")
spec = importlib.util.spec_from_file_location("score_skills", SCORE)
score_skills = importlib.util.module_from_spec(spec)
spec.loader.exec_module(score_skills)


class BehaviouralTagTest(unittest.TestCase):
    def test_verdicts_map_to_tags(self):
        mapping = {"PASS": "tested-pass", "WRONG": "tested-wrong",
                   "ABSTAIN": "tested-abstain", "TIMEOUT": "timeout",
                   "ERROR": "error"}
        for verdict, tag in mapping.items():
            self.assertEqual(score_skills.BEHAVIOURAL_TAGS[verdict], tag)

    def test_unmeasured_tier_b_is_hidden_not_untested(self):
        self.assertEqual(score_skills.behavioural_tag("pptx", {}, {"pptx": "B"}),
                         "hidden")
        self.assertEqual(score_skills.behavioural_tag("cook", {}, {"cook": "C"}),
                         "vault-only")
        self.assertEqual(score_skills.behavioural_tag("docx", {}, {"docx": "A"}),
                         "untested")
        self.assertEqual(score_skills.behavioural_tag("unknown", {}, {}),
                         "untested")

    def test_measured_skill_keeps_its_evidence(self):
        beh = {"docx": "tested-pass"}
        # a passing measurement outranks the tier guess
        self.assertEqual(score_skills.behavioural_tag("docx", beh, {"docx": "B"}),
                         "tested-pass")


class LoadBehaviouralTest(unittest.TestCase):
    def test_reads_a_sweep_result_file(self):
        payload = {"results": [
            {"skill": "cook", "verdict": "PASS", "picked": ["cook"]},
            {"skill": "opendeck", "verdict": "WRONG", "picked": ["html-ppt"]},
            {"skill": "ghost", "verdict": "SOMETHING-NEW"},
        ]}
        with tempfile.TemporaryDirectory() as td:
            f = Path(td) / "results.json"
            f.write_text(json.dumps(payload), encoding="utf-8")
            got = score_skills.load_behavioral(f)
        self.assertEqual(got["cook"], "tested-pass")
        self.assertEqual(got["opendeck"], "tested-wrong")
        self.assertEqual(got["ghost"], "untested")

    def test_missing_file_fails_loudly(self):
        with self.assertRaises(SystemExit):
            score_skills.load_behavioral(Path("does-not-exist.json"))

    def test_no_flag_means_no_column_source(self):
        self.assertEqual(score_skills.load_behavioral(""), {})

    def test_tiers_file_parses(self):
        with tempfile.TemporaryDirectory() as td:
            f = Path(td) / "skill-tiers.txt"
            f.write_text("# header\ncook|A\npptx|B\n", encoding="utf-8")
            self.assertEqual(score_skills.load_tiers(f), {"cook": "A", "pptx": "B"})
        self.assertEqual(score_skills.load_tiers(None), {})


if __name__ == "__main__":
    unittest.main()
