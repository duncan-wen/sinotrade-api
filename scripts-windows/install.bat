@echo off
chcp 65001 >nul
echo 📦 Installing Sinotrade API Backend Dependencies...
cd backend
uv sync
if errorlevel 1 (
    echo ❌ Backend dependency installation failed
    pause
    exit /b 1
)
cd ..
echo ✅ Backend dependencies installed successfully
echo.
echo 🚀 You can now use these commands:
echo    dev.bat        - Start backend development server
echo    types.bat      - Generate TypeScript types
echo    scripts.bat    - View all available commands
pause
