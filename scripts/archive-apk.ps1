# Archive APK with running version number
# Usage: .\scripts\archive-apk.ps1

$apkDir = Join-Path $PSScriptRoot "..\APK"
$sourceApk = Join-Path $PSScriptRoot "..\android-omer\app\build\outputs\apk\debug\omer-sfirat-haomer-v1.0-debug.apk"

if (-not (Test-Path $sourceApk)) {
    Write-Host "APK not found: $sourceApk" -ForegroundColor Red
    exit 1
}

# Find next version number
$existing = Get-ChildItem $apkDir -Filter "omer-v*.apk" -ErrorAction SilentlyContinue |
    ForEach-Object { if ($_.Name -match 'omer-v(\d+)\.apk') { [int]$Matches[1] } } |
    Sort-Object -Descending |
    Select-Object -First 1

$next = if ($existing) { $existing + 1 } else { 1 }
$destName = "omer-v$next.apk"
$destPath = Join-Path $apkDir $destName

Copy-Item $sourceApk $destPath
$size = [math]::Round((Get-Item $destPath).Length / 1MB, 1)
Write-Host "Archived: APK\$destName ($size MB)" -ForegroundColor Green
