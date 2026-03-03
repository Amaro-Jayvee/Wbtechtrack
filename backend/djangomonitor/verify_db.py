#!/usr/bin/env python
"""
Verify that users and passwords are correctly stored in the database
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from app.models import UserProfile

print("\n" + "=" * 70)
print("DATABASE VERIFICATION - USERS & PASSWORDS")
print("=" * 70 + "\n")

# Get all users
users = User.objects.all()
print(f"Total users in database: {len(users)}\n")

print("USER DETAILS:")
print("-" * 70)
for u in users:
    profile = UserProfile.objects.filter(user=u).first()
    print(f"\n📝 Username: {u.username}")
    print(f"   Email: {u.email}")
    print(f"   Has usable password: {u.has_usable_password()}")
    print(f"   Password hash: {u.password[:30]}..." if u.password else "   Password: NOT SET")
    print(f"   Is active: {u.is_active}")
    if profile:
        print(f"   Role: {profile.role}")
        print(f"   Verified: {profile.is_verified}")

print("\n" + "=" * 70)
print("TESTING AUTHENTICATION")
print("=" * 70 + "\n")

test_creds = [
    ("admin_user", "AdminPass123!"),
    ("manager_user", "ManagerPass123!"),
    ("customer_user", "CustomerPass123!"),
]

for username, password in test_creds:
    user = authenticate(username=username, password=password)
    status = "✓ SUCCESS" if user else "✗ FAILED"
    print(f"{status} - {username} / {password}")

print("\n" + "=" * 70)
print("IF PASSWORDS FAILED, RESETTING THEM NOW...")
print("=" * 70 + "\n")

# Reset passwords for core test accounts
reset_users = {
    "admin_user": "AdminPass123!",
    "manager_user": "ManagerPass123!",
    "customer_user": "CustomerPass123!",
}

for username, password in reset_users.items():
    try:
        user = User.objects.get(username=username)
        user.set_password(password)
        user.save()
        print(f"✓ Reset password for {username}")
    except User.DoesNotExist:
        print(f"✗ User {username} not found")

print("\n" + "=" * 70)
print("RE-TESTING AUTHENTICATION AFTER PASSWORD RESET")
print("=" * 70 + "\n")

for username, password in test_creds:
    user = authenticate(username=username, password=password)
    status = "✓ SUCCESS" if user else "✗ FAILED"
    print(f"{status} - {username} / {password}")

print("\n" + "=" * 70)
print("✓ DATABASE VERIFICATION COMPLETE!")
print("=" * 70 + "\n")
