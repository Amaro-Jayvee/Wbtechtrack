# TechTrack Docker Deployment Guide - PRODUCTION READY

**Status:** ✅ Production Ready | **Version:** 1.0 | **Date:** April 13, 2026

This guide covers the complete Docker deployment of TechTrack system with all prerequisites, setup steps, and verification procedures.

---

## 🎯 Quick Start (30 seconds)

```bash
# Clone repository
git clone <repo-url>
cd TechTrack

# Start all services
docker-compose up -d

# Create users
docker-compose exec backend python create_correct_users.py

# Import products
docker-compose exec backend python import_products.py

# Access system
# Frontend: http://localhost
# Backend:  http://localhost:8000/app/
```

---

## 📋 System Requirements

### Required Software
- **Docker Desktop** 4.0+ ([download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** 2.0+ (included with Docker Desktop)
- **Git** (for version control)

### Supported Platforms
- ✅ Windows 10/11 (with WSL2 or Hyper-V)
- ✅ macOS 10.15+
- ✅ Linux (any distribution)

### System Resources
- Minimum: 4GB RAM, 2 CPU cores, 10GB disk space
- Recommended: 8GB RAM, 4 CPU cores, 20GB disk space

---

## 🐳 Docker Setup

### Step 1: Verify Docker Installation

```bash
docker --version
# Expected: Docker version 24.0+

docker-compose --version
# Expected: Docker Compose version 2.0+
```

### Step 2: Configure Environment Variables

Copy `.env.production` to `.env` (or create `.env` with these values):

```bash
# Database Configuration
DB_NAME=techtrack_db
DB_USER=techtrack_user
DB_PASSWORD=techtrack_secure_password
DB_ROOT_PASSWORD=root_secure_password
DB_PORT=3307

# Django Configuration
DEBUG=False
SECRET_KEY=your-secret-key-here-min-50-chars-for-production
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

# Email Configuration (optional)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### Step 3: Build and Start Containers

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Verify all containers are running
docker-compose ps
```

Expected output:
```
NAME              STATUS         PORTS
techtrack-db      Up (healthy)   0.0.0.0:3307->3306/tcp
techtrack-backend Up             0.0.0.0:8000->8000/tcp
techtrack-frontend Up             0.0.0.0:80->80/tcp
```

### Step 4: Database Migrations

```bash
# Apply all migrations
docker-compose exec backend python manage.py migrate

# Create superuser (optional)
docker-compose exec backend python manage.py createsuperuser
```

### Step 5: Create Application Users

```bash
docker-compose exec backend python create_correct_users.py
```

This creates 4 users:
- **admin** / `TechTrack123!` (Admin role)
- **prod_manager** / `ProdManager123!` (Production Manager role)
- **customer1** / `Customer123!` (Customer role)
- **customer2** / `Customer123!` (Customer role)

### Step 6: Import Products

```bash
docker-compose exec backend python import_products.py
```

Imports 41 production products with 19 manufacturing processes and 112 process templates.

---

## 🚀 System Architecture

```
┌─────────────────────────────────────────────────────┐
│           TechTrack Docker Architecture             │
└─────────────────────────────────────────────────────┘

              ┌─────────────────┐
              │  Browser/Client │
              └────────┬────────┘
                       │ HTTP
        ┌──────────────┴──────────────┐
        │                             │
    ┌───▼────┐            ┌──────────▼─────┐
    │Frontend │            │Backend API     │
    │Service  │            │Django/Gunicorn │
    │(Port 80)│            │(Port 8000)     │
    └────┬────┘            └────────┬───────┘
         │                          │
         └──────────────┬───────────┘
                        │ MySQL Driver
                    ┌───▼────────┐
                    │  Database  │
                    │ MySQL 8.0  │
                    │ (Port 3307)│
                    └────────────┘
```

### Services Overview

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | React + Nginx | 80 | Web interface |
| **Backend** | Django REST Framework | 8000 | API server |
| **Database** | MySQL 8.0 | 3307 | Data persistence |

---

## 🔐 User Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `TechTrack123!` | Admin - Full system access |
| `prod_manager` | `ProdManager123!` | Production Manager - Production operations |
| `customer1` | `Customer123!` | Customer - View own orders |
| `customer2` | `Customer123!` | Customer - View own orders |

---

## 📦 Database Schema

### Key Tables

- **app_productname** - Product definitions (41 products)
- **app_processname** - Manufacturing processes (19 processes)
- **app_processtemplate** - Product-process mappings (112 templates)
- **app_userprofile** - User roles and permissions
- **app_requests** - Purchase orders
- **app_requestproduct** - Order line items
- **app_productprocess** - Production workflow steps
- **app_defectlog** - Defect tracking

---

## 🌐 API Endpoints

### Authentication
- `POST /app/login/` - User login
- `POST /app/logout/` - User logout
- `GET /app/whoami/` - Get current user

### Dashboard
- `GET /app/reports/bar-chart/` - Production metrics
- `GET /app/reports/pie-chart/` - Status breakdown

### Management
- `GET /app/tasks/` - Active tasks
- `GET /app/completed-tasks/` - Completed tasks
- `GET /app/cancelled-tasks/` - Cancelled orders

### Admin
- `GET /app/admin/` - Django admin panel (at `/admin/`)

---

## 🛠️ Common Commands

```bash
# View running services
docker-compose ps

# View logs
docker-compose logs backend           # Backend logs
docker-compose logs frontend          # Frontend logs
docker-compose logs db                # Database logs
docker-compose logs -f backend        # Follow logs (real-time)

# Database operations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py createsuperuser

# Data import/export
docker-compose exec backend python create_correct_users.py
docker-compose exec backend python import_products.py

# Django shell
docker-compose exec backend python manage.py shell

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up -d --build
```

---

## 📊 Production Checklist

- ✅ All services running and healthy
- ✅ Database migrations applied
- ✅ Users created with proper roles
- ✅ Products imported with workflows
- ✅ Environment variables configured
- ✅ SECRET_KEY is strong and unique
- ✅ DEBUG mode set to False
- ✅ CORS origins properly configured
- ✅ Email service configured (if needed)
- ✅ SSL/HTTPS configured (if needed)

---

## 🔍 Verification Steps

### 1. Check Container Health

```bash
docker-compose ps
# All containers should show "Up" status
```

### 2. Test API Endpoints

```bash
# Login
curl -X POST http://localhost:8000/app/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"TechTrack123!"}'

# Check reports
curl http://localhost:8000/app/reports/bar-chart/

# Check frontend
curl http://localhost
```

### 3. Monitor Performance

```bash
# Check container resource usage
docker stats

# Check database connections
docker-compose exec db mysql -u root -proot_secure_password -e "SHOW PROCESSLIST;"

# Disk usage
docker system df
```

---

## 📝 Data Backup & Recovery

### Backup Database

```bash
docker-compose exec db mysqldump -u root -proot_secure_password techtrack_db > backup.sql

# Or use the provided backup
docker cp techtrack-db:/var/lib/mysql/backup.sql ./techtrack_db_backup.sql
```

### Restore Database

```bash
docker-compose exec -T db mysql -u root -proot_secure_password techtrack_db < backup.sql
```

### Backup Application Data

```bash
# Backup static files
docker cp techtrack-backend:/app/staticfiles ./staticfiles_backup

# Backup logs
docker cp techtrack-backend:/app/logs ./logs_backup
```

---

## 🚨 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database connection failed

```bash
# Verify database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Port already in use

```bash
# Change port in docker-compose.yml or .env
# Then restart
docker-compose up -d
```

### Performance issues

```bash
# Check resource usage
docker stats

# Increase allocated resources in Docker Desktop Settings
# Recommended: 4GB RAM, 2 CPU cores for TechTrack
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Django Documentation](https://docs.djangoproject.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

## ✅ System Ready

Your TechTrack system is now production-ready with:
- ✅ Complete Docker containerization
- ✅ 41 production products with proper workflows
- ✅ 4 pre-configured user accounts
- ✅ Automatic database initialization
- ✅ API endpoints fully functional
- ✅ Frontend application deployed

**Access the system at:** http://localhost

---

**Version:** 1.0 | **Last Updated:** 2026-04-13 | **Status:** Production Ready
