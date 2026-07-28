[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$ServerRoot,

    [switch]$Apply
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$resolvedServerRoot = [System.IO.Path]::GetFullPath(
    $ServerRoot
).TrimEnd('\')

$modsRoot = Join-Path $resolvedServerRoot 'mods'
$backupRoot = Join-Path $resolvedServerRoot '.nexus-server-patches\originals'

if (-not (Test-Path -LiteralPath $modsRoot -PathType Container)) {
    throw "No se encontró la carpeta de mods: $modsRoot"
}

function Get-Sha256 {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    return (
        Get-FileHash -LiteralPath $Path -Algorithm SHA256
    ).Hash.ToUpperInvariant()
}

function Read-ZipEntryText {
    param(
        [Parameter(Mandatory)]
        [string]$JarPath,

        [Parameter(Mandatory)]
        [string]$EntryName
    )

    $zip = [System.IO.Compression.ZipFile]::OpenRead($JarPath)

    try {
        $entry = $zip.GetEntry($EntryName)

        if (-not $entry) {
            throw "No se encontró $EntryName dentro de $JarPath"
        }

        $reader = [System.IO.StreamReader]::new($entry.Open())

        try {
            return $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
        }
    }
    finally {
        $zip.Dispose()
    }
}

function Test-ZipEntryMissing {
    param(
        [string]$JarPath,
        [string]$EntryName
    )

    $zip = [System.IO.Compression.ZipFile]::OpenRead($JarPath)

    try {
        return $null -eq $zip.GetEntry($EntryName)
    }
    finally {
        $zip.Dispose()
    }
}

function Test-RootMixinMove {
    param(
        [string]$JarPath,
        [string]$ConfigPath,
        [string[]]$Names
    )

    $config = (
        Read-ZipEntryText `
            -JarPath $JarPath `
            -EntryName $ConfigPath
    ) | ConvertFrom-Json

    $mixins = @($config.mixins)
    $client = @($config.client)

    foreach ($name in $Names) {
        if ($mixins -contains $name) {
            return $false
        }

        if ($client -notcontains $name) {
            return $false
        }
    }

    return $true
}

function Get-TxniScreenConfig {
    param(
        [string]$JarPath
    )

    $outerZip = [System.IO.Compression.ZipFile]::OpenRead($JarPath)

    try {
        $fabricEntry = $outerZip.Entries |
            Where-Object {
                $_.FullName -like 'META-INF/jars/fabric-api-*.jar'
            } |
            Select-Object -First 1

        if (-not $fabricEntry) {
            throw "No se encontró fabric-api dentro de $JarPath"
        }

        $fabricMemory = [System.IO.MemoryStream]::new()
        $fabricStream = $fabricEntry.Open()

        try {
            $fabricStream.CopyTo($fabricMemory)
        }
        finally {
            $fabricStream.Dispose()
        }

        $fabricMemory.Position = 0

        $fabricZip = [System.IO.Compression.ZipArchive]::new(
            $fabricMemory,
            [System.IO.Compression.ZipArchiveMode]::Read,
            $true
        )

        try {
            $screenEntry = $fabricZip.Entries |
                Where-Object {
                    $_.FullName -like '*fabric-screen-api-v1-*.jar'
                } |
                Select-Object -First 1

            if (-not $screenEntry) {
                throw "No se encontró fabric-screen-api dentro de fabric-api"
            }

            $screenMemory = [System.IO.MemoryStream]::new()
            $screenStream = $screenEntry.Open()

            try {
                $screenStream.CopyTo($screenMemory)
            }
            finally {
                $screenStream.Dispose()
            }

            $screenMemory.Position = 0

            $screenZip = [System.IO.Compression.ZipArchive]::new(
                $screenMemory,
                [System.IO.Compression.ZipArchiveMode]::Read,
                $true
            )

            try {
                $configEntry = $screenZip.GetEntry(
                    'fabric-screen-api-v1.mixins.json'
                )

                if (-not $configEntry) {
                    throw 'No se encontró fabric-screen-api-v1.mixins.json'
                }

                $reader = [System.IO.StreamReader]::new(
                    $configEntry.Open()
                )

                try {
                    return $reader.ReadToEnd() | ConvertFrom-Json
                }
                finally {
                    $reader.Dispose()
                }
            }
            finally {
                $screenZip.Dispose()
                $screenMemory.Dispose()
            }
        }
        finally {
            $fabricZip.Dispose()
            $fabricMemory.Dispose()
        }
    }
    finally {
        $outerZip.Dispose()
    }
}

function Test-TxniScreenPatch {
    param(
        [string]$JarPath
    )

    $config = Get-TxniScreenConfig -JarPath $JarPath
    $names = @('MouseMixin', 'ScreenAccessor')
    $mixins = @($config.mixins)
    $client = @($config.client)

    foreach ($name in $names) {
        if ($mixins -contains $name) {
            return $false
        }

        if ($client -notcontains $name) {
            return $false
        }
    }

    return $true
}

function New-OriginalBackup {
    param(
        [string]$JarPath,
        [string]$OriginalHash
    )

    New-Item `
        -ItemType Directory `
        -Path $backupRoot `
        -Force |
        Out-Null

    $file = Get-Item -LiteralPath $JarPath
    $backupName = '{0}.original-{1}.jar' -f `
        $file.BaseName,
        $OriginalHash

    $backupPath = Join-Path $backupRoot $backupName

    if (-not (Test-Path -LiteralPath $backupPath)) {
        Copy-Item `
            -LiteralPath $JarPath `
            -Destination $backupPath
    }

    return $backupPath
}

function Patch-RemoveZipEntry {
    param(
        [string]$JarPath,
        [string]$EntryName
    )

    $workPath = "$JarPath.nexus-patch.tmp"

    Copy-Item `
        -LiteralPath $JarPath `
        -Destination $workPath `
        -Force

    $stream = $null
    $zip = $null

    try {
        $stream = [System.IO.File]::Open(
            $workPath,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )

        $zip = [System.IO.Compression.ZipArchive]::new(
            $stream,
            [System.IO.Compression.ZipArchiveMode]::Update,
            $false
        )

        $entry = $zip.GetEntry($EntryName)

        if (-not $entry) {
            throw "No se encontró $EntryName dentro de $JarPath"
        }

        $entry.Delete()

        $zip.Dispose()
        $zip = $null

        $stream.Dispose()
        $stream = $null

        if (-not (
            Test-ZipEntryMissing `
                -JarPath $workPath `
                -EntryName $EntryName
        )) {
            throw "No se pudo eliminar $EntryName"
        }

        Move-Item `
            -LiteralPath $workPath `
            -Destination $JarPath `
            -Force
    }
    finally {
        if ($zip) {
            $zip.Dispose()
        }

        if ($stream) {
            $stream.Dispose()
        }

        if (Test-Path -LiteralPath $workPath) {
            Remove-Item -LiteralPath $workPath -Force
        }
    }
}

function Patch-RootMixinMove {
    param(
        [string]$JarPath,
        [string]$ConfigPath,
        [string[]]$Names
    )

    $workPath = "$JarPath.nexus-patch.tmp"

    Copy-Item `
        -LiteralPath $JarPath `
        -Destination $workPath `
        -Force

    $stream = $null
    $zip = $null

    try {
        $stream = [System.IO.File]::Open(
            $workPath,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )

        $zip = [System.IO.Compression.ZipArchive]::new(
            $stream,
            [System.IO.Compression.ZipArchiveMode]::Update,
            $false
        )

        $entry = $zip.GetEntry($ConfigPath)

        if (-not $entry) {
            throw "No se encontró $ConfigPath dentro de $JarPath"
        }

        $reader = [System.IO.StreamReader]::new($entry.Open())

        try {
            $config = $reader.ReadToEnd() | ConvertFrom-Json
        }
        finally {
            $reader.Dispose()
        }

        $config.mixins = @(
            @($config.mixins) |
            Where-Object {
                $_ -notin $Names
            }
        )

        $config.client = @(
            (
                @($config.client) + @($Names)
            ) |
            Select-Object -Unique
        )

        $json = $config | ConvertTo-Json -Depth 30

        $entry.Delete()

        $newEntry = $zip.CreateEntry(
            $ConfigPath,
            [System.IO.Compression.CompressionLevel]::Optimal
        )

        $writer = [System.IO.StreamWriter]::new(
            $newEntry.Open(),
            [System.Text.UTF8Encoding]::new($false)
        )

        try {
            $writer.Write($json)
        }
        finally {
            $writer.Dispose()
        }

        $zip.Dispose()
        $zip = $null

        $stream.Dispose()
        $stream = $null

        if (-not (
            Test-RootMixinMove `
                -JarPath $workPath `
                -ConfigPath $ConfigPath `
                -Names $Names
        )) {
            throw "La corrección Mixin no se validó en $JarPath"
        }

        Move-Item `
            -LiteralPath $workPath `
            -Destination $JarPath `
            -Force
    }
    finally {
        if ($zip) {
            $zip.Dispose()
        }

        if ($stream) {
            $stream.Dispose()
        }

        if (Test-Path -LiteralPath $workPath) {
            Remove-Item -LiteralPath $workPath -Force
        }
    }
}

function Patch-TxniScreenApi {
    param(
        [string]$JarPath
    )

    $workPath = "$JarPath.nexus-patch.tmp"

    Copy-Item `
        -LiteralPath $JarPath `
        -Destination $workPath `
        -Force

    $outerStream = $null
    $outerZip = $null
    $fabricMemory = $null
    $fabricZip = $null
    $screenMemory = $null
    $screenZip = $null

    try {
        $outerStream = [System.IO.File]::Open(
            $workPath,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )

        $outerZip = [System.IO.Compression.ZipArchive]::new(
            $outerStream,
            [System.IO.Compression.ZipArchiveMode]::Update,
            $true
        )

        $fabricEntry = $outerZip.Entries |
            Where-Object {
                $_.FullName -like 'META-INF/jars/fabric-api-*.jar'
            } |
            Select-Object -First 1

        if (-not $fabricEntry) {
            throw 'No se encontró fabric-api dentro de TxniLib'
        }

        $fabricPath = $fabricEntry.FullName
        $fabricMemory = [System.IO.MemoryStream]::new()
        $fabricStream = $fabricEntry.Open()

        try {
            $fabricStream.CopyTo($fabricMemory)
        }
        finally {
            $fabricStream.Dispose()
        }

        $fabricMemory.Position = 0

        $fabricZip = [System.IO.Compression.ZipArchive]::new(
            $fabricMemory,
            [System.IO.Compression.ZipArchiveMode]::Update,
            $true
        )

        $screenEntry = $fabricZip.Entries |
            Where-Object {
                $_.FullName -like '*fabric-screen-api-v1-*.jar'
            } |
            Select-Object -First 1

        if (-not $screenEntry) {
            throw 'No se encontró fabric-screen-api dentro de fabric-api'
        }

        $screenPath = $screenEntry.FullName
        $screenMemory = [System.IO.MemoryStream]::new()
        $screenStream = $screenEntry.Open()

        try {
            $screenStream.CopyTo($screenMemory)
        }
        finally {
            $screenStream.Dispose()
        }

        $screenMemory.Position = 0

        $screenZip = [System.IO.Compression.ZipArchive]::new(
            $screenMemory,
            [System.IO.Compression.ZipArchiveMode]::Update,
            $true
        )

        $configEntry = $screenZip.GetEntry(
            'fabric-screen-api-v1.mixins.json'
        )

        if (-not $configEntry) {
            throw 'No se encontró fabric-screen-api-v1.mixins.json'
        }

        $reader = [System.IO.StreamReader]::new(
            $configEntry.Open()
        )

        try {
            $config = $reader.ReadToEnd() | ConvertFrom-Json
        }
        finally {
            $reader.Dispose()
        }

        $names = @('MouseMixin', 'ScreenAccessor')

        $config.mixins = @(
            @($config.mixins) |
            Where-Object {
                $_ -notin $names
            }
        )

        $config.client = @(
            (
                @($config.client) + $names
            ) |
            Select-Object -Unique
        )

        $json = $config | ConvertTo-Json -Depth 30

        $configEntry.Delete()

        $newConfigEntry = $screenZip.CreateEntry(
            'fabric-screen-api-v1.mixins.json',
            [System.IO.Compression.CompressionLevel]::Optimal
        )

        $writer = [System.IO.StreamWriter]::new(
            $newConfigEntry.Open(),
            [System.Text.UTF8Encoding]::new($false)
        )

        try {
            $writer.Write($json)
        }
        finally {
            $writer.Dispose()
        }

        $screenZip.Dispose()
        $screenZip = $null

        $screenBytes = $screenMemory.ToArray()
        $screenEntry.Delete()

        $newScreenEntry = $fabricZip.CreateEntry(
            $screenPath,
            [System.IO.Compression.CompressionLevel]::Optimal
        )

        $newScreenStream = $newScreenEntry.Open()

        try {
            $newScreenStream.Write(
                $screenBytes,
                0,
                $screenBytes.Length
            )
        }
        finally {
            $newScreenStream.Dispose()
        }

        $fabricZip.Dispose()
        $fabricZip = $null

        $fabricBytes = $fabricMemory.ToArray()
        $fabricEntry.Delete()

        $newFabricEntry = $outerZip.CreateEntry(
            $fabricPath,
            [System.IO.Compression.CompressionLevel]::Optimal
        )

        $newFabricStream = $newFabricEntry.Open()

        try {
            $newFabricStream.Write(
                $fabricBytes,
                0,
                $fabricBytes.Length
            )
        }
        finally {
            $newFabricStream.Dispose()
        }

        $outerZip.Dispose()
        $outerZip = $null

        $outerStream.Dispose()
        $outerStream = $null

        if (-not (Test-TxniScreenPatch -JarPath $workPath)) {
            throw 'La corrección interna de TxniLib no se validó'
        }

        Move-Item `
            -LiteralPath $workPath `
            -Destination $JarPath `
            -Force
    }
    finally {
        if ($screenZip) {
            $screenZip.Dispose()
        }

        if ($screenMemory) {
            $screenMemory.Dispose()
        }

        if ($fabricZip) {
            $fabricZip.Dispose()
        }

        if ($fabricMemory) {
            $fabricMemory.Dispose()
        }

        if ($outerZip) {
            $outerZip.Dispose()
        }

        if ($outerStream) {
            $outerStream.Dispose()
        }

        if (Test-Path -LiteralPath $workPath) {
            Remove-Item -LiteralPath $workPath -Force
        }
    }
}

$patches = @(
    [PSCustomObject]@{
        Name         = 'Indestructible KubeJS'
        File         = 'indestructible-20.13.0.jar'
        OriginalHash = '6DE25C515F8284FEBB9E2F0B2D35E0ECAD5A520CDE279C424D8A6F2BE1554685'
        Kind         = 'RemoveEntry'
        Config       = 'kubejs.plugins.txt'
        Names        = @()
    },
    [PSCustomObject]@{
        Name         = 'Epic Fight KubeJS'
        File         = 'epic-fight-20.14.17-mc1.20.1-forge.jar'
        OriginalHash = '69566CF70AE2D91D3F2564C608F014C87E290CEF6215C2A27719851165485F73'
        Kind         = 'RemoveEntry'
        Config       = 'kubejs.plugins.txt'
        Names        = @()
    },
    [PSCustomObject]@{
        Name         = 'TxniLib Fabric Screen API'
        File         = 'txnilib-forge-1.0.24-1.20.1.jar'
        OriginalHash = '71CA69345EF763903213E0B0DB3C9C07D2A090AD311D1DE66C31798A813A9D0E'
        Kind         = 'TxniScreen'
        Config       = ''
        Names        = @('MouseMixin', 'ScreenAccessor')
    },
    [PSCustomObject]@{
        Name         = 'Sword Soaring OBB renderer'
        File         = 'sword_soaring-20.14.2.8-mc1.20.1-forge.jar'
        OriginalHash = '286359A3546B6CD87C58E2ED01FDA8CD9D854868E08A6D096EC10E3A84A41765'
        Kind         = 'RootMixin'
        Config       = 'sword_soaring.mixins.json'
        Names        = @('OBBColliderMixin')
    },
    [PSCustomObject]@{
        Name         = 'Relics screen mixin'
        File         = 'relics-1.20.1-0.8.0.13.jar'
        OriginalHash = '2731D3B81533564C5D206FAF94E4E8AFAF928D97B47B720E5D6AAA017333096F'
        Kind         = 'RootMixin'
        Config       = 'relics.mixins.json'
        Names        = @('ScreenMixin')
    },
    [PSCustomObject]@{
        Name         = 'Fragmentum Minecraft mixin'
        File         = 'fragmentum-forge-1.20.1-1.3.0.jar'
        OriginalHash = 'BE2E501DDC44EC9E899C8A76F0DC1C302FE786E5ACA4A517C564228EE8DB532E'
        Kind         = 'RootMixin'
        Config       = 'fragmentum.mixins.json'
        Names        = @('MixinMinecraft')
    },
    [PSCustomObject]@{
        Name         = 'FamiliarsLib item renderer mixin'
        File         = 'familiarslib-1.20.1-1.6.jar'
        OriginalHash = 'DA9D2FE1B8D861DF8AEC6D75FF54277DB469A301E23689B8A9C9E173B1247610'
        Kind         = 'RootMixin'
        Config       = 'familiarslib.mixins.json'
        Names        = @('ItemTransformMixin')
    }
)

Write-Output "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })"
Write-Output "Server root: $resolvedServerRoot"

foreach ($patch in $patches) {
    $jarPath = Join-Path $modsRoot $patch.File

    if (-not (Test-Path -LiteralPath $jarPath -PathType Leaf)) {
        throw "No se encontró el JAR requerido: $jarPath"
    }

    $hash = Get-Sha256 -Path $jarPath

    $isPatched = switch ($patch.Kind) {
        'RemoveEntry' {
            Test-ZipEntryMissing `
                -JarPath $jarPath `
                -EntryName $patch.Config
        }

        'RootMixin' {
            Test-RootMixinMove `
                -JarPath $jarPath `
                -ConfigPath $patch.Config `
                -Names $patch.Names
        }

        'TxniScreen' {
            Test-TxniScreenPatch -JarPath $jarPath
        }

        default {
            throw "Tipo de parche desconocido: $($patch.Kind)"
        }
    }

    if ($isPatched) {
        Write-Output "[OK] $($patch.Name): ya está corregido."
        continue
    }

    if ($hash -ne $patch.OriginalHash) {
        throw (
            "[HASH INESPERADO] {0}`nEsperado: {1}`nActual:   {2}" -f `
                $patch.File,
                $patch.OriginalHash,
                $hash
        )
    }

    if (-not $Apply) {
        Write-Output "[PLAN] $($patch.Name): pendiente de aplicar."
        continue
    }

    $backupPath = New-OriginalBackup `
        -JarPath $jarPath `
        -OriginalHash $hash

    switch ($patch.Kind) {
        'RemoveEntry' {
            Patch-RemoveZipEntry `
                -JarPath $jarPath `
                -EntryName $patch.Config
        }

        'RootMixin' {
            Patch-RootMixinMove `
                -JarPath $jarPath `
                -ConfigPath $patch.Config `
                -Names $patch.Names
        }

        'TxniScreen' {
            Patch-TxniScreenApi -JarPath $jarPath
        }
    }

    Write-Output "[PATCHED] $($patch.Name)"
    Write-Output "          Backup: $backupPath"
}

if ($Apply) {
    Write-Output 'Todos los parches del servidor están aplicados y validados.'
}
else {
    Write-Output 'Dry-run completado. No se modificó ningún JAR.'
}
