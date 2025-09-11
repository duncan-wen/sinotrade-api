# 🌍 Environment Variables Setup Guide

This guide explains how to manage environment variables in the Sinotrade API monorepo.

## 📁 Environment Files Structure

```
sinotrade-api/
├── .env                        # 🌍 Global variables (create from template)
├── env-template.example        # 📋 Global template
├── backend/
│   ├── .env.local             # 🐍 Backend-specific (create from template)
│   └── env-backend.example    # 📋 Backend template
├── frontend/                   # (future)
│   ├── .env.local             # ⚛️ Frontend-specific
│   └── frontend-env.example   # 📋 Frontend template
```

## 🔧 Setup Instructions

### 1️⃣ Create Global Environment File
```bash
# Windows
copy env-template.example .env

# Linux/macOS
cp env-template.example .env
```

### 2️⃣ Create Backend Environment File
```bash
# Windows
copy backend\env-backend.example backend\.env.local

# Linux/macOS
cp backend/env-backend.example backend/.env.local
```

### 3️⃣ Configure Your Variables

Edit `.env` and `backend/.env.local` with your actual values:

**Global (.env):**
- JWT secrets
- API URLs
- Redis configuration
- CORS settings

**Backend (backend/.env.local):**
- Shioaji API credentials
- Database URLs
- Cache settings
- Logging configuration

## 🔒 Security Best Practices

### ✅ DO:
- Use different `.env` files for different environments
- Keep secrets in environment variables, never in code
- Use strong, unique secrets for production
- Regularly rotate API keys and secrets

### ❌ DON'T:
- Commit `.env` files to git (they're ignored by default)
- Share production secrets in development files
- Use default passwords in production
- Store sensitive data in frontend environment variables

## 🌐 Environment Hierarchy

Variables are loaded in this order (later ones override earlier ones):

1. **System environment variables**
2. **Global `.env`** (shared settings)
3. **Service-specific `.env.local`** (backend/frontend specific)
4. **Runtime overrides**

## 📋 Variable Categories

### 🌍 Global Variables (.env)
- Authentication secrets (JWT)
- Service URLs (backend, frontend)
- Shared cache configuration (Redis)
- Cross-service settings

### 🐍 Backend Variables (backend/.env.local)
- Shioaji API credentials
- Database connections
- Server configuration
- Logging settings

### ⚛️ Frontend Variables (frontend/.env.local) - Future
- Public API endpoints (NEXT_PUBLIC_*)
- UI configuration
- Feature flags
- Analytics tracking

## 🚀 Development vs Production

### Development
```bash
# .env
NODE_ENV=development
DEBUG=true
SHIOAJI_SIMULATE=1

# backend/.env.local
HOST=0.0.0.0
PORT=8000
RELOAD=true
```

### Production
```bash
# .env
NODE_ENV=production
DEBUG=false
SHIOAJI_SIMULATE=0

# backend/.env.local
HOST=0.0.0.0
PORT=8000
RELOAD=false
```

## 🔍 Loading Environment Variables

### Backend (Python)
```python
from dotenv import load_dotenv
import os

# Load global .env
load_dotenv()

# Load backend-specific .env.local
load_dotenv('.env.local', override=True)

# Access variables
api_key = os.getenv('SHIOAJI_API_KEY')
```

### Frontend (Next.js) - Future
```javascript
// Only NEXT_PUBLIC_* variables are available in browser
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

## 🛠️ Validation

Create a validation script to check required variables:

```python
# scripts/validate_env.py
import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv('.env.local', override=True)

required_vars = [
    'SHIOAJI_API_KEY',
    'SHIOAJI_SECRET_KEY',
    'JWT_SECRET',
]

missing = [var for var in required_vars if not os.getenv(var)]

if missing:
    print(f"❌ Missing required environment variables: {missing}")
    exit(1)
else:
    print("✅ All required environment variables are set")
```

## 📝 Example Configuration

After setup, your files should look like:

**.env (Global)**
```bash
NODE_ENV=development
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key-here
```

**backend/.env.local (Backend)**
```bash
SHIOAJI_API_KEY=your-api-key
SHIOAJI_SECRET_KEY=your-secret-key
SHIOAJI_SIMULATE=1
HOST=0.0.0.0
PORT=8000
```

---

Remember to never commit actual `.env` files to version control! 🔒
