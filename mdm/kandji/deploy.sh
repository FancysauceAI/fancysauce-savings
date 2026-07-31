#!/bin/bash
# fancysauce-savings — Kandji Custom Script
#
# Deploys everything fancysauce telemetry needs for BOTH Claude Code and
# OpenAI Codex on a managed Mac:
#   1. System-wide managed-settings.json (registers the marketplace and enables
#      the plugin for every Claude Code user on the Mac). No secrets.
#   2. System-wide Codex managed hooks — /etc/codex/requirements.toml plus the
#      fancysauce.sh wrapper it invokes. Enforced hooks are auto-trusted, so
#      Codex telemetry runs zero-step with no user prompt.
#   3. Per-user ~/.config/fancysauce/credentials.json carrying the tenant key
#      and the assigned user's email (read by both tools).
#
# Kandji Custom Scripts run as root and substitute global variables ($EMAIL,
# $FULL_NAME, ...) into this script body at render time. Use BASH (not zsh)
# when referencing them — that is a documented Kandji requirement.
#
# Recommended execution frequency: "Run on every check-in" (or every 15 min)
# so a login that happens after the first deploy still gets credentials.

set -eo pipefail

# --- configuration (edit before uploading to Kandji) ----------------------
TENANT_KEY="fs_live_t_REPLACE_ME"   # from your fancysauce dashboard
IDENTITY_TYPE="full"
CODEX_TAG="v0.12.0"                 # pinned plugin release for Codex telemetry
CODEX_SHA="b3e046e7f4511b935e075c6a1c3cc9e72678e3c6"   # commit sha of CODEX_TAG

# Kandji substitutes the assigned user's email here at render time. Leave bare —
# do NOT wrap in ${...}, or substitution of an address containing @ breaks bash.
USER_EMAIL="$EMAIL"
USER_UPN="$EMAIL"

# Test-harness prefix applied to every write destination. Empty in production.
PREFIX="${FANCYSAUCE_TEST_PREFIX:-}"

# --- 1. system-wide managed-settings.json (Claude Code) -------------------
CC_DIR="$PREFIX/Library/Application Support/ClaudeCode"
/bin/mkdir -p "$CC_DIR"
/usr/bin/tee "$CC_DIR/managed-settings.json" >/dev/null <<'EOF'
{
  "extraKnownMarketplaces": {
    "fancysauce": {
      "source": { "source": "github", "repo": "FancysauceAI/fancysauce-savings" }
    }
  },
  "enabledPlugins": { "fancysauce-savings@fancysauce": true }
}
EOF
/bin/chmod 0644 "$CC_DIR/managed-settings.json"

# --- 2. system-wide Codex managed hooks -----------------------------------
# The embedded wrapper must stay byte-identical to
# release/templates/mdm/codex/fancysauce.sh (kandji-mdm-template.test.mjs
# enforces this).
CODEX_DIR="$PREFIX/etc/codex"
CODEX_HOOKS_DIR="$CODEX_DIR/hooks"
/bin/mkdir -p "$CODEX_HOOKS_DIR"

/usr/bin/tee "$CODEX_HOOKS_DIR/fancysauce.sh" >/dev/null <<'FANCYSAUCE_WRAPPER_EOF'
#!/bin/sh
# fancysauce.sh — Codex managed-hook telemetry wrapper. Fail-open: always exit 0.
# Invoked by an enforced requirements.toml hook, once per lifecycle event:
#   fancysauce.sh <Event> --ref <tag> --sha <sha>   # pinned (recommended)
#   fancysauce.sh <Event> --ref latest              # floating
# Codex pipes the hook-event JSON on stdin.
set -u

# The cache and data roots live under the invoking user's HOME. Without one there is
# no user-owned place to hold executable code, and a world-writable fallback would let
# any local user pre-seed the code this wrapper runs. Do nothing instead.
[ -n "${HOME:-}" ] || exit 0

EVENT="${1:-}"; [ "$#" -gt 0 ] && shift
REF=""; SHA=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --ref) REF="${2:-}"; [ "$#" -ge 2 ] && shift 2 || shift ;;
    --sha) SHA="${2:-}"; [ "$#" -ge 2 ] && shift 2 || shift ;;
    *) shift ;;
  esac
