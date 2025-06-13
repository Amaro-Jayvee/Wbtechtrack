from django.shortcuts import render

#Instead of JSON, JsonParser can be used to parse the incoming data
# Create your views here.
# import json
from rest_framework.parsers import JSONParser
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from django.contrib.auth import views as auth_views
# from django.contrib.auth.views import (
#     PasswordResetView,
#     PasswordResetDoneView,
#     PasswordResetConfirmView,
#     PasswordResetCompleteView
# )

from app.models import Employees, Products, Requests, DailyQuota
from app.serializers import *

# from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
# from django.utils.encoding import force_bytes, force_str
# from django.contrib.auth.tokens import default_token_generator
# from django.core.mail import send_mail

# from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from datetime import date
from django.utils.timezone import now

@require_POST
def login_view(request):
    data = JSONParser().parse(request)
    username = data.get("username")
    # email = data.get("email")
    password = data.get("password")

    if username is None or password is None:
        return JsonResponse({"detail":"Please provide username and password"}, status=400)

    user = authenticate(username=username, password=password)
    if user is None:
        return JsonResponse({"detail":"Invalid credentials"}, status=400)

    login(request, user)
    return JsonResponse({"detail":"Successfully logged in"}, status=200)

def logout_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail":"You are not logged in"}, status=400)
        
    logout(request)
    return JsonResponse({"detail":"Successfully logged out"}, status=204)

@ensure_csrf_cookie
def session_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"isAuthenticated": False})
    return JsonResponse({"isAuthenticated": True})

def whoami_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"isAuthenticated": False})
    return JsonResponse({"username":request.user.username})

@csrf_exempt
def employeeAPI(request, id=0):
    if request.method == 'GET':
        employees = Employees.objects.all()
        employees_serializer = EmployeeSerializer(employees, many=True)
        return JsonResponse(employees_serializer.data, safe=False)
    
    elif request.method == 'POST':
        employee_data = JSONParser().parse(request)
        employee_serializer = EmployeeSerializer(data=employee_data)
        if employee_serializer.is_valid():
            employee_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'PUT':
        employee_data = JSONParser().parse(request)
        employee = Employees.objects.get(EmployeeID=employee_data['EmployeeID']) 
        employee_serializer = EmployeeSerializer(employee,data=employee_data)
        if employee_serializer.is_valid():
            employee_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)    

    elif request.method == 'DELETE':
        employee = get_object_or_404(Employees, EmployeeID=id)
        employee.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
def productAPI(request, id=0):
    if request.method == 'GET':
        products = Products.objects.all()
        products_serializer = ProductSerializer(products, many=True)
        return JsonResponse(products_serializer.data, safe=False)
    
    elif request.method == 'POST':
        product_data = JSONParser().parse(request)
        product_serializer = ProductSerializer(data=product_data)
        if product_serializer.is_valid():
            product_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'PUT':
        product_data = JSONParser().parse(request)
        product = Products.objects.get(ProductID=product_data['ProductID'])
        product_serializer = ProductSerializer(product,data=product_data)
        if product_serializer.is_valid():
            product_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)    

    elif request.method == 'DELETE':
        product = get_object_or_404(Products, ProductID=id)
        product.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
def requestAPI(request, id=0):
    if request.method == 'GET':
        requests = Requests.objects.all()
        request_serializer = RequestSerializer(requests, many=True)
        return JsonResponse(request_serializer.data, safe=False)

    elif request.method == 'PUT':
        request_data = JSONParser().parse(request)
        request = Requests.objects.get(RequestID=request_data['RequestID'])
        request_serializer = RequestSerializer(request,data=request_data)
        if request_serializer.is_valid():
            request_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False, status=400)  
    
    elif request.method == 'POST':
        request_data = JSONParser().parse(request)
        request_serializer = RequestSerializer(data=request_data)
        if request_serializer.is_valid():
            request_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'DELETE':
        request = Requests.objects.get(RequestID=id)
        request.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
