from rest_framework import serializers
from app.models import *
from datetime  import date, datetime
from django.utils.timezone import localtime

class WorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = '__all__'

class RequestProductReadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.prodName', read_only=True)
    request_id = serializers.IntegerField(source='request.RequestID', read_only=True)
    completed_summary = serializers.SerializerMethodField()
    defect_count = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    task_status = serializers.SerializerMethodField()
    deadline_extension = serializers.SerializerMethodField()
    requested_at = serializers.SerializerMethodField()

    def get_completed_summary(self, obj):
        return f"{obj.get_completed_quota()}/{obj.quantity}"

    def get_defect_count(self, obj):
        final_step = obj.process_steps.order_by('-step_order').first()
        return final_step.defect_count if final_step else 0

    def get_progress(self, obj):
        return f"{obj.get_progress_percentage()}%"

    def get_task_status(self, obj):
        return obj.task_status()   # ✅ reuse model method

    def get_deadline_extension(self, obj):
        return obj.deadline_extension.strftime("%Y-%m-%d") if obj.deadline_extension else None

    def get_requested_at(self, obj):
        return localtime(obj.requested_at).strftime("%Y-%m-%d %H:%M:%S") if obj.requested_at else None

    class Meta:
        model = RequestProduct
        fields = [
            "id",
            "request_id",
            "product_name",
            "quantity",
            "completed_summary",
            "defect_count",
            "deadline_extension",
            "extension_status",
            "requested_at",
            "progress",
            "task_status",
        ]



class RequestReadSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source='requester.userprofile.full_name', read_only=True)
    requester_company = serializers.CharField(source='requester.userprofile.company_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    badge = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    archived_at = serializers.SerializerMethodField()
    deadline = serializers.SerializerMethodField()

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

    def get_deadline(self, obj):
        return obj.deadline.strftime("%Y-%m-%d") if obj.deadline else None

    class Meta:
        model = Requests
        fields = [
            "RequestID",
            "requester_name",
            "requester_company",
            "created_by_name",
            "badge",
            "deadline",
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = ["created_by"]

class RequestProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    requested_at = serializers.SerializerMethodField()

    def get_requested_at(self, obj):
        if obj.requested_at:  # DateTimeField
            return localtime(obj.requested_at).strftime("%Y-%m-%d")
        return None

    class Meta:
        model = RequestProduct
        fields = [
            'product',
            'product_name',
            'quantity',
            'deadline_extension',
            'extension_status',
            'requested_at',
        ]


class RequestSerializer(serializers.ModelSerializer):
    products = RequestProductSerializer(many=True, source='request_products')
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
        products_data = validated_data.pop('request_products')
        request = Requests.objects.create(
            created_by=self.context['request'].user,
            **validated_data
        )
        for item in products_data:
            RequestProduct.objects.create(request=request, **item)
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
                        if attr != 'product':
                            setattr(product, attr, value)
                    product.save()
                else:
                    RequestProduct.objects.create(request=instance, **item)

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
    progress = serializers.SerializerMethodField()

    def get_progress(self, obj):
        return obj.progress_summary()

    def validate_workers(self, value):
        for w in value:
            # CHECK IF WORKER IS ACTIVE
            if not w.is_active:
                raise serializers.ValidationError(
                    f"Worker {w.FirstName} {w.LastName} is inactive and cannot be assigned."
                )

            # COUNT ALL ACTIVE TASKS (ANY PRODUCT, ANY STEP)
            active_steps = ProductProcess.objects.filter(
                workers=w,
                is_completed=False,
                archived_at__isnull=True
            )

            # EXCLUDE CURRENT INSTANCE IF UPDATING
            if self.instance:
                active_steps = active_steps.exclude(pk=self.instance.pk)

            # ENFORCE MAX 2 ACTIVE TASKS TOTAL
            if active_steps.count() >= 2:
                raise serializers.ValidationError(
                    f"Worker {w.FirstName} {w.LastName} is already assigned to 2 active tasks."
                )

        return value

    class Meta:
        model = ProductProcess
        fields = '__all__'

class ProcessTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessTemplate
        fields = '__all__'

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
    deadline_extension = serializers.SerializerMethodField()
    workers = serializers.SerializerMethodField()

    class Meta:
        model = RequestProduct
        fields = [
            "id",
            "product_name",
            "quantity",
            "progress",
            "task_status",
            "deadline_extension",
            "workers",
        ]

    product_name = serializers.CharField(source='product.prodName', read_only=True)

    def get_progress(self, obj):
        return f"{obj.get_progress_percentage()}%"

    def get_task_status(self, obj):
        return obj.task_status()

    def get_deadline_extension(self, obj):
        return obj.deadline_extension.strftime("%Y-%m-%d") if obj.deadline_extension else None

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
    request_id = serializers.SerializerMethodField()
    request_product_id = serializers.SerializerMethodField()
    performed_by_username = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "action_type",
            "request_id",
            "request_product_id",
            "old_value",
            "new_value",
            "performed_by_username",
            "timestamp",
        ]

    def get_request_id(self, obj):
        return obj.request.RequestID if obj.request else None

    def get_request_product_id(self, obj):
        return obj.request_product.id if obj.request_product else None

    def get_performed_by_username(self, obj):
        return obj.performed_by.username if obj.performed_by else None

class ProcessProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessProgress
        fields = '__all__'