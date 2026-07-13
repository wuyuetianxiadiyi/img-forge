:: ImageForge 一键发布新版本 = 构建 + 上传 R2 + 更新 version.json
:: 用法：先配好 R2_BUCKET 和 ACCOUNT_ID，然后双
:: 第一次需要：wrangler login（手动浏览器登录）
:: 之后每次发版：publish.bat

@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ════════════════════════════════════════
echo   ImageForge 发布工具
echo ════════════════════════════════════════

:: ---- 配置（改成你自己的） ----
set R2_BUCKET=imgforge-releases
set ACCOUNT_ID=你的Cloudflare账户ID
set PUBLIC_URL=https://pub-你的公钥.r2.dev

:: ---- Step 1: 获取版本号 ----
for /f "tokens=2 delims=:" %%a in ('findstr "version" ..\package.json') do (
  set VERSION_JSON=%%a
  goto :got_version
)
:got_version
set VERSION=%VERSION_JSON:"=%
set VERSION=%VERSION: =%
set VERSION=%VERSION:,=%
echo 当前版本: %VERSION%

:: ---- Step 2: 构建前端 ----
echo.
echo [1/4] 构建前端...
cd ..
call npm run build
if %errorlevel% neq 0 ( echo 构建失败 & exit /b 1 )
echo OK

:: ---- Step 3: 构建 Android APK ----
echo [2/4] 构建 Android APK...
rmdir /s /q src-tauri\gen\android\app\src\main\jniLibs 2>nul
call npx tauri android build
if %errorlevel% neq 0 ( echo APK构建失败 & exit /b 1 )
echo OK

:: ---- Step 4: 上传到 Cloudflare R2 ----
echo [3/4] 上传到 R2...
set APK_PATH=src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk
set R2_KEY=ImageForge-v%VERSION%.apk

wrangler r2 object put %R2_BUCKET%/%R2_KEY% --file %APK_PATH%
if %errorlevel% neq 0 ( echo R2上传失败 & exit /b 1 )

:: 传 version.json
wrangler r2 object put %R2_BUCKET%/version.json --file ..\version.json --content-type application/json
if %errorlevel% neq 0 ( echo version.json上传失败 & exit /b 1 )
echo OK

:: ---- Step 5: 复制 APK 到桌面 ----
echo [4/4] 复制到桌面...
copy /Y %APK_PATH% ..\..\..\Desktop\ImageForge-Android-v%VERSION%.apk
echo.

echo ════════════════════════════════════════
echo   ✅ 发布完成！
echo   版本: %VERSION%
echo   APK: ImageForge-Android-v%VERSION%.apk
echo   R2:  %PUBLIC_URL%/%R2_KEY%
echo ════════════════════════════════════════

endlocal
