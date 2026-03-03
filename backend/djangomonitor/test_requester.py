#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import ProductProcess, Requests
from app.serializers import ProductProcessSerializer

print(f"ProductProcess count: {ProductProcess.objects.count()}")
print(f"Requests count: {Requests.objects.count()}")

# Get all requests
requests = Requests.objects.all()
for req in requests[:5]:
    print(f"Request {req.RequestID}: requester={req.requester}, created_by={req.created_by}")

# Get all product processes with request info
steps = ProductProcess.objects.all()
print(f"\nFirst 3 ProductProcess records:")
for step in steps[:3]:
    if step.request_product:
        req = step.request_product.request
        print(f"Step {step.id}: request_id={req.RequestID}, requester={req.requester}, created_by={req.created_by}")
        
        # Try to serialize it
        serializer = ProductProcessSerializer(step)
        print(f"  Serialized requester_name: {serializer.data.get('requester_name')}")
