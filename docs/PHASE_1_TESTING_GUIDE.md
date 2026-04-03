# Phase 1 Testing Guide - Authentication & Core Features

**Date**: April 2, 2026  
**Status**: Ready for Testing  
**Servers**: Backend (8000), Frontend (5174), Database (MySQL)

---

## Quick Start

```bash
# Terminal 1 - Backend (already running)
# http://localhost:8000

# Terminal 2 - Frontend (already running)  
# http://localhost:5174

# Term 3 - MySQL Workbench (GUI tool)
# Use to verify user accounts are created
```

---

## Phase 1 Requirements Checklist

### 1.1 ✅ User Self-Registration
**What**: Users can create accounts by filling out signup form  
**How to Test**:
1. Go to http://localhost:5174
2. Click "Sign Up" button (toggle from Login)
3. Fill in form:
   - Username: `testcustomer1`
   - Email: `testcustomer1@example.com`
   - Password: `Test123456`
   - Confirm Password: `Test123456`
   - Full Name: `Test Customer`
   - Company Name: `Test Co`
   - Contact Number: `555-0001`
   - Role: Leave as `customer` (default)
4. Click "Create Account"
5. Should see: ✅ "Signup request submitted. Please wait for admin approval."

**What Happens Behind the Scenes**:
- Data saved to `AccountSignupRequest` table with status=`pending`
- Awaits admin approval before account is created

---

### 1.2 ✅ Admin Account Creation  
**What**: Admin can create manager/customer accounts directly  
**Endpoints**:
- `POST /app/register/customer/` - Public endpoint, auto-waiting verification
- `POST /app/register/manager/` - Public endpoint, auto-verified  
- `POST /app/create-customer/` - Admin-only, creates + sends email invitation

**How to Test** (Using curl or API tool):

#### Method 1: Manager Self-Registration
```bash
curl -X POST http://localhost:8000/app/register/manager/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manager1",
    "password": "Manager123",
    "email": "manager@example.com",
    "full_name": "John Manager",
    "company_name": "TechTrack",
    "contact_number": "555-1234"
  }'
```

**Response** (Success):
```json
{
  "detail": "Manager account created."
}
```

#### Method 2: Customer Self-Registration
```bash
curl -X POST http://localhost:8000/app/register/customer/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "customer1",
    "password": "Cust123",
    "email": "customer@example.com",
    "full_name": "Jane Customer",
    "company_name": "Client Co",
    "contact_number": "555-5678"
  }'
```

**Response** (Success):
```json
{
  "detail": "Account created. Awaiting manager approval."
}
```

---

### 1.3 ✅ Production Manager Permission for Start Project
**What**: Only users with role `production_manager` can start projects  
**Other roles CANNOT**: `admin`, `customer`, `manager`

**Permission Check Location**:
- File: `/backend/djangomonitor/app/views.py` line ~1324
- Decorator: `@role_required(Roles.PRODUCTION_MANAGER)`

**Endpoint**: `POST /app/request/<request_id>/start-project/`

---

### 1.4 🔄 Test Login/Registration Flow
**What to Test**:

#### Scenario A: Customer Signup → Wait for Approval
1. **Signup**: Create account via UI form
   - See: "Signup request submitted..."
   
2. **Wait for Admin**: Admin reviews in admin panel
   - Admin approves the signup request
   - User receives email notification
   
3. **Login Attempt Before Approval**: ❌ Should fail
   ```bash
   curl -X POST http://localhost:8000/app/login/ \
     -H "Content-Type: application/json" \
     -d '{"username": "testcustomer1", "password": "Test123456"}'
   ```
   **Expected Response**:
   ```json
   {
     "detail": "Account not approved",
     "error": "Your account is pending admin approval. Please wait for approval."
   }
   ```
   Status: 403 Forbidden

4. **After Admin Approval**: ✅ Should succeed
   ```bash
   curl -X POST http://localhost:8000/app/login/ \
     -H "Content-Type: application/json" \
     -d '{"username": "testcustomer1", "password": "Test123456"}'
   ```
   **Expected Response**:
   ```json
   {
     "username": "testcustomer1",
     "email": "testcustomer1@example.com",
     "role": "customer",
     "detail": "Successfully logged in"
   }
   ```
   Status: 200 OK

#### Scenario B: Manager Registration → Immediate Login
1. **Register Manager**:
   ```bash
   curl -X POST http://localhost:8000/app/register/manager/ \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```

2. **Login Immediately**: ✅ Should work (auto-verified)
   ```bash
   curl -X POST http://localhost:8000/app/login/ \
     -H "Content-Type: application/json" \
     -d '{"username": "manager1", "password": "Manager123"}'
   ```
   **Expected Response**: Status 200 OK

#### Test Invalid Scenarios:
- **Username doesn't exist**:
  ```json
  {"detail": "Invalid credentials", "error": "Username or password is incorrect"}
  ```
  Status: 401

- **Wrong password**:
  ```json
  {"detail": "Invalid credentials", "error": "Username or password is incorrect"}
  ```
  Status: 401

- **Empty username**:
  ```json
  {"detail": "Username is required", "error": "Username cannot be empty"}
  ```
  Status: 400

- **Empty password**:
  ```json
  {"detail": "Password is required", "error": "Password cannot be empty"}
  ```
  Status: 400

