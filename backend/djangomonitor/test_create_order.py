#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.contrib.auth.models import User
from app.models import Requests, RequestProduct, ProductName
from app.serializers import RequestSerializer
from rest_framework.test import APIRequestFactory

# Get admin user
admin_user = User.objects.get(username='admin_user')

# Create a test request factory
factory = APIRequestFactory()

# Create a mock request object
mock_request = factory.post('/app/admin/create-request/')
mock_request.user = admin_user

# Prepare test data
test_data = {
    'requester': 17,  # Jayvee Amar's ID
    'deadline': '2026-03-20',
    'request_products': [
        {
            'product': 65,
            'quantity': 1000,
            'deadline_extension': None,
            'extension_status': 'pending'
        },
        {
            'product': 66,
            'quantity': 230,
            'deadline_extension': None,
            'extension_status': 'pending'
        }
    ]
}

print("Test Data:")
print(json.dumps(test_data, indent=2))

# Test the serializer
print("\n--- Testing RequestSerializer ---")
serializer = RequestSerializer(data=test_data, context={'request': mock_request})

if serializer.is_valid():
    print("✓ Serializer is valid")
    print("\nValid data fields:")
    for field, value in serializer.validated_data.items():
        if field == 'request_products':
            print(f"  {field}: {len(value)} products")
            for idx, prod in enumerate(value):
                print(f"    Product {idx}: {prod}")
        else:
            print(f"  {field}: {value}")
    
    # Save and check database
    new_request = serializer.save()
    print(f"\n✓ Request created with ID: {new_request.RequestID}")
    
    # Check what was saved to database
    print(f"✓ Products in database: {new_request.request_products.count()}")
    for rp in new_request.request_products.all():
        print(f"  - ID: {rp.id}, Product: {rp.product_id}, Qty: {rp.quantity}")
else:
    print("✗ Serializer validation failed:")
    print(json.dumps(serializer.errors, indent=2, default=str))
