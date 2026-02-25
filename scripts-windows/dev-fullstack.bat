@echo off
chcp 65001 >nul

REM 讀取 port 設定 (同時自動更新 .env.local)
call "%~dp0config.bat"

set ROOT_DIR=%~dp0..

echo 🚀🎨 Starting Sinotrade Full-Stack...
echo 📍 Frontend: http://localhost:%FRONTEND_PORT%
echo 📍 Backend:  http://localhost:%BACKEND_PORT%
echo 📍 API Docs: http://localhost:%BACKEND_PORT%/docs
echo.

REM 寫入後端暫存 bat
set TMP_BE=%TEMP%\sinotrade_backend.bat
echo @echo off> "%TMP_BE%"
echo cd /d "%ROOT_DIR%\backend">> "%TMP_BE%"
echo uv run uvicorn src.main:app --reload --host 0.0.0.0 --port %BACKEND_PORT%>> "%TMP_BE%"

REM 寫入前端暫存 bat
set TMP_FE=%TEMP%\sinotrade_frontend.bat
echo @echo off> "%TMP_FE%"
echo cd /d "%ROOT_DIR%\frontend">> "%TMP_FE%"
echo pnpm dev -p %FRONTEND_PORT%>> "%TMP_FE%"

REM 啟動後端
start "Sinotrade Backend" cmd /k "%TMP_BE%"

REM 等後端啟動
timeout /t 3 /nobreak >nul

REM 啟動前端
start "Sinotrade Frontend" cmd /k "%TMP_FE%"

echo ✅ Both servers are starting in separate windows
echo 🔄 Frontend: http://localhost:%FRONTEND_PORT%
echo 🔄 Backend:  http://localhost:%BACKEND_PORT%
echo.
pause
