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

function Test-JsonMapKeysMissing {
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

    foreach ($name in $Names) {
        if ($config.values.PSObject.Properties.Name -contains $name) {
            return $false
        }
    }

    return $true
}

function Patch-JsonMapKeysRemove {
    param(
        [string]$JarPath,
        [string]$ConfigPath,
        [string[]]$Names
    )

    $workPath = "$JarPath.nexus-json-map-patch.tmp"

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
            $true
        )

        $entry = $zip.GetEntry($ConfigPath)

        if (-not $entry) {
            throw "No se encontró el data map: $ConfigPath"
        }

        $reader = [System.IO.StreamReader]::new($entry.Open())

        try {
            $config = $reader.ReadToEnd() | ConvertFrom-Json
        }
        finally {
            $reader.Dispose()
        }

        foreach ($name in $Names) {
            if (
                $config.values.PSObject.Properties.Name -notcontains
                $name
            ) {
                throw "No se encontró la clave esperada: $name"
            }

            $config.values.PSObject.Properties.Remove($name)
        }

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

        if (
            -not (
                Test-JsonMapKeysMissing `
                    -JarPath $workPath `
                    -ConfigPath $ConfigPath `
                    -Names $Names
            )
        ) {
            throw "No se validó el data map corregido: $ConfigPath"
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

function Get-TxniNestedMixinConfig {
    param(
        [string]$JarPath,
        [string]$NestedJarPattern,
        [string]$ConfigPath
    )

    $outerZip = $null
    $fabricMemory = $null
    $fabricZip = $null
    $nestedMemory = $null
    $nestedZip = $null

    try {
        $outerZip = [System.IO.Compression.ZipFile]::OpenRead(
            $JarPath
        )

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

        $nestedEntry = $fabricZip.Entries |
            Where-Object {
                $_.FullName -like $NestedJarPattern
            } |
            Select-Object -First 1

        if (-not $nestedEntry) {
            throw (
                "No se encontró el JAR interno: {0}" -f
                $NestedJarPattern
            )
        }

        $nestedMemory = [System.IO.MemoryStream]::new()
        $nestedStream = $nestedEntry.Open()

        try {
            $nestedStream.CopyTo($nestedMemory)
        }
        finally {
            $nestedStream.Dispose()
        }

        $nestedMemory.Position = 0

        $nestedZip = [System.IO.Compression.ZipArchive]::new(
            $nestedMemory,
            [System.IO.Compression.ZipArchiveMode]::Read,
            $true
        )

        $configEntry = $nestedZip.GetEntry($ConfigPath)

        if (-not $configEntry) {
            throw "No se encontró $ConfigPath"
        }

        $reader = [System.IO.StreamReader]::new(
            $configEntry.Open()
        )

        try {
            return $reader.ReadToEnd() |
                ConvertFrom-Json
        }
        finally {
            $reader.Dispose()
        }
    }
    finally {
        if ($nestedZip) {
            $nestedZip.Dispose()
        }

        if ($nestedMemory) {
            $nestedMemory.Dispose()
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
    }
}

function Test-TxniTradePatch {
    param(
        [string]$JarPath
    )

    $config = Get-TxniNestedMixinConfig `
        -JarPath $JarPath `
        -NestedJarPattern '*fabric-object-builder-api-v1-*.jar' `
        -ConfigPath 'fabric-object-builder-v1.mixins.json'

    $blockedMixin =
        'TradeOffersTypeAwareBuyForOneEmeraldFactoryMixin'

    return @($config.mixins) -notcontains $blockedMixin
}

function Test-TxniBundlePatch {
    param(
        [string]$JarPath
    )

    if (
        -not (Test-TxniScreenPatch -JarPath $JarPath) -or
        -not (Test-TxniTradePatch -JarPath $JarPath)
    ) {
        return $false
    }

    foreach ($metadata in $txniMixinMetadata) {
        if (
            -not (
                Test-NestedMixinMinVersion `
                    -JarPath $JarPath `
                    -NestedJarPatterns $metadata.NestedJarPatterns `
                    -ConfigPath $metadata.ConfigPath `
                    -MinVersion $metadata.MinVersion
            )
        ) {
            return $false
        }
    }

    return $true
}

function Patch-TxniNestedMixinRemove {
    param(
        [string]$JarPath,
        [string]$NestedJarPattern,
        [string]$ConfigPath,
        [string[]]$Names
    )

    $workPath = "$JarPath.nexus-nested-patch.tmp"

    Copy-Item `
        -LiteralPath $JarPath `
        -Destination $workPath `
        -Force

    $outerStream = $null
    $outerZip = $null
    $fabricMemory = $null
    $fabricZip = $null
    $nestedMemory = $null
    $nestedZip = $null

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

        $nestedEntry = $fabricZip.Entries |
            Where-Object {
                $_.FullName -like $NestedJarPattern
            } |
            Select-Object -First 1

        if (-not $nestedEntry) {
            throw (
                "No se encontró el JAR interno: {0}" -f
                $NestedJarPattern
            )
        }

        $nestedPath = $nestedEntry.FullName
        $nestedMemory = [System.IO.MemoryStream]::new()
        $nestedStream = $nestedEntry.Open()

        try {
            $nestedStream.CopyTo($nestedMemory)
        }
        finally {
            $nestedStream.Dispose()
        }

        $nestedMemory.Position = 0

        $nestedZip = [System.IO.Compression.ZipArchive]::new(
            $nestedMemory,
            [System.IO.Compression.ZipArchiveMode]::Update,
            $true
        )

        $configEntry = $nestedZip.GetEntry($ConfigPath)

        if (-not $configEntry) {
            throw "No se encontró $ConfigPath"
        }

        $reader = [System.IO.StreamReader]::new(
            $configEntry.Open()
        )

        try {
            $config = $reader.ReadToEnd() |
                ConvertFrom-Json
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

        $json = $config |
            ConvertTo-Json -Depth 30

        $configEntry.Delete()

        $newConfigEntry = $nestedZip.CreateEntry(
            $ConfigPath,
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

        $nestedZip.Dispose()
        $nestedZip = $null

        $nestedBytes = $nestedMemory.ToArray()
        $nestedEntry.Delete()

        $newNestedEntry = $fabricZip.CreateEntry(
            $nestedPath,
            [System.IO.Compression.CompressionLevel]::Optimal
        )

        $newNestedStream = $newNestedEntry.Open()

        try {
            $newNestedStream.Write(
                $nestedBytes,
                0,
                $nestedBytes.Length
            )
        }
        finally {
            $newNestedStream.Dispose()
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

        Move-Item `
            -LiteralPath $workPath `
            -Destination $JarPath `
            -Force
    }
    finally {
        if ($nestedZip) {
            $nestedZip.Dispose()
        }

        if ($nestedMemory) {
            $nestedMemory.Dispose()
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
            Remove-Item `
                -LiteralPath $workPath `
                -Force
        }
    }
}