def dailyquotaAPI(request, id=0):
    if request.method == 'GET':
        quotas = DailyQuota.objects.all()
        quota_serializer = DailyQuotaSerializer(quotas, many=True)
        return JsonResponse(quota_serializer.data, safe=False)

    elif request.method == 'POST':
        quota_data = JSONParser().parse(request)
        today = date.today()

        product = get_object_or_404(Products, ProductID=quota_data["product"])
        request_deadline = product.request.deadline

        if today > request_deadline:
            return JsonResponse("You cannot add quota beyond the deadline.", safe=False, status=403)

        existing_quota = DailyQuota.objects.filter(product=product, date=date.today()).exists()
        if existing_quota:
            return JsonResponse("Quota already exists.", safe=False, status=403)
        
        quota_serializer = DailyQuotaSerializer(data=quota_data)
        if quota_serializer.is_valid():
            quota_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)

    elif request.method == 'PUT':
        quota_data = JSONParser().parse(request)
        quota =get_object_or_404(DailyQuota, QuotaID=quota_data['QuotaID'])
            
        quota_serializer = DailyQuotaSerializer(quota, data=quota_data)
        if quota_serializer.is_valid(): 
            quota_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)    

    elif request.method == 'DELETE':
        quota = get_object_or_404(DailyQuota, QuotaID=id)
        quota.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
def processAPI(request, id=0):
    if request.method == 'GET':
        processes = ProcessName.objects.all()
        process_serializer = ProcessSerializer(processes, many=True)
        return JsonResponse(process_serializer.data, safe=False)

    elif request.method == 'PUT':
        process_data = JSONParser().parse(request)
        process = ProcessName.objects.get(ProcessID=process_data['ProcessID'])
        process_serializer = ProcessSerializer(process,data=process_data)
        if process_serializer.is_valid():
            process_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)  
    
    elif request.method == 'POST':
        process_data = JSONParser().parse(request)
        process_serializer = ProcessSerializer(data=process_data)
        if process_serializer.is_valid():
            process_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'DELETE':
        process = get_object_or_404(ProcessName, ProcessID=id)
        process.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
def productnameAPI(request, id=0):
    if request.method == 'GET':
        prodnames = ProductName.objects.all()
        prodname_serializer = ProductNameSerializer(prodnames, many=True)
        return JsonResponse(prodname_serializer.data, safe=False)

    elif request.method == 'PUT':
        prodname_data = JSONParser().parse(request)
        prodname = ProductName.objects.get(ProdID=prodname_data['ProdID'])
        prodname_serializer = ProductNameSerializer(prodname,data=prodname_data)
        if prodname_serializer.is_valid():
            prodname_serializer.save()
            return JsonResponse("Updated successfully!", safe=False)
        return JsonResponse("Failed to update", safe=False)  
    
    elif request.method == 'POST':
        prodname_data = JSONParser().parse(request)
        prodname_serializer = ProductNameSerializer(data=prodname_data)
        if prodname_serializer.is_valid():
            prodname_serializer.save()
            return JsonResponse("Added successfully!", safe=False)
        return JsonResponse("Failed to add", safe=False)
    
    elif request.method == 'DELETE':
        prodname = get_object_or_404(ProductName, ProdID=id)
        prodname.delete()
        return JsonResponse("Deleted successfully!", safe=False)

@csrf_exempt
def product_progress_view(request, product_id):
    product = get_object_or_404(Products, ProductID=product_id)
    requested_quantity = product.request.quantity if product.request else 0
    produced_quantity = DailyQuota.objects.filter(product=product).aggregate(Sum('quantity'))['quantity__sum'] or 0
    progress_percentage = (produced_quantity / requested_quantity) * 100 if requested_quantity else 0

    return JsonResponse({
        "product_id": product_id,
        "requested_quantity": requested_quantity,
        "produced_quantity": produced_quantity,
        "progress_percentage": round(progress_percentage, 2)
    })