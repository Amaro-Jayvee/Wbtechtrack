# TechTrack - Windows Setup Script
# Run this script to automatically set up TechTrack on Windows
# Right-click and "Run with PowerShell" or open PowerShell in TechTrack folder and run:
# powershell -ExecutionPolicy Bypass -File .scripts\setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TechTrack Setup Script for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin (recommended but not required)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

function Check-Command {
    param($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

function Install-Backend {
    Write-Host "Setting up Backend (Django + MySQL)..." -ForegroundColor Green
    Write-Host ""
    
    # Navigate to backend
    cd backend
    
    # Create virtual environment
    Write-Host "1️⃣  Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    
    # Activate virtual environment
    Write-Host "2️⃣  Activating virtual environment..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
    
    # Install dependencies
    Write-Host "3️⃣  Installing Python dependencies..." -ForegroundColor Yellow
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Check .env file
    if (-not (Test-Path ".env")) {
        Write-Host "4️⃣  Creating .env file from template..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "⚠️  Please edit .env file with your MySQL credentials!" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "✅ Backend setup complete!" -ForegroundColor Green
    Write-Host ""
}

function Install-Frontend {
    Write-Host "Setting up Frontend (React + Vite)..." -ForegroundColor Green
    Write-Host ""
    
    # Navigate to frontend
    cd ..\frontend
    
    Write-Host "1️⃣  Installing Node dependencies..." -ForegroundColor Yellow
    npm install
    
    Write-Host "✅ Frontend setup complete!" -ForegroundColor Green
    Write-Host ""
}

function Verify-Requirements {
    Write-Host "Checking system requirements..." -ForegroundColor Green
    Write-Host ""
    
    $requirements = @(
        @{ "name" = "Python"; "command" = "python"; "version" = "--version" },
        @{ "name" = "Node.js"; "command" = "node"; "version" = "--version" },
        @{ "name" = "npm"; "command" = "npm"; "version" = "--version" }
    )
    
    $allInstalled = $true
    
    foreach ($req in $requirements) {
        if (Check-Command $req.command) {
            $version = & $req.command $req.version
            Write-Host "✅ $($req.name): $version" -ForegroundColor Green
        } else {
            Write-Host "❌ $($req.name): NOT INSTALLED" -ForegroundColor Red
            $allInstalled = $false
        }
    }
    
    if (-not $allInstalled) {
        Write-Host ""
        Write-Host "⚠️  Some requirements are missing!" -ForegroundColor Yellow
        Write-Host "Please install from:" -ForegroundColor Yellow
        Write-Host "  • Python 3.13: https://python.org" -ForegroundColor Cyan
        Write-Host "  • Node.js 18+: https://nodejs.org" -ForegroundColor Cyan
        Write-Host "  • MySQL 8.0+: https://mysql.com" -ForegroundColor Cyan
        Write-Host ""
        return $false
    }
    
    return $true
}

# Main execution
try {
    # Verify requirements
    if (-not (Verify-Requirements)) {
        Write-Host "Setup cancelled due to missing requirements." -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Starting setup..." -ForegroundColor Cyan
    Write-Host ""
    
    # Install backend
    Install-Backend
    
    # Navigate back to root
    cd ..\..\frontend 2>$null || cd ..\frontend
    
    # Install frontend
    Install-Frontend
    
    # Summary
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Setup Complete!" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Green
    Write-Host "1. Edit backend\.env with MySQL credentials" -ForegroundColor White
    Write-Host "2. Create MySQL database: techtrack_db" -ForegroundColor White
    Write-Host "3. Run database migrations:" -ForegroundColor White
    Write-Host "   cd backend\djangomonitor" -ForegroundColor Cyan
    Write-Host "   python manage.py migrate" -ForegroundColor Cyan
    Write-Host "4. Start servers in separate terminals:" -ForegroundColor White
    Write-Host "   Terminal 1: cd backend\djangomonitor && python manage.py runserver" -ForegroundColor Cyan
    Write-Host "   Terminal 2: cd frontend && npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "More help: See docs/SETUP.md" -ForegroundColor Yellow
    Write-Host ""
}
catch {
    Write-Host "❌ Setup failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
