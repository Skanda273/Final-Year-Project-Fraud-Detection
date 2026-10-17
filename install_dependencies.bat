@echo off
title Unified Financial Fraud Detection System - Setup
echo ===============================================================
echo   Unified Financial Fraud Detection System - One-Click Installer
echo ===============================================================
echo.
echo This script will install all required dependencies for:
echo  1. Python ML Service
echo  2. Node.js Backend Gateway
echo  3. React Frontend Dashboard
echo.
pause

echo.
echo [1/3] Installing Python ML dependencies...
cd /d %~dp0ml_service
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [-] Python package installation warning. Please ensure Python is on PATH.
)

echo.
echo [2/3] Installing Node.js Backend dependencies...
if not exist "%~dp0backend\.env" (
    echo [*] Creating backend .env file from .env.example...
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
)
cd /d %~dp0backend
call npm.cmd install
if %errorlevel% neq 0 (
    call npm install
)

echo.
echo [3/3] Installing React Frontend dependencies...
cd /d %~dp0frontend
call npm.cmd install
if %errorlevel% neq 0 (
    call npm install
)

echo.
echo ===============================================================
echo  Setup Complete! All dependencies are installed.
echo  You can now start the application by double-clicking:
echo       start_project.bat
echo ===============================================================
echo.
pause
