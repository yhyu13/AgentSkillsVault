"""Shared task-grade policy helpers for AgentSkillsVault.

Dependency-free so it can run in GitHub Actions and local selftests.
"""

from __future__ import annotations

import fnmatch
import json
import re
import subprocess
from pathlib import Path
from typing import Any, Callable, Iterable

DEFAULT_POLICY_PATH = Path(".github/task-grade-policy.json")


def load_policy(path: str | Path = DEFAULT_POLICY_PATH) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize_path(path: str) -> str:
    return path.replace("\\", "/").removeprefix("./").strip("/")


def _match_parts(pattern_parts: list[str], path_parts: list[str]) -> bool:
    if not pattern_parts:
        return not path_parts
    head, rest = pattern_parts[0], pattern_parts[1:]
    if head == "**":
        if _match_parts(rest, path_parts):
            return True
        return bool(path_parts) and _match_parts(pattern_parts, path_parts[1:])
    if not path_parts:
        return False
    if fnmatch.fnmatchcase(path_parts[0], head):
        return _match_parts(rest, path_parts[1:])
    return False


def path_matches(path: str, pattern: str) -> bool:
    return _match_parts(normalize_path(pattern).split("/"), normalize_path(path).split("/"))


def matched_paths(paths: Iterable[str], patterns: Iterable[str]) -> list[str]:
    patterns = list(patterns)
    return sorted(
        {
            normalize_path(path)
            for path in paths
            if any(path_matches(path, pattern) for pattern in patterns)
        }
    )


def classify_paths(
    changed_paths: Iterable[str],
    policy: dict[str, Any],
    extra_conditions: Iterable[str] = (),
) -> tuple[str, list[str]]:
    changed = sorted({normalize_path(path) for path in changed_paths})
    conditions = set(extra_conditions)
    red_paths = matched_paths(changed, policy["red"]["paths"])
    red_conditions = sorted(conditions.intersection(policy["red"]["conditions"]))
    if red_paths or red_conditions:
        reasons = [f"red path: {path}" for path in red_paths]
        reasons.extend(f"red condition: {item}" for item in red_conditions)
        return "red", reasons

    yellow_paths = matched_paths(changed, policy["yellow"]["paths"])
    yellow_conditions = sorted(conditions.intersection(policy["yellow"]["conditions"]))
    if yellow_paths or yellow_conditions:
        reasons = [f"yellow path: {path}" for path in yellow_paths]
        reasons.extend(f"yellow condition: {item}" for item in yellow_conditions)
        return "yellow", reasons

    return "green", []


def extract_platform_evidence(pr_body: str) -> tuple[dict[str, Any] | None, str | None]:
    pattern = r"```platform-verification\s*\n(.*?)\n```"
    matches = re.findall(pattern, pr_body or "", flags=re.DOTALL)
    if not matches:
        return None, "missing platform-verification block"
    if len(matches) != 1:
        return None, "expected exactly one platform-verification block"
    try:
        data = json.loads(matches[0])
    except json.JSONDecodeError as exc:
        return None, f"platform-verification is not valid JSON: {exc}"
    if not isinstance(data, dict):
        return None, "platform-verification must be a JSON object"
    return data, None


def _non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_platform_evidence(
    evidence: dict[str, Any] | None,
    head_sha: str,
    policy: dict[str, Any],
) -> list[str]:
    errors: list[str] = []
    if evidence is None:
        return ["missing platform-verification evidence"]

    spec = policy["green"]["platform_evidence"]
    for field in spec["required_fields"]:
        if field not in evidence:
            errors.append(f"missing required field: {field}")

    if evidence.get("head_sha") != head_sha:
        errors.append("head_sha does not match current PR head")

    affected = evidence.get("affected_platforms")
    if not isinstance(affected, list) or not affected:
        errors.append("affected_platforms must be a non-empty list")
        affected = []
    if any(not _non_empty_string(item) for item in affected):
        errors.append("affected_platforms entries must be non-empty strings")

    automated_tests = evidence.get("automated_tests")
    if not isinstance(automated_tests, list) or not automated_tests:
        errors.append("automated_tests must be a non-empty list")
    else:
        for index, test in enumerate(automated_tests):
            if not isinstance(test, dict):
                errors.append(f"automated_tests[{index}] must be an object")
                continue
            for field in ("command", "result", "evidence"):
                if not _non_empty_string(test.get(field)):
                    errors.append(f"automated_tests[{index}].{field} is required")
            if test.get("result") != "pass":
                errors.append(f"automated_tests[{index}].result must be pass")

    platform_checks = evidence.get("platform_checks")
    if not isinstance(platform_checks, list) or not platform_checks:
        errors.append("platform_checks must be a non-empty list")
        return errors

    passed_platforms: set[str] = set()
    has_not_applicable = False
    for index, check in enumerate(platform_checks):
        if not isinstance(check, dict):
            errors.append(f"platform_checks[{index}] must be an object")
            continue
        for field in ("platform", "version", "device_or_browser", "method", "result", "evidence"):
            if not _non_empty_string(check.get(field)):
                errors.append(f"platform_checks[{index}].{field} is required")
        method = check.get("method")
        if method not in spec["allowed_methods"]:
            errors.append(f"platform_checks[{index}].method is not allowed: {method}")
        if check.get("result") != "pass":
            errors.append(f"platform_checks[{index}].result must be pass")
        if method == "not-applicable":
            has_not_applicable = True
            if spec.get("not_applicable_requires_reason") and not _non_empty_string(check.get("reason")):
                errors.append(f"platform_checks[{index}].reason is required for not-applicable")
        if check.get("result") == "pass" and _non_empty_string(check.get("platform")):
            passed_platforms.add(check["platform"])

    if affected == ["not-applicable"]:
        if not has_not_applicable:
            errors.append("not-applicable affected_platforms requires a not-applicable platform check")
    else:
        for platform in affected:
            if _non_empty_string(platform) and platform not in passed_platforms:
                errors.append(f"missing passing same-platform verification for: {platform}")

    return errors


