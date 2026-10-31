# Intune MDM deployment — fancysauce-savings plugin

## What this deploys

Two distinct artifacts land on each managed Windows machine:

| Artifact | Path | Scope | Purpose |
|---|---|---|---|
| `managed-settings.json` | `C:\Program Files\ClaudeCode\managed-settings.json` (see [the path note](#managed-settings-path-on-windows)) | System-wide | Registers the fancysauce marketplace and enables the plugin for every Claude Code user on the machine. Identical across all tenants — contains no secrets. Intune deploys the **plugin** arm; the managed-hooks arm described in [`../README.md`](../README.md) is macOS-only today. |
| `credentials.json` | `%APPDATA%\fancysauce\credentials.json` | Per-user | Carries the ingest token and the user's directory email so the plugin can tag usage events. Written at Intune deployment time by a Win32 user-context app. |

The plugin (`fancysauce-savings`) comes from the GitHub dist repo `FancysauceAI/fancysauce-savings`; it is not bundled in this package. Managed settings register the marketplace and enable the plugin, but do not install it — each user runs `claude plugin install fancysauce-savings@fancysauce` once.

> **Codex on Windows: not yet available.** Codex usage analytics use an enforced
> managed hook whose wrapper is POSIX `sh`, so it currently runs on macOS and
> Linux only. When Windows support ships, the managed path will be
> `%ProgramData%\OpenAI\Codex\requirements.toml` plus a PowerShell wrapper. For
> macOS fleets, the [Kandji](../kandji/README.md) and [Jamf](../jamf/README.md)
> guides both deploy Codex usage analytics today. This Intune guide covers Claude Code
> only.

### Managed-settings path on Windows

Claude Code reads managed settings from `C:\Program Files\ClaudeCode\`. It does **not** read `C:\ProgramData\ClaudeCode\`. A file at the `ProgramData` path has no effect. See [the Claude Code managed settings documentation](https://code.claude.com/docs/en/managed-settings).

Claude Code reads two things in that folder:

- `managed-settings.json`
- every `*.json` file in `managed-settings.d\`, merged in alphabetical order

## Plugin arm: `plugin-deploy.ps1`

`plugin-deploy.ps1` is an Intune **platform script**. It deploys the Fancysauce plugin for Claude Code. It needs no Win32 app and no credentials file.

The script writes one file:

`C:\Program Files\ClaudeCode\managed-settings.d\50-fancysauce.json`

The file registers a managed URL marketplace and enables the plugin. Claude Code installs the plugin from that marketplace. The user runs no install command.

This file is a **template**. The fancysauce dashboard replaces the single marker `__FANCYSAUCE_SETTINGS_JSON__` with the settings JSON for your tenant. Do not deploy the template as it is. Copy the rendered script from the dashboard.

### Platform script settings

Create the script in the Intune admin center: **Devices > Scripts and remediations > Platform scripts > Add > Windows 10 and later**. Upload the `.ps1` file. Intune takes an uploaded file and has no paste box.

| Setting | Value | Why |
|---|---|---|
| Run this script using the logged on credentials | **No** | The script must run as SYSTEM to write to `Program Files`. The Intune default is Yes. |
| Enforce script signature check | **No** | The script is not signed. The Intune default is Yes. |
| Run script in 64-bit PowerShell host | **Yes** | Set this value **when you create the script**. If you change it on an existing script, Intune opens the script in the 64-bit host and does not run it. |

Keep the script ASCII only. Intune rejects other characters, and Windows PowerShell 5.1 reads a file without a BOM as ANSI.

Assign the script to a device group. Intune runs a device-assigned script once, and then again for each new user who signs in. It runs the script again only when you change the script or its policy. A device that is only Entra registered, and not joined, does not receive scripts.

### What the script does

- Writes to `$env:ProgramW6432` and reads the `Registry64` view, so the 32-bit PowerShell host still writes to `C:\Program Files\`. It logs a notice when it runs in the 32-bit host.
- Writes UTF-8 with no BOM. Claude Code drops a settings file that has a BOM.
- Does nothing when the file already holds the same content.
- Logs a WARNING when `HKLM\SOFTWARE\Policies\ClaudeCode\Settings` exists. Claude Code uses only the highest managed source that holds any setting. A registry value hides this file.
- Logs a notice when `C:\ProgramData\ClaudeCode\managed-settings.json` exists, because Claude Code does not read that path.
- Logs a notice when Git for Windows is not at `C:\Program Files\Git\bin\bash.exe`. The plugin runs its hooks through Git Bash.
- Always exits 0.

The script prints each message and also appends it to `C:\ProgramData\fancysauce\mdm-deploy.log`. The Intune admin center shows only the script status, so read this log on the device.

### Verify

1. On one PC, read `C:\ProgramData\fancysauce\mdm-deploy.log` for `wrote` and for any WARNING.
2. Check that the file exists at `C:\Program Files\ClaudeCode\managed-settings.d\50-fancysauce.json`.
3. Run `/status` in Claude Code. Confirm that Setting sources names the managed file.

The marketplace URL in the rendered script acts as a credential. Treat the script like a secret. If you rotate the key, replace the script in Intune, because the URL changes.

## Credentials arm: Win32 app

The sections below describe the original arm: a Win32 app that writes a per-user `credentials.json`, and a `managed-settings.json` that registers the public marketplace.

## Prerequisites

- Microsoft Intune with Win32 app deployment rights.
- An ingest token from your fancysauce dashboard. Tokens have the prefix `fs_ingest_`. It is write-only: it can append usage events to your workspace and nothing else.
- Entra ID / Azure AD user attributes for `UserEmail` and `UserPrincipalName` populated and available for Intune variable substitution. These are standard Intune device-configuration variables; they are active by default for user-targeted policies when the device is Entra-joined or hybrid-joined.
- Target machines running Windows 10 1903+ or Windows 11, with Claude Code installed.
- **IntuneWinAppUtil.exe** for packaging (see `intunewin-build.md`).

## Step 1: Replace the ingest token

Open `credentials.json.tmpl` and replace the placeholder with your actual ingest token:

```
"credential": "fs_ingest_REPLACE_ME"
              ^^^^^^^^^^^^^^^^^^^^
              replace with your token, e.g. fs_ingest_abc123xyz
```

Do not commit the key to source control. Store the modified template in a secrets manager and retrieve it during `.intunewin` build.

## Step 2: Build the .intunewin

Follow the packaging instructions in `intunewin-build.md`. At the end of this step you have a `deploy-credentials.intunewin` file ready to upload to Intune.

## Step 3: Deploy managed-settings via Custom Configuration Profile

`managed-settings.json` contains no secrets and is identical for all tenants. Deploy it to the system-wide Windows path using Intune's **Custom Configuration Profile** (or an equivalent file-delivery mechanism such as a separate Win32 system-context app or an OMA-URI profile).

**Target path:** `C:\Program Files\ClaudeCode\managed-settings.json`. Do not use `C:\ProgramData\ClaudeCode\`. Claude Code does not read it.

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
Get-Content "C:\Program Files\ClaudeCode\managed-settings.json"
```
Expected: the JSON from `managed-settings.json` in this template set.

**Check 2 — credentials materialized:**
```powershell
Get-Content "$env:APPDATA\fancysauce\credentials.json"
```
Expected: valid JSON with `credential` set to your ingest token, `identity_hint.user_email` set to the user's Entra email, and `issued_at` showing a recent UTC timestamp.

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

## Ingest token rotation

When the ingest token expires or is rotated:

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
Common causes: app was deployed in device context instead of user context; Intune policy has not yet synced (trigger a manual sync from the Company Portal or Settings → Accounts → Access work or school → Info → Sync); or the `.intunewin` was built without the edited template (credential placeholder still `fs_ingest_REPLACE_ME`).

**PowerShell ExecutionPolicy blocking the script:**
The install command passes `-ExecutionPolicy Bypass` explicitly, which overrides machine policy for this invocation. If a third-party endpoint-security product is blocking PowerShell execution, whitelist the Intune Management Extension process (`IntuneManagementExtension.exe`) or request an exception from your security team.

**Plugin not loading in Claude Code:**
Confirm `managed-settings.json` is at `C:\Program Files\ClaudeCode\` and is valid JSON:
```powershell
Get-Content "C:\Program Files\ClaudeCode\managed-settings.json" | ConvertFrom-Json
```
Also confirm Claude Code is version 2.1.141 or later for reliable `extraKnownMarketplaces` support.
