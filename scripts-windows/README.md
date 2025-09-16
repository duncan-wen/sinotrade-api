# 🪟 Windows Scripts Directory

This directory contains all Windows batch files for the Sinotrade API project.

## 📁 Files Overview

| File                    | Purpose                              | Usage                            |
| ----------------------- | ------------------------------------ | -------------------------------- |
| `install.bat`          | Install all dependencies             | `install.bat`                    |
| `install-backend.bat`  | Install backend dependencies only   | `install-backend.bat`           |
| `install-frontend.bat` | Install frontend dependencies only  | `install-frontend.bat`          |
| `dev-fullstack.bat`    | Start both frontend & backend       | `dev-fullstack.bat`             |
| `dev-backend.bat`      | Start backend development server    | `dev-backend.bat`               |
| `dev-frontend.bat`     | Start frontend development server   | `dev-frontend.bat`              |
| `dev.bat`              | Start backend only (legacy)         | `dev.bat`                       |
| `types.bat`            | Generate TypeScript types           | `types.bat`                     |
| `clean.bat`            | Clean cache and generated files     | `clean.bat`                     |
| `scripts.bat`          | Full command suite (legacy)         | `scripts.bat help`              |

## 🚀 Quick Start

### Method 1: Use main command (from project root) ⭐ RECOMMENDED
```cmd
sinotrade install           # Install all dependencies (backend + frontend)
sinotrade install-backend   # Install backend dependencies only
sinotrade install-frontend  # Install frontend dependencies only
sinotrade dev               # Start both servers in separate windows
sinotrade frontend          # Start frontend development server only
sinotrade backend           # Start backend development server only
sinotrade types             # Generate TypeScript types
sinotrade clean             # Clean cache and generated files
```

### Method 2: Use individual scripts directly
```cmd
cd scripts-windows
install.bat                 # Install all dependencies
install-backend.bat         # Install backend dependencies only
install-frontend.bat        # Install frontend dependencies only
dev-fullstack.bat          # Start both servers in separate windows
dev-frontend.bat           # Start frontend development server
dev-backend.bat            # Start backend development server
types.bat                  # Generate types
clean.bat                  # Clean files
```

### Method 3: Double-click files
Simply double-click any `.bat` file to run it directly.

## 🔧 Advanced Features

### Development Servers
- **Frontend**: Runs on http://localhost:3000 (Next.js with Turbo)
- **Backend**: Runs on http://localhost:8000 (FastAPI with auto-reload)
- **API Docs**: Available at http://localhost:8000/docs

### Dual Server Mode
```cmd
sinotrade dev               # Opens 2 separate terminal windows
# or
dev-fullstack.bat          # Same functionality
```

### Legacy Commands
For compatibility with older setups:
```cmd
cd scripts-windows
scripts.bat help           # Full legacy command suite
```

## 📝 Notes

- ✅ All scripts automatically handle UTF-8 encoding for proper emoji display
- ✅ Scripts work from any directory (they handle path navigation)
- ✅ Uses `pushd/popd` to ensure correct directory restoration
- ✅ Backend virtual environment is managed with `uv` in `backend/.venv/`
- ✅ Frontend dependencies managed with `pnpm`
- ✅ Unified architecture: main script calls specialized scripts
