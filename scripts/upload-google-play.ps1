# ============================================
# upload-google-play.ps1
# העלאת AAB לגוגל פליי (Google Play Console)
# ============================================
#
# דרישות מוקדמות:
# 1. חשבון Google Play Developer (https://play.google.com/console)
# 2. Service Account JSON key (ראה הוראות למטה)
# 3. Python + google-api-python-client (או שתשתמש ב-API ישיר)
#
# שימוש:
#   .\scripts\upload-google-play.ps1                          # העלאה ל-internal track
#   .\scripts\upload-google-play.ps1 -track alpha             # העלאה ל-alpha
#   .\scripts\upload-google-play.ps1 -track beta              # העלאה ל-beta
#   .\scripts\upload-google-play.ps1 -track production        # העלאה ל-production
#   .\scripts\upload-google-play.ps1 -track production -build # בנייה + העלאה
# ============================================

param(
    [ValidateSet("internal", "alpha", "beta", "production")]
    [string]$track = "internal",
    [string]$serviceAccountKey = "scripts/google-play-service-account.json",
    [string]$aabPath = "android/app/build/outputs/bundle/release/app-release.aab",
    [switch]$build,
    [string]$releaseNotes = ""
)

$ErrorActionPreference = "Stop"

$packageName = "com.torahapp.pash"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  העלאה לגוגל פליי - חמישה חומשי תורה" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Step 1: Validate prerequisites ----------
Write-Host "[1/5] בדיקת דרישות מוקדמות..." -ForegroundColor Yellow

# Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $python) {
    Write-Host ""
    Write-Host "Python לא נמצא! התקן Python ונסה שוב." -ForegroundColor Red
    Write-Host "https://www.python.org/downloads/" -ForegroundColor Gray
    exit 1
}
Write-Host "  Python: $($python.Source)" -ForegroundColor Gray

# Check service account key
if (-not (Test-Path $serviceAccountKey)) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Red
    Write-Host "  חסר קובץ Service Account Key!" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  כדי להעלות לגוגל פליי באופן אוטומטי, צריך:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. לך ל-Google Play Console:" -ForegroundColor White
    Write-Host "     https://play.google.com/console" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Settings > API access > Create Service Account" -ForegroundColor White
    Write-Host ""
    Write-Host "  3. ב-Google Cloud Console:" -ForegroundColor White
    Write-Host "     - צור Service Account חדש" -ForegroundColor Gray
    Write-Host "     - הוסף Role: 'Service Account User'" -ForegroundColor Gray
    Write-Host "     - צור JSON Key והורד אותו" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. חזור ל-Google Play Console:" -ForegroundColor White
    Write-Host "     - Grant access ל-Service Account" -ForegroundColor Gray
    Write-Host "     - הוסף הרשאה: 'Release to production'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  5. שמור את קובץ ה-JSON בנתיב:" -ForegroundColor White
    Write-Host "     $serviceAccountKey" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  לחילופין, תוכל להעלות ידנית:" -ForegroundColor Yellow
    Write-Host "     https://play.google.com/console" -ForegroundColor Gray
    Write-Host "     > App > Production > Create new release" -ForegroundColor Gray
    Write-Host "     > Upload AAB: $aabPath" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
Write-Host "  Service Account Key: $serviceAccountKey" -ForegroundColor Gray

# ---------- Step 2: Build if requested ----------
if ($build) {
    Write-Host ""
    Write-Host "[2/5] בונה AAB..." -ForegroundColor Yellow
    & "$PSScriptRoot\build-android.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "שגיאה בבנייה!" -ForegroundColor Red
        exit 1
    }
}

# Check AAB exists
if (-not (Test-Path $aabPath)) {
    Write-Host ""
    Write-Host "AAB לא נמצא: $aabPath" -ForegroundColor Red
    Write-Host "הרץ קודם: .\scripts\build-android.ps1" -ForegroundColor Yellow
    exit 1
}
$aabSize = [math]::Round((Get-Item $aabPath).Length / 1MB, 2)
Write-Host "  AAB: $aabPath ($aabSize MB)" -ForegroundColor Gray

