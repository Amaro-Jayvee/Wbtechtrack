from django.shortcuts import render

#Instead of JSON, JsonParser can be used to parse the incoming data
# Create your views here.
import json
import csv
import datetime
import calendar
import os
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
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib import colors
from django.http import FileResponse
from django.core.files.storage import FileSystemStorage

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


def _format_cancelled_timestamp(value):
    return value.isoformat() if value else None


def _login_background_fallback_config_path():
    return os.path.join(settings.MEDIA_ROOT, 'login_backgrounds', 'current_login_background.json')


def _save_login_background_fallback_url(relative_url):
    config_path = _login_background_fallback_config_path()
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, 'w', encoding='utf-8') as config_file:
        json.dump({'relative_url': relative_url}, config_file)


def _read_login_background_fallback_url():
    config_path = _login_background_fallback_config_path()
    if not os.path.exists(config_path):
        return None
    try:
        with open(config_path, 'r', encoding='utf-8') as config_file:
            data = json.load(config_file)
        return data.get('relative_url')
    except Exception:
        return None

@ensure_csrf_cookie
def csrf_token_view(request):
    """
    Endpoint to get CSRF token
    Django automatically sets csrftoken cookie with @ensure_csrf_cookie
    Frontend can call this to ensure CSRF token is initialized
    """
    return JsonResponse({'message': 'CSRF token set'}, status=200)

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
def create_customer_by_admin(request):
    """
    Admin endpoint to create customer accounts and send email invitation
    POST /app/create-customer/
    {
        "username": "customer1",
        "email": "customer@example.com",
        "full_name": "Customer Name",
        "company_name": "Company Name",
        "contact_number": "555-1234"
    }
    """
    try:
        # Check if user is authenticated and is admin
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)
        
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            if user_profile.role != Roles.ADMIN:
                return JsonResponse({
                    "error": "Only admins can create customer accounts"
                }, status=403)
        except UserProfile.DoesNotExist:
            return JsonResponse({"error": "User profile not found"}, status=403)
        
        data = JSONParser().parse(request)
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        full_name = data.get("full_name", "").strip()
        company_name = data.get("company_name", "").strip()
        contact_number = data.get("contact_number", "").strip()
        
        # Validate required fields
        if not all([username, email, full_name, company_name, contact_number]):
            return JsonResponse({
                "error": "All fields are required (username, email, full_name, company_name, contact_number)"
            }, status=400)
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already taken"}, status=400)
        
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Email already registered"}, status=400)
        
        # Generate a temporary password (12 random characters)
        import string
        import random
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(random.choice(chars) for _ in range(12))
        
        # Create user account
        user = User.objects.create_user(
            username=username,
            password=temp_password,
            email=email
        )
        
        # Create user profile (customer role, marked as verified by admin)
        UserProfile.objects.create(
            user=user,
            full_name=full_name,
            company_name=company_name,
            contact_number=contact_number,
            role=Roles.CUSTOMER,
            is_verified=True,  # Admin verified directly
            verified_at=timezone.now()
        )
        
        # Send welcome email with temporary password
        try:
            email_subject = 'TechTrack Account Created'
            email_body = f"""
Hello {full_name},

Your TechTrack customer account has been created by an administrator.

Account Details:
- Username: {username}
- Email: {email}
- Temporary Password: {temp_password}

Please log in at: http://localhost:5174 (or your production URL)

After logging in, we recommend changing your password for security.

Best regards,
TechTrack Admin Team
"""
            
            send_mail(
                email_subject,
                email_body,
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=False
            )
            
            email_sent = True
            email_message = "Account created successfully and welcome email sent"
        except Exception as email_err:
            # Account created but email failed - still return success but note the email issue
            email_sent = False
            email_message = f"Account created but email could not be sent: {str(email_err)}"
            print(f"[ADMIN CREATE CUSTOMER] Email error: {email_err}")
        
        return JsonResponse({
            "success": True,
            "message": email_message,
            "username": username,
            "email": email,
            "email_sent": email_sent
        }, status=201)
        
    except Exception as e:
        print(f"[ADMIN CREATE CUSTOMER] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            "error": f"Failed to create account: {str(e)}"
        }, status=500)


# New signup flow endpoints
@csrf_exempt
@require_POST
def signup_request(request):
    """
    User signup endpoint - creates a pending signup request
    POST /app/signup/
    {
        "username": "user1",
        "email": "user@example.com",
        "password": "password123",
        "full_name": "User Name",
        "company_name": "Company Name",
        "contact_number": "555-1234",
        "role": "customer"
    }
    """
    try:
        data = JSONParser().parse(request)
        
        serializer = AccountSignupRequestCreateSerializer(data=data)
        if serializer.is_valid():
            signup_request = serializer.save()
            return JsonResponse({
                "detail": "Signup request submitted. Please wait for admin approval.",
                "id": signup_request.id,
                "username": signup_request.username
            }, status=201)
        else:
            return JsonResponse(serializer.errors, status=400)
    except Exception as e:
        return error_response(f"Signup error: {str(e)}", code=400, detail=str(e))


@csrf_exempt
@require_http_methods(["GET"])
def list_pending_signups(request):
    """
    Admin endpoint to list pending signup requests
    GET /app/pending-signups/?status=pending
    """
    try:
        if not request.user.is_authenticated:
            return error_response("Authentication required", code=401)
        
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            if user_profile.role != Roles.ADMIN:
                return error_response("Only admins can view signup requests", code=403)
        except UserProfile.DoesNotExist:
            return error_response("User profile not found", code=403)
        
        status = request.GET.get('status', 'pending')
        signups = AccountSignupRequest.objects.filter(status=status).order_by('-created_at')
        
        serializer = AccountSignupRequestSerializer(signups, many=True)
        return JsonResponse(serializer.data, safe=False, status=200)
    except Exception as e:
        return error_response(f"Error fetching signups: {str(e)}", code=400)


@csrf_exempt
@require_POST
def approve_signup(request, signup_id):
    """
    Admin endpoint to approve a signup request
    POST /app/signups/{signup_id}/approve/
    {
        "review_notes": "Approved - valid customer"
    }
    """
    try:
        if not request.user.is_authenticated:
            return error_response("Authentication required", code=401)
        
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            if user_profile.role != Roles.ADMIN:
                return error_response("Only admins can approve signups", code=403)
        except UserProfile.DoesNotExist:
            return error_response("User profile not found", code=403)
        
        signup = get_object_or_404(AccountSignupRequest, id=signup_id)
        
        if signup.status != "pending":
            return error_response(f"Cannot approve signup with status '{signup.status}'", code=400)
        
        data = JSONParser().parse(request)
        review_notes = data.get('review_notes', '')
        
        # Approve and create user
        user = signup.approve(admin_user=request.user, notes=review_notes)
        
        return JsonResponse({
            "detail": "Signup approved successfully",
            "username": user.username,
            "email": user.email
        }, status=200)
    except Exception as e:
        return error_response(f"Error approving signup: {str(e)}", code=400)


@csrf_exempt
@require_POST
def decline_signup(request, signup_id):
    """
    Admin endpoint to decline a signup request
    POST /app/signups/{signup_id}/decline/
    {
        "review_notes": "Declined - invalid information"
    }
    """
    try:
        if not request.user.is_authenticated:
            return error_response("Authentication required", code=401)
        
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            if user_profile.role != Roles.ADMIN:
                return error_response("Only admins can decline signups", code=403)
        except UserProfile.DoesNotExist:
            return error_response("User profile not found", code=403)
        
        signup = get_object_or_404(AccountSignupRequest, id=signup_id)
        
        if signup.status != "pending":
            return error_response(f"Cannot decline signup with status '{signup.status}'", code=400)
        
        data = JSONParser().parse(request)
        review_notes = data.get('review_notes', '')
        
        signup.decline(admin_user=request.user, notes=review_notes)
        
        return JsonResponse({
            "detail": "Signup declined successfully",
            "username": signup.username
        }, status=200)
    except Exception as e:
        return error_response(f"Error declining signup: {str(e)}", code=400)


