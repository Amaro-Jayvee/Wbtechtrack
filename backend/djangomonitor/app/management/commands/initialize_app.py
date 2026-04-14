from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from app.models import UserProfile, Roles
import sys

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialize the application: create users and import products'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("TECHTRACK APP INITIALIZATION")
        self.stdout.write("=" * 80)
        
        # Step 1: Create Users
        self.stdout.write("\n[1/2] Creating users with correct roles...")
        self._create_users()
        
        # Step 2: Import Products
        self.stdout.write("\n[2/2] Importing products...")
        self._import_products()
        
        self.stdout.write(self.style.SUCCESS("\n✓ Initialization complete!"))

    def _create_users(self):
        """Create default users with roles"""
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
            self.stdout.write(f"{status}: {username}")
            self.stdout.write(f"   └─ Role: {role} | Email: {email}")

    def _import_products(self):
        """Import products from code"""
        try:
            # Import the products function
            import sys
            import os
            
            # Add the project root to the path
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            if project_root not in sys.path:
                sys.path.insert(0, project_root)
            
            # Import and run the import_products script
            from import_products import run_import
            
            self.stdout.write("Running product import...")
            run_import()
            self.stdout.write("✓ Products imported successfully")
            
        except FileNotFoundError:
            self.stdout.write(self.style.WARNING("⚠ import_products.py not found (this is non-critical)"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠ Product import skipped: {str(e)}"))
