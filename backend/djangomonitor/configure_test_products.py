#!/usr/bin/env python
"""
Configure test products with multiple manufacturing steps
This creates ProcessTemplate entries for test products like GUSSET T726, PLATE 010, etc.
Each test product gets 2-3 manufacturing steps instead of just a fallback single step.
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import ProductName, ProcessName, ProcessTemplate

# Define test products and their steps
TEST_PRODUCT_CONFIGS = {
    'GUSSET T726': [1, 2, 3],           # Cutting, Bending, Assembly
    'PLATE 010': [1, 2],                 # Cutting, Finishing
    'CLAMP HOSE': [1, 2, 3],            # Cutting, Bending, Assembly
    'STAY MUFFLER': [1, 2],             # Cutting, Welding
    'BRACKET TANK 1694': [1, 2, 3],    # Cutting, Bending, Assembly
    'PIPE EXTENSION': [1, 2],           # Cutting, Threading
    'RUBBER MOUNT': [1, 2],             # Cutting, Assembly
    'BLANK PIECE': [1, 2, 3],           # Cutting, Stamping, Finishing
}

def configure_test_products():
    """Configure test products with ProcessTemplate entries"""
    
    print("=== Configuring Test Products with Manufacturing Steps ===\n")
    
    for product_name, process_ids in TEST_PRODUCT_CONFIGS.items():
        try:
            # Get the product
            product = ProductName.objects.get(prodName=product_name)
            
            # Check if product already has templates
            existing_templates = ProcessTemplate.objects.filter(product_name=product)
            if existing_templates.exists():
                print(f"⚠️  {product_name}: Already has {existing_templates.count()} step(s)")
                existing_templates.delete()
                print(f"   Cleared existing steps, adding new ones...")
            
            # Create ProcessTemplate entries for this product
            for step_order, process_id in enumerate(process_ids, start=1):
                try:
                    process = ProcessName.objects.get(ProcessID=process_id)
                    template = ProcessTemplate.objects.create(
                        product_name=product,
                        process=process,
                        step_order=step_order
                    )
                    print(f"✓  {product_name} - Step {step_order}: {process.name}")
                except ProcessName.DoesNotExist:
                    print(f"✗  {product_name} - Step {step_order}: ProcessID {process_id} not found")
            
            print()
        
        except ProductName.DoesNotExist:
            print(f"✗  Product not found: {product_name}\n")
        except Exception as e:
            print(f"✗  Error configuring {product_name}: {str(e)}\n")
    
    print("=== Configuration Complete ===")
    print("\nSummary:")
    for product_name, process_ids in TEST_PRODUCT_CONFIGS.items():
        count = ProcessTemplate.objects.filter(product_name__prodName=product_name).count()
        print(f"  {product_name}: {count} step(s)")

if __name__ == '__main__':
    configure_test_products()
