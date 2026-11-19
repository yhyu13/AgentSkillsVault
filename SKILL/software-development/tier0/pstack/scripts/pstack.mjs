#!/usr/bin/env node
// pstack task workspace CLI.
// No dependencies, no network, no shell. Node standard library only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const SKILL_ROOT = path.resolve(path.dirname(__filename), '..');
const TEMPLATE_DIR = path.join(SKILL_ROOT, 'references', 'templates');

const PLACEHOLDER_RE = /\b(TODO|FIXME|TBD|XXX|WIP|coming soon|to be written|placeholder)\b|待补充|待完善|占位|未实现/im;
const ANGLE_RE = /<[^>\n]{2,}>/g;
const UNSUBSTITUTED_RE = /\{\{[A-Z_]+\}\}/g;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const REQUIRED_TASK_SECTIONS = ['Goal', 'Scope', 'Acceptance', 'Non-goals'];
const REQUIRED_PLAN_SECTIONS = ['Playbook', 'Steps', 'Verification', 'Risks', 'Roles'];
const REQUIRED_RESULT_SECTIONS = ['What changed', 'Evidence', 'Verification', 'Risks / Rollback', 'Status', 'Follow-ups'];

function usage() {
  console.log(`pstack task workspace

Usage:
  node scripts/pstack.mjs new-task <id> --title "<title>" [options]
  node scripts/pstack.mjs check <id> [--json]
  node scripts/pstack.mjs check --all [--json]
  node scripts/pstack.mjs status
  node scripts/pstack.mjs init

Options:
  --root <dir>       Project root. Default: current directory.
  --owner <name>     Task owner. Default: unassigned.
  --risk <level>     green, yellow, or red. Default: green.
  --deadline <date>  YYYY-MM-DD. Default: none.
  --title <title>    Required for new-task.
  --json             Machine-readable check output.
  --help             This message.

Exit codes:
  0  pass
  1  check failed
  2  usage or filesystem error
`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { out.help = true; continue; }
    if (arg === '--json') { out.json = true; continue; }
    if (arg === '--all') { out.all = true; continue; }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Missing value for --${key}`);
      }
      out[key] = value;
      i += 1;
      continue;
    }
    out._.push(arg);
  }
  return out;
}

function rootFrom(args) {
  return path.resolve(args.root || process.cwd());
}

function tasksDir(root) {
  return path.join(root, '.pstack', 'tasks');
}

function taskDir(root, id) {
  return path.join(tasksDir(root), id);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeHeading(value) {
  return value.toLowerCase().replace(/[\s/]+/g, '');
}

function sections(text) {
  const map = new Map();
  const re = /^##\s+(.+)$/gm;
  const matches = [...text.matchAll(re)];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    map.set(normalizeHeading(matches[i][1]), text.slice(start, end).trim());
  }
  return map;
}

function getSection(map, name) {
  return map.get(normalizeHeading(name));
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function checkboxes(text) {
  const all = [...text.matchAll(/^\s*-\s*\[( |x|X)\]\s+/gm)];
  return {
    total: all.length,
    open: all.filter((m) => m[1] === ' ').length,
    checked: all.filter((m) => m[1].toLowerCase() === 'x').length,
  };
}

function evidenceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== 'README.md')
    .map((entry) => entry.name);
}

function scanText(label, text, problems) {
  const placeholder = text.match(PLACEHOLDER_RE);
  if (placeholder) problems.push(`${label}: contains the placeholder marker "${placeholder[0]}"`);
  const angle = text.match(ANGLE_RE);
  if (angle) problems.push(`${label}: contains unfilled angle-bracket text "${angle[0]}"`);
  const unsub = text.match(UNSUBSTITUTED_RE);
  if (unsub) problems.push(`${label}: contains an unsubstituted template token "${unsub[0]}"`);
}

function checkTask(root, id, options = {}) {
  const dir = taskDir(root, id);
  const problems = [];
  const warnings = [];
  const files = {
    task: path.join(dir, 'task.md'),
    plan: path.join(dir, 'plan.md'),
    result: path.join(dir, 'result.md'),
    roles: path.join(dir, 'roles.md'),
    blocked: path.join(dir, 'blocked.md'),
  };

  if (!fs.existsSync(dir)) {
    return { id, ok: false, problems: [`task directory does not exist: ${dir}`], warnings, status: 'missing', evidence: 0 };
  }

  for (const [name, file] of Object.entries(files)) {
    if (name === 'blocked') continue;
    if (!fs.existsSync(file)) problems.push(`missing ${name}.md`);
  }

  if (problems.length > 0) {
    return { id, ok: false, problems, warnings, status: 'missing', evidence: 0 };
  }

  const taskText = read(files.task);
  const planText = read(files.plan);
  const resultText = read(files.result);
  const rolesText = read(files.roles);

  scanText('task.md', taskText, problems);
  scanText('plan.md', planText, problems);
  scanText('result.md', resultText, problems);
  scanText('roles.md', rolesText, problems);

  const taskMap = sections(taskText);
  const planMap = sections(planText);
  const resultMap = sections(resultText);

  for (const name of REQUIRED_TASK_SECTIONS) {
    if (!nonEmpty(getSection(taskMap, name))) problems.push(`task.md: missing or empty section "${name}"`);
  }
  for (const name of REQUIRED_PLAN_SECTIONS) {
    if (!nonEmpty(getSection(planMap, name))) problems.push(`plan.md: missing or empty section "${name}"`);
  }
  for (const name of REQUIRED_RESULT_SECTIONS) {
    if (!nonEmpty(getSection(resultMap, name))) problems.push(`result.md: missing or empty section "${name}"`);
  }

  if (!/^-\s*Owner:\s*\S+/m.test(taskText)) problems.push('task.md: missing "- Owner: <name>" line');

  const acceptance = checkboxes(getSection(taskMap, 'Acceptance') || '');
  if (acceptance.total === 0) problems.push('task.md: Acceptance must contain at least one "- [ ]" checkbox');
  if (acceptance.open > 0) problems.push(`task.md: ${acceptance.open} acceptance checkbox(es) still open`);

  const steps = checkboxes(getSection(planMap, 'Steps') || '');
  if (steps.total === 0) problems.push('plan.md: Steps must contain at least one "- [ ]" checkbox');
  if (steps.open > 0) problems.push(`plan.md: ${steps.open} plan step(s) still open`);

  const statusText = (getSection(resultMap, 'Status') || '').trim().toLowerCase();
  let status = 'unknown';
  if (statusText.startsWith('done')) status = 'done';
  else if (statusText.startsWith('blocked')) status = 'blocked';
  else if (statusText.startsWith('in-progress') || statusText.startsWith('in progress')) status = 'in-progress';
  else problems.push('result.md: Status must be "done" or "blocked"');

  if (status === 'in-progress') problems.push('result.md: status is still in-progress');
  if (status === 'blocked') {
    if (!fs.existsSync(files.blocked)) problems.push('blocked.md: required when status is blocked');
    else {
      const blockedText = read(files.blocked);
      scanText('blocked.md', blockedText, problems);
      const blockedMap = sections(blockedText);
      for (const name of ['Missing information', 'What was tried', 'Who can unblock', 'Next action when unblocked']) {
        if (!nonEmpty(getSection(blockedMap, name))) problems.push(`blocked.md: missing or empty section "${name}"`);
      }
    }
  }

  const evidence = evidenceFiles(path.join(dir, 'evidence'));
  if (evidence.length === 0) problems.push('evidence/: no evidence files');

  const evidenceSection = getSection(resultMap, 'Evidence') || '';
  if (!/evidence\/|https?:\/\//i.test(evidenceSection)) {
    problems.push('result.md: Evidence section must link to an evidence/ file or a URL');
  }

  if (!/@\w+/.test(getSection(taskMap, 'Owner') || taskText)) warnings.push('task.md: owner does not look like an @handle');

  return {
    id,
    ok: problems.length === 0,
    problems,
    warnings,
    status,
    evidence: evidence.length,
    acceptance: { total: acceptance.total, checked: acceptance.checked, open: acceptance.open },
    steps: { total: steps.total, checked: steps.checked, open: steps.open },
  };
}

function printCheck(result) {
  const mark = result.ok ? 'PASS' : 'FAIL';
  console.log(`${mark} ${result.id} (status: ${result.status}, evidence: ${result.evidence})`);
  if (result.acceptance) {
    console.log(`  acceptance: ${result.acceptance.checked}/${result.acceptance.total}`);
  }
  if (result.steps) {
    console.log(`  plan steps: ${result.steps.checked}/${result.steps.total}`);
  }
  for (const problem of result.problems) console.log(`  - ${problem}`);
  for (const warning of result.warnings) console.log(`  ! ${warning}`);
}

function cmdNewTask(args) {
  const id = args._[1];
  if (!id) throw new Error('new-task requires a task id');
  if (!ID_RE.test(id)) throw new Error('task id must match [A-Za-z0-9][A-Za-z0-9._-]{0,63}');
  const title = args.title;
  if (!title) throw new Error('new-task requires --title');

  const root = rootFrom(args);
  const dir = taskDir(root, id);
  if (fs.existsSync(dir)) throw new Error(`task already exists: ${dir}`);

  const values = {
    '{{TITLE}}': title,
    '{{ID}}': id,
    '{{OWNER}}': args.owner || 'unassigned',
    '{{DATE}}': today(),
    '{{DEADLINE}}': args.deadline || 'none',
  };

  const templateNames = ['task.md', 'plan.md', 'result.md', 'roles.md'];
  for (const name of templateNames) {
    const source = path.join(TEMPLATE_DIR, name);
    if (!fs.existsSync(source)) throw new Error(`missing template: ${source}`);
    let content = read(source);
    for (const [token, value] of Object.entries(values)) content = content.split(token).join(value);
    write(path.join(dir, name), content);
  }

  write(path.join(dir, 'evidence', 'README.md'),
    `# Evidence for ${id}\n\nPut command output, test logs, screenshots, measurements, and reproduction steps in this directory. The checker requires at least one file here and a link from result.md.\n`);

  console.log(`Created ${dir}`);
  console.log('Next: fill task.md, then plan.md, then start the matched playbook.');
  console.log(`Check with: node ${path.relative(root, path.join(SKILL_ROOT, 'scripts', 'pstack.mjs'))} check ${id}`);
}

function cmdCheck(args) {
  const root = rootFrom(args);
  if (args.all) {
    const dir = tasksDir(root);
    if (!fs.existsSync(dir)) {
      console.log('No .pstack/tasks directory. Nothing to check.');
      return 0;
    }
    const ids = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    if (ids.length === 0) {
      console.log('No tasks found.');
      return 0;
    }
    const results = ids.map((id) => checkTask(root, id, args));
    if (args.json) console.log(JSON.stringify({ tasks: results }, null, 2));
    else {
      for (const result of results) printCheck(result);
      const failed = results.filter((r) => !r.ok).length;
      console.log(`\n${results.length - failed}/${results.length} tasks passed.`);
    }
    return results.every((r) => r.ok) ? 0 : 1;
  }

  const id = args._[1];
  if (!id) throw new Error('check requires a task id, or --all');
  const result = checkTask(root, id, args);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printCheck(result);
  return result.ok ? 0 : 1;
}

function cmdStatus(args) {
  const root = rootFrom(args);
  const dir = tasksDir(root);
  if (!fs.existsSync(dir)) {
    console.log('No .pstack/tasks directory.');
    return 0;
  }
  const ids = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  if (ids.length === 0) {
    console.log('No tasks found.');
    return 0;
  }
  for (const id of ids) {
    const resultFile = path.join(dir, id, 'result.md');
    let status = 'missing result.md';
    if (fs.existsSync(resultFile)) {
      const map = sections(read(resultFile));
      status = (getSection(map, 'Status') || 'unknown').trim().split(/\s+/)[0];
    }
    const evidence = evidenceFiles(path.join(dir, id, 'evidence')).length;
    console.log(`${id}\t${status}\tevidence=${evidence}`);
  }
  return 0;
}

function cmdInit(args) {
  const root = rootFrom(args);
  const pstackDir = path.join(root, '.pstack');
  fs.mkdirSync(path.join(pstackDir, 'tasks'), { recursive: true });
  const readme = path.join(pstackDir, 'README.md');
  if (!fs.existsSync(readme)) {
    write(readme, `# pstack workspace\n\nThis directory holds task workspaces created by the pstack kit.\n\n- tasks/<id>/task.md: goal, scope, acceptance, non-goals, owner, risk tier\n- tasks/<id>/plan.md: playbook, steps, verification, risks, roles\n- tasks/<id>/evidence/: reproducible evidence\n- tasks/<id>/result.md: changes, evidence, verification, risks, status\n- tasks/<id>/roles.md: role assignments and fallback notes\n- tasks/<id>/blocked.md: missing information when blocked\n\nRun \`node <pstack>/scripts/pstack.mjs check <id>\` before claiming done.\n`);
  }
  console.log(`Initialized ${pstackDir}`);
  return 0;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`pstack: ${error.message}`);
    usage();
    return 2;
  }

  if (args.help || args._.length === 0) {
    usage();
    return args.help ? 0 : 2;
  }

  const command = args._[0];
  try {
    if (command === 'new-task') { cmdNewTask(args); return 0; }
    if (command === 'check') { return cmdCheck(args); }
    if (command === 'status') { return cmdStatus(args); }
    if (command === 'init') { return cmdInit(args); }
    console.error(`pstack: unknown command "${command}"`);
    usage();
    return 2;
  } catch (error) {
    console.error(`pstack: ${error.message}`);
    return 2;
  }
}

process.exitCode = main();
