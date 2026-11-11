from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from task_policy import (  # noqa: E402
    classify_paths,
    evaluate_authorization,
    extract_platform_evidence,
    grade_pull_request,
    has_merge_conflict,
    load_policy,
    path_matches,
    validate_platform_evidence,
)

POLICY = load_policy(ROOT / ".github/task-grade-policy.json")
HEAD_SHA = "a" * 40


def valid_evidence(platform: str = "ipados") -> dict:
    return {
        "head_sha": HEAD_SHA,
        "affected_platforms": [platform],
        "automated_tests": [
            {"command": "python -m unittest", "result": "pass", "evidence": "https://example.test/log"}
        ],
        "platform_checks": [
            {
                "platform": platform,
                "version": "18.x",
                "device_or_browser": "iPad real device",
                "method": "real-device",
                "result": "pass",
                "evidence": "https://example.test/screenshot",
            }
        ],
    }


def body_with(evidence: dict) -> str:
    return "## Platform verification\n\n```platform-verification\n" + json.dumps(evidence) + "\n```\n"


def git(repo: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=repo, text=True, capture_output=True, check=True)
    return result.stdout.strip()


class PolicyTests(unittest.TestCase):
    def test_path_patterns(self):
        self.assertTrue(path_matches(".github/workflows/pr-gate.yml", ".github/**"))
        self.assertTrue(path_matches("SKILL/a/references/x.md", "SKILL/**/references/**"))
        self.assertTrue(path_matches("SKILL/references/x.md", "SKILL/**/references/**"))
        self.assertFalse(path_matches("SKILL/a/SKILL.md", "SKILL/**/references/**"))
        self.assertTrue(path_matches("TEMPLATE", "TEMPLATE"))
        self.assertFalse(path_matches("TEMPLATE-GOVERNANCE", "TEMPLATE"))

    def test_red_overrides_green(self):
        grade, reasons = classify_paths(["SKILL/a/SKILL.md", ".github/workflows/x.yml"], POLICY)
        self.assertEqual(grade, "red")
        self.assertTrue(any(".github/workflows/x.yml" in reason for reason in reasons))

    def test_yellow_shared_doc(self):
        grade, _ = classify_paths(["docs/governance/task-grade-policy.md"], POLICY)
        self.assertEqual(grade, "yellow")

    def test_green_path(self):
        grade, reasons = classify_paths(["SKILL/a/scripts/fix.py"], POLICY)
        self.assertEqual(grade, "green")
        self.assertEqual(reasons, [])

    def test_conflict_condition_is_red(self):
        grade, reasons = classify_paths(["SKILL/a/scripts/fix.py"], POLICY, ["merge-conflict-with-base"])
        self.assertEqual(grade, "red")
        self.assertTrue(any("merge-conflict-with-base" in reason for reason in reasons))

    def test_extract_platform_block(self):
        evidence, error = extract_platform_evidence(body_with(valid_evidence()))
        self.assertIsNone(error)
        self.assertEqual(evidence["head_sha"], HEAD_SHA)

    def test_missing_block(self):
        evidence, error = extract_platform_evidence("no block")
        self.assertIsNone(evidence)
        self.assertIsNotNone(error)

    def test_valid_evidence(self):
        self.assertEqual(validate_platform_evidence(valid_evidence(), HEAD_SHA, POLICY), [])

    def test_head_sha_mismatch(self):
        evidence = valid_evidence()
        evidence["head_sha"] = "b" * 40
        errors = validate_platform_evidence(evidence, HEAD_SHA, POLICY)
        self.assertTrue(any("head_sha" in error for error in errors))

    def test_missing_platform_coverage(self):
        evidence = valid_evidence("ipados")
        evidence["affected_platforms"] = ["ipados", "windows"]
        errors = validate_platform_evidence(evidence, HEAD_SHA, POLICY)
        self.assertTrue(any("windows" in error for error in errors))

    def test_not_applicable_requires_reason(self):
        evidence = valid_evidence("not-applicable")
        check = evidence["platform_checks"][0]
        check["method"] = "not-applicable"
        check["platform"] = "not-applicable"
        errors = validate_platform_evidence(evidence, HEAD_SHA, POLICY)
        self.assertTrue(any("reason" in error for error in errors))
        check["reason"] = "documentation-only change"
        self.assertEqual(validate_platform_evidence(evidence, HEAD_SHA, POLICY), [])

    def test_failed_test_invalid(self):
        evidence = valid_evidence()
        evidence["automated_tests"][0]["result"] = "fail"
        errors = validate_platform_evidence(evidence, HEAD_SHA, POLICY)
        self.assertTrue(any("result must be pass" in error for error in errors))


class GitGradeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name)
        git(self.repo, "init", "-b", "main")
        git(self.repo, "config", "user.email", "test@example.test")
        git(self.repo, "config", "user.name", "Test")
        (self.repo / "base.txt").write_text("base\n", encoding="utf-8")
        git(self.repo, "add", "base.txt")
        git(self.repo, "commit", "-m", "base")
        git(self.repo, "checkout", "-b", "feature")

    def tearDown(self):
        self.tmp.cleanup()

    def test_green_with_evidence(self):
        target = self.repo / "SKILL/a/scripts/fix.py"
        target.parent.mkdir(parents=True)
        target.write_text("print('ok')\n", encoding="utf-8")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "fix")
        head_sha = git(self.repo, "rev-parse", "HEAD")
        evidence = valid_evidence()
        evidence["head_sha"] = head_sha
        result = grade_pull_request(self.repo, POLICY, "main", "HEAD", head_sha, body_with(evidence))
        self.assertEqual(result["grade"], "green")
        self.assertFalse(result["merge_conflict"])

    def test_missing_evidence_downgrades_to_yellow(self):
        target = self.repo / "SKILL/a/scripts/fix.py"
        target.parent.mkdir(parents=True)
        target.write_text("print('ok')\n", encoding="utf-8")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "fix")
        head_sha = git(self.repo, "rev-parse", "HEAD")
        result = grade_pull_request(self.repo, POLICY, "main", "HEAD", head_sha, "no evidence")
        self.assertEqual(result["grade"], "yellow")
        self.assertTrue(result["evidence_errors"])

    def test_grade_output_records_gate_flag(self):
        policy_without_gate = {k: v for k, v in POLICY.items() if k != "authorization_gate"}
        (self.repo / "gate-probe.txt").write_text("probe\n", encoding="utf-8")
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-m", "gate probe")
        head_sha = git(self.repo, "rev-parse", "HEAD")
        with_flag = grade_pull_request(self.repo, POLICY, "main", "HEAD", head_sha, "no evidence")
        self.assertIs(with_flag["authorization_gate"], False)
        without_flag = grade_pull_request(
            self.repo, policy_without_gate, "main", "HEAD", head_sha, "no evidence"
        )
        self.assertIs(without_flag["authorization_gate"], True)

    def test_merge_conflict_is_red(self):
        (self.repo / "base.txt").write_text("feature\n", encoding="utf-8")
        git(self.repo, "commit", "-am", "feature change")
        git(self.repo, "checkout", "main")
        (self.repo / "base.txt").write_text("main\n", encoding="utf-8")
        git(self.repo, "commit", "-am", "main change")
        git(self.repo, "checkout", "feature")
        self.assertTrue(has_merge_conflict(self.repo, "main", "feature"))
        head_sha = git(self.repo, "rev-parse", "HEAD")
        result = grade_pull_request(self.repo, POLICY, "main", "HEAD", head_sha, body_with(valid_evidence()))
        self.assertEqual(result["grade"], "red")
        self.assertTrue(result["merge_conflict"])


