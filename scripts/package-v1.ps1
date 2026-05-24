$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$ReleaseDir = Join-Path $Root 'release'
$StageDir = Join-Path $ReleaseDir 'aiko-v1-test'
$ZipPath = Join-Path $ReleaseDir 'aiko-v1-test.zip'

function Assert-InsideRoot($PathToCheck) {
  $resolvedRoot = [System.IO.Path]::GetFullPath($Root)
  $resolvedPath = [System.IO.Path]::GetFullPath($PathToCheck)
  if (-not $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Chemin refuse hors projet: $resolvedPath"
  }
}

Assert-InsideRoot $ReleaseDir
Assert-InsideRoot $StageDir
Assert-InsideRoot $ZipPath

Write-Host '[v1] Build desktop...'
Push-Location $Root
try {
  npm run desktop:build
} finally {
  Pop-Location
}

if (Test-Path $StageDir) {
  Assert-InsideRoot $StageDir
  Remove-Item -LiteralPath $StageDir -Recurse -Force
}

if (Test-Path $ZipPath) {
  Assert-InsideRoot $ZipPath
  Remove-Item -LiteralPath $ZipPath -Force
}

New-Item -ItemType Directory -Force -Path $StageDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $StageDir 'data') | Out-Null

$files = @(
  'package.json',
  'package-lock.json',
  'README.md',
  'COMMANDES.md',
  'ARCHITECTURE.md',
  'V1_TEST.md',
  'config.example.json',
  'bot.js',
  'console-app.js',
  'farm-config.js',
  'blueprint-utils.js'
)

foreach ($file in $files) {
  $source = Join-Path $Root $file
  if (Test-Path $source) {
    $target = Join-Path $StageDir $file
    New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
  }
}

$dirs = @(
  'src',
  'bot-core',
  'blueprints',
  'desktop',
  'server',
  'verification'
)

foreach ($dir in $dirs) {
  $source = Join-Path $Root $dir
  if (Test-Path $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $StageDir $dir) -Recurse -Force
  }
}

Copy-Item -LiteralPath (Join-Path $Root 'config.example.json') -Destination (Join-Path $StageDir 'config.json') -Force

$localFiles = @(
  'bot-memory.json',
  'server.log',
  'server.err.log',
  'data\desktop-settings.json'
)

foreach ($file in $localFiles) {
  $target = Join-Path $StageDir $file
  if (Test-Path $target) {
    Remove-Item -LiteralPath $target -Force
  }
}

Compress-Archive -Path (Join-Path $StageDir '*') -DestinationPath $ZipPath -Force

Write-Host "[v1] Archive creee: $ZipPath"
Write-Host '[v1] Ton ami peut extraire le zip, lancer npm install, puis npm run desktop.'
