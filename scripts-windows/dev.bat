@echo off
chcp 65001 >nul
echo 🚀 Starting Sinotrade API Backend Development Server...
echo 📍 API Documentation: http://localhost:8000/docs
echo 📍 API Root: http://localhost:8000
echo.
echo ⚠️  NOTE: This command only starts the BACKEND server
echo 💡 TIP: Use 'sinotrade fullstack' to start both frontend and backend
echo 💡 TIP: Use 'sinotrade frontend' to start only the frontend
echo.
echo Press Ctrl+C to stop the server
echo.
cd backend
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