# ---------- Step 3: Install Python dependencies ----------
Write-Host ""
Write-Host "[3/5] מוודא תלויות Python..." -ForegroundColor Yellow
& python -m pip install --quiet --upgrade google-api-python-client google-auth-httplib2 google-auth-oauthlib 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  מתקין google-api-python-client..." -ForegroundColor Gray
    & python -m pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
}
Write-Host "  תלויות מותקנות" -ForegroundColor Green

# ---------- Step 4: Create upload Python script ----------
Write-Host ""
Write-Host "[4/5] מעלה ל-Track: $track..." -ForegroundColor Yellow

$uploadScript = @"
import sys
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SERVICE_ACCOUNT_KEY = sys.argv[1]
PACKAGE_NAME = sys.argv[2]
AAB_PATH = sys.argv[3]
TRACK = sys.argv[4]
RELEASE_NOTES = sys.argv[5] if len(sys.argv) > 5 else ""

SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

print(f"  Package: {PACKAGE_NAME}")
print(f"  Track: {TRACK}")
print(f"  AAB: {AAB_PATH}")

# Authenticate
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_KEY, scopes=SCOPES
)

service = build('androidpublisher', 'v3', credentials=credentials)

try:
    # Create edit
    edit = service.edits().insert(body={}, packageName=PACKAGE_NAME).execute()
    edit_id = edit['id']
    print(f"  Edit ID: {edit_id}")

    # Upload AAB
    print("  מעלה AAB...")
    media = MediaFileUpload(AAB_PATH, mimetype='application/octet-stream', resumable=True)
    upload = service.edits().bundles().upload(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        media_body=media
    ).execute()
    
    version_code = upload['versionCode']
    print(f"  Version Code: {version_code}")

    # Assign to track
    release_body = {
        'releases': [{
            'versionCodes': [version_code],
            'status': 'completed',
        }]
    }

    if RELEASE_NOTES:
        release_body['releases'][0]['releaseNotes'] = [{
            'language': 'he',
            'text': RELEASE_NOTES
        }]

    service.edits().tracks().update(
        packageName=PACKAGE_NAME,
        editId=edit_id,
        track=TRACK,
        body=release_body
    ).execute()
    print(f"  Track '{TRACK}' updated")

    # Commit
    service.edits().commit(
        packageName=PACKAGE_NAME,
        editId=edit_id
    ).execute()
    
    print("")
    print("  ======================================")
    print("  העלאה הושלמה בהצלחה!")
    print(f"  Version Code: {version_code}")
    print(f"  Track: {TRACK}")
    print("  ======================================")

except Exception as e:
    print(f"  שגיאה: {e}", file=sys.stderr)
    sys.exit(1)
"@

$tempScript = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.py'
Set-Content -Path $tempScript -Value $uploadScript -Encoding UTF8

try {
    & python $tempScript $serviceAccountKey $packageName $aabPath $track $releaseNotes
    $uploadExitCode = $LASTEXITCODE
} finally {
    Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
}

if ($uploadExitCode -ne 0) {
    Write-Host ""
    Write-Host "שגיאה בהעלאה!" -ForegroundColor Red
    Write-Host ""
    Write-Host "אפשרויות:" -ForegroundColor Yellow
    Write-Host "  1. העלאה ידנית: https://play.google.com/console" -ForegroundColor Gray
    Write-Host "     > App > $track > Create new release > Upload $aabPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. בדוק את ה-Service Account Key ואת ההרשאות" -ForegroundColor Gray
    exit 1
}

# ---------- Step 5: Done ----------
Write-Host ""
Write-Host "[5/5] סיום" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ההעלאה לגוגל פליי הושלמה!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  צפה בסטטוס:" -ForegroundColor White
Write-Host "  https://play.google.com/console" -ForegroundColor Cyan
Write-Host ""

if ($track -eq "internal") {
    Write-Host "  הגרסה הועלתה ל-Internal Testing." -ForegroundColor Yellow
    Write-Host "  כדי להעלות ל-Production:" -ForegroundColor Yellow
    Write-Host "  .\scripts\upload-google-play.ps1 -track production" -ForegroundColor Gray
}
Write-Host ""
