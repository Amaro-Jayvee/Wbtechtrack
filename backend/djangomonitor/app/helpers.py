# # helpers.py
# from .models import ProductProcess, ProcessProgress

# def update_process_with_log(product_process_id, new_quota, new_defects):
#     try:
#         product_process = ProductProcess.objects.get(id=product_process_id)
#     except ProductProcess.DoesNotExist:
#         return None

#     # Update snapshot
#     product_process.completed_quota = new_quota
#     product_process.defect_count = new_defects
#     product_process.save()

#     # Log history
#     ProcessProgress.objects.create(
#         product_process=product_process,
#         completed_quota=new_quota,
#         defect_count=new_defects
#     )

#     return product_process
