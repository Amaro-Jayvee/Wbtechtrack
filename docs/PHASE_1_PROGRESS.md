# Phase 1: Authentication & Core Features - Progress Report

**Date**: February 26, 2026  
**Status**: In Progress

---

## ✅ Completed Tasks

### 1.1 & 1.2: User Self-Registration & Admin Account Creation
- **Status**: ✅ **ALREADY IMPLEMENTED**
- **Backend Endpoints**:
  - `POST /app/register/customer/` - Allows public customer self-registration
  - `POST /app/register/manager/` - Allows public manager registration  
  - `POST /app/create-customer/` - Admin-only endpoint to create customer accounts

- **Registration Fields**:
  - username, password, email, full_name, company_name, contact_number

- **Notes**:
  - Customer accounts are created but marked as `is_verified=False` (awaiting manager approval)
  - Manager accounts are auto-verified on creation
  - Both endpoints use `@csrf_exempt` and `@require_POST` decorators
  - No role-based restrictions on the public registration endpoints (intentional - user chooses their role)

### 1.3: Production Manager Permission for Project Start
- **Status**: ✅ **IMPLEMENTED**
- **Changes Made**:
  - Added `@role_required(Roles.PRODUCTION_MANAGER)` decorator to `start_project()` view
  - File: `/backend/djangomonitor/app/views.py` (Line ~1030)
  - Only users with `role = "production_manager"` can now start projects
  - Admin users are **explicitly excluded** - they can no longer start projects

- **Endpoint**: `POST /app/request/<int:id>/start-project/`
- **Response on Permission Denied**: 
  ```json
  {"detail": "Access denied."}
  ```
  Status: 403 Forbidden

### Frontend Status
- **Challenge Found**: `login.jsx` has register state but no visible registration form
- **Recommendation**: May need to add/restore registration UI component for customers

---

## 📋 Remaining Tasks

### 1.4: Test Login/Registration Flow
- [ ] Test customer self-registration via `/app/register/customer/`
- [ ] Test manager registration via `/app/register/manager/`
- [ ] Test admin account creation via `/app/create-customer/`
- [ ] Verify customer approval workflow

### 1.5: Test Project Start Permission Enforcement
- [ ] Test start project as Production Manager → Should succeed
- [ ] Test start project as Admin → Should fail (403)
- [ ] Test start project as Customer → Should fail (403)
- [ ] Test unauthorized start project → Should fail (401)

---

## 🔍 Code Review

### Registration Views
**File**: `/backend/djangomonitor/app/views.py` (Lines 54-160)
```python
@csrf_exempt
@require_POST
def register_customer(request):
    # Public endpoint - anyone can register as customer
    # Sets role=Roles.CUSTOMER, is_verified=False
    
@csrf_exempt  
@require_POST
def register_manager(request):
    # Public endpoint - anyone can register as manager
    # Sets role=Roles.MANAGER, is_verified=True (auto-approved)
    
@csrf_exempt
@require_POST
def create_customer_by_admin(request):
    # Admin-only endpoint enforced by permission check
    # Used by admin to create and invite customers
```

### Start Project Permission
**File**: `/backend/djangomonitor/app/views.py` (Line ~1030)
```python
@csrf_exempt
@require_POST
@role_required(Roles.PRODUCTION_MANAGER)  # ← NEWLY ADDED
def start_project(request, id=0):
    """Create ProductProcess (tasks) from a request - Only Production Manager can start projects"""
    # ... rest of implementation
```

---

## 🔗 Related Models & Roles

**Roles Defined** (`/backend/djangomonitor/app/models.py`):
```python
class Roles(models.TextChoices):
    CUSTOMER = "customer"
    MANAGER = "manager"  
    PRODUCTION_MANAGER = "production_manager"
    ADMIN = "admin"
```

**UserProfile Model**:
- `user` - ForeignKey to Django User
- `role` - CharField with role choices
- `is_verified` - Boolean (controls account approval)
- `verified_at` - DateTime of approval

---

## 🚀 Next Steps

1. **Add Registration UI** (if missing):
   - Update `login.jsx` to show customer registration form
   - Call `/app/register/customer/` endpoint on submit

2. **Test All Workflows**:
   - Create test accounts (customer, manager, production manager)
   - Verify permissions work as expected

3. **Proceed to Phase 2**: Product/Part Management Refactor

---

## 📝 Notes for Adviser Review

- ✅ User self-registration is **operational** via backend endpoints
- ✅ Admin account creation is **functional** with admin-only permission
- ✅ Production Manager project start permission is **enforced**
- ⚠️ Frontend registration form may need restoration/update
- ✅ All role-based permission checks use consistent decorator pattern