done

REPO="https://github.com/FancysauceAI/fancysauce-savings.git"
CACHE="$HOME/.cache/fancysauce/codex"
DATA="$HOME/.local/share/fancysauce/codex/data"
# Redirecting the code source, the executed-code cache, or the telemetry sink would
# defeat the managed deployment, so those three are reachable only from the harness.
if [ "${FANCYSAUCE_CODEX_TEST:-}" = "1" ]; then
  REPO="${FANCYSAUCE_CODEX_REPO:-$REPO}"
  CACHE="${FANCYSAUCE_CODEX_CACHE:-$CACHE}"
  DATA="${FANCYSAUCE_CODEX_DATA:-$DATA}"
fi
CURRENT="$CACHE/current"
# The last commit SessionStart successfully resolved. Floating carries no --sha,
# so this is what bounds the fallback path to a known-good release rather than
# whatever happens to be cached. A file, not a dir, so prune() never sweeps it.
RESOLVED="$CACHE/resolved-sha"
COLLECT_REL="plugins/fancysauce-savings/dist/agents/codex/collect.mjs"
TIMEOUT="${FANCYSAUCE_CODEX_TIMEOUT:-20}"   # per-call bound
BUDGET="${FANCYSAUCE_CODEX_BUDGET:-45}"     # bound on all of SessionStart's network work
DEADLINE=0                                  # epoch seconds; 0 = no overall bound active
KEEP=3
# Both bounds land in arithmetic, where a non-numeric value would abort the shell and
# break fail-open. A malformed bound is not worth a broken session — use the default.
case "$TIMEOUT" in '' | *[!0-9]*) TIMEOUT=20 ;; esac
case "$BUDGET" in '' | *[!0-9]*) BUDGET=45 ;; esac

now_s() { # epoch seconds, or 0 when date can't say — the overall bound then goes unused
  _s="$(date +%s 2>/dev/null)"
  case "$_s" in '' | *[!0-9]*) _s=0 ;; esac
  printf '%s' "$_s"
}

# Bound one call by TIMEOUT, and by whatever is left of DEADLINE while one is active,
# so chained network calls share a single budget instead of stacking their own.
bounded() {
  _t="$TIMEOUT"
  if [ "$DEADLINE" -gt 0 ]; then
    _rem=$(( DEADLINE - $(now_s) ))
    [ "$_rem" -gt 0 ] || return 124
    [ "$_rem" -lt "$_t" ] && _t="$_rem"
  fi
  perl -e 'my $t=shift; alarm $t; exec @ARGV or exit 127' "$_t" "$@"
}

# Capture the hook payload immediately, bounded so a stuck pipe can't hang the session.
PAYLOAD="$(bounded cat 2>/dev/null || true)"

run_collect() {
  _root="$1"
  [ -n "$_root" ] && [ -f "$_root/$COLLECT_REL" ] || return 0
  mkdir -p "$DATA" 2>/dev/null || true
  printf '%s' "$PAYLOAD" | CLAUDE_PLUGIN_ROOT="$_root" CLAUDE_PLUGIN_DATA="$DATA" \
    bounded node "$_root/$COLLECT_REL" >/dev/null 2>&1 || true
}

checkout_is() { # <dir> <sha> -> true when dir is a checkout sitting exactly on <sha>
  [ "$(git -C "$1" rev-parse HEAD 2>/dev/null)" = "$2" ]
}

resolve_latest() { # -> "<tag> <sha>" of the highest strict-semver tag, in one round trip
  bounded git ls-remote --tags "$REPO" 'v*' 2>/dev/null \
    | sed 's#refs/tags/##' \
    | awk '$2 ~ /^v[0-9]+\.[0-9]+\.[0-9]+(\^[{][}])?$/ {
             t = $2; sub(/\^[{][}]$/, "", t)
             if (!(t in sha) || t != $2) sha[t] = $1   # peeled ^{} wins for annotated tags
           }
           END { for (t in sha) print t, sha[t] }' \
    | sort -V | tail -1
}

