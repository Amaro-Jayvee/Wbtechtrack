#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import Requests
from app.serializers import RequestReadSerializer
import json

# Get the latest request (ID 85 from test)
req = Requests.objects.get(RequestID=85)
print(f"Request ID: {req.RequestID}")
print(f"Products count in database: {req.request_products.count()}")

# Serialize and show response
serializer = RequestReadSerializer(req)
response_data = serializer.data

print("\nSerialized response (full):")
print(json.dumps(response_data, indent=2, default=str))

print("\n--- Products in Response ---")
if response_data.get('request_products'):
    for idx, product in enumerate(response_data['request_products']):
        print(f"Product {idx}: {product.get('product_name')} (Qty: {product.get('quantity')})")
else:
    print("No request_products in response!")
