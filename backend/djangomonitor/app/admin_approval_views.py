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
from .models import Requests, UserProfile, Roles
from .permissions import role_required
from rest_framework.parsers import JSONParser
from .views import log_audit, create_notification


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
                print(f"[ERROR] Failed to serialize request {req.RequestID}: {str(e)}")
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
        
        print(f"[APPROVE] Attempting to approve Request #{request_id}")
        
        customer_request = Requests.objects.get(RequestID=request_id)
        print(f"[APPROVE] Found request. Current status: {customer_request.approval_status}")
        
        # Only approve if status is pending
        if customer_request.approval_status != "pending":
            print(f"[APPROVE] Request already has status: {customer_request.approval_status}")
            return JsonResponse({
                "detail": f"Request is already {customer_request.approval_status}"
            }, status=400)
        
        # Approve the request
        customer_request.approval_status = "approved"
        customer_request.approved_by = request.user
        customer_request.approval_notes = approval_notes
        customer_request.save()
        
        print(f"[APPROVE] Request #{request_id} saved successfully with status: {customer_request.approval_status}")
        print(f"[APPROVE] Approved by: {request.user.username}")
        
        # Verify it was saved
        verified = Requests.objects.get(RequestID=request_id)
        print(f"[APPROVE] Verification - current status in DB: {verified.approval_status}")
        
        # Log audit entry
        try:
            log_audit(
                user=request.user,
                action_type="request_approved",
                new_value=json.dumps({
                    "request_id": request_id,
                    "requester": customer_request.requester.username if customer_request.requester else "Unknown",
                    "approval_notes": approval_notes
                })
            )
        except Exception as e:
            print(f"[AUDIT] Failed to log approval: {str(e)}")
        
        # Create notification for the requester
        if customer_request.requester:
            try:
                print(f"[APPROVE] Creating notification for requester: {customer_request.requester.username}")
                result = create_notification(
                    user=customer_request.requester,
                    notification_type='request_approved',
                    title='Request Approved',
                    message=f'Your request #{request_id} has been approved by {request.user.username}',
                    related_request=customer_request
                )
                print(f"[APPROVE] Notification created for requester: {result}")
            except Exception as e:
                print(f"[NOTIFICATION] Failed to create approval notification for requester: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Create notifications for admin users
        try:
            print(f"[APPROVE] Creating notifications for admin users")
            admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
            print(f"[APPROVE] Found {admin_users.count()} admin users")
            requester_name = customer_request.requester.username if customer_request.requester else "Unknown"
            for admin_user in admin_users:
                result = create_notification(
                    user=admin_user,
                    notification_type='request_approved',
                    title='Request Approved',
                    message=f'Request #{request_id} from {requester_name} has been approved by {request.user.username}',
                    related_request=customer_request
                )
                print(f"[APPROVE] Notification created for admin {admin_user.username}: {result}")
        except Exception as e:
            print(f"[NOTIFICATION] Failed to create approval notification for admins: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Create notifications for production managers
        try:
            print(f"[APPROVE] Creating notifications for production managers")
            pm_users = User.objects.filter(userprofile__role=Roles.PRODUCTION_MANAGER)
            print(f"[APPROVE] Found {pm_users.count()} production managers")
            requester_name = customer_request.requester.username if customer_request.requester else "Unknown"
            for pm_user in pm_users:
                result = create_notification(
                    user=pm_user,
                    notification_type='request_approved',
                    title='Request Approved',
                    message=f'Request #{request_id} from {requester_name} has been approved',
                    related_request=customer_request
                )
                print(f"[APPROVE] Notification created for PM {pm_user.username}: {result}")
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
                action_type="request_declined",
                new_value=json.dumps({
                    "request_id": request_id,
                    "requester": customer_request.requester.username if customer_request.requester else "Unknown",
                    "reason": reason
                })
            )
        except Exception as e:
            print(f"[AUDIT] Failed to log decline: {str(e)}")
        
        # Create notification for the requester
        if customer_request.requester:
            try:
                print(f"[DECLINE] Creating notification for requester: {customer_request.requester.username}")
                result = create_notification(
                    user=customer_request.requester,
                    notification_type='request_declined',
                    title='Request Declined',
                    message=f'Your request #{request_id} has been declined. Reason: {reason}',
                    related_request=customer_request
                )
                print(f"[DECLINE] Notification created for requester: {result}")
            except Exception as e:
                print(f"[NOTIFICATION] Failed to create decline notification for requester: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Create notifications for admin users
        try:
            print(f"[DECLINE] Creating notifications for admin users")
            admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
            print(f"[DECLINE] Found {admin_users.count()} admin users")
            requester_name = customer_request.requester.username if customer_request.requester else "Unknown"
            for admin_user in admin_users:
                result = create_notification(
                    user=admin_user,
                    notification_type='request_declined',
                    title='Request Declined',
                    message=f'Request #{request_id} from {requester_name} has been declined. Reason: {reason}',
                    related_request=customer_request
                )
                print(f"[DECLINE] Notification created for admin {admin_user.username}: {result}")
        except Exception as e:
            print(f"[NOTIFICATION] Failed to create decline notification for admins: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Create notifications for production managers
        try:
            print(f"[DECLINE] Creating notifications for production managers")
            pm_users = User.objects.filter(userprofile__role=Roles.PRODUCTION_MANAGER)
            print(f"[DECLINE] Found {pm_users.count()} production managers")
            requester_name = customer_request.requester.username if customer_request.requester else "Unknown"
            for pm_user in pm_users:
                result = create_notification(
                    user=pm_user,
                    notification_type='request_declined',
                    title='Request Declined',
                    message=f'Request #{request_id} from {requester_name} has been declined. Reason: {reason}',
                    related_request=customer_request
                )
                print(f"[DECLINE] Notification created for PM {pm_user.username}: {result}")
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