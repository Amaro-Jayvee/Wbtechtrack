#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import ProductProcess

print("--- All ProductProcess Tasks for Request 85 ---")
tasks = ProductProcess.objects.filter(request_product__request__RequestID=85).order_by('request_product_id', 'step_order')

product_groups = {}
for task in tasks:
    rp_id = task.request_product_id
    if rp_id not in product_groups:
        product_groups[rp_id] = {
            'product_name': task.request_product.product.prodName,
            'quantity': task.request_product.quantity,
            'tasks': []
        }
    product_groups[rp_id]['tasks'].append({
        'id': task.id,
        'process': task.process.name,
        'step': task.step_order
    })

for rp_id in sorted(product_groups.keys()):
    info = product_groups[rp_id]
    print(f"\n📦 Product: {info['product_name']} (Qty: {info['quantity']})")
    print(f"   Tasks: {len(info['tasks'])}")
    for task in info['tasks']:
        print(f"   ✓ Step {task['step']}: {task['process']}")

print(f"\n\n✅ TOTAL TASKS CREATED: {len(tasks)}")
print(f"✅ PRODUCTS WITH TASKS: {len(product_groups)}")
