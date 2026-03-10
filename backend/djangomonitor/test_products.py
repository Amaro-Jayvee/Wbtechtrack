#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import ProductName, ProcessTemplate, ProcessName

# Check what process templates exist
print("--- All ProductNames in Database ---")
for product in ProductName.objects.all():
    templates = ProcessTemplate.objects.filter(product_name=product)
    print(f"Product {product.ProdID}: {product.prodName}")
    if templates.exists():
        print(f"  Templates: {templates.count()}")
        for t in templates.order_by('step_order'):
            print(f"    - {t.process.name} (step {t.step_order})")
    else:
        print(f"  ❌ NO TEMPLATES")

print("\n--- All ProcessNames ---")
for proc in ProcessName.objects.all():
    print(f"  - {proc.name}")

print("\n--- Check Products 65 and 66 Specifically ---")
for prod_id in [65, 66]:
    try:
        prod = ProductName.objects.get(ProdID=prod_id)
        print(f"\nProduct {prod_id}: {prod.prodName}")
        templates = ProcessTemplate.objects.filter(product_name=prod)
        print(f"  Templates: {templates.count()}")
        for t in templates.order_by('step_order'):
            print(f"    - {t.process.name}")
    except ProductName.DoesNotExist:
        print(f"Product {prod_id}: NOT FOUND")
