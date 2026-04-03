# 🚀 TechTrack - Complete Setup & Installation Guide

This guide will help you set up TechTrack on a fresh machine (like your classmate's laptop) for evaluation and development.

## 📋 Prerequisites

Before you start, make sure you have these installed:

### Windows Requirements:
- **Python 3.13** - Download from [python.org](https://www.python.org/downloads/)
- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **MySQL 8.0+** - Download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
- **Git** - Download from [git-scm.com](https://git-scm.com/)

### Verify Installation:
```bash
python --version
node --version
npm --version
mysql --version
git --version
```

---

## 🔧 Step-by-Step Setup

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd TechTrack
```

### Step 2: Setup Backend (Django + MySQL)

#### 2a. Create Python Virtual Environment
```bash
cd backend
python -m venv venv
```

#### 2b. Activate Virtual Environment
**Windows (Command Prompt):**
```bash
venv\Scripts\activate.bat
```

**Windows (PowerShell):**
```bash
venv\Scripts\Activate.ps1
```

**If PowerShell blocks execution, run:**
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2c. Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2d. Setup Environment Variables
Create a `.env` file in `backend/` with:
```
MYSQL_USER=root
MYSQL_PASSWORD=your_password_here
MYSQL_HOST=localhost
MYSQL_DB=techtrack_db
DEBUG=True
```

#### 2e. Create MySQL Database
Open MySQL Command Prompt or MySQL Workbench and run:
```sql
CREATE DATABASE techtrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 2f. Run Database Migrations
```bash
cd djangomonitor
python manage.py migrate
python manage.py migrate app
```

#### 2g. Create Test Accounts (Optional)
```bash
python create_test_accounts.py
```

### Step 3: Setup Frontend (React + Vite)

```bash
# From TechTrack root directory
cd frontend
npm install
```

---

## ▶️ Running the Application

### Terminal 1: Start Backend Server
```bash
cd backend/djangomonitor
python manage.py runserver 0.0.0.0:8000
```

You should see:
```
Django version 5.1.5...
Starting development server at http://127.0.0.1:8000/
```

### Terminal 2: Start Frontend Dev Server
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v6.4.1  ready in XXX ms

  ➜  Local:   http://localhost:5174/
```

### Access the Application
Open your browser and go to:
```
http://localhost:5174
```

---

## 📁 Project Structure

```
TechTrack/
├── START_HERE.md                 ← Start here first!
├── backend/                      ← Django REST API
│   ├── requirements.txt          ← Python dependencies
│   ├── Pipfile                   ← Alternative dependency manager
│   ├── venv/                     ← Python virtual environment (after setup)
│   └── djangomonitor/
│       ├── manage.py
│       ├── app/                  ← Main Django app
│       └── djangomonitor/        ← Project settings
│
├── frontend/                     ← React + Vite app
│   ├── package.json              ← Node dependencies
│   ├── src/                      ← React components
│   ├── dist/                     ← Built files (after npm run build)
│   └── node_modules/             ← Dependencies (after npm install)
│
├── docs/                         ← Documentation
│   ├── QUICK_REFERENCE.md
│   ├── DATABASE_USER_SETUP.md
│   ├── SECURITY_SETUP.md
│   └── ...
│
└── .scripts/                     ← Hidden startup scripts
    ├── startup_servers.bat
    └── startup_servers.ps1
```

---

## 🔑 Key Technologies

- **Backend**: Django 5.1.5 + Django REST Framework 3.14.0
- **Frontend**: React 19.0.0 + Vite 6.4.1
- **Database**: MySQL 8.0+
- **API**: REST API on http://localhost:8000
- **Dev Server**: Vite on http://localhost:5174

---

## 🐛 Troubleshooting

### Python Issues
**Problem**: `python` command not found
- **Solution**: Use full path or reinstall Python, ensuring "Add to PATH" is checked

**Problem**: `ModuleNotFoundError` after pip install
- **Solution**: 
  - Make sure virtual environment is activated
  - Run `pip install -r requirements.txt` again

### MySQL Issues
**Problem**: `No module named 'mysqlclient'`
- **Solution**: 
  - On Windows, ensure MySQL is installed with dev headers
  - Run: `pip install mysqlclient --no-binary mysqlclient`

**Problem**: Connection refused to MySQL
- **Solution**: 
  - Ensure MySQL server is running (`mysql.server start` or use Services)
  - Check username/password in `.env` file
  - Verify database exists: `SHOW DATABASES;`

### Frontend Issues
**Problem**: `npm install` fails
- **Solution**: 
  - Update npm: `npm install -g npm@latest`
  - Clear cache: `npm cache clean --force`
  - Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Problem**: Port 5174 already in use
- **Solution**: 
  - Change port in `frontend/vite.config.js`
  - Or kill the process: `netstat -ano | findstr :5174` (Windows)

### General Issues
**Problem**: CORS errors
- **Solution**: CORS is already enabled in Django settings for localhost:5174

**Problem**: Database migrations fail
- **Solution**: 
  - Ensure MySQL server is running
  - Check `.env` file has correct credentials
  - Run: `python manage.py migrate --fake-initial` if needed

---

## 📝 Environment Variables

Create a `.env` file in `backend/`:
```env
DEBUG=True
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_HOST=localhost
MYSQL_DB=techtrack_db
EMAIL_HOST_USER=wbtechnologies8@gmail.com
EMAIL_HOST_PASSWORD=fbbx_hhgk_soch_gqgv
```

---

## 🚀 Quick Start (One Command Per Terminal)

**Terminal 1 - Backend:**
```bash
cd backend/djangomonitor && python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
```

Then open: http://localhost:5174

---

## 📚 Additional Resources

- Django Docs: https://docs.djangoproject.com/
- React Docs: https://react.dev/
- Vite Docs: https://vitejs.dev/
- See `docs/` folder for more guides

---

## ✅ Checklist

- [ ] Python 3.13 installed
- [ ] Node.js 18+ installed
- [ ] MySQL 8.0+ installed
- [ ] Repository cloned
- [ ] Backend virtual environment created
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file created in `backend/`
- [ ] MySQL database created
- [ ] Database migrations run
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend server running on port 8000
- [ ] Frontend dev server running on port 5174
- [ ] Application accessible at http://localhost:5174

---

## 📞 Need Help?

See `docs/` folder for detailed guides on:
- Database setup
- Security configuration
- API endpoints
- Development workflow

