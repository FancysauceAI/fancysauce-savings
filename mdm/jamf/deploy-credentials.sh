#!/bin/sh
# deploy-credentials.sh
# Materializes ~/.config/fancysauce/credentials.json for the running user.
#
# Jamf installs this script to /Library/Application Support/fancysauce/ (mode 0755,
# owner root:wheel) and invokes it via the LaunchAgent at every user login.
#
# Per-user identity (email/UPN) is NOT carried in this script or the pkg payload:
# Jamf only substitutes $EMAIL inside configuration-profile payloads, never inside
# package files or scripts. So the email is delivered separately by a Jamf
# configuration profile that writes the managed-preferences domain
# ai.fancysauce.identity, and this script reads it back at login.
#
# What this does:
#   1. Reads user_email / user_upn from the managed-preferences domain
#      ai.fancysauce.identity (populated by the Jamf config profile).
#   2. Reads /Library/Application Support/fancysauce/credentials.json.tmpl
#      (carries the static tenant key; email/UPN/timestamp are placeholders).
#   3. Substitutes __USER_EMAIL__, __USER_UPN__, and __ISSUED_AT__.
#   4. Writes the result to ~/.config/fancysauce/credentials.json.
#   5. Sets directory to 0700 and file to 0600.

set -eu

TEMPLATE="/Library/Application Support/fancysauce/credentials.json.tmpl"
DEST_DIR="$HOME/.config/fancysauce"
DEST_FILE="$DEST_DIR/credentials.json"
PREF_DOMAIN="ai.fancysauce.identity"

# --- guards ---------------------------------------------------------------

if [ ! -f "$TEMPLATE" ]; then
  echo "ERROR: template not found: $TEMPLATE" >&2
  exit 1
fi

# --- read per-user identity from the managed-preferences domain -----------
#
# A user-level config profile lands at
#   /Library/Managed Preferences/<user>/ai.fancysauce.identity.plist
# a computer-level one at
#   /Library/Managed Preferences/ai.fancysauce.identity.plist
# Try the user-level path first, then fall back to the computer-level path.

read_pref() {
  defaults read "/Library/Managed Preferences/$(id -un)/$PREF_DOMAIN" "$1" 2>/dev/null \
    || defaults read "/Library/Managed Preferences/$PREF_DOMAIN" "$1" 2>/dev/null \
    || true
}

USER_EMAIL="$(read_pref user_email)"
USER_UPN="$(read_pref user_upn)"
[ -n "$USER_UPN" ] || USER_UPN="$USER_EMAIL"

if [ -z "$USER_EMAIL" ]; then
  echo "WARN: no user_email in managed preferences ($PREF_DOMAIN); writing credential without an email hint. Confirm the ai.fancysauce.identity config profile is scoped to this machine." >&2
fi

# --- compute timestamp ----------------------------------------------------

ISSUED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

# --- substitute and write -------------------------------------------------

mkdir -p "$DEST_DIR" || {
  echo "ERROR: could not create directory: $DEST_DIR" >&2
  exit 1
}
chmod 0700 "$DEST_DIR"

# Use a sed delimiter (|) that cannot appear in an email address or timestamp.
sed \
  -e "s|__ISSUED_AT__|$ISSUED_AT|" \
  -e "s|__USER_EMAIL__|$USER_EMAIL|" \
  -e "s|__USER_UPN__|$USER_UPN|" \
  "$TEMPLATE" > "$DEST_FILE" || {
  echo "ERROR: failed to write credentials file: $DEST_FILE" >&2
  exit 1
}
chmod 0600 "$DEST_FILE"

echo "fancysauce credentials written to $DEST_FILE (issued_at: $ISSUED_AT, email: ${USER_EMAIL:-<none>})"
exit 0
