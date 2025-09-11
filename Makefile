# Sinotrade API Development Makefile

.PHONY: help install install-backend install-frontend dev-backend dev-frontend dev types clean

# Display available commands
help:
	@echo "Sinotrade API Development Commands:"
	@echo ""
	@echo "🚀 Installation & Setup:"
	@echo "  install          - Install all dependencies (backend + frontend)"
	@echo "  install-backend  - Install backend dependencies (Python)"
	@echo "  install-frontend - Install frontend dependencies (Node.js)"
	@echo ""
	@echo "💻 Development Services:"
	@echo "  dev             - Start both backend and frontend dev servers"
	@echo "  dev-backend     - Start backend development server (FastAPI)"
	@echo "  dev-frontend    - Start frontend development server (Next.js)"
	@echo ""
	@echo "🔧 Type Synchronization:"
	@echo "  types           - Generate TypeScript type definitions"
	@echo "  types-watch     - Monitor Python model changes and auto-generate types"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  clean           - Clean generated files and cache"

# Install all dependencies
install: install-backend install-frontend

# Install backend dependencies
install-backend:
	@echo "📦 Installing backend dependencies..."
	cd backend && uv sync
	@echo "✅ Backend dependencies installed successfully"

# Install frontend dependencies
install-frontend:
	@echo "📦 Installing frontend dependencies..."
	@if [ ! -d "frontend" ]; then \
		echo "⚠️  Frontend directory does not exist, please setup frontend project first"; \
		exit 1; \
	fi
	cd frontend && npm install
	@echo "✅ Frontend dependencies installed successfully"

# Generate TypeScript types
types:
	@echo "🔧 Generating TypeScript type definitions..."
	cd backend && python scripts/generate_types.py
	@echo "✅ Type generation completed"

# Monitor model changes and auto-generate types
types-watch:
	@echo "👀 Monitoring Python model changes..."
	@echo "Press Ctrl+C to stop monitoring"
	@while inotifywait -e modify backend/src/models/ 2>/dev/null || sleep 2; do \
		echo "🔄 Model changes detected, regenerating types..."; \
		make types; \
		echo "✅ Types updated"; \
	done

# Start backend development server
dev-backend:
	@echo "🚀 Starting backend development server..."
	cd backend && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend development server
dev-frontend:
	@echo "🚀 Starting frontend development server..."
	@if [ ! -d "frontend" ]; then \
		echo "⚠️  Frontend directory does not exist, please setup frontend project first"; \
		exit 1; \
	fi
	cd frontend && npm run dev

# Start both frontend and backend (requires tmux or separate terminals)
dev:
	@echo "🚀 Starting development environment..."
	@echo "💡 Recommended to use separate terminal windows:"
	@echo "   Terminal 1: make dev-backend"
	@echo "   Terminal 2: make dev-frontend"
	@echo ""
	@echo "Or use tmux:"
	@if command -v tmux >/dev/null 2>&1; then \
		tmux new-session -d -s sinotrade-dev -c "$(PWD)" "make dev-backend"; \
		tmux split-window -h -t sinotrade-dev -c "$(PWD)" "make dev-frontend"; \
		tmux attach-session -t sinotrade-dev; \
	else \
		echo "❌ tmux not installed, please manually open two terminals"; \
		exit 1; \
	fi

# Clean generated files
clean:
	@echo "🧹 Cleaning generated files..."
	rm -rf shared/schemas/openapi.json
	rm -rf shared/types/*.ts
	rm -rf backend/src/__pycache__/
	find backend/src -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@if [ -d "frontend" ]; then \
		cd frontend && rm -rf .next/ node_modules/.cache/; \
	fi
	@echo "✅ Cleanup completed"

# Rebuild project
rebuild: clean types
	@echo "🔄 Rebuilding project..."
	@echo "✅ Rebuild completed"
