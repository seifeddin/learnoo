#!/usr/bin/env bash
# Fails if any commit in BASE..HEAD credits an AI tool as author, committer
# or co-author, or carries a "Generated with ..." AI footer.
set -euo pipefail
base="$1"; head="$2"
pattern='claude|anthropic|codex|openai|chatgpt|copilot'
bad=0
for c in $(git rev-list "$base..$head"); do
  who=$(git show -s --format='%an <%ae>%n%cn <%ce>' "$c")
  trailers=$(git show -s --format='%B' "$c" | grep -iE '^(co-authored-by|signed-off-by):|generated with' || true)
  if printf '%s\n%s\n' "$who" "$trailers" | grep -qiE "$pattern"; then
    echo "::error::Commit $(git show -s --format='%h %s' "$c") credits an AI tool. Remove AI co-author trailers and footers."
    bad=1
  fi
done
exit "$bad"
