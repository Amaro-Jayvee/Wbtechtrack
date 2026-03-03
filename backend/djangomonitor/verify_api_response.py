"""
Quick verification that the API returns correct process_number and process_name
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import ProductProcess
from app.serializers import ProductProcessSerializer

# Get a few ProductProcess records
processes = ProductProcess.objects.all()[:3]

print("Sample ProductProcess records as returned by API:\n")
for pp in processes:
    serializer = ProductProcessSerializer(pp)
    data = serializer.data
    print(f"Task ID: {data['id']}")
    print(f"  Process Number: {data.get('process_number', 'NOT SET')}")
    print(f"  Process Name: {data.get('process_name', 'NOT SET')}")
    print(f"  Full Process Object: {data.get('process', 'NOT SET')}")
    print()
