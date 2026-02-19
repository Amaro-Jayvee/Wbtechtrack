from django.shortcuts import render

#Instead of JSON, JsonParser can be used to parse the incoming data
# Create your views here.
import json
import csv
import datetime
import calendar
from rest_framework.parsers import JSONParser
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from django.contrib.auth import views as auth_views
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Q
# from .permissions import manager_or_admin_required
# from django.contrib.auth.views import (
#     PasswordResetView,
#     PasswordResetDoneView,
#     PasswordResetConfirmView,
#     PasswordResetCompleteView
# )

from app.models import *
from app.serializers import *
# from app.exceptions import ValidationError, AuthenticationError, AuthorizationError, ResourceNotFoundError
# from app.validators import Validators, validate_login_credentials
# from app.error_handlers import error_response, success_response, handle_view_exception

# from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
# from django.utils.encoding import force_bytes, force_str
# from django.contrib.auth.tokens import default_token_generator
# from django.core.mail import send_mail

# from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from datetime import date
from django.utils import timezone
from django.db.models.functions import TruncDate
from django.db.models import Max, Sum
# from functools import wraps
from .permissions import role_required
from django.core.mail import send_mail
from django.conf import settings

# Helper functions for API responses
def error_response(message, code=400, detail=None):
    """Return a standardized error response"""
    return JsonResponse({
        "detail": message,
        "error": detail or message
    }, status=code)

def success_response(data, code=200):
    """Return a standardized success response"""
    return JsonResponse(data, status=code)

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
    """
    User login endpoint with validation and error handling
    
    POST /api/login/
    {
        "username": "user@example.com",
        "password": "password123"
    }
    """
    try:
        data = JSONParser().parse(request)
    except Exception as e:
        return error_response("Invalid JSON format", code=400, detail=str(e))
    
    # Validate required fields
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    
    if not username:
        return error_response("Username is required", code=400, detail="Username cannot be empty")
    
    if not password:
        return error_response("Password is required", code=400, detail="Password cannot be empty")
    
    # Authenticate user
    user = authenticate(username=username, password=password)
    if user is None:
        return error_response(
            "Invalid credentials",
            code=401,
            detail="Username or password is incorrect"
        )
    
    # Check if user profile exists
    try:
        profile = user.userprofile
    except AttributeError:
        return error_response(
            "User profile not found",
            code=500,
            detail="Your account profile is missing. Please contact admin."
        )
    
    # Check if customer is verified/approved (only for customers)
    if profile.role == Roles.CUSTOMER and not profile.is_verified:
        return error_response(
            "Account not approved",
            code=403,
            detail="Your account is pending admin approval. Please wait for approval."
        )
    
    # Create session
    login(request, user)
    
    return JsonResponse({
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": profile.role,
        "detail": "Successfully logged in"
    }, status=200)

@csrf_exempt
def logout_view(request):
    """
    User logout endpoint
    
    POST /api/logout/
    """
    if not request.user.is_authenticated:
        return error_response(
            "Not authenticated",
            code=401,
            detail="You are not logged in"
        )
    
    try:
        logout(request)
        return JsonResponse({
            "detail": "Successfully logged out"
        }, status=200)
    except Exception as e:
        return error_response(
            "Logout failed",
            code=500,
            detail=str(e)
        )

@ensure_csrf_cookie
def session_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"isAuthenticated": False})
    return JsonResponse({"isAuthenticated": True})

@csrf_exempt
@ensure_csrf_cookie
def whoami_view(request):
    """
    Get current authenticated user information
    
    GET /api/whoami/
    
    Returns user details if authenticated, 401 if not
    """
    if not request.user.is_authenticated:
        return error_response(
            "Not authenticated",
            code=401,
            detail="No active session"
        )
    
    try:
        profile = request.user.userprofile
    except AttributeError:
        return error_response(
            "User profile not found",
            code=500,
            detail="User profile is missing"
        )
    
    return JsonResponse({
        "username": request.user.username,
        "first_name": request.user.first_name,
        "last_name": request.user.last_name,
        "email": request.user.email,
        "role": profile.role,
        "is_verified": profile.is_verified,
        "detail": "User authenticated"
    }, status=200)

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

