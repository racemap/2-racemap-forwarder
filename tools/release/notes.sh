#!/bin/bash
#
# Writes the release notes for <previous-tag>..HEAD to stdout.
#
#   ./tools/release/notes.sh <previous-tag> <next-tag>
#
# Runnable on its own, so the wording can be tuned without cutting a release. All facts are
# gathered here and handed to claude as a pure text transformation without tools.
set -eEuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREVIOUS="${1:?usage: notes.sh <previous-tag> <next-tag>}"
NEXT="${2:?usage: notes.sh <previous-tag> <next-tag>}"

command -v gh >/dev/null || { echo "the gh CLI is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
command -v claude >/dev/null || { echo "the claude CLI is required to write the notes." >&2; exit 1; }

# Squash merges put "(#123)" at the end of the subject; that is how commits map to pull requests.
COMMITS="$(git log --format=%s "$PREVIOUS..HEAD" | grep -v '^Release v' || true)"
NUMBERS="$(grep -oE '\(#[0-9]+\)$' <<<"$COMMITS" | tr -dc '0-9\n' || true)"

PULLS='[]'
for n in $NUMBERS; do
    pr="$(gh pr view "$n" --json number,title,url,body --jq '.body |= .[0:4000]')" || continue
    PULLS="$(jq --argjson pr "$pr" '. + [$pr]' <<<"$PULLS")"
done

jq -n --arg previous "$PREVIOUS" --arg next "$NEXT" --argjson pulls "$PULLS" \
    --arg commits "$(grep -vE '\(#[0-9]+\)$' <<<"$COMMITS" || true)" \
    '{previous: $previous, next: $next, pulls: $pulls, commits: ($commits | split("\n") | map(select(. != "")))}' \
    | claude -p --no-session-persistence --allowed-tools="" --append-system-prompt "$(cat "$SCRIPT_DIR/notes.prompt.md")" \
        "Write the release notes for the JSON on stdin."