---

### 1.5 🔄 Test Project Start Permission Enforcement
**What to Test**: Only Production Manager can call start_project

**Setup First**:
1. Create accounts with different roles:
   ```bash
   # Create admin (if not exists)
   curl -X POST http://localhost:8000/app/create-customer/ \
     -H "Content-Type: application/json" \
     -H "Cookie: sessionid=<YOUR_ADMIN_SESSION>" \
     -d '{...}'

   # Create production manager
   # (Need to manually set role in DB or via admin panel)

   # Create regular customer
   curl -X POST http://localhost:8000/app/register/customer/ ...
   ```

2. Create a request (purchase order) to have a request_id to test with
   - Use admin panel or API endpoint

---

#### Test Case 1: Production Manager ✅ (Should Succeed)
```bash
curl -X POST http://localhost:8000/app/request/1/start-project/ \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionid=<PRODUCTION_MANAGER_SESSION>"
```

**Expected Response** (Status 201):
```json
{
  "message": "Successfully created N task(s)",
  "tasks_created": N,
  "tasks": [...]
}
```

---

#### Test Case 2: Admin ❌ (Should Fail)
```bash
curl -X POST http://localhost:8000/app/request/1/start-project/ \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionid=<ADMIN_SESSION>"
```

**Expected Response** (Status 403):
```json
{"detail": "Access denied."}
```

---

#### Test Case 3: Customer ❌ (Should Fail)
```bash
curl -X POST http://localhost:8000/app/request/1/start-project/ \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionid=<CUSTOMER_SESSION>"
```

**Expected Response** (Status 403):
```json
{"detail": "Access denied."}
```

---

#### Test Case 4: Unauthenticated ❌ (Should Fail)
```bash
curl -X POST http://localhost:8000/app/request/1/start-project/ \
  -H "Content-Type: application/json"
```

**Expected Response** (Status 401):
```json
{"detail": "Authentication required"}
```

---

## Verification Using MySQL Workbench

### Check User Accounts:
1. Open **MySQL Workbench**
2. Click the **TechTrack Dev** connection
3. In **Schemas** panel, expand `techtrack_db` → Tables
4. Right-click `auth_user` → Select Rows
5. View all registered users

### Check Pending Signups:
1. Same steps as above
2. Look for table: `app_accountsignuprequest`
3. Check `status` column: `pending`, `approved`, `declined`

### Check User Roles:
1. Find table: `app_userprofile`
2. View columns:
   - `role` - The user's role (customer, manager, production_manager, admin)
   - `is_verified` - Whether they can login (customer role only)

---

## Common Issues & Troubleshooting

### Issue: "Database connection failed"
**Solution**: Ensure MySQL is running and database credentials in `.env` are correct

### Issue: "Table doesn't exist" error
**Solution**: This is expected - migrations not yet applied won't block functionality

### Issue: Can't login even after signup
**Solution**: Customers are created with `is_verified=False`. 
- Managers auto-verified
- Customers need admin approval first

### Issue: Start project returns 403 even for production manager
**Solution**: Check that user's UserProfile has `role = 'production_manager'`

---

## Success Criteria

✅ **Phase 1 Complete When**:
- [ ] 1.1: Customer signup works, pending approval
- [ ] 1.2: Manager registration works, auto-verified  
- [ ] 1.2: Admin can create customers (endpoint working)
- [ ] 1.3: Production Manager can start projects
- [ ] 1.3: Admin/Customer/Manager CANNOT start projects
- [ ] 1.4: Login works after account approved
- [ ] 1.4: Login blocked while unapproved (customer only)
- [ ] 1.5: Permission enforcement working on start_project

---

## Next Steps After Testing

Once Phase 1 is verified working:
1. Document any issues found
2. Move to Phase 2: Product/Part Management Refactor
3. Run full test suite for edge cases

---

## Quick Reference: API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---|
| `/app/login/` | POST | User login | No |
| `/app/logout/` | POST | User logout | Yes |
| `/app/register/customer/` | POST | Customer self-registration | No |
| `/app/register/manager/` | POST | Manager self-registration | No |
| `/app/create-customer/` | POST | Admin creates customer | Yes (Admin) |
| `/app/signup/` | POST | New signup flow (pending) | No |
| `/app/pending-signups/` | GET | List pending signups | Yes (Admin) |
| `/app/signups/<id>/approve/` | POST | Approve signup | Yes (Admin) |
| `/app/request/<id>/start-project/` | POST | Start project/create tasks | Yes (Production Manager) |
| `/app/whoami/` | GET | Get current user info | Yes |
| `/app/session/` | GET | Check session | Yes |

---

## How to Get Session Cookie for Testing

Using curl to login and save session:

```bash
# 1. Login and save cookies
curl -X POST http://localhost:8000/app/login/ \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "manager1", "password": "Manager123"}'

# 2. Use saved cookies in next request
curl -X POST http://localhost:8000/app/request/1/start-project/ \
  -b cookies.txt

# Or use -H Cookie header directly
curl http://localhost:8000/app/whoami/ \
  -H "Cookie: sessionid=<YOUR_SESSION_ID>"
```

---

**Status**: Ready for Testing!  
**Last Updated**: April 2, 2026
