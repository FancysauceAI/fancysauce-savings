# fancysauce - Intune platform script: the Fancysauce plugin for Claude Code (Windows).
# Settings: Run this script using the logged on credentials = No. Run script in 64-bit PowerShell host = Yes.
$ErrorActionPreference = 'Stop'
# The 32-bit host maps $env:ProgramFiles to "Program Files (x86)" and HKLM\SOFTWARE to WOW6432Node.
# ProgramW6432 and the Registry64 view are correct in either host.
$programFiles = if ($env:ProgramW6432) { $env:ProgramW6432 } else { $env:ProgramFiles }
$dropinDir = Join-Path $programFiles 'ClaudeCode\managed-settings.d'
$dest = Join-Path $dropinDir '50-fancysauce.json'
$logDir = Join-Path $env:ProgramData 'fancysauce'
function Write-FsLog([string]$Message) {
  Write-Output "fancysauce: $Message"
  try { New-Item -ItemType Directory -Force -Path $logDir | Out-Null
        Add-Content -Path (Join-Path $logDir 'mdm-deploy.log') -Value ('{0} {1}' -f (Get-Date -Format o), $Message) } catch { }
}
if ([Environment]::Is64BitOperatingSystem -and -not [Environment]::Is64BitProcess) {
  Write-FsLog 'NOTICE: this ran in the 32-bit PowerShell host. Set "Run script in 64-bit PowerShell host" to Yes.'
}
$hklm = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, [Microsoft.Win32.RegistryView]::Registry64)
$policy = $hklm.OpenSubKey('SOFTWARE\Policies\ClaudeCode')
if ($policy -and ($null -ne $policy.GetValue('Settings'))) {
  Write-FsLog "WARNING: HKLM\SOFTWARE\Policies\ClaudeCode\Settings exists. Managed settings are first-wins. If it holds any setting, Claude Code ignores $dest and this PC collects nothing. Check /status -> Setting sources."
}
$legacy = Join-Path $env:ProgramData 'ClaudeCode\managed-settings.json'
if (Test-Path -LiteralPath $legacy) { Write-FsLog "NOTICE: $legacy exists. Claude Code does not read that path." }
$gitBash = Join-Path $programFiles 'Git\bin\bash.exe'
if (-not (Test-Path -LiteralPath $gitBash)) { Write-FsLog "NOTICE: Git for Windows is not at $gitBash. The plugin runs its hooks through Git Bash." }
New-Item -ItemType Directory -Force -Path $dropinDir | Out-Null
$json = @'
__FANCYSAUCE_SETTINGS_JSON__
'@
if ((Test-Path -LiteralPath $dest) -and ([System.IO.File]::ReadAllText($dest) -ceq $json)) { Write-FsLog "$dest is current."; exit 0 }
$tmp = "$dest.tmp"
# Never Set-Content -Encoding UTF8: Windows PowerShell 5.1 writes a BOM, and JSON.parse rejects it.
[System.IO.File]::WriteAllText($tmp, $json, (New-Object System.Text.UTF8Encoding($false)))
# Move-Item -Force deletes $dest first on Windows PowerShell 5.1. A failed move would leave no file, and Intune does not re-run the script.
if (Test-Path -LiteralPath $dest) { [System.IO.File]::Replace($tmp, $dest, $null) } else { [System.IO.File]::Move($tmp, $dest) }
Write-FsLog "wrote $dest."
exit 0
