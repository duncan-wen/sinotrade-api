@echo off
chcp 65001 >nul
echo 🚀 Starting Sinotrade Backend Development Server...
echo 📍 API Documentation: http://localhost:8000/docs
echo 📍 API Root: http://localhost:8000
echo.

REM Start backend in a new window
start "Sinotrade Backend" cmd /k "cd backend && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo ✅ Backend server is starting in a new window
echo 🔄 Backend API will be available at: http://localhost:8000
echo 🔄 API Documentation will be available at: http://localhost:8000/docs
echo.
echo Note: Close the backend server window to stop it
pause
