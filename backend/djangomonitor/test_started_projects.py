#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "djangomonitor.settings")
sys.path.insert(0, os.path.dirname(__file__))

django.setup()

from app.models import Requests, RequestProduct, ProductProcess

# Count started projects (have process_steps)
started_requests = Requests.objects.filter(
    request_products__process_steps__isnull=False
).distinct()

# Count non-started requests (no process_steps, not archived)
non_started_requests = Requests.objects.filter(
    archived_at__isnull=True
).exclude(
    request_products__process_steps__isnull=False
).distinct()

print("=" * 70)
print("REQUEST STATUS ANALYSIS")
print("=" * 70)
print(f"Started projects (have ProductProcess steps): {started_requests.count()}")
print(f"Non-started requests (available for starting): {non_started_requests.count()}")
print()

if non_started_requests.exists():
    print("Non-started requests that Production Manager can see:")
    print("-" * 70)
    for req in non_started_requests:
        product_count = req.request_products.count()
        print(f"  Request #{req.RequestID}: {product_count} product(s), deadline: {req.deadline}")
else:
    print("No non-started requests available.")

print()
if started_requests.exists():
    print("Started requests (should NOT appear in request list):")
    print("-" * 70)
    for req in started_requests:
        product_count = req.request_products.count()
        print(f"  Request #{req.RequestID}: {product_count} product(s)")
        for rp in req.request_products.all():
            steps = rp.process_steps.count()
            print(f"    - {rp.product.prodName} has {steps} process step(s)")
else:
    print("No started requests.")

print()
print("=" * 70)
