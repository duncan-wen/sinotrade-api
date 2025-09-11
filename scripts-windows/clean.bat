@echo off
chcp 65001 >nul
echo 🧹 Cleaning generated files and cache...
echo.

if exist shared\schemas\openapi.json (
    del shared\schemas\openapi.json
    echo ✅ Cleaned OpenAPI schema
)

if exist shared\types\*.ts (
    del shared\types\*.ts
    echo ✅ Cleaned TypeScript type files
)

if exist backend\src\__pycache__ (
    rmdir /s /q backend\src\__pycache__
    echo ✅ Cleaned Python cache files
)

for /d /r backend\src %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul

if exist backend\.venv\Lib\site-packages\__pycache__ (
    for /d /r backend\.venv\Lib\site-packages %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
    echo ✅ Cleaned virtual environment cache
)

if exist frontend\.next (
    rmdir /s /q frontend\.next
    echo ✅ Cleaned Next.js build files
)

if exist frontend\node_modules\.cache (
    rmdir /s /q frontend\node_modules\.cache
    echo ✅ Cleaned Node.js cache
)

echo.
echo ✅ Cleanup completed
pause
