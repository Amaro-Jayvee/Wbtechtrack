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
from django.contrib.auth.views import (
    PasswordResetView,
    PasswordResetDoneView,
    PasswordResetConfirmView,
    PasswordResetCompleteView
)

from app.models import Employees, Products
from app.serializers import EmployeeSerializer, ProductSerializer

from rest_framework import generics # For testing

# This function is a predefined account for the user
def user_account():
    username = "__blank__" # Set this according to the needs
    email = "__blank__" # Set this according to the needs
    password = "__blank__" # Set this according to the needs
    
    # These are the credentials provided for the user
    if User.objects.filter(username=username).exists():
        print("User already exists. Skipping creation.")
        return
    
    User.objects.create_user(username=username, email=email, password=password)
    print("User created successfully!")

# Resetting password using built-in method and customized functions

class CustomPasswordResetView(auth_views.PasswordResetView):
    def form_valid(self, form):
        form.save(self.request)
        return JsonResponse({"detail": "Password reset email sent!"}, status=200)   
    
    def form_invalid(self, form):
        return JsonResponse({"detail": "Invalid email address."}, status=400)

class CustomPasswordResetDoneView(auth_views.PasswordResetDoneView):
    def get(self, request, *args, **kwargs):
        return JsonResponse({"detail": "Password reset email sent successfully!"}, status=200)

class CustomPasswordResetConfirmView(auth_views.PasswordResetConfirmView):
    def form_valid(self, form):
        form.save()
        return JsonResponse({"detail": "Password reset successul!"}, status=200)
    
    def form_invalid(self, form):
         return JsonResponse({"detail": "Invalid password."}, status=400)

class CustomPasswordResetCompleteView(auth_views.PasswordResetCompleteView):
      def get(self, request, *args, **kwargs):
        return JsonResponse({"detail": "Password reset completed successfully!"}, status=200)

@require_POST
def login_view(request):
    data = JSONParser().parse(request)
    username = data.get("username")
    email = data.get("email")
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

# These are the API methods for employee and product models
"""
@csrf_exempt
def employeeAPI(request, id=0):
    if request.method == 'GET':
        employees = Employees.objects.all()
        employees_serializer = EmployeeSerializer(employees, many=True)
        return JsonResponse(employees_serializer.data, status=200)
    
    elif request.method == 'POST':
        employee_data = JSONParser().parse(request)
        employee_serializer = EmployeeSerializer(data=employee_data)
        if employee_serializer.is_valid():
            employee_serializer.save()
            return JsonResponse({"detail": "Added successfully!"}, status=201)
        return JsonResponse({"detail": "Failed to add": employee_serializer.errors}, status=400)
    
    elif request.method == 'PUT':

        employee_data = JSONParser().parse(request)
        try:
            employee = Employees.objects.get(EmployeeID=employee_data['EmployeeID'])
        except ObjectDoesNotExist:
            return JsonResponse({"detail":"Employee not found"}, status=404)
            
        employee_serializer = EmployeeSerializer(employee,data=employee_data)
        if employee_serializer.is_valid():
            employee_serializer.save()
            return JsonResponse({"detail": "Updated successfully!"}, status=200)
        return JsonResponse({"detail": "Failed to update": employee_serializer.errors}, status=400)    

    elif request.method == 'DELETE':
        try:
            employee = Employees.objects.get(EmployeeID=id)
        except ObjectDoesNotExist:
            return JsonResponse({"detail":"Employee not found"}, status=404)

        employee.delete()
        return JsonResponse({"detail": "Deleted successfully!"}, status=204)


def productAPI(request, id=0):
    if request.method == 'GET':
        products = Products.objects.all()
        products_serializer = ProductSerializer(products, many=True)
        return JsonResponse(products_serializer.data, status=200)
    
    elif request.method == 'POST':
        product_data = JSONParser().parse(request)
        product_serializer = ProductSerializer(data=product_data)
        if product_serializer.is_valid():
            product_serializer.save()
            return JsonResponse({"detail": "Added successfully!"}, status=201)
        return JsonResponse({"detail": "Failed to add": product_serializer.errors}, status=400)
    
    elif request.method == 'PUT':

        product_data = JSONParser().parse(request)
        try:
            product = Products.objects.get(ProductID=product_data['ProductID'])
        except ObjectDoesNotExist:
            return JsonResponse({"detail":"Product not found"}, status=404)
            
        product_serializer = ProductSerializer(product,data=product_data)
        if product_serializer.is_valid():
            product_serializer.save()
            return JsonResponse({"detail": "Updated successfully!"}, status=200)
        return JsonResponse({"detail": "Failed to update": product_serializer.errors}, status=400)    

    elif request.method == 'DELETE':
        try:
            product = Products.objects.get(ProductID=id)
        except ObjectDoesNotExist:
            return JsonResponse({"detail":"Product not found"}, status=404)

        product.delete()
        return JsonResponse({"detail": "Deleted successfully!"}, status=204)
"""

# Testing the API methods via django app

class EmployeesView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Employees.objects.all()
    serializer_class = EmployeeSerializer

class AddEmployees(generics.CreateAPIView):
    queryset = Employees.objects.all()
    serializer_class = EmployeeSerializer

class ProductsView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Products.objects.all()
    serializer_class = ProductSerializer

class AddProducts(generics.CreateAPIView):
    queryset = Products.objects.all()
    serializer_class = ProductSerializer