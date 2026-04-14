# Generated manually - Data migration to initialize users and products

from django.db import migrations
from django.contrib.auth import get_user_model
from django.utils import timezone


def create_users(apps, schema_editor):
    """Create default users with roles - SIMPLE AND ROBUST"""
    User = get_user_model()
    UserProfile = apps.get_model('app', 'UserProfile')
    
    # Import Roles directly
    from app.models import Roles
    
    print("\n" + "=" * 80)
    print("MIGRATION: Creating Users with Roles")
    print("=" * 80 + "\n")
    
    users_to_create = [
        ('admin', 'admin@techtrack.local', 'TechTrack123!', 'System Administrator', 'TechTrack', '+1-555-0001', Roles.ADMIN, True, True),
        ('prod_manager', 'production.manager@techtrack.local', 'ProdManager123!', 'John Production Manager', 'TechTrack Production', '+1-555-0002', Roles.PRODUCTION_MANAGER, False, False),
        ('customer1', 'customer1@techtrack.local', 'Customer123!', 'Alice Customer', 'Customer Company A', '+1-555-0003', Roles.CUSTOMER, False, False),
        ('customer2', 'customer2@techtrack.local', 'Customer123!', 'Bob Customer', 'Customer Company B', '+1-555-0004', Roles.CUSTOMER, False, False),
    ]
    
    now = timezone.now()
    
    for username, email, password, full_name, company_name, contact_number, role, is_staff, is_superuser in users_to_create:
        # Check if user exists using .filter().exists()
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            print(f"✓ {username} already exists")
        else:
            # Create new user with all fields properly set
            user = User.objects.create(
                username=username,
                email=email,
                is_staff=is_staff,
                is_superuser=is_superuser,
                last_login=now,
                date_joined=now,
                password='!',  # Placeholder, will be overwritten
            )
            user.set_password(password)
            user.save()
            print(f"✓ Created {username}")
        
        # Handle profile separately using get_or_create
        profile, profile_created = UserProfile.objects.get_or_create(
            user_id=user.id,  # Use ID not instance to avoid issues
            defaults={
                'full_name': full_name,
                'company_name': company_name,
                'contact_number': contact_number,
                'role': role,
                'is_verified': True,
            }
        )
        
        if profile_created:
            print(f"  └─ Created profile with role '{role}'")
        else:
            # Update existing profile
            profile.role = role
            profile.full_name = full_name
            profile.company_name = company_name
            profile.contact_number = contact_number
            profile.save()
            print(f"  └─ Updated profile with role '{role}'")
    
    print("\n" + "=" * 80)
    print("✓ All users processed!")
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
