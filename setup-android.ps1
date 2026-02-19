# ============================================================
# Android App Setup Script - Torah App
# Automated installation of JDK, Android SDK, build & APK
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "  [X] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host "  Android App Setup - Torah App              " -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host ""

$projectDir = $PSScriptRoot
if (-not $projectDir) { $projectDir = Get-Location }
Set-Location $projectDir

# ============================================================
# Step 1: Check Node.js
# ============================================================
Write-Step "Step 1/7: Checking Node.js"
try {
    $nodeVersion = node --version 2>$null
    Write-Ok "Node.js $nodeVersion installed"
}
catch {
    Write-Err "Node.js not installed! Install from: https://nodejs.org"
    exit 1
}

# ============================================================
# Step 2: Install Java JDK 17
# ============================================================
Write-Step "Step 2/7: Checking/Installing Java JDK 21"

$javaFound = $false
$javaHome = $null

# Check common JDK locations (JDK 21 preferred for Capacitor 8)
$jdkSearchPaths = @(
    "$env:ProgramFiles\Eclipse Adoptium\jdk-21*",
    "$env:ProgramFiles\Java\jdk-21*",
    "$env:ProgramFiles\Microsoft\jdk-21*",
    "$env:ProgramFiles\Eclipse Adoptium\jdk-17*",
    "$env:ProgramFiles\Java\jdk-17*"
)

foreach ($pattern in $jdkSearchPaths) {
    $found = Get-ChildItem $pattern -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $javaHome = $found.FullName
        $javaFound = $true
        break
    }
}

# Also check if java is in PATH
if (-not $javaFound) {
    try {
        $javaVer = & java -version 2>&1 | Select-Object -First 1
        if ($javaVer) {
            $javaFound = $true
            Write-Ok "Java found in PATH: $javaVer"
        }
    }
    catch {
        # Java not in PATH
    }
}

if (-not $javaFound) {
    Write-Warn "Java JDK not found. Installing JDK 21 (Eclipse Temurin)..."

    try {
        winget install EclipseAdoptium.Temurin.21.JDK --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
        Write-Ok "JDK 21 installed successfully"

        $found = Get-ChildItem "$env:ProgramFiles\Eclipse Adoptium\jdk-21*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { $javaHome = $found.FullName }
    }
    catch {
        Write-Warn "winget failed, trying direct download..."

        $jdkUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
        $jdkZip = "$env:TEMP\jdk17.zip"
        $jdkExtract = "$env:ProgramFiles\Java"

        Write-Host "  Downloading JDK 17..." -ForegroundColor Gray
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip -UseBasicParsing

        Write-Host "  Extracting..." -ForegroundColor Gray
        New-Item -ItemType Directory -Path $jdkExtract -Force | Out-Null
        Expand-Archive -Path $jdkZip -DestinationPath $jdkExtract -Force
        Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue

        $found = Get-ChildItem "$jdkExtract\jdk-17*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { $javaHome = $found.FullName }

        Write-Ok "JDK 17 installed at: $javaHome"
    }
}
else {
    if ($javaHome) {
        Write-Ok "Java JDK found at: $javaHome"
    }
}

# Set JAVA_HOME
if ($javaHome) {
    $env:JAVA_HOME = $javaHome
    [System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "User")
    $env:Path = "$javaHome\bin;$env:Path"
    Write-Ok "JAVA_HOME set: $javaHome"
}

# Verify java works
try {
    $javaVerCheck = $null
    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
        $javaVerCheck = cmd /c "`"$env:JAVA_HOME\bin\java.exe`" -version 2>&1" | Select-Object -First 1
    }
    if (-not $javaVerCheck) {
        $javaVerCheck = cmd /c "java -version 2>&1" | Select-Object -First 1
    }
    Write-Ok "Java verified: $javaVerCheck"
}
catch {
    Write-Warn "Java version check failed, but may still work."
}

# ============================================================
# Step 3: Install Android SDK (Command Line Tools)
# ============================================================
Write-Step "Step 3/7: Checking/Installing Android SDK"

$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
$sdkExists = Test-Path "$androidSdk\platform-tools"

if (-not $sdkExists) {
    Write-Warn "Android SDK not found. Installing..."

    New-Item -ItemType Directory -Path $androidSdk -Force | Out-Null

    $cmdToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $cmdToolsZip = "$env:TEMP\android-cmdline-tools.zip"

    Write-Host "  Downloading Android Command Line Tools..." -ForegroundColor Gray
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $cmdToolsUrl -OutFile $cmdToolsZip -UseBasicParsing

    Write-Host "  Extracting..." -ForegroundColor Gray
    $cmdToolsDir = "$androidSdk\cmdline-tools"
    New-Item -ItemType Directory -Path $cmdToolsDir -Force | Out-Null
    Expand-Archive -Path $cmdToolsZip -DestinationPath "$env:TEMP\android-cmdtools-extract" -Force

    $latestDir = "$cmdToolsDir\latest"
    if (Test-Path $latestDir) { Remove-Item $latestDir -Recurse -Force }
    Move-Item "$env:TEMP\android-cmdtools-extract\cmdline-tools" $latestDir
    Remove-Item "$env:TEMP\android-cmdtools-extract" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $cmdToolsZip -Force -ErrorAction SilentlyContinue

    Write-Ok "Command Line Tools installed"

    $env:ANDROID_HOME = $androidSdk
    $env:ANDROID_SDK_ROOT = $androidSdk
    [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidSdk, "User")
    [System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $androidSdk, "User")

    $sdkManager = "$androidSdk\cmdline-tools\latest\bin\sdkmanager.bat"

    Write-Host "  Accepting licenses..." -ForegroundColor Gray
    $yesStream = "y`ny`ny`ny`ny`ny`ny`ny`ny`n"
    $yesStream | & $sdkManager --licenses 2>&1 | Out-Null

    Write-Host "  Installing Android SDK Platform 34..." -ForegroundColor Gray
    & $sdkManager "platforms;android-34" 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

    Write-Host "  Installing Build Tools 34.0.0..." -ForegroundColor Gray
    & $sdkManager "build-tools;34.0.0" 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

    Write-Host "  Installing Platform Tools..." -ForegroundColor Gray
    & $sdkManager "platform-tools" 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

    Write-Ok "Android SDK installed at: $androidSdk"
}
else {
    Write-Ok "Android SDK found at: $androidSdk"
}

