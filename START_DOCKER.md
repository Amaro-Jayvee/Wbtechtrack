# 🚀 START HERE - TechTrack Docker Setup (2 Minutes)

## Prerequisites
- ✅ Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- ✅ Git installed
- ✅ Port 80 & 8000 available

## Run These 4 Commands

### 1️⃣ Navigate to Project
```bash
cd TechTrack
```

### 2️⃣ Start All Services
```bash
docker-compose up -d
```
*(Wait 30 seconds for MySQL to initialize)*

### 3️⃣ Create Test Accounts
```bash
docker-compose exec backend python manage.py create_test_accounts
```

### 4️⃣ Open in Browser
```
http://localhost
```

## 🔓 Login Credentials

```
Admin         | admin         | Admin1
Production    | production    | Production123
Customer      | customer      | Production1
```

## ✅ Done!

If you see the dashboard → Everything works! 🎉

## Need Help?
- Check logs: `docker-compose logs -f backend`
- Stop everything: `docker-compose down`
- Full reset: `docker-compose down -v && docker-compose up -d`

See **HANDOFF_GUIDE.md** for detailed documentation.
