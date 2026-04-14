import django
from django.db.models.signals import post_migrate
from django.dispatch import receiver
import sys
import os


@receiver(post_migrate)
def initialize_application(sender, **kwargs):
    """
    Initialize app after migrations are complete.
    This signal fires after Django finishes migrations.
    """
    from django.contrib.auth import get_user_model
    from .models import UserProfile, Roles
    
    User = get_user_model()
    
    # Only run once
    if not hasattr(initialize_application, '_initialized'):
        initialize_application._initialized = True
        
        print("\n" + "=" * 80)
        print("TECHTRACK INITIALIZATION - Post-Migration Signal")
        print("=" * 80 + "\n")
        
        try:
            # Check if users exist
            admin_exists = User.objects.filter(username='admin').exists()
            
            if not admin_exists:
                print("[Creating Users]")
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
                    
                    print(f"  ✓ {username} ({role})")
                
                print("[Users Created]\n")
            else:
                print("[Users Already Exist - Skipping]\n")
            
            # Try to import products
            print("[Importing Products]")
            try:
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
                if project_root not in sys.path:
                    sys.path.insert(0, project_root)
                
                from import_products import run_import
                run_import()
                print("[Products Imported]\n")
            except Exception as e:
                print(f"[Products Import Skipped: {str(e)}]\n")
            
            print("=" * 80)
            print("✓ INITIALIZATION COMPLETE!")
            print("=" * 80 + "\n")
            
        except Exception as e:
            print(f"\n✗ INITIALIZATION ERROR: {str(e)}\n")
            import traceback
            traceback.print_exc()

# Register the signal handler
default_app_config = 'app.apps.AppConfig'
