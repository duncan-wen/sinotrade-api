@echo off
chcp 65001 >nul

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="install-frontend" goto install-frontend
if "%1"=="install-backend" goto install-backend
if "%1"=="dev" goto dev
if "%1"=="fe" goto fe
if "%1"=="be" goto be
if "%1"=="fullstack" goto fullstack
if "%1"=="types" goto types
if "%1"=="clean" goto clean
goto help

:help
echo.
echo 🚀 Sinotrade API - Quick Commands
echo.
echo Available commands:
echo   sinotrade install           - Install all dependencies (backend + frontend)
echo   sinotrade install-backend   - Install backend dependencies only
echo   sinotrade install-frontend  - Install frontend dependencies only
echo   sinotrade dev               - Start both frontend and backend servers
echo   sinotrade fe                - Start frontend development server only
echo   sinotrade be                - Start backend development server only
echo   sinotrade fullstack         - Same as 'dev' (alias)
echo   sinotrade types             - Generate TypeScript types
echo   sinotrade clean             - Clean cache files
echo   sinotrade help              - Show this help
echo.
echo 📁 For more commands, check: scripts-windows\
echo.
goto end

:install
call scripts-windows\install.bat
goto end

:install-backend
call scripts-windows\install-backend.bat
pause
goto end

:install-frontend
call scripts-windows\install-frontend.bat
pause
goto end

:dev
call scripts-windows\dev-fullstack.bat
goto end

:fe
call scripts-windows\dev-frontend.bat
goto end

:be
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
