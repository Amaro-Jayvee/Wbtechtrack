import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from app.models import Requests

print("\n" + "="*70)
print("TOTAL REQUESTS IN DATABASE")
print("="*70)

all_requests = Requests.objects.filter(archived_at__isnull=True)
print(f"Total non-archived requests: {all_requests.count()}")

if all_requests.count() > 0:
    print("\nRequest Details:")
    for req in all_requests[:5]:
        creator = req.created_by.username if req.created_by else "None"
        print(f"  - Request #{req.RequestID}: Created by {creator}, Deadline: {req.deadline}")

print("\n" + "="*70)
print("PRODUCTION MANAGER SHOULD NOW SEE ALL OF THESE")
print("="*70)