@role_required('admin', 'manager', 'customer')
@csrf_exempt
def requestAPI(request, id=0):
    if request.method == 'GET':
        # Get current user's requests based on their role
        user = request.user
        if user.is_authenticated:
            # Check if user is admin (has staff status or is superuser)
            if user.is_staff or user.is_superuser:
                # For admins, show requests they created (created_by) - EXCLUDE archived
                requests_obj = Requests.objects.filter(created_by=user, archived_at__isnull=True)
                print(f"[DEBUG] Admin {user.username} fetching requests they created. Found: {requests_obj.count()}")
            else:
                # For regular users (customers), show requests where they are EITHER the creator OR the requester
                # This way they can see requests they created (regardless of who requester is) and requests where they are the requester
                requests_obj = Requests.objects.filter(
                    Q(created_by=user) | Q(requester=user),
                    archived_at__isnull=True
                )
                print(f"[DEBUG] Customer {user.username} fetching their requests (as creator or requester). Found: {requests_obj.count()}")
        else:
            requests_obj = Requests.objects.none()
        request_serializer = RequestReadSerializer(requests_obj, many=True)
        return JsonResponse(request_serializer.data, safe=False)

    elif request.method == 'PATCH':
        request_data = JSONParser().parse(request)
        request_obj = Requests.objects.get(RequestID=request_data['RequestID'])
        request_serializer = RequestSerializer(request_obj, data=request_data)
        if request_serializer.is_valid():
            request_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False, status=400)  
    
    elif request.method == 'POST':
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return JsonResponse({"error": "User must be authenticated"}, status=401)
            
            # Optional: Check UserProfile (can be removed if not required)
            try:
                user_profile = UserProfile.objects.get(user=request.user)
            except UserProfile.DoesNotExist:
                print(f"[DEBUG] Warning: UserProfile not found for user {request.user.username}")
                # Don't block - allow users without profile to create requests
            
            request_data = JSONParser().parse(request)
            import os
            log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"[CREATE_REQUEST] User: {request.user.username}, Staff: {request.user.is_staff}\n")
            
            request_serializer = RequestSerializer(data=request_data, context={'request': request})
            if request_serializer.is_valid():
                new_request = request_serializer.save()
                print(f"[DEBUG] Request created successfully:")
                print(f"       - RequestID: {new_request.RequestID}")
                print(f"       - created_by: {new_request.created_by.username if new_request.created_by else 'None'}")
                print(f"       - requester: {new_request.requester.username if new_request.requester else 'None'}")
                print(f"       - deadline: {new_request.deadline}")
                print(f"       - products: {new_request.request_products.count()}")
                
                # Create notification for the customer (requester)
                if new_request.requester:
                    create_notification(
                        user=new_request.requester,
                        notification_type='request_created',
                        title='New Request Assigned',
                        message=f'A new request has been assigned to you with deadline {new_request.deadline}',
                        related_request=new_request
                    )
                
                # Create notification for the user who created the request
                if request.user:
                    create_notification(
                        user=request.user,
                        notification_type='request_created',
                        title='Request Created Successfully',
                        message=f'Your request #{new_request.RequestID} has been created with deadline {new_request.deadline}',
                        related_request=new_request
                    )
                
                # Create notification for all admin/manager users
                admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
                for admin_user in admin_users:
                    create_notification(
                        user=admin_user,
                        notification_type='request_created',
                        title='New Request Created',
                        message=f'A new request #{new_request.RequestID} has been created by {request.user.username}',
                        related_request=new_request
                    )
                
                # Return the created request data instead of just a message
                return JsonResponse(request_serializer.data, safe=False, status=201)
            else:
                print(f"[DEBUG] Request creation failed with errors: {request_serializer.errors}")
                return JsonResponse(request_serializer.errors, safe=False, status=400)
        except Exception as e:
            print(f"[DEBUG] Exception during request creation: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)
    
    elif request.method == 'DELETE':
        try:
            request_instance = Requests.objects.get(RequestID=id)
        except Requests.DoesNotExist:
            return JsonResponse({"error": "Request not found"}, status=404)

        old_snapshot = RequestSerializer(request_instance).data
        
        # Soft-delete using archive() method instead of hard delete
        # This prevents orphaned ProductProcess records
        request_instance.archive()

        AuditLog.objects.create(
            action_type="delete",
            old_value=json.dumps(old_snapshot),
            performed_by=request.user
        )
        return JsonResponse({"message": "Deleted successfully!"}, status=200)


@csrf_exempt
@require_POST
def submit_requests(request):
    """Submit multiple requests by their IDs"""
    try:
        data = JSONParser().parse(request)
        request_ids = data.get('request_ids', [])
        
        if not request_ids:
            return JsonResponse({"error": "No request IDs provided"}, status=400)
        
        # Update all selected requests to 'submitted' status
        requests_to_update = Requests.objects.filter(RequestID__in=request_ids)
        
        if not requests_to_update.exists():
            return JsonResponse({"error": "No requests found with the provided IDs"}, status=404)
        
        # Update the status to 'submitted'
        requests_to_update.update(status='submitted')
        
        # Create audit logs for each request
        for req in requests_to_update:
            AuditLog.objects.create(
                action_type="submit",
                new_value=json.dumps({"RequestID": req.RequestID, "status": "submitted"}),
                performed_by=request.user
            )
        
        return JsonResponse({
            "message": f"Successfully submitted {len(requests_to_update)} request(s)",
            "submitted_count": len(requests_to_update)
        }, status=200)
    
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_POST
def start_project(request, id=0):
    """Create ProductProcess (tasks) from a request"""
    try:
        # Get request_id from URL parameter if provided, otherwise from JSON body
        if id:
            request_id = id
        else:
            data = JSONParser().parse(request)
            request_id = data.get('request_id')
        
        if not request_id:
            return JsonResponse({"error": "No request ID provided"}, status=400)
        
        # Get the request and its products
        try:
            req = Requests.objects.get(RequestID=request_id)
        except Requests.DoesNotExist:
            return JsonResponse({"error": "Request not found"}, status=404)
        
        # Get all RequestProducts for this request
        request_products = req.request_products.all()
        
        if not request_products.exists():
            return JsonResponse({"error": "No products found for this request"}, status=400)
        
        # Check which products have process templates and remove those that don't
        valid_products = []
        removed_products = []
        
        for rp in request_products:
            process_templates = ProcessTemplate.objects.filter(product_name=rp.product)
            if process_templates.exists():
                valid_products.append(rp)
            else:
                removed_products.append({
                    'product_name': rp.product.prodName,
                    'quantity': rp.quantity
                })
                # Don't delete the product - just skip it
                # The product will remain in the request but won't have tasks
                print(f"[DEBUG] Skipping product {rp.product.prodName} from request {request_id} - no process template")
        
        if not valid_products:
            return JsonResponse({
                "error": f"No products with process templates found. All items are missing process step definitions: {', '.join([p['product_name'] for p in removed_products])}",
                "hint": "Please configure process templates for these products before starting the project. Go to the Product Configuration page to add processes.",
                "removed_products": removed_products
            }, status=400)
        
        created_tasks = []
        
        # Get the process template for each valid request product
        for request_product in valid_products:
            product = request_product.product
            
            # Get process templates for this product
            process_templates = ProcessTemplate.objects.filter(product_name=product).order_by('step_order')
            
            # Create ProductProcess for each process step
            for template in process_templates:
                # Check if this step already exists to prevent duplicates
                existing_task = ProductProcess.objects.filter(
                    request_product=request_product,
                    process=template.process,
                    step_order=template.step_order
                ).first()
                
                if existing_task:
                    # Skip if already exists
                    print(f"[DEBUG] ProductProcess already exists for request_product {request_product.id}, process {template.process.name}, step {template.step_order}")
                    continue
                
                task = ProductProcess.objects.create(
                    request_product=request_product,
                    process=template.process,
                    step_order=template.step_order,
                    completed_quota=0,
                    is_completed=False
                )
                created_tasks.append({
                    'id': task.id,
                    'request_id': request_id,
                    'product': product.prodName,
                    'process': template.process.name,
                    'quantity': request_product.quantity
                })
        
        # Archive the request to mark it as started/in-process
        # This removes it from the active requests list so it doesn't appear duplicated
        req.archived_at = timezone.now()
        req.save()
        
        # Create notification for the requester (customer)
        try:
            if req.requester:
                create_notification(
                    user=req.requester,
                    notification_type='project_started',
                    title=f'Project Started for Request #{req.RequestID}',
                    message=f'Your request #{req.RequestID} has been started. {len(created_tasks)} task(s) have been created.',
                    related_request=req
                )
        except Exception as notif_error:
            print(f"[DEBUG] Error creating notification for requester: {notif_error}")
        
        # Create notification for the user who started the project
        try:
            create_notification(
                user=request.user,
                notification_type='project_started',
                title=f'Project Started for Request #{req.RequestID}',
                message=f'You started project #{req.RequestID}. {len(created_tasks)} task(s) have been created.',
                related_request=req
            )
        except Exception as notif_error:
            print(f"[DEBUG] Error creating notification for project starter: {notif_error}")
        
        # Create notification for all admin/manager users
        try:
            admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
            for admin_user in admin_users:
                create_notification(
                    user=admin_user,
                    notification_type='project_started',
                    title=f'Project Started for Request #{req.RequestID}',
                    message=f'Request #{req.RequestID} has been started with {len(created_tasks)} task(s).',
                    related_request=req
                )
        except Exception as notif_error:
            print(f"[DEBUG] Error creating notifications for admin users: {notif_error}")
        
        print(f"[DEBUG] start_project completed for request {request_id}: archived_at={req.archived_at}, tasks_created={len(created_tasks)}")
        
        # Prepare response message
        message = f"Successfully created {len(created_tasks)} task(s)"
        if removed_products:
            message += f". Removed {len(removed_products)} item(s) without process templates: {', '.join([p['product_name'] for p in removed_products])}"
        
        return JsonResponse({
            "message": message,
            "tasks_created": len(created_tasks),
            "tasks": created_tasks,
            "removed_items": removed_products
        }, status=201)
    
    except Exception as e:
        print(f"Error in start_project: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def assign_workers_to_request(request):
    """Assign workers to all tasks of a specific product in a request"""
    try:
        data = JSONParser().parse(request)
        request_id = data.get('request_id')
        product_id = data.get('product_id')
        worker_ids = data.get('worker_ids', [])
        
        if not request_id or not product_id:
            return JsonResponse({"error": "request_id and product_id are required"}, status=400)
        
        if not worker_ids:
            return JsonResponse({"error": "At least one worker must be assigned"}, status=400)
        
        # Get the request and product
        try:
            req = Requests.objects.get(RequestID=request_id)
            product = ProductName.objects.get(ProdID=product_id)
        except (Requests.DoesNotExist, ProductName.DoesNotExist):
            return JsonResponse({"error": "Request or product not found"}, status=404)
        
        # Get the RequestProduct
        try:
            request_product = req.request_products.get(product=product)
        except RequestProduct.DoesNotExist:
            return JsonResponse({"error": "Product not found in this request"}, status=404)
        
        # Get the workers
        workers = Worker.objects.filter(WorkerID__in=worker_ids)
        if workers.count() != len(worker_ids):
            return JsonResponse({"error": "Some workers not found"}, status=404)
        
        # Get all tasks for this product
        tasks = ProductProcess.objects.filter(request_product=request_product)
        
        # Assign workers to all tasks for this product
        assigned_count = 0
        for task in tasks:
            task.workers.set(workers)
            assigned_count += 1
        
        return JsonResponse({
            "message": f"Successfully assigned {len(workers)} worker(s) to {assigned_count} task(s)",
            "workers_assigned": len(workers),
            "tasks_updated": assigned_count
        }, status=200)
    
    except Exception as e:
        print(f"Error in assign_workers_to_request: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(['GET'])
def get_tasks(request):
    """Get active tasks and recently completed tasks (ProductProcess)"""
    try:
        # Get filter parameters from query string
        status_filter = request.GET.get('status', 'all').lower()  # all, done, in_progress, not_started
        date_range = request.GET.get('date_range', 'all').lower()  # all, last_7_days, last_30_days
        
        # Get all ProductProcess that are not archived
        all_tasks = ProductProcess.objects.filter(archived_at__isnull=True).select_related(
            'request_product__request',
            'request_product__product',
            'process'
        )
        
        print(f'DEBUG: get_tasks() found {all_tasks.count()} non-archived tasks')
        
        # Also check how many archived tasks exist
        archived_count = ProductProcess.objects.filter(archived_at__isnull=False).count()
        print(f'DEBUG: get_tasks() found {archived_count} archived tasks (these should be filtered out)')
        
        # Group tasks by request and product to get current and recently completed steps
        task_map = {}  # Key: (request_id, product_id), Value: task object
        
        for task in all_tasks.order_by('step_order'):
            request_obj = task.request_product.request if task.request_product else None
            product = task.request_product.product if task.request_product else None
            
            if not request_obj or not product:
                continue
            
            key = (request_obj.RequestID, product.ProdID)
            
            # If this product/request combo is already in map and the existing task is completed,
            # then use this task (next step). Otherwise, skip if already have one.
            if key not in task_map:
                task_map[key] = task
            elif not task_map[key].is_completed:
                # Keep the already mapped task (it's the current step)
                continue
            else:
                # Previous task is completed, so this becomes the new current task
                task_map[key] = task
        
        # Show both current work (not completed) and recently completed tasks
        # Priority: show current work first, then show most recent completed
        current_tasks = []
        completed_tasks = []
        
        for task in task_map.values():
            if not task.is_completed:
                current_tasks.append(task)
            else:
                completed_tasks.append(task)
        
        all_display_tasks = current_tasks + completed_tasks
        
        task_data = []
        for task in all_display_tasks:
            request_obj = task.request_product.request if task.request_product else None
            product = task.request_product.product if task.request_product else None
            quantity = task.request_product.quantity if task.request_product else 0
            
            # Get assigned workers
            workers = list(task.workers.values_list('WorkerID', flat=True))
            
            # Calculate progress based on all work across all steps
            # Progress = (steps completed before current) + (current step progress weighted)
            request_product = task.request_product
            
            # Get all steps for this product
            all_steps = request_product.process_steps.order_by('step_order') if request_product else []
            
            # Calculate progress based on current step and completion
            # Progress increases as we complete each step in the workflow
            if quantity > 0 and all_steps.exists():
                total_steps = all_steps.count()
                
                # Count ONLY the steps that are BEFORE the current step and are completed
                # This prevents counting future completed steps that don't belong in this task's progress
                completed_steps_before = all_steps.filter(is_completed=True, step_order__lt=task.step_order).count()
                
                # Calculate base progress: % of completed steps before current
                base_progress = (completed_steps_before / total_steps) * 100
                
                # Add progress from current task's actual work done
                current_step_progress = (task.completed_quota / quantity) * (100 / total_steps)
                progress = int(base_progress + current_step_progress)
                    
                # Cap at 100% only if actually complete, show real percentage otherwise
                progress = min(progress, 100)
                
                print(f"[DEBUG] Progress calculation - Task {task.id}: step {task.step_order}/{total_steps}, completed_quota={task.completed_quota}, qty={quantity}, completed_steps_before={completed_steps_before}, progress={progress}%")
            else:
                progress = 0
            
            # Determine status
            if task.is_completed:
                status = 'Done'
            elif task.completed_quota > 0:
                status = 'In Progress'
            else:
                status = 'Not Started'
            
            # Get total steps for this product (needed by frontend for progress calculation)
            total_steps = all_steps.count() if all_steps else 1
            
            task_data.append({
                'id': task.id,
                'request_id': request_obj.RequestID if request_obj else None,
                'product': product.prodName if product else 'N/A',
                'process': task.process.name,
                'step_order': task.step_order,
                'total_steps': total_steps,
                'quantity': quantity,
                'completed_quota': task.completed_quota,
                'defect_count': task.defect_count,
                'progress': progress,
                'status': status,
                'is_completed': task.is_completed,
                'workers': workers,  # Include workers IDs
                'last_updated': task.updated_at.strftime('%Y-%m-%d %H:%M') if task.updated_at else None
            })
        
        # Sort by request ID and step order for consistent display
        task_data.sort(key=lambda x: (x['request_id'], x['step_order']))
        
        # Apply status filter
        if status_filter != 'all':
            task_data = [t for t in task_data if t['status'].lower().replace(' ', '_') == status_filter]
        
        # Apply date range filter
        if date_range != 'all':
            from datetime import datetime, timedelta
            today = datetime.now()
            
            if date_range == 'last_7_days':
                cutoff_date = today - timedelta(days=7)
            elif date_range == 'last_30_days':
                cutoff_date = today - timedelta(days=30)
            else:
                cutoff_date = None
            
            if cutoff_date:
                filtered_data = []
                for t in task_data:
                    if t['last_updated']:
                        task_date = datetime.strptime(t['last_updated'], '%Y-%m-%d %H:%M')
                        if task_date >= cutoff_date:
                            filtered_data.append(t)
                task_data = filtered_data
        
        return JsonResponse(task_data, safe=False)
    
    except Exception as e:
        print(f"Error in get_tasks: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
@require_http_methods(["GET"])
def get_task_history(request, request_id=None):
    """Get complete workflow history for a Request (all ProductProcess tasks for this request)"""
    try:
        if not request_id:
            return JsonResponse({"error": "request_id parameter required"}, status=400)
        
        # Get the Request object using the RequestID (not ProductProcess ID)
        request_obj = get_object_or_404(Requests, RequestID=request_id)
        
        # Get all ProductProcess records for this request, ordered by product then step
        all_tasks = ProductProcess.objects.filter(
            request_product__request=request_obj,
            archived_at__isnull=True
        ).select_related(
            'request_product__product',
            'request_product',
            'process'
        ).order_by('request_product__product_id', 'step_order')
        
        task_data = []
        for t in all_tasks:
            product = t.request_product.product if t.request_product else None
            quantity = t.request_product.quantity if t.request_product else 0
            request_product = t.request_product
            
            # Get all steps for this product to calculate total_steps
            all_steps = request_product.process_steps.all().order_by('step_order') if request_product and hasattr(request_product, 'process_steps') else []
            total_steps = all_steps.count() if all_steps else 1
            
            # Calculate progress
            progress = int((t.completed_quota / quantity * 100) if quantity > 0 else 0)
            
            # Determine status
            if t.is_completed:
                status = 'Done'
            elif t.completed_quota > 0:
                status = 'In Progress'
            else:
                status = 'Not Started'
            
            task_data.append({
                'id': t.id,
                'request_id': request_obj.RequestID,
                'product': product.prodName if product else 'N/A',
                'product_id': product.ProdID if product else None,
                'process': t.process.name if t.process else 'N/A',
                'step_order': t.step_order,
                'total_steps': total_steps,
                'quantity': quantity,
                'completed_quota': t.completed_quota,
                'defect_count': t.defect_count or 0,
                'progress': progress,
                'status': status,
                'is_completed': t.is_completed,
                'last_updated': t.updated_at.strftime('%Y-%m-%d %H:%M') if t.updated_at else None
            })
        
        return JsonResponse(task_data, safe=False)
    
    except Exception as e:
        print(f"Error in get_task_history: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)




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
        # Check if filtering for products with templates
        with_templates = request.GET.get('with_templates', 'false').lower() == 'true'
        
        if with_templates:
            # Get only products that have at least one ProcessTemplate
            prodnames = ProductName.objects.filter(
                processtemplate__isnull=False
            ).distinct()
        else:
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


@csrf_exempt
@role_required('admin')
def save_product_configuration(request):
    """
    Save a product with its processes for later use.
    POST: {"product_name": "Motor Assembly", "processes": [{"process_name": "Blanking", "step_order": 1}]}
    """
    if request.method == 'POST':
        try:
            data = JSONParser().parse(request)
            product_name = data.get('product_name', '').strip()
            processes = data.get('processes', [])

            if not product_name:
                return JsonResponse({"error": "Product name is required"}, status=400)

            if not processes:
                return JsonResponse({"error": "At least one process is required"}, status=400)

            # Create or get the ProductName
            product_obj, created = ProductName.objects.get_or_create(prodName=product_name)

            # Create ProcessName records and ProcessTemplate records for each process
            for process_data in processes:
                process_name = process_data.get('process_name', '').strip()
                step_order = process_data.get('step_order', 0)
                if process_name:
                    process_obj, _ = ProcessName.objects.get_or_create(name=process_name)
                    
                    # Create ProductProcess linked to the product (for reference)
                    ProductProcess.objects.get_or_create(
                        product=product_obj,
                        process=process_obj,
                        step_order=step_order,
                        defaults={'completed_quota': 0, 'request_product': None}
                    )
                    
                    # Create ProcessTemplate so start_project can find it
                    ProcessTemplate.objects.get_or_create(
                        product_name=product_obj,
                        process=process_obj,
                        step_order=step_order
                    )

            return JsonResponse({
                "success": True,
                "message": f"Product '{product_name}' saved successfully",
                "product_id": product_obj.ProdID
            })

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    elif request.method == 'GET':
        """Get all products with their configured processes"""
        try:
            products = ProductName.objects.all().order_by('-created_at')
            
            result = []
            for product in products:
                # Get all ProductProcess records for this specific product (not linked to request_product)
                product_processes = ProductProcess.objects.filter(
                    product=product,
                    request_product__isnull=True
                ).order_by('step_order')
                
                # Collect all processes with their step orders
                processes_list = []
                for pp in product_processes:
                    processes_list.append({
                        "process_name": pp.process.name,
                        "step_order": pp.step_order
                    })
                
                result.append({
                    "id": product.ProdID,
                    "prodName": product.prodName,
                    "created_at": product.created_at.isoformat() if product.created_at else None,
                    "processes": processes_list
                })
            
            return JsonResponse(result, safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


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
        # If ID is provided, return single ProductProcess
        if id:
            try:
                step = ProductProcess.objects.get(id=id)
                serializer = ProductProcessSerializer(step)
                return JsonResponse(serializer.data, safe=False)
            except ProductProcess.DoesNotExist:
                return JsonResponse({
                    "detail": f"ProductProcess with ID {id} not found"
                }, status=404)
        
        # Otherwise return all or filtered ProductProcess objects
        include_archived = request.GET.get("include_archived", "false").lower() == "true"

        if include_archived:
            # Only return steps that are linked to actual requests (have request_product set)
            all_steps = ProductProcess.objects.filter(
                request_product__isnull=False
            ).order_by('request_product_id', 'step_order')
        else:
            # Filter out steps whose request_product is archived, OR whose step itself is archived
            # Also filter out template records (request_product=None)
            all_steps = ProductProcess.objects.filter(
                request_product__isnull=False,
                archived_at__isnull=True,
                request_product__archived_at__isnull=True
            ).order_by('request_product_id', 'step_order')

        # Auto-archive request products if all their steps are completed
        from django.utils import timezone
        from django.db.models import Q
        
        # Get all unique request products from the steps (including already archived ones for checking)
        if include_archived:
            temp_all_steps = ProductProcess.objects.all()
        else:
            temp_all_steps = ProductProcess.objects.filter(archived_at__isnull=True)
            
        request_product_ids = temp_all_steps.values_list('request_product_id', flat=True).distinct()
        
        for rp_id in request_product_ids:
            try:
                rp = RequestProduct.objects.get(id=rp_id)
                
                # Check if this request product should be archived
                if rp.archived_at is None:  # Only archive if not already archived
                    # Get all non-archived steps for this request product
                    rp_steps = ProductProcess.objects.filter(
                        request_product_id=rp_id,
                        archived_at__isnull=True
                    )
                    
                    if rp_steps.exists():
                        # Check if all steps are completed
                        all_completed = rp_steps.filter(is_completed=True).count() == rp_steps.count()
                        
                        if all_completed:
                            print(f"[AUTO-ARCHIVE] Archiving request product {rp_id} - all {rp_steps.count()} steps completed")
                            rp.archived_at = timezone.now()
                            rp.save(update_fields=['archived_at'])
            except RequestProduct.DoesNotExist:
                pass
            except Exception as e:
                print(f"[AUTO-ARCHIVE ERROR] Error archiving request product {rp_id}: {str(e)}")

        serializer = ProductProcessSerializer(all_steps, many=True)
        return JsonResponse(serializer.data, safe=False)

    elif request.method == 'PATCH':
        try:
            print(f"\n[DEBUG PATCH START] URL id parameter: {id}, type: {type(id)}")
            data = JSONParser().parse(request)
            print(f"[DEBUG PATCH] Received data: {data}")
            step = ProductProcess.objects.get(id=id)
            print(f"[DEBUG PATCH] Retrieved ProductProcess: id={step.id}, step_order={step.step_order}, process={step.process.name}")

            # Check if this is a template record (no request_product assigned)
            if not step.request_product:
                return JsonResponse(
                    {"error": "Cannot update template ProductProcess. This record has no associated request."},
                    status=400
                )

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

            # Handle completed_quota
            if 'completed_quota' in data:
                print(f"[DEBUG PATCH] Setting completed_quota: {data['completed_quota']} on step id={step.id} (step_order={step.step_order})")
                step.completed_quota = data['completed_quota']
                step.save()
                print(f"[DEBUG PATCH] After save - DB now has: ProductProcess id={step.id}, completed_quota={step.completed_quota}")
                print(f"[DEBUG PATCH] Updated ProductProcess {id}: completed_quota={step.completed_quota}, request_product={step.request_product.id}, request={step.request_product.request.RequestID}")
                step.mark_completed_if_ready()

            # Handle defect_count
            if 'defect_count' in data:
                print(f"[DEBUG PATCH] Setting defect_count: {data['defect_count']} on step id={step.id} (step_order={step.step_order})")
                step.defect_count = data['defect_count']
                step.save()
                print(f"[DEBUG PATCH] After save - DB now has: ProductProcess id={step.id}, defect_count={step.defect_count}")

            # Handle workers separately for M2M relationship
            if 'workers' in data:
                workers_data = data.get('workers', [])
                print(f"DEBUG: Updating workers for ProductProcess {id} with workers: {workers_data}")
                try:
                    step.workers.set(workers_data)
                    print(f"DEBUG: Workers set successfully. Current workers: {list(step.workers.all())}")
                    # Verify workers are actually saved
                    saved_workers = list(step.workers.values_list('WorkerID', flat=True))
                    print(f"DEBUG: Verified workers in DB: {saved_workers}")
                except Exception as e:
                    print(f"ERROR setting workers: {str(e)}")
                    raise

            # Update the remaining fields via serializer (excluding workers since we handled it)
            data_for_serializer = {k: v for k, v in data.items() if k != 'workers'}
            serializer = ProductProcessSerializer(step, data=data_for_serializer, partial=True)
            if serializer.is_valid():
                updated_step = serializer.save()
                print(f"[DEBUG PATCH] Serializer save successful for id={updated_step.id}, completed_quota={updated_step.completed_quota}")

                # Audit log entry
                try:
                    AuditLog.objects.create(
                        request=request_instance,
                        request_product=request_product,
                        action_type="update",
                        old_value=json.dumps(old_snapshot),
                        new_value=json.dumps(ProductProcessSerializer(updated_step).data),
                        performed_by=request.user
                    )
                except Exception as audit_err:
                    print(f"[DEBUG] Warning: Failed to create audit log: {audit_err}")

                # Create notification for the customer (requester) about task status update
                try:
                    import os
                    log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"[TASK_UPDATE] Creating notifications for task update\n")
                    
                    if request_instance.requester:
                        task_status = request_product.task_status()
                        create_notification(
                            user=request_instance.requester,
                            notification_type='task_status_updated',
                            title='Task Status Updated',
                            message=f'Task status for {request_product.product.prodName} has been updated to {task_status}',
                            related_request=request_instance
                        )
                        with open(log_file, 'a', encoding='utf-8') as f:
                            f.write(f"[TASK_UPDATE] Created notif for requester: {request_instance.requester.username}\n")
                except Exception as notif_err:
                    import os
                    log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"[TASK_UPDATE] ERROR creating customer notification: {str(notif_err)}\n")
                
                # Create notification for the user who updated the task
                try:
                    task_status = request_product.task_status()
                    create_notification(
                        user=request.user,
                        notification_type='task_status_updated',
                        title='Task Updated',
                        message=f'You updated task for {request_product.product.prodName} to {task_status}',
                        related_request=request_instance
                    )
                    import os
                    log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"[TASK_UPDATE] Created notif for updater: {request.user.username}\n")
                except Exception as notif_err:
                    import os
                    log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"[TASK_UPDATE] ERROR creating updater notification: {str(notif_err)}\n")
                
                # Create notification for all admin/manager users about task update
                try:
                    admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
                    for admin_user in admin_users:
                        task_status = request_product.task_status()
                        create_notification(
                            user=admin_user,
                            notification_type='task_status_updated',
                            title='Task Progress Updated',
                            message=f'Task for {request_product.product.prodName} (Request #{request_instance.RequestID}) has been updated to {task_status}',
                            related_request=request_instance
                        )
                    import os
                    log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"[TASK_UPDATE] Created notifs for {admin_users.count()} admin users\n")
                except Exception as notif_err:
                    import os
                    log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"[TASK_UPDATE] ERROR creating admin notifications: {str(notif_err)}\n")

                print(f"[DEBUG PATCH END] Returning success response for step id={updated_step.id}")
                return JsonResponse({
                    "message": "Step updated successfully!",
                    "updated_step": ProductProcessSerializer(updated_step).data
                }, status=200)
            print(f"[DEBUG PATCH ERROR] Serializer validation failed: {serializer.errors}")
            return JsonResponse(serializer.errors, status=400)
        
        except ProductProcess.DoesNotExist:
            return JsonResponse(
                {"error": f"ProductProcess with ID {id} not found"},
                status=404
            )
        except Exception as e:
            print(f"\n[ERROR] Unexpected error in PATCH handler: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse(
                {"error": f"Server error: {str(e)}"},
                status=500
            )

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
        
        # Check if this is a template record (no request_product assigned)
        if not step.request_product:
            return JsonResponse(
                {"error": "Cannot delete template ProductProcess. This record has no associated request."},
                status=400
            )
        
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

