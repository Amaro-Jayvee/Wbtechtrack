#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import RequestProduct, Employees, ProductProcess
from app.serializers import ProductProcessSerializer
from views import get_tasks

# Get Issuance #64
try:
    request = None
    from app.models import Request
    requests = Request.objects.filter(RequestID=64)
    if requests.exists():
        request = requests.first()
        print(f"\nFound Request: {request.RequestID}")
        
        # Get the production manager
        pm = Employees.objects.filter(role='Production Manager').first()
        if pm:
            print(f"Production Manager: {pm.FirstName} {pm.LastName}")
            
            # Get the tasks for this PM
            tasks = get_tasks(pm)
            
            print(f"\nProduction Manager Tasks containing RequestID 64:")
            for task in tasks:
                if task.get('request_id') == 64:
                    print(f"  Task: {task.get('product_name')}")
                    print(f"  Progress: {task.get('progress')}%")
        
        # Also get from ProductProcess directly
        print(f"\nProductProcess steps for Issuance #64:")
        products = RequestProduct.objects.filter(request_id=request.id)
        for product in products:
            for step in product.process_steps.all().order_by('step_order'):
                serializer = ProductProcessSerializer(step)
                print(f"  Step {step.step_order}: {step.task_description}, Progress: {serializer.data.get('progress')}")
    else:
        print('No request found for RequestID=64')
except Exception as e:
    import traceback
    print(f'Error: {e}')
    traceback.print_exc()
