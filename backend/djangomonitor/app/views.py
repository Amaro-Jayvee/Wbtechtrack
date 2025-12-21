from django.shortcuts import render

#Instead of JSON, JsonParser can be used to parse the incoming data
# Create your views here.
# import json
from rest_framework.parsers import JSONParser
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from django.contrib.auth import views as auth_views
from django.contrib.auth.decorators import login_required
# from .permissions import manager_or_admin_required
# from django.contrib.auth.views import (
#     PasswordResetView,
#     PasswordResetDoneView,
#     PasswordResetConfirmView,
#     PasswordResetCompleteView
# )

from app.models import *
from app.serializers import *

# from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
# from django.utils.encoding import force_bytes, force_str
# from django.contrib.auth.tokens import default_token_generator
# from django.core.mail import send_mail

# from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from datetime import date
from django.utils.timezone import now
from django.db.models.functions import TruncDate
# from functools import wraps
from .permissions import role_required
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import F
from django.db.models import Sum, Q
import datetime
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
import json
import csv
from django.http import HttpResponse
from openpyxl import Workbook
import calendar
from django.db.models import Max

signer = TimestampSigner()

@csrf_exempt
@require_POST
def register_customer(request):
    data = JSONParser().parse(request)
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    full_name = data.get("full_name")
    company_name = data.get("company_name")
    contact_number = data.get("contact_number")

    if not all([username, password, email, full_name, company_name, contact_number]):
        return JsonResponse({"detail": "All fields are required"}, status=400)
    
    if User.objects.filter(username=username).exists():
        return JsonResponse({"detail": "Username already taken"}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email)
    UserProfile.objects.create(
        user=user,
        full_name=full_name,
        company_name=company_name,
        contact_number=contact_number,
        role=Roles.CUSTOMER, # default role
    )

    return JsonResponse({"detail": "Account created. Awaiting manager approval."}, status=201)

@csrf_exempt
@require_POST
def register_manager(request):
    data = JSONParser().parse(request)
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    full_name = data.get("full_name")
    company_name = data.get("company_name")
    contact_number = data.get("contact_number")

    if not all([username, password, email, full_name, company_name, contact_number]):
        return JsonResponse({"detail": "All fields are required"}, status=400)
    
    if User.objects.filter(username=username).exists():
        return JsonResponse({"detail": "Username already taken"}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email)
    UserProfile.objects.create(
        user=user,
        full_name=full_name,
        company_name=company_name,
        contact_number=contact_number,
        role=Roles.MANAGER,
        is_verified=True,              
        verified_at=timezone.now()    
    )

    return JsonResponse({"detail": "Manager account created."}, status=201)


@csrf_exempt
@require_POST
def login_view(request):
    data = JSONParser().parse(request)
    username = data.get("username")
    # email = data.get("email")
    password = data.get("password")
    auto_logout = data.get("autoLogout", False)

    if username is None or password is None:
        return JsonResponse({"detail": "Please provide username and password"}, status=400)

    user = authenticate(username=username, password=password)
    if user is None:
        return JsonResponse({"detail":"Invalid credentials"}, status=400)

    profile = getattr(user, 'userprofile', None)
    if profile and not profile.is_verified:
        return JsonResponse({"detail": "Account not yet verified"}, status=403)

    login(request, user)

    if profile and profile.role in [Roles.ADMIN, Roles.MANAGER]:
        request.session.set_expiry(30 * 60)
    else:
        request.session.set_expiry(0)

    return JsonResponse({"detail": "Successfully logged in"}, status=200)

@csrf_protect
def logout_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "You are not logged in"}, status=400)
        
    logout(request)
    return JsonResponse({"detail": "Successfully logged out"}, status=204)

@ensure_csrf_cookie
def session_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"isAuthenticated": False})
    return JsonResponse({"isAuthenticated": True})

@csrf_protect
def whoami_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"isAuthenticated": False})
    return JsonResponse({"username":request.user.username})

@role_required('admin', 'manager')
@csrf_exempt
def workerAPI(request, id=0):
    if request.method == 'GET':
        workers = Worker.objects.all()
        workers_serializer = WorkerSerializer(workers, many=True)
        return JsonResponse(workers_serializer.data, safe=False)
    
    elif request.method == 'POST':
        worker_data = JSONParser().parse(request)
        workers_serializer = WorkerSerializer(data=worker_data)
        if workers_serializer.is_valid():
            workers_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'PUT':
        worker_data = JSONParser().parse(request)
        worker = get_object_or_404(Worker, WorkerID=worker_data['WorkerID'])
        workers_serializer = WorkerSerializer(worker, data=worker_data)
        if workers_serializer.is_valid():
            workers_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)

    elif request.method == 'PATCH':
        worker_data = JSONParser().parse(request)
        worker = get_object_or_404(Worker, WorkerID=worker_data['WorkerID'])
        workers_serializer = WorkerSerializer(worker, data=worker_data, partial=True)
        if workers_serializer.is_valid():
            workers_serializer.save()
            return JsonResponse("Patched successfully!", safe=False)
        return JsonResponse("Failed to patch", safe=False)    

    elif request.method == 'DELETE':
        worker = get_object_or_404(Worker, WorkerID=id)
        worker.delete()
        return JsonResponse("Deleted successfully!", safe=False)


