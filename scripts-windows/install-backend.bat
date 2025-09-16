@echo off
chcp 65001 >nul
echo 📦 Installing backend dependencies...
echo.

if not exist backend (
    echo ❌ Backend directory does not exist!
    echo 💡 Please ensure you are in the project root directory
    exit /b 1
)

echo 🔍 Changing to backend directory...
pushd backend

echo 🔄 Running: uv sync --dev
uv sync --dev
set BACKEND_EXIT_CODE=%errorlevel%

popd

if %BACKEND_EXIT_CODE% neq 0 (
    echo.
    echo ❌ Backend dependency installation failed
    echo 💡 Please check if uv is installed and configured properly
    exit /b 1
)

echo.
echo ✅ Backend dependencies installed successfully
echo 📍 Backend ready for development
