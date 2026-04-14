#!/bin/bash
set -e

cd /app/backend/djangomonitor

echo "=========================================="
echo "Starting Django application setup..."
echo "=========================================="

echo "[1/4] Running Django migrations..."
python manage.py migrate --noinput || { echo "Migration failed!"; exit 1; }
echo "✓ Migrations completed"

echo ""
echo "[2/4] Creating admin user and other users..."
cd /app
python create_correct_users.py || { echo "User creation failed!"; exit 1; }
echo "✓ Users created"

echo ""
echo "[3/4] Importing products..."
python import_products.py || { echo "Product import failed!"; exit 1; }
echo "✓ Products imported"

echo ""
echo "[4/4] Starting Gunicorn..."
cd /app/backend/djangomonitor
exec gunicorn djangomonitor.wsgi:application --bind 0.0.0.0:$PORT --workers 2

