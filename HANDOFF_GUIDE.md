# 📦 TechTrack - Handoff Package for Classmate

**Date**: April 13, 2026  
**Status**: ✅ Production Ready & Docker Configured  
**Estimated Setup Time**: 15 minutes (with Docker installed)

---

## 🎯 What You're Getting

A complete, professionally organized web application for managing technical tasks and purchase orders:

- ✅ **Frontend**: React 18 with modern UI (organized by feature)
- ✅ **Backend**: Django REST Framework with comprehensive APIs
- ✅ **Database**: MySQL 8.0 for persistent data storage
- ✅ **Reports**: Professional printable reports with signatures
- ✅ **Authentication**: User roles (Admin, Production Manager, Customer)
- ✅ **Docker Ready**: One-command deployment
- ✅ **Clean Code**: Reorganized folder structure for maintainability

---

## 📋 Minimum Requirements

Before you start, make sure you have:

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
   - Windows 10/11 with WSL 2 or Mac M1/Intel
   - 4GB RAM minimum allocated to Docker
   
2. **Git** - For version control

3. **Web Browser** - Chrome, Firefox, Edge, or Safari

**Verification:**
```bash
docker --version
git --version
```

---

## 🚀 THE FASTEST WAY TO RUN (10 minutes)

### 1. Extract and Navigate to Project
```bash
# Extract the zip file or clone the repository
cd TechTrack
```

### 2. Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop
- Install and restart your computer

### 3. Start Everything with One Command
```bash
docker-compose up -d
```

### 4. Create Demo Accounts (wait ~60 seconds for MySQL)
```bash
docker-compose exec backend python manage.py create_test_accounts
```

### 5. Open in Browser
```
Frontend:  http://localhost
Backend:   http://localhost:8000/api/
Admin:     http://localhost:8000/admin/
```

### 6. Login with Demo Credentials
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin1` |
| Production Manager | `production` | `Production123` |
| Customer | `customer` | `Production1` |

**That's it! You're done! ✅**

---

## 📂 Project Structure (What Each Folder Does)

```
TechTrack/
├── frontend/                  # React app (user interface)
│   ├── src/
│   │   ├── features/          # Organized by feature (tasks, orders, etc.)
│   │   ├── shared/            # Reusable components and utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile             # Instructions to build frontend container
│   └── package.json
│
├── backend/                   # Django app (business logic & APIs)
│   ├── Dockerfile             # Instructions to build backend container
│   ├── requirements.txt        # Python dependencies (gunicorn, django, etc.)
│   ├── djangomonitor/
│   │   ├── settings.py        # Database and configuration
│   │   ├── urls.py            # API endpoints
│   │   └── wsgi.py
│   └── app/
│       ├── models.py          # Database structure
│       ├── views.py           # API logic
│       ├── serializers.py     # Data format converters
│       └── management/commands/
│           └── create_test_accounts.py  # Creates demo users
│
├── docker-compose.yml         # Orchestration file (starts MySQL, Django, React)
├── .env                       # Configuration (database passwords, etc.)
├── DOCKER_QUICK_START.md      # Complete Docker guide (THIS FILE)
└── docs/                      # Additional documentation
```

---

## 🛠️ Useful Docker Commands

### View Status
```bash
# Check all containers running
docker-compose ps

# Follow live logs
docker-compose logs -f backend    # Backend logs
docker-compose logs -f frontend   # Frontend logs
docker-compose logs -f db         # Database logs
```

### Stop/Restart
```bash
# Stop everything (data stays)
docker-compose down

# Stop + delete data (fresh start)
docker-compose down -v

# Restart a specific service
docker-compose restart backend
```

### Database Management
```bash
# Create a new admin user
docker-compose exec backend python manage.py createsuperuser

# View database tables
docker-compose exec db mysql -u techtrack_user -ptechtrack_secure_password techtrack_db
SHOW TABLES;
EXIT;

# Run Django shell
docker-compose exec backend python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.all()
```

---

## ⚠️ Troubleshooting

### "Port 80 already in use"
Another app is using port 80. Find and stop it, or use different port:
```bash
# Find what's using port 80
# Windows
netstat -ano | findstr :80

# macOS/Linux  
lsof -i :80

# Or change in docker-compose.yml: change "80:80" to "8080:80"
```

### "Cannot connect to MySQL"
```bash
# Check MySQL status
docker-compose logs db

# Restart MySQL
docker-compose down
docker-compose up -d
# Wait 60 seconds...
docker-compose exec backend python manage.py create_test_accounts
```

### "Containers not starting"
```bash
# Full restart from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### "Frontend shows blank page"
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild if needed
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

---

## 🧪 Verify Everything Works

### Test 1: Login
1. Go to http://localhost
2. Login with: `admin` / `Admin1`
3. Should see dashboard

### Test 2: Backend API
```bash
# From terminal
curl http://localhost:8000/api/
```

### Test 3: Admin Panel
1. Go to http://localhost:8000/admin/
2. Login with: `admin` / `Admin1`
3. See all users and database

---

## 📊 System Architecture

```
Internet Browser
    ↓
Nginx (Port 80)
    ├→ Frontend (React SPA)
    └→ Backend /api/ (Django)
        ↓
    MySQL Database
```

All three components run in Docker containers automatically.

---

## 🔒 Important Security Notes

### Current Setup (Development - OK for Demo)
- ✅ Default database passwords (in .env)
- ✅ Debug mode OFF
- ✅ Only works on localhost

### Before Going to Production
- 🔴 Generate new SECRET_KEY in .env
- 🔴 Change all database passwords
- 🔴 Set ALLOWED_HOSTS to your domain
- 🔴 Configure proper email backend
- 🔴 Get SSL certificate (letsencrypt)
- 🔴 Use environment secrets manager

---

## 📝 Configuration File (.env)

The `.env` file contains all settings:

```env
# Database Connection
DB_NAME=techtrack_db
DB_USER=techtrack_user
DB_PASSWORD=techtrack_secure_password

# Django
DEBUG=False
SECRET_KEY=your-secret-key

# Allowed Hosts
ALLOWED_HOSTS=localhost,127.0.0.1
```

To change settings:
1. Edit `.env`
2. Run `docker-compose down`
3. Run `docker-compose up -d`

---

## 🎯 Next Steps After Setup

1. ✅ **Verify Everything Works** - Login as admin
2. 📝 **Create Test Data** - Use the app to create tasks/orders
3. 🖨️ **Test Reports** - Generate and print a report
4. 👥 **Test Different Roles** - Login as production manager and customer
5. 🚀 **Deploy to Server** - Use Docker for other machines/servers

---

## 📞 Getting Help

### Check Logs First
```bash
docker-compose logs
```

### Common Issues Resolution
1. **Docker not installed?** → Install Docker Desktop from www.docker.com
2. **MySQL error?** → Restart containers: `docker-compose down && docker-compose up -d`
3. **Port conflicts?** → Change port in docker-compose.yml
4. **Container won't start?** → Check logs: `docker-compose logs`

### Full Reset (if nothing works)
```bash
docker-compose down -v
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

---

## 🎉 You're All Set!

Everything is configured and ready to go. Just:
1. Install Docker Desktop
2. Run `docker-compose up -d`
3. Wait 60 seconds
4. Open http://localhost
5. Login with demo credentials

**Questions?** Check the logs or review DOCKER_QUICK_START.md for detailed commands.

---

**Enjoy! 🚀**
