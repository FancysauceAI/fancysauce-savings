# Intune MDM deployment — fancysauce-savings plugin

## What this deploys

Two distinct artifacts land on each managed Windows machine:

| Artifact | Path | Scope | Purpose |
|---|---|---|---|
| `managed-settings.json` | System-wide ClaudeCode path (see V2 note below) | System-wide | Registers the fancysauce marketplace and enables the plugin for every Claude Code user on the machine. Identical across all tenants — contains no secrets. |
| `credentials.json` | `%APPDATA%\fancysauce\credentials.json` | Per-user | Carries the tenant API key and the user's directory email so the plugin can tag usage events. Written at Intune deployment time by a Win32 user-context app. |

The plugin (`fancysauce-savings`) is fetched from the public GitHub dist repo `FancysauceAI/fancysauce-savings` on first use; it is not bundled in this package.

> **Codex on Windows: not yet available.** Codex telemetry uses an enforced
> managed hook whose wrapper is POSIX `sh`, so it currently runs on macOS and
> Linux only. When Windows support ships, the managed path will be
> `%ProgramData%\OpenAI\Codex\requirements.toml` plus a PowerShell wrapper. For
> macOS fleets, the [Kandji](../kandji/README.md) and [Jamf](../jamf/README.md)
> guides both deploy Codex telemetry today. This Intune guide covers Claude Code
> only.

### V2 verification gap — Windows managed-settings path

There is ambiguity about the exact system-wide path Claude Code reads on Windows. The two candidates are:

- `C:\Program Files\ClaudeCode\managed-settings.json`
- `C:\ProgramData\ClaudeCode\managed-settings.json`

**Verify this with your installed Claude Code version before deploying at scale.** Run `claude --version` and check the Claude Code release notes or documentation for the `managed-settings.json` location on Windows. `C:\ProgramData\ClaudeCode\` is the more conventional choice for per-machine data that must be writable by MDM tooling without requiring `Program Files` elevation, but the authoritative path depends on the CC build you are running.

## Prerequisites

- Microsoft Intune with Win32 app deployment rights.
- A tenant API key from your fancysauce dashboard. Keys have the prefix `fs_live_t_`.
- Entra ID / Azure AD user attributes for `UserEmail` and `UserPrincipalName` populated and available for Intune variable substitution. These are standard Intune device-configuration variables; they are active by default for user-targeted policies when the device is Entra-joined or hybrid-joined.
- Target machines running Windows 10 1903+ or Windows 11, with Claude Code installed.
- **IntuneWinAppUtil.exe** for packaging (see `intunewin-build.md`).

## Step 1: Replace the tenant key

Open `credentials.json.tmpl` and replace the placeholder with your actual tenant API key:

```
"credential": "fs_live_t_REPLACE_ME"
              ^^^^^^^^^^^^^^^^^^^^
              replace with your key, e.g. fs_live_t_abc123xyz
