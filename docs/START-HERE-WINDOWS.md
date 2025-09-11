# 🚀 Windows Quick Start Guide

## 📋 Windows-Specific Commands

### Quick Commands (from project root)
```cmd
sinotrade install          # Install dependencies (includes dev tools)
sinotrade dev              # Start development server
sinotrade types            # Generate TypeScript types
sinotrade clean            # Clean cache files
sinotrade help             # Show help
```

### Individual Scripts (in scripts-windows folder)
```cmd
scripts-windows\install.bat    # Install dependencies (includes dev tools)
scripts-windows\dev.bat        # Start development server
scripts-windows\types.bat      # Generate TypeScript types
scripts-windows\clean.bat      # Clean cache files
scripts-windows\scripts.bat help  # Full command options
```

## 🔧 One-Click Experience

**Recommended workflow for beginners:**

**Method 1: Quick Commands**
1. **Run `sinotrade install`** - Install backend dependencies (includes dev tools)
2. **Run `sinotrade dev`** - Start development server
3. **Open browser** - Visit http://localhost:8000/docs

**Method 2: Double-click**
1. **Double-click `scripts-windows\install.bat`**
2. **Double-click `scripts-windows\dev.bat`**
3. **Open browser** - Visit http://localhost:8000/docs

## 📝 FAQ

### Q: Error when running install.bat?
A: Please ensure Python and uv are installed. Reference: https://docs.astral.sh/uv/getting-started/installation/

### Q: Want to generate TypeScript types?
A: Need to install Node.js first, then run `types.bat`

### Q: How to stop the server?
A: Press `Ctrl + C` in the CMD window

## 🎯 Next Steps

After server startup, you can:
- 📖 View API documentation: http://localhost:8000/docs
- 🧪 Test API endpoints: http://localhost:8000/api/quote/2330
- 🔧 Develop frontend interface (to be built)

---

**💡 Tip**: If you're more familiar with Linux/macOS, you can also use `make` commands (requires additional installation)
