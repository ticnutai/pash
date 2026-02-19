# ============================================================
# Build Signed AAB for Google Play Store
# Torah App - Release Build Script
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "  [X] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host "  Build Signed AAB - Google Play Store       " -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host ""

$projectDir = $PSScriptRoot
if (-not $projectDir) { $projectDir = Get-Location }
Set-Location $projectDir

$keystorePath = "$projectDir\android\app\torah-release-key.jks"

# ============================================================
# Step 1: Create Keystore (one-time only)
# ============================================================
Write-Step "Step 1/4: Checking Keystore"

if (-not (Test-Path $keystorePath)) {
    Write-Warn "Keystore not found. Creating new..."
    Write-Host ""
    Write-Host "  IMPORTANT! Save the password you choose." -ForegroundColor Red
    Write-Host "  Without the keystore file and password you" -ForegroundColor Red
    Write-Host "  cannot update the app on Play Store!" -ForegroundColor Red
    Write-Host ""

    $storePass = Read-Host "  Enter Keystore password (min 6 characters)"
    if ($storePass.Length -lt 6) {
        Write-Err "Password must be at least 6 characters!"
        exit 1
    }

    $keyAlias = "torah-app"

    # Find keytool
    $keytool = $null
    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\keytool.exe")) {
        $keytool = "$env:JAVA_HOME\bin\keytool.exe"
    }
    if (-not $keytool) {
        $keytool = (Get-Command keytool -ErrorAction SilentlyContinue).Source
    }
    if (-not $keytool) {
        $jdkBins = Get-ChildItem "$env:ProgramFiles\Eclipse Adoptium\jdk-*\bin\keytool.exe",
                                  "$env:ProgramFiles\Java\jdk-*\bin\keytool.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($jdkBins) { $keytool = $jdkBins.FullName }
    }

    if (-not $keytool) {
        Write-Err "keytool not found. Install JDK first (run setup-android.ps1)"
        exit 1
    }

    & $keytool -genkeypair `
        -v `
        -storetype JKS `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass $storePass `
        -keypass $storePass `
        -alias $keyAlias `
        -keystore $keystorePath `
        -dname "CN=Torah App, OU=Torah, O=TorahApp, L=Jerusalem, ST=Israel, C=IL"

    if (Test-Path $keystorePath) {
        Write-Ok "Keystore created: $keystorePath"
        Write-Warn "BACKUP this file to a safe location: $keystorePath"
    }
    else {
        Write-Err "Keystore creation failed!"
        exit 1
    }

    $env:TORAH_STORE_PASS = $storePass
}
else {
    Write-Ok "Keystore found: $keystorePath"
    if (-not $env:TORAH_STORE_PASS) {
        $storePass = Read-Host "  Enter Keystore password"
        $env:TORAH_STORE_PASS = $storePass
    }
    else {
        $storePass = $env:TORAH_STORE_PASS
    }
}

$keyAlias = "torah-app"

# ============================================================
# Step 2: Build Web App
# ============================================================
Write-Step "Step 2/4: Building Web App"

npm run build 2>&1 | Select-Object -Last 5
Write-Ok "Web app built"

# ============================================================
# Step 3: Sync to Android
# ============================================================
Write-Step "Step 3/4: Syncing to Android"

npx cap sync android 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
Write-Ok "Android sync completed"

# ============================================================
# Step 4: Build Signed AAB
# ============================================================
Write-Step "Step 4/4: Building Signed AAB (Release)"

# Create signing config for Gradle
$signingProps = @"
storeFile=torah-release-key.jks
storePassword=$storePass
keyAlias=$keyAlias
keyPassword=$storePass
"@

$signingProps | Set-Content "$projectDir\android\app\signing.properties" -Encoding UTF8

# Modify build.gradle to include signing config
$buildGradle = "$projectDir\android\app\build.gradle"
$buildGradleContent = Get-Content $buildGradle -Raw

if ($buildGradleContent -notmatch "signingConfigs") {
    Write-Host "  Adding signing config to build.gradle..." -ForegroundColor Gray

    $signingBlock = @"

    // Signing config for release
    def signingPropsFile = file('signing.properties')
    if (signingPropsFile.exists()) {
        def signingProps2 = new Properties()
        signingProps2.load(new FileInputStream(signingPropsFile))

        signingConfigs {
            release {
                storeFile file(signingProps2['storeFile'])
                storePassword signingProps2['storePassword']
                keyAlias signingProps2['keyAlias']
                keyPassword signingProps2['keyPassword']
            }
        }
    }
"@

    $buildGradleContent = $buildGradleContent -replace "(buildTypes\s*\{)", "$signingBlock`n    `$1"

    # Add signingConfig to release buildType
    $buildGradleContent = $buildGradleContent -replace "(release\s*\{[^}]*minifyEnabled\s+false)", "`$1`n            if (signingConfigs.hasProperty('release')) { signingConfig signingConfigs.release }"

    Set-Content $buildGradle $buildGradleContent -Encoding UTF8
    Write-Ok "Signing config added to build.gradle"
}

Push-Location "$projectDir\android"

Write-Host "  Building AAB (release)... this may take several minutes" -ForegroundColor Gray

& .\gradlew.bat bundleRelease 2>&1 | ForEach-Object {
    if ($_ -match "BUILD|ERROR|FAIL|Download|Task") {
        Write-Host "  $_" -ForegroundColor Gray
    }
}

Pop-Location

$releaseAab = "$projectDir\android\app\build\outputs\bundle\release\app-release.aab"

if (Test-Path $releaseAab) {
    $aabSize = [math]::Round((Get-Item $releaseAab).Length / 1MB, 1)
    Write-Ok "AAB created successfully! ($aabSize MB)"

    Copy-Item $releaseAab "$projectDir\torah-app-release.aab" -Force
    Write-Ok "Copied to: $projectDir\torah-app-release.aab"

    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "  AAB Ready for Google Play!                 " -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  AAB file: torah-app-release.aab" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Go to https://play.google.com/console" -ForegroundColor White
    Write-Host "  2. Create a new app" -ForegroundColor White
    Write-Host "  3. Upload the .aab file" -ForegroundColor White
    Write-Host "  4. Fill in store listing details" -ForegroundColor White
    Write-Host "  5. Submit for review" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Err "AAB was not created. Check errors above."

    # Try building a signed APK instead
    Write-Host "  Trying signed APK instead..." -ForegroundColor Gray

    Push-Location "$projectDir\android"
    & .\gradlew.bat assembleRelease 2>&1 | ForEach-Object {
        if ($_ -match "BUILD|ERROR|FAIL") {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
    Pop-Location

    $releaseApk = "$projectDir\android\app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $releaseApk) {
        Copy-Item $releaseApk "$projectDir\torah-app-release.apk" -Force
        Write-Ok "Signed APK created: torah-app-release.apk"
    }
}

# Clean up signing.properties (contains password)
Remove-Item "$projectDir\android\app\signing.properties" -Force -ErrorAction SilentlyContinue