def _git(repo_root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=repo_root, text=True, capture_output=True, check=False)


def changed_files(repo_root: Path, base_ref: str, head_ref: str) -> list[str]:
    result = _git(repo_root, "diff", "--name-only", f"{base_ref}...{head_ref}")
    if result.returncode != 0:
        raise RuntimeError(f"git diff failed: {result.stderr.strip()}")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def has_merge_conflict(repo_root: Path, base_ref: str, head_ref: str) -> bool:
    merge_base = _git(repo_root, "merge-base", base_ref, head_ref)
    if merge_base.returncode != 0:
        return True
    result = _git(repo_root, "merge-tree", "--write-tree", base_ref, head_ref)
    if result.returncode == 0:
        return False
    if result.returncode == 1:
        return True
    raise RuntimeError(f"git merge-tree failed: {result.stderr.strip()}")


def grade_pull_request(
    repo_root: Path,
    policy: dict[str, Any],
    base_ref: str,
    head_ref: str,
    head_sha: str,
    pr_body: str,
) -> dict[str, Any]:
    files = changed_files(repo_root, base_ref, head_ref)
    conflict = has_merge_conflict(repo_root, base_ref, head_ref)
    extra_conditions = ["merge-conflict-with-base"] if conflict else []
    grade, reasons = classify_paths(files, policy, extra_conditions)

    evidence, parse_error = extract_platform_evidence(pr_body)
    evidence_errors: list[str] = []
    if grade == "green":
        if parse_error:
            evidence_errors.append(parse_error)
        evidence_errors.extend(validate_platform_evidence(evidence, head_sha, policy))
        if evidence_errors:
            grade = "yellow"
            reasons.extend(f"green evidence missing/invalid: {item}" for item in evidence_errors)

    return {
        "grade": grade,
        "head_sha": head_sha,
        "base_ref": base_ref,
        "head_ref": head_ref,
        "changed_files": files,
        "merge_conflict": conflict,
        "reasons": reasons,
        "evidence_errors": evidence_errors,
    }


def _latest_reviews_by_user(reviews: Iterable[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    for review in reviews:
        user = review.get("user") or {}
        login = user.get("login")
        if not login:
            continue
        submitted_at = review.get("submitted_at") or ""
        existing = latest.get(login)
        if existing is None or submitted_at >= (existing.get("submitted_at") or ""):
            latest[login] = review
    return latest


def evaluate_authorization(
    grade_data: dict[str, Any],
    pr_author: str,
    reviews: Iterable[dict[str, Any]],
    permission_lookup: Callable[[str], str | None],
) -> tuple[bool, str]:
    grade = grade_data.get("grade")
    if grade == "green":
        return True, "green: no human approval required"
    if grade not in {"yellow", "red"}:
        return False, f"unknown grade: {grade}"

    head_sha = grade_data.get("head_sha")
    if not head_sha:
        return False, "missing head_sha for approval matching"

    latest = _latest_reviews_by_user(reviews)
    for login, review in latest.items():
        user = review.get("user") or {}
        if review.get("state") == "CHANGES_REQUESTED" and review.get("commit_id") == head_sha:
            if user.get("type") != "Bot" and not login.endswith("[bot]"):
                return False, f"unresolved review blocker from {login} for current head"

    for login, review in latest.items():
        if review.get("state") != "APPROVED":
            continue
        if review.get("commit_id") != head_sha:
            continue
        user = review.get("user") or {}
        if login == pr_author:
            continue
        if user.get("type") == "Bot" or login.endswith("[bot]"):
            continue
        if grade == "yellow":
            return True, f"yellow: approved by {login} for current head"
        if grade == "red" and permission_lookup(login) == "admin":
            return True, f"red: approved by admin {login} for current head"

    if grade == "yellow":
        return False, "yellow: requires a non-author human approving review for current head"
    return False, "red: requires an admin approving review for current head"
