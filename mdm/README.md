# Deploying fancysauce-savings via MDM

This guide is for IT/MDM administrators rolling out fancysauce telemetry to a
managed fleet — the `fancysauce-savings` plugin for Claude Code, and the
managed-hook path for OpenAI Codex. It works with **any** MDM. Product-specific
walkthroughs live in subfolders:

- **Jamf Pro** → [`jamf/README.md`](jamf/README.md) — Claude Code + Codex
- **Kandji** → [`kandji/README.md`](kandji/README.md) — Claude Code + Codex
- **Microsoft Intune (Windows)** → [`intune/README.md`](intune/README.md) — Claude Code only ([why](intune/README.md))

If you run a different MDM (Mosyle, Addigy, Workspace ONE, …), the contract below
is everything you need — adapt it to your tool's file-deployment and
variable-substitution primitives.

## The two things every deployment must do

There are two ways to deliver Claude Code telemetry. The **plugin arm** below is
the original one. The **managed-hooks arm** ([below](#claude-code-without-the-plugin--managed-hooks))
needs no plugin install at all and runs a release you pin. Pick one per fleet —
running both on one Mac collects every session twice.

### 1. Make Claude Code load the plugin — managed settings

Write this file system-wide. On macOS:
`/Library/Application Support/ClaudeCode/managed-settings.json`

```json
{
  "extraKnownMarketplaces": {
    "fancysauce": {
      "source": { "source": "github", "repo": "FancysauceAI/fancysauce-savings" }
    }
  },
  "enabledPlugins": { "fancysauce-savings@fancysauce": true }
}
```

- It contains **no secrets** and is **identical for every tenant and user** — deploy it device-wide.
- Managed settings **register** the marketplace and **enable** the plugin; they do not install it. As of Claude Code v2.1.195 the documentation states that adding a marketplace does not install a plugin that comes from an external source, and it names no exception for managed settings. On this arm the user still runs `claude plugin install fancysauce-savings@fancysauce` (or `/plugin install fancysauce-savings@fancysauce`) once. For an install-free route, use the [managed-hooks arm](#claude-code-without-the-plugin--managed-hooks).
- You don't bundle or host any plugin code either way: the plugin comes from the public GitHub repo `FancysauceAI/fancysauce-savings`.
- Because the plugin is **force-enabled via managed settings**, its hooks load even if your managed settings also set `allowManagedHooksOnly`. If you enforce `strictKnownMarketplaces`, add the `fancysauce` marketplace to the allowlist.
- Requires Claude Code **2.1.141+** for reliable `extraKnownMarketplaces`.
- The plugin registers its hooks in **exec form** (`"command": "node"` plus an
  `args` array), which is what keeps a Windows plugin path from reaching a shell
  that would mangle its backslashes. Exec form is verified on 2.1.236–2.1.238 and
  the hooks documentation states no minimum version for it, but we have not
  established the floor. A client too old to read `args` would run bare `node`
  and fail on every event. If any machine in your fleet runs a Claude Code older
  than the 2.1.141 floor above, confirm telemetry on one of them first.

### 2. Give each user a credential — the credentials file

Write a per-user JSON file. macOS path (either is read; the system path wins if both exist):

- **Per-user (recommended):** `~/.config/fancysauce/credentials.json`
- **System-wide:** `/etc/fancysauce/credentials.json` *(see the ownership caveat below)*

```json
{
  "schema_version": 1,
  "issued_at": "2026-06-30T12:00:00.000Z",
  "credential": "fs_live_t_<your-tenant-key>",
  "identity_hint": {
    "source": "mdm_file",
    "user_email": "<the-user's-email>",
    "user_upn": "<the-user's-upn-or-email>"
  },
  "identity_type": "full"
}
```

| Field | Required | Notes |
|---|---|---|
| `schema_version` | yes | Always `1`. |
| `issued_at` | yes | ISO 8601 UTC string. Stamp it when you write the file. |
| `credential` | yes | Your org-wide tenant key (`fs_live_t_…`) from the fancysauce dashboard. The **same key for all users** — per-user identity comes from `identity_hint`, not from distinct keys. |
| `identity_hint.source` | yes | Always `"mdm_file"` for MDM deployments. |
| `identity_hint.user_email` | recommended | The user's email. This is what the plugin uses to attribute usage. Substitute your MDM's per-user email variable here. |
| `identity_hint.user_upn` | optional | Set if your directory has a UPN distinct from email. |
| `endpoint` | optional | Only set if fancysauce gave you a dedicated ingest endpoint. Omit otherwise. |
| `api_endpoint` | optional | Only set if fancysauce gave you a dedicated API host. Omit otherwise. Ingest and the API run on separate hosts, so this is a separate field — do not put the ingest host here. Must be `https`. It routes two things: the login identity the statusline shows, and the MCP tools. The statusline honours it in either file. The MCP tools need a user-bound credential, so they stay switched off until the user runs `/fancysauce-savings:login`; that login keeps this field. A system-path credential blocks that login, so write `api_endpoint` to the **per-user** file if you need MCP. |

## Node.js is a fleet prerequisite

Both arms run the collector as a Node script on every hook event, so **Node.js 22
or later must be on `PATH`** for the user running Claude Code. Claude Code's own
installers don't require Node, so a managed fleet can be entirely Node-free with
every developer running Claude Code happily — and collecting nothing. Add
`node --version` to your MDM's detection or inventory rules before you roll out,
and treat a machine without it as unprovisioned rather than as a telemetry bug.

## Hard requirements (the plugin enforces these)

1. **Mode must be `0600`** (or stricter). The plugin **rejects** a credentials file that is readable by group or other, and surfaces a one-line "malformed credential" nudge to the user.
2. **The file must be readable by the user running Claude Code.** The plugin reads it as that user — it does **not** run as root. With `0600`, that means the file must be **owned by the user**.
   - This is why the per-user path (`~/.config/...`, naturally user-owned) is recommended.
   - If you use the system path `/etc/fancysauce/credentials.json`, you must `chown` it to the target user. At `0600` that file is readable by exactly one user, so the system path only works on **single-user Macs** — on shared Macs, use the per-user path and write one file per user.
3. **`user_email` must be the real email, not a literal variable token.** The single most common deployment bug is shipping the literal string `$EMAIL` / `{{UserEmail}}` because the MDM didn't substitute it where you put it (see below).

## The substitution gotcha (read before you build)

MDMs substitute per-user variables (`$EMAIL`, `{{UserEmail}}`, …) in **specific places only** — and "inside a file dropped by a package" or "inside a script body" is often **not** one of them.

- **Jamf Pro:** substitutes `$EMAIL` **only inside configuration-profile payloads** — never inside package files or scripts. The Jamf template therefore delivers the email via a configuration profile (managed-preferences domain `ai.fancysauce.identity`) and a login script reads it back. See [`jamf/README.md`](jamf/README.md).
- **Kandji:** substitutes `$EMAIL` **directly in a Custom Script body** (bash, not zsh), so a single root script writes the file with the email inlined. See [`kandji/README.md`](kandji/README.md).
- **Intune (Windows):** substitutes `{{UserEmail}}` / `{{UserPrincipalName}}` for **user-targeted** policies on Entra-joined devices. See [`intune/README.md`](intune/README.md).

**Always verify on one test device that `user_email` in the written file is a real address before rolling out.** A deployment that "succeeds" but writes `$EMAIL` produces garbage identity for every user, silently.

## Verifying a deployment

On a target device, as the logged-in user:

```sh
# 1a. Plugin arm — the plugin will load:
cat "/Library/Application Support/ClaudeCode/managed-settings.json"

# 1b. Managed-hooks arm — the fragment is in place, and Claude Code is new enough
#     to read the drop-in directory at all (2.1.83+):
cat "/Library/Application Support/ClaudeCode/managed-settings.d/50-fancysauce.json"
claude --version

# 2. Credential is present, with a real email and 0600 perms owned by the user:
cat ~/.config/fancysauce/credentials.json
stat -f "%A %Su %N" ~/.config/fancysauce/credentials.json   # expect: 600 <user> ...

# 3. End to end: run Claude Code, then confirm events in the fancysauce dashboard
#    are tagged with the user's hashed email (handle_email) or OS handle (handle_os).
```

## Key rotation

The tenant key is long-lived. To rotate, update the key in your MDM artifact
(package template, config profile, or script) and let the MDM re-run the
deployment — each tool's README covers the exact step. Revocation is server-side;
a revoked key simply stops being accepted at ingest.

## Deploying to OpenAI Codex

Codex telemetry uses an **enforced hook** instead of a plugin. Enforced hooks are
auto-trusted — they run zero-step with no user prompt. Three things to deploy
(MDM-agnostic — adapt file delivery to your tool):

> **Kandji and Jamf admins:** skip the manual steps below — the
> [Kandji](kandji/README.md) single Custom Script and the
> [Jamf](jamf/README.md) Composer package each deploy the Codex artifacts
> alongside the Claude Code ones. Codex on Windows is not yet supported (the
> wrapper is POSIX `sh`); see [`intune/README.md`](intune/README.md).

### 1. Deploy `requirements.toml`

Write `codex/requirements.toml` to **one** of:
- macOS MDM key `com.openai.codex:requirements_toml_base64` (base64 of the file)
- `/etc/codex/requirements.toml` (macOS/Linux)
- `%ProgramData%\OpenAI\Codex\requirements.toml` (Windows)

Codex *composes* every requirements layer that is present — a higher-precedence
layer does not simply win. A scalar that two layers set to **different** values is
a hard startup failure (`failed to compose requirements field …`), and Codex will
not start at all until one side gives way. Our template therefore sets no scalar
that another tool is likely to also set; see `hooks.managed_dir` below.

It sets `[features] hooks = true` and wires every Codex lifecycle event to the
wrapper. Choose **pinned** (`--ref <tag> --sha <sha>`, deterministic and audited —
recommended) or **floating** (`--ref latest`, auto-updates each session). The
deployed file is your audit record. **Do not** set `allow_managed_hooks_only`
unless you intend to suppress *all* other Codex plugin hooks fleet-wide.

### 2. Deliver the wrapper to `managed_dir`

Deliver `codex/fancysauce.sh` (root-owned) to the `managed_dir` in your
`requirements.toml` (default `/etc/codex/hooks`). Codex enforces the hook config
but does **not** distribute scripts — deliver this one via your MDM. It requires
`git`, `node`, and `perl` (present on typical dev machines). It is fail-open: it
never breaks a Codex session, git-fetches the pinned/floating code from the public
`FancysauceAI/fancysauce-savings` repo into `~/.cache/fancysauce/codex/`, and runs
telemetry from there. No plugin is installed; nothing is written to Codex config.

In pinned mode the cached checkout is verified against your `--sha` on **every** event,
not just when it is first fetched, so a cache directory that is not that exact commit is
re-fetched or ignored rather than executed. The cache is per-user under `$HOME`; if `HOME`
is unset (some service and cron contexts) the wrapper exits without doing anything rather
than fall back to a shared writable path. `SessionStart` bounds all of its network work
with a single deadline (`FANCYSAUCE_CODEX_BUDGET`, default 45s; per-call
`FANCYSAUCE_CODEX_TIMEOUT`, default 20s).

### 3. Give each user a credential

Same `credentials.json` as Claude Code (see the credential section above) — it is
tool-agnostic. Codex reads it via the same precedence (system file → user file →
`FANCYSAUCE_API_KEY`). Without it, telemetry is captured locally and uploads once
the credential is present.

## Claude Code without the plugin — managed hooks

This arm gives Claude Code the version control the Codex arm already has. Managed
settings deliver a `hooks` block directly, and every hook event runs:

```
/etc/fancysauce/hooks/fancysauce.sh <Event> --tool claude-code
```

That block arrives as a **drop-in policy fragment**, not as your
`managed-settings.json`. See [the drop-in fragment](#the-drop-in-fragment) below.

That is the same wrapper the Codex arm uses. It verifies the checkout's `HEAD`
against the sha in `/etc/fancysauce/claude-code.pin` on **every** event, and
fetches a new release only at `SessionStart`. A pin change therefore takes effect
at the next check-in plus the next session start. A session already running keeps
the release it started with only until some session on that Mac fetches the new
one; from then on its next hook event runs the new release. No plugin is
installed, and you move the whole fleet by changing one pin.

The Kandji Custom Script deploys this arm. Set `CC_MODE="managed-hooks"` (the
default) at the top of `kandji/deploy.sh`; `CC_MODE="plugin"` writes the
marketplace settings above instead. See [`kandji/README.md`](kandji/README.md).

Read all of the following before you choose this arm.

- **It is telemetry-only.** No skills, no slash commands, no statusline, no MCP
  tools. Those come from the plugin. A fleet that wants them stays on the plugin
  arm.
- **It never touches your `managed-settings.json`.** The arm writes one drop-in
  fragment beside it. Keep your own managed settings exactly as they are — see
  [the drop-in fragment](#the-drop-in-fragment) for ordering and overrides.
- **It needs Claude Code 2.1.83 or later.** That release added the
  `managed-settings.d/` directory. An older client ignores the fragment
  entirely, so the machine loads no hooks and collects nothing — silently, like
  every other failure on this fail-open arm. Check `claude --version` across the
  fleet before you roll out.
- **`disableAllHooks` silences it.** That setting is a normal enterprise posture
  and it suppresses managed hooks too. A fleet that sets it gets silence, not
  telemetry, and nothing reports an error — the wrapper is fail-open by design.
- **`enabledPlugins: { "fancysauce-savings@fancysauce": false }` is deliberate.**
  The plugin and these hooks on one Mac collect the same session twice under two
  install ids, which doubles every count and every dollar figure. Do not remove it.
  This arm drops `extraKnownMarketplaces`, so the entry names a plugin from a
  marketplace the file no longer registers. **Verify on one Mac before you roll
  out** that the `hooks` block still loads with that entry present: if Claude Code
  rejects the whole file over the dangling reference, the hooks go with it and the
  machine collects nothing, silently. Fallbacks, in order: keep
  `extraKnownMarketplaces` beside `enabledPlugins: false`, or drop the
  `enabledPlugins` key and rely on uninstalling the plugin.
- **Set the Kandji execution frequency to "run on every check-in."** The pin, the
  deferred credential write, and any rollback all ride on that.
- **Keep the `SessionEnd` timeout.** The block sets a `timeout` on `SessionEnd`
  (5 seconds by default, from `CC_SESSION_END_TIMEOUT`), because `SessionEnd`
  hooks share a 1.5-second budget that the collector's end-of-session flush
  overruns. Claude Code raises the shared budget to match the
  longest per-hook timeout. Remove the field and the flush is cancelled.

### The drop-in fragment

The arm writes exactly one file for Claude Code policy, mode `0644`:

```
/Library/Application Support/ClaudeCode/managed-settings.d/50-fancysauce.json
```

It carries the `hooks` block and the `enabledPlugins` key, and nothing else. It
**never** creates or edits
`/Library/Application Support/ClaudeCode/managed-settings.json`. If you maintain
managed settings for your own policy, leave that file exactly as it is; nothing
in this arm rewrites it.

Claude Code merges the two: `managed-settings.json` first as the base, then every
`*.json` in `managed-settings.d/` in alphabetical order on top. Scalars from a
later file win, arrays are concatenated and de-duplicated, and objects are
deep-merged. Two keys are exceptions — a later `fallbackModel` chain replaces an
earlier one rather than merging, and a later `extraKnownMarketplaces` entry
replaces an earlier entry of the same name whole. Files whose names begin with
`.` are ignored.

**The `50-` prefix is the ordering contract.** Numeric prefixes are how you
control merge order, and 50 leaves room on both sides on purpose:

| You want | Name your file | Result |
| --- | --- | --- |
| Your policy applied before ours | `10-`…`49-` | Ours merges on top; ours wins on any key you both set. |
| Your policy to override ours | `51-`…`99-` | Yours merges last and wins. |

To override one of our keys, add your own fragment with a higher prefix rather
than editing ours — the arm rewrites `50-fancysauce.json` on every
check-in, so any edit to it is lost at the next one.

**Two things to verify on one Mac before you roll out at scale:**

1. **Claude Code must be 2.1.83 or later.** That release added
   `managed-settings.d/`. Older clients ignore the directory, load no hooks, and
   collect nothing without reporting an error. This arm needs nothing newer — it
   does not use `extraKnownMarketplaces`, which is what the plugin arm's 2.1.141
   floor is about. A fleet that may switch between the two arms should target
   **2.1.141+**, the higher of the two.
2. **We have not proven the fragment loads when `managed-settings.json` does not
   exist at all.** The Claude Code documentation describes that file as the merge
   base but does not say what happens when it is absent, and we could not
   establish it from the docs. On a Mac with no managed settings of your own,
   confirm telemetry arrives before rolling out. If it turns out a base file is
   required, an empty `{}` at that path is enough.

#### A configuration profile outranks all of this

**Read this before you deploy.** macOS has a second managed-settings channel that
this arm cannot override, and it fails silently.

A configuration profile for `com.anthropic.claudecode` lands at one of:

```
/Library/Managed Preferences/<console user>/com.anthropic.claudecode.plist   # per-user, wins
/Library/Managed Preferences/com.anthropic.claudecode.plist                  # device-level
```

Its top-level keys **are** settings keys. The managed tiers are **first-wins, not
merged**: the effective policy comes from the first tier that carries settings —
remote, then the plist, then the files this script writes — and every lower tier
is dropped **whole**. Only `env` unions across tiers (Claude Code 2.1.223+), plus
a few `allowManaged*Only` booleans.

So a profile carrying one unrelated key disables every hook this arm installs.
Measured on Claude Code 2.1.235, checking which `SessionStart` hook actually ran:

| On disk | Hooks that fired |
| --- | --- |
| `managed-settings.json` only | base |
| + a `managed-settings.d/` fragment | base **and** fragment — the drop-in merge is additive |
| + a plist holding only `cleanupPeriodDays: 30` | **none** |
| + that plist carrying its own hook | the plist's hook only |

Row 3 is the trap: `cleanupPeriodDays` is ordinary retention hygiene, it says
nothing about hooks, and it silently deleted all 15 of ours. Our files stayed on
disk and correct, and the Kandji run reported success.

`deploy.sh` checks both paths on every run and prints a warning naming the file
when either exists. It does not refuse to deploy — nothing on the machine can
override a profile, so the choice is yours.

Two things soften it:

- An **empty or schema-invalid** plist falls through to the file tier. Presence
  alone is not proof the hooks are lost.
- **`/status` → "Setting sources"** reports which tier actually won. That is the
  check to run on the Mac.

If your fleet needs a `com.anthropic.claudecode` profile, the hooks must move
into the profile itself; they cannot live beside it.

#### Switching a Mac back to the plugin arm

Setting `CC_MODE="plugin"` **removes the fragment for you**. That matters
because the fragment is not inert: it sets `enabledPlugins` to `false`, which
would suppress the very plugin the `plugin` arm enables. The arm deletes both
the current name and the pre-release `50-fancysauce-telemetry.json`, so a
switch is self-healing on every machine and no manual step is needed.

Only these two filenames are touched. They are ours by the `50-` naming
contract, so nothing a tenant put in `managed-settings.d/` is at risk.

The wrapper at `/etc/fancysauce/hooks/fancysauce.sh` and the pin beside it are
inert once nothing names them, and `deploy.sh` leaves them alone on purpose —
`/etc/fancysauce` is also the system credential root.

#### Upgrading from a pre-release deploy

No released version of this template ever wrote hooks into
`managed-settings.json`; only Macs deployed by hand from a pre-release build of
this arm are affected. On such a Mac the base file and the fragment would both
carry the hooks, so `deploy.sh` cleans up what it safely can:

- If `managed-settings.json` is **byte-identical** to the fragment, the script
  deletes it. Nothing of yours can be in it.
- If it holds anything else, the script **leaves it alone** and prints a line
  naming it. Delete our `hooks` and `enabledPlugins` keys from it by hand; until
  you do, the machine runs every hook twice.
- If it never carried our hooks, the script ignores it and says nothing.

**Byte-identity is a deliberately narrow test, not an exhaustive one.** The old
file's contents depend on `CC_SESSION_END_TIMEOUT` and on the event list, so a
check-in that changes either alongside the upgrade will not match, and you get
the manual notice instead of the automatic delete. That is the safe direction:
the script has no dependable JSON parser, and a pattern-matched edit of your
policy file is a worse failure than the duplicate it would prevent.

A pre-release build also named the fragment `50-fancysauce-telemetry.json`. The
script deletes that file outright — the name is exclusively ours.

### The pin file

`/etc/fancysauce/claude-code.pin` is one line, root-owned, mode `0644`:

```
v0.16.1 8b80f00c8292dabd0ee1816c9e20185877acef7c
```

Resolve the sha for a tag with:

```sh
git ls-remote https://github.com/FancysauceAI/fancysauce-savings.git 'refs/tags/v0.16.1^{}'
```

The wrapper validates both fields on every read (`vX.Y.Z` tag, 40 hex sha). A
missing **or** malformed pin means the same thing: fetch nothing, run the newest
cache directory that still verifies, exit 0. That is the safe degradation, not an
error the user sees — the machine stays on its last good release until the next
check-in fixes the pin. A machine that has never held a good pin verifies nothing,
so it collects nothing rather than running an unverified cache directory. There is
no floating mode here: without a sha to check the checkout against, running
whatever sits in the cache would give up the guarantee this arm exists to add.
Such a machine is silent, not wrong, and one good pin fixes it.

**The wrapper's release selection is not tamper-proof against the local user.**
The hook runs as the logged-in user, and the cache and data roots live in that
user's home, so a user with a shell on the Mac can replace what runs there. The
root-owned pin is an integrity anchor against a stale or swapped *cache*, not a
control that survives the machine's own user. Treat the deployed pin as your
audit record of what the fleet is *meant* to run.

### Known limitation: a `$HOME` with a space or a `#`

On a Mac whose home directory path contains a space or a `#`, the collector does
not run and nothing is collected, silently. It is a defect in the collector's own
entry-point guard, not a deployment mistake, and it has its own ticket. No MDM
configuration works around it.

## Headless and CI machines (no MDM)

For machines you don't manage with an MDM — CI runners, shared build boxes, a
developer's own headless host — the fancysauce dashboard's **`/headless-install`**
page generates a copy-paste provisioning script that sets up the same
managed-hook path described above. It carries the tenant key as an ambient
`FANCYSAUCE_TENANT_KEY` environment variable, which the first tool run graduates
into the usual `0600` credential file, so the secret never lands in a command
line or a shell history entry. The telemetry mechanism is identical — only the
delivery differs.
