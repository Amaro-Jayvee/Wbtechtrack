from django.db import models
from django.db.models import Sum
from datetime import date
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.timezone import localtime
from django.core.mail import send_mail
from django.conf import settings
# from django.db.models.signals import m2m_changed
# from django.core.exceptions import ValidationError
# from django.dispatch 

class Roles(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    MANAGER = "manager", "Manager"
    PRODUCTION_MANAGER = "production_manager", "Production Manager"
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
    terms_accepted = models.BooleanField("Terms Accepted", default=False)
    terms_accepted_at = models.DateTimeField("Terms Accepted At", null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.is_verified and not self.verified_at:
            self.verified_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.role})"


class AccountSignupRequest(models.Model):
    """Stores pending account signup requests awaiting admin approval"""
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("declined", "Declined"),
        ("cancelled", "Cancelled"),
    ]
    
    username = models.CharField("Username", max_length=150, unique=True)
    email = models.EmailField("Email")
    password_hash = models.CharField("Password Hash", max_length=255)
    full_name = models.CharField("Full Name", max_length=100)
    company_name = models.CharField("Company Name", max_length=100)
    contact_number = models.CharField("Contact Number", max_length=15)
    role = models.CharField("Role", max_length=20, choices=Roles.choices, default=Roles.CUSTOMER)
    status = models.CharField("Status", max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField("Created At", auto_now_add=True)
    reviewed_at = models.DateTimeField("Reviewed At", null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_signups')
    review_notes = models.TextField("Review Notes", blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.username} ({self.status})"
    
    def approve(self, admin_user, notes=""):
        """Approve signup and create user account"""
        from django.contrib.auth.hashers import make_password
        
        # Create Django user with the stored password hash
        user = User.objects.create_user(
            username=self.username,
            email=self.email,
            password=self.password_hash  # This will be hashed by create_user
        )
        
        # Create UserProfile
        UserProfile.objects.create(
            user=user,
            full_name=self.full_name,
            company_name=self.company_name,
            contact_number=self.contact_number,
            role=self.role,
            is_verified=True
        )
        
        # Update signup request status
        self.status = "approved"
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()
        
        # Send approval email to user
        subject = "Account Approved - TechTrack"
        message = f"""Dear {self.full_name},

Your account has been successfully approved!

You can now login to TechTrack with the following credentials:
- Username: {self.username}
- Email: {self.email}

Please visit our application to get started.

Best regards,
TechTrack Team"""
        
        try:
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [self.email],
                fail_silently=False,
            )
        except Exception as e:
            # Log error but don't fail the approval if email fails
            print(f"Error sending approval email to {self.email}: {str(e)}")
        
        return user
    
    def decline(self, admin_user, notes=""):
        """Decline signup request"""
        self.status = "declined"
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()
    
    def cancel(self):
        """Cancel signup request"""
        self.status = "cancelled"
        self.save()

class ProductName(models.Model):
    ProdID = models.AutoField(primary_key=True)
    prodName = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.prodName

class Requests(models.Model):
    APPROVAL_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("declined", "Declined"),
    ]
    
    RequestID = models.AutoField(primary_key=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='encode_requests') #New field
    requester = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='customer_requests') #New field
    product_names = models.ManyToManyField('ProductName', through='RequestProduct')
    deadline = models.DateField("Deadline")
    created_at = models.DateField("Created At", auto_now_add=True)
    updated_at = models.DateTimeField("Updated At", auto_now=True) 
    archived_at = models.DateTimeField("Archived At", null=True, blank=True)
    restored_at = models.DateTimeField("Restored At", null=True, blank=True)
    approval_status = models.CharField("Approval Status", max_length=20, choices=APPROVAL_STATUS_CHOICES, default="pending")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_requests')
    approval_notes = models.TextField("Approval Notes", blank=True, null=True)

    def __str__(self):
        return f"Request #{self.RequestID} by {self.requester.username if self.requester else 'Unknown'}"

    def archive(self):
        """Soft-archive this request and cascade to related RequestProducts + ProductProcesses."""
        now = timezone.now()
        self.archived_at = now
        self.save()

        for rp in self.request_products.all():
            rp.archived_at = now
            rp.save()
            for pp in rp.process_steps.all():
                pp.archived_at = now
                pp.save()

    def unarchive(self):
        """Restore this request and cascade to related RequestProducts + ProductProcesses."""
        now = timezone.now()
        self.archived_at = None
        self.restored_at = now  # Track when it was restored
        self.save()

        for rp in self.request_products.all():
            rp.archived_at = None
            rp.save()
            for pp in rp.process_steps.all():
                pp.archived_at = None
                pp.save()

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
    completed_at = models.DateTimeField("Completed At", null=True, blank=True)
    archived_at = models.DateTimeField("Archived At", null=True, blank=True)
    restored_at = models.DateTimeField("Restored At", null=True, blank=True)

    def __str__(self):
        return f"{self.product.name} x{self.quantity} for Request #{self.request.RequestID}"

    def get_completed_quota(self):
        """
        Calculate total completed work across all steps.
        This method sums up only ACTUAL completed units, not theoretical ones.
        Completed steps before current + work done on current step.
        """
        all_steps = self.process_steps.order_by('step_order')
        if not all_steps.exists():
            return 0
        
        quantity = self.quantity
        total_steps = all_steps.count()
        
        # First, find the current step (first incomplete one)
        current_step = None
        completed_before_count = 0
        
        for step in all_steps:
            if step.is_completed:
                completed_before_count += 1
            else:
                current_step = step
                break
        
        # If all steps are completed, return full quantity
        if current_step is None:
            all_completed = all_steps.filter(is_completed=True).count()
            if all_completed == total_steps:
                return quantity
        
        # Calculate based on:
        # - Percentage of steps already fully done
        # - Plus progress on current step
        if current_step:
            # Weight: each completed step = 1/total_steps of the quantity
            completed_from_prev_steps = (completed_before_count / total_steps) * quantity
            current_progress = current_step.completed_quota or 0
            total_completed = completed_from_prev_steps + current_progress
        else:
            # Shouldn't reach here, but safety check
            total_completed = quantity
        
        return int(min(total_completed, quantity))

    def get_progress_percentage(self):
        """Calculate progress percentage for this request product."""
        completed = self.get_completed_quota()
        requested = self.quantity
        
        if requested == 0:
            return 0
        
        percentage = round(min(100 * completed / requested, 100), 2)
        
        # Log for debugging
        all_steps = self.process_steps.order_by('step_order')
        completed_count = all_steps.filter(is_completed=True).count()
        
        # Only log if percentage is significantly different (helps identify discrepancies)
        if percentage >= 50:  # Log high percentages for investigation
            import sys
            print(f"[PROGRESS DEBUG] RequestProduct {self.id} (Qty:{requested}): {percentage}% | completed_quota={completed} | Steps: {completed_count}/{all_steps.count()} completed", file=sys.stderr)
        
        return percentage

    def task_status(self):
        completed = self.get_completed_quota()
        requested = self.quantity
        # Check if this product has any ProductProcess steps (indicating project has been started)
        has_steps = self.process_steps.exists()
        
        if requested == 0:
            return "⚪ Not Started"
        elif completed >= requested:
            return "✅ Completed"
        elif completed > 0:
            return "⏳ In Progress"
        elif has_steps:
            # Project started but no work done yet
            return "🚀 Started"
        return "🕒 Not Started"

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
    product = models.ForeignKey(ProductName, on_delete=models.CASCADE, null=True, blank=True, related_name='configured_processes')
    workers = models.ManyToManyField(Worker, related_name="products", blank=True)
    process = models.ForeignKey(ProcessName, on_delete=models.PROTECT)
    process_number = models.CharField("Process Number", max_length=50, null=True, blank=True, default="")
    process_name = models.CharField("Process Name", max_length=255, null=True, blank=True, default="")
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

    # def clean(self):
    #     for w in self.workers.all():
    #         active_steps = ProductProcess.objects.filter(
    #             workers=w,
    #             is_completed=False,
    #             archived_at__isnull=True
    #         ).exclude(pk=self.pk)
    #         if active_steps.count() >= 2:
    #             raise ValidationError(
    #                 f"Worker {w.FirstName} {w.LastName} already has 2 active tasks."
    #             )

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
        ("login", "Login"),
        ("logout", "Logout"),
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("archive", "Archive"),
        ("restore", "Restore"),
        ("extension_request", "Extension Request"),
        ("extension_approved", "Extension Approved"),
        ("extension_rejected", "Extension Rejected"),
        ("settings_update", "Settings Update"),
        ("worker_create", "Worker Create"),
        ("worker_update", "Worker Update"),
        ("worker_delete", "Worker Delete"),
        ("password_change", "Password Change"),
        ("profile_update", "Profile Update"),
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