@role_required('admin', 'manager')
@csrf_exempt
@require_POST
def verify_customer(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    # profile = getattr(request.user, 'userprofile', None)
    # if not profile or profile.role not in [Roles.MANAGER, Roles.ADMIN]:
    #     return JsonResponse({"detail": "Access denied. Manager/Admin role required."}, status=403)
    
    data = JSONParser().parse(request)
    username = data.get("username")

    if not username:
        return JsonResponse({"detail": "Username is required"}, status=400)

    try:
        target_profile = UserProfile.objects.get(user__username=username)

        if target_profile.is_verified:
            return JsonResponse({
                "detail": f"User '{username}' is already verified.",
                "verified_at": target_profile.verified_at
            })

        target_profile.is_verified = True
        target_profile.verified_at = timezone.now()
        target_profile.save()

        recipient_email = target_profile.user.email
        if not recipient_email or '@' not in recipient_email:
            return JsonResponse({"detail": "User email is invalid or missing"}, status=400)

        sent = send_mail(
            subject="Your Account Is Now Verified",
            message=f"Hi {target_profile.full_name},\n\nYour account has been approved by the manager.",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[recipient_email],
            fail_silently=False
        )
        return JsonResponse({
            "detail": f"Account for {username} has been verified and notified.",
            "verified_at": target_profile.verified_at,
            "email_sent": bool(sent)
        }, status=200)

    except UserProfile.DoesNotExist:
        return JsonResponse({"detail": "User not found"}, status=404)

# @role_required('admin', 'manager')
# @csrf_exempt
# def requestAPI(request, id=0):
#     if request.method == 'GET':
#         requests = Requests.objects.all()
#         request_serializer = RequestSerializer(requests, many=True)
#         return JsonResponse(request_serializer.data, safe=False)

#     elif request.method == 'PATCH':
#         request_data = JSONParser().parse(request)
#         try:
#             request_instance = Requests.objects.get(RequestID=id)
#         except Requests.DoesNotExist:
#             return JsonResponse({"error": "Request not found"}, status=404)

#         old_snapshot = RequestSerializer(request_instance).data

#         request_serializer = RequestSerializer(
#             request_instance,
#             data=request_data,
#             partial=True,
#             context={'request': request}
#         )
#         if request_serializer.is_valid():
#             updated_instance = request_serializer.save()

#             # Audit log entry
#             AuditLog.objects.create(
#                 request=updated_instance,
#                 action_type="update",
#                 old_value=json.dumps(old_snapshot),
#                 new_value=json.dumps(request_serializer.data),
#                 performed_by=request.user
#             )

#             return JsonResponse({"message": "Updated successfully!"}, status=200)
#         return JsonResponse(request_serializer.errors, status=400)

#     elif request.method == 'POST':
#         request_data = JSONParser().parse(request)
#         request_serializer = RequestSerializer(data=request_data, context={'request': request})
#         if request_serializer.is_valid():
#             new_request = request_serializer.save()

#             # Audit log entry
#             AuditLog.objects.create(
#                 request=new_request,
#                 action_type="create",
#                 new_value=json.dumps(request_serializer.data),
#                 performed_by=request.user
#             )

#             return JsonResponse({"message": "Added successfully!"}, status=201)
#         return JsonResponse({"error": "Failed to add"}, status=400)

#     elif request.method == 'DELETE':
#         try:
#             request_instance = Requests.objects.get(RequestID=id)
#         except Requests.DoesNotExist:
#             return JsonResponse({"error": "Request not found"}, status=404)

#         old_snapshot = RequestSerializer(request_instance).data

#         request_instance.archived_at = timezone.now()
#         request_instance.save()

#         AuditLog.objects.create(
#             request=request_instance,
#             action_type="delete",
#             old_value=json.dumps(old_snapshot),
#             new_value=json.dumps(RequestSerializer(request_instance).data),
#             performed_by=request.user
#         )

#         return JsonResponse({"message": "Deleted successfully!"}, status=200)

@role_required('admin', 'manager')
@csrf_exempt
def requestAPI(request, id=0):
    if request.method == 'GET':
        include_archived = request.GET.get("include_archived", "false").lower() == "true"
        requests = Requests.objects.all() if include_archived else Requests.objects.filter(archived_at__isnull=True)

        # 👉 Apply filters with proper date parsing
        created_from = request.GET.get("created_from")
        created_to = request.GET.get("created_to")
        deadline_from = request.GET.get("deadline_from")
        deadline_to = request.GET.get("deadline_to")

        if created_from:
            try:
                created_from_date = datetime.datetime.strptime(created_from, "%Y-%m-%d").date()
                requests = requests.filter(created_at__gte=created_from_date)
            except ValueError:
                pass

        if created_to:
            try:
                created_to_date = datetime.datetime.strptime(created_to, "%Y-%m-%d").date()
                requests = requests.filter(created_at__lte=created_to_date)
            except ValueError:
                pass

        if deadline_from:
            try:
                deadline_from_date = datetime.datetime.strptime(deadline_from, "%Y-%m-%d").date()
                requests = requests.filter(deadline__gte=deadline_from_date)
            except ValueError:
                pass

        if deadline_to:
            try:
                deadline_to_date = datetime.datetime.strptime(deadline_to, "%Y-%m-%d").date()
                # 👉 inclusive so managers see requests due on that date too
                requests = requests.filter(deadline__lte=deadline_to_date)
            except ValueError:
                pass

        # 👉 Use the read-only serializer here
        serializer = RequestReadSerializer(requests.order_by('-created_at'), many=True)
        return JsonResponse(serializer.data, safe=False)

    elif request.method == 'PATCH':
        request_data = JSONParser().parse(request)
        try:
            request_instance = Requests.objects.get(RequestID=id)
        except Requests.DoesNotExist:
            return JsonResponse({"error": "Request not found"}, status=404)

        old_snapshot = RequestSerializer(request_instance).data

        serializer = RequestSerializer(
            request_instance,
            data=request_data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            updated_instance = serializer.save()

            AuditLog.objects.create(
                request=updated_instance,
                action_type="update",
                old_value=json.dumps(old_snapshot),
                new_value=json.dumps(serializer.data),
                performed_by=request.user
            )
            return JsonResponse({"message": "Updated successfully!"}, status=200)
        return JsonResponse(serializer.errors, status=400)

    elif request.method == 'POST':
        request_data = JSONParser().parse(request)

        serializer = RequestSerializer(data=request_data, context={'request': request})
        if serializer.is_valid():
            new_request = serializer.save()

            AuditLog.objects.create(
                request=new_request,
                action_type="create",
                new_value=json.dumps(serializer.data),
                performed_by=request.user
            )
            return JsonResponse({"message": "Added successfully!"}, status=201)
        return JsonResponse(serializer.errors, status=400)

    elif request.method == 'DELETE':
        try:
            request_instance = Requests.objects.get(RequestID=id)
        except Requests.DoesNotExist:
            return JsonResponse({"error": "Request not found"}, status=404)

        old_snapshot = RequestSerializer(request_instance).data
        request_instance.delete()

        AuditLog.objects.create(
            action_type="delete",
            old_value=json.dumps(old_snapshot),
            performed_by=request.user
        )
        return JsonResponse({"message": "Deleted successfully!"}, status=200)




@csrf_exempt
@role_required('admin')
def processAPI(request, id=0):
    if request.method == 'GET':
        processes = ProcessName.objects.all()
        process_serializer = ProcessSerializer(processes, many=True)
        return JsonResponse(process_serializer.data, safe=False)

    elif request.method == 'POST':
        process_data = JSONParser().parse(request)
        process_serializer = ProcessSerializer(data=process_data)
        if process_serializer.is_valid():
            process_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)

    elif request.method == 'PUT':
        process_data = JSONParser().parse(request)
        process = ProcessName.objects.get(ProcessID=process_data['ProcessID'])
        process_serializer = ProcessSerializer(process, data=process_data)
        if process_serializer.is_valid():
            process_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)

    elif request.method == 'PATCH':
        process_data = JSONParser().parse(request)
        process = ProcessName.objects.get(ProcessID=process_data['ProcessID'])
        process_serializer = ProcessSerializer(process, data=process_data, partial=True)
        if process_serializer.is_valid():
            process_serializer.save()
            return JsonResponse("Patched successfully!", safe=False)
        return JsonResponse("Failed to patch", safe=False)

    elif request.method == 'DELETE':
        process = get_object_or_404(ProcessName, ProcessID=id)
        process.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
