import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_LINES, SCOUT_NAME, decide, segments } from './scout-gate.mjs';

const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i}\n`).join('');
const longLines = (n) => `${'x'.repeat(299)}\n`.repeat(n);
const SPILL = join('.claude', 'projects', 'p', 's', 'tool-results', 'b8vjr6hif.txt');
const SAVED = join('toolkit', 'spend-bar', 'events', 'output', '2026-11-13', 's1.txt');
const q = (path) => `"${path.replaceAll('\\', '/')}"`;

function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'scout gate '));
  const root = join(base, 'project');
  const other = join(base, 'other');
  const write = (dir, files) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
  };
  write(root, {
    'src/Small.cs': lines(MAX_LINES),
    'src/Large.cs': lines(MAX_LINES + 1),
    'src/Huge.cs': lines(5000),
    'docs/diagram.png': lines(MAX_LINES + 1),
    'docs/ledger.md': longLines(200),
    'docs/min.json': `${'x'.repeat(100_000)}\n`,
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`parts/P${i}.cs`, lines(MAX_LINES - 1)])),
  });
  write(other, { 'lib/a.py': lines(5), 'lib/big.log': longLines(200), [SPILL]: longLines(200), [SAVED]: longLines(200) });
  return { base, root, other };
}

function withFixture(fn) {
  const f = fixture();
  try { return fn(f); } finally { rmSync(f.base, { recursive: true, force: true }); }
}

const call = (root, tool_name, tool_input, extra = {}, env = {}) => decide({ cwd: root, tool_name, tool_input, ...extra }, env);
const denied = (result) => result?.hookSpecificOutput?.permissionDecision === 'deny';
const reason = (result) => result.hookSpecificOutput.permissionDecisionReason;
const bash = (root, command, env) => call(root, 'Bash', { command }, {}, env);
const pwsh = (root, command) => call(root, 'PowerShell', { command });

test('subagents search and read long files freely', () => withFixture(({ root }) => {
  assert.equal(call(root, 'Grep', { pattern: 'x' }, { agent_id: 'a1', agent_type: SCOUT_NAME }), null);
  assert.equal(call(root, 'Glob', { pattern: '**/*.cs' }, { agent_id: 'a1' }), null);
  assert.equal(call(root, 'Read', { file_path: 'src/Large.cs' }, { agent_id: 'a1' }), null);
  assert.equal(call(root, 'Bash', { command: 'grep -rn x . && cat src/Huge.cs' }, { agent_id: 'a1' }), null);
}));

test('the gate can be turned off', () => withFixture(({ root }) => {
  assert.equal(call(root, 'Glob', { pattern: '**/*.cs' }, {}, { SCOUT_GATE: 'off' }), null);
  assert.equal(call(root, 'Read', { file_path: 'docs/ledger.md' }, { agent_id: 'a1' }, { SCOUT_GATE: 'off' }), null);
}));

test('Grep across the project is denied and names the scout', () => withFixture(({ root }) => {
  const result = call(root, 'Grep', { pattern: 'x' });
  assert.ok(denied(result));
  assert.match(reason(result), new RegExp(SCOUT_NAME));
  assert.ok(denied(call(root, 'Grep', { pattern: 'x', path: 'src' })));
}));

test('Grep of one file, or outside the project, is allowed', () => withFixture(({ root, other }) => {
  assert.equal(call(root, 'Grep', { pattern: 'x', path: 'src/Large.cs' }), null);
  assert.equal(call(root, 'Grep', { pattern: 'x', path: other }), null);
}));

test('Glob in the project is denied, outside it is allowed', () => withFixture(({ root, other }) => {
  assert.ok(denied(call(root, 'Glob', { pattern: '**/*.cs' })));
  assert.equal(call(root, 'Glob', { pattern: '*.py', path: other }), null);
}));

test('a whole-file Read of a large file is denied with its line count', () => withFixture(({ root }) => {
  const result = call(root, 'Read', { file_path: join(root, 'src/Large.cs') });
  assert.ok(denied(result));
  assert.match(reason(result), new RegExp(`${MAX_LINES + 1} lines`));
}));

test('ranged, small, missing, image and outside reads are allowed', () => withFixture(({ root, other }) => {
  for (const input of [
    { file_path: 'src/Large.cs', offset: 10, limit: 20 },
    { file_path: 'src/Large.cs', limit: 20 },
    { file_path: 'src/Small.cs' },
    { file_path: 'src/Missing.cs' },
    { file_path: 'docs/diagram.png' },
    { file_path: join(other, 'lib', 'a.py') },
  ]) assert.equal(call(root, 'Read', input), null, JSON.stringify(input));
}));

test('a Read over the byte cap is denied even under the line limit', () => withFixture(({ root }) => {
  const result = call(root, 'Read', { file_path: 'docs/ledger.md' });
  assert.ok(denied(result));
  assert.match(reason(result), /Lines 1-200 of docs[\\/]ledger\.md come to 60 KB/);
  assert.match(reason(result), /about 133 lines at a time/);
  assert.match(reason(result), new RegExp(SCOUT_NAME));
  assert.ok(denied(call(root, 'Read', { file_path: 'docs/ledger.md', offset: 20, limit: 150 })));
  assert.equal(call(root, 'Read', { file_path: 'docs/ledger.md', offset: 50, limit: 100 }), null);
  assert.equal(call(root, 'Read', { file_path: 'docs/ledger.md', offset: 150 }), null);
}));

test('a line longer than the byte cap says no range fits and sends to Grep', () => withFixture(({ root }) => {
  for (const extra of [{}, { agent_id: 'a1' }]) {
    const result = call(root, 'Read', { file_path: 'docs/min.json', offset: 1, limit: 1 }, extra);
    assert.ok(denied(result));
    assert.match(reason(result), /Line 1 of docs[\\/]min\.json alone is 100 KB/);
    assert.match(reason(result), /no range that includes it fits/);
    assert.match(reason(result), /Grep/);
    assert.doesNotMatch(reason(result), /lines at a time/);
  }
}));

test('the byte cap applies to subagents and points them to Grep', () => withFixture(({ root }) => {
  const result = call(root, 'Read', { file_path: 'docs/ledger.md' }, { agent_id: 'a1' });
  assert.ok(denied(result));
  assert.match(reason(result), /Grep it/);
  assert.doesNotMatch(reason(result), new RegExp(SCOUT_NAME));
  assert.equal(call(root, 'Read', { file_path: 'docs/ledger.md', limit: 100 }, { agent_id: 'a1' }), null);
}));

test('the byte cap covers spilled and saved output outside the project', () => withFixture(({ root, other }) => {
  for (const rel of [SPILL, SAVED]) {
    const path = join(other, rel);
    assert.ok(denied(call(root, 'Read', { file_path: path })), rel);
    assert.ok(denied(call(root, 'Read', { file_path: path }, { agent_id: 'a1' })), rel);
    assert.ok(reason(call(root, 'Read', { file_path: path })).includes(path), rel);
    assert.equal(call(root, 'Read', { file_path: path, offset: 1, limit: 100 }), null, rel);
  }
  assert.equal(call(root, 'Read', { file_path: join(other, 'lib', 'big.log') }), null);
  assert.equal(call(root, 'Read', { file_path: join(other, 'lib', 'big.log') }, { agent_id: 'a1' }), null);
}));

test('the byte cap can be set or turned off', () => withFixture(({ root }) => {
  const read = (input, env) => call(root, 'Read', input, {}, env);
  assert.equal(read({ file_path: 'docs/ledger.md' }, { SCOUT_GATE_MAX_BYTES: '0' }), null);
  assert.equal(read({ file_path: 'docs/ledger.md' }, { SCOUT_GATE_MAX_BYTES: '100000' }), null);
  assert.ok(denied(read({ file_path: 'docs/ledger.md' }, { SCOUT_GATE_MAX_BYTES: 'nonsense' })));
  assert.match(reason(read({ file_path: 'docs/ledger.md', limit: 100 }, { SCOUT_GATE_MAX_BYTES: '20000' })), /over the 20 KB/);
}));

test('shell searches of the project are denied', () => withFixture(({ root }) => {
  for (const command of [
    'grep -rn Foo .',
    'grep -rn Foo src/Small.cs',
    'grep -n Foo src',
    'grep -n Foo src/*.cs',
    'grep -n Foo src/Small.cs src/Large.cs docs/ledger.md src/Huge.cs',
    'grep -n -A 3 Foo',
    'rg Foo',
    'cd src && rg -n "Foo|Bar"',
    'git grep Foo',
    'git grep -n Foo -- src',
    'git --no-pager grep -n Foo',
    'git -C . grep -n Foo',
    'git -c color.ui=never grep Foo',
    'find . -name "*.cs"',
    `find . ${q(root + '/../other')} -name "*.cs"`,
    'fd Large',
    'ls -R src',
    'gci -r src',
    'git ls-files | xargs grep -n Foo',
    'echo "$(grep -rn Foo .)"',
    'cat <(rg Foo)',
  ]) assert.ok(denied(bash(root, command)), command);
  for (const command of [
    'Get-ChildItem -Recurse -Filter *.cs',
    'Get-ChildItem src | Select-String Foo',
    'Select-String -Pattern Foo -Path src',
  ]) assert.ok(denied(pwsh(root, command)), command);
}));

test('shell searches of a few named files are allowed', () => withFixture(({ root }) => {
  for (const command of [
    'grep Foo src/Small.cs',
    'grep -n -i "foo|bar" src/Small.cs src/Large.cs',
    'grep -n -A 3 -B2 -m 5 Foo src/Large.cs | head -20',
    'grep -n -e Foo -e Bar src/Small.cs',
    'rg -n Foo docs/ledger.md',
    "cd src && grep -c '' Small.cs Large.cs",
    'git grep -n Foo -- src/Small.cs',
    'git grep -n Foo origin/main -- src/Small.cs src/Large.cs',
    'git --no-pager grep -n Foo -- src/Small.cs',
  ]) assert.equal(bash(root, command), null, command);
  assert.equal(pwsh(root, 'Select-String -Pattern Foo -Path src/Small.cs'), null);
}));

test('a shell search denial says how to name the file', () => withFixture(({ root }) => {
  assert.match(reason(bash(root, 'grep -rn Foo .')), /grep -n PATTERN path\/to\/file/);
}));

test('shell reads of more than the line limit are denied, counting every file', () => withFixture(({ root }) => {
  for (const command of [
    'cat src/Large.cs',
    'cat src/Large.cs 2>/dev/null',
    '2>/dev/null cat src/Large.cs',
    'head -n 400 src/Large.cs',
    'tail -400 src/Large.cs',
    'tail -n +1 src/Large.cs',
    "sed -n '1,$p' src/Large.cs",
    "sed -n '1,301p' src/Large.cs",
    'cat src/Small.cs src/Large.cs',
    `cat ${Array.from({ length: 10 }, (_, i) => `parts/P${i}.cs`).join(' ')}`,
    'head -c 1000000 src/Huge.cs',
    'cat src/Huge.cs | head -400',
  ]) assert.ok(denied(bash(root, command)), command);
  assert.ok(denied(pwsh(root, 'Get-Content src/Large.cs')));
  const result = bash(root, 'cat src/Large.cs');
  assert.match(reason(result), /src[\\/]Large\.cs/);
  assert.match(reason(result), new RegExp(`${MAX_LINES + 1} lines`));
  assert.match(reason(bash(root, 'cat parts/P0.cs parts/P1.cs')), /598 lines of 2 project files/);
}));

test('a shell read over the byte cap is denied', () => withFixture(({ root }) => {
  assert.ok(denied(bash(root, 'cat docs/ledger.md')));
  assert.equal(bash(root, 'head -50 docs/ledger.md'), null);
  assert.equal(bash(root, 'cat docs/ledger.md', { SCOUT_GATE_MAX_BYTES: '0' }), null);
}));

test('shell reads of small files, short ranges and trimmed pipes are allowed', () => withFixture(({ root }) => {
  for (const command of [
    'cat src/Small.cs',
    'head -50 src/Large.cs',
    'head src/Large.cs',
    'tail -n 20 src/Large.cs',
    "sed -n '10,20p' src/Large.cs",
    "sed -n '10,20p;40,60p' src/Large.cs",
    'head -c 2000 src/Huge.cs',
    'cat src/Huge.cs | head -20',
    'cat src/Huge.cs | tail -n 30',
    "cat src/Huge.cs | sed -n '1,40p'",
    'cat docs/diagram.png',
  ]) assert.equal(bash(root, command), null, command);
  for (const command of [
    'Get-Content src/Large.cs -TotalCount 20',
    'Get-Content src/Huge.cs | Select-Object -First 20',
    'gc src/Huge.cs | select -Last 5',
  ]) assert.equal(pwsh(root, command), null, command);
}));

test('filters, writes and commands that read no code are allowed', () => withFixture(({ root, other }) => {
  for (const command of [
    'git log --oneline | head -20',
    'git status | grep src',
    'dotnet test | grep -E "Failed|Passed"',
    'ls -la src',
    'ls -ltr',
    'ls src | grep -c Small',
    `rm -rf ${q(other)}/x && ls ${q(other)} | grep -c lib`,
    'cat src/Small.cs > out.txt',
    "cat > src/New.cs <<'EOF'\ngrep -rn Foo .\ncat src/Large.cs\nEOF",
    'node scripts/verify.mjs -m "grep for x"',
    'echo "rg Foo; cat src/Small.cs"',
    '# grep -rn Foo .',
    `grep -n error ${q(join(other, 'job.log'))}`,
    `find ${q(other)} -name "*.log"`,
    "git commit -m \"$(cat <<'EOF'\nsee \"grep -r x\"; \"cat hooks/hooks.json\"\nEOF\n)\"",
  ]) assert.equal(bash(root, command), null, command);
  assert.equal(pwsh(root, "git commit -m @'\nDon't break\ncat src/Huge.cs\n'@"), null);
}));

test('a cd elsewhere moves where later paths resolve', () => withFixture(({ root, other }) => {
  assert.equal(bash(root, `cd ${q(other)} && grep -rn x lib`), null);
  assert.equal(bash(root, `cd ${q(other)} && sed -n '1,$p' lib/a.py`), null);
  assert.equal(bash(root, `cd ${q(other)} && rg x`), null);
  assert.equal(bash(root, `cd ${q(other)} && git grep x`), null);
  assert.ok(denied(bash(root, `cd ${q(other)} && cd ${q(root)} && rg x`)));
}));

test('home paths are expanded', () => withFixture(({ base, root }) => {
  const env = { HOME: base };
  assert.equal(bash(root, 'grep -rn x ~/other', env), null);
  assert.equal(bash(root, "find $HOME/other -name '*.py'", env), null);
  assert.ok(denied(bash(root, 'cat ~/project/src/Large.cs', env)));
}));

test('variables set in the command are expanded, and unknown ones pass', () => withFixture(({ root, other }) => {
  assert.equal(bash(root, `R=${q(other)}; grep -n x $R/lib/a.py; grep -rn x \${R}/lib`), null);
  assert.equal(bash(root, `export R=${q(other)}; cd $R && rg x`), null);
  assert.ok(denied(bash(root, `R=${q(root + '/src')}; cat $R/Large.cs`)));
  assert.equal(bash(root, 'grep -rn x $SOMEWHERE/logs'), null);
  assert.equal(bash(root, 'cd $SOMEWHERE && grep -rn x .'), null);
  assert.equal(bash(root, 'LOG=$TMPDIR/x.log; grep -n err $LOG'), null);
}));

test('Git Bash drive paths resolve to the Windows drive', { skip: process.platform !== 'win32' }, () => withFixture(({ root }) => {
  const msys = `/${root[0].toLowerCase()}${root.slice(2).replaceAll('\\', '/')}`;
  assert.ok(denied(bash(root, `cd "${msys}" && rg line`)));
  assert.ok(denied(bash(root, `grep -rn line "${msys}"`)));
  assert.ok(denied(bash(root, `cat "${msys}/src/Large.cs"`)));
}));

test('segments split on unquoted separators and know which take a pipe', () => {
  const words = (text) => segments(text).map((s) => s.words);
  assert.deepEqual(words('a "b|c" | d && e; f || g'), [['a', 'b|c'], ['d'], ['e'], ['f'], ['g']]);
  assert.deepEqual(words("cat <<'EOF'\nrg x\nEOF\nls"), [['cat', '<<EOF'], ['ls']]);
  assert.deepEqual(segments('a | b && c').map((s) => s.piped), [false, true, false]);
});

test('the script denies through stdout and allows with no output', () => withFixture(({ root }) => {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'scout-gate.mjs');
  const env = { ...process.env, SCOUT_GATE: '' };
  const run = (input) => spawnSync(process.execPath, [script], { input: typeof input === 'string' ? input : JSON.stringify(input), env, encoding: 'utf8' });
  const event = { cwd: root, tool_name: 'Glob', tool_input: { pattern: '**' } };
  const deniedRun = run(event);
  assert.equal(deniedRun.status, 0);
  assert.equal(JSON.parse(deniedRun.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const allowedRun = run({ ...event, agent_id: 'a1' });
  assert.deepEqual([allowedRun.status, allowedRun.stdout], [0, '']);
  assert.equal(run('not json').stdout, '');
}));
