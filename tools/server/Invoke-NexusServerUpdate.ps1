[CmdletBinding()]
param(
    [string]$ServerRoot = $env:SERVER_ROOT,

    [string]$PackUrl = $(if ($env:NEXUS_PACK_URL) {
        $env:NEXUS_PACK_URL
    }
    else {
        'https://itscarlosdev.github.io/nexus-realms-pack/pack.toml'
    }),

    [string]$BootstrapJar,

    [string]$JavaPath = $(if ($env:JAVA_BIN) {
        $env:JAVA_BIN
    }
    else {
        'java'
    }),

    [bool]$AllowOfflineStart = $(if ($env:NEXUS_ALLOW_OFFLINE_START) {
        $env:NEXUS_ALLOW_OFFLINE_START -eq 'true'
    }
    else {
        $false
    }),

    [bool]$RequireUpdate = $(if ($env:NEXUS_REQUIRE_UPDATE) {
        $env:NEXUS_REQUIRE_UPDATE -eq 'true'
    }
    else {
        $true
    }),

    [switch]$AllowLocalPackUrl,

    [switch]$Apply,

    [switch]$StartServer
)

$ErrorActionPreference = 'Stop'

$productionPackUrl =
    'https://itscarlosdev.github.io/nexus-realms-pack/pack.toml'
$bootstrapSha256 =
    'A8FBB24DC604278E97F4688E82D3D91A318B98EFC08D5DBFCBCBCAB6443D116C'
$ownerName = 'SpendRed23'
$ownerUuid = 'bf5ba90d-6f2a-41e0-8dc2-d58cdedee4a9'
$forgeArguments =
    'libraries\net\minecraftforge\forge\1.20.1-47.4.10\win_args.txt'
$patcherSource = Join-Path $PSScriptRoot 'NexusServerPatcher.java'
$journeyMapTemplate = Join-Path `
    $PSScriptRoot `
    'templates\journeymap.server.global.config'

if ([string]::IsNullOrWhiteSpace($ServerRoot)) {
    throw 'ServerRoot or the SERVER_ROOT environment variable is required.'
}

$resolvedServerRoot = [System.IO.Path]::GetFullPath($ServerRoot).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
)

if (-not (Test-Path -LiteralPath $resolvedServerRoot -PathType Container)) {
    throw "ServerRoot does not exist: $resolvedServerRoot"
}
if ($resolvedServerRoot -match 'Mundo nuevo \(5\)') {
    throw 'Mundo nuevo (5) cannot be used as server staging.'
}

$repositoryRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..')
).TrimEnd('\')
if (
    $resolvedServerRoot.Equals(
        $repositoryRoot,
        [System.StringComparison]::OrdinalIgnoreCase
    ) -or
    $resolvedServerRoot.StartsWith(
        $repositoryRoot + '\',
        [System.StringComparison]::OrdinalIgnoreCase
    )
) {
    throw 'ServerRoot must remain outside the Git repository.'
}

if (
    $PackUrl -match '^https?://(?:127\.0\.0\.1|localhost)(?::|/)' -and
    -not $AllowLocalPackUrl
) {
    throw (
        'A localhost pack URL is development-only. ' +
        'Pass -AllowLocalPackUrl explicitly.'
    )
}

$logDirectory = Join-Path $resolvedServerRoot 'logs'
$logFile = Join-Path $logDirectory 'nexus-update.log'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

function Write-NexusLog {
    param([Parameter(Mandatory)][string]$Message)

    $line = '{0} {1}' -f (
        [DateTimeOffset]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    ), $Message
    $line | Tee-Object -FilePath $logFile -Append
}

function Get-ServerProperty {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $null
    }
    $match = Select-String `
        -LiteralPath $Path `
        -Pattern "^$([regex]::Escape($Name))=" |
        Select-Object -First 1
    if (-not $match) {
        return $null
    }
    return ($match.Line -split '=', 2)[1]
}

