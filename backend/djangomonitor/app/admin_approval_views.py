"""
Admin Request Approval Views
Handles reviewing and approving/declining customer requests
"""
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.db.models import Q
from django.db import models
from .models import Requests, UserProfile, Roles, ProductProcess, ProcessTemplate, RequestProduct
from .permissions import role_required
from rest_framework.parsers import JSONParser
from .views import log_audit, create_notification, _extract_process_details


@csrf_exempt
@role_required("admin")
def get_pending_customer_requests(request):
    """
    Get all pending customer requests for admin review
    GET /app/admin/pending-requests/
    """
    try:
        if request.method != "GET":
            return JsonResponse({"detail": "Method not allowed"}, status=405)
        
        # Get all pending requests with customer details
        pending_requests = Requests.objects.filter(
            approval_status="pending"
        ).select_related('requester').prefetch_related('product_names').order_by('-RequestID')
        
        requests_data = []
        for req in pending_requests:
            try:
                requester_profile = req.requester.userprofile if req.requester else None
                products = [p.product.prodName for p in req.request_products.all() if p.product]
                
                requests_data.append({
                    "request_id": req.RequestID,
                    "requester": req.requester.username if req.requester else "Unknown",
                    "requester_email": req.requester.email if req.requester else "",
                    "requester_id": req.requester.id if req.requester else None,
                    "company_name": requester_profile.company_name if requester_profile else "",
                    "contact_number": requester_profile.contact_number if requester_profile else "",
                    "deadline": str(req.deadline),
                    "created_at": str(req.created_at),
                    "products_count": len(products),
                    "approval_status": req.approval_status,
                })
            except Exception as e:
                continue
        
        return JsonResponse({
            "success": True,
            "pending_requests": requests_data,
            "total_pending": len(requests_data)
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"detail": f"Error fetching pending requests: {str(e)}"}, status=500)


@csrf_exempt
@csrf_exempt
@role_required("admin")
def approve_customer_request(request):
    """
    Approve a customer request
    POST /app/admin/approve-request/
    {
        "request_id": 1,
        "approval_notes": "Approved for production"
    }
    """
    try:
        if request.method != "POST":
            return JsonResponse({"detail": "Method not allowed"}, status=405)
        
        data = JSONParser().parse(request)
        request_id = data.get("request_id")
        approval_notes = data.get("approval_notes", "")
        
        if not request_id:
            return JsonResponse({"detail": "request_id is required"}, status=400)
        
        customer_request = Requests.objects.get(RequestID=request_id)
        
        # Only approve if status is pending
        if customer_request.approval_status != "pending":
            return JsonResponse({
                "detail": f"Request is already {customer_request.approval_status}"
            }, status=400)
        
        # Approve the request
        customer_request.approval_status = "approved"
        customer_request.request_status = "active"  # Mark as active when approved
        customer_request.approved_by = request.user
        customer_request.approval_notes = approval_notes
        customer_request.save()
        
        # Log audit entry
        try:
            log_audit(
                user=request.user,
                action_type="update",
                request_obj=customer_request,
                old_value=json.dumps({
                    "approval_status": "pending"
                }),
                new_value=json.dumps({
                    "event_type": "request_approved",
                    "request_id": request_id,
                    "requester": customer_request.requester.username if customer_request.requester else "Unknown",
                    "approval_notes": approval_notes
                })
            )
        except Exception as e:
            pass
        
        # Create notification for the requester
        if customer_request.requester:
            try:
                result = create_notification(
                    user=customer_request.requester,
                    notification_type='request_approved',
                    title='Request Approved',
                    message=f'Your request #{request_id} has been approved by {request.user.username}',
                    related_request=customer_request
                )
            except Exception as e:
                print(f"[NOTIFICATION] Failed to create approval notification for requester: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Create notifications for admin users
        try:
            admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
            requester_name = customer_request.requester.username if customer_request.requester else "Unknown"
            for admin_user in admin_users:
                result = create_notification(
                    user=admin_user,
                    notification_type='request_approved',
                    title='Request Approved',
                    message=f'Request #{request_id} from {requester_name} has been approved by {request.user.username}',
                    related_request=customer_request
                )
        except Exception as e:
            print(f"[NOTIFICATION] Failed to create approval notification for admins: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Create notifications for production managers
        try:
            pm_users = User.objects.filter(userprofile__role=Roles.PRODUCTION_MANAGER)
            requester_name = customer_request.requester.username if customer_request.requester else "Unknown"
            for pm_user in pm_users:
                result = create_notification(
                    user=pm_user,
                    notification_type='request_approved',
                    title='Request Approved',
                    message=f'Request #{request_id} from {requester_name} has been approved',
                    related_request=customer_request
                )
        except Exception as e:
            print(f"[NOTIFICATION] Failed to create approval notification for PMs: {str(e)}")
            import traceback
            traceback.print_exc()
        
        return JsonResponse({
            "success": True,
            "message": f"Request #{request_id} approved successfully",
            "request_id": request_id,
            "approval_status": "approved"
        }, status=200)
        
    except Requests.DoesNotExist:
        return JsonResponse({"detail": "Request not found"}, status=404)
    except Exception as e:
        return JsonResponse({"detail": f"Error approving request: {str(e)}"}, status=500)


@csrf_exempt
@role_required("admin")
def decline_customer_request(request):
    """
    Decline a customer request
    POST /app/admin/decline-request/
    {
        "request_id": 1,
        "reason": "Product not available"
    }
    """
    try:
        if request.method != "POST":
            return JsonResponse({"detail": "Method not allowed"}, status=405)
        
        data = JSONParser().parse(request)
        request_id = data.get("request_id")
        reason = data.get("reason", "")
        
        if not request_id:
            return JsonResponse({"detail": "request_id is required"}, status=400)
        
        if not reason:
            return JsonResponse({"detail": "reason is required"}, status=400)
        
        customer_request = Requests.objects.get(RequestID=request_id)
        
        # Only decline if status is pending
        if customer_request.approval_status != "pending":
            return JsonResponse({
                "detail": f"Request is already {customer_request.approval_status}"
            }, status=400)
        
        # Decline the request
        customer_request.approval_status = "declined"
        customer_request.approved_by = request.user
        customer_request.approval_notes = f"Declined: {reason}"
        customer_request.save()
        
        # Log audit entry
        try:
            log_audit(
                user=request.user,
                action_type="update",
                request_obj=customer_request,
                old_value=json.dumps({
                    "approval_status": "pending"
                }),
                new_value=json.dumps({
                    "event_type": "request_declined",
                    "request_id": request_id,
                    "requester": customer_request.requester.username if customer_request.requester else "Unknown",
                    "reason": reason
                })
            )
        except Exception as e:
            pass
        
        # Create notification for the requester
        if customer_request.requester:
            try:
                result = create_notification(
                    user=customer_request.requester,
                    notification_type='request_declined',
                    title='Request Declined',
                    message=f'Your request #{request_id} has been declined. Reason: {reason}',
                    related_request=customer_request
                )
            except Exception as e:
                print(f"[NOTIFICATION] Failed to create decline notification for requester: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Create notifications for admin users
        try:
            admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
            requester_name = customer_request.requester.username if customer_request.requester else "Unknown"
            for admin_user in admin_users:
                result = create_notification(
                    user=admin_user,
                    notification_type='request_declined',
                    title='Request Declined',
                    message=f'Request #{request_id} from {requester_name} has been declined. Reason: {reason}',
                    related_request=customer_request
                )
        except Exception as e:
            print(f"[NOTIFICATION] Failed to create decline notification for admins: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Create notifications for production managers
        try:
            pm_users = User.objects.filter(userprofile__role=Roles.PRODUCTION_MANAGER)
            requester_name = customer_request.requester.username if customer_request.requester else "Unknown"
            for pm_user in pm_users:
                result = create_notification(
                    user=pm_user,
                    notification_type='request_declined',
                    title='Request Declined',
                    message=f'Request #{request_id} from {requester_name} has been declined. Reason: {reason}',
                    related_request=customer_request
                )
        except Exception as e:
            print(f"[NOTIFICATION] Failed to create decline notification for PMs: {str(e)}")
            import traceback
            traceback.print_exc()
        
        return JsonResponse({
            "success": True,
            "message": f"Request #{request_id} declined",
            "request_id": request_id,
            "approval_status": "declined"
        }, status=200)
        
    except Requests.DoesNotExist:
        return JsonResponse({"detail": "Request not found"}, status=404)
    except Exception as e:
        return JsonResponse({"detail": f"Error declining request: {str(e)}"}, status=500)


@csrf_exempt
@role_required("admin")
def get_customer_request_details(request, request_id):
    """
    Get detailed information about a specific customer request
    GET /app/admin/request-details/<request_id>/
    """
    try:
        if request.method != "GET":
            return JsonResponse({"detail": "Method not allowed"}, status=405)
        
        customer_request = Requests.objects.get(RequestID=request_id)
        
        # Get requester details
        requester_profile = customer_request.requester.userprofile if customer_request.requester else None
        
        # Get request products and their processes
        request_products = []
        for rp in customer_request.request_products.all():
            product_data = {
                "request_product_id": rp.id,
                "product_name": rp.product.prodName if rp.product else "",
                "quantity": rp.quantity,
                "processes": []
            }
            
            for pp in rp.process_steps.all():
                product_data["processes"].append({
                    "process_id": pp.id,
                    "process_name": pp.process_name or "",
                    "process_number": pp.process_number or ""
                })
            
            request_products.append(product_data)
        
        response_data = {
            "success": True,
            "request_id": customer_request.RequestID,
            "requester": {
                "username": customer_request.requester.username if customer_request.requester else "Unknown",
                "email": customer_request.requester.email if customer_request.requester else "",
                "first_name": customer_request.requester.first_name if customer_request.requester else "",
                "last_name": customer_request.requester.last_name if customer_request.requester else "",
                "company_name": requester_profile.company_name if requester_profile else "",
                "contact_number": requester_profile.contact_number if requester_profile else "",
            },
            "deadline": str(customer_request.deadline),
            "created_at": str(customer_request.created_at),
            "approval_status": customer_request.approval_status,
            "approval_notes": customer_request.approval_notes,
            "approved_by": customer_request.approved_by.username if customer_request.approved_by else None,
            "products": request_products
        }
        
        return JsonResponse(response_data, status=200)
        
    except Requests.DoesNotExist:
        return JsonResponse({"detail": "Request not found"}, status=404)
    except Exception as e:
        return JsonResponse({"detail": f"Error fetching request details: {str(e)}"}, status=500)

@csrf_exempt
@role_required("admin")
def diagnose_request(request, request_id):
    """
    Diagnostic endpoint to check why a request isn't appearing in production manager's list
    GET /app/admin/diagnose-request/{request_id}/
    """
    try:
        customer_request = Requests.objects.get(RequestID=request_id)
        
        # Check all conditions
        is_archived = customer_request.archived_at is not None
        is_approved = customer_request.approval_status == "approved"
        
        # Count ProductProcess steps
        process_count = customer_request.request_products.aggregate(
            total_steps=models.Count('process_steps')
        )['total_steps']
        
        # Check if any request_product has process steps
        request_products_with_steps = customer_request.request_products.filter(
            process_steps__isnull=False
        ).exists()
        
        # Build diagnostic info
        diagnostics = {
            "request_id": customer_request.RequestID,
            "approval_status": customer_request.approval_status,
            "is_approved": is_approved,
            "archived_at": str(customer_request.archived_at) if is_archived else None,
            "is_archived": is_archived,
            "total_process_steps": process_count,
            "has_started_products": request_products_with_steps,
            "products_count": customer_request.request_products.count(),
            
            # Why it's filtered out
            "should_appear_in_pm_list": (is_approved and not is_archived and not request_products_with_steps),
            "filters_status": {
                "✓ Is approved": is_approved,
                "✓ Not archived": not is_archived,
                "✓ Not started (no process steps)": not request_products_with_steps,
            },
            
            # Product details
            "products": []
        }
        
        # Add product details
        for rp in customer_request.request_products.all():
            steps_count = rp.process_steps.count()
            diagnostics["products"].append({
                "id": rp.id,
                "product_name": rp.product.prodName if rp.product else "Unknown",
                "quantity": rp.quantity,
                "process_steps_count": steps_count,
                "is_started": steps_count > 0
            })
        
        return JsonResponse(diagnostics, status=200)
        
    except Requests.DoesNotExist:
        return JsonResponse({"detail": f"Request #{request_id} not found"}, status=404)
    except Exception as e:
        return JsonResponse({"detail": f"Error: {str(e)}"}, status=500)


@csrf_exempt
@role_required("admin")
def get_available_customers(request):
    """
    Get list of all available customers for admin to assign requests
    GET /app/admin/available-customers/
    """
    try:
        if request.method != "GET":
            return JsonResponse({"detail": "Method not allowed"}, status=405)
        
        # Get all users with customer role
        customer_users = User.objects.filter(
            userprofile__role=Roles.CUSTOMER
        ).select_related('userprofile').order_by('userprofile__full_name')
        
        customers = []
        for user in customer_users:
            profile = user.userprofile
            customers.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": profile.full_name,
                "company_name": profile.company_name,
                "contact_number": profile.contact_number,
                "is_verified": profile.is_verified,
            })
        
        return JsonResponse({
            "success": True,
            "customers": customers,
            "total_customers": len(customers)
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"detail": f"Error fetching customers: {str(e)}"}, status=500)


def _create_product_process_tasks_from_templates(request_obj):
    """
    Helper function to create ProductProcess tasks from ProcessTemplate records
    for each product in a request after the request is created
    
    This ensures that when admin creates a request with products (via Add Product/Part modal),
    all the ProductProcess tasks are automatically created so the request appears in Task Status
    """
    try:
        request_products = request_obj.request_products.all()
        total_tasks_created = 0
        
        print(f"[TASK_CREATION] Creating ProductProcess tasks for request {request_obj.RequestID}")
        print(f"[TASK_CREATION] Request has {request_products.count()} products")
        
        for request_product in request_products:
            product = request_product.product
            if not product:
                print(f"[TASK_CREATION] Skipping RequestProduct {request_product.id} - no product assigned")
                continue
            
            # Check if tasks already exist for this product
            existing_tasks = ProductProcess.objects.filter(request_product=request_product).count()
            if existing_tasks > 0:
                print(f"[TASK_CREATION] Product '{product.prodName}' already has {existing_tasks} tasks - skipping")
                continue
            
            # Get ProcessTemplate records for this product (these were created when admin added the product)
            templates = ProcessTemplate.objects.filter(product_name=product).order_by('step_order')
            
            print(f"[TASK_CREATION] Product '{product.prodName}' has {templates.count()} templates")
            
            if templates.exists():
                # Create ProductProcess task for each template
                for template in templates:
                    # Extract process number and name from combined format "PST-01 - Withdrawal"
                    process_num, process_name_text = _extract_process_details(template.process.name)
                    
                    task = ProductProcess.objects.create(
                        request_product=request_product,
                        process=template.process,
                        process_number=process_num,
                        process_name=process_name_text,
                        step_order=template.step_order,
                        production_date=request_obj.deadline,
                        completed_quota=0,
                        is_completed=False
                    )
                    total_tasks_created += 1
                    print(f"[TASK_CREATION] ✓ Created task {task.id}: {process_name_text} (PST-{process_num})")
            else:
                print(f"[TASK_CREATION] WARNING: Product '{product.prodName}' has no ProcessTemplate records!")
                print(f"[TASK_CREATION] This product was likely not properly configured with processes.")
        
        print(f"[TASK_CREATION] ✓ COMPLETE: Created {total_tasks_created} ProductProcess tasks for request {request_obj.RequestID}")
        return total_tasks_created
        
    except Exception as e:
        print(f"[TASK_CREATION] ERROR creating ProductProcess tasks: {str(e)}")
        import traceback
        traceback.print_exc()
        return 0


@csrf_exempt
@role_required("admin")
def create_admin_request(request):
    """
    Create a new request as admin and assign it to a customer
    POST /app/admin/create-request/
    {
        "requester_id": 5,
        "deadline": "2025-01-20",
        "products": [
            {"product": 1, "quantity": 10},
            {"product": 2, "quantity": 5}
        ]
    }
    Note: all products share the same order deadline.
    """
    try:
        if request.method != "POST":
            return JsonResponse({"detail": "Method not allowed"}, status=405)
        
        from .serializers import RequestSerializer
        
        data = JSONParser().parse(request)
        requester_id = data.get('requester_id')
        
        if not requester_id:
            return JsonResponse({"detail": "requester_id is required"}, status=400)
        
        # Verify requester exists and is a customer
        try:
            requester = User.objects.get(id=requester_id)
            requester_profile = requester.userprofile
            if requester_profile.role != Roles.CUSTOMER:
                return JsonResponse({
                    "detail": f"User {requester.username} is not a customer (role: {requester_profile.role})"
                }, status=400)
        except User.DoesNotExist:
            return JsonResponse({"detail": f"User with ID {requester_id} not found"}, status=404)
        except UserProfile.DoesNotExist:
            return JsonResponse({"detail": f"User {requester_id} does not have a profile"}, status=404)
        
        # Add requester to data for the serializer
        data['requester'] = requester_id
        
        # Map 'products' key to 'request_products' for the serializer
        if 'products' in data:
            data['request_products'] = data.pop('products')
            print(f"[CREATE_REQUEST] Mapped products to request_products: {data['request_products']}")
        
        # Use RequestSerializer to create the request
        serializer = RequestSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            created_request = serializer.save()
            
            # Auto-approve the request (set approval_status to 'approved')
            # This way it goes directly to production manager, bypassing admin approval
            created_request.approval_status = 'approved'
            created_request.request_status = 'new_request'  # Set to new_request - waiting to be started by production manager
            created_request.save()
            
            # Keep this request in Purchase Order List first.
            # Tasks will be created when production manager clicks Start Project.
            tasks_created = 0

            # Log specific admin creation activity for Activity Logs panel.
            try:
                created_products = [
                    {
                        "product_id": rp.product.ProdID if rp.product else None,
                        "product_name": rp.product.prodName if rp.product else "Unknown",
                        "quantity": rp.quantity,
                    }
                    for rp in created_request.request_products.select_related("product").all()
                ]
                log_audit(
                    user=request.user,
                    action_type="create",
                    request_obj=created_request,
                    new_value=json.dumps({
                        "event_type": "admin_request_created",
                        "request_id": created_request.RequestID,
                        "requester_username": requester.username,
                        "deadline": str(created_request.deadline) if created_request.deadline else None,
                        "product_count": len(created_products),
                        "products": created_products,
                    })
                )
            except Exception as audit_error:
                print(f"[AUDIT] Failed to log admin request creation: {str(audit_error)}")
            
            # Create notification for the customer
            try:
                create_notification(
                    user=requester,
                    notification_type='request_created',
                    title='New Request Assigned',
                    message=f'Admin {request.user.username} has created a new request #{created_request.RequestID} for you with deadline {created_request.deadline}',
                    related_request=created_request
                )
            except Exception as notif_error:
                print(f"[NOTIFICATION] Failed to create notification: {str(notif_error)}")

            # Create notification for the admin who created the request (confirmation in bell).
            try:
                create_notification(
                    user=request.user,
                    notification_type='request_created',
                    title='Purchase Order Created',
                    message=f'You created request #{created_request.RequestID} for customer {requester.username}',
                    related_request=created_request
                )
            except Exception as notif_error:
                print(f"[NOTIFICATION] Failed to create creator notification: {str(notif_error)}")
            
            # Create notification for all admin users
            try:
                admin_users = User.objects.filter(
                    Q(is_staff=True) | Q(is_superuser=True)
                ).exclude(id=request.user.id)
                for admin_user in admin_users:
                    create_notification(
                        user=admin_user,
                        notification_type='request_created',
                        title='New Request Created by Admin',
                        message=f'{request.user.username} created request #{created_request.RequestID} for customer {requester.username}',
                        related_request=created_request
                    )
            except Exception as notif_error:
                print(f"[NOTIFICATION] Failed to create admin notification: {str(notif_error)}")

            # Create notification for production managers so they can pick up new orders quickly.
            try:
                production_managers = User.objects.filter(
                    userprofile__role=Roles.PRODUCTION_MANAGER
                )
                for pm_user in production_managers:
                    create_notification(
                        user=pm_user,
                        notification_type='request_created',
                        title='New Purchase Order Created',
                        message=f'Admin {request.user.username} created request #{created_request.RequestID} for customer {requester.username}',
                        related_request=created_request
                    )
            except Exception as notif_error:
                print(f"[NOTIFICATION] Failed to create production manager notification: {str(notif_error)}")
            
            return JsonResponse({
                "success": True,
                "message": f"Request #{created_request.RequestID} created and approved",
                "request_id": created_request.RequestID,
                "requester": requester.username,
                "tasks_created": tasks_created,
            }, status=201)
        else:
            print(f"[CREATE_REQUEST] Serializer validation failed!")
            print(f"[CREATE_REQUEST] Serializer errors: {serializer.errors}")
            print(f"[CREATE_REQUEST] Validated data: {serializer.validated_data if hasattr(serializer, 'validated_data') else 'N/A'}")
            return JsonResponse({
                "success": False,
                "errors": serializer.errors
            }, status=400)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"detail": f"Error creating request: {str(e)}"}, status=500)
