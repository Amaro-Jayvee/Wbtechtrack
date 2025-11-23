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
    product_names = models.ManyToManyField('ProductName', through='RequestProduct')
    deadline = models.DateField("Deadline")
    created_at = models.DateField("Created At", auto_now_add=True)
    archived_at = models.DateTimeField("Archived At", null=True, blank=True)

    def __str__(self):
        return f"Request #{self.RequestID} by {self.requester.username if self.requester else 'Unknown'}"

    def get_progress_summary(self):
        summaries = []
        percentages = []

        for rp in self.request_products.all():
            percent = rp.get_progress_percentage()
            completed = rp.get_completed_quota()
            requested = rp.quantity

            summaries.append({
                "product": rp.product.prodName,
                "requested": requested,
                "completed": completed,
                "progress": f"{percent}%"
            })

            percentages.append(percent)

        total_requested = self.total_requested_quantity()
        total_completed = self.total_completed_quantity()

        avg_percent = round(sum(percentages) / len(percentages), 2) if percentages else 0
        weighted_percent = round(100 * total_completed / total_requested, 2) if total_requested else 0

        return {
            "request_id": self.RequestID,
            "products": summaries,
            "overall_progress": {
                "average_percentage": f"{avg_percent}%",
                "weighted_percentage": f"{weighted_percent}%"
            }
        }

    def total_requested_quantity(self):
        return sum(rp.quantity for rp in self.request_products.all())

    def total_completed_quantity(self):
        return sum(rp.get_completed_quota() for rp in self.request_products.all())

    def task_status(self):
        if not self.request_products.exists():
            return "No Products"
    
        total_requested = self.total_requested_quantity()
        total_completed = self.total_completed_quantity()

        if total_requested == 0:
            return "No Quantity"

        return "Done" if total_completed >= total_requested else "In Progress"

class RequestProduct(models.Model):
    request = models.ForeignKey(Requests, on_delete=models.CASCADE, related_name='request_products')
    product = models.ForeignKey('ProductName', on_delete=models.CASCADE, related_name='product_requests')
    quantity = models.PositiveIntegerField()
    deadline_extension = models.DateField("Deadline Extension", null=True, blank=True)
    extension_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
        default="pending"
    )
    requested_at = models.DateTimeField("Requested At", null=True, blank=True)

    def __str__(self):
        return f"{self.product.name} x{self.quantity} for Request #{self.request.RequestID}"

    def get_completed_quota(self):
        final_step = self.process_steps.order_by('-step_order').first()
        return final_step.completed_quota if final_step else 0

    def get_progress_percentage(self):
        completed = self.get_completed_quota()
        requested = self.quantity
        return round(min(100 * completed / requested, 200), 2) if requested else 0

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
    request_product = models.ForeignKey(RequestProduct, on_delete=models.CASCADE, null=True, blank=True, related_name='process_steps')
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

    # deadline_extension = models.DateField("Deadline Extension", null=True, blank=True)
    # extension_status = models.CharField(
    #     max_length=20,
    #     choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
    #     default="pending"
    # )

    # requested_at = models.DateTimeField("Requested At", null=True, blank=True)

    class Meta:
        ordering = ['step_order']   
    
    def __str__(self):
        return f"{self.process.name} for Request #{self.request.RequestID}"

    def mark_completed_if_ready(self):
        if self.completed_quota >= self.request_product.quantity:
            if not self.is_completed:
                self.is_completed = True
                self.save(update_fields=['is_completed', 'updated_at'])
            return True
        return False

    def progress_summary(self):
        request_qty = self.request_product.quantity if self.request_product else 0
        completed = self.completed_quota or 0

        percentage = (completed / request_qty * 100) if request_qty else 0
        percentage = int(percentage) if percentage.is_integer() else round(percentage, 2)
        return f"{percentage}% / {request_qty} qty"

    

    # def get_task_status(self):
    #     expected = self.request_product.quantity if self.request_product else 0
    #     return "Done" if self.completed_quota >= expected else "In Progress"

    # def get_progress_percentage(self):
    #     expected = self.request_product.quantity if self.request_product else 1
    #     return min(100 * self.completed_quota / expected, 200)

class ProcessTemplate(models.Model):
    product_name = models.ForeignKey(ProductName, on_delete=models.CASCADE)
    process = models.ForeignKey(ProcessName, on_delete=models.CASCADE)
    step_order = models.PositiveIntegerField("Step Order")

    class Meta:
        unique_together = ('product_name', 'process')
        ordering = ['step_order']

    def __str__(self):
        return f"{self.process.name} template for {self.product_name.prodName}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("extension_request", "Extension Request"),
        ("extension_approved", "Extension Approved"),
        ("extension_rejected", "Extension Rejected"),
    ]

    id = models.AutoField(primary_key=True)
    request = models.ForeignKey(
        Requests, on_delete=models.CASCADE, null=True, blank=True, related_name="audit_logs"
    )
    request_product = models.ForeignKey(
        RequestProduct, on_delete=models.CASCADE, null=True, blank=True, related_name="audit_logs"
    )
    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)
    old_value = models.TextField(null=True, blank=True)   # JSON or string snapshot
    new_value = models.TextField(null=True, blank=True)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        target = f"Request #{self.request.RequestID}" if self.request else f"RequestProduct #{self.request_product.id}"
        return f"{self.action_type} on {target} at {self.timestamp}"
