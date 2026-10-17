@echo off
title Unified Financial Fraud Detection System Launcher
echo ===============================================================
echo     Unified Financial Fraud Detection System - Starting
echo ===============================================================
echo.

echo [1/3] Starting Python ML Service (Port 8000)...
start "Fraud ML Service (Port 8000)" cmd /k "cd /d %~dp0ml_service && python app.py"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Node.js Backend Gateway (Port 5000)...
start "Backend Gateway (Port 5000)" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 /nobreak >nul

echo [3/3] Starting React Frontend Dashboard (Port 5173)...
start "React Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===============================================================
echo  All 3 services are running!
echo  Open your web browser at:
echo       http://localhost:5173
echo ===============================================================
echo.
pause
