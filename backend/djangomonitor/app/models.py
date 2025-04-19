from django.db import models

# Create your models here.
class Employees(models.Model):
    EmployeeID = models.AutoField(primary_key=True)
    EmployeeName = models.CharField(max_length=100)
    ProductionDate = models.DateField(auto_now_add=True)

class Products(models.Model):
    ProductID = models.AutoField(primary_key=True)
    ProductName = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField()
    status = models.CharField(
        max_length=50,
        choices=[
            ('Pending', 'Pending'),
            ('Ongoing', 'Ongoing'),
            ('Failed', 'Failed'),
            ('Complete', 'Complete')
        ],
        default='Pending'  # Default value is pending
    )