# @role_required('admin')
# @csrf_exempt
# def producttemplateAPI(request, id=0):
#     if request.method == 'GET':
#         prodtemp = ProcessTemplate.objects.all()
#         prodtemp_serializer = ProcessTemplateSerializer(prodtemp, many=True)
#         return JsonResponse(prodtemp_serializer.data, safe=False)

#     elif request.method == 'POST':
#         prodtemp_data = JSONParser().parse(request)
#         prodtemp_serializer = ProcessTemplateSerializer(data=prodtemp_data)
#         if prodtemp_serializer.is_valid():
#             prodtemp_serializer.save()
#             return JsonResponse("Added successfully!", safe=False)
#         return JsonResponse("Failed to add", safe=False)

#     elif request.method == 'PUT':
#         prodtemp_data = JSONParser().parse(request)
#         prodtemp = ProcessTemplate.objects.get(id=prodtemp_data["id"])
#         prodtemp_serializer = ProcessTemplateSerializer(prodtemp, data=prodtemp_data)
#         if prodtemp_serializer.is_valid():
#             prodtemp_serializer.save()
#             return JsonResponse("Updated successfully!", safe=False)
#         return JsonResponse("Failed to update", safe=False)

#     elif request.method == 'DELETE':
#         prodtemp = get_object_or_404(ProcessTemplate, id=id)
#         prodtemp.delete()
#         return JsonResponse("Deleted successfully!", safe=False)

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
    # id can be either ProductProcess ID or RequestProduct ID
    # Try to find RequestProduct first, then look up via ProductProcess if needed
    request_product = None
    
    try:
        # First try as RequestProduct ID
        request_product = RequestProduct.objects.get(id=id)
    except RequestProduct.DoesNotExist:
        try:
            # If not found, try as ProductProcess ID
            product_process = ProductProcess.objects.get(id=id)
            request_product = product_process.request_product
        except ProductProcess.DoesNotExist:
            return JsonResponse({"detail": "ProductProcess or RequestProduct not found"}, status=404)

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
    # Filter by updated_at date (more reliable than production_date)
    base_qs = ProductProcess.objects.filter(
        updated_at__month=month,
        updated_at__year=year,
        request_product__isnull=False  # Only actual tasks, not templates
    )

    print(f"[get_final_step_processes] Base query found {base_qs.count()} ProductProcess for {month}/{year}")

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
    print(f"[get_final_step_processes] Final step query found {final_qs.count()} ProductProcess")

    # Apply archive filtering only if include_archived is False
    if not include_archived:
        # Show items that are either not archived OR are completed (done work visible by default)
        # Also allow archived RequestProducts if the task inside is completed
        final_qs = final_qs.filter(
            (Q(archived_at__isnull=True) | Q(is_completed=True)) &  # Show non-archived OR completed tasks
            Q(request_product__request__archived_at__isnull=True) &  # But requests must not be archived
            (Q(request_product__archived_at__isnull=True) | Q(is_completed=True))  # Allow archived request products if task is completed
        )
        print(f"[get_final_step_processes] After filtering (include_archived=False): {final_qs.count()} ProductProcess")
    else:
        # Show ALL items - no filters applied
        print(f"[get_final_step_processes] include_archived=True: showing all {final_qs.count()} ProductProcess without filters")

    return final_qs

