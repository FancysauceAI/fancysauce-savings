# Jamf MDM deployment — fancysauce for Claude Code + Codex

## What this deploys

One package, built by `build-pkg.sh` from the files in this folder. It carries
everything for both tools. An optional configuration profile can add a
directory email per user — see [Where identity comes from](#where-identity-comes-from)
before deciding whether you need it. `--cc-mode` picks the Claude Code arm.

| Artifact | Path | Scope | Purpose |
|---|---|---|---|
| `50-fancysauce.json` (`managed-hooks`, the default) | `/Library/Application Support/ClaudeCode/managed-settings.d/50-fancysauce.json` | System-wide | Wires every Claude Code hook event to the fancysauce wrapper, and disables the plugin so one session is not collected twice. A drop-in fragment — your own `managed-settings.json` is never created or edited. Identical across all tenants — contains no secrets. Needs Claude Code 2.1.83+. |
| `fancysauce.sh` (`managed-hooks` only) | `/etc/fancysauce/hooks/fancysauce.sh` | System-wide | The same wrapper the Codex hooks use, invoked with `--tool claude-code`. Fetches the pinned release into `~/.cache/fancysauce/claude-code/` and runs the usage analytics from there. |
| `claude-code.pin` (`managed-hooks` only) | `/etc/fancysauce/claude-code.pin` | System-wide | One line, `<tag> <sha>`. Names the plugin release Claude Code usage analytics runs. Change it to move the fleet. |
| `managed-settings.json` (`--cc-mode plugin`) | `/Library/Application Support/ClaudeCode/managed-settings.json` | System-wide | The alternative arm: registers the fancysauce marketplace and enables the plugin, which each user then installs once with `claude plugin install fancysauce-savings@fancysauce`. |
| `ai.fancysauce.identity` config profile (**optional**) | managed-preferences domain | Per-user | Adds the user's directory email/UPN as an identity hint. Only for fleets whose developers have no Claude Code / Codex sign-in to attribute by. **This is the only artifact where Jamf substitutes `$EMAIL`.** Not in the package. |
| `credentials.json` | `~/.config/fancysauce/credentials.json` | Per-user | Carries the ingest token (and the email hint when the profile is deployed); read by **both** tools. Materialized at each user login by a LaunchAgent. |
| `requirements.toml` | `/etc/codex/requirements.toml` | System-wide | Enforces the fancysauce usage-analytics hook for every Codex lifecycle event. Enforced hooks are **auto-trusted** — no user prompt, analytics run zero-step. |
| `fancysauce.sh` | `/etc/codex/hooks/fancysauce.sh` | System-wide | The Codex hook wrapper `requirements.toml` invokes. Fail-open (never breaks a session); fetches the pinned plugin release into `~/.cache/fancysauce/codex/` and runs the usage analytics from there. |
| `postinstall` | package script | — | Runs as root after the payload lands: fixes directory modes, removes files left by the other arm or a pre-release build, warns if a Claude Code configuration profile will outrank the fragment, and runs the credential LaunchAgent once for the logged-in user. |

Both Claude Code arms and Codex fetch from the same GitHub dist repo,
`FancysauceAI/fancysauce-savings`. Nothing is bundled in the package.

`managed-hooks` (the default) is analytics-only, needs no user action, and runs
the release named in `/etc/fancysauce/claude-code.pin`. `plugin` registers the
marketplace instead; managed settings enable the plugin but do not install it,
so the user runs the install once. Read [`../README.md`](../README.md) before
choosing — the managed-hooks arm ships no skills, no slash commands, no
statusline and no MCP tools, and it needs Claude Code 2.1.83+.

The managed-hooks arm deploys its policy as a **drop-in fragment** in
`managed-settings.d/`, so a `managed-settings.json` you maintain for your own
policy is left untouched. Order your own fragments around ours with a numeric
prefix: `10-`…`49-` merges before us, `51-`…`99-` overrides us.
[`../README.md`](../README.md#the-drop-in-fragment) has the full merge rules.

### Where identity comes from

Every Mac gets the same ingest token, so the key names the company, not the
person. Per-user attribution comes from the developer's own **Claude Code or
Codex sign-in**: the plugin reads the signed-in claude.ai / ChatGPT account on
the machine and sends it inside the encrypted identity envelope. The server
treats that account as **attested** — it came from the provider, not from the
machine — so it confirms the email and merges onto your roster automatically.
No per-user artifact is needed for it.

The **identity configuration profile is optional** and exists for fleets where
developers have no sign-in to read: Claude Code on API keys or Bedrock/Vertex,
Codex in API-key mode. It carries the directory email via Jamf's `$EMAIL`
substitution, which works **only inside configuration-profile payloads** —
never inside a `.pkg` or a script. The LaunchAgent that materializes
`credentials.json` reads the profile back at login and fills the hint; without
the profile it drops the hint and the sign-in is used.

Two things to know before you deploy it:

- An email from the profile is **asserted** by the machine, not attested by a
  provider. The dashboard shows it as unverified and does not auto-merge it.
- When the profile is present, its email takes precedence over the sign-in on
  that Mac. Deploy it only to the machines that need it.

Everything else in the package is system-wide and ships byte-for-byte. Codex
usage analytics never use `codex plugin` commands — those hooks are gated by a
first-run trust prompt and install per user. An enforced `requirements.toml`
is auto-trusted instead.

## Prerequisites

- Jamf Pro. A Mac with Xcode command-line tools (`pkgbuild`) to run `build-pkg.sh`; Composer is not needed.
- An ingest token from your fancysauce dashboard. Tokens have the prefix `fs_ingest_`; older `fs_live_t_` tokens remain valid. It is write-only: it can append usage events to your workspace and nothing else.
- Developers signed in to Claude Code with a claude.ai account and to Codex with ChatGPT. If they use API keys or Bedrock/Vertex instead, deploy the optional identity profile (Step 2), which needs Jamf **User and Location** inventory populated so `$EMAIL` resolves — the email of the user *assigned to the computer*, a 1:1 user↔Mac assumption.
- Target Macs running macOS 12 or later, with **Node.js 22+** on `PATH` (see [`../README.md`](../README.md#nodejs-is-a-fleet-prerequisite)) and Claude Code 2.1.141+ (2.1.83+ is enough for the managed-hooks arm alone).
- For Codex usage analytics: Codex 0.142+ with `git` and `node` on the Mac. Macs without Codex are fine — the two `/etc/codex` files are inert until Codex is installed, then usage analytics start automatically.
- **No `com.anthropic.claudecode` configuration profile on the fleet** (managed-hooks arm). Managed settings are first-wins, not merged: a profile carrying any key at all makes Claude Code ignore the fragment, and the machine collects nothing. If your fleet needs such a profile, the hooks must live inside it. [`../README.md`](../README.md#a-configuration-profile-outranks-all-of-this) has the details; the postinstall warns when it finds one.

## Step 1: Put the ingest token in a file

```sh
umask 077
printf '%s\n' 'fs_ingest_…' > ~/fancysauce-ingest-token
```

`build-pkg.sh` reads the key from this file and never takes it on the command
line. Do not commit the file. Store the key in a secrets manager and write the
file only on the machine that builds the package.

## Step 2 (optional): Deploy the identity configuration profile

Skip this step unless your developers have no Claude Code / Codex sign-in (see [Where identity comes from](#where-identity-comes-from)). Deploy `identity-profile.plist` as a **Custom Settings** payload:

1. In Jamf Pro go to **Computers → Configuration Profiles → New**.
2. Add an **Application & Custom Settings → External Applications** payload.
3. Set **Preference Domain** to `ai.fancysauce.identity`.
4. Upload `identity-profile.plist` as the property list (or paste its contents). It contains `$EMAIL` for both `user_email` and `user_upn`.
5. **Scope** to your Claude Code developer smart group.
6. Save. Jamf substitutes `$EMAIL` per machine when it renders and installs the profile.

> **Email vs UPN:** `identity-profile.plist` uses `$EMAIL` for both `user_email` and `user_upn`. If your directory has a distinct UPN, replace the `user_upn` value with a Jamf extension-attribute variable mapped to UPN (e.g. `$EXTENSIONATTRIBUTE_<id>`).

## Step 3: Build the package

From this folder (the `mdm/jamf/` directory of the dist repo, next to `../codex/`):

```sh
./build-pkg.sh --key-file ~/fancysauce-ingest-token
# → fancysauce-mdm-managed-hooks-vX.Y.Z.pkg
```

Add `--cc-mode plugin` for the plugin arm. `--out <path>` names the package;
`--stage <dir>` stages the payload without building, if you want to inspect it.

The script refuses a value that is not an ingest token in either spelling, so
a placeholder or a personal key cannot ship. It stamps the
arm into the postinstall, so a package built for one arm cleans up the other
arm's files when it installs over them.

The wrapper, `requirements.toml`, the fragment and the pin go into the package
**unmodified** from this folder and `../codex/`. The pinned release they carry
is the audit record of exactly which fancysauce code runs on your fleet.

<details>
<summary>Building with Composer instead</summary>

Lay the files out as `build-pkg.sh --stage` would, all in one package, and add
`postinstall.sh` as the package's postinstall script with its `CC_MODE` line
set to the arm you are packaging. Replace `fs_ingest_REPLACE_ME` in
`credentials.json.tmpl` with your key first.

| Source file | Installed path | Owner | Mode |
|---|---|---|---|
| `50-fancysauce.json` (managed-hooks) | `/Library/Application Support/ClaudeCode/managed-settings.d/50-fancysauce.json` | root:wheel | 0644 |
| `../codex/fancysauce.sh` (managed-hooks) | `/etc/fancysauce/hooks/fancysauce.sh` | root:wheel | 0755 |
| `claude-code.pin` (managed-hooks) | `/etc/fancysauce/claude-code.pin` | root:wheel | 0644 |
| `managed-settings.json` (plugin) | `/Library/Application Support/ClaudeCode/managed-settings.json` | root:wheel | 0644 |
| `credentials.json.tmpl` (key replaced) | `/Library/Application Support/fancysauce/credentials.json.tmpl` | root:wheel | 0644 |
| `deploy-credentials.sh` | `/Library/Application Support/fancysauce/deploy-credentials.sh` | root:wheel | 0755 |
| `LaunchAgent.plist` | `/Library/LaunchAgents/ai.fancysauce.deploy-credentials.plist` | root:wheel | 0644 |
| `../codex/fancysauce.sh` | `/etc/codex/hooks/fancysauce.sh` | root:wheel | 0755 |
| `../codex/requirements.toml` | `/etc/codex/requirements.toml` | root:wheel | 0644 |

</details>

## Step 4: Deploy the package via Jamf policy

1. Upload the built `.pkg` to Jamf Pro.
2. Create a policy:
   - **Packages:** the pkg you just uploaded.
   - **Trigger:** Enrollment Complete and Recurring Check-In (so it runs on re-enrollment and when the machine checks in with a stale or missing installation).
   - **Execution frequency:** Once per computer (for the initial deploy); switch to "Once per computer per user" if you need per-user re-runs on shared Macs.
   - **Scope:** your Claude Code developer smart group (the same group scoped in Step 2).
3. Save and deploy. Jamf installs the files the next time a scoped machine checks in. The postinstall's output lands in the policy log — look there for the configuration-profile warning.

## Step 5: Verify on a target Mac

Run these checks after a test deployment.

**Check 1 — policy installed (managed-hooks arm):**
```sh
cat "/Library/Application Support/ClaudeCode/managed-settings.d/50-fancysauce.json"
ls -l /etc/fancysauce/hooks/fancysauce.sh
cat /etc/fancysauce/claude-code.pin
claude --version
```
Expected: the fragment from this folder; the wrapper root-owned and executable (`-rwxr-xr-x`); the pin one line, `vX.Y.Z <40-hex-sha>`; Claude Code 2.1.83 or later. Then, in a Claude Code session, `/status` → "Setting sources" should name the managed-settings file tier, not a configuration profile.

**Check 1 (plugin arm):**
```sh
cat "/Library/Application Support/ClaudeCode/managed-settings.json"
```
Expected: the contents of `managed-settings.json` from this folder.

**Check 2 — identity profile landed and substituted (only if you deployed Step 2):**
```sh
defaults read "/Library/Managed Preferences/$(id -un)/ai.fancysauce.identity" user_email \
  || defaults read "/Library/Managed Preferences/ai.fancysauce.identity" user_email
```
Expected: the logged-in user's directory email — **not** the literal string `$EMAIL`.

**Check 3 — credentials materialized:**

The postinstall runs the LaunchAgent once for the logged-in user; otherwise it runs at the next login (or `launchctl load /Library/LaunchAgents/ai.fancysauce.deploy-credentials.plist` as the test user triggers it manually). Then:
```sh
cat ~/.config/fancysauce/credentials.json
```
Expected: valid JSON with `credential` set to your ingest token and `issued_at` showing today's UTC timestamp. With the identity profile deployed, `identity_hint.user_email` is the logged-in user's email (not `$EMAIL`); without it there is no `identity_hint` key at all, and `~/Library/Logs/fancysauce-deploy.log` says identity comes from the sign-in.

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

**Check 6 — usage analytics in the dashboard:**

Start Claude Code on the test Mac and run a few prompts, then run a short Codex session. On the managed-hooks arm the first session fetches the pinned release into `~/.cache/fancysauce/claude-code/` (Codex: `~/.cache/fancysauce/codex/`). Open your fancysauce dashboard and confirm events from both tools are tagged with the user's hashed email (`handle_email`) or OS handle (`handle_os`). Neither tool shows a prompt: the managed hooks need no plugin install and enforced Codex hooks are auto-trusted.

## Key rotation and release upgrades

When the ingest token is rotated:

1. Write the new key to the key file.
2. Rebuild the package with `build-pkg.sh`.
3. Redeploy via the same Jamf policy (or a new policy scoped to all affected machines).

The postinstall runs the LaunchAgent for whoever is logged in, and the LaunchAgent runs at every login, so the new key lands without a re-login on machines with a user at the console. (Rotating the key does not touch the optional identity profile — that artifact only carries the email.)

**Moving the fleet to a newer fancysauce release** is the same loop with a
newer copy of this folder: `claude-code.pin` and `../codex/requirements.toml`
carry the new tag and sha, `build-pkg.sh` stamps the package version from the
pin, redeploy. To pin a release yourself, resolve the tag's peeled commit with
`git ls-remote https://github.com/FancysauceAI/fancysauce-savings.git 'refs/tags/vX.Y.Z^{}'`
and edit the pin line and every `--ref`/`--sha` pair in `requirements.toml`.
The Claude Code wrapper re-reads the pin on every hook event and fetches at the
next `SessionStart`.

**Switching arms** is a rebuild with the other `--cc-mode`: the package's
postinstall removes the previous arm's fragment (plugin) or leaves the plugin
disabled through the fragment (managed-hooks). The wrapper and the pin under
`/etc/fancysauce` are inert once nothing names them.

## Troubleshooting

**No Claude Code usage analytics on the managed-hooks arm, files all present:**
Run `/status` inside Claude Code and read "Setting sources". If a configuration profile is listed, it outranks the fragment and the hooks are ignored — the postinstall will have printed a warning naming the plist in the policy log. Either remove the profile or move the hooks into it. Also confirm `claude --version` is 2.1.83+ (older clients ignore `managed-settings.d/`), that `disableAllHooks` is not set in your own policy, and that `node --version` is 22+ for the user. Everything on this arm is fail-open, so each of these is silent.

**`credentials.json` contains the literal string `$EMAIL` or an empty `user_email` (identity profile deployed):**
The profile is not scoped to this machine, or `$EMAIL` did not resolve. Run Check 2 — if `defaults read` of `ai.fancysauce.identity` returns nothing or `$EMAIL`, the profile isn't applied or Jamf's User and Location inventory has no email for the assigned user. Confirm the machine has an assigned user with an email in Jamf Pro → Inventory → the machine → User and Location, and that the config profile is scoped to it. **Note:** this is *not* fixed by anything in the package — the email comes only from the config profile.

**LaunchAgent not loading / credentials.json not appearing:**
Check the log file:
```sh
cat ~/Library/Logs/fancysauce-deploy.log
```
Common causes: wrong file ownership on the plist (must be root:wheel), wrong mode (must be 0644 — not executable), or the package landed with no user at the console, in which case the file appears at the next login.

**`deploy-credentials.sh` exits 1 — template not found:**
The script can't find the template. Confirm the package installed all files together, and verify the path:
```sh
ls -la "/Library/Application Support/fancysauce/"
```

**Permission denied writing credentials.json:**
The LaunchAgent runs as the user, so it needs write access to `~/.config/`. This is normally guaranteed. If the user's home directory is network-mounted or restricted by another MDM policy, check that the user can write to `~/.config/`.

**Plugin not loading in Claude Code (plugin arm):**
Confirm `managed-settings.json` is at the correct path and is valid JSON (`cat "/Library/Application Support/ClaudeCode/managed-settings.json" | python3 -m json.tool`), and that no `50-fancysauce.json` is left in `managed-settings.d/` (it sets `enabledPlugins` false; the postinstall of a plugin-arm package removes it). Also confirm Claude Code is version 2.1.141 or later for reliable `extraKnownMarketplaces` support. If the org sets `allowManagedHooksOnly`, the plugin's hooks still load because it is force-enabled via `enabledPlugins` in managed settings.

**Policy log says `managed-settings.json carries fancysauce hooks alongside other content`:**
A Mac deployed by hand from a pre-release build of this arm has our hooks in the base file as well as in the fragment, and would run every hook twice. Delete the `hooks` and `enabledPlugins` keys from `managed-settings.json` by hand; the postinstall only deletes that file when it holds nothing but ours.

**No Codex usage analytics in the dashboard:**
Confirm `git` and `node` are on PATH for the user's shell, the wrapper is executable (`ls -l /etc/codex/hooks/fancysauce.sh`), and the cache populated after a session (`ls ~/.cache/fancysauce/codex/`). The wrapper is fail-open — it never surfaces errors in the Codex session, so an empty cache after a session means the fetch failed (network/proxy) or the pinned sha doesn't match the tag. If another MDM payload delivers the profile key `com.openai.codex:requirements_toml_base64`, it **overrides** `/etc/codex/requirements.toml` — fold the fancysauce hooks into that profile instead.
