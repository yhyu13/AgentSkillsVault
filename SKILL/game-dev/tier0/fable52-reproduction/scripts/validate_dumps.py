#!/usr/bin/env python3
"""Structural and relational validation for Fable 5.2 domain dumps.

Checks envelope fields, entity ids, evidence hashes and line ranges, JSON
Pointers, cross-document relations, parameter ranges and variant consistency.
It does not judge whether a claim is true or whether a reproduction looks right.
"""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path

DOMAINS = {
    'pcg': ('pcg.', 'pcg.schema.json'),
    'materials': ('mat.', 'materials.schema.json'),
    'pbr': ('pbr.', 'pbr.schema.json'),
    'shaders': ('shader.', 'shaders.schema.json'),
    'world': ('world.', 'world.schema.json'),
}
KINDS = {
    'pcg': {'random_generator', 'noise_function', 'texture_recipe', 'world_builder', 'generator_output', 'not_observed'},
    'materials': {'texture_generator', 'texture_recipe', 'material', 'channel_convention', 'not_observed'},
    'pbr': {'renderer_settings', 'channel_mapping', 'light', 'environment_reflection', 'planar_reflection', 'post_process', 'runtime_observation', 'not_observed'},
    'shaders': {'shader_unit'},
    'world': {'scene', 'world_region', 'geometry_batch', 'collision_system', 'lighting_set', 'quality_system', 'runtime_observation', 'not_observed'},
}
ID_RE = re.compile(r'^[a-z][a-z0-9._-]*$')
SHA_RE = re.compile(r'^[0-9a-f]{64}$')


def pointer_get(doc, pointer):
    if pointer in ('', '/'):
        return doc
    node = doc
    for raw in pointer.lstrip('/').split('/'):
        key = raw.replace('~1', '/').replace('~0', '~')
        if isinstance(node, list):
            node = node[int(key)]
        else:
            node = node[key]
    return node


def walk_numbers(node, key_name, found):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == key_name and isinstance(v, (int, float)) and not isinstance(v, bool):
                found.append(v)
            walk_numbers(v, key_name, found)
    elif isinstance(node, list):
        for v in node:
            walk_numbers(v, key_name, found)


def domain_of(path):
    parts = path.parts
    if 'dumps' in parts:
        index = parts.index('dumps')
        if index + 1 < len(parts):
            return parts[index + 1]
    return None


def load_docs(project, demo_id):
    docs = {}
    for domain, (_prefix, _schema) in DOMAINS.items():
        for path in sorted((project / 'dumps' / domain / demo_id).glob('*.json')):
            if path.name == 'index.json':
                continue
            try:
                docs[path] = json.loads(path.read_text(encoding='utf-8'))
            except (OSError, json.JSONDecodeError) as exc:
                docs[path] = {'__load_error__': str(exc)}
    return docs


