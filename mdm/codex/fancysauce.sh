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

usable() { # <dir> -> runnable, and when pinned still sitting on the pinned commit
  [ -f "$1/$COLLECT_REL" ] && { [ -z "$SHA" ] || checkout_is "$1" "$SHA"; }
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
