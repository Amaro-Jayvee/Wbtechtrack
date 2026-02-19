# MySQL Database Migration Guide

## Overview
This document provides a complete guide for migrating the TechTrack application from SQLite3 to MySQL database.

---

## 1. System Requirements

### 1.1 MySQL Server
- **MySQL Server 5.7 or higher** (Recommended: MySQL 8.0+)
- Must be installed and running on your system
- Download from: https://dev.mysql.com/downloads/mysql/

### 1.2 MySQL Management Tools (Choose One)
- **MySQL Command Line Client** (comes with MySQL Server)
- **MySQL Workbench** (GUI tool - easier for beginners)
- **phpMyAdmin** (Web-based interface)

### 1.3 Python Packages
- **PyMySQL** or **mysqlclient** (MySQL driver for Django)

---

## 2. Pre-Migration Checklist

Before you start the migration, verify:

- [ ] MySQL Server is installed and running
- [ ] You have MySQL root password
- [ ] Backup of current SQLite3 data (`db.sqlite3`)
- [ ] No active transactions or background tasks
- [ ] Application is stopped (not running `python manage.py runserver`)
- [ ] Python virtual environment activated

---

## 3. Step-by-Step Migration Process

### Step 1: Back Up Current Data (IMPORTANT!)

Navigate to the Django project directory:
```bash
cd c:\Users\Jayvee\Documents\GitHub\TechTrack\backend\djangomonitor
```

Export all current data from SQLite3:
```bash
python manage.py dumpdata > backup.json
```

**What this does:**
- Creates a `backup.json` file containing all database records
- Includes: Users, Requests, Notifications, Products, Workers, etc.
- File size typically 50KB - 1MB depending on data volume
- Location: `c:\Users\Jayvee\Documents\GitHub\TechTrack\backend\djangomonitor\backup.json`

**Verification:**
```bash
# Check file was created
dir backup.json
```

---

### Step 2: Install MySQL Python Driver

Choose one option:

**Option A: PyMySQL (Recommended - works on Windows)**
```bash
pip install PyMySQL
```

**Option B: mysqlclient (Faster but harder to install)**
```bash
pip install mysqlclient
```

**Verify installation:**
```bash
python -c "import pymysql; print('PyMySQL installed successfully')"
```

---

### Step 3: Create MySQL Database

Open MySQL Command Line or MySQL Workbench and run:

```sql
CREATE DATABASE myDB;
```

**To verify database was created:**
```sql
SHOW DATABASES;
```

You should see `myDB` in the list.

---

### Step 4: Update Django Settings

Modify `djangomonitor/settings.py`:

**From (Current SQLite3):**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

**To (MySQL):**
```python
DATABASES = { 
    'default': {
         'ENGINE': 'django.db.backends.mysql', 
         'NAME': 'myDB', 
         'USER': 'root', 
         'PASSWORD': 'H3LLsP4RADISe', 
         'HOST': 'localhost', 
         'PORT': '3306' 
    } 
}
```

**Fields Explanation:**
- `ENGINE`: Django's MySQL database backend
- `NAME`: Database name created in Step 3
- `USER`: MySQL username (default: root)
- `PASSWORD`: Your MySQL root password
- `HOST`: Database server location (localhost = your computer)
- `PORT`: MySQL default port (3306)

---

### Step 5: Create Database Tables

Run Django migrations to create all tables in MySQL:

```bash
python manage.py migrate
```

**Expected output:**
```
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  ...
  [Multiple migration steps]
  Applying app.0029_productprocess_product... OK
```

**What this does:**
- Creates all necessary database tables in MySQL
- Initializes Django system tables (auth, sessions, admin, etc.)
- Applies all app migrations

---

### Step 6: Load Backed-Up Data

Restore your previous data from the backup:

```bash
python manage.py loaddata backup.json
```

**Expected output:**
```
Installed X objects from 1 fixture
```

**What this does:**
- Reads the `backup.json` file
- Inserts all records into the MySQL database
- Preserves relationships between tables
- Maintains all user accounts, requests, notifications, etc.

---

### Step 7: Verify Migration Success

