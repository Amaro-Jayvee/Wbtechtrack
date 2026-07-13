# TechTrack Deployment on Render.com

> **Timeline**: ~15-20 minutes total setup | **Cost**: Free (up to 750 compute hours/month)

## Overview

Render.com provides a free tier that includes:
- Web services (Node.js, Python, Static)
- PostgreSQL databases (free tier: 256MB, shared)
- One-click GitHub deployment with auto-redeploy on push

**For TechTrack**: We'll deploy:
1. **Backend** → Python service (gunicorn)
2. **Frontend** → Static site service (pre-built React)
3. **Database** → PostgreSQL (we'll need to migrate from MySQL)

---

## Part 1: Prepare GitHub Repository

Your latest commit is already on GitHub (`ef66783`), so no action needed here.

**Verify**:
```bash
git log --oneline -1
# Output should be: ef66783 Fix login background not loading in production...
```

---

## Part 2: Create Render Account & Connect GitHub

1. Go to **https://render.com**
2. Click **Sign up** → Choose "Sign up with GitHub"
3. Authorize GitHub repo access
4. On dashboard, click **New +** → Select service type based on section below

---

## Part 3: Deploy Backend (Django Service)

### Step 3a: Create Web Service

1. **https://dashboard.render.com** → Click **New +** → **Web Service**
2. Select repository: `Wbtechtrack`
3. **Name**: `techtrack-backend`
4. **Environment**: Python 3
5. **Build Command**: 
   ```
   pip install -r backend/requirements.txt && cd backend/djangomonitor && python manage.py collectstatic --noinput
   ```
6. **Start Command**:
   ```
   cd backend/djangomonitor && gunicorn djangomonitor.wsgi:application --bind 0.0.0.0:$PORT --workers 4
   ```
7. **Plan**: Free (or Starter if you want guaranteed uptime)
8. Click **Create Web Service**

### Step 3b: Configure Environment Variables

Once service is created, go to **Environment** tab and add:

```
DEBUG=False
SECRET_KEY=your-new-secure-random-key-32-chars
ALLOWED_HOSTS=techtrack-backend.render.com,yourfrontend.render.com
CORS_ALLOWED_ORIGINS=https://yourfrontend.render.com
DATABASE_URL=postgresql://user:password@host:port/dbname
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

⚠️ **Generate SECRET_KEY**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Part 4: Create PostgreSQL Database

### Step 4a: Create Database Instance

1. **https://dashboard.render.com** → Click **New +** → **PostgreSQL**
2. **Name**: `techtrack-db`
3. **Database**: `techtrack_db`
4. **User**: `techtrack_user`
5. **Plan**: Free
6. Click **Create Database**

### Step 4b: Get Connection String

Once created:
1. Click on the database
2. Copy the **Internal Database URL** (format: `postgresql://user:pass@host:port/dbname`)
3. Add to backend service environment as `DATABASE_URL`

---

## Part 5: Deploy Frontend (Static Site Service)

### Step 5a: Build Locally (One-time)

```bash
cd frontend
npm ci
npm run build
# Creates dist/ folder
```

### Step 5b: Create Static Site Service

1. **https://dashboard.render.com** → Click **New +** → **Static Site**
2. Select repository: `Wbtechtrack`
3. **Name**: `techtrack-frontend`
4. **Build Command**: `cd frontend && npm ci && npm run build`
5. **Publish Directory**: `frontend/dist`
6. Click **Create Static Site**

### Step 5c: Update Backend CORS

After frontend deploys, get its URL (format: `https://techtrack-frontend.render.com`), then:

1. Go to **techtrack-backend** service → **Environment**
2. Update:
   ```
      =https://techtrack-frontend.render.com
   ALLOWED_HOSTS=techtrack-backend.render.com,techtrack-frontend.render.com
   ```
3. Click **Save** (service will auto-redeploy)

---

## Part 6: Configure Frontend for Backend API

Update [frontend/src/shared/utils/api.ts](../frontend/src/shared/utils/api.ts) or similar:

```javascript
// Use backend URL from Render
const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://techtrack-backend.render.com';

export const apiClient = axios.create({
  baseURL: API_URL,
  // ... rest of config
});
```

Add to `frontend/.env.production`:
```
VITE_BACKEND_URL=https://techtrack-backend.render.com
```

---

## Part 7: Database Migration (MySQL → PostgreSQL)

### Option A: Export & Import Data (Recommended for 1 month)

```bash
# Export from MySQL
mysqldump -u techtrack_user -p techtrack_db > backup.sql

# Connect to Render PostgreSQL and import
# (Render provides a psql connection string)
psql postgresql://user:pass@host:port/dbname < backup.sql
```

### Option B: Re-seed Database

If data loss is acceptable, just let Django migrations run:
- Render backend will execute migrations on first deploy
- All schema will be created automatically
- You'll need to re-enter data (users, products, templates, etc.)

---

## Part 8: Verify Deployment

### Check Backend Health

```bash
curl https://techtrack-backend.render.com/api/health
# Should return 200 OK
```

### Check Frontend Load

Visit: `https://techtrack-frontend.render.com`
- Login page should load without MIME errors
- Check browser console for API connectivity
- Try logging in (confirm backend is reachable)

### Check Logs

For each service, click **Logs** tab to troubleshoot:
- Backend errors → Python/Django logs
- Frontend build errors → npm/build logs
- Database connection → Connection timeout errors

---

## Part 9: Monitor & Scale

### Auto-redeploy on Push

Both services will auto-redeploy when you push to GitHub `main` branch.

### Free Tier Limits

- **Backend**: 750 compute hours/month (⚠️ Free tier spins down after 15 min inactivity)
- **Database**: 256MB storage (plenty for test data)
- **Frontend**: Unlimited static hosting

### Upgrade if Needed

If you need guaranteed uptime (no spin-down):
- Upgrade to **Starter** plan ($7/month for each service)
- Or keep free tier and accept 5-10 second startup delays

---

## Troubleshooting

### Backend won't start
- Check **Logs** for Python errors
- Verify environment variables set correctly
- Ensure `requirements.txt` is in `backend/` folder

### Frontend shows MIME type error
- Verify build command: `cd frontend && npm ci && npm run build`
- Check publish directory is `frontend/dist`
- Clear browser cache and hard refresh

### Database connection fails
- Verify `DATABASE_URL` format is correct
- Check Render DB is in same region as backend
- Ping Render DB from backend logs

### CORS errors on frontend
- Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check backend is receiving the header correctly

---

## Quick Command Reference

```bash
# Test locally before pushing
npm run build           # Build frontend
python manage.py test  # Run backend tests

# Push to trigger auto-redeploy
git add .
git commit -m "Deploy to Render"
git push origin main

# Check service status
curl https://techtrack-backend.render.com/api/
curl https://techtrack-frontend.render.com/
```

---

## Cost Breakdown

- **Backend**: Free (750 hrs/month)
- **Frontend**: Free (unlimited static)
- **Database**: Free (256MB)
- **Total**: **$0/month** for 1 month

After 1 month, if you need to continue:
- **Starter plan**: ~$7/month per service = ~$21/month total
- Or keep free tier with spin-down delays

---

## Next Steps

1. Create Render.com account
2. Deploy backend service (3 min)
3. Deploy PostgreSQL database (2 min)
4. Configure environment variables (2 min)
5. Deploy frontend static site (5 min)
6. Test and verify connectivity (3 min)

**Total: ~15-20 minutes**

---

## Support

Render Docs: https://render.com/docs
- Web Services: https://render.com/docs/deploy-python
- Static Sites: https://render.com/docs/static-sites
- Databases: https://render.com/docs/databases

Need help? Your code is clean and ready—just follow the steps above!
