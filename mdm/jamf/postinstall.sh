#!/bin/bash
# fancysauce-savings — Jamf package postinstall.
#
# Runs as root after the payload lands. The payload is static (Jamf renders
# nothing), so this script does the parts a file drop cannot:
#   - directory modes a hardened root umask would otherwise leave untraversable
#   - removal of files the OTHER Claude Code arm, or a pre-release build, left
#     behind (a pkg install never deletes what an earlier pkg wrote)
#   - the configuration-profile preflight
#   - a first credential write for the console user, without a re-login
#
# CC_MODE is stamped by build-pkg.sh to match the payload it staged. Only the
# postinstall knows which arm the package carries, and a mode switch leaves the
# previous arm's files on disk until something removes them.
CC_MODE="managed-hooks"

set -eo pipefail

# Test-harness prefix applied to every path. Empty in production.
PREFIX="${FANCYSAUCE_TEST_PREFIX:-}"

CC_DIR="$PREFIX/Library/Application Support/ClaudeCode"
CC_DROPIN_DIR="$CC_DIR/managed-settings.d"
CC_FRAGMENT="$CC_DROPIN_DIR/50-fancysauce.json"
CC_LEGACY_SETTINGS="$CC_DIR/managed-settings.json"
CC_ETC_DIR="$PREFIX/etc/fancysauce"
CC_HOOKS_DIR="$CC_ETC_DIR/hooks"
CC_HOOK_CMD="/etc/fancysauce/hooks/fancysauce.sh"
LAUNCH_AGENT="/Library/LaunchAgents/ai.fancysauce.deploy-credentials.plist"

consoleUser="$(/usr/bin/stat -f%Su /dev/console 2>/dev/null || true)"

# Claude Code reads policy as the logged-in user. Traversal only on the parents:
# the ClaudeCode directory is not ours alone, and /etc/fancysauce is also the
# system credential root, so an operator's tighter mode must survive.
[ -d "$CC_DIR" ] && /bin/chmod a+x "$CC_DIR"

case "$CC_MODE" in
  plugin)
    # A fragment from an earlier managed-hooks deploy sets enabledPlugins false,
    # which suppresses the plugin this arm exists to enable. Both names are ours.
    /bin/rm -f "$CC_FRAGMENT" "$CC_DROPIN_DIR/50-fancysauce-telemetry.json" || true
    ;;
  managed-hooks)
    # A Claude Code configuration profile outranks every file here: managed tiers
    # are first-wins, so a profile carrying one unrelated key drops all of these
    # hooks while the files stay on disk and this install reports success.
    # Nothing on the machine can override a profile, so warn and continue.
    cc_warn_plist() {
      [ -e "$1" ] || return 0
      echo "fancysauce: a Claude Code configuration profile is installed at $1." >&2
      echo "fancysauce:   Managed settings are first-wins, not merged, so that profile supplies the whole policy and the hooks in $CC_FRAGMENT are ignored. The machine then collects nothing." >&2
      echo "fancysauce:   Fix: remove the profile, or move these hooks into it. Confirm which tier is active on the Mac with /status, under \"Setting sources\"." >&2
    }
    CC_MP_DIR="$PREFIX/Library/Managed Preferences"
    case "$consoleUser" in
      '' | root | loginwindow) ;;
      *) cc_warn_plist "$CC_MP_DIR/$consoleUser/com.anthropic.claudecode.plist" ;;
    esac
    cc_warn_plist "$CC_MP_DIR/com.anthropic.claudecode.plist"

    [ -d "$CC_ETC_DIR" ] && /bin/chmod a+x "$CC_ETC_DIR"
    [ -d "$CC_HOOKS_DIR" ] && /bin/chmod 0755 "$CC_HOOKS_DIR"
    [ -d "$CC_DROPIN_DIR" ] && /bin/chmod 0755 "$CC_DROPIN_DIR"

    # Claude Code merges every *.json in the drop-in directory; a pre-release
    # build's fragment would make every hook event run twice.
    /bin/rm -f "$CC_DROPIN_DIR/50-fancysauce-telemetry.json" || true

    # A pre-release build wrote the hooks block into managed-settings.json itself.
    # Delete only when byte-identical to the fragment — the one shape provable to
    # hold nothing but our keys without a JSON parser. Anything else is reported,
    # never edited: a tenant may have put policy in that file since.
    if [ -f "$CC_LEGACY_SETTINGS" ] && [ -f "$CC_FRAGMENT" ]; then
      if /usr/bin/cmp -s "$CC_LEGACY_SETTINGS" "$CC_FRAGMENT"; then
        /bin/rm -f "$CC_LEGACY_SETTINGS" || true
      elif /usr/bin/grep -qF "$CC_HOOK_CMD" "$CC_LEGACY_SETTINGS" 2>/dev/null; then
        echo "fancysauce: $CC_LEGACY_SETTINGS carries fancysauce hooks alongside other content. Delete its \"hooks\" and \"enabledPlugins\" keys by hand, or every hook event runs twice." >&2 || true
      fi
    fi
    ;;
  *)
    echo "fancysauce: CC_MODE must be 'plugin' or 'managed-hooks' (got: $CC_MODE)" >&2
    exit 1
    ;;
esac

# The LaunchAgent writes credentials at login. A package that lands mid-session
# would otherwise leave the console user without a credential until they log
# out. Bootstrapping it now runs deploy-credentials.sh once for that user.
# Skipped under the test prefix: the real launchd must not load a test payload.
if [ -z "$PREFIX" ]; then
  case "$consoleUser" in
    '' | root | loginwindow) ;;
    *)
      uid="$(/usr/bin/id -u "$consoleUser" 2>/dev/null || true)"
      if [ -n "$uid" ] && [ -f "$LAUNCH_AGENT" ]; then
        /bin/launchctl bootstrap "gui/$uid" "$LAUNCH_AGENT" 2>/dev/null \
          || /bin/launchctl kickstart "gui/$uid/ai.fancysauce.deploy-credentials" 2>/dev/null \
          || true
      fi
      ;;
  esac
fi

exit 0
