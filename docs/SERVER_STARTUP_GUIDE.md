# TechTrack Server Startup Guide

**Last Updated**: April 2, 2026  
**Environment**: Windows 10/11  
**Status**: Ready to Run

---

## Quick Start (3 Steps)

### Option 1: PowerShell Script (Recommended)
```powershell
cd c:\Users\Jayvee\Documents\GitHub\TechTrack
.\startup_servers.ps1
```

### Option 2: Batch Script
```cmd
cd c:\Users\Jayvee\Documents\GitHub\TechTrack
startup_servers.bat
```

### Option 3: Manual (3 Terminal Windows)

**Terminal 1 - Backend (Django)**:
```powershell
cd c:\Users\Jayvee\Documents\GitHub\TechTrack\backend\djangomonitor
C:\Users\Jayvee\.virtualenvs\backend-AZw-EwJW\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend (Vite)**:
```powershell
cd c:\Users\Jayvee\Documents\GitHub\TechTrack\backend\djangomonitor\frontend
npm run dev
```

**Terminal 3 - Optional (for commands)**:
```powershell
# Use for testing, migrations, etc.
cd c:\Users\Jayvee\Documents\GitHub\TechTrack
```

---

## Server Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend App | http://localhost:5174 | React web interface |
| Backend API | http://localhost:8000 | Django REST API |
| Database GUI | MySQL Workbench | Visual DB management |

---

## Virtual Environment Info

**Location**: `C:\Users\Jayvee\.virtualenvs\backend-AZw-EwJW`  
**Python**: 3.13.7  
**Manager**: Pipenv  

**Configured Packages**:
- Django 6.0.3
- Django REST Framework
- MySQLdb (MySQL connector)
- python-dotenv (environment variables)
- django-cors-headers (CORS support)
- reportlab (PDF generation)

---

## Database Configuration

**File**: `.env` in `backend/djangomonitor/`

```env
DB_ENGINE=django.db.backends.mysql
DB_NAME=techtrack_db
DB_USER=techtrack_user
DB_PASSWORD=techtrack_secure_password
DB_HOST=127.0.0.1
DB_PORT=3306
```

**To Connect in Workbench**:
1. Click **MySQL → New Connection**
2. Enter:
   - Connection Name: `TechTrack Dev`
   - Hostname: `127.0.0.1`
   - Username: `techtrack_user`
   - Password: `techtrack_secure_password`
3. Click **Test Connection** → **OK**

---

## Common Commands

### Run Migrations
```powershell
cd C:\Users\Jayvee\Documents\GitHub\TechTrack\backend\djangomonitor
C:\Users\Jayvee\.virtualenvs\backend-AZw-EwJW\Scripts\python.exe manage.py migrate
```

### Create Superuser (Admin)
```powershell
C:\Users\Jayvee\.virtualenvs\backend-AZw-EwJW\Scripts\python.exe manage.py createsuperuser
```

### Access Django Admin
Navigate to: http://localhost:8000/admin

### Install Frontend Dependencies
```powershell
cd backend\djangomonitor\frontend
npm install
```

### Update Backend Dependencies
```powershell
cd backend
python -m pipenv install
```

### Build Frontend for Production
```powershell
cd backend\djangomonitor\frontend
npm run build
```

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'dotenv'"
**Solution**: The required packages are already installed in the venv

### Issue: "MySQL connection refused"
**Ensure**:
1. MySQL server is running
2. Database `techtrack_db` exists
3. User `techtrack_user` has correct password
4. Check `.env` file credentials

### Issue: Frontend shows "Cannot connect to API"
**Check**:
1. Backend is running on port 8000
2. CORS is properly configured
3. Check browser console for exact error

### Issue: Port 8000 or 5174 already in use
**Solution**: Find and stop the process using that port
```powershell
# Find process on port 8000
netstat -aon | findstr :8000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Issue: Virtual environment not found
**Solution**: Install dependencies from Pipfile
```powershell
cd backend
python -m pipenv install
```

---

## File Structure

```
TechTrack/
├── backend/
│   ├── Pipfile              # Python dependencies
│   └── djangomonitor/
│       ├── manage.py
│       ├── .env             # Database config
│       ├── db.sqlite3       # SQLite backup
│       ├── db_backup*.json  # Database backups
│       ├── app/
│       │   ├── models.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   ├── serializers.py
│       │   └── migrations/
│       ├── djangomonitor/
│       │   ├── settings.py
│       │   ├── urls.py
│       │   └── wsgi.py
│       └── frontend/
│           ├── package.json
│           ├── vite.config.js
│           └── src/
│               ├── App.jsx
│               ├── main.jsx
│               └── ...components
├── startup_servers.ps1      # PowerShell launcher
├── startup_servers.bat      # Batch launcher
├── PHASE_1_TESTING_GUIDE.md # Testing instructions
└── README.md               # Project overview
```

---

## Development Workflow

### 1. Start Servers
```powershell
.\startup_servers.ps1
```

### 2. Access Services
- Frontend: http://localhost:5174
- Backend API: http://localhost:8000
- Admin: http://localhost:8000/admin

### 3. Make Code Changes
- **Frontend**: Edit files in `frontend/src/`, auto-reloads in browser
- **Backend**: Edit Python files, auto-reloads on save
- **Database**: Use Workbench to visualize schema

### 4. Testing
See [PHASE_1_TESTING_GUIDE.md](PHASE_1_TESTING_GUIDE.md) for comprehensive testing procedures

---

## Important Notes

⚠️ **Development Server Warning**:
- Django dev server is NOT suitable for production
- Use production ASGI/WSGI server for deployment

⚠️ **Database**:
- Always backup before major changes
- Migrations not yet applied (47 pending) - doesn't affect dev
- Use `.env` to configure credentials, never hardcode

⚠️ **Frontend**:
- Vite hot-reload works on file changes
- Build required before production deployment

---

## Next Steps

1. **Verify Servers Work**:
   - Run `.\startup_servers.ps1`
   - Visit http://localhost:5174
   - Should see login page

2. **Test Phase 1 Features**:
   - See [PHASE_1_TESTING_GUIDE.md](PHASE_1_TESTING_GUIDE.md)
   - Test signup, login, permissions

3. **Continue Development**:
   - Phase 2: Product/Part Management Refactor
   - See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

---

## Support Commands

### Check Python Version
```powershell
python --version
```

### Check Node Version
```powershell
node --version
npm --version
```

### List Installed Python Packages
```powershell
C:\Users\Jayvee\.virtualenvs\backend-AZw-EwJW\Scripts\pip.exe list
```

### Clean Frontend Cache
```powershell
cd backend\djangomonitor\frontend
rm -r node_modules
npm install
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start all servers | `.\startup_servers.ps1` |
| Stop backend | Ctrl+C in backend terminal |
| Stop frontend | Ctrl+C in frontend terminal |
| View database | Open MySQL Workbench → TechTrack Dev |
| Run migrations | `python manage.py migrate` |
| Create admin | `python manage.py createsuperuser` |
| Access Django admin | http://localhost:8000/admin |
| View API docs | Check individual endpoint in views.py |
| Install deps | `python -m pipenv install` |
| Build frontend | `npm run build` |

---

**Status**: All servers configured and ready to run  
**Last Tested**: April 2, 2026  
**Next Phase**: Phase 1 Testing
