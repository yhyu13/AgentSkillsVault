#!/usr/bin/env python3
"""Check quality-record completeness, not the truth of its evidence."""
import argparse
import copy
import json
import sys
from pathlib import Path

ROOT_FIELDS = ('task', 'bar', 'observer_and_environment', 'reference_and_limits',
               'end_to_end_path', 'weakest_dimension', 'next_action')
ROW_FIELDS = ('requirement', 'source', 'expected', 'check', 'evidence', 'status', 'limitations')
STATES = {'pass', 'fail', 'unverified', 'not_applicable'}
PASS_MIN_EVIDENCE = 12


def validate(obj, base_dir=None):
    issues = []
    if not isinstance(obj, dict):
        return ['record must be an object']
    for key in ROOT_FIELDS:
        if not isinstance(obj.get(key), str) or not obj[key].strip():
            issues.append(f'{key}: nonempty string required')
    rows = obj.get('requirements')
    if not isinstance(rows, list) or not rows:
        return issues + ['requirements: nonempty array required']
    passed = user_rows = 0
    for index, row in enumerate(rows, 1):
        label = f'requirements[{index}]'
        if not isinstance(row, dict):
            issues.append(f'{label}: object required')
            continue
        for key in ROW_FIELDS:
            if not isinstance(row.get(key), str) or (key != 'evidence' and not row[key].strip()):
                issues.append(f'{label}.{key}: string required' + ('' if key == 'evidence' else ' and must not be empty'))
        source = row.get('source')
        if source not in ('user', 'inferred'):
            issues.append(f'{label}.source: must be user or inferred')
        elif source == 'user':
            user_rows += 1
        status = row.get('status')
        if not isinstance(status, str) or status not in STATES:
            issues.append(f'{label}.status: invalid state')
            continue
        if status == 'not_applicable':
            if source != 'inferred':
                issues.append(f'{label}: a user requirement cannot be not_applicable')
            if not isinstance(row.get('limitations'), str) or row['limitations'].strip().lower() in ('', 'none', 'n/a'):
                issues.append(f'{label}: not_applicable needs a stated reason in limitations')
        if status == 'pass':
            passed += 1
            if not isinstance(row.get('evidence'), str) or len(row['evidence'].strip()) < PASS_MIN_EVIDENCE:
                issues.append(f'{label}: pass needs a concrete observation of at least {PASS_MIN_EVIDENCE} characters')
        if status == 'fail':
            issues.append(f'{label}: fail; not ready to claim all requirements passed')
        if status == 'unverified':
            issues.append(f'{label}: unverified; not ready to claim all requirements passed')
        artifact = row.get('artifact', '')
        if artifact:
            if not isinstance(artifact, str):
                issues.append(f'{label}.artifact: string path or empty')
            else:
                target = Path(artifact)
                if not target.is_absolute() and base_dir is not None:
                    target = Path(base_dir) / target
                if not target.exists():
                    issues.append(f'{label}.artifact: not found: {artifact}')
    if not user_rows:
        issues.append('requirements: at least one row must have source=user')
    if passed == 0:
        issues.append('requirements: at least one requirement must pass')
    return issues


def example_record():
    record = {k: 'example' for k in ROOT_FIELDS}
    record['requirements'] = [
        {'requirement': 'user-facing result', 'source': 'user', 'expected': 'example',
         'check': 'example', 'evidence': 'observed in the example fixture',
         'status': 'pass', 'limitations': 'none', 'artifact': ''},
        {'requirement': 'inferred polish', 'source': 'inferred', 'expected': 'example',
         'check': 'example', 'evidence': 'observed in the example fixture',
         'status': 'pass', 'limitations': 'not requested', 'artifact': ''},
    ]
    return record


def self_test():
    record = example_record()
    assert not validate(record)
    mutations = [
        ({'status': 'fail'}, None),
        ({'status': 'unverified'}, None),
        ({'evidence': ''}, None),
        ({'status': 'bogus'}, None),
        ({'status': []}, None),
        ({'status': 'not_applicable'}, 'user requirement cannot'),
        ({'source': 'unknown'}, None),
    ]
    for change, expected in mutations:
        invalid = copy.deepcopy(record)
        invalid['requirements'][0].update(change)
        issues = validate(invalid)
        assert issues, change
        if expected:
            assert any(expected in issue for issue in issues), (change, issues)
    all_na = copy.deepcopy(record)
    for row in all_na['requirements']:
        row.update({'status': 'not_applicable', 'source': 'inferred',
                    'limitations': 'outside the requested scope'})
    assert validate(all_na), 'all not_applicable record was accepted'
    no_pass = copy.deepcopy(record)
    for row in no_pass['requirements']:
        row.update({'status': 'unverified'})
    assert validate(no_pass)
    missing_artifact = copy.deepcopy(record)
    missing_artifact['requirements'][0]['artifact'] = 'does-not-exist.png'
    assert any('not found' in issue for issue in validate(missing_artifact, base_dir='.')), 'missing artifact accepted'
    print('PASS: complete example accepted; 10 incomplete or evasive variants rejected')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('record', nargs='?', help='UTF-8 JSON contract record')
    parser.add_argument('--base-dir', default=None,
                        help='resolve relative artifact paths against this directory (default: the record directory)')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        if args.record:
            parser.error('use --self-test without a record')
        self_test()
        return 0
    if not args.record:
        parser.error('provide a record or --self-test')
    path = Path(args.record)
    try:
        obj = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        print(f'FAIL: cannot read record: {exc}', file=sys.stderr)
        return 2
    base = args.base_dir or str(path.parent)
    issues = validate(obj, base_dir=base)
    if issues:
        print('\n'.join('FAIL: ' + issue for issue in issues))
        return 1
    print('PASS: record structure is complete, has a passing user requirement and no fail/unverified rows; '
          'evidence truth and inclusion of every requirement were not checked')
    return 0


if __name__ == '__main__':
    sys.exit(main())