function Patch-TxniTradeApi {
    param(
        [string]$JarPath
    )

    Patch-TxniNestedMixinRemove `
        -JarPath $JarPath `
        -NestedJarPattern '*fabric-object-builder-api-v1-*.jar' `
        -ConfigPath 'fabric-object-builder-v1.mixins.json' `
        -Names @(
            'TradeOffersTypeAwareBuyForOneEmeraldFactoryMixin'
        )

    if (-not (Test-TxniTradePatch -JarPath $JarPath)) {
        throw 'La corrección de intercambios de TxniLib no se validó'
    }
}

$txniMixinMetadata = @(
    [PSCustomObject]@{
        NestedJarPatterns = @(
            'META-INF/jars/fabric-api-*.jar',
            'META-INF/jarjar/fabric-item-group-api-v1-*.jar'
        )
        ConfigPath = 'fabric-item-group-api-v1.mixins.json'
        MinVersion = '0.8.5'
    },
    [PSCustomObject]@{
        NestedJarPatterns = @(
            'META-INF/jars/fabric-api-*.jar',
            'META-INF/jarjar/fabric-item-group-api-v1-*.jar'
        )
        ConfigPath = 'fabric-item-group-api-v1.client.mixins.json'
        MinVersion = '0.8.5'
    },
    [PSCustomObject]@{
        NestedJarPatterns = @(
            'META-INF/jars/fabric-api-*.jar',
            'META-INF/jarjar/fabric-item-api-v1-*.jar'
        )
        ConfigPath = 'fabric-item-api-v1.client.mixins.json'
        MinVersion = '0.8.5'
    },
    [PSCustomObject]@{
        NestedJarPatterns = @(
            'META-INF/jars/fabric-api-*.jar',
            'META-INF/jarjar/fabric-data-attachment-api-v1-*.jar'
        )
        ConfigPath = 'fabric-data-attachment-api-v1.mixins.json'
        MinVersion = '0.8.5'
    },
    [PSCustomObject]@{
        NestedJarPatterns = @(
            'META-INF/jars/fabric-api-*.jar',
            'META-INF/jarjar/fabric-data-attachment-api-v1-*.jar'
        )
        ConfigPath = 'fabric-data-attachment-api-v1.client.mixins.json'
        MinVersion = '0.8.5'
    }
)

