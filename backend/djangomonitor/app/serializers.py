from rest_framework import serializers
from app.models import *
from datetime  import date, datetime
from django.utils.timezone import localtime

class WorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = '__all__'

class DefectLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DefectLog
        fields = ['id', 'product_process', 'defect_type', 'defect_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class RequestProductReadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.prodName', read_only=True)
    request_id = serializers.IntegerField(source='request.RequestID', read_only=True)
    deadline = serializers.SerializerMethodField()
    completed_summary = serializers.SerializerMethodField()
    defect_count = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    task_status = serializers.SerializerMethodField()
    deadline_extension = serializers.SerializerMethodField()
    requested_at = serializers.SerializerMethodField()
    archived_at = serializers.SerializerMethodField()

    def get_deadline(self, obj):
        """Get deadline from parent request"""
        if obj.request and obj.request.deadline:
            return obj.request.deadline.strftime("%m/%d/%Y")
        return None

    def get_completed_summary(self, obj):
        return f"{obj.get_completed_quota()}/{obj.quantity}"

    def get_defect_count(self, obj):
        final_step = obj.process_steps.order_by('-step_order').first()
        return final_step.defect_count if final_step else 0

    def get_progress(self, obj):
        # Calculate progress using SAME formula as production manager (PST-01: 10% + Others: 90%)
        # This ensures customer view matches production manager view
        
        # Get all steps for this product
        all_steps = obj.process_steps.filter(archived_at__isnull=True).order_by('step_order')
        
        if not all_steps.exists():
            return "0%"
        
        # Separate PST-01 and other steps
        pst_01_steps = []
        other_steps = []
        
        for step in all_steps:
            is_pst_01 = False
            # Check process_name first
            if step.process_name:
                process_name = str(step.process_name).upper()
                if 'WITHDRAWAL' in process_name:
                    is_pst_01 = True
            # Check process_number - ONLY exact matches
            if not is_pst_01 and step.process_number:
                pst_num = str(step.process_number).strip().upper()
                if pst_num in ['PST-01', 'PST01', 'PST 01', 'PST-1', 'PST1', 'PST 1']:
                    is_pst_01 = True
            
            if is_pst_01:
                pst_01_steps.append(step)
            else:
                other_steps.append(step)
        
        progress = 0
        
        # PST-01 steps share 10% equally
        if pst_01_steps:
            pst_01_completed = sum(1 for s in pst_01_steps if s.is_completed)
            pst_01_progress = (pst_01_completed / len(pst_01_steps)) * 10
            progress += pst_01_progress
        
        # Other steps share 90% equally
        if other_steps:
            other_completed = sum(1 for s in other_steps if s.is_completed)
            other_progress = (other_completed / len(other_steps)) * 90
            progress += other_progress
        
        return f"{int(progress)}%"

    def get_task_status(self, obj):
        return obj.task_status()   # ✅ reuse model method

    def get_deadline_extension(self, obj):
        # Only return deadline_extension if it's set AND extension_status is "approved"
        if obj.deadline_extension and obj.extension_status == "approved":
            return obj.deadline_extension.strftime("%Y-%m-%d")
        return None

    def get_requested_at(self, obj):
        return localtime(obj.requested_at).strftime("%Y-%m-%d %H:%M:%S") if obj.requested_at else None

    def get_archived_at(self, obj):
        return localtime(obj.archived_at).strftime("%Y-%m-%d %H:%M:%S") if obj.archived_at else None

    class Meta:
        model = RequestProduct
        fields = [
            "id",
            "request_id",
            "product_name",
            "quantity",
            "completed_summary",
            "defect_count",
            "deadline",
            "deadline_extension",
            "extension_status",
            "requested_at",
            "archived_at",
            "progress",
            "task_status",
        ]



