#!/usr/bin/env bash
# ==============================================================================
# CIIRS All-In-One Microservices Shutdown Script
# ==============================================================================

echo "🛑 Stopping all CIIRS services..."
pkill -f "uvicorn app.main:app" || true
pkill -f "app/main.py" || true
pkill -f "./server" || true
pkill -f "vite" || true
pkill -f "cloudflared tunnel" || true
echo "✅ All CIIRS processes stopped."
