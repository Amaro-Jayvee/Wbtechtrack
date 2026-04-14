"""
WSGI config for djangomonitor project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
import sys

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')

application = get_wsgi_application()

# ============================================================================
# Run app initialization after Django is loaded
# ============================================================================

def initialize_app():
    """Initialize the app: create users and import products"""
    from django.contrib.auth import get_user_model
    from app.models import UserProfile, Roles
    
    User = get_user_model()
    
    print("\n" + "=" * 80)
    print("TECHTRACK APP INITIALIZATION")
    print("=" * 80)
    
    try:
        # Check if admin already exists
        admin_exists = User.objects.filter(username='admin').exists()
        
        if not admin_exists:
            print("\n[1/2] Creating users with correct roles...")
            
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
                
                profile, _ = UserProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        'full_name': full_name,
                        'company_name': company_name,
                        'contact_number': contact_number,
                        'role': role,
                        'is_verified': True,
                    }
                )
                
                print(f"  ✓ Created: {username} ({role})")
            
            print("✓ Users created successfully\n")
        else:
            print("\n[1/2] Users already exist, skipping creation\n")
        
        # Import products
        print("[2/2] Importing products...")
        try:
            # Add project root to path
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            if project_root not in sys.path:
                sys.path.insert(0, project_root)
            
            from import_products import run_import
            run_import()
            print("✓ Products imported successfully\n")
        except Exception as e:
            print(f"⚠ Product import skipped: {str(e)}\n")
        
        print("=" * 80)
        print("✓ INITIALIZATION COMPLETE!")
        print("=" * 80 + "\n")
        
    except Exception as e:
        print(f"✗ Initialization error: {str(e)}\n")

# Run initialization once on startup
initialize_app()
