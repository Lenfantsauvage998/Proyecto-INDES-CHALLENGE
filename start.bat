@echo off
echo Starting ISSE Certificate Tool...
echo.

:: Start FastAPI backend in background
echo [1/2] Starting backend on http://localhost:8000 ...
start "ISSE Backend" cmd /k "cd /d "%~dp0" && python -m uvicorn backend.api:app --reload --port 8001"

:: Wait a moment for backend to start
timeout /t 2 /nobreak >nul

:: Start Vite frontend
echo [2/2] Starting frontend on http://localhost:5173 ...
cd /d "%~dp0frontend"
npm run dev

pause
