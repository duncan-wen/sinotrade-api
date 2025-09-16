@echo off
chcp 65001 >nul
echo 🎨 Starting Sinotrade Frontend Development Server...
echo 📍 Frontend URL: http://localhost:3000
echo 📍 Next.js Documentation: https://nextjs.org/docs
echo.

REM Start frontend in a new window
start "Sinotrade Frontend" cmd /k "cd frontend && pnpm dev"

echo.
echo ✅ Frontend server is starting in a new window
echo 🔄 Frontend will be available at: http://localhost:3000
echo.
echo Note: Close the frontend server window to stop it
pause
