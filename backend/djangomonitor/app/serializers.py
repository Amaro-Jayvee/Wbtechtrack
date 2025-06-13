from rest_framework import serializers
from app.models import *
from datetime  import datetime

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employees
        fields = ('EmployeeID', 'FirstName', 'LastName', 'created_at', 'updated_at')

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Products
        fields = ('ProductID', 'process', 'status', 'request', 'employee', 'production_date', 'updated_at')

class RequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requests
        fields = ('RequestID', 'product_name', 'quantity', 'deadline', 'created_at')

class DailyQuotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyQuota
        fields= ('QuotaID', 'product', 'date', 'quantity', 'updated_at')

class ProcessSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessName
        fields = ('ProcessID', 'name')

class ProductNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductName
        fields = ('ProdID', 'prodName', 'created_at', 'updated_at')
