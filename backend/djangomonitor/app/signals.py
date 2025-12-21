# from django.db.models.signals import m2m_changed
# from django.core.exceptions import ValidationError
# from django.dispatch import receiver
# from .models import ProductProcess, Worker

# @receiver(m2m_changed, sender=ProductProcess.workers.through)
# def enforce_worker_task_limit(sender, instance, action, reverse, model, pk_set, **kwargs):
#     if action == "pre_add":
#         for worker_id in pk_set:
#             worker = Worker.objects.get(pk=worker_id)
#             active_steps = ProductProcess.objects.filter(
#                 workers=worker,
#                 is_completed=False
#             ).exclude(pk=instance.pk)

#             if active_steps.count() >= 2:
#                 raise ValidationError(
#                     f"Worker {worker.FirstName} {worker.LastName} "
#                     f"is already assigned to 2 active tasks."
#                 )
