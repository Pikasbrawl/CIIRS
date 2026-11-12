#!/usr/bin/env bash
# ==============================================================================
# CIIRS (CCTV Incident Intelligence & Reconstruction System)
# All-In-One Microservices Startup Script
# ==============================================================================

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo "  🚀 Starting CIIRS Microservices Ecosystem..."
echo "  Chandigarh Police Smart City Command & Control Centre"
echo "======================================================================"

# 1. Check Infrastructure Dependencies (PostgreSQL & Redis)
echo "[1/5] Checking Core Infrastructure..."
if ! pg_isready -q; then
    echo "  Starting PostgreSQL via Homebrew..."
    brew services start postgresql@17 || brew services start postgresql
fi

if ! redis-cli ping > /dev/null 2>&1; then
    echo "  Starting Redis via Homebrew..."
    brew services start redis
fi
echo "  ✅ PostgreSQL & Redis are operational."

# 2. Start Go + Gin Gateway (:8080)
echo "[2/5] Starting Go + Gin Backend Gateway on :8080..."
cd "$PROJECT_ROOT/backend-go"
if [ ! -f "./server" ]; then
    echo "  Compiling Go binary..."
    go build -o server ./cmd/server/main.go
fi
./server > "$PROJECT_ROOT/backend-go.log" 2>&1 &
GO_PID=$!
echo "  ✅ Go Gateway running (PID: $GO_PID)"

# 3. Start AI Engine (:5001)
echo "[3/5] Starting AI Video Analytics Engine on :5001..."
cd "$PROJECT_ROOT/ai-engine"
PYTHONPATH=. "$PROJECT_ROOT/backend/.venv/bin/python" app/main.py > "$PROJECT_ROOT/ai-engine.log" 2>&1 &
AI_PID=$!
echo "  ✅ AI Engine running (PID: $AI_PID)"

# 4. Start FastAPI Core (:8000)
echo "[4/5] Starting FastAPI Core Server on :8000..."
cd "$PROJECT_ROOT/backend"
"$PROJECT_ROOT/backend/.venv/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$PROJECT_ROOT/fastapi.log" 2>&1 &
FASTAPI_PID=$!
echo "  ✅ FastAPI running (PID: $FASTAPI_PID)"

# 5. Start Vite React Frontend (:5173)
echo "[5/5] Starting React 18 Frontend on :5173..."
cd "$PROJECT_ROOT/frontend"
npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "  ✅ Vite Frontend running (PID: $FRONTEND_PID)"

echo "======================================================================"
echo "  🎉 All CIIRS Microservices Successfully Started!"
echo "======================================================================"
echo "  • React Frontend:     http://localhost:5173"
echo "  • Full Stack App:     http://localhost:8000"
echo "  • FastAPI API Docs:   http://localhost:8000/docs"
echo "  • Go Gateway Health:  http://localhost:8080/api/v1/health"
echo "  • AI Engine Health:   http://localhost:5001/health"
echo "======================================================================"
echo "To expose globally via Cloudflare:"
echo "  cloudflared tunnel --protocol http2 --url http://localhost:8000"
echo "======================================================================"
