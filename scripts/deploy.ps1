# ============================================================
# deploy.ps1 - Full automated build & upload to Google Play
# ============================================================
# Usage:
#   .\scripts\deploy.ps1                        # bump patch, upload to internal
#   .\scripts\deploy.ps1 -track production      # upload to production
#   .\scripts\deploy.ps1 -bump minor            # bump minor version (1.4 -> 1.5)
#   .\scripts\deploy.ps1 -bump major            # bump major version (1.x -> 2.0)
#   .\scripts\deploy.ps1 -noUpload              # build only, no upload
# ============================================================

param(
    [ValidateSet("patch", "minor", "major")]
    [string]$bump = "patch",
    [ValidateSet("internal", "alpha", "beta", "production")]
    [string]$track = "internal",
    [switch]$noUpload,
    [string]$serviceAccountKey = "$PSScriptRoot\google-play-service-account.json"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Write-Step($n, $total, $msg) {
    Write-Host ""
    Write-Host "[$n/$total] $msg" -ForegroundColor Cyan
}
function Write-Ok($msg)  { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Err($msg) { Write-Host "  [!]  $msg" -ForegroundColor Red; exit 1 }

$totalSteps = if ($noUpload) { 4 } else { 5 }

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  Torah App - Automated Deploy to Google Play" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

# ── Step 1: Bump version ──────────────────────────────────────────
Write-Step 1 $totalSteps "Bumping version ($bump)"

$buildGradlePath = "android\app\build.gradle"
$packageJsonPath  = "package.json"

# Read current values from build.gradle
$gradleContent   = Get-Content $buildGradlePath -Raw
$currentCode     = [int]($gradleContent | Select-String 'versionCode (\d+)').Matches.Groups[1].Value
$currentName     = ($gradleContent | Select-String 'versionName "([^"]+)"').Matches.Groups[1].Value

$parts           = $currentName -split '\.'
$major           = [int]$parts[0]
$minor           = [int]$parts[1]
$patch           = [int]($parts.Count -gt 2 ? $parts[2] : 0)

switch ($bump) {
    "major" { $major++; $minor = 0; $patch = 0 }
    "minor" { $minor++; $patch = 0 }
    "patch" { $patch++ }
}

$newCode = $currentCode + 1
$newName = "$major.$minor.$patch"

Write-Host "  Version: $currentName (code $currentCode)  ->  $newName (code $newCode)" -ForegroundColor White

# Update build.gradle
$gradleContent = $gradleContent -replace "versionCode $currentCode", "versionCode $newCode"
$gradleContent = $gradleContent -replace "versionName `"$currentName`"", "versionName `"$newName`""
Set-Content $buildGradlePath $gradleContent -Encoding UTF8

# Update package.json
$pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$pkg.version = $newName
$pkg | ConvertTo-Json -Depth 20 | Set-Content $packageJsonPath -Encoding UTF8

Write-Ok "Version bumped to $newName (versionCode $newCode)"

# ── Step 2: Build web ────────────────────────────────────────────
Write-Step 2 $totalSteps "Building web app (npm run build)"

npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Web build failed" }
Write-Ok "Web build complete"

# ── Step 3: Capacitor sync ───────────────────────────────────────
Write-Step 3 $totalSteps "Syncing Capacitor"

npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Err "Capacitor sync failed" }
Write-Ok "Capacitor sync complete"

# ── Step 4: Build signed AAB ─────────────────────────────────────
Write-Step 4 $totalSteps "Building signed AAB (bundleRelease)"

if (-not (Test-Path "android\app\signing.properties")) {
    Write-Err "Missing android\app\signing.properties - run .\scripts\generate-keystore.ps1 first"
}

Push-Location android
& .\gradlew.bat bundleRelease 2>&1
$gradleExit = $LASTEXITCODE
Pop-Location

if ($gradleExit -ne 0) { Write-Err "Gradle bundleRelease failed" }

$aabPath = "android\app\build\outputs\bundle\release\app-release.aab"
$aabSize = [math]::Round((Get-Item $aabPath).Length / 1MB, 1)
Write-Ok "AAB built: $aabPath ($aabSize MB)"

# Copy to google-play-upload
Copy-Item $aabPath "google-play-upload\aab\torah-app-release.aab" -Force
Write-Ok "Copied to google-play-upload\aab\"

if ($noUpload) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Build complete (no upload)" -ForegroundColor Green
    Write-Host "  AAB: $aabPath" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Green
    exit 0
}

# ── Step 5: Upload to Google Play ────────────────────────────────
Write-Step 5 $totalSteps "Uploading to Google Play (track: $track)"

if (-not (Test-Path $serviceAccountKey)) {
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Red
    Write-Host "  Missing Service Account Key!" -ForegroundColor Red
    Write-Host "  ============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  To enable automatic upload, follow these steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Go to: https://play.google.com/console" -ForegroundColor White
    Write-Host "     Setup > API access > Link to Google Cloud project" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Click 'Create new service account'" -ForegroundColor White
    Write-Host "     -> Google Cloud Console opens automatically" -ForegroundColor Gray
    Write-Host "     -> Click 'CREATE SERVICE ACCOUNT'" -ForegroundColor Gray
    Write-Host "     -> Name: 'play-deploy'" -ForegroundColor Gray
    Write-Host "     -> Role: 'Service Account User'" -ForegroundColor Gray
    Write-Host "     -> Click 'KEYS' tab > 'ADD KEY' > 'Create new key' > JSON" -ForegroundColor Gray
    Write-Host "     -> Download the JSON file" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Back in Play Console:" -ForegroundColor White
    Write-Host "     -> Grant access to the service account" -ForegroundColor Gray
    Write-Host "     -> App permissions: 'Release to production, exclude devices, and use app signing by Google Play'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. Save the JSON file to:" -ForegroundColor White
    Write-Host "     $serviceAccountKey" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Then run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  AAB is ready for manual upload:" -ForegroundColor White
    Write-Host "  $aabPath" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Ensure Python packages
Write-Host "  Checking Python dependencies..." -ForegroundColor Gray
python -m pip install --quiet --upgrade google-api-python-client google-auth-httplib2 google-auth-oauthlib 2>&1 | Out-Null
Write-Ok "Python dependencies ready"

# Release notes
$releaseNotesHe = "גרסה $newName`n* שיפורי ביצועים ותיקוני באגים"
$releaseNotesEn = "Version $newName`n* Performance improvements and bug fixes"

$uploadScript = @"
import sys, json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

key_file, pkg, aab_path, track, notes_he, notes_en = sys.argv[1:7]
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

creds = service_account.Credentials.from_service_account_file(key_file, scopes=SCOPES)
service = build('androidpublisher', 'v3', credentials=creds)

print(f'  Package : {pkg}')
print(f'  Track   : {track}')
print(f'  AAB     : {aab_path}')

edit = service.edits().insert(body={}, packageName=pkg).execute()
eid  = edit['id']

media  = MediaFileUpload(aab_path, mimetype='application/octet-stream', resumable=True)
upload = service.edits().bundles().upload(packageName=pkg, editId=eid, media_body=media).execute()
vc = upload['versionCode']
print(f'  Uploaded versionCode: {vc}')

release_body = {
    'releases': [{
        'versionCodes': [str(vc)],
        'status': 'completed',
        'releaseNotes': [
            {'language': 'he-IL', 'text': notes_he},
            {'language': 'en-US', 'text': notes_en},
        ]
    }]
}
service.edits().tracks().update(packageName=pkg, editId=eid, track=track, body=release_body).execute()
service.edits().commit(packageName=pkg, editId=eid).execute()
print(f'  Committed to track: {track}')
"@

$tmpPy = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.py'
Set-Content $tmpPy $uploadScript -Encoding UTF8

try {
    python $tmpPy $serviceAccountKey "com.torahapp.pash" $aabPath $track $releaseNotesHe $releaseNotesEn
    $uploadExit = $LASTEXITCODE
} finally {
    Remove-Item $tmpPy -Force -ErrorAction SilentlyContinue
}

if ($uploadExit -ne 0) {
    Write-Err "Upload failed - check service account permissions"
}

# ── Git commit & push ─────────────────────────────────────────────
Write-Host ""
Write-Host "  Committing version bump to git..." -ForegroundColor Gray
git add android\app\build.gradle package.json google-play-upload\aab\torah-app-release.aab
git commit -m "release: v$newName (versionCode $newCode) - deployed to $track"
git push origin main

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Deployed successfully!" -ForegroundColor Green
Write-Host "  Version : $newName (code $newCode)" -ForegroundColor White
Write-Host "  Track   : $track" -ForegroundColor White
Write-Host "  View    : https://play.google.com/console" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
