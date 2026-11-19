#!/usr/bin/env node
// Generate the three routing indexes from the copied upstream rule files.
// No dependencies, no network, no shell.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const SKILL_ROOT = path.resolve(path.dirname(__filename), '..');
const UPSTREAM = path.join(SKILL_ROOT, 'references', 'upstream');
const SKILLS_DIR = path.join(UPSTREAM, 'skills');
const PLAYBOOKS_DIR = path.join(SKILLS_DIR, 'poteto-mode', 'playbooks');
const OUT_DIR = path.join(SKILL_ROOT, 'references');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return {};
  const data = {};
  let key = null;
  let buffer = [];
  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (keyMatch) {
      if (key) data[key] = buffer.join(' ').trim();
      key = keyMatch[1];
      buffer = [keyMatch[2]];
    } else if (key) {
      buffer.push(line.trim());
    }
  }
  if (key) data[key] = buffer.join(' ').trim();
  for (const [k, v] of Object.entries(data)) {
    data[k] = v.replace(/^["']|["']$/g, '').trim();
  }
  return data;
}

function escapeCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function truncate(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function firstParagraph(text) {
  const body = text.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const lines = body.split('\n').map((line) => line.trim());
  const paragraph = [];
  let started = false;
  for (const line of lines) {
    if (!line) {
      if (started) break;
      continue;
    }
    if (line.startsWith('#')) continue;
    started = true;
    paragraph.push(line);
  }
  return paragraph.join(' ');
}

function listSkillDirs() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(SKILLS_DIR, name, 'RULE.md')))
    .sort();
}

function categoryFor(name) {
  if (name.startsWith('principle-')) return 'Principle';
  if (name.includes('verification')) return 'Verification';
  if (['unslop', 'technical-writing', 'no-comments', 'in-your-own-words', 'sharpen', 'teach'].includes(name)) return 'Writing and review';
  if (['poteto-mode', 'figure-it-out', 'architect', 'swarm', 'arena', 'interrogate', 'how', 'why', 'recall', 'reflect', 'show-me-your-work', 'poteto-help', 'setup-pstack', 'correct', 'bro'].includes(name)) return 'Orchestration';
  return 'Tooling and domain';
}

function writeSkillsIndex() {
  const rows = listSkillDirs().map((name) => {
    const file = path.join(SKILLS_DIR, name, 'RULE.md');
    const meta = parseFrontmatter(read(file));
    const rel = `references/upstream/skills/${name}/RULE.md`;
    return { name, category: categoryFor(name), description: meta.description || firstParagraph(read(file)), rel };
  });
  const groups = [...new Set(rows.map((row) => row.category))];
  const lines = [
    '# Skill index',
    '',
    'Generated from `references/upstream/skills/*/RULE.md`. Read the full leaf before applying a skill. The index is a router, not a substitute.',
    '',
  ];
  for (const group of groups) {
    lines.push(`## ${group}`, '');
    lines.push('| Skill | Description | Leaf |');
    lines.push('|---|---|---|');
    for (const row of rows.filter((r) => r.category === group)) {
      lines.push(`| \`${row.name}\` | ${escapeCell(truncate(row.description, 240))} | \`${row.rel}\` |`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT_DIR, 'skills-index.md'), lines.join('\n'), 'utf8');
  return rows.length;
}

function writePlaybooksIndex() {
  const files = fs.readdirSync(PLAYBOOKS_DIR).filter((name) => name.endsWith('.md')).sort();
  const lines = [
    '# Playbook index',
    '',
    'Generated from `references/upstream/skills/poteto-mode/playbooks/*.md`. Read the full playbook and copy its steps into the todo list before executing. The index is a router, not a substitute.',
    '',
    '| Playbook | Description | Full text |',
    '|---|---|---|',
  ];
  for (const file of files) {
    const full = path.join(PLAYBOOKS_DIR, file);
    const name = file.replace(/\.md$/, '');
    const text = read(full);
    const heading = text.match(/^#\s+(.+)$/m);
    const description = heading ? heading[1] : firstParagraph(text);
    lines.push(`| \`${name}\` | ${escapeCell(truncate(description, 180))} | \`references/upstream/skills/poteto-mode/playbooks/${file}\` |`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'playbooks-index.md'), lines.join('\n') + '\n', 'utf8');
  return files.length;
}

function writePrinciplesIndex() {
  const names = listSkillDirs().filter((name) => name.startsWith('principle-'));
  const rows = names.map((name) => {
    const file = path.join(SKILLS_DIR, name, 'RULE.md');
    const meta = parseFrontmatter(read(file));
    return {
      name,
      description: meta.description || firstParagraph(read(file)),
      rel: `references/upstream/skills/${name}/RULE.md`,
    };
  });
  const lines = [
    '# Principle index',
    '',
    'Generated from `references/upstream/skills/principle-*/RULE.md`. Read the full leaf for every principle you apply. The index is a router, not a substitute.',
    '',
    '| Principle | Description | Full text |',
    '|---|---|---|',
  ];
  for (const row of rows) {
    lines.push(`| \`${row.name}\` | ${escapeCell(truncate(row.description, 220))} | \`${row.rel}\` |`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'principles-index.md'), lines.join('\n') + '\n', 'utf8');
  return rows.length;
}

const skills = writeSkillsIndex();
const playbooks = writePlaybooksIndex();
const principles = writePrinciplesIndex();
console.log(`Wrote ${skills} skills, ${playbooks} playbooks, ${principles} principles.`);
