# ============================================================
# Sadbhawana Author Dashboard - Android Build Script
# ============================================================
# Usage:
#   .\build-android.ps1           (debug APK)
#   .\build-android.ps1 -Release  (release APK, requires keystore)
# ============================================================

param(
    [switch]$Release,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " Sadbhawana Author Dashboard - Android Build" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# --- 1. Set JAVA_HOME to Android Studio's bundled JDK ---
$jbrPath = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $jbrPath) {
    $env:JAVA_HOME = $jbrPath
    $env:Path = "$jbrPath\bin;$env:Path"
    Write-Host "[OK] JAVA_HOME set to: $jbrPath" -ForegroundColor Green
} else {
    Write-Error "Android Studio JBR not found at $jbrPath. Please install Android Studio."
    exit 1
}

# --- 2. Verify ANDROID_HOME / SDK ---
$sdkPath = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
if (Test-Path $sdkPath) {
    $env:ANDROID_HOME = $sdkPath
    $env:ANDROID_SDK_ROOT = $sdkPath
    Write-Host "[OK] Android SDK at: $sdkPath" -ForegroundColor Green
} else {
    Write-Error "Android SDK not found at $sdkPath"
    exit 1
}

# --- 3. Sync Capacitor ---
Write-Host ""
Write-Host "[STEP 1] Syncing Capacitor..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Error "Capacitor sync failed!"
    exit 1
}
Write-Host "[OK] Capacitor sync complete" -ForegroundColor Green

# --- 4. Build APK ---
Set-Location "$PSScriptRoot\android"

if ($Clean) {
    Write-Host ""
    Write-Host "[STEP 2] Cleaning build..." -ForegroundColor Yellow
    .\gradlew.bat clean
}

Write-Host ""
if ($Release) {
    Write-Host "[STEP 2] Building RELEASE APK..." -ForegroundColor Yellow
    .\gradlew.bat assembleRelease --info
    $apkPattern = "app\build\outputs\apk\release\*.apk"
} else {
    Write-Host "[STEP 2] Building DEBUG APK..." -ForegroundColor Yellow
    .\gradlew.bat assembleDebug
    $apkPattern = "app\build\outputs\apk\debug\*.apk"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Build failed! Check the output above for errors." -ForegroundColor Red
    exit 1
}

# --- 5. Show output APK location ---
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host " BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green

$apks = Get-ChildItem $apkPattern -ErrorAction SilentlyContinue
if ($apks) {
    foreach ($apk in $apks) {
        Write-Host " APK: $($apk.FullName)" -ForegroundColor Cyan
        Write-Host " Size: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    }
} else {
    Write-Host " APK location: $PSScriptRoot\android\$apkPattern" -ForegroundColor Cyan
}
Write-Host "===========================================================" -ForegroundColor Green