class RequestReadSerializer(serializers.ModelSerializer):
    requester_name = serializers.SerializerMethodField()
    requester_company = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    badge = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    archived_at = serializers.SerializerMethodField()
    restored_at = serializers.SerializerMethodField()
    deadline = serializers.SerializerMethodField()
    request_products = serializers.SerializerMethodField()
    
    def get_requester_name(self, obj):
        # Try to get requester's full name
        if obj.requester:
            try:
                if hasattr(obj.requester, 'userprofile'):
                    full_name = obj.requester.userprofile.full_name
                    # If full_name exists and is not empty, use it
                    if full_name and full_name.strip():
                        return full_name
            except:
                pass
            # Fallback to username if no full_name
            return obj.requester.username
        
        # If no requester, try to use created_by as fallback
        if obj.created_by:
            try:
                if hasattr(obj.created_by, 'userprofile'):
                    full_name = obj.created_by.userprofile.full_name
                    if full_name and full_name.strip():
                        return f"{full_name} (Creator)"
            except:
                pass
            return f"{obj.created_by.username} (Creator)"
        
        return "Not Assigned"
    
    def get_requester_company(self, obj):
        try:
            if obj.requester and hasattr(obj.requester, 'userprofile'):
                return obj.requester.userprofile.company_name
        except:
            pass
        return ""
    
    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else "Unknown"

    def get_badge(self, obj):
        count = obj.request_products.count()
        if count == 0:
            return "No products yet!"
        elif count == 1:
            return "Single-item request"
        elif count <= 3:
            return "Small batch"
        return "Bulk order"

    def get_created_at(self, obj):
        return obj.created_at.strftime("%Y-%m-%d") if obj.created_at else None

    def get_updated_at(self, obj):
        return localtime(obj.updated_at).strftime("%Y-%m-%d %H:%M:%S") if obj.updated_at else None

    def get_archived_at(self, obj):
        return localtime(obj.archived_at).strftime("%Y-%m-%d") if obj.archived_at else None

    def get_restored_at(self, obj):
        return localtime(obj.restored_at).strftime("%Y-%m-%d") if obj.restored_at else None

    def get_deadline(self, obj):
        return obj.deadline.strftime("%Y-%m-%d") if obj.deadline else None

    def get_request_products(self, obj):
        products = obj.request_products.exclude(status='cancelled')
        return RequestProductReadSerializer(products, many=True).data

    class Meta:
        model = Requests
        fields = [
            "RequestID",
            "requester",
            "requester_name",
            "requester_company",
            "created_by_name",
            "badge",
            "deadline",
            "created_at",
            "updated_at",
            "archived_at",
            "restored_at",
            "request_status",
            "request_products",
        ]
        read_only_fields = ["created_by"]

class RequestProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.prodName', read_only=True)
    requested_at = serializers.SerializerMethodField()
    request_id = serializers.CharField(source='request.RequestID', read_only=True)
    archived_at = serializers.SerializerMethodField()

    def get_requested_at(self, obj):
        if obj.requested_at:  # DateTimeField
            return localtime(obj.requested_at).strftime("%Y-%m-%d")
        return None

    def get_archived_at(self, obj):
        if obj.archived_at:
            return localtime(obj.archived_at).strftime("%Y-%m-%d %H:%M:%S")
        return None

    class Meta:
        model = RequestProduct
        fields = [
            'id',
            'request_id',
            'product',
            'product_name',
            'quantity',
            'deadline_extension',
            'extension_status',
            'requested_at',
            'archived_at',
            'completed_at',
        ]


