@echo off
chcp 65001 >nul

REM 讀取 port 設定 (同時自動更新 .env.local)
call "%~dp0config.bat"

set ROOT_DIR=%~dp0..

echo 🎨 Starting Sinotrade Frontend on port %FRONTEND_PORT%...
echo 📍 Frontend URL: http://localhost:%FRONTEND_PORT%
echo.

REM 寫入暫存 bat，確保變數正確展開後再執行
set TMP_BAT=%TEMP%\sinotrade_frontend.bat
echo @echo off> "%TMP_BAT%"
echo cd /d "%ROOT_DIR%\frontend">> "%TMP_BAT%"
echo pnpm dev -p %FRONTEND_PORT%>> "%TMP_BAT%"

start "Sinotrade Frontend" cmd /k "%TMP_BAT%"

echo ✅ Frontend is starting in a new window
echo 🔄 http://localhost:%FRONTEND_PORT%
echo.
pause
