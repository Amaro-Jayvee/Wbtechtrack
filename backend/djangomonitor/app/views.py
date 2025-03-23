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

from app.models import Employees
from app.serializers import EmployeeSerializer

@require_POST
def login_view(request):
    data = JSONParser().parse(request)
    username = data.get("username")
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

