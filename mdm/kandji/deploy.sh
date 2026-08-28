#!/bin/bash
# fancysauce-savings — Kandji Custom Script
#
# Deploys everything fancysauce telemetry needs for BOTH Claude Code and
# OpenAI Codex on a managed Mac:
# CC_MODE picks the Claude Code arm: section 1 runs on "plugin", section 2b on
# "managed-hooks". The section numbers below are the markers in the file.
#   1. System-wide managed-settings.json for Claude Code, "plugin" mode only:
#      it registers the marketplace and enables the plugin. No secrets.
#   2. System-wide Codex managed hooks — /etc/codex/requirements.toml plus the
#      fancysauce.sh wrapper it invokes. Enforced hooks are auto-trusted, so
#      Codex telemetry runs zero-step with no user prompt.
#   2b. Claude Code managed hooks, "managed-hooks" mode only (the default). It
#      writes /etc/fancysauce/hooks/fancysauce.sh (the same wrapper, invoked
#      with --tool claude-code), /etc/fancysauce/claude-code.pin (the release
#      that wrapper runs), and then a policy fragment carrying a hooks block and
#      no plugin, dropped into managed-settings.d/ beside managed-settings.json.
#      This mode never creates or edits managed-settings.json, so a tenant's own
#      managed settings are left alone. The fragment lands LAST: it is what makes
#      Claude Code call the wrapper, so the wrapper and the pin must be there
#      first. No secrets.
#   3. Per-user ~/.config/fancysauce/credentials.json carrying the tenant key
#      and the assigned user's email (read by both tools).
#
# Kandji Custom Scripts run as root and substitute its global variables (the
# assigned user's email, full name, ...) into this script body at render time.
# Use BASH (not zsh) when referencing them — a documented Kandji requirement.
#
# Substitution is TEXTUAL and happens everywhere the token appears, before any
# shell parses the file. The assigned-user email is therefore attacker-influenced
# input arriving as source code. It is captured in exactly ONE place — the last
# line of this file, past the final `exit 0`, where bash never parses — and read
# back from disk as data. Do not reintroduce the token anywhere else, in a
# message or a comment: a second occurrence in any parsed context is command
# execution as root.
#
# Recommended execution frequency: "Run on every check-in" (or every 15 min)
# so a login that happens after the first deploy still gets credentials.

set -eo pipefail

# --- configuration (edit before uploading to Kandji) ----------------------
TENANT_KEY="fs_live_t_REPLACE_ME"   # from your fancysauce dashboard
IDENTITY_TYPE="full"
CODEX_TAG="v0.16.1"                 # pinned plugin release for Codex telemetry
CODEX_SHA="8b80f00c8292dabd0ee1816c9e20185877acef7c"   # commit sha of CODEX_TAG
CC_MODE="managed-hooks"             # plugin | managed-hooks
CC_TAG="v0.16.1"                    # pinned plugin release for Claude Code telemetry
CC_SHA="8b80f00c8292dabd0ee1816c9e20185877acef7c"   # commit sha of CC_TAG
# SessionEnd hooks share a 1.5s budget, which the collector's own 1800ms
# self-budget already overruns. Claude Code raises the shared budget to the
# longest per-hook timeout, so this one field is what keeps the end-of-session
# flush from being cancelled. Below 2 seconds the shared budget stays under that
# flush and cancels it anyway; 60 seconds is Claude Code's ceiling.
CC_SESSION_END_TIMEOUT="5"          # seconds, 2-60

# A typo must fail at check-in rather than half-configure a Mac.
case "$CC_MODE" in
  plugin|managed-hooks) ;;
  *) echo "fancysauce: CC_MODE must be 'plugin' or 'managed-hooks' (got: $CC_MODE)" >&2; exit 1 ;;
esac
# The timeout is emitted as a bare JSON number, so a non-numeric value would
# produce a managed-settings.json Claude Code cannot parse. The accepted range is
# stated on CC_SESSION_END_TIMEOUT above.
case "$CC_SESSION_END_TIMEOUT" in
  '' | *[!0-9]*) echo "fancysauce: CC_SESSION_END_TIMEOUT must be a whole number of seconds" >&2; exit 1 ;;