function Test-OwnerOps {
    param([Parameter(Mandatory)][string]$Path)

    try {
        $entries = @(
            (Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json) |
                Where-Object { $null -ne $_ }
        )
    }
    catch {
        return $false
    }

    return (
        $entries.Count -eq 1 -and
        [string]$entries[0].uuid -ieq $ownerUuid -and
        [string]$entries[0].name -ceq $ownerName -and
        [int]$entries[0].level -eq 4
    )
}

function Get-ProtectedManifest {
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string[]]$RelativePaths
    )

    $manifest = [System.Collections.Generic.List[string]]::new()
    foreach ($relativePath in $RelativePaths) {
        $path = Join-Path $Root $relativePath
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            $hash = (
                Get-FileHash -LiteralPath $path -Algorithm SHA256
            ).Hash
            $manifest.Add("F`t$relativePath`t$hash")
        }
        elseif (Test-Path -LiteralPath $path -PathType Container) {
            $manifest.Add("D`t$relativePath")
            Get-ChildItem -LiteralPath $path -Recurse -File |
                Sort-Object FullName |
                ForEach-Object {
                    $child = [System.IO.Path]::GetRelativePath(
                        $Root,
                        $_.FullName
                    )
                    $hash = (
                        Get-FileHash `
                            -LiteralPath $_.FullName `
                            -Algorithm SHA256
                    ).Hash
                    $manifest.Add("F`t$child`t$hash")
                }
        }
        else {
            $manifest.Add("M`t$relativePath")
        }
    }
    return $manifest.ToArray()
}

