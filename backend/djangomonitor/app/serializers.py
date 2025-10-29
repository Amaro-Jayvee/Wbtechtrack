from rest_framework import serializers
from app.models import *
from datetime  import datetime

class WorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = '__all__'

class RequestSerializer(serializers.ModelSerializer):
    product_names = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ProductName.objects.all()
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

    class Meta:
        model = Requests
        fields = '__all__'
        read_only_fields = ['created_by'] # Non-repudiation

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
