import { spawn, spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { chooseSolution } from './solution.mjs';

const log = (line) => process.stderr.write(`csharp-ls-lsp: ${line}\n`);
const root = resolve(process.argv[2] || process.cwd());
const { solution, others } = chooseSolution(root, process.env.CSHARP_LS_SOLUTION);

if (solution) {
  log(`loading ${relative(root, solution) || solution}${others.length ? `; also found ${others.join(', ')} (set CSHARP_LS_SOLUTION to pick another)` : ''}`);
  if (process.env.CSHARP_LS_RESTORE !== '0') {
    const restore = spawnSync('dotnet', ['restore', solution, '--verbosity', 'quiet'], { cwd: root, stdio: ['ignore', 2, 2], windowsHide: true });
    if (restore.error || restore.status !== 0) log(`dotnet restore did not finish cleanly (${restore.error?.message ?? `exit ${restore.status}`}); projects it could not restore will miss references`);
  }
} else {
  log(`no .sln or .slnx within ${root}; csharp-ls will search on its own`);
}

const server = spawn('csharp-ls', solution ? ['--solution', solution] : [], { cwd: root, stdio: 'inherit', windowsHide: true });
server.on('error', (error) => {
  log(`could not start csharp-ls (${error.message}); install it with: dotnet tool install --global csharp-ls`);
  process.exit(1);
});
server.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
