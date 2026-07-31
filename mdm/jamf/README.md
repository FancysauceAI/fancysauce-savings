# Jamf MDM deployment — fancysauce for Claude Code + Codex

## What this deploys

Five artifacts land on each managed Mac — three for Claude Code, two system-wide for Codex:

| Artifact | Path | Scope | Purpose |
|---|---|---|---|
| `managed-settings.json` | `/Library/Application Support/ClaudeCode/managed-settings.json` | System-wide | Registers the fancysauce marketplace and enables the plugin for every Claude Code user on the machine. Identical across all tenants — contains no secrets. |
| `ai.fancysauce.identity` config profile | managed-preferences domain | Per-user | Carries the user's directory email/UPN. **This is the only artifact where Jamf substitutes `$EMAIL`.** |
| `credentials.json` | `~/.config/fancysauce/credentials.json` | Per-user | Carries the tenant API key and the user's email so the plugin can tag usage events. Materialized at each user login by a LaunchAgent that reads the identity profile above. |
| `requirements.toml` | `/etc/codex/requirements.toml` | System-wide | Enforces the fancysauce telemetry hook for every Codex lifecycle event. Enforced hooks are **auto-trusted** — no user prompt, telemetry runs zero-step. Shipped verbatim from `../codex/`. |
| `fancysauce.sh` | `/etc/codex/hooks/fancysauce.sh` | System-wide | The Codex hook wrapper `requirements.toml` invokes. Fail-open (never breaks a session); fetches the pinned plugin release into `~/.cache/fancysauce/codex/` and runs telemetry from there. Shipped verbatim from `../codex/`. |

The plugin (`fancysauce-savings`) is fetched from the public GitHub dist repo `FancysauceAI/fancysauce-savings` on first use; it is not bundled in this package.

### Why three artifacts (read this — it's the whole design)

Jamf substitutes payload variables like `$EMAIL` **only inside configuration-profile payloads**. It does **not** rewrite variables inside a `.pkg` payload or a script — packages deploy byte-for-byte and scripts receive positional parameters (`$1`–`$3` built-in, `$4`–`$11` admin-defined), never `$EMAIL`. So we cannot bake `$EMAIL` into `credentials.json` directly. Instead:

1. A **configuration profile** writes the managed-preferences domain `ai.fancysauce.identity` with `user_email = $EMAIL` — here Jamf's substitution genuinely works.
2. A **package** lays down the static tenant key (in `credentials.json.tmpl`), the deploy script, and the LaunchAgent.
3. The **LaunchAgent** runs `deploy-credentials.sh` in the user's context at login. The script reads the email back out of the managed-preferences domain and assembles the final `credentials.json`.

The two **Codex** artifacts sidestep that problem entirely: they are system-wide
and carry no per-user data, so they ship in the same package byte-for-byte.
Codex telemetry never uses `codex plugin` commands — those hooks are gated by a
first-run trust prompt and install per user. An enforced `requirements.toml` is
auto-trusted instead, so telemetry runs with no user action. The per-user
`credentials.json` above is tool-agnostic: Codex reads the same file.

## Prerequisites

- Jamf Pro with Composer access to build a `.pkg`.
- A tenant API key from your fancysauce dashboard. Keys have the prefix `fs_live_t_`.
- Jamf **User and Location** inventory populated so `$EMAIL` resolves (standard directory-integration / IdP-sync setup; see Jamf Pro Admin Guide → User and Location). `$EMAIL` is the email of the user *assigned to the computer* in Jamf inventory — this assumes a 1:1 user↔Mac assignment.
- Target Macs running macOS 12 or later with Claude Code 2.1.141+ installed.
- For Codex telemetry: Codex 0.142+ with `git` and `node` on the Mac (standard on developer machines). Macs without Codex are fine — the two `/etc/codex` files are inert until Codex is installed, then telemetry starts automatically.

## Step 1: Replace the tenant key

Open `credentials.json.tmpl` and replace the placeholder with your actual tenant API key:

```
"credential": "fs_live_t_REPLACE_ME"
              ^^^^^^^^^^^^^^^^^^^^
              replace with your key, e.g. fs_live_t_abc123xyz
```

