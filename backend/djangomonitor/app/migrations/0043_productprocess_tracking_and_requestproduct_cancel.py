# Generated migration for adding tracking fields to ProductProcess and cancel fields to RequestProduct

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('app', '0042_requests_request_status'),
    ]

    operations = [
        # ProductProcess quota tracking fields
        migrations.AddField(
            model_name='productprocess',
            name='quota_updated_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Quota Last Updated'),
        ),
        migrations.AddField(
            model_name='productprocess',
            name='quota_updated_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='quota_updates',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        
        # ProductProcess defect tracking fields
        migrations.AddField(
            model_name='productprocess',
            name='defect_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('dimension', 'Dimension problem'),
                    ('thickness', 'Thickness problem'),
                    ('rush', 'Rush problem'),
                    ('other', 'Other')
                ],
                max_length=20,
                null=True,
                verbose_name='Defect Type'
            ),
        ),
        migrations.AddField(
            model_name='productprocess',
            name='defect_description',
            field=models.TextField(blank=True, null=True, verbose_name='Defect Description'),
        ),
        migrations.AddField(
            model_name='productprocess',
            name='defect_updated_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Defect Last Updated'),
        ),
        migrations.AddField(
            model_name='productprocess',
            name='defect_updated_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='defect_updates',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        
        # RequestProduct cancellation fields
        migrations.AddField(
            model_name='requestproduct',
            name='status',
            field=models.CharField(
                choices=[
                    ('active', 'Active'),
                    ('cancelled', 'Cancelled'),
                    ('completed', 'Completed')
                ],
                default='active',
                max_length=20,
                verbose_name='Status'
            ),
        ),
        migrations.AddField(
            model_name='requestproduct',
            name='cancelled_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Cancelled At'),
        ),
        migrations.AddField(
            model_name='requestproduct',
            name='cancelled_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cancelled_requests',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name='requestproduct',
            name='cancellation_reason',
            field=models.TextField(blank=True, null=True, verbose_name='Cancellation Reason'),
        ),
    ]
