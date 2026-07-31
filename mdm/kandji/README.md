# Kandji MDM deployment — fancysauce for Claude Code + Codex

## What this deploys

A single Kandji **Custom Script** library item writes everything fancysauce
telemetry needs on a managed Mac — for both tools:

| Artifact | Path | Scope | Purpose |
|---|---|---|---|
| `managed-settings.json` | `/Library/Application Support/ClaudeCode/managed-settings.json` | System-wide | Registers the fancysauce marketplace and enables the plugin for every Claude Code user on the machine. Identical across all tenants — contains no secrets. |
| `requirements.toml` | `/etc/codex/requirements.toml` | System-wide | Enforces the fancysauce telemetry hook for every Codex lifecycle event. Enforced hooks are **auto-trusted** — no user prompt, telemetry runs zero-step. |
| `fancysauce.sh` | `/etc/codex/hooks/fancysauce.sh` | System-wide | The Codex hook wrapper `requirements.toml` invokes. Fail-open (never breaks a session); fetches the pinned plugin release into `~/.cache/fancysauce/codex/` and runs telemetry from there. |
| `credentials.json` | `~/.config/fancysauce/credentials.json` | Per-user | Carries the tenant API key and the assigned user's email. Read by **both** tools. |

The Claude Code plugin is fetched from the public GitHub dist repo
`FancysauceAI/fancysauce-savings` on first use; Codex telemetry fetches the
same repo at the pinned tag. Nothing is bundled here.

### Why one script does it all (Kandji is simpler than Jamf here)

Kandji Custom Scripts run **as root**, and Kandji substitutes global variables —
including `$EMAIL` — directly into the **body of a Custom Script** at render
time (one documented caveat: the script must be **bash, not zsh**, when
referencing them). That means a single script can lay down the system-wide
files for both tools *and* write a per-user credentials file with the assigned
user's email inlined — no package, no configuration profile, no LaunchAgent.
(Jamf, by contrast, only substitutes `$EMAIL` inside configuration-profile
payloads, which forces a three-artifact dance — see `../jamf/README.md`.)

## Prerequisites

- Kandji with permission to add Custom Script library items.
- A tenant API key from your fancysauce dashboard. Keys have the prefix `fs_live_t_`.
- A **directory integration** (SCIM/IdP) or ADE assignment so Kandji's `$EMAIL`
  resolves to the device's **assigned user**. `$EMAIL` is per-device-assigned-user,
  so this assumes a 1:1 user↔Mac assignment.
- Target Macs running macOS 12 or later.
- For Claude Code telemetry: Claude Code 2.1.141+.
- For Codex telemetry: Codex 0.142+ with `git` and `node` on the Mac (standard
  on developer machines). Macs without Codex are fine — the files are inert
  until Codex is installed, then telemetry starts automatically.

## Step 1: Edit the script

Open `deploy.sh` and set the four configuration values at the top:

```sh
TENANT_KEY="fs_live_t_REPLACE_ME"   # replace with your tenant key
IDENTITY_TYPE="full"
CODEX_TAG="v0.13.1"                 # pinned plugin release for Codex telemetry
CODEX_SHA="a034a1faf449c5c09e3b54899f8ee94a693081f8"   # commit sha of CODEX_TAG
```

`CODEX_TAG`/`CODEX_SHA` pin exactly which fancysauce release Codex telemetry
runs — the deployed script is your audit record. The shipped values are
current; to pin a different release, resolve the tag's commit sha:

```sh
git ls-remote https://github.com/FancysauceAI/fancysauce-savings.git 'refs/tags/vX.Y.Z^{}'
```

(Take the sha from the `^{}` line; for an unannotated tag, drop the `^{}`.)

Leave the `USER_EMAIL="$EMAIL"` / `USER_UPN="$EMAIL"` lines exactly as they are —
Kandji fills `$EMAIL` at render time. **Do not** wrap `$EMAIL` in `${...}`; an
address containing `@` breaks bash parameter expansion. If your directory has a
distinct UPN, change `USER_UPN="$EMAIL"` to another Kandji global variable that
maps to it. Do not add other Kandji global variables inside the script's
embedded wrapper section — Kandji substitutes them textually anywhere in the
script body.

Do not commit the edited script (it contains the tenant key) to source control.
Paste it into Kandji or pull it from a secrets manager at upload time.

## Step 2: Create the Custom Script library item

