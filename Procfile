# Railway free tier: use gunicorn native --chdir (no shell operators)
web: gunicorn --chdir backend/djangomonitor -b 0.0.0.0:8080 djangomonitor.wsgi:application --workers 3 --timeout 120
