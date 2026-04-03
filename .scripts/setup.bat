@echo off
REM TechTrack - Quick Setup for Windows
REM This script sets up backend and frontend quickly

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   TechTrack Quick Setup
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Missing Python 3.13 - Install from https://python.org
    pause
    exit /b 1
)
echo [OK] Python installed

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo Missing Node.js 18+ - Install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js installed

echo.
echo Setting up Backend...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

if not exist ".env" (
    copy ".env.example" ".env"
    echo.
    echo [!] Edit .env file with your MySQL credentials
)

echo.
echo Setting up Frontend...
cd ..\frontend
npm install

echo.
echo ========================================
echo [DONE] Setup Complete!
echo ========================================
echo.
echo Read docs/SETUP.md for detailed instructions
echo.
pause
