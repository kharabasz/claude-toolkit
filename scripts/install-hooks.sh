#!/bin/sh
set -e
cd "$(git rev-parse --show-toplevel)"
node scripts/leak-pattern.mjs
git config core.hooksPath .githooks
echo "hooks on: .githooks"
