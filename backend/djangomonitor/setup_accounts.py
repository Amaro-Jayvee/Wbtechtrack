#!/usr/bin/env python
import os
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.contrib.auth.models import User
from app.models import UserProfile

# Test accounts
accounts = [
    {
        'username': 'admin_user',
        'password': 'Admin@123',
        'email': 'admin@test.com',
        'role': 'admin',
        'first_name': 'Admin',
        'last_name': 'User',
        'full_name': 'Admin Test User',
        'company_name': 'Admin Company',
    },
    {
        'username': 'manager_user',
        'password': 'Manager@123',
        'email': 'manager@test.com',
        'role': 'production_manager',
        'first_name': 'Manager',
        'last_name': 'User',
        'full_name': 'Manager Test User',
        'company_name': 'Manager Company',
    },
    {
        'username': 'customer_user',
        'password': 'Customer@123',
        'email': 'customer@test.com',
        'role': 'customer',
        'first_name': 'Customer',
        'last_name': 'User',
        'full_name': 'Customer Test User',
        'company_name': 'Customer Company',
    },
]

# Delete existing test accounts
User.objects.filter(username__in=['admin_user', 'manager_user', 'customer_user']).delete()
print('Deleted old accounts')

# Create new accounts
for acc in accounts:
    user = User(
        username=acc['username'],
        email=acc['email'],
        first_name=acc['first_name'],
        last_name=acc['last_name'],
        last_login=datetime.now(),
    )
    user.set_password(acc['password'])
    user.save()
    
    UserProfile.objects.create(
        user=user,
        role=acc['role'],
        full_name=acc['full_name'],
        company_name=acc['company_name'],
        contact_number='1234567890',
        is_verified=True,
        terms_accepted=True,
    )
    print(f"✅ Created {acc['username']} ({acc['role']})")

print('\n✅ All test accounts created successfully!')
print('\nTest Credentials:')
for acc in accounts:
    print(f"  • {acc['role']}: {acc['username']} / {acc['password']}")
