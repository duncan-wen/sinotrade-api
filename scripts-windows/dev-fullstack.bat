@echo off
chcp 65001 >nul
echo 🚀🎨 Starting Sinotrade Full-Stack Development Servers...
echo.
echo 📍 Frontend: http://localhost:3000
echo 📍 Backend API: http://localhost:8000
echo 📍 API Docs: http://localhost:8000/docs
echo.
echo Starting both Frontend and Backend servers...
echo Press Ctrl+C to stop all servers
echo.

REM Start backend in a new window
start "Sinotrade Backend" cmd /k "cd backend && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
start "Sinotrade Frontend" cmd /k "cd frontend && pnpm dev"

echo.
echo ✅ Both servers are starting in separate windows
echo 🔄 Frontend will be available at: http://localhost:3000
echo 🔄 Backend API will be available at: http://localhost:8000
echo.
echo Note: Close the individual server windows to stop them
pause
