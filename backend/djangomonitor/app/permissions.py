from rest_framework.permissions import BasePermission
from .models import Roles
from django.http import JsonResponse
from functools import wraps

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
            if not request.user.is_authenticated:
                return JsonResponse({"detail": "Authentication required"}, status=401)
        
            profile = getattr(request.user, 'userprofile', None)
            if not profile or profile.role not in allowed_roles:
                return JsonResponse({"detail": "Access denied."}, status=403)

            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator