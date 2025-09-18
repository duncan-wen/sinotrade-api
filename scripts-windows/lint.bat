@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="format" goto format
if "%1"=="check" goto check
if "%1"=="fix" goto fix
if "%1"=="mypy" goto mypy
if "%1"=="pre-commit" goto pre-commit
goto help

:help
echo.
echo 🐍 Python Code Quality Tools (Windows)
echo.
echo 📝 Formatting:
echo   scripts lint format     - Format code with Black
echo.
echo 🔍 Linting:
echo   scripts lint check      - Check code quality with Ruff
echo   scripts lint fix        - Auto-fix code issues with Ruff
echo   scripts lint mypy       - Type check with MyPy
echo.
echo 🔧 Pre-commit:
echo   scripts lint pre-commit - Run pre-commit hooks
echo.
goto end

:format
echo 🎨 Formatting code with Black...
cd backend
uv run black src/
if errorlevel 1 (
    echo ❌ Black formatting failed
    cd ..
    goto end
)
cd ..
echo ✅ Code formatted successfully
goto end

:check
echo 🔍 Checking code quality with Ruff...
cd backend
uv run ruff check src/
if errorlevel 1 (
    echo ⚠️  Code quality issues found
    cd ..
    goto end
)
cd ..
echo ✅ Code quality check passed
goto end

:fix
echo 🔧 Auto-fixing code issues with Ruff...
cd backend
uv run ruff check --fix src/
if errorlevel 1 (
    echo ❌ Auto-fix failed
    cd ..
    goto end
)
cd ..
echo ✅ Code issues auto-fixed
goto end

:mypy
echo 📝 Running MyPy type checking...
cd backend
uv sync --dev >nul 2>&1
uv run mypy src/
if errorlevel 1 (
    echo ⚠️  Type checking issues found
    cd ..
    goto end
)
cd ..
echo ✅ Type checking passed
goto end

:pre-commit
echo 🔧 Running pre-commit hooks...
pre-commit run --all-files
if errorlevel 1 (
    echo ❌ Pre-commit hooks failed
    goto end
)
echo ✅ Pre-commit hooks passed
goto end

:end
