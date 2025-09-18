@echo off
chcp 65001 >nul
echo 📦 Installing frontend dependencies...
echo.

if not exist frontend (
    echo ❌ Frontend directory does not exist!
    echo 💡 Please ensure you are in the project root directory
    exit /b 1
)

echo 🔍 Changing to frontend directory...
pushd frontend

echo 🔄 Running: pnpm install
pnpm install
set FRONTEND_EXIT_CODE=%errorlevel%

popd

if %FRONTEND_EXIT_CODE% neq 0 (
    echo.
    echo ❌ Frontend dependency installation failed
    echo 💡 Please check if pnpm is installed and configured properly
    exit /b 1
)

echo.
echo ✅ Frontend dependencies installed successfully
echo 📍 Frontend ready for development