function Get-ZipEntryBytes {
    param(
        [System.IO.Compression.ZipArchiveEntry]$Entry
    )

    $memory = [System.IO.MemoryStream]::new()
    $stream = $Entry.Open()

    try {
        $stream.CopyTo($memory)
        return (, $memory.ToArray())
    }
    finally {
        $stream.Dispose()
        $memory.Dispose()
    }
}

function Get-NestedJsonConfig {
    param(
        [string]$JarPath,
        [string[]]$NestedJarPatterns,
        [string]$ConfigPath
    )

    [byte[]]$archiveBytes = [System.IO.File]::ReadAllBytes($JarPath)

    foreach ($pattern in $NestedJarPatterns) {
        $memory = [System.IO.MemoryStream]::new()
        $memory.Write($archiveBytes, 0, $archiveBytes.Length)
        $memory.Position = 0

        $zip = [System.IO.Compression.ZipArchive]::new(
            $memory,
            [System.IO.Compression.ZipArchiveMode]::Read,
            $true
        )

        try {
            $entry = $zip.Entries |
                Where-Object {
                    $_.FullName -like $pattern
                } |
                Select-Object -First 1

            if (-not $entry) {
                throw "No se encontró el JAR interno: $pattern"
            }

            [byte[]]$archiveBytes = Get-ZipEntryBytes -Entry $entry
        }
        finally {
            $zip.Dispose()
            $memory.Dispose()
        }
    }

    $memory = [System.IO.MemoryStream]::new()
    $memory.Write($archiveBytes, 0, $archiveBytes.Length)
    $memory.Position = 0

    $zip = [System.IO.Compression.ZipArchive]::new(
        $memory,
        [System.IO.Compression.ZipArchiveMode]::Read,
        $true
    )

    try {
        $entry = $zip.GetEntry($ConfigPath)

        if (-not $entry) {
            throw "No se encontró la configuración Mixin: $ConfigPath"
        }

        $reader = [System.IO.StreamReader]::new($entry.Open())

        try {
            return $reader.ReadToEnd() | ConvertFrom-Json
        }
        finally {
            $reader.Dispose()
        }
    }
    finally {
        $zip.Dispose()
        $memory.Dispose()
    }
}

function Test-NestedMixinMinVersion {
    param(
        [string]$JarPath,
        [string[]]$NestedJarPatterns,
        [string]$ConfigPath,
        [string]$MinVersion
    )

    $config = Get-NestedJsonConfig `
        -JarPath $JarPath `
        -NestedJarPatterns $NestedJarPatterns `
        -ConfigPath $ConfigPath

    return $config.minVersion -eq $MinVersion
}

function Set-NestedJsonMinVersionBytes {
    param(
        [byte[]]$ArchiveBytes,
        [string[]]$NestedJarPatterns,
        [string]$ConfigPath,
        [string]$MinVersion
    )

    $memory = [System.IO.MemoryStream]::new()
    $memory.Write($ArchiveBytes, 0, $ArchiveBytes.Length)
    $memory.Position = 0

    $zip = [System.IO.Compression.ZipArchive]::new(
        $memory,
        [System.IO.Compression.ZipArchiveMode]::Update,
        $true
    )

    try {
        if ($NestedJarPatterns.Count -gt 0) {
            $pattern = $NestedJarPatterns[0]
            $entry = $zip.Entries |
                Where-Object {
                    $_.FullName -like $pattern
                } |
                Select-Object -First 1

            if (-not $entry) {
                throw "No se encontró el JAR interno: $pattern"
            }

            $entryPath = $entry.FullName
            [byte[]]$nestedBytes = Get-ZipEntryBytes -Entry $entry
            [string[]]$remainingPatterns = @(
                $NestedJarPatterns | Select-Object -Skip 1
            )

            [byte[]]$updatedNestedBytes =
                Set-NestedJsonMinVersionBytes `
                    -ArchiveBytes $nestedBytes `
                    -NestedJarPatterns $remainingPatterns `
                    -ConfigPath $ConfigPath `
                    -MinVersion $MinVersion

            $entry.Delete()
            $newEntry = $zip.CreateEntry(
                $entryPath,
                [System.IO.Compression.CompressionLevel]::Optimal
            )
            $stream = $newEntry.Open()

            try {
                $stream.Write(
                    $updatedNestedBytes,
                    0,
                    $updatedNestedBytes.Length
                )
            }
            finally {
                $stream.Dispose()
            }
        }
        else {
            $entry = $zip.GetEntry($ConfigPath)

            if (-not $entry) {
                throw "No se encontró la configuración Mixin: $ConfigPath"
            }

            $reader = [System.IO.StreamReader]::new($entry.Open())

            try {
                $config = $reader.ReadToEnd() | ConvertFrom-Json
            }
            finally {
                $reader.Dispose()
            }

            $config | Add-Member `
                -NotePropertyName 'minVersion' `
                -NotePropertyValue $MinVersion `
                -Force

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
        }

        $zip.Dispose()
        $zip = $null

        return (, $memory.ToArray())
    }
    finally {
        if ($zip) {
            $zip.Dispose()
        }

        $memory.Dispose()
    }
}