# Create local.properties for Gradle
$localProps = "$projectDir\android\local.properties"
$sdkPathEscaped = $androidSdk -replace '\\', '/'
"sdk.dir=$sdkPathEscaped" | Set-Content $localProps -Encoding UTF8
Write-Ok "local.properties created"

# Ensure ANDROID_HOME is set
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidSdk, "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $androidSdk, "User")

# Add to PATH
$pathAdditions = @("$androidSdk\platform-tools", "$androidSdk\cmdline-tools\latest\bin")
foreach ($p in $pathAdditions) {
    if ($env:Path -notlike "*$p*") {
        $env:Path = "$p;$env:Path"
    }
}

# ============================================================
# Step 4: Install npm packages
# ============================================================
Write-Step "Step 4/7: Installing npm packages"

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing packages..." -ForegroundColor Gray
    npm install 2>&1 | Select-Object -Last 3
}
Write-Ok "npm packages installed"

# ============================================================
# Step 5: Build Web App
# ============================================================
Write-Step "Step 5/7: Building Web App (vite build)"

$buildOutput = cmd /c "npm run build 2>&1"
$buildOutput | Select-Object -Last 5
if ($buildOutput -match "built in") {
    Write-Ok "Web app built successfully"
}
else {
    Write-Err "Build failed!"
    $buildOutput | Write-Host
    exit 1
}

# ============================================================
# Step 6: Sync to Android
# ============================================================
Write-Step "Step 6/7: Syncing to Android (cap sync)"

$syncOutput = cmd /c "npx cap sync android 2>&1"
$syncOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
Write-Ok "Android sync completed"

# ============================================================
# Step 7: Build Debug APK
# ============================================================
Write-Step "Step 7/7: Building Debug APK"

$gradlew = "$projectDir\android\gradlew.bat"

if (Test-Path $gradlew) {
    Write-Host "  Building APK (debug)... this may take several minutes on first run" -ForegroundColor Gray

    Push-Location "$projectDir\android"

    $gradleOutput = cmd /c ".\gradlew.bat assembleDebug 2>&1"
    $gradleOutput | ForEach-Object {
        if ($_ -match "BUILD|ERROR|FAIL|Download") {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }

    Pop-Location

    $debugApk = "$projectDir\android\app\build\outputs\apk\debug\app-debug.apk"

    if (Test-Path $debugApk) {
        $apkSize = [math]::Round((Get-Item $debugApk).Length / 1MB, 1)
        Write-Ok "APK created successfully! ($apkSize MB)"
        Write-Host ""
        Write-Host "  APK (debug): " -NoNewline
        Write-Host $debugApk -ForegroundColor Yellow

        Copy-Item $debugApk "$projectDir\torah-app-debug.apk" -Force
        Write-Ok "Also copied to: $projectDir\torah-app-debug.apk"
    }
    else {
        Write-Err "APK was not created. Check errors above."
    }
}
else {
    Write-Err "gradlew.bat not found. Make sure the Android project is set up correctly."
}

# ============================================================
# Summary
# ============================================================
Write-Host ""
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host "  Setup Complete!                            " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  What's next?" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Install on device (USB + Developer Mode):" -ForegroundColor White
Write-Host "     adb install torah-app-debug.apk" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Build signed AAB for Google Play:" -ForegroundColor White
Write-Host "     .\build-release.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Open in Android Studio:" -ForegroundColor White
Write-Host "     npm run android:open" -ForegroundColor Yellow
Write-Host ""
Write-Host "  4. Update after code changes:" -ForegroundColor White
Write-Host "     npm run android:sync" -ForegroundColor Yellow
Write-Host ""
