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
- The plugin itself is pulled from the public GitHub repo `FancysauceAI/fancysauce-savings` on first use; you don't bundle or host any plugin code.
- Because the plugin is **force-enabled via managed settings**, its hooks load even if your managed settings also set `allowManagedHooksOnly`. If you enforce `strictKnownMarketplaces`, add the `fancysauce` marketplace to the allowlist.
- Requires Claude Code **2.1.141+** for reliable `extraKnownMarketplaces`.

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
# 1. Plugin will load:
cat "/Library/Application Support/ClaudeCode/managed-settings.json"

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

## Headless and CI machines (no MDM)

For machines you don't manage with an MDM — CI runners, shared build boxes, a
developer's own headless host — the fancysauce dashboard's **`/headless-install`**
page generates a copy-paste provisioning script that sets up the same
managed-hook path described above. It carries the tenant key as an ambient
`FANCYSAUCE_TENANT_KEY` environment variable, which the first tool run graduates
into the usual `0600` credential file, so the secret never lands in a command
line or a shell history entry. The telemetry mechanism is identical — only the
delivery differs.