1. In Kandji go to **Library → Add New → Custom Script**.
2. **Execution frequency:** **Run on every check-in** (or **every 15 minutes**).
   This matters: the script writes per-user credentials for whoever is logged in
   at run time, so re-running catches a user who logs in after the first deploy.
   "Run once" would miss them.
3. Paste the edited `deploy.sh` into the **Script** field. (No remediation
   script is needed.)
4. Assign the library item to the **Blueprint(s)** covering your Claude Code /
   Codex developer Macs.
5. Save.

## Step 3: Verify on a target Mac

After the item runs on a test Mac (force a check-in from the Kandji menu-bar
agent, or wait for the interval), run these checks **as the logged-in user**.

**Check 1 — Claude Code managed-settings installed:**
```sh
cat "/Library/Application Support/ClaudeCode/managed-settings.json"
```
Expected: the marketplace + `enabledPlugins` JSON.

**Check 2 — Codex managed hooks installed:**
```sh
cat /etc/codex/requirements.toml
ls -l /etc/codex/hooks/fancysauce.sh
```
Expected: a stanza per lifecycle event, each command carrying your
`--ref <tag> --sha <sha>`; the wrapper present, root-owned, executable (`-rwxr-xr-x`).

**Check 3 — credentials materialized:**
```sh
cat ~/.config/fancysauce/credentials.json
```
Expected: valid JSON with `credential` set to your tenant key,
`identity_hint.user_email` set to the assigned user's email (not the literal
`$EMAIL`, not empty), and a recent `issued_at`.

**Check 4 — file permissions and ownership:**
```sh
stat -f "%A %Su %N" ~/.config/fancysauce ~/.config/fancysauce/credentials.json
```
Expected: `700 <user> .../fancysauce` and `600 <user> .../credentials.json`.
The plugin **rejects** any credentials file readable by group or other.

**Check 5 — script output in Kandji:**
In the Kandji web app, open the library item's status on the test device and
confirm the last run's stdout ends with
`fancysauce: managed-settings + codex hooks + credentials written for <user>`.

**Check 6 — telemetry in the dashboard:**
Run a few prompts in Claude Code and a short Codex session. Confirm events from
both tools are tagged with the user's hashed email (`handle_email`) or OS
handle (`handle_os`). Codex needs no plugin install and shows **no trust
prompt** — enforced hooks are auto-trusted.

## Key rotation and Codex upgrades

1. Update `TENANT_KEY` (rotation) or `CODEX_TAG` + `CODEX_SHA` (pin a new
   release) in the Custom Script.
2. Save the library item.

The script overwrites its artifacts on the next check-in run, so changes
propagate within one check-in interval — no repackaging.

## Troubleshooting

**`credentials.json` has an empty `user_email`, or the run logs `WARN: $EMAIL is empty`:**
The device has no assigned user with an email in Kandji. Confirm your
directory/SCIM integration is populating the assigned user, and that the device
is assigned to a user (Kandji → device → User). `$EMAIL` is the *assigned*
user, which on a shared Mac may differ from whoever is logged in.

**`credentials.json` contains the literal string `$EMAIL`:**
The script was saved as **zsh** instead of bash, or `$EMAIL` was wrapped in
`${...}`. Confirm the shebang is `#!/bin/bash` and the variable is referenced
bare.

**Script logs "No console user logged in":**
Expected at the loginwindow. The system-wide files are still written;
credentials are written on the next check-in after a user logs in. This is why
the execution frequency must be recurring, not once.

**Plugin not loading in Claude Code:**
Confirm `managed-settings.json` is valid JSON and Claude Code is 2.1.141+. If
the org sets `allowManagedHooksOnly`, the plugin's hooks still load because it
is force-enabled via `enabledPlugins` in managed settings.

**No Codex telemetry in the dashboard:**
Confirm `git` and `node` are on PATH for the user's shell, the wrapper is
executable (`ls -l /etc/codex/hooks/fancysauce.sh`), and the cache populated
after a session (`ls ~/.cache/fancysauce/codex/`). The wrapper is fail-open —
it never surfaces errors in the Codex session, so an empty cache after a
session means the fetch failed (network/proxy) or the pinned sha doesn't match
the tag.

**Codex telemetry silently stopped after an org config change:**
If another MDM payload delivers the profile key
`com.openai.codex:requirements_toml_base64`, it **overrides**
`/etc/codex/requirements.toml`. Fold the fancysauce hooks into that profile
instead, or remove the competing key.