function Assert-ProtectedUnchanged {
    param(
        [Parameter(Mandatory)][string[]]$Before,
        [Parameter(Mandatory)][string[]]$RelativePaths,
        [Parameter(Mandatory)][hashtable]$CriticalSnapshots
    )

    $after = Get-ProtectedManifest `
        -Root $resolvedServerRoot `
        -RelativePaths $RelativePaths
    if ([string]::Join("`n", $Before) -cne [string]::Join("`n", $after)) {
        foreach ($relativePath in $CriticalSnapshots.Keys) {
            $path = Join-Path $resolvedServerRoot $relativePath
            $snapshot = $CriticalSnapshots[$relativePath]
            $changed = -not (Test-Path -LiteralPath $path -PathType Leaf)
            if (-not $changed) {
                $changed = (
                    Get-FileHash -LiteralPath $path -Algorithm SHA256
                ).Hash -ne $snapshot.Hash
            }
            if ($changed) {
                New-Item `
                    -ItemType Directory `
                    -Force `
                    -Path (Split-Path -Parent $path) |
                    Out-Null
                [System.IO.File]::WriteAllBytes($path, $snapshot.Bytes)
            }
        }
        throw (
            'Protected operational state changed; critical original bytes ' +
            'were restored and the update was aborted.'
        )
    }
}

function Test-PublishedIndex {
    param(
        [Parameter(Mandatory)][string]$DownloadedPack,
        [Parameter(Mandatory)][string]$DownloadedIndex,
        [Parameter(Mandatory)][string]$LevelName
    )

    $packText = [System.IO.File]::ReadAllText($DownloadedPack)
    $indexDefinition = [regex]::Match(
        $packText,
        '(?ms)^\[index\]\s*.*?^file\s*=\s*"([^"]+)".*?^hash-format\s*=\s*"sha256".*?^hash\s*=\s*"([0-9a-fA-F]{64})"'
    )
    if (-not $indexDefinition.Success) {
        throw 'Published pack.toml has an invalid SHA-256 index definition.'
    }
    if ($indexDefinition.Groups[1].Value -cne 'index.toml') {
        throw 'Published pack.toml must reference index.toml.'
    }

    $expected = $indexDefinition.Groups[2].Value.ToUpperInvariant()
    $actual = (
        Get-FileHash -LiteralPath $DownloadedIndex -Algorithm SHA256
    ).Hash
    if ($actual -ne $expected) {
        throw "Published index hash mismatch: expected $expected, got $actual"
    }

    $protected = @(
        'ops.json',
        'server.properties',
        'whitelist.json',
        'banned-players.json',
        'banned-ips.json',
        'usercache.json',
        'eula.txt',
        '.env',
        'secrets',
        'config/voicechat/voicechat-server.properties',
        'journeymap/server',
        'world',
        'saves',
        'logs',
        'crash-reports',
        $LevelName.Replace('\', '/')
    )
    $indexText = [System.IO.File]::ReadAllText($DownloadedIndex)
    $managedPaths = [regex]::Matches(
        $indexText,
        '(?m)^file\s*=\s*"([^"]+)"\s*$'
    )
    foreach ($match in $managedPaths) {
        $managed = $match.Groups[1].Value
        foreach ($prefix in $protected) {
            if (
                $managed -ceq $prefix -or
                $managed.StartsWith(
                    $prefix + '/',
                    [System.StringComparison]::Ordinal
                )
            ) {
                throw "Published Packwiz index manages protected path: $managed"
            }
        }
    }
    return $actual
}

$lockPath = Join-Path $resolvedServerRoot '.nexus-update.lock'
$lockStream = $null
$temporaryRoot = $null
try {
    try {
        $lockStream = [System.IO.File]::Open(
            $lockPath,
            [System.IO.FileMode]::OpenOrCreate,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )
    }
    catch {
        throw "Another Nexus update holds the lock: $lockPath"
    }

    $javaVersion = (& $JavaPath -version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $javaVersion -notmatch 'version "17\.') {
        throw "Java 17 is required. Detected:`n$javaVersion"
    }

    $serverProperties = Join-Path `
        $resolvedServerRoot `
        'server.properties'
    $opsFile = Join-Path $resolvedServerRoot 'ops.json'
    if (-not (Test-OwnerOps -Path $opsFile)) {
        throw (
            "ops.json must contain only $ownerName ($ownerUuid) at level 4."
        )
    }
    if (
        (Get-ServerProperty `
            -Path $serverProperties `
            -Name 'op-permission-level') -ne '4'
    ) {
        throw 'server.properties must contain op-permission-level=4.'
    }

    $levelName = Get-ServerProperty `
        -Path $serverProperties `
        -Name 'level-name'
    if ([string]::IsNullOrWhiteSpace($levelName)) {
        $levelName = 'world'
    }
    if ($levelName -match '\.\.|[\\/]') {
        throw "Unsafe level-name: $levelName"
    }
    $worldRoot = Join-Path $resolvedServerRoot $levelName

    if (-not $BootstrapJar) {
        $BootstrapJar = Join-Path `
            $resolvedServerRoot `
            'packwiz-installer-bootstrap.jar'
    }
    $resolvedBootstrapJar = [System.IO.Path]::GetFullPath($BootstrapJar)
    if (-not (
        Test-Path -LiteralPath $resolvedBootstrapJar -PathType Leaf
    )) {
        throw "Packwiz installer bootstrap not found: $resolvedBootstrapJar"
    }
    $bootstrapHash = (
        Get-FileHash `
            -LiteralPath $resolvedBootstrapJar `
            -Algorithm SHA256
    ).Hash
    if ($bootstrapHash -ne $bootstrapSha256) {
        throw "Unexpected packwiz bootstrap SHA-256: $bootstrapHash"
    }
    if (-not (Test-Path -LiteralPath $patcherSource -PathType Leaf)) {
        throw "Shared Java patcher not found: $patcherSource"
    }

    $protectedPaths = @(
        'ops.json',
        'server.properties',
        'whitelist.json',
        'banned-players.json',
        'banned-ips.json',
        'usercache.json',
        'eula.txt',
        '.env',
        'secrets',
        'config\voicechat\voicechat-server.properties',
        'journeymap\server',
        $levelName
    )
    $protectedBefore = Get-ProtectedManifest `
        -Root $resolvedServerRoot `
        -RelativePaths $protectedPaths
    $criticalSnapshots = @{}
    foreach ($relativePath in @(
        'ops.json',
        'server.properties',
        'whitelist.json',
        'banned-players.json',
        'banned-ips.json',
        'usercache.json',
        'eula.txt',
        'config\voicechat\voicechat-server.properties',
        (Join-Path $levelName 'level.dat')
    )) {
        $path = Join-Path $resolvedServerRoot $relativePath
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            $criticalSnapshots[$relativePath] = @{
                Bytes = [System.IO.File]::ReadAllBytes($path)
                Hash = (
                    Get-FileHash -LiteralPath $path -Algorithm SHA256
                ).Hash
            }
        }
    }

    Write-NexusLog "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })"
    Write-NexusLog "Server root: $resolvedServerRoot"
    Write-NexusLog "Pack URL: $PackUrl"

    if (-not $Apply) {
        & $JavaPath `
            $patcherSource `
            --server-root `
            $resolvedServerRoot `
            --check
        if ($LASTEXITCODE -ne 0) {
            throw "NexusServerPatcher check failed: $LASTEXITCODE"
        }
        Write-NexusLog 'Dry-run complete; no files were modified.'
        return
    }

    $temporaryRoot = Join-Path `
        ([System.IO.Path]::GetTempPath()) `
        ('nexus-update-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
    $downloadedPack = Join-Path $temporaryRoot 'pack.toml'
    $downloadedIndex = Join-Path $temporaryRoot 'index.toml'
    $packAvailable = $true

    try {
        Invoke-WebRequest `
            -Uri $PackUrl `
            -OutFile $downloadedPack `
            -TimeoutSec 30
        $indexUrl = [uri]::new([uri]$PackUrl, 'index.toml')
        Invoke-WebRequest `
            -Uri $indexUrl `
            -OutFile $downloadedIndex `
            -TimeoutSec 30
    }
    catch {
        $packAvailable = $false
    }

    if (-not $packAvailable) {
        if ($RequireUpdate) {
            throw "Published pack is unavailable: $PackUrl"
        }
        if (-not $AllowOfflineStart) {
            throw 'Published pack is unavailable and offline start is disabled.'
        }
        Write-NexusLog (
            '[WARN] Pack unavailable; validating the installed server ' +
            'before offline start.'
        )
    }
    else {
        $indexHash = Test-PublishedIndex `
            -DownloadedPack $downloadedPack `
            -DownloadedIndex $downloadedIndex `
            -LevelName $levelName

        Push-Location -LiteralPath $resolvedServerRoot
        try {
            & $JavaPath `
                -jar `
                $resolvedBootstrapJar `
                -g `
                -s `
                server `
                $PackUrl 2>&1 |
                Tee-Object -FilePath $logFile -Append
            if ($LASTEXITCODE -ne 0) {
                throw "Packwiz installer failed: $LASTEXITCODE"
            }
        }
        finally {
            Pop-Location
        }

        Assert-ProtectedUnchanged `
            -Before $protectedBefore `
            -RelativePaths $protectedPaths `
            -CriticalSnapshots $criticalSnapshots
        Write-NexusLog "Published index verified: $indexHash"
    }

    $journeyMapGlobal = Join-Path `
        $resolvedServerRoot `
        'journeymap\server\5.10\journeymap.server.global.config'
    if (-not (Test-Path -LiteralPath $journeyMapGlobal -PathType Leaf)) {
        New-Item `
            -ItemType Directory `
            -Force `
            -Path (Split-Path -Parent $journeyMapGlobal) |
            Out-Null
        Copy-Item `
            -LiteralPath $journeyMapTemplate `
            -Destination $journeyMapGlobal
        Write-NexusLog 'Initialized missing JourneyMap global configuration.'
    }

    if (Test-Path -LiteralPath $worldRoot -PathType Container) {
        $worldConfig = Join-Path $worldRoot 'serverconfig'
        New-Item -ItemType Directory -Force -Path $worldConfig | Out-Null

        $initialConfigs = @(
            @{
                Source = 'defaultconfigs\ftbessentials-server.snbt'
                Destination = 'ftbessentials.snbt'
            },
            @{
                Source = 'defaultconfigs\ftbranks\ranks.snbt'
                Destination = 'ftbranks\ranks.snbt'
            },
            @{
                Source = 'defaultconfigs\journeymap-server.toml'
                Destination = 'journeymap-server.toml'
            }
        )
        foreach ($config in $initialConfigs) {
            $source = Join-Path $resolvedServerRoot $config.Source
            $destination = Join-Path $worldConfig $config.Destination
            if (-not (
                Test-Path -LiteralPath $destination -PathType Leaf
            )) {
                New-Item `
                    -ItemType Directory `
                    -Force `
                    -Path (Split-Path -Parent $destination) |
                    Out-Null
                Copy-Item `
                    -LiteralPath $source `
                    -Destination $destination
                Write-NexusLog (
                    "Initialized missing world config: $($config.Destination)"
                )
            }
        }
    }

    $protectedBefore = Get-ProtectedManifest `
        -Root $resolvedServerRoot `
        -RelativePaths $protectedPaths

    & $JavaPath `
        $patcherSource `
        --server-root `
        $resolvedServerRoot `
        --apply 2>&1 |
        Tee-Object -FilePath $logFile -Append
    if ($LASTEXITCODE -ne 0) {
        throw "NexusServerPatcher apply failed: $LASTEXITCODE"
    }
    & $JavaPath `
        $patcherSource `
        --server-root `
        $resolvedServerRoot `
        --check 2>&1 |
        Tee-Object -FilePath $logFile -Append
    if ($LASTEXITCODE -ne 0) {
        throw "NexusServerPatcher validation failed: $LASTEXITCODE"
    }

    Assert-ProtectedUnchanged `
        -Before $protectedBefore `
        -RelativePaths $protectedPaths `
        -CriticalSnapshots $criticalSnapshots
    Write-NexusLog (
        'Update validation completed; protected operational state is unchanged.'
    )

    if ($StartServer) {
        $userArguments = Join-Path $resolvedServerRoot 'user_jvm_args.txt'
        $forgeArgumentsPath = Join-Path `
            $resolvedServerRoot `
            $forgeArguments
        $eula = Join-Path $resolvedServerRoot 'eula.txt'
        if (-not (Test-Path -LiteralPath $userArguments -PathType Leaf)) {
            throw 'Missing user_jvm_args.txt.'
        }
        if (-not (
            Test-Path -LiteralPath $forgeArgumentsPath -PathType Leaf
        )) {
            throw "Missing Forge Windows arguments: $forgeArgumentsPath"
        }
        if (
            -not (
                Select-String `
                    -LiteralPath $eula `
                    -Pattern '^eula=true$' `
                    -Quiet
            )
        ) {
            throw 'eula.txt must contain eula=true before Forge can start.'
        }

        Write-NexusLog (
            'Starting Forge 1.20.1-47.4.10 with win_args.txt.'
        )
        Push-Location -LiteralPath $resolvedServerRoot
        try {
            & $JavaPath `
                '@user_jvm_args.txt' `
                "@$forgeArguments" `
                'nogui'
            $serverExit = $LASTEXITCODE
        }
        finally {
            Pop-Location
        }
        Write-NexusLog "Forge exited with code $serverExit."
        exit $serverExit
    }
}
finally {
    if ($temporaryRoot -and (
        Test-Path -LiteralPath $temporaryRoot -PathType Container
    )) {
        $resolvedTemporary = [System.IO.Path]::GetFullPath($temporaryRoot)
        $systemTemporary = [System.IO.Path]::GetFullPath(
            [System.IO.Path]::GetTempPath()
        )
        if (-not $resolvedTemporary.StartsWith(
            $systemTemporary,
            [System.StringComparison]::OrdinalIgnoreCase
        )) {
            throw "Refusing to remove unsafe temporary path: $resolvedTemporary"
        }
        Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
    }
    if ($lockStream) {
        $lockStream.Dispose()
    }
}