@csrf_exempt
@require_POST
def cancel_signup(request, signup_id):
    """
    User endpoint to cancel their own signup request
    POST /app/signups/{signup_id}/cancel/
    """
    try:
        signup = get_object_or_404(AccountSignupRequest, id=signup_id)
        
        if signup.status != "pending":
            return error_response(f"Cannot cancel signup with status '{signup.status}'", code=400)
        
        signup.cancel()
        
        return JsonResponse({
            "detail": "Signup request cancelled",
            "username": signup.username
        }, status=200)
    except Exception as e:
        return error_response(f"Error cancelling signup: {str(e)}", code=400)


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
    except (AttributeError, UserProfile.DoesNotExist):
        return error_response(
            "User profile not found",
            code=500,
            detail="Your account profile is missing. Please contact admin."
        )
    except Exception as e:
        # Catch database errors due to schema mismatch
        print(f"[LOGIN ERROR] Database error accessing profile: {str(e)}")
        return error_response(
            "Database error",
            code=500,
            detail=f"Error accessing account profile: {str(e)}"
        )
    
    # Try to get user details safely
    try:
        user_role = profile.role if hasattr(profile, 'role') else None
        is_verified = profile.is_verified if hasattr(profile, 'is_verified') else True
        
        # Check if customer is verified/approved (only for customers)
        if user_role == Roles.CUSTOMER and not is_verified:
            return error_response(
                "Account not approved",
                code=403,
                detail="Your account is pending admin approval. Please wait for approval."
            )
    except Exception as e:
        print(f"[LOGIN ERROR] Error checking role/verification: {str(e)}")
        # Allow login even if role check fails - don't block user
        user_role = None
        is_verified = True
    
    # Create session
    login(request, user)
    
    # Log audit entry for login
    try:
        log_audit(
            user=user,
            action_type="login",
            new_value=json.dumps({"username": user.username, "email": user.email, "role": user_role or "unknown"})
        )
    except Exception as e:
        print(f"[AUDIT] Failed to log login: {str(e)}")
    
    return JsonResponse({
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user_role or "unknown",
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
        # Log audit entry for logout
        user = request.user
        log_audit(
            user=user,
            action_type="logout",
            new_value=json.dumps({"username": user.username})
        )
        
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

@csrf_exempt
@require_http_methods(["POST"])
def forgot_password_request(request):
    """
    Request password reset by email.
    Frontend sends email, backend verifies email exists and sends reset link.
    
    POST /app/forgot-password/request/
    {
        "email": "user@example.com"
    }
    """
    try:
        data = JSONParser().parse(request)
        email = data.get("email", "").strip().lower()
        
        if not email:
            return error_response("Email is required", code=400)
        
        # Check if user with this email exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # For security, don't reveal if email exists
            return success_response({
                "detail": "If an account exists with this email, a password reset link has been sent.",
                "email": email
            }, code=200)
        
        # Check if user profile exists
        try:
            profile = user.userprofile
        except UserProfile.DoesNotExist:
            return error_response("User profile not found", code=500)
        
        # Generate reset token
        token = PasswordResetToken.generate_token()
        expires_at = timezone.now() + timezone.timedelta(hours=24)  # 24-hour expiration
        
        # Delete any existing valid tokens for this user
        PasswordResetToken.objects.filter(user=user, is_used=False).delete()
        
        # Create new token
        reset_token = PasswordResetToken.objects.create(
            user=user,
            token=token,
            email=email,
            expires_at=expires_at
        )
        
        # Send email with reset link
        reset_url = f"http://localhost:5174/reset-password/{token}"
        subject = "Password Reset Request - TechTrack"
        message = f"""Hello {profile.full_name},

You requested to reset your password. Click the link below to proceed:

{reset_url}

This link will expire in 24 hours.

If you didn't request this, please ignore this email.

Best regards,
TechTrack Team"""
        
        try:
            print(f"[DEBUG] Attempting to send email to {email}")
            print(f"[DEBUG] Email Host: {settings.EMAIL_HOST}")
            print(f"[DEBUG] Email Port: {settings.EMAIL_PORT}")
            print(f"[DEBUG] Email User: {settings.EMAIL_HOST_USER}")
            
            sent = send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=False,
            )
            
            print(f"[DEBUG] Email sent successfully. Result: {sent}")
            
            return success_response({
                "detail": "Password reset link has been sent to your email.",
                "email": email
            }, code=200)
            
        except Exception as e:
            print(f"[ERROR] Error sending reset email to {email}: {str(e)}")
            import traceback
            traceback.print_exc()
            return error_response(f"Failed to send reset email: {str(e)}", code=500)
        
    except Exception as e:
        print(f"[FORGOT PASSWORD] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response("An error occurred", code=500, detail=str(e))


@csrf_exempt
@require_http_methods(["POST"])
def verify_reset_token(request):
    """
    Verify if reset token is valid.
    
    POST /app/forgot-password/verify-token/
    {
        "token": "reset_token_string"
    }
    """
    try:
        data = JSONParser().parse(request)
        token = data.get("token", "").strip()
        
        if not token:
            return error_response("Token is required", code=400)
        
        # Find the token
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return error_response("Invalid or expired token", code=401)
        
        # Check if token is valid
        if not reset_token.is_valid():
            return error_response("Token has expired or already used", code=401)
        
        return success_response({
            "detail": "Token is valid",
            "email": reset_token.email,
            "is_valid": True
        }, code=200)
        
    except Exception as e:
        print(f"[VERIFY TOKEN] Error: {str(e)}")
        return error_response("An error occurred", code=500, detail=str(e))


@csrf_exempt
@require_http_methods(["POST"])
def reset_password(request):
    """
    Reset password using token.
    
    POST /app/forgot-password/reset/
    {
        "token": "reset_token_string",
        "new_password": "new_password_here",
        "confirm_password": "new_password_here"
    }
    """
    try:
        data = JSONParser().parse(request)
        token = data.get("token", "").strip()
        new_password = data.get("new_password", "").strip()
        confirm_password = data.get("confirm_password", "").strip()
        
        # Validate inputs
        if not token:
            return error_response("Token is required", code=400)
        
        if not new_password:
            return error_response("New password is required", code=400)
        
        if new_password != confirm_password:
            return error_response("Passwords do not match", code=400)
        
        if len(new_password) < 6:
            return error_response("Password must be at least 6 characters", code=400)
        
        # Find the token
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return error_response("Invalid token", code=401)
        
        # Check if token is valid
        if not reset_token.is_valid():
            return error_response("Token has expired or already used", code=401)
        
        # Update user password
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Mark token as used
        reset_token.mark_used()
        
        # Send confirmation email
        try:
            profile = user.userprofile
            send_mail(
                subject="Password Changed Successfully - TechTrack",
                message=f"""Hello {profile.full_name},

Your password has been successfully changed.

If you didn't make this change, please contact support immediately.

Best regards,
TechTrack Team""",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Error sending confirmation email: {str(e)}")
        
        return success_response({
            "detail": "Password has been successfully reset. You can now login with your new password.",
        }, code=200)
        
    except Exception as e:
        print(f"[RESET PASSWORD] Error: {str(e)}")
        return error_response("An error occurred", code=500, detail=str(e))


@csrf_exempt
@require_http_methods(["POST"])
def test_email_debug(request):
    """
    Test email sending - DEBUG ONLY
    POST /app/test-email/
    {
        "email": "your-email@gmail.com"
    }
    """
    try:
        data = JSONParser().parse(request)
        email = data.get("email", "").strip().lower()
        
        if not email:
            return error_response("Email is required", code=400)
        
        print(f"\n[TEST EMAIL] Attempting to send test email to: {email}")
        print(f"[TEST EMAIL] Email Configuration:")
        print(f"  - EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        print(f"  - EMAIL_HOST: {settings.EMAIL_HOST}")
        print(f"  - EMAIL_PORT: {settings.EMAIL_PORT}")
        print(f"  - EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        print(f"  - EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        
        subject = "Test Email - TechTrack"
        message = f"""This is a test email sent from TechTrack backend.

Time: {timezone.now()}
To verify this email reached you.

If you see this, the email system is working correctly!

Best regards,
TechTrack Team"""
        
        try:
            print(f"[TEST EMAIL] Sending email...")
            sent = send_mail(
                subject=subject,
                message=message,
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False,
            )
            
            print(f"[TEST EMAIL] Email sent successfully! Result: {sent}")
            
            return success_response({
                "detail": f"Test email sent successfully to {email}",
                "debug_info": {
                    "email_host": settings.EMAIL_HOST,
                    "email_port": settings.EMAIL_PORT,
                    "email_use_tls": settings.EMAIL_USE_TLS,
                    "from_email": settings.EMAIL_HOST_USER,
                    "to_email": email,
                }
            }, code=200)
            
        except Exception as e:
            print(f"[TEST EMAIL] FAILED - Error: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return error_response(
                f"Failed to send test email: {str(e)}", 
                code=500,
                detail={
                    "error": str(e),
                    "hint": "Check terminal output for detailed error information"
                }
            )
            
    except Exception as e:
        print(f"[TEST EMAIL] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response("An error occurred", code=500, detail=str(e))


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
    
    role = "unknown"
    is_verified = True
    terms_accepted = False
    
    try:
        profile = request.user.userprofile
        role = getattr(profile, 'role', 'unknown')
        is_verified = getattr(profile, 'is_verified', True)
        terms_accepted = getattr(profile, 'terms_accepted', False)
    except (AttributeError, UserProfile.DoesNotExist):
        print(f"[WHOAMI] UserProfile not found for user {request.user.username}")
    except Exception as e:
        print(f"[WHOAMI] Error accessing profile: {str(e)}")
    
    return JsonResponse({
        "id": request.user.id,
        "username": request.user.username,
        "first_name": request.user.first_name,
        "last_name": request.user.last_name,
        "email": request.user.email,
        "role": role,
        "is_verified": is_verified,
        "terms_accepted": terms_accepted,
        "detail": "User authenticated"
    }, status=200)

@csrf_exempt
@require_POST
def accept_terms_view(request):
    """
    Accept terms and agreements for current user
    
    POST /app/accept-terms/
    
    Marks the user's profile as having accepted terms
    """
    if not request.user.is_authenticated:
        return error_response(
            "Not authenticated",
            code=401,
            detail="No active session"
        )
    
    try:
        profile = request.user.userprofile
        profile.terms_accepted = True
        profile.terms_accepted_at = timezone.now()
        profile.save()
        
        return JsonResponse({
            "detail": "Terms and agreements accepted successfully",
            "terms_accepted": True,
            "terms_accepted_at": profile.terms_accepted_at.isoformat()
        }, status=200)
    except AttributeError:
        return error_response(
            "User profile not found",
            code=500,
            detail="User profile is missing"
        )
    except Exception as e:
        return error_response(
            "Failed to accept terms",
            code=500,
            detail=str(e)
        )

@role_required('admin', 'production_manager')
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
            worker = workers_serializer.save()
            
            # Log audit entry
            try:
                log_audit(
                    user=request.user,
                    action_type="worker_create",
                    new_value=json.dumps({
                        "id": worker.WorkerID,
                        "first_name": worker.FirstName,
                        "last_name": worker.LastName
                    })
                )
            except Exception as audit_err:
                print(f"[AUDIT] Failed to log worker creation: {str(audit_err)}")
            
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'PUT':
        worker_data = JSONParser().parse(request)
        worker = get_object_or_404(Worker, WorkerID=worker_data['WorkerID'])
        
        # Capture old values
        old_data = WorkerSerializer(worker).data
        
        workers_serializer = WorkerSerializer(worker, data=worker_data)
        if workers_serializer.is_valid():
            updated_worker = workers_serializer.save()
            
            # Log audit entry
            try:
                new_data = WorkerSerializer(updated_worker).data
                log_audit(
                    user=request.user,
                    action_type="worker_update",
                    old_value=json.dumps(old_data),
                    new_value=json.dumps(new_data)
                )
            except Exception as audit_err:
                print(f"[AUDIT] Failed to log worker update: {str(audit_err)}")
            
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)

    elif request.method == 'PATCH':
        worker_data = JSONParser().parse(request)
        worker = get_object_or_404(Worker, WorkerID=worker_data['WorkerID'])
        
        # Capture old values
        old_data = WorkerSerializer(worker).data
        
        workers_serializer = WorkerSerializer(worker, data=worker_data, partial=True)
        if workers_serializer.is_valid():
            updated_worker = workers_serializer.save()
            
            # Log audit entry
            try:
                new_data = WorkerSerializer(updated_worker).data
                log_audit(
                    user=request.user,
                    action_type="worker_update",
                    old_value=json.dumps(old_data),
                    new_value=json.dumps(new_data)
                )
            except Exception as audit_err:
                print(f"[AUDIT] Failed to log worker update: {str(audit_err)}")
            
            return JsonResponse("Patched successfully!", safe=False)
        return JsonResponse("Failed to patch", safe=False)    

    elif request.method == 'DELETE':
        worker = get_object_or_404(Worker, WorkerID=id)
        
        # Capture old values before deletion
        old_data = WorkerSerializer(worker).data
        
        worker.delete()
        
        # Log audit entry
        try:
            log_audit(
                user=request.user,
                action_type="worker_delete",
                old_value=json.dumps(old_data)
            )
        except Exception as audit_err:
            print(f"[AUDIT] Failed to log worker deletion: {str(audit_err)}")
        
        return JsonResponse("Deleted successfully!", safe=False)


@role_required('admin', 'production_manager')
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

@role_required('admin', 'production_manager', 'customer')
@csrf_exempt
def requestAPI(request, id=0):
    if request.method == 'GET':
        # Get current user's requests based on their role
        user = request.user
        
        if user.is_authenticated:
            try:
                user_profile = UserProfile.objects.get(user=user)
                user_role = user_profile.role
            except UserProfile.DoesNotExist:
                user_role = None
            
            # Check if user is admin or production_manager
            if user.is_staff or user.is_superuser or user_role in [Roles.ADMIN, Roles.PRODUCTION_MANAGER]:
                # For production_managers, show only non-archived, APPROVED requests that are NOT STARTED yet
                # request_status = "new_request" means it's pending (has tasks but not yet started)
                # request_status = "active" means project has been started (moved to Task Status)
                requests_obj = Requests.objects.filter(
                    archived_at__isnull=True,
                    approval_status="approved",
                    request_status="new_request"
                ).exclude(
                    request_products__process_steps__isnull=False
                ).distinct().order_by('-RequestID')
            else:
                # For regular users (customers), show only non-archived requests
                requests_obj = Requests.objects.filter(
                    Q(created_by=user) | Q(requester=user),
                    archived_at__isnull=True
                ).order_by('-RequestID')
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
            
            # ===== NEW FLOW: Only admins can create requests =====
            # Check if user is admin
            try:
                user_profile = UserProfile.objects.get(user=request.user)
                user_role = user_profile.role
                is_admin = user_role in [Roles.ADMIN, 'admin']
            except UserProfile.DoesNotExist:
                is_admin = request.user.is_staff or request.user.is_superuser
            
            # Block customers from creating requests
            if not is_admin:
                return JsonResponse({
                    "error": "Only administrators can create requests. Please contact your administrator to create a request."
                }, status=403)
            
            request_data = JSONParser().parse(request)
            import os
            log_file = os.path.join(os.path.dirname(__file__), '../notification_debug.log')
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"[CREATE_REQUEST] User: {request.user.username}, Staff: {request.user.is_staff}\n")
            
            request_serializer = RequestSerializer(data=request_data, context={'request': request})
            if request_serializer.is_valid():
                new_request = request_serializer.save()
                
                # Create notification for the customer (requester) - only if admin created for specific customer
                if new_request.requester and new_request.created_by != new_request.requester:
                    create_notification(
                        user=new_request.requester,
                        notification_type='request_created',
                        title='New Request Assigned',
                        message=f'Admin {request.user.username} has created a new request #{new_request.RequestID} for you with deadline {new_request.deadline}',
                        related_request=new_request
                    )
                
                # Create notification for the user who created the request (admin)
                if request.user:
                    create_notification(
                        user=request.user,
                        notification_type='request_created',
                        title='Request Created Successfully',
                        message=f'Your request #{new_request.RequestID} has been created with deadline {new_request.deadline}',
                        related_request=new_request
                    )
                
                # Create notification for all other admin/staff users
                admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
                for admin_user in admin_users:
                    create_notification(
                        user=admin_user,
                        notification_type='request_created',
                        title='New Request Created',
                        message=f'Admin {request.user.username} created request #{new_request.RequestID} for customer {new_request.requester.username if new_request.requester else "Unknown"}',
                        related_request=new_request
                    )
                
                # Create notification for all production managers
                production_manager_users = User.objects.filter(
                    userprofile__role=Roles.PRODUCTION_MANAGER
                ).exclude(id=request.user.id)
                for pm_user in production_manager_users:
                    create_notification(
                        user=pm_user,
                        notification_type='request_created',
                        title='New Request Created',
                        message=f'Admin {request.user.username} created request #{new_request.RequestID} for customer {new_request.requester.username if new_request.requester else "Unknown"}',
                        related_request=new_request
                    )
                
                # Ensure ProcessTemplate records exist for all products in this request
                # This is needed when products are created via Add Product/Part modal
                for request_product in new_request.request_products.all():
                    product = request_product.product
                    if product:
                        # Check if this product already has ProcessTemplate records
                        existing_templates = ProcessTemplate.objects.filter(product_name=product).exists()
                        
                        if not existing_templates:
                            # If no templates exist, try to find any ProcessName records that match this product's processes
                            # This handles the case where products are created via the Add Product/Part modal
                            # For now, create templates for common processes if needed by other logic
                            pass
                
                # Return the created request data instead of just a message
                return JsonResponse(request_serializer.data, safe=False, status=201)
            else:
                return JsonResponse(request_serializer.errors, safe=False, status=400)
        except Exception as e:
            return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)
    
    elif request.method == 'DELETE':
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return JsonResponse({"error": "User must be authenticated"}, status=401)
            
            print(f"[DELETE_REQUEST] User {request.user.username} attempting to delete/archive request {id}")
            
            # Get user profile to check role
            try:
                user_profile = UserProfile.objects.get(user=request.user)
            except UserProfile.DoesNotExist:
                print(f"[DELETE_REQUEST] ERROR: User profile not found for {request.user.username}")
                return JsonResponse({"error": "User profile not found"}, status=403)
            
            # Check if user is allowed to delete (admin or production_manager only)
            allowed_roles = [Roles.ADMIN, Roles.PRODUCTION_MANAGER]
            if user_profile.role not in allowed_roles:
                print(f"[DELETE_REQUEST] ERROR: User {request.user.username} has role {user_profile.role}, not allowed")
                return JsonResponse({"error": f"Only admins and production managers can delete requests. Your role: {user_profile.role}"}, status=403)
            
            try:
                request_instance = Requests.objects.get(RequestID=id)
                print(f"[DELETE_REQUEST] Found request {id} for archiving")
            except Requests.DoesNotExist:
                print(f"[DELETE_REQUEST] ERROR: Request {id} not found")
                return JsonResponse({"error": "Request not found"}, status=404)

            old_snapshot = RequestSerializer(request_instance).data
            requester_name = request_instance.requester.username if request_instance.requester else "Unknown"
            
            # Soft-delete using archive() method instead of hard delete
            # This prevents orphaned ProductProcess records
            print(f"[DELETE_REQUEST] Archiving request {id}...")
            print(f"[DELETE_REQUEST] Before archive - archived_at: {request_instance.archived_at}")
            
            request_instance.archive()
            
            # Verify archive was set
            request_instance.refresh_from_db()
            print(f"[DELETE_REQUEST] Request {id} archived successfully, archived_at={request_instance.archived_at}")
            
            # Also verify products are archived
            products = request_instance.request_products.all()
            print(f"[DELETE_REQUEST] Checking {products.count()} products for request {id}:")
            for prod in products:
                print(f"  - Product {prod.id}: {prod.product.prodName if prod.product else 'N/A'}, archived_at={prod.archived_at}")

            AuditLog.objects.create(
                action_type="archive",
                old_value=json.dumps(old_snapshot),
                performed_by=request.user
            )
            
            # Create notifications for archived request
            # Notify the requester (customer) that their request was archived
            if request_instance.requester:
                create_notification(
                    user=request_instance.requester,
                    notification_type='request_archived',
                    title='Request Archived',
                    message=f'Request #{request_instance.RequestID} has been archived by {request.user.username}',
                    related_request=request_instance
                )
            
            # Notify all admin users about the archival
            admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
            for admin_user in admin_users:
                create_notification(
                    user=admin_user,
                    notification_type='request_archived',
                    title='Request Archived',
                    message=f'Request #{request_instance.RequestID} (requester: {requester_name}) was archived by {request.user.username}',
                    related_request=request_instance
                )
            
            print(f"[DELETE_REQUEST] Archive complete for request {id}")
            return JsonResponse({"message": "Request archived successfully!"}, status=200)
        except Exception as e:
            print(f"[ERROR] Error archiving request: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=500)


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


def _extract_process_details(process_name_str):
    """Extract process_number and process_name from a combined string like 'PST-01 - WITHDRAWAL'"""
    if not process_name_str:
        return "", ""
    
    # Try to split on " - " if it exists
    if " - " in process_name_str:
        parts = process_name_str.split(" - ", 1)
        return parts[0].strip(), parts[1].strip()
    else:
        # If no separator, treat the whole thing as process_name
        return "", process_name_str.strip()


def _auto_start_project_tasks(req, requesting_user):
    """Helper function to create ProductProcess tasks for a request (auto-called on request creation)"""
    try:
        existing_request_tasks = ProductProcess.objects.filter(
            request_product__request=req,
            archived_at__isnull=True,
        )

        # If tasks already exist but status was not updated, fix it so the request
        # does not come back to the purchase order list.
        if existing_request_tasks.exists() and req.request_status != "active":
            req.request_status = "active"
            req.save(update_fields=["request_status"])

        # Get all RequestProducts for this request
        request_products = req.request_products.all()
        
        if not request_products.exists():
            print(f"[DEBUG] No products found for request {req.RequestID}")
            return []
        
        created_tasks = []
        
        # Process each product individually
        for request_product in request_products:
            product = request_product.product
            
            # Check if THIS product already has tasks (don't skip entire request)
            existing_product_tasks = ProductProcess.objects.filter(
                request_product=request_product
            ).exists()
            
            if existing_product_tasks:
                print(f"[DEBUG] Product {product.prodName} in request {req.RequestID} already has tasks created - skipping")
                continue
            
            # Check if product has process templates
            process_templates = ProcessTemplate.objects.filter(product_name=product).order_by('step_order')
            
            if process_templates.exists():
                # Create ProductProcess for each template-based product
                for template in process_templates:
                    # Extract process number and name from the combined ProcessName.name
                    process_num, process_name_text = _extract_process_details(template.process.name)
                    
                    task = ProductProcess.objects.create(
                        request_product=request_product,
                        process=template.process,
                        process_number=process_num,
                        process_name=process_name_text,
                        step_order=template.step_order,
                        completed_quota=0,
                        is_completed=False
                    )
                    created_tasks.append({
                        'id': task.id,
                        'request_id': req.RequestID,
                        'product': product.prodName,
                        'process': template.process.name,
                        'quantity': request_product.quantity
                    })
            else:
                # Product has no templates - create a generic fallback task
                try:
                    # Try to get the first available ProcessName as fallback
                    fallback_process = ProcessName.objects.first()
                    
                    if fallback_process:
                        # Extract process number and name from the combined ProcessName.name
                        process_num, process_name_text = _extract_process_details(fallback_process.name)
                        
                        task = ProductProcess.objects.create(
                            request_product=request_product,
                            process=fallback_process,
                            process_number=process_num,
                            process_name=process_name_text,
                            step_order=1,
                            completed_quota=0,
                            is_completed=False
                        )
                        created_tasks.append({
                            'id': task.id,
                            'request_id': req.RequestID,
                            'product': product.prodName,
                            'process': f'{fallback_process.name} (Generated)',
                            'quantity': request_product.quantity
                        })
                        print(f"[DEBUG] Created generic fallback task for product {product.prodName} using process: {fallback_process.name}")
                    else:
                        print(f"[DEBUG] Warning: No ProcessName found at all in database for fallback task for product {product.prodName}")
                except Exception as e:
                    print(f"[DEBUG] Warning: Failed to create fallback task for product {product.prodName}: {str(e)}")
        
        # Create notifications only if tasks were created
        if created_tasks:
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
            
            try:
                create_notification(
                    user=requesting_user,
                    notification_type='project_started',
                    title=f'Project Started for Request #{req.RequestID}',
                    message=f'Request #{req.RequestID} has been automatically started with {len(created_tasks)} task(s).',
                    related_request=req
                )
            except Exception as notif_error:
                print(f"[DEBUG] Error creating notification for creator: {notif_error}")
            
            try:
                admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=requesting_user.id)
                for admin_user in admin_users:
                    create_notification(
                        user=admin_user,
                        notification_type='project_started',
                        title=f'Project Started for Request #{req.RequestID}',
                        message=f'Request #{req.RequestID} has been automatically started with {len(created_tasks)} task(s).',
                        related_request=req
                    )
            except Exception as notif_error:
                print(f"[DEBUG] Error creating notifications for admin users: {notif_error}")
            
            # Create audit log entry for project start
            try:
                AuditLog.objects.create(
                    request=req,
                    action_type="create",
                    new_value=json.dumps({
                        "RequestID": req.RequestID,
                        "tasks_created": len(created_tasks),
                        "action": "Project started with ProductProcess tasks"
                    }),
                    performed_by=requesting_user
                )
            except Exception as audit_err:
                print(f"[DEBUG] Warning: Failed to create audit log for project start: {audit_err}")
        
        # Update request status to "active" if tasks were successfully created
        if created_tasks:
            req.request_status = "active"
            req.save()
            print(f"[DEBUG] Updated request {req.RequestID} status to 'active'")
        
        print(f"[DEBUG] Auto-started project for request {req.RequestID}: tasks_created={len(created_tasks)}")
        return created_tasks
        
    except Exception as e:
        print(f"[DEBUG] Error in _auto_start_project_tasks: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


@csrf_exempt
@require_POST
@role_required(Roles.PRODUCTION_MANAGER)
def start_project(request, id=0):
    """Create ProductProcess (tasks) from a request - Only Production Manager can start projects"""
    try:
        # Get request_id from URL parameter if provided, otherwise from JSON body
        if id:
            request_id = id
        else:
            data = JSONParser().parse(request)
            request_id = data.get('request_id')
        
        if not request_id:
            return JsonResponse({"error": "No request ID provided"}, status=400)
        
        # Get the request
        try:
            req = Requests.objects.get(RequestID=request_id)
        except Requests.DoesNotExist:
            return JsonResponse({"error": "Request not found"}, status=404)
        
        # Use the helper function to create tasks
        created_tasks = _auto_start_project_tasks(req, request.user)
        
        if not created_tasks:
            existing_task_count = ProductProcess.objects.filter(
                request_product__request=req,
                archived_at__isnull=True,
            ).count()

            if existing_task_count > 0:
                if req.request_status != "active":
                    req.request_status = "active"
                    req.save(update_fields=["request_status"])

                return JsonResponse({
                    "message": "Project already started. Request is active in Task Status.",
                    "tasks_created": 0,
                    "already_started": True,
                }, status=200)

            return JsonResponse({
                "error": "No products found for this request.",
            }, status=400)
        
        # Prepare response message
        message = f"Successfully created {len(created_tasks)} task(s)"
        
        return JsonResponse({
            "message": message,
            "tasks_created": len(created_tasks),
            "tasks": created_tasks,
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
        
        # Workers are optional - production decided all workers are flexible
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
def productnameAPI(request, id=0):
    # Allow GET for all authenticated users, POST/PUT/DELETE for admins only
    if request.method == 'GET':
        # Allow all authenticated users to view products
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)
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
        # Only admins can create products
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            if user_profile.role != Roles.ADMIN:
                return JsonResponse({"error": "Only admins can create products"}, status=403)
        except UserProfile.DoesNotExist:
            return JsonResponse({"error": "User profile not found"}, status=403)
        
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
def save_product_configuration(request):
    """
    Save a product with its processes for later use.
    POST: {"product_name": "Motor Assembly", "processes": [{"process_name": "Blanking", "step_order": 1}]}
    """
    if request.method == 'POST':
        # Only admins can configure products
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            if user_profile.role != Roles.ADMIN:
                return JsonResponse({"error": "Only admins can configure products"}, status=403)
        except UserProfile.DoesNotExist:
            return JsonResponse({"error": "User profile not found"}, status=403)
        
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
        # Allow all authenticated users to view configured products
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)
        
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


@csrf_exempt
@require_http_methods(['POST', 'GET'])
def create_product_with_processes(request):
    """
    Create a new ProductName with its ProcessName records AND ProcessTemplate records.
    This endpoint allows both admins and customers to create products with their workflows.
    
    POST: {
        "product_name": "Motor Assembly",
        "processes": [
            {"process_name": "Blanking", "process_number": "PST-01"},
            {"process_name": "Forming", "process_number": "PST-07"}
        ]
    }
    """
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)
        
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
            print(f"[DEBUG] {'Created' if created else 'Using existing'} product: {product_obj.prodName} (ID: {product_obj.ProdID})")

            # Create ProcessName records and ProcessTemplate records for each process
            step_order = 0
            created_count = 0
            for process_data in processes:
                process_name = process_data.get('process_name', '').strip()
                process_number = process_data.get('process_number', process_name).strip()
                if not process_name:
                    print(f"[DEBUG] WARNING: Skipping process with no name from data: {process_data}")
                    continue
                step_order += 1
                
                # Create or get ProcessName
                # Use either the process_number (e.g., "PST-07") or process_name as the name
                process_display = f"{process_number} - {process_name}" if process_number != process_name else process_name
                process_obj, proc_created = ProcessName.objects.get_or_create(name=process_display)
                print(f"[DEBUG] {'✓ Created' if proc_created else '→ Using existing'} process: {process_obj.name} (ProcessID: {process_obj.ProcessID})")
                
                # Create ProcessTemplate so start_project can find it
                template, template_created = ProcessTemplate.objects.get_or_create(
                    product_name=product_obj,
                    process=process_obj,
                    defaults={'step_order': step_order}
                )
                if template_created:
                    created_count += 1
                print(f"[DEBUG] {'✓ Created' if template_created else '→ Using existing'} template for {product_obj.prodName} -> {process_obj.name} (step {step_order})")
            
            print(f"[DEBUG] ✓ COMPLETE: Product '{product_name}' with {created_count} new templates created")

            return JsonResponse({
                "success": True,
                "message": f"Product '{product_name}' created successfully with {len(processes)} process(es)",
                "product_id": product_obj.ProdID,
                "product_name": product_obj.prodName
            }, status=201)

        except Exception as e:
            print(f"[DEBUG] Error in create_product_with_processes: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=500)
    
    elif request.method == 'GET':
        """Get all products with their configured processes"""
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)
        
        try:
            products = ProductName.objects.all().order_by('-created_at')
            
            result = []
            for product in products:
                # Get ProcessTemplate records for this product (ordered by step)
                templates = ProcessTemplate.objects.filter(product_name=product).order_by('step_order')
                
                # Collect all processes with their step orders
                processes_list = []
                for template in templates:
                    processes_list.append({
                        "process_name": template.process.name,
                        "step_order": template.step_order
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
@role_required('admin', 'production_manager')
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

        # If request_product_id is given, return ALL steps for that product (for delete modal)
        request_product_id_filter = request.GET.get("request_product_id")
        if request_product_id_filter:
            try:
                rp_id = int(request_product_id_filter)
            except (ValueError, TypeError):
                return JsonResponse({"error": "Invalid request_product_id"}, status=400)
            all_steps = ProductProcess.objects.filter(
                request_product_id=rp_id
            ).order_by('step_order')
            serializer = ProductProcessSerializer(all_steps, many=True)
            print(f"[GET Products] request_product_id={rp_id} → {all_steps.count()} steps")
            return JsonResponse(serializer.data, safe=False)

        include_completed = request.GET.get("include_completed", "false").lower() == "true"
        include_archived = request.GET.get("include_archived", "false").lower() == "true"

        if include_completed:
            # Only return steps that are linked to completed AND non-archived requests (have completed_at set)
            if include_archived:
                # Show all completed steps (including archived)
                all_steps = ProductProcess.objects.filter(
                    request_product__isnull=False,
                    request_product__completed_at__isnull=False
                ).exclude(
                    request_product__status='cancelled'
                ).order_by('request_product_id', 'step_order')
            else:
                # Show only completed steps from non-archived requests
                all_steps = ProductProcess.objects.filter(
                    request_product__isnull=False,
                    request_product__completed_at__isnull=False,
                    request_product__archived_at__isnull=True
                ).exclude(
                    request_product__status='cancelled'
                ).order_by('request_product_id', 'step_order')
        else:
            # Filter out steps whose request_product is completed
            # Also filter out template records (request_product=None)
            if include_archived:
                # Show all in-progress steps (even if parent request is archived)
                all_steps = ProductProcess.objects.filter(
                    request_product__isnull=False,
                    archived_at__isnull=True,
                    request_product__completed_at__isnull=True
                ).exclude(
                    request_product__status='cancelled'
                ).order_by('request_product_id', 'step_order')
            else:
                # Show only in-progress steps from non-archived requests (DEFAULT)
                all_steps = ProductProcess.objects.filter(
                    request_product__isnull=False,
                    archived_at__isnull=True,
                    request_product__completed_at__isnull=True,
                    request_product__archived_at__isnull=True
                ).exclude(
                    request_product__status='cancelled'
                ).order_by('request_product_id', 'step_order')

        # Auto-mark request products as completed if all their steps are completed
        from django.utils import timezone
        from django.db.models import Q
        
        # Get all unique request products from the steps (including completed ones for checking)
        if include_completed:
            temp_all_steps = ProductProcess.objects.filter(request_product__completed_at__isnull=False)
        else:
            temp_all_steps = ProductProcess.objects.filter(request_product__completed_at__isnull=True)
            
        request_product_ids = temp_all_steps.values_list('request_product_id', flat=True).distinct()
        
        for rp_id in request_product_ids:
            try:
                rp = RequestProduct.objects.get(id=rp_id)
                
                # Check if this request product should be marked as completed
                if rp.completed_at is None:  # Only mark complete if not already completed
                    # Get all non-archived steps for this request product
                    rp_steps = ProductProcess.objects.filter(
                        request_product_id=rp_id,
                        archived_at__isnull=True
                    )
                    
                    if rp_steps.exists():
                        # Check if all steps are completed
                        all_completed = rp_steps.filter(is_completed=True).count() == rp_steps.count()
                        
                        if all_completed:
                            print(f"[AUTO-COMPLETE] Marking request product {rp_id} as completed - all {rp_steps.count()} steps completed")
                            rp.completed_at = timezone.now()
                            rp.save(update_fields=['completed_at'])
                            
                            # Auto-update parent request status if all its products are now completed
                            if rp.request:
                                rp.request.check_and_update_status()
            except RequestProduct.DoesNotExist:
                pass
            except Exception as e:
                print(f"[AUTO-COMPLETE ERROR] Error marking request product {rp_id} as complete: {str(e)}")

        serializer = ProductProcessSerializer(all_steps, many=True)
        response_data = serializer.data
        
        return JsonResponse(response_data, safe=False)

    elif request.method == 'PATCH':
        try:
            data = JSONParser().parse(request)
            step = ProductProcess.objects.get(id=id)

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
                old_quota = step.completed_quota
                step.completed_quota = data['completed_quota']
                # Track quota update if changed
                if old_quota != data['completed_quota']:
                    from django.utils import timezone
                    step.quota_updated_at = timezone.now()
                    step.quota_updated_by = request.user
                step.save()
                was_marked_complete = step.mark_completed_if_ready()
                # Refresh from DB to get the latest is_completed value
                step.refresh_from_db()
                if was_marked_complete:
                    pass  # Step marked as completed

            # Handle defect_logs - new array-based defect tracking
            if 'defect_logs' in data:
                defect_logs_data = data.get('defect_logs', [])
                from django.utils import timezone
                
                # Delete all existing DefectLog entries for this ProductProcess
                step.defect_logs.all().delete()
                
                # Create new DefectLog entries from the provided array
                created_logs = []
                for log_entry in defect_logs_data:
                    # Skip entries without type (placeholder rows)
                    if not log_entry.get('defect_type'):
                        continue
                    
                    defect_log = DefectLog.objects.create(
                        product_process=step,
                        defect_type=log_entry.get('defect_type'),
                        defect_count=log_entry.get('defect_count', 0)
                    )
                    created_logs.append(defect_log)
                
                # Track defect update
                step.defect_updated_at = timezone.now()
                step.defect_updated_by = request.user
                # Also update quota_updated_at to track general "Last Update" timestamp
                step.quota_updated_at = timezone.now()
                step.quota_updated_by = request.user
                step.save()

            # Handle OT fields - overtime tracking
            if 'is_overtime' in data:
                step.is_overtime = data.get('is_overtime', False)
                
            if 'ot_quota' in data:
                step.ot_quota = data.get('ot_quota', 0)
                
            if 'ot_defect_logs' in data:
                ot_defect_logs_data = data.get('ot_defect_logs', [])
                # Filter out empty entries
                valid_ot_defects = [
                    log for log in ot_defect_logs_data 
                    if log.get('defect_type')
                ]
                step.ot_defect_logs = valid_ot_defects
                
            # Save OT updates if any were made
            if any(key in data for key in ['is_overtime', 'ot_quota', 'ot_defect_logs']):
                from django.utils import timezone
                step.quota_updated_at = timezone.now()
                step.quota_updated_by = request.user
                step.save(update_fields=['is_overtime', 'ot_quota', 'ot_defect_logs', 'quota_updated_at', 'quota_updated_by'])

            # Handle defect_count and defect tracking (legacy - fallback for single defect)
            elif 'defect_count' in data or 'defect_type' in data or 'defect_description' in data:
                old_defect_count = step.defect_count
                if 'defect_count' in data:
                    step.defect_count = data['defect_count']
                if 'defect_type' in data:
                    step.defect_type = data['defect_type']
                if 'defect_description' in data:
                    step.defect_description = data['defect_description']
                
                # Track defect update if defect_count changed or defect type/description was added
                if ('defect_count' in data and old_defect_count != data['defect_count']) or 'defect_type' in data or 'defect_description' in data:
                    from django.utils import timezone
                    step.defect_updated_at = timezone.now()
                    step.defect_updated_by = request.user
                    # Also update quota_updated_at to track general "Last Update" timestamp
                    step.quota_updated_at = timezone.now()
                    step.quota_updated_by = request.user
                
                step.save()

            # Handle workers separately for M2M relationship
            if 'workers' in data:
                workers_data = data.get('workers', [])
                try:
                    step.workers.set(workers_data)
                    # Update quota_updated_at to track that workers were updated
                    from django.utils import timezone
                    step.quota_updated_at = timezone.now()
                    step.quota_updated_by = request.user
                    step.save()
                except Exception as e:
                    raise

            # Update the remaining fields via serializer (excluding workers and defect_logs since we handled them)
            data_for_serializer = {k: v for k, v in data.items() if k not in ['workers', 'defect_logs']}
            
            serializer = ProductProcessSerializer(step, data=data_for_serializer, partial=True)
            if serializer.is_valid():
                updated_step = serializer.save()

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
                    pass

                # Create notification for the customer (requester) about task status update
                try:
                    if request_instance.requester:
                        task_status = request_product.task_status()
                        create_notification(
                            user=request_instance.requester,
                            notification_type='task_status_updated',
                            title='Task Status Updated',
                            message=f'Task status for {request_product.product.prodName} has been updated to {task_status}',
                            related_request=request_instance
                        )
                except Exception as notif_err:
                    pass
                
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
                except Exception as notif_err:
                    pass
                
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
                except Exception as notif_err:
                    pass

                return JsonResponse({
                    "message": "Step updated successfully!",
                    "updated_step": ProductProcessSerializer(updated_step).data
                }, status=200)
            return JsonResponse(serializer.errors, status=400)
        
        except ProductProcess.DoesNotExist:
            return JsonResponse(
                {"error": f"ProductProcess with ID {id} not found"},
                status=404
            )
        except Exception as e:
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
                process_number=_extract_process_details(template.process.name)[0],
                process_name=_extract_process_details(template.process.name)[1],
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
        request_product = step.request_product
        request_instance = request_product.request
        
        step.delete()

        # Audit log entry
        AuditLog.objects.create(
            request=request_instance,
            request_product=request_product,
            action_type="delete",
            old_value=json.dumps(old_snapshot),
            performed_by=request.user
        )

        # Create notifications for step deletion
        try:
            # Notification for the customer (requester) about step deletion
            if request_instance.requester:
                create_notification(
                    user=request_instance.requester,
                    notification_type='task_deleted',
                    title='Task Step Deleted',
                    message=f'Step {old_snapshot.get("step_order", "?")} ({old_snapshot.get("process_name", "Unknown")}) for {request_product.product.prodName} has been deleted',
                    related_request=request_instance
                )
        except Exception as notif_err:
            print(f"[DELETE NOTIFICATION ERROR] Error creating requester notification: {str(notif_err)}")
        
        try:
            # Notification for the user who deleted the step
            create_notification(
                user=request.user,
                notification_type='task_deleted',
                title='Task Step Deleted',
                message=f'You deleted Step {old_snapshot.get("step_order", "?")} ({old_snapshot.get("process_name", "Unknown")}) for {request_product.product.prodName}',
                related_request=request_instance
            )
        except Exception as notif_err:
            print(f"[DELETE NOTIFICATION ERROR] Error creating deleter notification: {str(notif_err)}")
        
        try:
            # Notification for all admin/manager users about step deletion
            admin_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).exclude(id=request.user.id)
            for admin_user in admin_users:
                create_notification(
                    user=admin_user,
                    notification_type='task_deleted',
                    title='Task Step Deleted',
                    message=f'Step {old_snapshot.get("step_order", "?")} ({old_snapshot.get("process_name", "Unknown")}) for {request_product.product.prodName} (Request #{request_instance.RequestID}) was deleted by {request.user.username}',
                    related_request=request_instance
                )
        except Exception as notif_err:
            print(f"[DELETE NOTIFICATION ERROR] Error creating admin notifications: {str(notif_err)}")

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
@role_required('admin', 'production_manager')
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
    from datetime import datetime, timedelta, time
    from django.utils import timezone
    
    # Calculate date range for the month
    first_day = datetime(year, month, 1)
    last_day = (first_day + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    # Convert to timezone-aware datetimes for comparison
    start_datetime = timezone.make_aware(datetime.combine(first_day, time.min))
    end_datetime = timezone.make_aware(datetime.combine(last_day, time.max))
    
    # Filter by updated_at date (more reliable than production_date)
    base_qs = ProductProcess.objects.filter(
        updated_at__gte=start_datetime,
        updated_at__lte=end_datetime,
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

    # Apply archive filtering - now check for completed tasks
    if not include_archived:
        # Show items that are either not completed OR from active requests
        # Filter to show non-completed tasks (in-progress ones)
        final_qs = final_qs.filter(
            request_product__completed_at__isnull=True,  # Task is still in progress
            archived_at__isnull=True,  # Step itself is not archived
            request_product__request__archived_at__isnull=True  # Request is not archived
        )
        print(f"[get_final_step_processes] After filtering (include_archived=False): {final_qs.count()} ProductProcess")
    else:
        # Show completed tasks (when include_archived=True, show completed work)
        final_qs = final_qs.filter(
            request_product__completed_at__isnull=False  # Task is completed
        )
        print(f"[get_final_step_processes] include_archived=True: showing completed tasks {final_qs.count()} ProductProcess")

    return final_qs

@require_http_methods(['GET'])
@role_required('admin', 'production_manager')
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
    from datetime import datetime, timedelta, time
    from django.utils import timezone
    
    # Calculate date range for the month
    first_day = datetime(year, month, 1)
    last_day = (first_day + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    # Convert to timezone-aware datetimes for comparison
    start_datetime = timezone.make_aware(datetime.combine(first_day, time.min))
    end_datetime = timezone.make_aware(datetime.combine(last_day, time.max))
    
    # Get all ProductProcess for this month (not just final steps)
    base_qs = ProductProcess.objects.filter(
        updated_at__gte=start_datetime,
        updated_at__lte=end_datetime,
        request_product__isnull=False  # Only actual tasks, not templates
    )

    if not include_archived:
        # Filter to show only non-completed tasks (in-progress work)
        base_qs = base_qs.filter(
            archived_at__isnull=True,
            request_product__completed_at__isnull=True
        )

    # Debug output disabled for production clarity

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
                    pass  # Error getting product name
                
                # Add the current step's data
                weekly_data[week]["completed"] += current_step.completed_quota
                weekly_data[week]["defects"] += current_step.defect_count
                
                # Store product name for hover display
                if product_name not in weekly_data[week]["products"]:
                    weekly_data[week]["products"].append(product_name)
                
                counted_request_products.add(rp_id)

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
@role_required('admin', 'production_manager')
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
    raw = [active_qty, completed_qty, rejected_qty]
    percentages = [pct(active_qty), pct(completed_qty), pct(rejected_qty)]

    return JsonResponse({
        "labels": labels,
        "data": raw,
        "percentages": percentages,
        "total": total
    })


@require_http_methods(['GET'])
@role_required('admin', 'production_manager')
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
@role_required('admin', 'production_manager')
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
    from datetime import datetime, timedelta, time
    from django.utils import timezone
    
    active_qty = 0
    completed_qty = 0
    rejected_qty = 0

    # Calculate date range for the month
    first_day = datetime(year, month, 1)
    last_day = (first_day + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    # Convert to timezone-aware datetimes for comparison
    start_datetime = timezone.make_aware(datetime.combine(first_day, time.min))
    end_datetime = timezone.make_aware(datetime.combine(last_day, time.max))
    
    # Get ALL ProductProcess records within the date range (not just final steps)
    base_qs = ProductProcess.objects.filter(
        updated_at__gte=start_datetime,
        updated_at__lte=end_datetime,
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
    from datetime import datetime, timedelta, time
    from django.utils import timezone
    
    # Calculate date range for the month
    first_day = datetime(year, month, 1)
    last_day = (first_day + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    # Convert to timezone-aware datetimes for comparison
    start_datetime = timezone.make_aware(datetime.combine(first_day, time.min))
    end_datetime = timezone.make_aware(datetime.combine(last_day, time.max))
    
    # Get all ProductProcess for this month (not just final steps) - same as bar chart
    base_qs = ProductProcess.objects.filter(
        updated_at__gte=start_datetime,
        updated_at__lte=end_datetime,
        request_product__isnull=False  # Only actual tasks, not templates
    )

    if not include_archived:
        # Filter to show only non-completed tasks (in-progress work)
        base_qs = base_qs.filter(
            archived_at__isnull=True,
            request_product__completed_at__isnull=True
        )
    # else: when include_archived=True, show ALL tasks (both in-progress and completed)
    # No additional filter needed

    # Aggregate by product and sum completed_quota
    product_totals = (
        base_qs
        .values("request_product__product__prodName")
        .annotate(total_quota=Sum("completed_quota"))
        .filter(total_quota__gt=0)
        .order_by("-total_quota")[:limit]
    )

    return list(product_totals)

@csrf_exempt
@require_http_methods(['GET'])
def list_users(request):
    # Allow all authenticated users to view verified (active) users
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    try:
        # Get query parameter to filter by status: 'pending', 'active', or 'all'
        status = request.GET.get('status', 'pending').lower()
        
        # Only admins and production managers can see pending users
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            is_admin_or_manager = user_profile.role in [Roles.ADMIN, Roles.PRODUCTION_MANAGER]
        except UserProfile.DoesNotExist:
            is_admin_or_manager = False
        
        # Override status to only show active users if not admin/manager
        if not is_admin_or_manager:
            status = 'active'
        
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
@role_required('admin', 'production_manager')
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


@require_http_methods(['GET'])
@role_required('admin', 'production_manager')
@csrf_exempt
def generate_pdf_report(request):
    try:
        today = date.today()
        month = int(request.GET.get("month", today.month))
        year  = int(request.GET.get("year", today.year))
        limit = int(request.GET.get("limit", 5))

        include_archived = request.GET.get("include_archived", "false").lower() == "true"

        print(f"[DEBUG] generate_pdf_report: month={month}, year={year}, limit={limit}, include_archived={include_archived}")

        bar_data   = get_bar_report_data(month, year, include_archived)
        pie_data   = get_pie_report_data(month, year, include_archived)
        donut_data = get_donut_top_products(month, year, limit, include_archived)

        # Create PDF in memory
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, rightMargin=0.5*inch, leftMargin=0.5*inch, topMargin=0.75*inch, bottomMargin=0.75*inch)
        elements = []

        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1D6AB7'),
            spaceAfter=6,
            alignment=1  # Center
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1D6AB7'),
            spaceAfter=12,
            spaceBefore=12
        )
        normal_style = styles['Normal']

        # Header Section with Logo on Left side (no interference with center)
        logo_path = os.path.join(os.path.dirname(__file__), 'assets', 'Group 1.png')
        
        try:
            if os.path.exists(logo_path):
                logo = Image(logo_path, width=0.8*inch, height=0.8*inch)
            else:
                logo = Paragraph("", normal_style)  # Fallback if logo not found
        except Exception as e:
            print(f"[DEBUG] Error loading logo: {e}")
            logo = Paragraph("", normal_style)  # Fallback if logo not found
        
        # Centered title and contact info - will not be affected by logo
        title_text = Paragraph("<b>WB Technologies</b><br/>info@wbtechnologies.com | (02) 994 9971", title_style)
        
        # 2-column layout: Logo on LEFT | Centered contact info on RIGHT
        # Logo has its own narrow column, contact info centered in wider column
        header_table = Table(
            [[logo, title_text]],  # Single row with logo and centered text
            colWidths=[0.9*inch, 6.6*inch]  # Logo narrow column + wide text column
        )
        header_table.setStyle(TableStyle([
            # Logo column: left aligned and top
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('VALIGN', (0, 0), (0, 0), 'TOP'),
            
            # Text column: centered
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (1, 0), (1, 0), 'MIDDLE'),
            
            # Remove ALL padding
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.3*inch))

        # Report Title
        report_title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1D6AB7'),
            spaceAfter=12,
            alignment=1  # Center
        )
        month_name = calendar.month_name[month]
        elements.append(Paragraph(f"Production Report - {month_name} {year}", report_title_style))
        elements.append(Spacer(1, 0.2*inch))

        # Metadata Table
        generated_date = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        username = request.user.username if request.user.is_authenticated else "Unknown"
        
        metadata_data = [
            ["Generated By:", username],
            ["Generated Date:", generated_date],
            ["Report Period:", f"{month_name} {year}"],
            ["Include Archived:", "Yes" if include_archived else "No"]
        ]

        metadata_table = Table(metadata_data, colWidths=[2*inch, 3.5*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F0F0F0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC'))
        ]))
        elements.append(metadata_table)
        elements.append(Spacer(1, 0.3*inch))

        # Production Summary
        elements.append(Paragraph("Production Summary - Weekly Breakdown", heading_style))
        summary_data = [["Week", "Defects", "Completed"]]
        for week in sorted(bar_data.keys()):
            summary_data.append([f"Week {week}", str(bar_data[week]["defects"]), str(bar_data[week]["completed"])])

        summary_table = Table(summary_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1D6AB7')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')])
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))

        # Production Percentages
        elements.append(Paragraph("Production Percentages", heading_style))
        pie_data_table = [["Category", "Percentage", "Quantity"]]
        for label, pct, raw in zip(pie_data["labels"], pie_data["percentages"], pie_data["raw"]):
            pie_data_table.append([label, f"{pct}%", str(raw)])

        pie_table = Table(pie_data_table, colWidths=[2*inch, 1.5*inch, 1.5*inch])
        pie_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#46E63E')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CCCCCC')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')])
        ]))
        elements.append(pie_table)

        # Build PDF
        doc.build(elements)
        pdf_buffer.seek(0)

        # Return PDF file
        month_name = calendar.month_name[month]
        filename = f"TechTrack_Report_{month_name}_{year}.pdf"
        response = FileResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        print(f"[DEBUG] PDF report generated successfully: {filename}")
        return response

    except Exception as e:
        print(f"[ERROR] generate_pdf_report failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(['POST', 'PATCH'])
@role_required('admin', 'production_manager')
@csrf_exempt
def archive_request(request, id):
    try:
        req = Requests.objects.get(RequestID=id)
    except Requests.DoesNotExist:
        return JsonResponse({"error": "Request not found"}, status=404)

    old_value = str(req.archived_at)
    now = timezone.now()
    
    # Get cancellation reason from request body
    try:
        body = json.loads(request.body) if request.body else {}
        cancellation_reason = body.get('cancellation_reason', 'Cancelled')
    except json.JSONDecodeError:
        cancellation_reason = 'Cancelled'

    # Archive the Request itself
    req.archived_at = now
    req.save()

    # Archive all RequestProducts under this Request
    # Set cancelled_by, cancelled_at, and cancellation_reason
    RequestProduct.objects.filter(request=req).update(
        archived_at=now,
        cancelled_at=now,
        cancelled_by=request.user,
        cancellation_reason=cancellation_reason
    )

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
        "archived_at": req.archived_at,
        "cancelled_by": request.user.get_full_name() or request.user.username,
        "cancellation_reason": cancellation_reason
    }, status=200)

