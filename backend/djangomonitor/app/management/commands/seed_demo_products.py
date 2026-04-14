from django.core.management.base import BaseCommand
from app.models import ProductName, ProcessName, ProcessTemplate


PRODUCTS_DATA = {
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
    "BRACKET 0081": [("Blanking", 350), ("Forming 1", 600), ("Piercing", 620), ("Forming 2", 338)],
    "WASHER 0453": [("Blank/Pierce", 1400), ("Welding 2", 50)],
    "BRACKET SHOCK ABSORBER 0148": [("Welding 1", 50), ("Welding 2", 50), ("Cleaning", 75)],
    "BRACKET FENDER 0038/0039": [("Blanking", 840), ("Forming 1", 648), ("Forming 2", 550), ("Spotweld", 1400), ("Retapping", 250)],
    "BRACKET 0199": [("Blanking", 793), ("Forming", 950), ("Rework", 620)],
    "BRACKET 0573": [("Blanking", 1785), ("Forming", 780)],
    "GUIDE CHAIN 0177": [("Blanking", 1400), ("Forming", 880), ("Piercing", 690)],
    "PLATE REINFORCE 0461": [("Blanking", 1365)],
    "PLATE REINFORCE 0463": [("Blanking", 1150)],
    "CLAMP 0147": [("Blanking", 1650), ("Forming", 740)],
    "GUSSET 0609/0610": [("Blanking", 1500), ("Marking", 500), ("Forming", 480)],
    "PLATE REINFORCE 0608": [("Blanking", 1400)],
    "CLAMP 1480": [("Blanking", 1550), ("Forming", 660)],
    "PLATE REINFORCE 0627": [("Blanking", 2040), ("Marking", 810)],
    "GUARD 0497": [("Blanking", 1200), ("Emboss/Form", 720), ("Piercing", 650), ("Coining", 570), ("Forming 2", 630)],

    # YUTAKA
    "STAY A PROTECTOR": [("Blanking", 1200), ("Forming", 750), ("Spotweld", 624), ("Retapping", 236)],
    "STAY A MUFFLER": [("Blanking", 610), ("Forming 1", 950), ("Forming 2", 550)],
    "STAY B MUFFLER": [("Blanking", 659), ("Forming", 744)],
    "STAY MUFFLER COMPONENTS": [("Spotweld", 195), ("Piercing", 753)],
}


class Command(BaseCommand):
    help = "Seed demo/customer products with process templates (idempotent)"

    def handle(self, *args, **options):
        all_processes = sorted({pname for plist in PRODUCTS_DATA.values() for pname, _ in plist})

        process_map = {}
        created_processes = 0
        for process_name in all_processes:
            process_obj, created = ProcessName.objects.get_or_create(name=process_name)
            process_map[process_name] = process_obj
            if created:
                created_processes += 1

        created_products = 0
        created_templates = 0

        for product_name, processes in PRODUCTS_DATA.items():
            product_obj, product_created = ProductName.objects.get_or_create(prodName=product_name)
            if product_created:
                created_products += 1

            for step_order, (process_name, rate_per_hr) in enumerate(processes, start=1):
                process_obj = process_map[process_name]
                template, template_created = ProcessTemplate.objects.get_or_create(
                    product_name=product_obj,
                    process=process_obj,
                    defaults={
                        "step_order": step_order,
                        "custom_name": f"{process_name} (Rate: {rate_per_hr}/hr)",
                    },
                )
                if template_created:
                    created_templates += 1
                else:
                    # Keep step order/custom name aligned if template already exists
                    changed = False
                    if template.step_order != step_order:
                        template.step_order = step_order
                        changed = True
                    desired_name = f"{process_name} (Rate: {rate_per_hr}/hr)"
                    if template.custom_name != desired_name:
                        template.custom_name = desired_name
                        changed = True
                    if changed:
                        template.save(update_fields=["step_order", "custom_name"])

        self.stdout.write(self.style.SUCCESS(
            f"[seed_demo_products] done | products_created={created_products} "
            f"processes_created={created_processes} templates_created={created_templates} "
            f"totals: products={ProductName.objects.count()} processes={ProcessName.objects.count()} templates={ProcessTemplate.objects.count()}"
        ))
