# TechTrack Setup Guide

Complete guide to set up and run TechTrack on your local machine (Windows/Mac/Linux).

## Prerequisites

### Required Software
- **Python 3.10+** - Download from [python.org](https://www.python.org/downloads/)
- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **MySQL 8.0+** - Download from [mysql.com](https://www.mysql.com/downloads/)
- **Git** - Download from [git-scm.com](https://git-scm.com/)

### Verify Installation
```bash
python --version      # Should be 3.10 or higher
node --version        # Should be 18 or higher
mysql --version       # Should be 8.0 or higher
git --version         # Any recent version
```

---

## Backend Setup (Django)

### 1. Navigate to Backend Directory
```bash
cd backend/djangomonitor
```

### 2. Create Python Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies
```bash
pip install -r ../requirements.txt
```

**Key Dependencies:**
- Django 5.1.5
- Django REST Framework
- django-cors-headers
- mysql-connector-python
- python-dotenv
- reportlab

### 4. Database Setup

#### Create MySQL Database
```sql
CREATE DATABASE techtrack_db;
CREATE USER 'techtrack_user'@'localhost' IDENTIFIED BY 'techtrack_password';
GRANT ALL PRIVILEGES ON techtrack_db.* TO 'techtrack_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Create `.env` file in `backend/` directory
```ini
DATABASE_NAME=techtrack_db
DATABASE_USER=techtrack_user
DATABASE_PASSWORD=techtrack_password
DATABASE_HOST=localhost
DATABASE_PORT=3306
```

### 5. Run Database Migrations
```bash
python manage.py migrate
```

### 6. Create Superuser (Admin Account)
```bash
python manage.py createsuperuser
# Follow the prompts to create an admin account
```

### 7. Start Django Server
```bash
python manage.py runserver 0.0.0.0:8000
```

**Expected Output:**
```
Starting development server at http://127.0.0.1:8000/
```

✅ Backend running at **http://localhost:8000**

---

## Frontend Setup (React + Vite)

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install JavaScript Dependencies
```bash
npm install
```

**Key Dependencies:**
- React 19.0.0
- React Router DOM 7.9.6
- Bootstrap 5.3.8
- Vite 6.4.1

### 3. Start Development Server
```bash
npm run dev
```

**Expected Output:**
```
  VITE v6.4.1  ready in 234 ms

  ➜  Local:   http://localhost:5174/
  ➜  press h to show help
```

✅ Frontend running at **http://localhost:5174**

---

## Email Configuration (Gmail SMTP)

### 1. Enable Gmail App Passwords
- Go to https://myaccount.google.com/security
- Enable **2-Step Verification** (if not already enabled)
- Go to https://myaccount.google.com/apppasswords
- Select **Mail** and **Windows Computer**
- Generate app password (e.g., `hsbt nzvu pgfy ceuz`)

### 2. Update Django Settings
Edit `backend/djangomonitor/djangomonitor/settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'  # 16-char password from Google
```

### 3. Test Email Sending
```bash
POST http://localhost:8000/app/test-email/

{
  "email": "your-test-email@gmail.com"
}
```

Check terminal for `[TEST EMAIL]` logs and debug information.

---

## Quick Start (All-in-One)

### Terminal 1 - Backend
```bash
cd backend/djangomonitor
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py runserver
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### Access Application
- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:8000
- **Admin Panel:** http://localhost:8000/admin

---

## Troubleshooting

### Python/Venv Issues
```bash
# Might need to use python3 instead of python
python3 -m venv venv
source venv/bin/activate

# If pip install fails
pip install --upgrade pip
pip install -r requirements.txt
```

### Node/NPM Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Error
```bash
# Check MySQL is running
mysql -u techtrack_user -p

# If migration fails, check DATABASE settings in .env
```

### Port Already in Use
```bash
# Backend on different port
python manage.py runserver 0.0.0.0:8001

# Frontend on different port
npm run dev -- --port 5175
```

### CORS/API Connection Issues
- Make sure backend is running on http://localhost:8000
- Check that frontend .env has correct backend URL
- Verify CORS settings in Django settings.py

---

## Project Structure

```
TechTrack/
├── backend/
│   ├── djangomonitor/
│   │   ├── app/
│   │   │   ├── models.py         # Database models
│   │   │   ├── views.py          # API endpoints
│   │   │   ├── urls.py           # URL routing
│   │   │   └── migrations/
│   │   ├── djangomonitor/
│   │   │   ├── settings.py       # Django config
│   │   │   └── wsgi.py
│   │   ├── manage.py
│   │   └── db.sqlite3
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile               # Docker config
│   └── .env.example             # Environment template
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app component
│   │   ├── login.jsx            # Login page
│   │   ├── ForgotPasswordModal.jsx  # Password reset
│   │   └── index.css
│   ├── package.json             # Node dependencies
│   ├── vite.config.js           # Vite config
│   ├── Dockerfile
│   └── nginx.conf
│
├── docs/                        # Documentation
├── SETUP_GUIDE.md              # This file
├── START_HERE.md               # Quick start
└── README.md
```

---

## Development Workflow

### Making Changes
1. Make code changes in your editor
2. Both backend and frontend have **hot-reload** enabled
3. Changes automatically refresh in browser/terminal

### Committing Changes
```bash
git add .
git commit -m "Feature: Add forgot password functionality"
git push origin start-fresh
```

### Creating a Pull Request
1. Push to your fork
2. Create PR against main repository
3. Wait for review

---

## Next Steps

✅ Backend running
✅ Frontend running
✅ Database connected
✅ Email configured

**You're ready to develop!**

For specific features, check:
- `docs/` folder for implementation guides
- `DOCKER_README.md` for Docker deployment
- Backend API docs at http://localhost:8000/admin

---

## Support

If you encounter issues:
1. Check the **Troubleshooting** section above
2. Review terminal/console error messages
3. Check that all prerequisites are installed
4. Verify `.env` and `settings.py` configurations

Good luck! 🚀