tag_commit() { # <tag> -> commit sha (annotated: peeled ^{} wins), or empty
  bounded git ls-remote "$REPO" "refs/tags/$1" "refs/tags/$1^{}" 2>/dev/null | awk 'END{print $1}'
}

fetch_ref() { # <tag> <dest>
  _tag="$1"; _dest="$2"; _tmp="$CACHE/.tmp-$$"
  rm -rf "$_tmp" 2>/dev/null; mkdir -p "$_tmp" 2>/dev/null || return 1
  if bounded git -C "$_tmp" init -q 2>/dev/null \
     && bounded git -C "$_tmp" fetch -q --depth 1 "$REPO" "refs/tags/$_tag" 2>/dev/null \
     && bounded git -C "$_tmp" checkout -q FETCH_HEAD 2>/dev/null; then
    rm -rf "$_dest" 2>/dev/null
    mv "$_tmp" "$_dest" 2>/dev/null && return 0
  fi
  rm -rf "$_tmp" 2>/dev/null; return 1
}

prune() {
  ( cd "$CACHE" 2>/dev/null || exit 0
    ls -dt */ 2>/dev/null | tail -n +"$((KEEP + 1))" | while IFS= read -r d; do
      case "$d" in .tmp-*/ | current/) continue ;; esac
      rm -rf "$d" 2>/dev/null
    done )
}

session_start() {
  mkdir -p "$CACHE" 2>/dev/null || return 1
  _tag="$REF"; _sha="$SHA"
  if [ "$REF" = "latest" ] || [ -z "$REF" ]; then
    _pair="$(resolve_latest)"
    _tag="${_pair%% *}"
    [ -n "$_sha" ] || _sha="${_pair##* }"
  fi
  [ -n "$_tag" ] || return 1
  [ -n "$_sha" ] || _sha="$(tag_commit "$_tag")"
  [ -n "$_sha" ] || return 1
  _dest="$CACHE/$_sha"
  # A cache hit only counts when it is still the commit we resolved — a directory
  # planted or left behind under that name must be replaced, not trusted.
  if [ ! -f "$_dest/$COLLECT_REL" ] || ! checkout_is "$_dest" "$_sha"; then
    rm -rf "$_dest" 2>/dev/null
    fetch_ref "$_tag" "$_dest" || return 1
    checkout_is "$_dest" "$_sha" || { rm -rf "$_dest" 2>/dev/null; return 1; }
  fi
  rm -f "$CURRENT" 2>/dev/null; ln -s "$_dest" "$CURRENT" 2>/dev/null
  # Record only after the checkout is verified above, so a failed resolve leaves
  # the previous known-good sha in place rather than widening what may run.
  printf '%s\n' "$_sha" > "$RESOLVED" 2>/dev/null || true
  prune
  return 0
}

# One deadline for the whole of SessionStart's resolve-and-fetch chain.
if [ "$EVENT" = "SessionStart" ]; then
  _now="$(now_s)"
  [ "$_now" -gt 0 ] && DEADLINE=$(( _now + BUDGET ))
  session_start || true
  DEADLINE=0
fi

usable() { # <dir> -> runnable, and still on the commit we expect
  # Expected commit is the pinned sha when one was given, else the last sha a
  # SessionStart resolved. Without that second arm floating mode degrades to
  # "collect.mjs exists", and a resolve failure — any network denial — drops us
  # onto the newest cache dir by mtime, silently running an older release in
  # place of the resolved one. Only a machine that has never completed a resolve
  # has neither, and it has nothing cached to fall back to either.
  [ -f "$1/$COLLECT_REL" ] || return 1
  _want="$SHA"
  [ -n "$_want" ] || _want="$(cat "$RESOLVED" 2>/dev/null)"
  [ -z "$_want" ] || checkout_is "$1" "$_want"
}

# Resolve the code root: prefer the current pointer, else newest usable cache dir.
ROOT=""
[ -e "$CURRENT" ] && ROOT="$(cd "$CURRENT" 2>/dev/null && pwd -P)"
if [ -z "$ROOT" ] || ! usable "$ROOT"; then
  ROOT=""
  for d in $(ls -dt "$CACHE"/*/ 2>/dev/null); do
    case "$d" in "$CACHE"/.tmp-*/ | "$CURRENT"/) continue ;; esac
    usable "${d%/}" && { ROOT="${d%/}"; break; }
  done
fi
[ -n "$ROOT" ] && run_collect "$ROOT"

exit 0
FANCYSAUCE_WRAPPER_EOF
/bin/chmod 0755 "$CODEX_HOOKS_DIR/fancysauce.sh"

# requirements.toml is generated so CODEX_TAG/CODEX_SHA live once, above.
# Paths inside it are real device paths — never the test prefix.
CODEX_EVENTS="SessionStart UserPromptSubmit PreToolUse PermissionRequest PostToolUse PreCompact PostCompact SubagentStart SubagentStop Stop"
{
  /usr/bin/printf '# fancysauce-savings — Codex managed hooks. Generated by the Kandji deploy script.\n'
  /usr/bin/printf '# Enforced hooks are auto-trusted: they run zero-step with no user prompt.\n\n'
  # No `managed_dir`: it is optional, grants nothing (the requirements layer is what
  # auto-trusts these hooks) and, being a scalar, would fail to compose against any
  # other tool writing its own requirements layer — taking Codex down at startup.
  /usr/bin/printf '[features]\nhooks = true\n\n[hooks]\n'
  for _event in $CODEX_EVENTS; do
    /usr/bin/printf '\n[[hooks.%s]]\nmatcher = ""\n[[hooks.%s.hooks]]\ntype = "command"\ncommand = "/etc/codex/hooks/fancysauce.sh %s --ref %s --sha %s"\n' \
      "$_event" "$_event" "$_event" "$CODEX_TAG" "$CODEX_SHA"
  done
} | /usr/bin/tee "$CODEX_DIR/requirements.toml" >/dev/null
/bin/chmod 0644 "$CODEX_DIR/requirements.toml"

# --- 3. per-user credentials.json -----------------------------------------
# Custom Scripts run as root; resolve the logged-in console user so the file
# lands in their home and is owned by them (the plugin reads it as that user,
# and rejects any credential file readable by group/other).
consoleUser="$(/usr/bin/stat -f%Su /dev/console)"
if [ -z "$consoleUser" ] || [ "$consoleUser" = "root" ] || [ "$consoleUser" = "loginwindow" ]; then
  echo "No console user logged in; managed-settings + codex hooks written, credentials deferred to next check-in."
  exit 0
fi

userHome="$(/usr/bin/dscl . -read "/Users/$consoleUser" NFSHomeDirectory 2>/dev/null | /usr/bin/awk '{print $2}')" || true
[ -n "$userHome" ] || userHome="/Users/$consoleUser"

destDir="$PREFIX$userHome/.config/fancysauce"
destFile="$destDir/credentials.json"
issuedAt="$(/bin/date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

if [ -z "$USER_EMAIL" ]; then
  echo "WARN: \$EMAIL is empty — no assigned-user email in Kandji for this device. Writing credential without an email hint." >&2
fi

/bin/mkdir -p "$destDir"
/usr/bin/tee "$destFile" >/dev/null <<EOF
{
  "schema_version": 1,
  "issued_at": "$issuedAt",
  "credential": "$TENANT_KEY",
  "identity_hint": {
    "source": "mdm_file",
    "user_email": "$USER_EMAIL",
    "user_upn": "$USER_UPN"
  },
  "identity_type": "$IDENTITY_TYPE"
}
EOF

# In production this runs as root; the unprivileged test run skips chown
# (files are already owned by the test user).
if [ "$(/usr/bin/id -u)" = "0" ]; then
  /usr/sbin/chown "$consoleUser" "$destDir" "$destFile"
fi
/bin/chmod 0700 "$destDir"
/bin/chmod 0600 "$destFile"

echo "fancysauce: managed-settings + codex hooks + credentials written for $consoleUser (issued_at: $issuedAt, email: ${USER_EMAIL:-<none>})"
exit 0
