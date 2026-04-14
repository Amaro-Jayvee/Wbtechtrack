#!/bin/bash
set -e

echo "=========================================="
echo "TechTrack Startup Script"
echo "=========================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "[1/4] Running Django migrations..."
cd backend/djangomonitor
python manage.py migrate --noinput 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
else
    echo "✗ Migrations failed"
    exit 1
fi

echo ""
echo "[2/4] Creating user accounts..."
cd /app
python create_correct_users.py 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Users created successfully"
else
    echo "✗ User creation failed"
    exit 1
fi

echo ""
echo "[3/4] Importing products..."
python import_products.py 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Products imported successfully"
else
    echo "✗ Product import failed (this is non-critical, continuing...)"
fi

echo ""
echo "[4/4] Starting Gunicorn..."
cd backend/djangomonitor
exec gunicorn djangomonitor.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120 --access-logfile - --error-logfile -
