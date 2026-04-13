#!/bin/bash
# Railway will use this to start the application

# Wait for database to be ready
echo "Waiting for database..."
sleep 10

# Run migrations
cd backend/djangomonitor
python manage.py migrate --noinput

# Create superuser if it doesn't exist
python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@techtrack.local', 'TechTrack123!')
END

# Import products
cd ../../
python import_products.py

# Import users
python create_correct_users.py

# Start services
docker-compose up
