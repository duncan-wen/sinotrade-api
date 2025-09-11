# 🪟 Windows Scripts Directory

This directory contains all Windows batch files for the Sinotrade API project.

## 📁 Files Overview

| File          | Purpose                         | Usage                         |
| ------------- | ------------------------------- | ----------------------------- |
| `install.bat` | Install backend dependencies    | Double-click or `install.bat` |
| `dev.bat`     | Start development server        | Double-click or `dev.bat`     |
| `types.bat`   | Generate TypeScript types       | `types.bat`                   |
| `clean.bat`   | Clean cache and generated files | `clean.bat`                   |
| `scripts.bat` | Full command suite              | `scripts.bat help`            |

## 🚀 Quick Start

### Method 1: Use main command (from project root)
```cmd
sinotrade install    # Install dependencies (includes dev tools)
sinotrade dev        # Start server
sinotrade types      # Generate types
sinotrade clean      # Clean files
```

### Method 2: Use individual scripts
```cmd
cd scripts-windows
install.bat          # Install dependencies (includes dev tools)
dev.bat             # Start server
types.bat           # Generate types
clean.bat           # Clean files
```

### Method 3: Double-click files
Simply double-click any `.bat` file to run it.

## 🔧 Advanced Usage

For full command options:
```cmd
cd scripts-windows
scripts.bat help
```

## 📝 Notes

- All scripts automatically handle UTF-8 encoding for proper display
- Scripts work from any directory (they handle path navigation)
- Backend virtual environment is managed in `backend/.venv/`
