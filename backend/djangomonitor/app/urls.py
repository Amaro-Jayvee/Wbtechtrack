from django.urls import path
from .views import *
from .views import (
    login_view, logout_view, session_view, whoami_view, accept_terms_view, 
    user_activity_logs, archived_requests_view, task_update_logs_view, 
    task_update_log_delete_view, restore_request_view, restore_request_product_view, 
    csrf_token_view, forgot_password_request, verify_reset_token, reset_password, test_email_debug
)
from .admin_approval_views import (
    get_pending_customer_requests,
    approve_customer_request,
    decline_customer_request,
    get_customer_request_details,
    diagnose_request,
    get_available_customers,
    create_admin_request
)
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
    path('accept-terms/', accept_terms_view, name='api_accept_terms'),
    path('csrf-token/', csrf_token_view, name='csrf-token'),
    
    # New forgot password API endpoints
    path('forgot-password/request/', forgot_password_request, name='forgot_password_request'),
    path('forgot-password/verify-token/', verify_reset_token, name='verify_reset_token'),
    path('forgot-password/reset/', reset_password, name='reset_password'),
    path('test-email/', test_email_debug, name='test_email_debug'),

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
    path('create-product-with-processes/', create_product_with_processes, name='create-product-with-processes'),

    path('product/', productProcessAPI, name='product-api'),
    path('product/<int:id>/', productProcessAPI, name='product-api-PUT-DELETE'),
    path('productprocess/', productProcessAPI, name='productprocess-api'),
    path('productprocess/<int:id>/', productProcessAPI, name='productprocess-api-PUT-DELETE'),

    path('producttemp/', producttemplateAPI, name='product-temp-api'),
    path('producttemp/<int:id>/', producttemplateAPI, name='product-temp-api-PUT-DELETE'),

    path('register/customer/', register_customer, name='register-customer'),
    path('register/manager/', register_manager, name='register-manager'),
    path('create-customer/', create_customer_by_admin, name='create-customer-admin'),
    
    # New signup flow endpoints
    path('signup/', signup_request, name='signup-request'),
    path('pending-signups/', list_pending_signups, name='list-pending-signups'),
    path('signups/<int:signup_id>/approve/', approve_signup, name='approve-signup'),
    path('signups/<int:signup_id>/decline/', decline_signup, name='decline-signup'),
    path('signups/<int:signup_id>/cancel/', cancel_signup, name='cancel-signup'),
    
    path('verify/', verify_customer, name='verify-customer'),
    # path('decline/', decline_customer, name='decline-customer'),

    path('users/', list_users, name='list_users'),
    # path('users/<str:username>/', get_user, name='get_user'),
    path('users/<int:id>/', delete_user, name='delete_user'),

    path('full_report_csv/', full_report_csv, name='full_report_csv'),
    path('full_report_pdf/', generate_pdf_report, name='generate_pdf_report'),

    path('request/<int:id>/archive/', archive_request, name='archive-request'),
    path('request/<int:id>/unarchive/', unarchive_request, name='unarchive-request'),
    path('request/<int:id>/start-project/', start_project, name='start-project'),
    path('archived-requests/', archived_requests_view, name='archived-requests'),
    path('restore-request/', restore_request_view, name='restore-request'),
    path('restore-request-product/', restore_request_product_view, name='restore-request-product'),
    path('task-update-logs/', task_update_logs_view, name='task-update-logs'),
    path('task-update-logs/<int:pk>/', task_update_log_delete_view, name='task-update-logs-delete'),

    path('auditlogs/', auditlog_view, name='audit-logs-view'),
    path('auditlogs/<int:pk>/', auditlog_delete, name='audit-logs-delete'),
    path('activity-logs/', user_activity_logs, name='user-activity-logs'),

    path('profile/', profile_view, name='profile'),
    path('profile/change-password/', change_password_view, name='change-password'),

    path("request-products/", requestProductAPI, name="requestproduct-list"),
    path("request-products/<int:id>/", requestProductAPI, name="requestproduct-detail"),
    
    # Customer endpoint to view their assigned requests
    path('customer/my-requests/', customer_request_view, name='customer-my-requests'),
    path('customer/cancelled-requests/', customer_cancelled_requests_view, name='customer-cancelled-requests'),

    # Notification endpoints
    path('notifications/', get_notifications, name='get-notifications'),
    path('notifications/<int:notification_id>/read/', mark_notification_read, name='mark-notification-read'),
    path('notifications/<int:notification_id>/delete/', delete_notification, name='delete-notification'),

    # Admin Request Approval endpoints
    path('admin/pending-requests/', get_pending_customer_requests, name='admin-pending-requests'),
    path('admin/approve-request/', approve_customer_request, name='admin-approve-request'),
    path('admin/decline-request/', decline_customer_request, name='admin-decline-request'),
    path('admin/request-details/<int:request_id>/', get_customer_request_details, name='admin-request-details'),
    path('admin/diagnose-request/<int:request_id>/', diagnose_request, name='admin-diagnose-request'),
    path('admin/available-customers/', get_available_customers, name='admin-available-customers'),
    path('admin/create-request/', create_admin_request, name='admin-create-request'),

    # Extension Request endpoints
    path('request-products/<int:id>/request-extension/', request_deadline_extension, name='request-extension'),
    path('request-products/<int:id>/approve-extension/', approve_deadline_extension, name='approve-extension'),
    path('request-products/<int:id>/reject-extension/', reject_deadline_extension, name='reject-extension'),

    # Settings endpoints
    path('settings/', get_settings, name='get-settings'),
    path('settings/update/', update_settings, name='update-settings'),
    path('settings/login-background/', upload_login_background, name='upload-login-background'),
    path('public/login-background/', public_login_background, name='public-login-background'),

    # Dashboard Report endpoints
    path('reports/bar-chart/', dashboard_bar_chart, name='dashboard-bar-chart'),
    path('reports/pie-chart/', dashboard_pie_chart, name='dashboard-pie-chart'),
    path('reports/top-movers/', dashboard_top_movers, name='dashboard-top-movers'),
    path('reports/debug/', debug_dashboard_data, name='debug-dashboard-data'),

    # Cancelled Requests endpoint
    path('cancelled-requests/', cancelled_requests_view, name='cancelled-requests'),
    path('cancelled-draft-products/', log_cancelled_draft_product, name='cancelled-draft-products'),
    
    # Task History endpoint
    path('task-history/<int:request_product_id>/', task_history_view, name='task-history'),

    # path("progress/", processProgressAPI, name="progress_list_create"), 
    # path("progress/<int:id>/", processProgressAPI, name="progress_detail"),
]