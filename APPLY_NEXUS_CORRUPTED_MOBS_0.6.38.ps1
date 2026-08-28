param(
    [string]$Repo
)

if ([string]::IsNullOrWhiteSpace($Repo)) {
    $Repo = $PSScriptRoot
}

$ErrorActionPreference = "Stop"

Write-Host "=== Nexus Realms - Corrupted Mobs 0.6.38 ==="

if (!(Test-Path -LiteralPath $Repo)) {
    throw "Repo no encontrado: $Repo"
}

$module = Join-Path $Repo "nexus-core"
$buildGradle = Join-Path $module "build.gradle"
$nexusCoreJava = Join-Path $module "src\main\java\dev\itscarlos\nexuscore\NexusCore.java"
$payload = Join-Path $PSScriptRoot "files\nexus-core"

foreach ($required in @($buildGradle, $nexusCoreJava, $payload)) {
    if (!(Test-Path -LiteralPath $required)) {
        throw "Falta: $required"
    }
}

Write-Host "`n[1/5] Copiando renderer y tags..."

$sourceFiles = @(
    "src\main\java\dev\itscarlos\nexuscore\client\NexusCorruptedMobRenderer.java",
    "src\main\resources\data\nexuscore\tags\entity_types\corruption_immune.json",
    "src\main\resources\data\nexuscore\tags\entity_types\force_corrupted.json"
)

foreach ($relative in $sourceFiles) {
    $src = Join-Path $payload $relative
    $dst = Join-Path $module $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Force
    Write-Host "  OK $relative"
}

Write-Host "`n[2/5] Actualizando version 0.6.37 -> 0.6.38..."

$gradleText = Get-Content -LiteralPath $buildGradle -Raw
$coreText = Get-Content -LiteralPath $nexusCoreJava -Raw

if ($gradleText -notmatch "0\.6\.38") {
    if ($gradleText -notmatch "0\.6\.37") {
        throw "build.gradle no contiene 0.6.37/0.6.38."
    }
    $gradleText = $gradleText -replace "0\.6\.37", "0.6.38"
    Set-Content -LiteralPath $buildGradle -Value $gradleText -Encoding UTF8
}

if ($coreText -notmatch 'BUILD_ID\s*=\s*"0\.6\.38"') {
    if ($coreText -notmatch 'BUILD_ID\s*=\s*"0\.6\.37"') {
        throw "NexusCore.java no contiene BUILD_ID 0.6.37/0.6.38."
    }
    $coreText = $coreText -replace 'BUILD_ID\s*=\s*"0\.6\.37"', 'BUILD_ID = "0.6.38"'
    Set-Content -LiteralPath $nexusCoreJava -Value $coreText -Encoding UTF8
}

Write-Host "  Version preparada: 0.6.38"

Write-Host "`n[3/5] git diff --check..."
Push-Location $Repo
try {
    git diff --check
    if ($LASTEXITCODE -ne 0) {
        throw "git diff --check ha fallado."
    }
}
finally {
    Pop-Location
}

Write-Host "`n[4/5] Compilando Nexus Core..."
Push-Location $module
try {
    & ".\gradlew.bat" --no-daemon --max-workers=1 clean check build --console=plain
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle ha fallado con codigo $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

$jar = Join-Path $module "build\libs\nexus-core-0.6.38.jar"

Write-Host "`n[5/5] Resultado..."
if (!(Test-Path -LiteralPath $jar)) {
    throw "No encuentro el JAR esperado: $jar"
}

Get-Item -LiteralPath $jar
Get-FileHash -LiteralPath $jar -Algorithm SHA256

Write-Host ""
Write-Host "OK: Nexus Core 0.6.38 compilado."
Write-Host "JAR: $jar"
Write-Host "No se ha copiado aun a Prism, SERVER_TEST ni repo\mods."
