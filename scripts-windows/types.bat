@echo off
chcp 65001 >nul
echo 🔧 Generating TypeScript type definitions...
echo.
cd backend
uv run python scripts\generate_types.py
if errorlevel 1 (
    echo ❌ Type generation failed
    echo 💡 Please ensure Node.js and npm are installed
    pause
    exit /b 1
)
cd ..
echo ✅ TypeScript types generated to shared/types/
echo.
pause
