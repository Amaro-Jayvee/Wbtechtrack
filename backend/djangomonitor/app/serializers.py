from rest_framework import serializers
from app.models import Employees

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employees
        fields = ('EmployeeID', 'EmployeeName', 'ProductionDate')

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Products
        fields = ('ProductID', 'ProductName', 'quantity', 'status')