esac
# Length first: `[ -lt ]` cannot compare a value wider than an int64, and the
# error it returns reads as false to an `if`, so a long digit string would pass
# the range test below. Two digits is all the range needs.
if [ "${#CC_SESSION_END_TIMEOUT}" -gt 2 ] \
   || [ "$CC_SESSION_END_TIMEOUT" -lt 2 ] || [ "$CC_SESSION_END_TIMEOUT" -gt 60 ]; then
  echo "fancysauce: CC_SESSION_END_TIMEOUT must be 2-60 seconds (got: $CC_SESSION_END_TIMEOUT)" >&2
  exit 1
fi

# Kandji substitutes the assigned-user email into this file as TEXT, so the value
# is source code by the time any shell sees it. No quoting survives that: double
# quotes fall to a quote, single quotes likewise, and a heredoc falls to a line
# equal to its own delimiter — the value chooses where the capture ends.
#
# So the token lives past the final `exit 0`, where bash never parses, and is
# read back out of the file as data. Anything injected after it is inert text in
# a region that is never executed. Keep the token there; moving it above the exit
# reintroduces root command execution on every managed Mac.
# BASH_SOURCE survives `bash < file` and `source`, where $0 is the interpreter.
# Failure here must not abort the deploy: without 2>/dev/null and the || true,
# an unreadable $0 takes down managed-settings and the Codex hooks too, turning
# a missing email hint into a whole-fleet no-op.
FS_SELF="${BASH_SOURCE[0]:-$0}"

FS_HINT_REASON=""

# The trailing space is not required: an editor that strips trailing whitespace
# turns an empty substitution into a bare marker, which must still read as "no
# assigned user" rather than as a deleted line.
if [ -r "$FS_SELF" ] && /usr/bin/grep -qE '^#FS_EMAIL( |$)' "$FS_SELF" 2>/dev/null; then
  USER_EMAIL="$(/usr/bin/sed -n 's/^#FS_EMAIL//p' "$FS_SELF" 2>/dev/null | /usr/bin/head -1 || true)"

  # Kandji pads the address, and its editor can leave a CR on this line. The
  # byte-exact check below would drop a correct address over an invisible byte.
  # Edges only — deleting interior whitespace would splice two fields into one
  # string that passes the check and attributes the wrong person.
  USER_EMAIL="$(printf '%s' "$USER_EMAIL" | LC_ALL=C /usr/bin/sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' || true)"

  # Assembled from pieces so the token never appears as one string: Kandji
  # rewrites every occurrence it finds, and a second one is command execution
  # as root.
  FS_UNSUBSTITUTED='$'"EMAIL"

  if [ "$USER_EMAIL" = "$FS_UNSUBSTITUTED" ]; then
    FS_HINT_REASON="Kandji left the assigned-user variable unsubstituted, which means this device record has no assigned user. Assign one in Kandji (device -> User)."
  elif [ -z "$USER_EMAIL" ]; then
    # An empty value reaches the charset check as zero bytes, where grep has no
    # line to test and exits 1 — reporting a correct-but-absent address as an
    # unrepresentable one. Answer it here, before the check can misread it.
    FS_HINT_REASON="Kandji has no assigned-user email for this device. Confirm the device has an assigned user and that your directory integration populates their email."
  # Matched by grep in its own LC_ALL=C environment, so the class is bytes rather
  # than collation. A `case` here would inherit the agent's locale, under which an
  # accented address survives while the same address is dropped under C — the same
  # person attributed or not depending on the environment.
  elif ! printf '%s' "$USER_EMAIL" | LC_ALL=C /usr/bin/grep -qE '^[A-Za-z0-9@._+-]*$'; then
    FS_HINT_REASON="the assigned-user email contains characters that cannot be represented safely. Only A-Z a-z 0-9 @ . _ + - are accepted."
  fi
else
  # Distinct from an empty address: the marker line is the most likely thing an
  # operator deletes, since past `exit 0` it looks like trailing junk.
  FS_HINT_REASON="the #FS_EMAIL line is missing from this script (deleted, or moved above the final exit 0). Restore it as the last line."
fi

# The reason is built only from the literals above. Interpolating any part of
# the address into a message would put attacker-influenced text back into a
# parsed context, which is the whole thing the marker line exists to prevent.
if [ -n "$FS_HINT_REASON" ]; then
  echo "WARN: $FS_HINT_REASON Writing credential without an email hint." >&2
  USER_EMAIL=""
fi
USER_UPN="$USER_EMAIL"