function Patch-NestedMixinMinVersion {
    param(
        [string]$JarPath,
        [string[]]$NestedJarPatterns,
        [string]$ConfigPath,
        [string]$MinVersion
    )

    $workPath = "$JarPath.nexus-minversion-patch.tmp"
    [byte[]]$archiveBytes = [System.IO.File]::ReadAllBytes($JarPath)
    [byte[]]$updatedBytes = Set-NestedJsonMinVersionBytes `
        -ArchiveBytes $archiveBytes `
        -NestedJarPatterns $NestedJarPatterns `
        -ConfigPath $ConfigPath `
        -MinVersion $MinVersion

    try {
        [System.IO.File]::WriteAllBytes($workPath, $updatedBytes)

        if (
            -not (
                Test-NestedMixinMinVersion `
                    -JarPath $workPath `
                    -NestedJarPatterns $NestedJarPatterns `
                    -ConfigPath $ConfigPath `
                    -MinVersion $MinVersion
            )
        ) {
            throw "No se validó minVersion en $ConfigPath"
        }

        Move-Item `
            -LiteralPath $workPath `
            -Destination $JarPath `
            -Force
    }
    finally {
        if (Test-Path -LiteralPath $workPath) {
            Remove-Item -LiteralPath $workPath -Force
        }
    }
}

function Test-FragmentumBundlePatch {
    param(
        [string]$JarPath
    )

    return (
        (
            Test-RootMixinMove `
                -JarPath $JarPath `
                -ConfigPath 'fragmentum.mixins.json' `
                -Names @('MixinMinecraft')
        ) -and
        (
            Test-NestedMixinMinVersion `
                -JarPath $JarPath `
                -NestedJarPatterns @(
                    'META-INF/jarjar/yet-another-config-lib-*.jar'
                ) `
                -ConfigPath 'yacl.mixins.json' `
                -MinVersion '0.8'
        )
    )
}

