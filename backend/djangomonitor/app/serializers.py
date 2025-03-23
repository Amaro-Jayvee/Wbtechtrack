from rest_framework import serializers
from app.models import Employees

class EmployeeSerializer(serializers.ModelSerializer):
    class meta:
        model = Employees
        fields = ('EmployeeID', 'EmployeeName', 'ProductionDate')