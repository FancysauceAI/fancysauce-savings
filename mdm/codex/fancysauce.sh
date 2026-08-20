#!/bin/sh
# fancysauce.sh — managed-hook telemetry wrapper for Codex and Claude Code.
# Fail-open: always exit 0.
#   fancysauce.sh <Event> --ref <tag> --sha <sha>   # codex, pinned (default tool)
#   fancysauce.sh <Event> --ref latest              # codex, floating
#   fancysauce.sh <Event> --tool claude-code        # pin read from /etc/fancysauce/claude-code.pin
# Both tools pipe the hook-event JSON on stdin. The event name the collector
# acts on comes from that payload; the argv event only triggers the fetch.
#
# The file serves both tools but still sits under codex/, because
# release/templates/mdm/ is published verbatim as the dist repo's mdm/ and
# mdm/codex/fancysauce.sh is the path the Jamf and Intune guides tell admins to
# download. Moving it to a tool-neutral directory changes a published download
# path, so it moves with those guides, in FAN-645.
set -u

# The cache and data roots live under the invoking user's HOME. Without one there is
# no user-owned place to hold executable code, and a world-writable fallback would let
# any local user pre-seed the code this wrapper runs. Do nothing instead.
[ -n "${HOME:-}" ] || exit 0

EVENT="${1:-}"; [ "$#" -gt 0 ] && shift
# Absent --tool is codex: the deployed requirements.toml fleet passes no such flag.
REF=""; SHA=""; TOOL="codex"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --ref) REF="${2:-}"; [ "$#" -ge 2 ] && shift 2 || shift ;;
    --sha) SHA="${2:-}"; [ "$#" -ge 2 ] && shift 2 || shift ;;
    --tool) TOOL="${2:-}"; [ "$#" -ge 2 ] && shift 2 || shift ;;
    *) shift ;;
  esac
done

REPO="https://github.com/FancysauceAI/fancysauce-savings.git"
PIN_FILE=""
case "$TOOL" in
  codex)
    CACHE="$HOME/.cache/fancysauce/codex"
    DATA="$HOME/.local/share/fancysauce/codex/data"
    COLLECT_REL="plugins/fancysauce-savings/dist/agents/codex/collect.mjs"
    ;;
  claude-code)
    CACHE="$HOME/.cache/fancysauce/claude-code"
    DATA="$HOME/.local/share/fancysauce/claude-code/data"
    COLLECT_REL="claude-code/dist/agents/claude-code/collect.mjs"
    PIN_FILE="/etc/fancysauce/claude-code.pin"
    ;;
  # An unknown tool means this wrapper is older than the hook command that called
  # it. Running the wrong collector on the wrong payload throws inside the event
  # mapper, and fail-open swallows the throw: the machine reports healthy and
  # emits nothing. Do nothing instead, as the missing-HOME guard above does.
  *) exit 0 ;;
esac
# Redirecting the code source, the executed-code cache, the telemetry sink, or the
# pin that decides which release runs would defeat the managed deployment, so those
# four are reachable only from the harness. The gate is wrapper-wide, not
# Codex-only; the three FANCYSAUCE_CODEX_* names predate the second tool and are
# kept so the deployed Codex contract does not move. The pin override is new, so
# it takes a tool-neutral name.
if [ "${FANCYSAUCE_CODEX_TEST:-}" = "1" ]; then
  REPO="${FANCYSAUCE_CODEX_REPO:-$REPO}"
  CACHE="${FANCYSAUCE_CODEX_CACHE:-$CACHE}"
  DATA="${FANCYSAUCE_CODEX_DATA:-$DATA}"
  [ -n "$PIN_FILE" ] && PIN_FILE="${FANCYSAUCE_MDM_PIN:-$PIN_FILE}"
fi
CURRENT="$CACHE/current"
# The last commit SessionStart successfully resolved. Floating carries no --sha,
# so this is what bounds the fallback path to a known-good release rather than
# whatever happens to be cached. A file, not a dir, so prune() never sweeps it.
RESOLVED="$CACHE/resolved-sha"
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

# The collector runs a one-shot scan of the machine's whole Claude Code history
# on a data dir that has no state/scan-once.json, and this arm gives every
# machine a fresh data dir. A fleet cutover would therefore re-send history
# that the plugin install this arm replaces already reported, all at once
# (FAN-656). Seed the marker when a prior plugin install left an install.json,
# so that machine starts from now; a machine with no prior install keeps the
# scan and uploads its history. Presence alone gates the scan, so the marker's
# fields only say where it came from.
seed_scan_once() {
  [ "$TOOL" = "claude-code" ] || return 0
  [ -e "$DATA/state/scan-once.json" ] && return 0
  _prior=0
  for _d in "$HOME"/.claude/plugins/data/fancysauce-savings*/ "$HOME"/.claude-plugin-data/; do
    [ -f "${_d}install.json" ] && { _prior=1; break; }
  done
  [ "$_prior" = "1" ] || return 0
  mkdir -p "$DATA/state" 2>/dev/null || return 0
  printf '{"spawned_at":"%s","plugin_version":"seeded-by-mdm-wrapper"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)" > "$DATA/state/scan-once.json" 2>/dev/null || true
}