class AuthorizationTests(unittest.TestCase):
    def grade(self, grade: str) -> dict:
        return {"grade": grade, "head_sha": HEAD_SHA}

    def review(self, login: str, state: str = "APPROVED", commit_id: str = HEAD_SHA, user_type: str = "User") -> dict:
        return {
            "state": state,
            "commit_id": commit_id,
            "submitted_at": "2026-11-10T00:00:00Z",
            "user": {"login": login, "type": user_type},
        }

    def comment(self, login: str, body: str, user_type: str = "User") -> dict:
        return {"body": body, "user": {"login": login, "type": user_type}}

    def test_green_needs_no_approval(self):
        authorized, _ = evaluate_authorization(self.grade("green"), "author", [], lambda _: None)
        self.assertTrue(authorized)

    def test_yellow_needs_approval(self):
        authorized, _ = evaluate_authorization(self.grade("yellow"), "author", [], lambda _: None)
        self.assertFalse(authorized)

    def test_yellow_human_approval_passes(self):
        authorized, _ = evaluate_authorization(
            self.grade("yellow"), "author", [self.review("human")], lambda _: "write"
        )
        self.assertTrue(authorized)

    def test_self_approval_rejected(self):
        authorized, _ = evaluate_authorization(
            self.grade("yellow"), "author", [self.review("author")], lambda _: "admin"
        )
        self.assertFalse(authorized)

    def test_bot_approval_rejected(self):
        authorized, _ = evaluate_authorization(
            self.grade("yellow"), "author", [self.review("cindy[bot]", user_type="Bot")], lambda _: "admin"
        )
        self.assertFalse(authorized)

    def test_stale_approval_rejected(self):
        authorized, _ = evaluate_authorization(
            self.grade("yellow"), "author", [self.review("human", commit_id="b" * 40)], lambda _: "admin"
        )
        self.assertFalse(authorized)

    def test_red_requires_admin(self):
        authorized, _ = evaluate_authorization(
            self.grade("red"), "author", [self.review("human")], lambda _: "write"
        )
        self.assertFalse(authorized)
        authorized, _ = evaluate_authorization(
            self.grade("red"), "author", [self.review("admin")], lambda login: "admin" if login == "admin" else "write"
        )
        self.assertTrue(authorized)

    def test_other_reviewer_blocker_overrides_approval(self):
        reviews = [self.review("admin"), self.review("blocker", state="CHANGES_REQUESTED")]
        authorized, message = evaluate_authorization(
            self.grade("red"), "author", reviews, lambda _: "admin"
        )
        self.assertFalse(authorized)
        self.assertIn("unresolved review blocker", message)

    def test_latest_review_wins(self):
        old = self.review("human")
        old["submitted_at"] = "2026-11-09T00:00:00Z"
        new = self.review("human", state="CHANGES_REQUESTED")
        new["submitted_at"] = "2026-11-10T01:00:00Z"
        authorized, _ = evaluate_authorization(self.grade("yellow"), "author", [old, new], lambda _: "write")
        self.assertFalse(authorized)

    def test_admin_comment_authorizes_red_for_current_head(self):
        authorized, message = evaluate_authorization(
            self.grade("red"),
            "author",
            [],
            lambda _: "admin",
            comments=[self.comment("author", f"ADMIN-APPROVE {HEAD_SHA}")],
        )
        self.assertTrue(authorized)
        self.assertIn("admin comment authorization", message)

    def test_admin_comment_accepts_seven_char_prefix(self):
        authorized, _ = evaluate_authorization(
            self.grade("red"),
            "author",
            [],
            lambda _: "admin",
            comments=[self.comment("author", f"ADMIN-APPROVE {HEAD_SHA[:7]}")],
        )
        self.assertTrue(authorized)

    def test_admin_comment_wrong_sha_rejected(self):
        authorized, _ = evaluate_authorization(
            self.grade("red"),
            "author",
            [],
            lambda _: "admin",
            comments=[self.comment("author", "ADMIN-APPROVE " + "b" * 40)],
        )
        self.assertFalse(authorized)

    def test_non_admin_comment_rejected(self):
        authorized, _ = evaluate_authorization(
            self.grade("red"),
            "author",
            [],
            lambda _: "write",
            comments=[self.comment("author", f"ADMIN-APPROVE {HEAD_SHA}")],
        )
        self.assertFalse(authorized)

    def test_bot_comment_rejected(self):
        authorized, _ = evaluate_authorization(
            self.grade("red"),
            "author",
            [],
            lambda _: "admin",
            comments=[self.comment("cindy[bot]", f"ADMIN-APPROVE {HEAD_SHA}", user_type="Bot")],
        )
        self.assertFalse(authorized)

    def test_admin_comment_also_covers_yellow(self):
        authorized, _ = evaluate_authorization(
            self.grade("yellow"),
            "author",
            [],
            lambda _: "admin",
            comments=[self.comment("author", f"ADMIN-APPROVE {HEAD_SHA[:7]}")],
        )
        self.assertTrue(authorized)

    def test_review_blocker_overrides_admin_comment(self):
        authorized, message = evaluate_authorization(
            self.grade("red"),
            "author",
            [self.review("blocker", state="CHANGES_REQUESTED")],
            lambda _: "admin",
            comments=[self.comment("author", f"ADMIN-APPROVE {HEAD_SHA}")],
        )
        self.assertFalse(authorized)
        self.assertIn("unresolved review blocker", message)

    def grade_gate_off(self, grade: str) -> dict:
        data = self.grade(grade)
        data["authorization_gate"] = False
        return data

    def test_gate_disabled_allows_red_without_approval(self):
        authorized, message = evaluate_authorization(
            self.grade_gate_off("red"), "author", [], lambda _: "admin"
        )
        self.assertTrue(authorized)
        self.assertIn("gate disabled", message)

    def test_gate_disabled_allows_yellow_without_approval(self):
        authorized, _ = evaluate_authorization(
            self.grade_gate_off("yellow"), "author", [], lambda _: None
        )
        self.assertTrue(authorized)

    def test_gate_disabled_does_not_mask_unknown_grade(self):
        authorized, message = evaluate_authorization(
            self.grade_gate_off("purple"), "author", [], lambda _: None
        )
        self.assertFalse(authorized)
        self.assertIn("unknown grade", message)


if __name__ == "__main__":
    unittest.main()