class ProcessProgress(models.Model):
    product_process = models.ForeignKey(ProductProcess, on_delete=models.CASCADE)
    completed_quota = models.PositiveIntegerField(default=0)
    defect_count = models.PositiveIntegerField(default=0)
    logged_at = models.DateField(auto_now_add=True)


class SystemSettings(models.Model):
    """
    Global system settings for the application
    Only one instance should exist (use singleton pattern)
    """
    # Session Management
    session_timeout_minutes = models.PositiveIntegerField("Session Timeout (minutes)", default=15)
    enable_session_timeout = models.BooleanField("Enable Session Timeout", default=True)
    
    # Auto-Archive Settings
    enable_auto_archive = models.BooleanField("Enable Auto-Archive", default=True)
    archive_threshold_days = models.PositiveIntegerField("Archive Threshold (days)", default=30)
    
    # Notifications
    enable_email_alerts = models.BooleanField("Enable Email Alerts", default=True)
    
    # Data Retention
    data_retention_days = models.PositiveIntegerField("Data Retention (days)", default=365)
    
    # Audit & Logging
    enable_audit_logs = models.BooleanField("Enable Audit Logs", default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name_plural = "System Settings"
    
    def __str__(self):
        return "System Settings"
    
    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class Notification(models.Model):
    """Store notifications for users"""
    NOTIFICATION_TYPES = (
        ('request_created', 'Request Created'),
        ('request_approved', 'Request Approved'),
        ('request_declined', 'Request Declined'),
        ('project_started', 'Project Started'),
        ('task_status_updated', 'Task Status Updated'),
        ('product_completed', 'Product Completed'),
        ('request_completed', 'Request Completed'),
        ('deadline_approaching', 'Deadline Approaching'),
        ('extension_requested', 'Extension Requested'),
        ('extension_approved', 'Extension Approved'),
        ('extension_rejected', 'Extension Rejected'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    related_request = models.ForeignKey(Requests, on_delete=models.CASCADE, null=True, blank=True, db_column='request_id')
    related_request_product = models.ForeignKey(RequestProduct, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    is_read = models.BooleanField(default=False)
    action_data = models.JSONField(null=True, blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"
