# ============================================
# generate-keystore.ps1
# יצירת קובץ Keystore לחתימת אפליקציית אנדרויד
# ============================================
# שימוש: .\scripts\generate-keystore.ps1
# ============================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  יצירת Keystore לאפליקציית אנדרויד" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$keystorePath = "android/app/pashash-release.keystore"
$propsPath = "android/app/signing.properties"

if (Test-Path $keystorePath) {
    Write-Host "Keystore כבר קיים: $keystorePath" -ForegroundColor Yellow
    $overwrite = Read-Host "האם לדרוס? (y/N)"
    if ($overwrite -ne "y") {
        Write-Host "בוטל." -ForegroundColor Red
        exit 0
    }
    Remove-Item $keystorePath -Force
}

Write-Host "מוודא ש-keytool זמין..." -ForegroundColor Gray

# Find keytool
$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
    $javaHome = $env:JAVA_HOME
    if ($javaHome) {
        $keytool = Join-Path $javaHome "bin\keytool.exe"
    }
    if (-not (Test-Path $keytool)) {
        Write-Host "keytool לא נמצא. וודא ש-Java מותקן וש-JAVA_HOME מוגדר." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "הזן פרטי Keystore:" -ForegroundColor Green
$storePass = Read-Host "סיסמת Keystore (מינימום 6 תווים)"
$keyAlias = Read-Host "שם מפתח (Key Alias, ברירת מחדל: pashash-key)"
if ([string]::IsNullOrWhiteSpace($keyAlias)) { $keyAlias = "pashash-key" }
$keyPass = Read-Host "סיסמת מפתח (Key Password, לרוב זהה לסיסמת Keystore)"
if ([string]::IsNullOrWhiteSpace($keyPass)) { $keyPass = $storePass }

$cn = Read-Host "שם מלא (CN, ברירת מחדל: Torah App Developer)"
if ([string]::IsNullOrWhiteSpace($cn)) { $cn = "Torah App Developer" }
$org = Read-Host "ארגון (O, ברירת מחדל: Pash)"
if ([string]::IsNullOrWhiteSpace($org)) { $org = "Pash" }
$country = Read-Host "קוד מדינה (C, ברירת מחדל: IL)"
if ([string]::IsNullOrWhiteSpace($country)) { $country = "IL" }

$dname = "CN=$cn, O=$org, C=$country"

Write-Host ""
Write-Host "יוצר Keystore..." -ForegroundColor Cyan

& keytool -genkeypair `
    -v `
    -keystore $keystorePath `
    -alias $keyAlias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $storePass `
    -keypass $keyPass `
    -dname $dname

if ($LASTEXITCODE -ne 0) {
    Write-Host "שגיאה ביצירת Keystore!" -ForegroundColor Red
    exit 1
}

Write-Host "Keystore נוצר בהצלחה: $keystorePath" -ForegroundColor Green

# Create signing.properties
$propsContent = @"
storeFile=pashash-release.keystore
storePassword=$storePass
keyAlias=$keyAlias
keyPassword=$keyPass
"@

Set-Content -Path $propsPath -Value $propsContent -Encoding UTF8
Write-Host "signing.properties נוצר: $propsPath" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  חשוב! שמור את הפרטים הבאים:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Keystore: $keystorePath"
Write-Host "  Alias: $keyAlias"
Write-Host "  Store Password: $storePass"
Write-Host "  Key Password: $keyPass"
Write-Host ""
Write-Host "  אל תאבד את קובץ ה-Keystore!" -ForegroundColor Red
Write-Host "  בלעדיו לא תוכל לעדכן את האפליקציה בחנות." -ForegroundColor Red
Write-Host ""
Write-Host "  וודא ש-.gitignore מכיל:" -ForegroundColor Yellow
Write-Host "    *.keystore" -ForegroundColor Gray
Write-Host "    signing.properties" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Yellow
