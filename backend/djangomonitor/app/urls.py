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

    path('product-config/', save_product_configuration, name='product-config-save'),

    path('product/', productProcessAPI, name='product-api'),
    path('product/<int:id>/', productProcessAPI, name='product-api-PUT-DELETE'),
    path('productprocess/', productProcessAPI, name='productprocess-api'),
    path('productprocess/<int:id>/', productProcessAPI, name='productprocess-api-PUT-DELETE'),

    path('producttemp/', producttemplateAPI, name='product-temp-api'),
    path('producttemp/<int:id>/', producttemplateAPI, name='product-temp-api-PUT-DELETE'),

    path('register/customer/', register_customer, name='register-customer'),
    path('register/manager/', register_manager, name='register-manager'),
    path('verify/', verify_customer, name='verify-customer'),
    # path('decline/', decline_customer, name='decline-customer'),

    path('users/', list_users, name='list_users'),
    # path('users/<str:username>/', get_user, name='get_user'),
    path('users/<int:id>/', delete_user, name='delete_user'),

    path('full_report_csv/', full_report_csv, name='full_report_csv'),

    path('request/<int:id>/archive/', archive_request, name='archive-request'),
    path('request/<int:id>/unarchive/', unarchive_request, name='unarchive-request'),
    path('request/<int:id>/start-project/', start_project, name='start-project'),

    path('auditlogs/', auditlog_view, name='audit-logs-view'),
    path('auditlogs/<int:pk>/', auditlog_delete, name='audit-logs-delete'),

    path('profile/', profile_view, name='profile'),

    path("request-products/", requestProductAPI, name="requestproduct-list"),
    path("request-products/<int:id>/", requestProductAPI, name="requestproduct-detail"),
    
    # Customer endpoint to view their assigned requests
    path('customer/my-requests/', customer_request_view, name='customer-my-requests'),

    # Notification endpoints
    path('notifications/', get_notifications, name='get-notifications'),
    path('notifications/<int:notification_id>/read/', mark_notification_read, name='mark-notification-read'),

    # Settings endpoints
    path('settings/', get_settings, name='get-settings'),
    path('settings/update/', update_settings, name='update-settings'),

    # Dashboard Report endpoints
    path('reports/bar-chart/', dashboard_bar_chart, name='dashboard-bar-chart'),
    path('reports/pie-chart/', dashboard_pie_chart, name='dashboard-pie-chart'),
    path('reports/top-movers/', dashboard_top_movers, name='dashboard-top-movers'),
    path('reports/debug/', debug_dashboard_data, name='debug-dashboard-data'),

    # path("progress/", processProgressAPI, name="progress_list_create"), 
    # path("progress/<int:id>/", processProgressAPI, name="progress_detail"),
]