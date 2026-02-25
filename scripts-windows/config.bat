@echo off

REM === Sinotrade Port Config ===
REM Change these two values to match your machine

set BACKEND_PORT=8001
set FRONTEND_PORT=3001

REM Auto-sync frontend/.env.local
set ENV_FILE=%~dp0..\frontend\.env.local
echo NEXT_PUBLIC_API_URL=http://localhost:%BACKEND_PORT%> "%ENV_FILE%"
echo NEXT_PUBLIC_SOCKET_URL=http://localhost:%BACKEND_PORT%>> "%ENV_FILE%"
echo BACKEND_URL=http://localhost:%BACKEND_PORT%>> "%ENV_FILE%"