# Test-harness prefix applied to every write destination. Empty in production.
PREFIX="${FANCYSAUCE_TEST_PREFIX:-}"

# Write one generated file whole, then rename it over the destination.
#
# Every file this script generates is rewritten on every check-in and read at any
# moment by a running session. A writer that truncates in place (tee, cp, a plain
# redirect) leaves a window where that read returns a partial file: a half-written
# managed-settings.json loads no hooks, a half-written pin reads as malformed and
# freezes the machine on its cached release, and a half-written wrapper execs as a
# broken script. A rename is atomic, so a reader gets the old file or the new one.
#
# The temp name sits in the destination's own directory, because mv is atomic only
# within one filesystem — a temp under /tmp or $TMPDIR degrades the rename to a
# copy-into-place and reopens the window. The $$ suffix keeps two overlapping
# check-ins off each other's temp file.
write_atomic() { # <dest> <mode>; content on stdin
  _wa_tmp="$1.$$.tmp"
  /bin/cat > "$_wa_tmp"
  /bin/chmod "$2" "$_wa_tmp"
  /bin/mv -f "$_wa_tmp" "$1"
}

# The console user is resolved once, here, because two sections need it: the
# plist preflight in 2b reads that user's Managed Preferences directory, and the
# credential write in 3 lands the file in their home. Section 3 owns the decision
# about an unusable value; nothing above it may assume this names a real login.
# Unguarded this would abort the whole deploy under set -e -- including the
# Codex arm, which does not need a console user at all. Section 3 already owns
# the decision about an empty or unusable value.
consoleUser="$(/usr/bin/stat -f%Su /dev/console 2>/dev/null || true)"

# --- 1. system-wide managed-settings.json (Claude Code, plugin mode) ------
# The mkdir stays outside the mode switch: managed-hooks writes into this same
# directory in section 2b.
CC_DIR="$PREFIX/Library/Application Support/ClaudeCode"
# Claude Code 2.1.83+ merges managed-settings.json first, then every *.json in
# managed-settings.d/ in alphabetical order on top. The managed-hooks arm owns
# this one fragment and never the base file, so managed settings a tenant keeps
# for their own policy survive every check-in. The 50- prefix leaves 10-49 for a
# tenant who wants policy applied before ours and 51+ to override ours.
# Named here, above the mode switch, because both arms act on it.
CC_DROPIN_DIR="$CC_DIR/managed-settings.d"
CC_FRAGMENT="$CC_DROPIN_DIR/50-fancysauce.json"
/bin/mkdir -p "$CC_DIR"
# Claude Code reads these files as the logged-in user. A hardened root umask
# (027, 077) makes mkdir -p produce a directory that user cannot traverse, and
# then no policy loads at all. Traversal only: this directory is not ours alone.
/bin/chmod a+x "$CC_DIR"
if [ "$CC_MODE" = "plugin" ]; then
  write_atomic "$CC_DIR/managed-settings.json" 0644 <<'EOF'
{
  "extraKnownMarketplaces": {
    "fancysauce": {
      "source": { "source": "github", "repo": "FancysauceAI/fancysauce-savings" }
    }
  },
  "enabledPlugins": { "fancysauce-savings@fancysauce": true }
}
EOF
  # A fragment left by an earlier managed-hooks deploy merges on top of the file
  # just written and forces enabledPlugins false, so the plugin this arm exists
  # to enable would never load. The name is exclusively ours, so no tenant policy
  # is at risk. Removed rather than left, because this arm is otherwise silent.
  # Both names: a Mac provisioned by the pre-rename build carries the old one,
  # and its enabledPlugins false would suppress the plugin just as surely.
  /bin/rm -f "$CC_FRAGMENT" "$CC_DROPIN_DIR/50-fancysauce-telemetry.json" || true
fi

# --- 2. system-wide Codex managed hooks -----------------------------------
# The embedded wrapper must stay byte-identical to
# release/templates/mdm/codex/fancysauce.sh (kandji-mdm-template.test.mjs
# enforces this).
CODEX_DIR="$PREFIX/etc/codex"
CODEX_HOOKS_DIR="$CODEX_DIR/hooks"
/bin/mkdir -p "$CODEX_HOOKS_DIR"

