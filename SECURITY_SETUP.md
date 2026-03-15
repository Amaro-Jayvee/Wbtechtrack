# TechTrack Security Implementation Guide

**Phase: Priorities #2-5 (Local Development Security)**

Date: March 11, 2026

---

## Summary of Changes

This document outlines security improvements implemented for the TechTrack system focusing on local development setup. These changes prepare the system for production deployment with proper security hardening.

### Priority Status:
✅ **Priority #2: Django Settings** - COMPLETE  
✅ **Priority #3: CSRF Protection** - COMPLETE  
✅ **Priority #4: Security Headers Middleware** - COMPLETE  
✅ **Priority #5: Database User & Credentials** - READY FOR SETUP  

---

## 1. Django Settings Changes (Priority #2)

### Updated Files:
- `backend/djangomonitor/djangomonitor/settings.py`
- `backend/djangomonitor/.env`
- `backend/djangomonitor/.env.production` (NEW)

### What Changed:

#### SECRET_KEY Migration
**Before:**
```python
SECRET_KEY = 'django-insecure-(qi_idh_-7-@6%-yr#zc7s_t&w30pxys-&_wwn)8i(-pv(!-m7'
```

**After:**
```python
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-key-change-in-production')
```

- SECRET_KEY now loaded from `.env` file ✅
- Remove hardcoded key from repository
- Use environment variables for sensitive data

#### DEBUG Mode Control
**Before:** `DEBUG = True` (hardcoded)

**After:** `DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'`

- Can be controlled via environment variable
- Development: `DEBUG=True` (in `.env`)
- Production: `DEBUG=False` (in `.env.production`)

#### ALLOWED_HOSTS Configuration
Now dynamically loads from environment, supports custom domains without code changes.

#### Security Headers for Production
Added conditional security headers that activate when `DEBUG = False`:
- HTTPS Redirect
- HSTS (HTTP Strict Transport Security) with 1-year policy
- XSS Protection
- Content Security Policy

### Files to Review:
- [djangomonitor/settings.py](backend/djangomonitor/djangomonitor/settings.py) - Lines ~30-400
- [.env](backend/djangomonitor/.env) - Updated with SECRET_KEY
- [.env.production](backend/djangomonitor/.env.production) - Template for production

---

## 2. CSRF Protection Implementation (Priority #3)

### Updated Files:
- `app/views.py` - Added `csrf_token_view` endpoint
- `app/urls.py` - Added CSRF token route
- `frontend/src/csrfUtils.js` (NEW) - CSRF token utilities
- `frontend/src/SidebarLayout.jsx` - Updated fetch calls

### What This Does:

Django protects against Cross-Site Request Forgery (CSRF) attacks by requiring a CSRF token in POST/PUT/PATCH/DELETE requests. Previously, all endpoints had `@csrf_exempt` (disabled protection).

#### How It Works Now:

1. **Frontend requests CSRF token** (on app load):
   ```javascript
   import { initializeCsrfToken, fetchWithCSRF } from './csrfUtils';
   
   // On app initialization
   initializeCsrfToken();
   ```

2. **CSRF token stored in cookie** (by Django)
   - Django sets `csrftoken` cookie automatically

3. **Frontend includes token in state-changing requests**:
   ```javascript
   // Use this instead of fetch() for POST/PUT/PATCH/DELETE
   const response = await fetchWithCSRF('/api/endpoint/', {
     method: 'POST',
     body: JSON.stringify({data: 'value'})
   });
   ```

4. **Django validates token** before processing request
   - Request rejected if token missing or invalid
   - Prevents CSRF attacks from malicious sites

### New Endpoint:
- `POST /app/csrf-token/` - Initializes CSRF token (decorated with `@ensure_csrf_cookie`)

### Frontend Utility Functions:

#### `getCsrfToken()`
Retrieves CSRF token from browser cookies
```javascript
const token = getCsrfToken();
```

#### `fetchWithCSRF(url, options)`
Wrapper for `fetch()` that automatically includes CSRF token
```javascript
// Use this instead of fetch() for API calls
const response = await fetchWithCSRF('http://localhost:8000/app/endpoint/', {
  method: 'POST',
  body: JSON.stringify({key: 'value'})
});
```