@role_required('admin')
def productnameAPI(request, id=0):
    if request.method == 'GET':
        prodnames = ProductName.objects.all()
        prodname_serializer = ProductNameSerializer(prodnames, many=True)
        return JsonResponse(prodname_serializer.data, safe=False)

    elif request.method == 'POST':
        prodname_data = JSONParser().parse(request)
        prodname_serializer = ProductNameSerializer(data=prodname_data)
        if prodname_serializer.is_valid():
            prodname_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)

    elif request.method == 'PUT':
        prodname_data = JSONParser().parse(request)
        prodname = ProductName.objects.get(ProdID=prodname_data['ProdID'])
        prodname_serializer = ProductNameSerializer(prodname, data=prodname_data)
        if prodname_serializer.is_valid():
            prodname_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)

    elif request.method == 'PATCH':
        prodname_data = JSONParser().parse(request)
        prodname = ProductName.objects.get(ProdID=prodname_data['ProdID'])
        prodname_serializer = ProductNameSerializer(prodname, data=prodname_data, partial=True)
        if prodname_serializer.is_valid():
            prodname_serializer.save()
            return JsonResponse("Patched successfully!", safe=False)
        return JsonResponse("Failed to patch", safe=False)

    elif request.method == 'DELETE':
        prodname = get_object_or_404(ProductName, ProdID=id)
        prodname.delete()
        return JsonResponse("Deleted successfully!", safe=False)


# @csrf_exempt
# @role_required('admin', 'manager')
# def productProcessAPI(request, id=0):
#     if request.method == 'GET':
#         all_steps = ProductProcess.objects.all()
#         serializer = ProductProcessSerializer(all_steps, many=True)
#         return JsonResponse(serializer.data, safe=False)

#     # elif request.method == 'PATCH':
#     #     data = JSONParser().parse(request)
#     #     step = ProductProcess.objects.get(id=id)

#     #     request_instance = step.request_product.request
#     #     today = date.today()
#     #     deadline = request_instance.deadline

#     #     if today > deadline:
#     #         return JsonResponse("You cannot update quota/worker beyond the deadline.", safe=False, status=403)

#     #     if 'completed_quota' in data:
#     #         step.completed_quota = data['completed_quota']
#     #         step.save()
#     #         step.mark_completed_if_ready()

#     #     serializer = ProductProcessSerializer(step, data=data, partial=True)
#     #     if serializer.is_valid():
#     #         serializer.save()
#     #         return JsonResponse("Step updated sucessfully!", safe=False)
#     #     return JsonResponse(serializer.errors, status=400)

#     # elif request.method == 'PUT':
#     #     data = JSONParser().parse(request)
#     #     try:
#     #         step = ProductProcess.objects.get(id=id)
#     #     except ProductProcess.DoesNotExist:
#     #         return JsonResponse("Step not found", safe=False, status=404)

#     #     serializer = ProductProcessSerializer(step, data=data, partial=False)  # full replacement
#     #     if serializer.is_valid():
#     #         serializer.save()
#     #         return JsonResponse("Step updated successfully!", safe=False)
#     #     return JsonResponse(serializer.errors, status=400)

