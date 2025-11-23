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
from django.db.models import Sum
import datetime
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
import json

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
def login_view(request):
    data = JSONParser().parse(request)
    username = data.get("username")
    # email = data.get("email")
    password = data.get("password")

    if username is None or password is None:
        return JsonResponse({"detail": "Please provide username and password"}, status=400)

    user = authenticate(username=username, password=password)
    if user is None:
        return JsonResponse({"detail":"Invalid credentials"}, status=400)

    profile = getattr(user, 'userprofile', None)
    if profile and not profile.is_verified:
        return JsonResponse({"detail": "Account not yet verified"}, status=403)

    login(request, user)
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
    
    elif request.method == 'PATCH':
        worker_data = JSONParser().parse(request)
        worker =get_object_or_404(Worker, WorkerID=id) 
        workers_serializer = WorkerSerializer(worker,data=worker_data, partial=True)
        if workers_serializer.is_valid():
            workers_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)    

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

@role_required('admin', 'manager')
@csrf_exempt
def requestAPI(request, id=0):
    if request.method == 'GET':
        requests = Requests.objects.all()
        request_serializer = RequestSerializer(requests, many=True)
        return JsonResponse(request_serializer.data, safe=False)

    elif request.method in ['PUT', 'PATCH']:
        request_data = JSONParser().parse(request)

        try: 
            request_instance = Requests.objects.get(RequestID=id)
        except Requests.DoesNotExist:
            return JsonResponse("Request not found", safe=False, status=404)

        request_serializer = RequestSerializer(request_instance, data=request_data, partial=True)

        if request_serializer.is_valid():
            request_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False, status=400)  
    
    elif request.method == 'POST':
        request_data = JSONParser().parse(request)
        request_serializer = RequestSerializer(data=request_data, context={'request': request})
        if request_serializer.is_valid():
            request_serializer.save()
            return JsonResponse("Added successfully!", safe=False, status=201)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'DELETE':
        request = Requests.objects.get(RequestID=id)
        request.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
@role_required('admin')
def processAPI(request, id=0):
    if request.method == 'GET':
        processes = ProcessName.objects.all()
        process_serializer = ProcessSerializer(processes, many=True)
        return JsonResponse(process_serializer.data, safe=False)

    elif request.method == 'PUT':
        process_data = JSONParser().parse(request)
        process = ProcessName.objects.get(ProcessID=process_data['ProcessID'])
        process_serializer = ProcessSerializer(process,data=process_data)
        if process_serializer.is_valid():
            process_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)  
    
    elif request.method == 'POST':
        process_data = JSONParser().parse(request)
        process_serializer = ProcessSerializer(data=process_data)
        if process_serializer.is_valid():
            process_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
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

    elif request.method == 'PUT':
        prodname_data = JSONParser().parse(request)
        prodname = ProductName.objects.get(ProdID=prodname_data['ProdID'])
        prodname_serializer = ProductNameSerializer(prodname,data=prodname_data)
        if prodname_serializer.is_valid():
            prodname_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)  
    
    elif request.method == 'POST':
        prodname_data = JSONParser().parse(request)
        prodname_serializer = ProductNameSerializer(data=prodname_data)
        if prodname_serializer.is_valid():
            prodname_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'DELETE':
        prodname = get_object_or_404(ProductName, ProdID=id)
        prodname.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
