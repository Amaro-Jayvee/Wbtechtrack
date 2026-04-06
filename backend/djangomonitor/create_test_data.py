#!/usr/bin/env python
"""
Create test data that works with the current schema
"""
import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.utils import timezone
from app.models import (
    ProductName, ProductProcess, ProcessName, Requests, RequestProduct, 
    Worker, User, UserProfile
)

print ("[TEST DATA] Creating test products and requests...")

# Get or create processes
process_names_list = ['Cutting', 'Welding', 'Assembly', 'Painting', 'QC']
processes = []
for name in process_names_list:
    p, created = ProcessName.objects.get_or_create(
        name=name
    )
    processes.append(p)
    if created:
        print(f"  + Created process: {name}")

# Create test products
products_data = [
    'GUSSET T726',
    'Frame Assembly',
    'Wheel Set',
]

products = []
for prod_name in products_data:
    p, created = ProductName.objects.get_or_create(
        prodName=prod_name
    )
    products.append(p)
    if created:
        print(f"  + Created product: {prod_name}")

# Create a test request
customer_profile = UserProfile.objects.filter(role='customer').first()
if customer_profile:
    customer_user = customer_profile.user
    admin_profile = UserProfile.objects.filter(role='admin').first()
    admin_user = admin_profile.user if admin_profile else None
    
    if admin_user:
        req, created = Requests.objects.get_or_create(
            RequestID=100,
            defaults={
                'deadline': timezone.now().date() + timedelta(days=30),
                'created_at': timezone.now().date(),
                'created_by': admin_user,
                'requester': customer_user,
                'approval_status': 'approved',
                'approved_by': admin_user,
                'request_status': 'active',
                'updated_at': timezone.now()
            }
        )
        
        if created or req.request_products.count() == 0:
            print(f"  + Processing request: {req.RequestID}")
            
            # Add products to request
            for product in products[:3]:
                rp, created = RequestProduct.objects.get_or_create(
                    request=req,
                    product=product,
                    defaults={
                        'quantity': 50,
                        'status': 'active',
                        'requested_at': timezone.now()
                    }
                )
                
                if created:
                    print(f"    + Added product to request: {product.prodName}")
                    
                    # Create product processes for this request 
                    for i, process in enumerate(processes[:2]):
                        pp, created = ProductProcess.objects.get_or_create(
                            request_product=rp,
                            product=product,
                            process=process,
                            step_order=i+1,
                            defaults={
                                'completed_quota': 0,
                                'defect_count': 0,
                                'is_completed': False,
                                'production_date': timezone.now().date(),
                                'created_at': timezone.now(),
                                'updated_at': timezone.now()
                            }
                        )
                        
                        if created:
                            print(f"      + Created process step: {process.name}")

print("\n[SUCCESS] Test data created!")
print("\nTo verify, navigate to:")
print("  - http://localhost:5174/login")
print("  - Use: customer_user / Customer@123")
print("  - View the requests and tasks dashboard")