def validate(project, demo_id, docs):
    errors = []

    def err(code, path, message, entity=None, field=None):
        errors.append({'code': code, 'file': str(path), 'entity': entity,
                       'field': field, 'message': message})

    all_ids = {}
    json_cache = {}

    def load_json(path):
        if path not in json_cache:
            try:
                json_cache[path] = json.loads(path.read_text(encoding='utf-8'))
            except (OSError, UnicodeDecodeError, json.JSONDecodeError):
                json_cache[path] = None
        return json_cache[path]
    for path, doc in docs.items():
        if '__load_error__' in doc:
            err('SCHEMA', path, f'unreadable JSON: {doc["__load_error__"]}')
            continue
        domain = domain_of(path.relative_to(project))
        prefix = DOMAINS.get(domain, ('', ''))[0]
        if doc.get('demo_id') != demo_id:
            err('ENVELOPE', path, f'demo_id is {doc.get("demo_id")!r}, expected {demo_id!r}', field='demo_id')
        version = doc.get('observed_version') or {}
        if not isinstance(version.get('commit'), str) or not re.match(r'^[0-9a-f]{40}$', version.get('commit', '')):
            err('ENVELOPE', path, 'observed_version.commit must be a 40-hex commit', field='observed_version.commit')
        if not isinstance(version.get('source_path'), str) or not version['source_path']:
            err('ENVELOPE', path, 'observed_version.source_path is required', field='observed_version.source_path')
        if not SHA_RE.match(version.get('source_sha256', '') or ''):
            err('ENVELOPE', path, 'observed_version.source_sha256 must be 64 lowercase hex', field='observed_version.source_sha256')
        ev_list = doc.get('evidence_refs')
        if not isinstance(ev_list, list) or not ev_list:
            err('ENVELOPE', path, 'evidence_refs must be a non-empty array', field='evidence_refs')
            ev_list = []
        doc_ev_ids = set()
        for ev in ev_list:
            evid = ev.get('id')
            if not evid or not isinstance(evid, str):
                err('ENVELOPE', path, 'evidence entry without id', field='evidence_refs')
                continue
            if evid in doc_ev_ids:
                err('DUPLICATE_EVIDENCE_ID', path, f'evidence id {evid!r} is declared twice in this document', field='evidence_refs')
            doc_ev_ids.add(evid)
            rel = ev.get('path')
            if not rel:
                err('EVIDENCE_MISSING', path, f'evidence {evid!r} has no path', field='evidence_refs')
                continue
            target = (project / rel)
            if not target.is_file():
                err('EVIDENCE_MISSING', path, f'evidence {evid!r} path not found: {rel}', field='evidence_refs')
                continue
            data = target.read_bytes()
            if ev.get('sha256') and hashlib.sha256(data).hexdigest() != ev['sha256']:
                err('EVIDENCE_HASH', path, f'evidence {evid!r} sha256 does not match {rel}', field='evidence_refs')
        entities = doc.get('entities')
        if not isinstance(entities, list):
            err('ENVELOPE', path, 'entities must be an array', field='entities')
            continue
        doc_evidence = {ev.get('id'): ev for ev in ev_list if isinstance(ev, dict) and ev.get('id')}
        for entity in entities:
            eid = entity.get('id')
            if not isinstance(eid, str) or not ID_RE.match(eid):
                err('ENVELOPE', path, 'entity id missing or malformed', entity=eid)
                continue
            if prefix and not eid.startswith(prefix):
                err('ENVELOPE', path, f'entity id must start with {prefix!r}', entity=eid)
            if eid in all_ids:
                err('DUPLICATE_ENTITY_ID', path, f'entity id {eid!r} already used in {all_ids[eid]}', entity=eid)
            else:
                all_ids[eid] = path
            if not entity.get('kind') or not entity.get('name'):
                err('ENVELOPE', path, 'entity requires kind and name', entity=eid)
            elif entity['kind'] not in KINDS.get(domain, set()):
                err('ENVELOPE', path, f"kind {entity['kind']!r} is not in the {domain} kind set", entity=eid, field='kind')
            evs = entity.get('evidence')
            if not isinstance(evs, list) or not evs:
                err('EVIDENCE_MISSING', path, 'entity has no evidence', entity=eid)
                evs = []
            for ref in evs:
                rid = ref.get('ref')
                if rid not in doc_evidence:
                    err('EVIDENCE_MISSING', path, f'evidence ref {rid!r} is not declared in this document', entity=eid, field='evidence')
                    continue
                ev_path = doc_evidence[rid].get('path')
                target = project / ev_path if ev_path else None
                lines = None
                if target and target.is_file():
                    lines = target.read_text(encoding='utf-8', errors='replace').count('\n') + 1
                start, end = ref.get('start_line'), ref.get('end_line')
                if start is not None or end is not None:
                    if not isinstance(start, int) or not isinstance(end, int):
                        err('EVIDENCE_LINE_RANGE', path, 'start_line/end_line must be integers', entity=eid)
                    elif start < 1 or end < start:
                        err('EVIDENCE_LINE_RANGE', path, f'invalid range {start}-{end}', entity=eid)
                    elif lines is not None and end > lines:
                        err('EVIDENCE_LINE_RANGE', path, f'range {start}-{end} exceeds {lines} lines', entity=eid)
                pointer = ref.get('json_pointer')
                if pointer:
                    resolved = False
                    if target and target.suffix.lower() == '.json':
                        evidence_doc = load_json(target)
                        if evidence_doc is not None:
                            try:
                                pointer_get(evidence_doc, pointer)
                                resolved = True
                            except (KeyError, IndexError, ValueError, TypeError):
                                resolved = False
                    if not resolved:
                        try:
                            pointer_get(doc, pointer)
                            resolved = True
                        except (KeyError, IndexError, ValueError, TypeError):
                            resolved = False
                    if not resolved:
                        err('EVIDENCE_POINTER', path, f'pointer {pointer!r} does not resolve in evidence or dump', entity=eid)
            variants = entity.get('compiled_variants')
            if isinstance(variants, dict):
                status, items = variants.get('status'), variants.get('items')
                if status == 'not_captured' and items:
                    err('VARIANT_CONTRADICTION', path, 'not_captured variants must have empty items', entity=eid)
                if status != 'not_captured' and items is not None and not isinstance(items, list):
                    err('VARIANT_CONTRADICTION', path, 'variant items must be an array', entity=eid)
            for name in ('roughness', 'metalness'):
                values = []
                walk_numbers(entity, name, values)
                for value in values:
                    if not 0.0 <= value <= 1.0:
                        err('PARAMETER_RANGE', path, f'{name}={value} outside [0,1]', entity=eid, field=name)
    for path, doc in docs.items():
        for entity in doc.get('entities', []) if isinstance(doc, dict) else []:
            for rel in entity.get('related_entities', []) or []:
                if rel not in all_ids:
                    err('UNRESOLVED_RELATED_ENTITY', path, f'related entity {rel!r} does not resolve', entity=entity.get('id'))
    return errors