@require_http_methods(['GET'])
@role_required('admin', 'manager')
def bar_report(request):
    today = date.today()
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


# def get_bar_report_data(month, year, include_archived=False):
#     days_in_month = calendar.monthrange(year, month)[1]
#     num_weeks = (days_in_month + 6) // 7
#     weekly_data = {i: {"defects": 0, "completed": 0} for i in range(1, num_weeks+1)}

#     final_processes = get_final_step_processes(month, year, include_archived)

#     for p in final_processes:
#         if p.production_date:
#             week = (p.production_date.day - 1) // 7 + 1
#             weekly_data[week]["defects"] += p.defect_count
#             weekly_data[week]["completed"] += p.completed_quota

#     return weekly_data

def get_bar_report_data(month, year, include_archived=False):
    import calendar
    
    # Get all ProductProcess for this month (not just final steps)
    base_qs = ProductProcess.objects.filter(
        updated_at__month=month,
        updated_at__year=year,
        request_product__isnull=False  # Only actual tasks, not templates
    )

    if not include_archived:
        # Filter out archived items
        base_qs = base_qs.filter(
            archived_at__isnull=True,
            request_product__archived_at__isnull=True
        )

    print(f"[get_bar_report_data] Base query found {base_qs.count()} ProductProcess for {month}/{year}")

    # Group by week
    days_in_month = calendar.monthrange(year, month)[1]
    num_weeks = (days_in_month + 6) // 7
    weekly_data = {i: {"completed": 0, "defects": 0, "products": []} for i in range(1, num_weeks+1)}

    # Track which request_products we've already counted (to avoid double-counting steps)
    counted_request_products = set()

    # Process only the current step for each request product
    for process in base_qs:
        rp = process.request_product
        if rp:
            rp_id = rp.id
            
            # Skip if we already counted this request product
            if rp_id in counted_request_products:
                continue
            
            # Find the current step (first incomplete) for this request product
            current_step = rp.process_steps.filter(
                archived_at__isnull=True
            ).order_by('step_order').exclude(is_completed=True).first()
            
            # If no incomplete step, use the last completed step
            if not current_step:
                current_step = rp.process_steps.filter(
                    archived_at__isnull=True
                ).order_by('-step_order').first()
            
            if current_step and current_step.updated_at:
                week = (current_step.updated_at.day - 1) // 7 + 1
                
                # Get product name
                product_name = "Unknown"
                try:
                    if rp.product:
                        product_name = rp.product.prodName
                except Exception as e:
                    print(f"[get_bar_report_data] Error getting product name: {str(e)}")
                
                # Add the current step's data
                weekly_data[week]["completed"] += current_step.completed_quota
                weekly_data[week]["defects"] += current_step.defect_count
                
                # Store product name for hover display
                if product_name not in weekly_data[week]["products"]:
                    weekly_data[week]["products"].append(product_name)
                
                counted_request_products.add(rp_id)

    print(f"[get_bar_report_data] Bar data: {weekly_data}")
    return weekly_data




