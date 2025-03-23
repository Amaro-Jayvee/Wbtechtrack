from django.db import models

# Create your models here.
class Employees(models.Model):
    EmployeeID = models.AutoField(primary_key=True)
    EmployeeName = models.Charfield(max_length=100)
    ProductionDate = models.DateField(auto_now_add=True)
    