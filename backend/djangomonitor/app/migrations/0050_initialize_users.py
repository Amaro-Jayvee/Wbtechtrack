# Generated manually - Data migration to initialize users and products

from django.db import migrations
from django.contrib.auth import get_user_model


def create_users(apps, schema_editor):
    """Create default users with roles"""
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
    
    for user_data in users_to_create:
        username = user_data.pop('username')
        email = user_data.pop('email')
        password = user_data.pop('password')
        full_name = user_data.pop('full_name')
        company_name = user_data.pop('company_name')
        contact_number = user_data.pop('contact_number')
        role = user_data.pop('role')
        
        # Get or create user
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'is_staff': user_data['is_staff'],
                'is_superuser': user_data['is_superuser'],
                'last_login': None,  # Allow last_login to be null for new users
            }
        )
        
        if not created:
            user.email = email
            user.is_staff = user_data['is_staff']
            user.is_superuser = user_data['is_superuser']
            user.set_password(password)
            user.save()
        else:
            user.set_password(password)
            user.save()
        
        # Create user profile with role
        profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'full_name': full_name,
                'company_name': company_name,
                'contact_number': contact_number,
                'role': role,
                'is_verified': True,
            }
        )
        
        if not profile_created:
            profile.role = role
            profile.save()
        
        print(f"✓ {username} with role '{role}'")
    
    print("\n" + "=" * 80)
    print("✓ All users created with roles!")
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
