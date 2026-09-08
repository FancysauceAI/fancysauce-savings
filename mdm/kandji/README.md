# Kandji MDM deployment — fancysauce for Claude Code + Codex

## What this deploys

A single Kandji **Custom Script** library item writes everything fancysauce
telemetry needs on a managed Mac — for both tools:

| Artifact | Path | Scope | Purpose |
|---|---|---|---|
| `50-fancysauce.json` (`CC_MODE="managed-hooks"`, the default) | `/Library/Application Support/ClaudeCode/managed-settings.d/50-fancysauce.json` | System-wide | Wires every Claude Code hook event to the fancysauce wrapper, and disables the plugin so one session is not collected twice. A drop-in fragment — your own `managed-settings.json` is never created or edited. Identical across all tenants — contains no secrets. Needs Claude Code 2.1.83+. |
| `fancysauce.sh` (`managed-hooks` only) | `/etc/fancysauce/hooks/fancysauce.sh` | System-wide | The same wrapper the Codex hooks use, invoked with `--tool claude-code`. Fetches the pinned release into `~/.cache/fancysauce/claude-code/` and runs telemetry from there. |
| `claude-code.pin` (`managed-hooks` only) | `/etc/fancysauce/claude-code.pin` | System-wide | One line, `<tag> <sha>`. Names the plugin release Claude Code telemetry runs. Change it to move the fleet. |
| `managed-settings.json` (`CC_MODE="plugin"`) | `/Library/Application Support/ClaudeCode/managed-settings.json` | System-wide | The alternative arm: registers the fancysauce marketplace and enables the plugin, which the user then installs once. This is what the standalone `managed-settings.json` beside this README carries. |
| `requirements.toml` | `/etc/codex/requirements.toml` | System-wide | Enforces the fancysauce telemetry hook for every Codex lifecycle event. Enforced hooks are **auto-trusted** — no user prompt, telemetry runs zero-step. |
| `fancysauce.sh` | `/etc/codex/hooks/fancysauce.sh` | System-wide | The Codex hook wrapper `requirements.toml` invokes. Fail-open (never breaks a session); fetches the pinned plugin release into `~/.cache/fancysauce/codex/` and runs telemetry from there. |
| `credentials.json` | `~/.config/fancysauce/credentials.json` | Per-user | Carries the tenant API key and the assigned user's email. Read by **both** tools. |

Both Claude Code arms and Codex fetch from the same public GitHub dist repo,
`FancysauceAI/fancysauce-savings`. Nothing is bundled here.

`CC_MODE` at the top of `deploy.sh` picks the Claude Code arm. `managed-hooks`
(the default) is telemetry-only and runs the release named in
`/etc/fancysauce/claude-code.pin`. `plugin` writes the marketplace settings
instead; on that arm managed settings enable the plugin but do not install it, so
the user runs `claude plugin install fancysauce-savings@fancysauce` once. Read
[`../README.md`](../README.md) before choosing — the managed-hooks arm ships no
skills, no slash commands, no statusline and no MCP tools, and it needs Claude
Code 2.1.83+.