#     elif request.method == 'PATCH':
#         data = JSONParser().parse(request)
#         step = ProductProcess.objects.get(id=id)

#         request_product = step.request_product
#         request_instance = request_product.request
#         today = date.today()

#     #  Use global deadline + per-product extension if approved
#         base_deadline = request_instance.deadline
#         effective_deadline = (
#             request_product.deadline_extension
#             if request_product.deadline_extension and request_product.extension_status == "approved"
#             else base_deadline
#         )

#         if today > effective_deadline:
#             return JsonResponse(
#                 "You cannot update quota/worker beyond the deadline.",
#                 safe=False,
#                 status=403
#             )

#         if 'completed_quota' in data:
#             step.completed_quota = data['completed_quota']
#             step.save()
#             step.mark_completed_if_ready()

#         serializer = ProductProcessSerializer(step, data=data, partial=True)
#         if serializer.is_valid():
#             serializer.save()
#             return JsonResponse("Step updated successfully!", safe=False)
#         return JsonResponse(serializer.errors, status=400)

#     # Duplication check - For future request constraint
#         # existing_quota = ProductProcess.objects.annotate(
#         #     created_date=TruncDate("created_at")).filter(
#         #         request__product_name=product, created_date=today).exclude(pk=step.id).exists()
#         # return JsonResponse("Matched quota entries.,", safe=False)
#         # print("Matched quota entries:", existing_quota)
#         # if not step.is_completed and existing_quota.exists():
#         #     return JsonResponse("Quota already exists for today.", safe=False, status=403)

#     # Proceed with patch update
#         # serializer = ProductProcessSerializer(step, data=data, partial=True)

#         # if serializer.is_valid():
#         #     updated_step = serializer.save()
#         #     updated_step.mark_completed_if_ready()
#         #     return JsonResponse("Quota/Worker updated successfully!", safe=False)

#         # print("Serializer errors:", serializer.errors)
#         # return JsonResponse("Failed to add/update quota/worker.", safe=False)


#     elif request.method == 'POST':
#         data = JSONParser().parse(request)
        
#         serializer = ProductProcessSerializer(data=data)
#         if serializer.is_valid():
#             base_process = serializer.save()

#             # if base_process.worker and not base_process.worker.is_active:
#             #     return JsonResponse("Cannot assign inactive worker to process.", status=400)

#             product_name = base_process.request_product.product.prodName

#             templates = ProcessTemplate.objects.filter(product_name__prodName=product_name)

#             for template in templates:
#                 if ProductProcess.objects.filter(
#                     request_product=base_process.request_product, process=template.process
#                 ).exists():
#                     continue

#                 ProductProcess.objects.create(
#                     request_product=base_process.request_product,
#                     # worker=base_process.worker,
#                     process=template.process,
#                     step_order=template.step_order,
#                     production_date=base_process.production_date
#                     )

#             return JsonResponse("Fixed process steps assigned and initial step added!", safe=False)

#         # print("Serializer errors:", serializer.errors)
#         return JsonResponse(serializer.errors, status=400)

#     elif request.method == 'DELETE':
#         step = get_object_or_404(ProductProcess, id=id)
#         step.delete()
#         return JsonResponse("Step deleted successfully!", safe=False)

@csrf_exempt
@role_required('admin', 'manager')
def productProcessAPI(request, id=0):
    if request.method == 'GET':
        include_archived = request.GET.get("include_archived", "false").lower() == "true"

        if include_archived:
            all_steps = ProductProcess.objects.all()
        else:
            all_steps = ProductProcess.objects.filter(archived_at__isnull=True)

        serializer = ProductProcessSerializer(all_steps, many=True)
        return JsonResponse(serializer.data, safe=False)

    elif request.method == 'PATCH':
        data = JSONParser().parse(request)
        step = ProductProcess.objects.get(id=id)

        request_product = step.request_product
        request_instance = request_product.request
        today = date.today()

        # Use global deadline + per-product extension if approved
        base_deadline = request_instance.deadline
        effective_deadline = (
            request_product.deadline_extension
            if request_product.deadline_extension and request_product.extension_status == "approved"
            else base_deadline
        )

        if today > effective_deadline:
            return JsonResponse(
                {"error": "You cannot update quota/worker beyond the deadline."},
                status=403
            )

        old_snapshot = ProductProcessSerializer(step).data

        if 'completed_quota' in data:
            step.completed_quota = data['completed_quota']
            step.save()
            step.mark_completed_if_ready()

        serializer = ProductProcessSerializer(step, data=data, partial=True)
        if serializer.is_valid():
            updated_step = serializer.save()

            # Audit log entry
            AuditLog.objects.create(
                request=request_instance,
                request_product=request_product,
                action_type="update",
                old_value=json.dumps(old_snapshot),
                new_value=json.dumps(ProductProcessSerializer(updated_step).data),
                performed_by=request.user
            )

            return JsonResponse({"message": "Step updated successfully!"}, status=200)
        return JsonResponse(serializer.errors, status=400)

    elif request.method == 'POST':
        data = JSONParser().parse(request)
        request_product_id = data.get("request_product")
        production_date = data.get("production_date")

        if not request_product_id or not production_date:
            return JsonResponse({"error": "request_product and production_date are required"}, status=400)

        # Make sure the RequestProduct exists
        request_product = get_object_or_404(RequestProduct, id=request_product_id)
        product_name = request_product.product.prodName
        templates = ProcessTemplate.objects.filter(product_name__prodName=product_name)

        created_steps = []
        for template in templates:
            # Skip if already exists
            if ProductProcess.objects.filter(
                request_product=request_product,
                process=template.process
            ).exists():
                continue

            step = ProductProcess.objects.create(
                request_product=request_product,
                process=template.process,
                step_order=template.step_order,
                production_date=production_date
            )
            created_steps.append(ProductProcessSerializer(step).data)

        # Audit log entry
        AuditLog.objects.create(
            request=request_product.request,
            request_product=request_product,
            action_type="create",
            new_value=json.dumps(created_steps),
            performed_by=request.user
        )

        return JsonResponse({"message": "Process steps seeded from template!"}, status=201)

    elif request.method == 'DELETE':
        step = get_object_or_404(ProductProcess, id=id)
        old_snapshot = ProductProcessSerializer(step).data
        step.delete()

        # Audit log entry
        AuditLog.objects.create(
            request=step.request_product.request,
            request_product=step.request_product,
            action_type="delete",
            old_value=json.dumps(old_snapshot),
            performed_by=request.user
        )

        return JsonResponse({"message": "Step deleted successfully!"}, status=200)

