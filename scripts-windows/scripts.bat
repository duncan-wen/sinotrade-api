@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="install-backend" goto install-backend
if "%1"=="install-frontend" goto install-frontend
if "%1"=="dev" goto dev
if "%1"=="dev-backend" goto dev-backend
if "%1"=="dev-frontend" goto dev-frontend
if "%1"=="types" goto types
if "%1"=="clean" goto clean
goto help

:help
echo.
echo 🚀 Sinotrade API Development Commands (Windows)
echo.
echo 📦 Installation and Setup:
echo   scripts install          - Install all dependencies (backend + frontend)
echo   scripts install-backend  - Install backend dependencies (Python)
echo   scripts install-frontend - Install frontend dependencies (Node.js)
echo.
echo 💻 Development Services:
echo   scripts dev             - Start both frontend and backend dev servers
echo   scripts dev-backend     - Start backend development server (FastAPI)
echo   scripts dev-frontend    - Start frontend development server (Next.js)
echo.
echo 🔧 Type Synchronization:
echo   scripts types           - Generate TypeScript type definitions
echo.
echo 🧹 Cleanup:
echo   scripts clean           - Clean generated files and cache
echo.
goto end

:install
echo 📦 Installing all dependencies...
call :install-backend
call :install-frontend
goto end

:install-backend
echo 📦 Installing backend dependencies...
cd backend
uv sync
if errorlevel 1 (
    echo ❌ Backend dependency installation failed
    cd ..
    goto end
)
cd ..
echo ✅ Backend dependencies installed successfully
goto end

:install-frontend
echo 📦 Installing frontend dependencies...
if not exist frontend (
    echo ⚠️  Frontend directory does not exist, please setup frontend project first
    goto end
)
cd frontend
npm install
if errorlevel 1 (
    echo ❌ Frontend dependency installation failed
    cd ..
    goto end
)
cd ..
echo ✅ Frontend dependencies installed successfully
goto end

:dev
echo 🚀 Starting development environment...
echo 💡 Recommended to use two CMD windows:
echo    Window 1: scripts dev-backend
echo    Window 2: scripts dev-frontend
echo.
echo Press any key to start backend server (please manually open another window for frontend)...
pause >nul
goto dev-backend

:dev-backend
echo 🚀 Starting backend development server...
cd backend
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
cd ..
goto end

:dev-frontend
echo 🚀 Starting frontend development server...
if not exist frontend (
    echo ⚠️  Frontend directory does not exist, please setup frontend project first
    goto end
)
cd frontend
npm run dev
cd ..
goto end

:types
echo 🔧 Generating TypeScript type definitions...
cd backend
python scripts\generate_types.py
if errorlevel 1 (
    echo ❌ Type generation failed
    cd ..
    goto end
)
cd ..
echo ✅ Type generation completed
goto end

:clean
echo 🧹 Cleaning generated files...
if exist shared\schemas\openapi.json del shared\schemas\openapi.json
if exist shared\types\*.ts del shared\types\*.ts
if exist backend\src\__pycache__ rmdir /s /q backend\src\__pycache__
for /d /r backend\src %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
if exist frontend\.next rmdir /s /q frontend\.next
if exist frontend\node_modules\.cache rmdir /s /q frontend\node_modules\.cache
echo ✅ Cleanup completed

:end
