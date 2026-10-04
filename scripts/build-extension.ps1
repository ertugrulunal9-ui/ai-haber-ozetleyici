# Builds a distributable copy of the extension on Windows (no bash needed).
# Same output as scripts/build-extension.sh: dist/extension/
#
# Usage (PowerShell, from the repository root):
#   $env:SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xxx"
#   $env:EXTENSION_PUBLIC_KEY = "MIIBIjANBg..."   # optional, see below
#   powershell -ExecutionPolicy Bypass -File scripts\build-extension.ps1
#
# EXTENSION_PUBLIC_KEY (optional) is the Chrome Web Store item's public key.
# When set, it is written to the built manifest as "key", so an unpacked load
# of dist/extension gets the same extension ID as the store version. Leave it
# unset when building the zip you upload to the store.

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $rootDir "extension"
$distDir = Join-Path $rootDir "dist\extension"
$placeholder = "__SUPABASE_PUBLISHABLE_KEY__"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$publishableKey = "$env:SUPABASE_PUBLISHABLE_KEY".Trim()
if (-not $publishableKey) {
  Write-Error "SUPABASE_PUBLISHABLE_KEY is required."
  exit 1
}

# Clean and copy
if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
New-Item -ItemType Directory -Force $distDir | Out-Null
Copy-Item -Recurse (Join-Path $srcDir "*") $distDir

$backgroundFile = Join-Path $distDir "background\background.js"
$background = [IO.File]::ReadAllText($backgroundFile).Replace($placeholder, $publishableKey)
[IO.File]::WriteAllText($backgroundFile, $background, $utf8NoBom)

if ($background.Contains($placeholder)) {
  Write-Error "The publishable key was not written to background.js."
  exit 1
}

# Drop the BEGIN/END lines (whatever their dash count) and line breaks.
# Case-sensitive operators on purpose: the case-insensitive ones fold case
# with the current culture, and under Turkish "I" no longer matches [A-Za-z]
# in Windows PowerShell 5.1.
$extensionKey = ("$env:EXTENSION_PUBLIC_KEY" -creplace "-+\s*(BEGIN|END)[^-]*-+", "") -creplace "\s", ""
if ($extensionKey) {
  if ($extensionKey -cnotmatch "^[A-Za-z0-9+/]{200,}={0,2}$") {
    Write-Error "EXTENSION_PUBLIC_KEY is not a valid base64 public key."
    exit 1
  }
  $manifestFile = Join-Path $distDir "manifest.json"
  $manifest = [IO.File]::ReadAllText($manifestFile)
  $brace = $manifest.IndexOf("{")
  $manifest = $manifest.Insert($brace + 1, "`n  `"key`": `"$extensionKey`",")
  [IO.File]::WriteAllText($manifestFile, $manifest, $utf8NoBom)
  Write-Host "Pinned the extension ID with EXTENSION_PUBLIC_KEY."
}

Write-Host "Extension built successfully in $distDir"