class RequestSerializer(serializers.ModelSerializer):
    products = RequestProductSerializer(many=True, source='request_products', read_only=True)
    request_products = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    badge = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    archived_at = serializers.SerializerMethodField()

    def get_badge(self, obj):
        count = obj.request_products.count()
        if count == 0:
            return "No products yet!"
        elif count == 1:
            return "Single-item request"
        elif count <= 3:
            return "Small batch"
        return "Bulk order"

    def get_created_at(self, obj):
        if obj.created_at:  # DateField
            return obj.created_at.strftime("%Y-%m-%d")
        return None

    def get_archived_at(self, obj):
        if obj.archived_at:  # DateTimeField
            return localtime(obj.archived_at).strftime("%Y-%m-%d")
        return None

    def create(self, validated_data):
        products_data = validated_data.pop('request_products', None)
        request_user = self.context['request'].user
        
        print(f"[CREATE_REQUEST] Starting request creation...")
        print(f"[CREATE_REQUEST] products_data type: {type(products_data)}")
        print(f"[CREATE_REQUEST] products_data value: {products_data}")
        
        # Check if user is admin
        try:
            user_profile = UserProfile.objects.get(user=request_user)
            is_admin = user_profile.role in [Roles.ADMIN, 'admin']
        except:
            is_admin = request_user.is_staff or request_user.is_superuser
        
        # For admin-created requests, allow specifying customer/requester
        # For customer-created requests, set requester to current user
        if is_admin and 'requester' in validated_data and validated_data['requester']:
            # Admin is creating request for a specific customer
            requester = validated_data.pop('requester')
            request_status = 'new_request'  # Mark as new request created by admin
        else:
            # Customer creating their own request
            requester = request_user
            request_status = 'active'  # Customer-created requests start as active
            validated_data.pop('requester', None)  # Remove if present, use current user
        
        # Create the request
        request = Requests.objects.create(
            created_by=request_user,
            requester=requester,
            request_status=request_status,
            **validated_data
        )
        
        print(f"[CREATE_REQUEST] Created Requests object RequestID={request.RequestID}")
        
        # Create RequestProducts with better error handling
        if products_data:
            print(f"[CREATE_REQUEST] Processing {len(products_data)} products...")
            for index, item in enumerate(products_data):
                try:
                    print(f"[CREATE_REQUEST] Product {index}: raw item = {item}")
                    # Only include valid fields for RequestProduct
                    # NOTE: Use 'product_id' (not 'product') to pass the FK ID directly
                    product_fields = {
                        'product_id': item.get('product'),
                        'quantity': item.get('quantity'),
                        'deadline_extension': item.get('deadline_extension'),
                        'extension_status': item.get('extension_status', 'pending'),
                    }
                    print(f"[CREATE_REQUEST] Product {index}: extracted fields = {product_fields}")
                    # Filter out None product_ids
                    if not product_fields['product_id']:
                        print(f"[CREATE_REQUEST] Skipping product {index} - no product ID provided")
                        continue
                    
                    rp = RequestProduct.objects.create(request=request, **product_fields)
                    print(f"[CREATE_REQUEST] Successfully created RequestProduct {rp.id} for index {index}: product_id={product_fields['product_id']}, qty={product_fields['quantity']}")
                except Exception as e:
                    print(f"[CREATE_REQUEST] ERROR creating RequestProduct {index}: {str(e)}")
                    import traceback
                    traceback.print_exc()
        else:
            print(f"[CREATE_REQUEST] No products_data provided or empty!")
        
        return request

    def update(self, instance, validated_data):
        products_data = validated_data.pop('request_products', None)

        if products_data is not None:
            if ProductProcess.objects.filter(request_product__request=instance).exists():
                raise serializers.ValidationError(
                    "Products cannot be modified once processes have been created."
                )

        # update basic fields on the request itself
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if products_data is not None:
            existing_products = {p.product_id: p for p in instance.request_products.all()}
            incoming_ids = []

            for item in products_data:
                product_id = item.get('product')
                incoming_ids.append(product_id)

                if product_id in existing_products:
                    product = existing_products[product_id]
                    for attr, value in item.items():
                        if attr != 'product' and attr in ['quantity', 'deadline_extension', 'extension_status']:
                            setattr(product, attr, value)
                    product.save()
                else:
                    # Only include valid fields
                    product_fields = {
                        'product': item.get('product'),
                        'quantity': item.get('quantity'),
                        'deadline_extension': item.get('deadline_extension'),
                        'extension_status': item.get('extension_status', 'pending'),
                    }
                    try:
                        RequestProduct.objects.create(request=instance, **product_fields)
                    except Exception as e:
                        print(f"[UPDATE_REQUEST] ERROR creating RequestProduct: {str(e)}")

            for product_id, product in existing_products.items():
                if product_id not in incoming_ids:
                    product.delete()

        return instance

    class Meta:
        model = Requests
        fields = '__all__'
        read_only_fields = ['created_by']



class ProcessSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessName
        fields = '__all__'

class ProductNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductName
        fields = '__all__'

class ProductProcessSerializer(serializers.ModelSerializer):
    workers = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Worker.objects.all()
    )
    worker_names = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    completed_summary = serializers.SerializerMethodField()
    request_id = serializers.SerializerMethodField()
    requester_name = serializers.SerializerMethodField()
    request_product_id = serializers.SerializerMethodField()
    request_product_archived_at = serializers.SerializerMethodField()
    total_quota = serializers.SerializerMethodField()
    total_steps = serializers.SerializerMethodField()
    process_name = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    due_date = serializers.SerializerMethodField()
    deadline_extension = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    production_date_formatted = serializers.SerializerMethodField()
    request_product_completed_at = serializers.SerializerMethodField()
    is_pst_01 = serializers.SerializerMethodField()
    overall_progress = serializers.SerializerMethodField()
    quota_updated_by_name = serializers.SerializerMethodField()
    defect_updated_by_name = serializers.SerializerMethodField()
    defect_logs = DefectLogSerializer(many=True, read_only=True)

    def get_progress(self, obj):
        return obj.progress_summary()
    
    def get_completed_summary(self, obj):
        """Return 'completed_quota/total_quantity' format"""
        total = obj.request_product.quantity if obj.request_product else 0
        return f"{obj.completed_quota}/{total}"
    
    def get_request_id(self, obj):
        return obj.request_product.request.RequestID if obj.request_product else None
    
    def get_requester_name(self, obj):
        """Return the requester's name (full name or username). Fall back to created_by if no requester."""
        if obj.request_product and obj.request_product.request:
            request = obj.request_product.request
            
            # Try to get requester first
            if request.requester:
                # Try to get full name from user profile
                if hasattr(request.requester, 'userprofile'):
                    full_name = request.requester.userprofile.full_name
                    if full_name and full_name.strip():
                        return full_name
                # Fall back to username
                return request.requester.username
            
            # If no requester, try created_by
            if request.created_by:
                if hasattr(request.created_by, 'userprofile'):
                    full_name = request.created_by.userprofile.full_name
                    if full_name and full_name.strip():
                        return full_name
                # Fall back to username
                return request.created_by.username
        
        return "Unknown"
    
    def get_request_product_id(self, obj):
        return obj.request_product.id if obj.request_product else None
    
    def get_request_product_archived_at(self, obj):
        """Return the archived_at timestamp from the request_product"""
        return obj.request_product.archived_at if obj.request_product else None
    
    def get_request_product_completed_at(self, obj):
        """Return the completed_at timestamp from the request_product"""
        if obj.request_product and obj.request_product.completed_at:
            from django.utils.timezone import localtime
            return localtime(obj.request_product.completed_at).strftime("%Y-%m-%d %H:%M:%S")
        return None
    
    def get_total_quota(self, obj):
        return obj.request_product.quantity if obj.request_product else 0
    
    def get_total_steps(self, obj):
        """Return total number of steps for this product (from ProcessTemplate, not ProductProcess)"""
        if obj.request_product and obj.request_product.product:
            # Count the ProcessTemplate steps for this product
            # This stays constant even if ProductProcess steps are deleted
            total = ProcessTemplate.objects.filter(
                product_name=obj.request_product.product
            ).count()
            return total if total > 0 else 0
        return 0
    
    def get_process_name(self, obj):
        return obj.process_name if obj.process_name else (obj.process.name if obj.process else None)
    
    def get_product_name(self, obj):
        """Get product name from request_product. Handle null gracefully."""
        try:
            if obj.request_product and obj.request_product.product:
                return obj.request_product.product.prodName
            elif obj.request_product:
                # RequestProduct exists but product might be deleted/null
                print(f"[PRODUCT_NAME] RequestProduct {obj.request_product.id} has no product assigned")
                return f"(Deleted Product #{obj.request_product.id})"
            else:
                # No request_product assigned to this ProductProcess
                print(f"[PRODUCT_NAME] ProductProcess {obj.id} has no request_product assigned")
                return None
        except Exception as e:
            print(f"[PRODUCT_NAME ERROR] ProductProcess {obj.id}: {str(e)}")
            return None
    
    def get_worker_names(self, obj):
        return [f"{worker.FirstName} {worker.LastName}" for worker in obj.workers.all()]
    
    def get_due_date(self, obj):
        if obj.request_product:
            if obj.request_product.deadline_extension and obj.request_product.extension_status == "approved":
                return obj.request_product.deadline_extension.strftime("%Y-%m-%d")
            return obj.request_product.request.deadline.strftime("%Y-%m-%d") if obj.request_product.request.deadline else None
        return None
    
    def get_deadline_extension(self, obj):
        # Only return deadline_extension if it's set AND extension_status is "approved"
        if obj.request_product and obj.request_product.deadline_extension and obj.request_product.extension_status == "approved":
            return obj.request_product.deadline_extension.strftime("%Y-%m-%d")
        return None
    
    def get_production_date_formatted(self, obj):
        """Format production_date for display. Use request creation date if production_date is null"""
        if obj.production_date:
            return obj.production_date.strftime("%Y-%m-%d")
        # Fallback to request creation date
        if obj.request_product and obj.request_product.request:
            request_created = obj.request_product.request.created_at
            if request_created:
                # Return just the date part
                return request_created.strftime("%Y-%m-%d")
        return None
    
    def get_updated_at(self, obj):
        from django.utils.timezone import localtime
        return localtime(obj.updated_at).strftime("%Y-%m-%d %H:%M:%S") if obj.updated_at else None
    
    def get_is_pst_01(self, obj):
        """Check if this is PST-01 (withdrawal process) - ONLY the main PST-01 step"""
        # Check process_name first (most reliable)
        if obj.process_name:
            process_name = str(obj.process_name).upper()
            if 'WITHDRAWAL' in process_name:
                return True
        
        # Check process_number - must be EXACTLY PST-01 (with variations of spacing/dash)
        if obj.process_number:
            pst_num = str(obj.process_number).strip().upper()
            # ONLY match exactly: "PST-01", "PST 01", "PST01", "PST-1", "PST 1", "PST1"
            # NOT "PST-02", "PST-011", etc.
            if pst_num in ['PST-01', 'PST01', 'PST 01', 'PST-1', 'PST1', 'PST 1']:
                return True
        
        return False
    
    def get_overall_progress(self, obj):
        """Calculate overall progress as work completed across all steps.
        Progress = (Total work done) / (Total work needed across all steps)
        Where: Total work needed = total_quantity × number_of_steps
        """
        if not obj.request_product:
            return 0
        
        # Get all steps for this product
        all_steps = ProductProcess.objects.filter(
            request_product=obj.request_product,
            archived_at__isnull=True
        ).order_by('step_order')
        
        if not all_steps.exists():
            return 0
        
        # Get the total quantity for this product
        total_quantity = obj.request_product.quantity
        if total_quantity <= 0:
            return 0
        
        total_steps = all_steps.count()
        
        # Separate PST-01 and other steps
        pst_01_steps = []
        other_steps = []
        
        for s in all_steps:
            is_pst_01 = False
            # Check process_name first
            if s.process_name:
                process_name = str(s.process_name).upper()
                if 'WITHDRAWAL' in process_name:
                    is_pst_01 = True
            # Check process_number - ONLY exact matches
            if not is_pst_01 and s.process_number:
                pst_num = str(s.process_number).strip().upper()
                if pst_num in ['PST-01', 'PST01', 'PST 01', 'PST-1', 'PST1', 'PST 1']:
                    is_pst_01 = True
            
            if is_pst_01:
                pst_01_steps.append(s)
            else:
                other_steps.append(s)
        
        progress = 0
        
        # Calculate PST-01 progress (10% weight)
        # PST-01 is binary: either completed or not
        if pst_01_steps:
            pst_01_completed = sum(1 for s in pst_01_steps if s.is_completed)
            pst_01_weight = 10
            pst_01_progress = (pst_01_completed / len(pst_01_steps)) * pst_01_weight
            progress += pst_01_progress
        
        # Calculate Other steps progress (90% weight)
        # Progress = (total work done across other steps) / (total work needed)
        if other_steps:
            # Total work needed for other steps = total_quantity × num_other_steps
            total_work_needed = total_quantity * len(other_steps)
            
            # Total work done = sum of completed_quota across all other steps
            total_work_done = sum(s.completed_quota for s in other_steps)
            
            # Progress as percentage of work done (only count up to 100%)
            work_progress = min((total_work_done / total_work_needed) * 100, 100) if total_work_needed > 0 else 0
            
            # Weight it at 90%
            other_progress = (work_progress / 100) * 90
            progress += other_progress
        
        final_progress = int(min(progress, 100))  # Cap at 100%
        return final_progress
    
    def get_quota_updated_by_name(self, obj):
        """Get the name of the user who last updated the quota"""
        if obj.quota_updated_by:
            if hasattr(obj.quota_updated_by, 'userprofile'):
                full_name = obj.quota_updated_by.userprofile.full_name
                if full_name and full_name.strip():
                    return full_name
            return obj.quota_updated_by.username
        return None
    
    def get_defect_updated_by_name(self, obj):
        """Get the name of the user who last updated the defect"""
        if obj.defect_updated_by:
            if hasattr(obj.defect_updated_by, 'userprofile'):
                full_name = obj.defect_updated_by.userprofile.full_name
                if full_name and full_name.strip():
                    return full_name
            return obj.defect_updated_by.username
        return None

    # Workers are optional - all workers are flexible (production requirement)
    # validate_workers function removed per production decision

    class Meta:
        model = ProductProcess
        fields = ['id', 'request_product', 'workers', 'process', 'process_number', 'step_order', 'completed_quota', 'defect_count', 'is_completed', 'production_date', 'created_at', 'updated_at', 'archived_at', 'progress', 'completed_summary', 'request_id', 'requester_name', 'request_product_id', 'request_product_archived_at', 'request_product_completed_at', 'total_quota', 'total_steps', 'process_name', 'product_name', 'worker_names', 'due_date', 'deadline_extension', 'production_date_formatted', 'is_pst_01', 'overall_progress', 'quota_updated_at', 'quota_updated_by', 'quota_updated_by_name', 'defect_type', 'defect_description', 'defect_updated_at', 'defect_updated_by', 'defect_updated_by_name', 'defect_logs']

