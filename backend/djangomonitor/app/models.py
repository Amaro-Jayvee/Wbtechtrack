from django.db import models
from django.db.models import Sum
from datetime import date
from django.contrib.auth.models import User
from django.utils import timezone

class Roles(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    MANAGER = "manager", "Manager"
    ADMIN = "admin", "Admin"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField("Full Name", max_length=100)
    company_name = models.CharField("Company Name", max_length=100)
    contact_number = models.CharField("Contact Number", max_length=15)
    role = models.CharField("Role", max_length=20, choices=Roles.choices, default=Roles.CUSTOMER)
    is_verified = models.BooleanField("Is Verified", default=False)
    created_at = models.DateTimeField("Account Created At", auto_now_add=True)
    verified_at = models.DateTimeField("Verified At", null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.is_verified and not self.verified_at:
            self.verified_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.role})"

class ProductName(models.Model):
    ProdID = models.AutoField(primary_key=True)
    prodName = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.prodName

class Requests(models.Model):
    RequestID = models.AutoField(primary_key=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='encode_requests') #New field
    requester = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='customer_requests') #New field
    product_names = models.ManyToManyField(ProductName)
    quantity = models.PositiveIntegerField()
    deadline = models.DateField("Deadline")
    created_at = models.DateField("Created At", auto_now_add=True)
    archived_at = models.DateTimeField("Archived At", null=True, blank=True)

    def __str__(self):
        return f"Request #{self.RequestID} by {self.requester.username}"

class Worker(models.Model):
    WorkerID = models.AutoField(primary_key=True)
    FirstName = models.CharField("First Name", max_length=100)
    LastName = models.CharField("Last Name", max_length=100)
    created_at = models.DateTimeField("Created At", auto_now_add=True)
    updated_at = models.DateTimeField("Updated At", auto_now=True)
    is_active = models.BooleanField("Is Active", default=True)

    def __str__(self):
        return f"{self.FirstName} {self.LastName}"

class ProcessName(models.Model):
    ProcessID = models.AutoField(primary_key=True)
    name = models.CharField("Process Name", max_length=100, unique=True)

    def __str__(self):
        return self.name

class ProductProcess(models.Model):
    request = models.ForeignKey(Requests, on_delete=models.CASCADE, null=True, blank=True, related_name="process_steps")
    workers = models.ManyToManyField(Worker, related_name="products", blank=True)
    process = models.ForeignKey(ProcessName, on_delete=models.PROTECT)
    step_order = models.PositiveIntegerField("Step Order")
    completed_quota = models.PositiveIntegerField("Completed Quota", default=0)
    defect_count = models.PositiveIntegerField("Defect Count", default=0)
    is_completed = models.BooleanField("Is Completed", default=False)
    production_date = models.DateField("Production Date", null=True, blank=True)
    created_at = models.DateTimeField("Created At", auto_now_add=True)
    updated_at = models.DateTimeField("Updated At", auto_now=True)
    archived_at = models.DateTimeField("Archived At", null=True, blank=True)

    class Meta:
        unique_together = ('request', 'process')
        ordering = ['step_order']
    
    def __str__(self):
        return f"{self.process.name} for Request #{self.request.RequestID}"

    def mark_completed_if_ready(self):
        if self.completed_quota > 0:
            self.is_completed = True
            self.save(update_fields=['is_completed', 'updated_at'])
            return True
        return False    

    def progress_summary(self):
        request_qty = self.request.quantity if self.request else 0
        completed = self.completed_quota or 0

        percentage = (completed / request_qty * 100) if request_qty else 0
        percentage = int(percentage) if percentage.is_integer() else round(percentage, 2)
        return f"{percentage}% / {request_qty} qty"

class ProcessTemplate(models.Model):
    product_name = models.ForeignKey(ProductName, on_delete=models.CASCADE)
    process = models.ForeignKey(ProcessName, on_delete=models.CASCADE)
    step_order = models.PositiveIntegerField("Step Order")

    class Meta:
        unique_together = ('product_name', 'process')
        ordering = ['step_order']

    def __str__(self):
        return f"{self.process.name} template for {self.product_name.prodName}"