The managed-hooks arm deploys its policy as a **drop-in fragment** in
`managed-settings.d/`, so a `managed-settings.json` you maintain for your own
policy is left untouched on every check-in. Order your own fragments around ours
with a numeric prefix: `10-`…`49-` merges before us, `51-`…`99-` overrides us.
[`../README.md`](../README.md#the-drop-in-fragment) has the full merge rules and
the upgrade path for a Mac deployed by an earlier version of this arm.

**History on cutover.** The managed-hooks arm keeps its own data dir, so its
first run would scan the machine's whole Claude Code history and upload it. On a
Mac where the plugin was installed before — it left
`~/.claude/plugins/data/fancysauce-savings*/install.json` — the wrapper skips
that scan: the plugin install already reported the history, and a fleet cutover
would otherwise re-send it from every machine at once. A Mac with no prior plugin
install still uploads its history on first run. Stagger a large first rollout
of never-installed machines across check-in windows.

The standalone `managed-settings.json` in this folder is the **`plugin`**-arm
artifact. Do not deploy it alongside a `managed-hooks` `deploy.sh`: the two
describe different ways of running the same telemetry, and a machine that gets
both collects every session twice.

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
- For Claude Code telemetry: Claude Code **2.1.141+** covers both arms. The
  default `managed-hooks` arm alone needs only **2.1.83+** (the release that added
  `managed-settings.d/`); the `plugin` arm needs 2.1.141+ for reliable
  `extraKnownMarketplaces`. Target the higher one if you may switch arms.
- **No `com.anthropic.claudecode` configuration profile on the fleet.** A profile
  outranks every file this script writes and disables the hooks silently — see
  [`../README.md`](../README.md#a-configuration-profile-outranks-all-of-this).
  `deploy.sh` warns when it finds one, but cannot override it.
- For Codex telemetry: Codex 0.142+ with `git` and `node` on the Mac (standard
  on developer machines). Macs without Codex are fine — the files are inert
  until Codex is installed, then telemetry starts automatically.

## Step 1: Edit the script

Open `deploy.sh` and set the configuration values at the top:

```sh
TENANT_KEY="fs_live_t_REPLACE_ME"   # replace with your tenant key
IDENTITY_TYPE="full"
CODEX_TAG="v0.16.2"                 # pinned plugin release for Codex telemetry
CODEX_SHA="c39a7c77b9d3f962696186f9f5fbd225440b9e19"   # commit sha of CODEX_TAG
CC_MODE="managed-hooks"             # plugin | managed-hooks
CC_TAG="v0.16.2"                    # pinned plugin release for Claude Code telemetry
CC_SHA="c39a7c77b9d3f962696186f9f5fbd225440b9e19"   # commit sha of CC_TAG
CC_SESSION_END_TIMEOUT="5"          # seconds, 2-60; raises the shared SessionEnd budget
```

`CC_MODE` picks the Claude Code arm. `managed-hooks` writes the hooks block, the
wrapper and the pin, and is telemetry-only. `plugin` writes the marketplace
settings and nothing else, and each user then runs `claude plugin install
fancysauce-savings@fancysauce` once. `CC_TAG`/`CC_SHA` are read only in
`managed-hooks` mode. A value of `CC_MODE` that is neither word, or a
`CC_SESSION_END_TIMEOUT` that is not a whole number of seconds between 2 and 60,
stops the script before it writes anything.

`CODEX_TAG`/`CODEX_SHA` and `CC_TAG`/`CC_SHA` pin exactly which fancysauce
release each tool's telemetry runs — the deployed script is your audit record.
The shipped values are current; to pin a different release, resolve the tag's
commit sha:

```sh
git ls-remote https://github.com/FancysauceAI/fancysauce-savings.git 'refs/tags/vX.Y.Z^{}'
```

(Take the sha from the `^{}` line; for an unannotated tag, drop the `^{}`.)

Leave the last line of the script exactly as it is:

```sh
#FS_EMAIL $EMAIL
```

Kandji fills `$EMAIL` at render time, and it does so **textually, everywhere the
token appears, before any shell reads the file** — so an assigned-user address
arrives as source code. No quoting defends against that: double quotes fall to a
quote in the address, and a heredoc falls to a line equal to its own delimiter.

That line therefore sits **after the script's final `exit 0`**, where bash stops
parsing, and the script reads it back out of itself as data. Anything injected
after it is inert text in a region that never runs.

Two rules follow, and a test enforces both on the shipped template:

- the token appears **exactly once** in the whole file, and
- it stays **below the final `exit 0`** — do not move it up, and do not add a
  second copy anywhere, including in a comment or a log message.

If you edit the script before uploading, re-check both yourself; your edited
copy is not covered by our tests.


If your directory has a distinct UPN, give it its own marker rather than
referencing the Kandji variable inline. Add a second line beside the first,
below the final `exit 0`:

```sh
#FS_EMAIL $EMAIL
#FS_UPN $USER_PRINCIPAL_NAME
```

and read it back beside the existing capture near the top:

```sh
USER_UPN="$(/usr/bin/sed -n 's/^#FS_UPN //p' "$FS_SELF" 2>/dev/null | /usr/bin/head -1 || true)"
```

Both markers must stay below `exit 0`. Referencing a Kandji variable anywhere
above it — including in a comment or a log line — is command execution as root
on every managed Mac.

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

The path depends on `CC_MODE`, because the two arms write different files.

- `managed-hooks` (the default) — a drop-in fragment:
  ```sh
  cat "/Library/Application Support/ClaudeCode/managed-settings.d/50-fancysauce.json"
  claude --version   # must be 2.1.83 or later, or the fragment is ignored
  ```
  Expected: a `hooks` block with one entry per lifecycle event, each command
  reading `/etc/fancysauce/hooks/fancysauce.sh <Event> --tool claude-code`, a
  `timeout` on `SessionEnd`, and
  `"enabledPlugins": { "fancysauce-savings@fancysauce": false }`. There is **no**
  `extraKnownMarketplaces` key on this arm.

  Your own `managed-settings.json` — if you keep one — is untouched. If one is
  there and it carries a fancysauce `hooks` block, it is left over from an
  earlier version of this arm: see the upgrade note in
  [`../README.md`](../README.md#upgrading-from-a-deploy-that-overwrote-managed-settingsjson).

- `plugin` — the base file:
  ```sh
  cat "/Library/Application Support/ClaudeCode/managed-settings.json"
  ```
  Expected: the `extraKnownMarketplaces` + `enabledPlugins: true` JSON, and no
  `hooks` block.

**Check 1b — the wrapper and the pin (`managed-hooks` only):**
```sh
ls -l /etc/fancysauce/hooks/fancysauce.sh
cat /etc/fancysauce/claude-code.pin
```
Expected: the wrapper present, root-owned, executable (`-rwxr-xr-x`); the pin one
line of `<tag> <sha>` matching your `CC_TAG`/`CC_SHA`.

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

## Key rotation and release upgrades

1. Update `TENANT_KEY` (rotation), `CODEX_TAG` + `CODEX_SHA` (pin a new release
   for Codex) or `CC_TAG` + `CC_SHA` (pin a new release for Claude Code, on the
   `managed-hooks` arm) in the Custom Script.
2. Save the library item.

The script overwrites its artifacts on the next check-in run, so changes
propagate within one check-in interval — no repackaging.

## Troubleshooting

### `credentials.json` has an empty `user_email`

The run logs exactly one `WARN:` naming the cause. Read that line first — each
cause has a different fix, and the script never prints more than one.

| The run logs | Cause | Fix |
| --- | --- | --- |
| `Kandji has no assigned-user email for this device` | Kandji substituted an empty value. | Confirm the device has an assigned user (Kandji → device → User) and that your directory/SCIM integration populates their email. |
| `Kandji left the assigned-user variable unsubstituted` | Kandji leaves the variable as-is when the device record has no assigned user. | Assign a user to the device record. |
| `the assigned-user email contains characters that cannot be represented safely` | The address holds a byte outside `A-Z a-z 0-9 @ . _ + -`. | Correct the address in your directory, or accept fallback attribution for that person. |
| `the #FS_EMAIL line is missing from this script` | The marker line was deleted, or moved above the final `exit 0`. It sits past the end of the script, so it is easy to mistake for trailing junk when editing or pasting. | Restore it as the last line. |

`$EMAIL` is the *assigned* user, which on a shared Mac may differ from whoever
is logged in.

Surrounding whitespace is **not** a cause: the script strips spaces, tabs, and a
CR from both ends of the marker line before it checks the address, so a padded
value still attributes correctly.

A body saved with **CRLF line endings throughout** is a different failure, and a
total one. Bash stops at `set -eo pipefail` with `set: pipefail: invalid option
name`, and the run writes nothing at all — no managed settings, no Codex hooks,
no credentials. The symptom is a failing exit code with no `fancysauce:` line,
not a warning about the email. Save the script with Unix (LF) line endings.

The charset check is byte-exact and locale-independent, so an apostrophe
(`o'brien@…`) or any non-ASCII character (`josé@…`) is always dropped. In every
row above the install is otherwise healthy — telemetry still flows, but that
machine is attributed by fallback rather than by email.

**No fallback is guaranteed.** When the email hint is dropped, attribution falls
through to the Codex or Claude native login, then `dscl`, then `git config
user.email`. On a Codex fleet authenticated by API key, on a Mac whose local
account carries no `EMailAddress`, and outside a git checkout, every tier is
empty — those sessions reach your tenant carrying no identity at all, and the
person shows **no usage** rather than usage under another name. Treat an empty
`user_email` as attribution lost, not merely degraded.

**Script logs "No console user logged in":**
Expected at the loginwindow. The system-wide files are still written;
credentials are written on the next check-in after a user logs in. This is why
the execution frequency must be recurring, not once.

**Plugin not loading in Claude Code (`CC_MODE="plugin"` only):**
Confirm `managed-settings.json` is valid JSON and Claude Code is 2.1.141+. If
the org sets `allowManagedHooksOnly`, the plugin's hooks still load because it
is force-enabled via `enabledPlugins` in managed settings.

On the default `managed-hooks` arm the plugin is **meant** not to load: that arm
sets `enabledPlugins` to `false` on purpose, because the plugin and the managed
hooks on one Mac collect the same session twice. Do not "fix" it there.

**No Claude Code telemetry in the dashboard (`CC_MODE="managed-hooks"`):**
Confirm, in this order:

1. **No `com.anthropic.claudecode` configuration profile is installed.** Check
   `/Library/Managed Preferences/<user>/com.anthropic.claudecode.plist` and
   `/Library/Managed Preferences/com.anthropic.claudecode.plist`. The managed
   tiers are first-wins, not merged, so a profile holding any key at all supplies
   the whole policy and drops every hook this script writes — the files stay on
   disk and look correct. Run `/status` on the Mac and read "Setting sources" to
   see which tier won. `deploy.sh` prints a `fancysauce:` line when it finds one.
2. `managed-settings.d/50-fancysauce.json` carries the `hooks` block
   (Check 1).
3. Claude Code is **2.1.83 or later** (`claude --version`). Earlier releases have
   no `managed-settings.d/` and ignore the fragment, so the machine loads no
   hooks at all.
4. `disableAllHooks` is not set anywhere. It is a normal enterprise posture and
   it silences managed hooks too — the machine then reports nothing, silently.
5. The wrapper and the pin are present (Check 1b), and the pin holds a `vX.Y.Z`
   tag and a 40-character lowercase sha. A malformed pin reads as absent.
6. The cache populated after a session (`ls ~/.cache/fancysauce/claude-code/`).
   An empty cache means the fetch failed (network/proxy) or the pinned sha does
   not match the tag. A machine that has never held a good pin runs nothing at
   all — there is no floating mode on this arm.
7. `git` and `node` are on PATH for the user's shell.

The wrapper is fail-open, so none of these surface an error in the Claude Code
session.

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