# @require_http_methods(['GET'])
# @role_required('admin', 'manager')
# def pie_report(request):
#     today = datetime.date.today()
#     month = int(request.GET.get("month", today.month))
#     year  = int(request.GET.get("year", today.year))
#     include_archived = request.GET.get("include_archived", "false").lower() == "true"

#     active_qty = 0
#     completed_qty = 0
#     rejected_qty = 0

#     final_processes = get_final_step_processes(month, year, include_archived)

#     for p in final_processes:
#         if p.is_completed:
#             completed_qty += p.completed_quota
#         else:
#             active_qty += p.completed_quota
#         rejected_qty += p.defect_count

#     total = active_qty + completed_qty + rejected_qty
#     pct = lambda n: round((n / total) * 100, 2) if total else 0

#     labels = ["In Progress", "Completed", "Rejected"]
#     data   = [pct(active_qty), pct(completed_qty), pct(rejected_qty)]

#     return JsonResponse({
#         "labels": labels,
#         "data": data,
#         "raw": [active_qty, completed_qty, rejected_qty],
#         "total": total
#     })
@require_http_methods(['GET'])
@role_required('admin', 'manager')
def pie_report(request):
    today = date.today()
    month = int(request.GET.get("month", today.month))
    year  = int(request.GET.get("year", today.year))
    include_archived = request.GET.get("include_archived", "false").lower() == "true"

    active_qty = 0
    completed_qty = 0
    rejected_qty = 0

    final_processes = get_final_step_processes(month, year, include_archived)

    for p in final_processes:
        # 🔧 Recalculate totals from logs for this final step
        totals = ProcessProgress.objects.filter(product_process=p).aggregate(
            total_quota=Sum('completed_quota'),
            total_defects=Sum('defect_count')
        )
        quota = totals['total_quota'] or 0
        defects = totals['total_defects'] or 0

        if p.is_completed:
            completed_qty += quota
        else:
            active_qty += quota
        rejected_qty += defects

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


