@echo off
chcp 65001 >nul
echo 🔧 Generating TypeScript type definitions...
echo.
pushd backend
uv run python scripts\generate_types.py
set TYPES_EXIT_CODE=%errorlevel%
popd
if %TYPES_EXIT_CODE% neq 0 (
    echo ❌ Type generation failed
    echo 💡 Please ensure Node.js and npm are installed
    pause
    exit /b 1
)
echo ✅ TypeScript types generated to shared/types/
echo.
pause
