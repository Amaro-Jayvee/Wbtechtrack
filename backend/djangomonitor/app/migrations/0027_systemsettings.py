
# Generated migration file for SystemSettings model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0026_processprogress'),
    ]

    operations = [
        migrations.CreateModel(
            name='SystemSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_timeout_minutes', models.PositiveIntegerField(default=15, verbose_name='Session Timeout (minutes)')),
                ('enable_session_timeout', models.BooleanField(default=True, verbose_name='Enable Session Timeout')),
                ('enable_auto_archive', models.BooleanField(default=True, verbose_name='Enable Auto-Archive')),
                ('archive_threshold_days', models.PositiveIntegerField(default=30, verbose_name='Archive Threshold (days)')),
                ('enable_email_alerts', models.BooleanField(default=True, verbose_name='Enable Email Alerts')),
                ('data_retention_days', models.PositiveIntegerField(default=365, verbose_name='Data Retention (days)')),
                ('enable_audit_logs', models.BooleanField(default=True, verbose_name='Enable Audit Logs')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'System Settings',
            },
        ),
    ]
