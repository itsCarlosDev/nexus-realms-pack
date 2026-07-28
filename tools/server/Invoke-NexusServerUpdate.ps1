[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$ServerRoot,

    [string]$PackUrl = 'http://localhost:8080/pack.toml',

    [string]$BootstrapJar,

    [string]$JavaPath = '<LOCAL_USER_HOME>\AppData\Roaming\PrismLauncher\java\java-runtime-gamma\bin\java.exe',

    [string]$SideMatrix = '',

    [switch]$Apply
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..')
).TrimEnd('\')
$prismRoot = '<LOCAL_USER_HOME>\AppData\Roaming\PrismLauncher\instances\NexusRealmsDEV-instance(1)\minecraft'
$resolvedServerRoot = [System.IO.Path]::GetFullPath($ServerRoot).TrimEnd('\')

if (
    $resolvedServerRoot.StartsWith(
        $repositoryRoot + '\',
        [System.StringComparison]::OrdinalIgnoreCase
    ) -or
    $resolvedServerRoot.Equals(
        $repositoryRoot,
        [System.StringComparison]::OrdinalIgnoreCase
    )
) {
    throw 'ServerRoot must be outside the Git repository so downloaded JARs never enter Git.'
}

if (
    $resolvedServerRoot.StartsWith(
        $prismRoot + '\',
        [System.StringComparison]::OrdinalIgnoreCase
    ) -or
    $resolvedServerRoot.Equals(
        $prismRoot,
        [System.StringComparison]::OrdinalIgnoreCase
    )
) {
    throw 'The Prism DEV instance and Mundo nuevo (5) cannot be used as server staging.'
}

if ($resolvedServerRoot -match 'Mundo nuevo \(5\)') {
    throw 'Mundo nuevo (5) cannot be used as server staging.'
}

if (-not (Test-Path -LiteralPath $JavaPath -PathType Leaf)) {
    throw "Java executable not found: $JavaPath"
}

$javaVersion = (& $JavaPath -version 2>&1 | Out-String).Trim()
if ($javaVersion -notmatch 'version "17\.') {
    throw "Java 17 x64 is required. Detected:`n$javaVersion"
}

if (-not $BootstrapJar) {
    $BootstrapJar = Join-Path $resolvedServerRoot 'packwiz-installer-bootstrap.jar'
}
$resolvedBootstrapJar = [System.IO.Path]::GetFullPath($BootstrapJar)
$jarFixScript = Join-Path $PSScriptRoot 'Apply-NexusServerJarFixes.ps1'

if (-not $SideMatrix) {
    $SideMatrix = Join-Path $repositoryRoot 'docs\audits\2026-07-27-mod-side-matrix.csv'
}

$preservedPaths = @(
    'world',
    'server.properties',
    'whitelist.json',
    'ops.json',
    'banned-players.json',
    'banned-ips.json',
    'usercache.json',
    'eula.txt',
    '.env',
    'secrets',
    'config\voicechat\voicechat-server.properties'
)

Write-Output "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })"
Write-Output "Server root: $resolvedServerRoot"
Write-Output "Pack URL: $PackUrl"
Write-Output "Java: $JavaPath"
Write-Output $javaVersion
Write-Output 'Installer side: server (client-only packwiz entries are excluded)'

if (Test-Path -LiteralPath $SideMatrix -PathType Leaf) {
    $matrix = Import-Csv -LiteralPath $SideMatrix
    $clientLeakCandidates = @(
        $matrix |
            Where-Object {
                $_.packwiz_side -eq 'both' -and
                $_.inferred_side -eq 'client only'
            }
    )
    Write-Output "Side matrix rows: $($matrix.Count)"
    Write-Output "Client-only entries still marked both: $($clientLeakCandidates.Count)"
    foreach ($candidate in $clientLeakCandidates) {
        Write-Warning "$($candidate.filename): review packwiz side before production."
    }
}
else {
    Write-Warning "Side matrix not found: $SideMatrix"
}

Write-Output 'Protected operational paths (packwiz must not manage or replace these):'
foreach ($relativePath in $preservedPaths) {
    $path = Join-Path $resolvedServerRoot $relativePath
    Write-Output "  $relativePath : $(Test-Path -LiteralPath $path)"
}

$voiceConfig = Join-Path $resolvedServerRoot 'config\voicechat\voicechat-server.properties'
$voicePort = 24454
if (Test-Path -LiteralPath $voiceConfig -PathType Leaf) {
    $portLine = Select-String -LiteralPath $voiceConfig -Pattern '^port=' | Select-Object -First 1
    if ($portLine -and $portLine.Line -match '^port=(\d+)$') {
        $voicePort = [int]$Matches[1]
    }
}
Write-Output "Simple Voice Chat: reserve/open UDP $voicePort (not TCP-only)."

Write-Output 'Managed content updated by packwiz server install includes mods marked server/both plus indexed config, defaultconfigs, KubeJS, FTB Quests and Nexus Core.'
Write-Output 'World, playerdata, server.properties, whitelist and secrets are not staging inputs and must have an external backup before production use.'

if (-not $Apply) {
    if (-not (Test-Path -LiteralPath $resolvedBootstrapJar -PathType Leaf)) {
        Write-Warning "Bootstrap JAR not found for a future apply: $resolvedBootstrapJar"
    }
    Write-Output 'Dry-run complete. No directory was created and no installer was executed.'
    return
}

if (-not (Test-Path -LiteralPath $resolvedServerRoot -PathType Container)) {
    throw "Apply requires an existing, explicitly prepared server directory: $resolvedServerRoot"
}
if (-not (Test-Path -LiteralPath $resolvedBootstrapJar -PathType Leaf)) {
    throw "packwiz installer bootstrap not found: $resolvedBootstrapJar"
}

if (-not (Test-Path -LiteralPath $jarFixScript -PathType Leaf)) {
    throw "Server JAR patch script not found: $jarFixScript"
}

Push-Location -LiteralPath $resolvedServerRoot
try {
    & $JavaPath -jar $resolvedBootstrapJar -g -s server $PackUrl
    if ($LASTEXITCODE -ne 0) {
        throw "packwiz installer failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

Write-Output 'Applying validated server-only JAR fixes...'

& $jarFixScript `
    -ServerRoot $resolvedServerRoot `
    -Apply

Write-Output 'Server-only JAR fixes completed.'
Write-Output 'Server-side packwiz update and JAR patching completed. Verify protected paths, launch logs and UDP voice connectivity before production.'
