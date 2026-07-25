# Building the .intunewin package

This document describes how to package the fancysauce-savings credentials deployment as an Intune Win32 app using Microsoft's **IntuneWinAppUtil.exe**.

## What the package contains

The `.intunewin` delivers the per-user credentials mechanism. `managed-settings.json` is deployed separately via a Custom Configuration Profile (see `README.md` Step 3) and is **not** included in this package.

## Prerequisites

- **IntuneWinAppUtil.exe** — download from Microsoft's GitHub release:
  `https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool/releases`
  No installation required; it's a standalone executable.
- Windows machine or VM to run the tool.
- Your edited `credentials.json.tmpl` with `fs_live_t_REPLACE_ME` replaced by the real tenant key.

## Step 1: Assemble the source folder

Create a folder named `fancysauce-mdm/` and copy the following files into it:

```
fancysauce-mdm/
  credentials.json.tmpl   ← with tenant key filled in
  deploy-credentials.ps1
```

`managed-settings.json` is not included here.

## Step 2: Run IntuneWinAppUtil

Open a Command Prompt in the directory that contains `IntuneWinAppUtil.exe` and run:

```cmd
IntuneWinAppUtil.exe -c fancysauce-mdm -s deploy-credentials.ps1 -o dist
```

Flags:
- `-c` — source content folder
- `-s` — setup file (the entry-point script Intune will invoke)
- `-o` — output folder for the resulting `.intunewin` file

The tool produces `dist\deploy-credentials.intunewin`.

## Step 3: Upload to Intune as a Win32 app

1. In the Intune admin center go to **Apps → Windows → Add**.
2. Select **App type: Windows app (Win32)**.
3. Upload `deploy-credentials.intunewin`.
4. Fill in the app details (name, publisher, etc.).
5. Set the **Install command**:
   ```
   powershell.exe -ExecutionPolicy Bypass -File deploy-credentials.ps1
   ```
6. Set the **Uninstall command** (optional — removes the credentials file):
   ```
   powershell.exe -Command "Remove-Item -Path \"$env:APPDATA\fancysauce\credentials.json\" -Force -ErrorAction SilentlyContinue"
   ```
7. Set **Install behavior** to **User** (not System). The script writes to `%APPDATA%`, which requires user context.
8. Configure the **Detection rule** — use a file-existence rule:
   - **Rule type:** File
   - **Path:** `%APPDATA%\fancysauce`
   - **File or folder:** `credentials.json`
   - **Detection method:** File or folder exists

## Step 4: Assign the app

Scope the assignment to your developer Entra group. Assign as **Available** for voluntary install or **Required** for automatic deployment. User-context assignment is required (device-context cannot reach `%APPDATA%`).

## Rebuilding after key rotation

1. Edit `credentials.json.tmpl` with the new tenant key.
2. Re-run IntuneWinAppUtil to produce a new `.intunewin`.
3. Upload the new package in Intune and supersede or replace the existing app.
   Intune re-runs the install on targeted devices at next check-in.