Open Django shell:
```bash
python manage.py shell
```

Run verification commands:
```python
from app.models import Requests, Notification, ProductName, ProductProcess
from django.contrib.auth.models import User

print("=== Database Verification ===")
print(f"Users: {User.objects.count()}")
print(f"Requests: {Requests.objects.count()}")
print(f"Notifications: {Notification.objects.count()}")
print(f"Products: {ProductName.objects.count()}")
print(f"Product Processes: {ProductProcess.objects.count()}")

# Check specific user
testuser = User.objects.filter(username='testuser').first()
if testuser:
    print(f"\nTestuser found: {testuser.username}")
    user_notifs = Notification.objects.filter(user=testuser).count()
    print(f"Testuser notifications: {user_notifs}")
else:
    print("\nTestuser not found - check backup")
```

Expected sample output:
```
=== Database Verification ===
Users: 9
Requests: 27
Notifications: 81
Products: 8
Product Processes: 245

Testuser found: testuser
Testuser notifications: 0
```

Type `exit()` to quit the shell.

---

### Step 8: Test the Application

Start the Django development server:
```bash
python manage.py runserver
```

**Test these features:**
1. **Login** with your test account (testuser/password)
2. **Create a new request** - should appear in database
3. **Check notifications** - should fetch from MySQL
4. **Mark notification as read** - should update database
5. **Create tasks** - should save to MySQL
6. **Update tasks** - should create notifications

**In Browser:**
```
http://localhost:8000
```

---

## 4. Data Comparison: Before and After

### Before Migration (SQLite3)
```
Database Type:    SQLite3 (File-based)
File Location:    db.sqlite3 (in project folder)
File Size:        Usually < 5MB
Speed:            Good for development
Multi-user:       Limited
Production:       Not recommended
```

### After Migration (MySQL)
```
Database Type:    MySQL (Server-based)
Server Location:  localhost:3306
Data Location:    MySQL data directory
Speed:            Better for multiple users
Multi-user:       Full support
Production:       Recommended
```

---

## 5. File Structure After Migration

```
TechTrack/
├── backend/
│   └── djangomonitor/
│       ├── db.sqlite3                    ← OLD (optional keep for reference)
│       ├── backup.json                   ← DATA BACKUP (keep safe!)
│       ├── djangomonitor/
│       │   └── settings.py               ← UPDATED to MySQL config
│       └── manage.py
```

---

## 6. Troubleshooting

### Issue 1: "Access denied for user 'root'@'localhost'"

**Cause:** Wrong MySQL password

**Solution:**
1. Verify MySQL password in `settings.py` matches your MySQL root password
2. Test connection with MySQL Command Line:
```bash
mysql -u root -p
# Enter password when prompted
```

---

### Issue 2: "Database myDB doesn't exist"

**Cause:** Database not created in Step 3

**Solution:**
```sql
-- Open MySQL and run:
CREATE DATABASE myDB;
-- Verify:
SHOW DATABASES;
```

---

### Issue 3: "No module named 'PyMySQL'"

**Cause:** MySQL driver not installed

**Solution:**
```bash
pip install PyMySQL
# Verify:
python -c "import pymysql; print('OK')"
```

---

### Issue 4: "Tables already exist" error on migrate

**Cause:** MySQL has tables from previous migration attempt

**Solution:**
```bash
# Option A: Drop and recreate database
# In MySQL:
DROP DATABASE myDB;
CREATE DATABASE myDB;

# Option B: Delete all tables manually
# Then run: python manage.py migrate
```

---

### Issue 5: "Data not loaded after loaddata"

**Cause:** `backup.json` file is incomplete or corrupted

**Solution:**
1. Check backup file exists and has content:
```bash
# Check file size (should be > 1KB)
dir backup.json

# View content
type backup.json | head -20
```

2. If backup is corrupted, create new one:
```bash
# Switch back to SQLite3 in settings.py temporarily
python manage.py migrate
python manage.py dumpdata > backup_new.json
# Switch back to MySQL
python manage.py loaddata backup_new.json
```

---

## 7. Rollback (Go Back to SQLite3)

If something goes wrong:

