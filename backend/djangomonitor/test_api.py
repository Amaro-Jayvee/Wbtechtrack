#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import Requests, RequestProduct
from app.serializers import RequestReadSerializer
import json

# Get the latest request
try:
    req = Requests.objects.latest('RequestID')
    print(f"Request ID: {req.RequestID}")
    print(f"Products count: {req.request_products.count()}")
    
    # Check request products
    print("\nRequest Products in Database:")
    for rp in req.request_products.all():
        print(f"  - ID: {rp.id}, Product: {rp.product}, Qty: {rp.quantity}")
    
    # Serialize and show response
    serializer = RequestReadSerializer(req)
    print("\nSerialized response:")
    print(json.dumps(serializer.data, indent=2, default=str))
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