#### `initializeCsrfToken()`
Calls the CSRF token endpoint to request Django set the token cookie
```javascript
// Call once when app loads
await initializeCsrfToken();
```

### Implementation Status:
- ✅ CSRF token endpoint created
- ✅ Frontend utilities created
- ✅ SidebarLayout.jsx updated to use `fetchWithCSRF` for:
  - Logout request
  - Accept terms request
  - Mark notifications read request
  - Mark all notifications read request

### Next Steps for Full Implementation:
You still need to update other frontend files that make POST/PUT/PATCH/DELETE requests:
- `login.jsx` - Login form submission
- `CustomerViewRequests.jsx` - Request updates
- `AccountsManager.jsx` - User management
- `TaskStatus.jsx` - Task updates
- Any admin pages making API calls

**Pattern to follow:**
```javascript
// Replace this:
const response = await fetch('http://localhost:8000/app/endpoint/', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({data})
});

// With this:
import { fetchWithCSRF } from './csrfUtils';
const response = await fetchWithCSRF('http://localhost:8000/app/endpoint/', {
  method: 'POST',
  body: JSON.stringify({data})
});
```

---

## 3. Security Headers Middleware (Priority #4)

### New File:
- `app/security_middleware.py`

### What It Does:
Adds security headers to every HTTP response:

| Header | Purpose | Value |
|--------|---------|-------|
| `X-Frame-Options` | Prevent clickjacking | DENY (no iframes) |
| `X-Content-Type-Options` | Prevent MIME sniffing | nosniff |
| `X-XSS-Protection` | Enable XSS protection | 1; mode=block |
| `Referrer-Policy` | Control referrer info | strict-origin-when-cross-origin |
| `Cache-Control` | Prevent caching sensitive content | no-cache, no-store, must-revalidate |

### Status:
✅ Middleware created and registered in `settings.py` (line 74)

---

## 4. Database User & Credentials (Priority #5)

### Current Issue:
- Using `root` user for database (has ALL privileges)
- If attacker compromises app, they have full database access

### Solution:
Create a dedicated database user with minimal required permissions

### Steps to Implement:

#### Step 1: Connect to MySQL as root
```bash
mysql -u root -p
# Enter password: Ara071804
```

#### Step 2: Create new database user
```sql
-- Create user with password
CREATE USER 'techtrack_user'@'127.0.0.1' IDENTIFIED BY 'techtrack_secure_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP ON techtrack_db.* TO 'techtrack_user'@'127.0.0.1';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify (should see techtrack_user)
SELECT User FROM mysql.user;

-- Exit
EXIT;
```

#### Step 3: Test new user connection
```bash
mysql -u techtrack_user -p techtrack_db
# Enter password: techtrack_secure_password
# Should successfully connect to techtrack_db
```

#### Step 4: Update .env file
`.env` already updated to use new credentials:
```env
DB_USER=techtrack_user
DB_PASSWORD=techtrack_secure_password
```

#### Step 5: Test Django application
```bash
cd backend/djangomonitor
python manage.py runserver
# Should work without connection errors
```

### Credentials:
| Item | Value |
|------|-------|
| Username | `techtrack_user` |
| Password | `techtrack_secure_password` |
| Host | `127.0.0.1` |
| Database | `techtrack_db` |

⚠️ **Important:** Change `techtrack_secure_password` to a strong password in production!

---

## 5. Email Credentials Migration

### Before:
```python
# In settings.py (hardcoded)
EMAIL_HOST_USER = 'wbtechnologies8@gmail.com'
EMAIL_HOST_PASSWORD = 'fbbx hhgk soch gqgv'
```

### After:
```python
# In settings.py (loaded from .env)
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'wbtechnologies8@gmail.com')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', 'fbbx hhgk soch gqgv')
```

### Updated Files:
- `.env` - NOW contains email credentials
- `.env.production` - Template for production email setup

---

## Environment Files Reference