```

Do not commit the key to source control. Store the modified template in a secrets manager and retrieve it during `.intunewin` build.

## Step 2: Build the .intunewin

Follow the packaging instructions in `intunewin-build.md`. At the end of this step you have a `deploy-credentials.intunewin` file ready to upload to Intune.

## Step 3: Deploy managed-settings via Custom Configuration Profile

`managed-settings.json` contains no secrets and is identical for all tenants. Deploy it to the system-wide Windows path using Intune's **Custom Configuration Profile** (or an equivalent file-delivery mechanism such as a separate Win32 system-context app or an OMA-URI profile).

**Target path** — see V2 verification gap above. Use whichever of the following your CC version reads:
- `C:\ProgramData\ClaudeCode\managed-settings.json` (most likely)
- `C:\Program Files\ClaudeCode\managed-settings.json`

Deploy this as **device-targeted** (not user-targeted) so the file lands before any user logs in. All users on the machine will share this configuration.

## Step 4: Deploy the .intunewin Win32 app

1. In the Intune admin center go to **Apps → Windows → Add**.
2. Select **App type: Windows app (Win32)**.
3. Upload the `.intunewin` produced in Step 2.
4. Set **Install command:**
   ```
   powershell.exe -ExecutionPolicy Bypass -File deploy-credentials.ps1
   ```
5. Set **Install behavior** to **User** — not System. The script writes to `%APPDATA%`, which is only accessible in user context.
6. Set the **Detection rule** — file exists:
   - Path: `%APPDATA%\fancysauce`
   - File: `credentials.json`
7. Scope the assignment to your Claude Code developer Entra group, assigned as **Required** for automatic deployment (or **Available** for voluntary install).

## Step 5: Verify on a target machine

After a test deployment, run the following checks.

**Check 1 — managed-settings installed:**
```powershell
Get-Content "C:\ProgramData\ClaudeCode\managed-settings.json"
# (adjust path per your V2 verification)
```
Expected: the JSON from `managed-settings.json` in this template set.

**Check 2 — credentials materialized:**
```powershell
Get-Content "$env:APPDATA\fancysauce\credentials.json"
```
Expected: valid JSON with `credential` set to your tenant key, `identity_hint.user_email` set to the user's Entra email, and `issued_at` showing a recent UTC timestamp.

**Check 3 — file ACL restricted to current user:**
```powershell
(Get-Acl "$env:APPDATA\fancysauce\credentials.json").Access | Select IdentityReference, FileSystemRights
```
Expected: a single entry for the current user with `FullControl`; no `Everyone` or `BUILTIN\Users` entries.

**Check 4 — deployment log:**
```powershell
Get-Content "$env:LOCALAPPDATA\fancysauce\deploy.log"
```
Expected: log lines ending with `deploy-credentials.ps1 completed successfully`.

**Check 5 — plugin activity in the dashboard:**
Start Claude Code on the test machine and run a few prompts. Open your fancysauce dashboard and confirm events are tagged with the user's hashed email (`handle_email`) or OS handle (`handle_os`).

## Key rotation

When the tenant API key expires or is rotated:

1. Update `credentials.json.tmpl` with the new key.
2. Rebuild the `.intunewin` (see `intunewin-build.md`).
3. Upload the new package and supersede the existing app in Intune.

Intune re-runs the install on targeted devices at the next check-in, overwriting `credentials.json` with the new key.

## Troubleshooting

**`{{UserEmail}}` not substituted — credentials.json contains the literal placeholder:**
Intune variable substitution is only active for user-targeted policies on Entra-joined or hybrid-joined devices. Confirm the device is enrolled and the app assignment is user-targeted (not device-targeted). Also verify the user's `UserPrincipalName` and `UserEmail` attributes are populated in Entra ID.

**credentials.json not appearing after deployment:**
Check the deployment log:
```powershell
Get-Content "$env:LOCALAPPDATA\fancysauce\deploy.log"
```
Common causes: app was deployed in device context instead of user context; Intune policy has not yet synced (trigger a manual sync from the Company Portal or Settings → Accounts → Access work or school → Info → Sync); or the `.intunewin` was built without the edited template (credential placeholder still `fs_live_t_REPLACE_ME`).

**PowerShell ExecutionPolicy blocking the script:**
The install command passes `-ExecutionPolicy Bypass` explicitly, which overrides machine policy for this invocation. If a third-party endpoint-security product is blocking PowerShell execution, whitelist the Intune Management Extension process (`IntuneManagementExtension.exe`) or request an exception from your security team.

**Plugin not loading in Claude Code:**
Confirm `managed-settings.json` is at the correct system-wide path and is valid JSON:
```powershell
Get-Content "C:\ProgramData\ClaudeCode\managed-settings.json" | ConvertFrom-Json
```
Also confirm Claude Code is version 2.1.141 or later for reliable `extraKnownMarketplaces` support.
