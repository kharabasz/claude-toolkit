#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { extname, isAbsolute, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, segments, substitutions } from './shell.mjs';

export { segments };

export const MAX_LINES = 300;
export const MAX_BYTES = 40_000;
export const MAX_NAMED_FILES = 3;
export const SCOUT_NAME = 'scout:scout';

const READ_DEFAULT_LIMIT = 2000;
const MAX_DEPTH = 3;
const SPILL_DIRS = [['tool-results'], ['spend-bar', 'events', 'output']];
const UNCOUNTED = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.pdf', '.ipynb']);
const SEARCHES = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'select-string', 'sls']);
const SELECT_STRING = new Set(['select-string', 'sls']);
const FINDERS = new Set(['find', 'fd', 'tree']);
const LISTERS = new Set(['ls', 'dir', 'get-childitem', 'gci']);
const READERS = new Set(['cat', 'head', 'tail', 'less', 'more', 'bat', 'nl', 'get-content', 'gc', 'type']);
const LIMITERS = new Set(['head', 'tail', 'select-object', 'select']);
const CHANGE_DIR = new Set(['cd', 'pushd', 'set-location', 'sl', 'chdir']);
const DECLARE = new Set(['export', 'local', 'declare', 'readonly', 'typeset']);
const VALUE_OPTIONS = new Set(['-A', '-B', '-C', '-m', '-e', '-f', '-t', '-T', '-g', '-M', '-j', '-d', '-D', '--max-count',
  '--context', '--after-context', '--before-context', '--type', '--type-not', '--glob', '--regexp', '--file', '--include', '--exclude']);
const PATTERN_OPTIONS = new Set(['-e', '-f', '--regexp', '--file']);
const GIT_VALUE_OPTIONS = new Set(['-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env', '--super-prefix']);
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const VARIABLE = /\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g;

const SCOUT = `Send code search and exploratory reads to the ${SCOUT_NAME} agent: ask it one question, and it returns paths, lines and short excerpts. Don't find the answer some other way, such as a linter, a test run, a script or git blame: run tests and lint only to check a change.`;
const reasons = {
  search: `${SCOUT} The main thread may Grep only the one file it is about to edit.`,
  glob: `${SCOUT} Finding files is exploration.`,
  shellSearch: `${SCOUT} Searching from a shell fills the main thread's context with every match. To search a file you already know, name it: \`grep -n PATTERN path/to/file\` (up to ${MAX_NAMED_FILES} files, no -r, folders or wildcards), or \`git grep -n PATTERN [ref] -- path/to/file\`.`,
  shellRead: (subject, lines) => `This shows ${lines} lines of ${subject}, more than ${MAX_LINES}. Read only the lines you need with the Read tool and an offset and limit, or ask the ${SCOUT_NAME} agent what is in it.`,
  shellBytes: (subject, bytes, cap) => `This shows about ${kb(bytes)} KB of ${subject}, more than the ${kb(cap)} KB one Read may return. Read only the lines you need with the Read tool and an offset and limit, or ask the ${SCOUT_NAME} agent what is in it.`,
  largeRead: (path, lines) => `${path} has ${lines} lines. Read only the lines you need with offset and limit, or ask the ${SCOUT_NAME} agent what is in it.`,
};

const kb = (bytes) => Math.round(bytes / 1000);

function sizeReason(path, span, cap, subagent) {
  const way = subagent ? 'Grep it for the part you need' : `Grep this one file for the part you need, or ask the ${SCOUT_NAME} agent what is in it`;
  if (span.longest > cap) {
    return `Line ${span.longestAt} of ${path} alone is ${kb(span.longest)} KB, over the ${kb(cap)} KB one Read may return, so no range that includes it fits. ${way}.`;
  }
  const lines = span.last - span.first + 1;
  const fit = Math.max(1, Math.floor((lines * cap) / span.size));
  return `Lines ${span.first}-${span.last} of ${path} come to ${kb(span.size)} KB, over the ${kb(cap)} KB one Read may return. Its lines are long (about ${Math.round(span.size / lines)} bytes each). Read about ${fit} lines at a time with offset and limit. Or ${way}.`;
}

const deny = (reason) => ({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
});

