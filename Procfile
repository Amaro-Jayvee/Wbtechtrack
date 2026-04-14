web: cd backend/djangomonitor && python manage.py migrate --noinput && python manage.py initialize_app && gunicorn djangomonitor.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
