#!/bin/bash
set -e

echo "Running Django migrations..."
python manage.py migrate --noinput

echo "Creating users..."
cd ../..
python create_correct_users.py

echo "Importing products..."
python import_products.py

cd backend/djangomonitor
echo "Starting gunicorn..."
exec gunicorn djangomonitor.wsgi:application --bind 0.0.0.0:$PORT