class ProcessTemplateSerializer(serializers.ModelSerializer):
    process_name = serializers.CharField(source='process.name', read_only=True)
    product_name_text = serializers.CharField(source='product_name.prodName', read_only=True)
    
    class Meta:
        model = ProcessTemplate
        fields = ['id', 'product_name', 'process', 'step_order', 'process_name', 'product_name_text']

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'

class RequestProgressSerializer(serializers.ModelSerializer):
    progress_summary = serializers.SerializerMethodField()

    class Meta:
        model = Requests
        fields = ['RequestID', 'progress_summary', 'task_status'] 

    def get_progress_summary(self, obj):
        return obj.get_progress_summary()

    def get_task_status(self, obj):
        return obj.task_status()

class CustomerProductDetailSerializer(serializers.ModelSerializer):
    progress = serializers.SerializerMethodField()
    task_status = serializers.SerializerMethodField()
    deadline = serializers.SerializerMethodField()
    deadline_extension = serializers.SerializerMethodField()
    workers = serializers.SerializerMethodField()
    completed_quota = serializers.SerializerMethodField()
    defect_count = serializers.SerializerMethodField()

    class Meta:
        model = RequestProduct
        fields = [
            "id",
            "product_name",
            "quantity",
            "progress",
            "task_status",
            "deadline",
            "deadline_extension",
            "workers",
            "completed_quota",
            "defect_count",
        ]

    product_name = serializers.CharField(source='product.prodName', read_only=True)

    def get_progress(self, obj):
        """Calculate overall progress matching production manager calculation.
        Progress = (Total work done) / (Total work needed across all steps)
        Includes partial progress from in-progress steps.
        """
        # Get all steps for this product
        all_steps = obj.process_steps.filter(archived_at__isnull=True).order_by('step_order')
        
        if not all_steps.exists():
            return "0%"
        
        # Get the total quantity for this product
        total_quantity = obj.quantity
        if total_quantity <= 0:
            return "0%"
        
        total_steps = all_steps.count()
        
        # Separate PST-01 and other steps
        pst_01_steps = []
        other_steps = []
        
        for step in all_steps:
            is_pst_01 = False
            # Check process_name first
            if step.process_name:
                process_name = str(step.process_name).upper()
                if 'WITHDRAWAL' in process_name:
                    is_pst_01 = True
            # Check process_number - ONLY exact matches
            if not is_pst_01 and step.process_number:
                pst_num = str(step.process_number).strip().upper()
                if pst_num in ['PST-01', 'PST01', 'PST 01', 'PST-1', 'PST1', 'PST 1']:
                    is_pst_01 = True
            
            if is_pst_01:
                pst_01_steps.append(step)
            else:
                other_steps.append(step)
        
        progress = 0
        
        # Calculate PST-01 progress (10% weight) - binary completion
        if pst_01_steps:
            pst_01_completed = sum(1 for s in pst_01_steps if s.is_completed)
            pst_01_weight = 10
            pst_01_progress = (pst_01_completed / len(pst_01_steps)) * pst_01_weight
            progress += pst_01_progress
        
        # Calculate Other steps progress (90% weight)
        # Includes full step completions AND partial progress from work done
        if other_steps:
            # Total work needed for other steps = total_quantity × num_other_steps
            total_work_needed = total_quantity * len(other_steps)
            
            # Total work done = sum of completed_quota across all other steps
            total_work_done = sum(s.completed_quota for s in other_steps)
            
            # Progress as percentage of work done (cap at 100%)
            work_progress = min((total_work_done / total_work_needed) * 100, 100) if total_work_needed > 0 else 0
            
            # Weight it at 90%
            other_progress = (work_progress / 100) * 90
            progress += other_progress
        
        final_progress = int(min(progress, 100))  # Cap at 100%
        return f"{final_progress}%"

    def get_task_status(self, obj):
        return obj.task_status()

    def get_deadline(self, obj):
        """Get deadline from parent request"""
        if obj.request and obj.request.deadline:
            return obj.request.deadline.strftime("%m/%d/%Y")
        return None

    def get_deadline_extension(self, obj):
        # Only return deadline_extension if it's set AND extension_status is "approved"
        if obj.deadline_extension and obj.extension_status == "approved":
            return obj.deadline_extension.strftime("%Y-%m-%d")
        return None
    
    def get_completed_quota(self, obj):
        """Get total completed quota across all steps"""
        return obj.get_completed_quota()
    
    def get_defect_count(self, obj):
        """Get total defect count across all steps"""
        total_defects = 0
        for step in obj.process_steps.all():
            total_defects += step.defect_count
        return total_defects

    def get_workers(self, obj):
        # Collect all workers across all steps
        all_workers = []
        for step in obj.process_steps.all():
            for worker in step.workers.all():
                worker_name = f"{worker.FirstName} {worker.LastName}"
                all_workers.append({"name": worker_name})

        # Deduplicate by name
        unique_workers = {w["name"]: w for w in all_workers}.values()
        return list(unique_workers)





