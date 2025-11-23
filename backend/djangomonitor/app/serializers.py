from rest_framework import serializers
from app.models import *
from datetime  import datetime

class WorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = '__all__'

class RequestProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequestProduct
        fields = ['product', 'quantity']

class RequestSerializer(serializers.ModelSerializer):
    products = RequestProductSerializer(many=True, write_only=True)
    product_names = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True
    )
    badge = serializers.SerializerMethodField()

    def get_badge(self, obj):
        count = obj.product_names.count()
        if count == 0:
            return "No products yet!"
        elif count == 1:
            return "Single-item request"
        elif count <= 3:
            return "Small batch"
        else:
            return "Bulk order"

    
    def create(self, validated_data):
        products_data = validated_data.pop('products')
        request = Requests.objects.create(created_by=self.context['request'].user, **validated_data)
        for item in products_data:
            RequestProduct.objects.create(request=request, **item)
        return request       

    class Meta:
        model = Requests
        fields = '__all__'
        read_only_fields = ['created_by', 'product_names'] # Non-repudiation

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
            if not w.is_active:
                raise serializers.ValidationError(
                    f"Worker {w.pk} is inactive and cannot be assigned."
                )

            active_steps = ProductProcess.objects.filter(
                workers=w,
                is_completed=False
            )
            if self.instance:
                active_steps = active_steps.exclude(pk=self.instance.pk)

            if active_steps.count() >= 2:
                raise serializers.ValidationError(
                    f"Worker {w.pk} is already assigned to 2 active steps."
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

class CustomerRequestStatusSerializer(serializers.ModelSerializer):
    product_details = serializers.SerializerMethodField()
    # task_status = serializers.SerializerMethodField()

    class Meta:
        model = Requests
        fields = [
            'RequestID',
            'deadline',
            'created_at',
            'product_details',
            # 'task_status',
        ]

    def get_product_details(self, obj):
        product_info = []

        for rp in obj.request_products.select_related('product').all():
            product_name = rp.product.prodName
            quantity = rp.quantity

            processes = rp.process_steps.prefetch_related('workers').all()
            total_steps = processes.count()
            completed_steps = processes.filter(is_completed=True).count()

            all_workers = set()
            for step in processes:
                all_workers.update([f"{w.FirstName} {w.LastName}" for w in step.workers.all()])


            progress_percent = int((completed_steps / total_steps) * 100) if total_steps else 0
            status = "✅ Done" if progress_percent == 100 else "🟡 In Progress"

            product_info.append({
                'product_name': product_name,
                'quantity': quantity,
                'assigned_to': list(all_workers),
                'progress': f"{progress_percent}%",
                'status': status,
            })

        return product_info

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
