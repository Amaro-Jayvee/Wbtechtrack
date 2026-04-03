# TechTrack Project - Requirements & Setup Guide

## Quick Start Summary

This document outlines all requirements and setup steps to run TechTrack on any computer (Windows, Mac, Linux).

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Backend Requirements](#backend-requirements)
3. [Frontend Requirements](#frontend-requirements)
4. [Installation Steps](#installation-steps)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)
7. [Port Information](#port-information)

---

## System Requirements

### Hardware (Minimum)
- **CPU:** Intel i5 or equivalent (dual-core)
- **RAM:** 4GB minimum (8GB recommended)
- **Storage:** 5GB free space for dependencies

### Operating System
- ✅ Windows 10 / Windows 11
- ✅ macOS 10.14+
- ✅ Ubuntu 18.04+
- ✅ Other Linux distributions

### Package Manager
- **Windows:** Use PowerShell or Command Prompt
- **Mac/Linux:** Use Terminal

---

## Backend Requirements

### 1. Python
**Version:** Python 3.8 or higher (3.13.7 recommended for this project)

**Download:**
- Windows: https://www.python.org/downloads/
- Mac: `brew install python3`
- Linux: `sudo apt-get install python3`

**Verify Installation:**
```bash
python --version
# or
python3 --version
```

Should output: `Python 3.13.7` or similar

---

### 2. Python Package Manager (pip)
Usually comes with Python installation.

**Verify:**
```bash
pip --version
```

**Update pip (recommended):**
```bash
# Windows
python -m pip install --upgrade pip

# Mac/Linux
python3 -m pip install --upgrade pip
```

---

### 3. Virtual Environment
Tool to isolate project dependencies.

**Status in Project:** ✅ Already exists (`.venv-4` folder)

**Create new virtual environment (if needed):**
```bash
# Windows
python -m venv venv

# Mac/Linux
python3 -m venv venv
```

**Activate Virtual Environment:**
```bash
# Windows (PowerShell)
.\.venv-4\Scripts\Activate.ps1

# Windows (Command Prompt)
.venv-4\Scripts\activate.bat

# Mac/Linux
source .venv-4/bin/activate
```

You should see `(.venv-4)` at the start of your terminal line.

---

### 4. Django & Dependencies

**All Python packages needed:**

```
Django==5.1.5
djangorestframework==3.14.0
django-cors-headers==4.3.1
Pillow==10.1.0
python-dotenv==1.0.0
PyMySQL==1.1.0
PyYAML==6.0
```

**Install all at once:**
```bash
pip install -r requirements.txt
```

**Or install individually:**
```bash
pip install Django==5.1.5
pip install djangorestframework==3.14.0
pip install django-cors-headers==4.3.1
pip install Pillow==10.1.0
pip install python-dotenv==1.0.0
pip install PyMySQL==1.1.0
```

**Verify installation:**
```bash
python -c "import django; print(f'Django {django.get_version()}')"
```

---

### 5. Database

**Current Setup:** SQLite3 (built-in, no setup needed)

**Optional MySQL Setup:**
- MySQL Server 5.7+
- See `MYSQL_MIGRATION_GUIDE.md` for details

---

## Frontend Requirements

### 1. Node.js
**Version:** Node.js 16.0.0 or higher (18+ recommended)

**Download:**
- https://nodejs.org/

**Verify Installation:**
```bash
node --version
npm --version
```

Should output versions like:
```
v18.16.0
9.6.7
```

---

### 2. npm (Node Package Manager)
Comes with Node.js installation.

**Update npm (recommended):**
```bash
npm install -g npm@latest
```

---

### 3. Frontend Dependencies

**All npm packages needed:**

```json
React 18.2.0
React Router DOM 6.x
Vite 4.x
Bootstrap 5.3.0
Chart.js
React-ChartJS-2
Axios
```

**Install all at once:**
```bash
npm install
```

**Or manually check `package.json`:**
```bash
cd frontend
npm install
```

**Verify installation:**
```bash
npm list react
```

---

## Installation Steps

### Complete Setup from Scratch

#### Step 1: Clone/Copy Project
```bash
# Navigate to project
cd c:\Users\YourUsername\Documents\GitHub\TechTrack
```

---

#### Step 2: Set Up Backend

**Navigate to backend:**
```bash
cd backend\djangomonitor
```

**Activate virtual environment:**
```bash
# Windows PowerShell
.\.venv-4\Scripts\Activate.ps1

# Windows CMD
.venv-4\Scripts\activate.bat

# Mac/Linux
source ../../.venv-4/bin/activate
```

**Install Python dependencies:**
```bash
pip install -r ../../requirements.txt
```

**Create/Update database (migrations):**
```bash
python manage.py migrate
```

**Create superuser (admin account):**
```bash
python manage.py createsuperuser
# Follow prompts to create account
```

---

#### Step 3: Set Up Frontend

**Navigate to frontend directory:**
```bash
cd frontend
```

**Install npm dependencies:**
```bash
npm install
```

**This will:**
- Create `node_modules` folder
- Install all React, Bootstrap, and other packages
- Set up build tools

---

#### Step 4: Build Frontend (Production)

```bash
npm run build
```

**Or run in development mode:**
```bash
npm run dev
```

---

### Quick Copy-Paste Setup

**For Windows Users:**
```powershell
# 1. Navigate to project
cd c:\Users\YourUsername\Documents\GitHub\TechTrack

# 2. Set up backend
cd backend\djangomonitor
.\.venv-4\Scripts\Activate.ps1
pip install -r ../../requirements.txt
python manage.py migrate

# 3. Open new terminal, set up frontend
cd c:\Users\YourUsername\Documents\GitHub\TechTrack\backend\djangomonitor\frontend
npm install
npm run build
```

---

## Running the Application

### Running Backend (Django Server)

**Prerequisites:**
- Virtual environment activated
- In `backend/djangomonitor` directory

**Start server:**
```bash
python manage.py runserver
```

**Expected output:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

**Access backend:**
- API: http://localhost:8000/app/
- Admin: http://localhost:8000/admin/

---

### Running Frontend (React Development Server)

**Prerequisites:**
- Node.js installed
- In `frontend` directory
- npm dependencies installed

**Start development server:**
```bash
npm run dev
```

**Expected output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Access frontend:**
- Application: http://localhost:5173/

---

### Running Both Simultaneously

**Option 1: Two Terminal Windows**

**Terminal 1 (Backend):**
```bash
cd backend/djangomonitor
python manage.py runserver
# Keeps running
```

**Terminal 2 (Frontend):**
```bash
cd backend/djangomonitor/frontend
npm run dev
# Keeps running
```

**Option 2: VS Code Terminals**
- Open VS Code
- Open Terminal (Ctrl+~)
- Split terminal or open multiple
- Run both commands

---

## Port Information

### Default Ports

| Service | Port | URL |
|---------|------|-----|
| Django Backend | 8000 | http://localhost:8000 |
| Django Admin | 8000 | http://localhost:8000/admin |
| React Frontend | 5173 | http://localhost:5173 |
| MySQL (if used) | 3306 | localhost:3306 |

### Change Ports (if needed)

**Django (use different port):**
```bash
python manage.py runserver 8001
```

**React Vite:**
```bash
npm run dev -- --port 5174
```

---

## Environment Setup

### Create `.env` File (Optional but Recommended)

**Location:** `backend/djangomonitor/.env`

**Content:**
```
# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (if using MySQL)
DB_ENGINE=django.db.backends.mysql
DB_NAME=myDB
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306

# Email Settings
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
```

---

## Folder Structure

```
TechTrack/
├── .venv-4/                          ← Python virtual environment
│   ├── Scripts/                       ← Executable files
│   └── Lib/                           ← Package libraries
│
├── backend/
│   ├── djangomonitor/                 ← Django project root
│   │   ├── app/                       ← Django app
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   ├── serializers.py
│   │   │   └── migrations/
│   │   ├── djangomonitor/             ← Settings
│   │   │   ├── settings.py
│   │   │   └── urls.py
│   │   ├── db.sqlite3                 ← SQLite database
│   │   ├── manage.py
│   │   └── frontend/                  ← React app
│   │       ├── src/
│   │       ├── package.json
│   │       ├── vite.config.js
│   │       └── node_modules/          ← npm packages
│   │
│   └── requirements.txt               ← Python dependencies
│
├── MYSQL_MIGRATION_GUIDE.md           ← Database migration guide
├── REQUIREMENTS_SETUP_GUIDE.md        ← This file
└── README.md
```

---

## Verification Checklist

After installation, verify everything works:

### Backend Check
```bash
cd backend/djangomonitor
python manage.py check
```

Should output: `System check identified no issues (0 silenced).`

### Frontend Check
```bash
cd backend/djangomonitor/frontend
npm list react react-dom
```

Should show installed versions

### Run Both Services
1. Start backend: `python manage.py runserver`
2. Start frontend: `npm run dev`
3. Open http://localhost:5173 in browser
4. Login and test features

### Test Checklist
- [ ] Backend server starts without errors
- [ ] Frontend builds successfully
- [ ] Can access http://localhost:5173
- [ ] Can login to application
- [ ] Can create a request
- [ ] Can view notifications
- [ ] Can update tasks
- [ ] Admin panel works at http://localhost:8000/admin

---

## Troubleshooting

### Python Issues

**Problem:** "python command not found"
```bash
# Solution: Use python3 instead
python3 --version
python3 -m venv venv
```

**Problem:** "Virtual environment not activating"
```bash
# Windows - Try different activation script
.venv-4\Scripts\activate.bat        # For Command Prompt
.\.venv-4\Scripts\Activate.ps1     # For PowerShell
```

**Problem:** "Module not found" errors
```bash
# Solution: Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

---

### Node.js / npm Issues

**Problem:** "npm command not found"
- Solution: Install Node.js from https://nodejs.org/

**Problem:** "node_modules permission denied"
```bash
# Clear npm cache
npm cache clean --force
# Reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem:** Port 5173 already in use
```bash
# Use different port
npm run dev -- --port 5174
```

---

### Django Issues

**Problem:** "Port 8000 already in use"
```bash
# Use different port
python manage.py runserver 8001
```

**Problem:** "SyntaxError in views.py"
```bash
# Check Python syntax
python -m py_compile app/views.py
```

**Problem:** Database migration errors
```bash
# Reset database
python manage.py migrate --fake-initial
python manage.py migrate
```

---

### Database Issues

**Problem:** "sqlite3 locked"
- Solution: Close other database connections, restart server

**Problem:** Data not showing after migration
```bash
# Load backup data
python manage.py loaddata backup.json
```

---

## Testing the Setup

### Test Backend API
```bash
curl http://localhost:8000/app/notifications/
```

Or open in browser to see JSON response.

### Test Frontend Build
```bash
cd frontend
npm run build
```

Should create `dist/` folder with production files.

---

## Performance Tips

### Development Setup Optimization

**1. Use SSD for faster npm/pip installs**

**2. Enable hot reload:**
```bash
# Frontend already has it with Vite
npm run dev
```

**3. Increase RAM allocation for Node.js:**
```bash
node --max-old-space-size=4096 node_modules/vite/bin/vite.js
```

**4. Cache Django dependencies:**
```bash
pip install --cache-dir ./cache -r requirements.txt
```

---

## Quick Command Reference

```bash
# Backend
cd backend/djangomonitor
.\.venv-4\Scripts\Activate.ps1          # Activate environment
python manage.py runserver              # Start Django
python manage.py migrate                # Run migrations
python manage.py createsuperuser        # Create admin user
python manage.py shell                  # Django shell
python -m py_compile app/views.py       # Check syntax

# Frontend
cd backend/djangomonitor/frontend
npm install                             # Install dependencies
npm run dev                             # Development server
npm run build                           # Production build
npm list                                # List installed packages
npm update                              # Update packages
npm cache clean --force                 # Clear cache

# Database
python manage.py dumpdata > backup.json           # Backup
python manage.py loaddata backup.json             # Restore
python manage.py flush --no-input                 # Clear data
```

---

## System Health Check Script

Save as `check_setup.sh` (Mac/Linux) or `check_setup.bat` (Windows):

**PowerShell Script (`check_setup.ps1`):**
```powershell
Write-Host "=== TechTrack Setup Check ===" -ForegroundColor Green

# Check Python
Write-Host "`nChecking Python..." -ForegroundColor Cyan
python --version

# Check pip
Write-Host "Checking pip..." -ForegroundColor Cyan
pip --version

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Cyan
node --version
npm --version

# Check Django
Write-Host "Checking Django..." -ForegroundColor Cyan
python -c "import django; print(f'Django {django.get_version()}')"

# Check main packages
Write-Host "Checking main packages..." -ForegroundColor Cyan
python -c "import rest_framework, corsheaders, dotenv; print('All packages OK')"

Write-Host "`n=== Setup Check Complete ===" -ForegroundColor Green
```

Run with:
```bash
.\check_setup.ps1
```

---

## Laptop Migration Checklist

When switching to laptop tomorrow:

### Before Leaving Current Computer
- [ ] Backup `backup.json` (copy to USB/Cloud)
- [ ] Copy `.venv-4/` folder or list of installed packages
- [ ] Backup database `db.sqlite3`
- [ ] Save `.env` file with credentials
- [ ] Note down all custom settings

### On New Laptop
- [ ] Install Python 3.13+
- [ ] Install Node.js 18+
- [ ] Clone/copy TechTrack project
- [ ] Run setup from "Installation Steps"
- [ ] Restore `backup.json` if needed
- [ ] Test with verification checklist

---

## Support Resources

### Official Documentation
- **Python:** https://www.python.org/doc/
- **Django:** https://docs.djangoproject.com/
- **React:** https://react.dev/
- **Vite:** https://vitejs.dev/
- **npm:** https://docs.npmjs.com/

### Useful Commands
```bash
# Online help for Django
python manage.py help

# List all routes
python manage.py show_urls

# Database inspection
python manage.py dbshell
```

---

## File Sizes Reference

When setting up on new laptop, expect these sizes:

| Folder | Size | Notes |
|--------|------|-------|
| `.venv-4` | 500MB+ | Python packages, can be regenerated |
| `node_modules` | 300MB+ | npm packages, can be regenerated |
| `db.sqlite3` | 1-5MB | Database, contains your data |
| Source code | 5MB | Project files |
| **Total** | **~1GB** | Varies by data |

---

## Next Steps

1. **Follow Installation Steps** above
2. **Run verification checklist**
3. **Start both services**
4. **Test all features**
5. **Keep backup copies** of important files
6. **Document any custom changes** you make

---

## Important Notes

⚠️ **Do NOT commit to Git:**
- `.venv-4/` folder
- `node_modules/` folder
- `.env` file with passwords
- `db.sqlite3` (unless intentional)

✅ **Do commit to Git:**
- `requirements.txt`
- `package.json`
- Source code (`.py`, `.jsx`, `.css`)
- Configuration files

---

**Last Updated:** February 20, 2026  
**Version:** 1.0  
**For:** TechTrack Project
