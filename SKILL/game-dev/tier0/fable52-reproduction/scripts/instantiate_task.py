#!/usr/bin/env python3
"""Instantiate a parameterized Fable52 task card, refusing unresolved tokens."""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

TOKEN_RE = re.compile(r'\{\{([A-Z0-9_]+)\}\}')
REQUIRED = ('task_id', 'skill', 'input_files', 'input_schema', 'allowed_tools', 'operation',
            'output_file', 'output_schema', 'required_evidence', 'steps',
            'acceptance_checks', 'on_failure')
DEMO_RE = re.compile(r'^[a-z][a-z0-9-]*$')
SOURCE_FLAGS = {'SOURCE_COMMIT', 'SOURCE_SHA256', 'SOURCE_PATH'}


def used_tokens(template):
    return set(TOKEN_RE.findall(json.dumps(template, ensure_ascii=False)))


def build(template, values):
    used = used_tokens(template)
    missing = sorted(token for token in used if not values.get(token))
    if missing:
        raise SystemExit('missing values for tokens: ' + ', '.join(missing))
    text = json.dumps(template, ensure_ascii=False)
    for token in used:
        text = text.replace('{{' + token + '}}', json.dumps(values[token])[1:-1])
    card = json.loads(text)
    problems = [key for key in REQUIRED if not card.get(key)]
    if problems:
        raise SystemExit('instantiated card is missing: ' + ', '.join(problems))
    if not re.match(r'^[a-z0-9][a-z0-9.-]*$', card['task_id']):
        raise SystemExit('task_id must be a lowercase slug')
    return card, used


def check_paths(card, project_root, check_project):
    problems = []
    for key in ('input_schema', 'output_schema'):
        value = card.get(key)
        if isinstance(value, str) and Path(value).is_absolute() and not Path(value).is_file():
            problems.append(f'{key} not found: {value}')
    if check_project:
        for value in card.get('input_files', []):
            if not Path(value).is_file():
                problems.append(f'input file not found: {value}')
        out = Path(card['output_file'])
        if not out.parent.is_dir():
            problems.append(f'output directory does not exist: {out.parent}')
    return problems


def self_test():
    root = Path(__file__).resolve().parent.parent
    templates = sorted((root / 'assets' / 'task-templates').glob('*.json'))
    assert templates, 'no templates found'
    values = {'DEMO_ID': 'sample-demo', 'PROJECT_ROOT': '/tmp/project',
              'SOURCE_COMMIT': 'a' * 40, 'SOURCE_SHA256': 'b' * 64,
              'SOURCE_PATH': 'demos/raw/sample-demo/index.html', 'SKILL_DIR': str(root)}
    seen_source = False
    with tempfile.TemporaryDirectory(prefix='fable52-task-') as tmp:
        for template in templates:
            raw = json.loads(template.read_text(encoding='utf-8'))
            card, used = build(raw, values)
            seen_source = seen_source or bool(used & SOURCE_FLAGS)
            assert '{{' not in json.dumps(card), template.name
            out = Path(tmp) / template.name
            out.write_text(json.dumps(card), encoding='utf-8')
            assert out.exists()
        assert seen_source, 'no template consumes the source pin tokens'
        for bad in ({'operation': '{{UNKNOWN_TOKEN}}'},
                    {'task_id': 'a', 'skill': 's'}):
            try:
                build(bad, values)
            except SystemExit:
                pass
            else:
                raise AssertionError('invalid template was accepted')
    print(f'PASS: {len(templates)} templates instantiated; source pin used; unknown token and empty token rejected')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('template', nargs='?')
    parser.add_argument('--demo-id')
    parser.add_argument('--project-root')
    parser.add_argument('--source-commit', default='')
    parser.add_argument('--source-sha256', default='')
    parser.add_argument('--source-path', default='')
    parser.add_argument('--out')
    parser.add_argument('--check-project', action='store_true',
                        help='also require input files and the output directory to exist')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.template or not args.demo_id or not args.project_root or not args.out:
        parser.error('template, --demo-id, --project-root and --out are required')
    if not DEMO_RE.match(args.demo_id):
        parser.error('--demo-id must match ^[a-z][a-z0-9-]*$ (the dump schema pattern)')
    out = Path(args.out)
    if out.exists():
        parser.error(f'refusing to overwrite {out}')
    try:
        raw = json.loads(Path(args.template).read_text(encoding='utf-8'))
    except FileNotFoundError:
        parser.error(f'template not found: {args.template}')
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        parser.error(f'cannot read template {args.template}: {exc}')
    root = Path(__file__).resolve().parent.parent
    values = {'DEMO_ID': args.demo_id, 'PROJECT_ROOT': args.project_root,
              'SOURCE_COMMIT': args.source_commit, 'SOURCE_SHA256': args.source_sha256,
              'SOURCE_PATH': args.source_path, 'SKILL_DIR': str(root)}
    card, used = build(raw, values)
    supplied = {name for name, value in (('SOURCE_COMMIT', args.source_commit),
                                         ('SOURCE_SHA256', args.source_sha256),
                                         ('SOURCE_PATH', args.source_path)) if value}
    unused = sorted(supplied - used)
    if unused:
        print('warning: supplied but unused by this template: ' + ', '.join(unused), file=sys.stderr)
    problems = check_paths(card, args.project_root, args.check_project)
    if problems:
        parser.error('path check failed:\n  ' + '\n  '.join(problems))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(card, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