function inside(root, path) {
  if (path == null) return false;
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function isFile(path) {
  try { return statSync(path).isFile(); } catch { return false; }
}

function isDir(path) {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function exists(path) {
  try { statSync(path); return true; } catch { return false; }
}

function spilled(path) {
  const parts = normalize(path).split(sep);
  return SPILL_DIRS.some((run) => parts.some((_, i) => run.every((part, j) => parts[i + j] === part)));
}

function windowsPath(arg) {
  if (process.platform !== 'win32') return arg;
  const m = /^\/(?:cygdrive\/)?([a-zA-Z])(\/.*)?$/.exec(arg);
  return m ? `${m[1].toUpperCase()}:${m[2] ?? '/'}` : arg;
}

function expand(arg, ctx) {
  let text = arg;
  if (text === '~' || text.startsWith('~/') || text.startsWith('~\\')) text = ctx.home + text.slice(1);
  let unknown = false;
  text = text.replace(VARIABLE, (_, braced, bare) => {
    const name = braced ?? bare;
    const value = ctx.vars.has(name) ? ctx.vars.get(name) : name === 'HOME' ? ctx.home : undefined;
    if (value === undefined) unknown = true;
    return value ?? '';
  });
  return unknown || text.includes('$') ? null : text;
}

function resolvePath(base, arg, ctx) {
  if (base == null) return null;
  const expanded = expand(arg, ctx);
  return expanded === null ? null : resolve(base, windowsPath(expanded));
}

function lineCount(path) {
  const data = readFileSync(path);
  if (data.length === 0) return 0;
  let lines = 0;
  for (let at = data.indexOf(10); at >= 0; at = data.indexOf(10, at + 1)) lines++;
  return data[data.length - 1] === 10 ? lines : lines + 1;
}

function readSpan(path, offset, limit) {
  const data = readFileSync(path);
  const first = Math.max(Number(offset) || 1, 1);
  const end = first + (Number(limit) > 0 ? Number(limit) : READ_DEFAULT_LIMIT);
  let line = 1;
  let start = 0;
  let size = 0;
  let last = first - 1;
  let longest = 0;
  let longestAt = first;
  while (start < data.length && line < end) {
    let stop = data.indexOf(10, start);
    stop = stop < 0 ? data.length : stop + 1;
    if (line >= first) {
      const length = stop - start;
      size += length;
      last = line;
      if (length > longest) { longest = length; longestAt = line; }
    }
    start = stop;
    line++;
  }
  return { size, first, last, longest, longestAt };
}

function maxBytes(env) {
  const value = Number.parseInt(env.SCOUT_GATE_MAX_BYTES ?? '', 10);
  return Number.isNaN(value) ? MAX_BYTES : value;
}

function recursiveSearch(name, args) {
  if (SELECT_STRING.has(name)) return false;
  return args.some((a) => /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(a) || a === '--recursive');
}

function recursiveList(name, args) {
  return args.some((a) => /^-[a-zA-Z]*R[a-zA-Z]*$/.test(a) || /^-rec/i.test(a) || a === '--recursive' || (name.startsWith('g') && /^-r$/i.test(a)));
}

function searchOperands(name, args) {
  if (SELECT_STRING.has(name)) {
    const at = args.findIndex((a) => /^-(literal)?path$/i.test(a));
    if (at >= 0) return args.slice(at + 1, at + 2);
    const operands = [];
    for (let i = 0; i < args.length; i++) {
      if (/^-(pattern|encoding|context|include|exclude)$/i.test(args[i])) i++;
      else if (!args[i].startsWith('-')) operands.push(args[i]);
    }
    return args.some((a) => /^-pattern$/i.test(a)) ? operands : operands.slice(1);
  }
  const operands = [];
  let patternGiven = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { operands.push(...args.slice(i + 1)); break; }
    if (VALUE_OPTIONS.has(a)) { patternGiven ||= PATTERN_OPTIONS.has(a); i++; }
    else if (a.startsWith('-')) patternGiven ||= PATTERN_OPTIONS.has(a.split('=')[0]);
    else operands.push(a);
  }
  return patternGiven ? operands : operands.slice(1);
}

function namedFiles(base, operands, ctx) {
  if (operands.length === 0 || operands.length > MAX_NAMED_FILES) return false;
  return operands.every((a) => isFile(resolvePath(base, a, ctx)));
}

function count(text) {
  return /^\d+$/.test(text ?? '') ? Number(text) : null;
}

function optionValue(args, k, short, long) {
  const a = args[k];
  const joined = new RegExp(`^(?:${short}|${long}=)(\\+?\\d+)$`).exec(a);
  if (joined) return joined[1];
  if ((a === short || a === long) && /^\+?\d+$/.test(args[k + 1] ?? '')) return args[k + 1];
  return null;
}

function fromStart(value, total) {
  const n = Number(value.replace(/^\+/, ''));
  return value.startsWith('+') ? Math.max(total - n + 1, 0) : Math.min(n, total);
}

function headTail(args, lines, size) {
  for (let k = 0; k < args.length; k++) {
    const bytes = optionValue(args, k, '-c', '--bytes');
    if (bytes !== null) {
      const shown = fromStart(bytes, size);
      return { lines: size ? Math.round((lines * shown) / size) : 0, bytes: shown };
    }
    const lineValue = /^-(\d+)$/.exec(args[k])?.[1] ?? optionValue(args, k, '-n', '--lines');
    if (lineValue !== null) {
      const shown = fromStart(lineValue, lines);
      return { lines: shown, bytes: lines ? Math.round((size * shown) / lines) : 0 };
    }
  }
  const shown = Math.min(10, lines);
  return { lines: shown, bytes: lines ? Math.round((size * shown) / lines) : 0 };
}

function sedLines(args, lines) {
  let total = 0;
  for (const a of args) {
    for (const [, start, end] of a.matchAll(/(\d+)\s*,\s*(\d+|\$)\s*p/g)) total += (end === '$' ? lines : Math.min(Number(end), lines)) - Number(start) + 1;
    total += [...a.matchAll(/(?<![\d,])\d+\s*p/g)].length;
  }
  return total || null;
}

function shownBy(name, args, lines, size) {
  const part = (shown) => ({ lines: shown, bytes: lines ? Math.round((size * shown) / lines) : 0 });
  if (name === 'head' || name === 'tail') return headTail(args, lines, size);
  if (name === 'sed') { const shown = sedLines(args, lines); return shown === null ? part(lines) : part(Math.min(shown, lines)); }
  if (name === 'get-content' || name === 'gc' || name === 'select-object' || name === 'select') {
    for (let k = 0; k < args.length - 1; k++) {
      if (/^-(totalcount|head|first|tail|last)$/i.test(args[k]) && count(args[k + 1]) !== null) return part(Math.min(Number(args[k + 1]), lines));
    }
  }
  return part(lines);
}

function limitAfter(parts, k) {
  const next = parts[k + 1];
  if (!next?.piped) return null;
  const { name, args } = command(next.words, next.quoted);
  if (!LIMITERS.has(name) && !(name === 'sed' && args.includes('-n'))) return null;
  if (args.some((a) => !a.startsWith('-') && count(a) === null && !/^\+\d+$/.test(a) && !/p$/.test(a))) return null;
  return (lines, size) => shownBy(name, args, lines, size);
}

function evaluate(text, shell, ctx, depth) {
  if (depth > MAX_DEPTH) return null;
  const start = ctx.here;
  const parts = segments(text, { shell });
  for (let k = 0; k < parts.length; k++) {
    const result = segment(parts, k, ctx);
    if (result) return result;
  }
  for (const inner of substitutions(text, shell)) {
    const result = evaluate(inner, shell, { ...ctx, here: start, vars: new Map(ctx.vars) }, depth + 1);
    if (result) return result;
  }
  return null;
}

function segment(parts, k, ctx) {
  const { words, quoted, piped } = parts[k];
  const { name, args, redirected, assignments } = command(words, quoted);
  for (const { name: key, value } of assignments) ctx.vars.set(key, expand(value, ctx) ?? undefined);
  if (DECLARE.has(name)) {
    for (const a of args.filter((w) => ASSIGNMENT.test(w))) {
      const eq = a.indexOf('=');
      ctx.vars.set(a.slice(0, eq), expand(a.slice(eq + 1), ctx) ?? undefined);
    }
    return null;
  }
  if (!name) return null;
  if (CHANGE_DIR.has(name)) {
    const target = args.find((a) => !a.startsWith('-')) ?? '~';
    ctx.here = target === '-' ? null : resolvePath(ctx.here, target, ctx);
    return null;
  }
  if (ctx.here == null) return null;
  const { project } = ctx;
  const previous = piped && k > 0 ? command(parts[k - 1].words, parts[k - 1].quoted).name : '';
  const readsFiles = !piped || words.includes('xargs') || (LISTERS.has(previous) && SELECT_STRING.has(name));
  const where = (operands) => {
    const paths = operands.length ? operands.map((a) => resolvePath(ctx.here, a, ctx)) : [ctx.here];
    return {
      local: paths.filter((p) => p != null && inside(project, p) && exists(p)),
      elsewhere: paths.some((p) => !inside(project, p)),
    };
  };
  const operands = args.filter((a) => !a.startsWith('-'));
  const { local, elsewhere } = where(operands);

  if (name === 'git') return gitDecision(args, ctx);
  if (FINDERS.has(name) && (!elsewhere || local.some(isDir))) return deny(reasons.shellSearch);
  if (LISTERS.has(name) && recursiveList(name, args) && (!elsewhere || local.some(isDir))) return deny(reasons.shellSearch);
  if (SEARCHES.has(name)) {
    const targets = searchOperands(name, args);
    const recursive = recursiveSearch(name, args);
    if (!recursive && namedFiles(ctx.here, targets, ctx)) return null;
    const found = targets.length ? where(targets) : { local: [], elsewhere: !inside(project, ctx.here) };
    if (found.local.length > 0 || (!found.elsewhere && (readsFiles || recursive))) return deny(reasons.shellSearch);
    return null;
  }
  if (redirected) return null;
  if (READERS.has(name) || (name === 'sed' && args.includes('-n'))) return readDecisionShell(parts, k, name, args, local, ctx);
  return null;
}

function gitDecision(args, ctx) {
  let base = ctx.here;
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    if (args[i] === '-C') { base = resolvePath(base, args[i + 1] ?? '', ctx); i += 2; }
    else if (GIT_VALUE_OPTIONS.has(args[i])) i += 2;
    else i++;
  }
  if (args[i] !== 'grep') return null;
  const rest = args.slice(i + 1);
  const at = rest.indexOf('--');
  const after = at >= 0 ? rest.slice(at + 1) : [];
  if (base != null && inside(ctx.project, base) && !namedFiles(base, after, ctx)) return deny(reasons.shellSearch);
  return null;
}

