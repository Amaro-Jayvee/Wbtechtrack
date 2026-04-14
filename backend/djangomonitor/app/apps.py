from django.apps import AppConfig
import os


class AppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app'
    
    def ready(self):
        """Run initialization when Django starts"""
        # Only run once on the main process, not on every reload
        if os.environ.get('RUN_MAIN') != 'true':
            return
        
        # Import here to avoid circular imports
        from django.contrib.auth import get_user_model
        from .models import UserProfile, Roles
        
        User = get_user_model()
        
        print("\n" + "=" * 80)
        print("TECHTRACK APP INITIALIZATION")
        print("=" * 80)
        
        # Step 1: Check if users exist
        admin_exists = User.objects.filter(username='admin').exists()
        
        if not admin_exists:
            print("\n[1/2] Creating users with correct roles...")
            self._create_users()
            print("✓ Users created successfully")
        else:
            print("\n[1/2] Users already exist, skipping creation")
        
        # Step 2: Import products
        print("\n[2/2] Importing products...")
        try:
            self._import_products()
            print("✓ Products imported successfully")
        except Exception as e:
            print(f"⚠ Product import skipped: {str(e)}")
        
        print("\n" + "=" * 80)
        print("✓ Initialization complete!")
        print("=" * 80 + "\n")
    
    def _create_users(self):
        """Create default users with roles"""
        from django.contrib.auth import get_user_model
        from .models import UserProfile, Roles
        
        User = get_user_model()
        
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
            print(f"  {status}: {username} ({role})")
    
    def _import_products(self):
        """Import products from code"""
        import sys
        import os
        
        # Add the project root to the path
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        
        try:
            from import_products import run_import
            print("  Running product import...")
            run_import()
        except FileNotFoundError:
            print("  ⚠ import_products.py not found")
        except Exception as e:
            print(f"  ⚠ Import failed: {str(e)}")
