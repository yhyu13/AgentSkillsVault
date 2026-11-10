#!/usr/bin/env python3
"""Require human/admin approval for yellow/red PRs; green needs no approval."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from task_policy import evaluate_authorization


class GitHubClient:
    def __init__(self, repo: str, token: str, api_url: str = "https://api.github.com") -> None:
        self.repo = repo
        self.token = token
        self.api_url = api_url.rstrip("/")

    def get(self, path: str) -> Any:
        url = f"{self.api_url}/repos/{self.repo}/{path.lstrip('/')}"
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "AgentSkillsVault-policy-gate",
            },
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)

    def list_reviews(self, pr_number: int) -> list[dict[str, Any]]:
        reviews: list[dict[str, Any]] = []
        page = 1
        while True:
            batch = self.get(f"pulls/{pr_number}/reviews?per_page=100&page={page}")
            if not isinstance(batch, list):
                raise RuntimeError("unexpected reviews response")
            reviews.extend(batch)
            if len(batch) < 100:
                return reviews
            page += 1

    def collaborator_permission(self, login: str) -> str | None:
        try:
            data = self.get(f"collaborators/{login}/permission")
        except urllib.error.HTTPError as exc:
            if exc.code in {403, 404}:
                return None
            raise
        return data.get("permission")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--grade", required=True, help="Path to grade JSON from policy_gate.py")
    parser.add_argument("--repo", required=True, help="owner/repo")
    parser.add_argument("--pr", required=True, type=int)
    parser.add_argument("--token", default=os.environ.get("GITHUB_TOKEN", ""))
    parser.add_argument("--api-url", default=os.environ.get("GITHUB_API_URL", "https://api.github.com"))
    args = parser.parse_args()

    grade_data = json.loads(Path(args.grade).read_text(encoding="utf-8"))
    if not args.token:
        print("GITHUB_TOKEN is required to verify the live PR head", file=sys.stderr)
        return 1

    client = GitHubClient(args.repo, args.token, args.api_url)
    pr = client.get(f"pulls/{args.pr}")
    live_head = (pr.get("head") or {}).get("sha")
    if live_head != grade_data.get("head_sha"):
        print("grade file is stale: head_sha does not match live PR head", file=sys.stderr)
        return 1

    if grade_data.get("grade") == "green":
        authorized, message = evaluate_authorization(grade_data, "", [], lambda _: None)
        print(message)
        return 0 if authorized else 1

    reviews = client.list_reviews(args.pr)
    pr_author = (pr.get("user") or {}).get("login", "")
    authorized, message = evaluate_authorization(
        grade_data,
        pr_author,
        reviews,
        client.collaborator_permission,
    )
    print(message)
    return 0 if authorized else 1


if __name__ == "__main__":
    sys.exit(main())