@role_required('admin')
@csrf_exempt
def producttemplateAPI(request, id=0):
    if request.method == 'GET':
        prodtemp = ProcessTemplate.objects.all()
        prodtemp_serializer = ProcessTemplateSerializer(prodtemp, many=True)
        return JsonResponse(prodtemp_serializer.data, safe=False)

    elif request.method == 'POST':
        prodtemp_data = JSONParser().parse(request)
        prodtemp_serializer = ProcessTemplateSerializer(data=prodtemp_data)
        if prodtemp_serializer.is_valid():
            prodtemp_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)

    elif request.method == 'PUT':
        prodtemp_data = JSONParser().parse(request)
        prodtemp = ProcessTemplate.objects.get(id=prodtemp_data["id"])
        prodtemp_serializer = ProcessTemplateSerializer(prodtemp, data=prodtemp_data)
        if prodtemp_serializer.is_valid():
            prodtemp_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)

    elif request.method == 'DELETE':
        prodtemp = get_object_or_404(ProcessTemplate, id=id)
        prodtemp.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
@role_required('admin')
@require_http_methods(["DELETE"])
def delete_user(request, id):
    try:
        user = User.objects.get(pk=id)
        user.delete()
        return JsonResponse({"detail": f"User {id} deleted successfully."}, status=200)
    except User.DoesNotExist:
        return JsonResponse({"detail": "User not found."}, status=400)

@require_http_methods(["GET"])
def request_progress_view(request, pk):
    try:
        req = Requests.objects.get(pk=pk)
    except Requests.DoesNotExist:
        return JsonResponse({"details": "Request not found"}, status=404)

    serializer = RequestProgressSerializer(req)
    return JsonResponse(serializer.data, safe=False)

# @require_http_methods(['GET'])
# @role_required('customer')
# def customer_request_view(request):
#     user = request.user
#     requests_qs = Requests.objects.filter(requester=user)
#     serializer = CustomerRequestStatusSerializer(requests_qs, many=True)
#     return JsonResponse(serializer.data, safe=False)

@require_http_methods(['POST'])
@role_required('admin', 'manager')
def request_extension(request, id):
    request_product = RequestProduct.objects.get(id=id)

    #Parse JSON body safely
    try:
        body = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    new_deadline = body.get("new_deadline")
    if not new_deadline:
        return JsonResponse({"detail": "new_deadline is required"}, status=400)

    old_deadline = request_product.deadline_extension

    #Save extension request at RequestProduct level
    request_product.deadline_extension = new_deadline
    request_product.extension_status = "pending"
    request_product.requested_at = timezone.now()
    request_product.save()

    #Audit log entry
    AuditLog.objects.create(
        request=request_product.request,
        request_product=request_product,
        action_type="extension_request",
        old_value=str(old_deadline),
        new_value=str(new_deadline),
        performed_by=request.user
    )

    recipient_email = request_product.request.requester.email
    if not recipient_email or '@' not in recipient_email:
        return JsonResponse({"detail": "Customer email is invalid or missing"}, status=400)

    #Token based on RequestProduct ID
    token = signer.sign(str(request_product.id))
    approve_url = f"http://127.0.0.1:8000/app/request-product/{request_product.id}/approve-extension/?token={token}"
    reject_url = f"http://127.0.0.1:8000/app/request-product/{request_product.id}/reject-extension/?token={token}"

    sent = send_mail(
        subject="Deadline Extension Request",
        message=f"""
Hi {request_product.request.requester.get_full_name()},

A manager has requested to extend the deadline to {new_deadline}.
Please choose an action:

Approve: {approve_url}
Reject: {reject_url}
""",
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[recipient_email],
        fail_silently=False
    )

    return JsonResponse({
        "detail": f"Extension request for product {request_product.id} has been sent to customer.",
        "requested_at": request_product.requested_at,
        "email_sent": bool(sent)
    }, status=200)


@require_http_methods(['POST'])
@role_required('customer')
def approve_extension(request, id):
    token = request.GET.get("token")
    try:
        unsigned = signer.unsign(token, max_age=86400)  # 1 day validity
        if unsigned != str(id):
            return JsonResponse({"error": "Invalid token."}, status=400)
    except (BadSignature, SignatureExpired):
        return JsonResponse({"error": "Token invalid or expired."}, status=400)

    request_product = RequestProduct.objects.get(id=id)
    if request_product.extension_status == "pending":
        old_status = request_product.extension_status
        request_product.extension_status = "approved"
        request_product.save()

        AuditLog.objects.create(
            request=request_product.request,
            request_product=request_product,
            action_type="extension_approved",
            old_value=str(old_status),
            new_value="approved",
            performed_by=request.user
        )

        return JsonResponse({"message": "Extension approved."}, status=200)
    return JsonResponse({"error": "Invalid status."}, status=400)