Leave `__USER_EMAIL__`, `__USER_UPN__`, and `__ISSUED_AT__` alone — `deploy-credentials.sh` fills those at login.

Do not commit the key to source control. Store the modified template in a secrets manager and retrieve it during pkg build.

## Step 2: Deploy the identity configuration profile

This is the artifact that carries the per-user email. Deploy `identity-profile.plist` as a **Custom Settings** payload:

1. In Jamf Pro go to **Computers → Configuration Profiles → New**.
2. Add an **Application & Custom Settings → External Applications** payload.
3. Set **Preference Domain** to `ai.fancysauce.identity`.
4. Upload `identity-profile.plist` as the property list (or paste its contents). It contains `$EMAIL` for both `user_email` and `user_upn`.
5. **Scope** to your Claude Code developer smart group.
6. Save. Jamf substitutes `$EMAIL` per machine when it renders and installs the profile.

> **Email vs UPN:** `identity-profile.plist` uses `$EMAIL` for both `user_email` and `user_upn`. If your directory has a distinct UPN, replace the `user_upn` value with a Jamf extension-attribute variable mapped to UPN (e.g. `$EXTENSIONATTRIBUTE_<id>`).

## Step 3: Build the Composer package

Use Jamf Composer to create a package with the following layout. All parent directories are created by the package installer.

| Source file | Installed path | Owner | Mode |
|---|---|---|---|
| `managed-settings.json` | `/Library/Application Support/ClaudeCode/managed-settings.json` | root:wheel | 0644 |
| `credentials.json.tmpl` (key replaced) | `/Library/Application Support/fancysauce/credentials.json.tmpl` | root:wheel | 0644 |
| `deploy-credentials.sh` | `/Library/Application Support/fancysauce/deploy-credentials.sh` | root:wheel | 0755 |
| `LaunchAgent.plist` | `/Library/LaunchAgents/ai.fancysauce.deploy-credentials.plist` | root:wheel | 0644 |
| `../codex/fancysauce.sh` (verbatim) | `/etc/codex/hooks/fancysauce.sh` | root:wheel | 0755 |
| `../codex/requirements.toml` (verbatim) | `/etc/codex/requirements.toml` | root:wheel | 0644 |

All six files must be in the same package so Jamf installs them atomically. Copy
the two `codex/` files in **unmodified** — they are the canonical templates, and
the pinned release they carry is the audit record of exactly which fancysauce
code runs on your fleet.

## Step 4: Deploy the package via Jamf policy

1. Upload the built `.pkg` to Jamf Pro.
2. Create a policy:
   - **Packages:** the pkg you just uploaded.
   - **Trigger:** Enrollment Complete and Recurring Check-In (so it runs on re-enrollment and when the machine checks in with a stale or missing installation).
   - **Execution frequency:** Once per computer (for the initial deploy); switch to "Once per computer per user" if you need per-user re-runs on shared Macs.
   - **Scope:** your Claude Code developer smart group (the same group scoped in Step 2).
3. Save and deploy. Jamf installs the files the next time a scoped machine checks in.

## Step 5: Verify on a target Mac

Run these checks after a test deployment.

**Check 1 — managed-settings installed:**
```sh
cat "/Library/Application Support/ClaudeCode/managed-settings.json"
```
Expected: the contents of `managed-settings.json` from this template set.

**Check 2 — identity profile landed and substituted:**
```sh
defaults read "/Library/Managed Preferences/$(id -un)/ai.fancysauce.identity" user_email \
  || defaults read "/Library/Managed Preferences/ai.fancysauce.identity" user_email
```
Expected: the logged-in user's directory email — **not** the literal string `$EMAIL`.

**Check 3 — credentials materialized after user login:**

Log out and back in on the test Mac (or `launchctl load /Library/LaunchAgents/ai.fancysauce.deploy-credentials.plist` as the test user to trigger it manually), then:
```sh
cat ~/.config/fancysauce/credentials.json
```
Expected: valid JSON with `credential` set to your tenant key, `identity_hint.user_email` set to the logged-in user's email (not `$EMAIL`), and `issued_at` showing today's UTC timestamp.

**Check 4 — file permissions:**
```sh
stat -f "%A %N" ~/.config/fancysauce ~/.config/fancysauce/credentials.json
```
Expected:
```
700 /Users/<user>/.config/fancysauce
600 /Users/<user>/.config/fancysauce/credentials.json
```

