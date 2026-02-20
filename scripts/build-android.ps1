# ============================================
# build-android.ps1
# בניית APK / AAB לאנדרויד
# ============================================
# שימוש:
#   .\scripts\build-android.ps1              # בניית AAB (לגוגל פליי)
#   .\scripts\build-android.ps1 -apk         # בניית APK (להתקנה ישירה)
#   .\scripts\build-android.ps1 -debug       # בניית debug APK
# ============================================

param(
    [switch]$apk,
    [switch]$debug,
    [string]$versionName = "",
    [int]$versionCode = 0
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$projectRoot\capacitor.config.ts")) {
    $projectRoot = Get-Location
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  בניית אפליקציית אנדרויד - פש״ש" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build web app
Write-Host "[1/4] בונה את אפליקציית הווב..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "שגיאה בבניית האפליקציה!" -ForegroundColor Red
    exit 1
}
Write-Host "  בנייה הושלמה בהצלחה" -ForegroundColor Green

# Step 2: Sync Capacitor
Write-Host "[2/4] מסנכרן Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "שגיאה בסנכרון Capacitor!" -ForegroundColor Red
    exit 1
}
Write-Host "  סנכרון הושלם" -ForegroundColor Green

# Step 3: Update version if provided
if ($versionName -ne "" -or $versionCode -gt 0) {
    Write-Host "[2.5/4] מעדכן גרסה..." -ForegroundColor Yellow
    $buildGradle = Get-Content "android/app/build.gradle" -Raw
    if ($versionCode -gt 0) {
        $buildGradle = $buildGradle -replace 'versionCode \d+', "versionCode $versionCode"
    }
    if ($versionName -ne "") {
        $buildGradle = $buildGradle -replace 'versionName ".*?"', "versionName `"$versionName`""
    }
    Set-Content -Path "android/app/build.gradle" -Value $buildGradle -Encoding UTF8
    Write-Host "  גרסה עודכנה: versionName=$versionName versionCode=$versionCode" -ForegroundColor Green
}

# Step 4: Build Android
$androidDir = "android"
$gradlew = Join-Path $androidDir "gradlew.bat"
if (-not (Test-Path $gradlew)) {
    $gradlew = Join-Path $androidDir "gradlew"
}

if ($debug) {
    Write-Host "[3/4] בונה Debug APK..." -ForegroundColor Yellow
    Push-Location $androidDir
    & .\gradlew.bat assembleDebug
    Pop-Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "שגיאה בבניית APK!" -ForegroundColor Red
        exit 1
    }
    
    $outputPath = "android/app/build/outputs/apk/debug/app-debug.apk"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Debug APK נבנה בהצלחה!" -ForegroundColor Green
    Write-Host "  קובץ: $outputPath" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
    
} elseif ($apk) {
    # Check signing
    if (-not (Test-Path "android/app/signing.properties")) {
        Write-Host "חסר signing.properties! הרץ: .\scripts\generate-keystore.ps1" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[3/4] בונה Release APK חתום..." -ForegroundColor Yellow
    Push-Location $androidDir
    & .\gradlew.bat assembleRelease
    Pop-Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "שגיאה בבניית APK!" -ForegroundColor Red
        exit 1
    }
    
    $outputPath = "android/app/build/outputs/apk/release/app-release.apk"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Release APK נבנה בהצלחה!" -ForegroundColor Green
    Write-Host "  קובץ: $outputPath" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
    
} else {
    # AAB for Google Play
    if (-not (Test-Path "android/app/signing.properties")) {
        Write-Host "חסר signing.properties! הרץ: .\scripts\generate-keystore.ps1" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[3/4] בונה AAB (Android App Bundle) לגוגל פליי..." -ForegroundColor Yellow
    Push-Location $androidDir
    & .\gradlew.bat bundleRelease
    Pop-Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "שגיאה בבניית AAB!" -ForegroundColor Red
        exit 1
    }
    
    $outputPath = "android/app/build/outputs/bundle/release/app-release.aab"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  AAB נבנה בהצלחה!" -ForegroundColor Green
    Write-Host "  קובץ: $outputPath" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/4] סיום" -ForegroundColor Yellow

# Show file size
if (Test-Path $outputPath) {
    $size = (Get-Item $outputPath).Length / 1MB
    Write-Host "  גודל: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  פקודות שימושיות:" -ForegroundColor Cyan
Write-Host "  העלאה לגוגל פליי:" -ForegroundColor White
Write-Host "    .\scripts\upload-google-play.ps1" -ForegroundColor Gray
Write-Host "  התקנה על מכשיר:" -ForegroundColor White
Write-Host "    npx cap run android" -ForegroundColor Gray
Write-Host "  פתיחה ב-Android Studio:" -ForegroundColor White
Write-Host "    npx cap open android" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
