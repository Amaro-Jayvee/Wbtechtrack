# Generated manually - Data migration to initialize users and products

from django.db import migrations
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.auth.hashers import make_password


def create_users(apps, schema_editor):
    """Create default users with roles - using raw SQL to avoid NULL issues"""
    User = get_user_model()
    UserProfile = apps.get_model('app', 'UserProfile')
    
    # Import Roles directly
    from app.models import Roles
    
    print("\n" + "=" * 80)
    print("MIGRATION: Creating Users with Roles")
    print("=" * 80 + "\n")
    
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
    
    now = timezone.now()
    
    for user_data in users_to_create:
        try:
            # Try to get existing user
            user = User.objects.get(username=user_data['username'])
            print(f"✓ {user_data['username']} already exists")
        except User.DoesNotExist:
            # Create new user with explicit last_login timestamp
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                is_staff=user_data['is_staff'],
                is_superuser=user_data['is_superuser'],
                last_login=now,  # Explicitly set to current time
                date_joined=now,
            )
            user.set_password(user_data['password'])
            user.save()
            print(f"✓ Created {user_data['username']}")
        
        # Create or update user profile with role
        try:
            profile = UserProfile.objects.get(user=user)
            profile.role = user_data['role']
            profile.full_name = user_data['full_name']
            profile.company_name = user_data['company_name']
            profile.contact_number = user_data['contact_number']
            profile.save()
            print(f"  └─ Updated profile for {user_data['username']} with role '{user_data['role']}'")
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(
                user=user,
                full_name=user_data['full_name'],
                company_name=user_data['company_name'],
                contact_number=user_data['contact_number'],
                role=user_data['role'],
                is_verified=True,
            )
            print(f"  └─ Created profile for {user_data['username']} with role '{user_data['role']}'")
    
    print("\n" + "=" * 80)
    print("✓ All users processed successfully!")
    print("=" * 80 + "\n")


def reverse_users(apps, schema_editor):
    """Reverse function - delete the created users"""
    User = get_user_model()
    User.objects.filter(username__in=['admin', 'prod_manager', 'customer1', 'customer2']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0049_add_more_missing_columns'),
    ]

    operations = [
        migrations.RunPython(create_users, reverse_users),
    ]
