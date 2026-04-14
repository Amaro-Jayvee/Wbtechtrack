web: cd backend/djangomonitor && python manage.py migrate --noinput && gunicorn djangomonitor.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