/usr/bin/tee "$CODEX_HOOKS_DIR/fancysauce.sh" >/dev/null <<'FANCYSAUCE_WRAPPER_EOF'
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
FANCYSAUCE_WRAPPER_EOF
/bin/chmod 0755 "$CODEX_HOOKS_DIR/fancysauce.sh"

# requirements.toml is generated so CODEX_TAG/CODEX_SHA live once, above.
# Paths inside it are real device paths — never the test prefix.
# Must equal src/agents/codex/hooks.json; codex-mdm-template.test.mjs derives the
# canonical requirements.toml from it, and kandji-mdm-template.test.mjs derives
# this list from that. A stanza added here alone fails the suite.
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

# --- 2b. Claude Code managed hooks ----------------------------------------
# The wrapper is embedded exactly once, in section 2; a second heredoc anywhere
# would break the vendor script that extracts that one region.
if [ "$CC_MODE" = "managed-hooks" ]; then
  # Preflight: a Claude Code configuration profile silently outranks everything
  # this section writes. macOS delivers one to
  # /Library/Managed Preferences/[<user>/]com.anthropic.claudecode.plist, whose
  # top-level keys ARE settings keys, and the managed tiers are FIRST-WINS rather
  # than merged: the first tier holding any settings supplies the whole policy
  # and every lower tier is dropped entire. (Only `env` and the allowManaged*Only
  # booleans union across tiers.) So a profile carrying one unrelated key —
  # cleanupPeriodDays, the sort of retention hygiene an IT team pushes — disables
  # all of these hooks while the files stay on disk and correct, and this run
  # still reports success. Measured on Claude Code 2.1.235.
  #
  # Nothing on the machine can override a profile, so this warns and continues:
  # the operator decides. Kandji surfaces script output, which makes this the
  # only signal the failure has at provisioning time. An empty or schema-invalid
  # plist falls through to the file tier, so presence alone is not proof of loss.
  cc_warn_plist() { # <path>; returns 0 so `set -e` never trips on the check
    [ -e "$1" ] || return 0
    echo "fancysauce: a Claude Code configuration profile is installed at $1." >&2
    echo "fancysauce:   Managed settings are first-wins, not merged, so that profile supplies the whole policy and the hooks below are ignored. The machine then collects nothing." >&2
    echo "fancysauce:   Fix: remove the profile, or move these hooks into it. Confirm which tier is active on the Mac with /status, under \"Setting sources\"." >&2
  }
  CC_MP_DIR="$PREFIX/Library/Managed Preferences"
  # The per-user file outranks the device-level one, but either alone is enough
  # to lose the hooks, so both are reported. The user path is only meaningful for
  # a real login: with no console user it would collapse onto the device path and
  # report the same file twice.
  case "$consoleUser" in
    '' | root | loginwindow) ;;
    *) cc_warn_plist "$CC_MP_DIR/$consoleUser/com.anthropic.claudecode.plist" ;;
  esac
  cc_warn_plist "$CC_MP_DIR/com.anthropic.claudecode.plist"

  CC_ETC_DIR="$PREFIX/etc/fancysauce"
  CC_HOOKS_DIR="$CC_ETC_DIR/hooks"
  # No spaces anywhere in this path: a hook command is word-split, so
  # "/Library/Application Support/..." would run `/Library/Application` with
  # `Support/...` as its first argument.
  CC_HOOK_CMD="/etc/fancysauce/hooks/fancysauce.sh"
  # The wrapper runs as the logged-in user and must traverse $CC_ETC_DIR to exec
  # the hook and to read the pin. A hardened root umask (027, 077) makes mkdir -p
  # produce a parent that user cannot traverse, and then every hook event is a
  # no-op and the machine reports nothing at all — silently, because this arm is
  # fail-open. A mode on the hooks dir alone cannot fix that.
  #
  # `a+x`, not `0755`: this directory is also the system credential root
  # (/etc/fancysauce/credentials.json), and an operator who tightened it to 0700
  # as defence in depth must not have it reopened to world-listable on every
  # check-in. Adding the execute bit grants traversal — enough to exec a known
  # path and read a known file — and grants no listing.
  /bin/mkdir -p "$CC_HOOKS_DIR"
  /bin/chmod a+x "$CC_ETC_DIR"
  /bin/chmod 0755 "$CC_HOOKS_DIR"

  # The copy is of section 2's one embedded wrapper, never a second heredoc.
  write_atomic "$CC_HOOKS_DIR/fancysauce.sh" 0755 < "$CODEX_HOOKS_DIR/fancysauce.sh"

  # The pin is read on EVERY hook event, so it is written whole and renamed.
  /usr/bin/printf '%s %s\n' "$CC_TAG" "$CC_SHA" \
    | write_atomic "$CC_ETC_DIR/claude-code.pin" 0644

  # The fragment sits one level deeper than managed-settings.json, so it needs
  # the same traversal a hardened root umask would otherwise deny. This directory
  # is ours alone and holds no secrets, so it takes a plain 0755.
  /bin/mkdir -p "$CC_DROPIN_DIR"
  /bin/chmod 0755 "$CC_DROPIN_DIR"

  # The fragment lands LAST: it is what makes Claude Code call the wrapper,
  # and the wrapper and its pin must already be in place when it does.
  # Paths inside the generated file are real device paths — never the test prefix.
  # Must equal src/agents/claude-code/hooks.json; kandji-mdm-template.test.mjs
  # derives the expected set from it. An event added here alone fails the suite.
  CC_EVENTS="SessionStart SessionEnd UserPromptSubmit PreToolUse PostToolUse PostToolUseFailure SubagentStart SubagentStop PreCompact PostCompact Stop ConfigChange Notification TaskCompleted PermissionRequest"
  {
    /usr/bin/printf '{\n  "hooks": {\n'
    _first=1
    for _event in $CC_EVENTS; do
      # A separate printf, because '%s' on a variable holding ",\n" writes a
      # literal backslash and n — invalid JSON.
      [ "$_first" = "1" ] || /usr/bin/printf ',\n'
      _first=0
      /usr/bin/printf '    "%s": [ { "matcher": "", "hooks": [ { "type": "command", "command": "%s %s --tool claude-code"' \
        "$_event" "$CC_HOOK_CMD" "$_event"
      # The field that raises the shared SessionEnd budget — see
      # CC_SESSION_END_TIMEOUT. An `if`, not a `&&` list: the list evaluates
      # false on the other 14 events, and as the last command of the loop body
      # that would abort the run under `set -e`.
      if [ "$_event" = "SessionEnd" ]; then
        /usr/bin/printf ', "timeout": %s' "$CC_SESSION_END_TIMEOUT"
      fi
      /usr/bin/printf ' } ] } ]'
    done
    /usr/bin/printf '\n  },\n'
    # The plugin and these hooks on one Mac collect the same session twice under
    # two install ids, which doubles every count and dollar figure.
    /usr/bin/printf '  "enabledPlugins": { "fancysauce-savings@fancysauce": false }\n}\n'
  } | write_atomic "$CC_FRAGMENT" 0644

  # A pre-release build of this arm named the fragment 50-fancysauce-telemetry.json.
  # Claude Code merges every *.json in the directory, so leaving it would merge
  # both and run every hook twice. Our own filename, so no tenant policy is at
  # risk in deleting it outright.
  /bin/rm -f "$CC_DROPIN_DIR/50-fancysauce-telemetry.json" || true

  # Migration off a pre-release build of this arm that wrote the hooks block into
  # managed-settings.json itself. Both files would carry it, and merged arrays
  # are concatenated, so every hook event would run twice.
  #
  # Deleting is gated on byte-identity with the fragment just written: that is
  # the only shape provable to hold nothing but our keys without a JSON parser,
  # which this script has no dependable way to run. The gate is deliberately
  # narrow rather than clever — it also misses a legacy file generated with a
  # different CC_SESSION_END_TIMEOUT or event set, and those fall to the notice
  # below. Reporting is the safe default; a blind delete would destroy policy a
  # tenant has since put in that file.
  #
  # The notice carries no WARN: prefix, which belongs to the credential hint
  # alone. `|| true` on both: neither is essential, and `set -e` would otherwise
  # let a cleanup failure cost this machine its credential write in section 3.
  CC_LEGACY_SETTINGS="$CC_DIR/managed-settings.json"
  if [ -f "$CC_LEGACY_SETTINGS" ]; then
    if /usr/bin/cmp -s "$CC_LEGACY_SETTINGS" "$CC_FRAGMENT"; then
      /bin/rm -f "$CC_LEGACY_SETTINGS" || true
    elif /usr/bin/grep -qF "$CC_HOOK_CMD" "$CC_LEGACY_SETTINGS" 2>/dev/null; then
      echo "fancysauce: $CC_LEGACY_SETTINGS carries fancysauce hooks alongside other content. Delete its \"hooks\" and \"enabledPlugins\" keys by hand, or every hook event runs twice." >&2 || true
    fi
  fi
