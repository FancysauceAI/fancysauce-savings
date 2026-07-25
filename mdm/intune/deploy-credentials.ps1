# deploy-credentials.ps1
# Materializes %APPDATA%\fancysauce\credentials.json for the running user.
#
# Intune deploys this script (and credentials.json.tmpl) as a Win32 app
# targeting user context. Run as:
#   powershell.exe -ExecutionPolicy Bypass -File deploy-credentials.ps1
#
# What this does:
#   1. Reads $env:ProgramData\fancysauce\credentials.json.tmpl
#      (Intune has already substituted {{UserEmail}} and {{UserPrincipalName}}
#      at deploy time before running this script).
#   2. Replaces __ISSUED_AT__ with the current UTC ISO 8601 timestamp.
#   3. Creates $env:APPDATA\fancysauce if it does not exist.
#   4. Writes the result to $env:APPDATA\fancysauce\credentials.json (UTF-8, no BOM).
#   5. Sets NTFS ACLs to restrict read access to the current user only.
#   6. Logs activity to $env:LOCALAPPDATA\fancysauce\deploy.log.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- paths ------------------------------------------------------------------

$TemplatePath  = Join-Path $env:ProgramData 'fancysauce\credentials.json.tmpl'
$DestDir       = Join-Path $env:APPDATA     'fancysauce'
$DestFile      = Join-Path $DestDir         'credentials.json'
$LogDir        = Join-Path $env:LOCALAPPDATA 'fancysauce'
$LogFile       = Join-Path $LogDir           'deploy.log'

# --- logging ----------------------------------------------------------------

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    $line = "$timestamp [$Level] $Message"
    try {
        if (-not (Test-Path $LogDir)) {
            New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
        }
        Add-Content -Path $LogFile -Value $line -Encoding UTF8
    } catch {
        # Log directory unavailable — write to stderr and continue.
        Write-Error $line
    }
    if ($Level -eq 'ERROR') {
        Write-Error $Message
    }
}

# --- guards -----------------------------------------------------------------

Write-Log "deploy-credentials.ps1 starting"

if (-not (Test-Path $TemplatePath)) {
    Write-Log "Template not found: $TemplatePath" 'ERROR'
    exit 1
}

# --- compute timestamp ------------------------------------------------------

$IssuedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')

# --- read and substitute template -------------------------------------------

try {
    $content = Get-Content -Path $TemplatePath -Raw -Encoding UTF8
} catch {
    Write-Log "Failed to read template: $_" 'ERROR'
    exit 1
}

$rendered = $content -replace '__ISSUED_AT__', $IssuedAt

# --- create destination directory -------------------------------------------

try {
    if (-not (Test-Path $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        Write-Log "Created directory: $DestDir"
    }
} catch {
    Write-Log "Failed to create directory $DestDir`: $_" 'ERROR'
    exit 1
}

# --- write credentials file (UTF-8 without BOM) -----------------------------

try {
    # [System.IO.File]::WriteAllText writes UTF-8 without BOM on all PS versions.
    [System.IO.File]::WriteAllText($DestFile, $rendered, [System.Text.UTF8Encoding]::new($false))
    Write-Log "Credentials written to: $DestFile (issued_at: $IssuedAt)"
} catch {
    Write-Log "Failed to write credentials file $DestFile`: $_" 'ERROR'
    exit 1
}

# --- restrict NTFS ACL to current user only (best-effort) -------------------

try {
    $acl = Get-Acl $DestFile

    # Remove inheritance and strip all inherited rules.
    $acl.SetAccessRuleProtection($true, $false)

    # Grant current user FullControl; remove any other rules already present.
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $currentUser,
        'FullControl',
        'Allow'
    )
    # Replace: clear existing rules, then add our rule.
    foreach ($existing in @($acl.Access)) {
        $acl.RemoveAccessRule($existing) | Out-Null
    }
    $acl.AddAccessRule($rule)
    Set-Acl -Path $DestFile -AclObject $acl
    Write-Log "ACL restricted to $currentUser"
} catch {
    # ACL tightening is best-effort — log and proceed rather than failing.
    Write-Log "ACL set failed (non-fatal): $_" 'WARN'
}

Write-Log "deploy-credentials.ps1 completed successfully"
exit 0
