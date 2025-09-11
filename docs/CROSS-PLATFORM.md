# 🌐 Cross-Platform Development Guide

This project supports both **Windows** and **Linux/macOS** development environments.

## 🪟 Windows

### Quick Commands
```cmd
sinotrade install    # Install dependencies
sinotrade dev        # Start development server
sinotrade types      # Generate TypeScript types
sinotrade clean      # Clean cache files
sinotrade help       # Show help
```

### Detailed Commands
```cmd
scripts-windows\install.bat    # Install dependencies
scripts-windows\dev.bat        # Start server
scripts-windows\types.bat      # Generate types
scripts-windows\clean.bat      # Clean cache
scripts-windows\scripts.bat help  # Full options
```

## 🐧 Linux / macOS

### Prerequisites
```bash
# Install make (usually pre-installed)
sudo apt install make          # Ubuntu/Debian
sudo yum install make          # CentOS/RHEL
brew install make              # macOS

# Install uv for Python package management
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Commands
```bash
make help                      # Show all commands
make install                   # Install all dependencies
make install-backend           # Install backend only
make dev-backend              # Start backend server
make dev-frontend             # Start frontend server
make types                    # Generate TypeScript types
make types-watch              # Auto-generate on changes
make clean                    # Clean cache files
```

## 🔄 Cross-Platform Features

### Virtual Environment Management
- **Windows**: `backend\.venv\`
- **Linux/macOS**: `backend/.venv/`

### Development Servers
Both platforms support:
- **Backend**: http://localhost:8000 (FastAPI + Uvicorn)
- **Frontend**: http://localhost:3000 (Next.js, when available)

### Type Generation
Both platforms can generate TypeScript types from Python models:
- **Windows**: `sinotrade types` or `scripts-windows\types.bat`
- **Linux/macOS**: `make types`

## 🛠️ Platform-Specific Notes

### Windows
- Uses batch files (`.bat`) with UTF-8 encoding support
- Organized in `scripts-windows/` directory
- Main command: `sinotrade.bat`

### Linux/macOS
- Uses Makefile with POSIX shell commands
- Includes `inotifywait` for file watching (types-watch)
- tmux integration for concurrent dev servers

### Shared Components
- **Backend**: Same Python code works on both platforms
- **Dependencies**: `uv` package manager works cross-platform
- **Git**: `.gitignore` handles both Windows and Unix patterns

## 🚀 Quick Start by Platform

### Windows Users
1. `sinotrade install` - Install dependencies
2. `sinotrade dev` - Start development server
3. Visit http://localhost:8000/docs

### Linux/macOS Users
1. `make install-backend` - Install dependencies
2. `make dev-backend` - Start development server
3. Visit http://localhost:8000/docs

## 🔧 IDE Configuration

Both platforms work with:
- **VS Code**: Works identically on both platforms
- **PyCharm**: Cross-platform Python IDE
- **Cursor**: AI-powered code editor

Virtual environment activation:
- **Windows**: `backend\.venv\Scripts\activate`
- **Linux/macOS**: `source backend/.venv/bin/activate`

---

Choose your platform and enjoy developing! 🎉
