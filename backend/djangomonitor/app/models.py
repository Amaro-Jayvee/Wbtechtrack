from django.db import models
from django.db.models import Sum
from datetime import date

class ProductName(models.Model):
    ProdID = models.AutoField(primary_key=True)
    prodName = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Requests(models.Model):
    RequestID = models.AutoField(primary_key=True)
    product_name = models.ForeignKey(ProductName, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    deadline = models.DateField()
    created_at = models.DateField(auto_now_add=True)

class Employees(models.Model):
    EmployeeID = models.AutoField(primary_key=True)
    FirstName = models.CharField(max_length=100)
    LastName = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ProcessName(models.Model):
    ProcessID = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)

class Products(models.Model):
    STATUS_CHOICES = [
        ("active_task", "Active Task"), # If product is still in progress
        ("completed", "Completed"), # If product reaches 100% completion
        ("failed", "Failed"), # If product failed to accomodate the give quota  
    ]

    ProductID = models.AutoField(primary_key=True)
    process = models.ForeignKey(ProcessName, on_delete=models.PROTECT)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES,
    verbose_name="Production Status", help_text="Current state of the production process")
    request = models.ForeignKey(Requests, on_delete=models.CASCADE)
    employee = models.ManyToManyField(Employees, related_name="products")
    production_date = models.DateField(default=date.today)
    updated_at = models.DateTimeField(auto_now=True)

    # Shows the percentage progress of a product    
    @property
    def progress_percentage(self):
        total_produced = DailyQuota.objects.filter(product=self).aggregate(Sum("quantity"))["quantity__sum"] or 0
        request_quantity = self.request.quantity if self.request else 0  # Ensure request exists
        return round((total_produced / request_quantity) * 100, 2) if request_quantity else 0
        
class DailyQuota(models.Model):
    QuotaID = models.AutoField(primary_key=True)
    product = models.ForeignKey(Products, on_delete=models.CASCADE)
    date = models.DateField(auto_now_add=True)
    quantity = models.PositiveIntegerField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("product", "date")

