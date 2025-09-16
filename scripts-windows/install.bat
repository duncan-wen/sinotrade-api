@echo off
chcp 65001 >nul
echo 📦 Installing all dependencies (Backend + Frontend)...
echo.

REM Save current directory
set ORIGINAL_DIR=%CD%

echo 🔧 Step 1: Installing backend dependencies...
call "%~dp0install-backend.bat"
if errorlevel 1 (
    echo ❌ Backend installation failed, skipping frontend installation
    cd /d "%ORIGINAL_DIR%"
    pause
    exit /b 1
)

echo.
echo 🔧 Step 2: Installing frontend dependencies...
call "%~dp0install-frontend.bat"
if errorlevel 1 (
    echo ❌ Frontend installation failed
    cd /d "%ORIGINAL_DIR%"
    pause
    exit /b 1
)

REM Ensure we're back to the original directory
cd /d "%ORIGINAL_DIR%"

echo.
echo 🎉 All dependencies installed successfully!
echo.
echo 🚀 You can now use these commands:
echo    dev-backend.bat     - Start backend development server
echo    dev-frontend.bat    - Start frontend development server
echo    dev-fullstack.bat   - Start both servers
echo    types.bat           - Generate TypeScript types
echo    scripts.bat         - View all available commands
echo.
pause
