#!/usr/bin/env python3
"""Verify case-evidence hashes against a local project workspace.

The recorded samples' source, dumps and runtime records are not bundled with
this skill. Where the original project exists, this script proves that the
paths and bytes still match the pinned manifest.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import tempfile
from pathlib import Path


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(manifest_path, project):
    manifest = json.loads(Path(manifest_path).read_text(encoding='utf-8'))
    project = Path(project).resolve()
    problems, checked = [], 0
    for demo, case in manifest.get('cases', {}).items():
        for item in case.get('files', []):
            target = project / item['path']
            if not target.is_file():
                problems.append(f'{demo}: missing {item["path"]}')
                continue
            checked += 1
            if sha256(target) != item['sha256']:
                problems.append(f'{demo}: hash mismatch {item["path"]}')
            if target.stat().st_size != item.get('bytes'):
                problems.append(f'{demo}: size mismatch {item["path"]}')
    return checked, problems


def self_test():
    with tempfile.TemporaryDirectory(prefix='fable52-case-') as tmp:
        project = Path(tmp)
        (project / 'demos/raw/demo').mkdir(parents=True)
        (project / 'dumps/pcg/demo').mkdir(parents=True)
        source = project / 'demos/raw/demo/index.html'
        dump = project / 'dumps/pcg/demo/pcg.json'
        source.write_text('<html></html>', encoding='utf-8')
        dump.write_text('{"demo_id": "demo"}', encoding='utf-8')
        manifest = {'cases': {'demo': {'files': [
            {'path': 'demos/raw/demo/index.html', 'sha256': sha256(source), 'bytes': source.stat().st_size},
            {'path': 'dumps/pcg/demo/pcg.json', 'sha256': sha256(dump), 'bytes': dump.stat().st_size},
        ]}}}
        path = project / 'manifest.json'
        path.write_text(json.dumps(manifest), encoding='utf-8')
        checked, problems = verify(path, project)
        assert checked == 2 and not problems, problems
        source.write_text('<html>changed</html>', encoding='utf-8')
        checked, problems = verify(path, project)
        assert checked == 2 and any('hash mismatch' in p for p in problems), problems
        print('PASS: matching case files verified; a changed file is rejected')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', default=str(Path(__file__).resolve().parent.parent / 'assets' / 'cases' / 'case-evidence.json'))
    parser.add_argument('--project')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.project:
        parser.error('--project is required (the workspace holding the recorded case files)')
    checked, problems = verify(args.manifest, args.project)
    for problem in problems[:20]:
        print('FAIL: ' + problem)
    print(f"{'PASS' if not problems else 'FAIL'}: {checked} files verified against {args.manifest}")
    return 0 if not problems else 1


if __name__ == '__main__':
    sys.exit(main())