@require_http_methods(['POST'])
@role_required('customer')
def reject_extension(request, id):
    token = request.GET.get("token")
    try:
        unsigned = signer.unsign(token, max_age=86400)
        if unsigned != str(id):
            return JsonResponse({"error": "Invalid token."}, status=400)
    except (BadSignature, SignatureExpired):
        return JsonResponse({"error": "Token invalid or expired."}, status=400)

    request_product = RequestProduct.objects.get(id=id)
    if request_product.extension_status == "pending":
        old_status = request_product.extension_status
        request_product.extension_status = "rejected"
        request_product.save()

        AuditLog.objects.create(
            request=request_product.request,
            request_product=request_product,
            action_type="extension_rejected",
            old_value=str(old_status),
            new_value="rejected",
            performed_by=request.user
        )

        return JsonResponse({"message": "Extension rejected."}, status=200)
    return JsonResponse({"error": "Invalid status."}, status=400)

def get_final_step_processes(month, year, include_archived=False):
    # Always start with the full set for that month/year
    base_qs = ProductProcess.objects.filter(
        production_date__month=month,
        production_date__year=year
    )

    # Find last step per request_product
    last_steps = base_qs.values("request_product").annotate(max_step=Max("step_order"))

    final_ids = []
    for ls in last_steps:
        rp_id = ls["request_product"]
        max_step = ls["max_step"]
        final_ids.extend(
            base_qs.filter(request_product_id=rp_id, step_order=max_step).values_list("id", flat=True)
        )

    final_qs = ProductProcess.objects.filter(id__in=final_ids)

    # Only filter out archived if flag is False
    if not include_archived:
        final_qs = final_qs.filter(
            archived_at__isnull=True,
            request_product__archived_at__isnull=True,
            request_product__request__archived_at__isnull=True
        )

    return final_qs

@require_http_methods(['GET'])
@role_required('admin', 'manager')
def bar_report(request):
    today = datetime.date.today()
    month = int(request.GET.get("month", today.month))
    year = int(request.GET.get("year", today.year))
    include_archived = request.GET.get("include_archived", "false").lower() == "true"

    weekly_data = get_bar_report_data(month, year, include_archived)

    labels = [f"Week {i}" for i in range(1, len(weekly_data)+1)]
    datasets = [
        {"label": "Defects", "data": [weekly_data[i]["defects"] for i in range(1, len(weekly_data)+1)]},
        {"label": "Completed", "data": [weekly_data[i]["completed"] for i in range(1, len(weekly_data)+1)]},
    ]

    return JsonResponse({"labels": labels, "datasets": datasets})


def get_bar_report_data(month, year, include_archived=False):
    days_in_month = calendar.monthrange(year, month)[1]
    num_weeks = (days_in_month + 6) // 7
    weekly_data = {i: {"defects": 0, "completed": 0} for i in range(1, num_weeks+1)}

    final_processes = get_final_step_processes(month, year, include_archived)

    for p in final_processes:
        if p.production_date:
            week = (p.production_date.day - 1) // 7 + 1
            weekly_data[week]["defects"] += p.defect_count
            weekly_data[week]["completed"] += p.completed_quota

    return weekly_data


@require_http_methods(['GET'])
@role_required('admin', 'manager')
def pie_report(request):
    today = datetime.date.today()
    month = int(request.GET.get("month", today.month))
    year  = int(request.GET.get("year", today.year))
    include_archived = request.GET.get("include_archived", "false").lower() == "true"

    active_qty = 0
    completed_qty = 0
    rejected_qty = 0

    final_processes = get_final_step_processes(month, year, include_archived)

    for p in final_processes:
        if p.is_completed:
            completed_qty += p.completed_quota
        else:
            active_qty += p.completed_quota
        rejected_qty += p.defect_count

    total = active_qty + completed_qty + rejected_qty
    pct = lambda n: round((n / total) * 100, 2) if total else 0

    labels = ["In Progress", "Completed", "Rejected"]
    data   = [pct(active_qty), pct(completed_qty), pct(rejected_qty)]

    return JsonResponse({
        "labels": labels,
        "data": data,
        "raw": [active_qty, completed_qty, rejected_qty],
        "total": total
    })


@require_http_methods(['GET'])
@role_required('admin', 'manager')
def donut_top_products(request):
    today = datetime.date.today()
    month = int(request.GET.get("month", today.month))
    year  = int(request.GET.get("year", today.year))
    limit = int(request.GET.get("limit", 5))
    include_archived = request.GET.get("include_archived", "false").lower() == "true"

    final_processes = get_final_step_processes(month, year, include_archived)

    # Aggregate totals by product name
    product_totals = (
        ProductProcess.objects.filter(id__in=[p.id for p in final_processes])
        .values("request_product__product__prodName")
        .annotate(total_quota=Sum("completed_quota"))
        .filter(total_quota__gt=0)
        .order_by("-total_quota")[:limit]
    )

    labels = [p["request_product__product__prodName"] for p in product_totals]
    raw    = [p["total_quota"] or 0 for p in product_totals]

    total = sum(raw)
    pct = lambda n: round((n / total) * 100, 2) if total else 0
    data = [pct(n) for n in raw]

    return JsonResponse({
        "labels": labels,
        "data": data,
        "raw": raw,
        "total": total
    })

