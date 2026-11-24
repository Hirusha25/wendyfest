#!/usr/bin/env bash
# Rebuild the static demo from the current checkout and publish it to the gh-pages branch
# (served at https://hirusha25.github.io/wendyfest/). Usage: scripts/publish-demo.sh "what changed"
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"; msg="${1:-Demo: rebuild}"
cd "$root"
node scripts/build-demo.mjs
tmp="$(mktemp -d)"; trap 'git -C "$root" worktree remove --force "$tmp" 2>/dev/null || true' EXIT
git fetch -q origin gh-pages
git worktree add -q -B gh-pages "$tmp" origin/gh-pages
find "$tmp" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r "$root/demo/." "$tmp/"
git -C "$tmp" add -A
if git -C "$tmp" diff --cached --quiet; then echo "Demo already up to date."; exit 0; fi
git -C "$tmp" commit -q -m "$msg"
git -C "$tmp" push origin gh-pages
echo "Published. Pages picks it up in about a minute; open pages reload themselves (version.txt)."
