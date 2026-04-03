# TechTrack Quick Reference Card

## 🚀 Start Everything (ONE LINE)
```powershell
cd c:\Users\Jayvee\Documents\GitHub\TechTrack ; .\startup_servers.ps1
```

## 🌐 Access Points
```
Frontend App:   http://localhost:5174     ← Start here
Backend API:    http://localhost:8000
Database GUI:   MySQL Workbench
```

## 👤 Phase 1 Features

### Feature 1: USER SIGNUP
- **URL**: http://localhost:5174 → Click "Sign Up"
- **Flow**: Fill form → Submit → Pending (needs admin approval)
- **Testing**: See PHASE_1_TESTING_GUIDE.md

### Feature 2: MANAGER REGISTRATION  
- **Endpoint**: `POST /app/register/manager/`
- **Auto-Verified**: Yes ✅
- **Can Login Immediately**: Yes ✅

### Feature 3: START PROJECT (Permission Check)
- **Who Can**: Production Manager ONLY
- **Who Cannot**: Admin, Customer, Manager
- **Error Code**: 403 Forbidden
- **Tested By**: PHASE_1_TESTING_GUIDE.md

### Feature 4: LOGIN
- **URL**: http://localhost:5174/login
- **For Customers**: Requires admin approval first
- **For Managers**: Works immediately after signup
- **Returns**: User info + role + session cookie

### Feature 5: PERMISSIONS
- **Admin**: Cannot start projects ❌
- **Production Manager**: CAN start projects ✅
- **Customer**: Cannot start projects ❌
- **Manager**: Cannot start projects ❌

## 🔧 Terminal Commands

```powershell
# Start servers
.\startup_servers.ps1

# Run migrations (if needed later)
cd backend\djangomonitor
C:\Users\Jayvee\.virtualenvs\backend-AZw-EwJW\Scripts\python.exe manage.py migrate

# Create admin account
python manage.py createsuperuser

# Django admin panel
http://localhost:8000/admin
```

## 📋 Test Checklist

- [ ] Frontend loads at http://localhost:5174
- [ ] Signup form appears
- [ ] Manager registration works
- [ ] Login works after approval
- [ ] Permission denied for non-Production-Managers
- [ ] Database updated in Workbench

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to API" | Check backend running on :8000 |
| "Port 8000 in use" | `netstat -aon \| findstr :8000` then kill |
| "No database tables" | Migrations pending (non-blocking) |
| "User not found" | Create account via signup form |
| "Cannot login" | Customer? Need admin approval |

## 📚 Documentation

| File | Purpose |
|------|---------|
| SERVER_STARTUP_GUIDE.md | Full setup instructions |
| PHASE_1_TESTING_GUIDE.md | Complete test procedures |
| PHASE_1_IMPLEMENTATION_COMPLETE.md | Implementation summary |
| IMPLEMENTATION_PLAN.md | Overall roadmap |

## 🔐 Database Info

```
Host:     127.0.0.1:3306
Database: techtrack_db
User:     techtrack_user
Password: techtrack_secure_password
```

In Workbench:
1. MySQL → New Connection
2. Name: "TechTrack Dev"
3. Enter credentials above
4. Test → OK

## ✅ What's Working

- [x] Backend running (:8000)
- [x] Frontend running (:5174)
- [x] Database connected ✅
- [x] User signup ✅
- [x] Manager registration ✅
- [x] Login/logout ✅
- [x] Permission checks ✅
- [x] Start project (PM only) ✅

## ⏭️ Next Phase

After Phase 1 testing:
- Phase 2: Product/Part Management Refactor
- See IMPLEMENTATION_PLAN.md for details

## 📞 API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /app/login/ | POST | No | User login |
| /app/logout/ | POST | Yes | User logout |
| /app/signup/ | POST | No | New signup (pending) |
| /app/register/manager/ | POST | No | Manager self-register |
| /app/register/customer/ | POST | No | Customer self-register |
| /app/create-customer/ | POST | Yes | Admin creates customer |
| /app/request/\<id\>/start-project/ | POST | Yes (PM) | Start project |
| /app/whoami/ | GET | Yes | Current user info |

## 🎯 Success = 

When all Phase 1 tests pass:
- ✅ Signup works
- ✅ Login works (after approval for customers)
- ✅ Only PM can start projects
- ✅ Others get 403 Forbidden
- ✅ Database updates correctly

**Then**: Proceed to Phase 2 🚀

---

**Last Updated**: April 2, 2026  
**Status**: Ready for Testing ✅