def get_pie_report_data(month, year, include_archived=False):
    active_qty = 0
    completed_qty = 0
    rejected_qty = 0

    final_processes = get_final_step_processes(month, year, include_archived)

    for p in final_processes:
        if p.is_completed:
            completed_qty += p.completed_quota
        else:
            active_qty += p.completed_quota
        rejected_qty += p.defect_count

    total = active_qty + completed_qty + rejected_qty
    pct = lambda n: round((n / total) * 100) if total else 0

    return {
        "labels": ["In Progress", "Completed", "Rejected"],
        "raw": [active_qty, completed_qty, rejected_qty],
        "percentages": [pct(active_qty), pct(completed_qty), pct(rejected_qty)],
        "total": total
    }

def get_donut_top_products(month, year, limit=5, include_archived=False):
    final_processes = get_final_step_processes(month, year, include_archived)

    product_totals = (
        ProductProcess.objects.filter(id__in=[p.id for p in final_processes])
        .values("request_product__product__prodName")
        .annotate(total_quota=Sum("completed_quota"))
        .filter(total_quota__gt=0)
        .order_by("-total_quota")[:limit]
    )

    return list(product_totals)

@csrf_exempt
@role_required('admin', 'manager')
@require_http_methods(['GET'])
def list_users(request):
    raw_users = UserProfile.objects.all().values(
        "id", "user__username", "is_verified", "verified_at"
    )
    users = [
        {
            "id": u["id"],
            "username": u["user__username"],
            "is_verified": u["is_verified"],
            "verified_at": u["verified_at"].strftime("%Y-%m-%d %H:%M") if u["verified_at"] else None
        }
        for u in raw_users
    ]
    return JsonResponse(users, safe=False)

@require_http_methods(['GET'])
@role_required('admin', 'manager')
@csrf_exempt
def full_report_csv(request):
    today = datetime.date.today()
    month = int(request.GET.get("month", today.month))
    year  = int(request.GET.get("year", today.year))
    limit = int(request.GET.get("limit", 5))

    include_archived = request.GET.get("include_archived", "false").lower() == "true"

    bar_data   = get_bar_report_data(month, year, include_archived)
    pie_data   = get_pie_report_data(month, year, include_archived)
    donut_data = get_donut_top_products(month, year, limit, include_archived)

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="full_report_{month}_{year}.csv"'
    writer = csv.writer(response)

    # Section 1: Bar report
    writer.writerow(["Bar Report"])
    writer.writerow(["Week", "Defects", "Completed"])
    for week in sorted(bar_data.keys()):
        writer.writerow([f"Week {week}", bar_data[week]["defects"], bar_data[week]["completed"]])
    writer.writerow([])

    # Section 2: Pie report
    writer.writerow(["Pie Report (Percentages)"])
    writer.writerow(["Category", "Percentage", "Quantity"])
    for label, pct, raw in zip(pie_data["labels"], pie_data["percentages"], pie_data["raw"]):
        writer.writerow([label, f"{pct}%", raw])
    writer.writerow([])

    # Section 3: Donut report
    writer.writerow(["Top Products"])
    writer.writerow(["Product", "Total Quota"])
    for p in donut_data:
        writer.writerow([p["request_product__product__prodName"], p["total_quota"]])

    return response


@require_http_methods(['POST', 'PATCH'])
@role_required('admin', 'manager')
@csrf_exempt
def archive_request(request, id):
    try:
        req = Requests.objects.get(RequestID=id)
    except Requests.DoesNotExist:
        return JsonResponse({"error": "Request not found"}, status=404)

    old_value = str(req.archived_at)
    now = timezone.now()

    # Archive the Request itself
    req.archived_at = now
    req.save()

    # Archive all RequestProducts under this Request
    RequestProduct.objects.filter(request=req).update(archived_at=now)

    # Archive all ProductProcesses linked to those RequestProducts
    ProductProcess.objects.filter(request_product__request=req).update(archived_at=now)

    new_value = str(req.archived_at)

    AuditLog.objects.create(
        request=req,
        action_type="archive",
        old_value=old_value,
        new_value=new_value,
        performed_by=request.user
    )

    return JsonResponse({
        "message": f"Request {id} archived successfully!",
        "archived_at": req.archived_at
    }, status=200)

@require_http_methods(['POST', 'PATCH'])
@role_required('admin', 'manager')
@csrf_exempt
def unarchive_request(request, id):
    try:
        req = Requests.objects.get(RequestID=id)
    except Requests.DoesNotExist:
        return JsonResponse({"error": "Request not found"}, status=404)

    # Reset archived_at on the Request itself
    old_value = str(req.archived_at)
    req.archived_at = None
    req.save()

    # Reset archived_at on all RequestProducts under this Request
    RequestProduct.objects.filter(request=req).update(archived_at=None)

    # Reset archived_at on all ProductProcesses linked to those RequestProducts
    ProductProcess.objects.filter(request_product__request=req).update(archived_at=None)

    new_value = str(req.archived_at)

    AuditLog.objects.create(
        request=req,
        action_type="unarchive",
        old_value=old_value,
        new_value=new_value,
        performed_by=request.user
    )

    return JsonResponse({
        "message": f"Request {id} unarchived successfully!",
        "archived_at": req.archived_at
    }, status=200)

@role_required('admin', 'manager')
@csrf_exempt
def auditlog_view(request):
    # Grab latest 50 logs (newest first)
    logs = AuditLog.objects.select_related("request", "request_product", "performed_by")[:50]
    serializer = AuditLogSerializer(logs, many=True)
    return JsonResponse({"audit_logs": serializer.data}, status=200)

