# TechTrack Startup Script - PowerShell Version
# Usage: .\startup_servers.ps1
# This starts both Django backend and Vite frontend servers

param(
    [switch]$Backend = $false,
    [switch]$Frontend = $false,
    [switch]$All = $true
)

$ErrorActionPreference = "Stop"

# Colors for console output
$colors = @{
    Success = "Green"
    Error = "Red"
    Info = "Cyan"
    Warning = "Yellow"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    Write-Host $Message -ForegroundColor $colors[$Type]
}

# ==========================================
# Configuration
# ==========================================

$ProjectRoot = "c:\Users\Jayvee\Documents\GitHub\TechTrack"
$BackendDir = "$ProjectRoot\backend\djangomonitor"
$FrontendDir = "$BackendDir\frontend"
$VenvPath = "C:\Users\Jayvee\.virtualenvs\backend-AZw-EwJW"
$PythonExe = "$VenvPath\Scripts\python.exe"

# ==========================================
# Validation
# ==========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TechTrack Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Status "[1/3] Checking environment..." "Info"

if (-not (Test-Path $VenvPath)) {
    Write-Status "ERROR: Virtual environment not found at $VenvPath" "Error"
    Write-Status "Run: python -m pipenv install" "Warning"
    exit 1
}
Write-Status "✓ Virtual environment found" "Success"

if (-not (Test-Path "$BackendDir\manage.py")) {
    Write-Status "ERROR: Django manage.py not found" "Error"
    exit 1
}
Write-Status "✓ Django project found" "Success"

if (-not (Test-Path "$FrontendDir\package.json")) {
    Write-Status "ERROR: Frontend package.json not found" "Error"
    exit 1
}
Write-Status "✓ Frontend project found" "Success"

# ==========================================
# Start Servers
# ==========================================

Write-Host ""
Write-Status "[2/3] Preparing startup..." "Info"
Write-Host ""
Write-Host "Starting servers in new PowerShell windows..." -ForegroundColor Yellow
Write-Host ""

if ($All -or $Backend) {
    Write-Status "Starting Backend (Django)..." "Info"
    $BackendCommand = "cd '$BackendDir'; `
        & '$PythonExe' manage.py runserver 0.0.0.0:8000; `
        Read-Host 'Press Enter to close'"
    
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", $BackendCommand -WindowStyle Normal
    Start-Sleep -Seconds 1
}

if ($All -or $Frontend) {
    Write-Status "Starting Frontend (Vite)..." "Info"
    $FrontendCommand = "cd '$FrontendDir'; `
        npm run dev; `
        Read-Host 'Press Enter to close'"
    
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", $FrontendCommand -WindowStyle Normal
    Start-Sleep -Seconds 1
}

# ==========================================
# Display Information
# ==========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Environment Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:       http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend App:      http://localhost:5174" -ForegroundColor Cyan
Write-Host "MySQL Workbench:   Open separately for database" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server windows have been opened in separate terminals." -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop servers: Close the terminal windows or press Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Keep main window open
Write-Host "Press Enter to exit this window..." -ForegroundColor Gray
Read-Host ""
