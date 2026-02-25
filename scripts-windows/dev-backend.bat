@echo off
chcp 65001 >nul

REM 讀取 port 設定
call "%~dp0config.bat"

set ROOT_DIR=%~dp0..

echo 🚀 Starting Sinotrade Backend on port %BACKEND_PORT%...
echo 📍 API Root: http://localhost:%BACKEND_PORT%
echo 📍 API Docs: http://localhost:%BACKEND_PORT%/docs
echo.

REM 寫入暫存 bat，確保變數正確展開後再執行
set TMP_BAT=%TEMP%\sinotrade_backend.bat
echo @echo off> "%TMP_BAT%"
echo cd /d "%ROOT_DIR%\backend">> "%TMP_BAT%"
echo uv run uvicorn src.main:app --reload --host 0.0.0.0 --port %BACKEND_PORT%>> "%TMP_BAT%"

start "Sinotrade Backend" cmd /k "%TMP_BAT%"

echo ✅ Backend is starting in a new window
echo 🔄 http://localhost:%BACKEND_PORT%
echo.
pause
