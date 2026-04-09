#!/usr/bin/env python
import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import Requests, RequestProduct, ProductName, ProcessTemplate
from django.db.models import Count, Q

# Define the date range (April 6-9, 2026)
start_date = datetime(2026, 4, 6).date()
end_date = datetime(2026, 4, 9).date()

print("=" * 80)
print(f"RECENT ORDERS ANALYSIS: {start_date} to {end_date}")
print("=" * 80)

# Get recent requests from April 6-9, 2026
recent_requests = Requests.objects.filter(
    created_at__gte=start_date,
    created_at__lte=end_date
).order_by('-created_at')

print(f"\n📊 RECENT REQUESTS: {recent_requests.count()} requests found")
print("-" * 80)

# Collect all products used in recent requests
products_in_recent_requests = set()
request_details = []

for req in recent_requests:
    products = req.request_products.all()
    product_names = [rp.product.prodName for rp in products]
    products_in_recent_requests.update(product_names)
    
    request_details.append({
        'request_id': req.RequestID,
        'created_at': req.created_at,
        'products': product_names,
        'status': req.request_status
    })
    print(f"Request #{req.RequestID} ({req.created_at}): {', '.join(product_names)}")

print(f"\n📦 UNIQUE PRODUCTS IN RECENT REQUESTS: {len(products_in_recent_requests)}")
for prod in sorted(products_in_recent_requests):
    print(f"  - {prod}")

# Now check the specific test products mentioned
test_products = [
    'GUSSET T726',
    'PLATE 010',
    'CLAMP HOSE',
    'RUBBER MOUNT',
    'STAY MUFFLER',
    'BRACKET TANK 1694',
    'PIPE EXTENSION'
]

print("\n" + "=" * 80)
print("SPECIFIC TEST PRODUCTS ANALYSIS")
print("=" * 80)

product_analysis = {}

for prod_name in test_products:
    try:
        product = ProductName.objects.get(prodName=prod_name)
        
        # Count ProcessTemplate steps
        steps = ProcessTemplate.objects.filter(product_name=product).order_by('step_order')
        step_count = steps.count()
        
        # Get step details
        step_details = []
        for step in steps:
            step_details.append({
                'order': step.step_order,
                'process': step.process.name
            })
        
        # Check if product appears in recent requests
        in_recent = prod_name in products_in_recent_requests
        
        product_analysis[prod_name] = {
            'step_count': step_count,
            'step_details': step_details,
            'in_recent_requests': in_recent,
            'found': True
        }
        
        status = "✅ IN RECENT ORDERS" if in_recent else "❌ Not in recent orders"
        print(f"\n{prod_name}")
        print(f"  Status: {status}")
        print(f"  Total Steps in ProcessTemplate: {step_count}")
        
        if step_count == 1:
            print(f"  ⚠️  WARNING: Only 1 step defined")
        elif step_count == 0:
            print(f"  ⚠️  NO STEPS defined")
        
        if step_details:
            print(f"  Steps:")
            for sd in step_details:
                print(f"    {sd['order']}. {sd['process']}")
    
    except ProductName.DoesNotExist:
        product_analysis[prod_name] = {'found': False, 'error': 'Product not found in database'}
        print(f"\n{prod_name}")
        print(f"  ❌ NOT FOUND in database")

# Summary table
print("\n" + "=" * 80)
print("SUMMARY TABLE")
print("=" * 80)
print(f"{'Product':<25} {'Steps':<8} {'In Recent Orders':<18} {'Issue':<15}")
print("-" * 80)

single_step_products = []
zero_step_products = []

for prod_name in test_products:
    analysis = product_analysis[prod_name]
    
    if not analysis.get('found'):
        print(f"{prod_name:<25} {'N/A':<8} {'N/A':<18} {'Not in DB':<15}")
        continue
    
    step_count = analysis['step_count']
    in_recent = "✅ Yes" if analysis['in_recent_requests'] else "No"
    
    issue = ""
    if step_count == 1:
        issue = "⚠️ 1 step only"
        single_step_products.append(prod_name)
    elif step_count == 0:
        issue = "⚠️ No steps"
        zero_step_products.append(prod_name)
    
    print(f"{prod_name:<25} {step_count:<8} {in_recent:<18} {issue:<15}")

# Final summary
print("\n" + "=" * 80)
print("FINDINGS")
print("=" * 80)

if zero_step_products:
    print(f"\n⚠️  PRODUCTS WITH 0 STEPS (no process template defined):")
    for p in zero_step_products:
        in_recent = "IN RECENT ORDERS" if product_analysis[p]['in_recent_requests'] else "not in recent"
        print(f"  - {p} ({in_recent})")

if single_step_products:
    print(f"\n⚠️  PRODUCTS WITH ONLY 1 STEP:")
    for p in single_step_products:
        in_recent = "IN RECENT ORDERS" if product_analysis[p]['in_recent_requests'] else "not in recent"
        print(f"  - {p} ({in_recent})")

if not zero_step_products and not single_step_products:
    print("\n✅ All test products have either multiple steps or are properly configured")

# Overall stats
print(f"\n📈 OVERALL STATISTICS:")
print(f"  - Total test products checked: {len(test_products)}")
print(f"  - Found in database: {sum(1 for p in test_products if product_analysis[p].get('found'))}")
print(f"  - Products in recent orders (April 6-9): {sum(1 for p in test_products if product_analysis[p].get('in_recent_requests'))}")
print(f"  - Products with 0 steps: {len(zero_step_products)}")
print(f"  - Products with 1 step: {len(single_step_products)}")
