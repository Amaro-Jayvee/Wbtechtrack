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

    path('employee/', employeeAPI, name='employee-api'),
    path('employee/<int:id>/', employeeAPI, name='employee-api-PUT-DELETE'),

    path('product/', productAPI, name='product-api'),
    path('product/<int:id>/', productAPI, name='product-api-PUT-DELETE'),

    path('request/', requestAPI, name='request-api'),
    path('request/<int:id>/', requestAPI, name='request-api-PUT-DELETE'),

    path('quota/', dailyquotaAPI, name='daily-quota-api'),
    path('quota/<int:id>/', dailyquotaAPI, name='daily-quota-api-PUT-DELETE'),

    path('process/', processAPI, name='process-api'),
    path('process/<int:id>/', processAPI, name='process-api-PUT-DELETE'),

    path('prodname/', productnameAPI, name='product-name-api'),
    path('prodname/<int:id>/', productnameAPI, name='product-name-api-PUT-DELETE'),

    path('product-progress/<int:product_id>/', product_progress_view, name='product-progress-api')
]