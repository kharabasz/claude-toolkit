import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SECRET_SHAPES = [
  'ghp_[A-Za-z0-9]{36}',
  'gho_[A-Za-z0-9]{36}',
  'github_pat_[A-Za-z0-9_]{40,}',
  'sk-ant-[A-Za-z0-9_-]{20,}',
  'sk-[A-Za-z0-9]{32,}',
  'AKIA[0-9A-Z]{16}',
  'xox[abprs]-[A-Za-z0-9-]{10,}',
  'BEGIN [A-Z ]*PRIVATE KEY',
]

const MIN_NAME_LENGTH = 4

export function escapeEre(text) {
  return text.replace(/[.[\]()*+?{}|^$\\]/g, '\\$&')
}

export function homePathTerm(home) {
  const parts = home.split(/[\\/]+/).filter(Boolean)
  if (parts.length < 2) return undefined
  const [parent, user] = parts.slice(-2)
  return `${escapeEre(parent)}[/\\\\]+${escapeEre(user)}`
}

export function shortNames(path) {
  return path.split(/[\\/]+/).filter((part) => /~\d+$/.test(part))
}

export function buildPattern({ repos = [], email, home, shortPath = '', extra = [], skip = [] }) {
  const skipped = new Set(skip.map((name) => name.toLowerCase()))
  const names = [...new Set([...repos, ...extra].map((name) => name.trim()).filter(Boolean))]
    .filter((name) => name.length >= MIN_NAME_LENGTH && !skipped.has(name.toLowerCase()))
    .sort()
  const terms = names.map(escapeEre)
  if (email) terms.push(escapeEre(email))
  const homeTerm = home && homePathTerm(home)
  if (homeTerm) terms.push(homeTerm)
  terms.push(...shortNames(shortPath).map(escapeEre))
  terms.push(...SECRET_SHAPES)
  return { pattern: terms.join('|'), names: names.length, terms: terms.length }
}

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function lines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
}

function readList(path) {
  return existsSync(path) ? lines(readFileSync(path, 'utf8')) : []
}

function privateRepos() {
  const login = run('gh', ['api', 'user', '--jq', '.login'])
  const orgs = lines(run('gh', ['api', 'user/orgs', '--jq', '.[].login']))
  return [login, ...orgs].flatMap((owner) =>
    lines(run('gh', ['repo', 'list', owner, '--visibility', 'private', '--limit', '1000', '--json', 'name', '--jq', '.[].name'])),
  )
}

function main() {
  const file = process.env.LEAK_PATTERN_FILE ?? join(homedir(), '.config', 'public-leak-check', 'pattern')
  const dir = dirname(file)
  let email
  try {
    email = run('git', ['config', 'user.email'])
  } catch {
    email = undefined
  }
  const result = buildPattern({
    repos: privateRepos(),
    email,
    home: homedir(),
    shortPath: tmpdir(),
    extra: readList(join(dir, 'extra')),
    skip: readList(join(dir, 'skip')),
  })
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, result.pattern)
  console.log(`leak pattern: ${result.names} private names, ${result.terms} terms in all, written to ${file}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