fi

# --- 3. per-user credentials.json -----------------------------------------
# Custom Scripts run as root; resolve the logged-in console user so the file
# lands in their home and is owned by them (the plugin reads it as that user,
# and rejects any credential file readable by group/other).
if [ -z "$consoleUser" ] || [ "$consoleUser" = "root" ] || [ "$consoleUser" = "loginwindow" ]; then
  echo "No console user logged in; managed-settings + codex hooks written, credentials deferred to next check-in."
  exit 0
fi

userHome="$(/usr/bin/dscl . -read "/Users/$consoleUser" NFSHomeDirectory 2>/dev/null | /usr/bin/awk '{print $2}')" || true
[ -n "$userHome" ] || userHome="/Users/$consoleUser"

destDir="$PREFIX$userHome/.config/fancysauce"
issuedAt="$(/bin/date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

# $destDir sits inside a home directory the console user owns, so root must not
# open any part of it. A -L test cannot help: it resolves intermediate
# components, so a symlink at ~/.config is invisible to a check on the leaf, and
# whatever a check can see may be swapped before the write lands.
#
# Root therefore builds the content and hands it to the console user's own uid on
# stdin. That uid does the mkdir and the write, where a symlink reaches nothing
# the user could not already reach. The helper lives in a root-owned directory so
# the user may execute it but not rewrite it, and holds no secret — the key
# arrives on stdin and first touches disk under the helper's umask.
# Explicitly under /private/tmp, not mktemp's default: on macOS an unqualified
# mktemp -d lands in the caller's per-uid folder under /var/folders, which is
# 0700, so root's temp dir is unreadable to the console user and the su below
# would fail with EACCES — taking the whole run down with it. /private/tmp is
# world-traversable and sticky, mktemp's randomness prevents pre-creation, and
# the directory stays root-owned so the user can execute the helper but not
# alter it.
credentialWriter="$(/usr/bin/mktemp -d /private/tmp/fancysauce-writer.XXXXXXXX)"
/bin/chmod 0755 "$credentialWriter"
# Cleanup must not depend on reaching the end: set -e aborts on any failure
# between here and the write, and a leaked root-owned directory every check-in adds up.
trap '/bin/rm -rf "$credentialWriter"' EXIT
/usr/bin/tee "$credentialWriter/write-credential.sh" >/dev/null <<'FS_WRITER_EOF'
#!/bin/sh
# Runs as the console user. Every path here is one they already own.
set -e
umask 077
/bin/mkdir -p "$FS_DEST_DIR"
/bin/chmod 0700 "$FS_DEST_DIR"
tmp="$FS_DEST_DIR/credentials.json.$$.tmp"
/bin/cat > "$tmp"
/bin/chmod 0600 "$tmp"
/bin/mv -f "$tmp" "$FS_DEST_DIR/credentials.json"
FS_WRITER_EOF
/bin/chmod 0755 "$credentialWriter/write-credential.sh"

credentialJson="$(/bin/cat <<EOF
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
)"

if [ "$(/usr/bin/id -u)" = "0" ]; then
  # bash's builtin printf: /usr/bin/printf would place the live tenant key in a
  # root process's argv, which macOS exposes to every local uid via ps.
  printf '%s\n' "$credentialJson" \
    | FS_DEST_DIR="$destDir" /usr/bin/su -m "$consoleUser" -c "/bin/sh '$credentialWriter/write-credential.sh'"
else
  # Already unprivileged (the test harness): the same writer, no user switch.
  printf '%s\n' "$credentialJson" \
    | FS_DEST_DIR="$destDir" /bin/sh "$credentialWriter/write-credential.sh"
fi

echo "fancysauce: managed-settings + codex hooks + credentials written for $consoleUser (issued_at: $issuedAt, email: ${USER_EMAIL:-<none>})"
exit 0

# Kandji substitutes the assigned-user email on the line below. It sits after
# `exit 0` deliberately: bash stops parsing here, so a multi-line or
# terminator-bearing address cannot become a command. Read back by the sed near
# the top of this file. Do not move it, and do not add a second occurrence.
#FS_EMAIL $EMAIL
