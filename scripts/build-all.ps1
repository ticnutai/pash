$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Err($msg) { Write-Host "  [X] $msg" -ForegroundColor Red }

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

$releaseDir = Join-Path $projectDir "release-all"
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

Write-Step "1/3 Building desktop EXE"
npm run desktop:build
if ($LASTEXITCODE -ne 0) {
    Write-Err "Desktop EXE build failed"
    exit 1
}

$exePath = Join-Path $projectDir "release-desktop\Torah-App.exe"
if (-not (Test-Path $exePath)) {
    Write-Err "Desktop EXE not found at $exePath"
    exit 1
}

Copy-Item $exePath (Join-Path $releaseDir "Torah-App.exe") -Force
Write-Ok "Desktop EXE copied to release-all/Torah-App.exe"

Write-Step "2/3 Building Android Debug APK"
npm run android:build:debug
if ($LASTEXITCODE -ne 0) {
    Write-Err "Android debug build failed"
    exit 1
}

$apkPath = Join-Path $projectDir "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    Write-Err "Debug APK not found at $apkPath"
    exit 1
}

Copy-Item $apkPath (Join-Path $releaseDir "Torah-App-debug.apk") -Force
Write-Ok "Debug APK copied to release-all/Torah-App-debug.apk"

Write-Step "3/3 Final artifact summary"
Get-Item (Join-Path $releaseDir "Torah-App.exe"), (Join-Path $releaseDir "Torah-App-debug.apk") |
    Select-Object Name, Length, LastWriteTime |
    Format-Table -AutoSize

Write-Host "`nBuild all completed successfully." -ForegroundColor Green