**Check 5 — Codex managed hooks installed:**
```sh
cat /etc/codex/requirements.toml
ls -l /etc/codex/hooks/fancysauce.sh
```
Expected: a stanza per lifecycle event, each command carrying `--ref <tag> --sha <sha>`; the wrapper present, root-owned, executable (`-rwxr-xr-x`).

**Check 6 — telemetry in the dashboard:**

Start Claude Code on the test Mac and run a few prompts, then run a short Codex session. Open your fancysauce dashboard and confirm events from both tools are tagged with the user's hashed email (`handle_email`) or OS handle (`handle_os`). Codex needs no plugin install and shows **no trust prompt** — enforced hooks are auto-trusted.

## Key rotation and Codex upgrades

When the tenant API key expires or is rotated:

1. Update `credentials.json.tmpl` with the new key.
2. Rebuild the Composer package.
3. Redeploy via the same Jamf policy (or a new policy scoped to all affected machines).

The LaunchAgent runs at every user login, so the next login after the package lands writes the updated credentials file automatically. Users already logged in at deploy time get the new key on their next login, or sooner if you trigger the LaunchAgent manually. (Rotating the key does not require redeploying the identity config profile — that artifact only carries the email.)

**Upgrading the pinned Codex release** is the same loop: copy the newer
`../codex/requirements.toml` into the package, rebuild, redeploy. To pin a
release yourself, resolve the tag's peeled commit with
`git ls-remote https://github.com/FancysauceAI/fancysauce-savings.git 'refs/tags/vX.Y.Z^{}'`
and edit the `--ref`/`--sha` pair on every command line.

## Troubleshooting

**`credentials.json` contains the literal string `$EMAIL` or an empty `user_email`:**
The identity config profile (Step 2) is missing, not scoped to this machine, or `$EMAIL` did not resolve. Run Check 2 — if `defaults read` of `ai.fancysauce.identity` returns nothing or `$EMAIL`, the profile isn't applied or Jamf's User and Location inventory has no email for the assigned user. Confirm the machine has an assigned user with an email in Jamf Pro → Inventory → the machine → User and Location, and that the config profile is scoped to it. **Note:** this is *not* fixed by anything in the package — the email comes only from the config profile.

**LaunchAgent not loading / credentials.json not appearing after login:**
Check the log file:
```sh
cat ~/Library/Logs/fancysauce-deploy.log
```
Common causes: wrong file ownership on the plist (must be root:wheel), wrong mode (must be 0644 — not executable), or the LaunchAgent plist was placed under `/Library/LaunchAgents/` after the user had already logged in and launchd hasn't re-scanned.

**`deploy-credentials.sh` exits 1 — template not found:**
The script can't find the template. Confirm Jamf installed all package files together, and verify the path:
```sh
ls -la "/Library/Application Support/fancysauce/"
```

**Permission denied writing credentials.json:**
The LaunchAgent runs as the user, so it needs write access to `~/.config/`. This is normally guaranteed. If the user's home directory is network-mounted or restricted by another MDM policy, check that the user can write to `~/.config/`.

**Plugin not loading in Claude Code:**
Confirm `managed-settings.json` is at the correct path and is valid JSON (`cat "/Library/Application Support/ClaudeCode/managed-settings.json" | python3 -m json.tool`). Also confirm Claude Code is version 2.1.141 or later for reliable `extraKnownMarketplaces` support. If the org sets `allowManagedHooksOnly`, the plugin's hooks still load because it is force-enabled via `enabledPlugins` in managed settings.

**No Codex telemetry in the dashboard:**
Confirm `git` and `node` are on PATH for the user's shell, the wrapper is executable (`ls -l /etc/codex/hooks/fancysauce.sh`), and the cache populated after a session (`ls ~/.cache/fancysauce/codex/`). The wrapper is fail-open — it never surfaces errors in the Codex session, so an empty cache after a session means the fetch failed (network/proxy) or the pinned sha doesn't match the tag. If another MDM payload delivers the profile key `com.openai.codex:requirements_toml_base64`, it **overrides** `/etc/codex/requirements.toml` — fold the fancysauce hooks into that profile instead.
