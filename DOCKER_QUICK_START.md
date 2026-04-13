# 🐳 TechTrack Docker Quick Start Guide

**Status**: ✅ Production Ready  
**Last Updated**: April 13, 2026  
**Estimated Setup Time**: 10 minutes

---

## 📋 Prerequisites

Before starting, ensure you have these installed:

1. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
   - Windows: Docker Desktop for Windows (with WSL 2)
   - macOS: Docker Desktop for Mac
   - Linux: Docker Engine + Docker Compose
   - **Minimum**: 4GB RAM allocated to Docker

2. **Git** - For cloning the repository

3. **Terminal/PowerShell** - Command line utility

Verify installation:
```bash
docker --version
docker-compose --version
```

---

## 🚀 Installation Steps

### **Step 1: Clone the Repository**

```bash
# Clone the project
git clone https://github.com/yourusername/TechTrack.git
cd TechTrack

# Or if already cloned, pull latest changes
git pull origin main
```

### **Step 2: Start Docker Services**

```bash
# Build and start all services
docker-compose up -d

# Verify all services are running
docker-compose ps
```

**Expected Output:**
```
NAME                  STATUS              PORTS
techtrack-db          Up (healthy)        3306/tcp
techtrack-backend     Up (running)        0.0.0.0:8000->8000/tcp
techtrack-frontend    Up (running)        0.0.0.0:80->80/tcp
```

Wait 30-60 seconds for MySQL to initialize fully.

### **Step 3: Initialize Test Accounts**

```bash
# Create demo accounts for testing
docker-compose exec backend python manage.py create_test_accounts

# Expected output:
# ✅ Created admin (Admin)
# ✅ Created production (Production Manager)
# ✅ Created customer (Customer)
# ✅ All test accounts created successfully!
```

### **Step 4: Access the Application**

Open your browser and navigate to:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost | Main application (TechTrack dashboard) |
| **Backend API** | http://localhost:8000/api/ | REST API endpoints |
| **Django Admin** | http://localhost:8000/admin/ | Admin panel |

---

## 🔐 Demo Credentials

Login with these test accounts:

| Role | Username | Password | Access |
|------|----------|----------|--------|
| **System Administrator** | `admin` | `Admin1` | Full system access, admin panel |
| **Production Manager** | `production` | `Production123` | Reports, task management, approvals |
| **Customer** | `customer` | `Production1` | Submit requests, view orders |

**Company (Customer)**: Barako Taguig Quezon City

---

## 🛠️ Common Docker Commands

### Check Service Status
```bash
# View all running containers
docker-compose ps

# Check specific service logs
docker-compose logs backend      # Backend logs
docker-compose logs frontend     # Frontend logs
docker-compose logs db           # Database logs

# Follow logs in real-time (Ctrl+C to stop)
docker-compose logs -f backend
```

### Stop Services
```bash
# Stop all services (data persists)
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v

# Restart a specific service
docker-compose restart backend
```

### Run Commands Inside Containers
```bash
# Create a superuser in Django
docker-compose exec backend python manage.py createsuperuser

# Run Django migrations manually
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Access backend container shell
docker-compose exec backend bash

# Access database from Django container
docker-compose exec backend python manage.py dbshell
```

### View Database Directly
```bash
# Connect to MySQL container
docker-compose exec db mysql -u techtrack_user -ptechtrack_secure_password techtrack_db

# Show all tables
SHOW TABLES;

# List all users
SELECT username, email, is_active FROM auth_user;
```

---

## 🧪 Testing the System

### 1. **Login Test**
- Go to http://localhost
- Login with admin / Admin1
- Verify dashboard loads

### 2. **API Test**
```bash
# In a new terminal, test the API
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. **Database Check**
```bash
# Verify test accounts exist
docker-compose exec backend python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.all().values('username', 'email')
<QuerySet [{'username': 'admin', 'email': 'admin@techtrack.com'}, ...]>
```

---

## ⚠️ Troubleshooting

### Issue: "Port 80 already in use"
```bash
# Find process using port 80
netstat -ano | findstr :80  # Windows
lsof -i :80                  # macOS/Linux

