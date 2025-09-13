param(
    [Parameter(Position=0)]
    [string]$Command = ""
)

function Show-Help {
    Write-Host ""
    Write-Host "🚀 Sinotrade API Development Commands (Windows)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📦 Installation and Setup:" -ForegroundColor Yellow
    Write-Host "  scripts install          - Install all dependencies (backend + frontend)"
    Write-Host "  scripts install-backend  - Install backend dependencies (Python)"
    Write-Host "  scripts install-frontend - Install frontend dependencies (Node.js)"
    Write-Host ""
    Write-Host "💻 Development Services:" -ForegroundColor Yellow
    Write-Host "  scripts dev             - Start both frontend and backend dev servers"
    Write-Host "  scripts dev-backend     - Start backend development server (FastAPI)"
    Write-Host "  scripts dev-frontend    - Start frontend development server (Next.js)"
    Write-Host ""
    Write-Host "🔧 Type Synchronization:" -ForegroundColor Yellow
    Write-Host "  scripts types           - Generate TypeScript type definitions"
    Write-Host ""
    Write-Host "🐍 Code Quality:" -ForegroundColor Yellow
    Write-Host "  scripts lint            - Show linting and formatting commands"
    Write-Host ""
    Write-Host "🧹 Cleanup:" -ForegroundColor Yellow
    Write-Host "  scripts clean           - Clean generated files and cache"
    Write-Host ""
}

function Install-Backend {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Blue
    Push-Location backend
    try {
        & uv sync --dev
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
            return $false
        }
        Write-Host "✅ Backend dependencies installed successfully" -ForegroundColor Green
        return $true
    }
    finally {
        Pop-Location
    }
}

function Install-Frontend {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
    if (-not (Test-Path "frontend")) {
        Write-Host "⚠️  Frontend directory does not exist, please setup frontend project first" -ForegroundColor Yellow
        return $false
    }
    Push-Location frontend
    try {
        & pnpm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
            return $false
        }
        Write-Host "✅ Frontend dependencies installed successfully" -ForegroundColor Green
        return $true
    }
    finally {
        Pop-Location
    }
}

function Install-All {
    Write-Host "📦 Installing all dependencies..." -ForegroundColor Blue
    $backendSuccess = Install-Backend
    if (-not $backendSuccess) {
        Write-Host "❌ Backend installation failed, skipping frontend installation" -ForegroundColor Red
        return
    }
    $frontendSuccess = Install-Frontend
    if (-not $frontendSuccess) {
        Write-Host "❌ Frontend installation failed" -ForegroundColor Red
        return
    }
    Write-Host "🎉 All dependencies installed successfully!" -ForegroundColor Green
}

function Start-DevBackend {
    Write-Host "🚀 Starting backend development server..." -ForegroundColor Blue
    Push-Location backend
    try {
        & uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
    }
    finally {
        Pop-Location
    }
}

function Start-DevFrontend {
    Write-Host "🚀 Starting frontend development server..." -ForegroundColor Blue
    if (-not (Test-Path "frontend")) {
        Write-Host "⚠️  Frontend directory does not exist, please setup frontend project first" -ForegroundColor Yellow
        return
    }
    Push-Location frontend
    try {
        & npm run dev
    }
    finally {
        Pop-Location
    }
}

function Start-Dev {
    Write-Host "🚀 Starting development environment..." -ForegroundColor Blue
    Write-Host "💡 Recommended to use two PowerShell windows:" -ForegroundColor Yellow
    Write-Host "   Window 1: .\scripts-windows\scripts.ps1 dev-backend"
    Write-Host "   Window 2: .\scripts-windows\scripts.ps1 dev-frontend"
    Write-Host ""
    Write-Host "Press any key to start backend server (please manually open another window for frontend)..."
    Read-Host
    Start-DevBackend
}

function Generate-Types {
    Write-Host "🔧 Generating TypeScript type definitions..." -ForegroundColor Blue
    Push-Location backend
    try {
        & uv run python scripts\generate_types.py
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Type generation failed" -ForegroundColor Red
            return
        }
        Write-Host "✅ Type generation completed" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

function Show-Lint {
    Write-Host "🐍 Python Code Quality Tools" -ForegroundColor Blue
    Write-Host ""
    & .\scripts-windows\lint.bat
}

function Clean-Files {
    Write-Host "🧹 Cleaning generated files..." -ForegroundColor Blue

    if (Test-Path "shared\schemas\openapi.json") { Remove-Item "shared\schemas\openapi.json" }
    if (Test-Path "shared\types\*.ts") { Remove-Item "shared\types\*.ts" }
    if (Test-Path "backend\src\__pycache__") { Remove-Item "backend\src\__pycache__" -Recurse -Force }

    Get-ChildItem -Path "backend\src" -Name "__pycache__" -Recurse -Directory | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force
    }

    if (Test-Path "frontend\.next") { Remove-Item "frontend\.next" -Recurse -Force }
    if (Test-Path "frontend\node_modules\.cache") { Remove-Item "frontend\node_modules\.cache" -Recurse -Force }

    Write-Host "✅ Cleanup completed" -ForegroundColor Green
}

# Main command routing
switch ($Command.ToLower()) {
    "" { Show-Help }
    "help" { Show-Help }
    "install" { Install-All }
    "install-backend" { Install-Backend }
    "install-frontend" { Install-Frontend }
    "dev" { Start-Dev }
    "dev-backend" { Start-DevBackend }
    "dev-frontend" { Start-DevFrontend }
    "types" { Generate-Types }
    "lint" { Show-Lint }
    "clean" { Clean-Files }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
    }
}
