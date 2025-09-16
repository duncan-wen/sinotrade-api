@echo off
chcp 65001 >nul
echo 🎨 Starting Sinotrade Frontend Development Server...
echo 📍 Frontend URL: http://localhost:3000
echo 📍 Next.js Documentation: https://nextjs.org/docs
echo.
echo Press Ctrl+C to stop the server
echo.
cd frontend
pnpm dev