### Step 1: Stop the Server
```bash
# Press Ctrl+C in terminal
```

### Step 2: Update Settings
```python
# In djangomonitor/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### Step 3: Restart Server
```bash
python manage.py runserver
```

**Your SQLite3 database (`db.sqlite3`) is still intact!**

---

## 8. Performance Considerations

### MySQL is Better When:
- ✅ Multiple users accessing simultaneously
- ✅ Large datasets (thousands of records)
- ✅ Production environment
- ✅ Scaling the application
- ✅ Advanced queries and reporting

### SQLite3 is Better For:
- ✅ Single user development
- ✅ Quick testing
- ✅ Simple applications
- ✅ No setup required

---

## 9. Security Notes

### Current Settings (Development Only):
```python
'PASSWORD': 'H3LLsP4RADISe'  # ⚠️ Not secure for production
```

### For Production:
1. **Change default MySQL password**
2. **Use environment variables:**
```python
import os
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}
```

3. **Create `.env` file:**
```
DB_NAME=myDB
DB_USER=root
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=3306
```

---

## 10. Backup Strategy After Migration

### Regular Backups (Weekly)
```bash
# Backup entire database
mysqldump -u root -p myDB > backup_$(date +%Y%m%d).sql

# Backup Django data
python manage.py dumpdata > backup_$(date +%Y%m%d).json
```

### Restore from Backup
```bash
# From SQL file
mysql -u root -p myDB < backup_20260220.sql

# From JSON file
python manage.py loaddata backup_20260220.json
```

---

## 11. Verification Checklist (Post-Migration)

Run through this checklist:

- [ ] Django server starts without errors
- [ ] Can login to application
- [ ] Can view all existing requests
- [ ] Can view all existing notifications
- [ ] Can create new request
- [ ] New request appears in MySQL
- [ ] Notifications appear when creating request
- [ ] Can mark notifications as read
- [ ] Red badge disappears when notification read
- [ ] Can update tasks
- [ ] Task updates create notifications
- [ ] Admin panel works (http://localhost:8000/admin)
- [ ] Database has all expected tables

---

## 12. Quick Reference Commands

```bash
# Backup current database
python manage.py dumpdata > backup.json

# Create database
mysql -u root -p -e "CREATE DATABASE myDB;"

# Run migrations
python manage.py migrate

# Load data
python manage.py loaddata backup.json

# Check data
python manage.py shell

# Dump database to SQL
mysqldump -u root -p myDB > database.sql

# Restore from SQL
mysql -u root -p myDB < database.sql

# Clear all data (CAUTION!)
python manage.py flush --no-input

# Create superuser
python manage.py createsuperuser
```

---

## 13. Support & Documentation

### Official Django Documentation
- https://docs.djangoproject.com/en/5.1/ref/settings/#databases

### MySQL Documentation
- https://dev.mysql.com/doc/

### PyMySQL Documentation
- https://pymysql.readthedocs.io/

---

## 14. Migration Summary Table

| Step | Action | Command | Time |
|------|--------|---------|------|
| 1 | Backup SQLite3 | `dumpdata > backup.json` | 1 min |
| 2 | Install driver | `pip install PyMySQL` | 2 min |
| 3 | Create database | `CREATE DATABASE myDB;` | 1 min |
| 4 | Update settings | Edit `settings.py` | 5 min |
| 5 | Run migrations | `python manage.py migrate` | 2 min |
| 6 | Load data | `python manage.py loaddata backup.json` | 1 min |
| 7 | Verify | Shell commands | 2 min |
| 8 | Test app | Browser testing | 5 min |
| **Total** | | | **~20 min** |

---

## 15. Final Notes

- ✅ **All data is preserved** during migration
- ✅ **Backup is your safety net** - keep it!
- ✅ **Easy to rollback** if something goes wrong
- ✅ **No code changes needed** - only database config
- ✅ **Application works identically** with MySQL
- ⚠️ **Test thoroughly** before production use
- ⚠️ **Never skip the backup step**
- ⚠️ **Keep backup files** for at least 30 days

---

**Last Updated:** February 20, 2026  
**Version:** 1.0  
**Author:** TechTrack Development Team
