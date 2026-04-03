# 📦 Deployment Package - For GitHub Evaluation

This document explains the setup files created for easy deployment on different machines.

---

## 📋 What's Included

### 1. **backend/requirements.txt** 
Python dependencies that can be installed with:
```bash
pip install -r requirements.txt
```

**Contains:**
- Django==5.1.5
- djangorestframework==3.14.0
- django-cors-headers==4.3.1
- mysqlclient==2.2.6
- python-dotenv==1.0.1

### 2. **backend/.env.example**
Template file showing required environment variables. Copy to `.env` and fill in your credentials:
```bash
copy .env.example .env
```

### 3. **docs/SETUP.md**
Complete step-by-step setup guide including:
- Prerequisites and installation links
- Backend setup (Python, venv, dependencies)
- Frontend setup (Node, npm)
- Database configuration
- Running the servers
- Troubleshooting

### 4. **.scripts/setup.ps1** (PowerShell - Automated)
Automated setup script for Windows PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .scripts\setup.ps1
```

**Does:**
- Checks system requirements
- Creates Python virtual environment
- Installs Python dependencies
- Installs Node dependencies
- Creates .env from template

### 5. **.scripts/setup.bat** (Batch - Quick Setup)
Quick setup batch file for Windows Command Prompt:
```bash
.scripts\setup.bat
```

---

## 🚀 Quickest Setup Path

### For Your Classmate on New Laptop:

**Option 1: One Command (Recommended)**
```powershell
powershell -ExecutionPolicy Bypass -File .scripts\setup.ps1
```

**Option 2: Read Guide First**
1. Open `docs/SETUP.md`
2. Follow step-by-step instructions
3. Set up frontend: `cd frontend && npm install`
4. Set up backend: `cd backend && pip install -r requirements.txt`

**Option 3: Manual (No Scripts)**
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt

# Frontend
cd ..\frontend
npm install
```

---

## ✅ After Setup Complete

### 1. Configure Database
Edit `backend/.env` with MySQL credentials:
```env
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_HOST=localhost
MYSQL_DB=techtrack_db
DEBUG=True
```

### 2. Create Database
```sql
CREATE DATABASE techtrack_db CHARACTER SET utf8mb4;
```

### 3. Run Migrations
```bash
cd backend/djangomonitor
python manage.py migrate
python manage.py migrate app
```

### 4. Start Servers

**Terminal 1 - Backend:**
```bash
cd backend/djangomonitor
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access Application
Open browser: **http://localhost:5174**

---

## 📁 Project Structure (After Setup)

```
TechTrack/
├── backend/
│   ├── requirements.txt      ← Pip dependencies
│   ├── .env.example          ← Template (copy to .env)
│   ├── .env                  ← Your actual credentials (DO NOT commit)
│   ├── venv/                 ← Virtual environment (created by setup)
│   └── djangomonitor/        ← Django project
│
├── frontend/
│   ├── package.json          ← NPM dependencies
│   ├── node_modules/         ← Dependencies (created by npm install)
│   ├── dist/                 ← Built files (created by npm run build)
│   └── src/                  ← React components
│
├── docs/
│   ├── SETUP.md              ← Complete setup guide
│   └── ...                   ← Other documentation
│
└── .scripts/
    ├── setup.ps1             ← PowerShell automated setup
    └── setup.bat             ← Batch file setup
```

---

## 🔑 Key Points for Classmates

1. **Don't forget .env** - Set MySQL credentials before running migrations
2. **Import database carefully** - The system maintains referential integrity
3. **Both servers needed** - Backend (8000) AND frontend (5174) must be running
4. **CORS is enabled** - Already configured for localhost:5174
5. **MySQL must be running** - Start MySQL before running Django migrations

---

## 🆘 Common Issues & Solutions

### Python Virtual Environment Won't Activate
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Then retry: `venv\Scripts\Activate.ps1`

### MySQL Connection Error
- Verify MySQL is running
- Check credentials in `.env` file
- Ensure database `techtrack_db` exists

### Port Already in Use
- Backend: Change port in `backend/djangomonitor/djangomonitor/settings.py`
- Frontend: Change port in `frontend/vite.config.js`

### npm install Fails
- Clear cache: `npm cache clean --force`
- Delete `package-lock.json` and `node_modules/`
- Retry: `npm install`

---

## 🎯 Success Criteria

After setup, you should see:
- ✅ `http://localhost:8000` - Django backend running
- ✅ `http://localhost:5174` - React frontend running
- ✅ Can login to the application
- ✅ Database operations working

---

## 📚 Additional Resources

For more information, see:
- `docs/SETUP.md` - Detailed setup guide
- `docs/QUICK_REFERENCE.md` - API endpoints
- `docs/DATABASE_USER_SETUP.md` - Database guide
- `START_HERE.md` - Project overview

---

## ✨ Summary

This deployment package makes it easy for anyone to set up TechTrack on a new machine with:
- ✅ `requirements.txt` - Clear dependency listing
- ✅ Automated setup scripts - One-command setup
- ✅ Comprehensive guides - Step-by-step instructions
- ✅ Environment template - Easy configuration
- ✅ Well-organized structure - Professional layout

**Total setup time: ~10-15 minutes** (including downloads)