def mutate_tests(project, demo_id, docs):
    if not docs:
        return {'status': 'skipped', 'reason': 'no dumps'}
    base_path = sorted(docs)[0]
    base = docs[base_path]
    results = {}

    def run(label, mutate, expected):
        trial = {p: copy.deepcopy(d) for p, d in docs.items()}
        target = copy.deepcopy(base)
        trial[base_path] = target
        try:
            mutate(target)
        except (KeyError, IndexError, TypeError) as exc:
            results[label] = {'expected': expected, 'observed': 'mutation-error', 'detail': str(exc), 'pass': False}
            return
        codes = {e['code'] for e in validate(project, demo_id, trial)}
        results[label] = {'expected': expected, 'observed': sorted(codes), 'pass': expected in codes}

    def drop_evidence(doc):
        doc['entities'][0]['evidence'] = []

    def duplicate_id(doc):
        entity = copy.deepcopy(doc['entities'][0])
        doc['entities'].append(entity)

    def dangling_related(doc):
        doc['entities'][0]['related_entities'] = ['missing.entity.for.test']

    def bad_line(doc):
        doc['entities'][0]['evidence'][0]['end_line'] = 10 ** 7

    run('missing-evidence', drop_evidence, 'EVIDENCE_MISSING')
    run('duplicate-entity-id', duplicate_id, 'DUPLICATE_ENTITY_ID')
    run('dangling-related', dangling_related, 'UNRESOLVED_RELATED_ENTITY')
    run('line-out-of-range', bad_line, 'EVIDENCE_LINE_RANGE')
    results['status'] = 'passed' if all(v['pass'] for k, v in results.items() if k != 'status') else 'failed'
    return results