function readDecisionShell(parts, k, name, args, local, ctx) {
  const files = local.filter((p) => isFile(p) && !UNCOUNTED.has(extname(p).toLowerCase()));
  if (files.length === 0) return null;
  const limit = limitAfter(parts, k);
  let lines = 0;
  let bytes = 0;
  for (const file of files) {
    const shown = shownBy(name, args, lineCount(file), statSync(file).size);
    lines += shown.lines;
    bytes += shown.bytes;
  }
  if (limit) ({ lines, bytes } = limit(lines, bytes));
  const subject = files.length === 1 ? relative(ctx.project, files[0]) : `${files.length} project files`;
  if (lines > MAX_LINES) return deny(reasons.shellRead(subject, lines));
  const cap = maxBytes(ctx.env);
  if (cap > 0 && bytes > cap) return deny(reasons.shellBytes(subject, bytes, cap));
  return null;
}

function readDecision(project, tool, env, subagent) {
  if (!tool.file_path) return null;
  const path = resolve(project, windowsPath(String(tool.file_path)));
  if (UNCOUNTED.has(extname(path).toLowerCase()) || !isFile(path)) return null;
  const here = inside(project, path);
  const shown = here ? relative(project, path) : path;
  const ranged = tool.offset != null || tool.limit != null;
  if (here && !subagent && !ranged) {
    const lines = lineCount(path);
    if (lines > MAX_LINES) return deny(reasons.largeRead(shown, lines));
  }
  const cap = maxBytes(env);
  if (cap <= 0 || !(here || spilled(path)) || statSync(path).size <= cap) return null;
  const span = readSpan(path, tool.offset, tool.limit);
  return span.size > cap ? deny(sizeReason(shown, span, cap, subagent)) : null;
}

export function decide(input, env = process.env) {
  if (env.SCOUT_GATE === 'off') return null;
  const project = resolve(input.cwd ?? process.cwd());
  const tool = input.tool_input ?? {};
  const subagent = Boolean(input.agent_id);
  if (input.tool_name === 'Read') return readDecision(project, tool, env, subagent);
  if (subagent) return null;
  switch (input.tool_name) {
    case 'Grep': {
      const path = resolve(project, windowsPath(String(tool.path ?? '.')));
      return !inside(project, path) || isFile(path) ? null : deny(reasons.search);
    }
    case 'Glob':
      return inside(project, resolve(project, windowsPath(String(tool.path ?? '.')))) ? deny(reasons.glob) : null;
    case 'Bash':
    case 'PowerShell': {
      const shell = input.tool_name === 'Bash' ? 'bash' : 'powershell';
      const ctx = { project, here: project, vars: new Map(), home: env.HOME || env.USERPROFILE || homedir(), env };
      return evaluate(String(tool.command ?? ''), shell, ctx, 0);
    }
    default:
      return null;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = decide(JSON.parse(readFileSync(0, 'utf8')));
    if (result) process.stdout.write(JSON.stringify(result));
  } catch {
    process.exit(0);
  }
}