# Stop the conflicting service or use different port
# Edit docker-compose.yml:
# Change: ports: - "80:80"
# To:     ports: - "8080:80"
```

### Issue: "Cannot connect to MySQL"
```bash
# Check MySQL logs
docker-compose logs db

# Restart database
docker-compose restart db
docker-compose logs db  # Wait for "mysqld is ready for connections"
```

### Issue: "Backend showing errors"
```bash
# Check backend logs
docker-compose logs backend -f

# If migrations failed, run manually
docker-compose exec backend python manage.py migrate

# Create test accounts manually
docker-compose exec backend python manage.py create_test_accounts
```

### Issue: Frontend showing blank page
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend container
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Issue: Containers won't start
```bash
# Remove all containers and volumes
docker-compose down -v

# Rebuild everything fresh
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────┐
│         User's Browser                  │
│   http://localhost                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Nginx (Port 80)                       │
│   - Serves React frontend (dist/)       │
│   - Proxies /api/* to Django            │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────────────┐
        │                     │
┌───────▼──────────┐   ┌──────▼───────────┐
│ React Frontend   │   │ Django Backend   │
│ (Node 18)        │   │ (Python 3.13)    │
│ Compiled SPA     │   │ REST APIs (8000) │
│ (Nginx serving)  │   │ Admin panel      │
└──────────────────┘   └────────┬─────────┘
                               │
                        ┌──────▼─────────┐
                        │ MySQL (3306)   │
                        │ - Database     │
                        │ - Persistence  │
                        └────────────────┘
```

---

## 🔒 Security Notes

### For Local Development (Current .env)
- ✅ OK to use default passwords in .env
- ✅ Docker only accessible on localhost
- ✅ Debug mode OFF in containers

### Before Production Deployment
- 🔴 **CHANGE** `SECRET_KEY` in .env (generate new one)
- 🔴 **CHANGE** `DB_PASSWORD` (update in .env)
- 🔴 **CHANGE** `DEBUG` to `False`
- 🔴 **SET** `ALLOWED_HOSTS` to your domain
- 🔴 **CONFIGURE** Email backend (not console)
- 🔴 **ENABLE** SSL/HTTPS with reverse proxy

---

## 📝 Environment Variables (.env file)

The `.env` file in root directory controls Docker configuration:

```env
# Database
DB_NAME=techtrack_db
DB_USER=techtrack_user
DB_PASSWORD=techtrack_secure_password
DB_HOST=db
DB_PORT=3306

# Django
DEBUG=False
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

# Email (optional)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

**To customize:**
1. Edit `.env` file
2. Run `docker-compose down -v` (stop services)
3. Run `docker-compose up -d` (restart with new settings)

---

## 🆘 Need Help?

### Check Logs First
```bash
# Get all logs
docker-compose logs

# Get specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db
```

### Common Solutions
1. **Restart everything**: `docker-compose down && docker-compose up -d`
2. **Fresh start**: `docker-compose down -v && docker-compose build --no-cache && docker-compose up -d`
3. **Check ports**: Make sure 80, 8000, 3306 are available
4. **Check disk space**: Docker needs ~5GB free space
5. **Update Docker**: Ensure you have latest Docker Desktop

### Quick Health Check
```bash
# All-in-one health check
echo "=== Docker Status ===" && \
docker-compose ps && \
echo "=== Backend Health ===" && \
curl -s http://localhost:8000/api/auth/me/ | jq . || echo "Not accessible" && \
echo "=== Frontend Health ===" && \
curl -s http://localhost | head -20
```

---

## 📦 What's Included

| Component | Version | Details |
|-----------|---------|---------|
| **Python** | 3.13 | Django 5.1.5 + DRF |
| **Node.js** | 18-alpine | React 18+, Vite 6.4.1 |
| **MySQL** | 8.0 | Docker volume: mysql_data |
| **Nginx** | alpine | Frontend serving + proxy |

---

## 🎯 Next Steps

After running Docker successfully:

1. ✅ Login with demo accounts to verify
2. ✅ Test creating a task/order
3. ✅ Test report generation
4. ✅ Run API tests
5. 🚀 Ready for production (see DOCKER_DEPLOYMENT_GUIDE.md for server deployment)

---

**Happy coding! 🚀**
