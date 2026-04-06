# Quick Docker Commands Reference

## 🚀 Essential Commands

```bash
# Check Docker is installed
docker --version
docker-compose --version

# Build images
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Check status
docker-compose ps
```

## 🛠️ Common Tasks

### Database

```bash
# Access MySQL
docker-compose exec db mysql -u techtrack_user -p techtrack_db

# Backup database
docker-compose exec db mysqldump -u root -p techtrack_db > backup.sql

# Restore database
docker-compose exec -T db mysql -u root -p techtrack_db < backup.sql

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

### Django Management

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Make migrations
docker-compose exec backend python manage.py makemigrations

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Shell
docker-compose exec backend python manage.py shell
```

### Logs & Debugging

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100 backend

# Specific service
docker-compose logs -f frontend

# Jump into container
docker-compose exec backend bash
```

## 🔄 Rebuild & Reset

```bash
# Rebuild everything
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Restart a service
docker-compose restart backend

# Full logs check
docker-compose logs --tail=50
```

## 📊 System Management

```bash
# Show Docker resource usage
docker system df

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Stop everything
docker stop $(docker ps -q)

# Remove everything (⚠️ careful!)
docker system prune -a
```

---

**For detailed guide see:** [DOCKER_DEPLOYMENT_GUIDE.md](../docs/DOCKER_DEPLOYMENT_GUIDE.md)