@require_http_methods(['GET'])
@role_required('admin', 'manager')
def top_movers(request):
    """Get top products by quantity completed this month"""
    today = date.today()
    month = int(request.GET.get("month", today.month))
    year = int(request.GET.get("year", today.year))
    include_archived = request.GET.get("include_archived", "false").lower() == "true"
    limit = int(request.GET.get("limit", 6))
    
    try:
        # Get all ProductProcess records for this month
        queryset = ProductProcess.objects.filter(
            updated_at__year=year,
            updated_at__month=month,
            is_completed=True
        )
        
        if not include_archived:
            queryset = queryset.filter(archived_at__isnull=True)
        
        # Group by product and sum completed quantities
        product_totals = list(
            queryset
            .values("request_product__product__prodName")
            .annotate(total_qty=Sum("completed_quota"))
            .filter(total_qty__gt=0)
            .order_by("-total_qty")[:limit-1]  # limit-1 to reserve space for "All Other"
        )
        
        # Get top products
        top_items = [{"item": p["request_product__product__prodName"], "value": p["total_qty"] or 0} for p in product_totals]
        
        # Calculate "All Other" sum
        top_item_names = [p["request_product__product__prodName"] for p in product_totals]
        all_other = queryset.exclude(
            request_product__product__prodName__in=top_item_names
        ).aggregate(total=Sum("completed_quota"))["total"] or 0
        
        if all_other > 0:
            top_items.append({"item": "All Other", "value": all_other})
        
        return JsonResponse({
            "top_movers": top_items
        })
    
    except Exception as e:
        print(f"Error in top_movers: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)

def get_pie_report_data(month, year, include_archived=False):
    """
    Get production percentages from ALL task steps
    Shows: In Progress (units still being worked on), Completed (finished units), Rejected (defects)
    Note: We track the CURRENT step's progress for each product, not sum across steps (to avoid double-counting)
    """
    active_qty = 0
    completed_qty = 0
    rejected_qty = 0

    # Get ALL ProductProcess records within the date range (not just final steps)
    base_qs = ProductProcess.objects.filter(
        updated_at__month=month,
        updated_at__year=year,
        request_product__isnull=False  # Only actual tasks, not templates
    )

    if not include_archived:
        # Filter out archived items
        base_qs = base_qs.filter(
            archived_at__isnull=True,
            request_product__archived_at__isnull=True
        )

    # Track which request_products we've already counted (to avoid double-counting steps)
    counted_request_products = set()

    # Calculate quantities by completion status
    for process in base_qs:
        rp = process.request_product
        if rp:
            rp_id = rp.id
            
            # Skip if we already counted this request product
            # We only count the CURRENT step's progress, not all steps
            if rp_id in counted_request_products:
                continue
            
            # Find the current step (first incomplete) for this request product
            current_step = rp.process_steps.filter(
                archived_at__isnull=True
            ).order_by('step_order').exclude(is_completed=True).first()
            
            # If no incomplete step, use the last completed step
            if not current_step:
                current_step = rp.process_steps.filter(
                    archived_at__isnull=True
                ).order_by('-step_order').first()
            
            if current_step:
                # For completed request products: count completed quota
                if rp.process_steps.filter(archived_at__isnull=True).count() == rp.process_steps.filter(is_completed=True, archived_at__isnull=True).count():
                    # All steps completed
                    completed_qty += current_step.completed_quota
                else:
                    # Still in progress: add remaining quantity
                    remaining = rp.quantity - current_step.completed_quota
                    if remaining > 0:
                        active_qty += remaining
                
                # All defects from current step
                rejected_qty += current_step.defect_count
                
                counted_request_products.add(rp_id)

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
    try:
        # Get query parameter to filter by status: 'pending', 'active', or 'all'
        status = request.GET.get('status', 'pending').lower()
        
        if status == 'pending':
            # Only unverified users
            raw_users = UserProfile.objects.filter(is_verified=False).values(
                "id", "user__username", "full_name", "company_name", "contact_number", "role", "is_verified", "verified_at", "created_at", "user__email"
            )
        elif status == 'active':
            # Only verified users
            raw_users = UserProfile.objects.filter(is_verified=True).values(
                "id", "user__username", "full_name", "company_name", "contact_number", "role", "is_verified", "verified_at", "created_at", "user__email"
            )
        else:  # 'all' or any other value
            # All users
            raw_users = UserProfile.objects.all().values(
                "id", "user__username", "full_name", "company_name", "contact_number", "role", "is_verified", "verified_at", "created_at", "user__email"
            )
        
        users = [
            {
                "id": u["id"],
                "username": u["user__username"],
                "email": u["user__email"],
                "full_name": u["full_name"],
                "company_name": u["company_name"],
                "contact_number": u["contact_number"],
                "role": u["role"],
                "is_verified": u["is_verified"],
                "verified_at": u["verified_at"].strftime("%Y-%m-%d %H:%M") if u["verified_at"] else None,
                "created_at": u["created_at"].strftime("%Y-%m-%d %H:%M") if u["created_at"] else None
            }
            for u in raw_users
        ]
        return JsonResponse(users, safe=False)
    except Exception as e:
        print(f"Error in list_users: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"detail": f"Server error: {str(e)}"}, status=500)

@require_http_methods(['GET'])
@csrf_exempt
def pending_signups(request):
    """Get all unverified user signups"""
    try:
        raw_users = UserProfile.objects.filter(is_verified=False).values(
            "id", "user__username", "full_name", "company_name", "contact_number", "role", "is_verified", "created_at", "user__email"
        )
        users = [
            {
                "id": u["id"],
                "username": u["user__username"],
                "email": u["user__email"],
                "full_name": u["full_name"],
                "company_name": u["company_name"],
                "contact_number": u["contact_number"],
                "role": u["role"],
                "is_verified": u["is_verified"],
                "created_at": u["created_at"].strftime("%Y-%m-%d %H:%M") if u["created_at"] else None
            }
            for u in raw_users
        ]
        return JsonResponse(users, safe=False)
    except Exception as e:
        print(f"Error in pending_signups: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"detail": f"Server error: {str(e)}"}, status=500)

@require_http_methods(['POST'])
@csrf_exempt
def approve_signup(request):
    """Approve a pending signup"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        
        if not username:
            return JsonResponse({"error": "Username is required"}, status=400)
        
        user = User.objects.filter(username=username).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=404)
        
        profile = UserProfile.objects.filter(user=user).first()
        if not profile:
            return JsonResponse({"error": "User profile not found"}, status=404)
        
        profile.is_verified = True
        profile.verified_at = timezone.now()
        profile.save()
        
        return JsonResponse({
            "message": "User approved successfully",
            "username": username,
            "is_verified": True
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(['POST'])
@csrf_exempt
def decline_signup(request):
    """Decline a pending signup by deleting the user"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        
        if not username:
            return JsonResponse({"error": "Username is required"}, status=400)
        
        user = User.objects.filter(username=username).first()
        if not user:
            return JsonResponse({"error": "User not found"}, status=404)
        
        # Delete the user (this will cascade delete the profile)
        user.delete()
        
        return JsonResponse({
            "message": "User declined and deleted successfully",
            "username": username
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(['GET'])
@require_http_methods(['GET'])
@role_required('admin', 'manager')
@csrf_exempt
def full_report_csv(request):
    try:
        today = date.today()
        month = int(request.GET.get("month", today.month))
        year  = int(request.GET.get("year", today.year))
        limit = int(request.GET.get("limit", 5))

        include_archived = request.GET.get("include_archived", "false").lower() == "true"

        print(f"[DEBUG] full_report_csv: month={month}, year={year}, limit={limit}, include_archived={include_archived}")

        bar_data   = get_bar_report_data(month, year, include_archived)
        print(f"[DEBUG] bar_data retrieved: {len(bar_data)} weeks")
        
        pie_data   = get_pie_report_data(month, year, include_archived)
        print(f"[DEBUG] pie_data retrieved: {pie_data}")
        
        donut_data = get_donut_top_products(month, year, limit, include_archived)
        print(f"[DEBUG] donut_data retrieved: {len(donut_data)} products")

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
            product_name = p.get("request_product__product__prodName", "Unknown")
            total_quota = p.get("total_quota", 0)
            writer.writerow([product_name, total_quota])

        print(f"[DEBUG] CSV report generated successfully")
        return response
    except Exception as e:
        print(f"[ERROR] full_report_csv failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


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

@require_http_methods(['POST', 'PATCH'])
@require_http_methods(['POST', 'PATCH'])
@csrf_exempt
def archive_task(request, id):
    """Archive a task (soft delete by setting archived_at timestamp)"""
    try:
        print(f'\n========== DEBUG archive_task START ==========')
        print(f'Request method: {request.method}')
        print(f'Request path: {request.path}')
        print(f'Task ID: {id}')
        print(f'User: {request.user}')
        print(f'User authenticated: {request.user.is_authenticated}')
        
        # Check authentication
        if not request.user.is_authenticated:
            print(f'ERROR: User not authenticated')
            return JsonResponse({
                "error": "Authentication required",
                "detail": "Please log in to archive tasks"
            }, status=401)
        
        # Check role
        profile = getattr(request.user, 'userprofile', None)
        if not profile:
            print(f'ERROR: User has no profile')
            return JsonResponse({
                "error": "User profile not found",
                "detail": "Contact administrator"
            }, status=500)
            
        print(f'User role: {profile.role}')
        if profile.role not in ['admin', 'manager']:
            print(f'ERROR: User role not allowed: {profile.role}')
            return JsonResponse({
                "error": "Permission denied",
                "detail": f"Only admin and manager can archive tasks. Your role: {profile.role}"
            }, status=403)
        
        print(f'✓ Authentication and authorization passed')
        
        # Get the task
        try:
            task = ProductProcess.objects.get(id=id)
            print(f'✓ Found task {id}')
        except ProductProcess.DoesNotExist:
            print(f'ERROR: Task {id} not found')
            return JsonResponse({
                "error": "Task not found",
                "task_id": id
            }, status=404)
        
        # Archive it in a transaction to ensure it commits
        with transaction.atomic():
            old_value = str(task.archived_at)
            now = timezone.now()
            
            print(f'Setting archived_at: {old_value} → {now}')
            task.archived_at = now
            task.save()
            print(f'✓ Task saved')
            
            # Verify
            check_task = ProductProcess.objects.get(id=id)
            print(f'✓ Verification - archived_at in DB: {check_task.archived_at}')

            # Log it
            try:
                AuditLog.objects.create(
                    request=task.request_product.request,
                    action_type="archive",
                    old_value=old_value,
                    new_value=str(now),
                    performed_by=request.user
                )
                print(f'✓ Audit log created')
            except Exception as audit_err:
                print(f'WARNING: Could not create audit log: {str(audit_err)}')

        # Double-check after transaction
        print(f'Checking after transaction...')
        final_check = ProductProcess.objects.get(id=id)
        print(f'Final archived_at value: {final_check.archived_at}')
        
        print(f'========== DEBUG archive_task SUCCESS ==========\n')
        return JsonResponse({
            "success": True,
            "message": f"Task {id} archived successfully!",
            "archived_at": final_check.archived_at.isoformat() if final_check.archived_at else None
        }, status=200)
        
    except Exception as e:
        print(f'========== DEBUG archive_task EXCEPTION ==========')
        print(f'Exception type: {type(e).__name__}')
        print(f'Exception: {str(e)}')
        import traceback
        traceback.print_exc()
        print(f'========== END EXCEPTION ==========\n')
        return JsonResponse({
            "error": str(e),
            "detail": "An unexpected error occurred while archiving the task"
        }, status=500)

@require_http_methods(['POST', 'PATCH'])
@role_required('admin', 'manager')
@csrf_exempt
def unarchive_task(request, id):
    try:
        task = ProductProcess.objects.get(id=id)
    except ProductProcess.DoesNotExist:
        return JsonResponse({"error": "Task not found"}, status=404)

    old_value = str(task.archived_at)
    task.archived_at = None
    task.save()

    new_value = str(task.archived_at)

    AuditLog.objects.create(
        request=task.request_product.request,
        action_type="unarchive",
        old_value=old_value,
        new_value=new_value,
        performed_by=request.user
    )

    return JsonResponse({
        "message": f"Task {id} unarchived successfully!",
        "archived_at": task.archived_at
    }, status=200)

@require_http_methods(['GET'])
@role_required('admin', 'manager')
@csrf_exempt
@role_required('admin', 'manager')
@csrf_exempt
def get_archived_tasks(request):
    try:
        print(f'[get_archived_tasks] Request from user: {request.user}')
        
        archived_tasks = ProductProcess.objects.filter(archived_at__isnull=False).select_related(
            'request_product',
            'request_product__request',
            'process'
        ).values(
            'id',
            'request_product__product__prodName',
            'request_product__quantity',
            'completed_quota',
            'defect_count',
            'process__name',
            'archived_at',
            'request_product__request__RequestID'
        ).order_by('-archived_at')
        
        print(f'[get_archived_tasks] Found {archived_tasks.count()} archived tasks')
        
        return JsonResponse({
            "archived_tasks": list(archived_tasks)
        }, status=200)
    except Exception as e:
        print(f'[get_archived_tasks] Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return JsonResponse({
            "error": str(e),
            "detail": "Failed to fetch archived tasks"
        }, status=500)

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
@require_http_methods(['GET', 'PATCH'])
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

    if request.method == 'PATCH' and id:
        # Archive a request product
        try:
            request_product = RequestProduct.objects.get(id=id)
            data = JSONParser().parse(request)
            
            if 'archived_at' in data:
                from django.utils import timezone
                request_product.archived_at = timezone.now()
                request_product.save()
                
                # Create notification for requester
                try:
                    req = request_product.request
                    if req.requester:
                        create_notification(
                            user=req.requester,
                            notification_type='product_completed',
                            title=f'Product Completed: {request_product.product.prodName}',
                            message=f'All production steps for {request_product.product.prodName} in Request #{req.RequestID} have been completed.',
                            related_request=req
                        )
                except Exception as notif_err:
                    print(f"[DEBUG] Failed to create requester notification: {notif_err}")
                
                # Create notification for admin/managers
                try:
                    req = request_product.request
                    admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
                    for admin_user in admin_users:
                        create_notification(
                            user=admin_user,
                            notification_type='product_completed',
                            title=f'Product Completed: {request_product.product.prodName}',
                            message=f'{request_product.product.prodName} for Request #{req.RequestID} is now complete.',
                            related_request=req
                        )
                except Exception as notif_err:
                    print(f"[DEBUG] Failed to create admin notifications: {notif_err}")
                
                return JsonResponse({
                    "message": "Request product archived successfully",
                    "id": request_product.id,
                    "archived_at": request_product.archived_at
                }, status=200)
            
            return JsonResponse({"error": "No archived_at provided"}, status=400)
        except RequestProduct.DoesNotExist:
            return JsonResponse({"error": "Request product not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
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


# @csrf_exempt
# @role_required('admin', 'manager')
# def processProgressAPI(request, id=0):
#     if request.method == 'GET':
#         product_process_id = request.GET.get("product_process")
#         logged_from = request.GET.get("logged_from")
#         logged_to = request.GET.get("logged_to")

#         progress = ProcessProgress.objects.all()

#         if product_process_id:
#             progress = progress.filter(product_process=product_process_id)

#         if logged_from:
#             try:
#                 logged_from_date = datetime.datetime.strptime(logged_from, "%Y-%m-%d").date()
#                 progress = progress.filter(logged_at__gte=logged_from_date)
#             except ValueError:
#                 pass

#         if logged_to:
#             try:
#                 logged_to_date = datetime.datetime.strptime(logged_to, "%Y-%m-%d").date()
#                 progress = progress.filter(logged_at__lte=logged_to_date)
#             except ValueError:
#                 pass

#         serializer = ProcessProgressSerializer(progress.order_by('-logged_at'), many=True)
#         return JsonResponse(serializer.data, safe=False)

#     elif request.method == 'POST':
#         data = JSONParser().parse(request)
#         serializer = ProcessProgressSerializer(data=data, context={'request': request})
#         if serializer.is_valid():
#             new_progress = serializer.save()

#             # sync back to ProductProcess
#             parent = new_progress.product_process
#             parent.completed_quota = new_progress.completed_quota
#             parent.defect_count = new_progress.defect_count
#             parent.save()

#             AuditLog.objects.create(
#                 action_type="create",
#                 new_value=json.dumps(serializer.data),
#                 performed_by=request.user
#             )
#             return JsonResponse({"message": "Progress added successfully!"}, status=201)
#         return JsonResponse(serializer.errors, status=400)

#     elif request.method == 'PATCH':
#         data = JSONParser().parse(request)
#         try:
#             progress_instance = ProcessProgress.objects.get(id=id)
#         except ProcessProgress.DoesNotExist:
#             return JsonResponse({"error": "Progress not found"}, status=404)

#         old_snapshot = ProcessProgressSerializer(progress_instance).data

#         serializer = ProcessProgressSerializer(progress_instance, data=data, partial=True, context={'request': request})
#         if serializer.is_valid():
#             updated_instance = serializer.save()

#             # 👉 sync back to ProductProcess
#             parent = updated_instance.product_process
#             parent.completed_quota = updated_instance.completed_quota
#             parent.defect_count = updated_instance.defect_count
#             parent.save()

#             AuditLog.objects.create(
#                 action_type="update",
#                 old_value=json.dumps(old_snapshot),
#                 new_value=json.dumps(serializer.data),
#                 performed_by=request.user
#             )
#             return JsonResponse({"message": "Progress updated successfully!"}, status=200)
#         return JsonResponse(serializer.errors, status=400)

#     elif request.method == 'DELETE':
#         try:
#             progress_instance = ProcessProgress.objects.get(id=id)
#         except ProcessProgress.DoesNotExist:
#             return JsonResponse({"error": "Progress not found"}, status=404)

#         old_snapshot = ProcessProgressSerializer(progress_instance).data
#         progress_instance.delete()

#         AuditLog.objects.create(
#             action_type="delete",
#             old_value=json.dumps(old_snapshot),
#             performed_by=request.user
#         )
#         return JsonResponse({"message": "Progress deleted successfully!"}, status=200)

@role_required('admin')
@csrf_exempt
def producttemplateAPI(request, id=0):
    if request.method == 'GET':
        prodtemp = ProcessTemplate.objects.all()
        prodtemp_serializer = ProcessTemplateSerializer(prodtemp, many=True)
        return JsonResponse(prodtemp_serializer.data, safe=False)

    elif request.method == 'POST':
        data = JSONParser().parse(request)

        # Expecting JSON like:
        # {
        #   "product_name": "BRACKET 0080",
        #   "processes": [
        #       {"name": "Blanking", "step_order": 1},
        #       {"name": "Forming", "step_order": 2}
        #   ]
        # }

        product, _ = ProductName.objects.get_or_create(prodName=data["product_name"])
        results = []

        for proc in data.get("processes", []):
            process, _ = ProcessName.objects.get_or_create(name=proc["name"])
            template, created = ProcessTemplate.objects.get_or_create(
                product_name=product,
                process=process,
                defaults={"step_order": proc["step_order"]}
            )
            results.append({
                "process": process.name,
                "step_order": template.step_order,
                "created": created
            })

        return JsonResponse({"message": "Bulk seeding complete", "results": results}, safe=False)

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

# @csrf_exempt
# @role_required('admin', 'manager')
# def processProgressAPI(request, id=0):
#     if request.method == 'GET':
#         product_process_id = request.GET.get("product_process")
#         logged_from = request.GET.get("logged_from")
#         logged_to = request.GET.get("logged_to")

#         progress = ProcessProgress.objects.all()

#         if product_process_id:
#             progress = progress.filter(product_process=product_process_id)

#         if logged_from:
#             try:
#                 logged_from_date = datetime.datetime.strptime(logged_from, "%Y-%m-%d").date()
#                 progress = progress.filter(logged_at__gte=logged_from_date)
#             except ValueError:
#                 pass

#         if logged_to:
#             try:
#                 logged_to_date = datetime.datetime.strptime(logged_to, "%Y-%m-%d").date()
#                 progress = progress.filter(logged_at__lte=logged_to_date)
#             except ValueError:
#                 pass

#         serializer = ProcessProgressSerializer(progress.order_by('-logged_at'), many=True)
#         return JsonResponse(serializer.data, safe=False)

#     elif request.method == 'POST':
#         data = JSONParser().parse(request)
#         serializer = ProcessProgressSerializer(data=data, context={'request': request})
#         if serializer.is_valid():
#             new_progress = serializer.save()

#             parent = new_progress.product_process
#             # ✅ Increment totals
#             parent.completed_quota += new_progress.completed_quota
#             parent.defect_count += new_progress.defect_count
#             parent.mark_completed_if_ready()
#             parent.save(update_fields=['completed_quota', 'defect_count', 'is_completed', 'updated_at'])

#             AuditLog.objects.create(
#                 action_type="create",
#                 new_value=json.dumps(serializer.data),
#                 performed_by=request.user
#             )
#             return JsonResponse({"message": "Progress added successfully!"}, status=201)
#         return JsonResponse(serializer.errors, status=400)

#     elif request.method == 'PATCH':
#         data = JSONParser().parse(request)
#         try:
#             progress_instance = ProcessProgress.objects.get(id=id)
#         except ProcessProgress.DoesNotExist:
#             return JsonResponse({"error": "Progress not found"}, status=404)

#         old_snapshot = ProcessProgressSerializer(progress_instance).data

#         serializer = ProcessProgressSerializer(progress_instance, data=data, partial=True, context={'request': request})
#         if serializer.is_valid():
#             updated_instance = serializer.save()

#             parent = updated_instance.product_process
#             # ✅ Recalculate totals only for the final step of this RequestProduct
#             final_step = (
#                 ProductProcess.objects
#                 .filter(request_product=parent.request_product)
#                 .order_by('-step_order')
#                 .first()
#             )
#             if final_step:
#                 totals = ProcessProgress.objects.filter(product_process=final_step).aggregate(
#                     total_quota=Sum('completed_quota'),
#                     total_defects=Sum('defect_count')
#                 )
#                 final_step.completed_quota = totals['total_quota'] or 0
#                 final_step.defect_count = totals['total_defects'] or 0
#                 final_step.mark_completed_if_ready()
#                 final_step.save(update_fields=['completed_quota', 'defect_count', 'is_completed', 'updated_at'])

#             AuditLog.objects.create(
#                 action_type="update",
#                 old_value=json.dumps(old_snapshot),
#                 new_value=json.dumps(serializer.data),
#                 performed_by=request.user
#             )
#             return JsonResponse({"message": "Progress updated successfully!"}, status=200)
#         return JsonResponse(serializer.errors, status=400)

#     elif request.method == 'DELETE':
#         try:
#             progress_instance = ProcessProgress.objects.get(id=id)
#         except ProcessProgress.DoesNotExist:
#             return JsonResponse({"error": "Progress not found"}, status=404)

#         old_snapshot = ProcessProgressSerializer(progress_instance).data
#         progress_instance.delete()

#         AuditLog.objects.create(
#             action_type="delete",
#             old_value=json.dumps(old_snapshot),
#             performed_by=request.user
#         )
#         return JsonResponse({"message": "Progress deleted successfully!"}, status=200)

@csrf_exempt
# @login_required
@role_required('admin')
@require_http_methods(["DELETE"])
def delete_user(request, id):
    try:
        user = User.objects.get(pk=id)
        user.delete()
        return JsonResponse({"detail": f"User {id} deleted successfully."}, status=200)
    except User.DoesNotExist:
        return JsonResponse({"detail": "User not found."}, status=400)

# ============== DASHBOARD VIEWS ==============


@csrf_exempt
@require_http_methods(["GET"])
def get_settings(request):
    """
    Get system settings
    GET /app/settings/
    
    Returns: All system settings (accessible to authenticated users)
    """
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    
    try:
        settings_obj = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings_obj)
        return JsonResponse(serializer.data, status=200)
    except Exception as e:
        print(f"Error fetching settings: {str(e)}")
        return JsonResponse({"detail": f"Server error: {str(e)}"}, status=500)


@csrf_exempt
@role_required('admin')
@require_http_methods(["PUT", "PATCH"])
def update_settings(request):
    """
    Update system settings
    PUT/PATCH /app/settings/
    
    Only accessible to admins
    """
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    
    try:
        data = json.loads(request.body)
        settings_obj = SystemSettings.get_settings()
        
        # Update fields
        if 'session_timeout_minutes' in data:
            settings_obj.session_timeout_minutes = data['session_timeout_minutes']
        if 'enable_session_timeout' in data:
            settings_obj.enable_session_timeout = data['enable_session_timeout']
        if 'enable_auto_archive' in data:
            settings_obj.enable_auto_archive = data['enable_auto_archive']
        if 'archive_threshold_days' in data:
            settings_obj.archive_threshold_days = data['archive_threshold_days']
        if 'enable_email_alerts' in data:
            settings_obj.enable_email_alerts = data['enable_email_alerts']
        if 'data_retention_days' in data:
            settings_obj.data_retention_days = data['data_retention_days']
        if 'enable_audit_logs' in data:
            settings_obj.enable_audit_logs = data['enable_audit_logs']
        
        settings_obj.updated_by = request.user
        settings_obj.save()
        
        serializer = SystemSettingsSerializer(settings_obj)
        return JsonResponse(serializer.data, status=200)
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    except Exception as e:
        print(f"Error updating settings: {str(e)}")
        return JsonResponse({"detail": f"Server error: {str(e)}"}, status=500)


@csrf_exempt
@csrf_exempt
@role_required('admin', 'manager')
@require_http_methods(['GET'])
def dashboard_bar_chart(request):
    """Get Production & Defect Overview by Week data"""
    try:
        today = date.today()
        month = int(request.GET.get("month", today.month))
        year = int(request.GET.get("year", today.year))
        include_archived = request.GET.get("include_archived", "false").lower() == "true"
        
        bar_data = get_bar_report_data(month, year, include_archived)
        
        # Format for chart display - bar_data is now dict with week numbers as keys
        weeks = sorted(bar_data.keys())
        response_data = {
            "labels": [f"Week {w}" for w in weeks],
            "data": {
                "production": [bar_data[w]["completed"] for w in weeks],
                "defects": [bar_data[w]["defects"] for w in weeks]
            },
            "products": [bar_data[w]["products"] for w in weeks],
            "month": month,
            "year": year,
            "debug_info": {
                "total_production": sum(bar_data[w]["completed"] for w in weeks),
                "total_defects": sum(bar_data[w]["defects"] for w in weeks)
            }
        }
        
        return JsonResponse(response_data, status=200)
    except Exception as e:
        print(f"Error in dashboard_bar_chart: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"detail": f"Error: {str(e)}"}, status=500)


@csrf_exempt
@role_required('admin', 'manager')
@require_http_methods(['GET'])
def dashboard_pie_chart(request):
    """Get Production Percentages Report data"""
    try:
        today = date.today()
        month = int(request.GET.get("month", today.month))
        year = int(request.GET.get("year", today.year))
        include_archived = request.GET.get("include_archived", "false").lower() == "true"
        
        pie_data = get_pie_report_data(month, year, include_archived)
        
        response_data = {
            "labels": pie_data["labels"],
            "data": pie_data["raw"],
            "percentages": pie_data["percentages"],
            "raw": pie_data["raw"],
            "total": pie_data["total"],
            "month": month,
            "year": year
        }
        
        print(f"[DEBUG] dashboard_pie_chart: {response_data}")
        
        return JsonResponse(response_data, status=200)
    except Exception as e:
        print(f"Error in dashboard_pie_chart: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"detail": f"Error: {str(e)}"}, status=500)


@csrf_exempt
@role_required('admin', 'manager')
@require_http_methods(['GET'])
def dashboard_top_movers(request):
    """Get Top Movers This Month data"""
    try:
        today = date.today()
        month = int(request.GET.get("month", today.month))
        year = int(request.GET.get("year", today.year))
        limit = int(request.GET.get("limit", 5))
        include_archived = request.GET.get("include_archived", "false").lower() == "true"
        
        products = get_donut_top_products(month, year, limit, include_archived)
        
        print(f"[DEBUG] dashboard_top_movers - Month: {month}, Year: {year}, Found {len(products)} products")
        for p in products:
            print(f"  - {p}")
        
        response_data = {
            "products": [
                {
                    "name": p.get("request_product__product__prodName", "Unknown"),
                    "total_quota": p.get("total_quota", 0)
                }
                for p in products
            ],
            "month": month,
            "year": year
        }
        
        return JsonResponse(response_data, status=200)
    except Exception as e:
        print(f"Error in dashboard_top_movers: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"detail": f"Error: {str(e)}"}, status=500)


@csrf_exempt
@role_required('admin', 'manager')
@require_http_methods(['GET'])
def debug_dashboard_data(request):
    """Debug endpoint to see what data is available"""
    try:
        today = date.today()
        month = int(request.GET.get("month", today.month))
        year = int(request.GET.get("year", today.year))
        
        final_processes = get_final_step_processes(month, year, include_archived=False)
        
        debug_data = {
            "month": month,
            "year": year,
            "total_final_processes": final_processes.count(),
            "processes": []
        }
        
        for pp in final_processes[:10]:  # Limit to first 10 for debugging
            debug_data["processes"].append({
                "id": pp.id,
                "request_product": pp.request_product_id,
                "production_date": str(pp.production_date) if pp.production_date else None,
                "completed_quota": pp.completed_quota,
                "defect_count": pp.defect_count,
                "is_completed": pp.is_completed,
            })
        
        return JsonResponse(debug_data, status=200)
    except Exception as e:
        print(f"Error in debug_dashboard_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"detail": f"Error: {str(e)}"}, status=500)

def create_notification(user, notification_type, title, message, related_request=None):
    """Helper function to create notifications"""
    try:
        import os
        log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[CREATE_NOTIF] User: {user.username}, Type: {notification_type}, Title: {title}\n")
        
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_request=related_request
        )
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[CREATE_NOTIF] OK Created notification ID: {notification.id}\n")
        return notification
    except Exception as e:
        import os
        log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[CREATE_NOTIF] ERROR: {str(e)}\n")
        return None


@csrf_exempt
@require_http_methods(['GET'])
def get_notifications(request):
    """Get all notifications for the current user"""
    import os
    log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(f"[GET_NOTIF] Request user: {request.user}, Authenticated: {request.user.is_authenticated}\n")
    
    if not request.user.is_authenticated:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[GET_NOTIF] ERROR User not authenticated!\n")
        return JsonResponse({"detail": "Unauthorized"}, status=401)
    
    try:
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        unread_count = notifications.filter(is_read=False).count()
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[GET_NOTIF] OK User: {request.user.username}, Found {notifications.count()} notifications, {unread_count} unread\n")
        
        serializer = NotificationSerializer(notifications, many=True)
        
        return JsonResponse({
            "notifications": serializer.data,
            "unread_count": unread_count
        }, status=200)
    except Exception as e:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[GET_NOTIF] ERROR: {str(e)}\n")
        return JsonResponse({"detail": str(e)}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def mark_notification_read(request, notification_id):
    """Mark a single notification as read"""
    import os
    log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(f"[MARK_READ] User: {request.user.username}, Notification ID: {notification_id}\n")
    
    if not request.user.is_authenticated:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[MARK_READ] ERROR User not authenticated!\n")
        return JsonResponse({"detail": "Unauthorized"}, status=401)
    
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[MARK_READ] Found notification, currently is_read={notification.is_read}\n")
        
        notification.is_read = True
        notification.save()
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[MARK_READ] Marked as read, new is_read={notification.is_read}\n")
        
        # Get updated unread count
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[MARK_READ] Updated unread count: {unread_count}\n")
        
        serializer = NotificationSerializer(notification)
        return JsonResponse({
            "notification": serializer.data,
            "unread_count": unread_count
        }, status=200)
    except Notification.DoesNotExist:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[MARK_READ] ERROR Notification not found!\n")
        return JsonResponse({"detail": "Notification not found"}, status=404)
    except Exception as e:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[MARK_READ] ERROR {str(e)}\n")
        return JsonResponse({"detail": str(e)}, status=500)