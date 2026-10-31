#!/bin/bash
# fancysauce - Jamf Pro policy script: the Fancysauce plugin for Claude Code (macOS).
# Policy: Scripts payload. Trigger: Enrollment Complete + Recurring Check-in. Frequency: Ongoing.
set -eu
PREFIX="${FANCYSAUCE_TEST_PREFIX:-}"
CC_DIR="$PREFIX/Library/Application Support/ClaudeCode"
DROPIN_DIR="$CC_DIR/managed-settings.d"
DEST="$DROPIN_DIR/50-fancysauce.json"
MP_DIR="$PREFIX/Library/Managed Preferences"
warn_plist() { # <path>; warn only: nothing on the Mac outranks a profile
  [ -e "$1" ] || return 0
  echo "fancysauce: WARNING: a Claude Code configuration profile is installed at $1." >&2
  echo "fancysauce:   Managed settings are first-wins. If it holds any setting, Claude Code ignores $DEST and this Mac collects nothing." >&2
  echo "fancysauce:   Check /status -> Setting sources in Claude Code on this Mac." >&2
}
consoleUser="$(/usr/bin/stat -f%Su /dev/console 2>/dev/null || true)"
case "$consoleUser" in '' | root | loginwindow) ;; *) warn_plist "$MP_DIR/$consoleUser/com.anthropic.claudecode.plist" ;; esac
warn_plist "$MP_DIR/com.anthropic.claudecode.plist"
/bin/mkdir -p "$DROPIN_DIR"
/bin/chmod a+x "$CC_DIR"
/bin/chmod 0755 "$DROPIN_DIR"
if /usr/bin/grep -qF '/etc/fancysauce/hooks/fancysauce.sh' "$DEST" 2>/dev/null; then
  echo "fancysauce: replacing the Kandji managed-hooks fragment at $DEST with the plugin settings." >&2
fi
# The pre-release Kandji name sorts BEFORE ours, so its hooks would merge in and collect twice.
/bin/rm -f "$DROPIN_DIR/50-fancysauce-telemetry.json"
if /usr/bin/grep -qF '/etc/fancysauce/hooks/fancysauce.sh' "$CC_DIR/managed-settings.json" 2>/dev/null; then
  echo "fancysauce: $CC_DIR/managed-settings.json carries fancysauce hooks. Remove its \"hooks\" key, or every session is collected twice." >&2
fi
TMP="$DEST.$$.tmp"
trap '/bin/rm -f "$TMP"' EXIT
/bin/cat > "$TMP" <<'FANCYSAUCE_SETTINGS_EOF'
__FANCYSAUCE_SETTINGS_JSON__
FANCYSAUCE_SETTINGS_EOF
# Runs every check-in: an identical rewrite would still touch a file Claude Code watches.
if /usr/bin/cmp -s "$TMP" "$DEST"; then echo "fancysauce: $DEST is current."; exit 0; fi
/bin/chmod 0644 "$TMP"
/bin/mv -f "$TMP" "$DEST"
echo "fancysauce: wrote $DEST."
exit 0