class CustomerRequestStatusSerializer(serializers.ModelSerializer):
    product_details = serializers.SerializerMethodField()
    due_date = serializers.DateField(source='deadline', read_only=True)

    class Meta:
        model = Requests
        fields = [
            'RequestID',
            'due_date',
            'created_at',
            'product_details',
        ]

    def get_product_details(self, obj):
        products = obj.request_products.all()
        serializer = CustomerProductDetailSerializer(products, many=True)
        return serializer.data


    # def get_task_status(self, obj):
    #     # Just a high-level label for the whole request
    #     all_steps = ProductProcess.objects.filter(request_product__request=obj)
    #     total = all_steps.count()
    #     completed = all_steps.filter(is_completed=True).count()
    #     percent = int((completed / total) * 100) if total else 0

    #     if percent == 100:
    #         return "✅ All Tasks Completed"
    #     elif completed > 0:
    #         return "🟡 In Progress"
    #     else:
    #         return "🔴 Not Started"


class AuditLogSerializer(serializers.ModelSerializer):
    request = serializers.SerializerMethodField()
    request_product = serializers.SerializerMethodField()
    performed_by_username = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "action_type",
            "request",
            "request_product",
            "old_value",
            "new_value",
            "performed_by_username",
            "timestamp",
        ]

    def get_request(self, obj):
        return obj.request.RequestID if obj.request else None

    def get_request_product(self, obj):
        return obj.request_product.id if obj.request_product else None

    def get_performed_by_username(self, obj):
        return obj.performed_by.username if obj.performed_by else "System"

    def get_timestamp(self, obj):
        from django.utils.timezone import localtime
        return localtime(obj.timestamp).strftime("%Y-%m-%d %H:%M:%S") if obj.timestamp else None

    def get_performed_by_username(self, obj):
        return obj.performed_by.username if obj.performed_by else None

class ProcessProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessProgress
        fields = '__all__'


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'id',
            'session_timeout_minutes',
            'enable_session_timeout',
            'enable_auto_archive',
            'archive_threshold_days',
            'enable_email_alerts',
            'data_retention_days',
            'enable_audit_logs',
            'updated_at',
            'updated_by'
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by']


class NotificationSerializer(serializers.ModelSerializer):
    related_request = serializers.SerializerMethodField()
    related_request_product_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'related_request',
            'related_request_product_id',
            'action_data',
            'is_read',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_related_request(self, obj):
        if obj.related_request:
            return obj.related_request.RequestID
        return None
    
    def get_related_request_product_id(self, obj):
        if obj.related_request_product:
            return obj.related_request_product.id
        return None
    
    def get_related_request(self, obj):
        """Get the related request ID from the model instance"""
        # Now that we've mapped the field with db_column, we can use the model's field name
        return obj.related_request_id if obj.related_request_id else None


class AccountSignupRequestSerializer(serializers.ModelSerializer):
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)
    
    class Meta:
        model = AccountSignupRequest
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'company_name',
            'contact_number',
            'role',
            'status',
            'created_at',
            'reviewed_at',
            'reviewed_by',
            'reviewed_by_username',
            'review_notes'
        ]
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_username']


class AccountSignupRequestCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = AccountSignupRequest
        fields = [
            'username',
            'email',
            'password',
            'full_name',
            'company_name',
            'contact_number',
            'role'
        ]
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        if AccountSignupRequest.objects.filter(username=value, status="pending").exists():
            raise serializers.ValidationError("This username is already pending approval.")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        if AccountSignupRequest.objects.filter(email=value, status="pending").exists():
            raise serializers.ValidationError("This email is already pending approval.")
        return value
    
    def create(self, validated_data):
        from django.contrib.auth.hashers import make_password
        
        password = validated_data.pop('password')
        password_hash = make_password(password)
        
        signup_request = AccountSignupRequest.objects.create(
            password_hash=password_hash,
            **validated_data
        )
        return signup_request