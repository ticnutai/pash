# Play Store Publishing Assistant Script
# This script guides you step-by-step through the entire publishing process.
# Run it and follow the instructions.

$ErrorActionPreference = "Continue"
$storeListingDir = Join-Path $PSScriptRoot "store-listing"

function Show-Step {
    param([string]$step, [string]$title, [string]$description)
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  STEP $step : $title" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host $description -ForegroundColor White
    Write-Host ""
}

function Wait-ForUser {
    param([string]$message = "Press ENTER when done...")
    Write-Host $message -ForegroundColor Green
    Read-Host
}

function Copy-ToClipboard {
    param([string]$text, [string]$label)
    $text | Set-Clipboard
    Write-Host "  >> '$label' copied to clipboard!" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "  Google Play Store Publishing Assistant" -ForegroundColor Yellow
Write-Host "  Torah App - Step by Step" -ForegroundColor Yellow
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""

# ==========================================
# STEP 0: Enable GitHub Pages for Privacy Policy
# ==========================================
Show-Step "0" "ENABLE GITHUB PAGES" "First, we need to host the Privacy Policy at a public URL.
We'll enable GitHub Pages on your repo."

Write-Host "Opening GitHub repo settings..." -ForegroundColor White
Start-Process "https://github.com/ticnutai/pash/settings/pages"
Write-Host ""
Write-Host "  In the GitHub Pages settings page:" -ForegroundColor White
Write-Host "  1. Under 'Source', select 'Deploy from a branch'" -ForegroundColor White
Write-Host "  2. Under 'Branch', select 'main'" -ForegroundColor White
Write-Host "  3. Select '/docs' folder" -ForegroundColor White
Write-Host "  4. Click 'Save'" -ForegroundColor White
Write-Host ""
Write-Host "  After a few minutes, your privacy policy will be at:" -ForegroundColor Yellow
Write-Host "  https://ticnutai.github.io/pash/privacy-policy.html" -ForegroundColor Cyan
Write-Host ""
Wait-ForUser

# ==========================================
# STEP 1: Create Google Play Developer Account
# ==========================================
Show-Step "1" "GOOGLE PLAY DEVELOPER ACCOUNT" "Create a developer account (one-time $25 fee)."

Write-Host "Opening Google Play Console..." -ForegroundColor White
Start-Process "https://play.google.com/console/signup"
Write-Host ""
Write-Host "  1. Sign in with your Google account" -ForegroundColor White
Write-Host "  2. Pay the $25 registration fee" -ForegroundColor White
Write-Host "  3. Fill in your developer name" -ForegroundColor White
Write-Host "  4. Complete the verification" -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after your account is created..."

# ==========================================
# STEP 2: Create New App
# ==========================================
Show-Step "2" "CREATE NEW APP" "Create a new app in Play Console."

Write-Host "Opening Play Console to create app..." -ForegroundColor White
Start-Process "https://play.google.com/console/developers"
Write-Host ""
Write-Host "  1. Click 'Create app'" -ForegroundColor White
Write-Host "  2. Fill in the following:" -ForegroundColor White

$appName = [char]0x05D7 + [char]0x05DE + [char]0x05D9 + [char]0x05E9 + [char]0x05D4 + " " + [char]0x05D7 + [char]0x05D5 + [char]0x05DE + [char]0x05E9 + [char]0x05D9 + " " + [char]0x05EA + [char]0x05D5 + [char]0x05E8 + [char]0x05D4
Write-Host ""
Write-Host "  Copying app name to clipboard..." -ForegroundColor White
Copy-ToClipboard $appName "App Name"
Write-Host "  App Name: $appName" -ForegroundColor Cyan
Write-Host ""
Write-Host "  - Default language: Hebrew (select from dropdown)" -ForegroundColor White
Write-Host "  - App or Game: App" -ForegroundColor White
Write-Host "  - Free or Paid: Free" -ForegroundColor White
Write-Host "  - Accept all declarations" -ForegroundColor White
Write-Host "  - Click 'Create app'" -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after the app is created..."

# ==========================================
# STEP 3: Store Listing - Short Description
# ==========================================
Show-Step "3A" "STORE LISTING - SHORT DESCRIPTION" "Go to 'Main store listing' in the left menu."

$shortDesc = [System.IO.File]::ReadAllText("$storeListingDir\store_listing.md", [System.Text.Encoding]::UTF8)
# Extract short description (line after "## Short Description")
$shortDescText = ($shortDesc -split "`n" | Where-Object { $_ -match "^[^#]" -and $_ -match "[\u0590-\u05FF]" } | Select-Object -First 1).Trim()

# Hardcode the correct short description
$shortDescText = [char]0x05D7 + [char]0x05DE + [char]0x05D9 + [char]0x05E9 + [char]0x05D4 + " " +
    [char]0x05D7 + [char]0x05D5 + [char]0x05DE + [char]0x05E9 + [char]0x05D9 + " " +
    [char]0x05EA + [char]0x05D5 + [char]0x05E8 + [char]0x05D4 + " " +
    [char]0x05E2 + [char]0x05DD + " " +
    [char]0x05E4 + [char]0x05D9 + [char]0x05E8 + [char]0x05D5 + [char]0x05E9 + [char]0x05D9 + [char]0x05DD + ", " +
    [char]0x05D7 + [char]0x05D9 + [char]0x05E4 + [char]0x05D5 + [char]0x05E9 + ", " +
    [char]0x05E1 + [char]0x05D9 + [char]0x05DE + [char]0x05E0 + [char]0x05D9 + [char]0x05D5 + [char]0x05EA + " " +
    [char]0x05D5 + [char]0x05D4 + [char]0x05E2 + [char]0x05E8 + [char]0x05D5 + [char]0x05EA + " " +
    [char]0x05D0 + [char]0x05D9 + [char]0x05E9 + [char]0x05D9 + [char]0x05D5 + [char]0x05EA + " - " +
    [char]0x05D4 + [char]0x05DB + [char]0x05DC + " " +
    [char]0x05D1 + [char]0x05DE + [char]0x05E7 + [char]0x05D5 + [char]0x05DD + " " +
    [char]0x05D0 + [char]0x05D7 + [char]0x05D3

Copy-ToClipboard $shortDescText "Short Description"
Write-Host "  Short description copied! Paste it in the 'Short description' field." -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after pasting..."

# ==========================================
# STEP 3B: Store Listing - Full Description
# ==========================================
Show-Step "3B" "STORE LISTING - FULL DESCRIPTION" "Now paste the full description."

# Read the full description from file
$fullDescLines = @()
$inFullDesc = $false
$fullDescContent = Get-Content "$storeListingDir\store_listing.md" -Encoding UTF8
foreach ($line in $fullDescContent) {
    if ($line -match "^## Full Description") { $inFullDesc = $true; continue }
    if ($line -match "^---") { $inFullDesc = $false; continue }
    if ($inFullDesc) { $fullDescLines += $line }
}
$fullDescText = ($fullDescLines -join "`n").Trim()

Copy-ToClipboard $fullDescText "Full Description"
Write-Host "  Full description copied! Paste it in the 'Full description' field." -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after pasting..."

# ==========================================
# STEP 3C: Store Listing - Graphics
# ==========================================
Show-Step "3C" "STORE LISTING - GRAPHICS" "Upload app graphics."

$screenshotsPath = Resolve-Path "$storeListingDir\screenshots"
$featureGraphicPath = Resolve-Path "$storeListingDir\feature_graphic.png"
$iconPath = Resolve-Path "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"

Write-Host "  Opening screenshots folder..." -ForegroundColor White
Start-Process "explorer.exe" $screenshotsPath
Write-Host ""
Write-Host "  Upload these files:" -ForegroundColor Yellow
Write-Host "  1. APP ICON (512x512): $iconPath" -ForegroundColor White
Write-Host "  2. FEATURE GRAPHIC (1024x500): $featureGraphicPath" -ForegroundColor White
Write-Host "  3. PHONE SCREENSHOTS: Select 2+ images from the screenshots folder" -ForegroundColor White
Write-Host "     (portrait screenshots opened in Explorer)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Drag and drop images to the upload areas in Play Console." -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after all graphics are uploaded..."

# ==========================================
# STEP 4: Content Rating
# ==========================================
Show-Step "4" "CONTENT RATING" "Complete the content rating questionnaire."

Write-Host "  Go to 'App content' > 'Content rating' in the left menu" -ForegroundColor White
Write-Host ""
Write-Host "  Answers for the questionnaire:" -ForegroundColor Yellow
Write-Host "  - Violence: No" -ForegroundColor White
Write-Host "  - Sexual content: No" -ForegroundColor White  
Write-Host "  - Language: No profanity" -ForegroundColor White
Write-Host "  - Controlled substance: No" -ForegroundColor White
Write-Host "  - Gambling: No" -ForegroundColor White
Write-Host "  - User interaction: Yes (notes/bookmarks)" -ForegroundColor White
Write-Host "  - Personal info collection: Yes (optional email)" -ForegroundColor White
Write-Host ""
Write-Host "  Expected rating: Everyone / PEGI 3" -ForegroundColor Cyan
Write-Host ""
Wait-ForUser "Press ENTER after completing..."

# ==========================================
# STEP 5: Privacy Policy
# ==========================================
Show-Step "5" "PRIVACY POLICY" "Enter the privacy policy URL."

$privacyUrl = "https://ticnutai.github.io/pash/privacy-policy.html"
Copy-ToClipboard $privacyUrl "Privacy Policy URL"
Write-Host "  Privacy Policy URL copied to clipboard!" -ForegroundColor White
Write-Host "  URL: $privacyUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Go to 'App content' > 'Privacy policy'" -ForegroundColor White
Write-Host "  Paste the URL and save." -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after pasting..."

# ==========================================
# STEP 6: Target Audience
# ==========================================
Show-Step "6" "TARGET AUDIENCE & DATA SAFETY" "Set target audience and fill data safety."

Write-Host "  TARGET AUDIENCE:" -ForegroundColor Yellow
Write-Host "  Go to 'App content' > 'Target audience'" -ForegroundColor White
Write-Host "  - Age group: 13+ and above" -ForegroundColor White
Write-Host "  - Not primarily for children: Correct" -ForegroundColor White
Write-Host ""
Write-Host "  DATA SAFETY:" -ForegroundColor Yellow
Write-Host "  Go to 'App content' > 'Data safety'" -ForegroundColor White
Write-Host "  - Does your app collect user data? YES" -ForegroundColor White
Write-Host "  - Does your app share user data? NO" -ForegroundColor White
Write-Host "  - Data collected:" -ForegroundColor White
Write-Host "    * Email (optional, for account)" -ForegroundColor White
Write-Host "    * User-generated content (notes, bookmarks)" -ForegroundColor White
Write-Host "    * App settings" -ForegroundColor White
Write-Host "  - Data encrypted in transit: YES" -ForegroundColor White
Write-Host "  - Users can request deletion: YES" -ForegroundColor White
Write-Host ""
Write-Host "  ADS:" -ForegroundColor Yellow
Write-Host "  - Does your app contain ads? NO" -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after completing..."

# ==========================================
# STEP 7: App Category
# ==========================================
Show-Step "7" "APP CATEGORY" "Set the app category."

Write-Host "  Go to 'Store settings' > 'App category'" -ForegroundColor White
Write-Host "  - Category: Education" -ForegroundColor White
Write-Host "  - Tags: Torah, Bible, Jewish, Hebrew, Religious" -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after setting..."

# ==========================================
# STEP 8: Upload AAB
# ==========================================
Show-Step "8" "UPLOAD APP BUNDLE" "Upload the signed AAB file."

$aabPath = Resolve-Path "torah-app-release.aab"
Write-Host "  Go to 'Production' in the left menu" -ForegroundColor White
Write-Host "  Click 'Create new release'" -ForegroundColor White
Write-Host ""
Write-Host "  AAB file location:" -ForegroundColor Yellow
Write-Host "  $aabPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Opening file location in Explorer..." -ForegroundColor White
Start-Process "explorer.exe" "/select,`"$aabPath`""
Write-Host ""
Write-Host "  Drag the .aab file to the upload area, or click 'Upload'" -ForegroundColor White
Write-Host ""

# Release notes
$releaseNotes = @"
Version 1.0 - First Release!

- Read all Five Books of Torah
- Smart search across all verses
- Personal bookmarks and notes
- Commentaries and interpretations
- Cloud sync across devices
- Dark and light mode
- Custom font size and colors
"@

Copy-ToClipboard $releaseNotes "Release Notes"
Write-Host "  Release notes copied to clipboard! Paste in the 'Release notes' field." -ForegroundColor White
Write-Host ""
Wait-ForUser "Press ENTER after uploading and adding release notes..."

# ==========================================
# STEP 9: Review and Submit
# ==========================================
Show-Step "9" "REVIEW AND SUBMIT" "Final review and submission!"

Write-Host "  1. Click 'Review release'" -ForegroundColor White
Write-Host "  2. Check all sections show green checkmarks" -ForegroundColor White
Write-Host "  3. Click 'Start rollout to Production'" -ForegroundColor White
Write-Host "  4. Confirm the rollout" -ForegroundColor White
Write-Host ""
Write-Host "  Review usually takes 3-7 days for first submission." -ForegroundColor Yellow
Write-Host ""
Wait-ForUser "Press ENTER after submitting..."

# ==========================================
# DONE!
# ==========================================
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "  CONGRATULATIONS!" -ForegroundColor Green
Write-Host "  Your app has been submitted to Google Play!" -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  IMPORTANT REMINDERS:" -ForegroundColor Yellow
Write-Host "  - Back up your keystore: android\app\torah-release-key.jks" -ForegroundColor White
Write-Host "  - Keystore password: 543211" -ForegroundColor White
Write-Host "  - Review takes 3-7 days" -ForegroundColor White
Write-Host "  - You'll get an email when the app is approved" -ForegroundColor White
Write-Host ""
Write-Host "  To update the app in the future:" -ForegroundColor Yellow
Write-Host "  1. Make code changes" -ForegroundColor White
Write-Host "  2. Update versionCode in android\app\build.gradle" -ForegroundColor White
Write-Host "  3. Run: .\build-release.ps1" -ForegroundColor White
Write-Host "  4. Upload new AAB to Play Console" -ForegroundColor White
Write-Host ""