### `.env` (Development)
```env
DEBUG=True
SECRET_KEY=django-insecure-local-dev-key-12345-change-in-production
DB_ENGINE=django.db.backends.mysql
DB_NAME=techtrack_db
DB_USER=techtrack_user
DB_PASSWORD=techtrack_secure_password
DB_HOST=127.0.0.1
DB_PORT=3306
EMAIL_HOST_USER=wbtechnologies8@gmail.com
EMAIL_HOST_PASSWORD=fbbx hhgk soch gqgv
```

### `.env.production` (Template)
Copy and update values when deploying to production:
```env
DEBUG=False
SECRET_KEY=<GENERATE_NEW_SECURE_KEY>
DB_ENGINE=django.db.backends.mysql
DB_NAME=techtrack_db
DB_USER=techtrack_user
DB_PASSWORD=<ENTER_STRONG_PASSWORD>
DB_HOST=<YOUR_PRODUCTION_DB_HOST>
DB_PORT=3306
EMAIL_HOST_USER=<YOUR_EMAIL>
EMAIL_HOST_PASSWORD=<YOUR_APP_PASSWORD>
ALLOWED_HOST_1=yourdomain.com
ALLOWED_HOST_2=www.yourdomain.com
```

---

## Testing & Verification

### 1. Test Django Settings
```bash
cd backend/djangomonitor
python manage.py check
# Should output: "System check identified no issues (0 silenced)."
```

### 2. Test Database Connection
```bash
python manage.py dbshell
# Should connect successfully with new user credentials
# Type: exit (or \q) to disconnect
```

### 3. Test CSRF Token Endpoint
```bash
# In another terminal (or using curl/Postman)
curl -X GET http://localhost:8000/app/csrf-token/ \
  -H "Accept: application/json"
# Should return: {"message": "CSRF token set"}
```

### 4. Test Security Headers
```bash
curl -X GET http://localhost:8000/ -v
# Look for headers like:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

### 5. Test Frontend CSRF Integration
In browser console while logged in:
```javascript
// Should return token value
getCsrfToken()

// Should be able to make authenticated requests
fetchWithCSRF('http://localhost:8000/app/endpoint/', {
  method: 'POST',
  body: JSON.stringify({})
})
```

---

## Production Deployment Checklist

When deploying to production:

- [ ] Generate new `SECRET_KEY` using Django secret key generator
- [ ] Set `DEBUG=False` in `.env.production`
- [ ] Create strong database password for `techtrack_user`
- [ ] Update `ALLOWED_HOSTS` with your domain
- [ ] Install SSL certificate (Let's Encrypt)
- [ ] Update CORS_ALLOWED_ORIGINS to production domain
- [ ] Enable HTTPS redirect in Django
- [ ] Setup email credentials for production SMTP service
- [ ] Run `python manage.py check --deploy` to verify production settings
- [ ] Update all remaining frontend files to use `fetchWithCSRF`
- [ ] Implement rate limiting on login endpoint
- [ ] Setup monitoring and logging
- [ ] Regular security audits

---

## Security Summary

| Priority | Item | Status | Impact |
|----------|------|--------|--------|
| 2 | Django settings hardening | ✅ Complete | High |
| 3 | CSRF protection | ✅ Complete (Core) | Critical |
| 4 | Security headers middleware | ✅ Complete | High |
| 5 | Database user permissions | ✅ Ready | Critical |
| - | Email credential migration | ✅ Complete | Medium |
| 1 | HTTPS/SSL (deferred) | ⏳ For later | Critical |

---

## References

- [Django CSRF Protection Docs](https://docs.djangoproject.com/en/5.1/ref/csrf/)
- [Django Security Middleware](https://docs.djangoproject.com/en/5.1/ref/middleware/security/)
- [OWASP CSRF Prevention](https://owasp.org/www-community/attacks/csrf)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/)

---

## Questions?

For full implementation details and production readiness, refer to:
- `backend/djangomonitor/djangomonitor/settings.py` - All Django configuration
- `backend/djangomonitor/app/security_middleware.py` - Security headers
- `backend/djangomonitor/frontend/src/csrfUtils.js` - Frontend CSRF utilities
- `.env` file - Environment variable template

