from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from app.models import UserProfile, Roles
from datetime import datetime

class Command(BaseCommand):
    help = 'Create test accounts for each role'

    def handle(self, *args, **options):
        # Test accounts data with all required fields
        test_accounts = [
            {
                'username': 'admin_user',
                'password': 'Admin@123',
                'email': 'admin@test.com',
                'role': Roles.ADMIN,
                'first_name': 'Admin',
                'last_name': 'User',
                'full_name': 'Admin Test User',
                'company_name': 'Tech Track Admin',
                'contact_number': '1234567890',
                'is_verified': True,
            },
            {
                'username': 'manager_user',
                'password': 'Manager@123',
                'email': 'manager@test.com',
                'role': Roles.PRODUCTION_MANAGER,
                'first_name': 'Manager',
                'last_name': 'User',
                'full_name': 'Manager Test User',
                'company_name': 'Tech Track Production',
                'contact_number': '1234567891',
                'is_verified': True,
            },
            {
                'username': 'customer_user',
                'password': 'Customer@123',
                'email': 'customer@test.com',
                'role': Roles.CUSTOMER,
                'first_name': 'Customer',
                'last_name': 'User',
                'full_name': 'Customer Test User',
                'company_name': 'Test Customer Company',
                'contact_number': '1234567892',
                'is_verified': True,
            },
        ]

        for account in test_accounts:
            username = account['username']
            
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f'User {username} already exists, skipping...'))
                continue
            
            # Create Django user
            user = User.objects.create_user(
                username=username,
                password=account['password'],
                email=account['email'],
                first_name=account['first_name'],
                last_name=account['last_name'],
            )
            
            # Create UserProfile with all required fields
            profile = UserProfile.objects.create(
                user=user,
                role=account['role'],
                full_name=account['full_name'],
                company_name=account['company_name'],
                contact_number=account['contact_number'],
                is_verified=account['is_verified'],
                terms_accepted=True,
            )
            
            self.stdout.write(self.style.SUCCESS(f'✅ Created {username} ({account["role"]})'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ All test accounts created successfully!'))
        self.stdout.write(self.style.WARNING('\n📝 Test Credentials:\n'))
        
        for account in test_accounts:
            self.stdout.write(f"  • {account['role']}: {account['username']} / {account['password']}")
