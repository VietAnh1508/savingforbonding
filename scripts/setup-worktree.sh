#!/usr/bin/env bash
# Bootstraps a fresh git worktree: copies untracked env files from the main
# checkout and installs dependencies (which also generates the Prisma client
# via the postinstall hook). Worktrees start with none of this since .env*
# is gitignored and node_modules isn't checked out.
set -euo pipefail

MAIN_ROOT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
WORKTREE_ROOT="$(git rev-parse --show-toplevel)"

if [ "$MAIN_ROOT" = "$WORKTREE_ROOT" ]; then
  echo "Already in the main checkout — nothing to bootstrap."
  exit 0
fi

for f in .env .env.production; do
  if [ -f "$MAIN_ROOT/$f" ] && [ ! -f "$WORKTREE_ROOT/$f" ]; then
    cp "$MAIN_ROOT/$f" "$WORKTREE_ROOT/$f"
    echo "Copied $f from main checkout"
  fi
done

npm install
