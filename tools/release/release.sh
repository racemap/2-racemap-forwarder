#!/bin/bash
#
# Cuts a release: bumps package.json, tags vX.Y.Z on main, pushes both and creates a draft
# GitHub release with the notes.
#
#   ./tools/release/release.sh              patch   v1.2.0 -> v1.2.1
#   ./tools/release/release.sh --minor      minor   v1.2.1 -> v1.3.0
#   ./tools/release/release.sh --major      major   v1.3.0 -> v2.0.0
#   ./tools/release/release.sh --dry-run    print every decision, change nothing
#   ./tools/release/release.sh --self-check test the version logic in a throwaway repo
#
# Pushing the tag starts .github/workflows/release.yml. It builds Windows, macOS and Linux and
# publishes the draft only when all builds are green.
set -eEuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BUMP="patch"
DRY_RUN=0
MODE="release"
while [ $# -gt 0 ]; do
    case "$1" in
        --minor) BUMP="minor" ;;
        --major) BUMP="major" ;;
        --patch) BUMP="patch" ;;
        --dry-run) DRY_RUN=1 ;;
        --self-check) MODE="self-check" ;;
        -h|--help) sed -n '3,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
    shift
done

log() { echo "release: $*" >&2; }
die() { echo "release: $*" >&2; exit 1; }
would() { [ "$DRY_RUN" = "1" ] && { log "DRY_RUN would: $*"; return 0; }; return 1; }

# next_version <x.y.z> <patch|minor|major>
next_version() {
    local major minor patch
    IFS=. read -r major minor patch <<<"$1"
    case "$2" in
        major) echo "$((major + 1)).0.0" ;;
        minor) echo "$major.$((minor + 1)).0" ;;
        *) echo "$major.$minor.$((patch + 1))" ;;
    esac
}

# Highest vX.Y.Z tag merged into <ref>, without the "v". Malformed tags such as v.1.1.4 are ignored.
latest_version() {
    git tag --list 'v*' --merged "$1" \
        | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
        | sed 's/^v//' \
        | sort -t. -k1,1n -k2,2n -k3,3n \
        | tail -n 1 || true
}

if [ "$MODE" = "self-check" ]; then
    failures=0
    expect() {
        if [ "$2" = "$3" ]; then echo "  ok   $1"; else echo "  FAIL $1: got [$2], want [$3]"; failures=$((failures + 1)); fi
    }
    expect "patch" "$(next_version 1.2.9 patch)" "1.2.10"
    expect "minor resets patch" "$(next_version 1.9.9 minor)" "1.10.0"
    expect "major resets minor and patch" "$(next_version 1.9.9 major)" "2.0.0"

    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT
    git -C "$TMP" init -q
    for tag in v1.1.3 v.1.1.4 v1.9.0 v1.10.0 v1.10.0-rc.1; do
        git -C "$TMP" -c user.name=x -c user.email=x@x commit -q --allow-empty -m "$tag"
        git -C "$TMP" tag "$tag"
    done
    expect "numeric order, malformed and pre-release tags ignored" "$(cd "$TMP" && latest_version HEAD)" "1.10.0"
    [ "$failures" = "0" ] || exit 1
    exit 0
fi

cd "$REPO_ROOT"

command -v gh >/dev/null || die "the gh CLI is required."
gh auth status >/dev/null 2>&1 || die "run 'gh auth login' first."
[ -z "$(git status --porcelain)" ] || die "the working tree is not clean."
[ "$(git branch --show-current)" = "main" ] || die "releases are cut from main."

git fetch -q --tags origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "main is not in sync with origin/main. Pull or push first."

log "running checks"
yarn check
yarn typecheck

PREVIOUS="$(latest_version origin/main)"
[ -n "$PREVIOUS" ] || die "no vX.Y.Z tag found on main."
VERSION="$(next_version "$PREVIOUS" "$BUMP")"
TAG="v$VERSION"
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && die "$TAG already exists."
log "v$PREVIOUS -> $TAG ($BUMP)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
NOTES="$TMP/notes.md"

# A failure here never blocks the release: fall back to GitHub's generated list.
if ! "$SCRIPT_DIR/notes.sh" "v$PREVIOUS" "$TAG" > "$NOTES" 2> "$TMP/notes.err" || [ ! -s "$NOTES" ]; then
    log "AI notes failed ($(tail -n 1 "$TMP/notes.err")), using GitHub's generated notes"
    gh api "repos/{owner}/{repo}/releases/generate-notes" -f tag_name="$TAG" -f previous_tag_name="v$PREVIOUS" --jq .body > "$NOTES"
fi

BASE="https://github.com/racemap/2-racemap-forwarder/releases/download/$TAG"
cat >> "$NOTES" <<EOF

## Downloads

| System | File |
| --- | --- |
| Windows (installer) | [2-racemap-forwarder-win-x64-setup.exe]($BASE/2-racemap-forwarder-win-x64-setup.exe) |
| Windows (portable) | [2-racemap-forwarder-win-x64-portable.exe]($BASE/2-racemap-forwarder-win-x64-portable.exe) |
| macOS (Apple Silicon) | [2-racemap-forwarder-mac-arm64.dmg]($BASE/2-racemap-forwarder-mac-arm64.dmg) |
| macOS (Intel) | [2-racemap-forwarder-mac-x64.dmg]($BASE/2-racemap-forwarder-mac-x64.dmg) |
| Linux (AppImage) | [2-racemap-forwarder-linux-x64.AppImage]($BASE/2-racemap-forwarder-linux-x64.AppImage) |
| Linux (deb) | [2-racemap-forwarder-linux-x64.deb]($BASE/2-racemap-forwarder-linux-x64.deb) |
EOF

if [ "$DRY_RUN" = "1" ]; then
    log "notes:"
    cat "$NOTES" >&2
else
    # $EDITOR often carries flags ("code --wait"), so it is not quoted.
    ${VISUAL:-${EDITOR:-nano}} "$NOTES"
    [ -s "$NOTES" ] || die "the notes are empty, nothing was released."
fi

would "set package.json version to $VERSION, commit 'Release $TAG', tag $TAG, push main and $TAG" || {
    npm pkg set version="$VERSION"
    git commit -q -m "Release $TAG" package.json
    git tag -a "$TAG" -m "$TAG"
    git push -q --atomic origin main "$TAG"
}

would "gh release create $TAG --draft" || gh release create "$TAG" --draft --verify-tag --title "$TAG" --notes-file "$NOTES"

log "done. The builds run at https://github.com/racemap/2-racemap-forwarder/actions/workflows/release.yml"
log "the release is published when they are green: https://github.com/racemap/2-racemap-forwarder/releases/tag/$TAG"