@role_required('admin', 'manager')
def productProcessAPI(request, id=0):
    if request.method == 'GET':
        all_steps = ProductProcess.objects.all()
        serializer = ProductProcessSerializer(all_steps, many=True)
        return JsonResponse(serializer.data, safe=False)

    # elif request.method == 'PATCH':
    #     data = JSONParser().parse(request)
    #     step = ProductProcess.objects.get(id=id)

    #     request_instance = step.request_product.request
    #     today = date.today()
    #     deadline = request_instance.deadline

    #     if today > deadline:
    #         return JsonResponse("You cannot update quota/worker beyond the deadline.", safe=False, status=403)

    #     if 'completed_quota' in data:
    #         step.completed_quota = data['completed_quota']
    #         step.save()
    #         step.mark_completed_if_ready()

    #     serializer = ProductProcessSerializer(step, data=data, partial=True)
    #     if serializer.is_valid():
    #         serializer.save()
    #         return JsonResponse("Step updated sucessfully!", safe=False)
    #     return JsonResponse(serializer.errors, status=400)

    elif request.method == 'PATCH':
        data = JSONParser().parse(request)
        step = ProductProcess.objects.get(id=id)

        request_product = step.request_product
        request_instance = request_product.request
        today = date.today()

    # ✅ Use global deadline + per-product extension if approved
        base_deadline = request_instance.deadline
        effective_deadline = (
            request_product.deadline_extension
            if request_product.deadline_extension and request_product.extension_status == "approved"
            else base_deadline
        )

        if today > effective_deadline:
            return JsonResponse(
                "You cannot update quota/worker beyond the deadline.",
                safe=False,
                status=403
            )

        if 'completed_quota' in data:
            step.completed_quota = data['completed_quota']
            step.save()
            step.mark_completed_if_ready()

        serializer = ProductProcessSerializer(step, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return JsonResponse("Step updated successfully!", safe=False)
        return JsonResponse(serializer.errors, status=400)

    # Duplication check - For future request constraint
        # existing_quota = ProductProcess.objects.annotate(
        #     created_date=TruncDate("created_at")).filter(
        #         request__product_name=product, created_date=today).exclude(pk=step.id).exists()
        # return JsonResponse("Matched quota entries.,", safe=False)
        # print("Matched quota entries:", existing_quota)
        # if not step.is_completed and existing_quota.exists():
        #     return JsonResponse("Quota already exists for today.", safe=False, status=403)

    # Proceed with patch update
        # serializer = ProductProcessSerializer(step, data=data, partial=True)

        # if serializer.is_valid():
        #     updated_step = serializer.save()
        #     updated_step.mark_completed_if_ready()
        #     return JsonResponse("Quota/Worker updated successfully!", safe=False)

        # print("Serializer errors:", serializer.errors)
        # return JsonResponse("Failed to add/update quota/worker.", safe=False)


    elif request.method == 'POST':
        data = JSONParser().parse(request)
        
        serializer = ProductProcessSerializer(data=data)
        if serializer.is_valid():
            base_process = serializer.save()

            # if base_process.worker and not base_process.worker.is_active:
            #     return JsonResponse("Cannot assign inactive worker to process.", status=400)

            product_name = base_process.request_product.product.prodName

            templates = ProcessTemplate.objects.filter(product_name__prodName=product_name)

            for template in templates:
                if ProductProcess.objects.filter(
                    request_product=base_process.request_product, process=template.process
                ).exists():
                    continue

                ProductProcess.objects.create(
                    request_product=base_process.request_product,
                    # worker=base_process.worker,
                    process=template.process,
                    step_order=template.step_order,
                    production_date=base_process.production_date
                    )

            return JsonResponse("Fixed process steps assigned and initial step added!", safe=False)

        # print("Serializer errors:", serializer.errors)
        return JsonResponse(serializer.errors, status=400)

    elif request.method == 'DELETE':
        step = get_object_or_404(ProductProcess, id=id)
        step.delete()
        return JsonResponse("Step deleted successfully!", safe=False)

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

@require_http_methods(['GET'])
@role_required('customer')
def customer_request_view(request):
    user = request.user
    requests_qs = Requests.objects.filter(requester=user)
    serializer = CustomerRequestStatusSerializer(requests_qs, many=True)
    return JsonResponse(serializer.data, safe=False)

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

@require_http_methods(['GET'])
@role_required('admin', 'manager')
def bar_report(request):
    today = datetime.date.today()

    # Get month/year from query params, fallback to current
    month = int(request.GET.get("month", today.month))
    year = int(request.GET.get("year", today.year))

    # Filter by chosen month/year
    processes = ProductProcess.objects.filter(
        production_date__month=month,
        production_date__year=year
    )

    # Bucket into weeks of the month
    weekly_data = {
        1: {"defects": 0, "completed": 0},
        2: {"defects": 0, "completed": 0},
        3: {"defects": 0, "completed": 0},
        4: {"defects": 0, "completed": 0},
    }

    for p in processes:
        if p.production_date:
            day = p.production_date.day
            if day <= 7:
                week = 1
            elif day <= 14:
                week = 2
            elif day <= 21:
                week = 3
            else:
                week = 4

            weekly_data[week]["defects"] += p.defect_count
            weekly_data[week]["completed"] += p.completed_quota

    labels = [f"Week {i}" for i in range(1, 5)]
    datasets = [
        {"label": "Defects", "data": [weekly_data[i]["defects"] for i in range(1, 5)]},
        {"label": "Completed", "data": [weekly_data[i]["completed"] for i in range(1, 5)]},
    ]

    return JsonResponse({"labels": labels, "datasets": datasets})