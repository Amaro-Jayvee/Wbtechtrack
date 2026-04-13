#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import ProductName, ProcessName, ProcessTemplate

print("=" * 80)
print("IMPORTING PRODUCTS WITH PROCESS WORKFLOWS")
print("=" * 80)

# Product data from the files: PART_NAME -> [(PROCESS, RATE_PER_HR), ...]
products_data = {
    # BARAKO
    "HOLDER 1647": [("Blanking", 876), ("Bending", 600)],
    "GUSSET 1725": [("Blanking", 415), ("Forming", 880)],
    "GUSSET 1726": [("Blanking", 660), ("Forming 1", 840), ("Forming 2", 606)],
    "PLATE 010": [("Blanking", 816), ("Bending", 850), ("Spotweld", 200)],
    "BRACKET MUFFLER 1697": [("Blanking", 790), ("Forming", 700)],
    "BRACKET TANK 1604": [("Blanking", 670), ("Forming", 1020)],
    "GUSSET HEAD PIPE 1714": [("Blanking", 1600), ("Forming", 1000)],
    "GUSSET HEAD PIPE 1707": [("Blanking", 750), ("Forming", 900)],
    "BRACKET 1995": [("Blanking", 490), ("Bending", 700), ("Chamfering", 600)],
    "BRACKET STAND 1486": [("Welding", 105), ("Cleaning", 276)],
    "HOOK 008": [("Blan/Draw", 1000)],
    "PLATE 1904": [("Blanking", 1420)],
    "GUSSET 1978/1979": [("Blanking", 660), ("Piercing", 800), ("Forming", 910), ("Nutweld", 120), ("Fullweld", 280), ("Retapping", 144)],
    "BRACKET FENDER 1971": [("Blanking", 1130), ("Forming", 674)],
    
    # ISUZU
    "BRACKET STEERING STOPPER": [("Blank/Pierce", 500), ("Forming", 476), ("Nutweld", 200), ("Welding", 110), ("Retapping", 240)],
    "REINFORCE 9680": [("Blanking", 1800), ("Cleaning", 200)],
    
    # OTHERS
    "BRASS PLATE 50/60": [("Blank/Pierce", 330)],
    "BRASS PLATE 36/89": [("Blank/Pierce", 330)],
    "TUBE FEEDER CLAMP": [("Blanking", 400), ("Forming", 500)],
    "PAINT PANEL": [("Blanking", 500)],
    "AEROHOOK NET": [("Blanking", 300)],
    
    # FURY
    "BRACKET 0060": [("Blanking", 460), ("Forming", 460)],
    "BRACKET 0081": [("Blanking", 350), ("Forming 1", 600), ("Forming 2", 338), ("Forming 1", 600), ("Piercing", 620), ("Forming 2", 338)],
    "WASHER 0453": [("Blank/Pierce", 1400), ("Welding 2", 50)],
    "BRACKET SHOCK ABSORBER 0148": [("Welding 2", 50), ("Cleaning", 75)],
    "BRACKET FENDER 0038/0039": [("Blanking", 840), ("Forming 1", 645), ("Forming 2", 550), ("Spotweld", 1400), ("Retapping", 558), ("Blanking", 753), ("Rework", 753), ("Rework", 630), ("Blanking", 1705), ("Forming", 780)],
    "BRACKET 0159": [("Blanking", 1400), ("Forming", 880), ("Piercing", 600)],
    "BRACKET 0273": [("Blanking", 1705), ("Rework", 630), ("Blanking", 1705), ("Forming", 780), ("Blanking", 1400), ("Marking", 501), ("Forming 1", 480), ("Forming 2", 1400)],
    "GUIDE CHAIN 0177": [("Blanking", 1550), ("Forming", 1880)],
    "PLATE REINFORCE 0461": [("Blanking", 1365), ("Forming", 1150)],
    "PLATE REINFORCE 0463": [("Blanking", 1650), ("Forming", 740)],
    "CLAMP 0147": [("Blanking", 1420), ("Forming", 740)],
    "GUSSET 0609/0610": [("Blanking", 1500), ("Marking", 501), ("Forming 1", 480), ("Forming 2", 1400)],
    "PLATE REINFORCE 0608": [("Blanking", 1550), ("Forming", 1400)],
    "CLAMP 1480": [("Blanking", 1550), ("Forming", 660)],
    "PLATE REINFORCE 0627": [("Blanking", 2040), ("Forming", 810)],
    "GUARD 0497": [("Blanking", 1200), ("Forming", 720), ("Piercing", 650), ("Cutting", 570), ("Forming 2", 630)],
    
    # YUTAKA
    "STAY A PROTECTOR": [("Blanking", 1200), ("Forming", 750), ("Spotweld", 624), ("Retapping", 236)],
    "STAY A MUFFLER": [("Blanking", 610), ("Forming 1", 950), ("Forming 2", 550), ("Blanking", 659), ("Forming", 744), ("Spotweld", 195), ("Piercing", 753)],
    "STAY B MUFFLER": [("Blanking", 610), ("Forming 1", 950), ("Forming 2", 550)],
    "STAY MUFFLER COMPONENTS": [("Blanking", 659), ("Forming", 744), ("Spotweld", 195), ("Piercing", 753)],
}

# Step 1: Collect all unique processes
all_processes = set()
for product, processes in products_data.items():
    for process_name, rate in processes:
        all_processes.add(process_name)

print(f"\n📋 Found {len(all_processes)} unique processes:")
for process in sorted(all_processes):
    print(f"   - {process}")

# Step 2: Create ProcessName entries
print(f"\n⏳ Creating ProcessName entries...")
process_objects = {}
for process_name in sorted(all_processes):
    process_obj, created = ProcessName.objects.get_or_create(name=process_name)
    process_objects[process_name] = process_obj
    if created:
        print(f"   ✅ Created: {process_name}")
    else:
        print(f"   ⏭️  Exists: {process_name}")

# Step 3: Create ProductName and ProcessTemplate entries
print(f"\n⏳ Creating products and their process workflows...")
products_created = 0
templates_created = 0

for product_name, processes in sorted(products_data.items()):
    # Create ProductName
    product_obj, created = ProductName.objects.get_or_create(prodName=product_name)
    if created:
        print(f"   ✅ Product: {product_name}")
        products_created += 1
    else:
        print(f"   ⏭️  Product exists: {product_name}")
    
    # Create ProcessTemplate entries
    for step_order, (process_name, rate_per_hr) in enumerate(processes, 1):
        process_obj = process_objects[process_name]
        template, template_created = ProcessTemplate.objects.get_or_create(
            product_name=product_obj,
            process=process_obj,
            defaults={
                'step_order': step_order,
                'custom_name': f"{process_name} (Rate: {rate_per_hr}/hr)"
            }
        )
        if template_created:
            templates_created += 1

# Step 4: Summary
print("\n" + "=" * 80)
print("📊 IMPORT SUMMARY")
print("=" * 80)
print(f"✅ Total Products: {ProductName.objects.count()}")
print(f"✅ Total Processes: {ProcessName.objects.count()}")
print(f"✅ Total Process Templates: {ProcessTemplate.objects.count()}")
print(f"✅ Products Created: {products_created}")
print(f"✅ Templates Created: {templates_created}")
print("=" * 80)
print("\n✅ Products imported with all process workflows!")
print("   You can now create purchase orders with proper step sequences.")
