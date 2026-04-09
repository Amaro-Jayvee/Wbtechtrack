#!/usr/bin/env python
"""
Query the database to find product and process template information
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import ProductName, ProcessTemplate
from django.db.models import Count

print("\n" + "="*70)
print("PRODUCT AND PROCESS TEMPLATE ANALYSIS")
print("="*70)

# 1. Total ProductName entries
total_products = ProductName.objects.count()
print(f"\n1. TOTAL PRODUCTS: {total_products}")

# 2. Total ProcessTemplate entries
total_templates = ProcessTemplate.objects.count()
print(f"2. TOTAL PROCESS TEMPLATES: {total_templates}")

# 3. Analyze products by number of steps
print(f"\n3. PRODUCTS BY NUMBER OF STEPS:")
print("-" * 70)

# Get count of steps per product
products_with_steps = ProductName.objects.annotate(
    step_count=Count('processtemplate')
).order_by('-step_count', 'prodName')

# Summary statistics
step_distribution = {}
multi_step_products = []
single_step_products = []

for product in products_with_steps:
    step_count = product.step_count
    
    # Track distribution
    if step_count not in step_distribution:
        step_distribution[step_count] = []
    step_distribution[step_count].append((product.prodName, step_count))
    
    # Categorize
    if step_count > 1:
        multi_step_products.append((product.prodName, step_count))
    elif step_count == 1:
        single_step_products.append(product.prodName)

# Print distribution
print(f"\nStep distribution:")
for steps in sorted(step_distribution.keys(), reverse=True):
    count = len(step_distribution[steps])
    print(f"  • {steps} step(s): {count} product(s)")

# Print single vs multi step summary
num_single = len(single_step_products)
num_multi = len(multi_step_products)
num_no_steps = total_products - num_single - num_multi

print(f"\nSummary:")
print(f"  • Products with 1 step: {num_single}")
print(f"  • Products with multiple steps: {num_multi}")
print(f"  • Products with no steps: {num_no_steps}")

# 4. List products with multiple steps
if multi_step_products:
    print(f"\n4. PRODUCTS WITH MULTIPLE STEPS:")
    print("-" * 70)
    for prod_name, step_count in sorted(multi_step_products, key=lambda x: -x[1]):
        print(f"  • {prod_name}: {step_count} steps")

# 5. List products with single step
if single_step_products:
    print(f"\n5. PRODUCTS WITH SINGLE STEP ({len(single_step_products)} total):")
    print("-" * 70)
    if len(single_step_products) > 10:
        print(f"  (Showing first 10 of {len(single_step_products)})")
        for prod_name in single_step_products[:10]:
            print(f"  • {prod_name}")
        print(f"  ... and {len(single_step_products) - 10} more")
    else:
        for prod_name in single_step_products:
            print(f"  • {prod_name}")

# 6. Products with no steps
products_no_steps = ProductName.objects.filter(processtemplate__isnull=True)
if products_no_steps.exists():
    print(f"\n6. PRODUCTS WITH NO STEPS ({products_no_steps.count()} total):")
    print("-" * 70)
    for product in products_no_steps[:10]:
        print(f"  • {product.prodName}")
    if products_no_steps.count() > 10:
        print(f"  ... and {products_no_steps.count() - 10} more")

# 7. Detailed product-process relationships
print(f"\n7. DETAILED PRODUCT-PROCESS RELATIONSHIPS:")
print("-" * 70)
for product in products_with_steps[:20]:  # Show first 20
    if product.step_count > 0:
        templates = ProcessTemplate.objects.filter(product_name=product).order_by('step_order')
        print(f"\n  {product.prodName} ({product.step_count} steps):")
        for template in templates:
            print(f"    Step {template.step_order}: {template.process.name}")

print("\n" + "="*70 + "\n")
