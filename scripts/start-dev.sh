#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting InvestTracker Development Servers ===${NC}"

# Find absolute path of project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

# Function to clean up processes on exit
cleanup() {
    echo -e "\n${RED}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C and exit signals
trap cleanup SIGINT SIGTERM EXIT

# Start backend
echo -e "${GREEN}Starting backend (FastAPI)...${NC}"
cd "$PROJECT_ROOT/backend" || exit 1
source venv/bin/activate
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1 &
BACKEND_PID=$!

# Start frontend
echo -e "${GREEN}Starting frontend (Next.js)...${NC}"
cd "$PROJECT_ROOT/frontend" || exit 1
npm run dev &
FRONTEND_PID=$!

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID
