from django.urls import path
from .views import *
from .views import login_view, logout_view, session_view, whoami_view
from django.contrib.auth import views as auth_views
# from .views import (
#     CustomPasswordResetView,
#     CustomPasswordResetDoneView,
#     CustomPasswordResetConfirmView,
#     CustomPasswordResetCompleteView,
# )

urlpatterns = [

    path('login/', login_view, name='api_login'),
    path('logout/', logout_view, name='api_logout'),     
    path('session/', session_view, name='api_session'),    
    path('whoami/', whoami_view, name='api_whoami'),

    path('reset_password/', auth_views.PasswordResetView.as_view(), name='reset_password'),
    path('reset_password_sent/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('reset_password_complete/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),   

    path('worker/', workerAPI, name='worker-api'),
    path('worker/<int:id>/', workerAPI, name='worker-api-PUT-DELETE'),

    path('request/', requestAPI, name='request-api'),
    path('request/<int:id>/', requestAPI, name='request-api-PUT-DELETE'),

    path('process/', processAPI, name='process-api'),
    path('process/<int:id>/', processAPI, name='process-api-PUT-DELETE'),

    path('prodname/', productnameAPI, name='product-name-api'),
    path('prodname/<int:id>/', productnameAPI, name='product-name-api-PUT-DELETE'),

    path('product/', productProcessAPI, name='product-api'),
    path('product/<int:id>/', productProcessAPI, name='product-api-PUT-DELETE'),

    path('process_temp/', producttemplateAPI, name='process-temp-api'),
    path('process_temp/<int:id>/', producttemplateAPI, name='process-temp-api-PUT-DELETE'),

    path('register/', register_customer, name='register-customer'),
    path('verify/', verify_customer, name='verify-customer'),

    path('users/<int:id>/', delete_user, name='delete_user'),
]