@require_http_methods(['POST', 'PATCH'])
@role_required('admin', 'production_manager')
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

@require_http_methods(["GET"])
@csrf_exempt
def auditlog_view(request):
    """Get all audit logs - requires authentication"""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    # Grab latest 50 logs (newest first)
    logs = AuditLog.objects.select_related("request", "request_product", "performed_by").order_by('-timestamp')[:50]
    serializer = AuditLogSerializer(logs, many=True)
    return JsonResponse(serializer.data, safe=False, status=200)

@role_required('admin', 'manager')
@csrf_exempt
def auditlog_delete(request, pk: int):
    try:
        log = AuditLog.objects.get(pk=pk)
        log.delete()
        return JsonResponse({"message": f"Audit log {pk} deleted successfully."}, status=200)
    except AuditLog.DoesNotExist:
        return JsonResponse({"error": "Audit log not found."}, status=404)

@require_http_methods(["GET"])
@csrf_exempt
def user_activity_logs(request):
    """Fetch activity logs for the current user - includes actions performed by user and actions on their requests"""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    try:
        from django.utils import timezone
        from datetime import datetime, timedelta
        
        user = request.user
        limit = int(request.GET.get('limit', 50))
        offset = int(request.GET.get('offset', 0))
        
        # Get date filter parameters
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        user_role = None
        if hasattr(user, "userprofile"):
            user_role = user.userprofile.role

        # Build base queryset.
        # Admin and production manager need broader activity history visibility,
        # while customers should only see their own request-related activity.
        if user_role in [Roles.ADMIN, Roles.PRODUCTION_MANAGER]:
            logs_query = AuditLog.objects.select_related(
                "request", "request_product", "performed_by"
            ).filter(
                Q(performed_by__isnull=False) |
                Q(request__isnull=False) |
                Q(request_product__isnull=False)
            )
        else:
            logs_query = AuditLog.objects.select_related(
                "request", "request_product", "performed_by"
            ).filter(
                # Actions performed by this user
                Q(performed_by=user) |
                # Actions on requests created by this user
                Q(request__requester=user) |
                # Actions on products related to this user's requests
                Q(request_product__request__requester=user)
            )
        
        # Apply date filters if provided
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str).replace(hour=0, minute=0, second=0)
                logs_query = logs_query.filter(timestamp__gte=start_date)
            except:
                pass
        
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str).replace(hour=23, minute=59, second=59)
                logs_query = logs_query.filter(timestamp__lte=end_date)
            except:
                pass
        
        # Get total count for pagination
        total_count = logs_query.count()
        
        # Apply ordering and pagination
        logs = logs_query.order_by('-timestamp')[offset:offset + limit]
        
        serializer = AuditLogSerializer(logs, many=True)
        return JsonResponse({
            "logs": serializer.data,
            "total_count": total_count,
            "offset": offset,
            "limit": limit
        }, safe=False, status=200)
    except Exception as e:
        print(f"[ERROR] Error fetching user activity logs: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["GET", "PATCH", "PUT"])
@csrf_exempt
def profile_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    profile = UserProfile.objects.get(user=request.user)

    if request.method == "GET":
        data = {
            "username": request.user.username,
            "email": request.user.email,
            "full_name": profile.full_name,
            "company_name": profile.company_name,
            "contact_number": profile.contact_number,
            "role": profile.role,
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

        # Store old values for audit log
        old_values = {
            "full_name": UserProfile.objects.get(user=request.user).full_name,
            "contact_number": UserProfile.objects.get(user=request.user).contact_number
        }

        profile.full_name = data.get("full_name", profile.full_name)
        profile.company_name = data.get("company_name", profile.company_name)
        profile.contact_number = data.get("contact_number", profile.contact_number)
        profile.save()

        # Log audit entry for profile update
        new_values = {
            "full_name": profile.full_name,
            "contact_number": profile.contact_number
        }
        log_audit(
            user=request.user,
            action_type="profile_update",
            old_value=json.dumps(old_values),
            new_value=json.dumps(new_values)
        )

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

@require_http_methods(['POST'])
def change_password_view(request):
    """Change the current user's password with validation and rate limiting."""
    try:
        from django.utils.timezone import now
        from datetime import timedelta
        
        profile = UserProfile.objects.get(user=request.user)
        data = json.loads(request.body)
        
        current_password = data.get("current_password", "").strip()
        new_password = data.get("new_password", "").strip()
        confirm_password = data.get("confirm_password", "").strip()
        
        # Validate inputs
        if not all([current_password, new_password, confirm_password]):
            return JsonResponse({
                "detail": "All fields are required"
            }, status=400)
        
        # Check if current password is correct
        if not request.user.check_password(current_password):
            return JsonResponse({
                "detail": "Current password is incorrect"
            }, status=400)
        
        # Check if new passwords match
        if new_password != confirm_password:
            return JsonResponse({
                "detail": "New passwords do not match"
            }, status=400)
        
        # Password strength validation (minimum 6 characters)
        if len(new_password) < 6:
            return JsonResponse({
                "detail": "Password must be at least 6 characters long"
            }, status=400)
        
        # Check if new password is same as old password
        if request.user.check_password(new_password):
            return JsonResponse({
                "detail": "New password cannot be the same as current password"
            }, status=400)
        
        # Rate limiting: Check if user changed password in the last 24 hours
        last_password_change = AuditLog.objects.filter(
            performed_by=request.user,
            action_type="password_change"
        ).order_by("-timestamp").first()
        
        if last_password_change:
            time_since_last_change = now() - last_password_change.timestamp
            if time_since_last_change < timedelta(hours=24):
                hours_remaining = 24 - int(time_since_last_change.total_seconds() / 3600)
                return JsonResponse({
                    "detail": f"You can only change your password once per 24 hours. Try again in {hours_remaining} hour(s)."
                }, status=429)
        
        # Update password
        request.user.set_password(new_password)
        request.user.save()
        
        # Log audit entry
        log_audit(
            user=request.user,
            action_type="password_change",
            old_value="[password_changed]",
            new_value="[password_changed]"
        )
        
        return JsonResponse({
            "detail": "Password changed successfully"
        }, status=200)
        
    except UserProfile.DoesNotExist:
        return JsonResponse({
            "detail": "User profile not found"
        }, status=404)
    except json.JSONDecodeError:
        return JsonResponse({
            "detail": "Invalid request body"
        }, status=400)
    except Exception as e:
        return JsonResponse({
            "detail": str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(['GET', 'PATCH'])
def requestProductAPI(request, id=0):
    include_archived = request.GET.get("include_archived", "false").lower() == "true"
    archived_only = request.GET.get("archived_only", "false").lower() == "true"
    status_filter = request.GET.get("status", "").lower()

    # Map query params to normalized status strings
    status_map = {
        "not-started": "not started",
        "started": "🚀 started",
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
        # Archive a request product (only this one, NOT the entire request)
        try:
            request_product = RequestProduct.objects.get(id=id)
            data = JSONParser().parse(request)
            
            print(f"[requestProductAPI PATCH] Archiving RequestProduct ID={id}")
            print(f"   Product: {request_product.product.prodName if request_product.product else 'N/A'}")
            print(f"   Issuance/Request ID: {request_product.request.RequestID if request_product.request else 'N/A'}")
            print(f"   Other products in same issuance BEFORE: {request_product.request.request_products.count()}")
            
            if 'archived_at' in data:
                from django.utils import timezone
                request_product.archived_at = timezone.now()
                request_product.save()
                
                print(f"   ✅ RequestProduct {id} archived successfully")
                print(f"   Verify: archived_at is now {request_product.archived_at}")
                print(f"   Other products in same issuance AFTER: {request_product.request.request_products.filter(archived_at__isnull=True).count()}")

            elif data.get('status') == 'cancelled':
                from django.utils import timezone
                cancelled_at = timezone.now()
                request_product.status = 'cancelled'
                request_product.cancelled_at = cancelled_at
                request_product.archived_at = cancelled_at
                request_product.restored_at = None
                request_product.cancelled_by = request.user
                request_product.cancellation_reason = data.get('cancellation_reason', 'Cancelled by production manager')
                
                # Store cancellation progress snapshot
                cancellation_progress = data.get('cancellation_progress', {})
                print(f"[DEBUG] Received cancellation data:")
                print(f"   Raw request data: {data}")
                print(f"   Extracted cancellation_progress: {cancellation_progress}")
                if cancellation_progress:
                    request_product.cancellation_progress = cancellation_progress
                    print(f"   ✅ Stored cancellation_progress on RequestProduct: {request_product.cancellation_progress}")
                else:
                    print(f"   ⚠️ No cancellation_progress data received or empty")
                
                request_product.save()
                print(f"   ✅ RequestProduct {id} cancelled successfully")
                print(f"   Final cancellation_progress in DB: {request_product.cancellation_progress}")

                log_audit(
                    request.user,
                    'archive',
                    request_obj=request_product.request,
                    request_product_obj=request_product,
                    old_value=json.dumps({
                        'status': 'active',
                        'product_name': request_product.product.prodName if request_product.product else None,
                    }),
                    new_value=json.dumps({
                        'status': 'cancelled',
                        'reason': request_product.cancellation_reason,
                    })
                )
                
                # Create notification for requester
                try:
                    req = request_product.request
                    if req.requester:
                        create_notification(
                            user=req.requester,
                            notification_type='task_status_updated',
                            title=f'Product Cancelled: {request_product.product.prodName}',
                            message=f'{request_product.product.prodName} from Request #{req.RequestID} was cancelled.',
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
                            notification_type='task_status_updated',
                            title=f'Product Cancelled: {request_product.product.prodName}',
                            message=f'{request_product.product.prodName} from Request #{req.RequestID} was cancelled by {request.user.username}.',
                            related_request=req
                        )
                except Exception as notif_err:
                    print(f"[DEBUG] Failed to create admin notifications: {notif_err}")
                
                return JsonResponse({
                    "message": "Request product archived successfully",
                    "id": request_product.id,
                    "archived_at": request_product.archived_at,
                    "request_id": request_product.request.RequestID if request_product.request else None,
                    "product_name": request_product.product.prodName if request_product.product else None
                }, status=200)
            
            return JsonResponse({
                "message": "Request product updated successfully",
                "id": request_product.id,
                "status": request_product.status,
                "request_id": request_product.request.RequestID if request_product.request else None,
                "product_name": request_product.product.prodName if request_product.product else None
            }, status=200)
        except RequestProduct.DoesNotExist:
            return JsonResponse({"error": "Request product not found"}, status=404)
        except Exception as e:
            print(f"[ERROR] Exception in requestProductAPI PATCH: {str(e)}")
            return JsonResponse({"error": str(e)}, status=400)
    
    if id == 0:
        requests = Requests.objects.all() if include_archived else Requests.objects.filter(archived_at__isnull=True)
        response_data = []

        for req in requests.order_by('-created_at'):
            products = req.request_products.exclude(status='cancelled').order_by('-request__created_at')
            
            # Apply archived filter
            if archived_only:
                products = products.filter(archived_at__isnull=False)
            elif not include_archived:
                products = products.filter(archived_at__isnull=True)
            
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
        
        # Apply archived filter
        if archived_only:
            products = products.filter(archived_at__isnull=False)
        elif not include_archived:
            products = products.filter(archived_at__isnull=True)
        
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
    request_status_filter = request.GET.get("request_status", "").lower()  # NEW: Filter by new_request vs active

    # Map query params to normalized status strings
    status_map = {
        "not-started": "not started",
        "started": "🚀 started",
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

    # Fetch ALL requests first (don't filter by status yet)
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

        # Auto-update request status if all ACTIVE (non-archived) products are 100% complete
        # Only count non-archived products for completion check
        active_products = req.request_products.filter(archived_at__isnull=True)
        total_requested = sum(rp.quantity for rp in active_products)
        total_completed = sum(rp.get_completed_quota() for rp in active_products)
        
        print(f"\n{'='*80}")
        print(f"[REQUEST #{req.RequestID}]")
        print(f"  Status: {req.request_status}")
        print(f"  Active Products: {active_products.count()}")
        print(f"  Total Requested (Active): {total_requested}")
        print(f"  Total Completed (Active): {total_completed}")
        print(f"  Product Details:")
        for rp in active_products:
            completed = rp.get_completed_quota()
            percent = (completed / rp.quantity * 100) if rp.quantity > 0 else 0
            print(f"    - {rp.product.prodName}: {completed}/{rp.quantity} ({percent:.1f}%)")
        
        if total_requested > 0 and total_completed >= total_requested:
            if req.request_status != "completed":
                print(f"  ✓ AUTO-COMPLETING this request")
                req.request_status = "completed"
                req.save(update_fields=['request_status'])
            else:
                print(f"  ✓ Already marked as completed")
        else:
            print(f"  ✗ Not yet complete ({total_completed}/{total_requested})")
        print(f"{'='*80}\n")
        
        # NOW filter by request_status after updating
        if request_status_filter == "completed":
            if req.request_status != "completed":
                continue
        elif request_status_filter == "active":
            # Show both "new_request" and "active" status (all in-progress work)
            if req.request_status not in ["new_request", "active"]:
                continue

        serializer = CustomerProductDetailSerializer(products, many=True)
        response_data.append({
            "RequestID": req.RequestID,
            "deadline": req.deadline.strftime("%m/%d/%Y") if req.deadline else "N/A",
            "created_at": req.created_at.strftime("%m/%d/%Y") if req.created_at else "N/A",
            "request_status": req.request_status,  # NEW: Include request_status in response
            "request_products": serializer.data
        })

    return JsonResponse(response_data, safe=False)


@login_required
def customer_cancelled_requests_view(request):
    """
    Returns a list of all cancelled request products for the logged-in customer.
    """
    try:
        user = request.user
        
        # Get all cancelled request products for this customer
        cancelled_products = RequestProduct.objects.filter(
            request__requester=user,
            archived_at__isnull=False
        ).select_related(
            'request', 
            'product',
            'cancelled_by'
        ).order_by('-archived_at')
        
        # Build response data
        cancelled_requests = []
        for rp in cancelled_products:
            try:
                # Skip if request or product is None
                if not rp.request or not rp.product:
                    continue
                
                # Determine who cancelled the request
                cancelled_by_user = rp.cancelled_by
                
                # If cancelled_by is not set, try to get it from audit log
                if not cancelled_by_user and rp.request:
                    try:
                        audit_log = AuditLog.objects.filter(
                            request=rp.request,
                            action_type='archive'
                        ).order_by('-timestamp').first()
                        if audit_log and audit_log.performed_by:
                            cancelled_by_user = audit_log.performed_by
                    except Exception as audit_err:
                        print(f"[WARN] Could not get audit log for request {rp.request.RequestID}: {str(audit_err)}")
                
                cancelled_by_name = (cancelled_by_user.get_full_name() or cancelled_by_user.username) if cancelled_by_user else 'System'
                deadline_value = rp.deadline_extension or rp.request.deadline
                created_at_str = rp.request.created_at.strftime("%m/%d/%Y") if rp.request.created_at else "N/A"
                
                cancelled_requests.append({
                    'id': rp.id,
                    'request_id': None,
                    'product_name': rp.product.prodName,
                    'quantity': rp.quantity,
                    'deadline': deadline_value.strftime("%Y-%m-%d") if deadline_value else None,
                    'cancelled_by_name': cancelled_by_name,
                    'cancellation_reason': rp.cancellation_reason if rp.cancellation_reason else 'Cancelled',
                    'cancellation_progress': rp.cancellation_progress or {},
                    'created_at': created_at_str,
                    'updated_at': _format_cancelled_timestamp(rp.archived_at or rp.cancelled_at),
                })
            except Exception as item_err:
                print(f"[ERROR] Processing cancelled product {rp.id}: {str(item_err)}")
                import traceback
                traceback.print_exc()
                continue
        
        return JsonResponse({
            'cancelled_requests': cancelled_requests,
            'count': len(cancelled_requests)
        })
        
    except Exception as e:
        print(f"[ERROR] Customer cancelled requests error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': f"Error fetching cancelled requests: {str(e)}",
            'cancelled_requests': [],
            'count': 0
        }, status=500)


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
        print("[GET_SETTINGS] Attempting to fetch system settings...")
        try:
            settings_obj = SystemSettings.get_settings()
            print(f"[GET_SETTINGS] Got settings object: {settings_obj}")
        except Exception as e:
            print(f"[GET_SETTINGS] ERROR getting settings object: {str(e)}")
            fallback_relative_url = _read_login_background_fallback_url()
            fallback_url = request.build_absolute_uri(fallback_relative_url) if fallback_relative_url else None
            # Return default settings if there's an issue
            return JsonResponse({
                "enable_email_alerts": True,
                "data_retention_days": 365,
                "enable_audit_logs": True,
                "session_timeout_minutes": 15,
                "enable_session_timeout": True,
                "login_background_image_url": fallback_url,
            }, status=200)
        
        serializer = SystemSettingsSerializer(settings_obj, context={'request': request})
        print(f"[GET_SETTINGS] Serialized settings successfully")
        return JsonResponse(serializer.data, status=200)
    except Exception as e:
        print(f"[ERROR] Error fetching settings: {str(e)}")
        import traceback
        traceback.print_exc()
        fallback_relative_url = _read_login_background_fallback_url()
        fallback_url = request.build_absolute_uri(fallback_relative_url) if fallback_relative_url else None
        # Return default settings instead of 500 error
        return JsonResponse({
            "enable_email_alerts": True,
            "data_retention_days": 365,
            "enable_audit_logs": True,
            "session_timeout_minutes": 15,
            "enable_session_timeout": True,
            "login_background_image_url": fallback_url,
        }, status=200)


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
        
        # Capture old values before changes
        old_values = SystemSettingsSerializer(settings_obj).data
        
        # Update fields
        if 'enable_email_alerts' in data:
            settings_obj.enable_email_alerts = data['enable_email_alerts']
        if 'data_retention_days' in data:
            settings_obj.data_retention_days = data['data_retention_days']
        if 'enable_audit_logs' in data:
            settings_obj.enable_audit_logs = data['enable_audit_logs']
        
        settings_obj.updated_by = request.user
        settings_obj.save()
        
        # Log audit entry for settings update
        try:
            new_values = SystemSettingsSerializer(settings_obj).data
            log_audit(
                user=request.user,
                action_type="settings_update",
                old_value=json.dumps(old_values),
                new_value=json.dumps(new_values)
            )
        except Exception as audit_err:
            print(f"[AUDIT] Failed to log settings update: {str(audit_err)}")
        
        serializer = SystemSettingsSerializer(settings_obj, context={'request': request})
        return JsonResponse(serializer.data, status=200)
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    except Exception as e:
        print(f"Error updating settings: {str(e)}")
        return JsonResponse({"detail": f"Server error: {str(e)}"}, status=500)


@csrf_exempt
@role_required('admin')
@require_http_methods(["POST"])
def upload_login_background(request):
    """
    Upload login page background image.
    POST /app/settings/login-background/
    Admin-only endpoint.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    uploaded_file = request.FILES.get('background_image')
    if not uploaded_file:
        return JsonResponse({"detail": "No image file provided."}, status=400)

    content_type = getattr(uploaded_file, 'content_type', '') or ''
    if not content_type.startswith('image/'):
        return JsonResponse({"detail": "Only image files are allowed."}, status=400)

    max_size = 10 * 1024 * 1024  # 10MB
    if uploaded_file.size > max_size:
        return JsonResponse({"detail": "Image is too large. Maximum size is 10MB."}, status=400)

    try:
        settings_obj = SystemSettings.get_settings()
        old_url = settings_obj.login_background_image.url if settings_obj.login_background_image else None

        # Replace old file with newly uploaded image.
        if settings_obj.login_background_image:
            settings_obj.login_background_image.delete(save=False)

        settings_obj.login_background_image = uploaded_file
        settings_obj.updated_by = request.user
        settings_obj.save()

        serializer = SystemSettingsSerializer(settings_obj, context={'request': request})

        try:
            log_audit(
                user=request.user,
                action_type="settings_update",
                old_value=json.dumps({"login_background_image_url": old_url}),
                new_value=json.dumps({"login_background_image_url": serializer.data.get('login_background_image_url')})
            )
        except Exception as audit_err:
            print(f"[AUDIT] Failed to log login background update: {str(audit_err)}")

        return JsonResponse(serializer.data, status=200)
    except Exception as e:
        print(f"[UPLOAD_LOGIN_BACKGROUND] Falling back to file storage due to settings table error: {str(e)}")

        try:
            storage_location = os.path.join(settings.MEDIA_ROOT, 'login_backgrounds')
            storage = FileSystemStorage(
                location=storage_location,
                base_url=f"{settings.MEDIA_URL}login_backgrounds/"
            )
            saved_filename = storage.save(uploaded_file.name, uploaded_file)
            relative_url = storage.url(saved_filename)
            _save_login_background_fallback_url(relative_url)

            return JsonResponse({
                "login_background_image_url": request.build_absolute_uri(relative_url)
            }, status=200)
        except Exception as fallback_err:
            print(f"[UPLOAD_LOGIN_BACKGROUND] Fallback save failed: {str(fallback_err)}")
            return JsonResponse({"detail": f"Server error: {str(fallback_err)}"}, status=500)


@require_http_methods(["GET"])
def public_login_background(request):
    """
    Public endpoint to fetch login background image URL.
    GET /app/public/login-background/
    """
    try:
        settings_obj = SystemSettings.get_settings()
        image_url = None
        if settings_obj.login_background_image:
            image_url = request.build_absolute_uri(settings_obj.login_background_image.url)
        elif _read_login_background_fallback_url():
            image_url = request.build_absolute_uri(_read_login_background_fallback_url())
        return JsonResponse({"login_background_image_url": image_url}, status=200)
    except Exception as e:
        print(f"[PUBLIC_LOGIN_BACKGROUND] Error: {str(e)}")
        fallback_relative_url = _read_login_background_fallback_url()
        fallback_url = request.build_absolute_uri(fallback_relative_url) if fallback_relative_url else None
        return JsonResponse({"login_background_image_url": fallback_url}, status=200)


@csrf_exempt
@csrf_exempt
@role_required('admin', 'production_manager')
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
@role_required('admin', 'production_manager')
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
@role_required('admin', 'production_manager')
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
        
        # Debug output disabled for production clarity
        
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
        return JsonResponse({"detail": f"Error: {str(e)}"}, status=500)


@csrf_exempt
@require_http_methods(['GET'])
def debug_dashboard_data(request):
    """Debug endpoint to see what data is available"""
    # No role requirement - accessible to all authenticated users
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Unauthorized"}, status=401)
    
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

def log_audit(user, action_type, request_obj=None, request_product_obj=None, old_value=None, new_value=None):
    """
    Helper function to create audit logs for all user activities
    
    Parameters:
    - user: User who performed the action
    - action_type: Type of action (create, update, delete, archive, etc.)
    - request_obj: Optional Requests object
    - request_product_obj: Optional RequestProduct object
    - old_value: Previous value (JSON or string)
    - new_value: New value (JSON or string)
    """
    try:
        from django.utils import timezone
        AuditLog.objects.create(
            request=request_obj,
            request_product=request_product_obj,
            action_type=action_type,
            old_value=old_value,
            new_value=new_value,
            performed_by=user
        )
        print(f"[AUDIT] {user.username} - {action_type} at {timezone.now()}")
    except Exception as e:
        print(f"[AUDIT ERROR] Failed to create audit log: {str(e)}")



# Extension Request Endpoints
@csrf_exempt
@require_http_methods(['POST'])
def request_deadline_extension(request, id):
    """Request a deadline extension for a request product"""
    try:
        # Check authentication
        if not request.user.is_authenticated:
            return error_response("Authentication required", code=401)
        
        data = JSONParser().parse(request)
        new_deadline = data.get('new_deadline')
        reason = data.get('reason', '')
        
        if not new_deadline:
            return error_response("new_deadline is required", code=400)
        
        request_product = RequestProduct.objects.get(id=id)
        product_request = request_product.request
        
        # Check if user is authorized (production manager can request extension)
        try:
            user_role = request.user.userprofile.role if hasattr(request.user, 'userprofile') else None
        except Exception as e:
            print(f"[ERROR] Error getting user role: {str(e)}")
            user_role = None
        
        # Only production managers and admins can request extensions
        is_manager = user_role in ('production_manager', 'admin')
        
        if not is_manager:
            print(f"[ERROR] User {request.user.username} role '{user_role}' not authorized to request extension")
            return error_response(f"Only production managers can request extensions. Your role: {user_role}", code=403)
        
        # Set extension details
        request_product.deadline_extension = new_deadline
        request_product.extension_status = 'pending'
        request_product.requested_at = timezone.now()
        request_product.save()
        
        # Create audit log
        AuditLog.objects.create(
            request_product=request_product,
            action_type='extension_request',
            new_value=f"Extension requested to {new_deadline}. Reason: {reason}",
            performed_by=request.user
        )
        
        # Notify customer
        if product_request.requester:
            create_notification(
                user=product_request.requester,
                notification_type='extension_requested',
                title=f"WB Technology is requesting an extension",
                message=f"Extension requested for {request_product.product.prodName} until {new_deadline}",
                related_request=product_request,
                related_request_product=request_product,
                action_data={
                    'request_product_id': id,
                    'new_deadline': str(new_deadline),
                    'reason': reason,
                    'type': 'extension_request'
                }
            )
        
        return success_response({
            'id': request_product.id,
            'request_id': product_request.RequestID,
            'product': request_product.product.prodName,
            'new_deadline': str(new_deadline),
            'status': 'pending',
            'message': 'Extension request submitted successfully'
        })
    except RequestProduct.DoesNotExist:
        return error_response("Request product not found", code=404)
    except Exception as e:
        print(f"[ERROR] Extension request error: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Error requesting extension: {str(e)}", code=500)


@csrf_exempt
@require_http_methods(['POST'])
def approve_deadline_extension(request, id):
    """Approve a deadline extension request"""
    try:
        # Check authentication
        if not request.user.is_authenticated:
            return error_response("Authentication required", code=401)
        
        data = JSONParser().parse(request)
        
        request_product = RequestProduct.objects.get(id=id)
        product_request = request_product.request
        
        # Check if user is authorized (customer who submitted the request)
        user_role = request.user.userprofile.role if hasattr(request.user, 'userprofile') else None
        is_customer = user_role == 'customer' and product_request.requester == request.user
        
        if not is_customer:
            return error_response("Only the customer who submitted the request can approve extensions", code=403)
        
        if request_product.extension_status != 'pending':
            return error_response(f"Cannot approve extension with status: {request_product.extension_status}", code=400)
        
        # Approve the extension
        request_product.extension_status = 'approved'
        request_product.save()
        
        # Create audit log
        AuditLog.objects.create(
            request_product=request_product,
            action_type='extension_approved',
            new_value=f"Extension approved to {request_product.deadline_extension}",
            performed_by=request.user
        )
        
        # Notify production managers
        production_managers = User.objects.filter(userprofile__role__in=['production_manager', 'admin'])
        for pm in production_managers:
            create_notification(
                user=pm,
                notification_type='extension_approved',
                title=f"Extension Approved: {request_product.product.prodName}",
                message=f"Customer {request.user.username} approved the deadline extension to {request_product.deadline_extension}.",
                related_request=product_request,
                related_request_product=request_product
            )
        
        return success_response({
            'id': request_product.id,
            'request_id': product_request.RequestID,
            'status': 'approved',
            'new_deadline': str(request_product.deadline_extension),
            'message': 'Extension approved successfully'
        })
    except RequestProduct.DoesNotExist:
        return error_response("Request product not found", code=404)
    except Exception as e:
        print(f"[ERROR] Approve extension error: {str(e)}")


@require_http_methods(["GET"])
def cancelled_requests_view(request):
    """
    Returns a list of all cancelled product requests.
    Available to admin and production_manager roles.
    """
    try:
        # Get user role
        user_role = request.user.userprofile.role if hasattr(request.user, 'userprofile') else None
        
        # Only allow admin and production_manager to view cancelled requests
        if user_role not in ['admin', 'production_manager']:
            return error_response("Unauthorized access", code=403)
        
        # Include both legacy cancelled tasks and archived cancellations.
        cancelled_products = RequestProduct.objects.filter(
            Q(archived_at__isnull=False) | Q(status='cancelled')
        ).select_related(
            'request', 
            'product',
            'cancelled_by'
        ).order_by('-archived_at', '-cancelled_at')
        
        # Build response data
        cancelled_requests = []
        for rp in cancelled_products:
            try:
                # Skip if request or product is None
                if not rp.request or not rp.product:
                    continue
                
                cancelled_by_user = rp.cancelled_by
                
                # If cancelled_by is not set, try to get it from audit log
                if not cancelled_by_user and rp.request:
                    try:
                        audit_log = AuditLog.objects.filter(
                            request=rp.request,
                            action_type='archive'
                        ).order_by('-timestamp').first()
                        if audit_log and audit_log.performed_by:
                            cancelled_by_user = audit_log.performed_by
                    except Exception as audit_err:
                        print(f"[WARN] Could not get audit log for request {rp.request.RequestID}: {str(audit_err)}")
                
                cancelled_by_name = (cancelled_by_user.get_full_name() or cancelled_by_user.username) if cancelled_by_user else 'System'
                deadline_value = rp.deadline_extension or rp.request.deadline
                updated_timestamp = _format_cancelled_timestamp(rp.archived_at or rp.cancelled_at)
                cancellation_reason = rp.cancellation_reason if rp.cancellation_reason else 'Archived'
                cancellation_log = (
                    f"Task cancellation from issuance #{rp.request.RequestID} by {cancelled_by_name}. "
                    f"Reason: {cancellation_reason}"
                )

                cancelled_requests.append({
                    'id': f"request-product-{rp.id}",
                    'request_id': rp.request.RequestID,
                    'product_name': rp.product.prodName,
                    'quantity': rp.quantity,
                    'deadline': deadline_value.strftime("%Y-%m-%d") if deadline_value else None,
                    'cancelled_by_name': cancelled_by_name,
                    'cancellation_reason': cancellation_reason,
                    'cancellation_log': cancellation_log,
                    'cancellation_progress': rp.cancellation_progress or {},
                    'updated_at': updated_timestamp,
                })
            except Exception as item_err:
                print(f"[ERROR] Processing cancelled product {rp.id}: {str(item_err)}")
                import traceback
                traceback.print_exc()
                continue

        draft_cancellations = CancelledDraftProduct.objects.select_related('cancelled_by').all()
        for draft in draft_cancellations:
            cancelled_by_user = draft.cancelled_by
            cancelled_by_name = (cancelled_by_user.get_full_name() or cancelled_by_user.username) if cancelled_by_user else 'System'
            cancellation_reason = draft.cancellation_reason if draft.cancellation_reason else 'Cancelled before issuance'
            cancelled_requests.append({
                'id': f"draft-{draft.id}",
                'request_id': None,
                'product_name': draft.product_name,
                'quantity': draft.quantity,
                'deadline': draft.deadline.strftime("%Y-%m-%d") if draft.deadline else None,
                'cancelled_by_name': cancelled_by_name,
                'cancellation_reason': cancellation_reason,
                'cancellation_log': f"Draft product cancellation (no issuance number) by {cancelled_by_name}. Reason: {cancellation_reason}",
                'updated_at': _format_cancelled_timestamp(draft.updated_at),
            })

        cancelled_requests.sort(
            key=lambda item: item.get('updated_at') or '',
            reverse=True,
        )
        
        return success_response({
            'cancelled_requests': cancelled_requests,
            'count': len(cancelled_requests)
        })
        
    except Exception as e:
        print(f"[ERROR] Cancelled requests error: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Error fetching cancelled requests: {str(e)}", code=500)


@csrf_exempt
@require_http_methods(["POST"])
@role_required('admin')
def log_cancelled_draft_product(request):
    try:
        data = JSONParser().parse(request)

        product_name = (data.get('product_name') or '').strip()
        quantity = data.get('quantity')
        deadline = data.get('deadline')
        cancellation_reason = (data.get('cancellation_reason') or 'Cancelled before issuance').strip()

        if not product_name:
            return error_response('Product name is required', code=400)

        if not quantity:
            return error_response('Quantity is required', code=400)

        cancelled_entry = CancelledDraftProduct.objects.create(
            product_name=product_name,
            quantity=int(quantity),
            deadline=deadline or None,
            cancelled_by=request.user,
            cancellation_reason=cancellation_reason,
        )

        log_audit(
            request.user,
            'archive',
            old_value=json.dumps({
                'product_name': product_name,
                'quantity': quantity,
                'deadline': deadline,
            }),
            new_value=json.dumps({
                'event_type': 'draft_product_cancelled',
                'source': 'draft-product',
                'cancelled_entry_id': cancelled_entry.id,
                'product_name': product_name,
                'quantity': int(quantity),
                'deadline': deadline,
                'reason': cancellation_reason,
            })
        )

        # Create notifications for cancellation event (uses existing notification type choices).
        try:
            create_notification(
                user=request.user,
                notification_type='task_status_updated',
                title='Product Cancelled Before Issuance',
                message=f'You cancelled draft product {product_name} (Qty {int(quantity)}) before issuance.',
                action_data={
                    'event_type': 'draft_product_cancelled',
                    'product_name': product_name,
                    'quantity': int(quantity),
                    'deadline': deadline,
                    'reason': cancellation_reason,
                }
            )
        except Exception as notif_err:
            print(f"[NOTIFICATION] Failed to create self cancellation notification: {str(notif_err)}")

        try:
            recipients = User.objects.filter(
                Q(userprofile__role__in=[Roles.ADMIN, Roles.PRODUCTION_MANAGER])
            ).exclude(id=request.user.id)
            for recipient in recipients:
                create_notification(
                    user=recipient,
                    notification_type='task_status_updated',
                    title='Draft Product Cancelled',
                    message=f'{request.user.username} cancelled draft product {product_name} (Qty {int(quantity)}) before issuance.',
                    action_data={
                        'event_type': 'draft_product_cancelled',
                        'product_name': product_name,
                        'quantity': int(quantity),
                        'deadline': deadline,
                        'reason': cancellation_reason,
                        'cancelled_by': request.user.username,
                    }
                )
        except Exception as notif_err:
            print(f"[NOTIFICATION] Failed to create cancellation notifications for management users: {str(notif_err)}")

        return success_response({
            'id': cancelled_entry.id,
            'product_name': cancelled_entry.product_name,
            'quantity': cancelled_entry.quantity,
            'deadline': cancelled_entry.deadline.strftime('%Y-%m-%d') if cancelled_entry.deadline else None,
            'cancelled_by_name': request.user.get_full_name() or request.user.username,
            'updated_at': _format_cancelled_timestamp(cancelled_entry.updated_at),
        }, code=201)
    except ValueError:
        return error_response('Quantity must be a valid number', code=400)
    except Exception as e:
        print(f"[ERROR] log_cancelled_draft_product error: {str(e)}")
        return error_response(f"Error logging cancelled draft product: {str(e)}", code=500)


@require_http_methods(["GET"])
def task_history_view(request, request_product_id):
    """
    Fetch audit log history for a specific request product (task).
    Shows all updates made to this product with detailed descriptions.
    
    ENHANCED: March 15, 2026
    - Extracts process context (PST 01, PST 08, etc.) for each audit log entry
    - Provides meaningful change descriptions instead of generic "Product updated"
    - Tracks specific field changes:
      * completed_quota → "Saved total quota: [value]"
      * defect_count → "Saved defect: [value]"
      * is_completed → "Marked as complete" or "Marked as in-progress"
      * worker_names → "Assigned workers: [names]"
      * archived_at → "Archived" or "Restored"
    - Combines process context with changes for readability
    - Example: "PST 01 (Withdrawal), Saved total quota: 140, Saved defect: 2"
    
    Returns JSON with history list containing:
    - id: Audit log ID
    - action_type: create/update/delete/archive/restore
    - action_display: Human-readable action label
    - performed_by: User who performed the action (or "System")
    - timestamp: When the action occurred
    - changes: Array of detailed change descriptions
    """
    try:
        # Get user role
        user_role = request.user.userprofile.role if hasattr(request.user, 'userprofile') else None
        
        # Get the request product
        try:
            request_product = RequestProduct.objects.get(id=request_product_id)
        except RequestProduct.DoesNotExist:
            return error_response("Request product not found", code=404)
        
        # Get all audit logs for this request product
        logs = AuditLog.objects.filter(
            request_product=request_product
        ).select_related(
            'performed_by__userprofile'
        ).order_by('-timestamp')
        
        # Build response data
        history = []
        for log in logs:
            changes = []
            
            try:
                # Parse old and new values if they're JSON
                old_data = None
                new_data = None
                
                if log.old_value:
                    try:
                        old_data = json.loads(log.old_value)
                    except (json.JSONDecodeError, TypeError):
                        old_data = None
                
                if log.new_value:
                    try:
                        new_data = json.loads(log.new_value)
                    except (json.JSONDecodeError, TypeError):
                        new_data = None
                
                # Extract process info for context
                process_num = None
                process_name = None
                
                if new_data:
                    process_num = new_data.get('process_number') or new_data.get('process_num')
                    process_name = new_data.get('process_name')
                elif old_data:
                    process_num = old_data.get('process_number') or old_data.get('process_num')
                    process_name = old_data.get('process_name')
                
                # Build process identifier string for context
                process_context = ""
                if process_num or process_name:
                    if process_num and process_name:
                        process_context = f"{process_num} ({process_name})"
                    elif process_num:
                        process_context = str(process_num)
                    else:
                        process_context = str(process_name)
                
                # Collect detailed changes
                detailed_changes = []
                
                if old_data and new_data:
                    # Track completed_quota changes
                    old_quota = old_data.get('completed_quota')
                    new_quota = new_data.get('completed_quota')
                    if old_quota != new_quota:
                        detailed_changes.append(f"Saved total quota: {new_quota or 0}")
                    
                    # Track defect changes
                    old_defects = old_data.get('defect_count')
                    new_defects = new_data.get('defect_count')
                    if old_defects != new_defects:
                        detailed_changes.append(f"Saved defect: {new_defects or 0}")
                    
                    # Track defect type changes
                    old_defect_type = old_data.get('defect_type')
                    new_defect_type = new_data.get('defect_type')
                    if old_defect_type != new_defect_type and new_defect_type:
                        detailed_changes.append(f"Defect type: {new_defect_type}")
                    
                    # Track is_completed status
                    old_completed = old_data.get('is_completed')
                    new_completed = new_data.get('is_completed')
                    if old_completed != new_completed:
                        if new_completed:
                            detailed_changes.append("Marked as complete")
                        else:
                            detailed_changes.append("Marked as in-progress")
                    
                    # Track worker assignments
                    old_workers = old_data.get('worker_names')
                    new_workers = new_data.get('worker_names')
                    if old_workers != new_workers:
                        workers_str = ', '.join(new_workers) if isinstance(new_workers, list) and new_workers else 'None'
                        detailed_changes.append(f"Assigned workers: {workers_str}")
                    
                    # Track archive/restore
                    old_archived = old_data.get('archived_at')
                    new_archived = new_data.get('archived_at')
                    if old_archived != new_archived:
                        if new_archived:
                            detailed_changes.append("Archived")
                        else:
                            detailed_changes.append("Restored")
                
                # Compose final change message
                if detailed_changes:
                    # Combine process context with changes
                    change_details = ", ".join(detailed_changes)
                    if process_context:
                        changes.append(f"{process_context}, {change_details}")
                    else:
                        changes.append(change_details)
                elif log.action_type == 'create':
                    if process_context:
                        changes.append(f"{process_context}, Step created")
                    else:
                        changes.append("Step created")
                elif log.action_type == 'delete':
                    if process_context:
                        changes.append(f"{process_context}, Step deleted")
                    else:
                        changes.append("Step deleted")
                elif log.action_type == 'archive':
                    if process_context:
                        changes.append(f"{process_context}, Archived")
                    else:
                        changes.append("Archived")
                elif log.action_type == 'restore':
                    if process_context:
                        changes.append(f"{process_context}, Restored")
                    else:
                        changes.append("Restored")
                else:
                    # Generic fallback
                    if process_context:
                        changes.append(f"{process_context}, {log.get_action_type_display()}")
                    else:
                        changes.append(log.get_action_type_display())
                
            except Exception as parse_err:
                print(f"[DEBUG] Error parsing audit log {log.id}: {str(parse_err)}")
                # Provide fallback message based on action type
                fallback_messages = {
                    'create': 'Product created',
                    'update': 'Product updated',
                    'archive': 'Product archived',
                    'restore': 'Product restored',
                    'delete': 'Process step deleted',
                }
                changes = [fallback_messages.get(log.action_type, 'Action performed')]
            
            history.append({
                'id': log.id,
                'action_type': log.action_type,
                'action_display': log.get_action_type_display(),
                'performed_by': log.performed_by.get_full_name() if log.performed_by else 'System',
                'timestamp': log.timestamp,
                'changes': changes if changes else [],
            })
        
        return success_response({
            'history': history,
            'count': len(history),
            'product_name': request_product.product.prodName if request_product.product else 'Unknown'
        })
        
    except Exception as e:
        print(f"[ERROR] Task history error: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Error fetching task history: {str(e)}", code=500)


@csrf_exempt
@require_http_methods(['POST'])
def reject_deadline_extension(request, id):
    """Reject a deadline extension request"""
    try:
        # Check authentication
        if not request.user.is_authenticated:
            return error_response("Authentication required", code=401)
        
        data = JSONParser().parse(request)
        rejection_reason = data.get('rejection_reason', '')
        
        request_product = RequestProduct.objects.get(id=id)
        product_request = request_product.request
        
        # Check if user is authorized (customer who submitted the request)
        user_role = request.user.userprofile.role if hasattr(request.user, 'userprofile') else None
        is_customer = user_role == 'customer' and product_request.requester == request.user
        
        if not is_customer:
            return error_response("Only the customer who submitted the request can reject extensions", code=403)
        
        if request_product.extension_status != 'pending':
            return error_response(f"Cannot reject extension with status: {request_product.extension_status}", code=400)
        
        # Reject the extension
        old_deadline = request_product.deadline_extension
        request_product.extension_status = 'rejected'
        request_product.deadline_extension = None  # Clear the proposed deadline
        request_product.save()
        
        # Create audit log
        AuditLog.objects.create(
            request_product=request_product,
            action_type='extension_rejected',
            new_value=f"Extension to {old_deadline} rejected. Reason: {rejection_reason}",
            performed_by=request.user
        )
        
        # Notify production managers
        production_managers = User.objects.filter(userprofile__role__in=['production_manager', 'admin'])
        for pm in production_managers:
            create_notification(
                user=pm,
                notification_type='extension_rejected',
                title=f"Extension Rejected: {request_product.product.prodName}",
                message=f"Customer {request.user.username} rejected the deadline extension. Reason: {rejection_reason}",
                related_request=product_request,
                related_request_product=request_product
            )
        
        return success_response({
            'id': request_product.id,
            'request_id': product_request.RequestID,
            'status': 'rejected',
            'message': 'Extension rejected successfully'
        })
    except RequestProduct.DoesNotExist:
        return error_response("Request product not found", code=404)
    except Exception as e:
        print(f"[ERROR] Reject extension error: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Error rejecting extension: {str(e)}", code=500)


def create_notification(user, notification_type, title, message, related_request=None, related_request_product=None, action_data=None):
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
            related_request=related_request,
            related_request_product=related_request_product,
            action_data=action_data or {}
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
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Unauthorized"}, status=401)
    
    try:
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        unread_count = notifications.filter(is_read=False).count()
        
        serializer = NotificationSerializer(notifications, many=True)
        
        return JsonResponse({
            "notifications": serializer.data,
            "unread_count": unread_count
        }, status=200)
    except Exception as e:
        return JsonResponse({"detail": str(e)}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def mark_notification_read(request, notification_id):
    """Mark a single notification as read"""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Unauthorized"}, status=401)
    
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        notification.refresh_from_db()
        
        # Get updated unread count
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        
        serializer = NotificationSerializer(notification)
        return JsonResponse({
            "notification": serializer.data,
            "unread_count": unread_count
        }, status=200)
    except Notification.DoesNotExist:
        return JsonResponse({"detail": "Notification not found"}, status=404)
    except Exception as e:
        return JsonResponse({"detail": str(e)}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def delete_notification(request, notification_id):
    """Delete a notification"""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Unauthorized"}, status=401)
    
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.delete()
        
        # Get updated unread count
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        
        return JsonResponse({
            "success": True,
            "message": "Notification deleted",
            "unread_count": unread_count
        }, status=200)
    except Notification.DoesNotExist:
        return JsonResponse({"detail": "Notification not found"}, status=404)
    except Exception as e:
        return JsonResponse({"detail": str(e)}, status=500)

@require_http_methods(['GET'])
@csrf_exempt
def archived_requests_view(request):
    """Get all archived requests with their products"""
    try:
        if not request.user.is_authenticated:
            print("[ARCHIVED_REQUESTS] ERROR: User not authenticated")
            return JsonResponse({"error": "Not authenticated"}, status=401)
        
        print(f"[ARCHIVED_REQUESTS] User {request.user.username} fetching archived requests")
        
        # Get all archived RequestProducts (regardless of Requests.archived_at)
        archived_products = RequestProduct.objects.filter(archived_at__isnull=False).select_related('request').order_by('-archived_at')
        print(f"[ARCHIVED_REQUESTS] Found {archived_products.count()} archived products in DB")
        
        # Group archived products by their request
        requests_map = {}
        for prod in archived_products:
            req_id = prod.request.RequestID
            if req_id not in requests_map:
                requests_map[req_id] = {
                    'request': prod.request,
                    'products': []
                }
            requests_map[req_id]['products'].append(prod)
        
        print(f"[ARCHIVED_REQUESTS] Grouped into {len(requests_map)} requests")
        
        response_data = []
        for req_id, data in requests_map.items():
            try:
                req = data['request']
                products = data['products']
                
                print(f"[ARCHIVED_REQUESTS] Processing request {req.RequestID} with {len(products)} archived products")
                
                # Get the earliest archived_at from products as the request's archive timestamp
                earliest_archived = min(prod.archived_at for prod in products)
                
                try:
                    serializer = RequestProductReadSerializer(products, many=True)
                    print(f"[ARCHIVED_REQUESTS] Serialized {len(serializer.data)} products for request {req.RequestID}")
                    response_data.append({
                        "request_id": req.RequestID,
                        "request_created_at": req.created_at,
                        "archived_at": earliest_archived,
                        "products": serializer.data
                    })
                except Exception as serializer_err:
                    print(f"[ARCHIVED_REQUESTS] ERROR serializing products for request {req.RequestID}: {str(serializer_err)}")
                    import traceback
                    traceback.print_exc()
            except Exception as req_err:
                print(f"[ARCHIVED_REQUESTS] ERROR processing request {req_id}: {str(req_err)}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"[ARCHIVED_REQUESTS] Returning {len(response_data)} requests in response")
        if len(response_data) == 0:
            print("[ARCHIVED_REQUESTS] WARNING: No archived products to return!")
        
        return JsonResponse(response_data, safe=False, status=200)
    except Exception as e:
        print(f"[ERROR] Error fetching archived requests: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)



@require_http_methods(['GET'])
@csrf_exempt
def task_update_logs_view(request):
    """Fetch task update logs - only task-related actions from audit log"""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    try:
        user = request.user
        limit = int(request.GET.get('limit', 50))
        
        # Task-related action types
        task_actions = ['create', 'update', 'delete', 'worker_create', 'worker_update', 'worker_delete']
        
        # Get logs that are task-related (have request_product) and performed by production managers or admins
        logs = AuditLog.objects.select_related(
            "request", "request_product", "request_product__request", "performed_by"
        ).filter(
            Q(request_product__isnull=False) &  # Only logs with request_product (task-related)
            Q(action_type__in=task_actions)      # Only task-related actions
        ).order_by('-timestamp')[:limit]
        
        serializer = AuditLogSerializer(logs, many=True)
        return JsonResponse(serializer.data, safe=False, status=200)
    except Exception as e:
        print(f"[ERROR] Error fetching task update logs: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(['DELETE'])
@csrf_exempt
def task_update_log_delete_view(request, pk: int):
    """Delete a task update log"""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    try:
        log = AuditLog.objects.get(pk=pk)
        log_data = {
            "id": log.id,
            "action_type": log.action_type
        }
        log.delete()
        return JsonResponse({"message": f"Task update log deleted successfully", "log": log_data}, status=200)
    except AuditLog.DoesNotExist:
        return JsonResponse({"error": "Task update log not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(['POST'])
@csrf_exempt
def restore_request_view(request):
    """Restore an archived request and its products"""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    try:
        data = json.loads(request.body)
        request_id = data.get('request_id')
        
        print(f"[RESTORE_REQUEST] Received restore request for request_id={request_id}")
        
        if not request_id:
            print(f"[RESTORE_REQUEST] ERROR: request_id is missing")
            return JsonResponse({"error": "request_id is required"}, status=400)
        
        # Find the archived request
        try:
            archived_request = Requests.objects.get(RequestID=request_id, archived_at__isnull=False)
            print(f"[RESTORE_REQUEST] Found archived request {request_id}")
        except Requests.DoesNotExist:
            print(f"[RESTORE_REQUEST] ERROR: Request {request_id} not found or is not archived")
            return JsonResponse({"error": "Archived request not found"}, status=404)
        
        # Capture the archived_at value before unarchiving
        archived_at_value = archived_request.archived_at
        
        # Restore the request and all its products
        print(f"[RESTORE_REQUEST] Unarchiving request {request_id}...")
        archived_request.unarchive()
        print(f"[RESTORE_REQUEST] Request {request_id} unarchived successfully")

        # Return success immediately — logging/notifications are non-critical
        print(f"[RESTORE_REQUEST] Restore completed for request {request_id}")
        result = JsonResponse({"message": "Request restored successfully!"}, status=200)

        # Log + notify in try/except so failures don't break the restore
        try:
            AuditLog.objects.create(
                action_type="restore",
                request=archived_request,
                old_value=str(archived_at_value),
                new_value="Restored",
                performed_by=request.user,
            )
        except Exception as log_err:
            print(f"[RESTORE_REQUEST] WARNING: AuditLog creation failed: {log_err}")

        try:
            if archived_request.requester:
                Notification.objects.create(
                    user=archived_request.requester,
                    notification_type='request_restored',
                    title='Request Restored',
                    message=f'Request #{archived_request.RequestID} has been restored by {request.user.username}',
                )
        except Exception as notif_err:
            print(f"[RESTORE_REQUEST] WARNING: Notification creation failed: {notif_err}")

        return result
    except Requests.DoesNotExist:
        print(f"[RESTORE_REQUEST] ERROR: Request not found")
        return JsonResponse({"error": "Archived request not found"}, status=404)
    except Exception as e:
        print(f"[ERROR] Error restoring request: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(['POST'])
@csrf_exempt
def restore_request_product_view(request):
    """
    Restore an individual archived RequestProduct.
    Expects: { request_product_id: X }
    """
    try:
        data = JSONParser().parse(request)
        request_product_id = data.get('request_product_id')

        if not request_product_id:
            print(f"[RESTORE_PRODUCT] ERROR: No request_product_id provided")
            return JsonResponse({"error": "request_product_id is required"}, status=400)

        print(f"[RESTORE_PRODUCT] Processing restore for RequestProduct {request_product_id}...")

        # Find the archived RequestProduct
        try:
            request_product = RequestProduct.objects.get(id=request_product_id, archived_at__isnull=False)
        except RequestProduct.DoesNotExist:
            print(f"[RESTORE_PRODUCT] ERROR: RequestProduct {request_product_id} not found or not archived")
            return JsonResponse({"error": "Archived product not found"}, status=404)

        # Get parent request and product info for logging
        parent_request = request_product.request
        product_name = request_product.product.prodName if request_product.product else "Unknown Product"
        archived_at_value = request_product.archived_at

        print(f"[RESTORE_PRODUCT] Restoring: Product '{product_name}' from Issuance #{parent_request.RequestID}")

        # Restore the individual RequestProduct
        now = timezone.now()
        request_product.archived_at = None
        request_product.restored_at = now
        request_product.save()
        print(f"[RESTORE_PRODUCT] RequestProduct {request_product_id} unarchived successfully")

        # Return success immediately
        result = JsonResponse({
            "message": f"Product '{product_name}' restored successfully!",
            "request_product_id": request_product_id,
            "restored_at": now.isoformat()
        }, status=200)

        # Log + notify in try/except so failures don't break the restore
        try:
            AuditLog.objects.create(
                action_type="restore_product",
                request=parent_request,
                old_value=str(archived_at_value),
                new_value="Restored",
                performed_by=request.user,
            )
        except Exception as log_err:
            print(f"[RESTORE_PRODUCT] WARNING: AuditLog creation failed: {log_err}")

        try:
            if parent_request.requester:
                Notification.objects.create(
                    user=parent_request.requester,
                    notification_type='product_restored',
                    title='Product Restored',
                    message=f'Product "{product_name}" from Request #{parent_request.RequestID} has been restored by {request.user.username}',
                )
        except Exception as notif_err:
            print(f"[RESTORE_PRODUCT] WARNING: Notification creation failed: {notif_err}")

        return result

    except RequestProduct.DoesNotExist:
        print(f"[RESTORE_PRODUCT] ERROR: RequestProduct not found or not archived")
        return JsonResponse({"error": "Archived product not found"}, status=404)
    except Exception as e:
        print(f"[ERROR] Error restoring product: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)