@role_required('admin', 'manager')
@csrf_exempt
def auditlog_delete(request, pk: int):
    try:
        log = AuditLog.objects.get(pk=pk)
        log.delete()
        return JsonResponse({"message": f"Audit log {pk} deleted successfully."}, status=200)
    except AuditLog.DoesNotExist:
        return JsonResponse({"error": "Audit log not found."}, status=404)

@require_http_methods(["GET", "PUT", "PATCH"])
@role_required("customer")
@csrf_exempt
def profile_view(request):
    profile = UserProfile.objects.get(user=request.user)

    if request.method == "GET":
        data = {
            "username": request.user.username,
            "email": request.user.email,
            "full_name": profile.full_name,
            "company_name": profile.company_name,
            "contact_number": profile.contact_number,
            "is_verified": profile.is_verified,
            "created_at": profile.created_at,
            "verified_at": profile.verified_at,
        }
        return JsonResponse(data, status=200)

    elif request.method in ["PUT", "PATCH"]:
        data = json.loads(request.body)

        if "email" in data:
            request.user.email = data["email"]
            request.user.save()

        profile.full_name = data.get("full_name", profile.full_name)
        profile.company_name = data.get("company_name", profile.company_name)
        profile.contact_number = data.get("contact_number", profile.contact_number)
        profile.save()

        return JsonResponse({
            "detail": "Profile updated successfully",
            "username": request.user.username,
            "email": request.user.email,
            "full_name": profile.full_name,
            "company_name": profile.company_name,
            "contact_number": profile.contact_number,
            "is_verified": profile.is_verified,
            "created_at": profile.created_at,
            "verified_at": profile.verified_at,
        }, status=200)

@csrf_exempt
@require_http_methods(['GET'])
def requestProductAPI(request, id=0):
    include_archived = request.GET.get("include_archived", "false").lower() == "true"
    status_filter = request.GET.get("status", "").lower()

    # Map query params to normalized status strings
    status_map = {
        "not-started": "🕒 not started",
        "in-progress": "⏳ in progress",
        "done": "✅ done"
    }

    def apply_filters(products):
        # 👉 Apply status filter if provided
        if status_filter in status_map:
            products = [rp for rp in products if status_map[status_filter] in rp.task_status().lower()]
        return products

    def compute_progress(products):
        if products:
            total_requested = sum(rp.quantity for rp in products)
            total_completed = sum(rp.get_completed_quota() for rp in products)
            percentages = [rp.get_progress_percentage() for rp in products]

            avg_percent = round(sum(percentages) / len(percentages), 2)
            weighted_percent = round(100 * total_completed / total_requested, 2) if total_requested else 0
        else:
            avg_percent = 0
            weighted_percent = 0
        return avg_percent, weighted_percent

    if id == 0:
        requests = Requests.objects.all() if include_archived else Requests.objects.filter(archived_at__isnull=True)
        response_data = []

        for req in requests.order_by('-created_at'):
            products = req.request_products.all().order_by('-request__created_at')
            products = products if include_archived else products.filter(archived_at__isnull=True)
            products = apply_filters(products)

            # 👉 Skip requests with no matching products
            if not products:
                continue

            serializer = RequestProductReadSerializer(products, many=True)
            avg_percent, weighted_percent = compute_progress(products)

            response_data.append({
                "request_id": req.RequestID,
                "products": serializer.data,
                "overall_progress": {
                    "average_percentage": f"{avg_percent}%",
                    "weighted_percentage": f"{weighted_percent}%"
                }
            })

        return JsonResponse(response_data, safe=False)

    else:
        try:
            req = Requests.objects.get(RequestID=id)
        except Requests.DoesNotExist:
            return JsonResponse({"error": "Request not found"}, status=404)

        products = req.request_products.all().order_by('-request__created_at')
        products = products if include_archived else products.filter(archived_at__isnull=True)
        products = apply_filters(products)

        # 👉 Skip if no matching products
        if not products:
            return JsonResponse({"error": "No matching products found"}, status=404)

        serializer = RequestProductReadSerializer(products, many=True)
        avg_percent, weighted_percent = compute_progress(products)

        response_data = {
            "request_id": req.RequestID,
            "products": serializer.data,
            "overall_progress": {
                "average_percentage": f"{avg_percent}%",
                "weighted_percentage": f"{weighted_percent}%"
            }
        }

        return JsonResponse(response_data, safe=False)

@require_http_methods(['GET'])
@role_required('customer')
def customer_request_view(request):
    user = request.user
    include_archived = request.GET.get("include_archived", "false").lower() == "true"
    status_filter = request.GET.get("status", "").lower()

    # Map query params to normalized status strings
    status_map = {
        "not-started": "🕒 not started",
        "in-progress": "⏳ in progress",
        "done": "✅ done"
    }

    def apply_filters(products):
        if status_filter in status_map:
            products = [
                rp for rp in products
                if status_map[status_filter] in rp.task_status().lower()
            ]
        return products

    requests_qs = Requests.objects.filter(requester=user)
    if not include_archived:
        requests_qs = requests_qs.filter(archived_at__isnull=True)

    response_data = []
    for req in requests_qs.order_by('-created_at'):
        products = req.request_products.all().order_by('-request__created_at')
        products = products if include_archived else products.filter(archived_at__isnull=True)
        products = apply_filters(products)

        # Skip requests with no matching products
        if not products:
            continue

        serializer = CustomerProductDetailSerializer(products, many=True)
        response_data.append({
            "request_id": req.RequestID,
            "due_date": req.deadline,
            "created_at": req.created_at,
            "product_details": serializer.data
        })

    return JsonResponse(response_data, safe=False)



