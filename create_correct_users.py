#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.contrib.auth import get_user_model
from app.models import UserProfile, Roles

User = get_user_model()

print("=" * 80)
print("CREATING USERS WITH CORRECT ROLES FROM MODEL")
print("=" * 80)

# Define users with correct roles matching the Roles model
users_to_create = [
    {
        'username': 'admin',
        'email': 'admin@techtrack.local',
        'password': 'TechTrack123!',
        'full_name': 'System Administrator',
        'company_name': 'TechTrack',
        'contact_number': '+1-555-0001',
        'role': Roles.ADMIN,
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'username': 'prod_manager',
        'email': 'production.manager@techtrack.local',
        'password': 'ProdManager123!',
        'full_name': 'John Production Manager',
        'company_name': 'TechTrack Production',
        'contact_number': '+1-555-0002',
        'role': Roles.PRODUCTION_MANAGER,
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'customer1',
        'email': 'customer1@techtrack.local',
        'password': 'Customer123!',
        'full_name': 'Alice Customer',
        'company_name': 'Customer Company A',
        'contact_number': '+1-555-0003',
        'role': Roles.CUSTOMER,
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'customer2',
        'email': 'customer2@techtrack.local',
        'password': 'Customer123!',
        'full_name': 'Bob Customer',
        'company_name': 'Customer Company B',
        'contact_number': '+1-555-0004',
        'role': Roles.CUSTOMER,
        'is_staff': False,
        'is_superuser': False,
    },
]

print("\nCreating users with correct roles:\n")

for user_data in users_to_create:
    username = user_data.pop('username')
    email = user_data.pop('email')
    password = user_data.pop('password')
    full_name = user_data.pop('full_name')
    company_name = user_data.pop('company_name')
    contact_number = user_data.pop('contact_number')
    role = user_data.pop('role')
    
    # Create or update user
    user, created = User.objects.update_or_create(
        username=username,
        defaults={
            'email': email,
            'is_staff': user_data['is_staff'],
            'is_superuser': user_data['is_superuser'],
        }
    )
    user.set_password(password)
    user.save()
    
    # Create or update user profile
    profile, profile_created = UserProfile.objects.update_or_create(
        user=user,
        defaults={
            'full_name': full_name,
            'company_name': company_name,
            'contact_number': contact_number,
            'role': role,
            'is_verified': True,
        }
    )
    
    status = "✓ Created" if created else "✓ Updated"
    print(f"{status}: {username}")
    print(f"   └─ Role: {role} | Email: {email} | Password: {password}\n")

print("=" * 80)
print("✓ All users created with correct roles matching the system!")
print("=" * 80)
