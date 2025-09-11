@echo off
chcp 65001 >nul
echo 🚀 Starting Sinotrade API Backend Development Server...
echo 📍 API Documentation: http://localhost:8000/docs
echo 📍 API Root: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
cd backend
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
