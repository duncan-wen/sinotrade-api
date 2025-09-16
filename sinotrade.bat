@echo off
chcp 65001 >nul

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="dev" goto dev
if "%1"=="frontend" goto frontend
if "%1"=="backend" goto backend
if "%1"=="fullstack" goto fullstack
if "%1"=="types" goto types
if "%1"=="clean" goto clean
goto help

:help
echo.
echo 🚀 Sinotrade API - Quick Commands
echo.
echo Available commands:
echo   sinotrade install    - Install backend dependencies
echo   sinotrade dev        - Start backend development server (legacy)
echo   sinotrade frontend   - Start frontend development server only
echo   sinotrade backend    - Start backend development server only
echo   sinotrade fullstack  - Start both frontend and backend servers
echo   sinotrade types      - Generate TypeScript types
echo   sinotrade clean      - Clean cache files
echo   sinotrade help       - Show this help
echo.
echo 📁 For more commands, check: scripts-windows\
echo.
goto end

:install
call scripts-windows\install.bat
goto end

:dev
call scripts-windows\dev.bat
goto end

:frontend
call scripts-windows\dev-frontend.bat
goto end

:backend
call scripts-windows\dev-backend.bat
goto end

:fullstack
call scripts-windows\dev-fullstack.bat
goto end

:types
call scripts-windows\types.bat
goto end

:clean
call scripts-windows\clean.bat
goto end

:end
