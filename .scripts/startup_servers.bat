@echo off
REM TechTrack Startup Script - All Servers
REM This script sets up and starts both backend and frontend servers
REM Requirements: Python 3.13+, Node.js, MySQL

echo.
echo ========================================
echo   TechTrack Startup Script
echo ========================================
echo.

REM Define paths
set PROJECT_ROOT=c:\Users\Jayvee\Documents\GitHub\TechTrack
set BACKEND_DIR=%PROJECT_ROOT%\backend\djangomonitor
set FRONTEND_DIR=%BACKEND_DIR%\frontend
set VENV_PATH=C:\Users\Jayvee\.virtualenvs\backend-AZw-EwJW
set PYTHON_EXE=%VENV_PATH%\Scripts\python.exe

echo [1/3] Checking environment...
if not exist "%VENV_PATH%" (
    echo ERROR: Virtual environment not found at %VENV_PATH%
    echo Please run: python -m pipenv install
    pause
    exit /b 1
)
echo ✓ Virtual environment found

if not exist "%BACKEND_DIR%\manage.py" (
    echo ERROR: Django manage.py not found at %BACKEND_DIR%
    pause
    exit /b 1
)
echo ✓ Django project found

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: Frontend package.json not found
    pause
    exit /b 1
)
echo ✓ Frontend project found

echo.
echo [2/3] Preparing startup...
echo.
echo Starting in 3 terminal windows:
echo   - Terminal 1: Django Backend (port 8000)
echo   - Terminal 2: Vite Frontend (port 5174)
echo   - Terminal 3: Available for commands
echo.
echo Press Enter to continue...
pause

REM Terminal 1: Django Backend
echo [3/3] Starting servers...
start "TechTrack Backend" cmd /k "%PYTHON_EXE% %BACKEND_DIR%\manage.py runserver 0.0.0.0:8000"

REM Terminal 2: Vite Frontend  
cd /d "%FRONTEND_DIR%"
start "TechTrack Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   Environment Ready!
echo ========================================
echo.
echo Backend API:    http://localhost:8000
echo Frontend App:   http://localhost:5174
echo.
echo Server windows should open automatically.
echo Use MySQL Workbench to view/manage database.
echo.
pause
