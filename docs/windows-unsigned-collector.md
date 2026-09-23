# Running the Windows collector while it is unsigned

The `fancysauce-savings` plugin captures usage on Windows with a cross-compiled
Go binary, `bin/windows-amd64/fancysauce.exe`. This document is for a Windows
user or their IT admin whose security tooling is blocking that binary, and
covers how to verify it, how to tell it is being blocked, and the narrowest
way to allow it. It is the bridge until the binary is Authenticode-signed.

`<plugin root>` in the commands below is the plugin's install directory:

- Claude Code: `%USERPROFILE%\.claude\plugins\cache\<alias>\<plugin>\<version>\`
- Codex: `%USERPROFILE%\.codex\plugins\cache\<alias>\<plugin>\<version>\`

Substitute your marketplace alias, plugin name, and installed version for
`<alias>`, `<plugin>`, and `<version>`.

## What it is, and why it is unsigned

Authenticode signing for this binary is planned, via Azure Trusted Signing,
but no certificate is provisioned yet. Until then every release ships this
`.exe` unsigned. Some AppLocker, WDAC, Defender or EDR policies block an
unsigned executable by default, which stops the collector from running —
Claude Code and Codex themselves are unaffected either way.

The plugin marketplace arrives by `git clone`, not a browser download, so the
file carries no mark-of-the-web and Windows SmartScreen does not apply to it.
The policies below are the ones that do.

## Verify the file's integrity

The binary's SHA-256 is published beside it, in `bin/SHA256SUMS`. It changes
with every release, so re-check it after each update rather than trusting a
prior result.

PowerShell:

```powershell
Get-FileHash "<plugin root>\bin\windows-amd64\fancysauce.exe" -Algorithm SHA256
```

Or from Git Bash / cmd.exe:

```
certutil -hashfile "<plugin root>\bin\windows-amd64\fancysauce.exe" SHA256
```

Compare the result, case-insensitively, against the line for
`windows-amd64/fancysauce.exe` in `bin\SHA256SUMS`.

## How to tell the collector is being blocked

- **The plugin's data dir stays empty, with no `collect-error.log` line at
  all.** That's what an AppLocker or WDAC block looks like: the kernel refuses
  the exec before the launcher can write anything, so go straight to the event
  logs below rather than waiting on the log file.
  - Claude Code: `%USERPROFILE%\.claude\plugins\data\<plugin>-<alias>\`
  - Codex: `%USERPROFILE%\.codex\plugins\data\<plugin>-<alias>\`
- **`collect-error.log` names the collector it could not run.** This is the
  launcher's (`bin/fancysauce`) own line, and it means the binary is missing or
  was quarantined by Defender — not that a kernel policy blocked it. An
  AppLocker/WDAC denial leaves this file exactly as it was.
- **AppLocker** — Event Viewer, under `Applications and Services Logs >
  Microsoft > Windows > AppLocker > EXE and DLL`. Look for event ID 8003
  (would have been blocked, audit mode) or 8004 (blocked).
- **Windows Defender Application Control (WDAC)** — Event Viewer, under
  `Applications and Services Logs > Microsoft > Windows > CodeIntegrity >
  Operational`. Look for event ID 3076 (would have been blocked, audit mode)
  or 3077 (blocked).
- **Microsoft Defender Antivirus** — `Windows Security > Virus & threat
  protection > Protection history` for a quarantine or block entry naming
  `fancysauce.exe`.
- **Third-party EDR** — check its console for a block or quarantine event
  against the same file path or hash.

## Allowing it: narrowest route first

The hash changes every release, so a hash-based rule is per version — plan to
update it when you update the plugin. Every tree also ships a byte-identical
root copy at `bin\fancysauce.exe`, alongside `bin\windows-amd64\fancysauce.exe`;
a hash rule covers both from the one hash, but a path-scoped exclusion or path
rule needs an entry for each.

1. **AppLocker: file-hash rule.** A publisher rule cannot apply to
   `fancysauce.exe` — it is unsigned, so it has no publisher to key off. Add a
   **file hash** rule instead, built from the `bin\SHA256SUMS` value above. A
   **path** rule under the user's profile is weaker (anything placed at that
   path runs) — if you use one, scope it to the exact file path, not a
   wildcard directory.
2. **WDAC: file-hash or file-path rule.** Build a supplemental policy with the
   WDAC Wizard, or add a file-hash or file-path rule to your existing base
   policy. Same per-version caveat as AppLocker's hash rule.
3. **Defender: exclusion for the exact `.exe` path.** Add a Defender exclusion
   for `<plugin root>\bin\windows-amd64\fancysauce.exe`, or, if it was already
   quarantined, restore and allow it from `Protection history`.
4. **EDR: allow-list by SHA-256.** Add the hash from `bin\SHA256SUMS` to your
   EDR console's allow-list.
5. **Locked-down fleets: deploy under a fixed path by MDM.** If your policy
   trusts binaries by path rather than by hash, have your MDM place the
   plugin's `bin/` tree at a fixed location (for example, under
   `Program Files`) so a path rule can trust it. This repo's
   [managed-hooks arm](../mdm/README.md#claude-code-without-the-plugin--managed-hooks)
   does not do this for you: it pins a release version and its sha
   fleet-wide, not a filesystem location, and still resolves into a per-user
   cache even on the macOS fleets it supports today. A fixed-path Windows
   deployment is something you build yourself with your MDM's file-delivery
   primitive.

## Verify it runs

From Git Bash:

```
bash "<plugin root>/bin/fancysauce" version
```

Expect a line starting `fancysauce go collector`. Then start a Claude Code or
Codex session and confirm `<data dir>\state\health.json` gains a
`last_hook_at` value.

## Roll back

If you'd rather remove the plugin than allow the binary:

```
/plugin uninstall fancysauce-savings@fancysauce
```

Codex:

```
codex plugin remove fancysauce-savings@fancysauce
```
