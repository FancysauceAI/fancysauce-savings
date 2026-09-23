#!/bin/sh
# deploy-credentials.sh
# Materializes ~/.config/fancysauce/credentials.json for the running user.
#
# Jamf installs this script to /Library/Application Support/fancysauce/ (mode 0755,
# owner root:wheel) and invokes it via the LaunchAgent at every user login.
#
# What this does:
#   1. Reads /Library/Application Support/fancysauce/credentials.json.tmpl
#      (carries the static ingest token; email/UPN/timestamp are placeholders).
#   2. If the OPTIONAL identity configuration profile is installed, reads
#      user_email / user_upn from the managed-preferences domain
#      ai.fancysauce.identity and fills the identity_hint. Without the profile
#      the identity_hint line is dropped and the plugin attributes usage to the
#      developer's own Claude Code / Codex sign-in, which the server treats as
#      attested. A hint email is only ever asserted by this machine, so the
#      profile is for fleets whose developers use API keys or Bedrock/Vertex
#      and have no sign-in to read.
#   3. Substitutes __ISSUED_AT__ (and __USER_EMAIL__ / __USER_UPN__ when a
#      profile is present).
#   4. Writes the result to ~/.config/fancysauce/credentials.json.
#   5. Sets directory to 0700 and file to 0600.

set -eu

# Test-harness prefix applied to the template and the managed-preferences
# paths. Empty in production. $HOME is the user's own; a harness sets it.
PREFIX="${FANCYSAUCE_TEST_PREFIX:-}"

TEMPLATE="$PREFIX/Library/Application Support/fancysauce/credentials.json.tmpl"
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
  defaults read "$PREFIX/Library/Managed Preferences/$(id -un)/$PREF_DOMAIN" "$1" 2>/dev/null \
    || defaults read "$PREFIX/Library/Managed Preferences/$PREF_DOMAIN" "$1" 2>/dev/null \
    || true
}

USER_EMAIL="$(read_pref user_email)"
USER_UPN="$(read_pref user_upn)"
[ -n "$USER_UPN" ] || USER_UPN="$USER_EMAIL"

# --- compute timestamp ----------------------------------------------------

ISSUED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

# --- substitute and write -------------------------------------------------

mkdir -p "$DEST_DIR" || {
  echo "ERROR: could not create directory: $DEST_DIR" >&2
  exit 1
}
chmod 0700 "$DEST_DIR"

# The template keeps identity_hint on ONE line so that, with no profile, the
# whole hint can be dropped by line and the remaining JSON stays valid.
# Use a sed delimiter (|) that cannot appear in an email address or timestamp.
if [ -n "$USER_EMAIL" ]; then
  sed \
    -e "s|__ISSUED_AT__|$ISSUED_AT|" \
    -e "s|__USER_EMAIL__|$USER_EMAIL|" \
    -e "s|__USER_UPN__|$USER_UPN|" \
    "$TEMPLATE" > "$DEST_FILE"
else
  sed \
    -e "s|__ISSUED_AT__|$ISSUED_AT|" \
    -e '/"identity_hint"/d' \
    "$TEMPLATE" > "$DEST_FILE"
fi || {
  echo "ERROR: failed to write credentials file: $DEST_FILE" >&2
  exit 1
}
chmod 0600 "$DEST_FILE"

if [ -n "$USER_EMAIL" ]; then
  echo "fancysauce credentials written to $DEST_FILE (issued_at: $ISSUED_AT, email hint: $USER_EMAIL)"
else
  echo "fancysauce credentials written to $DEST_FILE (issued_at: $ISSUED_AT; no identity profile — identity comes from the developer's Claude Code / Codex sign-in)"
fi
exit 0
