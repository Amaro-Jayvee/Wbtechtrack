#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# List all existing users
users = User.objects.all()
print("=" * 70)
print("EXISTING USERS IN SYSTEM")
print("=" * 70)
for u in users:
    role = "Admin/Superuser" if u.is_superuser else ("Staff" if u.is_staff else "Regular User")
    print(f"Username: {u.username:<20} | Email: {u.email:<30} | Role: {role}")

# Create additional test users if they don't exist
test_users = [
    ('supervisor', 'supervisor@techtrack.local', 'Supervisor123!', True),
    ('manager', 'manager@techtrack.local', 'Manager123!', False),
    ('operator', 'operator@techtrack.local', 'Operator123!', False),
    ('technician', 'technician@techtrack.local', 'Technician123!', False),
]

print("\n" + "=" * 70)
print("CREATING/UPDATING TEST USERS")
print("=" * 70)
for username, email, password, is_staff in test_users:
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': email, 'is_staff': is_staff, 'is_superuser': False}
    )
    user.set_password(password)
    user.save()
    status = "✓ Created" if created else "✓ Updated"
    print(f"{status}: {username} ({email})")

print("\n✓ All users ready for login!")
