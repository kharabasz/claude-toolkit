import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPattern, escapeEre, homePathTerm, shortNames } from './leak-pattern.mjs'

const matches = (pattern, text) => new RegExp(pattern, 'i').test(text)

test('escapeEre makes a dotted name literal', () => {
  assert.equal(escapeEre('my.repo'), 'my\\.repo')
  assert.ok(!matches(escapeEre('my.repo'), 'myXrepo'))
})

test('private repo names match case-insensitively', () => {
  const { pattern } = buildPattern({ repos: ['secret-ledger'] })
  assert.ok(matches(pattern, 'see Secret-Ledger for details'))
  assert.ok(!matches(pattern, 'a public-ledger note'))
})

test('short names and skipped names are left out', () => {
  const { pattern, names } = buildPattern({ repos: ['abc', 'notes', 'secret-ledger'], skip: ['NOTES'] })
  assert.equal(names, 1)
  assert.ok(!matches(pattern, 'abc notes'))
})

test('extra names are added', () => {
  const { pattern } = buildPattern({ extra: ['Acme Holdings'] })
  assert.ok(matches(pattern, 'built for acme holdings'))
})

test('the home path matches with either separator', () => {
  const term = homePathTerm('C:\\Users\\Jo Example')
  assert.ok(matches(term, 'C:\\Users\\Jo Example\\.claude'))
  assert.ok(matches(term, '/c/Users/Jo Example/.claude'))
  assert.ok(!matches(term, 'Jo Example wrote this'))
})

test('8.3 short names come from the temp path', () => {
  assert.deepEqual(shortNames('C:\\Users\\JOEXAM~1\\AppData\\Local\\Temp'), ['JOEXAM~1'])
  assert.deepEqual(shortNames('/tmp'), [])
})

test('the email and secret shapes are in the pattern', () => {
  const { pattern } = buildPattern({ email: 'jo@example.com' })
  assert.ok(matches(pattern, 'mail jo@example.com'))
  assert.ok(!matches(pattern, 'mail joXexample.com'))
  assert.ok(matches(pattern, `token ghp_${'a'.repeat(36)}`))
  assert.ok(matches(pattern, ['-----BEGIN', 'OPENSSH', 'PRIVATE', 'KEY-----'].join(' ')))
  assert.ok(!matches(pattern, 'an ordinary README line'))
})
