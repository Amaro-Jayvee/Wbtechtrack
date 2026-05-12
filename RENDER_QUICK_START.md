# Render.com 10-Minute Quick Start

## 1️⃣ Sign Up (1 min)
- Go to https://render.com
- Click "Sign up with GitHub"
- Authorize access to `Wbtechtrack` repo

## 2️⃣ Create Backend Service (3 min)
**Dashboard** → **New +** → **Web Service**
- **Repository**: `Wbtechtrack`
- **Name**: `techtrack-backend`
- **Runtime**: Python 3
- **Build**: `pip install -r backend/requirements.txt && cd backend/djangomonitor && python manage.py collectstatic --noinput`
- **Start**: `cd backend/djangomonitor && gunicorn djangomonitor.wsgi:application --bind 0.0.0.0:$PORT --workers 4`

## 3️⃣ Create Database (2 min)
**Dashboard** → **New +** → **PostgreSQL**
- **Name**: `techtrack-db`
- Copy the connection URL when ready

## 4️⃣ Add Environment Variables (2 min)
Go to backend service → **Environment** tab → Add these:

```
DEBUG=False
SECRET_KEY=[generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"]
ALLOWED_HOSTS=techtrack-backend.render.com
CORS_ALLOWED_ORIGINS=https://techtrack-frontend.render.com
DATABASE_URL=[paste PostgreSQL URL from step 3]
EMAIL_HOST_USER=[your email]
EMAIL_HOST_PASSWORD=[your app password]
```

Click **Save** (backend will auto-redeploy)

## 5️⃣ Create Frontend Service (2 min)
**Dashboard** → **New +** → **Static Site**
- **Repository**: `Wbtechtrack`
- **Name**: `techtrack-frontend`
- **Build**: `cd frontend && npm ci && npm run build`
- **Publish**: `frontend/dist`
- **Create**

## 6️⃣ Done! ✅

**Get your URLs:**
- Frontend: `https://techtrack-frontend.render.com`
- Backend: `https://techtrack-backend.render.com`

**Every time you push to GitHub**, Render auto-deploys both services.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend won't start | Check logs for Python errors; verify `requirements.txt` path |
| Frontend MIME error | Verify publish directory is `frontend/dist` |
| Database connection fails | Copy exact PostgreSQL URL to `DATABASE_URL` env var |
| CORS errors | Update `CORS_ALLOWED_ORIGINS` with correct frontend URL |

## Cost
- **Free tier**: $0/month for 1 month ✅
- Free tier spins down after 15 min inactivity (5-10 sec startup)
- Upgrade to Starter ($7/month) for guaranteed uptime

Done! Your system is live on Render.