def schema_check(project, docs):
    try:
        import jsonschema
    except ImportError:
        return {'status': 'skipped', 'reason': 'jsonschema not installed'}
    schema_root = Path(__file__).resolve().parent.parent / 'assets' / 'schemas' / 'v2'
    loaded = {p.name: json.loads(p.read_text(encoding='utf-8')) for p in schema_root.glob('*.json')}
    registry = None
    try:
        from referencing import Registry, Resource
        from referencing.jsonschema import DRAFT202012
        registry = Registry()
        for path in schema_root.glob('*.json'):
            resource = Resource.from_contents(loaded[path.name], default_specification=DRAFT202012)
            registry = registry.with_resource(path.as_uri(), resource)
            registry = registry.with_resource(path.name, resource)
    except ImportError:
        pass
    outcomes = {}
    for path, doc in docs.items():
        domain = domain_of(path.relative_to(project))
        schema_path = schema_root / DOMAINS[domain][1]
        if not schema_path.is_file():
            outcomes[str(path)] = f'schema missing: {schema_path.name}'
            continue
        schema = copy.deepcopy(loaded[schema_path.name])
        if registry is not None:
            validator = jsonschema.Draft202012Validator(schema, registry=registry)
        else:
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter('ignore', DeprecationWarning)
                resolver = jsonschema.RefResolver(base_uri=schema_path.as_uri(), referrer=schema)
            validator = jsonschema.Draft202012Validator(schema, resolver=resolver)
        problems = sorted(validator.iter_errors(doc), key=lambda e: list(e.path))
        outcomes[str(path)] = 'ok' if not problems else problems[0].message
    return {'status': 'passed' if all(v == 'ok' for v in outcomes.values()) else 'failed', 'results': outcomes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', help='project root containing dumps/')
    parser.add_argument('--demo-id')
    parser.add_argument('--out', help='report path; default reports/evidence/<demo>-dump-validation.json')
    parser.add_argument('--mutate', action='store_true', help='run failure injections on in-memory copies')
    parser.add_argument('--overwrite', action='store_true', help='replace an existing report at --out')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.project or not args.demo_id:
        parser.error('--project and --demo-id are required')
    project = Path(args.project).resolve()
    docs = load_docs(project, args.demo_id)
    if not docs:
        print(f'FAIL: no dumps for {args.demo_id} under {project}', file=sys.stderr)
        return 1
    errors = validate(project, args.demo_id, docs)
    mutations = mutate_tests(project, args.demo_id, docs) if args.mutate else None
    schemas = schema_check(project, docs)
    status = 'passed' if not errors and schemas['status'] != 'failed' and (not mutations or mutations.get('status') == 'passed') else 'failed'
    report = {
        'demo_id': args.demo_id,
        'generated_at': dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
        'status': status,
        'files': {str(p.relative_to(project)): hashlib.sha256(p.read_bytes()).hexdigest() for p in docs},
        'errors': errors,
        'schemas': schemas,
        'mutations': mutations,
        'limits': 'Structure and declared relations only; truth, coverage and visual quality are not checked.',
    }
    out = Path(args.out) if args.out else project / 'reports' / 'evidence' / f'{args.demo_id}-dump-validation.json'
    if out.exists() and not args.overwrite:
        print(f'FAIL: {out} already exists; pass --overwrite to replace it or --out to keep a new record', file=sys.stderr)
        return 2
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for error in errors[:10]:
        print(f"{error['code']}: {error['file']}: {error['message']}")
    if mutations:
        for name, result in mutations.items():
            if name != 'status':
                print(f"mutation {name}: {'PASS' if result['pass'] else 'FAIL'} (expected {result['expected']})")
    print(f'{status.upper()}: {len(docs)} documents, {len(errors)} errors; report {out}')
    return 0 if status == 'passed' else 1


def self_test():
    """Build a schema-compliant fixture, prove a clean pass, schema pass and each injection."""
    with tempfile.TemporaryDirectory(prefix='fable52-validate-') as tmp:
        project = Path(tmp)
        source = project / 'demos' / 'raw' / 'demo' / 'index.html'
        source.parent.mkdir(parents=True)
        source.write_text('<html>\n<script>const a=1;</script>\n</html>\n', encoding='utf-8')
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        evidence = [{'id': 'src.index', 'type': 'direct_source', 'path': 'demos/raw/demo/index.html',
                     'sha256': digest, 'captured_at': '2026-11-14T00:00:00Z'}]
        entity = {'id': 'pcg.random.main', 'kind': 'random_generator', 'name': 'main',
                  'evidence': [{'ref': 'src.index', 'start_line': 2, 'end_line': 2}],
                  'inputs': {'seed': 1}, 'outputs': {'symbol': 'R'},
                  'determinism': {'seed_fixed': True, 'repeatability': 'fixture'},
                  'related_entities': ['pcg.result.one']}
        entity2 = {'id': 'pcg.result.one', 'kind': 'generator_output', 'name': 'one',
                   'evidence': [{'ref': 'src.index', 'start_line': 1, 'end_line': 1}],
                   'inputs': {}, 'outputs': {},
                   'determinism': {'seed_fixed': True, 'repeatability': 'fixture'}}
        doc = {'schema_version': '1.0.0', 'demo_id': 'demo',
               'observed_version': {'commit': 'a' * 40, 'source_path': 'demos/raw/demo/index.html',
                                    'source_sha256': digest, 'license_spdx': 'MIT'},
               'generated_at': '2026-11-14T00:00:00Z',
               'evidence_refs': evidence, 'entities': [entity, entity2],
               'coverage': {'status': 'partial', 'included': ['fixture'], 'excluded': ['nothing']},
               'unknowns': []}
        path = project / 'dumps' / 'pcg' / 'demo' / 'pcg.json'
        path.parent.mkdir(parents=True)
        path.write_text(json.dumps(doc), encoding='utf-8')
        docs = load_docs(project, 'demo')
        errors = validate(project, 'demo', docs)
        assert not errors, errors
        schemas = schema_check(project, docs)
        assert schemas['status'] in ('passed', 'skipped'), schemas
        mutations = mutate_tests(project, 'demo', docs)
        assert mutations['status'] == 'passed', mutations
        bad_kind = {'id': 'pcg.bad.one', 'kind': 'generated_result', 'name': 'bad',
                    'evidence': [{'ref': 'src.index', 'start_line': 1, 'end_line': 1}],
                    'inputs': {}, 'outputs': {},
                    'determinism': {'seed_fixed': True, 'repeatability': 'fixture'}}
        bad_doc = json.loads(json.dumps(doc))
        bad_doc['entities'].append(bad_kind)
        path.write_text(json.dumps(bad_doc), encoding='utf-8')
        kind_errors = validate(project, 'demo', load_docs(project, 'demo'))
        assert any(e['code'] == 'ENVELOPE' and e.get('field') == 'kind' for e in kind_errors), kind_errors
        print('PASS: schema-compliant fixture passes (schema included); four injections and an invalid kind are rejected')
    return 0


if __name__ == '__main__':
    sys.exit(main())