function Patch-FragmentumBundle {
    param(
        [string]$JarPath
    )

    if (
        -not (
            Test-RootMixinMove `
                -JarPath $JarPath `
                -ConfigPath 'fragmentum.mixins.json' `
                -Names @('MixinMinecraft')
        )
    ) {
        Patch-RootMixinMove `
            -JarPath $JarPath `
            -ConfigPath 'fragmentum.mixins.json' `
            -Names @('MixinMinecraft')
    }

    if (
        -not (
            Test-NestedMixinMinVersion `
                -JarPath $JarPath `
                -NestedJarPatterns @(
                    'META-INF/jarjar/yet-another-config-lib-*.jar'
                ) `
                -ConfigPath 'yacl.mixins.json' `
                -MinVersion '0.8'
        )
    ) {
        Patch-NestedMixinMinVersion `
            -JarPath $JarPath `
            -NestedJarPatterns @(
                'META-INF/jarjar/yet-another-config-lib-*.jar'
            ) `
            -ConfigPath 'yacl.mixins.json' `
            -MinVersion '0.8'
    }

    if (-not (Test-FragmentumBundlePatch -JarPath $JarPath)) {
        throw 'La corrección completa de Fragmentum no se validó'
    }
}

function Patch-TxniBundle {
    param(
        [string]$JarPath
    )

    if (-not (Test-TxniScreenPatch -JarPath $JarPath)) {
        Patch-TxniScreenApi -JarPath $JarPath
    }

    if (-not (Test-TxniTradePatch -JarPath $JarPath)) {
        Patch-TxniTradeApi -JarPath $JarPath
    }

    foreach ($metadata in $txniMixinMetadata) {
        if (
            -not (
                Test-NestedMixinMinVersion `
                    -JarPath $JarPath `
                    -NestedJarPatterns $metadata.NestedJarPatterns `
                    -ConfigPath $metadata.ConfigPath `
                    -MinVersion $metadata.MinVersion
            )
        ) {
            Patch-NestedMixinMinVersion `
                -JarPath $JarPath `
                -NestedJarPatterns $metadata.NestedJarPatterns `
                -ConfigPath $metadata.ConfigPath `
                -MinVersion $metadata.MinVersion
        }
    }

    if (-not (Test-TxniBundlePatch -JarPath $JarPath)) {
        throw 'La corrección completa de TxniLib no se validó'
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
        Name         = 'TxniLib Fabric API server compatibility'
        File         = 'txnilib-forge-1.0.24-1.20.1.jar'
        OriginalHash = '71CA69345EF763903213E0B0DB3C9C07D2A090AD311D1DE66C31798A813A9D0E'
        Kind         = 'TxniBundle'
        Config       = ''
        Names        = @('MouseMixin', 'ScreenAccessor')
        IntermediateHashes = @(
            'B9D1A7E1D68E4EBFC5353D4812213BFEBD5F1043AA676C20D7745800779FE2E4'
        )
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
        Name         = 'Fragmentum server compatibility'
        File         = 'fragmentum-forge-1.20.1-1.3.0.jar'
        OriginalHash = 'BE2E501DDC44EC9E899C8A76F0DC1C302FE786E5ACA4A517C564228EE8DB532E'
        Kind         = 'FragmentumBundle'
        Config       = 'fragmentum.mixins.json'
        Names        = @('MixinMinecraft')
        IntermediateHashes = @(
            '6B50D1C6F78907486409F6DE7C074626CBCB7450F34C0BAE822838E2BDF3BE7E'
        )
    },
    [PSCustomObject]@{
        Name         = 'FamiliarsLib item renderer mixin'
        File         = 'familiarslib-1.20.1-1.6.jar'
        OriginalHash = 'DA9D2FE1B8D861DF8AEC6D75FF54277DB469A301E23689B8A9C9E173B1247610'
        Kind         = 'RootMixin'
        Config       = 'familiarslib.mixins.json'
        Names        = @('ItemTransformMixin')
    },
    [PSCustomObject]@{
        Name         = 'Starcatcher Artifacts data map'
        File         = 'starcatcher-2.3.17-FORGE-1.20.1.jar'
        OriginalHash = '3A261C4CDD10D75AA0744268C0C867CE3945D237713A6C199E0D1428A7D754D6'
        Kind         = 'JsonMapKeyRemove'
        Config       = 'data/starcatcher/data_maps/item/catch_modifiers.json'
        Names        = @('artifacts:anglers_hat')
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

        'TxniBundle' {
            Test-TxniBundlePatch -JarPath $jarPath
        }

        'FragmentumBundle' {
            Test-FragmentumBundlePatch -JarPath $jarPath
        }

        'JsonMapKeyRemove' {
            Test-JsonMapKeysMissing `
                -JarPath $jarPath `
                -ConfigPath $patch.Config `
                -Names $patch.Names
        }

        default {
            throw "Tipo de parche desconocido: $($patch.Kind)"
        }
    }

    if ($isPatched) {
        Write-Output "[OK] $($patch.Name): ya está corregido."
        continue
    }

    $allowKnownMigration = $false
    $expectedBackupPath = $null

    $canMigrateIntermediate =
        $hash -in @($patch.IntermediateHashes)

    if ($patch.Kind -eq 'TxniBundle') {
        $screenPatched = Test-TxniScreenPatch `
            -JarPath $jarPath

        $tradePatched = Test-TxniTradePatch `
            -JarPath $jarPath

        $canMigrateIntermediate =
            $canMigrateIntermediate -or
            ($screenPatched -xor $tradePatched)
    }

    if ($canMigrateIntermediate) {
        $file = Get-Item -LiteralPath $jarPath

        $backupName = '{0}.original-{1}.jar' -f `
            $file.BaseName,
            $patch.OriginalHash

        $expectedBackupPath = Join-Path `
            $backupRoot `
            $backupName

        if (
            (Test-Path -LiteralPath $expectedBackupPath) -and
            (
                (Get-Sha256 -Path $expectedBackupPath) -eq
                $patch.OriginalHash
            )
        ) {
            $allowKnownMigration = $true
        }
    }

    if (
        $hash -ne $patch.OriginalHash -and
        -not $allowKnownMigration
    ) {
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

    if ($allowKnownMigration) {
        $backupPath = $expectedBackupPath
    }
    else {
        $backupPath = New-OriginalBackup `
            -JarPath $jarPath `
            -OriginalHash $hash
    }

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

        'TxniBundle' {
            Patch-TxniBundle -JarPath $jarPath
        }

        'FragmentumBundle' {
            Patch-FragmentumBundle -JarPath $jarPath
        }

        'JsonMapKeyRemove' {
            Patch-JsonMapKeysRemove `
                -JarPath $jarPath `
                -ConfigPath $patch.Config `
                -Names $patch.Names
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
