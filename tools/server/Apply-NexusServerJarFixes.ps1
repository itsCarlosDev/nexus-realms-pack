[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$ServerRoot,

    [string]$JavaPath = $(if ($env:JAVA_BIN) {
        $env:JAVA_BIN
    }
    else {
        'java'
    }),

    [switch]$Apply
)

$ErrorActionPreference = 'Stop'

$resolvedServerRoot = [System.IO.Path]::GetFullPath($ServerRoot)
$patcherSource = Join-Path $PSScriptRoot 'NexusServerPatcher.java'

if (-not (Test-Path -LiteralPath $resolvedServerRoot -PathType Container)) {
    throw "ServerRoot does not exist: $resolvedServerRoot"
}

if (-not (Test-Path -LiteralPath $patcherSource -PathType Leaf)) {
    throw "Shared Java patcher not found: $patcherSource"
}

$javaVersion = (& $JavaPath -version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $javaVersion -notmatch 'version "17\.') {
    throw "Java 17 is required. Detected:`n$javaVersion"
}

$arguments = @(
    $patcherSource,
    '--server-root',
    $resolvedServerRoot,
    $(if ($Apply) { '--apply' } else { '--check' })
)

& $JavaPath @arguments
if ($LASTEXITCODE -ne 0) {
    throw "NexusServerPatcher failed with exit code $LASTEXITCODE"
}
