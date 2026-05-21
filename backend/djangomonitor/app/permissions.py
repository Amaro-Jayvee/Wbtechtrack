from rest_framework.permissions import BasePermission
from .models import Roles, UserProfile
from django.http import JsonResponse
from functools import wraps
import sys

# class IsManagerOrAdmin(BasePermission):
#     def has_permission(self, request, view):
#         return (
#             hasattr(request.user, 'userprofile') and 
#             request.user.userprofile.role in [Roles.MANAGER, Roles.ADMIN]
#         )

# def manager_or_admin_required(view_func):
#     @wraps(view_func)
#     def _wrapped_view(request, *args, **kwargs):
#         profile = getattr(request.user, 'userprofile', None)
#         if not profile or profile.role not in [Roles.MANAGER, Roles.ADMIN]:
#             return JsonResponse({'error': 'Access denied'}, status=403)
#         return view_func(request, *args, **kwargs)
#     return _wrapped_view

# class IsAdmin(BasePermission):
#     def has_permission(self, request, view):
#         return (
#             hasattr(request.user, 'userprofile') and 
#             request.user.userprofile.role == Roles.ADMIN
#         )

# class IsCustomerOnly(BasePermission):
#     def has_permission(self, request, view):
#         return (
#             hasattr(request.user, 'userprofile') and 
#             request.user.userprofile.role == Roles.CUSTOMER
#         )

def role_required(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # DEBUG: Log authentication info
            print(f"[ROLE_REQUIRED] View: {view_func.__name__}", file=sys.stderr)
            print(f"[ROLE_REQUIRED] is_authenticated: {request.user.is_authenticated}", file=sys.stderr)
            print(f"[ROLE_REQUIRED] User: {request.user.username if request.user else 'None'}", file=sys.stderr)
            print(f"[ROLE_REQUIRED] Session ID: {request.session.session_key if hasattr(request, 'session') else 'No session'}", file=sys.stderr)
            print(f"[ROLE_REQUIRED] Cookies: {list(request.COOKIES.keys())}", file=sys.stderr)
            
            if not request.user.is_authenticated:
                print(f"[ROLE_REQUIRED] DENYING: Not authenticated", file=sys.stderr)
                return JsonResponse({"detail": "Authentication required"}, status=401)
        
            try:
                profile = request.user.userprofile
            except (UserProfile.DoesNotExist, AttributeError) as e:
                profile = None
                print(f"[ROLE_REQUIRED] Profile lookup error: {str(e)}", file=sys.stderr)
            
            print(f"[ROLE_REQUIRED] Profile found: {profile is not None}", file=sys.stderr)
            if profile:
                print(f"[ROLE_REQUIRED] User role: {profile.role} (type: {type(profile.role)})", file=sys.stderr)
                print(f"[ROLE_REQUIRED] Allowed roles: {allowed_roles} (types: {[type(r) for r in allowed_roles]})", file=sys.stderr)
            
            if not profile or profile.role not in allowed_roles:
                role_check = profile.role in allowed_roles if profile else False
                print(f"[ROLE_REQUIRED] DENYING: Access denied (profile={profile is not None}, role_match={role_check})", file=sys.stderr)
                return JsonResponse({"detail": "Access denied."}, status=403)

            print(f"[ROLE_REQUIRED] ALLOWING: User {request.user.username} with role {profile.role}", file=sys.stderr)
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator