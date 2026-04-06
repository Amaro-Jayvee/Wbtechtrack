# 🐳 Docker Deployment Guide - TechTrack

**Last Updated**: April 5, 2026  
**Status**: Ready for Production Deployment

---

## 📋 Prerequisites

Before deploying with Docker, ensure you have:

1. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
   - Windows: Docker Desktop for Windows
   - Min: 4GB RAM allocated to Docker

2. **Docker Compose** - Usually comes with Docker Desktop
   - Verify: `docker-compose --version`

3. **Git** - For cloning/pulling the repository

---

## 🚀 Quick Start

### 1. Local Development with Docker

```bash
# Clone or navigate to project directory
cd TechTrack

# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

**Access Services:**
- Frontend: `http://localhost`
- Backend: `http://localhost:8000/api/`
- Django Admin: `http://localhost:8000/admin/`

### 2. Stop Services

```bash
# Stop all services (keeps data)
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

---

## 🔧 Production Deployment

### Step 1: Prepare Environment Variables

Edit `.env.production` with your actual values:

```bash
# Copy production env file
cp .env.production .env

# Edit with your settings
nano .env
```

**Required Changes:**
```env
# Change these for production:
DEBUG=False
SECRET_KEY=your-actual-secret-key-generate-new-one

# Database passwords
DB_PASSWORD=strong-production-password
DB_ROOT_PASSWORD=strong-root-password

# Email settings
EMAIL_HOST_USER=your-real-email@gmail.com
EMAIL_HOST_PASSWORD=app-specific-password

# Domain configuration
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### Step 2: Build Images for Production

```bash
# Build images (with production env)
docker-compose build

# Or force rebuild
docker-compose build --no-cache
```

### Step 3: Deploy on Server

**Option A: Using Docker Compose (Recommended for small to medium)**

```bash
# Start all services in background
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Option B: Using Docker Swarm or Kubernetes**

For larger deployments, see section below.

---

## 🌐 Nginx Reverse Proxy Setup (Optional but Recommended)

If deploying on a server with multiple applications, use Nginx as reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 📊 Container Management

### View Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Execute Commands in Container

```bash
# Django management commands
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Database commands
docker-compose exec db mysql -u root -p techtrack_db

# View shell
docker-compose exec backend bash
```

### Database Backup

```bash
# Backup database
docker-compose exec db mysqldump -u root -p techtrack_db > backup.sql

# Restore database
docker-compose exec -T db mysql -u root -p techtrack_db < backup.sql
```

---

## 🔄 Continuous Deployment

### Using GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/TechTrack
            git pull origin main
            docker-compose pull
            docker-compose up -d
            docker-compose exec -T backend python manage.py migrate
```

---

## 🚨 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Port already in use
docker ps  # Find what's using the port
kill <process_id>

# 2. Database not ready
# Wait a bit and try again, or check db logs
docker-compose logs db
```

### Database connection error

```bash
# Verify MySQL is running and healthy
docker-compose ps db

# Check MySQL logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Frontend not loading

```bash
# Check nginx logs
docker-compose logs frontend

# Verify it's running
docker-compose ps frontend

# Rebuild frontend
docker-compose build --no-cache frontend
```

### Need to access MySQL directly

```bash
# MySQL shell
docker-compose exec db mysql -u techtrack_user -p
# Password: techtrack_secure_password (or from .env)

# Execute SQL
docker-compose exec db mysql -u techtrack_user -p -e "SELECT * FROM app_employees LIMIT 5;"
```

---

## 📈 Performance & Scaling

### Adjust Django Workers

In `docker-compose.yml`, modify the backend command:

```yaml
command: >
  gunicorn djangomonitor.wsgi:application 
    --bind 0.0.0.0:8000 
    --workers 8          # Increase for better performance
    --worker-class sync
```

**Recommended:** `workers = (2 × CPU cores) + 1`

### Limit Memory Usage

In `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 🔒 Security Checklist

- [ ] Change `DEBUG=False` in production
- [ ] Generate new `SECRET_KEY` for production
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL certificates
- [ ] Set proper `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- [ ] Use environment variables for sensitive data
- [ ] Enable database backups
- [ ] Set up log rotation
- [ ] Configure firewall rules
- [ ] Use secrets management for sensitive credentials

---

## 📱 Deployment Platforms

### AWS ECS

```bash
# Push to ECR
AWS_PROFILE=default aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com

docker tag techtrack-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/techtrack-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/techtrack-backend:latest
```

### DigitalOcean App Platform

1. Push code to GitHub
2. Connect DigitalOcean to GitHub
3. Create App from Docker Compose file
4. Configure environment variables
5. Deploy!

### Azure Container Instances

```bash
# Build and push
docker build -t techtrack-backend:latest ./backend
az acr build --registry <registry> --image techtrack-backend:latest ./backend
```

### Heroku (Deprecated Docker Support - Not Recommended)

Use Railway, Render, or Fly.io instead.

---

## 📞 Support & Help

Common issues and solutions documented in:
- `docs/DEPLOYMENT_PACKAGE.md`
- `docs/SETUP.md`
- Docker logs: `docker-compose logs -f`

---

## ✅ Next Steps

1. ✅ Install Docker Desktop
2. ✅ Update `.env.production` with your details
3. ✅ Run `docker-compose up -d` locally to test
4. ✅ Test all features work
5. ✅ Deploy to production server
6. ✅ Set up automated backups
7. ✅ Monitor logs and performance
