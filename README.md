# Claude toolkit

Skills and other tools for Claude Code, published as a plugin marketplace. The spend-bar mod moved to [kharabasz/spend-bar](https://github.com/kharabasz/spend-bar).

## Skills

### humanizer

Rewrites AI-sounding prose so it reads like the writer without changing what it says: contrasts, one-line closers, forced triads, dashes, inflated claims, stock AI words, decorative formatting and chat leftovers. Invoke it with `/humanizer` or ask Claude to humanize a piece of text.

Imported unchanged from [blader/humanizer](https://github.com/blader/humanizer) (v3.1.0, commit `8c307f3`), MIT licensed, © 2025 Siqi Chen. Its own licence is in `skills/humanizer/LICENSE`.

### plain-direct-voice

Writes and edits blog posts and essays in a plain, direct voice: plain assertions, everyday words, no callbacks or wordplay, light on research, other people's stories told second-hand, and endings that state the practice. The rules and examples come from a writer's edits to [Token boxing](https://codingthinks.com/ai/token-boxing/). It flags once when a plainer word changes what a source says. Use it with humanizer: humanizer removes AI habits, and this skill is the writer's sample it matches. Invoke it with `/plain-direct-voice` or ask Claude to write in a plain, direct voice. Not for code, commit messages or pull requests.

### writing-quorum-review

Reviews a blog post, essay or article with four reviewer agents on different models (Opus, Sonnet, Haiku and Fable). Every reviewer gets the same brief with a shared list of finding tags, so their votes can be counted; Claude then applies only the findings at least three of the four agree on, breaks two-two splits in favour of what the author already proposed, and never copies in facts a reviewer made up. Use it for questions about flow, what to cut, or how to frame an idea. Invoke it with `/writing-quorum-review` or ask for a multi-model review. Pairs with `plain-direct-voice` and `humanizer` for the rewrite.

### chatgpt-image

Generates raster images (art, textures, frames, ornaments, scenes) with ChatGPT in the browser and saves each one into the project, for when Claude needs an image and has no generator of its own. It sends one image per prompt, because ChatGPT spreads quality across every image in a request. It asks for standalone assets rather than mockups, and it saves each image with ChatGPT's own Download button. A script then moves the file from Downloads into the project, picking it up even while the browser still holds it as a `.tmp`. You sign in to ChatGPT yourself. It prefers Claude in Chrome, which saves without asking, because the desktop app's built-in browser asks you to accept every download. Invoke it with `/chatgpt-image` or ask Claude to make an image with ChatGPT.

## Language servers

### ts7-lsp

TypeScript and JavaScript code intelligence (find references, go to definition, hover, diagnostics after edits) from the language server built into TypeScript 7's `tsc`, which it runs as `tsc --lsp --stdio`. The official `typescript-lsp` plugin runs `typescript-language-server`, which needs a TypeScript with `tsserver`; TypeScript 7 ships only `tsc`, so with a global TypeScript 7 that server fails to start from a repository root. This plugin uses TypeScript 7's own server instead, and it also serves projects that build with TypeScript 6 or older.

It needs TypeScript 7 or later as the `tsc` on your `PATH`:

```bash
npm install -g typescript@7
```

Disable `typescript-lsp` if you have it, so only one server claims `.ts` and `.js` files:

```bash
claude plugin disable typescript-lsp@claude-plugins-official
```

### csharp-ls-lsp

C# code intelligence from [csharp-ls](https://github.com/razzmatazz/csharp-language-server). The official `csharp-lsp` plugin starts `csharp-ls` with no solution, and `csharp-ls` then searches the whole project, `.claude/worktrees` included, and may load a worktree's copy of the solution. Files in the checkout are then outside the loaded solution and find no references. This plugin starts `csharp-ls` through a small Node launcher that:

- loads the `.sln` or `.slnx` nearest the project root, at most four folders down, skipping folders that start with a dot (`.claude`, `.git`), `node_modules`, `bin`, `obj`, `packages`, `artifacts` and `TestResults`. At the same depth an `.slnx` wins over an `.sln`;
- runs `dotnet restore` on that solution first, so a project that was never built locally, as in a fresh worktree, still resolves its references. A restore with nothing to do takes about two seconds;
- logs its choice, and any other solutions it found, to the server's stderr.

Set `CSHARP_LS_SOLUTION` to a path relative to the project root to load another solution, and `CSHARP_LS_RESTORE=0` to skip the restore, in your shell or the `env` block of `settings.json`.

It needs Node.js, the .NET 10 SDK and `csharp-ls` on your `PATH`:

```bash
dotnet tool install --global csharp-ls
```

Disable `csharp-lsp` if you have it, so only one server claims `.cs` files:

```bash
claude plugin disable csharp-lsp@claude-plugins-official
```

### yaml-lsp

YAML diagnostics and hover from Red Hat's [yaml-language-server](https://github.com/redhat-developer/yaml-language-server). It validates each file against the [SchemaStore](https://www.schemastore.org/) schema its name matches: `.github/workflows/*.yml` against the GitHub Workflow schema, `compose.yml` and `compose.*.yml` against the Compose specification, and `.github/dependabot.yml` against the Dependabot schema. A misspelt key, a missing `runs-on` or a value of the wrong type then shows up after the edit instead of after a push and a CI run. Files that match no schema are checked for YAML syntax only.

It downloads the SchemaStore catalog and each schema it needs when it starts, so it needs network access. Right after the server starts, its first report on a file can come before that file's schema has loaded, and so be empty. Later edits are checked against the loaded schema.

It needs `yaml-language-server` on your `PATH`:

```bash
npm install -g yaml-language-server
```

## Install

At the prompt of a terminal session (swap `humanizer` for `plain-direct-voice`, `writing-quorum-review`, `chatgpt-image`, `ts7-lsp`, `csharp-ls-lsp` or `yaml-lsp` as needed):

```
/plugin install humanizer --marketplace kharabasz/claude-toolkit
```

From a shell:

```bash
claude plugin install humanizer --marketplace kharabasz/claude-toolkit
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `kharabasz/claude-toolkit`, then **Add plugin**.

## Developing

Each skill plugin lives in `skills/<name>/`, and each language server plugin in `lsp/<name>/`. Check one with:

```bash
claude plugin validate skills/humanizer
```

Run the tests with:

```bash
node --test "lsp/**/*.test.mjs" "scripts/*.test.mjs"
```

### Leak check

This repository is public. Its git hooks block a commit, a commit message or a push that names one of your private repositories, your git email or your home folder, or holds something shaped like an access key. Turn them on once per clone:

```bash
sh scripts/install-hooks.sh
```

The script asks `gh` for the private repositories of your account and its organizations and writes the pattern to `~/.config/public-leak-check/pattern`, outside the repository, so the repository never lists them. Run it again after you add a private repository. Next to the pattern, an `extra` file adds names of your own, one per line, and a `skip` file drops names that are ordinary words.

The hooks see only commits made in a local clone. A commit made through the GitHub API skips them.

