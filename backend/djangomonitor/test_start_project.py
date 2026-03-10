#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import Requests, RequestProduct, ProductProcess
from django.contrib.auth.models import User

# Check request ID 85 (the one we just created with 2 products)
req = Requests.objects.get(RequestID=85)

print(f"Request ID: {req.RequestID}")
print(f"Total RequestProducts: {req.request_products.count()}")
print(f"Total RequestProducts (all()): {req.request_products.all().count()}")
print(f"Total ProductProcess tasks: {ProductProcess.objects.filter(request_product__request=req).count()}")

print("\n--- RequestProducts Details ---")
for rp in req.request_products.all():
    print(f"ID: {rp.id}, Product: {rp.product.prodName}, Qty: {rp.quantity}")
    
    # Check if ProductProcess already exist for this product
    existing_tasks = ProductProcess.objects.filter(request_product=rp)
    print(f"  Existing tasks: {existing_tasks.count()}")
    for task in existing_tasks:
        print(f"    - Task {task.id}: {task.process.name}")

print("\n--- Calling _auto_start_project_tasks ---")
from app.views import _auto_start_project_tasks
admin_user = User.objects.get(username='admin_user')

# First, delete existing ProductProcess to simulate fresh start
ProductProcess.objects.filter(request_product__request=req).delete()
print("Deleted existing ProductProcess tasks")

# Now call the function
created = _auto_start_project_tasks(req, admin_user)
print(f"\nCreated tasks: {len(created)}")
for task in created:
    print(f"  - {task}")

# Check what's now in the database
print("\n--- After _auto_start_project_tasks ---")
for rp in req.request_products.all():
    existing_tasks = ProductProcess.objects.filter(request_product=rp)
    print(f"Product {rp.product.prodName}: {existing_tasks.count()} tasks")
