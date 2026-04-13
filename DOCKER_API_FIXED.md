# TechTrack Docker Setup - FIXED ✅

## Status: System Fully Operational

All API errors have been resolved. The system is now ready for testing.

---

## 🔐 User Credentials

### Admin Account
- **Username:** `admin`
- **Password:** `TechTrack123!`
- **Role:** Admin
- **Email:** `admin@techtrack.local`

### Production Manager Account  
- **Username:** `prod_manager`
- **Password:** `ProdManager123!`
- **Role:** Production Manager
- **Email:** `production.manager@techtrack.local`

### Customer Accounts
- **Username:** `customer1`
- **Password:** `Customer123!`
- **Role:** Customer
- **Email:** `customer1@techtrack.local`

- **Username:** `customer2`
- **Password:** `Customer123!`
- **Role:** Customer
- **Email:** `customer2@techtrack.local`

---

## 🌐 Access Points

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost | 80 (nginx) |
| Backend API | http://localhost:8000 | 8000 |
| Database | db:3306 | 3307 (host) |

---

## 📋 API Endpoints

### Authentication
- **POST** `/app/login/` - User login
  ```json
  {
    "username": "admin",
    "password": "TechTrack123!"
  }
  ```
  
- **POST** `/app/logout/` - User logout

### Reports
- **GET** `/app/reports/bar-chart/` - Production & Defect data by week
- **GET** `/app/reports/pie-chart/` - Production percentages  

All endpoints now working correctly with empty data handling.

---

## ✅ What Was Fixed

1. **Database Schema Mismatch** 
   - Applied missing migration (0050_cancelleddraftproduct_issuance_date_and_more)
   - Added missing columns: `cancellation_progress`, `is_overtime`, `ot_quota`

2. **Authentication**
   - ✅ Login endpoint working (POST `/app/login/`)
   - ✅ Session-based authentication active
   - ✅ All user roles properly configured

3. **Report Endpoints**
   - ✅ Bar chart endpoint fixed (GET `/app/reports/bar-chart/`)
   - ✅ Pie chart endpoint fixed (GET `/app/reports/pie-chart/`)
   - ✅ Both endpoints handle empty data gracefully

4. **System Architecture**
   - ✅ Docker Compose with 3 services: frontend, backend, database
   - ✅ MySQL 8.0 database on port 3307
   - ✅ Django REST Framework backend on port 8000
   - ✅ React frontend with nginx on port 80

---

## 🚀 Quick Start

1. **System is already running** - All Docker containers are operational

2. **Test Login:**
   ```bash
   curl -X POST http://localhost:8000/app/login/ \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"TechTrack123!"}'
   ```

3. **Access Frontend:**
   - Open http://localhost in your browser
   - Login with admin/TechTrack123!

---

## 🔄 Docker Commands

```bash
# View all running services
docker-compose ps

# View backend logs
docker-compose logs backend --tail=50 -f

# View database logs
docker-compose logs db --tail=50 -f

# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Start all services
docker-compose up -d
```

---

## 📊 Database Structure

- **Users Created:** 4 (admin, prod_manager, customer1, customer2)
- **Database:** MySQL 8.0
- **Database Name:** techtrack_db
- **Migrations Applied:** 50 (all completed)

---

## ℹ️ Important Notes

- The system now starts **fresh** with no legacy data
- Empty data is handled gracefully by all API endpoints
- All 401 Unauthorized and 500 Internal Server Error responses have been eliminated
- Users are properly mapped to roles (admin, production_manager, customer)
- The frontend will display empty charts/reports when no data exists (this is expected and normal)

---

## 🛠️ Troubleshooting

If you encounter issues:

1. **Backend not responding:**
   ```bash
   docker-compose restart backend
   docker-compose logs backend
   ```

2. **Database connection errors:**
   ```bash
   docker-compose restart db
   docker-compose logs db
   ```

3. **Clear all and restart:**
   ```bash
   docker-compose down -v  # Remove volumes
   docker-compose up -d
   docker-compose exec backend python manage.py migrate
   docker-compose exec backend python create_correct_users.py
   ```

---

Generated: 2026-04-13
Status: Production Ready ✅