run_collect() {
  # collect.mjs guards main() with `import.meta.url === file://${process.argv[1]}`,
  # and node resolves the entry module to its realpath. A path that traverses a
  # symlink makes the two disagree: main() never runs, and the hook exits 0 having
  # written nothing at all. Resolve here so every caller has that property — the
  # `current` pointer already did, the newest-cache fallback below did not.
  _root="$(cd "$1" 2>/dev/null && pwd -P)"
  [ -n "$_root" ] && [ -f "$_root/$COLLECT_REL" ] || return 0
  mkdir -p "$DATA" 2>/dev/null || true
  seed_scan_once
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

sweep_tmp() { # drop the temp checkouts a killed fetch left behind
  # fetch_ref removes its own .tmp-<pid>, but the hook runs under a timeout of its
  # own (Claude Code cancels a hook at 60s), and a fetch killed there never reaches
  # that rm. prune() skips .tmp-* by name, so nothing else collects them. The name
  # is keyed to a pid that is gone, so no later run can want one back.
  find "$CACHE" -maxdepth 1 -type d -name '.tmp-*' -mmin +60 -exec rm -rf {} + 2>/dev/null || true
}

prune() {
  ( cd "$CACHE" 2>/dev/null || exit 0
    ls -dt */ 2>/dev/null | tail -n +"$((KEEP + 1))" | while IFS= read -r d; do
      case "$d" in .tmp-*/ | current/) continue ;; esac
      rm -rf "$d" 2>/dev/null
    done )
}

read_pin() { # fills REF/SHA from PIN_FILE; leaves them unchanged unless the pin is well-formed
  [ -n "$PIN_FILE" ] && [ -r "$PIN_FILE" ] || return 0
  # A torn or hand-edited pin is not a pin. Passing garbage through as a sha makes
  # usable() reject every cache dir, which stops collection silently — strictly
  # worse than having no pin at all.
  _tag=""; _pin_sha=""; _pin_rest=""
  read -r _tag _pin_sha _pin_rest < "$PIN_FILE" 2>/dev/null || true
  # A CRLF pin — hand-edited on the wrong machine — puts a CR on the last field,
  # where it fails the sha check below and turns a correct pin into an absent one.
  # The rollback path in kandji/README.md is exactly that hand edit, so strip it.
  _cr="$(printf '\r')"
  _tag="${_tag%$_cr}"; _pin_sha="${_pin_sha%$_cr}"; _pin_rest="${_pin_rest%$_cr}"
  # Exactly two fields. A third would let a well-formed sha in the wrong column
  # be accepted as the pin.
  [ -z "$_pin_rest" ] || return 0
  # LC_ALL=C so the character classes are bytes: a range under another locale can
  # admit a wider set, and this value decides which code runs.
  printf '%s' "$_tag" | LC_ALL=C grep -qE '^v[0-9]+\.[0-9]+\.[0-9]+$' 2>/dev/null || return 0
  printf '%s' "$_pin_sha" | LC_ALL=C grep -qE '^[0-9a-f]{40}$' 2>/dev/null || return 0
  REF="$_tag"; SHA="$_pin_sha"
}

session_start() {
  mkdir -p "$CACHE" 2>/dev/null || return 1
  # Before the network work, not after: this is the run that may itself be killed.
  sweep_tmp
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

read_pin

# Claude Code has no floating mode: without a valid pin there is nothing to
# resolve, and resolve_latest() would turn a missing pin into a network fetch.
FETCH_ON_START=1
if [ "$TOOL" = "claude-code" ] && { [ -z "$REF" ] || [ -z "$SHA" ]; }; then
  FETCH_ON_START=0
fi

# One deadline for the whole of SessionStart's resolve-and-fetch chain.
if [ "$EVENT" = "SessionStart" ] && [ "$FETCH_ON_START" = "1" ]; then
  _now="$(now_s)"
  [ "$_now" -gt 0 ] && DEADLINE=$(( _now + BUDGET ))
  session_start || true
  DEADLINE=0
fi

# The commit every cache dir is measured against. Claude Code re-reads its pin on
# every event, so a fleet-wide bump lands in the middle of a running session. Only
# SessionStart fetches, so that session has no checkout at the new sha, and
# demanding it would silence the rest of the session — the SessionEnd flush
# included. Fall back to the last verified release instead: that is the same
# degradation a malformed pin already takes, and strictly better than a silent
# gap. Codex takes its sha from argv, which cannot move mid-session.
EXPECT_SHA="$SHA"
if [ "$TOOL" = "claude-code" ] && [ -n "$EXPECT_SHA" ] && [ ! -d "$CACHE/$EXPECT_SHA" ]; then
  EXPECT_SHA=""
fi

usable() { # <dir> -> runnable, and still on the commit we expect
  # Without the RESOLVED arm floating mode degrades to "collect.mjs exists", and a
  # resolve failure — any network denial — drops us onto the newest cache dir by
  # mtime, silently running an older release in place of the resolved one.
  [ -f "$1/$COLLECT_REL" ] || return 1
  _want="$EXPECT_SHA"
  [ -n "$_want" ] || _want="$(cat "$RESOLVED" 2>/dev/null)"
  # Neither one means nothing has ever been verified in this cache. Claude Code has
  # no floating mode, so that state is an unpinned machine whose cache may still be
  # populated: running it gives up the verification this arm exists to add. Codex
  # floating mode reaches the same state legitimately on a first run.
  if [ -z "$_want" ]; then
    [ "$TOOL" = "claude-code" ] && return 1
    return 0
  fi
  checkout_is "$1" "$_want"
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
