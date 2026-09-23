#!/bin/bash
# fancysauce-savings — build the Jamf deployment package.
#
# Stages the payload from the templates beside this script and runs pkgbuild.
# Jamf renders nothing at install time, so everything the package carries is
# fixed here: the arm (--cc-mode), the tenant key, and the pinned release.
#
#   build-pkg.sh --key-file <path> [--cc-mode managed-hooks|plugin]
#                [--out <file.pkg>] [--stage <dir>]
#
#   --key-file   A file holding the ingest token (fs_ingest_…). Never pass the
#                key on the command line; argv is visible to every process.
#   --cc-mode    managed-hooks (default): telemetry-only, release pinned in
#                /etc/fancysauce/claude-code.pin, no user action.
#                plugin: registers the marketplace; each user installs once.
#   --out        Package path. Default: fancysauce-mdm-<mode>-<tag>.pkg here.
#   --stage      Stage into <dir>/root + <dir>/scripts and stop; no pkgbuild.
set -eo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
CODEX="$HERE/../codex"

CC_MODE="managed-hooks"
KEY_FILE=""
OUT=""
STAGE=""
STAGE_GIVEN=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --key-file) KEY_FILE="${2:-}"; shift 2 ;;
    --cc-mode) CC_MODE="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    --stage) STAGE="${2:-}"; STAGE_GIVEN=1; shift 2 ;;
    -h | --help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "build-pkg: unknown argument: $1" >&2; exit 2 ;;
  esac
done

case "$CC_MODE" in
  plugin | managed-hooks) ;;
  *) echo "build-pkg: --cc-mode must be 'plugin' or 'managed-hooks' (got: $CC_MODE)" >&2; exit 2 ;;
esac

[ -n "$KEY_FILE" ] || { echo "build-pkg: --key-file is required" >&2; exit 2; }
[ -r "$KEY_FILE" ] || { echo "build-pkg: cannot read --key-file $KEY_FILE" >&2; exit 2; }
KEY="$(/usr/bin/head -1 "$KEY_FILE" | LC_ALL=C /usr/bin/tr -d '[:space:]')"
# The ingest-token shapes the plugin's bootstrap accepts, current and older. A
# user key, the template placeholder, or an empty file each produce a package
# that installs cleanly and collects nothing, so they are refused here.
if ! printf '%s' "$KEY" | LC_ALL=C /usr/bin/grep -qE '^fs_(ingest(_test)?|(live|test)_t)_[A-Za-z0-9_-]{43}$'; then
  echo "build-pkg: $KEY_FILE does not hold an ingest token (expected fs_ingest_… or fs_ingest_test_…, 43 characters of token material; the older spelling is also accepted)" >&2
  exit 2
fi

read -r TAG SHA < "$HERE/claude-code.pin"
[ -n "$STAGE" ] || STAGE="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/fancysauce-pkg.XXXXXXXX")"
[ -n "$OUT" ] || OUT="$HERE/fancysauce-mdm-$CC_MODE-$TAG.pkg"
ROOT="$STAGE/root"
SCRIPTS="$STAGE/scripts"

put() { # <src> <dest-relative-to-root> <mode>
  /bin/mkdir -p "$ROOT/$(dirname "$2")"
  /bin/cp "$1" "$ROOT/$2"
  /bin/chmod "$3" "$ROOT/$2"
}

# --- Claude Code ------------------------------------------------------------
if [ "$CC_MODE" = "managed-hooks" ]; then
  put "$HERE/50-fancysauce.json" "Library/Application Support/ClaudeCode/managed-settings.d/50-fancysauce.json" 0644
  put "$CODEX/fancysauce.sh" "etc/fancysauce/hooks/fancysauce.sh" 0755
  put "$HERE/claude-code.pin" "etc/fancysauce/claude-code.pin" 0644
else
  put "$HERE/managed-settings.json" "Library/Application Support/ClaudeCode/managed-settings.json" 0644
fi

# --- Codex (both arms) ------------------------------------------------------
put "$CODEX/requirements.toml" "etc/codex/requirements.toml" 0644
put "$CODEX/fancysauce.sh" "etc/codex/hooks/fancysauce.sh" 0755

# --- credentials (both arms) ------------------------------------------------
put "$HERE/deploy-credentials.sh" "Library/Application Support/fancysauce/deploy-credentials.sh" 0755
put "$HERE/LaunchAgent.plist" "Library/LaunchAgents/ai.fancysauce.deploy-credentials.plist" 0644
# The token is the only value substituted into the payload. The per-login
# placeholders stay for deploy-credentials.sh.
/bin/mkdir -p "$ROOT/Library/Application Support/fancysauce"
/usr/bin/sed "s|fs_ingest_REPLACE_ME|$KEY|" "$HERE/credentials.json.tmpl" \
  > "$ROOT/Library/Application Support/fancysauce/credentials.json.tmpl"
/bin/chmod 0644 "$ROOT/Library/Application Support/fancysauce/credentials.json.tmpl"

# --- postinstall ------------------------------------------------------------
/bin/mkdir -p "$SCRIPTS"
/usr/bin/sed "s|^CC_MODE=\"managed-hooks\"|CC_MODE=\"$CC_MODE\"|" "$HERE/postinstall.sh" > "$SCRIPTS/postinstall"
/bin/chmod 0755 "$SCRIPTS/postinstall"

echo "build-pkg: staged $CC_MODE arm (pin $TAG $SHA) in $STAGE"
# --stage stops here so the tree can be inspected without pkgbuild.
[ -z "$STAGE_GIVEN" ] || exit 0

command -v pkgbuild >/dev/null 2>&1 || { echo "build-pkg: pkgbuild not found (macOS only); use --stage to inspect the payload" >&2; exit 2; }
# recommended ownership: root:wheel for system paths, whatever the staging user is
# does not leak into the package.
pkgbuild --root "$ROOT" --scripts "$SCRIPTS" \
  --identifier ai.fancysauce.mdm --version "${TAG#v}" \
  --ownership recommended "$OUT"
/bin/rm -rf "$STAGE"
echo "build-pkg: wrote $OUT"
