from django.urls import path
from .views import EmployeesView, ProductsView, AddEmployees, AddProducts
from .views import login_view, logout_view, session_view, whoami_view
from .views import (
    CustomPasswordResetView,
    CustomPasswordResetDoneView,
    CustomPasswordResetConfirmView,
    CustomPasswordResetCompleteView,
)

urlpatterns = [

    path('login/', login_view, name='api_login'),
    path('logout/', logout_view, name='api_logout'),     
    path('session/', session_view, name='api_session'),    
    path('whoami/', whoami_view, name='api_whoami'),

    path('reset_password/', CustomPasswordResetView.as_view(), name='reset_password'),
    path('reset_password_sent/', CustomPasswordResetDoneView.as_view(), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', CustomPasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('reset_password_complete/', CustomPasswordResetCompleteView.as_view(), name='password_reset_complete'),   

    path('empview/<int:pk>/', EmployeesView.as_view(), name='empview'),
    path('empadd/', AddEmployees.as_view(), name='empadd'),
    path('prodview/<int:pk>/', ProductsView.as_view(), name='prodview'),
    path('prodadd/', AddProducts.as_view(), name='prodadd'),

]