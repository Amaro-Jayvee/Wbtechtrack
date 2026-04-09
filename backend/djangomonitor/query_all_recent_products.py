#!/usr/bin/env python
import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import Requests, RequestProduct, ProductName, ProcessTemplate
from django.db.models import Count, Q, Prefetch

# Define the date range (April 6-9, 2026)
start_date = datetime(2026, 4, 6).date()
end_date = datetime(2026, 4, 9).date()

print("=" * 100)
print("COMPREHENSIVE PRODUCT AND PROCESSTEMPLATES ANALYSIS FOR RECENT ORDERS")
print("=" * 100)

# Get recent requests
recent_requests = Requests.objects.filter(
    created_at__gte=start_date,
    created_at__lte=end_date
).order_by('-created_at')

# Collect all products from recent requests with their step counts
products_in_recent = {}

for req in recent_requests:
    for rp in req.request_products.all():
        prod_name = rp.product.prodName
        
        if prod_name not in products_in_recent:
            # Count steps in ProcessTemplate
            steps = ProcessTemplate.objects.filter(product_name=rp.product).order_by('step_order')
            step_count = steps.count()
            step_details = [(s.step_order, s.process.name) for s in steps]
            
            products_in_recent[prod_name] = {
                'product_id': rp.product.ProdID,
                'step_count': step_count,
                'step_details': step_details,
                'requests': []
            }
        
        products_in_recent[prod_name]['requests'].append(req.RequestID)

print(f"\n📊 ALL PRODUCTS IN RECENT REQUESTS (April 6-9, 2026): {len(products_in_recent)} unique products")
print("-" * 100)
print(f"{'Product Name':<35} {'Steps':<8} {'Requests':<50} {'Step Details':<20}")
print("-" * 100)

zero_step_prods = []
one_step_prods = []
multi_step_prods = []

for prod_name in sorted(products_in_recent.keys()):
    data = products_in_recent[prod_name]
    step_count = data['step_count']
    requests = ', '.join(str(r) for r in sorted(set(data['requests'])))
    step_info = ', '.join(f"{order}:{name}" for order, name in data['step_details']) if data['step_details'] else "NONE"
    
    if step_count == 0:
        icon = "⚠️"
        zero_step_prods.append(prod_name)
    elif step_count == 1:
        icon = "⚡"
        one_step_prods.append(prod_name)
    else:
        icon = "✅"
        multi_step_prods.append(prod_name)
    
    print(f"{prod_name:<35} {step_count:<8} {requests:<50} {step_info:<20}")

print("\n" + "=" * 100)
print("SUMMARY BY STEP COUNT")
print("=" * 100)

print(f"\n✅ MULTI-STEP PRODUCTS ({len(multi_step_prods)}):")
for p in sorted(multi_step_prods):
    step_count = products_in_recent[p]['step_count']
    print(f"  - {p} ({step_count} steps)")

print(f"\n⚡ SINGLE-STEP PRODUCTS ({len(one_step_prods)}):")
for p in sorted(one_step_prods):
    print(f"  - {p} (1 step)")

print(f"\n⚠️  UNCONFIGURED PRODUCTS - 0 STEPS ({len(zero_step_prods)}):")
for p in sorted(zero_step_prods):
    reqs = ', '.join(str(r) for r in sorted(set(products_in_recent[p]['requests'])))
    print(f"  - {p} (in requests: {reqs})")

# Cross-reference with test products
test_products = [
    'GUSSET T726',
    'PLATE 010',
    'CLAMP HOSE',
    'RUBBER MOUNT',
    'STAY MUFFLER',
    'BRACKET TANK 1694',
    'PIPE EXTENSION'
]

print("\n" + "=" * 100)
print("TEST PRODUCTS CROSS-REFERENCE")
print("=" * 100)

test_in_recent = []
test_not_in_recent = []

for tp in test_products:
    if tp in products_in_recent:
        test_in_recent.append(tp)
    else:
        test_not_in_recent.append(tp)

print(f"\n✅ Test products IN recent orders ({len(test_in_recent)}):")
for p in test_in_recent:
    data = products_in_recent[p]
    status = "0 steps" if data['step_count'] == 0 else f"{data['step_count']} steps"
    reqs = ', '.join(str(r) for r in sorted(set(data['requests'])))
    print(f"  - {p}: {status} (Request IDs: {reqs})")

print(f"\n❌ Test products NOT in recent orders ({len(test_not_in_recent)}):")
for p in test_not_in_recent:
    print(f"  - {p}")
